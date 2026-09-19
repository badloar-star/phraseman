# German Learning V2 — Stage 0 task packet

## Scope

Создать самостоятельный grammar-first course blueprint для немецкого `de`:
32 lessons, 224 chapters и 1 792 exact session packets. Текущий этап создаёт
только маршрут и research admission; он не пишет learner-facing sessions.

## Confirmed inputs

- Target language/code: German / `de`.
- Script/direction: Latin / LTR.
- Owner-requested learner-facing locales: RU + UK.
- Entry hypothesis: PRE_A1 / zero beginner.
- Exit hypothesis: strong functional A1 with selected early-A2 tasks; это не
  обещание экзаменационной квалификации.

## Non-goals

- Любой English source, session, release, registry или mockup.
- Массовый learner-facing authoring, prompts, options, distractors, feedback,
  definitions, translations, audio, TTS, deploy, publish или release.
- Диалектный курс, смешение национальных норм или неявный выбор варианта.

## Required artifacts after admission

- `RESEARCH_DOSSIER.ru.md` и `SOURCE_EVIDENCE_LEDGER.md`.
- 32 lesson boundaries; grammar, lexical, outcome, pronunciation and
  prohibited-leakage registries.
- prerequisite DAG, lexical retrieval graph, 224 chapter outcomes,
  1 792 packets, coverage matrices, machine gates and canonical owner map.
- candidate fingerprint and `ownerApproval: PENDING` receipt.

## Owner decisions confirmed 2026-09-19

- Modern supraregional `Standarddeutsch`, Germany-based baseline.
- Austrian and Swiss standard variants are marked receptive alternatives.
- Exit boundary: functional B1.
- Architecture: native German grammar-first graph inside the common 32×56
  topology; no translation or cloning of English progression.
- A fresh `judge_recenter` must gate every individual session before authoring
  and audit the authored bytes afterwards.

## Evidence and gate requirements

- Research claims use an evidence ledger with source, exact claim, limitation,
  confidence and unresolved product decision.
- Every packet has exactly one new grammar operation or explicit review set,
  valid prerequisites, measurable delta and a lexical plan.
- Every non-checkpoint packet introduces 1–5 new useful senses; checkpoint
  packets introduce none and cite precise retrieval senses.
- All German gates must be target-scoped. No check may silently fall back to
  English paths or omit `judge_progression` for `de`.
- The author cannot run unless `judge_recenter.PRE_AUTHOR = ON_TRACK` for the
  exact session, blueprint fingerprint and instruction digest.
- Every normative requirement has a stable requirement ID. The recenter receipt
  reports `PASS | HOLD | NOT_APPLICABLE` with evidence for every applicable ID;
  missing IDs, stale hashes or an unproved `NOT_APPLICABLE` produce `HOLD`.
- `judge_recenter.POST_AUTHOR = PASS` is mandatory before the ordinary content
  judges and release projection can establish readiness.

## Status

`ON TRACK`: Stage 1 research is authorized. Learner-facing authoring is `HOLD`
until the complete blueprint fingerprint is explicitly approved.
