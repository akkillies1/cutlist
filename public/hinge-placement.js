/* DCODE hinge engineering engine.
 * Manufacturer rule rows are transcribed from a specific, revisioned technical document.
 * No generic hinge-count defaults are applied. All dimensions are millimetres.
 */
export const HINGE_PLACEMENT_VERSION = 'dcode.hinge-placement.v1';
const text = v => String(v ?? '').trim();
const num = v => text(v) === '' ? NaN : Number(v);
const positive = v => Number.isFinite(num(v)) && num(v) > 0;
const nonNegative = v => Number.isFinite(num(v)) && num(v) >= 0;

export function calculateHingePlacement(input = {}) {
  const issues = [];
  const add = (field, message) => issues.push({ field, message });
  const height = num(input.doorHeightMm);
  const width = num(input.doorWidthMm);
  const weight = num(input.doorWeightKg);
  if (!positive(height)) add('doorHeightMm', 'Enter the finished shutter height in mm.');
  if (!positive(width)) add('doorWidthMm', 'Enter the finished shutter width in mm.');
  if (!positive(weight)) add('doorWeightKg', 'Enter a measured or documented finished shutter weight in kg; do not estimate it silently.');
  if (!text(input.hingeBrand)) add('hingeBrand', 'Select the hinge manufacturer.');
  if (!text(input.hingeModel)) add('hingeModel', 'Enter the exact hinge model.');
  if (!text(input.manufacturerReference)) add('manufacturerReference', 'Provide the manufacturer technical document reference and revision.');
  if (!Array.isArray(input.rules) || input.rules.length === 0) add('rules', 'No verified hinge-count rule table is configured for this exact model.');
  if (issues.length) return { valid: false, readyForDrilling: false, hingeCount: null, positionsMm: [], drilling: null, issues, schemaVersion: HINGE_PLACEMENT_VERSION };

  const rules = input.rules.map((r, i) => ({ ...r, _index: i }));
  const matching = rules.filter(r =>
    positive(r.minHeightMm) && positive(r.maxHeightMm) &&
    positive(r.minWidthMm) && positive(r.maxWidthMm) &&
    positive(r.maxDoorWeightKg) &&
    Number.isInteger(num(r.hingeCount)) && num(r.hingeCount) >= 2 &&
    nonNegative(r.topOffsetMm) && nonNegative(r.bottomOffsetMm) &&
    positive(r.maxSpacingMm) &&
    height >= num(r.minHeightMm) && height <= num(r.maxHeightMm) &&
    width >= num(r.minWidthMm) && width <= num(r.maxWidthMm) &&
    weight <= num(r.maxDoorWeightKg)
  ).sort((a, b) => (num(a.maxHeightMm) - num(a.minHeightMm)) - (num(b.maxHeightMm) - num(b.minHeightMm)) || a._index - b._index);
  if (!matching.length) {
    add('rules', 'No verified manufacturer rule covers this shutter height, width and weight. Update the model-specific rule table or select a compatible system.');
    return { valid: false, readyForDrilling: false, hingeCount: null, positionsMm: [], drilling: null, issues, schemaVersion: HINGE_PLACEMENT_VERSION };
  }
  const rule = matching[0];
  const count = num(rule.hingeCount);
  const top = num(rule.topOffsetMm), bottom = num(rule.bottomOffsetMm);
  const usable = height - top - bottom;
  if (!(usable > 0)) add('topOffsetMm', 'Top and bottom offsets leave no usable hinge-placement span.');
  const spacing = count > 1 ? usable / (count - 1) : 0;
  if (spacing > num(rule.maxSpacingMm)) add('maxSpacingMm', 'The configured hinge count exceeds the manufacturer maximum spacing; revise the rule table or select a different system.');
  if (Number.isFinite(num(rule.minSpacingMm)) && spacing < num(rule.minSpacingMm)) add('minSpacingMm', 'Calculated hinge spacing is below the configured manufacturer minimum.');
  const positionsMm = issues.length ? [] : Array.from({ length: count }, (_, i) => Math.round((top + i * spacing) * 100) / 100);

  const cupDiameter = num(input.cupDiameterMm), cupDepth = num(input.cupDepthMm), edgeToCup = num(input.edgeToCupCentreMm);
  const drillingReference = text(input.drillingReference), plateReference = text(input.mountingPlateReference);
  const drillingReady = positive(cupDiameter) && positive(cupDepth) && positive(edgeToCup) && !!drillingReference && !!plateReference;
  const drillingIssues = [];
  if (!positive(cupDiameter)) drillingIssues.push('Confirm the exact cup diameter from the manufacturer drawing.');
  if (!positive(cupDepth)) drillingIssues.push('Confirm the maximum cup drilling depth from the manufacturer drawing and shutter thickness.');
  if (!positive(edgeToCup)) drillingIssues.push('Confirm the cup-centre edge distance from the exact hinge / boring template.');
  if (!drillingReference) drillingIssues.push('Provide the drilling template / technical reference.');
  if (!plateReference) drillingIssues.push('Provide the compatible mounting-plate model and reference.');
  if (positive(cupDepth) && positive(num(input.shutterThicknessMm)) && cupDepth > num(input.shutterThicknessMm)) drillingIssues.push('Cup drilling depth exceeds the entered shutter thickness.');
  const drilling = drillingReady && !drillingIssues.length ? {
    cupDiameterMm: cupDiameter, cupDepthMm: cupDepth, edgeToCupCentreMm: edgeToCup,
    hingeCentresFromTopMm: positionsMm,
    mountingPlateReference: plateReference, drillingReference
  } : null;
  if (drillingIssues.length) drillingIssues.forEach(message => issues.push({ field: 'drilling', message }));
  return {
    valid: issues.length === 0,
    readyForDrilling: !!drilling && issues.length === 0,
    hingeCount: count,
    positionsMm,
    spacingMm: positionsMm.length > 1 ? Math.round((positionsMm[1] - positionsMm[0]) * 100) / 100 : null,
    selectedRule: { sourceIndex: rule._index, maxDoorWeightKg: num(rule.maxDoorWeightKg), maxSpacingMm: num(rule.maxSpacingMm) },
    drilling,
    issues,
    schemaVersion: HINGE_PLACEMENT_VERSION
  };
}
