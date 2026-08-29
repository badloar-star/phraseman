# СТАРТ CURRICULUM BLUEPRINT

> Обязательный маршрут перед исследованием, планированием, написанием,
> изменением или проверкой любой Learning V2 session.

## Статус

- Архитектура: owner-approved 2026-08-28.
- Английский blueprint: материализован, structural gates `PASS`, owner review
  полного fingerprint ожидается.
- Learner-facing Session 4+: `HOLD` до owner-approved полного fingerprint.
- Сессии 1–3: сохранены; после готовности blueprint проходят conformance audit.

## Порядок чтения

1. [`../СТАРТ В2.md`](../СТАРТ%20В2.md) — общие owner contracts.
2. [`ONE_PROMPT_NEW_LANGUAGE_COURSE_START.ru.md`](./ONE_PROMPT_NEW_LANGUAGE_COURSE_START.ru.md)
   — единственная полная стартовая команда для создания нового target-language
   курса; при продолжении существующего курса служит точным stage checklist.
3. [`../LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md`](../LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md)
   — архитектура курса 32 × 56.
4. Target-language `RESEARCH_DOSSIER` и `SOURCE_EVIDENCE_LEDGER`.
5. Target-language `COURSE_OVERVIEW_32_LESSONS`.
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
- exact packet имеет lexical plan: полезные новые senses плюс retrieval либо
  обоснованный `retrieval-only` с точными sense IDs;
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
5. lexical progress либо валидную retrieval-only причину;
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
