/* DCODE shared kitchen-room geometry model. Millimetres only; no manufacturer-specific dimensions are inferred. */
export const KITCHEN_GEOMETRY_VERSION = 'dcode.kitchen-geometry.v1';

const n = (v, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};
const positive = v => Math.max(0, n(v));

function widths(value) {
  return String(value ?? '').split(',').map(s => Number(s.trim())).filter(x => Number.isFinite(x) && x > 0).map(Math.round);
}
function modulesFor(id, value, expected) {
  const dims = widths(value);
  let position = 0;
  return dims.map((width, index) => {
    const module = { id: id + '-M' + String(index + 1).padStart(2, '0'), widthMm: width, startMm: position, endMm: position + width };
    position += width;
    return module;
  }).map((m, i) => ({ ...m, sequence: i + 1, overrun: m.endMm > expected }));
}

/**
 * Produces one stable, serialisable geometric description used for review, export,
 * and future cloud persistence. Coordinates are room-local X/Y millimetres.
 * Existing cutlist generators remain independent and are not overwritten here.
 */
export function buildKitchenGeometry(input = {}) {
  const room = {
    widthMm: Math.max(1, n(input.roomW, 3600)),
    depthMm: Math.max(1, n(input.roomD, 3000)),
    heightMm: Math.max(1, n(input.roomH, 2700))
  };
  const layout = String(input.layout || 'straight').toLowerCase();
  const runA = positive(input.runA), runB = positive(input.runB), runC = positive(input.runC);
  const baseEnabled = input.baseEnabled !== false;
  const baseDepth = Math.max(1, n(input.baseDepth, 560));
  const wallDepth = Math.max(1, n(input.wallDepth, 350));
  const peninsulaLength = Math.max(1, n(input.peninsulaLength, 1800));
  const peninsulaWidth = Math.max(1, n(input.peninsulaWidth, baseDepth));
  const peninsulaSide = input.peninsulaSide === 'right' ? 'right' : 'left';
  const runAUnits = widths(input.runAUnits), runBUnits = widths(input.runBUnits), runCUnits = widths(input.runCUnits);
  const expectedB = !baseEnabled ? 0 : ['l','u','c'].includes(layout) ? Math.max(0, runB - baseDepth) : layout === 'parallel' ? runB : 0;
  const expectedC = !baseEnabled ? 0 : ['u','c'].includes(layout) ? Math.max(0, runC - baseDepth) : 0;

  const runs = baseEnabled ? [{
    id: 'RUN-A', role: 'main', lengthMm: runA, depthMm: baseDepth,
    start: { xMm: 0, yMm: 0 }, end: { xMm: runA, yMm: 0 }, orientation: 'horizontal',
    modules: modulesFor('RUN-A', runAUnits, runA), nominalModulesTotalMm: runAUnits.reduce((a,b)=>a+b,0)
  }] : [];
  if (baseEnabled && ['l','u','c'].includes(layout)) {
    runs.push({ id:'RUN-B', role:'return-left', lengthMm:runB, depthMm:baseDepth,
      start:{xMm:0,yMm:baseDepth}, end:{xMm:0,yMm:runB}, orientation:'vertical',
      modules:modulesFor('RUN-B',runBUnits,expectedB), nominalModulesTotalMm:runBUnits.reduce((a,b)=>a+b,0) });
  } else if (baseEnabled && layout === 'parallel') {
    runs.push({ id:'RUN-B', role:'opposing', lengthMm:runB, depthMm:baseDepth,
      start:{xMm:0,yMm:room.depthMm-baseDepth}, end:{xMm:runB,yMm:room.depthMm-baseDepth}, orientation:'horizontal',
      modules:modulesFor('RUN-B',runBUnits,runB), nominalModulesTotalMm:runBUnits.reduce((a,b)=>a+b,0) });
  } else if (layout === 'peninsula' && input.islandEnabled !== false) {
    const x = peninsulaSide === 'right' ? Math.max(0, runA - baseDepth) : 0;
    runs.push({ id:'PENINSULA-01', role:'peninsula', lengthMm:peninsulaLength, depthMm:peninsulaWidth,
      start:{xMm:x,yMm:baseDepth}, end:{xMm:x,yMm:baseDepth+peninsulaLength}, orientation:'vertical',
      modules:[], nominalModulesTotalMm:0 });
  }
  if (baseEnabled && ['u','c'].includes(layout)) {
    runs.push({ id:'RUN-C', role:'return-right', lengthMm:runC, depthMm:baseDepth,
      start:{xMm:runA-baseDepth,yMm:baseDepth}, end:{xMm:runA-baseDepth,yMm:runC}, orientation:'vertical',
      modules:modulesFor('RUN-C',runCUnits,expectedC), nominalModulesTotalMm:runCUnits.reduce((a,b)=>a+b,0) });
  }
  if (layout === 'island' && input.islandEnabled !== false) {
    const islandWidth = Math.min(1800, Math.max(1200, n(input.islandWidth, 1600)));
    const islandDepth = Math.min(1000, Math.max(700, n(input.islandDepth, 800)));
    runs.push({ id:'ISLAND-01', role:'island', lengthMm:islandWidth, depthMm:islandDepth,
      start:{xMm:(room.widthMm-islandWidth)/2,yMm:(room.depthMm-islandDepth)/2},
      end:{xMm:(room.widthMm+islandWidth)/2,yMm:(room.depthMm+islandDepth)/2}, orientation:'island', modules:[], nominalModulesTotalMm:0 });
  }
  // Materialise each nominal module as a positioned room-local object. This is the
  // shared coordinate contract for future elevation, plan and 3D projections;
  // it does not yet imply shutter, filler or manufacturer-specific construction.
  const positionedModules = runs.flatMap(run => (run.modules || []).map(module => {
    const vertical = run.orientation === 'vertical';
    const xMm = run.start.xMm + (vertical ? 0 : module.startMm);
    const yMm = run.start.yMm + (vertical ? module.startMm : 0);
    return {
      id: module.id, runId: run.id, sequence: module.sequence,
      role: run.role, orientation: run.orientation,
      xMm, yMm,
      widthMm: vertical ? run.depthMm : module.widthMm,
      depthMm: vertical ? module.widthMm : run.depthMm,
      runLengthMm: module.widthMm,
      startMm: module.startMm, endMm: module.endMm,
      overrun: module.overrun
    };
  }));
  const baseHeight = baseEnabled ? Math.max(0,n(input.counterHeight,900)-n(input.plinth,100)-n(input.counterThickness,20)) : 0;
  const upperHeight = input.wallEnabled === false ? 0 : positive(input.wallHeight);
  const loftHeight = input.wallEnabled === false || input.loftEnabled === false ? 0 : positive(input.loftHeight);
  const verticalZones = {
    plinthMm: baseEnabled ? positive(input.plinth ?? 100) : 0,
    baseCarcassMm: baseHeight,
    worktopMm: baseEnabled ? positive(input.counterThickness ?? 20) : 0,
    backsplashGapMm: input.wallEnabled === false || !baseEnabled ? 0 : positive(input.backsplashGap),
    wallUnitMm: upperHeight,
    loftMm: loftHeight,
    totalStackMm: (baseEnabled ? n(input.counterHeight,900) : 0) + (input.wallEnabled === false ? 0 : (baseEnabled ? positive(input.backsplashGap) : 0)) + upperHeight + loftHeight
  };
  const moduleCollections = baseEnabled ? [
    { runId:'RUN-A', expectedMm:runA, actualMm:runAUnits.reduce((a,b)=>a+b,0), widths:runAUnits },
    ...(expectedB > 0 ? [{runId:'RUN-B',expectedMm:expectedB,actualMm:runBUnits.reduce((a,b)=>a+b,0),widths:runBUnits}] : []),
    ...(expectedC > 0 ? [{runId:'RUN-C',expectedMm:expectedC,actualMm:runCUnits.reduce((a,b)=>a+b,0),widths:runCUnits}] : [])
  ] : [];
  return {
    schemaVersion: KITCHEN_GEOMETRY_VERSION, units:'mm', layout,
    room,
    layoutKind: layout === 'c' ? 'c-shaped-three-run' : layout === 'u' ? 'u-shaped-three-run' : layout === 'peninsula' ? 'attached-peninsula' : layout,
    dimensions:{runA,runB,runC,baseDepthMm:baseDepth,wallDepthMm:wallDepth,peninsulaLengthMm:peninsulaLength,peninsulaWidthMm:peninsulaWidth,peninsulaSide},
    runs, positionedModules, verticalZones, moduleCollections,
    openings:{
      window:{widthMm:positive(input.windowWidth),offsetMm:positive(input.windowOffset),location:String(input.window||'unknown')},
      door:{widthMm:positive(input.doorWidth),offsetMm:positive(input.doorOffset)}
    },
    createdAt: new Date().toISOString(),
    geometryStatus:'planning-only'
  };
}

export function validateKitchenGeometry(model, input = {}) {
  const issues = [];
  if (!model || !model.room) return ['Room geometry could not be built.'];
  const { room, layout, dimensions, verticalZones } = model;
  const baseEnabled = input.baseEnabled !== false;
  const islandEnabled = input.islandEnabled !== false;
  if (baseEnabled && dimensions.runA <= 0) issues.push('Run A needs a positive measured length.');
  if (baseEnabled && dimensions.runA > room.widthMm) issues.push('Run A exceeds the measured room width.');
  if (baseEnabled && layout === 'parallel' && dimensions.runB > room.widthMm) issues.push('The opposing run exceeds the measured room width.');
  if (baseEnabled && ['l','u','c'].includes(layout) && dimensions.runA <= dimensions.baseDepthMm) issues.push('Run A must exceed the base cabinet depth to leave a usable straight section beyond the corner.');
  if (baseEnabled && ['l','u','c'].includes(layout) && dimensions.runB <= dimensions.baseDepthMm) issues.push('Run B must exceed the base cabinet depth to provide a usable return beyond the corner.');
  if (baseEnabled && ['l','u','c'].includes(layout) && dimensions.runB > room.depthMm) issues.push('Run B exceeds the measured room depth.');
  if (baseEnabled && ['u','c'].includes(layout) && dimensions.runC > room.depthMm) issues.push('Run C exceeds the measured room depth.');
  if (baseEnabled && ['u','c'].includes(layout) && dimensions.runC <= dimensions.baseDepthMm) issues.push('A three-run layout needs a third run longer than the base cabinet depth.');
  if (baseEnabled && layout === 'parallel' && room.depthMm - 2 * dimensions.baseDepthMm < positive(input.aisle ?? 1000))
    issues.push('The opposing-run aisle is below the entered target before handles and open doors.');
  if (islandEnabled && layout === 'peninsula' && dimensions.peninsulaLengthMm + (baseEnabled ? dimensions.baseDepthMm : 0) > room.depthMm)
    issues.push('The peninsula projection exceeds the room depth.');
  for (const set of model.moduleCollections || []) {
    if (Math.abs(set.actualMm - set.expectedMm) > 1)
      issues.push(set.runId + ' module widths total ' + set.actualMm + ' mm; required usable length is ' + set.expectedMm + ' mm.');
  }
  for (const module of model.positionedModules || []) {
    const right = module.xMm + module.widthMm;
    const bottom = module.yMm + module.depthMm;
    if (module.xMm < -1 || module.yMm < -1 || right > room.widthMm + 1 || bottom > room.depthMm + 1)
      issues.push(module.id + ' extends beyond the measured room boundary.');
  }
  const placed = model.positionedModules || [];
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    for (let j = i + 1; j < placed.length; j++) {
      const b = placed[j];
      const overlapX = Math.min(a.xMm + a.widthMm, b.xMm + b.widthMm) - Math.max(a.xMm, b.xMm);
      const overlapY = Math.min(a.yMm + a.depthMm, b.yMm + b.depthMm) - Math.max(a.yMm, b.yMm);
      if (overlapX > 1 && overlapY > 1)
        issues.push(a.id + ' overlaps ' + b.id + ' by ' + Math.round(overlapX) + ' × ' + Math.round(overlapY) + ' mm in plan.');
    }
  }
  if (verticalZones.totalStackMm > room.heightMm)
    issues.push('Counter + backsplash gap + wall unit + loft exceed the room height.');
  const doorWidth = positive(input.doorWidth), doorOffset = positive(input.doorOffset);
  if (doorWidth && doorOffset + doorWidth > room.widthMm) issues.push('Door opening exceeds the measured room wall length.');
  const windowWidth = positive(input.windowWidth), windowOffset = positive(input.windowOffset);
  if (windowWidth && windowOffset + windowWidth > room.widthMm) issues.push('Window/opening exceeds the measured room wall length.');
  return [...new Set(issues)];
}