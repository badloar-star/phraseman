# Task packet: подписи состояний экзамена Сезона (981cd8090) — вычитка 8 языков (Переводчик, 24.10)

Governance-ID: TG-6C5D64E758FD
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

981cd8090 (экзамен по эталону `chapter-exam-season.html`) добавил в `components/learning-v2/season/season_copy_card.ts` восемь ключей
(`examKickerEarly`, `examAttempt`, `examRetakeIn`, `examRetakeNote`, `examPassed`, `examChapterOpen`, `examToChapter`,
`examPassedNote`) с пометкой «остальные — предложение для Переводчика». ru — дословно эталон, не трогаю. Вычитка 8 языков, три правки:
- pl `examKickerEarly`: «możesz zdać wcześniej» → «możesz zdawać wcześniej» — «zdać» значит «сдать успешно», кикер про то, что
  к экзамену можно приступить раньше;
- id `examPassed`: «Ujian lulus, {c} dari {q}» → «Lulus ujian, {c} dari {q}» — естественный порядок («сдал экзамен»);
- tr `examPassed`: «Sınav geçildi, …» → «Sınavı geçtin, …» — на «ты», как соседние строки («girebilirsin», «yapabilirsin»).
Остальное верно.

## Scope

In scope: три строки в одном файле. Out of scope: ru, вёрстка, логика состояний.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Нет новых. Видно только при `SEASON_CHAPTER_EXAM_ENABLED`.

## Verification

`npm run test:one -- tests/season_exam_captions_etalon_2026_10_25.test.ts tests/season_exam_caption_note_2026_10_24.test.ts`.

## Rollback

`git revert <коммит>`.
