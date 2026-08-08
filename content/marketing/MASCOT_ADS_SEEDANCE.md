# MASCOT ADS — рекламные вставки 15–30 сек через Seedance

Производственный пакет промптов для in-app рекламных роликов с маскотами
Phraseman в духе Duolingo. Цель — продать Premium/Pro и вернуть в стрик.

**Площадка:** внутри приложения (между уроками, после урока, при нехватке энергии,
при риске потери стрика).
**Формат:** 9:16, 1080×1920, 15–30 сек, БЕЗ звука по умолчанию → субтитры обязательны.
**Движок:** Seedance (ByteDance) — image-to-video как основной путь, text-to-video как запасной.

---

## 0. КРИТИЧЕСКОЕ ПРАВИЛО: только image-to-video для маскотов

Seedance (как и любой видеогенератор) **не удержит канон персонажа** из текстового
описания. Блип превратится в другого дракончика, у Никса пропадёт ошейник,
у Панды изменится число полос на хвосте. Модельные листы `CANON LOCK v1.0`
существуют именно для этого.

**Рабочий процесс:**

1. Берём канонический рендер персонажа из модельного листа (вид спереди или 3/4).
2. Готовим **стартовый кадр** — статичную композицию сцены с персонажем
   (см. раздел 4: промпты для генератора изображений).
3. Этот кадр отдаём в Seedance **image-to-video** + промпт движения.
4. Озвучка накладывается отдельно (Seedance не даёт липсинк русского уровня
   продакшена) — см. раздел 6.

Text-to-video используем только для фоновых/абстрактных вставок без персонажа.

---

## 1. Что реально можно продавать (проверено по коду)

Не выдумывай фичи — сторы и пользователи ловят несоответствие. Реальные:

| Оффер | Что это в коде | Боль для хука |
|---|---|---|
| 3 бесплатных урока | `FREE_LESSON_LIMIT = 3` | «Дальше — замок» |
| Премиум-темы | Полночь, Янтарь, Сияние, Лайм, Форест, Корал | «Хочу такой экран» |
| Ауры Plus / Pro | `PLUS_AVATAR_AURA_ID`, `PRO_AVATAR_AURA_ID` | Статус в лиге/друзьях |
| Энергия и восстановление | восстановление за жемчужины | «Кончилась на самом интересном» |
| Заморозка стрика | streak freeze | «Стрик сгорит» |
| Pro = разовая покупка «Навсегда» | `premium_plan = 'lifetime'` | «Один раз и навсегда» |

**Plus** — рекуррентная подписка (золотая палитра). **Pro** — разовая покупка
навсегда (синяя палитра). В роликах не путать: это разные визуальные коды.

---

## 2. Формула ролика (почему у Duolingo это работает)

Duolingo продаёт не фичу, а **эмоциональный микро-сюжет** за 15 секунд:

```
0.0–1.5с   ХУК      — персонаж делает что-то неожиданное. Ноль текста-объяснения.
1.5–6.0с   БОЛЬ     — показываем проблему глазами зрителя (замок, пустая энергия, сгорающий стрик).
6.0–11с    ПОВОРОТ  — второй персонаж/премиум решает проблему. Визуальный «до/после».
11–14с     НАГРАДА  — эмоция победы, конфетти/свечение, экран приложения.
14–15с     CTA      — одна короткая фраза + кнопка.
```

Три закона, которые нельзя нарушать:
1. **Ни одного кадра без движения.** Статика = свайп.
2. **Персонаж смотрит В КАМЕРУ** в хуке. Прямой взгляд удерживает.
3. **Юмор идёт от характера, а не от шутки.** Никс саркастичен всегда —
   этого достаточно, отдельная «шутка» не нужна.

---

## 3. Кастинг: кто что продаёт

| Персонаж | Продаёт | Тон | Не давать ему |
|---|---|---|---|
| **Никс** (кот-скептик) | Premium, апгрейд, «хватит страдать» | Сухой сарказм, полуприкрытые глаза | Радость, крик, суету |
| **Блип** (энтузиаст) | Награды, празднование, Pro-навсегда | Взрывная радость, прыжки | Уныние, сарказм |
| **Панда** (комик) | Энергия, боль лимита, мемный формат | Паника, хаос, руки к щекам | Спокойствие, авторитет |
| **Никс + Блип** | Лучший дуэт: конфликт даёт диалог | Никс осаживает, Блип ликует | — |
| **Никс + Панда** | Паника vs. невозмутимость | Панда орёт, Никс молчит | — |

---

## 4. ГОТОВЫЕ СЦЕНАРИИ (6 роликов)

Каждый сценарий = 3 блока:
**(A)** промпт стартового кадра для генератора изображений →
**(B)** промпт движения для Seedance image-to-video →
**(C)** текст озвучки + субтитры.

---

### РОЛИК 1 — «Никс и замок» (Premium, 15 сек)

**Триггер:** пользователь упёрся в 4-й урок.

#### (A) Стартовый кадр — image prompt

```
Reference the attached character sheet exactly. Black cat character NIX, amber
half-lidded eyes, dark navy hoodie, purple studded collar with gold coin medallion,
long tail. 2.5D semi-3D render, soft studio lighting, smooth matte materials,
large expressive eyes, clean rounded forms.

Composition: vertical 9:16. Nix stands centered in a soft dark studio void,
arms crossed, looking directly at the camera with a flat unimpressed expression.
Behind him, a large glowing golden padlock floats in the air, slightly out of focus.
Background is a deep indigo gradient with subtle bokeh. Rim light on the left edge
of the character separating him from the background.

No text, no UI, no logos, no watermarks. Full body visible with headroom at top
and empty space at the bottom third for subtitles.
```

#### (B) Seedance image-to-video prompt

```
The black cat slowly turns his head toward the floating padlock, then back to
the camera with a single slow blink of his amber eyes. His tail flicks once,
lazily, on the right side of the frame. The golden padlock behind him pulses
with a soft glow and rotates a few degrees. Slow subtle push-in of the camera
toward the character.

Camera: slow dolly in, locked horizon, no shake.
Motion: minimal, deliberate, confident. Character stays perfectly centered.
Style: 2.5D animated character, smooth clean animation, soft studio lighting.
Duration 5s.
```

> Три таких клипа по 5 сек = 15 сек ролика. Кадр 2: замок трескается.
> Кадр 3: замок рассыпается в золотые искры, Никс отворачивается с видом
> «ну наконец-то».

#### (C) Озвучка и субтитры

| Время | Голос (Никс) | Субтитр на экране |
|---|---|---|
| 0–2с | *(молчит, смотрит)* | **Три урока. И всё.** |
| 2–6с | «Серьёзно? Ты правда собрался остановиться на третьем уроке?» | Серьёзно? На третьем? |
| 6–11с | «Там дальше вся программа. Но ладно. Тебе виднее.» | Дальше — вся программа |
| 11–15с | «...или просто открой.» | **Открыть всё → Plus** |

Голос: мужской, низкий, медленный, без энтузиазма. Паузы важнее слов.

---

### РОЛИК 2 — «Паника Панды» (энергия, 20 сек)

**Триггер:** энергия на нуле посреди урока.

#### (A) Стартовый кадр

```
Reference the attached character sheet exactly. Red panda character PANDA,
orange fur, cream face mask and brows, dark paws, teal hoodie with small logo,
large striped bushy tail. 2.5D semi-3D render, soft lighting, fluffy fur texture.

Composition: vertical 9:16. Panda in center, both paws pressed to his cheeks,
mouth wide open in comedic panic, eyes huge. Blue sweat droplets fly around
his head. Behind him, a giant empty battery icon glows dim red, drained.
Background: warm dark orange gradient, soft vignette.

No text, no UI, no logos. Empty space in the bottom third for subtitles.
```

#### (B) Seedance motion prompt

```
The red panda shakes his head rapidly in panic, paws pressed to his cheeks,
his striped tail whipping side to side behind him. Blue sweat droplets fly
outward from his head. The drained red battery behind him flickers and dims
further. Slight comedic camera shake synced to his movement.

Camera: handheld micro-shake, slight push in.
Motion: fast, chaotic, comedic, exaggerated cartoon energy.
Style: 2.5D animated character, fluffy fur, smooth cartoon animation.
Duration 5s.
```

Кадр 2 (5с): Никс входит в кадр слева, невозмутимый, и молча протягивает лапой
светящуюся жемчужину.
Кадр 3 (5с): батарея заливается зелёным, Панда замирает с открытым ртом.
Кадр 4 (5с): Панда прыгает от радости, конфетти.

#### (C) Озвучка

| Время | Голос | Субтитр |
|---|---|---|
| 0–4с | Панда: «НЕТ-НЕТ-НЕТ, ТОЛЬКО НЕ СЕЙЧАС!» | **Энергия кончилась** |
| 4–9с | Панда: «Я же был на серии из восьми правильных!» | На восьмой подряд… |
| 9–14с | Никс: «Держи. И перестань кричать.» | Никс: «Держи.» |
| 14–20с | Панда: «Я ТЕБЯ ОБОЖАЮ!» | **Восстановить энергию** |

---

### РОЛИК 3 — «Стрик горит» (возврат, 15 сек)

**Триггер:** push/вставка при риске потери стрика. Самый сильный формат ретеншна.

#### (A) Стартовый кадр

```
Reference the attached character sheet exactly. Black cat character NIX, amber
half-lidded eyes, dark navy hoodie, purple collar with gold coin medallion.
2.5D semi-3D render.

Composition: vertical 9:16. Nix sits alone in a dark empty room, seen slightly
from the front, holding a single small flame that is almost extinguished —
just a weak orange ember floating above his paw. The flame is the only light
source, casting warm orange light on his face and cold blue shadows behind him.
His expression is flat, tired, quietly disappointed. Deep dark background,
strong chiaroscuro lighting.

No text, no UI, no logos. Empty bottom third for subtitles.
```

#### (B) Seedance motion prompt

```
The small flame above the black cat's paw flickers weakly and shrinks, almost
going out, then barely recovers. The warm orange light on his face wavers with
the flame. The cat slowly raises his eyes to look directly into the camera,
holding the stare. His tail lies still. Almost no other movement.

Camera: very slow push in toward the face, no shake.
Motion: minimal, quiet, melancholic. The flame is the only fast-moving element.
Style: 2.5D animated character, cinematic dramatic lighting, moody atmosphere.
Duration 5s.
```

Кадр 2: пламя вспыхивает ярко-оранжевым, комната заливается тёплым светом.
Кадр 3: Никс отводит взгляд, почти незаметно уголок рта поднимается.

#### (C) Озвучка

| Время | Голос (Никс) | Субтитр |
|---|---|---|
| 0–3с | *(тишина, только треск огня)* | **47 дней.** |
| 3–8с | «Сорок семь дней. И ты правда дашь этому погаснуть сегодня?» | Погаснет сегодня? |
| 8–12с | «Один урок. Пять минут.» | Один урок = 5 минут |
| 12–15с | «Я не прошу. Просто говорю.» | **Продолжить стрик** |

> Число дней подставляется динамически под пользователя. Ролик рендерится
> один раз, число — оверлей в приложении поверх видео.

---

### РОЛИК 4 — «Блип и Pro навсегда» (разовая покупка, 20 сек)

#### (A) Стартовый кадр

```
Reference the attached character sheet exactly. BLIP, round turquoise creature,
big blue eyes, branched antlers, small side fin-ears, small wings, light patch
on the head, yellow shoulder bag with a star, gold star medallion.
2.5D semi-3D render, soft matte materials, big expressive eyes.

Composition: vertical 9:16. Blip floats in the center of a deep blue night sky
filled with soft stars, both arms raised in pure joy, mouth open in a wide happy
smile, eyes sparkling. A large glowing gold star medallion hovers above him,
casting warm golden light down onto his turquoise body. Soft golden particles
drift around him.

No text, no UI, no logos. Empty bottom third for subtitles.
```

#### (B) Seedance motion prompt

```
The small turquoise creature floats and bobs gently up and down, arms raised,
wings fluttering rapidly. The golden star medallion above him rotates slowly and
pulses with warm light. Golden particles drift upward around him. His antlers
sway slightly with the motion. He looks up at the star, then turns to the camera
with a delighted expression.

Camera: slow orbit around the character, gentle rise.
Motion: light, floaty, joyful, weightless.
Style: 2.5D animated character, magical warm lighting, dreamy atmosphere.
Duration 5s.
```

#### (C) Озвучка

| Время | Голос (Блип) | Субтитр |
|---|---|---|
| 0–4с | «Ой. Ой-ой-ой. Ты это видишь?!» | **Pro** |
| 4–10с | «Это не подписка. Это НАВСЕГДА!» | Не подписка. Навсегда. |
| 10–15с | «Все уроки, все темы, вся энергия. Один раз — и всё твоё.» | Всё открыто. Один раз. |
| 15–20с | «Я бы прыгал, но я и так уже в воздухе!» | **Открыть Pro** |

---

### РОЛИК 5 — «Тема Полночь» (премиум-темы, 15 сек)

Продаёт визуал — самый недооценённый драйвер апгрейда.

#### (A) Стартовый кадр

```
Reference the attached character sheet exactly. Black cat character NIX in his
dark navy hoodie and purple collar. 2.5D semi-3D render.

Composition: vertical 9:16, split down the middle. On the LEFT half: flat, plain,
slightly boring light-grey environment, evenly lit, no atmosphere. On the RIGHT
half: a deep near-black environment with rich indigo and violet gradients, soft
glowing accents in periwinkle blue, subtle light bloom. Nix stands exactly on the
dividing line, half of him lit by each side, looking at the camera, unimpressed
on the left, subtly satisfied on the right.

No text, no UI, no logos. Empty bottom third for subtitles.
```

#### (B) Seedance motion prompt

```
The dividing line between the two halves sweeps slowly from left to right,
the dark indigo and violet side expanding until it fills the entire frame,
its glowing periwinkle accents blooming softly. As the darkness washes over
the black cat, the rim light on his fur shifts from flat grey to rich violet.
He turns his head slightly toward the camera and gives one slow blink.

Camera: locked, no movement.
Motion: a smooth left-to-right wipe of color and light. The character stays still.
Style: 2.5D animated character, premium cinematic color grading, soft light bloom.
Duration 5s.
```

#### (C) Озвучка

| Время | Голос (Никс) | Субтитр |
|---|---|---|
| 0–3с | «Так выглядит твоё приложение.» | Твоё приложение |
| 3–8с | «А так — моё.» | **Полночь** |
| 8–12с | «Шесть тем. Янтарь, Сияние, Лайм... Я мог бы продолжать.» | 6 премиум-тем |
| 12–15с | «Но ты уже листаешь их, да?» | **Открыть темы** |

---

### РОЛИК 6 — «Никс и Блип спорят» (дуэт, 30 сек)

Самый виральный формат: конфликт характеров даёт диалог, а диалог — удержание.

#### (A) Стартовый кадр

```
Reference both attached character sheets exactly. LEFT: BLIP, round turquoise
creature with branched antlers, big blue eyes, yellow star bag, small wings.
RIGHT: NIX, black cat with amber half-lidded eyes, navy hoodie, purple collar
with gold medallion. Both at their canonical relative heights — Blip is notably
shorter and rounder, Nix is taller and slimmer.

Composition: vertical 9:16, two-shot. Blip on the left, bouncing with excitement,
arms up, huge smile, looking at Nix. Nix on the right, arms crossed, looking
straight at the camera with a flat expression, deliberately not looking at Blip.
Warm neutral studio background with a soft gradient, gentle rim lights on both
characters separating them from the background.

No text, no UI, no logos. Empty bottom third for subtitles.
```

#### (B) Seedance motion prompt

```
The small turquoise creature on the left bounces up and down excitedly, arms
waving, wings fluttering, talking animatedly toward the black cat. The black cat
on the right stays perfectly still with arms crossed, staring directly at the
camera, then slowly closes and opens his eyes once in a long-suffering blink.
His tail flicks once. He never turns to look at the creature.

Camera: static two-shot, locked, no movement.
Motion: extreme contrast — one character hyperactive, the other completely still.
Style: 2.5D animated characters, comedic timing, soft studio lighting.
Duration 5s.
```

#### (C) Озвучка

| Время | Голос | Субтитр |
|---|---|---|
| 0–4с | Блип: «Я ОТКРЫЛ ВСЕ УРОКИ! ВСЕ ТРИДЦАТЬ ДВА!» | Блип открыл всё |
| 4–8с | Никс: *(молчит, моргает)* | *(Никс молчит)* |
| 8–13с | Блип: «И темы! И ауру! У меня золотая аура, Никс!» | Plus: аура + темы |
| 13–18с | Никс: «У меня синяя.» | Никс: «У меня синяя.» |
| 18–23с | Блип: «...синяя? Это же Pro. Это НАВСЕГДА?!» | Pro = навсегда |
| 23–27с | Никс: «Угу.» | «Угу.» |
| 27–30с | Блип: *(беззвучный крик восторга)* | **Plus или Pro →** |

---

## 5. ШАБЛОН ПРОМПТА (для новых роликов)

### Стартовый кадр — скелет

```
Reference the attached character sheet exactly. [ПЕРСОНАЖ + канонические
приметы из модельного листа: цвет, глаза, одежда, реквизит].
2.5D semi-3D render, soft studio lighting, smooth matte materials,
large expressive eyes, clean rounded forms.

Composition: vertical 9:16. [ПОЗА]. [ЧТО В КАДРЕ ЕЩЁ]. [ФОН + свет].
[Rim light для отделения от фона].

No text, no UI, no logos, no watermarks. Empty bottom third for subtitles.
```

### Движение — скелет для Seedance

```
[ОДНО главное действие персонажа простыми глаголами].
[ОДИН вторичный элемент, который движется — хвост / частицы / свет].
[Что делает фон].

Camera: [slow push in | static | slow orbit], locked horizon, no shake.
Motion: [minimal / chaotic / floaty], [темп].
Style: 2.5D animated character, [освещение], smooth clean animation.
Duration 5s.
```

### Что НЕ писать в промпт движения

| ❌ Не пиши | Почему | ✅ Пиши |
|---|---|---|
| Текст, надписи, UI | Видеомодели рисуют нечитаемую кашу из букв | Текст — оверлеем в монтаже |
| «говорит фразу "..."» | Липсинка под русский не будет | Озвучка отдельно, рот просто двигается |
| 3+ действия в одном клипе | Модель смешает их в кашу | 1 главное + 1 вторичное |
| Смена ракурса внутри клипа | Персонаж «переродится» | Новый ракурс = новый клип |
| Клип длиннее 5–6 сек | Канон уплывает к концу | Режь на клипы по 5 сек |
| Быстрое движение камеры | Артефакты, деформация лица | Медленный push in / static |

---

## 6. Озвучка

Seedance не даёт продакшн-липсинк для русского. Правильный путь:

1. Генерируем видео **без речи** — персонаж двигается, рот может двигаться абстрактно.
2. Озвучку пишем отдельно (ElevenLabs / любой TTS с русскими голосами).
3. Сводим в монтаже. Русская речь + анимация без точного липсинка читается
   нормально, если персонаж не в крупном плане на весь кадр.

**Голосовые профили:**

| Персонаж | Голос | Темп | Ключ |
|---|---|---|---|
| Никс | Мужской, низкий, сухой | Медленный | Паузы. Никогда не повышает тон |
| Блип | Высокий, звонкий, детский-восторженный | Быстрый | Срывается на визг от радости |
| Панда | Средний, нервный, дрожащий | Очень быстрый | Тараторит, глотает окончания |

---

## 7. Технический чеклист перед выкладкой в приложение

- [ ] 9:16, 1080×1920, H.264, ≤ 4 Мбит/с (вес важен — это грузится в мобильном приложении)
- [ ] **Субтитры вшиты** — по умолчанию звука нет
- [ ] Первые 1.5 сек читаются без звука и без текста-объяснения
- [ ] Безопасная зона: нижние 20% свободны под CTA-кнопку приложения
- [ ] Персонаж соответствует `CANON LOCK v1.0` (сверить с модельным листом покадрово)
- [ ] Нет упоминания цен внутри видео — цены живут в пейволе, иначе при смене
      тарифа придётся перерендеривать все ролики
- [ ] Ролик не обещает фич, которых нет (сверить с таблицей раздела 1)
- [ ] Проверен на медленном соединении: первый кадр не белый

---

## 8. Приоритет производства

Начинать с одного ролика, а не с шести. Порядок по отдаче:

1. **Ролик 3 «Стрик горит»** — ретеншн дешевле привлечения, эффект виден за день
2. **Ролик 1 «Никс и замок»** — прямой апгрейд на самом частом упоре в пейвол
3. **Ролик 2 «Паника Панды»** — второй по частоте триггер
4. Остальные — после того, как первые три покажут цифры

Мерить: досмотр до конца, тап по CTA, конверсия в покупку. Ролик, который
досматривают, но не тапают — проблема в CTA, а не в ролике.
