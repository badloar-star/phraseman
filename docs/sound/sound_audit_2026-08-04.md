# Аудит звука Phraseman — 2026-08-04

Аудит проведён поверх уже развёрнутой системы `SoundDirector`
(`modules/audio/sound_director.ts`, каталог `modules/audio/sound_events.ts`).
Основа — мастер-документ `PHRASEMAN SOUND DESIGN'/phraseman_sound_design_master_v1.md`
(аудит от 2026-07-30). За неделю разработчики УЖЕ подключили почти весь Wave 1+2:
correct/needs_work/hint/timer, voice record_ready/turn_ready/no_speech,
completion micro/session/perfect/exam_pass/exam_retry/star_1-3, system success/info/
warning/error/destructive, energy empty/refilled, streak saved, почти все reward.*,
league promoted/demoted, social gift/friend_request/quest_complete.

Этот документ — **дельта**: что осталось немым и реально оживило бы приложение,
плюс готовые промпты ElevenLabs в 3 варианта на каждую новую находку.

## ✅ Статус внедрения (2026-08-04, вторая итерация)

7 из 8 предложенных звуков сгенерированы владельцем и **подключены в код**:

| Событие | Файл события | Подключено в |
|---|---|---|
| `pm.app.welcome` | `assets/audio/sfx/v1/app/pm_app_welcome_v1.wav` | `app/_layout.tsx`, `handleOnboardingDone` — играет один раз за жизнь аккаунта (флаг `pm_app_welcome_played_v1`) |
| `pm.lesson.begin` | `assets/audio/sfx/v1/learning/pm_lesson_begin_v1.wav` | `app/lesson_intro_screens.tsx`, mount, dedupe по `lessonId` |
| `pm.learn.combo_up` | `assets/audio/sfx/v1/learning/pm_learn_combo_up_v1.wav` | `app/lesson1.tsx` — только на пересечение порога 3/5/10 (`comboLevelRef`), не на каждый верный ответ |
| `pm.exam.begin` | `assets/audio/sfx/v1/learning/pm_exam_begin_v1.wav` | `app/exam.tsx` (конец countdown → `quiz`) и `app/diagnostic_test.tsx` (start/restart) |
| `pm.reward.pack_reveal_start` | `assets/audio/sfx/v1/reward/pm_reward_pack_reveal_start_v1.wav` | `app/pack_opening.tsx`, до первого флипа |
| `pm.reward.pack_complete` | `assets/audio/sfx/v1/reward/pm_reward_pack_complete_v1.wav` | `app/pack_opening.tsx`, все карточки открыты (рядом с уже существующим конфетти) |
| `pm.social.friend_added` | `assets/audio/sfx/v1/social/pm_social_friend_added_v1.wav` | `app/(tabs)/friends.tsx`, `handleAcceptRequest` — играет оптимистично, до ответа сервера |

**Не подключено:** `pm.voice.session_open` (вход в разговорный режим `ai_dialog`/
`speaking_club`) — этого файла не было среди присланных. Если понадобится —
промпты для него остаются в разделе 5 ниже, генерация и подключение отдельным
шагом.

Контрактные тесты (`tests/sound_events_contract.test.ts`,
`tests/sound_event_call_sites_contract.test.ts`) обновлены и зелёные — каждое
новое событие подтверждённо вызывается хотя бы в одном реальном месте кода.

---

## 1. Что реально ещё немое (проверено по коду, не только предположение)

| # | Место | Сейчас | Предлагаемое событие | Приоритет |
|---|---|---|---|---|
| 1 | `app/exam.tsx:814,817` — финал экзамена Лингмана (диплом, до 10000 XP) | вообще без звука/хаптика на импорт SoundDirector | `pm.complete.exam_pass` / `pm.complete.exam_retry` (уже есть звук, только подключить вызов) | 🔴 высокий |
| 2 | `app/lesson_complete.tsx:1051` — очередь тостов после урока (разблокировка урока/медаль/экзамен доступен) | `scheduleActiveNotif` без единого звука | `pm.reward.small` на unlock, `pm.reward.achievement` на медаль/экзамен | 🔴 высокий |
| 3 | `components/LeagueChestOpenModal.tsx` (используется в `club_screen.tsx`) | только `hapticSuccess` | `pm.reward.chest_open` — звук уже есть, просто не переиспользован | 🟡 средний |
| 4 | `app/(tabs)/friends.tsx` — `FriendQuestCompletedModal` (свой квест с другом выполнен) | без звука | `pm.social.quest_complete` (переиспользовать) | 🟡 средний |
| 5 | `app/tournament_lobby.tsx:440` — комната укомплектована (16/16) | без звука | `pm.arena.match_found` (звука-файла ещё нет) | 🟡 средний |
| 6 | `app/flashcards_swipe.tsx:2173` — карточка ушла в «выучено» навсегда | звучит тот же `pm.learn.correct`, что и обычный верный свайп — разницы на слух нет | заменить на `pm.complete.micro` именно в ветке `mastered` | 🟡 средний |
| 7 | `app/flashcards_swipe.tsx` — вся колода пройдена, экран статистики | без звука | `pm.complete.session` (переиспользовать) | 🟢 низкий |
| 8 | `app/diagnostic_test.tsx:1267` — диагностика уровня завершена (часто первое впечатление новичка) | без звука | `pm.complete.session` | 🟡 средний |
| 9 | `app/lesson1.tsx` — серия правильных ответов пересекает порог (кольцо ComboRing визуально вспыхивает) | физически нет звука: `pm.learn.combo_5/10` удалены из каталога | НОВОЕ `pm.learn.combo_up` (см. промпты ниже) | 🟡 средний |
| 10 | `app/pack_opening.tsx` — последняя карточка пака перевёрнута, весь пак открыт (конфетти уже есть) | конфетти в тишине | `pm.complete.session` либо НОВОЕ `pm.reward.pack_complete` | 🟢 низкий |
| 11 | `app/season_pass.tsx` — успешная покупка сезон-пасса / клейм награды сезона | без звука, только тап | `pm.system.success` (покупка) / `pm.reward.collectible` (клейм) | 🟢 низкий |
| 12 | `app/shards_shop.tsx` — сервер подтвердил зачисление жемчуга после оплаты | без звука | `pm.system.success` | 🟢 низкий |
| 13 | `app/(tabs)/friends.tsx:2832` — заявка в друзья принята, новый друг в списке | `hapticTap`, как обычный тап | НОВОЕ, лёгкое `pm.social.friend_added` | 🟢 низкий |

### Особый случай — НЕ трогать без владельца
`components/tournament/TournamentRoundIntro.tsx:90-96` — отсчёт 3-2-1 перед раундом
турнира. В коде явный комментарий: **«клик-звук только на управляющих кнопках, здесь
ничего не нажимают»** — сознательное решение владельца (2026, дата в коде не указана,
но формулировка однозначна). События `pm.arena.countdown_3/2/1` зарегистрированы в
каталоге, но файлов ещё нет — похоже, заводились именно под этот экран, а потом
решение поменяли на haptic-only. **Не подключать молча** — сначала спросить, отменяется
ли старое решение.

---

## 2. Промпты ElevenLabs — только для новых/недостающих событий

Для событий, у которых звук **уже готов** (chest_open, quest_complete, session, micro,
achievement, small, collectible, success, match_found — промпты для match_found есть
в мастер-документе, файла ещё нет) — **используйте существующие промпты из
`phraseman_sound_design_master_v1.md`**, ничего нового генерировать не нужно, только
подключить вызов в коде.

Ниже — промпты ТОЛЬКО для реально отсутствующих в каталоге событий: `pm.learn.combo_up`,
`pm.reward.pack_complete`, `pm.social.friend_added`. Формат — короче делать для
копирования: 3 варианта (A/Б/В), каждый в своём блоке. Длина промптов сознательно
неровная — короче для простых one-shot, длиннее там, где нужно больше деталей тембра.

Все — 48kHz WAV, non-looping, model `eleven_text_to_sound_v2`, English.

---

### 🆕 `pm.learn.combo_up` — Серия ответов перешла на новый уровень

**Смысл:** Один тихий stinger, короче обычного correct, на пересечение порога серии
(3/5/10). НЕ на каждый верный ответ — только когда ComboRing реально повышает уровень.
Заменяет обычный correct в этот момент, не звучит поверх него.

**Параметры:** duration `0.5s`; priority `76`; cooldown `2000ms`; volume `0.44`.

**Куда пойдёт:** `app/lesson1.tsx` — момент, когда серия правильных ответов
пересекает порог 3/5/10 и `ComboRing` визуально повышает уровень (сейчас звука
физически нет, `pm.learn.combo_5/10` были удалены из каталога).

#### Вариант A — короткий, кристальный
```text
pm.learn.combo_up — app/lesson1.tsx, ComboRing crosses a streak threshold (3/5/10 correct answers in a row). Create a 0.5-second premium mobile UI one-shot for a correct-answer streak leveling up in a language-learning app. A quick bright felted-glass upward flick, brief crystalline energy tick, elegant and compact. Mood: energized, earned, light. Fast attack, dry mix, clean tail, mono-compatible. No voice, harsh highs, distortion, alarm, casino, sub-bass, long reverb.
```

#### Вариант Б — тактильный, чуть длиннее
```text
pm.learn.combo_up — app/lesson1.tsx, ComboRing crosses a streak threshold (3/5/10 correct answers in a row). Create a 0.5-second premium mobile UI one-shot for a correct-answer streak leveling up in a supportive language-learning app. Two quick maple taps rising in pitch, closing on one small warm ceramic ring; rhythmic, confident, not arcade-like. Mood: energized, earned, momentum. Fast attack, dry close mix, clean short tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

#### Вариант В — воздушный, самый длинный
```text
pm.learn.combo_up — app/lesson1.tsx, ComboRing crosses a streak threshold (3/5/10 correct answers in a row). Create a 0.5-second premium mobile UI one-shot for a correct-answer streak crossing into a higher level in a premium language-learning app. A soft nylon-pluck flourish with a single restrained airy shimmer at the very end, suggesting rising momentum without fireworks or a big celebration. Mood: energized, elegant, quietly proud. Fast attack, dry close mix, clean short tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

---

### 🆕 `pm.reward.pack_complete` — Весь набор карточек открыт

**Смысл:** Финальный аккорд церемонии распаковки, когда перевёрнута последняя карточка
пака. Богаче обычного `complete.micro`, но короче `complete.perfect`. Играет один раз
на весь пак, не на каждую карточку.

**Параметры:** duration `1.0s`; priority `80`; cooldown `3000ms`; volume `0.5`.

**Куда пойдёт:** `app/pack_opening.tsx` — момент, когда перевёрнута последняя
карточка пака и конфетти уже запускается, но звука к нему нет.

#### Вариант A — короткий, стеклянный
```text
pm.reward.pack_complete — app/pack_opening.tsx, last card of the pack flipped, whole pack fully revealed. Create a 1.0-second premium mobile UI one-shot for an entire collectible card pack fully revealed in a language-learning app. Three warm felted-glass notes rising and resolving in D-major pentatonic, pearly and satisfying. Mood: complete, rewarding, elegant. Fast attack, dry mix, clean tail, mono-compatible. No voice, harsh highs, distortion, alarm, casino, sub-bass, long reverb.
```

#### Вариант Б — тактильный
```text
pm.reward.pack_complete — app/pack_opening.tsx, last card of the pack flipped, whole pack fully revealed. Create a 1.0-second premium mobile UI one-shot for an entire collectible card pack fully revealed in a language-learning app. A confident maple-and-ceramic cadence closing with one rounded resonant crown tone, like the last card settling into place. Mood: complete, rewarding, satisfying. Fast attack, dry close mix, clean tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

#### Вариант В — воздушный, богатый
```text
pm.reward.pack_complete — app/pack_opening.tsx, last card of the pack flipped, whole pack fully revealed. Create a 1.0-second premium mobile UI one-shot for the final card of a collectible pack being revealed, closing out the whole opening ceremony in a premium language-learning app. A graceful nylon-pluck ascent blooming into a controlled velvet-air glow, celebratory but restrained, never a slot-machine jackpot feeling. Mood: complete, generous, quietly triumphant. Fast attack, dry close mix, clean tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

---

### 🆕 `pm.social.friend_added` — Заявка в друзья принята

**Смысл:** Лёгкий социальный сигнал «теперь вы друзья» — на стороне того, кто принял
заявку. Не путать с `pm.social.friend_request` (входящая заявка) и `gift_received`.
Заметно легче и короче обоих — это фоновое приятное подтверждение, не празднование.

**Параметры:** duration `0.4s`; priority `55`; cooldown `2000ms`; volume `0.3`.

**Куда пойдёт:** `app/(tabs)/friends.tsx` — `handleAcceptRequest`, момент принятия
заявки в друзья (сейчас там только обычный `hapticTap`, как на рядовой тап).

#### Вариант A — короткий
```text
pm.social.friend_added — app/(tabs)/friends.tsx, handleAcceptRequest, friend request just got accepted. Create a 0.4-second premium mobile UI one-shot for a friend request being accepted in a social feature of a language-learning app. Two tiny warm glass notes meeting in a soft consonant interval, friendly and brief. Mood: warm, social, light. Fast attack, dry mix, clean tail, mono-compatible. No voice, harsh highs, distortion, alarm, casino, sub-bass, long reverb.
```

#### Вариант Б — тактильный
```text
pm.social.friend_added — app/(tabs)/friends.tsx, handleAcceptRequest, friend request just got accepted. Create a 0.4-second premium mobile UI one-shot for a friend request being accepted in a social feature of a language-learning app. A soft double tap of rounded wood and ceramic, like a friendly handshake; casual and warm, not a big reward. Mood: warm, social, understated. Fast attack, dry close mix, clean tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

#### Вариант В — воздушный
```text
pm.social.friend_added — app/(tabs)/friends.tsx, handleAcceptRequest, friend request just got accepted. Create a 0.4-second premium mobile UI one-shot for two users becoming friends in a social feature of a premium language-learning app. A brief nylon-pluck duet, two notes gently meeting in a consonant interval with a touch of air; friendly and small in scale. Mood: warm, social, quietly pleasant. Fast attack, dry close mix, clean tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

---

## 3. Переиспользовать существующие звуки (просто подключить вызов, без генерации)

Для находок №1-8, 10-12 из раздела 1 — звук уже готов и лежит в
`assets/audio/sfx/v1/`, промпты для него уже есть в мастер-документе (разделы
про `pm.complete.exam_pass`, `pm.reward.small`, `pm.reward.achievement`,
`pm.reward.chest_open`, `pm.social.quest_complete`, `pm.complete.micro`,
`pm.complete.session`, `pm.system.success`, `pm.reward.collectible`). Генерировать
заново не нужно — задача чисто программная: добавить `soundDirector.request(...)`
в нужном месте кода.

Единственное исключение — `pm.arena.match_found`: событие зарегистрировано, промпт
готов в мастер-документе (раздел 36), но WAV-файла ещё нет — его нужно сгенерировать
по существующему промпту (не по новому).

---

## 4. ⭐ Приветственный звук первого входа в приложение (самая ценная находка)

**Место:** `app/_layout.tsx:2745` — `handleOnboardingDone`, единственный
обработчик завершения онбординга (защищён guard'ом `onboardingDoneHandledRef`,
не может сработать дважды). Сразу после него — `router.replace('/(tabs)/home')`
на строке 2765. Это буквально первая секунда, когда человек попадает в само
приложение после того, как выбрал язык, прошёл диагностику и т.д.

**Почему это самое ценное место во всём аудите:** по эффекту знаменитого
peak-end rule первое яркое впечатление формирует отношение ко всему продукту
на месяцы вперёд. Сейчас этот момент абсолютно тихий — человек просто видит
Home. Психологически правильный звук здесь — не награда и не фанфара (человек
ещё ничего не заработал), а **тёплое персональное «добро пожаловать»**: ощущение
выдоха, того что тебя приняли, а не выдали ачивку.

**Параметры:** duration `1.6s`; priority `65` (выше обычных info, но ниже
learning-сигналов — это не критично важное состояние, но и не фоновый шум);
играет **строго один раз в жизни аккаунта** (использовать уже существующий
паттерн `onboarding_done` из `AsyncStorage`, не отдельный флаг); volume `0.4`
(заметнее атмосферных подложек из раздела 6, но мягче обычных reward-сигналов —
это про эмоцию, не про хайп).

**Куда пойдёт:** `soundDirector.request('pm.app.welcome', ...)` — вызвать внутри
`handleOnboardingDone`, сразу после строки `setFirstContentReady(true)` (2764) и
до `router.replace` (2765), чтобы звук стартовал одновременно с уходом оверлея
онбординга, а не после — тогда он воспринимается как часть перехода, а не как
случайный звук на новом экране.

### 🆕 `pm.app.welcome` — Первый вход в приложение после онбординга

#### Вариант A — короткий, тёплый (рекомендуемый)
```text
pm.app.welcome — app/_layout.tsx, handleOnboardingDone, the very first moment a person enters the app after finishing onboarding, once in the lifetime of the account. Create a 1.6-second premium mobile UI one-shot for a warm, personal welcome — the feeling of being gently received, not a reward or an achievement. A soft felted-glass phrase rising through two notes of D-major pentatonic and settling into a warm, open resolution, like a quiet exhale. Mood: welcoming, warm, personal, unhurried — never triumphant or game-like. Fast attack, dry close mix, smooth clean tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, applause, choir, sub-bass, or long reverb.
```

#### Вариант Б — тактильный, человечный
```text
pm.app.welcome — app/_layout.tsx, handleOnboardingDone, the very first moment a person enters the app after finishing onboarding, once in the lifetime of the account. Create a 1.6-second premium mobile UI one-shot for a warm, personal welcome moment, like being greeted at the door rather than rewarded for a task. A gentle maple tap blooming into a soft, rounded ceramic warmth with a slow natural decay, human and sincere rather than polished-corporate. Mood: welcoming, warm, sincere, calm. Fast attack, dry close mix, smooth clean tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, applause, choir, sub-bass, or long reverb.
```

#### Вариант В — воздушный, самый эмоциональный, длиннее
```text
pm.app.welcome — app/_layout.tsx, handleOnboardingDone, the very first moment a person enters the app after finishing onboarding, once in the lifetime of the account. Create a 2.0-second premium mobile UI one-shot for the emotional feeling of finally arriving somewhere good — warm, personal, quietly moving, but never loud or triumphant, since the user has not earned anything yet, they have simply arrived. A slow velvet-air swell carrying one gentle nylon-pluck phrase that opens and softly resolves, like a door opening onto a welcoming room. Mood: warm, personal, quietly emotional, quietly optimistic. Fast attack, dry close mix, smooth clean tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, applause, choir, sub-bass, or long reverb.
```

**Важные ограничения при внедрении:**
- Играть **один раз за всё время жизни аккаунта** — не на каждый холодный старт
  и не повторно, если онбординг прошёл повторно через QA-reset (использовать
  реальный флаг `onboarding_done`, не сессионный).
- Не путать с `pm.reward.premium_open`/`vip_open` — это НЕ celebration покупки,
  громкость и характер должны явно отличаться (теплее, тише, короче).
- Если следом показывается `IntroFullAccessWelcome` модалка (строка 2786-2788,
  задержка 320ms) — этот welcome-звук должен полностью отзвучать раньше, чем
  откроется модалка, иначе получится два «приветствия» подряд и ощущение
  спутается. При duration 1.6-2.0s и задержке модалки 320ms — стоит сдвинуть
  задержку модалки до ~1800ms, либо звук должен звучать тише к 320ms.

---

## 5. Атмосферные/креативные добавки — вход в контент, не события-триггеры

Отдельная категория от «звук на изменение смысла» выше. Это НЕ сигналы состояния,
а очень тихая, короткая **атмосферная текстура** («вдох») на входе в контент —
там, где сейчас тишина, но пауза в анимации уже достаточно длинная, чтобы звук
не столкнулся с TTS/речью. В коде уже есть прецедент такого подхода: атмосферные
подложки онбординга `assets/audio/onboarding_aha/ambient_*.mp3` (used in
`app/personal_plan_exercise.tsx`). Ниже — где ещё это уместно, без нарушения
принципа «тишина по умолчанию».

**Правила для этой категории:**
- Длительность 1.5–2.5s, громкость заметно ниже learning-сигналов (0.15–0.22),
  без резкого attack — это подложка, а не сигнал.
- Играть **один раз** на явный вход в контент (mount конкретного экрана), НЕ на
  каждый переход между блоками внутри него.
- НЕ повторять при возврате назад/повторном открытии в одной сессии — только на
  первый вход (аналог правила `introShownRaw` в `lesson1.tsx`).
- Всегда должно быть можно выключить через `uiSounds`, как и всё остальное.

| # | Место | Момент | Идея |
|---|---|---|---|
| 14 | `app/lesson_intro_screens.tsx` — `useEffect` на mount (строки 424-439) | Открывается интро-карточка нового урока, header уже фейдится 900ms — звука в этот момент физически нет | НОВОЕ `pm.lesson.begin` — тихий «вдох», подложка под уже существующую анимацию, не отдельный cue |
| 15 | `app/ai_dialog.tsx` / `app/speaking_club.tsx` — вход в разговорный режим (до первой реплики ИИ) | Экран открывается, идёт разводка перед тем как партнёр начнёт говорить | НОВОЕ `pm.voice.session_open` — короткая «настройка эфира», намекает на диалог до того как зазвучит TTS |
| 16 | `app/pack_opening.tsx` — самый первый рендер экрана (до первого флипа карточки) | Пак ещё закрыт, ждём первого тапа | НОВОЕ `pm.reward.pack_reveal_start` — лёгкое предвкушение, отличное от финального `pack_complete` |
| 17 | `app/diagnostic_test.tsx` / `app/exam.tsx` — самый первый экран (до первого вопроса) | Тест открылся, есть пауза перед первым заданием | НОВОЕ `pm.exam.begin` — собранный, сфокусированный «вдох», сигнализирует «началось важное» без давления |

### 🆕 `pm.lesson.begin` — Начало нового урока (интро-экран)

**Смысл:** Едва слышная атмосферная подложка под уже существующий 900ms fade
интро-карточки. Не приветствие и не фанфара — просто ощущение «страница
открылась», без which ломает тишину.

**Параметры:** duration `1.8s`; priority `20` (самый низкий из всех, легко
вытесняется чем угодно важным); cooldown `нет — играет один раз на lessonId
за сессию`; volume `0.18`.

**Куда пойдёт:** `app/lesson_intro_screens.tsx`, `useEffect` при монтировании
компонента (строка ~424), синхронно с уже идущим header-fade — только для
уроков, где `introShownRaw` ещё `false` (не повторять при повторном заходе).

#### Вариант A — короткий, стеклянный
```text
pm.lesson.begin — app/lesson_intro_screens.tsx, mount, lesson intro card fading in for the first time this session. Create a 1.8-second premium mobile UI ambient one-shot for the quiet opening moment of a new language lesson. A very soft, slow felted-glass swell with no percussive attack, like a page gently opening. Mood: calm, inviting, unhurried. Extremely low level, dry mix, smooth fade in and out, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

#### Вариант Б — тёплый, деревянный
```text
pm.lesson.begin — app/lesson_intro_screens.tsx, mount, lesson intro card fading in for the first time this session. Create a 1.8-second premium mobile UI ambient one-shot for the quiet opening moment of a new language lesson. A gentle warm wood-and-paper room-tone breath rising and settling, like turning to a fresh page in a notebook. Mood: calm, warm, focused. Extremely low level, dry mix, smooth fade in and out, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

#### Вариант В — воздушный, самый длинный
```text
pm.lesson.begin — app/lesson_intro_screens.tsx, mount, lesson intro card fading in for the first time this session. Create a 2.2-second premium mobile UI ambient one-shot for the quiet opening moment of a new language lesson in a premium app. A slow velvet-air swell with one faint nylon harmonic surfacing near the end, barely audible, like curtains gently opening on a new scene. Mood: calm, focused, quietly optimistic. Extremely low level, dry mix, smooth fade in and out, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

---

### 🆕 `pm.voice.session_open` — Вход в разговорный режим

**Смысл:** Очень короткая «настройка эфира» перед тем, как партнёр/ИИ произнесёт
первую реплику — сигнализирует «канал открыт», по духу похоже на мягкий сигнал
подключения звонка, но без ассоциации с телефонией.

**Параметры:** duration `0.6s`; priority `50`; cooldown `нет — один раз на вход
в экран`; volume `0.22`.

**Куда пойдёт:** `app/ai_dialog.tsx` и `app/speaking_club.tsx` — при монтировании
экрана, ДО того как стартует TTS первой реплики партнёра (должен полностью
отзвучать раньше, чем начнётся речь — не пересекаться с `deferAfterVoice`).

#### Вариант A — короткий
```text
pm.voice.session_open — app/ai_dialog.tsx and app/speaking_club.tsx, screen mount, right before the AI partner's first line of speech starts. Create a 0.6-second premium mobile UI one-shot for a conversational session quietly opening, like a channel becoming ready. Two soft glass notes settling into an open interval, calm and inviting. Mood: open, ready, calm. Fast attack, dry mix, clean tail, mono-compatible. No voice, harsh highs, distortion, alarm, casino, sub-bass, long reverb.
```

#### Вариант Б — тактильный
```text
pm.voice.session_open — app/ai_dialog.tsx and app/speaking_club.tsx, screen mount, right before the AI partner's first line of speech starts. Create a 0.6-second premium mobile UI one-shot for a conversational session quietly opening. A soft wooden-and-ceramic double tap settling into stillness, like taking a seat before a conversation. Mood: open, ready, calm. Fast attack, dry close mix, clean tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

#### Вариант В — воздушный
```text
pm.voice.session_open — app/ai_dialog.tsx and app/speaking_club.tsx, screen mount, right before the AI partner's first line of speech starts. Create a 0.6-second premium mobile UI one-shot for a conversational channel becoming ready in a premium language-learning app. A short airy nylon-pluck gesture opening into stillness, unhurried and welcoming. Mood: open, ready, calm. Fast attack, dry close mix, clean tail, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

---

### 🆕 `pm.reward.pack_reveal_start` — Пак карточек ещё закрыт, ждём первого тапа

**Смысл:** Лёгкое предвкушение на входе в экран распаковки, ДО первого флипа —
не празднование (это `pack_complete`), а обещание того, что впереди.

**Параметры:** duration `1.4s`; priority `25`; cooldown `нет — один раз на вход
в экран`; volume `0.2`.

**Куда пойдёт:** `app/pack_opening.tsx`, самый первый `useEffect` при mount
экрана — до того как пользователь коснулся первой карточки.

#### Вариант A — короткий
```text
pm.reward.pack_reveal_start — app/pack_opening.tsx, screen mount, pack still closed, before the first card flip. Create a 1.4-second premium mobile UI ambient one-shot for the quiet anticipation of an unopened reward pack. A slow soft felted-glass shimmer rising just slightly and settling, restrained, not a fanfare. Mood: anticipation, calm, inviting. Very low level, dry mix, smooth fade, mono-compatible. No voice, harsh highs, distortion, alarm, casino, sub-bass, long reverb.
```

#### Вариант Б — тактильный
```text
pm.reward.pack_reveal_start — app/pack_opening.tsx, screen mount, pack still closed, before the first card flip. Create a 1.4-second premium mobile UI ambient one-shot for the quiet anticipation of an unopened reward pack. A soft paper-and-wood rustle settling into stillness, like holding a wrapped gift before opening it. Mood: anticipation, calm, tactile. Very low level, dry close mix, smooth fade, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

#### Вариант В — воздушный
```text
pm.reward.pack_reveal_start — app/pack_opening.tsx, screen mount, pack still closed, before the first card flip. Create a 1.6-second premium mobile UI ambient one-shot for quiet anticipation before opening a collectible card pack in a premium app. A restrained velvet-air swell with one faint distant nylon harmonic, barely present, inviting curiosity without hype. Mood: anticipation, elegant, unhurried. Very low level, dry mix, smooth fade, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

---

### 🆕 `pm.exam.begin` — Начало теста/экзамена (первый экран, до первого вопроса)

**Смысл:** Собранный, сфокусированный «вдох» — сигнализирует «началось важное»
без давления и тревоги. Не путать с `pm.complete.exam_pass/retry` (это финал).

**Параметры:** duration `1.2s`; priority `30`; cooldown `нет — один раз на
попытку`; volume `0.2`.

**Куда пойдёт:** `app/exam.tsx` и `app/diagnostic_test.tsx` — на переходе в
`phase: 'question'` первого задания (не на mount всего экрана, а именно на
старт первого вопроса, чтобы не спорить с чтением инструкции).

#### Вариант A — короткий
```text
pm.exam.begin — app/exam.tsx and app/diagnostic_test.tsx, transition into the first question of an exam or level test. Create a 1.2-second premium mobile UI ambient one-shot for the focused beginning of an important test. A calm low felted-glass tone settling with quiet resolve, no tension or urgency. Mood: focused, composed, ready. Low level, dry mix, smooth fade, mono-compatible. No voice, harsh highs, distortion, alarm, casino, sub-bass, long reverb.
```

#### Вариант Б — тактильный
```text
pm.exam.begin — app/exam.tsx and app/diagnostic_test.tsx, transition into the first question of an exam or level test. Create a 1.2-second premium mobile UI ambient one-shot for the focused beginning of an important test. A single grounded maple tap settling into a calm ceramic resonance, composed and unhurried. Mood: focused, composed, ready. Low level, dry close mix, smooth fade, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

#### Вариант В — воздушный
```text
pm.exam.begin — app/exam.tsx and app/diagnostic_test.tsx, transition into the first question of an exam or level test. Create a 1.3-second premium mobile UI ambient one-shot for the composed beginning of an important test in a premium app. A slow, quiet nylon-pluck note opening into a restrained air tail, serious but never stressful. Mood: focused, composed, quietly confident. Low level, dry mix, smooth fade, mono-compatible. No voice, music, harsh highs, distortion, alarm, casino, sub-bass, or long reverb.
```

---

## 6. Правила, которые нужно соблюсти при внедрении (чтобы не перегрузить)

Дополнительно к находкам разделов 4-5:
- `pm.app.welcome` — гвоздь программы: строго один раз за жизнь аккаунта,
  никогда не смешивать с reward-звуками.
- `pm.lesson.begin`, `pm.voice.session_open`, `pm.reward.pack_reveal_start`,
  `pm.exam.begin` — все с приоритетом ниже 50, чтобы любой реальный
  learning/voice/system сигнал их перебивал без конфликта.

- `pm.reward.pack_complete` — только на закрытие ВСЕГО пака, ни в коем случае не на
  каждый флип карточки внутри (это уже осознанно тихо).
- `pm.learn.combo_up` — один и тот же звук на всех порогах (3/5/10), не делать три
  разных файла как раньше (combo_5/combo_10) — визуал (ComboRing) уже различает
  уровни, звуку различать не нужно.
- Dual-подарки (`level_gifts_inventory.tsx`, season pass) — один звук на применение,
  даже если начислений технически два.
- `pm.social.friend_added` — не путать с уже существующим `friend_request`; не
  добавлять звук на decline/dismiss рядом.
- Отсчёт турнира — держать как есть (haptic-only), пока владелец явно не подтвердит
  смену решения.
