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
  let text = raw;

  text = text.replace(/^ETSI\s+(EN|TS)\s+(319|119)\s+\d+[-/]\d+.*$/gm, '');
  text = text.replace(/^\s*ETSI\s*$/gm, '');
  text = text.replace(/^\s*\d+\s*$/gm, '');
  text = text.replace(/^.+\s+\.+\s+\d+\s*$/gm, '');
  text = text.replace(/History[\s\S]*$/i, '');
  text = text.replace(/Intellectual Property Rights\s*[\s\S]*?(?=\n\n|$)/gi, '');
  text = text.replace(/Modal verbs terminology\s*[\s\S]*?(?=\n\n|$)/gi, '');
  text = text.replace(/-\n/g, '');
  text = text.replace(/ +/g, ' ');
  text = text.replace(/\n\n\n+/g, '\n\n');

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
