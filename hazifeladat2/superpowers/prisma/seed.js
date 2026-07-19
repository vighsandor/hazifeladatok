const { PrismaClient } = require("@prisma/client");
const seedData = require("../data/seed-customers.json");
const { geocodeTelepules } = require("../src/geocoder");

const prisma = new PrismaClient();

async function main() {
  console.log("Seed indítás...");
  
  for (const customer of seedData) {
    const coords = geocodeTelepules(customer.telepules);
    const existing = await prisma.customer.findFirst({
      where: { name: customer.name }
    });
    
    if (!existing) {
      await prisma.customer.create({
        data: {
          name: customer.name,
          telepules: customer.telepules,
          lat: coords ? coords.lat : null,
          lon: coords ? coords.lon : null
        }
      });
      console.log("Létrehozva:", customer.name);
    } else {
      console.log("Már létezik:", customer.name);
    }
  }
  
  console.log("Seed kész.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
