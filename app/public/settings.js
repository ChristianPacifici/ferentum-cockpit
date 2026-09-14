const FIELD_IDS = [
  'useMocks',
  'mockServerUrl',
  'jiraBaseUrl',
  'jiraEmail',
  'jiraJql',
  'jiraTeamJql',
  'jiraActivityLimit',
  'jiraWorkloadJql',
  'githubApiUrl',
  'githubUsername',
  'githubRepos',
  'githubOnlyMine',
  'teamDirectory',
  'ciEnabled',
  'pagerdutyEnabled',
  'pagerdutyBaseUrl',
  'slackEnabled',
  'slackApiUrl',
  'slackMentionQuery'
];

const SECRET_FIELD_IDS = ['jiraApiToken', 'githubToken', 'pagerdutyToken', 'slackToken'];

function el(id) {
  return document.getElementById(id);
}

async function loadSettings() {
  const res = await fetch('/api/settings');
  const settings = await res.json();

  FIELD_IDS.forEach((id) => {
    const input = el(id);
    if (!input) return;
    if (input.type === 'checkbox') input.checked = Boolean(settings[id]);
    else input.value = settings[id] ?? '';
  });

  SECRET_FIELD_IDS.forEach((id) => {
    const hint = el(`${id}-hint`);
    if (settings[`${id}Set`]) {
      hint.textContent = `Attualmente impostato (termina con ${settings[`${id}Masked`].slice(-4)}).`;
    } else {
      hint.textContent = 'Non ancora impostato.';
    }
  });
}

function setStatus(message, isError) {
  const status = el('save-status');
  status.textContent = message;
  status.style.color = isError ? 'var(--danger)' : 'var(--success)';
  if (!isError) {
    setTimeout(() => {
      if (status.textContent === message) status.textContent = '';
    }, 2500);
  }
}

async function saveSettings(e) {
  e.preventDefault();

  const payload = {};
  FIELD_IDS.forEach((id) => {
    const input = el(id);
    if (!input) return;
    payload[id] = input.type === 'checkbox' ? input.checked : input.value;
  });
  SECRET_FIELD_IDS.forEach((id) => {
    payload[id] = el(id).value; // blank = "leave unchanged", handled server-side
  });

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Errore nel salvataggio');

    SECRET_FIELD_IDS.forEach((id) => el(id).value = '');
    await loadSettings();
    setStatus('Impostazioni salvate.', false);
  } catch (err) {
    setStatus(`Errore: ${err.message}`, true);
  }
}

document.getElementById('settings-form').addEventListener('submit', saveSettings);
loadSettings();
