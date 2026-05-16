# Draft: preposition_time_in_on_at

Training id: `preposition_time_in_on_at`

Room: Jesse Pinkman

Status: draft-only content, not wired into app registry.

## Focus

One concrete repair: choosing `at`, `on`, or `in` before an English time expression.

Learner-facing rule:

- RU: Маленькое слово перед временем зависит от масштаба: `at 7`, `on Monday`, `in May`.
- UK: Маленьке слово перед часом залежить від масштабу: `at 7`, `on Monday`, `in May`.
- ES: La palabra pequena antes del tiempo depende de la escala: `at 7`, `on Monday`, `in May`.

Scope guard:

- Only time expressions.
- No location examples.
- No broad grammar lecture.
- Every wrong option has option-specific feedback.

## Shared Exercise Set

Use the same English prompts for RU, UK, and ES.

| id | level | target | sentence | options | answer |
| --- | --- | --- | --- | --- | --- |
| time_at_001 | easy | exact clock time | The lesson starts ___ 7. | at, on, in | at |
| time_at_002 | easy | noon | We have lunch ___ noon. | at, on, in | at |
| time_on_001 | easy | weekday | I will call you ___ Monday. | at, on, in | on |
| time_on_002 | easy | date | Her birthday is ___ 12 May. | at, on, in | on |
| time_in_001 | easy | month | The course starts ___ May. | at, on, in | in |
| time_in_002 | easy | year | She was born ___ 1998. | at, on, in | in |
| time_in_003 | contrast | part of day | We usually study ___ the morning. | at, on, in | in |
| time_at_003 | contrast | night block | I do not like driving ___ night. | at, on, in | at |
| time_on_003 | contrast | weekday + part of day | We met ___ Friday morning. | at, on, in | on |
| time_in_004 | contrast | season | They travel ___ summer. | at, on, in | in |
| time_in_005 | mixed | future after a period | I will be back ___ two weeks. | at, on, in | in |
| time_mix_001 | mixed_review | day + exact time | The exam is ___ Friday ___ 10. | at / on, on / at, in / at | on / at |

## RU Copy

Title: `In / On / At перед временем`

Short diagnosis: Ты путаешь маленькое слово перед временем, потому что переводишь его напрямую. В английском сначала смотри на масштаб времени: точка, день/дата или широкий период.

Mental model:

- `at` - маленькая точка времени: `at 7`, `at noon`, `at midnight`, `at night`.
- `on` - день или дата: `on Monday`, `on 12 May`, `on Friday morning`.
- `in` - более широкий период: `in May`, `in 1998`, `in summer`, `in the morning`, `in two weeks`.

Intro blocks:

1. Не переводи русское "в" напрямую. В английском маленькое слово перед временем зависит от масштаба.
2. Спроси себя: это точное время, день/дата или более широкий период?
3. Запомни три готовых блока: `at 7`, `on Monday`, `in May`.

Correct feedback:

- `at`: Да. Здесь время как маленькая точка, поэтому нужно `at`.
- `on`: Да. Здесь есть день или дата, поэтому нужно `on`.
- `in`: Да. Здесь более широкий период времени, поэтому нужно `in`.
- `on / at`: Да. `Friday` - день, поэтому `on Friday`; `10` - точное время, поэтому `at 10`.

Wrong feedback by exercise:

- `time_at_001`
  - `on`: `on` ставится перед днем или датой. `7` - точное время на часах, поэтому нужно `at 7`.
  - `in`: `in` ставится перед более широким периодом, например месяцем или годом. `7` - маленькая точка времени, поэтому нужно `at`.
- `time_at_002`
  - `on`: `on` подходит для дней и дат. `noon` - точный момент дня, поэтому нужно `at noon`.
  - `in`: `in` подходит для широкого периода. `noon` не период, а точная точка, поэтому нужно `at`.
- `time_on_001`
  - `at`: `at` подходит для точного времени на часах. `Monday` - день недели, поэтому нужно `on Monday`.
  - `in`: `in` подходит для месяца, года или другого широкого периода. `Monday` - конкретный день, поэтому нужно `on`.
- `time_on_002`
  - `at`: `at` нужен для точной точки вроде `at 7`. `12 May` - дата, поэтому нужно `on 12 May`.
  - `in`: `in` можно сказать с месяцем без даты: `in May`. Но `12 May` - конкретная дата, поэтому нужно `on`.
- `time_in_001`
  - `at`: `at` подходит для точного времени. `May` - целый месяц, широкий период, поэтому нужно `in May`.
  - `on`: `on` подходит для дня или даты. `May` без числа - месяц, поэтому нужно `in`.
- `time_in_002`
  - `at`: `at` слишком точное для года. `1998` - широкий период, поэтому нужно `in 1998`.
  - `on`: `on` подходит для дня или даты. `1998` - год, поэтому нужно `in`.
- `time_in_003`
  - `at`: `at the morning` не является обычным блоком. Для части дня говорят `in the morning`.
  - `on`: `on` нужен, если есть конкретный день: `on Friday morning`. Здесь дня нет, поэтому нужно `in the morning`.
- `time_at_003`
  - `on`: `on night` не подходит. `night` запоминаем как готовый блок `at night`.
  - `in`: `in the night` возможно в особых контекстах, но обычная фраза "ночью" здесь - `at night`.
- `time_on_003`
  - `at`: `at` подходит для точного времени, но `Friday morning` содержит конкретный день. День тянет выбор к `on`.
  - `in`: `in the morning` было бы без дня. Здесь есть `Friday`, поэтому нужно `on Friday morning`.
- `time_in_004`
  - `at`: `at` слишком точное для сезона. `summer` - широкий период, поэтому нужно `in summer`.
  - `on`: `on` подходит для дня или даты. `summer` - сезон, поэтому нужно `in`.
- `time_in_005`
  - `at`: `at two weeks` не выражает "через две недели". Для будущего через период нужен блок `in two weeks`.
  - `on`: `on two weeks` не подходит, потому что `two weeks` - не день и не дата. Нужно `in`.
- `time_mix_001`
  - `at / on`: слова поменяны местами. День = `on`, точное время = `at`, поэтому `on Friday at 10`.
  - `in / at`: вторая часть верная: `at 10`. Но `Friday` - день, не широкий период, поэтому первая часть должна быть `on`.

Retry ladder:

1. Посмотри только на слово после пропуска: часы, день/дата или широкий период?
2. Три блока: `at 7`, `on Monday`, `in May`.
3. Если есть день + часть дня, день важнее: `on Friday morning`.
4. Если это "через период в будущем", выбирай `in`: `in two weeks`.

## UK Copy

Title: `In / On / At перед часом`

Short diagnosis: Ти плутаєш маленьке слово перед часом, бо перекладаєш його напряму. В англійській спочатку дивись на масштаб часу: точка, день/дата або широкий період.

Mental model:

- `at` - маленька точка часу: `at 7`, `at noon`, `at midnight`, `at night`.
- `on` - день або дата: `on Monday`, `on 12 May`, `on Friday morning`.
- `in` - ширший період: `in May`, `in 1998`, `in summer`, `in the morning`, `in two weeks`.

Intro blocks:

1. Не перекладай українське "у/в" напряму. В англійській маленьке слово перед часом залежить від масштабу.
2. Запитай себе: це точний час, день/дата чи ширший період?
3. Запам'ятай три готові блоки: `at 7`, `on Monday`, `in May`.

Correct feedback:

- `at`: Так. Тут час як маленька точка, тому потрібно `at`.
- `on`: Так. Тут є день або дата, тому потрібно `on`.
- `in`: Так. Тут ширший період часу, тому потрібно `in`.
- `on / at`: Так. `Friday` - день, тому `on Friday`; `10` - точний час, тому `at 10`.

Wrong feedback by exercise:

- `time_at_001`
  - `on`: `on` ставиться перед днем або датою. `7` - точний час на годиннику, тому потрібно `at 7`.
  - `in`: `in` ставиться перед ширшим періодом, наприклад місяцем або роком. `7` - маленька точка часу, тому потрібно `at`.
- `time_at_002`
  - `on`: `on` підходить для днів і дат. `noon` - точний момент дня, тому потрібно `at noon`.
  - `in`: `in` підходить для широкого періоду. `noon` не період, а точна точка, тому потрібно `at`.
- `time_on_001`
  - `at`: `at` підходить для точного часу на годиннику. `Monday` - день тижня, тому потрібно `on Monday`.
  - `in`: `in` підходить для місяця, року або іншого широкого періоду. `Monday` - конкретний день, тому потрібно `on`.
- `time_on_002`
  - `at`: `at` потрібне для точної точки на кшталт `at 7`. `12 May` - дата, тому потрібно `on 12 May`.
  - `in`: `in` можна сказати з місяцем без дати: `in May`. Але `12 May` - конкретна дата, тому потрібно `on`.
- `time_in_001`
  - `at`: `at` підходить для точного часу. `May` - цілий місяць, широкий період, тому потрібно `in May`.
  - `on`: `on` підходить для дня або дати. `May` без числа - місяць, тому потрібно `in`.
- `time_in_002`
  - `at`: `at` занадто точне для року. `1998` - широкий період, тому потрібно `in 1998`.
  - `on`: `on` підходить для дня або дати. `1998` - рік, тому потрібно `in`.
- `time_in_003`
  - `at`: `at the morning` не є звичайним блоком. Для частини дня кажуть `in the morning`.
  - `on`: `on` потрібне, якщо є конкретний день: `on Friday morning`. Тут дня немає, тому потрібно `in the morning`.
- `time_at_003`
  - `on`: `on night` не підходить. `night` запам'ятовуємо як готовий блок `at night`.
  - `in`: `in the night` можливе в особливих контекстах, але звичайна фраза "вночі" тут - `at night`.
- `time_on_003`
  - `at`: `at` підходить для точного часу, але `Friday morning` містить конкретний день. День веде вибір до `on`.
  - `in`: `in the morning` було б без дня. Тут є `Friday`, тому потрібно `on Friday morning`.
- `time_in_004`
  - `at`: `at` занадто точне для сезону. `summer` - широкий період, тому потрібно `in summer`.
  - `on`: `on` підходить для дня або дати. `summer` - сезон, тому потрібно `in`.
- `time_in_005`
  - `at`: `at two weeks` не передає "через два тижні". Для майбутнього через період потрібен блок `in two weeks`.
  - `on`: `on two weeks` не підходить, бо `two weeks` - не день і не дата. Потрібно `in`.
- `time_mix_001`
  - `at / on`: слова поміняні місцями. День = `on`, точний час = `at`, тому `on Friday at 10`.
  - `in / at`: друга частина правильна: `at 10`. Але `Friday` - день, не широкий період, тому перша частина має бути `on`.

Retry ladder:

1. Подивись тільки на слово після пропуску: години, день/дата чи широкий період?
2. Три блоки: `at 7`, `on Monday`, `in May`.
3. Якщо є день + частина дня, день важливіший: `on Friday morning`.
4. Якщо це "через період у майбутньому", вибирай `in`: `in two weeks`.

## ES Copy

Title: `In / On / At antes del tiempo`

Short diagnosis: Confundes la palabra pequena antes del tiempo porque intentas traducirla directamente. En ingles primero mira la escala del tiempo: punto exacto, dia/fecha o periodo amplio.

Mental model:

- `at` - punto pequeno de tiempo: `at 7`, `at noon`, `at midnight`, `at night`.
- `on` - dia o fecha: `on Monday`, `on 12 May`, `on Friday morning`.
- `in` - periodo mas amplio: `in May`, `in 1998`, `in summer`, `in the morning`, `in two weeks`.

Intro blocks:

1. No traduzcas "en/a" directamente. En ingles la palabra pequena antes del tiempo depende de la escala.
2. Preguntate: es una hora exacta, un dia/fecha o un periodo mas amplio?
3. Memoriza tres bloques listos: `at 7`, `on Monday`, `in May`.

Correct feedback:

- `at`: Si. Aqui el tiempo es un punto pequeno, por eso necesitamos `at`.
- `on`: Si. Aqui hay un dia o una fecha, por eso necesitamos `on`.
- `in`: Si. Aqui hay un periodo mas amplio, por eso necesitamos `in`.
- `on / at`: Si. `Friday` es dia, por eso `on Friday`; `10` es hora exacta, por eso `at 10`.

Wrong feedback by exercise:

- `time_at_001`
  - `on`: `on` se usa antes de un dia o una fecha. `7` es una hora exacta del reloj, por eso necesitamos `at 7`.
  - `in`: `in` se usa antes de un periodo mas amplio, como un mes o un ano. `7` es un punto pequeno de tiempo, por eso necesitamos `at`.
- `time_at_002`
  - `on`: `on` sirve para dias y fechas. `noon` es un momento exacto del dia, por eso necesitamos `at noon`.
  - `in`: `in` sirve para un periodo amplio. `noon` no es un periodo, sino un punto exacto, por eso necesitamos `at`.
- `time_on_001`
  - `at`: `at` sirve para una hora exacta del reloj. `Monday` es un dia de la semana, por eso necesitamos `on Monday`.
  - `in`: `in` sirve para un mes, ano u otro periodo amplio. `Monday` es un dia concreto, por eso necesitamos `on`.
- `time_on_002`
  - `at`: `at` se usa con un punto exacto como `at 7`. `12 May` es una fecha, por eso necesitamos `on 12 May`.
  - `in`: `in` funciona con el mes sin fecha: `in May`. Pero `12 May` es una fecha concreta, por eso necesitamos `on`.
- `time_in_001`
  - `at`: `at` sirve para una hora exacta. `May` es un mes entero, un periodo amplio, por eso necesitamos `in May`.
  - `on`: `on` sirve para un dia o una fecha. `May` sin numero es un mes, por eso necesitamos `in`.
- `time_in_002`
  - `at`: `at` es demasiado exacto para un ano. `1998` es un periodo amplio, por eso necesitamos `in 1998`.
  - `on`: `on` sirve para un dia o una fecha. `1998` es un ano, por eso necesitamos `in`.
- `time_in_003`
  - `at`: `at the morning` no es el bloque normal. Para una parte del dia decimos `in the morning`.
  - `on`: `on` se usa si hay un dia concreto: `on Friday morning`. Aqui no hay dia, por eso necesitamos `in the morning`.
- `time_at_003`
  - `on`: `on night` no encaja. `night` se memoriza como bloque listo: `at night`.
  - `in`: `in the night` puede aparecer en contextos especiales, pero la frase normal "de noche" aqui es `at night`.
- `time_on_003`
  - `at`: `at` sirve para una hora exacta, pero `Friday morning` contiene un dia concreto. El dia lleva la respuesta a `on`.
  - `in`: `in the morning` seria sin dia. Aqui aparece `Friday`, por eso necesitamos `on Friday morning`.
- `time_in_004`
  - `at`: `at` es demasiado exacto para una estacion. `summer` es un periodo amplio, por eso necesitamos `in summer`.
  - `on`: `on` sirve para un dia o una fecha. `summer` es una estacion, por eso necesitamos `in`.
- `time_in_005`
  - `at`: `at two weeks` no expresa "dentro de dos semanas". Para futuro despues de un periodo necesitamos `in two weeks`.
  - `on`: `on two weeks` no encaja porque `two weeks` no es un dia ni una fecha. Necesitamos `in`.
- `time_mix_001`
  - `at / on`: estan invertidas. Dia = `on`, hora exacta = `at`, por eso `on Friday at 10`.
  - `in / at`: la segunda parte esta bien: `at 10`. Pero `Friday` es un dia, no un periodo amplio, por eso la primera parte debe ser `on`.

Retry ladder:

1. Mira solo la palabra despues del hueco: hora, dia/fecha o periodo amplio?
2. Tres bloques: `at 7`, `on Monday`, `in May`.
3. Si hay dia + parte del dia, gana el dia: `on Friday morning`.
4. Si significa "dentro de un periodo futuro", elige `in`: `in two weeks`.

## Mastery Draft

- Minimum correct answers: 10 of 12.
- Required streak: 4 correct in a row.
- Must answer at least two mixed or contrast tasks correctly after any mistake.
- Repeat if the learner misses:
  - exact clock time with `at`;
  - day/date with `on`;
  - month/year/season/part of day/future period with `in`;
  - `at night`;
  - day + part of day with `on`.

## Smart Trainer Draft

- category: `preposition`
- microDiagnosisId: `preposition_time_in_on_at`
- contrastSet: `["at", "on", "in"]`
- focusPatterns:
  - `exact_time_at`
  - `noon_midnight_at`
  - `day_on`
  - `date_on`
  - `month_in`
  - `year_in`
  - `season_in`
  - `part_of_day_in`
  - `night_at`
  - `day_part_on`
  - `future_period_in`
  - `mixed_day_exact_time`
