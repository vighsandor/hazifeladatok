import { loadDocs } from './load.js';

async function preview() {
  const docs = await loadDocs();

  console.log(`\n📄 Loaded ${docs.length} documents\n`);

  let totalWords = 0;

  for (const doc of docs) {
    const wordCount = doc.text.split(/\s+/).filter((w) => w.length > 0).length;
    totalWords += wordCount;
    console.log(`${doc.id}: ${wordCount} words`);
  }

  console.log(`\n📊 Total words across all documents: ${totalWords}\n`);

  const xadesDoc = docs.find((d) => d.id === 'ETSI EN 319 132-1');
  const certDoc = docs.find((d) => d.id === 'ETSI EN 319 412-2');

  if (xadesDoc) {
    console.log('📖 First 800 chars from ETSI EN 319 132-1 (XAdES):');
    console.log(xadesDoc.text.substring(0, 800));
    console.log('\n');
  }

  if (certDoc) {
    console.log('📖 First 800 chars from ETSI EN 319 412-2 (natural-person certificate profile):');
    console.log(certDoc.text.substring(0, 800));
    console.log('\n');
  }
}

preview().catch(console.error);
