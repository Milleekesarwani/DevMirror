const request = require('supertest');
const app = require('../app');
const Repository = require('../models/Repository');
require('./setup');

describe('Sessions 8-10: Interview Question Generation & Rubric Evaluation', () => {
  let authToken;
  let testRepo;

  beforeEach(async () => {
    // 1. Register user
    const userRes = await request(app).post('/api/auth/register').send({
      name: 'Charlie Dev',
      email: 'charlie@example.com',
      password: 'password123'
    });
    authToken = userRes.body.token;

    // 2. Create seed repository in database
    testRepo = await Repository.create({
      userId: userRes.body.user.id,
      owner: 'charlie',
      repo: 'express-auth-api',
      url: 'https://github.com/charlie/express-auth-api',
      commitSha: 'commit_sha_12345',
      technologies: [
        { name: 'Express', category: 'Backend Framework' },
        { name: 'Mongoose', category: 'Database ORM' },
        { name: 'JWT', category: 'Authentication' },
        { name: 'Zod', category: 'Validation' }
      ],
      evidence: [
        {
          file: 'server.js',
          snippet: 'const express = require("express"); app.use(errorHandler);',
          description: 'Server entrypoint',
          category: 'config'
        },
        {
          file: 'models/User.js',
          snippet: 'const userSchema = new mongoose.Schema({ email: { type: String, required: true } });',
          description: 'User Schema',
          category: 'model'
        }
      ],
      fileTree: [{ path: 'server.js' }, { path: 'models/User.js' }]
    });
  });

  it('POST /api/interviews/start should generate 6-8 questions and HIDE rubric from client', async () => {
    const res = await request(app)
      .post('/api/interviews/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ repositoryId: testRepo._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.interview).toBeDefined();

    const questions = res.body.interview.questions;
    expect(questions.length).toBeGreaterThanOrEqual(6);
    expect(questions.length).toBeLessThanOrEqual(8);

    // Critical Security Check: Ensure rubric is NOT sent to browser
    for (const q of questions) {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('question');
      expect(q).toHaveProperty('skill');
      expect(q).toHaveProperty('sourceFile');
      expect(q).not.toHaveProperty('rubric'); // Hidden rubric guardrail
    }
  });

  it('POST /api/interviews/:id/answers should record answer and evaluate against rubric', async () => {
    // Start interview
    const startRes = await request(app)
      .post('/api/interviews/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ repositoryId: testRepo._id.toString() });

    const interviewId = startRes.body.interview._id;
    const firstQuestion = startRes.body.interview.questions[0];

    // Submit substantive answer
    const answerRes = await request(app)
      .post(`/api/interviews/${interviewId}/answers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questionId: firstQuestion.id,
        answerText: 'We register middleware sequentially using app.use(). When errors occur in async functions, we pass them via next(err) to our centralized error handler middleware to send appropriate 400 or 500 status codes.'
      });

    expect(answerRes.status).toBe(200);
    expect(answerRes.body.success).toBe(true);
    expect(answerRes.body.evaluation.score).toBeGreaterThan(0);
    expect(answerRes.body.evaluation).toHaveProperty('feedback');
  });

  it('POST /api/interviews/:id/finish should finalize interview, prevent double-finalization, and build assessment', async () => {
    // Start interview
    const startRes = await request(app)
      .post('/api/interviews/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ repositoryId: testRepo._id.toString() });

    const interviewId = startRes.body.interview._id;
    const questions = startRes.body.interview.questions;

    // Answer first question
    await request(app)
      .post(`/api/interviews/${interviewId}/answers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questionId: questions[0].id,
        answerText: 'Centralized error handling middleware intercepts next(err) and formats a uniform JSON error payload with status codes.'
      });

    // Finalize interview
    const finishRes = await request(app)
      .post(`/api/interviews/${interviewId}/finish`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(finishRes.status).toBe(200);
    expect(finishRes.body.success).toBe(true);
    expect(finishRes.body.interview.status).toBe('completed');
    expect(finishRes.body.assessment).toBeDefined();
    expect(finishRes.body.assessment.overallScore).toBeDefined();
    expect(finishRes.body.roadmap).toBeDefined();

    // Verify double-finalization prevention
    const doubleFinishRes = await request(app)
      .post(`/api/interviews/${interviewId}/finish`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(doubleFinishRes.status).toBe(200);
    expect(doubleFinishRes.body.message).toContain('already finalized');

    // Attempting to answer a finalized interview must be rejected
    const answerAfterFinish = await request(app)
      .post(`/api/interviews/${interviewId}/answers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        questionId: questions[1].id,
        answerText: 'Late answer attempt'
      });

    expect(answerAfterFinish.status).toBe(400);
    expect(answerAfterFinish.body.error).toContain('already been finalized');
  });

  it('Ownership check: User B cannot access or answer User A interview', async () => {
    // User A interview
    const startRes = await request(app)
      .post('/api/interviews/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ repositoryId: testRepo._id.toString() });

    const interviewId = startRes.body.interview._id;

    // Register User B
    const userBRes = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'password123'
    });
    const userBToken = userBRes.body.token;

    // User B tries to answer User A interview
    const res = await request(app)
      .post(`/api/interviews/${interviewId}/answers`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        questionId: 'some-id',
        answerText: 'Unauthorized answer attempt'
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('unauthorized');
  });
});
