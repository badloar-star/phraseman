# План слияния пакета «объявления администратора в историях» с историями 2 · ДИЗАЙН (24.10.2026)

Governance-ID: TG-13017750C4BB
Status: Plan only — ничего не выполняется до слова координатора
Owner: 2 · ДИЗАЙН

## Outcome
Если координатор возьмёт пакет объявлений (5169f85d6, снимок c77e2da75) в 2.0.2, его нужно совместить с правками историй ночи 24.10: слайд 10 с (у объявления не меньше 10 с), пауза с первого касания, пауза анимации объявления при удержании, тап по аватару всегда открывает истории, журнал [STORIES].

## Scope
Только план: какие файлы пересекаются, в каком порядке применять, что проверить. Код не меняется.

## Architecture
Мои правки в HEAD — патчем от HEAD (без пакета): `StoryViewer.tsx` (STORY_SLIDE_MS 10 000, источники удержания касание+жест, onTouchStart/End/Cancel на корне), `StoryAvatarSlot.tsx` (очередь `ring ? playback : enabled ? [...stories].reverse() : []`, журнал [STORIES]). В рабочем дереве поверх пакета уже стоят две мои «пакетные» правки: длительность объявления `Math.max(STORY_SLIDE_MS, durationMs)` и журнал раннего выхода `go: назад некуда`.

## Security and privacy
Пакет содержит серверные функции и правила базы (functions/story_announcements*.ts, firestore.rules, firestore.indexes.json) — отдельное ревью и решение координатора; к слиянию интерфейса отношения не имеют.

## Technical debt
Пересечения по файлам:
| Файл | Пакет | Мои правки | Риск |
|---|---|---|---|
| components/stories/StoryViewer.tsx | `nextLiveStoryIndex` в go(), длительность объявления в runBar, `liveAnnouncementIds`, шапка без монеты у объявления, `pointerEvents` слайда | константа 10 с, блок удержания (applyHold/setHold/onTouch*), `GestureResponderEvent`, обработчики на корне | низкий: разные участки; конфликт возможен в блоке импортов и в `runBar` |
| components/stories/StoryAvatarSlot.tsx | `liveAnnouncementIds` в `<Viewer …/>` | очередь просмотра, журнал [STORIES] | низкий |
| components/stories/StorySlides.tsx | ветка объявления → `AnnouncementSlide` (в HEAD уже SVG-знак темы be79fa7da) | не менял | нет |
| components/stories/AnnouncementSlide.tsx (новый) | весь файл; `withRepeat` фона | нужен проп `paused` (cancelAnimation при удержании) | средний: правка нового файла после его коммита |
| modules/story_events/* (core, store, sources, use_story_events, contract, use_announcement_stories) | весь пакет | не менял | нет |
| tests/stories_ring_viewer_contract.test.tsx | возможно новые случаи | правка теста «всё просмотрено → тап открывает просмотр» (R21 отменён) | средний: слить вручную |
| tests/stories_viewer_owner_locks_2026_10_24.test.ts | — | мой замок (10 с, пауза, тап по краям, очередь) | проверить на пакетном StoryViewer |

## Verification
Порядок: 1) мои патчи уже в HEAD; 2) cherry-pick пакета, конфликты — в StoryViewer (импорты, runBar) и тесте ring_viewer; 3) добавить `paused` в `StorySlide` → `AnnouncementSlide` (cancelAnimation при удержании, withRepeat после); 4) прогнать `stories_viewer_owner_locks`, `stories_ring_viewer_contract`, `story_events_*`, `story_announcements_*`; 5) снимок Сверки: открытие по тапу, удержание = пауза полосы и анимации, объявление ≥ 10 с.

## Rollback
Пакет — отдельным коммитом поверх моих правок; откат одним revert.
Governance-ID: TG-461B68155700

Governance-ID: TG-CE824FF14FF3

Governance-ID: TG-C2D5FFD08AD4
