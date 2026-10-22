import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJsonFile } from '../utils/jsonConfig.js';

test('parses a valid JSON file', () => {
  const filePath = path.join(os.tmpdir(), `meridian-json-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ languages: ['en', 'ar'] }));

  const config = readJsonFile(filePath);

  assert.deepEqual(config, { languages: ['en', 'ar'] });
  fs.unlinkSync(filePath);
});

test('missing file throws a friendly error naming the file', () => {
  const filePath = path.join(os.tmpdir(), 'meridian-missing-config.json');

  assert.throws(() => readJsonFile(filePath), (err) => {
    return err instanceof Error
      && err.message.includes(filePath)
      && /meridian init/.test(err.message);
  });
});

test('invalid JSON throws a friendly error naming the file', () => {
  const filePath = path.join(os.tmpdir(), `meridian-broken-${Date.now()}.json`);
  fs.writeFileSync(filePath, '{ not json ');

  assert.throws(() => readJsonFile(filePath), (err) => {
    return err instanceof Error
      && err.message.includes(filePath)
      && /meridian init/.test(err.message);
  });
  fs.unlinkSync(filePath);
});
