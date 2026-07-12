import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent, SelectFieldComponent],
  styles: [`
    .progress { background: var(--surface-3); border-radius: 6px; height: 10px; overflow: hidden; }
    .progress div { background: var(--e360-primary); height: 100%; transition: width .5s; }
    .modal-back { position: fixed; inset: 0; background: rgba(10,18,40,.55); z-index: 40;
      display: flex; align-items: center; justify-content: center; }
    .modal { background: var(--e360-surface); color: var(--e360-text); border-radius: 12px; padding: 1.25rem 1.5rem; width: min(620px, 92vw); }
    .qopt { display: block; padding: .55rem .8rem; border: 1px solid var(--e360-border-strong); border-radius: 8px;
      margin: .4rem 0; cursor: pointer; }
    .qopt.sel { border-color: var(--e360-primary); background: var(--e360-primary-soft); }
  `],
  template: `
    <e360-module-shell
      title="Trainings"
      description="Courses, video progress, quizzes, and assignments."
      icon="graduation-cap"
      moduleKey="trainings"
      auditEntityType="TRAINING_COURSE"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Performance' }, { label: 'Trainings' }]"
    >
      <div actions>@if (isHr) { <export-bar [rows]="courses" [cols]="exportCols" name="training-courses" /> }</div>
@if (error) { <div class="e360-error">{{ error }}</div> }

    <!-- ══════════ MY TRAININGS (every employee) ══════════ -->
    @if (mine.length || !isHr) {
      <h2>My trainings</h2>
      @for (a of mine; track a.id) {
        <div class="card">
          <div class="toolbar" style="margin-bottom:.4rem">
            <strong>{{ a.course.title }}</strong>
            <span>
              @if (a.course.mandatory) { <span class="badge warn">mandatory</span> }
              <span class="badge" [class.ok]="a.status==='COMPLETED'">{{ a.status }}</span>
            </span>
          </div>
          @for (v of a.course.videos; track v.id) {
            <div class="row" style="align-items:center;border-bottom:1px solid var(--e360-border);padding:.45rem 0">
              <div style="flex:2">🎬 {{ v.title }} <span class="muted">({{ v.durationSeconds }}s@if (v.noSkip) { , no-skip })</span></div>
              <div style="flex:2">
                <div class="progress"><div [style.width.%]="vpct(v)"></div></div>
                <span class="muted" style="font-size:.75rem">{{ v.progress?.watchedSeconds ?? 0 }}s / {{ v.durationSeconds }}s
                  @if (v.progress?.completed) { · <span style="color:var(--e360-success)">completed ✓</span> }</span>
              </div>
              <div style="flex:0">
                @if (!v.progress?.completed) { <button (click)="watch(v)">▶ Watch</button> }
                @else { <span class="badge ok">watched</span> }
              </div>
            </div>
          }
          @for (q of a.course.quizzes; track q.id) {
            <div class="row" style="align-items:center;padding:.45rem 0">
              <div style="flex:2">📝 Test: {{ q.title }} <span class="muted">(pass ≥ {{ q.passingScore }}%)</span></div>
              <div style="flex:0"><button class="secondary" (click)="startQuiz(q)">Take test</button></div>
            </div>
          }
        </div>
      } @empty { <div class="card muted">No trainings assigned to you yet.</div> }
    }

    <!-- ══════════ LOCKED PLAYER ══════════ -->
    @if (playing) {
      <div class="modal-back">
        <div class="modal">
          <h2 style="margin-top:0">🎬 {{ playing.title }}</h2>
          @if (playing.noSkip) {
            <p class="muted">Mandatory video — fast-forward and skipping are disabled. Watch time is verified by the server.</p>
          }
          <div class="progress" style="height:16px"><div [style.width.%]="playerPct()"></div></div>
          <p style="text-align:center;font-size:1.1rem">{{ playerPos }}s / {{ playing.durationSeconds }}s
            @if (playerDone) { <span class="badge ok">completed ✓</span> }</p>
          <div style="display:flex;gap:.5rem;justify-content:center">
            @if (!playerDone) {
              <button (click)="togglePlay()">{{ playerTimer ? '⏸ Pause' : '▶ Play' }}</button>
            }
            <button class="secondary" (click)="closePlayer()" [disabled]="playing.noSkip && !playerDone && !!playerTimer">
              {{ playerDone ? 'Done' : 'Close (progress is saved)' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ══════════ QUIZ WIZARD ══════════ -->
    @if (quiz) {
      <div class="modal-back">
        <div class="modal">
          <h2 style="margin-top:0">📝 {{ quiz.title }}</h2>
          @if (quizResult) {
            <p style="font-size:1.3rem;text-align:center">
              Score: <strong>{{ quizResult.score }}%</strong> —
              @if (quizResult.passed) { <span style="color:var(--e360-success)">PASSED ✓</span> }
              @else { <span style="color:var(--e360-danger)">NOT PASSED — you can retry</span> }
            </p>
            <div style="text-align:center"><button (click)="quiz = null">Close</button></div>
          } @else {
            <p class="muted">Question {{ qIndex + 1 }} of {{ quiz.questions.length }}</p>
            <h3>{{ quiz.questions[qIndex].q }}</h3>
            @for (opt of quiz.questions[qIndex].options; track $index) {
              <div class="qopt" [class.sel]="answers[qIndex] === $index" (click)="answers[qIndex] = $index">{{ opt }}</div>
            }
            <div style="display:flex;justify-content:space-between;margin-top:1rem">
              <button class="secondary" (click)="qIndex = qIndex - 1" [disabled]="qIndex === 0">← Back</button>
              @if (qIndex < quiz.questions.length - 1) {
                <button (click)="qIndex = qIndex + 1" [disabled]="answers[qIndex] == null">Next →</button>
              } @else {
                <button (click)="submitQuiz()" [disabled]="answers[qIndex] == null || busy">Submit test</button>
              }
            </div>
          }
        </div>
      </div>
    }

    <!-- ══════════ COURSE MANAGEMENT (HR/Admin) ══════════ -->
    @if (isHr) {
      <h2>Manage courses</h2>
      <div class="card">
        <h2 style="margin-top:0">Create course</h2>
        <div class="row">
          <div><label>Title</label><input [(ngModel)]="f.title" /></div>
          <div><label>Video title</label><input [(ngModel)]="v.title" /></div>
          <div><label>Video URL (stream)</label><input [(ngModel)]="v.streamUrl" /></div>
          <div><label>Duration (seconds)</label><input type="number" [(ngModel)]="v.durationSeconds" /></div>
        </div>
        <label><input type="checkbox" [(ngModel)]="f.mandatory" style="width:auto;margin-right:.4rem" />Mandatory (locked no-skip player)</label><br />
        <label><input type="checkbox" [(ngModel)]="f.forOnboarding" style="width:auto;margin-right:.4rem" />Part of onboarding</label>
        <div style="margin-top:.75rem"><button (click)="create()">Create course</button></div>
      </div>

      @for (c of courses; track c.id) {
        <div class="card">
          <div class="toolbar" style="margin-bottom:.25rem">
            <strong>{{ c.title }}</strong>
            <span>
              @if (c.mandatory) { <span class="badge warn">mandatory</span> }
              <span class="badge">{{ c._count?.assignments ?? 0 }} assigned</span>
            </span>
          </div>
          <p class="muted">
            @for (vd of c.videos; track vd.id) { 🎬 {{ vd.title }} ({{ vd.durationSeconds }}s){{ $last ? '' : ' · ' }} }
            @for (q of c.quizzes; track q.id) { · 📝 {{ q.title }} }
          </p>
          <div class="row" style="align-items:flex-end">
            <div>
              <e360-select-field
                label="Assign to"
                placeholder="choose employee…"
                [options]="directoryOptions"
                [(ngModel)]="c._emp"
              />
            </div>
            <div style="flex:0"><button class="secondary" (click)="assign(c)">Assign</button></div>
            <div style="flex:0"><button class="secondary" (click)="quizFor = quizFor === c.id ? null : c.id">
              {{ quizFor === c.id ? 'Close quiz builder' : '+ Add test (quiz)' }}</button></div>
          </div>

          @if (quizFor === c.id) {
            <div style="background:var(--surface-2);border-radius:8px;padding:1rem;margin-top:.75rem">
              <h2 style="margin-top:0">Quiz builder</h2>
              <div class="row">
                <div><label>Test title</label><input [(ngModel)]="qb.title" /></div>
                <div><label>Passing score %</label><input type="number" [(ngModel)]="qb.passingScore" /></div>
              </div>
              @for (qq of qb.questions; track $index; let i = $index) {
                <div style="border:1px solid var(--e360-border);border-radius:8px;padding:.7rem;margin:.5rem 0">
                  <label>Question {{ i + 1 }}</label>
                  <input [(ngModel)]="qq.q" placeholder="e.g. Should you share your password?" />
                  <label>Options (comma separated)</label>
                  <input [(ngModel)]="qq.optionsText" placeholder="Yes, No" />
                  <label>Correct option (number, starting at 1)</label>
                  <input type="number" [(ngModel)]="qq.correct" min="1" />
                  <button class="danger" (click)="qb.questions.splice(i, 1)">Remove question</button>
                </div>
              }
              <button class="secondary" (click)="qb.questions.push({ q: '', optionsText: '', correct: 1 })">+ Add question</button>
              <button style="margin-left:.5rem" (click)="saveQuiz(c.id)" [disabled]="!qb.title || !qb.questions.length">Save test</button>
            </div>
          }
        </div>
      }
    }
  
    </e360-module-shell>
  `,
})
export class TrainingsComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  auth = inject(AuthService);
  courses: any[] = [];
  mine: any[] = [];
  directory: any[] = [];
  error = '';
  f: any = { mandatory: true };
  v: any = { durationSeconds: 300 };
  exportCols = [
    { key: 'title', label: 'Course' },
    { key: 'mandatory', label: 'Mandatory' },
    { key: 'forOnboarding', label: 'Onboarding' },
    { key: '_count.assignments', label: 'Assigned' },
  ];

  // player state
  playing: any = null;
  playerPos = 0;
  playerDone = false;
  playerTimer: any = null;
  private lastBeat = 0;

  // quiz state
  quiz: any = null;
  qIndex = 0;
  answers: (number | null)[] = [];
  quizResult: any = null;
  busy = false;

  // quiz builder
  quizFor: string | null = null;
  qb: any = { title: '', passingScore: 70, questions: [{ q: '', optionsText: '', correct: 1 }] };

  get isHr() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }

  get directoryOptions(): SelectOption[] {
    return this.directory.map((e) => ({
      value: e.id,
      label: `${e.user.firstName} ${e.user.lastName} (${e.designation})`,
    }));
  }

  async ngOnInit() { await this.load(); }
  ngOnDestroy() { this.stopTimer(); }

  async load() {
    try { this.mine = await this.api.get<any[]>('/trainings/mine'); } catch { this.mine = []; }
    if (this.isHr) {
      try {
        [this.courses, this.directory] = await Promise.all([
          this.api.get<any[]>('/trainings/courses'),
          this.api.get<any[]>('/employees/directory'),
        ]);
      } catch (e) { this.error = errMsg(e); }
    }
  }

  vpct(v: any) { return Math.min(100, ((v.progress?.watchedSeconds ?? 0) / v.durationSeconds) * 100); }

  // ── locked player: 1s ticker, heartbeat every 5s; the SERVER decides how
  //    much watch time to credit, so skipping is impossible by design.
  watch(v: any) {
    this.playing = v;
    this.playerPos = v.progress?.watchedSeconds ?? 0;
    this.playerDone = !!v.progress?.completed;
    this.togglePlay();
  }
  togglePlay() {
    if (this.playerTimer) { this.stopTimer(); return; }
    this.playerTimer = setInterval(async () => {
      if (!this.playing) return;
      this.playerPos = Math.min(this.playing.durationSeconds, this.playerPos + 1);
      if (this.playerPos - this.lastBeat >= 5 || this.playerPos >= this.playing.durationSeconds) {
        this.lastBeat = this.playerPos;
        try {
          const p = await this.api.post<any>(`/trainings/videos/${this.playing.id}/progress`, {
            positionSeconds: this.playerPos,
          });
          this.playerPos = Math.max(this.playerPos, p.watchedSeconds);
          if (p.completed) {
            this.playerDone = true;
            this.stopTimer();
            await this.load();
          }
        } catch { /* keep playing; next beat retries */ }
      }
    }, 1000);
  }
  playerPct() { return this.playing ? Math.min(100, (this.playerPos / this.playing.durationSeconds) * 100) : 0; }
  stopTimer() { if (this.playerTimer) { clearInterval(this.playerTimer); this.playerTimer = null; } }
  closePlayer() { this.stopTimer(); this.playing = null; this.lastBeat = 0; this.load(); }

  // ── quiz wizard
  startQuiz(q: any) {
    this.quiz = q;
    this.qIndex = 0;
    this.answers = new Array(q.questions.length).fill(null);
    this.quizResult = null;
  }
  async submitQuiz() {
    this.busy = true;
    try {
      this.quizResult = await this.api.post<any>(`/trainings/quizzes/${this.quiz.id}/attempt`, {
        answers: this.answers,
      });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
    finally { this.busy = false; }
  }

  // ── HR management
  async create() {
    try {
      await this.api.post('/trainings/courses', {
        ...this.f,
        videos: this.v.title
          ? [{ title: this.v.title, streamUrl: this.v.streamUrl, durationSeconds: Number(this.v.durationSeconds), noSkip: !!this.f.mandatory }]
          : [],
      });
      this.f = { mandatory: true }; this.v = { durationSeconds: 300 };
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async assign(c: any) {
    if (!c._emp) return;
    try { await this.api.post(`/trainings/courses/${c.id}/assign`, { employeeIds: [c._emp] }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async saveQuiz(courseId: string) {
    try {
      await this.api.post(`/trainings/courses/${courseId}/quizzes`, {
        title: this.qb.title,
        passingScore: Number(this.qb.passingScore),
        questions: this.qb.questions
          .filter((q: any) => q.q && q.optionsText)
          .map((q: any) => ({
            q: q.q,
            options: q.optionsText.split(',').map((s: string) => s.trim()).filter(Boolean),
            answerIndex: Math.max(0, Number(q.correct) - 1),
          })),
      });
      this.quizFor = null;
      this.qb = { title: '', passingScore: 70, questions: [{ q: '', optionsText: '', correct: 1 }] };
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
