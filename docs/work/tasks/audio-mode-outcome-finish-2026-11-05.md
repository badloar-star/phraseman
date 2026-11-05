# Task packet: довести аудио-WIP «исход смены режима» + сохранить слой V2-full-off патчем

Governance-ID: TG-563952E3B9E5
Status: In progress
Owner: Learning V2 session; поручение координатора 05.11 (вердикт по разделу F инвентаря)
Related epic/enabler: none

## Outcome

1. Слой 02.11 «V2 отключён у всех» отклонён (решение владельца 04.11): сохранён патчем `docs/work/patches/learning_v2_full_off_2026-11-02.patch`, помечен в BACKLOG как отклонённый; рабочее дерево не тронуто.
2. Аудио-WIP (`app/audio_session_coordinator.ts`, `app/audio_mode_outcome_diagnostics.ts`, `modules/audio/audio_activity.ts`): `setManagedAudioMode` возвращает структурированный исход (applied/failed/timed_out). Довести: все вызывающие, тесты, логи на ранних выходах и в catch. В сборку 150 — только при зелёном Ревизоре и E2E на эмуляторе; иначе остаётся выключенным.

## Scope

In scope: перечисленные три файла, их тесты (`tests/audio_*`, `loud_playback_audio_mode_contract`), вызывающие `setManagedAudioMode`; патч и строка в BACKLOG.

Out of scope: V2-слой 02.11 (только патч), generated_release, словари экзаменов, банки экзамена (зона Теории).

## Architecture

Граница та же: координатор серийно упорядочивает смены нативного режима. Меняется тип результата `Promise<void>` -> `Promise<{outcome}>`; ошибки не бросаются вызывающему, а возвращаются исходом. Инвариант: порядок переходов сохраняется (transitionTail).

## Security and privacy

Данные пользователя не затрагиваются, разрешения не меняются, логи без идентификаторов.

## Technical debt

Не добавляем: чужой WIP доводится до тестов; незавершённое остаётся выключенным.

## Verification

Точечные jest-прогоны audio_* тестов, проверка типов затронутых файлов, grep вызывающих; эмулятор — через Сверку/Ревизора.

## Rollback

Не включать в сборку; файлы WIP остаются в дереве, откат — не коммитить.

Governance-ID: TG-2876B76F831D (чек-лист E2E блока «Звук» для Сверки; при провале по 1,5 с — ретрай с логами)
