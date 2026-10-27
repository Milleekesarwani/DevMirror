const DEFAULT_TARGET_BENCHMARK = 75;

const STANDARD_SKILL_CATALOG = [
  'Express',
  'Mongoose',
  'Authentication',
  'Security',
  'REST Architecture',
  'Testing',
  'Validation',
  'Node.js'
];

/**
 * Analyze completed interview answers and calculate normalized skill scores & gaps
 */
const generateSkillAssessment = (interview, repository, targetBenchmark = DEFAULT_TARGET_BENCHMARK) => {
  const skillAggregates = {};

  // Map questions by ID for quick lookup
  const questionMap = new Map();
  for (const q of interview.questions) {
    questionMap.set(q.id, q);
  }

  const questionDetails = [];
  let totalScoreEarned = 0;
  let totalPossibleScore = 0;

  // Process each answered question
  for (const ans of interview.answers) {
    const question = questionMap.get(ans.questionId);
    if (!question) continue;

    const skill = question.skill || 'General';
    const score = ans.evaluation?.score || 0;
    const maxScore = ans.evaluation?.maxScore || 10;

    totalScoreEarned += score;
    totalPossibleScore += maxScore;

    if (!skillAggregates[skill]) {
      skillAggregates[skill] = {
        skill,
        totalScore: 0,
        totalMaxScore: 0,
        questionCount: 0
      };
    }

    skillAggregates[skill].totalScore += score;
    skillAggregates[skill].totalMaxScore += maxScore;
    skillAggregates[skill].questionCount += 1;

    questionDetails.push({
      questionId: question.id,
      question: question.question,
      skill: question.skill,
      sourceFile: question.sourceFile,
      score,
      maxScore,
      userAnswer: ans.answerText || '',
      feedback: ans.evaluation?.feedback || ''
    });
  }

  // Normalize scores to 0 - 100 and calculate gaps
  const skillScores = {};
  const assessedSkillsSet = new Set();
  const strengths = [];
  const weaknesses = [];

  for (const [skillName, data] of Object.entries(skillAggregates)) {
    assessedSkillsSet.add(skillName);
    const normalizedScore = data.totalMaxScore > 0
      ? Math.round((data.totalScore / data.totalMaxScore) * 100)
      : 0;

    const gap = Math.max(0, targetBenchmark - normalizedScore);

    let status = 'developing';
    if (gap === 0) {
      status = 'proficient';
      strengths.push(`${skillName} (Score: ${normalizedScore}%)`);
    } else if (gap > 25) {
      status = 'critical_gap';
      weaknesses.push(`${skillName} (Score: ${normalizedScore}%, Gap: ${gap}%)`);
    } else {
      weaknesses.push(`${skillName} (Score: ${normalizedScore}%, Gap: ${gap}%)`);
    }

    skillScores[skillName] = {
      skill: skillName,
      score: normalizedScore,
      questionCount: data.questionCount,
      benchmark: targetBenchmark,
      gap,
      status
    };
  }

  // Identify unassessed skills from repo technologies and catalog
  const unassessedSkills = [];
  const repoTechNames = (repository?.technologies || []).map(t => t.name);
  const potentialSkills = Array.from(new Set([...STANDARD_SKILL_CATALOG, ...repoTechNames]));

  for (const potentialSkill of potentialSkills) {
    if (!assessedSkillsSet.has(potentialSkill)) {
      unassessedSkills.push(potentialSkill);
    }
  }

  // Overall Score (0-100)
  const overallScore = totalPossibleScore > 0
    ? Math.round((totalScoreEarned / totalPossibleScore) * 100)
    : 0;

  // Generate deterministic objective summary
  let summaryFeedback = `Candidate assessed on ${assessedSkillsSet.size} core skill areas across ${questionDetails.length} repository-grounded questions. `;
  if (overallScore >= targetBenchmark) {
    summaryFeedback += `Achieved a solid overall rating of ${overallScore}%, meeting the target benchmark of ${targetBenchmark}%.`;
  } else {
    summaryFeedback += `Achieved an overall rating of ${overallScore}%. Targeted learning recommended to bridge identified gaps in: ${weaknesses.join(', ')}.`;
  }

  return {
    overallScore,
    targetBenchmark,
    skillScores,
    unassessedSkills,
    strengths,
    weaknesses,
    summaryFeedback,
    questionDetails
  };
};

module.exports = {
  generateSkillAssessment,
  DEFAULT_TARGET_BENCHMARK
};
