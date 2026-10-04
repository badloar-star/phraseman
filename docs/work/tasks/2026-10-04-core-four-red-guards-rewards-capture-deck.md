# Task packet: four old red guards (mistake rewards x2, lesson capture, deck options)

Governance-ID: TG-5E12D6578C55
Governance-ID: TG-D860A940FD60
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: D02/D70 (XP removed in 2.0), PM-229 (silent catches log their reason)

## Outcome

tests/mistake_practice_rewards.test.ts and tests/mistake_practice_reward_account_race.test.ts describe the reward after XP was removed (one coin per corrected mistake cycle, idempotent, one wallet claim); tests/mistake_practice_lesson_capture_contract.test.ts expects what lesson1 really captures; tests/fc_deck_options*.test.ts build again with the account-generation stub that the code now needs. Each change is by meaning, with a reason comment; a real regression is reported, not hidden.

## Scope

In scope: the listed test files only. Out of scope: product code (changed only if a real regression is found and reported first).

## Architecture

No architecture change.

## Security and privacy

None: tests only.

## Technical debt

- Pay now: four red guards describing retired behaviour.

## Verification

The four suites run green; type check clean.

## Rollback

Revert the commit.

Дополнение 04.10 (по просьбе координатора): speaking_hold_ui_contract, speaking_daily_quota_wiring_contract, registration_prompt_recovery_ui_contract и AST/хеш-сторож «Устно» (flashcards_speaking_liquid_glass_source_contract) — по смыслу, только тесты.
