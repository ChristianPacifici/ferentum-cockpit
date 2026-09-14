const express = require('express');
const { fetchJiraTodo } = require('../lib/jiraClient');

const router = express.Router();

router.get('/todo', async (req, res) => {
  try {
    const issues = await fetchJiraTodo();
    res.json({ issues });
  } catch (err) {
    console.error('[jira] failed to fetch todo issues:', err.message);
    res.status(502).json({ error: 'Impossibile recuperare i ticket Jira', details: err.message });
  }
});

module.exports = router;
