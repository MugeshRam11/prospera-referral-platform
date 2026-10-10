import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Health API Endpoint', () => {
  it('GET /api/v1/health should return 200 with status ok and valid response structure', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toMatchObject({
      status: 'ok',
      version: '1.0.0',
    });
    expect(typeof response.body.data.uptime).toBe('number');
    expect(typeof response.body.data.environment).toBe('string');
    expect(typeof response.body.data.timestamp).toBe('string');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('GET /api/v1/unknown-endpoint should return 404 with error payload', async () => {
    const response = await request(app).get('/api/v1/unknown-endpoint');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error.message).toContain('Cannot GET /api/v1/unknown-endpoint');
  });
});
