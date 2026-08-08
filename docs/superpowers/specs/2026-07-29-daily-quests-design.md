# Daily Quests Design

## Goal

Replace the existing count-and-click daily-task rotation with three contextual, Free-safe daily quests. Remove Speaking Club completely.

## Confirmed product decisions

- Show exactly three quests per day; at least one must be startable immediately.
- Primary goals are useful return engagement and discovery of currently available app mechanics.
- Cards show only icon, title, numeric progress, reward, and state. Tapping opens a bottom sheet with the reason, precise instruction, reward, and a Start button.
- One free reroll is available each day. A replacement remains until day end.
- Completion rewards are automatic. The day bonus remains and gives XP plus one shard.
- No quest may route a Free user to a paywall, consume a paid entitlement, rely on another person, or depend on a time-of-day window.
- No more than one quest from the same feature family per day.
- New users get only immediately available lesson, words, and short accuracy quests; personalised practice appears as soon as real data exists.
- Theory is not a standalone quest. It can only be a prerequisite followed by a verified correct lesson answer.
- The Free AI Explain feature is not a quest. AI dialogs are excluded while their Free allowance is zero.
- Referral may appear at most once per 14 days after a learning win and is credited only for a completed native share action, never for a friend's registration.
- There is no narrative wrapper or mandatory story order.
- Speaking Club is removed from client, functions, flags, paywall copy, analytics, routes, tests, and migration data.

## Audit-gated quest families

Each candidate requires an eligibility predicate, a concrete route, a local event that updates progress, and a fallback quest.

1. **Lesson continuation:** current accessible unfinished lesson; completion or small correct-answer streak.
2. **Lesson recovery:** only where an exact prior lesson ID and a lower-than-passing score are stored; route directly to that lesson.
3. **Words and irregular verbs:** only where the selected accessible lesson exposes that content.
4. **My Practice:** only when due phrase/word items exist and a Free session entry can be reserved now. Small queues use a finish-the-queue target; larger queues use three or five correct answers.
5. **Recall:** only when due cards exist. The "yesterday" variant needs a dedicated saved target rather than a random card.
6. **Theory plus application:** only when lesson theory exists; requires opening theory and a subsequent correct lesson answer in that lesson.
7. **Prepositions:** excluded because it can require energy and would violate the always-startable Free rule.
8. **Exams:** only if the exact exam is unlocked and Free-accessible.
9. **Referral:** only if the server-side referral surface is enabled and an explicit share-completed event is received.

## Non-negotiable exclusions

- Speaking Club and every `club_attend` task.
- Plus-gated AI dialogs and all paid-only tasks.
- Passive opening/scrolling/flipping tasks.
- Spending energy, freeze/streak actions, time windows, diagnostics as dailies, arbitrary volume targets, and objectives controlled by another person.

## Implementation shape

- Replace the legacy task catalogue and fixed 30-day tier arrays with a declarative quest catalogue and asynchronous eligibility selector.
- Add task metadata for the bottom sheet: reason, instruction, start label, and route intent.
- Persist exact contextual targets (lesson ID, phrase/card ID, queue family) in the daily assignment so the quest cannot silently drift.
- Add only the event hooks needed for the selected catalogue. A quest is never emitted until its hook exists.
- Preserve the existing optimistic reward and account/target scoped storage patterns.
