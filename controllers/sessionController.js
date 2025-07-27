const Session = require("../models/sessionSchema");
const mongoose = require("mongoose");
const Cohort = require("../models/cohortSchema");
const Attendance = require("../models/attendanceSchema");
const Evaluation = require("../models/evaluationSchema");

const createSession = async (req, res) => {
  const {
    name,
    cohort,
    activity,
    date,
    participants,
    numberOfMins,
    activityFacilitator,
  } = req.body;
  console.log(req.body);

  try {
    const cohortDoc = await Cohort.findById(cohort).populate("participants");
    if (!cohortDoc) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    const session = new Session({
      name,
      cohort,
      activity,
      participants,
      numberOfMins,
      activityFacilitator,
      date: new Date(date),
    });

    let savedSession = await session.save();

    const participantIds = participants.map(
      (participant) => participant.participantId
    );

    const attendanceRecords = await Promise.all(
      cohortDoc.participants.map(async (participant) => {
        const isPresent = participantIds.includes(participant._id.toString());
        const attendance = new Attendance({
          participant: participant._id,
          cohort: cohortDoc._id,
          session: session._id,
          present: isPresent,
          date: new Date(savedSession.date),
        });
        await attendance.save();
        return attendance._id;
      })
    );

    session.attendance = attendanceRecords;
    await session.save();

    cohortDoc.sessions.push(session);
    let check = await cohortDoc.save();

    res.status(201).json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ success: false, message: err.message });
  }
};

const getAllSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10, name, cohort } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (
      isNaN(pageNumber) ||
      isNaN(limitNumber) ||
      pageNumber < 1 ||
      limitNumber < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit value",
      });
    }

    // Build match query
    const matchQuery = {};

    if (name) {
      matchQuery.name = { $regex: name, $options: "i" }; // case-insensitive search
    }

    if (cohort) {
      matchQuery.cohort = cohort;
    }

    // Total count with filters
    const totalCount = await Session.countDocuments(matchQuery);

    // Fetch filtered sessions with population and pagination
    const sessions = await Session.find(matchQuery)
      .populate({
        path: "cohort",
        model: "Cohort",
        populate: {
          path: "participants",
          model: "Participant",
        },
      })
      .populate({
        path: "activity",
        model: "Activity",
      })
      .sort({ date: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      message: sessions,
      count: sessions.length,
      totalCount,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAllParticipantsAttendance = async (req, res) => {
  try {
    const { cohortId, search = "", page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const regex = new RegExp(search, "i"); // case-insensitive search

    // Fetch attendance records with filters
    const attendanceRecords = await Attendance.find(
      cohortId ? { cohort: cohortId } : {}
    )
      .populate({
        path: "participant",
        match: { name: regex }, // search by participant name
      })
      .populate("session")
      .skip(skip)
      .limit(parseInt(limit));

    // Filter out records where participant didn't match search
    const filteredRecords = attendanceRecords.filter(
      (record) => record.participant !== null
    );

    // Map attendance records to participants
    const participantAttendanceMap = {};

    filteredRecords.forEach((record) => {
      const participantId = record.participant._id;

      if (!participantAttendanceMap[participantId]) {
        participantAttendanceMap[participantId] = {
          participantId: record.participant._id,
          participantName: record.participant.name,
          sessions: [],
        };
      }

      participantAttendanceMap[participantId].sessions.push({
        name: record.session.name,
        present: record.present,
        date: record.session.date,
      });
    });

    const participantAttendanceList = Object.values(participantAttendanceMap);

    res.status(200).json({
      success: true,
      data: participantAttendanceList,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        count: participantAttendanceList.length,
      },
    });
  } catch (error) {
    console.error(`Error fetching participants' attendance: ${error.message}`);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const getAttendanceByCohort = async (req, res) => {
  try {
    const { cohortId } = req.params;

    // Fetch all attendance records for the specified cohort
    const attendanceRecords = await Attendance.find({
      cohort: cohortId,
    }).populate("participant session");

    // Map attendance records to participants
    const participantAttendanceMap = {};

    attendanceRecords.forEach((record) => {
      const participantId = record.participant._id;

      if (!participantAttendanceMap[participantId]) {
        participantAttendanceMap[participantId] = {
          participantName: record.participant.name,
          sessions: [],
        };
      }

      participantAttendanceMap[participantId].sessions.push({
        name: record.session.name,
        present: record.present,
        date: record.session.date,
      });
    });

    // Convert the map to an array
    const participantAttendanceList = Object.values(participantAttendanceMap);

    // Respond with the formatted attendance data
    res.status(200).json({
      success: true,
      data: participantAttendanceList,
    });
  } catch (error) {
    console.error(`Error fetching participants' attendance: ${error.message}`);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const getAttendanceByParticipantId = async (req, res) => {
  try {
    const { participantId } = req.params;

    console.log(participantId);

    // Validate participantId
    if (!participantId) {
      return res.status(400).json({
        success: false,
        error: "Participant ID is required",
      });
    }

    // Find all attendance records for the given participant
    const attendanceRecords = await Attendance.find({
      participant: participantId,
    })
      .populate("participant")
      .populate("session");

    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found for the given participant",
      });
    }

    // Prepare formatted response
    const sessions = attendanceRecords.map((record) => ({
      sessionName: record.session?.name,
      present: record.present,
      date: record.session?.date,
    }));

    const response = {
      participantId,
      participantName: attendanceRecords[0].participant.name,
      sessions,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error(
      `Error fetching attendance by participantId: ${error.message}`
    );
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const editSession = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    cohort,
    activity,
    date,
    participants,
    numberOfMins,
    activityFacilitator,
  } = req.body;

  try {
    // Validate inputs
    if (!cohort || !participants || participants.length === 0) {
      return res
        .status(400)
        .json({ message: "Cohort and participants are required" });
    }

    // Find the session by ID
    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Find the cohort by ID and populate participants
    const cohortDoc = await Cohort.findById(cohort).populate("participants");
    if (!cohortDoc) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Update session fields
    session.name = name || session.name;
    session.cohort = cohort || session.cohort;
    session.activity = activity || session.activity;
    session.date = date ? new Date(date) : session.date;
    session.participants = participants || session.participants;
    session.numberOfMins = numberOfMins || session.numberOfMins;
    session.activityFacilitator =
      activityFacilitator || session.activityFacilitator;

    // Retrieve attendance records for the session
    const attendanceDocs = await Attendance.find({ session: session._id });

    // Map the participant IDs from the request body
    const participantIds = participants.map(
      (participant) => participant.participantId
    );

    // Update attendance records
    await Promise.all(
      attendanceDocs.map(async (attendance) => {
        attendance.present = participantIds.includes(
          attendance.participant.toString()
        );
        await attendance.save();
      })
    );

    // Save the updated session
    await session.save();

    // Update the cohort with the updated session
    const sessionIndex = cohortDoc.sessions.findIndex(
      (s) => s.toString() === id
    );
    if (sessionIndex !== -1) {
      cohortDoc.sessions[sessionIndex] = session._id;
    } else {
      cohortDoc.sessions.push(session._id);
    }
    await cohortDoc.save();

    res.status(200).json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ success: false, message: err.message });
  }
};

const searchSessionsWithDateRange = async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      message: "Both startDate and endDate query parameters are required",
    });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const sessions = await Session.find({
      date: {
        $gte: start,
        $lte: end,
      },
    })
      .populate("cohort")
      .populate("activity");

    if (sessions.length === 0) {
      return res
        .status(404)
        .json({ message: "No sessions found within the specified date range" });
    }

    res.status(200).json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message });
  }
};

const searchSessionByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Session name is required" });
    }

    const sessions = await Session.find({
      name: { $regex: name, $options: "i" },
    })
      .populate({
        path: "cohort",
        model: "Cohort",
        populate: {
          path: "participants",
          model: "Participant",
        },
      })
      .populate({ path: "activity", model: "Activity" });

    if (sessions.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No sessions found" });
    }

    return res.status(200).json({ success: true, message: sessions });
  } catch (error) {
    console.error("Error searching sessions by name:", error);

    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format" });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const deleteSession = async (req, res) => {
  const { sessionId } = req.query; // Extract from req.query instead of req.params

  try {
    // Find the session by ID
    const session = await Session.findById(sessionId).populate("cohort");
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get the cohort document
    const cohort = session.cohort;
    if (!cohort) {
      return res
        .status(404)
        .json({ message: "Cohort not found for this session" });
    }

    // Remove all attendance records related to this session
    await Attendance.deleteMany({ session: sessionId });

    // Remove session from the cohort's sessions array
    cohort.sessions = cohort.sessions.filter((s) => s.toString() !== sessionId);
    await cohort.save();

    // Delete all evaluations related to the session
    await Evaluation.deleteMany({ session: sessionId });

    // Delete the session
    await Session.findByIdAndDelete(sessionId);

    res.status(200).json({
      message:
        "Session, evaluations, and related references deleted successfully",
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID format",
      });
    }

    const session = await Session.findById(id)
      .populate({
        path: "cohort",
        model: "Cohort",
        populate: {
          path: "participants",
          model: "Participant",
          select: "name",
        },
      })
      .populate({
        path: "activity",
        model: "Activity",
      })
      .populate({
        path: "participants.participantId", // 👈 Populate the nested participantId
        model: "Participant",
        select: "name email phone", // 👈 Only include desired fields
      });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: session,
    });
  } catch (error) {
    console.error("Error fetching session by ID:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createSession,
  getAllSessions,
  getAllParticipantsAttendance,
  getAttendanceByCohort,
  editSession,
  searchSessionsWithDateRange,
  searchSessionByName,
  deleteSession,
  getSessionById,
  getAttendanceByParticipantId,
};
