import { strict as assert } from 'node:assert';
import { BadRequestException } from '@nestjs/common';
import { ManpowerService } from '../src/modules/manpower/manpower.service';
import { PayrollService } from '../src/modules/payroll/payroll.service';
import { ApprovalsService } from '../src/modules/approvals/approvals.service';

async function approvedManpowerCreatesAndLinksOneJob() {
  let createdJob: any;
  let updatedRequest: any;
  const request = {
    id: 'req-1', tenantId: 'tenant-a', status: 'SUBMITTED', title: 'Platform Engineer',
    description: 'Build and operate the platform', headcount: 2, budget: 240000,
    location: 'Remote', employmentType: 'FULL_TIME', minExperience: 3,
    maxExperience: 7, skills: ['TypeScript', 'PostgreSQL'],
  };
  const tx = {
    job: {
      create: async (args: any) => {
        createdJob = args.data;
        return { id: 'job-1' };
      },
    },
    manpowerRequest: {
      update: async (args: any) => {
        updatedRequest = args;
        return { ...request, ...args.data };
      },
    },
  };
  const prisma = {
    manpowerRequest: { findFirst: async () => request },
    $transaction: async (callback: any) => callback(tx),
  };
  const service = new ManpowerService(prisma as any);

  await service.approve('tenant-a', 'req-1', 'approver-1');

  assert.equal(createdJob.title, request.title);
  assert.equal(createdJob.vacancies, 2);
  assert.equal(createdJob.location, 'Remote');
  assert.equal(createdJob.skills.create.length, 2);
  assert.deepEqual(updatedRequest, {
    where: { id: 'req-1' },
    data: { status: 'APPROVED', approvedBy: 'approver-1', jobId: 'job-1' },
  });
}

async function manpowerRejectRequiresSubmittedState() {
  const prisma = {
    manpowerRequest: { findFirst: async () => ({ id: 'req-1', status: 'DRAFT' }) },
  };
  const service = new ManpowerService(prisma as any);
  await assert.rejects(() => service.reject('tenant-a', 'req-1'), BadRequestException);
}

async function payrollRejectsOverlappingPeriods() {
  const prisma = {
    payrollCalendar: { findFirst: async () => ({ id: 'calendar-1' }) },
    payrollRun: {
      findFirst: async () => ({ id: 'existing-run' }),
      create: async () => { throw new Error('create must not run'); },
    },
  };
  const service = new PayrollService(prisma as any, {} as any);
  await assert.rejects(
    () => service.createRun('tenant-a', {
      calendarId: 'calendar-1',
      periodStart: '2026-07-01T00:00:00.000Z',
      periodEnd: '2026-07-31T00:00:00.000Z',
    }),
    BadRequestException,
  );
}

async function workflowRejectsApproverOutsideTenant() {
  const prisma = {
    users: { findFirst: async () => null },
    approvalWorkflow: { create: async () => { throw new Error('create must not run'); } },
  };
  const service = new ApprovalsService(prisma as any, {} as any);
  await assert.rejects(
    () => service.createWorkflow('tenant-a', {
      name: 'Named approval',
      entityType: 'OTHER' as any,
      steps: [{ stepOrder: 1, approverType: 'USER', approverValue: 'user-from-tenant-b' }],
    }),
    BadRequestException,
  );
}

const tests: Array<[string, () => Promise<void>]> = [
  ['manpower approval creates and links one job', approvedManpowerCreatesAndLinksOneJob],
  ['manpower rejection requires submitted state', manpowerRejectRequiresSubmittedState],
  ['payroll rejects overlapping periods', payrollRejectsOverlappingPeriods],
  ['workflow rejects approver outside tenant', workflowRejectsApproverOutsideTenant],
];

async function main() {
  let failed = 0;
  for (const [name, test] of tests) {
    try {
      await test();
      console.log(`  ok ${name}`);
    } catch (error) {
      failed++;
      console.error(`  fail ${name}`, error);
    }
  }
  console.log(`\nWorkflow integrity unit: ${tests.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
