# Task packet: итог экзамена главы — строки на 9 языках (Переводчик, по пересылке координатора от Learning V2)

Governance-ID: TG-0408074A72D4
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Вычитаны черновики Learning V2 в `components/learning-v2/learning_v2_chapter_exam_result_copy.ts` (файл ещё не в git —
коммичу его целиком по просьбе Learning V2 через координатора):

- «Почти получилось» — uk «Майже вийшло», en «Almost there», es «Casi lo logras», pt-BR «Quase lá», vi «Suýt đạt»,
  id «Hampir berhasil», tr «Az kaldı», pl «Prawie się udało» — верно.
- «Глава {n} открыта» — словарь «Сезона» (tr «{n}. ünite açıldı») — верно.
- «Твой ответ:» (нейтральное вместо «Ты ответил:») — uk «Твоя відповідь:», en «Your answer:», es «Tu respuesta:»,
  pt-BR «Sua resposta:», vi «Bạn trả lời:», id «Jawabanmu:», tr «Cevabın:», pl «Twoja odpowiedź:» — верно, рода нет.
- «Повторить эпизод {n}» — tr «{n}. bölümü tekrarla» (bölüm = эпизод) — верно.
- «{x} из 12» — верно.
- Фраза провала с числом ошибок 3–12: формы ru/uk словами, pl «błędy» (3–4) / «błędów» (5–12) — верно.

Исправлено: uk «п'ять», «дев'ять» — прямой апостроф заменён на типографский «’», как везде в приложении;
пометки «черновик» сняты.

## Scope

In scope: тексты одного файла. Out of scope: экран итога (Learning V2).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.

## Verification

Функции прогнаны: фраза провала ru/uk/pl для 3, 5, 9, 12 («три ошибки», «п’ять помилок», «12 błędów»), подзаголовок разбора для 3, 5, 12, 22 — формы верны.

## Rollback

`git revert <коммит>`.
