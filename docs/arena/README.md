# Arena V2 — продуктовый контракт фактической реализации

Статус на 2026-08-11: **реализовано локально, не задеплоено**.

В checkout уже есть client routes, server-authoritative Functions, Firestore
Rules/Indexes, account-delete coverage и узкие тесты. Production Functions,
Rules, Indexes, config и приложение в рамках этой работы не публиковались.
Фактический технический handover находится в [`HANDOVER.md`](./HANDOVER.md).
Контракт реализуемого пакета Arena Today, Match Lab, Ghost, Rivalry, Mastery,
Partner и косметического кошелька находится в
[`EXPANSION_PRODUCT_CONTRACT.md`](./EXPANSION_PRODUCT_CONTRACT.md).

## 1. Что входит в Arena

| Режим | Соперник | Rating | Arena Season Stars | Rare spin |
|---|---|---:|---:|---:|
| Quick | человек в диапазоне ±3 divisions; после 6 с — раскрытый бот | нет | да | да |
| Ranked | только человек, строго ±1 division | да | да | да |
| Friend | конкретный взаимный друг | нет | нет | нет |

В текущей реализации **нет Offline Practice и Rematch**. Кнопка «Играть ещё»
после Friend возвращает на экран приглашений, а после Quick/Ranked запускает
обычный новый поиск.

Бот всегда обозначен как тренировочный соперник. Ranked никогда не имеет
bot fallback. Friend показывает «Без рейтинга и наград».

## 2. Матч из десяти заданий

Порядок и квота фиксированы: по два задания каждого owner-approved Tournament
mode.

```ts
[
  'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
  'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
]
```

Для human match используется меньший division index двух игроков, для bot —
division игрока. Фактический difficulty plan:

```ts
{
  '0-5':   [1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
  '6-11':  [1, 1, 1, 2, 2, 1, 2, 2, 2, 2],
  '12-17': [2, 2, 2, 2, 2, 2, 2, 2, 3, 3],
  '18-23': [2, 2, 2, 3, 3, 3, 3, 2, 3, 3],
}
```

`speed_match` проецирует четыре уникальные пары из опубликованной
Tournament-доски. Сервер выбирает ровно 10 разных task IDs. Текущая версия не
реализует историю последних 60 заданий и не вычисляет semantic signatures.

Источник контента — только `tournamentTasks` версии
`tpool_20260801_v10`. Arena не запускает Tournament runtime, не меняет комнаты,
экспозиции, генераторы или опубликованные задания.
Каждое выбранное задание проверяется по leaf hash и Merkle proof к закреплённому
root полного deterministic v10-пула: правильного `poolVersion` без точного
payload недостаточно.

## 3. Серверное время и состояния

Фактические состояния:

```text
accepting → countdown → task_active ⇄ task_reveal → settled
     └────────────────────────────────────────────→ aborted
```

| Параметр | Значение |
|---|---:|
| Acceptance | 12 000 мс |
| Countdown | 3 200 мс |
| Reading lock | 1 500 мс |
| Receive grace | 1 500 мс |
| Reveal | 1 200 мс |
| Queue lease | 45 000 мс |
| Match/member/private retention marker | 7 суток |

Answer window после reading:

| Mode | Время ответа |
|---|---:|
| `guess_phrase` | 11 000 мс |
| `fill_gap` | 11 000 мс |
| `find_oddity` | 13 000 мс |
| `translate_build` | 18 000 мс |
| `speed_match` | 22 000 мс |

Сервер принимает ответ только для текущего task index, после reading boundary и
не позже абсолютного `stateDeadlineAtMs`. Receive grace не даёт speed benefit:
observed elapsed клампится основным answer window.

Матч начинается только после acceptance всех людей. Бот считается принявшим
матч заранее. До начала decline/forfeit даёт `aborted` без рейтингового
поражения; после countdown Ranked forfeit засчитывается как обычное поражение.

## 4. Competitive scoring и ничья

| Событие | Очки |
|---|---:|
| Обычное задание: правильно | 100 |
| Обычное задание: ошибка/таймаут | 0 |
| `speed_match`: уникальная верная пара | +25 |
| `speed_match`: уникальная ошибка | −5, итог 0…100 |

Победитель определяется в таком порядке:

1. больше total score;
2. больше полностью решённых заданий;
3. если absolute difference суммарного server-observed elapsed меньше 2 000 мс
   — ничья, иначе выигрывает более быстрый.

UID, Premium, streak, first-answer и случайность не участвуют в scoring.

## 5. Ranked ladder

Восемь тиров по три divisions: Bronze, Silver, Gold, Platinum, Diamond,
Master, Grandmaster, Legend; indexes 0…23. Один division равен 100 RP,
`rank = clamp(0, 23, floor(max(0, rating) / 100))`. Rating хранит overflow выше
Legend III и никогда не падает ниже нуля.

| Division соперника относительно игрока | Win | Loss | Draw |
|---:|---:|---:|---:|
| −1 | +16 | −24 | −4 |
| 0 | +20 | −20 | 0 |
| +1 | +24 | −16 | +4 |

Первые 10 секунд Ranked приоритет имеет тот же division, после этого диапазон
остаётся строго ±1. Клиент обновляет lease каждые 15 секунд. На 30-й секунде
появляется ручное предложение Quick, на 90-й — спокойный empty state; серверная
очередь сама по этим UI-порогам не завершается.

Pair policy для Ranked: минимум 30 минут между rated matches одной пары и не
более двух rated matches пары за UTC-день. Резерв создаётся при pairing и
коммитится только после acceptance обоих.

Rolling forfeit cooldown: после первого/второго/третьего Ranked forfeit за
24 часа — 2/10/30 минут соответственно.

## 6. Quick и бот

Quick ищет человека в ±3 divisions. Через 6 секунд отдельный callable повторно
сканирует до 10 старейших waiting candidates, читает их актуальные profiles и
пропускает уже занятых. Только если подходящего свободного человека нет,
создаётся bot match.

Bot blueprint фиксируется до старта и не зависит от прогресса игрока:

```text
accuracy = clamp(0.55, 0.88, 0.58 + divisionIndex × 0.012)
median response = 7500 − divisionIndex × 150 ms
log-normal sigma = 0.35
response clamp = 1500 … answerDeadline − 700 ms
timeout chance = 3%
mode modifiers = +2/0/−3/−5/−2 percentage points
```

Модификаторы перечислены в порядке `guess_phrase`, `fill_gap`, `find_oddity`,
`translate_build`, `speed_match`.

## 7. Arena Season и награды

Arena Season — непрерывные фиксированные циклы по 63 UTC-дня с epoch
`2026-08-01T00:00:00Z`. ID имеет вид `arena-YYYY-MM-DD` по дате начала.

За обычный правильный ответ difficulty 1/2/3 начисляется 3/4/5 Arena Stars.
Для `speed_match`: `matched + fullBoardBonus − wrongAttempts`, clamp 0…6;
`fullBoardBonus = difficulty − 1` только при всех четырёх парах.

Первые четыре eligible Quick/Ranked матча UTC-дня дают 100% stars, следующие
два — 50% с округлением вниз, дальнейшие — 0%. Общий дневной cap — 160.
Friend не начисляет stars и не расходует eligible counter.

Season track: 72 уровня по 50 stars, всего 3 600. На каждом уровне можно
отдельно забрать free и, при действующем Plus, plus reward. Каждый десятый
уровень даёт spin credit; остальные — 5 shards на free side и 15 shards на
plus side. Plus не меняет score, rating, matchmaking, drop chance или pity.

Rare match spin требует минимум 8 собственных submitted answers, один drop
максимум за UTC-день и reward eligibility первых шести матчей:

| Матч | Chance |
|---|---:|
| Quick bot | 0,25% |
| Quick human | 0,5% |
| Ranked human | 1% |
| Friend | 0% |

Pity гарантирует drop на 80-м eligible roll. Pity хранится в
`arena_v2_profiles`, поэтому не сбрасывается на границе 63-дневного сезона.
Claim spin детерминирован server HMAC и выдаёт shards: 70% → 5, 25% → 10,
5% → 20. Покупаемого competitive advantage нет.

### Граница Learning V2

Доказанный invariant текущего кода: Arena не импортирует и не пишет Learning V2
wallet/star/access namespaces. Arena Stars и Arena ledger отдельны. Этот
документ не расширяет и не переопределяет Learning V2 economy.

## 8. Friend duel

Invite token — HMAC-SHA256 от двух stable IDs и случайного client request ID;
в Firestore хранится только SHA-256 token hash. TTL — 24 часа, максимум пять
pending invites одновременно и 20 созданий за UTC-день.

Create и Accept требуют reciprocal friendship docs; Accept повторно проверяет
guest, TTL, moderation/current auth host и отсутствие active match у обоих.
Matched queue блокирует Accept, waiting queue обоих отменяется атомарно. Guest
идёт через `phraseman://arena/invite/<token>`, host автоматически видит новый
match через owner-profile listener и переходит в acceptance.

Отдельный block-state guard не реализован: backend полагается на удаление
friendship docs при блокировке. Это должно быть подтверждено social-safety QA
до deploy.

## 9. Arena Expansion — фактический scope

Поверх базовых дуэлей локально реализованы отдельные fail-closed surfaces:

| Surface | Фактическое поведение |
|---|---|
| Arena Today | один sealed 10-task challenge на UTC-день и division band; 20 минут; максимум 30 stars |
| Match Lab | owner-only review 30 дней, verdict/time/explanation и до 3 recovery tasks |
| Verified Mastery | первые signature impressions за 60 дней, rolling 40/mode, thresholds 50/65/80/90 |
| Ghost Duel | тот же snapshot завершённого Today/Quick/Ranked, 48 ч на accept, 20 минут, zero economy |
| Rivalry | direct 30-second mutual offer после human Quick/Ranked; games 2/3 в unrated `series` mode |
| Arena Partner | до 5 partners, lazy shared-day claim, 3/5-day stars, opt-in preset nudge |
| Cosmetic Store | 13 permanent direct-choice items каталога `arena-cosmetics.v1` |

Ghost ограничен тремя active outgoing и десятью creates/UTC-day; на пару может
быть только один awaiting/playing Ghost. Completed result доступен обоим
участникам 7 дней. В Firestore хранится только hash capability; raw token
восстанавливается Functions HMAC и связан с target auth.

Rivalry считает исходный матч game 1. Public result передаёт только
`seriesId/fromSeat/expiry`, поэтому второй игрок видит offer через уже активный
participant-safe listener и принимает одним нажатием. Mute, leave и best-of-3
server-authoritative. Одновременный propose двух устройств покрыт emulator
race-smoke: оба видят одну series, Accept создаёт ровно одну game 2.

Partner activity создаётся только Quick/Ranked/Today settlement при минимум
8 submitted answers. Friend/Ghost/Series не учитываются. Claim лениво читает
activity двух игроков; постоянного fan-out или online/last-seen нет. Nudge
требует target opt-in, quiet hours 22:00–08:00 UTC и приходит только в
owner notification center. Partner invite также создаёт owner-only in-app
notification без capability token; при Accept она удаляется атомарно.

## 10. Spendable Arena Stars и косметика

Expansion различает две проекции:

- `season.stars` — gross progress сезонного пропуска;
- `profile.starWalletBalance` — постоянный тратимый кошелёк.

Обычный earn exact-once увеличивает обе проекции; cosmetic purchase уменьшает
только wallet. Today даёт до 30/day, Mastery thresholds — до 500 lifetime,
Partner Spotlight — до 30/week. Ghost и Rival games 2/3 всегда дают ноль RP,
stars, spin, pity, Mastery и Partner activity.

Каталог содержит titles 250/400/600, reaction packs 300/500, result themes
400/600/900, victory stamps 500/800 и entrances 800/1200/1800. Все 13 IDs
имеют client treatment; реакции пока локальны и не отправляются сопернику.
Покупаемого competitive advantage нет. Learning V2 economy остаётся отдельной.

## 11. Явно не shipped

В текущем snapshot нет Today percentile, friend-cohort comparison, Match Lab
turning point/question contribution и Partner copy «Ты сделал свою часть».
Backend не возвращает эти поля, UI не должен имитировать их. Это post-launch
gated работа с отдельными aggregation/privacy/device tests.

## 12. Интерфейс и доступность — фактический scope

Реализованы Hub, Quick/Ranked matchmaking, live match, results, friend invite,
ranks, 72-level season track и все Expansion detail routes. Во время поиска
клиент слушает только собственный queue doc; после match — только
participant-safe public match doc. Expansion Hub/detail загружают bounded
callable summaries без постоянного listener; Rival offer переиспользует result
match listener.

Home остаётся читаемым при `enabled=false`, возвращает safe active state и
`availability` для всех шести flags. Hub показывает maintenance, блокирует
Quick/Ranked/Friend и скрывает spin CTA по этим значениям; незавершённый матч
можно восстановить. Season entry остаётся видимым, а claim дополнительно
fail-closed проверяется `rewardsEnabled` на сервере.

Текущие motion defaults переиспользуют Tournament V2: press 120 мс, fast
180 мс, normal 240 мс, task swap 260 мс, celebrate 420 мс. Reduced Motion
заменяет вход задания на fade 120 мс и отключает result confetti. Score/stars
count-up учитывает Reduced Motion. Lime surfaces используют тёмный foreground.

Отдельная звуковая и haptic cadence матча пока не реализована; есть только
общий haptic на Arena Home card. Device screen-reader, large-font, sound-off и
haptics-off QA не выполнялся.

## 13. Фактическая готовность

Локально зелёные pure/source/client/account-delete/Jarvis tests (последний
focused run: Functions 7 suites/89 tests, app 11 suites/203 tests) и четыре
Firestore emulator suites: base gameplay 4, Rules 5, Expansion gameplay 5,
Rival gameplay 2.
Не пройдены реальные two-device races, полная economy/spin concurrency,
instrumented billing и device QA.

Следовательно, Arena **не готова к production deploy**. Точные команды,
namespace, callable API, cost envelope, manual prerequisites и известные
blockers перечислены в [`HANDOVER.md`](./HANDOVER.md).
