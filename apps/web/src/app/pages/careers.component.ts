import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { GeoPickerComponent, GeoValue } from '../ui/geo-picker.component';
import { environment } from '../../environments/environment';

interface ExperienceRow {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface EducationRow {
  institution: string;
  degree: string;
  field: string;
  year: string;
}

interface ContactRow {
  name: string;
  relationship: string;
  email: string;
  phone: string;
}

interface ApplyForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  linkedIn: string;
  dateOfBirth: string;
  professionalSummary: string;
  domainExpertiseText: string;
  yearsExperience: string;
  skillsText: string;
  experiences: ExperienceRow[];
  education: EducationRow[];
  contacts: ContactRow[];
  customFields: Record<string, unknown>;
}

const emptyExperience = (): ExperienceRow => ({
  company: '', title: '', startDate: '', endDate: '', description: '',
});

const emptyEducation = (): EducationRow => ({
  institution: '', degree: '', field: '', year: '',
});

const emptyContact = (): ContactRow => ({
  name: '', relationship: '', email: '', phone: '',
});

const emptyForm = (): ApplyForm => ({
  firstName: '', lastName: '', email: '', phone: '',
  city: '', country: '', linkedIn: '', dateOfBirth: '',
  professionalSummary: '', domainExpertiseText: '', yearsExperience: '',
  skillsText: '',
  experiences: [emptyExperience()],
  education: [emptyEducation()],
  contacts: [emptyContact()],
  customFields: {},
});

// Public client-branded careers page: /careers/:slug
@Component({
  standalone: true,
  imports: [FormsModule, GeoPickerComponent],
  template: `
    <div class="e360-careers-page">
      @if (error) { <div class="e360-card e360-error">{{ error }}</div> }
      @if (client) {
        <div class="e360-card e360-careers-hero">
          <h1>{{ client.name }} — Careers</h1>
          @if (client.description) { <p class="muted">{{ client.description }}</p> }
        </div>
        @for (j of jobs; track j.id) {
          <div class="e360-card e360-job-card">
            <div class="toolbar" style="margin-bottom:.25rem">
              <h2>{{ j.title }}</h2>
              <span class="badge ok">{{ j.vacancies }} vacanc{{ j.vacancies === 1 ? 'y' : 'ies' }}</span>
            </div>
            <p class="muted">{{ j.location }}
              @if (j.workMode && j.workMode !== 'ONSITE') { · {{ j.workMode === 'REMOTE' ? 'Remote' : 'Hybrid' }} }
              · {{ j.employmentType }}
              @if (j.minExperience != null) { · {{ j.minExperience }}–{{ j.maxExperience ?? '+' }} yrs }
            </p>
            <p class="e360-job-desc">{{ j.description }}</p>
            <p>
              @for (s of j.skills; track s.skill.name) {
                <span class="badge" style="margin-right:.3rem">{{ s.skill.name }}</span>
              }
            </p>
            <button (click)="toggleApply(j)">
              {{ applyingTo === j.id ? 'Close form' : 'Apply now' }}
            </button>
            @if (applyingTo === j.id) {
              <form class="e360-form e360-apply-form" (submit)="$event.preventDefault(); apply(j)">
                @for (sec of sections; track sec.key) {
                  <details class="e360-apply-section" [open]="openSections[sec.key]">
                    <summary (click)="$event.preventDefault(); toggleSection(sec.key)">
                      <span class="e360-apply-section-num">{{ sec.num }}</span>
                      <span>{{ sec.label }}</span>
                      @if (sectionErrors[sec.key].length) {
                        <span class="badge err e360-apply-section-badge">Needs attention</span>
                      }
                    </summary>
                    <div class="e360-apply-section-body">
                      @if (sec.key === 'personal') {
                        <div class="e360-form-grid">
                          <div>
                            <label>First name *</label>
                            <input [(ngModel)]="form.firstName" name="firstName" required />
                            @if (fieldErr('firstName')) { <span class="e360-field-error">{{ fieldErr('firstName') }}</span> }
                          </div>
                          <div>
                            <label>Last name *</label>
                            <input [(ngModel)]="form.lastName" name="lastName" required />
                            @if (fieldErr('lastName')) { <span class="e360-field-error">{{ fieldErr('lastName') }}</span> }
                          </div>
                          <div>
                            <label>Email *</label>
                            <input type="email" [(ngModel)]="form.email" name="email" required />
                            @if (fieldErr('email')) { <span class="e360-field-error">{{ fieldErr('email') }}</span> }
                          </div>
                          <div>
                            <label>Phone *</label>
                            <input type="tel" [(ngModel)]="form.phone" name="phone" required />
                            @if (fieldErr('phone')) { <span class="e360-field-error">{{ fieldErr('phone') }}</span> }
                          </div>
                          <div class="e360-form-grid-span">
                            <label>Current location *</label>
                            <e360-geo-picker [model]="geo" [labels]="false" [allowAddCity]="false" (changed)="onGeoPicked()" />
                          </div>
                          <div>
                            <label>City *</label>
                            <input [(ngModel)]="form.city" name="city" required placeholder="Pick above or type" />
                            @if (fieldErr('city')) { <span class="e360-field-error">{{ fieldErr('city') }}</span> }
                          </div>
                          <div>
                            <label>Country *</label>
                            <input [(ngModel)]="form.country" name="country" required placeholder="Pick above or type" />
                            @if (fieldErr('country')) { <span class="e360-field-error">{{ fieldErr('country') }}</span> }
                          </div>
                          <div class="e360-form-grid-span">
                            <label>LinkedIn profile URL *</label>
                            <input type="url" [(ngModel)]="form.linkedIn" name="linkedIn" placeholder="https://linkedin.com/in/..." required />
                            @if (fieldErr('linkedIn')) { <span class="e360-field-error">{{ fieldErr('linkedIn') }}</span> }
                          </div>
                          <div>
                            <label>Date of birth</label>
                            <input type="date" [(ngModel)]="form.dateOfBirth" name="dateOfBirth" />
                          </div>
                        </div>
                      }
                      @if (sec.key === 'professional') {
                        <label>Professional summary *</label>
                        <textarea rows="4" [(ngModel)]="form.professionalSummary" name="professionalSummary"
                                  placeholder="Brief overview of your career and strengths"></textarea>
                        @if (fieldErr('professionalSummary')) { <span class="e360-field-error">{{ fieldErr('professionalSummary') }}</span> }
                        <div class="e360-form-grid" style="margin-top:.75rem">
                          <div class="e360-form-grid-span">
                            <label>Domain expertise * (comma separated)</label>
                            <input [(ngModel)]="form.domainExpertiseText" name="domainExpertise"
                                   placeholder="FinTech, Healthcare, SaaS" />
                            @if (fieldErr('domainExpertise')) { <span class="e360-field-error">{{ fieldErr('domainExpertise') }}</span> }
                          </div>
                          <div>
                            <label>Years of experience *</label>
                            <input type="number" min="0" step="0.5" [(ngModel)]="form.yearsExperience" name="yearsExperience" />
                            @if (fieldErr('yearsExperience')) { <span class="e360-field-error">{{ fieldErr('yearsExperience') }}</span> }
                          </div>
                        </div>
                      }
                      @if (sec.key === 'skills') {
                        <label>Your skills * (comma separated)</label>
                        <input [(ngModel)]="form.skillsText" name="skills" placeholder="Angular, NestJS, SQL" />
                        @if (fieldErr('skills')) { <span class="e360-field-error">{{ fieldErr('skills') }}</span> }
                      }
                      @if (sec.key === 'experience') {
                        @for (exp of form.experiences; track $index; let i = $index) {
                          <div class="e360-repeat-block">
                            <div class="e360-repeat-header">
                              <strong>Role {{ i + 1 }}</strong>
                              @if (form.experiences.length > 1) {
                                <button type="button" class="secondary sm" (click)="removeExperience(i)">Remove</button>
                              }
                            </div>
                            <div class="e360-form-grid">
                              <div><label>Company *</label><input [(ngModel)]="exp.company" [name]="'expCo' + i" /></div>
                              <div><label>Title *</label><input [(ngModel)]="exp.title" [name]="'expTi' + i" /></div>
                              <div><label>Start date *</label><input type="date" [(ngModel)]="exp.startDate" [name]="'expSt' + i" /></div>
                              <div><label>End date</label><input type="date" [(ngModel)]="exp.endDate" [name]="'expEn' + i" /></div>
                              <div class="e360-form-grid-span">
                                <label>Description</label>
                                <textarea rows="2" [(ngModel)]="exp.description" [name]="'expDe' + i"></textarea>
                              </div>
                            </div>
                          </div>
                        }
                        <button type="button" class="secondary sm" (click)="addExperience()">+ Add experience</button>
                        @if (fieldErr('experiences')) { <span class="e360-field-error">{{ fieldErr('experiences') }}</span> }
                      }
                      @if (sec.key === 'education') {
                        @for (edu of form.education; track $index; let i = $index) {
                          <div class="e360-repeat-block">
                            <div class="e360-repeat-header">
                              <strong>Education {{ i + 1 }}</strong>
                              @if (form.education.length > 1) {
                                <button type="button" class="secondary sm" (click)="removeEducation(i)">Remove</button>
                              }
                            </div>
                            <div class="e360-form-grid">
                              <div><label>Institution *</label><input [(ngModel)]="edu.institution" [name]="'eduIn' + i" /></div>
                              <div><label>Degree *</label><input [(ngModel)]="edu.degree" [name]="'eduDe' + i" /></div>
                              <div><label>Field of study *</label><input [(ngModel)]="edu.field" [name]="'eduFi' + i" /></div>
                              <div><label>Graduation year *</label><input type="number" min="1950" max="2100" [(ngModel)]="edu.year" [name]="'eduYe' + i" /></div>
                            </div>
                          </div>
                        }
                        <button type="button" class="secondary sm" (click)="addEducation()">+ Add education</button>
                        @if (fieldErr('education')) { <span class="e360-field-error">{{ fieldErr('education') }}</span> }
                      }
                      @if (sec.key === 'documents') {
                        <label>Resume (PDF/DOCX) *</label>
                        <input class="e360-file-input" type="file" accept=".pdf,.doc,.docx"
                               (change)="resume = fileOf($event)" />
                        @if (resume) { <p class="muted" style="margin:0 0 .5rem">Selected: {{ resume.name }}</p> }
                        @if (fieldErr('resume')) { <span class="e360-field-error">{{ fieldErr('resume') }}</span> }
                        <label style="margin-top:.75rem">Cover letter (optional)</label>
                        <input class="e360-file-input" type="file" accept=".pdf,.doc,.docx"
                               (change)="coverLetter = fileOf($event)" />
                        @if (coverLetter) { <p class="muted" style="margin:0">Selected: {{ coverLetter.name }}</p> }
                      }
                      @if (sec.key === 'contacts') {
                        @for (c of form.contacts; track $index; let i = $index) {
                          <div class="e360-repeat-block">
                            <div class="e360-repeat-header">
                              <strong>Reference {{ i + 1 }}</strong>
                              @if (form.contacts.length > 1) {
                                <button type="button" class="secondary sm" (click)="removeContact(i)">Remove</button>
                              }
                            </div>
                            <div class="e360-form-grid">
                              <div><label>Name *</label><input [(ngModel)]="c.name" [name]="'refNa' + i" /></div>
                              <div><label>Relationship *</label><input [(ngModel)]="c.relationship" [name]="'refRe' + i" placeholder="Manager, Colleague" /></div>
                              <div><label>Email *</label><input type="email" [(ngModel)]="c.email" [name]="'refEm' + i" /></div>
                              <div><label>Phone *</label><input type="tel" [(ngModel)]="c.phone" [name]="'refPh' + i" /></div>
                            </div>
                          </div>
                        }
                        <button type="button" class="secondary sm" (click)="addContact()">+ Add reference</button>
                        @if (fieldErr('contacts')) { <span class="e360-field-error">{{ fieldErr('contacts') }}</span> }
                      }
                      @if (sec.key === 'custom' && fieldDefs.length) {
                        <div class="e360-form-grid">
                          @for (fd of fieldDefs; track fd.fieldKey) {
                            <div [class.e360-form-grid-span]="fd.type === 'TEXTAREA'">
                              <label>{{ fd.label }}{{ fd.required ? ' *' : '' }}</label>
                              @if (fd.type === 'TEXTAREA') {
                                <textarea rows="3" [(ngModel)]="form.customFields[fd.fieldKey]"
                                          [name]="'cf_' + fd.fieldKey"></textarea>
                              } @else if (fd.type === 'BOOLEAN') {
                                <input type="checkbox" [(ngModel)]="form.customFields[fd.fieldKey]"
                                       [name]="'cf_' + fd.fieldKey" />
                              } @else if (fd.type === 'SELECT') {
                                <select [(ngModel)]="form.customFields[fd.fieldKey]" [name]="'cf_' + fd.fieldKey">
                                  <option value="">— Select —</option>
                                  @for (opt of selectOptions(fd); track opt) {
                                    <option [value]="opt">{{ opt }}</option>
                                  }
                                </select>
                              } @else if (fd.type === 'NUMBER') {
                                <input type="number" [(ngModel)]="form.customFields[fd.fieldKey]"
                                       [name]="'cf_' + fd.fieldKey" />
                              } @else if (fd.type === 'DATE') {
                                <input type="date" [(ngModel)]="form.customFields[fd.fieldKey]"
                                       [name]="'cf_' + fd.fieldKey" />
                              } @else {
                                <input [(ngModel)]="form.customFields[fd.fieldKey]" [name]="'cf_' + fd.fieldKey" />
                              }
                              @if (fieldErr('custom_' + fd.fieldKey)) {
                                <span class="e360-field-error">{{ fieldErr('custom_' + fd.fieldKey) }}</span>
                              }
                            </div>
                          }
                        </div>
                      }
                      @if (sec.key === 'custom' && !fieldDefs.length) {
                        <p class="muted">No additional fields for this role.</p>
                      }
                    </div>
                  </details>
                }

                @if (applyError) { <div class="e360-error" style="margin-top:.75rem">{{ applyError }}</div> }
                @if (applied) { <div class="badge ok" style="margin:.75rem 0">Application submitted — thank you!</div> }

                <div class="e360-apply-footer">
                  <button type="submit" [disabled]="busy">{{ busy ? 'Submitting…' : 'Submit application' }}</button>
                </div>
              </form>
            }
          </div>
        } @empty {
          <div class="e360-card muted">No open roles right now — check back soon.</div>
        }
      }
    </div>
  `,
})
export class CareersComponent implements OnInit {
  private api = inject(ApiService);
  @Input() slug = '';
  @Input() tenant = '';

  client: any = null;
  jobs: any[] = [];
  error = '';
  applyingTo: string | null = null;
  applied = false;
  applyError = '';
  busy = false;
  form: ApplyForm = emptyForm();
  geo: GeoValue = {};

  /** Structured pick fills the required free-text city/country fields. */
  onGeoPicked() {
    if (this.geo.cityName) this.form.city = this.geo.cityName;
    if (this.geo.countryName) this.form.country = this.geo.countryName;
  }
  resume: File | null = null;
  coverLetter: File | null = null;
  fieldDefs: any[] = [];
  validationErrors: Record<string, string> = {};
  openSections: Record<string, boolean> = {
    personal: true, professional: true, skills: true, experience: true,
    education: true, documents: true, contacts: true, custom: true,
  };

  readonly sections = [
    { key: 'personal', label: 'Personal information', num: '1' },
    { key: 'professional', label: 'Professional background', num: '2' },
    { key: 'skills', label: 'Skills', num: '3' },
    { key: 'experience', label: 'Work experience', num: '4' },
    { key: 'education', label: 'Education', num: '5' },
    { key: 'documents', label: 'Documents', num: '6' },
    { key: 'contacts', label: 'References', num: '7' },
    { key: 'custom', label: 'Additional information', num: '8' },
  ];

  get sectionErrors(): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    const bySection: Record<string, string[]> = {
      personal: ['firstName', 'lastName', 'email', 'phone', 'city', 'country', 'linkedIn'],
      professional: ['professionalSummary', 'domainExpertise', 'yearsExperience'],
      skills: ['skills'],
      experience: ['experiences'],
      education: ['education'],
      documents: ['resume'],
      contacts: ['contacts'],
      custom: Object.keys(this.validationErrors).filter((k) => k.startsWith('custom_')),
    };
    for (const [sec, keys] of Object.entries(bySection)) {
      const errs = keys.map((k) => this.validationErrors[k]).filter(Boolean);
      if (errs.length) map[sec] = errs;
    }
    return map;
  }

  async ngOnInit() {
    try {
      const page = await this.api.get<any>(
        `/public/careers/${this.slug}`, undefined, this.tenant || undefined,
      );
      this.client = page.client;
      this.jobs = page.jobs;
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  toggleApply(job: any) {
    if (this.applyingTo === job.id) {
      this.applyingTo = null;
      return;
    }
    this.applyingTo = job.id;
    this.form = emptyForm();
    this.resume = null;
    this.coverLetter = null;
    this.applied = false;
    this.applyError = '';
    this.validationErrors = {};
    this.loadFieldDefs(job.id);
  }

  toggleSection(key: string) {
    this.openSections[key] = !this.openSections[key];
  }

  async loadFieldDefs(jobId: string) {
    try {
      this.fieldDefs = await this.api.get<any[]>(
        `/public/careers/jobs/${jobId}/field-definitions`, undefined, this.tenant || undefined,
      );
      for (const fd of this.fieldDefs) {
        if (this.form.customFields[fd.fieldKey] === undefined) {
          this.form.customFields[fd.fieldKey] = fd.type === 'BOOLEAN' ? false : '';
        }
      }
    } catch {
      this.fieldDefs = [];
    }
  }

  selectOptions(fd: any): string[] {
    const opts = fd.options;
    if (Array.isArray(opts)) return opts.map(String);
    if (opts && Array.isArray(opts.values)) return opts.values.map(String);
    return [];
  }

  fileOf(ev: Event): File | null {
    return (ev.target as HTMLInputElement).files?.[0] ?? null;
  }

  addExperience() { this.form.experiences.push(emptyExperience()); }
  removeExperience(i: number) { this.form.experiences.splice(i, 1); }
  addEducation() { this.form.education.push(emptyEducation()); }
  removeEducation(i: number) { this.form.education.splice(i, 1); }
  addContact() { this.form.contacts.push(emptyContact()); }
  removeContact(i: number) { this.form.contacts.splice(i, 1); }

  fieldErr(key: string): string {
    return this.validationErrors[key] ?? '';
  }

  private validate(): boolean {
    const e: Record<string, string> = {};
    const req = (key: keyof ApplyForm | string, label: string, val: unknown) => {
      if (val === null || val === undefined || String(val).trim() === '') {
        e[key] = `${label} is required`;
      }
    };
    req('firstName', 'First name', this.form.firstName);
    req('lastName', 'Last name', this.form.lastName);
    req('email', 'Email', this.form.email);
    req('phone', 'Phone', this.form.phone);
    req('city', 'City', this.form.city);
    req('country', 'Country', this.form.country);
    req('linkedIn', 'LinkedIn URL', this.form.linkedIn);
    req('professionalSummary', 'Professional summary', this.form.professionalSummary);
    const domain = this.form.domainExpertiseText.split(',').map((s) => s.trim()).filter(Boolean);
    if (!domain.length) e['domainExpertise'] = 'At least one domain expertise is required';
    const yrs = parseFloat(this.form.yearsExperience);
    if (this.form.yearsExperience.trim() === '' || Number.isNaN(yrs) || yrs < 0) {
      e['yearsExperience'] = 'Valid years of experience is required';
    }
    const skills = this.form.skillsText.split(',').map((s) => s.trim()).filter(Boolean);
    if (!skills.length) e['skills'] = 'At least one skill is required';
    const validExp = this.form.experiences.filter(
      (x) => x.company.trim() && x.title.trim() && x.startDate,
    );
    if (!validExp.length) {
      e['experiences'] = 'At least one complete experience entry is required (company, title, start date)';
    }
    const validEdu = this.form.education.filter(
      (x) => x.institution.trim() && x.degree.trim() && x.field.trim() && x.year,
    );
    if (!validEdu.length) {
      e['education'] = 'At least one complete education entry is required';
    }
    if (!this.resume) e['resume'] = 'Resume upload is required';
    const validContacts = this.form.contacts.filter(
      (x) => x.name.trim() && x.relationship.trim() && x.email.trim() && x.phone.trim(),
    );
    if (!validContacts.length) {
      e['contacts'] = 'At least one complete reference is required';
    }
    for (const fd of this.fieldDefs) {
      if (!fd.required) continue;
      const val = this.form.customFields[fd.fieldKey];
      if (fd.type === 'BOOLEAN') continue;
      if (val === null || val === undefined || String(val).trim() === '') {
        e[`custom_${fd.fieldKey}`] = `${fd.label} is required`;
      }
    }
    this.validationErrors = e;
    return Object.keys(e).length === 0;
  }

  async uploadFile(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const headers: Record<string, string> = {};
    const ten = this.tenant || localStorage.getItem('e360.tenant');
    if (ten) headers['x-tenant-id'] = ten;
    const up = await fetch(`${environment.apiBase}/files`, {
      method: 'POST', body: form, headers,
    }).then((r) => {
      if (!r.ok) throw new Error('File upload failed');
      return r.json();
    });
    return up.id;
  }

  async apply(job: any) {
    this.applyError = '';
    this.applied = false;
    if (!this.validate()) {
      this.applyError = 'Please complete all required fields highlighted above.';
      return;
    }
    this.busy = true;
    try {
      const resumeFileId = await this.uploadFile(this.resume!);
      let coverLetterFileId: string | undefined;
      if (this.coverLetter) coverLetterFileId = await this.uploadFile(this.coverLetter);

      const skills = this.form.skillsText.split(',').map((s) => s.trim()).filter(Boolean);
      const domainExpertise = this.form.domainExpertiseText.split(',').map((s) => s.trim()).filter(Boolean);
      const experiences = this.form.experiences
        .filter((x) => x.company.trim() && x.title.trim() && x.startDate)
        .map((x) => ({
          company: x.company.trim(),
          title: x.title.trim(),
          startDate: new Date(x.startDate).toISOString(),
          endDate: x.endDate ? new Date(x.endDate).toISOString() : undefined,
          description: x.description.trim() || undefined,
        }));
      const education = this.form.education
        .filter((x) => x.institution.trim() && x.degree.trim() && x.field.trim() && x.year)
        .map((x) => ({
          institution: x.institution.trim(),
          degree: x.degree.trim(),
          field: x.field.trim(),
          year: parseInt(x.year, 10),
        }));
      const contacts = this.form.contacts
        .filter((x) => x.name.trim() && x.relationship.trim() && x.email.trim() && x.phone.trim())
        .map((x) => ({
          name: x.name.trim(),
          relationship: x.relationship.trim(),
          email: x.email.trim(),
          phone: x.phone.trim(),
        }));

      const customFields: Record<string, unknown> = {};
      for (const fd of this.fieldDefs) {
        const val = this.form.customFields[fd.fieldKey];
        if (val !== '' && val !== null && val !== undefined) {
          customFields[fd.fieldKey] = val;
        }
      }

      await this.api.post(`/public/careers/jobs/${job.id}/apply`, {
        firstName: this.form.firstName.trim(),
        lastName: this.form.lastName.trim(),
        email: this.form.email.trim(),
        phone: this.form.phone.trim(),
        city: this.form.city.trim(),
        country: this.form.country.trim(),
        countryCode: this.geo.countryCode || undefined,
        stateId: this.geo.stateId || undefined,
        cityId: this.geo.cityId || undefined,
        linkedIn: this.form.linkedIn.trim(),
        dateOfBirth: this.form.dateOfBirth || undefined,
        professionalSummary: this.form.professionalSummary.trim(),
        domainExpertise,
        yearsExperience: parseFloat(this.form.yearsExperience),
        skills,
        experiences,
        education,
        contacts,
        resumeFileId,
        coverLetterFileId,
        customFields: Object.keys(customFields).length ? customFields : undefined,
      }, this.tenant || undefined);
      this.applied = true;
      this.form = emptyForm();
      this.resume = null;
      this.coverLetter = null;
    } catch (e) {
      this.applyError = errMsg(e);
    } finally {
      this.busy = false;
    }
  }
}
