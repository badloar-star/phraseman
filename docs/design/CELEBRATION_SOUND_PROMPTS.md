# Празднование Plus/Pro/Промокод/MAX — промпты для генерации звуков

Макет-эталон: `.motion-mockups/phraseman-celebration-v6.html` («Золотая палата»).
Генератор: **Adobe Firefly Sounds**. Стиль — семейство существующих звуков
приложения (`assets/audio/sfx/v1/reward/pm_reward_*.m4a`): короткие, чистые,
тёплые, без длинных реверберационных хвостов, не мультяшные.
Целевая папка: **`assets/audio/sfx/v1/celebration/`**.

Каждый звук описан тремя промптами в **разных стилях**:

- **A — интерфейсный.** Минимализм, чистый синтез, ощущение дорогого софта.
- **B — игровой.** Аркадная подача, тёплые тона, ближе к текущим `pm_reward_*`.
- **C — кинематографичный.** Премиальная подача, слой воздуха и веса.

Технические требования ко всем файлам: моно, 48 кГц, формат m4a, тишина
в начале обрезана, нормализация −14 LUFS, пиковое −1 dBTP.

---

## Как читать этот документ

У каждого звука есть **карта ударов** — таблица, снятая напрямую с работающей
анимации макета (замер `getComputedStyle` по каждому элементу сцены, а не на
глаз). В ней:

- **мс** — момент от начала сцены, когда визуальное событие **начинается**;
- **событие** — что именно происходит на экране;
- **звук** — что должно прозвучать ровно в эту миллисекунду.

**Атака звука обязана совпадать с началом визуального события.** Если удар в
файле стоит на 200 мс, а на экране вспышка на 110 мс — сцена «плывёт», и это
слышно даже без осознания. Поэтому каждый промпт называет точные миллисекунды.

**Правило тишины:** между ударами внутри сцены должна быть настоящая тишина или
очень тихий слой. Заполненный звуком таймлайн превращает одиннадцать сцен в кашу.

**Правило усталости уха:** одиннадцать звуков подряд — это много. Громкость идёт
волнами: сцены 1, 4 и 8 самые заметные (0.50), между ними тише (0.42-0.46).
Не делать все одиннадцать одинаково громкими.

---

## Карта последовательности

| # | Файл | Момент | Длина | Громкость |
|---|---|---|---|---|
| — | `cel_open_rift` | Акт 1: вспышка, раскол, удар эмблемы | 1.45 с | 0.62 |
| 1 | `cel_energy_break` | Шкала лимита лопается → ∞ | 1.21 с | 0.50 |
| 2 | `cel_locks_off` | Замки слетают диагональной волной | 0.78 с | 0.44 |
| 3 | `cel_cards_stack` | Карточки ложатся веером | 1.10 с | 0.44 |
| 4 | `cel_dialog_spark` | Три реплики впрыгивают | 0.90 с | 0.50 |
| 5 | `cel_voice_score` | Волна собирается в оценку | 1.17 с | 0.46 |
| 6 | `cel_coach_heal` | Три узла лечатся | 1.18 с | 0.42 |
| 7 | `cel_error_fix` | Ошибка гаснет, верная фраза встаёт | 1.18 с | 0.44 |
| 8 | `cel_plan_route` | Маршрут прочерчивается по точкам | 1.06 с | 0.50 |
| 9 | `cel_stats_rise` | Столбцы вырастают лесенкой | 1.04 с | 0.44 |
| 10 | `cel_streak_shield` | Щит падает и закрывает пропуск | 1.00 с | 0.52 |
| 11 | `cel_aura_bloom` | Аура разгорается, темы выходят | 1.03 с | 0.48 |
| — | `cel_finale_chord` | Акт 3: число и CTA | 1.6 с | 0.64 |
| — | `cel_promo_stamp` | Промокод: код впечатывается | 0.85 с | 0.56 |
| — | `cel_max_awaken` | MAX: сфера просыпается и говорит | 2.2 с | 0.60 |
| — | `cel_background_bed` | Фон: играет под всем прогоном (все тиры) | 12.0 с | 0.13 |

Шестнадцать файлов. `cel_background_bed` играет фоном под ВСЕМ прогоном
одновременно с остальными — это не часть таймлайна ударов, а отдельный слой.
`cel_promo_stamp` играет **до** `cel_open_rift` в сценарии
промокода. `cel_max_awaken` — только в прогоне MAX, двенадцатой сценой.

---

## 1. Акт 1 — разлом света

### `cel_open_rift.m4a` — 1.45 с, громкость 0.62

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 0 | Вспышка белым на весь экран, пик яркости на 39 мс | Резкий яркий транзиент |
| 0 | Световой шов начинает расти вертикально | Подъём из тишины |
| 150 | Эмблема проявляется из размытия и масштаба 0.72 | Мягкое раскрытие, без атаки |
| 158 | Шов достиг полной высоты и разлетается вширь | Расширение, воздух уходит вширь |
| 260 | Лучи света включаются сверху | Тихий гул нарастает |
| **900** | **Удар эмблемы: сжатие 1.2 × 0.82** | **Главный удар кадра** |
| 900 | Первое кольцо пошло наружу | Волна от удара |
| 990 | Заголовок проявляется из расширенного трекинга | Тихий призвук, НЕ удар |
| 1010 | Второе кольцо, тоньше первого | Эхо волны, тише первого |
| 1450 | Конец акта | Хвост дожит, без резкого обрыва |

**A.** Premium UI opening cue for a celebration screen after a subscription purchase, 1450 milliseconds total, mono, dry. Timeline: a sharp clean transient at 0 ms for a white screen flash; a rising airy sweep from 0 to 158 ms as a vertical seam of light grows; a soft bloom without attack at 150 ms as an emblem resolves from blur; the sweep widens outward from 158 to 400 ms; a quiet low hum enters at 260 ms and sustains; THE MAIN IMPACT lands at exactly 900 ms, a firm warm strike with body, the single loudest moment of the file; a soft expanding wash follows it from 900 to 1200 ms; a faint high shimmer at 990 ms, deliberately not an impact; a quieter echo of the wash at 1010 ms; everything decays naturally by 1450 ms with no abrupt cut. Between 400 and 900 ms keep it nearly silent, only the low hum. Expensive and restrained, never cartoonish.

**B.** Warm arcade unlock fanfare for a premium purchase celebration, 1450 milliseconds, mono, dry. Timeline: bright crystalline pop at 0 ms; ascending synth sweep 0 to 158 ms; soft bell bloom at 150 ms; sweep spreads and thins 158 to 400 ms; quiet sustained pad from 260 ms; a punchy satisfying hit at exactly 900 ms as the main event; two descending bell overtones at 900 ms and 1010 ms, the second softer; a light sparkle at 990 ms; resolve by 1450 ms. Keep 400 to 900 ms sparse so the 900 ms hit feels earned. Game-like but clean, in the family of a treasure-unlocked cue.

**C.** Cinematic reveal for a curtain of light tearing open, 1450 milliseconds, mono, controlled tail. Timeline: sharp bright crack at 0 ms with fast air displacement; low sub-bass rise 0 to 158 ms; airy shimmer emerging at 150 ms; the crack widens into a spatial spread 158 to 400 ms; deep sustained drone from 260 ms; a heavy weighted impact at exactly 900 ms with sub content, the dramatic peak; two rolling shockwaves at 900 ms and 1010 ms; a thin metallic shine at 990 ms; slow warm decay finishing at 1450 ms. The 400 to 900 ms window is held tension, almost empty. Powerful but tight, no muddy low end.

---

## 2. Акт 2 — одиннадцать преимуществ

### `cel_energy_break.m4a` — 1.21 с, громкость 0.50

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 110 | Кольцо шкалы начинает раскручиваться с трети | Нарастающий гул, повышение тона |
| 150 | Подпись сцены проявляется | — тишина |
| 580 | Молния в центре вспыхивает, масштаб 1.42 | Электрический всплеск |
| **600** | **Подпись «5 / 5» разлетается в пыль** | **Хруст лопнувшего предела** |
| 790 | Кольцо замкнулось на полный круг | Гул достиг верха и держится |
| 810 | Знак ∞ выпрыгивает | Чистый звон разрешения |
| 1210 | Конец сцены | Короткий хвост |

**A.** Clean UI sound for an energy gauge breaking its own limit, 1210 milliseconds, mono, dry. Timeline: silence until 110 ms; a smooth filtered sweep rising steadily in pitch from 110 to 790 ms as a ring fills; a short electrical crackle at 580 ms; A GLASSY SNAP at exactly 600 ms, the cap breaking, the loudest point; the sweep peaks and holds at 790 ms; one clear bell tone at 810 ms as an infinity symbol appears; decay ending 1210 ms. Precise, premium software feel, no reverb.

**B.** Arcade power-up for an energy meter bursting past its maximum, 1210 milliseconds, mono, dry. Timeline: silent to 110 ms; ascending synth arpeggio 110 to 790 ms; bright electrical zap at 580 ms; a crunchy break-through hit at exactly 600 ms; arpeggio tops out at 790 ms; triumphant shimmering chime at 810 ms; fade by 1210 ms. Punchy and upbeat, warm.

**C.** Cinematic overload where a limit gauge shatters into infinity, 1210 milliseconds, mono. Timeline: quiet until 110 ms; deep building hum with rising harmonic tension 110 to 790 ms; a sizzling energy discharge at 580 ms; A CRYSTALLINE FRACTURE at exactly 600 ms with real weight; hum reaches full at 790 ms; a wide warm bloom opening at 810 ms; settling by 1210 ms. Weighty, clean low end, no muddiness.

### `cel_locks_off.m4a` — 0.78 с, громкость 0.44

**Карта ударов.** Важно: замки слетают **не по одному**, а диагональными
группами — по 1, 2 или 3 одновременно. Слышна должна быть именно волна, а не
двенадцать ровных щелчков.

| мс | Событие на экране | Звук |
|---|---|---|
| 70 | Слетает 1 замок, угол сетки | Одиночный сухой щелчок |
| 116 | Слетают 2 замка одновременно | Сдвоенный щелчок |
| 162 | Слетают 3 замка одновременно | Плотная тройка |
| 208 | Слетают 3 замка одновременно | Плотная тройка, выше тоном |
| 254 | Слетают 2 замка одновременно | Сдвоенный щелчок |
| 300 | Слетает 1 замок, противоположный угол | Одиночный щелчок, самый высокий |
| 550 | Первые плитки закончили вспышку | Тёплый аккорд разрешения |
| 780 | Конец сцены | — |

**A.** Precise UI unlock wave across a grid of twelve tiles, 780 milliseconds, mono, dry. The clicks are NOT evenly spaced and NOT all single, they arrive in diagonal groups: one click at 70 ms, two simultaneous clicks at 116 ms, three simultaneous at 162 ms, three simultaneous at 208 ms, two at 254 ms, one final click at 300 ms. Each group is pitched slightly higher than the previous, giving a rising diagonal sweep. Then silence until a soft warm resolving chord at 550 ms, decaying by 780 ms. Tiny dry mechanical latch clicks, expensive hardware feel, no reverb.

**B.** Arcade multi-unlock for twelve locked levels opening in a wave, 780 milliseconds, mono, dry. Bright padlock pops in uneven groups: one at 70 ms, two together at 116 ms, three together at 162 ms, three at 208 ms, two at 254 ms, one at 300 ms, each group higher in pitch. Brief gap, then a cheerful resolved chime at 550 ms fading by 780 ms. Warm and playful, never cartoonish.

**C.** Cinematic cascade of locks releasing diagonally across a grid, 780 milliseconds, mono, dry. Metallic latch releases in clustered groups, single at 70 ms, doubled at 116 ms, tripled at 162 ms, tripled at 208 ms, doubled at 254 ms, single at 300 ms, with faint air movement between clusters and a rising pitch contour. A low warm resonance with gold shimmer enters at 550 ms and fades by 780 ms. Tactile, no long tail.

### `cel_cards_stack.m4a` — 1.10 с, громкость 0.44

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 90 | 1-я карточка приземляется, поворот −15° | Мягкий бумажный шлепок |
| 178 | 2-я карточка | Шлепок, чуть выше тоном |
| 266 | 3-я карточка | Шлепок |
| 354 | 4-я карточка | Шлепок |
| 442 | 5-я карточка, веер собран | Шлепок, самый плотный |
| 700 | Счётчик «20 → ∞» выпрыгивает | Чистый звон |
| 1100 | Конец сцены | — |

Интервал ровно **88 мс** — единственная сцена с равномерным ритмом, потому что
раздача карт в реальности равномерна. Не «улучшать» её неравномерностью.

**A.** Precise UI cue for five cards landing into a fanned stack, 1100 milliseconds, mono, dry. Five soft paper-like taps at exactly 90, 178, 266, 354 and 442 ms, evenly spaced 88 ms apart, each slightly denser and lower than the last as the stack thickens. Silence from 442 to 700 ms. One clean bright tone at 700 ms as a counter appears. Decay by 1100 ms. Close-miked, tactile, no reverb, premium.

**B.** Arcade card-dealing cue, 1100 milliseconds, mono, dry. Five quick playful card flicks at 90, 178, 266, 354 and 442 ms, evenly spaced, with light rising pitch. Pause, then a bright confirming chime at 700 ms. Fade by 1100 ms. Warm and satisfying.

**C.** Cinematic deck settling into a fan, 1100 milliseconds, mono, controlled tail. Five layered paper-and-air landings at 90, 178, 266, 354 and 442 ms, evenly spaced, each with a touch more weight than the previous. Held quiet to 700 ms, then a warm low thud with faint gold shimmer. Resolve by 1100 ms.

### `cel_dialog_spark.m4a` — 0.90 с, громкость 0.50

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 120 | Твоя реплика впрыгивает справа | Мягкий «пуф» отправки, средний тон |
| 300 | Ответ собеседника слева | «Пуф» ниже тоном, другой голос |
| 520 | Твоя реплика справа | «Пуф» средний, ярче предыдущих |
| 900 | Конец сцены | — |

Интервалы **180 и 220 мс** — намеренно неравномерные, как пауза на обдумывание
в настоящей переписке. Не выравнивать.

**A.** Minimal UI cue for three chat bubbles in an AI conversation, 900 milliseconds, mono, dry. Three soft rounded blips at exactly 120, 300 and 520 ms, note the uneven spacing, 180 ms then 220 ms, like natural conversational turns. The first is mid-pitched for the user, the second clearly lower for the AI replying, the third mid-pitched again but brightest. Silence between them. Decay by 900 ms. Gentle premium messaging feel, no reverb.

**B.** Friendly arcade message-pop sequence, 900 milliseconds, mono, dry. Three bouncy synth pops at 120, 300 and 520 ms with unequal spacing, alternating mid, low, mid pitch, the last one carrying a small sparkle. Warm and inviting, never cartoonish.

**C.** Cinematic cue for three dialogue lines materializing, 900 milliseconds, mono, no reverb wash. Three soft breathy transients at 120, 300 and 520 ms, spaced unevenly like real speech turns, the middle one darker in timbre to read as a different speaker. A light shimmer closes the third. Intimate and dry.

### `cel_voice_score.m4a` — 1.17 с, громкость 0.46

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 70 | Первый столбик волны начинает расти | Начало произносимой фразы |
| 70–510 | 12 столбиков растут каждые 40 мс | Непрерывная речевая текстура |
| 510 | Последний столбик пошёл вверх | Фраза договорена |
| 690 | Оценка «92» выпрыгивает со вспышкой | Чистый восходящий звон результата |
| 720 | Волна гаснет и сжимается | Речь обрывается, уступая звону |
| 1170 | Конец сцены | — |

**A.** Clean UI cue for a speech waveform collapsing into a pronunciation score, 1170 milliseconds, mono, dry. From 70 to 510 ms a continuous soft filtered-noise texture suggesting a short spoken phrase, its energy following twelve bars rising every 40 ms, never individual clicks, one flowing utterance. The texture ends at 510 ms. Brief gap. At exactly 690 ms a clear ascending two-note bell resolution as a score appears. The speech texture is fully gone by 720 ms so the bell stands alone. Decay by 1170 ms. Analytical and premium, no reverb.

**B.** Arcade scoring cue for a voice exercise, 1170 milliseconds, mono, dry. A rising bubbly vocal-formant run from 70 to 510 ms following a growing waveform, then quiet, then a bright triumphant chime at 690 ms with the voice texture cut away by 720 ms. Encouraging and warm, fade by 1170 ms.

**C.** Cinematic voice analysis condensing into a glowing score, 1170 milliseconds, mono, controlled decay. A breathy filtered whisper from 70 to 510 ms, gradually focusing and gaining harmonic definition, silence, then a clean bell strike with warm bloom at exactly 690 ms, the whisper fully absent from 720 ms. Sophisticated, resolve by 1170 ms.

### `cel_coach_heal.m4a` — 1.18 с, громкость 0.42

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 90–298 | 9 связей графа загораются каждые 26 мс | Тихая мерцающая текстура, фон |
| **160** | **1-й красный узел пульсирует и лечится** | **Низкий пульс → светлое разрешение** |
| **350** | **2-й узел лечится** | **Пульс → разрешение, выше тоном** |
| **540** | **3-й узел лечится** | **Пульс → разрешение, самый высокий** |
| 1180 | Конец сцены | Спокойный хвост |

Три лечения — это **три пары** «проблема → решение», а не три одинаковых пинга.
Каждая пара: глухой низкий удар, через ~180 мс светлый разрешающий тон.

**A.** Minimal UI cue for three flawed nodes in a knowledge graph being repaired, 1180 milliseconds, mono, dry. A very quiet shimmering texture runs from 90 to 300 ms as connections light up, background only, never foreground. Three PAIRS of sounds dominate: at 160 ms a low dull pulse immediately answered around 340 ms by a clean higher resolving tone; the same pair again starting at 350 ms; and a third at 540 ms, each pair pitched higher than the last. Nothing after 900 ms but calm decay to 1180 ms. Feels like a system correcting itself, never punishing.

**B.** Arcade repair cue for three weak points being fixed, 1180 milliseconds, mono, dry. Faint sparkle bed 90 to 300 ms. Three muted thud-and-ping pairs beginning at 160, 350 and 540 ms, each pair rising in pitch, the thud dark and the ping bright and positive. Settles into a warm satisfied close by 1180 ms.

**C.** Cinematic healing of three broken links in a neural map, 1180 milliseconds, mono, restrained. Distant harmonic shimmer 90 to 300 ms. Three deep dull heartbeats at 160, 350 and 540 ms, each dissolving roughly 180 ms later into an airy bright resolution with faint metallic sheen, rising in pitch across the three. Warm calm resonance fading by 1180 ms. No aggression in the low end.

### `cel_error_fix.m4a` — 1.18 с, громкость 0.44

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 150 | Подпись сцены | — тишина |
| **320** | **Красная черта прочерчивает неверную фразу** | **Короткий сухой звук вычёркивания** |
| 320–800 | Неверная фраза уезжает вверх и растворяется | Спад, уход в тишину |
| **560** | **Верная фраза всплывает снизу из размытия** | **Чистое восходящее разрешение** |
| 800 | Объяснение проявляется под фразой | Тихий мягкий призвук |
| 1180 | Конец сцены | — |

Звук **не должен быть карательным**: вычёркивание сухое и короткое, а не резкий
сигнал ошибки. Главный по громкости — момент 560 мс, появление верного.

**A.** Clean UI cue for an incorrect phrase being struck through and replaced, 1180 milliseconds, mono, dry. Silence to 320 ms. At exactly 320 ms one short dry scraping stroke as a line draws through the wrong text, brief and matter-of-fact, never a harsh error buzz. The wrong text sinks away with a soft downward fade 320 to 800 ms. At exactly 560 ms a clear rising two-note resolution as the correct phrase surfaces, this is the loudest and warmest moment of the file. A quiet soft tone at 800 ms as an explanation appears. Decay by 1180 ms. Calm and instructive.

**B.** Arcade correction cue, 1180 milliseconds, mono, dry. Quiet to 320 ms, then a short muted scratch as the wrong answer is crossed out, a gentle downward slide, and at 560 ms a bright friendly confirming chime that clearly dominates, the correction is the reward. A small soft ping at 800 ms. Fade by 1180 ms. Encouraging, never scolding.

**C.** Cinematic correction where a flawed line dissolves upward and the true one rises, 1180 milliseconds, mono, restrained. Held silence to 320 ms, one dry textural stroke, a dark fading texture 320 to 800 ms, then at exactly 560 ms an airy warm tone with gentle harmonic bloom rising from below, the emotional peak. A faint airy detail at 800 ms. Resolve by 1180 ms.

### `cel_plan_route.m4a` — 1.06 с, громкость 0.50

**Карта ударов.** Ключ сцены — **чередование**: точка загорается, потом от неё
растёт линия к следующей. Звук обязан это чередование передать.

| мс | Событие на экране | Звук |
|---|---|---|
| 100 | Точка 1 загорается | Чистый пинг, низкий |
| 160 | Линия 1→2 прочерчивается | Короткий скользящий звук |
| 230 | Точка 2 загорается | Пинг выше |
| 290 | Линия 2→3 | Скольжение |
| 360 | Точка 3 | Пинг выше |
| 420 | Линия 3→4 | Скольжение |
| 490 | Точка 4 | Пинг выше |
| 550 | Линия 4→5 | Скольжение |
| 620 | Точка 5, финальная | Пинг самый высокий, ярче |
| 1060 | Конец сцены | Открытый хвост |

**A.** Minimal UI cue for a learning route drawing itself across five waypoints, 1060 milliseconds, mono, dry. The sound ALTERNATES between two elements: clean pings when a point lights up at 100, 230, 360, 490 and 620 ms, and short soft gliding sweeps when a line draws between points at 160, 290, 420 and 550 ms. The pings rise in pitch across the five, the final one at 620 ms brightest and slightly longer. Everything sits 130 ms apart in this ping-glide-ping pattern. Open unresolved decay to 1060 ms, a plan is a beginning, not a conclusion.

**B.** Arcade path-unlock connecting five checkpoints, 1060 milliseconds, mono, dry. Bright rising pings at 100, 230, 360, 490 and 620 ms, each with a light travelling whoosh between them at 160, 290, 420 and 550 ms. Confident ascending contour, final ping strongest. Fade by 1060 ms.

**C.** Cinematic route being charted point by point, 1060 milliseconds, mono, controlled tail. Five soft harmonic arrivals at 100, 230, 360, 490 and 620 ms rising in pitch, connected by four airy directional movements at 160, 290, 420 and 550 ms. Elegant, forward-leaning, ending open at 1060 ms.

### `cel_stats_rise.m4a` — 1.04 с, громкость 0.44

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 80 | Столбец 1 растёт, 34 px | Тик, низкий |
| 132 | Столбец 2, 52 px | Тик выше |
| 184 | Столбец 3, 44 px | Тик ниже предыдущего |
| 236 | Столбец 4, 76 px | Тик заметно выше |
| 288 | Столбец 5, 64 px | Тик ниже |
| 340 | Столбец 6, 96 px | Тик выше |
| 392 | Столбец 7, 82 px | Тик ниже |
| 444 | Столбец 8, 118 px | Тик самый высокий |
| 496 | Столбец 9, 104 px | Тик чуть ниже пика |
| 640 | Число «365 дней» выпрыгивает | Чистое яркое прибытие |
| 1040 | Конец сцены | — |

Шаг ровно **52 мс** — быстрая ровная россыпь. Но высота столбцов неровная,
поэтому тон каждого тика следует этой кривой, а не поднимается линейно.

**A.** Clean UI cue for nine analytics bars growing and a milestone number landing, 1040 milliseconds, mono, dry. Nine short dry ticks spaced exactly 52 ms apart at 80, 132, 184, 236, 288, 340, 392, 444 and 496 ms. Their pitch follows the bar heights, which are uneven: low, mid, lower, high, mid, higher, mid-high, highest, high, so the contour zigzags upward rather than climbing in a straight line. Brief silence, then one clear bright arrival at exactly 640 ms for the number. Decay by 1040 ms. Analytical, premium dashboard feel.

**B.** Arcade stats reveal, 1040 milliseconds, mono, dry. Nine quick blips every 52 ms from 80 to 496 ms, pitch zigzagging upward following uneven bar heights, then a bright celebratory chime at 640 ms as the total appears. Warm, fade by 1040 ms.

**C.** Cinematic data build with a milestone landing, 1040 milliseconds, mono, no long tail. Nine subtle rising harmonic steps 52 ms apart from 80 to 496 ms with an uneven zigzag contour, soft air between them, then a warm confident arrival tone at exactly 640 ms. Restrained, resolve by 1040 ms.

### `cel_streak_shield.m4a` — 1.00 с, громкость 0.52

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 110 | Щит начинает падать сверху, масштаб 1.9, размытие | Свист падения, нарастающий |
| **400** | **Щит впечатывается в пропущенный день** | **Глухой металлический удар** |
| 400–1000 | День загорается, щит растворяется | Тёплое затухание |
| 1000 | Конец сцены | — |

Самая громкая сцена акта 2 (0.52) — здесь единственный настоящий удар металла.

**A.** Precise UI cue for a protective shield sealing a missed day in a streak, 1000 milliseconds, mono, controlled. A descending whoosh building from 110 to 400 ms as the shield falls, pitch and intensity rising as it approaches. ONE FIRM DRY IMPACT at exactly 400 ms, the loudest moment, solid and reassuring rather than violent. A clean warm confirming tone follows immediately and decays through to 1000 ms. No reverb, feels protective.

**B.** Arcade shield-block cue, 1000 milliseconds, mono, dry. Quick falling swoosh 110 to 400 ms, a satisfying metallic clank at exactly 400 ms, then a bright protective chime tail fading by 1000 ms. Warm and punchy.

**C.** Cinematic shield impact protecting a break in a chain, 1000 milliseconds, mono, tight. Fast air displacement 110 to 400 ms with growing pressure, a deep metallic thud with real weight at exactly 400 ms, then a slow warm ring of gold-toned resonance fading out by 1000 ms. Powerful, clean low end.

### `cel_aura_bloom.m4a` — 1.03 с, громкость 0.48

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 220 | Кольцо ауры разгорается вокруг аватара | Тёплый мерцающий подъём |
| 220+ | Кольцо медленно вращается, оборот 5 с | Непрерывный тихий перелив |
| 420 | Образец темы 1 выпрыгивает | Лёгкое кристаллическое касание |
| 478 | Образец 2 | Касание выше |
| 536 | Образец 3 | Касание |
| 594 | Образец 4 | Касание |
| 652 | Образец 5, последний | Касание, самое яркое |
| 1030 | Конец сцены | Мягкое свечение затухает |

Финальная сцена акта 2 — мостик к финалу. Хвост длиннее, чем у соседей.

**A.** Premium UI cue for an aura igniting around an avatar and five theme swatches appearing, 1030 milliseconds, mono, dry. A warm shimmer swells from 220 ms and sustains as a slowly rotating glow. Five delicate crystalline taps at exactly 420, 478, 536, 594 and 652 ms, spaced 58 ms apart, rising in pitch, the last brightest. The shimmer continues under them and dissolves into a soft sustained glow ending at 1030 ms, with a slightly longer tail than the other scenes since this leads into the finale. Elegant, feels like a profile becoming special.

**B.** Arcade cosmetic-unlock cue, 1030 milliseconds, mono, dry. Sparkling rising shimmer from 220 ms, five bright playful pops at 420, 478, 536, 594 and 652 ms rising in pitch, closing on a warm satisfied glow fading by 1030 ms. Never cartoonish.

**C.** Cinematic aura bloom wrapping a character in light, 1030 milliseconds, mono, luxurious. Wide warm shimmer rising from 220 ms with faint metallic overtones and slow rotation, five soft crystalline arrivals layered at 420, 478, 536, 594 and 652 ms, dissolving into a gentle sustained glow through 1030 ms. Longest tail of the act, bridging into the finale.

---

## 3. Акт 3 — финал

### `cel_finale_chord.m4a` — 1.6 с, громкость 0.64

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 0 | Эмблема возвращается из медальона в центр | Подъём начинается |
| 200 | Число преимуществ вылетает крупно | Основной аккорд раскрывается |
| 440 | Кнопка приезжает снизу | Тёплое подтверждение |
| 1600 | Конец | Полное разрешение, без обрыва |

**A.** Premium closing chord for the final frame of a purchase celebration, 1600 milliseconds, mono. A gentle swell begins at 0 ms as the emblem returns to centre; the full warm sustained sine chord opens at exactly 200 ms as a large number appears, this is the emotional centre; a soft warm confirming layer joins at 440 ms as the main button arrives; the whole thing resolves completely and fades naturally by 1600 ms with no abrupt cut. Expensive and calm, the sound of something being finished properly.

**B.** Arcade victory-completion fanfare, 1600 milliseconds, mono, controlled tail. Rising lift from 0 ms, a bright ascending chord with bell and soft brass landing at 200 ms, a warm supportive layer at 440 ms, resolving on a satisfying sustained note through 1600 ms. Celebratory but not loud.

**C.** Cinematic resolution chord ending a premium sequence, 1600 milliseconds, mono, no harsh peak. Wide orchestral-synth swell from 0 ms, blooming fully at 200 ms with subtle low weight and shimmering gold overtones, a warm settling layer at 440 ms, then graceful decay to 1600 ms. Feels like the last frame of a title sequence.

---

## 4. Промокод

### `cel_promo_stamp.m4a` — 0.85 с, громкость 0.56

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 60 | Код летит на экран: масштаб 2.5, поворот −9°, размытие | Свист приближения |
| **410** | **Код впечатывается: масштаб 0.94, откат** | **Сухой удар штампа** |
| 830 | Код растворяется в свет | Восходящее мерцание |
| 850 | Конец, дальше играет `cel_open_rift` | Стык без паузы |

**A.** Clean UI cue for a redeemed promo code stamping onto the screen, 850 milliseconds, mono, dry. A short descending air movement from 60 to 410 ms as the code flies in from a large scale; ONE CRISP DRY IMPACT at exactly 410 ms like a rubber stamp meeting paper, with a tiny settle after it; then a soft rising shimmer from 830 ms as the stamp dissolves into light. Ends at 850 ms and must butt cleanly against the following cue with no gap. Precise and premium, no reverb.

**B.** Arcade cue for a promo code stamping in and turning into a gift, 850 milliseconds, mono, dry. Quick whoosh 60 to 410 ms, a punchy stamp thud at exactly 410 ms with a bright confirming sparkle, a light magical dissolve from 830 ms. Warm and playful, ends cleanly at 850 ms.

**C.** Cinematic stamp impact transmuting into light, 850 milliseconds, mono, controlled. Fast air-displacement approach 60 to 410 ms, a weighty dry press at exactly 410 ms with paper-and-ink texture, dissolving into an airy ascending shimmer from 830 ms. Tactile, no long tail, ends at 850 ms.

---

## 5. MAX — пробуждение

Отдельная сцена, **не вариант Plus**. В прогоне MAX она играет двенадцатой,
после одиннадцати общих. Plus раскалывает экран (обладание), MAX **просыпается**
(присутствие). Поэтому у звука MAX **нет резкой атаки вообще** — он начинается
с вдоха и живёт дыханием. Синяя палитра, никакого золота в тембре.

### `cel_max_awaken.m4a` — 2.2 с, громкость 0.60

**Карта ударов:**

| мс | Событие на экране | Звук |
|---|---|---|
| 0 | Внутреннее поле сферы начинает вращаться | Очень низкий гул из тишины |
| 80 | Сфера проявляется из размытия и масштаба 0.84 | Вдох, БЕЗ удара |
| 420 | Голосовая дорожка проявляется снизу | Мягкое включение присутствия |
| 460 | Первое кольцо речи пошло от сферы | Тёплая волна наружу |
| 480 | Столбики дорожки начинают говорить | Живая речевая текстура, тихо |
| 700 | Сфера начинает дышать, цикл 4.2 с | Медленная пульсация, непрерывная |
| 1020 | Второе кольцо речи | Вторая волна, тише первой |
| 2200 | Конец | Хвоста нет, звук продолжает жить и гаснет |

**A.** Premium cue for an AI voice tutor sphere waking up, 2200 milliseconds, mono, dry. CRITICAL: this file contains no sharp transient anywhere, nothing cracks, nothing snaps. A very low hum emerges from silence at 0 ms; a deep slow intake of air at 80 ms as the sphere resolves from blur, felt as a breath rather than a hit; a soft presence enters at 420 ms; a warm rounded wave radiates outward at 460 ms; a quiet living speech-like texture begins at 480 ms and continues underneath; a slow breathing pulsation starts at 700 ms with a 4.2 second cycle, audible as gentle amplitude movement; a second softer wave at 1020 ms; then the sound simply keeps living and fades by 2200 ms without a conclusive ending. Sophisticated, feels like something conscious opening its eyes.

**B.** Warm cue for unlocking a talking AI companion, 2200 milliseconds, mono, dry. No impacts at all. Rising airy hum from 0 ms, a friendly rounded swell at 80 ms, presence at 420 ms, a soft bubbling wave at 460 ms, gentle vocal-ish movement from 480 ms, slow breathing amplitude from 700 ms, a second smaller wave at 1020 ms, calm open ending by 2200 ms. Blue-toned and smooth rather than bright and metallic.

**C.** Cinematic awakening of an intelligence, 2200 milliseconds, mono, spacious but controlled. Sub-bass swell with breath texture from 0 ms, a deep warm inhale at 80 ms, presence blooming at 420 ms, a slow rolling harmonic wave at 460 ms, distant voice-like formants from 480 ms, a 4.2 second breathing cycle beginning at 700 ms, a second fainter wave at 1020 ms, dissolving without resolution by 2200 ms. Absolutely no cracking, shattering or striking, the opposite of an impact sound.

**Важно:** не переиспользовать `cel_open_rift` с изменённой высотой. Раскол —
это язык Plus. Если MAX зазвучит расколом, два тира сольются в один, а MAX
продаётся именно ощущением живого собеседника.

---

## 6. Фоновая подложка (все тиры)

Владелец 2026-08-25: «на фон надо мелодию какую-то». Точечные удары одиннадцати
сцен звучат разрозненно без общей тёплой волны под всем прогоном. Это НЕ
замена точечным звукам — они остаются, подложка играет строго под ними,
намного тише (0.13 против 0.42-0.64 у ударов).

**Один файл на все тиры** — Plus, Pro, VIP, MAX, промокод. Отдельная мелодия
под MAX была бы избыточна: у него уже есть свой акцент в `cel_max_awaken`.

### `cel_background_bed.m4a` — 12.0 с, громкость 0.13

Момент: играет от открытия модалки до её закрытия — длиннее самого долгого
прогона (MAX, ~11.3 с), с запасом. Встроенный fade-in на первые ~300 мс и
fade-out на последнюю секунду — так подложка никогда не обрывается щелчком,
даже если человек пропускает показ тапом раньше конца.

**A.** Seamless ambient pad bed for a premium celebration screen in a language-learning app, 12 seconds, mono, extremely quiet and unobtrusive. A single sustained warm chord with very slow internal movement, no melody, no rhythm, no percussive attacks anywhere in the file. Gentle fade in over the first 300 milliseconds, holds steady, gentle fade out over the final second. Designed to sit far in the background under sharper foreground UI sounds without ever competing with them. Expensive, calm, almost subliminal.

**B.** Warm arcade ambience bed underlying a reward celebration sequence, 12 seconds, mono, soft and continuous. A slowly evolving pad with light harmonic shimmer, no beats, no accents, nothing that could be mistaken for a foreground cue. Smooth fade in at the start, smooth fade out at the end. Sits quietly behind punchier scene sounds.

**C.** Cinematic sustained atmosphere for the full length of a purchase celebration, 12 seconds, mono, wide and hushed. A single held tone with gentle harmonic drift and the faintest sense of air movement, absolutely no transients or rhythmic elements. Fades in gently, fades out gently, exists only to give the sequence a sense of continuous space underneath the louder scene-specific sounds.

**Требование к сведению:** проверить бок о бок с `cel_open_rift` на громкости
0.62 и с любым из сценных звуков на 0.42-0.52 — подложка должна быть отчётливо
слышна как атмосфера, но НИКОГДА не читаться как отдельное событие. Если ухо
замечает подложку саму по себе, а не общую «теплоту» сцены — она слишком
громкая или слишком фактурная, нужно переделывать, а не просто убавлять
громкость в коде (первопричина — тембр, не уровень).

---

## Как подключать

1. Сложить файлы в `assets/audio/sfx/v1/celebration/`, имена — из таблицы,
   с суффиксом `_v1.m4a` (как остальные: `cel_open_rift_v1.m4a`).
2. Зарегистрировать в `modules/audio/sound_events.ts` рядом с блоком
   `pm.reward.*`, ключи вида `pm.celebration.open_rift`, категория `'reward'`.
3. **Обязательно** внести карты ударов в `modules/audio/sound_motion.ts` —
   массив `hits` каждого события заполняется миллисекундами из таблиц выше.
   Без этого визуальные удары разойдутся со звуком, и вся работа над таймингом
   пропадёт. Формат уже используется: `{ audibleMs, attackMs, hits: [...] }`.
4. Все вызовы — через `soundDirector.request` со `scope: 'premium-celebration'`
   и `dedupeKey` по сцене, чтобы повторный mount не наложил звук сам на себя.

**Ограничение по громкости:** сумма акта 2 не должна перекрывать акт 1 и финал.
Если при сведении одиннадцать сцен звучат громче открытия — снижать акт 2, а не
поднимать открытие: иначе празднование потеряет форму «вход → перечисление →
финал» и превратится в ровный шум.

**Проверка перед приёмкой:** открыть макет `phraseman-celebration-v6.html`,
включить режим «0.3× (разбор)» и проиграть звук в той же замедленной сетке.
Каждая атака обязана лечь на своё визуальное событие. Если хоть одна уехала
больше чем на 30 мс — файл переделывается, а не «подгоняется» задержкой.
