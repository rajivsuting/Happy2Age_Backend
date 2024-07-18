const { default: mongoose } = require("mongoose");
const CASP = require("../models/caspSchema");

const addCASP = async (req, res) => {
  try {
    const { participant, questions,date,totalScore } = req.body;

    // Check if participant and questions are provided
    if (!participant || !questions || questions.length !== 19) {
      return res.status(400).json({
        success: false,
        message: "Participant ID and 19 questions are required",
      });
    }

    // Check if participant is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(participant)) {
      return res.status(400).json({
        success: false,
        message: "Invalid participant ID format",
      });
    }

    // Create a new CASP document
    const caspDoc = new CASP({
      participant,
      questions,
      date,
      totalScore
    });

    // Save the document to the database
    await caspDoc.save();

    // Send a success response
    res.status(201).json({
      success: true,
      message: "CASP added successfully",
      data: caspDoc,
    });
  } catch (error) {
    console.error("Error in addCASP:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while adding CASP",
      message: error.message,
    });
  }
};

const getCASPByParticipantId = async (req, res) => {
  try {
    const { participantId } = req.params;

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

    // Attempt to find CASP by participant id
    const caspDoc = await CASP.find({ participant: participantId });

    // Check if CASP exists for this participant
    if (!caspDoc) {
      return res.status(404).json({
        success: false,
        message: "No CASP found for this participant",
      });
    }

    // Return the CASP document
    return res.status(200).json({
      success: true,
      message: caspDoc,
    });
  } catch (error) {
    console.error("Error in getCASPByParticipantId:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the CASP",
      message: error.message,
    });
  }
};

const getCASPParticipantAll = async (req, res) => {
  try {

    // Attempt to find CASP by participant id
    const caspDoc = await CASP.find();

    // Check if CASP exists for this participant
    if (!caspDoc) {
      return res.status(404).json({
        success: false,
        message: "No CASP found for this participant",
      });
    }

    // Return the CASP document
    return res.status(200).json({
      success: true,
      message: caspDoc,
    });
  } catch (error) {
    console.error("Error in getCASPByParticipantId:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the CASP",
      message: error.message,
    });
  }
};
module.exports = { addCASP, getCASPByParticipantId,getCASPParticipantAll };
