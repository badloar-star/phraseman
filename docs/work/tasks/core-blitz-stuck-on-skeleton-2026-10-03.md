# Task packet: «Блиц» висит на каркасе 2+ мин после «Начать», в журнале тишина

Governance-ID: TG-A585CE50E896
Governance-ID: TG-8ABFE3E6BA4F
Status: Done (блиц); соседние экраны — отдельно
Owner: Ядро; поручение координатора 03.10 (🔴), воспроизведение «Дизайна» (dev, эмулятор, Family 20 карточек)

## Outcome
Каркас держит `!blitzAccessGranted || loading || energyGate === 'checking'` (app/flashcards_blitz_session.tsx ~1128). Найдено чтением:
1. Стартовый эффект: при `reconcileFlashcardTrainingPendingGrant → 'missing'` немой `return` — energyGate навсегда 'checking'.
2. Тот же эффект: любая смена зависимости (accessResolved, hasPremiumAccess, accountToken, blitzEnergyUnlimited, pool…) в полёте ставит `cancelled=true`, а латч `blitzChargedRoundRef` не даёт перезапуску пройти → in-flight запуск молча выходит, energyGate навсегда 'checking'.
3. Немые выходы: начало эффекта (доступ/загрузка/пул), загрузка пула при отмене.
Сперва логи `[FC-BLITZ-GATE]` на КАЖДЫЙ return/ветку/await (значения + мс). Фикс: (1) 'missing' → ошибка → существующий fail-open; (2) актуальность запуска — по токену запуска (ref), а не по cleanup-флагу; (3) сторож: 20 с на каркасе → лог полного снимка; если застрял energyGate — экран «Попробовать снова» (существующий quotaUnavailable/retryQuotaStart).

## Scope
app/flashcards_blitz_session.tsx (стартовый эффект, загрузка пула, сторож). «Устно» и свайп (app/flashcards_speaking_session.tsx, app/flashcards_swipe.tsx) — сейчас редактируются другой сессией: только чтение и отчёт.

## Architecture
Без изменения протокола отложенной выдачи и энергии; меняется только управление жизненным циклом запуска и выход из 'checking'.

## Security and privacy
Логи без полного stableId (8 символов).

## Technical debt
Трассировку `[FC-BLITZ-GATE]` по шагам убрать после диагноза; логи ранних выходов и сторож — оставить.

## Verification
Точечные тесты блица (tests/*blitz*), тайпчек файла; воспроизведение «Дизайна» на эмуляторе по логам.

## Rollback
git revert.

## Сделано (Ядро, 03.10)
- `[FC-BLITZ-GATE]` на каждом шаге стартового эффекта (account/prepare/reconcile/energy/quota: await + done с мс и значениями), на каждом выходе (`exit:not_current`, `exit:energy_cancelled|insufficient`, `exit:quota_refused`, `exit:stale_before_ok`, `exit:unavailable`), в catch и при ожидании старта (`start:wait access= loading= pool=` — дедуп), загрузке пула (`pool:loaded|cancelled`).
- Фикс 1: `reconcile → missing` → ошибка `pending_grant_reconcile_missing` → существующий fail-open (раунд стартует локально).
- Фикс 2: актуальность запуска по токену `blitzStartRunRef`; cleanup эффекта больше не отменяет запуск (латч не пускал перезапуск — экран навсегда на каркасе).
- Фикс 3 (сторож): 20 с на каркасе → `watchdog:stuck_on_skeleton` со снимком; если держит стартовая проверка (не ожидание ответа в окне энергии) → экран «Попробовать снова».
- Сторож `flashcards_entry_fail_open_contract`: окно 900→1500 (между проверкой и fail-open вырос комментарий PM-229; падал и на HEAD).
- Тесты: fc_blitz 12/12, blitz_access_behavior 5/5, entry_catch_logs 6/6, feedback_attempt_wiring 3/3, fail_open_contract 6/7 (падает свайп — файл другой сессии). Падали и до правки: flashcard_training_quota_contract (ждёт импорт consumeFlashcardTrainingQuota, его нет и в HEAD), energy_start_confirmation_contract (читает удалённый app/max_call_prestart.tsx). Тайпчек по файлу — 0.
- Тот же немой `else return;` после reconcile 'missing': app/flashcards_speaking_session.tsx:490, app/flashcards_swipe.tsx:2416, app/flashcards_recall_session.tsx:321 (+ в свайпе `return () => { cancelled = true; }` :2898) — передано координатору.

## «Устно», свайп, красные сторожа (Ядро, 03.10, по команде координатора)
- «Устно» (app/flashcards_speaking_session.tsx): reconcile 'missing' → throw → fail-open; `[FC-SPEAKING-GATE]` на каждом шаге/выходе/catch; сторож 20 с на загрузке → снимок + «Попробовать снова» (кроме ожидания в окне энергии). Латча там нет — эффект при смене зависимостей перезапускается целиком, поэтому ловушки «отменён и не перезапущен» нет.
- Свайп (app/flashcards_swipe.tsx): старт по тапу (не эффект) с finally, вечного каркаса нет, но 'missing' давал немой no-op тапа → throw (fail-open тренажёра / понятная ошибка «Верно/Неверно»); лог немого выхода access_not_current. Строка :2898 — эффект подсказки, не старт.
- energy_start_confirmation_contract: убраны ссылки на app/max_call_prestart.tsx (удалён в снимке 2.0 efe19ae9d) → 5/5.
- flashcard_training_quota_contract: законный сдвиг — consumeFlashcardTrainingQuota → consumeMonthlyTrainingSession, отказ в else после `=== 'allowed'`, старт «Вспомни» resetRound(restored.round, true) → 4 теста-проводки зелёные. ОСТАЮТСЯ красными (и на HEAD) 4 проверки, требующие отдельного разбора, т.к. касаются денег/энергии: Hub `disabled={trainingLocked || !trainingEntryReady}`; createChargedOperationGuard в Recall/Speaking (защита от двойного возврата энергии — сейчас модуль app/revenue_quota_energy_guard.ts, экраны его не используют); паттерн очистки ref перед refund в свайпе/блице; FREE_FLASHCARD_LIMIT = 20 (теперь алиас FREE_CUSTOM_CARD_LIMIT).
- flashcards_entry_fail_open_contract: падает «свайп: при pending_grant_* раунд стартует локально» — и на HEAD (не мой).
- Тесты: speaking_logic 11/11, speaking_quota_unavailable 2/2, swipe_access 4/4, swipe_locale 2/2, recall 3/3+1/1, blitz 5/5; тайпчек файлов 0.
