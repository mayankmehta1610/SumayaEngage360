import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { NAV_GROUPS, ROUTE_ACCESS } from '../core/rbac';
import { IconComponent } from '../ui/icon.component';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="e360-layout">
      <aside class="e360-sidebar">
        <div class="e360-sidebar-brand">
          <e360-icon name="layout-dashboard" [size]="22" />
          <div>
            Engage360
            @if (auth.tenant) { <div class="tenant">{{ auth.tenant }}</div> }
          </div>
        </div>

        <nav style="flex:1;overflow-y:auto;padding-bottom:.5rem">
          @for (group of navGroups; track group.key) {
            <div class="e360-nav-group">
              <div class="e360-nav-group-title">{{ group.label }}</div>
              @for (item of group.items; track item.path) {
                <a
                  class="e360-nav-link"
                  [routerLink]="item.path"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
                >
                  @if (item.icon) { <e360-icon [name]="item.icon" [size]="16" /> }
                  {{ item.label }}
                </a>
              }
            </div>
          }
        </nav>

        <div class="e360-sidebar-footer">
          <div class="e360-user-menu">
            <strong>{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</strong>
            {{ auth.user()?.email }}
            <div style="margin-top:.35rem;display:flex;flex-wrap:wrap;gap:.2rem">
              @for (r of auth.user()?.roles ?? []; track r) {
                <span class="e360-badge" style="font-size:.6rem">{{ r }}</span>
              }
            </div>
          </div>
          <a class="e360-nav-link" routerLink="/profile" routerLinkActive="active" style="margin-top:.5rem">
            <e360-icon name="user" [size]="16" /> My profile
          </a>
          <a class="e360-nav-link" href="" (click)="$event.preventDefault(); auth.logout()" style="margin-top:.15rem">
            <e360-icon name="log-out" [size]="16" /> Sign out
          </a>
        </div>
      </aside>
      <main class="e360-main"><router-outlet /></main>
    </div>
  `,
})
export class ShellComponent {
  auth = inject(AuthService);

  get navGroups() {
    const user = this.auth.user();
    if (!user) return [];
    const roles = user.roles;
    const isPlatform = roles.includes('PLATFORM_ADMIN');

    const grouped = new Map<string, typeof ROUTE_ACCESS>();
    for (const route of ROUTE_ACCESS) {
      if (route.path === '/profile') continue;
      if (!isPlatform && !route.roles.some((r) => roles.includes(r))) continue;
      if (route.path === '/tenants' && !isPlatform) continue;
      const g = route.group ?? 'platform';
      if (!grouped.has(g)) grouped.set(g, []);
      grouped.get(g)!.push(route);
    }

    return Object.entries(NAV_GROUPS)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, meta]) => ({
        key,
        label: meta.label,
        items: grouped.get(key) ?? [],
      }))
      .filter((g) => g.items.length > 0);
  }
}
