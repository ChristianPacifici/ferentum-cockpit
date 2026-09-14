const { getSettings } = require('./configStore');

async function fetchPullsForRepo(settings, fullName) {
  const [owner, repo] = fullName.split('/');
  const base = settings.useMocks ? `${settings.mockServerUrl}/github` : settings.githubApiUrl;
  const url = `${base}/repos/${owner}/${repo}/pulls?state=open&per_page=100`;

  const headers = { Accept: 'application/vnd.github+json' };
  if (!settings.useMocks && settings.githubToken) {
    headers.Authorization = `Bearer ${settings.githubToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status} for ${fullName}: ${await response.text()}`);
  }
  return response.json();
}

async function fetchActivePulls() {
  const settings = getSettings();
  const repos = (settings.githubRepos || '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

  if (repos.length === 0) return [];

  const results = await Promise.all(
    repos.map(async (fullName) => {
      const pulls = await fetchPullsForRepo(settings, fullName);
      return pulls
        // The GitHub REST /pulls endpoint has no "creator" query param, so this filter is applied client-side.
        .filter((pr) => !settings.githubOnlyMine || pr.user?.login === settings.githubUsername)
        .map((pr) => ({
          id: `github-pr-${fullName.replace('/', '-')}-${pr.number}`,
          repo: fullName,
          number: pr.number,
          title: pr.title,
          author: pr.user?.login,
          draft: pr.draft,
          url: pr.html_url,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          reviewers: (pr.requested_reviewers || []).map((r) => r.login)
        }));
    })
  );

  return results.flat().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

// Counts open PRs per author across every monitored repo, ignoring GITHUB_ONLY_MINE —
// used by the "Carico di lavoro" team view, which needs everyone's numbers, not just yours.
async function fetchOpenPullCountsByAuthor() {
  const settings = getSettings();
  const repos = (settings.githubRepos || '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

  const counts = {};
  await Promise.all(
    repos.map(async (fullName) => {
      const pulls = await fetchPullsForRepo(settings, fullName);
      for (const pr of pulls) {
        const author = pr.user?.login || 'sconosciuto';
        counts[author] = (counts[author] || 0) + 1;
      }
    })
  );
  return counts;
}

module.exports = { fetchActivePulls, fetchOpenPullCountsByAuthor };
