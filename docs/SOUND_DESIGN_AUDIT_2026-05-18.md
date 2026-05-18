# Phraseman Sound Design Audit

Дата: 2026-05-18

Статус: концепт и внедренческая спецификация. Код приложения не менялся.

## Главный вывод

Phraseman уже готов к красивому "голосу" на уровне архитектуры: в приложении есть центральный event bus в `app/events.ts`, глобальные наградные модалки, haptics, speech для произношения фраз и много ритуалов прогресса. Сейчас не хватает отдельного слоя коротких музыкальных SFX.

Звук должен быть редким и осмысленным. Не нужно озвучивать каждый tap, каждый tab, каждый toast и каждый XP tick. Лучший результат даст система коротких симфонических сигналов, которые появляются в моменты достижения, открытия, победы, подарка, редкой ошибки или важного перехода состояния.

## Выбранное направление

Рабочее название: "Королевская академия".

Характер: умное, премиальное, теплое, чуть магическое, но не аркадное.

Инструменты:

- Celesta и glass harmonics для shards, знаний, маленьких вспышек.
- Harp и pizzicato strings для correct answer, card reveal, save, light reward.
- Warm strings для lesson complete, daily task, прогресса и спокойной радости.
- Horn, soft brass и choir pad только для редких церемоний: level up, league, premium.
- Low strings, clarinet или bassoon для warning/error, без жесткого наказующего тона.
- Timpani/snare roll очень дозированно для arena, rank и duel moments.

Фирменный мотив: 3 ноты, восходящее движение с мягким разрешением. Он должен иметь варианты:

- Micro motif: 120-300 ms.
- Reward motif: 600-1200 ms.
- Ceremony motif: 1500-4000 ms.

## Правила звука

1. Звук только за смысл, не за механику. Тап сам по себе не звучит.
2. Редкие события звучат богаче, частые события звучат тише и короче.
3. Ошибка не должна унижать. Никаких резких buzzer/nope/beep.
4. Звук приложения отделен от `voiceOut`: произношение фраз не является SFX.
5. Если звучит `expo-speech`, интерфейсные звуки должны приглушаться или откладываться.
6. Нельзя наслаивать несколько наградных cue подряд без очереди и приоритета.
7. Нужна настройка "Звуки приложения" и громкость, отдельно от haptics.
8. Нужно уважать системные accessibility-настройки и сценарии, где пользователь ожидает тишины.

## Что не озвучивать

- `PressableScale` глобально.
- Каждый `hapticTap`.
- Переключение каждого tab в `app/(tabs)/_layout.tsx`.
- Обычный scroll, input, focus, typing.
- Любой background sync, hydration, cloud/profile refresh.
- Любой `action_toast` по умолчанию.
- Повторяющиеся network errors.
- Каждый `xp_changed`.
- Каждый рендер, preload, navigation card press.
- Admin/tester/dev-only действия.

## Приоритет 0: обязательные звуковые ритуалы

| Событие | Точка в коде | Sound ID | Саунд |
| --- | --- | --- | --- |
| Level up | `app/events.ts` -> `level_up_pending`, `GlobalLevelUpHandler` in `app/_layout.tsx` | `level.up` | 3-note motif, strings swell, celesta sparkle, 1800-2400 ms |
| Level gift open | `components/LevelGiftModal.tsx`, `components/LevelGiftDualModal.tsx` | `level.gift.open.common/rare/epic/premium` | Harp unwrap + rarity layer, 900-2200 ms |
| Achievement unlocked | `components/AchievementToast.tsx` | `achievement.unlocked` | Celesta flourish + warm strings, 900-1300 ms |
| Shards earned | `app/shards_system.ts`, `GlobalShardsEarnedHost`, `ShardsEarnedModal` | `shards.earned.small/medium/large` | Glass shimmer, amount-dependent tail, 450-1200 ms |
| Daily task completed | `app/daily_tasks.ts` -> `daily_task_completed` | `daily.task.completed` | Soft pizzicato + tiny resolve, 450-650 ms |
| Daily reward claimed | `app/daily_tasks.ts` -> `daily_task_reward_claimed` | `daily.reward.claimed` | Harp arpeggio + celesta, 800-1100 ms |
| All daily tasks done | `app/daily_tasks_screen.tsx` all-tasks claim flow | `daily.all.completed` | Mini fanfare, strings + celesta, 1200-1700 ms |
| Lesson complete | `app/lesson_complete.tsx` | `lesson.completed` | Warm academic cadence, 1200-1800 ms |
| Perfect lesson or quiz | Lesson/quiz result screens | `lesson.perfect`, `quiz.perfect` | Brighter motif variant, 1600-2200 ms |
| Quiz/trainer result | `app/quizzes/result_view.tsx`, trainer session screens | `session.completed` | Short resolution phrase, 900-1400 ms |
| Match found | `components/MatchFoundToast.tsx` | `arena.match.found` | Duel summons: low drum pulse + horn/celesta, 900-1300 ms |
| Arena win | `app/arena_results.tsx` | `arena.result.win` | Noble win flourish, 1400-2200 ms |
| Arena loss | `app/arena_results.tsx` | `arena.result.loss` | Gentle descending strings, 900-1300 ms |
| Arena draw | `app/arena_results.tsx` | `arena.result.draw` | Suspended neutral cadence, 800-1100 ms |
| Rank up | `RankChangeBanner`, `RankChangeModal`, `LeagueResultModal` | `rank.up` | Brass lift + choir pad, 1800-2600 ms |
| Rank down | Rank change surfaces | `rank.down` | Soft low strings, no shame tone, 900-1300 ms |
| League chest open | `components/LeagueChestOpenModal.tsx` | `league.chest.open` | Chest breath + harp cascade + brass glow, 1800-2800 ms |
| Gold theme unlocked | `app/services/league_chest_rewards.ts` -> `gold_theme_unlocked` | `theme.gold.unlocked` | Rare royal cue, 2200-3500 ms |
| Premium activated | `components/PremiumCelebrationModal.tsx`, `premium_activated` | `premium.activated` | Full premium motif, strings/brass/choir, 3000-4500 ms |
| Pack card reveal | `app/pack_opening.tsx` | `pack.card.reveal` | Harp pluck + paper-air shimmer, 250-450 ms |
| Pack rare card | `app/pack_opening.tsx` | `pack.card.rare/epic` | Reveal + rarity sparkle, 800-1600 ms |
| Pack completed | `app/pack_opening.tsx` | `pack.completed` | Collection cadence, 1200-1800 ms |

## Приоритет 1: частые игровые и учебные моменты

| Событие | Точка в коде | Sound ID | Саунд |
| --- | --- | --- | --- |
| Correct answer | `app/quizzes.tsx`, trainer session screens, arena answer flow | `answer.correct` | Very soft harp/pizzicato, 120-220 ms |
| Wrong answer | Same answer flows | `answer.wrong` | Gentle low woodwind fall, 180-300 ms |
| Streak milestone | Quiz/trainer/arena streak logic | `streak.milestone` | Ascending 3-note variant, 400-700 ms |
| Speed bonus | `app/arena_game.tsx` speed/first/streak bonuses | `arena.bonus.speed` | Tight string run, 250-450 ms |
| First answer bonus | `app/arena_game.tsx` | `arena.bonus.first` | Short snare-brush + celesta, 300-500 ms |
| Timer danger | `app/arena_game.tsx` timer UI | `arena.timer.low` | Low pulse, at most once per round, 500-900 ms |
| Flashcard reveal | `app/flashcards_swipe.tsx` | `flashcard.reveal` | Paper/harp flick, 180-300 ms |
| Flashcard saved | `app/flashcards_collection.tsx` | `flashcard.saved` | Bookmark shimmer, 250-400 ms |
| Friend gift received | `app/(tabs)/friends.tsx`, `app/friend_gift_inbox.ts` | `friend.gift.received` | Warm two-note gift cue, 700-1000 ms |
| Friend gift sent | `app/friend_gifts.ts` | `friend.gift.sent` | Lighter outward cue, 400-700 ms |
| Arena invite received | `components/ArenaFriendInviteHost.tsx` | `arena.invite.received` | Small duel call, 700-1000 ms |
| Arena invite accepted | Same host | `arena.invite.accepted` | Confirmation lift, 500-800 ms |
| Energy refill | `energy_reload`, `energy_purchased_shards` | `energy.refill` | Breath + upward strings, 700-1100 ms |
| No energy | `NoEnergyModal`, energy gates | `energy.empty` | Soft muted warning, 350-650 ms |
| Streak revive | `streak_revived`, `StreakReviveModal` | `streak.revived` | Recovering upward glow, 1200-1800 ms |
| Release bonus claimed | `ReleaseWaveBonusModal` | `bonus.release.claimed` | Returning gift cue, 900-1400 ms |

## Приоритет 2: опциональные тонкие сигналы

| Событие | Точка в коде | Sound ID | Саунд |
| --- | --- | --- | --- |
| Tab switch | `app/(tabs)/_layout.tsx` | `nav.tab.switch` | Off by default, air tick, 60-120 ms |
| Settings toggle | `app/settings_edu.tsx` and settings surfaces | `settings.toggle` | Off by default, tiny mechanical felt, 60-100 ms |
| First content ready | `app_first_content_ready` | `app.ready` | Usually silent; possible very soft opening breath |
| Onboarding first lesson nudge | First lesson bottom sheet | `onboarding.first.lesson` | Warm invitation, 800-1200 ms |
| Update available | `UpdateModal`, `ReleaseNotesModal` | `system.update.available` | Soft neutral cue, 400-700 ms |
| Permission nudge | `notif_permission_nudge` | `system.permission.nudge` | Usually silent |

## Центральная архитектура

Рекомендуемый слой:

- `app/audio/sound_events.ts`: типы sound event и mapping app events -> sound ids.
- `app/audio/sound_manifest.ts`: список файлов, длительность, приоритет, preload policy.
- `app/audio/sound_manager.ts`: preload, play, queue, throttle, duck speech, volume.
- `hooks/use-sfx.ts`: публичный API для редких локальных вызовов.
- `components/SoundEventHost.tsx`: глобальная подписка на `app/events.ts`, монтируется рядом с `AchievementToast`, `ActionToast`, `GlobalShardsEarnedHost`.

Не стоит вызывать audio напрямую из каждого компонента. Основные события уже централизованы в `app/events.ts`, поэтому лучше сначала озвучить event bus.

## Настройки пользователя

Добавить отдельно от `voiceOut`:

- `appSoundsEnabled`: boolean, default true.
- `appSoundsVolume`: number, default 0.65.
- `ceremonySoundsEnabled`: boolean, default true.
- Возможная будущая настройка: `arenaSoundsEnabled`.

`voiceOut` оставить для произношения учебных фраз. Если voice pronunciation активен, SFX должны быть тише или отложены.

## Preload policy

Preload at app boot:

- `answer.correct`
- `answer.wrong`
- `shards.earned.small`
- `achievement.unlocked`
- `level.up`
- `arena.match.found`
- `arena.result.win`
- `arena.result.loss`

Lazy preload before modal opens:

- level gifts
- premium celebration
- league chest
- pack opening rarity sounds
- gold theme unlock

## Queue and priority

Priority 3, ceremony:

- premium activated
- level up
- rank up
- league chest
- gold theme unlock
- pack epic reveal

Priority 2, reward:

- achievement unlocked
- shards earned
- daily all completed
- lesson perfect
- arena win/loss

Priority 1, action:

- correct/wrong
- flashcard reveal
- saved
- friend gift

Priority 0, ambient/system:

- tab switch
- settings toggle
- update nudge

Rules:

- Priority 3 interrupts Priority 0-1.
- Priority 2 can queue behind Priority 3.
- Repeated `answer.correct` must be throttled in fast sessions.
- `shards.earned` should coalesce if multiple rewards arrive within 900 ms.
- Never play more than one ceremony at once.

## File naming convention

Use lower-case, stable ids. The first in-app pack is committed as WAV so Expo can bundle it directly; future production orchestral exports may be swapped to compressed M4A/CAF behind the same manifest ids.

- `assets/sounds/ui/answer_correct.wav`
- `assets/sounds/ui/answer_wrong.wav`
- `assets/sounds/reward/shards_earned_small.wav`
- `assets/sounds/reward/achievement_unlocked.wav`
- `assets/sounds/ceremony/level_up.wav`
- `assets/sounds/ceremony/premium_activated.wav`
- `assets/sounds/arena/arena_match_found.wav`

Prefer compressed mobile-friendly assets for real orchestral samples. Keep tails clean and short.

## Audio generation briefs

Global negative prompt:

No simple beep, no retro game sound, no 8-bit, no harsh buzzer, no alarm, no long music loop, no comedic cartoon boing, no aggressive error tone, no spoken words, no melody longer than the requested duration, no clipping, no excessive reverb tail.

Global production target:

Short premium symphonic mobile UI sound, clean transient, warm orchestral texture, cinematic but restrained, 44.1 kHz, stereo, trimmed silence, no clipping, mobile speaker friendly, elegant educational app.

Examples:

`level.up`:

> Create a 2 second premium symphonic level-up UI stinger for an elegant language learning app. Three-note ascending identity motif, celesta sparkle, warm string swell, soft horn glow, satisfying but restrained, no arcade beeps, no percussion-heavy fanfare.

`achievement.unlocked`:

> Create a 1 second achievement unlock sound for a beautiful educational mobile app. Celesta and harp glint followed by a small warm string resolution, magical but mature, no gamey beep, no harsh high frequencies.

`shards.earned.medium`:

> Create a 700 ms crystal reward sound. Glass harmonics, tiny harp arpeggio, soft shimmer tail, premium and clean, not casino-like, not coin-like, no synthetic beep.

`answer.correct`:

> Create a 180 ms very subtle correct answer confirmation. Soft pizzicato string plus tiny harp touch, positive but quiet, suitable for frequent repetition, no beep.

`answer.wrong`:

> Create a 250 ms gentle wrong answer cue. Muted low string or clarinet downward gesture, kind and non-punitive, no buzzer, no alarm, no failure sting.

`arena.match.found`:

> Create a 1 second elegant duel match found cue. Soft low drum pulse, short horn call, celesta glint, energetic but premium, no battle alarm, no aggressive trailer hit.

`premium.activated`:

> Create a 4 second premium activation ceremonial stinger. Warm strings, noble horn, subtle choir pad, celesta crown sparkle, luxurious and uplifting, no long melody, no epic trailer boom, no cheesy cash register.

## MVP внедрения

Phase 1: foundation and six sounds.

- Add audio dependency after checking current Expo recommendation.
- Add sound settings.
- Add `SoundEventHost`.
- Wire `achievement.unlocked`, `level.up`, `shards.earned`, `daily.reward.claimed`, `arena.match.found`, `answer.correct/wrong`.
- Add throttling and speech ducking.

Phase 2: learning and arena depth.

- Lesson complete/perfect.
- Quiz/trainer result.
- Arena win/loss/draw.
- Rank up/down.
- Speed/first/streak bonuses.

Phase 3: premium ceremonies.

- Level gifts by rarity.
- League chest.
- Gold theme.
- Premium celebration.
- Pack opening rarity.
- Friend gifts and streak revive.

## QA checklist

- Sounds can be disabled completely.
- Volume setting applies to every SFX.
- Speech pronunciation remains clear.
- Rapid correct answers do not become noisy.
- Multiple rewards coalesce instead of stacking chaotically.
- App startup does not block on audio preload.
- Missing sound file fails silently with dev logging.
- Android/iOS silent mode behavior is consciously chosen and documented.
- No dev/test/admin action plays production sound.
- All ceremony sounds feel premium on phone speakers, not only headphones.

## Concrete implementation hooks

Best central hooks:

- `app/events.ts`: global app event map.
- `app/_layout.tsx`: mount `SoundEventHost`.
- `components/AchievementToast.tsx`: achievement lifecycle.
- `components/GlobalShardsEarnedHost.tsx`: shards reward queue.
- `components/ActionToast.tsx`: only selected toast types, not all.
- `components/MatchFoundToast.tsx`: arena match found.
- `app/xp_manager.ts`: level-up source, avoid raw XP sound spam.
- `app/shards_system.ts`: central shards source.
- `app/daily_tasks.ts`: daily task events.
- `app/arena_game.tsx`: high-frequency arena answer/bonus sounds.
- `app/arena_results.tsx`: arena result ceremony.
- `app/lesson_complete.tsx`: lesson completion.
- `app/quizzes/result_view.tsx`: quiz completion.
- `app/pack_opening.tsx`: pack reveal.

## Decision

The correct first build is not "add sounds everywhere". The correct first build is a controlled sound identity layer with six to eight high-value events, one volume setting, and strict throttling. After that, richer ceremonies can be added safely.
