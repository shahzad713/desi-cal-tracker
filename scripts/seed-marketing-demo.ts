// Day 9 — one-off seed for marketing screenshots (dev DB only, gitignored).
// Creates demo@desical.ai with a few realistic entries for "today".
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@desical.ai";
  const passwordHash = await bcrypt.hash("DemoPass123!", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, name: "Demo", passwordHash, dailyCalorieTarget: 2200 },
  });

  // Clear old demo entries so screenshots are deterministic.
  await prisma.foodEntry.deleteMany({ where: { userId: user.id } });

  const entries = [
    {
      dishName: "Chicken Biryani",
      dishNameUrdu: "چکن بریانی",
      calories: 650,
      protein: 32,
      carbs: 58,
      fat: 28,
      portion: "1 plate",
    },
    {
      dishName: "Daal + 2 Roti",
      dishNameUrdu: "دال روٹی",
      calories: 420,
      protein: 16,
      carbs: 62,
      fat: 9,
      portion: "1 bowl + 2 rotis",
    },
    {
      dishName: "Chicken Karahi",
      dishNameUrdu: "چکن کڑاہی",
      calories: 520,
      protein: 38,
      carbs: 12,
      fat: 34,
      portion: "1 serving",
    },
    {
      dishName: "Gulab Jamun",
      dishNameUrdu: "گلاب جامن",
      calories: 300,
      protein: 5,
      carbs: 52,
      fat: 10,
      portion: "2 pieces",
    },
  ];

  for (const e of entries) {
    await prisma.foodEntry.create({
      data: {
        userId: user.id,
        ...e,
        portionScale: 1,
        baseCalories: e.calories,
        baseProtein: e.protein,
        baseCarbs: e.carbs,
        baseFat: e.fat,
      },
    });
  }
  console.log(`seeded ${entries.length} entries for ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
