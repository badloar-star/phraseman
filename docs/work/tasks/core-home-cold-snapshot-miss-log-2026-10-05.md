# Task packet: HOME-COLD — карточка урока и лента видео не из снимка на первом кадре (сперва лог)

Governance-ID: TG-C0A0E7E0461C
Status: In progress (координатор 05.10, пакет 08:26: lessonCard=empty, hydrationInMemory=false, videos=0 в обоих прогонах;
после video:start нет ни одной строки video:resolved/cache_miss)
Owner: сессия 1 · ЯДРО

## Outcome

Понять по логам, почему не сработали f6ea32f09 (карточка из стартового снимка) и a6180e2b3 (лента из кэша):
- снимок: какой ранний выход сработал в primeAppSnapshotFromStorage (нет stableId / смена аккаунта / сбой чтения) или
  что он положил (lastOpenedLesson, число верных, studyTarget) и когда — до или после первого рендера Главной;
- карточка: по какой причине buildLastLessonFromBootSnapshot вернул null (снимка нет / studyTarget не совпал / нет id /
  нет числа верных);
- лента: почему homeRuntimeActive=false первые 6–8 с (isHomeOwner, homeOnboardingDone), и дошёл ли ленивый импорт
  ленты и чтение кэша (после video:start тишина).

## Scope

app/app_snapshot_bootstrap.ts — [BOOT-SNAPSHOT] на каждом раннем выходе и итог.
app/home_screen_hydration.ts — [HOME-COLD] boot_card:null с причиной (один раз за запуск).
app/(tabs)/home.tsx — [HOME-COLD] video:import_done / cache_read, входы homeRuntimeActive в video:skip.
Поведение не меняется.

## Architecture

Не меняется.

## Security and privacy

Без uid: только флаги, номера уроков, миллисекунды.

## Technical debt

Временная трассировка; починка — по фактам следующего пакета (вероятно: кэш ленты читать вне гейта homeRuntimeActive,
снимок — в зависимости от причины). Логи ранних выходов prime остаются навсегда.

## Verification

Синтаксис (babel_check); точечные тесты home_lesson_card_boot_snapshot и app_snapshot_bootstrap при ≥4 ГБ; пакет замера.

## Rollback

git revert коммита.
