# German Learning V2 grammar-first course — design

**Date:** 2026-09-19  
**Status:** owner-approved design; implementation planning pending written-spec
review  
**Target:** `de`, modern supraregional `Standarddeutsch`, Germany baseline  
**Boundary:** `PRE_A1 → functional B1`  
**Learner locales:** `ru`, `uk`

## 1. Goal

Create an independent German Learning V2 course with exactly 32 lessons, 224
chapters and 1,792 exact session packets. The course reuses the English
factory's topology, evidence states, release discipline and quality contracts,
but not its grammar order, lexical sequence, examples, scenes or learner copy.

The planning pipeline ends at a complete owner map and candidate fingerprint.
Learner-facing authoring begins only after the owner explicitly approves that
exact fingerprint, then proceeds one session at a time in RU and UK.

## 2. Product decisions

- Production targets use modern supraregional Standard German with a Germany
  baseline.
- Austrian and Swiss standard variants may appear as clearly marked receptive
  alternatives. Dialects are outside productive scope unless separately
  approved.
- The course begins at zero knowledge and targets functional B1. It does not
  promise an external exam certificate.
- RU and UK are independent editorial locales. UK is not a mechanical
  translation of RU.
- The 32 scenario identities remain a communicative shell, but grammar,
  lexicon, pronunciation, pragmatics and transfer risks are researched and
  sequenced specifically for German.

## 3. Canonical architecture

```text
German research dossier + evidence ledger
  → grammar / lexical / pronunciation / outcome registries
  → prerequisite DAG + lexical retrieval graph
  → 32 lesson boundaries
  → 224 chapter outcomes
  → 1,792 exact session packets
  → coverage matrices + deterministic gates
  → owner map + candidate fingerprint
  → explicit owner approval
  → one-session RU+UK authoring pipeline
```

Canonical paths:

- `docs/v2/СТАРТ de.md`;
- `docs/v2/curriculum/de/**`;
- `modules/learning-v2/curriculum/de/**`;
- `content/learning-v2-course/curriculum/de/**`;
- `content/learning-v2-course/sessions/de/**`;
- `content/learning-v2-course/release/de/**`;
- `.codex-tmp/learning-v2-curriculum-owner-map-de/index.html`.

The German contour must never write English curriculum, sessions, release,
native manifest or English authoring-registry files.

## 4. German-native curriculum model

The research stage determines the prerequisite-safe order. The structural
inventory must cover at least writing and capitalization, noun gender and
articles, case, agreement, personal and address pronouns, finite-verb position,
V2/V1/verb-final patterns, negation with `nicht` and `kein`, sentence brackets,
separable verbs, modal verbs, tense/aspect choices required for functional B1,
subordination, adjective inflection, preposition-case government, register,
word formation and pronunciation risks. This list is an investigation scope,
not a pre-approved teaching order.

Every claim is linked to an evidence-ledger entry containing source identity,
the exact supported claim, limitation, confidence and product decision. The
preferred authorities are CEFR/Goethe for functional outcomes and recognized
German linguistic/dictionary/corpus authorities for structural, lexical and
usage claims.

## 5. Blueprint contracts

Every session packet records:

- exactly one new micro-grammar operation or a non-empty approved review set;
- prerequisite objectives and prohibited future constructs;
- a measurable learning delta;
- 1–5 genuinely new useful lexical senses and bounded retrieval senses under
  the latest owner rule, including checkpoint/voice/review sessions;
- unique first introduction plus later-session, later-lesson and delayed
  retrieval edges;
- German phrase frames and two to four natural German examples;
- allowed lexical slots and forbidden surface forms;
- required mode families selected by the learning action;
- support trajectory, independent probe and delayed probes;
- source-evidence references.

The blueprint contains curriculum intent only. It does not bulk-generate final
intros, practice prompts, options, distractors, feedback, definitions, audio
scripts or RU/UK learner copy.

## 6. Mandatory `judge_recenter`

### 6.1 Purpose

`judge_recenter` is a fresh independent admission judge for every individual
session. It prevents an author from relying on chat memory, a previous summary
or a pre-compaction context. It is mandatory for German from Session 1.

### 6.2 Instruction pack

The pipeline assembles the instruction pack directly from disk immediately
before authoring. It includes:

- the three mandatory Desktop Codex start files;
- repository `AGENTS.md` and `docs/v2/СТАРТ В2.md`;
- `docs/v2/СТАРТ de.md`;
- factory Constitution, work method, main requirement, current owner verdicts,
  current exemplars and applicable prompts;
- curriculum blueprint/start/recenter contracts;
- German dossier, evidence ledger, approved blueprint fingerprint, exact
  lesson/chapter/session packet and the exact previous lesson range;
- current release checklist and target-scoped gate contract.

No hand-written summary may replace these bytes.

### 6.3 Requirement manifest

Applicable normative clauses are represented by stable requirement IDs in a
versioned German requirement manifest. Each entry stores source path, section,
short rule, scope and severity. The manifest itself stores the exact SHA-256 of
every source document. A source-byte change makes the manifest and all existing
receipts stale until the requirement set is reconciled.

This creates two independent guarantees:

1. the full authoritative files are injected from disk and reread;
2. every applicable requirement ID receives explicit evidence rather than a
   generic statement that the instructions were read.

### 6.4 PRE_AUTHOR phase

Before the author model can be invoked, a fresh-context judge returns a signed
structured receipt containing:

- target code and exact session ID;
- blueprint and exact-packet fingerprints;
- instruction-set digest and per-document SHA-256 values;
- prior released range and comparison boundary;
- every requirement ID with `PASS`, `HOLD` or justified `NOT_APPLICABLE`;
- grammar/review focus, new senses, scene, modes, prohibited constructs and
  required evidence;
- final verdict `ON_TRACK` or `HOLD`.

Missing requirements, unknown hashes, a stale owner map, unexplained conflicts,
future grammar or a generic `NOT_APPLICABLE` result produce `HOLD`. The author
process must not start on `HOLD`.

### 6.5 POST_AUTHOR phase

The same role is re-created with a clean context after the draft is written. It
receives the exact instruction pack, PRE_AUTHOR receipt and authored bytes. It
checks every applicable requirement ID against concrete quotations or machine
facts. Its `POST_AUTHOR = PASS` is required before learner, pedagogy, nonsense,
reader, taste/humor, progression and locale judges can establish readiness.

### 6.6 RELEASE_PROJECTION phase

После PASS всех обычных content и locale judges строятся target-scoped German
release package и German owner mockup. Третий fresh-context guardian получает
exact PRE_AUTHOR и POST_AUTHOR receipts, content-judge receipt bundle, RU+UK
bytes, release bytes, mockup bytes и manifests. Он возвращает PASS только если:

- `applicability` равен `release`;
- все обязательные judge receipts свежие и привязаны к тем же RU+UK bytes;
- release и mockup находятся только в German namespaces;
- source, release и mockup fingerprints совпадают с manifests;
- `releaseAttemptId` — новый UUID, которого нет в durable attempt history;
- mockup projection содержит обе локали, exact session, blueprint, packet,
  release fingerprint и generator version.

Missing/stale mockup, English path/bytes, reused attempt ID, skipped judge или
несовпадающий digest дают `HOLD`. Без PASS нельзя публиковать release, считать
сессию готовой или открывать следующий exact packet.

### 6.7 Freshness and compaction safety

The receipt is bound to the exact session, source SHA-256, blueprint
fingerprint, exact-packet fingerprint, requirement-manifest digest and
instruction-set digest. It is invalid after:

- context compaction, restart or handoff;
- any instruction, prompt, owner verdict or blueprint change;
- any change to the authored source;
- owner-map or previous-release fingerprint drift;
- reuse for another session.

The pipeline rebuilds the pack and reruns PRE_AUTHOR instead of attempting to
trust a prior conversation.

## 7. One-session authoring lifecycle

1. Target-scoped preflight opens only the next exact packet.
2. `judge_recenter.PRE_AUTHOR` returns `ON_TRACK` for current bytes.
3. The RU master is written under the approved packet and instruction pack.
4. `judge_recenter.POST_AUTHOR` returns `PASS` against every requirement ID.
5. Fresh `judge_learner`, `judge_pedagogy`, `judge_nonsense`, `judge_reader`,
   `judge_taste` and `judge_progression` run on the current source.
6. The independent UK version is written and receives locale review.
7. Machine facts, source hashes and all verdict freshness checks pass.
8. `release/de/...` and the German owner mock are rebuilt from exact RU+UK.
9. `judge_recenter.RELEASE_PROJECTION` validates all judge receipts, a fresh
   one-time release attempt and exact source/release/mock fingerprints.
10. Source, release and mock fingerprints match in the accepted receipt.
11. Only then can the next exact packet be opened.

A first failed authoring attempt stops the sequence and triggers a root-cause
audit before another session is attempted.

## 8. Target isolation changes

The existing factory accepts a language segment in paths, but some newer
checks are English-scoped. Before German Session 1, target-aware contracts must
replace those assumptions:

- `judge_progression` is mandatory for all German sessions;
- exact curriculum checks read `de`, never fall back to `en`;
- owner-quality and freshness checks use the target's policy and paths;
- language-name and isolation guards recognize `de`;
- RU+UK requirements are target-scoped and do not weaken other courses;
- regression tests prove unchanged English behavior and German fail-closed
  behavior.

Shared code may be parameterized, but English canonical content and receipts
remain untouched.

## 9. Gates

Planning gates cover:

- research dossier and evidence-ledger completeness;
- exact counts `32 / 224 / 1,792`;
- acyclic prerequisites, no future references and full reachability;
- one operation or explicit review set per packet;
- intro/practice/probe alignment contract;
- unique lexical first introduction and complete retrieval edges;
- useful lexical progress in every session;
- measurable review delta and no duplicated evidence prompt;
- two to four natural, unique, boundary-safe German examples;
- no English-copy blueprint and no bulk learner-facing bank;
- coverage matrices without orphan constructs, senses or outcomes;
- fresh owner map and candidate fingerprint.

Authoring gates additionally cover `judge_recenter` freshness and full
requirement coverage, all content judges, RU+UK locale quality, release/mock
freshness and exact source projection.

## 10. Error handling

- Unknown or conflicting language evidence: `HOLD` with the exact decision
  branch named.
- Missing or stale recenter requirement: author process is not invoked.
- Source changed after any receipt: affected receipts are invalid.
- Gate reads an English path for a German session: isolation failure and
  `HOLD`.
- A judge cites another session: receipt rejected.
- A beautiful mock without content PASS: remains `HOLD`.
- Audio/TTS, publishing and deployment remain out of scope without separate
  owner authorization.

## 11. Verification strategy

Implementation follows RED → GREEN with narrow deterministic tests. Required
evidence includes negative fixtures for stale instruction hashes, omitted
requirement IDs, receipt reuse across sessions, post-author source mutation,
English fallback, unjustified `NOT_APPLICABLE` and compaction/restart
invalidation. Positive fixtures prove a fresh German packet can reach the
author and that existing English readiness behavior is unchanged.

The complete blueprint then receives an independent linguistic review,
spec-conformance review, adversarial review and owner fingerprint approval.

## 12. Acceptance criteria

The design is implemented when:

- the German research and blueprint pipeline can materialize and validate all
  1,792 packets without English content reuse;
- the German owner map exactly matches the canonical fingerprint;
- no learner-facing session can start before blueprint approval;
- no German author can run without a fresh `judge_recenter.PRE_AUTHOR` receipt;
- no authored German session can pass without `judge_recenter.POST_AUTHOR` and
  all ordinary judges;
- no German release or next session can pass without a fresh
  `judge_recenter.RELEASE_PROJECTION`, exact German owner mockup and one-time
  release-attempt receipt;
- compaction, restart, handoff or any normative-byte change invalidates prior
  admission;
- RU and UK are independently reviewed;
- English content and readiness results remain unchanged.

## 13. Explicit non-goals

- No mass learner-facing generation.
- No audio/TTS generation.
- No release, deploy, Firebase write or production configuration change.
- No edits to English canonical curriculum, sessions or release.
- No dialect-production curriculum.
