import { PaginatedResult, paginate } from './pagination';

/** When page/pageSize are omitted, returns the full list (backward compatible). */
export function maybePaginate<T>(
  items: T[],
  page?: number,
  pageSize?: number,
): T[] | PaginatedResult<T> {
  if (page === undefined && pageSize === undefined) return items;
  return paginate(items, page ?? 1, pageSize ?? 50);
}

export function parsePageQuery(page?: string, pageSize?: string) {
  return {
    page: page !== undefined && page !== '' ? parseInt(page, 10) : undefined,
    pageSize: pageSize !== undefined && pageSize !== '' ? parseInt(pageSize, 10) : undefined,
  };
}

export function pageMeta(total: number, page: number, pageSize: number) {
  const ps = Math.min(200, Math.max(1, pageSize));
  const p = Math.max(1, page);
  return {
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps) || 1,
  };
}
