const Attendance = require("../models/attendanceSchema");
const Evaluation = require("../models/evaluationSchema");
const Participant = require("../models/participantSchema");
const Cohort = require("../models/cohortSchema");
const Session = require("../models/sessionSchema");
const { createEvaluation } = require("./evaluationController");
const { default: mongoose } = require("mongoose");
const {
  generateCohortSummary,
  generateIndividualSummary,
} = require("../services/openAIServices");
const {
  CohortReport,
  IndividualReport,
  AllCohortsReport,
} = require("../models/reportSchema");
const Report = require("../models/reportSchema");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
/*d*/
const getReportsByCohort = async (req, res) => {
  try {
    const { cohort, start, end, type } = req.query; // Extract 'type' from req.query

    if (!cohort) {
      return res
        .status(400)
        .json({ success: false, message: "Cohort is required" });
    }
    console.log(type);

    // Find cohort document with populated sessions
    const cohortDoc = await Cohort.findById(cohort)
      .populate("participants")
      .populate("sessions");
    if (!cohortDoc) {
      return res
        .status(404)
        .json({ success: false, message: "No cohort found with ID " + cohort });
    }

    const participants = cohortDoc.participants;

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Fetch evaluations with populated fields
    let evaluations = await Evaluation.find({ cohort })
      .populate({
        path: "session",
        match: { date: { $gte: startDate, $lte: endDate } },
      })
      .populate("participant")
      .populate("cohort", "name");

    // Filter out evaluations with null sessions
    evaluations = evaluations.filter(
      (evaluation) => evaluation.session !== null
    );

    // Filter based on participantType if 'type' is provided
    // Filter based on participantType if 'type' is provided and not "All"
    if (type && type !== "All") {
      evaluations = evaluations.filter(
        (evaluation) =>
          evaluation.participant &&
          evaluation.participant.participantType === type
      );
    }

    if (!evaluations || evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No evaluations found for this cohort within the date range",
      });
    }

    // Group by session and perform calculations
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

    // Continue with the existing transformations
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

    // Aggregation logic
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

    // Session domain averages
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

    // Overall domain averages
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

    // Attendance logic
    const attendanceRecords = await Attendance.find({
      cohort,
      date: { $gte: startDate, $lte: endDate },
    });

    // Get unique sessions within date range
    const sessionsInDateRange = cohortDoc.sessions
      ? cohortDoc.sessions.filter((session) => {
          const sessionDate = new Date(session.date);
          return sessionDate >= startDate && sessionDate <= endDate;
        })
      : [];

    // Group by session ID to count unique sessions
    const uniqueSessions = new Set();
    sessionsInDateRange.forEach((session) => {
      uniqueSessions.add(session._id.toString());
    });

    const totalNumberOfSessions = uniqueSessions.size;

    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        message: "No records found within the specified date range",
      });
    }

    // Count unique sessions that had attendance (where at least one person was present)
    const sessionsWithAttendance = new Set();
    attendanceRecords.forEach((record) => {
      if (record.present && record.session) {
        sessionsWithAttendance.add(record.session.toString());
      }
    });

    const attendance = sessionsWithAttendance.size;
    const totalAttendance = attendanceRecords.length;

    console.log("Backend Debug attendance calculation:", {
      totalNumberOfSessions,
      attendance,
      totalAttendance,
      sessionsWithAttendanceSize: sessionsWithAttendance.size,
      calculation: `${attendance} / ${totalNumberOfSessions} * 100 = ${Math.round(
        (attendance / totalNumberOfSessions) * 100
      )}%`,
    });

    const total = finalGraphDetails.reduce(
      (acc, entry) => acc + Number(entry.score),
      0
    );

    const cohortAverage = (total / finalGraphDetails.length).toFixed(2);

    const genderData = [
      { gender: "Male", count: 0 },
      { gender: "Female", count: 0 },
      { gender: "Other", count: 0 },
    ];
    const participantTypeData = [
      { participantType: "General", count: 0 },
      { participantType: "Special Need", count: 0 },
    ];

    const ageData = [
      { ageRange: "55-65", count: 0 },
      { ageRange: "65-75", count: 0 },
      { ageRange: "75+", count: 0 },
    ];

    // Process genderData, participantTypeData, and ageData
    participants.forEach((participant) => {
      // Increment gender count
      const genderIndex = genderData.findIndex(
        (item) => item.gender === participant.gender
      );
      if (genderIndex !== -1) genderData[genderIndex].count++;

      // Increment participantType count
      const typeIndex = participantTypeData.findIndex(
        (item) => item.participantType === participant.participantType
      );
      if (typeIndex !== -1) participantTypeData[typeIndex].count++;

      // Calculate and increment age group count
      const age =
        new Date().getFullYear() - new Date(participant.dob).getFullYear();
      if (age >= 55 && age <= 65) {
        ageData[0].count++;
      } else if (age > 65 && age <= 75) {
        ageData[1].count++;
      } else if (age > 75) {
        ageData[2].count++;
      }
    });

    const summaryData = {
      cohort: evaluations[0].cohort.name,
      attendance,
      totalAttendance,
      totalNumberOfSessions,
      graphDetails: overallDomainAverages,
      participantDomainScores: finalGraphDetails,
      averageForCohort: cohortAverage,
      genderData,
      participantTypeData,
      ageData,
    };
    let aiSummary;
    if (req.query.generateSummary === "true") {
      aiSummary = await generateCohortSummary(summaryData);
    }

    // Calculate happinessParameter averages for the cohort
    // Build a map from domainName to all unique happinessParameters across all evaluations
    const domainToHappiness = {};
    evaluations.forEach((evaluation) => {
      if (evaluation.domain && Array.isArray(evaluation.domain)) {
        evaluation.domain.forEach((domain) => {
          if (domain.name && domain.happinessParameter) {
            if (!domainToHappiness[domain.name])
              domainToHappiness[domain.name] = new Set();
            domain.happinessParameter.forEach((param) =>
              domainToHappiness[domain.name].add(param)
            );
          }
        });
      }
    });

    // Build a map from domainName to centerAverage using overallDomainAverages
    const domainNameToCenterAverage = {};
    overallDomainAverages.forEach((item) => {
      domainNameToCenterAverage[item.domainName] =
        typeof item.centerAverage === "string"
          ? parseFloat(item.centerAverage)
          : item.centerAverage;
    });

    // For each happinessParameter, collect all centerAverages for mapped domains
    const centerAverageMap = {};
    overallDomainAverages.forEach((domain) => {
      const params = Array.from(domainToHappiness[domain.domainName] || []);
      params.forEach((param) => {
        if (!centerAverageMap[param]) centerAverageMap[param] = [];
        const centerAvg = domainNameToCenterAverage[domain.domainName];
        if (!isNaN(centerAvg)) centerAverageMap[param].push(centerAvg);
      });
    });

    const happinessParameterAverages = Object.entries(centerAverageMap).map(
      ([happinessParameter, centerAverages]) => ({
        happinessParameter,
        centerAverage:
          centerAverages.length > 0
            ? (
                centerAverages.reduce((a, b) => a + b, 0) /
                centerAverages.length
              ).toFixed(2)
            : null,
      })
    );

    // Calculate quarterly happinessParameter averages for the cohort
    const msInYear = 365 * 24 * 60 * 60 * 1000;
    const totalRange = endDate - startDate;
    let quarterlyHappinessParameterAverages = null;
    if (totalRange > msInYear) {
      // Split into 4 quarters
      const quarterLength = Math.floor(totalRange / 4);
      quarterlyHappinessParameterAverages = [];
      for (let i = 0; i < 4; i++) {
        const qStart = new Date(startDate.getTime() + i * quarterLength);
        const qEnd =
          i === 3
            ? endDate
            : new Date(startDate.getTime() + (i + 1) * quarterLength);
        // Filter evaluations for this quarter
        const quarterEvals = evaluations.filter((ev) => {
          const sessionDate = ev.session?.date
            ? new Date(ev.session.date)
            : null;
          return sessionDate && sessionDate >= qStart && sessionDate < qEnd;
        });
        // Build domainToHappiness for this quarter
        const domainToHappinessQ = {};
        quarterEvals.forEach((evaluation) => {
          if (evaluation.domain && Array.isArray(evaluation.domain)) {
            evaluation.domain.forEach((domain) => {
              if (domain.name && domain.happinessParameter) {
                if (!domainToHappinessQ[domain.name])
                  domainToHappinessQ[domain.name] = new Set();
                domain.happinessParameter.forEach((param) =>
                  domainToHappinessQ[domain.name].add(param)
                );
              }
            });
          }
        });
        // Calculate overallDomainAverages for this quarter
        // (reuse the aggregation logic from above, but scoped to quarterEvals)
        const groupedBySessionQ = quarterEvals.reduce((acc, evaluation) => {
          const session = evaluation.session;
          const participant = evaluation.participant;
          if (!session || !participant) return acc;
          const sessionId = session._id;
          if (!acc[sessionId]) {
            acc[sessionId] = { session, evaluations: [] };
          }
          // Find existing evaluation
          const existingEvaluation = acc[sessionId].evaluations.find(
            (eval) =>
              eval.participant._id.toString() === participant._id.toString()
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
        const graphDetailsQ = [];
        Object.values(groupedBySessionQ).forEach(({ session, evaluations }) => {
          evaluations.forEach((evaluation) => {
            evaluation.domain.forEach((domain) => {
              graphDetailsQ.push({
                participant: evaluation.participant.name,
                domainName: domain.name,
                session: session.name,
                average: parseFloat(domain.average),
              });
            });
          });
        });
        // Session domain averages for this quarter
        const sessionDomainDataQ = {};
        graphDetailsQ.forEach((detail) => {
          const key = `${detail.session}-${detail.domainName}`;
          if (!sessionDomainDataQ[key]) {
            sessionDomainDataQ[key] = {
              session: detail.session,
              domainName: detail.domainName,
              totalAverage: 0,
              participantCount: 0,
            };
          }
          sessionDomainDataQ[key].totalAverage += detail.average;
          sessionDomainDataQ[key].participantCount += 1;
        });
        const finalSessionDomainAveragesQ = Object.values(
          sessionDomainDataQ
        ).map((item) => ({
          session: item.session,
          domainName: item.domainName,
          average: (item.totalAverage / item.participantCount).toFixed(2),
          numberOfParticipants: item.participantCount,
        }));
        // Overall domain averages for this quarter
        const overallDomainDataQ = {};
        finalSessionDomainAveragesQ.forEach((item) => {
          const { domainName, average } = item;
          if (!overallDomainDataQ[domainName]) {
            overallDomainDataQ[domainName] = {
              domainName: domainName,
              totalAverage: 0,
              sessionCount: 0,
            };
          }
          overallDomainDataQ[domainName].totalAverage += parseFloat(average);
          overallDomainDataQ[domainName].sessionCount += 1;
        });
        const overallDomainAveragesQ = Object.values(overallDomainDataQ).map(
          (item) => ({
            domainName: item.domainName,
            centerAverage: (item.totalAverage / item.sessionCount).toFixed(2),
            numberOfSessions: item.sessionCount,
          })
        );
        // Build a map from domainName to centerAverage for this quarter
        const domainNameToCenterAverageQ = {};
        overallDomainAveragesQ.forEach((item) => {
          domainNameToCenterAverageQ[item.domainName] =
            typeof item.centerAverage === "string"
              ? parseFloat(item.centerAverage)
              : item.centerAverage;
        });
        // For each happinessParameter, collect all centerAverages for mapped domains
        const centerAverageMapQ = {};
        overallDomainAveragesQ.forEach((domain) => {
          const params = Array.from(
            domainToHappinessQ[domain.domainName] || []
          );
          params.forEach((param) => {
            if (!centerAverageMapQ[param]) centerAverageMapQ[param] = [];
            const centerAvg = domainNameToCenterAverageQ[domain.domainName];
            if (!isNaN(centerAvg)) centerAverageMapQ[param].push(centerAvg);
          });
        });
        const happinessParameterAveragesQ = Object.entries(
          centerAverageMapQ
        ).map(([happinessParameter, centerAverages]) => ({
          happinessParameter,
          centerAverage:
            centerAverages.length > 0
              ? (
                  centerAverages.reduce((a, b) => a + b, 0) /
                  centerAverages.length
                ).toFixed(2)
              : null,
        }));
        quarterlyHappinessParameterAverages.push({
          quarter: i + 1,
          start: qStart,
          end: qEnd,
          happinessParameterAverages: happinessParameterAveragesQ,
        });
      }
    } else {
      // For <1 year, wrap the single range in the same structure
      quarterlyHappinessParameterAverages = [
        {
          quarter: 1,
          start: startDate,
          end: endDate,
          happinessParameterAverages,
        },
      ];
    }

    const cohortReport = {
      cohort: evaluations[0].cohort.name,
      attendance,
      totalAttendance,
      totalNumberOfSessions,
      graphDetails: overallDomainAverages,
      participantDomainScores: finalGraphDetails,
      averageForCohort: cohortAverage,
      evaluations,
      genderData,
      participantTypeData,
      ageData,
      aiSummary,
      happinessParameterAverages, // Add to response
      quarterlyHappinessParameterAverages, // Add to response
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
    let aiSummary;

    // Calculate domain trends
    const domainTrends = {};
    const allDates = new Set(); // To track unique dates

    // First pass: collect all unique dates
    graphDetails.forEach((detail) => {
      if (detail.participantId === id) {
        const dateMatch = detail.session.match(/\d{2}\/\d{2}\/\d{4}/);
        if (dateMatch) {
          const [day, month, year] = dateMatch[0].split("/");
          const date = new Date(year, month - 1, day);
          allDates.add(date.toISOString());
        }
      }
    });

    // Convert Set to sorted array
    const sortedDates = Array.from(allDates).sort();

    // Second pass: create domain trends with consistent dates
    graphDetails.forEach((detail) => {
      if (detail.participantId === id) {
        const domainName = detail.domainName;
        if (!domainTrends[domainName]) {
          domainTrends[domainName] = [];
        }

        const dateMatch = detail.session.match(/\d{2}\/\d{2}\/\d{4}/);
        if (dateMatch) {
          const [day, month, year] = dateMatch[0].split("/");
          const date = new Date(year, month - 1, day);

          // Check if this date already exists for this domain
          const existingEntry = domainTrends[domainName].find(
            (entry) => entry.date === date.toISOString()
          );

          if (!existingEntry) {
            domainTrends[domainName].push({
              session: detail.session,
              date: date.toISOString(),
              score: detail.average,
            });
          }
        }
      }
    });

    // Sort each domain's trends by date
    Object.keys(domainTrends).forEach((domainName) => {
      domainTrends[domainName].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
    });

    // Calculate happinessParameter averages
    // We'll use filteredEvaluations, which are the evaluations for this participant
    // Build a map from domainName to all unique happinessParameters across all evaluations
    const domainToHappiness = {};
    filteredEvaluations.forEach((evaluation) => {
      if (evaluation.domain && Array.isArray(evaluation.domain)) {
        evaluation.domain.forEach((domain) => {
          if (domain.name && domain.happinessParameter) {
            if (!domainToHappiness[domain.name])
              domainToHappiness[domain.name] = new Set();
            domain.happinessParameter.forEach((param) =>
              domainToHappiness[domain.name].add(param)
            );
          }
        });
      }
    });

    // Build a map from domainName to centerAverage using overallDomainAverages
    const domainNameToCenterAverage = {};
    overallDomainAverages.forEach((item) => {
      domainNameToCenterAverage[item.domainName] =
        typeof item.centerAverage === "string"
          ? parseFloat(item.centerAverage)
          : item.centerAverage;
    });

    const happinessMap = {};
    const centerAverageMap = {};

    filteredParticipant.forEach((domain) => {
      const params = Array.from(domainToHappiness[domain.domainName] || []);
      params.forEach((param) => {
        if (!happinessMap[param]) happinessMap[param] = [];
        if (!centerAverageMap[param]) centerAverageMap[param] = [];
        const avg =
          typeof domain.average === "string"
            ? parseFloat(domain.average)
            : domain.average;
        const centerAvg = domainNameToCenterAverage[domain.domainName];
        if (!isNaN(avg)) happinessMap[param].push(avg);
        if (!isNaN(centerAvg)) centerAverageMap[param].push(centerAvg);
      });
    });

    const happinessParameterAverages = Object.entries(happinessMap).map(
      ([happinessParameter, averages]) => {
        const centerAverages = centerAverageMap[happinessParameter] || [];
        return {
          happinessParameter,
          average:
            averages.length > 0
              ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(
                  2
                )
              : null,
          centerAverage:
            centerAverages.length > 0
              ? (
                  centerAverages.reduce((a, b) => a + b, 0) /
                  centerAverages.length
                ).toFixed(2)
              : null,
        };
      }
    );

    // Inside getIndividualReport function after creating singleParticipant object:
    if (req.query.generateSummary === "true") {
      const summaryData = {
        evaluations: filteredEvaluations,
      };

      aiSummary = await generateIndividualSummary(summaryData);
    }

    // Check if the date range is more than a year
    const msInYear = 365 * 24 * 60 * 60 * 1000;
    const totalRange = endDate - startDate;
    let quarterlyHappinessParameterAverages = null;
    if (totalRange > msInYear) {
      // Split into 4 quarters
      const quarterLength = Math.floor(totalRange / 4);
      quarterlyHappinessParameterAverages = [];
      for (let i = 0; i < 4; i++) {
        const qStart = new Date(startDate.getTime() + i * quarterLength);
        const qEnd =
          i === 3
            ? endDate
            : new Date(startDate.getTime() + (i + 1) * quarterLength);
        // Debug print
        console.log(
          `Quarter ${i + 1}: ${qStart.toISOString()} - ${qEnd.toISOString()}`
        );
        filteredEvaluations.forEach((ev) => {
          console.log("Session date:", ev.session?.date);
        });
        // Filter evaluations for this quarter
        const quarterEvals = filteredEvaluations.filter((ev) => {
          const sessionDate = ev.session?.date
            ? new Date(ev.session.date)
            : null;
          return sessionDate && sessionDate >= qStart && sessionDate < qEnd;
        });
        // Build domainToHappiness for this quarter
        const domainToHappiness = {};
        quarterEvals.forEach((evaluation) => {
          if (evaluation.domain && Array.isArray(evaluation.domain)) {
            evaluation.domain.forEach((domain) => {
              if (domain.name && domain.happinessParameter) {
                if (!domainToHappiness[domain.name])
                  domainToHappiness[domain.name] = new Set();
                domain.happinessParameter.forEach((param) =>
                  domainToHappiness[domain.name].add(param)
                );
              }
            });
          }
        });
        // Build filteredParticipant for this quarter
        // (reuse the aggregation logic from above, but scoped to quarterEvals)
        const graphDetails = [];
        const groupedBySession = quarterEvals.reduce((acc, evaluation) => {
          const sessionId = evaluation.session._id;
          const participantId = evaluation.participant._id;
          if (!acc[sessionId]) {
            acc[sessionId] = { session: evaluation.session, evaluations: [] };
          }
          // Find if the evaluation for the same participant already exists
          const existingEvaluation = acc[sessionId].evaluations.find(
            (eval) =>
              eval.participant._id &&
              participantId &&
              eval.participant._id.toString() === participantId.toString()
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
        Object.values(groupedBySession).forEach(({ session, evaluations }) => {
          evaluations.forEach((evaluation) => {
            evaluation.domain.forEach((domain) => {
              graphDetails.push({
                participant: evaluation.participant.name,
                participantId: evaluation.participant.id,
                domainName: domain.name,
                session: session.name,
                average: parseFloat(domain.average),
              });
            });
          });
        });
        // Aggregate per domain
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
        // Calculate overallDomainAverages for this quarter
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
        // Calculate happinessParameterAverages for this quarter
        const domainNameToCenterAverage = {};
        overallDomainAverages.forEach((item) => {
          domainNameToCenterAverage[item.domainName] =
            typeof item.centerAverage === "string"
              ? parseFloat(item.centerAverage)
              : item.centerAverage;
        });
        const happinessMap = {};
        const centerAverageMap = {};
        finalGraphDetails.forEach((domain) => {
          const params = Array.from(domainToHappiness[domain.domainName] || []);
          params.forEach((param) => {
            if (!happinessMap[param]) happinessMap[param] = [];
            if (!centerAverageMap[param]) centerAverageMap[param] = [];
            const avg =
              typeof domain.average === "string"
                ? parseFloat(domain.average)
                : domain.average;
            const centerAvg = domainNameToCenterAverage[domain.domainName];
            if (!isNaN(avg)) happinessMap[param].push(avg);
            if (!isNaN(centerAvg)) centerAverageMap[param].push(centerAvg);
          });
        });
        const happinessParameterAverages = Object.entries(happinessMap).map(
          ([happinessParameter, averages]) => {
            const centerAverages = centerAverageMap[happinessParameter] || [];
            return {
              happinessParameter,
              average:
                averages.length > 0
                  ? (
                      averages.reduce((a, b) => a + b, 0) / averages.length
                    ).toFixed(2)
                  : null,
              centerAverage:
                centerAverages.length > 0
                  ? (
                      centerAverages.reduce((a, b) => a + b, 0) /
                      centerAverages.length
                    ).toFixed(2)
                  : null,
            };
          }
        );
        quarterlyHappinessParameterAverages.push({
          quarter: i + 1,
          start: qStart,
          end: qEnd,
          happinessParameterAverages,
        });
      }
    } else {
      // For <1 year, wrap the single range in the same structure
      quarterlyHappinessParameterAverages = [
        {
          quarter: 1,
          start: startDate,
          end: endDate,
          happinessParameterAverages,
        },
      ];
    }

    const singleParticipant = {
      participant: participantDetails,
      aiSummary: aiSummary,
      attendance: attendance,
      totalNumberOfSessions: totalNumberOfSessions,
      // filteredParticipant,
      graphDetails: addCenterAverage(
        filteredParticipant,
        overallDomainAverages
      ),
      averageForCohort: 0,
      domainTrends: domainTrends, // Add the new trends data
      quarterlyHappinessParameterAverages,
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

    // Fetch all participants
    const participants = await Participant.find();

    // Data holders
    const genderData = [
      { gender: "Male", count: 0 },
      { gender: "Female", count: 0 },
      { gender: "Other", count: 0 },
    ];
    const participantTypeData = [
      { participantType: "General", count: 0 },
      { participantType: "Special Need", count: 0 },
    ];

    const ageData = [
      { ageRange: "55-65", count: 0 },
      { ageRange: "65-75", count: 0 },
      { ageRange: "75+", count: 0 },
    ];

    // Process genderData, participantTypeData, and ageData
    participants.forEach((participant) => {
      // Increment gender count
      const genderIndex = genderData.findIndex(
        (item) => item.gender === participant.gender
      );
      if (genderIndex !== -1) genderData[genderIndex].count++;

      // Increment participantType count
      const typeIndex = participantTypeData.findIndex(
        (item) => item.participantType === participant.participantType
      );
      if (typeIndex !== -1) participantTypeData[typeIndex].count++;

      // Calculate and increment age group count
      const age =
        new Date().getFullYear() - new Date(participant.dob).getFullYear();
      if (age >= 55 && age <= 65) {
        ageData[0].count++;
      } else if (age > 65 && age <= 75) {
        ageData[1].count++;
      } else if (age > 75) {
        ageData[2].count++;
      }
    });

    // Process each cohort's evaluations
    const domainData = {};
    const allHappinessParameterAverages = [];

    for (const cohort of cohorts) {
      const cohortId = cohort._id;

      // Find evaluations for the current cohort
      let evaluations = await Evaluation.find({ cohort: cohortId })
        .populate({
          path: "session",
          match: { date: { $gte: startDate, $lte: endDate } },
        })
        .populate("participant", "name gender dob participantType cohort")
        .populate("cohort", "name")
        .populate("domain");

      // Filter out evaluations with null sessions
      evaluations = evaluations.filter(
        (evaluation) => evaluation.session !== null
      );

      if (!evaluations || evaluations.length === 0) {
        continue; // Skip this cohort if no evaluations are found
      }

      // Group by domain and process domain data
      const domainDataForCohort = {};

      evaluations.forEach((evaluation) => {
        evaluation.domain.forEach((domain) => {
          const domainName = domain.name;

          if (!domainDataForCohort[domainName]) {
            domainDataForCohort[domainName] = {
              domainName,
              totalScore: 0,
              count: 0,
            };
          }

          domainDataForCohort[domainName].totalScore += parseFloat(
            domain.average
          );
          domainDataForCohort[domainName].count += 1;
        });
      });

      // Aggregate domain averages across all centers
      Object.values(domainDataForCohort).forEach((data) => {
        const domainName = data.domainName;
        const centerAverage = data.totalScore / data.count;

        if (!domainData[domainName]) {
          domainData[domainName] = {
            domainName,
            totalAverage: 0,
            centerCount: 0,
          };
        }

        domainData[domainName].totalAverage += centerAverage;
        domainData[domainName].centerCount += 1;
      });

      // --- HAPPINESS PARAMETER CALCULATION (same logic as getReportsByCohort) ---
      // Build a map from domainName to all unique happinessParameters across all evaluations
      const domainToHappiness = {};
      evaluations.forEach((evaluation) => {
        if (evaluation.domain && Array.isArray(evaluation.domain)) {
          evaluation.domain.forEach((domain) => {
            if (domain.name && domain.happinessParameter) {
              if (!domainToHappiness[domain.name])
                domainToHappiness[domain.name] = new Set();
              domain.happinessParameter.forEach((param) =>
                domainToHappiness[domain.name].add(param)
              );
            }
          });
        }
      });

      // Build a map from domainName to centerAverage using domainDataForCohort
      const domainNameToCenterAverage = {};
      Object.values(domainDataForCohort).forEach((data) => {
        domainNameToCenterAverage[data.domainName] =
          data.totalScore / data.count;
      });

      // For each happinessParameter, collect all centerAverages for mapped domains
      const centerAverageMap = {};
      Object.values(domainDataForCohort).forEach((domain) => {
        const params = Array.from(domainToHappiness[domain.domainName] || []);
        params.forEach((param) => {
          if (!centerAverageMap[param]) centerAverageMap[param] = [];
          const centerAvg = domainNameToCenterAverage[domain.domainName];
          if (!isNaN(centerAvg)) centerAverageMap[param].push(centerAvg);
        });
      });

      const happinessParameterAverages = Object.entries(centerAverageMap).map(
        ([happinessParameter, centerAverages]) => ({
          happinessParameter,
          centerAverage:
            centerAverages.length > 0
              ? (
                  centerAverages.reduce((a, b) => a + b, 0) /
                  centerAverages.length
                ).toFixed(2)
              : null,
        })
      );

      // Add happiness parameter averages to the overall list
      allHappinessParameterAverages.push(...happinessParameterAverages);
    }

    // Aggregate happiness parameter averages across all centers
    const aggregatedHappinessParameters = {};
    allHappinessParameterAverages.forEach((item) => {
      if (item.centerAverage !== null) {
        if (!aggregatedHappinessParameters[item.happinessParameter]) {
          aggregatedHappinessParameters[item.happinessParameter] = {
            happinessParameter: item.happinessParameter,
            totalAverage: 0,
            centerCount: 0,
          };
        }
        aggregatedHappinessParameters[item.happinessParameter].totalAverage +=
          parseFloat(item.centerAverage);
        aggregatedHappinessParameters[item.happinessParameter].centerCount += 1;
      }
    });

    const finalHappinessParameterAverages = Object.values(
      aggregatedHappinessParameters
    ).map((item) => ({
      happinessParameter: item.happinessParameter,
      centerAverage: (item.totalAverage / item.centerCount).toFixed(2),
    }));

    // Convert aggregated domain data to final format
    const finalGraphDetails = Object.values(domainData).map((domain) => ({
      domainName: domain.domainName,
      average: (domain.totalAverage / domain.centerCount).toFixed(2),
    }));

    // Return structured response
    const reportData = {
      graphDetails: finalGraphDetails,
      genderData,
      ageData,
      participantTypeData,
      happinessParameterAverages: finalHappinessParameterAverages,
      totalCenters: cohorts.length,
    };

    res.json({
      success: true,
      message: reportData,
    });
  } catch (error) {
    console.error(`Error fetching reports: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const compareCohorts = async (req, res) => {
  try {
    const cohorts = await Cohort.find();

    if (!cohorts || cohorts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cohorts found",
      });
    }

    const graphDetails = [];
    const cohortAverages = [];

    for (const cohort of cohorts) {
      const cohortId = cohort._id;

      const evaluations = await Evaluation.find({ cohort: cohortId })
        .populate("participant", "name")
        .populate("cohort", "name")
        .populate("session", "date");

      if (!evaluations || evaluations.length === 0) continue;

      // ============ Part 1: Calculate graphDetails =============
      const domainDataForCohort = {};

      evaluations.forEach((evaluation) => {
        evaluation.domain.forEach((domain) => {
          const domainName = domain.name;

          if (!domainDataForCohort[domainName]) {
            domainDataForCohort[domainName] = {
              domainName,
              totalScore: 0,
              count: 0,
            };
          }

          domainDataForCohort[domainName].totalScore += parseFloat(
            domain.average
          );
          domainDataForCohort[domainName].count += 1;
        });
      });

      let totalScore = 0;
      let totalCount = 0;

      Object.values(domainDataForCohort).forEach((data) => {
        const average = (data.totalScore / data.count).toFixed(2);
        totalScore += parseFloat(average);
        totalCount += 1;

        graphDetails.push({
          domainName: data.domainName,
          average: average,
          cohort: cohort.name,
        });
      });

      // ============ Part 2: Calculate accurate cohort average for overallStats =============
      const participantDomainMap = {};

      evaluations.forEach((evaluation) => {
        const participantName = evaluation.participant.name;

        evaluation.domain.forEach((domain) => {
          const key = `${participantName}-${domain.name}`;
          if (!participantDomainMap[key]) {
            participantDomainMap[key] = {
              total: 0,
              count: 0,
            };
          }
          participantDomainMap[key].total += parseFloat(domain.average);
          participantDomainMap[key].count += 1;
        });
      });

      const domainAverages = Object.values(participantDomainMap).map(
        (entry) => entry.total / entry.count
      );

      const cohortAverage =
        domainAverages.length > 0
          ? (
              domainAverages.reduce((a, b) => a + b, 0) / domainAverages.length
            ).toFixed(2)
          : "0.00";

      cohortAverages.push({
        name: cohort.name,
        average: parseFloat(cohortAverage),
        participantCount: new Set(
          evaluations.map((ev) => ev.participant._id.toString())
        ).size,
      });
    }

    // ============ Part 3: Calculate top and bottom performing centers =============
    const sortedCohorts = cohortAverages.sort((a, b) => b.average - a.average);
    const topCenter = sortedCohorts[0];
    const bottomCenter = sortedCohorts[sortedCohorts.length - 1];

    const overallStats = {
      totalParticipants: await Participant.countDocuments(),
      totalCohorts: cohorts.length,
      topPerformingCohort: {
        name: topCenter?.name || "-",
        averageScore: topCenter?.average?.toFixed(2) || "0.00",
        participantCount: topCenter?.participantCount || 0,
      },
      bottomPerformingCohort: {
        name: bottomCenter?.name || "-",
        averageScore: bottomCenter?.average?.toFixed(2) || "0.00",
        participantCount: bottomCenter?.participantCount || 0,
      },
    };

    res.json({
      success: true,
      data: {
        graphDetails,
        overallStats,
      },
    });
  } catch (error) {
    console.error(`Error comparing cohorts: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Configure multer for PDF storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/reports";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
}).single("pdf");

// Save report with PDF
const saveReportWithPDF = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    try {
      const { type, name, cohort, participant, startDate, endDate, metadata } =
        req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No PDF file uploaded",
        });
      }

      // Create the report with the correct URL path
      const report = new Report({
        type,
        name,
        pdfUrl: `/uploads/reports/${req.file.filename}`,
        cohort,
        participant,
        startDate,
        endDate,
        metadata: metadata ? JSON.parse(metadata) : {},
        generatedBy: req.user._id, // Assuming you have user info in req.user
      });

      await report.save();

      res.json({
        success: true,
        message: "Report saved successfully",
        data: report,
      });
    } catch (error) {
      // If there's an error, delete the uploaded file
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      console.error(`Error saving report: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });
};

// Get report history
const getReportHistory = async (req, res) => {
  try {
    const { type } = req.query;
    let query = {};

    if (type && type !== "all") {
      query.type = type;
    }

    const reports = await Report.find(query)
      .populate("cohort", "name")
      .populate("participant", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error(`Error fetching report history: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get individual report
const getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id)
      .populate("participant")
      .populate("cohort");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // If the request is for the PDF file
    if (req.query.download === "true") {
      const pdfPath = path.join(__dirname, "..", report.pdfUrl);

      // Check if file exists
      if (!fs.existsSync(pdfPath)) {
        return res.status(404).json({
          success: false,
          message: "PDF file not found",
        });
      }

      // Set headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${report.name || "report.pdf"}"`
      );

      // Stream the file
      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);
      return;
    }

    // Return report data for normal requests
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error(`Error fetching report: ${error.message}`);
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
  compareCohorts,
  getReportHistory,
  saveReportWithPDF,
  getReport,
};
