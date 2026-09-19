const express = require('express');
const { fetchJiraWorkloadByAssignee } = require('../lib/jiraClient');
const { fetchOpenPullCountsByAuthor } = require('../lib/githubClient');
const { getSettings } = require('../lib/configStore');

const router = express.Router();

function parseDirectory(raw) {
  const map = {};
  (raw || '').split(',').forEach((pair) => {
    const [login, name] = pair.split('=').map((s) => s?.trim());
    if (login && name) map[login] = name;
  });
  return map;
}

router.get('/', async (req, res) => {
  const settings = getSettings();
  const directory = parseDirectory(settings.teamDirectory);

  // Se Jira o GitHub non rispondono, l'altra fonte deve comunque popolare la vista
  // (parziale è meglio di vuota) — da qui Promise.allSettled invece di Promise.all.
  const [jiraResult, githubResult] = await Promise.allSettled([
    fetchJiraWorkloadByAssignee(),
    fetchOpenPullCountsByAuthor()
  ]);

  const errors = [];
  if (jiraResult.status === 'rejected') {
    const message = jiraResult.reason?.message || String(jiraResult.reason);
    console.error('[workload] Jira non disponibile:', message);
    errors.push({ source: 'jira-todo', label: 'Jira', message });
  }
  if (githubResult.status === 'rejected') {
    const message = githubResult.reason?.message || String(githubResult.reason);
    console.error('[workload] GitHub non disponibile:', message);
    errors.push({ source: 'github-pr', label: 'GitHub', message });
  }

  const jiraCounts = jiraResult.status === 'fulfilled' ? jiraResult.value : {};
  const githubCounts = githubResult.status === 'fulfilled' ? githubResult.value : {};

  const byName = {};
  const ensure = (name) => {
    if (!byName[name]) byName[name] = { name, openTickets: 0, openPullRequests: 0 };
    return byName[name];
  };

  for (const [name, count] of Object.entries(jiraCounts)) {
    ensure(name).openTickets = count;
  }
  for (const [login, count] of Object.entries(githubCounts)) {
    ensure(directory[login] || login).openPullRequests = count;
  }

  const people = Object.values(byName)
    .map((p) => ({ ...p, total: p.openTickets + p.openPullRequests }))
    .sort((a, b) => b.total - a.total);

  res.json({ people, errors });
});

module.exports = router;
