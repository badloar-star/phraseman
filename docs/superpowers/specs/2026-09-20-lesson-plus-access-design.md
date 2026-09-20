# Lesson Plus Access Design

## Purpose

Restore the lesson paywall while keeping a direct pearl purchase as a durable, per-lesson entitlement.

## Access matrix

| Account state | Available lessons |
| --- | --- |
| Free | Lessons 1–3, plus any lesson specifically purchased with 100 pearls. All other lessons lead to Plus. |
| Plus | First lesson of every CEFR section: 1 (A1), 9 (A2), 19 (B1), 29 (B2); other lessons still use ordinary lesson progress; pearl purchases are also available. |
| Plus expired | Same as Free, while retaining every individually purchased lesson. |

Existing score history, legacy free caps, and old automatic unlocks must not grant a non-purchased lesson to a free account.

## Lesson-card UI

Use the current `LessonCard` unchanged in its visual system: 72 px minimum height, 16 px radius, existing gradients, current `PlusBadge`, and the shared pearl asset. Every `premiumRequired` card gets a dedicated pearl action next to the Plus badge. The action opens the shared `ThemedChoiceModal` using the concise copy:

- title: `Открыть урок`
- primary action: `Открыть урок · 100` with the pearl asset
- secondary action: `Закрыть`

Purchased lesson cards display only `Куплено`; no explanatory permanence copy is shown.

## Progress copy

Replace the Russian prompt that currently says to complete the preceding lesson at 2.5+ with `Ещё рано` in the list-level progress-gate modal. Keep the score rule itself unchanged.

## Integrity requirements

The existing pearl purchase composite operation remains the sole writer of durable purchase grants. It must retain stable idempotency and no legacy state migration may revoke or manufacture a purchase. No Firestore schema, Rules, or Jarvis contract changes are required because this policy is entirely client-side and uses the existing durable composite-operation grant.

## Verification

Cover free, Plus, expired-Plus, legacy-progress, legacy-cap, and pearl-purchased states in policy/runtime tests. Add a focused source/UI contract for the pearl action and exact concise Russian copy. Run only these focused tests with the repository traffic-light slot.
