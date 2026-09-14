const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Bootstrap defaults come from .env — used only until the user saves something via the
// Settings page, at which point app/data/settings.json (never committed) takes over.
const ENV_DEFAULTS = {
  useMocks: (process.env.USE_MOCKS || 'true').toLowerCase() === 'true',
  mockServerUrl: process.env.MOCK_SERVER_URL || 'http://localhost:4000',
  jiraBaseUrl: process.env.JIRA_BASE_URL || '',
  jiraEmail: process.env.JIRA_EMAIL || '',
  jiraApiToken: process.env.JIRA_API_TOKEN || '',
  jiraJql: process.env.JIRA_JQL || 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC',
  jiraTeamJql: process.env.JIRA_TEAM_JQL || 'project = FER ORDER BY updated DESC',
  jiraActivityLimit: Number(process.env.JIRA_ACTIVITY_LIMIT || 10),
  // JQL per la vista "carico di lavoro": usa "project in (...)" per aggregare più board/progetti
  // contemporaneamente — un Lead segue raramente un solo progetto Jira.
  jiraWorkloadJql:
    process.env.JIRA_WORKLOAD_JQL || 'project in (FER, PLAT) AND statusCategory != Done ORDER BY updated DESC',
  // Mappa "login GitHub=Nome Jira" separata da virgola, per unire i conteggi delle due fonti per persona.
  teamDirectory:
    process.env.TEAM_DIRECTORY ||
    'christianpacifici=Christian Pacifici,elenarossi=Elena Rossi,marcobianchi=Marco Bianchi',
  githubApiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
  githubToken: process.env.GITHUB_TOKEN || '',
  githubUsername: process.env.GITHUB_USERNAME || '',
  // Elenco owner/repo separati da virgola — già multi-repo: un Lead può monitorare tutti i
  // repository del team qui, non solo i propri.
  githubRepos: process.env.GITHUB_REPOS || '',
  githubOnlyMine: (process.env.GITHUB_ONLY_MINE || 'true').toLowerCase() === 'true',

  // --- CI (riusa base URL/token GitHub: le Actions vivono sullo stesso repo) ---
  ciEnabled: (process.env.CI_ENABLED ?? 'true').toLowerCase() === 'true',

  // --- PagerDuty ---
  pagerdutyEnabled: (process.env.PAGERDUTY_ENABLED ?? 'true').toLowerCase() === 'true',
  pagerdutyBaseUrl: process.env.PAGERDUTY_BASE_URL || 'https://api.pagerduty.com',
  pagerdutyToken: process.env.PAGERDUTY_TOKEN || '',

  // --- Slack ---
  slackEnabled: (process.env.SLACK_ENABLED ?? 'true').toLowerCase() === 'true',
  slackApiUrl: process.env.SLACK_API_URL || 'https://slack.com/api',
  slackToken: process.env.SLACK_TOKEN || '',
  slackMentionQuery: process.env.SLACK_MENTION_QUERY || '@me'
};

const SECRET_FIELDS = ['jiraApiToken', 'githubToken', 'pagerdutyToken', 'slackToken'];
const BOOLEAN_FIELDS = ['useMocks', 'githubOnlyMine', 'ciEnabled', 'pagerdutyEnabled', 'slackEnabled'];
const NUMBER_FIELDS = ['jiraActivityLimit'];

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SETTINGS_FILE)) fs.writeFileSync(SETTINGS_FILE, '{}');
}

function readOverrides() {
  ensureStore();
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
}

function writeOverrides(overrides) {
  ensureStore();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(overrides, null, 2));
}

// Effective settings used by the Jira/GitHub clients: env defaults + saved overrides.
function getSettings() {
  return { ...ENV_DEFAULTS, ...readOverrides() };
}

// Settings shaped for the Settings page UI: secrets are never sent back in full, only masked.
function getPublicSettings() {
  const settings = getSettings();
  const publicSettings = { ...settings };
  for (const field of SECRET_FIELDS) {
    const value = settings[field];
    publicSettings[`${field}Set`] = Boolean(value);
    publicSettings[`${field}Masked`] = value ? `••••••${value.slice(-4)}` : '';
    delete publicSettings[field];
  }
  return publicSettings;
}

function updateSettings(partial) {
  const overrides = readOverrides();
  const next = { ...overrides };

  for (const [key, rawValue] of Object.entries(partial)) {
    if (!(key in ENV_DEFAULTS)) continue; // ignore unknown fields

    // A blank secret field means "leave the existing token untouched", not "clear it".
    if (SECRET_FIELDS.includes(key) && (rawValue === '' || rawValue === undefined || rawValue === null)) continue;

    if (BOOLEAN_FIELDS.includes(key)) {
      next[key] = Boolean(rawValue);
    } else if (NUMBER_FIELDS.includes(key)) {
      const n = Number(rawValue);
      if (!Number.isNaN(n)) next[key] = n;
    } else {
      next[key] = String(rawValue ?? '');
    }
  }

  writeOverrides(next);
  return getPublicSettings();
}

module.exports = { getSettings, getPublicSettings, updateSettings };
