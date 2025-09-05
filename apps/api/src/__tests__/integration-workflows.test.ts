import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "../lib/auth.js";
import { authRoutes } from "../routes/auth.js";
import { userRoutes } from "../routes/user.js";
import { householdRoutes } from "../routes/households.js";
import { inventoryRoutes } from "../routes/inventory.js";
import { recipeRoutes } from "../routes/recipes.js";
import { mealPlanRoutes } from "../routes/meal-plans.js";
import { shoppingListRoutes } from "../routes/shopping-list.js";
import { prisma } from "../lib/prisma.js";
import type { User, Household } from "@prisma/client";

describe("Integration Workflows", () => {
  let app: Hono;
  let testUser: User;
  let testHousehold: Household;

  beforeAll(async () => {
    // Setup test app
    app = new Hono();

    // Setup middleware
    app.use("*", logger());
    app.use(
      "*",
      cors({
        origin: ["http://localhost:3001", "http://localhost:8081"],
        credentials: true,
      })
    );

    // Better Auth routes
    app.on(["POST", "GET"], "/api/auth/**", (c) => {
      return auth.handler(c.req.raw);
    });

    // API routes
    app.route("/api/auth", authRoutes);
    app.route("/api/user", userRoutes);
    app.route("/api/households", householdRoutes);
    app.route("/api/households", inventoryRoutes);
    app.route("/api/recipes", recipeRoutes);
    app.route("/api/households", mealPlanRoutes);
    app.route("/api/households", shoppingListRoutes);

    // Clean up any existing test data
    await prisma.householdInvite.deleteMany({
      where: { email: { contains: "integration-test" } },
    });
    await prisma.householdMember.deleteMany({
      where: { user: { email: { contains: "integration-test" } } },
    });
    await prisma.household.deleteMany({
      where: { name: { contains: "Integration Test" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "integration-test" } },
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: "integration-test@example.com",
        name: "Integration Test User",
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.householdInvite.deleteMany({
      where: { email: { contains: "integration-test" } },
    });
    await prisma.householdMember.deleteMany({
      where: { user: { email: { contains: "integration-test" } } },
    });
    await prisma.household.deleteMany({
      where: { name: { contains: "Integration Test" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "integration-test" } },
    });
  });

  beforeEach(async () => {
    // Clean up households before each test
    await prisma.householdInvite.deleteMany({
      where: { household: { name: { contains: "Integration Test" } } },
    });
    await prisma.householdMember.deleteMany({
      where: { household: { name: { contains: "Integration Test" } } },
    });
    await prisma.household.deleteMany({
      where: { name: { contains: "Integration Test" } },
    });
  });

  describe("Complete Meal Planning Workflow", () => {
    it("should complete full meal planning workflow from household creation to cooking", async () => {
      // Step 1: Create household
      const householdRes = await app.request("/api/households", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer mock-token-${testUser.id}`,
        },
        body: JSON.stringify({
          name: "Integration Test Household",
          description: "Test household for integration testing",
        }),
      });

      expect(householdRes.status).toBe(201);
      const householdData = await householdRes.json();
      testHousehold = householdData.data;

      // Step 2: Add inventory items
      const inventoryItems = [
        { name: "Pasta", quantity: 500, unit: "grams", category: "Grains" },
        {
          name: "Tomatoes",
          quantity: 6,
          unit: "pieces",
          category: "Vegetables",
        },
        { name: "Ground Beef", quantity: 1, unit: "kg", category: "Meat" },
        { name: "Onions", quantity: 3, unit: "pieces", category: "Vegetables" },
      ];

      const createdInventoryItems = [];
      for (const item of inventoryItems) {
        const res = await app.request(
          `/api/households/${testHousehold.id}/inventory`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer mock-token-${testUser.id}`,
            },
            body: JSON.stringify(item),
          }
        );

        expect(res.status).toBe(201);
        const data = await res.json();
        createdInventoryItems.push(data.data);
      }

      // Step 3: Create a recipe
      const recipeRes = await app.request("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer mock-token-${testUser.id}`,
        },
        body: JSON.stringify({
          name: "Spaghetti Bolognese",
          description: "Classic Italian pasta dish",
          instructions: "1. Cook pasta. 2. Make sauce. 3. Combine.",
          prepTime: 15,
          cookTime: 30,
          servings: 4,
          tags: ["italian", "dinner", "pasta"],
          ingredients: [
            {
              quantity: 400,
              unit: "grams",
              notes: "Pasta",
              inventoryItemId: createdInventoryItems[0].id,
            },
            {
              quantity: 4,
              unit: "pieces",
              notes: "Tomatoes",
              inventoryItemId: createdInventoryItems[1].id,
            },
            {
              quantity: 0.5,
              unit: "kg",
              notes: "Ground Beef",
              inventoryItemId: createdInventoryItems[2].id,
            },
            {
              quantity: 1,
              unit: "pieces",
              notes: "Onions",
              inventoryItemId: createdInventoryItems[3].id,
            },
          ],
        }),
      });

      expect(recipeRes.status).toBe(201);
      const recipeData = await recipeRes.json();
      const recipe = recipeData.data;

      // Step 4: Create meal plan
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const mealPlanRes = await app.request(
        `/api/households/${testHousehold.id}/meal-plans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
          body: JSON.stringify({
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
          }),
        }
      );

      expect(mealPlanRes.status).toBe(201);
      const mealPlanData = await mealPlanRes.json();
      const mealPlan = mealPlanData.data;

      // Step 5: Add meal to plan
      const mealDate = new Date(weekStart);
      mealDate.setDate(mealDate.getDate() + 2); // Wednesday

      const addMealRes = await app.request(
        `/api/households/${testHousehold.id}/meal-plans/${mealPlan.id}/meals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
          body: JSON.stringify({
            date: mealDate.toISOString(),
            mealType: "DINNER",
            recipeId: recipe.id,
          }),
        }
      );

      expect(addMealRes.status).toBe(201);
      const mealData = await addMealRes.json();
      const meal = mealData.data;

      // Verify ingredient availability
      expect(mealData.data.ingredientAvailability).toBeDefined();
      expect(mealData.data.ingredientAvailability.allAvailable).toBe(true);

      // Step 6: Check ingredient availability for meal plan
      const availabilityRes = await app.request(
        `/api/households/${testHousehold.id}/meal-plans/${mealPlan.id}/ingredient-availability`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
        }
      );

      expect(availabilityRes.status).toBe(200);
      const availabilityData = await availabilityRes.json();
      expect(availabilityData.data.summary.totalIngredients).toBeGreaterThan(0);
      expect(
        availabilityData.data.summary.availableIngredients
      ).toBeGreaterThan(0);

      // Step 7: Mark meal as cooked
      const cookMealRes = await app.request(
        `/api/households/${testHousehold.id}/meal-plans/${mealPlan.id}/meals/${meal.id}/cook`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
        }
      );

      expect(cookMealRes.status).toBe(200);
      const cookData = await cookMealRes.json();
      expect(cookData.data.inventoryUpdates).toBeGreaterThan(0);

      // Step 8: Verify inventory was updated
      const inventoryRes = await app.request(
        `/api/households/${testHousehold.id}/inventory`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
        }
      );

      expect(inventoryRes.status).toBe(200);
      const inventoryData = await inventoryRes.json();
      const updatedInventory = inventoryData.data;

      // Check that pasta quantity was reduced
      const pastaItem = updatedInventory.find(
        (item: any) => item.name === "Pasta"
      );
      expect(pastaItem.quantity).toBe(100); // 500 - 400 = 100

      // Check that ground beef quantity was reduced
      const beefItem = updatedInventory.find(
        (item: any) => item.name === "Ground Beef"
      );
      expect(beefItem.quantity).toBe(0.5); // 1 - 0.5 = 0.5
    });
  });

  describe("Shopping List Integration Workflow", () => {
    it("should complete shopping list workflow from meal plan to inventory", async () => {
      // Step 1: Create household
      const householdRes = await app.request("/api/households", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer mock-token-${testUser.id}`,
        },
        body: JSON.stringify({
          name: "Integration Test Shopping Household",
          description: "Test household for shopping integration",
        }),
      });

      expect(householdRes.status).toBe(201);
      const householdData = await householdRes.json();
      testHousehold = householdData.data;

      // Step 2: Add limited inventory
      const inventoryRes = await app.request(
        `/api/households/${testHousehold.id}/inventory`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
          body: JSON.stringify({
            name: "Flour",
            quantity: 1,
            unit: "cups",
            category: "Baking",
          }),
        }
      );

      expect(inventoryRes.status).toBe(201);
      const inventoryData = await inventoryRes.json();
      const flourItem = inventoryData.data;

      // Step 3: Create recipe that requires more flour than available
      const recipeRes = await app.request("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer mock-token-${testUser.id}`,
        },
        body: JSON.stringify({
          name: "Pancakes",
          description: "Fluffy pancakes",
          instructions: "Mix and cook",
          ingredients: [
            {
              quantity: 3,
              unit: "cups",
              notes: "Flour",
              inventoryItemId: flourItem.id,
            },
          ],
        }),
      });

      expect(recipeRes.status).toBe(201);
      const recipeData = await recipeRes.json();
      const recipe = recipeData.data;

      // Step 4: Create meal plan
      const weekStart = new Date();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const mealPlanRes = await app.request(
        `/api/households/${testHousehold.id}/meal-plans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
          body: JSON.stringify({
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
          }),
        }
      );

      expect(mealPlanRes.status).toBe(201);
      const mealPlanData = await mealPlanRes.json();
      const mealPlan = mealPlanData.data;

      // Step 5: Add meal to plan (should detect missing ingredients)
      const mealDate = new Date(weekStart);
      mealDate.setDate(mealDate.getDate() + 1);

      const addMealRes = await app.request(
        `/api/households/${testHousehold.id}/meal-plans/${mealPlan.id}/meals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
          body: JSON.stringify({
            date: mealDate.toISOString(),
            mealType: "BREAKFAST",
            recipeId: recipe.id,
          }),
        }
      );

      expect(addMealRes.status).toBe(201);
      const mealData = await addMealRes.json();
      expect(mealData.data.ingredientAvailability.allAvailable).toBe(false);

      // Step 6: Generate shopping list from meal plan
      const shoppingListRes = await app.request(
        `/api/households/${testHousehold.id}/meal-plans/${mealPlan.id}/generate-shopping-list`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
        }
      );

      expect(shoppingListRes.status).toBe(201);
      const shoppingData = await shoppingListRes.json();
      expect(shoppingData.data.itemsAdded).toBeGreaterThan(0);

      // Step 7: Get shopping list
      const getShoppingListRes = await app.request(
        `/api/households/${testHousehold.id}/shopping-list`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
        }
      );

      expect(getShoppingListRes.status).toBe(200);
      const shoppingListData = await getShoppingListRes.json();
      const shoppingItems = shoppingListData.data;
      expect(shoppingItems.length).toBeGreaterThan(0);

      const flourShoppingItem = shoppingItems.find((item: any) =>
        item.name.toLowerCase().includes("flour")
      );
      expect(flourShoppingItem).toBeDefined();
      expect(flourShoppingItem.quantity).toBe(2); // Need 3, have 1, so need 2 more

      // Step 8: Mark shopping item as completed
      const completeItemRes = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/${flourShoppingItem.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
          body: JSON.stringify({
            completed: true,
          }),
        }
      );

      expect(completeItemRes.status).toBe(200);

      // Step 9: Add completed shopping items to inventory
      const addToInventoryRes = await app.request(
        `/api/households/${testHousehold.id}/shopping-list/${flourShoppingItem.id}/add-to-inventory`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
        }
      );

      expect(addToInventoryRes.status).toBe(200);

      // Step 10: Verify inventory was updated
      const finalInventoryRes = await app.request(
        `/api/households/${testHousehold.id}/inventory`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
        }
      );

      expect(finalInventoryRes.status).toBe(200);
      const finalInventoryData = await finalInventoryRes.json();
      const updatedFlourItem = finalInventoryData.data.find(
        (item: any) => item.id === flourItem.id
      );

      expect(updatedFlourItem.quantity).toBe(3); // 1 + 2 = 3
    });
  });

  describe("Household Collaboration Workflow", () => {
    it("should complete household invitation and collaboration workflow", async () => {
      // Step 1: Create household
      const householdRes = await app.request("/api/households", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer mock-token-${testUser.id}`,
        },
        body: JSON.stringify({
          name: "Integration Test Collaboration Household",
          description: "Test household for collaboration",
        }),
      });

      expect(householdRes.status).toBe(201);
      const householdData = await householdRes.json();
      testHousehold = householdData.data;

      // Step 2: Create second user
      const secondUser = await prisma.user.create({
        data: {
          email: "integration-test-2@example.com",
          name: "Second Integration Test User",
        },
      });

      // Step 3: Send invitation
      const inviteRes = await app.request(
        `/api/households/${testHousehold.id}/invites`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
          body: JSON.stringify({
            email: secondUser.email,
            role: "MEMBER",
          }),
        }
      );

      expect(inviteRes.status).toBe(201);
      const inviteData = await inviteRes.json();
      const invite = inviteData.data;

      // Step 4: Get pending invites for second user
      const pendingInvitesRes = await app.request(
        "/api/households/invites/pending",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer mock-token-${secondUser.id}`,
          },
        }
      );

      expect(pendingInvitesRes.status).toBe(200);
      const pendingData = await pendingInvitesRes.json();
      expect(pendingData.data.length).toBe(1);
      expect(pendingData.data[0].id).toBe(invite.id);

      // Step 5: Accept invitation
      const acceptRes = await app.request(
        `/api/households/invites/${invite.id}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer mock-token-${secondUser.id}`,
          },
        }
      );

      expect(acceptRes.status).toBe(200);

      // Step 6: Verify second user can access household
      const householdsRes = await app.request("/api/households", {
        method: "GET",
        headers: {
          Authorization: `Bearer mock-token-${secondUser.id}`,
        },
      });

      expect(householdsRes.status).toBe(200);
      const householdsData = await householdsRes.json();
      expect(householdsData.data.length).toBe(1);
      expect(householdsData.data[0].id).toBe(testHousehold.id);

      // Step 7: Second user adds inventory item
      const inventoryRes = await app.request(
        `/api/households/${testHousehold.id}/inventory`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer mock-token-${secondUser.id}`,
          },
          body: JSON.stringify({
            name: "Collaborative Item",
            quantity: 5,
            unit: "pieces",
            category: "Test",
          }),
        }
      );

      expect(inventoryRes.status).toBe(201);

      // Step 8: First user can see the item
      const getInventoryRes = await app.request(
        `/api/households/${testHousehold.id}/inventory`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer mock-token-${testUser.id}`,
          },
        }
      );

      expect(getInventoryRes.status).toBe(200);
      const inventoryData = await getInventoryRes.json();
      const collaborativeItem = inventoryData.data.find(
        (item: any) => item.name === "Collaborative Item"
      );
      expect(collaborativeItem).toBeDefined();

      // Clean up second user
      await prisma.user.delete({ where: { id: secondUser.id } });
    });
  });
});
