# Настройки: удалить мёртвые модалки «Аккаунт», «Изменить имя» и лишний экземпляр удаления аккаунта

Governance-ID: TG-632775FCDC87
Governance-ID: TG-A6CB50B2E822
Governance-ID: TG-21066B5C429B
Governance-ID: TG-58A1E8DF963D

Ревью 12.10: APPROVE по коду; из config/text-integrity-baseline.json убраны 2 записи удалённых кнопок модала имени (Pressable>…>Text numberOfLines) — иначе text-integrity:audit даёт removed:2.

## Outcome
Поручение координатора (аудит COVERAGE_AUDIT_R1 §C): удалить из `app/(tabs)/settings.tsx` модалки, которые ни один путь не открывает, — меньше кода в горячем экране вкладок, нет ложных целей для сверки с макетом.

## Scope
Только `app/(tabs)/settings.tsx` (+ тесты, которые закрепляли удаляемые узлы):
- модал имени: `nameModal`/`setNameModal`, `newName`, `nameSaving`/`nameSavingRef`, `nameInlineAlert`/`alertOverName`, `closeNameModalNow`/`closeNameModal`, эффект `warmNameAvailabilityAuth` по `nameModal`, `saveName` и всё, что используется ТОЛЬКО ими (`nameChangeGuardRef`, `setNameChangeNotice` и т.п. — проверить по вхождениям), JSX «Модал имени»;
- модал «Аккаунт»: `accountModalVisible` и его JSX;
- экземпляр `<DeleteAccountConfirmModal visible={deleteAccountModalVisible}>` и `deleteAccountModalVisible` (открывался только из модала «Аккаунт»).
НЕ трогать: окно «Сменить аккаунт» (`switchAccountStage`, открывается из входа §127 через `SETTINGS_OPEN_ACCOUNT_SWITCH_PARAM`), `userName`/карточку профиля, `settingsStorageHydratedRef`, типографику (зона сессии «Темы»).

## Architecture
Чистое удаление недостижимого кода. Каждый удаляемый идентификатор — подтвердить, что у него нет открывающего вызова/использования вне удаляемых блоков. Импорты, ставшие неиспользуемыми (`reserveNameDetailed`, `warmNameAvailabilityAuth`, `GlassInlineAlert`, `DeleteAccountConfirmModal`, `Keyboard` и т.п.), — убрать только если больше нигде в файле не используются. Смена имени живёт в `app/account_details.tsx` + `components/account/NicknameEditModal.tsx`, удаление аккаунта — там же.

## Security and privacy
Не затрагивается: удаляется недостижимый UI.

## Technical debt
Снимается.

## Verification
babel-проверка синтаксиса; точечные тесты, упоминающие settings.tsx (grep по tests/ на удаляемые идентификаторы/тексты); сторожа layout/perf/typography (`tests/*settings*`), node-сторожа `tests/settings_root_liquid_glass_source_contract.test.mjs`; ревью до APPROVE.

## Rollback
Откат коммита.
