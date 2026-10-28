/* DCODE shutter sizing calculations. Millimetres only; hardware values must be verified from the selected manufacturer's documentation. */
export const SHUTTER_SIZING_VERSION = 'dcode.shutter-sizing.v1';
const raw = value => String(value ?? '').trim();
const numeric = value => raw(value) === '' ? NaN : Number(value);

export function calculateShutterDimensions(input = {}) {
  const { style } = input;
  const outerW = numeric(input.outerW), outerH = numeric(input.outerH), boardT = numeric(input.boardT), count = numeric(input.count);
  const issues = [];
  const add = (field, message) => issues.push({ field, message });
  if (style === 'open') return { valid: true, width: 0, height: 0, issues: [], schemaVersion: SHUTTER_SIZING_VERSION };
  if (!['hinged', 'sliding'].includes(style)) add('style', 'Select hinged, sliding or open-front construction.');
  if (!(Number.isFinite(outerW) && outerW > 0)) add('outerW', 'Cabinet outer width must be positive and numeric.');
  if (!(Number.isFinite(outerH) && outerH > 0)) add('outerH', 'Cabinet outer height must be positive and numeric.');
  if (!(Number.isFinite(boardT) && boardT > 0)) add('boardT', 'Carcass board thickness must be positive and numeric.');
  if (!(Number.isInteger(count) && count > 0 && count <= 100)) add('count', 'Shutter count must be a whole number from 1 to 100.');
  if (issues.length) return { valid: false, width: 0, height: 0, issues, schemaVersion: SHUTTER_SIZING_VERSION };

  let width, height, widthLimit, heightLimit;
  const required = (field, label, positive = false) => {
    const v = numeric(input[field]);
    if (!Number.isFinite(v) || (positive ? v <= 0 : v < 0)) add(field, label + (positive ? ' must be greater than zero.' : ' must be a finite, non-negative value; enter zero explicitly if applicable.'));
    return v;
  };
  if (style === 'hinged') {
    if (!raw(input.hingeBrand) || !raw(input.hingeModel)) add('hingeModel', 'Select the hinge brand and exact model.');
    if (!raw(input.doorDataReference)) add('doorDataReference', 'Enter the hinge manufacturer datasheet or approved design reference.');
    const fit = raw(input.doorFit);
    if (!['inset', 'overlay'].includes(fit)) add('doorFit', 'Choose inset or overlay shutter construction.');
    widthLimit = required('doorMaxWidth', 'Maximum shutter width', true);
    heightLimit = required('doorMaxHeight', 'Maximum shutter height', true);
    const meeting = required('doorMeetingGap', 'Meeting gap');
    const openingW = outerW - 2 * boardT, openingH = outerH - 2 * boardT;
    if (fit === 'inset') {
      const side = required('doorSideClearance', 'Side clearance');
      const top = required('doorTopClearance', 'Top clearance');
      const bottom = required('doorBottomClearance', 'Bottom clearance');
      width = (openingW - 2 * side - (count - 1) * meeting) / count;
      height = openingH - top - bottom;
    } else if (fit === 'overlay') {
      const side = required('doorOverlaySide', 'Side overlay');
      const top = required('doorOverlayTop', 'Top overlay');
      const bottom = required('doorOverlayBottom', 'Bottom overlay');
      width = (openingW + 2 * side - (count - 1) * meeting) / count;
      height = openingH + top + bottom;
    }
  } else {
    if (!raw(input.slidingModel)) add('slidingModel', 'Enter the exact sliding-track model or series.');
    if (!raw(input.slidingDataReference)) add('slidingDataReference', 'Enter the sliding-track manufacturer datasheet or approved design reference.');
    widthLimit = required('slidingMaxWidth', 'Maximum sliding panel width', true);
    heightLimit = required('slidingMaxHeight', 'Maximum sliding panel height', true);
    const side = required('slidingSideClearance', 'Sliding side clearance');
    const top = required('slidingTopClearance', 'Sliding top clearance');
    const bottom = required('slidingBottomClearance', 'Sliding bottom clearance');
    const overlap = required('slidingOverlap', 'Sliding panel overlap');
    const openingW = outerW - 2 * boardT, openingH = outerH - 2 * boardT;
    width = (openingW - 2 * side + (count - 1) * overlap) / count;
    height = openingH - top - bottom;
  }
  if (issues.length) return { valid: false, width: 0, height: 0, issues, schemaVersion: SHUTTER_SIZING_VERSION };
  if (!(width > 0 && height > 0)) add('dimensions', 'The selected clearances produce a non-positive shutter size.');
  if (width > widthLimit || height > heightLimit) add('dimensions', 'Calculated shutter ' + Math.round(width) + ' × ' + Math.round(height) + ' mm exceeds the entered system limit ' + widthLimit + ' × ' + heightLimit + ' mm.');
  if (issues.length) return { valid: false, width: 0, height: 0, issues, calculatedWidthMm: width, calculatedHeightMm: height, schemaVersion: SHUTTER_SIZING_VERSION };
  return { valid: true, width: Math.round(width), height: Math.round(height), calculatedWidthMm: width, calculatedHeightMm: height, issues: [], schemaVersion: SHUTTER_SIZING_VERSION };
}