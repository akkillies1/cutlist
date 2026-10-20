# DCODE Cutting List Preparator

Browser-based tool for extracting candidate panel dimensions from 2D drawings and preparing a reviewable cutting list.

## Current implementation

This repository mirrors the source deployed on Hatchable as version 17.

- `public/index.html` — application shell and workflow copy.
- `public/theme.css` — application styles.
- `public/app.js` — drawing ingestion, OCR, dimension/quantity parsing, metadata extraction, page review, part editing, contour assistance, and export workflow.
- `public/favicon.svg` — app favicon.
- `hatchable.toml` — Hatchable project configuration.

## Stability and extraction improvements

- Bounds PDF rasterization and image previews to reduce large canvas allocations.
- Uses a bounded contrast-enhanced OCR pass plus one threshold fallback only when the primary pass finds no dimension pairs. The fallback reuses the same canvas to limit memory.
- Groups native PDF text items by their baseline instead of flattening the entire page to a single text line, improving label/dimension/quantity association.
- Parses dimensions, nearby explicit quantities (for example `QTY 2`, `QTY 4`, `3 PCS`), and part labels when they precede the dimension pair.
- Reads explicitly labelled finish, colour, decor code, grain direction, edge-band edges/thickness, and liner/backer notes when present in the same text line.
- Adds per-part fields for grain orientation, edge-band edges, edge-band thickness, and liner/backer; includes them in the factory CSV and grouping summary.
- Does not invent drawing-derived finish, colour, decor code, grain, edge band, or liner values. Missing values are marked Verify/Not set; explicit drawing annotations may prefill the fields.
- Downscales OpenCV contour detection to a 1.5-megapixel working image and maps detected coordinates back to the preview.
- Shows a warning when candidate dimensions resemble an already accepted part or an earlier candidate on the same page. Similar dimensions are never automatically removed because multiple real panels can share a size.
- Keeps page-by-page review and manual measurement entry; extracted candidates remain unconfirmed until checked.

## Validation performed

Browser smoke tests on the deployed v17 build passed for:

- Loading the app without page errors.
- Rendering the expanded cut-list columns and default manufacturing controls.
- Parsing printed dimensions and quantities from `720 x 560 mm QTY 2`, `600 x 450 mm QTY 4`, and `2100 x 450 mm 3 PCS`.
- Parsing explicitly labelled metadata from a sample line: colour `Walnut`, decor `WN-220`, grain `Along length`, edge band `All 4 edges`, edge band thickness `1 mm`, liner `White Liner`, and finish `Laminate`.

These are synthetic smoke tests, not a measured accuracy benchmark on the user's real 21-page drawing. Real drawing extraction still needs validation against a manually verified cutting list.

## Known limitations / next validation

- The supplied 21-page PDF has not been available as a file in this source-editing session, so page 5's zero-candidate result cannot yet be reproduced against the actual drawing.
- OCR confidence is not the same as dimension correctness; every extracted part must be reviewed.
- Similar dimensions are only a warning, not robust duplicate-view detection across elevations, plans, and sections.
- No 1% extraction-error claim is established.
- The app uses browser-side OCR and deterministic parsing; it does not implement a dedicated AI/LLM extraction endpoint.
- Grain, colour, edge-band and liner are inferred only from explicit text annotations. Symbols, hatch patterns, grain arrows and visual edge-band marks are not yet interpreted reliably.
- DXF import supports closed, axis-aligned rectangular polylines only. Blocks, nested assemblies, rotated profiles, cut-outs, arcs, and splines can be missed.
- DWG files must be converted to DXF first.
- The sheet count is a preliminary 2D MaxRects estimate, not a machine-validated cutting layout.

## Running locally

Serve the repository root with a local static HTTP server and open `public/index.html` through that server. OCR/PDF libraries are loaded from configured CDNs, so network access may be required unless those dependencies are hosted locally.

## Deployment note

Hatchable remains the deployed runtime. Changes made directly to this GitHub repository do not automatically update the Hatchable deployment unless a separate deployment/sync workflow is configured.
