# ADR-ML-002: миграция локального и облачного прогресса

- Статус: принято для реализации W1
- Дата: 2026-08-08
- Основной принцип: copy-only, idempotent, resumable, no-overwrite

## Цель

Сохранить весь существующий English progress и одновременно гарантировать, что French/Spanish/German/Italian никогда не читают legacy English keys.

## Новый namespace

Каждый новый ключ начинается с canonical course scope:

```text
course:<target>:<source>:<curriculum>:<domain>[:<entity>]
```

Примеры:

```text
course:en:ru:legacy-v1:lesson-progress:01
course:fr:uk:pilot-2026.1:personal-practice:item-123:grammar.word-order
course:de:ru:pilot-2026.1:vocabulary:lesson-04
```

## Миграционная область

| Domain | Legacy source | Новый scope | Merge policy |
|---|---|---|---|
| Lesson progress/scores/pass count | lesson helpers в `target_storage_keys.ts` | course + lesson id | copy if destination absent |
| Unlocks/last opened/checkpoints | target-scoped keys | course | copy if absent |
| Stats/achievements/daily breakdown | stats helpers | course | copy if absent; не суммировать при retry |
| Vocabulary lesson state | lessonWords keys | course + lesson | copy if absent |
| Irregular verbs/prepositions | corresponding helpers | course + skill/item | copy if absent |
| Personal practice/mistakes/weekly review | phrase-centric stores | course + stable migrated item ref | staged adapter; raw payload retained |
| SRS/active recall | trainer/recall stores | course + stable card ref | copy with schema marker |
| Flashcards | flashcard helpers | course + pack/card id | copy if absent |
| Diagnostics/level | diagnostic helpers | course | copy if absent |

## Определение legacy identity

1. Target всегда `en` — только для ключей, которые документированно существовали до multi-target storage.
2. Source берётся из сохранённого `ru`/`uk` UI locale.
3. Curriculum — `legacy-v1`.
4. Если source нельзя доказать, migration result = `deferred_source_unknown`; данные не копируются и не удаляются.

Нельзя мигрировать любой неизвестный target как English.

## Алгоритм

1. Прочитать migration receipt `multilang-storage-migration:v1`.
2. Если status `complete` и input fingerprint совпадает — завершить без записи.
3. Получить explicit legacy source locale.
4. Построить детерминированный список операций без изменения storage.
5. Для каждой операции:
   - прочитать source;
   - если source отсутствует — `missing`;
   - если destination существует — `skipped_existing`;
   - иначе записать destination с `migratedFrom`, schema version и payload;
   - записать bounded checkpoint после каждой группы domain.
6. Записать final receipt с counts и fingerprint.
7. Legacy keys не удалять.

## Receipt

```ts
interface CourseStorageMigrationReceiptV1 {
  migration: 'multilang-storage-v1';
  sourceCourse: CourseIdentity;
  destinationScope: string;
  inputFingerprint: string;
  status: 'running' | 'complete' | 'deferred_source_unknown' | 'failed';
  completedDomains: readonly string[];
  migrated: number;
  skippedExisting: number;
  missing: number;
  failed: number;
  startedAt: string;
  completedAt?: string;
}
```

Receipt не содержит phrase text, translation или пользовательские ответы.

## Crash/retry

- Каждая запись destination атомарна на уровне storage API.
- После crash повторный запуск видит destination и не перезаписывает его.
- Domain checkpoints ускоряют retry, но destination existence остаётся окончательным доказательством.
- Partial receipt не даёт runtime читать половину нового namespace: переключение на новый namespace происходит только после `complete`.

## Cloud sync

Cloud migration выполняется отдельно от local copy, server-authoritative и с теми же identity rules. Клиент не загружает legacy payload в чужой course scope. Merge сравнивает schema/revision и сохраняет исходный raw legacy record для rollback/debug, но UI его не смешивает с новым курсом.

## Rollback

Первая версия оставляет legacy данные нетронутыми. Rollback приложения может продолжить legacy English runtime. Новые language-course данные не конвертируются назад в English.

## Обязательные тесты

- clean first migration;
- second run idempotency;
- destination pre-exists — no overwrite;
- crash после каждого domain и успешный retry;
- source locale unknown — deferred, no writes;
- explicit `es/de/it/unknown` never maps to English;
- two source locales never share destination;
- two curriculum versions never share destination;
- corrupted payload isolated and reported; другие domains продолжаются согласно policy;
- legacy keys remain after success.

## Privacy/security

Логи и receipts содержат только ids/counts/error codes. Тексты ошибок пользователя, ответы, переводы и SRS history не выводятся в diagnostic logs.

