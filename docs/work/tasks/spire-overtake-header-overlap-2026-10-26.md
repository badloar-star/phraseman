# Spire overtake toast overlaps community navigation

Owner screenshot: `codex-clipboard-8047095e-8d68-4054-b7e5-3da021df8080.png`.

Cause: the toast used only the system safe-area inset while the community navigation header overlays the Spire scene. The scene already publishes its measured header height through `spire_header_overlay`; the toast did not consume it.

Fix: position the toast's overlay below the larger of the measured header and safe-area inset, with a 12 dp gap for the card. Clip its upward entrance animation to that content area so it cannot cross the navigation controls. Compensate the decorative coin's local position to retain its previous screen position.

Verification: `spire_position_moments_contract.test.tsx` and `spire_position_moments_host_contract.test.tsx`: 19 tests passed. Regression changes the measured header height from 104 to 140 to 0 and checks clearance, clipping and the safe-area fallback. Diff whitespace check passed. Device screenshot verification has not been performed.
