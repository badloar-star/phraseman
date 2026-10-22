# Task packet: опрос не отдельным блоком, динамик в занятиях, только TTS (владелец 22.10, срочно)

Governance-ID: TG-78323A557471
Status: In progress
Owner: сессия Learning V2 по поручению координатора 22.10

## Outcome

(1) На Главной нет отдельного блока опроса: опрос живёт строкой «Сегодня» и шторкой (правка-сирота 19.10 возвращается из
архива). (2) Во всех режимах занятий кнопка звука — динамик и нажимается повторно всегда. (3) Факты по «запись из облака
или TTS» в занятии: что в HEAD, что меняют незакоммиченные файлы, где решение владельца — таблицей координатору, затем
коммит правильного.

## Scope

In scope: app/(tabs)/home.tsx, components/home/HomePollV2Card.tsx, tests/home_startup_stability.test.ts, режимы
modules/learning-v2/modes/*, разбор файлов звука (без правки app/audio_session_coordinator.ts без слова координатора).
Out of scope: content/** (Codex).

## Architecture

Опрос: хук useHomePollV2 владеет снимком и отправкой, шторка HybridSheetShell показывает модель (как в правке 19.10).

## Security and privacy

Опрос отправляет ответы как раньше — новых данных нет.

## Technical debt

- Pay now: устаревший сторож «survey cache primed» переписывается под решение владельца.

## Verification

home_startup_stability, тесты опроса, tsc через слот; кнопки повтора — learning_v2_audio_replay_buttons.

## Rollback

Патчи 19.10 в docs/work/archive/orphan-2026-10-19; откат коммита возвращает прежний вид.

Governance-ID: TG-F8D930F1F83E
Governance-ID: TG-E4795580EB36
(22.10: кнопки звука — динамик и повтор во всех режимах; довести восстановленные home/lessons/HomePollV2Card)
Governance-ID: TG-E4795580EB36 — связка A: HomePollV2Card без рамок (тон), шрифты 13/16

Governance-ID: TG-61F8F06AA2DD
(22.10: связка B — старые тесты под переносы 19.10: last_lesson, instant_open_batch, audio_runtime_ownership)

Governance-ID: TG-D3BAE8C492E1
