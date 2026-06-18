import { CategoryPort } from "@/src/core/ports/category.port";
import { eq } from "drizzle-orm";
import { categoriesSchema } from "./schema";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Drizzle ORM adapter for managing content categories.
 */
export class DrizzleCategoryAdapter implements CategoryPort {
  constructor(private readonly db: NodePgDatabase<typeof import("./schema")>) {}

  async createCategory(name: string): Promise<string> {
    const category = await this.db
      .insert(categoriesSchema)
      .values({
        id: crypto.randomUUID(),
        name: name,
      })
      .returning();
    return category[0].id;
  }

  async getCategories(): Promise<{ id: string; name: string }[]> {
    const data = await this.db.select().from(categoriesSchema);
    return data;
  }

  async getCategoryByName(name: string): Promise<string | null> {
    const category = await this.db
      .select()
      .from(categoriesSchema)
      .where(eq(categoriesSchema.name, name))
      .limit(1);
    return category[0] ? category[0].id : null;
  }
}
