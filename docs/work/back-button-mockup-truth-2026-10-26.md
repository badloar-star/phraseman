# «Назад» по эталонам — что нарисовано в углу (26.10, 3 · МАКЕТЫ)

К аудиту Ядра `docs/work/back-button-audit-2026-10-26.md` (8e9e5ec8b). Правило координатора: «нет „назад“» или «только
„закрыть“» — дефект **только если на эталоне есть «назад»**. Гейт «приложение = макет» главнее аудита.

Как проверено: маршрут → строки реестра `visual_parity.json` (поле `code`) → эталон (файл + телефон) → эталон открыт в
браузере, иконка в верхней полосе экрана определена по пути svg и **просмотрена глазами** на снимках
(`C:/Temp/claude/mb/spire3/backtruth/`). Где строки нет — эталон найден по ссылке в коде экрана и подписи телефона.

Обозначения: **назад** — круг «‹» слева; **✕ слева / ✕ справа** — «закрыть»; **ничего** — в углу нет ни того ни другого;
**нет эталона** — экран не правим до макета и «да» владельца.

## Ядро

| Экран | На эталоне | Строки реестра · статус | Вывод |
|---|---|---|---|
| community_pack_create | **✕ слева** (cards-v2.html №22–24, 47, 58, 74–75, 78, 92–93) | cards-v2-022 diff · cards-v2-023 pending · cards-v2-024 diff · cards-v2-047 pending · cards-023/024/069/070/072/074 pending · cards-065/066/071 diff · cards-067/068 match · cards-section-019 pending · cards-section-020/021 diff | «назад» не нужен; ✕ = эталон |
| flashcards_truefalse_session | **✕ слева** (cards-v2.html №33, 38) | cards-v2-033 match · cards-section-042 match · cards-v2-038 pending · cards-section-049 pending | не дефект |
| today_tasks | **нет эталона** экрана «Сегодня» (today-scene-concepts.html и Моменты v3 — блок «Сегодня» на Главной, не отдельный экран) | строк нет | не править до макета |
| (tabs)/community | **ничего** — корень вкладки (spire.html №4 «Пик») | community-001 pending | «назад» на корне не нужен |
| shards_shop | **нет экрана**: маршрут — Redirect на /flashcards_my_packs; эталона нет (COVERAGE PAY-03 «уточнить владельцу») | строк нет | вне аудита |
| referrals | эталон «назад» (profile.html №14), **но строка снята владельцем** | profile-026 removed_by_owner | эталона в силе нет → не править до решения |
| promo_code_entry | **✕ справа** (promo-code-states.html №1–3, 6–12); на «Срок подтверждён / Бессрочный» — кнопка «Закрыть» справа (№4–5) | overlays-campaigns-005 match · 004/006/013 pending · 007–012, 014, 015 diff | «назад» не нужен; ✕ справа = эталон |
| shop | **нет эталона 2.0** (в коде ссылка на старый docs/v2/mockups/28-shop.html, его нет в реестре; COVERAGE «decision=unknown») | строк нет | не править до макета |
| friends_duel | **✕ слева** (friends-full.html №31 «Фраза 2 из 5», №35–36 итог) | строк нет (friends-full.html в реестр не заведён) | «только закрыть» = эталон |
| lingman_videos | корень «Видео» — **ничего** (video-redesign.html №1–2, video.html «Загрузка/Пусто/Нет сети/Ошибка»); страница канала Professor Lingman — **назад** (video.html №1) | video-001/002/008/018–024 pending · video-007 removed_by_owner · overlays-runtime-008/009/010 pending (окно над экраном) | «назад» на корне не нужен |
| lingman_playlist | **назад** (video.html «Плейлист», «Плейлист пуст») | video-009 diff · video-010 pending | «назад» нужен ✅ (есть своя BackGlyph) |
| lingman_video_watch | **✕ справа** (video.html «Смотрю ролик», «Фраза подробно», «Фразы грузятся/не загрузились») | строк по коду нет; ближайшая video-011 diff (код — lingman_videos) | «назад» не нужен; ✕ справа = эталон |

⚠ В video.html номера телефонов в реестре сдвинуты на 2 (video-011 «Смотрю ролик» указывает на №11 = «Плейлист»). Сверке
брать телефон по подписи, а Макетам — пересчитать номера в реестре (отдельной правкой).

## Learning V2

| Экран | На эталоне | Строки реестра · статус | Вывод |
|---|---|---|---|
| lesson_verbs | маршрут — Redirect на lesson_irregular_verbs; там **назад** (learn.html H1–H4б), «Порция пройдена» — **✕ слева** (H5) | learn-064…068 pending · learn-069 pending | «назад» есть на эталоне — смотреть lesson_irregular_verbs, не lesson_verbs |
| level_exam | **назад** (learn.html K1–K5б, K8); итог K6–K7 — **✕ слева** | learn-085…093 pending · overlays-runtime-028 pending | «назад» на эталоне есть и в коде есть — общая кнопка через ExamHeader с 22.10 (d739a0bd5); сканер аудита её не видит. Итог: ✕ слева добавлен 90f5cfe7f ✅ |
| hint | **назад** (learn.html G1–G5, общий TheoryLessonView) | строки на lesson_help: learn-059 diff · learn-060…063 pending | «назад» нужен ✅ (ScreenBackButton есть) |
| lesson_menu | **назад** (learn.html B1–B5) | learn-019/021/022/023 pending · learn-020 diff · overlays-runtime-030…033 pending | «назад» нужен ✅ (своя BackGlyph) |
| combined_lesson_pick | **назад** (learn.html A15–A17) | learn-016/017/018 match | «назад» нужен ✅ — SafeTopBackButton в коде с 22.10 (29128ef22); «НЕТ назад» в аудите — ложное срабатывание сканера |
| learning-v2/session/[id] | **✕ слева** (learning-v2.html №67 скелет) | learning-v2-067 pending r1 | «только закрыть» = эталон |
| learning-v2/chapter-exam | вопросы и итог — **✕ слева**, «Разбор ошибок» — **назад** (chapter-exam-season.html №8–13) | строк нет (эталон Сезона в реестре не заведён) | ✕ = эталон; «назад» нужен только на «Разборе» |
| lesson1 | **назад** (learn.html D1–D18, V1–V2) | learn-028 diff · learn-029…035, 041…044, 046 pending · voice-mics-learn-001/002 pending r1 | «назад» нужен ✅ (своя кнопка) |
| learning_v2_modes_showcase_run/[family] | режимы занятия на эталоне — **✕ слева** (learning-v2.html №28–59) | строк на этот маршрут нет (строки режимов 028–059 — плеер) | «только закрыть» = эталон |
| learning_v2_placement | **✕ слева** на тесте, обложка — **ничего** (chapter-exam-season.html №14–17) | строк нет | «только закрыть» = эталон |
| learning_v2_session_intro | **✕ слева** (learning-v2.html №21, 23–26) | learning-v2-023/024/025 pending r1 · learning-v2-021 pending | «только закрыть» = эталон |

## 5 · ВХОД

| Экран | На эталоне | Строки реестра · статус | Вывод |
|---|---|---|---|
| «Язык» settings_language | **✕ слева** (profile.html №4, settings-gaps-states.html №18) | profile-004 match · settings-gap-018 diff | «только закрыть» = эталон |
| «Политика» privacy_screen | **✕ слева** + «открыть в браузере» справа (profile.html №10) | profile-011 match | «только закрыть» = эталон |
| «Условия» terms_screen | **✕ слева** (profile.html №11) | profile-012 match | «только закрыть» = эталон |
| language_welcome | **назад** (onboarding-states.html №26–28), «готово» №29 — ничего | onboarding-026/027/028/029 match | «назад» нужен ✅ (своя BackGlyph) |
| Онбординг (CleanOnboarding) | приветствие и вход №1–6 — **ничего**; №7–22 — **назад**; цена №23–25 — **✕ слева** | onboarding-001…022, 025 (match: 002, 006, 007, 008, 010, 025; diff: 001, 011, 014, 015, 019–022; pending: 003–005, 009, 012, 013, 016–018); у телефонов №23–24 строк нет | «назад» нужен на шагах 7–22 |

## Моменты — Диалоги

| Экран | На эталоне | Строки реестра · статус | Вывод |
|---|---|---|---|
| ai_dialog_consent_gate | **назад** (dialogs.html №11) | dialogs-010 diff r1 | «назад» нужен ✅ |
| dialogue_v2_briefing | **назад** (dialogs.html №8–9, dialogs-gaps-states.html №17) | dialogs-007 pending · dialogs-008 diff · dialogs-gap-017 pending | «назад» нужен ✅ |
| dialogue_v2_session | **назад** (dialogs.html №25–29, 33–34, 60–61; dialogs-gaps-states.html №12, 13, 16) | dialogs-024…027, 032, 033 pending · dialogs-028 blocked · dialogs-gap-012/016 pending · dialogs-gap-013 diff · voice-mics-dialogs-001/002 pending | «назад» нужен ✅ |
| dialogue_v2_freeform | **назад** (dialogs.html №40, 53–54; dialogs-gaps-states.html №9–11) | dialogs-039/045 diff · dialogs-046 pending · dialogs-gap-009/010/011 pending | «назад» нужен ✅ |
| dialogue_v2_memory | **назад** (dialogs-gaps-states.html №1–6) | dialogs-gap-001…006 pending | «назад» нужен ✅ |
| dialogue_v2_completion | **✕ слева** (dialogs.html №41–45, dialogs-gaps-states.html №7–8, practice.html №26) | dialogs-040…044 pending · dialogs-gap-007/008 pending · practice-026 pending · moments-v3-m18-a diff | «только закрыть» = эталон |
| dialogue_v2_theme | **назад** (dialogs-hub-v4.html №6 «Раскрытый мир») | строк нет (хаб v4 в реестр не заведён) | «назад» нужен ✅ (ScreenBackButton есть) |
| ai_companion_session | **нет эталона** (COVERAGE DLG-03 «уточнить владельцу») | строк нет | не править до макета |
| ai_dialog_briefing | **нет эталона** (легаси; в стор-сборке уводит на Главную, dialogs-inventory D10) | строк нет | не править |
| ai_dialog_session | **нет эталона** (легаси; в стор-сборке уводит на Главную, dialogs-inventory №57) | строк нет | не править |

## Итог для владельцев зон

- **Дефектов по эталону нет.** (Исправлено 26.10: level_exam и combined_lesson_pick значились дефектами по сканеру аудита, но общая кнопка «назад» стоит в коде с 22.10 — d739a0bd5, 29128ef22; сканер не узнаёт SafeTopBackButton/ExamHeader. Итог экзамена уровня получил ✕ по эталону K6–K7 — 90f5cfe7f.)
- **«Только закрыть» = эталон, не трогать:** community_pack_create, truefalse, promo_code_entry (✕ справа), friends_duel,
  lingman_video_watch (✕ справа), learning-v2/session, chapter-exam (кроме «Разбора»), modes_showcase_run, placement,
  session_intro, «Язык», «Политика», «Условия», dialogue_v2_completion.
- **«Назад» на корне не нужен:** (tabs)/community, lingman_videos (корень «Видео»).
- **Нет эталона — утром владельцу списком:** today_tasks, shop, ai_companion_session, ai_dialog_briefing, ai_dialog_session;
  referrals (строка снята владельцем); shards_shop — не экран (перенаправление).
- **Эталон есть, строк реестра нет:** friends-full.html (дуэль), chapter-exam-season.html (экзамен, распределение),
  dialogs-hub-v4.html (тема) — завести строки по слову координатора.

## Диалоги: размер «назад» — эталон против кода (дополнение 26.10, по слову координатора)

Замер в браузере по эталонам (телефон 390/430 px = dp, kit.css): на всех экранах Диалогов «назад» — круг **48** (класс .rb.l),
слева **20**, иконка ≈ 20. У итога диалога «закрыть» — круг **42** (.rb). То же подтвердили Моменты по kit.css.

| Экран | Эталон | В коде | Расхождение |
|---|---|---|---|
| dialogue_v2_briefing / session / freeform (шапка .dh) | круг 48 (dialogs №8–9, 25–34, 40, 53–54) | DialogueGlassBackButton 44 | −4: круг меньше эталона |
| dialogue_v2_memory | круг 48 (dialogs-gaps-states №1–6) | BackGlyph 23 | своя кнопка — нужна общая 48 |
| ai_dialog_consent_gate | круг 48 (dialogs №11) | BackGlyph 18 | своя кнопка — нужна общая 48 |
| dialogue_v2_theme | круг 48 (dialogs-hub-v4 №6) | ScreenBackButton 48 | совпадает |
| dialogue_v2_completion | «закрыть» 42 (dialogs №41–45) | — | вне вопроса «назад» |
| ai_dialog_session | нет эталона | BackGlyph 28 | не править до макета |
| ai_companion_session | нет эталона | BackGlyph 22 | не править до макета |

Решение по 44 → 48 — у координатора (Моменты правят после «да»).

## Владельцу на утро — экраны без эталона

Решения координатора 26.10: макеты не рисуем, пока владелец не скажет. По каждому нужен ответ: рисуем эталон / оставляем как
есть / убираем экран.

| Экран | Что сейчас | Что известно |
|---|---|---|
| today_tasks — экран «Сегодня» (вход «Смотреть все» на Главной) | кольцо дня + три задачи строками, ScreenBackButton | эталона экрана нет; today-scene-concepts.html и Моменты v3 — блок «Сегодня» на самой Главной |
| shop — магазин | две валюты, товары по три в ряд, только «закрыть» | в коде ссылка на старый docs/v2/mockups/28-shop.html (до 2.0, не в реестре); COVERAGE: «decision=unknown» |
| ai_companion_session — голосовой ИИ-компаньон | BackGlyph 22 | COVERAGE DLG-03: «уточнить владельцу» |
| ai_dialog_briefing — старый брифинг диалога | в стор-сборке сразу уводит на Главную | легаси (dialogs-inventory D10); вероятно, убрать |
| ai_dialog_session — старая сессия диалога | в стор-сборке уводит на Главную, BackGlyph 28 | легаси (dialogs-inventory №57); вероятно, убрать |
