# Task packet: подпись кнопки «Слушать …» в задании на различение звуков — вычитка 9 языков (Переводчик → Learning V2)

Governance-ID: TG-DFCDE338E3FD
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

`modules/learning-v2/modes/sound_contrast_mode_v1.tsx` (d3d8c36d4), подпись для озвучки `LISTEN_LABEL_V1`.
Вместо `l` подставляется вариант ответа (английское слово или звук).

Исправлено:
- **tr** «ship dinle» → **«Dinle: ship»**. Без окончания винительного падежа («ship'i dinle») турецкая фраза звучит
  рублено, а окончание нельзя подобрать заранее для любого слова (гармония гласных). Форма с двоеточием естественна
  и не зависит от слова.

Верно без правок: ru «Слушать ship», uk «Слухати ship», en «Listen to ship», es «Escuchar ship», pt-BR «Ouvir ship»,
vi «Nghe ship», id «Dengarkan ship», pl «Posłuchaj ship».

## Scope

In scope: одна строка tr. Out of scope: логика кнопки, остальные языки.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителем.

## Verification

`babel.parseSync` файла; тестов с турецкой подписью нет.

## Rollback

`git revert <коммит>`.
