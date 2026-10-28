# Local-data migration contract — DCODE Low Balance

## Initial legacy-store inventory
This list is a starting inventory; inspect all read/write sites and actual object variants before implementing an importer.

- dcode-cutting-list-draft-v1 — cutting-list draft; source code validates version 1 and restores parts, source name and UI settings.
- dcode-interior-design-v1 — main design draft.
- dcode-interior-projects-v2 — project hub records; inspect nested room/design snapshots and version-2 conversion.
- dcode-designer-cutlist-v1 — designer-generated manufacturing parts.
- dcode-assembly-studio-v1 — assembly state; compatibility handling accepts versions 1–3.
- dcode-room-planner-v1 — room planner state.
- dcode-kitchen-plan-v1 — kitchen planner settings and derived geometry.
- dcode-panel-geometry-v1 — panel geometry inputs.
- dcode-interior-saved-templates-v1 — reusable design templates.
- dcode-saved-kitchen-layouts-v1 — reusable kitchen layouts.
- dcode-nemotron-ocr-byok-v1 — provider configuration may contain an API key; never import it into project/workspace records or share it with workspace members.

## Migration invariants
1. Never erase local keys during initial import.
2. Preserve original payloads and produce an import report.
3. Never assume unknown units or fields; flag them for review.
4. Never promote extracted/calculated dimensions to approved status.
5. Preserve source drawing references and source page/region where available.
6. Use idempotency keys so retries do not duplicate data.
7. Enforce immutability after approval/release before production.
8. Never sync API secrets in ordinary JSON snapshots.
9. Require a verified backup and tested restore before cloud persistence becomes default.
