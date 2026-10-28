import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = await readFile(resolve('public/cabinet-geometry.js'), 'utf8');
const { buildCabinetCarcassGeometry: build } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
const validInput = { width: 1200, height: 2200, depth: 600, board: 18, shelfBoard: 18, back: 6, shelves: 3, partitions: 1 };

test('valid carcass returns deterministic panel groups and dimensions', () => {
  const model = build(validInput);
  assert.equal(model.valid, true);
  assert.equal(model.units, 'mm');
  assert.equal(model.panels.find(p => p.role === 'carcass-side').qty, 2);
  assert.equal(model.panels.find(p => p.role === 'vertical-partition').qty, 1);
  assert.equal(model.panels.find(p => p.role === 'shelf').qty, 6);
});

test('fractional shelf count is rejected instead of silently rounded down', () => {
  const model = build({ ...validInput, shelves: 2.5 });
  assert.equal(model.valid, false);
  assert.ok(model.issues.some(issue => issue.includes('Shelf count must be a whole number')));
  assert.deepEqual(model.panels, []);
});

test('fractional partition count is rejected instead of silently rounded down', () => {
  const model = build({ ...validInput, partitions: 1.5 });
  assert.equal(model.valid, false);
  assert.ok(model.issues.some(issue => issue.includes('Partition count must be a whole number')));
  assert.deepEqual(model.panels, []);
});

test('explicit shelf elevations must match shelf count and fit the carcass', () => {
  const mismatch = build({ ...validInput, shelves: 2, shelfElevationsMm: '400' });
  assert.equal(mismatch.valid, false);
  assert.ok(mismatch.issues.some(issue => issue.includes('exactly one shelf elevation')));
  const outside = build({ ...validInput, shelves: 1, shelfElevationsMm: '3000' });
  assert.equal(outside.valid, false);
  assert.ok(outside.issues.some(issue => issue.includes('must fit between')));
});

test('equal-spaced shelves are bottom-up and strictly ordered', () => {
  const model = build({ ...validInput, shelves: 3, shelfElevationsMm: '' });
  assert.equal(model.valid, true);
  assert.deepEqual([...model.shelfElevationsMm].sort((a, b) => a - b), model.shelfElevationsMm);
  assert.equal(new Set(model.shelfElevationsMm).size, 3);
});


test('correctly exposes 2364 mm inner height and reserves back-panel depth', () => {
  const model = build({ ...validInput, width: 1800, height: 2400, depth: 600, board: 18, back: 6, shelves: 4, partitions: 1 });
  assert.equal(model.valid, true);
  assert.equal(model.innerHeightMm, 2364);
  assert.equal(model.internalDepthMm, 594);
  assert.equal(model.panels.find(p => p.id === 'TOP').wMm, 594);
  assert.equal(model.panels.find(p => p.id === 'BOTTOM').wMm, 594);
  assert.equal(model.panels.find(p => p.role === 'shelf').wMm, 594);
});

test('rejects impossible narrow bays and non-numeric shelf counts', () => {
  const narrow = build({ ...validInput, width: 300, height: 2100, depth: 600, shelves: 2, partitions: 10 });
  assert.equal(narrow.valid, false);
  assert.ok(narrow.issues.some(issue => issue.includes('minimum 50 mm geometry limit')));
  const nonNumeric = build({ ...validInput, shelves: 'many' });
  assert.equal(nonNumeric.valid, false);
  assert.ok(nonNumeric.issues.some(issue => issue.includes('Shelf count must be a whole number')));
});

test('side panels stop at the overlay back instead of overlapping it', () => {
  const model = build({ ...validInput, depth: 600, back: 6, partitions: 1 });
  assert.equal(model.valid, true);
  const sides = model.panels.find(p => p.id === 'SIDE-PAIR');
  const back = model.panels.find(p => p.id === 'BACK');
  assert.equal(sides.wMm, 594);
  assert.equal(back.positionMm.z, 594);
  assert.equal(sides.wMm, back.positionMm.z);
});
