import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';

/** Structural directive: *hasRole="'HR','TENANT_ADMIN'" */
@Directive({ selector: '[hasRole]', standalone: true })
export class HasRoleDirective {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private auth = inject(AuthService);
  private roles: string[] = [];

  @Input() set hasRole(roles: string | string[]) {
    this.roles = Array.isArray(roles) ? roles : roles.split(',').map((r) => r.trim());
    this.render();
  }

  constructor() {
    effect(() => {
      this.auth.user();
      this.render();
    });
  }

  private render() {
    this.vcr.clear();
    const u = this.auth.user();
    if (!u) return;
    if (this.roles.some((r) => u.roles.includes(r))) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }
}
