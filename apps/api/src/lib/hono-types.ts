import type { User, Session } from "./auth.js";
import type { HouseholdContext, HouseholdRole } from "./types.js";

export interface Variables {
  user: User;
  session: Session["session"];
  household: HouseholdContext;
  householdRole: HouseholdRole;
}

declare module "hono" {
  interface ContextVariableMap extends Variables {}
}
