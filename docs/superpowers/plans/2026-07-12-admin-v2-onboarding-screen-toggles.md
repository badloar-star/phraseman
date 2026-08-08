# Admin v2 Onboarding Screen Toggles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в Admin v2 безопасные галочки показа экранов онбординга и заставить приложение пропускать отключённые шаги вперёд, назад и при восстановлении.

**Architecture:** Чистый модуль `app/onboarding_flow.ts` владеет каталогом шагов, разбором одного версионированного Remote Config-значения и вычислением маршрута. `CleanOnboarding` использует этот модуль для destination-aware переходов; Admin v2 редактирует тот же контракт через существующий preview/publish Remote Config workflow. Финальный `name` всегда принудительно включён.

**Tech Stack:** TypeScript, React Native/Expo, AsyncStorage, существующий Firestore Remote Config snapshot, vanilla JavaScript Admin v2, Jest.

---

## Карта файлов

- Create `app/onboarding_flow.ts`: канонический каталог, parser и чистые функции маршрута.
- Create `tests/onboarding_flow.test.ts`: unit-тесты parser/navigation/fail-safe.
- Modify `app/remote_flags.ts`: текстовый ключ и типобезопасный getter.
- Modify `components/CleanOnboarding.tsx`: фактический enabled order, next/back/restore/live reconciliation, destination-aware paywall effects.
- Create `tests/onboarding_disabled_steps_contract.test.ts`: контракт интеграции `CleanOnboarding` и защиты обязательного шага.
- Modify `admin/v2/scripts/admin-core.js`: карточка, draft, preview и обработчики действий.
- Modify `admin/v2/styles/admin.css`: доступная компактная строка переключателя без нового визуального языка.
- Create `tests/admin_v2_onboarding_steps_contract.test.ts`: каталог, обязательный шаг, merge-safe preview и publish contract.
- Modify `tests/remote_flags.test.ts`: default/cache/invalid value.
- Modify `scripts/admin-v2-language-audit.mjs` только если новый видимый русский текст требует регистрации по существующему контракту.

Не изменять `admin/index.html`: функция относится к native Admin v2 и не является workflow публикации ответов на жалобы.

### Task 0: Зафиксировать baseline общего грязного дерева

**Files:**
- Inspect only: `app/remote_flags.ts`, `components/CleanOnboarding.tsx`, `admin/v2/scripts/admin-core.js`, `admin/v2/styles/admin.css`, `scripts/admin-v2-language-audit.mjs`
- Create ignored evidence: `.codex-tmp/onboarding-screen-toggles-baseline/`

- [ ] **Step 1: сохранить точный исходный commit и список разрешённых путей**

```powershell
New-Item -ItemType Directory -Force '.codex-tmp/onboarding-screen-toggles-baseline' | Out-Null
git rev-parse HEAD | Set-Content '.codex-tmp/onboarding-screen-toggles-baseline/base-commit.txt'
git status --short | Set-Content '.codex-tmp/onboarding-screen-toggles-baseline/status-before.txt'
```

- [ ] **Step 2: сохранить staged и unstaged baseline каждого пересекающегося файла**

```powershell
$paths = @('app/remote_flags.ts','components/CleanOnboarding.tsx','admin/v2/scripts/admin-core.js','admin/v2/styles/admin.css','scripts/admin-v2-language-audit.mjs')
git diff -- $paths | Set-Content '.codex-tmp/onboarding-screen-toggles-baseline/unstaged-before.patch'
git diff --cached -- $paths | Set-Content '.codex-tmp/onboarding-screen-toggles-baseline/staged-before.patch'
git diff --numstat -- $paths | Set-Content '.codex-tmp/onboarding-screen-toggles-baseline/unstaged-numstat-before.txt'
git diff --cached --numstat -- $paths | Set-Content '.codex-tmp/onboarding-screen-toggles-baseline/staged-numstat-before.txt'
```

- [ ] **Step 3: понять существующие изменения до редактирования**

Просмотреть оба patch-файла и текущий код вокруг планируемых точек. Если существующая правка меняет тот же переход, Remote Config contract или `renderApplication()`, согласовать реализацию с ней. Если собственный hunk нельзя отделить без перезаписи чужой логики, остановиться и запросить координацию. Не применять `reset`, `checkout`, `restore` или `stash`.

- [ ] **Step 4: зафиксировать правило коммитов**

Новые изолированные файлы можно коммитить обычным `git add -- exact/path`. Пересекающиеся существующие файлы нельзя добавлять целиком: их собственные hunks остаются незакоммиченными до безопасного выделения. Если выделение возможно, создать patch только собственных hunks, проверить его содержимое и применить в индекс через `git apply --cached`; иначе не создавать смешанный коммит и явно сообщить об этом.

### Task 1: Чистый контракт маршрута

**Files:**
- Create: `app/onboarding_flow.ts`
- Create: `tests/onboarding_flow.test.ts`

- [ ] **Step 1: написать падающие тесты каталога, parser и навигации**

Зафиксировать API:

```ts
import {
  MANDATORY_ONBOARDING_STEP,
  ONBOARDING_STEP_CATALOG,
  parseEnabledOnboardingSteps,
  resolveEnabledOnboardingOrder,
  resolveOnboardingStep,
} from '../app/onboarding_flow';

test('name remains enabled even when omitted remotely', () => {
  expect(parseEnabledOnboardingSteps('[]')).toContain(MANDATORY_ONBOARDING_STEP);
});

test('invalid config fails safe to the full catalog', () => {
  expect(parseEnabledOnboardingSteps('{broken')).toEqual(
    ONBOARDING_STEP_CATALOG.map(({ id }) => id),
  );
});

test('forward and backward skip adjacent disabled steps', () => {
  const order = resolveEnabledOnboardingOrder(['welcome', 'goal', 'name'], false);
  expect(resolveOnboardingStep(order, 'welcome', 'forward')).toBe('goal');
  expect(resolveOnboardingStep(order, 'name', 'backward')).toBe('goal');
});

test('a disabled restored step resolves forward', () => {
  const order = resolveEnabledOnboardingOrder(['welcome', 'minutes', 'name'], false);
  expect(resolveOnboardingStep(order, 'goal', 'current-or-forward')).toBe('minutes');
});
```

- [ ] **Step 2: запустить RED**

Run: `npx jest tests/onboarding_flow.test.ts --runInBand`  
Expected: FAIL because `app/onboarding_flow.ts` does not exist.

- [ ] **Step 3: реализовать минимальный чистый модуль**

Определить стабильные типы и функции:

```ts
export type OnboardingStepId =
  | 'welcome' | 'source' | 'language' | 'level' | 'goal' | 'minutes'
  | 'aha' | 'notifications' | 'plusBenefits' | 'startMode'
  | 'planComparison' | 'onboardingPaywall' | 'name';

export const MANDATORY_ONBOARDING_STEP: OnboardingStepId = 'name';
export const ONBOARDING_ENABLED_STEPS_TEXT_KEY = 'onboarding_enabled_steps_v1';

export const ONBOARDING_STEP_CATALOG: readonly {
  id: OnboardingStepId;
  label: string;
  description: string;
  mandatory?: boolean;
}[] = [
  { id: 'welcome', label: 'Приветствие', description: 'Первый экран знакомства.' },
  { id: 'source', label: 'Источник', description: 'Откуда пользователь узнал о приложении.' },
  { id: 'language', label: 'Язык', description: 'Выбор изучаемого языка.' },
  { id: 'level', label: 'Уровень', description: 'Текущий уровень языка.' },
  { id: 'goal', label: 'Цель', description: 'Цель обучения.' },
  { id: 'minutes', label: 'Время занятий', description: 'Ежедневный темп.' },
  { id: 'aha', label: 'Демонстрация', description: 'Практическая демонстрация обучения.' },
  { id: 'notifications', label: 'Уведомления', description: 'Предложение включить уведомления.' },
  { id: 'plusBenefits', label: 'Преимущества Plus', description: 'Обзор преимуществ подписки.' },
  { id: 'startMode', label: 'Режим старта', description: 'Выбор способа начать обучение.' },
  { id: 'planComparison', label: 'Сравнение планов', description: 'Сравнение вариантов доступа.' },
  { id: 'onboardingPaywall', label: 'Предложение подписки', description: 'Экран покупки.' },
  { id: 'name', label: 'Имя и согласия', description: 'Возраст и обязательные условия.', mandatory: true },
];

export function parseEnabledOnboardingSteps(raw: string | null | undefined): OnboardingStepId[];
export function resolveEnabledOnboardingOrder(
  remotelyEnabled: readonly OnboardingStepId[],
  showLanguageStep: boolean,
): OnboardingStepId[];
export function resolveOnboardingStep(
  enabledOrder: readonly OnboardingStepId[],
  anchor: OnboardingStepId,
  direction: 'forward' | 'backward' | 'current-or-forward',
): OnboardingStepId;
```

Parser принимает только JSON-массив строк, игнорирует неизвестные id, восстанавливает канонический порядок и всегда добавляет `name`. Невалидное/отсутствующее значение возвращает полный каталог.

- [ ] **Step 4: запустить GREEN**

Run: `npx jest tests/onboarding_flow.test.ts --runInBand`  
Expected: PASS.

- [ ] **Step 5: закоммитить изолированно**

```powershell
git add -- app/onboarding_flow.ts tests/onboarding_flow.test.ts
git commit -m "feat: add configurable onboarding flow contract"
```

### Task 2: Подключить текстовый Remote Config ключ и реальный offline cache

**Files:**
- Modify: `app/remote_flags.ts`
- Modify: `app/remote_config_client.ts` только если для тестирования требуется экспорт узкого cache-loader без изменения поведения
- Modify: `tests/remote_flags.test.ts`
- Create: `tests/remote_config_onboarding_cache.test.ts`

- [ ] **Step 1: написать падающие тесты getter и кеша**

```ts
test('onboarding enabled steps use full flow when text is absent or invalid', () => {
  expect(getEnabledOnboardingSteps()).toEqual(
    ONBOARDING_STEP_CATALOG.map(({ id }) => id),
  );
  applyRemoteConfigSnapshot({ texts: { onboarding_enabled_steps_v1: '{bad' } });
  expect(getEnabledOnboardingSteps()).toEqual(
    ONBOARDING_STEP_CATALOG.map(({ id }) => id),
  );
});

test('onboarding enabled steps use a valid cached snapshot', () => {
  applyRemoteConfigSnapshot({ texts: { onboarding_enabled_steps_v1: '["welcome","name"]' } });
  expect(getEnabledOnboardingSteps()).toEqual(['welcome', 'name']);
});
```

В `tests/remote_config_onboarding_cache.test.ts` замокать AsyncStorage и недоступный Firestore, записать `remote_config_cache_v1` с валидным `texts.onboarding_enabled_steps_v1`, вызвать существующий startup loader и проверить getter. Второй тест кладёт повреждённое значение и ожидает полный маршрут. Это тестирует путь `AsyncStorage cache → sanitize/apply → getter`, а не только ручной snapshot.

- [ ] **Step 2: запустить RED**

Run: `npx jest tests/remote_flags.test.ts tests/remote_config_onboarding_cache.test.ts --runInBand`
Expected: FAIL because `getEnabledOnboardingSteps` is missing.

- [ ] **Step 3: реализовать getter без отдельной сети или хранилища**

Добавить `onboarding_enabled_steps_v1` в существующий тип текстовых ключей/default texts и экспортировать:

```ts
export function getEnabledOnboardingSteps(): OnboardingStepId[] {
  return parseEnabledOnboardingSteps(getRemoteText(ONBOARDING_ENABLED_STEPS_TEXT_KEY));
}
```

Не менять `remote_config_client.ts`: валидный кеш уже применяется через существующий snapshot path.

- [ ] **Step 4: запустить GREEN**

Run: `npx jest tests/remote_flags.test.ts tests/remote_config_onboarding_cache.test.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: закоммитить только новый изолированный cache test**

```powershell
git add -- tests/remote_config_onboarding_cache.test.ts
git commit -m "test: cover cached onboarding remote config"
```

Изменения `app/remote_flags.ts`, существующего `tests/remote_flags.test.ts` и возможного `app/remote_config_client.ts` не добавлять целиком; вести их как собственные hunks по правилу Task 0.

### Task 3: Перевести CleanOnboarding на фактический маршрут

**Files:**
- Modify: `components/CleanOnboarding.tsx`
- Create: `tests/onboarding_disabled_steps_contract.test.ts`

- [ ] **Step 1: написать падающий контракт интеграции**

Проверить, что компонент импортирует общий каталог/getter, не вычисляет Back через статический `CLEAN_ONBOARDING_ORDER[index - 1]`, использует `resolveOnboardingStep` для restore и имеет destination-aware helper:

```ts
expect(source).toContain('getEnabledOnboardingSteps');
expect(source).toContain('resolveOnboardingStep');
expect(source).toContain('transitionToResolvedDestination');
expect(source).not.toContain('go(CLEAN_ONBOARDING_ORDER[index - 1])');
expect(source).toContain("destination === 'onboardingPaywall'");
```

Добавить чистую функцию решения эффектов:

```ts
export type OnboardingTransitionDecision = {
  destination: OnboardingStepId;
  preparePaywall: boolean;
  createPendingPlan: boolean;
  trackPaywallView: boolean;
};

export function decideOnboardingTransition(
  enabledOrder: readonly OnboardingStepId[],
  anchor: OnboardingStepId,
): OnboardingTransitionDecision;
```

Для всех 8 комбинаций включения `startMode`, `planComparison`, `onboardingPaywall` проверить не только destination, но и три effect-флага. Если destination — `onboardingPaywall`, каждый флаг `true`; при переходе к `name` каждый `false`. Интеграционный тест с инъецированными jest spies вызывает transition дважды под busy/idempotency guard и доказывает, что prepare, pending-plan и `paywall_view` выполняются ровно один раз.

- [ ] **Step 2: запустить RED**

Run: `npx jest tests/onboarding_flow.test.ts tests/onboarding_disabled_steps_contract.test.ts --runInBand`  
Expected: FAIL on missing integration/helper.

- [ ] **Step 3: реализовать enabled order и централизованные переходы**

В `CleanOnboarding`:

```ts
const [remoteEnabledSteps, setRemoteEnabledSteps] = useState(getEnabledOnboardingSteps);
const enabledOrder = useMemo(
  () => resolveEnabledOnboardingOrder(remoteEnabledSteps, SHOW_ONBOARDING_LANGUAGE_STEP),
  [remoteEnabledSteps],
);

const goRelative = useCallback((anchor: CleanOnboardingStep, direction: FlowDirection) => {
  const destination = resolveOnboardingStep(enabledOrder, anchor, direction);
  transitionToResolvedDestination(destination);
}, [enabledOrder, transitionToResolvedDestination]);
```

Заменить прямые next/back/restore переходы на вычисление destination. `transitionToResolvedDestination` выполняет подготовку/pending state/paywall-view analytics только когда `destination === 'onboardingPaywall'`. Пропуск `planComparison` не мешает подготовить реально включённый paywall; пропуск обоих не запускает их эффекты.

Подписаться на существующее событие изменения snapshot тем же способом, который уже принят у других remote flags. При отключении текущего шага reconcile использует `current-or-forward`; во время `paywallBusy`/покупки откладывает reconcile до завершения операции.

Восстановление сохранённого шага также проходит через `current-or-forward`. `startAtNameStep` остаётся прямым защищённым входом в обязательный шаг.

- [ ] **Step 4: пересчитать прогресс по enabledOrder**

Удалить статический `STEP_PROGRESS_INDEX/PROGRESS_TOTAL` из пользовательского расчёта. Индекс и total брать из `enabledOrder`, исключая непрогрессовый welcome только если прежняя визуальная семантика делала то же самое.

- [ ] **Step 5: запустить GREEN**

Run: `npx jest tests/onboarding_flow.test.ts tests/onboarding_disabled_steps_contract.test.ts tests/remote_flags.test.ts --runInBand`  
Expected: PASS with zero failures.

- [ ] **Step 6: закоммитить только новые изолированные тесты**

```powershell
git add -- tests/onboarding_disabled_steps_contract.test.ts
git commit -m "test: cover disabled onboarding transitions"
```

Изменения пересекающегося `components/CleanOnboarding.tsx` и уже закоммиченного `tests/onboarding_flow.test.ts` вести как собственные hunks; не добавлять весь файл поверх baseline.

### Task 4: Добавить карточку галочек в Admin v2

**Files:**
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/styles/admin.css`
- Create: `tests/admin_v2_onboarding_steps_contract.test.ts`

- [ ] **Step 1: написать падающий Admin v2 contract**

Проверить стабильные id/action, все 13 названий, disabled mandatory checkbox и merge с текущей конфигурацией:

```ts
expect(core).toContain('onboarding_enabled_steps_v1');
expect(core).toContain('preview-onboarding-steps');
expect(core).toContain('data-onboarding-step="name"');
expect(core).toMatch(/data-onboarding-step="name"[^>]*disabled/);
expect(core).toContain('publishRemoteConfig');
expect(core).toContain('expectedRevision');
```

Тест helper-функции preview должен доказать, что меняется только `texts.onboarding_enabled_steps_v1`, а чужие `bools`, `numbers` и `texts` сохраняются.

- [ ] **Step 2: запустить RED**

Run: `npx jest tests/admin_v2_onboarding_steps_contract.test.ts --runInBand`  
Expected: FAIL because the card/actions do not exist.

- [ ] **Step 3: реализовать карточку внутри `renderApplication()`**

Добавить локальный admin-каталог с теми же стабильными id/labels/descriptions и helper:

```js
function buildOnboardingStepsPreview(currentConfig, selectedSteps, reason) {
  const enabled = ONBOARDING_STEP_CATALOG
    .filter((step) => step.mandatory || selectedSteps.has(step.id))
    .map((step) => step.id);
  const nextConfig = structuredClone(currentConfig);
  nextConfig.texts = { ...(currentConfig.texts || {}), onboarding_enabled_steps_v1: JSON.stringify(enabled) };
  return { nextConfig, reason, changes: diffRemoteConfig(currentConfig, nextConfig), source: 'onboarding-steps' };
}
```

UI: спокойная карточка «Экраны онбординга», строки в каноническом порядке, нативные checkbox с видимыми labels, tooltip/title, текстовым статусом. `name` checked+disabled с badge «Обязательный». `language` помечен «Недоступен в текущей версии» и не обещает удалённое включение.

Использовать существующие `state.remoteConfig`, `state.remoteConfigPreview`, `runBusy`, `actions.publishRemoteConfig`; никаких прямых Firestore writes.

- [ ] **Step 4: добавить preview/reason/publish actions**

`preview-onboarding-steps` требует непустую причину и создаёт `state.remoteConfigPreview`. Общий `publish-remote-config` уже публикует `nextConfig` с `expectedRevision`, idempotency key и audit; расширить его source allowlist, не создавать второй writer.

- [ ] **Step 5: добавить минимальные стили доступности**

Использовать текущие CSS tokens. Минимум: 44px row hit area, `cursor:pointer` только на доступных строках, `:focus-visible` outline, disabled state не только цветом, responsive без горизонтальной прокрутки.

- [ ] **Step 6: запустить GREEN и admin-аудиты**

Run:

```powershell
npx jest tests/admin_v2_onboarding_steps_contract.test.ts tests/admin_v2_remote_config_contract.test.ts --runInBand
node --check admin/v2/scripts/admin-core.js
node scripts/admin-v2-language-audit.mjs
node scripts/admin-v2-tooltip-audit.mjs
node scripts/admin-v2-smoke.mjs
```

Expected: all commands exit 0. Если language audit перечисляет только новый видимый текст, зарегистрировать его существующим способом и повторить audit; не переводить action ids или Remote Config keys.

- [ ] **Step 7: не смешивать существующие Admin v2 изменения**

```powershell
git add -- tests/admin_v2_onboarding_steps_contract.test.ts
git commit -m "test: cover admin onboarding screen controls"
```

`admin-core.js`, `admin.css` и language audit уже имеют baseline-изменения: сохранить собственные hunks отдельно по Task 0 и не добавлять файлы целиком.

### Task 5: Финальная интеграционная проверка

**Files:**
- Verify only; исправлять только файлы из карты выше при подтверждённом дефекте.

- [ ] **Step 1: проверить требования по спецификации**

Сверить по пунктам: mandatory legal; forward/back/restore; all-disabled; cached offline; invalid fail-safe; live forward-only; paywall combinations; Admin preview/reason/revision/audit/restore; no completed-user restart.

- [ ] **Step 2: запустить свежий узкий gate**

```powershell
npx jest tests/onboarding_flow.test.ts tests/onboarding_disabled_steps_contract.test.ts tests/remote_flags.test.ts tests/admin_v2_onboarding_steps_contract.test.ts tests/admin_v2_remote_config_contract.test.ts --runInBand
node --check admin/v2/scripts/admin-core.js
node scripts/admin-v2-language-audit.mjs
node scripts/admin-v2-tooltip-audit.mjs
node scripts/admin-v2-smoke.mjs
git diff --check
```

Expected: every command exits 0; Jest reports zero failed suites/tests.

- [ ] **Step 3: проверить diff без вмешательства в чужие изменения**

Прочитать точный base из `.codex-tmp/onboarding-screen-toggles-baseline/base-commit.txt`, но не полагаться только на диапазон commit-ов: параллельно сравнить текущие staged/unstaged patches с сохранёнными `*-before.patch`. Итоговый список собственных путей должен быть подмножеством карты файлов, а каждый собственный hunk — относиться к этой функции. Не делать reset/checkout/stash существующих пользовательских изменений.

- [ ] **Step 4: запросить финальный Advisor review**

Перед отчётом передать Advisor objective, spec, итоговый diff, команды и результаты проверки. При `CHANGES_REQUIRED` исправить через новый RED/GREEN цикл и повторить review до `APPROVED`.

- [ ] **Step 5: сохранить пользовательский индекс и не коммитить пересекающиеся implementation-hunks**

Для новых изолированных файлов допустим только явный `git add -- exact/path` и отдельный коммит. Любой implementation-hunk или финальное исправление в файле, который существовал и был изменён в baseline, оставить в рабочем дереве незакоммиченным: не выполнять для него `git add`, `git apply --cached` или `git commit`. Это сознательное ограничение общего грязного дерева, исключающее попадание чужих staged-изменений в наш commit.

После завершения доказать одновременно:

- текущий `git diff --cached` для пересекающихся файлов идентичен `.codex-tmp/onboarding-screen-toggles-baseline/staged-before.patch`;
- исходные unstaged baseline-hunks не исчезли и не были перезаписаны; поверх них появились только проверенные собственные hunks функции;
- `git show` каждого созданного в ходе работы commit содержит только новые изолированные файлы этой функции.

В финальном отчёте явно перечислить незакоммиченные implementation-файлы и объяснить, что они оставлены так для сохранности пользовательского индекса. Не создавать смешанных или пустых коммитов.
