import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface TenantBranding {
  name: string;
  logoUrl?: string | null;
  logoFileId?: string | null;
  brandPrimaryColor?: string | null;
  brandAccentColor?: string | null;
  brandTagline?: string | null;
}

const BRAND_VARS = [
  '--e360-primary',
  '--e360-primary-hover',
  '--e360-primary-soft',
  '--e360-primary-grad',
  '--e360-accent',
  '--e360-accent-hover',
  '--e360-accent-soft',
];

/** Loads the tenant's self-service branding and themes the shell with it. */
@Injectable({ providedIn: 'root' })
export class BrandingService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly branding = signal<TenantBranding | null>(null);
  readonly logoSrc = signal<string | null>(null);
  private logoObjectUrl: string | null = null;

  async load() {
    if (this.auth.hasRole('PLATFORM_ADMIN') || !this.auth.tenant) {
      this.clear();
      return;
    }
    try {
      const b = await this.api.get<TenantBranding>('/tenant/branding');
      this.branding.set(b);
      this.applyColors(b);
      await this.loadLogo(b);
    } catch {
      this.clear();
    }
  }

  clear() {
    this.branding.set(null);
    this.setLogo(null);
    const root = document.documentElement;
    for (const v of BRAND_VARS) root.style.removeProperty(v);
  }

  private applyColors(b: TenantBranding) {
    const root = document.documentElement;
    for (const v of BRAND_VARS) root.style.removeProperty(v);
    const primary = b.brandPrimaryColor;
    const accent = b.brandAccentColor;
    if (primary) {
      root.style.setProperty('--e360-primary', primary);
      root.style.setProperty('--e360-primary-hover', shade(primary, -12));
      root.style.setProperty('--e360-primary-soft', `color-mix(in srgb, ${primary} 14%, transparent)`);
      root.style.setProperty(
        '--e360-primary-grad',
        `linear-gradient(135deg, ${primary} 0%, ${accent ?? shade(primary, 18)} 100%)`,
      );
    }
    if (accent) {
      root.style.setProperty('--e360-accent', accent);
      root.style.setProperty('--e360-accent-hover', shade(accent, -12));
      root.style.setProperty('--e360-accent-soft', `color-mix(in srgb, ${accent} 12%, transparent)`);
    }
  }

  private async loadLogo(b: TenantBranding) {
    if (b.logoFileId) {
      try {
        const blob = await firstValueFrom(
          this.http.get(`${environment.apiBase}/tenant/logo`, { responseType: 'blob' }),
        );
        this.setLogo(URL.createObjectURL(blob), true);
        return;
      } catch {
        /* fall through to logoUrl */
      }
    }
    this.setLogo(b.logoUrl ?? null);
  }

  private setLogo(src: string | null, owned = false) {
    if (this.logoObjectUrl) {
      URL.revokeObjectURL(this.logoObjectUrl);
      this.logoObjectUrl = null;
    }
    if (owned && src) this.logoObjectUrl = src;
    this.logoSrc.set(src);
  }
}

/** Lighten (positive pct) or darken (negative pct) a #rrggbb color. */
function shade(hex: string, pct: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  const amt = Math.round(2.55 * pct);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
