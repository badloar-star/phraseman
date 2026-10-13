# Сценарий вечера 13.10 — прогон №2 (вход/выход/смена) и удаление гостя на №3

Governance-ID: TG-D0C251C21CAC
Подготовила: 5 · АВТОРИЗАЦИЯ, по поручению координатора (13.10 ~18:15). Копия — Сверке.
Исполняет: Сверка (эмулятор), Ядро (серверные журналы), Авторизация (сводка).

**Жёсткие правила вечера:**
- Пароли НЕ вводим. Аккаунт Google выбираем ТОЛЬКО тапом в списке аккаунтов системы.
- Финальное «Delete» на №3 нажимает ТОЛЬКО владелец. Сверка и Авторизация его не нажимают.
- Кнопки трат не жмём.
- Аккаунты №1 и №2 (Google) не удаляем ни при каких обстоятельствах.

Журнал клиента: `.expo/metro-console.log`. Перед каждым шагом Сверка ставит метку времени, чтобы строки шага можно было вырезать:
`echo "=== STEP <N> $(date +%T) ===" >> .expo/metro-console.log`.

---

## Часть 1. Прогон №2 — вход, выход, смена аккаунта (19:30)

### Подготовка

- Холодный старт приложения.
- Тема и язык — как в DEV_LINKS строки прогона.
- Убедиться, что в журнале после старта есть `[NAV-PAINT]` и `[TABS-PREMOUNT]` — это значит, что сборка свежая.

### Шаги и ожидаемые строки

| # | Действие | Кадр | Ждём в журнале (по порядку) | Красный флаг |
|---|---|---|---|---|
| 1 | Холодный старт, Главная | Главная | `[NAV-PAINT]`, `[TABS-PREMOUNT]`, `[LESSONS-REBUILD]` не чаще 1 раза | `[LESSONS-REBUILD]` ×2+ подряд |
| 2 | Настройки → строка подписки (вход в `manage_subscription`), назад | Подписка | `[SUB-PEEK] первый кадр источник=…` — источник `peek`/`route`, не `none` при уже известном плане | крутилка на весь экран; `источник=none` у аккаунта с Plus |
| 3 | Настройки → Аккаунт → «Sign out and sign in with another account» | окно «Sign out?» (своё окно `AccountLogoutFlow`, не общее стеклянное — `[GLASS-ALERT-LAYOUT]` здесь НЕ ждём) | — | окно не открылось за 300 мс |
| 4 | Подтвердить выход | экран после выхода | `[ACC-SIGNOUT] stage lock_acquired` → `… force_sync_done` (или `force_sync_refused` с причиной) → `… shard_sync_done` → `… final_snapshot_done` → `… marker_done`; `sinceStartMs` последней стадии | `sinceStartMs` > 10000 (на 11.10 было 28,5 с); `[ACC-SWITCH-WIPE]` с ошибкой; `[SYNC-DENY]` |
| 5 | Войти через Google → **выбрать аккаунт №2 тапом** | окно выбора аккаунта / онбординг | `[ONBOARDING-AUTH]` без `sign_in threw`; при чужом прогрессе на устройстве — `[AUTH-SWITCH-OFFER] onboarding confirm enqueued` → `… confirm answered choice=… waitedMs=…` | `sign_in threw`; `result dropped … reason=user_left` без ухода с экрана |
| 6 | Окно «Сменить аккаунт?» (если показано) → кадр, затем выбрать «Сменить» | окно смены | `[GLASS-ALERT-LAYOUT]` (раскладка кнопок); `[AUTH-SWITCH-OFFER] onboarding ui decision_pending` → `… decision_made choice=…` | крутилка видна, пока окно открыто (до 329097451 так и было) |
| 7 | Смена проходит | Главная №2 | `[ACC-SWITCH-TIMING] quiesce … tookMs=…`, `clear_stable_id tookMs=…`, `ensure_anon anonMs=…`; `[ACC-SWITCH-WIPE]` без ошибок; `[AUTH-SWITCH-OFFER] onboarding switched synced=…` | `switch_failed reason=…` / `switch_threw`; суммарно > 15 с |
| 8 | Привязка Google после смены | Главная №2 | `[AUTH-LINK-GOOGLE] … authoritative_link_reused` | нет строки `[AUTH-LINK-GOOGLE]`; `credential-already-in-use` без reused |
| 9 | Если у №2 есть отложенное удаление — окно «Восстановить аккаунт?» | окно восстановления | `[ACCOUNT-RESTORE] onboarding choice=… via=…`; `[GLASS-ALERT-LAYOUT] … layout=stack reason=long_word` («Не восстанавливать») | `status_failed reason=…`; кнопка рвётся по середине слова |
| 10 | Главная №2 → Настройки → Аккаунт | Аккаунт №2 | первый кадр сразу с почтой №2; `[ACC-MUT]` без `failed` | экран пустой или со старым аккаунтом |

Шаги 6 и 9 — только если окно действительно появилось. Если не появилось — это не ошибка; записать «не показано» и почему (по строке `[AUTH-SWITCH-OFFER]` / `[ACCOUNT-RESTORE]`).

### Критерий «зелёно» для части 1

- Все 10 шагов дали кадр, без красного экрана и без крутилки на весь экран.
- Выход: последняя стадия `[ACC-SIGNOUT]` ≤ 10000 мс.
- Смена: ≤ 15 с от тапа «Сменить» до Главной №2.
- `[AUTH-LINK-GOOGLE] authoritative_link_reused` есть.
- Ни одной строки `switch_failed`, `switch_threw`, `sign_in threw`, `status_failed`, `[SYNC-DENY]`.
- В каждом окне очереди с двумя кнопками (смена, восстановление) есть `[GLASS-ALERT-LAYOUT]`, и раскладка соответствует правилу Макетов №30.
- На Аккаунте после смены — почта №2.

Что Сверка присылает Авторизации: кадры 1–10, вырезку журнала между метками `STEP 1` и `STEP 10`, время выхода и смены по секундомеру.

---

## Часть 2. Удаление пустого гостя на №3 (после части 1, последний шаг дня)

Опора: `docs/phraseman-2.0/ACCOUNT_DELETE_VERIFY_AFTER_INDEXES.md` (12 строк); индексы READY по проверке Ядра 13.10 (41/41).

### Шаги Сверки — до последней кнопки

| # | Действие | Кадр |
|---|---|---|
| 1 | Открыть DEV_LINKS-ссылку с `uiLang=en&guest=required` — свежий пустой гость, без Google | Главная гостя |
| 2 | Settings → Account: убедиться, что аккаунт **не привязан** (гость, нет почты) | «Account — Not linked» |
| 3 | `echo "=== DELETE-READY $(date +%T) ===" >> .expo/metro-console.log` | — |
| 4 | Account → «Delete account» | окно «Delete account?» |
| 5 | В поле `delete-account-confirm-input` ввести `DELETE` | поле заполнено, кнопка «Delete» активна |
| 6 | **СТОП.** Сверка руки убирает и пишет координатору «готово к нажатию». | кадр окна с введённым DELETE |

Сверка НЕ нажимает `delete-account-confirm`.

### Что сказать владельцу (одной фразой)

> «На эмуляторе открыт пустой гость, окно "Delete account?" с уже введённым DELETE — нажмите внизу красную кнопку "Delete" и скажите "нажато".»

### После «нажато»

**Клиент (Сверка):**
- кадр через 5 с после нажатия (куда привело приложение);
- вырезка журнала от `DELETE-READY` до конца;
- затем **два холодных старта** подряд, перед каждым `echo "=== COLD <N> $(date +%T) ===" >> .expo/metro-console.log`, кадр Главной и вырезка.

Ждём строки (номера по чек-листу):

| # | Строка | Норма |
|---|---|---|
| 1 | `[ACC-MUT] delete:in` | старт |
| 2 | `[ACC-MUT] enqueue:enqueue_guest start deadlineMs=25000` | 25 с, не 8000 |
| 3 | `[ACC-MUT] enqueue:enqueue_guest dispatched warmupMs=…` | вызов ушёл |
| 4 | `[ACC-MUT] enqueue:enqueue_guest ack=ok totalMs=… late=0` | ответ до дедлайна |
| 5 | `[ACC-MUT] delete:anon_phase_server_enqueued=1` | фаза записана |
| — | строк `receipt …` и `anon_server=direct` НЕТ | |
| 6 | `[ACC-MUT] firestore_cache_clear marked reason=account_delete` | метка |
| 7 | COLD 1: `firestore_cache_clear check … reason=marker` → `start reason=marker` → `ok ms=…` | кэш очищен |
| 8 | COLD 2: `check … reason=none` или `already_cleared_for_lock` | повторно не чистит |

**Сервер (Ядро, только чтение, по пакету `account-delete-guest3-log-readout-2026-10-13.md`):**

Функции: `accountDeleteEnqueue`, `accountDeleteMine`, `accountDeleteWorker` (и `accountDeleteRetryCron`, если воркер не завершил с первого раза).

Фильтр (окно — от `DELETE-READY` минус 1 мин до плюс 15 мин; точные имена ресурсов — за Ядром):

```
(resource.labels.service_name=("accountdeleteenqueue" OR "accountdeletemine" OR "accountdeleteworker" OR "accountdeleteretrycron")
 OR resource.labels.function_name=("accountDeleteEnqueue" OR "accountDeleteMine" OR "accountDeleteWorker" OR "accountDeleteRetryCron"))
AND (jsonPayload.event="account_delete" OR severity>=WARNING)
```

Ждём:
- 9: `stage:"collect_peers"`, `fallbackFullScan:false`, `decision:"collection_group_scan"|"sent_index"`;
- 10: `stage:"collection_group_matches:done"` — та стадия, что падала 12.10 с кодом 9;
- 11: `stage:"done"`, `authDeleted:true`, `docsDeleted>0`, `elapsedMs < 540000`;
- 12: `account_deletion_diagnostics/<runId>` — `completed`, без `failedStage`.

Тревога: `account_delete_peer_group_scan_cap`, любой `…:failed`, `fallbackFullScan:true`, `elapsedMs > 500000`. В сводку — только uid тестового гостя и технические поля.

**Сводка (Авторизация):**
- сводит клиент + сервер в одну таблицу 1–12 (зелёно/красно, время);
- отправляет координатору и Ядру;
- при красном — по таблице «Признаки провала» из чек-листа: что значит и кому.

### Критерий «зелёно» для части 2

- Строки 1–12 на месте и в норме.
- Нет `receipt`/`anon_server=direct`.
- Сервер дошёл до `done` без `fallbackFullScan`.
- Два холодных старта прошли без красного экрана: первый очистил кэш, второй — нет.

---

## Порядок вечера

1. 19:30 — часть 1 (Сверка ведёт, Авторизация следит за журналом).
2. Сводка части 1 → координатору и Дизайну (B1).
3. Часть 2, шаги 1–6 → «готово к нажатию» → владелец нажимает → «нажато».
4. Клиент + сервер → сводка части 2 → координатору и Ядру.

---

## Outcome

Один документ на вечер. Сверка, Ядро и Авторизация идут по одним шагам, ждут одни и те же строки журналов и одинаково понимают «зелёно».
Финальное нажатие удаления остаётся за владельцем.

## Scope

In scope: этот документ.
Out of scope: правка кода, нажатие «Delete», записи в прод, ввод паролей.

## Architecture

Нет изменений кода. Сценарий опирается на уже существующие журналы:
- `[ACC-SIGNOUT]`, `[ACC-SWITCH-*]`, `[AUTH-*]`, `[ACCOUNT-RESTORE]`, `[GLASS-ALERT-LAYOUT]`, `[SUB-PEEK]`, `[ACC-MUT]`;
- серверные `event:"account_delete"`.

## Security and privacy

- Удаляется только свежий пустой гость.
- В сводки — только uid тестового гостя и технические поля, без почт и имён.
- Аккаунты №1/№2 не удаляются.

## Technical debt

- Пороги «зелёного» (выход ≤ 10 с, смена ≤ 15 с) — рабочие, по замерам 11.10. После вечера уточнить по факту.
- Имена ресурсов в фильтре Cloud Logging — за Ядром.

## Verification

Строки журналов сверены с кодом на HEAD 13.10:
- `app/auth_provider.ts` — `signoutStage`, `authoritative_link_reused`;
- `app/account_switch_quarantine.ts` — `[ACC-SWITCH-TIMING]`;
- `components/DeleteAccountConfirmModal.tsx` — `DELETE`, `delete-account-confirm-input` / `delete-account-confirm`;
- `components/v2/GlassAlertDialog.tsx` — `[GLASS-ALERT-LAYOUT]`;
- `app/manage_subscription.tsx` — `[SUB-PEEK]`.

## Rollback

Документ: `git revert` коммита.
