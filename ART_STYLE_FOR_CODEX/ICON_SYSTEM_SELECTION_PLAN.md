# Icon System Selection — 2026-10-13

## Confirmed product decisions

- Every dialogue scenario receives a distinct icon.
- AI-off receives a distinct state icon; sparkles remain AI-on only.
- Both remaining Home 1.0 tiles are replaced.
- The Spire receives a six-rank badge family.
- The streak receives ten flame tiers and a freeze state.
- Spanish and French receive dedicated flags.

## Selection model

The user chooses five visually different candidates for **each requested icon**.
Five representative family samples are not a substitute for the requested icons.
Every streak tier, rank badge and dialogue scenario must have its own choices.
The interactive preview preserves the original Claude mockup layouts.

| Family | Final production scope | Selection deliverable |
| --- | ---: | --- |
| Spire ranks | 6 badges × dark/light × base/accent | 5 candidates per badge; all 12 league names visible |
| Streak | 10 tiers + freeze × dark/light × base/accent | 5 candidates per tier and freeze state |
| 500-day crown | dark/light × base/accent | 5 candidates |
| Dialogue themes and scenarios | 15 requested topic icons plus every actual scenario × dark/light × base/accent | 5 candidates per requested icon; scenario inventory comes from code |
| AI-off | dark/light × base/accent | 5 candidates |
| Home 1.0 replacements | 2 tiles × dark/light × base/accent | 5 candidates per tile |
| Flags | ES + FR × dark/light × base/accent | 5 material treatments per flag |

## Delivery order

1. Inventory the actual slots and existing candidates on disk.
2. Create five candidates per requested slot with matching dark/light and accent layers.
3. Put each candidate in its actual original screen and support independent selection.
4. Retain the original named themes, dark/light controls and sliders.
5. Build optional tower alternatives from the existing interactive SVG floor construction;
   never generate tower raster artwork. Preview all 12 actual leagues and all 15 floors.
6. Verify the complete required set and the interactive controls before claiming completion.

## Asset safety

- Exploratory outputs remain only in `ART_STYLE_FOR_CODEX/trials/`.
- No current app asset is replaced until the user selects a candidate.
- Every production asset is a transparent RGBA base plus a separate white `.accent` layer.
