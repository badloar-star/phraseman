# Task packet: плюраль «Удалить N карточек?» и «Выбери ещё N карточек» (cards-035, cards-007)

Governance-ID: TG-19EAD5306920
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, Макеты 776430946)
Related epic/enabler: app/flashcards_collection.tsx, app/flashcards/CollectionGalleryView.tsx, constants/plural.ts

## Outcome

Окно массового удаления и подсказка режима выделения склоняют «карточку/карточки/карточек» (ru, uk, pl — три формы; en, es, pt-BR — две; vi, id, tr — без изменения числа) через общий помощник constants/plural.ts, а не самодельным условием; проверка всех 9 языков тестом.

## Scope

In scope: тексты `batchDeleteConfirmCopy.title` и `more` в галерее, тест на формы (1 / 2–4 / 5+ / 11–14 / 21 / 22 / 25).
Out of scope: остальные счётчики («+78 карточек скрыто» — согласование глагола, отдельно), вид окон.

## Architecture

No architecture change: вызов pluralWithCount вместо фиксированной формы.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: «Удалить 1 карточек?» — первое, что видит человек с одной выбранной карточкой.

## Verification

Тест: формы по языкам через helper + исходник (нет самодельного условия, вызовы helper в обоих местах); контракты галереи.

## Rollback

Откат коммита.
