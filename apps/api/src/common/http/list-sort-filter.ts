import { Prisma } from '@prisma/client';

export type SortDir = 'asc' | 'desc';

export function parseSortDir(sortDir?: string): SortDir {
  return sortDir?.toLowerCase() === 'asc' ? 'asc' : 'desc';
}

/** Parse `filter` query param — JSON object of field→substring. Invalid JSON returns {}. */
export function parseFilterJson(filter?: string): Record<string, string> {
  if (!filter?.trim()) return {};
  try {
    const parsed = JSON.parse(filter) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

export function contains(val: string): Prisma.StringFilter {
  return { contains: val, mode: 'insensitive' };
}

export interface PaginatedMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortBy?: string;
  sortDir?: SortDir;
}

/** Standard list envelope for paginated APIs. */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  sortBy?: string,
  sortDir?: SortDir,
): { data: T[]; meta: PaginatedMeta } {
  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      ...(sortBy ? { sortBy } : {}),
      ...(sortDir ? { sortDir } : {}),
    },
  };
}

export interface ListSortFilterOpts {
  sortBy?: string;
  sortDir?: string;
  filter?: string;
}
