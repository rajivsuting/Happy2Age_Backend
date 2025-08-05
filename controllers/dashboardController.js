const Cohort = require("../models/cohortSchema");
const Participant = require("../models/participantSchema");
const Evaluation = require("../models/evaluationSchema");
const Activity = require("../models/activitySchema");
const Session = require("../models/sessionSchema");
const Attendance = require("../models/attendanceSchema");
const Domain = require("../models/domainSchema");

const getDashboardStats = async (req, res) => {
  try {
    // Run all count queries in parallel
    const [
      totalMembers,
      totalSessions,
      totalCenters,
      totalActivities,
      totalGeneralMembers,
      totalSpecialMembers,
      membersWithoutGroup,
      attendanceRecords,
      cohorts,
      recentEvaluations,
      activityDistribution,
    ] = await Promise.all([
      Participant.countDocuments({}),
      Session.countDocuments(),
      Cohort.countDocuments(),
      Activity.countDocuments(),
      Participant.countDocuments({ participantType: "General" }),
      Participant.countDocuments({ participantType: "Special Need" }),
      Participant.countDocuments({
        $or: [{ cohort: { $exists: false } }, { cohort: null }],
      }),
      Attendance.find(),
      // Get all cohorts with their participant counts
      Cohort.aggregate([
        {
          $lookup: {
            from: "participants",
            localField: "_id",
            foreignField: "cohort",
            as: "participants",
          },
        },
        {
          $project: {
            name: 1,
            participantCount: { $size: "$participants" },
          },
        },
      ]),
      // Get recent evaluations
      Evaluation.find()
        .populate("participant", "name")
        .populate("session", "date")
        .sort({ "session.date": -1 })
        .limit(4)
        .lean(),
      // Get activity distribution
      Evaluation.aggregate([
        {
          $match: {
            domain: { $exists: true, $type: "array" },
          },
        },
        {
          $unwind: "$domain",
        },
        {
          $group: {
            _id: "$domain.name",
            value: { $sum: 1 },
          },
        },
        {
          $project: {
            name: "$_id",
            value: 1,
            _id: 0,
          },
        },
        {
          $sort: { value: -1 },
        },
        {
          $limit: 5,
        },
      ]),
    ]);

    // Attendance Level
    const presentCount = attendanceRecords.filter(
      (r) => r.present === true
    ).length;
    const attendanceLevel =
      attendanceRecords.length > 0
        ? ((presentCount / attendanceRecords.length) * 100).toFixed(2)
        : null;

    // --- CORRECT HAPPINESS PARAMETER & DOMAIN AGGREGATION ---
    // Get all domains to understand happiness parameter mapping
    const allDomains = await Domain.find();
    const domainToHappiness = {};
    allDomains.forEach((d) => {
      if (d.name && Array.isArray(d.happinessParameter)) {
        domainToHappiness[d.name] = d.happinessParameter;
      }
    });

    // --- CALCULATE TOP/BOTTOM PERFORMING MEMBERS (DOMAINS) ---
    const allParticipants = await Participant.find().populate("cohort");
    const memberDomainScores = [];
    const memberHappinessScores = [];

    for (const participant of allParticipants) {
      const evaluations = await Evaluation.find({
        participant: participant._id,
      }).populate("domain");

      if (!evaluations || evaluations.length === 0) continue;

      // Group evaluations by session and perform calculations (same logic as getReportsByCohort)
      const groupedBySession = evaluations.reduce((acc, evaluation) => {
        const session = evaluation.session;
        const participantId = evaluation.participant._id;

        if (!session || !participantId) {
          console.warn(
            "Skipping evaluation with missing session or participant:",
            evaluation
          );
          return acc;
        }

        const sessionId = session._id;

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

      // Transform the data to the required format (same as getReportsByCohort)
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

      // Aggregation logic (same as getReportsByCohort)
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

      // Calculate average for each participant across all domains
      const participantAverages = finalGraphDetails.map((item) =>
        parseFloat(item.score)
      );
      const participantAverage =
        participantAverages.length > 0
          ? participantAverages.reduce((a, b) => a + b, 0) /
            participantAverages.length
          : 0;

      memberDomainScores.push({
        id: participant._id,
        name: participant.name,
        center: participant.cohort?.name || "Unknown",
        averageScore: participantAverage,
        totalSessions: evaluations.length,
      });

      // --- CALCULATE HAPPINESS PARAMETER SCORES (EXACT same as getIndividualReport) ---
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

      // For member happiness, we'll use the participant's own domain scores
      const happinessMap = {};

      finalGraphDetails.forEach((domain) => {
        const params = Array.from(domainToHappiness[domain.domain] || []);
        params.forEach((param) => {
          if (!happinessMap[param]) happinessMap[param] = [];
          const avg = parseFloat(domain.score);
          if (!isNaN(avg)) happinessMap[param].push(avg);
        });
      });

      const happinessParameterAverages = Object.entries(happinessMap).map(
        ([happinessParameter, averages]) => ({
          happinessParameter,
          average:
            averages.length > 0
              ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(
                  2
                )
              : null,
        })
      );

      // Calculate overall happiness score (average of all happiness parameters)
      const validHappinessAverages = happinessParameterAverages
        .map((item) => item.average)
        .filter((avg) => avg !== null)
        .map((avg) => parseFloat(avg));

      const overallHappinessScore =
        validHappinessAverages.length > 0
          ? validHappinessAverages.reduce((a, b) => a + b, 0) /
            validHappinessAverages.length
          : 0;

      memberHappinessScores.push({
        id: participant._id,
        name: participant.name,
        center: participant.cohort?.name || "Unknown",
        averageScore: overallHappinessScore,
        totalSessions: evaluations.length,
      });
    }

    // Sort and get top/bottom performers
    const topPerformers = [...memberDomainScores]
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3);
    const bottomPerformers = [...memberDomainScores]
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 3);
    const topMembersHappiness = [...memberHappinessScores]
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3);
    const bottomMembersHappiness = [...memberHappinessScores]
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 3);

    // --- CALCULATE CENTER PERFORMANCE ---
    const allCohorts = await Cohort.find();
    const centerDomainScores = [];
    const centerHappinessScores = [];

    for (const cohort of allCohorts) {
      const evaluations = await Evaluation.find({
        cohort: cohort._id,
      })
        .populate("domain")
        .populate("session")
        .populate("participant");

      if (!evaluations || evaluations.length === 0) continue;

      // Group by session and perform calculations (EXACT same logic as getReportsByCohort)
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

      // Continue with the existing transformations (EXACT same as getReportsByCohort)
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

      // Aggregation logic for participant scores (same as getReportsByCohort)
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

      // Session domain averages (EXACT same as getReportsByCohort)
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

      // Overall domain averages (EXACT same as getReportsByCohort)
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

      // Debug: Check if this matches the reports
      console.log(`Center: ${cohort.name}`);
      console.log("overallDomainAverages:", overallDomainAverages);
      console.log("Expected for Vicinia: Motor Skills=3.81, Cognition=4.88");
      console.log(
        "Actual values:",
        overallDomainAverages.map((d) => `${d.domainName}=${d.centerAverage}`)
      );

      // Calculate domain averages for this center (for domain scores)
      const centerDomainAverages = overallDomainAverages.map((item) =>
        parseFloat(item.centerAverage)
      );
      const centerDomainAverage =
        centerDomainAverages.length > 0
          ? centerDomainAverages.reduce((a, b) => a + b, 0) /
            centerDomainAverages.length
          : 0;

      // Build a map from domainName to all unique happinessParameters (EXACT same as getReportsByCohort)
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

      // Build a map from domainName to centerAverage using overallDomainAverages (EXACT same as getReportsByCohort)
      const domainNameToCenterAverage = {};
      overallDomainAverages.forEach((item) => {
        domainNameToCenterAverage[item.domainName] =
          typeof item.centerAverage === "string"
            ? parseFloat(item.centerAverage)
            : item.centerAverage;
      });

      // For each happinessParameter, collect all centerAverages for mapped domains (EXACT same as getReportsByCohort)
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

      // Debug logging
      console.log(`Center: ${cohort.name}`);
      console.log("overallDomainAverages:", overallDomainAverages);
      console.log("domainToHappiness:", domainToHappiness);
      console.log("centerAverageMap:", centerAverageMap);
      console.log("happinessParameterAverages:", happinessParameterAverages);

      // Calculate overall happiness score (average of all happiness parameters)
      const validCenterHappinessAverages = happinessParameterAverages
        .map((item) => item.centerAverage)
        .filter((avg) => avg !== null)
        .map((avg) => parseFloat(avg));

      const overallCenterHappinessScore =
        validCenterHappinessAverages.length > 0
          ? validCenterHappinessAverages.reduce((a, b) => a + b, 0) /
            validCenterHappinessAverages.length
          : 0;

      console.log("overallCenterHappinessScore:", overallCenterHappinessScore);
      console.log(
        "validCenterHappinessAverages:",
        validCenterHappinessAverages
      );
      console.log(
        "Calculation: (",
        validCenterHappinessAverages.join(" + "),
        ") /",
        validCenterHappinessAverages.length,
        "=",
        overallCenterHappinessScore
      );
      console.log("Expected for Vicinia: 4.34");
      console.log("Actual result:", overallCenterHappinessScore);

      // Calculate domain averages for this center
      const participantDomainAverages = finalGraphDetails.map((item) =>
        parseFloat(item.score)
      );
      const participantCenterAverage =
        participantDomainAverages.length > 0
          ? participantDomainAverages.reduce((a, b) => a + b, 0) /
            participantDomainAverages.length
          : 0;

      centerDomainScores.push({
        name: cohort.name,
        averageScore: centerDomainAverage,
        participantCount: cohort.participants?.length || 0,
        totalSessions: evaluations.length,
      });

      centerHappinessScores.push({
        name: cohort.name,
        averageScore: overallCenterHappinessScore,
        participantCount: cohort.participants?.length || 0,
        totalSessions: evaluations.length,
      });
    }

    // Sort and get top/bottom centers
    const topCentersHappiness = [...centerHappinessScores]
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3);
    const bottomCentersHappiness = [...centerHappinessScores]
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 3);
    const topCentersDomains = [...centerDomainScores]
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3);
    const bottomCentersDomains = [...centerDomainScores]
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 3);

    const formattedRecentEvaluations = recentEvaluations.map((eval) => ({
      id: eval._id,
      member: eval.participant.name,
      activity:
        Array.isArray(eval.domain) && eval.domain.length > 0
          ? eval.domain[0].name
          : "General",
      score:
        Array.isArray(eval.domain) && eval.domain.length > 0
          ? eval.domain[0].average || 0
          : 0,
      date: eval.session.date,
    }));

    res.json({
      success: true,
      data: {
        stats: {
          totalMembers,
          totalSessions,
          totalCenters,
          totalActivities,
          totalGeneralMembers,
          totalSpecialMembers,
          attendanceLevel,
          membersWithoutGroup,
        },
        topPerformers: topPerformers.map((member) => ({
          id: member.id,
          name: member.name,
          center: member.center,
          averageScore: member.averageScore.toFixed(2),
          totalSessions: member.totalSessions,
        })),
        bottomPerformers: bottomPerformers.map((member) => ({
          id: member.id,
          name: member.name,
          center: member.center,
          averageScore: member.averageScore.toFixed(2),
          totalSessions: member.totalSessions,
        })),
        topCenters: topCentersDomains.map((center) => ({
          name: center.name,
          totalMembers: center.participantCount,
          averageScore: center.averageScore.toFixed(2),
          totalSessions: center.totalSessions,
        })),
        recentEvaluations: formattedRecentEvaluations,
        activityDistribution,
        topCentersHappiness: topCentersHappiness.map((center) => ({
          name: center.name,
          average: center.averageScore,
        })),
        bottomCentersHappiness: bottomCentersHappiness.map((center) => ({
          name: center.name,
          average: center.averageScore,
        })),
        topCentersDomains: topCentersDomains.map((center) => ({
          name: center.name,
          average: center.averageScore,
        })),
        bottomCentersDomains: bottomCentersDomains.map((center) => ({
          name: center.name,
          average: center.averageScore,
        })),
        topMembersHappiness: topMembersHappiness.map((member) => ({
          name: member.name,
          center: member.center,
          average: member.averageScore,
        })),
        bottomMembersHappiness: bottomMembersHappiness.map((member) => ({
          name: member.name,
          center: member.center,
          average: member.averageScore,
        })),
        topMembersDomains: topPerformers.map((member) => ({
          name: member.name,
          center: member.center,
          average: member.averageScore,
        })),
        bottomMembersDomains: bottomPerformers.map((member) => ({
          name: member.name,
          center: member.center,
          average: member.averageScore,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getDashboardStats,
};
