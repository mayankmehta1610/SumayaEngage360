import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

// Thin promise-based wrapper so feature components stay terse.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  // `tenant` explicitly scopes a request to one company (used by public
  // pages whose URL names the tenant). When set, it wins over any stored value.
  get<T>(path: string, params?: QueryParams, tenant?: string): Promise<T> {
    return firstValueFrom(
      this.http.get<T>(`${this.base}${path}`, {
        params: buildHttpParams(params),
        headers: tenant ? { 'x-tenant-id': tenant } : undefined,
      }),
    );
  }

  post<T>(path: string, body?: unknown, tenant?: string): Promise<T> {
    return firstValueFrom(
      this.http.post<T>(`${this.base}${path}`, body ?? {}, {
        headers: tenant ? { 'x-tenant-id': tenant } : undefined,
      }),
    );
  }

  patch<T>(path: string, body?: unknown, tenant?: string): Promise<T> {
    return firstValueFrom(
      this.http.patch<T>(`${this.base}${path}`, body ?? {}, {
        headers: tenant ? { 'x-tenant-id': tenant } : undefined,
      }),
    );
  }

  put<T>(path: string, body?: unknown, tenant?: string): Promise<T> {
    return firstValueFrom(
      this.http.put<T>(`${this.base}${path}`, body ?? {}, {
        headers: tenant ? { 'x-tenant-id': tenant } : undefined,
      }),
    );
  }

  delete<T>(path: string, tenant?: string): Promise<T> {
    return firstValueFrom(
      this.http.delete<T>(`${this.base}${path}`, {
        headers: tenant ? { 'x-tenant-id': tenant } : undefined,
      }),
    );
  }
}

export function errMsg(e: unknown): string {
  const anyE = e as any;
  const m = anyE?.error?.message ?? anyE?.message ?? 'Request failed';
  return Array.isArray(m) ? m.join('; ') : String(m);
}

export interface PaginatedMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function unwrapPaginated<T>(
  res: T[] | { data: T[]; meta: PaginatedMeta },
): { items: T[]; meta?: PaginatedMeta } {
  if (Array.isArray(res)) return { items: res };
  return { items: res.data, meta: res.meta };
}

export type QueryParamValue = string | number | boolean | string[];
export type QueryParams = Record<string, QueryParamValue>;

/** Build HttpParams supporting repeated keys for multi-value filters. */
export function buildHttpParams(params?: QueryParams): HttpParams {
  let p = new HttpParams();
  if (!params) return p;
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === '') continue;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item !== undefined && item !== null && item !== '') {
          p = p.append(key, String(item));
        }
      }
    } else {
      p = p.set(key, String(val));
    }
  }
  return p;
}
