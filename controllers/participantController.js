const Participant = require("../models/participantSchema");
const Cohort = require("../models/cohortSchema");
const { validateData } = require("../validator/validator");
const logger = require("../log/logger");
const Evaluation = require("../models/evaluationSchema");
const Attendance = require("../models/attendanceSchema");

const createParticipant = async (req, res) => {
  try {
    const errors = validateData(req.body);
    if (errors) {
      return res.status(400).json({ success: false, errors });
    }

    const participantData = req.body;

    const cohort = participantData.cohort;

    const existingCohort = await Cohort.findOne({ _id: cohort });

    if (!existingCohort)
      return res
        .status(404)
        .json({ success: false, message: `No cohort found with id ${cohort}` });

    const newParticipant = new Participant(participantData);
    const savedParticipant = await newParticipant.save();

    existingCohort.participants.push(savedParticipant._id);
    await existingCohort.save();

    res.status(201).json({
      success: true,
      message: "Participant added successfully",
      data: savedParticipant,
    });
  } catch (error) {
    if (error.message.includes("User with this email already exists")) {
      return res.status(409).json({ success: false, message: error.message });
    }
    logger.error("Error creating participant:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllParticipants = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * (limit || 0);
    let participants;
    let totalParticipants;
    let totalPages;

    if (limit) {
      participants = await Participant.find().skip(skip).limit(limit);
      totalParticipants = await Participant.countDocuments();
      totalPages = Math.ceil(totalParticipants / limit);
    } else {
      participants = await Participant.find();
      totalParticipants = participants.length;
      totalPages = 1;
    }

    if (participants.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No participants found" });
    }

    res.status(200).json({
      success: true,
      message: participants,
      currentPage: page,
      totalPages,
      totalParticipants,
    });
  } catch (error) {
    console.error("Error fetching participants:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const searchParticipantsByName = async (req, res) => {
  try {
    const { name } = req.query;
    console.log(name);
    if (!name || typeof name !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid name parameter" });
    }

    const participants = await Participant.find({
      name: { $regex: new RegExp(name, "i") },
    });

    if (participants.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No participants found" });
    }

    res.status(200).json({ success: true, message: participants });
  } catch (error) {
    logger.error("Error searching participants by name:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const participantData = req.body;

    const newCohortId = participantData.cohort;

    // Find the participant by ID
    const existingParticipant = await Participant.findById(id);
    if (!existingParticipant) {
      return res
        .status(404)
        .json({ success: false, message: "Participant not found" });
    }

    // Find the new cohort by ID
    const existingCohort = await Cohort.findById(newCohortId);
    if (!existingCohort) {
      return res
        .status(404)
        .json({ success: false, message: "No cohort found" });
    }

    // Check if the cohort has changed
    const oldCohortId = existingParticipant.cohort
      ? existingParticipant.cohort.toString()
      : null; // Safely convert to string only if it exists

    if (!oldCohortId || oldCohortId !== newCohortId.toString()) {
      // Update participant's cohort
      existingParticipant.cohort = newCohortId;
      const updatedParticipant = await existingParticipant.save();

      // Update cohort reference in evaluations and attendance
      await Evaluation.updateMany({ participant: id }, { cohort: newCohortId });
      await Attendance.updateMany({ participant: id }, { cohort: newCohortId });

      // Remove participant from old cohort's participants array, if applicable
      if (oldCohortId) {
        await Cohort.findByIdAndUpdate(oldCohortId, {
          $pull: { participants: id },
        });
      }

      await Cohort.findByIdAndUpdate(newCohortId, {
        $addToSet: { participants: id },
      });

      return res.status(200).json({ success: true, data: updatedParticipant });
    } else {
      const updatedParticipant = await Participant.findByIdAndUpdate(
        id,
        participantData,
        { new: true }
      );
      return res.status(200).json({ success: true, data: updatedParticipant });
    }
  } catch (error) {
    console.error("Error updating participant:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createParticipant,
  getAllParticipants,
  searchParticipantsByName,
  updateParticipant,
};
