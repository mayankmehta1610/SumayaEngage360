import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errMsg } from '../core/api.service';
import { IconComponent } from './icon.component';
import { SelectFieldComponent, SelectOption } from './select-field.component';

export interface CrudField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: SelectOption[];
  required?: boolean;
  /** default value for the add form */
  default?: unknown;
}

export interface CrudColumn {
  key: string;
  label: string;
  format?: (value: unknown, row: Record<string, unknown>) => string;
}

/**
 * Reusable master-data CRUD card: add form + table with inline edit,
 * delete-with-confirm, validation and success/error feedback.
 * The parent supplies async handlers and reloads on `changed`.
 */
@Component({
  standalone: true,
  selector: 'e360-crud-card',
  imports: [FormsModule, IconComponent, SelectFieldComponent],
  template: `
    <div class="card e360-crud">
      <div class="e360-crud-head">
        <h3>@if (icon) { <e360-icon [name]="icon" [size]="16" /> } {{ title }}</h3>
        <span class="e360-crud-count">{{ rows.length }}</span>
      </div>

      @if (error) { <div class="e360-error e360-crud-msg">{{ error }}</div> }
      @if (success) { <div class="e360-crud-ok">{{ success }}</div> }

      <!-- Add form -->
      <div class="e360-crud-add">
        @for (f of fields; track f.key) {
          @if (f.type === 'select') {
            <e360-select-field
              class="e360-crud-input"
              [options]="f.options ?? []"
              [placeholder]="f.placeholder ?? f.label"
              [(ngModel)]="form[f.key]"
            />
          } @else if (f.type === 'textarea') {
            <textarea
              class="e360-crud-input"
              [placeholder]="f.placeholder ?? f.label"
              [(ngModel)]="form[f.key]"
            ></textarea>
          } @else {
            <input
              class="e360-crud-input"
              [type]="f.type === 'number' ? 'number' : 'text'"
              [placeholder]="f.placeholder ?? f.label"
              [(ngModel)]="form[f.key]"
              (keyup.enter)="create()"
            />
          }
        }
        <button (click)="create()" [disabled]="busy">
          <e360-icon name="plus" [size]="14" /> Add
        </button>
      </div>

      <!-- Table -->
      @if (rows.length) {
        <div class="e360-table-wrap e360-crud-table">
          <table>
            <thead>
              <tr>
                @for (c of displayColumns; track c.key) { <th>{{ c.label }}</th> }
                <th class="e360-crud-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows; track idOf(row)) {
                <tr>
                  @if (editingId === idOf(row)) {
                    @for (f of fields; track f.key) {
                      <td>
                        @if (f.type === 'select') {
                          <e360-select-field [options]="f.options ?? []" [(ngModel)]="editForm[f.key]" />
                        } @else if (f.type === 'textarea') {
                          <textarea [(ngModel)]="editForm[f.key]"></textarea>
                        } @else {
                          <input [type]="f.type === 'number' ? 'number' : 'text'" [(ngModel)]="editForm[f.key]" (keyup.enter)="saveEdit(row)" />
                        }
                      </td>
                    }
                    @if (extraColumnCount > 0) { <td [attr.colspan]="extraColumnCount"></td> }
                    <td class="e360-crud-actions">
                      <button class="sm" (click)="saveEdit(row)" [disabled]="busy"><e360-icon name="check" [size]="13" /></button>
                      <button class="sm secondary" (click)="cancelEdit()"><e360-icon name="x" [size]="13" /></button>
                    </td>
                  } @else {
                    @for (c of displayColumns; track c.key) {
                      <td>{{ c.format ? c.format(row[c.key], row) : (display(row[c.key])) }}</td>
                    }
                    <td class="e360-crud-actions">
                      @if (editable && onUpdate) {
                        <button class="sm ghost" title="Edit" (click)="startEdit(row)"><e360-icon name="pencil" [size]="14" /></button>
                      }
                      @if (deletable && onDelete) {
                        @if (confirmingId === idOf(row)) {
                          <button class="sm danger" (click)="confirmDelete(row)" [disabled]="busy">Delete</button>
                          <button class="sm ghost" (click)="confirmingId = null">Cancel</button>
                        } @else {
                          <button class="sm ghost" title="Delete" (click)="confirmingId = idOf(row)"><e360-icon name="trash-2" [size]="14" /></button>
                        }
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="e360-crud-empty">No {{ title.toLowerCase() }} yet. Add the first one above.</p>
      }
    </div>
  `,
  styles: [`
    .e360-crud { display: flex; flex-direction: column; }
    .e360-crud-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .6rem; }
    .e360-crud-head h3 { display: flex; align-items: center; gap: .4rem; }
    .e360-crud-count {
      font-size: .72rem; font-weight: 700; min-width: 1.4rem; text-align: center;
      padding: .1rem .45rem; border-radius: 999px;
      background: var(--e360-primary-soft); color: var(--e360-primary);
    }
    .e360-crud-add { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .75rem; }
    .e360-crud-input { flex: 1; min-width: 110px; margin: 0 !important; }
    .e360-crud-add > button { flex-shrink: 0; }
    .e360-crud-table { margin-top: .25rem; }
    .e360-crud-table td input, .e360-crud-table td e360-select-field { margin: 0 !important; }
    .e360-crud-actions { white-space: nowrap; display: flex; gap: .25rem; justify-content: flex-end; }
    .e360-crud-actions-col { text-align: right; width: 1%; }
    .e360-crud-msg { margin: 0 0 .5rem; }
    .e360-crud-ok {
      margin: 0 0 .5rem; font-size: .8rem; font-weight: 600;
      color: var(--e360-success); background: var(--e360-success-bg);
      padding: .4rem .6rem; border-radius: var(--e360-radius-sm);
    }
    .e360-crud-empty {
      color: var(--e360-text-muted); font-size: .85rem; text-align: center;
      padding: 1rem; border: 1px dashed var(--e360-border-strong); border-radius: var(--e360-radius-sm);
      background: var(--surface-2);
    }
  `],
})
export class CrudCardComponent implements OnChanges {
  @Input() title = '';
  @Input() icon?: string;
  @Input() fields: CrudField[] = [];
  @Input() columns?: CrudColumn[];
  @Input() rows: Record<string, unknown>[] = [];
  @Input() editable = true;
  @Input() deletable = true;
  @Input() onCreate!: (data: Record<string, unknown>) => Promise<unknown>;
  @Input() onUpdate?: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  @Input() onDelete?: (id: string) => Promise<unknown>;
  /** Emitted after a successful mutation so the parent can reload. */
  @Output() changed = new EventEmitter<void>();

  form: Record<string, unknown> = {};
  editForm: Record<string, unknown> = {};
  editingId: string | null = null;
  confirmingId: string | null = null;
  busy = false;
  error = '';
  success = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fields']) this.applyDefaults();
  }

  get displayColumns(): CrudColumn[] {
    return this.columns ?? this.fields.map((f) => ({ key: f.key, label: f.label }));
  }

  /** columns shown in read mode that aren't editable fields (span filler while editing) */
  get extraColumnCount(): number {
    const fieldKeys = new Set(this.fields.map((f) => f.key));
    return this.displayColumns.filter((c) => !fieldKeys.has(c.key)).length;
  }

  idOf(row: Record<string, unknown>): string {
    return String(row['id'] ?? '');
  }

  display(v: unknown): string {
    if (v == null) return '—';
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  }

  private flash(msg: string) {
    this.success = msg;
    setTimeout(() => (this.success = ''), 2500);
  }

  private missingRequired(data: Record<string, unknown>): string | null {
    for (const f of this.fields) {
      if (f.required && !String(data[f.key] ?? '').trim()) return `${f.label} is required.`;
    }
    return null;
  }

  async create() {
    this.error = '';
    const miss = this.missingRequired(this.form);
    if (miss) { this.error = miss; return; }
    this.busy = true;
    try {
      await this.onCreate({ ...this.form });
      this.form = {};
      this.applyDefaults();
      this.flash('Added.');
      this.changed.emit();
    } catch (e) { this.error = errMsg(e); } finally { this.busy = false; }
  }

  startEdit(row: Record<string, unknown>) {
    this.editingId = row['id'] as string;
    this.confirmingId = null;
    this.error = '';
    this.editForm = {};
    this.fields.forEach((f) => (this.editForm[f.key] = row[f.key]));
  }

  cancelEdit() { this.editingId = null; this.editForm = {}; }

  async saveEdit(row: Record<string, unknown>) {
    if (!this.onUpdate) return;
    this.error = '';
    const miss = this.missingRequired(this.editForm);
    if (miss) { this.error = miss; return; }
    this.busy = true;
    try {
      await this.onUpdate(row['id'] as string, { ...this.editForm });
      this.editingId = null;
      this.flash('Saved.');
      this.changed.emit();
    } catch (e) { this.error = errMsg(e); } finally { this.busy = false; }
  }

  async confirmDelete(row: Record<string, unknown>) {
    if (!this.onDelete) return;
    this.error = '';
    this.busy = true;
    try {
      await this.onDelete(row['id'] as string);
      this.confirmingId = null;
      this.flash('Removed.');
      this.changed.emit();
    } catch (e) { this.error = errMsg(e); } finally { this.busy = false; }
  }

  private applyDefaults() {
    this.fields.forEach((field) => {
      if (field.default !== undefined && this.form[field.key] === undefined) this.form[field.key] = field.default;
    });
  }
}
