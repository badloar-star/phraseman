# Task packet: правило голоса en/es (владелец 28.10), событие v2mode:fallback, аудит sound_contrast, передача 84 слов

Governance-ID: TG-48E8378E702C
Status: In progress
Owner: Learning V2 session; координатор 28.10

## Outcome

- tests/learning_v2_session_runtime_contract.test.ts сторожит решение владельца 28.10 «Записи для en/es»: en/es — записи
  (голосовые пакеты) с запасным голосом телефона и причиной в журнале, остальные языки — только голос телефона. Строка в OWNER_LOCKS.
- Плеер пишет v2mode:fallback в журнал обращений, когда семья заданий без своего режима (sound_contrast) показана универсальной карточкой.
- Аудит выпущенного курса: sound_contrast 1 → 229 с причиной (своего режима нет ни в 147, ни на HEAD; падения/пустого экрана нет).
- tests/lesson_exit_sheet_contract.test.tsx — сохранение эпизода с progressTargetLanguage (82cfea233).
- docs/work/handover/lv2-missing-word-cards-2026-10-28.md — 84 новых слова без карточки для фабрики/Codex.

## Scope

Тесты, app/learning_v2_direct_session_player_v1.tsx (один эффект), app/lessons_access_diagnostics.ts, docs. Код голосовых пакетов Codex не трогается.

## Architecture

Плеер рендерит роутером режимов только семьи с компонентом; остальные — универсальной карточкой выбора. Журнал — recordSupportDiagnostic.

## Security and privacy

В событии только семья и тип ввода, без данных пользователя.

## Technical debt

229 заданий без своего режима показываются универсальной карточкой — дизайн режима или замена заданий — решение владельца.

## Verification

Точечные тесты (52 зелёных) + тест экрана выхода; разбор синтаксиса.

## Rollback

Revert коммита.
