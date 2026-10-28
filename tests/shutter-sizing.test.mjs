import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const source = await readFile(resolve('public/shutter-sizing.js'), 'utf8');
const { calculateShutterDimensions: calculate } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
const common = { outerW: 1200, outerH: 2400, boardT: 18, count: 2, hingeBrand: 'Hettich', hingeModel: 'Exact model', doorDataReference: 'Manufacturer drawing p. 4', doorMaxWidth: 600, doorMaxHeight: 2400, doorMeetingGap: 3 };

test('inset hinged shutters use inset clearances and enforce system limits', () => {
 const r=calculate({...common,style:'hinged',doorFit:'inset',doorSideClearance:2,doorTopClearance:2,doorBottomClearance:2});
 assert.equal(r.valid,true); assert.equal(r.width,579); assert.equal(r.height,2360);
});

test('overlay hinged shutters use overlay values and do not require inset clearances', () => {
 const r=calculate({...common,style:'hinged',doorFit:'overlay',doorOverlaySide:18,doorOverlayTop:18,doorOverlayBottom:18});
 assert.equal(r.valid,true); assert.equal(r.width,599); assert.equal(r.height,2400);
});

test('sliding panels include overlap and verified track clearances', () => {
 const r=calculate({style:'sliding',outerW:1800,outerH:2400,boardT:18,count:2,slidingModel:'System A',slidingDataReference:'Catalog p. 8',slidingMaxWidth:900,slidingMaxHeight:2400,slidingSideClearance:10,slidingTopClearance:20,slidingBottomClearance:20,slidingOverlap:30});
 assert.equal(r.valid,true); assert.equal(r.width,887); assert.equal(r.height,2324);
});

test('rejects fractional shutter counts and missing model-specific values', () => {
 const r=calculate({...common,style:'hinged',count:2.5,doorFit:'inset'});
 assert.equal(r.valid,false); assert.ok(r.issues.some(x=>x.field==='count'));
});

test('rejects dimensions above verified maximum limits', () => {
 const r=calculate({...common,style:'hinged',doorFit:'inset',doorSideClearance:0,doorTopClearance:0,doorBottomClearance:0,doorMaxWidth:500});
 assert.equal(r.valid,false); assert.ok(r.issues.some(x=>x.field==='dimensions'));
});

test('open-front cabinet does not fabricate shutter dimensions', () => {
 assert.deepEqual(calculate({style:'open'}),{valid:true,width:0,height:0,issues:[],schemaVersion:'dcode.shutter-sizing.v2'});
});


test('inset shutter width accounts for internal partitions', () => {
 const r=calculate({...common,outerW:1800,outerH:2400,count:3,partitionCount:1,style:'hinged',doorFit:'inset',doorSideClearance:2,doorTopClearance:2,doorBottomClearance:2,doorMaxWidth:700});
 assert.equal(r.valid,true);
 assert.equal(Math.round(r.calculatedWidthMm*10)/10,578.7);
 assert.equal(r.width,579);
 assert.equal(r.height,2360);
});

test('height supports a construction without a top board', () => {
 const r=calculate({...common,outerH:2400,style:'hinged',doorFit:'inset',hasTopBoard:false,hasBottomBoard:true,doorSideClearance:2,doorTopClearance:0,doorBottomClearance:0});
 assert.equal(r.valid,true);
 assert.equal(r.height,2382);
});
