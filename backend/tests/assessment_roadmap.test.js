const request = require('supertest');
const app = require('../app');
const Repository = require('../models/Repository');
require('./setup');

describe('Sessions 11-13: Skill-Gap Engine, Roadmap & Dashboard', () => {
  let authToken;
  let testRepo;
  let interviewId;
  let assessmentId;

  beforeEach(async () => {
    // 1. Register user
    const userRes = await request(app).post('/api/auth/register').send({
      name: 'Dana Engineer',
      email: 'dana@example.com',
      password: 'password123'
    });
    authToken = userRes.body.token;

    // 2. Create repo
    testRepo = await Repository.create({
      userId: userRes.body.user.id,
      owner: 'dana',
      repo: 'secure-node-app',
      url: 'https://github.com/dana/secure-node-app',
      commitSha: 'sha999888',
      technologies: [
        { name: 'Express', category: 'Backend' },
        { name: 'JWT', category: 'Authentication' },
        { name: 'Mongoose', category: 'Database' }
      ],
      evidence: [
        { file: 'app.js', snippet: 'const app = express();', description: 'App setup' }
      ]
    });

    // 3. Start interview
    const startRes = await request(app)
      .post('/api/interviews/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ repositoryId: testRepo._id.toString() });

    interviewId = startRes.body.interview._id;

    // 4. Finish interview to generate assessment & roadmap
    const finishRes = await request(app)
      .post(`/api/interviews/${interviewId}/finish`)
      .set('Authorization', `Bearer ${authToken}`);

    assessmentId = finishRes.body.assessment._id;
  });

  it('GET /api/assessments/:id should return skill scores, benchmarks, gaps, and evidence', async () => {
    const res = await request(app)
      .get(`/api/assessments/${assessmentId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.assessment).toBeDefined();
    expect(res.body.assessment.overallScore).toBeDefined();
    expect(res.body.assessment.targetBenchmark).toBe(75);
    expect(res.body.assessment).toHaveProperty('strengths');
    expect(res.body.assessment).toHaveProperty('weaknesses');
  });

  it('GET /api/roadmap and PATCH /api/roadmap/tasks/:id should persist completed tasks and update progress %', async () => {
    // Fetch roadmap
    const roadmapRes = await request(app)
      .get('/api/roadmap')
      .set('Authorization', `Bearer ${authToken}`);

    expect(roadmapRes.status).toBe(200);
    expect(roadmapRes.body.success).toBe(true);
    expect(roadmapRes.body.roadmap).toBeDefined();
    expect(roadmapRes.body.roadmap.tasks.length).toBeGreaterThan(0);

    const firstTask = roadmapRes.body.roadmap.tasks[0];
    expect(firstTask.status).toBe('pending');

    // Update task to completed
    const updateRes = await request(app)
      .patch(`/api/roadmap/tasks/${firstTask.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'completed' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.task.status).toBe('completed');
    expect(updateRes.body.progress).toBeGreaterThan(0);

    // Verify persistence upon reloading
    const reloadRes = await request(app)
      .get('/api/roadmap')
      .set('Authorization', `Bearer ${authToken}`);

    const updatedTask = reloadRes.body.roadmap.tasks.find(t => t.id === firstTask.id);
    expect(updatedTask.status).toBe('completed');
  });

  it('GET /api/dashboard should provide summary, chart datasets, and SkillStock trend', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
    expect(res.body.skillsChart).toBeDefined();
    expect(res.body.skillsChart.labels.length).toBeGreaterThan(0);
    expect(res.body.skillStock).toBeDefined();
    // With 1 assessment, SkillStock should indicate "Not enough history"
    expect(res.body.skillStock.status).toBe('Not enough history');
  });
});
