# Арена — промпты для генерации звуков

Генератор: **Adobe Firefly Sounds**. Стиль — семейство существующих звуков
приложения (`assets/sounds/fc/fc_*.mp3`): короткие, чистые, без реверберационных
хвостов, тёплые, не мультяшные. Целевая папка: `assets/sounds/ar/`.

Каждый звук описан тремя промптами в **разных стилях**:

- **A — интерфейсный.** Минимализм, чистый синтез, ощущение дорогого софта.
- **B — игровой.** Аркадная подача, тёплые тона, ближе к текущим `fc_*`.
- **C — кинематографичный.** Премиальная подача, слой воздуха и веса.

Каждый промпт самодостаточен и начинается с подробного указания места
применения — чтобы генератор или другая модель понимали контекст без пояснений.

Технические требования ко всем файлам: моно, 48 кГц, формат mp3, тишина
в начале обрезана, нормализация −14 LUFS, пиковое −1 dBTP.

---

## 1. Поиск матча

### `ar_search_start.mp3` — 0.4 с, громкость 0.35
Момент: игрок нажал «Начать матч», экран поиска появляется на экране.

**A.** Short UI confirmation sound for a language-learning duel app, played the instant the player taps "Find match" and the search screen appears. Two clean sine blips rising a perfect fifth, soft attack, no reverb tail, 400 milliseconds, warm and expensive, like a premium software confirmation.

**B.** Arcade-style search-start cue for a mobile quiz duel game, triggered when the matchmaking screen opens. Bright plucked synth arpeggio going up, three quick notes, light bell overtone, playful but not cartoonish, 400 milliseconds, mono, dry.

**C.** Cinematic short riser marking the beginning of opponent search in a competitive quiz app. A soft airy swell with a subtle low thump underneath, resolving into a clean bell note, 500 milliseconds, warm, premium, no long tail.

### `ar_search_loop.mp3` — 2.0 с, зацикленный, громкость 0.12
Момент: фон экрана поиска, играет по кругу пока идёт поиск соперника.

**A.** Seamless looping ambient bed for a matchmaking screen in a quiz duel app, playing quietly while the player waits for an opponent. Slow filtered sine pulse every 500 milliseconds, very low volume, no melody, perfectly loopable over 2 seconds, calm and unobtrusive.

**B.** Loopable light arcade waiting texture for a mobile game matchmaking screen. Soft muted marimba pulse with gentle stereo-free movement, 2 seconds, seamless loop, low energy, keeps anticipation without becoming annoying after a minute.

**C.** Cinematic tension bed looping under a competitive matchmaking screen. Distant warm pad with a slow heartbeat pulse, extremely subtle, 2 seconds, seamless, no melodic content, feels like waiting before a duel.

### `ar_opponent_found.mp3` — 0.7 с, громкость 0.6
Момент: соперник найден, его аватар вылетает на экран навстречу твоему.

**A.** Sharp UI notification for the moment an opponent is found in a quiz duel app and both avatars fly toward each other. Clean two-note synth stab with a quick bright transient, confident, dry, 700 milliseconds, no musical key, reads as "locked in".

**B.** Arcade "opponent found" fanfare for a mobile duel game. Punchy synth brass hit followed by a bright chime, energetic, warm, 700 milliseconds, mono, feels like the versus screen slamming into place.

**C.** Cinematic impact for the versus reveal in a competitive quiz app. Low sub thump layered with a metallic bright shimmer and a fast air whoosh, 700 milliseconds, powerful but tight, no long reverb.

---

## 2. Отсчёт и старт

### `ar_countdown_tick.mp3` — 0.15 с, громкость 0.5
Момент: каждая цифра отсчёта 3-2-1 перед стартом матча.

**A.** Single crisp countdown tick for the 3-2-1 sequence before a quiz duel starts. Dry clean click with a short pitched body, 150 milliseconds, precise, no tail, feels mechanical and premium.

**B.** Arcade countdown beep played on each digit before a mobile duel match begins. Short square-wave blip with light pitch drop, 150 milliseconds, punchy and warm, retro but clean.

**C.** Cinematic countdown pulse before a competitive match. Tight woody knock layered with a faint metallic ring, 150 milliseconds, weighty, dry, sits well under a pulsing number animation.

### `ar_countdown_go.mp3` — 0.6 с, громкость 0.7
Момент: отсчёт закончился, первое задание появляется на экране.

**A.** Clean UI launch cue for the moment a quiz duel actually starts after the countdown. Bright ascending sine sweep resolving to a single held note, 600 milliseconds, no reverb, confident and modern.

**B.** Arcade match-start signal for a mobile quiz duel. Energetic synth stab with a quick upward pitch bend and a bright bell tail, 600 milliseconds, exciting, warm, game-like.

**C.** Cinematic go signal opening a competitive duel round. Fast air whoosh into a solid low impact with a bright top layer, 600 milliseconds, powerful, controlled tail.

---

## 3. Задание и ответ

### `ar_task_in.mp3` — 0.25 с, громкость 0.25
Момент: новое задание выезжает на экран.

**A.** Subtle UI transition sound for a new question sliding onto the screen in a quiz duel. Soft filtered swish with a faint pitched tail, 250 milliseconds, very light, no reverb.

**B.** Light arcade card-in sound for a new question appearing in a mobile quiz game. Quick soft whoosh with a small wooden tap at the end, 250 milliseconds, warm and friendly.

**C.** Cinematic soft transition for a question card entering a competitive duel screen. Airy sweep with a gentle low body, 250 milliseconds, refined, barely noticeable but present.

### `ar_option_tap.mp3` — 0.1 с, громкость 0.2
Момент: игрок нажал вариант ответа, но ещё не подтвердил.

**A.** Minimal UI tap for selecting an answer option in a quiz duel, before submitting. Very short dry click with a tiny pitched component, 100 milliseconds, neutral, no emotion.

**B.** Soft arcade button tap for choosing an answer in a mobile quiz game. Small warm bubble pop, 100 milliseconds, friendly, dry.

**C.** Refined tactile tap for selecting an answer in a premium quiz app. Short muted felt hit with a faint high sparkle, 100 milliseconds, expensive feeling.

### `ar_answer_correct.mp3` — 0.45 с, громкость 0.55
Момент: игрок ответил верно и получил 2 звезды.

**A.** Clean UI success chime for a correct answer in a quiz duel. Two ascending sine notes, bright and pure, 450 milliseconds, dry, satisfying without being loud.

**B.** Arcade correct-answer reward sound for a mobile quiz game. Bright glockenspiel double note going up with a light sparkle, 450 milliseconds, warm and encouraging.

**C.** Cinematic correct-answer confirmation in a competitive duel. Soft bell with an airy shimmer rising, subtle low warmth underneath, 450 milliseconds, premium, short tail.

### `ar_answer_first.mp3` — 0.6 с, громкость 0.65
Момент: игрок ответил верно И раньше соперника — начислено 3 звезды вместо 2. Должен ощущаться заметно ценнее обычного верного ответа.

**A.** Elevated UI success sound for answering correctly AND faster than the opponent in a quiz duel, worth more stars than a normal correct answer. Three ascending pure notes with a bright final accent, 600 milliseconds, clean, clearly superior to a standard success chime.

**B.** Arcade bonus reward sound for beating the opponent to a correct answer in a mobile duel. Bright rising bell run with a coin-like sparkle on top, 600 milliseconds, joyful, distinctly richer than the normal correct sound.

**C.** Cinematic premium reward for winning the race to a correct answer in a competitive quiz. Rising crystalline shimmer with a warm low bloom and a final bright ping, 600 milliseconds, feels valuable.

### `ar_answer_wrong.mp3` — 0.4 с, громкость 0.4
Момент: игрок ответил неверно. Не должен звучать как наказание.

**A.** Neutral UI error tone for a wrong answer in a quiz duel, deliberately not punishing. Two descending soft sine notes, muted, 400 milliseconds, dry, calm.

**B.** Gentle arcade miss sound for a wrong answer in a mobile quiz game. Soft muted buzz with a light downward pitch bend, 400 milliseconds, warm, not harsh, encourages retry.

**C.** Restrained cinematic miss cue for an incorrect answer in a competitive duel. Low soft thud with a faint descending air tail, 400 milliseconds, dignified, never mocking.

### `ar_opponent_answered.mp3` — 0.2 с, громкость 0.3
Момент: соперник ответил на текущее задание. Игрок ещё думает. Должен подгонять, но не пугать.

**A.** Very short neutral UI ping signalling that the opponent has just answered in a quiz duel while you are still thinking. Single soft high blip, 200 milliseconds, dry, informative not alarming.

**B.** Light arcade notification that the rival submitted their answer in a mobile duel. Small bright tick with a tiny pitch rise, 200 milliseconds, creates gentle urgency.

**C.** Subtle cinematic cue for a competitive quiz duel app, marking the moment the opponent's answer lands while the player is still choosing. Distant soft knock with a faint metallic edge, 200 milliseconds, adds pressure without panic.

### `ar_timer_tick.mp3` — 0.12 с, громкость 0.3
Момент: последние три секунды таймера ответа, играет каждую секунду.

**A.** Minimal clock tick played on each of the final three seconds of an answer timer in a quiz duel. Dry short click, slightly bright, 120 milliseconds, precise, no pitch drama.

**B.** Arcade urgency tick for the last seconds of a question timer in a mobile quiz. Short woodblock hit with a light pitch rise, 120 milliseconds, builds tension.

**C.** Cinematic tension tick counting the final seconds of a duel question. Tight muted snap with faint air, 120 milliseconds, serious, sits under a shrinking timer ring.

### `ar_timeout.mp3` — 0.5 с, громкость 0.45
Момент: время на задание вышло, игрок не успел ответить.

**A.** Neutral UI timeout tone for a quiz question the player failed to answer in time. Descending muted sine pair with a soft cut, 500 milliseconds, dry, factual.

**B.** Arcade time-up sound for a mobile quiz question. Short descending buzz with a soft thud at the end, 500 milliseconds, clear but not cruel.

**C.** Cinematic time-expired cue in a competitive duel. Low airy drop with a dull impact, 500 milliseconds, weighty, closes the moment cleanly.

---

## 4. Комбо

### `ar_combo_start.mp3` — 0.5 с, громкость 0.6
Момент: третий правильный ответ подряд — комбо включилось, каждое следующее задание даёт +1 звезду.

**A.** UI activation sound for a bonus streak turning on after three correct answers in a row in a quiz duel. Bright ascending three-note synth figure with a clean sustain, 500 milliseconds, signals a state change.

**B.** Arcade combo-activated sound for a mobile quiz game reaching a three-answer streak. Energetic rising chime run with a sparkle burst, 500 milliseconds, exciting and rewarding.

**C.** Cinematic ignition for a scoring streak beginning in a competitive duel. Warm low swell into a bright crystalline hit, 500 milliseconds, feels like power switching on.

### `ar_combo_up.mp3` — 0.35 с, громкость 0.55
Момент: серия продолжается, каждый следующий верный ответ. Тон должен подниматься с ростом серии — генерировать три варианта высоты.

**A.** Incremental UI streak sound for each additional correct answer while a bonus streak is active in a quiz duel. Single clean bright note, 350 milliseconds, dry, designed to be pitch-shifted upward on each repeat.

**B.** Arcade streak-continues chime for a mobile quiz combo. Bright bell ping with a light sparkle, 350 milliseconds, cheerful, works when repeated at rising pitches.

**C.** Cinematic streak accumulation tone in a competitive duel. Crystalline ping with a faint rising air layer, 350 milliseconds, premium, stacks well on repetition.

### `ar_combo_break.mp3` — 0.45 с, громкость 0.45
Момент: серия прервалась неверным ответом. Обидно, но не унизительно.

**A.** UI sound for a bonus streak ending on a wrong answer in a quiz duel. Descending filtered sweep with a soft close, 450 milliseconds, dry, clean, no drama.

**B.** Arcade combo-break sound for a mobile quiz game. Downward pitch bend with a light glass-crack texture, 450 milliseconds, disappointing but friendly.

**C.** Cinematic power-down for a broken scoring streak in a competitive duel. Warm descending swell losing energy into silence, 450 milliseconds, elegant, never humiliating.

---

## 5. Задание с парами

### `ar_pair_match.mp3` — 0.25 с, громкость 0.5
Момент: игрок соединил верную пару в задании на сопоставление. Каждая верная пара даёт 1 звезду.

**A.** Clean UI confirmation for correctly connecting a matching pair in a quiz duel task. Short bright two-tone click, 250 milliseconds, dry, satisfying and repeatable.

**B.** Arcade snap sound for a correct pair match in a mobile quiz game. Warm plucked note with a small magnetic click, 250 milliseconds, tactile and fun.

**C.** Refined connection sound for a correct pair in a premium quiz app. Soft glassy chime with a subtle magnetic snap underneath, 250 milliseconds, expensive.

### `ar_pair_miss.mp3` — 0.2 с, громкость 0.35
Момент: игрок соединил неверную пару.

**A.** Neutral UI reject for an incorrect pair connection in a quiz duel task. Short muted low click, 200 milliseconds, dry, unemotional.

**B.** Soft arcade reject for a wrong pair match in a mobile quiz game. Gentle low blip with a tiny rubbery bounce, 200 milliseconds, forgiving.

**C.** Understated cinematic reject for the pair-matching task of a quiz duel app, played when the player connects two tiles that do not belong together. Dull soft thud with faint air, 200 milliseconds, calm.

### `ar_pair_clear.mp3` — 0.6 с, громкость 0.6
Момент: все четыре пары собраны, задание закрыто полностью.

**A.** UI completion sound for clearing all pairs in a matching task in a quiz duel. Ascending four-note clean run resolving upward, 600 milliseconds, dry, conclusive.

**B.** Arcade board-cleared fanfare for finishing all pairs in a mobile quiz game. Bright ascending bell run with a sparkle burst, 600 milliseconds, joyful.

**C.** Cinematic completion for clearing a full matching board in a competitive duel. Rising crystalline cascade with a warm resolving bloom, 600 milliseconds, premium.

---

## 6. Итоги матча

### `ar_result_win.mp3` — 1.6 с, громкость 0.75
Момент: экран итогов, игрок победил, летит конфетти.

**A.** Clean modern victory sound for winning a quiz duel, played as the results screen appears. Bright ascending synth chord progression resolving to a major triad, 1.6 seconds, polished, no orchestral cliché.

**B.** Arcade victory fanfare for winning a mobile quiz duel. Cheerful bell and synth brass run rising to a bright held chord with sparkle, 1.6 seconds, celebratory and warm.

**C.** Cinematic victory swell for winning a competitive duel. Warm rising strings-like pad with a bright crystalline top and a satisfying low bloom, 1.6 seconds, premium, controlled tail.

### `ar_result_loss.mp3` — 1.4 с, громкость 0.55
Момент: экран итогов, игрок проиграл. Обязан оставлять желание сыграть ещё раз.

**A.** Neutral modern defeat sound for losing a quiz duel, designed to invite a rematch rather than punish. Soft descending chord resolving to a warm unresolved note, 1.4 seconds, clean, dignified.

**B.** Gentle arcade defeat cue for losing a mobile quiz duel. Descending bell figure landing on a warm minor note, 1.4 seconds, sympathetic, not sad.

**C.** Cinematic restrained defeat for losing a competitive duel. Slow warm pad descending with a soft low settle, 1.4 seconds, respectful, leaves room for hope.

### `ar_result_draw.mp3` — 1.2 с, громкость 0.6
Момент: экран итогов, ничья.

**A.** Neutral modern sound for a drawn quiz duel. Two sustained notes a fourth apart resolving to unison, 1.2 seconds, clean, balanced, neither happy nor sad.

**B.** Arcade tie result for a mobile quiz duel. Balanced double bell hit with a light shimmer, 1.2 seconds, friendly and even.

**C.** Cinematic equilibrium sound for a drawn competitive duel. Two warm pads meeting and holding, faint air, 1.2 seconds, poised.

---

## 7. Звёзды и прогресс

### `ar_star_fly.mp3` — 0.35 с, громкость 0.4
Момент: заработанные звёзды вылетают из карточки итогов и летят к кошельку.

**A.** UI whoosh for a star icon flying from the result card toward the wallet counter in a quiz app. Short filtered sweep rising in pitch, 350 milliseconds, clean, dry, repeatable in quick succession.

**B.** Arcade coin-flight sound for a star travelling to the balance counter in a mobile game. Light airy swish with a small sparkle trail, 350 milliseconds, playful.

**C.** Cinematic star travel for a language-learning duel app, played while an earned star flies from the match result toward the player's wallet. Delicate shimmering sweep with faint air, 350 milliseconds, elegant, layers well when repeated.

### `ar_star_land.mp3` — 0.3 с, громкость 0.5
Момент: звезда долетела до кошелька, счётчик увеличился.

**A.** UI landing tick for a star arriving in the wallet counter and incrementing it in a quiz app. Short bright pitched click, 300 milliseconds, dry, precise.

**B.** Arcade coin-collect sound for a star landing in the balance in a mobile game. Warm bright ping with a small metallic ring, 300 milliseconds, satisfying.

**C.** Refined deposit sound for a language-learning duel app, played the instant an earned star lands in the player's wallet after a match. Crystalline tap with a soft warm body, 300 milliseconds, expensive.

### `ar_goal_complete.mp3` — 0.8 с, громкость 0.6
Момент: закрыта одна из трёх целей дня на главном экране Арены.

**A.** UI completion sound for finishing a daily goal in a quiz app. Clean ascending three-note figure with a confident final accent, 800 milliseconds, dry, clearly conclusive.

**B.** Arcade quest-complete jingle for closing a daily goal in a mobile game. Bright bell run with a sparkle and a warm final chord, 800 milliseconds, rewarding.

**C.** Cinematic achievement close for a language-learning duel app, played when the player completes one of the three daily objectives on the Arena home screen. Warm rising swell into a bright resolving chime, 800 milliseconds, satisfying without being a full fanfare.

### `ar_reward_unlock.mp3` — 1.0 с, громкость 0.65
Момент: набран порог звёзд, открылась награда сезона.

**A.** UI unlock sound for reaching a star threshold and opening a season reward in a quiz app. Clean mechanical latch click followed by a bright ascending pair of notes, 1 second, modern.

**B.** Arcade unlock fanfare for opening a reward in a mobile game. Chest-latch click into a bright bell cascade with sparkle, 1 second, exciting.

**C.** Cinematic reveal for a language-learning duel app, played when a season reward or rank tier reward unlocks for the player. Low mechanical thunk into a rising crystalline shimmer with a warm bloom, 1 second, valuable.

---

## 8. Ранг

### `ar_rank_up.mp3` — 2.0 с, громкость 0.8
Момент: полноэкранная сцена повышения ранга — старый герб разлетается, новый собирается из частиц.

**A.** Modern promotion sound for a player advancing to a new rank tier in a competitive quiz app, played over a full-screen emblem transformation. Clean ascending synth progression with a bright final chord and a metallic accent, 2 seconds, polished, no orchestral cliché.

**B.** Arcade rank-up fanfare for a mobile competitive game. Rising bell and brass run with a sparkle burst and a triumphant held chord, 2 seconds, celebratory and warm.

**C.** Cinematic ascension for the ranked ladder of a competitive quiz duel app, played when the player wins a promotion series and enters a new tier. Deep low swell rising into bright crystalline particles with a powerful warm resolve, 2 seconds, epic but controlled, short tail.

### `ar_rank_down.mp3` — 1.4 с, громкость 0.5
Момент: игрок выпал из тира. По решению владельца защиты нет, поэтому звук обязан быть спокойным и не добивающим.

**A.** Neutral modern sound for dropping to a lower rank tier in a competitive quiz app. Slow descending clean chord resolving to a stable warm note, 1.4 seconds, factual, dignified.

**B.** Restrained arcade demotion cue for a mobile competitive game. Descending bell figure landing softly, 1.4 seconds, gentle, avoids any mocking tone.

**C.** Cinematic composed descent for the ranked ladder of a competitive quiz duel app, played when the player drops out of a tier after losing. Warm pad settling downward with a soft low landing, 1.4 seconds, respectful, leaves motivation intact.

---

## Сводная таблица

| Файл | Длина | Громкость | Где применяется |
|---|---|---|---|
| `ar_search_start` | 0.4 с | 0.35 | вход в поиск матча |
| `ar_search_loop` | 2.0 с | 0.12 | фон поиска, зациклен |
| `ar_opponent_found` | 0.7 с | 0.60 | соперник найден |
| `ar_countdown_tick` | 0.15 с | 0.50 | каждая цифра отсчёта |
| `ar_countdown_go` | 0.6 с | 0.70 | старт матча |
| `ar_task_in` | 0.25 с | 0.25 | появление задания |
| `ar_option_tap` | 0.1 с | 0.20 | выбор варианта |
| `ar_answer_correct` | 0.45 с | 0.55 | верный ответ, 2 звезды |
| `ar_answer_first` | 0.6 с | 0.65 | верный и первым, 3 звезды |
| `ar_answer_wrong` | 0.4 с | 0.40 | неверный ответ |
| `ar_opponent_answered` | 0.2 с | 0.30 | соперник ответил |
| `ar_timer_tick` | 0.12 с | 0.30 | последние 3 секунды |
| `ar_timeout` | 0.5 с | 0.45 | время вышло |
| `ar_combo_start` | 0.5 с | 0.60 | серия из трёх |
| `ar_combo_up` | 0.35 с | 0.55 | продолжение серии |
| `ar_combo_break` | 0.45 с | 0.45 | серия прервана |
| `ar_pair_match` | 0.25 с | 0.50 | верная пара |
| `ar_pair_miss` | 0.2 с | 0.35 | неверная пара |
| `ar_pair_clear` | 0.6 с | 0.60 | все пары собраны |
| `ar_result_win` | 1.6 с | 0.75 | победа |
| `ar_result_loss` | 1.4 с | 0.55 | поражение |
| `ar_result_draw` | 1.2 с | 0.60 | ничья |
| `ar_star_fly` | 0.35 с | 0.40 | звезда летит в кошелёк |
| `ar_star_land` | 0.3 с | 0.50 | звезда долетела |
| `ar_goal_complete` | 0.8 с | 0.60 | закрыта цель дня |
| `ar_reward_unlock` | 1.0 с | 0.65 | открыта награда |
| `ar_rank_up` | 2.0 с | 0.80 | повышение ранга |
| `ar_rank_down` | 1.4 с | 0.50 | понижение ранга |

**Итого: 28 звуков, 84 промпта.**

После генерации класть файлы в `assets/sounds/ar/` с точно этими именами —
реестр звуков Арены будет ссылаться на них по имени, как это уже сделано
в `app/flashcards/SoundService.ts` для семейства `fc_*`.
