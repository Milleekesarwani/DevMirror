const crypto = require('crypto');

/**
 * Curated catalog of developer learning tasks with defined prerequisite graph (DAG)
 */
const CURATED_LEARNING_CATALOG = {
  js_fundamentals: {
    id: 'js_fundamentals',
    skill: 'Node.js',
    title: 'Modern JavaScript Asynchrony & Event Loop',
    description: 'Master async/await, promise combinators, microtask vs macrotask queue, and non-blocking I/O execution.',
    prerequisites: [],
    resources: [
      { title: 'MDN: JavaScript Asynchronous Programming', url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous' },
      { title: 'Node.js Event Loop Guide', url: 'https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick' }
    ]
  },
  node_basics: {
    id: 'node_basics',
    skill: 'Node.js',
    title: 'Node.js Core Architecture & Process Lifecycle',
    description: 'Understand stream processing, process signals (SIGINT, SIGTERM), and robust error event propagation.',
    prerequisites: ['js_fundamentals'],
    resources: [
      { title: 'Node.js Official Documentation', url: 'https://nodejs.org/docs/latest/api/' }
    ]
  },
  express_routing: {
    id: 'express_routing',
    skill: 'Express',
    title: 'Express Routing & Middleware Architecture',
    description: 'Structure scalable router trees, implement modular middleware pipelines, and manage central error handling.',
    prerequisites: ['node_basics'],
    resources: [
      { title: 'Express Routing Guide', url: 'https://expressjs.com/en/guide/routing.html' },
      { title: 'Using Express Middleware', url: 'https://expressjs.com/en/guide/using-middleware.html' }
    ]
  },
  rest_api_design: {
    id: 'rest_api_design',
    skill: 'REST Architecture',
    title: 'RESTful API Design & HTTP Status Conventions',
    description: 'Design uniform JSON contracts, correct status codes (200, 201, 400, 401, 403, 404, 500), and error shapes.',
    prerequisites: ['express_routing'],
    resources: [
      { title: 'REST API Best Practices', url: 'https://restfulapi.net/' }
    ]
  },
  input_validation: {
    id: 'input_validation',
    skill: 'Validation',
    title: 'Request Validation & Schema Enforcement with Zod',
    description: 'Define strict schemas to validate query params, URL routes, and JSON request bodies before hitting business logic.',
    prerequisites: ['rest_api_design'],
    resources: [
      { title: 'Zod Official Documentation', url: 'https://zod.dev/' }
    ]
  },
  jwt_auth: {
    id: 'jwt_auth',
    skill: 'Authentication',
    title: 'Secure JWT Authentication with HttpOnly Cookies',
    description: 'Implement token issuance, signature verification, automatic expiration, and defense against XSS using HttpOnly cookies.',
    prerequisites: ['rest_api_design', 'express_routing'],
    resources: [
      { title: 'OWASP: JSON Web Token Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html' },
      { title: 'JWT.io Introduction', url: 'https://jwt.io/introduction' }
    ]
  },
  security_hardening: {
    id: 'security_hardening',
    skill: 'Security',
    title: 'API Security, Helmet, CORS & Rate Limiting',
    description: 'Harden Express servers against brute force attacks, clickjacking, and cross-site scripting with Helmet, CORS, and Rate Limits.',
    prerequisites: ['jwt_auth'],
    resources: [
      { title: 'OWASP REST Security Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html' }
    ]
  },
  mongodb_basics: {
    id: 'mongodb_basics',
    skill: 'Mongoose',
    title: 'MongoDB Document Modeling Fundamentals',
    description: 'Design flexible BSON documents, embedding vs referencing tradeoffs, and relational integrity constraints.',
    prerequisites: [],
    resources: [
      { title: 'MongoDB Data Modeling Guide', url: 'https://www.mongodb.com/docs/manual/core/data-modeling-introduction/' }
    ]
  },
  mongoose_schemas: {
    id: 'mongoose_schemas',
    skill: 'Mongoose',
    title: 'Mongoose Schema Validation, Hooks & Indexes',
    description: 'Build rich Mongoose models with custom schema validators, pre-save hooks, compound indexes, and lean queries.',
    prerequisites: ['mongodb_basics'],
    resources: [
      { title: 'Mongoose Schemas Guide', url: 'https://mongoosejs.com/docs/guide.html' }
    ]
  },
  testing_jest_supertest: {
    id: 'testing_jest_supertest',
    skill: 'Testing',
    title: 'Automated Integration Testing with Jest & Supertest',
    description: 'Write deterministic integration tests for API endpoints, isolating database fixtures and mocking third-party integrations.',
    prerequisites: ['express_routing'],
    resources: [
      { title: 'Jest Testing Framework', url: 'https://jestjs.io/' },
      { title: 'Testing Express with Supertest', url: 'https://www.npmjs.com/package/supertest' }
    ]
  }
};

/**
 * Generate a personalized learning roadmap based on assessed skill gaps
 */
const generateRoadmap = (assessment) => {
  const selectedTaskKeys = new Set();
  const taskPriorities = new Map();

  const skillScores = assessment.skillScores instanceof Map
    ? Object.fromEntries(assessment.skillScores)
    : assessment.skillScores || {};

  // 1. Identify tasks related to assessed skills with gaps
  for (const [skillName, scoreInfo] of Object.entries(skillScores)) {
    if (scoreInfo.gap > 0) {
      // Find matching catalog tasks for this skill
      for (const [taskId, task] of Object.entries(CURATED_LEARNING_CATALOG)) {
        if (task.skill.toLowerCase() === skillName.toLowerCase()) {
          selectedTaskKeys.add(taskId);
          // Set priority
          const priority = scoreInfo.gap > 25 ? 'high' : 'medium';
          taskPriorities.set(taskId, priority);
        }
      }
    }
  }

  // 2. Add required prerequisite tasks to avoid gaps in foundational knowledge
  const resolvePrerequisites = (taskId) => {
    const task = CURATED_LEARNING_CATALOG[taskId];
    if (!task) return;
    for (const prereqId of task.prerequisites) {
      if (!selectedTaskKeys.has(prereqId)) {
        selectedTaskKeys.add(prereqId);
        // Prerequisites for a high priority task inherit at least medium priority
        if (!taskPriorities.has(prereqId)) {
          taskPriorities.set(prereqId, 'medium');
        }
        resolvePrerequisites(prereqId);
      }
    }
  };

  Array.from(selectedTaskKeys).forEach(resolvePrerequisites);

  // If no gaps found (e.g. 100% score), provide advanced enrichment tasks
  if (selectedTaskKeys.size === 0) {
    selectedTaskKeys.add('security_hardening');
    selectedTaskKeys.add('testing_jest_supertest');
    taskPriorities.set('security_hardening', 'low');
    taskPriorities.set('testing_jest_supertest', 'low');
  }

  // 3. Topological sorting to guarantee prerequisite ordering without cycles
  const visited = new Set();
  const visiting = new Set();
  const sortedTaskKeys = [];

  const visit = (taskId) => {
    if (visited.has(taskId)) return;
    if (visiting.has(taskId)) {
      // Cycle detected - break cycle safely
      return;
    }

    visiting.add(taskId);
    const task = CURATED_LEARNING_CATALOG[taskId];
    if (task) {
      for (const prereqId of task.prerequisites) {
        if (selectedTaskKeys.has(prereqId)) {
          visit(prereqId);
        }
      }
    }
    visiting.delete(taskId);
    visited.add(taskId);
    sortedTaskKeys.push(taskId);
  };

  selectedTaskKeys.forEach(visit);

  // Build final structured task list
  const tasks = sortedTaskKeys.map(taskId => {
    const catalogItem = CURATED_LEARNING_CATALOG[taskId];
    return {
      id: taskId,
      title: catalogItem.title,
      skill: catalogItem.skill,
      description: catalogItem.description,
      priority: taskPriorities.get(taskId) || 'medium',
      prerequisites: catalogItem.prerequisites,
      status: 'pending',
      resources: catalogItem.resources,
      completedAt: null
    };
  });

  return tasks;
};

module.exports = {
  generateRoadmap,
  CURATED_LEARNING_CATALOG
};
