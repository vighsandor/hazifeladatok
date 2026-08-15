import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { extractText, getDocumentProxy } from 'unpdf';

export interface LoadedDoc {
  id: string;
  title: string;
  url: string;
  file: string;
  text: string;
}

export function cleanEtsiText(raw: string): string {
  // Fix line-end hyphenation before splitting
  let text = raw.replace(/-\n(\w)/g, '$1');

  // Split into lines
  const lines = text.split(/\r?\n/);

  // Filter lines
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();

    // Keep empty lines
    if (!trimmed) return true;

    // Remove ETSI-only lines
    if (trimmed === 'ETSI') return false;

    // Remove ETSI header lines (running headers)
    if (/^ETSI\s+(EN|TS)\s+\d/.test(trimmed)) return false;

    // Remove version pattern lines (V1.2.1 (2022-02))
    if (/V\d+\.\d+\.\d+\s*\(\d{4}-\d{2}\)/.test(trimmed)) return false;

    // Remove page numbers (1-4 digits only)
    if (/^\d{1,4}$/.test(trimmed)) return false;

    // Remove TOC lines (3+ dots followed by page number)
    if (/\.{3,}\s*\d+\s*$/.test(trimmed)) return false;

    return true;
  });

  // Join back and normalize spacing
  text = filtered.join('\n');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export async function loadDocs(sourcesDir: string = 'sources'): Promise<LoadedDoc[]> {
  const manifestPath = resolve(sourcesDir, 'manifest.json');
  const manifestContent = await readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestContent);

  const docs: LoadedDoc[] = [];

  for (const entry of manifest) {
    const pdfPath = resolve(sourcesDir, entry.file);
    const buf = await readFile(pdfPath);
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text: rawText } = await extractText(pdf, { mergePages: true });
    const text = cleanEtsiText(rawText);

    docs.push({
      id: entry.id,
      title: entry.title,
      url: entry.url,
      file: entry.file,
      text,
    });
  }

  return docs;
}
