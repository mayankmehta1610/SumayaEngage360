import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export type TenantType =
  | 'COMPANY'
  | 'RECRUITMENT_AGENCY'
  | 'STAFFING_COMPANY'
  | 'INDIVIDUAL_RECRUITER';

export interface TenantContext {
  id: string;
  name: string;
  subdomain: string;
  tenantType: TenantType;
  enabledPortals?: string[];
  onboardingQuestionnaire?: Record<string, unknown>;
  country?: string; // primary country (drives URI + location pickers)
  operatingCountries?: string[];
}

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  readonly tenant = signal<TenantContext | null>(null);

  async load() {
    if (this.auth.hasRole('PLATFORM_ADMIN') || !this.auth.tenant) {
      this.tenant.set(null);
      return null;
    }
    try {
      const t = await this.api.get<TenantContext>('/tenant/me');
      this.tenant.set(t);
      return t;
    } catch {
      this.tenant.set(null);
      return null;
    }
  }

  portalEnabled(portal: string): boolean {
    const portals = this.tenant()?.enabledPortals;
    if (!portals?.length) return true;
    return portals.includes(portal);
  }
}
