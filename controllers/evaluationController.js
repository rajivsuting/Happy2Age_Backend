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
  const { search, startDate, endDate, page = 1, limit = 10 } = req.query;

  try {
    let filter = {};

    // Log the search term to debug
    console.log("Search Term:", search);

    // Trim any extra spaces from the search term to avoid issues with spaces
    const cleanedSearch = search ? search.trim() : "";

    // If only search term is provided (name filter)
    if (cleanedSearch && (!startDate || !endDate)) {
      // Ensure space between words is considered when searching
      const nameSearchRegex = new RegExp(`(^|\\s)${cleanedSearch}`, "i"); // Match `ram` or `ram d` anywhere in the name

      const participantMatch = await Participant.find({
        name: { $regex: nameSearchRegex },
      });

      const cohortMatch = await Cohort.find({
        name: { $regex: nameSearchRegex },
      });

      if (participantMatch.length === 0 && cohortMatch.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No participants or cohorts found with the name "${cleanedSearch}"`,
        });
      }

      const participantIds = participantMatch.map((p) => p._id);
      const cohortIds = cohortMatch.map((c) => c._id);

      if (participantIds.length > 0)
        filter.participant = { $in: participantIds };
      if (cohortIds.length > 0) filter.cohort = { $in: cohortIds };
    }

    // If only date range is provided (session date filter)
    if (!cleanedSearch && startDate && endDate) {
      const sessions = await Session.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }, // Filter by date range
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

    // If both search term and date range are provided
    if (cleanedSearch && startDate && endDate) {
      const nameSearchRegex = new RegExp(`(^|\\s)${cleanedSearch}`, "i"); // Match `ram` or `ram d` anywhere in the name

      const participantMatch = await Participant.find({
        name: { $regex: nameSearchRegex },
      });

      const cohortMatch = await Cohort.find({
        name: { $regex: nameSearchRegex },
      });

      if (participantMatch.length === 0 && cohortMatch.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No participants or cohorts found with the name "${cleanedSearch}"`,
        });
      }

      const participantIds = participantMatch.map((p) => p._id);
      const cohortIds = cohortMatch.map((c) => c._id);

      if (participantIds.length > 0)
        filter.participant = { $in: participantIds };
      if (cohortIds.length > 0) filter.cohort = { $in: cohortIds };

      // Search for sessions within the specified date range
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

    // Pagination: Calculate skip and limit
    const skip = (page - 1) * limit;

    // Fetch evaluations based on the filter and apply pagination
    const totalEvaluations = await Evaluation.countDocuments(filter); // Count total filtered evaluations

    const evaluations = await Evaluation.find(filter)
      .populate("participant")
      .populate("cohort")
      .populate("activity")
      .populate("session")
      .skip(skip) // Skip documents based on page number
      .limit(limit); // Limit the number of documents returned

    if (evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No evaluations found${
          cleanedSearch
            ? ` for participants or cohorts with the name "${cleanedSearch}"`
            : ""
        }${startDate && endDate ? " within the specified date range" : ""}`,
      });
    }

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

const getEvaluationById = async (req, res) => {
  const { id } = req.params;

  try {
    const evaluation = await Evaluation.findById(id)
      .populate("participant")
      .populate("cohort")
      .populate("activity")
      .populate("session");

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: `Evaluation with ID ${id} not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error("Error fetching evaluation by ID:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getPerformanceTrends = async (req, res) => {
  try {
    console.log("in");
    const { participantId } = req.query;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: "Participant ID is required",
      });
    }

    // Get all evaluations for the participant
    const evaluations = await Evaluation.find({
      participant: participantId,
    })
      .populate("session")
      .populate("activity")
      .sort({ "session.date": 1 }); // Sort by session date

    if (evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No evaluations found for this participant",
      });
    }

    // Group evaluations by session and calculate domain averages
    const groupedBySession = evaluations.reduce((acc, evaluation) => {
      const session = evaluation.session;
      const participant = evaluation.participant;

      if (!session || !participant) {
        console.warn(
          "Skipping evaluation with missing session or participant:",
          evaluation
        );
        return acc;
      }

      const sessionId = session._id;
      const participantId = participant._id;

      if (!acc[sessionId]) {
        acc[sessionId] = {
          session,
          evaluations: [],
        };
      }

      // Find existing evaluation
      const existingEvaluation = acc[sessionId].evaluations.find(
        (eval) => eval.participant._id.toString() === participantId.toString()
      );

      if (existingEvaluation) {
        evaluation.domain.forEach((newDomain) => {
          const existingDomain = existingEvaluation.domain.find(
            (dom) => dom._id.toString() === newDomain._id.toString()
          );

          if (existingDomain) {
            existingDomain.totalScore += parseFloat(newDomain.average);
            existingDomain.count += 1;
            existingDomain.average = (
              existingDomain.totalScore / existingDomain.count
            ).toFixed(2);
          } else {
            newDomain.totalScore = parseFloat(newDomain.average);
            newDomain.count = 1;
            existingEvaluation.domain.push(newDomain);
          }
        });
      } else {
        evaluation.domain.forEach((domain) => {
          domain.totalScore = parseFloat(domain.average);
          domain.count = 1;
        });
        acc[sessionId].evaluations.push(evaluation);
      }

      return acc;
    }, {});

    // Transform the data to get overall scores and domain-specific data
    const overallScores = [];
    const domainData = {};

    Object.values(groupedBySession).forEach(({ session, evaluations }) => {
      evaluations.forEach((evaluation) => {
        // Calculate overall scores
        const domainScores = evaluation.domain.map((domain) =>
          parseFloat(domain.average)
        );
        const grandAverage =
          domainScores.reduce((sum, score) => sum + score, 0) /
          domainScores.length;

        overallScores.push({
          date: session.date,
          score: grandAverage.toFixed(2),
        });

        // Process domain-specific data
        evaluation.domain.forEach((domain) => {
          if (!domainData[domain.name]) {
            domainData[domain.name] = {
              scores: [],
              totalScore: 0,
              count: 0,
              trend: "stable",
              consistency: "high",
            };
          }

          domainData[domain.name].scores.push({
            date: session.date,
            score: parseFloat(domain.average),
          });
          domainData[domain.name].totalScore += parseFloat(domain.average);
          domainData[domain.name].count += 1;
        });
      });
    });

    // Calculate domain-specific metrics
    const domainAnalysis = {};
    Object.entries(domainData).forEach(([domainName, data]) => {
      const scores = data.scores.map((s) => s.score);
      const average = data.totalScore / data.count;

      // Calculate trend for this domain
      let trend = "stable";
      if (scores.length >= 2) {
        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));
        const firstAvg =
          firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
        const secondAvg =
          secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
        const difference = secondAvg - firstAvg;
        if (Math.abs(difference) >= 0.5) {
          trend = difference > 0 ? "improving" : "declining";
        }
      }

      // Calculate consistency for this domain
      const variance =
        scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) /
        scores.length;
      const standardDeviation = Math.sqrt(variance);
      const consistency =
        standardDeviation <= 0.5
          ? "high"
          : standardDeviation <= 1
          ? "medium"
          : "low";

      // Determine strength level
      let strength = "average";
      if (average >= 6) strength = "strong";
      else if (average <= 4) strength = "weak";

      domainAnalysis[domainName] = {
        average: average.toFixed(2),
        highest: Math.max(...scores).toFixed(2),
        lowest: Math.min(...scores).toFixed(2),
        latest: scores[scores.length - 1].toFixed(2),
        trend,
        consistency,
        strength,
        scores: data.scores,
      };
    });

    // Calculate overall performance metrics
    const scores = overallScores.map((item) => parseFloat(item.score));
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const latestScore = scores[scores.length - 1];

    // Calculate overall trend
    let trend = "stable";
    if (scores.length >= 2) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      const firstAvg =
        firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
      const difference = secondAvg - firstAvg;
      if (Math.abs(difference) >= 0.5) {
        trend = difference > 0 ? "improving" : "declining";
      }
    }

    // Calculate overall consistency
    const variance =
      scores.reduce(
        (sum, score) => sum + Math.pow(score - averageScore, 2),
        0
      ) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    const consistency =
      standardDeviation <= 0.5
        ? "high"
        : standardDeviation <= 1
        ? "medium"
        : "low";

    res.status(200).json({
      success: true,
      data: {
        overall: {
          scores: overallScores,
          metrics: {
            average: averageScore.toFixed(2),
            highest: highestScore.toFixed(2),
            lowest: lowestScore.toFixed(2),
            latest: latestScore.toFixed(2),
            consistency,
            trend,
          },
        },
        domains: domainAnalysis,
        insights: {
          strongDomains: Object.entries(domainAnalysis)
            .filter(([_, data]) => data.strength === "strong")
            .map(([name, _]) => name),
          weakDomains: Object.entries(domainAnalysis)
            .filter(([_, data]) => data.strength === "weak")
            .map(([name, _]) => name),
          improvingDomains: Object.entries(domainAnalysis)
            .filter(([_, data]) => data.trend === "improving")
            .map(([name, _]) => name),
          decliningDomains: Object.entries(domainAnalysis)
            .filter(([_, data]) => data.trend === "declining")
            .map(([name, _]) => name),
        },
      },
    });
  } catch (error) {
    console.error("Error analyzing performance trends:", error);
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
  getEvaluationById,
  getPerformanceTrends,
};
