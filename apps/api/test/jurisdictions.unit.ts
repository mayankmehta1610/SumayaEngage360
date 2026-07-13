import { strict as assert } from 'node:assert';
import { BadRequestException } from '@nestjs/common';
import { JURISDICTIONS, SUPPORTED_JURISDICTION_CODES } from '../src/modules/jurisdictions/jurisdiction.catalog';
import { JurisdictionsService } from '../src/modules/jurisdictions/jurisdictions.service';

async function catalogueHasRequestedMarkets() {
  for (const code of ['US', 'GB', 'CA', 'AU', 'NZ', 'EU', 'AE', 'SA', 'QA', 'BH', 'KW', 'OM']) {
    assert.ok(SUPPORTED_JURISDICTION_CODES.includes(code), `${code} missing`);
    assert.ok(JURISDICTIONS[code].candidateFields.length >= 8);
    assert.ok(JURISDICTIONS[code].lifecycle.length >= 7);
    assert.ok(JURISDICTIONS[code].officialSources.length >= 1);
  }
  assert.ok(JURISDICTIONS.US.authorizationTypes.some((item) => item.code === 'H1B'));
  assert.ok(JURISDICTIONS.AE.authorizationTypes.some((item) => item.code === 'OUTSIDE_RECRUITMENT'));
}

async function euRequiresMemberState() {
  const prisma = {
    candidate: { findFirst: async () => ({ id: 'candidate-1' }) },
    tenant: { findUnique: async () => ({ id: 'tenant-1', country: 'EU', operatingCountries: ['EU'] }) },
  };
  const service = new JurisdictionsService(prisma as any);
  await assert.rejects(() => service.createCase('tenant-1', {
    candidateId: 'candidate-1', jurisdictionCode: 'EU', authorizationType: 'EU_BLUE_CARD',
  }), BadRequestException);
}

async function authorizationDefaultsComeFromCountry() {
  let created: any;
  const prisma = {
    candidate: { findFirst: async () => ({ id: 'candidate-1' }) },
    tenant: { findUnique: async () => ({ id: 'tenant-1', country: 'US', operatingCountries: ['US'] }) },
    workAuthorizationCase: { create: async (args: any) => { created = args.data; return args.data; } },
  };
  const service = new JurisdictionsService(prisma as any);
  await service.createCase('tenant-1', { candidateId: 'candidate-1', jurisdictionCode: 'US', authorizationType: 'H1B' });
  assert.equal(created.sponsorshipRequired, true);
  assert.equal(created.employerSpecific, true);
  assert.match(created.caseNumber, /^WA-US-/);
}

async function verificationRequiresEvidenceMethod() {
  const prisma = {
    workAuthorizationCase: {
      findFirst: async () => ({ id: 'case-1', tenantId: 'tenant-1', status: 'VERIFICATION_PENDING', verificationMethod: null }),
      update: async () => { throw new Error('update must not run'); },
    },
  };
  const service = new JurisdictionsService(prisma as any);
  await assert.rejects(() => service.updateCase('tenant-1', 'case-1', 'hr-1', { status: 'VERIFIED' }), BadRequestException);
}

const tests: Array<[string, () => Promise<void>]> = [
  ['catalogue covers requested jurisdictions', catalogueHasRequestedMarkets],
  ['EU requires destination member state', euRequiresMemberState],
  ['authorization defaults come from country', authorizationDefaultsComeFromCountry],
  ['verification requires evidence method', verificationRequiresEvidenceMethod],
];

async function main() {
  let failed = 0;
  for (const [name, test] of tests) {
    try { await test(); console.log(`  ok ${name}`); }
    catch (error) { failed += 1; console.error(`  not ok ${name}`, error); }
  }
  console.log(`\nJurisdictions unit: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main();
