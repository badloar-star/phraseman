# Ошибки в админке за 30 дней — разбор и исправления (05.11.2026)

Governance-ID: TG-D9573B42F790

Автор: «1 · ЯДРО». Запрос владельца (через координатора): «Абсолютно все пользовательские ошибки в админке найти и править».
Данные получены ЧТЕНИЕМ боевого Firestore (без записи): `app_errors` (где `createdAtMs ≥ now − 30 дней`, 3 страницы по 500) и `error_reports`. Выгрузка лежит локально (`C:/Temp/claude/adm/errors30d.json`, в репозиторий не кладётся: содержит uid).

## 1. Куда ошибки приходят (проверено по коду)

| Что | Где пишется | Как читает админка |
|---|---|---|
| Сбои приложения (`DebugLogger.error` / `logAppError`, severity `warning`/`critical`) | callable отправки отчётов `functions/src/client_reports.ts` → коллекция **`app_errors`** (лимит 20 записей/час на пользователя, TTL 90 дней по `expireAt`, поле `status:'new'`) | `admin_reports_center.ts` (источник `app_errors`), `admin_diagnostics_overview.ts`, `admin_daily_digest.ts` |
| Свободные жалобы пользователей («Сообщить об ошибке» на экранах) | тот же callable → **`error_reports`** (категория `free_text`) | `admin_reports_center.ts` (источник `error_reports`) |
| Остальные источники центра отчётов | `user_reports`, `community_pack_reports`, `explain_report_entries` | тот же центр отчётов |

`app_errors` — это и есть «ошибки в админке». `error_reports` — не сбои, а обращения людей (81 из 138 — экран «Поддержка»).

## 2. Итог в числах

| | записей | примечание |
|---|---|---|
| `app_errors` за 30 дней | **1375** | все со статусом `new`; 552 уникальные сигнатуры |
| на актуальных сборках 2.0.2/2.0.3 | 1183 | остальные 192 — сборки ≤ 2.0.0 и 1.x |
| `error_reports` | 138 | обращения людей, не сбои (см. §5) |

**Было 1375 → закрыто 1370 (исправлено кодом 774, устранено скрытием V2 — 413, старые сборки — 183) → осталось 5 записей (3 сигнатуры: D2, E, G; переданы владельцам зон).** Детали в таблице.

## 3. Сигнатуры → причина → статус

| # | Сигнатура (feature / context / сообщение) | Записей / людей | Версии | Причина | Статус |
|---|---|---|---|---|---|
| A | `mistakes_hub / load_ceiling` «stage=journal:start reason=focus/silent_retry/retry_tap/pull/…» (critical) | **542** / десятки | 2.0.3/147–148, 2.0.2 | Экран «Ошибки» не уложился в потолок загрузки: журнал читался медленно, JS-поток был занят; потолок — это МЕДЛЕННО, а не отказ, но писался как critical и дублировался на каждый повтор (2/5/10 с, тапы) | ✅ **Исправлено в 2.1.0**: коммит `2771236b3` (диагностика чтения журнала, потолок 20 с, уступка потока при хешировании кусков, запись `warning` не чаще раза за 30 мин; critical — только реальный отказ чтения). Сторож `tests/mistakes_hub_load_ceiling_contract.test.ts` + новый `admin_errors_triage_2026_11_05.test.ts` |
| B1 | `learning_v2 / prepare_slow` «[V2-PREPARE] …» и `v2_stack_layer_stuck / v2_stack_overlap / v2_stack_layer_slow` «[V2-STACK] op=…» (critical) | **396** | 2.0.3/148 | Диагностика медленной подготовки занятия Learning V2 и «слоёв» смены задания; писалась как critical, хотя это замер, а не падение | 🟡 **Устранено скрытием V2 в 2.1.0** (`PHRASEMAN_R1_HIDE_V2=1`, `LEARNING_V2_HIDDEN`): код не исполняется, записи прекратятся. По существу (медленный старт V2) НЕ исправлено — вернуть, когда V2 откроют; тогда понизить severity до warning (`learning_v2_session_launch_v1.ts`, `learning_v2_task_swap_trace.ts`; сторож `learning_v2_task_swap_trace_2026_10_29.test.ts` ждёт `critical`) |
| B2 | `learning_v2 / session_completed_sync` «Сетевое соединение потеряно» / DEADLINE_EXCEEDED / callable timed out (critical) | 17 / ~12 | 2.0.3, 2.0.0 | Повторные сетевые отказы отправки завершения занятия (критичность по замыслу — после N попыток: застрявший прогресс) | 🟡 Поведение осознанное (`TRANSIENT_CRITICAL_AFTER`), V2 скрыт в 2.1.0 → поток прекратится. Не менялось |
| C | `speak_mic / no_speech_no_wav / _timeout / _empty_transcript / _threw` (critical) | **228** / ~80 | 2.0.3/147–148 | 135 `no_wav`, из них **108 — касание короче 300 мс вместо удержания кнопки** (поведение человека, не сбой); остальное — «не расслышал» (тишина/пустая расшифровка) — качество распознавания, не падение | ✅ **Исправлено**: касание в журнал не пишется (остаётся в трассе `[SPEAK-MIC]`), настоящее удержание без речи — `warning`, не critical (`components/SpeakingPanel.tsx`, коммит этой ночи). Сторож `admin_errors_triage_2026_11_05.test.ts`. ⚠ Остаётся диагностика реальных `no_wav` при удержании ≥300 мс (27 за 30 дней, Android) — теперь warning с числами, корневую причину (захват звука) разбирает владелец голосового модуля |
| D1 | `react / error_boundary` «Rendered fewer hooks than expected» в `SpireHomeScreen` (critical) | 2 / 1 | 2.0.3/147 | Хук `useSpireHeaderOverlayInset` стоял ПОСЛЕ раннего `return` → падал порядок хуков при смене состояния экрана Пика | ✅ **Исправлено**: коммит `a3ca6b446` (в 47206b7f1). После 04.11 12:28 записей нет |
| D2 | `react / error_boundary` «Attempted to navigate before mounting the Root Layout component» в `ReleasedTabLayout` | 2 / 2 | 2.0.0, 2.0.3/148 | Холодный старт: переход (`router.replace`) из `app/(tabs)/_layout.tsx` раньше монтирования корневой разметки | 🔴 **ОТКРЫТО** (редко: 2 за 30 дней). Передано «5 · ВХОД» (старт) / «2 · ДИЗАЙН» (`app/(tabs)/_layout.tsx` — чужой файл в работе). Нужен гард `rootNavigationState?.key` перед `replace` |
| E | `friends / accept_request_failed` «[firestore/permission-denied]» | 2 / 1 пара | 2.0.3/148 | Принятие заявки в друзья одной и той же парой падает на правилах: заявка уже обработана/удалена или запись не разрешена правилами | 🔴 **ОТКРЫТО** (3 записи у одной пары за 2 недели). Передано «8 · МОМЕНТЫ/Сообщество» (`app/firestore_friend_requests.ts`) — проверить правила `friend_requests` и обработку «уже принято» без ошибки |
| F | `auth / signin_failure` «remote_stable_link_failed:account_delete_pending» (critical) | 2 / 2 | 2.0.3 | Вход в аккаунт, который сейчас удаляется — ожидаемый отказ, не сбой | ✅ **Исправлено**: теперь `warning` (`app/auth_provider.ts`, коммит этой ночи). Сторож в `admin_errors_triage_2026_11_05.test.ts` |
| G | `acc_mut / delete_background_failed` «ok=false reason=local_exit_unverified» | 1 / 1 | 2.0.3/147 | Удаление аккаунта в фоне: локальный выход не подтвердился за 7,3 с | 🔴 **ОТКРЫТО** (1 запись, 28.10). Передано «5 · ВХОД И АККАУНТ» |
| H | Старые сборки (≤2.0.0 и 1.x): `learning_v2_direct_session_incomplete` (46), `practice_runes/level_spin_star_operation_corrupt` (40, 1 человек), `friends/stable auth link unavailable` (36), `[ATTEMPTS-RESET] подарок не сработал` (34), `ai_dialog` quota/limit/network/timeout (≈20), прочий хвост | **183** | 1.5.x–2.0.0 | Сигнатуры встречаются ТОЛЬКО на старых сборках; на 2.0.2/2.0.3 не воспроизводятся (журнал за 30 дней) | ✅ **Закрыто версией**: в код 2.1.0 не попадают/исправлены раньше; «не воспроизводится на текущих». Люди на старых сборках уйдут вместе с обновлением |

Сводка: **A 542 + B1 396 + B2 17 + C 228 + D 4 + E 2 + F 2 + G 1 + H 183 = 1375**.

| Статус | записей |
|---|---|
| ✅ исправлено в коде (A, C, D1, F) | 542 + 228 + 2 + 2 = **774** |
| 🟡 устранено скрытием V2 (B1, B2) | **413** |
| ✅ закрыто версией — только старые сборки (H) | **183** |
| 🔴 открыто, передано владельцам зон (D2, E, G) | **5** |
| **Итого** | **1375** |

«Осталось» с объяснением: 5 записей (3 сигнатуры) открыты и переданы; 413 записей V2 устранены скрытием раздела, а не починкой по существу.

## 4. Что ещё нужно по статусам в админке

Все 1375 записей лежат в `app_errors` со статусом `new`. Массовая смена статуса на `resolved`/`fixed` — запись в боевую базу; не выполнялась (нужно слово владельца/координатора и точный список). Для этого есть админский центр отчётов (`admin_reports_center`).

## 5. Свободные жалобы (`error_reports`, 138)

Это не сбои. 81 — экран «Поддержка», 10 — `learning_v2_session` (V2 скрыт), остальные — разрозненные жалобы на содержание уроков (`lesson_31` ×6, `lesson_6` ×3 и т. д.), карточки, диалог. Идут в поддержку/контент («3 · МАКЕТЫ», «12 · ТЕОРИЯ», «10 · ПЕРЕВОДЧИК»), в этот разбор как «ошибки приложения» не входят.

## 6. Передано владельцам зон

- **D2** (`app/(tabs)/_layout.tsx`, переход до монтирования корня) → «5 · ВХОД» / «2 · ДИЗАЙН».
- **E** (`app/firestore_friend_requests.ts`, `permission-denied` при принятии заявки) → «8 · МОМЕНТЫ/Сообщество».
- **G** (`delete_background_failed local_exit_unverified`) → «5 · ВХОД И АККАУНТ».
- **C, остаток**: реальные `no_wav` ≥300 мс на Android — голосовой модуль («7 · ЭМУЛЯТОР»/«12 · ТЕОРИЯ» — по принадлежности `hooks/use_*_hold_to_talk`).

## 7. Сборка 150 (если решит координатор)

Исправления A (уже в 2.1.0), C и F — код `components/SpeakingPanel.tsx`, `app/auth_provider.ts`; чтобы они дошли до людей, нужна пересборка (номер 150 для обеих платформ вместе) по `FINAL_BUILD_RUNBOOK_2026-11-05.md`. Срез версии: `node scripts/release_cut_2_1_0.mjs --apply --versions-only --code 150`. Без пересборки C и F выйдут со следующим релизом; на пользователей 2.1.0/149 они не влияют (только уровень записи в журнал).

## 8. Выкладка функции удаления аккаунта (утром, по слову владельца)

Что исполняет `executeAccountDeletion` (там 4 новые спецификации чистки): `accountDeleteMine` (прямой вызов), `accountDeleteWorker` (очередь, основной путь) и `accountDeleteRetryCron` (повторы). Индексы чистки (`pack_likes.userId`, `pack_adds.userId`, `pack_comments.authorId`, `contest_votes.userId`, COLLECTION_GROUP) уже выложены и **READY** (03:00).

```bash
# 1) сухой прогон на текущем HEAD
bash scripts/deploy_from_clean_head.sh --only "functions:default:accountDeleteMine,functions:default:accountDeleteWorker,functions:default:accountDeleteRetryCron"
# 2) боевой запуск (только по слову владельца)
bash scripts/deploy_from_clean_head.sh --only "functions:default:accountDeleteMine,functions:default:accountDeleteWorker,functions:default:accountDeleteRetryCron" --execute
```

Проверка после: три функции `ACTIVE` с новой ревизией (`gcloud functions describe <имя> --gen2 --region us-central1`), в журнале нет `FAILED_PRECONDITION`/`collection_group_matches` в первые 10 минут, тест-удаление тестового аккаунта проходит (удаление завершается `completed`).
Откат: `git revert e4965b3de` → тот же `--only` (или выкладка из копии предыдущего коммита, `SERVER_DEPLOY_NIGHT_2026-11-05.md`); индексы откатывать не нужно.
Файл `functions/src/account_delete.ts` в общем дереве правит другая сессия — выкладка идёт из чистого HEAD, её WIP в деплой не попадёт.
