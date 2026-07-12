import { QueryParams } from '../core/api.service';
export interface TableSort {
  key: string;
  dir: 'asc' | 'desc';
}

/** Build list API query params with optional sort and column filters. */
export function tableListParams(
  page: number,
  pageSize: number,
  extra: QueryParams = {},
  sort?: TableSort | null,
  filters?: Record<string, string>,
): QueryParams {
  const params: QueryParams = {
    ...extra,
    page: String(page),
    pageSize: String(pageSize),
  };
  if (sort?.key) {
    params.sortBy = sort.key;
    params.sortDir = sort.dir;
  }
  const active = filters
    ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v?.trim()))
    : {};
  if (Object.keys(active).length) params.filter = JSON.stringify(active);
  return params;
}
