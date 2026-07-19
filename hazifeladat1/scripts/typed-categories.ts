import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * Szemléltető script az L1/L2 (app-réteg vs. agent-réteg) kontraszthoz.
 *
 * Ugyanazt kérdezi le, mint a list_categories AGENT-tool, de itt TÍPUSOS
 * Prisma-lekérdezéssel, az APP-rétegben (fejlesztői oldal). Az agent ezzel
 * szemben nyers, csak-olvasó SQL-t futtat futásidőben.
 *
 * Futtatás:  pnpm typed-categories   (előbb: pnpm db:generate)
 */
async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.product.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    console.log('Kategóriák (típusos Prisma-lekérdezés, app-réteg):');
    for (const r of rows) console.log(` - ${r.category}`);
    console.log(`\nÖsszesen: ${rows.length} kategória.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
