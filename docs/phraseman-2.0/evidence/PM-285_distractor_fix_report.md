# PM-285 — guess_phrase дистракторы: аудит и итог (2026-09-24)

Только чтение + один новый скрипт-валидатор. Ничего не публиковалось, функции
Арены не трогались, пул не переписывался — правка не потребовалась.

## Что проверялось

Правило владельца (T42, D55) и методика
`docs/arena/ARENA_DISTRACTOR_AUDIT_2026-08-21.md`: в режиме `guess_phrase`
все три неверных варианта обязаны быть ТОЛЬКО грамматически неверными, не
смысловыми/лексическими подменами.

Аудит от 2026-08-21 нашёл нарушение в старом ЖИВОМ пуле `tpool_20260801_v10`:
4439 из 4479 дистракторов были `lexical_meaning`.

## Находка: текущие файлы уже V11, не V10

`content/arena-multilingual/generated/{es,de,fr}/tasks.jsonl` закоммичены
**2026-09-20** (`git log -1`) — позже даты аудита (24.08). Это уже не тот
пул, который проверял аудит: manifest.json подтверждает `verdict: "BLOCK"`
(публикация ещё не разрешена), а не факт содержания. Аудит сам предсказывал
это: раздел "Raw capacity" насчитал у V11-селектора положительный запас
чисто грамматических кандидатов для `guess_phrase` (470/554/469 нужно из
2504/4042/1861 доступных).

## Новый скрипт-валидатор

`scripts/validate_arena_guess_phrase_distractors.mjs` — читает
`grammarMatrix` и `distractorReasons` каждого `guess_phrase`-задания,
проверяет:
- ровно 4 варианта, `options[]` совпадает с `grammarMatrix.options[].token`;
- ровно один `grammatical: true`, и `correctIndex` указывает именно на него;
- каждая причина неверного варианта НЕ содержит запрещённых слов
  (`lexical`, `meaning`, `collocation`, `reference`, `function_choice`,
  `situation`, `synonym`, `false_friend`, `politeness`, `stylistic`) — список
  взят из явного запрета в самом аудите ("reject lexical_meaning,
  collocation, reference, and function_choice").

## Результат прогона (2026-09-24)

```
es: PASS  tasks=1493  failingTasks=0  distractors=4479  forbiddenReasonDistractors=0
de: PASS  tasks=1493  failingTasks=0  distractors=4479  forbiddenReasonDistractors=0
fr: PASS  tasks=1493  failingTasks=0  distractors=4479  forbiddenReasonDistractors=0

Verdict: PASS — all guess_phrase tasks are grammar-only
```

Все 3 языка × 1493 задания × 3 дистрактора = **13 437 дистракторов, 0
нарушений**. Единственная зафиксированная причина — `verb_person_conflicts_
with_fixed_subject` (несовпадение лица глагола с фиксированным подлежащим) —
чисто грамматическая категория. Правка контента не потребовалась: PM-285-A1
и PM-285-A2 (acceptance) выполняются данными «как есть».

## Английский пул — вне зоны проверки этой сессии

Английский `guess_phrase`-контент живёт в Firestore (`tournamentBank` /
`tournamentTasks`, см. `functions/src/tournament_core.ts:36,40`), а не в
файле репозитория (`ARENA_POOL_TASK_COUNT` для `target === 'en'` равен `0` —
`functions/src/arena_content_generation.ts:95`). Эта сессия не делала запросов
к проду (правило задачи), поэтому английский пул **не проверен** этим
прогоном. Preflight (`PM-270_pool_preflight.md`) отмечает его количество как
`unknown`. Отдельная сессия с доступом к Firestore должна прогнать тот же
аудит по живым `tournamentTasks` документам английского языка, фильтруя
`mode === 'guess_phrase'`.

## Итог по acceptance

| Критерий | Статус |
|---|---|
| PM-285-A1 (es/de/fr/en — только грамматические дистракторы) | es/de/fr: **подтверждено** валидатором. en: **не проверено** (данные в Firestore, вне доступа read-only сессии) |
| PM-285-A2 (повторный аудит по методике аудита — 0 смысловых подмен) | es/de/fr: **0 подмен**, подтверждено. en: не проверено |

## Что осталось для контентного пайплайна (Codex)

Ничего исправлять для es/de/fr не требуется — контент уже соответствует
правилу. Единственный открытый пункт — проверка английского пула в
Firestore, что требует отдельной сессии с доступом к прод-данным (см. выше).
