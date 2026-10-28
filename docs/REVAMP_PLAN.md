# DCODE Furniture Designer Revamp Plan

## Objective
Revamp DCODE Low Balance / Furniture Designer into a dependable design-to-manufacturing workflow while keeping design independent from supplier pricing. The first implementation milestone adds a separate Hardware Rate Register prototype; it does not change manufacturing geometry or release gates.

## Non-negotiable product rules
- Missing, stale, or unselected hardware rates never block room planning or furniture design.
- Design requirements are generated from the chosen furniture configuration; supplier quotations are collected later.
- Historical prices are indicative only and must retain their quotation date and tax basis.
- GST is configurable; the current register baseline is 18% extra, as provided by the user.
- Supplier selection is manual per item. Lowest-price hints are informational and never silently select a supplier.
- Compare rates only after checking exact model/SKU, unit, pack size, scope and technical equivalence.
- A rate change must not invalidate geometry. A hardware model/dimension change may trigger technical revalidation.
- 2D geometry remains the manufacturing authority; 3D is visual only.
- Manufacturing release requires technical checks, part review, current geometry/specification, and responsible human approval. No UI label is automatic factory/CNC authorisation.
- Preserve the existing design, project, drawing and cut-list workflows; no demo data should be introduced into users' active projects.

## Confirmed workflow
1. Project and room setup.
2. Furniture identity and start mode.
3. Room layout and editable unit templates.
4. Components and geometry.
5. Hardware/accessory requirements.
6. Dimensions, room fit and hardware compatibility.
7. Materials, finish and manufacturing specifications.
8. Design review and release readiness.
9. Separate procurement workflow: provisional estimate -> request supplier quotations -> compare equivalent offers -> user selects supplier per line -> sanction and snapshot the rate version -> procurement.

## Milestone 1 — Hardware Rate Register prototype (current branch)
- Add a separate Hardware Rate Register page linked from the design workspace.
- Seed 35 items and the three supplied supplier columns as an October 2026 draft historical quote baseline.
- Preserve blank supplier rates as missing, never zero.
- Support per-item supplier selection, editable quantities/units/rates, exact model/SKU and notes.
- Show selected line totals before GST and totals for priced lines with configurable GST (initial 18%).
- Store version snapshots and a local JSON backup/export CSV.
- Make the storage limitation visible: this prototype stores revisions in the current browser and does not enforce authenticated approval.
- No supplier rate is required to use the Design Studio.
- No live deployment until validation and explicit release decision.

## Milestone 2 — Verification and rate workflow
- Add per-supplier quotation date, quotation/invoice reference, validity, availability, lead time, tax treatment, discount and delivery terms.
- Establish stable product IDs separately from supplier offers.
- Add statuses: historical quote, awaiting quote, entered/unverified, variance review, sanctioned, expired, superseded.
- Compare like-for-like model and unit; record why a different product is accepted.
- Compute price variance against the last sanctioned rate on the same tax/unit basis.
- Define role-aware approval and immutable audit events.

## Milestone 3 — Integrate with estimates and projects
- Build hardware requirement rows from design components and quantities.
- Use historical sanctioned rates as dated suggestions only; let the estimator accept, replace, or leave rate pending.
- Separate budget cost, supplier quoted cost and actual invoice/procurement cost.
- Preserve estimate snapshots so later rate revisions never silently alter issued estimates.
- Missing price affects cost completeness, not design progression.
- Avoid adding hardware prices to geometry state or geometry freshness fingerprints.

## Milestone 4 — Geometry and manufacturing reliability
- Keep 2D-to-cut-list traceability explicit and tested.
- Require regeneration after geometry/specification changes and preserve manual overrides for reconciliation.
- Validate door/hinge and drawer/runner sizing only when exact manufacturer model and required clearances are supplied.
- Continue part-level checks for material, finish, grain, edge-band, liner/backer and dimensions.
- Do not treat a rendered preview, a valid arithmetic result, or a user-entered datasheet URL as manufacturer verification.
- Keep release blocked for unresolved critical technical checks, stale geometry, invalid parts, unresolved reconciliation, or missing required specifications.

## Milestone 5 — Validation and rollout
- Unit tests for rate arithmetic, GST, missing rates, supplier selection, version snapshots, and variance.
- Regression tests proving missing rates do not stop steps 1–8 or change geometry.
- Test that rate edits do not stale a cut list, while model/clearance/geometry edits trigger the correct technical checks.
- Test restore-as-new-version and estimate snapshot immutability.
- Desktop and mobile interaction checks; browser console and deploy validator checks.
- Deploy only after a preview review; merge feature branch only after acceptance.

## Current implementation status
- Milestone 1 UI prototype has been added on the Hatchable project as an unpublished draft and on this GitHub feature branch.
- The existing live deployment has not been changed.
- The initial register is local-browser storage, not yet shared across users.
- Automated syntax/deploy validation is still required; browser interaction and mobile regression testing remain outstanding.
