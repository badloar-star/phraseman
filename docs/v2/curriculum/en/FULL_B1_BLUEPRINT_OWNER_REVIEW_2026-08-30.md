# English Learning V2 — Full B1 Blueprint V2 receipt

**Дата:** 2026-08-30  
**Статус:** `PENDING OWNER REVIEW`
**Canonical fingerprint:**
`ce1163d02a965e843e56a17c306ff4f14d55033ba21e75d7fbb082557fb61c1a`

## Что уже материализовано

- 32 урока; каждый урок развивает новую крупную грамматическую систему;
- 154 атомарные grammar operations с prerequisite-safe порядком;
- ацикличный DAG: 154 nodes, 153 edges, 0 cycles, 0 unreachable nodes;
- 224 главы, по 7 глав в каждом уроке;
- 1 792 exact planning packets, по 56 на урок;
- 5 376 intro-функций `concept → formula → trap`;
- 30 464 mode-native activity-плана, по 17 на packet;
- 224 checkpoint packets без новой грамматики и новой scored-лексики;
- 96 grammar-grounded planned lexical senses: каждое слово встречается в
  canonical example своей grammar operation, `hello` и `name` исключены;
- 378 changed-context retrieval edges; в каждом из 32 уроков есть новое
  введение либо осмысленное извлечение уже знакомой лексики;
- семантические gates для атомарных вариантов, одного правильного ответа,
  уникальных дистракторов, response-specific feedback, четырёх Speed Match
  pairs, запрета сборки по буквам, audio replay/preload, hold-release speech,
  owner-preview skip, accessibility-equivalent path и non-blocking motion;
- grammar и lexical coverage matrices;
- кликабельный owner map:
  `C:\appsprojects\phraseman\.codex-tmp\learning-v2-curriculum-owner-map\index.html`.

## Что намеренно не считается готовым

Learner-facing тексты интро, exercise prompts, дистракторы, feedback, карточки,
восемь локализаций и audio scripts не создавались массово. Каждый packet имеет
явный статус `PLANNED_NOT_AUTHORED`; это curriculum intent, не готовая сессия.

Из 96 planned senses только 16 seed-senses уже имеют полностью написанные
locale-native определения. Это не blocker blueprint: массово придумывать
карточечные определения для восьми локалей на planning-stage запрещено.
Остальные определения имеют честный статус `REQUIRES_MANUAL_AUTHORING` и будут
написаны последовательно вместе с exact session после утверждения fingerprint.

Старый V1-реестр использован только как словарный candidate pool. Его
scenario-first порядок не наследуется. Gate разрешает кандидат только если
его точная форма уже встречается в canonical example утверждённой V2 grammar
operation; `hello/name`, будущее грамматическое содержание, механическая квота
и машинные определения запрещены.

## Старый approval

Fingerprint
`013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a`
**SUPERSEDED BY OWNER DECISION — FULL B1 GRAMMAR-FIRST REBUILD**. Его старый
`APPROVED` не переносится на новый canonical body.

## Обязательный маршрут продолжения

1. Прочитать `docs/v2/СТАРТ В2.md` полностью.
2. Прочитать дизайн:
   `docs/superpowers/specs/2026-08-30-learning-v2-english-full-b1-grammar-first-blueprint-design.md`.
3. Прочитать этот receipt и проверить fingerprint.
4. Выполнить `npx tsx scripts/learning_v2_curriculum_blueprint_gate_v2.ts`.
5. Зафиксировать `ON TRACK` или точный `HOLD` до редактирования.
6. До owner approval не писать learner-facing content и не менять порядок
   grammar/lexical progression.
7. Пересобрать map:
   `npx tsx scripts/build_learning_v2_curriculum_owner_map_v2.ts`.
8. Выполнить `node tests/learning_v2_curriculum_owner_map_v2_gate.mjs` и focused
   V2 gates.
9. Новый canonical body получает новый fingerprint и снова остаётся `PENDING`.
10. Только владелец может явно утвердить показанный exact fingerprint.

## Последние focused результаты

```text
LEARNING V2 EXACT SESSION PACKETS GATE V2: PASS
packets=1792 intros=5376 practices=30464 checkpoints=224

LEARNING V2 SEMANTIC ALIGNMENT GATE V2: PASS
future_grammar=0 ungrounded_lexicon=0 copied_probes=0

LEARNING V2 LEXICAL PROGRESSION GATE V2: PASS
planned_senses=96 retrieval_edges=378 lessons=32

LEARNING V2 CURRICULUM BLUEPRINT V2 GATE: PASS
scope_findings=0 dag_findings=0 semantic_findings=0 lexical_scope_findings=0

LEARNING V2 CURRICULUM OWNER MAP V2 GATE: PASS
lessons=32 chapters=224 packets=1792
```

`ownerApproval` менять нельзя. Следующее owner decision относится только к
точному fingerprint, показанному в этом receipt и свежем owner map.
