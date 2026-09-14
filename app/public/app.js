const SOURCE_LABELS = {
  'jira-todo': 'Jira',
  'github-pr': 'GitHub',
  'jira-activity': 'Team',
  'ci-failure': 'CI',
  'pagerduty-incident': 'PagerDuty',
  'slack-mention': 'Slack'
};

const GITHUB_ICON = `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
  <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
</svg>`;

const JIRA_ICON = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
  <path d="M15.5 0H7.6a3.6 3.6 0 003.6 3.6h1.47V5a3.6 3.6 0 003.6 3.6V.77A.77.77 0 0015.5 0z" fill="#2684FF"/>
  <path d="M11.65 3.92H3.75a3.6 3.6 0 003.6 3.6h1.47v1.4a3.6 3.6 0 003.6 3.6V4.69a.77.77 0 00-.77-.77z" fill="#2684FF" opacity="0.75"/>
  <path d="M7.79 7.85H-.11a3.6 3.6 0 003.6 3.6h1.47v1.39a3.6 3.6 0 003.6 3.6V8.61a.77.77 0 00-.77-.76z" fill="#2684FF" opacity="0.5" transform="translate(0.11)"/>
</svg>`;

const TEAM_ICON = `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
  <path d="M5.5 7a2 2 0 100-4 2 2 0 000 4zm5 0a2 2 0 100-4 2 2 0 000 4zM0 13c0-2.2 2.46-4 5.5-4 .68 0 1.33.09 1.93.26C6.6 9.98 6 10.93 6 12v1H0v-1zm16 0v1h-8v-1c0-1.07-.6-2.02-1.43-2.74A6.7 6.7 0 0110.5 9c3.04 0 5.5 1.8 5.5 4z"/>
</svg>`;

const CI_ICON = `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
  <path fill-rule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z"/>
  <path fill-rule="evenodd" d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
</svg>`;

const PAGERDUTY_ICON = `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
  <path d="M8 16a1.5 1.5 0 001.5-1.5h-3A1.5 1.5 0 008 16zM8 1.5a4.5 4.5 0 00-4.5 4.5v2.4c0 .5-.2 1-.5 1.4L1.6 11a1 1 0 00.7 1.7h11.4a1 1 0 00.7-1.7l-1.4-1.2a2 2 0 01-.5-1.4V6A4.5 4.5 0 008 1.5z"/>
</svg>`;

const SLACK_ICON = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
  <path d="M8 0C3.6 0 0 3.1 0 7c0 2.1 1.1 4 2.8 5.3-.1.9-.5 2-1.3 2.9 1.4.2 2.8-.2 3.9-1 .8.2 1.7.3 2.6.3 4.4 0 8-3.1 8-7S12.4 0 8 0z" fill="#611f69"/>
</svg>`;

const SOURCE_ICONS = {
  'jira-todo': JIRA_ICON,
  'github-pr': GITHUB_ICON,
  'jira-activity': TEAM_ICON,
  'ci-failure': CI_ICON,
  'pagerduty-incident': PAGERDUTY_ICON,
  'slack-mention': SLACK_ICON
};

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    document.title = config.appName;
    const badge = document.getElementById('mock-badge');
    if (!config.useMocks) {
      badge.textContent = 'LIVE API';
      badge.style.background = '#d1fae5';
      badge.style.color = '#059669';
    }
  } catch (err) {
    console.error('Failed to load config', err);
  }
}

function priorityClass(tag) {
  if (!tag) return '';
  const p = tag.toLowerCase();
  if (p === 'high' || p.includes('alta')) return 'priority-high';
  if (p === 'medium' || p.includes('media')) return 'priority-medium';
  if (p === 'low' || p.includes('bassa')) return 'priority-low';
  if (p === 'draft') return 'draft';
  if (p === 'failure') return 'priority-high';
  return '';
}

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return 'meno di un’ora fa';
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function renderItem(item) {
  const wrapper = document.createElement('div');
  wrapper.className = 'item';
  wrapper.dataset.itemId = item.id;

  wrapper.innerHTML = `
    <div class="item-flags">
      <button class="flag-btn todo ${item.flags.todo ? 'active' : ''}" data-flag="todo" title="Segna come TODO">☐</button>
      <button class="flag-btn star ${item.flags.star ? 'active' : ''}" data-flag="star" title="Aggiungi ai preferiti">★</button>
    </div>
    <a class="item-main" href="${item.url}" target="_blank" rel="noopener">
      <div class="item-top">
        <span class="item-label">${escapeHtml(item.label)}</span>
        <span class="tag tag-icon source-${item.source}" title="${SOURCE_LABELS[item.source] || item.source}">${SOURCE_ICONS[item.source] || ''}</span>
      </div>
      <div class="item-title">${escapeHtml(item.title)}</div>
      <div class="item-meta">
        ${item.tag ? `<span class="tag ${priorityClass(item.tag)}">${escapeHtml(item.tag)}</span>` : ''}
        ${item.meta.map((m) => `<span>${escapeHtml(m)}</span>`).join('<span>&middot;</span>')}
        <span>&middot; ${timeAgo(item.timestamp)}</span>
      </div>
    </a>
  `;

  wrapper.querySelectorAll('.flag-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFlag(item.id, btn.dataset.flag, btn);
    });
  });

  return wrapper;
}

async function toggleFlag(itemId, flag, btn) {
  const nextValue = !btn.classList.contains('active');
  btn.classList.toggle('active', nextValue);
  try {
    const res = await fetch(`/api/feed/${encodeURIComponent(itemId)}/flags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag, value: nextValue })
    });
    if (!res.ok) throw new Error('Errore nel salvataggio del flag');
  } catch (err) {
    console.error(err);
    btn.classList.toggle('active', !nextValue);
  }
}

function renderSection(bodyEl, countEl, items, emptyMessage) {
  countEl.textContent = items.length;
  bodyEl.innerHTML = '';
  if (items.length === 0) {
    bodyEl.innerHTML = `<p class="empty">${emptyMessage}</p>`;
    return;
  }
  items.forEach((item) => bodyEl.appendChild(renderItem(item)));
}

const SIGNAL_SOURCES = ['ci-failure', 'pagerduty-incident', 'slack-mention'];

async function loadFeed() {
  const signalsBody = document.getElementById('signals-body');
  const signalsCount = document.getElementById('signals-count');
  const mineBody = document.getElementById('mine-body');
  const mineCount = document.getElementById('mine-count');
  const teamBody = document.getElementById('team-body');
  const teamCount = document.getElementById('team-count');

  try {
    const res = await fetch('/api/feed');
    if (!res.ok) throw new Error((await res.json()).error || 'Errore nel caricamento del feed');
    const { items } = await res.json();

    const signals = items.filter((i) => SIGNAL_SOURCES.includes(i.source));
    const mine = items.filter((i) => i.source === 'jira-todo' || i.source === 'github-pr');
    const team = items.filter((i) => i.source === 'jira-activity');

    renderSection(signalsBody, signalsCount, signals, 'Nessun segnale critico al momento. ✅');
    renderSection(mineBody, mineCount, mine, 'Nessuna attività personale al momento. 🎉');
    renderSection(teamBody, teamCount, team, 'Nessuna attività recente del team.');
  } catch (err) {
    signalsBody.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
    mineBody.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
    teamBody.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
    signalsCount.textContent = '!';
    mineCount.textContent = '!';
    teamCount.textContent = '!';
  }
}

const AUTO_REFRESH_INTERVAL_MS = 60 * 1000;

document.getElementById('refresh-btn').addEventListener('click', loadFeed);
loadConfig();
loadFeed();
setInterval(loadFeed, AUTO_REFRESH_INTERVAL_MS);
