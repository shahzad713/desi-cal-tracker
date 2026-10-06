-- Day 7: add category to the Dish reference table (200+ dish database)
ALTER TABLE "Dish" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Other';
CREATE INDEX "Dish_category_idx" ON "Dish"("category");
