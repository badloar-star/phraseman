# I18N_FALLBACK_5LANG_R1 — pt-BR / vi / id / tr / pl без своего ключа (замер 12.10)

Повод (координатор 12.10, 🔴): `triLang` требует только ru/uk/es; при отсутствии ключа pt-BR/vi/id/tr/pl отдавал **русский**, а эти языки
видимы в выпуске (`INTERFACE_LANG_READY_FOR_PROD`). Метод: синтаксическое дерево TS по app/components/modules/hooks/constants, словарь =
объектный литерал с ключами ru+uk+es (форма, которую принимает triLang). Скрипт замера — scratchpad сессии Авторизации (одноразовый).

Всего словарей: **8388**. Без хотя бы одного из 5 ключей: **2453**. 
После страховки (свой ключ → en → ru) в русский по-прежнему уходят: **434** (нет ни своего, ни en).

## По разделам R1

| раздел | словарей | без хотя бы одного из 5 | до страховки → ru | после страховки → en | после страховки → ru (кандидаты на перевод) |
|---|---|---|---|---|---|
| Главная | 33 | 0 | 0 | 0 | 0 |
| Карточки | 617 | 50 | 50 | 46 | 4 |
| Диалоги | 272 | 28 | 28 | 28 | 0 |
| Шпиль | 12 | 0 | 0 | 0 | 0 |
| Настройки | 103 | 2 | 2 | 2 | 0 |
| Пейволы | 228 | 0 | 0 | 0 | 0 |
| Онбординг | 77 | 40 | 40 | 0 | 40 |
| Энергия | 48 | 3 | 3 | 3 | 0 |
| Уроки и Learning V2 | 5190 | 2178 | 2178 | 1829 | 349 |
| Прочее | 1808 | 152 | 152 | 111 | 41 |

## По языкам (число словарей без ключа; в скобках — уходят в en / в ru после страховки)

| раздел | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|
| Главная | 0 (0/0) | 0 (0/0) | 0 (0/0) | 0 (0/0) | 0 (0/0) |
| Карточки | 50 (46/4) | 50 (46/4) | 30 (26/4) | 50 (46/4) | 50 (46/4) |
| Диалоги | 28 (28/0) | 28 (28/0) | 28 (28/0) | 28 (28/0) | 28 (28/0) |
| Шпиль | 0 (0/0) | 0 (0/0) | 0 (0/0) | 0 (0/0) | 0 (0/0) |
| Настройки | 2 (2/0) | 2 (2/0) | 2 (2/0) | 2 (2/0) | 2 (2/0) |
| Пейволы | 0 (0/0) | 0 (0/0) | 0 (0/0) | 0 (0/0) | 0 (0/0) |
| Онбординг | 40 (0/40) | 40 (0/40) | 40 (0/40) | 40 (0/40) | 40 (0/40) |
| Энергия | 3 (3/0) | 0 (0/0) | 0 (0/0) | 0 (0/0) | 0 (0/0) |
| Уроки и Learning V2 | 2146 (1800/346) | 2178 (1829/349) | 2175 (1826/349) | 2178 (1829/349) | 2176 (1829/347) |
| Прочее | 152 (111/41) | 102 (61/41) | 102 (61/41) | 102 (61/41) | 102 (61/41) |

## Остаток «ни своего, ни en» — файлы (кандидаты на перевод)

- **Карточки**: `hooks/use-flashcards.ts` (4)
- **Онбординг**: `components/onboarding_aha/aha_scenes.ts` (40)
- **Уроки и Learning V2**: `app/theory_content_lesson1.ts` (24), `app/theory_content_lesson3.ts` (22), `app/theory_content_lesson10.ts` (16), `app/theory_content_lesson19.ts` (15), `app/theory_content_lesson20.ts` (15), `app/theory_content_lesson26.ts` (15), `app/theory_content_lesson28.ts` (15), `app/theory_content_lesson25.ts` (13), `app/theory_content_lesson18.ts` (12), `app/theory_content_lesson9.ts` (12), `app/theory_content_lesson2.ts` (11), `app/theory_content_lesson27.ts` (11), `app/theory_content_lesson30.ts` (11), `app/theory_content_lesson8.ts` (11), `app/theory_content_lesson23.ts` (10), `app/theory_content_lesson24.ts` (10), `app/theory_content_lesson31.ts` (10), `app/theory_content_lesson7.ts` (10), `app/theory_content_lesson15.ts` (9), `app/theory_content_lesson16.ts` (9), `app/theory_content_lesson21.ts` (9), `app/theory_content_lesson5.ts` (8), `app/theory_content_lesson12.ts` (7), `app/theory_content_lesson13.ts` (7), `app/theory_content_lesson14.ts` (7), `app/theory_content_lesson17.ts` (7), `app/theory_content_lesson29.ts` (7), `app/theory_content_lesson6.ts` (7), `app/theory_content_lesson11.ts` (6), `modules/learning-v2/content/source/session_shard_from_source_v1.ts` (6), `app/theory_content_lesson22.ts` (5), `app/theory_content_lesson4.ts` (5), `app/theory_content_lesson32.ts` (4), `modules/learning-v2/content/source/episode_01_sessions_25_32_support_v1.ts` (2), `app/learning_v2_course_session_save_card_v1.ts` (1)
- **Прочее**: `app/preposition_explanations.ts` (40), `app/quiz_data_es_l2.ts` (1)

Почти весь остаток — учебный контент, а не подписи интерфейса: теория уроков (`app/theory_content_lesson*.ts`), объяснения предлогов
(`app/preposition_explanations.ts`), сцены онбординга «ага» (`components/onboarding_aha/aha_scenes.ts`, 40). Переводить их или скрывать для этих
языков — решение владельца/координатора (таблица D129/D130 — про язык изучения, не интерфейса).

## Другие пути выбора языка

- `legacyRuUk(lang)` и `bundleLang(lang)` (constants/i18n.ts) для pt-BR/vi/id/tr/pl тоже возвращают `ru`: словари там только ru/uk/es, en нет.
  Вызовы: `app/flashcards/deck_selection.ts` (3), `app/hint.tsx`, `app/lesson_theory_v2.tsx`, `app/exam.tsx` (2), `components/ExamResultPreviewAdminModal.tsx`.
  Страховка en к ним неприменима; вариант — `es` для этих 5 языков (как уже сделано для en). Не менял — решение координатора.

## Страховка (сделано)

`triLang` для pt-BR/vi/id/tr/pl: свой ключ → `en` → `ru` последним; ru/uk/es/en — без изменений. Журнал `[I18N-FALLBACK] lang=…→en|ru` раз на
строку и язык, только в dev (в магазинной сборке молчит). Тест `tests/i18n_five_lang_fallback.test.ts` 17/17.

## Достижимость остатка (дополнение 12.10, по запросу координатора)

Поправка замера: ключ `ptBr` (camelCase) засчитан как pt-BR — без хотя бы одного из 5 ключей **2400** словарей (было 2453: 53 словаря
предлогов и энергии пишут `ptBr`). Остаток «ни своего, ни en» — по-прежнему **434**. Но для двух файлов важнее не ключи, а то, КАК экран
выбирает язык:

| Файл (словарей в остатке) | Достижимо на экранах R1? | Что видят pt-BR/vi/id/tr/pl | Почему |
|---|---|---|---|
| `app/theory_content_lesson*.ts` (349 из 903) | **ДА** — Уроки → меню урока → «Правила и объяснения» (`app/lesson_menu.tsx` ~1155 → `/hint`, `/lesson_theory_v2`); курс для английского открыт (D129, `learning_language_surface_readiness.ts`) | **РУССКИЙ во всех 903 словарях теории**, не только в 349 | `hint.tsx: theoryContentLang` и `lesson_theory_v2.tsx: contentKey` выбирают только ru/uk/es: `lang === 'es' ? 'es' : legacyRuUk(lang) === 'uk' ? 'uk' : 'ru'` — triLang и его страховка сюда не доходят. ⚠️ **Английский интерфейс тоже получает РУССКУЮ теорию**, хотя ключ `en` есть в 563 из 903 словарей. Пункт меню при этом переведён — человек жмёт «Rules and explanations» и видит кириллицу |
| `app/preposition_explanations.ts` (40 из 120) | **ДА** — Уроки → меню урока → тренировка предлогов (`app/preposition_drill.tsx`, `lesson_menu.tsx`) | **ИСПАНСКИЙ** (не русский) в 40 объяснениях; в 80 — свой язык | экран берёт `explainPtBr ?? explainES ?? explainRU` (`preposition_drill.tsx:528`) — до русского не доходит |
| `components/onboarding_aha/aha_scenes.ts` (40) | **НЕТ** — мёртвый код (Ядро: сцена убрана из потока 16.08) | — | — |
| `app/quiz_data_es_l2.ts` (1) | **НЕТ** — файл никто не импортирует | — | — |
| `hooks/use-flashcards.ts` (4) | ДА, но это **контент карточек** (переводы слов «Душ», примеры), выбирается по языку ПЕРЕВОДА карточек ru/uk/es, не по языку интерфейса | перевод на языке, выбранном для карточек | контентный язык — не дыра интерфейса |

**Итог для вопроса владельцу.** Достижимо и показывает кириллицу только одно: **теория уроков** — для 5 языков **и для английского**.
Причина не в недостающих переводах, а в выборе языка экраном. Для английского хватает правки выбора: en → `en`-ключ, где он есть
(563 из 903). Для 5 языков переводов теории нет (2 из 903) — варианты: показать английскую теорию (где есть), испанскую, или скрыть пункт
«Правила и объяснения» для этих языков. Предлоги уже уходят в испанский; сцены «ага» и quiz_data_es_l2 — мёртвый код.
