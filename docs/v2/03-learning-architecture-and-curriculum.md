# Phraseman V2: учебная архитектура и пилотный сезон из 32 эпизодов

> **Owner override 2026-08-25:** required-session practice authorится только
> через семь mode-native mechanics; contact counts и progression этого
> документа сохраняются. Действующий контракт и exact owner-макеты:
> [`MODE_NATIVE_AUTHORING_CONTRACT.ru.md`](./MODE_NATIVE_AUTHORING_CONTRACT.ru.md).
> Более широкий catalog ниже не даёт права автоматически назначать family
> готовому generic content.

> Авторский стиль интро, фраз и объяснений не выводится из этой карты.
> Обязательный источник —
> [`LEARNING_CONTENT_STYLE_BIBLE.ru.md`](./LEARNING_CONTENT_STYLE_BIBLE.ru.md);
> правила границ и последовательности —
> [`LESSON_DESIGN_RULES.ru.md`](./LESSON_DESIGN_RULES.ru.md).

> Это pilot can-do curriculum для проверки продукта и педагогической последовательности. Он описывает достижимые разговорные действия от A0 до сильного функционального A1 и отдельных задач начала A2, но не является CEFR-сертификацией и не обещает получение уровня A2 после 32 эпизодов.

Все числовые решения сезона — 32 эпизода, chapter/checkpoint structure, длительность, content dosage, доля голоса, число turns, star-slot/loop design и стартовые cutoffs — имеют claim label `PRODUCT_HYPOTHESIS`. Они привязаны к `HYP-V2-001..005` и `HYP-V2-007` в [реестре гипотез и решений](./07-migration-analytics-testing.md#0-реестр-гипотез-и-числовых-решений) и должны калиброваться по пилоту, а не трактоваться как универсальная норма.

## 1. Цель пилотного сезона

Пилот должен проверить:

- понятна ли пользователю сценарная последовательность заданий;
- приводит ли путь от знакомства с фразой к самостоятельной речи;
- работают ли голосовые задания, повторение и repair strategies;
- мотивируют ли звёзды и ворота, не превращаясь в искусственный grind;
- может ли административный генератор стабильно выпускать модульные эпизоды;
- можно ли масштабировать ту же архитектуру на другие языки и сотни эпизодов.

Сезон состоит из четырёх глав по восемь эпизодов:

1. «Я могу начать разговор».
2. «Моя повседневная жизнь».
3. «Я справляюсь в поездке и общении».
4. «Я говорю самостоятельно».

Обычный эпизод содержит 8–9 activity nodes. Эпизоды 8, 16, 24 и 32 являются checkpoints и содержат по 9 nodes. Итого пилот охватывает около 260 activity nodes.

Ориентир по продолжительности:

- обычный эпизод: 12–18 минут первого прохождения;
- дополнительное delayed review: 4–7 минут;
- checkpoint: 20–25 минут с возможностью проходить его частями.

Контентный лимит обычного эпизода:

- 8–10 новых устойчивых фразовых моделей;
- 12–18 заменяемых слов или смысловых слотов;
- не более двух новых грамматических различий;
- один речевой или звуковой фокус;
- одна итоговая коммуникативная задача.

## 2. Единый учебный цикл

Каждый эпизод следует одному педагогическому циклу:

1. **Encounter — встретить фразу в контексте.** Пользователь видит или слышит выражение внутри понятной сцены.
2. **Notice — заметить смысловое или звуковое различие.** Пользователь различает формы, звуки, время, число или намерение.
3. **Build — восстановить фразу.** Пользователь собирает, дополняет или записывает услышанное выражение.
4. **Speak — произнести и извлечь из памяти.** Сначала с моделью, затем без готового текста.
5. **Transfer — применить в новой ситуации.** Scripted dialogue, branching adventure или Speaking Club mission.
6. **Review — вернуть после задержки.** Материал появляется в следующем эпизоде, через несколько эпизодов и на checkpoint.

Второй обязательный loop не должен повторять тот же набор вопросов. Первый `encounter_build` знакомит и тренирует; второй `near_transfer` использует новые значения слотов, меньшую поддержку и другую transfer-сцену. `near_transfer` может произойти в той же сессии и поэтому не называется delayed retrieval и не доказывает durable mastery. Настоящий D+N probe назначает review scheduler отдельно; ожидание или пропуск delayed review никогда не блокирует немедленное открытие следующего эпизода.

## 3. Педагогические семейства и каноническая модель авторинга

Коды ниже — **педагогические семейства**, то есть описание учебной функции задания в последовательности. Они не являются именами React Native-компонентов, ключами scorer или готовыми шаблонами админки. Каноническое разделение одинаково для curriculum, runtime и Content Studio:

| Уровень | Что означает | Пример |
|---|---|---|
| `family` | Педагогическая роль, используемая при планировании | `quick_spoken_response` |
| `activityTypeKey` / kernel | Реализованная в приложении механика с registry-контрактом | `voice.short_response.v1` |
| `modeTemplate` | Безопасно настраиваемый и версионируемый шаблон из админки поверх kernel | «Ответь по картинке без текста» |
| `ActivityInstance` | Конкретное упражнение с фразами, вариантами и ожидаемыми смыслами | «Скажи, откуда ты» в E1 |
| graph node | Место instance в графе эпизода: порядок, ветвление, обязательность и star slot | `ep01.node06` → `ep01.qr.origin` |

Администратор может создавать новые `modeTemplate` и `ActivityInstance` из зарегистрированных kernels, но не загружает исполняемый JavaScript, произвольный scorer или renderer. Совершенно новая механика сначала реализуется и тестируется в приложении как kernel, после чего становится доступна в каталоге Content Studio.

### 3.1 Библиотека activity families

- **VD — Visual Discovery:** знакомство с выражениями через изображение и контекст.
- **LC — Listen & Choose:** понять реплику и выбрать ситуацию или ответ.
- **SC — Sound Contrast:** различить важные звуки, формы, числа или намерения.
- **SL — Sound/Syllable Lab:** разобрать звук, слог или связку слов; до принятой acoustic calibration это guided practice без acoustic-mastery claim.
- **RP — Repeat & Compare:** повторить модель и получить честную обратную связь.
- **PB — Phrase Builder:** собрать фразу.
- **LB — Listen & Build / Dictation:** восстановить услышанную фразу.
- **CG — Context Gap:** выбрать форму по смыслу ситуации.
- **QR — Quick Spoken Response:** коротко ответить без готового текста.
- **SH — Shadowing:** повторить реплику с естественными паузами и ударением.
- **DS — Describe Scene:** описать изображение или последовательность.
- **MR — Microstory / Radio:** понять короткую аудиоисторию.
- **BA — Branching Adventure:** пройти сценарий с несколькими решениями.
- **SD — Scripted Dialogue:** провести контролируемый диалог.
- **CM — Speaking Club Mission:** выполнить более свободную разговорную миссию.
- **PR — Personalized Review:** вернуть ошибки и материал прошлых эпизодов.
- **SM — Speed Match:** необязательная быстрая тренировка.

Каждый эпизод использует только подходящие режимы. Пользователь не должен проходить все activity types в каждом уроке.

### 3.2 Checkpoint — контракт оценки, а не activity family

Checkpoint — это episode-level assessment contract над обычными activity instances. Он задаёт проверяемые can-do objectives, обязательные смысловые слоты, критические ошибки, допустимые repair routes, evidence requirements и правило прохождения. Отдельного `family: 'checkpoint'`, renderer или scorer у него нет.

Обозначение `CP` в черновой последовательности означает границу применения assessment contract, а не пользовательский экран. В опубликованном graph каждая видимая node обязана ссылаться на конкретный `ActivityInstance` одного из семнадцати семейств выше.

Если checkpoint использует Speaking Club или другой AI-assisted route, для тех же objectives обязательно существует детерминированная non-AI альтернатива: scripted dialogue либо branching scene с заранее заданными репликами, semantic slots и правилами оценки. Отсутствие сети или AI не блокирует core completion; альтернативный маршрут не может притворяться голосовым доказательством, если пользователь отвечал текстом.

### 3.3 Обязательный learning-design contract для генератора

Episode authoring хранит педагогический intent отдельно от renderer и star award. Минимальный контракт:

```ts
import type { V2DelayedProbeRef } from './delayed_probe';

export interface EpisodeLearningDesign {
  primaryOutcomeId: string;
  objectiveIds: string[];
  prerequisiteEdges: Array<{
    from: {
      kind: 'outcome' | 'objective';
      id: string;
      sourceEpisodeId: string;
    };
    toObjectiveId: string;
    requiredState:
      | 'exposed'
      | 'supported_success'
      | 'independent_evidence';
  }>;
  supportPlan: Array<{
    objectiveId: string;
    initialSupport: 'model' | 'full_text' | 'partial_cue' | 'visual_only' | 'none';
    fadeRuleId: string;
    escalationRuleId: string;
  }>;
  independentProbeRef: string;
  delayedProbeRef: V2DelayedProbeRef;
  delayedWindowPolicyId: string;
}
```

`prerequisiteEdges` образуют acyclic outcome/exposure DAG. Валидатор запрещает требовать самостоятельное производство того, что раньше не было хотя бы экспонировано, и запрещает использовать training prompt как `independentProbeRef` или `delayedProbeRef`. `V2DelayedProbeRef` импортируется без переопределения из канонического runtime-контракта документа 06 и pin-ит отдельное hash-free определение: scheduler-owned `probeNodeId`, exact ActivityInstance/template/policies, declared evidence tuples, новый surface/context, целевой construct, допустимую поддержку и accessibility route. Season validator recompute-ит `contentHash`; строковый или mutable-latest probe ref запрещён. Отсутствие валидного delayed probe блокирует durable-mastery claim, но не completion, performance stars или доступ к следующему эпизоду.

Canonical cap `V2_MAX_MANDATORY_LEARNING_RETRIES=2` относится к `HYP-V2-002`: ModeTemplate/генератор не может его увеличить. Technical retries при permission/capture/provider failure бесплатны и cap не расходуют; после двух обязательных learning retries предлагается supported continue или alternate route, а не бесконечная ловушка.

## 4. Completion, near transfer, independent mastery и durable evidence

Нужно разделять четыре состояния. Ни одно из них не выводится из суммы звёзд.

### Episode completed

- пройдены обязательные core nodes;
- сделана попытка capstone;
- восстановлена стартовая доля ключевых смыслов с возможностью исправить ошибку; пилотный cutoff 70% относится к `HYP-V2-003`.

### Near-transfer loop complete

- выполнен второй обязательный loop с новыми значениями слотов или другой сценой;
- поддержка уменьшена относительно `encounter_build` по `fadeRuleId`;
- loop может быть выполнен сразу и поэтому не является delayed evidence;
- завершение loop вместе с performance/access gate может открыть следующий эпизод.

### Independent mastery observed

- на отдельном `independentProbeRef` получено валидное lower-support evidence;
- стартовая гипотеза 80% правильного извлечения относится к `HYP-V2-003`, а не к универсальному mastery cutoff;
- выполнены обязательные смысловые слоты capstone;
- по каждому заявленному construct есть собственный статус; смысловая задача может быть выполнена, даже если акцент отличается от модели;
- число уверенно распознанных голосовых ответов является `HYP-V2-002` и доказывает spoken construct только при валидной voice evidence policy.

### Durable mastery observed

- после реальной задержки D+N материал успешно возвращён через `delayedProbeRef`;
- пользователь применил выражения с новыми значениями слотов;
- capstone или его сокращённый вариант повторно выполнен без критической подсказки;
- assessable window и success policy относятся к exact pinned `HYP-V2-007`: в пилоте durable/DTS evidence допустимо только при фактической задержке D+3…D+7; доставка вне этого окна получает `not_assessed_for_window`, ещё не доставленный/не начатый probe означает `not_observed`, а технически или accessibility-недоступное измерение — `status:'not_assessed'` с reason, но никогда не failure или mastery.

Речь оценивается по понятности, полноте фразы, смысловым слотам и выполнению коммуникативной задачи, а не по сходству с «идеальным нативным акцентом». Плохое качество записи или неуверенное распознавание должно давать статус UNCERTAIN, а не считаться ошибкой пользователя.

Печатный accessibility fallback может завершить смысловую часть задания и заработать performance/access progress по своей policy, но не создаёт spoken evidence. Captioned route не создаёт listening evidence. Для каждого недоступного construct создаётся отдельный `LearningNonAssessment{assessmentStatus:'not_assessed_accessibility'}`, а `ObjectiveLearningState` получает `status:'not_assessed', reason:'accessibility'`, не pass/fail; недоступный микрофон или слуховое задание не должны превращать образовательный путь в тупик.

## 5. Глава 1. «Я могу начать разговор»

Итог главы: познакомиться, рассказать базовое о себе, выразить предпочтение, назвать время и получить простую помощь. Доля голоса постепенно растёт примерно с 30% до 45%.

### Эпизод 1. Hello, I’m…

**Can-do:** поздороваться, назвать себя, страну и язык, завершить знакомство.

**Фразы:** Hi, I’m …; My name is …; I’m from …; I speak …; Nice to meet you; And you?; See you later.

**Грамматика:** I am / you are как фразовые модели, сокращение I’m, личные местоимения без полной таблицы to be.

**Путь:** VD → LC → PB → PB(varied) → RP → QR → QR(varied) → SD.

В E1 восемь gate-eligible star slots сохраняются, но это не восемь новых интерфейсов. Они используют четыре постепенно объяснённые interaction grammar: tap/select, assemble, общий record/compare shell и turn-taking. `SL` допускается только как optional starless guided side node без acoustic mastery claim, пока provider/model/config не имеет принятого calibration receipt. Shadowing вводится позднее, после знакомства с общим voice shell.

**Capstone:** трёхходовое знакомство с новым соседом или коллегой.

**Independent evidence:** минимум три уверенные реплики; пользователь без текста произносит приветствие, имя и происхождение и отвечает на два вопроса.

**Повторение:** E2, E4, E8. **Legacy-кандидаты:** L1–L2.

### Эпизод 2. Who’s this? What’s that?

**Can-do:** представить человека, определить предмет, задать уточняющий вопрос.

**Фразы:** Who’s this?; This is my friend; What’s this?; It’s a key; Is this your bag?; Yes, it is; No, it isn’t.

**Грамматика:** he/she/it, this/that, a/an, вопрос и отрицание to be в ограниченных моделях.

**Путь:** PR(E1) → VD → LC → SC → PB → RP → DS → SD.

**Capstone:** представить двух людей и выяснить, кому принадлежит найденный предмет.

**Independent evidence:** три смысловых слота — человек, предмет, уточняющий вопрос; минимум три уверенные голосовые реплики.

**Повторение:** E3, E5, E8. **Legacy:** L1, L2, L20.

### Эпизод 3. My people, my things

**Can-do:** назвать близких, сказать, что у кого есть, спросить о владении.

**Фразы:** This is my sister; Her name is …; I have a brother; Do you have a car?; I don’t have one; Whose phone is this?; It’s mine/yours.

**Грамматика:** have, do you have, my/your/his/her, mine/yours как полезные chunks.

**Путь:** PR(E2,E1) → VD → LC → PB → CG → RP → QR → SD.

**Capstone:** рассказать по фотографии о двух людях и двух вещах, затем ответить на вопрос.

**Independent evidence:** четыре смысловых факта и минимум четыре голосовые реплики.

**Повторение:** E4, E6, E8. **Legacy:** L7, L15, части L2.

### Эпизод 4. What I like and want

**Can-do:** выразить предпочтение, отрицание, желание и сделать простой выбор.

**Фразы:** I like coffee; I don’t like milk; Do you like tea?; I want some water; I’d like a sandwich; My favorite is …; This one, please.

**Грамматика:** like/want + noun, вопрос с do, like doing только в одной-двух естественных моделях.

**Речевой фокус:** для русскоязычного пилота — различение /w/ и /v/. Для других source locales фокус выбирается профилем языка.

**Путь:** PR → VD → LC → SC → PB → RP → QR → BA.

**Capstone:** выбрать заказ, назвать предпочтение и отказаться от одного варианта.

**Independent evidence:** предпочтение, отрицание, вопрос и выбор; четыре уверенные реплики.

**Повторение:** E5, E7, E8. **Legacy:** L3, L20, ограниченно L22.

### Эпизод 5. My ordinary day

**Can-do:** рассказать о базовом распорядке и спросить о распорядке другого человека.

**Фразы:** I get up at seven; I go to work/school; I usually have lunch at …; I don’t work on Sunday; What time do you start?; Do you work from home?; Then I go home.

**Грамматика:** Present Simple для I/you, do/don’t, место usually, последовательность then.

**Путь:** PR → MR → LC → PB → CG → SL → SH → DS.

**Capstone:** описать четыре этапа своего обычного дня и назвать одно отличие выходного.

**Independent evidence:** пять событий или фактов, минимум пять голосовых ответов.

**Повторение:** E6, E8, E9. **Legacy:** L3–L5, лексические chunks из L16.

### Эпизод 6. When and how often?

**Can-do:** назвать время, день и частоту; договориться о подходящем времени.

**Фразы:** What time does it start?; At seven thirty; On Monday; In the morning; Every day; Twice a week; Are you free at six?

**Грамматика:** at/on/in для времени, how often, повторение Present Simple.

**Звуковой фокус:** thirteen/thirty, fourteen/forty, ритм времени и номера.

**Путь:** PR → LC → SC → PB → CG → RP → LB → SD.

**Capstone:** подобрать время встречи, отвергнуть один вариант и подтвердить другой.

**Independent evidence:** правильно передать четыре временные детали и задать один вопрос.

**Повторение:** E7, E8, E10. **Legacy:** L6, L8, части L3–L5.

### Эпизод 7. Can you help me?

**Can-do:** попросить помощи, спросить дорогу и понять простое направление.

**Фразы:** Can you help me?; Where is the station?; Go straight; Turn left/right; It’s next to the bank; Can I use this?; Thank you for your help.

**Грамматика:** can/can’t, императив, базовые предлоги места как chunks.

**Звуковой фокус:** различение can/can’t, особенно конечного согласного.

**Путь:** PR → VD → LC → SC → PB → RP → QR → BA.

**Capstone:** запросить маршрут и правильно пройти две развилки на карте.

**Independent evidence:** просьба, вопрос, подтверждение двух инструкций и благодарность; минимум пять голосовых реплик.

**Повторение:** E8, E9, E11. **Legacy:** L10, L18, L19.

### Эпизод 8. Checkpoint: First day here

**Сценарий:** пользователь приезжает в новое место, знакомится с хозяином, выбирает еду, уточняет время и находит нужную комнату или остановку.

**Путь из девяти nodes:**

1. PR по ошибкам E1–E7.
2. LC — четыре сцены первого дня.
3. SM — быстрые базовые фразы, необязательно на время.
4. PB — собрать ключевые вопросы.
5. LB — имя, время и место из аудио.
6. RP — две фразы с повторением.
7. QR — четыре коротких ответа.
8. BA — маршрут и заказ.
9. CM — разговор с принимающей стороной.

**Independent evidence:** приветствие, личная информация, предпочтение или заказ, время, маршрут и завершение разговора; около семи валидных voice turns.

**Повторение:** E9, E12, E16. **Legacy:** выборочно L1–L10 и структура L32. Старый экзамен после L8 можно использовать как источник, но не переносить целиком без аудита.

## 6. Глава 2. «Моя повседневная жизнь»

Итог главы: описывать дом и текущие действия, делать покупки, рассказывать о прошедшем дне, объяснять самочувствие и договариваться о планах.

### Эпизод 9. My home and neighborhood

**Can-do:** описать комнату и район, спросить, есть ли нужное место или предмет.

**Фразы:** I live in a small apartment; There is a table near the window; There are two shops nearby; Is there a pharmacy here?; There isn’t a lift; It’s under/next to/opposite …

**Грамматика:** there is/are, is there, предлоги места, a/some.

**Путь:** PR → VD → LC → PB → CG → RP → DS → BA.

**Capstone:** описать жильё по изображению и помочь гостю найти три объекта.

**Independent evidence:** пять точных фактов о наличии или расположении и один вопрос; пять voice turns.

**Повторение:** E10, E12, E16. **Legacy:** L9, L19, L20.

### Эпизод 10. At the shop

**Can-do:** спросить цену, количество и наличие, купить необходимое.

**Фразы:** How much is this?; How much are these?; Do you have any water?; I need some batteries; That’s too expensive; I’ll take it; By card, please.

**Грамматика:** some/any, единственное и множественное число, how much/how many как сценарные модели.

**Путь:** PR → VD → LC → SC → PB → CG → RP → SD.

**Capstone:** купить два товара, уточнить наличие, цену и способ оплаты.

**Independent evidence:** предмет, количество, цена и завершение покупки; минимум пять голосовых реплик.

**Повторение:** E11, E13, E16. **Legacy:** L6, L20, L21.

### Эпизод 11. What’s happening now?

**Can-do:** сказать, чем люди заняты сейчас, и объяснить текущую задержку или договорённость.

**Фразы:** I’m waiting for the bus; What are you doing?; She’s working now; We’re meeting at six; I’m coming; I’m not ready yet.

**Грамматика:** Present Continuous и ограниченное сравнение с обычным действием.

**Звуковой фокус:** окончание -ing, сокращения I’m/we’re/she’s.

**Путь:** PR → MR → LC → PB → CG → SL → QR → SD.

**Capstone:** короткий звонок — сказать, где пользователь, что делает и когда придёт.

**Independent evidence:** текущее действие, местоположение, договорённость и отрицание; пять voice turns.

**Повторение:** E12, E14, E16. **Legacy:** L17, части L8.

### Эпизод 12. Yesterday: where and what

**Can-do:** сказать, где был вчера и что делал; задать простой вопрос о прошлом.

**Фразы:** I was at home; We were at work; It was busy; I worked until six; Did you watch the game?; I didn’t go out.

**Грамматика:** was/were, регулярный Past Simple, did/didn’t как модели.

**Звуковой фокус:** различение окончаний -ed на слух без требования идеальной имитации.

**Путь:** PR → VD → LC → SC → PB → RP → MR → SD.

**Capstone:** рассказать, где был пользователь, назвать три действия и спросить собеседника об одном действии.

**Independent evidence:** пять смысловых слотов и минимум пять голосовых реплик.

**Повторение:** E13, E15, E16. **Legacy:** L11.

### Эпизод 13. My weekend story

**Can-do:** рассказать короткую последовательную историю с частотными неправильными глаголами.

**Фразы:** I went to …; I saw …; We had lunch; Then we came home; After that …; Finally …; How was your weekend?

**Грамматика:** максимум восемь высокочастотных неправильных глаголов; first/then/after that/finally.

**Путь:** PR → MR → LC → PB → LB → RP → SH → QR → SD.

**Capstone:** рассказ из пяти событий и один ответ на уточняющий вопрос.

**Independent evidence:** сохранён правильный порядок, использованы минимум три временные связки и пять событий.

**Повторение:** E14, E16, E17. **Legacy:** L12, лексические элементы L16.

### Эпизод 14. I don’t feel well

**Can-do:** описать простой симптом, попросить помощь и понять базовый совет.

**Фразы:** I have a headache; My back hurts; I feel sick/tired; You should rest; You shouldn’t drive; Do you have anything for …?; I need a doctor.

**Грамматика:** have для симптомов, should/shouldn’t, притяжательные формы частей тела.

**Путь:** PR → VD → LC → PB → CG → RP → QR → BA.

**Capstone:** объяснить симптом в аптеке, ответить на вопрос и выбрать подходящий совет.

**Independent evidence:** симптом, степень или контекст, просьба и ответ на совет; минимум шесть голосовых реплик.

**Повторение:** E15, E16, E18. **Legacy:** L7, L10, выборочно L21 и L28.

### Эпизод 15. Let’s make a plan

**Can-do:** пригласить, принять или вежливо отклонить предложение, согласовать будущее действие.

**Фразы:** Are you free on Saturday?; Would you like to come?; Let’s meet at …; I’m going to visit …; Sounds good; I can’t make it; Maybe another day; I’ll call you later.

**Грамматика:** going to для намерения; Present Continuous для договорённости; will только как частотный спонтанный chunk.

**Путь:** PR → LC → PB → CG → RP → SH → QR → CM.

**Capstone:** договориться о встрече, один раз изменить время и подтвердить итог.

**Independent evidence:** приглашение, намерение, реакция, время и подтверждение; минимум шесть voice turns.

**Повторение:** E16, E17, E19. **Legacy:** L10, L13, L8.

### Эпизод 16. Checkpoint: Weekend with a friend

**Сценарий:** приехать к другу, понять описание дома, купить продукты, объяснить задержку, рассказать о вчерашнем дне, справиться с недомоганием и решить план на завтра.

**Путь:** PR → LC → LB → PB → CG → RP → QR → BA → CM.

**Independent evidence:**

- найти нужное место в доме;
- купить необходимые товары;
- сказать, что происходит сейчас;
- рассказать минимум три прошлых события;
- объяснить симптом;
- согласовать следующий план.

Ориентир: восемь уверенных voice turns и шесть выполненных смысловых задач.

**Повторение:** E17, E20, E24. **Legacy:** выборочно L9–L17 и структура L32. Старый экзамен после L18 не должен автоматически становиться checkpoint E16.

## 7. Глава 3. «Я справляюсь в поездке и общении»

Итог главы: самостоятельно решать частые транспортные, гостиничные, ресторанные и социальные ситуации.

### Эпизод 17. At the station or airport

**Can-do:** купить билет, уточнить время, путь и пересадку.

**Фразы:** A return ticket to …; What time does it leave?; Which platform is it?; How long does it take?; Is it direct?; Where do I change?; Could you say the gate again?

**Грамматика:** вопросы what time/which/how long/where, расписание в Present Simple.

**Звуковой фокус:** числа, время, платформы и объявления.

**Путь:** PR → VD → LC → SC → PB → LB → RP → QR → SD.

**Capstone:** купить правильный билет и проверить три критические детали.

**Independent evidence:** направление, тип билета, время, платформа или пересадка, уточнение; минимум шесть voice turns.

**Повторение:** E18, E20, E24. **Legacy:** L6, L8, L10, L16.

### Эпизод 18. Checking in

**Can-do:** пройти регистрацию, назвать данные брони, спросить об услугах и сообщить проблему.

**Фразы:** I have a reservation; It’s under Ivan Petrov; Could you spell that?; Is breakfast included?; What time is checkout?; There’s a problem with the room; The Wi-Fi doesn’t work; Could I have another key?

**Грамматика:** вежливое could, there is, формы is included только как готовые сервисные chunks.

**Путь:** PR → VD → LC → PB → SL → RP → QR → BA.

**Capstone:** check-in, произнесение или spelling имени, вопрос об услуге и решение одной проблемы.

**Independent evidence:** пять смысловых слотов и минимум шесть голосовых реплик.

**Повторение:** E19, E21, E24. **Legacy:** L9, L10, L16; из L23 только естественные фиксированные выражения.

### Эпизод 19. A meal that works for me

**Can-do:** заказать еду, спросить ингредиенты, сообщить аллергию или ограничение.

**Фразы:** I’d like …; Does this have nuts?; I’m allergic to …; Without cheese, please; Could I get water?; That’s all, thank you; The bill, please.

**Грамматика:** does this have, some/any, without + noun, статьи в готовых моделях.

**Путь:** PR → VD → LC → PB → CG → RP → SH → SD.

**Capstone:** безопасно сделать заказ с изменением блюда и запросить счёт.

**Independent evidence:** заказ, ингредиент, ограничение, модификация и завершение; минимум шесть voice turns.

**Повторение:** E20, E22, E24. **Legacy:** L10, L20, L21; help yourself из L28 допустимо только как receptive chunk.

### Эпизод 20. Which one is better?

**Can-do:** сравнить два варианта и объяснить выбор.

**Фразы:** This one is cheaper; The other hotel is closer; It’s more comfortable; It isn’t as quiet; I prefer this one because …; Which one is better?

**Грамматика:** частотные comparative forms, more, not as, because.

**Путь:** PR → VD → LC → PB → CG → RP → DS → BA.

**Capstone:** сравнить два отеля, товара или маршрута по трём параметрам и выбрать один.

**Independent evidence:** три сравнения, предпочтение и причина; минимум шесть голосовых реплик.

**Повторение:** E21, E23, E24. **Legacy:** L14, части L6.

### Эпизод 21. Have you ever…?

**Can-do:** спросить об опыте и добавить конкретную прошлую деталь.

**Фразы:** Have you ever been to …?; Have you ever tried …?; Yes, I have; No, never; I’ve been there twice; I went there last year; What was it like?

**Грамматика:** Present Perfect только для ever/never/been/tried/seen; Past Simple для законченной детали.

**Путь:** PR → MR → LC → PB → CG → RP → QR → SD.

**Capstone:** обменяться опытом и задать два follow-up вопроса.

**Independent evidence:** вопрос об опыте, ответ, одна законченная деталь и follow-up; минимум семь voice turns.

**Повторение:** E22, E24, E25. **Legacy:** ограниченно L24 и L12.

### Эпизод 22. Rules and permission

**Can-do:** понять правило, спросить разрешение, объяснить необходимость и отсутствие необходимости.

**Фразы:** You must show your ticket; You mustn’t smoke here; You have to check in first; You don’t have to print it; Can I take photos?; Please don’t touch this.

**Грамматика:** must/mustn’t, have to/don’t have to, can, императив. Mustn’t и don’t have to не должны смешиваться.

**Путь:** PR → VD → LC → SC → PB → CG → RP → BA.

**Capstone:** пройти место с четырьмя правилами и запросить разрешение на одно действие.

**Independent evidence:** правило, запрет, необходимость, отсутствие необходимости и разрешение.

**Повторение:** E23, E24, E26. **Legacy:** L10, L18.

### Эпизод 23. Keep the conversation going

**Can-do:** выразить простое мнение, согласиться или возразить, задать follow-up и восстановить разговор после непонимания.

**Фразы:** I think …; I agree; I’m not sure about that; Maybe, but …; Really? Why?; What do you mean?; Could you say that again?; So you mean …?

**Грамматика:** because/but/so, echo questions, вопросы для поддержания разговора.

**Путь:** PR → LC → PB → SH → RP → QR → SD → CM.

**Capstone:** короткое обсуждение предпочтения с минимум одним follow-up и одной repair strategy.

**Independent evidence:** мнение, причина, реакция, уточнение и вежливое согласие или несогласие; около восьми voice turns.

**Повторение:** E24, E25, E27. **Legacy:** L3–L6, отдельные модели L22.

### Эпизод 24. Checkpoint: Travel day goes wrong

**Сценарий:** купить билет, понять изменённую платформу, решить проблему с бронью, безопасно заказать еду, сравнить два решения, понять правило и объяснить итог спутнику.

**Путь:** PR → LC → LB → PB → RP → QR → DS → BA → CM.

**Independent evidence:** семь коммуникативных задач и примерно девять уверенных voice turns. Ошибка в критической детали, например аллергии или платформе, вызывает repair node, а не полный сброс checkpoint.

**Повторение:** E25, E28, E32. **Legacy:** выборочные фрагменты L13–L24 и структура L32. Старый экзамен после L28 слишком продвинут для прямого переноса.

## 8. Глава 4. «Я говорю самостоятельно»

Итог главы: описывать работу или учёбу, рассказывать об инциденте, решать сервисную проблему, давать совет, передавать сообщение и проводить короткую самостоятельную беседу.

### Эпизод 25. My work or study day

**Can-do:** описать обязанности, текущую задачу, срок и попросить помощь.

**Фразы:** I usually start at nine; I’m working on …; I need to finish this today; I have a meeting/class at …; Can you send me …?; I’m not ready yet; I’m done.

**Грамматика:** Present Simple против Present Continuous, need to, ограниченно like doing.

**Путь:** PR → VD → LC → PB → CG → RP → QR → SD.

**Capstone:** 30-секундный stand-up — обычная роль, текущая задача, срок и одна просьба.

**Independent evidence:** четыре смысловых блока и минимум семь voice turns.

**Повторение:** E26, E28, E32. **Legacy:** L3–L5, L17, ограниченно L22.

### Эпизод 26. What happened while…?

**Can-do:** рассказать простой инцидент, разделив фон и событие.

**Фразы:** I was driving when …; While I was waiting, …; Suddenly …; Then …; So I called …; Are you okay?

**Грамматика:** ограниченная конструкция Past Continuous + Past Simple, when/while.

**Путь:** PR → MR → LC → PB → CG → RP → SH → DS → SD.

**Capstone:** восстановить и рассказать инцидент по четырём кадрам.

**Independent evidence:** фон, событие, последовательность и результат; минимум восемь voice turns.

**Повторение:** E27, E29, E32. **Legacy:** L11, L12, L25.

### Эпизод 27. Solve a service problem

**Can-do:** объяснить проблему, назвать доказательство, попросить решение и подтвердить итог.

**Фразы:** I ordered …; It arrived broken; It doesn’t work; I was charged twice; My order number is …; I need a refund/replacement; Could you check that?; That works for me.

**Грамматика:** прошлое действие и текущая проблема; вежливая просьба; was charged и they told me только как сервисные chunks.

**Путь:** PR → VD → LC → PB → LB → RP → QR → BA → CM.

**Capstone:** звонок в поддержку с уточнением номера заказа и согласованием решения.

**Independent evidence:** заказ, идентификатор, проблема, доказательство, просьба и согласованное решение; минимум восемь voice turns.

**Повторение:** E28, E30, E32. **Legacy:** L10, L18; строго ограниченные chunks из L23, L27 и L31.

### Эпизод 28. If this happens…

**Can-do:** предложить действие на случай проблемы и дать простой совет.

**Фразы:** If the train is late, I’ll call you; If it rains, we’ll take a taxi; When I arrive, I’ll text you; You should …; You could …; What should I do?

**Грамматика:** First Conditional if + present, will; различие if/when; повторение should/could.

**Путь:** PR → LC → PB → CG → RP → QR → DS → BA.

**Capstone:** составить запасной план для задержки, плохой погоды или закрытого места.

**Independent evidence:** условие, действие, совет и причина; минимум восемь voice turns.

**Повторение:** E29, E31, E32. **Legacy:** L10, L13, L26.

### Эпизод 29. The person or place I mean

**Can-do:** описать человека, место или предмет, когда пользователь не знает его названия.

**Фразы:** It’s a place where …; A person who …; The thing that …; The one next to …; It has …; It looks …; It’s bigger/quieter than …

**Грамматика:** только базовые relative chunks who/that/where; повторение there/have, описаний и сравнений.

**Путь:** PR → VD → LC → PB → CG → RP → QR → DS.

**Capstone:** описать скрытое изображение так, чтобы собеседник выбрал правильный вариант.

**Independent evidence:** категория, две характеристики, расположение и одна relative phrase; минимум восемь voice turns.

**Повторение:** E30, E32, post-season D+7. **Legacy:** L14, L15, L19, ограниченно L30.

### Эпизод 30. Messages and what people said

**Can-do:** понять короткое голосовое сообщение и передать главное другому человеку.

**Фразы:** Can you tell Anna …?; She said she’s late; He asked me to call; The message says …; I didn’t catch the number; Could you repeat that?; I’ll let them know.

**Грамматика:** say/tell/ask как функциональные модели; никакой обязательной системы tense backshift.

**Путь:** PR → LC → LB → PB → CG → RP → SH → QR → CM.

**Capstone:** получить два сообщения, уточнить критическую деталь и передать адресату отправителя, действие и время.

**Independent evidence:** пять информационных слотов и минимум восемь voice turns.

**Повторение:** E31, E32, post-season D+7. **Legacy:** ограниченно L27, L16 и L31.

### Эпизод 31. My story and next step

**Can-do:** провести личную мини-презентацию на 60–90 секунд и ответить на два вопроса.

**Структура:** откуда пользователь; что обычно делает; один прошлый опыт; чем занят сейчас; будущая цель; почему она важна.

**Фразы:** I grew up/lived in …; I used to … как optional stretch; Now I …; I’ve …; I’m working on …; I’m going to …; I’d like to … because …

**Грамматика:** интеграция времён; used to не входит в обязательный gate.

**Путь:** PR → MR → LC → PB → CG → RP → SH → DS → CM.

**Capstone:** 60–90 секунд речи плюс два follow-up вопроса.

**Independent evidence:** шесть временных или смысловых опор, понятная структура и успешные ответы на два вопроса. Оцениваются паузы и понятность, но не «нативность».

**Повторение:** E32, post-season D+3 и D+7. **Legacy:** L7, L13, L16, L22, L24; L29 только как необязательный stretch.

### Эпизод 32. Final Checkpoint: One independent day

**Многоэтапная миссия:**

1. Познакомиться с принимающей стороной.
2. Объяснить план и расписание.
3. Найти маршрут и купить билет.
4. Заселиться или сделать заказ.
5. Решить возникшую проблему.
6. Рассказать, что произошло.
7. Составить новый план.
8. Передать сообщение.
9. Коротко рассказать о себе и следующей цели.

**Путь из девяти видимых nodes:** PR → LC → LB → PB → QR → RP → BA → SD → CM. Checkpoint contract охватывает assessment nodes и их детерминированные alternate routes.

**Independent evidence:**

- выполнены минимум семь из девяти смысловых задач;
- нет неустранённой критической ошибки в маршруте, оплате, аллергии или правилах;
- получено примерно десять уверенных голосовых ответов;
- пользователь применил хотя бы одну repair strategy;
- после checkpoint назначаются post-season reviews D+1, D+7 и D+21; это cadence доставки, а не три evidence window, и они не блокируют доступ к завершённому сезону. Durable/DTS evidence создаёт только попытка, фактически попавшая в exact pinned D+3…D+7 window `HYP-V2-007`; остальные доставки остаются learning/review с `not_assessed_for_window`.

Результат сезона можно называть «готовностью выполнять выбранные функциональные задачи A1 и начала A2», но не «пользователь получил A2».

## 9. Матрица legacy → V2

Обозначение Lxx означает источник фраз, теории или упражнений, а не эквивалент прогресса.

| Legacy | Использование в V2 |
|---|---|
| L1 To Be | E1–E2, основной материал |
| L2 To Be questions/negatives | E1–E3, только сценарные формы |
| L3–L5 Present Simple | E4–E6, E23, E25 |
| L6 Wh-questions | E2, E6–E7, E17 |
| L7 Have | E3, E14, E29 |
| L8 Time prepositions | E5–E6, E15, E17 |
| L9 There is/are | E9, E18, E29 |
| L10 Modals | E7, E14–E15, E18, E22, E28 |
| L11–L12 Past Simple | E12–E13, E21, E26–E27 |
| L13 Future | E15, E17, E28, E31 |
| L14 Comparisons | E20, E29 |
| L15 Possessives | E3, E14, E29 |
| L16 Phrasal verbs | Распределить как лексику: get up, go out, come back, check in, look for |
| L17 Continuous | E11, E15, E25 |
| L18 Imperative | E7, E14, E22, E28 |
| L19 Place prepositions | E7, E9, E17, E29 |
| L20 Articles | Встроить в E2, E4, E9–E10, E19; не делать отдельным барьером |
| L21 Indefinite pronouns | Только частотные something/anything/someone в E10, E14, E18–E19, E27 |
| L22 Gerund | Like doing в E4, E25, E31; лёгкое использование |
| L23 Passive | Только chunks is included и was charged; не продуктивная тема сезона |
| L24 Present Perfect | Ограниченно E21 и E31 |
| L25 Past Continuous | E26 |
| L26 Conditionals | E28, только First Conditional |
| L27 Reported Speech | E30 как said/told/asked; без сложного backshift |
| L28 Reflexives | Необязательные chunks help yourself и by myself |
| L29 Used to | Optional stretch E31, не gate |
| L30 Relative Clauses | Ограниченное функциональное применение E29 |
| L31 Complex Object | Только естественные chunks He asked me to… и I need you to…; не отдельная тема |
| L32 Final Review | Источник механик checkpoints, но не готовая проверка V2 |

Старые границы экзаменов 8/18/28/32 не совпадают с новой структурой 8/16/24/32. Legacy-прогресс должен сохраняться отдельно, а перенос материала выполняться через адаптеры и содержательный аудит.

## 10. Product implications

- Speaking Club является transfer/capstone-слоем, а не местом первичного объяснения. В начале преобладают scripted dialogues и branching adventures; свободные миссии учащаются по мере роста словаря.
- Personal Plan должен стать планировщиком повторений над теми же activity types, а не отдельным параллельным курсом.
- Checkpoints не вводят новую лексику или грамматику.
- Текущие восемь Speaking Club missions можно использовать только как сырьё после проверки can-do, целевых фраз и целей.
- Для каждого source locale нужен собственный sound-focus профиль. Нельзя навсегда зашивать русские трудности /w-v/ или /θ-s/ в общий английский курс.
- Купленные access stars не должны подменять earned performance, `LearningEvidence`, голосовое доказательство или результат checkpoint.
- Продвинутые legacy-темы L23, L27, L29–L31 в пилоте используются только как естественные разговорные chunks либо остаются материалом следующего сезона.
- Критические ошибки в маршруте, аллергии, оплате или правилах запускают короткий repair flow, а не обнуляют весь эпизод.
- Генератор должен хранить scenario, can-do, phrase frames, semantic slots, activity instances, graph nodes, support-fading plan, prerequisite outcome/exposure DAG, independent/delayed probe refs, review links, capstone contract и evidence/mastery policies как отдельные валидируемые поля.
- Content Studio создаёт mode templates только поверх зарегистрированных `activityTypeKey`/kernels, затем создаёт из них конкретные упражнения и размещает их в episode graph. `family`, kernel, template, instance и graph node нельзя объединять в одно поле «тип режима».
- Draft season/episode остаются редактируемыми authoring-моделями без `contentReleaseId`; опубликованный season ссылается только на immutable template versions, translation units и проверенный `lesson-bundle.v2` внутри существующего lesson surface.

## 11. Вывод

Сильная сторона V2 должна строиться на связке:

**естественная фраза в контексте → различение → восстановление → голосовое извлечение → repair strategy → практический capstone → delayed review.**

32 эпизода достаточно, чтобы проверить эту систему, сравнить удержание и качество обучения с legacy-путём и принять решение о масштабировании. Это полноценный пилот продукта, но не сокращённая замена сотням часов, требуемым для формального достижения CEFR-уровня.
