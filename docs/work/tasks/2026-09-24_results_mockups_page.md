# Task packet: макет «Серия, достижения, ошибки 2.0»

Governance-ID: TG-D4075BBE3430
Status: Planned
Owner: Claude (design mockups session)
Related epic/enabler: docs/phraseman-2.0 (design v2-app mockup set), none formal

## Outcome

One static HTML mockup page `docs/design/v2-app/results.html` showing the redesigned
"Твои результаты" (streak + achievements showcase), achievements screen (3 layout
variants + detail sheet), 365-day activity heatmap, and the full mistake-practice
section (hub, list, mistake detail, Eli5 explain, practice task → completion).
No app code changes. Success = owner can review the static page and see every
required screen/state as one phone per state, matching kit.css/kit.js conventions
and the reference screenshots' visual language.

## Scope

In scope: creating/updating `docs/design/v2-app/results.html` only, using existing
shared `kit.css`/`kit.js`/`nav.js` helpers (not modifying them). Static markup and
demo JS driven entirely by kit.js's existing interactive primitives (sheets, energy
demo, coin count-up). Content is illustrative copy grounded in real screen texts
found in app/streak_stats.tsx, app/achievements_screen.tsx,
app/achievement_catalog_v2.ts, app/achievement_copy_ru_v2.ts,
components/ActivityHeatmap365.tsx, components/StatsPremiumBlur.tsx,
app/mistakes_hub.tsx, app/mistakes_list.tsx, app/mistake_detail.tsx,
components/MistakeEli5Modal.tsx, components/ExplainSheet.tsx,
app/mistake_practice_session.tsx, app/mistake_facet_copy.ts.

Out of scope: any change to the real React Native app, any change to shared design
kit files (kit.css/kit.js/nav.js/home.html), any other mockup page, git commits.

## Architecture

No architecture change. This is a pure static design-reference artifact (HTML/CSS/JS
in docs/), isolated from the application runtime and build. It reads no live data
and touches no production code path.

## Security and privacy

None applies: static mockup HTML with placeholder/illustrative Russian copy, no user
data, no network calls, no authentication surface, not shipped to the app or store.

## Technical debt

Pay now: none created — this is a self-contained design reference file.
Note (accept temporarily, no owner action needed): the real
`ACHIEVEMENT_CATALOG_V2`/`ACHIEVEMENT_COPY_RU_V2` still use retired groups
(xp/shards/league) per current code; the mockup substitutes RULES.md's five
categories (серия/уроки/комбо/особые/медали) with coin rewards as instructed by the
owner brief, and this substitution is called out in the final report so a future
session doing the real category migration is aware it is not yet reflected in code.

## Verification

Manual: render `docs/design/v2-app/results.html` in headless Edge at fixed widths,
inspect PNG output in slices for overlap/clipping/empty states, iterate until clean,
per AGENT_BRIEF.md's required check. No automated tests apply to a static docs page.

## Rollback

Delete or git-revert `docs/design/v2-app/results.html` and this task packet; no other
file is touched, so rollback is a single file removal with no data or entitlement
impact.
