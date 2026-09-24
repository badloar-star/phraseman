# PM-286 — задания на слух/голосом из Learning V2 (2026-09-24)

Только чтение источника + один новый конвертер-скрипт, который пишет ОДИН
черновой файл. Функции Арены и живой пул не тронуты. Голосовое распознавание
(STT) не реализовывалось — правило T22 («голос не снимает сердце») уже живёт
в `modules/spire/step_machine.ts` (`submitSpireVoiceVerdict`) и здесь не
менялось.

## Формат заданий Шпиля (что искали)

`functions/src/tournament_core.ts` — `TournamentTaskKind`:
- `listen` — услышал фразу → выбрал вариант (`audioUri`, `phrase`, `options`,
  `correctIndex`); фингерпринты сервер не выдаёт (kind не входит в
  `answerFingerprintsForTask`), проверка полностью локальная —
  `modules/arena/answer_check.ts` (`arenaAnswerIsCorrect`, kind `'listen'`
  сравнивается как `'choice'`).
- `dictate` — услышал фразу → собрал из чипов (`audioUri`, `phrase`,
  `wordBank`, `correctTokens`); словарь чипов обязан содержать ровно на один
  «лишний» токен больше, чем в ответе (`hasStrictTranslateBuildFieldContract`
  косвенно; фактически `wordBank.length = correctTokens.length + traps`,
  для dictate используется тот же принцип «один капкан»).
- `voice` — отдельный контракт (`phrase`+`reference`, `isVoice: true`),
  **этой сессии не касается** — это T22/шаг «Шпиль: голосовой ответ»,
  логика верификации уже написана отдельно.

## Что нашлось в Learning V2

`content/learning-v2-course/release/<lang>/l*/s*/learner.json` — 155 файлов
сессий, ТОЛЬКО `en` (изучаемый язык — английский; `targetLanguage: "en"` в
каждом файле). Разбивка по семействам взаимодействий (все 155 файлов):

| family | count | к какому kind Шпиля годится |
|---|---:|---|
| `listen_choose` | 896 | `listen` |
| `context_gap_grammar` | 578 | (не аудио, не в PM-286) |
| `phrase_builder` | 533 | (не аудио, не в PM-286) |
| `scripted_repeat_compare` | 267 | голос (T22, отдельно) |
| `listen_build_dictation` | 194 | `dictate` |
| `speed_match` | 184 | уже есть свой формат в пуле Арены |
| `sound_contrast` | 39 | `listen` (минимальные пары, как `contrast`-поле) |

## Языковое покрытие — честно

**Learning V2 покрывает ТОЛЬКО английский язык.** Проверено прямым поиском
`learner.json` по всему репозиторию (кроме `.codex-tmp`/`tmp` черновиков —
там тоже только `en`):
- `content/learning-v2-course/release/en/` — 155 файлов, реальный контент;
- `content/learning-v2-course/curriculum/de/` — 1 файл,
  `REQUIREMENT_MANIFEST_V1.json` — только требования, ни одной сессии;
- `content/learning-v2-course/curriculum/fr/` — 2 файла, тот же случай;
- `es` как ЦЕЛЕВОЙ язык курса в Learning V2 не встречается вообще (только
  `es` как целевой ЯЗЫК АРЕНЫ, что не то же самое).

Формулировка в `PM-270_pool_preflight.md` («Learning V2 сейчас в основном
испанский курс») **не подтвердилась** при чтении файлов — фактически это
курс английского языка. Уточнение зафиксировано здесь как факт для будущих
сессий; сам preflight-файл не переписывался (evidence чужой сессии).

Следствие: конвертер закрывает `listen`/`dictate` содержимым только для
**английского** Шпиля. Для es/de/fr в Шпиле такого источника нет — либо
ждать отдельного контентного пайплайна (Codex, как и guess_phrase), либо
временно не давать этим языкам аудио-этажи.

## Конвертер

`scripts/convert_learning_v2_to_spire_listen_tasks.mjs` — читает все
`learner.json` под `content/learning-v2-course/release/en/**`, конвертирует:

- `listen_choose` → `listen`: правильный вариант ищется по совпадению
  `responseOptions[].text` с `referenceAudio.transcript`; если совпадения нет
  (34 случая — экран проверки значения, а не произношения, варианты на
  русском), правильный вариант определяется по `choiceFeedback` (вариант без
  пометки `correct: false`, при ровно одном таком кандидате).
- `listen_build_dictation` → `dictate`: `hiddenTargetPhrase` → `phrase`,
  `orderedTokens` → `correctTokens`, `wordBank` = токены ответа +
  `authoredDistractorTokens` (детерминированно перемешаны по хешу
  `interactionId`, без `Math.random`, чтобы повторный запуск давал тот же
  файл).

Запись НЕ помечена `verified: true` и НЕ содержит V11-полей провенанса/хешей
(`semanticSignature`, `contentSha256` и т.д.) — по контракту
`validateTournamentTask` это делает черновик непубликуемым до отдельного
ревью, что и требуется («НЕ реализуй STT», «не выдумывай тексты»).

## Результат прогона (2026-09-24)

```
source files: 155
listen_choose seen: 896 -> converted: 493
listen_build_dictation seen: 194 -> converted: 118
total draft tasks written: 611 -> /content/arena-multilingual/generated/en/spire_listen_dictate_draft.jsonl
skip reasons: {
  "too_few_options": 401,
  "distractor_token_count_2_expected_1": 8,
  "distractor_token_count_3_expected_1": 18,
  "distractor_token_count_0_expected_1": 50,
  "no_reference_audio": 2
}
```

- 401 `listen_choose` пропущены — это «карточки слова» (`isWordCard: true`,
  0 вариантов ответа), не тестовые задания, конвертировать не во что.
- 76 `listen_build_dictation` пропущены — авторский набор дистракторов не
  содержит ровно 1 «капкан» (0, 2 или 3), что не совпадает с контрактом
  Шпиля `dictate` (ровно один лишний токен). Это не ошибка V2 — там своя
  механика подсказок; чтобы использовать эти 76, нужно решение, добавлять ли
  автоматически недостающие капканы или урезать лишние (лингвистическая
  задача, не для этого скрипта).
- 611 черновых заданий (493 `listen`, 118 `dictate`) успешно собраны из
  реальных V2-текстов, без единой придуманной фразы.

## Незакрытый вопрос: `audioUri`

`TournamentTask.payload.audioUri` (kind `listen`/`dictate`) ожидает готовую
ссылку на озвучку. По решению D47 скачивание bundled-озвучки V2 убрано —
V2 использует голос телефона (on-device TTS) за пределами стартового пакета
~4 МБ. Конвертер пишет плейсхолдер `device-tts:<lang>:<hash>` и помечает
каждую задачу `needsAudioResolution: true` — **не решает**, как в реальности
Шпиль получит звук (записанный файл в Storage vs runtime TTS на клиенте).
Это архитектурное решение для отдельной сессии/владельца, не для конвертера.

## Итог по acceptance

| Критерий | Статус |
|---|---|
| PM-286-A1 (найдены V2-тексты/режимы, собран конвертер) | **выполнено**: 611 черновых заданий (493 listen + 118 dictate), конвертер `scripts/convert_learning_v2_to_spire_listen_tasks.mjs` |
| PM-286-A2 (звук проверен на устройстве) | **не выполнено этой сессией** — `audioUri` не разрешён до реального URI/TTS-вызова; проверка на устройстве требует рабочего звукового пути, которого пока нет (см. «Незакрытый вопрос» выше) |

## Что осталось для контентного пайплайна / отдельной сессии

1. Решить архитектуру `audioUri` для Шпиля (записанный файл vs on-device
   TTS) — от этого зависит, можно ли вообще считать 611 черновиков
   публикуемыми.
2. es/de/fr не имеют источника в Learning V2 — нужен отдельный контентный
   пайплайн (тот же Codex-путь, что и для guess_phrase дистракторов в этих
   языках, если там когда-то потребуется новый набор).
3. 76 пропущенных `listen_build_dictation` с «неправильным» числом капканов —
   решить политику (дополнять/обрезать) прежде чем включать их.
4. Черновик не прошёл семантический ревью-пайплайн V11
   (`createTournamentSemanticCandidate`/`validateTournamentSemanticCandidate`)
   — прежде чем публиковать, эти 611 записей нужно провести через тот же
   контур проверки, что и guess_phrase (или создать отдельный контур для
   listen/dictate, если V11-контур для них не рассчитан).
