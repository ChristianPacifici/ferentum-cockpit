import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const fs = require('fs');
const os = require('os');
const path = require('path');

describe('configStore', () => {
  let tempDir;
  let configStore;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ferentum-config-'));
    process.env.FERENTUM_DATA_DIR = tempDir;
    process.env.USE_MOCKS = 'true';
    delete require.cache[require.resolve('./configStore')];
    configStore = require('./configStore');
  });

  afterEach(() => {
    delete process.env.FERENTUM_DATA_DIR;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('falls back to env defaults when nothing has been saved', () => {
    const settings = configStore.getSettings();
    expect(settings.useMocks).toBe(true);
    expect(settings.jiraJql).toContain('currentUser()');
  });

  it('never returns a secret field in full, only masked', () => {
    configStore.updateSettings({ jiraApiToken: 'super-secret-1234' });
    const pub = configStore.getPublicSettings();
    expect(pub.jiraApiToken).toBeUndefined();
    expect(pub.jiraApiTokenSet).toBe(true);
    expect(pub.jiraApiTokenMasked).toBe('••••••1234');
  });

  it('keeps the existing secret when an update sends a blank value', () => {
    configStore.updateSettings({ jiraApiToken: 'first-token' });
    configStore.updateSettings({ jiraApiToken: '' });
    expect(configStore.getSettings().jiraApiToken).toBe('first-token');
  });

  it('ignores fields that are not part of the known settings shape', () => {
    configStore.updateSettings({ notARealField: 'x' });
    expect(configStore.getSettings().notARealField).toBeUndefined();
  });

  it('coerces boolean and number fields on update', () => {
    configStore.updateSettings({ useMocks: 'false', jiraActivityLimit: '25' });
    const settings = configStore.getSettings();
    expect(settings.useMocks).toBe(false);
    expect(settings.jiraActivityLimit).toBe(25);
  });
});
