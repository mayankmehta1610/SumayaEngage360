import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  tenantId: string | null;
}

const TOKEN_KEY = 'e360.token';
const USER_KEY = 'e360.user';
const TENANT_KEY = 'e360.tenant';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly user = signal<SessionUser | null>(this.load());

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Tenant subdomain/id sent as x-tenant-id on every call (in production the
  // subdomain itself resolves the tenant; this makes dev + single-domain work).
  get tenant(): string | null {
    return localStorage.getItem(TENANT_KEY);
  }

  setTenant(value: string) {
    if (value) localStorage.setItem(TENANT_KEY, value);
    else localStorage.removeItem(TENANT_KEY);
  }

  async login(email: string, password: string, tenant: string) {
    this.setTenant(tenant.trim());
    const res = await this.api.post<{ accessToken: string; user: SessionUser }>(
      '/auth/login',
      { email, password },
    );
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.user.set(res.user);
    return res.user;
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  hasRole(...roles: string[]): boolean {
    const u = this.user();
    return !!u && roles.some((r) => u.roles.includes(r));
  }

  private load(): SessionUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }
}
