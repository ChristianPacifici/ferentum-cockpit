const express = require('express');
const { fetchJiraTodo, fetchJiraActivity } = require('../lib/jiraClient');
const { fetchActivePulls } = require('../lib/githubClient');
const { fetchFailedRuns } = require('../lib/ciClient');
const { fetchOpenIncidents } = require('../lib/pagerdutyClient');
const { fetchMentions } = require('../lib/slackClient');
const { readFlags, setFlag } = require('../lib/flagsStore');

const router = express.Router();

function withFlags(item, flagsById) {
  return { ...item, flags: flagsById[item.id] || { todo: false, star: false } };
}

// Ogni fonte è indipendente: se una fallisce (rete giù, token scaduto, API cambiata) le altre
// devono comunque caricarsi. Promise.allSettled invece di Promise.all è la parte che lo garantisce.
const SOURCES = [
  { key: 'jira-todo', label: 'Jira · Le mie attività', fetcher: fetchJiraTodo },
  { key: 'jira-activity', label: 'Jira · Attività del team', fetcher: fetchJiraActivity },
  { key: 'github-pr', label: 'GitHub · Pull request', fetcher: fetchActivePulls },
  { key: 'ci-failure', label: 'CI (GitHub Actions)', fetcher: fetchFailedRuns },
  { key: 'pagerduty-incident', label: 'PagerDuty', fetcher: fetchOpenIncidents },
  { key: 'slack-mention', label: 'Slack', fetcher: fetchMentions }
];

router.get('/', async (req, res) => {
  const settled = await Promise.allSettled(SOURCES.map((source) => source.fetcher()));

  const dataByKey = {};
  const errors = [];
  settled.forEach((result, i) => {
    const { key, label } = SOURCES[i];
    if (result.status === 'fulfilled') {
      dataByKey[key] = result.value;
    } else {
      dataByKey[key] = [];
      const message = result.reason?.message || String(result.reason);
      console.error(`[feed] ${label} non disponibile:`, message);
      errors.push({ source: key, label, message });
    }
  });

  const flagsById = readFlags();

  const items = [
    ...dataByKey['jira-todo'].map((issue) =>
      withFlags(
        {
          id: `jira-todo-${issue.key}`,
          source: 'jira-todo',
          title: issue.summary,
          label: issue.key,
          meta: [issue.status, issue.type].filter(Boolean),
          tag: issue.priority,
          timestamp: issue.updated,
          url: issue.url
        },
        flagsById
      )
    ),
    ...dataByKey['jira-activity'].map((event) =>
      withFlags(
        {
          id: event.id,
          source: 'jira-activity',
          title: event.description,
          label: event.issueKey,
          meta: [event.author],
          tag: null,
          timestamp: event.timestamp,
          url: event.url
        },
        flagsById
      )
    ),
    ...dataByKey['github-pr'].map((pr) =>
      withFlags(
        {
          id: pr.id,
          source: 'github-pr',
          title: pr.title,
          label: `${pr.repo.split('/')[1]} #${pr.number}`,
          meta: [`@${pr.author}`, ...(pr.reviewers.length ? [`review: ${pr.reviewers.join(', ')}`] : [])],
          tag: pr.draft ? 'Draft' : null,
          timestamp: pr.updatedAt,
          url: pr.url
        },
        flagsById
      )
    ),
    ...dataByKey['ci-failure'].map((run) =>
      withFlags(
        {
          id: run.id,
          source: 'ci-failure',
          title: `${run.workflowName} fallita su ${run.repo.split('/')[1]}`,
          label: run.branch,
          meta: [`@${run.actor}`],
          tag: 'Failure',
          timestamp: run.timestamp,
          url: run.url
        },
        flagsById
      )
    ),
    ...dataByKey['pagerduty-incident'].map((incident) =>
      withFlags(
        {
          id: incident.id,
          source: 'pagerduty-incident',
          title: incident.title,
          label: incident.service,
          meta: [incident.assignee, incident.status].filter(Boolean),
          tag: incident.urgency === 'high' ? 'High' : null,
          timestamp: incident.timestamp,
          url: incident.url
        },
        flagsById
      )
    ),
    ...dataByKey['slack-mention'].map((mention) =>
      withFlags(
        {
          id: mention.id,
          source: 'slack-mention',
          title: mention.text,
          label: `#${mention.channel}`,
          meta: [`@${mention.author}`],
          tag: null,
          timestamp: mention.timestamp,
          url: mention.url
        },
        flagsById
      )
    )
  ];

  items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ items, errors });
});

router.patch('/:itemId/flags', (req, res) => {
  const { itemId } = req.params;
  const { flag, value } = req.body || {};

  if (flag !== 'todo' && flag !== 'star') {
    return res.status(400).json({ error: 'flag deve essere "todo" o "star"' });
  }

  try {
    const flags = setFlag(itemId, flag, value);
    res.json({ itemId, flags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
