# GUSTAV Cloud Sync Impact Plan

Status: draft contract v0

Purpose: prevent Firebase/cloud restore from mixing English progress with French or future study targets.

This document is a design and audit contract only. It does not authorize product code changes.

## 1. Core finding

`app/cloud_sync.ts` currently syncs a single flat `SYNC_KEYS` list. That list contains both global product state and target-sensitive learning state.

In a single-target English app this is acceptable. In a multi-target app it is a blocker.

## 2. Cloud sync risk classes

### Global cloud state

Can remain account-level if confirmed by audit:

- identity and profile: `user_name`, avatar, profile card;
- premium and purchases;
- league account state where language content is not embedded;
- energy, gifts, shards and device metadata;
- notification preferences and local UI settings when intentionally synced.

### Target cloud state

Must move under `studyTarget`:

- lesson progress, words, listening and intro state;
- lesson best scores and pass counts;
- `unlocked_lessons`;
- level exams and final certificates;
- trainer, active recall and mistake queues;
- quiz progress and quiz achievements;
- flashcard learning progress and target-specific card libraries;
- diagnostics and My Practice recommendations.

### Source plus target cloud state

Must include both `studyTarget` and `sourceLocale` when explanations, feedback text or localized quiz payloads are stored:

- My Practice feedback history;
- localized hint history;
- generated explanation caches;
- source-language-specific quiz variants.

## 3. Recommended cloud shape

Recommended logical schema:

```text
users/{uid}
  profile/global fields
  progress/global/*
  progress/sourceLocales/{sourceLocale}/*
  progress/targets/{studyTarget}/*
  progress/targets/{studyTarget}/sourceLocales/{sourceLocale}/*
```

Legacy flat cloud fields should be treated as English:

```text
legacy flat progress -> progress/targets/en/*
```

No French bucket may be hydrated from legacy flat English progress.

## 4. Sync key mapping contract

Every current `SYNC_KEYS` entry must receive one of these actions:

```ts
type CloudSyncAction =
  | { action: 'keep_global'; reason: string }
  | { action: 'map_to_target'; targetPath: string; legacyTarget: 'en' }
  | { action: 'map_to_source_locale'; targetPath: string }
  | { action: 'map_to_source_and_target'; targetPath: string }
  | { action: 'drop_from_cloud'; reason: string }
  | { action: 'block_unknown'; reason: string };
```

Gustav apply is blocked while any sync key is `block_unknown`.

## 5. Merge and restore policies

Lesson restore:

- `best_score`: max local/cloud within the same target only;
- `pass_count`: max local/cloud within the same target only;
- `progress`: choose the higher correct count, tie-breaker by fewer wrong answers, same target only;
- `words`, `listening_progress`, `intro_shown`: merge only within the same target.

Exam restore:

- `passed`: logical OR within the same target;
- `pct` and `best_pct`: max within the same target;
- certificates: keep newest valid certificate for that target.

Trainer restore:

- never merge trainer queues across targets;
- merge by stable target-specific item ids only;
- if ids are not target-prefixed, block restore.

Flashcards:

- pack ownership can be global only for product purchases;
- card learning state and target-specific decks must be target-scoped;
- user-created cards need explicit target metadata before sync.

My Practice:

- diagnosis ids must be prefixed like `fr:<diagnosisId>`;
- feedback language must be stored under source plus target when persisted;
- generated practice payloads must include target content hash.

## 6. Required cloud tests

- Restore English legacy cloud into `targets.en`, not `targets.fr`.
- Restore French target cloud while English state already exists.
- Switch source locale Russian to Ukrainian and verify French cloud progress stays stable.
- Restore on a new device with `studyTarget=fr` selected and verify no English lesson stars appear.
- Account merge keeps premium/global state but separates target progress.
- Cloud wipe/reset does not delete other target buckets unless explicitly requested.

## 7. Gustav agent responsibilities

Cloud Sync Agent must:

- read `app/cloud_sync.ts`;
- produce the full sync-key mapping table;
- mark every target-sensitive key;
- inspect merge functions and restore behavior;
- block Gustav if a target key is flat.

QA Gate Agent must:

- verify cloud restore tests exist before French content apply;
- verify no content generator can write product files while cloud mapping is unresolved.

Storage Agent must:

- compare `SYNC_KEYS` against automated storage inventory;
- report keys that are used locally but absent from cloud sync;
- report cloud keys that are no longer used locally.

## 8. Current Gustav verdict

Status: `HOLD`.

Reason: automated inventory already shows cloud-synced, target-sensitive legacy English keys. French must not be generated or applied until target cloud mapping exists.

