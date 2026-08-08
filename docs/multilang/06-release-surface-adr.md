# ADR-ML-003: атомарный release и closure учебных поверхностей

- Статус: принято для реализации W1
- Дата: 2026-08-08

## Контекст

Существующий `CourseRelease` хорошо задаёт immutable release, hashes, app compatibility, activation и rollback, но физически требует только `lesson` и `flashcard`. Для полноценного курса пользователю также нужны intro, theory, vocabulary, language-specific morphology/government и personal-practice repair metadata.

## Решение

В W1 сохранить два физических artifacts ради совместимости и скорости загрузки:

1. `lesson` — versioned learning bundle;
2. `flashcard` — versioned flashcard bundle.

При этом `lesson` artifact обязан содержать typed `surfaceClosure`, доказывающий наличие логических surfaces:

```ts
type LearningSurface =
  | 'lesson'
  | 'intro'
  | 'theory'
  | 'vocabulary'
  | 'morphology'
  | 'prepositionGovernment'
  | 'personalPracticeRepair';

interface SurfaceClosureEntry {
  surface: LearningSurface;
  mode: 'embedded' | 'notApplicable';
  entryIndex?: string;
  contentHash?: string;
  notApplicableReason?: string;
}
```

`notApplicable` допускается только по LanguageProfile/curriculum policy и требует machine-readable reason. Например, отсутствие отдельного English-style irregular-verb section нельзя автоматически переносить на другой язык; вместо этого profile определяет нужную morphology surface.

Позднее physical artifacts можно разделить без изменения логических surface contracts.

## Release identity

`CourseRelease` содержит:

```ts
interface ReleaseCourseIdentity {
  targetLanguage: string;
  learnerSourceLocale: string;
  curriculumVersion: string;
}
```

Catalog id вычисляется только общим `courseCatalogId(identity)`. Activation, fetch и rollback повторно вычисляют id и отклоняют несовпадение.

## Blueprint language

`blueprintLocale: 'en'` заменяется на `blueprintLanguage: string`. Это язык служебного authoring blueprint, а не изучаемый язык и не нормативный источник. English pivot разрешён, но:

- не меняет `targetLanguage`;
- не попадает в runtime phrase selection;
- не оправдывает English-specific grammar sequence;
- language-specific claims имеют source traceability.

Для одного переходного schema version старое поле может читаться как `blueprintLanguage='en'`; новые releases его не записывают.

## Closure rules

Release validator проверяет:

1. release/artifact identity exact match;
2. оба физических artifacts присутствуют;
3. все обязательные logical surfaces перечислены ровно один раз;
4. embedded entryIndex безопасен и существует в индексе bundle;
5. embedded content hash совпадает;
6. каждый урок curriculum входит в intro/theory/vocabulary closure;
7. phrase → vocabulary lexeme coverage complete;
8. personal-practice repair refs разрешаются в items/skills;
9. morphology/government соответствует capability policy;
10. min app version понимает schema/surface closure version.

## Activation

Content Factory публикует immutable release record только после QA receipts. `adminActivateCourseRelease` транзакционно меняет один active pointer для exact catalog. Нельзя активировать surfaces по отдельности.

Active pointer содержит release id и полный CourseIdentity. Client fetch перед возвратом повторно валидирует release body и exact request identity.

## Rollback

Rollback выбирает release, который ранее был активен в том же catalog. Membership другого target/source/curriculum не принимается. Возврат меняет весь active pointer; смешанный набор artifacts невозможен.

## Client cache

Cache key включает exact CourseIdentity, schema/content versions и release id/hash. Last-known-good допускается только в том же catalog. Bundled English pack не является fallback для FR/ES/DE/IT.

## Обязательные тесты

- missing logical surface rejected;
- duplicate surface rejected;
- valid notApplicable policy accepted;
- arbitrary notApplicable rejected;
- wrong target/source/curriculum artifact rejected;
- nonexistent/unsafe entryIndex rejected;
- wrong embedded hash rejected;
- activation into wrong catalog rejected;
- rollback across catalog rejected;
- old blueprint locale transition read works only for allowed schema;
- client cache refuses same release id with different identity.

## Отклонённые варианты

1. Восемь независимо активируемых artifacts — слишком легко получить mixed release.
2. Оставить lesson/flashcard без closure — невозможно доказать полноту курса.
3. Отдельный release service на каждый язык — дублирование security/rollback logic.

