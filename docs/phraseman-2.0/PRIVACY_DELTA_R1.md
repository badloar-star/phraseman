# PRIVACY_DELTA_R1 — ночные изменения хранения данных vs текущая политика (12.10)

Автор: сессия «5 · АВТОРИЗАЦИЯ» по заданию координатора. **Политику не менял и не публиковал — решение владельца.**
Источник текста политики: `legal/privacy_policy_en.json` (и `legal/privacy_policy_en_ios.json` — те же разделы), «Last updated: October 12, 2026». После правки JSON владелец запускает `npm run legal:sync` (README `legal/`).

## Итог

| # | Изменение (коммит) | Что хранится / уходит | Покрыто политикой? | Нужна правка | Срок |
|---|---|---|---|---|---|
| 1 | Пройденные диалоги на устройстве (`ad5244bb0`, `app/dialogue_v2_done_store.ts`) | только id сценариев общего каталога, ключ `dialogue_v2_done_v1:<аккаунт>:<язык>`, на устройстве, в облако не уходит; стирается вместе с памятью диалогов (`clearAllDialogueV2DoneStore` в `dialogue_v2_memory_disk_cache.ts`) | ✅ §3 «learning progress … lesson state … similar app data on your device» | нет (по желанию — уточнение, ниже) | после релиза, по желанию |
| 2 | Язык уведомлений и push-токена меняется при смене языка (`64e9e13b4`) | язык интерфейса и пояс вместе с токеном — запись в облако только при реальной смене | ✅ §12 «we store your interface language and your device's time zone together with your push token» | нет | — |
| 3 | Журнал диагностики поддержки выключен, карточка честная (`9376e4e7f`) | история действий НЕ копится и НЕ прикладывается, пока функция выключена | ✅ §10 «When the support diagnostics feature is enabled …» — формулировка условная, выключенное состояние ей не противоречит | нет | — |
| 4 | Возврат энергии (`982e49ec5`, `app/dialogue_v2_energy_settle.ts`) | локальный журнал энергии: запись возврата по id операции | ✅ §4 «coin and Energy balances and ledgers»; §3 данные на устройстве | нет | — |
| 5 | Метка «входящие уже форсили» (`d06b9a511`, `app_messages_login_forced_v1:<stableId>`) | технический флаг на устройстве, в ключе — stable app ID | ⚠️ по смыслу ✅ §3 (технические данные приложения), **но** §3 обещает, что локальное состояние «is removed through the ordinary local-data or account-deletion controls» — а этот ключ при выходе/удалении **не стирается** | **код, не текст** (ниже) | **до релиза** |

## П.5 — расхождение кода с обещанием политики (до релиза)

Стирание аккаунта на устройстве (`wipeLocalAccountData` → `collectAccountLocalDataKeys` / `finalScan` в `app/cloud_sync.ts:834, 6006`) работает по списку известных ключей и префиксов. Ключи `app/app_messages.ts` вида `<prefix>:<stableId>` в этот список **не входят** — ни новая метка `app_messages_login_forced_v1`, ни давние `app_messages_cache_v2`, `app_messages_last_background_refresh_ms_v2`, `app_messages_local_preview_v2` и очереди подтверждений (`appMessagesOwnerStorageKey`, :94). Они переживают выход и удаление аккаунта и содержат stable app ID в имени ключа.

- Рекомендация: **править код, текст политики не трогать** — добавить префиксы `app_messages_*` (через `appMessagesOwnerStorageKey`) в инвентарь `accountOwnedStorageKeysFrom` / `finalScan`, плюс сторож в `tests/` (каждый префикс владельца стирается). Владелец — Ядро (`app_messages.ts`, `cloud_sync.ts`). Тогда обещание §3 выполняется буквально.
- Почему до релиза: обещание удаления — прямой текст политики и раздела удаления (§20); оставшийся на устройстве идентификатор удалённого аккаунта — то, что ревью сторов и пользовательские запросы на удаление проверяют. Правка дешёвая (список ключей), без сети и без затрат Firebase.

## П.1 — необязательное уточнение текста (после релиза)

Если владелец хочет назвать новое явно (не обязательно — §3 уже покрывает):

**en (§3, первое предложение):**
> The App stores learning progress (including which dialogue scenarios you have completed), streaks, achievements, flashcards, daily tasks, lesson state, settings, notification settings, cached activity/error queues, cached assets, and similar app data on your device using AsyncStorage, SecureStore where available, and related platform storage.

**ru (для справки владельцу / переводов):**
> Приложение хранит на устройстве прогресс обучения (в том числе какие сценарии диалогов вы прошли), серии, достижения, карточки, ежедневные задания, состояние уроков, настройки, настройки уведомлений, кэшированные очереди активности и ошибок, кэшированные материалы и похожие данные приложения — в AsyncStorage, SecureStore (где доступно) и связанном хранилище платформы.

## Что проверено

- Тексты разделов §3, §4, §10, §12, §20 в `legal/privacy_policy_en.json`.
- Код: `app/dialogue_v2_done_store.ts` (что и где хранится), `app/dialogue_v2_memory_disk_cache.ts` (стирание), `app/app_messages.ts:94-130` (метка), `app/cloud_sync.ts:834-852, 6006-6014` (инвентарь стирания), сообщения коммитов `64e9e13b4`, `9376e4e7f`, `982e49ec5`.
- Не проверено на устройстве: факт наличия ключа `app_messages_login_forced_v1:*` после удаления аккаунта — подтвердить одним прогоном (`adb shell run-as … ` или dev-экран хранилища) после удаления тестового аккаунта.
