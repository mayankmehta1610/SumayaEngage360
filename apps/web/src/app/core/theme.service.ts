import { Injectable, computed, signal } from '@angular/core';

export type E360ThemePreference = 'light' | 'dark' | 'system';
export type E360ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'e360-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly preference = signal<E360ThemePreference>('system');
  readonly resolvedTheme = computed<E360ResolvedTheme>(() => {
    const pref = this.preference();
    return pref === 'system' ? this.systemPreference() : pref;
  });
  readonly isDark = computed(() => this.resolvedTheme() === 'dark');
  readonly isSystem = computed(() => this.preference() === 'system');

  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.init();
    this.mediaQuery.addEventListener('change', () => {
      if (this.preference() === 'system') {
        this.applyResolved(this.systemPreference(), false);
      }
    });
  }

  init(): void {
    const saved = this.readStored();
    const preference = saved ?? 'system';
    this.preference.set(preference);
    const resolved = preference === 'system' ? this.systemPreference() : preference;
    this.applyResolved(resolved, false);
  }

  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  useSystem(): void {
    this.set('system');
  }

  set(preference: E360ThemePreference): void {
    this.preference.set(preference);
    const resolved = preference === 'system' ? this.systemPreference() : preference;
    this.applyResolved(resolved, true);
  }

  private applyResolved(theme: E360ResolvedTheme, persist: boolean): void {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, this.preference());
      } catch {
        /* ignore quota errors */
      }
    }
  }

  private readStored(): E360ThemePreference | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' || value === 'system' ? value : null;
    } catch {
      return null;
    }
  }

  private systemPreference(): E360ResolvedTheme {
    return this.mediaQuery.matches ? 'dark' : 'light';
  }
}
