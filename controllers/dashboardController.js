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
      memberEvaluations,
      bottomMembers,
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
      // Get top performing members
      Evaluation.aggregate([
        {
          $lookup: {
            from: "participants",
            localField: "participant",
            foreignField: "_id",
            as: "participantDetails",
          },
        },
        {
          $lookup: {
            from: "cohorts",
            localField: "cohort",
            foreignField: "_id",
            as: "cohortDetails",
          },
        },
        {
          $unwind: "$participantDetails",
        },
        {
          $unwind: "$cohortDetails",
        },
        {
          $group: {
            _id: "$participant",
            name: { $first: "$participantDetails.name" },
            center: { $first: "$cohortDetails.name" },
            totalScore: {
              $sum: {
                $cond: {
                  if: { $isArray: "$domain" },
                  then: {
                    $reduce: {
                      input: "$domain",
                      initialValue: 0,
                      in: {
                        $add: ["$$value", { $toDouble: "$$this.average" }],
                      },
                    },
                  },
                  else: 0,
                },
              },
            },
            totalSessions: { $sum: 1 },
            domainCount: {
              $sum: {
                $cond: {
                  if: { $isArray: "$domain" },
                  then: { $size: "$domain" },
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            center: 1,
            averageScore: {
              $cond: {
                if: { $eq: ["$domainCount", 0] },
                then: 0,
                else: {
                  $divide: [
                    "$totalScore",
                    { $multiply: ["$totalSessions", "$domainCount"] },
                  ],
                },
              },
            },
            totalSessions: 1,
          },
        },
        {
          $sort: { averageScore: -1 },
        },
        {
          $limit: 3,
        },
      ]),
      // Get bottom performing members
      Evaluation.aggregate([
        {
          $lookup: {
            from: "participants",
            localField: "participant",
            foreignField: "_id",
            as: "participantDetails",
          },
        },
        {
          $lookup: {
            from: "cohorts",
            localField: "cohort",
            foreignField: "_id",
            as: "cohortDetails",
          },
        },
        {
          $unwind: "$participantDetails",
        },
        {
          $unwind: "$cohortDetails",
        },
        {
          $group: {
            _id: "$participant",
            name: { $first: "$participantDetails.name" },
            center: { $first: "$cohortDetails.name" },
            totalScore: {
              $sum: {
                $cond: {
                  if: { $isArray: "$domain" },
                  then: {
                    $reduce: {
                      input: "$domain",
                      initialValue: 0,
                      in: {
                        $add: ["$$value", { $toDouble: "$$this.average" }],
                      },
                    },
                  },
                  else: 0,
                },
              },
            },
            totalSessions: { $sum: 1 },
            domainCount: {
              $sum: {
                $cond: {
                  if: { $isArray: "$domain" },
                  then: { $size: "$domain" },
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            center: 1,
            averageScore: {
              $cond: {
                if: { $eq: ["$domainCount", 0] },
                then: 0,
                else: {
                  $divide: [
                    "$totalScore",
                    { $multiply: ["$totalSessions", "$domainCount"] },
                  ],
                },
              },
            },
            totalSessions: 1,
          },
        },
        {
          $sort: { averageScore: 1 },
        },
        {
          $limit: 3,
        },
      ]),
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

    // --- HAPPINESS PARAMETER & DOMAIN AGGREGATION ---
    // Helper: get all happiness parameters from domains
    const allDomains = await Domain.find();
    const domainToHappiness = {};
    allDomains.forEach((d) => {
      if (d.name && Array.isArray(d.happinessParameter)) {
        domainToHappiness[d.name] = d.happinessParameter;
      }
    });
    // Helper: get all happiness parameters
    const allHappinessParams = Array.from(
      new Set(allDomains.flatMap((d) => d.happinessParameter || []))
    );
    // --- AGGREGATE BY CENTER ---
    const allCohorts = await Cohort.find();
    const centerHappiness = [];
    const centerDomains = [];
    for (const cohort of allCohorts) {
      const evaluations = await Evaluation.find({
        cohort: cohort._id,
      }).populate("domain");
      // Happiness param averages
      const happinessMap = {};
      const domainMap = {};
      evaluations.forEach((ev) => {
        if (Array.isArray(ev.domain)) {
          ev.domain.forEach((dom) => {
            // Domains
            if (!domainMap[dom.name]) domainMap[dom.name] = [];
            domainMap[dom.name].push(parseFloat(dom.average));
            // Happiness
            (domainToHappiness[dom.name] || []).forEach((param) => {
              if (!happinessMap[param]) happinessMap[param] = [];
              happinessMap[param].push(parseFloat(dom.average));
            });
          });
        }
      });
      // 4 happiness params: average of each, then mean of those 4
      const happinessAverages = allHappinessParams
        .map((param) => {
          const arr = happinessMap[param] || [];
          return arr.length
            ? arr.reduce((a, b) => a + b, 0) / arr.length
            : null;
        })
        .filter((v) => v !== null);
      const happinessAvg = happinessAverages.length
        ? happinessAverages.reduce((a, b) => a + b, 0) /
          happinessAverages.length
        : null;
      centerHappiness.push({ name: cohort.name, average: happinessAvg });
      // 7 domains: average of each, then mean
      const domainAverages = Object.values(domainMap)
        .map((arr) =>
          arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
        )
        .filter((v) => v !== null);
      const domainAvg = domainAverages.length
        ? domainAverages.reduce((a, b) => a + b, 0) / domainAverages.length
        : null;
      centerDomains.push({ name: cohort.name, average: domainAvg });
    }
    // --- AGGREGATE BY MEMBER ---
    const allParticipants = await Participant.find();
    const memberHappiness = [];
    const memberDomains = [];
    for (const participant of allParticipants) {
      const evaluations = await Evaluation.find({
        participant: participant._id,
      }).populate("domain");
      const happinessMap = {};
      const domainMap = {};
      evaluations.forEach((ev) => {
        if (Array.isArray(ev.domain)) {
          ev.domain.forEach((dom) => {
            // Domains
            if (!domainMap[dom.name]) domainMap[dom.name] = [];
            domainMap[dom.name].push(parseFloat(dom.average));
            // Happiness
            (domainToHappiness[dom.name] || []).forEach((param) => {
              if (!happinessMap[param]) happinessMap[param] = [];
              happinessMap[param].push(parseFloat(dom.average));
            });
          });
        }
      });
      // 4 happiness params: average of each, then mean
      const happinessAverages = allHappinessParams
        .map((param) => {
          const arr = happinessMap[param] || [];
          return arr.length
            ? arr.reduce((a, b) => a + b, 0) / arr.length
            : null;
        })
        .filter((v) => v !== null);
      const happinessAvg = happinessAverages.length
        ? happinessAverages.reduce((a, b) => a + b, 0) /
          happinessAverages.length
        : null;
      memberHappiness.push({
        name: participant.name,
        average: happinessAvg,
        center: participant.cohort,
      });
      // 7 domains: average of each, then mean
      const domainAverages = Object.values(domainMap)
        .map((arr) =>
          arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
        )
        .filter((v) => v !== null);
      const domainAvg = domainAverages.length
        ? domainAverages.reduce((a, b) => a + b, 0) / domainAverages.length
        : null;
      memberDomains.push({
        name: participant.name,
        average: domainAvg,
        center: participant.cohort,
      });
    }
    // Sort and pick top/bottom 3 for each
    const topCentersHappiness = [...centerHappiness]
      .sort((a, b) => b.average - a.average)
      .slice(0, 3);
    const bottomCentersHappiness = [...centerHappiness]
      .sort((a, b) => a.average - b.average)
      .slice(0, 3);
    const topCentersDomains = [...centerDomains]
      .sort((a, b) => b.average - a.average)
      .slice(0, 3);
    const bottomCentersDomains = [...centerDomains]
      .sort((a, b) => a.average - b.average)
      .slice(0, 3);
    const topMembersHappiness = [...memberHappiness]
      .sort((a, b) => b.average - a.average)
      .slice(0, 3);
    const bottomMembersHappiness = [...memberHappiness]
      .sort((a, b) => a.average - b.average)
      .slice(0, 3);
    const topMembersDomains = [...memberDomains]
      .sort((a, b) => b.average - a.average)
      .slice(0, 3);
    const bottomMembersDomains = [...memberDomains]
      .sort((a, b) => a.average - b.average)
      .slice(0, 3);

    // Process cohort data
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
        topPerformers: memberEvaluations.map((member) => ({
          id: member._id,
          name: member.name,
          center: member.center,
          averageScore: Math.round(member.averageScore),
          totalSessions: member.totalSessions,
        })),
        bottomPerformers: bottomMembers.map((member) => ({
          id: member._id,
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
        topCentersHappiness,
        bottomCentersHappiness,
        topCentersDomains,
        bottomCentersDomains,
        topMembersHappiness,
        bottomMembersHappiness,
        topMembersDomains,
        bottomMembersDomains,
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
