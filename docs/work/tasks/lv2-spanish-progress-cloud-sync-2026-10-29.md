# Task packet: прогресс испанского курса Learning V2 — в облачный синк

Governance-ID: TG-0BEFD767A104
Status: In progress
Owner: Learning V2 session; координатор 29.10 («испанец при смене телефона теряет весь прогресс курса»; также условие конкурса)

## Outcome

Три ключа испанского прогресса едут в users/{uid}.progress той же пачкой, что английские, и восстанавливаются на новом устройстве
теми же правилами слияния (ничего не теряется), не смешиваясь с английскими:
- learning_v2_course_progress_sync_v1:target:es — число подряд пройденных (максимум);
- learning_v2_course_masks_sync_v1:target:es — маски пройдено/открыто (побитовое ИЛИ);
- learning_v2_session_stars_sync_v1:target:es — звёзды (лучшая по занятию).
Имена строятся через learningV2LanguageScopedStorageKeyV1(key, 'es'). Журнал [CLOUD-SYNC] на слиянии es-ключей.

## Scope

app/cloud_sync.ts (SYNC_KEYS, FC_RESTORE_MERGE_STRATEGIES), тест на восстановление es без смешивания с en.
Экзамены глав у испанского выключены — их ключ не добавляется.

## Architecture

Синк: SYNC_KEYS → users/{uid}.progress.<ключ> через FieldPath('progress', key); слияние при восстановлении — FC_RESTORE_MERGE_STRATEGIES.
Правила Firestore для progress — запрет конкретных ключей, белого списка нет.

## Security and privacy

Новых данных о человеке нет: тот же прогресс обучения, что уже синхронизируется для английского, только второго курса.
Удаляется вместе с аккаунтом, как все SYNC_KEYS. Политику конфиденциальности менять не нужно (прогресс обучения уже описан).

## Technical debt

Ключи на каждый язык перечисляются руками; при новом языке — добавить по той же схеме.

## Verification

Тесты cloud_sync_* (ключи и слияние), изоляция аккаунта, новый тест «es восстанавливается и не смешивается с en».

## Rollback

Revert коммита (облачные поля es останутся, их никто не читает).
