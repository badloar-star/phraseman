# 12 дыр «слово во фразе раньше своей карточки» — правка содержания (СРОЧНО на вычитку 12 · ТЕОРИЯ)

Governance-ID: TG-A389DEE6F745
Status: Draft — ждёт вычитки 12 · ТЕОРИЯ, в фабрику не применено
Owner: Learning V2; решение координатора 22.10 (вариант б).

## Outcome

Сторож боевого курса `tests/learning_v2_live_new_word_before_phrase.test.ts` (20747cbe1) — список дыр до 0. Правило фабрики
«каждая карточка — прямо перед первым заданием со своим словом, без двух карточек подряд» не нарушается. Порядок заданий
не меняется.

## Правило правки

Задание сразу после карточки слова X звучало словом Y, карточка которого идёт позже. Теперь звук и правильный ответ —
слово X (текущей карточки). Y остаётся только неверным вариантом. Фраза — тот же шаблон уровня урока («It is a floor.»).
Синхронно правятся `final.ru.md`, `final.uk.md`, `practice.atomic.json` (звук, варианты, верный ответ, разборы ru/uk).
После вычитки — `build_release` по этим занятиям; дифф выпуска допускается только в l01/l02/l03/l06.

## Таблица (ru; uk — тем же смыслом)

| Занятие · задание | Было | Стало |
|---|---|---|
| l01/s21 · №4 «Послушайте и выберите услышанное» (после карточки empty) | 🔊 It is noisy. → **It is noisy.** · It is small. · It is empty. | 🔊 It is empty. → **It is empty.** · It is small. · It is noisy. Разборы: «В записи empty, а не small.» / «В записи empty, а не noisy.» |
| l01/s44 · №4 (после карточки weird) | 🔊 It is ancient. → **It is ancient.** · It is weird. · He is ancient. | 🔊 It is weird. → **It is weird.** · It is ancient. · He is weird. Разборы: «…последнее слово — `weird`, а в этом варианте — `ancient`» / «…первое слово — `It`, а в этом варианте — `He`» |
| l01/s48 · №3 (после карточки sharp) | 🔊 They are sticky. → **They are sticky.** · We are sticky. · They are sharp. | 🔊 They are sharp. → **They are sharp.** · We are sharp. · They are sticky. Разборы: «…первое слово — `They`, а здесь — `We`» / «…последнее слово — `sharp`, а здесь — `sticky`» |
| l02/s54 · №12 «…что ведущий говорит о последнем номере» (после карточки stunning) | 🔊 It is dramatic. → **It is dramatic.** · It is loud. · It is stunning. | 🔊 It is stunning. → **It is stunning.** · It is loud. · It is dramatic. Разборы: «…последнее слово — `stunning`, а здесь — `loud`/`dramatic`» |
| l03/s03 · №4 «…о вещи у двери» (после карточки mirror) | 🔊 It is a rug. → **It is a rug.** · It is a mirror. · It is a stool. | 🔊 It is a mirror. → **It is a mirror.** · It is a stool. · It is a rug. *(заголовок «о вещи у двери» → «о вещи на стене»)* |
| l03/s05 · №4 «…что мастер говорит о ремонте» (после карточки floor) | 🔊 It is a crack. → **It is a crack.** · It is a wall. · It is a floor. | 🔊 It is a floor. → **It is a floor.** · It is a wall. · It is a crack. |
| l03/s06 · №4 «…что консультант говорит о товарах» (после карточки tag) | 🔊 It is a bag. → **It is a bag.** · It is a tag. · It is a basket. | 🔊 It is a tag. → **It is a tag.** · It is a basket. · It is a bag. |
| l03/s07 · №4 «…о мебели» (после карточки cupboard) | 🔊 It is a wardrobe. → **It is a wardrobe.** · It is a cupboard. · It is a drawer. | 🔊 It is a cupboard. → **It is a cupboard.** · It is a drawer. · It is a wardrobe. |
| l03/s08 · №4 «…о вещах в коридоре» (после карточки hammer) | 🔊 It is a bucket. → **It is a bucket.** · It is a ladder. · It is a hammer. | 🔊 It is a hammer. → **It is a hammer.** · It is a ladder. · It is a bucket. |
| l01/s03 · №9 «Соберите фразу — вы всё ещё в офисе и не один» (после карточки sure) | Плитки: I am not alone sure → **I am not alone.** (лишняя sure) | «Соберите фразу — вы не уверены во времени встречи». Плитки: I am not sure alone → **I am not sure.** (лишняя alone: «один», а здесь вы сообщаете, что не уверены). ⚠ Следующее №10 — тоже I am not sure (диктант). |
| l02/s25 · №2 «На репетицию пришли не все. Спросите, кто отсутствует» (после карточки who) | Плитки: absent is Who What → **Who is absent?** | «На репетиции собираются. Спросите, кто уже на месте». Плитки: here is Who What → **Who is here?** (лишняя What: о человеке — Who). here — из урока 1. |
| l06/s40 · №6 «Послушайте новичка и соберите фразу» (после карточки invitation) | 🔊 The invitation is on the doorstep. → **The invitation is on the doorstep.** | 🔊 The invitation is on the table. → **The invitation is on the table.** (пример из карточки invitation; table — из урока 3). Плитки: table on the The invitation is are. |

## Вопросы к вычитке

1. l01/s03: после правки два задания подряд про I am not sure (№9 сборка, №10 диктант). Допустимо или лучше другая фраза
   с sure (например, I am sure.)?
2. l03/s03: заголовок «о вещи у двери» подходил к коврику; для зеркала — «о вещи на стене». Годится?
3. Ситуации «Послушай и выбери» для этих заданий будут из черновика 1c3b91a24 — сверю после правки звука.

## Вычитка 12 · ТЕОРИЯ (22.10) — ✅ 10 из 12 как есть, 2 правки

| Занятие · задание | Вердикт | Что поправить |
|---|---|---|
| l01/s21, s44, s48 · l02/s54 · l03/s05, s06, s07, s08 | ✅ | — звук = слово карточки, оба бывших варианта остались отвлекающими, разборы верные |
| l02/s25 · №2 «Who is here?» | ✅ | `here` из урока 1 — честно; лишняя `What` с разбором «о человеке — Who» хороша |
| l06/s40 · №6 «The invitation is on the table.» | ✅ | лишняя `are` — правильная ловушка (invitation — одно) |
| l03/s03 · №4 (mirror) | ✏️ | **заголовок оставить «о вещи у двери»**: «на стене» подсказывает ответ — висит на стене только зеркало, коврик и табурет отпадают без звука (памятка ситуаций, правило 7). У двери могут стоять все три вещи |
| l01/s03 · №9 (sure) | ✏️ | два одинаковых «I am not sure.» подряд (сборка + диктант) — слабее, чем пара «да / нет». **№9 → I am sure.** «Соберите фразу — вы точно знаете время встречи». Плитки: `I am sure alone` → **I am sure.** (лишняя alone: «один», а здесь вы уверены). №10 диктант «I am not sure.» остаётся — получается контраст «уверен / не уверен» |

Ответы на вопросы: 1 — заменить №9 на «I am sure.» (выше); 2 — нет, оставить «у двери» (выше); 3 — да, ситуации к этим 9 заданиям
«Послушайте и выберите» сверю по новому звуку, когда пришлёте сборку; правило то же — ситуация не должна указывать на
верное слово (например, для `weird` не писать «странный звук», для `sharp` — «осторожно, режется»).

## Применено (22.10, по вычитке Теории)

Все 12 исправлены в фабрике (ru/uk/atomic) и пересобраны. В приложение перенесены 7: l01/s03, l01/s21, l02/s25,
l03/s03, s05, s06, s07. **5 ждут озвучки** новой фразы — в `factory-production-v1` нет клипов «It is weird.», «They are sharp.»,
«It is stunning.», «It is a hammer.», «The invitation is on the table.»; без звука занятие не откроется. Это l01/s44, l01/s48,
l02/s54, l03/s08, l06/s40. Они стоят в `scripts/learning_v2_transfer_pending.v1.json` и остаются в списке сторожа (5).
После звука: перенос → вычеркнуть из обоих списков. Ситуации к 9 заданиям со сменой звука пока не ставились:
Теория сверит их после сборки.

## Scope

Только содержание занятий l01/l02/l03/l06 из таблицы выше (final.ru.md, final.uk.md, practice.atomic.json) и их выпуск
через build_release; черновик названий эпизодов уроков 1–3 в `docs/work/tasks/episode-names-rule.md`. Код приложения не меняется.

## Architecture

Фабрика курса — единственный источник: правка исходника → build_release → generated_release. Сторож боевого курса читает
выпуск. Названия применяются скриптом `scripts/learning_v2_apply_episode_titles.mjs` только после одобрения таблицы.

## Security and privacy

Данные пользователей не затрагиваются: правится учебный текст, сеть и Firestore не используются.

## Technical debt

Список KNOWN_HOLES в сторожe уходит в 0 после выпуска; до вычитки названий счётчик длинных названий остаётся 149.

## Verification

`npm run test:one -- tests/learning_v2_live_new_word_before_phrase.test.ts`; build_release по каждому занятию без ошибок
размещения карточек; дифф выпуска только в l01/l02/l03/l06. Черновик названий — скрипт-проверка: 56 на урок, ≤2 слов,
≤18 знаков, без повторов в уроке.

## Rollback

git revert коммита правки и пересборки.

Governance-ID: TG-66B7F3B65A16

Governance-ID: TG-33265A42B4C8

Governance-ID: TG-F45E1B19ECA8

Governance-ID: TG-015F94123BB0
