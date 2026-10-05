# Task packet: (а) сплеш скрывается через ~2 с после кадра Главной — лог, что держит фиксацию корня

Governance-ID: TG-E29DA01C2132
Status: In progress (координатор 05.10: «(а) лог, почему таймер firstContentReady срабатывает ~2 с позже HOME-PAINT, сам гейт после лога»)
Owner: сессия 1 · ЯДРО

## Outcome

Пакет 07:26, прогон 1: событие app_first_content_ready +5663 → таймер 32 мс сработал +8224 (lateMs 2525, поток занят) →
setFirstContentReady(true) +8224 → следующая строка «splash gate» (canHide=true) только +10207: фиксация корня AppContent
после setState заняла ~2 с. Нужно увидеть: тяжёл ли сам рендер корня или поток занят другим.

## Scope

app/_layout.tsx (только логи): (1) момент setFirstContentReady и задержка до фиксации гейта (commitLagMs) в строке
«splash gate»; (2) React Profiler вокруг AppContent — коммиты ≥ 80 мс до скрытия сплеша + 3 с: [BOOT-COMMIT]
{phase, actualMs, baseMs, atEpochMs}. Поведение не меняется.

## Architecture

Profiler уже используется в _layout (tapLatencyProfilerOnRender). Логгер — модульная функция с флагом окончания окна.

## Security and privacy

Только длительности.

## Technical debt

Временная трассировка; после диагноза Profiler убрать или оставить выключенным.

## Verification

Сторожа _layout (perf_freeze, layout_stability, startup); синтаксис; замер 08:26.

## Rollback

git revert коммита.
