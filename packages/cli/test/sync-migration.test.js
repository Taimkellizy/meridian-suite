import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSync } from '../utils/sync-runner.js';
import { resetKeyGeneratorStateForTesting } from '@meridian/core';

const mockSpinner = {
  start: () => mockSpinner,
  stop: () => mockSpinner,
  fail: console.error,
  success: console.log
};

function makeDataProject() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-sync-migration-'));
  fs.writeFileSync(path.join(projectRoot, '.meridianrc.json'), JSON.stringify({
    languages: ['en', 'ar'],
    defaultLanguage: 'en',
    dataFiles: ['src/data.json']
  }));
  fs.mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'src', 'data.json'), JSON.stringify({
    title: 'Hello',
    description: 'World'
  }));
  fs.mkdirSync(path.join(projectRoot, '.meridian'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, '.meridian', 'config.json'), JSON.stringify({ adapter: 'next-i18next' }));
  fs.mkdirSync(path.join(projectRoot, 'src', 'i18n', 'messages'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'src', 'i18n', 'messages', 'en.json'), JSON.stringify({
    'Hello': 'Hello',
    'World': 'World'
  }));
  fs.writeFileSync(path.join(projectRoot, 'src', 'i18n', 'messages', 'ar.json'), JSON.stringify({
    'Hello': 'مرحبا',
    'World': 'عالم'
  }));
  return projectRoot;
}

function readJson(projectRoot, ...segments) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), 'utf8'));
}

function captureConsoleLog() {
  const originalLog = console.log;
  const lines = [];
  console.log = (...args) => { lines.push(args.join(' ')); };
  return {
    lines,
    restore() { console.log = originalLog; }
  };
}

test('data scan records promoted keys after first sync', async () => {
  resetKeyGeneratorStateForTesting();
  const projectRoot = makeDataProject();
  const config = readJson(projectRoot, '.meridianrc.json');

  const result = await runSync(projectRoot, config, mockSpinner, [], {});

  assert.equal(result.ok, true);
  const scan = readJson(projectRoot, '.meridian', 'last-data-scan.json');
  assert.equal(scan['src/data.json']['title'], 'Hello');
  assert.equal(scan['src/data.json']['description'], 'World');
});

test('--migrate-value carries translations forward when a data value is edited', async () => {
  resetKeyGeneratorStateForTesting();
  const projectRoot = makeDataProject();
  const config = readJson(projectRoot, '.meridianrc.json');

  await runSync(projectRoot, config, mockSpinner, [], {});

  fs.writeFileSync(path.join(projectRoot, 'src', 'data.json'), JSON.stringify({
    title: 'Hello Everyone',
    description: 'World'
  }));

  resetKeyGeneratorStateForTesting();
  const result = await runSync(projectRoot, config, mockSpinner, [], { migrateValue: true });

  assert.equal(result.ok, true);
  const enTranslations = readJson(projectRoot, 'src', 'i18n', 'messages', 'en.json');
  const arTranslations = readJson(projectRoot, 'src', 'i18n', 'messages', 'ar.json');

  assert.equal(enTranslations['Hello Everyone'], 'Hello Everyone');
  assert.equal(enTranslations['Hello'], undefined, 'old key removed from en');

  assert.equal(arTranslations['Hello Everyone'], 'مرحبا', 'arabic translation migrated');
  assert.equal(arTranslations['Hello'], undefined, 'old key removed from ar');
});

test('migration is idempotent — no value-edit warning on repeat', async () => {
  resetKeyGeneratorStateForTesting();
  const projectRoot = makeDataProject();
  const config = readJson(projectRoot, '.meridianrc.json');

  await runSync(projectRoot, config, mockSpinner, [], {});
  fs.writeFileSync(path.join(projectRoot, 'src', 'data.json'), JSON.stringify({
    title: 'Hello Everyone',
    description: 'World'
  }));
  resetKeyGeneratorStateForTesting();
  await runSync(projectRoot, config, mockSpinner, [], { migrateValue: true });

  const capture = captureConsoleLog();
  try {
    await runSync(projectRoot, config, mockSpinner, [], { migrateValue: true });
  } finally {
    capture.restore();
  }
  const output = capture.lines.join('\n');

  assert.ok(!output.includes('Migrating value edits'), 'should not migrate again');
  assert.ok(!output.includes('⚠ Detected a likely value edit'), 'should not warn about edits');
});
