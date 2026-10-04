# Task packet: update the stale use-audio clip fallback guard by meaning

Governance-ID: TG-C0268EF1B3B4
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: word audio reliability

## Outcome

tests/use_audio_contract.test.ts expects the clip-start timeout fallback in its current form. History shows the timer was never removed: commit f32242825 only wrapped the call to log the reason, so the old exact string no longer matched.

## Scope

In scope: one expectation in the guard test.
Out of scope: hooks/use-audio.ts behaviour.

## Architecture

None; test only. The guarded behaviour (slow clip falls back to system speech after CLIP_START_TIMEOUT_MS, no silence) is unchanged.

## Security and privacy

None.

## Technical debt

- Contain: guards that match exact source strings break on harmless refactors.

## Verification

use_audio_contract suite green.

## Rollback

Revert the commit.
