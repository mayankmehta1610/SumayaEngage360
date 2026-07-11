// End-to-end lifecycle test — exercises every module against a running API
// (and therefore the real database). No mocks, no hardcoded UI data.
//
//   node test/e2e.mjs                        -> http://localhost:3000
//   API_URL=https://... node test/e2e.mjs    -> deployed environment
//
// Creates an isolated throwaway tenant per run, so it is safe on production.

const BASE = (process.env.API_URL ?? 'http://localhost:3000') + '/api';
const RUN = Date.now().toString(36);
const TENANT = `e2e-${RUN}`;
let passed = 0;
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.error(`  ✘ ${name} ${extra}`); }
}

async function req(method, path, { token, tenant, body, form } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenant) headers['x-tenant-id'] = tenant;
  let payload;
  if (form) { payload = form; }
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

const main = async () => {
  console.log(`E2E against ${BASE} (tenant: ${TENANT})`);

  // ─── Platform & tenancy ───────────────────────────────────────────
  console.log('\n[1] Platform admin & tenant');
  // register only succeeds on a fresh database; otherwise log in
  await req('POST', '/auth/register', { body: {
    email: 'admin@engage360.com', password: 'Admin@12345',
    firstName: 'Platform', lastName: 'Admin' } });
  const adminLogin = await req('POST', '/auth/login', { body: {
    email: process.env.ADMIN_EMAIL ?? 'admin@engage360.com',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@12345' } });
  check('platform admin login', adminLogin.status === 201 || adminLogin.status === 200, JSON.stringify(adminLogin.data));
  const admin = adminLogin.data.accessToken;

  const tenantRes = await req('POST', '/tenants', { token: admin, body: {
    name: `E2E Corp ${RUN}`, subdomain: TENANT, country: 'IN',
    adminEmail: `owner@${TENANT}.test`, adminPassword: 'Owner@12345',
    adminFirstName: 'Owner', adminLastName: 'One' } });
  check('tenant created', tenantRes.status === 201, JSON.stringify(tenantRes.data));

  const ownerLogin = await req('POST', '/auth/login', { tenant: TENANT, body: {
    email: `owner@${TENANT}.test`, password: 'Owner@12345' } });
  check('tenant admin login', !!ownerLogin.data.accessToken);
  const owner = ownerLogin.data.accessToken;
  const t = { token: owner, tenant: TENANT };

  // ─── Users & org ──────────────────────────────────────────────────
  console.log('\n[2] Users, departments, designations');
  const hr = await req('POST', '/users', { ...t, body: {
    email: `hr@${TENANT}.test`, password: 'Hr@1234567',
    firstName: 'Heena', lastName: 'HR', roles: ['HR'] } });
  check('HR user created', hr.status === 201, JSON.stringify(hr.data));
  const dept = await req('POST', '/departments', { ...t, body: { name: 'IT' } });
  check('department created', dept.status === 201);
  const desig = await req('POST', '/designations', { ...t, body: { name: 'Engineer', level: 2 } });
  check('designation created', desig.status === 201);

  const mgrEmp = await req('POST', '/employees', { ...t, body: {
    email: `manager@${TENANT}.test`, password: 'Manager@123',
    firstName: 'Mahesh', lastName: 'Manager', designation: 'Manager',
    departmentId: dept.data.id, joinDate: new Date().toISOString() } });
  check('manager employee created', mgrEmp.status === 201, JSON.stringify(mgrEmp.data));
  await req('POST', `/departments/${dept.data.id}/head/${mgrEmp.data.id}`, { ...t });

  // ─── ATS ──────────────────────────────────────────────────────────
  console.log('\n[3] ATS: client, job, public careers, application');
  const client = await req('POST', '/hiring-clients', { ...t, body: {
    name: 'Acme Client', slug: 'acme', description: 'E2E hiring client' } });
  check('hiring client created', client.status === 201);
  const job = await req('POST', '/jobs', { ...t, body: {
    hiringClientId: client.data.id, title: 'Backend Engineer',
    description: 'Build APIs', vacancies: 2, location: 'Remote',
    skills: ['NestJS', 'SQL'],
    interviewPlan: [{ level: 1, name: 'Technical' }, { level: 2, name: 'HR' }] } });
  check('job created with skills', job.status === 201 && job.data.skills?.length === 2);
  await req('POST', `/jobs/${job.data.id}/publish`, { ...t });

  const careers = await req('GET', '/public/careers/acme', { tenant: TENANT });
  check('public careers lists published job', careers.data?.jobs?.length === 1);

  const applyRes = await req('POST', `/public/careers/jobs/${job.data.id}/apply`, {
    tenant: TENANT, body: {
      email: `cand@${TENANT}.test`, firstName: 'Chetan', lastName: 'Candidate',
      phone: '9999999999', skills: ['NestJS', 'PostgreSQL'],
      experiences: [{ company: 'OldCo', title: 'Dev', startDate: '2021-01-01' }] } });
  check('candidate applied via public API', applyRes.status === 201, JSON.stringify(applyRes.data));
  const dup = await req('POST', `/public/careers/jobs/${job.data.id}/apply`, {
    tenant: TENANT, body: { email: `cand@${TENANT}.test`, firstName: 'C', lastName: 'C', skills: ['x'] } });
  check('duplicate application rejected', dup.status === 409);

  // ─── Interviews (mandatory screenshot rule) ───────────────────────
  console.log('\n[4] Interviews with mandatory screenshot');
  const appId = applyRes.data.id;
  const round = await req('POST', `/applications/${appId}/interviews`, { ...t, body: {
    level: 1, name: 'Technical', mode: 'TEAMS' } });
  check('interview scheduled', round.status === 201);

  const noShot = await req('PATCH', `/interviews/${round.data.id}/result`, { ...t, body: {
    result: 'PASSED', rating: 8 } });
  check('result without screenshot rejected', noShot.status === 400);

  const form = new FormData();
  form.append('file', new Blob([Buffer.from('fake-png')], { type: 'image/png' }), 'proof.png');
  const upload = await req('POST', '/files', { tenant: TENANT, form });
  check('file upload works', upload.status === 201 && !!upload.data.id, JSON.stringify(upload.data));

  const withShot = await req('PATCH', `/interviews/${round.data.id}/result`, { ...t, body: {
    result: 'PASSED', rating: 8, feedback: 'Strong', screenshotFileId: upload.data.id,
    recordingUrl: 'https://teams.example.com/rec/123' } });
  check('result with screenshot accepted', withShot.status === 200);

  // ─── Offer -> employee -> onboarding ──────────────────────────────
  console.log('\n[5] Offer, acceptance, onboarding portal');
  await req('PATCH', `/applications/${appId}/status`, { ...t, body: { status: 'SELECTED' } });
  const offer = await req('POST', `/applications/${appId}/offer`, { ...t, body: {
    designation: 'Engineer', annualCtc: 1200000,
    salaryBreakup: { basic: 50000, hra: 25000 },
    joiningDate: new Date(Date.now() + 30 * 864e5).toISOString(), location: 'Pune' } });
  check('offer created', offer.status === 201, JSON.stringify(offer.data));
  await req('POST', `/offers/${offer.data.id}/send`, { ...t });
  const accept = await req('POST', `/public/offers/${offer.data.id}/accept`, { tenant: TENANT });
  check('offer accepted -> onboarding token', !!accept.data.onboardingToken, JSON.stringify(accept.data));
  const tok = accept.data.onboardingToken;

  await req('POST', '/onboarding/requirements', { ...t, body: {
    country: 'IN', code: 'PAN', name: 'PAN Card', mandatory: true } });
  const policy = await req('POST', '/policies', { ...t, body: {
    title: 'Data Security Policy', bodyHtml: '<p>Protect data.</p>', mandatory: true } });

  const portal = await req('GET', `/public/onboarding/${tok}`, { tenant: TENANT });
  check('onboarding portal loads', portal.status === 200 && portal.data.requirements?.length === 1);
  check('skills carried from application', portal.data.skills?.some((s) => s.fromApplication));

  const incomplete = await req('POST', `/public/onboarding/${tok}/complete`, {
    tenant: TENANT, body: { password: 'Newhire@123' } });
  check('complete blocked until docs+policies done', incomplete.status === 400);

  await req('POST', `/public/onboarding/${tok}/documents`, { tenant: TENANT, body: {
    code: 'PAN', fileId: upload.data.id } });
  await req('POST', `/public/onboarding/${tok}/policies/${policy.data.id}/acknowledge`, { tenant: TENANT });
  const complete = await req('POST', `/public/onboarding/${tok}/complete`, {
    tenant: TENANT, body: { password: 'Newhire@123' } });
  check('onboarding submitted', complete.status === 201, JSON.stringify(complete.data));

  const cases = await req('GET', '/onboarding/cases', { ...t });
  const kase = cases.data?.[0];
  const doc = kase?.employee?.documents?.[0];
  const verify = await req('POST', `/onboarding/documents/${doc?.id}/verify`, { ...t, body: { approve: true } });
  check('HR verified document', verify.status === 201 || verify.status === 200);
  const approveCase = await req('POST', `/onboarding/cases/${kase?.id}/approve`, { ...t });
  check('onboarding approved -> employee ACTIVE', approveCase.status === 201 || approveCase.status === 200, JSON.stringify(approveCase.data));

  const newHireLogin = await req('POST', '/auth/login', { tenant: TENANT, body: {
    email: `cand@${TENANT}.test`, password: 'Newhire@123' } });
  check('new hire can log in with onboarding password', !!newHireLogin.data.accessToken);
  const hire = { token: newHireLogin.data.accessToken, tenant: TENANT };

  // ─── BGC ──────────────────────────────────────────────────────────
  console.log('\n[6] Background check');
  const vendor = await req('POST', '/bgc/vendors', { ...t, body: {
    name: 'CheckPro', email: `vendor@${TENANT}.test` } });
  const employees = await req('GET', '/employees', { ...t });
  const hireEmp = employees.data.find((e) => e.user.email === `cand@${TENANT}.test`);
  const bgc = await req('POST', `/bgc/employees/${hireEmp.id}/submit`, { ...t, body: { vendorId: vendor.data.id } });
  check('BGC submitted to vendor', bgc.status === 201);
  const me = await req('GET', '/employees/me', { ...hire });
  check('BGC hidden from employee', me.status === 200 && me.data.backgroundCheck === undefined);

  // ─── Projects, allocation, salary ─────────────────────────────────
  console.log('\n[7] Projects, allocation, salary');
  const project = await req('POST', '/projects', { ...t, body: {
    name: 'Phoenix', code: `PRJ-${RUN}`, hiringClientId: client.data.id,
    location: 'Pune', managerId: mgrEmp.data.id } });
  check('project created', project.status === 201);
  const alloc = await req('POST', `/projects/${project.data.id}/allocations`, { ...t, body: {
    employeeId: hireEmp.id, percentage: 80, startDate: new Date().toISOString() } });
  check('allocation created (80%)', alloc.status === 201);
  const over = await req('POST', `/projects/${project.data.id}/allocations`, { ...t, body: {
    employeeId: hireEmp.id, percentage: 30, startDate: new Date().toISOString() } });
  check('over-allocation (>100%) rejected', over.status === 400);
  const empAfter = await req('GET', `/employees/${hireEmp.id}`, { ...t });
  check('manager auto-assigned on allocation', empAfter.data.managerId === mgrEmp.data.id);
  const salary = await req('GET', '/employees/me/salary', { ...hire });
  check('offered salary visible to employee', salary.data?.some((s) => s.isOffered));

  // ─── Timesheets ───────────────────────────────────────────────────
  console.log('\n[8] Timesheets with manager approval');
  const ts = await req('POST', '/timesheets', { ...hire, body: {
    type: 'CLIENT', projectId: project.data.id,
    periodStart: new Date().toISOString(), periodEnd: new Date().toISOString(),
    entries: [{ workDate: new Date().toISOString(), hours: 8, task: 'API work' }] } });
  check('timesheet created', ts.status === 201);
  await req('POST', `/timesheets/${ts.data.id}/submit`, { ...hire });
  const mgrLogin = await req('POST', '/auth/login', { tenant: TENANT, body: {
    email: `manager@${TENANT}.test`, password: 'Manager@123' } });
  const mgr = { token: mgrLogin.data.accessToken, tenant: TENANT };
  const pendingTs = await req('GET', '/timesheets/pending-approval', { ...mgr });
  check('manager sees submitted timesheet', pendingTs.data?.length === 1);
  const tsApprove = await req('POST', `/timesheets/${ts.data.id}/approve`, { ...mgr, body: { note: 'ok' } });
  check('manager approved timesheet', tsApprove.status === 201 || tsApprove.status === 200);

  // ─── Appraisals, recognition, feedback ────────────────────────────
  console.log('\n[9] Appraisals, recognition, feedback');
  const cycle = await req('POST', '/appraisals/cycles', { ...t, body: {
    name: 'E2E Q1', frequency: 'QUARTERLY',
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 90 * 864e5).toISOString(),
    template: { sections: ['Delivery'], ratingScale: [1, 2, 3, 4, 5] } } });
  const launch = await req('POST', `/appraisals/cycles/${cycle.data.id}/launch`, { ...t });
  check('appraisal cycle launched', launch.data?.created >= 1, JSON.stringify(launch.data));
  const myAppraisals = await req('GET', '/appraisals/mine', { ...hire });
  const ap = myAppraisals.data?.[0];
  const self = await req('POST', `/appraisals/${ap?.id}/self-review`, { ...hire, body: {
    review: { Delivery: 'Shipped the API' } } });
  check('self review submitted', self.status === 201 || self.status === 200);
  const mgrReview = await req('POST', `/appraisals/${ap?.id}/manager-review`, { ...mgr, body: {
    review: { Delivery: 'Agreed' }, rating: '4' } });
  check('manager review submitted', mgrReview.status === 201 || mgrReview.status === 200);

  const recog = await req('POST', '/recognitions', { ...mgr, body: {
    receiverId: hireEmp.id, badge: 'Star Performer', message: 'Great work', points: 50 } });
  check('recognition given', recog.status === 201);
  const feed = await req('GET', '/recognitions/feed', { ...hire });
  check('recognition feed visible', feed.data?.length === 1);
  const fb = await req('POST', '/feedback', { ...mgr, body: {
    receiverId: hireEmp.id, type: 'MANAGER_TO_EMPLOYEE', content: { text: 'Keep it up' } } });
  check('feedback given', fb.status === 201);

  // ─── Assets & trainings ───────────────────────────────────────────
  console.log('\n[10] Assets & no-skip trainings');
  const asset = await req('POST', '/assets', { ...t, body: {
    assetTag: `LT-${RUN}`, category: 'LAPTOP', model: 'ThinkPad' } });
  const assign = await req('POST', `/assets/${asset.data.id}/assign/${hireEmp.id}`, { ...t });
  check('asset assigned', assign.status === 201);

  const course = await req('POST', '/trainings/courses', { ...t, body: {
    title: 'Security 101', mandatory: true, forOnboarding: true,
    videos: [{ title: 'Intro', streamUrl: 'https://cdn.example.com/v1', durationSeconds: 120, noSkip: true }] } });
  const videoId = course.data.videos[0].id;
  await req('POST', `/trainings/courses/${course.data.id}/assign`, { ...t, body: { employeeIds: [hireEmp.id] } });
  const jump = await req('POST', `/trainings/videos/${videoId}/progress`, { ...hire, body: { positionSeconds: 120 } });
  check('no-skip: jump to end NOT trusted', jump.data?.completed === false && jump.data?.watchedSeconds < 120,
    `watched=${jump.data?.watchedSeconds}`);
  const quiz = await req('POST', `/trainings/courses/${course.data.id}/quizzes`, { ...t, body: {
    title: 'Quiz', passingScore: 50,
    questions: [{ q: '2+2?', options: ['3', '4'], answerIndex: 1 }] } });
  const attempt = await req('POST', `/trainings/quizzes/${quiz.data.id}/attempt`, { ...hire, body: { answers: [1] } });
  check('quiz graded server-side', attempt.data?.passed === true && attempt.data?.score === 100);

  // ─── Exit process ─────────────────────────────────────────────────
  console.log('\n[11] Exit: resignation -> NOC -> F&F -> release');
  const resign = await req('POST', '/exit/resignations', { ...hire, body: {
    reason: 'Relocation', requestedLastDay: new Date(Date.now() + 60 * 864e5).toISOString() } });
  check('resignation submitted', resign.status === 201, JSON.stringify(resign.data));
  const rid = resign.data.resignation.id;
  await req('POST', `/exit/resignations/${rid}/accept`, { ...t, body: {
    agreedLastDay: new Date(Date.now() + 60 * 864e5).toISOString() } });
  const clearances = await req('POST', `/exit/resignations/${rid}/clearances/init`, { ...t });
  check('departmental NOCs created', Array.isArray(clearances.data) && clearances.data.length >= 1);
  const myNocs = await req('GET', '/exit/clearances/mine', { ...mgr });
  check('department head sees NOC with held assets',
    myNocs.data?.length >= 1 && myNocs.data[0].resignation.employee.assetAssignments?.length === 1);
  for (const c of myNocs.data) {
    await req('POST', `/exit/clearances/${c.id}/sign-off`, { ...mgr, body: { remarks: 'All clear' } });
  }
  const fnf = await req('POST', `/exit/resignations/${rid}/fnf`, { ...t, body: {
    breakup: { leaveEncashment: 20000 }, netPayable: 20000 } });
  check('F&F recorded', fnf.status === 201 || fnf.status === 200, JSON.stringify(fnf.data));
  const release = await req('POST', `/exit/resignations/${rid}/release`, { ...t });
  check('employee released with letter', release.status === 201 || release.status === 200, JSON.stringify(release.data));
  const finalEmp = await req('GET', `/employees/${hireEmp.id}`, { ...t });
  check('employee status EXITED', finalEmp.data.status === 'EXITED');

  // ─── Matching engine & offline parser ─────────────────────────────
  console.log('\n[12] Talent-pool matching & auto-shortlisting');
  const job2 = await req('POST', '/jobs', { ...t, body: {
    hiringClientId: client.data.id, title: 'NestJS Developer',
    description: 'Backend work with NestJS and PostgreSQL', vacancies: 1,
    location: 'Remote', skills: ['NestJS', 'PostgreSQL'] } });
  await req('POST', `/jobs/${job2.data.id}/publish`, { ...t });

  const matchRun = await req('POST', `/jobs/${job2.data.id}/match`, { ...t, body: {
    useAi: false, threshold: 30 } });
  check('rule-based match run', matchRun.data?.candidatesScored >= 1, JSON.stringify(matchRun.data));
  const matches = await req('GET', `/jobs/${job2.data.id}/matches`, { ...t });
  const m = matches.data?.find((x) => x.candidate.email === `cand@${TENANT}.test`);
  check('past candidate scored against new JD', !!m && m.ruleScore > 0, JSON.stringify(m ?? {}));
  check('match breakdown recorded', !!m?.breakdown?.rule?.matchedSkills?.length);
  check('candidate auto-shortlisted', m?.shortlisted === true);
  const poolApps = await req('GET', `/applications?jobId=${job2.data.id}`, { ...t });
  const poolApp = poolApps.data?.find((a) => a.candidate.email === `cand@${TENANT}.test`);
  check('talent-pool application auto-created', poolApp?.source === 'TALENT_POOL' && poolApp?.status === 'SCREENING',
    JSON.stringify({ source: poolApp?.source, status: poolApp?.status }));

  console.log('\n[13] Offline (scheduled) resume parser');
  const cvText = [
    'Priya Sharma', 'priya@example.com  +91 98765 43210',
    'Senior developer with 6 years experience in NestJS, PostgreSQL and SQL.',
  ].join('\n');
  const cvForm = new FormData();
  cvForm.append('file', new Blob([cvText], { type: 'text/plain' }), 'priya-cv.txt');
  const cvUp = await req('POST', '/files', { tenant: TENANT, form: cvForm });
  const apply2 = await req('POST', `/public/careers/jobs/${job2.data.id}/apply`, {
    tenant: TENANT, body: {
      email: `priya@${TENANT}.test`, firstName: 'Priya', lastName: 'Sharma',
      skills: ['NestJS'], resumeFileId: cvUp.data.id } });
  check('second candidate applied with CV', apply2.status === 201);

  const batch = await req('POST', '/matching/parse-pending', { ...t });
  check('offline parser batch ran', batch.data?.parsed >= 1, JSON.stringify(batch.data));
  const app2 = await req('GET', `/applications/${apply2.data.id}`, { ...t });
  const parsedCv = app2.data?.candidate?.parsedResume;
  check('offline parser stored structured profile', !!parsedCv?.method,
    JSON.stringify(parsedCv ?? {}).slice(0, 120));
  check('offline parser extracted experience/skills',
    (parsedCv?.skills ?? []).length >= 1 || parsedCv?.totalYearsExperience != null);

  console.log(`\n==== ${passed} passed, ${failed} failed ====`);
  process.exit(failed ? 1 : 0);
};

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
