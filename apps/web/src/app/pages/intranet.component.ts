import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { renderMarkdown } from '../core/markdown';
import { TENANT_ROLES } from '../core/rbac';
import { IconComponent } from '../ui/icon.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

interface CategoryNode {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  parentId?: string | null;
  departmentId: string;
  bannerFileId?: string | null;
  accessLevel: string;
  sortOrder: number;
  contentCount: number;
  children: CategoryNode[];
}

const TYPE_ICON: Record<string, string> = {
  ARTICLE: 'newspaper',
  DOCUMENT: 'file-text',
  VIDEO: 'video',
  POSTER: 'image',
  LINK: 'link',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'In review',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, IconComponent, SelectFieldComponent],
  template: `
    <div class="in-wrap">
      @if (error) { <div class="e360-error">{{ error }}</div> }

      <!-- ── command bar ─────────────────────────────────────── -->
      <div class="in-cmdbar">
        <button class="in-crumb" (click)="goHome()" [class.active]="view === 'home'">
          <e360-icon name="home" [size]="15" /> Intranet home
        </button>
        @if (view === 'department' && dept) {
          <e360-icon name="chevron-right" [size]="14" class="in-crumb-sep" />
          <span class="in-crumb active">{{ dept.name }}</span>
          @if (selectedCategory) {
            <e360-icon name="chevron-right" [size]="14" class="in-crumb-sep" />
            <span class="in-crumb active">{{ selectedCategory.name }}</span>
          }
        }
        <span class="in-cmdbar-spacer"></span>
        <div class="in-search">
          <e360-icon name="search" [size]="15" />
          <input
            [(ngModel)]="searchQ"
            (keyup.enter)="runSearch()"
            placeholder="Search news, documents, videos…"
          />
        </div>
        @if (reviewPending > 0) {
          <button class="in-btn" (click)="openReview()">
            <e360-icon name="check-square" [size]="15" /> Review queue ({{ reviewPending }})
          </button>
        }
        @if (canPublish) {
          <button class="in-btn primary" (click)="toggleManage()">
            <e360-icon [name]="manageOpen ? 'x' : 'pencil'" [size]="15" />
            {{ manageOpen ? 'Close manage' : 'Manage & publish' }}
          </button>
        } @else if (canContribute) {
          <button class="in-btn primary" (click)="toggleManage()">
            <e360-icon [name]="manageOpen ? 'x' : 'pencil'" [size]="15" />
            {{ manageOpen ? 'Close' : 'Contribute content' }}
          </button>
        }
      </div>

      <!-- ── review queue (moderation) ─────────────────────────── -->
      @if (reviewOpen) {
        <div class="in-manage">
          <div class="in-manage-head">
            <h3><e360-icon name="check-square" [size]="16" /> Content awaiting your review</h3>
            <button class="in-btn" (click)="reviewOpen = false"><e360-icon name="x" [size]="14" /> Close</button>
          </div>
          @if (reviewItems.length === 0) {
            <p class="in-muted">Nothing is waiting for your review right now.</p>
          }
          @for (r of reviewItems; track r.id) {
            <div class="in-review-row">
              <div>
                <strong>{{ r.title }}</strong>
                <span class="in-card-type inline">{{ r.type }}</span>
                <div class="in-muted">{{ r.category?.name || 'General' }} · submitted by author</div>
                @if (r.summary) { <div class="in-muted">{{ r.summary }}</div> }
              </div>
              <div class="in-review-actions">
                <button class="in-btn primary" (click)="reviewDecide(r, 'approve')">Approve &amp; publish</button>
                <button class="in-btn" (click)="reviewDecide(r, 'reject')">Return for changes</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- ── manage / publishing studio ──────────────────────── -->
      @if (manageOpen) {
        <div class="in-manage">
          <div class="in-manage-tabs">
            <button [class.active]="manageTab === 'content'" (click)="manageTab = 'content'">
              <e360-icon name="newspaper" [size]="14" /> Content
            </button>
            <button [class.active]="manageTab === 'categories'" (click)="manageTab = 'categories'">
              <e360-icon name="folder" [size]="14" /> Categories
            </button>
            <button [class.active]="manageTab === 'banners'" (click)="manageTab = 'banners'">
              <e360-icon name="image" [size]="14" /> Banners
            </button>
          </div>

          @if (manageTab === 'content') {
            <div class="in-manage-grid">
              <div class="in-form">
                <h3>{{ editingContentId ? 'Edit content' : 'Publish new content' }}</h3>
                <div class="in-form-row">
                  <e360-select-field label="Department" [options]="deptOptions" [(ngModel)]="cForm.departmentId" (ngModelChange)="onFormDeptChange()" [clearable]="false" />
                  <e360-select-field label="Category (up to 3 levels)" [options]="formCategoryOptions" [(ngModel)]="cForm.categoryId" />
                  <e360-select-field label="Type" [options]="typeOptions" [(ngModel)]="cForm.type" [clearable]="false" />
                </div>
                <div><label>Title</label><input [(ngModel)]="cForm.title" placeholder="Quarterly townhall recording" /></div>
                <div><label>Summary</label><input [(ngModel)]="cForm.summary" placeholder="One-line teaser shown on cards" /></div>
                @if (cForm.type === 'ARTICLE') {
                  <div>
                    <label>Body (Markdown)</label>
                    <div class="in-md-toolbar">
                      <button type="button" class="in-md-btn" title="Bold" (click)="mdWrap('**')"><strong>B</strong></button>
                      <button type="button" class="in-md-btn" title="Italic" (click)="mdWrap('*')"><em>I</em></button>
                      <button type="button" class="in-md-btn" title="Heading" (click)="mdPrefix('## ')">H</button>
                      <button type="button" class="in-md-btn" title="Bullet list" (click)="mdPrefix('- ')">•</button>
                      <button type="button" class="in-md-btn" title="Numbered list" (click)="mdPrefix('1. ')">1.</button>
                      <button type="button" class="in-md-btn" title="Quote" (click)="mdPrefix('> ')">"</button>
                      <button type="button" class="in-md-btn" title="Code" (click)="mdWrap('\`')">&lt;/&gt;</button>
                      <button type="button" class="in-md-btn" title="Link" (click)="mdLink()"><e360-icon name="link" [size]="12" /></button>
                      <span style="flex:1"></span>
                      <button type="button" class="in-md-btn" [class.active]="mdPreview" (click)="mdPreview = !mdPreview">
                        <e360-icon name="eye" [size]="12" /> Preview
                      </button>
                    </div>
                    <textarea #bodyArea rows="7" [(ngModel)]="cForm.body"
                      placeholder="Write the article… Markdown supported: # heading, **bold**, *italic*, - lists, [link](https://…), \`code\`"></textarea>
                    @if (mdPreview && cForm.body) {
                      <div class="in-article in-md-preview" [innerHTML]="renderMd(cForm.body)"></div>
                    }
                  </div>
                }
                @if (cForm.type === 'LINK') {
                  <div><label>External URL</label><input [(ngModel)]="cForm.externalUrl" placeholder="https://…" /></div>
                }
                @if (cForm.type === 'DOCUMENT' || cForm.type === 'VIDEO' || cForm.type === 'POSTER') {
                  <div class="in-upload-row">
                    <label class="in-upload">
                      <e360-icon name="upload" [size]="14" />
                      {{ cForm.fileId ? 'Replace file' : 'Upload ' + cForm.type.toLowerCase() }}
                      <input type="file" hidden (change)="uploadInto($event, cForm, 'fileId')" />
                    </label>
                    @if (cForm.fileId) { <span class="in-file-ok"><e360-icon name="check-circle" [size]="13" /> {{ uploadNames[cForm.fileId] || 'file attached' }}</span> }
                  </div>
                }
                <div class="in-upload-row">
                  <label class="in-upload">
                    <e360-icon name="image" [size]="14" />
                    {{ cForm.coverFileId ? 'Replace cover image' : 'Cover image (optional)' }}
                    <input type="file" accept="image/*" hidden (change)="uploadInto($event, cForm, 'coverFileId')" />
                  </label>
                  @if (cForm.coverFileId) { <span class="in-file-ok"><e360-icon name="check-circle" [size]="13" /> cover attached</span> }
                </div>
                <div class="in-form-row">
                  <e360-select-field label="Who can see it" [options]="accessOptions" [(ngModel)]="cForm.accessLevel" [clearable]="false" />
                  <div><label>Tags (comma separated)</label><input [(ngModel)]="cForm.tagsCsv" placeholder="policy, townhall" /></div>
                  <div><label>Expires on (optional)</label><input type="date" [(ngModel)]="cForm.expiresAt" /></div>
                </div>
                @if (cForm.accessLevel === 'ROLES') {
                  <div class="in-roles">
                    @for (r of roleChoices; track r) {
                      <label><input type="checkbox" [checked]="cForm.allowedRoles.includes(r)" (change)="toggleRole(cForm.allowedRoles, r)" /> {{ r }}</label>
                    }
                  </div>
                }
                <div class="in-check-row">
                  <label><input type="checkbox" [(ngModel)]="cForm.downloadable" /> Allow download</label>
                  <label><input type="checkbox" [(ngModel)]="cForm.pinned" /> Feature on home page</label>
                </div>
                <div class="in-form-actions">
                  <button class="in-btn primary" (click)="saveContent()">{{ editingContentId ? 'Save changes' : 'Save as draft' }}</button>
                  @if (editingContentId) { <button class="in-btn" (click)="resetContentForm()">Cancel</button> }
                </div>
              </div>

              <div class="in-manage-list">
                <h3>All content <span class="e360-muted">({{ manageContent.length }})</span></h3>
                <table class="in-table">
                  <tr><th>Title</th><th>Type</th><th>Status</th><th>Access</th><th>DL</th><th>Views</th><th></th></tr>
                  @for (c of manageContent; track c.id) {
                    <tr>
                      <td class="in-td-title">{{ c.title }}<div class="e360-muted sm">{{ c.category?.name || '—' }}</div></td>
                      <td><e360-icon [name]="typeIcon(c.type)" [size]="14" /> {{ c.type }}</td>
                      <td><span class="in-status" [attr.data-s]="c.status">{{ statusLabel(c.status) }}</span></td>
                      <td>{{ c.accessLevel }}</td>
                      <td>{{ c.downloadable ? 'Yes' : 'No' }}</td>
                      <td>{{ c.viewCount }}</td>
                      <td class="in-td-actions">
                        <button class="in-mini" title="Edit" (click)="editContent(c)"><e360-icon name="pencil" [size]="13" /></button>
                        @if (c.status !== 'PUBLISHED') { <button class="in-mini ok" title="Publish" (click)="transition(c.id, 'publish')"><e360-icon name="check-circle" [size]="13" /></button> }
                        @if (c.status === 'PUBLISHED') { <button class="in-mini" title="Unpublish" (click)="transition(c.id, 'unpublish')"><e360-icon name="eye" [size]="13" /></button> }
                        @if (c.status !== 'ARCHIVED') { <button class="in-mini" title="Archive" (click)="transition(c.id, 'archive')"><e360-icon name="archive" [size]="13" /></button> }
                        <button class="in-mini danger" title="Delete" (click)="deleteContent(c.id)"><e360-icon name="trash-2" [size]="13" /></button>
                      </td>
                    </tr>
                  } @empty { <tr><td colspan="7" class="e360-muted">Nothing yet — publish your first item.</td></tr> }
                </table>
              </div>
            </div>
          }

          @if (manageTab === 'categories') {
            <div class="in-manage-grid">
              <div class="in-form">
                <h3>New category</h3>
                <div class="in-form-row">
                  <e360-select-field label="Department" [options]="deptOptions" [(ngModel)]="catForm.departmentId" (ngModelChange)="onFormDeptChange()" [clearable]="false" />
                  <e360-select-field label="Parent category (optional)" [options]="parentCategoryOptions" [(ngModel)]="catForm.parentId" />
                </div>
                <div><label>Name</label><input [(ngModel)]="catForm.name" placeholder="Policies" /></div>
                <div><label>Description</label><input [(ngModel)]="catForm.description" /></div>
                <div class="in-form-row">
                  <e360-select-field label="Who can see it" [options]="accessOptions" [(ngModel)]="catForm.accessLevel" [clearable]="false" />
                  <e360-select-field label="Who reviews submissions" [options]="reviewerOptions" [(ngModel)]="catForm.reviewerRole" placeholder="Department head (default)" />
                  <div><label>Sort order</label><input type="number" [(ngModel)]="catForm.sortOrder" /></div>
                </div>
                <div class="in-upload-row">
                  <label class="in-upload">
                    <e360-icon name="image" [size]="14" />
                    {{ catForm.bannerFileId ? 'Replace category banner' : 'Category banner (optional)' }}
                    <input type="file" accept="image/*" hidden (change)="uploadInto($event, catForm, 'bannerFileId')" />
                  </label>
                  @if (catForm.bannerFileId) { <span class="in-file-ok"><e360-icon name="check-circle" [size]="13" /> banner attached</span> }
                </div>
                <div class="in-form-actions"><button class="in-btn primary" (click)="saveCategory()">Create category</button></div>
              </div>
              <div class="in-manage-list">
                <h3>Structure <span class="e360-muted">(max 3 levels)</span></h3>
                @for (n of flatCategories(manageTree); track n.id) {
                  <div class="in-cat-row" [style.paddingLeft.px]="12 + (n.depth - 1) * 22">
                    <e360-icon [name]="n.depth === 1 ? 'folder' : 'chevron-right'" [size]="14" />
                    <span>{{ n.name }}</span>
                    <span class="e360-muted sm">{{ n.contentCount }} items · {{ n.accessLevel }}</span>
                    <button class="in-mini danger" title="Delete" (click)="deleteCategory(n.id)"><e360-icon name="trash-2" [size]="13" /></button>
                  </div>
                } @empty { <p class="e360-muted">No categories in this department yet.</p> }
              </div>
            </div>
          }

          @if (manageTab === 'banners') {
            <div class="in-manage-grid">
              <div class="in-form">
                <h3>New banner</h3>
                <div class="in-form-row">
                  <e360-select-field label="Placement" [options]="bannerScopeOptions" [(ngModel)]="bForm.scope" [clearable]="false" />
                  @if (bForm.scope !== 'company') {
                    <e360-select-field label="Department" [options]="deptOptions" [(ngModel)]="bForm.departmentId" (ngModelChange)="onFormDeptChange()" [clearable]="false" />
                  }
                  @if (bForm.scope === 'category') {
                    <e360-select-field label="Category" [options]="formCategoryOptions" [(ngModel)]="bForm.categoryId" [clearable]="false" />
                  }
                </div>
                <div><label>Title</label><input [(ngModel)]="bForm.title" placeholder="Welcome to the new intranet" /></div>
                <div><label>Subtitle</label><input [(ngModel)]="bForm.subtitle" /></div>
                <div><label>Link URL (optional)</label><input [(ngModel)]="bForm.linkUrl" placeholder="https://… or /trainings" /></div>
                <div class="in-form-row">
                  <div><label>Active from</label><input type="date" [(ngModel)]="bForm.startsAt" /></div>
                  <div><label>Until</label><input type="date" [(ngModel)]="bForm.endsAt" /></div>
                  <div><label>Sort order</label><input type="number" [(ngModel)]="bForm.sortOrder" /></div>
                </div>
                <div class="in-upload-row">
                  <label class="in-upload">
                    <e360-icon name="image" [size]="14" />
                    {{ bForm.imageFileId ? 'Replace banner image' : 'Banner image' }}
                    <input type="file" accept="image/*" hidden (change)="uploadInto($event, bForm, 'imageFileId')" />
                  </label>
                  @if (bForm.imageFileId) { <span class="in-file-ok"><e360-icon name="check-circle" [size]="13" /> image attached</span> }
                </div>
                <div class="in-form-actions"><button class="in-btn primary" (click)="saveBanner()">Create banner</button></div>
              </div>
              <div class="in-manage-list">
                <h3>All banners</h3>
                <table class="in-table">
                  <tr><th>Title</th><th>Placement</th><th>Active</th><th>Window</th><th></th></tr>
                  @for (b of manageBanners; track b.id) {
                    <tr>
                      <td>{{ b.title }}</td>
                      <td>{{ b.categoryId ? 'Category' : b.departmentId ? 'Department' : 'Company-wide' }}</td>
                      <td><span class="in-status" [attr.data-s]="b.isActive ? 'PUBLISHED' : 'DRAFT'">{{ b.isActive ? 'Active' : 'Off' }}</span></td>
                      <td class="e360-muted sm">{{ (b.startsAt | date: 'MMM d') || '—' }} → {{ (b.endsAt | date: 'MMM d') || '—' }}</td>
                      <td class="in-td-actions">
                        <button class="in-mini" [title]="b.isActive ? 'Deactivate' : 'Activate'" (click)="toggleBanner(b)"><e360-icon name="eye" [size]="13" /></button>
                        <button class="in-mini danger" title="Delete" (click)="deleteBanner(b.id)"><e360-icon name="trash-2" [size]="13" /></button>
                      </td>
                    </tr>
                  } @empty { <tr><td colspan="5" class="e360-muted">No banners yet.</td></tr> }
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- ── HOME ────────────────────────────────────────────── -->
      @if (view === 'home' && home) {
        <!-- hero banner carousel -->
        @if (home.banners.length) {
          <div class="in-hero">
            @for (b of home.banners; track b.id; let i = $index) {
              @if (i === bannerIdx) {
                <div class="in-hero-slide" [style.backgroundImage]="bannerBg(b)">
                  <div class="in-hero-overlay">
                    <h1>{{ b.title }}</h1>
                    @if (b.subtitle) { <p>{{ b.subtitle }}</p> }
                    @if (b.linkUrl) { <a class="in-btn hero" [href]="b.linkUrl" target="_blank" rel="noopener">Learn more</a> }
                  </div>
                </div>
              }
            }
            @if (home.banners.length > 1) {
              <button class="in-hero-nav prev" (click)="prevBanner()"><e360-icon name="chevron-left" [size]="18" /></button>
              <button class="in-hero-nav next" (click)="nextBanner()"><e360-icon name="chevron-right" [size]="18" /></button>
              <div class="in-hero-dots">
                @for (b of home.banners; track b.id; let i = $index) {
                  <button [class.on]="i === bannerIdx" (click)="bannerIdx = i"></button>
                }
              </div>
            }
          </div>
        } @else {
          <div class="in-hero in-hero-empty">
            <div class="in-hero-overlay">
              <h1>Welcome to your company intranet</h1>
              <p>News, documents, videos and department hubs — all in one place.</p>
            </div>
          </div>
        }

        <!-- featured / pinned -->
        @if (home.pinned.length) {
          <div class="in-section-head"><e360-icon name="pin" [size]="16" /> <h2>Featured</h2></div>
          <div class="in-cards featured">
            @for (c of home.pinned; track c.id) {
              <div class="in-card" (click)="openContent(c)">
                <div class="in-card-media" [style.backgroundImage]="coverBg(c)">
                  @if (!covers[c.id]) { <e360-icon [name]="typeIcon(c.type)" [size]="30" /> }
                  <span class="in-card-type">{{ c.type }}</span>
                </div>
                <div class="in-card-body">
                  <strong>{{ c.title }}</strong>
                  @if (c.summary) { <p>{{ c.summary }}</p> }
                  <div class="in-card-meta">{{ c.category?.name || 'General' }} · {{ c.publishedAt | date: 'MMM d' }}</div>
                </div>
              </div>
            }
          </div>
        }

        <!-- department hubs -->
        <div class="in-section-head"><e360-icon name="network" [size]="16" /> <h2>Department hubs</h2></div>
        <div class="in-hubs">
          @for (d of home.departments; track d.id) {
            <button class="in-hub" [class.mine]="d.isMine" (click)="openDepartment(d)">
              <span class="in-hub-icon"><e360-icon name="building-2" [size]="20" /></span>
              <span class="in-hub-name">{{ d.name }}</span>
              <span class="in-hub-count">{{ d.contentCount }} items @if (d.isMine) { · your team }</span>
            </button>
          } @empty { <p class="e360-muted">No departments configured yet — add them under Workforce → Departments.</p> }
        </div>

        <!-- latest -->
        <div class="in-section-head"><e360-icon name="newspaper" [size]="16" /> <h2>Latest updates</h2></div>
        <div class="in-cards">
          @for (c of home.recent; track c.id) {
            <div class="in-card" (click)="openContent(c)">
              <div class="in-card-media sm" [style.backgroundImage]="coverBg(c)">
                @if (!covers[c.id]) { <e360-icon [name]="typeIcon(c.type)" [size]="24" /> }
                <span class="in-card-type">{{ c.type }}</span>
              </div>
              <div class="in-card-body">
                <strong>{{ c.title }}</strong>
                @if (c.summary) { <p>{{ c.summary }}</p> }
                <div class="in-card-meta">{{ c.category?.name || 'General' }} · {{ c.publishedAt | date: 'MMM d' }} · {{ c.viewCount }} views</div>
              </div>
            </div>
          } @empty { <p class="e360-muted" style="padding:0 .25rem">Nothing published yet.</p> }
        </div>
      }

      <!-- ── DEPARTMENT HUB ──────────────────────────────────── -->
      @if (view === 'department' && dept) {
        @if (deptBanners.length) {
          <div class="in-hero dept" [style.backgroundImage]="bannerBg(deptBanners[0])">
            <div class="in-hero-overlay">
              <h1>{{ deptBanners[0].title }}</h1>
              @if (deptBanners[0].subtitle) { <p>{{ deptBanners[0].subtitle }}</p> }
            </div>
          </div>
        } @else {
          <div class="in-hero dept in-hero-empty">
            <div class="in-hero-overlay"><h1>{{ dept.name }}</h1><p>Department hub</p></div>
          </div>
        }

        <div class="in-dept-layout">
          <aside class="in-rail">
            <div class="in-rail-title">Browse</div>
            <button class="in-rail-item" [class.active]="!selectedCategory" (click)="selectCategory(null)">
              <e360-icon name="layout-dashboard" [size]="14" /> All content
            </button>
            @for (n of flatCategories(tree); track n.id) {
              <button
                class="in-rail-item"
                [class.active]="selectedCategory?.id === n.id"
                [style.paddingLeft.px]="12 + (n.depth - 1) * 18"
                (click)="selectCategory(n)"
              >
                <e360-icon [name]="n.icon || (n.depth === 1 ? 'folder' : 'chevron-right')" [size]="14" />
                {{ n.name }}
                <span class="in-rail-count">{{ n.contentCount }}</span>
              </button>
            }
          </aside>

          <div class="in-dept-main">
            @if (categoryBannerUrl) {
              <div class="in-cat-banner" [style.backgroundImage]="'url(' + categoryBannerUrl + ')'">
                <div class="in-hero-overlay slim"><h2>{{ selectedCategory?.name }}</h2></div>
              </div>
            }
            @if (selectedCategory?.description) { <p class="e360-muted">{{ selectedCategory?.description }}</p> }
            <div class="in-cards">
              @for (c of deptContent; track c.id) {
                <div class="in-card" (click)="openContent(c)">
                  <div class="in-card-media sm" [style.backgroundImage]="coverBg(c)">
                    @if (!covers[c.id]) { <e360-icon [name]="typeIcon(c.type)" [size]="24" /> }
                    <span class="in-card-type">{{ c.type }}</span>
                    @if (!c.downloadable) { <span class="in-card-lock" title="View online only"><e360-icon name="lock" [size]="12" /></span> }
                  </div>
                  <div class="in-card-body">
                    <strong>{{ c.title }}</strong>
                    @if (c.summary) { <p>{{ c.summary }}</p> }
                    <div class="in-card-meta">{{ c.publishedAt | date: 'MMM d, y' }} · {{ c.viewCount }} views</div>
                  </div>
                </div>
              } @empty { <p class="e360-muted">No published content here yet.</p> }
            </div>
          </div>
        </div>
      }

      <!-- ── search results ──────────────────────────────────── -->
      @if (view === 'search') {
        <div class="in-section-head"><e360-icon name="search" [size]="16" /> <h2>Results for “{{ lastSearch }}”</h2></div>
        <div class="in-cards">
          @for (c of searchResults; track c.id) {
            <div class="in-card" (click)="openContent(c)">
              <div class="in-card-media sm" [style.backgroundImage]="coverBg(c)">
                @if (!covers[c.id]) { <e360-icon [name]="typeIcon(c.type)" [size]="24" /> }
                <span class="in-card-type">{{ c.type }}</span>
              </div>
              <div class="in-card-body">
                <strong>{{ c.title }}</strong>
                @if (c.summary) { <p>{{ c.summary }}</p> }
                <div class="in-card-meta">{{ c.category?.name || 'General' }}</div>
              </div>
            </div>
          } @empty { <p class="e360-muted">No matches.</p> }
        </div>
      }

      <!-- ── content viewer ──────────────────────────────────── -->
      @if (viewer) {
        <div class="in-viewer-backdrop" (click)="closeViewer()">
          <div class="in-viewer" (click)="$event.stopPropagation()">
            <div class="in-viewer-head">
              <div>
                <span class="in-card-type inline"><e360-icon [name]="typeIcon(viewer.type)" [size]="13" /> {{ viewer.type }}</span>
                <h2>{{ viewer.title }}</h2>
                <div class="e360-muted sm">
                  {{ viewer.category?.name || 'General' }} · published {{ viewer.publishedAt | date: 'MMM d, y' }} · {{ viewer.viewCount }} views
                  @if (!viewer.downloadable) { · <e360-icon name="lock" [size]="12" /> view online only }
                </div>
              </div>
              <div class="in-viewer-actions">
                @if (viewer.downloadable && hasFile(viewer)) {
                  <button class="in-btn" (click)="downloadCurrent()"><e360-icon name="download" [size]="14" /> Download</button>
                }
                <button class="in-btn" (click)="closeViewer()"><e360-icon name="x" [size]="14" /></button>
              </div>
            </div>
            <div class="in-viewer-body">
              @if (viewer.summary) { <p class="in-viewer-summary">{{ viewer.summary }}</p> }
              @if (viewer.type === 'ARTICLE' && viewer.body) { <div class="in-article" [innerHTML]="renderMd(viewer.body)"></div> }
              @if (viewer.type === 'LINK') {
                <a class="in-btn primary" [href]="viewer.externalUrl" target="_blank" rel="noopener">
                  <e360-icon name="link" [size]="14" /> Open link
                </a>
              }
              @if (viewerMediaUrl) {
                @if (viewer.type === 'VIDEO') { <video class="in-media" controls [src]="viewerMediaUrl"></video> }
                @if (viewer.type === 'POSTER') { <img class="in-media" [src]="viewerMediaUrl" [alt]="viewer.title" /> }
                @if (viewer.type === 'DOCUMENT') { <iframe class="in-doc" [src]="viewerMediaSafe"></iframe> }
              } @else if (hasFile(viewer) && viewer.type !== 'ARTICLE' && viewer.type !== 'LINK') {
                <p class="e360-muted">Loading media…</p>
              }
              @if (viewer.tags?.length) {
                <div class="in-tags">@for (t of viewer.tags; track t) { <span class="in-tag">#{{ t }}</span> }</div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .in-wrap { max-width: 1180px; margin: 0 auto; }
      .sm { font-size: .78rem; }
      .in-review-row { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; padding: .7rem 0; border-bottom: 1px solid var(--e360-border); }
      .in-review-actions { display: flex; gap: .4rem; flex-shrink: 0; }
      .in-manage-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .6rem; }
      .in-manage-head h3 { margin: 0; display: flex; align-items: center; gap: .4rem; font-size: 1rem; }
      .in-muted { color: var(--e360-text-muted, #6b7280); font-size: .82rem; }

      /* command bar */
      .in-cmdbar { display: flex; align-items: center; gap: .5rem; margin-bottom: 1rem; flex-wrap: wrap; }
      .in-crumb { display: inline-flex; align-items: center; gap: .35rem; background: none; border: none; cursor: pointer; color: var(--e360-muted, #6b7280); font-size: .85rem; padding: .3rem .45rem; border-radius: 6px; }
      .in-crumb:hover { background: var(--e360-surface-2, #f3f4f6); }
      .in-crumb.active { color: var(--e360-text, #111827); font-weight: 600; }
      .in-crumb-sep { color: var(--e360-muted, #9ca3af); }
      .in-cmdbar-spacer { flex: 1; }
      .in-search { display: flex; align-items: center; gap: .4rem; border: 1px solid var(--e360-border, #e5e7eb); border-radius: 8px; padding: .35rem .6rem; background: var(--e360-surface, #fff); min-width: 260px; }
      .in-search input { border: none; outline: none; background: transparent; width: 100%; font-size: .85rem; color: inherit; }

      .in-btn { display: inline-flex; align-items: center; gap: .4rem; border: 1px solid var(--e360-border, #d1d5db); background: var(--e360-surface, #fff); color: inherit; border-radius: 8px; padding: .45rem .8rem; font-size: .84rem; cursor: pointer; }
      .in-btn:hover { background: var(--e360-surface-2, #f3f4f6); }
      .in-btn.primary { background: var(--e360-primary, #0f6cbd); border-color: var(--e360-primary, #0f6cbd); color: #fff; }
      .in-btn.primary:hover { filter: brightness(1.06); }
      .in-btn.hero { background: rgba(255, 255, 255, .92); color: #111827; border: none; font-weight: 600; text-decoration: none; }

      /* hero */
      .in-hero { position: relative; border-radius: 14px; overflow: hidden; min-height: 240px; margin-bottom: 1.4rem; background-size: cover; background-position: center; }
      .in-hero.dept { min-height: 170px; }
      .in-hero-slide { position: absolute; inset: 0; background-size: cover; background-position: center; }
      .in-hero-empty, .in-hero-slide:not([style*='url']), .in-hero:not([style*='url']) { background: linear-gradient(120deg, var(--e360-primary, #0f6cbd), var(--e360-accent, #6d28d9)); }
      .in-hero-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; padding: 1.6rem 2rem; background: linear-gradient(to top, rgba(10, 15, 30, .72), rgba(10, 15, 30, .05)); color: #fff; }
      .in-hero-overlay.slim { padding: 1rem 1.2rem; }
      .in-hero-overlay h1 { margin: 0 0 .3rem; font-size: 1.7rem; }
      .in-hero-overlay p { margin: 0 0 .7rem; opacity: .92; max-width: 640px; }
      .in-hero-overlay .in-btn { align-self: flex-start; }
      .in-hero-nav { position: absolute; top: 50%; transform: translateY(-50%); border: none; background: rgba(15, 23, 42, .45); color: #fff; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      .in-hero-nav.prev { left: .7rem; } .in-hero-nav.next { right: .7rem; }
      .in-hero-dots { position: absolute; bottom: .7rem; right: 1rem; display: flex; gap: .35rem; }
      .in-hero-dots button { width: 9px; height: 9px; border-radius: 50%; border: none; background: rgba(255, 255, 255, .45); cursor: pointer; padding: 0; }
      .in-hero-dots button.on { background: #fff; }

      /* sections */
      .in-section-head { display: flex; align-items: center; gap: .5rem; margin: 1.4rem 0 .7rem; color: var(--e360-text, #111827); }
      .in-section-head h2 { margin: 0; font-size: 1.05rem; }

      /* cards */
      .in-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: .9rem; }
      .in-cards.featured { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
      .in-card { border: 1px solid var(--e360-border, #e5e7eb); border-radius: 12px; overflow: hidden; background: var(--e360-surface, #fff); cursor: pointer; transition: box-shadow .15s, transform .15s; }
      .in-card:hover { box-shadow: 0 8px 22px rgba(15, 23, 42, .12); transform: translateY(-2px); }
      .in-card-media { position: relative; height: 150px; display: flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(135deg, var(--e360-primary, #0f6cbd), var(--e360-accent, #6d28d9)); background-size: cover; background-position: center; }
      .in-card-media.sm { height: 110px; }
      .in-card-type { position: absolute; top: .5rem; left: .5rem; background: rgba(15, 23, 42, .65); color: #fff; font-size: .64rem; letter-spacing: .04em; padding: .18rem .45rem; border-radius: 5px; }
      .in-card-type.inline { position: static; display: inline-flex; align-items: center; gap: .3rem; }
      .in-card-lock { position: absolute; top: .5rem; right: .5rem; background: rgba(15, 23, 42, .65); color: #fff; padding: .2rem .3rem; border-radius: 5px; display: inline-flex; }
      .in-card-body { padding: .7rem .8rem .8rem; }
      .in-card-body strong { display: block; font-size: .92rem; line-height: 1.25; }
      .in-card-body p { margin: .3rem 0 0; font-size: .8rem; color: var(--e360-muted, #6b7280); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .in-card-meta { margin-top: .45rem; font-size: .73rem; color: var(--e360-muted, #9ca3af); }

      /* hubs */
      .in-hubs { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: .7rem; }
      .in-hub { display: flex; flex-direction: column; align-items: flex-start; gap: .3rem; text-align: left; border: 1px solid var(--e360-border, #e5e7eb); background: var(--e360-surface, #fff); border-radius: 12px; padding: .9rem; cursor: pointer; transition: box-shadow .15s; }
      .in-hub:hover { box-shadow: 0 6px 16px rgba(15, 23, 42, .1); }
      .in-hub.mine { border-color: var(--e360-primary, #0f6cbd); box-shadow: inset 0 0 0 1px var(--e360-primary, #0f6cbd); }
      .in-hub-icon { color: var(--e360-primary, #0f6cbd); }
      .in-hub-name { font-weight: 600; font-size: .9rem; }
      .in-hub-count { font-size: .75rem; color: var(--e360-muted, #6b7280); }

      /* department layout */
      .in-dept-layout { display: grid; grid-template-columns: 230px 1fr; gap: 1.1rem; align-items: start; }
      @media (max-width: 860px) { .in-dept-layout { grid-template-columns: 1fr; } }
      .in-rail { border: 1px solid var(--e360-border, #e5e7eb); border-radius: 12px; background: var(--e360-surface, #fff); padding: .5rem; position: sticky; top: .5rem; }
      .in-rail-title { font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: var(--e360-muted, #9ca3af); padding: .35rem .6rem; }
      .in-rail-item { display: flex; align-items: center; gap: .45rem; width: 100%; text-align: left; background: none; border: none; cursor: pointer; padding: .42rem .6rem; border-radius: 8px; font-size: .84rem; color: inherit; }
      .in-rail-item:hover { background: var(--e360-surface-2, #f3f4f6); }
      .in-rail-item.active { background: color-mix(in srgb, var(--e360-primary, #0f6cbd) 12%, transparent); color: var(--e360-primary, #0f6cbd); font-weight: 600; }
      .in-rail-count { margin-left: auto; font-size: .7rem; color: var(--e360-muted, #9ca3af); }
      .in-cat-banner { border-radius: 12px; min-height: 110px; position: relative; overflow: hidden; background-size: cover; background-position: center; margin-bottom: .8rem; }

      /* manage */
      .in-manage { border: 1px solid var(--e360-border, #e5e7eb); border-radius: 14px; background: var(--e360-surface, #fff); padding: 1rem; margin-bottom: 1.4rem; }
      .in-manage-tabs { display: flex; gap: .4rem; margin-bottom: 1rem; }
      .in-manage-tabs button { display: inline-flex; align-items: center; gap: .4rem; border: 1px solid var(--e360-border, #e5e7eb); background: none; color: inherit; border-radius: 8px; padding: .4rem .8rem; cursor: pointer; font-size: .84rem; }
      .in-manage-tabs button.active { background: var(--e360-primary, #0f6cbd); border-color: var(--e360-primary, #0f6cbd); color: #fff; }
      .in-manage-grid { display: grid; grid-template-columns: 380px 1fr; gap: 1.2rem; align-items: start; }
      @media (max-width: 980px) { .in-manage-grid { grid-template-columns: 1fr; } }
      .in-form h3, .in-manage-list h3 { margin: 0 0 .7rem; font-size: .95rem; }
      .in-form > div { margin-bottom: .6rem; }
      .in-form label { font-size: .78rem; }
      .in-form input:not([type='checkbox']), .in-form textarea { width: 100%; box-sizing: border-box; }
      .in-form-row { display: flex; gap: .6rem; flex-wrap: wrap; }
      .in-form-row > * { flex: 1; min-width: 120px; }
      .in-upload-row { display: flex; align-items: center; gap: .6rem; }
      .in-upload { display: inline-flex; align-items: center; gap: .4rem; border: 1px dashed var(--e360-border, #9ca3af); border-radius: 8px; padding: .4rem .7rem; cursor: pointer; font-size: .8rem; }
      .in-upload:hover { background: var(--e360-surface-2, #f3f4f6); }
      .in-file-ok { display: inline-flex; align-items: center; gap: .3rem; font-size: .76rem; color: var(--e360-success, #16a34a); }
      .in-roles { display: flex; flex-wrap: wrap; gap: .6rem; font-size: .8rem; margin-bottom: .6rem; }
      .in-check-row { display: flex; gap: 1.2rem; font-size: .84rem; }
      .in-form-actions { display: flex; gap: .5rem; margin-top: .8rem; }
      .in-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
      .in-table th { text-align: left; font-size: .7rem; text-transform: uppercase; letter-spacing: .05em; color: var(--e360-muted, #9ca3af); padding: .35rem .5rem; border-bottom: 1px solid var(--e360-border, #e5e7eb); }
      .in-table td { padding: .45rem .5rem; border-bottom: 1px solid var(--e360-border, #f3f4f6); vertical-align: top; }
      .in-td-title { max-width: 260px; }
      .in-td-actions { white-space: nowrap; }
      .in-mini { border: 1px solid var(--e360-border, #e5e7eb); background: none; color: inherit; border-radius: 6px; padding: .22rem .35rem; cursor: pointer; margin-right: .2rem; }
      .in-mini:hover { background: var(--e360-surface-2, #f3f4f6); }
      .in-mini.ok { color: var(--e360-success, #16a34a); }
      .in-mini.danger { color: var(--e360-danger, #dc2626); }
      .in-status { font-size: .7rem; padding: .16rem .5rem; border-radius: 999px; background: var(--e360-surface-2, #f3f4f6); }
      .in-status[data-s='PUBLISHED'] { background: color-mix(in srgb, #16a34a 15%, transparent); color: #15803d; }
      .in-status[data-s='PENDING_REVIEW'] { background: color-mix(in srgb, #d97706 15%, transparent); color: #b45309; }
      .in-status[data-s='ARCHIVED'] { background: color-mix(in srgb, #6b7280 15%, transparent); }
      .in-cat-row { display: flex; align-items: center; gap: .5rem; padding: .4rem .6rem; border-bottom: 1px solid var(--e360-border, #f3f4f6); font-size: .85rem; }
      .in-cat-row .in-mini { margin-left: auto; }

      /* viewer */
      .in-viewer-backdrop { position: fixed; inset: 0; background: rgba(10, 15, 30, .55); display: flex; align-items: center; justify-content: center; z-index: 60; padding: 1rem; }
      .in-viewer { background: var(--e360-surface, #fff); border-radius: 14px; max-width: 860px; width: 100%; max-height: 92vh; overflow: auto; box-shadow: 0 24px 60px rgba(0, 0, 0, .3); }
      .in-viewer-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1.1rem 1.3rem .7rem; border-bottom: 1px solid var(--e360-border, #f3f4f6); }
      .in-viewer-head h2 { margin: .35rem 0 .25rem; font-size: 1.25rem; }
      .in-viewer-actions { display: flex; gap: .4rem; flex-shrink: 0; }
      .in-viewer-body { padding: 1rem 1.3rem 1.4rem; }
      .in-viewer-summary { color: var(--e360-muted, #4b5563); font-size: .95rem; }
      .in-article { line-height: 1.65; font-size: .93rem; }
      .in-article h2, .in-article h3, .in-article h4 { margin: 1rem 0 .35rem; line-height: 1.3; }
      .in-article p { margin: .45rem 0; }
      .in-article ul, .in-article ol { margin: .45rem 0; padding-left: 1.4rem; }
      .in-article blockquote { margin: .6rem 0; padding: .35rem .8rem; border-left: 3px solid var(--e360-primary, #6d5cff); background: var(--e360-surface-2, rgba(125,125,125,.06)); border-radius: 0 6px 6px 0; }
      .in-article pre { background: var(--e360-surface-2, rgba(125,125,125,.08)); border-radius: 8px; padding: .6rem .8rem; overflow-x: auto; }
      .in-article code { font-size: .85em; }
      .in-article a { color: var(--e360-primary, #6d5cff); }
      .in-article hr { border: 0; border-top: 1px solid var(--e360-border); margin: .8rem 0; }
      .in-md-toolbar { display: flex; gap: .25rem; align-items: center; margin-bottom: .3rem; flex-wrap: wrap; }
      .in-md-btn { display: inline-flex; align-items: center; gap: .25rem; padding: .22rem .5rem; font-size: .78rem; border: 1px solid var(--e360-border); background: var(--e360-surface, transparent); border-radius: 6px; cursor: pointer; }
      .in-md-btn:hover { border-color: var(--e360-primary, #6d5cff); }
      .in-md-btn.active { background: var(--e360-primary, #6d5cff); color: #fff; border-color: transparent; }
      .in-md-preview { margin-top: .5rem; border: 1px dashed var(--e360-border); border-radius: 8px; padding: .6rem .9rem; }
      .in-media { width: 100%; border-radius: 10px; max-height: 520px; object-fit: contain; background: #000; }
      img.in-media { background: transparent; }
      .in-doc { width: 100%; height: 560px; border: 1px solid var(--e360-border, #e5e7eb); border-radius: 10px; }
      .in-tags { margin-top: .8rem; display: flex; gap: .4rem; flex-wrap: wrap; }
      .in-tag { font-size: .74rem; background: var(--e360-surface-2, #f3f4f6); border-radius: 999px; padding: .2rem .55rem; }
    `,
  ],
})
export class IntranetComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  auth = inject(AuthService);

  error = '';
  view: 'home' | 'department' | 'search' = 'home';
  home: any = null;
  canPublish = false;
  canContribute = false;
  reviewPending = 0;
  reviewOpen = false;
  reviewItems: any[] = [];

  dept: any = null;
  tree: CategoryNode[] = [];
  deptContent: any[] = [];
  deptBanners: any[] = [];
  selectedCategory: CategoryNode | null = null;
  categoryBannerUrl: string | null = null;

  searchQ = '';
  lastSearch = '';
  searchResults: any[] = [];

  bannerIdx = 0;
  private bannerTimer: any = null;

  viewer: any = null;
  viewerMediaUrl: string | null = null;
  get viewerMediaSafe(): SafeResourceUrl | null {
    // Blob object URLs are created locally from authenticated responses — safe to frame.
    return this.viewerMediaUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(this.viewerMediaUrl)
      : null;
  }

  covers: Record<string, string> = {};
  private bannerImgs: Record<string, string> = {};
  private objectUrls: string[] = [];
  uploadNames: Record<string, string> = {};

  // manage state
  manageOpen = false;
  manageTab: 'content' | 'categories' | 'banners' = 'content';
  manageContent: any[] = [];
  manageTree: CategoryNode[] = [];
  manageBanners: any[] = [];
  editingContentId: string | null = null;

  roleChoices: string[] = TENANT_ROLES;

  // markdown editor state
  @ViewChild('bodyArea') bodyArea?: ElementRef<HTMLTextAreaElement>;
  mdPreview = false;

  renderMd(md: string): string {
    return renderMarkdown(md);
  }

  /** Wrap the textarea selection with a markdown marker (e.g. ** for bold). */
  mdWrap(marker: string) {
    const ta = this.bodyArea?.nativeElement;
    const body: string = this.cForm.body ?? '';
    if (!ta) { this.cForm.body = `${body}${marker}text${marker}`; return; }
    const [s, e] = [ta.selectionStart, ta.selectionEnd];
    const selected = body.slice(s, e) || 'text';
    this.cForm.body = body.slice(0, s) + marker + selected + marker + body.slice(e);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + marker.length, s + marker.length + selected.length); });
  }

  /** Prefix the current line (heading, list, quote). */
  mdPrefix(prefix: string) {
    const ta = this.bodyArea?.nativeElement;
    const body: string = this.cForm.body ?? '';
    const pos = ta?.selectionStart ?? body.length;
    const lineStart = body.lastIndexOf('\n', pos - 1) + 1;
    this.cForm.body = body.slice(0, lineStart) + prefix + body.slice(lineStart);
    setTimeout(() => { ta?.focus(); ta?.setSelectionRange(pos + prefix.length, pos + prefix.length); });
  }

  mdLink() {
    const ta = this.bodyArea?.nativeElement;
    const body: string = this.cForm.body ?? '';
    const [s, e] = [ta?.selectionStart ?? body.length, ta?.selectionEnd ?? body.length];
    const selected = body.slice(s, e) || 'link text';
    this.cForm.body = `${body.slice(0, s)}[${selected}](https://)${body.slice(e)}`;
    setTimeout(() => ta?.focus());
  }
  typeOptions: SelectOption[] = ['ARTICLE', 'DOCUMENT', 'VIDEO', 'POSTER', 'LINK'].map((v) => ({ value: v, label: v }));
  accessOptions: SelectOption[] = [
    { value: 'COMPANY', label: 'Everyone in the company' },
    { value: 'DEPARTMENT', label: 'Department members only' },
    { value: 'ROLES', label: 'Specific roles' },
    { value: 'PRIVATE', label: 'Private (author + HR/admin)' },
  ];
  // Who moderates submissions in a category (blank = the department head).
  reviewerOptions: SelectOption[] = [
    { value: 'HR', label: 'HR (e.g. talent / people content)' },
    { value: 'DEPARTMENT_HEAD', label: 'Department head' },
    { value: 'TENANT_ADMIN', label: 'Tenant admin' },
  ];
  bannerScopeOptions: SelectOption[] = [
    { value: 'company', label: 'Company-wide (home hero)' },
    { value: 'department', label: 'Department hub' },
    { value: 'category', label: 'Specific category' },
  ];

  cForm: any = this.emptyContentForm();
  catForm: any = this.emptyCategoryForm();
  bForm: any = this.emptyBannerForm();

  get deptOptions(): SelectOption[] {
    return (this.home?.departments ?? []).map((d: any) => ({ value: d.id, label: d.name }));
  }

  get formCategoryOptions(): SelectOption[] {
    return this.flatCategories(this.manageTree).map((n) => ({
      value: n.id,
      label: `${'— '.repeat(n.depth - 1)}${n.name}`,
    }));
  }

  get parentCategoryOptions(): SelectOption[] {
    return this.flatCategories(this.manageTree)
      .filter((n) => n.depth < 3)
      .map((n) => ({ value: n.id, label: `${'— '.repeat(n.depth - 1)}${n.name}` }));
  }

  async ngOnInit() {
    await this.loadHome();
    this.bannerTimer = setInterval(() => this.nextBanner(), 7000);
  }

  ngOnDestroy() {
    if (this.bannerTimer) clearInterval(this.bannerTimer);
    for (const u of this.objectUrls) URL.revokeObjectURL(u);
  }

  // ── data loading ─────────────────────────────────────────────

  async loadHome() {
    try {
      this.home = await this.api.get<any>('/intranet/home');
      this.canPublish = this.home.canPublish;
      this.canContribute = this.home.canContribute;
      this.reviewPending = this.home.reviewPending ?? 0;
      this.bannerIdx = 0;
      for (const b of this.home.banners) void this.loadBannerImg(b);
      for (const c of [...this.home.pinned, ...this.home.recent]) void this.loadCover(c);
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  async openDepartment(d: any) {
    this.view = 'department';
    this.dept = d;
    this.selectedCategory = null;
    this.categoryBannerUrl = null;
    try {
      const [tree, banners] = await Promise.all([
        this.api.get<CategoryNode[]>(`/intranet/departments/${d.id}/categories`),
        this.api.get<any[]>('/intranet/banners', { departmentId: d.id }),
      ]);
      this.tree = tree;
      this.deptBanners = banners;
      for (const b of banners) void this.loadBannerImg(b);
      await this.loadDeptContent();
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  async selectCategory(node: CategoryNode | null) {
    this.selectedCategory = node;
    this.categoryBannerUrl = null;
    if (node?.bannerFileId) {
      this.categoryBannerUrl = await this.blobUrl(`/intranet/categories/${node.id}/banner`);
    }
    await this.loadDeptContent();
  }

  private async loadDeptContent() {
    if (!this.dept) return;
    const params: any = { departmentId: this.dept.id };
    if (this.selectedCategory) params.categoryId = this.selectedCategory.id;
    this.deptContent = await this.api.get<any[]>('/intranet/content', params);
    for (const c of this.deptContent) void this.loadCover(c);
  }

  goHome() {
    this.view = 'home';
    this.dept = null;
    this.selectedCategory = null;
  }

  async runSearch() {
    const q = this.searchQ.trim();
    if (!q) return;
    this.lastSearch = q;
    this.view = 'search';
    try {
      this.searchResults = await this.api.get<any[]>('/intranet/content', { q });
      for (const c of this.searchResults) void this.loadCover(c);
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  // ── banners on home ──────────────────────────────────────────

  nextBanner() {
    const n = this.home?.banners?.length ?? 0;
    if (n > 1) this.bannerIdx = (this.bannerIdx + 1) % n;
  }
  prevBanner() {
    const n = this.home?.banners?.length ?? 0;
    if (n > 1) this.bannerIdx = (this.bannerIdx - 1 + n) % n;
  }

  bannerBg(b: any): string {
    const u = this.bannerImgs[b.id];
    return u ? `url(${u})` : '';
  }

  coverBg(c: any): string {
    const u = this.covers[c.id];
    return u ? `url(${u})` : '';
  }

  // ── viewer ───────────────────────────────────────────────────

  async openContent(c: any) {
    try {
      this.viewer = await this.api.get<any>(`/intranet/content/${c.id}`);
      this.viewerMediaUrl = null;
      if (this.hasFile(this.viewer) && ['VIDEO', 'POSTER', 'DOCUMENT'].includes(this.viewer.type)) {
        this.viewerMediaUrl = await this.blobUrl(`/intranet/content/${c.id}/file`);
      }
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  closeViewer() {
    this.viewer = null;
    this.viewerMediaUrl = null;
  }

  hasFile(c: any): boolean {
    return !!c?.fileId;
  }

  async downloadCurrent() {
    if (!this.viewer) return;
    try {
      const blob = await firstValueFrom(
        this.http.get(`${environment.apiBase}/intranet/content/${this.viewer.id}/download`, {
          responseType: 'blob',
        }),
      );
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = this.viewer.title;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  // ── moderation ───────────────────────────────────────────────

  async openReview() {
    this.reviewOpen = !this.reviewOpen;
    if (this.reviewOpen) {
      try {
        this.reviewItems = await this.api.get<any[]>('/intranet/review-queue');
      } catch (e) { this.error = errMsg(e); }
    }
  }

  async reviewDecide(item: any, decision: 'approve' | 'reject') {
    let note: string | undefined;
    if (decision === 'reject') {
      note = window.prompt('Reason for returning this content to the author (optional):') ?? undefined;
    }
    try {
      await this.api.post(`/intranet/content/${item.id}/review`, { decision, note });
      this.reviewItems = await this.api.get<any[]>('/intranet/review-queue');
      await this.loadHome();
    } catch (e) { this.error = errMsg(e); }
  }

  // ── manage: shared ───────────────────────────────────────────

  async toggleManage() {
    this.manageOpen = !this.manageOpen;
    if (this.manageOpen) {
      if (!this.cForm.departmentId && this.deptOptions.length) {
        this.cForm.departmentId = this.deptOptions[0].value;
        this.catForm.departmentId = this.deptOptions[0].value;
        this.bForm.departmentId = this.deptOptions[0].value;
      }
      await this.reloadManage();
    }
  }

  async onFormDeptChange() {
    const deptId = this.cForm.departmentId || this.catForm.departmentId || this.bForm.departmentId;
    this.catForm.departmentId = this.cForm.departmentId = this.bForm.departmentId = deptId;
    await this.reloadManage();
  }

  async reloadManage() {
    const deptId = this.cForm.departmentId;
    try {
      const [content, banners, tree] = await Promise.all([
        this.api.get<any[]>('/intranet/content', deptId ? { departmentId: deptId } : {}),
        this.api.get<any[]>('/intranet/banners', { all: true }),
        deptId
          ? this.api.get<CategoryNode[]>(`/intranet/departments/${deptId}/categories`)
          : Promise.resolve([]),
      ]);
      this.manageContent = content;
      this.manageBanners = banners;
      this.manageTree = tree;
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  flatCategories(tree: CategoryNode[]): Array<CategoryNode & { depth: number }> {
    const out: Array<CategoryNode & { depth: number }> = [];
    const walk = (nodes: CategoryNode[], depth: number) => {
      for (const n of nodes) {
        out.push({ ...n, depth });
        if (n.children?.length && depth < 3) walk(n.children, depth + 1);
      }
    };
    walk(tree, 1);
    return out;
  }

  async uploadInto(event: Event, form: any, key: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiBase}/files`, fd),
      );
      form[key] = res.id;
      this.uploadNames[res.id] = res.fileName;
    } catch (e) {
      this.error = errMsg(e);
    } finally {
      input.value = '';
    }
  }

  toggleRole(list: string[], role: string) {
    const i = list.indexOf(role);
    if (i >= 0) list.splice(i, 1);
    else list.push(role);
  }

  typeIcon(t: string): string {
    return TYPE_ICON[t] ?? 'file-text';
  }

  statusLabel(s: string): string {
    return STATUS_LABEL[s] ?? s;
  }

  // ── manage: content ──────────────────────────────────────────

  private emptyContentForm() {
    return {
      departmentId: '',
      categoryId: '',
      type: 'ARTICLE',
      title: '',
      summary: '',
      body: '',
      externalUrl: '',
      fileId: '',
      coverFileId: '',
      accessLevel: 'COMPANY',
      allowedRoles: [] as string[],
      downloadable: true,
      pinned: false,
      tagsCsv: '',
      expiresAt: '',
    };
  }

  resetContentForm() {
    const dept = this.cForm.departmentId;
    this.cForm = this.emptyContentForm();
    this.cForm.departmentId = dept;
    this.editingContentId = null;
  }

  editContent(c: any) {
    this.editingContentId = c.id;
    this.cForm = {
      departmentId: c.departmentId,
      categoryId: c.categoryId ?? '',
      type: c.type,
      title: c.title,
      summary: c.summary ?? '',
      body: c.body ?? '',
      externalUrl: c.externalUrl ?? '',
      fileId: c.fileId ?? '',
      coverFileId: c.coverFileId ?? '',
      accessLevel: c.accessLevel,
      allowedRoles: Array.isArray(c.allowedRoles) ? [...c.allowedRoles] : [],
      downloadable: c.downloadable,
      pinned: c.pinned,
      tagsCsv: (c.tags ?? []).join(', '),
      expiresAt: c.expiresAt ? String(c.expiresAt).slice(0, 10) : '',
    };
  }

  async saveContent() {
    this.error = '';
    const f = this.cForm;
    const payload: any = {
      categoryId: f.categoryId || undefined,
      type: f.type,
      title: f.title,
      summary: f.summary || undefined,
      body: f.body || undefined,
      externalUrl: f.externalUrl || undefined,
      fileId: f.fileId || undefined,
      coverFileId: f.coverFileId || undefined,
      accessLevel: f.accessLevel,
      allowedRoles: f.accessLevel === 'ROLES' ? f.allowedRoles : undefined,
      downloadable: f.downloadable,
      pinned: f.pinned,
      tags: f.tagsCsv
        ? f.tagsCsv.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
        : [],
      expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : undefined,
    };
    try {
      if (this.editingContentId) {
        await this.api.patch(`/intranet/content/${this.editingContentId}`, payload);
      } else {
        await this.api.post('/intranet/content', { ...payload, departmentId: f.departmentId });
      }
      this.resetContentForm();
      await Promise.all([this.reloadManage(), this.loadHome()]);
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  async transition(id: string, action: string) {
    try {
      await this.api.post(`/intranet/content/${id}/${action}`);
      await Promise.all([this.reloadManage(), this.loadHome()]);
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  async deleteContent(id: string) {
    if (!confirm('Delete this content permanently?')) return;
    try {
      await this.api.delete(`/intranet/content/${id}`);
      await Promise.all([this.reloadManage(), this.loadHome()]);
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  // ── manage: categories ───────────────────────────────────────

  private emptyCategoryForm() {
    return {
      departmentId: '',
      parentId: '',
      name: '',
      description: '',
      accessLevel: 'COMPANY',
      reviewerRole: '',
      sortOrder: 0,
      bannerFileId: '',
    };
  }

  async saveCategory() {
    this.error = '';
    const f = this.catForm;
    try {
      await this.api.post('/intranet/categories', {
        departmentId: f.departmentId,
        parentId: f.parentId || undefined,
        name: f.name,
        description: f.description || undefined,
        accessLevel: f.accessLevel,
        reviewerRole: f.reviewerRole || undefined,
        sortOrder: Number(f.sortOrder) || 0,
        bannerFileId: f.bannerFileId || undefined,
      });
      const dept = f.departmentId;
      this.catForm = this.emptyCategoryForm();
      this.catForm.departmentId = dept;
      await this.reloadManage();
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  async deleteCategory(id: string) {
    if (!confirm('Delete this category?')) return;
    try {
      await this.api.delete(`/intranet/categories/${id}`);
      await this.reloadManage();
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  // ── manage: banners ──────────────────────────────────────────

  private emptyBannerForm() {
    return {
      scope: 'company',
      departmentId: '',
      categoryId: '',
      title: '',
      subtitle: '',
      linkUrl: '',
      sortOrder: 0,
      startsAt: '',
      endsAt: '',
      imageFileId: '',
    };
  }

  async saveBanner() {
    this.error = '';
    const f = this.bForm;
    try {
      await this.api.post('/intranet/banners', {
        departmentId: f.scope === 'company' ? undefined : f.departmentId,
        categoryId: f.scope === 'category' ? f.categoryId || undefined : undefined,
        title: f.title,
        subtitle: f.subtitle || undefined,
        linkUrl: f.linkUrl || undefined,
        sortOrder: Number(f.sortOrder) || 0,
        startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : undefined,
        endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : undefined,
        imageFileId: f.imageFileId || undefined,
      });
      const dept = f.departmentId;
      this.bForm = this.emptyBannerForm();
      this.bForm.departmentId = dept;
      await Promise.all([this.reloadManage(), this.loadHome()]);
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  async toggleBanner(b: any) {
    try {
      await this.api.patch(`/intranet/banners/${b.id}`, { isActive: !b.isActive });
      await Promise.all([this.reloadManage(), this.loadHome()]);
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  async deleteBanner(id: string) {
    if (!confirm('Delete this banner?')) return;
    try {
      await this.api.delete(`/intranet/banners/${id}`);
      await Promise.all([this.reloadManage(), this.loadHome()]);
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  // ── authenticated media (blob → object URL) ──────────────────

  private async loadCover(c: any) {
    if (!c.coverFileId || this.covers[c.id]) return;
    const url = await this.blobUrl(`/intranet/content/${c.id}/cover`);
    if (url) this.covers[c.id] = url;
  }

  private async loadBannerImg(b: any) {
    if (!b.imageFileId || this.bannerImgs[b.id]) return;
    const url = await this.blobUrl(`/intranet/banners/${b.id}/image`);
    if (url) this.bannerImgs[b.id] = url;
  }

  private async blobUrl(path: string): Promise<string | null> {
    try {
      const blob = await firstValueFrom(
        this.http.get(`${environment.apiBase}${path}`, { responseType: 'blob' }),
      );
      const url = URL.createObjectURL(blob);
      this.objectUrls.push(url);
      return url;
    } catch {
      return null;
    }
  }
}
