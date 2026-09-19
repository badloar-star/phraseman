# СТАРТ DE — немецкий Learning V2

**Статус:** `ON TRACK` для Stage 1 research; learner-facing authoring остаётся
`HOLD` до owner approval полного blueprint fingerprint.  
**Область:** только независимый curriculum-contour немецкого языка. Английские
blueprint, sessions, releases и их authoring-регистр не изменяются.

## Входные данные

- target code: `de`;
- script/direction: Latin, LTR;
- learner-facing locales в этом owner scope: `ru`, `uk`;
- topology: 32 lessons × 7 chapters × 8 sessions = 1 792 session packets;
- допустимый текущий scope: research и curriculum planning; learner-facing
  sessions, аудио, publish и release запрещены.

## Утверждённые решения владельца 2026-09-19

- Production standard: современный надрегиональный `Standarddeutsch` с базовой
  нормой Германии.
- Австрийские и швейцарские стандартные варианты вводятся рецептивно и всегда
  явно маркируются; диалекты не смешиваются с production targets.
- Course boundary: `PRE_A1 / zero beginner → functional B1`, без обещания
  экзаменационной сертификации.
- Learner-facing locales текущего контура: самостоятельные `ru` и `uk`.
- Подход: собственный немецкий grammar-first graph; английский сохраняет только
  topology, quality contracts и коммуникативную оболочку сценариев.
- Перед каждой сессией обязателен свежий независимый `judge_recenter`, который
  не разрешает запуск автора без полного перечитывания применимых инструкций.

## Обязательный маршрут до первой сессии

1. `AGENTS.md` и `docs/v2/СТАРТ В2.md`.
2. `docs/v2/curriculum/ONE_PROMPT_NEW_LANGUAGE_COURSE_START.ru.md` и
   `docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md`.
3. `docs/v2/LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md`,
   `docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md` и применимые text/style,
   lesson-design, orchestration и activity contracts.
4. `docs/v2/curriculum/de/RESEARCH_DOSSIER.ru.md` и
   `SOURCE_EVIDENCE_LEDGER.md` после их создания.
5. Только после полного 32×56 blueprint, всех structural gates, свежего owner
   map и owner approval exact fingerprint — authoring-preflight одной сессии.

## Контур и инварианты

- Артефакты: `docs/v2/curriculum/de/`,
  `modules/learning-v2/curriculum/de/`,
  `content/learning-v2-course/curriculum/de/`,
  `content/learning-v2-course/sessions/de/`,
  `content/learning-v2-course/release/de/`.
- План не переводит English grammar order, lexicon, examples или scenes.
- RU и UK пишутся как самостоятельные редакторские локали, а не машинный
  перевод; их точная область фиксируется в немецком gate, не меняя чужие
  language contracts.
- Каждая будущая learner-facing сессия получает свежие judges, включая
  `judge_recenter`, `judge_progression`, focused gates, release projection и
  пересборку mockup.
- `judge_recenter` работает в двух фазах: `PRE_AUTHOR` проверяет exact reading
  pack и разрешает запуск автора; `POST_AUTHOR` проверяет выполненность каждого
  применимого requirement ID. Receipt привязан к session ID, blueprint
  fingerprint, source SHA-256 и instruction-set digest. Compaction, restart,
  handoff или изменение любого нормативного файла аннулирует receipt.
- Перед authoring необходимо параметризовать English-only scope checks
  `judge_progression` и owner-quality/plan checks для target code `de`, с
  регрессионными тестами на сохранение поведения `en`.

## Текущий следующий шаг

Stage 1 — source-backed German research dossier и evidence ledger. До owner
approval полного 32×56 blueprint learner-facing authoring остаётся `HOLD`.
