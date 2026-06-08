# HANDOVER — Phraseman Personal Plans Rework (2026-06-08)

## ГДЕ МЫ ОСТАНОВИЛИСЬ (ТЕКУЩАЯ ЗАДАЧА — СДЕЛАТЬ ПЕРВОЙ)

**Владелец только что выбрал стиль объяснений: «Микс (образ + пример)».**

Нужно **переписать ВСЕ объяснения** в Day 1 и Day 3 (файл `app/plan_content_voyazh.ts`) в стиле «как для детей / для любой аудитории»:
- Каждое объяснение (`title` + `rule` + `why` + `commonMistake`) — через **образ/метафору + мини-пример «было→стало»**.
- **НИКАКИХ грамматических терминов** (НЕ писать «глагол», «связка», «артикль», «Present Simple», «отрицание»). Заменять на бытовые образы.
- Креативно, разнообразно, очень просто. На 3 языках (ru обязателен; uk, es тоже заполнять).
- Тон: дружелюбный тренер на «ты».

### Эталон стиля (согласован с владельцем) — пример для `don't`:
> **было:** "don't — это «не». В английском «не» живёт отдельным словечком впереди."
> **стало (МИКС образ+пример):** "🚫 don't — это как кнопка «нет»: нажал перед делом — дело отменилось. understand = «понимаю», а don't understand = «не-а, не понимаю». Англичане всегда ставят это «нет» отдельной кнопочкой впереди."

Формула: короткий ОБРАЗ + мини-пример «слово→со словом» + 1 фраза почему/как. Без перегруза.

### ВАЖНЫЕ ОГРАНИЧЕНИЯ ПРИ ПЕРЕПИСЫВАНИИ:
1. **`EXPLANATION_MAX_WORDS = 24`** (в `app/plan_content_schema.ts`) — каждая часть rule/why/commonMistake ≤24 слов (по-русски). Валидатор отбракует длиннее. Если образы не влезают — либо короче, либо подними лимит в схеме (обсуди трейдофф, не молча).
2. **Ровно 5 дистракторов на слово** (уже сделано в обоих днях) — НЕ трогать, валидатор требует ровно 5.
3. После правок ОБЯЗАТЕЛЬНО прогнать: `npx jest --runTestsByPath tests/plan_content_voyazh.test.ts tests/plan_content_schema.test.ts tests/plan_content_runtime_integration.test.ts --no-cache --runInBand` (должно быть зелёным) и `npx tsc --noEmit --pretty false 2>&1 | grep plan_content_voyazh` (пусто = чисто).
4. После переписи — **вывести юзеру в чат полный Day 1** (все фразы/опции/дистракторы/объяснения/теория/словарь) текстом, НЕ документом. Он читает и даёт фидбек. (Так делали для Day 1 и Day 3 раньше.)

---

## ПРАВИЛА КОНТЕНТА (закреплены в памяти + валидаторе)

- **Ровно 5 дистракторов на слово** → всегда 6 вариантов. `WORD_MIN/MAX_DISTRACTORS=5` в `plan_content_schema.ts`. Дистракторы того же класса (POS), правдоподобные.
- **Объяснения максимально просты «как для детей»** — образ+пример, без терминов.
- **Адаптивность к 32 урокам:** фразы дня только из конструкций ≤ gate дня (`plan_lesson_gate.ts: lessonGateForDay`). День 1 = уроки 1-4 (to-be, present-simple), День 3 = уроки 1-9 (+to-have, there-is, prepositions-time). Мягкая (рекомендация, не жёсткий блок).
- **Стиль:** друж. тренер, язык юзера (ru/uk/es), живые разговорные фразы, темы = реальные жизненные ситуации.
- **Без платных сервисов/серверов для speech** — только on-device (expo-speech-recognition уже стоит).
- **Контент рано писать массово** — владелец сказал: дни писать только когда придём к выводу что пора. Сейчас правим только эталоны (Day 1, Day 3) для согласования стиля.

---

## КРИТИЧНЫЙ ИНВАРИАНТ (НЕ СЛОМАТЬ)

Authored-фразы re-key в позиционную схему `${lessonId}_phrase_${N}` внутри `buildGeneratedPlanPhraseLesson()` (`app/personal_plan_phrase_lessons.ts`). Без этого id не совпадут с тем что просит каталог → ВСЕ упражнения дня пустые («задание не открылось»). Залочено тестом `tests/plan_content_runtime_integration.test.ts`. Внутренние id фраз в `plan_content_voyazh.ts` (voyazh_d1_p1) НЕ важны для рантайма — они перекеиваются. Но менять их в эталоне можно свободно.

---

## АРХИТЕКТУРА НОВОГО ПАЙПЛАЙНА (всё построено в этой сессии, работает)

```
plan_content_schema.ts        — контракт дня (PlanContentDay) + валидатор (фразы/слова/POS/дистракторы/intro/словарь)
plan_content_voyazh.ts        — ЭТАЛОННЫЙ контент (Day 1 + Day 3), экспорт VOYAZH_CONTENT_DAYS
plan_content_registry.ts      — реестр authored-дней по 'planId:dayIndex'
plan_content_runtime_adapter.ts — PlanContentDay → рантайм (LessonPhrase + intro screens + vocab cards)
plan_content_gate_check.ts    — мягкая адаптивность (warnings если грамматика выше gate)
plan_content_generation_job.ts — бриф на день для агентов
plan_content_agent_pipeline.ts — контракт пайплайна ролей (писатели/проверяльщики/судья/адверсарный) + код-гейт
lesson_grammar_map.ts         — карта 32 уроков (конструкции, уровень, зависимости)
plan_lesson_gate.ts           — lessonGateForDay, allowedConstructionsForDay, recommendedLessonsForDay
plan_day_lesson_recommendation.ts — «пройди урок X» (баннер в personal_plan.tsx)
plan_week_mode_progression.ts — прогрессия режимов по неделям (НЕ подключена, ждёт решения по рукописным дням)
```

Подключение: `personal_plan_phrase_lessons.ts buildGeneratedPlanPhraseLesson()` предпочитает authored-контент (registry) → adapter → re-key id → fallback на старые шаблоны для ненаписанных дней.

«Мозг» агентов = Claude в сессии (build-time), рантайм LLM не зовёт, контент статичен в бандле.

---

## ЧТО УЖЕ СДЕЛАНО ЗА СЕССИЮ (всё с тестами, tsc мои файлы чисты)

**P0 баги:** POS-цепочка (grammarTag больше не фабрикует verb), статистика планов (registerXP+bumpStatsDaily), uk/es переводы (360 фраз через агента), notifications.ts used-before-declaration.

**A1 произношение:** реальное on-device распознавание (`personal_plan_exercise.tsx` + scorePlanPronunciationTranscript + speechModule). Слушай→скажи→оценка ≥90%.

**Этап 1+3 (адаптивность):** грамматическая карта 32 уроков, gate день→уроки, рекомендация уроков с баннером.

**Контент-пайплайн:** контракт+адаптер+gate+агенты-инфра (см. выше). Эталон Day 1 (Аэропорт) + Day 3 (Багаж/регистрация) — оба проходят валидатор, within gate, рантайм строит все 6 режимов упражнений.

**Теория-под-день (B):** PlanIntroScreen[] в контракте, route `personal_plan_theory`, карточка «Теория дня» на экране плана.

**Статистика (C):** weak spots в stats-экране (`personal_plan_weak_spot_reader.ts`), осколки за день (`personal_plan_day_reward.ts`, ShardSource plan_day_complete +2), XP-леджер за план (`personal_plan_xp_ledger.ts`), сравнение с другими «Ты в топ X%» (`personal_plan_day_comparison.ts`, переиспользует задеплоенный leaderboard, БЕЗ новой Cloud Function) — в баннере «День закрыт».

**Очистка:** снесено ~290 файлов мёртвых лесов (dry_run_harness, authoring/audio/candidate/harbor scaffold в app/ и tools/personal_plan_*).

**Большой аудит выполнен:** 2 агента трейсили рантайм, нашли 1 критический баг (id mismatch) — исправлен и залочен. Все режимы дня проверены: строят реальные items (missing_word 5, choose 5, listen 5+5, pronunciation 4, recall 5).

---

## ЧТО ОСТАЛОСЬ (после текущей правки объяснений)

Из большого аудита всё ценное БЕЗ контента сделано. Остаётся:
- **Написать остальные дни** (A1/A7) — ТОЛЬКО когда владелец скажет «пора». Сейчас рано.
- **Спорное:** таймер/блиц-режим, достижения за план (нужны designed-определения).
- **Этап 2** (прогрессия режимов) — модуль готов (`plan_week_mode_progression.ts`), но НЕ подключён: стрипинг режимов на рукописных днях 1-11 их ломал бы. Ждёт решения владельца «переписать ли все рукописные дни».

Tasks-трекер: см. TaskList (задачи #1-24, большинство completed; pending #4,#9,#13,#14,#15,#16 — частично уже закрыты по факту, проверь актуальность).

---

## БАЗОВЫЕ ФАКТЫ ОКРУЖЕНИЯ
- Рабочая папка: `C:\appsprojects\phraseman` (cd обязателен в Bash перед npx).
- tsc baseline ~28-32 ошибок — ВСЕ pre-existing (flashcards/arena/onboarding) + чужой draft `docs/reports/ai_dialogue_premium_dialog.draft.ts` (параллельная сессия). НИ ОДНОЙ в моих файлах.
- ~124 тест-сьюта baseline-красные (грепы строк контента) — НЕ регрессии.
- git stash ЗАБЛОКИРОВАН глобально — не использовать.
- Идёт несколько параллельных сессий Claude по этому репо — файлы могут меняться между чтениями.
- Память проекта: `C:\Users\badlo\.claude\projects\C--\memory\` (MEMORY.md индекс). Ключевые: phraseman_content_style_rules, phraseman_plan_content_id_contract, phraseman_generator_rewrite, phraseman_no_paid_speech.

## КАК ПРОВЕРЯТЬ (всегда после правок контента)
```
cd /c/appsprojects/phraseman
npx jest --runTestsByPath tests/plan_content_voyazh.test.ts tests/plan_content_schema.test.ts tests/plan_content_runtime_integration.test.ts tests/plan_content_runtime_adapter.test.ts --no-cache --runInBand
npx tsc --noEmit --pretty false 2>&1 | grep -E "plan_content|personal_plan_phrase_lessons"   # пусто = чисто
```
