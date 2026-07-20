import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SelectFieldComponent, SelectOption } from './select-field.component';

export interface GeoValue {
  countryCode?: string | null;
  stateId?: string | null;
  cityId?: string | null;
  // Display names of the current selection — written by the picker so hosts
  // can fill legacy free-text fields (e.g. careers apply form city/country).
  countryName?: string | null;
  stateName?: string | null;
  cityName?: string | null;
}

/**
 * Cascading Country → State → City selector backed by the geo master data
 * (`/geo/*`). Mutates the bound `model` object's countryCode/stateId/cityId
 * and emits `changed` after every selection. Tenant admins/HR get an inline
 * "add city" affordance for cities missing from the master.
 */
@Component({
  selector: 'e360-geo-picker',
  standalone: true,
  imports: [FormsModule, SelectFieldComponent],
  template: `
    <div class="geo-picker" [class.row]="inline">
      <e360-select-field
        [label]="labels ? 'Country' : ''"
        placeholder="Country"
        [options]="countryOptions"
        [ngModel]="model.countryCode ?? null"
        (ngModelChange)="onCountry($event)"
      />
      <e360-select-field
        [label]="labels ? 'State / province' : ''"
        placeholder="State / province"
        [options]="stateOptions"
        [ngModel]="model.stateId ?? null"
        (ngModelChange)="onState($event)"
        [disabled]="!model.countryCode"
      />
      <div class="geo-city">
        <e360-select-field
          [label]="labels ? 'City' : ''"
          placeholder="City"
          [options]="cityOptions"
          [ngModel]="model.cityId ?? null"
          (ngModelChange)="onCity($event)"
          [disabled]="!model.stateId"
        />
        @if (canAddCity && model.stateId && !addingCity) {
          <button type="button" class="secondary sm geo-add" (click)="addingCity = true" title="Add a missing city">+</button>
        }
      </div>
      @if (addingCity) {
        <div class="geo-add-row">
          <input [(ngModel)]="newCity" placeholder="New city name" (keyup.enter)="saveCity()" />
          <button type="button" class="sm" (click)="saveCity()" [disabled]="!newCity.trim()">Add</button>
          <button type="button" class="secondary sm" (click)="addingCity = false; newCity = ''">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .geo-picker { display: flex; flex-wrap: wrap; gap: .5rem; align-items: flex-end; }
    .geo-picker > * { min-width: 150px; }
    .geo-city { display: flex; gap: .25rem; align-items: flex-end; }
    .geo-add { flex: 0; padding: .3rem .55rem; }
    .geo-add-row { display: flex; gap: .3rem; align-items: center; width: 100%; }
    .geo-add-row input { max-width: 220px; }
  `],
})
export class GeoPickerComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  /** Object whose countryCode / stateId / cityId this picker manages. */
  @Input({ required: true }) model!: GeoValue;
  @Input() labels = true;
  @Input() inline = false;
  /** Set for public pages (careers) where no auth roles exist. */
  @Input() allowAddCity: boolean | null = null;
  @Output() changed = new EventEmitter<GeoValue>();

  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  addingCity = false;
  newCity = '';

  get canAddCity(): boolean {
    return this.allowAddCity ?? this.auth.hasRole('TENANT_ADMIN', 'HR');
  }

  get countryOptions(): SelectOption[] {
    return this.countries.map((c) => ({ value: c.code, label: c.name }));
  }
  get stateOptions(): SelectOption[] {
    return this.states.map((s) => ({ value: s.id, label: s.name }));
  }
  get cityOptions(): SelectOption[] {
    return this.cities.map((c) => ({ value: c.id, label: c.name }));
  }

  async ngOnInit() {
    this.countries = await this.api.get<any[]>('/geo/countries').catch(() => []);
    if (this.model.countryCode) await this.loadStates(this.model.countryCode);
    if (this.model.stateId) await this.loadCities(this.model.stateId);
  }

  private loadStates(country: string) {
    return this.api
      .get<any[]>('/geo/states', { country })
      .then((s) => (this.states = s))
      .catch(() => (this.states = []));
  }

  private loadCities(stateId: string) {
    return this.api
      .get<any[]>('/geo/cities', { stateId })
      .then((c) => (this.cities = c))
      .catch(() => (this.cities = []));
  }

  async onCountry(code: string | null) {
    this.model.countryCode = code;
    this.model.countryName = this.countries.find((c) => c.code === code)?.name ?? null;
    this.model.stateId = null;
    this.model.stateName = null;
    this.model.cityId = null;
    this.model.cityName = null;
    this.states = [];
    this.cities = [];
    if (code) await this.loadStates(code);
    this.changed.emit(this.model);
  }

  async onState(stateId: string | null) {
    this.model.stateId = stateId;
    this.model.stateName = this.states.find((s) => s.id === stateId)?.name ?? null;
    this.model.cityId = null;
    this.model.cityName = null;
    this.cities = [];
    if (stateId) await this.loadCities(stateId);
    this.changed.emit(this.model);
  }

  onCity(cityId: string | null) {
    this.model.cityId = cityId;
    this.model.cityName = this.cities.find((c) => c.id === cityId)?.name ?? null;
    this.changed.emit(this.model);
  }

  async saveCity() {
    const name = this.newCity.trim();
    if (!name || !this.model.stateId) return;
    try {
      const city = await this.api.post<any>('/geo/cities', { stateId: this.model.stateId, name });
      this.addingCity = false;
      this.newCity = '';
      await this.loadCities(this.model.stateId);
      this.onCity(city.id);
    } catch {
      /* keep the input open so the user can retry */
    }
  }
}
