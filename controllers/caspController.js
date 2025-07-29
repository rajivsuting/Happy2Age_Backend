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
    const total = await CASP.countDocuments(query);

    // Get paginated results with populated participant
    const caspDoc = await CASP.find(query)
      .populate("participant", "name")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate total pages
    const totalPages = Math.ceil(total / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: caspDoc,
      total,
      totalPages,
      currentPage: parseInt(page),
      pageSize: parseInt(limit),
    });
  } catch (error) {
    console.error("Error in getCASPParticipantAll:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the CASP evaluations",
      error: error.message,
    });
  }
};

const getCASPById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid evaluation ID format",
      });
    }

    const evaluation = await CASP.findById(id).populate("participant", "name");

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "CASP evaluation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: evaluation,
    });
  } catch (error) {
    console.error("Error in getCASPById:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the evaluation",
      error: error.message,
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
  getCASPById,
  updateCASPResult,
  deleteCASPResult,
};
