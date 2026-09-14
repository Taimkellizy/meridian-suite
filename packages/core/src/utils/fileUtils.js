import fs from 'fs';

/**
 * Safely writes to a file by writing to a temporary file first, then renaming it.
 * This prevents corrupting the file if the process crashes mid-write.
 *
 * @param {string} filePath - The absolute path of the file to write
 * @param {string} content - The content to write
 */
export function atomicWriteFile(filePath, content) {
  const tmpPath = `${filePath}.meridian-tmp`;
  try {
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
    throw new Error(`Failed to atomically write file ${filePath}: ${err.message}`);
  }
}

/**
 * Computes a relative import path from a source file to a target sub-path within the project root.
 *
 * @param {string} fromFilePath - The absolute path to the file doing the importing
 * @param {string} targetRelSubPath - The relative path of the target from the src/app root (e.g., 'i18n/locales')
 * @returns {string} The relative import string (e.g., '../../i18n/locales')
 */
export function computeRelativeImport(fromFilePath, targetRelSubPath) {
  const normalised = fromFilePath.replace(/\\/g, '/');
  const sourceRoots = ['src', 'app'];
  let srcRootAbsolute = null;

  for (const root of sourceRoots) {
    const idx = normalised.lastIndexOf(`/${root}/`);
    if (idx !== -1) {
      const candidate = normalised.slice(0, idx + root.length + 2);
      if (!srcRootAbsolute || candidate.length > srcRootAbsolute.length) {
        srcRootAbsolute = candidate;
      }
    }
  }

  if (!srcRootAbsolute) {
    srcRootAbsolute = normalised.substring(0, normalised.lastIndexOf('/') + 1);
  }

  const fileDir = normalised.substring(0, normalised.lastIndexOf('/'));
  const targetAbsolute = `${srcRootAbsolute.replace(/\/$/, '')}/${targetRelSubPath}`;
  
  const fromParts = fileDir.split('/').filter(Boolean);
  const toParts = targetAbsolute.split('/').filter(Boolean);
  
  let common = 0;
  while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) {
    common++;
  }
  
  const ups = fromParts.length - common;
  const downs = toParts.slice(common);
  const rel = [...Array(ups).fill('..'), ...downs].join('/');
  
  return rel.startsWith('.') ? rel : `./${rel}`;
}
