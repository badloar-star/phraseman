# Lesson Gold Dialog And AI Mistake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add gold-unlocked lesson dialogs for lessons 18 and 20 and a daily-limited AI mistake card that explains the user's specific wrong answer.

**Architecture:** Reuse the existing AI dialog stack for lesson dialogs: `ai_dialog_session.tsx`, `ai_dialog_client.ts`, `dialogs_limit_session.ts`, and `premiumDialogSend`. Add only lesson-gated routing and hidden lesson-specific scenarios. Implement AI mistake explanations as a separate callable and client card with its own daily quota so wrong-answer help cannot drain or bypass dialog limits.

**Tech Stack:** React Native / Expo Router, TypeScript, Firebase callable functions, Firestore quota docs, Jest source-contract and function unit tests.

---

## File Structure

- Modify: `app/ai_dialog_scenarios.ts`
  - Add optional lesson metadata to `DialogScenario`.
  - Add two hidden lesson scenarios for lessons 18 and 20.
  - Add `getPublicDialogScenarios()` and update category helper to hide lesson-only scenarios from the public catalog.

- Modify: `app/ai_dialog_home.tsx`
  - Use `getPublicDialogScenarios()` for counts and visible cards.

- Modify: `app/lesson_menu.tsx`
  - Add a `Диалог` row.
  - Gate row by `progress >= 50 && getMedalTier(score) === 'gold'`.
  - Open `ai_dialog_session` with lesson scenario id.
  - Show locked hint through existing toast/event/modal pattern.

- Create: `app/lesson_dialog_scenarios.ts`
  - Map lesson id to lesson scenario id.
  - Provide `getLessonDialogScenarioId(lessonId)`.
  - Provide `lessonDialogLockedHint(lang)`.

- Create: `app/ai_mistake_explain_flags.ts`
  - Define `FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT = 3`.
  - Provide env override only if an existing pattern supports it cleanly.

- Create: `app/ai_mistake_explain_limit_session.ts`
  - Client UX quota for 3 free mistake explanations per UTC day.
  - Server remains the source of truth.

- Create: `app/ai_mistake_explain_client.ts`
  - Callable wrapper for `explainMistake`.

- Create: `components/AiMistakeCard.tsx`
  - Compact smart card shown after wrong answer.
  - Button shows remaining local quota.
  - Displays loading, text, limit, and fallback states.

- Modify: `app/lesson1.tsx`
  - Capture wrong answer context already available in `checkAnswer`.
  - Render `AiMistakeCard` after wrong answer under the explain/help area.
  - Pass `lessonId`, `phrase.id`, target answer, user answer, selected wrong/expected words when available.

- Create: `functions/src/mistake_explain.ts`
  - New callable `explainMistake`.
  - Auth/App Check, input validation, rate limit, daily quota, OpenAI call, billing.
  - Quota must be enforced before provider call.

- Modify: `functions/src/index.ts`
  - Export `explainMistake`.

- Create tests:
  - `tests/lesson_dialog_menu_contract.test.ts`
  - `tests/lesson_dialog_scenarios.test.ts`
  - `tests/ai_mistake_explain_client_contract.test.ts`
  - `tests/ai_mistake_card_contract.test.ts`
  - `functions/src/mistake_explain.test.ts`

---

## Task 1: Lesson Scenario Catalog Contract

**Files:**
- Modify: `app/ai_dialog_scenarios.ts`
- Modify: `app/ai_dialog_home.tsx`
- Create: `app/lesson_dialog_scenarios.ts`
- Test: `tests/lesson_dialog_scenarios.test.ts`
- Test: `tests/ai_dialog_scenarios.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `tests/lesson_dialog_scenarios.test.ts`:

```ts
import fs from 'fs';
import path from 'path';
import { getScenarioById, getPublicDialogScenarios } from '../app/ai_dialog_scenarios';
import { getLessonDialogScenarioId } from '../app/lesson_dialog_scenarios';

const lessonSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_data_17_24.ts'), 'utf8');

function phraseIdsForLesson(lessonId: number): Set<string> {
  const match = lessonSource.match(
    new RegExp(`export const LESSON_${lessonId}_PHRASES:[\\s\\S]*?= \\[([\\s\\S]*?)\\n\\];`),
  );
  if (!match) throw new Error(`LESSON_${lessonId}_PHRASES not found`);
  const idRegex = new RegExp(`id:\\s*['"](lesson${lessonId}_phrase_\\d+)['"]`, 'g');
  return new Set(Array.from(match[1].matchAll(idRegex), (row) => row[1]));
}

describe('lesson dialog scenarios', () => {
  it('maps lessons 18 and 20 to hidden AI scenarios', () => {
    expect(getLessonDialogScenarioId(18)).toBe('lesson18_restaurant_table');
    expect(getLessonDialogScenarioId(20)).toBe('lesson20_lost_bag');

    expect(getPublicDialogScenarios().map((s) => s.id)).not.toContain('lesson18_restaurant_table');
    expect(getPublicDialogScenarios().map((s) => s.id)).not.toContain('lesson20_lost_bag');
  });

  it('uses phrase ids that exist in the lesson source', () => {
    for (const lessonId of [18, 20]) {
      const scenario = getScenarioById(getLessonDialogScenarioId(lessonId)!);
      expect(scenario?.sourceLessonId).toBe(lessonId);
      const phraseIds = phraseIdsForLesson(lessonId);
      for (const phraseId of scenario?.requiredPhraseIds ?? []) {
        expect(phraseIds.has(phraseId)).toBe(true);
      }
    }
  });
});
```

Update `tests/ai_dialog_scenarios.test.ts`:

```ts
import { getPublicDialogScenarios } from '../app/ai_dialog_scenarios';

it('keeps the public catalogue at 20 scenarios', () => {
  expect(getPublicDialogScenarios()).toHaveLength(20);
  expect(getPublicDialogScenarios().every((scenario) => !scenario.hiddenFromHome)).toBe(true);
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npx jest --runTestsByPath tests/lesson_dialog_scenarios.test.ts tests/ai_dialog_scenarios.test.ts --no-cache --runInBand
```

Expected: fail because lesson helpers and hidden metadata do not exist.

- [ ] **Step 3: Implement scenario helpers**

In `app/ai_dialog_scenarios.ts`, extend the interface:

```ts
  sourceLessonId?: number;
  hiddenFromHome?: boolean;
  requiredPhraseIds?: string[];
```

Add two scenarios to `DIALOG_SCENARIOS` with `active: true`, `hiddenFromHome: true`, and required phrase ids:

```ts
{
  id: 'lesson18_restaurant_table',
  category: 'everyday',
  titleRu: 'Столик в ресторане',
  goalRu: 'Забронируй столик, уточни время и ответь на короткий вопрос',
  role: 'a polite restaurant host',
  setting: 'a casual restaurant entrance',
  goalEn: 'reserve a table, confirm the time, and answer one short follow-up question',
  cefr: 'B1',
  icon: 'restaurant-outline',
  active: true,
  hiddenFromHome: true,
  sourceLessonId: 18,
  requiredPhraseIds: ['lesson18_phrase_31', 'lesson18_phrase_32', 'lesson18_phrase_33'],
  nextStepHintRu: 'Попроси столик и уточни время одним коротким предложением.',
}
```

```ts
{
  id: 'lesson20_lost_bag',
  category: 'everyday',
  titleRu: 'Потерянная сумка',
  goalRu: 'Скажи, что у тебя есть сумка, где она была, и уточни вариант',
  role: 'a helpful lost-and-found worker',
  setting: 'a lost-and-found desk',
  goalEn: 'say what you have, explain where the bag was, and confirm the option',
  cefr: 'B1',
  icon: 'bag-outline',
  active: true,
  hiddenFromHome: true,
  sourceLessonId: 20,
  requiredPhraseIds: ['lesson20_phrase_1', 'lesson20_phrase_5', 'lesson20_phrase_50'],
  nextStepHintRu: 'Скажи, какая вещь потерялась и где она была.',
}
```

Add helpers:

```ts
export function getPublicDialogScenarios(): DialogScenario[] {
  return DIALOG_SCENARIOS.filter((scenario) => scenario.active && !scenario.hiddenFromHome);
}

export function getScenariosByCategory(category: DialogScenarioCategory): DialogScenario[] {
  return getPublicDialogScenarios().filter((scenario) => scenario.category === category);
}
```

Create `app/lesson_dialog_scenarios.ts`:

```ts
import { triLang, type Lang } from '../constants/i18n';

const LESSON_DIALOG_SCENARIO_BY_ID: Record<number, string> = {
  18: 'lesson18_restaurant_table',
  20: 'lesson20_lost_bag',
};

export function getLessonDialogScenarioId(lessonId: number): string | undefined {
  return LESSON_DIALOG_SCENARIO_BY_ID[lessonId];
}

export function lessonDialogLockedHint(lang: Lang): string {
  return triLang(lang, {
    ru: 'Пройди урок на золото. Диалог откроется после 50 фраз.',
    uk: 'Пройди урок на золото. Діалог відкриється після 50 фраз.',
    es: 'Completa la lección con oro. El diálogo se abrirá después de 50 frases.',
    'pt-BR': 'Conclua a lição com ouro. O diálogo abre depois de 50 frases.',
    vi: 'Hoàn thành bài với huy chương vàng. Hội thoại mở sau 50 cụm.',
    id: 'Selesaikan pelajaran dengan emas. Dialog terbuka setelah 50 frasa.',
    tr: 'Dersi altınla bitir. Diyalog 50 ifadeden sonra açılır.',
    pl: 'Ukończ lekcję na złoto. Dialog otworzy się po 50 frazach.',
  });
}
```

Update `app/ai_dialog_home.tsx` to import and use `getPublicDialogScenarios()` for `activeCount`, while category groups continue through `getScenariosByCategory`.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npx jest --runTestsByPath tests/lesson_dialog_scenarios.test.ts tests/ai_dialog_scenarios.test.ts --no-cache --runInBand
```

Expected: pass.

---

## Task 2: Gold-Locked Dialog Row In Lesson Menu

**Files:**
- Modify: `app/lesson_menu.tsx`
- Test: `tests/lesson_dialog_menu_contract.test.ts`

- [ ] **Step 1: Write failing source-contract test**

Create `tests/lesson_dialog_menu_contract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_menu.tsx'), 'utf8');

describe('lesson menu gold dialog row', () => {
  it('renders a tappable dialog row gated by gold and 50 phrases', () => {
    expect(source).toContain('testID: \'lesson-menu-dialog\'');
    expect(source).toContain('getLessonDialogScenarioId(lessonId)');
    expect(source).toContain('progress >= 50');
    expect(source).toContain("getMedalTier(score) === 'gold'");
  });

  it('opens the existing ai dialog session and shows a locked hint instead of hiding the row', () => {
    expect(source).toContain("pathname: '/ai_dialog_session'");
    expect(source).toContain('scenarioId: lessonDialogScenarioId');
    expect(source).toContain('lessonDialogLockedHint(lang)');
    expect(source).not.toContain("pathname: '/lesson_dialog'");
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npx jest --runTestsByPath tests/lesson_dialog_menu_contract.test.ts --no-cache --runInBand
```

Expected: fail because the menu row does not exist.

- [ ] **Step 3: Implement menu row**

In `app/lesson_menu.tsx`, import:

```ts
import { getLessonDialogScenarioId, lessonDialogLockedHint } from './lesson_dialog_scenarios';
```

Near `isStarted`, add:

```ts
const lessonDialogScenarioId = getLessonDialogScenarioId(lessonId);
const lessonDialogUnlocked = progress >= 50 && getMedalTier(score) === 'gold';
const showLessonDialogRow = !!lessonDialogScenarioId && isAiDialogEnabled();
```

Add a menu item after the primary row:

```ts
{
  testID: 'lesson-menu-dialog',
  hidden: !showLessonDialogRow,
  label: triLang(lang, {
    ru: 'Диалог',
    uk: 'Діалог',
    es: 'Diálogo',
    'pt-BR': 'Diálogo',
    vi: 'Hội thoại',
    id: 'Dialog',
    tr: 'Diyalog',
    pl: 'Dialog',
  }),
  sub: lessonDialogUnlocked
    ? triLang(lang, {
        ru: 'Сцена из фраз урока',
        uk: 'Сцена з фраз уроку',
        es: 'Escena con frases de la lección',
        'pt-BR': 'Cena com frases da lição',
        vi: 'Tình huống từ cụm trong bài',
        id: 'Adegan dari frasa pelajaran',
        tr: 'Dersteki ifadelerle sahne',
        pl: 'Scenka z fraz lekcji',
      })
    : triLang(lang, {
        ru: 'Откроется после золота',
        uk: 'Відкриється після золота',
        es: 'Se abre después del oro',
        'pt-BR': 'Abre depois do ouro',
        vi: 'Mở sau huy chương vàng',
        id: 'Terbuka setelah emas',
        tr: 'Altından sonra açılır',
        pl: 'Otwiera się po złocie',
      }),
  icon: lessonDialogUnlocked ? 'chatbubbles-outline' as const : 'lock-closed-outline' as const,
  unavailable: !lessonDialogUnlocked,
  onPress: () => {
    hapticTap();
    if (!lessonDialogUnlocked) {
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: lessonDialogLockedHint('ru'),
        messageUk: lessonDialogLockedHint('uk'),
        messageEs: lessonDialogLockedHint('es'),
      });
      return;
    }
    router.push({ pathname: '/ai_dialog_session', params: { scenarioId: lessonDialogScenarioId } } as any);
  },
}
```

Use existing menu item renderer's `unavailable` styling. Do not remove any existing menu rows.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npx jest --runTestsByPath tests/lesson_dialog_menu_contract.test.ts tests/lesson_dialog_scenarios.test.ts --no-cache --runInBand
```

Expected: pass.

---

## Task 3: Client Mistake Explain Limit

**Files:**
- Create: `app/ai_mistake_explain_flags.ts`
- Create: `app/ai_mistake_explain_limit_session.ts`
- Test: `tests/ai_mistake_explain_limit.test.ts`

- [ ] **Step 1: Write failing limit tests**

Create `tests/ai_mistake_explain_limit.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT,
  getAiMistakeExplainsLeftToday,
  markAiMistakeExplainUsed,
} from '../app/ai_mistake_explain_limit_session';

jest.mock('@react-native-async-storage/async-storage');

const store: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(store).forEach((key) => delete store[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => Promise.resolve(store[key] ?? null));
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  });
  jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-06-12T08:00:00.000Z');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ai mistake explain client limit', () => {
  it('defaults to three free explanations per day', async () => {
    expect(FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT).toBe(3);
    await expect(getAiMistakeExplainsLeftToday()).resolves.toBe(3);
  });

  it('decrements locally only when marked used and resets by date', async () => {
    await markAiMistakeExplainUsed();
    await markAiMistakeExplainUsed();
    await expect(getAiMistakeExplainsLeftToday()).resolves.toBe(1);

    (Date.prototype.toISOString as jest.Mock).mockReturnValue('2026-06-13T08:00:00.000Z');
    await expect(getAiMistakeExplainsLeftToday()).resolves.toBe(3);
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npx jest --runTestsByPath tests/ai_mistake_explain_limit.test.ts --no-cache --runInBand
```

Expected: fail because files do not exist.

- [ ] **Step 3: Implement client limit**

Create `app/ai_mistake_explain_flags.ts`:

```ts
export const FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT = 3;
```

Create `app/ai_mistake_explain_limit_session.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT } from './ai_mistake_explain_flags';

export { FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT };

export const DAILY_AI_MISTAKE_EXPLAIN_KEY = 'ai_mistake_explain_session_v1';

interface DailyMistakeExplainState {
  date: string;
  count: number;
}

const todayKey = (): string => new Date().toISOString().split('T')[0];

function parseState(raw: string | null): DailyMistakeExplainState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DailyMistakeExplainState;
    return typeof data?.date === 'string' && typeof data?.count === 'number' ? data : null;
  } catch {
    return null;
  }
}

export async function getAiMistakeExplainsLeftToday(): Promise<number> {
  try {
    const data = parseState(await AsyncStorage.getItem(DAILY_AI_MISTAKE_EXPLAIN_KEY));
    if (!data || data.date !== todayKey()) return FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT;
    return Math.max(0, FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT - data.count);
  } catch {
    return FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT;
  }
}

export async function markAiMistakeExplainUsed(): Promise<void> {
  try {
    const existing = parseState(await AsyncStorage.getItem(DAILY_AI_MISTAKE_EXPLAIN_KEY));
    const data = existing && existing.date === todayKey() ? existing : { date: todayKey(), count: 0 };
    await AsyncStorage.setItem(DAILY_AI_MISTAKE_EXPLAIN_KEY, JSON.stringify({
      date: data.date,
      count: data.count + 1,
    }));
  } catch {}
}
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
npx jest --runTestsByPath tests/ai_mistake_explain_limit.test.ts --no-cache --runInBand
```

Expected: pass.

---

## Task 4: AI Mistake Callable Contract

**Files:**
- Create: `functions/src/mistake_explain.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/mistake_explain.test.ts`

- [ ] **Step 1: Write failing function tests**

Create `functions/src/mistake_explain.test.ts` using the same mocking style as `functions/src/explain_phrase.test.ts`. Required tests:

```ts
describe('explainMistake callable', () => {
  test('rejects unauthenticated calls before provider work', async () => {
    await expect(callExplainMistake(undefined, validPayload())).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects invalid payload before quota and provider work', async () => {
    await expect(callExplainMistake('auth-1', { phraseId: '', userAnswer: '', targetAnswer: '' })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('blocks the fourth free request and does not call provider', async () => {
    await callExplainMistake('auth-1', validPayload());
    await callExplainMistake('auth-1', validPayload());
    await callExplainMistake('auth-1', validPayload());
    fetchMock.mockClear();
    await expect(callExplainMistake('auth-1', validPayload())).rejects.toMatchObject({ code: 'resource-exhausted' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('prompt focuses on the exact user mismatch', async () => {
    await callExplainMistake('auth-2', {
      lessonId: 20,
      phraseId: 'lesson20_phrase_1',
      userAnswer: 'I has a bag',
      targetAnswer: 'I have a bag',
      selectedWrongWord: 'has',
      expectedWord: 'have',
      studyTarget: 'en',
      interfaceLang: 'ru',
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const prompt = JSON.stringify(body.messages);
    expect(prompt).toContain('I has a bag');
    expect(prompt).toContain('I have a bag');
    expect(prompt).toContain('has');
    expect(prompt).toContain('have');
    expect(prompt).toContain('Do not invent a different error');
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npx jest --runTestsByPath functions/src/mistake_explain.test.ts --no-cache --runInBand
```

Expected: fail because `mistake_explain.ts` does not exist.

- [ ] **Step 3: Implement callable**

Create `functions/src/mistake_explain.ts` by following the structure of `premium_dialog.ts` and `explain_phrase.ts`:

- constants:

```ts
const RATE_COLLECTION = 'mistake_explain_rate_limits';
const QUOTA_COLLECTION = 'mistake_explain_quotas';
const BILLING_COLLECTION = 'mistake_explain_billing';
const FREE_DAILY_CAP = 3;
const PREMIUM_DAILY_CAP = 30;
const MAX_PER_WINDOW = 30;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_OUTPUT_TOKENS = 120;
const MODEL_DEFAULT = 'gpt-4.1-nano';
```

- validation must require `lessonId`, `phraseId`, `userAnswer`, and `targetAnswer`.
- call order must be:
  1. auth check
  2. sanitize/validate payload
  3. resolve stable uid
  4. resolve premium access
  5. enforce hourly rate limit
  6. enforce daily quota
  7. call OpenAI
  8. write billing metadata
  9. return `{ ok: true, text, remainingQuota }`

The prompt must include:

```ts
const system = `You explain one English lesson mistake inside Phraseman.
The learner is a Russian speaker and may be a beginner.
Explain ONLY the mismatch between USER_ANSWER and TARGET_ANSWER.
If SELECTED_WRONG_WORD and EXPECTED_WORD are present, focus on that pair.
Do not invent a different error.
Do not explain a general grammar topic unless it is necessary for this exact mismatch.
Keep it short: 1-3 sentences.
Use plain text only. No markdown. No emoji.`;
```

Modify `functions/src/index.ts`:

```ts
const { explainMistake } = require('./mistake_explain');
exports.explainMistake = explainMistake;
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
npx jest --runTestsByPath functions/src/mistake_explain.test.ts --no-cache --runInBand
```

Expected: pass.

---

## Task 5: AI Mistake Client And Smart Card

**Files:**
- Create: `app/ai_mistake_explain_client.ts`
- Create: `components/AiMistakeCard.tsx`
- Test: `tests/ai_mistake_explain_client_contract.test.ts`
- Test: `tests/ai_mistake_card_contract.test.ts`

- [ ] **Step 1: Write failing source-contract tests**

Create `tests/ai_mistake_explain_client_contract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

describe('ai mistake explain client contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_mistake_explain_client.ts'), 'utf8');

  it('calls explainMistake through Firebase functions after App Check init', () => {
    expect(source).toContain('initFirebaseAppCheckIfAvailable');
    expect(source).toContain("'explainMistake'");
    expect(source).toContain('lessonId');
    expect(source).toContain('phraseId');
    expect(source).toContain('userAnswer');
    expect(source).toContain('targetAnswer');
    expect(source).toContain('selectedWrongWord');
    expect(source).toContain('expectedWord');
  });
});
```

Create `tests/ai_mistake_card_contract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

describe('AiMistakeCard contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'AiMistakeCard.tsx'), 'utf8');

  it('shows a quota-aware smart card and does not decrement before success', () => {
    expect(source).toContain('getAiMistakeExplainsLeftToday');
    expect(source).toContain('markAiMistakeExplainUsed');
    expect(source).toContain('callExplainMistake');
    expect(source.indexOf('await callExplainMistake')).toBeLessThan(source.indexOf('await markAiMistakeExplainUsed'));
  });

  it('uses concrete wrong-answer context instead of generic phrase-only explanation', () => {
    expect(source).toContain('userAnswer');
    expect(source).toContain('targetAnswer');
    expect(source).toContain('selectedWrongWord');
    expect(source).toContain('expectedWord');
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npx jest --runTestsByPath tests/ai_mistake_explain_client_contract.test.ts tests/ai_mistake_card_contract.test.ts --no-cache --runInBand
```

Expected: fail because files do not exist.

- [ ] **Step 3: Implement client wrapper and card**

Create `app/ai_mistake_explain_client.ts`:

```ts
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import type { StudyTargetLang } from './study_target_lang_dev';
import type { Lang } from '../constants/i18n';

const FUNCTIONS_REGION = 'us-central1';

export interface ExplainMistakeRequest {
  lessonId: number;
  phraseId: string;
  userAnswer: string;
  targetAnswer: string;
  selectedWrongWord?: string;
  expectedWord?: string;
  studyTarget: StudyTargetLang;
  interfaceLang: Lang;
}

export interface ExplainMistakeResponse {
  ok: boolean;
  text: string;
  remainingQuota: number;
}

export async function callExplainMistake(req: ExplainMistakeRequest): Promise<ExplainMistakeResponse> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<ExplainMistakeRequest, ExplainMistakeResponse>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'explainMistake',
  );
  const res = await fn(req);
  return res.data;
}
```

Create `components/AiMistakeCard.tsx` with a compact card:

- props include `visible`, `lessonId`, `phraseId`, `userAnswer`, `targetAnswer`, `selectedWrongWord`, `expectedWord`, `studyTarget`, `lang`, `theme`, `font`.
- on button press:
  1. read local remaining
  2. if 0 show limit message
  3. call `callExplainMistake`
  4. if ok, call `markAiMistakeExplainUsed`
  5. show server text
- use `Ionicons name="sparkles-outline"` or `bulb-outline`.
- no emoji.
- no nested card inside another card.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npx jest --runTestsByPath tests/ai_mistake_explain_client_contract.test.ts tests/ai_mistake_card_contract.test.ts tests/ai_mistake_explain_limit.test.ts --no-cache --runInBand
```

Expected: pass.

---

## Task 6: Integrate Smart Card Into Lesson Runtime

**Files:**
- Modify: `app/lesson1.tsx`
- Test: `tests/lesson_ai_mistake_card_contract.test.ts`
- Re-run: `tests/explain_sheet.test.ts`

- [ ] **Step 1: Write failing source-contract test**

Create `tests/lesson_ai_mistake_card_contract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

describe('lesson AI mistake card integration', () => {
  it('renders AiMistakeCard after wrong answers with concrete answer context', () => {
    expect(source).toContain("import AiMistakeCard from '../components/AiMistakeCard'");
    expect(source).toContain('<AiMistakeCard');
    expect(source).toContain('userAnswer');
    expect(source).toContain('targetAnswer');
    expect(source).toContain('selectedWrongWord');
    expect(source).toContain('expectedWord');
  });

  it('keeps the existing ExplainSheet footer contract unchanged', () => {
    expect(source).toContain('const explainHintsLeft = Math.max(0, 3 + bonusHints - fiftyFiftyUsedToday)');
    expect(source).not.toContain('lesson1-explain-result');
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npx jest --runTestsByPath tests/lesson_ai_mistake_card_contract.test.ts tests/explain_sheet.test.ts --no-cache --runInBand
```

Expected: fail because `AiMistakeCard` is not integrated.

- [ ] **Step 3: Implement lesson context capture**

In `app/lesson1.tsx`, add state:

```ts
const [aiMistakeContext, setAiMistakeContext] = useState<{
  phraseId: string;
  userAnswer: string;
  targetAnswer: string;
  selectedWrongWord?: string;
  expectedWord?: string;
} | null>(null);
```

When an answer is wrong in `checkAnswer`, set:

```ts
setAiMistakeContext({
  phraseId: phrase.id,
  userAnswer: answer,
  targetAnswer: phraseCanonicalAnswer(phrase, studyTargetRef.current),
  selectedWrongWord: resolvedMistake?.selectedWrongWord,
  expectedWord: resolvedMistake?.expectedWord,
});
```

Use the existing mistake resolver output if it already exposes a selected/expected token. If not, pass only `userAnswer` and `targetAnswer` for this iteration.

Clear context on correct answer and on `goNext`.

Render under the answer/result explanation area:

```tsx
{aiMistakeContext && phrase && (
  <AiMistakeCard
    lessonId={lessonId}
    phraseId={aiMistakeContext.phraseId}
    userAnswer={aiMistakeContext.userAnswer}
    targetAnswer={aiMistakeContext.targetAnswer}
    selectedWrongWord={aiMistakeContext.selectedWrongWord}
    expectedWord={aiMistakeContext.expectedWord}
    studyTarget={studyTarget}
    lang={lang}
    t={t}
    f={f}
  />
)}
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
npx jest --runTestsByPath tests/lesson_ai_mistake_card_contract.test.ts tests/explain_sheet.test.ts --no-cache --runInBand
```

Expected: pass.

---

## Task 7: Final Verification

**Files:**
- No source changes unless a verification failure points to a specific bug.

- [ ] **Step 1: Run targeted app tests**

Run:

```bash
npx jest --runTestsByPath tests/lesson_dialog_scenarios.test.ts tests/ai_dialog_scenarios.test.ts tests/lesson_dialog_menu_contract.test.ts tests/ai_mistake_explain_limit.test.ts tests/ai_mistake_explain_client_contract.test.ts tests/ai_mistake_card_contract.test.ts tests/lesson_ai_mistake_card_contract.test.ts tests/explain_sheet.test.ts --no-cache --runInBand
```

Expected: all pass.

- [ ] **Step 2: Run function test**

Run:

```bash
npx jest --runTestsByPath functions/src/mistake_explain.test.ts --no-cache --runInBand
```

Expected: pass, with provider mocked and no real OpenAI calls.

- [ ] **Step 3: Run lesson audit**

Run:

```bash
npm run audit:lesson-sections
```

Expected: `OK: all lessons passed critical section checks`.

- [ ] **Step 4: Inspect dirty diff**

Run:

```bash
git diff -- app/ai_dialog_scenarios.ts app/ai_dialog_home.tsx app/lesson_dialog_scenarios.ts app/lesson_menu.tsx app/ai_mistake_explain_flags.ts app/ai_mistake_explain_limit_session.ts app/ai_mistake_explain_client.ts components/AiMistakeCard.tsx app/lesson1.tsx functions/src/mistake_explain.ts functions/src/index.ts
```

Expected: only the planned feature files changed. Existing unrelated edits in the workspace are not reverted.

---

## Self-Review

- Spec coverage: lesson menu dialog, gold gate, hidden lesson scenarios, existing dialog quota reuse, separate AI mistake quota, safety rules, and tests are covered.
- Placeholder scan: no TBD/TODO/implement-later placeholders are present.
- Type consistency: `DialogScenario`, `getLessonDialogScenarioId`, `ExplainMistakeRequest`, and `ExplainMistakeResponse` names match across tasks.
- Safety: all server quota checks happen before OpenAI calls; provider errors do not leak raw text to UI.
