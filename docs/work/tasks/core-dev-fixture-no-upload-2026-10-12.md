# Task packet: dev-фикстуры Карточек на госте не выгружают карточки/наборы в облако; лог accounts_v2_client_enabled

Governance-ID: TG-7C42CB9AA511
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10: «вторая половина — ДА»; первая — 2be1f7844 Дизайна: cards-фикстуры только на госте).

## Outcome
По журналам 11–12.10 каждый прогон cards=demo на госте писал 64 карточки в прод (`[FLASHCARDS-CLOUD] write ok cards=64`).
Теперь, пока на этом госте применена любая cards-фикстура, синхронизация (обычная и принудительная) вырезает ключи
карточек и наборов — в облако они не уходят; лог `[SYNC-SKIP] dev_fixture key=…`. Метка привязана к uid гостя:
после входа в настоящий аккаунт его карточки выгружаются как обычно. Только dev (`__DEV__ && !IS_STORE_RELEASE`).
Плюс одна строка на старте: `[ACCOUNT-V2] client_flag accounts_v2_client_enabled=… source=cache|network|default`.

## Scope
In: новый `app/dev_fixture_upload_guard.ts`; `app/cloud_sync.ts` (две точки — doSyncToCloud и forceSyncToCloud);
`app/dev_state_account_guard.ts` (одна строка — поставить метку при успешной проверке гостя; файл Дизайна, согласовано
сообщением); `app/remote_config_client.ts` (одна строка лога); тест.
Out: чистка уже записанного мусора у гостей (запись в прод — только с владельцем).

## Architecture
Метка `{authUid}` в памяти + в локальном ключе устройства `dev_fixture_no_upload_v1` (не в SYNC_KEYS): робот делает
force-stop перед каждым кадром, и синхронизация на старте до повторной ссылки выгрузила бы демо из хранилища — одной
памяти процесса мало. Пропуск активен, только если uid синхронизации-авторизации совпадает с uid метки.
Ключи: всё, что содержит `flashcard` (кроме `achievement_*`), `custom_flashcards`, `community_owned`, `owned_packs`,
`pack_trial`, плюс домены V2 (ACCOUNTS_V2_LEGACY_DOMAIN_KEYS). Страницы flashcard_pages берутся из тех же данных — тоже не пишутся.

## Security and privacy
Меньше записей в прод; новых данных нет. Метка — только uid гостя на устройстве, в dev.

## Technical debt
Account V2 card_snapshot (если флаг V2 включат) идёт своим путём — при включении флага добавить ту же проверку.

## Verification
Тест: метка на госте → карточки/наборы вырезаны, прочие ключи на месте, лог [SYNC-SKIP]; другой uid → не вырезаны;
стор-сборка → не вырезаны; проводка в обеих синхронизациях (контракт). Срез типов.

## Rollback
`git revert`.
