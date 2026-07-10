import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

// Thin promise-based wrapper so feature components stay terse.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return firstValueFrom(
      this.http.get<T>(`${this.base}${path}`, {
        params: new HttpParams({ fromObject: params ?? {} }),
      }),
    );
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.base}${path}`, body ?? {}));
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.patch<T>(`${this.base}${path}`, body ?? {}));
  }
}

export function errMsg(e: unknown): string {
  const anyE = e as any;
  const m = anyE?.error?.message ?? anyE?.message ?? 'Request failed';
  return Array.isArray(m) ? m.join('; ') : String(m);
}
