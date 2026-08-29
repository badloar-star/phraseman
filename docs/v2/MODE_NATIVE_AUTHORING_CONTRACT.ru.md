# Learning V2 — mode-native authoring и точное соответствие макетам

**Статус:** `NORMATIVE`, обязательный owner contract.  
**Решение владельца:** 2026-08-25.  
**Область:** весь текущий и будущий learner-facing контент Learning V2 для
всех target languages, все 32 урока × 56 сессий, source → shard → release →
runtime → owner mock.

## 1. Решение владельца

Слова, фразы и языковые объяснения пишутся **сразу под одну из шести активных
утверждённых механик**, а не как универсальный список, которому позже
присваивается строка `family`.

Неподвижными остаются все действующие нормы:

- word-first и порядок контактов с новым словом;
- число контактов со словами и фразами;
- interaction profile и бюджеты по `SessionKind`;
- progression, grammar/can-do boundary и отсутствие filler;
- восемь самостоятельных locale-native версий;
- типизированные диагностические дистракторы и индивидуальный feedback;
- интро `concept → formula → trap`, review и fingerprints.

Каждая сессия имеет ровно три интро подряд, затем practice, в которой
присутствуют все шесть активных families хотя бы по одному разу. Соседние practice
interactions не могут иметь одну family. Проверка выполняется по learner child.

Меняется способ авторства практики: **каждый обязательный контакт обязан быть
реальным действием внутри утверждённого режима**. Контакт не засчитывается,
если target просто положили в generic `single_choice`, `ordered_tokens` или
`scripted_speech` и подписали именем нужной family.

## 2. Единственные шесть активных режимов

| Family | Канонический owner-макет | Неподменяемая учебная операция |
|---|---|---|
| `phrase_builder` | `mockups/02-phrase-builder.html` | собрать фразу из авторских плиток; неверная сборка даёт retry/verdict без choice-style пояснения |
| `listen_choose` | `mockups/03-listen-choose.html` | услышать реальное аудио и выбрать услышанный locale-native смысл без утечки target-текста |
| `listen_build_dictation` | `mockups/05-listen-build.html` | восстановить скрытую фразу по обычному/замедленному аудио |
| `context_gap_grammar` | `mockups/06-context-gap.html` | выбрать точную форму в видимом контексте и одном диагностическом пропуске |
| `speed_match` | `mockups/07-speed-match.html` | сопоставить набор пар в двух колонках с предусмотренными pause/timer/finish states |
| `scripted_repeat_compare` | `mockups/14-repeat-compare.html` | послушать модель, удерживать центральный микрофон во время ответа, отпустить для завершения и честно сравнить модель/свою запись |

`sound_contrast` и его исторический `mockups/04-sound-contrast.html` сохранены
только для чтения старых черновиков. Решением владельца 2026-08-25 этот режим
снят с активного authoring и не может назначаться новой learner interaction.

Имена и SHA-256 макетов зафиксированы машинно в
`modules/learning-v2/contracts/mode_native_authoring_contract_v1.ts`.
Изменение HTML меняет fingerprint и требует нового явного решения владельца,
повторного visual/motion review и обновления контракта в том же изменении.

## 3. Сначала режим, потом языковой материал

Для каждой сессии автор до написания practice фиксирует:

1. `SessionKind`, objective и exact word/phrase contacts;
2. family каждого контакта и почему именно её действие измеряет этот контакт;
3. mode-native payload, состояния, audio targets, traps и feedback;
4. место контакта в `encounter → recognize → retrieve/build → apply → check`;
5. как реальная learner-проекция воспроизведёт owner-макет.

Только после этого пишутся target, варианты, перевод, объяснения и
дистракторы. Автоматически назначать family готовой универсальной карточке,
раскладывать все сессии по повторяющейся таблице или заменять отсутствующий
payload похожей generic-механикой запрещено.

Одна и та же фраза может появиться в разных режимах только когда меняется
учебная операция и это нужно progression. Действующее правило «exact target +
family не повторяется внутри сессии» сохраняется.

Новое слово не выносится в пакет карточек после интро. Непосредственно штатный
`app/flashcards/FlashcardListItem.tsx` появляется поверх первого interaction с
этим exact token; похожая самостоятельная перерисовка запрещена. После Continue
продолжается тот же interaction. Компактная геометрия берётся из общего
`app/flashcards/FlashcardListItemChrome.ts`; лицо содержит только target и
транскрипцию, оборот — только точный перевод. Speaker остаётся справа сверху,
на экране ровно один bookmark, общий save-control задания под overlay скрыт.
Под flip-поверхностью показывается обязательная вручную написанная краткая
словарная дефиниция для текущей из восьми локалей. Она проходит source → shard →
package → runtime без template-generation и не попадает на оборот карточки.
Сам факт первого показа overlay немедленно и идемпотентно записывает durable
lesson unlock. Завершение сессии и кнопка Continue не являются условием
разблокировки. Перед решением о показе registry обязан гидратироваться; уже
увиденный lexical item при повторном входе не показывает blocking-карточку.
Authoring preview использует отдельный DEV namespace и не пишет learner
progress, но DEV-словарь карты объединяет оба namespace для owner-проверки.

Футер direct player повторяет footer обычного урока: равные колонки с иконкой и
подписью, без круглых action-контейнеров и pill CTA. Attempts HUD находится в
нормальном layout шапки; overlay поверх progress/counter запрещён. Все
полноэкранные словарные поверхности учитывают safe-area.

При нескольких новых словах authoring чередует targets внутри каждой стадии:
все `recognize`, затем все самостоятельные `retrieve_meaning`, затем все
самостоятельные `build_form`. Общая grid не заменяет четыре target-word задачи.
У одного слова три стадии используют три разные families, а одинаковый target
не ставится подряд только ради формального числа контактов.

## 4. Обязательный mode-native payload

Каждая learner interaction несёт versioned discriminator `modePayload` своей
family. Поля общей оболочки (`family`, `prompt`, `responseOptions`,
`inputMode`) не заменяют этот payload.

- `phrase_builder`: target, locale-native meaning, ordered target tokens,
  авторские distractor tiles и внутренние slot diagnostics для authoring QA;
  отдельный learner-facing choice-feedback не проецируется.
- `listen_choose`: reference audio, slow replay, locale-native choices,
  transcript reveal policy и feedback по каждому варианту.
- `listen_build_dictation`: reference + slow audio, target hidden до попытки,
  ordered tokens, авторские лишние плитки и внутренние slot diagnostics без
  learner-facing choice-feedback.
- `context_gap_grammar`: locale-native scene/meaning, одна точная gap-position,
  варианты одной проверяемой dimension и feedback по каждой ловушке.
- `speed_match`: полноценный `pairGrid`, две независимо перемешанные колонки,
  stable pairing keys, timer/pause policy и finish stats. Один prompt с тремя
  radio-вариантами не является Speed Match. `pairGrid` содержит ровно четыре
  разных знакомых слова и четыре атомарных значения: максимум `4 + 4` видимых
  кнопки. Незнакомый target, повтор пары или расширение сетки сверх четырёх
  пар дают `HOLD`.
- `scripted_repeat_compare`: reference + slow audio, target phrase,
  hold-press/release lifecycle в центральном футере, playback модели и ученика,
  honest outcome states и доступный toggle через assistive action. Видимая
  вторая mic-кнопка внутри карточки и tap-only управление запрещены. Бинарный
  correct/wrong не может подменять утверждённый режим.
  Центральный reference control — крупная ringed Play-кнопка; во время
  `requesting/listening/finishing` она сохраняет геометрию и становится
  недоступной, а footer press-target не размонтируется и не меняет callback до
  release. Report-control закреплён справа над футером.
  Instruction содержит только действие; `targetPhrase` рендерится отдельным
  крупным слоем ровно один раз и не конкатенируется к prompt. На Android при
  наличии штатного PCM-recorder и локальной модели используется тот же
  app-owned hold route, что в обычных уроках: нативный endpointer не имеет права
  завершать запись раньше физического release. Системный recognizer допустим
  только как fallback, а press target получает достаточный retention offset.

Аудиозависимое задание без валидного published audio target — `HOLD`. Кнопка,
которая визуально существует, но ничего не воспроизводит, не считается
fallback. Offline/unavailable state реализуется как в макете и не выдаёт
listening/voice evidence.

До опубликованного аудио DEV owner-preview вправе воспроизводить точный target
системным голосом устройства. Ошибка или задержка воспроизведения не должна
делать экран непроходимым: choices/tiles остаются доступны, а недоступная
audio-кнопка имеет честный disabled/unavailable state. Это не превращает DEV
  fallback в production audio evidence.

Жёсткая гранулярность токенов (owner 2026-08-28): `phrase_builder` и
`listen_build_dictation` собирают только целые слова/целые утверждённые чанки.
Нельзя разбивать `set` на `s + e + t`, нельзя смешивать одиночные буквы с
цельными словами-дистракторами. Однобуквенные `I` и `a` допустимы только потому,
что сами являются полными словами. Форму отдельного нового слова проверяет
whole-word choice, audio recognition или voice, но не буквенный пазл.

Для обычного single-choice/gap/одношагового builder нужны один правильный ответ
и минимум три вручную выбранные диагностические ловушки. Только single-choice
получает видимый разбор ответа: у каждой неверной кнопки свой ручной feedback,
точно привязанный к `responseId`. Builder сохраняет ловушки для retry и QA, но
не показывает плашку выбора.
`speed_match` состоит из настоящих пар и не получает искусственных
неправильных пар ради этого минимума.

Новая грамматическая конструкция не может быть побочным материалом словарной,
голосовой или повторительной сессии. Первое появление `to`, отрицания, вопроса,
артикля, нового подлежащего, указательной/притяжательной формы, `have` или
модальной конструкции требует отдельной полной сессии: конструкция явно
записана в `session map.teaches`, а source содержит ровно 3 интро и 17
mode-native практик. Скрытая конструкция в target-тексте или только в
`phrase.features` даёт `HOLD`.

Owner-дополнение 2026-08-28: каждая authoring-сессия обязана иметь новую
микрограмматическую операцию. Три интро содержат одинаковый `grammarFeatureId`,
три разные `testedDimension`, объясняют операцию до practice и задают варианты
на английском. Native-language semantic quiz в интро запрещён.

После сборки evaluator обязан принимать ровно один видимый single-choice
вариант. Тексты кнопок и `responseId` уникальны. Ключи
`responseFeedbackById` обязаны в точности совпасть с множеством видимых
неверных response IDs: ни пропусков, ни правильного ответа, ни устаревшего
невидимого ключа. Во всех восьми локалях тексты непустые и различаются между
ловушками. Fallback «возьми любой feedback с `correct=false`» запрещён.

Каждая видимая кнопка правильного ответа и дистрактора содержит одну атомарную
формулировку. Перечислять через `/` несколько переводов, синонимов или родовых
форм запрещено; в `speed_match` это же относится к каждой подписи значения.
Полные варианты могут оставаться в словарной карточке или редакторском
объяснении, но не протекают в `responseOptions`/`pairGrid` learner package.

Все варианты ответа перемешиваются runtime детерминированно по стабильному
interaction seed. Если source хранит правильный вариант первым, он обязан
переместиться с первой видимой позиции. Retry сохраняет тот же порядок.
Intro choices используют тот же контракт. В `speed_match` две колонки
перемешиваются разными seed; совпадающие строки не раскрывают правильную пару.

## 5. Что означает «интерфейс и анимация 1:1»

Приложение обязано совпадать с соответствующим HTML-макетом по:

- иерархии экрана, геометрии, расположению и порядку элементов;
- всем состояниям до ответа, playback/recording, ошибки, retry, success,
  unavailable, pause и finish;
- тому, какой target/translation/transcript видим в каждом состоянии;
- hit targets, tap/drag/record gestures и моменту блокировки/разблокировки;
- последовательности переходов, direction, duration, delay, easing, scale,
  opacity, shake/spring и состояниям после завершения motion;
- audio controls, progress, replay, slow mode и feedback lane;
- теме, контрасту, typography hierarchy и target/explanation semantics.

Визуальные primitives practice берутся из общего Arena/V2 слоя
`components/ui/v2_ui.tsx` и активной theme palette: те же градиентные плиты,
3D press-depth, haptics и verdict motion. `listen_build_dictation` и
`scripted_repeat_compare` сохраняют уникальную механику, но не отдельный бедный
визуальный язык. Главным voice-действием нижнего футера до верного ответа
остаётся hold-to-talk микрофон с каноническим `VoiceEqualizer`. Direct session-player
использует выделенный lifecycle-owned `useLearningV2LocalHoldToTalkV1`, а не
монтирует тяжёлый универсальный `SpeakingPanel` внутри practice; это сохраняет
тот же визуальный footer, но исключает второй конкурирующий lifecycle записи.
Глобальные `Пропустить`, `Проверить`, `Теория` и `Подсказка` запрещены.

Решением владельца 2026-08-26 прежняя формулировка про единственный control в
voice footer уточнена: единственным **voice-control** остаётся hold-to-talk
микрофон, но рядом с ним доступен независимый карман уже разблокированных слов.
Точный порядок footer:
`Назад | hold-to-talk микрофон | карман слов | Далее`. Карман не начинает и не
останавливает запись и не создаёт второй микрофон.

Карточка нового слова фиксирует durable unlock до декоративной анимации, после
чего карточка уменьшается и перемещается в карман. При reduce-motion конечное
состояние применяется сразу. В кармане и browse-only словаре поверх карты
урока видны только уже разблокированные слова; будущие слова не показываются.
Сохранение использует `bookmark-outline` / `bookmark`, а не сердце/лайк, и одно
состояние синхронно отражается во всех трёх поверхностях.

Допустимы только платформенные различия safe area, системного font rendering и
accessibility. `reduce motion` может убрать декоративную траекторию, но обязан
сохранить тот же порядок, смысл, конечную геометрию и feedback. Адаптация под
viewport не разрешает менять композицию или механику. Любое другое отличие
требует нового owner decision и новой версии макета; `WIP`, «упрощённая
версия», «пока честная заглушка» и «схема не умеет» дают `HOLD`.

## 6. Доказательство соответствия

Перед `AUTO_PASS` нужны одновременно:

1. schema validation mode-native payload каждого interaction;
2. собранный из настоящего source learner child, а не отдельный demo fixture;
3. реальные audio refs и проверенный unavailable/offline route;
4. state-by-state interaction test по макету;
5. golden screenshots ключевых состояний на owner viewport/theme;
6. motion receipt с измеренными durations/easings и reduced-motion variant;
7. полный играбельный owner mock с тем же пакетом, что получает runtime;
8. exact content fingerprint и exact mockup fingerprint.

После любого изменения learner-facing source, статуса или fingerprint макет
пересобирается в том же ходе. Перед словами «готово к проверке» обязательно
выполнить `npm run learning-v2:owner-review-ready-gate`: команда заново строит
HTML, проверяет bundle/renderer/server и побайтово сравнивает свежий файл с
ответом живого owner-review URL. Старый HTML в памяти сервера, кэш браузера,
отсутствующая текущая сессия или несовпадение bytes означают `HOLD`.

Проверка только наличия семи family names, маршрута компонента или красивого
первого кадра не является доказательством.

Обязательная команда:

```bash
npm run learning-v2:mode-native-authoring-gate
```

Она должна входить в английский и испанский authoring gate. Ненулевой exit —
ожидаемый `HOLD`; следующий ordinal не открывается.

## 7. Статус существующего материала

Решением владельца от 2026-08-25 все существующие English и Spanish Learning
V2 session packages возвращены в `DRAFT` для полной mode-native проверки и
переработки. Старые approvals/fingerprints сохраняются только как история.

Это не требует выбросить удачные фразы, локализации, интро или нормы
word-first. Их можно переиспользовать после редакторской проверки. Но каждая
сессия должна заново получить:

- mode-first choreography;
- family-native payload;
- аудио и состояния, требуемые выбранными режимами;
- точный 1:1 UI/motion proof;
- новый learner-facing fingerprint, AUTO PASS и owner approval.

Пока общий runtime contract не умеет выразить все шесть активных payloads и exact
макеты, authoring новых сессий запрещён: сначала исправляется общий seam,
затем сессии переписываются последовательно с ordinal 1.

## Находки и предложения

Любой новый класс расхождения исправляется не в одном экране, а в четырёх
местах: family schema → source/shard projection → runtime/mockup parity →
регрессионный gate. Нельзя закрывать finding переименованием family или
ослаблением теста.
