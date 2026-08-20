# Learning V2 Lesson 1 Sessions 11–56 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Без переписывания одобренных первых десяти сессий перенести их в production source и дописать сессии 11–56 урока 1 для восьми локалей, строго раскрывая настоящее `to be` по утверждённой карте.

**Architecture:** Каждая сессия остаётся самостоятельным source-файлом и отдельным phrase-файлом, а `authored_sessions_v1.ts` является единственным упорядоченным registry. Работа идёт семью bounded пакетами: импорт 1–10, затем главы 11–16, 17–24, 25–32, 33–40, 41–48 и 49–56; auto gate, интерактивный макет и независимые reviews выдают PASS только exact fingerprint каждой сессии.

**Tech Stack:** TypeScript content sources, Jest contract tests, Node quality-gate scripts, standalone HTML/JavaScript review mock, canonical SHA-256 fingerprints.

---

## Неподвижные входы

- Owner-approved candidate 1–10: `.superpowers/brainstorm/871-1787210859/content/lesson1-first-ten-strict-gated-candidate-data-v2.js`.
- SHA-256: `746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09`.
- Карта 1–56: `modules/learning-v2/content/source/episode_01_session_map_v1.ts`.
- Style Bible: `docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md`.
- Визуальный renderer: отдельный план `2026-08-20-learning-v2-intro-reader-a.md`.
- Локали: `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`; каждая версия пишется самостоятельно и не объясняет английский через русский.

В каждой сессии: три страницы `concept → formula → trap`, 15 английских высказываний, 15 локализованных meanings/explanations на каждой локали, разбор каждого слова, ровно пять уникальных дистракторов с причиной, 14–18 interactions по `SessionKind`.

## Общий файловый шаблон главы

Для каждого `NN` создаются:

- `modules/learning-v2/content/source/episode_01_session_NN_v1.ts` — title, summary, goal, 3 intro pages × 8 locales, semantic runs и связь с phrases.
- `modules/learning-v2/content/source/episode_01_session_NN_phrases_v1.ts` — 15 фраз, 8 locale details, word drills и features.
- `tests/learning_v2_episode_01_session_NN_source.test.ts` — coordinate, scope, counts, unique ids, locale completeness и gate result.

Каждая глава дополнительно получает:

- `.superpowers/brainstorm/871-1787210859/content/lesson1-chapter-XX-YY-review.html` — все интро, фразы, объяснения и кликабельные задания.
- `.superpowers/brainstorm/871-1787210859/content/lesson1-chapter-XX-YY-review-data.js` — только authoring candidate, без secrets/network.
- `qa-artifacts/learning-v2-lesson1/chapter-XX-YY-gate.txt` — короткий воспроизводимый отчёт.

### Task 1: Побайтово перенести owner-approved 1–10

**Files:**
- Create: `scripts/import_learning_v2_first_ten_candidate.mjs`
- Modify: source-файлы строк 01–10 из точной матрицы путей в Appendix A
- Modify: phrase-файлы строк 01–10 из точной матрицы путей в Appendix A
- Modify: `modules/learning-v2/content/source/authored_sessions_v1.ts`
- Test: `scripts/learning_v2_first_ten_candidate_gate.mjs`
- Test: `tests/learning_v2_episode_01_to_be_only.test.ts`
- Test: `tests/learning_v2_intro_contract.test.ts`

- [ ] **Step 1: Написать RED fingerprint/import test** — loader читает candidate, проверяет фиксированный SHA и сравнивает нормализованный production projection каждой сессии с candidate без изменения текста.

```js
const APPROVED_SHA = "746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09";
if (sha256(candidateRaw) !== APPROVED_SHA) throw new Error("approved_candidate_sha_mismatch");
if (canonicalJson(projectProductionFirstTen()) !== canonicalJson(projectCandidateFirstTen())) {
  throw new Error("approved_first_ten_projection_mismatch");
}
```

- [ ] **Step 2: Запустить RED**

```powershell
node scripts/learning_v2_first_ten_candidate_gate.mjs
npx jest --runTestsByPath tests/learning_v2_episode_01_to_be_only.test.ts tests/learning_v2_intro_contract.test.ts --no-cache --runInBand
```

Expected before import: candidate AUTO PASS, production comparison HOLD; старые production S06–S10 выходят за утверждённую first-ten map.

- [ ] **Step 3: Реализовать importer как явную maintenance-команду**. Default режим только пишет diff/report в `.codex-tmp`; `--apply` разрешён именно этим task packet и генерирует TypeScript через deterministic escaping/formatting. Текст candidate не редактируется и не «улучшается».

- [ ] **Step 4: Запустить `--apply` один раз**, затем повторить SHA/projection test. Semantic runs добавляются только как безынформационная разметка: их concatenation обязана равняться исходному body.

- [ ] **Step 5: Проверить первые десять**

```powershell
node scripts/learning_v2_first_ten_candidate_gate.mjs
npx jest --runTestsByPath tests/learning_v2_episode_01_session_01_source.test.ts tests/learning_v2_episode_01_session_02_source.test.ts tests/learning_v2_episode_01_session_03_source.test.ts tests/learning_v2_episode_01_session_04_source.test.ts tests/learning_v2_episode_01_session_05_source.test.ts tests/learning_v2_episode_01_session_06_source.test.ts tests/learning_v2_episode_01_session_07_source.test.ts tests/learning_v2_episode_01_session_08_source.test.ts tests/learning_v2_episode_01_session_09_source.test.ts tests/learning_v2_episode_01_session_10_source.test.ts tests/learning_v2_episode_01_to_be_only.test.ts tests/learning_v2_intro_contract.test.ts --no-cache --runInBand
```

Expected: 10 production sources совпадают с approved projection; 240 intro pages и 150 unique phrases; вопросы и he/she/it/we/they отсутствуют в S01–S10.

- [ ] **Step 6: Не выдавать review receipts автоматически**. Owner approval фиксирует текст, но production PASS остаётся HOLD до независимых intro, phrase и eight-locale reviews.

- [ ] **Step 7: Commit**

```powershell
git add -- scripts/import_learning_v2_first_ten_candidate.mjs modules/learning-v2/content/source/episode_01_session_0*_v1.ts modules/learning-v2/content/source/episode_01_session_10_v1.ts modules/learning-v2/content/source/episode_01_session_0*_phrases_v1.ts modules/learning-v2/content/source/episode_01_session_10_phrases_v1.ts modules/learning-v2/content/source/authored_sessions_v1.ts tests/learning_v2_episode_01_* tests/learning_v2_intro_contract.test.ts
git commit -m "feat(learning-v2): import approved lesson 1 sessions 1 to 10"
```

### Task 2: Сделать переиспользуемый chapter gate и полный review mock

**Files:**
- Create: `scripts/learning_v2_lesson1_chapter_gate.mjs`
- Create: `scripts/build_learning_v2_lesson1_review_mock.mjs`
- Create: `tests/learning_v2_lesson1_chapter_gate.test.ts`

- [ ] **Step 1: RED tests** требуют: непрерывные ordinals, map equality, 3 intro pages, 8 explicit locales, 15 phrases, unique phrase ids/text inside the session, every word with 5 unique wrong distractors, no banned/meta copy, no Russian-reference outside `ru`, semantic concatenation equality и no unintroduced grammar.

- [ ] **Step 2: Реализовать gate с режимом `--from NN --to NN --report path`**. Gate только читает source и пишет отчёт в ignored `qa-artifacts`; tests не меняют source.

- [ ] **Step 3: Реализовать mock builder**: вкладки по ordinals и locales, три полных интро, 15 разворачиваемых фраз, каждый word drill и все причины ошибок, поиск, локальный feedback. Никакой сети, TTS или публикации.

- [ ] **Step 4: Проверить harness на 1–10**

```powershell
node scripts/learning_v2_lesson1_chapter_gate.mjs --from 1 --to 10 --report qa-artifacts/learning-v2-lesson1/chapter-01-10-gate.txt
node scripts/build_learning_v2_lesson1_review_mock.mjs --from 1 --to 10
npx jest --runTestsByPath tests/learning_v2_lesson1_chapter_gate.test.ts --no-cache --runInBand
```

Expected: AUTO PASS, HTML содержит 10 sessions × 8 locales × 3 pages и 150 phrases; status остаётся MANUAL HOLD.

- [ ] **Step 5: Commit**

```powershell
git add -- scripts/learning_v2_lesson1_chapter_gate.mjs scripts/build_learning_v2_lesson1_review_mock.mjs tests/learning_v2_lesson1_chapter_gate.test.ts
git commit -m "feat(learning-v2): add lesson 1 chapter review gate"
```

### Task 3: Написать сессии 11–16 — вопросы I/you

**Files:**
- Create: source, phrase и test-файлы строк 11–16 из точной матрицы путей в Appendix A
- Modify: `modules/learning-v2/content/source/authored_sessions_v1.ts`

- [ ] **Step 1: Сначала tests 11–16** фиксируют карту:

```ts
const expected = [
  [11, "question_inversion", "phrases"],
  [12, null, "phrases"],
  [13, "contraction_youre", "phrases"],
  [14, "place_noun", "words_then_phrases"],
  [15, null, "voice"],
  [16, null, "checkpoint"],
] as const;
```

S14 принимает `in/on/at` только внутри готового complement и запрещает quiz/distractor, где нужно выбирать сам предлог.

- [ ] **Step 2: Написать source/phrases сразу для восьми локалей**. Никаких упоминаний занятий, прошлого или будущего; никаких третьих лиц и plural subjects.

- [ ] **Step 3: Registry 11–16 добавить непрерывно**, без импорта будущих черновиков.

- [ ] **Step 4: Gates и mock**

```powershell
node scripts/learning_v2_lesson1_chapter_gate.mjs --from 11 --to 16 --report qa-artifacts/learning-v2-lesson1/chapter-11-16-gate.txt
node scripts/build_learning_v2_lesson1_review_mock.mjs --from 11 --to 16
npx jest --runTestsByPath tests/learning_v2_episode_01_session_11_source.test.ts tests/learning_v2_episode_01_session_12_source.test.ts tests/learning_v2_episode_01_session_13_source.test.ts tests/learning_v2_episode_01_session_14_source.test.ts tests/learning_v2_episode_01_session_15_source.test.ts tests/learning_v2_episode_01_session_16_source.test.ts tests/learning_v2_episode_01_to_be_only.test.ts --no-cache --runInBand
```

Expected: AUTO PASS 6/6, MANUAL HOLD until separate reviews.

- [ ] **Step 5: Независимые reviews и receipts**: intro reviewer, другой phrase reviewer, восемь locale decisions. Receipt содержит exact session fingerprint; автор не подписывает собственный текст.

- [ ] **Step 6: Commit только после PASS**: `feat(learning-v2): author lesson 1 sessions 11 to 16`.

### Task 4: Написать сессии 17–24 — he/she/it

**Files:** source, phrases и tests для 17–24; registry; chapter mock/report.

- [ ] **Step 1: RED map**: S17 third-person pronouns/is; S18 negation; S19 inversion; S20 impersonal it/weather; S21 he’s/she’s/it’s; S22 family/my; S23 voice; S24 checkpoint.
- [ ] **Step 2: Author eight locale-native versions and exactly 15 utterances per session**; contractions do not introduce possessive apostrophe semantics.
- [ ] **Step 3: Run chapter gate `--from 17 --to 24`, eight focused source tests and `learning_v2_episode_01_to_be_only.test.ts`.
- [ ] **Step 4: Build full interactive chapter mock, obtain independent intro/phrase/locale receipts, then commit**: `feat(learning-v2): author lesson 1 sessions 17 to 24`.

### Task 5: Написать сессии 25–32 — we/they и полная таблица

**Files:** source, phrases и tests для 25–32; registry; chapter mock/report.

- [ ] **Step 1: RED map**: we; they/plural nouns; negatives; questions; we’re/they’re; isn’t/aren’t; full-table recall; checkpoint.
- [ ] **Step 2: Author eight locale-native versions; S31/S32 reuse only already introduced grammar and distinguish deliberate recall from accidental duplicate phrases.
- [ ] **Step 3: Run chapter gate `--from 25 --to 32`, focused source tests, uniqueness/recall test and to-be boundary.
- [ ] **Step 4: Mock + independent receipts + commit**: `feat(learning-v2): author lesson 1 sessions 25 to 32`.

### Task 6: Написать сессии 33–40 — what/where/who/how

**Files:** source, phrases и tests для 33–40; registry; chapter mock/report.

- [ ] **Step 1: RED map**: questions use only inversion with `to be`; auxiliary `do/does` is rejected in target phrases, correct answers and explanations.
- [ ] **Step 2: Author S33 what/this, S34 where, S35 who, S36 how, S37 my/your, S38 his/her, S39 voice, S40 checkpoint for all locales.
- [ ] **Step 3: Run chapter gate `--from 33 --to 40`, focused tests and explicit `no_do_does_question` test.
- [ ] **Step 4: Mock + independent receipts + commit**: `feat(learning-v2): author lesson 1 sessions 33 to 40`.

### Task 7: Написать сессии 41–48 — описание мира

**Files:** source, phrases и tests для 41–48; registry; chapter mock/report.

- [ ] **Step 1: RED map**: objects, colours, size/adjective order, 1–20, age, person description, voice, checkpoint.
- [ ] **Step 2: Author eight locale-native versions. Лексическое расширение не добавляет новый tense, modal, lexical verb pattern или comparative.
- [ ] **Step 3: Run chapter gate `--from 41 --to 48`, focused tests, vocabulary-introduction order и to-be boundary.
- [ ] **Step 4: Mock + independent receipts + commit**: `feat(learning-v2): author lesson 1 sessions 41 to 48`.

### Task 8: Написать сессии 49–56 — связная речь и экзамен

**Files:** source, phrases и tests для 49–56; registry; chapter mock/report.

- [ ] **Step 1: RED map**: this/that distance, whose/possessive apostrophe, possessive pronouns, and/but/too, fixed clarification requests, recall, voice, final checkpoint.
- [ ] **Step 2: Author eight locale-native versions. S52 соединяет только уже знакомые `to be` clauses; S53 допускает только перечисленные fixed expressions и не объявляет их новой продуктивной грамматикой.
- [ ] **Step 3: S56 exam coverage test** требует material from checkpoints 8/16/24/32/40/48 и не содержит unseen word/feature.
- [ ] **Step 4: Run chapter gate `--from 49 --to 56`, focused tests, full map and to-be boundary.
- [ ] **Step 5: Mock + independent receipts + commit**: `feat(learning-v2): author lesson 1 sessions 49 to 56`.

### Task 9: Полный урок — package/readback и owner-visible mock

**Files:**
- Modify: `modules/learning-v2/content/source/authored_sessions_v1.ts`
- Create: `.superpowers/brainstorm/871-1787210859/content/lesson1-all-56-review.html`
- Create: `.superpowers/brainstorm/871-1787210859/content/lesson1-all-56-review-data.js`
- Modify: `tests/learning_v2_authored_sessions_reach_the_player.test.ts`
- Modify: `tests/learning_v2_episode_01_session_map.test.ts`
- Modify: `docs/v2/HANDOVER.md`

- [ ] **Step 1: Registry test** требует ровно ordinals `1..56`, без дырок и duplicate imports.
- [ ] **Step 2: Full gate**

```powershell
node scripts/learning_v2_lesson1_chapter_gate.mjs --from 1 --to 56 --report qa-artifacts/learning-v2-lesson1/full-01-56-gate.txt
npx jest --runTestsByPath tests/learning_v2_authored_sessions_reach_the_player.test.ts tests/learning_v2_episode_01_session_map.test.ts tests/learning_v2_episode_01_to_be_only.test.ts tests/learning_v2_episode_01_no_unintroduced_words.test.ts tests/learning_v2_intro_contract.test.ts tests/learning_v2_content_quality_gate.test.ts tests/learning_v2_content_quality_gate_wiring.test.ts --no-cache --runInBand
```

Expected: 56/56 source coordinates, 840 unique practice slots, 1,344 intro pages across locales, 6,720 localized phrase presentations; 0 auto blockers; 56 exact-fingerprint review receipts.

- [ ] **Step 3: Package/readback** материализует все 56 session packages, serializes canonical children, reads them back, сравнивает fingerprints и доказывает отсутствие fallback locale.

- [ ] **Step 4: Собрать единый интерактивный mock** со всеми 56 tabs, восемью локалями, всеми полными интро, вопросами, 840 фразами и word drills. Показать владельцу; до явного owner approval статус урока остаётся `MANUAL HOLD`.

- [ ] **Step 5: После owner approval обновить handover**, записать hash mock/data, test counts, список receipts, отсутствие TTS/deploy/release и следующий release task packet.

- [ ] **Step 6: Final commit**

```powershell
git add -- modules/learning-v2/content/source tests/learning_v2_* docs/v2/HANDOVER.md
git commit -m "feat(learning-v2): complete lesson 1 authored content"
```

## Критерий PASS

Урок закрыт только при 56 последовательных production sources, 8 explicit locales без fallback, 3 полных эталонных intro на каждую локаль, 15 фраз на session, five distractors на каждое слово, exact-fingerprint независимых reviews, package/readback PASS, отсутствии грамматики за пределами present `to be` и явном одобрении полного интерактивного макета владельцем. TTS, deploy, Firebase write, publication и release остаются отдельными задачами.

## Appendix A: точная матрица файлов сессий

| NN | Source | Phrases | Test |
|---:|---|---|---|
| 01 | `modules/learning-v2/content/source/episode_01_session_01_v1.ts` | `modules/learning-v2/content/source/episode_01_session_01_phrases_v1.ts` | `tests/learning_v2_episode_01_session_01_source.test.ts` |
| 02 | `modules/learning-v2/content/source/episode_01_session_02_v1.ts` | `modules/learning-v2/content/source/episode_01_session_02_phrases_v1.ts` | `tests/learning_v2_episode_01_session_02_source.test.ts` |
| 03 | `modules/learning-v2/content/source/episode_01_session_03_v1.ts` | `modules/learning-v2/content/source/episode_01_session_03_phrases_v1.ts` | `tests/learning_v2_episode_01_session_03_source.test.ts` |
| 04 | `modules/learning-v2/content/source/episode_01_session_04_v1.ts` | `modules/learning-v2/content/source/episode_01_session_04_phrases_v1.ts` | `tests/learning_v2_episode_01_session_04_source.test.ts` |
| 05 | `modules/learning-v2/content/source/episode_01_session_05_v1.ts` | `modules/learning-v2/content/source/episode_01_session_05_phrases_v1.ts` | `tests/learning_v2_episode_01_session_05_source.test.ts` |
| 06 | `modules/learning-v2/content/source/episode_01_session_06_v1.ts` | `modules/learning-v2/content/source/episode_01_session_06_phrases_v1.ts` | `tests/learning_v2_episode_01_session_06_source.test.ts` |
| 07 | `modules/learning-v2/content/source/episode_01_session_07_v1.ts` | `modules/learning-v2/content/source/episode_01_session_07_phrases_v1.ts` | `tests/learning_v2_episode_01_session_07_source.test.ts` |
| 08 | `modules/learning-v2/content/source/episode_01_session_08_v1.ts` | `modules/learning-v2/content/source/episode_01_session_08_phrases_v1.ts` | `tests/learning_v2_episode_01_session_08_source.test.ts` |
| 09 | `modules/learning-v2/content/source/episode_01_session_09_v1.ts` | `modules/learning-v2/content/source/episode_01_session_09_phrases_v1.ts` | `tests/learning_v2_episode_01_session_09_source.test.ts` |
| 10 | `modules/learning-v2/content/source/episode_01_session_10_v1.ts` | `modules/learning-v2/content/source/episode_01_session_10_phrases_v1.ts` | `tests/learning_v2_episode_01_session_10_source.test.ts` |
| 11 | `modules/learning-v2/content/source/episode_01_session_11_v1.ts` | `modules/learning-v2/content/source/episode_01_session_11_phrases_v1.ts` | `tests/learning_v2_episode_01_session_11_source.test.ts` |
| 12 | `modules/learning-v2/content/source/episode_01_session_12_v1.ts` | `modules/learning-v2/content/source/episode_01_session_12_phrases_v1.ts` | `tests/learning_v2_episode_01_session_12_source.test.ts` |
| 13 | `modules/learning-v2/content/source/episode_01_session_13_v1.ts` | `modules/learning-v2/content/source/episode_01_session_13_phrases_v1.ts` | `tests/learning_v2_episode_01_session_13_source.test.ts` |
| 14 | `modules/learning-v2/content/source/episode_01_session_14_v1.ts` | `modules/learning-v2/content/source/episode_01_session_14_phrases_v1.ts` | `tests/learning_v2_episode_01_session_14_source.test.ts` |
| 15 | `modules/learning-v2/content/source/episode_01_session_15_v1.ts` | `modules/learning-v2/content/source/episode_01_session_15_phrases_v1.ts` | `tests/learning_v2_episode_01_session_15_source.test.ts` |
| 16 | `modules/learning-v2/content/source/episode_01_session_16_v1.ts` | `modules/learning-v2/content/source/episode_01_session_16_phrases_v1.ts` | `tests/learning_v2_episode_01_session_16_source.test.ts` |
| 17 | `modules/learning-v2/content/source/episode_01_session_17_v1.ts` | `modules/learning-v2/content/source/episode_01_session_17_phrases_v1.ts` | `tests/learning_v2_episode_01_session_17_source.test.ts` |
| 18 | `modules/learning-v2/content/source/episode_01_session_18_v1.ts` | `modules/learning-v2/content/source/episode_01_session_18_phrases_v1.ts` | `tests/learning_v2_episode_01_session_18_source.test.ts` |
| 19 | `modules/learning-v2/content/source/episode_01_session_19_v1.ts` | `modules/learning-v2/content/source/episode_01_session_19_phrases_v1.ts` | `tests/learning_v2_episode_01_session_19_source.test.ts` |
| 20 | `modules/learning-v2/content/source/episode_01_session_20_v1.ts` | `modules/learning-v2/content/source/episode_01_session_20_phrases_v1.ts` | `tests/learning_v2_episode_01_session_20_source.test.ts` |
| 21 | `modules/learning-v2/content/source/episode_01_session_21_v1.ts` | `modules/learning-v2/content/source/episode_01_session_21_phrases_v1.ts` | `tests/learning_v2_episode_01_session_21_source.test.ts` |
| 22 | `modules/learning-v2/content/source/episode_01_session_22_v1.ts` | `modules/learning-v2/content/source/episode_01_session_22_phrases_v1.ts` | `tests/learning_v2_episode_01_session_22_source.test.ts` |
| 23 | `modules/learning-v2/content/source/episode_01_session_23_v1.ts` | `modules/learning-v2/content/source/episode_01_session_23_phrases_v1.ts` | `tests/learning_v2_episode_01_session_23_source.test.ts` |
| 24 | `modules/learning-v2/content/source/episode_01_session_24_v1.ts` | `modules/learning-v2/content/source/episode_01_session_24_phrases_v1.ts` | `tests/learning_v2_episode_01_session_24_source.test.ts` |
| 25 | `modules/learning-v2/content/source/episode_01_session_25_v1.ts` | `modules/learning-v2/content/source/episode_01_session_25_phrases_v1.ts` | `tests/learning_v2_episode_01_session_25_source.test.ts` |
| 26 | `modules/learning-v2/content/source/episode_01_session_26_v1.ts` | `modules/learning-v2/content/source/episode_01_session_26_phrases_v1.ts` | `tests/learning_v2_episode_01_session_26_source.test.ts` |
| 27 | `modules/learning-v2/content/source/episode_01_session_27_v1.ts` | `modules/learning-v2/content/source/episode_01_session_27_phrases_v1.ts` | `tests/learning_v2_episode_01_session_27_source.test.ts` |
| 28 | `modules/learning-v2/content/source/episode_01_session_28_v1.ts` | `modules/learning-v2/content/source/episode_01_session_28_phrases_v1.ts` | `tests/learning_v2_episode_01_session_28_source.test.ts` |
| 29 | `modules/learning-v2/content/source/episode_01_session_29_v1.ts` | `modules/learning-v2/content/source/episode_01_session_29_phrases_v1.ts` | `tests/learning_v2_episode_01_session_29_source.test.ts` |
| 30 | `modules/learning-v2/content/source/episode_01_session_30_v1.ts` | `modules/learning-v2/content/source/episode_01_session_30_phrases_v1.ts` | `tests/learning_v2_episode_01_session_30_source.test.ts` |
| 31 | `modules/learning-v2/content/source/episode_01_session_31_v1.ts` | `modules/learning-v2/content/source/episode_01_session_31_phrases_v1.ts` | `tests/learning_v2_episode_01_session_31_source.test.ts` |
| 32 | `modules/learning-v2/content/source/episode_01_session_32_v1.ts` | `modules/learning-v2/content/source/episode_01_session_32_phrases_v1.ts` | `tests/learning_v2_episode_01_session_32_source.test.ts` |
| 33 | `modules/learning-v2/content/source/episode_01_session_33_v1.ts` | `modules/learning-v2/content/source/episode_01_session_33_phrases_v1.ts` | `tests/learning_v2_episode_01_session_33_source.test.ts` |
| 34 | `modules/learning-v2/content/source/episode_01_session_34_v1.ts` | `modules/learning-v2/content/source/episode_01_session_34_phrases_v1.ts` | `tests/learning_v2_episode_01_session_34_source.test.ts` |
| 35 | `modules/learning-v2/content/source/episode_01_session_35_v1.ts` | `modules/learning-v2/content/source/episode_01_session_35_phrases_v1.ts` | `tests/learning_v2_episode_01_session_35_source.test.ts` |
| 36 | `modules/learning-v2/content/source/episode_01_session_36_v1.ts` | `modules/learning-v2/content/source/episode_01_session_36_phrases_v1.ts` | `tests/learning_v2_episode_01_session_36_source.test.ts` |
| 37 | `modules/learning-v2/content/source/episode_01_session_37_v1.ts` | `modules/learning-v2/content/source/episode_01_session_37_phrases_v1.ts` | `tests/learning_v2_episode_01_session_37_source.test.ts` |
| 38 | `modules/learning-v2/content/source/episode_01_session_38_v1.ts` | `modules/learning-v2/content/source/episode_01_session_38_phrases_v1.ts` | `tests/learning_v2_episode_01_session_38_source.test.ts` |
| 39 | `modules/learning-v2/content/source/episode_01_session_39_v1.ts` | `modules/learning-v2/content/source/episode_01_session_39_phrases_v1.ts` | `tests/learning_v2_episode_01_session_39_source.test.ts` |
| 40 | `modules/learning-v2/content/source/episode_01_session_40_v1.ts` | `modules/learning-v2/content/source/episode_01_session_40_phrases_v1.ts` | `tests/learning_v2_episode_01_session_40_source.test.ts` |
| 41 | `modules/learning-v2/content/source/episode_01_session_41_v1.ts` | `modules/learning-v2/content/source/episode_01_session_41_phrases_v1.ts` | `tests/learning_v2_episode_01_session_41_source.test.ts` |
| 42 | `modules/learning-v2/content/source/episode_01_session_42_v1.ts` | `modules/learning-v2/content/source/episode_01_session_42_phrases_v1.ts` | `tests/learning_v2_episode_01_session_42_source.test.ts` |
| 43 | `modules/learning-v2/content/source/episode_01_session_43_v1.ts` | `modules/learning-v2/content/source/episode_01_session_43_phrases_v1.ts` | `tests/learning_v2_episode_01_session_43_source.test.ts` |
| 44 | `modules/learning-v2/content/source/episode_01_session_44_v1.ts` | `modules/learning-v2/content/source/episode_01_session_44_phrases_v1.ts` | `tests/learning_v2_episode_01_session_44_source.test.ts` |
| 45 | `modules/learning-v2/content/source/episode_01_session_45_v1.ts` | `modules/learning-v2/content/source/episode_01_session_45_phrases_v1.ts` | `tests/learning_v2_episode_01_session_45_source.test.ts` |
| 46 | `modules/learning-v2/content/source/episode_01_session_46_v1.ts` | `modules/learning-v2/content/source/episode_01_session_46_phrases_v1.ts` | `tests/learning_v2_episode_01_session_46_source.test.ts` |
| 47 | `modules/learning-v2/content/source/episode_01_session_47_v1.ts` | `modules/learning-v2/content/source/episode_01_session_47_phrases_v1.ts` | `tests/learning_v2_episode_01_session_47_source.test.ts` |
| 48 | `modules/learning-v2/content/source/episode_01_session_48_v1.ts` | `modules/learning-v2/content/source/episode_01_session_48_phrases_v1.ts` | `tests/learning_v2_episode_01_session_48_source.test.ts` |
| 49 | `modules/learning-v2/content/source/episode_01_session_49_v1.ts` | `modules/learning-v2/content/source/episode_01_session_49_phrases_v1.ts` | `tests/learning_v2_episode_01_session_49_source.test.ts` |
| 50 | `modules/learning-v2/content/source/episode_01_session_50_v1.ts` | `modules/learning-v2/content/source/episode_01_session_50_phrases_v1.ts` | `tests/learning_v2_episode_01_session_50_source.test.ts` |
| 51 | `modules/learning-v2/content/source/episode_01_session_51_v1.ts` | `modules/learning-v2/content/source/episode_01_session_51_phrases_v1.ts` | `tests/learning_v2_episode_01_session_51_source.test.ts` |
| 52 | `modules/learning-v2/content/source/episode_01_session_52_v1.ts` | `modules/learning-v2/content/source/episode_01_session_52_phrases_v1.ts` | `tests/learning_v2_episode_01_session_52_source.test.ts` |
| 53 | `modules/learning-v2/content/source/episode_01_session_53_v1.ts` | `modules/learning-v2/content/source/episode_01_session_53_phrases_v1.ts` | `tests/learning_v2_episode_01_session_53_source.test.ts` |
| 54 | `modules/learning-v2/content/source/episode_01_session_54_v1.ts` | `modules/learning-v2/content/source/episode_01_session_54_phrases_v1.ts` | `tests/learning_v2_episode_01_session_54_source.test.ts` |
| 55 | `modules/learning-v2/content/source/episode_01_session_55_v1.ts` | `modules/learning-v2/content/source/episode_01_session_55_phrases_v1.ts` | `tests/learning_v2_episode_01_session_55_source.test.ts` |
| 56 | `modules/learning-v2/content/source/episode_01_session_56_v1.ts` | `modules/learning-v2/content/source/episode_01_session_56_phrases_v1.ts` | `tests/learning_v2_episode_01_session_56_source.test.ts` |
