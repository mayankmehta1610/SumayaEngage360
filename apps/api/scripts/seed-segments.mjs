#!/usr/bin/env node
/**
 * Seed demo tenants + logins for every business segment.
 *
 * Idempotent — safe to re-run; existing tenants/users are skipped.
 *
 *   node scripts/seed-segments.mjs
 *   API_URL=https://engage360-api-qhnr.onrender.com node scripts/seed-segments.mjs
 *
 * Provisioned workspaces (see docs/URLS-AND-LOGINS.md):
 *   COMPANY               acme          admin@acme.demo          Acme@12345
 *   RECRUITMENT_AGENCY    talentbridge  admin@talentbridge.demo  Talent@12345
 *   STAFFING_COMPANY      staffpro      admin@staffpro.demo      Staff@12345
 *   INDIVIDUAL_RECRUITER  jane-recruits jane@janerecruits.demo   Jane@12345
 */

const API = `${process.env.API_URL ?? 'http://localhost:3000'}/api`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@engage360.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@12345';

const TENANTS = [
  {
    name: 'Acme Corporation',
    subdomain: 'acme',
    tenantType: 'COMPANY',
    adminEmail: 'admin@acme.demo',
    adminPassword: 'Acme@12345',
    adminFirstName: 'Ava',
    adminLastName: 'Admin',
    users: [
      { email: 'hr@acme.demo', password: 'Acme@12345', firstName: 'Harper', lastName: 'Reyes', roles: ['HR'] },
      { email: 'manager@acme.demo', password: 'Acme@12345', firstName: 'Miles', lastName: 'Grant', roles: ['MANAGER', 'EMPLOYEE'] },
      { email: 'employee@acme.demo', password: 'Acme@12345', firstName: 'Emma', lastName: 'Stone', roles: ['EMPLOYEE'] },
    ],
  },
  {
    name: 'TalentBridge Recruitment',
    subdomain: 'talentbridge',
    tenantType: 'RECRUITMENT_AGENCY',
    adminEmail: 'admin@talentbridge.demo',
    adminPassword: 'Talent@12345',
    adminFirstName: 'Tara',
    adminLastName: 'Bridge',
    users: [
      { email: 'recruiter@talentbridge.demo', password: 'Talent@12345', firstName: 'Ravi', lastName: 'Kapoor', roles: ['HR'] },
    ],
  },
  {
    name: 'StaffPro Contracting',
    subdomain: 'staffpro',
    tenantType: 'STAFFING_COMPANY',
    adminEmail: 'admin@staffpro.demo',
    adminPassword: 'Staff@12345',
    adminFirstName: 'Sam',
    adminLastName: 'Prowse',
    users: [
      { email: 'ops@staffpro.demo', password: 'Staff@12345', firstName: 'Olivia', lastName: 'Nair', roles: ['HR'] },
      { email: 'manager@staffpro.demo', password: 'Staff@12345', firstName: 'Marco', lastName: 'Diaz', roles: ['MANAGER', 'EMPLOYEE'] },
    ],
  },
  {
    name: 'Jane Doe Recruiting',
    subdomain: 'jane-recruits',
    tenantType: 'INDIVIDUAL_RECRUITER',
    adminEmail: 'jane@janerecruits.demo',
    adminPassword: 'Jane@12345',
    adminFirstName: 'Jane',
    adminLastName: 'Doe',
    users: [],
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

async function main() {
  // 1. Platform admin (register bootstraps a fresh DB; 409/403 = already exists)
  let login = await call('POST', '/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (login.status !== 200 && login.status !== 201) {
    console.log('Platform admin login failed, trying bootstrap register…');
    await call('POST', '/auth/register', {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, firstName: 'Platform', lastName: 'Admin' },
    });
    login = await call('POST', '/auth/login', {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
  }
  if (login.status !== 200 && login.status !== 201) {
    console.error('Cannot authenticate platform admin:', login.status, login.body);
    process.exit(1);
  }
  const platformToken = login.body.accessToken;
  console.log(`✔ Platform admin authenticated (${ADMIN_EMAIL})`);

  for (const t of TENANTS) {
    // 2. Tenant (409 = already provisioned)
    const created = await call('POST', '/tenants', {
      token: platformToken,
      body: {
        name: t.name,
        subdomain: t.subdomain,
        tenantType: t.tenantType,
        adminEmail: t.adminEmail,
        adminPassword: t.adminPassword,
        adminFirstName: t.adminFirstName,
        adminLastName: t.adminLastName,
      },
    });
    if (created.status === 201 || created.status === 200) {
      console.log(`✔ Tenant created: ${t.subdomain} (${t.tenantType})`);
    } else if (created.status === 409) {
      console.log(`• Tenant exists:  ${t.subdomain} (${t.tenantType})`);
    } else {
      console.error(`✘ Tenant ${t.subdomain} failed:`, created.status, created.body);
      continue;
    }

    // 3. Verify admin login + create extra users
    const adminLogin = await call('POST', '/auth/login', {
      tenant: t.subdomain,
      body: { email: t.adminEmail, password: t.adminPassword },
    });
    if (adminLogin.status !== 200 && adminLogin.status !== 201) {
      console.error(`✘ ${t.subdomain} admin login failed:`, adminLogin.status, adminLogin.body);
      continue;
    }
    console.log(`  ✔ Login OK: ${t.adminEmail}`);
    const tenantToken = adminLogin.body.accessToken;

    for (const u of t.users) {
      const res = await call('POST', '/users', {
        token: tenantToken,
        tenant: t.subdomain,
        body: u,
      });
      if (res.status === 201 || res.status === 200) {
        console.log(`  ✔ User created: ${u.email} [${u.roles.join(', ')}]`);
      } else if (res.status === 409) {
        console.log(`  • User exists:  ${u.email}`);
      } else {
        console.error(`  ✘ User ${u.email} failed:`, res.status, res.body);
      }
    }
  }

  console.log('\nDone. Login URLs:');
  console.log('  Company:   /login/company    → acme          admin@acme.demo / Acme@12345');
  console.log('  Agency:    /login/agency     → talentbridge  admin@talentbridge.demo / Talent@12345');
  console.log('  Staffing:  /login/staffing   → staffpro      admin@staffpro.demo / Staff@12345');
  console.log('  Recruiter: /login/recruiter  → jane-recruits jane@janerecruits.demo / Jane@12345');
  console.log('  Platform:  /login/platform   → (no tenant)   admin@engage360.com / Admin@12345');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
