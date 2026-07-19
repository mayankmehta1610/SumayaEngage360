#!/usr/bin/env node
import PDFDocument from 'pdfkit';
/**
 * Seed stable, realistic records used by the professional product walkthrough.
 *
 * Idempotent: records are discovered by their stable video-demo names before
 * creation. The script can target local development or the hosted demo API.
 *
 *   node scripts/seed-video-demo.mjs
 *   API_URL=https://engage360-api-qhnr.onrender.com node scripts/seed-video-demo.mjs
 */

const API = `${process.env.API_URL ?? 'http://localhost:3000'}/api`;

const WORKSPACES = [
  {
    tenant: 'acme', email: 'admin@acme.demo', password: 'Acme@12345',
    client: 'Acme Digital Products', clientSlug: 'acme-digital-video',
    job: 'Senior Product Engineer', candidate: 'priya.product@video.demo',
  },
  {
    tenant: 'talentbridge', email: 'admin@talentbridge.demo', password: 'Talent@12345',
    client: 'Northstar Fintech', clientSlug: 'northstar-video',
    job: 'Lead Java Engineer', candidate: 'arjun.java@video.demo',
    agency: true,
  },
  {
    tenant: 'staffpro', email: 'admin@staffpro.demo', password: 'Staff@12345',
    client: 'Global Retail Systems', clientSlug: 'global-retail-video',
    job: 'Cloud Migration Consultant', candidate: 'sana.cloud@video.demo',
    staffing: true,
  },
  {
    tenant: 'jane-recruits', email: 'jane@janerecruits.demo', password: 'Jane@12345',
    client: 'BrightPath Analytics', clientSlug: 'brightpath-video',
    job: 'Senior Data Analyst', candidate: 'rohan.data@video.demo',
    agency: true,
  },
];

async function call(method, path, { token, tenant, body, form } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(!form ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenant ? { 'x-tenant-id': tenant } : {}),
    },
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok && res.status !== 409) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

function rows(payload) {
  return Array.isArray(payload) ? payload : (payload?.data ?? []);
}

function demoResumePdf(name) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 54, info: { Title: `${name} resume` } });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.fontSize(20).text(name);
    document.moveDown().fontSize(12).text('Professional summary');
    document.moveDown(0.4).fontSize(10).text('Experienced professional focused on enterprise technology, measurable delivery outcomes, stakeholder communication, and cross-functional leadership.');
    document.moveDown().fontSize(12).text('Core skills');
    document.moveDown(0.4).fontSize(10).list(['Enterprise technology', 'Digital transformation', 'Client delivery', 'Team leadership']);
    document.moveDown().fontSize(12).text('Experience');
    document.moveDown(0.4).fontSize(10).text('Senior Consultant, BluePeak Solutions - led multi-disciplinary programmes and delivery improvements.');
    document.end();
  });
}

async function uploadDemoResume(session, cfg, firstName) {
  const resume = new FormData();
  resume.append(
    'file',
    new Blob([await demoResumePdf(`${firstName} Sharma`)], { type: 'application/pdf' }),
    `${cfg.tenant}-candidate-resume-valid-v2.pdf`,
  );
  return (await call('POST', '/files', { tenant: cfg.tenant, form: resume })).data;
}

async function ensureClient(session, cfg) {
  const list = rows((await call('GET', '/hiring-clients', session)).data);
  let client = list.find((x) => x.slug === cfg.clientSlug || x.name === cfg.client);
  if (!client) {
    client = (await call('POST', '/hiring-clients', {
      ...session,
      body: {
        name: cfg.client,
        slug: cfg.clientSlug,
        description: `Strategic client account used in the ${cfg.tenant} product walkthrough.`,
        isInternal: cfg.tenant === 'acme',
      },
    })).data;
  }
  return client;
}

async function ensureJob(session, cfg, client) {
  const list = rows((await call('GET', '/jobs', session)).data);
  let job = list.find((x) => x.title === cfg.job);
  if (!job) {
    job = (await call('POST', '/jobs', {
      ...session,
      body: {
        hiringClientId: client.id,
        title: cfg.job,
        description: `Own delivery outcomes for ${cfg.client}, collaborate with stakeholders, and coach the wider team.`,
        vacancies: cfg.staffing ? 6 : 3,
        location: cfg.staffing ? 'Bengaluru / Client site' : 'Hybrid',
        employmentType: cfg.staffing ? 'Contract' : 'Full time',
        minExperience: 4,
        maxExperience: 9,
        skills: cfg.staffing
          ? ['AWS', 'Kubernetes', 'Terraform']
          : cfg.agency
            ? ['Stakeholder Management', 'SQL', 'Communication']
            : ['Angular', 'NestJS', 'PostgreSQL'],
        interviewPlan: [
          { level: 1, name: 'Capability discussion' },
          { level: 2, name: 'Business interview' },
        ],
      },
    })).data;
  }
  if (job.status !== 'PUBLISHED') {
    job = (await call('POST', `/jobs/${job.id}/publish`, session)).data;
  }
  return job;
}

async function ensureCandidate(session, cfg, job) {
  const list = rows((await call('GET', '/candidates', session)).data);
  let candidate = list.find((x) => x.email === cfg.candidate);
  const firstName = cfg.tenant === 'talentbridge' ? 'Arjun'
    : cfg.tenant === 'staffpro' ? 'Sana'
      : cfg.tenant === 'jane-recruits' ? 'Rohan' : 'Priya';
  if (!candidate) {
    const resumeFile = await uploadDemoResume(session, cfg, firstName);
    const application = await call('POST', `/public/careers/jobs/${job.id}/apply`, {
      tenant: cfg.tenant,
      body: {
        email: cfg.candidate,
        firstName,
        lastName: 'Sharma',
        phone: '9876501234',
        city: 'Bengaluru',
        country: 'India',
        linkedIn: `https://linkedin.com/in/${firstName.toLowerCase()}-video-demo`,
        professionalSummary: 'Experienced professional focused on measurable client outcomes and collaborative delivery.',
        resumeFileId: resumeFile.id,
        domainExpertise: ['Enterprise Technology', 'Digital Transformation'],
        yearsExperience: 6,
        skills: cfg.staffing ? ['AWS', 'Kubernetes', 'Terraform'] : ['SQL', 'Communication', 'Delivery'],
        experiences: [{
          company: 'BluePeak Solutions', title: 'Senior Consultant', startDate: '2021-04-01',
          description: 'Led cross-functional programmes and client delivery.',
        }],
        education: [{
          institution: 'National Institute of Technology', degree: 'B.Tech', field: 'Computer Science', year: 2018,
        }],
        contacts: [{
          name: 'Kavita Rao', relationship: 'Former Manager', email: 'kavita.rao@video.demo', phone: '9876509876',
        }],
      },
    });
    const refreshed = rows((await call('GET', '/candidates', session)).data);
    candidate = refreshed.find((x) => x.email === cfg.candidate);
    if (!candidate) {
      const app = (await call('GET', `/applications/${application.data.id}`, session)).data;
      candidate = app.candidate;
    }
  }
  const currentMeta = candidate.resumeFileId
    ? (await call('GET', `/files/${candidate.resumeFileId}`, session)).data
    : null;
  if (!currentMeta?.fileName?.endsWith('-candidate-resume-valid-v2.pdf')) {
    const replacement = await uploadDemoResume(session, cfg, firstName);
    candidate = (await call('PATCH', `/candidates/${candidate.id}`, {
      ...session,
      body: { resumeFileId: replacement.id },
    })).data;
  }
  return candidate;
}

async function ensureAgencyData(session, cfg, candidate, job) {
  const contacts = rows((await call('GET', '/agency/contacts', session)).data);
  if (!contacts.some((x) => x.email === `hiring@${cfg.clientSlug}.demo`)) {
    await call('POST', '/agency/contacts', {
      ...session,
      body: {
        type: 'HIRING_MANAGER',
        name: cfg.tenant === 'jane-recruits' ? 'Meera Iyer' : 'Vikram Malhotra',
        email: `hiring@${cfg.clientSlug}.demo`,
        phone: '9811102233',
        company: cfg.client,
        notes: 'Primary decision-maker for current priority roles.',
      },
    });
  }
  const submissions = rows((await call('GET', '/agency/submissions', session)).data);
  if (!submissions.some((x) => x.candidateId === candidate.id && x.jobId === job.id)) {
    const created = (await call('POST', '/agency/submissions', {
      ...session,
      body: {
        clientName: cfg.client,
        jobId: job.id,
        candidateId: candidate.id,
        notes: 'Profile validated, candidate interested, notice period confirmed.',
      },
    })).data;
    await call('PATCH', `/agency/submissions/${created.id}`, {
      ...session,
      body: { status: 'SUBMITTED', notes: 'Submitted with recruiter recommendation and availability.' },
    });
  }
}

async function ensureStaffingData(session, cfg, candidate) {
  const projects = rows((await call('GET', '/projects', session)).data);
  let project = projects.find((x) => x.code === 'GRS-CLOUD-01');
  if (!project) {
    project = (await call('POST', '/projects', {
      ...session,
      body: {
        name: 'Global Retail Cloud Transformation',
        code: 'GRS-CLOUD-01',
        description: 'Modernize client infrastructure and delivery operations.',
        requiredSkills: ['AWS', 'Kubernetes', 'Terraform'],
        location: 'Bengaluru / Client site',
        startDate: '2026-07-01',
        endDate: '2027-06-30',
      },
    })).data;
  }
  const contracts = rows((await call('GET', '/contracts', session)).data);
  let contract = contracts.find((x) => x.clientRef === 'GRS-MSA-2026-07');
  if (!contract) {
    contract = (await call('POST', '/contracts', {
      ...session,
      body: {
        projectId: project.id,
        clientRef: 'GRS-MSA-2026-07',
        value: 4800000,
        startDate: '2026-07-01',
        endDate: '2027-06-30',
        terms: 'Monthly billing against approved contractor timesheets.',
      },
    })).data;
  }
  const contractors = rows((await call('GET', '/contractors', session)).data);
  if (!contractors.some((x) => x.candidateId === candidate.id && x.contractId === contract.id)) {
    await call('POST', '/contractors', {
      ...session,
      body: {
        candidateId: candidate.id,
        contractId: contract.id,
        clientRef: 'GRS-MSA-2026-07',
        role: 'Cloud Migration Consultant',
        rate: 3200,
        rateType: 'DAILY',
        currency: 'INR',
        startDate: '2026-07-15',
        endDate: '2027-03-31',
        notes: 'Deployment approved; client onboarding in progress.',
      },
    });
  }
}

async function ensureUser(session, definition) {
  let users = rows((await call('GET', '/users', session)).data);
  let user = users.find((entry) => entry.email === definition.email);
  if (!user) {
    await call('POST', '/users', {
      ...session,
      body: definition,
    });
    users = rows((await call('GET', '/users', session)).data);
    user = users.find((entry) => entry.email === definition.email);
    if (!user) throw new Error(`Created user ${definition.email} was not returned by GET /users`);
  }
  const currentRoles = [...(user.roles ?? [])].sort().join(',');
  const requiredRoles = [...definition.roles].sort().join(',');
  if (currentRoles !== requiredRoles) {
    user = (await call('PATCH', `/users/${user.id}/access`, {
      ...session,
      body: { roles: definition.roles },
    })).data;
  }
  return user;
}

async function ensureRoleWorkflows(session, job, candidate) {
  const interviewer = await ensureUser(session, {
    email: 'video.interviewer@acme.demo', password: 'Acme@12345',
    firstName: 'Ethan', lastName: 'Cole', roles: ['INTERVIEWER'],
  });
  await ensureUser(session, {
    email: 'video.bgc@acme.demo', password: 'Acme@12345',
    firstName: 'Daniel', lastName: 'Reed', roles: ['BGC_VENDOR'],
  });

  const applications = rows((await call('GET', '/applications', session)).data);
  const application = applications.find((entry) =>
    entry.jobId === job.id && (entry.candidateId === candidate.id || entry.candidate?.id === candidate.id));
  if (application) {
    const interviews = rows((await call('GET', `/applications/${application.id}/interviews`, session)).data);
    if (!interviews.some((entry) => entry.interviewerId === interviewer.id)) {
      await call('POST', `/applications/${application.id}/interviews`, {
        ...session,
        body: {
          level: 1,
          name: 'Product and technical interview',
          mode: 'TEAMS',
          interviewerId: interviewer.id,
        },
      });
    }
  }
}

async function ensureCompanyData(session, job, candidate) {
  const departments = rows((await call('GET', '/departments', session)).data);
  let department = departments.find((x) => x.name === 'Product Engineering');
  if (!department) {
    department = (await call('POST', '/departments', { ...session, body: { name: 'Product Engineering' } })).data;
  }
  const employees = rows((await call('GET', '/employees', session)).data);
  const definitions = [
    { email: 'video.manager@acme.demo', password: 'Acme@12345', firstName: 'Nisha', lastName: 'Kapoor', designation: 'Engineering Manager' },
    { email: 'video.employee@acme.demo', password: 'Acme@12345', firstName: 'Dev', lastName: 'Patel', designation: 'Product Engineer' },
  ];
  for (const definition of definitions) {
    let employee = employees.find((entry) => entry.user?.email === definition.email);
    if (!employee) {
      employee = (await call('POST', '/employees', {
        ...session,
        body: { ...definition, departmentId: department.id, joinDate: '2026-04-01', location: 'Bengaluru' },
      })).data;
      await call('PATCH', `/employees/${employee.id}`, { ...session, body: { status: 'ACTIVE' } });
      await call('POST', `/employees/${employee.id}/skills`, {
        ...session,
        body: { skills: definition.designation.includes('Manager') ? ['Leadership', 'Delivery'] : ['Angular', 'NestJS', 'PostgreSQL'] },
      });
    }
  }

  const tenantUsers = rows((await call('GET', '/users', session)).data);
  const manager = tenantUsers.find((entry) => entry.email === 'video.manager@acme.demo');
  if (manager) {
    await call('PATCH', `/users/${manager.id}/access`, {
      ...session,
      body: { roles: ['EMPLOYEE', 'MANAGER', 'DEPARTMENT_HEAD'] },
    });
  }

  await ensureRoleWorkflows(session, job, candidate);

  const allEmployees = rows((await call('GET', '/employees', session)).data);
  const employeeForCheck = allEmployees.find((entry) => entry.user?.email === 'video.employee@acme.demo');
  const vendors = rows((await call('GET', '/bgc/vendors', session)).data);
  let vendor = vendors.find((entry) => entry.email === 'video.bgc@acme.demo');
  if (!vendor) {
    vendor = (await call('POST', '/bgc/vendors', {
      ...session,
      body: { name: 'ClearPath Verification Services', email: 'video.bgc@acme.demo' },
    })).data;
  }
  if (employeeForCheck) {
    await call('POST', `/bgc/employees/${employeeForCheck.id}/submit`, {
      ...session,
      body: { vendorId: vendor.id },
    });
  }
}

function demoFieldValue(field, country) {
  const key = field.key.toLowerCase();
  if (field.type === 'BOOLEAN') return true;
  if (field.type === 'DATE') return key.includes('birth') ? '1992-08-14' : '2027-12-31';
  if (field.type === 'SELECT') return field.options?.[0] ?? 'Configured';
  if (key.includes('email')) return 'mobility.compliance@acme.demo';
  if (key.includes('phone')) return '+91 98765 01234';
  if (key.includes('address') || key.includes('worksite') || key.includes('worklocation')) return 'Acme Technology Campus, Outer Ring Road, Bengaluru, Karnataka 560103';
  if (key.includes('name')) return key.includes('contact') ? 'Ananya Rao' : `Acme ${country} Legal Entity`;
  if (key.includes('country') || key.includes('nationality') || key.includes('taxresidence')) return country === 'IN' ? 'India' : country;
  if (key.includes('state') || key.includes('province') || key.includes('region')) return country === 'IN' ? 'Karnataka' : 'Primary operating region';
  if (key.includes('city')) return country === 'IN' ? 'Bengaluru' : 'Primary work city';
  if (key.includes('expiry') || key.includes('due')) return '2027-12-31';
  if (field.type === 'TEXTAREA') return `Reviewed ${country} workflow control with evidence owner, renewal calendar, retention period and escalation procedure documented.`;
  if (key.includes('hours') || key.includes('workweek')) return 'Monday to Friday, 40 hours';
  if (key.includes('frequency')) return 'Monthly';
  if (key.includes('relationship')) return 'Parent';
  if (key.includes('language')) return 'English';
  if (key.includes('evidence') || key.includes('reference') || key.includes('registration') || key.includes('number') || key.includes('code') || key.includes('id') || key.includes('pan') || key.includes('tan') || key.includes('gst') || key.includes('uan')) return `${country}-DEMO-2026-001`;
  return `Configured for ${country}`;
}

async function ensureMobilityData(session, candidate) {
  const enabled = ['IN', 'US', 'GB', 'CA', 'AU', 'NZ', 'EU', 'AE', 'SA', 'QA', 'BH', 'KW', 'OM'];
  await call('PUT', '/jurisdictions/tenant', {
    ...session,
    body: { primaryCountry: 'IN', operatingCountries: enabled },
  });
  const catalog = rows((await call('GET', '/jurisdictions/catalog', session)).data);
  const definitions = new Map(catalog.map((entry) => [entry.code, entry]));

  for (const code of enabled) {
    const definition = definitions.get(code);
    const data = {}, identifiers = {};
    for (const field of definition.employerFields) {
      (field.sensitive ? identifiers : data)[field.key] = demoFieldValue(field, code);
    }
    if (code === 'EU') data.memberState = 'DE';
    await call('PUT', '/jurisdictions/employer-profiles', {
      ...session,
      body: {
        profileName: code === 'IN' ? 'Acme India Headquarters' : `Acme ${definition.name} Operations`,
        jurisdictionCode: code,
        ...(code === 'EU' ? { memberStateCode: 'DE' } : {}),
        data,
        identifiers,
        contacts: { mobilityOwner: 'Ananya Rao', escalationEmail: 'mobility.compliance@acme.demo' },
        registrations: { reviewedAt: '2026-07-15', evidenceSet: `${code}-EMPLOYER-EVIDENCE` },
        reviewDueAt: '2027-06-30T00:00:00.000Z',
        completionStatus: 'VERIFIED',
      },
    });
  }

  const india = definitions.get('IN');
  const personalData = {}, identifiers = {};
  for (const field of india.candidateFields) {
    (field.sensitive ? identifiers : personalData)[field.key] = demoFieldValue(field, 'IN');
  }
  personalData.legalName = 'Priya Sharma';
  personalData.stateOfEmployment = 'Karnataka';
  identifiers.nationality = 'India';
  await call('PUT', `/jurisdictions/candidates/${candidate.id}/profile`, {
    ...session,
    body: {
      jurisdictionCode: 'IN', nationality: 'India', residenceCountry: 'IN',
      personalData, identifiers,
      emergencyContacts: [{ name: 'Kavita Sharma', relationship: 'Parent', phone: '+91 98765 09876' }],
      consents: { privacy: true, retention: true, capturedAt: '2026-07-15T09:30:00.000Z' },
      completionStatus: 'COMPLETE',
    },
  });

  const desiredCases = [
    { jurisdictionCode: 'IN', authorizationType: 'INDIAN_CITIZEN', employerName: 'Acme India Headquarters', expiresAt: '2035-12-31T00:00:00.000Z' },
    { jurisdictionCode: 'US', authorizationType: 'H1B', employerName: 'Acme United States Operations', expiresAt: '2026-09-30T00:00:00.000Z' },
    { jurisdictionCode: 'GB', authorizationType: 'SKILLED_WORKER', employerName: 'Acme United Kingdom Operations', expiresAt: '2027-01-31T00:00:00.000Z' },
  ];
  let cases = rows((await call('GET', '/jurisdictions/work-authorizations', session)).data);
  for (const desired of desiredCases) {
    let item = cases.find((entry) => entry.candidateId === candidate.id && entry.jurisdictionCode === desired.jurisdictionCode && entry.authorizationType === desired.authorizationType);
    if (!item) {
      item = (await call('POST', '/jurisdictions/work-authorizations', {
        ...session,
        body: { candidateId: candidate.id, ...desired, notes: 'Demo case with documented assessment, evidence and renewal ownership.' },
      })).data;
      cases.push(item);
    }
    const method = definitions.get(desired.jurisdictionCode).verificationMethods[0];
    const path = desired.jurisdictionCode === 'US'
      ? ['ASSESSMENT', 'SPONSORSHIP', 'VERIFICATION_PENDING', 'VERIFIED']
      : ['ASSESSMENT', 'VERIFICATION_PENDING', 'VERIFIED'];
    let status = item.status;
    for (const next of path) {
      if (status === next || status === 'VERIFIED') continue;
      const updated = (await call('PATCH', `/jurisdictions/work-authorizations/${item.id}`, {
        ...session,
        body: { status: next, ...(next === 'VERIFIED' ? { verificationMethod: method, verificationReference: `${desired.jurisdictionCode}-CHECK-2026-001` } : {}) },
      })).data;
      status = updated.status;
    }
  }
}

for (const cfg of WORKSPACES) {
  const login = await call('POST', '/auth/login', {
    tenant: cfg.tenant,
    body: { email: cfg.email, password: cfg.password },
  });
  const session = { token: login.data.accessToken, tenant: cfg.tenant };
  const client = await ensureClient(session, cfg);
  const job = await ensureJob(session, cfg, client);
  const candidate = await ensureCandidate(session, cfg, job);
  if (cfg.agency) await ensureAgencyData(session, cfg, candidate, job);
  if (cfg.staffing) await ensureStaffingData(session, cfg, candidate);
  if (cfg.tenant === 'acme') {
    await ensureCompanyData(session, job, candidate);
    await ensureMobilityData(session, candidate);
  }
  console.log(`Seeded ${cfg.tenant}: client, job, candidate${cfg.agency ? ', agency CRM' : ''}${cfg.staffing ? ', staffing contract' : ''}`);
}

console.log('Professional walkthrough data is ready.');
