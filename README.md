# DCODE Cutting List Preparator

Browser-based tool for extracting candidate panel dimensions from 2D drawings and preparing a reviewable cutting list.

## Current implementation

This repository mirrors the source deployed on Hatchable as version 15.

- `public/index.html` — application shell and workflow copy.
- `public/theme.css` — application styles.
- `public/app.js` — drawing ingestion, OCR, dimension parsing, page review, part editing, contour assistance, and export workflow.
- `public/favicon.svg` — app favicon.
- `hatchable.toml` — Hatchable project configuration.

## Stability and review improvements

- Bounds PDF rasterization and image previews to reduce large canvas allocations.
- Uses a bounded OCR canvas and one primary Tesseract recognition pass instead of repeatedly creating large variants.
- Parses quantity annotations such as `QTY 2`, `QTY 4`, and `3 PCS`, associating each dimension pair with its nearest annotation even when PDF text is flattened onto one line.
- Downscales OpenCV contour detection to a 1.5-megapixel working image and maps outline coordinates back to the preview.
- Shows a warning when a candidate dimension pair is similar to an already accepted part or an earlier candidate on the same page. Similar dimensions are never automatically removed because multiple real panels can share a size.
- Corrects UI copy so it no longer claims automatic duplicate-page suppression or OCR retry passes that are not implemented.
- Keeps page-by-page review and manual measurement entry; extracted candidates remain unconfirmed until the user checks them.

## Validation performed

Synthetic browser smoke tests previously passed for:

- OCR of clear printed dimension labels.
- Parsing dimensions and quantities from `720 x 560 mm QTY 2`, `600 x 450 mm QTY 4`, and `2100 x 450 mm 3 PCS`.
- Accepting two synthetic candidates into the cutting list with quantities preserved.
- Reaching the end of the page review workflow without a browser error.

For version 14, the deployed page loaded in browser verification without page errors, and the Hatchable deploy validator reported no errors or warnings. The updated geometry detector and repeated-size warnings still need validation against real architectural drawings.

These are smoke tests, not a measured production accuracy benchmark.

## Known limitations / next validation

- Real, complex, multi-page architectural or cabinet drawings have not yet been benchmarked after the optimization.
- OCR confidence is not the same as dimension correctness; every extracted part must be reviewed.
- Similar dimensions are only a warning, not robust duplicate-view detection across elevations, plans, and sections.
- No 1% extraction-error claim is established.
- The app currently uses browser-side OCR and deterministic parsing; it does not implement a dedicated AI/LLM extraction endpoint.
- DXF import supports closed, axis-aligned rectangular polylines only. Blocks, nested assemblies, rotated profiles, cut-outs, arcs, and splines can be missed.
- DWG files must be converted to DXF first.
- The sheet count is a preliminary 2D MaxRects estimate, not a machine-validated cutting layout.

## Running locally

Serve the repository root with a local static HTTP server and open `public/index.html` through that server. OCR/PDF libraries are loaded from configured CDNs, so network access may be required unless those dependencies are hosted locally.

## Deployment note

Hatchable remains the deployed runtime. Changes made directly to this GitHub repository do not automatically update the Hatchable deployment unless a separate deployment/sync workflow is configured.
