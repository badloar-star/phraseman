# Проверка удаления аккаунта ПОСЛЕ деплоя индексов (чек-лист, 12.10.2026)

Подготовила: 5 · АВТОРИЗАЦИЯ по поручению координатора. **Ничего здесь не запускать без слова владельца.** Шаг 1 — только чтение;
шаг 2 — настоящее удаление ГОСТЯ на эмуляторе, только по слову владельца Сверке (`guest=required`, перед кадром «Аккаунт — Не привязан»).
Источник индексов — ACCOUNT_DELETE_INDEX_INCIDENT_2026-10-12.md, коммит 37e53b290.

## 1. Индексы построились (только чтение)

| Что | Команда (только чтение) | Ждём |
|---|---|---|
| 5 индексов группы коллекций | `gcloud firestore indexes fields describe <поле> --collection-group=<группа> --database='(default)' --project=phraseman-ea0b3 --format="table(indexConfig.indexes[].queryScope,indexConfig.indexes[].state)"` для: `idea_likes_sent targetAuthorUid`, `user_ideas uid`, `idea_reports reporterUid`, `idea_reports authorUid`, `user_idea_report_rate_limits stableUid` | у каждого строка `COLLECTION_GROUP … READY` (плюс прежние `COLLECTION` — не пропали) |
| Нет недостроенных | то же, смотреть `state` | не `CREATING`; `CREATING` — ждать, удаление не повторять |
| Конфиг совпадает с репо | `firebase firestore:indexes --project phraseman-ea0b3 > C:/Temp/claude/deployed_indexes_after.json` и сравнить с `firestore.indexes.json` | все 5 fieldOverride есть |

## 2. Повтор настоящего удаления гостя — какие строки ждём по порядку

Клиент: `.expo/metro-console.log` (grep `[ACC-MUT]`). Сервер: Cloud Logging функции `accountDeleteEnqueue`/`accountDeleteMine`
(JSON `event:"account_delete"`), и без доступа в GCP — документ `account_deletion_diagnostics/<runId>` в Firestore (админка).

| # | Где | Строка | Норма |
|---|---|---|---|
| 1 | клиент | `[ACC-MUT] delete:in` | старт удаления |
| 2 | клиент | `[ACC-MUT] enqueue:enqueue_guest start deadlineMs=25000` | дедлайн гостя 25 с (не 8000) |
| 3 | клиент | `[ACC-MUT] enqueue:enqueue_guest dispatched warmupMs=…` | вызов ушёл |
| 4 | клиент | `[ACC-MUT] enqueue:enqueue_guest ack=ok totalMs=… late=0` | ответ до дедлайна (холодный старт ≈9 с < 25 с) |
| 5 | клиент | `[ACC-MUT] delete:anon_phase_server_enqueued=1` | фаза записана |
| — | клиент | строк `receipt …` и `anon_server=direct` НЕТ | прямой вызов нужен только без ответа |
| 6 | клиент | `[ACC-MUT] firestore_cache_clear marked reason=account_delete` | метка после проверки стирания |
| 7 | клиент, СЛЕДУЮЩИЙ холодный старт | `[ACC-MUT] firestore_cache_clear check ms=0 marker=1 lock=… reason=marker` → `start reason=marker` → `ok ms=…` | кэш базы очищен |
| 8 | клиент, ещё один старт | `check … reason=none` или `already_cleared_for_lock` | повторно не чистит |
| 9 | сервер | `{"event":"account_delete","stage":"collect_peers", … "fallbackFullScan":false, "decision":"collection_group_scan"\|"sent_index"}` | без полного перебора `users` (после работы Ядра по разделу 5 инцидента) |
| 10 | сервер | `stage:"collection_group_matches:done"` | стадия, падавшая 12.10, проходит |
| 11 | сервер | `stage:"done"`, `authDeleted:true`, `docsDeleted>0`, `elapsedMs` < 540000 | удаление завершено |
| 12 | Firestore | `account_deletion_diagnostics/<runId>`: статус `completed`, без `failedStage` | след для владельца |

## 3. Признаки провала и что делать

| Признак | Значит | Делать |
|---|---|---|
| сервер `collection_group_matches:failed code:9`/`FAILED_PRECONDITION` | индекс не READY или не тот scope | шаг 1; не повторять удаление до READY |
| сервер `…:failed` другой стадии, `failedStage` в diagnostics | новая поломка | прислать runId и `failedStage/code` Ядру и мне; удаление само дочистится повтором воркера — не жать повторно |
| `fallbackFullScan:true` или `elapsedMs` > 500000 | полный перебор `users`, риск таймаута 540 с | Ядру (раздел 5 инцидента), релиз — по решению координатора |
| клиент `ack=failed … code=account_delete_enqueue_timeout late=1` | сервер ответил позже 25 с | прислать totalMs; дедлайн/прогрев — решение координатора |
| клиент `receipt credential_safe=0` и `anon_server=direct` | ни ответа, ни квитанции | данные гостя удалит прямой вызов; проверить строки сервера `accountDeleteMine` |
| клиент `firestore_cache_clear failed code=…failed-precondition` | Firestore тронули раньше стартового чтения | метка осталась, повтор на следующем старте; если 3 старта подряд — мне (порядок старта) |
| в шаге 7 нет строки `check` | приложение старое (до fedf321e1/f745f817f) | пересобрать/перезапустить Metro, повторить старт |
