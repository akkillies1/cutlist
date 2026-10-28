/* DCODE hardware-dependent sizing gates. Values must come from the selected manufacturer's documentation. */
export const MANUFACTURING_SYSTEM_VALIDATION_VERSION = 'dcode.manufacturing-system-validation.v1';

const text = value => String(value ?? '').trim();
const hasText = value => text(value) !== '' && !['verify', 'not selected', 'not specified', 'not set', 'unspecified', 'verify drilling pattern'].includes(text(value).toLowerCase());
const finiteNonNegative = value => text(value) !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
const finitePositive = value => text(value) !== '' && Number.isFinite(Number(value)) && Number(value) > 0;

export function validateManufacturingSystemSpecs(input = {}) {
  const issues = [];
  const add = (field, message) => issues.push({ field, message });
  const doorCount = Number(input.doors ?? 0);
  const doorStyle = text(input.doorStyle).toLowerCase();

  if (doorCount > 0 && doorStyle === 'hinged') {
    if (!hasText(input.hingeBrand)) add('hingeBrand', 'Select the hinge manufacturer/brand for hinged shutters.');
    if (!hasText(input.hingeModel)) add('hingeModel', 'Enter the exact hinge model; a brand alone is not a drilling specification.');
    if (!hasText(input.doorDataReference)) add('doorDataReference', 'Add the manufacturer document or technical reference used for hinged-door sizing.');
    if (!hasText(input.doorFit)) add('doorFit', 'Confirm overlay, half-overlay or inset door fit.');
    for (const [field, label] of [['doorSideClearance','side clearance'], ['doorTopClearance','top clearance'], ['doorBottomClearance','bottom clearance'], ['doorMeetingGap','meeting gap']]) {
      if (!finiteNonNegative(input[field])) add(field, 'Enter the manufacturer/approved ' + label + ' in mm; zero must be entered explicitly if applicable.');
    }
    for (const [field, label] of [['doorMaxWidth','maximum door width'], ['doorMaxHeight','maximum door height']]) {
      if (!finitePositive(input[field])) add(field, 'Enter the verified system ' + label + ' in mm.');
    }
  }

  if (doorCount > 0 && doorStyle === 'sliding') {
    if (!hasText(input.slidingModel)) add('slidingModel', 'Select the exact sliding-door system model.');
    if (!hasText(input.slidingDataReference)) add('slidingDataReference', 'Add the selected sliding-system manufacturer technical reference.');
    for (const [field, label] of [['slidingSideClearance','side clearance'], ['slidingTopClearance','top clearance'], ['slidingBottomClearance','bottom clearance'], ['slidingOverlap','panel overlap']]) {
      if (!finiteNonNegative(input[field])) add(field, 'Enter the verified sliding-system ' + label + ' in mm.');
    }
    for (const [field, label] of [['slidingMaxWidth','maximum panel width'], ['slidingMaxHeight','maximum panel height']]) {
      if (!finitePositive(input[field])) add(field, 'Enter the verified sliding-system ' + label + ' in mm.');
    }
  }

  if (input.drawerBoxSizingEnabled === true && Number(input.drawers ?? 0) > 0) {
    if (!hasText(input.drawerRunnerBrand)) add('drawerRunnerBrand', 'Select the drawer-runner manufacturer/brand before sizing drawer boxes.');
    if (!hasText(input.drawerRunnerModel)) add('drawerRunnerModel', 'Enter the exact drawer-runner model before sizing drawer boxes.');
    if (!hasText(input.drawerRunnerDataReference)) add('drawerRunnerDataReference', 'Add the runner manufacturer document or technical reference.');
    if (!finitePositive(input.drawerRunnerLength)) add('drawerRunnerLength', 'Enter the selected runner length in mm.');
    if (!finiteNonNegative(input.drawerRunnerSideClearance)) add('drawerRunnerSideClearance', 'Enter the exact per-side runner clearance in mm.');
    if (!finiteNonNegative(input.drawerRunnerDepthAllowance)) add('drawerRunnerDepthAllowance', 'Enter the verified depth allowance in mm.');
    if (!finitePositive(input.drawerOpeningWidth)) add('drawerOpeningWidth', 'Enter the measured/approved drawer opening width in mm.');
    if (!finitePositive(input.drawerOpeningHeight)) add('drawerOpeningHeight', 'Enter the measured/approved drawer opening height in mm.');
    if (!finiteNonNegative(input.drawerTopClearance)) add('drawerTopClearance', 'Enter the verified drawer top clearance in mm.');
    if (!finiteNonNegative(input.drawerBottomClearance)) add('drawerBottomClearance', 'Enter the verified drawer bottom clearance in mm.');
  }
  return issues;
}
