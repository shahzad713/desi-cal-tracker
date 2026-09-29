// Day-7 seed: the full 200+ desi dish database (see prisma/dishes-data.ts).
// Run with: npx prisma db seed   (configured via the "prisma.seed" key in package.json)
// Values are realistic per-serving estimates for typical home/restaurant
// portions. Upsert by name, so re-running is safe and idempotent.
import { PrismaClient } from "@prisma/client";
import { DISHES } from "./dishes-data";

const prisma = new PrismaClient();

async function main() {
  for (const d of DISHES) {
    await prisma.dish.upsert({
      where: { name: d.name },
      update: d,
      create: d,
    });
  }
  console.log(`Seeded ${DISHES.length} desi dishes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
