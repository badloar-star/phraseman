# Task packet: R58 #6 — Главная держит loadData первого рендера (откат «Продолжить» на урок 3 после покупки, лишний автопейвол)

Governance-ID: TG-3BB4CD4CB0F1
Governance-ID: TG-978D30493810

Координатор 16:10: lesson1.tsx и home.tsx правят и другие сессии (Моменты: R58 #10, #27). Скрипты окон переведены в режим
«только свой патч»: свой ханк считается диффом до/после своей правки, коммит — `safe_commit --patch` с `--expect` по своим
строкам; чужие незакоммиченные хунки не попадают в коммит и не снимаются при откате. Блок завершения урока в lesson1 не трогаю.
Status: Правка готовится; окно 16:45 (16:15 — R17, 16:30 — #12)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Аудит кнопок R58 (docs/work/tasks/button-audit-home-learn-overlays-2026-10-15.md, п.6): эффект Главной с пустыми зависимостями
(`app/(tabs)/home.tsx` ~1370–1509) и отложенные таймеры (~2082 тихий повтор, ~2121 отложенная перезагрузка) вызывают `loadData`
из ПЕРВОГО рендера — со старыми studyTarget / lang / isPremium. После покупки Plus и возврата из фона «Продолжить» откатывалась на
урок 3 и мог всплыть лишний автопейвол. После правки: `loadDataRef.current = loadData` каждый рендер; эффект и таймеры зовут
`loadDataRef.current()`.

## Scope

In: `app/(tabs)/home.tsx` — ref + 3 места вызова. Out: сама `loadData`, эффекты с актуальными зависимостями (studyTarget/lang,
focusTick), онбординг.

## Architecture

Стандартный приём «последний колбэк в ref»: подписки эффекта [] живут весь сеанс экрана, но всегда зовут свежую функцию. Лишних
рендеров нет (ref не стейт).

## Security and privacy

Не затрагивает данные.

## Technical debt

- #7 (карточка «Продолжить» после старых уроков) — следующий пункт, может пересечься с этим же файлом.

## Verification

Тесты, читающие home.tsx (grep по tests/), разбор babel, типы по файлу.

## Rollback

`git revert`.

## R58 #7 — карточка «Продолжить» не обновляла прогресс старого урока (тот же пакет, отдельный коммит, окно 17:00)

`app/lesson1.tsx` ~3857–3880: эффект синхронизации «последнего урока» с Главной имел ранний выход по `lastOpenedSyncedRef` —
после первого срабатывания на входе в урок все последующие изменения `correctCount` глушились, и живая Главная (соседний таб)
показывала прогресс момента входа. Правка: запись на диск (`lastOpenedLessonKey`) и отметка `recordHomeContinueLegacy` — один
раз на урок; снимок в памяти (`patchHomeScreenHydration`) и событие `last_opened_lesson_changed` — на каждое изменение (без диска
и сети). Проверка: тесты, читающие lesson1.tsx (63), разбор babel, типы по файлу.

## 17:53 — чужие красные тесты (без моих правок, lesson1 = HEAD)

Окно #7 откатилось на 10 тестах, красных и без моей правки: gustav_french_curriculum_contract, gustav_french_lesson_runtime_source_gate, gustav_last_opened_lesson_target_isolation, gustav_lesson_runtime_target_isolation (3), lesson_back_during_completion_r58, lesson_back_navigation_source, lessons_optimistic_audit (lesson1 таймер), speech_na_surfaces_contract (ИИ-диалог). Ожидаемые строки сторожей (SYNC_STUDY_TARGETS, fiftyFiftyUsageKey, getBonusHintsToday, lessons_list, lessonCompletionFallbackTimerRef…) в коде изменились чужими коммитами. Пропускаю только эти точные имена; координатору — назначить хозяев.

## 18:32 — итог окон и чужие красные

Коммиты: #7 cb8e1a70a (18:00), R61b c89d25d6b (18:01), [NOTIF-PERM] логи 9f5201c6e (18:15), #6 2a92034a4 (18:16), P24b 0fedbccc0 (18:30; отмена пуш-настроек при удалении без await — иначе тело beginAccountDeletion уезжало на тик и ломало следующий вход в auth_provider_behavior).
Исключения в воротах после коммитов Ядра (80431afdc, 332d3a62f) сокращены 13→9: оба первоначальных (continueCardPending, gustav last-opened) сняты. Ещё красные в HEAD без моих правок: gustav_french_curriculum_contract, gustav_french_lesson_runtime_source_gate, gustav_lesson_runtime_target_isolation (3), lesson_back_during_completion_r58, lesson_back_navigation_source, account_authority_legacy_callsite_guard (2 — cloud_sync captureAccountGeneration 8→9 после eca3aae21 R20). Нужен хозяин.
