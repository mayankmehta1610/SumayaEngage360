#!/usr/bin/env node
/**
 * Seed a realistic country-specific demo company (with ATS data) for every
 * supported jurisdiction: tenant with the right currency/timezone/operating
 * country, provisioned operating cities, a branded careers page, published
 * jobs located in real local cities, and locally-named candidates who applied
 * with resumes.
 *
 * Idempotent — tenants that already exist are kept; ATS data is only seeded
 * when the tenant has no jobs yet.
 *
 *   node scripts/seed-global-demo.mjs
 *   API_URL=https://engage360-api-qhnr.onrender.com node scripts/seed-global-demo.mjs
 *
 * All demo workspace admins share the password Demo@12345
 * (admin@<subdomain>.demo / hr@<subdomain>.demo).
 */

const API = `${process.env.API_URL ?? 'http://localhost:3000'}/api`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@engage360.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@12345';
const PASSWORD = 'Demo@12345';

// state = geo state code; city = master-city name within it (see geo.catalog.ts)
const COMPANIES = [
  {
    cc: 'IN', currency: 'INR', tz: 'Asia/Kolkata',
    name: 'Meridian Infotech', sub: 'meridian-in',
    admin: ['Aarav', 'Mehta'], hr: ['Priya', 'Iyer'],
    cities: [['MH', 'Pune'], ['KA', 'Bengaluru'], ['MH', 'Mumbai']],
    jobs: [
      { title: 'Senior Backend Engineer', city: ['MH', 'Pune'], mode: 'HYBRID', skills: ['Node.js', 'PostgreSQL', 'AWS'], exp: [5, 9] },
      { title: 'Payroll & Compliance Specialist', city: ['KA', 'Bengaluru'], mode: 'ONSITE', skills: ['Indian payroll', 'EPF/ESI', 'TDS'], exp: [3, 6] },
      { title: 'HR Business Partner', city: ['MH', 'Mumbai'], mode: 'ONSITE', skills: ['HRBP', 'Employee relations'], exp: [4, 8] },
    ],
    candidates: [
      { first: 'Ananya', last: 'Sharma', city: ['MH', 'Pune'], skills: ['Node.js', 'PostgreSQL'], years: 6, company: 'TCS', title: 'Software Engineer III' },
      { first: 'Rahul', last: 'Verma', city: ['KA', 'Bengaluru'], skills: ['Node.js', 'AWS'], years: 5, company: 'Infosys', title: 'Senior Developer' },
    ],
  },
  {
    cc: 'US', currency: 'USD', tz: 'America/New_York',
    name: 'Blue Harbor Software', sub: 'blueharbor-us',
    admin: ['Emily', 'Carter'], hr: ['Jacob', 'Nguyen'],
    cities: [['TX', 'Austin'], ['CA', 'San Francisco']],
    jobs: [
      { title: 'Staff Software Engineer', city: ['CA', 'San Francisco'], mode: 'HYBRID', skills: ['Go', 'Kubernetes'], exp: [7, 12] },
      { title: 'Product Manager', city: ['TX', 'Austin'], mode: 'ONSITE', skills: ['Roadmapping', 'B2B SaaS'], exp: [4, 8] },
      { title: 'Customer Success Lead', city: ['TX', 'Austin'], mode: 'REMOTE', skills: ['CS', 'Onboarding'], exp: [3, 6] },
    ],
    candidates: [
      { first: 'Michael', last: 'Brooks', city: ['CA', 'San Jose'], skills: ['Go', 'Kubernetes'], years: 8, company: 'Stripe', title: 'Senior SWE' },
      { first: 'Sofia', last: 'Ramirez', city: ['TX', 'Dallas'], skills: ['Product strategy'], years: 5, company: 'Dell', title: 'PM' },
    ],
  },
  {
    cc: 'GB', currency: 'GBP', tz: 'Europe/London',
    name: 'Thistle & Crown Consulting', sub: 'thistlecrown-gb',
    admin: ['Oliver', 'Hughes'], hr: ['Amelia', 'Clarke'],
    cities: [['ENG', 'London'], ['ENG', 'Manchester']],
    jobs: [
      { title: 'Data Engineering Consultant', city: ['ENG', 'London'], mode: 'HYBRID', skills: ['Python', 'Snowflake'], exp: [4, 8] },
      { title: 'Change Management Lead', city: ['ENG', 'Manchester'], mode: 'ONSITE', skills: ['Change management'], exp: [6, 10] },
      { title: 'Junior Analyst', city: ['ENG', 'London'], mode: 'ONSITE', skills: ['Excel', 'SQL'], exp: [0, 2] },
    ],
    candidates: [
      { first: 'Harry', last: 'Whitfield', city: ['ENG', 'Leeds'], skills: ['Python', 'SQL'], years: 5, company: 'Deloitte', title: 'Consultant' },
      { first: 'Isla', last: 'MacDonald', city: ['SCT', 'Edinburgh'], skills: ['Snowflake'], years: 4, company: 'RBS', title: 'Data Engineer' },
    ],
  },
  {
    cc: 'CA', currency: 'CAD', tz: 'America/Toronto',
    name: 'Northlight Systems', sub: 'northlight-ca',
    admin: ['Liam', 'Tremblay'], hr: ['Chloe', 'Wilson'],
    cities: [['ON', 'Toronto'], ['BC', 'Vancouver']],
    jobs: [
      { title: 'Full-Stack Developer', city: ['ON', 'Toronto'], mode: 'HYBRID', skills: ['React', 'Node.js'], exp: [3, 6] },
      { title: 'DevOps Engineer', city: ['BC', 'Vancouver'], mode: 'REMOTE', skills: ['Terraform', 'AWS'], exp: [4, 8] },
      { title: 'QA Analyst', city: ['ON', 'Ottawa'], mode: 'ONSITE', skills: ['Playwright', 'API testing'], exp: [2, 5] },
    ],
    candidates: [
      { first: 'Noah', last: 'Gagnon', city: ['QC', 'Montreal'], skills: ['React', 'Node.js'], years: 4, company: 'Shopify', title: 'Developer II' },
      { first: 'Ava', last: 'Chen', city: ['BC', 'Vancouver'], skills: ['Terraform'], years: 6, company: 'Telus', title: 'Cloud Engineer' },
    ],
  },
  {
    cc: 'AU', currency: 'AUD', tz: 'Australia/Sydney',
    name: 'Wattle Digital', sub: 'wattle-au',
    admin: ['Jack', 'Robinson'], hr: ['Mia', "O'Brien"],
    cities: [['NSW', 'Sydney'], ['VIC', 'Melbourne']],
    jobs: [
      { title: 'Mobile Engineer (Flutter)', city: ['NSW', 'Sydney'], mode: 'HYBRID', skills: ['Flutter', 'Dart'], exp: [3, 7] },
      { title: 'Delivery Manager', city: ['VIC', 'Melbourne'], mode: 'ONSITE', skills: ['Agile delivery'], exp: [6, 10] },
      { title: 'UX Designer', city: ['QLD', 'Brisbane'], mode: 'REMOTE', skills: ['Figma', 'Research'], exp: [2, 6] },
    ],
    candidates: [
      { first: 'Charlotte', last: 'Nguyen', city: ['NSW', 'Sydney'], skills: ['Flutter'], years: 4, company: 'Canva', title: 'Mobile Dev' },
      { first: 'Lachlan', last: 'Murphy', city: ['VIC', 'Geelong'], skills: ['Agile delivery'], years: 8, company: 'NAB', title: 'Scrum Master' },
    ],
  },
  {
    cc: 'NZ', currency: 'NZD', tz: 'Pacific/Auckland',
    name: 'Kauri Cloudworks', sub: 'kauri-nz',
    admin: ['Sophie', 'Walker'], hr: ['George', 'Patel'],
    cities: [['AUK', 'Auckland'], ['WGN', 'Wellington']],
    jobs: [
      { title: 'Platform Engineer', city: ['AUK', 'Auckland'], mode: 'HYBRID', skills: ['Azure', 'Kubernetes'], exp: [4, 8] },
      { title: 'Service Desk Analyst', city: ['WGN', 'Wellington'], mode: 'ONSITE', skills: ['ITIL'], exp: [1, 3] },
    ],
    candidates: [
      { first: 'Oliver', last: 'Kingi', city: ['AUK', 'Auckland'], skills: ['Azure'], years: 5, company: 'Xero', title: 'SRE' },
      { first: 'Ruby', last: 'Thompson', city: ['CAN', 'Christchurch'], skills: ['ITIL'], years: 2, company: 'Spark', title: 'Support Analyst' },
    ],
  },
  {
    cc: 'AE', currency: 'AED', tz: 'Asia/Dubai',
    name: 'Falcon Gate Group', sub: 'falcongate-ae',
    admin: ['Omar', 'Al Farsi'], hr: ['Layla', 'Haddad'],
    cities: [['DU', 'Dubai'], ['AZ', 'Abu Dhabi']],
    jobs: [
      { title: 'ERP Functional Consultant', city: ['DU', 'Dubai'], mode: 'ONSITE', skills: ['SAP', 'Finance'], exp: [5, 9] },
      { title: 'Logistics Coordinator', city: ['AZ', 'Abu Dhabi'], mode: 'ONSITE', skills: ['Supply chain'], exp: [3, 6] },
      { title: 'Frontend Developer', city: ['DU', 'Dubai'], mode: 'HYBRID', skills: ['Angular', 'TypeScript'], exp: [3, 6] },
    ],
    candidates: [
      { first: 'Yusuf', last: 'Khan', city: ['DU', 'Dubai'], skills: ['SAP'], years: 7, company: 'Emaar', title: 'ERP Analyst' },
      { first: 'Fatima', last: 'Al Mansoori', city: ['SH', 'Sharjah'], skills: ['Angular'], years: 4, company: 'Etisalat', title: 'Frontend Dev' },
    ],
  },
  {
    cc: 'SA', currency: 'SAR', tz: 'Asia/Riyadh',
    name: 'Qimam Talent Co', sub: 'qimam-sa',
    admin: ['Abdullah', 'Al Qahtani'], hr: ['Noura', 'Al Harbi'],
    cities: [['01', 'Riyadh'], ['02', 'Jeddah']],
    jobs: [
      { title: 'Project Controls Engineer', city: ['01', 'Riyadh'], mode: 'ONSITE', skills: ['Primavera', 'Cost control'], exp: [5, 10] },
      { title: 'Talent Acquisition Partner', city: ['02', 'Jeddah'], mode: 'ONSITE', skills: ['Sourcing', 'Qiwa'], exp: [3, 7] },
    ],
    candidates: [
      { first: 'Salman', last: 'Al Otaibi', city: ['01', 'Riyadh'], skills: ['Primavera'], years: 6, company: 'NEOM', title: 'Planner' },
      { first: 'Reema', last: 'Al Zahrani', city: ['02', 'Jeddah'], skills: ['Sourcing'], years: 4, company: 'STC', title: 'Recruiter' },
    ],
  },
  {
    cc: 'QA', currency: 'QAR', tz: 'Asia/Qatar',
    name: 'Pearl Bay Services', sub: 'pearlbay-qa',
    admin: ['Hamad', 'Al Thani'], hr: ['Maryam', 'Fakhri'],
    cities: [['DA', 'Doha']],
    jobs: [
      { title: 'Facilities Manager', city: ['DA', 'Doha'], mode: 'ONSITE', skills: ['FM operations'], exp: [6, 10] },
      { title: 'Accountant', city: ['DA', 'Doha'], mode: 'ONSITE', skills: ['IFRS', 'ERP'], exp: [3, 6] },
    ],
    candidates: [
      { first: 'Khalid', last: 'Mansour', city: ['DA', 'Doha'], skills: ['FM operations'], years: 8, company: 'Qatari Diar', title: 'FM Lead' },
      { first: 'Aisha', last: 'Rahman', city: ['RA', 'Al Rayyan'], skills: ['IFRS'], years: 4, company: 'QNB', title: 'Accountant' },
    ],
  },
  {
    cc: 'BH', currency: 'BHD', tz: 'Asia/Bahrain',
    name: 'Manama Bridge Solutions', sub: 'manamabridge-bh',
    admin: ['Ali', 'Al Khalifa'], hr: ['Zainab', 'Husain'],
    cities: [['13', 'Manama']],
    jobs: [
      { title: 'Core Banking Analyst', city: ['13', 'Manama'], mode: 'ONSITE', skills: ['T24', 'SQL'], exp: [4, 8] },
    ],
    candidates: [
      { first: 'Hassan', last: 'Merza', city: ['13', 'Manama'], skills: ['T24'], years: 5, company: 'BBK', title: 'Banking Analyst' },
      { first: 'Mariam', last: 'Ashoor', city: ['15', 'Muharraq'], skills: ['SQL'], years: 3, company: 'Batelco', title: 'Data Analyst' },
    ],
  },
  {
    cc: 'KW', currency: 'KWD', tz: 'Asia/Kuwait',
    name: 'Gulf Anchor Trading', sub: 'gulfanchor-kw',
    admin: ['Fahad', 'Al Sabah'], hr: ['Dana', 'Al Rashid'],
    cities: [['KU', 'Kuwait City']],
    jobs: [
      { title: 'Retail Operations Manager', city: ['KU', 'Kuwait City'], mode: 'ONSITE', skills: ['Retail ops', 'P&L'], exp: [6, 10] },
    ],
    candidates: [
      { first: 'Bader', last: 'Al Mutairi', city: ['KU', 'Kuwait City'], skills: ['Retail ops'], years: 7, company: 'Alshaya', title: 'Area Manager' },
      { first: 'Sara', last: 'Al Enezi', city: ['HA', 'Salmiya'], skills: ['P&L'], years: 5, company: 'Agility', title: 'Ops Supervisor' },
    ],
  },
  {
    cc: 'OM', currency: 'OMR', tz: 'Asia/Muscat',
    name: 'Muscat Peak Technologies', sub: 'muscatpeak-om',
    admin: ['Said', 'Al Busaidi'], hr: ['Muna', 'Al Lawati'],
    cities: [['MA', 'Muscat']],
    jobs: [
      { title: 'Network Engineer', city: ['MA', 'Muscat'], mode: 'ONSITE', skills: ['Cisco', 'Networking'], exp: [3, 7] },
    ],
    candidates: [
      { first: 'Tariq', last: 'Al Habsi', city: ['MA', 'Muscat'], skills: ['Cisco'], years: 4, company: 'Omantel', title: 'Network Admin' },
      { first: 'Huda', last: 'Al Riyami', city: ['MA', 'Seeb'], skills: ['Networking'], years: 3, company: 'Ooredoo', title: 'NOC Engineer' },
    ],
  },
  {
    // EU is member-state scoped in the jurisdiction engine; the geo master has
    // no EU country, so jobs here use free-text locations.
    cc: 'EU', currency: 'EUR', tz: 'Europe/Brussels',
    name: 'Europa Talent Partners', sub: 'europa-eu',
    admin: ['Lukas', 'Weber'], hr: ['Elena', 'Rossi'],
    cities: [],
    jobs: [
      { title: 'Java Engineer', location: 'Berlin, Germany', mode: 'HYBRID', skills: ['Java', 'Spring'], exp: [4, 8] },
      { title: 'Business Analyst', location: 'Amsterdam, Netherlands', mode: 'ONSITE', skills: ['BA', 'Agile'], exp: [3, 6] },
    ],
    candidates: [
      { first: 'Katarzyna', last: 'Nowak', freeCity: 'Warsaw', country: 'Poland', skills: ['Java'], years: 5, company: 'Allegro', title: 'Java Dev' },
      { first: 'Pierre', last: 'Dubois', freeCity: 'Paris', country: 'France', skills: ['Spring'], years: 6, company: 'BNP Paribas', title: 'Backend Dev' },
    ],
  },
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

async function uploadResume(tenant, name) {
  const fd = new FormData();
  fd.append(
    'file',
    new Blob([`Resume — ${name}\nSeeded demo applicant profile.`], { type: 'text/plain' }),
    `${name.replace(/\s+/g, '-')}-resume.txt`,
  );
  const res = await fetch(`${API}/files`, {
    method: 'POST',
    headers: { 'x-tenant-id': tenant },
    body: fd,
  });
  const json = await res.json();
  if (res.status >= 400) throw new Error(`resume upload failed: ${JSON.stringify(json)}`);
  return json.id;
}

async function main() {
  let login = await call('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  if (login.status >= 400) {
    await call('POST', '/auth/register', {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, firstName: 'Platform', lastName: 'Admin' },
    });
    login = await call('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  }
  if (login.status >= 400) {
    console.error('Cannot authenticate platform admin:', login.status, login.body);
    process.exit(1);
  }
  const platformToken = login.body.accessToken;
  console.log(`✔ Platform admin authenticated against ${API}`);

  for (const c of COMPANIES) {
    const adminEmail = `admin@${c.sub}.demo`;
    const created = await call('POST', '/tenants', {
      token: platformToken,
      body: {
        name: c.name,
        subdomain: c.sub,
        tenantType: 'COMPANY',
        country: c.cc,
        operatingCountries: [c.cc],
        currency: c.currency,
        timezone: c.tz,
        adminEmail,
        adminPassword: PASSWORD,
        adminFirstName: c.admin[0],
        adminLastName: c.admin[1],
      },
    });
    if (created.status === 201 || created.status === 200) console.log(`✔ ${c.cc} tenant created: ${c.sub}`);
    else if (created.status === 409) console.log(`• ${c.cc} tenant exists: ${c.sub}`);
    else { console.error(`✘ ${c.sub}:`, created.status, created.body); continue; }

    const adminLogin = await call('POST', '/auth/login', {
      tenant: c.sub,
      body: { email: adminEmail, password: PASSWORD },
    });
    if (adminLogin.status >= 400) { console.error(`✘ login ${adminEmail}:`, adminLogin.body); continue; }
    const token = adminLogin.body.accessToken;
    const auth = { token, tenant: c.sub };

    await call('POST', '/users', {
      ...auth,
      body: { email: `hr@${c.sub}.demo`, password: PASSWORD, firstName: c.hr[0], lastName: c.hr[1], roles: ['HR'] },
    });

    // Skip ATS seeding if the tenant already has jobs (idempotency).
    const existing = await call('GET', '/jobs?page=1&pageSize=1', auth);
    const existingCount = existing.body?.meta?.total ?? (Array.isArray(existing.body) ? existing.body.length : 0);
    if (existingCount > 0) { console.log(`  • ATS data already present (${existingCount} jobs) — skipped`); continue; }

    // Geo: resolve state/city ids and provision operating cities.
    const cityId = new Map(); // "ST|City" -> id
    if (c.cc !== 'EU') {
      const states = (await call('GET', `/geo/states?country=${c.cc}`, auth)).body ?? [];
      const stateByCode = new Map(states.map((s) => [s.code, s]));
      const wanted = new Set([
        ...c.cities.map(([st, ci]) => `${st}|${ci}`),
        ...c.jobs.filter((j) => j.city).map((j) => `${j.city[0]}|${j.city[1]}`),
        ...c.candidates.filter((x) => x.city).map((x) => `${x.city[0]}|${x.city[1]}`),
      ]);
      const byState = new Map();
      for (const key of wanted) {
        const [st] = key.split('|');
        if (!byState.has(st)) byState.set(st, null);
      }
      for (const st of byState.keys()) {
        const state = stateByCode.get(st);
        if (!state) continue;
        const cities = (await call('GET', `/geo/cities?stateId=${state.id}&all=true`, auth)).body ?? [];
        for (const city of cities) cityId.set(`${st}|${city.name}`, city.id);
      }
      for (const [st, ci] of c.cities) {
        const id = cityId.get(`${st}|${ci}`);
        if (id) await call('POST', '/geo/tenant-cities', { ...auth, body: { cityId: id } });
      }
      console.log(`  ✔ Operating cities provisioned: ${c.cities.map(([, ci]) => ci).join(', ') || '—'}`);
    }

    // Careers page (internal hiring client) + jobs.
    const client = await call('POST', '/hiring-clients', {
      ...auth,
      body: { name: c.name, slug: c.sub, description: `${c.name} — official careers`, isInternal: true },
    });
    const clientId = client.body?.id;

    let firstJobId = null;
    for (const j of c.jobs) {
      const jobRes = await call('POST', '/jobs', {
        ...auth,
        body: {
          title: j.title,
          description: `${j.title} at ${c.name}. Join our team and grow your career with us.`,
          vacancies: 2,
          hiringClientId: clientId ?? undefined,
          ...(j.city ? { cityId: cityId.get(`${j.city[0]}|${j.city[1]}`) } : {}),
          ...(j.location ? { location: j.location } : {}),
          workMode: j.mode,
          employmentType: 'FULL_TIME',
          minExperience: j.exp[0],
          maxExperience: j.exp[1],
          skills: j.skills,
          interviewPlan: [
            { level: 1, name: 'Screening' },
            { level: 2, name: 'Technical / functional' },
            { level: 3, name: 'HR & offer' },
          ],
        },
      });
      const jobId = jobRes.body?.id;
      if (!jobId) { console.error(`  ✘ job "${j.title}":`, jobRes.status, jobRes.body); continue; }
      await call('POST', `/jobs/${jobId}/publish`, auth);
      if (!firstJobId) firstJobId = jobId;
      console.log(`  ✔ Job published: ${j.title} (${jobRes.body.location})`);
    }

    // Candidates apply through the real public careers flow.
    for (const cand of c.candidates) {
      if (!firstJobId) break;
      const fullName = `${cand.first} ${cand.last}`;
      try {
        const resumeId = await uploadResume(c.sub, fullName);
        const cityKey = cand.city ? `${cand.city[0]}|${cand.city[1]}` : null;
        const apply = await call('POST', `/public/careers/jobs/${firstJobId}/apply`, {
          tenant: c.sub,
          body: {
            email: `${cand.first}.${cand.last}`.toLowerCase().replace(/[^a-z.]/g, '') + `@applicant.demo`,
            firstName: cand.first,
            lastName: cand.last,
            phone: '+100000000',
            city: cand.city ? cand.city[1] : cand.freeCity,
            country: cand.country ?? c.cc,
            ...(cityKey && cityId.get(cityKey) ? { cityId: cityId.get(cityKey) } : {}),
            linkedIn: `https://linkedin.com/in/${cand.first}-${cand.last}`.toLowerCase().replace(/\s+/g, '-'),
            professionalSummary: `${cand.title} with ${cand.years} years of experience at ${cand.company}.`,
            domainExpertise: cand.skills.slice(0, 1),
            yearsExperience: cand.years,
            skills: cand.skills,
            experiences: [{
              company: cand.company,
              title: cand.title,
              startDate: `${2026 - cand.years}-01-01`,
            }],
            education: [{ institution: 'State University', degree: 'B.Sc.', field: 'Computer Science', year: 2026 - cand.years - 4 }],
            contacts: [{ name: 'Emergency Contact', relationship: 'Family', email: 'contact@applicant.demo', phone: '+100000001' }],
            resumeFileId: resumeId,
          },
        });
        if (apply.status === 201 || apply.status === 200) console.log(`  ✔ Application: ${fullName}`);
        else console.error(`  ✘ apply ${fullName}:`, apply.status, apply.body?.message ?? apply.body);
      } catch (e) {
        console.error(`  ✘ apply ${fullName}:`, e.message);
      }
    }
  }

  console.log('\nDone. Workspace logins (all passwords Demo@12345):');
  for (const c of COMPANIES) {
    console.log(`  /${c.cc.toLowerCase()}/company  ${c.sub.padEnd(16)} admin@${c.sub}.demo`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
