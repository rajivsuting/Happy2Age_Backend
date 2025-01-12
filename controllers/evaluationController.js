const Evaluation = require("../models/evaluationSchema");
const Domain = require("../models/domainSchema");
const Participant = require("../models/participantSchema");
const Session = require("../models/sessionSchema");
const Cohort = require("../models/cohortSchema");

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
    // Get page and limit from the query parameters or set default values
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 documents per page

    // Calculate how many documents to skip
    const skip = (page - 1) * limit;

    // Fetch the total number of documents for pagination info
    const totalEvaluations = await Evaluation.countDocuments();

    // Fetch evaluations with pagination
    const evaluations = await Evaluation.find()
      .populate("participant")
      .populate("cohort")
      .populate("activity")
      .populate("session")
      .skip(skip) // Skip documents based on the page number
      .limit(limit); // Limit the number of documents returned

    // If no evaluations are found
    if (evaluations.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No evaluations found" });
    }

    // Respond with paginated data and pagination details
    res.status(200).json({
      success: true,
      data: evaluations,
      pagination: {
        total: totalEvaluations,
        page,
        limit,
        totalPages: Math.ceil(totalEvaluations / limit),
        hasNextPage: page * limit < totalEvaluations,
        hasPreviousPage: page > 1,
      },
    });
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

const searchEvaluations = async (req, res) => {
  const { name, startDate, endDate } = req.query;

  try {
    let filter = {};

    if (name && (!startDate || !endDate)) {
      const participantMatch = await Participant.find({
        name: { $regex: name, $options: "i" },
      });

      const cohortMatch = await Cohort.find({
        name: { $regex: name, $options: "i" },
      });

      if (participantMatch.length === 0 && cohortMatch.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No participants or cohorts found with the name "${name}"`,
        });
      }

      const participantIds = participantMatch.map((p) => p._id);
      const cohortIds = cohortMatch.map((c) => c._id);

      if (participantIds.length > 0)
        filter.participant = { $in: participantIds };
      if (cohortIds.length > 0) filter.cohort = { $in: cohortIds };
    }

    if (!name && startDate && endDate) {
      const sessions = await Session.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      }).select("_id");

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No sessions found within the specified date range`,
        });
      }

      const sessionIds = sessions.map((session) => session._id);
      filter.session = { $in: sessionIds };
    }

    if (name && startDate && endDate) {
      const participantMatch = await Participant.find({
        name: { $regex: name, $options: "i" },
      });

      const cohortMatch = await Cohort.find({
        name: { $regex: name, $options: "i" },
      });

      if (participantMatch.length === 0 && cohortMatch.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No participants or cohorts found with the name "${name}"`,
        });
      }

      const participantIds = participantMatch.map((p) => p._id);
      const cohortIds = cohortMatch.map((c) => c._id);

      if (participantIds.length > 0)
        filter.participant = { $in: participantIds };
      if (cohortIds.length > 0) filter.cohort = { $in: cohortIds };

      const sessions = await Session.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      }).select("_id");

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No sessions found within the specified date range`,
        });
      }

      const sessionIds = sessions.map((session) => session._id);
      filter.session = { $in: sessionIds };
    }

    const evaluations = await Evaluation.find(filter)
      .populate("participant")
      .populate("cohort")
      .populate("activity")
      .populate("session");

    if (evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No evaluations found${
          name ? ` for participants or cohorts with the name "${name}"` : ""
        }${startDate && endDate ? " within the specified date range" : ""}`,
      });
    }

    res.status(200).json({
      success: true,
      data: evaluations,
    });
  } catch (error) {
    console.error("Error searching evaluations:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createEvaluation,
  getAllEvaluation,
  deleteEvaluation,
  updateEvaluation,
  searchEvaluations,
};
