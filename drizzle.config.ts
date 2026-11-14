import { defineConfig } from "drizzle-kit";

// No credentials: this file serves only `generate` and `check` (AD-9).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/*/server/schema.ts",
  out: "./drizzle",
});
