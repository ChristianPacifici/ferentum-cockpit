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
  try {
    const settings = getSettings();
    const directory = parseDirectory(settings.teamDirectory);

    const [jiraCounts, githubCounts] = await Promise.all([
      fetchJiraWorkloadByAssignee(),
      fetchOpenPullCountsByAuthor()
    ]);

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

    res.json({ people });
  } catch (err) {
    console.error('[workload] failed to build workload view:', err.message);
    res.status(502).json({ error: 'Impossibile calcolare il carico di lavoro', details: err.message });
  }
});

module.exports = router;
