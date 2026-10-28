import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// The app is served as browser ES modules without a package.json. Load the exact
// production module as an ES module so Node's default .js mode cannot misclassify it.
const source = await readFile(resolve('public/kitchen-geometry.js'), 'utf8');
const geometry = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
const { buildKitchenGeometry: build, validateKitchenGeometry: validate } = geometry;

test('straight run places modules in sequence and validates exact total', () => {
  const input = { layout: 'straight', roomW: 3600, roomD: 3000, runA: 1800, runAUnits: '600,600,600' };
  const model = build(input);
  assert.deepEqual(model.positionedModules.map(m => m.xMm), [0, 600, 1200]);
  assert.deepEqual(model.positionedModules.map(m => m.runLengthMm), [600, 600, 600]);
  assert.equal(validate(model, input).some(s => s.includes('RUN-A module widths total')), false);
});

test('L layout positions the return perpendicular to the main run', () => {
  const input = { layout: 'l', roomW: 3600, roomD: 3000, runA: 3000, runB: 2400, baseDepth: 560,
    runAUnits: '600,600,600,640', runBUnits: '600,600,640' };
  const model = build(input);
  assert.equal(model.positionedModules.find(m => m.runId === 'RUN-B').xMm, 0);
  assert.equal(model.positionedModules.find(m => m.runId === 'RUN-B').yMm, 560);
  assert.equal(validate(model, input).some(s => s.includes('overlaps')), false);
});

test('parallel runs flag an aisle below target', () => {
  const input = { layout: 'parallel', roomW: 3600, roomD: 2100, runA: 3000, runB: 3000, baseDepth: 600, aisle: 1000 };
  assert.ok(validate(build(input), input).some(s => s.includes('aisle is below')));
});

test('island footprint is checked against room bounds', () => {
  const input = { layout: 'island', roomW: 1000, roomD: 1800, runA: 900, islandWidth: 1600, islandDepth: 800 };
  assert.ok(validate(build(input), input).some(s => s.includes('footprint extends beyond')));
});

test('peninsula projection is checked against room depth', () => {
  const input = { layout: 'peninsula', roomW: 3000, roomD: 2000, runA: 2600, baseDepth: 600, peninsulaLength: 1800, peninsulaWidth: 600 };
  assert.ok(validate(build(input), input).some(s => s.includes('footprint extends beyond') || s.includes('projection exceeds')));
});

test('vertical stack exceeding room height is flagged', () => {
  const input = { layout: 'straight', roomW: 3600, roomD: 3000, roomH: 2200, runA: 3000,
    counterHeight: 900, backsplashGap: 600, wallHeight: 900, loftEnabled: true, loftHeight: 400 };
  assert.ok(validate(build(input), input).some(s => s.includes('exceed the room height')));
});

test('door and window openings outside the wall are flagged', () => {
  const input = { layout: 'straight', roomW: 3000, roomD: 2600, runA: 2500,
    doorWidth: 900, doorOffset: 2500, windowWidth: 1200, windowOffset: 2500 };
  const issues = validate(build(input), input);
  assert.ok(issues.some(s => s.includes('Door opening exceeds')));
  assert.ok(issues.some(s => s.includes('Window/opening exceeds')));
});

test('module width mismatch is flagged rather than silently resized', () => {
  const input = { layout: 'straight', roomW: 3600, roomD: 3000, runA: 1800, runAUnits: '600,600,500' };
  assert.ok(validate(build(input), input).some(s => s.includes('RUN-A module widths total 1700 mm')));
});

test('invalid model returns a readable validation issue', () => {
  assert.deepEqual(validate(null, {}), ['Room geometry could not be built.']);
});
