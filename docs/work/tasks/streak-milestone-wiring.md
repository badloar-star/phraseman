# Task packet: рубежи серии подключены к настоящему событию роста серии (итог урока и разговора)

Governance-ID: TG-172DA5D60D36
Governance-ID: TG-8155211C6102
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: приоритет координатора 15.10 к сборке 16.10 — `StreakMilestoneScreen/Toast/Ribbon` готовы, но подключены только к `dev_moments_preview`; ТЗ `V3_IMPLEMENTED_2026-10-15.md` (20 из 43 моментов); решение владельца «празднование не durable» (ФУНДАМЕНТ 01.09)

## Outcome

Когда засчитывается день серии и число дней — рубеж (3, 7, 14, 30 … 1000), на экране итога урока и итога разговора, при включённом флаге `moments_v3`, показывается окно рубежа: один раз на рубеж, грузится лениво только в момент показа, с журналом `[STREAK-MILESTONE]` (день, рубеж, флаг, уже показан, решение). Окно рубежа идёт первым; «Идеальный урок», «Первый разговор» и оценка приложения ждут его закрытия.

## Scope

In scope: `app/dev_streak_milestone.ts` (dev-подмена серии streak=N, только __DEV__; подключение к dev_state — отдельным коммитом), итоги карточек и «Моих ошибок» (тот же ленивый хост), диск-метка «рубеж показан»; `app/streak_milestone_pending.ts` (хранилище в памяти + подписка), одна строка в `app/streak_day_signal.ts` (`markStreakDayCounted`), `components/streak/moments/streak_milestone_gate.ts` (чистое решение), `components/streak/moments/StreakMilestoneHost.tsx` (ленивый хост), точечное подключение в `app/lesson_complete.tsx` и `app/dialogue_v2_completion.tsx` (монтаж хоста + пауза у чужих моментов), тесты.

Out of scope: хосты m05/m09/m17 (Дизайн) кроме условия «ждать рубеж»; зависимость от сети; запись показанного рубежа на диск; кнопка «Поделиться» окна.

## Architecture

День считается в `streak_day_signal.markStreakDayCounted` (первое учебное действие дня) — там же рубеж записывается в память как «ожидает показа». Экран итога монтирует лениво `StreakMilestoneHost` (React.lazy + Suspense), хост сверяет факт (сегодняшний день и число дней совпадают с текущим состоянием серии), забирает ожидающий рубеж, показывает `StreakMilestoneMoment` (тост — наложением, сцены — в Modal), на закрытие снимает «открыто». `useStreakMilestoneHold` отдаёт другим моментам сигнал ждать.

## Security and privacy

Данные пользователя не пишутся и не уходят в сеть; только состояние в памяти процесса. Пересборка при смене аккаунта (`onAccountOwnerChanged`) очищает память.

## Technical debt

Contain: подключены два экрана (урок, разговор); итоги карточек и «Мои ошибки» тоже засчитывают день, но хоста там нет — ожидающий рубеж живёт в памяти до экрана с хостом и показывается только если число дней и дата ещё актуальны. Решение владельца нужно, если нужен показ и там.

## Verification

`npm run test:one` по слоту: тест хранилища и решения (`streak_milestone_wiring.test.ts`), `streak_moments_v3_contract`, `cold_start_static_graph_guard`, затронутые контракты `lesson_complete`/`dialogue_v2_completion`; `typecheck` по затронутым файлам.

## Rollback

git revert коммита; флаг `moments_v3` выключает показ без отката.
