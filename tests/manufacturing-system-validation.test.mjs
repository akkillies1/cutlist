import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const source = await readFile(resolve('public/manufacturing-system-validation.js'), 'utf8');
const { validateManufacturingSystemSpecs: validate } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));

test('open cabinet does not require door hardware', () => {
  assert.deepEqual(validate({ doorStyle: 'open', doors: 0 }), []);
});

test('hinged doors block release when exact hinge reference and clearances are missing', () => {
  const issues = validate({ doorStyle: 'hinged', doors: 2, hingeBrand: 'Hettich', hingeModel: '', doorDataReference: '', doorFit: 'verify', doorSideClearance: '', doorTopClearance: '', doorBottomClearance: '', doorMeetingGap: '', doorMaxWidth: '', doorMaxHeight: '' });
  assert.ok(issues.some(x => x.field === 'hingeModel'));
  assert.ok(issues.some(x => x.field === 'doorDataReference'));
  assert.ok(issues.some(x => x.field === 'doorMaxWidth'));
  assert.ok(issues.some(x => x.field === 'doorMeetingGap'));
});

test('sliding doors require the selected system reference and verified limits', () => {
  const issues = validate({ doorStyle: 'sliding', doors: 2, slidingModel: 'System X', slidingDataReference: '', slidingSideClearance: 10, slidingTopClearance: 10, slidingBottomClearance: 10, slidingOverlap: 20, slidingMaxWidth: 900, slidingMaxHeight: '' });
  assert.ok(issues.some(x => x.field === 'slidingDataReference'));
  assert.ok(issues.some(x => x.field === 'slidingMaxHeight'));
  assert.equal(issues.some(x => x.field === 'slidingOverlap'), false);
});

test('drawer box sizing requires exact runner specification and opening dimensions', () => {
  const issues = validate({ drawerBoxSizingEnabled: true, drawers: 1, drawerRunnerBrand: 'Hettich', drawerRunnerModel: '', drawerRunnerDataReference: '', drawerRunnerLength: 450, drawerRunnerSideClearance: '', drawerRunnerDepthAllowance: 0, drawerOpeningWidth: 600, drawerOpeningHeight: 180, drawerTopClearance: 0, drawerBottomClearance: 0 });
  assert.ok(issues.some(x => x.field === 'drawerRunnerModel'));
  assert.ok(issues.some(x => x.field === 'drawerRunnerSideClearance'));
  assert.ok(issues.some(x => x.field === 'drawerOpeningWidth') === false);
});

test('explicit zero clearance is accepted while blank clearance is rejected', () => {
  const issues = validate({ doorStyle: 'hinged', doors: 1, hingeBrand: 'Brand', hingeModel: 'Model', doorDataReference: 'PDF page 3', doorFit: 'inset', doorSideClearance: 0, doorTopClearance: 0, doorBottomClearance: 0, doorMeetingGap: 0, doorMaxWidth: 600, doorMaxHeight: 1800 });
  assert.deepEqual(issues, []);
});
