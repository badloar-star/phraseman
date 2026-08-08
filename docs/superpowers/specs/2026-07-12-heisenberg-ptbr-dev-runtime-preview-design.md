# Heisenberg pt-BR Dev Runtime Preview Design

## Goal

Provide a real non-production runtime path for validating Brazilian Portuguese as the source/interface language used to learn English, while keeping production activation impossible until the user explicitly authorizes it.

## Scope

This design covers only the `pt-BR` UI runtime-preview boundary and its Heisenberg evidence. It does not add `pt-BR` to the production-ready locale list, expose it in store builds, publish content, or approve the language for release.

## Chosen approach

Add a dev-only preview gate protected by both conditions:

1. the JavaScript runtime is a development build (`__DEV__ === true`);
2. a dedicated Heisenberg preview flag is enabled explicitly.

Both conditions are mandatory. The preview flag defaults to `false`. Production locale readiness remains controlled exclusively by the existing production-ready list, which stays `ru` and `uk`.

## Runtime boundaries

- Production enablement and preview enablement remain separate concepts and separate functions.
- Existing production callers continue to use the production enablement rule.
- Only the explicit Heisenberg preview path may accept `pt-BR` while it is not production-ready.
- Persisted preview locale state must be ignored when either `__DEV__` or the preview flag is false.
- Store language options remain unchanged; no unavailable locale becomes selectable in a production build.
- `studyTarget` remains `en`; preview selection changes only the source/interface locale.
- Closing the preview flag restores the current RU/UK behavior without migration.

## Components

### Preview policy

A small pure policy function decides whether a locale may be used for Heisenberg preview. Its inputs are explicit (`locale`, development state, preview flag), so tests do not depend on mutable global environment state.

The preview policy has a separate API from production locale enablement. Ordinary `isInterfaceLangEnabled`, `coerceInterfaceLang`, `setLang`, and production `stringsForLang` behavior remains unchanged. Preview uses explicitly named functions such as `isHeisenbergPreviewLangEnabled`, `coerceHeisenbergPreviewLang`, and `setPreviewLang`; production callers must not import or call them.

### LangContext integration

LangContext may accept and hydrate `pt-BR` only through the dedicated `setPreviewLang` path and preview policy. Ordinary `setLang` and production coercion remain unchanged even while the preview flag is enabled. Preview state uses a separate development-only storage key; it must never overwrite the production app-language key. Invalid, disabled, store-build, or stale preview values resolve to the existing safe fallback.

The single interactive entrypoint is the existing `app/settings_language.tsx` language screen in a development build. When the dedicated flag is enabled, its otherwise locked `pt-BR` roadmap option invokes `setPreviewLang`. No other screen, bootstrap flow, device-locale resolver, or ordinary language selector may enable preview. Store builds continue filtering the option through the existing store-release behavior.

### Locale helpers

Helpers used on the preview path must select `pt-BR` copy when it exists. Legacy helpers that only support RU/UK/ES must not silently return Russian during a successful preview. Unsupported helper surfaces must be reported as runtime blockers rather than treated as ready.

### Runtime evidence

Heisenberg produces a scoped runtime-check artifact for `sourceLocale=pt-BR`, `studyTarget=en`, and `surface=ui-locale`. The artifact lists every checked runtime path/helper and binds the result to the current source hashes and the exact focused-test command, exit status, and run timestamp. A single representative string is not sufficient. Initial required paths are `constants/i18n.ts` (`T` and `triLang`), `components/LangContext.tsx` (preview bundle selection and hydration boundary), and `app/settings_language.tsx` (the sole preview entrypoint). A PASS requires:

- locale registered;
- preview enabled only under both development gates;
- target copy selected;
- no Russian fallback on the checked runtime paths;
- English study target preserved;
- focused tests passed;
- production activation not performed.

If any scoped UI runtime path is not covered by the named checks, evidence remains HOLD. Each later helper/surface added to the scope must add its concrete path and verification before the scoped artifact can pass.

This artifact feeds the existing scoped runtime-evidence gate. Even a successful preview keeps `productionReleaseReady=false` and `activationApproved=false`.

## Failure handling

- Any missing gate, unsupported locale helper, Russian fallback, target mismatch, stale preview state, or failed focused test produces HOLD.
- No partial runtime evidence is promoted to PASS.
- The preview mechanism must not alter source-language content, Firestore, remote config, release flags, or production locale readiness.

## Verification

Tests must prove:

- `pt-BR` is rejected when either development mode or the preview flag is false;
- `pt-BR` is accepted when both are true;
- the ordinary production `setLang`, selector, coercion, and visibility rules still reject or hide `pt-BR` even when the preview flag is true;
- RU/UK production behavior is unchanged;
- production-ready locales remain exactly the existing approved set;
- stale persisted `pt-BR` preview state is ignored outside preview and in store/release builds;
- representative `pt-BR` UI copy is selected without Russian fallback;
- `studyTarget=en` is preserved;
- runtime-check evidence remains non-production and fail-closed;
- existing Heisenberg review, apply, readiness, and release gates still pass.

## Non-goals

- Production activation of `pt-BR`.
- Changing store-visible language options.
- Marking 251 UI strings semantically approved without independent review decisions.
- Completing lessons, quizzes, training content, or other non-UI surfaces in this increment.
- Adding a generic feature-flag platform.
