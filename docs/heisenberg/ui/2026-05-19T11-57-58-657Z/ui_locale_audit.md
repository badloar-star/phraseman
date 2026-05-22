# Heisenberg UI Locale Audit

Generated: 2026-05-19T11:57:58.656Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 615
- triLang calls: 1548
- Static triLang calls: 1548
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 0
- Locale object findings: 33
- triLang missing locale units: 0
- triLang calls missing all planned locales: 0
- Helper missing locale units: 0
- Locale object missing locale units: 161
- Locale objects missing all planned locales: 29
- Bundle missing locale units: 0

## Finding Codes
- locale-object-missing-planned-locales: 4
- locale-object-missing-all-planned-locales: 29

## Top Files
- app/flashcards_collection.tsx: 7 findings, 35 missing locale units
- app/quiz_data.ts: 6 findings, 30 missing locale units
- app/lesson_words_spanish_gloss.ts: 5 findings, 25 missing locale units
- app/quiz_data_es_l2.ts: 5 findings, 25 missing locale units
- app/community_pack_create.tsx: 4 findings, 17 missing locale units
- app/flashcards/constants.ts: 1 findings, 5 missing locale units
- app/flashcards/FlashcardsCategoryHub.tsx: 1 findings, 5 missing locale units
- app/preposition_overrides.ts: 1 findings, 5 missing locale units
- app/settings_invite_friend.tsx: 1 findings, 5 missing locale units
- components/share_cards/LingmanCertificateSvg.tsx: 1 findings, 5 missing locale units
- app/flashcards/bundles/victoriaBundleShared.ts: 1 findings, 4 missing locale units

## First Findings
- [warning] locale-object-missing-planned-locales app/community_pack_create.tsx:264 missing: pt-BR, vi, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { id: c.id, en: c.en, ru: c.ru, uk: c.uk, es: c.es, }
- [warning] locale-object-missing-all-planned-locales app/community_pack_create.tsx:450 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ...row, en, ru, es: es || undefined, uk: note }
- [warning] locale-object-missing-planned-locales app/community_pack_create.tsx:456 missing: pt-BR, vi, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { id: `c${r.length + 1}`, en, ru, es: es || undefined, uk: note }
- [warning] locale-object-missing-planned-locales app/community_pack_create.tsx:517 missing: pt-BR, vi, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { id: row.id, en: row.en.trim(), ru: row.ru.trim() || undefined, uk: row.uk.trim() || undefined, es: row.es?.trim() || undefined, }
- [warning] locale-object-missing-all-planned-locales app/flashcards/FlashcardsCategoryHub.tsx:471 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Не удалось загрузить карточки набора.', uk: 'Не вдалося завантажити картки набору.', es: 'No se pudieron cargar las tarjetas del pack.', }
- [warning] locale-object-missing-planned-locales app/flashcards/bundles/victoriaBundleShared.ts:124 missing: pt-BR, vi, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { id: c.id, en: c.en, ru: c.ru, uk: c.uk, es: c.es ?? ov?.es, transcription: c.transcription, categoryId: 'custom', isSystem: true, source: 'lesson', sourceId: `DEV:${packId}`, lit
- [warning] locale-object-missing-all-planned-locales app/flashcards/constants.ts:4 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: { title: 'Карточки', hubTitle: 'Осколки', empty: 'Нет карточек', emptySub: 'Добавьте карточки или выберите другую категорию', done: 'Все карточки просмотрены!', doneSub: 'Отл
- [warning] locale-object-missing-all-planned-locales app/flashcards_collection.tsx:706 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Открыт купленный DEV-набор в карточках.', uk: 'Відкрито придбаний DEV-набір у картках.', es: 'Pack DEV comprado abierto en Tarjetas.', }
- [warning] locale-object-missing-all-planned-locales app/flashcards_collection.tsx:739 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Не удалось загрузить карточки.', uk: 'Не вдалося завантажити картки.', es: 'No se pudieron cargar las tarjetas.', }
- [warning] locale-object-missing-all-planned-locales app/flashcards_collection.tsx:797 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Набор ещё не куплен. Его можно открыть за осколки в магазине (вкладка с наборами карточек).', uk: 'Набір ще не куплено. Його можна відкрити за осколки в магазині (вкладка з 
- [warning] locale-object-missing-all-planned-locales app/flashcards_collection.tsx:950 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Карточка удалена.', uk: 'Картку видалено.', es: 'Tarjeta eliminada.', }
- [warning] locale-object-missing-all-planned-locales app/flashcards_collection.tsx:959 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Не удалось удалить карточку.', uk: 'Не вдалося видалити картку.', es: 'No se pudo eliminar la tarjeta.', }
- [warning] locale-object-missing-all-planned-locales app/flashcards_collection.tsx:1113 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: editingId ? 'Карточка обновлена.' : 'Карточка сохранена.', uk: editingId ? 'Картку оновлено.' : 'Картку збережено.', es: editingId ? 'Tarjeta actualizada.' : 'Tarjeta guardad
- [warning] locale-object-missing-all-planned-locales app/flashcards_collection.tsx:1122 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Не удалось сохранить карточку.', uk: 'Не вдалося зберегти картку.', es: 'No se pudo guardar la tarjeta.', }
- [warning] locale-object-missing-all-planned-locales app/lesson_words_spanish_gloss.ts:120 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Книга', uk: 'Книжка', es: 'libro' }
- [warning] locale-object-missing-all-planned-locales app/lesson_words_spanish_gloss.ts:121 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Машина', uk: 'Машина', es: 'carro' }
- [warning] locale-object-missing-all-planned-locales app/lesson_words_spanish_gloss.ts:125 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Приносить', uk: 'Приносити', es: 'traer' }
- [warning] locale-object-missing-all-planned-locales app/lesson_words_spanish_gloss.ts:126 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Чистить щёткой; расчёсывать', uk: 'Чистити щіткою; розчісувати', es: 'cepillar' }
- [warning] locale-object-missing-all-planned-locales app/lesson_words_spanish_gloss.ts:127 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Находить', uk: 'Знаходити', es: 'encontrar' }
- [warning] locale-object-missing-all-planned-locales app/preposition_overrides.ts:15 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: '"On vacation" - устойчивое выражение: "в отпуске". Перед словом vacation в значении отдыха всегда стоит "on", потому что отпуск воспринимается как состояние/событие, в котор
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:75 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: r.ru, uk: r.uk, es: r.es, choices: [...r.choices], correct: r.correct, explanations: [...r.explanations], explanationsUK: [...r.explanationsUK], explanationsES: [...r.explana
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24346 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Как только мы вышли, пошел дождь`, uk: `Як тільки ми вийшли, пішов дощ`, es: `Apenas nos pusimos en marcha, empezó a llover`, choices: [ `No sooner had we set off than it st
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24378 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Терпеть не могу, когда мне говорят, что делать`, uk: `Терпіти не можу, коли мені кажуть, що робити`, es: `No soporto que me digan qué hacer`, choices: [ `I resent being told
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24410 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мне кажется, что это решение весьма сомнительное`, uk: `Мені здається, що це рішення досить сумнівне`, es: `Al parecer, esta decisión es bastante dudosa`, choices: [ `Seemin
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25059 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ordinal: index + 1, ru: entry.ru, uk: entry.uk, es: entry.es, choices: [...entry.choices], correct: Array.isArray(entry.correct) ? [...entry.correct] : entry.correct, explanation
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25295 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: entry.ru, uk: entry.uk, es: entry.es ?? entry.ru, choices: shuffledChoices, correct: newCorrect, answer: primaryAnswer, answerAlternatives, explanations: shuffledExplanations
- [warning] locale-object-missing-all-planned-locales app/quiz_data_es_l2.ts:158 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Верно: испанская формулировка соответствует подсказке и уроку.', uk: 'Вірно: іспанська формулювання відповідає підказці й уроку.', es: 'Correcto: la opción encaja con el enu
- [warning] locale-object-missing-all-planned-locales app/quiz_data_es_l2.ts:167 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Ошибка: проверьте, нужен ser (идентичность, классификация) или estar (состояние, место).', uk: 'Помилка: перевірте ser проти estar (ідентичність чи стан/місце).', es: 'No en
- [warning] locale-object-missing-all-planned-locales app/quiz_data_es_l2.ts:174 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Ошибка: отрицание — слово no и форма глагола должны согласоваться с образцом.', uk: 'Помилка: заперечення — no і форма дієслова мають відповідати зразку.', es: 'No encaja: l
- [warning] locale-object-missing-all-planned-locales app/quiz_data_es_l2.ts:180 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: 'Ошибка: смотрите согласование, артикль или время глагола в этом уроке.', uk: 'Помилка: перевірте узгодження, артикль або час дієслова.', es: 'No encaja: revisa concordancia,
- [warning] locale-object-missing-all-planned-locales app/quiz_data_es_l2.ts:230 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { questionId: `es-l2|L${lessonId}|id${phrase.id}|s${slot}`, skillTag: LESSON_SKILL_TAG[lessonId] ?? 'gramatica', reviewerFlag: null, difficultyStars: starsForSlot(slot), type: 'MCQ
- [warning] locale-object-missing-all-planned-locales app/settings_invite_friend.tsx:28 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: { title: 'Пригласить друга', heroTitle: 'Зови друга — \nполучите бонус оба', heroSub: 'Phraseman становится веселее с друзьями. А ещё за это мы насыпем вам обоим осколки знан
- [warning] locale-object-missing-all-planned-locales components/share_cards/LingmanCertificateSvg.tsx:51 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: { eyebrow: 'PHRASEMAN APP', sub: 'Внутренний тест · 2026', title: `PHRASEMAN ${CERT_LEVEL}`, presented: 'Награда вручена пользователю', achievement: `достиг(ла) уровня ${CERT
