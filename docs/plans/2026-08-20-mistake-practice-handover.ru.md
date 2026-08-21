# Handover системы «Ошибки» — 2026-08-20

## Итог

Новая система «Ошибки» реализована вместо «Моей практики»/Trainer/SRS. Обычный
красный результат, правильный ответ, объяснение и обязательный локальный повтор
урока сохранены как отдельная механика. Вход находится в левом меню раздела
«Карточки». Setup sheet содержит только «Ошибки», `5 / 10 / 15 / Все` и
«Начать»; письменные и доступные устные упражнения смешиваются автоматически.

Финальный независимый read-only code review: **PASS**, новых actionable
P0/P1/P2 не найдено.

## Что дополнительно исправлено финальным аудитом

- Все публичные read API статистики (`ready count`, insights и achievement)
  получили account-generation fence. Отложенный ответ аккаунта A после
  переключения на B завершается `stale_account_generation` и не возвращает
  приватную фразу старого владельца.
- Счётчик «Ошибок» в Cards читает единый reconciled API. Удалённая custom card
  сначала получает `content_unavailable`, поэтому badge и доступность CTA не
  расходятся с фактической runtime-очередью.
- Cleanup неправильных глаголов сверён с удалённым историческим key factory:
  удаляются raw EN `irregular_verbs_srs_v1` и scoped FR
  `lesson_progress_v2::fr::irregular_verbs_srs_v1`. Permanent guard также
  защищает удалённый `app/irregular_verbs_srs.ts` и signal
  `irregular_verbs_srs_v1` от возврата.
- Из live admin, monetization contracts и Gustav inventory удалены последние
  Trainer-флаги, лимиты и storage identifiers. Permanent guard сканирует runtime,
  live admin, scripts и tests и блокирует их возврат.
- Async-загрузка сессии и счётчика Learning V2 защищена account-generation fence:
  данные аккаунта A нельзя показать после переключения на B.
- Перед запуском/возобновлением сессии mutable custom cards сверяются с исходником.
  Удалённая или содержательно изменённая карточка получает идемпотентный
  `content_unavailable` и исключается из очереди; stale draft очищается.
- Cloud restore объединяет все страницы одним пакетным journal commit. Проверка на
  2000 событий ограничивает запись 23 операциями вместо полного rewrite на каждое
  событие; повторный restore не пишет ничего.
- Добавлен сквозной contract: ошибка урока → 5 активных ошибок → Cards session →
  adaptive requeue → multi-day correction → ровно одна звезда.

## Хранилище, облако и cleanup

- Физические локальные keys остаются owner + study-target scoped.
- Локальный journal: content-addressed chunks, linked manifest pages и atomic root;
  после root commit удаляются только недостижимые chunks/pages и crash-orphans.
- Cloud: immutable `users/{stableUid}/progress_events/mp_*`; direct client access
  закрыт Rules, upload/list сверяет owner binding, account deletion рекурсивно
  удаляет namespace.
- Новых storage keys, Firestore collections или полей финальный аудит не добавил.
  Поэтому дополнительного изменения Rules/Jarvis schema не потребовалось.

## Проверки

Финальный основной gate:

```powershell
$mistakeTests = (Get-ChildItem -LiteralPath tests -Filter 'mistake_practice*.test.ts').FullName
npx jest --runInBand --forceExit --no-cache --runTestsByPath $mistakeTests tests/learning_v2_mistake_loop.test.ts tests/learning_v2_mistake_loop_account_switch.test.ts tests/home_primary_tiles_without_practice.test.ts tests/monetization_copy_contract.test.ts tests/gustav_feature_parity_matrix.test.ts
```

Результат последнего прогона после всех review-fix: **33 suites / 148 tests
PASS**.

Свежие критические проверки после review-fix:

- root auth/account-generation/reward/Rules: **10 suites / 252 tests PASS**;
- Functions event/reward/auth/delete/Jarvis: **5 suites / 172 tests PASS**;
- focused regression трёх финальных findings: **7 suites / 23 tests PASS**;
- независимый read-only review: **PASS**, actionable P0/P1/P2 нет;
- focused ESLint и targeted `git diff --check`: **PASS** (только предупреждение
  Git о будущем LF→CRLF, whitespace errors нет).

Дополнительные gates текущего аудита:

- stale account/session + Learning V2 + legacy admin: **5 / 21 PASS**;
- reconciliation + store + cloud + screen: **6 / 27 PASS**;
- composed save/delete/reopen runtime journey: **1 / 1 PASS**;
- deferred Learning V2 account A→B fence: **1 / 1 PASS**;
- сквозной contract отдельно: **1 / 2 PASS**;
- final critical root auth/account/Rules: **8 / 230 PASS**;
- initial server auth/merge/delete/event/reward/Jarvis: **6 / 255 PASS**;
- delete + merge после privacy remediation: **2 / 111 PASS**;
- focused ESLint изменённых файлов: **0 errors / 0 warnings** после локальной
  import-order annotation;
- targeted `git diff --check`: только line-ending warnings, whitespace errors нет;
- literal retired-Trainer scan: совпадений вне permanent guard нет.
- Gustav operational plan models переведены на `mistake_practice`; case-insensitive
  permanent guard не допускает старые Trainer/SRS identifiers и названия.

Первый запуск команды из старого плана дал **24 suites / 118 tests PASS**, но exit 1
из-за трёх несуществующих путей `mistake_practice_runtime`,
`mistake_practice_voice_energy`, `mistake_practice_speaking_overlay`. Это не падение
тестов. План исправлен под реальные имена и Jest glob `*.test.ts`.

## Не запущено и известные ограничения

- Полный project suite/typecheck не запускался по правилу bounded verification:
  дерево содержит несвязанные работы и известные Learning V2 content blockers
  (`approved_first_ten_candidate_v2.json` и связанные strict errors).
- Глобальный Gustav inventory остаётся `HOLD` из-за широкого несвязанного drift
  рабочего дерева (3567 records, 187 high risks, 489 unknown-scope records). Узкий
  Trainer cleanup проверен literal scan и permanent guard; глобальную
  классификацию ради этой задачи не переписывали.
- Jest после зелёных прогонов сообщает общий `--forceExit`/open-handles warning.
- В несвязанном `functions/src/account_delete_worker.test.ts` существует
  baseline-конфликт: тест требует удалять просроченный failed job, тогда как
  неизменённый worker сохраняет его как permanent deny/retry state. Файл worker
  и тест не входят в diff этой задачи; контракт здесь не менялся.
- Firebase emulator scheduling test не запускался; callable/state-machine
  interleavings покрыты детерминированными unit/integration tests.

## UI и защищённые границы

- Motion Hybrid shells, accessibility labels и dark foreground на lime CTA
  сохранены; финальный аудит не добавлял новые визуальные поверхности.
- Competitive Arena файлы и механики не изменялись.
- Live admin изменён только в `admin/v2/legacy.html`; frozen admin copies и App
  Check не затрагивались.
- Коммит, deploy и production rollout не выполнялись.

## Дополнение 2026-08-21

- Удалены последние поясняющие микротексты из Learning V2 loop и экрана
  завершения Errors session.
- Удалена карточка-подсказка «Ошибки» с главной (RU/UK), включая устаревший текст
  про отдельную голосовую отработку.
- Главная больше не читает `getMistakePracticeReadyCount`, не хранит `dueCount` и
  не гидрирует этот счётчик.
- Полный root typecheck не зелёный: 52 ошибки в 15 несвязанных файлах; в Errors
  scope совпадений нет. Полный Jest остановлен ради стабильности компьютера после
  OOM/перегрузки. Последние UI-изменения проверены лёгкими source contracts и
  TypeScript parse, без новых тяжёлых прогонов.

## Щадящий повторный аудит 2026-08-21

После запрета владельца на нагрузку проверка продолжена строго последовательно:
один Jest-файл за процесс, `--runInBand --forceExit --no-cache --no-watchman`, без
полного suite, watch-режима, параллельных воркеров и увеличения heap.

- основной Mistake Practice gate: **33 suites / 149 tests PASS**;
- Functions event/reward/auth/delete/Jarvis: **9 / 324 PASS**;
- дополнительные critical root account/auth/public API/economy: **4 / 23 PASS**;
- Personal Plan consumers: **3 / 14 PASS**;
- Weekly Review consumers: **4 / 25 PASS**;
- admin/motion contracts: **2 / 8 PASS**;
- achievements: **1 / 29 PASS**;
- progress-events: **1 / 35 PASS**.

Исправлены четыре stale/brittle тестовых контракта: достижения теперь мокают
композитную credit-операцию вместо удалённого raw начисления; проверка Functions
не зависит от LF/CRLF; Personal Plan subscription не зависит от вида кавычек;
Weekly Review ожидает новый Mistake Practice route вместо retired Trainer.

В изменённой галерее достижений найдено два новых нарушения text-integrity:
название и описание принудительно обрезались `numberOfLines`. Ограничения сняты,
текст полностью переносится; focused ESLint файла — **PASS**. Аналогичное
нарушение в `app/flashcards/FlashcardsTabBar.tsx` присутствует уже в `HEAD` и не
внесено этой работой, поэтому в данный scope не исправлялось.

Известный несвязанный baseline-конфликт
`functions/src/account_delete_worker.test.ts` подтверждён повторно и оставлен без
изменений. Коммит, deploy и production rollout не выполнялись.
