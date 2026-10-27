const { evaluateAnswerWithLLM } = require('./llmService');

/**
 * Deterministic keyword & semantic evaluation engine
 * Rubric breakdown: Correctness (0-5), Reasoning (0-3), Clarity (0-2) -> Total: 0-10
 */
const evaluateAnswerDeterministically = (questionText, rubric, userAnswer) => {
  if (!userAnswer || userAnswer.trim().length < 5) {
    return {
      score: 0,
      maxScore: rubric.maxScore || 10,
      correctness: 0,
      reasoning: 0,
      clarity: 0,
      feedback: 'No substantive answer was provided for this assessment question.',
      matchedConcepts: []
    };
  }

  const textLower = userAnswer.toLowerCase();
  const keyConcepts = rubric.keyConcepts || [];
  const matchedConcepts = [];

  // 1. Check keyword and concept coverage
  for (const concept of keyConcepts) {
    const conceptTerms = concept.toLowerCase().split(/[\s/]+/);
    const hasMatch = conceptTerms.some(term => term.length > 2 && textLower.includes(term));
    if (hasMatch) {
      matchedConcepts.push(concept);
    }
  }

  const matchRatio = keyConcepts.length > 0 ? matchedConcepts.length / keyConcepts.length : 0.5;

  // 2. Correctness score (0 to 5)
  let correctness = 0;
  if (matchRatio >= 0.8) {
    correctness = 5;
  } else if (matchRatio >= 0.6) {
    correctness = 4;
  } else if (matchRatio >= 0.4) {
    correctness = 3;
  } else if (matchRatio >= 0.2) {
    correctness = 2;
  } else if (matchedConcepts.length > 0) {
    correctness = 1;
  }

  // 3. Technical Reasoning score (0 to 3)
  // Check for causal connectors and analytical explanation
  const reasoningTerms = [
    'because',
    'in order to',
    'prevent',
    'prevents',
    'ensure',
    'ensures',
    'mitigate',
    'protect',
    'avoids',
    'tradeoff',
    'performance',
    'overhead',
    'guarantee',
    'instead of',
    'security'
  ];
  let reasoningHits = 0;
  for (const term of reasoningTerms) {
    if (textLower.includes(term)) {
      reasoningHits++;
    }
  }

  let reasoning = 0;
  if (reasoningHits >= 3 && correctness >= 2) {
    reasoning = 3;
  } else if (reasoningHits >= 1 && correctness >= 1) {
    reasoning = 2;
  } else if (reasoningHits > 0 || textLower.length > 80) {
    reasoning = 1;
  }

  // 4. Clarity & Architecture score (0 to 2)
  let clarity = 1;
  const wordCount = userAnswer.trim().split(/\s+/).length;
  if (wordCount >= 20 && /[.!?]/.test(userAnswer)) {
    clarity = 2;
  } else if (wordCount < 6) {
    clarity = 0;
  }

  const totalScore = Math.min(correctness + reasoning + clarity, rubric.maxScore || 10);

  // Construct feedback
  let feedback = '';
  if (totalScore >= 8) {
    feedback = `Strong answer! Accurately demonstrated key concepts: ${matchedConcepts.join(', ')}.`;
  } else if (totalScore >= 5) {
    const missing = keyConcepts.filter(c => !matchedConcepts.includes(c));
    feedback = `Good understanding of ${matchedConcepts.join(', ') || 'fundamentals'}. Could be strengthened by addressing: ${missing.slice(0, 2).join(', ')}.`;
  } else {
    const missing = keyConcepts.slice(0, 3);
    feedback = `Needs improvement. The response missed core concepts such as: ${missing.join(', ')}. Review this pattern in your codebase.`;
  }

  return {
    score: totalScore,
    maxScore: rubric.maxScore || 10,
    correctness,
    reasoning,
    clarity,
    feedback,
    matchedConcepts
  };
};

/**
 * Evaluate single answer using AI or deterministic engine
 */
const evaluateAnswer = async (question, rubric, userAnswer) => {
  // Try AI adapter first
  const aiResult = await evaluateAnswerWithLLM(question, rubric, userAnswer);
  if (aiResult) {
    return {
      score: aiResult.score,
      maxScore: rubric.maxScore || 10,
      correctness: aiResult.correctness,
      reasoning: aiResult.reasoning,
      clarity: aiResult.clarity,
      feedback: aiResult.feedback,
      matchedConcepts: aiResult.matchedConcepts || []
    };
  }

  // Fallback to deterministic rubric evaluation
  return evaluateAnswerDeterministically(question, rubric, userAnswer);
};

module.exports = {
  evaluateAnswer,
  evaluateAnswerDeterministically
};
