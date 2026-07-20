import { strict as assert } from 'node:assert';
import { ForbiddenException } from '@nestjs/common';
import { ApplicationsService } from '../src/modules/ats/applications.service';
import { GoalsService } from '../src/modules/goals/goals.service';

async function applicationsAreScopedToAssignedInterviewer() {
  let query: any;
  const prisma = {
    application: {
      findMany: async (args: any) => {
        query = args;
        return [];
      },
    },
  };
  const service = new ApplicationsService(
    prisma as any,
    { enabled: false } as any,
    {} as any,
    {} as any,
  );

  await service.findAll('tenant-a', undefined, undefined, 'interviewer-1');
  assert.deepEqual(query.where, {
    tenantId: 'tenant-a',
    interviews: { some: { interviewerId: 'interviewer-1' } },
  });
}

async function goalProgressRejectsUnrelatedEmployee() {
  const prisma = {
    employeeGoal: {
      findFirst: async () => ({
        employee: {
          userId: 'employee-owner',
          manager: { userId: 'actual-manager' },
        },
      }),
      update: async () => {
        throw new Error('update must not run');
      },
    },
  };
  const service = new GoalsService(prisma as any);

  await assert.rejects(
    () => service.updateProgress('tenant-a', 'goal-1', 50, 'other-user', false),
    ForbiddenException,
  );
}

async function goalOwnerCanUpdateAndProgressIsClamped() {
  let update: any;
  const prisma = {
    employeeGoal: {
      findFirst: async () => ({
        employee: { userId: 'employee-owner', manager: null },
      }),
      update: async (args: any) => {
        update = args;
        return args.data;
      },
    },
  };
  const service = new GoalsService(prisma as any);

  await service.updateProgress('tenant-a', 'goal-1', 125, 'employee-owner', false);
  assert.deepEqual(update, {
    where: { id: 'goal-1' },
    data: { progress: 100 },
  });
}

const tests: Array<[string, () => Promise<void>]> = [
  ['applications are interviewer scoped', applicationsAreScopedToAssignedInterviewer],
  ['unrelated employee cannot update goal', goalProgressRejectsUnrelatedEmployee],
  ['goal owner update clamps progress', goalOwnerCanUpdateAndProgressIsClamped],
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

  console.log(`\nAuthorization unit: ${tests.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
