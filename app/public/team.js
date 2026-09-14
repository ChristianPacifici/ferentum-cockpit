function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function renderPerson(person, maxTotal) {
  const ticketsPct = maxTotal ? (person.openTickets / maxTotal) * 100 : 0;
  const prsPct = maxTotal ? (person.openPullRequests / maxTotal) * 100 : 0;
  const isBottleneck = maxTotal > 0 && person.total === maxTotal && person.total > 0;

  const row = document.createElement('div');
  row.className = 'person-row';
  row.innerHTML = `
    <div class="person-header">
      <span class="person-name">${escapeHtml(person.name)}</span>
      ${isBottleneck ? '<span class="tag priority-high">Carico più alto</span>' : ''}
      <span class="person-total">${person.total}</span>
    </div>
    <div class="person-bar">
      <div class="bar-segment bar-tickets" style="width:${ticketsPct}%" title="${person.openTickets} ticket Jira aperti"></div>
      <div class="bar-segment bar-prs" style="width:${prsPct}%" title="${person.openPullRequests} PR GitHub aperte"></div>
    </div>
    <div class="person-legend">
      <span><i class="dot dot-tickets"></i>${person.openTickets} ticket Jira</span>
      <span><i class="dot dot-prs"></i>${person.openPullRequests} PR GitHub</span>
    </div>
  `;
  return row;
}

async function loadWorkload() {
  const body = document.getElementById('workload-body');
  try {
    const res = await fetch('/api/workload');
    if (!res.ok) throw new Error((await res.json()).error || 'Errore nel caricamento del carico di lavoro');
    const { people } = await res.json();

    if (people.length === 0) {
      body.innerHTML = '<p class="empty">Nessun dato disponibile.</p>';
      return;
    }

    const maxTotal = Math.max(...people.map((p) => p.total));
    body.innerHTML = '';
    people.forEach((person) => body.appendChild(renderPerson(person, maxTotal)));
  } catch (err) {
    body.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
  }
}

document.getElementById('refresh-btn').addEventListener('click', loadWorkload);
loadWorkload();
