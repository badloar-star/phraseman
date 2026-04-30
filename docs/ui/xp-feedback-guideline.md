# XP Feedback Guideline

Use this guide to keep XP feedback consistent across the app.

## Goal
- Make XP rewards feel visible and satisfying.
- Keep reward feedback predictable between screens.
- Avoid noisy or duplicated reward UI.

## Use `XpGainBadge` when
- The user has just earned real XP now.
- The UI is a reward moment (result, modal, toast, completion state).
- You need short, positive visual confirmation (`+XP`).

Examples:
- quiz result reward
- daily task claim
- chest reward
- report success XP

## Do NOT use `XpGainBadge` when
- The text is informational only (no XP granted now).
- The value is a multiplier (`+50% XP`) not direct reward.
- It's static copy in docs/settings/descriptions.
- A specialized existing animation already covers that exact reward moment.

## UX rules
- Show one primary XP signal per reward block.
- Do not duplicate the same XP value in multiple animated labels.
- Keep animation subtle and fast (roughly 150-300ms).
- Prefer clean hierarchy: reward value first, explanation second.

## Technical rules
- Reuse `components/XpGainBadge.tsx` (no copy-paste animation logic).
- Pass the actual granted amount only.
- Use `visible={true}` for result blocks that appear once.
- Use state-driven `visible` for toasts/modals that appear/disappear.

## Copy style
- RU/UK phrasing should stay parallel.
- Keep reward text short:
  - `+10 XP`
  - `+250 XP`
- Put extra context in secondary text, not in the badge itself.

## Review checklist (before merge)
- Is XP actually granted in this moment?
- Is `XpGainBadge` used instead of custom duplicated animation?
- Is there only one clear XP reward signal?
- Is the non-reward text still readable and concise?
- RU/UK parity verified?
