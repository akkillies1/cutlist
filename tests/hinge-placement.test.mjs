import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const source = await readFile(resolve('public/hinge-placement.js'), 'utf8');
const { calculateHingePlacement: calculate } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
const rule = { minHeightMm: 600, maxHeightMm: 1200, minWidthMm: 250, maxWidthMm: 600, maxDoorWeightKg: 12, hingeCount: 3, topOffsetMm: 100, bottomOffsetMm: 100, maxSpacingMm: 500 };
const base = { doorHeightMm: 900, doorWidthMm: 450, doorWeightKg: 8, hingeBrand: 'Example manufacturer', hingeModel: 'Exact model', manufacturerReference: 'Catalog revision X, page 10', rules: [rule] };

test('uses an explicit model-specific rule and computes evenly spaced centres', () => {
 const r = calculate(base);
 assert.equal(r.hingeCount, 3);
 assert.deepEqual(r.positionsMm, [100, 450, 800]);
 assert.equal(r.valid, false, 'drilling remains blocked without exact drilling references');
 assert.equal(r.readyForDrilling, false);
});

test('rejects missing or unverified manufacturer rule data instead of using a generic count', () => {
 const r = calculate({ ...base, rules: [] });
 assert.equal(r.valid, false);
 assert.equal(r.hingeCount, null);
 assert.ok(r.issues.some(x => x.field === 'rules'));
});

test('rejects a shutter outside the verified weight envelope', () => {
 const r = calculate({ ...base, doorWeightKg: 13 });
 assert.equal(r.hingeCount, null);
 assert.ok(r.issues.some(x => x.field === 'rules'));
});

test('rejects manufacturer spacing violations', () => {
 const r = calculate({ ...base, doorHeightMm: 1200, rules: [{ ...rule, maxHeightMm: 1200, topOffsetMm: 100, bottomOffsetMm: 100, maxSpacingMm: 300 }] });
 assert.equal(r.hingeCount, 3);
 assert.ok(r.issues.some(x => x.field === 'maxSpacingMm'));
});

test('produces drilling parameters only when cup, depth, edge distance, plate and drawing are specified', () => {
 const r = calculate({ ...base, shutterThicknessMm: 18, cupDiameterMm: 35, cupDepthMm: 12, edgeToCupCentreMm: 22.5, mountingPlateReference: 'Plate model reference', drillingReference: 'Boring drawing revision Y' });
 assert.equal(r.valid, true);
 assert.equal(r.readyForDrilling, true);
 assert.equal(r.drilling.cupDiameterMm, 35);
 assert.deepEqual(r.drilling.hingeCentresFromTopMm, [100, 450, 800]);
});

test('blocks cup depth exceeding the shutter thickness', () => {
 const r = calculate({ ...base, shutterThicknessMm: 12, cupDiameterMm: 35, cupDepthMm: 13, edgeToCupCentreMm: 22.5, mountingPlateReference: 'Plate reference', drillingReference: 'Boring drawing reference' });
 assert.equal(r.readyForDrilling, false);
 assert.ok(r.issues.some(x => x.field === 'drilling'));
});


test('prefers the higher hinge-count rule when valid manufacturer ranges overlap', () => {
 const r=calculate({...base,rules:[
  {...rule,hingeCount:3,maxSpacingMm:500},
  {...rule,hingeCount:4,maxSpacingMm:300}
 ]});
 assert.equal(r.hingeCount,4);
 assert.equal(r.selectedRule.hingeCount,4);
});
