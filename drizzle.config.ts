import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/core/infrastructure/storage/drizzle/schema.ts",
  out: "./src/core/infrastructure/storage/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:password123@localhost:5432/scropen",
  },
});
