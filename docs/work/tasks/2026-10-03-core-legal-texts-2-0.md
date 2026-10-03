# Task packet: legal texts (privacy policy, terms of use) aligned to the real PhraseMan 2.0

Governance-ID: TG-E3DC804D929B
Governance-ID: TG-E0CD3DF6B0F7
Governance-ID: TG-43EE98D98627
Status: Done
Owner: Claude session «App Check» (82577f25), by coordinator §99 (2026-10-03); texts pre-approved by the owner ("одобряю тексты политики уже", 03.10, relayed by the coordinator)
Related epic/enabler: PM-229 follow-up audit FINAL_PHASE п.9 (leftovers of removed features), privacy policy must match data

## Outcome

privacy_policy_en(.ios).json and terms_of_use_en(.ios).json (+ synchronized copies) describe what 2.0 actually does: no Arena matches/duels/arena stars, gifts-as-mechanic, boosts, avatar items; everything 2.0 really collects is covered (AI dialogues and TTS, analytics, notifications, account deletion, Firestore profile fields). Policy date/version updated. `npm run legal:sync` run, the source-hash guards updated, a "was → became" list for the owner in the INBOX. Publishing is NOT done here (the coordinator deploys; I name the hosting target).

## Scope

In scope: legal/*.json (4 files, English — the only locales in the repo), generated copies (app/legal/*.json, terms.html, privacy.html, admin/oauth-privacy.html, knowly-www/legal/*), tests/legal_*_contract tests hashes/expectations.
Out of scope: deploy/hosting publish, server functions, store-listing privacy forms, in-app screens' layout.

## Architecture

No architecture change: JSON is the single source of truth, `npm run legal:sync` regenerates the rest.

## Security and privacy

This task IS the privacy surface: every statement must be true of the shipped 2.0 (verified against code: collected Firestore fields, AI providers, TTS, analytics events, push notifications, deletion). Statements that cannot be verified are not added.

## Technical debt

- Pay now: removed-feature statements.
- Contain: items needing the owner's/lawyers' wording choice are listed in the INBOX instead of guessed.

## Verification

Grep over generated outputs shows no Arena/duel/arena stars/boost/avatar items/gift-mechanic leftovers; sync contract + liquid-glass hash tests green after the deliberate update; JSON valid; diff list "было → стало" in the INBOX.

## Rollback

Revert the commit and re-run `npm run legal:sync`; nothing is published by this task.
