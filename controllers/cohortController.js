const Cohort = require("../models/cohortSchema");
const Participant = require("../models/participantSchema");
const { validateParticipantData } = require("../validator/validator");
const logger = require("../log/logger");
const { default: mongoose } = require("mongoose");

const createCohort = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required fields",
      });
    }

    const cohort = await Cohort.create({ name });

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
    const { page = 1, limit = 10, search } = req.query;

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" }; // case-insensitive search
    }

    const cohorts = await Cohort.find(query)
      .populate("participants")
      .populate({
        path: "sessions",
        populate: {
          path: "activity",
          model: "Activity",
        },
      })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    if (cohorts.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No cohorts found" });
    }

    const totalCohorts = await Cohort.countDocuments(query);

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
      .populate({
        path: "sessions",
        populate: {
          path: "activity",
          model: "Activity",
        },
      })
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

const getCohortById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Cohort ID format" });
    }

    const cohort = await Cohort.findById(id)
      .populate("participants")
      .populate({
        path: "sessions",
        populate: {
          path: "activity",
          model: "Activity",
        },
      })
      .lean();

    if (!cohort) {
      return res
        .status(404)
        .json({ success: false, message: `Cohort not found with id ${id}` });
    }

    res.status(200).json({
      success: true,
      message: "Cohort retrieved successfully",
      data: cohort,
    });
  } catch (error) {
    console.error("Error fetching cohort by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createCohort,
  getAllCohorts,
  updateCohort,
  deleteCohort,
  searchCohortByName,
  getCohortById,
};
