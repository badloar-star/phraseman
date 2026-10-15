# Task packet: шторка языка обучения — «Учу · выбран» → «Сейчас учу», начатые языки — «Начат» (9 языков)

Governance-ID: TG-9D2905ECB954
Status: In progress
Owner: сессия «Специалист по переводам» (координатор 15.10, находка Сверки)
Related epic/enabler: R07

## Outcome

У текущего языка в шторке выбора — одно понятное «Сейчас учу» вместо странного «Учу · выбран» (дублировало отметку). У начатых, но не
текущих языков — «Начат», чтобы рядом не стояли два «учу». 9 языков.

## Scope

In scope: `components/settings/StudyLanguageSheet.tsx` — подписи `sub.selected` и `sub.learning`. Другие места ключа «Учу» проверены:
`app/flashcards/cardStatus.ts`, `PhraseCard.tsx` — статус карточки «Учу» (знаю/учу), это другой смысл, не трогаю.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Подписи шторки живут в компоненте — Accept temporarily: вынос в таблицу строк после выпуска (владелец — Темы, у них шторка R70).

## Verification

Тесты шторки языка и сторожа i18n через slot.sh.

## Rollback

`git revert` коммита.
