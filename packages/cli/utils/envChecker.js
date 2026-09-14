import fs from 'fs';
import path from 'path';

/**
 * Strips non-numeric prefixes (like ^, ~, >=) and returns the major version as an integer.
 * @param {string} versionStr - The version string from package.json
 * @returns {number|null} The major version, or null if unparseable
 */
function getMajorVersion(versionStr) {
  if (!versionStr) return null;
  const clean = versionStr.replace(/^[^\d]+/, '');
  const parts = clean.split('.');
  const major = parseInt(parts[0], 10);
  return isNaN(major) ? null : major;
}

/**
 * Checks the host project's environment for compatibility and determines fallback requirements.
 * @param {string} cwd - The current working directory of the user project
 * @returns {{ status: 'unsupported' | 'legacy' | 'supported', reason?: string, dependencies?: Object, nextjsWarning?: string }}
 */
export function checkEnvironment(cwd) {
  const packageJsonPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    // If no package.json, we can't do much, assume supported and let npm complain
    return { status: 'supported', dependencies: { i18next: 'latest', 'react-i18next': 'latest' } };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

    const reactVer = deps['react'];
    const tsVer = deps['typescript'];
    const nextVer = deps['next'];

    const reactMajor = getMajorVersion(reactVer);
    const tsMajor = getMajorVersion(tsVer);
    const nextMajor = getMajorVersion(nextVer);

    // 1. Check for Unsupported React Version
    // Meridian injects React Hooks, which were introduced in React 16.8
    if (reactMajor !== null && reactMajor < 16) {
      return {
        status: 'unsupported',
        reason: `React version ${reactVer} detected. Meridian requires React 16.8+ to utilize Hooks (useTranslation). Please upgrade React to use Meridian.`
      };
    }

    // Prepare our response payload
    const result = {
      status: 'supported',
      dependencies: { i18next: 'latest', 'react-i18next': 'latest' }
    };

    // 2. Check for Next.js routing warning
    if (nextMajor !== null && nextMajor < 13) {
      result.nextjsWarning = `ℹ️ Next.js < 13 detected (${nextVer}). Meridian will use the Pages Router injection strategy.`;
    }

    // 3. Check for Legacy TypeScript fallback
    // i18next v23+ requires TypeScript 5.0+ because of const type parameters
    if (tsMajor !== null && tsMajor < 5) {
      result.status = 'legacy';
      result.dependencies = {
        i18next: '^22.5.1',
        'react-i18next': '^12.1.1'
      };
    }

    return result;
  } catch (err) {
    // If JSON parsing fails, just default
    return { status: 'supported', dependencies: { i18next: 'latest', 'react-i18next': 'latest' } };
  }
}
