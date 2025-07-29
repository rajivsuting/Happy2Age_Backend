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

      // Group evaluations by domain for this participant
      const participantDomainMap = {};
      evaluations.forEach((evaluation) => {
        if (Array.isArray(evaluation.domain)) {
          evaluation.domain.forEach((domain) => {
            const key = `${participant.name}-${domain.name}`;
            if (!participantDomainMap[key]) {
              participantDomainMap[key] = {
                total: 0,
                count: 0,
              };
            }
            participantDomainMap[key].total += parseFloat(domain.average || 0);
            participantDomainMap[key].count += 1;
          });
        }
      });

      // Calculate domain averages for this participant
      const domainAverages = Object.values(participantDomainMap).map(
        (entry) => entry.total / entry.count
      );

      const participantAverage =
        domainAverages.length > 0
          ? domainAverages.reduce((a, b) => a + b, 0) / domainAverages.length
          : 0;

      memberDomainScores.push({
        id: participant._id,
        name: participant.name,
        center: participant.cohort?.name || "Unknown",
        averageScore: participantAverage,
        totalSessions: evaluations.length,
      });

      // --- CALCULATE HAPPINESS PARAMETER SCORES ---
      // Build a map from domainName to all unique happinessParameters for this participant
      const participantDomainToHappiness = {};
      evaluations.forEach((evaluation) => {
        if (evaluation.domain && Array.isArray(evaluation.domain)) {
          evaluation.domain.forEach((domain) => {
            if (domain.name && domain.happinessParameter) {
              if (!participantDomainToHappiness[domain.name])
                participantDomainToHappiness[domain.name] = new Set();
              domain.happinessParameter.forEach((param) =>
                participantDomainToHappiness[domain.name].add(param)
              );
            }
          });
        }
      });

      // Calculate happiness parameter averages for this participant
      const happinessMap = {};
      const centerAverageMap = {};

      // For each domain average, map to happiness parameters
      Object.entries(participantDomainMap).forEach(([key, data]) => {
        const domainName = key.split("-")[1];
        const domainAverage = data.total / data.count;

        const params = Array.from(
          participantDomainToHappiness[domainName] || []
        );
        params.forEach((param) => {
          if (!happinessMap[param]) happinessMap[param] = [];
          if (!centerAverageMap[param]) centerAverageMap[param] = [];
          happinessMap[param].push(domainAverage);
          // For dashboard, we'll use the same domain average as center average since we're not comparing to cohort
          centerAverageMap[param].push(domainAverage);
        });
      });

      // Calculate average for each happiness parameter
      const happinessParameterAverages = Object.entries(happinessMap).map(
        ([happinessParameter, averages]) => {
          const centerAverages = centerAverageMap[happinessParameter] || [];
          return {
            happinessParameter,
            average:
              averages.length > 0
                ? averages.reduce((a, b) => a + b, 0) / averages.length
                : null,
            centerAverage:
              centerAverages.length > 0
                ? centerAverages.reduce((a, b) => a + b, 0) /
                  centerAverages.length
                : null,
          };
        }
      );

      // Calculate overall happiness score (average of all happiness parameters)
      const validHappinessAverages = happinessParameterAverages
        .map((item) => item.average)
        .filter((avg) => avg !== null);

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
    const topMembersDomains = [...memberDomainScores]
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3);
    const bottomMembersDomains = [...memberDomainScores]
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 3);

    // --- CALCULATE CENTER PERFORMANCE ---
    const allCohorts = await Cohort.find();
    const centerDomainScores = [];
    const centerHappinessScores = [];

    for (const cohort of allCohorts) {
      const evaluations = await Evaluation.find({
        cohort: cohort._id,
      }).populate("domain");

      if (!evaluations || evaluations.length === 0) continue;

      // Group evaluations by domain for this center
      const centerDomainMap = {};
      evaluations.forEach((evaluation) => {
        if (Array.isArray(evaluation.domain)) {
          evaluation.domain.forEach((domain) => {
            const key = `${cohort.name}-${domain.name}`;
            if (!centerDomainMap[key]) {
              centerDomainMap[key] = {
                total: 0,
                count: 0,
              };
            }
            centerDomainMap[key].total += parseFloat(domain.average || 0);
            centerDomainMap[key].count += 1;
          });
        }
      });

      // Calculate domain averages for this center
      const domainAverages = Object.values(centerDomainMap).map(
        (entry) => entry.total / entry.count
      );

      const centerAverage =
        domainAverages.length > 0
          ? domainAverages.reduce((a, b) => a + b, 0) / domainAverages.length
          : 0;

      centerDomainScores.push({
        name: cohort.name,
        averageScore: centerAverage,
        participantCount: cohort.participants?.length || 0,
        totalSessions: evaluations.length,
      });

      // --- CALCULATE CENTER HAPPINESS PARAMETER SCORES ---
      // Build a map from domainName to all unique happinessParameters for this center
      const centerDomainToHappiness = {};
      evaluations.forEach((evaluation) => {
        if (evaluation.domain && Array.isArray(evaluation.domain)) {
          evaluation.domain.forEach((domain) => {
            if (domain.name && domain.happinessParameter) {
              if (!centerDomainToHappiness[domain.name])
                centerDomainToHappiness[domain.name] = new Set();
              domain.happinessParameter.forEach((param) =>
                centerDomainToHappiness[domain.name].add(param)
              );
            }
          });
        }
      });

      // Calculate happiness parameter averages for this center
      const happinessMap = {};
      const centerAverageMap = {};

      // For each domain average, map to happiness parameters
      Object.entries(centerDomainMap).forEach(([key, data]) => {
        const domainName = key.split("-")[1];
        const domainAverage = data.total / data.count;

        const params = Array.from(centerDomainToHappiness[domainName] || []);
        params.forEach((param) => {
          if (!happinessMap[param]) happinessMap[param] = [];
          if (!centerAverageMap[param]) centerAverageMap[param] = [];
          happinessMap[param].push(domainAverage);
          // For dashboard centers, we'll use the same domain average as center average
          centerAverageMap[param].push(domainAverage);
        });
      });

      // Calculate average for each happiness parameter
      const happinessParameterAverages = Object.entries(happinessMap).map(
        ([happinessParameter, averages]) => {
          const centerAverages = centerAverageMap[happinessParameter] || [];
          return {
            happinessParameter,
            average:
              averages.length > 0
                ? averages.reduce((a, b) => a + b, 0) / averages.length
                : null,
            centerAverage:
              centerAverages.length > 0
                ? centerAverages.reduce((a, b) => a + b, 0) /
                  centerAverages.length
                : null,
          };
        }
      );

      // Calculate overall happiness score (average of all happiness parameters)
      const validHappinessAverages = happinessParameterAverages
        .map((item) => item.average)
        .filter((avg) => avg !== null);

      const overallHappinessScore =
        validHappinessAverages.length > 0
          ? validHappinessAverages.reduce((a, b) => a + b, 0) /
            validHappinessAverages.length
          : 0;

      centerHappinessScores.push({
        name: cohort.name,
        averageScore: overallHappinessScore,
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

    // Process cohort data for top centers (domains)
    const cohortAverages = [];
    for (const cohort of cohorts) {
      const evaluations = await Evaluation.find({ cohort: cohort._id })
        .populate("participant", "name")
        .populate("session", "date")
        .lean();

      if (!evaluations || evaluations.length === 0) continue;

      const participantDomainMap = {};
      evaluations.forEach((evaluation) => {
        if (Array.isArray(evaluation.domain)) {
          evaluation.domain.forEach((domain) => {
            const key = `${evaluation.participant.name}-${domain.name}`;
            if (!participantDomainMap[key]) {
              participantDomainMap[key] = {
                total: 0,
                count: 0,
              };
            }
            participantDomainMap[key].total += parseFloat(domain.average || 0);
            participantDomainMap[key].count += 1;
          });
        }
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
        participantCount: cohort.participantCount,
        totalSessions: evaluations.length,
      });
    }

    const sortedCohorts = cohortAverages.sort((a, b) => b.average - a.average);
    const topCenters = sortedCohorts.slice(0, 4);

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
          averageScore: Math.round(member.averageScore),
          totalSessions: member.totalSessions,
        })),
        bottomPerformers: bottomPerformers.map((member) => ({
          id: member.id,
          name: member.name,
          center: member.center,
          averageScore: Math.round(member.averageScore),
          totalSessions: member.totalSessions,
        })),
        topCenters: topCenters.map((center) => ({
          name: center.name,
          totalMembers: center.participantCount,
          averageScore: Math.round(center.average),
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
        topMembersDomains: topMembersDomains.map((member) => ({
          name: member.name,
          center: member.center,
          average: member.averageScore,
        })),
        bottomMembersDomains: bottomMembersDomains.map((member) => ({
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
