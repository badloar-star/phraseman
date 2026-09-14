# Revenue VNext Epic 0 Commercial Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every known false commercial claim and access-routing inconsistency before changing quotas, energy, or pearl utility.

**Architecture:** Canonical paywall contexts live in `app/premium_context.ts`; route decisions wait for entitlement resolution; commercial copy is truthful in all nine locales; Remote Config/admin surfaces distinguish active controls from compatibility fields. Existing paywall UI is immutable, and all pearl actions continue to use composite operations.

**Tech Stack:** React Native, Expo Router, TypeScript, RevenueCat access context, Remote Config, Jest/RNTL, source-contract tests, `admin/v2/legacy.html`.

---

## Files and responsibilities

- `app/main_course_plus_copy.ts` — shared active Plus benefits for main-course paywalls.
- `app/flashcards_blitz_session.tsx` — direct Blitz access lifecycle.
- `app/lesson_complete.tsx` — post-lesson soft-upsell copy and navigation.
- `app/premium_context.ts` — canonical paywall context type and runtime allowlist.
- `components/CleanOnboarding.tsx` — embedded onboarding paywall purchase context.
- `app/season_pass.tsx` — Season Pass premium-lane routing and entitlement.
- `app/feature_access_resolution.ts` — pure fail-closed access-resolution decision.
- `app/flashcards_swipe.tsx` — Swipe direct-route access guard.
- `app/streak_stats.tsx` — stats-screen streak-freeze price consumer.
- `app/remote_flags.ts` — compatibility configuration and active value readers.
- `admin/v2/legacy.html` — only live admin control surface.
- `app/shop.tsx` — DEV-only preview surface until Epic 4 provides composite grants.
- `docs/monetization/REVENUE_VNEXT_TECH_DEBT.md` — governed debt register.

### Task 1: Create the technical-debt register

**Files:**
- Create: `docs/monetization/REVENUE_VNEXT_TECH_DEBT.md`

- [x] **Step 1: Write the register with the known Epic 0 debt**

Use this schema for every row:

```markdown
| ID | Severity | Contract / user impact | Evidence | Owner epic | Exit condition | Guard | State |
|---|---|---|---|---|---|---|---|
| RVTD-001 | P1 | Lesson completion claims Plus unlocks a course that is already free | `app/lesson_complete.tsx` | Epic 0 | All nine locales state that 32 lessons remain free | `tests/main_course_truth_copy_contract.test.ts` | open |
| RVTD-002 | P1 | Onboarding purchase uses retired `personal_plan` context | `components/CleanOnboarding.tsx` | Epic 0 | Runtime emits `onboarding_plan` | `tests/revenue_vnext_context_contract.test.ts` | open |
| RVTD-003 | P1 | Season Pass commercial model and paywall context conflict with VNext | `app/season_pass.tsx` | Epic 0 | Free lane is free; Plus or 250 pearls opens premium lane | `tests/season_pass_purchase_gate_contract.test.ts` | open |
| RVTD-004 | P1 | Swipe redirects before entitlement hydration | `app/flashcards_swipe.tsx` | Epic 0 | Unresolved waits; resolved denied redirects once | `tests/flashcards_swipe_access_behavior.test.ts` | open |
| RVTD-005 | P2 | Stats screen hard-codes streak-freeze price | `app/streak_stats.tsx` | Epic 0 | Both purchase surfaces use the Remote Config getter | `tests/streak_freeze_price_source_contract.test.ts` | open |
| RVTD-006 | P1 | Admin lesson controls contradict fixed-free runtime | `admin/v2/legacy.html` | Epic 0 | Fixed policy is read-only and compatibility values are labeled | `tests/revenue_vnext_control_plane_contract.test.ts` | closed |
| RVTD-007 | P1 | DEV shop reports grants it never commits | `app/shop.tsx` | Epic 0 | Preview cannot claim or simulate a completed purchase | `tests/revenue_vnext_dev_shop_contract.test.ts` | closed |
```

- [x] **Step 2: Verify the register contains no undefined state**

Run:

```powershell
rg -n "TBD|TODO|FIXME|unknown" docs/monetization/REVENUE_VNEXT_TECH_DEBT.md
```

Expected: no output.

### Task 2: Preserve the already-completed truth and Blitz fixes

**Files:**
- Verify: `app/main_course_plus_copy.ts`
- Verify: `app/flashcards_blitz_session.tsx`
- Test: `tests/flashcards_blitz_access_behavior.test.ts`
- Test: `tests/monetization_truth_and_blitz_gate_contract.test.ts`
- Test: `tests/paywall_english_wiring_contract.test.ts`

- [x] **Step 1: Replace Personal Plan sales copy with Unlimited energy in all nine locales**

- [x] **Step 2: Add the fail-closed Blitz route guard and idempotent late-spend refund**

- [x] **Step 3: Correct English first-time and win-back wiring across A–G**

- [x] **Step 4: Re-run the focused regression set before building on it**

Run under the shared semaphore:

```powershell
npx cross-env NODE_OPTIONS=--max-old-space-size=8192 jest tests/flashcards_blitz_access_behavior.test.ts tests/monetization_truth_and_blitz_gate_contract.test.ts tests/paywall_english_wiring_contract.test.ts --runInBand --no-cache --forceExit
```

Expected: all suites and tests pass; denied Blitz performs no deck, energy, timer, result, or rune work.

### Task 3: Make post-lesson commercial copy truthful

**Files:**
- Modify: `app/lesson_complete.tsx`
- Create: `tests/main_course_truth_copy_contract.test.ts`

- [x] **Step 1: Write the failing nine-locale truth test**

```ts
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_complete.tsx'), 'utf8');

describe('main course completion copy is commercially truthful', () => {
  test('does not claim that Plus unlocks lessons or that only three lessons are free', () => {
    expect(source).not.toMatch(/Plus (?:откроет|відкриє|unlocks|abre|libera|mở|membuka|açar|otwiera) (?:все|всі|every|todas|todas as|mọi|semua|tüm|wszystkie) (?:уроки|уроки|lesson|lecciones|lições|bài học|pelajaran|ders|lekcje)/i);
    expect(source).not.toMatch(/3 (?:бесплатных|безкоштовні|free|lecciones gratis|lições grátis|bài miễn phí|pelajaran gratis|ücretsiz ders|darmowe lekcje)/i);
  });

  test('states the free-course truth and real Plus value in every locale record', () => {
    expect(source.match(/32/g)?.length ?? 0).toBeGreaterThanOrEqual(9);
    expect(source).toContain('Все 32 урока остаются бесплатными');
    expect(source).toContain('All 32 lessons remain free');
    expect(source).toContain('Plus снимает паузы энергии');
    expect(source).toContain('Plus removes energy pauses');
  });
});
```

- [x] **Step 2: Run the test and verify RED**

Run:

```powershell
npx jest tests/main_course_truth_copy_contract.test.ts --runInBand --no-cache
```

Expected: FAIL on the retired lesson-lock claims.

- [x] **Step 3: Replace both soft-upsell bodies in all nine locale records**

Use these approved semantic messages; preserve existing CTA and accessibility fields:

```ts
// first lesson
ru: 'Все 32 урока остаются бесплатными. Plus снимает паузы энергии и открывает больше разговорной практики, тренировок и статистики.'
en: 'All 32 lessons remain free. Plus removes energy pauses and unlocks more speaking practice, training, and progress insights.'
uk: 'Усі 32 уроки залишаються безкоштовними. Plus прибирає паузи енергії та відкриває більше розмовної практики, тренувань і статистики.'
es: 'Las 32 lecciones siguen siendo gratis. Plus elimina las pausas de energía y abre más práctica oral, entrenamientos y estadísticas.'
'pt-BR': 'As 32 lições continuam grátis. O Plus remove as pausas de energia e libera mais prática de fala, treinos e estatísticas.'
vi: 'Cả 32 bài học vẫn miễn phí. Plus bỏ thời gian chờ năng lượng và mở thêm luyện nói, luyện tập cùng thống kê chuyên sâu.'
id: 'Semua 32 pelajaran tetap gratis. Plus menghapus jeda energi dan membuka lebih banyak latihan bicara, latihan kartu, serta statistik mendalam.'
tr: '32 dersin tamamı ücretsiz kalır. Plus enerji beklemelerini kaldırır; daha fazla konuşma, alıştırma ve ayrıntılı istatistik açar.'
pl: 'Wszystkie 32 lekcje pozostają bezpłatne. Plus usuwa przerwy na energię i otwiera więcej mówienia, treningów oraz szczegółowych statystyk.'
```

For the second message, use these exact titles and reuse the truthful body above:

```ts
ru: 'Три урока — отличный старт'
en: 'Three lessons — a strong start'
uk: 'Три уроки — чудовий старт'
es: 'Tres lecciones: un gran comienzo'
'pt-BR': 'Três lições: um ótimo começo'
vi: 'Ba bài học — một khởi đầu tốt'
id: 'Tiga pelajaran — awal yang kuat'
tr: 'Üç ders — güçlü bir başlangıç'
pl: 'Trzy lekcje — świetny początek'
```

- [x] **Step 4: Run the focused copy tests**

Run:

```powershell
npx jest tests/main_course_truth_copy_contract.test.ts tests/lesson_complete_soft_upsell_contract.test.ts tests/lesson_complete_soft_upsell_behavior.test.ts --runInBand --no-cache
```

Expected: PASS.

### Task 4: Add canonical onboarding and Season Pass contexts

**Files:**
- Modify: `app/premium_context.ts`
- Modify: `components/CleanOnboarding.tsx`
- Modify: `app/season_pass.tsx`
- Modify: `app/paywall_copy.ts`
- Test: `tests/revenue_vnext_context_contract.test.ts`

- [x] **Step 1: Write the failing context contract**

```ts
import { PREMIUM_CONTEXT_SET } from '../app/premium_context';
import fs from 'fs';
import path from 'path';

const onboarding = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
const season = fs.readFileSync(path.join(process.cwd(), 'app', 'season_pass.tsx'), 'utf8');

test('Revenue VNext contexts are canonical and retired acquisition context is absent', () => {
  expect(PREMIUM_CONTEXT_SET.has('onboarding_plan' as never)).toBe(true);
  expect(PREMIUM_CONTEXT_SET.has('season_pass_lane' as never)).toBe(true);
  expect(onboarding).toContain("context: 'onboarding_plan'");
  expect(onboarding).not.toContain("context: 'personal_plan'");
  expect(season).toContain("context: 'season_pass_lane'");
});
```

- [x] **Step 2: Run the context test and verify RED**

Run:

```powershell
npx jest tests/revenue_vnext_context_contract.test.ts --runInBand --no-cache
```

Expected: FAIL because both values are missing from `PremiumContext` and onboarding still sends `personal_plan`.

- [x] **Step 3: Add both union members and both allowlist values**

```ts
export type PremiumContext =
  | 'onboarding_plan'
  | 'season_pass_lane'
  // existing values remain unchanged
```

Add the same values to `PREMIUM_CONTEXT_VALUES`. Do not remove grandfathered Personal Plan runtime code in this task.

- [x] **Step 4: Route existing surfaces through the canonical contexts**

In `CleanOnboarding`, change only the purchase-hook argument:

```ts
usePaywallPurchase({
  variant: 'C',
  context: 'onboarding_plan',
  source: 'onboarding_plan',
  lang,
  forceTrialUI: true,
});
```

Keep the existing onboarding paywall JSX and styles byte-for-byte unchanged.

In `season_pass.tsx`, keep the existing `/premium_modal` route and pass:

```ts
params: { context: 'season_pass_lane', source: 'season_pass_lane' }
```

- [x] **Step 5: Add truthful fallback copy for both contexts without changing A–G structure**

Add these exact source messages in `app/paywall_copy.ts` through the existing nine-locale planned-copy record:

```ts
onboarding_plan: {
  titleRu: 'Учись без пауз с Plus',
  titleEn: 'Learn without pauses with Plus',
  subtitleRu: 'Безлимитная энергия, больше разговорной практики, тренировок и подробной статистики.',
  subtitleEn: 'Unlimited energy, more speaking practice, training, and detailed progress insights.',
},
season_pass_lane: {
  titleRu: 'Открой премиум-награды сезона',
  titleEn: 'Unlock premium season rewards',
  subtitleRu: 'Plus открывает премиум-дорожку сезона вместе со всеми учебными преимуществами.',
  subtitleEn: 'Plus unlocks the premium season track together with every learning benefit.',
},
```

Use the same `PlannedLocaleCopy` shape and locale order as the adjacent context records. Do not add JSX, styles, layout branches, or new paywall components.

| Context | Locale | Title | Subtitle |
|---|---|---|---|
| onboarding_plan | uk | Навчайся без пауз із Plus | Безлімітна енергія, більше розмовної практики, тренувань і докладної статистики. |
| onboarding_plan | es | Aprende sin pausas con Plus | Energía ilimitada, más práctica oral, entrenamientos y estadísticas detalladas. |
| onboarding_plan | pt-BR | Aprenda sem pausas com o Plus | Energia ilimitada, mais prática de fala, treinos e estatísticas detalhadas. |
| onboarding_plan | vi | Học không gián đoạn với Plus | Năng lượng không giới hạn, thêm luyện nói, luyện tập và thống kê chi tiết. |
| onboarding_plan | id | Belajar tanpa jeda dengan Plus | Energi tanpa batas, lebih banyak latihan bicara, latihan kartu, dan statistik terperinci. |
| onboarding_plan | tr | Plus ile ara vermeden öğren | Sınırsız enerji, daha fazla konuşma pratiği, alıştırma ve ayrıntılı istatistik. |
| onboarding_plan | pl | Ucz się bez przerw z Plus | Nielimitowana energia, więcej mówienia, treningów i szczegółowych statystyk. |
| season_pass_lane | uk | Відкрий преміум-нагороди сезону | Plus відкриває преміум-доріжку сезону разом з усіма навчальними перевагами. |
| season_pass_lane | es | Desbloquea las recompensas premium de la temporada | Plus abre la ruta premium de la temporada junto con todas las ventajas de aprendizaje. |
| season_pass_lane | pt-BR | Libere as recompensas premium da temporada | O Plus libera a trilha premium da temporada junto com todos os benefícios de aprendizagem. |
| season_pass_lane | vi | Mở phần thưởng cao cấp của mùa | Plus mở nhánh phần thưởng cao cấp của mùa cùng mọi lợi ích học tập. |
| season_pass_lane | id | Buka hadiah premium musim ini | Plus membuka jalur premium musim ini bersama semua manfaat belajar. |
| season_pass_lane | tr | Sezonun premium ödüllerini aç | Plus, sezonun premium yolunu tüm öğrenme avantajlarıyla birlikte açar. |
| season_pass_lane | pl | Odblokuj nagrody premium sezonu | Plus otwiera ścieżkę premium sezonu wraz ze wszystkimi korzyściami do nauki. |

- [x] **Step 6: Run context, copy, and paywall tests**

Run:

```powershell
npx jest tests/revenue_vnext_context_contract.test.ts tests/paywall_copy_contract.test.ts tests/paywall_english_wiring_contract.test.ts tests/main_course_paywall_copy.test.ts --runInBand --no-cache
```

Expected: PASS in all nine locales and both first-time/win-back branches.

### Task 5: Apply the approved VNext Season Pass access model

**Files:**
- Modify: `app/season_pass.tsx`
- Modify: `tests/season_pass_purchase_gate_contract.test.ts`
- Test: `functions/src/season_pass_client_owned_pearls_contract.test.ts`
- Test: `functions/src/season_pass_pearls_mirror_contract.test.ts`

- [x] **Step 1: Replace the retired contract expectations with the approved owner model**

The new contract is:

```ts
const freeLaneUnlocked = true;
const premiumLaneUnlocked = isPremium || passOwned;
const laneUnlocked = isPassLane ? premiumLaneUnlocked : freeLaneUnlocked;
const claimable = laneUnlocked && reached && !isClaimed;
```

Tests must also require:

```ts
expect(SOURCE).toContain('{!isPremium && !passOwned && (');
expect(SOURCE).toContain("context: 'season_pass_lane'");
expect(SOURCE).not.toContain('const passBought = passOwned;');
```

- [x] **Step 2: Run the Season Pass contract and verify RED**

Run:

```powershell
npx jest tests/season_pass_purchase_gate_contract.test.ts --runInBand --no-cache
```

Expected: FAIL because the current contract requires a 250-pearl pass before either lane grants rewards.

- [x] **Step 3: Implement Free-left / Plus-or-250-right access**

- The left reward lane is available when its progress requirement is reached.
- A Plus user receives the right lane without a pearl purchase.
- A Free user can unlock the right lane for the current season with the existing atomic 250-pearl composite operation.
- Clicking the Plus explanation opens the unchanged paywall with `season_pass_lane`.
- Previewing a reward never grants it.
- A downgrade never revokes a separately purchased current-season entitlement.

- [x] **Step 4: Run client and server Season Pass money guards**

Run under the shared semaphore:

```powershell
npx jest tests/season_pass_purchase_gate_contract.test.ts functions/src/season_pass_client_owned_pearls_contract.test.ts functions/src/season_pass_pearls_mirror_contract.test.ts --runInBand --no-cache
```

Expected: PASS with no direct `users/{uid}.shards` writer and no standalone debit.

### Task 6: Make Flashcards Swipe hydration-safe

**Files:**
- Create: `app/feature_access_resolution.ts`
- Modify: `app/flashcards_swipe.tsx`
- Create: `tests/feature_access_resolution.test.ts`
- Create: `tests/flashcards_swipe_access_behavior.test.ts`

- [x] **Step 1: Write the pure decision test**

```ts
import { resolveFeatureAccessDecision } from '../app/feature_access_resolution';

test.each([
  [false, false, 'wait'],
  [false, true, 'wait'],
  [true, false, 'paywall'],
  [true, true, 'allow'],
] as const)('resolved=%s granted=%s -> %s', (accessResolved, granted, expected) => {
  expect(resolveFeatureAccessDecision({ accessResolved, granted })).toBe(expected);
});
```

- [x] **Step 2: Run the pure test and verify RED**

Run:

```powershell
npx jest tests/feature_access_resolution.test.ts --runInBand --no-cache
```

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement the pure decision**

```ts
export type FeatureAccessDecision = 'wait' | 'allow' | 'paywall';

export function resolveFeatureAccessDecision(input: {
  accessResolved: boolean;
  granted: boolean;
}): FeatureAccessDecision {
  if (!input.accessResolved) return 'wait';
  return input.granted ? 'allow' : 'paywall';
}

export default function __RouteShim() { return null; }
```

- [x] **Step 4: Wire Swipe to `usePremium().accessResolved`**

```ts
const { accessResolved } = usePremium();
const flashcardsAccess = useFeatureAccess('flashcards');
const accessDecision = resolveFeatureAccessDecision({
  accessResolved,
  granted: flashcardsAccess,
});
```

The redirect effect runs only for `paywall`, uses a ref to redirect once, and resets the ref after access becomes allowed. Deck loading, quick start, energy reservation, question creation, and render all remain blocked while decision is `wait` or `paywall`.

- [x] **Step 5: Add the RNTL lifecycle test**

Cover unresolved, denied, allowed, and allowed-then-revoked states. Assert zero deck/energy/timer work before `allow` and exactly one existing `/premium_modal` redirect after a resolved denial.

- [x] **Step 6: Run Swipe access and existing session tests**

Run under the shared semaphore:

```powershell
npx jest tests/feature_access_resolution.test.ts tests/flashcards_swipe_access_behavior.test.ts tests/fc_swipe_attempts_integration.test.tsx tests/flashcards_swipe_session.test.ts --runInBand --no-cache --forceExit
```

Expected: PASS; a paid cold start never sees a false paywall.

### Task 7: Unify streak-freeze price consumers

**Files:**
- Modify: `app/streak_stats.tsx`
- Test: `tests/streak_freeze_price_source_contract.test.ts`

- [x] **Step 1: Write the failing source contract**

```ts
import fs from 'fs';
import path from 'path';

const home = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');
const stats = fs.readFileSync(path.join(process.cwd(), 'app', 'streak_stats.tsx'), 'utf8');

test('both streak-freeze purchase surfaces use Remote Config', () => {
  expect(home).toContain('getStreakFreezeCostShards()');
  expect(stats).toContain('getStreakFreezeCostShards()');
  expect(stats).not.toContain('const FREEZE_COST_SHARDS = 10;');
});
```

- [x] **Step 2: Run the test and verify RED**

Run:

```powershell
npx jest tests/streak_freeze_price_source_contract.test.ts --runInBand --no-cache
```

Expected: FAIL on the stats-screen hard-code.

- [x] **Step 3: Import and use the existing getter**

```ts
import { getStreakFreezeCostShards } from './remote_flags';

const FREEZE_COST_SHARDS = getStreakFreezeCostShards();
```

Do not change `purchaseStreakFreeze`; it already binds debit and grant atomically.

- [x] **Step 4: Run price and economy tests**

Run:

```powershell
npx jest tests/streak_freeze_price_source_contract.test.ts tests/streak_freeze_active.test.ts --runInBand --no-cache
```

Expected: PASS.

### Task 8: Make the live admin control plane truthful

**Files:**
- Read first: `docs/design/ADMIN_UI_BIBLE.md`
- Modify: `admin/v2/legacy.html`
- Create: `tests/revenue_vnext_control_plane_contract.test.ts`
- Test: `tests/admin_single_surface_contract.test.ts`

- [x] **Step 1: Write the failing admin truth contract**

```ts
import fs from 'fs';
import path from 'path';

const admin = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');

test('fixed Revenue VNext policy is not presented as a live toggle', () => {
  expect(admin).toContain('Все 32 урока · всегда бесплатно');
  expect(admin).toContain('Personal Plan · только grandfathered до sunset');
  expect(admin).toContain("['gate_extra_languages_premium','Дополнительные языки']");
  expect(admin).not.toContain("['gate_lessons_premium','Уроки сверх бесплатных']");
  expect(admin).not.toContain("['free_lesson_limit','Бесплатных уроков'");
});
```

- [x] **Step 2: Run the test and verify RED**

Run:

```powershell
npx jest tests/revenue_vnext_control_plane_contract.test.ts --runInBand --no-cache
```

Expected: FAIL because the live panel still offers controls that cannot close the fixed-free main course.

- [x] **Step 3: Convert fixed policy to read-only status and retain compatibility fields**

- Remove the lesson toggle and free-lesson threshold from editable `CP_PREMIUM_FEATURES`/`CP_PREMIUM_LIMITS`.
- Render the two required read-only policy lines with existing admin classes and tooltips.
- Add the missing extra-languages control because runtime consumes it.
- Keep `free_lesson_limit`, `free_lessons_extra`, and `premium_lessons_extra` in Remote Config parsing for old-client compatibility, labeled as compatibility-only outside the active policy controls.
- Do not edit any frozen admin file.
- Do not enable admin App Check.

- [x] **Step 4: Run focused admin contracts**

Run under the shared semaphore:

```powershell
npx jest tests/revenue_vnext_control_plane_contract.test.ts tests/admin_single_surface_contract.test.ts tests/feature_gates_premium_free.test.ts tests/remote_flags.test.ts --runInBand --no-cache
```

Expected: PASS; `admin/v2/legacy.html` is the only changed admin surface.

### Task 9: Stop the DEV shop from claiming fake fulfillment

**Files:**
- Modify: `app/shop.tsx`
- Create: `tests/revenue_vnext_dev_shop_contract.test.ts`

- [x] **Step 1: Write the failing DEV-preview contract**

```ts
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'shop.tsx'), 'utf8');

test('DEV shop cannot claim an uncommitted purchase', () => {
  expect(source).toContain('DEV_PREVIEW_ONLY = true');
  expect(source).toContain('Предпросмотр: покупка и выдача не выполнялись');
  expect(source).not.toContain("`${shopText(lang, item.title)} — ${triLang(lang, COPY.done)}`");
});
```

- [x] **Step 2: Run the test and verify RED**

Run:

```powershell
npx jest tests/revenue_vnext_dev_shop_contract.test.ts --runInBand --no-cache
```

Expected: FAIL because the preview currently reports “done” without a debit or grant.

- [x] **Step 3: Make preview behavior explicit**

Add:

```ts
const DEV_PREVIEW_ONLY = true;
```

Keep the screen reachable only through DEV Hub. Product taps may open detail and show the localized equivalent of “Preview: purchase and fulfillment were not performed”; they must not check affordability, mutate a wallet, choose a random reward, or report success. Epic 4 replaces this handler with real catalog operations before a production entry is added.

- [x] **Step 4: Run the DEV shop and economy guards**

Run:

```powershell
npx jest tests/revenue_vnext_dev_shop_contract.test.ts tests/customization_purchase_confirmation.test.ts tests/energy_refill_contract.test.ts --runInBand --no-cache
```

Expected: PASS and no new debit path.

### Task 10: Epic 0 verification and debt closure

**Files:**
- Modify: `docs/monetization/REVENUE_VNEXT_TECH_DEBT.md`
- Modify: `docs/monetization/PHRASEMAN_MONETIZATION_AUDIT_2026-09-12.md`

- [x] **Step 1: Mark RVTD-001 through RVTD-007 closed only with exact evidence**

Each closed row records the passing test command and source path. Do not mark an entry closed from inspection alone.

- [x] **Step 2: Run the combined Epic 0 suite under the semaphore**

```powershell
npx cross-env NODE_OPTIONS=--max-old-space-size=8192 jest tests/main_course_truth_copy_contract.test.ts tests/revenue_vnext_context_contract.test.ts tests/season_pass_purchase_gate_contract.test.ts tests/feature_access_resolution.test.ts tests/flashcards_swipe_access_behavior.test.ts tests/streak_freeze_price_source_contract.test.ts tests/revenue_vnext_control_plane_contract.test.ts tests/revenue_vnext_dev_shop_contract.test.ts tests/flashcards_blitz_access_behavior.test.ts tests/paywall_english_wiring_contract.test.ts --runInBand --no-cache --forceExit
```

Expected: all suites pass.

- [x] **Step 3: Run affected-file lint and diff checks**

Evidence (2026-09-12): targeted ESLint on the Epic 0 production files, excluding
`app/shop.tsx` and `components/CleanOnboarding.tsx`, exited 0 with 0 errors and
6 pre-existing warnings. Targeted `git diff --check` across the exact Epic 0
source and test paths exited 0 with CRLF notices only. Full line-based lint for
the two excluded files is not a stable Epic 0 signal while the concurrently
modified `config/text-integrity-baseline.json` and its existing baseline items
remain in flight; Epic 0 did not modify or waive that baseline.

```powershell
npx eslint app/main_course_plus_copy.ts app/flashcards_blitz_session.tsx app/lesson_complete.tsx app/premium_context.ts components/CleanOnboarding.tsx app/season_pass.tsx app/feature_access_resolution.ts app/flashcards_swipe.tsx app/streak_stats.tsx app/shop.tsx tests/main_course_truth_copy_contract.test.ts tests/revenue_vnext_context_contract.test.ts tests/feature_access_resolution.test.ts tests/flashcards_swipe_access_behavior.test.ts tests/streak_freeze_price_source_contract.test.ts tests/revenue_vnext_control_plane_contract.test.ts tests/revenue_vnext_dev_shop_contract.test.ts
git diff --check
```

Expected: exit 0 apart from repository line-ending notices.

- [x] **Step 4: Request fresh critical review**

Evidence (2026-09-12): fresh independent `economy-reviewer` verdict — PASS.

The reviewer must independently check commercial truth, direct-route parity, Season Pass debit/grant integrity, hydration lifecycle, admin truth, no paywall visual changes, and no unrelated functionality removal.

- [x] **Step 5: Record Epic 0 completion in the program plan**

Check off Epic 0 only after the combined suite, lint, diff check, and independent review all pass.

## Commit policy while the shared index is locked

The repository currently has an external `.git/index.lock` and unrelated staged documents. Do not delete the lock, reset the index, unstage other work, or create a mixed commit. Keep Epic 0 changes in the working tree until the owner/concurrent process releases the index. Once clear, commit each completed task with `git commit --only <exact task paths>` so unrelated staged files remain untouched.
