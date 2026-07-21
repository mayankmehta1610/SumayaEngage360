#!/usr/bin/env node
/**
 * Make every country demo company fully testable end-to-end: create a user for
 * every tenant role, a department with a head, and a populated intranet
 * (categories, a published article, and drafts pending review so the
 * department-head and HR moderation queues have items to act on).
 *
 * Idempotent — existing users/departments/content are detected and reused.
 *
 *   node scripts/seed-full-roles.mjs
 *   API_URL=https://engage360-api-qhnr.onrender.com node scripts/seed-full-roles.mjs
 *
 * Every demo login uses the password Demo@12345.
 */

const API = `${process.env.API_URL ?? 'http://localhost:3000'}/api`;
const PASSWORD = 'Demo@12345';
const DEPT_NAME = 'Corporate Communications';

// subdomain + country-appropriate people names for the role users.
const TENANTS = [
  { sub: 'meridian-in', dh: ['Deepa', 'Nair'], emp: ['Esha', 'Kumar'], mgr: ['Vikram', 'Rao'], iv: ['Neha', 'Gupta'], bgc: ['Arjun', 'Bose'] },
  { sub: 'blueharbor-us', dh: ['Diane', 'Foster'], emp: ['Ethan', 'Cole'], mgr: ['Marcus', 'Reed'], iv: ['Nina', 'Park'], bgc: ['Aaron', 'Blake'] },
  { sub: 'thistlecrown-gb', dh: ['Daisy', 'Holt'], emp: ['Ewan', 'Price'], mgr: ['Malcolm', 'Reid'], iv: ['Nadia', 'Shah'], bgc: ['Alfie', 'Booth'] },
  { sub: 'northlight-ca', dh: ['Danielle', 'Roy'], emp: ['Evan', 'Cote'], mgr: ['Mathieu', 'Roy'], iv: ['Noemie', 'Blanc'], bgc: ['Adam', 'Boyd'] },
  { sub: 'wattle-au', dh: ['Demi', 'Hayes'], emp: ['Eli', 'Ward'], mgr: ['Mason', 'Reid'], iv: ['Nina', 'Payne'], bgc: ['Angus', 'Boyd'] },
  { sub: 'kauri-nz', dh: ['Dana', 'Ngata'], emp: ['Eli', 'Katene'], mgr: ['Manaia', 'Reti'], iv: ['Ngaio', 'Pene'], bgc: ['Ari', 'Boyd'] },
  { sub: 'falcongate-ae', dh: ['Dana', 'Saleh'], emp: ['Eiman', 'Khalil'], mgr: ['Marwan', 'Rashed'], iv: ['Nour', 'Sami'], bgc: ['Adel', 'Basha'] },
  { sub: 'qimam-sa', dh: ['Dalal', 'Saleh'], emp: ['Eyad', 'Kamel'], mgr: ['Majed', 'Rashid'], iv: ['Nada', 'Sami'], bgc: ['Anas', 'Badr'] },
  { sub: 'pearlbay-qa', dh: ['Dana', 'Ali'], emp: ['Essa', 'Karam'], mgr: ['Mubarak', 'Rashid'], iv: ['Noor', 'Salem'], bgc: ['Ahmad', 'Badr'] },
  { sub: 'manamabridge-bh', dh: ['Dina', 'Ali'], emp: ['Esa', 'Karim'], mgr: ['Mahmood', 'Rashed'], iv: ['Noor', 'Salman'], bgc: ['Ahmed', 'Basha'] },
  { sub: 'gulfanchor-kw', dh: ['Dalal', 'Ali'], emp: ['Eid', 'Kamal'], mgr: ['Meshal', 'Rashed'], iv: ['Noura', 'Salem'], bgc: ['Ali', 'Badr'] },
  { sub: 'muscatpeak-om', dh: ['Duha', 'Said'], emp: ['Eisa', 'Khalfan'], mgr: ['Maher', 'Rashid'], iv: ['Nawal', 'Salim'], bgc: ['Amir', 'Badr'] },
  { sub: 'europa-eu', dh: ['Diana', 'Wolf'], emp: ['Emil', 'Koch'], mgr: ['Matteo', 'Ricci'], iv: ['Nadia', 'Silva'], bgc: ['Andre', 'Blum'] },
];

async function call(method, path, { token, tenant, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenant ? { 'x-tenant-id': tenant } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json };
}

const listOf = (b) => (Array.isArray(b) ? b : b?.data ?? []);

async function loginTenant(sub, email) {
  const r = await call('POST', '/auth/login', { tenant: sub, body: { email, password: PASSWORD } });
  return r.status < 400 ? r.body.accessToken : null;
}

async function ensureUser(auth, users, email, roles, first, last) {
  const existing = users.find((u) => u.email === email);
  if (existing) {
    // Make sure the role set matches (idempotent role sync).
    const want = [...new Set(roles)].sort().join(',');
    const have = [...(existing.roles ?? [])].sort().join(',');
    if (want !== have) {
      await call('PATCH', `/users/${existing.id}/access`, { ...auth, body: { roles } });
    }
    return existing.id;
  }
  const r = await call('POST', '/users', {
    ...auth,
    body: { email, password: PASSWORD, firstName: first, lastName: last, roles },
  });
  return r.status < 400 ? r.body.id : null;
}

async function ensureEmployee(auth, employees, email, first, last, designation, departmentId) {
  const existing = employees.find((e) => (e.user?.email ?? '') === email);
  if (existing) return { id: existing.id, userId: existing.userId };
  const r = await call('POST', '/employees', {
    ...auth,
    body: { email, password: PASSWORD, firstName: first, lastName: last, designation, departmentId },
  });
  if (r.status >= 400) { console.error(`    ✘ employee ${email}:`, r.body?.message ?? r.body); return null; }
  return { id: r.body.id, userId: r.body.userId };
}

async function ensureCategory(auth, sub, departmentId, name, reviewerRole) {
  const tree = (await call('GET', `/intranet/departments/${departmentId}/categories`, auth)).body ?? [];
  const found = (Array.isArray(tree) ? tree : []).find((c) => c.name === name);
  if (found) return found.id;
  const r = await call('POST', '/intranet/categories', {
    ...auth,
    body: { departmentId, name, accessLevel: 'COMPANY', ...(reviewerRole ? { reviewerRole } : {}) },
  });
  return r.status < 400 ? r.body.id : null;
}

async function contentExists(auth, departmentId, title) {
  const list = (await call('GET', `/intranet/content?departmentId=${departmentId}`, auth)).body ?? [];
  return listOf(list).some((c) => c.title === title);
}

async function main() {
  console.log(`Seeding full roles + intranet against ${API}\n`);
  for (const t of TENANTS) {
    const sub = t.sub;
    const adminToken = await loginTenant(sub, `admin@${sub}.demo`);
    if (!adminToken) { console.error(`✘ ${sub}: admin login failed — run seed-global-demo.mjs first`); continue; }
    const auth = { token: adminToken, tenant: sub };
    console.log(`• ${sub}`);

    // Department (idempotent).
    const depts = listOf((await call('GET', '/departments', auth)).body);
    let deptId = depts.find((d) => d.name === DEPT_NAME)?.id;
    if (!deptId) {
      const r = await call('POST', '/departments', { ...auth, body: { name: DEPT_NAME } });
      deptId = r.body?.id;
    }
    if (!deptId) { console.error(`  ✘ department`); continue; }

    // Load current users + employees once for idempotent lookups.
    const users = listOf((await call('GET', '/users?pageSize=200', auth)).body);
    const employees = listOf((await call('GET', '/employees?pageSize=200', auth)).body);

    // Department head: employee record → DEPARTMENT_HEAD role → set as head.
    const dh = await ensureEmployee(auth, employees, `depthead@${sub}.demo`, t.dh[0], t.dh[1], 'Head of Communications', deptId);
    if (dh) {
      await call('PATCH', `/users/${dh.userId}/access`, { ...auth, body: { roles: ['EMPLOYEE', 'DEPARTMENT_HEAD'] } });
      await call('POST', `/departments/${deptId}/head/${dh.id}`, auth);
    }
    // Regular employee (contributor).
    const emp = await ensureEmployee(auth, employees, `employee@${sub}.demo`, t.emp[0], t.emp[1], 'Communications Executive', deptId);

    // Login-only role users.
    await ensureUser(auth, users, `manager@${sub}.demo`, ['MANAGER', 'EMPLOYEE'], t.mgr[0], t.mgr[1]);
    await ensureUser(auth, users, `interviewer@${sub}.demo`, ['INTERVIEWER'], t.iv[0], t.iv[1]);
    await ensureUser(auth, users, `bgc@${sub}.demo`, ['BGC_VENDOR'], t.bgc[0], t.bgc[1]);
    console.log(`  ✔ roles: admin, hr, manager, employee, department head, interviewer, bgc vendor`);

    // Intranet categories: an announcements hub (dept-head reviewed) and a
    // people/talent hub (HR reviewed).
    const announcements = await ensureCategory(auth, sub, deptId, 'Announcements', null);
    const people = await ensureCategory(auth, sub, deptId, 'Talent & People', 'HR');

    // A published welcome article (admin authors and publishes directly).
    if (announcements && !(await contentExists(auth, deptId, 'Welcome to our intranet'))) {
      const c = await call('POST', '/intranet/content', {
        ...auth,
        body: {
          departmentId: deptId, categoryId: announcements, type: 'ARTICLE',
          title: 'Welcome to our intranet', summary: 'Company news, policies and updates — all in one place.',
          body: '## Welcome!\nThis is your company intranet. Browse **department hubs**, read the latest updates, and (if you are on a team) contribute your own content for review.',
          pinned: true,
        },
      });
      if (c.body?.id) await call('POST', `/intranet/content/${c.body.id}/publish`, auth);
    }

    // Drafts submitted by the EMPLOYEE, left PENDING_REVIEW so the reviewers'
    // queues have real items: one to the department head, one to HR.
    const empToken = await loginTenant(sub, `employee@${sub}.demo`);
    if (empToken) {
      const eauth = { token: empToken, tenant: sub };
      const drafts = [
        { cat: announcements, title: 'Team offsite recap', to: 'department head' },
        { cat: people, title: 'Proposal: new referral program', to: 'HR' },
      ];
      for (const d of drafts) {
        if (!d.cat || (await contentExists(eauth, deptId, d.title))) continue;
        const c = await call('POST', '/intranet/content', {
          ...eauth,
          body: {
            departmentId: deptId, categoryId: d.cat, type: 'ARTICLE',
            title: d.title, summary: 'Submitted for review by an employee.',
            body: 'Draft content awaiting moderation before it goes live.',
          },
        });
        if (c.body?.id) await call('POST', `/intranet/content/${c.body.id}/submit`, eauth);
      }
    }
    console.log(`  ✔ intranet: 2 categories, 1 published article, 2 drafts pending review (dept head + HR)`);
  }

  console.log('\nDone. Per-tenant logins (password Demo@12345):');
  console.log('  admin@<org>.demo (TENANT_ADMIN) · hr@<org>.demo (HR) · manager@<org>.demo (MANAGER)');
  console.log('  employee@<org>.demo (EMPLOYEE) · depthead@<org>.demo (DEPARTMENT_HEAD)');
  console.log('  interviewer@<org>.demo (INTERVIEWER) · bgc@<org>.demo (BGC_VENDOR)');
}

main().catch((e) => { console.error(e); process.exit(1); });
