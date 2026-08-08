# Phraseman Multilingual Foundation W0-W1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Подготовить безопасный фундамент для курсов французского, испанского, немецкого и итальянского без смешивания прогресса, контента и релизов разных языковых пар.

**Architecture:** Learning V2 и Content Factory остаются единственными целевыми контурами. Вводится явная идентичность курса `targetLanguage + learnerSourceLocale + curriculumVersion`; локальные ключи, облачная синхронизация и published release используют одну нормализацию и не имеют молчаливого fallback на английский/русский. Legacy English остаётся совместимым через узкий адаптер и одноразовую миграцию.

**Tech Stack:** TypeScript, Expo/React Native, AsyncStorage, Firebase/Cloud Functions, Jest, существующие `modules/learning-v2`, `app/course_pack_*` и `functions/src/content_factory`.

## Ограничения выполнения

- Не создавать ветку, worktree, коммит или PR без отдельного разрешения владельца: `AGENTS.md` запрещает это для текущего репозитория.
- Не затрагивать массовое написание уроков до зелёного вертикального среза French L01-L08.
- Не использовать project OpenAI API key для исследований, генерации или ревью.
- Сохранять все существующие пользовательские изменения в грязном worktree.
- Один исполнитель пишет код; проверки выполняются отдельно и не исправляют исходники.

## Принятые решения

1. Первый пилот: `fr` для `ru` и `uk`, уроки 01–08.
2. Полный сезон остаётся совместимым с продуктовой рамкой 32 урока × 50 практических фраз.
3. 50 строк не означают 50 новых конструкций: на урок — 8–10 новых phrase frames и обычно 12–22 новых лексемы.
4. Обещание сезона: функциональный A1 и мост к раннему A2, не сертифицированный A2.
5. `Cambridge` используется только для методики/английского; языковые нормы подтверждаются Goethe, Instituto Cervantes, France Éducation international и CILS/Università per Stranieri di Siena.

## Task 1 — Зафиксировать current-state и границы системы

**Files:**

- Create: `docs/multilang/00-current-state-delta-audit.md`
- Create: `docs/multilang/01-contract-convergence-map.md`
- Create: `docs/multilang/02-file-ownership-map.md`
- Create: `docs/multilang/03-risk-register.md`

- [ ] Проверить production/dev target unions и перечислить расхождения.
- [ ] Зафиксировать все молчаливые fallback в storage/runtime.
- [ ] Сопоставить legacy lessons, Course Pack, Learning V2 и Content Factory.
- [ ] Назначить одного владельца каждому изменяемому файлу/контракту.
- [ ] Пометить P0/P1/P2 риски и доказательство закрытия каждого.

**Acceptance:** документы называют точные файлы и функции; ни один пункт не требует угадывать, какой контур канонический.

## Task 2 — Утвердить Course Identity ADR

**Files:**

- Create: `docs/multilang/04-course-identity-adr.md`
- Test: `tests/course_identity_contract.test.ts`
- Create: `modules/learning-v2/content/course_identity.ts`

- [ ] Сначала написать падающие тесты для нормализации и сериализации.

Required contract:

```ts
export interface CourseIdentity {
  readonly targetLanguage: 'en' | 'fr' | 'es' | 'de' | 'it';
  readonly learnerSourceLocale: 'ru' | 'uk';
  readonly curriculumVersion: string;
}

export function courseCatalogId(identity: CourseIdentity): string;
export function courseStorageScope(identity: CourseIdentity): string;
export function assertCourseIdentity(value: unknown): CourseIdentity;
```

- [ ] Тестами запретить неизвестные языки, пустую версию, mixed case и неявные значения.
- [ ] Реализовать минимальный контракт.
- [ ] Использовать порядок `<target>.<source>.<curriculumVersion>` для catalog id и versioned storage namespace.
- [ ] Не заменять неизвестный target на `en` и source на `ru`.

**Run:**

```powershell
npx jest tests/course_identity_contract.test.ts --runInBand --no-cache
```

**Acceptance:** валидные пары детерминированы; невалидные падают закрыто; контракт импортируется и клиентом, и backend без циклических зависимостей.

## Task 3 — Устранить молчаливые fallback в target/source normalization

**Files:**

- Modify: `app/study_target.ts`
- Modify: `app/study_target_lang_dev.ts`
- Modify: `app/target_storage_keys.ts`
- Test: `tests/target_storage_keys.test.ts`
- Test: `tests/study_target_contract.test.ts`

- [ ] Добавить падающие тесты: `es`, `de`, `it` никогда не получают английский namespace.
- [ ] Добавить падающие тесты: неизвестный source не получает русский namespace.
- [ ] Разделить `parse`, `assert` и `default only when absent`; default разрешён только для `null | undefined` в legacy entry point.
- [ ] Сделать production enablement отдельным allowlist/feature flag, не частью domain union.
- [ ] Удалить дублирующую dev-идентичность после переноса всех вызовов.

**Run:**

```powershell
npx jest tests/target_storage_keys.test.ts tests/study_target_contract.test.ts --runInBand --no-cache
```

**Acceptance:** любой переданный неподдерживаемый код вызывает явную ошибку; старый пользователь без сохранённого target продолжает получать English.

## Task 4 — Спроектировать storage migration до изменения ключей

**Files:**

- Create: `docs/multilang/05-storage-migration-adr.md`
- Create: `app/course_storage_migration.ts`
- Test: `tests/course_storage_migration.test.ts`
- Modify: `app/target_storage_keys.ts`

- [ ] Зафиксировать таблицу legacy key → scoped key по доменам: lesson progress, stats, personal practice, SRS, vocabulary, irregular verbs, prepositions, flashcards, diagnostics.
- [ ] Написать тесты idempotency, partial migration, crash/retry и no-overwrite.
- [ ] Копировать legacy English данные только в `en.<source>.legacy-v1`, если новый ключ отсутствует.
- [ ] Хранить receipt с версией, временем и количеством migrated/skipped keys.
- [ ] Не удалять legacy ключи в первой версии.

**Run:**

```powershell
npx jest tests/course_storage_migration.test.ts tests/target_storage_keys.test.ts --runInBand --no-cache
```

**Acceptance:** повторный запуск ничего не портит; прогресс English сохранён; FR/ES/DE/IT не читают English данные.

## Task 5 — Расширить Course Release как единый релиз курса

**Files:**

- Create: `docs/multilang/06-release-surface-adr.md`
- Modify: `functions/src/content_factory/course_release_contract.ts`
- Modify: `functions/src/language_release.ts`
- Modify: `app/course_pack_manifest.ts`
- Test: `functions/src/content_factory/course_release_contract.test.ts`
- Test: `functions/src/language_release.test.ts`
- Test: `tests/course_pack_manifest.test.ts`

- [ ] Сначала тестами зафиксировать catalog identity из трёх частей.
- [ ] Заменить обязательный `blueprintLocale: 'en'` на versioned `blueprintLanguage` либо явно документировать English pivot как контентный язык, не study target.
- [ ] Решить полный набор surface: `lesson`, `intro`, `theory`, `vocabulary`, `irregular`, `preposition`, `personalPractice`, `flashcard`.
- [ ] Если часть surface физически встроена в lesson artifact, прописать это в manifest и не создавать фиктивные независимые blobs.
- [ ] Activation/rollback должны быть атомарны для всей course identity.
- [ ] Published loader должен проверять target, source, curriculum version, schema version, hash и min app version.

**Run:**

```powershell
npx jest functions/src/content_factory/course_release_contract.test.ts functions/src/language_release.test.ts tests/course_pack_manifest.test.ts --runInBand --no-cache
```

**Acceptance:** невозможно активировать артефакт от другой языковой пары; rollback возвращает целиком предыдущий валидный курс.

## Task 6 — Зафиксировать compatibility matrix и fail-closed runtime

**Files:**

- Create: `docs/multilang/07-compatibility-matrix.md`
- Modify: `app/course_pack_runtime_policy.ts`
- Test: `tests/course_pack_runtime_policy_contract.test.ts`

- [ ] Описать поддержку по комбинациям app version × schema × content × target × source.
- [ ] Добавить тесты wrong pair, unsupported schema, stale hash, incomplete artifact set, unavailable offline pack.
- [ ] Разрешить fallback только на последний валидный pack той же course identity.
- [ ] Bundled English fallback применять только к English identity.

**Run:**

```powershell
npx jest tests/course_pack_runtime_policy_contract.test.ts --runInBand --no-cache
```

**Acceptance:** несовместимый курс не открывается как English; UI получает типизированную причину и предлагает retry/смену языка.

## Task 7 — W1 quality gate

**Files:**

- Verify only: all files above

- [ ] Выполнить focused Jest suites из Tasks 2–6.
- [ ] Выполнить `npm run lesson:qa:summary` и убедиться, что legacy English не регрессировал.
- [ ] Выполнить `npx tsc --noEmit` либо существующий repo typecheck command; сохранить только решающие строки лога.
- [ ] Проверить `rg -n "TO[D]O|T[B]D|PLACE[H]OLDER|fallback.*en|fallback.*ru" docs/multilang modules/learning-v2/content/course_identity.ts app/target_storage_keys.ts`.
- [ ] Провести свежий read-only review контрактов identity, migration и release.

**Exit gate:** W2 (French curriculum blueprint) не начинается, пока все P0 из `03-risk-register.md` не имеют зелёного автоматического доказательства.

## Следующие планы после W1

1. W2: French 32-lesson curriculum blueprint и CEFR/source traceability.
2. W3: French L01-L08 content vertical slice — интро, теория, 400 фраз, словарь, grammar/POS.
3. W4: vocabulary lexeme ledger и cross-lesson novelty gate.
4. W5: personal practice/SRS identity и language-specific repair lessons.
5. W6: linguistic, pedagogical and native-speaker review pipeline.
6. W7: staging release, dogfood, telemetry and rollback rehearsal.
