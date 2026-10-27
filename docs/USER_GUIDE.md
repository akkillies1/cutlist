# DCODE Cutting List Preparator — User Field Guide

**Audience:** designers, estimators, drawing reviewers and factory users. This is the operating manual for the app. Follow the checks every time; do not treat a preview or automatic check as manufacturing approval.

## The safest end-to-end workflow

1. **Choose your route.** Use **Design Studio** for a new cabinet or room design; **Panel Geometry** for one measured panel; **Assembly Builder** for a multi-panel assembly; **Cutting List Preparator** when you already have a drawing.
2. **Name the job and keep backups.** Use clear job, room and unit names. This standalone app saves work in the current browser's local storage; it does not automatically sync across devices. Keep the source drawing and use project/design JSON exports where available.
3. **Enter measured dimensions.** Design and geometry fields use millimetres unless specified otherwise. Verify site dimensions, openings, levels, wall conditions, fillers, appliance clearances and obstructions.
4. **Configure construction.** Specify board thicknesses, back style, shelves, partitions, shutters, drawers, lofts, profiles and accessories. Brand name alone is not enough to determine hardware clearance; use the exact model and current manufacturer drawing.
5. **Compare 2D and 3D.** Inspect plan, front/main elevation, return elevation, side/section and 3D. Look for wrong orientation, missing components, collisions, gaps and dimension disagreements.
6. **Review every cut-list row.** Check length, width, thickness, quantity, material/grade, decor code, finish, grain, edge-band coverage/thickness, liner/backer and machining notes. Resolve every “Verify”, “Not set” and unknown value.
7. **Regenerate after geometry changes.** Rebuild the cut list from the current design, then inspect it again. Review manual/imported rows for duplicates and confirm that they belong to the current job.
8. **Export only after review.** Keep exported CSV/SVG and a project backup beside the source drawing and revision. A completed checklist records human review; it is not automatic factory or CNC authorisation.

## 1. Design Studio — new cabinet or room furniture

Use the guided wizard in sequence:

1. **Project** — name the job.
2. **Space & cabinet** — identify the room/zone and unit.
3. **Room layout & unit templates** — choose the unit template and room arrangement where applicable.
4. **Dimensions & room fit** — enter room and cabinet dimensions and review clearances.
5. **Accessories** — choose fittings; unknown models remain unverified.
6. **Components** — inspect shutters, shelves, drawers, partitions and custom components.
7. **Materials & hardware specs** — specify board, grade, surface finish, decor code, edge band, hinge/runner/connector and drilling references.
8. **Design review & release** — compare views and inspect every manufacturing row. Tick review gates only after performing the check.

If the wizard blocks progression, read the inline error and correct the named field. Do not enter guessed values just to continue.

![Actual Design Studio interface](https://dcode-cutting-list.hatchable.site/guide-assets/01-design-studio.jpg)

## 2. Panel Geometry — one panel

Use **Dimensions** for a rectangular panel or **3-point geometry** for a panel defined by measured points. Set name, working plane/orientation, thickness and offsets. Inspect **Front/Face**, **Plan/Top** and **Side/Edge**. Switch to **3D orbit** and adjust yaw/elevation to inspect orientation and extrusion. Export the 2D SVG if needed.

**Add panel to Cutlist** sends an unapproved proposal. Check the material, grain, edge treatment and finished-versus-cut-size convention before approving the row.

![Actual Panel Geometry interface](https://dcode-cutting-list.hatchable.site/guide-assets/02-panel-geometry.jpg)

## 3. Assembly Builder — multi-panel assembly

Choose a preset (wardrobe carcass, mirror wardrobe, TV console or empty assembly), enter overall dimensions and construction parameters, then build it. Review the constraint report, component list, front/plan/side views and 3D assembly. For manual objects, ensure dimensions, orientation and lower-corner coordinates are correct.

Board panels transfer to the board cut list; mirror, glass and hardware belong to separate schedules. A zero-intersection report does **not** prove joinery, screw positions, pilot holes, connector locations or hardware compliance.

![Actual Assembly Builder 3D interface](https://dcode-cutting-list.hatchable.site/guide-assets/03-assembly-3d.jpg)

## 4. Manufacturing Cutlist — part-by-part review

Treat this as a manufacturing review queue. Check dimensions and quantity first, then material and finishing data. Unknowns must remain marked for verification. Fill all fields affecting manufacture on manual rows. Before export, confirm the list is current and includes only the intended source rows.

![Actual Manufacturing Cutlist interface](https://dcode-cutting-list.hatchable.site/guide-assets/04-manufacturing-cutlist.jpg)

## 5. Cutting List Preparator — existing drawings

Start from the real source drawing, not example data. Import options shown in the app include DXF, SVG, PDF, PNG/JPG and DWG. Prefer CAD vector files where available; convert DWG to DXF if necessary. Review multi-page drawings page by page, accept only relevant pages, and inspect the consolidated list.

Treat extracted labels and dimensions as **candidates**. Confirm each against the original drawing, scale, dimension line and part outline. OCR/AI suggestions are not authoritative measurements. Do not automatically delete repeated dimensions; investigate whether they belong to another view or part.

## 6. How to verify 2D against 3D

- Confirm both views use the same unit and design revision.
- Compare overall width, height and depth first.
- Check board thickness, back style, shelves, partitions, lofts, doors, drawers and gaps.
- Confirm orientation and the side from which dimensions are measured.
- After changing a geometry-driving input, wait for redraw, then re-check the relevant views and cut list.
- If drawing, 3D and cut-list dimensions disagree, **stop and do not export**. Save a backup and report the exact inputs with a screenshot.
- A 3D preview is a coordination aid, not a finish sample or machining simulation.

## 7. Materials and manufacturing details

- **Material/grade:** specify the actual board and verify the supplier datasheet.
- **Surface/decor:** record brand, collection, exact decor code and finish. A screen colour picker is only a visual hint.
- **Grain:** specify direction per part and verify cutting/nesting orientation.
- **Edge band:** specify exposed edges, thickness and matching colour/code.
- **Liner/backer:** include only when called for by the drawing/specification.
- **Hinges, sliding systems and runners:** record exact model and current manufacturer clearances, overlays, drilling patterns and limits.
- **Machining:** verify boring, grooves, connectors, pilot holes and profiles against an approved manufacturing drawing when the app does not generate them.

## 8. Save, backup and restore

The standalone app uses browser-local storage. Work can be lost if site data is cleared and will not automatically follow you to another device.

1. Keep original CAD/PDF files in a named job folder outside the browser.
2. Export project/design JSON where available.
3. Save CSV and SVG exports alongside the source drawing and revision.
4. After restore/import, verify project identity, dimensions, part count, material fields and source revision.
5. Do not assume separate workspaces share identical project state; confirm panel/assembly handoffs reached the intended cut list.

## 9. Troubleshooting

| Problem | Recommended action |
|---|---|
| Wizard will not continue | Correct the field named by the inline error using a measured positive value. |
| A view appears blank or old | Re-select the view and check required inputs. Save/export a backup before reloading. |
| 2D and 3D disagree | Stop handoff; compare input values and construction settings and reproduce the mismatch. |
| Cut list reports stale/design changed | Regenerate from the current design, inspect retained manual/imported rows for duplicates, and re-check affected parts. |
| Extracted dimensions look suspicious | Compare with the original vector geometry, dimension line and known scale. Correct manually. |
| Material/finish is unknown | Keep Verify/Not set and obtain the supplier specification. |
| Hardware model is not exact | Do not infer clearances; obtain the current manufacturer drawing and record its reference/revision. |
| Work is missing on another device | Check the original browser/device and backups; local browser data does not automatically sync. |

## 10. Pre-release checklist

- [ ] Correct job, room, unit and drawing revision.
- [ ] Site dimensions, openings and obstructions checked.
- [ ] 2D views compared with the 3D preview.
- [ ] Every part's dimensions, thickness and quantity checked.
- [ ] Material, grade, decor, finish, grain, edge band and liner/backer confirmed or explicitly held for verification.
- [ ] Exact hardware models, clearances and machining references checked.
- [ ] Cut list regenerated after geometry changes; duplicates and retained imported/manual rows investigated.
- [ ] CSV/SVG/project backup saved with the source drawing.
- [ ] Responsible human approval obtained before factory/CNC release.

**Golden rule:** if a value is unknown, a view disagrees, or the drawing revision is uncertain, stop and verify. Never manufacture from an unreviewed extraction or preview.
