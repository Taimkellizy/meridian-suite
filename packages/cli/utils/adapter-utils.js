import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { getAdapter, detectAdapter } from '@meridian/core';

/**
 * Resolves the active translation adapter instance for the workspace.
 * Reads configuration from .meridian/config.json, falling back to dynamic detection if missing.
 * @param {string} cwd - The workspace root path.
 * @returns {Object} The resolved adapter instance.
 */
export function getActiveAdapterInstance(cwd) {
  const configPath = path.join(cwd, '.meridian', 'config.json');
  let adapterName = null;
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      adapterName = config.adapter;
    } catch (e) {
      // Configuration read issues are ignored; fallback to dynamic detection
    }
  }

  if (!adapterName) {
    console.log(chalk.yellow('⚠️  Warning: .meridian/config.json not found. Falling back to dynamic adapter detection.'));
    try {
      const detected = detectAdapter(cwd);
      adapterName = detected.name;
    } catch (err) {
      console.log(chalk.red(`❌ Error: ${err.message}`));
      process.exit(1);
    }
  }

  return getAdapter(adapterName);
}
