// src/services/pdf.service.js
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);

// 1) Worker-Datei in node_modules auflösen …
const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');

// 2) … in eine file:// URL umwandeln (wichtig für Windows/ESM)
GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

export async function extractText(buffer) {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    // Stabilitäts-Optionen für Node:
    isEvalSupported: false,
    useWorkerFetch: false,
    isSystemFontLoadingAllowed: false,
  });

  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = content.items
      .map(it => (it && 'str' in it ? it.str : ''))
      .filter(Boolean);
    fullText += lines.join(' ') + '\n\n';
  }
  
  return fullText.replace(/\r\n/g, '\n').replace(/\f/g, '\n').trim();
}
