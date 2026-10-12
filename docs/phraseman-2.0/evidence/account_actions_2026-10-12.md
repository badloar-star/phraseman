# Проверка действий аккаунта на гостевом эмуляторе — 2026-10-12 (Сверка)

## Удаление аккаунта анонимного гостя (по прямой просьбе владельца в чате Сверки, 18:35)
Гость: stableId 32cce4c0-4872-49b6-813e-8bccb1e1db27, провайдер (Firebase) bLshBOoM6wWwhAt9nVfClkqurGd2; экран «Аккаунт»: «Привязать аккаунт», имя «Не задано», «С нами с 12.10.2026» — анонимный, не №1/№2/№3.
Подтверждение вводилось на английском интерфейсе (dev uiLang=en): слово «DELETE» (русское «УДАЛИТЬ» через adb не набрать).

| шаг | кадр / журнал |
|---|---|
| до | 01_account_before.png |
| окно подтверждения | 02/04/06 — «Delete account? … Type “DELETE”», кнопка Delete активна после ввода |
| нажатие Delete | 18:36:51.87 |
| [ACC-MUT] delete:in | 18:36:51.635 → anon_lock=ok stable=present |
| локальная очистка | account_data_wiped, async_storage_cleared (removeKeysKeys 2217 из 2220), readback_verified, phase_local_data_cleared — 18:36:53.8 |
| экран | онбординг виден 18:36:54.6 (≈2,8 с после нажатия): «From first words to fluent speech» — 07_after_*.png |
| сервер | **НЕ ПОДТВЕРЖДЕНО**: 18:37:02.24 delete:anon_server=enqueue ack=failed reason=account_delete_enqueue_timeout → 18:37:17.27 anon_server=direct reason=enqueue_failed → 18:37:25.3 before_signout=ceiling → **18:37:44.30 [CRITICAL] acc_mut:delete_background_failed: delete:bg_out ok=false reason=local_exit_unverified cloudDeleted=n/a tookMs=48815** |

## Что стёрто локально (проверка через run-as)
- RKStorage (AsyncStorage): 153 строки / 352 КБ → 24 строки / 74 КБ; строк со старым uid 45 → 2.
- Осталось 2: friend_blocked_v1:<старый uid> = {"uids":[]} (пустой кэш) и **account_delete_pending_auth_v1** (метка незавершённого удаления: operationId, providerUid bLsh…, stableId 32cce4c0…) — удаление на сервере ждёт повтора.
- phone-state (SQLite): файл пересоздан, старого uid 0 вхождений.
- **Firestore SDK локальный кэш (databases/firestore.*) НЕ очищен: 1 003 520 байт, старый uid встречается 110 раз.**
- Новый гость: phraseman_stable_uid_cache = 6fc4d8fd-ca5f-4069-9b7b-62c733bf5b24 (был 32cce4c0…).

## Итог
- Локально: стёрто почти всё (кроме кэша Firestore SDK и метки удаления) — СРАБОТАЛО ЧАСТИЧНО.
- На сервере: подтверждения нет (enqueue timeout → прямой вызов → local_exit_unverified, cloudDeleted=n/a) — НЕ СРАБОТАЛО / НЕ ПОДТВЕРЖДЕНО. Нужно проверить в админке: есть ли users/<…> и Auth-пользователь bLshBOoM6wWwhAt9nVfClkqurGd2 / stableId 32cce4c0-4872-49b6-813e-8bccb1e1db27.
- Уведомление об удалении пользователю не показывалось (кадры 07_after_1..8 — только онбординг).
Журнал: delete_guest_full.log.
