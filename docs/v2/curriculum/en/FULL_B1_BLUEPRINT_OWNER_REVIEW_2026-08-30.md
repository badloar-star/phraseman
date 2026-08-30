# English Learning V2 — Full B1 Blueprint V2 receipt

**Дата:** 2026-08-30  
**Статус:** `OWNER REVIEW REQUIRED`
**Canonical fingerprint:**
`3a4ca1422a6125bb317121c312c0166fdb595ee90111f297c480c8a82b7716e4`

## Что уже материализовано

- 32 урока; каждый урок развивает новую крупную грамматическую систему;
- 155 атомарных grammar operations с prerequisite-safe порядком;
- ацикличный DAG: 155 nodes, 154 edges, 0 cycles, 0 unreachable nodes;
- 224 главы, по 7 глав в каждом уроке;
- 1 792 exact planning packets, по 56 на урок;
- 5 376 intro-функций `concept → formula → trap`;
- 30 464 mode-native activity-плана, по 17 на packet;
- 224 checkpoint packets без новой грамматики и новой scored-лексики;
- 97 grammar-grounded planned lexical senses: каждое слово встречается в
  canonical example своей grammar operation, `hello` и `name` исключены;
- 382 changed-context retrieval edges; в каждом из 32 уроков есть новое
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

Из 97 planned senses только 17 seed-senses уже имеют полностью написанные
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

## Course-start amendment после approval

Fingerprint
`ce1163d02a965e843e56a17c306ff4f14d55033ba21e75d7fbb082557fb61c1a`
был явно утверждён владельцем ответом `давай`, но последующий обязательный
Session 1 preflight обнаружил дефект верхнего плана: первая операция требовала
`am/is/are` и использовала `here/ready` как якобы известные до их введения.
Такой fingerprint переведён в `SUPERSEDED` и больше не разрешает authoring.

В amended body первая операция атомарна: только `I + am`; `here` и `ready`
явно вводятся как два новых manual-localized sense в Session 1. Паттерны
`he/she/it + is`, `you/we/they + are`, выбор полной формы и contractions
получили отдельные prerequisite-safe главы. Новый exact fingerprint выше имеет
`ownerApproval = PENDING` до отдельного явного решения владельца.

## Обязательный маршрут продолжения

1. Прочитать `docs/v2/СТАРТ В2.md` полностью.
2. Прочитать дизайн:
   `docs/superpowers/specs/2026-08-30-learning-v2-english-full-b1-grammar-first-blueprint-design.md`.
3. Прочитать этот receipt и проверить fingerprint.
4. Выполнить `npx tsx scripts/learning_v2_curriculum_blueprint_gate_v2.ts`.
5. Зафиксировать `ON TRACK` или точный `HOLD` до редактирования.
6. Сверить preserved Sessions 1–3 с exact packets последовательно; не менять
   порядок grammar/lexical progression.
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
planned_senses=97 retrieval_edges=382 lessons=32

LEARNING V2 COURSE START PREREQUISITE GATE V2: PASS
Session 1 = I + am; NEW here + ready; later be patterns forbidden

LEARNING V2 CURRICULUM OWNER MAP V2 GATE: PASS
lessons=32 chapters=224 packets=1792
```

Следующий разрешённый этап — owner review exact fingerprint
`3a4ca1422a6125bb317121c312c0166fdb595ee90111f297c480c8a82b7716e4`.
До явного approval learner-facing Session 1 не редактируется. После approval
возобновляется её последовательный conformance-аудит; Session 2 остаётся
замороженной до нуля findings Session 1.
