import { PageMetaDto } from './page-meta.dto.js';

export class PaginatedResponseDto<T> {
  readonly content: T[];
  readonly meta: PageMetaDto;

  constructor(content: T[], page: number, size: number, totalItems: number) {
    this.content = content;
    this.meta = new PageMetaDto(page, size, totalItems);
  }
}
