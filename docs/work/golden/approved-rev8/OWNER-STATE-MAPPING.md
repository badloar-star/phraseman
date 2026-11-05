# Required visible state mapping — owner corrections 2026-11-02

Status: implementation inventory, not coverage PASS. Existing registry144 and visible14 are insufficient. A row is complete only when its exact visual is open on the page and its routes/conditions have evidence.

## Home and access

| Required visible cards | Fixture IDs | Visual status |
|---|---|---|
| Free ranks0,1,2,3 | home-free-0…3 | Existing browser Home rejected; replace from source baseline before claiming parity |
| Plus ranks0,1,2,3 | home-plus-0…3 | Same Home source repair required; all allowed sections |
| Expired Plus ranks0,1,2,3 | home-expired-0…3 | Add; access falls back to rank, progress stays |
| Legacy ranks0,1,2,3 | home-legacy-0…3 | Add; preserve previously available sections, never Learning V2 |
| Every before-unlock state | rank0 Video/Dialogs locked; rank0/1 Peak locked; rank0/1/2 Cards hub locked | Saved/create/practice and Community Friends/Packs remain usable |
| Locked deep links | locked-video/dialogs/peak/cards | Explanation→Lessons; no inaccessible destination leaks |
| Allowed destinations | video-ready, dialogs-unlocked, peak-first/room, hub-community-approved | Need source visual check; Cards composition owner-approved but current pack cover rejected |
| Expiry during conversation | dialog-in-progress-expired | Finish existing conversation, gate subsequent starts |

## Separate post-unlock HomeScene cards — NEW explicit requirement

| Visible normal/reduced pair | Minimum access | CTA |
|---|---|---|
| home-unlock-video / home-unlock-video-reduced | rank1 or Plus/legacy | Exact Video section |
| home-unlock-dialogs / home-unlock-dialogs-reduced | rank1 or Plus/legacy | Exact Dialogs section |
| home-unlock-peak / home-unlock-peak-reduced | rank2 or Plus/legacy | Peak first-entry screen, no room join yet |
| home-unlock-cards / home-unlock-cards-reduced | rank3 or Plus/legacy | Cards hub |

These are HomeScene next-action states, not substitutes for a story or pulse. Before access the unlock scene must not appear; fall back to normal available lesson. Source scene height, header, font, theme and surrounding Home layout are retained. CTA text proposals: «Смотреть видео», «Попробовать диалог», «Посмотреть Пик», «Открыть карточки».

## Distinct story sequences

Video / Dialogs / Peak / Cards / Plus each need anticipation, reveal, celebration, CTA, actual first entry; default distinct poses03/05/04/07/09. Rank award uses10. Each full sequence has its own visible card plus phase evidence, Replay/Skip/Pause, timing/easing/intensity/pose settings. Existing generic story is not accepted. New openings.js/css are work in progress and not yet connected; no PASS claimed.

## Visible pulse/new/visited pairs

- For each feature: Home tile normal-motion pulse, reduced-motion state, pulse-finished «Новое», visited-cleared state.
- Actual bottom tabbar has five logical tabs: Home / Lessons / Video / Community / Settings. Video has its own tab; Peak is a Community subtab. Cards and Dialogs have no standalone bottom tabs. Do not invent them to satisfy a four-feature pulse matrix.
- Show Video-tab pulse/new/visited and eligible Community entry pulse where justified; for Cards/Dialogs the source-based target is the Home tile. Record nonexistent standalone tab combinations as N/A, not as completed visuals.
- Pulses finite; 0 means no pulse; visited clears both the Home and relevant tab hint; reduced motion never scales icons.

## Other required open cards

- Today rank0/1/2/3, Plus, legacy; partial/completed; same-day unlock retains current tasks; next-day adds new eligible types.
- Saved empty/populated, create-card draft/validation, create-pack, practice/answer/end; before-rank3 availability; hub Back origin.
- Community at rank0 with Friends/Packs; locked Peak; eligible first intentional entry; joined room; no pre-access room or notifications.
- Welcome A/B/C×3, Skip, once-per-account, language-change hint, Classic lesson1 INTRO. Owner rejected all previous copy and independent icon pops: replace copy/choreography, remove top-left PhraseMan, improve text contrast.
- Four pack-design alternatives with the SAME three source sets, no words/phrases from cards on covers; choose one only. Common product standard follows owner choice.
- Compact social contest scene stays; current shared PackDeck cover is rejected. Preserve deadline/conditions/podium and all themes while awaiting design choice.

## Acceptance discipline

Every card maps to an ID in the open-gallery inventory; no menu/filter/accordion is required to see it. `registry.galleryIds` currently lists only delivered cards. Next gallery expansion must update exact IDs, screenshots and focused checks together. Source-native visual parity, browser mechanics and owner aesthetic approval are separate statuses. Do not reuse rev5 browser PASS as approval of a rejected cover or welcome.
