# Task packet: PM-134 evidence refresh and result handler rename; PM-073 and PM-134 closure

Governance-ID: TG-C05D95FDE448
Status: In progress
Owner: Claude session «App Check» (82577f25), independent reviewer, by coordinator (2026-10-04)
Related epic/enabler: PM-134 unused controls in training modes, PM-073 coin designs

## Outcome

The PM-134 evidence describes the current swipe screen (the duplicate Settings button is removed), refers to the reviewed commit, and the swipe screen's result handler carries the name of what it does (exit) instead of the old name openSettings. PM-073 and PM-134 are closed in the registry after the independent PASS verdicts.

## Scope

In scope: docs/phraseman-2.0/evidence/PM-134_buttons_purpose.md, one rename inside app/flashcards_swipe.tsx (definition and its single use), registry blocks of PM-073 and PM-134.
Out of scope: any behaviour change, the PM-034 rework (assigned to Design).

## Architecture

A pure rename of a local callback; the callback body and its single call site stay identical.

## Security and privacy

None: a documentation edit and a local identifier rename.

## Technical debt

- Contain: the explanatory comment above the callback still tells the history of the removed settings button; kept as context.

## Verification

Type check and swipe suites stay green; registry validator reports no error for the two tasks.

## Rollback

Revert the commit.
