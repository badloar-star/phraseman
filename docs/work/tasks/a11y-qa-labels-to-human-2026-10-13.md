# Task packet: служебные id автотеста в accessibilityLabel → человеческие подписи (Макеты, 13.10)

Governance-ID: TG-764EAC3FDDFA
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по просьбе Макетов (scan_untranslated_jsx, раздел «Доступность»)

## Outcome

В 21 месте экранный диктор больше не читает вслух служебные идентификаторы вроде `qa-fc-editor-en`: там, где у элемента есть видимый текст, служебная метка удаляется (диктор берёт подпись из самого текста); у полей ввода и значков без текста метка — человеческая подпись на 9 языках. Робот Сверки ищет по `testID`, он у всех элементов уже есть и не меняется.

## Scope

In scope: `app/community_packs/CommunityPackSocialBar.tsx`, `app/flashcards/CollectionHeader.tsx`, `CollectionListView.tsx`, `DeckPickerSheet.tsx`, `FlashcardListItem.tsx`, `app/flashcards_card_editor.tsx`, `app/flashcards_packs.tsx` (только строки `qa-…`), сторож.

Out of scope: `testID` (не трогаются), подписи без `qa-` префикса, вид и поведение.

## Architecture

Для кнопок с видимым текстом достаточно `accessible` — подпись собирается из дочернего `Text`. Для полей и значков подписи берутся из уже существующих видимых строк рядом (заголовки полей редактора, плейсхолдер поиска, строки «Очистить поиск», «Назад») либо коротких 9-язычных `triLang`.

## Security and privacy

Данных не касается.

## Technical debt

Remove: служебные метки `qa-*` в `accessibilityLabel` и `label` — убираются целиком.

## Verification

Точечный прогон сторожа «нет qa- в accessibilityLabel» и смежных контрактов Карточек через test:one под светофором; `node scripts/scan_untranslated_jsx.mjs --report` — раздел «Доступность» пуст.

## Rollback

git revert коммита.
