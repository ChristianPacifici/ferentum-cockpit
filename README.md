# Ferentum Cockpit

Feed personale unico, diviso in tre sezioni:

- **Segnali di progetto** — i segnali più urgenti da fonti esterne a Jira/GitHub: build CI fallite
  (GitHub Actions), incident PagerDuty aperti, menzioni Slack. Ognuno è opzionale e disattivabile
  dalla pagina Impostazioni.
- **Le mie attività** — ticket Jira assegnati a te non ancora completati + pull request GitHub
  attive create da te, ordinati cronologicamente.
- **Attività del team** — un equivalente semplificato del gadget "Activity stream" delle
  dashboard Jira: le ultime azioni dei colleghi sui ticket del progetto (cambi di stato,
  priorità, assegnazioni, commenti), ricavate dal changelog di Jira (`expand=changelog`).

Ogni elemento del feed si può marcare con due flag indipendenti, **TODO** (☐) e **preferito** (★),
che vengono salvati lato backend (`app/data/flags.json`) e sopravvivono a refresh e riavvii. Il
feed si aggiorna automaticamente ogni 60 secondi.

Una pagina **[Team](http://localhost:3000/team.html)** (link 👥 in alto) mostra il **carico di
lavoro per persona** — ticket Jira aperti + PR GitHub aperte per ciascun membro del team, con
evidenziato chi ha il carico più alto — utile per un Lead per individuare colli di bottiglia o
sovraccarico prima che diventino un problema. I conteggi Jira arrivano da `JIRA_WORKLOAD_JQL`
(già pensata per più progetti insieme, es. `project in (FER, PLAT)`), quelli GitHub da tutti i
repo in `GITHUB_REPOS` (già multi-repo); `TEAM_DIRECTORY` mappa i login GitHub ai nomi Jira per
unire i due conteggi per persona.

Una pagina **[Impostazioni](http://localhost:3000/settings.html)** (link ⚙ in alto a destra)
permette di modificare a runtime URL e API key di Jira/GitHub — salvate in `app/data/settings.json`,
mai committato — senza toccare `.env` né riavviare i container. I token vengono mostrati solo
mascherati (es. `••••••1234`) e un campo lasciato vuoto in salvataggio non sovrascrive il valore
già impostato.

Include un **mock server** in stile Wiremock che replica esattamente la forma delle risposte
reali di Jira e GitHub, così puoi sviluppare e testare la dashboard subito, e passare alle API
vere in un secondo momento cambiando solo le variabili d'ambiente (nessuna modifica al codice).

## Struttura

Monorepo con **npm workspaces** (un solo `npm install` e un solo lockfile in radice):

```
Ferentum-Cockpit/
├─ package.json       # root: workspaces, script lint/format/test, devDependencies condivise
├─ eslint.config.js / .prettierrc.json
├─ .github/workflows/ci.yml   # lint + test ad ogni push/PR
├─ app/               # workspace @ferentum-cockpit/app — backend Express + frontend statico
│  ├─ server.js
│  ├─ data/           # flags.json, settings.json — stato persistito, mai versionato
│  ├─ src/lib/        # client Jira/GitHub/CI/PagerDuty/Slack (switch mock ↔ reale) + store dei flag/impostazioni
│  ├─ src/routes/     # /api/feed, /api/workload, /api/settings, /api/jira/*, /api/github/*
│  └─ public/         # HTML/CSS/JS della dashboard + settings.html + team.html
├─ mock-server/       # workspace @ferentum-cockpit/mock-server — endpoint identici a Jira/GitHub/Actions/PagerDuty/Slack
│  └─ data/           # fixture JSON (ticket multi-progetto con changelog, PR, build, incident, menzioni)
├─ .env.example       # template variabili d'ambiente (mai committare .env)
└─ docker-compose.yml
```

## Sviluppo

```bash
npm install          # un'unica volta, dalla radice (installa entrambi i workspace)
cp .env.example .env

npm run dev:mock     # avvia il mock server (porta 4000)
# in un altro terminale
npm run dev:app      # avvia l'app (porta 3000)
```

Apri http://localhost:3000 — di default `USE_MOCKS=true`, la dashboard mostra i dati finti
generati dal mock server.

Altri script utili (dalla radice):

```bash
npm run lint         # ESLint su tutto il monorepo
npm run format       # verifica la formattazione Prettier
npm run format:fix   # applica la formattazione Prettier
npm test             # Vitest (unit test su store/config + integration test su entrambi i server)
```

## Avvio con Docker

```bash
cp .env.example .env
docker compose up --build
```

Apri http://localhost:3000 — il container `app` e il container `mock-server` sono collegati
automaticamente dalla rete Docker Compose.

## Passare alle API reali

Puoi farlo in due modi equivalenti:

**A) Dalla pagina Impostazioni** (più comodo, non richiede riavvii): apri ⚙ Impostazioni, disattiva
"Usa il mock server" e compila URL/token reali, poi salva. Effetto immediato sul feed.

**B) Da `.env`** (utile per un deploy Docker già configurato in partenza):

1. Crea un **API token Jira**: https://id.atlassian.com/manage-profile/security/api-tokens
2. Crea un **Personal Access Token GitHub** con permesso di lettura su pull request/repo.
3. Nel file `.env` (mai committato):
   ```
   USE_MOCKS=false
   JIRA_BASE_URL=https://tuaazienda.atlassian.net
   JIRA_EMAIL=tuo@indirizzo.email
   JIRA_API_TOKEN=xxxxx
   GITHUB_TOKEN=ghp_xxxxx
   GITHUB_USERNAME=tuo-username-github
   GITHUB_REPOS=owner/repo-1,owner/repo-2
   ```
4. Riavvia l'app: `docker compose up --build` (o `npm start` in locale).

In entrambi i casi il codice non cambia: il client Jira/GitHub chiama gli stessi path
(`/rest/api/{2,3}/search/jql`, `/repos/:owner/:repo/pulls`) ma verso l'host reale invece che verso
il mock server. **Nota**: qualunque valore salvato dalla pagina Impostazioni ha la precedenza su
`.env` per quel campo (i valori di `.env` restano il default iniziale finché non li sovrascrivi).

**Nota sulla ricerca Jira**: l'app usa `GET /rest/api/{2,3}/search/jql`, non la vecchia
`GET /rest/api/{2,3}/search` — Atlassian ha deprecato quest'ultima a favore di un endpoint a
paginazione cursor-based (`nextPageToken`/`isLast` invece di `startAt`/`total`). Se in futuro
Atlassian introducesse ulteriori cambi, il punto unico da aggiornare è `searchIssues()` in
[`app/src/lib/jiraClient.js`](app/src/lib/jiraClient.js).

**Le chiavi API vanno SEMPRE in `.env` o nella pagina Impostazioni, mai in `.env.example` né
committate.** `.gitignore` esclude già `.env`, ogni `.env.*` (tranne `.env.example`) e
`app/data/settings.json`.

## Nota su `/pulls`: quali PR si vedono come "attive"?

L'endpoint GitHub reale è `GET /repos/{owner}/{repo}/pulls`:

- **Di default restituisce solo le PR con `state=open`** (le "attive" in senso stretto — non
  merge/chiuse). Questa app chiama esplicitamente `?state=open`.
- **Non esiste un parametro `creator`/`author` su questo endpoint.** Per sapere quali sono
  "create da te" bisogna filtrare lato client confrontando `pr.user.login` con il tuo username
  (è quello che fa `GITHUB_ONLY_MINE=true` in `githubClient.js`), oppure usare in alternativa
  la Search API: `GET /search/issues?q=is:pr+is:open+author:TUO_USERNAME+repo:owner/repo`.
- **Visibilità**: vedi solo le PR dei repo a cui il tuo token ha accesso (repo privati richiedono
  uno scope/permesso adeguato sul PAT).
- **Paginazione**: l'API restituisce max 30 risultati per pagina di default; questa app chiede
  `per_page=100`, oltre quella soglia servirebbe paginare con il parametro `page`.
- Se vuoi vedere anche le PR degli altri (non solo le tue) nei repo monitorati, imposta
  `GITHUB_ONLY_MINE=false` in `.env`.

## Segnali di progetto e carico di lavoro: come sono modellati

- **CI**: riusa `GITHUB_REPOS`/token GitHub esistenti, chiama `GET /repos/{owner}/{repo}/actions/runs`
  (vera API GitHub Actions) e mostra le run con `conclusion=failure`. Disattivabile con `CI_ENABLED=false`.
- **PagerDuty**: chiama `GET /incidents` (PagerDuty REST API v2) filtrato su incident aperti
  (`triggered`/`acknowledged`). Richiede `PAGERDUTY_TOKEN` in modalità reale; disattivabile con
  `PAGERDUTY_ENABLED=false`.
- **Slack**: chiama `GET /search.messages` (Slack Web API) con la query in `SLACK_MENTION_QUERY`
  (default `@me`). Richiede `SLACK_TOKEN` in modalità reale; disattivabile con `SLACK_ENABLED=false`.
- **Carico di lavoro**: `/api/workload` aggrega ticket Jira aperti (via `JIRA_WORKLOAD_JQL`, pensata
  per più progetti: `project in (FER, PLAT)`) e PR GitHub aperte di **tutti** gli autori (non solo
  le tue) sui repo in `GITHUB_REPOS`, poi unisce i due conteggi per persona usando `TEAM_DIRECTORY`
  (mappa `login-github=Nome Jira`).

Tutti e tre i segnali esterni seguono lo stesso pattern mock/reale di Jira e GitHub: in
`USE_MOCKS=true` rispondono dal mock server con dati d'esempio, altrimenti chiamano l'host reale
con le credenziali configurate — nessuna differenza per il codice che li consuma.

## Variabili d'ambiente

Vedi [`.env.example`](.env.example) per l'elenco completo con commenti.
