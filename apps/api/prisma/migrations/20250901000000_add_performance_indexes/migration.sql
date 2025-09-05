-- Add indexes for better query performance

-- User table indexes
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users"("createdAt");

-- Household table indexes
CREATE INDEX IF NOT EXISTS "households_creator_id_idx" ON "households"("creatorId");
CREATE INDEX IF NOT EXISTS "households_created_at_idx" ON "households"("createdAt");

-- Household members indexes
CREATE INDEX IF NOT EXISTS "household_members_user_id_idx" ON "household_members"("userId");
CREATE INDEX IF NOT EXISTS "household_members_household_id_idx" ON "household_members"("householdId");
CREATE INDEX IF NOT EXISTS "household_members_role_idx" ON "household_members"("role");

-- Household invites indexes
CREATE INDEX IF NOT EXISTS "household_invites_email_idx" ON "household_invites"("email");
CREATE INDEX IF NOT EXISTS "household_invites_household_id_idx" ON "household_invites"("householdId");
CREATE INDEX IF NOT EXISTS "household_invites_status_idx" ON "household_invites"("status");
CREATE INDEX IF NOT EXISTS "household_invites_expires_at_idx" ON "household_invites"("expiresAt");

-- Inventory items indexes
CREATE INDEX IF NOT EXISTS "inventory_items_household_id_idx" ON "inventory_items"("householdId");
CREATE INDEX IF NOT EXISTS "inventory_items_category_idx" ON "inventory_items"("category");
CREATE INDEX IF NOT EXISTS "inventory_items_name_idx" ON "inventory_items"("name");
CREATE INDEX IF NOT EXISTS "inventory_items_expiry_date_idx" ON "inventory_items"("expiryDate");
CREATE INDEX IF NOT EXISTS "inventory_items_updated_at_idx" ON "inventory_items"("updatedAt");

-- Shopping list items indexes
CREATE INDEX IF NOT EXISTS "shopping_list_items_household_id_idx" ON "shopping_list_items"("householdId");
CREATE INDEX IF NOT EXISTS "shopping_list_items_completed_idx" ON "shopping_list_items"("completed");
CREATE INDEX IF NOT EXISTS "shopping_list_items_category_idx" ON "shopping_list_items"("category");
CREATE INDEX IF NOT EXISTS "shopping_list_items_updated_at_idx" ON "shopping_list_items"("updatedAt");

-- Recipes indexes
CREATE INDEX IF NOT EXISTS "recipes_creator_id_idx" ON "recipes"("creatorId");
CREATE INDEX IF NOT EXISTS "recipes_name_idx" ON "recipes"("name");
CREATE INDEX IF NOT EXISTS "recipes_tags_idx" ON "recipes" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "recipes_created_at_idx" ON "recipes"("createdAt");

-- Recipe ingredients indexes
CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipeId");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_inventory_item_id_idx" ON "recipe_ingredients"("inventoryItemId");

-- Meal plans indexes
CREATE INDEX IF NOT EXISTS "meal_plans_household_id_idx" ON "meal_plans"("householdId");
CREATE INDEX IF NOT EXISTS "meal_plans_week_start_idx" ON "meal_plans"("weekStart");
CREATE INDEX IF NOT EXISTS "meal_plans_week_end_idx" ON "meal_plans"("weekEnd");

-- Meal plan items indexes
CREATE INDEX IF NOT EXISTS "meal_plan_items_meal_plan_id_idx" ON "meal_plan_items"("mealPlanId");
CREATE INDEX IF NOT EXISTS "meal_plan_items_recipe_id_idx" ON "meal_plan_items"("recipeId");
CREATE INDEX IF NOT EXISTS "meal_plan_items_date_idx" ON "meal_plan_items"("date");
CREATE INDEX IF NOT EXISTS "meal_plan_items_meal_type_idx" ON "meal_plan_items"("mealType");
CREATE INDEX IF NOT EXISTS "meal_plan_items_cooked_idx" ON "meal_plan_items"("cooked");

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "inventory_items_household_category_idx" ON "inventory_items"("householdId", "category");
CREATE INDEX IF NOT EXISTS "shopping_list_items_household_completed_idx" ON "shopping_list_items"("householdId", "completed");
CREATE INDEX IF NOT EXISTS "meal_plan_items_date_meal_type_idx" ON "meal_plan_items"("date", "mealType");
CREATE INDEX IF NOT EXISTS "household_members_household_role_idx" ON "household_members"("householdId", "role");