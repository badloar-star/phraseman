# Task packet: параметры настройки тренировки (время Блица, направление «Вспомни», размер «Правда/ложь»)

Governance-ID: TG-94EA8E61CB15
Status: In progress
Owner: сессия 1 · ЯДРО (координатор 04.10; интерфейс — сессия 3, 15cbdba47, кадры 033–038)

## Outcome

Сессии принимают настройку из маршрута: Блиц sec=30|60|90 (по умолчанию 60), «Вспомни и напиши»
dir=to_target|to_source (по умолчанию как сейчас — to_target), «Правда/ложь» size=10|20|all (свайп уже
читает size). Каждый разбор параметра пишет [PRACTICE-SETUP]: что пришло и что применено.

## Scope

app/flashcards/practice_setup_params.ts (новый, чистые разборщики), app/flashcards_blitz_session.tsx,
app/flashcards_recall_session.tsx, app/flashcards_swipe.tsx (только лог). Вне: training_entry.ts и
flashcards_training_setup.tsx (сессия 3 подключает параметры в маршрут).

## Architecture

Значение по умолчанию сохраняет текущее поведение; мусор в параметре → значение по умолчанию + лог.

## Security and privacy

Нет новых данных.

## Technical debt

Нет.

## Verification

Тест разборщиков (один прогон за раз, по светофору).

## Rollback

git revert.
