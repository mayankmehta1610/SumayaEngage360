import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

@Component({
  selector: 'e360-breadcrumbs',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <nav class="e360-breadcrumbs" aria-label="Breadcrumb">
      <a routerLink="/dashboard">Home</a>
      @for (item of items; track item.label) {
        <e360-icon name="chevron-right" [size]="14" />
        @if (item.path) {
          <a [routerLink]="item.path">{{ item.label }}</a>
        } @else {
          <span>{{ item.label }}</span>
        }
      }
    </nav>
  `,
})
export class BreadcrumbsComponent {
  @Input() items: BreadcrumbItem[] = [];
}
