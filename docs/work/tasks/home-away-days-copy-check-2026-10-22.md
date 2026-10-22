# Task packet: «Тебя не было N дней» на Главной — смысл «отсутствие», а не «пропуск занятий» (Переводчик, координатор 22.10)

Governance-ID: TG-F9040E80B890
Status: Done — замена id внесена (коммит в окно)
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Строка `HOME_SCENE_COPY.away` в `components/home/v2/scene/home_scene_copy.ts` теперь считает дни без захода в приложение,
а не дни без уроков (решение владельца через координатора). Текст остаётся, но на всех 9 языках он должен говорить
об отсутствии. Проверка: ru, uk, en, es, pt-BR, vi, tr, pl — про отсутствие. id «Kamu absen N hari» — «absen» значит
неявку на учёбу или работу, то есть пропуск занятий. Замена: «Sudah N hari kamu tidak mampir» («N дней не заглядывал»).

## Scope

In scope: одна подстрока id в `away`. Out of scope: логика подсчёта дней (1 · ЯДРО / Дизайн), остальные строки сцены.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителем.

## Verification

`babel.parseSync` файла; `git diff --numstat` = 1/1. Сторож `tests/home_scene_preview_contract.test.ts` текст id не проверяет.

## Rollback

`git revert <коммит>`.
