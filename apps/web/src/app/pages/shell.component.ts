import { Component, HostListener, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/auth.service';
import { NAV_GROUPS, ROUTE_ACCESS, routeVisibleForTenant } from '../core/rbac';
import { TenantContextService } from '../core/tenant-context.service';
import { IconComponent } from '../ui/icon.component';
import { ThemeService } from '../core/theme.service';
import { ThemeToggleComponent } from '../ui/theme-toggle.component';

const SECTION_STORAGE_KEY = 'e360-nav-sections';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ThemeToggleComponent],
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
          <div class="e360-sidebar-brand-text">Engage360</div>
          @if (isCompact) {
            <e360-theme-toggle [iconSize]="16" />
          }
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

        @if (!isCompact) {
          <div class="e360-sidebar-toolbar">
            <span class="e360-sidebar-toolbar-label">Menu</span>
            <div class="e360-sidebar-toolbar-actions">
              <button
                type="button"
                class="e360-toolbar-btn"
                (click)="expandAll()"
                title="Expand all sections"
                aria-label="Expand all sections"
              >
                <e360-icon name="chevron-down" [size]="14" />
              </button>
              <button
                type="button"
                class="e360-toolbar-btn"
                (click)="collapseAll()"
                title="Collapse all sections"
                aria-label="Collapse all sections"
              >
                <e360-icon name="chevron-up" [size]="14" />
              </button>
              <e360-theme-toggle [iconSize]="14" />
            </div>
          </div>
        }

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

        <div class="e360-sidebar-footer" [class.compact]="isCompact">
          <div class="e360-profile-card">
            @if (auth.tenant && !isCompact) {
              <div class="e360-profile-tenant">
                <e360-icon name="building-2" [size]="12" />
                <span class="e360-tenant-badge">{{ auth.tenant }}</span>
              </div>
            }
            <div class="e360-profile-main">
              @if (isCompact) {
                <button
                  type="button"
                  class="e360-avatar e360-avatar-btn"
                  (click)="toggleUserMenu($event)"
                  [attr.aria-label]="'Account menu for ' + auth.user()?.firstName"
                  [attr.aria-expanded]="userMenuOpen"
                >
                  {{ userInitials }}
                </button>
              } @else {
                <span
                  class="e360-avatar"
                  [attr.aria-label]="'User avatar for ' + auth.user()?.firstName"
                >
                  {{ userInitials }}
                </span>
                <div class="e360-profile-meta">
                  <strong class="e360-profile-name">
                    {{ auth.user()?.firstName }} {{ auth.user()?.lastName }}
                  </strong>
                  <span class="e360-profile-email" [title]="auth.user()?.email ?? ''">
                    {{ auth.user()?.email }}
                  </span>
                  <div class="e360-profile-roles">
                    @for (r of auth.user()?.roles ?? []; track r) {
                      <span class="e360-role-chip">{{ formatRole(r) }}</span>
                    }
                  </div>
                </div>
                <div class="e360-profile-menu-wrap">
                  <button
                    type="button"
                    class="e360-profile-menu-btn"
                    (click)="toggleUserMenu($event)"
                    aria-label="Account menu"
                    [attr.aria-expanded]="userMenuOpen"
                  >
                    <e360-icon name="more-horizontal" [size]="16" />
                  </button>
                </div>
              }
              @if (userMenuOpen) {
                <div class="e360-profile-dropdown" (click)="$event.stopPropagation()">
                  <a
                    class="e360-profile-dropdown-item"
                    routerLink="/profile"
                    routerLinkActive="active"
                    (click)="closeUserMenu(); onNavClick()"
                  >
                    <e360-icon name="user" [size]="14" />
                    My profile
                  </a>
                  <button type="button" class="e360-profile-dropdown-item" (click)="toggleTheme()">
                    <e360-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="14" />
                    {{ theme.isDark() ? 'Light mode' : 'Dark mode' }}
                  </button>
                  @if (!theme.isSystem()) {
                    <button type="button" class="e360-profile-dropdown-item" (click)="useSystemTheme()">
                      <e360-icon name="laptop" [size]="14" />
                      Use system theme
                    </button>
                  }
                  <button type="button" class="e360-profile-dropdown-item" (click)="signOut()">
                    <e360-icon name="log-out" [size]="14" />
                    Sign out
                  </button>
                </div>
              }
            </div>
          </div>
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
          <div class="e360-mobile-header-actions">
            <e360-theme-toggle [iconSize]="20" />
            @if (auth.tenant) {
              <span class="e360-mobile-tenant">{{ auth.tenant }}</span>
            }
          </div>
        </header>
        <main class="e360-main"><router-outlet /></main>
      </div>
    </div>
  `,
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  tenantCtx = inject(TenantContextService);
  theme = inject(ThemeService);
  private router = inject(Router);

  sidebarOpen = false;
  isMobile = false;
  isCompact = false;
  userMenuOpen = false;
  private sectionState: Record<string, boolean> = {};

  ngOnInit() {
    void this.tenantCtx.load();
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

  @HostListener('document:click')
  onDocumentClick() {
    this.userMenuOpen = false;
  }

  get navGroups() {
    const user = this.auth.user();
    if (!user) return [];
    const roles = user.roles;
    const isPlatform = roles.includes('PLATFORM_ADMIN');
    const tenant = this.tenantCtx.tenant();

    const grouped = new Map<string, typeof ROUTE_ACCESS>();
    for (const route of ROUTE_ACCESS) {
      if (route.path === '/profile') continue;
      if (!isPlatform && !route.roles.some((r) => roles.includes(r))) continue;
      if (route.path === '/tenants' && !isPlatform) continue;
      if (
        !isPlatform &&
        !routeVisibleForTenant(route.path, tenant?.tenantType, tenant?.enabledPortals)
      ) {
        continue;
      }
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
    return this.sectionState[key] ?? false;
  }

  toggleSection(key: string) {
    if (this.isCompact) return;
    const expanding = !this.isSectionExpanded(key);
    if (expanding) {
      for (const g of this.navGroups) {
        this.sectionState[g.key] = g.key === key;
      }
    } else {
      this.sectionState[key] = false;
    }
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

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu() {
    this.userMenuOpen = false;
  }

  signOut() {
    this.closeUserMenu();
    this.auth.logout();
  }

  toggleTheme() {
    this.theme.toggle();
    this.closeUserMenu();
  }

  useSystemTheme() {
    this.theme.useSystem();
    this.closeUserMenu();
  }

  formatRole(role: string): string {
    return role
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
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
    if (this.isCompact) this.userMenuOpen = false;
  }

  private expandActiveSection() {
    const url = this.router.url.split('?')[0];
    let activeKey: string | null = null;
    for (const group of this.navGroups) {
      if (
        group.items.some(
          (item) => url === item.path || url.startsWith(item.path + '/'),
        )
      ) {
        activeKey = group.key;
        break;
      }
    }
    if (activeKey) {
      for (const g of this.navGroups) {
        this.sectionState[g.key] = g.key === activeKey;
      }
      this.saveSectionState();
    }
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
