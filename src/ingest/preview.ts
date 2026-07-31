import { readFile, statSync } from 'fs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractText, getDocumentProxy } from 'unpdf';
import { loadDocs } from './load.js';
import { cleanEtsiText } from './load.js';

async function preview() {
  const pkgPath = resolve(import.meta.dirname, '..', '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const unpdfVersion = pkg.dependencies.unpdf;

  console.log(`\n📦 unpdf version: ${unpdfVersion}\n`);

  const docs = await loadDocs();
  console.log(`📄 Loaded ${docs.length} documents\n`);

  const manifests = JSON.parse(
    readFileSync(resolve('sources', 'manifest.json'), 'utf-8')
  );
  const fileMap = new Map(manifests.map((m: any) => [m.id, m.file]));

  const diagnostics: Array<{
    id: string;
    fileSizeKb: number;
    rawLength: number;
    cleanLength: number;
    wordCount: number;
  }> = [];

  let xadesRawText = '';

  for (const doc of docs) {
    const fileName = fileMap.get(doc.id);
    const filePath = resolve('sources', fileName);
    const stats = statSync(filePath);
    const fileSizeKb = (stats.size / 1024).toFixed(2);

    const buffer = readFileSync(filePath);
    const pdfProxy = await getDocumentProxy(new Uint8Array(buffer));
    const { text: rawText } = await extractText(pdfProxy, { mergePages: true });
    const cleanText = cleanEtsiText(rawText);
    const wordCount = cleanText.split(/\s+/).filter((w) => w.length > 0).length;

    diagnostics.push({
      id: doc.id,
      fileSizeKb: parseFloat(fileSizeKb as string),
      rawLength: rawText.length,
      cleanLength: cleanText.length,
      wordCount,
    });

    if (doc.id === 'ETSI EN 319 132-1') {
      xadesRawText = rawText;
    }
  }

  console.log(
    '📊 Document Statistics:\n' +
      'ID | File Size (KB) | Raw Chars | Clean Chars | Words\n' +
      '─'.repeat(75)
  );

  for (const d of diagnostics) {
    const id = d.id.padEnd(25);
    const size = d.fileSizeKb.toString().padEnd(14);
    const raw = d.rawLength.toString().padEnd(10);
    const clean = d.cleanLength.toString().padEnd(11);
    console.log(`${id} | ${size} | ${raw} | ${clean} | ${d.wordCount}`);
  }

  console.log(
    '\n🔍 Raw text sample from ETSI EN 319 132-1 (first 1500 chars before cleaning):\n'
  );
  console.log(xadesRawText.substring(0, 1500));
  console.log('\n');
}

preview().catch(console.error);
