# Learning V2 Intro Reader A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Внедрить утверждённый вариант A «Цельный ридер» в реальный Learning V2 renderer с явной семантикой целевого языка, девятью темами, доступностью и безопасным fallback для старого строкового контента.

**Architecture:** Авторский источник хранит исходную строку и добавочный массив семантических фрагментов. Семантика проходит через generator, canonical intro child и оба runtime adapter без эвристики по алфавиту; старые пакеты без фрагментов продолжают рендериться обычной строкой. UI остаётся одной вертикальной колонкой: компактный этап, причинный заголовок, непрерывное объяснение с inline-акцентами, вопрос, ответы и нижняя CTA.

**Tech Stack:** TypeScript, React Native, Expo Router, Jest, React Native Testing Library, canonical JSON/fingerprint contracts, Phraseman theme and Motion Hybrid tokens.

---

## Граница плана

Входит: semantic runs, canonical readback, два runtime path, production renderer, девять тем, accessibility, reduced motion и регрессия legacy fallback.

Не входит: переписывание учебного текста, сессии 11–56, TTS, Firebase deploy, Firestore write, release publication и удаление legacy Lesson 1. Контент урока 1 выполняется отдельным планом `2026-08-20-learning-v2-lesson1-sessions-11-56.md`.

## Структура файлов

- `modules/learning-v2/content/intro_semantic_runs_v1.ts` — типы и чистая валидация семантических фрагментов.
- `modules/learning-v2/content/generator_session_contract.ts` — добавочное поле `bodyRunsByLocale` в authoring/generator intro.
- `modules/learning-v2/content/source/session_shard_from_source_v1.ts` — source type и перенос runs в shard.
- `modules/learning-v2/runtime/course_session_client_children_v1.ts` — canonical parse/materialize старой строки и нового optional runs-поля.
- `modules/learning-v2/content/source/session_package_from_shard_v1.ts` — перенос runs в learner-safe intro child.
- `modules/learning-v2/content/session_intro_runtime_adapter.ts` — packaged-source adapter в `LessonIntroScreen`.
- `app/learning_v2_direct_session_intro_adapter_v1.ts` — direct-release adapter в тот же view model.
- `app/lesson_data_types.ts` — UI-семантика `explanation | targetCorrect | targetWrong | nativeGloss`.
- `app/learning_v2_intro_theme.ts` — чистый выбор контрастного inline-акцента из активной темы.
- `app/learning_v2_session_intro.tsx` — вариант A и только отображение переданных данных.
- `tests/learning_v2_intro_semantic_runs_contract.test.ts` — source/generator/runtime/fallback contract.
- `tests/learning_v2_course_session_client_children_v1.test.ts` — canonical compatibility и fingerprint.
- `tests/learning_v2_direct_session_intro_adapter_v1.test.ts` — direct path сохраняет семантику.
- `tests/learning_v2_session_intro_design_contract.test.ts` — запрет старой декоративной компоновки и мета-лексики.
- `tests/learning_v2_intro_reader_a.test.tsx` — поведение renderer, accessibility и CTA.
- `tests/learning_v2_intro_theme_contract.test.ts` — девять тем, контраст и foreground ярких CTA.

### Task 1: Зафиксировать RED-контракт semantic runs

**Files:**
- Create: `tests/learning_v2_intro_semantic_runs_contract.test.ts`
- Modify: `tests/learning_v2_course_session_client_children_v1.test.ts`

- [ ] **Step 1: Написать тест четырёх семантических ролей и строкового равенства**

```ts
import {
  introRunsPlainTextV1,
  validateLearningV2IntroRunsByLocaleV1,
} from "../modules/learning-v2/content/intro_semantic_runs_v1";

const localeRuns = {
  ru: [
    { text: "По-английски говорим ", semantic: "explanation" },
    { text: "I am here", semantic: "targetCorrect" },
    { text: ", а не ", semantic: "explanation" },
    { text: "I here", semantic: "targetWrong" },
    { text: ".", semantic: "explanation" },
  ],
  uk: [{ text: "Правильно: I am here.", semantic: "explanation" }],
  es: [{ text: "La forma correcta es I am here.", semantic: "explanation" }],
  "pt-BR": [{ text: "A forma correta é I am here.", semantic: "explanation" }],
  vi: [{ text: "Cách đúng là I am here.", semantic: "explanation" }],
  id: [{ text: "Bentuk yang benar adalah I am here.", semantic: "explanation" }],
  tr: [{ text: "Doğru biçim I am here şeklindedir.", semantic: "explanation" }],
  pl: [{ text: "Poprawna forma to I am here.", semantic: "explanation" }],
} as const;

test("semantic runs are explicit and concatenate without changing canonical copy", () => {
  const validated = validateLearningV2IntroRunsByLocaleV1(localeRuns);
  expect(introRunsPlainTextV1(validated.ru)).toBe(
    "По-английски говорим I am here, а не I here.",
  );
});
```

- [ ] **Step 2: Добавить RED-тест fallback** — старый intro child без `bodyRunsByLocale` обязан пройти parser, а новый child обязан вернуть runs и изменить fingerprint при изменении любого `text` или `semantic`.

- [ ] **Step 3: Запустить RED**

Run:

```powershell
npx jest --runTestsByPath tests/learning_v2_intro_semantic_runs_contract.test.ts tests/learning_v2_course_session_client_children_v1.test.ts --no-cache --runInBand
```

Expected: FAIL только из-за отсутствующего `intro_semantic_runs_v1` и поля runs; существующие legacy cases не переписываются.

- [ ] **Step 4: Commit**

```powershell
git add -- tests/learning_v2_intro_semantic_runs_contract.test.ts tests/learning_v2_course_session_client_children_v1.test.ts
git commit -m "test(learning-v2): require semantic intro runs"
```

### Task 2: Добавить чистый семантический контракт

**Files:**
- Create: `modules/learning-v2/content/intro_semantic_runs_v1.ts`
- Modify: `modules/learning-v2/content/generator_session_contract.ts`
- Modify: `modules/learning-v2/content/source/session_shard_from_source_v1.ts`

- [ ] **Step 1: Реализовать закрытый словарь ролей и fail-closed validator**

```ts
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
  type LearningV2Localized,
} from "./generator_course_contract";

export const LEARNING_V2_INTRO_RUN_SEMANTICS_V1 = Object.freeze([
  "explanation",
  "targetCorrect",
  "targetWrong",
  "nativeGloss",
] as const);

export type LearningV2IntroRunSemanticV1 =
  (typeof LEARNING_V2_INTRO_RUN_SEMANTICS_V1)[number];

export type LearningV2IntroTextRunV1 = Readonly<{
  text: string;
  semantic: LearningV2IntroRunSemanticV1;
}>;

export type LearningV2IntroRunsByLocaleV1 = LearningV2Localized<
  readonly LearningV2IntroTextRunV1[]
>;

export const introRunsPlainTextV1 = (
  runs: readonly LearningV2IntroTextRunV1[],
): string => runs.map((run) => run.text).join("");

export function validateLearningV2IntroRunsByLocaleV1(
  input: LearningV2IntroRunsByLocaleV1,
): LearningV2IntroRunsByLocaleV1 {
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    const runs = input[locale as LearningV2InterfaceLocale];
    if (!Array.isArray(runs) || runs.length < 1 || runs.length > 64)
      throw new Error("learning_v2_intro_runs_invalid");
    for (const run of runs) {
      if (
        typeof run?.text !== "string" ||
        run.text.length < 1 ||
        run.text.length > 1_000 ||
        !LEARNING_V2_INTRO_RUN_SEMANTICS_V1.includes(run.semantic)
      ) throw new Error("learning_v2_intro_run_invalid");
    }
  }
  return input;
}
```

- [ ] **Step 2: Добавить `bodyRunsByLocale?: LearningV2IntroRunsByLocaleV1`** в `LearningV2GeneratedSessionIntroPage`; validator при наличии runs проверяет `introRunsPlainTextV1(runs[locale]) === bodyByLocale[locale]` для всех восьми локалей. Строка остаётся canonical fallback и не пересобирается из UI.

- [ ] **Step 3: Добавить `bodyRuns?: LocalizedIntroRunsSource`** в `SessionSourceIntroPage` и переносить его без автопоиска английских слов. Если author не дал runs, поле отсутствует.

- [ ] **Step 4: Запустить GREEN Task 1**

Run: команда Task 1. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- modules/learning-v2/content/intro_semantic_runs_v1.ts modules/learning-v2/content/generator_session_contract.ts modules/learning-v2/content/source/session_shard_from_source_v1.ts tests/learning_v2_intro_semantic_runs_contract.test.ts tests/learning_v2_course_session_client_children_v1.test.ts
git commit -m "feat(learning-v2): add explicit intro text semantics"
```

### Task 3: Провести runs через canonical package без поломки старых релизов

**Files:**
- Modify: `modules/learning-v2/runtime/course_session_client_children_v1.ts`
- Modify: `modules/learning-v2/content/source/session_package_from_shard_v1.ts`
- Modify: `modules/learning-v2/runtime/course_session_device_run_v1.ts`
- Test: `tests/learning_v2_course_session_client_children_v1.test.ts`
- Test: `tests/learning_v2_course_session_device_run_v1.test.ts`

- [ ] **Step 1: Разрешить ровно два набора page keys**: legacy без `bodyRunsByLocale` и enriched с ним. Любой другой лишний ключ остаётся ошибкой.

```ts
const INTRO_PAGE_KEYS_LEGACY = [
  "pageOrdinal", "pageId", "kind", "titleByLocale", "bodyByLocale", "question",
] as const;
const INTRO_PAGE_KEYS_WITH_RUNS = [
  "pageOrdinal", "pageId", "kind", "titleByLocale", "bodyByLocale",
  "bodyRunsByLocale", "question",
] as const;
```

- [ ] **Step 2: В parser валидировать enriched runs, сравнивать их plain text с `bodyByLocale`, включать поле в canonical body и fingerprint. Legacy body/fingerprint остаются побайтово прежними.

- [ ] **Step 3: В materializer добавлять `bodyRunsByLocale` только когда оно реально передано; `undefined` не сериализовать.

- [ ] **Step 4: В `session_package_from_shard_v1.ts` переносить runs в learner-safe child. Accepted answers, evaluator payload и review receipts туда не попадут.

- [ ] **Step 5: Проверить оба пути**

Run:

```powershell
npx jest --runTestsByPath tests/learning_v2_course_session_client_children_v1.test.ts tests/learning_v2_course_session_device_run_v1.test.ts --no-cache --runInBand
```

Expected: PASS; legacy fixture fingerprint не изменён, enriched fixture readback сохраняет все runs.

- [ ] **Step 6: Проверить Jarvis/Rules границу**

Run:

```powershell
rg -n "introFingerprint|bodyByLocale|course-session-intro-child" functions/src/jarvis firestore.rules
```

Expected: ни один Jarvis fetcher не читает внутренние page fields; новой Firestore collection/field нет, поэтому Rules и data-contract table не меняются. Если поиск покажет читателя — остановить commit и добавить его обновление с `jarvis_data_contract_guard.test.ts`.

- [ ] **Step 7: Commit**

```powershell
git add -- modules/learning-v2/runtime/course_session_client_children_v1.ts modules/learning-v2/content/source/session_package_from_shard_v1.ts modules/learning-v2/runtime/course_session_device_run_v1.ts tests/learning_v2_course_session_client_children_v1.test.ts tests/learning_v2_course_session_device_run_v1.test.ts
git commit -m "feat(learning-v2): preserve semantic intro runs in readback"
```

### Task 4: Свести оба runtime adapter к одному view model

**Files:**
- Modify: `app/lesson_data_types.ts`
- Modify: `modules/learning-v2/content/session_intro_runtime_adapter.ts`
- Modify: `app/learning_v2_direct_session_intro_adapter_v1.ts`
- Test: `tests/learning_v2_generator_session_contract.test.ts`
- Test: `tests/learning_v2_direct_session_intro_adapter_v1.test.ts`

- [ ] **Step 1: Добавить optional UI semantic**

```ts
export type IntroTextSemantic =
  | "explanation"
  | "targetCorrect"
  | "targetWrong"
  | "nativeGloss";

export type IntroTextPart = {
  text: string;
  tone?: IntroTextTone;
  semantic?: IntroTextSemantic;
};
```

- [ ] **Step 2: Оба adapter отображают supplied run как `{text, semantic}`. При отсутствии runs создаётся один `{text: body, semantic: "explanation"}`; никакой regex по латинице не используется.

- [ ] **Step 3: Добавить тесты exact preservation**: порядок, пробелы, punctuation и semantic совпадают для packaged и direct path.

- [ ] **Step 4: Запустить**

```powershell
npx jest --runTestsByPath tests/learning_v2_generator_session_contract.test.ts tests/learning_v2_direct_session_intro_adapter_v1.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- app/lesson_data_types.ts modules/learning-v2/content/session_intro_runtime_adapter.ts app/learning_v2_direct_session_intro_adapter_v1.ts tests/learning_v2_generator_session_contract.test.ts tests/learning_v2_direct_session_intro_adapter_v1.test.ts
git commit -m "feat(learning-v2): adapt semantic intro copy to the app"
```

### Task 5: Внедрить вариант A «Цельный ридер»

**Files:**
- Create: `app/learning_v2_intro_theme.ts`
- Modify: `app/learning_v2_session_intro.tsx`
- Modify: `tests/learning_v2_session_intro_design_contract.test.ts`
- Create: `tests/learning_v2_intro_theme_contract.test.ts`
- Create: `tests/learning_v2_intro_reader_a.test.tsx`

- [ ] **Step 1: Написать RED design contract** со следующими обязательными утверждениями:

```ts
expect(intro).not.toContain("Интро сессии");
expect(intro).not.toContain("sessionOrdinal}");
expect(intro).not.toContain("styles.hero");
expect(intro).not.toContain("styles.featuredLine");
expect(intro).toContain("IntroReaderParagraph");
expect(intro).toContain('semantic === "targetCorrect"');
expect(intro).toContain('semantic === "targetWrong"');
expect(intro).toContain("DuoPressable");
expect(intro).toContain("PressableHybrid");
expect(intro).toContain("useStableSafeAreaInsets");
expect(intro).not.toContain("useSafeAreaInsets");
```

- [ ] **Step 2: Реализовать `introTargetTextColor(theme, themeMode)`**. Функция выбирает theme accent только при контрасте не ниже 4.5:1 к card/background; иначе использует наиболее контрастный из `textPrimary`, `correct`, `gold`. На bright fill CTA всегда возвращается `correctText`, не белый литерал.

- [ ] **Step 3: Перестроить renderer**:

```tsx
function IntroReaderParagraph({ parts, targetColor, theme }: Props) {
  return (
    <Text style={{ color: theme.textOnCard, fontSize: 17, lineHeight: 28, fontWeight: "400" }}>
      {parts.map((part, index) => {
        const target = part.semantic === "targetCorrect";
        const wrong = part.semantic === "targetWrong";
        return (
          <Text
            key={`${index}-${part.text}`}
            accessibilityLabel={wrong ? `${part.text}, неверный пример` : part.text}
            style={{
              color: wrong ? theme.wrong : target ? targetColor : theme.textOnCard,
              fontSize: target || wrong ? 18 : 17,
              fontWeight: target || wrong ? "700" : "400",
              textDecorationLine: wrong ? "line-through" : "none",
            }}
          >
            {part.text}
          </Text>
        );
      })}
    </Text>
  );
}
```

Обязательная геометрия: одна колонка, max readable width, этап `СМЫСЛ/СХЕМА/ЛОВУШКА` + `1/3`, заголовок 26–30, абзац, вопрос, три ответа, фиксированная нижняя CTA. Большой hero, orbit, карточки вокруг отдельных строк, боковая рейка и мета-заголовок про занятие запрещены.

- [ ] **Step 4: Привести движение и нажатия к инвариантам**: CTA через `DuoPressable`, иконка закрытия через `PressableHybrid`, значения движения только из `constants/motionHybrid.ts`, `useStableSafeAreaInsets`, reduced motion оставляет финальный кадр. Использовать только веса `400/700`; это техническая реализация одобренного требования «целевой язык жирнее».

- [ ] **Step 5: RNTL-тест** проверяет inline порядок текста, отдельный цвет/700 у target, wrong + line-through, 44×44 hit target, вопрос блокирует CTA до верного ответа, два неверных ответа показывают supplied explanation, screen reader order не содержит слова «сессия».

- [ ] **Step 6: Запустить focused UI gates**

```powershell
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/learning_v2_intro_reader_a.test.tsx --no-cache --runInBand
npx jest --runTestsByPath tests/learning_v2_session_intro_design_contract.test.ts tests/learning_v2_intro_theme_contract.test.ts tests/motion_hybrid_contract.test.ts --no-cache --runInBand
```

Expected: PASS, 0 snapshots updated.

- [ ] **Step 7: Commit**

```powershell
git add -- app/learning_v2_intro_theme.ts app/learning_v2_session_intro.tsx tests/learning_v2_session_intro_design_contract.test.ts tests/learning_v2_intro_theme_contract.test.ts tests/learning_v2_intro_reader_a.test.tsx
git commit -m "feat(learning-v2): implement intro reader option A"
```

### Task 6: Проверить темы, размеры и реальное устройство

**Files:**
- Create: `maestro/learning-v2-intro-reader-a.yaml`
- Create: `qa-artifacts/learning-v2-intro-reader-a/README.md`
- Modify: `docs/v2/HANDOVER.md`

- [ ] **Step 1: Maestro flow** открывает один deterministic dev fixture, проходит concept/formula/trap и делает screenshots для 375 px во всех девяти theme modes.

- [ ] **Step 2: Повторить проверку на 768, 1024 и 1440 px**; ширина текста остаётся в пределах 65–75 знаков, horizontal scroll отсутствует.

- [ ] **Step 3: Ручной accessibility gate**: увеличенный системный шрифт, VoiceOver/TalkBack order, reduced motion, keyboard focus на web/dev preview. Результат записать в `qa-artifacts`, не в source snapshot.

- [ ] **Step 4: Финальные deterministic gates**

```powershell
npx jest --runTestsByPath tests/learning_v2_intro_semantic_runs_contract.test.ts tests/learning_v2_course_session_client_children_v1.test.ts tests/learning_v2_direct_session_intro_adapter_v1.test.ts tests/learning_v2_session_intro_design_contract.test.ts tests/learning_v2_intro_theme_contract.test.ts tests/motion_hybrid_contract.test.ts --no-cache --runInBand
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/learning_v2_intro_reader_a.test.tsx --no-cache --runInBand
npx tsc --noEmit --pretty false
git diff --check
```

Expected: все команды exit 0; broad TypeScript failures, существовавшие до задачи, не объявлять новыми — сохранить полный лог и выделить только changed-scope errors.

- [ ] **Step 5: Независимые гейты**: отдельный spec review сверяет утверждённый вариант A; отдельный accessibility/quality review не может быть выполнен автором изменения. Любой P0/P1/P2 возвращает задачу в RED.

- [ ] **Step 6: Обновить `docs/v2/HANDOVER.md`** с командами, count, screenshots, сохранённым legacy fallback, отсутствием deploy/push/release и точным следующим task packet.

- [ ] **Step 7: Commit**

```powershell
git add -- maestro/learning-v2-intro-reader-a.yaml qa-artifacts/learning-v2-intro-reader-a/README.md docs/v2/HANDOVER.md
git commit -m "test(learning-v2): verify intro reader option A"
```

## Критерий PASS

PASS разрешён только если оба runtime path показывают одинаковый semantic view model; legacy package без runs читается; enriched fingerprint меняется при любой смысловой правке; во всех девяти темах target отличается цветом и весом; wrong имеет нецветовой признак; UI не содержит упоминаний занятий/прошлого/будущего; focused tests, device accessibility и независимые reviews зелёные.
