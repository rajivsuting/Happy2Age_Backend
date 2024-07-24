const { default: mongoose } = require("mongoose");
const CASP = require("../models/caspSchema");

const addCASP = async (req, res) => {
  try {
    const { participant, questions, date, totalScore } = req.body;

    if (!participant || !questions || questions.length !== 19) {
      return res.status(400).json({
        success: false,
        message: "Participant ID and 19 questions are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(participant)) {
      return res.status(400).json({
        success: false,
        message: "Invalid participant ID format",
      });
    }

    const caspDoc = new CASP({
      participant,
      questions,
      date,
      totalScore,
    });

    await caspDoc.save();

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

const updateCASPResult = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Participant ID is required",
      });
    }

    const updatedCASPDoc = await CASP.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedCASPDoc) {
      return res.status(404).json({
        success: false,
        message: "No CASP found for this participant",
      });
    }

    res.status(200).json({
      success: true,
      message: "CASP updated successfully",
      data: updatedCASPDoc,
    });
  } catch (error) {
    console.error("Error updating CASP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteCASPResult = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Participant ID is required",
      });
    }
    const deletedCASPDoc = await CASP.findByIdAndDelete(id);
    if (!deletedCASPDoc) {
      return res.status(404).json({
        success: false,
        message: "No CASP found for this participant",
      });
    }

    res.status(200).json({
      success: true,
      message: "CASP deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting CASP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  addCASP,
  getCASPByParticipantId,
  getCASPParticipantAll,
  updateCASPResult,
  deleteCASPResult,
};
