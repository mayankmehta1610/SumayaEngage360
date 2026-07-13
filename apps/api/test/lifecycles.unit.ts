import { strict as assert } from 'node:assert';
import { LIFECYCLE_TEMPLATES } from '../src/modules/lifecycles/lifecycle.templates';

function allOperationalJourneysExist() {
  const expected = ['CANDIDATE_INTAKE', 'HIRING', 'AGENCY_PLACEMENT', 'GLOBAL_MOBILITY', 'ONBOARDING', 'EMPLOYEE_LIFECYCLE', 'CONTRACTOR_LIFECYCLE', 'EXIT'];
  assert.deepEqual(Object.keys(LIFECYCLE_TEMPLATES), expected);
  for (const code of expected) assert.ok(LIFECYCLE_TEMPLATES[code].stages.length >= 4, `${code} needs a complete multi-stage flow`);
}

function templatesContainRealDataEntry() {
  for (const [code, template] of Object.entries(LIFECYCLE_TEMPLATES)) {
    const fields = template.stages.flatMap((stage) => stage.tasks.flatMap((task) => task.fields ?? []));
    assert.ok(fields.length >= 20, `${code} has only ${fields.length} structured fields`);
    assert.ok(fields.some((item) => item.type === 'DATE'), `${code} needs dates`);
    assert.ok(fields.some((item) => item.type === 'BOOLEAN'), `${code} needs completion decisions`);
    assert.ok(fields.some((item) => item.type === 'TEXTAREA'), `${code} needs detailed notes`);
  }
}

function documentsAreAssignedAcrossLifecycle() {
  for (const [code, template] of Object.entries(LIFECYCLE_TEMPLATES)) {
    const documents = template.stages.flatMap((stage) => stage.documents ?? []);
    assert.ok(documents.length >= 3, `${code} needs assigned documentation`);
    assert.ok(documents.every((item) => item.code && item.title && item.category && item.assignedTo));
  }
}

function everyStageHasAccountability() {
  for (const template of Object.values(LIFECYCLE_TEMPLATES)) {
    for (const stage of template.stages) {
      assert.ok(stage.ownerRole);
      assert.ok(stage.tasks.length);
      assert.ok(stage.tasks.every((item) => item.ownerRole));
    }
  }
}

const tests: Array<[string, () => void]> = [
  ['all operational journeys exist', allOperationalJourneysExist],
  ['templates contain real structured data entry', templatesContainRealDataEntry],
  ['documents are assigned across lifecycles', documentsAreAssignedAcrossLifecycle],
  ['every stage has accountable ownership', everyStageHasAccountability],
];

let failed = 0;
for (const [name, test] of tests) {
  try { test(); console.log(`  ok ${name}`); }
  catch (error) { failed += 1; console.error(`  not ok ${name}`, error); }
}
console.log(`\nLifecycles unit: ${tests.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
