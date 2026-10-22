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

function makeProject() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-sync-incremental-'));
  fs.writeFileSync(path.join(projectRoot, '.meridianrc.json'), JSON.stringify({
    languages: ['en', 'ar'],
    defaultLanguage: 'en'
  }));
  fs.mkdirSync(path.join(projectRoot, 'src'));
  fs.writeFileSync(path.join(projectRoot, 'src', 'App.jsx'), `
    export default function App() {
      return <div>Original Text</div>;
    }
  `);
  fs.mkdirSync(path.join(projectRoot, '.meridian'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, '.meridian', 'config.json'), JSON.stringify({ adapter: 'next-i18next' }));
  fs.mkdirSync(path.join(projectRoot, 'src', 'i18n', 'messages'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'src', 'i18n', 'messages', 'en.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(projectRoot, 'src', 'i18n', 'messages', 'ar.json'), JSON.stringify({}));
  return projectRoot;
}

function readJson(projectRoot, ...segments) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, ...segments), 'utf8'));
}

test('incremental extraction wraps strings and seeds locale files', async () => {
  resetKeyGeneratorStateForTesting();
  const projectRoot = makeProject();

  const result = await runSync(projectRoot, readJson(projectRoot, '.meridianrc.json'), mockSpinner, [], {});
  assert.equal(result.ok, true);

  const enTranslations = readJson(projectRoot, 'src', 'i18n', 'messages', 'en.json');
  assert.equal(Object.keys(enTranslations).length, 1, 'one key extracted');
  const keyName = Object.keys(enTranslations)[0];

  const appCode = fs.readFileSync(path.join(projectRoot, 'src', 'App.jsx'), 'utf8');
  assert.ok(appCode.includes(`t("${keyName}")`), 'source wrapped in t()');

  const arTranslations = readJson(projectRoot, 'src', 'i18n', 'messages', 'ar.json');
  assert.equal(arTranslations[keyName], '');
});

test('second run with no changes is a no-op', async () => {
  resetKeyGeneratorStateForTesting();
  const projectRoot = makeProject();
  const config = readJson(projectRoot, '.meridianrc.json');

  await runSync(projectRoot, config, mockSpinner, [], {});
  const enAfterFirst = fs.readFileSync(path.join(projectRoot, 'src', 'i18n', 'messages', 'en.json'), 'utf8');
  const appAfterFirst = fs.readFileSync(path.join(projectRoot, 'src', 'App.jsx'), 'utf8');

  const result = await runSync(projectRoot, config, mockSpinner, [], {});

  assert.equal(result.ok, true);
  assert.equal(fs.readFileSync(path.join(projectRoot, 'src', 'i18n', 'messages', 'en.json'), 'utf8'), enAfterFirst, 'locale file untouched');
  assert.equal(fs.readFileSync(path.join(projectRoot, 'src', 'App.jsx'), 'utf8'), appAfterFirst, 'source untouched');
});

test('editing a source file is detected via content hash, not mtime', async () => {
  resetKeyGeneratorStateForTesting();
  const projectRoot = makeProject();
  const config = readJson(projectRoot, '.meridianrc.json');

  await runSync(projectRoot, config, mockSpinner, [], {});
  const keyName = Object.keys(readJson(projectRoot, 'src', 'i18n', 'messages', 'en.json'))[0];

  fs.writeFileSync(path.join(projectRoot, 'src', 'App.jsx'), `
    import { useTranslation } from 'react-i18next';
    export default function App() {
      const { t } = useTranslation();
      return (
        <div>
          {t('${keyName}')}
          <span>Brand New Text</span>
        </div>
      );
    }
  `);

  const result = await runSync(projectRoot, config, mockSpinner, [], {});

  assert.equal(result.ok, true);
  const enTranslations = readJson(projectRoot, 'src', 'i18n', 'messages', 'en.json');
  assert.ok(Object.values(enTranslations).includes('Brand New Text'), 'new string extracted');
});

test('legacy mtime last-sync state falls back to a full re-sync', async () => {
  resetKeyGeneratorStateForTesting();
  const projectRoot = makeProject();
  const config = readJson(projectRoot, '.meridianrc.json');

  fs.writeFileSync(path.join(projectRoot, '.meridian', 'last-sync'), Date.now().toString());

  const result = await runSync(projectRoot, config, mockSpinner, [], {});

  assert.equal(result.ok, true);
  assert.equal(Object.keys(readJson(projectRoot, 'src', 'i18n', 'messages', 'en.json')).length, 1, 'extraction ran');

  const state = JSON.parse(fs.readFileSync(path.join(projectRoot, '.meridian', 'last-sync'), 'utf8'));
  assert.equal(state.format, 'hash-v1', 'state upgraded to hash format');
});
