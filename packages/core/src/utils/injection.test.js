import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { injectVanillaLogic } from './vanillaInjector.js';
import { injectProvider, injectToggle } from './reactInjector.js';
import { injectDirToHtml } from './htmlInjector.js';
import { injectDirAttribute } from './dirInjector.js';
import fs from 'fs';

describe('Vanilla Injector', () => {
  it('injects button and script into HTML', async () => {
    // Mock DOMParser for Node test environment
    const { JSDOM } = await import('jsdom');
    const { window } = new JSDOM();
    global.DOMParser = window.DOMParser;
    const html = '<html><body><nav><ul></ul></nav></body></html>';
    const result = injectVanillaLogic(html);
    assert.match(result, /id="lang-toggle"/);
    assert.match(result, /<script>/);
    assert.match(result, /localStorage\.getItem\('appLang'\)/);
  });
});

describe('React Injector', () => {

  describe('injectProvider', () => {
    it('wraps App return with LanguageProvider (2 spaces)', () => {
      const code = `import React from 'react';
function App() {
  return (
    <div className="App">
      <h1>Hello</h1>
    </div>
  )
}
export default App;`;
      const result = injectProvider(code);
      assert.ok(result.includes('import { LanguageProvider, LanguageContext } from "./contexts/LanguageContext";'));
      assert.ok(result.includes('<LanguageProvider>'));
      assert.ok(result.includes('  <App {...props} />'));
      assert.ok(result.includes('</LanguageProvider>'));
    });

    it('wraps App return with LanguageProvider (4 spaces)', () => {
        const code = `import React from 'react';
function App() {
    return (
        <div className="App">
            <h1>Hello</h1>
        </div>
    )
}
export default App;`;
        const result = injectProvider(code);
        assert.ok(result.includes('    <App {...props} />')); 
        assert.ok(result.includes('<LanguageProvider>'));
    });

    it('does not inject twice', () => {
        const code = `import React from 'react';
import { useContext } from "react";
import { LanguageProvider, LanguageContext } from "./contexts/LanguageContext";
function App() {
  const { text } = useContext(LanguageContext);
  return (
    <div />
  )
}
const AppWithLang = (props) => (
  <LanguageProvider>
    <App {...props} />
  </LanguageProvider>
);
export default AppWithLang;`;
        const result = injectProvider(code);
        assert.strictEqual(result.replace(/\r?\n/g, '\n'), code.replace(/\r?\n/g, '\n'));
    });

    it('skips wrap and emits warning if _app.tsx is already wrapped (double-wrap pattern)', (t) => {
        const warnings = [];
        t.mock.method(console, 'warn', (...args) => {
            warnings.push(args.join(' '));
        });
        
        t.mock.method(fs, 'existsSync', (p) => {
            if (p.includes('_app')) return true;
            return false;
        });

        t.mock.method(fs, 'readFileSync', (p) => {
            if (p.includes('_app')) {
                return `
import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
function MyApp({ Component, pageProps }) {
  return (
    <LanguageProvider>
      <Component {...pageProps} />
    </LanguageProvider>
  );
}
export default MyApp;`;
            }
            return '';
        });

        const code = `import React from 'react';
function HomePage() {
  return (
    <div className="HomePage">
      <h1>Hello</h1>
    </div>
  )
}
export default HomePage;`;

        const fileName = '/src/pages/index.tsx';
        const result = injectProvider(code, {}, fileName);
        
        assert.strictEqual(result.includes('<LanguageProvider>'), false);
        assert.ok(warnings.some(w => w.includes('meridian sync warning: /src/pages/index.tsx is already wrapped by a provider in')));
        assert.ok(warnings.some(w => w.includes('skipping duplicate wrap')));
    });
  });

  describe('injectToggle', () => {
    it('injects into <ul> inside <nav> as <li> (Smart Placement)', () => {
      const code = `import React from 'react';
function Navbar() {
  return (
    <nav>
      <ul>
        <li>Home</li>
      </ul>
    </nav>
  );
}`;
      const { code: result } = injectToggle(code);
      assert.ok(result.includes('import LanguageToggle from "./components/LanguageToggle";'));
      assert.ok(result.includes('<LanguageToggle />'));
    });

    it('injects into <nav> directly if no list found', () => {
        const code = `import React from 'react';
function Navbar() {
  return (
    <nav>
      <div>Logo</div>
    </nav>
  );
}`;
        const { code: result } = injectToggle(code);
        assert.ok(result.includes('<LanguageToggle />'));
        assert.strictEqual(result.includes('<li><LanguageToggle /></li>'), false);
        assert.match(result, /<LanguageToggle \/>\s*<\/nav>/);
    });

    it('injects into <header> if no <nav> found (Fallback)', () => {
        const originalCode = `import React from 'react';
function Header() {
  return (
    <header>
      <h1>My App</h1>
    </header>
  );
}`;
        const { code: result } = injectToggle(originalCode);
        assert.ok(result.includes('LanguageToggle'));
        assert.match(result, /<LanguageToggle \/>\s*<\/header>/);
    });

    it('detects and respects 4-space indentation', () => {
        const code = `import React from 'react';
function Navbar() {
    return (
        <nav>
            <ul>
                <li>Home</li>
            </ul>
        </nav>
    );
}`;
        const { code: result } = injectToggle(code);
        assert.ok(result.includes('  <LanguageToggle />'));
    });

    it('detects and respects 2-space indentation', () => {
        const code = `import React from 'react';
function Navbar() {
  return (
    <nav>
      <ul>
        <li>Home</li>
      </ul>
    </nav>
  );
}`;
        const { code: result } = injectToggle(code);
        assert.ok(result.includes('  <LanguageToggle />'));
    });
  });
});

describe('HTML Injector', () => {
  it('injects dynamic RTL script into index.html', async () => {
    const path = await import('path');
    const os = await import('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-html-test-'));
    try {
      const htmlPath = path.join(tmpDir, 'index.html');
      fs.writeFileSync(htmlPath, '<html><head></head><body></body></html>');
      
      const modified = injectDirToHtml(tmpDir, ['he', 'en', 'fa']);
      assert.strictEqual(modified, true);
      
      const content = fs.readFileSync(htmlPath, 'utf8');
      assert.match(content, /dir="ltr"/);
      assert.match(content, /rtlLangs = \["he","fa"\]/);
      assert.match(content, /document\.documentElement\.dir = isRtl \? 'rtl' : 'ltr'/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('Dir Attribute Injector', () => {
  it('injects dir attribute and imports into _document (files with existing imports)', async () => {
    const path = await import('path');
    const os = await import('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-dir-test-'));
    try {
      const docPath = path.join(tmpDir, '_document.tsx');
      fs.writeFileSync(docPath, `import Document from 'next/document';
export default function MyDocument() {
  return <Html><body></body></Html>;
}`);
      
      const modified = injectDirAttribute(docPath, ['he', 'en']);
      assert.strictEqual(modified, true);
      
      const content = fs.readFileSync(docPath, 'utf8');
      assert.match(content, /dir=\{locales\.find/);
      assert.match(content, /import i18n from/);
      assert.match(content, /import \{ locales \} from/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('injects dir attribute and imports into _document (files with NO imports)', async () => {
    const path = await import('path');
    const os = await import('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-dir-no-import-test-'));
    try {
      const docPath = path.join(tmpDir, '_document.tsx');
      fs.writeFileSync(docPath, `export default function MyDocument() {
  return <Html><body></body></Html>;
}`);
      
      const modified = injectDirAttribute(docPath, ['he', 'en']);
      assert.strictEqual(modified, true);
      
      const content = fs.readFileSync(docPath, 'utf8');
      assert.match(content, /dir=\{locales\.find/);
      assert.match(content, /import i18n from/);
      assert.match(content, /import \{ locales \} from/);
      assert.ok(content.startsWith('import i18n from'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
