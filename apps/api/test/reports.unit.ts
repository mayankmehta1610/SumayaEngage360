import assert from 'node:assert/strict';
import {
  attritionRate,
  avgDaysInStage,
  benchEmployees,
  funnelConversion,
  timesheetCompliance,
  utilizationPct,
} from '../src/modules/reports/report-calculations';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean | (() => boolean)) {
  const ok = typeof cond === 'function' ? cond() : cond;
  if (ok) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.error(`  ✘ ${name}`); }
}

check('funnelConversion totals', () => {
  const r = funnelConversion([
    { status: 'APPLIED', count: 100 },
    { status: 'INTERVIEW', count: 40 },
  ]);
  return r.length === 2 && r[0].pctOfTotal > 0;
});

check('attritionRate', attritionRate(5, 100) === 5);
check('utilizationPct caps at 100', utilizationPct(120) === 100);
check('benchEmployees finds under-allocated', () => {
  const b = benchEmployees(
    [{ employeeId: 'a', allocatedPct: 50 }],
    ['a', 'b'],
  );
  return b.length === 2 && b.every((x) => x.allocatedPct < 100);
});

check('timesheetCompliance', () => {
  const c = timesheetCompliance(10, 5, 20);
  return c.total === 35 && c.approvedPct > 50;
});

check('avgDaysInStage', () => {
  const now = new Date('2026-07-11');
  const r = avgDaysInStage(
    [{ status: 'APPLIED', createdAt: new Date('2026-07-01'), updatedAt: new Date('2026-07-06') }],
    now,
  );
  return r[0].status === 'APPLIED' && r[0].avgDays >= 5;
});

console.log(`\nUnit: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
