# Task packet: вкладка «Наборы» по rev8 — инвентаризация и части 1–3

Governance-ID: TG-AFA4E1EB8336
Status: In progress (инвентаризация выполнена, правок кода ещё нет)
Owner: сессия «Темы»
Related epic/enabler: OWNER_SCREENS_DISCREPANCIES_2026-11-05.md §1 (№27); эталон docs/work/golden/approved-rev8/

## Outcome

Вкладка «Наборы» совпадает с утверждённым rev8: шапка и пьедестал под табами, блоки «Набор месяца / Ещё N дней / Условия участия» и «Твой набор · N место», ряды наборов с ♥ и 💬 справа внизу без чипов слов, кнопка «Создать набор» внизу. Лайки и комментарии не теряются. Мерка: кадр «после» по каждой части, снятый и просмотренный глазами.

## Scope

In scope: инвентаризация (сделана); далее — `app/flashcards_packs.tsx`, `app/flashcards/FlashcardsCategoryHub.tsx`, `components/packs/CommunityScene.tsx`, `components/packs/PackRow.tsx`, `app/(tabs)/community.tsx` (шапка вкладки). Строки и «Карточки» — зона Дизайна (общая шапка согласуется сообщением).
Out of scope: вкладки «Друзья», «Пик», пейвол; сцена Главной; сборки и отправки в стор.

## Architecture

Цепочка рендера: `app/(tabs)/community.tsx` → `renderSection('packs')` → `app/flashcards_packs.tsx` (embedded) → список с фильтром «Популярные / Новые / A1…B2». Герой-сцена `CommunityContestStage` (components/packs/CommunityScene.tsx) используется в `app/flashcards/FlashcardsCategoryHub.tsx` и не выведена на вкладку «Наборы» — это расхождение с rev8. Инвариант: лайки/комментарии (`CommunityPackSocialBar`, `pack-like-*`) остаются в строках.

## Security and privacy

Не применимо: визуальная раскладка и уже существующие данные наборов; новых полей и сетевых вызовов нет.

## Technical debt

- Accept temporarily: чипы уровней A1…B2 и «Популярные/Новые» на вкладке — решить по rev8 (переключатель «Топ / Новые» в эталоне) отдельным шагом.
- Pay now: в шапке вкладки нет отсечения под статус-баром при прокрутке — входит в часть 1.

## Verification

- Кадр «до» — `docs/work/release/owner_screens_2026-11-05/07_*.png`, `08_*.png`; кадр «после» — снять на эмуляторе после каждой части и просмотреть глазами.
- Сверка с эталоном `docs/work/golden/approved-rev8/rev8-social-*.png`.
- Тесты: затронутые файлы под светофором (`npm run test:one -- <файл>`), итог по строке `Tests:`.
- Коммит по частям через `scripts/safe_commit.sh`.

## Rollback

Откат коммита части возвращает прежнюю раскладку вкладки; данные наборов и лайки не затрагиваются.
