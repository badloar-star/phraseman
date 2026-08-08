# W1 file ownership map

## Правило одного писателя

На один этап назначается один writer. Read-only reviewer и verifier могут работать параллельно, но не изменяют исходники. Перед началом writer повторно снимает `git status --short` и не включает чужие изменения в commit.

Текущий worktree уже содержит пользовательские изменения, включая файлы, близкие к multilingual scope. Поэтому W0 — только новые документы. Любое изменение существующего runtime-файла начинается отдельной сессией после проверки diff.

## Пакеты владения

| Пакет | Единственный writer владеет | Не имеет права менять | Выход |
|---|---|---|---|
| A — Identity | `modules/learning-v2/content/course_identity.ts`, `tests/course_identity_contract.test.ts` | storage/release/UI | Чистый общий контракт |
| B — Target/storage normalization | `app/study_target.ts`, `app/study_target_lang_dev.ts`, `app/target_storage_keys.ts`, связанные tests | Cloud Functions release | Fail-closed target/source |
| C — Migration | `app/course_storage_migration.ts`, migration tests, точечные key helpers | lesson content, UI redesign | Идемпотентная English migration |
| D — Release | `functions/src/content_factory/course_release_contract.ts`, `functions/src/language_release.ts`, backend tests | local storage | Atomic identity-bound release |
| E — Client pack | `app/course_pack_manifest.ts`, `app/course_pack_runtime_policy.ts`, tests | backend activation logic | Same-identity cache/fallback |
| F — Phrase adapter | legacy phrase adapter + ContentItem integration | curriculum/content authoring | Locale-neutral runtime input |
| G — Vocabulary | lexeme ledger/compiler, `app/lesson_words.tsx`, QA tests | SRS scheduling | Cross-lesson novelty proof |
| H — Personal practice | mistake identity, SRS adapters, cloud schema/tests | release service | Stable language-aware repair |

## Обязательные handoff данные

Каждый writer передаёт:

1. точный список изменённых файлов;
2. contract decision и rejected alternatives;
3. команды тестов и решающие результаты;
4. migration/backward-compatibility note;
5. известные риски и незакрытые gates;
6. подтверждение, что чужие dirty files не были восстановлены/перезаписаны.

## Последовательность владения

```text
A Identity
  -> B normalization
  -> C migration
  -> D release
  -> E client pack
  -> F phrase adapter
  -> G vocabulary
  -> H personal practice
```

D и E можно готовить после A, но интеграция выполняется только после зелёных B/C. F–H не начинают массовую адаптацию до зелёного same-identity release round-trip.

## Git policy текущего репозитория

- Текущая ветка: `feature/referral-roulette` на момент аудита.
- Создание новой ветки/worktree запрещено без точного разрешения владельца согласно `AGENTS.md`.
- Коммиты не выполняются автоматически в грязном worktree.
- Если владелец разрешит ветку, staging выполняется только явным списком собственных файлов; `git add .` запрещён.

