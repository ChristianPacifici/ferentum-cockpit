const express = require('express');
const { getPublicSettings, updateSettings } = require('../lib/configStore');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(getPublicSettings());
});

router.put('/', (req, res) => {
  try {
    const updated = updateSettings(req.body || {});
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
