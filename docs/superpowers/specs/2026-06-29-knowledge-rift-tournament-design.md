# Knowledge Rift Tournament Design

Date: 2026-06-29
Status: product/design draft approved for planning

## Summary

Knowledge Rift is a weekly live tournament mode for Phraseman. Players enter a short 4-player room, spend shard charges to attack crystal cells on a zoomable tactical map, and win by capturing the most valuable knowledge territory through fast, accurate quiz play.

The feature should feel like a real competitive game, but stay cheap on Firebase:
- many small rooms at the same event time, not one global live map;
- one compact Firestore state document per room;
- quiz questions sampled deterministically from existing quiz pools;
- server-authoritative moves and shard accounting;
- no per-cell Firestore documents and no live writes for every visual animation.

Working name: **Разлом Знаний / Knowledge Rift**.

## Core Fantasy

The player enters a dark crystal arena. A fractured knowledge core sits in the center. Around it are 49 shard cells. Each captured cell stabilizes part of the rift. The closer a cell is to the core, the harder and more valuable the quiz challenge becomes.

The visual language is:
- graphite stone;
- luminous crystal shards;
- electric blue, amber, violet, cyan player glows;
- cracked overlays for damaged cells;
- a bright central core;
- premium competitive learning, not childish fantasy.

Generated reference assets:
- `.codex-tmp/knowledge-rift-assets/knowledge-rift-asset-sheet.png`
- `.codex-tmp/knowledge-rift-assets/knowledge-rift-map-concept.png`

These are source/reference images only. Final bundled images must be wired through static `require()` first, then compressed before being placed under `assets/images/**`.

## Event Structure

Knowledge Rift runs as a scheduled live event:
- main weekly window: Sunday evening local time, configurable later;
- players can pre-register for reminders, but registration is not required;
- during the event, pressing Search joins a room;
- many rooms can run in parallel;
- each room has 4 players;
- room duration target: 8-12 minutes;
- room results feed a weekly leaderboard.

Fallback when player volume is low:
- after 25 seconds, allow 3 real players + 1 ghost;
- after 45 seconds, allow 2 real players + 2 ghosts;
- avoid making the player wait through a dead event.

## Room Size

MVP room size: 4 players.

Reasons:
- four corners make the board readable;
- each player has a distinct color and starting base;
- more dynamic than a duel;
- less chaotic and cheaper than 6+ players;
- easy to fit on a phone with zoom/pan.

Future variants:
- 2-player friend duel;
- 4-player ranked weekly cup;
- 6-player chaos event after the core mode is proven.

## Map

The board is a 7x7 tactical grid rendered as irregular crystal shards. It is stored as 49 logical cells, but visually appears organic.

Cell rings:
- outer ring: easy;
- second ring: medium;
- inner ring: hard;
- center: core.

Cell point values:
- easy: 1 territory point;
- medium: 2 territory points;
- hard: 3 territory points;
- core: 5 territory points.

The winner is determined by total territory points, not raw cell count.

## Navigation And Controls

The map must support:
- pinch zoom;
- drag/pan in any direction;
- tap cell to inspect;
- tap Attack after selecting a valid adjacent target;
- stable cell hit targets of at least 44x44 px at default zoom;
- no critical interaction that relies only on color.

Suggested UI layout:
- top bar: time left, player score, remaining charges;
- center: zoomable/pannable rift map;
- bottom sheet: selected cell, difficulty, owner, guard power, Attack CTA;
- floating shard balance button, opening top-up flow when needed.

## Starting State

Each player starts in one corner with:
- one base cell;
- two adjacent neutral attack options;
- a distinct player glow and pattern.

Player colors:
- blue;
- amber;
- violet;
- cyan.

Accessibility rule: ownership must not be represented by color alone. Use a small corner rune, border pattern, or cell-edge motif per player.

## Economy

Each action costs 3 shards.

MVP entry rule:
- player must have 30 shards available to start;
- 30 shards are reserved at room start;
- each attack consumes 3 reserved shards;
- unused reserved shards are refunded after the room;
- if the room fails to start, the full reservation is returned.

Reason:
- avoids mid-match insufficient-balance failures;
- makes the stakes clear;
- keeps one room to 10 paid actions maximum;
- lets the UI show "10 charges" instead of constantly asking to spend.

If the player has fewer than 30 shards:
- show an in-game top-up modal;
- allow buying shard packs from the existing shard shop flow;
- return the player to the tournament search screen after purchase.

Plus:
- Plus should not get uncapped combat advantage;
- Plus can receive a weekly free entry or a reward-track multiplier;
- Plus can get premium cosmetic rewards;
- battle fairness must remain intact.

## Wager / Reward Policy

Avoid direct winner-takes-all using store-purchased shards.

Reason:
- shards can be purchased for real money;
- "winner takes losers' paid currency" creates app-store policy and gambling-adjacent risk;
- it can also feel punishing in an educational app.

Recommended MVP:
- the 3-shard action cost is a participation cost;
- winners receive fixed system rewards;
- losers do not transfer their purchased shard value directly to the winner.

Example room rewards:
- 1st: +24 shards, +weekly rank points, rare cosmetic chance;
- 2nd: +12 shards, +weekly rank points;
- 3rd: +6 shards;
- 4th: no shard reward, still receives learning recap / XP.

If a "bank" fantasy is required later, use a non-purchasable tournament currency such as Rift Charges or Honor Sparks. That currency can be won/lost without touching purchased shards.

## Attack Flow

One attack is a mini-quiz, not one question.

Attack sizes:
- easy cell: 5 questions;
- medium cell: 5 questions;
- hard cell: 6 questions;
- core cell: 7 questions.

Capture thresholds:
- easy: at least 3/5 and enough power;
- medium: at least 3/5 and enough power;
- hard: at least 4/6 and enough power;
- core: at least 5/7 and enough power.

Power score:
- correct answer: +100;
- speed bonus: up to +40;
- streak bonus: +25 after 3+ correct in a row;
- wrong answer: +0;
- timeout: +0.

Each cell stores `guardPower`, the power score from the last successful capture.

To capture a neutral cell:
- meet the minimum correct-answer threshold.

To capture an enemy cell:
- meet the minimum threshold;
- beat the current `guardPower` after modifiers.

## Cracked State

If an attack almost succeeds, the cell becomes cracked instead of doing nothing.

Example:
- defender guardPower: 710;
- attacker power: 680;
- attack fails but is close;
- cell gains `cracked`;
- next defense target is reduced by 80.

Rules:
- a cell can have at most one cracked level in MVP;
- cracked state expires after successful defense or after N seconds;
- cracked visuals use a fracture overlay.

This makes failed attacks feel useful and creates late-match drama without random luck.

## Valid Targets

A player may attack:
- neutral cells adjacent to their owned cells;
- enemy cells adjacent to their owned cells;
- the core if they own at least one adjacent inner-ring cell.

No teleport attacks in MVP.

Optional future booster:
- one "Rift Leap" per match lets a player attack any cracked cell.

## Anti-Snowball

The leader should be beatable until the end.

MVP mechanics:
- if a player owns more than 14 cells, newly captured cells get slightly lower guardPower;
- player in 4th place gets one free Focus attack per match;
- core guardPower decays every 90 seconds;
- last 90 seconds: attacking the leader's cells gives a small speed-score bonus cap.

These are subtle enough to preserve skill, but prevent a match from being decided too early.

## Question Sources

Use existing quiz pools:
- standard quiz data by difficulty;
- thematic quiz packs when available;
- current study target gates;
- no emergency/builtin fallbacks that hide broken pools.

Difficulty mapping:
- easy ring -> quiz easy;
- medium ring -> quiz medium;
- hard/core -> quiz hard;
- core can mix hard + trickier thematic items.

Question selection:
- deterministic seeded random, not ad hoc client random;
- seed = roomSeed + cellId + attackNo + playerId;
- avoid repeats in a room;
- avoid showing answers or explanations during live attack unless needed after completion.

Server must be able to verify the submitted answers from the same seed.

## Scoring And Winners

Room score:
- sum of territory points from owned cells;
- plus core bonus if owned at room end;
- tie-break 1: higher total attack power;
- tie-break 2: higher accuracy;
- tie-break 3: faster average correct answer;
- tie-break 4: earliest final capture time.

Weekly leaderboard:
- room placement points;
- territory points;
- accuracy bonus;
- limited number of counted rooms per week to avoid grind/pay advantage.

Recommended counted attempts:
- best 3 rooms per week count;
- additional rooms can be played for practice/rewards but not unlimited leaderboard climb.

## Firebase Architecture

Collections:
- `knowledge_rift_queue/{uid}` or existing matchmaking queue extension;
- `knowledge_rift_rooms/{roomId}`;
- `knowledge_rift_room_results/{roomId}_{uid}`;
- `knowledge_rift_weekly/{weekId}/entries/{uid}`;
- `users/{uid}/reward_claims/...` for idempotent rewards.

Room doc should contain compact state:
- roomId;
- weekId;
- seed;
- state;
- startsAt;
- endsAt;
- players[4];
- board[49];
- activeAttack summaries;
- moveCounts;
- reservedShards;
- version.

Board cell shape:
- cellId;
- ring;
- difficulty;
- ownerIndex or null;
- guardPower;
- cracked;
- updatedAt.

Do not store each cell as its own document in MVP.

Cloud Functions:
- `knowledgeRiftJoinQueue`;
- `knowledgeRiftCreateRoom`;
- `knowledgeRiftReserveShards`;
- `knowledgeRiftStartAttack`;
- `knowledgeRiftSubmitAttack`;
- `knowledgeRiftFinalizeRoom`;
- `knowledgeRiftClaimReward`.

Client listens to one room doc while inside the map. Animations and local quiz answer state stay local.

## Cost Controls

Rules:
- one room state listener per player;
- one Cloud Function call per attack;
- one room doc write per completed attack;
- no per-question Firestore writes;
- no per-cell listeners;
- leaderboard updates only at room end;
- active room TTL cleanup.

Expected cost shape:
- 4 players x one room listener;
- around 10 attacks per player max;
- 40 attack submissions max per room;
- room doc updates are bounded;
- question data comes from bundled/static pools or preloaded server data, not per-question Firestore reads.

## UI States

Required states:
- event locked / next event countdown;
- search;
- room found;
- shard reservation;
- loading map;
- active map;
- selected cell;
- attack quiz;
- attack result;
- cell captured;
- cell defended;
- cracked cell;
- low shards / top-up;
- room finished;
- weekly rank result;
- reward claim.

## Visual Design

Use the generated DALL-E references as style direction, but implement interactivity in code.

Important:
- DALL-E should not create the final live board with baked ownership;
- final cells should be drawn/recolored by code;
- generated assets can provide textures, overlays, glow, core, and source art;
- code controls owner color, selected state, attackable state, cracked state, and difficulty rings.

Map rendering options:
- React Native Skia if available/preferred for zoomable canvas;
- SVG if the existing stack favors it;
- absolute-positioned animated cells only if performance holds on low-end devices.

## DALL-E Prompts Used

Asset sheet prompt:

```text
Use case: stylized-concept
Asset type: mobile game asset sheet for Phraseman tournament mode
Primary request: Create a high-quality mobile game asset sheet for a language-learning tournament mode called Knowledge Rift.
Scene/backdrop: premium dark graphite crystal interface, no text, no numbers, no logos.
Subject: separate game assets for an interactive zoomable tactical map: neutral shard cell, easy shard cell, medium shard cell, hard shard cell, central core crystal, cracked overlay, selected glow ring, valid attack pulse, locked dark overlay, small energy veins, subtle background tile.
Style/medium: polished premium mobile game UI assets, semi-3D crystal shards, clean game-art rendering, tactile interactive button feel, not childish, not cartoonish.
Composition/framing: asset sheet layout with generous spacing, each element separate and readable, square canvas, elements centered, clean enough to crop into individual assets later.
Lighting/mood: mysterious competitive learning arena, luminous edges, controlled glow, high contrast, refined.
Color palette: graphite black, deep charcoal, electric blue for easy, amber for medium, violet for hard, bright white-blue core glow, restrained accents.
Materials/textures: fractured glass, crystal, polished obsidian, subtle energy veins, beveled edges.
Constraints: no words, no letters, no numbers, no UI labels, no player ownership colors baked into cells, no full fixed map, no characters, no watermark. Cells must look recolorable by code and readable at small mobile sizes. Avoid tiny noisy details. The selected glow and valid attack pulse should be usable as overlays.
```

Map concept prompt:

```text
Use case: ui-mockup
Asset type: mobile game map concept preview for Phraseman Knowledge Rift
Primary request: Create a premium mobile game concept image of a zoomable tactical tournament map called Knowledge Rift, showing a 7x7 field of crystal shard cells around a central glowing core.
Scene/backdrop: top-down dark graphite crystal rift arena with depth, fractured stone, luminous energy veins, no text and no labels.
Subject: 49 interactive shard cells arranged as an organic tactical board, four player territories suggested by subtle owner glows in blue, amber, violet, and cyan; outer ring easy cells, middle ring medium cells, inner ring hard cells, central core crystal. Some cells neutral, some cracked, one selected with a bright ring, several attackable with pulsing edge glow.
Style/medium: high-end mobile game UI mockup, semi-3D crystal board, polished, tactical, readable on a phone, not childish, not cartoonish.
Composition/framing: portrait mobile screen composition, map centered with extra margin for pan/zoom feeling, slight isometric/top-down angle, no UI text, no buttons, just the playable map surface.
Lighting/mood: competitive, mysterious, premium, energetic, with controlled glow and crisp cell boundaries.
Color palette: graphite black, obsidian, blue, amber, violet, cyan, white-blue core glow; avoid noisy rainbow colors.
Materials/textures: beveled crystal shards, cracked glass, luminous edge highlights, polished dark stone.
Constraints: no words, no letters, no numbers, no logos, no characters, no watermark. Do not bake any UI labels. Make each cell look tappable and individually selectable. The map should look like it can be zoomed and panned in a mobile app.
```

## MVP Phases

Phase 1: simulation and rules
- pure board generation;
- attack resolution;
- seeded question selection;
- score and winner calculation;
- economy reservation math;
- tests.

Phase 2: backend room loop
- matchmaking;
- room doc;
- shard reservation/refund;
- attack submit callable;
- room finalization;
- weekly leaderboard.

Phase 3: map UI
- zoom/pan surface;
- selectable cells;
- owner colors/patterns;
- selected and attackable highlights;
- mini-quiz attack screen;
- result animations.

Phase 4: event shell
- weekly schedule;
- event countdown;
- push reminders;
- search state;
- room result modal;
- reward claim.

Phase 5: beta
- Remote Config gate;
- internal QA;
- cost logging;
- balance tuning;
- top-up UX audit;
- App Store policy review for shard rewards.

## Open Decisions

Before implementation, decide:
- exact weekly event time by locale;
- whether Plus gets free entry, extra cosmetic track, or both;
- whether counted weekly attempts are best 3 or first 3;
- whether central core should appear from start or unlock after 2 minutes;
- final reward amounts.
