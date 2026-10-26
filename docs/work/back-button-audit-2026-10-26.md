# Аудит кнопки «назад» — все маршруты app/** (25→26.10)

Governance-ID: TG-03C9A99A4B85
Собрал 1 · ЯДРО скриптом `scripts/back_button_audit.ts` (только чтение исходников, детерминированно). «Должна» — fallback по реестру ролей `app/navigation_back.ts` (`navigationFallbackForPath`); у корневых — «—».

## Сводка

- маршрутов-экранов: 97; корневых: 15; dev-экранов: 0
- общая ScreenBackButton (вкл. SafeTopBackButton): 33; своя кнопка: 21; без «назад»: 10; только «закрыть»: 12
- router.back мимо safeRouterBack: 0; fallback не как в реестре: 18; своя Android-назад: 14; свайп iOS выключен: 0
- в базе непереведённых (config/screen_back_baseline.json): 35
- не экраны (компоненты в app/ без переходов на них, заглушки маршрутов) — в таблицы не вошли: 65

## Разбор (Ядро, вручную по находкам сканера)

### Правило — уже есть, одно

1. **Вид и место:** `components/v2/ScreenBackButton.tsx`. Позиция по kit.css: слева 20, круг 48, верх = безопасный верх;
   абсолютным слоем поверх экрана, сдвинуть нельзя. Сторож `tests/screen_back_button_contract.test.ts` и база
   непереведённых `config/screen_back_baseline.json` (36, только уменьшается) — 5 · ВХОД, волны 1–17.
2. **Куда ведёт:** только `safeRouterBack(router, fallback)` из `app/navigation_back.ts`. История переходов по разделам:
   «назад» — к экрану, откуда пришли, если он из того же раздела; иначе — на fallback раздела. Каждое решение пишет
   `[NAV-BACK] decision` (откуда, кандидат, выбрано, способ), сброс истории — `[NAV-BACK] candidate:reset reason=…`.
   `router.back()` в обход — 0 экранов.
3. **Android:** общий обработчик (`shouldHandleGlobalHardwareBack`), свой — только там, где экран закрывает слои по
   очереди или спрашивает «выйти?». **Свайп iOS** нигде не выключен, кроме выхода из аккаунта (временно).

Новый компонент не нужен. Нужно довести правило до конца по зонам, и чтобы каждый экран с «назад» был в реестре ролей.
Для этого — новый сторож `tests/back_nav_registry_contract.test.ts` (база только уменьшается).

> ⚠ **Поправка 26.10 (Ядро):** сканер смотрит код, а не макеты. По гейту «приложение = макет» эталон главнее.
> - «Нет «назад»» и «только «закрыть»» — дефект, только если на эталоне есть «назад».
> - Уже сверены как `match` (кнопку не добавлять): «Правда / ложь» (truefalse, cards-v2-033), промокод
>   (promo_code_entry, overlays-campaigns-005).
> - По остальным ждём ответа 3 · МАКЕТЫ.
>
> Пункт Б снят — см. ниже.
>
> **Итог сверки с эталонами** (Макеты, 988d643cd, `back-button-mockup-truth-2026-10-26.md`; колонка «эталон» в таблицах ниже):
> - в зонах Ядра (Карточки, «без зоны», Друзья, Видео) дефектов нет: «✕» там, где на эталоне «✕»; корни — без «назад»;
> - у today_tasks, shop, ai_companion_session, ai_dialog_briefing, ai_dialog_session эталона нет — утром владельцу;
> - ~~настоящие дефекты — в Обучении: `level_exam` и `combined_lesson_pick`~~ — **снято 26.10** (Макеты e9d51db21):
>   кнопка у обоих есть, сканер не узнавал `SafeTopBackButton` (у `level_exam` — через `ExamHeader`). Сканер научен всем
>   экспортам общей кнопки (`scripts/back_button_audit_detect.mjs`), экранов с находками 71 → 67. У `combined_lesson_pick`
>   остаётся только «fallback ≠ реестр»: `/(tabs)/lessons` против `/lessons_list` — это одна вкладка «Уроки» (`lessons_list` —
>   её реэкспорт), решает владелец Обучения.

### Настоящие проблемы (чинят владельцы зон)

**А. Экран не в реестре ролей → «назад» не к открывшему, а на fallback** (`[NAV-BACK] candidate:reset
reason=leaving_no_section`). Человек пришёл в диалог с задания «Сегодня» на Главной — «назад» уводит в хаб Диалогов.
- Диалоги: `dialogue_v2_session`, `dialogue_v2_freeform`, `dialogue_v2_completion`, `dialogue_v2_memory`,
  `dialogue_v2_theme` → добавить в `fixedChildSection` → 'dialogs' (как `dialogue_v2_briefing`).
- Друзья: `friends_duel`, `friends_week_mine` → раздел 'friends'.
- Главная: `today_tasks` → 'home'.
- Вкладка `(tabs)/community` — нет в корнях разделов (`SECTION_ROOTS`): дочерние экраны Сообщества теряют историю.
- `(tabs)/arena` — Арена удалена (D54/D83), файл-вкладка остался без роли: проверить, что на него никто не переходит,
  и убрать вместе с маршрутом (зона координатора, не восстанавливать).

**Б. ~~Экраны Карточек передают запасной `/flashcards` вопреки решению владельца.~~ СНЯТО после перепроверки (26.10).**
Решение 16.08 было про соседей таббара Карточек (сохранённые / наборы / мои наборы): их «назад» на `/flashcards`
зацикливал раздел. В 2.0 `/flashcards` — хаб Карточек (cards-002 «Хаб и выбор режима»), тренировки запускаются из него.
Fallback `/flashcards` для тренировок — возврат к родителю, а из хаба «назад» ведёт на Главную. Петли нет, менять не
нужно. Исходный текст пункта: Реестр для раздела 'flashcards' ведёт
на Главную. Это решение владельца от 16.08: «набор → Мои наборы → ГЛАВНАЯ»; `/flashcards` — сосед по таббару Карточек,
и «назад» туда зацикливал раздел. Экраны же передают `/flashcards`:
- `flashcards_blitz/recall/speaking/swipe`;
- `flashcards_training_setup`;
- `flashcards_video_packs`;
- `pack_opening`.

Fallback работает, только когда истории нет (холодный вход по ссылке или пушу), — тогда человек попадает в тот самый
цикл. Чинить экраны (зона Карточек), реестр не трогать.

**В. Fallback экрана расходится с разделом:**
- `hint`, `lesson_menu` ведут на Главную, хотя они из «Уроков» (`/lessons_list`);
- `combined_lesson_pick`, `learning-v2/session/[id]` и `lesson1` — на вкладку «Уроки» вместо списка урока;
- `learning-v2/chapter-exam` — на `/learning-v2/course`;
- `language_welcome` — на `/settings_language`;
- `dialogue_v2_briefing` → `/ai_dialog_home`, а реестр для раздела 'dialogs' даёт `/(tabs)/lessons`. Если хаб Диалогов
  теперь отдельный корень `/ai_dialog_home` (он есть в `SECTION_ROOTS`), запасной экран раздела стоит обновить. Решает
  владелец Диалогов вместе с навигацией.

Это не всегда ошибка: экран может вести «на шаг выше» осознанно. Решают владельцы: Обучение — hint, lesson_menu,
combined_lesson_pick, session, chapter-exam, lesson1; Вход и настройки — language_welcome; Диалоги — briefing.

**Г. Нет видимой «назад» на не-корневом экране:**
- `flashcards_truefalse_session` (Карточки);
- `lesson_verbs` (Обучение); ~~`level_exam`~~ — снято 26.10: кнопка есть (`ExamHeader` → `SafeTopBackButton`), сканер её не узнавал;
- `community_pack_create` (Карточки);
- ~~`combined_lesson_pick` (Обучение)~~ — снято 26.10: `SafeTopBackButton` напрямую;
- `shards_shop`, `referrals`, `promo_code_entry` (порталы).

Модалки `premium_modal` / `premium_modal_v2` закрываются крестиком — для модалки это норма, если владелец не скажет иначе.
Служебные экраны без людей: `learning_v2_authoring_preview`, `learning_v2_session_intro_check`, `motion_showcase`,
`pos_analytics_audit` — в релизе не должны быть достижимы. Проверить, что они за `ENABLE_DEV_TOOLS`.

**Д. Только «закрыть» вместо «назад».** Сессия урока V2, вводная, тест уровня, витрина режимов, открытие набора,
«Магазин», «Язык», «Политика», «Условия», дуэль. Для полноэкранных потоков (урок, дуэль, открытие набора) крестик —
осознанный выход с подтверждением. Для «Язык», «Политика», «Условия», «Магазин» по правилу владельца нужна «назад» на
общем месте.

**Е. Своя кнопка вместо общей — 33 экрана.** 36 файлов уже в базе 5 · ВХОД, переводятся волнами.

**Ж. Петля «итог урока → К урокам → назад» — подтверждена и починена (наблюдение Дизайна).**
- Причина: `/lessons_list` — повторный экспорт вкладки «Уроки». «К урокам» и «Следующий урок» делали `replace` итога на
  `/lessons_list`, и поверх вкладки ложилась вторая копия списка.
- Кнопка «назад» и Android копию снимали правильно: `safeRouterBack` у корня раздела вызывает `dismissTo` на Главную.
- Свайп iOS снимал только копию и показывал тот же список ещё раз.
- Теперь оба выхода — `dismissToTabRoute(router, '/(tabs)/lessons')`: стек сворачивается до вкладки. Сторож —
  `tests/lesson_complete_back_to_tab_contract.test.mjs`.
- Осталось у владельца французского курса: автопереход `lesson_complete` → `/lessons_list` при
  `canApplyCompletionRewards=false` (та же двойная копия). Точный текст держит `gustav_french_curriculum_contract`,
  поэтому не тронуто.

### Не проблемы (шум сканера)

- «Назад» на корневом экране у `flashcards_packs`, `lingman_videos`, `streak_stats`, `year_activity`, `ai_dialog_home`:
  это корни разделов, открываемые с Главной, «назад» у них нужна. Плохо было бы только на вкладках таббара.
  `(tabs)/home` и `(tabs)/lessons` помечены из-за вложенных компонентов (колокольчик, выбор сезона) — кнопки «назад» там нет.
- Своя Android-«назад» у 13 экранов: все зовут ту же функцию, что кнопка на экране, закрывают слои по очереди
  (шторка → окно → экран) или идут через `safeRouterBack`. Поведение по коду однозначно, а решения уже в журнале
  `[NAV-BACK]`. Новые журналы `[BACK-NAV]` не нужны: неясных мест не найдено.
- Петель A→B→назад→B по коду нет: `router.back()` в обход `safeRouterBack` не найден, а `safeRouterBack` снимает
  одноразовые экраны и пейволы из истории. Живая проверка петель — на эмуляторе по журналу `[NAV-BACK] decision`
  (Сверка).

### Предлагаемая раздача

| Зона | Что | Пункты |
|---|---|---|
| Навигация (5 · ВХОД или Ядро) | реестр: диалоги V2, друзья, today_tasks, вкладка community; запасной раздела Диалогов | А, В (briefing) |
| Обучение (Learning V2) | fallback hint, lesson_menu, combined_lesson_pick, session, chapter-exam, lesson1; «назад» у lesson_verbs, level_exam | В, Г |
| Карточки | fallback `/flashcards` → как в реестре (решение владельца 16.08); «назад» у truefalse и community_pack_create; своя кнопка → общая | Б, Г, Е |
| Вход и настройки | «назад» вместо «закрыть» у «Язык», «Политика», «Условия»; language_welcome | В, Д |
| Магазин / порталы | «назад» у shards_shop, referrals, promo_code_entry, shop | Г, Д |
| Координатор | (tabs)/arena — удалить маршрут вместе с Ареной | А |

## Находки сканера (без dev-экранов)

Колонка «эталон» — из таблицы Макетов [docs/work/back-button-mockup-truth-2026-10-26.md](back-button-mockup-truth-2026-10-26.md) (988d643cd): что на макете → вывод. «—» — эталон по этому экрану ещё не сверен; находка без эталона в правку не идёт.

| экран | маршрут | роль · раздел | «назад» | ведёт | должна | Android | iOS | что не так | эталон | зона |
|---|---|---|---|---|---|---|---|---|---|---|
| app/(tabs)/arena.tsx | /(tabs)/arena | unknown | нет | — | /(tabs)/home | общая | свайп | НЕТ «назад»; нет в реестре ролей — «назад» сбрасывает историю на fallback | — | ? |
| app/(tabs)/community.tsx | /(tabs)/community | root · friends | ScreenBackButton | replace ×1 | — | общая | свайп | «назад» на корневом экране | ничего — корень вкладки → «назад» на корне не нужен | ? |
| app/(tabs)/home.tsx | /(tabs)/home | root · home | своя: через components/NotificationCenterButton.tsx | — | — | общая | свайп | «назад» на корневом экране | — | ? |
| app/(tabs)/lessons.tsx | /(tabs)/lessons | root · lessons | ScreenBackButton через components/learning-v2/season/SeasonPickScreens.tsx | safeRouterBack → HOME_BACK_FALLBACK | — | общая | свайп | «назад» на корневом экране | — | Обучение (Learning V2) |
| app/account_details.tsx | /account_details | child · settings | ScreenBackButton | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | своя (BackHandler) | свайп | своя Android-назад — проверить логом | — | Вход, аккаунт, настройки |
| app/ai_companion_session.tsx | /ai_companion_session | portal | своя: BackGlyph | safeRouterBack → '/(tabs)/home'; replace ×3 | /(tabs)/home | общая | свайп | нестандартная кнопка | нет эталона → не править до макета | Диалоги |
| app/ai_dialog_briefing.tsx | /ai_dialog_briefing | portal | своя: через components/AiDialogBriefingScreen.tsx | safeRouterBack → '/ai_dialog_home' / '/(tabs)/lessons'; replace ×1 | /(tabs)/home | общая | свайп | нестандартная кнопка | нет эталона → не править | Диалоги |
| app/ai_dialog_consent_gate.tsx | /ai_dialog_consent_gate | portal | своя: BackGlyph | safeRouterBack → '/(tabs)/lessons' | /(tabs)/home | общая | свайп | нестандартная кнопка | круг 48 → своя кнопка — нужна общая 48 | Диалоги |
| app/ai_dialog_home.tsx | /ai_dialog_home | root · dialogs | ScreenBackButton | — | — | общая | свайп | «назад» на корневом экране | — | Диалоги |
| app/ai_dialog_session.tsx | /ai_dialog_session | portal | своя: BackGlyph | safeRouterBack → '/(tabs)/home'; replace ×2 | /(tabs)/home | общая | свайп | нестандартная кнопка | нет эталона → не править до макета | Диалоги |
| app/community_pack_create.tsx | /community_pack_create | child · flashcards | нет | safeRouterBack → (cloudEdit ? { pathname: '/flashcards_collection', params: { pack: editPackId } } : '/flashcards') as any, / '/flashcards'; replace ×1 | /(tabs)/home | общая | свайп | НЕТ «назад»; fallback ≠ реестр (/(tabs)/home) | ✕ слева → «назад» не нужен; ✕ = эталон | Карточки |
| app/dialogue_v2_briefing.tsx | /dialogue_v2_briefing | child · dialogs | SafeTopBackButton через components/dialogs/DialogueV2BriefingScreen.tsx | safeRouterBack → '/ai_dialog_home' | /(tabs)/lessons | общая | свайп | fallback ≠ реестр (/(tabs)/lessons) | назад → «назад» нужен ✅ | Диалоги |
| app/dialogue_v2_completion.tsx | /dialogue_v2_completion | unknown | SafeTopBackButton через components/dialogs/glass/DialogueGlassKit.tsx | safeRouterBack → '/ai_dialog_home'; replace ×1 | /(tabs)/home | своя (BackHandler) | свайп | нет в реестре ролей — «назад» сбрасывает историю на fallback; своя Android-назад — проверить логом | «закрыть» 42 → вне вопроса «назад» | Диалоги |
| app/dialogue_v2_freeform.tsx | /dialogue_v2_freeform | child · dialogs | SafeTopBackButton через components/dialogs/DialogueV2FreeformScreen.tsx | safeRouterBack → '/ai_dialog_home' | /(tabs)/lessons | общая | свайп | fallback ≠ реестр (/(tabs)/lessons) | назад → «назад» нужен ✅ | Диалоги |
| app/dialogue_v2_memory.tsx | /dialogue_v2_memory | portal | своя: BackGlyph | safeRouterBack → '/ai_dialog_home' | /(tabs)/home | общая | свайп | нестандартная кнопка | круг 48 → своя кнопка — нужна общая 48 | Диалоги |
| app/dialogue_v2_session.tsx | /dialogue_v2_session | unknown | SafeTopBackButton через components/dialogs/glass/DialogueGlassKit.tsx | safeRouterBack → '/ai_dialog_home' | /(tabs)/home | общая | свайп | нет в реестре ролей — «назад» сбрасывает историю на fallback | назад → «назад» нужен ✅ | Диалоги |
| app/exam.tsx | /exam | child · lessons | SafeTopBackButton через components/level-exam/ExamGlassParts.tsx | safeRouterBack → '/lessons_list' / HOME; replace ×4 | /(tabs)/lessons | своя (BackHandler) | свайп | fallback ≠ реестр (/(tabs)/lessons); своя Android-назад — проверить логом | — | Обучение (Learning V2) |
| app/flashcards_blitz_session.tsx | /flashcards_blitz_session | child · flashcards | SafeTopBackButton | safeRouterBack → '/flashcards'; replace ×2 | /(tabs)/home | общая | свайп | fallback ≠ реестр (/(tabs)/home) | — | Карточки |
| app/flashcards_collection.tsx | /flashcards_collection | child · flashcards | ScreenBackButton | safeRouterBack → backTarget; replace ×3 | /(tabs)/home | своя (BackHandler) | свайп | своя Android-назад — проверить логом | — | Карточки |
| app/flashcards_my_packs.tsx | /flashcards_my_packs | root · flashcards | нет | safeRouterBack → '/flashcards' | — | своя (BackHandler) | свайп | своя Android-назад — проверить логом | — | Карточки |
| app/flashcards_packs.tsx | /flashcards_packs | root · flashcards | своя: arrow-back | safeRouterBack → '/flashcards' | — | своя (BackHandler) | свайп | «назад» на корневом экране; своя Android-назад — проверить логом | — | Карточки |
| app/flashcards_recall_session.tsx | /flashcards_recall_session | child · flashcards | своя: через components/v2/BackGlyph.tsx | safeRouterBack → '/flashcards'; replace ×2 | /(tabs)/home | общая | свайп | нестандартная кнопка; fallback ≠ реестр (/(tabs)/home) | — | Карточки |
| app/flashcards_speaking_session.tsx | /flashcards_speaking_session | child · flashcards | своя: через components/v2/BackGlyph.tsx | safeRouterBack → '/flashcards'; replace ×2 | /(tabs)/home | общая | свайп | нестандартная кнопка; fallback ≠ реестр (/(tabs)/home) | — | Карточки |
| app/flashcards_swipe.tsx | /flashcards_swipe | child · flashcards | SafeTopBackButton | safeRouterBack → '/flashcards'; replace ×1 | /(tabs)/home | своя (BackHandler) | свайп | fallback ≠ реестр (/(tabs)/home); своя Android-назад — проверить логом | — | Карточки |
| app/flashcards_training_setup.tsx | /flashcards_training_setup | child · flashcards | ScreenBackButton | safeRouterBack → '/flashcards' | /(tabs)/home | общая | свайп | fallback ≠ реестр (/(tabs)/home) | — | Карточки |
| app/flashcards_video_packs.tsx | /flashcards_video_packs | child · flashcards | своя: через components/packs/PackScreenKit.tsx | safeRouterBack → '/flashcards' | /(tabs)/home | общая | свайп | нестандартная кнопка; fallback ≠ реестр (/(tabs)/home) | — | Карточки |
| app/flashcards_voice_picker.tsx | /flashcards_voice_picker | portal | своя: BackGlyph | safeRouterBack → '/settings_edu' | /(tabs)/home | общая | свайп | нестандартная кнопка | — | Карточки |
| app/friends_duel.tsx | /friends_duel | child · friends | нет («закрыть») | safeRouterBack → HOME | /(tabs)/friends | общая | свайп | только «закрыть» | ✕ слева → «только закрыть» = эталон | Друзья |
| app/friends_week_mine.tsx | /friends_week_mine | child · friends | ScreenBackButton | safeRouterBack → '/(tabs)/settings' | /(tabs)/friends | общая | свайп | fallback ≠ реестр (/(tabs)/friends) | — | Друзья |
| app/hint.tsx | /hint | child · lessons | SafeTopBackButton | safeRouterBack → '/lessons_list' / '/(tabs)/home'; replace ×1 | /(tabs)/lessons | общая | свайп | fallback ≠ реестр (/(tabs)/lessons) | назад → «назад» нужен ✅ (ScreenBackButton есть) | ? |
| app/language_welcome.tsx | /language_welcome | child · settings | своя: BackGlyph | safeRouterBack → '/(tabs)/settings'; replace ×1 | /(tabs)/settings | общая | свайп | нестандартная кнопка | назад → «назад» нужен ✅ (своя BackGlyph) | Онбординг |
| app/learning-v2/chapter-exam.tsx | /learning-v2/chapter-exam | child · lessons | своя: через components/learning-v2/LearningV2ChapterExamResult.tsx | safeRouterBack → '/learning-v2/course' | /(tabs)/lessons | общая | свайп | нестандартная кнопка; fallback ≠ реестр (/(tabs)/lessons) | вопросы и итог — ✕ слева, «Разбор ошибок» — назад → ✕ = эталон; «назад» нужен только на «Р | Обучение (Learning V2) |
| app/learning-v2/course.tsx | /learning-v2/course | child · lessons | своя: через app/(tabs)/lessons.tsx | — | /(tabs)/lessons | общая | свайп | нестандартная кнопка | — | Обучение (Learning V2) |
| app/learning-v2/session/[id].tsx | /learning-v2/session/[id] | child · lessons | нет («закрыть») | safeRouterBack → "/(tabs)/lessons"; replace ×4 | /(tabs)/lessons | общая | свайп | только «закрыть» | ✕ слева → «только закрыть» = эталон | ? |
| app/learning_v2_authoring_preview.tsx | /learning_v2_authoring_preview | child · lessons | нет | — | /(tabs)/lessons | общая | свайп | НЕТ «назад» | — | Обучение (Learning V2) |
| app/learning_v2_direct_session_player_v1.tsx | /learning_v2_direct_session_player_v1 | child · lessons | ScreenBackButton через components/theory/TheoryLessonView.tsx | safeRouterBack → exitRoute; replace ×1 | /(tabs)/lessons | своя (BackHandler) | свайп | своя Android-назад — проверить логом | — | Обучение (Learning V2) |
| app/learning_v2_modes_showcase_run/[family].tsx | /learning_v2_modes_showcase_run/[family] | child · lessons | нет («закрыть») | safeRouterBack → LEARNING_V2_MODES_SHOWCASE_ROUTE | /(tabs)/lessons | общая | свайп | только «закрыть» | режимы занятия на эталоне — ✕ слева → «только закрыть» = эталон | Обучение (Learning V2) |
| app/learning_v2_placement.tsx | /learning_v2_placement | child · lessons | нет («закрыть») | safeRouterBack → FALLBACK_ROUTE | /(tabs)/lessons | общая | свайп | только «закрыть» | ✕ слева на тесте, обложка — ничего → «только закрыть» = эталон | Обучение (Learning V2) |
| app/learning_v2_session_intro.tsx | /learning_v2_session_intro | child · lessons | нет («закрыть») | — | /(tabs)/lessons | общая | свайп | только «закрыть» | ✕ слева → «только закрыть» = эталон | Обучение (Learning V2) |
| app/learning_v2_session_intro_check.tsx | /learning_v2_session_intro_check | child · lessons | нет («закрыть») | — | /(tabs)/lessons | общая | свайп | только «закрыть» | — | Обучение (Learning V2) |
| app/lesson1.tsx | /lesson1 | child · lessons | SafeTopBackButton | safeRouterBack → '/(tabs)/lessons' / { pathname: '/lessons_list', params: { id: String(lessonId) } } / '/(tabs)/home' / { pathname: '/lesson_menu', params: { id: String(lessonId) } }; replace ×2 | /(tabs)/lessons | своя (BackHandler) | свайп | fallback ≠ реестр (/(tabs)/lessons); своя Android-назад — проверить логом | назад → «назад» нужен ✅ (своя кнопка) | Обучение (Learning V2) |
| app/lesson_complete.tsx | /lesson_complete | child · lessons | ScreenBackButton | dismissToTabRoute; replace ×8 | /(tabs)/lessons | своя (BackHandler) | свайп | своя Android-назад — проверить логом | — | Обучение (Learning V2) |
| app/lesson_intro_screens.tsx | /lesson_intro_screens | child · lessons | своя: BackGlyph | — | /(tabs)/lessons | общая | свайп | нестандартная кнопка | — | Обучение (Learning V2) |
| app/lesson_menu.tsx | /lesson_menu | child · lessons | SafeTopBackButton через app/lesson_words.tsx | safeRouterBack → '/(tabs)/home'; replace ×3 | /(tabs)/lessons | общая | свайп | fallback ≠ реестр (/(tabs)/lessons) | назад → «назад» нужен ✅ (своя BackGlyph) | Обучение (Learning V2) |
| app/lesson_verbs.tsx | /lesson_verbs | child · lessons | нет | — | /(tabs)/lessons | общая | свайп | НЕТ «назад» | маршрут — Redirect на lesson_irregular_verbs; там назад → «назад» есть на эталоне — смотре | Обучение (Learning V2) |
| app/lesson_words.tsx | /lesson_words | child · lessons | SafeTopBackButton | safeRouterBack → '/lessons_list' / { pathname: '/lessons_list', params: { id: String(lessonId) } }; replace ×1 | /(tabs)/lessons | своя (BackHandler) | свайп | fallback ≠ реестр (/(tabs)/lessons); своя Android-назад — проверить логом | — | Обучение (Learning V2) |
| app/level_exam.tsx | /level_exam | child · lessons | SafeTopBackButton через components/level-exam/ExamGlassParts.tsx | safeRouterBack → '/lessons_list'; replace ×1 | /(tabs)/lessons | общая | свайп | fallback ≠ реестр (/(tabs)/lessons) | назад → «назад» на эталоне есть и в коде есть — общая кнопка через ExamHeader с 22.10 (d73 | Обучение (Learning V2) |
| app/lingman_playlist.tsx | /lingman_playlist | child · lingman | своя: BackGlyph | safeRouterBack → LINGMAN_BACK_FALLBACK | /(tabs)/video | общая | свайп | нестандартная кнопка | назад → «назад» нужен ✅ (есть своя BackGlyph) | Видео |
| app/lingman_video_watch.tsx | /lingman_video_watch | child · lingman | своя: BackGlyph | safeRouterBack → LINGMAN_BACK_FALLBACK | /(tabs)/video | общая | свайп | нестандартная кнопка | ✕ справа → «назад» не нужен; ✕ справа = эталон | Видео |
| app/lingman_videos.tsx | /lingman_videos | root · lingman | своя: через components/youtube/YoutubeChannelHeader.tsx | safeRouterBack → '/(tabs)/home' | — | общая | свайп | «назад» на корневом экране | корень «Видео» — ничего → «назад» на корне не нужен | Видео |
| app/mistake_practice_session.tsx | /mistake_practice_session | child · flashcards | своя: через components/mistakes-panel/PanelKit.tsx | safeRouterBack → backFallback; replace ×1 | /(tabs)/home | своя (BackHandler) | свайп | нестандартная кнопка; своя Android-назад — проверить логом | — | Обучение (Learning V2) |
| app/motion_showcase.tsx | /motion_showcase | child · settings | нет | — | /(tabs)/settings | общая | свайп | НЕТ «назад» | — | ? |
| app/pack_opening.tsx | /pack_opening | child · flashcards | нет («закрыть») | safeRouterBack → '/flashcards'; replace ×1 | /(tabs)/home | своя (BackHandler) | свайп | только «закрыть»; fallback ≠ реестр (/(tabs)/home); своя Android-назад — проверить логом | — | ? |
| app/pos_analytics_audit.tsx | /pos_analytics_audit | child · practice | нет | — | /flashcards_collection | общая | свайп | НЕТ «назад» | — | ? |
| app/premium_modal.tsx | /premium_modal | portal | нет | — | /(tabs)/home | общая | свайп | НЕТ «назад» | — | Пейвол / Plus |
| app/premium_modal_v2.tsx | /premium_modal_v2 | transient | нет | replace ×1 | /(tabs)/home | общая | свайп | НЕТ «назад» | — | Пейвол / Plus |
| app/privacy_screen.tsx | /privacy_screen | child · settings | нет («закрыть») | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | общая | свайп | только «закрыть» | — | Вход, аккаунт, настройки |
| app/privacy_settings.tsx | /privacy_settings | child · settings | своя: BackGlyph | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | общая | свайп | нестандартная кнопка | — | Вход, аккаунт, настройки |
| app/promo_code_entry.tsx | /promo_code_entry | portal | нет («закрыть») | safeRouterBack → '/(tabs)/settings' / closeFallback | /(tabs)/home | общая | свайп | только «закрыть» | ✕ справа → «назад» не нужен; ✕ справа = эталон | ? |
| app/referrals.tsx | /referrals | portal | нет («закрыть») | safeRouterBack → closeFallback | /(tabs)/home | общая | свайп | только «закрыть» | эталон «назад» → эталона в силе нет → не править до решения | Друзья |
| app/settings_language.tsx | /settings_language | child · settings | нет («закрыть») | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | общая | свайп | только «закрыть» | — | Вход, аккаунт, настройки |
| app/shards_shop.tsx | /shards_shop | portal | нет | — | /(tabs)/home | общая | свайп | НЕТ «назад» | нет экрана: маршрут — Redirect на /flashcards_my_packs; эталона нет → вне аудита | Моменты / монеты |
| app/shop.tsx | /shop | portal | SafeTopBackButton | safeRouterBack → '/(tabs)/home' | /(tabs)/home | своя (BackHandler) | свайп | своя Android-назад — проверить логом | нет эталона 2.0 → не править до макета | Моменты / монеты |
| app/streak_stats.tsx | /streak_stats | root · stats | SafeTopBackButton | safeRouterBack → '/(tabs)/home' | — | общая | свайп | «назад» на корневом экране | — | Моменты / монеты |
| app/survey_screen.tsx | /survey_screen | portal | своя: BackGlyph | safeRouterBack → HOME | /(tabs)/home | общая | свайп | нестандартная кнопка | — | ? |
| app/terms_screen.tsx | /terms_screen | child · settings | нет («закрыть») | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | общая | свайп | только «закрыть» | — | Вход, аккаунт, настройки |
| app/year_activity.tsx | /year_activity | root · stats | ScreenBackButton | safeRouterBack → HOME | — | общая | свайп | «назад» на корневом экране | — | ? |

## Все экраны

| экран | есть/нет | компонент | позиция | ведёт | должна | Android | iOS | эталон | зона |
|---|---|---|---|---|---|---|---|---|---|
| app/(tabs)/arena.tsx | нет | нет | — | — | /(tabs)/home | общая | свайп | — | ? |
| app/(tabs)/community.tsx | корень | ScreenBackButton | общая (20 / 48 / безопасный верх) | replace ×1 | — | общая | свайп | ничего — корень вкладки → «назад» на корне не нужен | ? |
| app/(tabs)/friends.tsx | корень | нет («закрыть») | — | — | — | общая | свайп | — | Друзья |
| app/(tabs)/home.tsx | корень | своя: через components/NotificationCenterButton.tsx | своя | — | — | общая | свайп | — | ? |
| app/(tabs)/index.tsx | корень | нет | — | — | — | общая | свайп | — | ? |
| app/(tabs)/journal.tsx | корень | нет | — | — | — | общая | свайп | — | ? |
| app/(tabs)/lessons.tsx | корень | ScreenBackButton через components/learning-v2/season/SeasonPickScreens.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → HOME_BACK_FALLBACK | — | общая | свайп | — | Обучение (Learning V2) |
| app/(tabs)/settings.tsx | корень | нет | — | — | — | общая | свайп | — | Вход, аккаунт, настройки |
| app/(tabs)/video.tsx | корень | нет | — | — | — | общая | свайп | — | Видео |
| app/account_details.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | своя (BackHandler) | свайп | — | Вход, аккаунт, настройки |
| app/achievements_screen.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → HOME | /(tabs)/home | общая | свайп | — | Моменты / монеты |
| app/ai_companion_session.tsx | есть | своя: BackGlyph | своя | safeRouterBack → '/(tabs)/home'; replace ×3 | /(tabs)/home | общая | свайп | нет эталона → не править до макета | Диалоги |
| app/ai_dialog_briefing.tsx | есть | своя: через components/AiDialogBriefingScreen.tsx | своя | safeRouterBack → '/ai_dialog_home' / '/(tabs)/lessons'; replace ×1 | /(tabs)/home | общая | свайп | нет эталона → не править | Диалоги |
| app/ai_dialog_consent_gate.tsx | есть | своя: BackGlyph | своя | safeRouterBack → '/(tabs)/lessons' | /(tabs)/home | общая | свайп | круг 48 → своя кнопка — нужна общая 48 | Диалоги |
| app/ai_dialog_home.tsx | корень | ScreenBackButton | общая (20 / 48 / безопасный верх) | — | — | общая | свайп | — | Диалоги |
| app/ai_dialog_session.tsx | есть | своя: BackGlyph | своя | safeRouterBack → '/(tabs)/home'; replace ×2 | /(tabs)/home | общая | свайп | нет эталона → не править до макета | Диалоги |
| app/coin_rank.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → HOME | /(tabs)/home | общая | свайп | — | Моменты / монеты |
| app/coin_rank_catalog.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → HOME | /(tabs)/home | общая | свайп | — | Моменты / монеты |
| app/combined_lesson_pick.tsx | есть | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/lessons' | /(tabs)/lessons | общая | свайп | назад → «назад» нужен ✅ — SafeTopBackButton в коде с 22.10 (29128ef22); «НЕТ назад» в ауди | Обучение (Learning V2) |
| app/community_pack_create.tsx | нет | нет | — | safeRouterBack → (cloudEdit ? { pathname: '/flashcards_collection', params: { pack: editPackId } } : '/flashcards') as any, / '/flashcards'; replace ×1 | /(tabs)/home | общая | свайп | ✕ слева → «назад» не нужен; ✕ = эталон | Карточки |
| app/dev_cards_result_preview.tsx | нет | нет | — | safeRouterBack → HOME; router.back ×1 | /(tabs)/home | общая | свайп | — | Карточки |
| app/diagnostic_test.tsx | есть | ScreenBackButton через app/settings_edu.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → HOME; replace ×2 | /(tabs)/lessons | общая | свайп | — | ? |
| app/dialogue_v2_briefing.tsx | есть | SafeTopBackButton через components/dialogs/DialogueV2BriefingScreen.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → '/ai_dialog_home' | /(tabs)/lessons | общая | свайп | назад → «назад» нужен ✅ | Диалоги |
| app/dialogue_v2_completion.tsx | есть | SafeTopBackButton через components/dialogs/glass/DialogueGlassKit.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → '/ai_dialog_home'; replace ×1 | /(tabs)/home | своя (BackHandler) | свайп | «закрыть» 42 → вне вопроса «назад» | Диалоги |
| app/dialogue_v2_freeform.tsx | есть | SafeTopBackButton через components/dialogs/DialogueV2FreeformScreen.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → '/ai_dialog_home' | /(tabs)/lessons | общая | свайп | назад → «назад» нужен ✅ | Диалоги |
| app/dialogue_v2_memory.tsx | есть | своя: BackGlyph | своя | safeRouterBack → '/ai_dialog_home' | /(tabs)/home | общая | свайп | круг 48 → своя кнопка — нужна общая 48 | Диалоги |
| app/dialogue_v2_session.tsx | есть | SafeTopBackButton через components/dialogs/glass/DialogueGlassKit.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → '/ai_dialog_home' | /(tabs)/home | общая | свайп | назад → «назад» нужен ✅ | Диалоги |
| app/dialogue_v2_theme.tsx | есть | ScreenBackButton через components/dialogs/hub/DialogueV2ThemeScreen.tsx | общая (20 / 48 / безопасный верх) | — | /(tabs)/lessons | общая | свайп | круг 48 → совпадает | Диалоги |
| app/exam.tsx | есть | SafeTopBackButton через components/level-exam/ExamGlassParts.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → '/lessons_list' / HOME; replace ×4 | /(tabs)/lessons | своя (BackHandler) | свайп | — | Обучение (Learning V2) |
| app/flashcards.tsx | корень | нет | — | — | — | общая | свайп | — | Карточки |
| app/flashcards_blitz_session.tsx | есть | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/flashcards'; replace ×2 | /(tabs)/home | общая | свайп | — | Карточки |
| app/flashcards_card_editor.tsx | есть | SafeTopBackButton через app/lesson_words.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → fallback; replace ×2 | /(tabs)/home | общая | свайп | — | Карточки |
| app/flashcards_collection.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → backTarget; replace ×3 | /(tabs)/home | своя (BackHandler) | свайп | — | Карточки |
| app/flashcards_my_packs.tsx | корень | нет | — | safeRouterBack → '/flashcards' | — | своя (BackHandler) | свайп | — | Карточки |
| app/flashcards_packs.tsx | корень | своя: arrow-back | своя | safeRouterBack → '/flashcards' | — | своя (BackHandler) | свайп | — | Карточки |
| app/flashcards_recall_session.tsx | есть | своя: через components/v2/BackGlyph.tsx | своя | safeRouterBack → '/flashcards'; replace ×2 | /(tabs)/home | общая | свайп | — | Карточки |
| app/flashcards_speaking_session.tsx | есть | своя: через components/v2/BackGlyph.tsx | своя | safeRouterBack → '/flashcards'; replace ×2 | /(tabs)/home | общая | свайп | — | Карточки |
| app/flashcards_swipe.tsx | есть | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/flashcards'; replace ×1 | /(tabs)/home | своя (BackHandler) | свайп | — | Карточки |
| app/flashcards_training_setup.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/flashcards' | /(tabs)/home | общая | свайп | — | Карточки |
| app/flashcards_truefalse_session.tsx | есть | SafeTopBackButton через app/flashcards_swipe.tsx | общая (20 / 48 / безопасный верх) | — | /(tabs)/home | общая | свайп | ✕ слева → не дефект | Карточки |
| app/flashcards_video_packs.tsx | есть | своя: через components/packs/PackScreenKit.tsx | своя | safeRouterBack → '/flashcards' | /(tabs)/home | общая | свайп | — | Карточки |
| app/flashcards_voice_picker.tsx | есть | своя: BackGlyph | своя | safeRouterBack → '/settings_edu' | /(tabs)/home | общая | свайп | — | Карточки |
| app/friends_duel.tsx | нет | нет («закрыть») | — | safeRouterBack → HOME | /(tabs)/friends | общая | свайп | ✕ слева → «только закрыть» = эталон | Друзья |
| app/friends_week_mine.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/settings' | /(tabs)/friends | общая | свайп | — | Друзья |
| app/hint.tsx | есть | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/lessons_list' / '/(tabs)/home'; replace ×1 | /(tabs)/lessons | общая | свайп | назад → «назад» нужен ✅ (ScreenBackButton есть) | ? |
| app/language_welcome.tsx | есть | своя: BackGlyph | своя | safeRouterBack → '/(tabs)/settings'; replace ×1 | /(tabs)/settings | общая | свайп | назад → «назад» нужен ✅ (своя BackGlyph) | Онбординг |
| app/learning-v2/chapter-exam.tsx | есть | своя: через components/learning-v2/LearningV2ChapterExamResult.tsx | своя | safeRouterBack → '/learning-v2/course' | /(tabs)/lessons | общая | свайп | вопросы и итог — ✕ слева, «Разбор ошибок» — назад → ✕ = эталон; «назад» нужен только на «Р | Обучение (Learning V2) |
| app/learning-v2/course.tsx | есть | своя: через app/(tabs)/lessons.tsx | своя | — | /(tabs)/lessons | общая | свайп | — | Обучение (Learning V2) |
| app/learning-v2/session/[id].tsx | нет | нет («закрыть») | — | safeRouterBack → "/(tabs)/lessons"; replace ×4 | /(tabs)/lessons | общая | свайп | ✕ слева → «только закрыть» = эталон | ? |
| app/learning_v2_authoring_preview.tsx | нет | нет | — | — | /(tabs)/lessons | общая | свайп | — | Обучение (Learning V2) |
| app/learning_v2_direct_session_player_v1.tsx | есть | ScreenBackButton через components/theory/TheoryLessonView.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → exitRoute; replace ×1 | /(tabs)/lessons | своя (BackHandler) | свайп | — | Обучение (Learning V2) |
| app/learning_v2_lesson_words.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | — | /(tabs)/lessons | общая | свайп | — | Обучение (Learning V2) |
| app/learning_v2_modes_showcase_run/[family].tsx | нет | нет («закрыть») | — | safeRouterBack → LEARNING_V2_MODES_SHOWCASE_ROUTE | /(tabs)/lessons | общая | свайп | режимы занятия на эталоне — ✕ слева → «только закрыть» = эталон | Обучение (Learning V2) |
| app/learning_v2_placement.tsx | нет | нет («закрыть») | — | safeRouterBack → FALLBACK_ROUTE | /(tabs)/lessons | общая | свайп | ✕ слева на тесте, обложка — ничего → «только закрыть» = эталон | Обучение (Learning V2) |
| app/learning_v2_session_intro.tsx | нет | нет («закрыть») | — | — | /(tabs)/lessons | общая | свайп | ✕ слева → «только закрыть» = эталон | Обучение (Learning V2) |
| app/learning_v2_session_intro_check.tsx | нет | нет («закрыть») | — | — | /(tabs)/lessons | общая | свайп | — | Обучение (Learning V2) |
| app/lesson1.tsx | есть | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/lessons' / { pathname: '/lessons_list', params: { id: String(lessonId) } } / '/(tabs)/home' / { pathname: '/lesson_menu', params: { id: String(lessonId) } }; replace ×2 | /(tabs)/lessons | своя (BackHandler) | свайп | назад → «назад» нужен ✅ (своя кнопка) | Обучение (Learning V2) |
| app/lesson_complete.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | dismissToTabRoute; replace ×8 | /(tabs)/lessons | своя (BackHandler) | свайп | — | Обучение (Learning V2) |
| app/lesson_help.tsx | есть | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → { pathname: '/lesson_menu', params: { id: String(lessonId) } } | /(tabs)/lessons | общая | свайп | — | Обучение (Learning V2) |
| app/lesson_intro_screens.tsx | есть | своя: BackGlyph | своя | — | /(tabs)/lessons | общая | свайп | — | Обучение (Learning V2) |
| app/lesson_irregular_verbs.tsx | есть | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → { pathname: '/lesson_menu', params: { id: String(lessonId) } }; replace ×1 | /(tabs)/lessons | общая | свайп | — | Обучение (Learning V2) |
| app/lesson_menu.tsx | есть | SafeTopBackButton через app/lesson_words.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/home'; replace ×3 | /(tabs)/lessons | общая | свайп | назад → «назад» нужен ✅ (своя BackGlyph) | Обучение (Learning V2) |
| app/lesson_theory_v2.tsx | есть | ScreenBackButton через components/theory/TheoryLessonView.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → { pathname: '/lesson_menu', params: { id: String(lessonId) } }; replace ×1 | /(tabs)/lessons | общая | свайп | — | Обучение (Learning V2) |
| app/lesson_verbs.tsx | нет | нет | — | — | /(tabs)/lessons | общая | свайп | маршрут — Redirect на lesson_irregular_verbs; там назад → «назад» есть на эталоне — смотре | Обучение (Learning V2) |
| app/lesson_words.tsx | есть | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/lessons_list' / { pathname: '/lessons_list', params: { id: String(lessonId) } }; replace ×1 | /(tabs)/lessons | своя (BackHandler) | свайп | — | Обучение (Learning V2) |
| app/level_exam.tsx | есть | SafeTopBackButton через components/level-exam/ExamGlassParts.tsx | общая (20 / 48 / безопасный верх) | safeRouterBack → '/lessons_list'; replace ×1 | /(tabs)/lessons | общая | свайп | назад → «назад» на эталоне есть и в коде есть — общая кнопка через ExamHeader с 22.10 (d73 | Обучение (Learning V2) |
| app/lingman_playlist.tsx | есть | своя: BackGlyph | своя | safeRouterBack → LINGMAN_BACK_FALLBACK | /(tabs)/video | общая | свайп | назад → «назад» нужен ✅ (есть своя BackGlyph) | Видео |
| app/lingman_video_watch.tsx | есть | своя: BackGlyph | своя | safeRouterBack → LINGMAN_BACK_FALLBACK | /(tabs)/video | общая | свайп | ✕ справа → «назад» не нужен; ✕ справа = эталон | Видео |
| app/lingman_videos.tsx | корень | своя: через components/youtube/YoutubeChannelHeader.tsx | своя | safeRouterBack → '/(tabs)/home' | — | общая | свайп | корень «Видео» — ничего → «назад» на корне не нужен | Видео |
| app/manage_subscription.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → closeFallback; replace ×1 | /(tabs)/home | общая | свайп | — | Пейвол / Plus |
| app/mistake_detail.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/mistakes_list' | /(tabs)/home | общая | свайп | — | Обучение (Learning V2) |
| app/mistake_practice_session.tsx | есть | своя: через components/mistakes-panel/PanelKit.tsx | своя | safeRouterBack → backFallback; replace ×1 | /(tabs)/home | своя (BackHandler) | свайп | — | Обучение (Learning V2) |
| app/mistakes_hub.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/' | /(tabs)/home | общая | свайп | — | Обучение (Learning V2) |
| app/mistakes_list.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/mistakes_hub' | /(tabs)/home | общая | свайп | — | Обучение (Learning V2) |
| app/motion_showcase.tsx | нет | нет | — | — | /(tabs)/settings | общая | свайп | — | ? |
| app/pack_opening.tsx | нет | нет («закрыть») | — | safeRouterBack → '/flashcards'; replace ×1 | /(tabs)/home | своя (BackHandler) | свайп | — | ? |
| app/pos_analytics_audit.tsx | нет | нет | — | — | /flashcards_collection | общая | свайп | — | ? |
| app/premium_modal.tsx | нет | нет | — | — | /(tabs)/home | общая | свайп | — | Пейвол / Plus |
| app/premium_modal_v2.tsx | нет | нет | — | replace ×1 | /(tabs)/home | общая | свайп | — | Пейвол / Plus |
| app/preposition_drill.tsx | есть | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → { pathname: '/lesson_menu', params: { id: String(lessonId) } }; replace ×1 | /(tabs)/lessons | общая | свайп | — | ? |
| app/privacy_screen.tsx | нет | нет («закрыть») | — | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | общая | свайп | — | Вход, аккаунт, настройки |
| app/privacy_settings.tsx | есть | своя: BackGlyph | своя | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | общая | свайп | — | Вход, аккаунт, настройки |
| app/promo_code_entry.tsx | нет | нет («закрыть») | — | safeRouterBack → '/(tabs)/settings' / closeFallback | /(tabs)/home | общая | свайп | ✕ справа → «назад» не нужен; ✕ справа = эталон | ? |
| app/referrals.tsx | нет | нет («закрыть») | — | safeRouterBack → closeFallback | /(tabs)/home | общая | свайп | эталон «назад» → эталона в силе нет → не править до решения | Друзья |
| app/runes_wallet.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → HOME | /(tabs)/home | общая | свайп | — | Моменты / монеты |
| app/settings_edu.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/settings' | /(tabs)/home | общая | свайп | — | Вход, аккаунт, настройки |
| app/settings_language.tsx | нет | нет («закрыть») | — | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | общая | свайп | — | Вход, аккаунт, настройки |
| app/settings_notifications.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | общая | свайп | — | Вход, аккаунт, настройки |
| app/settings_themes.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | общая | свайп | — | Вход, аккаунт, настройки |
| app/shards_shop.tsx | нет | нет | — | — | /(tabs)/home | общая | свайп | нет экрана: маршрут — Redirect на /flashcards_my_packs; эталона нет → вне аудита | Моменты / монеты |
| app/shop.tsx | есть | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/home' | /(tabs)/home | своя (BackHandler) | свайп | нет эталона 2.0 → не править до макета | Моменты / монеты |
| app/streak_stats.tsx | корень | SafeTopBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/home' | — | общая | свайп | — | Моменты / монеты |
| app/support_report.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/settings' | /(tabs)/home | общая | свайп | — | Вход, аккаунт, настройки |
| app/survey_screen.tsx | есть | своя: BackGlyph | своя | safeRouterBack → HOME | /(tabs)/home | общая | свайп | — | ? |
| app/terms_screen.tsx | нет | нет («закрыть») | — | safeRouterBack → '/(tabs)/settings' | /(tabs)/settings | общая | свайп | — | Вход, аккаунт, настройки |
| app/today_tasks.tsx | есть | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → '/(tabs)/home'; dismissToTabRoute | /(tabs)/home | общая | свайп | нет эталона экрана «Сегодня» → не править до макета | ? |
| app/year_activity.tsx | корень | ScreenBackButton | общая (20 / 48 / безопасный верх) | safeRouterBack → HOME | — | общая | свайп | — | ? |

## Разделы других сессий

Сюда — свои разделы (Дизайн, владельцы зон). Пересборка скрипта переносит всё ниже этого заголовка как есть.

### 8 · МОМЕНТЫ — праздничные окна, тосты, итог диалога, Пик (26.10)

Правила владельца: R1 — Android «назад» и свайп iOS закрывают окно так же, как его кнопка / тап по фону; R2 — под окном
не листается экран; R3 — после закрытия человек там, где был, без петель; R4 — окно не открывается снова после «назад».

| Окно | Как устроено | Android «назад» | Итог |
|---|---|---|---|
| Рубежи серии (StreakMilestoneScreen через хост) | Modal | `onRequestClose` → тот же обработчик, что кнопка | ✅ R1–R4; пометка «показан» ставится при показе |
| Тост рубежа серии / медали | неблокирующий слой | ловит касания только на своей плашке, «назад» — обычный «назад» экрана | ✅ по замыслу |
| Итог недели Пика (MomentPromotion / Short / Stay / Down) | Modal + SheetSwipeRoot | `onRequestClose={onClose}` — как «Играть»/крестик | ✅; в журнале «назад» и «Играть» не различаются (мелочь) |
| «Позиция выросла» | Modal | `onRequestClose → finish('back')` | ✅ |
| «Тебя обогнали» (тост) | неблокирующий слой | обычный «назад» экрана | ✅ по замыслу |
| «Последний шанс» | KitSheetModal | `onRequestClose={onClose}` | ✅ |
| Итог ступени / этажа Пика, окно «нет энергии», тур Пика | Modal | `onRequestClose` → тот же обработчик | ✅; итог ступени зовёт `dismissOutcome` напрямую, мимо защиты от двойного тапа — побочные эффекты те же |
| Итог диалога (`app/dialogue_v2_completion.tsx`, маршрут) | экран | **было:** общий обработчик → Главная (экран вне реестра разделов), а ✕ → Диалоги | ❌ R1 → **починено:** экран сам владеет «назад» (`SCREEN_OWNED_ANDROID_BACK_PATHS`), «назад» = ✕ → Диалоги, повтор пропускается; сторож `tests/dialogue_completion_back_2026_10_26.test.ts` |

Свайп iOS выключен для всего стека в `app/_layout.tsx` (≈3731) — в разделе «Правило» выше сказано обратное; решает Ядро.
Окна моей зоны ставят пометку «показано» в момент показа, поэтому «назад» не может открыть их повторно (R4).

### 2 · ДИЗАЙН — пейвол Plus, окна М, Мастерская фраз (проверено чтением кода, 25→26.10)

Ручная проверка поверх таблиц Ядра: скрипт видит только файл маршрута, а окно Plus рисует компонент, поэтому строки «НЕТ „назад“» у пейвола ложные.

| что | вердикт | где смотреть |
|---|---|---|
| `premium_modal.tsx`, `premium_modal_v2.tsx` — «НЕТ „назад“» | **ложная тревога**: диспетчеры; экран рисует `components/paywall/PaywallPlusScreen.tsx`. Кнопка закрытия видна всегда (`closeVisible: true`); в М — «Не сейчас» слева вверху (`testID=paywall-close`), на каждой панели М своя «Не сейчас»/«Позже» | `paywall_control_visibility.ts`, `PaywallMSheet.tsx`, `PaywallMPanels.tsx` |
| Закрытие приводит на экран-источник | да: `dismissPaywallModal(router, fallback)`, запасной путь — Главная | `premium_modal.tsx`, `navigation_back.ts` |
| Android-назад = ✕ = свайп вниз = тап по фону | один путь `handleClose('close', 'back'/'x'/'swipe'/'scrim')`, одна блокировка двойного тапа (800 мс), одна запись в журнал | `PaywallPlusScreen.tsx` |
| Во время оплаты | Android-назад глотается (`return true`), свайп iOS выключен (`gestureEnabled:false`), «Не сейчас» неактивна, тап по фону игнорируется с записью причины | те же места |
| Экран «напоминание о пробном» | «назад» = «Не сейчас» (`skipTrialReminder`), свайп выключен | `PaywallPlusScreen.tsx` |
| Панель → полный экран М | состояние внутри окна, не экран навигации: «назад» с любой стадии закрывает пейвол целиком, петель нет | `PaywallMSheet.tsx` |
| Панели М (энергия, серия, замок, Мастерская, «Разговор с ИИ», «Не видим твой Plus») | у каждой «Не сейчас»; «Восстановить»/«Оформить» блокируют закрытие на время запроса | `PaywallMPanels.tsx` |
| `promo_code_entry.tsx` (из пейвола) | видимая кнопка закрытия есть, ведёт `safeRouterBack(router, closeFallback)` — зона «?» в таблице Ядра: моя, дефекта нет | `promo_code_entry.tsx` |
| `manage_subscription.tsx` | общая `ScreenBackButton`, возврат на источник | таблица Ядра ✓ |
| Мастерская: `combo_lesson_gate.tsx` | невидимый замок без своей кнопки — так задумано: пейвол, после закрытия `leave()` → `safeRouterBack('/(tabs)/lessons')`, при зависшем статусе выходит сам по потолку времени | `combo_lesson_gate.tsx` |
| Мастерская: `lesson1` и `lesson_complete` с `workshop=1` | «назад» идёт обычным путём урока; петли «итог ⇆ урок» нет; «К урокам» теперь через `dismissToTabRoute` (правка Ядра) | `lesson1.tsx`, `lesson_complete.tsx` |

Дефектов, требующих правки кода «назад» в пейволе и окнах М, не найдено.
