# Task packet: два node-теста Learning V2, красные с 22.10 — перепин под нынешнее поведение; мусорный generated_release/en/nul

Governance-ID: TG-7F6EECB6D1F8
Status: In progress
Owner: Learning V2 session; координатор 28.10

## Outcome

- generated_release/en/nul (0 байт, не в git, в .gitignore) удалён — 4 набора jest больше не падают с ENOTDIR.
- tests/learning_v2_chapters_route_contract.test.mjs: вкладка рисует курс через LessonsCourseSurface (Сезон или карта глав по флагу,
  cf21076f9) — тест проверяет это, а не прямой <LearningV2ChaptersCourse>; запрет пульс-карты остаётся.
- tests/learning_v2_show_only_released_contract.test.mjs: проверок множества выпущенных занятий в lessons.tsx стало 3 (72f72a94e снял
  прогрев записей mp3) — тест проверяет нынешние места.

## Scope

Только два файла тестов. Код не меняется.

## Architecture

Ожидания следуют за поведением, которое владелец утвердил (Сезон — Ф4; «только голос телефона» — 22.10).

## Security and privacy

Нет данных.

## Technical debt

Тесты остаются проверками исходника по тексту (регулярки по lessons.tsx): переименование переменных снова их покраснит. Поведенческой
проверки «карта показывает только выпущенные занятия» на отрисовке нет — отдельная задача, если координатор захочет.

## Verification

node --test двух файлов; повторный прогон тестов Learning V2.

## Rollback

Revert коммита.
