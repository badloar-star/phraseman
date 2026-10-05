# Task packet: сторож оценки урока — под общий экран завершения 2.0

Governance-ID: TG-FFB036C76A14
Status: Done (2026-10-05)
Owner: сессия «2 · Дизайн» (поручение координатора)
Related epic/enabler: решение владельца 01.10 «итог урока = V2DoneScreen»

## Outcome

tests/feedback_rating_layout_contract.test.ts снова зелёный и охраняет действующий смысл: форма «Всё было понятно?»
живёт в прокрутке общего экрана завершения (V2DoneScreen.feedbackSlot) перед кнопками и видна над клавиатурой.

## Scope

In scope: тест-сторож; одна строка вида — подстройка прокрутки V2DoneScreen под клавиатуру.
Out of scope: ResultsSequence (снятый вид), логика гейта оценки, тексты.

## Architecture

Без изменения архитектуры: итог урока уже рендерится через V2DoneScreen (01.10); сторож переведён с ResultsSequence на него.

## Security and privacy

Не затрагивает данные: форма оценки и её отправка не менялись.

## Technical debt

- Pay now: сторож, охранявший снятый вид, переписан под действующий.

## Verification

npm run test:one -- tests/feedback_rating_layout_contract.test.ts; точечная проверка типов V2DoneScreen.

## Rollback

git revert коммита; данных не затрагивает.
