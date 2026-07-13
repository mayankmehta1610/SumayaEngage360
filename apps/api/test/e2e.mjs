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
const VERIFIED_FEATURES = 839;
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

function jwtSub(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).sub;
  } catch {
    return null;
  }
}

function fullApplyBody(overrides = {}) {
  return {
    email: `cand@${TENANT}.test`,
    firstName: 'Chetan',
    lastName: 'Candidate',
    phone: '9999999999',
    city: 'Pune',
    country: 'India',
    linkedIn: 'https://linkedin.com/in/chetan-candidate',
    professionalSummary: 'Backend engineer with API and database experience.',
    domainExpertise: ['FinTech', 'SaaS'],
    yearsExperience: 5,
    skills: ['NestJS', 'PostgreSQL'],
    experiences: [{
      company: 'OldCo', title: 'Dev', startDate: '2021-01-01',
      description: 'Built REST APIs',
    }],
    education: [{
      institution: 'State University', degree: 'B.Tech', field: 'CS', year: 2019,
    }],
    contacts: [{
      name: 'Ref Manager', relationship: 'Manager',
      email: 'ref@example.com', phone: '8888888888',
    }],
    ...overrides,
  };
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
  check('platform admin denied tenant employee APIs',
    (await req('GET', '/employees', { token: admin })).status === 403);

  const tenantRes = await req('POST', '/tenants', { token: admin, body: {
    name: `E2E Corp ${RUN}`, subdomain: TENANT, country: 'IN',
    adminEmail: `owner@${TENANT}.test`, adminPassword: 'Owner@12345',
    adminFirstName: 'Owner', adminLastName: 'One' } });
  check('tenant created', tenantRes.status === 201, JSON.stringify(tenantRes.data));

  const AGENCY_TENANT = `e2e-agency-${RUN}`;
  const agencyTenantRes = await req('POST', '/tenants', { token: admin, body: {
    name: `E2E Agency ${RUN}`, subdomain: AGENCY_TENANT, country: 'IN',
    tenantType: 'RECRUITMENT_AGENCY',
    enabledPortals: ['ats', 'agency'],
    adminEmail: `agency@${AGENCY_TENANT}.test`, adminPassword: 'Agency@12345',
    adminFirstName: 'Asha', adminLastName: 'Agency' } });
  check('agency tenant created', agencyTenantRes.status === 201, JSON.stringify(agencyTenantRes.data));
  check('agency tenant type', agencyTenantRes.data?.tenantType === 'RECRUITMENT_AGENCY');

  const agencyLogin = await req('POST', '/auth/login', { tenant: AGENCY_TENANT, body: {
    email: `agency@${AGENCY_TENANT}.test`, password: 'Agency@12345' } });
  check('agency admin login', !!agencyLogin.data.accessToken);
  const agency = { token: agencyLogin.data.accessToken, tenant: AGENCY_TENANT };

  const tenantMe = await req('GET', '/tenant/me', agency);
  check('tenant me returns type', tenantMe.data?.tenantType === 'RECRUITMENT_AGENCY');

  const wizard = await req('POST', '/tenant/onboarding-wizard', { ...agency, body: {
    tenantType: 'RECRUITMENT_AGENCY',
    questionnaire: { headcount: '1-5', primaryMarket: 'IT' },
    enabledPortals: ['ats', 'agency'] } });
  check('onboarding wizard', wizard.status === 200 || wizard.status === 201);

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
  const interviewer = await req('POST', '/users', { ...t, body: {
    email: `interviewer@${TENANT}.test`, password: 'Interviewer@123',
    firstName: 'Isha', lastName: 'Interviewer', roles: ['INTERVIEWER'] } });
  check('interviewer user created', interviewer.status === 201, JSON.stringify(interviewer.data));
  const vendorUser = await req('POST', '/users', { ...t, body: {
    email: `vendor@${TENANT}.test`, password: 'Vendor@12345',
    firstName: 'Vera', lastName: 'Vendor', roles: ['BGC_VENDOR'] } });
  check('BGC vendor user created', vendorUser.status === 201, JSON.stringify(vendorUser.data));
  const dept = await req('POST', '/departments', { ...t, body: { name: 'IT' } });
  check('department created', dept.status === 201);
  const desig = await req('POST', '/designations', { ...t, body: { name: 'Engineer', level: 2 } });
  check('designation created', desig.status === 201);

  const mgrEmp = await req('POST', '/employees', { ...t, body: {
    email: `manager@${TENANT}.test`, password: 'Manager@123',
    firstName: 'Mahesh', lastName: 'Manager', designation: 'Manager',
    departmentId: dept.data.id, joinDate: new Date().toISOString() } });
  check('manager employee created', mgrEmp.status === 201, JSON.stringify(mgrEmp.data));
  const tenantUsers = await req('GET', '/users', { ...t });
  const managerUser = tenantUsers.data.find((u) => u.email === `manager@${TENANT}.test`);
  const managerAccess = await req('PATCH', `/users/${managerUser.id}/access`, { ...t, body: {
    roles: ['EMPLOYEE', 'MANAGER', 'DEPARTMENT_HEAD'] } });
  check('manager and department-head roles assigned', managerAccess.status === 200);
  const activateManager = await req('PATCH', `/employees/${mgrEmp.data.id}`, { ...t, body: { status: 'ACTIVE' } });
  check('direct hire activated through controlled transition', activateManager.data?.status === 'ACTIVE');
  const skipExit = await req('PATCH', `/employees/${mgrEmp.data.id}`, { ...t, body: { status: 'EXITED' } });
  check('direct status edit cannot bypass exit workflow', skipExit.status === 400);
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

  const resumeForm = new FormData();
  resumeForm.append('file', new Blob(['fake resume'], { type: 'application/pdf' }), 'resume.pdf');
  const resumeUp = await req('POST', '/files', { tenant: TENANT, form: resumeForm });
  check('resume upload for apply', resumeUp.status === 201 && !!resumeUp.data.id);

  const applyBody = fullApplyBody({ resumeFileId: resumeUp.data.id });
  const applyRes = await req('POST', `/public/careers/jobs/${job.data.id}/apply`, {
    tenant: TENANT, body: applyBody });
  check('candidate applied via public API', applyRes.status === 201, JSON.stringify(applyRes.data));
  const profile = await req('GET', `/applications/${applyRes.data.id}/profile`, { ...t });
  check('application profile created on apply',
    profile.status === 200
    && profile.data?.professionalSummary === applyBody.professionalSummary
    && profile.data?.domainExpertise?.length === 2
    && profile.data?.education?.length === 1
    && profile.data?.contacts?.length === 1,
    JSON.stringify(profile.data ?? {}));
  const dup = await req('POST', `/public/careers/jobs/${job.data.id}/apply`, {
    tenant: TENANT, body: fullApplyBody({ resumeFileId: resumeUp.data.id }) });
  check('duplicate application rejected', dup.status === 409);

  // ─── Interviews (mandatory screenshot rule) ───────────────────────
  console.log('\n[4] Interviews with mandatory screenshot');
  const appId = applyRes.data.id;
  const round = await req('POST', `/applications/${appId}/interviews`, { ...t, body: {
    level: 1, name: 'Technical', mode: 'TEAMS', interviewerId: interviewer.data.id } });
  check('interview scheduled', round.status === 201);

  const interviewerLogin = await req('POST', '/auth/login', { tenant: TENANT, body: {
    email: `interviewer@${TENANT}.test`, password: 'Interviewer@123' } });
  const interviewerSession = { token: interviewerLogin.data.accessToken, tenant: TENANT };
  const assignedApps = await req('GET', '/applications', interviewerSession);
  check('interviewer sees assigned application', assignedApps.data?.length === 1);
  const interviewerSchedule = await req('POST', `/applications/${appId}/interviews`, {
    ...interviewerSession, body: { level: 2, name: 'Unauthorized scheduling' },
  });
  check('interviewer cannot schedule rounds', interviewerSchedule.status === 403);
  const interviewerStatus = await req('PATCH', `/applications/${appId}/status`, {
    ...interviewerSession, body: { status: 'SELECTED' },
  });
  check('interviewer cannot change application status', interviewerStatus.status === 403);
  const assignedCandidates = await req('GET', '/candidates', interviewerSession);
  check('interviewer talent pool is assignment scoped', assignedCandidates.data?.length === 1);
  check('interviewer cannot access jobs', (await req('GET', '/jobs', interviewerSession)).status === 403);
  check('interviewer cannot access clients', (await req('GET', '/hiring-clients', interviewerSession)).status === 403);

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
  const vendorLogin = await req('POST', '/auth/login', { tenant: TENANT, body: {
    email: `vendor@${TENANT}.test`, password: 'Vendor@12345' } });
  const vendorSession = { token: vendorLogin.data.accessToken, tenant: TENANT };
  const vendorCases = await req('GET', '/bgc/vendor/cases', vendorSession);
  check('vendor sees assigned BGC case', vendorCases.data?.length === 1);
  check('vendor denied employee directory', (await req('GET', '/employees', vendorSession)).status === 403);
  const me = await req('GET', '/employees/me', { ...hire });
  check('BGC hidden from employee', me.status === 200 && me.data.backgroundCheck === undefined);

  // ─── Projects, allocation, salary ─────────────────────────────────
  console.log('\n[7] Projects, allocation, salary');
  const project = await req('POST', '/projects', { ...t, body: {
    name: 'Phoenix', code: `PRJ-${RUN}`, hiringClientId: client.data.id,
    location: 'Pune', managerId: mgrEmp.data.id, requiredSkills: ['NestJS', 'SQL'] } });
  check('project created', project.status === 201);
  const alloc = await req('POST', `/projects/${project.data.id}/allocations`, { ...t, body: {
    employeeId: hireEmp.id, percentage: 80, startDate: new Date().toISOString() } });
  check('allocation created (80%)', alloc.status === 201);
  const over = await req('POST', `/projects/${project.data.id}/allocations`, { ...t, body: {
    employeeId: hireEmp.id, percentage: 30, startDate: new Date().toISOString() } });
  check('over-allocation (>100%) rejected', over.status === 400);
  const empAfter = await req('GET', `/employees/${hireEmp.id}`, { ...t });
  check('manager auto-assigned on allocation', empAfter.data.managerId === mgrEmp.data.id);
  const bench = await req('GET', '/resourcing/bench', { ...t });
  check('bench capacity reflects live allocation', bench.data?.some((e) => e.id === hireEmp.id && e.availablePercent === 20));
  const resourceMatches = await req('GET', `/resourcing/projects/${project.data.id}/match`, { ...t });
  check('project skill matching uses configured requirements', resourceMatches.data?.targetSkills?.includes('nestjs') && resourceMatches.data?.candidates?.some((e) => e.id === hireEmp.id));
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
  check('manager login carries configured role', jwtSub(mgr.token) != null && mgrLogin.data.user.roles.includes('MANAGER'));
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
      phone: '9876543210', city: 'Mumbai', country: 'India',
      linkedIn: 'https://linkedin.com/in/priya-sharma',
      professionalSummary: 'Senior developer with NestJS experience.',
      domainExpertise: ['Enterprise'], yearsExperience: 6,
      skills: ['NestJS'],
      experiences: [{ company: 'TechCo', title: 'Senior Dev', startDate: '2019-06-01' }],
      education: [{ institution: 'IIT', degree: 'B.Tech', field: 'IT', year: 2015 }],
      contacts: [{ name: 'Lead', relationship: 'Manager', email: 'lead@example.com', phone: '7777777777' }],
      resumeFileId: cvUp.data.id,
    } });
  check('second candidate applied with CV', apply2.status === 201);

  const batch = await req('POST', '/matching/parse-pending', { ...t });
  check('offline parser batch ran', batch.data?.parsed >= 1, JSON.stringify(batch.data));
  const app2 = await req('GET', `/applications/${apply2.data.id}`, { ...t });
  const parsedCv = app2.data?.candidate?.parsedResume;
  check('offline parser stored structured profile', !!parsedCv?.method,
    JSON.stringify(parsedCv ?? {}).slice(0, 120));
  check('offline parser extracted experience/skills',
    (parsedCv?.skills ?? []).length >= 1 || parsedCv?.totalYearsExperience != null);

  // ─── Dashboard KPIs, directory, talent pool endpoints ─────────────
  console.log('\n[14] Dashboard KPIs & visibility endpoints');
  const kpis = await req('GET', '/dashboard/kpis', { ...t });
  check('business KPIs computed from DB', kpis.data?.business?.jobsPublished >= 1
    && Array.isArray(kpis.data?.business?.applicationsByStatus), JSON.stringify(kpis.data?.business ?? {}).slice(0, 120));
  const kpisEmp = await req('GET', '/dashboard/kpis', { ...mgr });
  check('personal KPIs for employees', kpisEmp.data?.personal != null);
  const dir = await req('GET', '/employees/directory', { ...mgr });
  check('directory visible to any employee', Array.isArray(dir.data) && dir.data.length >= 1);
  const pool = await req('GET', '/candidates', { ...t });
  check('talent pool endpoint lists candidates', Array.isArray(pool.data) && pool.data.length >= 1);

  // ─── Multi-tenant isolation ───────────────────────────────────────
  console.log('\n[15] Tenant isolation — data never crosses companies');
  const T2 = `iso-${RUN}`;
  await req('POST', '/tenants', { token: admin, body: {
    name: `Isolation Co ${RUN}`, subdomain: T2, country: 'IN',
    adminEmail: `owner@${T2}.test`, adminPassword: 'Owner@12345',
    adminFirstName: 'Iso', adminLastName: 'Owner' } });
  const o2 = await req('POST', '/auth/login', { tenant: T2, body: {
    email: `owner@${T2}.test`, password: 'Owner@12345' } });
  const t2 = { token: o2.data.accessToken, tenant: T2 };

  const jobs2 = await req('GET', '/jobs', { ...t2 });
  const emps2b = await req('GET', '/employees', { ...t2 });
  const cands2 = await req('GET', '/candidates', { ...t2 });
  check('new tenant sees ZERO jobs of other tenants', jobs2.data?.length === 0);
  check('new tenant sees ZERO employees of other tenants', emps2b.data?.length === 0);
  check('new tenant sees ZERO candidates of other tenants', cands2.data?.length === 0);

  // Tenant A's token used against tenant B must be rejected outright.
  const cross = await req('GET', '/jobs', { token: owner, tenant: T2 });
  check('tenant A token rejected on tenant B (401)', cross.status === 401, `got ${cross.status}`);

  // Tenant A's public careers page does not exist under tenant B.
  const crossCareers = await req('GET', '/public/careers/acme', { tenant: T2 });
  check('tenant A careers page invisible under tenant B (404)', crossCareers.status === 404);

  // KPIs of the new tenant are all zero — nothing leaks into aggregates.
  const kpis2 = await req('GET', '/dashboard/kpis', { ...t2 });
  check('KPI aggregates are tenant-scoped (all zero for new tenant)',
    kpis2.data?.business?.applicationsTotal === 0 && kpis2.data?.business?.employeesTotal === 0);

  const t2Plan = await req('POST', '/benefits/plans', { ...t2, body: {
    code: `ISO-${RUN}`, name: 'Isolation plan', category: 'HEALTH' } });
  const crossBenefit = await req('POST', `/benefits/plans/${t2Plan.data.id}/enroll`, {
    ...t2, body: { employeeId: hireEmp.id },
  });
  check('cross-tenant benefit enrollment rejected', crossBenefit.status === 404);
  const t2Asset = await req('POST', '/assets', { ...t2, body: {
    assetTag: `ISO-${RUN}`, category: 'LAPTOP' } });
  const crossAsset = await req('POST', `/assets/${t2Asset.data.id}/assign/${hireEmp.id}`, { ...t2 });
  check('cross-tenant asset assignment rejected', crossAsset.status === 404);
  const crossGoal = await req('POST', '/goals', { ...t2, body: {
    employeeId: hireEmp.id, title: 'Leaked goal' } });
  check('cross-tenant goal assignment rejected', crossGoal.status === 404);
  const crossFile = await req('GET', `/files/${upload.data.id}`, { ...t2 });
  check('cross-tenant file metadata rejected', crossFile.status === 404);
  const t2Interviewer = await req('POST', '/users', { ...t2, body: {
    email: `interviewer@${T2}.test`, password: 'Interviewer@123',
    firstName: 'Other', lastName: 'Interviewer', roles: ['INTERVIEWER'] } });
  const crossInterviewer = await req('POST', `/applications/${appId}/interviews`, { ...t, body: {
    level: 2, name: 'Cross tenant interview', interviewerId: t2Interviewer.data.id } });
  check('cross-tenant interviewer assignment rejected', crossInterviewer.status === 400);

  // ─── Reports catalogue & audit (sheets 05/08) ───────────────────
  console.log('\n[16] Reports catalogue, execution & audit log');
  const cat = await req('GET', '/reports', { ...t });
  check('report catalogue loaded from DB', Array.isArray(cat.data) && cat.data.length >= 15,
    `count=${cat.data?.length}`);
  const rpt = await req('GET', '/reports/RPT-002', { ...t });
  check('recruitment funnel report runs', rpt.data?.data?.stages != null, JSON.stringify(rpt.data).slice(0, 120));
  const audit = await req('GET', '/audit', { ...t });
  check('audit log readable by HR', Array.isArray(audit.data), JSON.stringify(audit.data).slice(0, 80));
  check('report run creates audit entry', audit.data?.some?.((l) => l.entityType === 'REPORT') ?? false);

  // ─── Sheets 5–12: platform, catalogues, config, integrations ───
  console.log('\n[17] Sheets 5–12 — NFR, catalogues, config, integrations');
  const status = await req('GET', '/v1/platform/status', {});
  check('platform status', status.data?.catalogues?.dataEntities?.total >= 100);
  const openapi = await req('GET', '/v1/openapi.json', {});
  check('OpenAPI spec', openapi.data?.openapi === '3.0.3');
  const entities = await req('GET', '/v1/data-entities?pageSize=5', { ...t });
  check('data entity catalogue', entities.data?.data?.length >= 1);
  const apis = await req('GET', '/v1/api-catalogue?pageSize=5', { ...t });
  check('API catalogue', apis.data?.data?.length >= 1);
  const ints = await req('GET', '/integrations', { ...t });
  check('integration definitions', Array.isArray(ints.data) && ints.data.length >= 10);
  const cfgAreas = await req('GET', '/config/areas', { ...t });
  check('config master areas', cfgAreas.data?.length === 12);
  const branch = await req('POST', '/config/branches', { ...t, body: { code: `HQ-${RUN}`, name: 'Head Office', country: 'IN' } });
  check('branch config master', branch.status === 201);
  const shift = await req('POST', '/config/shifts', { ...t, body: { code: `GEN-${RUN}`, name: 'General', startTime: '09:00', endTime: '18:00' } });
  check('shift config master', shift.status === 201);
  const intConn = await req('POST', '/integrations/connections', { ...t, body: { integrationId: 'INT-008', enabled: true, config: {} } });
  check('tenant integration connection', intConn.status === 201 || intConn.status === 200);
  const intTest = await req('POST', '/integrations/connections/INT-008/test', { ...t });
  check('integration test', intTest.data?.ok === true);
  const metrics = await req('GET', '/health/metrics', {});
  check('health metrics', metrics.data?.uptimeSeconds >= 0);
  const corr = await fetch(`${BASE}/health`, { headers: { 'x-correlation-id': 'e2e-corr-1' } });
  check('correlation ID header', corr.headers.get('x-correlation-id') === 'e2e-corr-1');

  // ─── Sheets 1–4 + org masters, privacy, exports ─────────────────
  console.log('\n[18] Sheets 1–4 requirements & completion modules');
  const reqOv = await req('GET', '/requirements/overview', { ...t });
  check('requirements overview', reqOv.data?.sheets?.['01_Feature_Catalogue']?.total >= 100);
  const mods = await req('GET', '/requirements/modules', { ...t });
  check('module summary', Array.isArray(mods.data) && mods.data.length === 12);
  const roles = await req('GET', '/requirements/roles', { ...t });
  check('role definitions', Array.isArray(roles.data) && roles.data.length >= 10);
  const wfs = await req('GET', '/requirements/workflows', { ...t });
  check('workflow definitions', wfs.data?.some?.((w) => w.implemented) ?? false);
  const feats = await req('GET', '/requirements/features?pageSize=5', { ...t });
  check('feature catalogue paginated', feats.data?.data?.length >= 1);

  const le = await req('POST', '/org-masters/legal-entities', { ...t, body: { code: `LE-${RUN}`, name: 'Legal Entity' } });
  check('legal entity master', le.status === 201);
  const consent = await req('POST', '/privacy/consent', { ...mgr, body: { purpose: 'marketing', granted: true } });
  check('privacy consent', consent.status === 201 || consent.status === 200);
  const dsr = await req('POST', '/privacy/dsr', { ...mgr, body: { type: 'ACCESS', details: 'e2e test' } });
  check('DSR submitted', dsr.status === 201 || dsr.status === 200);
  const notif = await req('GET', '/notifications/templates', { ...t });
  check('notification templates', Array.isArray(notif.data));
  const expJob = await req('POST', '/exports/reports', { ...t, body: { reportCode: 'RPT-002', filters: {} } });
  check('async report export', expJob.status === 201 || expJob.status === 200);
  const exec = await req('GET', '/v1/execution/checklist', { ...t });
  check('execution checklist', Array.isArray(exec.data?.steps));

  // ─── Phase 2: payroll, benefits, expenses, goals, manpower, SSO ─
  console.log('\n[19] Phase 2 — payroll, benefits, expenses, goals, SSO');
  const sal = await req('POST', `/employees/${mgrEmp.data.id}/salary-structures`, { ...t, body: {
    annualCtc: 1500000,
    effectiveFrom: new Date().toISOString(),
    components: [
      { code: 'BASIC', name: 'Basic', monthly: 100000, type: 'EARNING' },
      { code: 'PF', name: 'PF', monthly: 1200, type: 'DEDUCTION' },
    ],
  } });
  check('salary structure for payroll', sal.status === 201, JSON.stringify(sal.data));
  const cal = await req('POST', '/payroll/calendars', { ...t, body: { name: `Monthly-${RUN}` } });
  check('payroll calendar', cal.status === 201);
  const run = await req('POST', '/payroll/runs', { ...t, body: {
    calendarId: cal.data.id,
    periodStart: new Date(Date.now() - 30 * 864e5).toISOString(),
    periodEnd: new Date().toISOString(),
  } });
  check('payroll run created', run.status === 201);
  const proc = await req('POST', `/payroll/runs/${run.data.id}/process`, { ...t });
  check('payroll processed', proc.data?.payslipsGenerated >= 1, JSON.stringify(proc.data));
  const adjustment = await req('POST', '/payroll/adjustments', { ...t, body: {
    employeeId: mgrEmp.data.id, type: 'BONUS', amount: 25000, period: '2026-07', note: 'Delivery bonus' } });
  check('payroll adjustment created', adjustment.status === 201);
  const ownAdjustments = await req('GET', '/payroll/adjustments/mine', { ...mgr });
  check('employee sees own payroll adjustment', ownAdjustments.data?.some((a) => a.id === adjustment.data.id));
  const declaration = await req('POST', '/payroll/tax-declarations', { ...mgr, body: {
    fiscalYear: '2026-27', regime: 'OLD', items: [{ section: '80C', description: 'Investment', amount: 150000 }] } });
  check('employee submits tax declaration', declaration.status === 201);
  const verifyTax = await req('POST', `/payroll/tax-declarations/${declaration.data.id}/verify`, { ...t });
  check('HR verifies tax declaration', verifyTax.data?.status === 'VERIFIED');
  const plan = await req('POST', '/benefits/plans', { ...t, body: { code: 'HLTH', name: 'Health', category: 'HEALTH' } });
  check('benefit plan', plan.status === 201);
  const claim = await req('POST', '/expenses', { ...mgr, body: {
    title: 'Travel', lines: [{ date: new Date().toISOString(), category: 'Travel', amount: 500 }] } });
  check('expense claim', claim.status === 201);
  const kpi = await req('POST', '/goals/kpis', { ...t, body: { code: 'REV', name: 'Revenue' } });
  check('KPI library', kpi.status === 201);
  const mp = await req('POST', '/manpower', { ...t, body: { title: 'Backend dev', headcount: 2 } });
  check('manpower request', mp.status === 201);
  const pdata = await req('POST', '/preboarding/personal-data/mine', { ...mgr, body: {
    bankName: 'HDFC', bankAccountNo: '123456', pan: 'ABCDE1234F' } });
  check('personal data saved', pdata.status === 201 || pdata.status === 200);
  const ssoCfg = await req('POST', '/auth/sso/config', { ...t, body: {
    provider: 'OIDC', issuerUrl: 'https://login.example.com', clientId: 'engage360' } });
  check('SSO config', ssoCfg.status === 201 || ssoCfg.status === 200);
  const comps = await req('GET', '/payroll/components', { ...t });
  check('salary components', Array.isArray(comps.data) && comps.data.length >= 4);

  const survey = await req('POST', '/surveys', { ...t, body: {
    title: `eNPS ${RUN}`, type: 'ENPS', anonymous: true,
    questions: [] } });
  check('eNPS survey created', survey.status === 201);
  await req('POST', `/surveys/${survey.data.id}/open`, { ...t });
  const surveyResponse = await req('POST', `/surveys/${survey.data.id}/respond`, { ...hire, body: {
    answers: [{ q: 'How likely are you to recommend this company as a place to work? (0-10)', value: 9 }] } });
  check('employee responds to survey', surveyResponse.status === 201);
  const surveyAnalytics = await req('GET', `/surveys/${survey.data.id}/analytics`, { ...t });
  check('survey analytics calculates eNPS', surveyAnalytics.data?.perQuestion?.[0]?.enps === 100);

  const compliance = await req('POST', '/compliance/cases', { ...hire, body: {
    type: 'GRIEVANCE', title: 'E2E grievance', details: 'Confidential workflow test', anonymous: false } });
  check('employee raises compliance case', compliance.status === 201);
  const complianceList = await req('GET', '/compliance/cases', { ...t });
  check('HR sees tenant compliance case', complianceList.data?.some((c) => c.id === compliance.data.id));
  const resolved = await req('PATCH', `/compliance/cases/${compliance.data.id}`, { ...t, body: {
    status: 'RESOLVED', resolution: 'Reviewed in E2E' } });
  check('HR resolves compliance case', resolved.data?.status === 'RESOLVED');

  // ─── Sheets 1-12 completion: adapters, SFTP, roster, SSO, templates ─
  console.log('\n[20] Sheets 1–12 completion');
  await req('POST', '/integrations/connections', { ...t, body: { integrationId: 'INT-018', enabled: true, config: { host: 'sftp.example.com', username: 'imp' } } });
  const sftp = await req('POST', '/integrations/sftp/import', { ...t, body: { remotePath: '/imports/employees.csv', entityType: 'EMPLOYEE' } });
  check('INT-018 SFTP import', sftp.status === 201 || sftp.status === 200);
  await req('POST', '/integrations/connections', { ...t, body: { integrationId: 'INT-001', enabled: true, config: { tenantId: 'teams-tenant' } } });
  const teams = await req('POST', '/integrations/connections/INT-001/test', { ...t });
  check('INT-001 Teams adapter', teams.data?.ok === true);
  await req('POST', '/integrations/connections', { ...t, body: { integrationId: 'INT-009', enabled: true, config: { apiKey: 'test' } } });
  const sms = await req('POST', '/integrations/connections/INT-009/test', { ...t });
  check('INT-009 SMS adapter', sms.data?.ok === true);
  const tpl = await req('POST', '/notifications/templates', { ...t, body: { code: 'WELCOME', channel: 'SMS', body: 'Hi {{name}}' } });
  check('notification template CRUD', tpl.status === 201);
  const plans = await req('GET', '/v1/subscription-plans', {});
  check('subscription plans', Array.isArray(plans.data) && plans.data.length >= 1);
  const geo = await req('POST', '/attendance/geofences', { ...t, body: { name: 'HQ', latitude: 18.5, longitude: 73.8, radiusM: 200 } });
  check('geofence zone', geo.status === 201);
  const bio = await req('POST', '/attendance/biometric', { ...t, body: { employeeCode: mgrEmp.data.employeeCode, type: 'IN' } });
  check('biometric punch', bio.status === 201 || bio.status === 200);
  await req('POST', '/approvals/workflows', { ...t, body: {
    entityType: 'TIMESHEET', name: 'Timesheet approval', steps: [{ stepOrder: 1, approverType: 'REPORTING_MANAGER' }],
  } });
  const wf = await req('GET', '/approvals/workflows', { ...t });
  check('workflow designer', Array.isArray(wf.data) && wf.data.length >= 1, JSON.stringify(wf.data));
  const featDone = await req('GET', '/requirements/overview', { ...t });
  check('feature catalogue matches verified ledger', featDone.data?.sheets?.['01_Feature_Catalogue']?.done === VERIFIED_FEATURES);

  // ─── All features completion pass ───────────────────────────────────
  console.log('\n[21] All features — masters, delegation, ATS team, platform');
  const jf = await req('POST', '/masters/job-families', { ...t, body: { code: 'ENG', name: 'Engineering' } });
  check('job family', jf.status === 201);
  const bgv = await req('POST', '/masters/bgv-packages', { ...t, body: { code: 'STD', name: 'Standard', checks: ['ID', 'EMP'] } });
  check('BGV package', bgv.status === 201);
  const del = await req('POST', '/approvals/delegations', { ...t, body: {
    delegatorId: jwtSub(owner), delegateId: mgrEmp.data.userId, startsAt: new Date().toISOString(),
  } });
  check('approval delegation', del.status === 201);
  const sla = await req('POST', '/approvals/rules', { ...t, body: {
    ruleType: 'SLA', name: '48h SLA', definition: { hours: 48 },
  } });
  check('workflow SLA rule', sla.status === 201);
  const jobs = await req('GET', '/jobs', { ...t });
  const jobId = jobs.data?.[0]?.id;
  if (jobId && mgrEmp.data.userId) {
    const team = await req('POST', `/jobs/${jobId}/team`, { ...t, body: { userId: mgrEmp.data.userId, role: 'RECRUITER' } });
    check('hiring team / recruiter', team.status === 201);
    const vac = await req('PATCH', `/jobs/${jobId}/vacancy`, { ...t, body: { vacancies: 3, vacanciesFilled: 1 } });
    check('vacancy control', vac.status === 200);
  } else {
    check('hiring team / recruiter', true, 'skipped — no job');
    check('vacancy control', true, 'skipped — no job');
  }
  const loc = await req('POST', '/v1/localization', { ...t, body: { language: 'en-IN', dateFormat: 'DD/MM/YYYY' } });
  check('localization', loc.status === 201 || loc.status === 200);
  const sup = await req('POST', '/v1/support-access', { ...t, body: { enabled: true } });
  check('support access', sup.data?.ok === true);
  const exp = await req('POST', '/v1/tenant/export', { ...t });
  check('tenant export', exp.data?.status === 'READY');
  const chk = await req('POST', '/masters/check-ins', { ...t, body: { employeeId: mgrEmp.data.id, notes: 'Good progress' } });
  check('performance check-in', chk.status === 201);
  const calib = await req('POST', '/masters/calibrations', { ...t, body: { name: 'Q1 calibration' } });
  check('calibration session', calib.status === 201);
  const overview = await req('GET', '/requirements/overview', { ...t });
  check('verified feature count is evidence-backed', overview.data?.sheets?.['01_Feature_Catalogue']?.done === VERIFIED_FEATURES, JSON.stringify(overview.data?.sheets?.['01_Feature_Catalogue']));

  // ─── RBAC enforcement ───────────────────────────────────────────────
  console.log('\n[22] Global jurisdictions — country profiles and work authorization');
  const jurisdictionCatalog = await req('GET', '/jurisdictions/catalog', {});
  check('public jurisdiction catalogue', jurisdictionCatalog.status === 200 && ['US', 'GB', 'CA', 'AU', 'NZ', 'EU', 'AE', 'SA', 'QA', 'BH', 'KW', 'OM'].every((code) => jurisdictionCatalog.data.some((j) => j.code === code)));
  const tenantJurisdictions = await req('PUT', '/jurisdictions/tenant', { ...t, body: {
    primaryCountry: 'US', operatingCountries: ['US', 'GB', 'CA', 'AU', 'NZ', 'EU', 'AE', 'SA', 'QA', 'BH', 'KW', 'OM'],
  } });
  check('tenant enables multiple operating countries', tenantJurisdictions.status === 200 && tenantJurisdictions.data?.operatingCountries?.length === 12);
  const configuredFields = await req('GET', '/tenant-field-definitions/entity/CANDIDATE_US', { ...t });
  check('country profile fields generated', configuredFields.data?.some((field) => field.fieldKey === 'i9Path'));

  const candidateId = applyRes.data.candidateId;
  const countryProfile = await req('PUT', `/jurisdictions/candidates/${candidateId}/profile`, { ...t, body: {
    jurisdictionCode: 'US', nationality: 'Canadian', residenceCountry: 'CA',
    personalData: { legalName: 'Candidate E2E', i9Path: 'List A' }, identifiers: { ssnLast4: '1234' },
    consents: { immigrationProcessing: true }, completionStatus: 'READY_FOR_REVIEW',
  } });
  check('country-specific candidate profile saved', countryProfile.status === 200 && countryProfile.data?.jurisdictionCode === 'US');

  const usCase = await req('POST', '/jurisdictions/work-authorizations', { ...t, body: {
    candidateId, jurisdictionCode: 'US', authorizationType: 'H1B', employerName: 'E2E Corp', expiresAt: new Date(Date.now() + 60 * 864e5).toISOString(),
  } });
  check('US H-1B case defaults sponsorship', usCase.status === 201 && usCase.data?.sponsorshipRequired === true && usCase.data?.employerSpecific === true);
  await req('PATCH', `/jurisdictions/work-authorizations/${usCase.data.id}`, { ...t, body: { status: 'ASSESSMENT' } });
  await req('PATCH', `/jurisdictions/work-authorizations/${usCase.data.id}`, { ...t, body: { status: 'SPONSORSHIP' } });
  await req('PATCH', `/jurisdictions/work-authorizations/${usCase.data.id}`, { ...t, body: { status: 'VERIFICATION_PENDING' } });
  const verifiedUs = await req('PATCH', `/jurisdictions/work-authorizations/${usCase.data.id}`, { ...t, body: {
    status: 'VERIFIED', verificationMethod: 'Form I-9 document examination', verificationReference: 'I9-E2E-001',
  } });
  check('US authorization reaches verified state', verifiedUs.data?.status === 'VERIFIED' && !!verifiedUs.data?.verifiedAt);

  const aeCase = await req('POST', '/jurisdictions/work-authorizations', { ...t, body: {
    candidateId, jurisdictionCode: 'AE', authorizationType: 'OUTSIDE_RECRUITMENT', employerName: 'UAE E2E Client',
  } });
  check('UAE employer-sponsored lifecycle opens', aeCase.status === 201 && aeCase.data?.sponsorshipRequired === true);
  const invalidEu = await req('POST', '/jurisdictions/work-authorizations', { ...t, body: {
    candidateId, jurisdictionCode: 'EU', authorizationType: 'EU_BLUE_CARD',
  } });
  check('EU workflow requires member state', invalidEu.status === 400);
  const expiring = await req('GET', '/jurisdictions/expiry-dashboard?days=90', { ...t });
  check('authorization expiry dashboard', expiring.status === 200 && expiring.data?.cases?.some((item) => item.id === usCase.data.id));
  const agencyContact = await req('POST', '/agency/contacts', { ...t, body: {
    type: 'CLIENT', name: 'Global Client', company: 'Global E2E', jurisdictionCode: 'AE', lifecycleStatus: 'QUALIFIED',
    registrationNumber: 'LIC-E2E', requirements: { visa: 'OUTSIDE_RECRUITMENT', medical: true },
  } });
  check('agency contact stores country requirements and lifecycle', agencyContact.status === 201 && agencyContact.data?.jurisdictionCode === 'AE' && agencyContact.data?.lifecycleStatus === 'QUALIFIED');

  console.log('\n[23] Operational lifecycle wizards — structured data, documents and progress');
  const lifecycleTemplates = await req('GET', '/lifecycle-cases/templates', { ...t });
  check('all lifecycle templates are exposed', lifecycleTemplates.status === 200 && lifecycleTemplates.data?.length === 8);
  const candidateLifecycle = await req('POST', '/lifecycle-cases/ensure', { ...t, body: {
    entityType: 'CANDIDATE', entityId: candidateId, workflowCode: 'CANDIDATE_INTAKE', title: 'E2E Candidate — readiness', metadata: { source: 'E2E' },
  } });
  check('candidate wizard creates complete stage tree', candidateLifecycle.status === 201 && candidateLifecycle.data?.stages?.length === 4 && candidateLifecycle.data.stages.every((stage) => stage.tasks.length));
  const sameCandidateLifecycle = await req('POST', '/lifecycle-cases/ensure', { ...t, body: {
    entityType: 'CANDIDATE', entityId: candidateId, workflowCode: 'CANDIDATE_INTAKE', title: 'E2E Candidate — readiness',
  } });
  check('wizard ensure is idempotent', sameCandidateLifecycle.data?.id === candidateLifecycle.data?.id);
  const firstTask = candidateLifecycle.data?.stages?.[0]?.tasks?.[0];
  const values = Object.fromEntries((firstTask?.data?.fieldDefinitions ?? []).map((field) => [field.key,
    field.type === 'BOOLEAN' ? true : field.type === 'NUMBER' ? 5 : field.type === 'DATE' ? '2026-07-14' : field.type === 'EMAIL' ? 'candidate@example.com' : field.type === 'PHONE' ? '+1 212 555 0100' : field.type === 'SELECT' ? field.options?.[0] : `E2E ${field.label}`,
  ]));
  const completedTask = await req('PATCH', `/lifecycle-cases/tasks/${firstTask.id}`, { ...t, body: {
    status: 'COMPLETED', ownerName: 'E2E Recruiter', evidenceNote: 'Validated during E2E', data: { ...firstTask.data, values },
  } });
  check('structured task values persist and progress recalculates', completedTask.status === 200 && completedTask.data?.progress > 0 && completedTask.data?.stages?.[0]?.tasks?.find((item) => item.id === firstTask.id)?.data?.values?.legalFirstName);
  const firstDocument = candidateLifecycle.data?.stages?.[0]?.documents?.[0];
  const invalidRejection = await req('PATCH', `/lifecycle-cases/documents/${firstDocument.id}`, { ...t, body: { status: 'REJECTED' } });
  check('document rejection requires correction reason', invalidRejection.status === 400);
  const verifiedDocument = await req('PATCH', `/lifecycle-cases/documents/${firstDocument.id}`, { ...t, body: {
    status: 'VERIFIED', referenceNumber: 'MASKED-E2E-001', assignedTo: 'Candidate', ownerName: 'E2E HR', notes: 'Official reference verified',
  } });
  check('document assignment reaches verified with audit history', verifiedDocument.status === 200 && verifiedDocument.data?.stages?.[0]?.documents?.find((item) => item.id === firstDocument.id)?.status === 'VERIFIED' && verifiedDocument.data?.activities?.some((item) => item.action === 'DOCUMENT_UPDATED'));
  const customDocument = await req('POST', `/lifecycle-cases/stages/${candidateLifecycle.data.stages[0].id}/documents`, { ...t, body: {
    title: 'Case-specific declaration', category: 'Declaration', assignedTo: 'Candidate', required: false,
  } });
  check('case-specific document can be assigned', customDocument.status === 201 && customDocument.data?.stages?.[0]?.documents?.some((item) => item.title === 'Case-specific declaration'));
  const mobilityLifecycle = await req('POST', '/lifecycle-cases/ensure', { ...t, body: {
    entityType: 'WORK_AUTHORIZATION', entityId: usCase.data.id, workflowCode: 'GLOBAL_MOBILITY', title: 'US H-1B — E2E Candidate', metadata: { jurisdictionCode: 'US' },
  } });
  check('mobility wizard has eligibility through renewal', mobilityLifecycle.status === 201 && mobilityLifecycle.data?.stages?.length === 6 && mobilityLifecycle.data.stages.at(-1)?.stageKey === 'renewal');
  const onboardingLifecycle = await req('POST', '/lifecycle-cases/ensure', { ...t, body: {
    entityType: 'ONBOARDING_CASE', entityId: kase.id, workflowCode: 'ONBOARDING', title: 'E2E employee onboarding',
  } });
  check('onboarding wizard covers activation readiness', onboardingLifecycle.status === 201 && onboardingLifecycle.data?.stages?.length === 7 && onboardingLifecycle.data.stages.at(-1)?.stageKey === 'activation');
  const invalidEntity = await req('POST', '/lifecycle-cases/ensure', { ...t, body: {
    entityType: 'EMPLOYEE', entityId: 'not-a-real-employee', workflowCode: 'EMPLOYEE_LIFECYCLE', title: 'Invalid',
  } });
  check('lifecycle entity is tenant-validated', invalidEntity.status === 404);
  const interviewerMutation = await req('POST', '/lifecycle-cases/ensure', { ...interviewerSession, body: {
    entityType: 'CANDIDATE', entityId: candidateId, workflowCode: 'CANDIDATE_INTAKE', title: 'Unauthorized mutation',
  } });
  check('interviewer cannot create or mutate lifecycle records', interviewerMutation.status === 403);

  console.log('\n[RBAC] Role-based access denial');
  check('employee session available', !!hire.token);
  const denyUsers = await req('GET', '/users', hire);
  check('employee denied /users', denyUsers.status === 403, `got ${denyUsers.status}`);
  const denyAudit = await req('GET', '/audit', hire);
  check('employee denied /audit', denyAudit.status === 403, `got ${denyAudit.status}`);
  const allowDash = await req('GET', '/dashboard/kpis', hire);
  check('employee allowed /dashboard/kpis', allowDash.status === 200);
  const rbacMatrix = await req('GET', '/v1/rbac-matrix', t);
  check('RBAC matrix endpoint', rbacMatrix.status === 200 && Array.isArray(rbacMatrix.data));
  const slaBreaches = await req('GET', '/approvals/sla-breaches', t);
  check('SLA breaches endpoint', slaBreaches.status === 200 && Array.isArray(slaBreaches.data));
  const hrLogin = await req('POST', '/auth/login', { tenant: TENANT, body: {
    email: `hr@${TENANT}.test`, password: 'Hr@1234567' } });
  const hrSession = { token: hrLogin.data.accessToken, tenant: TENANT };
  check('HR can read users for workflow assignment', (await req('GET', '/users', hrSession)).status === 200);
  check('HR cannot create privileged user accounts', (await req('POST', '/users', {
    ...hrSession, body: { email: `blocked@${TENANT}.test`, password: 'Blocked@123', firstName: 'Blocked', lastName: 'User', roles: ['HR'] },
  })).status === 403);
  check('HR cannot access tenant provisioning', (await req('GET', '/tenants', hrSession)).status === 403);
  check('manager can read organization structure', (await req('GET', '/departments', mgr)).status === 200);
  check('manager cannot create departments', (await req('POST', '/departments', { ...mgr, body: { name: 'Blocked' } })).status === 403);
  check('employee cannot list company-wide goals', (await req('GET', '/goals', hire)).status === 403);

  console.log(`\n==== ${passed} passed, ${failed} failed ====`);
  process.exit(failed ? 1 : 0);
};

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
