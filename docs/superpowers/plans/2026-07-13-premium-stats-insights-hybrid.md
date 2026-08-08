# Premium Stats Insights Hybrid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вернуть Premium-only серверный ИИ для «Статистики», при этом вычислять все факты детерминированно, честно различать причины отсутствия перцентиля и выдавать неповторяющиеся персональные выводы.

**Architecture:** Новый чистый анализатор преобразует готовый снимок статистики в типизированные observation packets и локальные fallback-тексты. Экран ждёт завершения всех обязательных источников, клиент отправляет packets в защищённый `statsInsightsGenerate`, а сервер только переформулирует разрешённые факты и валидирует ответ. Старые карточки и показатели сохраняются; меняется только подготовка и доставка аналитических заметок.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage, React Native Firebase callable functions, Firebase Functions v2, Firestore, Jest.

---

## Карта файлов

- Create: `app/stats_insights_analysis.ts` — чистые типы состояния, построение observations, fingerprint и локальные fallback-тексты.
- Create: `tests/stats_insights_analysis.test.ts` — точность статусов перцентиля, ранжирование и дедупликация наблюдений.
- Modify: `app/leaderboard_stats.ts` — метаданные доступности, порога, размера и свежести выборки; безопасный stale-cache fallback.
- Modify: `tests/leaderboard_stats_active_sample.test.ts` — контракты `below_sample_floor`, `available`, `unavailable` и рассчитанного ранга ниже 50.
- Modify: `app/daily_analytics_sync.ts` — передача `userTotalXp` и метаданных сравнительной выборки экрану.
- Modify: `app/stats_insights_client.ts` — восстановление Premium callable, кэш версии v2 и локальный fallback без платного вызова при незрелых данных.
- Modify: `tests/stats_insights_client_copy.test.ts` — моки callable, cache/fallback/error contracts.
- Modify: `tests/openai_runtime_cost_contract.test.ts` — разрешить только защищённый stats callable и проверить ограничения расходов.
- Modify: `app/streak_stats.tsx` — единый briefing после готовности источников, лучший месяц, четыре видимых смысловых блока.
- Create: `tests/streak_stats_insights_wiring.test.ts` — статический контракт готовности и подключения всех блоков.
- Modify: `functions/src/stats_insights.ts` — новый briefing contract, prompt и строгая проверка observation ids/чисел/дубликатов.
- Modify: `functions/src/stats_insights.test.ts` — серверные prompt/parser/replay/budget-adjacent contracts.

### Task 1: Типизированная доступность перцентилей

**Files:**
- Modify: `app/leaderboard_stats.ts`
- Modify: `app/daily_analytics_sync.ts`
- Modify: `tests/leaderboard_stats_active_sample.test.ts`

- [ ] **Step 1: Написать падающие тесты статусов выборки**

Добавить проверки:

```ts
expect(belowFloor.sample.status).toBe('below_sample_floor');
expect(belowFloor.sample.minimumSampleXp).toBe(MIN_PERCENTILE_SAMPLE_XP);
expect(belowFloor.sample.userTotalXp).toBe(MIN_PERCENTILE_SAMPLE_XP - 1);

expect(available.sample.status).toBe('available');
expect(available.sample.totalUsers).toBeGreaterThan(0);

const unavailable = await computeAllPercentiles({ ...highMetricOpts, myXp: 9000 }, null);
expect(unavailable.sample.status).toBe('unavailable');
```

- [ ] **Step 2: Запустить тест и подтвердить ожидаемое падение**

Run: `npx jest --runTestsByPath tests/leaderboard_stats_active_sample.test.ts --no-cache --runInBand`

Expected: FAIL — у результата ещё нет поля `sample`, а `computeAllPercentiles` не принимает инъекцию `null`.

- [ ] **Step 3: Добавить модель состояния и тестовую инъекцию**

В `app/leaderboard_stats.ts` определить:

```ts
export type PercentileSampleStatus = 'unavailable' | 'below_sample_floor' | 'available';

export interface PercentileSampleMeta {
  status: PercentileSampleStatus;
  userTotalXp: number;
  minimumSampleXp: number;
  totalUsers: number;
  updatedAtMs: number | null;
  isStale: boolean;
}
```

Расширить `AllPercentiles` полем `sample`. В `computeAllPercentiles` принимать необязательный второй параметр `statsOverride?: GlobalLeaderboardStats | null`; `undefined` означает обычную загрузку, явный `null` — недоступную выборку для теста. Числовые перцентили рассчитывать только после определения метаданных, но не смешивать `null` с причиной.

- [ ] **Step 4: Возвращать последний валидный кэш при временной ошибке**

В `fetchLeaderboardStats` сохранить распарсенный AsyncStorage-кэш даже после истечения TTL и вернуть его с внутренним признаком stale только при сетевой ошибке. Не использовать повреждённый или пустой кэш. Публичная мета должна выставлять `isStale: true`, чтобы UI не называл выборку свежей.

- [ ] **Step 5: Передать метаданные экрану**

Расширить `loadPercentileData()`:

```ts
return {
  myXp7,
  myTime7ms,
  userTotalXp: myXp,
  percentiles,
};
```

- [ ] **Step 6: Запустить узкие тесты**

Run: `npx jest --runTestsByPath tests/leaderboard_stats_active_sample.test.ts tests/stats_percentile_display.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 7: Зафиксировать этап**

```powershell
git add -- app/leaderboard_stats.ts app/daily_analytics_sync.ts tests/leaderboard_stats_active_sample.test.ts
git commit -m "fix(stats): distinguish percentile availability states"
```

### Task 2: Детерминированный анализатор наблюдений

**Files:**
- Create: `app/stats_insights_analysis.ts`
- Create: `tests/stats_insights_analysis.test.ts`

- [ ] **Step 1: Написать падающие тесты анализа**

Покрыть пять сценариев:

```ts
it('does not call unavailable comparison a lack of user volume', () => {
  const result = buildStatsInsightAnalysis(snapshot({ sampleStatus: 'unavailable' }));
  expect(result.blocks.comparison.fallback.ru).toContain('временно недоступно');
  expect(result.blocks.comparison.fallback.ru).not.toContain('мало данных');
});

it('shows concrete progress to the sample floor', () => {
  const result = buildStatsInsightAnalysis(snapshot({ userTotalXp: 4200, minimumSampleXp: 5000 }));
  expect(result.blocks.comparison.facts).toEqual(expect.arrayContaining([4200, 5000]));
});

it('uses best month when activity provides it', () => {
  expect(buildStatsInsightAnalysis(snapshot({ bestMonth: 'май' })).blocks.longTerm.fallback.ru).toContain('май');
});

it('never assigns the same observation to adjacent blocks', () => {
  const ids = Object.values(buildStatsInsightAnalysis(snapshot()).blocks).map(block => block.observationId);
  expect(new Set(ids).size).toBe(ids.length);
});

it('changes emphasis when a previous observation id is supplied', () => {
  const first = buildStatsInsightAnalysis(snapshot());
  const second = buildStatsInsightAnalysis(snapshot(), Object.values(first.blocks).map(v => v.observationId));
  expect(second.blocks.week.observationId).not.toBe(first.blocks.week.observationId);
});
```

- [ ] **Step 2: Запустить тест и подтвердить ожидаемое падение**

Run: `npx jest --runTestsByPath tests/stats_insights_analysis.test.ts --no-cache --runInBand`

Expected: FAIL — модуль отсутствует.

- [ ] **Step 3: Определить вход, observations и четыре блока**

Создать типы:

```ts
export type StatsInsightBlockKey = 'week' | 'longTerm' | 'comparison' | 'lifetime';

export interface StatsInsightObservation {
  id: string;
  block: StatsInsightBlockKey;
  priority: number;
  facts: Array<string | number>;
  allowedClaim: string;
  allowedAction: string | null;
  fallback: Record<Lang, string>;
}

export interface StatsInsightAnalysis {
  fingerprint: string;
  blocks: Record<StatsInsightBlockKey, StatsInsightObservation>;
  generatedFromCompleteSnapshot: true;
}
```

Snapshot должен различать `number`, `null` и статусы источников; незагруженных полей в готовом snapshot быть не может.

- [ ] **Step 4: Реализовать кандидаты и стабильное ранжирование**

Создать кандидаты для недельной динамики, регулярности, лучшего дня, 30-дневного тренда, серий, лучшего месяца, milestones, слабой категории и сравнительной выборки. Сортировать по `priority`, затем по стабильному `id`; сначала исключать `previousObservationIds`, но возвращать лучший старый id, если нового подтверждённого наблюдения нет.

- [ ] **Step 5: Реализовать честные fallback-тексты для всех восьми языков**

Использовать `triLang` и существующий `Lang`. Для `unavailable`, `below_sample_floor`, `available_but_hidden` и `available` должны быть отдельные ветки. Ни одна ветка не вычисляет новый ранг или тренд.

- [ ] **Step 6: Запустить тесты анализатора**

Run: `npx jest --runTestsByPath tests/stats_insights_analysis.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 7: Зафиксировать этап**

```powershell
git add -- app/stats_insights_analysis.ts tests/stats_insights_analysis.test.ts
git commit -m "feat(stats): derive verified personal observations"
```

### Task 3: Готовый snapshot и правильное подключение экрана

**Files:**
- Modify: `app/streak_stats.tsx`
- Create: `tests/streak_stats_insights_wiring.test.ts`

- [ ] **Step 1: Написать падающий wiring-контракт**

Тест должен прочитать source и проверить явные сигналы:

```ts
expect(source).toContain("const [percentileLoadState, setPercentileLoadState] = useState<'loading' | 'ready' | 'unavailable'>");
expect(source).toContain('activityAnalytics?.bestMonth');
expect(source).toContain('buildStatsInsightAnalysis');
expect(source).toContain('percentileLoadState === \'loading\'');
expect(source).not.toContain("bestMonth: ''");
expect(source).toContain("renderAiNote('week'");
expect(source).toContain("renderAiNote('longTerm'");
expect(source).toContain("renderAiNote('comparison'");
expect(source).toContain("renderAiNote('lifetime'");
```

- [ ] **Step 2: Запустить тест и подтвердить ожидаемое падение**

Run: `npx jest --runTestsByPath tests/streak_stats_insights_wiring.test.ts --no-cache --runInBand`

Expected: FAIL — readiness и новые ключи ещё не подключены.

- [ ] **Step 3: Хранить явные состояния источников**

Добавить отдельные состояния для результата `loadActivity365Analytics()` и завершения `loadPercentileData()`. При начале обновления ставить `loading`; успешный результат с `sample.status !== 'unavailable'` даёт `ready`; завершившийся недоступный источник даёт `unavailable`.

- [ ] **Step 4: Строить analysis только после завершения обязательных загрузок**

Создать `useMemo` для snapshot и analysis. Пока percentile state равен `loading`, не вызывать `generateStatsInsights`. Передавать настоящий `bestMonth`, `userTotalXp`, sample metadata, недельное сравнение и lifetime totals.

- [ ] **Step 5: Удалить намеренно неполный dependency list**

Заменить эффект с `eslint-disable-next-line react-hooks/exhaustive-deps` на зависимости по `analysis.fingerprint`, Premium, target и lang. Это гарантирует, что поздний перцентиль создаёт новый briefing, но одинаковые рендеры не создают новые вызовы.

- [ ] **Step 6: Подключить четыре видимых заметки**

Обновить `renderAiNote` и места вставки: `week` под объединённой недельной карточкой, `longTerm` под 365-дневной активностью, `comparison` внутри/сразу после существующей сравнительной карточки только при наличии контекста, `lifetime` вместе с раскрытым блоком. Не удалять существующие карточки и показатели.

- [ ] **Step 7: Запустить wiring и текущие stats-тесты**

Run: `npx jest --runTestsByPath tests/streak_stats_insights_wiring.test.ts tests/streak_stats_practice_balance.test.ts tests/stats_tonal_hierarchy_contract.test.ts tests/stats_premium_access.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 8: Зафиксировать этап**

```powershell
git add -- app/streak_stats.tsx tests/streak_stats_insights_wiring.test.ts
git commit -m "fix(stats): wait for complete insight snapshot"
```

### Task 4: Вернуть защищённый Premium callable

**Files:**
- Modify: `app/stats_insights_client.ts`
- Modify: `tests/stats_insights_client_copy.test.ts`
- Modify: `tests/openai_runtime_cost_contract.test.ts`

- [ ] **Step 1: Написать client tests с мокнутым callable**

Проверить:

```ts
it('uses the server result for a complete premium analysis', async () => {
  mockStatsCallable.mockResolvedValue({ data: serverPayload });
  const state = await generateStatsInsights({ analysis, isPremium: true });
  expect(mockStatsCallable).toHaveBeenCalledTimes(1);
  expect(state.kind).toBe('cached');
});

it('does not call the server for free access', async () => {
  await generateStatsInsights({ analysis, isPremium: false });
  expect(mockStatsCallable).not.toHaveBeenCalled();
});

it('returns deterministic fallback when callable is offline', async () => {
  mockStatsCallable.mockRejectedValue(new Error('network unavailable'));
  const state = await generateStatsInsights({ analysis, isPremium: true });
  expect(state.kind).toBe('fallback');
  expect(state.notes.week).toBe(analysis.blocks.week.fallback.ru);
});
```

- [ ] **Step 2: Изменить cost contract до реализации**

Заменить запрет строки `statsInsightsGenerate` на точные проверки:

```ts
expect(stats).toContain("('statsInsightsGenerate')");
expect(stats).toContain('if (!isPremium)');
expect(stats).toContain('nextAllowedAtMs');
expect(stats).toContain('buildLocalStatsInsights');
```

Серверная часть cost-теста должна продолжать проверять `resolvePremiumAccess`, `enforceRateLimit`, `enforceGlobalBudget`, `readReplayOrAssertWindowOpen` и `commitWindow`.

- [ ] **Step 3: Запустить тесты и подтвердить ожидаемое падение**

Run: `npx jest --runTestsByPath tests/stats_insights_client_copy.test.ts tests/openai_runtime_cost_contract.test.ts --no-cache --runInBand`

Expected: FAIL — клиент пока использует только локальные шаблоны.

- [ ] **Step 4: Восстановить callable с текущими Firebase-паттернами**

Вернуть `CLOUD_SYNC_ENABLED`, `IS_EXPO_GO`, `ensureAnonUser`, `ensureStableAuthLinkForStableId` и typed `httpsCallable`. Тело запроса содержит `analysis`, но не доверяет клиентскому Premium-флагу как авторизации.

- [ ] **Step 5: Версионировать кэш**

Сохранять `fingerprint`, `observationIds`, `lang`, `studyTarget`, `generatedAtMs`, `nextAllowedAtMs` и четыре заметки. Старый v1-кэш нормализовать, но считать устаревшим для блокировки новой генерации, если нет fingerprint.

- [ ] **Step 6: Реализовать fallback без ложного успеха**

Добавить `kind: 'fallback'`. Offline/provider failure возвращает локальные тексты текущего analysis, но не создаёт успешный трёхдневный кэш и не заявляет, что серверная генерация состоялась. Существующий валидный server cache можно показывать мгновенно до тихого обновления.

- [ ] **Step 7: Запустить client/cost tests**

Run: `npx jest --runTestsByPath tests/stats_insights_client_copy.test.ts tests/openai_runtime_cost_contract.test.ts --no-cache --runInBand`

Expected: PASS, без сетевого OpenAI-вызова.

- [ ] **Step 8: Зафиксировать этап**

```powershell
git add -- app/stats_insights_client.ts tests/stats_insights_client_copy.test.ts tests/openai_runtime_cost_contract.test.ts
git commit -m "feat(stats): restore budgeted premium AI insights"
```

### Task 5: Серверный контракт observations и строгий prompt gate

**Files:**
- Modify: `functions/src/stats_insights.ts`
- Modify: `functions/src/stats_insights.test.ts`

- [ ] **Step 1: Написать падающие серверные тесты**

Добавить сценарии:

```ts
it('requires four visible block keys and observation ids', () => {
  const prompt = buildSystemPrompt('ru');
  for (const key of ['week', 'longTerm', 'comparison', 'lifetime']) expect(prompt).toContain(`"${key}"`);
  expect(prompt).toContain('observationId');
});

it('rejects an unknown observation id', () => {
  expect(() => parseAndGuardResult(modelJson({ week: { observationId: 'invented' } }), briefing)).toThrow();
});

it('rejects a number absent from allowed facts', () => {
  expect(() => parseAndGuardResult(modelJson({ week: { text: 'У тебя 999 активных дней' } }), briefing)).toThrow();
});

it('rejects duplicated notes', () => {
  expect(() => parseAndGuardResult(repeatedModelJson(), briefing)).toThrow('stats_insights_duplicate');
});
```

- [ ] **Step 2: Запустить функции-тест и подтвердить ожидаемое падение**

Run: `Set-Location functions; npx jest src/stats_insights.test.ts --no-coverage --runInBand`

Expected: FAIL — сервер ожидает старые пять ключей и не проверяет observation ids.

- [ ] **Step 3: Санитизировать observation packets**

Ограничить четыре блока, длину ids/claims/actions, количество и диапазон числовых facts. Не принимать произвольные дополнительные поля. `generatedFromCompleteSnapshot` должен быть строго `true`.

- [ ] **Step 4: Обновить промпт**

Промпт должен явно требовать JSON вида:

```json
{
  "week": { "observationId": "week_consistency_v1", "text": "..." },
  "longTerm": { "observationId": "long_best_month_v1", "text": "..." },
  "comparison": { "observationId": "comparison_available_v1", "text": "..." },
  "lifetime": { "observationId": "lifetime_words_v1", "text": "..." }
}
```

Запретить модели новые вычисления, числа вне `facts`, повтор факта/совета и трактовку `unavailable` как недостатка пользователя.

- [ ] **Step 5: Усилить parse-and-guard**

Для каждого блока проверить точное совпадение observation id, язык и допустимые числа. Нормализованные непустые тексты сравнить между блоками; одинаковые тексты или чрезмерное лексическое совпадение отклонить как `stats_insights_duplicate`. Невалидный ответ не передавать в `commitWindow`.

- [ ] **Step 6: Сохранить существующие ограничения расходов**

Не менять порядок: replay/window check → rate limit → global budget reservation → provider call → parse/guard → commit window. Premium по-прежнему определяется через `resolvePremiumAccess` на сервере.

- [ ] **Step 7: Запустить серверные тесты и no-emit typecheck**

Run: `Set-Location functions; npx jest src/stats_insights.test.ts --no-coverage --runInBand`

Run: `Set-Location functions; npx tsc --noEmit --pretty false`

Expected: оба PASS. Полный `npm run build` не выполнять в грязном рабочем дереве, чтобы не перезаписать несвязанные пользовательские `functions/lib/**`.

- [ ] **Step 8: Зафиксировать этап**

```powershell
git add -- functions/src/stats_insights.ts functions/src/stats_insights.test.ts
git commit -m "feat(stats): constrain AI to verified observations"
```

### Task 6: Интеграционные регрессии и обратная совместимость

**Files:**
- Modify: `tests/stats_insights_analysis.test.ts`
- Modify: `tests/stats_insights_client_copy.test.ts`
- Modify: `tests/streak_stats_insights_wiring.test.ts`
- Modify: `functions/src/stats_insights.test.ts`

- [ ] **Step 1: Добавить матрицу ключевых регрессий**

Обязательные строки матрицы: longtime/above-floor, below-floor, offline, stale global cache, percentile below 50, late percentile, missing best month, real zero, unavailable source, callable failure, wrong language, duplicate model output, legacy v1 cache.

- [ ] **Step 2: Запустить клиентскую матрицу**

Run: `npx jest --runTestsByPath tests/stats_insights_analysis.test.ts tests/stats_insights_client_copy.test.ts tests/streak_stats_insights_wiring.test.ts tests/leaderboard_stats_active_sample.test.ts tests/stats_percentile_display.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 3: Запустить серверную матрицу**

Run: `Set-Location functions; npx jest src/stats_insights.test.ts --no-coverage --runInBand`

Expected: PASS.

- [ ] **Step 4: Проверить отсутствие локального OpenAI-вызова в тестах**

Run: `npx jest --runTestsByPath tests/openai_runtime_cost_contract.test.ts --no-cache --runInBand`

Expected: PASS; тесты используют Firebase callable mock и не читают `OPENAI_API_KEY`.

- [ ] **Step 5: Зафиксировать регрессионный набор**

```powershell
git add -- tests/stats_insights_analysis.test.ts tests/stats_insights_client_copy.test.ts tests/streak_stats_insights_wiring.test.ts functions/src/stats_insights.test.ts
git commit -m "test(stats): guard premium insight accuracy"
```

### Task 7: Финальная узкая проверка

**Files:**
- Verify only; do not deploy.

- [ ] **Step 1: Проверить итоговый diff и чужие изменения**

Run: `git status --short`

Run: `git diff --check HEAD~5 -- app/stats_insights_analysis.ts app/leaderboard_stats.ts app/daily_analytics_sync.ts app/stats_insights_client.ts app/streak_stats.tsx functions/src/stats_insights.ts tests/stats_insights_analysis.test.ts tests/stats_insights_client_copy.test.ts tests/streak_stats_insights_wiring.test.ts tests/leaderboard_stats_active_sample.test.ts tests/openai_runtime_cost_contract.test.ts functions/src/stats_insights.test.ts`

Expected: только целевые файлы в коммитах этой работы; несвязанные пользовательские изменения сохранены.

- [ ] **Step 2: Запустить полный узкий клиентский gate**

Run: `npx jest --runTestsByPath tests/stats_insights_analysis.test.ts tests/stats_insights_client_copy.test.ts tests/streak_stats_insights_wiring.test.ts tests/leaderboard_stats_active_sample.test.ts tests/stats_percentile_display.test.ts tests/stats_tonal_hierarchy_contract.test.ts tests/stats_premium_access.test.ts tests/openai_runtime_cost_contract.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 3: Запустить полный узкий Functions gate**

Run: `Set-Location functions; npx jest src/stats_insights.test.ts --no-coverage --runInBand`

Expected: PASS.

- [ ] **Step 4: Проверить секреты только в целевом diff**

Run: `npm run scan:secrets:staged`

Expected: PASS.

- [ ] **Step 5: Не выполнять deployment**

Изменения `statsInsightsGenerate` требуют отдельного point-to-point deployment после пользовательского разрешения. В рамках реализации не запускать Firebase deploy и не вызывать production OpenAI API из Codex.

- [ ] **Step 6: Передать фактический diff и результаты Advisor**

Перед финальным заявлением о готовности предоставить Advisor objective, affected paths, итоговый diff, команды и результаты тестов, ограничения firewall и отсутствие deploy. При `CHANGES_REQUIRED` исправить замечания и повторить review фактического состояния.
