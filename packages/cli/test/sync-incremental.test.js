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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-test-incremental-'));
  console.log('Testing in:', tmpDir);
  
  // 1. Setup config
  fs.writeFileSync(path.join(tmpDir, '.meridianrc.json'), JSON.stringify({
    languages: ['en', 'ar'],
    defaultLanguage: 'en',
  }));
  
  fs.mkdirSync(path.join(tmpDir, 'src'));
  fs.writeFileSync(path.join(tmpDir, 'src', 'App.jsx'), `
    export default function App() {
      return <div>Original Text</div>;
    }
  `);

  fs.mkdirSync(path.join(tmpDir, '.meridian'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.meridian', 'config.json'), JSON.stringify({ adapter: 'next-i18next' }));

  fs.mkdirSync(path.join(tmpDir, 'src', 'i18n', 'messages'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'i18n', 'messages', 'en.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(tmpDir, 'src', 'i18n', 'messages', 'ar.json'), JSON.stringify({}));
  
  const config = JSON.parse(fs.readFileSync(path.join(tmpDir, '.meridianrc.json'), 'utf8'));

  // First sync
  resetKeyGeneratorStateForTesting();
  await runSync(tmpDir, config, mockSpinner, [], {});
  
  const originalEnTranslations = JSON.parse(fs.readFileSync(path.join(tmpDir, 'src', 'i18n', 'messages', 'en.json'), 'utf8'));
  const originalKeys = Object.keys(originalEnTranslations);
  assert.strictEqual(originalKeys.length, 1);
  const keyName = originalKeys[0];
  
  // Wait to ensure mtime is strictly greater
  await new Promise(r => setTimeout(r, 100));
  
  // Add new string
  fs.writeFileSync(path.join(tmpDir, 'src', 'App.jsx'), `
    import { useTranslation } from 'react-i18next';
    export default function App() {
      const { t } = useTranslation();
      return (
        <div>
          {t('${keyName}')}
          <span>New Hardcoded Text</span>
        </div>
      );
    }
  `);
  
  // Second sync
  resetKeyGeneratorStateForTesting();
  await runSync(tmpDir, config, mockSpinner, [], {});
  
  const modifiedCode = fs.readFileSync(path.join(tmpDir, 'src', 'App.jsx'), 'utf8');
  assert.ok(!modifiedCode.includes('>New Hardcoded Text<'), 'Should remove raw New Hardcoded Text');
  assert.ok(modifiedCode.includes('t('), 'Should have t()');
  
  const enTranslations = JSON.parse(fs.readFileSync(path.join(tmpDir, 'src', 'i18n', 'messages', 'en.json'), 'utf8'));
  const arTranslations = JSON.parse(fs.readFileSync(path.join(tmpDir, 'src', 'i18n', 'messages', 'ar.json'), 'utf8'));
  
  const newKeys = Object.keys(enTranslations).filter(k => k !== keyName);
  assert.strictEqual(newKeys.length, 1);
  const newKeyName = newKeys[0];
  
  assert.strictEqual(enTranslations[newKeyName], 'New Hardcoded Text');
  assert.strictEqual(arTranslations[newKeyName], ''); // Should be empty string placeholder
  
  // Third sync (Idempotency test)
  resetKeyGeneratorStateForTesting();
  
  const oldLog = console.log;
  let logOutput = '';
  console.log = (msg) => {
    logOutput += msg + '\n';
    oldLog(msg);
  };
  
  await runSync(tmpDir, config, mockSpinner, [], {});
  
  console.log = oldLog;
  
  assert.ok(!logOutput.includes('Found '), 'Should produce no output about found strings');
  const codeAfterThirdSync = fs.readFileSync(path.join(tmpDir, 'src', 'App.jsx'), 'utf8');
  assert.strictEqual(codeAfterThirdSync, modifiedCode, 'File should not be changed on second run');
  assert.ok(codeAfterThirdSync.includes(`t('${keyName}')`), 'Already extracted string should not be modified');
  
  console.log('✅ sync-incremental.test.js passed!');
}

runTest().catch(err => {
  console.error('❌ sync-incremental.test.js failed:', err);
  process.exit(1);
});
