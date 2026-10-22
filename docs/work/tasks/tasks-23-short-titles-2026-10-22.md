# Task packet: задания №23 — короткие заголовки и одна подпись «Скажите по-английски» (Переводчик, координатор 22.10)

Governance-ID: TG-6638F7D7397B
Governance-ID (поручение): TG-8A2DC220C068
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

По списку из 048916e08 (tasks-23-length-check-2026-10-22.md) — заголовки, уходившие на вторую строку на экране 360:
- sound_contrast en «Tell the sounds apart» → «Spot the sound»; es «Distingue los sonidos» → «Distingue sonidos»;
- scripted_repeat_compare id «Ucapkan dengan keras» → «Ucapkan keras»;
- speed_match / match_pairs id «Cocokkan pasangan» → «Cari pasangan» (как ru «Найди пары»). Этот заголовок с таймером
  берётся из `components/learning-v2/learning_v2_task_titles.ts`, поэтому правка в обоих файлах.

Мёртвая дублирующая подпись `sayInEnglish` из `components/learning-v2/learning_v2_task_body_copy.ts` удалена: на экране
живёт `GOAL_SAY` в `modules/learning-v2/runtime/task_prompt_parts_v1.ts` (vi «Nói bằng tiếng Anh», id «Katakan dalam bahasa
Inggris» — оставлены: короткая форма без «Hãy» как у остальных заголовков; «Katakan» = «скажи», «Ucapkan» ближе к
«произнеси»). Learning V2 предупреждён сообщением до правки (его сессия сообщение задержала — режим разрешений).

## Scope

In scope: строки в трёх файлах. Out of scope: логика, ru/uk, остальные языки.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- `learning_v2_task_titles.ts` и `task_prompt_parts_v1.ts` держат два набора заголовков с расхождениями (vi «Ghép cặp» /
  «Nối các cặp», id «Isi katanya» / «Isi kata», tr «Cümleyi kur» / «Cümleyi oluştur», pl «Ułóż zdanie» / «Ułóż frazę»,
  speak id «Ucapkan dengan lantang»). Сейчас из второго файла рисуется только «Найди пары». Свести в один источник —
  решение Learning V2 / 2 · ДИЗАЙН.
- `answer` в `learning_v2_task_body_copy.ts` тоже не вызывается — оставлен, координатор просил только дубль «Скажите».

## Verification

`babel.parseSync` трёх файлов; точечные тесты learning_v2_task_prompt_parts_v1 и learning_v2_task_body_proposed_2026_10_22 под слотом: 37 из 37.

## Rollback

`git revert <коммит>`.
