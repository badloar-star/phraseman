# Task packet: решения координатора по Карточкам и нейтральные шторки в тёмном (Темы Г3, Г4, Г6)

Governance-ID: TG-86975B3B0E9C
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по команде координатора 13.10

## Outcome

1. cards-007: подпись («стоимость проезда») не режется кнопкой звука на узкой карточке списка «Сохранённых»; подсказка «Выбери ещё 10 карточек…» при 0 выбранных — как в образце (не показывается).
2. Чип «EN ⌄» в шапке каталога (cards-section-022/023, cards-gap-034): показывается только при наборах ≥ 2 языков, как в настройке тренировки.
3. Значок набора «баночка/стопка»: если в ledger есть решение владельца оставить стопку — не трогаю.
4. От Тем (DIFF_COLOR_TRIAGE 249bad18d): Г3 `HybridSheetShell.tsx` (верх шторки тоном, 26 потребителей), Г4 `PackEditorV2.tsx:307` (17 % тона) — в тёмном нейтраль через `components/v2/shadow_sheet_paint.ts` (как `4863c136d`), светлое не трогать; Г6 cards-005 — полупрозрачная залипающая шапка `CollectionListView`.

## Scope

In scope: `app/flashcards/FlashcardListItem.tsx` / списки «Сохранённых», `app/flashcards_collection.tsx` (подсказка выделения), каталог (`flashcards_packs.tsx`, `FlashcardsCategoryHub.tsx`), `HybridSheetShell.tsx`, `PackEditorV2.tsx`, `shadow_sheet_paint.ts`, `CollectionListView.tsx`; сторожа.

Out of scope: cards-008 (точки «сила слова») и cards-020 (окно жалобы) — ждут владельца; строка «Продолжить создание набора» (функция черновика, остаётся); светлые темы.

## Architecture

Только вид: убрать лишнее состояние показа, не менять данные; нейтраль шторок — через существующий модуль `shadow_sheet_paint.ts`, без новых механизмов. Условие показа чипа языка — по числу языков наборов (как `languageSwitchable`).

## Security and privacy

Данные не затрагиваются.

## Technical debt

Contain: `HybridSheetShell` общий для 26 потребителей — правка только тона верха в тёмном; регресс ловит сторож и кадры Сверки.

## Verification

Сторожа по затронутым файлам (`npm run test:one`, один за раз под светофором); кадры Сверки после пересборки.

## Rollback

git revert коммита.
