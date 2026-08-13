# Personal Plans Generation Matrix

Personal Plans are separate tasks. Lessons are not plan tasks. Lessons stay as their own product area and must not be opened from a Personal Plan day card.

Selected daily time selects the initial visible workload. It does not decide which tasks exist: every generated day still has the full maximum task pool.

## Generator Contract

- A Personal Plan day is generated from plan scenario, day theme, memory state, and the 4-week load role.
- A plan card never routes to `/lesson1`, `/lesson_menu`, or a linked lesson slice.
- A day must contain plan-native modes only: `plan_phrase_build`, `plan_missing_word`, `plan_choose_natural_phrase`, `plan_listen_choose`, `plan_listen_build`, `plan_pronunciation_repeat`, `plan_phrase_recall`, `plan_quiz`.
- Every day starts with `plan_phrase_build` so the learner first meets the main new phrases. The remaining modes must vary by day using the daily order matrix; do not repeat the same task order every day.
- Different days use different content, recall pressure, hint levels, and visible progression.
- Every generated day must contain one task per plan-native mode where content exists.
- Initial visible load depends on the selected setup time:
  - 5 minutes: 2-4 visible tasks.
  - 10 minutes: 3-5 visible tasks.
  - 15 minutes: 4-5 visible tasks.
  - 20 minutes: 5-6 visible tasks.
- After the visible slice is completed, the app can show an "Add more tasks" button while unrevealed day tasks remain.
- Review days keep the same plan-native rule. They recall earlier phrases and mistakes, but they do not become normal lessons.
- Generated copy must be user-facing: no placeholder, scaffold, dry-run, shell, internal gate, or technical routing language.

## 4-Week Matrix

| Week | Day | Load role | Required modes | Content rule |
| --- | --- | --- | --- | --- |
| Week 1 | Day 1 | First usable phrases | Full mode pool | 6 new phrases for the plan's first situation. |
| Week 1 | Day 2 | Same situation, faster choice | Full mode pool | 4 new phrases, 2 phrases from Day 1. |
| Week 1 | Day 3 | Second angle | Full mode pool | 4 new phrases, 3 recalled phrases. |
| Week 1 | Day 4 | Short response under pressure | Full mode pool | 3 new phrases, 4 recalled phrases, one contrast pair. |
| Week 1 | Day 5 | Mixed input day | Full mode pool | 3 new phrases, 5 recalled phrases. |
| Week 1 | Day 6 | Scenario mini-flow | Full mode pool | User rebuilds a short sequence from the week's phrases. |
| Week 1 | Day 7 | Review and repair | Full mode pool | Weekly check uses the same full pool, with time controlling initial visibility. |
| Week 2 | Day 8 | Add polite pressure | Full mode pool | 4 new phrases, 3 recalled phrases, focus on choice and tone. |
| Week 2 | Day 9 | Listen for timing | Full mode pool | 3 new phrases, 4 recalled phrases, focus on time and sequence. |
| Week 2 | Day 10 | Build a short reply | Full mode pool | 4 new phrases, no long review block, focus on producing one clear answer. |
| Week 2 | Day 11 | Clarify and correct | Full mode pool | 3 new phrases, 5 recalled phrases, focus on small corrections. |
| Week 2 | Day 12 | Listening pressure | Full mode pool | 3 new phrases, 4 recalled phrases, focus on hearing the useful part. |
| Week 2 | Day 13 | Mini-flow rehearsal | Full mode pool | Rebuild a short scenario sequence with limited hints. |
| Week 2 | Day 14 | Review and repair | Full mode pool | Repair missed phrases from Week 1 and Week 2. |
| Week 3 | Day 15 | Combine two situations | Full mode pool | Mix two related contexts inside the same plan. |
| Week 3 | Day 16 | Listen and rebuild light day | Full mode pool | Fewer initially visible cards, more listening reconstruction in the full pool. |
| Week 3 | Day 17 | Active recall | Full mode pool | Mostly older phrases with one new contrast. |
| Week 3 | Day 18 | Speak the repair | Full mode pool | Build and repeat the phrases that fix common mistakes. |
| Week 3 | Day 19 | Natural choice | Full mode pool | Choose the natural line under scenario pressure. |
| Week 3 | Day 20 | Scenario chain light day | Full mode pool | Rebuild a compact scenario chain. |
| Week 3 | Day 21 | Review and transfer | Full mode pool | Reuse older phrases in a new but close situation. |
| Week 4 | Day 22 | Production rehearsal A | Full mode pool | Less recognition, more rebuild and short answer. |
| Week 4 | Day 23 | Production rehearsal B light day | Full mode pool | Listening-first day with repeat evidence blocked until real scorer/audio exists. |
| Week 4 | Day 24 | Fast correction | Full mode pool | Correct likely mistakes without adding much new content. |
| Week 4 | Day 25 | Dialog pressure | Full mode pool | Hear a cue and build the shortest useful response. |
| Week 4 | Day 26 | Memory light day | Full mode pool | Mostly recall and repeat; no new phrase batch. |
| Week 4 | Day 27 | Final rehearsal | Full mode pool | Last mixed rehearsal before final review. |
| Week 4 | Day 28 | Final review | Full mode pool | No fake completion. Mark ready only when real answers and real audio evidence exist. |

## Plan Progression

The completed 28-day universal cycle is the reusable base. Full-plan expansion is defined in `docs/personal-plans-cycle-expansion-spec.md`:

- Voyazh: 84 days = 3 full cycles.
- Mitap: 112 days = 4 full cycles.
- Gavan: 126 days = 4 full cycles + 14-day partial cycle.
- Impuls: 140 days = 5 full cycles.
- Echo: 84 days = 3 full cycles.

Selected daily time still does not select which tasks exist or which days exist. Later cycles increase difficulty through lower scaffolding, stronger contexts, and more free production. The selected time only controls the initial visible task count; "Add more tasks" reveals the remaining day pool one task at a time.

### Mitap

Mitap trains meeting language. Week 1: summarize next steps, owners, deadlines, and short follow-up. Week 2: clarify disagreement and ask for confirmation. Week 3: combine status, blocker, decision, and next step. Week 4: rehearse realistic meeting wrap-ups with fewer hints.

### Voyazh

Voyazh trains travel pressure. Week 1: ask for help, find places, solve a lost-item or check-in problem. Week 2: add timing, price, receipt, and route clarification. Week 3: combine airport, hotel, transport, and emergency help. Week 4: rehearse short survival dialogs with listening-first tasks.

### Impuls

Impuls trains spontaneous speech. Week 1: tell a short story with first, then, after that, and because. Week 2: add opinions, reasons, and quick corrections. Week 3: combine story, explanation, and reaction. Week 4: rehearse short monologues and fast repairs without long preparation.

### Echo

Echo trains listening and response. Week 1: repeat, identify time/place, and answer after hearing a short line. Week 2: add confusing pairs and slower/faster speech. Week 3: combine short dialogs with memory recall. Week 4: rehearse listen-build-repeat loops with real pronunciation evidence.

## Generator Output Per Day

Each day must emit:

- a day theme tied to one plan scenario;
- 6-8 candidate phrases, with at least 6 usable unique English phrases;
- short translations;
- teaching notes for at least one key word in every phrase;
- mode payloads for each required plan-native mode;
- recall links to earlier plan phrases when the matrix asks for review;
- blockers when audio, scoring, or approval evidence is missing.

The generator must emit the full maximum pool for the day. The renderer chooses the initial visible count from the selected time tier and can reveal remaining tasks one by one after the visible slice is completed.

The generator must not mark readiness complete from generated content alone. Generated text can start the workflow, but production readiness needs review, real audio approval where audio is used, and real pronunciation scoring where pronunciation readiness is claimed.
