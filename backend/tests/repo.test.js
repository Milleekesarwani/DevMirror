const request = require('supertest');
const axios = require('axios');
const app = require('../app');
require('./setup');

// Mock axios
jest.mock('axios');

describe('Sessions 6-7: GitHub Repository Analysis', () => {
  let authToken;

  beforeEach(async () => {
    // Register user to obtain auth token
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bob Tester',
      email: 'bob@example.com',
      password: 'password123'
    });
    authToken = res.body.token;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/repos/analyze should reject invalid repository URLs', async () => {
    const res = await request(app)
      .post('/api/repos/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ url: 'https://gitlab.com/user/project' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Only GitHub repositories');
  });

  it('POST /api/repos/analyze should analyze public GitHub repo and store tech & evidence', async () => {
    const mockAxiosInstance = {
      get: jest.fn()
    };
    axios.create.mockReturnValue(mockAxiosInstance);

    // Mock metadata
    mockAxiosInstance.get.mockImplementation((url) => {
      if (url === '/repos/octocat/Hello-World') {
        return Promise.resolve({
          data: {
            name: 'Hello-World',
            full_name: 'octocat/Hello-World',
            description: 'My first repo',
            default_branch: 'main',
            private: false,
            stargazers_count: 42,
            forks_count: 10,
            size: 100
          }
        });
      }
      if (url.startsWith('/repos/octocat/Hello-World/git/trees/')) {
        return Promise.resolve({
          data: {
            sha: 'abc123commitsha',
            tree: [
              { path: 'package.json', type: 'blob', size: 250 },
              { path: 'server.js', type: 'blob', size: 800 },
              { path: 'routes/api.js', type: 'blob', size: 600 }
            ]
          }
        });
      }
      if (url.includes('/contents/package.json')) {
        const pkgContent = JSON.stringify({
          dependencies: {
            express: '^4.18.2',
            mongoose: '^7.0.0',
            jsonwebtoken: '^9.0.0'
          }
        });
        return Promise.resolve({
          data: {
            content: Buffer.from(pkgContent).toString('base64')
          }
        });
      }
      if (url.includes('/contents/server.js')) {
        const serverCode = `const express = require('express');\nconst app = express();\napp.listen(3000);`;
        return Promise.resolve({
          data: {
            content: Buffer.from(serverCode).toString('base64')
          }
        });
      }
      return Promise.resolve({ data: null });
    });

    const res = await request(app)
      .post('/api/repos/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ url: 'https://github.com/octocat/Hello-World' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.repository).toBeDefined();
    expect(res.body.repository.owner).toBe('octocat');
    expect(res.body.repository.repo).toBe('Hello-World');
    expect(res.body.repository.commitSha).toBe('abc123commitsha');

    // Verify detected technologies
    const techNames = res.body.repository.technologies.map(t => t.name);
    expect(techNames).toContain('Express');
    expect(techNames).toContain('Mongoose');
    expect(techNames).toContain('JWT');

    // Verify evidence extracted
    expect(res.body.repository.evidence.length).toBeGreaterThan(0);
  });

  it('POST /api/repos/analyze should support shorthand repository format owner/repo', async () => {
    const mockAxiosInstance = {
      get: jest.fn()
    };
    axios.create.mockReturnValue(mockAxiosInstance);

    mockAxiosInstance.get.mockImplementation((url) => {
      if (url === '/repos/expressjs/express') {
        return Promise.resolve({
          data: {
            name: 'express',
            full_name: 'expressjs/express',
            description: 'Fast, unopinionated, minimalist web framework',
            default_branch: 'master',
            private: false,
            stargazers_count: 60000,
            forks_count: 12000,
            size: 5000
          }
        });
      }
      if (url.startsWith('/repos/expressjs/express/git/trees/')) {
        return Promise.resolve({
          data: {
            sha: 'master_sha_123',
            tree: [{ path: 'package.json', type: 'blob', size: 100 }]
          }
        });
      }
      if (url.includes('/contents/package.json')) {
        return Promise.resolve({
          data: {
            content: Buffer.from(JSON.stringify({ dependencies: { accepts: '1.3.8' } })).toString('base64')
          }
        });
      }
      return Promise.resolve({ data: null });
    });

    const res = await request(app)
      .post('/api/repos/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        url: 'expressjs/express'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.repository.owner).toBe('expressjs');
    expect(res.body.repository.repo).toBe('express');
  });

  it('GET /api/repos should return user repositories', async () => {
    const res = await request(app)
      .get('/api/repos')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.repositories)).toBe(true);
  });
});
