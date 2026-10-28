const request = require('supertest');
const app = require('../app');
require('./setup');

describe('Sessions 3-4: Authentication Flow & Protected Routes', () => {
  const testUser = {
    name: 'Alice Developer',
    email: 'alice@example.com',
    password: 'password123',
    targetRole: 'Full Stack Developer'
  };

  it('POST /api/auth/register should register a new user and set HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user).not.toHaveProperty('passwordHash');

    // Check HttpOnly cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);
  });

  it('POST /api/auth/register should reject duplicate email with HTTP 409', async () => {
    // First registration
    await request(app).post('/api/auth/register').send(testUser);

    // Duplicate attempt
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already exists');
  });

  it('POST /api/auth/register should reject invalid payload with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'A', // too short (< 2)
        email: 'not-an-email',
        password: '123' // too short (< 6)
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation Error');
    expect(res.body.details).toBeDefined();
  });

  it('POST /api/auth/login should authenticate with valid credentials', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/auth/login should reject incorrect password with HTTP 401', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid email or password');
  });

  it('GET /api/auth/me should reject unauthorized requests with HTTP 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me should return user profile when authenticated with cookie or Bearer token', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    const token = registerRes.body.token;

    // Test with Bearer token
    const resBearer = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(resBearer.status).toBe(200);
    expect(resBearer.body.success).toBe(true);
    expect(resBearer.body.user.name).toBe(testUser.name);

    // Test with Cookie
    const cookie = registerRes.headers['set-cookie'][0];
    const resCookie = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(resCookie.status).toBe(200);
    expect(resCookie.body.user.email).toBe(testUser.email);
  });

  it('POST /api/auth/logout should clear the token cookie', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const cookies = res.headers['set-cookie'];
    expect(cookies[0]).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('Protected resource routes should reject signed-out requests with HTTP 401', async () => {
    const repoRes = await request(app).get('/api/repos');
    expect(repoRes.status).toBe(401);
    expect(repoRes.body.success).toBe(false);

    const dashRes = await request(app).get('/api/dashboard');
    expect(dashRes.status).toBe(401);
    expect(dashRes.body.success).toBe(false);

    const roadRes = await request(app).get('/api/roadmap');
    expect(roadRes.status).toBe(401);
    expect(roadRes.body.success).toBe(false);

    const assessRes = await request(app).get('/api/assessments');
    expect(assessRes.status).toBe(401);
    expect(assessRes.body.success).toBe(false);
  });

  it('Expired JWT token should be rejected with HTTP 401', async () => {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_unit_tests_32chars';
    // Create token expired 1 hour ago
    const expiredToken = jwt.sign({ id: '507f1f77bcf86cd799439011' }, secret, { expiresIn: '-1h' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('Malformed JWT token should be rejected with HTTP 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer totally.invalid.jwttoken');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid/i);
  });
});
