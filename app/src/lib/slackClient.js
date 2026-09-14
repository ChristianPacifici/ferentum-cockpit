const { getSettings } = require('./configStore');

// Mirrors GET /api/search.messages (Slack Web API).
async function fetchMentions() {
  const settings = getSettings();
  if (!settings.slackEnabled) return [];

  const base = settings.useMocks ? `${settings.mockServerUrl}/slack` : settings.slackApiUrl;
  const headers = { Accept: 'application/json' };
  if (!settings.useMocks && settings.slackToken) {
    headers.Authorization = `Bearer ${settings.slackToken}`;
  }

  const params = new URLSearchParams({ query: settings.slackMentionQuery });
  const response = await fetch(`${base}/search.messages?${params}`, { headers });
  if (!response.ok) {
    throw new Error(`Slack API error ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();

  return (data.messages?.matches || []).map((msg) => ({
    id: `slack-mention-${msg.ts}`,
    text: msg.text,
    author: msg.username || msg.user,
    channel: msg.channel?.name,
    url: msg.permalink,
    timestamp: new Date(Number(msg.ts.split('.')[0]) * 1000).toISOString()
  }));
}

module.exports = { fetchMentions };
