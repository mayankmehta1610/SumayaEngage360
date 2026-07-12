import { paginatedResponse, parseFilterJson, parseSortDir, SortDir } from './list-sort-filter';

export interface ListPageOpts {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  filter?: string;
}

/** Parse page/pageSize; when both omitted, returns paginated=false for backward-compat raw arrays. */
export function parseListPaging(page?: string, pageSize?: string) {
  const paginated = (page !== undefined && page !== '') || (pageSize !== undefined && pageSize !== '');
  const p = Math.max(1, page ? parseInt(page, 10) : 1);
  const ps = Math.min(200, Math.max(1, pageSize ? parseInt(pageSize, 10) : 50));
  return { paginated, p, ps };
}

export async function prismaList<T>(
  findMany: (skip: number, take: number) => Promise<T[]>,
  count: () => Promise<number>,
  opts: ListPageOpts,
  sortBy?: string,
  sortDir?: SortDir,
): Promise<T[] | ReturnType<typeof paginatedResponse<T>>> {
  const { paginated, p, ps } = parseListPaging(opts.page, opts.pageSize);
  if (!paginated) return findMany(0, Number.MAX_SAFE_INTEGER);
  const [data, total] = await Promise.all([findMany((p - 1) * ps, ps), count()]);
  return paginatedResponse(data, total, p, ps, sortBy, sortDir);
}

export { parseFilterJson, parseSortDir };
