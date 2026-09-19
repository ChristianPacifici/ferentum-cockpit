import { describe, it, expect } from 'vitest';
const request = require('supertest');
const app = require('./server');

describe('mock-server', () => {
  it('answers /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('excludes Done issues when the JQL says statusCategory != Done', async () => {
    const res = await request(app)
      .get('/jira/rest/api/2/search/jql')
      .query({ jql: 'statusCategory != Done ORDER BY updated DESC' });

    expect(res.status).toBe(200);
    expect(res.body.issues.length).toBeGreaterThan(0);
    expect(res.body.issues.every((issue) => issue.fields.status.statusCategory.key !== 'done')).toBe(true);
  });

  it('filters to the mock current user when the JQL says assignee = currentUser()', async () => {
    const res = await request(app)
      .get('/jira/rest/api/2/search/jql')
      .query({ jql: 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC' });

    expect(res.body.issues.length).toBeGreaterThan(0);
    expect(
      res.body.issues.every((issue) => issue.fields.assignee?.displayName === 'Christian Pacifici')
    ).toBe(true);
  });

  it('only includes changelog when expand=changelog is requested', async () => {
    const withoutExpand = await request(app).get('/jira/rest/api/2/search/jql').query({ jql: '' });
    const withExpand = await request(app)
      .get('/jira/rest/api/2/search/jql')
      .query({ jql: '', expand: 'changelog' });

    expect(withoutExpand.body.issues.every((issue) => issue.changelog === undefined)).toBe(true);
    expect(withExpand.body.issues.some((issue) => issue.changelog !== undefined)).toBe(true);
  });

  it('filters GitHub pulls by state', async () => {
    const res = await request(app)
      .get('/github/repos/ferentum/ferentum-blockchain/pulls')
      .query({ state: 'open' });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((pr) => pr.state === 'open')).toBe(true);
  });

  it('returns failed GitHub Actions runs for a known repo', async () => {
    const res = await request(app).get('/github/repos/ferentum/ferentum-blockchain/actions/runs');
    expect(res.status).toBe(200);
    expect(res.body.workflow_runs.length).toBeGreaterThan(0);
  });
});
