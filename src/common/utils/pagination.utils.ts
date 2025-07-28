import { PAGINATION, DEFAULT_SORT_FIELD, DEFAULT_SORT_ORDER } from '../constants/pagination.constants';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  sortBy: string;
  sortOrder: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export class PaginationUtils {
  /**
   * Calculate offset for database queries
   */
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Validate and normalize pagination options
   */
  static normalizePaginationOptions(options: PaginationOptions): Required<PaginationOptions> {
    const page = Math.max(options.page || PAGINATION.DEFAULT_PAGE, PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      Math.max(options.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MIN_LIMIT),
      PAGINATION.MAX_LIMIT,
    );
    const sortBy = options.sortBy || DEFAULT_SORT_FIELD;
    const sortOrder = options.sortOrder || DEFAULT_SORT_ORDER;

    return { page, limit, sortBy, sortOrder };
  }

  /**
   * Create pagination metadata
   */
  static createPaginationMeta(
    page: number,
    limit: number,
    totalItems: number,
    sortBy: string,
    sortOrder: string,
  ): PaginationMeta {
    const totalPages = Math.ceil(totalItems / limit);
    const hasPreviousPage = page > 1;
    const hasNextPage = page < totalPages;

    return {
      page,
      limit,
      totalItems,
      totalPages,
      hasPreviousPage,
      hasNextPage,
      sortBy,
      sortOrder,
    };
  }

  /**
   * Create paginated result
   */
  static createPaginatedResult<T>(
    data: T[],
    totalItems: number,
    options: Required<PaginationOptions>,
  ): PaginatedResult<T> {
    const meta = this.createPaginationMeta(
      options.page,
      options.limit,
      totalItems,
      options.sortBy,
      options.sortOrder,
    );

    return { data, meta };
  }

  /**
   * Generate Prisma pagination query
   */
  static getPrismaQuery(options: PaginationOptions) {
    const normalized = this.normalizePaginationOptions(options);

    return {
      skip: this.calculateOffset(normalized.page, normalized.limit),
      take: normalized.limit,
      orderBy: {
        [normalized.sortBy]: normalized.sortOrder,
      },
    };
  }
} 