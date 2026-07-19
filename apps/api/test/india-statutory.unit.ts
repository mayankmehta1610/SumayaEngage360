import assert from 'node:assert/strict';
import { IndiaStatutoryService } from '../src/modules/payroll/india-statutory.service';

// India statutory pack — PF/ESI/PT/TDS slab math.
async function main() {
  const svc = new IndiaStatutoryService();
  let passed = 0;

  // 1. Mid-level Maharashtra employee, new regime: PF capped at the ceiling,
  //    ESI out of range, PT top slab, TDS fully rebated under §87A.
  const a = svc.compute({
    monthlyGross: 100000,
    monthlyBasic: 50000,
    state: 'Maharashtra',
    regime: 'NEW',
  });
  assert.equal(a.pf.employee, 1800); // 12% of ₹15,000 ceiling
  assert.equal(a.pf.employerEps, 1250); // 8.33% of ceiling
  assert.equal(a.pf.employerEpf, 550); // employer 12% minus EPS
  assert.equal(a.esi.applicable, false); // gross above ₹21,000
  assert.equal(a.pt.monthly, 200);
  assert.equal(a.tds.monthly, 0); // taxable ≤ ₹12L → §87A rebate
  assert.equal(a.netMonthly, 100000 - 1800 - 200);
  passed++;

  // 2. Entry-level employee: ESI applies, PF on actual basic below ceiling.
  const b = svc.compute({
    monthlyGross: 15000,
    monthlyBasic: 7500,
    state: 'Pune, Maharashtra', // free-text location resolves to the state
    regime: 'NEW',
  });
  assert.equal(b.pf.employee, 900); // 12% of ₹7,500
  assert.equal(b.esi.applicable, true);
  assert.equal(b.esi.employee, Math.ceil(15000 * 0.0075));
  assert.equal(b.pt.monthly, 200);
  assert.equal(b.tds.monthly, 0);
  passed++;

  // 3. Senior employee, old regime with declared 80C investments.
  const c = svc.compute({
    monthlyGross: 200000,
    monthlyBasic: 100000,
    state: 'KARNATAKA',
    regime: 'OLD',
    annualDeclaredDeductions: 150000,
  });
  // taxable = 24,00,000 − 50,000 (std) − 1,50,000 (80C) − 2,400 (PT u/s 16)
  assert.equal(c.tds.taxableIncome, 2400000 - 50000 - 150000 - 2400);
  const slabTax = 12500 + 100000 + (c.tds.taxableIncome - 1000000) * 0.3;
  assert.equal(c.tds.annualTax, Math.round(slabTax * 1.04)); // + 4% cess
  assert.equal(c.pt.monthly, 200);
  passed++;

  // 4. No-PT state and unmatched location → PT zero.
  const d = svc.compute({ monthlyGross: 50000, monthlyBasic: 25000, state: 'Delhi' });
  assert.equal(d.pt.monthly, 0);
  assert.equal(d.state, null);
  passed++;

  // 5. Config exposes the state list for UIs.
  assert.ok(svc.config().ptStates.includes('MAHARASHTRA'));
  passed++;

  console.log(`India statutory unit: ${passed} passed, 0 failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
