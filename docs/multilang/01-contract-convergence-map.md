# Contract convergence map

## Каноническая цепочка

```text
CourseIdentity
  -> LanguageProfile
  -> Curriculum / EpisodeLearningDesign
  -> ContentItem + lexeme/grammar metadata
  -> compiled CourseRelease artifacts
  -> CoursePack validation/cache
  -> lesson runtime + personal practice
  -> scoped local/cloud progress and evidence
```

Каждая стрелка обязана переносить одну и ту же identity: target language, learner source locale и curriculum version. Никакой слой не восстанавливает отсутствующий язык по имени поля или содержимому строки.

## Карта существующих контрактов

| Назначение | Канонический контур | Legacy/адаптер | Решение |
|---|---|---|---|
| Course identity | Новый общий `modules/learning-v2/content/course_identity.ts` | `app/study_target.ts`, `app/study_target_lang_dev.ts` | Один parser/assert/serializer; availability отдельно |
| Language behavior | `modules/learning-v2/content/language_profile.ts` | target-specific utility branches | Tokenization, normalization, TTS/STT и grammar capabilities приходят из profile |
| Учебный объект | `modules/learning-v2/content/content_item.ts` | `app/phrase.ts` | Legacy phrase адаптируется в ContentItem; новые языки не добавляют поля `german/italian/...` |
| Curriculum | Learning V2 curriculum/episode contracts | English 32 lesson order | Для каждого языка отдельный blueprint; общие can-do milestones допустимы, одинаковый порядок не обязателен |
| Release | Content Factory `CourseRelease` + `language_release.ts` | bundled English | Все surfaces одной identity активируются/rollback вместе |
| Client package | `app/course_pack_manifest.ts` + runtime policy | статические imports lesson files | Last-known-good только той же identity |
| Vocabulary | lexeme ledger, создаваемый из ContentItems | `app/lesson_words.tsx` | UI сохраняется, вычисление novelty становится build-time QA |
| Personal practice | stable item/skill refs + evidence/SRS | phrase-string identity | Ошибка хранит course + item + skill + error type; repair recipe language-aware |
| Cloud sync | scoped progress schema | старые English поля/keys | Версионная идемпотентная миграция, без удаления legacy на первом релизе |

## Course identity

Минимальный контракт:

```ts
interface CourseIdentity {
  targetLanguage: 'en' | 'fr' | 'es' | 'de' | 'it';
  learnerSourceLocale: 'ru' | 'uk';
  curriculumVersion: string;
}
```

Derived ids:

- catalog: `<target>.<source>.<curriculumVersion>`;
- local namespace: `course:<target>:<source>:<curriculumVersion>`;
- release id: самостоятельный immutable token, но release body обязан содержать и валидировать CourseIdentity;
- content item id: стабилен внутри curriculum lineage и не зависит от отображаемого перевода.

## Surface ownership

Логические поверхности курса:

- lesson phrases/tasks;
- lesson intro;
- theory;
- vocabulary/lexeme ledger;
- irregular morphology, если применимо;
- preposition/case/government drills, если применимо;
- personal-practice repair recipes;
- flashcards;
- audio/voice metadata.

Физически они могут быть объединены в меньшее число artifacts. Контракт release должен явно перечислять, какие логические surfaces входят в каждый artifact, чтобы «зелёный lesson blob» не маскировал отсутствующую theory или vocabulary.

## Vocabulary novelty invariant

Для урока N:

```text
introducedLexemes(N) = requiredLexemes(N) - union(requiredLexemes(1..N-1))
```

`requiredLexemes(N)` строится из нормализованных lexeme ids, а не из визуальных токенов. Inflected forms ссылаются на одну лемму; multiword units могут иметь отдельный lexeme id. QA проверяет:

1. каждая target phrase покрыта лексемами;
2. каждый «новый» lexeme действительно впервые появляется;
3. функция нормализации взята из LanguageProfile;
4. intentional review помечен как review, а не new;
5. source translation не участвует в target novelty.

## Personal practice invariant

SRS card identity не равна тексту фразы. Минимальный ключ:

```text
courseIdentity + contentItemId + skillId + errorType
```

Изменение перевода или punctuation не должно обнулять интервал. Изменение pedagogical meaning выпускает новый content item/revision с явной migration policy.

## Запрещённые дублирования

- Второй union языков в dev-файле.
- Второй release service для каждого языка.
- Поля `english/french/spanish/german/italian` в новом content schema.
- Собственный tokenizer в экране словаря.
- Отдельный SM-2 store без course identity.
- Автоматический English fallback для чужой identity.

