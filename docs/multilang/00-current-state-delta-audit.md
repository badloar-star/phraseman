# Phraseman multilingual: current-state delta audit

Дата фиксации: 2026-08-08. Область: добавление `fr`, `es`, `de`, `it` как изучаемых языков для интерфейса/перевода `ru` и `uk`.

## Итог

Phraseman уже содержит значительную часть правильного фундамента: Course Pack manifest, Content Factory release/rollback, locale-neutral Learning V2 content items, language profiles, curriculum contracts, QA и SM-2. Однако production runtime пока не является безопасно мультиязычным. Главный блокер — неодинаковая идентичность курса в разных слоях и молчаливое сведение неизвестных target/source к `en`/`ru`.

Новый параллельный движок не нужен. Нужно свести существующие контуры к одной course identity, мигрировать storage и только после этого писать массовый контент.

## Проверенные факты репозитория

| Область | Сейчас | Требуемое состояние | Приоритет |
|---|---|---|---|
| Production study target | `StudyTarget = 'en' | 'fr'`, но production allowlist содержит только `en` | Domain union `en/fr/es/de/it`; выпуск управляется отдельным allowlist/flag | P0 |
| Dev target | Отдельный `StudyTargetLang` добавляет `es` | Одна domain identity, dev/prod различаются только доступностью | P1 |
| Storage target | `storageStudyTarget()` возвращает `fr`, всё остальное — English default | Переданный неизвестный target отклоняется; default только при реально отсутствующем legacy значении | P0 |
| Storage source | `storageSourceLocale()` возвращает `uk`, всё остальное — `ru` | Переданный неизвестный source отклоняется | P0 |
| Phrase schema | Поля и утилиты содержат `english`, `spanish`, `french`, `wordsEn`, `wordsFr` | Locale-neutral target/source text и language-aware lexemes | P0 |
| Pack identity | Manifest использует `studyTarget + sourceLocale + surface` | Добавить curriculum/content version и общий нормализатор identity | P0 |
| Published release | Release identity содержит target/source; surfaces только `lesson`, `flashcard` | Один атомарный релиз покрывает все необходимые учебные surfaces | P0 |
| Blueprint | `blueprintLocale` жёстко равен `en` | Явно определить: English pivot metadata или language-specific blueprint; не путать с target | P1 |
| Learning V2 | ContentItem/LanguageProfile уже locale-neutral | Расширить и подключить, не создавать новый формат | Foundation exists |
| Vocabulary | `lesson_words.tsx` умеет исключать ранее встречавшиеся леммы | Вынести в детерминированный lexeme ledger с QA receipt | P1 |
| Personal practice | SM-2 существует, identity часто основана на строке/English-centric полях | Stable content/skill identity + course identity + language-specific repair | P0 |
| Existing content | English: 32 × 50; French имеет частичные curriculum/runtime контуры; Spanish — dev legacy; DE/IT — только отдельные кандидаты placement | Сначала FR L01-L08 vertical slice, потом 32; ES/DE/IT после доказанного pipeline | P1 |

## Точные места расхождений

- `app/study_target.ts`: domain union шире production allowlist, но ещё не включает ES/DE/IT.
- `app/study_target_lang_dev.ts`: отдельная dev-модель для Spanish создаёт второй источник истины.
- `app/target_storage_keys.ts`: `storageStudyTarget` и `storageSourceLocale` имеют опасный default-on-invalid.
- `app/phrase.ts` и `app/phrase_target_utils.ts`: язык зашит в имена полей и ветвления.
- `app/course_pack_manifest.ts`: хорошая база identity, но version dimension не является общей course identity всего продукта.
- `functions/src/content_factory/course_release_contract.ts`: `CANONICAL_RELEASE_SURFACES = ['lesson', 'flashcard']`; `blueprintLocale: 'en'`.
- `functions/src/language_release.ts`: activation/rollback уже атомарны на catalog, но catalog identity должна использовать общий контракт.
- `modules/learning-v2/content/content_item.ts`: target locale проверяется против language profile — это целевой путь.
- `modules/learning-v2/content/language_profile.ts`: `targetLanguage` уже общий string с validation — расширять здесь безопаснее, чем копировать legacy schema.

## Проверенный English baseline

- Уроки L01–L32 доступны.
- В каждом уроке ровно 50 фраз: всего 1 600.
- Перед уроками присутствуют 3–5 intro screens.
- `npm run lesson:qa:summary`: 0 errors, 0 warnings на момент аудита.
- Focused Jest: 4 suites / 29 tests passed для storage, runtime policy, Learning V2 item и French curriculum contracts.
- Старый `scripts/audit_lessons_1_32.py` не соответствует текущей структуре и даёт ложное сообщение об отсутствии L01–L16; его нельзя использовать как release gate без ремонта.

## Контентная рамка

Сохранить 32 × 50 как продуктовую и runtime-совместимую рамку первого сезона. При этом один урок вводит только 8–10 новых phrase frames и обычно 12–22 новых лексемы. Рекомендуемая композиция 50 строк:

1. 10 — первое знакомство и core meaning.
2. 10 — controlled variations.
3. 10 — contrasts и типичные ошибки.
4. 10 — real-life turns/mini-dialogues.
5. 10 — mixed transfer и интервальное повторение.

Цель 32 уроков — сильный функциональный A1 и отдельные задачи раннего A2. Документы не должны обещать CEFR-сертификацию или полный A2.

## Решение о первом языке

Первый пилот — French, L01-L08, для source locales RU/UK. Причины: в репозитории уже есть French curriculum/remote runtime/source gates; это уменьшает объём неизвестного и проверяет именно мультиязычные контракты. Массовая генерация 32 уроков запрещена до успешного dogfood первой главы.

## Что не делать

- Не копировать English lesson files четыре раза с заменой строк.
- Не хранить Spanish только в dev-типе.
- Не применять English/Russian fallback к явно переданному неизвестному языку.
- Не считать перевод фразы стабильным SRS id.
- Не писать 6 400 строк для четырёх языков до вертикального среза.
- Не строить отдельный «multilang V3» рядом с Learning V2.

