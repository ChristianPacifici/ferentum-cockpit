const { getSettings } = require('./configStore');

function authHeader(settings) {
  const token = Buffer.from(`${settings.jiraEmail}:${settings.jiraApiToken}`).toString('base64');
  return `Basic ${token}`;
}

function issueUrl(settings, key) {
  return settings.useMocks ? `${settings.mockServerUrl}/jira/browse/${key}` : `${settings.jiraBaseUrl}/browse/${key}`;
}

async function searchIssues(settings, jql, { expand } = {}) {
  const base = settings.useMocks ? `${settings.mockServerUrl}/jira` : settings.jiraBaseUrl;
  const apiVersion = settings.useMocks ? '2' : '3';
  const params = new URLSearchParams({ jql });
  if (expand) params.set('expand', expand);

  const headers = { Accept: 'application/json' };
  if (!settings.useMocks) headers.Authorization = authHeader(settings);

  const response = await fetch(`${base}/rest/api/${apiVersion}/search?${params}`, { headers });
  if (!response.ok) {
    throw new Error(`Jira API error ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function fetchJiraTodo() {
  const settings = getSettings();
  const data = await searchIssues(settings, settings.jiraJql);

  return (data.issues || []).map((issue) => ({
    key: issue.key,
    summary: issue.fields.summary,
    type: issue.fields.issuetype?.name,
    status: issue.fields.status?.name,
    priority: issue.fields.priority?.name,
    updated: issue.fields.updated,
    url: issueUrl(settings, issue.key)
  }));
}

function describeChange(author, issueKey, item) {
  const { field, fromString, toString } = item;
  if (field === 'status') return `${author} ha spostato ${issueKey} da "${fromString}" a "${toString}"`;
  if (field === 'priority') return `${author} ha cambiato la priorità di ${issueKey}: ${fromString} → ${toString}`;
  if (field === 'assignee') return `${author} ha assegnato ${issueKey} a ${toString}`;
  if (field === 'Comment') return `${author} ha commentato ${issueKey}: "${toString}"`;
  if (field === 'issue' && toString === 'created') return `${author} ha creato ${issueKey}`;
  return `${author} ha aggiornato ${field} su ${issueKey}: ${fromString ?? '—'} → ${toString ?? '—'}`;
}

function slugifyId(...parts) {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Flattens each issue's changelog histories into a single, chronological team activity feed —
// this is a simplified stand-in for what Jira's dashboard "Activity stream" gadget shows.
async function fetchJiraActivity() {
  const settings = getSettings();
  const data = await searchIssues(settings, settings.jiraTeamJql, { expand: 'changelog' });

  const events = [];
  for (const issue of data.issues || []) {
    const histories = issue.changelog?.histories || [];
    for (const history of histories) {
      const author = history.author?.displayName || 'Sconosciuto';
      for (const item of history.items || []) {
        events.push({
          id: slugifyId('jira-activity', issue.key, history.created, item.field),
          issueKey: issue.key,
          issueSummary: issue.fields.summary,
          author,
          field: item.field,
          fromString: item.fromString,
          toString: item.toString,
          timestamp: history.created,
          description: describeChange(author, issue.key, item),
          url: issueUrl(settings, issue.key)
        });
      }
    }
  }

  return events
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, settings.jiraActivityLimit);
}

// Counts open (non-Done) tickets per assignee across every project in `jiraWorkloadJql` —
// used by the "Carico di lavoro" team view.
async function fetchJiraWorkloadByAssignee() {
  const settings = getSettings();
  const data = await searchIssues(settings, settings.jiraWorkloadJql);

  const counts = {};
  for (const issue of data.issues || []) {
    const name = issue.fields.assignee?.displayName || 'Non assegnato';
    counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}

module.exports = { fetchJiraTodo, fetchJiraActivity, fetchJiraWorkloadByAssignee };
