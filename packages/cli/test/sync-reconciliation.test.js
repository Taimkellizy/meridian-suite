import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { runSync } from '../utils/sync-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('Running Sync Reconciliation Tests...');
  
  const fixtureDir = path.join(__dirname, 'fixtures', 'sync-test-project');
  
  // 1. Setup fixtures
  await fs.mkdir(path.join(fixtureDir, '.meridian'), { recursive: true });
  await fs.writeFile(path.join(fixtureDir, '.meridian', 'config.json'), JSON.stringify({ adapter: 'next-i18next' }));

  await fs.mkdir(path.join(fixtureDir, 'src', 'i18n', 'messages'), { recursive: true });
  await fs.mkdir(path.join(fixtureDir, 'src', 'config'), { recursive: true });
  await fs.mkdir(path.join(fixtureDir, 'src', 'components'), { recursive: true });

  const configJson = {
    pricing: {
      items: [
        { name: "Free", priceDetails: "for one user" }
      ]
    }
  };
  
  const enTranslations = {
    "Free": "Free",
    "for one user": "for one user",
    "Some static key": "Some static key"
  };
  
  const arTranslations = {
    "Free": "مجانًا",
    "for one user": "لمستخدم واحد"
  };
  
  const headerTsx = `
    export default function Header() {
      return <div>{t('Some static key')}</div>;
    }
  `;

  await fs.writeFile(path.join(fixtureDir, 'src', 'config', 'index.json'), JSON.stringify(configJson, null, 2));
  await fs.writeFile(path.join(fixtureDir, 'src', 'i18n', 'messages', 'en.json'), JSON.stringify(enTranslations, null, 2));
  await fs.writeFile(path.join(fixtureDir, 'src', 'i18n', 'messages', 'ar.json'), JSON.stringify(arTranslations, null, 2));
  await fs.writeFile(path.join(fixtureDir, 'src', 'components', 'Header.tsx'), headerTsx);

  const config = {
    defaultLanguage: 'en',
    translationCoverageThreshold: 100
  };

  const spinnerMock = {
    start: () => {},
    stop: () => {},
    succeed: () => {},
    fail: () => {},
    success: () => {}
  };

  // Mock console.log
  const originalLog = console.log;
  let logOutput = [];
  console.log = (...args) => {
    logOutput.push(args.join(' '));
  };

  // Run 1: Check mode
  await runSync(fixtureDir, config, spinnerMock, [], { check: true });
  
  const output1 = logOutput.join('\n');
  
  // Assert no orphans
  assert(!output1.includes('orphaned keys'), 'Should not flag data-promoted keys as orphaned');
  // Assert ar is missing "Some static key"
  assert(output1.includes('[ar] Missing 1 translations'), 'Should flag missing static key in ar');
  // Assert coverage is not 100%
  assert(output1.includes('Overall Coverage: 66.67%'), 'Coverage should be accurately calculated');

  // Assert _data is never written
  const postEn = JSON.parse(await fs.readFile(path.join(fixtureDir, 'src', 'i18n', 'messages', 'en.json'), 'utf8'));
  assert(postEn._data === undefined, '_data should not exist in output');

  // Clear logs
  logOutput = [];

  // Run 2: Check mode again (Idempotency)
  await runSync(fixtureDir, config, spinnerMock, [], { check: true });
  const output2 = logOutput.join('\n');

  assert.strictEqual(output1, output2, 'Sync check should be idempotent and produce identical output');

  // Restore console
  console.log = originalLog;
  console.log('✅ All tests passed!');
  
  // Cleanup
  await fs.rm(fixtureDir, { recursive: true, force: true });
}

runTests().catch(e => {
  console.error('Test failed!', e);
  process.exit(1);
});
