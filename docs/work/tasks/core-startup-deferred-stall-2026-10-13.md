# Task packet: холодный старт — убрать 3+ с паузы JS-потока в окне +5…+12 с

Governance-ID: TG-45D905CB16A4
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: R1_PERF_FIRST_FRAME §5б (Дизайн 650891d1f, профиль Сверки a5d12a5e6)

## Outcome

После кадра Главной JS-поток не стоит секундами: человек может листать и нажимать сразу. Мера — профиль Hermes ×3 через Сверку:
стэк `prewarm → ensure → createAudioPlayer → __native_constructor__` (сейчас 3,2–3,6 с подряд в окне +7,5…+11 с) больше не даёт
сплошного участка; `[SFX-PREWARM]` показывает по одному плееру за шаг, `[FIRST-FRAME] deferred:done … syncMs=` — синхронную долю
каждой отложенной задачи.

## Scope

In scope: `modules/audio/sound_director.ts` (прогрев по одному плееру за шаг + логи), `app/first_frame_deferred_warmups.ts` (лог
синхронной доли задачи), тест `tests/sound_director_prewarm_spread.test.ts`.

Out of scope: файлы Главной и премаунт вкладок (Дизайн), состав звуков прогрева (контракт sfx_latency_budget), Firebase.

## Architecture

Было: `SoundDirector.prewarm(ids)` создаёт все нативные плееры подряд в одном вызове (7 × ~0,5 с в dev). Станет: очередь в директоре,
один плеер за шаг, между шагами пауза `PREWARM_STEP_GAP_MS`; повторное событие в очереди не дублируется; `dispose` снимает таймер.
Публичный API (`prewarm([...])`) и места вызова в `_layout` не меняются.

## Security and privacy

Не касается: данных пользователя, сети и хранилища нет.

## Technical debt

- Contain: синхронная стоимость `createAudioPlayer` (нативный конструктор expo-audio) — вне нашего кода; ограничиваем её одним
  плеером за шаг и логом `[SFX-PREWARM] slow`. Выход — релизная цифра Сверки: если шаг < 50 мс, вопрос закрыт.

## Verification

- `npm run test:one -- tests/sound_director_prewarm_spread.test.ts`, `tests/sound_director.test.ts`, `tests/sfx_latency_budget_contract.test.ts`.
- Сверка: холодный старт ×3 с профилем (`scripts/hermes_cpuprofile.mjs`), сравнить окно +5…+12 с.

## Rollback

Вернуть прежний `prewarm` (один коммит). Данных не трогает.

## Шаг 2 (координатор 13.10, вариант «б»; замер Сверки 57ecd26e6)

Дорог только ПЕРВЫЙ плеер (подъём нативного аудио: 373–1502 мс), звуки конца урока — 3–131 мс; второй ход
(`DEFER_LESSON_END_SFX_PREWARM_TO_SESSION`) остаётся выключенным. Обе волны прогрева стартуют после кадра Главной
(`whenHomePainted`, потолок 6 с) + пауза под премаунт вкладок + конец взаимодействий — одной очередью (сначала нажатия,
затем конец урока), чтобы первый тяжёлый плеер не попадал в окно премаунта. Ранний тап до прогрева звучит с задержкой
(play создаёт плеер сам) — не молчит. Модуль `modules/audio/startup_sfx_prewarm.ts`, тест; контракт sfx_latency_budget
переписан осознанно (таймер 1,2 с → ожидание кадра Главной), ссылка на замер в «зачем».
