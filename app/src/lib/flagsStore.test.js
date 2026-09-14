import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const fs = require('fs');
const os = require('os');
const path = require('path');

describe('flagsStore', () => {
  let tempDir;
  let flagsStore;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ferentum-flags-'));
    process.env.FERENTUM_DATA_DIR = tempDir;
    delete require.cache[require.resolve('./flagsStore')];
    flagsStore = require('./flagsStore');
  });

  afterEach(() => {
    delete process.env.FERENTUM_DATA_DIR;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns default flags for an item that was never flagged', () => {
    expect(flagsStore.getFlags('unknown-item')).toEqual({ todo: false, star: false });
  });

  it('persists a flag and reads it back', () => {
    flagsStore.setFlag('item-1', 'star', true);
    expect(flagsStore.getFlags('item-1')).toEqual({ todo: false, star: true });
  });

  it('keeps other flags untouched when setting one', () => {
    flagsStore.setFlag('item-1', 'star', true);
    flagsStore.setFlag('item-1', 'todo', true);
    expect(flagsStore.getFlags('item-1')).toEqual({ todo: true, star: true });
  });

  it('rejects an unknown flag name', () => {
    expect(() => flagsStore.setFlag('item-1', 'bogus', true)).toThrow();
  });
});
