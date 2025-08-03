export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export const DEFAULT_SORT_FIELD = 'createdAt';
export const DEFAULT_SORT_ORDER = SORT_ORDER.DESC;
