const Moca = require("../models/mocaSchema");

const addMocaTest = async (req, res) => {
  try {
    const { participant, questions, date } = req.body;
    const mocaTest = new Moca({
      participant,
      questions,
      date,
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
    const mocaTest = await Moca.find();
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
  updateMocaResult,
  deleteMocaResult,
};
