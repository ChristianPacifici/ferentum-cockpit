const express = require('express');
const jiraIssues = require('./data/jiraIssues.json');
const githubPulls = require('./data/githubPulls.json');
const githubWorkflowRuns = require('./data/githubWorkflowRuns.json');
const pagerdutyIncidents = require('./data/pagerdutyIncidents.json');
const slackMentions = require('./data/slackMentions.json');

const app = express();
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
  console.log(`[mock-server] ${req.method} ${req.originalUrl}`);
  next();
});

const MOCK_CURRENT_USER = 'Christian Pacifici';

// --- Jira mock: mirrors GET /rest/api/2/search/jql?jql=...&expand=changelog ---
// La vecchia GET /rest/api/2/search è stata deprecata da Atlassian a favore di questo endpoint
// (paginazione a cursore: nextPageToken/isLast invece di startAt/total).
// Applica un'interpretazione minima di alcune clausole JQL comuni così il mock si comporta come
// una ricerca filtrata reale invece di restituire sempre tutte le fixture.
// Include il campo "changelog" solo quando viene richiesto expand=changelog, come la vera Jira.
app.get('/jira/rest/api/2/search/jql', (req, res) => {
  const jql = req.query.jql || '';
  const expand = String(req.query.expand || '')
    .split(',')
    .map((s) => s.trim());
  const excludeDone = /statusCategory\s*!=\s*Done/i.test(jql);
  const onlyMine = /assignee\s*=\s*currentUser\(\)/i.test(jql);

  let issues = jiraIssues.issues;
  if (excludeDone) issues = issues.filter((issue) => issue.fields.status.statusCategory.key !== 'done');
  if (onlyMine) issues = issues.filter((issue) => issue.fields.assignee?.displayName === MOCK_CURRENT_USER);

  if (!expand.includes('changelog')) {
    issues = issues.map(({ changelog: _changelog, ...rest }) => rest);
  }

  res.json({ issues, nextPageToken: null, isLast: true });
});

// Jira "myself" endpoint, useful to mock currentUser() during local dev
app.get('/jira/rest/api/2/myself', (req, res) => {
  res.json({
    accountId: 'mock-account-id',
    displayName: 'Christian Pacifici',
    emailAddress: 'christian@pacifici.tech'
  });
});

// --- GitHub mock: mirrors GET /repos/{owner}/{repo}/pulls?state=... ---
app.get('/github/repos/:owner/:repo/pulls', (req, res) => {
  const fullName = `${req.params.owner}/${req.params.repo}`;
  const state = req.query.state || 'open';
  const all = githubPulls[fullName] || [];
  const filtered = state === 'all' ? all : all.filter((pr) => pr.state === state);
  res.json(filtered);
});

// --- GitHub Actions mock: mirrors GET /repos/{owner}/{repo}/actions/runs ---
app.get('/github/repos/:owner/:repo/actions/runs', (req, res) => {
  const fullName = `${req.params.owner}/${req.params.repo}`;
  res.json({ workflow_runs: githubWorkflowRuns[fullName] || [] });
});

// --- PagerDuty mock: mirrors GET /incidents (PagerDuty REST API v2) ---
app.get('/pagerduty/incidents', (req, res) => {
  res.json(pagerdutyIncidents);
});

// --- Slack mock: mirrors GET /api/search.messages ---
app.get('/slack/search.messages', (req, res) => {
  res.json(slackMentions);
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ferentum-cockpit-mock-server' }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Ferentum Cockpit mock server (Jira + GitHub) listening on port ${PORT}`);
    console.log(`  Jira:   http://localhost:${PORT}/jira/rest/api/2/search/jql`);
    console.log(`  GitHub: http://localhost:${PORT}/github/repos/:owner/:repo/pulls`);
  });
}

module.exports = app;
