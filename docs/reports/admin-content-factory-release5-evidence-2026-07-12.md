# Admin v2 Content Factory — Release 5 Evidence

## Реализованный workflow

`random/editable pack idea -> approval -> 1..20 rich cards -> review -> cumulative ledger -> next batch / partial retry / one-card replacement -> rich draft preview`

- `flashcard_pack_idea` v3 возвращает редактируемые title, learningPromise, audience, CEFR, tags, inclusions, exclusions и uniquenessFingerprint.
- Направление администратора может быть коротким; полный пользовательский prompt не требуется.
- `flashcard_items` генерирует ровно запрошенное количество от 1 до 20. Проверены границы 1, 10 и 20; 0 и 21 отклоняются.
- Каждая карточка содержит стабильный ID, target front, source back, выровненные target/source examples, практическую note и sourceReferences.
- Ledger исключает повторы внутри пачки и между всеми одобренными пачками пака. Откат пачки освобождает её semantic keys.
- Optional второй prerequisite `lesson_phrases` загружается как одобренный неизменяемый артефакт; его target/source пары становятся lesson dedupe keys.
- Worker серверно читает опубликованные `community_packs` и добавляет их пары в published-catalog dedupe. При размере выборки больше безопасного предела генерация останавливается вместо частичной проверки.
- Production partial retry после исчерпания repair budget сохраняет hash-проверяемый checkpoint валидных карточек, accepted IDs/semantic keys и missingCount. Повторный запуск просит только недостающее количество, запрещает ID/semantic conflicts, сливает результат в исходном порядке и повторно валидирует точный полный размер. Checkpoint удаляется только после успешного immutable artifact commit; lease защищает pause/crash и idempotent replay.
- Любое число malformed refill-попыток сохраняет исходный checkpoint и `retryable=true`: проверен сценарий `7/10 -> malformed refill -> всё ещё 7/10 -> valid refill 3 -> merged 10`.
- `flashcard_item_replacement` заменяет одну карточку с прежним ID. Версионный CAS-стек запрещает откат устаревшей замены, восстанавливает предыдущую активную версию и откатывается вместе с пачкой.
- Replacement повторно читает опубликованный community-каталог при генерации и ещё раз непосредственно перед approval, поэтому рост каталога после исходной пачки не оставляет stale dedupe snapshot.
- Обычная пачка также повторно сверяется с текущим опубликованным каталогом внутри approval transaction; тест моделирует рост каталога между generation и approval.
- Admin v2 создаёт отдельную пачку из approved idea и отдельную replacement-stage для выбранной карточки. Все действия имеют подписи и tooltip.
- Для partial checkpoint очередь Admin показывает сохранённое и оставшееся количество; существующая retry-кнопка запускает дозаполнение той же server-owned стадии.

## Consumer decision

Реальный `CardItem` поддерживает description, examples, level и source metadata. `buildEnglishFlashcardDraft` без потерь адаптирует rich `en <- ru` карточки в этот формат.

Текущий callable `community_packs` отбрасывает rich example/note fields. Поэтому Flashcard Studio сохраняет `publicationPolicy=draft_only_rich_fields_not_supported_by_community_consumer`, показывает явное предупреждение в preview и fail-closed блокирует community publication. Это не выдаётся за runtime-публикацию.

## Prompt iteration

Run1 прошёл структурные validators, но Language Review 1 вернул `CHANGES_REQUIRED`:

- неполная standalone-фраза без явного referent;
- калькированная русская формулировка.

Prompt повышен с v2 до v3. Добавлены общие правила self-contained front/back, idiomatic source translation и exact example meaning, а также две регрессионные fixtures с плохими и исправленными формами. Старый v2 остаётся читаемым.

Создан полностью новый run2 на другой теме. Два последовательных неизменяемых language review вернули:

```text
LANGUAGE REVIEW 2: DECISION: APPROVED
LANGUAGE REVIEW 3: DECISION: APPROVED
```

## Smoke

Fake-provider smoke покрывает random idea, edited idea, две пачки по 10, duplicate rejection, production checkpoint 7/10 -> retry 3 -> exact merged 10, one-card replacement, rich draft preview и блокировку несовместимой публикации.

Real-language run2: `.codex-tmp/admin-content-factory-r5-smoke/run2/`

- `en <- ru`, A2, новая тема home/building;
- 20 rich cards + 1 replacement;
- idea/batch1/batch2/replacement/adapter validators: PASS;
- ledger revision 3, две пачки, 20 активных semantic keys;
- все 6 заявленных SHA-256 совпадают;
- project API calls = 0; project secrets read = false;
- self-scoring не выполнялся.

## Verification

```text
Functions R5 focused suites: 12 passed
Functions R5 focused tests: 120 passed
Functions TypeScript build: PASS
Root Admin/rules suites: 4 passed
Root Admin/rules tests: 69 passed
Admin JavaScript syntax: PASS
Tooltip audit: 142/142, missing 0
Language audit: hard findings 0
Run2 manifest hashes: 6/6 PASS
Scoped git diff --check: PASS
```

Firebase deployment не выполнялся и не требуется для R5 implementation gate.
