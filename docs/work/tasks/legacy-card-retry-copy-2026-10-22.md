# Task packet: карточка «Ваши прошлые уроки» и «Пересдать через N мин» — вычитка 9 языков (Переводчик, координатор 22.10)

Governance-ID: TG-75EB5708C07D
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

1. `components/learning-v2/season/SeasonLegacyCard.tsx` (7e1a95e57, 4 · ТЕМЫ):
   - id «Pelajaran **Anda** sebelumnya» → «Pelajaran**mu** sebelumnya», tr «Önceki ders**leriniz**» → «Önceki ders**lerin**» —
     приложение на id/tr говорит на «ты» («aku/kamu», «Sınava gir»), вежливое «вы» здесь выбивалось.
   - «Классический курс» на 9 языках совпадает с уже утверждённой подписью в `app/(tabs)/lessons.tsx` — верно.
   - Остальное верно: uk «Ваші попередні уроки» (как ru «Ваши»), en, es, pt-BR, vi, pl.
2. `components/learning-v2/learning_v2_chapter_exam_result_copy.ts`, `retryIn` (24b0f18fc, Learning V2):
   - uk «Перескласти **через** {m} хв» → «Перескласти **за** {m} хв» — нормативно и как в тексте провала («за годину»).
   - Минуты везде сокращением (мин / хв / min / dk / phút / menit) — форм по числу не нужно, ru/uk/pl верны при любом {m}.
   - Остальные языки верны.

## Scope

In scope: строки двух файлов. Out of scope: логика, ru.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync` обоих файлов; тестов со старыми строками нет.

## Rollback

`git revert <коммит>`.
