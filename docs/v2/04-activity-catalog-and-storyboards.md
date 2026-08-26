# Каталог активностей и UI-storyboards Phraseman V2

> **Owner override 2026-08-25:** для required Learning V2 sessions используются
> ровно шесть активных режимов и их канонические HTML-макеты. Контент пишется сразу под
> family-native payload, а интерфейс, states, gestures, audio и motion
> реализуются 1:1. Полный действующий контракт:
> [`MODE_NATIVE_AUTHORING_CONTRACT.ru.md`](./MODE_NATIVE_AUTHORING_CONTRACT.ru.md).
> Более широкий исторический каталог ниже остаётся reference для платформы и
> optional surfaces, но не разрешает подменять или расширять шесть approved
> required-session modes без нового решения владельца.
> `sound_contrast` снят с active authoring и остаётся только legacy reference.

**Дата спецификации:** 2026-07-14  
**Назначение:** зафиксировать переиспользуемую UI-архитектуру 18 пользовательских учебных поверхностей — 17 runtime activity families и отдельного checkpoint assessment contract, — обязательные состояния каждого режима и требования к голосу, движению, аудио, наградам и доступности для пилотного сезона из 32 эпизодов.

## Статус доказательств и границы документа

Этот документ описывает проектное решение Phraseman V2. Указанные ниже интерфейсы Phraseman являются предложением, а не утверждением, что они уже реализованы.

Конкурентные ссылки в разделе [Reference-capture plan](#reference-capture-plan) — официальные продуктовые и справочные материалы, то есть evidence tier B. Это не first-hand capture актуальных приложений. Перед тем как считать визуальные референсы implementation-ready, команда должна законно снять полные последовательности состояний из текущих версий приложений и записать платформу, версию, locale, уровень курса, тип подписки и дату съёмки.

Длительности motion в документе — дизайн-токены Phraseman, а не измерения анимаций конкурентов. Мы переносим полезные interaction invariants, но не копируем композицию, персонажей, графику, формулировки, цветовую систему или motion signature другого продукта.

## Ключевое решение: один scaffold, шесть shells, 14 storyboards

Для 18 учебных поверхностей не создаются 18 независимых экранов. Такая реализация быстро породила бы несовместимые состояния микрофона, feedback, offline и accessibility. Также не используется один «универсальный экран на всё»: он превратился бы в компонент с большим количеством условной логики и стёр бы различия между учебными действиями. Runtime catalog содержит 17 activity families; checkpoint остаётся episode-level assessment contract над обычными graph nodes.

V2 использует:

- один общий `ActivityScaffold`;
- шесть специализированных shells;
- 14 storyboard-вариантов, которые покрывают 17 activity families и checkpoint assessment surface;
- конфигурацию контента и pedagogical policy через activity schema, а не через отдельный экран на каждый урок.

### Карта shells и активностей

| Shell | Activity families | Отдельные storyboard |
|---|---|---|
| `ChoiceShell` | visual discovery; listen & choose; sound contrast/minimal pairs; speed match | SB-01, SB-02, SB-03 |
| `ComposerShell` | phrase builder; listen-build/dictation; contextual gap/grammar | SB-04 |
| `VoiceActivityShell` | sound/syllable lab; scripted repeat & compare; quick spoken response; shadowing/prosody; describe scene | SB-05, SB-06, SB-07, SB-08 |
| `StoryPlayerShell` | microstory/radio | SB-09 |
| `ScenarioShell` | branching scene/adventure; scripted dialogue/milestone; AI Speaking Club | SB-10, SB-11, SB-12 |
| `ReviewAssessmentShell` | mistakes/personalized review; checkpoint/exam | SB-13, SB-14 |

`Speed Match`, `Sound Lab`, `Shadowing`, `Speaking Club` и `Checkpoint` имеют отдельные storyboard, потому что у них уникальны хотя бы одна из следующих характеристик: управление временем, аудиомаршрут, тип доказательства, сетевой риск, длительный сценарий или значимость результата для прогресса.

## ActivityScaffold

`ActivityScaffold` задаёт постоянную геометрию и поведение, чтобы пользователь учился решать задания, а не заново понимать интерфейс.

### Структура экрана

1. `ActivityHeader`
   - слева — закрыть или назад;
   - по центру — название навыка или короткая учебная цель;
   - справа — меню доступности/аудио;
   - под строкой — прогресс активности, но не глобальный баланс валюты.
2. `PromptZone`
   - изображение, фраза, аудио, реплика или сцена;
   - на телефоне занимает не более приблизительно 52% полезной высоты;
   - не исчезает во время processing, если без него теряется контекст.
3. `ResponseZone`
   - варианты, chips, текстовый ввод, transcript confirmation или activity-specific controls;
   - резервирует место под feedback, чтобы после ответа не происходил content jump.
4. `ActionDock`
   - закреплён снизу;
   - высота 88–104 pt/dp с учётом safe area;
   - содержит одно главное действие и не более двух вторичных.
5. `FeedbackSheet`
   - появляется в пределах `ResponseZone`/`ActionDock`;
   - сообщает verdict, одну-две рекомендации и следующий шаг;
   - не закрывает исходный prompt без необходимости.

### Размеры и адаптация

- Горизонтальные отступы телефона: 16.
- Базовый шаг spacing: 8.
- Радиус карточек: 16–22.
- Основной текст: не меньше 16.
- Инструкция: обычно 18–22.
- Ключевая изучаемая фраза: 24–30 с переносом строк.
- Обычная primary CTA: высота не меньше 52.
- Mic control: 76–84 с отдельной доступной зоной нажатия.
- Минимальная интерактивная область: 44×44 pt на iOS и 48×48 dp на Android.
- На планшете рабочая область центрируется с max-width около 560; media-heavy режимы могут использовать split layout 45/55.
- При 200% text scaling фиксированная высота текстовых контейнеров не используется; экран прокручивается, а `ActionDock` не перекрывает текст.

### Темы и контраст

Каждый shell получает цвета из действующей темы: `bgPrimary`, `bgCard`, `bgSurface`, `textPrimary`, `textMuted`, `accent`, `correct`, `wrong`, `gold`, `correctText`. Жёстко заданная фиолетовая палитра текущего V2-прототипа не становится общей системой.

Правила:

- на lime, salad и neon-green fill используется только тёмный текст/иконка через `correctText`, `#07110A` или эквивалент;
- correctness, recording, lock, reward и error не кодируются одним цветом: обязательны текст и иконка/форма;
- функциональные иконки берутся из одного набора, например Ionicons; emoji не используются вместо кнопок;
- конкурентные brand colors, mascots, card geometry и icon language не переносятся.

### Общий словарь состояний и copy

| Состояние | Рекомендуемый пользовательский текст |
|---|---|
| Ready | «Когда будешь готов, начни» |
| Active input | «Продолжай» или activity-specific инструкция |
| Recording | «Слушаю…» + доступный таймер |
| Processing | «Проверяем попытку…» |
| `PASS_CONFIDENT` | «Получилось. Тебя легко понять» или точный non-voice verdict |
| `NEEDS_WORK_CONFIDENT` | «Почти. Попробуй ещё раз с этой подсказкой» |
| `UNCERTAIN` | «Мы не уверены из-за шума. Эта попытка не повлияет на звёзды» |
| `INVALID_AUDIO_OR_SYSTEM` | «Запись не получилась. Проверь микрофон или выбери другой способ» |
| Offline | «Сейчас нет сети. Можно продолжить локальное задание или вернуться позже» |

Copy не использует формулировки «плохое произношение», «идеальный акцент» и «произнесено неправильно», если система не располагает валидированным акустическим доказательством. Необъяснённый процент модели не показывается как процент знания или качества произношения.

## Motion, audio и haptics

### Motion tokens

| Событие | Длительность и поведение |
|---|---|
| Press feedback | scale `1 → 0.97–0.98`, около 80 ms |
| Выбор варианта | opacity/border/fill, 120–160 ms |
| Feedback sheet | opacity + `translateY: 8`, 180–220 ms |
| Переход к следующему item | 200–240 ms |
| Редкое завершение эпизода | звёзды по одной, 160–180 ms каждая; вся сцена не дольше 700 ms |

Обязательные ограничения:

- для обычной ошибки не используется общий shake экрана; единственное
  разрешённое исключение — короткий прозрачный `wrong_option_nudge` самого
  ошибочного слова/варианта после первой ошибки: без красной рамки, без
  сохранения выбора и только через transform/opacity. После второй ошибки
  показывается утверждённое текстовое объяснение; reduced motion заменяет
  nudge коротким crossfade без движения;
- за один раз анимируются один-два смысловых элемента, а не весь экран;
- изменяются преимущественно transform/opacity, а не width/height/margin;
- бесконечный loader или pulse работает только при активном экране и активном AppState и останавливается при blur/unmount;
- reduced motion заменяет parallax, zoom, bounce, shake и looping статическим состоянием или коротким crossfade;
- waveform показывает только наличие/амплитуду входного сигнала и не изображает правильность pitch, stress или pronunciation;
- processing сохраняет финальную геометрию экрана и не заменяет её полноэкранным spinner.

### Audio session

- TTS/эталон и микрофон взаимоисключаются.
- После окончания эталона запись начинается только новым действием пользователя.
- При старте записи предпочтителен короткий haptic, а не звук, который может попасть в микрофон.
- Звонок, alarm, route change, отключение Bluetooth/headphones и уход приложения в background переводят попытку в нейтральное восстановление, а не в учебную ошибку.
- Воспроизведение «Моя запись» и «Эталон» явно обозначает текущий источник.
- Любая информация, передаваемая аудио, имеет captions/transcript или иной визуальный эквивалент.

### Haptics

- Light impact — осознанный выбор или начало записи.
- Success notification — только `PASS_CONFIDENT` или завершение активности.
- `NEEDS_WORK_CONFIDENT` — лёгкий tap или отсутствие haptic; error vibration не используется как наказание.
- `UNCERTAIN` и `INVALID_AUDIO_OR_SYSTEM` — без error haptic.
- Speed Match даёт haptic только на редком milestone, а не на каждую пару.
- Haptic никогда не является единственным индикатором состояния.

## Unified Voice Activity Shell

Все голосовые активности используют один capture/recovery layer. Learning target передаётся явно: intelligibility, конкретный sound contrast, word stress, rhythm, fluency, formulaic recall или spontaneous response. Эти конструкты не объединяются в один непрозрачный score.

### Layout

- `PromptHeader` — учебная цель: «Ритм», «Звук /θ/», «Ответ по смыслу».
- `ReferenceCard` — фраза, изображение или реплика, кнопки «Эталон» и «Медленнее».
- `CaptureCard` — input route, waveform и доступный таймер.
- `MicControl` — круглая кнопка 76–84 в центре `ActionDock`.
- `TranscriptConfirmCard` — только для spontaneous/semantic задач; позволяет исправить ошибку ASR до отправки.
- `FeedbackSheet` — verdict, максимум одна-две рекомендации, «Моя запись», «Эталон», «Повторить».

### Основная interaction model

Default — `tap to start / tap to stop`. Press-and-hold допускается как дополнительная настройка для пользователя, но не как единственный способ: удержание недоступно части пользователей VoiceOver, TalkBack, Switch Access и Voice Control.

После системного permission dialog запись не запускается автоматически. Экран возвращается в Ready и ждёт нового нажатия.

### State machine

```text
idle
  → permission_explanation
  → system_permission
  → ready
  → recording
  → capture_quality_check
  → evaluating
  → PASS_CONFIDENT
     | NEEDS_WORK_CONFIDENT
     | UNCERTAIN
     | INVALID_AUDIO_OR_SYSTEM
```

Дополнительные переходы:

- `reference_playing → ready`; микрофон в этом состоянии заблокирован;
- `recording → interrupted → ready`; текущая попытка не оценивается;
- `recording → route_changed → ready`; пользователь видит новый input route;
- `evaluating → offline`; если нет локального evaluator, предлагается retry, typed/listen-only route или «Вернуться позже»;
- `NEEDS_WORK_CONFIDENT → focused_retry`; обязательный learning retry получает typed pedagogical reason и повторяет только текущую цель;
- `UNCERTAIN`/`INVALID_AUDIO_OR_SYSTEM → neutral_recovery`; technical reason даёт бесплатный retry и не увеличивает счётчик learning retries;
- после двух technical failures следующий повтор остаётся бесплатным, но UI обязан одновременно показать конкретный alternate route; repeated failure не создаёт retry-only тупик;
- максимум две обязательные learning retries после исходной попытки задаётся кодом, а не шаблоном и относится к `HYP-V2-002`. После них появляется «Продолжить с поддержкой» или deterministic alternate route.

### Evidence contract

Сигналы хранятся и показываются раздельно:

```text
audio_quality
≠ transcript_confidence
≠ pronunciation_features
≠ pedagogical_mastery
≠ reward_decision
```

- Transcript similarity может подтверждать распознанные слова и их порядок, но не phoneme accuracy, stress, rhythm или accent quality.
- Каждая voice activity содержит discriminated `VoiceTaskSpec`: `scripted` — известный reference и опубликованные spoken variants; `spontaneous` — semantic objectives/variants без фиктивной «правильной фразы». Они используют разные evaluation policy.
- Transcript всегда помечен `transcriptOrigin=asr_raw|learner_edited|typed`. Spontaneous attempt сохраняет отдельный transcript-confirmation fact. Отредактированный или введённый transcript может подтверждать semantic objective, но не spoken-confidence, transcript-match, acoustic/pronunciation evidence или voice-specific performance star.
- `UNCERTAIN` и `INVALID_AUDIO_OR_SYSTEM` типом означают ноль candidate performance stars, отсутствие voice/learning evidence и reward, не расходуют обязательную learning retry, не считаются `WRONG` и не блокируют progress. Они могут создать только diagnostic attempt о качестве capture/provider, но не `LearningEvidence`.
- Accessibility route может завершить activity и получить разрешённые performance/access rewards; для неизмеренного spoken/listening construct сохраняется нормативный `LearningNonAssessment{assessmentStatus=not_assessed_accessibility}` документа 05, а attempt переносит только canonical ref, не дубликат body и не фиктивный evidence/pass/fail.
- Typed fallback завершает content task, но записывается как `inputSource=keyboard`, `transcriptOrigin=typed` и не выдаёт voice-specific performance star.
- Порог открытия следующего эпизода остаётся достижимым без voice-specific stars.
- Runtime сохраняет provenance capture pipeline, locale, provider/model/config, пять policy refs и calibration receipt отдельно от learner-facing feedback; изменение evaluator/config делает receipt stale.

### Network voice privacy lifecycle

- До первой сетевой отправки экран показывает purpose, processor, processing region, retention и deletion route из exact approved `VoiceDataPolicyRef`. Показанный текст обязан происходить из exact immutable `VoiceConsentCopyRef(copyId + version + locale + contentHash)`, разрешённого этой policy; согласие на Club/AI voice не прячется в общем согласии на микрофон. Основные действия называются буквально: `Разрешить сетевую обработку` и `Продолжить без неё`; decline не маскируется под закрытие крестиком.
- Accept/decline/revoke относятся к exact `VoiceDataPolicyRef + VoiceConsentCopyRef + purpose + stableId + accountGeneration` и создают append-only receipt. Только server-confirmed active accepted consent и одноразовая server dispatch reservation на exact consent receipt sequence разрешают одну network dispatch; permission микрофона, локальный cache, pending offline accept или согласие другого purpose этого не заменяют.
- Без approved `VoiceDataPolicyRef` или после decline/revoke network voice и Club не выпускаются: тот же экран сразу выбирает scripted/on-device/non-voice fallback и сохраняет core completion/progress. Повторный opt-in остаётся доступен в настройках, но не показывается как наказание или blocking dark pattern.
- Raw audio по умолчанию существует только до результата и удаляется локально и на управляемом сервере. Более долгое хранение допускается только явной policy с отдельным информированным согласием и сроком.
- Transcript/history минимизируются до необходимого контекста миссии. Provider training запрещён; provider retention, safety-record retention и deletion SLA фиксируются в policy.
- До принятия сервером отправку можно отменить без сохранения payload; timeout/background/interruption не создают скрытую повторную отправку.
- Privacy panel всегда содержит действия `Отозвать согласие` и `Удалить голосовые данные`. Revoke синхронно ставит persistent local deny latch для exact policy/purpose/account generation, очищает локальные drafts и добавляет idempotent consent mutation в durable outbox **до** любой сети. Restart, reconnect и pending accept не снимают latch: сначала server пишет append-only revoked receipt и atomically создаёт policy/purpose deletion operation, только затем outbox подтверждается. Offline explicit delete использует отдельный минимальный durable deletion outbox и после reconnect получает один idempotent server operation.
- Экран удаления различает `Запрос принят`, `Удаляем`, `Повторим автоматически`, `Часть данных сохранена по юридическому требованию`, `Удаление возобновлено`, `Удалено`, `Срок превышен — удаление продолжается` и terminal failure `Нужна помощь`. Для processor/safety target статусы `deleted|not_found` действительны только с обязательным immutable provider proof; сырой provider receipt ID пользователю и analytics не раскрывается. UI не пишет «Удалено», пока server и все обязательные processors не вернули финальные `deleted|not_found` receipts.
- Legal hold открывает **незавершённое** retention obligation и показывает основание, удерживаемые категории, `retentionUntil` и следующий recheck. Продление или снятие hold создаёт новый immutable receipt; в срок или после release worker автоматически возобновляет deletion. Состояние legal hold никогда не является terminal completion и не маскируется под «Удалено».
- Account switch немедленно очищает локальные voice/transcript drafts и изолирует deny latches, consent/deletion outboxes и server operations по `stableId + accountGeneration`; данные и pending intent предыдущего аккаунта не могут появиться в новом. Старый локальный intent не считается принятым сервером и может replay-иться только после восстановления того же authenticated account generation.
- Account delete немедленно очищает локальные данные и выводит пользователя из аккаунта, а серверный deletion journal продолжает удалять server/processor copies в заявленный SLA, включая Club transcript/history и safety records, кроме отдельно документированной законной обязанности хранения. Экран не ждёт завершения processors и не меняет существующий account-delete порядок.
- Network voice разрешается только по server-authoritative eligibility: `adult` с exact eligibility receipt либо `minor` с exact eligibility receipt, совпадающим `VoiceMinorsPolicyRef` и действующим guardian-consent receipt. `unknown`, minor без действующего guardian consent и любой ref/hash/account-generation mismatch fail closed в scripted/on-device/non-voice fallback; voice flow не пишет raw birth date/age в consent, dispatch, deletion или analytics records.
- Generic analytics никогда не содержит raw audio, transcript, свободный текст, history, `stableId`, account generation, consent/deletion operation IDs или processor receipt IDs: только allowlisted reason/status, evidence, latency/capability и SLA bands.

### Accessibility

- Waveform скрыт от accessibility tree; вместо него объявляется «Идёт запись, 4 секунды».
- Result объявляется один раз, затем focus перемещается на заголовок feedback, а не на анимированную звезду.
- Английский example text получает правильный accessibility language.
- Доступны именованные действия «Прослушать эталон», «Начать запись», «Остановить», «Повторить», «Ввести текстом».
- Permission-denied screen содержит «Открыть настройки», «Продолжить без микрофона» и «Назад».
- Состояние recording не определяется только цветом mic: меняются icon, label и accessible state.
- VoiceOver/TalkBack, 200% text, Reduce Motion, Switch Access, external keyboard и смена audio route входят в release matrix.

## Storyboards

Каждый storyboard ниже содержит 4–6 обязательных кадров. Error/offline может быть альтернативой указанного кадра, но должен существовать в design и QA fixture.

### SB-01 — Visual Discovery

**Learning target:** связать смысл с визуальным контекстом до формального объяснения.

1. **Prompt.** Крупная оригинальная сцена Phraseman, инструкция «Что здесь происходит?», две-четыре карточки ответа.
2. **Active selection.** Выбранная карточка получает рамку и check indicator; `Проверить` становится активной.
3. **Success.** Правильная карточка получает lime fill с тёмным текстом; под сценой появляются английская фраза и короткое объяснение смысла.
4. **Needs work.** Выбранный вариант получает нейтральную rose-рамку и конкретный hint: «Посмотри на действие справа». Ответ не раскрывается мгновенно.
5. **Retry/completion.** После второй попытки показывается связь `scene → phrase`, затем `Дальше`.
6. **Unavailable asset.** Вместо пустого места используется текстовый контекст и аудио; item не штрафует пользователя и логируется как content asset failure.

**Controls и gestures:** tap по карточке; long-press и drag не требуются.  
**Motion/haptics:** selection 140 ms, feedback 200 ms; light selection и success после проверки.  
**Accessibility:** alt-описание сцены не должно выдавать ответ; варианты читаются в task order; correctness имеет icon + text.  
**Reference pattern:** ассоциация изображения и языка в [Rosetta Stone Learning Path](https://www.rosettastone.com/learning-path). Сетка, изображения и визуальная идентичность Rosetta Stone не копируются.

### SB-02 — Listen & Choose / Sound Contrast

**Learning target:** распознать смысл, слово или sound contrast на слух.

1. **Prompt.** Большая play-кнопка, инструкция «Что ты слышишь?», ответы в нейтральном состоянии.
2. **Playback.** Отображается реальный audio progress; доступны `Ещё раз` и `0.75×`; transcript скрыт до первой попытки.
3. **Selection.** Два варианта для minimal pair либо три-четыре смысловых варианта для listening task.
4. **Success.** Иконка слуха и текст «Да, это ship»; при contrast task появляется короткое сопоставление с `sheep`.
5. **Needs work.** «Сравни короткий /ɪ/ и длинный /iː/» + A/B replay.
6. **Audio unavailable/offline.** `Повторить загрузку` или доступная текстовая альтернатива; text route не записывается как listening mastery.

**Controls и gestures:** play/replay/slower и обычный tap выбора.  
**Motion/audio/haptics:** не используется декоративный live-waveform; haptic не срабатывает во время аудио.  
**Accessibility:** captions/transcript доступны после попытки; для нарушения слуха есть эквивалентное учебное задание, но оно не считается listening evidence.  
**References:** [Duolingo Practice — Listen/Speak](https://blog.duolingo.com/guide-to-duolingo-practice-hub/), [Rosetta Stone Learning Path](https://www.rosettastone.com/learning-path).

### SB-03 — Speed Match

**Learning target:** повысить скорость узнавания уже знакомых единиц. Режим является optional practice и не используется как mastery gate.

1. **Brief.** «Соедини 12 пар. Таймер можно отключить» и переключатель `Без таймера`.
2. **Active.** Две колонки карточек, progress/timer наверху, последняя выбранная карточка имеет рамку.
3. **Match/combo.** Совпавшая пара исчезает через opacity; combo показывается текстом и icon, не одним bounce.
4. **Pause.** Overlay `Продолжить`, `Начать заново`, `Играть без таймера`.
5. **Finish.** Скорость, точность и personal best показываются отдельно; медленный темп не называется провалом.
6. **Interruption.** После background или звонка timer остаётся на паузе до явного resume.

**Controls и gestures:** обычные taps; swipe/drag не обязательны.  
**Motion/haptics:** 120–160 ms; reduced motion мгновенно скрывает пару; haptic только на milestone.  
**Accessibility:** screen reader автоматически получает untimed list-pair variant; activity не требуется для unlock.  
**Reference:** matching в [Duolingo Practice](https://blog.duolingo.com/guide-to-duolingo-practice-hub/), без копирования сетки, цветов и XP presentation.

### SB-04 — Phrase Builder / Dictation / Contextual Gap

**Learning target:** собрать, восстановить или вспомнить фразу в контексте.

1. **Prompt.** Перевод, сцена или аудио; пустая строка ответа и набор chips.
2. **Active composition.** Tap переносит chip в answer; повторный tap возвращает его. Drag доступен только как shortcut.
3. **Check/processing.** Геометрия сохраняется, ответ блокируется приблизительно на 120–200 ms.
4. **Success.** Правильные chunks получают check icon и текст «Фраза собрана».
5. **Needs work.** Корректные chunks остаются на месте; проблемный slot подчёркнут и объяснён: «После he нужен works».
6. **Fallback/offline.** Для recall/dictation доступна keyboard-кнопка; audio можно повторить/замедлить; загруженный item полностью работает offline.

`ComposerShell` настраивается через `sourceType`, `tokenMode`, `inputMode` и `validationPolicy`. Для cloze показывается sentence context; для dictation target text не раскрывается до попытки.

**Controls и gestures:** tap-first; drag не является единственным маршрутом.  
**Motion/haptics:** placement 120 ms; экран и собранная фраза не трясутся. Ошибочный chip может получить только общий `wrong_option_nudge` из motion policy выше.
**Accessibility:** actions `Добавить в ответ`/`Убрать`; focus следует за перемещённым chip; answer переносится при 200% text.  
**References:** контекстный cloze в [Rosetta Stone Learning Path](https://www.rosettastone.com/learning-path), последовательность [ELSA Grammar Coach](https://elsanow.freshdesk.com/en/support/solutions/articles/31000178081-coach-grammar-coach).

### SB-05 — Sound / Syllable Lab

**Learning target:** заметить и целенаправленно потренировать sound contrast, articulation или syllable stress.

Этот режим не выпускается как phoneme-scoring activity на текущем transcript-similarity scorer. До подключения exact approved `SpeechCalibrationReceipt` для provider/model/config/locale/capture pipeline/task/construct он работает только как guided listen-and-repeat: без `acoustic_pronunciation` evidence, acoustic verdict и acoustic/voice-specific performance star.

1. **Target.** Слово, смысл, IPA и выделенный текущий звук; «Сегодня тренируем /θ/».
2. **Model.** Эталон целиком и звук отдельно; одна проверенная артикуляционная подсказка или статическая схема.
3. **Recording.** Mic, waveform и конкретная инструкция «Скажи think»; запись ограничена разумной длительностью.
4. **Compare/processing.** Guided-вариант не запускает acoustic scorer: learner сравнивает `Моя запись` и `Эталон`. Текст «Проверяем звук, не акцент» появляется только в calibrated-варианте.
5. **Result/focused retry.** Guided-вариант возвращает `COMPLETED` и completion/effort feedback без acoustic verdict. `PASS_CONFIDENT`, phoneme chips и acoustic recommendation разрешены только при valid capture, executed recognition/scoring evaluators, exact calibrated task+construct scope и непустых valid speech-feature observations.
6. **Uncertain/unavailable.** «Из-за шума звук не удалось проверить»; neutral retry или listen-only route.

**Controls:** `Слово`, `Звук`, `Моя запись`, `Повторить`.  
**Motion/haptics:** выделение сегмента 160 ms; нет «пульсирующего рта»; success haptic только при уверенном результате.  
**Accessibility:** схема имеет текстовое описание; acoustic/voice-specific performance star не является обязательной для progression.  
**Reference:** иерархия feedback и model/my-audio в [ELSA Detailed Pronunciation Feedback](https://elsanow.freshdesk.com/en/support/solutions/articles/31000177968-advanced-feedback). Percent wheel и обещание native-level accuracy не копируются.

### SB-06 — Scripted Repeat & Compare

**Learning target:** воспроизвести известную фразу, затем услышать и исправить наиболее значимую проблему.

1. **Prompt.** Эталонная фраза, смысл и «Сначала послушай».
2. **Model playback.** Chunks подсвечиваются в темпе речи; доступны replay/slower.
3. **Recording.** Target остаётся видимым на ранних эпизодах и постепенно скрывается в поздних.
4. **Processing.** Отдельно проверяются audio quality, распознанные слова и доступные speech features.
5. **Success/needs work.** Word chips + честный verdict «Фраза распознана» либо одна конкретная рекомендация.
6. **Compare/recovery.** `Моя запись` и `Эталон` расположены рядом; uncertain, permission и offline состояния используют ту же панель.

Текущий text-derived score может подтверждать только word recognition/order. Пока нет валидированной acoustic assessment, copy не говорит «звук произнесён чисто».

**Controls:** model, slower, record/stop, my recording, retry/continue.  
**Motion/audio/haptics:** chunk highlight 100–140 ms; playback и recording взаимоисключены.  
**Accessibility:** все audio controls именованы; результат передаётся text + icon; press-and-hold не обязателен.  
**References:** [Duolingo Practice — Speak](https://blog.duolingo.com/guide-to-duolingo-practice-hub/), [ELSA Detailed Feedback](https://elsanow.freshdesk.com/en/support/solutions/articles/31000177968-advanced-feedback), speaking section [Rosetta Stone Learning Path](https://www.rosettastone.com/learning-path).

### SB-07 — Quick Spoken Response / Describe Scene

**Learning target:** сформулировать смысловой ответ или описать сцену своими словами.

1. **Prompt.** Изображение/вопрос и communicative goal: «Скажи, что ты хочешь заказать».
2. **Think/record.** Нет обязательного таймера; доступны `Начать` и `Нужна фраза-подсказка`, затем recording.
3. **Transcript confirmation.** «Мы услышали: …»; `Изменить`, `Записать ещё раз`, `Отправить`.
4. **Evaluating.** Prompt и transcript остаются видимыми; пользователь может отменить сетевую отправку до принятия сервером.
5. **Feedback.** Раздельно показываются «цель выполнена», intelligibility evidence и одна naturalness-подсказка.
6. **Uncertain/offline.** Typed fallback или локальное сохранение допустимого черновика; звёзды не уменьшаются.

Spontaneous response не force-alignится с одной «правильной» фразой. Допустимые semantic variants задаются в content contract.

**Controls:** mic, edit transcript, retry, send, hint, keyboard fallback.  
**Motion/haptics:** transcript card 180 ms; success только за уверенное выполнение цели.  
**Accessibility:** keyboard route доступен постоянно; `inputSource=keyboard`, `transcriptOrigin=typed` не получает voice-specific performance star, но activity можно завершить.  
**References:** guided conversation в [Duolingo Video Call with Falstaff](https://blog.duolingo.com/beginner-video-call-with-falstaff/), [ELSA Real-Time Feedback for AI Conversations](https://elsanow.freshdesk.com/en/support/solutions/articles/31000177727-real-time-feedback-for-ai-conversations).

### SB-08 — Shadowing / Rhythm

**Learning target:** meaningful chunking, rhythm, stress и паузы на многословной фразе.

1. **Brief.** Фраза разбита на смысловые chunks; цель сформулирована как «ритм и ударение», а не «повтори акцент».
2. **Model playback.** Спокойная chunk-подсветка сопровождает эталон.
3. **Record.** В пилоте default — delayed shadowing после эталона. Simultaneous shadowing включается только с headphones.
4. **Processing.** Проверяются достаточная длительность, audio route, echo/noise и доступные prosody features.
5. **Feedback.** Отдельные строки `stress`, `rhythm`, `pauses`; отображаются только валидированные показатели.
6. **Focused retry/interruption.** Повторяется один chunk; route change или echo дают neutral recovery.

**Controls:** model, slower, delayed/simultaneous mode, record, current chunk, retry.  
**Motion/audio/haptics:** chunk marker 80–120 ms; reduced motion оставляет статическое underline; simultaneous mode требует headphones.  
**Accessibility:** transcript и chunk navigation доступны; speech-only gate отсутствует.  
**Reference pattern:** listen–repeat–compare из Rosetta Stone/ELSA; timeline и visual language создаются для Phraseman.

### SB-09 — Microstory / Radio

**Learning target:** понимать связную речь в коротком контексте и замечать полезные фразы.

1. **Cover.** Название, цель, длительность, `Новые фразы: 4`, download state.
2. **Playback.** Иллюстрация, captions/transcript toggle, speed, pause и назад 5 секунд.
3. **Comprehension break.** Один короткий вопрос; после ответа story продолжается с прежнего места.
4. **Phrase focus.** Tap по фразе открывает перевод, replay сегмента и `Сохранить`.
5. **Completion.** Короткий can-do result и выбор `Переслушать`/`Продолжить`.
6. **Offline/download.** Незагруженный эпизод показывает размер и download action; загруженный работает без сети.

**Controls:** player controls, captions, speed, transcript, phrase save.  
**Motion/audio/haptics:** geometry не прыгает при captions; нет декоративного бесконечного движения; haptics не мешают playback.  
**Accessibility:** transcript можно прочитать отдельно; постоянные announcements не перебивают аудио.  
**References:** [DuoRadio](https://blog.duolingo.com/duoradio-listening-practice/), media/context approach на [EWA](https://appewa.com/) и [EWA About](https://appewa.com/about/).

### SB-10 — Branching Scene / Adventure

**Learning target:** применить знакомые фразы для достижения цели в безопасной симуляции.

Для пилота используется оригинальная 2.5D/static scene, а не тяжёлая 3D-среда.

1. **Mission brief.** «Купи билет до Cork», две-три objectives и изученные фразы.
2. **Explore.** Сцена с тремя-пятью крупными hotspots; objectives drawer доступен постоянно.
3. **Interaction.** Персонаж говорит, learner выбирает или произносит ответ.
4. **Contextual repair.** Персонаж естественно уточняет «Ты хотел билет на сегодня?» вместо красного экрана ошибки.
5. **Goal progress.** Objective получает check + text; следующий hotspot становится доступен.
6. **Completion/resume.** Result по целям; текущий node сохраняется при выходе; missing asset имеет text-based scripted fallback.

**Controls и gestures:** tap hotspots, list-view alternative, optional voice.  
**Motion/haptics:** finite reaction 180–280 ms; reduced motion — crossfade; success haptic только на objective completion.  
**Accessibility:** exploration не зависит от координат; список hotspots повторяет все действия сцены.  
**Reference invariant:** context exploration и immersive repair из [Duolingo Adventures](https://blog.duolingo.com/adventures/). Board layout, characters, dialogue и animation signature не копируются.

### SB-11 — Scripted Dialogue / Milestone

**Learning target:** провести короткий предсказуемый разговор с prerecorded partner без AI latency.

1. **Brief.** Ситуация, роль learner, три-пять turns, offline-ready indicator.
2. **Partner line.** Портрет/сцена, audio, captions, repeat и slower.
3. **Your turn.** Expected communicative function, mic и optional support phrase.
4. **Response.** Нейтральная processing panel и следующая prerecorded реплика.
5. **Repair.** Если цель не достигнута, партнёр переспрашивает или показывает partial cue.
6. **Summary.** Выполненные функции, сложная реплика для повтора, звёзды и `Дальше`.

**Controls:** replay, slower, captions, mic, hint, alternate response.  
**Motion/audio/haptics:** finite turn transition 180–220 ms; audio/recording exclusion.  
**Accessibility:** listening/choice fallback завершает activity, но не выдаёт voice-specific performance star; весь диалог имеет transcript.  
**Reference:** unit-end prerecorded conversation в [Rosetta Stone Learning Path](https://www.rosettastone.com/learning-path).

### SB-12 — AI Speaking Club Capstone

**Learning target:** перенести изученные фразы в ограниченную, но вариативную communicative mission.

Speaking Club входит в V2 как transfer/capstone ближе к концу эпизода. Он не знакомит с новой формой впервые и не является обязательным источником воспроизводимой pronunciation assessment.

1. **Mission brief.** Сценарий, три objectives, две-три useful phrases, длительность и понятный network/privacy summary; до первой отправки доступны processor/region/retention/deletion details, versioned consent и равноправные действия `Разрешить сетевую обработку` / `Продолжить без неё`.
2. **Partner turn.** Оригинальный персонаж/портрет Phraseman, audio bubble, captions, repeat/slower.
3. **Learner turn.** Запись через Voice Shell, затем обязательный editable transcript preview с видимым `Мы услышали`; edit меняет origin на `learner_edited` и оставляет только semantic-objective evidence.
4. **Sending/thinking.** Chat geometry сохраняется; отправку можно отменить; timeout показывает retry и не стирает learner turn.
5. **Reply/progress.** Ответ партнёра и objective checklist; correction открывается по `Разобрать` и не перебивает разговор.
6. **Completion/error alternative.** Star breakdown, одна-две actionable corrections и повтор ключевой реплики. Offline предлагает scripted dialogue или `Вернуться позже`.

#### Star policy Speaking Club

- Первая звезда — завершены необходимые turns независимо от voice/text.
- Вторая — достигнуты communicative objectives.
- Третья performance star — есть минимум две уверенно валидные voice attempts из неотредактированного voice evidence route и подтверждённая voice practice.

Text/learner-edited transcript fallback не получает третью voice-specific performance star, но threshold открытия эпизода не требует её. Acoustic/performance star не выводится из transcript, который распознали ASR и LLM. Objective completion, transcript origin/confidence и pronunciation evidence хранятся раздельно.

Network Club недоступен без exact active `VoiceDataPolicyRef`, показанного exact localized `VoiceConsentCopyRef`, purpose-specific append-only accepted consent receipt, server-authoritative adult/minor-with-guardian eligibility и совпадающего `stableId + accountGeneration`. Любой audio/transcript/Club payload проходит только через общий provider-agnostic server voice egress: gateway атомарно создаёт одноразовую reservation на exact consent sequence, а provider adapter не имеет публичного/direct entry point. Decline/revoke немедленно ставит local deny latch и переводит миссию на scripted fallback. Privacy panel позволяет отозвать consent для будущей обработки, удалить текущий transcript/history с видимым состоянием durable operation/retention obligation и открыть account-delete route; policy pin-ит exact deletion-route/minors refs и покрывает provider retention и safety records. Generic analytics не получает реплики пользователя/партнёра, account identity или consent/deletion identifiers.

#### Что сохраняется и что меняется относительно текущего Club

Сохраняются mission brief, objectives, chat history, repeat/slower и итоговый review. Меняются следующие UI contracts:

- close control увеличивается до platform minimum;
- emoji-кнопки заменяются доступными vector icons;
- hold-only mic заменяется toggle interaction с optional hold shortcut;
- перед отправкой появляется transcript confirmation;
- objective evidence и target-phrase/voice evidence отображаются раздельно;
- offline не является тупиковым полноэкранным экраном.

**Controls:** objectives drawer, captions, repeat/slower, mic, edit transcript, keyboard fallback, end mission.  
**Motion/audio/haptics:** stable chat layout, finite typing indicator, no full-screen spinner; TTS не пересекается с mic.  
**Accessibility:** controls имеют labels; transcript доступен; result не зависит от цвета/анимации; typed route не блокирует progression.  
**References:** [Rosetta Stone Chat Missions](https://support.rosettastone.com/sapphire-chat-missions/), [Duolingo Video Call](https://blog.duolingo.com/video-call/), [Duolingo Video Call with Falstaff](https://blog.duolingo.com/beginner-video-call-with-falstaff/), [ELSA AI Conversation Feedback](https://elsanow.freshdesk.com/en/support/solutions/articles/31000177727-real-time-feedback-for-ai-conversations).

### SB-13 — Mistakes / Personalized Review

**Learning target:** вернуть слабое знание через новый контекст и delayed retrieval.

Review не создаёт новый renderer. `ReviewAssessmentShell` оркестрирует уже существующие shells и объясняет пользователю, почему item появился.

1. **Queue brief.** «6 заданий · около 5 минут», причина: «2 фразы после вчерашнего урока».
2. **Native activity.** Открывается исходный shell без отдельного визуального типа `review exercise`.
3. **Targeted feedback.** Одна причина и одна подсказка.
4. **Delayed recheck.** Тот же навык возвращается позже с другим контекстом, не мгновенным клоном.
5. **Completion.** «3 навыка стали увереннее · 2 вернутся завтра».
6. **Offline.** Очередь и result сохраняются локально; sync не блокирует UI.

Copy не стыдит пользователя формулировкой «5 ошибок»; используется «Повторим 5 фраз».

**Controls:** start, skip optional item, native shell controls, finish.  
**Motion/haptics:** переходы между разными shells сохраняют общий scaffold; нет reward animation после каждого review item.  
**Accessibility:** причина назначения читается screen reader; skip/alternate routes доступны.  
**References:** [Duolingo Practice/Mistakes](https://blog.duolingo.com/guide-to-duolingo-practice-hub/), [ELSA Today’s Tasks](https://elsanow.freshdesk.com/en/support/solutions/articles/31000179029-coach-today-s-tasks).

### SB-14 — Checkpoint / Exam

**Learning target:** проверить can-do outcomes главы на воспроизводимом наборе знакомых типов заданий.

1. **Readiness.** Список проверяемых can-do skills; интерфейс не обещает сертифицированный CEFR level.
2. **Active.** Смешанная последовательность знакомых shells, hints скрыты, общий progress видим.
3. **Voice uncertainty.** System uncertainty предлагает эквивалентную попытку и не считает ответ неверным.
4. **Pause/resume.** Checkpoint можно прервать и продолжить; timer отсутствует, если не является частью конструкта.
5. **Result.** Отдельно: «можешь представиться», «можешь попросить помощь», listening evidence, recall evidence, speaking evidence.
6. **Needs reinforcement.** Конкретный review playlist; нет красного «экзамен провален» и снятия уже заработанных звёзд.

Checkpoint не включает AI Speaking Club как обязательный scored item: сеть и generative variability несовместимы с воспроизводимым gate.

**Controls:** pause, resume, audio/accessibility settings, next, alternate voice attempt, finish.  
**Motion/haptics:** спокойные transitions; reward sequence только после итогового result.  
**Accessibility:** untimed/default route, deterministic alternate for voice uncertainty, full screen-reader task trace.  
**Reference pattern:** знакомые exercise families в path/checkpoint системах конкурентов; scoring, copy и can-do summary создаются для Phraseman.

## Star surfaces и звёздные ворота

Внутри activity показываются только звёзды, заработанные за эту activity. Purchased access не маскируется под mastery.

### Activity result

- earned star — filled gold star с label причины;
- empty star — outline с доступным объяснением условия;
- результат voice activity показывает evidence label, а не необъяснённый процент;
- `UNCERTAIN`/`INVALID_AUDIO_OR_SYSTEM` дают ноль candidate performance stars, не создают learning/reward evidence, предлагают бесплатный technical retry и оставляют лучший прежний результат без изменений;
- повтор может улучшить best result, но не создаёт бесконечно фармящийся баланс.

### Locked episode surface

Пример:

```text
14 / 18 заработанных звёзд
+2 звезды доступа
До открытия не хватает 2

[Повторить слабые задания]
[Открыть за {serverQuote.totalShards} осколков]

Пример server quote для дефицита 2
при pilot rate 3: 6 осколков

Звезда доступа откроет путь,
но не повысит мастерство и не засчитается в checkpoint.
```

- Primary CTA на lime имеет тёмный foreground.
- `Повторить слабые задания` — рекомендуемое первое действие.
- Покупка требует явного подтверждения стоимости и результата.
- UI никогда не вычисляет и не владеет ценой: он показывает server-authoritative quote с `quoteId`, `policyVersion`, deficit, `totalShards` и expiry. Пример `2 × 3 = 6` объясняет только полученную котировку, а не задаёт client formula.
- Если продукт сохраняет слово «звезда» для покупаемой единицы, `access star` получает отдельный outline/notch и label `звезда доступа`, а не выглядит как earned gold star.
- Gate показывает earned и access contribution раздельно.
- Voice-specific star не может быть единственным способом достичь unlock threshold.

## Authoring manifest для Content Studio

Storyboard описывает пользовательский опыт, но сам по себе не даёт админке безопасную форму создания режима. Поэтому каждый code-owned `activityTypeKey` обязан публиковать versioned authoring manifest. Неполный manifest не попадает в Mode Library и не может быть выбран для нового эпизода.

```ts
export interface ActivityAuthoringManifest {
  activityTypeKey: string;
  manifestVersion: number;
  family: string;
  shellKey: string;
  storyboardKey: `SB-${string}`;
  humanName: string;
  helpText: string;

  fieldSchema: AuthoringFieldDefinition[];
  allowedPolicyKeys: {
    scoring: string[];
    evidence: string[];
    progress: string[];
    reward: string[];
    recovery: string[];
  };

  previewScenarios: PreviewScenarioDefinition[];
  requiredCapabilities: string[];
  accessibilityContractKey: string;
  offlineContractKey: string;
  minAppVersion: string;
}

export interface AuthoringFieldDefinition {
  path: string;
  label: string;
  helpText: string;
  control:
    | 'short_text'
    | 'long_text'
    | 'localized_text'
    | 'single_choice'
    | 'multi_choice'
    | 'phrase_reference'
    | 'asset_reference'
    | 'audio_reference'
    | 'semantic_slot_list'
    | 'bounded_number';
  required: boolean;
  editablePerInstance: boolean;
  constraints: Record<string, string | number | boolean>;
}
```

Authoring manifest хранит только форму и ограничения. Он не содержит JavaScript, CSS, React component path, произвольные URL, формулы scoring/reward, Firestore paths, navigation targets или сетевые действия.

### Что создаёт администратор

- `ModeTemplate` — переиспользуемый versioned рецепт над одним зарегистрированным `activityTypeKey`;
- `ActivityInstance` — конкретное упражнение эпизода с локализованным payload;
- `EpisodeDraft` — граф из activity instances, переходов, star slots и review links;
- новую authoring draft revision, из которой после review создаётся следующая immutable `ModeTemplateVersion`, либо clone с новым `templateId`; content/hash/object существующей published version не изменяются, а deprecate/archive затрагивают только её lifecycle metadata.

Совершенно новый тип взаимодействия, evidence route или scoring policy сначала реализуется и тестируется в коде. После появления полного registry entry, authoring manifest и app support manifest он автоматически становится доступен в Content Studio.

### Обязательные preview fixtures

Для каждого шаблона Content Studio проверяет минимум состояния `prompt`, `active`, `processing`, `success`, `needs_work` и `recovery`. Дополнительно manifest обязан покрыть применимые состояния permission denied, offline, fallback, large text, screen reader и reduced motion из раздела «Минимальная последовательность кадров» ниже.

HTML-preview считается структурным. Runtime parity подтверждается только `PreviewEnvelope`, открытым через тот же loader, registry и renderer в React Native device preview. Админка показывает эти статусы раздельно и не называет browser render точным preview приложения.

Полный lifecycle, модели данных, права и release flow определены в [08-admin-content-studio-and-mode-authoring.md](./08-admin-content-studio-and-mode-authoring.md).

## Reference-capture plan

Официальные страницы позволяют определить назначение и отдельные UI patterns, но не доказывают полный runtime flow. Для final mockup bank выполняется отдельная first-hand съёмка.

### Capture ledger

Для каждого capture фиксируются:

- продукт и точное название activity;
- платформа, устройство и версия ОС;
- app version/build, если виден;
- дата capture;
- UI locale, target language и уровень learner;
- free/premium/account state;
- entry path;
- состояние кадра;
- наблюдаемый факт отдельно от inference;
- URL или абсолютный путь к raw artifact;
- SHA-256 raw artifact;
- copyright/usage note.

### Минимальная последовательность кадров

Для каждого приоритетного activity reference нужно получить либо честно отметить как недоступные:

1. discovery/entry и lock state;
2. activity introduction;
3. idle prompt;
4. active input;
5. interruption/cancel;
6. processing;
7. success;
8. partial/incorrect;
9. hint;
10. retry;
11. permission/offline/service error;
12. completion/reward/resume.

### Продукты и обязательные capture sets

| Продукт | Что снять | Official reference |
|---|---|---|
| Rosetta Stone Sapphire | visual prompt → choice → correct/incorrect; listening; speaking; unit conversation; listening-mode fallback | [Learning Path](https://www.rosettastone.com/learning-path), [Learning Path Support](https://support.rosettastone.com/sapphire-learning-path/) |
| Rosetta Stone Chat Missions | mission entry → objectives → turn → correction → completion/error | [Chat Missions Support](https://support.rosettastone.com/sapphire-chat-missions/) |
| Duolingo | Listen/Speak/Mistakes entry → active → feedback → retry → completion | [Practice Tab](https://blog.duolingo.com/guide-to-duolingo-practice-hub/) |
| Duolingo DuoRadio | cover → playback → comprehension interlude → completion | [DuoRadio](https://blog.duolingo.com/duoradio-listening-practice/) |
| Duolingo Adventures | brief → scene → interaction → contextual repair → objective completion | [Adventures](https://blog.duolingo.com/adventures/) |
| Duolingo Video Call | entry → connecting → active turn → repeat/help → exit → completion/error | [Video Call](https://blog.duolingo.com/video-call/), [Beginner Call with Falstaff](https://blog.duolingo.com/beginner-video-call-with-falstaff/) |
| ELSA | record → regular result → advanced word → phoneme detail → model/my audio → retry | [Detailed Feedback](https://elsanow.freshdesk.com/en/support/solutions/articles/31000177968-advanced-feedback) |
| ELSA AI/Grammar | roleplay turn → real-time suggestion → explanation; grammar learn/test/story/error hunt | [AI Conversation Feedback](https://elsanow.freshdesk.com/en/support/solutions/articles/31000177727-real-time-feedback-for-ai-conversations), [Grammar Coach](https://elsanow.freshdesk.com/en/support/solutions/articles/31000178081-coach-grammar-coach) |
| EWA | story player → transcript/translation → saved phrase → completion/offline behavior | [EWA](https://appewa.com/), [About EWA](https://appewa.com/about/) |
| Phraseman current | все preview states `SpeakingPanel`; Speaking Club entry, brief, active voice, AI reply, error, completion | `app/_admin_speaking_lab.tsx`, `components/SpeakingPanel.tsx`, `app/speaking_club_home.tsx`, `app/speaking_club_session.tsx` |

### Distinctiveness gate

Каждый Phraseman storyboard проходит проверку:

- нет competitor logo, mascot, illustration, audio, copy или proprietary lesson content;
- отличаются layout proportions, card geometry, icon choices, spacing и reward language;
- используется тема и navigation grammar Phraseman;
- motion имеет собственные tokens из этого документа;
- полезный pattern связан с учебной функцией, а не выбран только из-за знакомого вида.

## Design QA matrix

Перед утверждением каждого storyboard проверяются:

- iOS physical device: VoiceOver, large Dynamic Type, Reduce Motion;
- Android physical device: TalkBack, large font/display, animation disabled;
- default touch path, keyboard/Switch/Voice Access smoke path;
- permission first ask, denied и blocked/settings;
- no speech, too short, clipping/noise, multiple speakers;
- звонок, background, route change, Bluetooth disconnect;
- online, slow network, timeout, offline и retry;
- две mandatory learning retries максимум; все permission/capture/ASR/network/provider failures остаются бесплатными и не превращаются в `WRONG`;
- repeated technical failure показывает конкретный alternate route, а не бесконечный retry-only state;
- scripted/spontaneous discriminator, persisted transcript-confirmation fact, `asr_raw|learner_edited|typed` origin, запрет transcript-match для spontaneous и speech/acoustic evidence из edited/typed transcript;
- exact provider/model/config/locale/capture/policy + task/construct scope match с calibration receipt; confident acoustic result требует valid nonempty speech features, stale/missing receipt включает guided/non-voice fallback;
- network consent accept/decline/revoke по exact policy/copy-ref/purpose/account generation; inventory test доказывает, что все network ASR/scoring/Club adapters доступны только через общий server egress и direct provider call запрещён;
- оба порядка revoke-vs-reservation race, offline revoke → restart/reconnect replay, persistent deny latch, pending accept not-authorized, account-switch isolation, adult/minor/unknown/guardian fail-closed cases;
- provider retention, обязательный external provider proof для processor/safety `deleted|not_found`, durable delete-current-history с retry/SLA, legal-hold open/extend/release/expiry/recheck → eventual deletion, account switch и asynchronous account-delete lifecycle;
- diagnostic attempt не появляется как LearningEvidence, а неизмеренный accessibility construct получает нормативный LearningNonAssessment документа 05; attempt хранит только его canonical ref;
- access purchase отображает только свежий server quote/expiry; UI не вычисляет rate или total;
- light/dark и все поддерживаемые темы;
- обычный текст 4.5:1, крупный/non-text UI 3:1;
- lime/neon surfaces с тёмным foreground;
- 200% text без clipping и перекрытия `ActionDock`;
- reduced motion без потери значения;
- typed/listen-only fallback и честная маркировка evidence;
- отсутствие content jump при processing/result;
- сохранение progress/resume после выхода.

## Находки и предложения

- Главный UI-долг перед расширением режимов — несколько расходящихся voice state machines. Новый `VoiceActivityShell` должен появиться раньше новых голосовых activity families.
- Текущий `SpeakingPanel` визуально смешивает transcript similarity и pronunciation. V2 сначала разделяет copy/evidence; `Sound Lab` и `Shadowing` становятся scored modes только после task-specific calibration, а до неё остаются guided practice.
- Текущий Speaking Club содержит подходящие элементы capstone, но hold-only input, отсутствие transcript confirmation и одинаковая reward semantics для text/voice требуют изменения до интеграции в путь V2.
- Для 32-эпизодного пилота статические/2.5D scenes и конечные анимации дают достаточно разнообразия. Полный 3D Adventure увеличит сроки, bundle weight и accessibility risk без подтверждённой пользы.
- 14 storyboard покрывают 17 runtime activity families и checkpoint assessment surface и позволяют генератору создавать новые уроки и языки через configuration, а не через новые экраны.
