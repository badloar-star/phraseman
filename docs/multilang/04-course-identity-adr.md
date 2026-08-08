# ADR-ML-001: единая идентичность курса

- Статус: принято для реализации W1
- Дата: 2026-08-08
- Затрагивает: client storage, Cloud Sync, Content Factory, Course Pack, Learning V2, Personal Practice

## Контекст

Сейчас target language представлен несколькими несовпадающими типами, а часть storage helpers сводит неизвестные значения к English/Russian. Release знает target/source, но curriculum version не входит во все namespaces. Это позволяет двум курсам читать один прогресс или получить артефакт не той пары.

## Решение

Ввести один неизменяемый контракт:

```ts
export const TARGET_LANGUAGES = ['en', 'fr', 'es', 'de', 'it'] as const;
export const LEARNER_SOURCE_LOCALES = ['ru', 'uk'] as const;

export interface CourseIdentity {
  readonly targetLanguage: (typeof TARGET_LANGUAGES)[number];
  readonly learnerSourceLocale: (typeof LEARNER_SOURCE_LOCALES)[number];
  readonly curriculumVersion: string;
}
```

`curriculumVersion` — immutable token формата `^[a-z0-9][a-z0-9._-]{0,63}$`, например `legacy-v1`, `pilot-2026.1`. Он меняется, если меняется смысловая последовательность/identity контента; обычная исправленная опечатка может менять content version/revision без новой curriculum lineage.

## Сериализация

| Назначение | Формат | Пример |
|---|---|---|
| Catalog ID | `<target>.<source>.<curriculum>` | `fr.ru.pilot-2026.1` |
| Local scope | `course:<target>:<source>:<curriculum>` | `course:fr:ru:pilot-2026.1` |
| Cloud document scope | поля identity + canonical catalog id | `{ targetLanguage: 'fr', ... }` |
| Analytics dimension | отдельные поля, не разбор свободной строки | target/source/curriculum |

Сериализатор всегда выдаёт lower-case normalized codes. Parser не принимает пробелы, mixed case, aliases (`ua`, `ua-UA`, `eng`) и не исправляет неизвестное значение.

## Отделение identity от availability

Domain union описывает известные системе языки. Production allowlist/remote capability определяет, какой курс пользователь может выбрать сегодня. Следовательно:

- `fr` может быть валидной identity, но закрытой production flag;
- dev build не создаёт новый тип языка;
- выключение курса не делает сохранённую identity невалидной и не уничтожает прогресс;
- UI picker показывает только available identities, но storage/release parser понимает все поддержанные domain codes.

## Правила default

Default English разрешён только на legacy boundary, когда значение действительно отсутствует (`null | undefined`) и есть явный вызов `resolveLegacyDefaultCourseIdentity`. Любая непустая неизвестная строка — ошибка.

Source locale default разрешён только при миграции старого пользователя и определяется сохранённым UI language (`ru` или `uk`). Если UI language невозможно доказать, миграция откладывается, а не выбирает `ru` молча.

## Stable ids

- Course identity не включает UI language, устройство, user id или текущий app locale.
- Content item id стабилен внутри curriculum lineage.
- Phrase text, translation и audio URL не являются id.
- Lesson ordinal не является глобальным id без course identity.
- Personal-practice/SRS key включает course scope.

## Ошибки

Минимальный typed error set:

- `course_identity_required`;
- `target_language_unsupported`;
- `learner_source_locale_unsupported`;
- `curriculum_version_invalid`;
- `course_identity_mismatch`.

Ошибки не преобразуются в English fallback.

## Последствия

Плюсы: исключается смешивание прогресса и артефактов; dev/prod используют одну модель; добавление следующего target не требует новых storage branches.

Цена: нужна одноразовая миграция legacy English, адаптер старого `StudyTarget` и изменение release catalog id. Это сознательная плата за безопасность до массового контента.

## Отклонённые варианты

1. Только `targetLanguage` в ключе — отклонено: RU/UK переводы, explain content и personal practice различаются.
2. Target-specific поля в Phrase — отклонено: матрица полей растёт с каждым языком.
3. Unknown → English — отклонено: тихая потеря/смешивание данных.
4. Включить release id в progress namespace — отклонено: patch release не должен обнулять прогресс.

## Проверка реализации

- Round-trip serialize/parse для всех 10 поддержанных target/source пар.
- Все пары дают разные catalog/local scopes.
- Invalid/mixed-case/alias inputs fail closed.
- Availability flag не изменяет парсинг сохранённой identity.
- Legacy default вызывается только в явно названном adapter.

