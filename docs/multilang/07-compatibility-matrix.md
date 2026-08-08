# Multilingual compatibility matrix

## Принцип

Совместимость определяется capabilities, а не предположением «новая версия приложения всё поймёт». Runtime открывает pack только при одновременном совпадении identity, schema, surface closure, hashes и app capability.

## Версии контрактов

| Contract | Начальная версия | Назначение |
|---|---|---|
| Course identity | `course-identity-v1` | target + source + curriculum |
| Release | `course-release-v2` | identity-bound release + surface closure |
| Learning bundle | `learning-bundle-v2` | locale-neutral items, intro, theory, lexemes, repair refs |
| Progress storage | `course-storage-v1` | course-scoped local/cloud progress |
| Language profile | existing versioned profile | normalization, sound/morphology capabilities |

Фактические semver app thresholds назначаются при реализации после проверки текущей app version policy; этот документ не выдумывает номер сборки.

## Runtime decision matrix

| Requested course | Available pack | App capability | Результат |
|---|---|---|---|
| Exact identity | Exact identity, valid/current | Supports all contract versions | Open remote/current pack |
| Exact identity | Remote invalid, cached exact identity valid | Supports cached versions | Open last-known-good same identity, report degraded |
| Exact identity | Pack target differs | Any | Reject `pack_target_mismatch` |
| Exact identity | Pack source differs | Any | Reject `pack_source_mismatch` |
| Exact identity | Curriculum differs | Any | Reject `pack_curriculum_mismatch`; no progress sharing |
| Exact identity | Schema unsupported | Missing capability | Reject `pack_schema_unsupported`, require app update |
| Exact identity | Surface closure incomplete | Any | Reject `pack_surface_incomplete` |
| Exact identity | Hash/index invalid | Any | Reject `pack_integrity_failed` |
| FR/ES/DE/IT | Only bundled English exists | Any | Show unavailable/retry; never open English |
| English legacy | No saved identity, bundled English valid | Legacy adapter allowed | Resolve explicit English legacy identity and open |
| Any | No remote/cache/offline pack | Any | Typed offline unavailable state; preserve progress |

## Storage compatibility

| Storage state | Runtime action |
|---|---|
| Legacy English only | Run ADR-ML-002 migration, switch after complete receipt |
| Migration running/partial | Continue legacy English reads; resume migration |
| Course-scoped current | Read exact course namespace |
| Course-scoped newer schema | Do not downgrade/write; typed update-required state |
| Other course identity exists | Ignore, never merge |

## Content compatibility

- Content revision/patch may change while curriculum identity remains stable.
- Progress survives compatible patch by stable content/skill ids.
- Removed or semantically changed item requires alias/tombstone migration.
- Curriculum reordering that changes prerequisite meaning creates new curriculumVersion.
- New LanguageProfile capability requires release/app compatibility gate.

## Fallback order

```text
1. Valid active release for exact CourseIdentity
2. Valid last-known-good cache for exact CourseIdentity
3. Valid bundled pack for exact CourseIdentity, if shipped
4. Typed unavailable/error state
```

Переход к другой identity отсутствует намеренно.

## UI behavior by error class

| Error class | User action | Data behavior |
|---|---|---|
| Temporary network | Retry / use cached | No mutation of course identity |
| Pack unavailable | Return to language picker | Progress retained |
| App too old | Update app | Do not write newer-schema state |
| Integrity failure | Retry download; report | Quarantine bad cache |
| Identity mismatch | Internal error + safe exit | Never open/migrate foreign progress |

## Release gates

- Exact-identity remote → client round-trip test.
- Airplane-mode same-identity cache test.
- Wrong target/source/curriculum negative tests.
- Incomplete closure and corrupted hash negative tests.
- Upgrade from legacy English with preserved score/SRS/stat samples.
- Rollback to prior same-identity release.
- Attempted cross-identity rollback fails.
- Production picker remains feature-flagged until all gates pass.

## Telemetry without content leakage

Разрешены: error code, target/source/curriculum token, contract versions, release id, cache source, app version. Запрещены: пользовательские ответы, phrase text, translation, explanation content и full storage payload.

