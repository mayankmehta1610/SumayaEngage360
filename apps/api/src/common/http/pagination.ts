export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export function paginate<T>(items: T[], page = 1, pageSize = 50): PaginatedResult<T> {
  const p = Math.max(1, page);
  const ps = Math.min(200, Math.max(1, pageSize));
  const start = (p - 1) * ps;
  const slice = items.slice(start, start + ps);
  const total = items.length;
  return {
    data: slice,
    meta: {
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps) || 1,
    },
  };
}
