import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ContentChild,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { EmptyStateComponent } from './empty-state.component';
import { SelectFieldComponent, SelectOption } from './select-field.component';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: Record<string, unknown>, value: unknown) => string;
}

@Component({
  selector: 'e360-data-table',
  standalone: true,
  imports: [NgTemplateOutlet, FormsModule, IconComponent, EmptyStateComponent, SelectFieldComponent],
  template: `
  @if ((searchable && !hasColumnFilters) || hasActiveFilters) {
    <div class="e360-table-toolbar">
      @if (searchable && !hasColumnFilters) {
        <div class="e360-table-search">
          <label>Search</label>
          <input [(ngModel)]="search" (ngModelChange)="onSearchChange()" placeholder="Filter rows…" />
        </div>
      }
      @if (hasActiveFilters) {
        <button type="button" class="secondary sm e360-clear-filters" (click)="clearFilters()">
          Clear filters
        </button>
      }
      <ng-content select="[filters]"></ng-content>
    </div>
  } @else {
    <ng-content select="[filters]"></ng-content>
  }

  @if (loading) {
    <p class="e360-muted">Loading…</p>
  } @else if (!displayRows.length) {
    <e360-empty-state [title]="emptyTitle" [message]="emptyMessage" />
  } @else {
    <div class="e360-table-wrap" [class.e360-table-sticky]="stickyHeader" [style.max-height]="stickyHeader ? maxHeight : null">
      <table class="e360-table e360-table-zebra" [class.e360-table-clickable]="rowClickable">
        <thead>
          <tr>
            @for (col of columns; track col.key) {
              <th>
                @if (isColSortable(col)) {
                  <button type="button" class="e360-th-sort" (click)="toggleSort(col.key)">
                    <span>{{ col.label }}</span>
                    <span class="e360-sort-icons" [class.active]="sortKey === col.key">
                      @if (sortKey === col.key) {
                        <e360-icon [name]="sortDir === 'asc' ? 'chevron-up' : 'chevron-down'" [size]="14" />
                      } @else {
                        <e360-icon name="chevrons-up-down" [size]="14" class="e360-sort-idle" />
                      }
                    </span>
                  </button>
                } @else {
                  {{ col.label }}
                }
              </th>
            }
            <ng-content select="[header-extra]"></ng-content>
          </tr>
          @if (hasColumnFilters) {
            <tr class="e360-filter-row">
              @for (col of columns; track col.key) {
                <th>
                  @if (isColFilterable(col)) {
                    <input
                      class="e360-col-filter"
                      [(ngModel)]="columnFilters[col.key]"
                      (ngModelChange)="onColumnFilterChange()"
                      placeholder="Filter…"
                    />
                  }
                </th>
              }
              <ng-content select="[filter-extra]"></ng-content>
            </tr>
          }
        </thead>
        <tbody>
          @for (row of pagedRows; track trackBy(row, $index)) {
            <tr
              [class.e360-row-selected]="selectedRowKey && row[selectedRowKey] === selectedId"
              (click)="onRowClick(row)"
            >
              @if (rowTemplate) {
                <ng-container *ngTemplateOutlet="rowTemplate; context: { $implicit: row }" />
              } @else {
                @for (col of columns; track col.key) {
                  <td>{{ formatCell(row, col) }}</td>
                }
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if (paginated) {
      <div class="e360-pagination">
        <span>{{ meta.from }}–{{ meta.to }} of {{ meta.total }}</span>
        <div class="pages">
          @if (pageSizeOptions.length > 1) {
            <label class="e360-muted" style="font-size:.75rem;margin-right:.35rem">Rows</label>
            <e360-select-field
              [options]="pageSizeSelectOptions"
              [ngModel]="pageSize"
              (ngModelChange)="onPageSizeChange($event)"
              [searchable]="false"
              [clearable]="false"
              [compact]="true"
            />
          }
          <button type="button" class="secondary sm" [disabled]="page <= 1" (click)="setPage(page - 1)">
            <e360-icon name="chevron-left" [size]="14" />
          </button>
          <span>Page {{ page }} / {{ meta.totalPages }}</span>
          <button type="button" class="secondary sm" [disabled]="page >= meta.totalPages" (click)="setPage(page + 1)">
            <e360-icon name="chevron-right" [size]="14" />
          </button>
        </div>
      </div>
    }
  }
  `,
})
export class DataTableComponent implements OnChanges {
  @Input() columns: TableColumn[] = [];
  @Input() rows: Record<string, unknown>[] = [];
  @Input() sortable = true;
  @Input() filterable = true;
  @Input() searchable = false;
  @Input() paginated = true;
  @Input() pageSize = 15;
  @Input() pageSizeOptions: number[] = [10, 25, 50];
  @Input() page = 1;
  @Input() total?: number;
  @Input() loading = false;
  @Input() stickyHeader = false;
  @Input() maxHeight = 'min(70vh, 640px)';
  @Input() rowClickable = false;
  @Input() selectedRowKey = 'id';
  @Input() selectedId: string | null = null;
  @Input() emptyTitle = 'No records found';
  @Input() emptyMessage = 'Try adjusting your filters.';
  @Input() trackBy: (row: Record<string, unknown>, i: number) => unknown = (_r, i) => i;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() rowClick = new EventEmitter<Record<string, unknown>>();
  @Output() sortChange = new EventEmitter<{ key: string; dir: 'asc' | 'desc' }>();
  @Output() filterChange = new EventEmitter<Record<string, string>>();

  @ContentChild('rowTemplate') rowTemplate?: TemplateRef<{ $implicit: Record<string, unknown> }>;

  search = '';
  sortKey = '';
  sortDir: 'asc' | 'desc' = 'asc';
  columnFilters: Record<string, string> = {};
  displayRows: Record<string, unknown>[] = [];

  get serverMode() { return this.total !== undefined && this.total !== null; }

  get hasColumnFilters() {
    return this.filterable && this.columns.some((c) => this.isColFilterable(c));
  }

  get hasActiveFilters() {
    if (this.search.trim()) return true;
    return Object.values(this.columnFilters).some((v) => v?.trim());
  }

  get pageSizeSelectOptions(): SelectOption[] {
    return this.pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['columns']) {
      for (const col of this.columns) {
        if (this.columnFilters[col.key] === undefined) this.columnFilters[col.key] = '';
      }
    }
    if (changes['rows'] || changes['searchable'] || changes['filterable']) this.applyFilters();
  }

  isColSortable(col: TableColumn) {
    return this.sortable && col.sortable !== false;
  }

  isColFilterable(col: TableColumn) {
    return this.filterable && col.filterable !== false;
  }

  formatCell(row: Record<string, unknown>, col: TableColumn): unknown {
    const value = this.cellValue(row, col.key);
    if (col.render) return col.render(row, value);
    return value;
  }

  onSearchChange() {
    this.page = 1;
    this.pageChange.emit(this.page);
    this.emitFilters();
    if (!this.serverMode) this.applyFilters();
  }

  onColumnFilterChange() {
    this.page = 1;
    this.pageChange.emit(this.page);
    this.emitFilters();
    if (!this.serverMode) this.applyFilters();
  }

  clearFilters() {
    this.search = '';
    for (const col of this.columns) this.columnFilters[col.key] = '';
    this.page = 1;
    this.pageChange.emit(this.page);
    this.emitFilters();
    if (!this.serverMode) this.applyFilters();
  }

  toggleSort(key: string) {
    const col = this.columns.find((c) => c.key === key);
    if (!col || !this.isColSortable(col)) return;
    if (this.sortKey === key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortKey = key; this.sortDir = 'asc'; }
    this.sortChange.emit({ key: this.sortKey, dir: this.sortDir });
    if (!this.serverMode) this.applyFilters();
  }

  setPage(p: number) {
    this.page = Math.max(1, Math.min(p, this.meta.totalPages));
    this.pageChange.emit(this.page);
  }

  onPageSizeChange(ps: number | string) {
    const size = typeof ps === 'string' ? parseInt(ps, 10) : ps;
    this.pageSize = size;
    this.page = 1;
    this.pageSizeChange.emit(size);
    this.pageChange.emit(this.page);
  }

  onRowClick(row: Record<string, unknown>) {
    if (this.rowClickable) this.rowClick.emit(row);
  }

  get pagedRows() {
    if (!this.paginated || this.serverMode) return this.displayRows;
    const start = (this.page - 1) * this.pageSize;
    return this.displayRows.slice(start, start + this.pageSize);
  }

  get meta() {
    const total = this.serverMode ? (this.total ?? 0) : this.displayRows.length;
    const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    const from = total ? (this.page - 1) * this.pageSize + 1 : 0;
    const to = this.serverMode
      ? Math.min(this.page * this.pageSize, total)
      : Math.min(this.page * this.pageSize, total);
    return { total, totalPages, from, to };
  }

  cellValue(row: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], row) ?? '—';
  }

  private emitFilters() {
    const active: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.columnFilters)) {
      if (v?.trim()) active[k] = v.trim();
    }
    if (this.search.trim()) active['__search'] = this.search.trim();
    this.filterChange.emit(active);
  }

  private applyFilters() {
    if (this.serverMode) {
      this.displayRows = [...this.rows];
      return;
    }
    let list = [...this.rows];
    const activeFilters = Object.fromEntries(
      Object.entries(this.columnFilters).filter(([, v]) => v?.trim()),
    );
    for (const [key, q] of Object.entries(activeFilters)) {
      const needle = q.toLowerCase();
      list = list.filter((r) =>
        String(this.cellValue(r, key) ?? '').toLowerCase().includes(needle),
      );
    }
    if (this.searchable && this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter((r) =>
        this.columns.some((c) =>
          String(this.cellValue(r, c.key) ?? '').toLowerCase().includes(q),
        ),
      );
    }
    if (this.sortKey) {
      const k = this.sortKey;
      const dir = this.sortDir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const av = String(this.cellValue(a, k) ?? '');
        const bv = String(this.cellValue(b, k) ?? '');
        const an = Number(av);
        const bn = Number(bv);
        if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') {
          return (an - bn) * dir;
        }
        return av.localeCompare(bv, undefined, { numeric: true }) * dir;
      });
    }
    this.displayRows = list;
    if (this.paginated && this.page > this.meta.totalPages) {
      this.page = this.meta.totalPages;
      this.pageChange.emit(this.page);
    }
  }
}
