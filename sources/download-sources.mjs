// A sources/manifest.json alapján letölti a 20 ETSI PDF-et a sources/ mappába.
// Futtatás (a projekt gyökeréből, ahol a sources/ van):
//   node sources/download-sources.mjs
// Node 20+ kell (globális fetch). Kihagyja azt, ami már letöltődött.

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(here, 'manifest.json');

async function exists(p) {
  try {
    const s = await stat(p);
    return s.size > 0;
  } catch {
    return false;
  }
}

async function main() {
  const docs = JSON.parse(await readFile(manifestPath, 'utf-8'));
  await mkdir(here, { recursive: true });

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    const out = join(here, doc.file);
    if (await exists(out)) {
      console.log(`↷ már megvan: ${doc.file}`);
      skipped++;
      continue;
    }
    process.stdout.write(`⇩ ${doc.id} … `);
    try {
      const res = await fetch(doc.url, {
        redirect: 'follow',
        headers: {
          // Néhány szerver User-Agent nélkül elutasít:
          'User-Agent': 'Mozilla/5.0 (RAG-ingest ETSI knowledge base)',
          Accept: 'application/pdf,*/*',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      // Minimális ellenőrzés: PDF-fejléc?
      if (!buf.subarray(0, 5).toString('latin1').startsWith('%PDF')) {
        throw new Error('a válasz nem PDF (lehet, hogy átirányítás vagy hibaoldal)');
      }
      await writeFile(out, buf);
      console.log(`kész (${(buf.length / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (err) {
      console.log(`HIBA: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nÖsszegzés: ${ok} letöltve, ${skipped} kihagyva, ${failed} hibás (összesen ${docs.length}).`);
  if (failed > 0) {
    console.log(
      'A hibás elemeket töltsd le kézzel a manifest URL-jéről; ha egy verziós link 404-et ad,\n' +
        'keresd meg a legfrissebb verziót az ETSI portálon és frissítsd a manifest url-jét.',
    );
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
