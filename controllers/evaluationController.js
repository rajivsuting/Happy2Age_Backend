const Evaluation = require("../models/evaluationSchema");
const Domain = require("../models/domainSchema");

const createEvaluation = async (req, res) => {
  try {
    const { cohort, session, activity, domain, participant } = req.body;

    if (!cohort || !session || !activity || !domain || !participant) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    let totalAverage = 0;
    domain.forEach((element) => {
      const subTopics = element.subTopics;
      const totalScore = subTopics.reduce(
        (sum, subTopic) => sum + Number(subTopic.score),
        0
      );
      const averageScore = subTopics.length ? totalScore / subTopics.length : 0;
      totalAverage += averageScore;
      if (averageScore <= 0) {
        element.conducted = false;
      } else {
        element.conducted = true;
      }

      element.average = averageScore.toFixed(2);
    });

    const grandAverage = (totalAverage / domain.length).toFixed(2);

    const newEvaluation = new Evaluation({
      cohort,
      session,
      activity,
      domain,
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

module.exports = { createEvaluation, getAllEvaluation };
