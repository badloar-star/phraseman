# Теория Learning V2: английские слова, которым нужен перевод в 7 языках (12 · ТЕОРИЯ → 10 · ПЕРЕВОДЧИК)

Дата: 22.10.2026. В ru и uk перевод уже вставлен в абзац раздела (коммиты 7f4660971, e0df9f2b0, a6e393404, 4ae393a54,
06976722e и коммит уроков 19–22). Нужно то же в `docs/work/theory_drafts/lesson_NN_<lang>.md` для **en, es, pt-BR, vi, id, tr, pl**:
в том же абзаце после английского слова — перевод на языке файла в скобках или «— …». Для en — короткое пояснение простыми
английскими словами или оставить как есть, если слово базовое. После правки — `node scripts/build_learning_v2_theory.mjs`
(абзац ≤ 300 знаков, сборка сама проверит).

| Урок · раздел | Где в абзаце | Как сделано в ru |
|---|---|---|
| 4 · 09 in, on, under | in the sink, in the basement, on the worktop, on the windowsill, under the doormat | (в раковине), (в подвале), (на столешнице), (на подоконнике), (под ковриком) |
| 5 · 06 our, their, its | пример «Where is my laptop?» не про тему | заменить на «Their laptops are on the desk.» во всех 9 языках (ещё не сделано) |
| 6 · 04 he, she, it + s | the host, my brother | (хозяин), (мой брат) |
| 7 · 03 Does | the barber, the fan | (парикмахер), (болельщик) |
| 9 · 08 где | She is in the doorway. I am near the carousel. | — «она в дверях», — «я у карусели» |
| 10 · 03 подсказки | once a week, twice a week, today, now | («раз в неделю»), («два раза в неделю»), («сегодня»), («сейчас») |
| 10 · 05 болит | earache, backache, toothache | («болит ухо»), («спина»), («зуб») |
| 10 · 08 когда | at lunchtime, at midnight | («в обед»), («в полночь») |
| 12 · 06 особые слова | rise → rose, hide → hid, find → found | («подниматься»), («прятать»), («находить») |
| 17 · 02 штучное | a bookend, two ottomans | («подставка для книг»), («два пуфа») |
| 17 · 03 many / much | pecans, polenta | («орехи пекан»), («полента») |
| 18 · 05 too / enough | This cabin bag is too big. This checked bag is light enough. | — «ручная кладь слишком большая», — «багаж достаточно лёгкий» |
| 19 · 02 can | We cannot talk in private. | — «мы не можем поговорить наедине» |
| 19 · 06 be able to | I am able to cope with the stress. We will be able to achieve this goal. | — «я справляюсь со стрессом», — «мы сможем достичь цели» |
| 20 · 02 must | You must take your belongings. | — «возьмите свои вещи» |
| 21 · 03 want, hope, plan + to | plan, expect, promise, offer | (планирую), (ожидаю), (обещаю), (предлагаю) |
| 22 · 03 it и them | Could I unscrew it? Could I untangle them? | («открутить»), («распутать») |

## Rollback

Удалить файл.
