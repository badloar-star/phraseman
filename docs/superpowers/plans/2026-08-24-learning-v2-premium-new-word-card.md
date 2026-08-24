# Learning V2 Premium New Word Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not delegate or create a worktree unless the owner explicitly authorizes that exact action.

**Goal:** Добавить во все 32 урока Learning V2 обязательную премиальную карточку первого знакомства для каждого явно нового слова: поверх уже смонтированного, но полностью неактивного первого задания, с транскрипцией, locale-native значениями и вручную написанными живыми описаниями с юмором для всех активных локалей, exact-word audio, иконкой сохранения и утверждёнными motion A/B.

**Architecture:** Источник новой лексики остаётся единственным источником точного значения, а отдельный ручной card-editorial registry хранит произношение и locale-native юмористические microcopy для полного актуального набора локалей без изменения locked session source. Проекция package добавляет обратносуместимое optional-поле `newWordEncounter` только к auxiliary-записи первого standalone `recognize`-контакта каждого нового слова. В поле лежат стабильный lexical id, транскрипция, живые описания всех активных локалей, существующий savable payload и детерминированный motion variant. Direct runtime после интро собирает очередь этих записей, рендерит одну blocking overlay-карточку за другой, держит practice inert и лишь после последней `Продолжить` переводит run в `practice`. Audio берётся из уже выпущенного full-phrase файла recognize-контакта, где target — ровно одно слово; новый TTS-контур не создаётся.

**Tech Stack:** React Native + Expo Router, TypeScript, React Native Reanimated, `expo-audio`, существующие Learning V2 release children/audio preload, custom flashcard store, Jest + Testing Library, focused `tsx` contract gates.

**Approved spec:** [`docs/superpowers/specs/2026-08-24-learning-v2-premium-new-word-card-design.md`](../specs/2026-08-24-learning-v2-premium-new-word-card-design.md)

---

## Ограничения перед реализацией

- [ ] Перед первым изменением перечитать `docs/v2/СТАРТ В2.md`, выполнить `npm run learning-v2:lesson1-authoring-preflight` и зафиксировать статус. Ожидаемый текущий baseline: `LOCKED 1-10`, `CURRENT 11 DRAFT`, `FORBIDDEN 12-56`.
- [ ] Не менять learner-facing source, интро, задания, дистракторы и fingerprints закрытых сессий 1–10. Это системная проекция поверх уже утверждённого word-first source.
- [ ] Не запускать TTS, deploy, publish, release, Firebase writes или проектный OpenAI API.
- [ ] Не трогать legacy Learning V2 screen, пока прямой production-маршрут `runtimeMode=direct_v1` не закрыт тестами. После GREEN добавить только совместимый no-op fallback, если он реально нужен.
- [ ] Любой Jest, `tsc` или build запускать только через общий semaphore `.claude/semaphore/slot.sh`; focused `tsx` gates можно запускать напрямую.

## Task 1: RED-контракт encounter payload и pronunciation registry

**Files:**

- Create: `modules/learning-v2/content/source/learning_v2_new_word_card_editorial_v1.ts`
- Create: `tests/learning_v2_new_word_encounter_projection_v1.test.ts`
- Modify: `modules/learning-v2/runtime/course_session_client_children_v1.ts`
- Test: `tests/learning_v2_course_session_client_children_v1.test.ts`

- [ ] **Step 1: Написать падающий тест на learner-safe encounter payload.**

Тест строит реальный shard сессии 1 и требует, чтобы auxiliary entry первого `recognize`-контакта содержала только разрешённые поля:

```ts
expect(entry.newWordEncounter).toMatchObject({
  lexicalItemId: "l1-s1-i",
  transcription: "/aɪ/",
  motionVariant: "lesson_hero_b",
  presentation: "blocking_task_overlay",
  dismissal: "continue_only",
  saveControl: "bookmark_icon",
});
expect(entry.newWordEncounter?.save.targetText).toBe("I");
expect(
  Object.keys(entry.newWordEncounter?.playfulMeaningByLocale ?? {}),
).toEqual(["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"]);
expect(entry.newWordEncounter?.playfulMeaningByLocale.ru).not.toMatch(
  /^(?:вс[ёе] сделано|так описывают|это слово означает|так говорят, когда)/iu,
);
expect(Object.keys(entry.newWordEncounter?.save.meaningByLocale ?? {})).toEqual(
  ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
);
expect(JSON.stringify(entry.newWordEncounter)).not.toContain("I am");
```

- [ ] **Step 2: Запустить focused test и подтвердить RED.**

```powershell
bash .claude/semaphore/slot.sh acquire "jest new-word encounter projection"
try { npx jest tests/learning_v2_new_word_encounter_projection_v1.test.ts --runInBand } finally { bash .claude/semaphore/slot.sh release }
```

Ожидание: FAIL — `newWordEncounter` ещё отсутствует.

- [ ] **Step 3: Ввести точный additive type без ослабления старого парсера.**

В `course_session_client_children_v1.ts` добавить:

```ts
export type LearningV2CourseSessionNewWordEncounterV1 = Readonly<{
  lexicalItemId: string;
  transcription: string;
  playfulMeaningByLocale: LearningV2CourseSessionLocalizedTextV1;
  motionVariant: "lesson_hero_b" | "premium_a";
  presentation: "blocking_task_overlay";
  dismissal: "continue_only";
  saveControl: "bookmark_icon";
  orderWithinSession: number;
  save: LearningV2CourseSessionSavablePhraseV1;
}>;
```

`LearningV2CourseSessionAuxiliaryEntryV1` получает optional `newWordEncounter`. Старое encoded body без поля обязано сохранять прежний fingerprint; новый parser принимает поле только при полном exact shape и пересчитывает fingerprint с ним. Никаких `as any` в parser/materializer.

- [ ] **Step 4: Создать ручной card-editorial registry.**

API registry:

```ts
export function learningV2NewWordCardEditorialV1(
  input: Readonly<{
    targetLanguage: string;
    lexicalItemId: string;
    targetText: string;
  }>,
): Readonly<{
  transcription: string;
  playfulMeaningByLocale: LearningV2CourseSessionLocalizedTextV1;
}> | null;
```

Правила: ключ включает target language + stable lexical id; transcription и строки всех активных локалей хранятся вручную, не выводятся из латиницы, русского fallback или общей текстовой формулы. Каждая строка создаёт маленький запоминающийся образ с лёгким уместным юмором и сохраняет точное значение. Запрещены «Всё сделано. Можно начинать», «Так описывают человека…», «Это слово означает…», «Так говорят, когда…» и любые одинаковые рамки с подстановкой слова. Для locked английских слов урока 1 registry заполняется без изменения session source. Отсутствие записи для нового слова — `HOLD`, а не rule-based approximation.

- [ ] **Step 5: Добавить parser compatibility test.**

Один fixture с прежним auxiliary v1 JSON обязан читаться с прежним fingerprint и без encounter; новый fixture — читаться с encounter. Extra/partial fields обязаны падать.

- [ ] **Step 6: Запустить focused tests до GREEN.**

```powershell
bash .claude/semaphore/slot.sh acquire "jest auxiliary encounter contract"
try { npx jest tests/learning_v2_course_session_client_children_v1.test.ts tests/learning_v2_new_word_encounter_projection_v1.test.ts --runInBand } finally { bash .claude/semaphore/slot.sh release }
```

- [ ] **Step 7: Commit.**

```bash
git add modules/learning-v2/content/source/learning_v2_new_word_card_editorial_v1.ts modules/learning-v2/runtime/course_session_client_children_v1.ts tests/learning_v2_course_session_client_children_v1.test.ts tests/learning_v2_new_word_encounter_projection_v1.test.ts
git commit -m "feat(learning-v2): define new word encounter payload"
```

Если `.git/index.lock` занят другой сессией, не удалять его: сохранить файлы unstaged и продолжить только после безопасного освобождения lock.

## Task 2: GREEN-проекция каждого нового слова без изменения authored source

**Files:**

- Modify: `modules/learning-v2/content/source/session_package_from_shard_v1.ts`
- Modify: `modules/learning-v2/runtime/course_session_device_run_v1.ts`
- Modify: `tests/learning_v2_new_word_encounter_projection_v1.test.ts`
- Create: `tests/learning_v2_new_word_encounter_curriculum_gate.ts`

- [ ] **Step 1: Расширить RED на порядок и запреты.**

Проверить:

- encounter создаётся ровно один раз на каждый unique vocabulary item;
- очередь повторяет curriculum order;
- `voice`, `recall`, `checkpoint` и сессия с `newVocabularyExceptionReason` дают пустую очередь;
- `lesson_hero_b` получает только vocabulary index 0 в session 1 каждого lesson; остальные — `premium_a`;
- нет image/art/reward/mastery полей;
- encounter стоит перед первым practice interaction и ссылается на его `interactionId` как audio source anchor;
- exact target — одно слово/chunk из standalone vocabulary, а не полная фраза.

- [ ] **Step 2: Подтвердить RED.**

```powershell
npx tsx tests/learning_v2_new_word_encounter_curriculum_gate.ts
```

Ожидание: FAIL — projection ещё не материализует очередь.

- [ ] **Step 3: Материализовать encounter только на recognize entries.**

В `buildSessionChildBodiesFromShard` использовать уже существующие `inferLesson1WordFirstVocabularyCountV1` и choreography. Для каждого vocabulary index взять его первый standalone recognize-card, meaning из `contentItem.learnerMeanings`, stable lexical id из точного source intent ref и pronunciation registry. В auxiliary entry добавить:

```ts
newWordEncounter: {
  lexicalItemId,
  transcription,
  playfulMeaningByLocale,
  motionVariant:
    shard.requiredSessionOrdinal === 1 && vocabularyIndex === 0
      ? "lesson_hero_b"
      : "premium_a",
  presentation: "blocking_task_overlay",
  dismissal: "continue_only",
  saveControl: "bookmark_icon",
  orderWithinSession: vocabularyIndex + 1,
  save: materializeLearningV2CourseSessionSavablePhraseV1({
    targetLanguage: shard.targetLanguage,
    targetText: card.contentItem.target.text,
    meaningByLocale,
  }),
}
```

Если editorial entry отсутствует, projection бросает конкретную ошибку `learning_v2_new_word_card_editorial_missing:<language>:<lexicalItemId>`. Не использовать `getTranscription()` или шаблонный генератор как fallback: первый English-only и rule-based, второй прямо запрещён owner-контрактом.

- [ ] **Step 4: Добавить opaque runtime getter.**

В `course_session_device_run_v1.ts` добавить `getLearningV2CourseSessionNewWordEncountersV1(run)`, который возвращает frozen ordered entries из канонически разобранного auxiliary child. UI не должен парсить `intentId` или угадывать новое слово по повтору текста.

- [ ] **Step 5: Запустить projection/curriculum gates.**

```powershell
npx tsx tests/learning_v2_new_word_encounter_curriculum_gate.ts
bash .claude/semaphore/slot.sh acquire "jest new-word package projection"
try { npx jest tests/learning_v2_new_word_encounter_projection_v1.test.ts tests/learning_v2_course_session_device_run_v1.test.ts --runInBand } finally { bash .claude/semaphore/slot.sh release }
```

- [ ] **Step 6: Commit.**

```bash
git add modules/learning-v2/content/source/session_package_from_shard_v1.ts modules/learning-v2/runtime/course_session_device_run_v1.ts tests/learning_v2_new_word_encounter_projection_v1.test.ts tests/learning_v2_new_word_encounter_curriculum_gate.ts
git commit -m "feat(learning-v2): project first encounter cards"
```

## Task 3: Чистый flow-controller блокировки задания

**Files:**

- Create: `app/learning_v2_new_word_encounter_flow_v1.ts`
- Create: `tests/learning_v2_new_word_encounter_flow_v1.test.ts`

- [ ] **Step 1: Написать RED state-machine tests.**

Покрыть состояния:

```ts
type EncounterFlowState =
  | { kind: "inactive" }
  | { kind: "presenting"; index: number; total: number; encounterId: string }
  | { kind: "completed" };
```

Требования тестов: empty queue сразу completed; очередь появляется только после intro completion; `continue` останавливает текущий audio, переходит к следующей карточке, а после последней ровно один раз вызывает `activateTask`; backdrop/answer/save/audio events не активируют task; restart восстанавливает первоначальную очередь.

- [ ] **Step 2: Подтвердить RED, реализовать reducer/controller, получить GREEN.**

```powershell
bash .claude/semaphore/slot.sh acquire "jest new-word encounter flow"
try { npx jest tests/learning_v2_new_word_encounter_flow_v1.test.ts --runInBand } finally { bash .claude/semaphore/slot.sh release }
```

- [ ] **Step 3: Commit.**

```bash
git add app/learning_v2_new_word_encounter_flow_v1.ts tests/learning_v2_new_word_encounter_flow_v1.test.ts
git commit -m "feat(learning-v2): gate practice behind word encounters"
```

## Task 4: Премиальный overlay-компонент A/B

**Files:**

- Create: `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`
- Create: `app/learning_v2_new_word_encounter_copy.ts`
- Create: `tests/learning_v2_new_word_encounter_overlay.test.tsx`
- Reference only: `components/HoloFoilCard.tsx`
- Reference only: `constants/motionHybrid.ts`

- [ ] **Step 1: Написать RED render/accessibility tests.**

Проверить: target, transcription, active locale meaning, active locale playful meaning, counter, audio icon, bookmark icon, Continue; нет `Image`, X, reward/confetti/rarity text и backdrop dismiss; target имеет отдельный semantic node с target language/accessibility label и более сильный weight; touch targets >=44; 200% font scale не вводит фиксированную высоту; reduced motion отключает translate/scale/holo sweep.

- [ ] **Step 2: Подтвердить RED.**

```powershell
bash .claude/semaphore/slot.sh acquire "jest new-word encounter overlay"
try { npx jest tests/learning_v2_new_word_encounter_overlay.test.tsx --runInBand } finally { bash .claude/semaphore/slot.sh release }
```

- [ ] **Step 3: Реализовать визуальную грамматику Reader A.**

Компонент принимает только data/state/callback props. Он не читает source и не сохраняет сам. Использовать theme tokens `t.bgCard`, `t.bgSurface2`, `t.accent`, `t.textPrimary`, `t.textMuted`, `t.correctText`; target — `fontWeight: "900"`, accent; explanation — normal weight. На lime/neon заполнении всегда тёмный foreground.

Motion:

- B: opacity + `translateY(-48 → 0)` + `scale(.94 → 1)` spring, один короткий holo pass;
- A: opacity + `translateY(24 → 0)` + `scale(.985 → 1)`;
- Reduce Motion: только короткий opacity reveal, без moving holo.

Компонент использует transparent `Modal`; backdrop — обычный `View` без dismiss handler; `onRequestClose` вызывает общий exit callback, а не `onContinue`.

- [ ] **Step 4: Добавить 8-locale UI copy.**

Только системные подписи (`Новое слово`, `N из M`, `Продолжить`, save/audio states). Meaning и playful meaning не переводятся в UI: обе строки приходят из release payload конкретной locale. Playful meaning имеет собственный редакторский текст, а не шаблон вокруг точного перевода.

- [ ] **Step 5: GREEN и commit.**

```powershell
bash .claude/semaphore/slot.sh acquire "jest new-word overlay green"
try { npx jest tests/learning_v2_new_word_encounter_overlay.test.tsx --runInBand } finally { bash .claude/semaphore/slot.sh release }
git add components/learning-v2/LearningV2NewWordEncounterOverlay.tsx app/learning_v2_new_word_encounter_copy.ts tests/learning_v2_new_word_encounter_overlay.test.tsx
git commit -m "feat(learning-v2): render premium new word overlay"
```

## Task 5: Идемпотентное сохранение именно lexical item

**Files:**

- Modify: `app/learning_v2_course_session_save_card_v1.ts`
- Modify: `tests/learning_v2_course_session_save_card_v1.test.ts`

- [ ] **Step 1: Написать RED tests для нового API.**

Новый narrow API:

```ts
saveLearningV2CourseSessionNewWordToCardsV1({
  save,
  lexicalItemId,
  transcription,
  interfaceLocale,
});
```

Проверить стабильный `id/sourceId` по `{targetLanguage, lexicalItemId}`, `transcription`, backs для всех активных локалей, duplicate при двойном tap, отсутствие mastery/progress/telemetry writes и сохранение работоспособности прежнего phrase-save API.

- [ ] **Step 2: Реализовать через существующий account-safe custom card store.**

Не вызывать router/paywall из save helper. При `failed` overlay показывает локальное сообщение, но Continue остаётся активной. Не менять существующий `saveLearningV2CourseSessionPhraseToCardsV1`.

- [ ] **Step 3: GREEN и commit.**

```powershell
bash .claude/semaphore/slot.sh acquire "jest learning-v2 word save"
try { npx jest tests/learning_v2_course_session_save_card_v1.test.ts --runInBand } finally { bash .claude/semaphore/slot.sh release }
git add app/learning_v2_course_session_save_card_v1.ts tests/learning_v2_course_session_save_card_v1.test.ts
git commit -m "feat(learning-v2): save encountered words idempotently"
```

## Task 6: Audio lifecycle и accessibility policy

**Files:**

- Create: `app/use_learning_v2_new_word_encounter_audio_v1.ts`
- Create: `tests/use_learning_v2_new_word_encounter_audio_v1.test.ts`
- Reference: `hooks/use_managed_spoken_audio_player.ts`
- Reference: `modules/audio/voice_playback_policy.ts`

- [ ] **Step 1: Написать RED hook tests.**

Проверить: autoplay один раз после `onEntranceComplete`; sound-off даёт no-op; screen reader mode suppresses autoplay, но manual replay работает; переход к следующей карточке сначала stop текущего; Continue и unmount stop; unavailable не ретраится циклом; Reduce Motion не выключает audio.

- [ ] **Step 2: Реализовать hook поверх process-wide spoken-audio arbiter.**

Не создавать новый player на каждую карточку. Hook получает локальный `fileUri`, использует `useManagedSpokenAudioPlayer`, а eligibility читает из `voicePlaybackPolicy` и `AccessibilityInfo.isScreenReaderEnabled()`. Manual replay остаётся разрешённым при screen reader; explicit voice-off запрещает и autoplay, и replay согласно глобальной настройке.

- [ ] **Step 3: GREEN и commit.**

```powershell
bash .claude/semaphore/slot.sh acquire "jest encounter audio lifecycle"
try { npx jest tests/use_learning_v2_new_word_encounter_audio_v1.test.ts --runInBand } finally { bash .claude/semaphore/slot.sh release }
git add app/use_learning_v2_new_word_encounter_audio_v1.ts tests/use_learning_v2_new_word_encounter_audio_v1.test.ts
git commit -m "feat(learning-v2): coordinate encounter word audio"
```

## Task 7: Интеграция в production direct player

**Files:**

- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Create: `tests/learning_v2_direct_session_new_word_overlay.test.tsx`
- Modify: `tests/learning_v2_authored_sessions_reach_the_player.test.ts`

- [ ] **Step 1: Написать RED integration test.**

После завершения трёх intro pages тест должен видеть уже смонтированный practice prompt под overlay, но:

- practice root имеет `pointerEvents="none"`, `importantForAccessibility="no-hide-descendants"` и `accessibilityElementsHidden`;
- progress остаётся на 3 до последнего Continue;
- local voice hook disabled;
- answer/audio/save/advance guards не выполняют действия;
- card 1 получает B только в lesson session 1; последующие A;
- несколько карточек идут `1 из N → N из N`, затем исходное practice index 0;
- Continue останавливает card audio;
- focus после последней карточки переносится на task heading;
- backdrop не закрывает overlay, hardware Back выходит общим session route;
- empty encounter queue сохраняет прежнее поведение byte-for-byte на уровне flow.

- [ ] **Step 2: Интегрировать очередь из opaque runtime getter.**

Добавить `taskActive = introDone && encounterFlow.kind === "completed"`. `sessionStageRef` расширить значением `encounter`; `practice` назначается после intro как раньше, но все side effects и callbacks gated по `taskActive`. Progress:

```ts
const progressOrdinal = !introDone ? 1 : taskActive ? practiceIndex + 4 : 3;
```

Encounter audio разрешать по `resolveLearningV2CourseSessionFullPhraseAudioV1({ handle: audioPreload, interactionId: encounter.interactionId })`. Это exact-word file recognize-контакта; если resolver возвращает `null`, карточка остаётся полностью проходимой.

- [ ] **Step 3: Исключить underlying task из accessibility и ввода.**

Оборачивать task surface:

```tsx
<View
  pointerEvents={taskActive ? "auto" : "none"}
  accessibilityElementsHidden={!taskActive}
  importantForAccessibility={taskActive ? "auto" : "no-hide-descendants"}
>
  {taskSurface}
</View>
```

Нельзя делать conditional unmount: owner утвердил видимое уже смонтированное задание под карточкой.

- [ ] **Step 4: GREEN и commit.**

```powershell
bash .claude/semaphore/slot.sh acquire "jest direct player encounter integration"
try { npx jest tests/learning_v2_direct_session_new_word_overlay.test.tsx tests/learning_v2_authored_sessions_reach_the_player.test.ts --runInBand } finally { bash .claude/semaphore/slot.sh release }
git add app/learning_v2_direct_session_player_v1.tsx tests/learning_v2_direct_session_new_word_overlay.test.tsx tests/learning_v2_authored_sessions_reach_the_player.test.ts
git commit -m "feat(learning-v2): block first task behind word cards"
```

## Task 8: Системные gates и защита всех 32 уроков/языков

**Files:**

- Modify: `package.json`
- Create: `tests/learning_v2_new_word_encounter_gate.ts`
- Modify: `docs/v2/СТАРТ В2.md`
- Modify: `docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md`
- Modify: `docs/v2/04-activity-catalog-and-storyboards.md`

- [ ] **Step 1: Создать aggregate gate.**

`learning-v2:new-word-encounter-gate` проверяет на всех доступных target-language sources:

- every `newVocabulary` item → exactly one encounter;
- pronunciation registry coverage;
- one manually authored playful description per active locale for every word;
- forbidden meta-template patterns and cross-word normalized duplicate descriptions;
- meanings for every active locale без `[[NEEDS_TRANSLATION]]`;
- exactly one B per lesson and all remaining A;
- no encounters in voice/recall/checkpoint;
- encounter before recognize/retrieve/build/phrase;
- no full phrase, art, reward or mastery payload;
- exact-word audio selection существует или релиз честно помечен audio-unavailable;
- old auxiliary fixture remains readable.

Добавить gate в `learning-v2:lesson1-authoring-gate`, не ослабляя существующие word-first/distractor gates.

- [ ] **Step 2: Зафиксировать owner contract в нормативных документах.**

Кратко добавить утверждённую последовательность, A/B, no-image, locale/audio/save правила, запрет шаблонных описаний, обязательный живой юмор и ссылку на spec. Не копировать всю спецификацию и не менять старые планы.

- [ ] **Step 3: Проверить Jarvis impact.**

Это изменение release payload, не Firestore collection/field. Выполнить targeted `rg` по `functions/src/jarvis/*_firestore_fetcher.ts`; если Jarvis не читает course-session auxiliary child, записать `NO JARVIS CONTRACT CHANGE`. Если читает — обновить reader и `jarvis_data_contract_guard.test.ts` в этом же task.

- [ ] **Step 4: Запустить focused gates.**

```powershell
npm run learning-v2:new-word-encounter-gate
npm run learning-v2:lesson1-authoring-preflight
npm run learning-v2:lesson1-authoring-gate
```

Ожидание: все PASS; authoring status и locked fingerprints source 1–10 не изменились.

- [ ] **Step 5: Commit.**

```bash
git add package.json tests/learning_v2_new_word_encounter_gate.ts docs/v2/СТАРТ\ В2.md docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md docs/v2/04-activity-catalog-and-storyboards.md
git commit -m "docs(learning-v2): enforce premium word encounters"
```

## Task 9: Owner-макет из реального runtime payload

**Files:**

- Create: `scripts/build_learning_v2_new_word_encounter_owner_review.ts`
- Create (ignored artifact): `.codex-tmp/learning-v2-word-card-runtime-review/index.html`
- Create: `tests/learning_v2_new_word_encounter_owner_review_gate.ts`

- [ ] **Step 1: Написать RED owner-review gate.**

Gate требует, чтобы HTML был построен не из ручного demo-object, а из encoded+parsed real session package и показывал B, A, multi-card counter, saved/already-saved, autoplay/unavailable, task-inert/task-active, 8 locales и reduced-motion.

- [ ] **Step 2: Реализовать builder.**

Builder импортирует реальный source→shard→children путь, сериализует только learner-safe payload и визуализирует те же поля/состояния, что production component. Никакого второго набора текстов.

- [ ] **Step 3: Запустить и открыть owner-макет.**

```powershell
npx tsx scripts/build_learning_v2_new_word_encounter_owner_review.ts
npx tsx tests/learning_v2_new_word_encounter_owner_review_gate.ts
```

Вручную проверить 200% text, keyboard/focus order, A/B и отсутствие image/full phrase. Сохранить exact payload fingerprint рядом с артефактом.

- [ ] **Step 4: Commit builder/gate, но не ignored HTML.**

```bash
git add scripts/build_learning_v2_new_word_encounter_owner_review.ts tests/learning_v2_new_word_encounter_owner_review_gate.ts
git commit -m "test(learning-v2): build real word encounter review"
```

## Task 10: Финальная независимая проверка перед заявлением о готовности

**Files:** все изменённые выше.

- [ ] **Step 1: Focused Jest suite через semaphore.**

```powershell
bash .claude/semaphore/slot.sh acquire "jest final new-word card verification"
try { npx jest tests/learning_v2_course_session_client_children_v1.test.ts tests/learning_v2_new_word_encounter_projection_v1.test.ts tests/learning_v2_new_word_encounter_flow_v1.test.ts tests/learning_v2_new_word_encounter_overlay.test.tsx tests/use_learning_v2_new_word_encounter_audio_v1.test.ts tests/learning_v2_course_session_save_card_v1.test.ts tests/learning_v2_direct_session_new_word_overlay.test.tsx --runInBand } finally { bash .claude/semaphore/slot.sh release }
```

- [ ] **Step 2: Focused TypeScript check через semaphore.**

Использовать существующую узкую project/config команду, если она есть. Полный `tsc --noEmit` запускать только если focused config отсутствует:

```powershell
bash .claude/semaphore/slot.sh acquire "tsc new-word card verification"
try { npx tsc --noEmit --pretty false } finally { bash .claude/semaphore/slot.sh release }
```

- [ ] **Step 3: Повторить нормативные gates.**

```powershell
npm run learning-v2:new-word-encounter-gate
npm run learning-v2:lesson1-authoring-preflight
npm run learning-v2:lesson1-authoring-gate
```

- [ ] **Step 4: Device/manual acceptance.**

Проверить минимум Android + iOS/симулятор: normal motion, Reduce Motion, screen reader, sound off, offline audio available/unavailable, background/return, system Back, двойной save tap, длинные `pt-BR`/`vi`/`pl` значения, 200% font, переход последней карточки к untouched task.

- [ ] **Step 5: Только после evidence объявить implementation complete.**

Отчёт должен назвать команды, PASS counts, owner-review path/fingerprint, отсутствие source fingerprint drift и отдельно указать, что deploy/TTS/release не выполнялись.

## Находки и предложения

Главный риск — не визуальный, а контрактный: если строить карточку по видимому тексту, `getTranscription()` или общей формуле описания, английский демо-экран заработает, а другие target languages, редакторский юмор и locked content станут недоказуемыми. Additive auxiliary encounter плюс отдельный ручной card-editorial registry сохраняют старые релизы читаемыми и не требуют переписывать утверждённые интро/задания. Exact-word audio уже существует у standalone recognize-контакта, поэтому новый TTS-пайплайн для этой функции не нужен.
