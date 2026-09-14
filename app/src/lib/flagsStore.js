const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FLAGS_FILE = path.join(DATA_DIR, 'flags.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FLAGS_FILE)) fs.writeFileSync(FLAGS_FILE, '{}');
}

function readFlags() {
  ensureStore();
  return JSON.parse(fs.readFileSync(FLAGS_FILE, 'utf-8'));
}

function writeFlags(flags) {
  ensureStore();
  fs.writeFileSync(FLAGS_FILE, JSON.stringify(flags, null, 2));
}

function getFlags(itemId) {
  const all = readFlags();
  return all[itemId] || { todo: false, star: false };
}

function setFlag(itemId, flag, value) {
  if (flag !== 'todo' && flag !== 'star') {
    throw new Error(`Flag sconosciuto: ${flag}`);
  }
  const all = readFlags();
  const current = all[itemId] || { todo: false, star: false };
  current[flag] = Boolean(value);
  all[itemId] = current;
  writeFlags(all);
  return current;
}

module.exports = { readFlags, getFlags, setFlag };
