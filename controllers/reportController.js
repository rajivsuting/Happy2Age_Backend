const Attendance = require("../models/attendanceSchema");
const Evaluation = require("../models/evaluationSchema");
const Participant = require("../models/participantSchema");
const Cohort = require("../models/cohortSchema");
const Session = require("../models/sessionSchema");

const getReportsByCohort = async (req, res) => {
  try {
    const { cohort, start, end } = req.query;

    if (!cohort) {
      return res
        .status(400)
        .json({ success: false, message: "Cohort is required" });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const evaluations = await Evaluation.find({ cohort })
      .populate({
        path: "session",
        match: { date: { $gte: startDate, $lte: endDate } },
      })
      .populate("participant")
      .populate("cohort")
      .populate("activity");

    if (evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found within this date range",
      });
    }

    //   const transformData = evaluations?.map(item => {
    //     const domains = item.domain.map(domainItem => ({
    //         domainName: domainItem.name,
    //         subtopics: domainItem.subTopics
    //     }));

    //     return {
    //         cohort: item.cohort.name,
    //         participant: item.participant.name,
    //         activity: item.activity.name,
    //         session: item.session.name,
    //         domains: domains,
    //         grandAverage: item.grandAverage
    //     };
    // });

    // console.log(transformData);

    // const evaluations = await Evaluation.find({ cohort ,match: { date: { $gte: startDate, $lte: endDate } }})

    // Fetch attendance records for the cohort within the date range
    const attendanceRecords = await Attendance.find({
      cohort,
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
    const totalAttendance = attendanceRecords.length;

    // Retrieve the cohort details to get the total number of sessions
    const cohortDoc = await Cohort.findById(cohort).populate("sessions");
    const totalNumberOfSessions = cohortDoc.sessions.length;

    let domainStats = {};
    let participantDomainScores = {};

    evaluations.forEach((item) => {
      const evaluationId = item._id.toString();
      item.domain.forEach((domain) => {
        const domainName = domain.name;
        const domainAverage = parseFloat(domain.average);
        const participantName = item.participant.name;
        const sessionId = item.session._id.toString();

        if (!domainStats[domainName]) {
          domainStats[domainName] = {
            totalAverage: 0,
            numberAppearance: new Set(),
            sessionIds: new Set(),
          };
        }

        domainStats[domainName].totalAverage += domainAverage;
        domainStats[domainName].numberAppearance.add(evaluationId);
        domainStats[domainName].sessionIds.add(sessionId);

        // Collect participant domain scores
        if (!participantDomainScores[participantName]) {
          participantDomainScores[participantName] = {};
        }

        if (!participantDomainScores[participantName][domainName]) {
          participantDomainScores[participantName][domainName] = {
            totalScore: 0,
            count: 0,
          };
        }

        participantDomainScores[participantName][domainName].totalScore +=
          domainAverage;
        participantDomainScores[participantName][domainName].count += 1;
      });
    });

    let graphDetails = Object.keys(domainStats).map((domainName) => {
      const { totalAverage, numberAppearance, sessionIds } =
        domainStats[domainName];
      return {
        domainName: domainName,
        centerAverage: (totalAverage / numberAppearance.size).toFixed(2),
        numberOfSessions: sessionIds.size, // Unique session count
      };
    });

    let participantDomainScoreList = [];

    Object.keys(participantDomainScores).forEach((participantName) => {
      Object.keys(participantDomainScores[participantName]).forEach(
        (domainName) => {
          const { totalScore, count } =
            participantDomainScores[participantName][domainName];
          participantDomainScoreList.push({
            domain: domainName,
            score: (totalScore / count).toFixed(2),
            participant: participantName,
          });
        }
      );
    });

    const totalCohortAverage = graphDetails.reduce(
      (sum, domain) => sum + parseFloat(domain.centerAverage),
      0
    );
    const averageForCohort = (totalCohortAverage / graphDetails.length).toFixed(
      2
    );

    const cohortReport = {
      cohort,
      attendance,
      totalAttendance,
      totalNumberOfSessions,
      graphDetails,
      participantDomainScores: participantDomainScoreList,
      averageForCohort,
    };

    res.status(200).json({ success: true, message: cohortReport, evaluations });
    // res.status(200).json({ success: true,transformData});
  } catch (error) {
    console.error(`Error fetching reports: ${error}`);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
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

    const cohortId = participantDetails.cohort._id;

    const participantEvaluations = await Evaluation.find({
      participant: id,
      session: { $exists: true },
    })
      .populate({
        path: "session",
        match: { date: { $gte: startDate, $lte: endDate } },
      })
      .populate("participant")
      .populate("cohort")
      .populate("activity");

    if (participantEvaluations.length === 0) {
      return res.status(404).json({
        message: "No records found within the specified date range",
      });
    }

    const cohortEvaluations = await Evaluation.find({ cohort: cohortId })
      .populate({
        path: "session",
        match: { date: { $gte: startDate, $lte: endDate } },
      })
      .populate("participant")
      .populate("cohort")
      .populate("activity");

    if (cohortEvaluations.length === 0) {
      return res.status(404).json({
        message: "No records found within the specified date range",
      });
    }

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

    // Initialize an object to store domain stats for the participant
    let domainStats = {};

    participantEvaluations.forEach((evaluation) => {
      evaluation.domain.forEach((domain) => {
        const domainName = domain.name;
        const domainAverage = parseFloat(domain.average);
        const sessionId = evaluation.session._id.toString();

        if (!domainStats[domainName]) {
          domainStats[domainName] = {
            totalAverage: 0,
            numberAppearance: new Set(),
            sessionIds: new Set(),
          };
        }

        domainStats[domainName].totalAverage += domainAverage;
        domainStats[domainName].numberAppearance.add(evaluation._id.toString());
        domainStats[domainName].sessionIds.add(sessionId);
      });
    });

    // Initialize an object to store cohort stats for calculating center average
    let cohortStats = {};

    cohortEvaluations.forEach((evaluation) => {
      evaluation.domain.forEach((domain) => {
        const domainName = domain.name;
        const domainAverage = parseFloat(domain.average);

        if (!cohortStats[domainName]) {
          cohortStats[domainName] = {
            totalAverage: 0,
            numberAppearance: new Set(),
          };
        }

        cohortStats[domainName].totalAverage += domainAverage;
        cohortStats[domainName].numberAppearance.add(evaluation._id.toString());
      });
    });

    // Format graphDetails
    let graphDetails = Object.keys(domainStats).map((domainName) => {
      const { totalAverage, numberAppearance, sessionIds } =
        domainStats[domainName];
      const centerAverage = cohortStats[domainName]
        ? (
            cohortStats[domainName].totalAverage /
            cohortStats[domainName].numberAppearance.size
          ).toFixed(2)
        : null;

      return {
        domainName: domainName,
        average: (totalAverage / numberAppearance.size).toFixed(2),
        centerAverage: centerAverage,
        numberOfSessions: sessionIds.size,
      };
    });

    const singleParticipant = {
      participant: participantDetails,
      attendance: attendance,
      totalNumberOfSessions: totalNumberOfSessions,
      graphDetails: graphDetails,
    };

    res.status(200).json({
      success: true,
      data: singleParticipant,
      participantEvaluations,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getReportsByCohort, getIndividualReport };
