const Session = require("../models/sessionSchema");
const mongoose = require("mongoose");
const Cohort = require("../models/cohortSchema");
const Attendance = require("../models/attendanceSchema");

const createSession = async (req, res) => {
  const { name, cohort, activity, date, participants, numberOfMins } = req.body;

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
    // console.log(check);
    res.status(201).json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ success: false, message: err.message });
  }
};

const getAllSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (
      isNaN(pageNumber) ||
      isNaN(limitNumber) ||
      pageNumber < 1 ||
      limitNumber < 1
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid page or limit value" });
    }

    const skip = (pageNumber - 1) * limitNumber;

    const sessions = await Session.find()
      .populate({
        path: "cohort",
        model: "Cohort",
        populate: {
          path: "participants",
          model: "Participant",
        },
      })
      .populate({ path: "activity", model: "Activity" })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json({ success: true, message: sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);

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

const getAllParticipantsAttendance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch total attendance records count
    const totalRecords = await Attendance.countDocuments();

    // Fetch paginated attendance records
    const attendanceRecords = await Attendance.find()
      .populate("participant session")
      .skip(skip)
      .limit(limit);

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

    // Calculate total pages
    const totalPages = Math.ceil(totalRecords / limit);

    // Respond with the formatted attendance data and pagination info
    res.status(200).json({
      success: true,
      data: participantAttendanceList,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        pageSize: limit,
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

const editSession = async (req, res) => {
  const { id } = req.params;
  const { name, cohort, activity, date, participants, numberOfMins } = req.body;

  try {
    // Find the session by ID
    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Find the cohort by ID
    const cohortDoc = await Cohort.findById(cohort).populate("participants");
    if (!cohortDoc) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Update session fields
    session.name = name;
    session.cohort = cohort;
    session.activity = activity;
    session.date = new Date(date);
    session.participants = participants;
    session.numberOfMins = numberOfMins;

    // Update attendance records
    const participantIds = participants.map(
      (participant) => participant.participantId
    );

    // Remove existing attendance records for the session
    await Attendance.deleteMany({ session: session._id });

    // Create new attendance records
    const attendanceRecords = await Promise.all(
      cohortDoc.participants.map(async (participant) => {
        const isPresent = participantIds.includes(participant._id.toString());
        const attendance = new Attendance({
          participant: participant._id,
          cohort: cohortDoc._id,
          session: session._id,
          present: isPresent,
          date: new Date(session.date),
        });
        await attendance.save();
        return attendance._id;
      })
    );

    session.attendance = attendanceRecords;

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

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const sessions = await Session.find({
      date: {
        $gte: start,
        $lte: end,
      },
    }).populate("Cohort");

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

module.exports = {
  createSession,
  getAllSessions,
  getAllParticipantsAttendance,
  getAttendanceByCohort,
  editSession,
  searchSessionsWithDateRange,
};
