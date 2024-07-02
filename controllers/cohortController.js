const Cohort = require("../models/cohortSchema");
const Participant = require("../models/participantSchema");
const { validateParticipantData } = require("../validator/validator");
const logger = require("../log/logger");
const { default: mongoose } = require("mongoose");

const createCohort = async (req, res) => {
  try {
    const { name, participants } = req.body;

    if (!name || !participants || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message:
          "Name and participants are required fields, and participants must be an array",
      });
    }

    const invalidParticipants = [];
    for (const participantId of participants) {
      const participant = await Participant.findById(participantId);
      if (!participant) {
        invalidParticipants.push(participantId);
      }
    }

    if (invalidParticipants.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Participants not found: ${invalidParticipants.join(", ")}`,
      });
    }

    const cohort = await Cohort.create({ name, participants });

    res.status(201).json({
      success: true,
      message: "Cohort added successfully",
      data: cohort,
    });
  } catch (error) {
    logger.error("Error creating cohort:", error);

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllCohorts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default values for page and limit

    const cohorts = await Cohort.find()
      .populate("participants")
      .populate("sessions")
      .skip((page - 1) * limit) // Calculate the number of documents to skip
      .limit(parseInt(limit)) // Limit the number of documents retrieved
      .lean();

    if (cohorts.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No cohorts found" });
    }

    // Get the total count of cohorts for pagination purposes
    const totalCohorts = await Cohort.countDocuments();

    logger.info(`Retrieved ${cohorts.length} cohorts successfully`);

    res.status(200).json({
      success: true,
      data: cohorts,
      pagination: {
        total: totalCohorts,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCohorts / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching cohorts:", error);

    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format" });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateCohort = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, participants } = req.body;

    const cohort = await Cohort.findById(id);
    if (!cohort) {
      return res
        .status(404)
        .json({ success: false, message: "Cohort not found" });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (participants !== undefined) updateData.participants = participants;

    const updatedCohort = await Cohort.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // Check if any existing participants were removed
    const removedParticipants = cohort.participants.filter(
      (participantId) => !updatedCohort.participants.includes(participantId)
    );

    // Remove the cohort reference from the removed participants
    if (removedParticipants.length > 0) {
      await Participant.updateMany(
        { _id: { $in: removedParticipants } },
        { $unset: { cohort: 1 } }
      );
    }

    res.status(200).json({ success: true, data: updatedCohort });
  } catch (error) {
    console.error("Error updating cohort:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteCohort = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid cohort ID" });
    }

    const cohort = await Cohort.findById(id);
    if (!cohort) {
      return res
        .status(404)
        .json({ success: false, message: "Cohort not found" });
    }

    await Cohort.findByIdAndDelete(id);

    res
      .status(200)
      .json({ success: true, message: "Cohort deleted successfully" });
  } catch (error) {
    console.error("Error deleting cohort:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const searchCohortByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Cohort name is required" });
    }

    const cohorts = await Cohort.find({ name: { $regex: name, $options: "i" } })
      .populate("participants")
      .populate("sessions")
      .lean();

    if (cohorts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cohorts found with the specified name",
      });
    }

    logger.info(`Retrieved ${cohorts.length} cohorts successfully`);

    res.status(200).json({ success: true, data: cohorts });
  } catch (error) {
    logger.error("Error searching for cohorts:", error);

    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid query format" });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createCohort,
  getAllCohorts,
  updateCohort,
  deleteCohort,
  searchCohortByName,
};
