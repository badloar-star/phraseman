# Task packet: instant-open fixes batch (achievements, language picker, subscription, comments, explanation cache, lessons warmup)

Governance-ID: TG-6343950A7A99
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: owner rule "every section opens instantly"

## Outcome

Sections listed in the audit open from cache or an in-memory last state on the first frame; network and storage reads continue in the background and only replace the seed when fresh data arrives. Skeletons stay for the very first open without any cache, on the block only.

## Scope

In scope: app/achievements_screen.tsx (last states by account), and the other audit rows in files without foreign uncommitted edits, each with a source contract and type check. The statsCache boot hydration row is a ghost (already done in _layout at bootstrap).
Out of scope: settings.tsx (AccountV2 first), the Plus paywall access wait and mistakes_hub_contract (Core), production data reads (coordinator).

## Architecture

Module-level last-known value keyed by the in-memory stable id; first render reads it synchronously, the existing effect remains the authority.

## Security and privacy

The seed is keyed by account so one account never sees another's cached state on the first frame.

## Technical debt

- Contain: memory seeds do not survive a cold start; a disk snapshot would.

## Verification

Source contracts for each seeded screen; type check; related suites.

## Rollback

Revert the commit.
