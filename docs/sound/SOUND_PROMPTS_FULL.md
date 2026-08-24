# Phraseman — полная озвучка приложения: аудит и промпты

Дата аудита: 2026-08-24
Генератор: **Adobe Firefly Sounds**
Реестр событий: `modules/audio/sound_events.ts`
Формат ключа: `pm.<семейство>.<событие>` → файл `assets/audio/sfx/v1/<семейство>/<имя>_v1.m4a`

---

## Как пользоваться этим документом

**Каждый промпт начинается с имени функции/события** — потому что Adobe кладёт
первые слова промпта в название скачиваемого файла. Скачали пачку файлов с
разными именами — по первым словам сразу видно, куда какой звук положить.

Порядок работы:

1. Нашли нужный звук в документе (разделы ниже идут по экранам приложения).
2. Взяли **один из трёх промптов** (A / B / C — три стиля, выбираете на слух).
3. Сгенерировали в Firefly, скачали файл.
4. Переименовали в `<имя файла>` из заголовка звука.
5. Положили в папку из заголовка.
6. Сказали мне — я подключу ключ в реестре одной строкой.

Три стиля во всех промптах:

- **A — интерфейсный.** Минимализм, чистый синтез, ощущение дорогого софта.
- **B — игровой.** Аркадная подача, тёплые тона, ближе к текущим звукам.
- **C — кинематографичный.** Премиальная подача, слой воздуха и веса.

Все промпты уникальны — ни один звук не повторяет другой ни описанием, ни
характером. Промпты на английском: Firefly заметно точнее понимает английские
описания звука.

**Технические требования ко всем файлам:** моно, 48 кГц, формат m4a (или mp3 —
сконвертирую), тишина в начале обрезана, нормализация −14 LUFS, пик −1 dBTP.

---

## Результат аудита: что озвучено и что нет

Проверено: 134 экрана в `app/`, 217 компонентов в корне `components/`,
35 папок компонентов, 80 модалок/тостов/шторок.

| Показатель | Значение |
|---|---|
| Событий в реестре `SOUND_EVENTS` | 89 |
| Из них **без звукового файла** (заглушка `null`) | **29** (вся Арена) |
| Экранов из 134, где **нет ни одного звука** | **111** |
| Модалок/тостов из 80, где **нет ни одного звука** | **72** |
| Файлов приложения, где звук вызывается | ~50 |

### Что уже озвучено плотно (эталон)

**Экран завершения урока** — `components/feedback/ResultsSequence.tsx` плюс
таймлайн в `components/feedback/results_sequence_motion_plan.ts`. Там озвучен
каждый шаг секвенции отдельным звуком:

медаль → звезда 1 → звезда 2 → звезда 3 → старт XP-каунтера → тики счётчика →
завершение счётчика → показ активной награды → распаковка подарка → показ
множителя → апгрейд множителя → финальный аккорд наград.

Именно эту плотность документ распространяет на всё остальное приложение.

Также озвучены: спин уровня (8 звуков), паки карточек, лига (повышение/
понижение/сундук), базовое обучение (верно/неверно/подсказка/таймер),
голосовые сигналы, системные тосты, энергия, стрик, награды.

### Что не озвучено вообще (крупные дыры)

| Раздел | Экранов без звука | Комментарий |
|---|---|---|
| **Арена** | 29 событий-заглушек | Ключи расставлены, файлов нет — звучит тишина |
| **Персональный план** | 13 | Целый продукт: настройка, теория, упражнения, квиз, финал |
| **Пейволы** | 9 (`paywall_a`…`paywall_g`, premium_modal ×2) | Ни один показ/выбор/покупка не озвучены |
| **MAX-звонок** | 8 | Прогрев, согласие, звонок, разбор, пейвол |
| **Диалоги с ИИ** | 5 | Каталог, бриф, согласие, сессия, вердикт |
| **Карточки (flashcards)** | 8 экранов | Каталог, паки, свайп, редактор, магазин |
| **Магазины и валюты** | 5 | Магазин, осколки, обмен монет, руны, сезонный пропуск |
| **Профиль и прогресс** | 7 | Достижения, коллекции, стрик, статистика, аккаунт |
| **Настройки** | 6 | Темы, язык, уведомления, приватность, подписка |
| **Соцчасть** | 6 | Клуб, лига, рефералы, приглашения, топы |
| **Уроки-обвязка** | 9 | Список уроков, меню, теория, слова, глаголы, помощь |
| **Онбординг** | 4 | Приветствие языка, старт, согласия |

---

## Важное ограничение: тап уже был отключён владельцем

В `app/feedback/feedback_kit.ts` стоит явное решение:

- `fk.tap()` — «ЗВУК-«писк» при нажатии кнопок убран совсем, остаётся только
  тактильный отклик»;
- `fk.pop()` — «звук 'pop' удалён»;
- `fk.wrong()` — звук ошибки убирался по просьбе владельца;
- `fk.transition()` — «звук 'whoosh' убран».

Это совпадает с правилом «хаптик на управляющих кнопках, НЕ на плитках».
Поэтому документ **не озвучивает каждое нажатие подряд**, а вместо этого даёт
плотную озвучку по смыслу: появления, переходы, вердикты, накопления, награды,
покупки, ошибки, завершения. Раздел 14 отдельно предлагает мягкий UI-слой из
трёх звуков для нажатий — включать его или нет, решаете вы: это прямой возврат
к тому, что раньше убрали.

---

# 1. Персональный план

Целая ветка продукта без единого звука: настройка плана, теория, упражнения,
квиз, переходы между заданиями, завершение задачи, финал плана.

Папка: `assets/audio/sfx/v1/plan/` · Семейство: `plan`

---

### `pm_plan_setup_open_v1` — 1.1 с, громкость 0.24
**Экран:** `app/personal_plan_setup.tsx` · Момент: открылся мастер настройки плана, пользователь впервые видит вопросы о своей цели.

**A.** pm_plan_setup_open — clean interface opening tone for a personal study plan setup wizard in a language-learning app, played the moment the first configuration question appears on screen. Two soft sine tones spaced a major second apart, gently fading in over 1.1 seconds, no percussion, no reverb tail, calm and inviting, sounds like an expensive productivity app preparing a blank page.

**B.** pm_plan_setup_open — friendly game-style opening chime for the study plan builder screen in a mobile language app. Warm marimba triad played softly upward, light bell shimmer on top, 1.1 seconds, dry and rounded, feels welcoming and unhurried, not fanfare-like.

**C.** pm_plan_setup_open — cinematic soft entrance for a personalized learning plan configuration screen. Distant warm string pad swelling gently with a single clean glass note resolving on top, 1.1 seconds, airy, premium, controlled short tail, evokes the calm before planning a journey.

### `pm_plan_setup_step_v1` — 0.36 с, громкость 0.26
**Экран:** `app/personal_plan_setup.tsx` · Момент: пользователь ответил на один вопрос настройки, мастер перелистнулся на следующий шаг.

**A.** pm_plan_setup_step — minimal UI advance cue for moving to the next question in a study plan setup wizard. Single crisp filtered blip with a short upward pitch step, 360 milliseconds, completely dry, neutral and precise, communicates progress without celebration.

**B.** pm_plan_setup_step — light arcade page-turn tick for advancing a step in a mobile learning setup flow. Quick soft wooden tap followed by a tiny plucked note, 360 milliseconds, warm and playful, no reverb, feels like flipping a card forward.

**C.** pm_plan_setup_step — refined cinematic step transition inside a planning wizard. Short airy swish with a subtle low body underneath and a faint metallic glint, 360 milliseconds, elegant, barely present but clearly felt.

### `pm_plan_ready_v1` — 1.6 с, громкость 0.46
**Экран:** `app/personal_plan.tsx` · Момент: план собран и впервые показан пользователю целиком.

**A.** pm_plan_ready — clean confident interface resolution for the moment a personalized study plan is fully assembled and revealed to the user. Three ascending sine notes resolving into a held major chord with a soft filter opening, 1.6 seconds, no reverb wash, modern and reassuring, sounds like a premium app confirming a plan is set.

**B.** pm_plan_ready — warm game reveal fanfare for a completed personal learning plan in a mobile app. Bright plucked synth arpeggio rising into a soft bell chord with a gentle shimmer tail, 1.6 seconds, encouraging and optimistic, arcade-warm but not loud.

**C.** pm_plan_ready — cinematic reveal for a personalized learning roadmap appearing on screen. Airy upward swell with soft horn warmth underneath resolving into a bright clean chord, 1.6 seconds, premium and hopeful, controlled tail, feels like a path lighting up ahead.

### `pm_plan_theory_open_v1` — 0.9 с, громкость 0.20
**Экран:** `app/personal_plan_theory.tsx` · Момент: открылась карточка теории перед упражнениями.

**A.** pm_plan_theory_open — quiet interface cue for a theory explanation card opening before exercises in a language app. Single soft sine note with a slow filter sweep opening underneath, 900 milliseconds, very restrained, dry, feels like a page settling into focus.

**B.** pm_plan_theory_open — gentle game-style book-open sound for a grammar explanation screen in a mobile learning app. Soft paper-like brush followed by a warm muted marimba note, 900 milliseconds, cozy and calm, no sharpness.

**C.** pm_plan_theory_open — cinematic soft focus-in for a theory card in a premium education app. Low airy breath layered with a distant glass tone fading in, 900 milliseconds, contemplative, spacious but short-tailed.

### `pm_plan_exercise_in_v1` — 0.3 с, громкость 0.22
**Экран:** `app/personal_plan_exercise.tsx` · Момент: новое упражнение выезжает на экран.

**A.** pm_plan_exercise_in — subtle UI transition for a new exercise card sliding into view in a personal study plan. Soft filtered swish with a faint pitched tail landing on a single note, 300 milliseconds, light, dry, unobtrusive.

**B.** pm_plan_exercise_in — light arcade card-in cue for a new practice task appearing in a mobile learning app. Quick warm whoosh ending in a small rounded pop, 300 milliseconds, friendly and snappy.

**C.** pm_plan_exercise_in — refined cinematic entrance for an exercise panel in a premium learning app. Short air sweep with gentle low weight beneath it, 300 milliseconds, smooth, elegant, no tail.

### `pm_plan_exercise_transition_v1` — 0.55 с, громкость 0.24
**Экран:** `app/personal_plan_exercise_transition.tsx` · Момент: промежуточный экран между двумя упражнениями, короткая передышка.

**A.** pm_plan_exercise_transition — clean interface breather cue between two exercises in a study plan. Soft descending pair of filtered sine notes with a gentle release, 550 milliseconds, neutral, dry, signals a small pause rather than an ending.

**B.** pm_plan_exercise_transition — warm arcade interlude tone between practice tasks in a mobile language game. Two mellow marimba notes falling a minor third with light air between them, 550 milliseconds, relaxed and friendly.

**C.** pm_plan_exercise_transition — cinematic exhale between exercises in a premium learning flow. Soft airy release with a faint warm pad underneath settling downward, 550 milliseconds, calm, breathing, short tail.

### `pm_plan_quiz_start_v1` — 1.0 с, громкость 0.28
**Экран:** `app/personal_plan_quiz.tsx` · Момент: начинается проверочный квиз плана.

**A.** pm_plan_quiz_start — focused interface cue announcing the start of a knowledge check inside a study plan. Two clean sine tones tightening upward with a subtle filter squeeze, 1 second, precise and dry, communicates focus without pressure.

**B.** pm_plan_quiz_start — arcade quiz-start signal for a mobile language learning app. Bright synth pluck rising quickly into a short held note with a light bell ping, 1 second, energetic but friendly, no aggression.

**C.** pm_plan_quiz_start — cinematic gathering cue before a comprehension test in a premium education app. Soft rising air with a faint low pulse and a clean bell strike on the peak, 1 second, attentive, controlled, no long tail.

### `pm_plan_task_done_v1` — 1.2 с, громкость 0.48
**Экран:** `app/personal_plan_task_done.tsx` · Момент: задача дня в плане закрыта.

**A.** pm_plan_task_done — clean confident completion tone for finishing a daily task in a personal study plan. Rising three-note sine figure resolving to a bright sustained note with a soft filter bloom, 1.2 seconds, dry, satisfying, premium software feel.

**B.** pm_plan_task_done — warm arcade task-complete jingle for a mobile learning app. Cheerful plucked melody of four quick notes with a small bell sparkle at the end, 1.2 seconds, rewarding and light, not a big fanfare.

**C.** pm_plan_task_done — cinematic small triumph for completing a study task in a premium app. Warm string swell with a clean glass bell resolving above it and a soft low thump underneath, 1.2 seconds, dignified, brief tail.

### `pm_plan_streak_step_v1` — 0.42 с, громкость 0.30
**Экран:** `app/personal_plan.tsx` · Момент: шкала прогресса плана делает шаг вперёд, один день закрашивается.

**A.** pm_plan_streak_step — minimal progress-tick for a study plan bar advancing one segment. Short clean sine blip with a subtle upward pitch and tiny filter click, 420 milliseconds, precise, dry, sounds like a slot locking into place.

**B.** pm_plan_streak_step — arcade progress step for a learning streak bar filling one notch in a mobile app. Small bright plucked note with a soft wooden knock underneath, 420 milliseconds, warm, satisfying, snappy.

**C.** pm_plan_streak_step — cinematic notch-lock for a progress track advancing in a premium learning app. Tight metallic click layered with a faint low bloom, 420 milliseconds, weighty for its size, no tail.

### `pm_plan_complete_v1` — 2.2 с, громкость 0.58
**Экран:** `app/personal_plan_complete.tsx` · Момент: весь персональный план пройден до конца, крупная церемония.

**A.** pm_plan_complete — premium interface ceremony for completing an entire personalized study plan in a language app. Wide ascending sine and glass chord opening through a slow filter into a bright sustained major resolution, 2.2 seconds, clean, no muddy reverb, feels expensive and earned.

**B.** pm_plan_complete — celebratory arcade finale for finishing a full learning plan in a mobile app. Layered bell and pluck fanfare rising in two waves with a bright sparkle shower on the resolution, 2.2 seconds, joyful, warm, generous but not noisy.

**C.** pm_plan_complete — cinematic ceremony marking the completion of a long learning journey. Soft horn and string swell with choir-like air, a low timpani-style thump on the downbeat and a clean bell cascade resolving above, 2.2 seconds, majestic, controlled tail.

### `pm_plan_thank_you_v1` — 1.5 с, громкость 0.34
**Экран:** `app/personal_plan_thank_you.tsx` · Момент: экран благодарности после плана, тёплое личное прощание.

**A.** pm_plan_thank_you — warm quiet interface closing tone for a thank-you screen after finishing a study plan. Two soft sine notes settling downward into a gentle held fifth, 1.5 seconds, dry, sincere, understated, no celebration energy.

**B.** pm_plan_thank_you — gentle game outro for a farewell screen in a mobile learning app. Soft music-box-like melody of three descending notes with a warm rounded tail, 1.5 seconds, affectionate and calm.

**C.** pm_plan_thank_you — cinematic warm farewell for a closing screen in a premium education app. Distant string pad with a single glass note fading slowly into air, 1.5 seconds, tender, spacious, unhurried.

### `pm_plan_sunset_warning_v1` — 0.8 с, громкость 0.30
**Экран:** `app/personal_plan_sunset_guard.tsx` · Момент: предупреждение, что план скоро закроется.

**A.** pm_plan_sunset_warning — restrained interface caution tone for a notice that a study plan is about to expire. Two soft low sine notes falling a minor third with a slight filter dampening, 800 milliseconds, dry, serious but never harsh, no buzzer character.

**B.** pm_plan_sunset_warning — gentle game-style heads-up cue for an expiring plan in a mobile learning app. Muted low marimba double-knock with a soft downward bend, 800 milliseconds, warm, cautionary, friendly rather than punishing.

**C.** pm_plan_sunset_warning — cinematic soft warning for a fading deadline in a premium app. Low clarinet-like tone with a slow air fade and a faint distant bell, 800 milliseconds, melancholic, dignified, short tail.

---

# 2. Пейволы, подписка и покупки

Девять экранов пейвола (`paywall_a`…`paywall_g`, `premium_modal`,
`premium_modal_v2`) и вся ветка оплаты — сейчас полностью беззвучны. Это
самая денежная часть приложения, и она единственная не даёт слухового
подтверждения ни на выборе тарифа, ни на успешной оплате.

Папка: `assets/audio/sfx/v1/commerce/` · Семейство: `commerce`

---

### `pm_paywall_present_v1` — 1.3 с, громкость 0.30
**Экран:** `app/paywall_a.tsx` … `paywall_g.tsx` · Момент: пейвол выехал на экран, пользователь впервые видит предложение подписки.

**A.** pm_paywall_present — refined interface entrance for a premium subscription offer sliding onto the screen in a language-learning app. Slow filter opening under two clean sustained sine tones a fifth apart, 1.3 seconds, no percussion, completely dry, understated and expensive, must feel like an invitation rather than a sales pitch.

**B.** pm_paywall_present — inviting game-style reveal for a premium upgrade screen in a mobile app. Soft ascending bell arpeggio with a warm pad blooming underneath, 1.3 seconds, generous and friendly, light sparkle on the final note, no aggressive fanfare.

**C.** pm_paywall_present — cinematic curtain-lift for a premium offer appearing in a polished mobile app. Wide airy swell with distant warm strings and a single clean glass tone rising through it, 1.3 seconds, luxurious, restrained, short controlled tail.

### `pm_paywall_plan_select_v1` — 0.4 с, громкость 0.26
**Экран:** пейволы · Момент: пользователь выбрал один из тарифов, карточка тарифа подсветилась.

**A.** pm_paywall_plan_select — precise interface selection cue for choosing a subscription tier on a pricing screen. Single clean sine tick with a short upward pitch and a soft filter snap, 400 milliseconds, dry, decisive, confirms the choice without celebrating it.

**B.** pm_paywall_plan_select — warm arcade selection tap for picking a pricing plan in a mobile app. Rounded plucked note with a small wooden knock underneath, 400 milliseconds, friendly, satisfying, no sharp edges.

**C.** pm_paywall_plan_select — cinematic lock-in for selecting a premium tier. Tight metallic click layered with a faint low resonance blooming under it, 400 milliseconds, weighty and confident, no tail.

### `pm_paywall_trial_highlight_v1` — 0.7 с, громкость 0.30
**Экран:** пейволы · Момент: подсветился блок бесплатного пробного периода, ключевой аргумент предложения.

**A.** pm_paywall_trial_highlight — clean attention cue for a free-trial badge illuminating on a subscription screen. Soft rising sine glide resolving into a bright held note with a gentle filter bloom, 700 milliseconds, dry, optimistic, draws the eye without pressure.

**B.** pm_paywall_trial_highlight — bright arcade sparkle for a free-trial offer lighting up in a mobile app. Quick bell shimmer with a small upward pluck underneath, 700 milliseconds, warm and cheerful, inviting.

**C.** pm_paywall_trial_highlight — cinematic glow for a trial-period highlight on a premium offer. Airy shimmer rising over a soft warm pad with a faint glass ring on the peak, 700 milliseconds, elegant, generous, brief tail.

### `pm_purchase_start_v1` — 0.6 с, громкость 0.32
**Экран:** пейволы, `app/shop.tsx`, `app/shards_shop.tsx` · Момент: пользователь подтвердил покупку, ушёл запрос в магазин приложений.

**A.** pm_purchase_start — focused interface commitment cue for the moment a purchase request is submitted to the app store. Two clean sine tones stepping upward with a subtle low pulse underneath, 600 milliseconds, dry, serious, communicates that something real is now in motion.

**B.** pm_purchase_start — arcade confirm-and-send cue for initiating a purchase in a mobile game. Bright pluck with a quick upward bend and a soft whoosh trailing away, 600 milliseconds, energetic, warm, forward-moving.

**C.** pm_purchase_start — cinematic commit for a transaction being sent in a premium app. Low sub thump with an airy sweep lifting away from it, 600 milliseconds, weighty, decisive, no long tail.

### `pm_purchase_success_v1` — 1.7 с, громкость 0.56
**Экран:** пейволы, магазины · Момент: покупка прошла успешно, доступ выдан.

**A.** pm_purchase_success — premium interface confirmation for a completed purchase unlocking access in a language app. Clean ascending three-note figure resolving into a wide sustained major chord with a slow filter opening, 1.7 seconds, no reverb wash, deeply satisfying and trustworthy, sounds like a high-end product confirming ownership.

**B.** pm_purchase_success — joyful arcade unlock fanfare for a successful in-app purchase. Layered bell and pluck melody rising in two quick waves with a bright shimmer cascade on the resolution, 1.7 seconds, generous and warm, celebratory without being loud.

**C.** pm_purchase_success — cinematic unlock ceremony for a granted premium subscription. Warm horn and string swell with a low timpani-style thump and a clean bell cascade resolving above it, 1.7 seconds, majestic, earned, tightly controlled tail.

### `pm_purchase_restored_v1` — 1.0 с, громкость 0.38
**Экран:** `app/manage_subscription.tsx` · Момент: покупки восстановлены, доступ вернулся.

**A.** pm_purchase_restored — calm interface confirmation for restored purchases returning access to a user. Two clean sine notes rising a fourth into a softly held tone, 1 second, dry, reassuring, quieter and more matter-of-fact than a fresh purchase.

**B.** pm_purchase_restored — friendly arcade reconnection cue for restoring an existing subscription. Warm marimba pair with a light bell confirmation on top, 1 second, comforting, familiar, no fanfare.

**C.** pm_purchase_restored — cinematic quiet return for restored premium access. Soft string warmth fading in under a single clean glass note, 1 second, gentle, dignified, short tail.

### `pm_purchase_failed_v1` — 0.7 с, громкость 0.30
**Экран:** пейволы, магазины · Момент: оплата не прошла, показана ошибка. Не должен звучать как наказание.

**A.** pm_purchase_failed — restrained interface failure tone for a declined payment in a mobile app. Two soft sine notes falling a minor third with a gentle filter closing, 700 milliseconds, dry, calm, informative, absolutely no buzzer or harsh error character.

**B.** pm_purchase_failed — gentle game-style setback cue for a failed transaction. Muted low marimba double-tap with a soft downward pitch bend, 700 milliseconds, warm, understanding, never punishing.

**C.** pm_purchase_failed — cinematic soft decline for an unsuccessful purchase in a premium app. Low woodwind-like tone deflating slowly with a faint air release, 700 milliseconds, sympathetic, dignified, brief tail.

### `pm_premium_modal_open_v1` — 1.0 с, громкость 0.28
**Экран:** `app/premium_modal.tsx`, `app/premium_modal_v2.tsx` · Момент: модалка премиума раскрылась поверх текущего экрана.

**A.** pm_premium_modal_open — clean interface bloom for a premium modal expanding over the current screen. Single sustained sine note with a slow upward filter sweep and a faint high shimmer, 1 second, dry, spacious, feels like a layer of glass sliding into place.

**B.** pm_premium_modal_open — warm arcade panel-open cue for a premium offer popup in a mobile app. Soft rising pluck with a bell overtone and a light air swish, 1 second, welcoming, rounded, unhurried.

**C.** pm_premium_modal_open — cinematic reveal for a premium overlay rising into view. Airy upward sweep with a distant warm pad settling beneath a clean bell tone, 1 second, luxurious, refined, no long tail.

### `pm_subscription_manage_open_v1` — 0.8 с, громкость 0.22
**Экран:** `app/manage_subscription.tsx` · Момент: открылся экран управления подпиской.

**A.** pm_subscription_manage_open — neutral interface opening for a subscription management screen. Single clean mid sine tone with a short filter fade-in, 800 milliseconds, completely dry, businesslike, no emotional colour.

**B.** pm_subscription_manage_open — plain warm game-style panel open for an account settings page. Soft muted marimba note with a light wooden tap, 800 milliseconds, calm, functional, friendly.

**C.** pm_subscription_manage_open — cinematic quiet entrance for an account management view. Low airy breath with a faint metallic sheen fading in, 800 milliseconds, understated, premium, short.

### `pm_promo_code_applied_v1` — 1.1 с, громкость 0.44
**Экран:** `app/promo_code_entry.tsx` · Момент: промокод принят, бонус начислен.

**A.** pm_promo_code_applied — bright clean interface confirmation for a valid promo code being accepted. Quick ascending sine triplet resolving to a sparkling high note with a crisp filter snap, 1.1 seconds, dry, delightful, feels like a lock clicking open.

**B.** pm_promo_code_applied — playful arcade reward cue for redeeming a promo code in a mobile app. Cheerful plucked run of four notes ending in a bright coin-like ping, 1.1 seconds, warm, fun, generous.

**C.** pm_promo_code_applied — cinematic small windfall for a successfully redeemed code. Soft rising air with a clean bell strike and a light metallic sparkle falling after it, 1.1 seconds, elegant, rewarding, controlled tail.

### `pm_promo_code_rejected_v1` — 0.6 с, громкость 0.28
**Экран:** `app/promo_code_entry.tsx` · Момент: промокод не подошёл.

**A.** pm_promo_code_rejected — soft interface rejection for an invalid promo code. Single low sine note with a quick downward pitch drop and immediate filter close, 600 milliseconds, dry, neutral, informative without blame.

**B.** pm_promo_code_rejected — mild arcade decline tone for a code that does not work. Short muted wooden knock with a small deflating bend, 600 milliseconds, soft, harmless, friendly.

**C.** pm_promo_code_rejected — cinematic quiet dismissal for a rejected code. Low breathy tone dropping gently with a faint dull thud, 600 milliseconds, subdued, respectful, no tail.

### `pm_billing_issue_v1` — 0.9 с, громкость 0.32
**Экран:** `components/BillingIssueToastHost.tsx` · Момент: всплыла плашка о проблеме с оплатой подписки.

**A.** pm_billing_issue — serious but calm interface alert for a billing problem notification appearing in an app. Two sustained low sine tones with a slow beating interference between them, 900 milliseconds, dry, attention-getting through weight rather than brightness, never alarming.

**B.** pm_billing_issue — measured game-style notice for a payment problem banner. Low marimba triple-tap with a slight downward drift and a soft muted bell, 900 milliseconds, warm, concerned, non-threatening.

**C.** pm_billing_issue — cinematic muted concern for a billing warning in a premium app. Low cello-like swell with a faint distant metallic ring fading, 900 milliseconds, grave, restrained, short tail.

---

# 3. MAX — голосовой звонок с учителем

Восемь экранов без звука: согласие, пре-старт, сам звонок, живые субтитры,
разбор после звонка, пейвол MAX, настройки памяти.

Особенность раздела: **во время звонка играет живая речь**, поэтому все звуки
здесь тихие, короткие и обязаны уступать голосу (в реестре им ставится
`deferAfterVoice`). Никаких аккордов поверх речи учителя.

Папка: `assets/audio/sfx/v1/max/` · Семейство: `voice`

---

### `pm_max_prestart_ready_v1` — 0.9 с, громкость 0.26
**Экран:** `app/max_call_prestart.tsx` · Момент: экран прогрева перед звонком, линия готова, можно звонить.

**A.** pm_max_prestart_ready — clean interface readiness tone for a voice call standby screen, played when the connection is prepared and the user can start speaking. Two soft sine tones settling into a stable held fifth, 900 milliseconds, dry, calm, communicates a line is open and waiting.

**B.** pm_max_prestart_ready — warm game-style connection-ready cue for a voice tutor call in a mobile app. Gentle marimba pair with a soft bell confirmation, 900 milliseconds, friendly, reassuring, unhurried.

**C.** pm_max_prestart_ready — cinematic quiet readiness for an open voice channel in a premium app. Distant warm pad with a faint clean tone settling above it, 900 milliseconds, spacious, composed, short tail.

### `pm_max_call_connect_v1` — 0.8 с, громкость 0.34
**Экран:** `app/max_call_session.tsx` · Момент: звонок соединился, учитель на линии.

**A.** pm_max_call_connect — precise interface connection cue for a voice call successfully establishing. Two clean ascending sine blips with a crisp filter snap on the second, 800 milliseconds, dry, confident, unmistakably a line going live.

**B.** pm_max_call_connect — bright arcade connect signal for a tutor call starting in a mobile app. Quick rising pluck pair with a light bell ping on top, 800 milliseconds, warm, welcoming, energetic but small.

**C.** pm_max_call_connect — cinematic link-established cue for a premium voice session. Soft air rush resolving into a clean sustained tone with faint low weight underneath, 800 milliseconds, elegant, purposeful, no tail.

### `pm_max_call_end_v1` — 1.1 с, громкость 0.32
**Экран:** `app/max_call_session.tsx` · Момент: звонок завершён, линия закрылась.

**A.** pm_max_call_end — clean interface disconnection tone for a voice call closing. Two sine notes descending a fourth with a slow filter closing beneath them, 1.1 seconds, dry, calm, final without sadness.

**B.** pm_max_call_end — warm arcade sign-off for ending a tutor call in a mobile app. Soft descending marimba trio with a rounded low landing note, 1.1 seconds, friendly, conclusive, gentle.

**C.** pm_max_call_end — cinematic close for a finished voice session in a premium app. Warm pad settling downward with a single low glass tone fading into air, 1.1 seconds, graceful, unhurried, controlled tail.

### `pm_max_turn_yours_v1` — 0.3 с, громкость 0.24
**Экран:** `app/max_call_session.tsx` · Момент: учитель договорил, теперь очередь пользователя говорить. Обязан быть очень тихим и коротким.

**A.** pm_max_turn_yours — extremely subtle interface prompt telling the user it is their turn to speak in a live voice conversation. Single soft sine blip with a faint upward inflection, 300 milliseconds, very quiet, completely dry, must never compete with speech.

**B.** pm_max_turn_yours — tiny warm game cue handing the speaking turn to the player in a voice-based mobile app. Small rounded marimba tap with a light lift, 300 milliseconds, gentle, unobtrusive, friendly.

**C.** pm_max_turn_yours — cinematic whisper-light turn signal in a premium voice session. Faint airy tick with a barely-there pitched shimmer, 300 milliseconds, delicate, almost subliminal, no tail.

### `pm_max_listening_start_v1` — 0.25 с, громкость 0.22
**Экран:** `app/max_call_session.tsx` · Момент: микрофон открылся, приложение слушает пользователя.

**A.** pm_max_listening_start — minimal interface cue for a microphone opening to capture speech. Very short clean sine tick with a small filter opening, 250 milliseconds, dry, precise, sounds like a gate lifting.

**B.** pm_max_listening_start — soft arcade mic-on blip for a voice input session in a mobile app. Tiny warm bubble pop with a light upward tail, 250 milliseconds, friendly, immediate.

**C.** pm_max_listening_start — cinematic breath-in for an open microphone in a premium voice app. Short inward air catch with a faint low body, 250 milliseconds, organic, quiet, no tail.

### `pm_max_listening_stop_v1` — 0.25 с, громкость 0.22
**Экран:** `app/max_call_session.tsx` · Момент: микрофон закрылся, реплика пользователя ушла на обработку.

**A.** pm_max_listening_stop — minimal interface cue for a microphone closing after capturing speech. Very short clean sine tick with a small downward filter close, 250 milliseconds, dry, precise, the mirror of a gate lowering.

**B.** pm_max_listening_stop — soft arcade mic-off blip for the end of voice capture in a mobile app. Tiny warm pop with a light downward settle, 250 milliseconds, gentle, tidy.

**C.** pm_max_listening_stop — cinematic breath-out closing a microphone in a premium voice app. Short outward air release with a faint low settle, 250 milliseconds, organic, calm, no tail.

### `pm_max_caption_in_v1` — 0.2 с, громкость 0.16
**Экран:** `app/max_call_live_caption_view.tsx` · Момент: новая строка живых субтитров появилась под речью.

**A.** pm_max_caption_in — near-invisible interface tick for a new live caption line appearing under speech. Single filtered micro-click with almost no pitch, 200 milliseconds, extremely quiet, dry, designed to be felt rather than heard.

**B.** pm_max_caption_in — tiny arcade text-in tap for a caption line landing in a mobile app. Small soft wooden tick, 200 milliseconds, warm, unobtrusive, light.

**C.** pm_max_caption_in — cinematic paper-soft tick for a subtitle line settling into place. Faint dry brush with a whisper of low air, 200 milliseconds, delicate, barely present.

### `pm_max_review_open_v1` — 1.2 с, громкость 0.30
**Экран:** `app/max_voice_review.tsx` · Момент: открылся разбор состоявшегося звонка.

**A.** pm_max_review_open — considered interface opening for a post-call analysis screen. Slow filter sweep under a clean sustained sine pair, resolving into a calm held tone, 1.2 seconds, dry, thoughtful, invites reflection rather than judgment.

**B.** pm_max_review_open — warm game-style debrief opening for a voice session summary in a mobile app. Soft rising marimba phrase with a light bell settling on top, 1.2 seconds, encouraging, gentle, calm.

**C.** pm_max_review_open — cinematic reflective entrance for a call review in a premium app. Distant string warmth with a single clean glass tone rising slowly through it, 1.2 seconds, contemplative, spacious, short tail.

### `pm_max_goal_reached_v1` — 1.4 с, громкость 0.48
**Экран:** `app/max_call_session.tsx`, `app/max_voice_review.tsx` · Момент: цель разговора достигнута — учитель отметил, что задача выполнена.

**A.** pm_max_goal_reached — clean premium confirmation for a conversation goal being achieved in a voice tutoring session. Ascending sine figure resolving into a bright sustained chord with a soft filter bloom, 1.4 seconds, dry, proud, quietly triumphant.

**B.** pm_max_goal_reached — warm arcade achievement cue for completing a speaking objective in a mobile app. Bright plucked run with a bell sparkle resolving upward, 1.4 seconds, encouraging, joyful, not overblown.

**C.** pm_max_goal_reached — cinematic quiet triumph for a conversational milestone in a premium tutor app. Warm horn-like swell with a clean glass bell resolving above and a soft low pulse underneath, 1.4 seconds, dignified, earned, controlled tail.

### `pm_max_time_warning_v1` — 0.7 с, громкость 0.28
**Экран:** `app/max_call_session.tsx` · Момент: минуты звонка на исходе, учитель предупреждает о скором завершении.

**A.** pm_max_time_warning — calm interface time-remaining cue during a live voice call. Two soft low sine pulses with a slight downward drift, 700 milliseconds, dry, non-intrusive, informative, must never startle a speaking user.

**B.** pm_max_time_warning — gentle arcade clock cue for limited call time in a mobile app. Muted marimba double-pulse with a light downward bend, 700 milliseconds, warm, polite, unobtrusive.

**C.** pm_max_time_warning — cinematic soft hourglass cue for a voice session nearing its end. Low breathy tone with a faint distant tick underneath, 700 milliseconds, understated, respectful, no tail.

### `pm_max_consent_granted_v1` — 0.8 с, громкость 0.30
**Экран:** `app/max_voice_consent_gate.tsx`, `components/MaxVoiceConsentModal.tsx` · Момент: пользователь дал согласие на голосовой режим.

**A.** pm_max_consent_granted — clean neutral interface confirmation for a user granting permission for voice features. Single clean sine tone stepping up to a stable held note, 800 milliseconds, dry, trustworthy, matter-of-fact, no celebration.

**B.** pm_max_consent_granted — friendly game-style agreement cue for accepting voice permissions in a mobile app. Warm plucked pair rising gently with a soft bell confirmation, 800 milliseconds, reassuring, light.

**C.** pm_max_consent_granted — cinematic calm assent for granted voice access in a premium app. Soft air lift with a clean tone settling on top, 800 milliseconds, composed, respectful, short tail.

### `pm_max_memory_saved_v1` — 0.9 с, громкость 0.32
**Экран:** `app/max_memory_settings.tsx` · Момент: настройки памяти учителя сохранены.

**A.** pm_max_memory_saved — precise interface save confirmation for tutor memory settings being stored. Two clean sine ticks with a soft filter click sealing the second, 900 milliseconds, dry, tidy, sounds like a drawer closing correctly.

**B.** pm_max_memory_saved — warm arcade save cue for preferences stored in a mobile app. Soft plucked note with a rounded wooden knock and a light bell tail, 900 milliseconds, satisfying, friendly.

**C.** pm_max_memory_saved — cinematic quiet commit for saved settings in a premium app. Low soft thud with a faint metallic sheen rising off it, 900 milliseconds, weighty, refined, no long tail.

---

# 4. Диалоги с ИИ

Пять экранов без звука: каталог сценариев, бриф перед диалогом, согласие,
сама сессия, финальный вердикт. Экран вердикта — полноэкранный финал, ему
положена та же плотность, что и завершению урока.

Папка: `assets/audio/sfx/v1/dialog/` · Семейство: `voice`

---

### `pm_dialog_catalog_open_v1` — 1.0 с, громкость 0.24
**Экран:** `app/ai_dialog_home.tsx` · Момент: открылся каталог сценариев диалогов.

**A.** pm_dialog_catalog_open — clean interface opening for a catalogue of conversation scenarios in a language app. Soft filter sweep beneath two sustained sine tones a third apart, 1 second, dry, calm, feels like a shelf of options coming into view.

**B.** pm_dialog_catalog_open — warm game-style menu open for a scenario picker in a mobile learning app. Rising marimba triad with a light shimmer overtone, 1 second, inviting, rounded, friendly.

**C.** pm_dialog_catalog_open — cinematic entrance for a scenario library in a premium app. Airy swell with distant warm pad and a single clean tone resolving above, 1 second, spacious, elegant, short tail.

### `pm_dialog_scenario_pick_v1` — 0.4 с, громкость 0.26
**Экран:** `components/DialogScenarioTile.tsx` · Момент: пользователь выбрал сценарий диалога, плитка подсветилась.

**A.** pm_dialog_scenario_pick — decisive interface selection tick for choosing a conversation scenario. Single sine blip with a sharp upward step and a clean filter snap, 400 milliseconds, dry, purposeful, no emotional colour.

**B.** pm_dialog_scenario_pick — warm arcade tile-select cue for picking a dialogue scene in a mobile app. Rounded pluck with a small wooden knock beneath it, 400 milliseconds, satisfying, playful, snappy.

**C.** pm_dialog_scenario_pick — cinematic scene-lock for selecting a conversation setting. Tight click with a faint low bloom expanding underneath, 400 milliseconds, weighty, confident, no tail.

### `pm_dialog_briefing_in_v1` — 1.1 с, громкость 0.26
**Экран:** `app/ai_dialog_briefing.tsx` · Момент: показан бриф — кто вы в этой сцене и какая у вас задача.

**A.** pm_dialog_briefing_in — focused interface cue for a mission briefing card appearing before a role-play conversation. Two clean sine tones converging with a slow filter narrowing, 1.1 seconds, dry, attentive, sets a task without tension.

**B.** pm_dialog_briefing_in — warm game briefing cue for a role-play setup screen in a mobile app. Soft plucked phrase of three notes with a light bell on the final, 1.1 seconds, friendly, purposeful, encouraging.

**C.** pm_dialog_briefing_in — cinematic mission-setup tone for a conversational scenario brief. Low warm pad rising with a faint metallic glint settling on top, 1.1 seconds, purposeful, refined, short tail.

### `pm_dialog_scene_enter_v1` — 1.3 с, громкость 0.30
**Экран:** `app/ai_dialog_session.tsx` · Момент: сцена диалога открылась, палитра места залила экран (кафе, аэропорт, отель).

**A.** pm_dialog_scene_enter — clean interface transition into a themed conversation scene, played as the screen colour shifts to the location palette. Wide filter opening under a sustained sine pair with a subtle upward drift, 1.3 seconds, dry, immersive, feels like stepping through a door.

**B.** pm_dialog_scene_enter — warm arcade scene-entry cue for arriving in a role-play location in a mobile app. Soft whoosh into a warm marimba chord with a light bell shimmer, 1.3 seconds, welcoming, atmospheric, rounded.

**C.** pm_dialog_scene_enter — cinematic arrival into a conversational setting. Airy sweep with distant room tone blooming and a clean tone settling above it, 1.3 seconds, atmospheric, premium, controlled tail.

### `pm_dialog_reply_sent_v1` — 0.3 с, громкость 0.22
**Экран:** `app/ai_dialog_session.tsx` · Момент: реплика пользователя отправлена собеседнику.

**A.** pm_dialog_reply_sent — light interface send cue for a user message going out in a conversation. Short clean sine blip with a quick upward departure, 300 milliseconds, dry, brisk, no weight.

**B.** pm_dialog_reply_sent — soft arcade send-off for a chat reply in a mobile app. Small warm pop with a light rising tail, 300 milliseconds, friendly, quick.

**C.** pm_dialog_reply_sent — cinematic small dispatch for an outgoing conversational line. Faint air flick with a whisper of pitched movement, 300 milliseconds, delicate, fast.

### `pm_dialog_reply_in_v1` — 0.35 с, громкость 0.20
**Экран:** `app/ai_dialog_session.tsx` · Момент: собеседник ответил, его реплика появилась на экране.

**A.** pm_dialog_reply_in — light interface arrival cue for an incoming conversational reply. Short sine blip with a gentle downward settle, 350 milliseconds, dry, soft, the mirror of the outgoing cue.

**B.** pm_dialog_reply_in — warm arcade message-in tap for a partner reply in a mobile app. Small rounded marimba tap with a soft landing, 350 milliseconds, friendly, calm.

**C.** pm_dialog_reply_in — cinematic soft arrival for an incoming line in a conversation. Faint air settle with a low rounded body, 350 milliseconds, gentle, present, no tail.

### `pm_dialog_hint_used_v1` — 0.5 с, громкость 0.24
**Экран:** `app/ai_dialog_session.tsx` · Момент: пользователь открыл подсказку во время диалога.

**A.** pm_dialog_hint_used — quiet interface reveal for a hint being opened mid-conversation. Soft filtered sweep upward resolving into a faint clear tone, 500 milliseconds, dry, helpful, carries no shame or penalty.

**B.** pm_dialog_hint_used — gentle arcade hint cue for revealing help in a mobile learning app. Light bell shimmer with a small soft pluck underneath, 500 milliseconds, warm, kind, encouraging.

**C.** pm_dialog_hint_used — cinematic soft illumination for an opened hint. Faint airy rise with a distant glass ring, 500 milliseconds, gentle, generous, brief tail.

### `pm_dialog_verdict_open_v1` — 1.5 с, громкость 0.42
**Экран:** `components/DialogVerdictScreen.tsx` · Момент: диалог закончился, полноэкранный вердикт раскрылся.

**A.** pm_dialog_verdict_open — premium full-screen reveal for a conversation verdict screen expanding after a role-play ends. Wide slow filter opening under an ascending sine chord resolving into a bright sustained tone, 1.5 seconds, clean, no reverb wash, ceremonial but composed.

**B.** pm_dialog_verdict_open — arcade results-screen reveal for a completed conversation in a mobile app. Layered bell and pluck rise with a soft sparkle cascade on the resolution, 1.5 seconds, warm, celebratory, generous.

**C.** pm_dialog_verdict_open — cinematic curtain-up for a conversation results screen. Warm string swell with an airy lift and a clean bell resolving above it, 1.5 seconds, majestic, controlled, short tail.

### `pm_dialog_score_tick_v1` — 0.18 с, громкость 0.18
**Экран:** `components/DialogVerdictScreen.tsx` · Момент: счётчик оценки диалога отсчитывает баллы вверх. Играет часто, подряд.

**A.** pm_dialog_score_tick — rapid-fire interface counter tick for a score number climbing on a results screen. Tiny dry sine click with a fixed pitch, 180 milliseconds, extremely short, no tail, designed to repeat dozens of times without fatigue.

**B.** pm_dialog_score_tick — small arcade counting blip for a rising score in a mobile game. Micro plucked note with a soft wooden edge, 180 milliseconds, warm, light, repeatable.

**C.** pm_dialog_score_tick — cinematic micro-tick for an ascending score readout. Faint metallic tap with a whisper of low body, 180 milliseconds, precise, clean, no resonance.

### `pm_dialog_victory_v1` — 1.8 с, громкость 0.54
**Экран:** `components/DialogVictoryCelebration.tsx` · Момент: диалог пройден блестяще, запускается празднование.

**A.** pm_dialog_victory — premium interface celebration for an excellent conversation result in a language app. Bright ascending sine and glass figure opening into a wide sustained major chord with a crisp filter bloom, 1.8 seconds, clean, exhilarating, no muddy reverb.

**B.** pm_dialog_victory — joyful arcade victory fanfare for mastering a role-play conversation. Layered bell melody rising in two waves with a bright sparkle shower and a warm low landing, 1.8 seconds, exuberant, generous, warm.

**C.** pm_dialog_victory — cinematic triumph for a conversation performed brilliantly. Horn and string swell with choir-like air, a low impact on the downbeat and a clean bell cascade above, 1.8 seconds, glorious, tightly controlled tail.

### `pm_dialog_retry_v1` — 0.9 с, громкость 0.32
**Экран:** `components/DialogVerdictScreen.tsx` · Момент: диалог не сдан, предлагается попробовать снова. Не должен унижать.

**A.** pm_dialog_retry — encouraging interface tone for a conversation result that invites another attempt. Two sine notes stepping down then lifting slightly on the last, 900 milliseconds, dry, kind, communicates not yet rather than failure.

**B.** pm_dialog_retry — warm arcade try-again cue in a mobile learning app. Soft marimba phrase dipping and rising back with a gentle bell, 900 milliseconds, friendly, supportive, hopeful.

**C.** pm_dialog_retry — cinematic gentle reset for another attempt at a conversation. Soft string dip with a warm air lift returning upward, 900 milliseconds, compassionate, dignified, short tail.

---

# 5. Карточки (flashcards)

Часть режимов уже озвучена (блиц, аудирование, речь, распаковка паков), но
беззвучны каталог, список паков, свайп-режим, редактор карточек, мои паки,
магазин паков и подбор голоса. Старые звуки лежат отдельно в
`assets/sounds/fc/*.mp3` и не заведены в общий реестр — их стоит перенести
в общую систему, чтобы работал арбитр приоритетов и общий тумблер громкости.

Папка: `assets/audio/sfx/v1/cards/` · Семейство: `learning`

---

### `pm_cards_catalog_open_v1` — 0.9 с, громкость 0.22
**Экран:** `app/flashcards.tsx` · Момент: открылся раздел карточек.

**A.** pm_cards_catalog_open — clean interface opening for a flashcard section in a language app. Soft filter sweep under a single sustained sine tone with a gentle upper harmonic, 900 milliseconds, dry, tidy, feels like a card index sliding open.

**B.** pm_cards_catalog_open — warm arcade section-open cue for a flashcard hub in a mobile app. Rising marimba pair with a soft paper-like brush underneath, 900 milliseconds, friendly, inviting, rounded.

**C.** pm_cards_catalog_open — cinematic quiet entrance to a vocabulary card library. Airy lift with a distant warm pad and a faint glass tone above, 900 milliseconds, spacious, refined, short tail.

### `pm_cards_pack_open_v1` — 0.7 с, громкость 0.28
**Экран:** `app/flashcards_packs.tsx`, `app/flashcards_collection.tsx` · Момент: открылся пак карточек, колода развернулась.

**A.** pm_cards_pack_open — precise interface cue for a card deck expanding into view. Clean sine tone with a quick upward fan and a crisp filter opening, 700 milliseconds, dry, satisfying, evokes cards spreading in a hand.

**B.** pm_cards_pack_open — warm arcade deck-open sound for a card pack in a mobile game. Quick riffling paper texture ending in a bright plucked note, 700 milliseconds, playful, tactile, warm.

**C.** pm_cards_pack_open — cinematic deck reveal in a premium learning app. Soft air fan with a layered card-shuffle texture and a clean tone landing, 700 milliseconds, tactile, elegant, no tail.

### `pm_cards_swipe_know_v1` — 0.32 с, громкость 0.30
**Экран:** `app/flashcards_swipe.tsx` · Момент: карточка улетела вправо — «знаю».

**A.** pm_cards_swipe_know — confident interface swipe cue for a card being marked as known and flying right. Clean sine sweep rising quickly with a bright filter opening, 320 milliseconds, dry, affirmative, light and fast.

**B.** pm_cards_swipe_know — satisfying arcade swipe for sorting a card into the known pile. Quick warm whoosh with a bright plucked accent on release, 320 milliseconds, snappy, rewarding, cheerful.

**C.** pm_cards_swipe_know — cinematic decisive flick for a card sent to the mastered pile. Short air whip with a clean metallic glint trailing, 320 milliseconds, crisp, premium, no tail.

### `pm_cards_swipe_learn_v1` — 0.34 с, громкость 0.26
**Экран:** `app/flashcards_swipe.tsx` · Момент: карточка улетела влево — «учу дальше». Не должно звучать как ошибка.

**A.** pm_cards_swipe_learn — neutral interface swipe cue for a card being kept for further study, flying left. Soft sine sweep drifting slightly downward with a mild filter close, 340 milliseconds, dry, calm, explicitly not a failure sound.

**B.** pm_cards_swipe_learn — gentle arcade swipe for returning a card to the learning pile. Muted whoosh with a soft rounded thud on landing, 340 milliseconds, warm, neutral, kind.

**C.** pm_cards_swipe_learn — cinematic soft return for a card kept in rotation. Low air pass with a faint padded landing, 340 milliseconds, gentle, unjudging, no tail.

### `pm_cards_flip_v1` — 0.28 с, громкость 0.26
**Экран:** `components/flashcards/`, `app/flashcards/PhraseCard.tsx` · Момент: карточка перевернулась и показала обратную сторону.

**A.** pm_cards_flip — clean interface flip for a card turning to reveal its back face. Short filtered swish with a small pitched click at the turn point, 280 milliseconds, dry, mechanical, precise.

**B.** pm_cards_flip — tactile arcade card-flip for a mobile learning app. Quick paper snap with a warm wooden tick, 280 milliseconds, satisfying, physical, light.

**C.** pm_cards_flip — cinematic card turn in a premium app. Crisp air flick with a faint low body and a subtle metallic edge, 280 milliseconds, refined, tactile, no tail.

### `pm_cards_editor_save_v1` — 0.8 с, громкость 0.34
**Экран:** `app/flashcards_card_editor.tsx` · Момент: пользователь сохранил свою карточку.

**A.** pm_cards_editor_save — precise interface save confirmation for a user-created flashcard being stored. Two clean sine ticks with a sealing filter click on the second, 800 milliseconds, dry, tidy, sounds like a record filed correctly.

**B.** pm_cards_editor_save — warm arcade save cue for a custom card in a mobile app. Soft pluck with a wooden knock and a light bell tail, 800 milliseconds, satisfying, friendly.

**C.** pm_cards_editor_save — cinematic commit for a saved custom card. Low soft thud with a metallic sheen rising off it, 800 milliseconds, weighty, refined, short.

### `pm_cards_editor_delete_v1` — 0.6 с, громкость 0.30
**Экран:** `app/flashcards_card_editor.tsx` · Момент: карточка удалена.

**A.** pm_cards_editor_delete — restrained interface deletion cue for a card being removed. Single low sine tone with a quick downward slide and an abrupt clean cutoff, 600 milliseconds, dry, final, unemotional.

**B.** pm_cards_editor_delete — soft arcade discard sound for deleting a card in a mobile app. Muted whoosh with a low rounded thud, 600 milliseconds, warm, harmless, tidy.

**C.** pm_cards_editor_delete — cinematic quiet removal of an item. Low air sweep with a dull padded impact, 600 milliseconds, subdued, clean, no tail.

### `pm_cards_pack_created_v1` — 1.2 с, громкость 0.44
**Экран:** `app/community_pack_create.tsx`, `app/flashcards_my_packs.tsx` · Момент: пользователь собрал и опубликовал свой пак.

**A.** pm_cards_pack_created — clean premium confirmation for a user-built card pack being created. Ascending sine triplet resolving into a bright held chord with a crisp filter bloom, 1.2 seconds, dry, proud, feels like authorship being recognised.

**B.** pm_cards_pack_created — cheerful arcade creation fanfare for publishing a custom pack. Bright plucked run with a bell sparkle and a warm low landing, 1.2 seconds, joyful, generous, warm.

**C.** pm_cards_pack_created — cinematic small ceremony for a created collection. Warm string lift with a clean bell resolving and a soft low thump beneath, 1.2 seconds, dignified, earned, short tail.

### `pm_cards_voice_preview_v1` — 0.5 с, громкость 0.24
**Экран:** `app/flashcards_voice_picker.tsx` · Момент: пользователь прослушивает вариант голоса озвучки.

**A.** pm_cards_voice_preview — neutral interface cue announcing a voice sample about to play. Single soft sine tone with a gentle filter opening, 500 milliseconds, dry, transparent, must not colour the voice that follows.

**B.** pm_cards_voice_preview — light arcade preview blip before a voice sample in a mobile app. Small warm pluck with an airy lift, 500 milliseconds, friendly, brief.

**C.** pm_cards_voice_preview — cinematic soft cue before a voice audition. Faint air breath with a whisper of clean tone, 500 milliseconds, unobtrusive, elegant, no tail.

### `pm_cards_mastered_v1` — 1.3 с, громкость 0.48
**Экран:** `app/flashcards_collection.tsx` · Момент: слово перешло в статус выученного, шкала силы слова заполнилась.

**A.** pm_cards_mastered — clean premium confirmation for a vocabulary word reaching mastered status. Rising sine figure resolving into a bright sustained note with a crystalline shimmer above, 1.3 seconds, dry, deeply satisfying, feels like knowledge locking in.

**B.** pm_cards_mastered — warm arcade mastery cue for a word fully learned in a mobile app. Bright bell arpeggio with a soft plucked base and a sparkle finish, 1.3 seconds, rewarding, cheerful.

**C.** pm_cards_mastered — cinematic crystallisation for a mastered word. Glass harmonic bloom over a warm string bed with a soft low pulse, 1.3 seconds, luminous, premium, controlled tail.

---

# 6. Магазины, валюты и экономика

Беззвучны: магазин, магазин осколков, обмен монет, кошелёк рун, сезонный
пропуск. Все начисления и списания валют проходят молча — при том что это
именно те моменты, где слуховое подтверждение важнее всего.

Папка: `assets/audio/sfx/v1/economy/` · Семейство: `reward`

---

### `pm_shop_open_v1` — 1.0 с, громкость 0.26
**Экран:** `app/shop.tsx` · Момент: открылся магазин.

**A.** pm_shop_open — clean interface opening for an in-app store screen. Warm filter sweep under two sustained sine tones with a faint coin-like overtone, 1 second, dry, inviting, premium retail feel without being commercial.

**B.** pm_shop_open — welcoming arcade shop-open jingle for a mobile game store. Bright marimba triad with a light metallic chime and a soft air swish, 1 second, cheerful, warm, rounded.

**C.** pm_shop_open — cinematic entrance to a premium marketplace. Airy swell with distant warm pad and a clean metallic ring settling above, 1 second, luxurious, spacious, short tail.

### `pm_shop_item_select_v1` — 0.35 с, громкость 0.26
**Экран:** `app/shop.tsx`, `app/shards_shop.tsx` · Момент: выбран товар в витрине.

**A.** pm_shop_item_select — precise interface selection tick for choosing a store item. Clean sine blip with an upward step and a tight filter snap, 350 milliseconds, dry, decisive, neutral.

**B.** pm_shop_item_select — warm arcade item-pick tap in a mobile game shop. Rounded pluck with a small metallic tick underneath, 350 milliseconds, playful, satisfying.

**C.** pm_shop_item_select — cinematic item-lock in a premium store. Tight click with a faint low resonance blooming, 350 milliseconds, weighty, confident, no tail.

### `pm_shards_spend_v1` — 0.7 с, громкость 0.36
**Экран:** `app/shards_shop.tsx` · Момент: осколки списаны за покупку, счётчик уменьшился.

**A.** pm_shards_spend — clean interface cue for a crystal currency balance decreasing after a purchase. Descending glass-like sine pair with a soft filter close and a faint crystalline scatter, 700 milliseconds, dry, precise, spending without regret.

**B.** pm_shards_spend — arcade gem-spend sound for a mobile game currency being deducted. Bright crystal chime falling downward with a light coin rattle, 700 milliseconds, warm, tactile, satisfying.

**C.** pm_shards_spend — cinematic transaction for premium currency leaving a balance. Glass shards settling with a soft low thump underneath, 700 milliseconds, tactile, refined, controlled tail.

### `pm_shards_earned_v1` — 0.9 с, громкость 0.44
**Экран:** `app/shards_shop.tsx`, начисления в игре · Момент: осколки начислены, счётчик вырос.

**A.** pm_shards_earned — bright clean interface cue for crystal currency being added to a balance. Ascending glass-tone sparkle with a crisp filter opening and a light shimmer settle, 900 milliseconds, dry, delightful, distinctly the opposite motion of spending.

**B.** pm_shards_earned — cheerful arcade gem-gain sound for earned currency in a mobile game. Bright crystal cascade rising with a warm coin ping on the peak, 900 milliseconds, joyful, generous.

**C.** pm_shards_earned — cinematic influx of premium currency. Glass harmonics blooming upward over a warm low swell, 900 milliseconds, luminous, rewarding, short tail.

### `pm_coin_exchange_v1` — 1.0 с, громкость 0.40
**Экран:** `app/coin_exchange.tsx` · Момент: одна валюта обменена на другую, произошла конвертация.

**A.** pm_coin_exchange — clean interface conversion cue for exchanging one currency for another. Two sine tones crossing in opposite directions with a filter swap at the midpoint, 1 second, dry, mechanical, unmistakably an exchange rather than a gain.

**B.** pm_coin_exchange — arcade currency-swap sound in a mobile game. Coin rattle passing into a bright crystal chime, 1 second, tactile, warm, playful.

**C.** pm_coin_exchange — cinematic conversion of value. Metallic shimmer descending as a glass tone ascends through it, 1 second, balanced, refined, controlled tail.

### `pm_runes_balance_open_v1` — 0.8 с, громкость 0.26
**Экран:** `app/runes_wallet.tsx` · Момент: открылся кошелёк рун — только баланс и источники, без магазина.

**A.** pm_runes_balance_open — calm interface opening for a rune balance wallet screen. Low sustained sine with a slow ancient-feeling filter bloom and a faint stone-like tap, 800 milliseconds, dry, mysterious but restrained, no fantasy cliché.

**B.** pm_runes_balance_open — warm game-style wallet open for a rune currency screen in a mobile app. Soft muted mallet strike with a low resonant hum, 800 milliseconds, earthy, calm, tactile.

**C.** pm_runes_balance_open — cinematic quiet unveiling of an ancient ledger. Low stone-textured knock with a distant metallic ring fading in, 800 milliseconds, weighty, atmospheric, short tail.

### `pm_season_pass_open_v1` — 1.3 с, громкость 0.34
**Экран:** `app/season_pass.tsx`, `app/arena_season_pass.tsx` · Момент: открылся сезонный пропуск с дорожкой наград.

**A.** pm_season_pass_open — premium interface reveal for a seasonal reward track expanding on screen. Wide filter opening under an ascending sine chord with a subtle metallic sheen, 1.3 seconds, dry, expansive, feels like a long road unrolling.

**B.** pm_season_pass_open — arcade season-track reveal for a battle-pass screen in a mobile game. Bright bell run rising with a warm pad bloom and a light banner-flap texture, 1.3 seconds, exciting, generous, warm.

**C.** pm_season_pass_open — cinematic unfurling of a seasonal campaign track. Horn-like warmth swelling with an airy sweep and a clean bell resolving above, 1.3 seconds, grand, controlled, short tail.

### `pm_season_tier_unlock_v1` — 1.0 с, громкость 0.46
**Экран:** `app/season_pass.tsx` · Момент: открылся новый уровень сезонного пропуска, награда стала доступна.

**A.** pm_season_tier_unlock — clean interface unlock for a seasonal tier becoming available. Sharp filter snap opening into a bright sustained sine with a metallic latch click, 1 second, dry, decisive, unmistakably an unlock.

**B.** pm_season_tier_unlock — arcade tier-unlock cue in a mobile game battle pass. Metallic latch pop followed by a bright bell flourish, 1 second, exciting, warm, rewarding.

**C.** pm_season_tier_unlock — cinematic seal breaking on a seasonal reward. Heavy metallic clank with a bright harmonic bloom rising off it, 1 second, weighty, satisfying, short tail.

---

# 7. Профиль, прогресс и достижения

Беззвучны: достижения, коллекции, статистика стрика, детали аккаунта,
аналитика фраз, аватар, выбор аватара. Экран достижений — витрина гордости,
и сейчас он полностью немой.

Папка: `assets/audio/sfx/v1/profile/` · Семейство: `reward`

---

### `pm_achievements_open_v1` — 1.1 с, громкость 0.28
**Экран:** `app/achievements_screen.tsx` · Момент: открылась витрина достижений.

**A.** pm_achievements_open — clean premium opening for a trophy showcase screen. Slow filter bloom under a sustained sine chord with faint metallic overtones, 1.1 seconds, dry, dignified, feels like a display case lighting up.

**B.** pm_achievements_open — warm arcade trophy-room open for an achievements screen in a mobile game. Bright bell triad with a soft metallic shimmer and a warm pad, 1.1 seconds, proud, cheerful, generous.

**C.** pm_achievements_open — cinematic hall-of-honour entrance for an achievements gallery. Distant string warmth with an airy lift and a clean metallic ring settling, 1.1 seconds, reverent, premium, short tail.

### `pm_achievement_card_reveal_v1` — 0.6 с, громкость 0.32
**Экран:** `app/achievements_screen.tsx` · Момент: карточка достижения перевернулась и показала полученную награду.

**A.** pm_achievement_card_reveal — crisp interface reveal for an achievement card flipping to show an earned badge. Clean filter snap opening into a bright short tone with a metallic glint, 600 milliseconds, dry, proud, compact.

**B.** pm_achievement_card_reveal — arcade badge-reveal for an unlocked achievement in a mobile game. Quick card flip texture ending in a bright bell ping, 600 milliseconds, satisfying, warm, playful.

**C.** pm_achievement_card_reveal — cinematic badge unveiling in a premium app. Sharp air flick with a metallic shimmer blooming outward, 600 milliseconds, elegant, weighty, no tail.

### `pm_achievement_locked_v1` — 0.4 с, громкость 0.22
**Экран:** `app/achievements_screen.tsx` · Момент: пользователь нажал на ещё не полученное достижение.

**A.** pm_achievement_locked — soft interface cue for tapping a still-locked achievement. Muted low sine tick with a dampened filter and no resolution, 400 milliseconds, dry, neutral, communicates not yet without discouragement.

**B.** pm_achievement_locked — gentle arcade locked-item tap in a mobile game. Small muffled wooden knock with a faint low hum, 400 milliseconds, soft, harmless, friendly.

**C.** pm_achievement_locked — cinematic dull tap on a sealed trophy case. Muted padded knock with a faint metallic dampening, 400 milliseconds, subdued, respectful, no tail.

### `pm_collectibles_open_v1` — 1.0 с, громкость 0.26
**Экран:** `app/collectibles_screen.tsx` · Момент: открылась коллекция собранных предметов.

**A.** pm_collectibles_open — clean interface opening for a collectibles gallery. Filter sweep under a sine pair with faint glass overtones scattering upward, 1 second, dry, curious, feels like a cabinet of treasures opening.

**B.** pm_collectibles_open — warm arcade collection-open cue in a mobile game. Light crystal scatter with a soft marimba base note, 1 second, playful, inviting, warm.

**C.** pm_collectibles_open — cinematic vault-open for a premium collection screen. Low air release with glass harmonics blooming above a warm pad, 1 second, luxurious, spacious, short tail.

### `pm_streak_stats_open_v1` — 0.9 с, громкость 0.26
**Экран:** `app/streak_stats.tsx` · Момент: открылась статистика ударного режима, календарь дней.

**A.** pm_streak_stats_open — clean interface opening for a streak calendar screen. Warm sine tone with a rhythmic filter pulse suggesting consecutive days, 900 milliseconds, dry, steady, quietly motivating.

**B.** pm_streak_stats_open — warm arcade calendar-open cue for a streak screen in a mobile app. Soft marimba pulse of three even notes with a light flame-like crackle texture, 900 milliseconds, cosy, encouraging.

**C.** pm_streak_stats_open — cinematic hearth-warm opening for a consistency tracker. Low warm swell with a faint ember texture and a clean tone settling, 900 milliseconds, intimate, premium, short tail.

### `pm_stats_bar_fill_v1` — 0.5 с, громкость 0.26
**Экран:** `app/streak_stats.tsx`, `components/stats/` · Момент: столбик статистики вырастает до своего значения.

**A.** pm_stats_bar_fill — smooth interface cue for a statistics bar growing to its value. Rising filtered sine glide with a soft landing tick at the top, 500 milliseconds, dry, mechanical, precise.

**B.** pm_stats_bar_fill — arcade bar-fill sound for a growing statistic in a mobile app. Warm pitched sweep upward with a small pop on arrival, 500 milliseconds, satisfying, snappy.

**C.** pm_stats_bar_fill — cinematic ascent for a data bar reaching its height. Airy rise with a faint metallic click landing on the peak, 500 milliseconds, refined, clean, no tail.

### `pm_avatar_equip_v1` — 0.7 с, громкость 0.34
**Экран:** `app/avatar_select.tsx`, `app/avatar_dna_studio.tsx` · Момент: пользователь надел новый элемент внешности на аватар.

**A.** pm_avatar_equip — clean interface confirmation for an appearance item being equipped on an avatar. Soft fabric-like filtered swish resolving into a bright confirming tick, 700 milliseconds, dry, tactile, tidy.

**B.** pm_avatar_equip — warm arcade dress-up cue for equipping a cosmetic item in a mobile game. Light cloth rustle with a cheerful plucked confirmation, 700 milliseconds, playful, satisfying.

**C.** pm_avatar_equip — cinematic garment settling into place on a character. Soft fabric fall with a faint metallic clasp click, 700 milliseconds, tactile, premium, no tail.

### `pm_avatar_studio_render_v1` — 1.0 с, громкость 0.30
**Экран:** `app/avatar_dna_studio.tsx` · Момент: новый образ аватара собрался и отрисовался.

**A.** pm_avatar_studio_render — clean interface materialisation for a rendered avatar appearing. Ascending filtered shimmer resolving into a stable clean tone, 1 second, dry, technological, feels like an image resolving into focus.

**B.** pm_avatar_studio_render — arcade character-materialise cue in a mobile game. Bright sparkle sweep upward with a warm bell landing, 1 second, magical, warm, playful.

**C.** pm_avatar_studio_render — cinematic materialisation of a character portrait. Airy particle rise with a low warm bloom and a clean glass tone settling, 1 second, elegant, luminous, short tail.

### `pm_account_saved_v1` — 0.8 с, громкость 0.32
**Экран:** `app/account_details.tsx`, `components/account/NicknameEditModal.tsx` · Момент: данные профиля сохранены.

**A.** pm_account_saved — precise interface save confirmation for profile details being stored. Two clean sine ticks with a sealing click on the second, 800 milliseconds, dry, businesslike, trustworthy.

**B.** pm_account_saved — warm arcade save cue for profile changes in a mobile app. Soft pluck with a wooden knock and a light bell tail, 800 milliseconds, friendly, satisfying.

**C.** pm_account_saved — cinematic quiet commit for saved profile data. Low soft thud with a faint metallic sheen, 800 milliseconds, weighty, refined, no tail.

---

# 8. Соцчасть: клуб, лига, друзья, рефералы

Озвучены только повышение/понижение в лиге и сундук. Беззвучны сам экран
лиги, клуб, топы, история арены, приглашения, рефералы и вся ветка «Вместе».

Папка: `assets/audio/sfx/v1/social/` · Семейство: `social`

---

### `pm_league_screen_open_v1` — 1.2 с, громкость 0.28
**Экран:** `app/league_screen.tsx`, `app/club_screen.tsx` · Момент: открылась таблица лиги, видно своё место.

**A.** pm_league_screen_open — clean interface opening for a competitive league standings table. Filter sweep under a sustained sine chord with a faint metallic edge, 1.2 seconds, dry, formal, feels like a leaderboard board settling into place.

**B.** pm_league_screen_open — arcade leaderboard-open cue for a league screen in a mobile game. Bright bell triad with a light banner texture and a warm pad, 1.2 seconds, competitive, warm, energising.

**C.** pm_league_screen_open — cinematic arena-standings reveal in a premium app. Distant horn warmth with an airy lift and a clean metallic ring, 1.2 seconds, stately, controlled, short tail.

### `pm_league_rank_move_v1` — 0.5 с, громкость 0.30
**Экран:** `app/league_screen.tsx` · Момент: строка игрока переехала вверх или вниз в таблице.

**A.** pm_league_rank_move — precise interface cue for a player row shifting position in a standings table. Short filtered glide with a directional pitch movement and a clean landing tick, 500 milliseconds, dry, mechanical, neutral about direction.

**B.** pm_league_rank_move — arcade position-shift sound in a mobile game leaderboard. Quick sliding pluck with a small wooden landing knock, 500 milliseconds, snappy, playful.

**C.** pm_league_rank_move — cinematic rank shift on a competitive board. Air pass with a faint metallic slide and a soft settle, 500 milliseconds, refined, weighty, no tail.

### `pm_league_zone_enter_v1` — 0.8 с, громкость 0.36
**Экран:** `app/league_screen.tsx` · Момент: игрок попал в зону повышения — строка подсветилась.

**A.** pm_league_zone_enter — bright clean interface cue for a player entering the promotion zone in a league table. Rising sine pair resolving into a bright sustained tone with a warm filter bloom, 800 milliseconds, dry, hopeful, motivating.

**B.** pm_league_zone_enter — arcade promotion-zone cue in a mobile game leaderboard. Bright ascending bell pair with a warm sparkle, 800 milliseconds, encouraging, cheerful, energising.

**C.** pm_league_zone_enter — cinematic ascent into a qualifying position. Warm string lift with a clean glass tone rising above it, 800 milliseconds, uplifting, dignified, short tail.

### `pm_league_zone_risk_v1` — 0.8 с, громкость 0.30
**Экран:** `app/league_screen.tsx` · Момент: игрок попал в зону вылета. Тревога без унижения.

**A.** pm_league_zone_risk — restrained interface warning for a player falling into the relegation zone. Two low sine tones sinking a minor third with a slow filter dampening, 800 milliseconds, dry, serious, never mocking or harsh.

**B.** pm_league_zone_risk — gentle arcade danger-zone cue in a mobile leaderboard. Muted low marimba pair drifting downward with a soft dulled bell, 800 milliseconds, warm, concerned, motivating rather than punishing.

**C.** pm_league_zone_risk — cinematic sinking cue for a relegation position. Low cello-like descent with a faint air dampening, 800 milliseconds, grave, respectful, short tail.

### `pm_friend_invite_sent_v1` — 0.7 с, громкость 0.32
**Экран:** `app/arena_invite.tsx`, `app/referrals.tsx` · Момент: приглашение другу отправлено.

**A.** pm_friend_invite_sent — clean interface send cue for a friend invitation going out. Rising sine blip with a bright departure sweep and a soft filter release, 700 milliseconds, dry, optimistic, forward-moving.

**B.** pm_friend_invite_sent — warm arcade send-off for an invite in a mobile social app. Cheerful pluck with a light whoosh trailing upward, 700 milliseconds, friendly, buoyant.

**C.** pm_friend_invite_sent — cinematic dispatch of a personal invitation. Soft air lift with a clean tone rising and fading gently, 700 milliseconds, warm, elegant, short tail.

### `pm_friend_accepted_v1` — 1.0 с, громкость 0.42
**Экран:** `app/(tabs)/friends.tsx` · Момент: друг принял приглашение, связь установлена.

**A.** pm_friend_accepted — warm clean interface confirmation for a friend connection being established. Two sine tones converging into a consonant held interval with a soft bloom, 1 second, dry, human, quietly joyful.

**B.** pm_friend_accepted — cheerful arcade connection cue for a new friendship in a mobile app. Two plucked notes meeting on a warm bell chord, 1 second, friendly, heartfelt, playful.

**C.** pm_friend_accepted — cinematic bond forming between two people. Two warm tones drawing together into a soft consonant swell, 1 second, tender, premium, short tail.

### `pm_friend_high_five_v1` — 0.5 с, громкость 0.36
**Экран:** `app/(tabs)/friends.tsx` · Момент: пользователь отправил другу «дай пять».

**A.** pm_friend_high_five — bright snappy interface cue for sending a high-five to a friend. Sharp clean transient with a quick bright resonance and immediate decay, 500 milliseconds, dry, energetic, physical.

**B.** pm_friend_high_five — playful arcade clap cue for a high-five in a mobile social app. Warm hand-clap-like snap with a bright plucked sparkle, 500 milliseconds, fun, punchy, cheerful.

**C.** pm_friend_high_five — cinematic palm impact with warmth. Tight clap transient with a faint air burst and a short bright shimmer, 500 milliseconds, physical, premium, no tail.

### `pm_together_level_up_v1` — 1.4 с, громкость 0.50
**Экран:** `components/friends_together/` · Момент: уровень дружбы вырос.

**A.** pm_together_level_up — clean premium celebration for a friendship level increasing. Two intertwining sine lines rising together into a bright shared chord, 1.4 seconds, dry, warm, distinctly about two people rather than one.

**B.** pm_together_level_up — joyful arcade duo level-up for a shared progress bar in a mobile app. Two plucked melodies weaving upward into a bell chord with sparkle, 1.4 seconds, playful, generous, warm.

**C.** pm_together_level_up — cinematic shared ascent for a deepening bond. Two warm string lines rising in harmony with a clean bell resolving above, 1.4 seconds, tender, uplifting, controlled tail.

### `pm_referral_reward_v1` — 1.3 с, громкость 0.48
**Экран:** `app/referrals.tsx` · Момент: друг активировался, награда за приглашение выдана.

**A.** pm_referral_reward — clean premium reward cue for a referral bonus being granted. Ascending sine figure with a bright coin-like resolution and a crisp filter bloom, 1.3 seconds, dry, generous, feels like a gift arriving.

**B.** pm_referral_reward — cheerful arcade referral payout in a mobile app. Bright coin cascade into a warm bell flourish, 1.3 seconds, joyful, abundant, playful.

**C.** pm_referral_reward — cinematic windfall for an invited friend joining. Warm swell with a metallic sparkle shower resolving on a clean bell, 1.3 seconds, generous, premium, short tail.

### `pm_tops_reveal_v1` — 1.1 с, громкость 0.34
**Экран:** `app/arena_tops.tsx` · Момент: открылась таблица лучших игроков, топ-3 подсветились.

**A.** pm_tops_reveal — clean interface reveal for a top-players podium appearing. Three ascending bright sine tones landing on a sustained high note with metallic sheen, 1.1 seconds, dry, ceremonial, compact.

**B.** pm_tops_reveal — arcade podium fanfare for a top-three leaderboard in a mobile game. Bright bell triplet with a warm brassy edge and light sparkle, 1.1 seconds, celebratory, energising.

**C.** pm_tops_reveal — cinematic podium unveiling in a competitive app. Horn-like triple lift with an airy shimmer resolving above, 1.1 seconds, stately, proud, short tail.

---

# 9. Уроки: обвязка вокруг сессии

Сама сессия обучения озвучена (верно/неверно/подсказка/таймер/завершение), но
беззвучны список уроков, меню урока, теория, слова, глаголы, помощь,
неправильные глаголы, тренажёр предлогов и практика ошибок.

Папка: `assets/audio/sfx/v1/learning/` · Семейство: `learning`

---

### `pm_lessons_list_open_v1` — 0.9 с, громкость 0.22
**Экран:** `app/lessons_list.tsx`, `app/(tabs)/lessons.tsx` · Момент: открылся список уроков, видна дорожка прогресса.

**A.** pm_lessons_list_open — clean interface opening for a lesson roadmap screen. Gentle filter sweep under a sine pair with a subtle stepping rhythm, 900 milliseconds, dry, orderly, feels like a path laying itself out.

**B.** pm_lessons_list_open — warm arcade map-open cue for a lesson path in a mobile learning game. Soft marimba steps rising with a light shimmer, 900 milliseconds, inviting, cheerful.

**C.** pm_lessons_list_open — cinematic path-reveal for a learning journey screen. Airy lift with a distant warm pad and a clean tone settling, 900 milliseconds, spacious, premium, short tail.

### `pm_lesson_unlock_v1` — 1.1 с, громкость 0.46
**Экран:** `app/lessons_list.tsx` · Момент: следующий урок разблокирован, замок открылся.

**A.** pm_lesson_unlock — crisp interface unlock for the next lesson becoming available. Sharp filter snap with a metallic latch release opening into a bright sustained tone, 1.1 seconds, dry, decisive, unmistakably a lock giving way.

**B.** pm_lesson_unlock — arcade unlock cue for a newly available level in a mobile game. Metallic latch pop followed by a bright rising bell flourish, 1.1 seconds, exciting, warm, rewarding.

**C.** pm_lesson_unlock — cinematic gate opening onto a new lesson. Heavy latch clank with a harmonic bloom and a soft air release, 1.1 seconds, weighty, satisfying, controlled tail.

### `pm_lesson_locked_v1` — 0.45 с, громкость 0.24
**Экран:** `app/lessons_list.tsx` · Момент: пользователь нажал на закрытый урок.

**A.** pm_lesson_locked — soft interface cue for tapping a locked lesson. Muted low sine knock with a dampened filter and no resolution, 450 milliseconds, dry, neutral, communicates a boundary without scolding.

**B.** pm_lesson_locked — gentle arcade locked-door tap in a mobile game. Small muffled wooden double-knock with a faint low hum, 450 milliseconds, soft, friendly.

**C.** pm_lesson_locked — cinematic dull thud against a closed gate. Padded low impact with a faint metallic dampening, 450 milliseconds, subdued, respectful, no tail.

### `pm_lesson_menu_open_v1` — 0.7 с, громкость 0.24
**Экран:** `app/lesson_menu.tsx` · Момент: открылось меню урока с выбором активностей.

**A.** pm_lesson_menu_open — clean interface panel-open for a lesson activity menu. Short filter bloom under a single clear sine tone, 700 milliseconds, dry, tidy, functional.

**B.** pm_lesson_menu_open — warm arcade menu-open for a lesson hub in a mobile app. Soft marimba pair with a light air swish, 700 milliseconds, friendly, rounded.

**C.** pm_lesson_menu_open — cinematic soft panel rise for a lesson menu. Airy lift with a faint warm body settling, 700 milliseconds, elegant, quiet, no tail.

### `pm_theory_page_turn_v1` — 0.4 с, громкость 0.24
**Экран:** `app/lesson_theory_v2.tsx`, `app/lesson_help_theory_ui.tsx` · Момент: перелистнулась страница теории.

**A.** pm_theory_page_turn — clean interface page-advance cue in a grammar theory reader. Soft filtered swish with a small pitched tick at the end, 400 milliseconds, dry, precise, paper-like without literal foley.

**B.** pm_theory_page_turn — tactile arcade page-turn for a theory screen in a mobile app. Warm paper rustle with a light wooden tap, 400 milliseconds, cosy, satisfying.

**C.** pm_theory_page_turn — cinematic page turning in a premium reader. Crisp paper sweep with a faint low body, 400 milliseconds, tactile, refined, no tail.

### `pm_words_reveal_v1` — 0.5 с, громкость 0.28
**Экран:** `app/lesson_words.tsx` · Момент: показано значение нового слова.

**A.** pm_words_reveal — clean interface reveal for a word meaning being shown. Soft filter opening resolving into a clear bright tone, 500 milliseconds, dry, illuminating, satisfying comprehension.

**B.** pm_words_reveal — warm arcade reveal for a vocabulary definition in a mobile app. Light bell shimmer over a soft plucked base, 500 milliseconds, friendly, bright.

**C.** pm_words_reveal — cinematic illumination of a word meaning. Faint airy rise with a clean glass tone blooming, 500 milliseconds, luminous, elegant, short tail.

### `pm_verbs_form_correct_v1` — 0.45 с, громкость 0.34
**Экран:** `app/lesson_verbs.tsx`, `app/lesson_irregular_verbs.tsx` · Момент: верная форма неправильного глагола подтверждена.

**A.** pm_verbs_form_correct — precise interface confirmation for a correct verb form in a grammar drill. Two clean ascending sine ticks with a tight filter snap, 450 milliseconds, dry, affirmative, compact and repeatable.

**B.** pm_verbs_form_correct — warm arcade correct-form cue in a mobile grammar game. Bright plucked pair with a small bell accent, 450 milliseconds, cheerful, snappy.

**C.** pm_verbs_form_correct — cinematic click of a correct grammatical form locking in. Tight metallic tick with a faint bright bloom, 450 milliseconds, precise, premium, no tail.

### `pm_preposition_snap_v1` — 0.35 с, громкость 0.30
**Экран:** `app/preposition_drill.tsx` · Момент: предлог встал в правильный слот предложения.

**A.** pm_preposition_snap — crisp interface snap for a word locking into the correct slot in a sentence. Tight filtered click with a short bright pitched body, 350 milliseconds, dry, mechanical, deeply satisfying.

**B.** pm_preposition_snap — arcade slot-in sound for a puzzle piece landing correctly in a mobile game. Warm wooden snap with a bright plucked ping, 350 milliseconds, tactile, playful.

**C.** pm_preposition_snap — cinematic magnetic snap of a piece into place. Sharp metallic click with a faint low pull underneath, 350 milliseconds, physical, refined, no tail.

### `pm_mistake_practice_start_v1` — 1.0 с, громкость 0.28
**Экран:** `app/mistake_practice_session.tsx` · Момент: начата тренировка на своих ошибках. Тон поддерживающий, не карающий.

**A.** pm_mistake_practice_start — supportive interface opening for a session practising previous mistakes. Warm sine pair rising gently with a soft filter bloom, 1 second, dry, encouraging, explicitly free of any error-tone association.

**B.** pm_mistake_practice_start — kind arcade cue for starting a review of past errors in a mobile learning app. Gentle marimba lift with a warm bell settle, 1 second, friendly, motivating, no judgement.

**C.** pm_mistake_practice_start — cinematic second-chance opening in a premium learning app. Soft string warmth lifting with a clean tone resolving above, 1 second, compassionate, dignified, short tail.

### `pm_mistake_fixed_v1` — 0.9 с, громкость 0.42
**Экран:** `app/mistake_practice_session.tsx` · Момент: ранее допущенная ошибка исправлена — маленькое личное искупление.

**A.** pm_mistake_fixed — clean interface redemption cue for a previously wrong answer now answered correctly. Rising sine figure resolving brightly with a warm filter bloom, 900 milliseconds, dry, quietly proud, noticeably warmer than a normal correct answer.

**B.** pm_mistake_fixed — warm arcade redemption jingle for correcting an old mistake in a mobile app. Bright plucked run with a bell sparkle and a soft warm landing, 900 milliseconds, uplifting, rewarding.

**C.** pm_mistake_fixed — cinematic small redemption for a corrected error. Warm string lift with a clean glass resolution and a soft low pulse, 900 milliseconds, moving, dignified, short tail.

---

# 10. Настройки, онбординг и системные экраны

Беззвучны: темы, язык, уведомления, приватность, условия, опрос, идеи,
приветствие языка, согласия. Экран выбора темы («примерочная») особенно
заметен — там визуально всё меняется, а слух молчит.

Папка: `assets/audio/sfx/v1/system/` · Семейство: `system`

---

### `pm_settings_toggle_on_v1` — 0.28 с, громкость 0.24
**Экран:** `app/(tabs)/settings.tsx` и все экраны настроек · Момент: переключатель включён.

**A.** pm_settings_toggle_on — precise interface cue for a settings switch turning on. Short clean sine tick with a small upward pitch step and a tight filter snap, 280 milliseconds, dry, mechanical, unmistakably the on direction.

**B.** pm_settings_toggle_on — warm arcade switch-on tap in a mobile app. Small rounded pop with a light upward pluck, 280 milliseconds, friendly, tactile.

**C.** pm_settings_toggle_on — cinematic toggle engaging with weight. Tight mechanical click with a faint bright resonance rising, 280 milliseconds, physical, premium, no tail.

### `pm_settings_toggle_off_v1` — 0.28 с, громкость 0.22
**Экран:** экраны настроек · Момент: переключатель выключен. Зеркало предыдущего звука.

**A.** pm_settings_toggle_off — precise interface cue for a settings switch turning off. Short clean sine tick with a small downward pitch step and a damped filter close, 280 milliseconds, dry, mechanical, the exact mirror of the on cue.

**B.** pm_settings_toggle_off — warm arcade switch-off tap in a mobile app. Small rounded pop with a light downward settle, 280 milliseconds, friendly, tidy.

**C.** pm_settings_toggle_off — cinematic toggle disengaging. Tight mechanical click with a faint low damping, 280 milliseconds, physical, restrained, no tail.

### `pm_theme_preview_v1` — 0.6 с, громкость 0.30
**Экран:** `app/settings_themes.tsx` · Момент: пользователь примеряет тему, палитра всего приложения меняется на лету.

**A.** pm_theme_preview — clean interface cue for an entire colour theme sweeping across the app during preview. Wide filtered sweep with a shifting harmonic colour and a soft settle, 600 milliseconds, dry, transformative, sounds like light changing temperature.

**B.** pm_theme_preview — playful arcade palette-swap cue in a mobile app. Bright shimmer sweep with a warm plucked landing note, 600 milliseconds, magical, cheerful, light.

**C.** pm_theme_preview — cinematic wash of new colour across an interface. Airy tonal sweep with a subtle spectral shift and a clean settle, 600 milliseconds, elegant, luminous, no tail.

### `pm_theme_applied_v1` — 0.9 с, громкость 0.38
**Экран:** `app/settings_themes.tsx` · Момент: тема выбрана окончательно и применена.

**A.** pm_theme_applied — clean confident confirmation for a theme being committed across the app. Rising sine pair resolving into a bright held tone with a crisp filter bloom, 900 milliseconds, dry, decisive, satisfying.

**B.** pm_theme_applied — warm arcade confirm cue for an applied visual theme. Bright bell pair with a soft sparkle settle, 900 milliseconds, cheerful, rewarding.

**C.** pm_theme_applied — cinematic settling of a new visual identity. Warm swell with a clean glass resolution above it, 900 milliseconds, refined, premium, short tail.

### `pm_language_selected_v1` — 1.0 с, громкость 0.40
**Экран:** `app/language_welcome.tsx`, `app/settings_language.tsx` · Момент: выбран язык изучения, вся жизнь в приложении переключилась.

**A.** pm_language_selected — clean premium confirmation for choosing a learning language. Three ascending sine tones resolving into a warm sustained chord with a filter bloom, 1 second, dry, significant, marks a real commitment.

**B.** pm_language_selected — welcoming arcade cue for picking a language in a mobile learning app. Bright plucked triad with a warm bell landing and light sparkle, 1 second, joyful, inviting.

**C.** pm_language_selected — cinematic doorway opening onto a new language. Airy swell with warm string body and a clean bell resolving, 1 second, momentous, controlled tail.

### `pm_notifications_enabled_v1` — 0.8 с, громкость 0.34
**Экран:** `app/settings_notifications.tsx`, `components/NotificationPermissionModal.tsx` · Момент: пользователь разрешил уведомления.

**A.** pm_notifications_enabled — clean interface confirmation for notification permission being granted. Two clear sine tones stepping up into a stable bright note, 800 milliseconds, dry, trustworthy, reassuring rather than celebratory.

**B.** pm_notifications_enabled — friendly arcade bell-on cue for enabled notifications in a mobile app. Small bright bell pair with a warm settle, 800 milliseconds, cheerful, light.

**C.** pm_notifications_enabled — cinematic soft chime for an opened channel of communication. Clean bell strike with a faint warm air bloom, 800 milliseconds, elegant, calm, short tail.

### `pm_privacy_consent_v1` — 0.9 с, громкость 0.30
**Экран:** `app/privacy_settings.tsx`, `app/privacy_screen.tsx` · Момент: пользователь принял или изменил настройку приватности.

**A.** pm_privacy_consent — neutral serious interface confirmation for a privacy preference being recorded. Single sustained sine tone with a clean sealing click, 900 milliseconds, dry, formal, deliberately unemotional.

**B.** pm_privacy_consent — plain warm confirm cue for a privacy setting in a mobile app. Soft muted pluck with a firm wooden knock, 900 milliseconds, calm, businesslike.

**C.** pm_privacy_consent — cinematic quiet seal on a recorded consent. Low soft thud with a faint metallic sheen, 900 milliseconds, weighty, respectful, no tail.

### `pm_survey_submitted_v1` — 1.1 с, громкость 0.40
**Экран:** `app/survey_screen.tsx`, `app/ideas_submit.tsx` · Момент: пользователь отправил опрос или идею.

**A.** pm_survey_submitted — clean interface confirmation for feedback being submitted. Rising sine figure with a bright dispatch sweep resolving to a warm held note, 1.1 seconds, dry, appreciative, feels like being heard.

**B.** pm_survey_submitted — warm arcade thank-you cue for submitted feedback in a mobile app. Cheerful plucked run with a soft bell settle and a light whoosh, 1.1 seconds, friendly, grateful.

**C.** pm_survey_submitted — cinematic acknowledgement of a sent message. Warm air lift with a clean bell resolving and a gentle fade, 1.1 seconds, gracious, premium, short tail.

### `pm_onboarding_step_v1` — 0.4 с, громкость 0.26
**Экран:** `components/onboarding_aha/`, `components/OnboardingWelcomeSheet.tsx` · Момент: шаг онбординга сменился.

**A.** pm_onboarding_step — clean forward-motion cue for advancing through an onboarding step. Single sine blip with a confident upward step and a light filter open, 400 milliseconds, dry, progressive, welcoming.

**B.** pm_onboarding_step — friendly arcade step cue in a mobile app onboarding flow. Warm pluck with a small upward bend and a soft tap, 400 milliseconds, cheerful, encouraging.

**C.** pm_onboarding_step — cinematic step forward in a guided introduction. Soft air push with a faint clean tone landing, 400 milliseconds, elegant, light, no tail.

### `pm_app_update_ready_v1` — 0.9 с, громкость 0.32
**Экран:** `components/UpdateModal.tsx`, `components/ReleaseNotesModal.tsx` · Момент: доступно обновление приложения.

**A.** pm_app_update_ready — clean informative interface cue for an available app update. Two sine tones rising a fourth with a subtle digital shimmer, 900 milliseconds, dry, fresh, neutral and modern.

**B.** pm_app_update_ready — bright arcade news cue for a new version in a mobile app. Light bell pair with a soft sparkle rise, 900 milliseconds, friendly, upbeat.

**C.** pm_app_update_ready — cinematic soft announcement of something new. Airy lift with a clean metallic ring settling, 900 milliseconds, refined, calm, short tail.

---

# 11. Модалки, шторки и тосты

Из 80 модалок и тостов озвучены 8. Ниже — универсальные звуки слоёв, которые
покрывают оставшиеся 72 разом: открытие, закрытие, подтверждение,
разрушительное действие, поднявшаяся шторка.

Папка: `assets/audio/sfx/v1/system/` · Семейство: `system`

---

### `pm_modal_open_v1` — 0.45 с, громкость 0.22
**Момент:** любая модалка раскрылась поверх экрана (72 компонента).

**A.** pm_modal_open — universal clean interface cue for a modal layer expanding over the current screen. Soft upward filter bloom with a faint sustained sine, 450 milliseconds, dry, weightless, must work identically under dozens of different modals.

**B.** pm_modal_open — warm arcade panel-open for a popup in a mobile app. Light air swish with a small rounded pop, 450 milliseconds, friendly, neutral, reusable.

**C.** pm_modal_open — cinematic glass layer rising into view. Soft air lift with a faint crystalline edge, 450 milliseconds, elegant, unobtrusive, no tail.

### `pm_modal_close_v1` — 0.4 с, громкость 0.20
**Момент:** модалка закрылась, вернулся нижний экран.

**A.** pm_modal_close — universal clean interface cue for a modal layer collapsing away. Soft downward filter close with a faint settling sine, 400 milliseconds, dry, the mirror of the open cue, quieter by design.

**B.** pm_modal_close — warm arcade panel-close for dismissing a popup. Light air swish descending with a small soft settle, 400 milliseconds, tidy, gentle.

**C.** pm_modal_close — cinematic layer sinking back out of view. Soft air fall with a faint low landing, 400 milliseconds, calm, refined, no tail.

### `pm_sheet_snap_v1` — 0.35 с, громкость 0.24
**Момент:** нижняя шторка встала в свою позицию после перетаскивания.

**A.** pm_sheet_snap — precise interface cue for a bottom sheet snapping to its detent position. Tight filtered click with a short damped body, 350 milliseconds, dry, mechanical, physical.

**B.** pm_sheet_snap — tactile arcade snap for a drawer locking into position in a mobile app. Warm wooden knock with a small rounded resonance, 350 milliseconds, satisfying, physical.

**C.** pm_sheet_snap — cinematic magnetic detent for a settling panel. Firm muted impact with a faint magnetic pull underneath, 350 milliseconds, weighty, premium, no tail.

### `pm_confirm_positive_v1` — 0.6 с, громкость 0.32
**Экран:** `components/ThemedConfirmModal.tsx`, `components/ThemedChoiceModal.tsx` · Момент: пользователь подтвердил безопасное действие.

**A.** pm_confirm_positive — clean interface confirmation for an approved safe action. Two clear sine ticks rising into a short bright resolution, 600 milliseconds, dry, decisive, agreeable.

**B.** pm_confirm_positive — warm arcade yes-cue for confirming an action in a mobile app. Bright plucked pair with a soft bell tail, 600 milliseconds, friendly, positive.

**C.** pm_confirm_positive — cinematic assent for a confirmed choice. Clean tone with a faint warm bloom rising behind it, 600 milliseconds, composed, premium, no tail.

### `pm_confirm_destructive_v1` — 0.7 с, громкость 0.34
**Экран:** `components/DeleteAccountConfirmModal.tsx` и другие удаления · Момент: подтверждено необратимое действие.

**A.** pm_confirm_destructive — grave clean interface cue for an irreversible action being confirmed. Single low sine tone with a heavy filter close and a final damped click, 700 milliseconds, dry, sober, never dramatic or punishing.

**B.** pm_confirm_destructive — measured arcade cue for a permanent deletion in a mobile app. Low muted knock with a slow downward settle and a dull final tap, 700 milliseconds, serious, warm, respectful.

**C.** pm_confirm_destructive — cinematic weight of an irreversible decision. Deep padded impact with a slow air release, 700 milliseconds, grave, dignified, controlled tail.

### `pm_toast_neutral_v1` — 0.35 с, громкость 0.20
**Экран:** `components/InGameToast.tsx`, `components/CoachToast.tsx` · Момент: появилась нейтральная информационная плашка.

**A.** pm_toast_neutral — very light interface cue for a neutral informational toast sliding in. Single soft filtered blip with almost no pitch movement, 350 milliseconds, extremely restrained, dry, must not interrupt anything.

**B.** pm_toast_neutral — small warm arcade notice tap for an info banner in a mobile app. Tiny rounded pop with a soft tail, 350 milliseconds, friendly, unobtrusive.

**C.** pm_toast_neutral — cinematic whisper-light notice cue. Faint air tick with a hint of low body, 350 milliseconds, delicate, barely present, no tail.

---

# 12. Навигация и оболочка приложения

Таббар, свайпы между вкладками, возврат назад, обновление списка. По решению
владельца обычные нажатия не звучат — поэтому здесь только четыре звука
оболочки, самые сдержанные во всём документе.

Папка: `assets/audio/sfx/v1/app/` · Семейство: `app`

---

### `pm_tab_switch_v1` — 0.25 с, громкость 0.16
**Экран:** `app/(tabs)/_layout.tsx`, `app/TabSlider.tsx` · Момент: пользователь переключил вкладку. Очень тихий, звучит десятки раз за сессию.

**A.** pm_tab_switch — near-subliminal interface tick for switching between main tabs in a mobile app. Micro filtered click with a barely perceptible pitch, 250 milliseconds, extremely quiet, completely dry, engineered to never fatigue across hundreds of repeats.

**B.** pm_tab_switch — tiny warm arcade tab tap in a mobile app navigation bar. Micro rounded pop, 250 milliseconds, soft, light, repeatable.

**C.** pm_tab_switch — cinematic micro-detent for a navigation change. Faint dry tap with a whisper of air, 250 milliseconds, delicate, refined, no resonance.

### `pm_nav_back_v1` — 0.3 с, громкость 0.18
**Момент:** возврат на предыдущий экран.

**A.** pm_nav_back — minimal interface cue for navigating back to a previous screen. Short filtered swish with a gentle downward pitch drift, 300 milliseconds, dry, quiet, directional.

**B.** pm_nav_back — soft arcade back-step cue in a mobile app. Small reversed whoosh with a light settle, 300 milliseconds, friendly, unobtrusive.

**C.** pm_nav_back — cinematic soft retreat between screens. Faint reversed air pass with a low settle, 300 milliseconds, elegant, quiet, no tail.

### `pm_pull_refresh_v1` — 0.5 с, громкость 0.24
**Момент:** пользователь потянул список вниз и запустил обновление.

**A.** pm_pull_refresh — clean interface cue for a pull-to-refresh gesture triggering a reload. Rising filtered sweep with an elastic pitch bend and a release tick, 500 milliseconds, dry, springy, mechanical.

**B.** pm_pull_refresh — playful arcade elastic-release cue for refreshing a list in a mobile app. Rubber-band style pitch stretch snapping back with a bright pop, 500 milliseconds, fun, tactile.

**C.** pm_pull_refresh — cinematic tension-and-release for a refresh gesture. Airy stretch with a soft snap and a clean settle, 500 milliseconds, physical, premium, no tail.

### `pm_content_loaded_v1` — 0.4 с, громкость 0.20
**Момент:** данные подгрузились, скелетон сменился реальным содержимым.

**A.** pm_content_loaded — light interface cue for skeleton placeholders resolving into real content. Soft filter opening with a brief clean tone settling, 400 milliseconds, dry, quiet, signals readiness without celebration.

**B.** pm_content_loaded — small warm arcade cue for loaded content in a mobile app. Gentle pluck with a soft bloom, 400 milliseconds, friendly, understated.

**C.** pm_content_loaded — cinematic soft materialisation of loaded content. Faint air bloom with a clean low settle, 400 milliseconds, refined, quiet, no tail.

---

# 13. Арена — 29 звуков уже ждут файлов

**Ключи уже расставлены в коде и в реестре, источник стоит `null`** — то есть
места вызова работают, но звучит тишина. Как только файлы появятся, каждый
включается изменением ровно одной строки.

Промпты для этих 29 звуков **уже написаны** и лежат в отдельном файле:

`docs/arena/SOUND_PROMPTS.md`

Список ожидающих ключей: `search_start`, `search_loop`, `opponent_found`,
`countdown_tick`, `countdown_go`, `task_in`, `option_tap`, `answer_correct`,
`answer_first`, `answer_wrong`, `opponent_answered`, `timer_tick`, `timeout`,
`combo_start`, `combo_up`, `combo_break`, `pair_match`, `pair_miss`,
`pair_clear`, `result_win`, `result_loss`, `result_draw`, `star_fly`,
`star_land`, `goal_complete`, `reward_unlock`, `rank_up`, `rank_down`.

Плюс один звук в общем реестре без файла: `pm.reward.vip_finale`.

### `pm_reward_vip_finale_v1` — 1.85 с, громкость 0.64
**Момент:** финальный аккорд VIP-распаковки — самое редкое и дорогое событие в приложении.

**A.** pm_reward_vip_finale — the most premium interface ceremony in the entire app, played at the final beat of a VIP reward unboxing. Wide ascending crystal and sine chord opening through a slow filter into a luminous sustained major resolution with a delicate shimmer trail, 1.85 seconds, immaculately clean, no muddy reverb, must feel rarer and more valuable than every other sound in the product.

**B.** pm_reward_vip_finale — grand arcade jackpot finale for the rarest reward in a mobile game. Layered bell and crystal fanfare rising in three waves with a golden sparkle shower and a warm triumphant landing, 1.85 seconds, exuberant, generous, unmistakably the top prize.

**C.** pm_reward_vip_finale — cinematic coronation for the rarest possible reward. Full horn and string swell with choir-like air, a deep timpani impact on the downbeat and a cascading crystal bell resolution above it, 1.85 seconds, majestic, glorious, tightly controlled tail.

---

# 14. Опциональный слой: озвучка нажатий

**Это отдельное решение владельца — не включаю без подтверждения.**

В `app/feedback/feedback_kit.ts` звук нажатий был убран по прямой просьбе:
«ЗВУК-«писк» при нажатии кнопок убран совсем — остаётся только тактильный
отклик». Если хочется вернуть плотность на уровень нажатий, вот три звука,
которые покроют всё приложение целиком, не создавая какофонии.

Папка: `assets/audio/sfx/v1/ui/` · Семейство: `app`

---

### `pm_ui_press_v1` — 0.12 с, громкость 0.14
**Момент:** любое нажатие на кнопку или интерактив во всём приложении.

**A.** pm_ui_press — the quietest possible interface press tick, used on every button in a mobile app. Micro dry click with a single faint pitched partial, 120 milliseconds, no resonance, no tail, must remain pleasant after ten thousand repetitions in one session.

**B.** pm_ui_press — micro warm arcade button tap for universal use in a mobile app. Tiny soft bubble pop, 120 milliseconds, rounded, friendly, featherweight.

**C.** pm_ui_press — cinematic micro-contact for a universal press. Faint dry tap with the barest hint of low body, 120 milliseconds, delicate, refined, silent tail.

### `pm_ui_tile_v1` — 0.14 с, громкость 0.13
**Момент:** нажатие на плитку/букву в игровых заданиях, где сейчас только вибрация.

**A.** pm_ui_tile — ultra-light interface tick for tapping a letter tile in a word game. Micro filtered click with a soft wooden edge and no pitch centre, 140 milliseconds, dry, neutral, designed for rapid repeated tapping.

**B.** pm_ui_tile — tiny warm arcade tile tap for a mobile word game. Micro muted wood knock, 140 milliseconds, soft, tactile, unfatiguing.

**C.** pm_ui_tile — cinematic micro-tap of a physical tile. Faint padded contact with a whisper of resonance, 140 milliseconds, organic, quiet, no tail.

### `pm_ui_disabled_v1` — 0.2 с, громкость 0.16
**Момент:** нажатие на заблокированный элемент — ничего не произойдёт.

**A.** pm_ui_disabled — soft interface cue for tapping a disabled control. Muted low click with a heavily damped filter and no pitch resolution, 200 milliseconds, dry, inert, communicates nothing-will-happen without scolding.

**B.** pm_ui_disabled — gentle arcade dud-tap for an inactive button in a mobile app. Small dull thud with no bounce, 200 milliseconds, soft, harmless.

**C.** pm_ui_disabled — cinematic dead contact on an inactive control. Padded muted knock with immediate damping, 200 milliseconds, inert, respectful, no tail.

---

# 15. Итоговый список файлов и порядок работы

## Сколько звуков в документе

| Раздел | Новых звуков |
|---|---|
| 1. Персональный план | 12 |
| 2. Пейволы и покупки | 12 |
| 3. MAX-звонок | 12 |
| 4. Диалоги с ИИ | 11 |
| 5. Карточки | 10 |
| 6. Магазины и валюты | 8 |
| 7. Профиль и прогресс | 9 |
| 8. Соцчасть и лига | 10 |
| 9. Уроки: обвязка | 10 |
| 10. Настройки и системное | 10 |
| 11. Модалки и тосты | 6 |
| 12. Навигация | 4 |
| 13. Арена (промпты готовы отдельно) | 29 + 1 |
| 14. Опциональный слой нажатий | 3 |
| **Итого новых звуков** | **117** (без Арены — 87) |
| **Итого промптов** | **351** (по три на каждый звук) |

## Рекомендуемый порядок генерации

Не нужно делать всё сразу. Порядок по отдаче:

1. **Арена (29)** — код уже готов и ждёт, это самая быстрая победа.
2. **Пейволы и покупки (12)** — деньги; успешная оплата без звука ощущается как сбой.
3. **Модалки, тосты, навигация (10)** — покрывают 72 экрана разом небольшим набором.
4. **Персональный план (12)** — целый продукт, который сейчас полностью немой.
5. **MAX и Диалоги (23)** — живой голос, звуки тихие и вспомогательные.
6. **Остальное (по разделам)** — карточки, магазины, профиль, лига, уроки, настройки.
7. **Слой нажатий (3)** — только если владелец решит вернуть то, что раньше убрал.

## Что делаю я после того, как файлы появятся

1. Кладу файлы в `assets/audio/sfx/v1/<семейство>/`.
2. Добавляю ключи в `modules/audio/sound_events.ts` с указанными громкостью,
   приоритетом, кулдауном и длительностью.
3. Расставляю вызовы `soundDirector.request(...)` в экранах.
4. Прогоняю контрактные тесты звука точечно, без полного сюита.

Пока файла нет, ключ можно завести со значением `null` — директор молча
пропускает такие события, приложение не ломается, заглушек в экранах не
появляется. Именно так сейчас живёт Арена.
