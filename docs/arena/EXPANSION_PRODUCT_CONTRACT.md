# Arena V2 Expansion — binding product contract

Статус на 2026-08-11: реализация находится только в текущем checkout;
production deploy, production config и device rollout не выполнялись.

Этот документ фиксирует решения пакета расширения Arena после независимого
product, UX и backend review. При расхождении экспериментального UI с этим
контрактом выигрывают перечисленные здесь anti-abuse и economy invariants.

## Центр Arena

Hub строится как ежедневный игровой центр, а не каталог наград:

1. восстановление активного матча;
2. большая карточка `Arena Today`;
3. `Quick` и `Ranked`;
4. друзья: Ghost, Rivalry и Partner;
5. Match Lab и Mastery;
6. косметический магазин и Arena Season.

Detail-экраны загружаются отдельно. Hub не создаёт постоянных listeners и не
читает приватные матчи. Все CTA имеют понятный disabled/loading state, минимум
44x44 pt и учитывают Reduced Motion.

## Две проекции звёзд

- `season.stars` — валовый, неубывающий прогресс сезонного пропуска.
- `users/{uid}.stars.balance` — тратимый постоянный баланс единого revisioned
  журнала; `profile.starWalletBalance` остаётся только совместимым зеркалом и не
  участвует в precheck покупки.
- Обычное начисление одной exact-once операцией увеличивает обе проекции.
- Покупка уменьшает только кошелёк и никогда не откатывает Season Pass.
- Arena не конвертирует Learning V2 stars, shards, spins или rating.
- Нет переводов между игроками, случайных покупок, boosts, hints, защиты
  рейтинга, платных повторов официальной попытки или matchmaking priority.

## Arena Today

- Один общий challenge на UTC-день для каждой группы divisions: `0–5`, `6–11`,
  `12–17`, `18–23`.
- Ровно 10 проверенных Tournament V10 tasks. Snapshot и порядок неизменны для
  всех игроков группы.
- Просмотр карточки не начинает попытку. Отсчёт начинается при активации первого
  задания; hard expiry — `min(startedAt + 20m, selectedDayEnd + 20m)`.
- Одна официальная попытка на dayKey, resumable и idempotent. Группа фиксируется
  при старте. Вчерашний активный run сначала завершается или истекает.
- Награда: 2 stars за правильное задание, +5 при минимум восьми submitted,
  +5 за perfect; максимум 30 в отдельном гарантированном дневном бюджете.
- Percentile и friend-cohort comparison **не реализованы в текущем snapshot**.
  Это post-launch surfaces: до отдельного агрегатора, privacy review и cohort
  минимум 20 backend не возвращает эти поля, а UI не должен их имитировать.

## Match Lab

- После settlement создаётся owner-only компактный review на 30 дней.
- Текущий DTO показывает собственный verdict/time, доступное explanation,
  accuracy/sample count по mode и до трёх ошибок для локального восстановления.
- Turning point и численный вклад вопроса **не вычисляются и не заявляются как
  shipped**; это отдельный post-launch слой поверх сохранённого review.
- Сырые ответы и stable/auth IDs соперника никогда не выдаются.
- Формулировки только фактические: «быстрый ответ», «почти у дедлайна»; нельзя
  заявлять, что игрок «не знал» или «торопился».
- Recovery бесплатный, локальный, без stars/rating/spin/mastery.

## Verified Mastery

- Учитывается только первое предъявление task signature за 60 дней в Quick,
  Ranked и Arena Today. Friend, Ghost, Series и Lab исключены.
- По каждому из пяти modes хранится не более 40 наблюдений.
- Для обычных заданий `s=1|0`; для speed-match
  `s=clamp((matched - 0.25*wrong)/4, 0, 1)`.
- Вес difficulty: `0.8/1/1.2`, recency: `0.97^i`.
- `A=2+sum(w*r*s)`, `B=2+sum(w*r*(1-s))`,
  `score=round(100*A/(A+B))`.
- Меньше 5 samples — score скрыт; 5–19 — preliminary; 20+ — confident.
- Первое пересечение 50/65/80/90 даёт 10/20/30/40 wallet stars на mode.
  Максимум — 500 lifetime; exact receipts исключают повторный фарм.

## Ghost Duel

- В первой версии создаётся только из завершённого eligible матча или Today:
  guest проходит тот же immutable snapshot без новых Tournament reads.
- Только взаимный друг; в Firestore хранится только hash capability-token,
  сам token детерминированно восстанавливается сервером из HMAC для повторного
  share/status. Это не one-time token; Accept всё равно связан с target auth и
  одним sealed run. Host result скрыт до guest settlement. При accept guest
  получает полные 20 минут.
- 48 часов на принятие, максимум три outgoing и десять созданий в день, одна
  активная пара. Friendship, moderation и current auth проверяются повторно.
  Отдельного block-store reader нет: до rollout social-safety QA обязан доказать,
  что block синхронно удаляет reciprocal friendship docs.
- Всегда ноль RP, stars, spin, pity и Verified Mastery.

## Rivalry Series

- Предложение только после human Quick/Ranked; 30 секунд на взаимное согласие.
  Отсутствие ответа не является поражением.
- Best-of-3: исходный матч — game 1, games 2/3 используют новые tasks и explicit
  `series` mode. Они всегда unrated и имеют ноль stars/spin/mastery.
- Не более трёх взаимных Rivals, cooldown 15 минут, максимум пять предложений
  одному target в день. Есть mute/remove. H2H начинается после взаимного opt-in.
- Pending offer записывается в participant-safe public result; второй игрок
  получает его через уже активный match listener и принимает одним нажатием.
  Одновременный propose до доставки listener update безопасно возвращает
  существующую invited series вместо ошибки; второй tap Accept остаётся явным
  взаимным согласием.

## Arena Partner

- До пяти взаимных partners. Один Spotlight partner фиксируется на неделю после
  первого общего дня.
- Для награды считаются только Quick, Ranked и Arena Today. Settlement создаёт
  один weekly activity bitmap игрока; partner fan-out запрещён.
- Награда запрашивается лениво: 3 общих дня = 10 stars, 5 = ещё 20, 7 = только
  визуальный badge. Максимум 30 wallet/season stars в неделю.
- Backend раскрывает только общий `sharedDays`, не индивидуальную активность,
  online/last-seen или streak. Точный status «Ты сделал свою часть» пока не
  реализован и остаётся post-launch UX, поэтому текущий UI не должен делать
  вывод о том, кто из пары не сыграл.
- Nudge — preset-only, opt-in, quiet hours 22:00–08:00 UTC, максимум 1/pair/day
  и 2/sender/recipient/day. Он доставляется в owner-only notification center и
  ведёт на Arena Partner. Partner invite также создаёт owner-only in-app
  notification без bearer token; push-доставка отдельно не обещается.
- Block/unfriend проверяется при claim/nudge и завершает либо блокирует связь;
  отдельный block-store reader не реализован.

## Cosmetic Store

Каталог hardcoded и versioned; клиентские assets обязаны существовать до
включения item. Покупка — прямой выбор и постоянный entitlement.

| Тип | Цены |
|---|---|
| Titles | 250 / 400 / 600 |
| Reaction packs | 300 / 500 |
| Result themes | 400 / 600 / 900 |
| Victory stamps | 500 / 800 |
| Entrances | 800 / 1200 / 1800 |

Purchase/equip exact-once, unknown catalog versions и несуществующие assets
отклоняются. Повторная покупка permanent entitlement не списывает баланс.
Все 13 catalog IDs имеют client treatment: title, preset reactions, три result
themes, две victory stamps и три entry treatments. Реакции в текущем snapshot
локальны и не отправляются сопернику.

## Release invariants

Перед включением любой части обязательны: отдельный kill switch, Rules deny/read
scope, account deletion, Jarvis contract review, idempotency/concurrency tests,
emulator smoke и проверка отсутствия публичных tasks/answers/raw identities.
Hard-zero economy modes дополнительно проверяются на отсутствие pity increment.

## Rollout flags

Отсутствующий флаг всегда означает `false`. До прохождения соответствующего
emulator/device gate оператор не включает его в `arena_v2_config/current`:

```ts
{
  arenaExpansionEnabled: false,
  arenaTodayEnabled: false,
  arenaMatchLabEnabled: false,
  arenaMasteryEnabled: false,
  arenaGhostEnabled: false,
  arenaRivalEnabled: false,
  arenaPartnerEnabled: false,
  arenaStarStoreEnabled: false,
  arenaCosmeticCatalogVersion: 'arena-cosmetics.v1',
  arenaRivalRuntimeVersion: 'arena-rival.v1',
}
```

Оба version fields обязательны даже при `true` feature flag: без exact catalog
version Store остаётся fail-closed, без exact Rival runtime version остаётся
fail-closed Rivalry. Это часть operator config, а не информационные поля.

Порядок безопасного rollout: общий expansion flag → Today/Lab/Mastery → Store →
Ghost → Partner → Rivalry. Rollback выполняется выключением только проблемного
feature flag; recovery-callables уже начатых runs остаются доступны. Изменение
production config и deploy не входят в локальную реализацию этого документа.
