# Admin v2 Content Factory Baseline — 2026-07-12

## Область проверки

Этот baseline фиксирует состояние генератора до изменения production-поведения. Генерация контента и обращения к LLM не запускались. Проверялись только локальные контракты, исходный код и deterministic Jest tests.

## Подтверждённые дефекты

### 1. Расхождение ожидаемых и сохраняемых операций

- `functions/src/content_factory/contracts.ts:createGenerationJob()` вычисляет `progress.total` как `lessonIds.length * surfaces.length`.
- `functions/src/content_factory/job_service.ts:splitGenerationJob()` объединяет `lessons`, `vocabulary` и `drills` в canonical surface `lesson`.
- Для двух уроков и трёх связанных флажков job ожидает 6 операций, но splitter создаёт 2 units.
- Для двух уроков и всех шести флажков job ожидает 12 операций, но splitter создаёт 8 units.

Воспроизведение:

```powershell
Push-Location functions
npx jest --runTestsByPath src/content_factory/job_service.test.ts --runInBand
Pop-Location
```

Ожидаемое baseline-состояние: два новых contract cases падают с `Expected: 2, Received: 6` и `Expected: 8, Received: 12`.

Примечание: callable `buildContentFactoryJobPlan()` сейчас вручную переопределяет total через `units.length`, но общий контракт `createGenerationJob()` остаётся противоречивым. Два источника расчёта создают риск повторного дефекта в любом новом caller.

### 2. Нет preflight фактического покрытия registry

- Admin request допускает lesson IDs 1–100.
- Выбранный UI blueprint — `english-core-32:v1`.
- Job создаётся до чтения `content_factory_source_registry`.
- Отсутствующий урок обнаруживается только worker-ом как `blueprint_lesson_not_found`.
- Создание job не возвращает `source_coverage` и список `missingLessonIds`.

Поведенческий контракт строит настоящий 32-lesson registry, запрашивает `[32, 33]` и ожидает `{ ok: false, code: 'source_coverage', missingLessonIds: [33] }`:

```powershell
Push-Location functions
npx jest --runTestsByPath src/content_factory/source_registry.test.ts --runInBand
Pop-Location
```

Ожидаемое baseline-состояние: test compile падает с `Module './source_registry' has no exported member 'inspectSourceRegistryCoverage'`, то есть исполнимый preflight seam ещё отсутствует. Release 1 должен реализовать seam и сделать точное ожидание зелёным.

### 3. UI теряет причины ошибок

- Worker сохраняет только последние `errorCode` и `errorMessage`.
- Не сохраняются normalized category, `retryable` и `attemptHistory`.
- Admin batch runner использует `catch { state.generation.failed += 1; }` и не показывает ошибку конкретного unit.

Ожидаемое baseline-состояние: contract `retains actionable unit errors instead of swallowing worker failures` падает на отсутствующих retryability/history/UI bindings.

## Текущая схема выполнения

1. `adminCreateContentGenerationJob` валидирует request и создаёт job с canonical units.
2. Admin v2 читает job и по очереди вызывает `adminRunContentGenerationUnit` двумя workers.
3. Worker читает registry только при выполнении unit.
4. Worker генерирует `lesson | quiz | flashcard | arena`, пишет immutable artifact и обновляет progress.
5. Отдельные legacy-флажки vocabulary/drills не создают независимых units.

## Хранилища и идентичность

- Jobs: `content_factory_jobs/{jobId}`.
- Units: `content_factory_job_units/{jobId}:{surface}:{lessonId}`.
- Source registries: `content_factory_source_registry/{blueprintId}:{version}`.
- Draft release identity: `draft-{studyTarget}-{learnerSourceLocale}-{jobId}`.
- Immutable objects: `course-releases/{releaseId}/{surface}/{lessonId}.json`.
- Review/release/catalog paths остаются неизменными на Release 0.

## Изолированная таксономия Release 0

Добавлены, но не подключены к runtime:

- `functions/src/content_factory/generation_errors.ts`;
- `functions/src/content_factory/generation_errors.test.ts`.

Категории: source missing/coverage, provider rate/schema, QA, budget, storage, permission, cancellation и unknown. Сетевые/временные retry разрешены только для provider rate limit и storage unavailable. Диагностический текст очищается от API key, bearer token и control characters, затем ограничивается 300 символами.

Проверка:

```powershell
Push-Location functions
npx jest --runTestsByPath src/content_factory/generation_errors.test.ts --runInBand
Pop-Location
```

Результат baseline: 11 tests passed.

## Граница Release 0

- Production runtime не изменяется.
- Новая таксономия не импортируется production-модулями до Release 1.
- Красные contract tests намеренно фиксируют три дефекта и должны стать зелёными в Release 1, а не маскироваться skip/todo.
- OpenAI/Firebase generation callables не вызывались; проектный API key не читался и не использовался.
