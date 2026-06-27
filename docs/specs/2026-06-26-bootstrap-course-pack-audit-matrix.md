# Bootstrap And Course Pack Audit Matrix

Date: 2026-06-26
Status: read-only coordination packet

This packet coordinates the next audit sessions before any implementation.

It does not approve production app changes, content generation, Firebase uploads,
course-pack downloads, storage migrations, or Heisenberg/Gustav apply steps.

## 1. Goal

PhraseMan needs a startup and content architecture where:

- the first onboarding screen can speak the user's language when that language is
  available;
- splash duration does not increase by even one second;
- heavy lesson, quiz, plan and generated source-locale content does not inflate
  the initial app bundle;
- each language is isolated by explicit `sourceLocale` and `studyTarget`;
- AI prompts, generated explanations, caches, admin tools and cloud sync cannot
  leak one language into another.

The result of this audit phase is a clear implementation backlog and safe prompts
for parallel sessions. The result is not content generation.

## 2. Non-Negotiable Invariants

1. Splash timing must not increase.
   - Do not add `await` for Firebase, network, manifest, pack download, AI, or
     heavy file load before first reveal.
   - `nativeSplashCanHide` must not depend on `packReady`, `manifestReady`,
     `downloadReady`, `networkReady`, or remote config.

2. Bootstrap is tiny and local.
   - Bootstrap may use synchronous device-locale detection.
   - Bootstrap may piggyback on storage reads that already happen during startup.
   - Bootstrap may fall back immediately.
   - Bootstrap must not block on remote content.

3. Existing onboarding remains the onboarding.
   - Bootstrap should feed onboarding with an initial language.
   - Bootstrap should not replace the onboarding flow.

4. Language dimensions are separate.
   - `bootstrapLocale`: minimal language for first local screens.
   - `interfaceLang`: full UI language actually enabled for the app.
   - `sourceLocale`: language used to teach/explain.
   - `studyTarget`: language the user learns.
   - No new code or prompt should use generic `lang` if it really means one of
     the above.

5. No silent wrong-language fallback.
   - Unknown AI output language must reject or use a deterministic safe fallback.
   - Generated user-visible text must not silently fall back to `ru` or `en`.
   - Production course packs must not contain `needs-review` text or fallback
     text copied from another locale.

6. Initial bundle contains only starter material.
   - Allowed: app shell, tiny onboarding/bootstrap copy, language picker labels,
     offline/download/error copy, required legal/paywall shell copy if needed.
   - Not allowed: full lesson banks for every source locale, quiz banks for every
     source locale, personal plan content for every pack, or large generated maps
     that can be loaded after course selection.

7. Audit sessions are read-only.
   - Do not edit app/runtime code.
   - Do not run apply, repair-apply, generation, upload, migration, snapshot
     update, or broad destructive scripts.
   - If a session writes a report, it must write only under `docs/reports/`,
     `docs/pipelines/`, or an ignored/temp audit folder.

## 3. Known Baseline From Initial Audit

Startup and onboarding:

- `SplashScreen.preventAutoHideAsync()` is in `app/_layout.tsx`.
- Native splash currently hides when `ready && (effectiveShowOnboarding ||
  isBanned || firstContentReady)`.
- Onboarding visibility is decided from `onboarding_done`.
- `components/onboarding.tsx` currently detects device locale internally with
  `Intl.DateTimeFormat().resolvedOptions().locale`.

Language registries:

- `constants/i18n.ts` lists registered interface/source locales.
- production-ready interface languages are gated; currently `ru` and `uk` are
  the stable store-release base.
- `app/source_locales.ts` includes Heisenberg batch source locales:
  `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`.
- `app/study_target.ts` separates `StudyTarget` from source locale, but current
  production source-locale handling is still mostly `ru` and `uk`.

Bundle pressure:

- `app/plan_content_registry.ts` statically imports multiple large plan-content
  files.
- `app/quiz_phrases_loader.ts` intentionally bundles quiz pools.
- generated source-locale payloads and generated audio URL maps are large enough
  to require separate bundle decisions.

Content delivery:

- `app/content_delivery_migration.ts` is a local schema/session-key migration.
  It is not a runtime course-pack downloader.
- Media streaming/caching patterns already exist for audio/assets, but structured
  course-pack delivery needs its own manifest, cache and integrity rules.

AI and generator safety:

- Gustav brain gate currently passes for its own contract, but production apply
  remains blocked.
- Gustav docs already require `sourceLocale` and `studyTarget` separation.
- Some Cloud Function surfaces still need special attention for unknown-language
  fallback, stale cache, and Latin-script language confusion.
- Existing plan-content schema historically allowed non-Russian locales to fall
  back to Russian. That must be treated as legacy behavior, not a future
  production-pack rule.

## 4. Audit Workstreams

### 4.1 Master Architecture Session

Purpose:

- own final vocabulary and boundaries;
- merge all other reports;
- decide which changes become P0/P1/P2 implementation work.

Must answer:

- What is the exact contract between `bootstrapLocale`, `interfaceLang`,
  `sourceLocale` and `studyTarget`?
- Which startup values may be resolved before first reveal without adding time?
- What is the smallest local bootstrap string set?
- What cannot be allowed to block splash?
- What is the minimum viable `CoursePackManifest`?

Report verdict:

- `PASS`: architecture is clear enough for implementation planning.
- `HOLD`: missing data from another stream.
- `BLOCK`: an invariant conflict was found.

### 4.2 Bootstrap / Onboarding Session

Scope:

- `app/_layout.tsx`
- `components/onboarding.tsx`
- `components/LangContext.tsx`
- `constants/i18n.ts`
- startup storage reads that already happen before `setReady(true)`

Must answer:

- Where can `bootstrapLocale` be resolved without adding a blocking await?
- Which current onboarding text appears before user language choice?
- Which text keys must exist in the tiny starter bundle?
- Can onboarding accept `initialBootstrapLang` or context without changing its
  behavioral flow?
- How do we avoid flicker if stored language resolves after sync fallback?

Forbidden:

- do not add pack download before onboarding;
- do not make splash wait for Firebase;
- do not expand full UI readiness just because bootstrap labels exist.

Acceptance:

- proposed plan preserves current splash hide condition;
- no new remote startup dependency;
- no change that would delete onboarding steps.

### 4.3 Bundle / Content Payload Session

Scope:

- heavy imports under `app/`;
- lesson data, quiz data, plan content, generated maps;
- `app.json` bundled asset patterns;
- existing media streaming/caching patterns.

Must answer:

- Which files are the first bundle-removal candidates?
- Which imports force large data into the initial bundle?
- Which data can be chunked by `studyTarget/sourceLocale`?
- Which data is required offline before course selection?
- Which data can be kept bundled temporarily until pack loader exists?

Forbidden:

- do not remove content;
- do not convert runtime imports yet;
- do not change asset patterns.

Acceptance:

- report includes a prioritized extraction list;
- each candidate has owner surface, loader callsites and risk level.

### 4.4 Storage / Cloud Sync Session

Scope:

- `app/target_storage_keys.ts`
- `app/cloud_sync.ts`
- target-aware helpers;
- legacy keys such as lesson progress, trainer, quizzes, exams, flashcards,
  achievements and personal practice.

Must answer:

- Which keys are global?
- Which are `sourceLocale` scoped?
- Which are `studyTarget` scoped?
- Which require both `sourceLocale` and `studyTarget`?
- Which legacy English keys must migrate to `studyTarget=en`?
- Can cloud restore ever hydrate French or future target progress from legacy
  English keys?

Forbidden:

- do not run migrations;
- do not edit cloud sync;
- do not write repair scripts.

Acceptance:

- every high-risk key class gets an action:
  `keep_global`, `map_to_source_locale`, `map_to_study_target`,
  `map_to_source_and_target`, `legacy_en_only`, `block_unknown`.

### 4.5 AI Gates / Prompt Surfaces Session

Scope:

- `functions/src/ai_language_contract.ts`
- explain phrase/choice/quiz;
- mistake explain;
- compass;
- premium dialog;
- weekly review;
- stats insights;
- any client cache that stores generated visible text.

Must answer:

- Which AI surfaces already reject wrong-language output before return?
- Which surfaces still silently fallback on unknown language?
- Which caches are keyed by language contract and current locale?
- Which prompt families need separate prompt packs per source/study target?
- Which Latin-script wrong-language tests are missing?

Forbidden:

- do not alter prompts;
- do not deploy functions;
- do not change billing or cache behavior.

Acceptance:

- report lists every AI surface as `safe`, `needs hardening`, or `blocked`;
- report includes required tests for wrong-language Latin-script cases.

### 4.6 Heisenberg Session

Scope:

- `docs/HEISENBERG_LOCALIZATION_PIPELINE.md`
- `docs/heisenberg/`
- `scripts/heisenberg_pipeline.cjs`
- `scripts/heisenberg_preflight.ts`
- `scripts/heisenberg_ui_locale_audit.ts`
- plan content locale gates and repair packets.

Must answer:

- What does Heisenberg currently generate or audit?
- Which outputs are app-bundled today?
- Which outputs should become source-locale course-pack artifacts later?
- Which Heisenberg commands are audit-only and safe?
- Which commands apply/repair and must be forbidden during audit?

Forbidden:

- do not run repair apply;
- do not generate new language content;
- do not overwrite plan content files.

Acceptance:

- report gives a new Heisenberg contract:
  generate isolated source-locale artifacts, manifest, gates and evidence before
  any app apply.

### 4.7 Gustav Session

Scope:

- `docs/gustav/GUSTAV_BRAIN.md`
- `docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md`
- `docs/gustav/GUSTAV_TARGET_STORAGE_PLAN.md`
- `docs/gustav/GUSTAV_CLOUD_SYNC_IMPACT_PLAN.md`
- `docs/gustav/GUSTAV_AI_PROMPT_PORTING_CONTRACT.md`
- current Gustav run/reviewer package summaries.

Must answer:

- What can Gustav generate now, and what remains app-activation blocked?
- Which target-language artifacts must be course-pack artifacts instead of app
  bundle files?
- How does Gustav prove a lesson is not a literal translation?
- Which trusted-source evidence is required before content creation?
- Which reviewer gates must pass before a target pack can become downloadable?

Forbidden:

- do not generate new target content;
- do not import reviewer decisions;
- do not apply to product files.

Acceptance:

- report updates Gustav's future contract for downloadable target packs and
  source-locale explanations.

### 4.8 QA / Acceptance Session

Scope:

- tests and gate design only;
- no broad test suite execution unless explicitly approved later.

Must answer:

- How do we prove splash timing is not longer?
- How do we prove onboarding is never blank offline?
- How do we prove pack selection does not mix languages?
- How do we prove bundle size does not grow when adding a language?
- How do we prove AI wrong-language output cannot reach a live user?

Forbidden:

- do not update snapshots;
- do not write source fixtures;
- do not run broad suites as a habit.

Acceptance:

- report contains a focused gate list, test names, and what each gate proves.

## 5. Required Report Format For Every Session

Each session should return a concise report with this shape:

```text
Verdict: PASS | HOLD | BLOCK
Scope:
Files inspected:
Facts found:
Risks:
Required changes:
Required tests/gates:
Open questions:
Do not touch:
Suggested next owner:
```

Rules:

- facts must cite exact files;
- risks must distinguish confirmed facts from assumptions;
- do not paste huge code blocks;
- no implementation patches;
- if a session finds an urgent blocker, it should stop and report instead of
  trying to fix it.

## 6. Copy-Paste Prompts For Parallel Sessions

### 6.1 Bootstrap / Onboarding Audit Prompt

```text
Ты работаешь в C:\appsprojects\phraseman. Режим строго READ-ONLY.

Задача: провести аудит startup/onboarding/bootstrap locale без правок кода.

Главный инвариант: splash screen не должен стать дольше ни на секунду. Нельзя предлагать Firebase/network/manifest/course-pack/AI ожидание перед первым reveal.

Проверь:
- app/_layout.tsx
- components/onboarding.tsx
- components/LangContext.tsx
- constants/i18n.ts
- существующие storage reads до setReady(true)

Ответь:
1. Где сейчас решается ready/showOnboarding/native splash hide?
2. Где сейчас определяется язык onboarding?
3. Как добавить bootstrapLocale так, чтобы не добавить новый blocking await?
4. Какие строки нужны в tiny starter bundle для первого onboarding/no-internet/download screens?
5. Какие места нельзя трогать, чтобы не сломать onboarding flow?

Ничего не меняй. Не применяй патчи. Не запускай broad tests. Итог выдай в формате:
Verdict, Files inspected, Facts, Risks, Required changes, Required tests/gates, Do not touch.
```

### 6.2 Bundle / Content Payload Audit Prompt

```text
Ты работаешь в C:\appsprojects\phraseman. Режим строго READ-ONLY.

Задача: найти, что раздувает initial bundle и что надо вынести в downloadable course packs после выбора sourceLocale + studyTarget.

Проверь:
- app/plan_content_registry.ts
- app/plan_content_*.ts
- app/quiz_phrases_loader.ts
- app/quiz_data.ts
- app/quiz_source_locale_payloads.ts
- app/lesson_data_all.ts
- app/lesson_data_* и generated locale payloads
- generated audio/image URL maps
- app.json asset bundle patterns

Инварианты:
- не удалять контент;
- не менять импорты;
- не предлагать скачивание до onboarding;
- стартовый bundle должен содержать только tiny bootstrap/onboarding shell.

Ответь:
1. Топ bundle offenders по размеру и статическим импортам.
2. Какие файлы должны стать course-pack artifacts первыми.
3. Какие callsites зависят от sync bundled data.
4. Что временно оставить bundled, чтобы не ломать runtime.
5. Какой pack manifest нужен для каждого типа данных.

Ничего не меняй. Итог выдай в формате:
Verdict, Files inspected, Facts, Risks, Prioritized extraction list, Required loader changes, Tests/gates.
```

### 6.3 Storage / Cloud Sync Audit Prompt

```text
Ты работаешь в C:\appsprojects\phraseman. Режим строго READ-ONLY.

Задача: проверить, где прогресс/кэш/облако могут смешать sourceLocale и studyTarget.

Проверь:
- app/target_storage_keys.ts
- app/cloud_sync.ts
- app/study_target.ts
- app/study_target_lang_dev.ts
- app/trainer_store.ts
- lesson/exam/quiz/flashcard/personal-practice storage helpers
- docs/gustav/GUSTAV_TARGET_STORAGE_PLAN.md
- docs/gustav/GUSTAV_CLOUD_SYNC_IMPACT_PLAN.md

Инварианты:
- legacy English progress может мигрировать только в studyTarget=en;
- French/future target не может получать legacy English progress;
- interface language/app_lang не должен менять studyTarget;
- не запускать миграции.

Ответь:
1. Какие keys global/sourceLocale/studyTarget/source+target.
2. Какие legacy keys опасны.
3. Что уже target-aware.
4. Где cloud restore может смешать targets.
5. Какие migrations/tests нужны позже.

Ничего не меняй. Итог выдай в формате:
Verdict, Files inspected, Key classification, Risks, Required changes, Required cloud restore tests, Do not touch.
```

### 6.4 AI Gates / Prompt Audit Prompt

```text
Ты работаешь в C:\appsprojects\phraseman. Режим строго READ-ONLY.

Задача: проверить все AI prompt/output/cache surfaces на языковую изоляцию.

Проверь:
- functions/src/ai_language_contract.ts
- functions/src/ai_language_gate.ts
- functions/src/explain_phrase.ts
- functions/src/explain_choice.ts
- functions/src/explain_quiz.ts
- functions/src/compass.ts
- functions/src/mistake_explain.ts
- functions/src/premium_dialog.ts
- functions/src/weekly_review.ts
- functions/src/stats_insights.ts
- client caches for generated visible text
- docs/gustav/GUSTAV_AI_PROMPT_PORTING_CONTRACT.md

Инварианты:
- unknown language не должен silent fallback в ru/en;
- rejected generated text не должен доходить до live user;
- prompt packs должны иметь sourceLocale, studyTarget, aiOutputLang, bridgeLang где нужно;
- Latin-script wrong-language tests обязательны.

Ответь:
1. Какие surfaces safe.
2. Какие surfaces нуждаются в hardening.
3. Где cache key не включает нужный language dimension.
4. Где prompt language resolver может смешать языки.
5. Какие tests/gates добавить.

Ничего не меняй. Не деплой functions. Итог выдай в формате:
Verdict, Files inspected, Surface table, Risks, Required changes, Required tests/gates.
```

### 6.5 Heisenberg Audit Prompt

```text
Ты работаешь в C:\appsprojects\phraseman. Режим строго READ-ONLY.

Задача: понять текущий Heisenberg pipeline и как изменить его правила под downloadable source-locale packs.

Проверь:
- docs/HEISENBERG_LOCALIZATION_PIPELINE.md
- docs/heisenberg/
- scripts/heisenberg_pipeline.cjs
- scripts/heisenberg_preflight.ts
- scripts/heisenberg_ui_locale_audit.ts
- scripts/heisenberg_plan_content_repair_packets.ts
- scripts/heisenberg_apply_plan_content_repairs.ts
- app/plan_content_locale_gate.ts
- package.json heisenberg scripts

Инварианты:
- не запускать apply/repair-apply;
- не генерировать новый контент;
- Heisenberg не должен писать будущие большие локали напрямую в app bundle без pack architecture;
- sourceLocale не является studyTarget.

Ответь:
1. Что Heisenberg сейчас делает.
2. Какие команды audit-only safe, а какие forbidden для audit.
3. Какие outputs app-bundled today.
4. Какой новый contract нужен: isolated source-locale artifact + manifest + gates.
5. Какие gates должны блокировать copied/fallback/wrong-language text.

Ничего не меняй. Итог выдай в формате:
Verdict, Files inspected, Current pipeline, Forbidden commands, Required contract changes, Tests/gates.
```

### 6.6 Gustav Audit Prompt

```text
Ты работаешь в C:\appsprojects\phraseman. Режим строго READ-ONLY.

Задача: проверить Gustav pipeline с точки зрения downloadable target-language packs и уникальных уроков, а не тупого перевода.

Проверь:
- docs/gustav/GUSTAV_BRAIN.md
- docs/gustav/GUSTAV_BRAIN_TO_100_PLAN.md
- docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md
- docs/gustav/GUSTAV_TARGET_STORAGE_PLAN.md
- docs/gustav/GUSTAV_CLOUD_SYNC_IMPACT_PLAN.md
- docs/gustav/GUSTAV_AI_PROMPT_PORTING_CONTRACT.md
- docs/gustav/GUSTAV_ADMIN_TARGET_SYNC_CONTRACT.md
- latest Gustav algorithm audit summaries
- scripts/gustav_brain_gate.mjs

Инварианты:
- не генерировать новый target content;
- не применять reviewer decisions;
- не писать product files;
- каждый studyTarget имеет собственный контейнер;
- уроки должны быть language-native/adapted, not direct translation;
- trusted source evidence обязателен перед генерацией.

Ответь:
1. Что Gustav уже готов делать.
2. Что всё ещё blocks app activation/app apply.
3. Как Gustav должен выпускать downloadable target packs.
4. Как доказывать уникальность уроков под язык.
5. Какие reviewer/source/gate artifacts обязательны перед generation.

Можно запустить только read-only brain gate, если нужно. Ничего не меняй в app/functions/scripts.
Итог выдай в формате:
Verdict, Files inspected, Current readiness, Pack contract changes, Generation blockers, Required gates.
```

### 6.7 QA / Acceptance Audit Prompt

```text
Ты работаешь в C:\appsprojects\phraseman. Режим строго READ-ONLY.

Задача: составить gate/test plan для bootstrap locale + downloadable course packs.

Не реализуй тесты. Не запускай broad suites. Не обновляй snapshots.

Проверь:
- package.json test scripts
- existing focused tests around plan content, language gates, storage, cloud sync
- app/_layout.tsx startup flow
- onboarding flow
- docs/gustav and docs/heisenberg contracts

Инварианты:
- splash timing must not increase;
- onboarding never blank offline;
- no language mixing across sourceLocale/studyTarget/interfaceLang;
- no generated wrong-language AI output reaches user;
- adding a language does not inflate initial bundle.

Ответь:
1. Какие focused tests/gates нужны для P0 bootstrap.
2. Какие gates нужны для course-pack manifest/download/cache.
3. Как измерять bundle growth.
4. Как проверять cloud restore separation.
5. Как проверять AI wrong-language rejection.

Ничего не меняй. Итог выдай в формате:
Verdict, Files inspected, Gate list, Proposed test names, What each gate proves, Risks.
```

## 7. Merge Order

1. Run the Bootstrap, Bundle, Storage/Cloud, AI Gates, Heisenberg, Gustav and QA
   sessions as read-only audits.
2. Master session merges results into a single implementation spec.
3. Only after the merged spec is approved:
   - implement P0 bootstrap locale without splash delay;
   - add focused timing/language tests;
   - design course-pack manifest and loader;
   - move the first heavy content family behind the loader;
   - update Heisenberg/Gustav generation contracts.

## 8. First Implementation Backlog After Audit Approval

This backlog is intentionally not approved yet.

P0:

- create explicit `bootstrapLocale` resolver;
- wire initial bootstrap language into onboarding without new startup wait;
- add guard that splash hide condition is not tied to remote pack readiness;
- add focused startup language tests.

P1:

- define `CoursePackManifest` and pack identity:
  `studyTarget/sourceLocale/schema/version/hash`;
- define pack cache states and no-internet UI states;
- add read-only loader skeleton behind feature flag.

P2:

- extract one heavy, low-risk content family into a pilot pack;
- verify bundle reduction or no growth;
- add manifest integrity test.

P3:

- update Heisenberg and Gustav contracts so future generation writes isolated
  pack artifacts first, not production app files.

P4:

- expand packs gradually and only with language isolation gates passing.
