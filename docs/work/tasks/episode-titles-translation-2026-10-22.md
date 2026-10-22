# Task packet: названия 168 эпизодов уроков 1–3 на 8 языков (Переводчик, координатор 22.10)

Governance-ID: TG-4C8AFD3C9E99
Status: Done — модуль готов, подключает Learning V2
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Источник — колонка «Финал» в `docs/work/tasks/episode-names-rule.md` (8be1476ad, 12 · ТЕОРИЯ) и
`docs/work/tasks/episode-names-final-l01-l03.json`. Переводы uk, en, es, pt-BR, vi, id, tr, pl по правилу автора:
≤ 2 слов (предлоги считаются, слово через дефис — одно; vi — ≤ 4 слогов), крючок деталью сюжета, не дословно,
без грамматики, без повторов внутри урока, английское название не подсказывает ответ эпизода (сверено скриптом с
английскими ответами `content/learning-v2-course/release/en/lNN/sNN/answers.json` — только чтение).

Хранение — как предложено в 565de0a0d: новый файл `modules/learning-v2/titles/session_titles_i18n_v1.ts` (вне
Codex-зоны), ключ «урок.эпизод», доступ `learningV2SessionTitleForLocaleV1(lesson, session, locale)` с откатом:
перевод → для ru/uk русское название → `null` («Эпизод N»). Подключает Learning V2.

## Scope

In scope: файл переводов и функция доступа. Out of scope: подключение к карте, «Сезону», «Продолжить», итогу экзамена
(Learning V2); русские названия (12 · ТЕОРИЯ применяет своим скриптом).

## Architecture

Новый модуль без зависимостей, кроме генерируемого русского файла (для отката ru/uk). Генерируемый файл и Codex-зона
не меняются.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.
- Сцены глав и арки уроков пока только по-русски — отдельный заход.

## Verification

Скрипт проверки: 168 ключей × 8 языков, ≤ 2 слов, ≤ 20 знаков, кириллица только в uk, без повторов в уроке, en без
слов из ответа своего эпизода; `babel.parseSync` модуля.

## Rollback

`git revert <коммит>`.

## Результат проверки

168 × 8 — ок. Скрипт поймал и исправлены 7 мест: 6 английских названий содержали слово из ответа своего эпизода
(«Wrong platform» → «Platform mix-up», «Old wardrobe» → «Antique wardrobe», «First box» → «First carton», «Street windows» →
«Shop displays», «Next building» → «Nearby block», «Sofa shade» → «Couch shade»), id «Bos baik hati» (3 слова) → «Bos ramah».
Функция доступа проверена: ru → русское, en/tr → перевод, урок без перевода и неизвестный язык → null («Эпизод N»).
