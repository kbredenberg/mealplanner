import { PrismaClient, HouseholdRole, MealType } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: "john@example.com" },
    update: {},
    create: {
      email: "john@example.com",
      name: "John Doe",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "jane@example.com" },
    update: {},
    create: {
      email: "jane@example.com",
      name: "Jane Smith",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
    },
  });

  console.log("✅ Created test users");

  // Create a test household
  const household = await prisma.household.upsert({
    where: { id: "test-household-1" },
    update: {},
    create: {
      id: "test-household-1",
      name: "The Doe Family",
      description: "Our family meal planning household",
      creatorId: user1.id,
    },
  });

  // Add household members
  await prisma.householdMember.upsert({
    where: {
      userId_householdId: {
        userId: user1.id,
        householdId: household.id,
      },
    },
    update: {},
    create: {
      userId: user1.id,
      householdId: household.id,
      role: HouseholdRole.ADMIN,
    },
  });

  await prisma.householdMember.upsert({
    where: {
      userId_householdId: {
        userId: user2.id,
        householdId: household.id,
      },
    },
    update: {},
    create: {
      userId: user2.id,
      householdId: household.id,
      role: HouseholdRole.MEMBER,
    },
  });

  console.log("✅ Created test household and members");

  // Create sample inventory items
  const inventoryItems = [
    {
      name: "Chicken Breast",
      quantity: 2,
      unit: "lbs",
      category: "Meat",
      householdId: household.id,
    },
    {
      name: "Rice",
      quantity: 5,
      unit: "cups",
      category: "Grains",
      householdId: household.id,
    },
    {
      name: "Broccoli",
      quantity: 1,
      unit: "head",
      category: "Vegetables",
      householdId: household.id,
    },
    {
      name: "Olive Oil",
      quantity: 1,
      unit: "bottle",
      category: "Condiments",
      householdId: household.id,
    },
    {
      name: "Eggs",
      quantity: 12,
      unit: "pieces",
      category: "Dairy",
      householdId: household.id,
    },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: {
        id: `inventory-${item.name.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        id: `inventory-${item.name.toLowerCase().replace(/\s+/g, "-")}`,
        ...item,
      },
    });
  }

  console.log("✅ Created sample inventory items");

  // Create sample shopping list items
  const shoppingItems = [
    {
      name: "Milk",
      quantity: 1,
      unit: "gallon",
      category: "Dairy",
      householdId: household.id,
    },
    {
      name: "Bread",
      quantity: 1,
      unit: "loaf",
      category: "Bakery",
      householdId: household.id,
    },
    {
      name: "Tomatoes",
      quantity: 4,
      unit: "pieces",
      category: "Vegetables",
      householdId: household.id,
    },
  ];

  for (const item of shoppingItems) {
    await prisma.shoppingListItem.upsert({
      where: {
        id: `shopping-${item.name.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        id: `shopping-${item.name.toLowerCase().replace(/\s+/g, "-")}`,
        ...item,
      },
    });
  }

  console.log("✅ Created sample shopping list items");

  // Create sample recipes
  const recipe1 = await prisma.recipe.upsert({
    where: { id: "recipe-chicken-rice" },
    update: {},
    create: {
      id: "recipe-chicken-rice",
      name: "Chicken and Rice Bowl",
      description:
        "A healthy and delicious chicken and rice bowl with vegetables",
      instructions:
        "1. Cook rice according to package instructions\n2. Season and cook chicken breast\n3. Steam broccoli\n4. Combine in bowl and drizzle with olive oil",
      prepTime: 15,
      cookTime: 25,
      servings: 4,
      tags: ["healthy", "easy", "dinner"],
      creatorId: user1.id,
    },
  });

  const recipe2 = await prisma.recipe.upsert({
    where: { id: "recipe-scrambled-eggs" },
    update: {},
    create: {
      id: "recipe-scrambled-eggs",
      name: "Scrambled Eggs",
      description: "Classic scrambled eggs for breakfast",
      instructions:
        "1. Crack eggs into bowl\n2. Whisk with salt and pepper\n3. Cook in pan with butter\n4. Stir gently until set",
      prepTime: 5,
      cookTime: 5,
      servings: 2,
      tags: ["breakfast", "quick", "easy"],
      creatorId: user2.id,
    },
  });

  console.log("✅ Created sample recipes");

  // Create recipe ingredients
  const chickenRiceIngredients = [
    {
      recipeId: recipe1.id,
      quantity: 1,
      unit: "lb",
      notes: "boneless, skinless",
    },
    { recipeId: recipe1.id, quantity: 2, unit: "cups", notes: "jasmine rice" },
    {
      recipeId: recipe1.id,
      quantity: 1,
      unit: "head",
      notes: "fresh broccoli",
    },
    { recipeId: recipe1.id, quantity: 2, unit: "tbsp", notes: "extra virgin" },
  ];

  const eggsIngredients = [
    { recipeId: recipe2.id, quantity: 4, unit: "pieces", notes: "large eggs" },
  ];

  for (const ingredient of [...chickenRiceIngredients, ...eggsIngredients]) {
    await prisma.recipeIngredient.create({
      data: ingredient,
    });
  }

  console.log("✅ Created recipe ingredients");

  // Create a sample meal plan for this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // End of current week

  const mealPlan = await prisma.mealPlan.upsert({
    where: { id: "meal-plan-current-week" },
    update: {},
    create: {
      id: "meal-plan-current-week",
      weekStart,
      weekEnd,
      householdId: household.id,
    },
  });

  // Add some meal plan items
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.mealPlanItem.upsert({
    where: { id: "meal-plan-item-1" },
    update: {},
    create: {
      id: "meal-plan-item-1",
      date: today,
      mealType: MealType.DINNER,
      mealPlanId: mealPlan.id,
      recipeId: recipe1.id,
    },
  });

  await prisma.mealPlanItem.upsert({
    where: { id: "meal-plan-item-2" },
    update: {},
    create: {
      id: "meal-plan-item-2",
      date: tomorrow,
      mealType: MealType.BREAKFAST,
      mealPlanId: mealPlan.id,
      recipeId: recipe2.id,
    },
  });

  console.log("✅ Created sample meal plan");

  console.log("🎉 Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
