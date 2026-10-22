# Task packet: теория — 3 расхождения языков из аудита (Переводчик, координатор + 12 · ТЕОРИЯ, 22.10)

Governance-ID: TG-75EB5708C07D
Status: Done (черновики); собранные данные — с коммитом карты 12 · ТЕОРИИ
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Источник — русская авторская версия (`docs/work/tasks/theory-audit-2026-10-22.md`, раздел 2):

1. **Урок 10 · 02** «Обычно — или сейчас»: в 8 языков (`lesson_10_{uk,en,es,pt-BR,vi,id,tr,pl}.md`) добавлен пример
   «I am waiting on the porch. | … | am waiting» после «I am buying a ready-made meal today.».
2. **Урок 10 · 09** «Погода и температура»: в 8 языков добавлен «I am checking the forecast. | … | am checking» после
   «It is quite cold.» (перевод — как у того же примера в разделе 03 каждого языка).
3. **Урок 3 · 15** «Что взять в практику»: в en / es / pt-BR третий пример «Books are heavy.» заменён на ru
   «Those flowers are fresh. | … | Those» (по указанию автора 12 · ТЕОРИЯ). en в колонке перевода пишет смысл.

Переводы: uk «Я чекаю на ґанку.», en «Right now, for a while.», es «Estoy esperando en el porche.», pt-BR «Estou
esperando na varanda.», vi «Tôi đang đợi ở hiên nhà.», id «Aku sedang menunggu di teras.», tr «Verandada
bekliyorum.», pl «Czekam na ganku.»; «Those flowers are fresh.» — en «The flowers over there.», es «Esas flores están
frescas.», pt-BR «Aquelas flores estão frescas.».

Собранные json в этот коммит НЕ входят: в них лежат незакоммиченные изменения карты 12 · ТЕОРИИ (уроки 1–16).
Сборка берёт тексты из черновиков, поэтому мои примеры попадут в данные при их пересборке и коммите.

## Scope

In scope: таблицы примеров в 19 черновиках и их сборка. Out of scope: тексты разделов, карта занятий (12 · ТЕОРИЯ).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- en / es / pt-BR урока 3 · 15: в тексте раздела осталась фраза «In general — no the / En general: sin the / Em geral:
  sem the», а пример к ней («Books are heavy.») ушёл. Для es / pt-BR это настоящая ловушка родного языка («Los libros
  pesan» → «The books…»). Решение — за автором: вернуть пример четвёртой строкой или убрать фразу.
- Не проверено носителями.

## Verification

`node scripts/build_learning_v2_theory.mjs` — {"written":198,"problems":[]}, ошибок нет.

## Rollback

`git revert <коммит>`.
