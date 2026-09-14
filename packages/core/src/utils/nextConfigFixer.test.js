import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nextConfigFixer } from './nextConfigFixer.js';

describe('nextConfigFixer', () => {
  const defaultOpts = { locales: ['en', 'ar', 'es'], defaultLocale: 'en' };

  it('should inject i18n block into a standard CommonJS module.exports', () => {
    const source = `
module.exports = {
  reactStrictMode: true,
  swcMinify: true
};
`;
    const result = nextConfigFixer(source, defaultOpts);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.modified, true);
    assert.match(result.code, /i18n: {/);
    assert.match(result.code, /locales: \[(['"]en['"],\s*){0,1}['"]en['"],\s*['"]ar['"],\s*['"]es['"]\]/);
    assert.match(result.code, /defaultLocale: ['"]en['"]/);
    assert.match(result.code, /swcMinify: true/); // Preserves existing
  });

  it('should inject i18n block into a standard ESM export default', () => {
    const source = `
/** @type {import('next').NextConfig} */
export default {
  images: { domains: ['example.com'] },
};
`;
    const result = nextConfigFixer(source, defaultOpts);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.modified, true);
    assert.match(result.code, /i18n: {/);
    assert.match(result.code, /locales: \[['"]en['"],\s*['"]ar['"],\s*['"]es['"]\]/);
    assert.match(result.code, /defaultLocale: ['"]en['"]/);
    assert.match(result.code, /images: {/); // Preserves existing
  });

  it('should handle variable references in CommonJS', () => {
    const source = `
const nextConfig = {
  env: { key: 'value' }
};

module.exports = nextConfig;
`;
    const result = nextConfigFixer(source, defaultOpts);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.modified, true);
    assert.match(result.code, /i18n: {/);
  });

  it('should safely merge into an existing i18n block', () => {
    const source = `
module.exports = {
  i18n: {
    locales: ['en', 'fr'],
    defaultLocale: 'fr'
  }
};
`;
    const result = nextConfigFixer(source, defaultOpts);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.modified, true);
    // Should merge ar and es into the array, and update defaultLocale to en
    assert.match(result.code, /locales: \[['"]en['"],\s*['"]fr['"],\s*['"]ar['"],\s*['"]es['"]\]/);
    assert.match(result.code, /defaultLocale: ['"]en['"]/);
  });

  it('should return not modified if everything is already configured perfectly', () => {
    const source = `
module.exports = {
  i18n: {
    locales: ['en', 'ar', 'es'],
    defaultLocale: 'en'
  }
};
`;
    const result = nextConfigFixer(source, defaultOpts);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.modified, false);
  });

  it('should support and inject into wrapped configuration exports', () => {
    const source = `
const withBundleAnalyzer = require('@next/bundle-analyzer')();
module.exports = withBundleAnalyzer({
  reactStrictMode: true
});
`;
    const result = nextConfigFixer(source, defaultOpts);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.modified, true);
    assert.match(result.code, /i18n: {/);
    assert.match(result.code, /reactStrictMode: true/);
  });

  it('should bailout on async function exports', () => {
    const source = `
module.exports = async (phase, { defaultConfig }) => {
  return {
    reactStrictMode: true
  };
};
`;
    const result = nextConfigFixer(source, defaultOpts);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.modified, false);
    assert.match(result.reason, /complex expression|async function/);
  });

  it('should bailout on conditional variables', () => {
    const source = `
let config;
if (process.env.NODE_ENV === 'development') {
  config = { dev: true };
} else {
  config = { dev: false };
}
module.exports = config;
`;
    const result = nextConfigFixer(source, defaultOpts);
    // Our resolver won't find a direct ObjectExpression init for config
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.modified, false);
  });
});
