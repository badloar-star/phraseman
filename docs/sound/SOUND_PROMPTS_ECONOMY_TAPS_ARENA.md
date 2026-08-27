# Phraseman — экономика, нажатия и Арена: аудит и промпты

Дата: 2026-08-27 · **Редакция 1**
Генератор: **Adobe Firefly Sounds**
Звуковая система: **«Королевская академия»** (`docs/SOUND_DESIGN_AUDIT_2026-05-18.md`)
Эталон манеры промптов: `docs/sound/SOUND_PROMPTS_FULL.md` (редакция 3)
Реестр событий: `modules/audio/sound_events.ts`

Документ закрывает заказ владельца: **трата энергии, потеря и покупка сердечек,
начисление рун, мягкое нажатие по кнопкам, Арена.**

---

## Звуковая система приложения

Все работающие звуки приложения сделаны в системе **«Королевская академия»**.
Новые звуки пишутся в ней же — чтобы ничего не выбивалось из семейства.

**Характер:** умное, премиальное, тёплое, чуть магическое. Не аркадное.

| Инструмент | Для чего |
|---|---|
| Челеста, стеклянные гармоники | руны, валюта, знание, маленькие вспышки |
| Арфа, пиццикато струнных | верный ответ, карточка, сохранение, лёгкая награда |
| Тёплые струнные | завершение урока, задача дня, спокойная радость |
| Валторна, мягкая медь, хоровой пэд | **только** редкие церемонии: уровень, лига, премиум |
| Низкие струнные, кларнет, фагот | предупреждение и ошибка — без наказующего тона |
| Литавры, малый барабан | очень дозированно: арена, ранг, дуэль |

**Фирменный мотив: три ноты, восходящее движение с мягким разрешением.**

| Масштаб | Длительность | Где |
|---|---|---|
| Микро | 120–300 мс | нажатие, шаг, тик |
| Награда | 600–1200 мс | руны начислены, сердечки восстановлены |
| Церемония | 1500–4000 мс | победа в Арене, повышение ранга |

---

## Правила системы (из аудита проекта)

1. Звук только за смысл, не за механику. Тап сам по себе не звучит.
2. Редкие события звучат богаче, частые — тише и короче.
3. Ошибка не унижает. Никаких резких сигналов отказа.
4. Звук приложения отделён от произношения фраз.
5. Пока звучит речь — интерфейсные звуки приглушаются или откладываются.
6. Наградные звуки не наслаиваются: работает очередь и приоритет.
7. **Волны громкости.** В длинных последовательностях звуки идут волнами:
   заметные — тише — заметные. Ухо получает передышку.

---

## Как пользоваться

**Каждый промпт начинается с имени функции** — Adobe кладёт первые слова промпта
в название скачиваемого файла. Скачали пачку — по именам сразу видно, что куда.

1. Нашли звук в нужном разделе.
2. Взяли **один из трёх** промптов (A / B / C — три подачи одного и того же
   звука; выбираете на слух).
3. Сгенерировали в Firefly, скачали файл.
4. Переименовали в `<имя>_v1` из заголовка звука.
5. Отдали мне — подключу ключ в реестре одной строкой.

**Три варианта — три РАЗНЫХ типа подачи, а не пересказ одного и того же:**

- **A — интерфейсный.** Минимализм и чистота. Один-два источника звука, сухо,
  без хвоста. Ощущение дорогого системного софта.
- **B — игровой.** Теплее и мелодичнее, живые инструменты, узнаваемая
  интонация. Ближе к текущим наградным звукам приложения.
- **C — кинематографичный.** Слой воздуха и веса, физический материал
  (стекло, металл, дерево, дыхание), пространство вокруг звука.

> Три промпта одного звука обязаны отличаться **инструментовкой и способом
> звукоизвлечения**, а не только прилагательными. Если A, B и C дают на слух
> один и тот же файл — промпт написан неправильно.

**Технические требования:** моно, 48 кГц, m4a или mp3, тишина в начале обрезана,
нормализация −14 LUFS, пик −1 dBTP.

---

## Результат аудита

Проверено: реестр `SOUND_EVENTS` (134 ключа), система энергии, система попыток
(«сердечки»), полёт рун, слой нажатий, 17 экранов Арены и 27 компонентов Арены.

| Показатель | Значение |
|---|---|
| Событий в реестре `SOUND_EVENTS` | 134 |
| Из них **без звукового файла** (заглушка `null`) | **29** (28 Арены + `vip_finale`) |
| Событий энергии в реестре | **2** (`empty`, `refilled`) |
| Событий **траты** энергии | **0** — ключа не существует |
| Событий сердечек (попыток) | **0** — ключей не существует |
| Событий начисления рун | **0** — ключа не существует |
| Событий нажатия | **0** — убраны владельцем |
| Звуков в этом документе | **29** |
| Промптов (по три на звук) | **87** |

### Что именно молчит — проверено по коду

| Механика | Файл | Состояние |
|---|---|---|
| Трата энергии, полёт молнии | `components/EnergySpendFlightHost.tsx` | анимация 820 мс, **ноль вызовов `soundDirector`** |
| Потеря сердечка | `components/session_attempts/SessionAttemptsHud.tsx` | **ноль вызовов `soundDirector`** |
| Сердечки кончились | `app/session_attempts/session_attempts_domain.ts` (`attempts_exhausted`) | эффект есть, звука нет |
| Покупка восстановления за 25 рун | `components/session_attempts/SessionAttemptsRecoveryModal.tsx` | **ноль вызовов `soundDirector`** |
| Восстановление подарком | тот же файл, вариант `gift` | звука нет |
| Начисление рун, полёт | `components/LearningV2RuneFlight.tsx` | анимация 620 мс, **ноль вызовов `soundDirector`** |
| Нажатие по кнопке | `app/feedback/feedback_kit.ts` → `fk.tap()` | только вибрация, звук убран владельцем |
| Арена целиком | `modules/audio/sound_events.ts` | **28 ключей с `source: null`** |

### Ключевые числа механик (из кода, не выдуманы)

- Сердечек в сессии: **3** (`SESSION_ATTEMPTS_MAX`)
- Восстановление всех сердечек: **25 рун** (`SESSION_ATTEMPT_RUNE_COST`)
- Полёт молнии энергии: **820 мс**, удар на **0.68** пути (`ENERGY_SPEND_TRANSFER_HYBRID`)
- Полёт руны: **620 мс** (`FLIGHT_MS` в `LearningV2RuneFlight.tsx`)
- Вызовов `fk.tap()` / тактильных нажатий в приложении: **734**

---

## Важно: нажатия ранее были отключены владельцем

В `app/feedback/feedback_kit.ts` стоит прямое решение: «ЗВУК-«писк» при нажатии
кнопок убран совсем — остаётся только тактильный отклик». Так же убраны `pop`,
`whoosh` и звук ошибки.

Владелец просит вернуть **мягкое приятное нажатие**. Раздел 4 даёт три звука на
всё приложение — не «писк», а тихое подтверждение касания. Включаются только по
решению владельца, потому что нажатий в приложении **734**: любой звук громче
0.14 превратится в трещотку.

---

## С чего начать

1. **Энергия и сердечки (10)** — самая заметная дыра: у человека отнимают
   ресурс, и приложение молчит
2. **Руны (5)** — начисление есть визуально, звука нет
3. **Арена (13)** — код расставлен и ждёт файлов
4. **Слой нажатий (3)** — только по решению владельца

---
# 1. Энергия: трата и отказ

Инструменты раздела: **низкие струнные с быстрым выдохом** для траты,
**челеста** для возврата, **кларнет и фагот** для пустого бака.

Трата энергии — это **изъятие**, а не награда. Звук идёт вниз по высоте,
короткий, без блеска. Он не должен ощущаться наказанием, но обязан
считываться как «с тебя списали».

> Полёт молнии длится **820 мс**, удар в цель приходится на **0.68 пути ≈ 560 мс**.
> Звук `pm_energy_spend` ставится на **старт полёта**, `pm_energy_spend_land` —
> на момент удара. Если владелец хочет один звук вместо двух — берите только
> `pm_energy_spend` и удлините его до 0.8 с.

---

### `pm_energy_spend_v1` — 0.34 с, громкость 0.26
**Экран:** `components/EnergySpendFlightHost.tsx` · Момент: пользователь вошёл в активность, с баланса списана единица энергии, молния отрывается от счётчика.

**A.** pm_energy_spend — precise interface debit for one unit of energy being deducted from a balance in a mobile learning app. A single low pizzicato string note pulled downward a whole step, damped instantly with the palm, one soft air displacement following it. 340 milliseconds, dry, neutral, matter-of-fact, no resonance and no tail.

**B.** pm_energy_spend — warm spend cue for a lightning charge leaving a counter in a mobile app. Muted marimba note with a short downward pitch bend and a soft felt-mallet thud beneath it, the two decaying together. 340 milliseconds, rounded, friendly, clearly a subtraction rather than a loss.

**C.** pm_energy_spend — cinematic release of stored charge in a premium app. Low cello note bowed short and released, a faint electrical breath peeling away from it into open air. 340 milliseconds, physical, weighted, quick natural decay.

### `pm_energy_spend_land_v1` — 0.26 с, громкость 0.22
**Экран:** `components/EnergySpendFlightHost.tsx` · Момент: молния долетела до цели и впиталась, 0.68 пути анимации.

**A.** pm_energy_spend_land — clean interface impact for a charge arriving at its destination and being absorbed. Single muted glass tap with an immediate cut, no ring whatsoever. 260 milliseconds, dry, precise, purely functional.

**B.** pm_energy_spend_land — soft landing cue for a lightning bolt being absorbed into an activity in a mobile app. Warm woodblock knock with a low harp string sympathetically humming behind it. 260 milliseconds, satisfying, tactile.

**C.** pm_energy_spend_land — cinematic absorption of energy into a surface in a premium app. Deep felt thud with a short breath of air pulled inward after it, as though the surface drank the charge. 260 milliseconds, physical, grounded, no tail.

### `pm_energy_low_v1` — 0.6 с, громкость 0.28
**Экран:** `components/EnergyCostBadge.tsx`, счётчик на Главной · Момент: после списания осталась последняя единица энергии, счётчик подсветился предупреждением.

**A.** pm_energy_low — restrained interface warning that an energy balance has reached its last unit. Two clarinet notes falling a minor third, the second held thin and slightly unstable before stopping. 600 milliseconds, informative, calm, entirely free of alarm.

**B.** pm_energy_low — gentle low-balance heads-up in a mobile learning app. Low bassoon note with a slow downward bend and a muted bell resting quietly behind it. 600 milliseconds, warm, cautionary, kind rather than urgent.

**C.** pm_energy_low — cinematic dimming of a power reserve in a premium app. Low strings deflating slowly with a distant glass tone thinning out above them and a faint hollow room behind. 600 milliseconds, melancholic, dignified, short tail.

---
# 2. Сердечки: потеря, обнуление, восстановление

Инструменты раздела: **низкие струнные и фагот** для потери, **тёплые струнные
с челестой** для восстановления, **арфа** для подарка.

Сердечек в сессии **три** (`SESSION_ATTEMPTS_MAX`). Потеря первого, второго и
третьего звучит **по-разному** — иначе человек не слышит, что приближается к
краю. Это три файла, а не один с разной громкостью.

Правило владельца «ошибка не унижает» здесь главное: потеря сердечка — это
уже неприятно визуально, звук обязан быть мягким.

---

### `pm_heart_lost_1_v1` — 0.42 с, громкость 0.28
**Экран:** `components/session_attempts/SessionAttemptsHud.tsx` · Момент: потеряно первое из трёх сердечек, осталось два. Мягкое замечание, не тревога.

**A.** pm_heart_lost_1 — restrained interface cue for the first of three attempt tokens being spent. Single low pizzicato string note released downward with a soft damping, one quiet air movement closing it. 420 milliseconds, neutral, unhurried, informing without any sting.

**B.** pm_heart_lost_1 — gentle setback cue for losing one heart in a mobile learning app. Warm bassoon note bending slowly downward with a muted harp string humming underneath. 420 milliseconds, soft, forgiving, no punishment in the tone.

**C.** pm_heart_lost_1 — cinematic quiet loss of a single life token in a premium app. Low cello sighing downward with a faint glass tone dimming above it and a breath of open room behind. 420 milliseconds, tender, dignified, short natural decay.

### `pm_heart_lost_2_v1` — 0.5 с, громкость 0.32
**Экран:** `components/session_attempts/SessionAttemptsHud.tsx` · Момент: потеряно второе сердечко, осталось одно. Заметно серьёзнее первого — человек должен услышать приближение края.

**A.** pm_heart_lost_2 — interface cue for the second of three attempt tokens being spent, pitched a step lower than the first. Two low pizzicato notes falling in sequence, the second landing heavier and stopping dead. 500 milliseconds, firmer, more serious, still entirely free of alarm.

**B.** pm_heart_lost_2 — warmer warning cue for a second heart lost in a mobile learning app. Bassoon and low harp descending together a minor third, a soft drum felt beneath the landing. 500 milliseconds, weighted, concerned, kind.

**C.** pm_heart_lost_2 — cinematic second loss in a premium app, darker than the first. Low strings drawing downward with a hollow wooden knock at the bottom and the room tightening around it. 500 milliseconds, sober, physical, controlled tail.

### `pm_heart_lost_last_v1` — 0.7 с, громкость 0.34
**Экран:** `components/session_attempts/SessionAttemptsHud.tsx` · Момент: потеряно последнее, третье сердечко. Сессия остановлена, сейчас откроется окно восстановления.

**A.** pm_heart_lost_last — restrained interface tone for the final attempt token being spent and a session halting. Three low clarinet notes stepping downward, the last one held thin and fading to nothing. 700 milliseconds, final, calm, sympathetic rather than punishing.

**B.** pm_heart_lost_last — gentle end-of-attempts cue in a mobile learning app. Low bassoon phrase descending a fourth with warm strings dimming behind it and a single muted drum settling underneath. 700 milliseconds, heavy but warm, never harsh.

**C.** pm_heart_lost_last — cinematic closing of the last life in a premium app. Low strings sinking with a slow woodwind breath over them, a distant glass tone extinguishing at the end. 700 milliseconds, melancholic, spacious, dignified decay.

### `pm_hearts_restored_runes_v1` — 1.2 с, громкость 0.48
**Экран:** `components/session_attempts/SessionAttemptsRecoveryModal.tsx` · Момент: пользователь заплатил 25 рун, все три сердечка вернулись, сессия продолжается.

**A.** pm_hearts_restored_runes — premium interface confirmation for three attempt tokens being purchased back with in-app currency. The signature three-note motif at reward scale on celesta, one note per restored token, warm strings blooming underneath on the third and holding briefly. 1.2 seconds, relieving, generous, clean controlled tail.

**B.** pm_hearts_restored_runes — warm recovery cue for buying back three hearts in a mobile learning app. Harp arpeggio rising through three clear notes with a light glass sparkle landing on each, resolving into a soft sustained chord. 1.2 seconds, rewarding, encouraging, a second chance granted.

**C.** pm_hearts_restored_runes — cinematic restoration of spent lives in a premium app. Low warm strings swell from silence for 400 milliseconds, three bell tones enter one by one above them, and the air opens out on the last. 1.2 seconds, hopeful, majestic yet restrained.

### `pm_hearts_restored_gift_v1` — 1.1 с, громкость 0.46
**Экран:** `components/session_attempts/SessionAttemptsRecoveryModal.tsx`, вариант `gift` · Момент: сердечки восстановлены подарком, а не за руны — бесплатно и неожиданно.

**A.** pm_hearts_restored_gift — refined interface cue for three attempt tokens being restored by a free gift rather than a purchase. Ascending glass harmonic unwrapping into three quick celesta notes, lighter and more surprised than a paid restoration. 1.1 seconds, delighted, weightless, clean stop.

**B.** pm_hearts_restored_gift — warm free-gift recovery in a mobile learning app. Soft ribbon-pull whisper followed by a harp run of three rising notes with gold shimmer trailing above them. 1.1 seconds, cheerful, generous, a happy surprise.

**C.** pm_hearts_restored_gift — cinematic unexpected grant of restored lives in a premium app. Faint paper-and-air release, then warm strings blooming upward with a bell cascade descending softly across the resolution. 1.1 seconds, tender, spacious, short tail.

---
# 3. Руны: начисление и полёт

Инструменты раздела: **челеста и стеклянные гармоники** — по системе это
инструмент валюты и знания.

Полёт руны длится **620 мс** (`FLIGHT_MS` в `LearningV2RuneFlight.tsx`).
Начисление — это **последовательность**, а не один звук: отрыв → полёт →
приземление в кошелёк → тики счётчика. Поэтому здесь пять файлов, и они
рассчитаны на склейку.

> **Волны громкости обязательны.** Тик счётчика (0.16) сильно тише
> приземления (0.44) — иначе десять тиков подряд забьют ухо и звук
> награды перестанет читаться как награда.

---

### `pm_rune_award_v1` — 0.5 с, громкость 0.34
**Экран:** `app/(tabs)/lessons.tsx` → `components/LearningV2RuneFlight.tsx` · Момент: сессия закрыта, руна начислена и отрывается от места награды, начиная полёт к кошельку.

**A.** pm_rune_award — precise interface cue for a currency token being awarded and lifting off toward a wallet. Single clear celesta note struck cleanly, rising a fourth as it departs, one thin glass overtone trailing behind. 500 milliseconds, bright, weightless, no muddiness.

**B.** pm_rune_award — warm reward cue for earning a rune in a mobile learning app. Bright harp pluck with a glass harmonic blooming above it and a soft upward air lift carrying it away. 500 milliseconds, generous, cheerful, clearly a gift.

**C.** pm_rune_award — cinematic minting of a currency token in a premium app. Struck crystal tone with a faint metallic bloom and a slow breath of air rising underneath it. 500 milliseconds, precious, spacious, controlled decay.

### `pm_rune_flight_v1` — 0.62 с, громкость 0.18
**Экран:** `components/LearningV2RuneFlight.tsx` · Момент: руна летит по дуге от места награды к счётчику в шапке. Подложка под всю анимацию, звучит очень тихо.

**A.** pm_rune_flight — subtle interface transit for a token travelling across the screen. Thin glass harmonic sustaining and sliding gently upward in pitch, nothing else present. 620 milliseconds, quiet, continuous, deliberately unobtrusive.

**B.** pm_rune_flight — light travel cue for a coin arcing toward a wallet in a mobile app. Soft bowed-glass tone with a faint shimmer riding along it, rising slowly. 620 milliseconds, airy, warm, sits beneath other sounds.

**C.** pm_rune_flight — cinematic passage of a small precious object through open air. Faint whistling air with a distant crystal ring threaded through it, gliding upward. 620 milliseconds, atmospheric, delicate, never in the foreground.

### `pm_rune_land_v1` — 0.44 с, громкость 0.44
**Экран:** `components/RuneBalanceChip.tsx`, `components/home/HomeRuneBalance.tsx` · Момент: руна долетела и упала в кошелёк, счётчик сейчас начнёт расти.

**A.** pm_rune_land — clean interface impact for a currency token dropping into a wallet. Single bright glass tap landing precisely with a short crystalline ring and an immediate settle. 440 milliseconds, satisfying, precise, tail kept tight.

**B.** pm_rune_land — warm arrival cue for a coin landing in a balance counter in a mobile app. Rounded bell strike with a low harp string resonating sympathetically beneath it. 440 milliseconds, rewarding, tactile, generous for its size.

**C.** pm_rune_land — cinematic deposit of a precious token into a vault in a premium app. Struck metal-and-glass impact with a deep warm bloom under it and the room briefly opening. 440 milliseconds, weighty, expensive, controlled decay.

### `pm_rune_count_tick_v1` — 0.12 с, громкость 0.16
**Экран:** `components/RuneBalanceChip.tsx` · Момент: счётчик рун бежит вверх, один шаг числа. Повторяется много раз подряд — обязан быть почти незаметным.

**A.** pm_rune_count_tick — minimal interface tick for a numeric counter advancing by one step. Single very short glass tap, dry, no ring, no pitch movement. 120 milliseconds, tiny, neutral, designed to repeat rapidly without fatigue.

**B.** pm_rune_count_tick — light counting cue for a balance rolling upward in a mobile app. Soft muted celesta touch with the faintest warm body under it. 120 milliseconds, gentle, repeatable, never sharp.

**C.** pm_rune_count_tick — refined mechanical increment in a premium app. Small wooden-and-glass click with a whisper of air around it. 120 milliseconds, tactile, quiet, instant stop.

### `pm_rune_count_done_v1` — 0.62 с, громкость 0.40
**Экран:** `components/RuneBalanceChip.tsx` · Момент: счётчик рун добежал до нового значения и замер. Закрывающий аккорд последовательности.

**A.** pm_rune_count_done — premium interface resolution for a counter settling on its final value. The signature motif at micro scale on celesta, three quick notes rising and locking, warm strings catching the last one briefly. 620 milliseconds, conclusive, clean, tail controlled.

**B.** pm_rune_count_done — warm completion cue for a balance finishing its climb in a mobile app. Harp triplet rising into a soft sustained chord with a light gold shimmer on top. 620 milliseconds, satisfying, generous, a total confirmed.

**C.** pm_rune_count_done — cinematic settling of a wealth counter in a premium app. Crystal tones resolving upward over a low warm bloom that swells briefly and releases. 620 milliseconds, dignified, spacious, short clean decay.

---
# 4. Нажатия: мягкий приятный отклик

Инструменты раздела: **демпфированное пиццикато и стекло**, ничего звенящего.

Владелец просит вернуть нажатие: «мягкий приятный». Это самый опасный раздел
документа — в приложении **734 точки касания**. Правила жёсткие:

1. **Громкость 0.10–0.14.** Не громче. Это подложка под палец, а не сигнал.
2. **Длительность 80–160 мс.** Без хвоста вообще. Хвост при быстром
   повторении превращается в кашу.
3. **Без высоких звенящих частот.** Демпфированный звук, срезанный верх.
4. **Одна высота тона.** Никакого движения по высоте — иначе 734 нажатия
   складываются в непрошеную мелодию.
5. **Только управляющие кнопки.** По правилу владельца плитки и буквы
   упражнений остаются на вибрации, звука там нет.

Три звука на всё приложение: обычное нажатие, главная кнопка, запрет.

---

### `pm_tap_soft_v1` — 0.1 с, громкость 0.12
**Экран:** глобально, `app/feedback/feedback_kit.ts` → `fk.tap()` · Момент: обычное нажатие на управляющую кнопку. Самый частый звук приложения — 734 точки вызова.

**A.** pm_tap_soft — minimal interface touch confirmation for a button press in a premium app. Single damped pizzicato string note, extremely short, high frequencies rolled off, absolutely no ring or tail. 100 milliseconds, soft, neutral, engineered to repeat hundreds of times without fatigue.

**B.** pm_tap_soft — gentle press cue for a control button in a mobile app. Muted felt-covered mallet touching a warm wooden bar, rounded and dark, stopping instantly. 100 milliseconds, cosy, tactile, never sharp or clicky.

**C.** pm_tap_soft — refined physical contact in a premium interface. Fingertip meeting soft-touch glass, a whisper of air displaced and immediately closed. 100 milliseconds, understated, expensive, no resonance whatsoever.

### `pm_tap_primary_v1` — 0.16 с, громкость 0.14
**Экран:** главные кнопки действия — «Начать», «Продолжить», «Купить» · Момент: нажата основная кнопка экрана, за которой следует переход или действие.

**A.** pm_tap_primary — precise interface confirmation for a primary action button being pressed. Damped pizzicato note with a single quiet body resonance beneath it, slightly fuller than a standard tap but equally short. 160 milliseconds, decisive, clean, no tail.

**B.** pm_tap_primary — warm commit cue for a main call-to-action in a mobile app. Soft harp pluck with a low rounded thud landing with it, the two damped together. 160 milliseconds, confident, satisfying, friendly.

**C.** pm_tap_primary — cinematic press of a weighted control in a premium app. Deep felt contact with a brief warm bloom underneath and air closing around it. 160 milliseconds, substantial, quiet, controlled stop.

### `pm_tap_blocked_v1` — 0.2 с, громкость 0.16
**Экран:** заблокированные кнопки, недоступные разделы · Момент: нажатие на заблокированный элемент. Отказ, который не ругает.

**A.** pm_tap_blocked — restrained interface refusal for a disabled control being pressed. Single low damped note with no upward movement, dull and closed, stopping at once. 200 milliseconds, neutral, informative, entirely free of any harsh buzz.

**B.** pm_tap_blocked — gentle unavailable cue in a mobile app. Muted low bassoon touch with a soft wooden knock beneath it, warm and slightly hollow. 200 milliseconds, kind, clear, never scolding.

**C.** pm_tap_blocked — cinematic soft refusal in a premium app. Padded contact against a closed surface with a faint low breath absorbed into it. 200 milliseconds, physical, dignified, no tail.

---
# 5. Арена: вопросы, экраны, результат

Инструменты раздела: **литавры и малый барабан дозированно**, **низкие
струнные** для напряжения, **челеста** для звёзд, **валторна** для ранга.

В реестре **28 ключей Арены с пустым источником** (`source: null`). Код уже
расставлен: файл кладут в `assets/audio/sfx/v1/arena/`, меняется одна строка
в `modules/audio/sound_events.ts`.

> ⚠️ **Старый файл `docs/arena/SOUND_PROMPTS.md` использовать нельзя.** Он
> написан в другой манере (синусоиды и синтезаторы) — сгенерированные по нему
> звуки выпадут из «Королевской академии». Промпты ниже переписаны в систему
> приложения. Здесь даны **13 ключевых** ключей; остальные 15 (`search_loop`,
> `opponent_answered`, `timeout`, `result_draw`, `pair_match`, `pair_miss`,
> `pair_clear`, `combo_start`, `combo_up`, `combo_break`, `star_fly`,
> `star_land`, `goal_complete`, `reward_unlock`, `rank_down`) переведу
> следующей редакцией по команде владельца.

Арена — единственное место, где разрешён **барабан**. Но правило владельца
«ошибка не унижает» действует и здесь: проигрыш звучит достойно, а не позорно.

---

### `pm_arena_search_start_v1` — 0.4 с, громкость 0.35
**Экран:** `app/arena_matchmaking.tsx` · Момент: пользователь нажал «Играть», начался поиск соперника.

**A.** pm_arena_search_start — focused interface cue for a matchmaking search beginning. Two low string notes tightening upward with a single soft drum pulse beneath them. 400 milliseconds, purposeful, alert, no aggression.

**B.** pm_arena_search_start — energetic search-start cue for a competitive mode in a mobile learning app. Rising harp figure with a light snare brush sweeping underneath it. 400 milliseconds, eager, warm, inviting a contest.

**C.** pm_arena_search_start — cinematic opening of a duel search in a premium app. Low strings drawing tight with a distant timpani stroke and air gathering around them. 400 milliseconds, tense, controlled, short tail.

### `pm_arena_opponent_found_v1` — 0.7 с, громкость 0.6
**Экран:** `app/arena_matchmaking.tsx` → `components/arena/ArenaVersusIntro.tsx` · Момент: соперник найден, на экран выезжает заставка «против».

**A.** pm_arena_opponent_found — decisive interface announcement that an opponent has been matched. Two string notes locking together with a single firm timpani stroke landing under the second. 700 milliseconds, confident, arresting, clean stop.

**B.** pm_arena_opponent_found — exciting match-found cue in a mobile competitive mode. Bright brass note with a snare roll rising into it and a bell striking at the peak. 700 milliseconds, thrilling, warm, sporting rather than martial.

**C.** pm_arena_opponent_found — cinematic reveal of a rival in a premium app. Low strings swell for 300 milliseconds, a horn enters firmly, and a single deep drum seals the moment. 700 milliseconds, dramatic, dignified, controlled decay.

### `pm_arena_countdown_tick_v1` — 0.2 с, громкость 0.34
**Экран:** `app/arena_match.tsx` · Момент: обратный отсчёт до старта, один тик секунды. Повторяется три раза подряд.

**A.** pm_arena_countdown_tick — precise interface tick for one second of a pre-match countdown. Single dry wooden knock with a faint low string underneath, cut immediately. 200 milliseconds, neutral, mechanical, identical on every repeat.

**B.** pm_arena_countdown_tick — warm countdown beat in a mobile competitive mode. Muted timpani tap with a soft pitched body under it. 200 milliseconds, steady, anticipatory, repeatable.

**C.** pm_arena_countdown_tick — cinematic pulse before a duel in a premium app. Deep felt drum stroke with the room briefly tightening around it. 200 milliseconds, weighted, tense, no tail.

### `pm_arena_countdown_go_v1` — 0.5 с, громкость 0.55
**Экран:** `app/arena_match.tsx` · Момент: отсчёт кончился, матч начался, первый вопрос на экране.

**A.** pm_arena_countdown_go — sharp interface release marking the start of a timed duel. String notes opening upward with a single clean drum hit driving them forward. 500 milliseconds, energetic, releasing tension, decisive.

**B.** pm_arena_countdown_go — bright start signal for a competitive round in a mobile app. Brass note with a snare accent and a quick harp sweep launching from it. 500 milliseconds, exhilarating, warm, sporting.

**C.** pm_arena_countdown_go — cinematic launch of a head-to-head match in a premium app. Timpani stroke with low strings surging outward and air rushing away from the impact. 500 milliseconds, powerful, controlled, short tail.

### `pm_arena_task_in_v1` — 0.26 с, громкость 0.24
**Экран:** `components/arena/ArenaQuestion.tsx` · Момент: новый вопрос выезжает на экран. Повторяется каждый раунд — тихий и короткий.

**A.** pm_arena_task_in — subtle interface transition for a new question card arriving in a timed duel. Quick harp harmonic sweeping upward onto one quiet note. 260 milliseconds, light, unobtrusive, clean.

**B.** pm_arena_task_in — light card-in cue for a new challenge in a mobile competitive mode. Soft pizzicato note with a small breath of air arriving with it. 260 milliseconds, snappy, friendly.

**C.** pm_arena_task_in — refined entrance of a question panel in a premium app. Faint string swell resolving onto a muted celesta touch. 260 milliseconds, smooth, elegant, no tail.

### `pm_arena_option_tap_v1` — 0.12 с, громкость 0.2
**Экран:** `components/arena/ArenaQuestion.tsx` · Момент: пользователь коснулся варианта ответа. Самое частое касание Арены.

**A.** pm_arena_option_tap — minimal interface touch for selecting an answer option under time pressure. Single damped pizzicato note, very short, no ring at all. 120 milliseconds, neutral, fast, built to repeat.

**B.** pm_arena_option_tap — soft pick cue for choosing an answer in a mobile duel. Muted felt mallet on a warm bar, rounded and dark. 120 milliseconds, gentle, tactile.

**C.** pm_arena_option_tap — refined contact with an answer tile in a premium app. Fingertip on soft glass with a whisper of air closing behind it. 120 milliseconds, quiet, expensive, instant stop.

### `pm_arena_answer_correct_v1` — 0.38 с, громкость 0.42
**Экран:** `app/arena_match.tsx` · Момент: ответ верный. Звучит часто — короткий и не пафосный.

**A.** pm_arena_answer_correct — precise interface confirmation for a correct answer in a timed duel. The signature motif at micro scale on celesta, two notes rising and resolving immediately. 380 milliseconds, clean, satisfying, no celebration.

**B.** pm_arena_answer_correct — warm correct cue in a mobile competitive round. Bright harp pluck with a light glass sparkle above it. 380 milliseconds, cheerful, quick, encouraging.

**C.** pm_arena_answer_correct — refined verification tone in a premium duel. Struck crystal note with a faint warm bloom under it. 380 milliseconds, elegant, brief, controlled decay.

### `pm_arena_answer_first_v1` — 0.46 с, громкость 0.48
**Экран:** `app/arena_match.tsx` · Момент: ответ верный И раньше соперника. Главное микро-достижение Арены — должен слышаться заметно ярче обычного верного.

**A.** pm_arena_answer_first — premium interface accent for answering correctly before an opponent. The signature motif at micro scale on celesta with a third note lifting a fourth above and a soft drum accent marking the speed. 460 milliseconds, triumphant in miniature, sharp, clean tail.

**B.** pm_arena_answer_first — bright speed-win cue in a mobile duel. Harp triplet rising fast with a bell landing on top and a snare brush snapping underneath. 460 milliseconds, exhilarating, warm, rewarding quickness.

**C.** pm_arena_answer_first — cinematic first-strike moment in a premium competitive app. Crystal tones cascading upward over a short timpani accent with air snapping outward. 460 milliseconds, decisive, expensive, tight decay.

### `pm_arena_answer_wrong_v1` — 0.32 с, громкость 0.28
**Экран:** `app/arena_match.tsx` · Момент: ответ неверный. Правило владельца: не унижать.

**A.** pm_arena_answer_wrong — restrained interface tone for an incorrect answer in a duel. Two low clarinet notes falling a minor third, damped quickly. 320 milliseconds, calm, informative, free of any harsh sting.

**B.** pm_arena_answer_wrong — gentle miss cue in a mobile competitive round. Low bassoon note with a soft downward bend and a muted pad releasing. 320 milliseconds, warm, understanding, never mocking.

**C.** pm_arena_answer_wrong — cinematic soft miss in a premium duel. Low strings deflating with a faint woodwind breath over them. 320 milliseconds, sympathetic, dignified, short tail.

### `pm_arena_timer_tick_v1` — 0.14 с, громкость 0.3
**Экран:** `components/arena/ArenaTimerRing.tsx` · Момент: последние секунды на ответ, кольцо таймера догорает. Повторяется каждую секунду.

**A.** pm_arena_timer_tick — minimal interface tick for the final seconds of an answer timer. Dry wooden knock with a thin low string under it, cut instantly. 140 milliseconds, mechanical, urgent without alarm, identical each repeat.

**B.** pm_arena_timer_tick — warm pressure beat for a running clock in a mobile duel. Muted drum tap with a faint pitched body beneath. 140 milliseconds, insistent, steady.

**C.** pm_arena_timer_tick — cinematic pulse of a closing deadline in a premium app. Deep felt stroke with the room tightening briefly around it. 140 milliseconds, tense, physical, no tail.

### `pm_arena_result_win_v1` — 1.4 с, громкость 0.55
**Экран:** `app/arena_results.tsx` · Момент: матч выигран. Крупная церемония Арены.

**A.** pm_arena_result_win — premium ceremony for winning a head-to-head duel. The signature motif at ceremony scale: celesta states three rising notes, warm strings answer beneath, a soft horn carries the resolution over a single timpani stroke. 1.4 seconds, earned and expensive, no muddiness, clean tail.

**B.** pm_arena_result_win — celebratory victory fanfare in a mobile competitive mode. Harp and bell rising in two waves with warm brass landing on the resolution and a snare roll releasing underneath. 1.4 seconds, joyful, sporting, generous but never noisy.

**C.** pm_arena_result_win — cinematic triumph in a premium duel app. Horn and string swell with a choir pad opening behind, a deep timpani on the downbeat, and celesta cascading above the resolution. 1.4 seconds, majestic, restrained, controlled decay.

### `pm_arena_result_loss_v1` — 1.2 с, громкость 0.38
**Экран:** `app/arena_results.tsx` · Момент: матч проигран. Достойно, а не позорно — человек вернётся играть снова.

**A.** pm_arena_result_loss — restrained closing tone for losing a duel with dignity. Three low string notes descending and settling onto a held fifth that fades naturally. 1.2 seconds, sober, respectful, entirely free of humiliation.

**B.** pm_arena_result_loss — warm defeat cue in a mobile competitive mode. Low bassoon phrase descending a fourth with strings dimming behind it and a single soft drum settling. 1.2 seconds, gentle, encouraging a rematch.

**C.** pm_arena_result_loss — cinematic honourable defeat in a premium app. Low strings sinking slowly with a distant horn fading and air opening out behind. 1.2 seconds, melancholic, dignified, spacious tail.

### `pm_arena_rank_up_v1` — 1.3 с, громкость 0.55
**Экран:** `app/arena_ranks.tsx`, `components/arena/ArenaRankHybrid.tsx` · Момент: набрана звезда, ранг повышен. Редкое событие — звучит богато.

**A.** pm_arena_rank_up — premium ceremony for a competitive rank advancing one step. The signature motif at ceremony scale on celesta with warm strings blooming underneath and a soft horn sealing the new tier. 1.3 seconds, prestigious, clean, controlled tail.

**B.** pm_arena_rank_up — celebratory promotion cue in a mobile competitive mode. Bell and harp fanfare rising with warm brass resolving and gold shimmer trailing above. 1.3 seconds, proud, generous, warm.

**C.** pm_arena_rank_up — cinematic ascent to a higher rank in a premium app. Horn and strings swelling with a timpani stroke beneath and crystal tones cascading across the resolution. 1.3 seconds, majestic, earned, restrained decay.

---

## Итог документа

| Раздел | Звуков | Промптов |
|---|---|---|
| 1. Энергия | 3 | 9 |
| 2. Сердечки | 5 | 15 |
| 3. Руны | 5 | 15 |
| 4. Нажатия | 3 | 9 |
| 5. Арена | 13 | 39 |
| **Всего** | **29** | **87** |

Осталось перевести в систему: **15 ключей Арены** второго эшелона
(`search_loop`, `opponent_answered`, `timeout`, `result_draw`, `combo_start`,
`combo_up`, `combo_break`, `pair_match`, `pair_miss`, `pair_clear`,
`star_fly`, `star_land`, `goal_complete`, `reward_unlock`, `rank_down`) —
скажите, допишу следующей редакцией.

### После генерации файлов

Кладёте файлы в `assets/audio/sfx/v1/<раздел>/` — и я подключаю:

- **энергия, сердечки, руны, нажатия** — новые ключи в `SOUND_EVENTS`
  (`modules/audio/sound_events.ts`) плюс вызовы в местах, перечисленных
  в таблице аудита выше;
- **Арена** — 13 ключей уже существуют, у каждого меняется `null` на
  `require(...)`, больше ничего трогать не нужно.
