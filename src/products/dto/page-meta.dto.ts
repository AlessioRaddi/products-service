export class PageMetaDto {
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;

  constructor(page: number, size: number, totalItems: number) {
    this.page = page;
    this.size = size;
    this.totalItems = totalItems;
    this.totalPages = Math.ceil(this.totalItems / this.size) || 0;
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.totalPages;
  }
}
