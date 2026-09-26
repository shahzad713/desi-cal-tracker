-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FoodEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "dishName" TEXT NOT NULL,
    "dishNameUrdu" TEXT,
    "calories" INTEGER NOT NULL,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "portion" TEXT NOT NULL,
    "imagePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "portionScale" REAL NOT NULL DEFAULT 1,
    "baseCalories" INTEGER NOT NULL DEFAULT 0,
    "baseProtein" REAL NOT NULL DEFAULT 0,
    "baseCarbs" REAL NOT NULL DEFAULT 0,
    "baseFat" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "FoodEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FoodEntry" ("calories", "carbs", "createdAt", "dishName", "dishNameUrdu", "fat", "id", "imagePath", "portion", "protein", "userId") SELECT "calories", "carbs", "createdAt", "dishName", "dishNameUrdu", "fat", "id", "imagePath", "portion", "protein", "userId" FROM "FoodEntry";
DROP TABLE "FoodEntry";
ALTER TABLE "new_FoodEntry" RENAME TO "FoodEntry";
CREATE INDEX "FoodEntry_userId_idx" ON "FoodEntry"("userId");
CREATE INDEX "FoodEntry_createdAt_idx" ON "FoodEntry"("createdAt");
-- Backfill: rows saved before Day 4 get base values = their current values.
UPDATE "FoodEntry"
SET "baseCalories" = "calories",
    "baseProtein"  = "protein",
    "baseCarbs"    = "carbs",
    "baseFat"      = "fat"
WHERE "baseCalories" = 0;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
