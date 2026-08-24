# Phraseman — полная озвучка приложения: аудит и промпты

Дата: 2026-08-24 · **Редакция 3**
Генератор: **Adobe Firefly Sounds**
Звуковая система: **«Королевская академия»** (`docs/SOUND_DESIGN_AUDIT_2026-05-18.md`)
Эталон манеры промптов: `docs/design/CELEBRATION_SOUND_PROMPTS.md`
Реестр событий: `modules/audio/sound_events.ts`

---

## Звуковая система приложения

Все 60 работающих звуков приложения сделаны в системе **«Королевская академия»**.
Новые звуки пишутся в ней же — чтобы ничего не выбивалось из семейства.

**Характер:** умное, премиальное, тёплое, чуть магическое. Не аркадное.

| Инструмент | Для чего |
|---|---|
| Челеста, стеклянные гармоники | осколки, валюта, знание, маленькие вспышки |
| Арфа, пиццикато струнных | верный ответ, карточка, сохранение, лёгкая награда |
| Тёплые струнные | завершение урока, задача дня, спокойная радость |
| Валторна, мягкая медь, хоровой пэд | **только** редкие церемонии: уровень, лига, премиум |
| Низкие струнные, кларнет, фагот | предупреждение и ошибка — без наказующего тона |
| Литавры, малый барабан | очень дозированно: арена, ранг, дуэль |

**Фирменный мотив: три ноты, восходящее движение с мягким разрешением.**

| Масштаб | Длительность | Где |
|---|---|---|
| Микро | 120–300 мс | верный ответ, шаг, переключатель |
| Награда | 600–1200 мс | покупка, задача закрыта, слово выучено |
| Церемония | 1500–4000 мс | план пройден, уровень, VIP |

Мотив прямо назван в 26 ключевых промптах — там, где он обязан прозвучать.

---

## Правила системы (из аудита проекта)

1. Звук только за смысл, не за механику. Тап сам по себе не звучит.
2. Редкие события звучат богаче, частые — тише и короче.
3. Ошибка не унижает. Никаких резких сигналов отказа.
4. Звук приложения отделён от произношения фраз.
5. Пока звучит речь — интерфейсные звуки приглушаются или откладываются.
6. Наградные звуки не наслаиваются: работает очередь и приоритет.
7. **Волны громкости.** В длинных последовательностях звуки идут волнами:
   заметные — тише — заметные. Ухо получает передышку. Не делать всё
   одинаково громким.

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

Три варианта:
- **A — интерфейсный.** Минимализм, чистота, ощущение дорогого софта.
- **B — игровой.** Теплее, ближе к текущим наградным звукам приложения.
- **C — кинематографичный.** Премиальная подача, слой воздуха и веса.

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

### Эталон плотности — экран завершения урока

`components/feedback/ResultsSequence.tsx` и таймлайн в
`components/feedback/results_sequence_motion_plan.ts`: медаль → звёзды по одной →
старт XP-каунтера → тики → завершение → показ награды → распаковка подарка →
множитель → апгрейд → финальный аккорд. Эту плотность документ распространяет
на остальное приложение.

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

Поэтому основные разделы дают плотность **по смыслу**, а озвучка нажатий вынесена
в раздел 14 отдельно — три звука на всё приложение, включаем только по решению
владельца.

---

## С чего начать

1. **Арена (29)** — код уже расставлен и ждёт файлов
2. **Пейволы и покупки (12)** — успешная оплата без звука читается как сбой
3. **Модалки, тосты, навигация (10)** — закрывают 72 экрана малым набором
4. **Персональный план (12)** — целый продукт, сейчас полностью немой
5. **MAX и Диалоги (23)** — тихие звуки под живую речь
6. **Остальное** — карточки, магазины, профиль, лига, уроки, настройки
7. **Слой нажатий (3)** — только по решению владельца

> ⚠️ **Промпты Арены требуют перевода в эту систему.** Файл
> `docs/arena/SOUND_PROMPTS.md` написан в старой манере (синусоиды и
> синтезаторы) — если генерировать по нему, 29 звуков Арены выпадут из
> семейства «Королевской академии». Скажите — переведу.

---
# 1. Персональный план

Инструменты раздела: **арфа и пиццикато** для шагов, **тёплые струнные** для
готовности плана, **челеста** для прогресса, **валторна** для финала плана.

---

### `pm_plan_setup_open_v1` — 1.1 с, громкость 0.24
**Экран:** `app/personal_plan_setup.tsx` · Момент: открылся мастер настройки плана, пользователь впервые видит вопросы о своей цели.

**A.** pm_plan_setup_open — quiet interface opening for a personal study-plan wizard in a language app, played as the first configuration question appears. Warm strings fade in from silence over 700 milliseconds, then a single celesta note settles on top like a page being laid out. 1.1 seconds, calm and inviting, expensive restraint, tail kept short.

**B.** pm_plan_setup_open — gentle opening cue for a study-plan builder in a mobile learning app. Soft harp chord rolled slowly upward, a light glass overtone resting above it, no urgency in the movement. 1.1 seconds, welcoming, unhurried, in the family of existing app-open cues.

**C.** pm_plan_setup_open — cinematic entrance to a personalised learning plan in a premium education app. Distant string pad swelling gently with a single clear bell tone emerging at the peak. 1.1 seconds, spacious, refined, controlled decay.

### `pm_plan_setup_step_v1` — 0.36 с, громкость 0.26
**Экран:** `app/personal_plan_setup.tsx` · Момент: пользователь ответил на один вопрос настройки, мастер перелистнулся на следующий шаг.

**A.** pm_plan_setup_step — precise interface advance for moving to the next question in a study-plan wizard. The signature motif at micro scale: two quick pizzicato string notes stepping up, the second resolving immediately. 360 milliseconds, dry, neutral, progress without celebration.

**B.** pm_plan_setup_step — light step cue for advancing through a setup flow in a mobile learning app. Single harp pluck with a small upward lift and a soft glass tap behind it. 360 milliseconds, warm, tidy, repeatable.

**C.** pm_plan_setup_step — refined transition between wizard steps in a premium app. Muted celesta note with a faint breath of air beneath it, moving forward and settling at once. 360 milliseconds, elegant, barely present.

### `pm_plan_ready_v1` — 1.6 с, громкость 0.46
**Экран:** `app/personal_plan.tsx` · Момент: план собран и впервые показан пользователю целиком.

**A.** pm_plan_ready — premium interface resolution for a personalised study plan being fully assembled and revealed. The signature three-note motif at reward scale on celesta, the third note landing a fourth above while warm strings bloom underneath and hold. 1.6 seconds, reassuring, confident, clean tail.

**B.** pm_plan_ready — warm reveal cue for a completed learning plan in a mobile app. Harp arpeggio rising through six notes into a soft sustained chord with a light gold shimmer above it. 1.6 seconds, optimistic, generous, encouraging.

**C.** pm_plan_ready — cinematic reveal of a learning roadmap in a premium app. Low strings swell for 600 milliseconds, a single soft horn note enters at the peak, and a descending celesta figure sparkles across the resolution. 1.6 seconds, hopeful, majestic yet restrained.

### `pm_plan_theory_open_v1` — 0.9 с, громкость 0.20
**Экран:** `app/personal_plan_theory.tsx` · Момент: открылась карточка теории перед упражнениями.

**A.** pm_plan_theory_open — quiet interface cue for a theory card opening before exercises in a language app. Single sustained string note fading in with a faint celesta touch at 600 milliseconds, as though a page settles into focus. 900 milliseconds, restrained, contemplative.

**B.** pm_plan_theory_open — gentle study-mode cue for a grammar explanation in a mobile learning app. Soft harp harmonic with a warm low pad breathing underneath. 900 milliseconds, cosy, calm, inviting attention without demanding it.

**C.** pm_plan_theory_open — cinematic focus-in for a theory panel in a premium education app. Low airy string bed with a distant glass tone rising slowly through it. 900 milliseconds, thoughtful, spacious, short tail.

### `pm_plan_exercise_in_v1` — 0.3 с, громкость 0.22
**Экран:** `app/personal_plan_exercise.tsx` · Момент: новое упражнение выезжает на экран.

**A.** pm_plan_exercise_in — subtle interface transition for a new exercise card sliding into view. Quick harp harmonic sweeping upward and landing on a single quiet note. 300 milliseconds, light, unobtrusive, clean.

**B.** pm_plan_exercise_in — light card-in cue for a new practice task in a mobile learning app. Soft pizzicato note with a small breath of air arriving with it. 300 milliseconds, friendly, snappy.

**C.** pm_plan_exercise_in — refined entrance for an exercise panel in a premium app. Faint string swell resolving to a muted celesta touch. 300 milliseconds, smooth, elegant, no tail.

### `pm_plan_exercise_transition_v1` — 0.55 с, громкость 0.24
**Экран:** `app/personal_plan_exercise_transition.tsx` · Момент: промежуточный экран между двумя упражнениями, короткая передышка.

**A.** pm_plan_exercise_transition — interface breather between two exercises in a study plan. Two celesta notes falling a gentle third with warm strings easing beneath them. 550 milliseconds, neutral, restful, signalling a pause rather than an ending.

**B.** pm_plan_exercise_transition — warm interlude between practice tasks in a mobile learning app. Descending harp pair with a soft pad releasing behind them. 550 milliseconds, relaxed, kind.

**C.** pm_plan_exercise_transition — cinematic exhale between exercises in a premium learning flow. Low strings settling downward with a faint woodwind breath over them. 550 milliseconds, calm, breathing, short tail.

### `pm_plan_quiz_start_v1` — 1.0 с, громкость 0.28
**Экран:** `app/personal_plan_quiz.tsx` · Момент: начинается проверочный квиз плана.

**A.** pm_plan_quiz_start — focused interface cue announcing a knowledge check inside a study plan. Two string notes tightening upward with a single clear celesta strike at the peak. 1 second, attentive, precise, communicating focus without pressure.

**B.** pm_plan_quiz_start — quiz-start signal for a mobile language learning app. Rising harp figure of four notes with a bright bell landing at the top. 1 second, energetic yet friendly, no aggression.

**C.** pm_plan_quiz_start — cinematic gathering before a comprehension test in a premium app. Soft low string pulse building for 700 milliseconds, then a clean horn note marking the start. 1 second, composed, purposeful.

### `pm_plan_task_done_v1` — 1.2 с, громкость 0.48
**Экран:** `app/personal_plan_task_done.tsx` · Момент: задача дня в плане закрыта.

**A.** pm_plan_task_done — confident completion tone for finishing a daily task in a study plan. The signature motif at reward scale on celesta, resolving onto warm strings that hold briefly and release. 1.2 seconds, satisfying, premium, tail controlled.

**B.** pm_plan_task_done — warm task-complete cue for a mobile learning app. Harp run of four rising notes with a light glass sparkle on the final one. 1.2 seconds, rewarding, cheerful, not a full fanfare.

**C.** pm_plan_task_done — cinematic small triumph for a completed study task. Warm string swell with a single clear bell resolving above and a soft low pulse underneath. 1.2 seconds, dignified, brief tail.

### `pm_plan_streak_step_v1` — 0.42 с, громкость 0.30
**Экран:** `app/personal_plan.tsx` · Момент: шкала прогресса плана делает шаг вперёд, один день закрашивается.

**A.** pm_plan_streak_step — progress-step cue for a study-plan bar advancing one segment. Single celesta note struck cleanly with a faint string tone locking in behind it. 420 milliseconds, precise, satisfying, a slot filled.

**B.** pm_plan_streak_step — warm progress notch for a streak bar filling in a mobile app. Bright pizzicato note with a soft glass overtone above. 420 milliseconds, snappy, rewarding.

**C.** pm_plan_streak_step — refined advance on a progress track in a premium learning app. Muted bell tone with a low warm bloom underneath. 420 milliseconds, weighty for its size, quick decay.

### `pm_plan_complete_v1` — 2.2 с, громкость 0.58
**Экран:** `app/personal_plan_complete.tsx` · Момент: весь персональный план пройден до конца, крупная церемония.

**A.** pm_plan_complete — premium ceremony for completing an entire personalised study plan. The signature motif at ceremony scale: celesta states the three notes, warm strings answer underneath, and a soft horn carries the resolution while glass harmonics shimmer above. 2.2 seconds, earned and expensive, no muddiness, tail kept clean.

**B.** pm_plan_complete — celebratory finale for finishing a full learning plan in a mobile app. Harp and bell fanfare rising in two waves, a warm brass note landing on the resolution with a gold shimmer trailing. 2.2 seconds, joyful, generous, never noisy.

**C.** pm_plan_complete — cinematic ceremony marking the end of a long learning journey. Horn and string swell with a choir pad opening behind it, a single soft timpani stroke on the downbeat, and a celesta cascade resolving above. 2.2 seconds, majestic, controlled decay.

### `pm_plan_thank_you_v1` — 1.5 с, громкость 0.34
**Экран:** `app/personal_plan_thank_you.tsx` · Момент: экран благодарности после плана, тёплое личное прощание.

**A.** pm_plan_thank_you — warm closing tone for a thank-you screen after a study plan ends. Two celesta notes settling downward onto a held string fifth that fades naturally. 1.5 seconds, sincere, understated, no celebration energy.

**B.** pm_plan_thank_you — gentle outro for a farewell screen in a mobile learning app. Soft harp figure of three descending notes with a warm rounded tail. 1.5 seconds, affectionate, calm.

**C.** pm_plan_thank_you — cinematic warm farewell in a premium education app. Distant string pad with a single glass tone fading slowly into air. 1.5 seconds, tender, spacious, unhurried.

### `pm_plan_sunset_warning_v1` — 0.8 с, громкость 0.30
**Экран:** `app/personal_plan_sunset_guard.tsx` · Момент: предупреждение, что план скоро закроется.

**A.** pm_plan_sunset_warning — restrained caution tone for a study plan about to expire. Two low clarinet notes falling a minor third with strings dimming beneath them. 800 milliseconds, serious yet sympathetic, informing rather than punishing.

**B.** pm_plan_sunset_warning — gentle heads-up cue for an expiring plan in a mobile learning app. Low bassoon note with a soft downward bend and a muted bell behind it. 800 milliseconds, warm, cautionary, kind.

**C.** pm_plan_sunset_warning — cinematic soft warning for a fading deadline in a premium app. Low strings with a single woodwind breath drifting downward and a faint distant bell. 800 milliseconds, melancholic, dignified, short tail.

---

# 2. Пейволы, подписка и покупки

Инструменты раздела: **тёплые струнные и мягкая медь** для успешной покупки,
**арфа** для выбора и подтверждений, **низкие струнные и кларнет** для отказов.
Самая денежная часть приложения — здесь звук обязан ощущаться дорого.

---

### `pm_paywall_present_v1` — 1.3 с, громкость 0.30
**Экран:** `app/paywall_a.tsx` … `paywall_g.tsx` · Момент: пейвол выехал на экран, пользователь впервые видит предложение подписки.

**A.** pm_paywall_present — refined entrance for a premium subscription offer sliding onto the screen. Warm strings open slowly from silence, a single celesta note resting on top at 900 milliseconds like an invitation being extended. 1.3 seconds, understated and expensive, never a sales pitch.

**B.** pm_paywall_present — inviting reveal for a premium upgrade screen in a mobile app. Soft harp roll rising into a warm sustained pad with a light gold shimmer on the final note. 1.3 seconds, generous, friendly.

**C.** pm_paywall_present — cinematic curtain-lift for a premium offer in a polished app. Wide string swell with distant horn warmth and a clean bell tone rising through it. 1.3 seconds, luxurious, restrained, short controlled tail.

### `pm_paywall_plan_select_v1` — 0.4 с, громкость 0.26
**Экран:** пейволы · Момент: пользователь выбрал один из тарифов, карточка тарифа подсветилась.

**A.** pm_paywall_plan_select — precise selection cue for choosing a subscription tier. Single pizzicato string note with a small upward lift and an immediate clean stop. 400 milliseconds, decisive, neutral, confirming without celebrating.

**B.** pm_paywall_plan_select — warm pick cue for selecting a pricing plan in a mobile app. Rounded harp pluck with a soft glass tap underneath. 400 milliseconds, satisfying, friendly.

**C.** pm_paywall_plan_select — refined lock-in for a chosen premium tier. Muted celesta note with a faint low resonance blooming under it. 400 milliseconds, weighty, confident.

### `pm_paywall_trial_highlight_v1` — 0.7 с, громкость 0.30
**Экран:** пейволы · Момент: подсветился блок бесплатного пробного периода, ключевой аргумент предложения.

**A.** pm_paywall_trial_highlight — attention cue for a free-trial badge illuminating on a subscription screen. Rising glass harmonic resolving onto a single bright celesta note with warm strings breathing behind. 700 milliseconds, optimistic, drawing the eye gently.

**B.** pm_paywall_trial_highlight — bright sparkle for a free-trial offer lighting up in a mobile app. Quick harp glissando with a bell overtone landing at the top. 700 milliseconds, cheerful, inviting.

**C.** pm_paywall_trial_highlight — cinematic glow for a trial-period highlight. Airy shimmer rising over a soft string pad with a faint glass ring at the peak. 700 milliseconds, elegant, generous, brief tail.

### `pm_purchase_start_v1` — 0.6 с, громкость 0.32
**Экран:** пейволы, `app/shop.tsx`, `app/shards_shop.tsx` · Момент: пользователь подтвердил покупку, ушёл запрос в магазин приложений.

**A.** pm_purchase_start — focused commitment cue for a purchase request being submitted. Two string notes stepping upward with a low pulse beneath, communicating that something real is now in motion. 600 milliseconds, serious, forward-moving.

**B.** pm_purchase_start — confirm-and-send cue for initiating a purchase in a mobile app. Bright harp pluck with an upward bend and a soft air movement trailing away. 600 milliseconds, energetic, warm.

**C.** pm_purchase_start — cinematic commit for a transaction being sent in a premium app. Low string swell with an airy lift departing from it. 600 milliseconds, weighty, decisive, no long tail.

### `pm_purchase_success_v1` — 1.7 с, громкость 0.56
**Экран:** пейволы, магазины · Момент: покупка прошла успешно, доступ выдан.

**A.** pm_purchase_success — premium confirmation for the instant a subscription purchase completes. The signature three-note motif at reward scale: two celesta notes rising, the third landing a fourth above on warm strings that bloom underneath and hold, with a single soft harp glissando filling the gap between them. 1.7 seconds, warm and expensive, tail controlled and clean.

**B.** pm_purchase_success — warm reward cue for a completed premium purchase in a mobile learning app. Bright glass harmonic on the downbeat, harp arpeggio rising through the middle 700 milliseconds, resolving on a soft horn note with gold shimmer above. 1.7 seconds, generous, celebratory.

**C.** pm_purchase_success — cinematic grant-of-access moment in a premium education app. Low warm strings swell from silence for 500 milliseconds, a single soft brass note enters at the peak, and a descending celesta figure sparkles across the resolution. 1.7 seconds, majestic yet restrained.

### `pm_purchase_restored_v1` — 1.0 с, громкость 0.38
**Экран:** `app/manage_subscription.tsx` · Момент: покупки восстановлены, доступ вернулся.

**A.** pm_purchase_restored — calm confirmation for restored purchases returning access. Two celesta notes rising a fourth onto a softly held string tone. 1 second, reassuring, quieter and more matter-of-fact than a fresh purchase.

**B.** pm_purchase_restored — friendly reconnection cue for restoring an existing subscription. Warm harp pair with a light bell confirmation above. 1 second, comforting, familiar.

**C.** pm_purchase_restored — cinematic quiet return of premium access. Soft string warmth fading in beneath a single clean glass note. 1 second, gentle, dignified, short tail.

### `pm_purchase_failed_v1` — 0.7 с, громкость 0.30
**Экран:** пейволы, магазины · Момент: оплата не прошла, показана ошибка. Не должен звучать как наказание.

**A.** pm_purchase_failed — restrained failure tone for a declined payment. Two low clarinet notes falling a minor third with strings easing down behind them. 700 milliseconds, calm, informative, entirely free of any harsh sting.

**B.** pm_purchase_failed — gentle setback cue for a failed transaction in a mobile app. Low bassoon note with a soft downward bend and a muted pad releasing. 700 milliseconds, warm, understanding.

**C.** pm_purchase_failed — cinematic soft decline in a premium app. Low strings deflating slowly with a faint woodwind breath over them. 700 milliseconds, sympathetic, dignified, brief tail.

### `pm_premium_modal_open_v1` — 1.0 с, громкость 0.28
**Экран:** `app/premium_modal.tsx`, `app/premium_modal_v2.tsx` · Момент: модалка премиума раскрылась поверх текущего экрана.

**A.** pm_premium_modal_open — interface bloom for a premium modal expanding over the current screen. Sustained string note opening upward with a faint high glass shimmer arriving at 700 milliseconds. 1 second, spacious, refined, a layer of glass sliding into place.

**B.** pm_premium_modal_open — warm panel-open cue for a premium offer popup. Rising harp figure with a bell overtone and a light breath of air. 1 second, welcoming, rounded, unhurried.

**C.** pm_premium_modal_open — cinematic reveal for a premium overlay rising into view. Airy upward sweep with a distant warm pad settling beneath a clean bell tone. 1 second, luxurious, no long tail.

### `pm_subscription_manage_open_v1` — 0.8 с, громкость 0.22
**Экран:** `app/manage_subscription.tsx` · Момент: открылся экран управления подпиской.

**A.** pm_subscription_manage_open — neutral opening for a subscription management screen. Single mid string tone fading in with a muted celesta touch. 800 milliseconds, businesslike, no emotional colour.

**B.** pm_subscription_manage_open — plain warm panel open for an account settings page. Soft harp note with a light pad behind it. 800 milliseconds, calm, functional.

**C.** pm_subscription_manage_open — cinematic quiet entrance to an account view. Low string bed with a faint metallic sheen fading in. 800 milliseconds, understated, premium.

### `pm_promo_code_applied_v1` — 1.1 с, громкость 0.44
**Экран:** `app/promo_code_entry.tsx` · Момент: промокод принят, бонус начислен.

**A.** pm_promo_code_applied — bright confirmation for a valid promo code being accepted. Quick ascending celesta triplet resolving onto a sparkling high note with warm strings arriving underneath. 1.1 seconds, delightful, a lock clicking open.

**B.** pm_promo_code_applied — playful reward cue for redeeming a promo code in a mobile app. Cheerful harp run of four notes ending on a bright glass ping. 1.1 seconds, warm, generous.

**C.** pm_promo_code_applied — cinematic small windfall for a successfully redeemed code. Rising string air with a clean bell strike and a light celesta sparkle falling after it. 1.1 seconds, elegant, rewarding.

### `pm_promo_code_rejected_v1` — 0.6 с, громкость 0.28
**Экран:** `app/promo_code_entry.tsx` · Момент: промокод не подошёл.

**A.** pm_promo_code_rejected — soft rejection for an invalid promo code. Single low string note with a quick downward drop and immediate damping. 600 milliseconds, neutral, informative, free of blame.

**B.** pm_promo_code_rejected — mild decline tone for a code that does not work. Short muted clarinet note with a small deflating bend. 600 milliseconds, soft, harmless.

**C.** pm_promo_code_rejected — cinematic quiet dismissal of a rejected code. Low woodwind tone dropping gently with a faint dull settle. 600 milliseconds, subdued, respectful.

### `pm_billing_issue_v1` — 0.9 с, громкость 0.32
**Экран:** `components/BillingIssueToastHost.tsx` · Момент: всплыла плашка о проблеме с оплатой подписки.

**A.** pm_billing_issue — serious but calm alert for a billing problem notification. Two sustained low string tones with a slow beat between them, gaining attention through weight rather than brightness. 900 milliseconds, grave, never alarming.

**B.** pm_billing_issue — measured notice for a payment problem banner in a mobile app. Low bassoon triple-pulse with a slight downward drift and a soft muted bell. 900 milliseconds, warm, concerned, non-threatening.

**C.** pm_billing_issue — cinematic muted concern for a billing warning. Low cello swell with a faint distant metallic ring fading behind it. 900 milliseconds, sober, restrained, short tail.

---
# 3. MAX — голосовой звонок с учителем

### `pm_max_prestart_ready_v1` — 0.9 с, громкость 0.26
**Экран:** `app/max_call_prestart.tsx` · Момент: экран прогрева перед звонком, линия готова, можно звонить.

**A.** pm_max_prestart_ready — quiet interface cue for a warm-up screen confirming the call line is ready to dial in a voice-tutor app. A single soft filtered tone rises gently over 400 milliseconds and settles into a steady low hum, restrained and unobtrusive. 900 milliseconds, dry, no bright peak, feels like a light switching to ready.

**B.** pm_max_prestart_ready — warm standby cue for a voice-lesson prestart screen where the connection line becomes ready. Gentle rounded pulse blooming softly, followed by a light settled tone, friendly but understated. 900 milliseconds, mono, dry, closer to a gentle nudge than a fanfare.

**C.** pm_max_prestart_ready — cinematic readiness cue as a voice-call line comes alive before dialing. Slow airy swell with a faint low resonance underneath, gathering calmly and settling without any sharp edge. 900 milliseconds, spacious but quiet, controlled decay.

### `pm_max_call_connect_v1` — 0.8 с, громкость 0.34
**Экран:** `app/max_call_session.tsx` · Момент: звонок соединился, учитель на линии.

**A.** pm_max_call_connect — quiet interface confirmation cue for a call connecting with an AI voice tutor. Two soft warm tones arrive close together, the second slightly higher, forming a brief settled arrival with a clean short decay. 800 milliseconds, dry, calm, must sit comfortably under a speaking voice.

**B.** pm_max_call_connect — warm greeting cue as a voice-tutor call successfully connects in a mobile learning app. Gentle rounded two-note rise with a friendly rounded tone, blue-toned and smooth rather than bright. 800 milliseconds, mono, dry, soft enough to sit under a first spoken line.

**C.** pm_max_call_connect — cinematic arrival cue for a live connection forming between student and AI tutor. Soft breathy swell resolving into a warm low chord with faint airy overtone, controlled and intimate. 800 milliseconds, no sharp transient, restrained presence beneath dialogue.

### `pm_max_call_end_v1` — 1.1 с, громкость 0.32
**Экран:** `app/max_call_session.tsx` · Момент: звонок завершён, линия закрылась.

**A.** pm_max_call_end — quiet interface cue for a voice-tutor call closing and the line disconnecting. A warm sustained tone fades gently downward over 700 milliseconds into a soft settled close, unhurried and complete. 1.1 seconds, dry, calm, clean tail with no abrupt cut.

**B.** pm_max_call_end — gentle sign-off cue as a voice-lesson call wraps up in a mobile learning app. Soft descending two-tone farewell, warm and rounded, closing on a light settled hum. 1.1 seconds, mono, dry, friendly but low-key, never celebratory.

**C.** pm_max_call_end — cinematic close for a live tutoring call ending. Slow warm descending swell with a faint airy release, dissolving gradually into silence. 1.1 seconds, spacious, calm, feels like a line going quiet rather than shutting off.

### `pm_max_turn_yours_v1` — 0.3 с, громкость 0.24
**Экран:** `app/max_call_session.tsx` · Момент: учитель договорил, теперь очередь пользователя говорить. Обязан быть очень тихим и коротким.

**A.** pm_max_turn_yours — micro interface cue signaling the floor has passed to the student after the AI tutor finishes speaking. One extremely brief soft tone, clean and rounded, gone almost as soon as it arrives. 300 milliseconds, must sit comfortably under a speaking voice, no sustain.

**B.** pm_max_turn_yours — friendly micro handoff cue for a voice-lesson turn passing to the learner. A tiny warm rounded tick with a gentle upward lean, quick and light. 300 milliseconds, mono, dry, barely there, never distracts from the pause.

**C.** pm_max_turn_yours — cinematic micro-cue marking a conversational turn change in a live tutoring call. A single soft breath-like tap with faint warmth, over almost instantly. 300 milliseconds, intimate, must sit comfortably under a speaking voice.

### `pm_max_listening_start_v1` — 0.25 с, громкость 0.22
**Экран:** `app/max_call_session.tsx` · Момент: микрофон открылся, приложение слушает пользователя.

**A.** pm_max_listening_start — micro interface cue for a microphone opening to capture the learner's voice in a live tutoring call. A single very short soft rising tick, clean and quiet. 250 milliseconds, dry, must sit comfortably under a speaking voice, no tail.

**B.** pm_max_listening_start — light open-mic cue for a voice-practice call in a mobile learning app. Tiny warm upward tick, gentle and rounded, barely audible. 250 milliseconds, mono, dry, quick and friendly.

**C.** pm_max_listening_start — cinematic micro-cue for a microphone waking to listen in an intimate voice call. Faint airy intake texture with a soft rounded edge. 250 milliseconds, subtle, must sit comfortably under a speaking voice.

### `pm_max_listening_stop_v1` — 0.25 с, громкость 0.22
**Экран:** `app/max_call_session.tsx` · Момент: микрофон закрылся, реплика пользователя ушла на обработку.

**A.** pm_max_listening_stop — micro interface cue for a microphone closing after the learner finishes speaking in a live tutoring call. A single very short soft descending tick, clean and quiet, mirroring the listening-start cue but lower. 250 milliseconds, dry, must sit comfortably under a speaking voice.

**B.** pm_max_listening_stop — light close-mic cue for a voice-practice call in a mobile learning app. Tiny warm downward tick, gentle and settled. 250 milliseconds, mono, dry, quick and unobtrusive.

**C.** pm_max_listening_stop — cinematic micro-cue for a microphone settling after capturing speech in an intimate voice call. Faint airy release texture with a soft rounded edge, quieter than the opening cue. 250 milliseconds, subtle, must sit comfortably under a speaking voice.

### `pm_max_caption_in_v1` — 0.2 с, громкость 0.16
**Экран:** `app/max_call_live_caption_view.tsx` · Момент: новая строка живых субтитров появилась под речью.

**A.** pm_max_caption_in — micro interface cue for a new live-caption line appearing beneath spoken dialogue in a voice-tutor call. An extremely soft short tick, clean and neutral. 200 milliseconds, dry, must sit comfortably under a speaking voice, near-silent.

**B.** pm_max_caption_in — tiny text-arrival cue for captions updating during a voice lesson in a mobile learning app. Very light warm tap, soft and quick. 200 milliseconds, mono, dry, almost subliminal.

**C.** pm_max_caption_in — cinematic micro-cue for words materializing as captions beneath live speech. A whisper-soft transient with minimal body. 200 milliseconds, must sit comfortably under a speaking voice, barely perceptible.

### `pm_max_review_open_v1` — 1.2 с, громкость 0.30
**Экран:** `app/max_voice_review.tsx` · Момент: открылся разбор состоявшегося звонка.

**A.** pm_max_review_open — quiet interface cue for a post-call review screen opening after a voice-tutor session ends. Soft filtered swell rising over 700 milliseconds, settling into a clean sustained tone, analytical and calm. 1.2 seconds, dry, no tail, premium software feel.

**B.** pm_max_review_open — warm reveal cue for a call-summary screen opening in a mobile learning app. Gentle rising synth swell with a light rounded arrival, encouraging but understated. 1.2 seconds, mono, dry, feels like a folder opening to good news.

**C.** pm_max_review_open — cinematic unveiling cue for a session review materializing after a live conversation. Airy warm swell with a faint shimmer layer, resolving into a settled glow. 1.2 seconds, spacious, controlled decay, reflective tone.

### `pm_max_goal_reached_v1` — 1.4 с, громкость 0.48
**Экран:** `app/max_call_session.tsx`, `app/max_voice_review.tsx` · Момент: цель разговора достигнута — учитель отметил, что задача выполнена.

**A.** pm_max_goal_reached — premium interface cue for the moment a conversation goal is confirmed reached by the AI tutor. Clean rising two-note figure using the signature three-note motif at reward scale, settling on a warm sustained tone. 1.4 seconds, dry, precise, no long tail, distinctly celebratory yet composed.

**B.** pm_max_goal_reached — warm accomplishment cue for completing a voice-lesson objective in a mobile learning app. Bright ascending run built on the signature three-note motif at reward scale, closing on a satisfied rounded chime. 1.4 seconds, mono, dry, encouraging without being loud.

**C.** pm_max_goal_reached — cinematic milestone cue marking a conversational goal achieved in a live tutoring call. Warm swelling harmony carrying the signature three-note motif at reward scale, blooming gently and settling with soft weight. 1.4 seconds, elegant, controlled decay.

### `pm_max_time_warning_v1` — 0.7 с, громкость 0.28
**Экран:** `app/max_call_session.tsx` · Момент: минуты звонка на исходе, учитель предупреждает о скором завершении.

**A.** pm_max_time_warning — quiet interface cue signaling remaining call time is running low during a voice-tutor session. Two soft low tones spaced evenly, calm and neutral, no urgency implied. 700 milliseconds, dry, must sit comfortably under a speaking voice, clean decay.

**B.** pm_max_time_warning — gentle heads-up cue for a voice lesson nearing its time limit in a mobile learning app. Warm mellow double tap, friendly rather than alarming. 700 milliseconds, mono, dry, understated.

**C.** pm_max_time_warning — cinematic cue marking time drawing short in a live tutoring call. Soft low pulsing pair with faint warmth, composed and unhurried. 700 milliseconds, must sit comfortably under a speaking voice, grounded low end.

### `pm_max_consent_granted_v1` — 0.8 с, громкость 0.30
**Экран:** `app/max_voice_consent_gate.tsx`, `components/MaxVoiceConsentModal.tsx` · Момент: пользователь дал согласие на голосовой режим.

**A.** pm_max_consent_granted — clean interface confirmation cue for a user granting consent to enable voice mode in a learning app. Single warm ascending tone resolving cleanly, precise and reassuring. 800 milliseconds, dry, no tail, premium software feel.

**B.** pm_max_consent_granted — warm approval cue for unlocking voice conversations in a mobile learning app. Gentle rising two-note figure ending in a soft rounded chime, welcoming. 800 milliseconds, mono, dry, friendly confirmation.

**C.** pm_max_consent_granted — cinematic cue for a permission granted that opens a new mode of interaction. Airy warm swell resolving into a settled glow, composed and trustworthy. 800 milliseconds, controlled decay, quietly significant.

### `pm_max_memory_saved_v1` — 0.9 с, громкость 0.32
**Экран:** `app/max_memory_settings.tsx` · Момент: настройки памяти учителя сохранены.

**A.** pm_max_memory_saved — clean interface confirmation cue for tutor memory settings being saved in a learning app. Soft rising tone settling into a single clear resolved note, precise and calm. 900 milliseconds, dry, no tail, premium software feel.

**B.** pm_max_memory_saved — warm confirmation cue for saving personalization settings for an AI tutor in a mobile learning app. Gentle rounded two-note arrival, friendly and settled. 900 milliseconds, mono, dry, quietly satisfying.

**C.** pm_max_memory_saved — cinematic cue for a tutor's memory being committed and settling into place. Airy warm swell with a soft final resolve, composed and reassuring. 900 milliseconds, controlled decay, feels permanent.

---

# 4. Диалоги с ИИ

### `pm_dialog_catalog_open_v1` — 1.0 с, громкость 0.24
**Экран:** `app/ai_dialog_home.tsx` · Момент: открылся каталог сценариев диалогов.

**A.** pm_dialog_catalog_open — quiet interface cue for a catalog of conversation scenarios opening in a language-learning app. Soft filtered swell rising over 500 milliseconds, settling into a clean neutral tone, minimal and precise. 1.0 second, dry, no tail, premium software feel.

**B.** pm_dialog_catalog_open — warm browse-cue for a scenario menu opening in a mobile learning game. Gentle rising synth sweep with a light rounded arrival, inviting exploration. 1.0 second, mono, dry, friendly but restrained.

**C.** pm_dialog_catalog_open — cinematic reveal cue for a gallery of role-play scenes opening before the learner. Airy warm swell with a faint shimmer, resolving into a settled glow. 1.0 second, spacious, controlled decay.

### `pm_dialog_scenario_pick_v1` — 0.4 с, громкость 0.26
**Экран:** `components/DialogScenarioTile.tsx` · Момент: пользователь выбрал сценарий диалога, плитка подсветилась.

**A.** pm_dialog_scenario_pick — clean interface cue for selecting a conversation scenario tile in a language-learning app. Single short bright tone with a clean quick decay, precise and confirming. 400 milliseconds, dry, no reverb, premium software feel.

**B.** pm_dialog_scenario_pick — warm selection cue for choosing a role-play scene in a mobile learning game. Bright rounded pop with a light upward lean, playful but not cartoonish. 400 milliseconds, mono, dry, close to the reward-family tiles.

**C.** pm_dialog_scenario_pick — cinematic cue for a scene being chosen and coming alive. Soft crystalline tap with a faint warm bloom underneath. 400 milliseconds, elegant, controlled tail.

### `pm_dialog_briefing_in_v1` — 1.1 с, громкость 0.26
**Экран:** `app/ai_dialog_briefing.tsx` · Момент: показан бриф — кто вы в этой сцене и какая у вас задача.

**A.** pm_dialog_briefing_in — quiet interface cue for a scenario briefing appearing, explaining the learner's role and goal. Soft filtered swell for 600 milliseconds, settling into a calm sustained tone, informative and composed. 1.1 seconds, dry, no tail, precise software feel.

**B.** pm_dialog_briefing_in — warm setup cue for a mission briefing screen in a mobile learning game. Gentle rising synth swell with a light confident arrival, sets the scene without excitement overload. 1.1 seconds, mono, dry, encouraging.

**C.** pm_dialog_briefing_in — cinematic cue for a story premise unfolding before a role-play begins. Airy warm swell with subtle narrative weight, resolving into a settled tone. 1.1 seconds, spacious, controlled decay.

### `pm_dialog_scene_enter_v1` — 1.3 с, громкость 0.30
**Экран:** `app/ai_dialog_session.tsx` · Момент: сцена диалога открылась, палитра места залила экран (кафе, аэропорт, отель).

**A.** pm_dialog_scene_enter — quiet interface cue for a role-play scene opening as its location colors wash across the screen. Soft warm swell rising over 700 milliseconds, resolving into a settled ambient tone, immersive but restrained. 1.3 seconds, dry, no harsh peak, premium software feel.

**B.** pm_dialog_scene_enter — warm arrival cue for stepping into a role-play location in a mobile learning game. Gentle rising shimmer with a light rounded settle, evokes stepping through a doorway. 1.3 seconds, mono, dry, inviting.

**C.** pm_dialog_scene_enter — cinematic establishing cue for a scene's atmosphere flooding the screen. Wide warm swell with airy texture, blooming gradually into a settled ambient wash. 1.3 seconds, spacious, controlled decay, sets a place without a hard edge.

### `pm_dialog_reply_sent_v1` — 0.3 с, громкость 0.22
**Экран:** `app/ai_dialog_session.tsx` · Момент: реплика пользователя отправлена собеседнику.

**A.** pm_dialog_reply_sent — micro interface cue for a chat reply being sent to the AI conversation partner in a language-learning app. Single very short soft upward tick, clean and quiet. 300 milliseconds, dry, must sit comfortably under a speaking voice, no tail.

**B.** pm_dialog_reply_sent — light send-cue for a message leaving in a mobile learning game conversation. Tiny warm rising tick, quick and friendly. 300 milliseconds, mono, dry, unobtrusive.

**C.** pm_dialog_reply_sent — cinematic micro-cue for a spoken line launching toward a conversation partner. Faint airy transient with a soft rounded edge. 300 milliseconds, intimate, must sit comfortably under a speaking voice.

### `pm_dialog_reply_in_v1` — 0.35 с, громкость 0.20
**Экран:** `app/ai_dialog_session.tsx` · Момент: собеседник ответил, его реплика появилась на экране.

**A.** pm_dialog_reply_in — micro interface cue for the AI conversation partner's reply arriving on screen. Single very short soft downward-leaning tick, gentle and quiet, distinct from the send cue. 350 milliseconds, dry, must sit comfortably under a speaking voice, clean decay.

**B.** pm_dialog_reply_in — light arrival cue for a response landing in a mobile learning game conversation. Tiny warm settling tick, calm and rounded. 350 milliseconds, mono, dry, unobtrusive.

**C.** pm_dialog_reply_in — cinematic micro-cue for a conversation partner's words landing gently on screen. Faint airy texture with a soft warm edge. 350 milliseconds, intimate, must sit comfortably under a speaking voice.

### `pm_dialog_hint_used_v1` — 0.5 с, громкость 0.24
**Экран:** `app/ai_dialog_session.tsx` · Момент: пользователь открыл подсказку во время диалога.

**A.** pm_dialog_hint_used — quiet interface cue for a hint panel opening during a live role-play conversation. Soft short filtered swell resolving into a clean neutral tone, discreet and helpful. 500 milliseconds, dry, must sit comfortably under a speaking voice, no tail.

**B.** pm_dialog_hint_used — light helper cue for revealing a suggestion in a mobile learning game conversation. Gentle rounded pop with a soft upward curl, friendly nudge. 500 milliseconds, mono, dry, quiet enough not to distract.

**C.** pm_dialog_hint_used — cinematic cue for a whispered suggestion surfacing mid-conversation. Soft airy tap with a faint warm undertone. 500 milliseconds, must sit comfortably under a speaking voice, subtle.

### `pm_dialog_verdict_open_v1` — 1.5 с, громкость 0.42
**Экран:** `components/DialogVerdictScreen.tsx` · Момент: диалог закончился, полноэкранный вердикт раскрылся.

**A.** pm_dialog_verdict_open — premium interface cue for a full-screen verdict opening after a role-play conversation ends. Warm rising swell over 800 milliseconds using the signature three-note motif at reward scale, settling into a clean sustained tone. 1.5 seconds, dry, controlled tail, expensive and composed.

**B.** pm_dialog_verdict_open — warm reveal cue for a results screen opening after a conversation finishes in a mobile learning game. Bright ascending swell carrying the signature three-note motif at reward scale, closing on a confident rounded chime. 1.5 seconds, mono, dry, satisfying arrival.

**C.** pm_dialog_verdict_open — cinematic unveiling cue for a full-screen verdict framing the end of a conversation. Wide warm swell with the signature three-note motif at reward scale layered on top, blooming and settling gracefully. 1.5 seconds, spacious, controlled decay.

### `pm_dialog_score_tick_v1` — 0.18 с, громкость 0.18
**Экран:** `components/DialogVerdictScreen.tsx` · Момент: счётчик оценки диалога отсчитывает баллы вверх. Играет часто, подряд.

**A.** pm_dialog_score_tick — micro interface cue for a score counter incrementing rapidly upward on a results screen. Extremely short clean upward tick, neutral and precise, safe to repeat many times without fatigue. 180 milliseconds, dry, no tail, premium software feel.

**B.** pm_dialog_score_tick — light counting cue for a points tally climbing on a results screen in a mobile learning game. Tiny bright upward tick, cheerful but tiny, built for rapid repetition. 180 milliseconds, mono, dry, not fatiguing at speed.

**C.** pm_dialog_score_tick — cinematic micro-cue for a numeric score climbing in quick succession. Faint crystalline tick with a soft warm edge, minimal and repeatable. 180 milliseconds, elegant, no buildup between repeats.

### `pm_dialog_victory_v1` — 1.8 с, громкость 0.54
**Экран:** `components/DialogVictoryCelebration.tsx` · Момент: диалог пройден блестяще, запускается празднование.

**A.** pm_dialog_victory — premium interface cue for a celebration launching after an exceptional role-play performance in a language-learning app. Full warm swell carrying the signature three-note motif at ceremony scale, rising cleanly and resolving completely. 1.8 seconds, no abrupt cut, expensive and calm, distinctly celebratory.

**B.** pm_dialog_victory — warm triumphant cue for acing a conversation scenario in a mobile learning game. Bright ascending chord progression built on the signature three-note motif at ceremony scale, confident and satisfying. 1.8 seconds, mono, controlled tail, celebratory but not loud.

**C.** pm_dialog_victory — cinematic victory cue closing an outstanding role-play performance. Wide warm orchestral-toned swell carrying the signature three-note motif at ceremony scale, blooming with gold-toned resonance and settling gracefully. 1.8 seconds, complete, no harsh peak.

### `pm_dialog_retry_v1` — 0.9 с, громкость 0.32
**Экран:** `components/DialogVerdictScreen.tsx` · Момент: диалог не сдан, предлагается попробовать снова. Не должен унижать.

**A.** pm_dialog_retry — quiet interface cue for offering another attempt after a conversation falls short in a language-learning app. Soft low tone dipping gently then rising into a warm settled resolve, calm and instructive. 900 milliseconds, dry, no harsh dip, never punishing.

**B.** pm_dialog_retry — encouraging cue for trying a scenario again in a mobile learning game. Gentle mellow dip immediately answered by a warm rounded rise, friendly and supportive. 900 milliseconds, mono, dry, upbeat without mocking.

**C.** pm_dialog_retry — cinematic cue for a graceful invitation to try once more after a near miss. Soft warm dip dissolving into an airy encouraging swell, composed and kind. 900 milliseconds, restrained, no aggression in the low end.
# Карточки, магазины, профиль — промпты для генерации звуков

Генератор: **Adobe Firefly Sounds**. Стиль — семейство существующих звуков
приложения «Королевская академия»: умное, премиальное, тёплое, чуть
магическое, НЕ аркадное. Инструменты строго по назначению: челеста и
стеклянные гармоники — осколки/валюта/знание, арфа и пиццикато струнных —
карточки/сохранение/выбор, тёплые струнные — завершение и прогресс,
валторна/мягкая медь/хоровой пэд — только редкие церемонии, низкие струнные/
кларнет/фагот — предупреждение без наказующего тона, литавры — дозированно.
Фирменный мотив: три ноты, восходящее движение с мягким разрешением, в трёх
масштабах — микро 120-300 мс, награда 600-1200 мс, церемония 1500-4000 мс.

Каждый звук описан тремя промптами в разных стилях:

- **A — интерфейсный.** Минимализм, чистый синтез, ощущение дорогого софта.
- **B — игровой.** Теплее, ближе к текущим наградным звукам, но не мультяшно.
- **C — кинематографичный.** Премиальная подача, слой воздуха и веса.

Технические требования ко всем файлам: моно, 48 кГц, формат m4a, тишина в
начале обрезана, нормализация −14 LUFS, пиковое −1 dBTP.

---

# 5. Карточки (flashcards)

### `pm_cards_catalog_open_v1` — 0.9 с, громкость 0.22
**Экран:** `app/flashcards.tsx` · Момент: открылся раздел карточек.

**A.** pm_cards_catalog_open — minimal UI cue for a flashcards section opening in a language-learning app. Soft plucked harp arpeggio rising through three notes, light and airy, settling on a gentle sustained overtone. Clean decay, dry, premium software feel. 0.9 seconds.

**B.** pm_cards_catalog_open — warm section-entry cue for a flashcards library opening in a mobile learning app. Pizzicato strings climb through the signature three-note motif at micro scale, answered by a soft harp shimmer. Inviting and light, mono, clean tail. 0.9 seconds.

**C.** pm_cards_catalog_open — cinematic doorway moment for a card library revealing itself. Airy harp glissando rises gently with a faint warm string underneath, blooming into a soft sustained resonance. Elegant, spacious, controlled decay. 0.9 seconds.

### `pm_cards_pack_open_v1` — 0.7 с, громкость 0.28
**Экран:** `app/flashcards_packs.tsx`, `app/flashcards_collection.tsx` · Момент: открылся пак карточек, колода развернулась.

**A.** pm_cards_pack_open — clean UI cue for a card pack opening and its deck fanning outward in a learning app. Quick ascending pizzicato run across four notes, each slightly brighter, closing on a light harp touch. Dry, precise, no tail. 0.7 seconds.

**B.** pm_cards_pack_open — warm reward-style cue for a deck of cards unfurling into view. Harp arpeggio spreads upward with a soft bell overtone at the peak, gentle and inviting. Mono, clean decay, in the family of the app's existing reward cues. 0.7 seconds.

**C.** pm_cards_pack_open — cinematic unfurling moment as a card pack spreads into a deck. Layered pizzicato strings ripple outward with a light air-shimmer on top, settling into a warm brief glow. Controlled tail, refined weight. 0.7 seconds.

### `pm_cards_swipe_know_v1` — 0.32 с, громкость 0.30
**Экран:** `app/flashcards_swipe.tsx` · Момент: карточка улетела вправо — «знаю».

**A.** pm_cards_swipe_know — minimal confirming UI tick for a flashcard swiped right as known in a learning app. Single bright pizzicato pluck with a soft upward pitch bend, immediate and clean. No tail, precise. 0.32 seconds.

**B.** pm_cards_swipe_know — warm affirming cue for correctly recognizing a flashcard swiped away. Quick two-note harp flick rising brightly, cheerful and light. Mono, dry, encouraging without being loud. 0.32 seconds.

**C.** pm_cards_swipe_know — cinematic light-touch confirmation for a mastered flashcard sliding off screen. Airy pizzicato snap with a faint glassy shimmer trailing it, brief and elegant. Tight decay, refined. 0.32 seconds.

### `pm_cards_swipe_learn_v1` — 0.34 с, громкость 0.26
**Экран:** `app/flashcards_swipe.tsx` · Момент: карточка улетела влево — «учу дальше». Не должно звучать как ошибка.

**A.** pm_cards_swipe_learn — neutral UI tick for a flashcard swiped left to keep studying in a learning app. Single soft pizzicato pluck with a gentle downward pitch drift, calm and warm, never resembling a mistake. Dry, short. 0.34 seconds.

**B.** pm_cards_swipe_learn — friendly cue for setting a flashcard aside to review again later. Two-note harp touch with a mellow descending shape, still warm and supportive in tone. Mono, clean decay, not discouraging. 0.34 seconds.

**C.** pm_cards_swipe_learn — cinematic soft-set-aside moment for a card returning to the study queue. Gentle pizzicato with a faint warm string underlay, drifting calmly downward without any harsh edge. Controlled tail, reassuring. 0.34 seconds.

### `pm_cards_flip_v1` — 0.28 с, громкость 0.26
**Экран:** `components/flashcards/`, `app/flashcards/PhraseCard.tsx` · Момент: карточка перевернулась и показала обратную сторону.

**A.** pm_cards_flip — precise UI cue for a flashcard flipping to reveal its back side in a learning app. Fast pizzicato swipe with a subtle pitch sweep through the turn, landing on a small clean tick. Dry, tight, no reverb. 0.28 seconds.

**B.** pm_cards_flip — light playful cue for a card turning over to show its answer. Short harp glissando flick with a bright landing note, quick and satisfying. Mono, clean, warm character. 0.28 seconds.

**C.** pm_cards_flip — cinematic turning moment for a card rotating in space. Airy pizzicato sweep with a faint whoosh of string resonance, resolving on a soft glassy point. Brief, elegant, controlled decay. 0.28 seconds.

### `pm_cards_editor_save_v1` — 0.8 с, громкость 0.34
**Экран:** `app/flashcards_card_editor.tsx` · Момент: пользователь сохранил свою карточку.

**A.** pm_cards_editor_save — clean UI confirmation for a custom flashcard being saved in a learning app. Harp arpeggio across three notes at reward scale, ending on a settled warm tone. Precise, dry, expensive software feel. 0.8 seconds.

**B.** pm_cards_editor_save — warm save-confirmation cue close to the app's existing reward family. Pizzicato strings rise into a soft harp bloom, the signature three-note motif at reward scale, closing content and resolved. Mono, clean tail. 0.8 seconds.

**C.** pm_cards_editor_save — cinematic completion moment for a personal flashcard being committed. Warm harp swell layered with a gentle string undertone, rising and settling into a satisfied glow. Controlled decay, refined weight. 0.8 seconds.

### `pm_cards_editor_delete_v1` — 0.6 с, громкость 0.30
**Экран:** `app/flashcards_card_editor.tsx` · Момент: карточка удалена.

**A.** pm_cards_editor_delete — neutral UI cue for a flashcard being deleted in a learning app editor. Short descending pizzicato pair, calm and clean, ending on a soft low tone with no lingering weight. Dry, brief. 0.6 seconds.

**B.** pm_cards_editor_delete — light removal cue for a card being taken out of a deck. Two-note harp descent, gentle and matter-of-fact rather than sad, mono, clean decay. 0.6 seconds.

**C.** pm_cards_editor_delete — cinematic dissolve moment for a card being cleared away. Soft descending string pluck fading into air, calm and understated, no dramatic weight. Controlled short tail. 0.6 seconds.

### `pm_cards_pack_created_v1` — 1.2 с, громкость 0.44
**Экран:** `app/community_pack_create.tsx`, `app/flashcards_my_packs.tsx` · Момент: пользователь собрал и опубликовал свой пак.

**A.** pm_cards_pack_created — premium UI cue for a user publishing their own finished card pack in a learning app. Rising harp arpeggio building through the signature three-note motif at reward scale, joined by a warm string swell, resolving fully. Clean, precise, no harsh peak. 1.2 seconds.

**B.** pm_cards_pack_created — celebratory cue for a self-made card pack going live, close to the app's existing reward family. Pizzicato strings climb briskly into a bright harp bloom with a soft chime cap. Warm, mono, satisfying resolution. 1.2 seconds.

**C.** pm_cards_pack_created — cinematic achievement moment for a creation being shared with the world. Warm harp and string swell rising together, blooming into a soft glowing resolution with light air on top. Controlled tail, proud but restrained. 1.2 seconds.

### `pm_cards_voice_preview_v1` — 0.5 с, громкость 0.24
**Экран:** `app/flashcards_voice_picker.tsx` · Момент: пользователь прослушивает вариант голоса озвучки.

**A.** pm_cards_voice_preview — minimal UI cue for previewing a text-to-speech voice option in a learning app. Single soft glassy tone with a gentle rounded attack, neutral and clean, inviting a listen. Dry, short. 0.5 seconds.

**B.** pm_cards_voice_preview — light exploratory cue for sampling a voice option in a menu. Small celesta touch with a warm rounded edge, friendly and curious in character. Mono, clean decay. 0.5 seconds.

**C.** pm_cards_voice_preview — cinematic sampling moment for auditioning a spoken voice. Soft glass-harmonica tone with a faint airy halo, calm and inviting, brief and elegant. Controlled short tail. 0.5 seconds.

### `pm_cards_mastered_v1` — 1.3 с, громкость 0.48
**Экран:** `app/flashcards_collection.tsx` · Момент: слово перешло в статус выученного, шкала силы слова заполнилась.

**A.** pm_cards_mastered — premium UI cue for a word reaching fully mastered status as its strength bar completes in a learning app. Celesta and glass harmonics climb the signature three-note motif at reward scale, resolving into a warm sustained glow. Precise, clean, expensive feel. 1.3 seconds.

**B.** pm_cards_mastered — warm milestone cue for a vocabulary word becoming mastered, close to the app's existing reward family. Bright celesta run rising into a full harp bloom with a soft string bed underneath, joyful and settled. Mono, clean tail. 1.3 seconds.

**C.** pm_cards_mastered — cinematic mastery moment where a word's strength completes fully. Glass harmonics and warm strings rise together, blooming into a luminous sustained resolution with light overtone shimmer. Controlled decay, proud and warm. 1.3 seconds.

---

# 6. Магазины, валюты и экономика

### `pm_shop_open_v1` — 1.0 с, громкость 0.26
**Экран:** `app/shop.tsx` · Момент: открылся магазин.

**A.** pm_shop_open — minimal UI cue for a shop screen opening in a learning app. Soft ascending harp arpeggio across three notes, light and welcoming, settling on a gentle sustained tone. Clean, dry, premium software feel. 1.0 seconds.

**B.** pm_shop_open — warm entry cue for a rewards shop opening its doors. Pizzicato strings rise into a bright celesta touch at the top, inviting and light. Mono, clean decay, in the family of the app's reward cues. 1.0 seconds.

**C.** pm_shop_open — cinematic doorway moment for a shop revealing its offerings. Airy harp glissando with a faint warm string swell underneath, blooming gently and settling. Elegant, spacious, controlled tail. 1.0 seconds.

### `pm_shop_item_select_v1` — 0.35 с, громкость 0.26
**Экран:** `app/shop.tsx`, `app/shards_shop.tsx` · Момент: выбран товар в витрине.

**A.** pm_shop_item_select — precise UI cue for selecting an item in a shop display in a learning app. Single clean pizzicato pluck with a light upward inflection, immediate and dry. No tail, tight. 0.35 seconds.

**B.** pm_shop_item_select — friendly selection cue for tapping an item in a rewards shop. Quick harp touch with a small bright pitch rise, cheerful and light. Mono, clean decay. 0.35 seconds.

**C.** pm_shop_item_select — cinematic light-touch selection for an item catching the eye. Airy pizzicato pluck with a faint glassy sparkle trailing it, brief and refined. Tight controlled decay. 0.35 seconds.

### `pm_shards_spend_v1` — 0.7 с, громкость 0.36
**Экран:** `app/shards_shop.tsx` · Момент: осколки списаны за покупку, счётчик уменьшился.

**A.** pm_shards_spend — clean UI cue for a shard currency counter decreasing after a purchase in a learning app. Celesta descends through three notes in a soft downward run, settling calmly with no harsh ending. Dry, precise, neutral tone, never punishing. 0.7 seconds.

**B.** pm_shards_spend — warm transaction cue for shards being spent in a mobile learning game. Glass harmonics fall gently across a short descending phrase, closing on a soft grounded tone. Mono, clean decay, matter-of-fact rather than sad. 0.7 seconds.

**C.** pm_shards_spend — cinematic spend moment where currency shifts from the player's balance. Celesta and glass harmonics drift downward with a faint warm string underneath, settling into a calm resolved close. Controlled tail, no low-end weight. 0.7 seconds.

### `pm_shards_earned_v1` — 0.9 с, громкость 0.44
**Экран:** `app/shards_shop.tsx`, начисления в игре · Момент: осколки начислены, счётчик вырос.

**A.** pm_shards_earned — premium UI cue for a shard currency counter rising after an award in a learning app. Celesta climbs the signature three-note motif at reward scale, glass harmonics sparkling on top, resolving into a bright settled tone. Clean, precise, expensive feel. 0.9 seconds.

**B.** pm_shards_earned — warm currency-gain cue close to the app's existing reward family. Celesta and glass harmonics rise briskly together into a bright chime, cheerful and satisfying. Mono, clean decay. 0.9 seconds.

**C.** pm_shards_earned — cinematic gain moment where shards flow into the player's balance. Glass harmonics cascade upward through the three-note motif, a warm string bed swelling beneath, blooming into a soft glow. Controlled decay, luminous. 0.9 seconds.

### `pm_coin_exchange_v1` — 1.0 с, громкость 0.40
**Экран:** `app/coin_exchange.tsx` · Момент: одна валюта обменена на другую, произошла конвертация.

**A.** pm_coin_exchange — clean UI cue for one currency converting into another in a learning app exchange screen. Celesta plays a quick descending pair answered immediately by glass harmonics rising, a clear back-and-forth exchange shape, resolving settled. Dry, precise. 1.0 seconds.

**B.** pm_coin_exchange — warm conversion cue for swapping currencies in a mobile learning game. Glass harmonics dip down then bounce back up into a bright resolving chime, playful exchange feel. Mono, clean decay. 1.0 seconds.

**C.** pm_coin_exchange — cinematic transmutation moment where one currency becomes another. Celesta falls softly then glass harmonics rise in answer, a warm string thread connecting the two halves, closing in a gentle glow. Controlled tail, elegant. 1.0 seconds.

### `pm_runes_balance_open_v1` — 0.8 с, громкость 0.26
**Экран:** `app/runes_wallet.tsx` · Момент: открылся кошелёк рун — только баланс и источники, без магазина.

**A.** pm_runes_balance_open — minimal UI cue for a currency wallet screen opening in a learning app, showing balance and sources only. Soft celesta arpeggio across three notes, calm and clear, settling on a light sustained tone. Clean, dry, premium feel. 0.8 seconds.

**B.** pm_runes_balance_open — warm entry cue for opening a personal currency wallet. Glass harmonics rise gently into a soft chime, inviting and quiet, mono, clean decay. 0.8 seconds.

**C.** pm_runes_balance_open — cinematic reveal moment for a wallet of glowing currency opening to view. Celesta and glass harmonics drift upward softly with a faint airy shimmer, settling into calm resonance. Controlled tail, refined. 0.8 seconds.

### `pm_season_pass_open_v1` — 1.3 с, громкость 0.34
**Экран:** `app/season_pass.tsx`, `app/arena_season_pass.tsx` · Момент: открылся сезонный пропуск с дорожкой наград.

**A.** pm_season_pass_open — premium UI cue for a season pass screen opening to reveal a reward track in a learning app. Warm harp arpeggio rises through the signature three-note motif at reward scale, a soft string bed joining underneath, settling into an open resolved tone. Clean, precise. 1.3 seconds.

**B.** pm_season_pass_open — warm entry cue for a season pass reward track unfolding, close to the app's existing reward family. Pizzicato strings and harp climb together into a bright settled chord, inviting and confident. Mono, clean decay. 1.3 seconds.

**C.** pm_season_pass_open — cinematic unveiling moment for a long reward path opening ahead. Harp and warm strings rise together with a faint choral pad underneath, blooming into a spacious open resolution. Controlled tail, anticipatory. 1.3 seconds.

### `pm_season_tier_unlock_v1` — 1.0 с, громкость 0.46
**Экран:** `app/season_pass.tsx` · Момент: открылся новый уровень сезонного пропуска, награда стала доступна.

**A.** pm_season_tier_unlock — clean UI cue for a new season pass tier unlocking and its reward becoming available in a learning app. Harp and celesta climb the signature three-note motif at reward scale, ending on a bright confirmed tone. Precise, dry, premium feel. 1.0 seconds.

**B.** pm_season_tier_unlock — satisfying unlock cue for reaching a new tier on a reward track. Pizzicato strings rise briskly into a bright harp and celesta bloom, warm and rewarding. Mono, clean decay, in the family of existing reward cues. 1.0 seconds.

**C.** pm_season_tier_unlock — cinematic milestone moment where a new tier opens and glows. Warm strings and harp swell together with celesta sparkle on top, blooming into a confident resolved glow. Controlled tail, proud but restrained. 1.0 seconds.

---

# 7. Профиль, прогресс и достижения

### `pm_achievements_open_v1` — 1.1 с, громкость 0.28
**Экран:** `app/achievements_screen.tsx` · Момент: открылась витрина достижений.

**A.** pm_achievements_open — minimal UI cue for an achievements gallery opening in a learning app. Soft harp arpeggio rising through three notes with a faint warm string underlay, settling calm and open. Clean, dry, premium feel. 1.1 seconds.

**B.** pm_achievements_open — warm entry cue for a trophy gallery opening its doors. Pizzicato strings climb into a bright harp touch, proud and inviting. Mono, clean decay, in the family of reward cues. 1.1 seconds.

**C.** pm_achievements_open — cinematic reveal moment for a hall of accomplishments opening to view. Harp and warm strings rise together with a faint choral pad underneath, blooming softly into an open resolved tone. Controlled tail, dignified. 1.1 seconds.

### `pm_achievement_card_reveal_v1` — 0.6 с, громкость 0.32
**Экран:** `app/achievements_screen.tsx` · Момент: карточка достижения перевернулась и показала полученную награду.

**A.** pm_achievement_card_reveal — clean UI cue for an achievement card flipping to reveal its earned reward in a learning app. Quick pizzicato turn followed by a bright celesta landing note, precise and satisfying. Dry, no tail. 0.6 seconds.

**B.** pm_achievement_card_reveal — warm reveal cue for a trophy card turning over to show what was won. Harp flick with a soft bright chime at the resolve, cheerful and mono, clean decay. 0.6 seconds.

**C.** pm_achievement_card_reveal — cinematic turning moment for a badge revealing its prize. Airy pizzicato sweep resolving into a warm celesta glow, brief and elegant. Controlled short tail. 0.6 seconds.

### `pm_achievement_locked_v1` — 0.4 с, громкость 0.22
**Экран:** `app/achievements_screen.tsx` · Момент: пользователь нажал на ещё не полученное достижение.

**A.** pm_achievement_locked — neutral UI cue for tapping an achievement that has not yet been earned in a learning app. Single soft muted pizzicato pluck with a gentle downward drift, calm and informative rather than negative. Dry, brief. 0.4 seconds.

**B.** pm_achievement_locked — light informative cue for peeking at a locked trophy. Small dulled harp touch with a faint low resolve, quietly curious rather than disappointing. Mono, clean decay. 0.4 seconds.

**C.** pm_achievement_locked — cinematic soft-dim moment for a not-yet-earned badge acknowledged. Muted pizzicato with a faint warm string underlay fading gently, calm and unassuming, no harsh edge. Controlled short tail. 0.4 seconds.

### `pm_collectibles_open_v1` — 1.0 с, громкость 0.26
**Экран:** `app/collectibles_screen.tsx` · Момент: открылась коллекция собранных предметов.

**A.** pm_collectibles_open — minimal UI cue for a collection screen opening in a learning app. Soft celesta arpeggio across three notes, light and curious, settling on a clean sustained tone. Dry, precise, premium feel. 1.0 seconds.

**B.** pm_collectibles_open — warm entry cue for a personal collection cabinet opening. Glass harmonics rise gently into a bright touch, inviting and light. Mono, clean decay, in the family of reward cues. 1.0 seconds.

**C.** pm_collectibles_open — cinematic reveal moment for a curated collection coming into view. Celesta and glass harmonics drift upward with a faint airy shimmer, settling into a calm glow. Controlled tail, refined. 1.0 seconds.

### `pm_streak_stats_open_v1` — 0.9 с, громкость 0.26
**Экран:** `app/streak_stats.tsx` · Момент: открылась статистика ударного режима, календарь дней.

**A.** pm_streak_stats_open — minimal UI cue for a streak calendar and statistics screen opening in a learning app. Soft pizzicato arpeggio across three notes with a warm string undertone, settling calm and clear. Clean, dry, analytical feel. 0.9 seconds.

**B.** pm_streak_stats_open — warm entry cue for a progress calendar opening to view. Pizzicato strings rise into a light harp touch, encouraging and steady. Mono, clean decay. 0.9 seconds.

**C.** pm_streak_stats_open — cinematic unveiling moment for a chain of daily progress coming into focus. Warm strings and harp rise together softly, settling into an open, grounded resolution. Controlled tail, calm confidence. 0.9 seconds.

### `pm_stats_bar_fill_v1` — 0.5 с, громкость 0.26
**Экран:** `app/streak_stats.tsx`, `components/stats/` · Момент: столбик статистики вырастает до своего значения.

**A.** pm_stats_bar_fill — clean UI cue for a single statistics bar growing upward to its value in a learning app. Short ascending pizzicato sweep for 350 milliseconds, ending on one clear settled tone. Dry, precise, analytical feel. 0.5 seconds.

**B.** pm_stats_bar_fill — light rising cue for a progress bar climbing to its mark. Quick harp glissando upward with a bright landing note, satisfying and brief. Mono, clean decay. 0.5 seconds.

**C.** pm_stats_bar_fill — cinematic growth moment for a bar of progress rising into place. Airy pizzicato sweep with a faint warm string underneath, resolving softly at the top. Controlled short tail, elegant. 0.5 seconds.

### `pm_avatar_equip_v1` — 0.7 с, громкость 0.34
**Экран:** `app/avatar_select.tsx`, `app/avatar_dna_studio.tsx` · Момент: пользователь надел новый элемент внешности на аватар.

**A.** pm_avatar_equip — clean UI cue for equipping a new cosmetic item on a character avatar in a learning app. Pizzicato pluck followed by a soft celesta touch, precise two-step confirmation, settling warm. Dry, no tail. 0.7 seconds.

**B.** pm_avatar_equip — satisfying cue for putting on a new look in a character customizer. Harp touch rising into a small bright chime, playful yet composed. Mono, clean decay, in the family of reward cues. 0.7 seconds.

**C.** pm_avatar_equip — cinematic dressing moment where a new element settles onto a character. Pizzicato strings with a warm celesta glow layered on top, brief and polished. Controlled tail, refined weight. 0.7 seconds.

### `pm_avatar_studio_render_v1` — 1.0 с, громкость 0.30
**Экран:** `app/avatar_dna_studio.tsx` · Момент: новый образ аватара собрался и отрисовался.

**A.** pm_avatar_studio_render — premium UI cue for a new avatar look assembling and rendering in a learning app studio. Soft warm string swell building for 600 milliseconds, then a clean celesta arrival marking completion, settled and calm. Dry, precise, sophisticated. 1.0 seconds.

**B.** pm_avatar_studio_render — warm completion cue for a character design finishing its render. Pizzicato strings build into a bright harp resolve, proud and satisfying. Mono, clean decay. 1.0 seconds.

**C.** pm_avatar_studio_render — cinematic assembly moment where a new persona comes into focus. Warm string swell with celesta sparkle rising through it, blooming into a settled glowing resolution. Controlled tail, polished. 1.0 seconds.

### `pm_account_saved_v1` — 0.8 с, громкость 0.32
**Экран:** `app/account_details.tsx`, `components/account/NicknameEditModal.tsx` · Момент: данные профиля сохранены.

**A.** pm_account_saved — clean UI confirmation cue for profile details being saved in a learning app. Harp arpeggio across three notes at reward scale, ending on a settled warm tone. Dry, precise, expensive software feel. 0.8 seconds.

**B.** pm_account_saved — warm save-confirmation cue close to the app's existing reward family. Pizzicato strings rise into a soft harp resolve, the signature three-note motif at reward scale, content and settled. Mono, clean decay. 0.8 seconds.

**C.** pm_account_saved — cinematic completion moment for personal details being committed. Warm harp swell layered with a gentle string undertone, rising and settling into a quiet satisfied glow. Controlled tail, refined. 0.8 seconds.
# 8. Соцчасть: клуб, лига, друзья, рефералы

### `pm_league_screen_open_v1` — 1.2 с, громкость 0.28
**Экран:** `app/league_screen.tsx`, `app/club_screen.tsx` · Момент: открылась таблица лиги, видно своё место.

**A.** pm_league_screen_open — clean interface cue for a league standings table opening and revealing the player's own row in a language-learning app. A soft filtered swell rises for 500 milliseconds, then two celesta notes climb gently as the table settles into view, tail kept short. 1.2 seconds, dry, quiet, premium software feel.

**B.** pm_league_screen_open — warm reveal cue for a league table sliding open and highlighting the player's rank in a mobile learning game. Harp arpeggio rises across the table rows, closing on a light pizzicato-string confirm as the own row settles into place. 1.2 seconds, mono, gentle, in the family of the reward cues.

**C.** pm_league_screen_open — cinematic unveiling of a league standings hall as the player's position comes into focus. Airy string swell blooms underneath a rising celesta figure, widening gently as the table settles, warm and unhurried. 1.2 seconds, spacious, controlled decay.

### `pm_league_rank_move_v1` — 0.5 с, громкость 0.30
**Экран:** `app/league_screen.tsx` · Момент: строка игрока переехала вверх или вниз в таблице.

**A.** pm_league_rank_move — minimal interface tick for a player row sliding to a new position in a league table. A single short celesta note glides in pitch over 300 milliseconds, following the row's motion, resolving cleanly with no tail. 0.5 seconds, precise, quiet, dry.

**B.** pm_league_rank_move — warm pizzicato-string slide as a player's row moves up or down a league table in a mobile learning game. One plucked string note bends smoothly through the motion, settling on a small resolved pluck. 0.5 seconds, mono, light, encouraging without being loud.

**C.** pm_league_rank_move — cinematic glide as a player's standing shifts within a league hall. A thin string harmonic slides across the pitch of the movement, catching a faint glassy overtone at the landing point. 0.5 seconds, delicate, clean decay.

### `pm_league_zone_enter_v1` — 0.8 с, громкость 0.36
**Экран:** `app/league_screen.tsx` · Момент: игрок попал в зону повышения — строка подсветилась.

**A.** pm_league_zone_enter — bright interface confirm for a player's row entering the promotion zone of a league table, highlighting in the app. Two celesta notes rise across 350 milliseconds, then warm strings bloom underneath at 500 milliseconds and hold briefly. 0.8 seconds, clean, optimistic, premium.

**B.** pm_league_zone_enter — warm reward cue for a player crossing into the promotion zone of a league standings screen in a mobile learning game. Harp glissando climbs into a plucked-string confirm chord, matching the family of the current reward cues. 0.8 seconds, mono, bright but not loud.

**C.** pm_league_zone_enter — cinematic lift as a player's row rises into the promotion zone of a league hall. Warm strings swell upward with a light celesta sparkle riding the top, settling into a calm glowing resolution. 0.8 seconds, elegant, controlled tail.

### `pm_league_zone_risk_v1` — 0.8 с, громкость 0.30
**Экран:** `app/league_screen.tsx` · Момент: игрок попал в зону вылета. Тревога без унижения.

**A.** pm_league_zone_risk — restrained interface cue marking a player's row entering the relegation zone of a league table, informative rather than punishing. A low clarinet tone dips gently across 400 milliseconds, joined by soft low strings that settle into a steady, unresolved hold. 0.8 seconds, quiet, dry, no harshness anywhere.

**B.** pm_league_zone_risk — warm cautionary cue for a player slipping into the drop zone of a league standings screen in a mobile learning game, supportive rather than shaming. Low bassoon phrase descends briefly, met by soft low strings, closing on a calm, open note rather than a stinger. 0.8 seconds, mono, gentle, encouraging tone underneath the warning.

**C.** pm_league_zone_risk — cinematic moment of quiet concern as a player's position slips toward relegation in a league hall, dignified rather than harsh. Low strings and a soft clarinet line move downward together with restraint, settling into a grounded, unresolved sustain. 0.8 seconds, weighty but never mocking, clean low end.

### `pm_friend_invite_sent_v1` — 0.7 с, громкость 0.32
**Экран:** `app/arena_invite.tsx`, `app/referrals.tsx` · Момент: приглашение другу отправлено.

**A.** pm_friend_invite_sent — clean interface cue for a friend invitation being sent from a language-learning app. A single bright celesta note launches upward over 250 milliseconds with a light airy trail, ending in a soft clean decay. 0.7 seconds, precise, dry, feels like something departing successfully.

**B.** pm_friend_invite_sent — warm outgoing cue for an invite being sent to a friend in a mobile learning game. A plucked harp note rises and floats outward with a gentle shimmer tail, closing softly. 0.7 seconds, mono, friendly, in the family of the reward cues.

**C.** pm_friend_invite_sent — cinematic dispatch moment as an invitation leaves the screen toward a friend. A celesta arpeggio lifts and trails off into airy space, warm strings underneath giving it gentle weight as it fades. 0.7 seconds, light, controlled decay.

### `pm_friend_accepted_v1` — 1.0 с, громкость 0.42
**Экран:** `app/(tabs)/friends.tsx` · Момент: друг принял приглашение, связь установлена.

**A.** pm_friend_accepted — warm interface confirm for a friend connection being established after an invitation is accepted in a learning app. Two celesta notes answer each other across 400 milliseconds, then warm strings bloom together at 600 milliseconds, holding in a settled, connected chord. 1.0 second, clean, premium, no tail.

**B.** pm_friend_accepted — friendly reward cue for two players becoming connected after accepting a friend invite in a mobile learning game. Harp and pizzicato strings answer each other in a short rising call-and-response, closing on a warm joined chord. 1.0 second, mono, in the family of the reward cues, welcoming.

**C.** pm_friend_accepted — cinematic bonding moment as two players' paths join in a friend connection. Warm strings rise from two directions and meet in the middle at 600 milliseconds, blooming into a single resonant chord with a soft celesta glint on top. 1.0 second, intimate, controlled tail.

### `pm_friend_high_five_v1` — 0.5 с, громкость 0.36
**Экран:** `app/(tabs)/friends.tsx` · Момент: пользователь отправил другу «дай пять».

**A.** pm_friend_high_five — quick bright interface tap for sending a high-five to a friend in a learning app. A short celesta double-note strikes in close succession over 180 milliseconds, closing on a small clean ring. 0.5 seconds, playful but restrained, dry, no tail.

**B.** pm_friend_high_five — cheerful pizzicato-string tap cue for a friendly high-five sent between players in a mobile learning game. Two plucked string notes strike together brightly, closing on a light resolved pluck. 0.5 seconds, mono, warm, in the family of the reward cues.

**C.** pm_friend_high_five — cinematic light impact as two friends connect with a high-five gesture on screen. A bright celesta strike meets a soft warm string pluck at the same instant, ringing briefly before a clean decay. 0.5 seconds, tight, energetic without being loud.

### `pm_together_level_up_v1` — 1.4 с, громкость 0.50
**Экран:** `components/friends_together/` · Момент: уровень дружбы вырос.

**A.** pm_together_level_up — premium interface cue for a friendship level increasing between two players in a learning app. The signature three-note motif at reward scale rises through celesta, met by warm strings blooming underneath at 700 milliseconds, holding in a settled glow. 1.4 seconds, clean, no harsh peak, feels earned.

**B.** pm_together_level_up — warm reward fanfare for a friendship bond leveling up in a mobile learning game. The signature three-note motif rises across harp and pizzicato strings, closing on a bright sustained chord with a light shimmer tail. 1.4 seconds, mono, joyful, in the family of the reward cues.

**C.** pm_together_level_up — cinematic milestone moment as a friendship deepens to a new level. The signature three-note motif climbs through warm strings and celesta together, blooming into a full resonant chord with a gentle gold-toned shimmer. 1.4 seconds, elegant, controlled decay.

### `pm_referral_reward_v1` — 1.3 с, громкость 0.48
**Экран:** `app/referrals.tsx` · Момент: друг активировался, награда за приглашение выдана.

**A.** pm_referral_reward — premium interface cue for a referral reward being granted after an invited friend activates their account in a learning app. Two celesta notes rise cleanly over 450 milliseconds, then warm strings bloom underneath at 650 milliseconds, settling into a full confirmed chord. 1.3 seconds, precise, generous, no tail.

**B.** pm_referral_reward — warm reward-unlock cue for a referral bonus arriving after a friend joins in a mobile learning game. Harp arpeggio rises into a bright pizzicato-string burst, closing on a satisfied sustained chord, matching the current reward-cue family. 1.3 seconds, mono, celebratory but controlled.

**C.** pm_referral_reward — cinematic arrival of a referral reward as an invited friend becomes active. Warm strings swell with a rising celesta figure on top, blooming at 650 milliseconds into a rich, generous resolution with soft gold-toned air. 1.3 seconds, weighty, controlled tail.

### `pm_tops_reveal_v1` — 1.1 с, громкость 0.34
**Экран:** `app/arena_tops.tsx` · Момент: открылась таблица лучших игроков, топ-3 подсветились.

**A.** pm_tops_reveal — clean interface cue for a leaderboard opening with the top three players highlighting in sequence in a learning app. Three celesta notes climb in pitch at even intervals across 600 milliseconds, resolving into a soft sustained tone. 1.1 seconds, precise, dry, premium dashboard feel.

**B.** pm_tops_reveal — warm reveal cue for a top-players leaderboard opening and spotlighting its top three in a mobile learning game. Harp notes rise one after another for each highlighted rank, closing on a bright confirming chime. 1.1 seconds, mono, in the family of the reward cues, celebratory but measured.

**C.** pm_tops_reveal — cinematic unveiling of a leaderboard as its top three ranks light up in turn. Three warm string arrivals rise in pitch with a faint celesta shimmer on each, blooming into a wide, settled resolution. 1.1 seconds, prestigious, controlled decay.

---

# 9. Уроки: обвязка вокруг сессии

### `pm_lessons_list_open_v1` — 0.9 с, громкость 0.22
**Экран:** `app/lessons_list.tsx`, `app/(tabs)/lessons.tsx` · Момент: открылся список уроков, видна дорожка прогресса.

**A.** pm_lessons_list_open — quiet interface cue for the lessons list opening and revealing the progress path in a learning app. A soft filtered swell rises for 400 milliseconds, then a single clean celesta note settles as the path comes into view. 0.9 seconds, dry, understated, premium software feel.

**B.** pm_lessons_list_open — gentle reveal cue for a lesson path unfolding on screen in a mobile learning game. A light harp glissando rises and settles on a soft plucked-string note, calm and welcoming. 0.9 seconds, mono, quiet, in the family of the reward cues but subdued.

**C.** pm_lessons_list_open — cinematic unveiling of a learning path as it comes into view. A soft airy string swell rises gently with a faint celesta glint at the top, settling into a calm open resolution. 0.9 seconds, spacious, controlled decay.

### `pm_lesson_unlock_v1` — 1.1 с, громкость 0.46
**Экран:** `app/lessons_list.tsx` · Момент: следующий урок разблокирован, замок открылся.

**A.** pm_lesson_unlock — bright interface cue for the next lesson unlocking on the learning path in a language app. The signature three-note motif at reward scale rises through celesta, then warm strings bloom underneath at 550 milliseconds and hold in a settled glow. 1.1 seconds, clean, no tail, feels like a door opening in expensive software.

**B.** pm_lesson_unlock — warm unlock fanfare for a new lesson opening up in a mobile learning game. The signature three-note motif climbs through harp and pizzicato strings, closing on a bright sustained chord with a light shimmer, in the family of the current reward cues. 1.1 seconds, mono, celebratory but controlled.

**C.** pm_lesson_unlock — cinematic reveal as a new lesson opens on a learner's path. The signature three-note motif rises through warm strings and celesta together, blooming into a full resonant chord with a gentle gold-toned shimmer at the top. 1.1 seconds, elegant, controlled tail.

### `pm_lesson_locked_v1` — 0.45 с, громкость 0.24
**Экран:** `app/lessons_list.tsx` · Момент: пользователь нажал на закрытый урок.

**A.** pm_lesson_locked — minimal interface cue for tapping a still-locked lesson on the learning path in a language app. A single soft low clarinet tone sounds briefly and fades, calm and neutral, no rise in pitch. 0.45 seconds, quiet, dry, informative rather than negative.

**B.** pm_lesson_locked — gentle not-yet cue for tapping a locked level in a mobile learning game. A low bassoon note sounds once, warm and brief, closing softly without any buzz or harshness. 0.45 seconds, mono, calm, never punishing.

**C.** pm_lesson_locked — cinematic soft deflection as a learner taps a lesson that is not yet available. A low string tone with a faint clarinet color sounds once and settles, restrained and grounded. 0.45 seconds, quiet, clean decay, no tension.

### `pm_lesson_menu_open_v1` — 0.7 с, громкость 0.24
**Экран:** `app/lesson_menu.tsx` · Момент: открылось меню урока с выбором активностей.

**A.** pm_lesson_menu_open — clean interface cue for a lesson menu opening with a choice of activities in a learning app. A soft celesta note rises over 250 milliseconds into a light sustained tone, settling calmly. 0.7 seconds, dry, precise, premium software feel.

**B.** pm_lesson_menu_open — warm reveal cue for an activity menu opening inside a lesson in a mobile learning game. A short harp arpeggio rises and settles on a gentle plucked-string note. 0.7 seconds, mono, inviting, in the family of the reward cues but quiet.

**C.** pm_lesson_menu_open — cinematic unfolding of a lesson's activity choices coming into view. A soft warm string swell rises briefly with a faint celesta glint, settling into an open, unhurried resolution. 0.7 seconds, light, controlled decay.

### `pm_theory_page_turn_v1` — 0.4 с, громкость 0.24
**Экран:** `app/lesson_theory_v2.tsx`, `app/lesson_help_theory_ui.tsx` · Момент: перелистнулась страница теории.

**A.** pm_theory_page_turn — minimal interface tick for a theory page turning to the next screen in a learning app. A single short celesta note glides briefly upward and settles, clean and quiet. 0.4 seconds, dry, precise, no tail.

**B.** pm_theory_page_turn — light pizzicato-string flick as a theory page turns in a mobile learning game. One plucked string note moves quickly and settles on a soft resolved pluck. 0.4 seconds, mono, gentle, unobtrusive.

**C.** pm_theory_page_turn — cinematic soft transition as a page of theory turns over. A brief airy celesta glide catches a faint string harmonic underneath, fading cleanly. 0.4 seconds, delicate, controlled decay.

### `pm_words_reveal_v1` — 0.5 с, громкость 0.28
**Экран:** `app/lesson_words.tsx` · Момент: показано значение нового слова.

**A.** pm_words_reveal — clean interface cue for a new word's meaning being revealed in a vocabulary exercise. A bright glass-harmonica note rises over 200 milliseconds and settles into a short clear ring. 0.5 seconds, dry, precise, feels like a small flash of knowledge.

**B.** pm_words_reveal — warm discovery cue for a new word's definition appearing in a mobile learning game. A celesta note sparkles upward and settles on a light bell-like resolution. 0.5 seconds, mono, curious and bright, in the family of the reward cues.

**C.** pm_words_reveal — cinematic small illumination as a word's meaning is unveiled. A glass-harmonica tone rises with a faint airy shimmer, settling into a clean, delicate resolution. 0.5 seconds, intimate, controlled decay.

### `pm_verbs_form_correct_v1` — 0.45 с, громкость 0.34
**Экран:** `app/lesson_verbs.tsx`, `app/lesson_irregular_verbs.tsx` · Момент: верная форма неправильного глагола подтверждена.

**A.** pm_verbs_form_correct — clean interface confirm for the correct form of an irregular verb being confirmed in a grammar exercise. A pizzicato-string note rises quickly over 180 milliseconds and settles into a short clear resolution. 0.45 seconds, dry, precise, no tail.

**B.** pm_verbs_form_correct — warm correct-answer cue for an irregular verb form confirmed in a mobile learning game. A bright plucked harp note answers with a small confirming chime, in the family of the reward cues. 0.45 seconds, mono, satisfying, quick.

**C.** pm_verbs_form_correct — cinematic small resolution as the correct verb form settles into place. A warm pizzicato-string pluck meets a faint celesta glint, resolving cleanly within a tight decay. 0.45 seconds, restrained, precise.

### `pm_preposition_snap_v1` — 0.35 с, громкость 0.30
**Экран:** `app/preposition_drill.tsx` · Момент: предлог встал в правильный слот предложения.

**A.** pm_preposition_snap — minimal interface snap for a preposition locking into the correct slot of a sentence in a grammar drill. A short bright pizzicato-string pluck strikes once and resolves instantly. 0.35 seconds, dry, precise, no tail, feels like a piece fitting exactly.

**B.** pm_preposition_snap — quick satisfying snap cue for a word sliding into its correct place in a mobile learning game. A crisp harp pluck strikes with a small bright resolve, in the family of the reward cues. 0.35 seconds, mono, tight, playful but restrained.

**C.** pm_preposition_snap — cinematic precise click as a word settles exactly into its grammatical place. A tight pizzicato-string strike catches a faint celesta glint at the same instant, resolving cleanly. 0.35 seconds, sharp, controlled, no smear.

### `pm_mistake_practice_start_v1` — 1.0 с, громкость 0.28
**Экран:** `app/mistake_practice_session.tsx` · Момент: начата тренировка на своих ошибках. Тон поддерживающий, не карающий.

**A.** pm_mistake_practice_start — calm, supportive interface cue for beginning a practice session built from a learner's own past mistakes, encouraging rather than corrective. Warm strings rise gently for 500 milliseconds, joined by a soft celesta note that settles the phrase into an open, welcoming hold. 1.0 second, dry, gentle, never sounds like a warning.

**B.** pm_mistake_practice_start — warm encouraging cue for starting a mistakes-review session in a mobile learning game, framed as a fresh chance rather than a penalty. A soft harp arpeggio rises into a warm pizzicato-string chord, settling calmly, matching the gentler end of the reward-cue family. 1.0 second, mono, reassuring, upbeat but quiet.

**C.** pm_mistake_practice_start — cinematic supportive opening as a learner returns to face their past mistakes with quiet confidence. Warm strings swell softly with a gentle celesta thread on top, resolving into a settled, hopeful tone. 1.0 second, tender, controlled decay, no tension in the low end.

### `pm_mistake_fixed_v1` — 0.9 с, громкость 0.42
**Экран:** `app/mistake_practice_session.tsx` · Момент: ранее допущенная ошибка исправлена — маленькое личное искупление.

**A.** pm_mistake_fixed — warm interface confirm for a previously made mistake being corrected during a mistakes-review session, a small personal redemption. Two celesta notes rise across 350 milliseconds, then warm strings bloom underneath at 550 milliseconds and hold in a settled, glowing chord. 0.9 seconds, clean, no tail, feels quietly earned.

**B.** pm_mistake_fixed — warm reward cue for successfully correcting a past mistake in a mobile learning game. A pizzicato-string phrase rises into a bright harp resolve, closing on a warm satisfied chord, in the family of the current reward cues. 0.9 seconds, mono, uplifting, personal.

**C.** pm_mistake_fixed — cinematic moment of quiet redemption as an old mistake is finally corrected. Warm strings rise and bloom around a soft celesta figure, settling into a full, gentle resolution with a faint gold-toned glow. 0.9 seconds, tender, controlled tail, emotionally warm.
# 10. Настройки, онбординг и системные экраны

Инструменты раздела: **пиццикато и челеста** для переключателей, **арфа** для
подтверждений, **тёплые струнные** для выбора языка и применённой темы,
**низкие струнные** для приватности.

---

### `pm_settings_toggle_on_v1` — 0.28 с, громкость 0.24
**Экран:** `app/(tabs)/settings.tsx` и все экраны настроек · Момент: переключатель включён.

**A.** pm_settings_toggle_on — precise interface cue for a settings switch turning on. Single pizzicato string note with a small upward step and an immediate clean stop. 280 milliseconds, machined, confident, unmistakably the on direction.

**B.** pm_settings_toggle_on — warm switch-on tap in a mobile app. Bright celesta note struck lightly at the top of its range with a faint harp overtone beneath. 280 milliseconds, tactile, reassuring.

**C.** pm_settings_toggle_on — refined toggle engaging in a premium interface. Muted glass tone with a faint low bloom rising under it. 280 milliseconds, weighty for its size, quick decay.

### `pm_settings_toggle_off_v1` — 0.28 с, громкость 0.22
**Экран:** экраны настроек · Момент: переключатель выключен. Зеркало предыдущего звука.

**A.** pm_settings_toggle_off — precise interface cue for a settings switch turning off, the exact mirror of the on cue. Single pizzicato note stepping down instead of up, slightly duller and shorter. 280 milliseconds, clean, mechanical, directional.

**B.** pm_settings_toggle_off — warm switch-off tap in a mobile app. Celesta note a whole tone below the on cue, damped a touch faster. 280 milliseconds, tidy, gentle.

**C.** pm_settings_toggle_off — refined toggle disengaging in a premium interface. Low muted glass tone settling downward with a faint release. 280 milliseconds, understated, restrained.

### `pm_theme_preview_v1` — 0.6 с, громкость 0.30
**Экран:** `app/settings_themes.tsx` · Момент: пользователь примеряет тему, палитра всего приложения меняется на лету.

**A.** pm_theme_preview — interface cue for an entire colour theme sweeping across the app during preview. Harp glissando running upward through a warm string pad that shifts tone colour as it passes. 600 milliseconds, transformative, like light changing temperature.

**B.** pm_theme_preview — playful palette-swap cue in a mobile app. Quick celesta run with a shimmering glass tail and a soft landing note. 600 milliseconds, magical, cheerful, light.

**C.** pm_theme_preview — cinematic wash of new colour across an interface. Airy string sweep with a subtle spectral shift and a clean bell settling at the end. 600 milliseconds, elegant, luminous.

### `pm_theme_applied_v1` — 0.9 с, громкость 0.38
**Экран:** `app/settings_themes.tsx` · Момент: тема выбрана окончательно и применена.

**A.** pm_theme_applied — confident confirmation for a theme being committed across the app. Two celesta notes rising onto a warm sustained string chord that holds and releases cleanly. 900 milliseconds, decisive, satisfying.

**B.** pm_theme_applied — warm confirm cue for an applied visual theme. Harp pair with a bright glass sparkle settling above them. 900 milliseconds, cheerful, rewarding.

**C.** pm_theme_applied — cinematic settling of a new visual identity. Warm string swell with a clean bell resolving above it and a soft breath of air behind. 900 milliseconds, refined, premium.

### `pm_language_selected_v1` — 1.0 с, громкость 0.40
**Экран:** `app/language_welcome.tsx`, `app/settings_language.tsx` · Момент: выбран язык изучения, вся жизнь в приложении переключилась.

**A.** pm_language_selected — premium confirmation for choosing a learning language. The signature three-note motif at reward scale on celesta, resolving onto warm strings that open wide underneath. 1 second, significant, marking a real commitment.

**B.** pm_language_selected — welcoming cue for picking a language in a mobile learning app. Harp arpeggio rising through five notes onto a warm bell landing with light shimmer. 1 second, joyful, inviting.

**C.** pm_language_selected — cinematic doorway opening onto a new language. String swell with a single soft horn note entering at the peak and a celesta figure sparkling across the resolution. 1 second, momentous, controlled tail.

### `pm_notifications_enabled_v1` — 0.8 с, громкость 0.34
**Экран:** `app/settings_notifications.tsx`, `components/NotificationPermissionModal.tsx` · Момент: пользователь разрешил уведомления.

**A.** pm_notifications_enabled — clean confirmation for notification permission being granted. Two clear celesta notes stepping up onto a stable held string tone. 800 milliseconds, trustworthy, reassuring rather than celebratory.

**B.** pm_notifications_enabled — friendly channel-open cue for enabled notifications. Bright glass harmonic pair with a warm harp settle beneath. 800 milliseconds, cheerful, light.

**C.** pm_notifications_enabled — cinematic soft chime for an opened channel of communication. Single clean bell strike with a faint warm string bloom behind it. 800 milliseconds, elegant, calm.

### `pm_privacy_consent_v1` — 0.9 с, громкость 0.30
**Экран:** `app/privacy_settings.tsx`, `app/privacy_screen.tsx` · Момент: пользователь принял или изменил настройку приватности.

**A.** pm_privacy_consent — neutral formal confirmation for a privacy preference being recorded. Single sustained mid string tone with a quiet celesta touch sealing it at 700 milliseconds. 900 milliseconds, businesslike, deliberately unemotional.

**B.** pm_privacy_consent — plain warm confirm cue for a privacy setting in a mobile app. Muted harp note with a firm low pad underneath. 900 milliseconds, calm, matter-of-fact.

**C.** pm_privacy_consent — cinematic quiet seal on a recorded consent. Low string tone with a faint metallic sheen fading above it. 900 milliseconds, weighty, respectful.

### `pm_survey_submitted_v1` — 1.1 с, громкость 0.40
**Экран:** `app/survey_screen.tsx`, `app/ideas_submit.tsx` · Момент: пользователь отправил опрос или идею.

**A.** pm_survey_submitted — appreciative confirmation for feedback being submitted. Rising celesta figure with a warm string bloom arriving at 700 milliseconds and holding briefly. 1.1 seconds, feels like being heard.

**B.** pm_survey_submitted — warm thank-you cue for submitted feedback in a mobile app. Cheerful harp run with a soft bell settle and a light air movement departing. 1.1 seconds, friendly, grateful.

**C.** pm_survey_submitted — cinematic acknowledgement of a sent message. Warm string lift with a clean bell resolving and a gentle fade. 1.1 seconds, gracious, premium.

### `pm_onboarding_step_v1` — 0.4 с, громкость 0.26
**Экран:** `components/onboarding_aha/`, `components/OnboardingWelcomeSheet.tsx` · Момент: шаг онбординга сменился.

**A.** pm_onboarding_step — forward-motion cue for advancing through an onboarding step. Two pizzicato notes stepping upward with a light celesta touch on the second. 400 milliseconds, progressive, welcoming.

**B.** pm_onboarding_step — friendly step cue in a mobile app onboarding flow. Warm harp pluck with a small upward bend and a soft glass tap. 400 milliseconds, cheerful, encouraging.

**C.** pm_onboarding_step — cinematic step forward in a guided introduction. Soft string push with a faint clean tone landing. 400 milliseconds, elegant, light.

### `pm_app_update_ready_v1` — 0.9 с, громкость 0.32
**Экран:** `components/UpdateModal.tsx`, `components/ReleaseNotesModal.tsx` · Момент: доступно обновление приложения.

**A.** pm_app_update_ready — informative cue for an available app update. Two celesta notes rising a fourth with a faint digital shimmer trailing behind them. 900 milliseconds, fresh, neutral, modern.

**B.** pm_app_update_ready — bright news cue for a new version in a mobile app. Glass harmonic pair with a soft harp sparkle rising. 900 milliseconds, friendly, upbeat.

**C.** pm_app_update_ready — cinematic soft announcement of something new. Airy string lift with a clean bell tone settling above. 900 milliseconds, refined, calm.

---

# 11. Модалки, шторки и тосты

Инструменты раздела: **арфа и стеклянные гармоники** для слоёв,
**низкие струнные** для необратимых действий. Эти звуки повторяются чаще всего —
они самые сдержанные в документе.

---

### `pm_modal_open_v1` — 0.45 с, громкость 0.22
**Экран:** любая модалка раскрылась поверх экрана (72 компонента).

**A.** pm_modal_open — universal interface cue for a modal layer expanding over the current screen. Soft harp harmonic rising with a faint sustained string tone behind it. 450 milliseconds, weightless, neutral, working identically under dozens of different panels.

**B.** pm_modal_open — warm panel-open cue for a popup in a mobile app. Light celesta touch with a gentle air movement lifting it. 450 milliseconds, friendly, reusable.

**C.** pm_modal_open — cinematic layer rising into view. Airy string lift with a faint crystalline edge at the top. 450 milliseconds, elegant, unobtrusive.

### `pm_modal_close_v1` — 0.4 с, громкость 0.20
**Экран:** модалка закрылась, вернулся нижний экран.

**A.** pm_modal_close — universal interface cue for a modal layer collapsing away, the mirror of the open cue. Harp harmonic descending with the string tone easing out beneath. 400 milliseconds, quieter by design, tidy.

**B.** pm_modal_close — warm panel-close cue for dismissing a popup. Celesta touch a tone lower with a soft settle. 400 milliseconds, gentle, finished.

**C.** pm_modal_close — cinematic layer sinking back out of view. Soft string fall with a faint low landing. 400 milliseconds, calm, refined.

### `pm_sheet_snap_v1` — 0.35 с, громкость 0.24
**Экран:** нижняя шторка встала в свою позицию после перетаскивания.

**A.** pm_sheet_snap — precise cue for a bottom sheet snapping to its detent position. Single pizzicato note damped instantly with a faint low body underneath. 350 milliseconds, mechanical, physical, satisfying.

**B.** pm_sheet_snap — warm snap for a bottom sheet locking into its position in a mobile app. Muted celesta note with a rounded low resonance. 350 milliseconds, tactile, tidy.

**C.** pm_sheet_snap — cinematic magnetic detent for a settling panel. Firm muted glass tone with a faint pull underneath. 350 milliseconds, weighty, premium.

### `pm_confirm_positive_v1` — 0.6 с, громкость 0.32
**Экран:** `components/ThemedConfirmModal.tsx`, `components/ThemedChoiceModal.tsx` · Момент: пользователь подтвердил безопасное действие.

**A.** pm_confirm_positive — clean confirmation for an approved safe action. Two celesta notes rising into a short bright resolution with a warm string touch behind. 600 milliseconds, decisive, agreeable.

**B.** pm_confirm_positive — warm yes-cue for confirming an action in a mobile app. Bright harp pair with a soft bell tail. 600 milliseconds, friendly, positive.

**C.** pm_confirm_positive — cinematic assent for a confirmed choice. Clean bell tone with a faint warm bloom rising behind it. 600 milliseconds, composed, premium.

### `pm_confirm_destructive_v1` — 0.7 с, громкость 0.34
**Экран:** `components/DeleteAccountConfirmModal.tsx` и другие удаления · Момент: подтверждено необратимое действие.

**A.** pm_confirm_destructive — grave confirmation for an irreversible action. Single low string note descending with a slow damping and a final muted celesta touch. 700 milliseconds, sober, respectful of the moment, free of drama.

**B.** pm_confirm_destructive — measured cue for a permanent deletion in a mobile app. Low bassoon note settling downward with a soft muted landing. 700 milliseconds, serious, warm, never punishing.

**C.** pm_confirm_destructive — cinematic weight of an irreversible decision. Deep low strings with a slow air release above them. 700 milliseconds, grave, dignified, controlled tail.

### `pm_toast_neutral_v1` — 0.35 с, громкость 0.20
**Экран:** `components/InGameToast.tsx`, `components/CoachToast.tsx` · Момент: появилась нейтральная информационная плашка.

**A.** pm_toast_neutral — very light cue for a neutral informational toast sliding in. Single soft harp harmonic with almost no movement in pitch. 350 milliseconds, extremely restrained, interrupting nothing.

**B.** pm_toast_neutral — small warm notice tap for an info banner in a mobile app. Muted celesta touch with a soft tail. 350 milliseconds, friendly, unobtrusive.

**C.** pm_toast_neutral — cinematic whisper-light notice cue. Faint string breath with a hint of glass above it. 350 milliseconds, delicate, present but undemanding.

---

# 12. Навигация и оболочка приложения

Самые частые звуки приложения. Инструменты: **челеста в верхнем регистре**
и **приглушённое пиццикато** — то, что звучит десятки раз за сессию, обязано
быть почти незаметным.

---

### `pm_tab_switch_v1` — 0.25 с, громкость 0.16
**Экран:** `app/(tabs)/_layout.tsx`, `app/TabSlider.tsx` · Момент: пользователь переключил вкладку. Очень тихий, звучит десятки раз за сессию.

**A.** pm_tab_switch — near-subliminal cue for switching between main tabs. Single celesta note at the very top of its range, struck softly and stopping at once. 250 milliseconds, extremely quiet, engineered to stay pleasant across hundreds of repeats in one session.

**B.** pm_tab_switch — tiny warm tab tap in a mobile app navigation bar. Muted pizzicato touch with all attack softened. 250 milliseconds, light, repeatable.

**C.** pm_tab_switch — cinematic micro-detent for a navigation change. Faint glass harmonic with a whisper of air. 250 milliseconds, delicate, refined.

### `pm_nav_back_v1` — 0.3 с, громкость 0.18
**Экран:** возврат на предыдущий экран.

**A.** pm_nav_back — minimal cue for navigating back to a previous screen. Soft harp harmonic drifting downward in pitch and fading. 300 milliseconds, quiet, directional, the reverse of moving forward.

**B.** pm_nav_back — soft back-step cue in a mobile app. Muted celesta note a tone below the forward cue with a light settle. 300 milliseconds, friendly, unobtrusive.

**C.** pm_nav_back — cinematic soft retreat between screens. Faint reversed string breath with a low settle. 300 milliseconds, elegant, quiet.

### `pm_pull_refresh_v1` — 0.5 с, громкость 0.24
**Экран:** пользователь потянул список вниз и запустил обновление.

**A.** pm_pull_refresh — cue for a pull-to-refresh gesture triggering a reload. Harp harmonic bending upward under tension for 300 milliseconds, then releasing into a clean settling note. 500 milliseconds, elastic, physical.

**B.** pm_pull_refresh — playful stretch-and-release cue for refreshing a list in a mobile app. Celesta note pitched up as the list is pulled, springing back with a bright landing. 500 milliseconds, fun, tactile.

**C.** pm_pull_refresh — cinematic tension and release for a refresh gesture. String glissando rising and easing back with a soft clean resolution. 500 milliseconds, physical, premium.

### `pm_content_loaded_v1` — 0.4 с, громкость 0.20
**Экран:** данные подгрузились, скелетон сменился реальным содержимым.

**A.** pm_content_loaded — light cue for skeleton placeholders resolving into real content. Soft string tone opening with a single quiet celesta touch settling on top. 400 milliseconds, signalling readiness without celebration.

**B.** pm_content_loaded — small warm cue for loaded content in a mobile app. Gentle harp note with a soft bloom behind it. 400 milliseconds, friendly, understated.

**C.** pm_content_loaded — cinematic soft materialisation of loaded content. Faint air bloom with a clean low settle. 400 milliseconds, refined, quiet.

---

# 13. Арена и самая редкая награда

Промпты для 29 звуков Арены лежат отдельно: `docs/arena/SOUND_PROMPTS.md`.
Они написаны в старой манере и требуют перевода в эту систему — см. примечание
в конце документа. Ниже — единственный звук общего реестра без файла.

### `pm_reward_vip_finale_v1` — 1.85 с, громкость 0.64
**Экран:** финальный аккорд VIP-распаковки — самое редкое и дорогое событие в приложении.

**A.** pm_reward_vip_finale — the most premium ceremony in the entire app, played at the final beat of a VIP reward unboxing. The signature motif at ceremony scale: celesta states the three notes over a wide warm string bed, a soft horn carries the resolution, and glass harmonics cascade above it. 1.85 seconds, immaculate, rarer and more valuable than any other sound in the product.

**B.** pm_reward_vip_finale — grand reward finale for the rarest prize in a mobile learning app. Harp and bell fanfare rising in three waves with a golden shimmer shower and a warm brass landing. 1.85 seconds, exuberant, generous, unmistakably the top prize.

**C.** pm_reward_vip_finale — cinematic coronation for the rarest possible reward. Full horn and string swell with a choir pad opening behind it, a single deep timpani stroke on the downbeat, and a cascading celesta resolution above. 1.85 seconds, majestic, glorious, tail kept controlled.

---

# 14. Опциональный слой: озвучка нажатий

Владелец ранее убрал звук нажатий, оставив только вибрацию. Эти три звука —
на случай, если решите вернуть. Самые тихие в документе.

### `pm_ui_press_v1` — 0.12 с, громкость 0.14
**Экран:** любое нажатие на кнопку или интерактив во всём приложении.

**A.** pm_ui_press — the lightest possible press cue for a button in a premium learning app, played on every tap so it must remain pleasant after thousands of repeats. Single celesta note at the very top of its range, struck softly and stopping immediately. 120 milliseconds, delicate, felt more than heard.

**B.** pm_ui_press — minimal warm tap cue for any button in a mobile app. Muted harp harmonic with almost all attack removed. 120 milliseconds, rounded, unobtrusive.

**C.** pm_ui_press — refined micro-contact for a universal press. Faint pizzicato touch damped instantly. 120 milliseconds, subtle, expensive.

### `pm_ui_tile_v1` — 0.14 с, громкость 0.13
**Экран:** нажатие на плитку/букву в игровых заданиях, где сейчас только вибрация.

**A.** pm_ui_tile — ultra-light cue for tapping a letter tile in a word exercise. Muted pizzicato touch with the pitch centre softened almost away, designed for rapid repeated tapping. 140 milliseconds, neutral, unfatiguing.

**B.** pm_ui_tile — tiny warm tile tap in a mobile word game. Soft celesta touch damped the instant it sounds. 140 milliseconds, light, tactile.

**C.** pm_ui_tile — cinematic micro-tap of a tile. Faint glass harmonic with a whisper of body. 140 milliseconds, organic, quiet.

### `pm_ui_disabled_v1` — 0.2 с, громкость 0.16
**Экран:** нажатие на заблокированный элемент — ничего не произойдёт.

**A.** pm_ui_disabled — soft cue for tapping a disabled control. Single low muted string touch with the pitch heavily damped and nothing resolving after it. 200 milliseconds, inert, communicating that nothing will happen, free of scolding.

**B.** pm_ui_disabled — gentle inactive-button cue in a mobile app. Low muted harp note with no lift in it. 200 milliseconds, soft, harmless.

**C.** pm_ui_disabled — cinematic dead contact on an inactive control. Muted low tone damped immediately. 200 milliseconds, inert, respectful.

---
