import { ConvexReactClient } from "convex/react";

const PRODUCTION_CONVEX_URL = "https://agreeable-parakeet-735.eu-west-1.convex.cloud";

export const convexAdminSecret = process.env.EXPO_PUBLIC_CONVEX_ADMIN_SECRET ?? "";
export const isConvexConfigured = Boolean(convexAdminSecret);

export const convex = new ConvexReactClient(PRODUCTION_CONVEX_URL, {
  unsavedChangesWarning: false,
});
