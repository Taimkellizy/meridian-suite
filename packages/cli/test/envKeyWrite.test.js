import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { saveApiKeyToEnv } from '../utils/envKeyWrite.js';

function makeEnvDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-env-'));
}

test('creates .env when missing', () => {
  const envPath = path.join(makeEnvDir(), '.env');

  const status = saveApiKeyToEnv(envPath, 'sk-test');

  assert.equal(status, 'created');
  assert.equal(fs.readFileSync(envPath, 'utf8'), 'MERIDIAN_API_KEY=sk-test\n');
});

test('appends key to existing .env without one', () => {
  const dir = makeEnvDir();
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(envPath, 'OTHER_VAR=1\n');

  const status = saveApiKeyToEnv(envPath, 'sk-test');
  const content = fs.readFileSync(envPath, 'utf8');

  assert.equal(status, 'appended');
  assert.ok(content.startsWith('OTHER_VAR=1\n'));
  assert.ok(/MERIDIAN_API_KEY=sk-test\n$/.test(content));
});

test('skips when MERIDIAN_API_KEY already exists, file untouched', () => {
  const dir = makeEnvDir();
  const envPath = path.join(dir, '.env');
  const original = 'MERIDIAN_API_KEY=sk-existing\nOTHER_VAR=1\n';
  fs.writeFileSync(envPath, original);

  const status = saveApiKeyToEnv(envPath, 'sk-new');

  assert.equal(status, 'exists');
  assert.equal(fs.readFileSync(envPath, 'utf8'), original);
});
