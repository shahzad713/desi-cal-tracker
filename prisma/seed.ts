// Day-1 seed: 10 common desi dishes with realistic nutrition values (per serving).
// Run with: npx prisma db seed   (configured via the "prisma.seed" key in package.json)
// Values are estimates for typical home/restaurant portions — good enough for v1,
// and will be refined when the 200+ dish database lands on Day 7.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const dishes = [
  { name: "Chicken Biryani", nameUrdu: "چکن بریانی", calories: 650, protein: 28, carbs: 75, fat: 22, servingSize: "1 plate" },
  { name: "Daal + 2 Roti", nameUrdu: "دال روٹی", calories: 480, protein: 18, carbs: 70, fat: 12, servingSize: "1 bowl daal + 2 roti" },
  { name: "Nihari + Naan", nameUrdu: "نہاری", calories: 720, protein: 32, carbs: 58, fat: 34, servingSize: "1 bowl + 1 naan" },
  { name: "Chicken Karahi", nameUrdu: "چکن کڑاہی", calories: 550, protein: 38, carbs: 12, fat: 40, servingSize: "half karahi" },
  { name: "Aloo Paratha", nameUrdu: "آلو پراٹھا", calories: 340, protein: 7, carbs: 45, fat: 15, servingSize: "1 paratha" },
  { name: "Haleem", nameUrdu: "حلیم", calories: 420, protein: 25, carbs: 48, fat: 14, servingSize: "1 bowl" },
  { name: "Palak Paneer + 2 Roti", nameUrdu: "پالک پنیر", calories: 520, protein: 20, carbs: 55, fat: 24, servingSize: "1 bowl + 2 roti" },
  { name: "Chicken Tikka", nameUrdu: "چکن ٹکا", calories: 380, protein: 42, carbs: 6, fat: 18, servingSize: "2 pieces" },
  { name: "Rajma Chawal", nameUrdu: "راجما چاول", calories: 580, protein: 20, carbs: 88, fat: 10, servingSize: "1 plate" },
  { name: "Seekh Kebab", nameUrdu: "سیخ کباب", calories: 450, protein: 36, carbs: 8, fat: 28, servingSize: "4 pieces" },
];

async function main() {
  for (const d of dishes) {
    await prisma.dish.upsert({
      where: { name: d.name },
      update: d,
      create: d,
    });
  }
  console.log(`Seeded ${dishes.length} desi dishes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
