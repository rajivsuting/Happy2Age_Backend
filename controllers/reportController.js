const Attendance = require("../models/attendanceSchema");
const Evaluation = require("../models/evaluationSchema");
const Participant = require("../models/participantSchema");
const Cohort = require("../models/cohortSchema");
const Session = require("../models/sessionSchema");
const { createEvaluation } = require("./evaluationController");
const { default: mongoose } = require("mongoose");
/*d*/
const getReportsByCohort = async (req, res) => {
  try {
    const { cohort, start, end } = req.query;

    if (!cohort) {
      return res
        .status(400)
        .json({ success: false, message: "Cohort is required" });
    }

    // Find cohort document
    const cohortDoc = await Cohort.findById(cohort);
    if (!cohortDoc) {
      return res
        .status(404)
        .json({ success: false, message: "No cohort found with ID " + cohort });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Find evaluations with populated fields
    let evaluations = await Evaluation.find({ cohort })
      .populate({
        path: "session",
        match: { date: { $gte: startDate, $lte: endDate } },
      })
      .populate("participant", "name")
      .populate("cohort", "name"); // Populate cohort's name

    evaluations = evaluations.filter(
      (evaluation) => evaluation.session !== null
    );

    if (!evaluations || evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No evaluations found for this cohort within the date range",
      });
    }

    // Group by session
    const groupedBySession = evaluations.reduce((acc, evaluation) => {
      const session = evaluation.session;
      const participant = evaluation.participant;

      if (!session || !participant) {
        console.warn(
          "Skipping evaluation with missing session or participant:",
          evaluation
        );
        return acc; // Skip if session or participant is missing
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

    // Transform and calculate data (no changes here)
    const graphDetails = [];
    Object.values(groupedBySession).forEach(({ session, evaluations }) => {
      evaluations.forEach((evaluation) => {
        evaluation.domain.forEach((domain) => {
          graphDetails.push({
            participant: evaluation.participant.name,
            domainName: domain.name,
            session: session.name,
            average: parseFloat(domain.average),
          });
        });
      });
    });

    // Calculate the average of averages for each domain for each participant
    const aggregatedData = {};

    graphDetails.forEach((detail) => {
      const key = `${detail.participant}-${detail.domainName}`;

      if (!aggregatedData[key]) {
        aggregatedData[key] = {
          participant: detail.participant,
          domainName: detail.domainName,
          totalAverage: 0,
          sessionCount: 0,
        };
      }

      aggregatedData[key].totalAverage += detail.average;
      aggregatedData[key].sessionCount += 1;
    });

    const finalGraphDetails = Object.values(aggregatedData).map((item) => ({
      domain: item.domainName,
      score: (item.totalAverage / item.sessionCount).toFixed(2),
      participant: item.participant,
    }));

    // Calculate the average of the averages for each domain for all participants
    const sessionDomainData = {};

    graphDetails.forEach((detail) => {
      const key = `${detail.session}-${detail.domainName}`;

      if (!sessionDomainData[key]) {
        sessionDomainData[key] = {
          session: detail.session,
          domainName: detail.domainName,
          totalAverage: 0,
          participantCount: 0,
        };
      }

      sessionDomainData[key].totalAverage += detail.average;
      sessionDomainData[key].participantCount += 1;
    });

    const finalSessionDomainAverages = Object.values(sessionDomainData).map(
      (item) => ({
        session: item.session,
        domainName: item.domainName,
        average: (item.totalAverage / item.participantCount).toFixed(2),
        numberOfParticipants: item.participantCount,
      })
    );

    // Calculate the overall average for each domain across all sessions
    const overallDomainData = {};

    finalSessionDomainAverages.forEach((item) => {
      const { domainName, average } = item;

      if (!overallDomainData[domainName]) {
        overallDomainData[domainName] = {
          domainName: domainName,
          totalAverage: 0,
          sessionCount: 0,
        };
      }

      overallDomainData[domainName].totalAverage += parseFloat(average);
      overallDomainData[domainName].sessionCount += 1;
    });

    const overallDomainAverages = Object.values(overallDomainData).map(
      (item) => ({
        domainName: item.domainName,
        centerAverage: (item.totalAverage / item.sessionCount).toFixed(2),
        numberOfSessions: item.sessionCount,
      })
    );

    const attendanceRecords = await Attendance.find({
      cohort,
      date: { $gte: startDate, $lte: endDate },
    });

    const totalNumberOfSessions = cohortDoc.sessions.length;

    // console.log(evaluations[0].cohort.sessions);

    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        message: "No records found within the specified date range",
      });
    }

    // Calculate attendance
    const attendance = attendanceRecords.filter(
      (record) => record.present
    ).length;
    const totalAttendance = attendanceRecords.length;

    const total = finalGraphDetails.reduce(
      (acc, entry) => acc + Number(entry.score),
      0
    );

    const cohortAverage = (total / finalGraphDetails.length).toFixed(2);

    const cohortReport = {
      cohort: evaluations[0].cohort.name, // Use cohort's name
      attendance,
      totalAttendance,
      totalNumberOfSessions,
      graphDetails: overallDomainAverages,
      participantDomainScores: finalGraphDetails,
      averageForCohort: cohortAverage,
      evaluations,
    };

    res.json({ success: true, message: cohortReport });
  } catch (error) {
    console.error(`Error fetching reports: ${error.message}`);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const calculateAverages = (details) => {
  const grouped = {};

  details.forEach((entry) => {
    const key = `${entry.session}-${entry.domainName}`;
    if (!grouped[key]) {
      grouped[key] = { total: 0, count: 0 };
    }
    grouped[key].total += entry.average;
    grouped[key].count += 1;
  });

  const results = [];
  for (const key in grouped) {
    const [session, domainName] = key.split("-");
    const { total, count } = grouped[key];
    results.push({
      session,
      domainName,
      average: total / count,
    });
  }

  return results;
};

const getIndividualReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Participant ID is required" });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const participantDetails = await Participant.findById(id).populate(
      "cohort"
    );

    if (!participantDetails) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    const cohort = participantDetails.cohort._id;
    let evaluations = await Evaluation.find({ cohort })
      .populate({
        path: "session",
        match: { date: { $gte: startDate, $lte: endDate } }, // Filters the populated sessions
      })
      .populate("participant", "name")
      .populate("cohort", "name");

    // Filter out evaluations where session is null (because it didn't match the date range)
    evaluations = evaluations.filter(
      (evaluation) => evaluation.session !== null
    );

    if (evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No evaluations found within the specified date range",
      });
    }

    const filteredEvaluations = evaluations.filter(
      (evaluation) => evaluation.participant._id == id
    );

    const groupedBySession = evaluations.reduce((acc, evaluation) => {
      const sessionId = evaluation.session._id;
      const participantId = evaluation.participant._id;

      if (!acc[sessionId]) {
        acc[sessionId] = {
          session: evaluation.session,
          evaluations: [],
        };
      }

      // Find if the evaluation for the same participant already exists
      const existingEvaluation = acc[sessionId].evaluations.find(
        (eval) =>
          eval.participant._id &&
          participantId &&
          eval.participant._id.toString() === participantId.toString()
      );

      if (existingEvaluation) {
        // Update existing evaluation with the new domain scores
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
        // Initialize totalScore and count for each domain
        evaluation.domain.forEach((domain) => {
          domain.totalScore = parseFloat(domain.average);
          domain.count = 1;
        });
        acc[sessionId].evaluations.push(evaluation);
      }

      return acc;
    }, {});

    // Transform the data to the required format
    const graphDetails = [];

    Object.values(groupedBySession).forEach(({ session, evaluations }) => {
      evaluations.forEach((evaluation) => {
        evaluation.domain.forEach((domain) => {
          graphDetails.push({
            participant: evaluation.participant.name, // Use participant's name
            participantId: evaluation.participant.id,
            domainName: domain.name,
            session: session.name,
            average: parseFloat(domain.average),
          });
        });
      });
    });

    // Calculate the average of averages for each domain for each participant
    const aggregatedData = {};

    graphDetails.forEach((detail) => {
      const key = `${detail.participant}-${detail.domainName}`;

      if (!aggregatedData[key]) {
        aggregatedData[key] = {
          participant: detail.participant,
          participantId: detail.participantId,
          domainName: detail.domainName,
          totalAverage: 0,
          sessionCount: 0,
        };
      }

      aggregatedData[key].totalAverage += detail.average;
      aggregatedData[key].sessionCount += 1;
    });

    const finalGraphDetails = Object.values(aggregatedData).map((item) => ({
      domainName: item.domainName,
      average: (item.totalAverage / item.sessionCount).toFixed(2),
      participant: item.participant,
      participantId: item.participantId,
      numberOfSessions: item.sessionCount,
    }));

    // Calculate the average of the averages for each domain for all participants
    const sessionDomainData = {};

    graphDetails.forEach((detail) => {
      const key = `${detail.session}-${detail.domainName}`;

      if (!sessionDomainData[key]) {
        sessionDomainData[key] = {
          session: detail.session,
          domainName: detail.domainName,
          totalAverage: 0,
          participantCount: 0,
        };
      }

      sessionDomainData[key].totalAverage += detail.average;
      sessionDomainData[key].participantCount += 1;
    });

    const finalSessionDomainAverages = Object.values(sessionDomainData).map(
      (item) => ({
        session: item.session,
        domainName: item.domainName,
        average: (item.totalAverage / item.participantCount).toFixed(2),
        numberOfParticipants: item.participantCount,
      })
    );

    // Calculate the overall average for each domain across all sessions
    const overallDomainData = {};

    finalSessionDomainAverages.forEach((item) => {
      const { domainName, average } = item;

      if (!overallDomainData[domainName]) {
        overallDomainData[domainName] = {
          domainName: domainName,
          totalAverage: 0,
          sessionCount: 0,
        };
      }

      overallDomainData[domainName].totalAverage += parseFloat(average);
      overallDomainData[domainName].sessionCount += 1;
    });

    const overallDomainAverages = Object.values(overallDomainData).map(
      (item) => ({
        domainName: item.domainName,
        centerAverage: (item.totalAverage / item.sessionCount).toFixed(2),
        numberOfSessions: item.sessionCount,
      })
    );

    const filteredParticipant = finalGraphDetails.filter(
      (entry) => entry.participantId === id
    );

    // Fetch attendance records for the participant within the date range
    const attendanceRecords = await Attendance.find({
      participant: id,
      date: { $gte: startDate, $lte: endDate },
    });

    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        message: "No records found within the specified date range",
      });
    }

    // Calculate attendance
    const attendance = attendanceRecords.filter(
      (record) => record.present
    ).length;
    const totalNumberOfSessions = attendanceRecords.length;

    const singleParticipant = {
      participant: participantDetails,
      attendance: attendance,
      totalNumberOfSessions: totalNumberOfSessions,
      graphDetails: addCenterAverage(
        filteredParticipant,
        overallDomainAverages
      ),
      averageForCohort: 0,
    };

    res.status(200).json({
      success: true,
      data: singleParticipant,
      evaluations: filteredEvaluations,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const addCenterAverage = (details, domainAverages) => {
  // Create a map for quick lookup
  const domainAverageMap = domainAverages.reduce((acc, curr) => {
    acc[curr.domainName] = curr.centerAverage;
    return acc;
  }, {});

  // Add centerAverage to the corresponding domain in graphDetails
  return details.map((detail) => ({
    ...detail,
    centerAverage: domainAverageMap[detail.domainName], // Ensure correct key
  }));
};

const getReportsForAllCohorts = async (req, res) => {
  try {
    const { start, end } = req.query;

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Fetch all cohorts
    const cohorts = await Cohort.find();

    if (!cohorts || cohorts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cohorts found",
      });
    }

    // Prepare graphDetails for all cohorts
    const graphDetails = [];

    for (const cohort of cohorts) {
      const cohortId = cohort._id;

      // Find evaluations for the current cohort
      let evaluations = await Evaluation.find({ cohort: cohortId })
        .populate({
          path: "session",
          match: { date: { $gte: startDate, $lte: endDate } },
        })
        .populate("participant", "name")
        .populate("cohort", "name"); // Populate cohort's name

      // Filter out evaluations with null sessions
      evaluations = evaluations.filter(
        (evaluation) => evaluation.session !== null
      );

      if (!evaluations || evaluations.length === 0) {
        continue; // Skip this cohort if no evaluations are found
      }

      // Group by domain for each cohort
      const domainData = {};

      evaluations.forEach((evaluation) => {
        evaluation.domain.forEach((domain) => {
          const domainName = domain.name;

          if (!domainData[domainName]) {
            domainData[domainName] = {
              domainName,
              totalScore: 0,
              count: 0,
            };
          }

          domainData[domainName].totalScore += parseFloat(domain.average);
          domainData[domainName].count += 1;
        });
      });

      // Add domain averages to graphDetails
      Object.values(domainData).forEach((data) => {
        graphDetails.push({
          domainName: data.domainName,
          average: (data.totalScore / data.count).toFixed(2),
          cohort: cohort.name,
        });
      });
    }

    // Return graph details
    res.json({
      success: true,
      message: graphDetails,
    });
  } catch (error) {
    console.error(`Error fetching reports: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getReportsByCohort,
  getIndividualReport,
  getReportsForAllCohorts,
};
