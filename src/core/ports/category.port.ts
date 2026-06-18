export interface CategoryPort {
  createCategory(name: string): Promise<string>;
  getCategories(): Promise<{ id: string; name: string }[]>;
  getCategoryByName(name: string): Promise<string | null>;
}
