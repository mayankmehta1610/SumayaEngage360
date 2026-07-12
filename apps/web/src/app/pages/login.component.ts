import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { homeForRoles } from '../core/rbac';
import { IconComponent } from '../ui/icon.component';
import { ThemeToggleComponent } from '../ui/theme-toggle.component';

@Component({
  standalone: true,
  imports: [FormsModule, IconComponent, ThemeToggleComponent],
  template: `
    <div class="e360-login-page">
      <e360-theme-toggle class="e360-login-theme-toggle" [iconSize]="20" />
      <div class="e360-login-card">
        <div class="e360-login-brand">
          <div class="logo" aria-hidden="true">
            <e360-icon name="layout-dashboard" [size]="28" />
          </div>
          <h1>SumayaEngage360</h1>
          <p>Sign in to your enterprise workspace</p>
        </div>

        <label class="e360-label">Tenant (subdomain — leave empty for platform admin)</label>
        <input [(ngModel)]="tenant" placeholder="acme" autocomplete="organization" />
        <label class="e360-label">Email</label>
        <input [(ngModel)]="email" type="email" autocomplete="username" />
        <label class="e360-label">Password</label>
        <input
          [(ngModel)]="password"
          type="password"
          autocomplete="current-password"
          (keyup.enter)="submit()"
        />
        @if (error) { <div class="error">{{ error }}</div> }
        <button (click)="submit()" [disabled]="busy" style="width:100%;margin-top:0.5rem">
          @if (!busy) { <e360-icon name="log-in" [size]="16" /> }
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  tenant = this.auth.tenant ?? '';
  email = '';
  password = '';
  error = '';
  busy = false;

  async submit() {
    this.busy = true;
    this.error = '';
    try {
      const user = await this.auth.login(this.email, this.password, this.tenant);
      this.router.navigateByUrl(homeForRoles(user.roles));
    } catch (e) {
      this.error = errMsg(e);
    } finally {
      this.busy = false;
    }
  }
}
