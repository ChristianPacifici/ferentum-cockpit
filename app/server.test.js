import { describe, it, expect } from 'vitest';
const request = require('supertest');
const app = require('./server');

describe('app server', () => {
  it('answers /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('answers /api/config', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.appName).toBe('Ferentum Cockpit');
    expect(typeof res.body.useMocks).toBe('boolean');
  });

  it('serves the dashboard static page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });
});
