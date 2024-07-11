const Participant = require("../models/participantSchema");
const Cohort = require("../models/cohortSchema");
const { validateData } = require("../validator/validator");
const logger = require("../log/logger");

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

    const cohortId = participantData.cohort;

    const existingParticipant = await Participant.findById(id);

    const existingCohort = await Cohort.findById(cohortId);
    if (!existingCohort)
      res.status(404).json({ success: false, message: "No cohort found" });

    if (!existingParticipant) {
      return res
        .status(404)
        .json({ success: false, message: "Participant not found" });
    }

    const updatedParticipant = await Participant.findByIdAndUpdate(
      id,
      participantData,
      { new: true }
    );

    existingCohort.participants.push(id);
    await existingCohort.save();

    res.status(200).json({ success: true, data: updatedParticipant });
  } catch (error) {
    logger.error("Error updating participant:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createParticipant,
  getAllParticipants,
  searchParticipantsByName,
  updateParticipant,
};
