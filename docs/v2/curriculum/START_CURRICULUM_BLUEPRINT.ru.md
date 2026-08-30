# СТАРТ CURRICULUM BLUEPRINT

> Обязательный маршрут перед исследованием, планированием, написанием,
> изменением или проверкой любой Learning V2 session.

## Статус

### CURRENT V2 AUTHORITY — 2026-08-30

- Full B1 grammar-first canonical fingerprint:
  `b98f142c5bb3fab63153a68e38e1f875a4139d11fb7de5a29dd26de46e0554f8`.
- Approval: `OWNER REVIEW REQUIRED`. Ранее утверждённый `ce1163d…c1a`
  superseded после Session 1 preflight: он использовал `am/is/are` и
  `here/ready` до prerequisite-safe введения.
- Counts: `32 lessons / 224 chapters / 1 792 exact planning packets / 155
  grammar operations / 5 376 intro plans / 30 464 activity plans`.
- Lexical-density rewrite: `146 grammar-grounded planned senses / 638
  changed-context retrieval edges` на текущем промежуточном body. Каждая из
  1 568 не-контрольных сессий обязана иметь 1–5 новых senses; 224 checkpoints
  обязаны иметь 0. Пока 1 479 lexical-density findings не закрыты, aggregate
  gate остаётся `HOLD`.
  17 seed definitions локализованы полностью, остальные определения имеют
  `REQUIRES_MANUAL_AUTHORING` и пишутся последовательно после approval.
- Старый fingerprint `013e7420…c1695a` — `SUPERSEDED`; старый approval не
  переносится на новый canonical body.
- Точный свежий receipt:
  [`en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md`](./en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md).
- Gate: `npx tsx scripts/learning_v2_curriculum_blueprint_gate_v2.ts`.
- Owner map: `.codex-tmp/learning-v2-curriculum-owner-map/index.html`, build
  `npx tsx scripts/build_learning_v2_curriculum_owner_map_v2.ts`.

Этот блок имеет приоритет над историческим статусом ниже. Следующее законное
действие — показать владельцу новый exact fingerprint и получить явный
approval. До него Session 1 не редактируется; Session 2 также заморожена.

- Архитектура: owner-approved 2026-08-28.
- Английский blueprint: материализован, structural gates `PASS`, fingerprint
  `013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a`
  явно утверждён владельцем 2026-08-30.
- Learner-facing Session 4+: `HOLD`.
- Сессии 1–3: свежий conformance audit завершён с `14 findings`; старые
  learner sources не соответствуют новым exact packets, а packets Sessions 1
  и 2 не связывают заявленные новые слова `hello` / `name` со своими
  canonical examples.
- Следующий bounded scope: сначала owner decision о точечной поправке первых
  трёх packets; любое изменение canonical body создаёт новый fingerprint и
  требует нового явного owner approval. До этого learner sources не
  переписываются.

Точный receipt:
[`en/SESSIONS_01_03_CONFORMANCE_AUDIT_2026-08-30.md`](./en/SESSIONS_01_03_CONFORMANCE_AUDIT_2026-08-30.md).

## Порядок чтения

1. [`../СТАРТ В2.md`](../СТАРТ%20В2.md) — общие owner contracts.
2. [`ONE_PROMPT_NEW_LANGUAGE_COURSE_START.ru.md`](./ONE_PROMPT_NEW_LANGUAGE_COURSE_START.ru.md)
   — единственная полная стартовая команда для создания нового target-language
   курса; при продолжении существующего курса служит точным stage checklist.
3. [`../LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md`](../LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md)
   — архитектура курса 32 × 56.
4. Target-language `RESEARCH_DOSSIER` и `SOURCE_EVIDENCE_LEDGER`.
5. Current target-language 32-lesson authority. Для English это
   `en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md` и canonical V2 modules;
   старый `en/COURSE_OVERVIEW_32_LESSONS.ru.md` имеет статус `SUPERSEDED`.
6. Target-language `FULL_COURSE_BLUEPRINT_OWNER_REVIEW` — текущие counts,
   canonical artifacts, candidate fingerprint и owner-approval state.
7. Exact lesson blueprint.
8. Exact session packet.
9. Fresh validation receipt и owner-map fingerprint.
10. Только после этого — применимые Библии learner-facing текста, режимов,
   дистракторов, feedback и локализаций.

Прочитать только общий документ или старую session map недостаточно.

## Непропускаемый порядок создания курса

Любая LLM при создании или продолжении курса проходит этапы строго по порядку:

1. исследует target language и создаёт source evidence ledger;
2. фиксирует честную level/scope boundary;
3. утверждает все 32 scenario lesson boundaries;
4. создаёт grammar operation registry и lexical sense ledger;
5. строит ацикличный prerequisite DAG;
6. расписывает 224 chapter outcomes;
7. расписывает 1 792 exact session packets;
8. для каждого packet фиксирует grammar/review focus, lexical plan,
   `learningDelta`, phrase frames, allowed slots, forbidden forms и 2–4
   canonical target-language examples;
9. строит grammar/lexicon/can-do/retrieval coverage matrices;
10. пересобирает полный owner HTML и проверяет fingerprint;
11. получает owner approval полного blueprint;
12. только затем пишет learner-facing content одной session за раз;
13. после каждой session проходит полный recenter до перехода к следующей.

Этап нельзя считать выполненным по обещанию, старому mockup или количеству
строк. Нужны canonical artifact, focused gate и свежий owner-map receipt.

Для английского текущий обязательный receipt:
[`en/FULL_COURSE_BLUEPRINT_OWNER_REVIEW_2026-08-28.md`](./en/FULL_COURSE_BLUEPRINT_OWNER_REVIEW_2026-08-28.md).
Если counts/fingerprint в нём расходятся с canonical module или owner HTML,
работа немедленно получает `HOLD`; сначала пересобираются receipt и макет.

Blueprint заранее определяет педагогический смысл, но не содержит массово
сгенерированный learner-facing exercise bank. Финальные prompts, distractors,
feedback и восемь локализаций создаются только на последовательном authoring.

## Authoring admission gate

Новая learner-facing сессия допускается к написанию только если одновременно:

- research dossier имеет PASS;
- course blueprint содержит ровно 32 урока;
- выбранный урок содержит ровно 7 глав и 56 session packets;
- exact packet имеет одну новую grammar operation либо явный review set;
- все prerequisites уже объяснены в более ранних packets;
- exact packet имеет lexical plan: Sessions 1–7 главы содержат 1–5 полезных
  новых senses плюс retrieval, Session 8 содержит только точные retrieval IDs;
- review packet фиксирует измеримый `learningDelta`, а не повторяет прежний
  prompt без изменения поддержки, задержки, контекста или output demand;
- exact packet содержит phrase frames, allowed lexical slots, forbidden forms и
  2–4 естественные canonical target-language examples;
- новые lexical senses имеют уникальное first-introduction место;
- intro focus, practice operation и independent probe совпадают;
- owner HTML пересобран и показывает тот же fingerprint;
- текущий blueprint revision подтверждён владельцем.

Любой отсутствующий пункт означает `HOLD`. Автору запрещено достраивать тему,
слова или порядок «по смыслу» во время написания сессии.

## Drift-check

Перед каждым новым session packet и после любого решения владельца проверить:

1. exact packet ID и fingerprint;
2. prerequisite edges;
3. lesson boundary и prohibited constructs;
4. lexical first-introduction и retrieval edges;
5. lexical progress в не-контрольной сессии либо checkpoint без новой лексики;
6. learning delta каждой review session;
7. intro → practice → probe alignment;
8. owner-map freshness.

Результат фиксируется как `ON TRACK` или `HOLD`. `ON TRACK` не является
финальным review/PASS.

## Новый target language

Работа начинается копированием целиком master-prompt из
[`ONE_PROMPT_NEW_LANGUAGE_COURSE_START.ru.md`](./ONE_PROMPT_NEW_LANGUAGE_COURSE_START.ru.md)
и заполнением его входных переменных. Порядок английского нельзя клонировать
или переводить. Сначала создаются:

1. собственный research dossier;
2. structural inventory и prerequisite DAG языка;
3. transfer analysis для всех восьми interface-locales;
4. lexical sense ledger;
5. адаптация 32 scenario lessons;
6. 224 chapter outcomes;
7. 1 792 exact session packets;
8. owner map и owner-approved fingerprint.

До этого learner-facing authoring нового языка запрещён.
