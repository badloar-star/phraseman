# Task packet: two owner decisions for mockups and the parity rule (crash screen text, font scale)

Governance-ID: TG-7EE1C1C1133F
Status: In progress
Owner: App Check session (Claude), lane 3
Related epic/enabler: coordinator relay of owner decisions 04.10

## Outcome

The words "Прогресс сохранён." are removed from the crash screen mockup system_12 (system.html). The parity rule states that during comparison the unified type scale 16/13 (D145, 01.10) wins over font sizes of old mockups: a size difference that obeys the scale is not a difference.

## Scope

In scope: docs/design/v2-app/system.html (one string), docs/phraseman-2.0/PORT_READY_GATE.md (rule text), scripts/port_ready_gate.mjs header comment. Out of scope: coins.html (the owner named only system_12), application code.

## Architecture

Text-only mockup edit and documentation of a comparison rule; the gate logic does not compare fonts automatically.

## Security and privacy

No data or services. No privacy impact.

## Technical debt

Contain: the rule lives in one place (PORT_READY_GATE.md) and is referenced from the script header.

## Verification

grep shows the phrase gone from system.html; the overlap scan for system stays clean.

## Rollback

Revert the commit.
