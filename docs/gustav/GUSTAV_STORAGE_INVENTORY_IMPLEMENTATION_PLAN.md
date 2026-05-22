# GUSTAV Storage Inventory Implementation Plan

Status: draft contract v0

Purpose: define the first executable storage inventory pass for Gustav.

This plan authorizes a read-only scanner only. It does not authorize app code edits, storage migrations or French content generation.

## 1. Core rule

The storage inventory scanner may read PhraseMan files and write reports only under:

```text
docs/gustav/runs/<runId>/inputs/
docs/gustav/runs/<runId>/audits/
```

It must not edit:

- `app/*`;
- `components/*`;
- `constants/*`;
- `hooks/*`;
- `scripts/*` except its own Gustav scanner file;
- `tests/*`;
- `docs/heisenberg/*`;
- storage migration code.

## 2. First script

Script:

```text
scripts/gustav_storage_inventory.ts
```

Command:

```text
npx tsx scripts/gustav_storage_inventory.ts --run docs/gustav/runs/<runId>
```

Outputs:

```text
docs/gustav/runs/<runId>/inputs/storage_key_inventory.json
docs/gustav/runs/<runId>/audits/storage_inventory_report.md
```

## 3. Scan scope

Initial scan roots:

- `app`;
- `components`;
- `constants`;
- `hooks`;
- `scripts`;
- `tests`.

Excluded:

- `node_modules`;
- `.git`;
- `ios`;
- `android`;
- `docs/gustav/runs`;
- `docs/heisenberg`.

## 4. Detection targets

The scanner should detect:

- `AsyncStorage.getItem`;
- `AsyncStorage.setItem`;
- `AsyncStorage.removeItem`;
- `AsyncStorage.multiGet`;
- `AsyncStorage.multiSet`;
- `AsyncStorage.multiRemove`;
- string constants ending in `KEY`;
- template literal key patterns;
- `SYNC_KEYS` from `app/cloud_sync.ts`.

## 5. Record shape

```ts
type GustavStorageKeyRecord = {
  key?: string;
  keyPattern?: string;
  keyExpression?: string;
  sourcePath: string;
  line: number;
  operation: 'get' | 'set' | 'remove' | 'multiGet' | 'multiSet' | 'multiRemove' | 'cloudSync' | 'constant' | 'unknown';
  scope: 'global' | 'source_locale' | 'study_target' | 'source_locale_and_study_target' | 'legacy_english' | 'dev_only' | 'admin_or_qa' | 'unknown';
  learningState: boolean;
  targetNamespaceRequired: boolean;
  cloudSyncKey: boolean;
  risk: 'low' | 'medium' | 'high' | 'blocker';
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
};
```

## 6. Classification rules v0

Blocker/high-risk target-sensitive learning keys:

- `trainer_store_v1`;
- `lesson*_progress`;
- `lesson*_best_score`;
- `lesson*_pass_count`;
- `unlocked_lessons`;
- `level_exam_*`;
- flashcards that store learned/saved content;
- quiz/exam learning history;
- mistake/active recall/trainer queues.

Source-locale keys:

- `lang`;
- `app_lang`.

Dev/admin keys:

- `dev_study_target_lang`;
- keys beginning with `tester_`;
- QA/E2E keys.

Global/product keys:

- premium/account identity;
- haptics/theme/basic app settings;
- energy/economy keys unless tied to target content;
- league/friends/profile keys unless tied to target content.

Unknown:

- dynamic key expressions;
- variable keys not resolvable to string constants;
- content learning keys whose scope cannot be decided.

## 7. Gate behavior

The first scanner may return `HOLD`.

It should not block just because some keys are unknown, but it must mark:

- unknown learning keys;
- target-sensitive legacy English keys;
- cloud sync target-risk keys.

French generation remains blocked until storage unknowns are resolved.

## 8. Known limitations of first pass

The first pass is heuristic:

- it is not a full TypeScript AST analysis;
- it may miss computed array keys;
- it may over-report test keys;
- it may classify some product-economy keys conservatively.

This is acceptable for the first run because the goal is to expose risk, not approve integration.

