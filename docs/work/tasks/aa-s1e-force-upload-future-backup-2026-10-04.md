# Task packet: Account Authority 2.0 — этап S1e: силовой перенос перед сменой аккаунта не теряет локальную правку при «облачной из будущего»

Governance-ID: TG-A6B9C3190FFA
Status: Planned (после PM-289)
Owner: Claude session (Account Authority 2.0)

## Outcome
Находка ревью S1d (Important): `runForceFlashcardUpload` (app/flashcards_cloud_upload.ts, withPagesPreWrite) при `remoteFutureKept > 0` возвращает успех, локальная версия карточки в облако не уходит, а затем смена аккаунта стирает локальные данные. Если спешат часы ДРУГОГО устройства — теряется реально более свежая правка этого телефона (до S1d было так же). Вариант Б (ревью, безопасная сторона): перенос проходит, но локальные версии этих карточек кладутся в аварийную копию владельца (`account_switch_emergency_backup`, тот же механизм S2d) до стирания; лог с числом карточек; копия доливается обратно по существующим правилам (тот же владелец / псевдоним после merge).

## Scope
app/flashcards_cloud_upload.ts, app/flashcard_pages_read_result.ts (сигнал remoteFutureKept наружу из force-пути), app/cloud_sync.ts (только свои хунки на пути смены аккаунта), их тесты.

## Architecture / Security and privacy
Без новых данных; копия остаётся на устройстве у того же владельца.

## Technical debt
Нет.

## Verification
Тест: другой девайс со спешащими часами + смена аккаунта → локальная правка в копии, восстанавливается при возврате в аккаунт. Мутации, тайпчек, независимое ревью.

## Rollback
git revert.
