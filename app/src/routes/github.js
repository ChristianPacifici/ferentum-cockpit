const express = require('express');
const { fetchActivePulls } = require('../lib/githubClient');

const router = express.Router();

router.get('/pulls', async (req, res) => {
  try {
    const pulls = await fetchActivePulls();
    res.json({ pulls });
  } catch (err) {
    console.error('[github] failed to fetch pull requests:', err.message);
    res.status(502).json({ error: 'Impossibile recuperare le PR GitHub', details: err.message });
  }
});

module.exports = router;
