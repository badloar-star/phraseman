# Task packet: перезакрепить отпечаток panel (SpeakingPanel) в сторожe карточек «Устно»

Governance-ID: TG-A790A6467D85
Status: In progress
Owner: Learning V2 session; задача координатора 26.10 (Темы: сторож красный на HEAD)

## Outcome

tests/flashcards_speaking_liquid_glass_source_contract.test.mjs снова зелёный: отпечаток panel = текущий SpeakingPanel на HEAD
(08a9a157…). Изменения панели намеренные и мои: 4ced6dc60 (журнал причин «не расслышал»), e8aa1c456 (подпись по причине),
e1780664d (контраст «Готово»/«стоп»/«нечётко»/звёзды, нейтральная подпись при таймауте). Логика квот, попыток и записи не менялась.

## Scope

Только строка panel в этом тесте. hold (уже перезакреплён Темами), slot, stars, logic не трогаю.

## Architecture

sha256 содержимого components/SpeakingPanel.tsx как в индексе (LF), с комментарием-причиной рядом, как у прежних перепинов.

## Security and privacy

Нет данных.

## Technical debt

Отпечаток зависит от окончаний строк файла; рабочая копия и индекс — LF.

## Verification

node --test tests/flashcards_speaking_liquid_glass_source_contract.test.mjs.

## Rollback

Revert коммита.
