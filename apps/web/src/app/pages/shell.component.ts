import { Component, HostListener, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/auth.service';
import { NAV_GROUPS, ROUTE_ACCESS } from '../core/rbac';
import { IconComponent } from '../ui/icon.component';

const SECTION_STORAGE_KEY = 'e360-nav-sections';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div
      class="e360-layout"
      [class.sidebar-open]="sidebarOpen"
      [class.sidebar-compact]="isCompact"
    >
      @if (sidebarOpen && isMobile) {
        <div
          class="e360-sidebar-backdrop"
          (click)="closeSidebar()"
          aria-hidden="true"
        ></div>
      }

      <aside class="e360-sidebar" [attr.aria-hidden]="isMobile && !sidebarOpen ? true : null">
        <div class="e360-sidebar-brand">
          <e360-icon name="layout-dashboard" [size]="22" />
          <div class="e360-sidebar-brand-text">
            Engage360
            @if (auth.tenant) {
              <div class="tenant"><span class="e360-tenant-badge">{{ auth.tenant }}</span></div>
            }
          </div>
          @if (isMobile && sidebarOpen) {
            <button
              type="button"
              class="e360-sidebar-close"
              (click)="closeSidebar()"
              aria-label="Close menu"
            >
              <e360-icon name="x" [size]="20" />
            </button>
          }
        </div>

        <nav class="e360-sidebar-nav">
          @for (group of navGroups; track group.key) {
            <div
              class="e360-nav-group"
              [class.collapsed]="!isSectionExpanded(group.key)"
            >
              <button
                type="button"
                class="e360-nav-group-header"
                (click)="toggleSection(group.key)"
                [attr.aria-expanded]="isSectionExpanded(group.key)"
                [attr.aria-label]="'Toggle ' + group.label + ' section'"
              >
                <span class="e360-nav-group-title">{{ group.label }}</span>
                <e360-icon
                  name="chevron-down"
                  [size]="14"
                  class="e360-nav-chevron"
                />
              </button>
              <div class="e360-nav-group-items">
                @for (item of group.items; track item.path) {
                  <a
                    class="e360-nav-link"
                    [routerLink]="item.path"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
                    (click)="onNavClick()"
                    [title]="item.label"
                  >
                    @if (item.icon) { <e360-icon [name]="item.icon" [size]="16" /> }
                    <span class="e360-nav-link-label">{{ item.label }}</span>
                  </a>
                }
              </div>
            </div>
          }
        </nav>

        <div class="e360-sidebar-footer">
          @if (!isCompact) {
            <div class="e360-nav-actions">
              <button type="button" class="e360-nav-action" (click)="expandAll()">Expand all</button>
              <span class="e360-nav-action-sep">·</span>
              <button type="button" class="e360-nav-action" (click)="collapseAll()">Collapse all</button>
            </div>
          }
          <div class="e360-user-menu">
            <div class="e360-user-row">
              <span class="e360-avatar" [attr.aria-label]="'User avatar for ' + auth.user()?.firstName">{{ userInitials }}</span>
              <div class="meta">
                <strong>{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</strong>
                {{ auth.user()?.email }}
              </div>
            </div>
            <div class="e360-user-roles">
              @for (r of auth.user()?.roles ?? []; track r) {
                <span class="e360-badge" style="font-size:.6rem">{{ r }}</span>
              }
            </div>
          </div>
          <a class="e360-nav-link" routerLink="/profile" routerLinkActive="active" (click)="onNavClick()">
            <e360-icon name="user" [size]="16" />
            <span class="e360-nav-link-label">My profile</span>
          </a>
          <a
            class="e360-nav-link"
            href=""
            (click)="$event.preventDefault(); auth.logout()"
          >
            <e360-icon name="log-out" [size]="16" />
            <span class="e360-nav-link-label">Sign out</span>
          </a>
        </div>
      </aside>

      <div class="e360-content-wrap">
        <header class="e360-mobile-header">
          <button
            type="button"
            class="e360-menu-toggle"
            (click)="toggleSidebar()"
            [attr.aria-expanded]="sidebarOpen"
            aria-label="Toggle navigation menu"
          >
            <e360-icon [name]="sidebarOpen ? 'x' : 'menu'" [size]="22" />
          </button>
          <span class="e360-mobile-title">Engage360</span>
          @if (auth.tenant) {
            <span class="e360-mobile-tenant">{{ auth.tenant }}</span>
          }
        </header>
        <main class="e360-main"><router-outlet /></main>
      </div>
    </div>
  `,
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  private router = inject(Router);

  sidebarOpen = false;
  isMobile = false;
  isCompact = false;
  private sectionState: Record<string, boolean> = {};

  ngOnInit() {
    this.loadSectionState();
    this.updateViewport();
    this.expandActiveSection();

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.expandActiveSection();
        if (this.isMobile) this.sidebarOpen = false;
      });
  }

  @HostListener('window:resize')
  onResize() {
    this.updateViewport();
  }

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

  isSectionExpanded(key: string): boolean {
    if (this.isCompact) return true;
    return this.sectionState[key] ?? true;
  }

  toggleSection(key: string) {
    if (this.isCompact) return;
    this.sectionState[key] = !this.isSectionExpanded(key);
    this.saveSectionState();
  }

  expandAll() {
    for (const g of this.navGroups) this.sectionState[g.key] = true;
    this.saveSectionState();
  }

  collapseAll() {
    for (const g of this.navGroups) this.sectionState[g.key] = false;
    this.saveSectionState();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  onNavClick() {
    if (this.isMobile) this.sidebarOpen = false;
  }

  get userInitials(): string {
    const u = this.auth.user();
    if (!u) return '?';
    const f = (u.firstName?.[0] ?? '').toUpperCase();
    const l = (u.lastName?.[0] ?? '').toUpperCase();
    return f + l || (u.email?.[0]?.toUpperCase() ?? '?');
  }

  private updateViewport() {
    const w = window.innerWidth;
    this.isMobile = w < 768;
    this.isCompact = w >= 768 && w < 1024;
    if (!this.isMobile) this.sidebarOpen = false;
  }

  private expandActiveSection() {
    const url = this.router.url.split('?')[0];
    for (const group of this.navGroups) {
      if (group.items.some((item) => url === item.path || url.startsWith(item.path + '/'))) {
        this.sectionState[group.key] = true;
      }
    }
    this.saveSectionState();
  }

  private loadSectionState() {
    try {
      const raw = localStorage.getItem(SECTION_STORAGE_KEY);
      if (raw) this.sectionState = JSON.parse(raw);
    } catch {
      this.sectionState = {};
    }
  }

  private saveSectionState() {
    try {
      localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(this.sectionState));
    } catch {
      /* ignore quota errors */
    }
  }
}
