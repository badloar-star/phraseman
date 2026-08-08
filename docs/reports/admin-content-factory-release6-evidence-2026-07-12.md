# Admin Content Factory — Release 6 evidence (2026-07-12)

## Итог

Release 6 реализует независимую Arena Studio: редактируемая тема, строго десять вопросов в батче, отдельный Arena prompt v4, ledger покрытия и дедупликации, повтор только целого неудачного батча, preview/draft seal и адаптер в действующий runtime Арены.

Автопубликации нет: результат остаётся draft до просмотра и ручного подтверждения администратора.

## Runtime и безопасность

- Прослежен действующий `ArenaQuestion` и release loader: A1–B2, ровно четыре варианта, строка `correct` и `correctIndex`, серверный `rand`, таймер матча 40 секунд.
- Генератор не управляет `rand`, таймером или scoring policy.
- Runtime adapter fail-closed проверяет локали, уровень, допустимый тип, четыре уникальных варианта, идентичность ответа, время 2–12 секунд, ссылки на источники и уникальные runtime ID.
- Старый формат `{ prompt, answer, options }` сохранён тестами обратной совместимости.
- Проектный OpenAI API key, deployed callable и Firebase staging для smoke не использовались.

## Качество Arena

- `arena_questions:v4` требует естественный и осмысленный английский во всех вариантах, ровно один ответ и честную калибровку easy/medium/hard в пределах A2.
- В каждом батче из 10 каждый `correctIndex` встречается 2–3 раза; запрещена серия длиннее двух одинаковых позиций.
- Два батча дают 20 уникальных semantic keys и суммарную сложность 6 easy / 8 medium / 6 hard.
- `sourceReferences` могут быть пусты для отдельной темы, не извлечённой из утверждённого корпуса; это явно отражено в smoke uncertainty.

## Smoke evidence

Актуальный обезличенный пакет: `.codex-tmp/admin-content-factory-r6-smoke/run4`.

- Topic → batch 1 → намеренно невалидный batch 2 из 9 элементов → чистый retry из 10 → preview/draft seal.
- Невалидный батч отклонён и не изменил ledger.
- Ledger revision 2, 20 уникальных ключей, идемпотентный replay пройден.
- Runtime preview: 20 вопросов, 20 уникальных ID, все `correct === options[correctIndex]`.
- Позиции: batch 1 `[3,3,2,2]`, batch 2 `[2,2,3,3]`, глобально `[5,5,5,5]`, максимальная серия 1.
- Manifest SHA-256: `066f21c5b8de2e57e0a061aa0118933b6a86375bf6a9a466e626d9c0ef237dc1`; все восемь файлов и sidecar перепроверены независимо.

Языковой цикл потребовал четыре smoke run. Advisor отклонял предсказуемые позиции, искусственные distractors, неверную сложность hard и двусмысленное `после трёх часов`. В run4 все дефекты устранены; получены две последовательные редакторские оценки `DECISION: APPROVED` по всем 20 вопросам.

## Проверки

- Functions: 12 suites, 126 tests passed; TypeScript build passed.
- Admin: 3 suites, 18 tests passed.
- `node --check`: `content-generator.js` и `admin-core.js` passed.
- Smoke validators, ledger rollback/idempotency, runtime serialization и manifest hashes passed.
- Первый полный прогон после усиления fairness корректно выявил две устаревшие фикстуры с `correctIndex=0`; фикстуры приведены к новому production-инварианту, повторный полный прогон зелёный.

## Известная граница

`expectedAnswerTimeMs` — редакторская QA-оценка, а не результат измерения на реальных игроках. Runtime timeout остаётся 40 секунд. Эмпирическую телеметрию скорости следует собирать только после контролируемого rollout в Release 7.
