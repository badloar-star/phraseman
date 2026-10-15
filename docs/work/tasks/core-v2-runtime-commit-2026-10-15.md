# Task packet: Learning V2 — коммит минимального рантайм-набора s01–s15 и гейты выпуска

Governance-ID: TG-255496F3019A
Governance-ID: TG-98FBEAC5A7EE
Governance-ID: TG-42BAC8CE2D11
Governance-ID: TG-5EF2A317E8D7
Governance-ID: TG-B076662A1147
Governance-ID: TG-36AD1B3B5DA5
Governance-ID: TG-123F2B2FC865
Governance-ID: TG-A592E8835098
Governance-ID: TG-7B2D907CFE7B
Status: In progress
Owner: Ядро (сессия 1)
Related: решения владельца 15.10 ~09:00 (через координатора).
- «Мы коммитим» — минимальный набор a–f;
- «15, как у Codex»;
- «Оба исправления» гейта.

## Outcome

Чистая сборка из HEAD везёт занятия s01–s15 нового курса. Проверки из чистого экспорта HEAD:
- потолок = 15;
- проверка озвучки (audio gate) — PASS;
- проверка паритета (parity gate) — PASS на выпущенных занятиях.

## Scope

In scope, коммит строго по списку `docs/work/tasks/v2-runtime-commit-list-2026-10-15.txt`:
- (a) `generated_release/en/l01/s01…s15`;
- (b) модули `factory_native`;
- (c) потолок;
- (d) озвучка и манифест;
- (e) пропуски озвучки + `released_session_client_v3` — в одном коммите;
- (f) активация;
- квитанции `accepted/…` — если их читает рантайм или гейт;
- `V2_GATE_RELEASED_SCOPE.patch` (`scripts/learning_v2_release_parity_gate.mjs`, `content/learning-v2-course/pipeline/build_release.mjs`);
- исключение для 19 `AUDIO_EVIDENCE_UNVERIFIED` с причиной «одобрено владельцем 15.10».

Out of scope:
- `pipeline/mockup` Codex (кроме `build_release.mjs` по решению владельца);
- `git add -A`;
- файлы, в которые Codex писал за последние 15 минут — откладываются с докладом координатору.

## Architecture

Только добавление готовых файлов Codex в git, без правки их содержимого. Правки гейтов помечены `// зачем: решение владельца 15.10`.

## Security and privacy

Контент курса, персональных данных нет.

## Technical debt

19 звуков без квитанции проверки — исключение до квитанций Codex.

## Verification

- Проверки из чистого экспорта HEAD (`git archive`): потолок, audio gate, parity gate.
- Тесты V2: `--maxWorkers=1`, через слот.

## Rollback

Откат коммитов, тогда потолок вернётся к 0 (курс скрыт).
