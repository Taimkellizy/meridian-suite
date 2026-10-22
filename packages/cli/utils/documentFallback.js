import fs from 'fs';
import path from 'path';

const DOCUMENT_CANDIDATES = ['_document.tsx', '_document.jsx'];

const EMPTY_RESULT = { docExists: false, docPath: null, fallbackSrc: null, fallbackDest: null };

export function resolveDocumentFallback({ pagesDir, hasPagesApp, templatesDir }) {
  if (!pagesDir) {
    return EMPTY_RESULT;
  }

  for (const candidate of DOCUMENT_CANDIDATES) {
    const docPath = path.join(pagesDir, candidate);
    if (fs.existsSync(docPath)) {
      return { docExists: true, docPath, fallbackSrc: null, fallbackDest: null };
    }
  }

  if (!hasPagesApp) {
    return EMPTY_RESULT;
  }

  return {
    docExists: false,
    docPath: null,
    fallbackSrc: path.join(templatesDir, 'nextjs', '_document.tsx'),
    fallbackDest: path.join(pagesDir, '_document.tsx')
  };
}
