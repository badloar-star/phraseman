# Learning V2 — Lesson Map: точная RN-спецификация

**Источник визуальной истины:** `docs/v2/mockups/08-unit-map.html`.

**Статус:** P3 начат. Чистая модель маршрута уже реализована в `modules/learning-v2/map/lesson_map_model.ts` и защищена `tests/learning_v2_lesson_map_model.test.ts`; RN-экран, touch/motion и визуальная сверка ещё не созданы. Это не вольный дизайн-мудборд: числа, состояния и motion ниже извлечены из утверждённого HTML-макета. Если общий UI-гайд предлагает другое, побеждает этот документ и макет.

## Непосредственная оговорка об устаревших данных макета

В mock 08 внутри демонстрационного JavaScript у сессий указано 7–9 карточек. Это **исторический demo-снепшот** и не является контрактом. Текущий обязательный контракт V2 — 12 задач в каждой из 12 сессий; сохраняются только геометрия, состояния, motion и иерархия карты.

## Экран и данные

Экран получает versioned `V2LegacyLessonSourcePayload` и V2 progress-state. Для P3 Lesson 1:

- `lessonId: 1`, `episodeId: ep-lesson-01`;
- ровно 12 обязательных session nodes, зоны `understand` 1–4, `use` 5–8, `master` 9–12;
- header: back, номер/название, can-do, `N из 12`, единый баланс звёзд;
- словарь и теория — реальные действия рядом с header, не сессии;
- extra nodes личного плана позже и максимум два; турниры не рисуются на карте;
- checkpoint после session 12; это отдельный узел, не входит в `N из 12`.

## Точная геометрия mock 08

| Элемент | Значение |
|---|---|
| Header padding | `22, 18, 16` |
| Header icon hit target | `40×40`, radius `14` |
| Hero title | `30`, line-height `1.16`, weight `800` |
| Can-do | margin top `8`, size `15.5`, line-height `1.4`, weight `600` |
| Zone header | padding `14, 26, 10`; label `11.5`, tracking `2` |
| Node row height | `96` |
| Zig-zag displacement | `±64` from center |
| Done node | `58×58`; stars `9×9`, 3 below node |
| Current node | `76×76`, text `28/900`, halo inset `-10` |
| Next node | `62×62`, no lock, visible session number |
| Locked node | `60×60`, lock `20×20` |
| Side node | `52×52`; label `11/700` |
| Checkpoint | margin `14,22,4`, radius `22`, padding `20`, icon `52×52` |
| Bottom sheet | radius `28,28,0,0`, padding `14,22,26`, CTA `56` high/radius `20` |
| Hint lane | min-height `52` |

Use stable safe-area insets and reserve header, map, hint lane and bottom sheet geometry before async state resolves. Do not first render zero stars, an empty map or a centered spinner.

## Node state machine

| State | Appearance | Tap |
|---|---|---|
| `done` | green dimensional `58`; checkmark; 0–3 small stars | Bottom sheet: title, `пройдена`, best result, `Улучшить результат` |
| `current` | bright dimensional `76`; session number; breathing halo; `Продолжить` pill above | Bottom sheet: title, expected time, `Начать` |
| `next` | brighter than lock, no lock, visible number `62` | Calm denial; do not pretend it is available |
| `locked` | matte/dim `60`, lock | Calm denial with exact prerequisite |
| `side` | same physical family but quiet rim and semantic SVG | Only plan/dictionary/verbs semantics, never tournament |
| `checkpoint` | large horizontal card after 12 | Locked until regular sessions completed; weak result does not block next lesson |

Normal tap scales to `0.94` for `120ms` with `cubic-bezier(.23,1,.32,1)`. All mandatory visible actions remain available without long press. Long press is reserved for the later Hard Mode flip, not required for navigation.

## Motion contract

| Interaction | Duration / curve | RN implementation target |
|---|---|---|
| Node entrance | cascade `i × 40ms`, each `320ms`, `(.38,.70,.125,1)` | Reanimated opacity + translateY 18 → 0 + scale .85 → 1 |
| Checkpoint entrance | after last node + `120ms` | Same spring entrance |
| Current halo | `2400ms ease-in-out`, scale `1 → 1.14 → 1`, opacity `.55 → 1 → .55` | Focus/AppState-gated Reanimated repeat |
| Locked denial | `240ms`, scale `1 → .96 → 1` | Short transform only, no shake |
| Sheet | `320ms`, `(.38,.70,.125,1)` | TranslateY from fully hidden; fixed final geometry |
| Stars to wallet | `620ms`, stagger `90ms`, `(.33,.52,.25,.99)` | SVG star shared coordinate arc, then bump balance |
| Wallet bump | `360ms`, `(.38,.70,.125,1)`, scale `1 → 1.16 → 1` | Transform only |
| New current/next | `420ms`, `(.38,.70,.125,1)` | node pop `scale .7 → 1.1 → 1` |

Reduced motion: all transitions `80ms`, entrance/spring animation `1ms`, no star flight, static current halo at `.7` opacity. Motion may not run while screen is blurred or app is backgrounded.

## Theme and accessibility

- Source palette is dark, dimensional and theme-accented; no generic indigo funnel palette from a design search may replace it.
- Theme colour may alter accents only; preserve high contrast. On a lime/green filled surface the foreground is dark (`correctText` / near black), never white.
- Use SVG/Lucide/own vector icons. No emoji or raster decoration.
- Every node exposes accessibility label: session title, zone, state, progress/result and available action.
- Screen reader announces result then stars, then upcoming session; do not announce decorative stars separately.
- Current session, denial hint, offline status and bottom sheet must be accessible with one clear action.

## P3 acceptance evidence

1. Unit test maps P2 progress states deterministically into the six visual node states.
2. RN screenshots/video against mock 08 at compact iPhone, large iPhone, common Android: idle, current tap, done tap, locked tap, completion, reduced motion, offline.
3. Overlay/frame comparison records all differences and their approved native equivalents.
4. No layout jump when balance/progress hydrates; no unguarded infinite animation; no old energy UI.
