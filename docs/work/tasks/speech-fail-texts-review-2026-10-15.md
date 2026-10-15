# Task packet: тексты экрана «не засчитано» — проверка 9 языков (fc7514d76 Дизайна)

Governance-ID: TG-BA40B6B6B41B
Status: In progress
Owner: сессия «Специалист по переводам» (поручение координатора 15.10)
Related epic/enabler: строгая проверка речи, сборка 16.10

## Outcome

Экран «не засчитано» говорит с человеком на «ты» на всех 9 языках: строка «Не услышали слово «X» — скажи фразу целиком» с верными
кавычками и порядком слов, подпись плашки «Сказано» как обращение («You said», «Dijiste»…), кнопки «Ещё раз» / «Пропустить» —
теми же словами, что во всём приложении, в одну строку.

## Scope

In scope (только тексты): `app/speech_fail_view.ts` (tr), `app/learning_v2_direct_session_player_v1.tsx` (подпись плашки, «Ещё раз»),
`app/flashcards_speaking_session.tsx` (`spokenTranscript`, `retry`, `skip`). Out of scope: вёрстка блока, `spokenCount` (другая подпись — счётчик).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Подписи «Сказано» и кнопки «Ещё раз / Пропустить» продублированы в двух экранах (курс V2 и Карточки «Устно») — Accept temporarily:
  владелец — Дизайн, общий словарь блока речи после выпуска 20.10; до тех пор переводчик правит обе копии одинаково.

## Verification

tests/speech_fail_view.test.ts, speech_fail_block.test.tsx, speech_fail_wiring_contract.test.ts, speaking_inline_overlay_contract.test.ts,
сторожа i18n — через slot.sh.

## Rollback

`git revert` коммита.
