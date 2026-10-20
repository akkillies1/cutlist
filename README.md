# DCODE Cutting List Preparator

Browser-based tool for extracting candidate panel dimensions from 2D drawings and preparing a reviewable cutting list.

## Current implementation

This repository mirrors the source deployed on Hatchable as version 13.

- `public/index.html` — application shell and UI.
- `public/theme.css` — application styles.
- `public/app.js` — drawing ingestion, OCR, dimension parsing, page review, part editing, and export workflow.
- `public/favicon.svg` — app favicon.
- `hatchable.toml` — Hatchable project configuration.

## OCR and stability improvements in v13

- Bounds PDF page rasterization to reduce large canvas allocations.
- Bounds image previews to approximately 4 megapixels before processing.
- Uses a bounded OCR canvas and one primary Tesseract recognition pass instead of repeatedly creating several large variants.
- Parses quantity annotations such as `QTY 2`, `QTY 4`, and `3 PCS`, and carries the quantity into detected candidates.
- Keeps detected dimensions in a page-by-page review workflow so users can inspect candidates before accepting them.

## Validation performed

Synthetic browser tests passed for:

- OCR of clear printed dimension labels.
- Parsing dimensions and quantities from `720 x 560 mm QTY 2`, `600 x 450 mm QTY 4`, and `2100 x 450 mm 3 PCS`.
- Accepting two synthetic candidates into the cutting list with quantities preserved.
- Reaching the end of the page review workflow without a browser error.

These tests are smoke tests, not a measured production accuracy benchmark.

## Known limitations / next validation

- Real, complex, multi-page architectural or cabinet drawings have not yet been benchmarked after the optimization.
- OCR confidence is not the same as dimension correctness; every extracted part must be reviewed.
- Duplicate-view detection across elevations, plans, and sections still needs real-drawing validation.
- No 1% extraction-error claim is established.
- The current OCR path is browser-side OCR and deterministic parsing; this repository does not currently implement a dedicated AI/LLM extraction endpoint.

## Running locally

Because this is a static browser app, serve the repository root with any local static HTTP server and open `public/index.html` through that server. OCR/PDF libraries are loaded by the app as configured in the HTML, so network access may be required unless those dependencies are hosted locally.

## Deployment note

Hatchable remains the deployed runtime. Changes made directly to this GitHub repository do not automatically update the Hatchable deployment unless a separate deployment/sync workflow is configured.
