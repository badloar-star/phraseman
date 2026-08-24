# Phraseman — полная озвучка приложения: аудит и промпты

Дата: 2026-08-24 · Редакция 2 (промпты переписаны полностью)
Генератор: **Adobe Firefly Sounds**
Реестр событий: `modules/audio/sound_events.ts`
Формат ключа: `pm.<семейство>.<событие>` → файл `assets/audio/sfx/v1/<семейство>/<имя>_v1.m4a`

---

## Что изменилось в редакции 2

Первая редакция провалилась: Firefly выдавал дешёвый писк, музыку вместо
коротких звуков, и все звуки звучали одинаково. Причина — промпты были написаны
языком синтезатора.

| Было в редакции 1 | Стало в редакции 2 |
|---|---|
| `clean sine tone`, `filtered blip` (95 и 92 раза) | стекло, латунь, дуб, войлок, кожа, монеты, камень |
| `ascending arpeggio`, `major chord`, `fanfare` | «одно событие, не фраза» — прямым текстом в промпте |
| `no reverb`, `grounded in real material` (отрицания) | `close-miked in a quiet room`, `damped immediately` |
| 34 промпта начинались с `warm arcade` | каждый промпт начинается со своего предмета |

**Главный принцип новых промптов:** описывается **физический предмет**, который
издаёт звук, а не параметры синтеза. Не «чистый тон 400 мс», а «ноготь по краю
толстого хрустального стакана, снято вплотную микрофоном в тихой комнате».

Отрицания убраны сознательно: генераторы плохо их держат и часто выдают ровно
запрещённое. Вместо «без реверберации» — «записано вплотную в тихой комнате».

Эталон качества: **звуки интерфейса Apple/iOS** — тихие, дорогие, физичные.

---

## Как пользоваться

**Каждый промпт начинается с имени функции** — Adobe кладёт первые слова промпта
в название скачиваемого файла. Скачали пачку — по именам сразу видно, что куда.

1. Нашли звук в нужном разделе.
2. Взяли **один из трёх** промптов (A / B / C — три разных предмета, не три
   пересказа одного; выбираете на слух).
3. Сгенерировали в Firefly, скачали файл.
4. Переименовали в `<имя>_v1` из заголовка звука.
5. Отдали мне — подключу ключ в реестре одной строкой.

Три варианта устроены так: **A** — самый строгий и тихий, **B** — теплее
(дерево, кожа, бумага), **C** — весомее (металл, камень, резонанс).

**Технические требования:** моно, 48 кГц, m4a или mp3, тишина в начале обрезана,
нормализация −14 LUFS, пик −1 dBTP.

---

## Результат аудита

Проверено: 134 экрана в `app/`, 217 компонентов, 80 модалок и тостов.

| Показатель | Значение |
|---|---|
| Событий в реестре `SOUND_EVENTS` | 89 |
| Из них **без звукового файла** (заглушка `null`) | **29** (вся Арена) |
| Экранов из 134, где **нет ни одного звука** | **111** |
| Модалок/тостов из 80, где **нет ни одного звука** | **72** |
| Звуков в этом документе | **118** |
| Промптов (по три на звук) | **354** |

### Что уже озвучено плотно (эталон)

**Экран завершения урока** — `components/feedback/ResultsSequence.tsx` плюс
таймлайн в `components/feedback/results_sequence_motion_plan.ts`: медаль →
звёзды по одной → старт XP-каунтера → тики → завершение → показ награды →
распаковка подарка → множитель → апгрейд → финальный аккорд. Именно эту
плотность документ распространяет на остальное приложение.

### Крупнейшие дыры

| Раздел | Экранов без звука |
|---|---|
| **Арена** | 29 событий-заглушек (ключи есть, файлов нет) |
| **Персональный план** | 13 |
| **Пейволы** | 9 |
| **MAX-звонок** | 8 |
| **Диалоги с ИИ** | 5 |
| **Карточки** | 8 |
| **Магазины и валюты** | 5 |
| **Профиль и прогресс** | 7 |
| **Настройки** | 6 |
| **Соцчасть** | 6 |
| **Уроки-обвязка** | 9 |

---

## Важно: нажатия ранее были отключены владельцем

В `app/feedback/feedback_kit.ts` стоит прямое решение: «ЗВУК-«писк» при нажатии
кнопок убран совсем — остаётся только тактильный отклик». Так же убраны `pop`,
`whoosh` и звук ошибки.

Поэтому основные разделы дают плотность **по смыслу** (появления, переходы,
вердикты, накопления, покупки, завершения), а озвучка нажатий вынесена в
раздел 14 отдельно — три звука на всё приложение, включаем только по решению
владельца.

---

## С чего начать

1. **Арена (29)** — код уже расставлен и ждёт файлов, промпты в `docs/arena/SOUND_PROMPTS.md`
2. **Пейволы и покупки (12)** — успешная оплата без звука читается как сбой
3. **Модалки, тосты, навигация (10)** — закрывают 72 экрана малым набором
4. **Персональный план (12)** — целый продукт, сейчас полностью немой
5. **MAX и Диалоги (23)** — тихие звуки под живую речь
6. **Остальное** — карточки, магазины, профиль, лига, уроки, настройки
7. **Слой нажатий (3)** — только по решению владельца

---
# 1. Персональный план

### `pm_plan_setup_open` — 1.1 с, громкость 0.24
**Экран:** `app/personal_plan_setup.tsx` · Момент: открылся мастер настройки плана, пользователь впервые видит вопросы о своей цели.

**A.** pm_plan_setup_open — the sound of a slim brass hinge on a leather-bound notebook opening for the first time, recorded close-miked in a quiet room. A single smooth pivot with a faint metallic whisper, then stillness. Restrained, precise, inviting. One event, not a phrase. 1.1 seconds total including the natural decay.

**B.** pm_plan_setup_open — a cover of soft full-grain leather being lifted and laid open on a wooden desk, the material creasing gently as it settles flat. Warm, unhurried, a single continuous gesture a single occurrence only. Recorded close in a padded room. 1.1 seconds total.

**C.** pm_plan_setup_open — a heavy oak drawer sliding open on well-oiled wooden runners, one confident pull that stops with a soft wooden thud at the limit. Weighty and deliberate, the grain audibly resonating for a moment. One event, nothing more. 1.1 seconds total.

### `pm_plan_setup_step_v1` — 0.36 с, громкость 0.26
**Экран:** `app/personal_plan_setup.tsx` · Момент: пользователь ответил на один вопрос настройки, мастер перелистнулся на следующий шаг.

**A.** pm_plan_setup_step — a fingertip flicking a small polished glass bead across a smooth marble tray, one crisp point contact and a short bright roll that stops almost immediately. Delicate, precise, close-miked in a silent room. A single event. 360 milliseconds total including decay.

**B.** pm_plan_setup_step — a thin card of stiff leather being turned over once on a wooden table, a soft directional swish with a light tap as it settles. Tactile and warm, one motion only, recorded close in a quiet space. 360 milliseconds total.

**C.** pm_plan_setup_step — a small brass index tab clicking past a raised guide on a card-catalogue drawer, one crisp metallic notch. Compact and businesslike, a contact that stops dead afterward, a single mechanical step. 360 milliseconds total including decay.

### `pm_plan_ready_v1` — 1.6 с, громкость 0.46
**Экран:** `app/personal_plan.tsx` · Момент: план собран и впервые показан пользователю целиком.

**A.** pm_plan_ready — a heavy crystal stopper being set into the neck of a decanter, one firm downward seat followed by a faint high resonance that fades cleanly. Recorded close-miked in a still room, expensive and exact. One event, not a phrase. 1.6 seconds total including the natural decay.

**B.** pm_plan_ready — a polished wooden box lid closing onto a felt-lined base, a soft deep clap of air followed by the wood settling and a last quiet creak. Warm, considered, a single confident close. 1.6 seconds total including decay.

**C.** pm_plan_ready — a large brass ship's bell struck once with a padded mallet and immediately damped by the hand, a short round tone that stops cleanly rather than ringing out. Weighty and ceremonial in miniature. One strike, nothing more. 1.6 seconds total.

### `pm_plan_theory_open_v1` — 0.9 с, громкость 0.20
**Экран:** `app/personal_plan_theory.tsx` · Момент: открылась карточка теории перед упражнениями.

**A.** pm_plan_theory_open — a pane of thin glass sliding a few centimetres inside a wooden display case runner, one smooth gliding pass ending in a soft stop. Quiet, precise, close-miked in a still room. A single event. 900 milliseconds total including decay.

**B.** pm_plan_theory_open — a leather portfolio cover being folded back and smoothed flat by a palm, a low continuous rustle that settles into silence. Warm and unhurried, one gesture only. 900 milliseconds total.

**C.** pm_plan_theory_open — a small brass reading-lamp switch clicking over with a felt-cushioned stop, one clean mechanical toggle and a faint afterglow of metal settling. Understated, no repetition. 900 milliseconds total including decay.

### `pm_plan_exercise_in_v1` — 0.3 с, громкость 0.22
**Экран:** `app/personal_plan_exercise.tsx` · Момент: новое упражнение выезжает на экран.

**A.** pm_plan_exercise_in — a fingertip tapping the rim of a thin crystal glass once, a light bright point of contact that decays almost instantly. Close-miked in a silent room, clean and small. A single event, nothing sustained. 300 milliseconds total including decay.

**B.** pm_plan_exercise_in — a slim wooden ruler flicked lightly against the edge of a desk, one short percussive knock with a dry wooden character. Casual, quick, a single tap only. 300 milliseconds total.

**C.** pm_plan_exercise_in — a small steel paperclip dropped from a short height onto a marble slab, one bright metallic tick absorbed completely on impact recorded afterward. Precise and minimal. 300 milliseconds total including decay.

### `pm_plan_exercise_transition_v1` — 0.55 с, громкость 0.24
**Экран:** `app/personal_plan_exercise_transition.tsx` · Момент: промежуточный экран между двумя упражнениями, короткая передышка.

**A.** pm_plan_exercise_transition — a palm brushing once across a sheet of fine-grit sandpaper mounted on wood, a short soft sweep with a dry textured whisper. Close-miked, unhurried, one pass only. 550 milliseconds total including decay.

**B.** pm_plan_exercise_transition — a thin leather strap being drawn once through a brass buckle loop, a soft continuous slide with a faint creak at the end. Warm, tactile, a single motion. 550 milliseconds total.

**C.** pm_plan_exercise_transition — a small pendulum weight on a desk clock swinging once and being caught by a felt stop, one smooth mechanical arc with a soft cushioned halt. Calm, exact. 550 milliseconds total including decay.

### `pm_plan_quiz_start_v1` — 1.0 с, громкость 0.28
**Экран:** `app/personal_plan_quiz.tsx` · Момент: начинается проверочный квиз плана.

**A.** pm_plan_quiz_start — a brass desk-bell button pressed once with a fingertip, a short crisp mechanical click followed by a small bright ring that is damped immediately by the hand. Alert but composed. One event, not a phrase. 1 second total including decay.

**B.** pm_plan_quiz_start — a wooden domino tile being set upright on a stone table with a firm fingertip tap, one solid contact and a brief wooden resonance. Focused, deliberate, a single placement. 1 second total.

**C.** pm_plan_quiz_start — a stack of two heavy coins dropped a short distance onto a granite surface, one dense metallic clink with a fast natural decay. Weighty and immediate, no repetition. 1 second total including decay.

### `pm_plan_task_done_v1` — 1.2 с, громкость 0.48
**Экран:** `app/personal_plan_task_done.tsx` · Момент: задача дня в плане закрыта.

**A.** pm_plan_task_done — a polished brass latch on a wooden case snapping shut in one firm motion, a confident mechanical seat followed by a short resonant settle. Recorded close-miked in a quiet room, satisfying and exact. One event, nothing more. 1.2 seconds total including decay.

**B.** pm_plan_task_done — a leather-bound stamp pressed once firmly onto a wooden desk pad, a soft deep thud with the leather creaking faintly as it lifts away. Warm, conclusive, a single gesture. 1.2 seconds total.

**C.** pm_plan_task_done — a heavy brass coin dropped onto a small stack of others on a marble tray, one bright dense clink with a fast decay and the stack settling. Weighty, final, one event only. 1.2 seconds total including decay.

### `pm_plan_streak_step_v1` — 0.42 с, громкость 0.30
**Экран:** `app/personal_plan.tsx` · Момент: шкала прогресса плана делает шаг вперёд, один день закрашивается.

**A.** pm_plan_streak_step — a single glass marble dropped into a shallow crystal dish, one clean bright point of contact with an immediate stop, no roll. Close-miked, small and precise. A single event. 420 milliseconds total including decay.

**B.** pm_plan_streak_step — a thin wooden peg being pushed into a drilled hole on a game board, one firm short push with a soft wooden seat. Tactile, satisfying, a single motion. 420 milliseconds total.

**C.** pm_plan_streak_step — a small brass gear tooth advancing one notch inside a hand-wound clock, a short precise mechanical click. Exact and understated, a contact that stops dead afterward. 420 milliseconds total including decay.

### `pm_plan_complete_v1` — 2.2 с, громкость 0.58
**Экран:** `app/personal_plan_complete.tsx` · Момент: весь персональный план пройден до конца, крупная церемония.

**A.** pm_plan_complete — a large crystal glass struck once at its rim with a metal spoon and left to ring fully, a bright pure tone that blooms and slowly fades to silence in a still room. Ceremonial, expensive, one strike, nothing more. 2.2 seconds total including the full natural decay.

**B.** pm_plan_complete — a heavy oak door with a brass mechanism closing in one slow deliberate motion, a deep wooden thud followed by the brass bolt settling into its housing with a final soft click. Grand but composed, a single continuous gesture. 2.2 seconds total.

**C.** pm_plan_complete — a large brass bell struck once with a proper mallet and allowed to ring out fully in an open stone room, a rich round tone that decays naturally and completely. Weighty, celebratory, one event only. 2.2 seconds total including full decay.

### `pm_plan_thank_you_v1` — 1.5 с, громкость 0.34
**Экран:** `app/personal_plan_thank_you.tsx` · Момент: экран благодарности после плана, тёплое личное прощание.

**A.** pm_plan_thank_you — a small crystal chime touched once with a felt-tipped mallet, a soft warm tone that rings gently and fades slowly in a quiet room. Intimate, tender, one strike, nothing more. 1.5 seconds total including natural decay.

**B.** pm_plan_thank_you — a soft leather-bound book being closed gently by hand, a slow warm compression of air and pages settling, followed by a faint creak of the spine. Personal, unhurried, a single gesture. 1.5 seconds total.

**C.** pm_plan_thank_you — a small brass hand-bell tilted once and immediately cupped still by a palm, a brief warm ring caught and silenced by hand. Gentle, deliberate, one event. 1.5 seconds total including decay.

### `pm_plan_sunset_warning_v1` — 0.8 с, громкость 0.30
**Экран:** `app/personal_plan_sunset_guard.tsx` · Момент: предупреждение, что план скоро закроется.

**A.** pm_plan_sunset_warning — a brass pocket-watch case snapping closed once, a firm compact mechanical click with a faint metallic aftertone. Recorded close-miked, measured and slightly urgent without being harsh. One event. 800 milliseconds total including decay.

**B.** pm_plan_sunset_warning — a wooden ruler tapping once firmly against a stone windowsill, a short dry knock with a brief resonant echo off the stone. Attentive, grounded, a single tap. 800 milliseconds total.

**C.** pm_plan_sunset_warning — a heavy iron key turning once in an old brass lock, a low mechanical grind followed by a solid final click. Serious in tone but contained, one motion only. 800 milliseconds total including decay.

# 2. Пейволы, подписка и покупки

### `pm_paywall_present_v1` — 1.3 с, громкость 0.30
**Экран:** `app/paywall_a.tsx` … `paywall_g.tsx` · Момент: пейвол выехал на экран, пользователь впервые видит предложение подписки.

**A.** pm_paywall_present — a pane of thick glass sliding smoothly up inside stone-lined channels, a low continuous glide that ends in one soft cushioned stop. Recorded close-miked, refined and unhurried. A single event, not a phrase. 1.3 seconds total including decay.

**B.** pm_paywall_present — a leather-covered presentation case opening on a hidden hinge, a slow warm creak followed by a soft settle as the lid reaches its full extent. Inviting, considered, one continuous gesture. 1.3 seconds total.

**C.** pm_paywall_present — a heavy brass curtain rail sliding a short distance and stopping against a felt buffer, a low metallic glide with a firm cushioned halt. Weighty, deliberate, a single motion. 1.3 seconds total including decay.

### `pm_paywall_plan_select_v1` — 0.4 с, громкость 0.26
**Экран:** пейволы · Момент: пользователь выбрал один из тарифов, карточка тарифа подсветилась.

**A.** pm_paywall_plan_select — a fingertip tapping once on a thick polished glass panel, a small clean point of contact that stops the instant it is made. Close-miked in a silent room, precise and confident. A single event. 400 milliseconds total including decay.

**B.** pm_paywall_plan_select — a thin wooden token being set down firmly on a felt-covered table, one soft-edged tap with a brief wooden resonance. Tactile, decisive, a single placement. 400 milliseconds total.

**C.** pm_paywall_plan_select — a small brass toggle switch flipped once with a felt-cushioned stop, a compact mechanical click with a faint metallic edge. Businesslike, exact. 400 milliseconds total including decay.

### `pm_paywall_trial_highlight_v1` — 0.7 с, громкость 0.30
**Экран:** пейволы · Момент: подсветился блок бесплатного пробного периода, ключевой аргумент предложения.

**A.** pm_paywall_trial_highlight — a fingernail drawn once slowly along the rim of a thick crystal tumbler, a soft rising shimmer that fades cleanly the tone releasing the moment it peaks. Recorded close-miked in a still room, elegant and brief. One event. 700 milliseconds total including decay.

**B.** pm_paywall_trial_highlight — a soft leather bookmark ribbon pulled taut once across a page and released, a warm short slide with a faint tension release. Personal, quiet, a single gesture. 700 milliseconds total.

**C.** pm_paywall_trial_highlight — a small brass key catching light and being turned a quarter-turn in an ornate lock, a bright short mechanical scrape ending in a soft seat. Inviting, precise, one motion. 700 milliseconds total including decay.

### `pm_purchase_start_v1` — 0.6 с, громкость 0.32
**Экран:** пейволы, `app/shop.tsx`, `app/shards_shop.tsx` · Момент: пользователь подтвердил покупку, ушёл запрос в магазин приложений.

**A.** pm_purchase_start — a heavy glass stopper lifted quickly from a decanter neck, a short bright suction release with an immediate stop. Recorded close-miked, crisp and purposeful. A single event. 600 milliseconds total including decay.

**B.** pm_purchase_start — a leather wallet snap-clasp releasing once with a firm flick, a soft mechanical pop with a faint leather creak trailing. Warm, quick, one motion only. 600 milliseconds total.

**C.** pm_purchase_start — a single heavy coin flicked upward off a thumb into the air, a short bright metallic spin caught abruptly before any landing. Confident, brief, one event. 600 milliseconds total including decay.

### `pm_purchase_success_v1` — 1.7 с, громкость 0.56
**Экран:** пейволы, магазины · Момент: покупка прошла успешно, доступ выдан.

**A.** pm_purchase_success — the sound of a heavy brushed-aluminium latch closing on a luxury watch case, recorded close-miked in a quiet room. A single confident mechanical seat, then the metal body rings faintly for a moment and settles. Solid, expensive, understated. One event, not a phrase. 1.7 seconds total including the natural decay.

**B.** pm_purchase_success — a polished wooden jewellery box lid closing firmly onto a velvet-lined base, a deep soft thud of displaced air followed by a faint wooden creak settling into silence. Warm, conclusive, a single gesture. 1.7 seconds total.

**C.** pm_purchase_success — a stack of five heavy coins set down firmly on a marble counter in one motion, a dense bright clatter that resolves quickly into a settled clink. Weighty, celebratory, one event only. 1.7 seconds total including decay.

### `pm_purchase_restored_v1` — 1.0 с, громкость 0.38
**Экран:** `app/manage_subscription.tsx` · Момент: покупки восстановлены, доступ вернулся.

**A.** pm_purchase_restored — a brass key turning smoothly back to its original position in a well-oiled lock, a clean mechanical rotation ending in a soft confirming click. Recorded close-miked, reassuring and precise. One event. 1 second total including decay.

**B.** pm_purchase_restored — a leather-bound ledger closing gently after a final entry, a soft compression of air and pages settling into place. Calm, restorative, a single continuous gesture. 1 second total.

**C.** pm_purchase_restored — a heavy pendulum weight swinging back to rest against a felt-lined stop inside a wooden clock case, one smooth arc ending in a soft cushioned halt. Settled, dependable, a single motion. 1 second total including decay.

### `pm_purchase_failed_v1` — 0.7 с, громкость 0.30
**Экран:** пейволы, магазины · Момент: оплата не прошла, показана ошибка. Не должен звучать как наказание.

**A.** pm_purchase_failed — a fingertip tapping once gently against a thick pane of glass that does firmly shut, a short soft contact with a slightly flat, muted quality. Recorded close-miked, neutral rather than harsh. One event. 700 milliseconds total including decay.

**B.** pm_purchase_failed — a wooden door handle turned once and gently checked by a soft felt-lined stop, a low understated resistance the movement arriving gently. Calm, forgiving in tone, a single motion. 700 milliseconds total.

**C.** pm_purchase_failed — a single coin dropped a short distance onto a thick wool felt pad, a dull soft metallic thud that stops the instant it is made. Muted, unthreatening, one event only. 700 milliseconds total including decay.

### `pm_premium_modal_open_v1` — 1.0 с, громкость 0.28
**Экран:** `app/premium_modal.tsx`, `app/premium_modal_v2.tsx` · Момент: модалка премиума раскрылась поверх текущего экрана.

**A.** pm_premium_modal_open — a pane of fine glass lifted and set down flat onto a marble surface, a smooth brief glide followed by a soft precise landing. Recorded close-miked, refined and quiet. A single event. 1 second total including decay.

**B.** pm_premium_modal_open — a leather presentation folder unfolding once on a wooden table, a low warm rustle ending in a soft flat settle. Inviting, unhurried, one continuous gesture. 1 second total.

**C.** pm_premium_modal_open — a brass display easel leg unfolding and locking into place with a short mechanical snap, a compact metallic click with a faint resonance. Considered, deliberate, a single motion. 1 second total including decay.

### `pm_subscription_manage_open_v1` — 0.8 с, громкость 0.22
**Экран:** `app/manage_subscription.tsx` · Момент: открылся экран управления подпиской.

**A.** pm_subscription_manage_open — a small brass drawer pull lifted and released once on a filing cabinet, a short clean metallic tick that stops the instant it is made. Recorded close-miked, businesslike and quiet. A single event. 800 milliseconds total including decay.

**B.** pm_subscription_manage_open — a leather folder cover lifted and laid back gently on a desk, a soft low rustle settling into stillness. Calm, procedural, one gesture only. 800 milliseconds total.

**C.** pm_subscription_manage_open — a wooden filing drawer sliding open a short distance on smooth runners and stopping cleanly, a low controlled glide with a soft wooden halt. Orderly, precise. 800 milliseconds total including decay.

### `pm_promo_code_applied_v1` — 1.1 с, громкость 0.44
**Экран:** `app/promo_code_entry.tsx` · Момент: промокод принят, бонус начислен.

**A.** pm_promo_code_applied — a brass stamp pressed firmly once onto a waxed wooden surface, a solid mechanical thud followed by a brief metallic ring settling into silence. Recorded close-miked, confident and rewarding. One event, not a phrase. 1.1 seconds total including decay.

**B.** pm_promo_code_applied — a leather ticket punch closing once through thick card, a firm compact crunch with a faint leather creak from the handle. Tactile, satisfying, a single motion. 1.1 seconds total.

**C.** pm_promo_code_applied — two heavy coins struck together once directly above a marble tray, a bright dense metallic clink with a fast clean decay. Weighty and celebratory, one event only. 1.1 seconds total including decay.

### `pm_promo_code_rejected_v1` — 0.6 с, громкость 0.28
**Экран:** `app/promo_code_entry.tsx` · Момент: промокод не подошёл.

**A.** pm_promo_code_rejected — a fingertip tapping once against a pane of glass set into a locked wooden frame, a short flat contact with a slightly dampened, inconclusive quality. Recorded close-miked, neutral, sympathetic in character. One event. 600 milliseconds total including decay.

**B.** pm_promo_code_rejected — a wooden token dropped onto a thick felt mat, a dull soft thud absorbed almost instantly by the fabric beneath. Muted, gentle, a single contact. 600 milliseconds total.

**C.** pm_promo_code_rejected — a small brass latch tried once and failing to catch, a short soft metallic slip and simply ending there. Understated, non-alarming, one event only. 600 milliseconds total including decay.

### `pm_billing_issue_v1` — 0.9 с, громкость 0.32
**Экран:** `components/BillingIssueToastHost.tsx` · Момент: всплыла плашка о проблеме с оплатой подписки.

**A.** pm_billing_issue — a brass door knocker lifted and set back down softly against a felt pad rather than struck, a low controlled metallic tap with a brief settle. Recorded close-miked, attentive but calm in character. One event. 900 milliseconds total including decay.

**B.** pm_billing_issue — a leather-bound diary closing slightly too quickly, a firm compact thud of pages meeting with a short creak of the spine. Grounded, matter-of-fact, a single gesture. 900 milliseconds total.

**C.** pm_billing_issue — a heavy coin set down firmly but carefully on a stone ledge, a solid short metallic contact with a controlled, unhurried decay. Serious in tone but composed, one event only. 900 milliseconds total including decay.
# 3. MAX — голосовой звонок с учителем

### `pm_max_prestart_ready_v1` — 0.9 с, громкость 0.26
**Экран:** `app/max_call_prestart.tsx` · Момент: экран прогрева перед звонком, линия готова, можно звонить.

**A.** pm_max_prestart_ready — a fingertip brushing once across a taut sheet of silk stretched over a wooden hoop, recorded close in a treated room. The touch is light and settles instantly, a single readiness cue with a contact that stops dead or shimmer. Barely audible, felt more than heard. 0.9 seconds.

**B.** pm_max_prestart_ready — a small wooden box lid lifted a few millimeters and eased back down onto its felt lining, one soft contact, nothing more. Warm and organic, like a case opening just enough to check what's inside. Close-miked in a quiet room. 0.9 seconds.

**C.** pm_max_prestart_ready — a single drop of water landing on the surface of a shallow ceramic bowl in a still, small room, the faint room tone giving it a sense of space. The contact is soft and damped immediately, no ripple trail. 0.9 seconds.

### `pm_max_call_connect_v1` — 0.8 с, громкость 0.34
**Экран:** `app/max_call_session.tsx` · Момент: звонок соединился, учитель на линии.

**A.** pm_max_call_connect — two folded palms coming together in a single soft clap-like press, close-miked, the air between them pushed out in one clean contact. Dry and immediate, a private gesture rather than a public one. One event, nothing sustained after. 0.8 seconds.

**B.** pm_max_call_connect — a heavy paper envelope flap pressed down and sealed shut with one firm press of a palm, recorded very close, the paper's soft crease audible. Warm, tactile, a sense of a connection being made physically. 0.8 seconds.

**C.** pm_max_call_connect — a wooden door latch settling into its catch inside a small carpeted room, a single soft mechanical give wrapped in gentle room air. The room's quiet size is audible around the contact. 0.8 seconds.

### `pm_max_call_end_v1` — 1.1 с, громкость 0.32
**Экран:** `app/max_call_session.tsx` · Момент: звонок завершён, линия закрылась.

**A.** pm_max_call_end — a soft exhale released slowly through barely parted lips, close-miked in a treated room, fading to silence as the breath runs out. A single closing gesture, unhurried, stopping cleanly with nothing after. 1.1 seconds.

**B.** pm_max_call_end — a cloth drawstring pouch pulled shut with one slow, even tug, the fabric folding softly against itself as the opening closes. Warm and domestic, recorded close in a quiet room. 1.1 seconds.

**C.** pm_max_call_end — a heavy wooden shutter easing closed and settling into its frame in a small stone-floored room, the faint room air trailing the motion before it stops cleanly. 1.1 seconds.

### `pm_max_turn_yours_v1` — 0.3 с, громкость 0.24
**Экран:** `app/max_call_session.tsx` · Момент: учитель договорил, теперь очередь пользователя говорить. Обязан быть очень тихим и коротким.

**A.** pm_max_turn_yours — the soft catch of breath a person makes just before speaking, captured very close on a studio microphone in a treated room. Intimate, human, almost subliminal. A single intake, nothing more, and it must sit comfortably under a speaking voice. 0.3 seconds.

**B.** pm_max_turn_yours — one fingertip tapping the back of a hand once, the lightest possible contact between skin and skin, recorded extremely close. Warm and quiet, a gentle nudge rather than a signal. 0.3 seconds.

**C.** pm_max_turn_yours — the faint give of a thin paper page turned a few millimeters and released in a hushed reading room, one brief contact that stays quietly under a speaking voice. 0.3 seconds.

### `pm_max_listening_start_v1` — 0.25 с, громкость 0.22
**Экран:** `app/max_call_session.tsx` · Момент: микрофон открылся, приложение слушает пользователя.

**A.** pm_max_listening_start — a very short inhale drawn gently through the nose, close-miked in a silent treated room, cut off the instant it begins. Barely audible, felt more than heard, sitting comfortably under a speaking voice. 0.25 seconds.

**B.** pm_max_listening_start — the soft give of a fingertip pressing into a cushion of folded wool cloth, one contact that yields and stops immediately. Warm, muffled, private. 0.25 seconds.

**C.** pm_max_listening_start — a single soft footstep of a bare foot easing onto a thick rug in a quiet room, the faint compression of fabric giving the moment a sense of place. Damped immediately. 0.25 seconds.

### `pm_max_listening_stop_v1` — 0.25 с, громкость 0.22
**Экран:** `app/max_call_session.tsx` · Момент: микрофон закрылся, реплика пользователя ушла на обработку.

**A.** pm_max_listening_stop — a very short exhale released through the nose, close-miked in a silent treated room, tapering to nothing almost instantly. Barely audible, a single closing breath under a speaking voice. 0.25 seconds.

**B.** pm_max_listening_stop — a fingertip lifting off a cushion of folded wool cloth, the faint release of pressure as contact breaks, recorded very close. Soft, quiet, a single departure. 0.25 seconds.

**C.** pm_max_listening_stop — a thin paper notebook cover easing shut in a hushed room, one soft contact absorbed by the pages beneath it, nothing lingering after. 0.25 seconds.

### `pm_max_caption_in_v1` — 0.2 с, громкость 0.16
**Экран:** `app/max_call_live_caption_view.tsx` · Момент: новая строка живых субтитров появилась под речью.

**A.** pm_max_caption_in — the faint scratch of a soft pencil tip touching paper for a single instant, close-miked in a silent room, gone as soon as it starts. Barely audible, a single mark, nothing sustained. 0.2 seconds.

**B.** pm_max_caption_in — one fingertip brushing the edge of a dry page in a quiet reading room, the lightest possible paper contact, damped immediately. Stays quietly under a speaking voice. 0.2 seconds.

**C.** pm_max_caption_in — a single soft droplet of water touching a folded cloth in a small quiet room, absorbed instantly the surface staying smooth trail, the faint room air present underneath. 0.2 seconds.

### `pm_max_review_open_v1` — 1.2 с, громкость 0.30
**Экран:** `app/max_voice_review.tsx` · Момент: открылся разбор состоявшегося звонка.

**A.** pm_max_review_open — a hardbound notebook cover opened slowly in a quiet room, the spine giving a soft creak and the pages settling with a light rustle, close-miked. One unhurried gesture, stopping cleanly as the cover lies flat. 1.2 seconds.

**B.** pm_max_review_open — a folded linen cloth unfurled gently in a still room, the fabric's soft unfolding audible close to the microphone, air moving faintly as it opens. Warm and unhurried. 1.2 seconds.

**C.** pm_max_review_open — a wooden drawer with felt-lined runners sliding open a short distance in a small quiet room, the room's faint size audible around the smooth motion, stopping softly at its limit. 1.2 seconds.

### `pm_max_goal_reached_v1` — 1.4 с, громкость 0.48
**Экран:** `app/max_call_session.tsx`, `app/max_voice_review.tsx` · Момент: цель разговора достигнута — учитель отметил, что задача выполнена.

**A.** pm_max_goal_reached — a soft wooden reed instrument breathed into once with warm, rounded air, recorded close in a small treated room, the tone blooming gently and settling immediately. A single warm confirmation, stopping cleanly. 1.4 seconds.

**B.** pm_max_goal_reached — a ceramic cup set down onto a wooden saucer with a single warm, rounded contact in a quiet kitchen-sized room, the faint resonance of the ceramic settling immediately. Satisfying and human. 1.4 seconds.

**C.** pm_max_goal_reached — two palms pressed together and drawn apart slowly with a soft breathy release of air between them, recorded close in a still room, a single gentle gesture of completion with a natural room tail. 1.4 seconds.

### `pm_max_time_warning_v1` — 0.7 с, громкость 0.28
**Экран:** `app/max_call_session.tsx` · Момент: минуты звонка на исходе, учитель предупреждает о скором завершении.

**A.** pm_max_time_warning — a single soft knuckle tap on a wooden tabletop in a small quiet room, close-miked, the contact damped almost immediately by the wood's density. Gentle and quiet, a private nudge. 0.7 seconds.

**B.** pm_max_time_warning — a thin reed instrument given one short, breathy pulse of air in a treated room, the tone soft-edged and brief, fading before it can ring. Must sit quietly under a speaking voice. 0.7 seconds.

**C.** pm_max_time_warning — a folded paper fan snapped closed once in a still room, the quick soft rustle of paper against itself the only sound, stopping cleanly with the motion. 0.7 seconds.

### `pm_max_consent_granted_v1` — 0.8 с, громкость 0.30
**Экран:** `app/max_voice_consent_gate.tsx`, `components/MaxVoiceConsentModal.tsx` · Момент: пользователь дал согласие на голосовой режим.

**A.** pm_max_consent_granted — a wax-sealed letter pressed closed with one firm, warm contact in a quiet room, the paper and wax settling together in a single confirming press. Close-miked, a small ceremonial gesture. 0.8 seconds.

**B.** pm_max_consent_granted — a soft leather-bound cover closing over its pages with one gentle contact in a still room, the material's quiet give audible close to the microphone. Warm and deliberate. 0.8 seconds.

**C.** pm_max_consent_granted — a palm pressed flat against a wooden door in a small room, one steady contact held briefly and released, the room's quiet air present around it. A single grounded gesture. 0.8 seconds.

### `pm_max_memory_saved_v1` — 0.9 с, громкость 0.32
**Экран:** `app/max_memory_settings.tsx` · Момент: настройки памяти учителя сохранены.

**A.** pm_max_memory_saved — a small wooden box lid closed and its brass-free wooden latch settling into place in a quiet room, one soft contact followed by a faint settle. Close-miked, private and final. 0.9 seconds.

**B.** pm_max_memory_saved — a folded cloth bundle tied once with a soft cotton cord in a still room, the gentle friction of fabric against fabric as the knot is drawn snug. Warm, unhurried. 0.9 seconds.

**C.** pm_max_memory_saved — a ceramic lid set down onto a ceramic jar in a small quiet kitchen room, one rounded contact that settles instantly with a faint resonance, nothing after. 0.9 seconds.

# 4. Диалоги с ИИ

### `pm_dialog_catalog_open_v1` — 1.0 с, громкость 0.24
**Экран:** `app/ai_dialog_home.tsx` · Момент: открылся каталог сценариев диалогов.

**A.** pm_dialog_catalog_open — a stack of thin cards fanned open with one smooth sweep of a thumb in a quiet room, the soft flutter of paper edges close to the microphone. A single unhurried gesture, settling as the fan stops. 1.0 seconds.

**B.** pm_dialog_catalog_open — a folded map unfolded one panel at a time in a still room, the paper's soft crease sounds overlapping briefly before settling flat. Warm and tactile. 1.0 seconds.

**C.** pm_dialog_catalog_open — a wooden shutter of a small cabinet swung open in a modestly sized room, the room's air and faint wood creak giving it a sense of place, stopping softly at full open. 1.0 seconds.

### `pm_dialog_scenario_pick_v1` — 0.4 с, громкость 0.26
**Экран:** `components/DialogScenarioTile.tsx` · Момент: пользователь выбрал сценарий диалога, плитка подсветилась.

**A.** pm_dialog_scenario_pick — a single fingertip pressing a thin card down onto a wooden table in a quiet room, close-miked, the contact soft and immediate absorbed completely on impact. One event, nothing more. 0.4 seconds.

**B.** pm_dialog_scenario_pick — a smooth stone-free wooden token set down onto a felt-lined tray in a still room, one warm rounded contact absorbed by the felt beneath it. 0.4 seconds.

**C.** pm_dialog_scenario_pick — a palm pressing lightly onto a folded cloth square in a small room, the fabric's soft give audible close to the microphone, damped instantly. 0.4 seconds.

### `pm_dialog_briefing_in_v1` — 1.1 с, громкость 0.26
**Экран:** `app/ai_dialog_briefing.tsx` · Момент: показан бриф — кто вы в этой сцене и какая у вас задача.

**A.** pm_dialog_briefing_in — a single sheet of paper drawn out of a thin folder in a quiet room, the soft slide and faint edge-rustle close to the microphone, stopping cleanly as the sheet clears. 1.1 seconds.

**B.** pm_dialog_briefing_in — a folded letter opened out flat with two gentle motions in a still room, the paper's quiet unfolding the only sound, settling as it lies open. 1.1 seconds.

**C.** pm_dialog_briefing_in — a wooden clipboard set down onto a desk in a small carpeted room, one soft contact with the room's quiet size audible around it, no bounce or ring. 1.1 seconds.

### `pm_dialog_scene_enter_v1` — 1.3 с, громкость 0.30
**Экран:** `app/ai_dialog_session.tsx` · Момент: сцена диалога открылась, палитра места залила экран (кафе, аэропорт, отель).

**A.** pm_dialog_scene_enter — a heavy curtain of woven cloth drawn open in one slow sweep inside a modestly sized room, the fabric brushing against itself as it gathers to the side, revealing the room's natural air. 1.3 seconds.

**B.** pm_dialog_scene_enter — a wooden door eased fully open in a small room, the faint creak of the hinge and a soft gust of room air marking the space opening up, stopping gently at its widest. 1.3 seconds.

**C.** pm_dialog_scene_enter — a paper screen slid open along its wooden track in a quiet room, one smooth continuous motion ending in a soft stop, the room's ambience settling around it. 1.3 seconds.

### `pm_dialog_reply_sent_v1` — 0.3 с, громкость 0.22
**Экран:** `app/ai_dialog_session.tsx` · Момент: реплика пользователя отправлена собеседнику.

**A.** pm_dialog_reply_sent — a single fingertip flicking a thin paper card forward off a table edge in a quiet room, the brief release of paper into air captured close. One event, nothing more, sitting under a speaking voice. 0.3 seconds.

**B.** pm_dialog_reply_sent — a small breath pushed out through pursed lips, close-miked in a treated room, brief and directional like sending something away. Barely audible. 0.3 seconds.

**C.** pm_dialog_reply_sent — a folded paper note pushed across a wooden desk with one quick fingertip motion in a still room, the soft slide-and-stop audible close to the microphone. 0.3 seconds.

### `pm_dialog_reply_in_v1` — 0.35 с, громкость 0.20
**Экран:** `app/ai_dialog_session.tsx` · Момент: собеседник ответил, его реплика появилась на экране.

**A.** pm_dialog_reply_in — a thin paper card settling flat onto a wooden table after landing, the last soft flutter and contact captured close in a quiet room. Barely audible, felt more than heard. 0.35 seconds.

**B.** pm_dialog_reply_in — a light exhale received rather than given, the faint stir of air brushing past a close microphone in a treated room, gone almost instantly. 0.35 seconds.

**C.** pm_dialog_reply_in — a single soft knock of a fingertip against folded cloth in a small quiet room, damped immediately, a gentle arrival that stops dead on contact. 0.35 seconds.

### `pm_dialog_hint_used_v1` — 0.5 с, громкость 0.24
**Экран:** `app/ai_dialog_session.tsx` · Момент: пользователь открыл подсказку во время диалога.

**A.** pm_dialog_hint_used — a small wooden matchbox drawer slid open a short distance in a quiet room, the soft friction of wood on wood captured close, stopping cleanly. A single revealing gesture. 0.5 seconds.

**B.** pm_dialog_hint_used — a folded paper note unfolded once in a still room, the quiet crease-sound of paper opening the only event, settling flat immediately. 0.5 seconds.

**C.** pm_dialog_hint_used — a fingertip lifting the corner of a thin cloth cover in a small room, the soft drag of fabric against a wooden surface, damped as the corner settles back. 0.5 seconds.

### `pm_dialog_verdict_open_v1` — 1.5 с, громкость 0.42
**Экран:** `components/DialogVerdictScreen.tsx` · Момент: диалог закончился, полноэкранный вердикт раскрылся.

**A.** pm_dialog_verdict_open — a heavy paper scroll unrolled in one continuous motion across a wooden desk in a mid-sized room, the room's natural air audible as the paper settles flat with a soft final contact. 1.5 seconds.

**B.** pm_dialog_verdict_open — a wide wooden shutter opened fully in a room with generous natural reverb, the hinge's soft creak and a wash of room air marking a larger reveal than the in-call sounds. 1.5 seconds.

**C.** pm_dialog_verdict_open — a heavy cloth drape lifted and drawn fully back in a spacious quiet hall, the fabric's slow motion and the room's gentle natural echo giving the moment real scale. 1.5 seconds.

### `pm_dialog_score_tick_v1` — 0.18 с, громкость 0.18
**Экран:** `components/DialogVerdictScreen.tsx` · Момент: счётчик оценки диалога отсчитывает баллы вверх. Играет часто, подряд.

**A.** pm_dialog_score_tick — a single fingertip flicking the edge of a thin paper card once in a quiet room, a very short crisp contact that stops instantly, light enough for comfortable rapid repetition. 0.18 seconds.

**B.** pm_dialog_score_tick — one small wooden bead dropped a few millimeters onto a felt-lined tray in a still room, a brief soft knock damped immediately, suited to quick repetition. 0.18 seconds.

**C.** pm_dialog_score_tick — a fingertip tapping once against a dry wooden pencil in a quiet room, an extremely short contact with stopping dead on contact, light enough to repeat many times in a row. 0.18 seconds.

### `pm_dialog_victory_v1` — 1.8 с, громкость 0.54
**Экран:** `components/DialogVictoryCelebration.tsx` · Момент: диалог пройден блестяще, запускается празднование.

**A.** pm_dialog_victory — a wide wooden reed instrument breathed into with a full, warm exhale in a room with generous natural air, the tone blooming richly and tapering slowly into the room's own reverb. Celebratory but never harsh. 1.8 seconds.

**B.** pm_dialog_victory — a double handful of dry paper confetti released and falling through still air in a spacious room, the soft cascading rustle building and settling naturally, warm and human. 1.8 seconds.

**C.** pm_dialog_victory — two palms clapped together once with real fullness in a room with soft natural reverb, the contact rich and rounded, its tail dissolving into the room's own ambience. 1.8 seconds.

### `pm_dialog_retry_v1` — 0.9 с, громкость 0.32
**Экран:** `components/DialogVerdictScreen.tsx` · Момент: диалог не сдан, предлагается попробовать снова. Не должен унижать.

**A.** pm_dialog_retry — a soft wooden pencil eraser drawn once across paper in a quiet room, the gentle friction sound warm and unhurried, stopping cleanly with a sense of starting fresh rather than failing. 0.9 seconds.

**B.** pm_dialog_retry — a page turned back gently in a hushed reading room, the paper's soft settle as it returns to an earlier point, kind and unhurried, close-miked. 0.9 seconds.

**C.** pm_dialog_retry — a folded cloth smoothed flat with one slow palm pass in a still room, the fabric's quiet whisper conveying a calm reset rather than a setback. 0.9 seconds.
# 5. Карточки (flashcards)

### `pm_cards_catalog_open_v1` — 0.9 с, громкость 0.22
**Экран:** `app/flashcards.tsx` · Момент: открылся раздел карточек.

**A.** pm_cards_catalog_open — a slim wooden card box lid lifted off in one motion, a soft hollow knock as it clears the rim, recorded in a small quiet room with the microphone close to the box. The lid is set aside and the sound stops cleanly the instant it lands. A single event. 900 milliseconds.

**B.** pm_cards_catalog_open — a thick stack of index cards fanned open with one thumb across the top edge, a soft cascading rustle of stiff paper corners. The fan settles flat and the room goes still immediately after. One continuous gesture, nothing repeated. 900 milliseconds.

**C.** pm_cards_catalog_open — a flat drawer of a small wooden card catalog cabinet pulled open on brass runners, one smooth glide ending in a soft stop against the frame. Close-miked so the runner texture is audible under the wood. A single pull, damped immediately at the end. 900 milliseconds.

### `pm_cards_pack_open_v1` — 0.7 с, громкость 0.28
**Экран:** `app/flashcards_packs.tsx`, `app/flashcards_collection.tsx` · Момент: открылся пак карточек, колода развернулась.

**A.** pm_cards_pack_open — a sealed paper card pack's flap lifted and released in one motion, a short crisp tear-free peel followed immediately by a fan of thin cards spreading across a felt-free tabletop. Close-miked, dry and precise. Stops cleanly the instant the fan settles. 700 milliseconds.

**B.** pm_cards_pack_open — a small wooden card box hinge swinging open and a bundle of cards sliding out onto a wood surface in one motion, warm and soft-edged. Recorded in a small quiet room, the slide ending in a light settle. A single event. 700 milliseconds.

**C.** pm_cards_pack_open — a tin card case lid popped open with a small metallic click, followed by cards sliding against the tin's inner wall in one continuous motion. Close-miked so the thin metal resonance is present but brief. Stops cleanly, the tin resonance cut short by hand. 700 milliseconds.

### `pm_cards_swipe_know_v1` — 0.32 с, громкость 0.30
**Экран:** `app/flashcards_swipe.tsx` · Момент: карточка улетела вправо — «знаю».

**A.** pm_cards_swipe_know — a single playing card flicked off a stack across a smooth wooden tabletop, a short bright zip of card edge against wood ending the instant the card leaves the surface. Close-miked, one clean flick, nothing lingering after. 320 milliseconds.

**B.** pm_cards_swipe_know — a thick paper card slid fast off the top of a deck held in the palm, a soft quick friction whisper against skin then air. Recorded in a small quiet room, one motion, damped immediately as the card clears the hand. 320 milliseconds.

**C.** pm_cards_swipe_know — a thin brass shim flicked off the edge of a stack of coins, a short bright metallic slide ending in silence the moment it leaves contact. One strike, nothing more. Close-miked for a precise, weighted feel. 320 milliseconds.

### `pm_cards_swipe_learn_v1` — 0.34 с, громкость 0.26
**Экран:** `app/flashcards_swipe.tsx` · Момент: карточка улетела влево — «учу дальше». Не должно звучать как ошибка.

**A.** pm_cards_swipe_learn — a single playing card lifted and turned edge-first off a stack in one calm motion, a soft low zip of card against card, close-miked and neutral in tone, never sharp or descending. Stops the instant the card clears the deck. 340 milliseconds.

**B.** pm_cards_swipe_learn — a stiff paper card pulled sideways across a stack of others in a small quiet room, a warm muted paper-on-paper friction, rounded and even throughout. One even motion, settling into silence right after. 340 milliseconds.

**C.** pm_cards_swipe_learn — a smooth river stone slid a short distance across a bed of fine sand, a soft granular hiss that stays level in pitch throughout, close-miked. A single push, damped as the stone stops. 340 milliseconds.

### `pm_cards_flip_v1` — 0.28 с, громкость 0.26
**Экран:** `components/flashcards/`, `app/flashcards/PhraseCard.tsx` · Момент: карточка перевернулась и показала обратную сторону.

**A.** pm_cards_flip — a single playing card turned over on a hard tabletop with two fingers, a short crisp double-tap of card edge striking wood as it lands face up, close-miked. One strike, nothing more, decay stops immediately. 280 milliseconds.

**B.** pm_cards_flip — a stiff paper card flipped end over end and caught flat on a wooden surface, a soft muted paper slap in a small quiet room. A single event, landing flat and still. 280 milliseconds.

**C.** pm_cards_flip — a thin porcelain tile turned over and set down flat on a stone slab, a short clean ceramic tick as the edge makes contact. Close-miked, one motion, damped the instant it settles. 280 milliseconds.

### `pm_cards_editor_save_v1` — 0.8 с, громкость 0.34
**Экран:** `app/flashcards_card_editor.tsx` · Момент: пользователь сохранил свою карточку.

**A.** pm_cards_editor_save — a small wax seal stamp pressed firmly onto a folded paper card, a short warm press followed by the stamp lifting away clean, recorded close-miked in a silent room. A single event, nothing after the lift. 800 milliseconds.

**B.** pm_cards_editor_save — a wooden card box lid closed and pressed shut with the palm, a soft solid thud of wood meeting wood then stillness. One motion, damped immediately, warm and grounded. 800 milliseconds.

**C.** pm_cards_editor_save — a small brass clasp on a card case pressed closed, one firm metallic snap followed instantly by silence, close-miked so the mechanism detail is clear but brief. A single strike, nothing more. 800 milliseconds.

### `pm_cards_editor_delete_v1` — 0.6 с, громкость 0.30
**Экран:** `app/flashcards_card_editor.tsx` · Момент: карточка удалена.

**A.** pm_cards_editor_delete — a single playing card torn cleanly in half by hand, a short crisp rip through stiff paper, close-miked and dry. Stops the instant the tear completes, then silence. 600 milliseconds.

**B.** pm_cards_editor_delete — a thin wooden matchstick-sized offcut snapped in half between two fingers, a soft dry crack in a small quiet room. A single break, nothing lingers. 600 milliseconds.

**C.** pm_cards_editor_delete — a small ceramic tile dropped a short distance onto a stone surface and shattering into two or three pieces, a brief hard crack with immediate stop, close-miked. One event only. 600 milliseconds.

### `pm_cards_pack_created_v1` — 1.2 с, громкость 0.44
**Экран:** `app/community_pack_create.tsx`, `app/flashcards_my_packs.tsx` · Момент: пользователь собрал и опубликовал свой пак.

**A.** pm_cards_pack_created — a stack of stiff cards squared off by tapping the edges twice against a hard tabletop, then bound with a thin paper band pulled snug, close-miked and precise. Two taps and one wrap, ending in a clean settle. 1200 milliseconds.

**B.** pm_cards_pack_created — a small wooden box lid closed and a brass latch flipped down to secure it, warm layered sounds recorded in a small quiet room, one continuous sequence ending in stillness. 1200 milliseconds.

**C.** pm_cards_pack_created — a wax seal pressed onto a folded card followed by a short cascade of small quartz beads settling into a shallow tin dish, close-miked, layered but brief. A single sequence, damped at the end. 1200 milliseconds.

### `pm_cards_voice_preview_v1` — 0.5 с, громкость 0.24
**Экран:** `app/flashcards_voice_picker.tsx` · Момент: пользователь прослушивает вариант голоса озвучки.

**A.** pm_cards_voice_preview — a small glass bead dropped into an empty ceramic cup from a short height, one clean high tick with immediate stop, close-miked in a silent room. A single event, nothing more. 500 milliseconds.

**B.** pm_cards_voice_preview — a thin wooden dowel tapped once against a small hollow wooden box, a soft rounded knock that decays instantly. One strike, recorded close, a single clean tick. 500 milliseconds.

**C.** pm_cards_voice_preview — a single small coin flicked and landing flat on a thin sheet of steel, a short bright metallic tick damped immediately by a resting palm. One event only. 500 milliseconds.

### `pm_cards_mastered_v1` — 1.3 с, громкость 0.48
**Экран:** `app/flashcards_collection.tsx` · Момент: слово перешло в статус выученного, шкала силы слова заполнилась.

**A.** pm_cards_mastered — a short row of glass beads dropped one after another into a shallow ceramic bowl in quick succession, each tick slightly higher, ending with the bowl given one soft settling tap, close-miked in a silent room. 1300 milliseconds.

**B.** pm_cards_mastered — a small wooden box filled by pouring in a handful of smooth wooden beads in one steady stream, a warm rounded clatter that thins out and stops as the last bead settles. Recorded in a small quiet room. 1300 milliseconds.

**C.** pm_cards_mastered — a handful of small polished quartz stones poured from a cupped palm onto a thin sheet of steel, close-miked so each piece is distinct, rising then settling into stillness. A single pour. 1300 milliseconds.

# 6. Магазины, валюты и экономика

### `pm_shop_open_v1` — 1.0 с, громкость 0.26
**Экран:** `app/shop.tsx` · Момент: открылся магазин.

**A.** pm_shop_open — a glass display cabinet door opened on a small metal hinge, one smooth swing ending in a soft stop against its frame, close-miked in a silent room. A single motion, nothing after the stop. 1000 milliseconds.

**B.** pm_shop_open — a wooden shop counter drawer slid open on wooden runners, a warm low glide ending in a gentle settle, recorded in a small quiet room. One continuous pull. 1000 milliseconds.

**C.** pm_shop_open — a heavy brass shop-bell arm lifted and released once against a thin metal plate, a short bright ring damped by hand a moment after it starts, close-miked. A single strike. 1000 milliseconds.

### `pm_shop_item_select_v1` — 0.35 с, громкость 0.26
**Экран:** `app/shop.tsx`, `app/shards_shop.tsx` · Момент: выбран товар в витрине.

**A.** pm_shop_item_select — a fingertip tapped once against the inside of a glass display case, a short clean glass tick, close-miked in a silent room, damped the instant it lands. One event only. 350 milliseconds.

**B.** pm_shop_item_select — a small wooden token picked up and set back down once on a wooden shop counter, a soft rounded tap recorded close in a small quiet room. A single motion. 350 milliseconds.

**C.** pm_shop_item_select — a single coin tapped once against another coin held still in the palm, a short bright metallic click damped instantly by the hand. One strike, nothing more. 350 milliseconds.

### `pm_shards_spend_v1` — 0.7 с, громкость 0.36
**Экран:** `app/shards_shop.tsx` · Момент: осколки списаны за покупку, счётчик уменьшился.

**A.** pm_shards_spend — a small handful of thin glass shards swept off a steel tray in one motion, a short bright scatter that thins quickly and stops, close-miked in a silent room. A single sweep, nothing lingers. 700 milliseconds.

**B.** pm_shards_spend — a stack of thin wooden counting tiles pushed off the edge of a wooden tray in one motion, a soft clatter that falls away and stops. Recorded in a small quiet room, one continuous gesture. 700 milliseconds.

**C.** pm_shards_spend — a small pile of coins slid off a stone ledge into a felt-lined tin box, a brief metallic tumble ending in a muffled settle, close-miked. A single motion, damped at the end. 700 milliseconds.

### `pm_shards_earned_v1` — 0.9 с, громкость 0.44
**Экран:** `app/shards_shop.tsx`, начисления в игре · Момент: осколки начислены, счётчик вырос.

**A.** pm_shards_earned — a small handful of thin glass shards poured from a cupped palm onto a sheet of steel, close-miked so each individual piece is audible. Bright and granular, rising in density then settling into silence. Real material, a single pour. 900 milliseconds.

**B.** pm_shards_earned — a handful of smooth wooden beads poured from a small wooden scoop into a shallow wooden bowl, a warm rounded clatter that rises and settles, recorded in a small quiet room. A single pour. 900 milliseconds.

**C.** pm_shards_earned — a handful of small polished stones dropped from a short height into a shallow brass dish, a bright cascading patter that thins and stops, close-miked. One continuous pour, damped at the end. 900 milliseconds.

### `pm_coin_exchange_v1` — 1.0 с, громкость 0.40
**Экран:** `app/coin_exchange.tsx` · Момент: одна валюта обменена на другую, произошла конвертация.

**A.** pm_coin_exchange — a single coin dropped onto a small glass dish and immediately swapped for a second coin set down beside it, two close-miked ticks in quick succession in a silent room, ending in stillness. 1000 milliseconds.

**B.** pm_coin_exchange — a wooden token dropped into a shallow wooden tray followed at once by a second token lifted out and set on the counter, a warm double tap recorded in a small quiet room. 1000 milliseconds.

**C.** pm_coin_exchange — a brass coin struck once against a steel plate followed immediately by a second heavier coin set down beside it, a short bright-to-weighted pair of ticks, close-miked, ending cleanly. 1000 milliseconds.

### `pm_runes_balance_open_v1` — 0.8 с, громкость 0.26
**Экран:** `app/runes_wallet.tsx` · Момент: открылся кошелёк рун — только баланс и источники, без магазина.

**A.** pm_runes_balance_open — a small flat quartz stone lifted off a stack and turned once in the fingers before being set back down, a soft dry mineral click, close-miked in a silent room. One motion, damped the instant it settles. 800 milliseconds.

**B.** pm_runes_balance_open — a small wooden box lid lifted a short distance and held, a soft hollow creak-free knock as it clears the rim, recorded in a small quiet room. A single event, stopping cleanly. 800 milliseconds.

**C.** pm_runes_balance_open — a thin brass disc lifted off a stack and set down again on a stone slab, a short cool metallic tick, damped the instant it lands, close-miked. One strike, nothing more. 800 milliseconds.

### `pm_season_pass_open_v1` — 1.3 с, громкость 0.34
**Экран:** `app/season_pass.tsx`, `app/arena_season_pass.tsx` · Момент: открылся сезонный пропуск с дорожкой наград.

**A.** pm_season_pass_open — a folded paper ticket unfolded in one smooth motion and laid flat on a glass surface, a soft crisp paper unfurl ending in a light tap as it settles, close-miked in a silent room. 1300 milliseconds.

**B.** pm_season_pass_open — a long wooden ruler-like game board slid open across a wooden table in one continuous motion, a warm low glide ending in a gentle stop, recorded in a small quiet room. 1300 milliseconds.

**C.** pm_season_pass_open — a hinged tin case opened and a folded metal strip inside unfolding flat in one motion, a bright thin metallic unfurl ending in a soft settle, close-miked. A single continuous gesture. 1300 milliseconds.

### `pm_season_tier_unlock_v1` — 1.0 с, громкость 0.46
**Экран:** `app/season_pass.tsx` · Момент: открылся новый уровень сезонного пропуска, награда стала доступна.

**A.** pm_season_tier_unlock — a small brass latch on a glass case flipped open followed immediately by the lid lifting a short distance, two close-miked events in quick succession in a silent room, ending in stillness. 1000 milliseconds.

**B.** pm_season_tier_unlock — a small wooden box's clasp released and the lid pushed open by hand, a warm double motion of latch then wood recorded in a small quiet room, stopping cleanly. 1000 milliseconds.

**C.** pm_season_tier_unlock — a wax seal cracked open on a folded card followed at once by a single coin dropped beside it on a steel plate, a short layered sequence, close-miked, damped immediately after. 1000 milliseconds.

# 7. Профиль, прогресс и достижения

### `pm_achievements_open_v1` — 1.1 с, громкость 0.28
**Экран:** `app/achievements_screen.tsx` · Момент: открылась витрина достижений.

**A.** pm_achievements_open — a glass trophy case door opened on a small metal hinge, one smooth swing ending in a soft stop against its frame, close-miked in a silent room. A single motion, nothing after. 1100 milliseconds.

**B.** pm_achievements_open — a wooden display case with a sliding wooden panel drawn open in one continuous motion, a warm low glide ending in a gentle settle, recorded in a small quiet room. 1100 milliseconds.

**C.** pm_achievements_open — a hinged tin trophy box opened with a short metallic creak-free lift, close-miked, one continuous motion ending as the lid rests against its stop. 1100 milliseconds.

### `pm_achievement_card_reveal_v1` — 0.6 с, громкость 0.32
**Экран:** `app/achievements_screen.tsx` · Момент: карточка достижения перевернулась и показала полученную награду.

**A.** pm_achievement_card_reveal — a single card turned over on a hard tabletop with two fingers, a short crisp double-tap of card edge striking wood as it lands face up, close-miked. One motion, damped immediately. 600 milliseconds.

**B.** pm_achievement_card_reveal — a small wooden medallion turned face up on a wooden stand, a soft rounded knock as it settles into place, recorded in a small quiet room. A single event. 600 milliseconds.

**C.** pm_achievement_card_reveal — a thin porcelain medal flipped and set down on a stone slab, a short clean ceramic tick, close-miked, damped the instant it settles. One strike, nothing more. 600 milliseconds.

### `pm_achievement_locked_v1` — 0.4 с, громкость 0.22
**Экран:** `app/achievements_screen.tsx` · Момент: пользователь нажал на ещё не полученное достижение.

**A.** pm_achievement_locked — a fingertip tapped once against the outside of a sealed glass case, a short muted glass tick, damped the instant it lands, close-miked in a silent room. One event, nothing more. 400 milliseconds.

**B.** pm_achievement_locked — a small wooden latch tested once and found fixed, a soft dry knock against a locked wooden panel, recorded in a small quiet room. A single motion. 400 milliseconds.

**C.** pm_achievement_locked — a fingernail tapped once against a small closed tin box, a short dull metallic tick, close-miked, damped instantly. One strike, nothing more. 400 milliseconds.

### `pm_collectibles_open_v1` — 1.0 с, громкость 0.26
**Экран:** `app/collectibles_screen.tsx` · Момент: открылась коллекция собранных предметов.

**A.** pm_collectibles_open — a small glass display drawer slid open on smooth metal runners, one continuous glide ending in a soft stop, close-miked in a silent room. A single motion. 1000 milliseconds.

**B.** pm_collectibles_open — a wooden curio cabinet door opened on a small wooden hinge, a warm low creak-free swing ending in a gentle settle, recorded in a small quiet room. 1000 milliseconds.

**C.** pm_collectibles_open — a hinged tin collector's box lid lifted in one motion, a short bright metallic unlatch followed by a soft stop, close-miked. One continuous gesture. 1000 milliseconds.

### `pm_streak_stats_open_v1` — 0.9 с, громкость 0.26
**Экран:** `app/streak_stats.tsx` · Момент: открылась статистика ударного режима, календарь дней.

**A.** pm_streak_stats_open — a folded paper calendar card unfolded once on a glass tabletop, a short crisp paper unfurl ending in a light settle, close-miked in a silent room. A single motion. 900 milliseconds.

**B.** pm_streak_stats_open — a small wooden desk calendar block turned once to reveal a new page, a soft rounded wooden tick, recorded in a small quiet room. One event only. 900 milliseconds.

**C.** pm_streak_stats_open — a thin brass calendar plate flipped once against a stone base, a short cool metallic tick, damped the instant it lands, close-miked. A single strike. 900 milliseconds.

### `pm_stats_bar_fill_v1` — 0.5 с, громкость 0.26
**Экран:** `app/streak_stats.tsx`, `components/stats/` · Момент: столбик статистики вырастает до своего значения.

**A.** pm_stats_bar_fill — a thin stream of fine sand poured steadily into a narrow glass tube, close-miked so the grains are audible, rising evenly then stopping the instant the pour ends. A single continuous pour. 500 milliseconds.

**B.** pm_stats_bar_fill — a row of small wooden beads dropped one after another in quick even succession into a narrow wooden channel, a soft rising patter recorded in a small quiet room. One continuous sequence. 500 milliseconds.

**C.** pm_stats_bar_fill — fine quartz grit poured in a thin steady stream into a shallow brass groove, close-miked, a bright even hiss that stops cleanly the moment the pour ends. A single pour. 500 milliseconds.

### `pm_avatar_equip_v1` — 0.7 с, громкость 0.34
**Экран:** `app/avatar_select.tsx`, `app/avatar_dna_studio.tsx` · Момент: пользователь надел новый элемент внешности на аватар.

**A.** pm_avatar_equip — a small glass ornament piece set firmly into a fitted slot on a display stand, one clean click as it seats, close-miked in a silent room. A single event, damped immediately. 700 milliseconds.

**B.** pm_avatar_equip — a small wooden peg pressed firmly into a fitted hole in a wooden puzzle stand, a soft solid knock as it seats fully, recorded in a small quiet room. One motion only. 700 milliseconds.

**C.** pm_avatar_equip — a small brass fitting clicked firmly into place on a metal frame, a short precise mechanical snap, close-miked, stopping cleanly the instant it locks. A single strike. 700 milliseconds.

### `pm_avatar_studio_render_v1` — 1.0 с, громкость 0.30
**Экран:** `app/avatar_dna_studio.tsx` · Момент: новый образ аватара собрался и отрисовался.

**A.** pm_avatar_studio_render — several small glass pieces set down one after another onto a steel plate in quick succession, close-miked ticks rising then settling into one final firm placement. A single assembling sequence. 1000 milliseconds.

**B.** pm_avatar_studio_render — a few wooden blocks stacked quickly one on top of another on a wooden table, soft successive knocks ending with one final firm settle, recorded in a small quiet room. 1000 milliseconds.

**C.** pm_avatar_studio_render — a handful of small polished stones set down in quick succession onto a brass tray, close-miked, a short rising sequence ending in one final settled click. 1000 milliseconds.

### `pm_account_saved_v1` — 0.8 с, громкость 0.32
**Экран:** `app/account_details.tsx`, `components/account/NicknameEditModal.tsx` · Момент: данные профиля сохранены.

**A.** pm_account_saved — a small wax seal stamp pressed firmly once onto a folded paper card and lifted away clean, close-miked in a silent room. A single event, nothing after the lift. 800 milliseconds.

**B.** pm_account_saved — a small wooden drawer pushed firmly shut with the palm, a soft solid thud of wood meeting wood then immediate stillness, recorded in a small quiet room. One motion. 800 milliseconds.

**C.** pm_account_saved — a small brass clasp on a document case pressed closed, one firm metallic snap followed instantly by silence, close-miked. A single strike, nothing more. 800 milliseconds.
# 8. Соцчасть: клуб, лига, друзья, рефералы

### `pm_league_screen_open_v1` — 1.2 с, громкость 0.28
**Экран:** `app/league_screen.tsx`, `app/club_screen.tsx` · Момент: открылась таблица лиги, видно своё место.

**A.** pm_league_screen_open — a heavy oak drawer of a card catalogue pulled smoothly open on brass runners, close-miked in a quiet library. Wood sliding against wood, ending with the soft seat of the drawer front. Orderly and institutional, the sound of records being consulted. 1.2 seconds.

**B.** pm_league_screen_open — a stack of thick cotton-paper certificates laid down onto a leather desktop and squared with two taps of the fingers. Dense, dry, official. A single settling gesture, recorded very close. 1.2 seconds.

**C.** pm_league_screen_open — a bronze plaque lifted and set against a stone wall, the metal humming quietly for a moment after contact. Weighty and ceremonial, recorded in a small hall with just enough room around it to feel public. 1.2 seconds.

### `pm_league_rank_move_v1` — 0.5 с, громкость 0.30
**Экран:** `app/league_screen.tsx` · Момент: строка игрока переехала вверх или вниз в таблице.

**A.** pm_league_rank_move — a single brass name-plate slid one slot along the grooved rail of an old hotel key board, stopping against the next peg. Metal on metal, short travel, a firm stop. One movement, nothing more. 500 milliseconds.

**B.** pm_league_rank_move — a wooden peg lifted from one hole of a cribbage board and pressed into the next, close-miked so both the release and the seat are audible. Small, tactile, decisive. 500 milliseconds.

**C.** pm_league_rank_move — a magnetic tile repositioned on a steel scheduling board, the magnet breaking contact and grabbing again one row along. A short scrape and a confident click. 500 milliseconds.

### `pm_league_zone_enter_v1` — 0.8 с, громкость 0.36
**Экран:** `app/league_screen.tsx` · Момент: игрок попал в зону повышения — строка подсветилась.

**A.** pm_league_zone_enter — a taut steel guitar string touched at the twelfth fret and plucked so only the harmonic sounds, bright and weightless, ringing briefly above the instrument body. Lifting, clean, effortless. A single touch. 800 milliseconds.

**B.** pm_league_zone_enter — a brass ring dropped onto a marble ledge, spinning up in brightness for a moment before a hand stops it. Warm metal, upward energy, an ending that feels chosen rather than faded. 800 milliseconds.

**C.** pm_league_zone_enter — a small temple bowl struck once on its rim with a wooden mallet, the tone blooming upward and opening out. Recorded close in a quiet room so the bloom stays intimate. 800 milliseconds.

### `pm_league_zone_risk_v1` — 0.8 с, громкость 0.30
**Экран:** `app/league_screen.tsx` · Момент: игрок попал в зону вылета. Тревога без унижения.

**A.** pm_league_zone_risk — the lowest string of an upright bass plucked once and immediately palm-muted, leaving only the dark thud of the initial movement. Serious and grounded, sympathetic rather than punishing. One pluck. 800 milliseconds.

**B.** pm_league_zone_risk — a heavy woollen curtain drawn closed across a wooden rail, ending with the muffled knock of the leading edge meeting the frame. Soft, dimming, quietly final. 800 milliseconds.

**C.** pm_league_zone_risk — a bronze weight lowered onto a felt pad, the metal settling with a low sigh of displaced air. Weighty and grave, recorded close so it feels personal rather than dramatic. 800 milliseconds.

### `pm_friend_invite_sent_v1` — 0.7 с, громкость 0.32
**Экран:** `app/arena_invite.tsx`, `app/referrals.tsx` · Момент: приглашение другу отправлено.

**A.** pm_friend_invite_sent — a stiff paper envelope slid across a polished wooden table and released, the card gliding away and leaving the hand. Light, forward-moving, generous. A single send. 700 milliseconds.

**B.** pm_friend_invite_sent — a small wax-sealed note dropped into a brass letter slot, the flap swinging shut behind it with a soft double contact. Warm, human, on its way. 700 milliseconds.

**C.** pm_friend_invite_sent — a paper aeroplane launched from a hand, close-miked so the sharp release and the fading rush of air are both audible. Playful and buoyant, one throw. 700 milliseconds.

### `pm_friend_accepted_v1` — 1.0 с, громкость 0.42
**Экран:** `app/(tabs)/friends.tsx` · Момент: друг принял приглашение, связь установлена.

**A.** pm_friend_accepted — two matching brass tuning forks brought together until they touch, their tones merging into one steady shared note that fades naturally. Two things becoming one, warm and human. 1 second.

**B.** pm_friend_accepted — the clasp of a leather bracelet fastened around a wrist, the tongue seating into the buckle with a soft leather-and-metal click. Personal, tactile, quietly joyful. 1 second.

**C.** pm_friend_accepted — two hands clasping firmly in a greeting, close-miked so the skin contact and the small rustle of sleeves are both present. Human, warm, unmistakably a connection. 1 second.

### `pm_friend_high_five_v1` — 0.5 с, громкость 0.36
**Экран:** `app/(tabs)/friends.tsx` · Момент: пользователь отправил другу «дай пять».

**A.** pm_friend_high_five — two palms meeting hard in a single clap, recorded very close in a small room so the skin snap arrives before the room does. Bright, energetic, physical. One impact, nothing more. 500 milliseconds.

**B.** pm_friend_high_five — a flat hand slapped against a taut leather drum head, the head rebounding once and stopping. Warm, punchy, celebratory. 500 milliseconds.

**C.** pm_friend_high_five — a wooden clapper board snapped shut in one decisive movement, close-miked. Sharp, joyful, unmistakably two things meeting. 500 milliseconds.

### `pm_together_level_up_v1` — 1.4 с, громкость 0.50
**Экран:** `components/friends_together/` · Момент: уровень дружбы вырос.

**A.** pm_together_level_up — two steel strings tuned a fifth apart, both plucked at the same instant and allowed to ring together, their beating settling into agreement before the hand damps them. Shared, rising, distinctly about two people. 1.4 seconds.

**B.** pm_together_level_up — two ceramic cups touched together in a toast, then a third gentle contact, the porcelain ringing warmly over a low wooden table. Intimate, celebratory, real material. 1.4 seconds.

**C.** pm_together_level_up — two bronze bells of different sizes struck one after the other, their tones overlapping and blooming into a single warm mass before fading. Ceremonial without being loud. 1.4 seconds.

### `pm_referral_reward_v1` — 1.3 с, громкость 0.48
**Экран:** `app/referrals.tsx` · Момент: друг активировался, награда за приглашение выдана.

**A.** pm_referral_reward — a small drawstring pouch of coins emptied into an open palm, close-miked so the metal tumbles and settles into the skin. Abundant, warm, generous. A single pour. 1.3 seconds.

**B.** pm_referral_reward — a brass scale pan tipping as weights are added, the pan swinging down and the metal chiming as the arm comes to rest. Value arriving and being measured. 1.3 seconds.

**C.** pm_referral_reward — a wooden gift box lid lifted and set aside, followed by a single bright metallic ring from whatever lies inside. Anticipation resolved, recorded close in a quiet room. 1.3 seconds.

### `pm_tops_reveal_v1` — 1.1 с, громкость 0.34
**Экран:** `app/arena_tops.tsx` · Момент: открылась таблица лучших игроков, топ-3 подсветились.

**A.** pm_tops_reveal — three brass medals set down one after another onto a marble podium, each landing slightly brighter than the last, the third ringing on. Ceremonial, ordered, three distinct events. 1.1 seconds.

**B.** pm_tops_reveal — a velvet cloth pulled away from a trophy in one smooth movement, the fabric rushing off polished metal and the metal ringing faintly as it is exposed. An unveiling. 1.1 seconds.

**C.** pm_tops_reveal — a gong tapped very lightly with a felt mallet, then the sound opening outward in a small hall. Restrained grandeur, a single strike. 1.1 seconds.

---

# 9. Уроки: обвязка вокруг сессии

### `pm_lessons_list_open_v1` — 0.9 с, громкость 0.22
**Экран:** `app/lessons_list.tsx`, `app/(tabs)/lessons.tsx` · Момент: открылся список уроков, видна дорожка прогресса.

**A.** pm_lessons_list_open — a linen-bound book opened flat on a desk, the spine giving slightly and the pages settling. Quiet, scholarly, inviting. A single opening gesture, close-miked in a still room. 900 milliseconds.

**B.** pm_lessons_list_open — a folded paper map unfolded across a wooden table in one movement, the creases releasing as the sheet lies flat. A journey laid out. 900 milliseconds.

**C.** pm_lessons_list_open — a wooden shutter eased open on a quiet morning, the hinge turning softly and the panel resting against its stop. Something opening onto what comes next. 900 milliseconds.

### `pm_lesson_unlock_v1` — 1.1 с, громкость 0.46
**Экран:** `app/lessons_list.tsx` · Момент: следующий урок разблокирован, замок открылся.

**A.** pm_lesson_unlock — a brass padlock shackle springing free as the key turns, the mechanism releasing with a bright metallic snap and the body swinging loose. Unmistakably a lock giving way. One event. 1.1 seconds.

**B.** pm_lesson_unlock — the iron bolt of a heavy wooden door drawn back and the door easing off its latch, wood releasing wood. Substantial, satisfying, a threshold crossed. 1.1 seconds.

**C.** pm_lesson_unlock — a steel clasp on a travelling trunk flicked open, the sprung metal ringing briefly and the lid lifting a fraction. Bright release followed by weight moving. 1.1 seconds.

### `pm_lesson_locked_v1` — 0.45 с, громкость 0.24
**Экран:** `app/lessons_list.tsx` · Момент: пользователь нажал на закрытый урок.

**A.** pm_lesson_locked — a knuckle knocking twice on a thick closed door, the sound absorbed by the wood the material staying silent afterwards behind it. A boundary, stated plainly and without scolding. 450 milliseconds.

**B.** pm_lesson_locked — a padlock body bumped gently against its own hasp, the metal meeting metal and stopping dead because nothing opens. Short, inert, harmless. 450 milliseconds.

**C.** pm_lesson_locked — a fingertip pressed against a pane of thick glass, producing only a dull muted contact. Nothing gives. Recorded very close. 450 milliseconds.

### `pm_lesson_menu_open_v1` — 0.7 с, громкость 0.24
**Экран:** `app/lesson_menu.tsx` · Момент: открылось меню урока с выбором активностей.

**A.** pm_lesson_menu_open — a wooden fan of sample cards spread open in the hand, the slats separating with a soft ratcheting rustle and stopping. Options laid out. A single spread. 700 milliseconds.

**B.** pm_lesson_menu_open — a small brass-hinged writing box opened, the lid rising and the hinge easing to its stop. Tidy, purposeful, close-miked. 700 milliseconds.

**C.** pm_lesson_menu_open — a cloth roll of tools unrolled across a bench, the fabric releasing and the contents shifting quietly into view. Everything available at once. 700 milliseconds.

### `pm_theory_page_turn_v1` — 0.4 с, громкость 0.24
**Экран:** `app/lesson_theory_v2.tsx`, `app/lesson_help_theory_ui.tsx` · Момент: перелистнулась страница теории.

**A.** pm_theory_page_turn — a single sheet of heavy book paper turned and laid flat, the paper flexing through the air and settling against the page beneath. Recorded very close, one turn only. 400 milliseconds.

**B.** pm_theory_page_turn — a stiff card page of a photograph album lifted and dropped over, thicker and slower than ordinary paper, landing with a soft dry tap. 400 milliseconds.

**C.** pm_theory_page_turn — a fingertip drawn across the edge of a paper block to separate one sheet, then the sheet swinging over. Two small gestures inside one movement. 400 milliseconds.

### `pm_words_reveal_v1` — 0.5 с, громкость 0.28
**Экран:** `app/lesson_words.tsx` · Момент: показано значение нового слова.

**A.** pm_words_reveal — a brass lamp pull-chain drawn once, the click of the switch followed by the faint hum of a filament coming up to light. Understanding arriving. One pull. 500 milliseconds.

**B.** pm_words_reveal — a small paper flap lifted in a pop-up book to expose what is printed beneath, the paper releasing with a soft dry lift. Curiosity satisfied. 500 milliseconds.

**C.** pm_words_reveal — a match struck once and catching, the flare rising and steadying immediately. Light where there was none, recorded close in a quiet room. 500 milliseconds.

### `pm_verbs_form_correct_v1` — 0.45 с, громкость 0.34
**Экран:** `app/lesson_verbs.tsx`, `app/lesson_irregular_verbs.tsx` · Момент: верная форма неправильного глагола подтверждена.

**A.** pm_verbs_form_correct — a typewriter key struck once, the typebar hitting the platen with a crisp mechanical stamp and returning. Precise, correct, decisive. A single strike. 450 milliseconds.

**B.** pm_verbs_form_correct — a wooden letterpress block seated into its frame with a firm push, wood meeting wood and locking flush. Satisfying and exact. 450 milliseconds.

**C.** pm_verbs_form_correct — a brass stamp pressed onto a document and lifted away, the impact short and the metal ringing very faintly after. Authoritative, one press. 450 milliseconds.

### `pm_preposition_snap_v1` — 0.35 с, громкость 0.30
**Экран:** `app/preposition_drill.tsx` · Момент: предлог встал в правильный слот предложения.

**A.** pm_preposition_snap — two strong magnets snapping together across a short gap, the collision sharp and the metal ringing for an instant before stopping. Inevitable and exact. One snap. 350 milliseconds.

**B.** pm_preposition_snap — a hardwood puzzle piece pressed into its cut-out and seating flush, the fit tight enough to produce a small pop of trapped air. Deeply satisfying. 350 milliseconds.

**C.** pm_preposition_snap — the shackle of a small steel clip clicking closed over a ring, close-miked. Short, bright, mechanically certain. 350 milliseconds.

### `pm_mistake_practice_start_v1` — 1.0 с, громкость 0.28
**Экран:** `app/mistake_practice_session.tsx` · Момент: начата тренировка на своих ошибках. Тон поддерживающий, не карающий.

**A.** pm_mistake_practice_start — a soft cloth wiped once across a slate board, clearing it completely, ending with the cloth lifting away. A clean start offered without judgement. One stroke. 1 second.

**B.** pm_mistake_practice_start — the low string of a cello bowed once, very quietly, swelling gently and released. Warm, encouraging, patient. 1 second.

**C.** pm_mistake_practice_start — a wooden chair drawn up to a table and settled into place, close-miked. Sitting back down to work, unhurried and kind. 1 second.

### `pm_mistake_fixed_v1` — 0.9 с, громкость 0.42
**Экран:** `app/mistake_practice_session.tsx` · Момент: ранее допущенная ошибка исправлена — маленькое личное искупление.

**A.** pm_mistake_fixed — a guitar string that was buzzing against a fret suddenly seated correctly and ringing pure, the tone clearing and opening out. Something wrong becoming right. 900 milliseconds.

**B.** pm_mistake_fixed — a stuck brass mechanism freed with a small effort, the movement releasing and running smoothly, ending with a satisfied metallic settle. Warmer and fuller than an ordinary success. 900 milliseconds.

**C.** pm_mistake_fixed — a cracked ceramic bowl set down and ringing cleanly despite expectation, the tone holding warm and true. Quiet redemption, recorded close. 900 milliseconds.

---
# 10. Настройки, онбординг и системные экраны

### `pm_settings_toggle_on_v1` — 0.28 с, громкость 0.24
**Экран:** `app/(tabs)/settings.tsx` и все экраны настроек · Момент: переключатель включён.

**A.** pm_settings_toggle_on — a precision toggle switch on vintage studio hardware flicked upward, the internal spring passing its detent and seating firmly. Machined, confident, upward in feel. One movement, close-miked in a quiet room. 280 milliseconds.

**B.** pm_settings_toggle_on — a small brass catch pushed home on a wooden instrument case, the metal seating into its keeper with a bright short contact. Tactile and reassuring. 280 milliseconds.

**C.** pm_settings_toggle_on — a smooth stone dropped into a shallow cup and coming to rest, close-miked so the single contact reads as settling into place. Quiet and deliberate. 280 milliseconds.

### `pm_settings_toggle_off_v1` — 0.28 с, громкость 0.22
**Экран:** экраны настроек · Момент: переключатель выключен. Зеркало предыдущего звука.

**A.** pm_settings_toggle_off — the same precision hardware toggle flicked downward, the spring passing its detent and coming to rest lower, slightly duller and shorter than the upward throw. The exact mirror of switching on. 280 milliseconds.

**B.** pm_settings_toggle_off — a brass catch released and swinging free, the metal dropping away from its keeper with a soft downward contact. Something loosening. 280 milliseconds.

**C.** pm_settings_toggle_off — a stone lifted out of a shallow cup and set on the cloth beside it, the second contact softer than the first. Withdrawal rather than arrival. 280 milliseconds.

### `pm_theme_preview_v1` — 0.6 с, громкость 0.30
**Экран:** `app/settings_themes.tsx` · Момент: пользователь примеряет тему, палитра всего приложения меняется на лету.

**A.** pm_theme_preview — a sheet of coloured gel slid across the front of a studio lamp, the plastic gliding over the barn doors and stopping. The sound of light being changed. One pass, close-miked. 600 milliseconds.

**B.** pm_theme_preview — a wide brush loaded with wash drawn once across heavy watercolour paper, the bristles spreading and lifting away. Something being coloured in a single stroke. 600 milliseconds.

**C.** pm_theme_preview — a bolt of silk unrolled across a counter in one movement, the fabric releasing and settling flat. Smooth, luxurious, transformative. 600 milliseconds.

### `pm_theme_applied_v1` — 0.9 с, громкость 0.38
**Экран:** `app/settings_themes.tsx` · Момент: тема выбрана окончательно и применена.

**A.** pm_theme_applied — a heavy glass pane lowered into a frame and seating on its gasket, the glass ringing very faintly as it settles and the frame taking the weight. Final and clean. 900 milliseconds.

**B.** pm_theme_applied — a wooden lid pressed down onto a fitted box, the air escaping around the rim as it closes flush. Complete, considered, satisfying. 900 milliseconds.

**C.** pm_theme_applied — a bronze seal pressed into warm wax and lifted away, leaving the impression. Committed, ceremonial, one press. 900 milliseconds.

### `pm_language_selected_v1` — 1.0 с, громкость 0.40
**Экран:** `app/language_welcome.tsx`, `app/settings_language.tsx` · Момент: выбран язык изучения, вся жизнь в приложении переключилась.

**A.** pm_language_selected — a heavy brass key turned fully in an old door lock, the wards moving in sequence and the bolt throwing home with weight. A door to somewhere new, opened deliberately. 1 second.

**B.** pm_language_selected — a ship's brass bell struck once, clear and open, ringing out and beginning a passage. Recorded with a little air around it so it feels like a departure. 1 second.

**C.** pm_language_selected — a wooden stamp of a passport pressed onto a page and lifted, followed by the page settling. Official, momentous, one impression. 1 second.

### `pm_notifications_enabled_v1` — 0.8 с, громкость 0.34
**Экран:** `app/settings_notifications.tsx`, `components/NotificationPermissionModal.tsx` · Момент: пользователь разрешил уведомления.

**A.** pm_notifications_enabled — a small shopkeeper's counter bell tapped once, the dome ringing brightly and openly before fading. An open channel, friendly and unmistakable. One tap. 800 milliseconds.

**B.** pm_notifications_enabled — a brass hand-bell lifted and stopped mid-swing so it sounds only once, warm and rounded. Announcing without insisting. 800 milliseconds.

**C.** pm_notifications_enabled — a tuning fork struck on the knee and held to a wooden resonator, the note steadying and blooming quietly. Something switched on and listening. 800 milliseconds.

### `pm_privacy_consent_v1` — 0.9 с, громкость 0.30
**Экран:** `app/privacy_settings.tsx`, `app/privacy_screen.tsx` · Момент: пользователь принял или изменил настройку приватности.

**A.** pm_privacy_consent — a rubber date stamp pressed onto a document and rocked once, the ink pad giving under it, then lifted. Formal, plain, recorded on a wooden desk in a quiet office. 900 milliseconds.

**B.** pm_privacy_consent — a steel filing drawer pushed closed and its lock catching, close-miked. Records secured, unemotional and correct. 900 milliseconds.

**C.** pm_privacy_consent — a leather-bound ledger closed with both hands, the cover meeting the pages and the air pressing out. Matter settled. 900 milliseconds.

### `pm_survey_submitted_v1` — 1.1 с, громкость 0.40
**Экран:** `app/survey_screen.tsx`, `app/ideas_submit.tsx` · Момент: пользователь отправил опрос или идею.

**A.** pm_survey_submitted — a folded paper slip pushed through the slot of a wooden ballot box and dropping onto the papers already inside. Sent, received, counted. One posting. 1.1 seconds.

**B.** pm_survey_submitted — a pneumatic tube capsule seated and whisked away, the rush of air departing and thinning out. Something sent somewhere it will be read. 1.1 seconds.

**C.** pm_survey_submitted — a hand releasing a card into a suggestion box, followed by a soft ceramic chime of acknowledgement from the desk beside it. Grateful and warm. 1.1 seconds.

### `pm_onboarding_step_v1` — 0.4 с, громкость 0.26
**Экран:** `components/onboarding_aha/`, `components/OnboardingWelcomeSheet.tsx` · Момент: шаг онбординга сменился.

**A.** pm_onboarding_step — a slide advanced in a carousel projector, the mechanism cycling once and the new frame seating. Forward motion, mechanical and certain. One advance. 400 milliseconds.

**B.** pm_onboarding_step — a single footstep on a wooden stair tread, close-miked, the wood taking the weight and releasing. Progress, one step at a time. 400 milliseconds.

**C.** pm_onboarding_step — a wooden abacus bead pushed along its rod until it meets the next, stopping firmly. Counted, deliberate, small. 400 milliseconds.

### `pm_app_update_ready_v1` — 0.9 с, громкость 0.32
**Экран:** `components/UpdateModal.tsx`, `components/ReleaseNotesModal.tsx` · Момент: доступно обновление приложения.

**A.** pm_app_update_ready — a fresh sheet of paper pulled crisply from a ream and laid on the desk, followed by a light tap of a fingertip to square it. Something new arriving, tidy and unhurried. 900 milliseconds.

**B.** pm_app_update_ready — the split-flap of a station board turning over once to reveal a new line, the plastic clattering briefly and stopping. Fresh information. 900 milliseconds.

**C.** pm_app_update_ready — a package set down on a wooden doorstep, the box settling and the paper wrapping easing. Something waiting to be opened. 900 milliseconds.

---

# 11. Модалки, шторки и тосты

### `pm_modal_open_v1` — 0.45 с, громкость 0.22
**Экран:** любая модалка раскрылась поверх экрана (72 компонента).

**A.** pm_modal_open — a thin pane of glass lifted from a stack and raised into the air, the faint whisper of it separating and the air moving around it. Weightless, neutral, endlessly reusable under many different panels. 450 milliseconds.

**B.** pm_modal_open — a lightweight wooden tray lifted from a table, the contact releasing and the object rising. Small, plain, unobtrusive. 450 milliseconds.

**C.** pm_modal_open — a linen sheet lifted and billowing open once before settling, close-miked. Soft, airy, a layer arriving. 450 milliseconds.

### `pm_modal_close_v1` — 0.4 с, громкость 0.20
**Экран:** модалка закрылась, вернулся нижний экран.

**A.** pm_modal_close — the same thin glass pane lowered back onto its stack and released, the contact softer and shorter than the lift. The exact mirror of opening, quieter by design. 400 milliseconds.

**B.** pm_modal_close — a wooden tray set back down on the table, the contact absorbing immediately that stops dead on contact. Tidy, finished. 400 milliseconds.

**C.** pm_modal_close — a linen sheet dropping and settling flat, the air pressing out from underneath. A layer sinking away. 400 milliseconds.

### `pm_sheet_snap_v1` — 0.35 с, громкость 0.24
**Экран:** нижняя шторка встала в свою позицию после перетаскивания.

**A.** pm_sheet_snap — a drawer pushed the last centimetre until its soft-close mechanism takes over and pulls it firmly shut, ending in a dense wooden seat. A detent being found. One movement. 350 milliseconds.

**B.** pm_sheet_snap — a sliding wooden panel meeting its stop and being held there by a magnet, the contact firm and completely damped. 350 milliseconds.

**C.** pm_sheet_snap — a heavy book pushed into a shelf until it aligns flush with its neighbours, the spine seating against the backboard. 350 milliseconds.

### `pm_confirm_positive_v1` — 0.6 с, громкость 0.32
**Экран:** `components/ThemedConfirmModal.tsx`, `components/ThemedChoiceModal.tsx` · Момент: пользователь подтвердил безопасное действие.

**A.** pm_confirm_positive — a wooden gavel tapped once, lightly, on a felt-topped block, the wood speaking clearly and stopping. Agreed, decided, unfussy. A single tap. 600 milliseconds.

**B.** pm_confirm_positive — a brass switch on a control desk pressed and latching down, the mechanism confirming under the fingertip. Positive and certain. 600 milliseconds.

**C.** pm_confirm_positive — a ceramic cup set down onto a saucer squarely, the two pieces meeting with a clean bright contact. Everything in its place. 600 milliseconds.

### `pm_confirm_destructive_v1` — 0.7 с, громкость 0.34
**Экран:** `components/DeleteAccountConfirmModal.tsx` и другие удаления · Момент: подтверждено необратимое действие.

**A.** pm_confirm_destructive — a heavy steel safe door swinging closed and the bolt driving home, the impact deep and completely damped by mass. Irreversible, grave, respectful of the moment. One closure. 700 milliseconds.

**B.** pm_confirm_destructive — a thick stone slab lowered into place, the weight settling and the dust pressing out from underneath. Permanent and quiet. 700 milliseconds.

**C.** pm_confirm_destructive — a heavy hardwood lid dropped shut on a chest, the air forced out and the wood absorbing everything. Final, sober, without drama. 700 milliseconds.

### `pm_toast_neutral_v1` — 0.35 с, громкость 0.20
**Экран:** `components/InGameToast.tsx`, `components/CoachToast.tsx` · Момент: появилась нейтральная информационная плашка.

**A.** pm_toast_neutral — a paper note slid under a door and coming to rest on the floor, close-miked. Barely there, informative, interrupting nothing. One arrival. 350 milliseconds.

**B.** pm_toast_neutral — a small card placed face-down on a felt table, the contact almost entirely absorbed. Soft and unobtrusive. 350 milliseconds.

**C.** pm_toast_neutral — a leaf landing on still water, the surface accepting it with the faintest contact. Present but never demanding. 350 milliseconds.

---

# 12. Навигация и оболочка приложения

### `pm_tab_switch_v1` — 0.25 с, громкость 0.16
**Экран:** `app/(tabs)/_layout.tsx`, `app/TabSlider.tsx` · Момент: пользователь переключил вкладку. Очень тихий, звучит десятки раз за сессию.

**A.** pm_tab_switch — a fingernail brushing once across the edge of a stack of index cards, moving one divider aside. Almost inaudible, purely tactile, engineered to stay pleasant after hundreds of repeats in one session. 250 milliseconds.

**B.** pm_tab_switch — a felt-tipped lever nudged one notch along a track, the movement damped so only the travel is heard. Feather-light. 250 milliseconds.

**C.** pm_tab_switch — a fingertip tapping the taut skin of a small frame drum, muted immediately by the other hand. Soft, warm, gone at once. 250 milliseconds.

### `pm_nav_back_v1` — 0.3 с, громкость 0.18
**Экран:** возврат на предыдущий экран.

**A.** pm_nav_back — a page allowed to fall back over to the previous side, the paper travelling through the air and laying itself down. Retreating rather than advancing. One movement, very quiet. 300 milliseconds.

**B.** pm_nav_back — a drawer eased open a few centimetres and stopped, the reverse of closing, soft and short. 300 milliseconds.

**C.** pm_nav_back — a hand withdrawn across a fabric surface, the fibres releasing as it lifts away. Barely audible, directional. 300 milliseconds.

### `pm_pull_refresh_v1` — 0.5 с, громкость 0.24
**Экран:** пользователь потянул список вниз и запустил обновление.

**A.** pm_pull_refresh — a rubber band stretched between two fingers and released, the tension rising audibly and snapping back with a bright recoil. Elastic, physical, unmistakably pull and release. 500 milliseconds.

**B.** pm_pull_refresh — a roller blind pulled down a short distance and let go, the spring taking it back up with a soft mechanical whirr that stops quickly. 500 milliseconds.

**C.** pm_pull_refresh — a bow drawn back on a string and eased forward again without release, the wood and string creaking under tension then relaxing. Stored energy returned. 500 milliseconds.

### `pm_content_loaded_v1` — 0.4 с, громкость 0.20
**Экран:** данные подгрузились, скелетон сменился реальным содержимым.

**A.** pm_content_loaded — a photographic print lifted from the developing tray and laid on the bench, the surface arriving fully formed. Something becoming real, quietly. One placement. 400 milliseconds.

**B.** pm_content_loaded — a set of wooden letter tiles settling into their tray all at once, a brief soft clatter resolving into stillness. 400 milliseconds.

**C.** pm_content_loaded — a curtain of fine sand finishing its fall and the last grains settling, close-miked. Completion without announcement. 400 milliseconds.

---

# 13. Арена и самая редкая награда

Промпты для 29 звуков Арены лежат отдельно: `docs/arena/SOUND_PROMPTS.md`.
Ниже — единственный звук общего реестра, у которого нет файла.

### `pm_reward_vip_finale_v1` — 1.85 с, громкость 0.64
**Экран:** финальный аккорд VIP-распаковки — самое редкое и дорогое событие в приложении.

**A.** pm_reward_vip_finale — a large crystal chandelier drop struck once with a metal pick and left to ring in a marble hall, the tone opening enormously and hanging in the air before it decays. The rarest and most valuable sound in the entire product. One strike, allowed its full life. 1.85 seconds.

**B.** pm_reward_vip_finale — the lid of a heavy jewellery vault lifted, followed by a cascade of faceted gemstones poured onto a silver tray, each stone bright and distinct, the tray humming underneath. Overwhelming abundance, recorded close and clean. 1.85 seconds.

**C.** pm_reward_vip_finale — a deep temple gong struck with a soft mallet, the fundamental swelling from nothing into full bloom while a shower of small crystal pieces falls across a metal plate above it. Two layers, one event, unmistakably the top prize. 1.85 seconds.

---

# 14. Опциональный слой: озвучка нажатий

Владелец ранее убрал звук нажатий, оставив только вибрацию. Эти три звука —
на случай, если решите вернуть. Они самые тихие во всём документе.

### `pm_ui_press_v1` — 0.12 с, громкость 0.14
**Экран:** любое нажатие на кнопку или интерактив во всём приложении.

**A.** pm_ui_press — a fingertip pressing a silenced mechanical keyboard switch, heard through the keyboard body rather than through the air, the dampening rubber absorbing everything except the movement itself. Extremely short, tactile rather than sonic, and it must remain pleasant after ten thousand presses. 120 milliseconds.

**B.** pm_ui_press — a single drop of water landing on stretched leather, close-miked. Rounded, organic, almost entirely tone-free at all. 120 milliseconds.

**C.** pm_ui_press — a fingertip on a felt-covered button of vintage studio hardware, the felt swallowing the contact instantly. Barely there. 120 milliseconds.

### `pm_ui_tile_v1` — 0.14 с, громкость 0.13
**Экран:** нажатие на плитку/букву в игровых заданиях, где сейчас только вибрация.

**A.** pm_ui_tile — a wooden letter tile touched with a fingertip against a felt board, the wood speaking for an instant and the felt taking it away. Designed for rapid repeated tapping without fatigue. 140 milliseconds.

**B.** pm_ui_tile — a fingernail on a matte ceramic tile laid on cloth, a small dry contact that stops dead on contact. 140 milliseconds.

**C.** pm_ui_tile — a bone domino nudged where it lies on green baize, the piece shifting a millimetre and stopping. 140 milliseconds.

### `pm_ui_disabled_v1` — 0.2 с, громкость 0.16
**Экран:** нажатие на заблокированный элемент — ничего не произойдёт.

**A.** pm_ui_disabled — a fingertip pressing a button that has already bottomed out, meeting solid resistance and producing only a dull inert contact. Nothing gives, nothing moves, stated without scolding. 200 milliseconds.

**B.** pm_ui_disabled — a knuckle tapped on a sandbag, the impact absorbed completely coming to rest immediately. Soft and harmless. 200 milliseconds.

**C.** pm_ui_disabled — a wooden peg pressed against a hole that is already filled, meeting the blockage and stopping dead. 200 milliseconds.

---
