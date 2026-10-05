# Task packet: карточка «Продолжить урок» на холодном старте — из стартового снимка, без заглушек

Governance-ID: TG-FE886B429FC8
Status: In progress (пакет 07:26 [HOME-COLD] first_frame: lessonCard=empty, hydrationInMemory=false — диагноз подтверждён)
Owner: сессия 1 · ЯДРО

## Outcome

Карточка «Продолжить урок» берёт данные только из памяти процесса (home_screen_hydration) — на холодном старте её нет,
карточка — заглушки, пока loadData не прочтёт прогресс. Стартовое чтение (primeAppSnapshotFromStorage) уже читает
last_opened_lesson; добавить в ТОТ ЖЕ multiGet ключи прогресса 32 уроков (без нового ключа и без cloud_sync) и положить в
snapshot.lessons число верных у последнего урока и язык изучения. buildLastLessonFromHydration при пустой памяти берёт
урок из снимка (если язык совпадает).

## Scope

app/app_snapshot_store.ts (поля lessons.lastOpenedLessonCorrect, lessons.studyTarget), app/app_snapshot_bootstrap.ts
(ключи прогресса в общий multiGet, подсчёт как в loadData), app/home_screen_hydration.ts (запасной путь из снимка).
loadData не меняется и по-прежнему уточняет (доступность урока, точный счёт).

## Architecture

Один multiGet (+32 ключа), без новых запросов и записей. Снимок сбрасывается при смене аккаунта
(resetAppSnapshotForAccountSwitch). Подсчёт верных — тот же, что в loadData ('correct' | 'replay_correct').

## Security and privacy

Новых данных не собирается и не хранится: существующие локальные ключи прогресса, только в памяти процесса.

## Technical debt

Если стартовая гонка гидратации (бюджет 350 мс) закончится позже первого рендера Главной — карточка подтянется из
loadData, как раньше (замер 07:26: гонка закончилась в +6,6 с, это отдельный пункт (в) координатора).

## Verification

Тесты стартового снимка, home_screen_hydration, сторожа Главной; [HOME-COLD] first_frame lessonCard=snapshot в 08:26.

## Rollback

git revert коммита.
