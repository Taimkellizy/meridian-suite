import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSync } from '../utils/sync-runner.js';

const spinnerMock = {
  start: () => spinnerMock,
  stop: () => spinnerMock,
  succeed: () => {},
  fail: () => {},
  success: () => {}
};

function makeReconciliationProject() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-sync-reconciliation-'));

  fs.mkdirSync(path.join(projectRoot, 'src', 'config'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'src', 'i18n', 'messages'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'src', 'components'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.meridian'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, '.meridian', 'config.json'), JSON.stringify({ adapter: 'next-i18next' }));

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

  fs.writeFileSync(path.join(projectRoot, 'src', 'config', 'index.json'), JSON.stringify(configJson, null, 2));
  fs.writeFileSync(path.join(projectRoot, 'src', 'i18n', 'messages', 'en.json'), JSON.stringify(enTranslations, null, 2));
  fs.writeFileSync(path.join(projectRoot, 'src', 'i18n', 'messages', 'ar.json'), JSON.stringify(arTranslations, null, 2));
  fs.writeFileSync(path.join(projectRoot, 'src', 'components', 'Header.tsx'), headerTsx);

  return {
    projectRoot,
    config: { defaultLanguage: 'en', translationCoverageThreshold: 100 }
  };
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

test('check mode reports coverage and never mutates locale files', async () => {
  const { projectRoot, config } = makeReconciliationProject();

  let output;
  let result;
  const capture = captureConsoleLog();
  try {
    result = await runSync(projectRoot, config, spinnerMock, [], { check: true });
  } finally {
    capture.restore();
  }
  output = capture.lines.join('\n');

  assert.equal(result.ok, false, 'coverage below threshold fails the check');
  assert.ok(!output.includes('orphaned keys'), 'data-promoted keys not flagged as orphaned');
  assert.ok(output.includes('[ar] Missing 1 translations'), 'missing static key flagged for ar');
  assert.ok(output.includes('Overall Coverage: 66.67%'), 'coverage calculated correctly');

  const postEn = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src', 'i18n', 'messages', 'en.json'), 'utf8'));
  assert.equal(postEn._data, undefined, '_data must not be written');
});

test('check mode is idempotent — identical report on repeat', async () => {
  const { projectRoot, config } = makeReconciliationProject();

  const outputs = [];
  for (let i = 0; i < 2; i++) {
    const capture = captureConsoleLog();
    try {
      await runSync(projectRoot, config, spinnerMock, [], { check: true });
    } finally {
      capture.restore();
    }
    outputs.push(capture.lines.join('\n'));
  }

  assert.equal(outputs[0], outputs[1], 'sync --check produces identical output');
});
