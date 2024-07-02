const OxfordHappiness = require("../models/oxfordHappiness");
const mongoose = require("mongoose");




const addOxfordHappinessEvaluation = async (req, res) => {
  try {
    const { participant, questions,date } = req.body;

    // Calculate the happiness score
    const happinessScore =
      questions.reduce((total, question) => {
        let score = question.score;
        if (question.isReverse) {
          // Reverse the score for questions marked as reverse
          score = 7 - score;
        }
        return total + score;
      }, 0) / 29; // Divide by 29 as there are 29 questions

    const oxfordHappiness = new OxfordHappiness({
      participant,
      questions,
      happinessScore,
      date
    });

    // Save the oxfordHappiness document to the database
    await oxfordHappiness.save();

    // Send a success response
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
console.log("mdjdndndndndndnnnnnnnn")
    // Attempt to find happiness scores by participant id
    const happinessScores = await OxfordHappiness.find();
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
module.exports = {
  getAllHappinessScores,
  addOxfordHappinessEvaluation,
  getHappinessScoresByParticipantId,
};
