# Bundle Extraction Prep Inventory

Date: 2026-06-26
Status: report-only Phase 3 prep

This pass does not move content, upload packs, download packs, change Firebase,
or change runtime loaders. It establishes the first bundle boundary facts after
P1 `CoursePackManifest` and loader-readiness skeleton.

## Verified Startup Boundary

Checked startup/onboarding files:

- `app/_layout.tsx`
- `components/onboarding.tsx`
- `components/LangContext.tsx`

Current fact:

- no direct imports of `plan_content_*`, `quiz_data`,
  `quiz_source_locale_payloads`, `lesson_data*`, `lesson_intro_screens*`,
  `lesson_words_source_locales`, `quiz_thematic_packs`, or course-pack runtime
  modules were found in those startup files.

Guard added:

- `tests/bootstrap_bundle_boundary_contract.test.ts`

## Top Bundle Offenders From Targeted Inventory

Targeted command shape:

```powershell
Get-ChildItem app -File -Filter <known-heavy-family>
```

Top files by current byte size:

| File | Bytes | Lines |
| --- | ---: | ---: |
| `app/plan_content_impuls.ts` | 5,016,951 | 28,155 |
| `app/plan_content_gavan.ts` | 4,634,619 | 25,421 |
| `app/plan_content_mitap.ts` | 4,369,528 | 25,863 |
| `app/plan_content_voyazh.ts` | 3,000,926 | 16,869 |
| `app/plan_content_echo.ts` | 2,921,077 | 16,782 |
| `app/quiz_data.ts` | 2,836,161 | 25,543 |
| `app/quiz_source_locale_payloads.ts` | 2,102,672 | 32,280 |
| `app/lesson_data_1_8_phrases_es.gen.ts` | 893,279 | 8,316 |
| `app/lesson_data_25_32.ts` | 688,575 | 9,167 |
| `app/lesson_intro_screens_en_17_32.ts` | 598,069 | 11,314 |
| `app/lesson_data_9_16_phrases_es.gen.ts` | 558,835 | 8,327 |
| `app/lesson_data_17_24.ts` | 537,925 | 8,047 |
| `app/lesson_data_1_8_phrases_source.ts` | 282,841 | 5,395 |
| `app/lesson_words_source_locales.ts` | 159,829 | 6,835 |
| `app/lesson_intro_screens_es_l2.ts` | 150,625 | 1,402 |

## Candidate Extraction Order

Recommended order stays conservative:

1. `plan_content_*`
   - largest family;
   - authored/static content;
   - good candidate for manifest/index split before user-visible runtime swap.
2. `quiz_source_locale_payloads.ts`
   - source-locale expansion surface;
   - high language-isolation value;
   - should become a source-locale pack after quiz loader states exist.
3. `quiz_data.ts`
   - large core quiz pool;
   - current runtime expects sync data through `app/quiz_phrases_loader.ts`;
   - requires careful offline fallback and first-question loading state.
4. `lesson_data_*` and `lesson_intro_screens*`
   - heavily connected to lesson runtime;
   - higher regression risk;
   - should wait until lower-risk pilot proves loader/cache states.
5. generated audio metadata maps
   - inspect in a later pass;
   - likely needs asset/download and integrity policy.

## Required Loader Work Before Moving Content

Before any extraction:

- surface-specific loader states must exist: missing, downloading, ready,
  corrupt, stale, offline fallback;
- bundled compatibility fallback must remain until a surface has parity checks;
- pack keys must include `studyTarget/sourceLocale/surface/schemaVersion/contentVersion/hash`;
- manifest hash and byte size must validate;
- source-locale and study-target selection must be explicit before pack
  readiness resolves;
- startup and onboarding must remain free of heavy content and pack-loader
  imports.

## Risks

- `plan_content_*` is the biggest byte offender but may have hidden personal-plan
  runtime assumptions.
- `quiz_data.ts` is large, but first-question UX can regress if moved before
  async state design.
- `quiz_source_locale_payloads.ts` is language-sensitive and must not fallback
  across source locales.
- Lesson data and intro screens are connected to progress, lesson cache and
  target-specific lesson titles; extraction needs a larger rollback plan.

## Next Pass Plan

Objective:

Map `plan_content_*` as the first pilot extraction candidate without moving it.

Read first:

- `app/plan_content_registry.ts`
- `app/plan_content_runtime_adapter.ts`
- `app/plan_content_schema.ts`
- `app/plan_content_locale_gate.ts`
- `app/personal_plan_catalog.ts`
- `app/personal_plan_recommendation.ts`
- `tests/plan_content_runtime_adapter.test.ts`

Expected output:

- callsite map for plan content;
- proposed `surface='plan_content'` manifest shape;
- missing/ready/offline fallback states for personal plan content;
- static guard that future plan-content locale growth cannot be imported by
  startup;
- no source content movement yet.

Stop conditions:

- do not edit or split the five large `plan_content_*` files yet;
- do not upload to Firebase;
- do not add runtime downloads;
- do not change onboarding/startup;
- do not generate or apply new language content.
