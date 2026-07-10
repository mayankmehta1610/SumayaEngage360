import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Public landing page. Illustrations are inline SVG drawn for this product —
// no external/stock images, so there are no licensing or hotlinking issues.
@Component({
  standalone: true,
  imports: [RouterLink],
  styles: [`
    .top {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 2rem; background: #0e1930; color: #fff;
      position: sticky; top: 0; z-index: 10;
    }
    .brand { font-weight: 800; font-size: 1.15rem; letter-spacing: .02em; }
    .brand span { color: #7aa2ff; }
    .top .btn { background: #2f6bff; }
    .hero {
      display: flex; gap: 3rem; align-items: center; flex-wrap: wrap;
      padding: 4rem 2rem; max-width: 1100px; margin: 0 auto;
    }
    .hero > div { flex: 1; min-width: 300px; }
    .hero h1 { font-size: 2.4rem; line-height: 1.15; margin: 0 0 1rem; }
    .hero h1 em { color: #2f6bff; font-style: normal; }
    .hero p { color: #45506a; font-size: 1.05rem; line-height: 1.6; }
    .cta { display: flex; gap: .75rem; margin-top: 1.5rem; flex-wrap: wrap; }
    .cta .btn { padding: .7rem 1.4rem; font-size: .95rem; }
    .features {
      max-width: 1100px; margin: 0 auto; padding: 1rem 2rem 4rem;
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;
    }
    .feature { background: #fff; border: 1px solid #e3e8f0; border-radius: 12px; padding: 1.25rem; }
    .feature h3 { margin: .6rem 0 .35rem; font-size: 1rem; }
    .feature p { color: #5b6577; font-size: .88rem; margin: 0; line-height: 1.5; }
    .band {
      background: #0e1930; color: #cdd8f2; text-align: center; padding: 3rem 2rem;
    }
    .band h2 { color: #fff; margin-top: 0; }
    footer { text-align: center; color: #77809a; font-size: .8rem; padding: 1.5rem; }
    .icon { width: 42px; height: 42px; }
  `],
  template: `
    <div class="top">
      <div class="brand">Sumaya<span>Engage360</span></div>
      <a class="btn" routerLink="/login">Login</a>
    </div>

    <section class="hero">
      <div>
        <h1>Hire, onboard and grow your people — <em>end to end</em>, on one platform.</h1>
        <p>
          SumayaEngage360 is a multi-tenant SaaS that unifies the complete talent journey:
          client-branded career pages and applicant tracking, interview management with
          recordings and proof, digital onboarding with background verification, projects
          and timesheets, appraisals and recognition, mandatory trainings, and a fully
          governed exit process — for your company and every client you hire for.
        </p>
        <div class="cta">
          <a class="btn" routerLink="/login">Login to your workspace</a>
          <a class="btn secondary" routerLink="/careers/sumaya-internal">View open roles</a>
        </div>
      </div>
      <div aria-hidden="true">
        <!-- Hand-drawn product illustration: hiring pipeline -->
        <svg viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px">
          <rect x="10" y="20" width="400" height="260" rx="16" fill="#eef3ff"/>
          <rect x="30" y="45" width="170" height="34" rx="8" fill="#ffffff" stroke="#c9d6f5"/>
          <circle cx="50" cy="62" r="9" fill="#2f6bff"/>
          <rect x="68" y="53" width="90" height="7" rx="3" fill="#9db4e8"/>
          <rect x="68" y="65" width="60" height="6" rx="3" fill="#cdd9f4"/>
          <rect x="30" y="90" width="170" height="34" rx="8" fill="#ffffff" stroke="#c9d6f5"/>
          <circle cx="50" cy="107" r="9" fill="#22c55e"/>
          <rect x="68" y="98" width="100" height="7" rx="3" fill="#9db4e8"/>
          <rect x="68" y="110" width="50" height="6" rx="3" fill="#cdd9f4"/>
          <rect x="30" y="135" width="170" height="34" rx="8" fill="#ffffff" stroke="#c9d6f5"/>
          <circle cx="50" cy="152" r="9" fill="#f59e0b"/>
          <rect x="68" y="143" width="80" height="7" rx="3" fill="#9db4e8"/>
          <rect x="68" y="155" width="70" height="6" rx="3" fill="#cdd9f4"/>
          <path d="M210 62 C 250 62, 250 150, 285 150" stroke="#2f6bff" stroke-width="2.5" fill="none" stroke-dasharray="5 4"/>
          <path d="M210 107 C 245 107, 245 150, 285 150" stroke="#22c55e" stroke-width="2.5" fill="none" stroke-dasharray="5 4"/>
          <path d="M210 152 L 285 152" stroke="#f59e0b" stroke-width="2.5" fill="none" stroke-dasharray="5 4"/>
          <circle cx="322" cy="150" r="38" fill="#2f6bff"/>
          <circle cx="322" cy="138" r="12" fill="#ffffff"/>
          <path d="M300 172 a22 16 0 0 1 44 0" fill="#ffffff"/>
          <rect x="285" y="205" width="105" height="12" rx="6" fill="#c9d6f5"/>
          <rect x="30" y="205" width="230" height="12" rx="6" fill="#dbe5fa"/>
          <rect x="30" y="228" width="290" height="12" rx="6" fill="#e7eefc"/>
        </svg>
      </div>
    </section>

    <section class="features">
      <div class="feature">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#2f6bff" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <h3>Applicant Tracking</h3>
        <p>Client-branded public career pages with JD, vacancies and locations. Skill tagging at apply time and AI resume parsing.</p>
      </div>
      <div class="feature">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#2f6bff" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z" fill="#2f6bff" stroke="none"/></svg>
        <h3>Verified Interviews</h3>
        <p>Configurable interview rounds with recordings from Teams/Zoom and mandatory proof screenshots — a complete audit trail.</p>
      </div>
      <div class="feature">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#2f6bff" stroke-width="1.8"><path d="M9 12l2 2 4-5"/><circle cx="12" cy="12" r="9"/></svg>
        <h3>Digital Onboarding</h3>
        <p>Country-aware document checklists (Aadhaar, PAN...), HR verification, third-party background checks and policy sign-off.</p>
      </div>
      <div class="feature">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#2f6bff" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16"/></svg>
        <h3>Projects & Timesheets</h3>
        <p>Percentage-based allocation to client or internal projects, with internal and client timesheets and manager approvals.</p>
      </div>
      <div class="feature">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#2f6bff" stroke-width="1.8"><path d="M12 3v18M5 12l7-7 7 7"/></svg>
        <h3>Performance & Growth</h3>
        <p>Fully customizable appraisal cycles, 360° feedback, instant recognition and mandatory no-skip training videos with quizzes.</p>
      </div>
      <div class="feature">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#2f6bff" stroke-width="1.8"><path d="M9 21h6M12 17v4M5 3h14l-2 10a5 5 0 0 1-10 0z"/></svg>
        <h3>Governed Exits</h3>
        <p>Resignation approvals, departmental NOC sign-offs, asset recovery, full &amp; final settlement and auto-generated letters.</p>
      </div>
    </section>

    <section class="band">
      <h2>One platform. Every client. The whole employee lifecycle.</h2>
      <p>Multi-tenant by design — every client company gets its own branded space, workflows and approvals.</p>
      <a class="btn" style="background:#2f6bff" routerLink="/login">Get started</a>
    </section>
    <footer>© {{ year }} SumayaEngage360 · Applicant Tracking & Employee Lifecycle Management</footer>
  `,
})
export class LandingComponent {
  year = new Date().getFullYear();
}
