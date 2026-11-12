# Передача: банк игр de/fr, уроки 21–24 (12.11)

Governance-ID: TG-79EE33FC63E1

Прежний исполнитель («Центрирование иконок в плитках», local_a735f9da) отдал задачу свежей сессии: длинный контекст,
тонкая вычитка теряет надёжность. Записано со слов исполнителя.

## Outcome

Все 8 игр (кроме недоступных курсу) на уроки 21–24 для немецкого и французского, сторожа до 24.

## Scope

`modules/games/bank/*_de.ts`, `*_fr.ts`; `tests/game_task_bank_de_fr.test.ts`; строка `LAST_LESSON` в
`tests/game_flow_distractors.test.ts` (только de/fr).

## Architecture

- Образцы: коммиты `3e46036dd` (13–16) и `101902540` (17–20); пакеты
  `docs/work/tasks/game-task-bank-de-fr-lessons-13-16-2026-11-12.md` и `…-17-20-…` (решения и ловушки).
- Уроки вставлять скриптом перед закрывающей `};` каждого файла (у `flow_*` — перед `  },\n};`); шапки «уроки 1–20» → «1–24».
- `tests/game_task_bank_de_fr.test.ts`: `LESSONS` до 24, `orderLessons` + 21–24; `gapDecks` — только колоды с пропуском
  (без пропуска были de 15 и fr 16).
- Сторож ловит непройденные слова; на 13–20 попадались: ja, nein, oui, non, aussi, sehen, schnell, faire, resté, erholen,
  verspäten, trinkt, gibst, vieux, l’étiquette. Без «Ja/Nein/Oui/Non» в диалогах; порядок держится на «auch / Und / Et».
- «Память»: слова не повторяются ни в одном наборе языка за все уроки.
- «Точное слово»: пропуск местоимения не брать, если неверный вариант тоже живая фраза («Je te prépare», «Wir treffen euch»).
- Пример корзины «Сортировки»: правило или местоимения, без слов карт (проверка в стороже, `6707250b5`).

## Security and privacy

Только учебное содержимое.

## Technical debt

Нет.

## Verification

Сторожа через светофор: `bash .claude/semaphore/slot.sh run --wait "…" -- npm run test:one -- tests/game_task_bank_de_fr.test.ts`,
плюс `game_flow_distractors`, `game_content_integrity`, `game_task_source`. «Проходит» — только по тексту вывода.

## Rollback

`git revert` коммита банков.

## Ловушки коммита

- Общую строку `LAST_LESSON` коммитить ТОЛЬКО со значениями, чьи банки уже в коммите (был случай: забрали чужие 24 при
  незакоммиченных банках — исправляли `1b5f68f24`). Свою часть — через временный индекс (`read-tree HEAD` →
  `update-index --cacheinfo` → `write-tree` → `commit-tree` → `update-ref`), если в общем индексе лежат чужие файлы.
- Индекс часто занят соседями: коммит в цикле «нет `.git/index.lock` → `git add -- пути && git commit -- пути`»;
  чужой замок не удалять. Без push.
