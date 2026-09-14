import fs from 'fs';
import path from 'path';

/** @type {Set<string>} BCP-47 language codes that use a right-to-left script. */
const RTL_LANGUAGE_CODES = new Set([
  'ar', 'he', 'fa', 'ur', 'ku', 'dv', 'ps', 'sd', 'ug', 'yi'
]);



/**
 * Writes file contents through Meridian's temp-file swap pattern.
 *
 * @param {string} filePath - Absolute path to write.
 * @param {string} content  - New file contents.
 * @returns {void}
 * @throws {Error} When the temporary write or rename fails.
 */
function atomicWriteFile(filePath, content) {
  const tmpPath = `${filePath}.meridian-tmp`;
  try {
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    throw err;
  }
}

/**
 * Locates the project's root `index.html` by checking `public/index.html`
 * first, then the project root `index.html`.
 *
 * @param {string} projectRoot - Absolute project root directory.
 * @returns {string|null} Absolute path to the HTML file, or `null` if not found.
 */
function findIndexHtml(projectRoot) {
  const candidates = [
    path.join(projectRoot, 'public', 'index.html'),
    path.join(projectRoot, 'index.html')
  ];
  return candidates.find(p => fs.existsSync(p)) ?? null;
}

/**
 * Injects RTL support into a standard React project's `public/index.html`.
 *
 * **Behaviour**
 * - If the project has no RTL language configured the file is left untouched.
 * - If `index.html` cannot be found the function returns `false` silently.
 * - If `<html` already has a `dir` attribute the file is left unchanged
 *   (idempotent).
 * - Otherwise:
 *   1. `<html` is replaced with `<html dir="ltr"` (static default; JavaScript
 *      will update it at runtime).
 *   2. A small inline `<script>` is inserted immediately before `</head>` that
 *      reads `localStorage.getItem('i18nextLng')` and sets
 *      `document.documentElement.dir` accordingly, ensuring the correct
 *      direction is applied before React hydrates.
 * - Uses the atomic write pattern (`.meridian-tmp` swap).
 *
 * @param {string}   projectRoot - Absolute path to the project root.
 * @param {string[]} languages   - Language codes configured for the project.
 * @returns {boolean} `true` when the file was modified; `false` otherwise.
 */
export function injectDirToHtml(projectRoot, languages) {
  const hasRTL = languages.some(l => RTL_LANGUAGE_CODES.has(l));
  if (!hasRTL) return false;

  const htmlPath = findIndexHtml(projectRoot);
  if (!htmlPath) return false;

  let source = fs.readFileSync(htmlPath, 'utf8');

  // Idempotency — already has a dir attribute on the html tag.
  if (/<html[^>]*\bdir\s*=/.test(source)) return false;

  // 1. Add static dir="ltr" default to the <html> opening tag.
  source = source.replace(/(<html)(\s|>)/, '$1 dir="ltr"$2');

  // Generate dynamic RTL detection script
  const configuredRtlLangs = languages.filter(l => RTL_LANGUAGE_CODES.has(l));
  const rtlDetectionScript = `\n<script>
  (function() {
    var rtlLangs = ${JSON.stringify(configuredRtlLangs)};
    var currentLng = localStorage.getItem('i18nextLng') || '';
    var isRtl = rtlLangs.some(function(lang) {
      return currentLng === lang || currentLng.indexOf(lang + '-') === 0;
    });
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  })();
</script>`;

  // 2. Insert the detection script before </head>.
  if (source.includes('</head>')) {
    source = source.replace('</head>', `${rtlDetectionScript}\n</head>`);
  }

  atomicWriteFile(htmlPath, source);
  return true;
}
