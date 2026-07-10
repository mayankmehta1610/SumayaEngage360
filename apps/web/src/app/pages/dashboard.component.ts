import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  template: `
    <h1>Dashboard</h1>
    @if (!auth.tenant && !auth.hasRole('PLATFORM_ADMIN')) {
      <div class="card error">No tenant selected — sign in with your tenant subdomain.</div>
    }
    <div class="row">
      <div class="card"><h2>Open jobs</h2><div style="font-size:2rem">{{ stats.jobs ?? '—' }}</div></div>
      <div class="card"><h2>Applications</h2><div style="font-size:2rem">{{ stats.applications ?? '—' }}</div></div>
      <div class="card"><h2>Employees</h2><div style="font-size:2rem">{{ stats.employees ?? '—' }}</div></div>
      <div class="card"><h2>Pending approvals</h2><div style="font-size:2rem">{{ stats.approvals ?? '—' }}</div></div>
    </div>
    <div class="card muted">
      Public careers pages live at <code>/careers/&lt;client-slug&gt;</code> of this site.
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  stats: Record<string, number | undefined> = {};

  async ngOnInit() {
    const grab = async (key: string, path: string) => {
      try {
        const list = await this.api.get<unknown[]>(path);
        this.stats[key] = list.length;
      } catch {
        this.stats[key] = undefined;
      }
    };
    await Promise.all([
      grab('jobs', '/jobs?status=PUBLISHED'),
      grab('applications', '/applications'),
      grab('employees', '/employees'),
      grab('approvals', '/approvals/pending'),
    ]);
  }
}
