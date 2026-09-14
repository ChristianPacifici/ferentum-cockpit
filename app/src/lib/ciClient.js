const { getSettings } = require('./configStore');

async function fetchRunsForRepo(settings, fullName) {
  const [owner, repo] = fullName.split('/');
  const base = settings.useMocks ? `${settings.mockServerUrl}/github` : settings.githubApiUrl;
  const url = `${base}/repos/${owner}/${repo}/actions/runs?status=completed&per_page=10`;

  const headers = { Accept: 'application/vnd.github+json' };
  if (!settings.useMocks && settings.githubToken) {
    headers.Authorization = `Bearer ${settings.githubToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub Actions API error ${response.status} for ${fullName}: ${await response.text()}`);
  }
  const data = await response.json();
  return data.workflow_runs || [];
}

// Reuses the same GITHUB_REPOS list as the PR feed — CI runs live on the same repos.
async function fetchFailedRuns() {
  const settings = getSettings();
  if (!settings.ciEnabled) return [];

  const repos = (settings.githubRepos || '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

  const results = await Promise.all(
    repos.map(async (fullName) => {
      const runs = await fetchRunsForRepo(settings, fullName);
      return runs
        .filter((run) => run.conclusion === 'failure')
        .map((run) => ({
          id: `ci-failure-${fullName.replace('/', '-')}-${run.id}`,
          repo: fullName,
          workflowName: run.name,
          branch: run.head_branch,
          actor: run.actor?.login,
          url: run.html_url,
          timestamp: run.updated_at
        }));
    })
  );

  return results.flat();
}

module.exports = { fetchFailedRuns };
