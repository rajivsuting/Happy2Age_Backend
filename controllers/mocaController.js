const Moca = require("../models/mocaSchema");

const addMocaTest = async (req, res) => {
  try {
    const { participant, questions, date, totalScore } = req.body;
    const mocaTest = new Moca({
      participant,
      questions,
      date,
      totalScore,
    });
    await mocaTest.save();
    res.status(201).json({
      success: true,
      message: "Moca test added successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllMocaResult = async (req, res) => {
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
    const total = await Moca.countDocuments(query);

    // Get paginated results with populated participant
    const mocaTest = await Moca.find(query)
      .populate("participant", "name")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate total pages
    const totalPages = Math.ceil(total / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: mocaTest,
      total,
      totalPages,
      currentPage: parseInt(page),
      pageSize: parseInt(limit),
    });
  } catch (error) {
    console.error("Error in getAllMocaResult:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the MOCA evaluations",
      error: error.message,
    });
  }
};

const getMocaTestByParticipantId = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Participant id is required" });
    }
    const mocaTest = await Moca.find({ participant: id });
    if (!mocaTest) {
      return res
        .status(404)
        .json({ success: false, message: "Moca test not found" });
    }
    res.status(200).json({ success: true, message: mocaTest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getMocaById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is a valid ObjectId
    if (!require("mongoose").Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid evaluation ID format",
      });
    }

    const evaluation = await Moca.findById(id).populate("participant", "name");

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "MOCA evaluation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: evaluation,
    });
  } catch (error) {
    console.error("Error in getMocaById:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the evaluation",
      error: error.message,
    });
  }
};

const updateMocaResult = async (req, res) => {
  try {
    const id = req.params.id;
    const mocaTest = await Moca.findByIdAndUpdate(id, req.body, { new: true });
    if (!mocaTest) {
      return res
        .status(404)
        .json({ success: false, message: "Moca test not found" });
    }
    res.status(200).json({ success: true, message: mocaTest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteMocaResult = async (req, res) => {
  try {
    const id = req.params.id;
    const mocaTest = await Moca.findByIdAndDelete(id);
    if (!mocaTest) {
      return res
        .status(404)
        .json({ success: false, message: "Moca test not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Moca test deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  addMocaTest,
  getMocaTestByParticipantId,
  getAllMocaResult,
  getMocaById,
  updateMocaResult,
  deleteMocaResult,
};
