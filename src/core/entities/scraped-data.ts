export interface ScrapedDataProps {
  id: string;
  content: string;
  url: string;
  category: string;
  categoryId: string | null;
  title: string;
  metadata: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ScrapedData {
  public readonly id: string;
  public readonly content: string;
  public readonly url: string;
  public readonly category: string;
  public readonly categoryId: string | null;
  public readonly title: string;
  public readonly metadata: Record<string, unknown>;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(props: ScrapedDataProps) {
    this.id = props.id;
    this.content = props.content;
    this.url = props.url;
    this.category = props.category;
    this.categoryId = props.categoryId;
    this.title = props.title;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  public hasContent(): boolean {
    return this.content.trim().length > 0;
  }
}
