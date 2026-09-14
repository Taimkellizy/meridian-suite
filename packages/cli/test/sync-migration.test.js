import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'assert';
import { runSync } from '../utils/sync-runner.js';
import { resetKeyGeneratorStateForTesting } from '@meridian/core';

const mockSpinner = {
  start: () => mockSpinner,
  stop: () => mockSpinner,
  fail: console.error,
  success: console.log
};

async function runTest() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-test-migration-'));
  console.log('Testing in:', tmpDir);
  
  // 1. Setup config
  fs.writeFileSync(path.join(tmpDir, '.meridianrc.json'), JSON.stringify({
    languages: ['en', 'ar'],
    defaultLanguage: 'en',
    dataFiles: ['src/data.json']
  }));
  
  fs.mkdirSync(path.join(tmpDir, 'src'));
  fs.writeFileSync(path.join(tmpDir, 'src', 'data.json'), JSON.stringify({
    title: 'Hello',
    description: 'World'
  }));

  fs.mkdirSync(path.join(tmpDir, '.meridian'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.meridian', 'config.json'), JSON.stringify({ adapter: 'next-i18next' }));

  fs.mkdirSync(path.join(tmpDir, 'src', 'i18n', 'messages'), { recursive: true });
  
  fs.writeFileSync(path.join(tmpDir, 'src', 'i18n', 'messages', 'en.json'), JSON.stringify({
    'Hello': 'Hello',
    'World': 'World'
  }));
  fs.writeFileSync(path.join(tmpDir, 'src', 'i18n', 'messages', 'ar.json'), JSON.stringify({
    'Hello': 'مرحبا',
    'World': 'عالم'
  }));
  
  const config = JSON.parse(fs.readFileSync(path.join(tmpDir, '.meridianrc.json'), 'utf8'));

  // First sync to set up last-data-scan
  resetKeyGeneratorStateForTesting();
  await runSync(tmpDir, config, mockSpinner, [], {});
  
  // Verify last-data-scan
  const scanContent = JSON.parse(fs.readFileSync(path.join(tmpDir, '.meridian', 'last-data-scan.json'), 'utf8'));
  assert.strictEqual(scanContent['src/data.json']['title'], 'Hello');
  assert.strictEqual(scanContent['src/data.json']['description'], 'World');
  
  // Modify data.json
  fs.writeFileSync(path.join(tmpDir, 'src', 'data.json'), JSON.stringify({
    title: 'Hello Everyone',
    description: 'World'
  }));
  
  // Second sync with --migrate-value
  resetKeyGeneratorStateForTesting();
  await runSync(tmpDir, config, mockSpinner, [], { migrateValue: true });
  
  const enTranslations = JSON.parse(fs.readFileSync(path.join(tmpDir, 'src', 'i18n', 'messages', 'en.json'), 'utf8'));
  const arTranslations = JSON.parse(fs.readFileSync(path.join(tmpDir, 'src', 'i18n', 'messages', 'ar.json'), 'utf8'));
  
  // Assertions
  assert.strictEqual(enTranslations['Hello Everyone'], 'Hello Everyone');
  assert.strictEqual(enTranslations['Hello'], undefined, 'Old key should be removed from EN');
  
  assert.strictEqual(arTranslations['Hello Everyone'], 'مرحبا', 'Arabic translation should be migrated');
  assert.strictEqual(arTranslations['Hello'], undefined, 'Old key should be removed from AR');
  
  // Third sync with --migrate-value (Idempotency test)
  resetKeyGeneratorStateForTesting();
  
  // Capture console.log to ensure no warnings or output about migration
  const oldLog = console.log;
  let logOutput = '';
  console.log = (msg) => {
    logOutput += msg + '\n';
    oldLog(msg);
  };
  
  await runSync(tmpDir, config, mockSpinner, [], { migrateValue: true });
  
  console.log = oldLog;
  
  assert.ok(!logOutput.includes('Migrating value edits'), 'Should not migrate again');
  assert.ok(!logOutput.includes('⚠ Detected a likely value edit'), 'Should not warn about edits');
  
  console.log('✅ sync-migration.test.js passed!');
}

runTest().catch(err => {
  console.error('❌ sync-migration.test.js failed:', err);
  process.exit(1);
});
