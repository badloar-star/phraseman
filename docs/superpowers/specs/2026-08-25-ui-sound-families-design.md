# Phraseman UI sound families - design

Date: 2026-08-25
Status: approved direction, pending owner review of this written specification
Output: one Russian PDF with 34 sound moments and 102 Adobe Firefly prompts

## Purpose

Create a complete sound taxonomy for app-owned user interactions so Phraseman
feels responsive and alive without turning every tap into undifferentiated
noise. The PDF is a sound-production brief only. It does not add audio assets or
change runtime behavior.

The new document complements `docs/sound/SOUND_PROMPTS_FULL.md`. That document
maps semantic moments such as rewards, purchases and completion. This document
maps the physical and navigational interaction layer: buttons, cards, controls,
overlays, learning tiles, media controls and gestures.

## Audit evidence

The focused production-code scan found:

- 1,442 `onPress` handlers in 327 files;
- 380 raw `Pressable` and 594 `TouchableOpacity` instances;
- 139 `TapScale`, 68 `DuoPressable`, 58 `PressableHybrid` and 12
  `PressableScale` instances;
- 119 `Modal` instances in 93 files;
- 306 router navigation calls;
- 18 long-press handlers, 20 pan gestures, 11 switches and 57 text inputs;
- 134 registered semantic sound events, of which 105 have files and 29 remain
  null Arena placeholders.

The existing sound map compresses the whole press layer into three optional
cues. That is not enough to distinguish the interaction shapes found in the
current interface.

## Chosen direction

Use 34 moments grouped into seven related families. Every accepted app-owned
interaction has a fallback cue, while a more specific navigation, control,
learning, media or gesture cue replaces that fallback.

One user intent produces one immediate cue. A semantic result such as correct,
wrong, purchase complete, reward granted or destructive completion replaces an
immediate generic cue when it occurs in the same short decision window. A
genuinely delayed result may sound later because it is a second state change.

## Sound identity

All sounds remain in the existing "Royal Academy" language:

- celesta and glass harmonics for light precision;
- harp and restrained pizzicato for tactile controls;
- warm strings for directional movement and settling;
- low muted strings or woodwind for unavailable states;
- no retro bleeps, casino coins, harsh buzzers, cartoon boings or long tails.

The three prompt variants for every moment are:

- A - interface: minimal, dry, premium software;
- B - game: warmer and more tactile, compatible with existing rewards;
- C - cinematic: more air and weight, still short and restrained.

## Family 1 - contact surfaces (6)

| ID | Moment | Duration | Volume |
| --- | --- | ---: | ---: |
| `pm_ui_press_primary_v1` | Main CTA accepted | 0.14 s | 0.16 |
| `pm_ui_press_secondary_v1` | Secondary or text action accepted | 0.12 s | 0.13 |
| `pm_ui_press_icon_v1` | Compact icon control accepted | 0.10 s | 0.11 |
| `pm_ui_press_card_v1` | Card or full list row opens | 0.16 s | 0.14 |
| `pm_ui_press_chip_v1` | Chip, filter or compact tag accepted | 0.10 s | 0.11 |
| `pm_ui_disabled_v2` | Disabled or locked control touched | 0.20 s | 0.16 |

## Family 2 - navigation (4)

| ID | Moment | Duration | Volume |
| --- | --- | ---: | ---: |
| `pm_nav_tab_switch_v2` | Main tab changes | 0.20 s | 0.13 |
| `pm_nav_forward_v1` | New full screen is committed | 0.24 s | 0.15 |
| `pm_nav_back_v2` | Return to previous screen | 0.24 s | 0.14 |
| `pm_nav_reselect_v1` | Active tab or current destination is tapped again | 0.12 s | 0.10 |

## Family 3 - overlays and layers (5)

| ID | Moment | Duration | Volume |
| --- | --- | ---: | ---: |
| `pm_layer_modal_open_v1` | Center modal becomes active | 0.34 s | 0.17 |
| `pm_layer_modal_close_v1` | Center modal is dismissed | 0.30 s | 0.15 |
| `pm_layer_sheet_open_v1` | Bottom sheet rises from the edge | 0.38 s | 0.18 |
| `pm_layer_sheet_snap_v1` | Sheet reaches a stable detent | 0.24 s | 0.16 |
| `pm_layer_sheet_close_v1` | Sheet returns below the edge | 0.32 s | 0.15 |

## Family 4 - selection and settings (6)

| ID | Moment | Duration | Volume |
| --- | --- | ---: | ---: |
| `pm_control_option_select_v1` | Radio or single-choice option becomes selected | 0.14 s | 0.14 |
| `pm_control_toggle_on_v1` | Switch becomes enabled | 0.22 s | 0.15 |
| `pm_control_toggle_off_v1` | Switch becomes disabled | 0.20 s | 0.13 |
| `pm_control_check_v1` | Checkbox or multi-select mark changes | 0.16 s | 0.14 |
| `pm_control_segment_v1` | Segment, picker or compact mode changes | 0.18 s | 0.13 |
| `pm_control_slider_commit_v1` | Slider is released on its final value | 0.18 s | 0.12 |

## Family 5 - learning and game pieces (5)

| ID | Moment | Duration | Volume |
| --- | --- | ---: | ---: |
| `pm_learn_answer_press_v1` | Answer is committed before verdict | 0.12 s | 0.12 |
| `pm_learn_tile_pick_v1` | Letter or word tile is picked up | 0.12 s | 0.11 |
| `pm_learn_tile_place_v1` | Tile lands in a valid slot | 0.15 s | 0.13 |
| `pm_learn_tile_remove_v1` | Tile returns to the bank | 0.14 s | 0.10 |
| `pm_learn_pair_match_v1` | Two learning pieces form a pair | 0.18 s | 0.15 |

Correct/wrong verdicts, hint reveals, completion and timers retain the existing
semantic events and replace the generic answer cue when they occur immediately.

## Family 6 - voice and media controls (4)

| ID | Moment | Duration | Volume |
| --- | --- | ---: | ---: |
| `pm_media_play_v1` | Pronunciation, model or preview starts | 0.18 s | 0.14 |
| `pm_media_pause_v1` | User pauses playback | 0.16 s | 0.12 |
| `pm_voice_record_start_v1` | Recording becomes active | 0.24 s | 0.18 |
| `pm_voice_record_stop_v1` | Recording closes and is committed | 0.22 s | 0.16 |

These cues must never cover the first phoneme of speech. Recording suppresses
all unrelated UI sounds until capture ends.

## Family 7 - gestures and physical manipulation (4)

| ID | Moment | Duration | Volume |
| --- | --- | ---: | ---: |
| `pm_gesture_long_press_v1` | Long-press threshold is reached | 0.22 s | 0.15 |
| `pm_gesture_drag_lift_v1` | Object detaches and begins dragging | 0.16 s | 0.13 |
| `pm_gesture_drag_drop_v1` | Object lands in an accepted destination | 0.20 s | 0.15 |
| `pm_gesture_swipe_commit_v1` | Swipe crosses the decision threshold | 0.18 s | 0.14 |

Pull-to-refresh already has the existing sound-map cue pm_pull_refresh_v1 and
is referenced rather than duplicated.

## Arbitration rules

1. Choose the most specific applicable cue; never stack contact + navigation +
   layer sounds for one tap.
2. Semantic verdicts and rewards outrank all seven interaction families.
3. Layer and navigation cues outrank their initiating button cue.
4. Learning-piece and media cues outrank the generic contact family.
5. Disabled controls use only the disabled cue and perform no success lift.
6. Rapid cues are rate-limited and coalesced by family.
7. Speech ducks or defers UI sounds; recording suppresses them.
8. Haptics remain independently controlled and should align with the same
   moment, not create a second delayed beat.

## Intentionally silent interactions

- OS keyboard typing and key clicks;
- ordinary scrolling, inertial settling and background refresh;
- continuous slider movement before release;
- focus changes caused by accessibility navigation;
- background sync, hydration, preload and automatic redirects;
- admin, tester and developer-only controls.

These exclusions do not violate "every press has sound": they are not accepted
app-owned press intents, or the operating system already owns their feedback.

## PDF structure

The PDF follows the visual system of the desktop reference:

1. cover with audit date, title, short conclusion and metric grid;
2. usage and production requirements;
3. family overview and the one-intent/one-cue hierarchy;
4. seven family sections;
5. one block per moment containing ID, duration, volume, exact trigger and
   three full English generation prompts A/B/C;
6. closing arbitration and implementation-reference page.

Visual language: white background, heavy black display headings, warm mustard
accent, thin neutral rules, compact metadata chips and dense but readable prompt
cards. Footer includes document title and page number. No browser-print URL or
timestamp is included.

## Acceptance criteria

- Exactly 34 moments and 102 complete prompts are present.
- Every prompt begins with its stable sound ID.
- Every moment specifies exact trigger, duration and target volume.
- Families cover every audited app-owned interaction through a specific cue or
  the generic contact fallback.
- Existing semantic sound events are referenced, not needlessly regenerated.
- No prompt asks for speech, harsh alarms, retro beeps or long music.
- Output is a single PDF under `output/pdf/`.
- Text extraction confirms all 34 IDs and 102 A/B/C labels.
- Every rendered page is inspected for clipping, overlap and broken Cyrillic.
