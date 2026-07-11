import { Component, Input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'e360-page-header',
  standalone: true,
  imports: [IconComponent],
  template: `
    <header class="e360-page-header">
      <h1>
        @if (icon) { <e360-icon [name]="icon" [size]="26" /> }
        {{ title }}
      </h1>
      @if (description) { <p class="desc">{{ description }}</p> }
      @if (rolesHint) { <p class="desc"><span class="e360-badge info">Roles: {{ rolesHint }}</span></p> }
    </header>
  `,
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() icon = '';
  @Input() rolesHint = '';
}
