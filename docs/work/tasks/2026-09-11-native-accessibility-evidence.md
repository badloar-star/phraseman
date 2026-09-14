# Task Packet: Native Accessibility Evidence Pack

## Scope

- Define a repeatable matrix for Tier 0 native journeys covering VoiceOver/TalkBack, font scaling, contrast, targets, focus, reduced motion and reachability.
- Add static coverage for evidence fields without claiming device results.

## Non-goals

- No emulator/device automation, screenshots, app UI changes, or production mutation.
- No declaration that accessibility passes without physical-device evidence.

## Technical debt

- Manual evidence remains explicitly pending per journey/platform and must be scheduled separately.
- Each remediation gets its own packet to prevent broad UI regressions.

## Verification

- `node --test tests/native_accessibility_contract.test.mjs`

## Evidence

- GREEN: `node --test tests/native_accessibility_contract.test.mjs` (1/1).

## Status

Matrix baseline complete; all device evidence remains explicitly pending.
