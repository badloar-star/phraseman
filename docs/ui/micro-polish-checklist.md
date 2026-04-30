# Micro-Polish Checklist

Use this checklist when polishing screens in small, safe batches.

Related:
- `docs/ui/xp-feedback-guideline.md` for detailed XP reward behavior.

## 1) Empty and fallback states
- Provide a clear title for the state (`temporarily unavailable`, `nothing here yet`).
- Add one primary action and one secondary fallback action when possible.
- For secondary fallback, prefer `Back` or `Go Home`.

## 2) CTA clarity
- Use direct action labels (`Сообщить о проблеме`, `Повторить`, `На главную`).
- Avoid vague one-word labels when context is weak.
- Keep language and tone consistent between RU and UK.

## 3) Readability
- Ensure helper text is readable on all gradient/background zones.
- Keep secondary text contrast strong enough for quick scanning.
- Avoid overlong question labels; prefer short title + short explanation.

## 4) Interaction feedback
- Add visible pressed/expanded states for interactive rows.
- For accordions, make direction state obvious (chevron + rotation).
- Prefer soft, fast micro-animations (about 150-300ms).

## 5) XP reward feedback
- If an action grants XP, show explicit reward feedback (`+XP`).
- Reuse `XpGainBadge` for consistency and easier maintenance.
- Avoid duplicate reward messages in the same block (text + badge should complement each other).

## 6) Navigation escapes
- Prevent dead ends: provide a safe secondary exit in constrained states.
- On full-screen fallback states, include `Go Home` or equivalent.

## 7) Consistency pass
- Verify RU/UK copy parity for changed blocks.
- Verify same UX pattern across similar screens before finishing.
- Run lints on touched files before completion.
