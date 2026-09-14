const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');

const jiraRoutes = require('./src/routes/jira');
const githubRoutes = require('./src/routes/github');
const feedRoutes = require('./src/routes/feed');
const settingsRoutes = require('./src/routes/settings');
const workloadRoutes = require('./src/routes/workload');
const { getSettings } = require('./src/lib/configStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  res.json({
    appName: 'Ferentum Cockpit',
    useMocks: getSettings().useMocks
  });
});

app.use('/api/jira', jiraRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/workload', workloadRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ferentum-cockpit' }));

app.listen(PORT, () => {
  console.log(`Ferentum Cockpit listening on http://localhost:${PORT}`);
});
