#!/usr/bin/env node
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
  if (!candidate) {
    const resume = new FormData();
    resume.append(
      'file',
      new Blob(['Professional walkthrough resume'], { type: 'application/pdf' }),
      `${cfg.tenant}-candidate-resume.pdf`,
    );
    const resumeFile = (await call('POST', '/files', { tenant: cfg.tenant, form: resume })).data;
    const firstName = cfg.tenant === 'talentbridge' ? 'Arjun'
      : cfg.tenant === 'staffpro' ? 'Sana'
        : cfg.tenant === 'jane-recruits' ? 'Rohan' : 'Priya';
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
  if (cfg.tenant === 'acme') await ensureCompanyData(session, job, candidate);
  console.log(`Seeded ${cfg.tenant}: client, job, candidate${cfg.agency ? ', agency CRM' : ''}${cfg.staffing ? ', staffing contract' : ''}`);
}

console.log('Professional walkthrough data is ready.');
