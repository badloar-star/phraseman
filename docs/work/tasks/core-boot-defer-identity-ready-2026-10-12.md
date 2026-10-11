# Task packet: отложенное восстановление недостижимо — «личность готова» считалась по неверному статусу

Governance-ID: TG-9D6672DBD2E0
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10, 🔴 по 47edcb2ba; факты Сверки `evidence/parity/BOOT_DEFER_2026-10-11.txt`).

## Outcome
Сверка: аккаунт №2, два холодных старта — оба `defer=false reason=identity_not_ready`. Причина в коде
(`app/auth_provider.ts` ensureFreshPostDeletionIdentity): когда замка удаления НЕТ (обычный пользователь), функция
возвращает `{status:'pending_auth', phase:'prepared'}`; `'ready'` — только после завершённого удаления. Условие
`freshIdentity.status==='ready'` делало отсрочку недостижимой. Та же пара возвращается и при настоящем незавершённом
удалении (retiredSubject='stable' без живого провайдера) — по статусу их не различить.
Новое правило: личность чистая, если `'ready'` ИЛИ (`'pending_auth'` И замка удаления нет — `inspectAccountDeletePendingAuth`
= `'empty'`). Любой замок (active/expired/malformed) или сбой чтения — не чистая. Остальные защиты без изменений.
Лог `[BOOT-RESTORE-DEFER] identity` со статусом, фазой и состоянием замка.

## Scope
In: `app/boot_restore_defer.ts` (чистая функция решения о личности), `app/_layout.tsx` (чтение замка в решении),
тест. Также: индекс для `[ACTIVITY-FEED] failed-precondition` в `firestore.indexes.json` (деплой — владелец).
Out: auth_provider, логика удаления.

## Architecture
Чтение замка — тот же `readAccountDeletePendingAuthRaw` (быстрый путь без чтения хранилища, когда замка нет), параллельно
с прочими чтениями решения.

## Security and privacy
Защита от чужого снимка не ослаблена: метка владельца == uid, ворота входа 'proceed', слежение за записями — как были;
дополнительно требуется отсутствие замка удаления.

## Technical debt
Contain: статус `pending_auth/prepared` в ensureFreshPostDeletionIdentity неоднозначен — отмечено в отчёте.

## Verification
Тест решения о личности (все ветки); ревью Opus; Сверка — сценарии 3–6.

## Rollback
`git revert` или рубильник remote_config/app → bools.boot_restore_defer_enabled=false.
