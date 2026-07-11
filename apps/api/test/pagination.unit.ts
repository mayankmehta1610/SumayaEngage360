import assert from 'node:assert/strict';
import { paginate } from '../src/common/http/pagination';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.error(`  ✘ ${name}`); }
}

const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
const page1 = paginate(items, 1, 10);
check('paginate page 1 size', page1.data.length === 10);
check('paginate total', page1.meta.total === 25);
check('paginate total pages', page1.meta.totalPages === 3);
const page3 = paginate(items, 3, 10);
check('paginate last page', page3.data.length === 5);

console.log(`\nPagination unit: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
