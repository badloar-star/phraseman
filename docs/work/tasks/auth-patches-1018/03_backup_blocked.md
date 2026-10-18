# Пункт 3: `local_progress_backup_blocked` — что разрешать автоматически

Governance-ID: TG-E6D1DAA0A4BE

Отказ «Не получилось сохранить прогресс… сменить аккаунт» значит: аварийную копию гостя нельзя записать по состоянию устройства. Коды — `app/presync_backup_refusal.ts`, источник — `saveAccountSwitchEmergencyBackup` в `app/cloud_sync.ts:6005`.

| Код | Откуда | Что делать | Где |
|---|---|---|---|
| `account_switch_backup_other_owner_pending` (самый частый) | `cloud_sync.ts:6057–6062`: на телефоне лежит копия ДРУГОГО аккаунта, и вход вызывает сохранение без `allowShelveOtherOwnerBackup` | **Отложить чужую копию на полку и при входе тоже.** Выход из аккаунта уже так делает (TG-0AE4918142EE). Полку возвращает владельцу `restoreAccountSwitchEmergencyBackupIfSafe` при его входе, данные не теряются. Правка — один аргумент в `auth_provider.ts` (~3563): `saveAccountSwitchEmergencyBackup('sign_in_presync_not_uploaded_before_swap', localStableId, { allowShelveOtherOwnerBackup: true, shelveReason: 'sign_in' })`, плюс `'sign_in'` в тип `shelveReason` (`cloud_sync.ts:6020`). Тест — по образцу проверок полки при выходе. | Авторизация (`auth_provider.ts`), Ядро — тип в `cloud_sync.ts` по запросу |
| `account_switch_backup_unavailable` | `cloud_sync.ts:6023`: личность в карантине удаления | Дождаться сходимости: `account_delete_pending_converged` уже есть, повторить сохранение после неё. Если удаление снято (`lock_released`, патч 6) — тихий перезапуск входа. | Авторизация |
| `history_upgrade_required` / `value_upgrade_required` | `cloud_sync.ts:6040–6048, 6129–6197`: старая копия формата до V3 или битая | При старте приложения, фоном после первого кадра: если старая копия принадлежит ТЕКУЩЕМУ stable — восстановить её (`restoreAccountSwitchEmergencyBackupIfSafe`) и удалить. Если чужая — отложить на полку. Тогда к входу копии старого формата нет. Нужен отдельный разбор: в копии может быть единственный экземпляр офлайн-работы. | Ядро + Авторизация, отдельная задача |
| `account_switch_backup_capacity` | `cloud_sync.ts:6089, 6114`: ключей или страниц больше предела | Сначала журнал: сколько ключей и чьих. Предел мог устареть с ростом приложения. Без фактов не чинить (правило «сперва логи»). | Ядро, после журнала с телефона |

Порядок:
1. Полка при входе — самый частый код, правка в один аргумент.
2. Карантин — через патч 6.
3. Старые форматы и ёмкость — по журналу.
