# Аудит «что не доделано» — Phraseman

Дата: 2026-06-14. Метод: 3 параллельных агента (клиент / сервер / документы) + ручная
перепроверка каждого важного пункта по живому коду на ветке `master`.

Важно: большой список из старых отчётов оказался **в основном устаревшим** — многое уже
починено. Ниже — только то, что подтверждено по текущему коду как реально незавершённое.

---

## ✅ Подтверждено незавершённым (по живому коду)

### BLOCKER — ломает фичу / не доходит до продакшена

1. **3 админских OpenAI-функции не в `deploy:safe`** — `functions/package.json:12`
   - `openAiBudgetDashboard`, `openAiDialogModelConfig`, `openAiDialogQuotaConfig` экспортированы
     в `index.ts`, но отсутствуют в безопасном списке выкладки.
   - Это единственные писатели `admin_runtime_config/openai_dialog_model` и `.../openai_dialog_quota`.
     Читатели задеплоены (`premium_dialog.ts:8`, `mistake_explain.ts:8`) → при `deploy:safe` админ
     НЕ может менять AI-модель и дневные лимиты ответов; всё навсегда падает на хардкод-дефолты.
   - Фикс: добавить 3 имени в whitelist.

2. **Untracked-файл ломает свежий клон / другую сессию** — `app/ai_dialog_level_lock.ts`
   - Файл не закоммичен, но импортируется из `components/DialogsTabContent.tsx`.
   - Фикс: `git add app/ai_dialog_level_lock.ts` + коммит.

### INCOMPLETE — фича есть, но видимая дыра / не живёт в проде

3. **Глобальный топ-100 Арены не читается с сервера** — `app/arena_leaderboard_fetch.ts:62,714`
   - `ARENA_TOP100_REMOTE_ENABLED = false` → `fetchArenaTop100` возвращает только локальный кэш;
     весь Firestore-пайплайн ниже мёртв. Глобальный рейтинг фактически пустой/замороженный.

4. **Отзывы на пейволе — все пустышки** — `app/paywall_testimonials.ts`
   - 28 записей `verified: false`, 0 `verified: true`, помечены `[[draft]]` + `TODO(before release)`.
   - Прод-гард ничего не рендерит без verified → блок социального доказательства невидим.

5. **«Изучать французский» — большая полу-собранная фича без контента** — `app/french_content_source_gate.ts`
   (+ ~9 sibling `*_target_gate.ts` c `enabled: false` для `fr`)
   - Уроки/квизы/экзамены/тренер/флешкарты для FR заскаффолжены, но `approvedAppSeedLessonIds: []`
     блокируют всё. Доступно только через dev-пикер языка. В стор не выложишь.

6. **Испанская локаль UI выключена** — `app/config.ts:126` + `constants/i18n.ts:45`
   - `SPANISH_UI_LOCALE_ENABLED = false`: `es`-строки недопереведены, падают на русский.

7. **Модалка exit/win-back триала мертва** — `app/premium_modal.tsx:2973`
   - Полноценный bottom-sheet «exit trial offer» дважды выключен (`{false && <Modal visible={false}>}`).
     Стейт-машина `setExitTrialOfferVisible` есть, UI не показать.

8. **Режим лиги «промо по XP» — недоделанный эксперимент** — `app/remote_flags.ts:82` +
   `app/league_engine.ts:632`
   - `league_xp_promotion_enabled = false` по умолчанию; альтернативная ветка ранжирования полностью
     написана, но недостижима.

### MINOR — хвосты / косметика

9. **Расходы «объясни ошибку» не видны в дашборде** — `functions/src/openai_budget_dashboard.ts`
   - `mistake_explain.ts` пишет в `mistake_explain_billing`, дашборд агрегирует другие 4 коллекции,
     эту — нет. Часть трат на AI не учитывается. (Усугублено пунктом 1 — сам дашборд не задеплоен.)

10. **Мёртвый JSX в «Ежедневных заданиях»** — `app/daily_tasks_screen.tsx:2334,2557,2570`
    - Три блока `{false && (…)}` (старый футер/прогресс-бар) после редизайна карточек.

11. **Долги локализации** — `app/paywall_percentile_line.ts:28`, `app/paywall_testimonials.ts`
    - Покрыты только ru/uk/es; `pt-BR/vi/id/tr/pl` намеренно падают на русский (`TODO(i18n)`).

12. **Возможна нехватка фраз в уроках 18/20** (НЕ перепроверено точным счётом)
    - Старый отчёт говорил 49 вместо 50. Требует прямой проверки контента.

---

## ❌ Числилось «не сделано», а на деле УЖЕ ПОЧИНЕНО (не трогать)

- Серверный мердж аккаунтов (H2) — подключён: `app/auth_provider.ts:1017`.
- Дубль премиума при свапе (H3) — `copyLocalRealPremiumToStableId` удалён, в коде нет.
- Ответы онбординга выбрасывались — теперь `selectedPlanLevel`/`selectedPlanMinutes` идут в профиль
  (`components/onboarding.tsx:1247,1350`).
- «81 коммит не запушен» — `master` ровно на уровне `origin/master` (0 ahead).
- Untracked CI-ломающие файлы (`arena_rank_progression.ts` и т.д.) — закоммичены.
- Whitelist `deploy:safe` отстаёт на 11 функций — почти все УЖЕ в списке (`statsInsightsGenerate`,
  `weeklyReviewGenerate`, `arenaRoom*`, `reEngagePushCron`, `telegramPremiumActivationNotifier`…).
  Реально не хватает только 3 OpenAI-админ-функций (см. пункт 1).
- `club_gift_free_boost` сломан — починен: `hasClubGiftFreeBoostFromLevel` вызывается
  (`club_screen.tsx:439,1015,1055`), ваучер гасится (`league_group_boosts.ts:286`).
- 6 экспортов `arena_rooms`, мёртвый `ForceUpdateScreen`, sign-in без таймаута — закрыто коммитами.

---

## Заметка про старые отчёты

Пункты по безопасности/экономике из `DEEP_AUDIT_2026-06-11.md` (App Check off, клиент пишет
shards/XP, leaderboard из body, кап экзамена, matchmaking_queue read) — это РИСКИ архитектуры, а
не «начатая и брошенная» работа. Они реальны, но это отдельная тема харденинга, не «недоделки».
App Check off подтверждён в памяти как реальный незакрытый риск.
