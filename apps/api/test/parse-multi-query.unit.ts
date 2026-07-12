import assert from 'node:assert/strict';
import { parseMultiQuery } from '../src/common/http/parse-multi-query';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.error(`  ✘ ${name}`); }
}

check('empty', parseMultiQuery(undefined).length === 0);
check('single string', parseMultiQuery('ACTIVE').join() === 'ACTIVE');
check('comma list', parseMultiQuery('A,B, C').join() === 'A,B,C');
check('repeated params', parseMultiQuery(['A', 'B', 'A']).join() === 'A,B');
check('dedupe', parseMultiQuery('X,X,Y').join() === 'X,Y');

console.log(`\nparseMultiQuery unit: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
