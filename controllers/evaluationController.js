const Evaluation = require("../models/evaluationSchema");
const Domain = require("../models/domainSchema");

const createEvaluation = async (req, res) => {
  try {
    const { cohort, session, activity, domain, participant } = req.body;
    console.log(session);

    if (!cohort || !session || !activity || !domain || !participant) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    let totalAverage = 0;

    domain.forEach((element, index) => {
      const subTopics = element.subTopics.filter((sub) => sub.score);
      element.subTopics = subTopics;
    });

    let validDomains = domain.filter((element) => element.subTopics.length);
    let grandScore = 0;
    validDomains.forEach((domain) => {
      const subTopicScores = domain.subTopics.map((sub) => Number(sub.score));
      const totalScore = subTopicScores.reduce((sum, score) => sum + score, 0);
      const averageScore = subTopicScores.length
        ? totalScore / subTopicScores.length
        : 0;
      domain.average = averageScore.toFixed(2);
      grandScore += averageScore;
    });

    const grandAverage = (grandScore / validDomains.length).toFixed(2);

    const newEvaluation = new Evaluation({
      cohort,
      session,
      activity,
      domain: validDomains,
      participant,
      grandAverage,
    });

    const savedEvaluation = await newEvaluation.save();

    res.status(201).json({
      success: true,
      message: "Evaluation added successfully",
      data: savedEvaluation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllEvaluation = async (req, res) => {
  try {
    const evaluations = await Evaluation.find()
      .populate("participant")
      .populate("cohort")
      .populate("activity")
      .populate("session");

    if (evaluations.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No evaluations found" });
    }

    res.status(200).json({ success: true, message: evaluations });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;

    const evaluation = await Evaluation.findByIdAndDelete(id);

    if (!evaluation) {
      return res
        .status(404)
        .json({ success: false, message: "Evaluation not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Evaluation deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const { cohort, session, activity, domain, participant } = req.body;

    if (!cohort || !session || !activity || !domain || !participant) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const existingEvaluation = await Evaluation.findById(id);
    if (!existingEvaluation) {
      return res
        .status(404)
        .json({ success: false, message: "Evaluation not found" });
    }

    domain.forEach((element) => {
      const subTopics = element.subTopics.filter((sub) => sub.score);
      element.subTopics = subTopics;
    });

    let validDomains = domain.filter((element) => element.subTopics.length);
    let grandScore = 0;

    validDomains.forEach((domain) => {
      const subTopicScores = domain.subTopics.map((sub) => Number(sub.score));
      const totalScore = subTopicScores.reduce((sum, score) => sum + score, 0);
      const averageScore = subTopicScores.length
        ? totalScore / subTopicScores.length
        : 0;
      domain.average = averageScore.toFixed(2);
      grandScore += averageScore;
    });

    const grandAverage = (grandScore / validDomains.length).toFixed(2);

    existingEvaluation.cohort = cohort;
    existingEvaluation.session = session;
    existingEvaluation.activity = activity;
    existingEvaluation.domain = validDomains;
    existingEvaluation.participant = participant;
    existingEvaluation.grandAverage = grandAverage;

    const updatedEvaluation = await existingEvaluation.save();

    res.status(200).json({
      success: true,
      message: "Evaluation updated successfully",
      data: updatedEvaluation,
    });
  } catch (error) {
    console.error("Error updating evaluation:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createEvaluation,
  getAllEvaluation,
  deleteEvaluation,
  updateEvaluation,
};
