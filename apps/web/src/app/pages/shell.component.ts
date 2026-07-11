import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: [`
    .layout { display: flex; min-height: 100vh; }
    nav {
      width: 215px; background: #101b33; color: #cbd5ec; padding: 1rem .75rem;
      display: flex; flex-direction: column; gap: .15rem; flex-shrink: 0;
    }
    nav .brand { color: #fff; font-weight: 700; padding: .5rem; margin-bottom: .75rem; }
    nav a {
      color: #cbd5ec; padding: .45rem .6rem; border-radius: 7px; font-size: .88rem;
    }
    nav a.active, nav a:hover { background: #1d2c4f; color: #fff; }
    nav .spacer { flex: 1; }
    main { flex: 1; padding: 1.25rem 1.5rem; min-width: 0; }
    .who { font-size: .78rem; color: #8ea0c8; padding: .5rem .6rem; }
  `],
  template: `
    <div class="layout">
      <nav>
        <div class="brand">Engage360</div>
        <a routerLink="/dashboard" routerLinkActive="active">📊 Dashboard</a>
        <a routerLink="/profile" routerLinkActive="active">👤 My profile</a>
        @if (auth.hasRole('PLATFORM_ADMIN')) {
          <a routerLink="/tenants" routerLinkActive="active">Tenants</a>
        }
        @if (auth.hasRole('TENANT_ADMIN')) {
          <a routerLink="/users" routerLinkActive="active">User accounts</a>
        }
        @if (auth.hasRole('TENANT_ADMIN', 'HR', 'INTERVIEWER')) {
          <a routerLink="/clients" routerLinkActive="active">Hiring clients</a>
          <a routerLink="/jobs" routerLinkActive="active">Jobs</a>
          <a routerLink="/candidates" routerLinkActive="active">Talent pool</a>
          <a routerLink="/applications" routerLinkActive="active">Applications</a>
          <a routerLink="/onboarding" routerLinkActive="active">Onboarding</a>
        }
        @if (auth.hasRole('TENANT_ADMIN', 'HR', 'MANAGER')) {
          <a routerLink="/employees" routerLinkActive="active">Employees</a>
          <a routerLink="/org" routerLinkActive="active">Departments</a>
          <a routerLink="/projects" routerLinkActive="active">Projects</a>
        }
        <a routerLink="/timesheets" routerLinkActive="active">Timesheets</a>
        <a routerLink="/appraisals" routerLinkActive="active">Appraisals</a>
        <a routerLink="/trainings" routerLinkActive="active">Trainings</a>
        <a routerLink="/recognition" routerLinkActive="active">Recognition</a>
        <a routerLink="/exit" routerLinkActive="active">Exit</a>
        <a routerLink="/approvals" routerLinkActive="active">Approvals</a>
        <div class="spacer"></div>
        <div class="who">
          {{ auth.user()?.firstName }} {{ auth.user()?.lastName }}<br />
          {{ auth.user()?.email }}
        </div>
        <a href="" (click)="$event.preventDefault(); auth.logout()">Sign out</a>
      </nav>
      <main><router-outlet /></main>
    </div>
  `,
})
export class ShellComponent {
  auth = inject(AuthService);
}
