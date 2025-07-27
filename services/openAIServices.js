const { OpenAI } = require("openai");

const generateCohortSummary = async (reportData) => {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Data sanitization function
    const sanitizeScores = (data) => {
      return data.map((item) => {
        // Handle domain scores
        if (item.centerAverage) {
          return {
            ...item,
            centerAverage:
              typeof item.centerAverage === "string"
                ? parseFloat(item.centerAverage)
                : item.centerAverage,
          };
        }
        // Handle participant scores
        if (item.score) {
          return {
            ...item,
            score:
              typeof item.score === "string"
                ? parseFloat(item.score)
                : item.score,
          };
        }
        return item;
      });
    };

    // Create sanitized data copy
    const safeData = {
      ...reportData,
      graphDetails: sanitizeScores(reportData.graphDetails),
      participantDomainScores: sanitizeScores(
        reportData.participantDomainScores
      ),
    };

    // Calculate metrics with safeguards
    const overallScore =
      typeof safeData.averageForCohort === "string"
        ? parseFloat(safeData.averageForCohort)
        : safeData.averageForCohort;

    const attendanceRate = Math.round(
      (safeData.attendance / safeData.totalAttendance) * 100
    );

    // Performance rating system
    const getPerformanceRating = (score) => {
      if (typeof score !== "number") return "Not Rated";
      if (score >= 6) return "Excellent";
      if (score >= 5) return "Strong";
      if (score >= 4) return "Moderate";
      return "Needs Improvement";
    };

    // Sort domains safely
    const sortDomains = (domains) => {
      return [...domains].sort((a, b) => {
        const aVal = typeof a.centerAverage === "number" ? a.centerAverage : 0;
        const bVal = typeof b.centerAverage === "number" ? b.centerAverage : 0;
        return bVal - aVal;
      });
    };

    const sortedDomains = sortDomains(safeData.graphDetails);
    const topDomains = sortedDomains.slice(0, 3);
    const improvementDomains = sortedDomains.slice(-3).reverse();

    // Demographic processing
    const getLargestGroup = (data, field) => {
      if (!Array.isArray(data)) return "N/A";
      const sorted = [...data].sort((a, b) => b.count - a.count);
      return sorted[0] ? sorted[0][field] : "N/A";
    };

    // Construct prompt with type checks
    const prompt = `
  As a senior wellness analyst for Happy2Age, generate a comprehensive center performance report:
  
  CENTER PERFORMANCE SNAPSHOT:
  - Center: ${safeData.cohort || "Unnamed Center"}
  - Overall Score: ${overallScore}/7 (${Math.round((overallScore / 7) * 100)}%)
  - Performance Rating: ${getPerformanceRating(overallScore)}
  - Attendance: ${attendanceRate}% (${safeData.attendance}/${
      safeData.totalAttendance
    } sessions)
  - Participants: ${safeData.participantDomainScores?.length || 0} seniors
  
  DOMAIN PERFORMANCE:
  ${safeData.graphDetails
    .map((d) => {
      const score =
        typeof d.centerAverage === "number"
          ? d.centerAverage.toFixed(1)
          : "N/A";
      return `• ${d.domainName}: ${score}/7`;
    })
    .join("\n")}
  
  DEMOGRAPHIC INSIGHTS:
  - Largest Age Group: ${getLargestGroup(safeData.ageData, "ageRange")}
  - Gender Distribution: ${
    safeData.genderData?.map((g) => `${g.count} ${g.gender}`).join(", ") ||
    "N/A"
  }
  - Participant Types: ${
    safeData.participantTypeData
      ?.map((t) => `${t.count} ${t.participantType}`)
      .join(", ") || "N/A"
  }
  
  ANALYSIS INSTRUCTIONS:
  1. Start with overall center performance assessment
  2. Explain what the ${overallScore}/7 score means for elderly wellness
  3. Highlight top 3 domains and bottom 2 domains
  4. Discuss attendance impact on outcomes
  5. Note demographic patterns
  6. Provide 3 specific activity enhancement suggestions
  7. End with an encouraging outlook
  
  OUTPUT REQUIREMENTS:
  - Maximum 50 words: Summary, Strengths, Opportunities, Recommendations (Dont give heading)
  - Professional yet warm tone for elderly audience
  - Reference "vitality", "engagement", and "quality of life"
  - Avoid medical advice
  - Include percentage equivalents for scores`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 650,
      temperature: 0.3,
      top_p: 0.85,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Happy2Age Summary Error:", error);
    return "We're enhancing our reporting features. Please check back later for AI-powered summaries!";
  }
};

const generateIndividualSummary = async (reportData) => {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Process evaluation data to track progress over time
    const processEvaluations = (evaluations) => {
      const domainProgress = {};
      const participant = evaluations[0]?.participant;
      const cohort = evaluations[0]?.cohort;

      // Sort evaluations by date
      const sortedEvaluations = [...evaluations].sort(
        (a, b) => new Date(a.session.date) - new Date(b.session.date)
      );

      sortedEvaluations.forEach((evaluation) => {
        const sessionDate = evaluation.session.date;

        evaluation.domain.forEach((domain) => {
          if (!domainProgress[domain.name]) {
            domainProgress[domain.name] = {
              scores: [],
              observations: [],
            };
          }

          domainProgress[domain.name].scores.push({
            date: sessionDate,
            score: parseFloat(domain.average),
            session: evaluation.session.name,
          });

          // Add observation if it exists
          if (domain.observation) {
            domainProgress[domain.name].observations.push({
              date: sessionDate,
              observation: domain.observation,
              session: evaluation.session.name,
            });
          }
        });
      });

      return {
        domainProgress,
        participant,
        cohort,
        totalSessions: sortedEvaluations.length,
        firstSession: sortedEvaluations[0]?.session.date,
        lastSession:
          sortedEvaluations[sortedEvaluations.length - 1]?.session.date,
      };
    };

    // Analyze trends for each domain
    const analyzeTrends = (domainProgress) => {
      const trends = {};

      Object.entries(domainProgress).forEach(([domain, data]) => {
        const scores = data.scores;
        if (scores.length < 2) {
          trends[domain] = "insufficient data";
          return;
        }

        const firstScore = scores[0].score;
        const lastScore = scores[scores.length - 1].score;
        const scoreDiff = lastScore - firstScore;
        const averageScore =
          scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

        // Calculate consistency (standard deviation)
        const variance =
          scores.reduce(
            (sum, s) => sum + Math.pow(s.score - averageScore, 2),
            0
          ) / scores.length;
        const stdDev = Math.sqrt(variance);

        // Determine trend
        let trend = "stable";
        if (scoreDiff > 0.5) trend = "improving";
        else if (scoreDiff < -0.5) trend = "declining";

        // Check for consistency
        const isConsistent = stdDev < 1;

        // Process observations
        const observations = data.observations.map((obs) => ({
          date: obs.date,
          observation: obs.observation,
          session: obs.session,
        }));

        trends[domain] = {
          trend,
          consistency: isConsistent ? "consistent" : "fluctuating",
          averageScore: averageScore.toFixed(1),
          firstScore: firstScore.toFixed(1),
          lastScore: lastScore.toFixed(1),
          sessions: scores.length,
          stdDev: stdDev.toFixed(2),
          observations,
        };
      });

      return trends;
    };

    // Process the evaluations
    const {
      domainProgress,
      participant,
      cohort,
      totalSessions,
      firstSession,
      lastSession,
    } = processEvaluations(reportData.evaluations);
    const domainTrends = analyzeTrends(domainProgress);

    // Construct prompt with detailed analysis
    const prompt = `
    As a senior wellness analyst for Happy2Age, generate a detailed participant performance analysis:
  
  PARTICIPANT OVERVIEW:
    - Name: ${participant?.name || "Valued Participant"}
    - Center: ${cohort?.name || "Unknown Center"}
    - Period: ${new Date(firstSession).toLocaleDateString()} to ${new Date(
      lastSession
    ).toLocaleDateString()}
    - Total Sessions: ${totalSessions}
    
    DOMAIN PERFORMANCE ANALYSIS:
    ${Object.entries(domainTrends)
      .map(([domain, data]) => {
        if (data === "insufficient data") {
          return `• ${domain}: Insufficient data for analysis`;
        }

        // Format observations
        const observationSummary =
          data.observations.length > 0
            ? `\n        - Key Observations:\n${data.observations
                .map(
                  (obs) =>
                    `          * ${new Date(obs.date).toLocaleDateString()}: ${
                      obs.observation
                    }`
                )
                .join("\n")}`
            : "";

        return `• ${domain}:
        - Trend: ${data.trend}
        - Consistency: ${data.consistency}
        - Average Score: ${data.averageScore}/7
        - Progress: ${data.firstScore} to ${data.lastScore}
        - Sessions: ${data.sessions}
        - Variability: ${data.stdDev}${observationSummary}`;
      })
      .join("\n")}
  
  ANALYSIS INSTRUCTIONS:
    1. Analyze each domain's performance trend and consistency
    2. Consider the specific observations made during sessions
    3. Identify patterns of improvement or decline
    4. Note any significant fluctuations in performance
    5. Consider session attendance patterns
    6. Highlight domains showing consistent improvement
    7. Identify domains needing attention
    8. Provide specific recommendations based on trends and observations
  
  OUTPUT REQUIREMENTS:
    - Maximum 150 words: Overview, Performance Analysis, Recommendations
    - Focus on trends and patterns
    - Reference specific improvements or declines
    - Include key observations from sessions
    - Provide actionable recommendations
    - Maintain professional tone
    - Don't address the person directly in the report`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.4,
      top_p: 0.9,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Happy2Age Individual Summary Error:", error);
    return "We're enhancing our reporting features. Please check back later for personalized summaries!";
  }
};

module.exports = {
  generateCohortSummary,
  generateIndividualSummary,
};
