import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDocumentFallback } from '../utils/documentFallback.js';

function makePagesDir({ withDocument = false, withApp = false }) {
  const pagesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-doc-fallback-'));
  if (withApp) fs.writeFileSync(path.join(pagesDir, '_app.tsx'), 'export default function App() {}');
  if (withDocument) fs.writeFileSync(path.join(pagesDir, '_document.tsx'), 'export default function Document() {}');
  return pagesDir;
}

const templatesDir = path.join(os.tmpdir(), 'meridian-doc-fallback-templates');

test('returns existing _document.tsx without fallback', () => {
  const pagesDir = makePagesDir({ withDocument: true, withApp: true });
  const result = resolveDocumentFallback({ pagesDir, hasPagesApp: true, templatesDir });

  assert.equal(result.docExists, true);
  assert.equal(result.docPath, path.join(pagesDir, '_document.tsx'));
  assert.equal(result.fallbackDest, null);
  assert.equal(result.fallbackSrc, null);
});

test('returns existing _document.jsx without fallback', () => {
  const pagesDir = makePagesDir({ withApp: true });
  fs.writeFileSync(path.join(pagesDir, '_document.jsx'), 'export default function Document() {}');
  const result = resolveDocumentFallback({ pagesDir, hasPagesApp: true, templatesDir });

  assert.equal(result.docExists, true);
  assert.equal(result.docPath, path.join(pagesDir, '_document.jsx'));
  assert.equal(result.fallbackDest, null);
});

test('proposes fallback _document.tsx when _app exists without _document', () => {
  const pagesDir = makePagesDir({ withApp: true });
  const result = resolveDocumentFallback({ pagesDir, hasPagesApp: true, templatesDir });

  assert.equal(result.docExists, false);
  assert.equal(result.docPath, null);
  assert.equal(result.fallbackDest, path.join(pagesDir, '_document.tsx'));
  assert.equal(result.fallbackSrc, path.join(templatesDir, 'nextjs', '_document.tsx'));
});

test('no fallback when pages app is absent', () => {
  const pagesDir = makePagesDir({});
  const result = resolveDocumentFallback({ pagesDir, hasPagesApp: false, templatesDir });

  assert.equal(result.docExists, false);
  assert.equal(result.docPath, null);
  assert.equal(result.fallbackDest, null);
  assert.equal(result.fallbackSrc, null);
});

test('no fallback when there is no pages directory', () => {
  const result = resolveDocumentFallback({ pagesDir: null, hasPagesApp: false, templatesDir });

  assert.equal(result.docExists, false);
  assert.equal(result.docPath, null);
  assert.equal(result.fallbackDest, null);
  assert.equal(result.fallbackSrc, null);
});

test('prefers _document.tsx over _document.jsx', () => {
  const pagesDir = makePagesDir({ withApp: true });
  fs.writeFileSync(path.join(pagesDir, '_document.jsx'), 'export default function Document() {}');
  fs.writeFileSync(path.join(pagesDir, '_document.tsx'), 'export default function Document() {}');
  const result = resolveDocumentFallback({ pagesDir, hasPagesApp: true, templatesDir });

  assert.equal(result.docPath, path.join(pagesDir, '_document.tsx'));
});
