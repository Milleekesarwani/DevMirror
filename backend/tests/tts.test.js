const request = require('supertest');
const app = require('../app');
require('./setup');

describe('TTS & Voice Synthesis Endpoint', () => {
  it('POST /api/tts/speak should validate text input', async () => {
    const res = await request(app)
      .post('/api/tts/speak')
      .send({ text: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Text is required');
  });

  it('POST /api/tts/speak should return browser fallback when no Sarvam key is provided', async () => {
    const res = await request(app)
      .post('/api/tts/speak')
      .send({ text: 'What is the trade-off of this architecture?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fallback).toBe(true);
    expect(res.body.provider).toBe('browser_tts');
  });

  it('POST /api/tts/speak should handle custom header or invalid key gracefully with fallback', async () => {
    const res = await request(app)
      .post('/api/tts/speak')
      .set('x-sarvam-key', 'mock_invalid_key')
      .send({ text: 'Explain the error handling strategy.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fallback).toBe(true);
    expect(res.body.provider).toBe('browser_tts');
  });
});
