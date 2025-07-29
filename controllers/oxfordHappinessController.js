const OxfordHappiness = require("../models/oxfordHappiness");
const mongoose = require("mongoose");

const addOxfordHappinessEvaluation = async (req, res) => {
  try {
    const { participant, questions, date } = req.body;

    const happinessScore =
      questions.reduce((total, question) => {
        let score = question.score;
        if (question.isReverse) {
          score = 7 - score;
        }
        return total + score;
      }, 0) / 29;

    const oxfordHappiness = new OxfordHappiness({
      participant,
      questions,
      happinessScore,
      date,
    });

    await oxfordHappiness.save();

    res.status(201).json({
      success: true,
      message: "Oxford Happiness Evaluation added successfully",
      data: oxfordHappiness,
    });
  } catch (error) {
    // Handle any errors
    console.error("Error in addOxfordHappinessEvaluation:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while adding the Oxford Happiness Evaluation",
      message: error.message,
    });
  }
};

const getHappinessScoresByParticipantId = async (req, res) => {
  try {
    const { participantId } = req.params;
    console.log(participantId);
    // Check if participantId is provided
    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: "Participant ID is required",
      });
    }

    // Check if participantId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid participant ID format",
      });
    }

    // Attempt to find happiness scores by participant id
    const happinessScores = await OxfordHappiness.find({
      participant: participantId,
    });

    // Check if any happiness scores exist for this participant
    if (happinessScores.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No happiness scores found for this participant",
      });
    }

    // Return the happiness scores
    return res.status(200).json({
      success: true,
      message: happinessScores,
    });
  } catch (error) {
    console.error("Error in getHappinessScoresByParticipantId:", error);

    // Handle unexpected errors
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the happiness scores",
      message: error.message,
    });
  }
};
const getAllHappinessScores = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      startDate = "",
      endDate = "",
      participant = "",
    } = req.query;

    // Build query
    let query = {};

    if (search) {
      query.$or = [{ "participant.name": { $regex: search, $options: "i" } }];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (participant) {
      query.participant = participant;
    }

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const total = await OxfordHappiness.countDocuments(query);

    // Get paginated results with populated participant
    const happinessScores = await OxfordHappiness.find(query)
      .populate("participant", "name")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate total pages
    const totalPages = Math.ceil(total / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: happinessScores,
      total,
      totalPages,
      currentPage: parseInt(page),
      pageSize: parseInt(limit),
    });
  } catch (error) {
    console.error("Error in getAllHappinessScores:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the happiness scores",
      error: error.message,
    });
  }
};

const editOxfordHappinessEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const { participant, questions, date } = req.body;
    console.log(req.body);
    // Calculate the happiness score
    const happinessScore =
      questions.reduce((total, question) => {
        let score = question.score;
        if (question.isReverse) {
          score = 7 - score;
        }
        return total + score;
      }, 0) / 29;

    // Find the existing Oxford Happiness evaluation by ID
    const oxfordHappiness = await OxfordHappiness.findById(id);
    if (!oxfordHappiness) {
      return res
        .status(404)
        .json({ success: false, message: "Evaluation not found" });
    }

    // Update the evaluation with new data
    oxfordHappiness.participant = participant || oxfordHappiness.participant;
    oxfordHappiness.questions = questions || oxfordHappiness.questions;
    oxfordHappiness.happinessScore = happinessScore;
    oxfordHappiness.date = date || oxfordHappiness.date;

    // Save the updated evaluation
    await oxfordHappiness.save();

    res.status(200).json({
      success: true,
      message: "Oxford Happiness Evaluation updated successfully",
      data: oxfordHappiness,
    });
  } catch (error) {
    // Handle any errors
    console.error("Error in editOxfordHappinessEvaluation:", error);
    res.status(500).json({
      success: false,
      message:
        "An error occurred while updating the Oxford Happiness Evaluation",
      error: error.message,
    });
  }
};

const getHappinessScoreById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid evaluation ID format",
      });
    }

    const evaluation = await OxfordHappiness.findById(id).populate(
      "participant",
      "name"
    );

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Oxford Happiness Evaluation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: evaluation,
    });
  } catch (error) {
    console.error("Error in getHappinessScoreById:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the evaluation",
      error: error.message,
    });
  }
};

const deleteOxfordHappinessResult = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await OxfordHappiness.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Oxford Happiness Evaluation not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Oxford Happiness Evaluation deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteOxfordHappinessResult:", error);
    res.status(500).json({
      success: false,
      message:
        "An error occurred while deleting the Oxford Happiness Evaluation",
      error: error.message,
    });
  }
};
module.exports = {
  getAllHappinessScores,
  addOxfordHappinessEvaluation,
  getHappinessScoresByParticipantId,
  getHappinessScoreById,
  editOxfordHappinessEvaluation,
  deleteOxfordHappinessResult,
};
