import fs from 'fs';
import path from 'path';
import { nextDocumentFixer } from './nextDocumentFixer.js';
import { nextLayoutFixer } from './nextLayoutFixer.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Next.js Fixers', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync('meridian-test-');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('nextDocumentFixer should not inject a literal "en" string for lang', () => {
    const filePath = path.join(tmpDir, '_document.tsx');
    const source = `
import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
    `;
    fs.writeFileSync(filePath, source);

    nextDocumentFixer(filePath);

    const updatedSource = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(updatedSource.includes('lang="en"'), false);
    assert.strictEqual(updatedSource.includes("lang={'en'}"), false);
    assert.match(updatedSource, /lang={this\.props\.locale}/);
    assert.match(updatedSource, /dir={dirFromLocale\(this\.props\.locale\)}/);
    assert.match(updatedSource, /locale:\s*ctx\.locale\s*\|\|\s*defaultLocale/);
    assert.match(updatedSource, /import.*defaultLocale.*from/);
  });

  it('nextDocumentFixer should throw explicit error if no Html tag is found', () => {
    const filePath = path.join(tmpDir, '_document.tsx');
    const source = `
export default function MyDocument() {
  return <div>Missing Html tag</div>;
}
    `;
    fs.writeFileSync(filePath, source);

    assert.throws(() => {
      nextDocumentFixer(filePath);
    }, /No <Html> tag found/);
  });

  it('nextLayoutFixer should correctly handle dynamic segment and not inject literal "en"', () => {
    const appDir = path.join(tmpDir, 'src', 'app', '[locale]');
    fs.mkdirSync(appDir, { recursive: true });
    
    const filePath = path.join(appDir, 'layout.tsx');
    const source = `
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
    `;
    fs.writeFileSync(filePath, source);

    nextLayoutFixer(filePath);

    const updatedSource = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(updatedSource.includes('lang="en"'), false);
    assert.strictEqual(updatedSource.includes("lang={'en'}"), false);
    assert.match(updatedSource, /lang={params\.locale}/);
    assert.match(updatedSource, /dir={dirFromLocale\(params\.locale\)}/);
    assert.match(updatedSource, /params,/); 
  });

  it('nextLayoutFixer should throw explicit error if component has no parameters', () => {
    const appDir = path.join(tmpDir, 'src', 'app', '[lang]');
    fs.mkdirSync(appDir, { recursive: true });
    
    const filePath = path.join(appDir, 'layout.tsx');
    const source = `
export default function RootLayout() {
  return (
    <html>
      <body>No params here</body>
    </html>
  );
}
    `;
    fs.writeFileSync(filePath, source);

    assert.throws(() => {
      nextLayoutFixer(filePath);
    }, /The default exported layout component has no parameters/);
  });
});
