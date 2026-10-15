# Моменты v3 — подключение m09, m17, m05 к экранам (15.10)

## Outcome
Три окна из эталона engagement-moments-v3-all подключены к своим экранам под флагом `moments_v3` (выкл по умолчанию), лениво, по правилу «сначала закрыть окно, потом переход/запись»:
- m09 «Идеальный урок» — итог урока (`app/lesson_complete.tsx`), монеты = `practiceRunes.runes` (тот же расчёт, что «+N» на итоге);
- m17 «Первый разговор» — итог диалога (`app/dialogue_v2_completion.tsx`), один раз на изучаемый язык;
- m05 «Позиция выросла / обогнали / последний шанс» — Пик (`SpireHomeScreen` → `SpireMomentsLayer`); триггеры — хук Ядра `useSpirePositionMoments` (договор `position_moments_contract.ts`, сейчас заглушка).

## Scope
Только показ. Начислений, записей прогресса, навигации сверх «Дальше / Следующий сценарий / Играть / Plus-пейвол» нет. Цифры только из итога (`lessonCounts`, `learnerTurns`, цели ревью); нет цифр — момент не показывается.

## Architecture
Чистые гейты (`perfect_moment_gate`, `first_dialog_gate`) возвращают {show, reason}; ленивые хосты (`LessonPerfectHost`, `FirstDialogHost`, `SpirePositionMomentsHost`) монтируются экранами только при флаге. `useFireOnce` гасит двойной тап. Журналы: `[LESSON-PERFECT]`, `[FIRST-DIALOG]`, `[FIRST-DIALOG-STORE]`, `[SPIRE-POSITION]`. Dev-кадры: `/dev_moments_preview?state=perfect|firstdialog`.

## Security and privacy
Новых сетевых вызовов и чтений Firestore нет. m17 хранит локально одно булево «показано» по ключу аккаунт+язык (AsyncStorage `first_dialog_moment_shown_v1:<stableId>:<язык>`); данные не покидают устройство, id сценариев и реплики не пишутся — политика конфиденциальности не меняется. Празднование не durable-очередь: пометка ставится в момент показа.

## Technical debt
- m17 считает «первый» по локальному набору пройденных диалогов (`dialogue_v2_done_store`, ведётся с 12.10): тот, кто проходил диалоги раньше, может увидеть момент на первом диалоге после обновления (один раз).
- Триггеры m05 ждут реализации хука Ядром.

## Verification
`lesson_perfect_wiring_contract`, `first_dialog_wiring_contract`, `spire_position_moments_host_contract`, существующие контрактные тесты окон, `spire_moments_v3_contract`, typecheck по затронутым файлам.

## Rollback
Флаг `moments_v3` выключен — поведение экранов прежнее; откат — revert коммита.

Governance-ID: TG-B921B6BE556C
