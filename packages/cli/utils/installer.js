import fs from 'fs';
import path from 'path';
import { execa } from 'execa';

/**
 * Detects the package manager and installs i18next dependencies asynchronously.
 * @param {string} cwd - Current working directory of the user's project
 * @param {Object} [versions={}] - Key-value map of dependencies to install. E.g. { i18next: '^22.5.1' }
 * @returns {Promise<void>}
 */
export async function installI18nDependencies(cwd, versions = {}) {
  let pm = 'npm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    pm = 'yarn';
  } else if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    pm = 'pnpm';
  } else if (fs.existsSync(path.join(cwd, 'bun.lockb'))) {
    pm = 'bun';
  }

  const args = pm === 'npm' ? ['install', '--save'] : ['add'];
  
  const getPkgString = (pkg) => versions[pkg] && versions[pkg] !== 'latest' ? `${pkg}@${versions[pkg]}` : pkg;
  args.push(getPkgString('i18next'), getPkgString('react-i18next'), 'i18next-browser-languagedetector', 'i18next-http-backend');

  try {
    await execa(pm, args, { cwd });
  } catch (err) {
    throw new Error(`Failed to install i18next dependencies using ${pm}: ${err.message}`);
  }
}
