const crypto = require('crypto');
const { generateQuestionsWithLLM } = require('./llmService');

/**
 * Deterministic question templates library
 */
const TEMPLATES_BY_TECH = {
  Express: [
    {
      skill: 'Express',
      difficulty: 'intermediate',
      questionPattern: (file) =>
        `In '${file}', how does your Express architecture manage middleware execution order, and how are unexpected synchronous/asynchronous errors routed to centralized error handling?`,
      rubric: {
        keyConcepts: ['middleware', 'next(err)', 'error handler', 'execution order', 'status codes'],
        expectedPoints: [
          'Explains order of app.use() registration',
          'Mentions passing errors using next(err) or async wrappers',
          'Details centralized error middleware with (err, req, res, next) signature'
        ]
      }
    },
    {
      skill: 'REST Architecture',
      difficulty: 'junior',
      questionPattern: (file) =>
        `In '${file}', what HTTP methods and response status codes are used for resource creation, updates, and error conditions, and how does your API ensure predictable JSON payloads?`,
      rubric: {
        keyConcepts: ['status codes', '200', '201', '400', '404', '500', 'res.json'],
        expectedPoints: [
          'Correct usage of 200 OK, 201 Created, 400 Bad Request',
          'Consistent response schema (e.g. { success, data, error })'
        ]
      }
    }
  ],
  Mongoose: [
    {
      skill: 'Mongoose',
      difficulty: 'intermediate',
      questionPattern: (file) =>
        `In '${file}', how does your Mongoose schema enforce data validation and indexing, and what strategies are employed to prevent NoSQL injection or prototype pollution?`,
      rubric: {
        keyConcepts: ['schema validation', 'indexes', 'data types', 'sanitization', 'unique index'],
        expectedPoints: [
          'Mentions required, unique, and custom validator functions',
          'Explains how indexes improve query lookup performance',
          'Mentions sanitizing query keys and casting types'
        ]
      }
    }
  ],
  JWT: [
    {
      skill: 'Authentication',
      difficulty: 'senior',
      questionPattern: (file) =>
        `In '${file}', how is the JWT generated and verified across requests, and why should tokens be stored in HttpOnly cookies rather than localStorage?`,
      rubric: {
        keyConcepts: ['jwt', 'httponly', 'xss', 'csrf', 'token expiration', 'secret key'],
        expectedPoints: [
          'HttpOnly cookies prevent JavaScript access and mitigate XSS',
          'Token signature verification with secret key',
          'Proper expiration handling and token invalidation'
        ]
      }
    }
  ],
  Bcrypt: [
    {
      skill: 'Security',
      difficulty: 'intermediate',
      questionPattern: (file) =>
        `In '${file}', why is password hashing performed with a salt factor using bcrypt/bcryptjs, and why are plain text passwords never persisted or logged?`,
      rubric: {
        keyConcepts: ['bcrypt', 'salt', 'rainbow table', 'hashing', 'work factor'],
        expectedPoints: [
          'Salting defends against precomputed rainbow table attacks',
          'Adaptive cost/work factor slows brute-force attacks',
          'Passwords must be strictly excluded from queries and logs'
        ]
      }
    }
  ],
  Zod: [
    {
      skill: 'Validation',
      difficulty: 'junior',
      questionPattern: (file) =>
        `In '${file}', how does input validation with Zod protect downstream database queries and controller logic from unexpected or malicious inputs?`,
      rubric: {
        keyConcepts: ['schema', 'type safety', 'parse', '400 bad request', 'sanitization'],
        expectedPoints: [
          'Validates request shape and field types at API boundary',
          'Rejects invalid payloads before hitting business logic',
          'Formats user-friendly validation error messages'
        ]
      }
    }
  ],
  Testing: [
    {
      skill: 'Testing',
      difficulty: 'intermediate',
      questionPattern: (file) =>
        `In '${file}', how do your automated tests isolate the system under test from external dependencies like databases or third-party HTTP APIs?`,
      rubric: {
        keyConcepts: ['supertest', 'mock', 'in-memory db', 'isolation', 'assertions'],
        expectedPoints: [
          'Uses mocked network adapters or in-memory databases',
          'Ensures tests are deterministic and do not leave side effects',
          'Tests happy path, validation errors, and unauthorized access'
        ]
      }
    }
  ]
};

/**
 * Fallback questions if specific technologies are minimal
 */
const GENERAL_QUESTIONS = [
  {
    skill: 'Node.js',
    difficulty: 'intermediate',
    questionPattern: (file) =>
      `Examining '${file}', how does the Node.js event loop handle asynchronous I/O operations, and how does your code prevent blocking the main event thread?`,
    rubric: {
      keyConcepts: ['event loop', 'async/await', 'promises', 'non-blocking', 'call stack'],
      expectedPoints: [
        'Non-blocking I/O delegates file/network operations to libuv',
        'Use of async/await or promises instead of synchronous blocking functions'
      ]
    }
  },
  {
    skill: 'Code Organization',
    difficulty: 'junior',
    questionPattern: (file) =>
      `In '${file}', how is the separation of concerns maintained between configuration, routing, and data access logic?`,
    rubric: {
      keyConcepts: ['separation of concerns', 'modularity', 'routes', 'controllers', 'maintainability'],
      expectedPoints: [
        'Decoupling business logic from HTTP routing and database queries',
        'Improves testability, readability, and code reuse'
      ]
    }
  },
  {
    skill: 'REST Architecture',
    difficulty: 'intermediate',
    questionPattern: (file) =>
      `In '${file}', how are HTTP response codes, error payloads, and endpoint routes structured to ensure predictable API behavior?`,
    rubric: {
      keyConcepts: ['status codes', 'error handling', 'REST conventions', 'idempotency'],
      expectedPoints: [
        'Correct usage of 200, 201, 400, 404, 500 status codes',
        'Consistent JSON envelope structure for client consumers'
      ]
    }
  },
  {
    skill: 'Security',
    difficulty: 'senior',
    questionPattern: (file) =>
      `Reviewing '${file}', what security safeguards are implemented to protect against unauthorized access, input tampering, and sensitive credential leakage?`,
    rubric: {
      keyConcepts: ['authentication', 'sanitization', 'environment variables', 'least privilege'],
      expectedPoints: [
        'Protecting secrets and avoiding hardcoded credentials',
        'Sanitizing user inputs before processing or persistence'
      ]
    }
  },
  {
    skill: 'Performance',
    difficulty: 'intermediate',
    questionPattern: (file) =>
      `Looking at '${file}', what caching, indexing, or memory optimization strategies would you apply to keep response latency low under heavy traffic?`,
    rubric: {
      keyConcepts: ['caching', 'indexing', 'memory leaks', 'throughput', 'optimization'],
      expectedPoints: [
        'Utilizing caching layers (e.g. Redis or in-memory caches)',
        'Optimizing data queries and avoiding redundant compute'
      ]
    }
  },
  {
    skill: 'Testing',
    difficulty: 'intermediate',
    questionPattern: (file) =>
      `Regarding '${file}', what approach would you take to author automated integration tests that verify business logic without mutating production data?`,
    rubric: {
      keyConcepts: ['mocking', 'test suites', 'isolation', 'assertions', 'ci/cd'],
      expectedPoints: [
        'Isolating tests with mock data stores or ephemeral fixtures',
        'Testing both standard success cases and error boundary states'
      ]
    }
  },
  {
    skill: 'Error Handling',
    difficulty: 'junior',
    questionPattern: (file) =>
      `In '${file}', how are unexpected exceptions and unhandled promise rejections intercepted so the application fails gracefully without crashing?`,
    rubric: {
      keyConcepts: ['try/catch', 'unhandled rejection', 'error middleware', 'logging'],
      expectedPoints: [
        'Graceful recovery and consistent client error notification',
        'Logging error context for debugging and observability'
      ]
    }
  }
];

/**
 * Generate 6-8 project-specific questions grounded in analyzed repository snapshot
 */
const generateInterviewQuestions = async (repository) => {
  const verifiedFiles = (repository.evidence || [])
    .map(e => e.file)
    .concat((repository.fileTree || []).map(f => f.path))
    .filter(Boolean);

  const fallbackFile = verifiedFiles[0] || 'package.json';

  // Attempt AI generation if API key is provided
  const aiQuestions = await generateQuestionsWithLLM(repository, repository.evidence || []);
  if (aiQuestions && aiQuestions.length >= 5) {
    return aiQuestions.map(q => ({
      id: crypto.randomUUID(),
      skill: q.skill,
      difficulty: q.difficulty,
      question: q.question,
      sourceFile: verifiedFiles.includes(q.sourceFile) ? q.sourceFile : fallbackFile,
      rubric: {
        keyConcepts: q.rubric.keyConcepts,
        expectedPoints: q.rubric.expectedPoints,
        correctnessMax: 5,
        reasoningMax: 3,
        clarityMax: 2,
        maxScore: 10
      }
    }));
  }

  // Deterministic question engine
  const questions = [];
  const techNames = (repository.technologies || []).map(t => t.name.toLowerCase());
  const evidenceFiles = (repository.evidence || []).map(e => e.file);

  // Helper to find relevant file for a tech
  const getRelevantFile = (category, defaultFile) => {
    const match = evidenceFiles.find(f => f.toLowerCase().includes(category.toLowerCase()));
    return match || defaultFile || fallbackFile;
  };

  // Add questions based on detected technologies
  for (const [techKey, templates] of Object.entries(TEMPLATES_BY_TECH)) {
    const isDetected = techNames.some(t => t.includes(techKey.toLowerCase()));
    if (isDetected) {
      for (const tpl of templates) {
        const file = getRelevantFile(tpl.skill, fallbackFile);
        questions.push({
          id: crypto.randomUUID(),
          skill: tpl.skill,
          difficulty: tpl.difficulty,
          question: tpl.questionPattern(file),
          sourceFile: file,
          rubric: {
            ...tpl.rubric,
            correctnessMax: 5,
            reasoningMax: 3,
            clarityMax: 2,
            maxScore: 10
          }
        });
      }
    }
  }

  // Ensure between 6 and 8 questions by pulling from general templates
  let generalIdx = 0;
  while (questions.length < 6 && generalIdx < GENERAL_QUESTIONS.length) {
    const tpl = GENERAL_QUESTIONS[generalIdx];
    const file = getRelevantFile('config', fallbackFile);
    questions.push({
      id: crypto.randomUUID(),
      skill: tpl.skill,
      difficulty: tpl.difficulty,
      question: tpl.questionPattern(file),
      sourceFile: file,
      rubric: {
        ...tpl.rubric,
        correctnessMax: 5,
        reasoningMax: 3,
        clarityMax: 2,
        maxScore: 10
      }
    });
    generalIdx++;
  }

  // Cap at 8 questions
  return questions.slice(0, 8);
};

module.exports = {
  generateInterviewQuestions
};
