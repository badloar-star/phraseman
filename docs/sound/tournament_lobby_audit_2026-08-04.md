# Аудит звука: турниры — 2026-08-04

Отдельный аудит по запросу владельца: «турниры должны ощущаться живыми — не
только награда/победа, а лобби (подключение игроков/ботов, рост банка) и всё
остальное». Дополняет `sound_audit_2026-08-04.md` (там — общий аудит
приложения, включая арену matches/countdown).

Только чтение кода — **никаких правок в этом ходу**. `app/tournament_round.tsx`
сейчас редактируется в другой параллельной сессии, `app/tournament_lobby.tsx`
свободен, но код всё равно не трогаю по решению владельца — сначала промпты.

## 1. Что уже озвучено в турнирах (не трогать, не дублировать)

| Экран | Событие | Момент |
|---|---|---|
| `app/tournament_round.tsx` | `pm.learn.correct` / `pm.learn.needs_work` (через `fk.correct`/`fk.wrong`) | Вердикт по каждому ответу — свой scope `tournament-round` с приподнятым лимитом 5/сек, иначе звуки турнира гасились общим лимитом 2/сек (инцидент 2026-08-04) |
| `app/tournament_round.tsx` | `fk.tap()` | Тап по кнопке «Сдаться» и выход |
| `app/tournament_round.tsx` (через `useTimerTickCue`) | `pm.learn.timer_warning`/`timer_expired` | Таймер раунда |
| `app/tournament_results.tsx` | `pm.league.promoted` / `pm.league.demoted` | Финал: победа/поражение в турнире (переиспользует лиговые события) |
| `components/tournament/TournamentRoundIntro.tsx` | — (только haptic) | Отсчёт 3-2-1 перед раундом — **сознательное решение владельца**: «клик-звук только на управляющих кнопках, здесь ничего не нажимают». Прежний общий аудит уже отметил это как «не трогать без владельца» — актуально и здесь. |

## 2. Немые места в лобби (`app/tournament_lobby.tsx`) — то, что реально просил владелец

Прочитан весь файл (898 строк). Лобби — единственный турнирный экран без
единого звукового вызова, при этом в нём уже готовы три плавные визуальные
анимации, которые сейчас работают в тишине.

| # | Место в коде | Что происходит визуально сейчас | Предлагаемое событие | Приоритет |
|---|---|---|---|---|
| 1 | `SeatCard`, строка 744 — `Animated.View entering={ZoomIn...}` | Игрок/бот появляется на своём месте в сетке 4×4 (сервер подсаживает ботов волнами по одному, специально «не сразу все» — см. комментарий на строке 88-96) | НОВОЕ `pm.arena.seat_filled` — очень тихий, короткий тик | 🔴 Это и есть главная просьба — «не хватает звука при подключении игроков/ботов» |
| 2 | `AnimatedBankAmount`, строки 152-186 — каскад по одному прибытию с пульсом `withSequence` | Банк турнира растёт числом каскадом, по одному прибытию бота/игрока, с лёгким виз. пульсом на каждый шаг | НОВОЕ `pm.arena.bank_tick` — тихий, короче seat_filled, синхронно с пульсом | 🔴 Вторая явная просьба — «рост банка» |
| 3 | `AnimatedPrizePlace`, строки 220-244 — пульс `withSequence` только при росте (`grew`) | Персональная награда за 1/2/3 место растёт вместе с банком | Тот же `pm.arena.bank_tick`, либо не озвучивать отдельно — см. правило дедупликации ниже | 🟡 |
| 4 | Строка 639-643 — `full ? 'Все на место' : 'Собираем игроков'` | Момент, когда комната укомплектована (16/16) — статус-текст меняется | `pm.arena.match_found` (уже зарегистрировано в каталоге, файла нет — см. общий аудит, находка №5) | 🔴 Ровно то, что уже отмечено раньше, подтверждено повторно |
| 5 | `sendReaction`/чужие реакции, строки 552-576 | Эмодзи-реакции летят по экрану | Не озвучивать — фича временно выключена (`TOURNAMENT_REACTIONS_ENABLED`), см. правило ниже | — не в приоритете |

## 3. Что в раунде и результатах — по факту уже покрыто, новых пробелов не нашёл

Прочитан `tournament_round.tsx` (2292 строки, только чтение) и
`tournament_results.tsx`. Помимо уже озвученного correct/wrong/timer:

- **Звёзды летят к счётчику** (`flyStarsToCounter`, строка 828, вызывается на
  каждый верный ответ) — визуально красиво, но беззвучно. **Осознанно не
  предлагаю звук**: это происходит в ТОТ ЖЕ момент, что и `fk.correct` — звук
  уже есть на этот вердикт, второй звук на дочернюю анимацию (полёт звёзд)
  создал бы дублирование one moment = two sounds, что нарушает правило
  «один смысловой момент — один звук».
- **Переход между заданиями** (`goNext`) — молчит, и это правильно: обычный
  переход без новой смысловой информации, соответствует правилу «тишина при
  манипуляции/переходе».
- **Финал раунда → таблица/результаты** — переход управляется сервером
  (`room.state`), сам переход молчит, а итог (`pm.league.promoted/demoted`)
  уже звучит на экране результатов. Не нашёл разрыва.

Вывод: раунд и результаты не нуждаются в правках. Вся недостающая «жизнь» —
именно в лобби, как и предполагал запрос.

## 4. Правила, чтобы не перегрузить (применимо к обоим новым событиям)

- **`pm.arena.seat_filled`** — играет на каждое появление игрока/бота в сетке,
  НО первую волну (несколько мест сразу на входе в лобби) нужно приглушить
  через каскад по образцу `AnimatedBankAmount` (там уже есть `CASCADE_BUDGET_MS`
  = 900мс на пачку) — иначе 5-6 одновременных `entering={ZoomIn}` дадут звуковую
  кашу. Технически: считать это ОДНИМ каскадным запросом с растянутыми во
  времени вызовами `soundDirector.request`, а не отдельным вызовом на каждый
  элемент внутри одного рендера.
- **`pm.arena.bank_tick`** — синхронизировать с уже существующим `pulse.value =
  withSequence(...)` в `AnimatedBankAmount`, на каждый шаг каскада (там уже
  есть `stepMs`-тайминг) — звук просто присоединяется к уже готовой
  покадровой логике, не добавляя новую.
- Оба события — **низкий приоритет и низкая громкость** (это фоновая жизнь
  лобби, не сигнал вердикта): не должны перебивать `pm.arena.match_found` или
  что-либо более важное, если пользователь одновременно открыл карточку
  игрока или произошло что-то другое.
- `AnimatedPrizePlace` (места 1/2/3) — **не давать отдельный звук**: он растёт
  синхронно с банком той же волной событий, второй звук на то же прибытие
  задублирует `bank_tick`.
- Реакции-эмодзи — звук не нужен, пока фича выключена флагом.
- `pm.arena.match_found`, `countdown_3/2/1`, `round_start` — это НЕ новые
  находки, они уже в каталоге без файлов с прошлого аудита; сюда просто
  подтверждено, что `match_found` — правильное событие для «Все на месте».

## 5. Промпты ElevenLabs — для двух новых событий лобби

Формат — начало каждого промпта: точное место использования, затем сам
текст. 3 варианта на каждое событие. 48kHz WAV, non-looping,
`eleven_text_to_sound_v2`, English.

---

### 🆕 `pm.arena.seat_filled` — Игрок/бот занял место в лобби

**Смысл:** Очень тихий, короткий «щелчок присутствия» — сообщает, что в
комнате появился кто-то новый, без привлечения повышенного внимания (это
происходит до 15 раз за одно лобби, должно быть почти незаметным по
отдельности, но создавать ощущение «живой комнаты» в сумме).

**Параметры:** duration `0.18s`; priority `35`; cooldown `120ms` (не блокирует
соседние прибытия в каскаде, но гасит дребезг одного и того же кадра);
volume `0.16`.

**Куда пойдёт:** `app/tournament_lobby.tsx`, синхронно с `entering={ZoomIn...}`
в `SeatCard` (строка 744) — каждое новое место, заполняемое волнами ботов
(строки 88-96) или реальным игроком.

#### Вариант A — короткий, стеклянный
```text
pm.arena.seat_filled — app/tournament_lobby.tsx, SeatCard, a player or bot occupies an empty seat in a 4x4 tournament lobby grid. Create a 0.18-second premium mobile UI micro one-shot for someone quietly joining a waiting room. A single tiny felted-glass tick, barely-there, no tail. Mood: subtle, alive, unobtrusive. Fast attack, dry mix, near-instant decay, mono-compatible. No voice, harsh highs, distortion, alarm, casino, sub-bass, long reverb.
```

#### Вариант Б — тактильный
```text
pm.arena.seat_filled — app/tournament_lobby.tsx, SeatCard, a player or bot occupies an empty seat in a 4x4 tournament lobby grid. Create a 0.18-second premium mobile UI micro one-shot for someone quietly joining a waiting room. A tiny soft wooden peg dropping into a slot, understated and quick. Mood: subtle, alive, unobtrusive. Fast attack, dry close mix, near-instant decay, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

#### Вариант В — воздушный
```text
pm.arena.seat_filled — app/tournament_lobby.tsx, SeatCard, a player or bot occupies an empty seat in a 4x4 tournament lobby grid. Create a 0.18-second premium mobile UI micro one-shot for someone quietly joining a waiting room. A single faint nylon pluck point, so short it barely registers as a note. Mood: subtle, alive, unobtrusive. Fast attack, dry mix, near-instant decay, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

---

### 🆕 `pm.arena.bank_tick` — Банк турнира подрастает на одно прибытие

**Смысл:** Крошечный тик на каждый шаг каскада роста банка — синхронно с
уже существующим визуальным пульсом цифры. Должен ощущаться как «монетка
упала в копилку», без кассового/казино характера (запрещённые признаки из
основного sound identity документа).

**Параметры:** duration `0.14s`; priority `32`; cooldown `100ms`; volume `0.15`.

**Куда пойдёт:** `app/tournament_lobby.tsx`, внутри каскадного `useEffect` в
`AnimatedBankAmount` (строки 159-186) — один вызов на каждый элемент
`arrivals`, с тем же таймингом `stepMs`, что уже разводит визуальный пульс.

#### Вариант A — короткий, стеклянный
```text
pm.arena.bank_tick — app/tournament_lobby.tsx, AnimatedBankAmount, the prize bank number ticks up by one arrival in a cascading counter. Create a 0.14-second premium mobile UI micro one-shot for a small prize pool growing by one step. A single ultra-short bright glass droplet, precise and tiny. Mood: subtle, precise, rewarding without hype. Fast attack, dry mix, near-instant decay, mono-compatible. No voice, harsh highs, distortion, alarm, casino, coins, cash register, sub-bass, long reverb.
```

#### Вариант Б — тактильный
```text
pm.arena.bank_tick — app/tournament_lobby.tsx, AnimatedBankAmount, the prize bank number ticks up by one arrival in a cascading counter. Create a 0.14-second premium mobile UI micro one-shot for a small prize pool growing by one step. A tiny warm ceramic click, soft and immediate, like a small token settling. Mood: subtle, precise, rewarding without hype. Fast attack, dry close mix, near-instant decay, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, coins, cash register, sub-bass, or long reverb.
```

#### Вариант В — воздушный
```text
pm.arena.bank_tick — app/tournament_lobby.tsx, AnimatedBankAmount, the prize bank number ticks up by one arrival in a cascading counter. Create a 0.14-second premium mobile UI micro one-shot for a small prize pool growing by one step. A single faint high digital pip, dry and clean, no shimmer or sparkle trail. Mood: subtle, precise, rewarding without hype. Fast attack, dry mix, near-instant decay, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, coins, cash register, sub-bass, or long reverb.
```

---

## 6. Напоминание — событие, уже готовое к использованию без генерации

`pm.arena.match_found` для находки №4 («Все на месте») уже зарегистрировано
в каталоге (`modules/audio/sound_events.ts`) и уже имеет готовый промпт в
`phraseman_sound_design_master_v1.md` (раздел 36) — **генерировать не нужно**,
только сгенерировать по существующему промпту и подключить вызов на переход
`full: false → true` в `app/tournament_lobby.tsx` (строка 459).
