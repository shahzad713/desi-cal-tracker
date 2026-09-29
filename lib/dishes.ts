// Day 7: the fixed category list for the 200+ dish database.
// Categories are an allowlist — the search filter and the seed both validate
// against this, so a typo can never create a stray category.

export const DISH_CATEGORIES = [
  "Breads",
  "Rice & Biryani",
  "Dals & Legumes",
  "Chicken Curries",
  "Meat Curries",
  "Vegetables & Paneer",
  "Kebabs & Grills",
  "Breakfast",
  "Snacks & Street Food",
  "Desserts & Sweets",
  "Drinks & Beverages",
  "Dahi, Raita & Sides",
] as const;

export type DishCategory = (typeof DISH_CATEGORIES)[number];

// Cap on search results — keeps the page fast and the DB query bounded.
export const MAX_DISH_RESULTS = 60;
