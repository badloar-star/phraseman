# Task packet: разбор чужих незакоммиченных правок от 19.10 («Разобрать и сохранить годное»)

Governance-ID: TG-AC4F80264153
Governance-ID: TG-9085D7EF8497 (продолжение после перезапуска сессии 22.10: заглушки теста жизненного цикла плеера, коммиты разбора)
Status: In progress
Owner: сессия Learning V2; решение владельца кнопками 22.10 через координатора

## Outcome

Ни одна правка 19.10 не потеряна (архив патчей и копий в docs/work/archive/orphan-2026-10-19/), годное закоммичено
отдельными коммитами, негодное возвращено к HEAD. Отчёт координатору таблицей: файл → вердикт → что сделано → хэш.

## Scope

In scope: app/(tabs)/lessons.tsx, components/home/HomePollV2Card.tsx, components/home/v2/HomeV2TodayCard.tsx,
components/home/v2/TodayActivityHistory.tsx, оставшиеся куски app/(tabs)/home.tsx (опросы, «Сегодня»), повтор аудио в
modules/learning-v2/modes/* (audio_replay_pressable_v1 + режимы с датой 19.10).
Out of scope: app/audio_session_coordinator.ts (работа координатора), любые файлы с правками позже 19.10 не из списка.

## Architecture

No architecture change by this task itself: каждая правка оценивается по месту. Решения владельца (опросы, «Сегодня» A,
новая «Сцена») главнее правки 19.10.

## Security and privacy

Проверяется по каждой правке; если правка добавляет сбор данных — в отчёт и в 🔴.

## Technical debt

- Pay now: висящие правки 19.10 блокируют другие сессии (Темы); после разбора в дереве их не остаётся.

## Verification

Патч каждого файла лежит в архиве ДО любого отката. По годным: tsc и тесты рядом через слот, сторожа стиля.

## Rollback

Любой откат восстанавливается из архива: git apply docs/work/archive/orphan-2026-10-19/<файл>.patch, копии untracked — там же.
