export class ContentCategory {
  id: string;
  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  static create(id: string, name: string) {
    return new ContentCategory(id, name);
  }
}
