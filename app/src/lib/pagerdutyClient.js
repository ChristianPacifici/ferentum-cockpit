const { getSettings } = require('./configStore');

// Mirrors GET /incidents (PagerDuty REST API v2), filtered to open incidents.
async function fetchOpenIncidents() {
  const settings = getSettings();
  if (!settings.pagerdutyEnabled) return [];

  const base = settings.useMocks ? `${settings.mockServerUrl}/pagerduty` : settings.pagerdutyBaseUrl;
  const headers = { Accept: 'application/vnd.pagerduty+json;version=2' };
  if (!settings.useMocks && settings.pagerdutyToken) {
    headers.Authorization = `Token token=${settings.pagerdutyToken}`;
  }

  const response = await fetch(`${base}/incidents?statuses[]=triggered&statuses[]=acknowledged`, { headers });
  if (!response.ok) {
    throw new Error(`PagerDuty API error ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();

  return (data.incidents || []).map((incident) => ({
    id: `pagerduty-incident-${incident.id}`,
    title: incident.title,
    status: incident.status,
    urgency: incident.urgency,
    service: incident.service?.summary,
    assignee: incident.assignments?.[0]?.assignee?.summary,
    url: incident.html_url,
    timestamp: incident.created_at
  }));
}

module.exports = { fetchOpenIncidents };
