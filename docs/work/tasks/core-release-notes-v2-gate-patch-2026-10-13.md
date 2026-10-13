# Task packet: окно «Что нового» 2.0 — включение одной правкой (патч, не применён)

Governance-ID: TG-F878A0160CBE
Status: Done (патч сохранён, в коде ничего не применено)
Owner: Ядро (сессия 1)
Related: координатор 13.10; вопрос владельцу 15; STORE_RELEASE_NOTES_2_0_DRAFT.md (82d138944); макет docs/design/v2-app/system.html экран 14 (system-011)

## Outcome

Патч docs/phraseman-2.0/patches/RELEASE_NOTES_V2_GATE_2026-10-13.diff:
- configuredV2Release() возвращает { minBuildId, newUserCutoffMs } из двух констант с пометкой «вписать: вопрос 8 / вопрос 15»;
- причина каждого решения пишется в журнал [RELEASE-NOTES-V2];
- заголовок «Шпиль вместо лиги» (как на макете) показывается только для ru/uk и только когда Шпиль реально виден
  (useSpireTabEnabled), иначе прежний «Новый дизайн и темы»;
- тесты: новые пользователи (установка после момента выхода, нет даты установки, онбординг не пройден) окно не видят.

## Scope

In scope: app/release_notes_v2_gate.ts, components/release_notes_v2_copy.ts, components/ReleaseNotesV2Modal.tsx и их тесты —
только внутри патча. Out of scope: применение патча, сторож «монеты и ранг» (решение уже есть), тексты для магазинов.

## Architecture

No architecture change.

## Security and privacy

Не касается данных: читаются прежние локальные ключи (install_date, onboarding_done, отметка закрытия).

## Technical debt

- Макет system-011 пишет «монеты и ранг», а сторож release_notes_v2_no_coin_rank_copy это запрещает — макет привести к коду (Макеты).

## Verification

С наложенным патчем — tests/release_notes_v2_gate.test.ts и три сторожа окна; git apply --check по сохранённому патчу.

## Rollback

git apply -R по патчу.
