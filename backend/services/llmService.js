const axios = require('axios');
const { z } = require('zod');

// Schema for validated question from LLM
const llmQuestionsSchema = z.array(
  z.object({
    skill: z.string().min(1),
    difficulty: z.enum(['junior', 'intermediate', 'senior']),
    question: z.string().min(10),
    sourceFile: z.string().min(1),
    rubric: z.object({
      keyConcepts: z.array(z.string()).min(1),
      expectedPoints: z.array(z.string()).min(1),
      maxScore: z.number().default(10)
    })
  })
).min(1);

// Schema for evaluation feedback from LLM
const llmEvaluationSchema = z.object({
  score: z.number().min(0).max(10),
  correctness: z.number().min(0).max(5),
  reasoning: z.number().min(0).max(3),
  clarity: z.number().min(0).max(2),
  feedback: z.string().min(5),
  matchedConcepts: z.array(z.string()).default([])
});

/**
 * Sanitizes code snippets to prevent prompt injection and remove secrets
 */
const sanitizeSnippet = (code) => {
  if (!code) return '';
  return code
    .replace(/(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]+['"]/gi, '$1: "[REDACTED]"')
    .slice(0, 1500); // Limit snippet length to conserve tokens
};

/**
 * Call Google Gemini API (Free tier)
 */
const callGemini = async (prompt, systemInstruction = '') => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction ? systemInstruction + '\n\n' : ''}${prompt}` }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    };

    const res = await axios.post(url, payload, { timeout: 15000 });
    const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;
    return JSON.parse(rawText);
  } catch (err) {
    console.warn('[LLMService] Gemini API call skipped/failed:', err.response?.data?.error?.message || err.message);
    return null;
  }
};

/**
 * Call Anthropic API (Claude) if configured
 */
const callAnthropic = async (prompt, systemInstruction = '') => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;

  try {
    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        temperature: 0.2,
        system: systemInstruction || 'You are an expert technical interviewer. Return only strict JSON matching schema.',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 15000
      }
    );

    const rawText = res.data?.content?.[0]?.text;
    if (!rawText) return null;
    const jsonMatch = rawText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(rawText);
  } catch (err) {
    console.warn('[LLMService] Anthropic API call failed:', err.response?.data?.error?.message || err.message);
    return null;
  }
};

/**
 * Generate questions using available LLM (Gemini or Anthropic) or return null for deterministic fallback
 */
const generateQuestionsWithLLM = async (repoDetails, evidenceList) => {
  // If no AI key configured, immediately return null for deterministic engine
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const prompt = `
Generate 6-8 technical assessment questions grounded strictly in the verified code files and detected technologies of this repository.

Repository: ${repoDetails.owner}/${repoDetails.repo}
Detected Technologies: ${repoDetails.technologies.map(t => t.name).join(', ')}

Available Evidence Files:
${evidenceList.map(e => `File: ${e.file}\nSnippet:\n${sanitizeSnippet(e.snippet)}\n`).join('\n---\n')}

Respond with a JSON array where each object has:
- "skill": (e.g. Express, Mongoose, JWT, React, REST Architecture, Error Handling)
- "difficulty": "junior" | "intermediate" | "senior"
- "question": specific scenario or architectural question referencing the file and design
- "sourceFile": must be one of the files provided in the evidence above
- "rubric": { "keyConcepts": ["concept1", "concept2"], "expectedPoints": ["point1", "point2"], "maxScore": 10 }
`;

  try {
    let result = await callGemini(prompt, 'You are an objective technical interviewer. Output valid JSON array only.');
    if (!result) {
      result = await callAnthropic(prompt);
    }
    if (!result) return null;

    const validated = llmQuestionsSchema.safeParse(result);
    if (!validated.success) {
      console.warn('[LLMService] LLM question output failed schema validation. Falling back to templates.');
      return null;
    }

    // Ensure all sourceFiles exist in the evidence
    const validFiles = new Set(evidenceList.map(e => e.file));
    const filtered = validated.data.filter(q => validFiles.has(q.sourceFile));
    return filtered.length >= 4 ? filtered : null;
  } catch (err) {
    console.warn('[LLMService] Error during LLM question generation:', err.message);
    return null;
  }
};

/**
 * Evaluate answer using LLM or return null for deterministic keyword evaluation
 */
const evaluateAnswerWithLLM = async (question, rubric, userAnswer) => {
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  if (!userAnswer || userAnswer.trim().length === 0) {
    return {
      score: 0,
      correctness: 0,
      reasoning: 0,
      clarity: 0,
      feedback: 'No answer was provided.',
      matchedConcepts: []
    };
  }

  const prompt = `
Evaluate the following candidate answer according to the rubric:

Question: ${question}
Rubric Key Concepts: ${rubric.keyConcepts?.join(', ')}
Rubric Expected Points: ${rubric.expectedPoints?.join(', ')}
Candidate Answer: "${userAnswer}"

Grade objectively on:
- correctness: 0-5
- reasoning: 0-3
- clarity: 0-2
Total score = correctness + reasoning + clarity (0-10).

Return strict JSON object:
{
  "score": number,
  "correctness": number,
  "reasoning": number,
  "clarity": number,
  "feedback": "constructive 1-2 sentence feedback",
  "matchedConcepts": ["concepts mentioned by candidate"]
}
`;

  try {
    let result = await callGemini(prompt, 'You are an objective code reviewer and evaluator. Return only JSON.');
    if (!result) {
      result = await callAnthropic(prompt);
    }
    if (!result) return null;

    const validated = llmEvaluationSchema.safeParse(result);
    return validated.success ? validated.data : null;
  } catch (e) {
    return null;
  }
};

module.exports = {
  generateQuestionsWithLLM,
  evaluateAnswerWithLLM,
  sanitizeSnippet
};
