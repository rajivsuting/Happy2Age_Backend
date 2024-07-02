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

    const evaluations = await Evaluation.find({ cohort }).populate({
      path: "session",
      match: { date: { $gte: startDate, $lte: endDate } },
    });

    const attendanceRecords = await Attendance.find({
      cohort,
      date: { $gte: startDate, $lte: endDate },
    });

    const attendance = attendanceRecords.filter(
      (record) => record.present
    ).length;
    const totalAttendance = attendanceRecords.length;

    const cohortDoc = await Cohort.findById(cohort).populate("sessions");
    const totalNumberOfSessions = cohortDoc.sessions.length;

    const filteredEvaluations = evaluations.filter(
      (evaluation) => evaluation.session
    );

    if (filteredEvaluations.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No reports found" });
    }

    const domainData = {};
    const cohortDomainData = {};
    const detailedScores = [];

    for (const evaluation of filteredEvaluations) {
      for (const domain of evaluation.domain) {
        const participant = await Participant.findById(evaluation.participant);

        if (!domainData[domain.name]) {
          domainData[domain.name] = {
            totalScore: 0,
            count: 0,
            sessions: new Set(),
          };
        }
        if (domain.average !== 0 && domain.conducted) {
          domainData[domain.name].totalScore += parseFloat(domain.average);
          domainData[domain.name].count += 1;
          domainData[domain.name].sessions.add(
            evaluation.session._id.toString()
          );

          detailedScores.push({
            domain: domain.name,
            score: parseFloat(domain.average),
            participant: participant.name,
          });
        }

        if (!cohortDomainData[domain.name]) {
          cohortDomainData[domain.name] = {
            totalScore: 0,
            count: 0,
          };
        }
        if (domain.conducted) {
          cohortDomainData[domain.name].totalScore += parseFloat(
            domain.average
          );
          cohortDomainData[domain.name].count += 1;
        }
      }
    }

    const graphDetails = Object.keys(domainData)
      .map((domainName) => ({
        domainName,
        average: (
          domainData[domainName].totalScore / domainData[domainName].count
        ).toFixed(2),
        cohortAverage: (
          cohortDomainData[domainName].totalScore /
          cohortDomainData[domainName].count
        ).toFixed(2),
        numberOfSessions: domainData[domainName].sessions.size,
      }))
      .filter((domain) => domain.numberOfSessions > 0);

    // Calculate averageForCohort
    const totalCohortAverage = graphDetails.reduce(
      (sum, domain) => sum + parseFloat(domain.cohortAverage),
      0
    );
    const averageForCohort = (totalCohortAverage / graphDetails.length).toFixed(
      2
    );

    const cohortReport = {
      attendance,
      totalAttendance,
      totalNumberOfSessions,
      graphDetails,
      detailedScores,
      averageForCohort,
    };

    console.log(cohortReport);
    res.status(200).json({ success: true, message: cohortReport });
  } catch (error) {
    console.error(`Error fetching reports: ${error.message}`);
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
    }).populate({
      path: "session",
      match: { date: { $gte: startDate, $lte: endDate } },
    });

    const filteredParticipantEvaluations = participantEvaluations.filter(
      (evaluation) => evaluation.session
    );

    if (filteredParticipantEvaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No evaluations found for the participant",
      });
    }

    const cohortEvaluations = await Evaluation.find({
      cohort: cohortId,
      session: { $exists: true },
    }).populate({
      path: "session",
      match: { date: { $gte: startDate, $lte: endDate } },
    });

    const filteredCohortEvaluations = cohortEvaluations.filter(
      (evaluation) => evaluation.session
    );

    const cohortSessions = await Session.find({
      cohort: cohortId,
      date: { $gte: startDate, $lte: endDate },
    });

    const attendanceRecords = await Attendance.find({
      participant: id,
      date: { $gte: startDate, $lte: endDate },
    });

    const totalAttendance = attendanceRecords.length;
    const attendance = attendanceRecords.filter(
      (record) => record.present === true
    ).length;
    const attendedSessions = attendance;

    const participantDomainData = {};
    const cohortDomainData = {};

    filteredParticipantEvaluations.forEach((evaluation) => {
      evaluation.domain.forEach((domain) => {
        if (!participantDomainData[domain.name]) {
          participantDomainData[domain.name] = {
            totalScore: 0,
            count: 0,
          };
        }

        if (domain.conducted) {
          participantDomainData[domain.name].totalScore += parseFloat(
            domain.average
          );
          participantDomainData[domain.name].count += 1;
        }
      });
    });

    filteredCohortEvaluations.forEach((evaluation) => {
      evaluation.domain.forEach((domain) => {
        if (!cohortDomainData[domain.name]) {
          cohortDomainData[domain.name] = {
            totalScore: 0,
            count: 0,
          };
        }

        if (domain.conducted) {
          cohortDomainData[domain.name].totalScore += parseFloat(
            domain.average
          );
          cohortDomainData[domain.name].count += 1;
        }
      });
    });

    const graphDetails = Object.keys(participantDomainData)
      .map((domainName) => ({
        domainName,
        average:
          participantDomainData[domainName].count > 0
            ? participantDomainData[domainName].totalScore /
              participantDomainData[domainName].count
            : null,
        cohortAverage:
          cohortDomainData[domainName] && cohortDomainData[domainName].count > 0
            ? cohortDomainData[domainName].totalScore /
              cohortDomainData[domainName].count
            : null,
        numberOfSessions: participantDomainData[domainName].count,
      }))
      .filter((domain) => domain.average !== null);

    const report = {
      participantDetails,
      totalAttendance,
      attendance,
      TotalnumberOfSessions: cohortSessions.length,
      attendedSessions,
      graphDetails,
    };

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getReportsByCohort, getIndividualReport };
