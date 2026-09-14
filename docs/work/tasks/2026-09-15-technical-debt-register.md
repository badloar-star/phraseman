# Task Packet: Technical Debt Register

## Scope

- Create a canonical technical-debt register separate from security risks.
- Require disposition (`pay`, `contain`, or `accept`), owner, review date, impact ceiling, exit enabler and linked task packet.
- Seed it from the current audit and open dependency/admin/operations gaps.

## Non-goals

- No broad refactor, deletion, dependency force-upgrade, or production mutation.
- No guessed human owner: placeholders remain blockers.

## Verification

- `node scripts/verify_technical_debt.mjs`
- `node --test scripts/verify_technical_debt.test.mjs`

## Status

Register pending local implementation; operational review remains owner-dependent.
