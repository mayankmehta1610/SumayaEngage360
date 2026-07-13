import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { LifecycleWizardComponent } from '../ui/lifecycle-wizard.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ModuleShellComponent, LifecycleWizardComponent],
  template: `
    <e360-module-shell title="Global mobility" description="Country-aware candidate profiles, work authorization, sponsorship and expiry control." icon="globe-2" rolesHint="TENANT_ADMIN, HR, MANAGER" [breadcrumbs]="[{label:'Recruitment'}, {label:'Global mobility'}]">
      @if (error) { <div class="e360-error">{{ error }}</div> }
      @if (info) { <div class="card" style="border-color:#22c55e">{{ info }}</div> }

      <div class="card">
        <h2 style="margin-top:0">1. Operating countries</h2>
        <p class="e360-muted">Select every country in which this company, agency or recruiter hires or deploys workers. The primary country controls currency and timezone defaults.</p>
        <div class="row">
          @for (j of catalog; track j.code) {
            <label style="display:flex;gap:.45rem;align-items:center;min-width:13rem">
              <input type="checkbox" [checked]="operatingCountries.includes(j.code)" (change)="toggleCountry(j.code, $event)" [disabled]="!canEdit" />
              {{ j.name }} ({{ j.code }})
            </label>
          }
        </div>
        <div class="row" style="margin-top:.75rem">
          <div><label>Primary country</label><select [(ngModel)]="primaryCountry" [disabled]="!canEdit">@for (code of operatingCountries; track code) { <option [value]="code">{{ nameOf(code) }}</option> }</select></div>
          @if (canEdit) { <div style="align-self:end"><button (click)="saveCountries()">Apply country configuration</button></div> }
        </div>
      </div>

      <div class="card">
        <h2 style="margin-top:0">2. Country requirements</h2>
        <div class="row">
          <div><label>View jurisdiction</label><select [(ngModel)]="selectedCode" (ngModelChange)="onJurisdictionChange()">@for (j of enabledCatalog; track j.code) { <option [value]="j.code">{{ j.name }}</option> }</select></div>
        </div>
        @if (selectedJurisdiction; as j) {
          <div class="row" style="margin-top:.75rem;align-items:flex-start">
            <div style="flex:1;min-width:18rem"><h3>Lifecycle</h3><ol>@for (step of j.lifecycle; track step) { <li>{{ step }}</li> }</ol></div>
            <div style="flex:1;min-width:18rem"><h3>Verification methods</h3><ul>@for (method of j.verificationMethods; track method) { <li>{{ method }}</li> }</ul></div>
          </div>
          <p class="e360-muted">{{ j.notice }}</p>
          <div style="display:flex;gap:.75rem;flex-wrap:wrap">@for (source of j.officialSources; track source.url) { <a [href]="source.url" target="_blank" rel="noopener">{{ source.label }} ↗</a> }</div>
        }
      </div>

      @if (auth.hasRole('TENANT_ADMIN', 'HR')) {
        <div class="card">
          <h2 style="margin-top:0">3. Candidate country profile</h2>
          <div class="row">
            <div><label>Candidate</label><select [(ngModel)]="profile.candidateId"><option value="">Select candidate</option>@for (c of candidates; track c.id) { <option [value]="c.id">{{ c.firstName }} {{ c.lastName }} — {{ c.email }}</option> }</select></div>
            <div><label>Jurisdiction</label><select [(ngModel)]="profile.jurisdictionCode" (ngModelChange)="profileData = {}; profileIdentifiers = {}">@for (j of enabledCatalog; track j.code) { <option [value]="j.code">{{ j.name }}</option> }</select></div>
            @if (profile.jurisdictionCode === 'EU') { <div><label>EU member state</label><input [(ngModel)]="profile.memberStateCode" placeholder="DE, FR, NL…" /></div> }
            <div><label>Nationality</label><input [(ngModel)]="profile.nationality" /></div>
            <div><label>Residence country</label><input [(ngModel)]="profile.residenceCountry" /></div>
          </div>
          <div class="row" style="margin-top:.75rem">
            @for (field of profileFields; track field.key) {
              <div>
                <label>{{ field.label }} @if (field.required) { * }</label>
                @if (field.type === 'BOOLEAN') {
                  <select [ngModel]="fieldValue(field)" (ngModelChange)="setField(field, $event)"><option [ngValue]="undefined">Select</option><option [ngValue]="true">Yes</option><option [ngValue]="false">No</option></select>
                } @else if (field.type === 'SELECT') {
                  <select [ngModel]="fieldValue(field)" (ngModelChange)="setField(field, $event)"><option value="">Select</option>@for (option of field.options ?? []; track option) { <option [value]="option">{{ option }}</option> }</select>
                } @else if (field.type === 'TEXTAREA') {
                  <textarea [ngModel]="fieldValue(field)" (ngModelChange)="setField(field, $event)"></textarea>
                } @else {
                  <input [type]="field.type === 'DATE' ? 'date' : 'text'" [ngModel]="fieldValue(field)" (ngModelChange)="setField(field, $event)" />
                }
              </div>
            }
          </div>
          <button style="margin-top:.75rem" (click)="saveProfile()">Save profile as ready for review</button>
        </div>

        <div class="card">
          <h2 style="margin-top:0">4. Open work-authorization case</h2>
          <div class="row">
            <div><label>Candidate</label><select [(ngModel)]="caseForm.candidateId"><option value="">Select candidate</option>@for (c of candidates; track c.id) { <option [value]="c.id">{{ c.firstName }} {{ c.lastName }}</option> }</select></div>
            <div><label>Jurisdiction</label><select [(ngModel)]="caseForm.jurisdictionCode" (ngModelChange)="onCaseCountryChange()">@for (j of enabledCatalog; track j.code) { <option [value]="j.code">{{ j.name }}</option> }</select></div>
            @if (caseForm.jurisdictionCode === 'EU') { <div><label>EU member state</label><input [(ngModel)]="caseForm.memberStateCode" placeholder="DE, FR, NL…" /></div> }
            <div><label>Authorization/visa type</label><select [(ngModel)]="caseForm.authorizationType">@for (a of caseAuthorizationTypes; track a.code) { <option [value]="a.code">{{ a.label }}</option> }</select></div>
            <div><label>Employer/client</label><input [(ngModel)]="caseForm.employerName" /></div>
            <div><label>Expiry date</label><input type="date" [(ngModel)]="caseForm.expiresAt" /></div>
          </div>
          <button style="margin-top:.75rem" (click)="openCase()">Open assessment</button>
        </div>
      }

      <div class="card">
        <div class="e360-toolbar"><h2 style="margin:0">5. Authorization lifecycle</h2><button class="secondary" (click)="loadCases()">Refresh</button></div>
        <div style="overflow:auto"><table><thead><tr><th>Case</th><th>Candidate</th><th>Country</th><th>Authorization</th><th>Status</th><th>Sponsorship</th><th>Expiry</th><th>Action</th></tr></thead><tbody>
          @for (c of cases; track c.id) {
            <tr><td>{{ c.caseNumber }}</td><td>{{ c.candidate.firstName }} {{ c.candidate.lastName }}</td><td>{{ c.jurisdictionCode }}{{ c.memberStateCode ? '/' + c.memberStateCode : '' }}</td><td>{{ c.authorizationType }}</td><td>{{ c.status }}</td><td>{{ c.sponsorshipRequired ? 'Required' : 'No' }}</td><td>{{ c.expiresAt ? (c.expiresAt | date:'mediumDate') : '—' }}</td><td><button class="secondary" (click)="selectedCase = c">Review</button></td></tr>
          } @empty { <tr><td colspan="8" class="e360-muted">No authorization cases yet.</td></tr> }
        </tbody></table></div>
      </div>

      @if (selectedCase && auth.hasRole('TENANT_ADMIN', 'HR')) {
        <e360-lifecycle-wizard
          entityType="WORK_AUTHORIZATION"
          [entityId]="selectedCase.id"
          workflowCode="GLOBAL_MOBILITY"
          [title]="selectedCase.candidate.firstName + ' ' + selectedCase.candidate.lastName + ' — ' + selectedCase.jurisdictionCode + ' ' + selectedCase.authorizationType"
          [metadata]="{ caseNumber: selectedCase.caseNumber, jurisdictionCode: selectedCase.jurisdictionCode, authorizationType: selectedCase.authorizationType }"
        />
        <div class="card">
          <h2 style="margin-top:0">Review {{ selectedCase.caseNumber }}</h2>
          <div class="row">
            <div><label>Next status</label><select [(ngModel)]="review.status">@for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }</select></div>
            <div><label>Verification method</label><select [(ngModel)]="review.verificationMethod"><option value="">Select</option>@for (m of methodsFor(selectedCase.jurisdictionCode); track m) { <option [value]="m">{{ m }}</option> }</select></div>
            <div><label>Verification reference</label><input [(ngModel)]="review.verificationReference" placeholder="Case/file reference, not full ID number" /></div>
            <div><label>Notes</label><textarea [(ngModel)]="review.notes"></textarea></div>
          </div>
          <button style="margin-top:.75rem" (click)="updateCase()">Save lifecycle step</button>
        </div>
      }
    </e360-module-shell>
  `,
})
export class GlobalMobilityComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  catalog: any[] = [];
  candidates: any[] = [];
  cases: any[] = [];
  operatingCountries: string[] = [];
  primaryCountry = '';
  selectedCode = '';
  error = '';
  info = '';
  profile: any = { candidateId: '', jurisdictionCode: '', memberStateCode: '', nationality: '', residenceCountry: '' };
  profileData: Record<string, any> = {};
  profileIdentifiers: Record<string, any> = {};
  caseForm: any = { candidateId: '', jurisdictionCode: '', memberStateCode: '', authorizationType: '', employerName: '', expiresAt: '' };
  selectedCase: any = null;
  review: any = { status: 'ASSESSMENT', verificationMethod: '', verificationReference: '', notes: '' };
  statuses = ['ASSESSMENT', 'DOCUMENTS_PENDING', 'SPONSORSHIP', 'VERIFICATION_PENDING', 'VERIFIED', 'REJECTED', 'CLOSED'];

  get canEdit() { return this.auth.hasRole('TENANT_ADMIN'); }
  get enabledCatalog() { return this.catalog.filter((j) => this.operatingCountries.includes(j.code)); }
  get selectedJurisdiction() { return this.catalog.find((j) => j.code === this.selectedCode); }
  get profileFields() { return this.catalog.find((j) => j.code === this.profile.jurisdictionCode)?.candidateFields ?? []; }
  get caseAuthorizationTypes() { return this.catalog.find((j) => j.code === this.caseForm.jurisdictionCode)?.authorizationTypes ?? []; }

  async ngOnInit() {
    try {
      const [catalog, config, candidateResult] = await Promise.all([
        this.api.get<any[]>('/jurisdictions/catalog'),
        this.api.get<any>('/jurisdictions/tenant'),
        this.api.get<any>('/candidates', { page: 1, pageSize: 200 }),
      ]);
      this.catalog = catalog;
      this.operatingCountries = config.operatingCountries ?? [];
      this.primaryCountry = config.primaryCountry ?? this.operatingCountries[0] ?? '';
      this.selectedCode = this.operatingCountries[0] ?? '';
      this.profile.jurisdictionCode = this.selectedCode;
      this.caseForm.jurisdictionCode = this.selectedCode;
      this.onCaseCountryChange();
      this.candidates = unwrapPaginated(candidateResult).items;
      await this.loadCases();
    } catch (e) { this.error = errMsg(e); }
  }

  nameOf(code: string) { return this.catalog.find((j) => j.code === code)?.name ?? code; }
  methodsFor(code: string) { return this.catalog.find((j) => j.code === code)?.verificationMethods ?? []; }
  fieldValue(field: any) { return field.sensitive ? this.profileIdentifiers[field.key] : this.profileData[field.key]; }
  setField(field: any, value: any) { (field.sensitive ? this.profileIdentifiers : this.profileData)[field.key] = value; }
  onJurisdictionChange() { this.profile.jurisdictionCode = this.selectedCode; }
  onCaseCountryChange() { this.caseForm.authorizationType = this.caseAuthorizationTypes[0]?.code ?? ''; }
  toggleCountry(code: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.operatingCountries = checked ? [...new Set([...this.operatingCountries, code])] : this.operatingCountries.filter((item) => item !== code);
    if (!this.operatingCountries.includes(this.primaryCountry)) this.primaryCountry = this.operatingCountries[0] ?? '';
  }

  async saveCountries() {
    if (!this.operatingCountries.length || !this.primaryCountry) { this.error = 'Select at least one operating country and a primary country.'; return; }
    try {
      const result = await this.api.put<any>('/jurisdictions/tenant', { operatingCountries: this.operatingCountries, primaryCountry: this.primaryCountry });
      this.operatingCountries = result.operatingCountries; this.info = 'Country configuration and candidate field definitions are active.'; this.error = '';
      this.selectedCode = this.operatingCountries[0]; this.onJurisdictionChange();
    } catch (e) { this.error = errMsg(e); }
  }

  async saveProfile() {
    if (!this.profile.candidateId || !this.profile.jurisdictionCode) { this.error = 'Select a candidate and jurisdiction.'; return; }
    try {
      await this.api.put(`/jurisdictions/candidates/${this.profile.candidateId}/profile`, { ...this.profile, personalData: this.profileData, identifiers: this.profileIdentifiers, consents: { capturedAt: new Date().toISOString() }, completionStatus: 'READY_FOR_REVIEW' });
      this.info = 'Country-specific candidate profile saved for review.'; this.error = '';
    } catch (e) { this.error = errMsg(e); }
  }

  async openCase() {
    if (!this.caseForm.candidateId || !this.caseForm.authorizationType) { this.error = 'Candidate and authorization type are required.'; return; }
    try {
      await this.api.post('/jurisdictions/work-authorizations', { ...this.caseForm, expiresAt: this.caseForm.expiresAt ? new Date(this.caseForm.expiresAt).toISOString() : undefined });
      this.info = 'Work-authorization assessment opened.'; this.error = ''; await this.loadCases();
    } catch (e) { this.error = errMsg(e); }
  }

  async loadCases() {
    try { this.cases = await this.api.get<any[]>('/jurisdictions/work-authorizations'); }
    catch (e) { this.error = errMsg(e); }
  }

  async updateCase() {
    try {
      await this.api.patch(`/jurisdictions/work-authorizations/${this.selectedCase.id}`, this.review);
      this.info = 'Authorization lifecycle updated.'; this.error = ''; this.selectedCase = null; await this.loadCases();
    } catch (e) { this.error = errMsg(e); }
  }
}
