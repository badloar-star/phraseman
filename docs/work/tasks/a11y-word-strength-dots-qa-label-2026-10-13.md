# Task packet: точки «силы слова» — диктор не читает служебный id автотеста (13.10)

Governance-ID: TG-78A2CD59B455
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по сообщению Макетов (a11y, место того же класса, что 21 вчерашнее)

## Outcome

`app/flashcards/WordStrengthDots.tsx` отдавал диктору `accessibilityLabel="qa-<testID>"` (шаблонная строка, поэтому сторож Макетов его не поймал): диктор читал «qa-fc-strength-…». Точки декоративные (цветовой признак, `pointerEvents="none"`), поэтому они скрыты от диктора, а `testID` остаётся для робота Сверки.

## Scope

In scope: `app/flashcards/WordStrengthDots.tsx` (метка убрана, элемент скрыт от доступности), `tests/a11y_no_qa_labels_contract.test.ts` (сторож ловит и шаблонные строки ``accessibilityLabel={… `qa-…` …}`` и добавлен файл точек).

Out of scope: человеческая подпись силы слова на 9 языках («Слабое / Среднее / Сильное слово») — нужны тексты и язык в компоненте; помечено в итоге как улучшение.

## Architecture

Компонент остаётся чисто презентационным; добавляются `accessible={false}` и `importantForAccessibility="no-hide-descendants"`, `testID` не меняется (на Android он становится resource-id, робот ищет по нему).

## Security and privacy

Данных не касается.

## Technical debt

Remove: служебную метку `qa-…` из доступности и «слепое пятно» сторожа на шаблонных строках.

## Verification

Точечно: `a11y_no_qa_labels_contract`; парсер babel по правленому файлу.

## Rollback

git revert коммита.
