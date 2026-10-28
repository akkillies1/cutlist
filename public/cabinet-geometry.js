/* DCODE canonical carcass panel geometry v1. Millimetres only.
   This models rectangular carcass panels and their nominal placement. It does not
   infer joinery, rebates, hinge drilling, edge-band deductions or CNC operations. */
export const CABINET_GEOMETRY_VERSION = 'dcode.cabinet-carcass.v1';

const num = (value, fallback = 0) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
};

export function buildCabinetCarcassGeometry(input = {}) {
  const widthMm = num(input.width);
  const heightMm = num(input.height);
  const depthMm = num(input.depth);
  const boardMm = num(input.board);
  const shelfMm = num(input.shelfBoard, boardMm);
  const backMm = num(input.back);
  const shelfCountRaw = num(input.shelves);
  const partitionCountRaw = num(input.partitions);
  const shelfCount = Math.floor(shelfCountRaw);
  const partitionCount = Math.floor(partitionCountRaw);
  const shelfElevationRaw = String(input.shelfElevationsMm ?? '').trim();
  const suppliedShelfElevations = shelfElevationRaw ? shelfElevationRaw.split(',').map(v => Number(v.trim())) : [];
  const issues = [];
  if (![widthMm, heightMm, depthMm, boardMm, shelfMm, backMm].every(v => Number.isFinite(v) && v > 0))
    issues.push('Outer dimensions and all board thicknesses must be positive.');
  if (widthMm <= 2 * boardMm || heightMm <= 2 * boardMm)
    issues.push('Width and height must exceed twice the carcass board thickness.');
  if (!Number.isInteger(shelfCountRaw) || shelfCountRaw < 0 || shelfCountRaw > 30) issues.push('Shelf count must be a whole number from 0 to 30.');
  if (!Number.isInteger(partitionCountRaw) || partitionCountRaw < 0 || partitionCountRaw > 10) issues.push('Partition count must be a whole number from 0 to 10.');
  if (shelfElevationRaw && suppliedShelfElevations.length !== shelfCount) issues.push('Enter exactly one shelf elevation per shelf, or leave the field blank for equal spacing.');
  if (suppliedShelfElevations.some(v => !Number.isFinite(v))) issues.push('Shelf elevations must be numeric millimetre values separated by commas.');
  const innerWidthMm = widthMm - 2 * boardMm;
  const innerHeightMm = heightMm - boardMm;
  const bayWidthMm = (innerWidthMm - partitionCount * boardMm) / (partitionCount + 1);
  if (bayWidthMm <= 0) issues.push('Partitions and board thickness leave no usable bay width.');
  const minShelfY = boardMm, maxShelfY = heightMm - boardMm - shelfMm;
  if (shelfCount > 0 && maxShelfY < minShelfY) issues.push('Cabinet height does not leave enough space for the selected shelf thickness between top and bottom panels.');
  const shelfElevations = shelfCount > 0
    ? (shelfElevationRaw ? suppliedShelfElevations : Array.from({ length: shelfCount }, (_, i) => minShelfY + (maxShelfY - minShelfY) * (i + 1) / (shelfCount + 1)))
    : [];
  if (shelfElevations.some(v => v < minShelfY || v > maxShelfY)) issues.push('Shelf elevations are lower-edge heights from cabinet bottom and must fit between the bottom and top panels.');
  if (shelfElevations.some((v, i) => i > 0 && v <= shelfElevations[i - 1])) issues.push('Shelf elevations must be entered in strictly increasing bottom-up order.');
  if (issues.length) return { schemaVersion: CABINET_GEOMETRY_VERSION, units: 'mm', valid: false, issues, panels: [] };

  const panels = [];
  const add = (id, role, name, l, w, t, qty, position, orientation, rule) => {
    panels.push({
      id, role, name, lMm: Math.round(l), wMm: Math.round(w), tMm: Math.round(t), qty,
      positionMm: Array.isArray(position) ? position[0] : position,
      positionsMm: Array.isArray(position) ? position : [position], orientation, sizingRule: rule
    });
  };
  add('SIDE-PAIR', 'carcass-side', 'Carcass side', heightMm, depthMm, boardMm, 2,
    [{ x: 0, y: 0, z: 0 }, { x: widthMm - boardMm, y: 0, z: 0 }], 'vertical-panel', 'Two full-height sides × depth');
  add('TOP', 'carcass-top', 'Carcass top', innerWidthMm, depthMm, boardMm, 1,
    { x: boardMm, y: heightMm - boardMm, z: 0 }, 'horizontal-panel', 'Between side panels');
  add('BOTTOM', 'carcass-bottom', 'Carcass bottom', innerWidthMm, depthMm, boardMm, 1,
    { x: boardMm, y: 0, z: 0 }, 'horizontal-panel', 'Between side panels');
  if (shelfCount > 0) {
    const bayStarts = input.mixedWardrobe && partitionCount
      ? [boardMm + partitionCount * (bayWidthMm + boardMm)]
      : Array.from({ length: partitionCount + 1 }, (_, i) => boardMm + i * (bayWidthMm + boardMm));
    const shelfPositions = shelfElevations.flatMap(y => bayStarts.map(x => ({ x, y, z: 0 })));
    add('SHELF-BAY', 'shelf', input.mixedWardrobe && partitionCount ? 'Shelf · storage-bay shelf' : 'Shelf · segmented by bay',
      bayWidthMm, depthMm, shelfMm, shelfPositions.length, shelfPositions,
      'horizontal-panel', shelfElevationRaw ? 'Explicit lower-edge elevations from cabinet bottom; one level per supplied value' : 'Equal-spaced lower-edge elevations between bottom and top panels');
  }
  if (partitionCount > 0) {
    const positions = Array.from({ length: partitionCount }, (_, i) => ({
      x: boardMm + (i + 1) * bayWidthMm + i * boardMm, y: boardMm, z: 0
    }));
    add('PARTITION-SET', 'vertical-partition', 'Vertical partition',
      heightMm - 2 * boardMm, depthMm, boardMm, partitionCount,
      positions, 'vertical-panel', 'Between carcass top and bottom; positions follow nominal equal-width bays');
  }
  add('BACK', 'back-panel', 'Back panel', widthMm, heightMm, backMm, 1,
    { x: 0, y: 0, z: Math.max(0, depthMm - backMm) }, 'back-panel', 'Full outer width × height; rebate/fixing not modelled');

  return {
    schemaVersion: CABINET_GEOMETRY_VERSION, units: 'mm', valid: true, issues: [],
    envelope: { widthMm, heightMm, depthMm }, boardMm, shelfMm, backMm,
    innerWidthMm, innerHeightMm, bayWidthMm, shelfElevationsMm: shelfElevations, panels
  };
}