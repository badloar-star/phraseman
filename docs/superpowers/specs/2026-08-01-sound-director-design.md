# Phraseman Sound Director — дизайн звуковой системы

**Дата:** 2026-08-01

**Статус:** одобрено владельцем для перехода к планированию

**Область:** мобильное приложение Phraseman, React Native / Expo SDK 54 / `expo-audio ~1.1.1`

## 1. Цель

Встроить подготовленный пакет UI-звуков в Phraseman как одну управляемую систему, в которой:

- звуки не накладываются и не превращаются в кашу при одновременных тостах, модалках и наградах;
- UI-эффекты не останавливают и не приглушают музыку или подкасты из других приложений;
- UI-эффекты соблюдают беззвучный режим устройства;
- учебная речь продолжает работать в беззвучном режиме;
- микрофон никогда не записывает UI-эффект и не конкурирует с озвучиванием;
- пользователь может независимо отключить звуковые эффекты и озвучивание;
- каждый экран запрашивает семантическое событие, но не управляет плеером, громкостью и приоритетами сам.

## 2. Подтверждённые продуктовые решения

### 2.1. Два независимых переключателя

В основных настройках появляется группа **«Звук»** ровно с двумя переключателями:

1. **Звуковые эффекты**

   Подпись: «Ответы, награды и системные сигналы».
2. **Озвучивание**

   Подпись: «Произношение слов и фраз».

В пользовательском интерфейсе запрещены технические подписи вроде TTS, OpenAI, AI voice или названия поставщика голоса.

Существующие ключи хранения сохраняются:

- `uiSounds` становится глобальным источником истины для всех UI-эффектов;
- `voiceOut` становится глобальным источником истины для всей озвучки приложения.

Выключение действует немедленно:

- `uiSounds=false` останавливает текущий SFX, удаляет отложенный toast-SFX и блокирует новые эффекты;
- `voiceOut=false` останавливает системный голос, подготовленный голосовой клип и другие зарегистрированные источники озвучивания, отменяет ожидающий старт и блокирует новые старты.

Воспроизведение собственной записи пользователя не относится к «Озвучиванию» и остаётся доступным. Это необходимо для сравнения произношения. Видеозвук и явно запущенное пользователем медиавоспроизведение вне учебной озвучки также не должны автоматически классифицироваться как SFX.

### 2.2. Silent mode

- UI-эффекты молчат в беззвучном режиме iPhone и в соответствующем тихом режиме Android.
- Учебная речь и произношение работают в беззвучном режиме, потому что это основной контент, явно ожидаемый пользователем.
- Оба вида звука всё равно подчиняются системной громкости устройства.

### 2.3. Тишина по умолчанию

Не озвучиваются обычная навигация, back, tab tap, закрытие модалки, scroll, drag/drop, word tile, XP ticker, confetti, shimmer, загрузка, маркетинговое появление, повторный переход после уже засчитанного действия и пассивное фоновое обновление данных.

## 3. Рассмотренные подходы

### A. Центральный Sound Director поверх `expo-audio` — выбран

Один семантический API, один арбитр, единый контракт громкости, дедупликации и аудиосессии. Подход сохраняет текущую библиотеку и минимизирует native-риск.

### B. Исправить существующие hooks по отдельности — отклонён

Быстрее локально, но оставляет несколько независимых владельцев плееров. Невозможно надёжно остановить наложение тоста, модалки, correct и речи, а новые экраны снова начнут обходить настройки.

### C. Перейти на `react-native-audio-api` и аудиограф — отложен

Даёт sample-accurate scheduling и gain ramps, но требует новой native-зависимости, пересборки и крупной миграции записи/воспроизведения. Для коротких UI one-shot текущего объёма это несоразмерный риск.

## 4. Архитектура

### 4.1. Модули

Планируемая граница системы — отдельный модуль вне route-дерева Expo Router:

- `modules/audio/sound_events.ts` — типы событий, metadata и статические `require()`;
- `modules/audio/sound_director.ts` — арбитраж, cooldown, дедупликация, активный плеер и ограниченный пул;
- `modules/audio/audio_activity.ts` — состояние speech/recording и scoped leases;
- `modules/audio/voice_playback_policy.ts` — глобальный gate `voiceOut` и реестр остановки активных источников;
- `modules/audio/sound_clock.ts` — внедряемые часы для детерминированных тестов.

Существующие `app/feedback/feedback_kit.ts`, `useCorrectSound`, `useRecordStartCue`, toast и celebration-компоненты становятся адаптерами к семантическому API. Новые экраны не импортируют WAV и не вызывают `createAudioPlayer` для UI-эффектов напрямую.

### 4.2. Семантический API

Базовый вызов:

```ts
soundDirector.request('pm.system.success', {
  scope: 'action-toast',
  dedupeKey: toastKey,
});
```

Для учебного verdict используется составной запрос, чтобы решение принималось один раз:

```ts
soundDirector.requestLearningVerdict({
  correct: true,
  combo: 10,
  completesUnit: false,
});
```

Правила выбора:

- combo 5/10 заменяет `pm.learn.correct`;
- completion заменяет correct, если ответ закрывает блок;
- награда внутри results sequence не добавляет второй reward cue;
- Premium/VIP могут иметь один opening cue и один finale cue;
- один overlay scope имеет максимум один opening cue;
- один и тот же dedupe key не воспроизводится повторно в cooldown-окне.

### 4.3. Не очередь проигрывания, а арбитр актуальности

Общей FIFO-очереди SFX не будет. Устаревший звук не должен проигрываться после события.

- Если активен более важный или равный сигнал, новый менее важный отбрасывается.
- Если приходит критический сигнал, он может заменить менее важный активный SFX.
- Повторы одинакового события объединяются.
- За любые 1000 мс стартуют не больше двух SFX.
- Единственное отложенное место — один informational/reward toast после речи.
- Toast может стартовать не раньше чем через 250 мс после окончания речи.
- Отложенный toast имеет короткий TTL; если контекст устарел, он удаляется без воспроизведения.
- Новый более важный toast заменяет менее важный отложенный toast, а не добавляется в хвост.

Пример: одновременно пришли reward toast, success toast и завершение урока. Звучит только завершение урока. Визуальные тосты при этом продолжают работать по своей существующей очереди.

### 4.4. Приоритеты

От самого высокого к самому низкому:

1. активный микрофон / захват речи;
2. учебная речь, AI-голос, reference audio;
3. критический результат: timer expired, match found, recoverable error;
4. учебный verdict;
5. completion / reward;
6. informational toast.

Metadata события задаёт числовой priority, но микрофон и речь являются отдельными hard gates и всегда выше SFX.

### 4.5. Плееры и память

Нельзя держать 39 постоянно активных native-плееров: проект уже защищается от исчерпания native slots в phrase audio.

- Частые core-события предзагружаются после первого стабильного кадра приложения.
- Редкие события предзагружаются при входе на соответствующий экран или перед показом celebration.
- Ленивый пул имеет жёсткий максимальный размер и LRU-эвикцию только неиграющих плееров.
- Каждый `createAudioPlayer` имеет гарантированный `remove()` при эвикции/cleanup.
- Один event player перезапускается через `seekTo(0)` только после решения арбитра.
- `playbackStatusUpdate` и watchdog завершают ownership, даже если native backend не отправил ожидаемое событие.

## 5. Аудиосессия и взаимодействие с другими приложениями

Вместо произвольных вызовов `setAudioModeAsync` вводится state machine с scoped leases. Эффективный режим вычисляется централизованно; поздний async restore не может перезаписать более новый recording mode.

### UI idle / SFX

```ts
{
  playsInSilentMode: false,
  shouldPlayInBackground: false,
  allowsRecording: false,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'mixWithOthers',
}
```

UI-эффект не запрашивает Android audio focus и не приглушает стороннюю музыку.

### Spoken playback

```ts
{
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  allowsRecording: false,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'duckOthers',
}
```

Озвучивание получает приоритет, работает в silent mode и временно приглушает сторонний звук.

### Recording

```ts
{
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  allowsRecording: true,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'doNotMix',
}
```

Перед выдачей recording lease текущий SFX и речь останавливаются. Во время lease новые SFX не стартуют. `record_ready` на iOS разрешён только после фактической готовности recognizer; на Android остаётся haptic-only.

При уходе приложения в background отложенные SFX удаляются. После interruption никакой старый UI-эффект не возобновляется автоматически. Возобновление речи возможно только если владелец текущего playback intent ещё актуален.

## 6. Исходные звуки и громкость

### 6.1. Результат инвентаризации

В исходной папке найден 41 WAV, соответствующий 39 семантическим событиям:

- все файлы — PCM 16-bit, stereo, 48 kHz;
- два `pm.reward.small` побайтово одинаковы — используется один;
- два `pm.reward.vip_open` различаются — базовым кандидатом выбрана более контролируемая variation 3;
- `pm.complete.exam_pass` имеет контейнер 8 секунд при цели 1,65 секунды и около 1 секунды активного сигнала;
- raw RMS различается примерно от −39,6 до −13,2 dBFS, поэтому одних runtime-множителей недостаточно;
- девять manifest-событий пока не имеют WAV: `pm.reward.vip_finale` и восемь `pm.arena.*`.

Отсутствующие события остаются типизированными, но `enabled: false`; они не используют чужой звук и не создают runtime error.

### 6.2. Постобработка

Оригиналы во внешней папке не изменяются. В bundle попадает только canonical-экспорт:

- leading silence меньше 10 мс;
- лишний trailing silence удалён без растягивания звука;
- короткий fade применяется только для устранения edge click;
- true peak не выше −1 dBTP;
- проверяется phase/mono compatibility;
- частые сигналы остаются тише редких наград;
- raw loudness выравнивается по семействам, затем применяется event volume;
- имена приводятся к canonical-путям `assets/audio/sfx/v1/<family>/...`;
- исходные Firefly-имена и дубликаты не попадают в bundle.

`exam_pass` не дополняется искусственной тишиной до 1,65 секунды: после trimming используется фактический clean tail, если QA не выявит обрыв. Если сигнал объективно обрезан, event остаётся disabled до замены файла.

### 6.3. Runtime volume

`AudioPlayer.volume` — линейный множитель амплитуды 0…1, а не процент воспринимаемой громкости. После family normalization сохраняются значения manifest:

| Семейство | События и volume |
|---|---|
| Learning | correct 0.42; needs_work 0.28; hint 0.30; timer_warning 0.34; timer_expired 0.32; combo_5 0.46; combo_10 0.52 |
| Voice cues | record_ready 0.40; turn_ready 0.34; no_speech 0.27 |
| Completion | micro 0.46; session 0.52; perfect 0.58; exam_pass 0.60; exam_retry 0.34; stars 0.38 / 0.40 / 0.44 |
| System | success 0.34; info 0.28; warning 0.34; recoverable_error 0.30; destructive_done 0.34 |
| Energy / streak | empty 0.32; refilled 0.42; streak_saved 0.54 |
| Rewards | small 0.42; collectible 0.54; achievement 0.55; level_up 0.58; chest_open 0.58; premium open/finale 0.60 / 0.62; VIP open/finale 0.62 / 0.64 |
| Arena | match_found 0.55; countdown 0.38 / 0.39 / 0.42; round_start 0.50; victory 0.62; defeat 0.34; draw 0.36 |
| League | promoted 0.64; demoted 0.36 |
| Social | gift 0.48; friend_request 0.36; quest_complete 0.52 |

Финальный gain корректируется только по результату device QA; числовой peak не заменяет прослушивание на телефоне и в наушниках.

## 7. Подключение к поверхностям

### Wave 1 — центральный контракт и существующие точки

- заменить `fk.correct`, combo и stars на semantic requests;
- объединить `useCorrectSound` с директором;
- заменить `useRecordStartCue` на `pm.voice.record_ready`;
- подключить ActionToast после его существующего визуального dedupe;
- подключить `complete.micro/session/perfect` к существующим result-компонентам;
- внедрить оба глобальных settings gates;
- перевести root/speech/recording audio mode на state machine.

### Wave 2 — доступные completion/system/reward события

- timer, hint, exam, energy, streak;
- RewardCard/RewardStack с явным `soundEvent` либо `silent`;
- league и social reveal;
- Premium/VIP opening/finale только там, где есть canonical asset.

Компонент не выбирает звук по цвету карточки. Неоднозначная поверхность обязана передать explicit event или `silent`.

## 8. UX и доступность настроек

Группа «Звук» использует существующие `SettingsSectionTitle`, `SettingsGroup`, `SettingsCustomRow`/`CustomSwitch` и визуальные токены текущих настроек. Новый визуальный стиль не вводится.

- touch target не меньше 44×44;
- переключатели имеют `accessibilityRole="switch"`, локализованные label/hint и корректное checked state;
- текст и switch сохраняют контраст во всех темах;
- выключение не сопровождается звуковым подтверждением;
- изменение применяется оптимистично из синхронного snapshot и сохраняется в AsyncStorage;
- при ошибке сохранения текущая сессия всё равно уважает выбранное значение;
- группа содержит ровно две строки и не меняет высоту после hydration.

Существующий control скорости произношения сохраняется в настройках обучения. Он не создаёт третий переключатель в группе «Звук» и не запускает preview, когда `voiceOut=false`.

## 9. Ошибки и безопасные fallback

- Ошибка загрузки/декода SFX никогда не ломает пользовательское действие.
- Missing asset означает silent fallback плюс telemetry в dev/QA, а не подмену семантически чужим звуком.
- Ошибка переключения аудиосессии не отменяет UI-действие.
- Watchdog освобождает ownership и native player после зависшего старта.
- Haptic остаётся независимым от `uiSounds` и `voiceOut`.
- Звук никогда не является единственным каналом feedback: остаются текст, визуальное состояние и/или haptic.

## 10. Тестирование

Разработка выполняется test-first.

### Unit

- priority/preemption/drop;
- event cooldown и максимум два старта за 1000 мс;
- отсутствие общей FIFO-очереди;
- один deferred toast, 250 мс post-speech gap и TTL;
- combo/completion/reward dedupe;
- immediate settings gate;
- scoped speech/recording leases и stale release;
- LRU cap и гарантированный player cleanup.

### Contract

- каждый enabled event имеет literal static `require()`;
- каждый bundled asset кем-то используется;
- отсутствующие Arena/VIP events явно disabled;
- прямые UI-SFX imports вне allowlist запрещены;
- direct `Speech.speak` вне voice playback layer запрещён;
- оба переключателя присутствуют ровно по одному разу;
- snapshot/settings normalization содержит `uiSounds` и `voiceOut`.

### Integration scenarios

1. correct + combo 5 → только combo 5;
2. correct + completion → только completion;
3. reward + success toast + result modal → один самый значимый cue;
4. два одинаковых toast → один cue;
5. speech active + info toast → краткое deferred окно или drop;
6. recording active + любой SFX → silent;
7. выключить эффекты во время reward → player остановлен, новых стартов нет;
8. выключить озвучивание во время system TTS/voice clip → playback остановлен;
9. silent mode → SFX молчит, учебная речь звучит;
10. Spotify/подкаст + SFX → сторонний звук не duck/pause;
11. Spotify/подкаст + учебная речь → временный duck и восстановление;
12. background/interruption → старый SFX не возобновляется.

### Device QA

- recent и older iPhone;
- mid-range Android;
- дешёвые Bluetooth earbuds и хорошие наушники;
- тихая комната, улица, низкая media volume, высокая accidental volume;
- silent mode, TTS→recording и correct→speech;
- 20-минутная смешанная сессия для fatigue.

## 11. Критерии приёмки

- Ни один тестовый сценарий не производит более одного одновременного SFX.
- Не более двух SFX стартуют в скользящем окне 1000 мс.
- UI-эффекты не запрашивают Android audio focus и не приглушают стороннее аудио.
- Silent mode разделяет SFX и речь согласно контракту.
- Оба переключателя реально останавливают текущий и блокируют будущий звук своей категории.
- Собственная запись пользователя продолжает воспроизводиться при выключенном «Озвучивании».
- Микрофон не захватывает SFX и не стартует одновременно с речью.
- Все enabled assets прошли формат, silence, peak, mono и reference checks.
- Нет новых безграничных player caches, listeners или timers.
- Существующие unrelated функции приложения сохранены.

## 12. Официальные основания

- Expo Audio: `mixWithOthers` предназначен для sound effects и коротких UI clips; `setAudioModeAsync` управляет одной глобальной аудиосессией.

  https://docs.expo.dev/versions/latest/sdk/audio/
- Apple HIG Playing Audio: необязательные эффекты должны учитывать silent mode; приложение может независимо регулировать относительные уровни, но не системную громкость.

  https://developer.apple.com/design/human-interface-guidelines/playing-audio
- Apple HIG Feedback/Accessibility: звук дополняет, но не заменяет визуальный и тактильный feedback.

  https://developer.apple.com/design/human-interface-guidelines/feedback
- Android Audio Focus: краткое медиа может request transient focus/duck, но UI-SFX, которые должны смешиваться, не должны забирать постоянный focus.

  https://developer.android.com/media/optimize/audio-focus
