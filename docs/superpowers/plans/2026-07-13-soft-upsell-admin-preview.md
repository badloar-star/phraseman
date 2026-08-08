# Soft Upsell Admin Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в dev-only админ-панель шесть независимых локальных превью мягких пейволов без реальных триггеров и внешних записей.

**Architecture:** Типизированный каталог содержит шесть готовых `SoftUpsellOpportunity` и пользовательские тексты. Изолированная секция показывает шесть строк и рендерит production-компонент `SoftContextualUpsellCard` внутри локального `Modal`; корневой admin screen только импортирует секцию. Новый код остаётся за существующим `ENABLE_DEV_TOOLS` dynamic-require gate.

**Tech Stack:** React Native, Expo Router, TypeScript, Jest, React Native Testing Library, Ionicons, существующая admin UI design system.

---

### Task 1: Типизированный каталог шести превью

**Files:**
- Create: `components/admin_panel/soft_upsell_preview_catalog.ts`
- Create: `tests/soft_upsell_admin_preview_catalog.test.ts`

- [ ] **Step 1: Write the failing catalog test**

```ts
import { SOFT_UPSELL_ADMIN_PREVIEWS } from '../components/admin_panel/soft_upsell_preview_catalog';

test('defines all six independent soft upsell previews', () => {
  expect(SOFT_UPSELL_ADMIN_PREVIEWS.map((item) => item.opportunity.trigger)).toEqual([
    'first_lesson', 'free_lessons_complete', 'weekly_review',
    'second_ai_dialogue', 'streak_milestone', 'repeated_training',
  ]);
  expect(SOFT_UPSELL_ADMIN_PREVIEWS).toHaveLength(6);
  expect(SOFT_UPSELL_ADMIN_PREVIEWS[0].opportunity.destination).toBe('personal_plan');
  expect(SOFT_UPSELL_ADMIN_PREVIEWS.slice(1).every((item) => item.opportunity.destination === 'paywall')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- --runTestsByPath tests/soft_upsell_admin_preview_catalog.test.ts --no-cache --runInBand`

Expected: FAIL because the catalog module does not exist.

- [ ] **Step 3: Implement the pure catalog**

```ts
import type { SoftUpsellOpportunity } from '../../app/soft_upsell_core';

export interface SoftUpsellAdminPreview {
  readonly id: string;
  readonly icon: string;
  readonly adminLabel: string;
  readonly adminDescription: string;
  readonly title: string;
  readonly body: string;
  readonly ctaLabel: string;
  readonly opportunity: SoftUpsellOpportunity;
}

export const SOFT_UPSELL_ADMIN_PREVIEWS: readonly SoftUpsellAdminPreview[] = Object.freeze([
  {
    id: 'first-lesson', icon: 'map-outline', adminLabel: 'После первого урока',
    adminDescription: 'Первый успех → персональный путь', title: 'Первый шаг готов',
    body: 'Продолжай с персональным маршрутом под свою цель.', ctaLabel: 'Построить мой путь',
    opportunity: { trigger: 'first_lesson', value: 1, studyTarget: 'en', context: 'first_lesson_success', destination: 'personal_plan', milestoneId: 'first_lesson:1:en' },
  },
  {
    id: 'free-lessons-complete', icon: 'school-outline', adminLabel: 'После восьмого бесплатного урока',
    adminDescription: 'Бесплатная часть завершена → Plus', title: 'Бесплатная часть завершена',
    body: 'Открой полный учебный путь и продолжай без остановки.', ctaLabel: 'Открыть Plus',
    opportunity: { trigger: 'free_lessons_complete', value: 8, studyTarget: 'en', context: 'free_lessons_complete', destination: 'paywall', milestoneId: 'free_lessons_complete:8:en' },
  },
  {
    id: 'weekly-review', icon: 'analytics-outline', adminLabel: 'После недельного обзора',
    adminDescription: 'Полезный вывод недели → Plus', title: 'Твой прогресс уже виден',
    body: 'Ты лучше запоминаешь знакомые темы. Plus поможет усилить слабые места.', ctaLabel: 'Открыть Plus',
    opportunity: { trigger: 'weekly_review', value: 1, studyTarget: 'en', context: 'weekly_review', destination: 'paywall', milestoneId: 'weekly_review:1:en' },
  },
  {
    id: 'second-ai-dialogue', icon: 'chatbubbles-outline', adminLabel: 'После второго AI-диалога',
    adminDescription: 'Повторный разговор → Plus', title: 'Говорить становится легче',
    body: 'Продолжай практиковаться в диалогах без учебного напряжения.', ctaLabel: 'Открыть Plus',
    opportunity: { trigger: 'second_ai_dialogue', value: 2, studyTarget: 'en', context: 'dialog_repeat_success', destination: 'paywall', milestoneId: 'second_ai_dialogue:2:en' },
  },
  {
    id: 'streak-milestone', icon: 'flame-outline', adminLabel: 'После серии в 7 дней',
    adminDescription: 'Недельная серия → Plus', title: '7 дней подряд',
    body: 'Ты уже построил привычку. С Plus её проще превратить в устойчивый результат.', ctaLabel: 'Открыть Plus',
    opportunity: { trigger: 'streak_milestone', value: 7, studyTarget: 'en', context: 'streak_milestone', destination: 'paywall', milestoneId: 'streak_milestone:7:en' },
  },
  {
    id: 'repeated-training', icon: 'repeat-outline', adminLabel: 'После повторных тренировок',
    adminDescription: 'Повторное использование тренажёра → Plus', title: 'Тренировки уже работают',
    body: 'Продолжай закреплять слабые места с персональными повторами.', ctaLabel: 'Открыть Plus',
    opportunity: { trigger: 'repeated_training', value: 1, studyTarget: 'en', context: 'trainer_repeat_success', destination: 'paywall', milestoneId: 'repeated_training:1:en' },
  },
]);
```

Use these exact pairs: `first_lesson/first_lesson_success/1/personal_plan`, `free_lessons_complete/free_lessons_complete/8/paywall`, `weekly_review/weekly_review/1/paywall`, `second_ai_dialogue/dialog_repeat_success/2/paywall`, `streak_milestone/streak_milestone/7/paywall`, `repeated_training/trainer_repeat_success/1/paywall`. Every milestone id ends in `:en`. The first CTA is `Построить мой путь`; the rest use `Открыть Plus`.

- [ ] **Step 4: Run the catalog test and verify GREEN**

Run the command from Step 2. Expected: 1 suite PASS.

- [ ] **Step 5: Commit**

```powershell
git add components/admin_panel/soft_upsell_preview_catalog.ts tests/soft_upsell_admin_preview_catalog.test.ts
git commit -m "test: define soft upsell admin previews"
```

### Task 2: Изолированная секция с безопасным модальным превью

**Files:**
- Create: `components/admin_panel/sections/SoftUpsellPreviewSection.tsx`
- Create: `tests/soft_upsell_admin_preview_section.test.ts`

- [ ] **Step 1: Write failing component and source-contract tests**

Render the section, press each `admin-soft-upsell-preview-<id>` row, and assert the selected title appears inside `soft-upsell-card`. Assert dismiss closes the modal. Assert the source contains no Firestore, AsyncStorage, analytics, router or `useSoftUpsellOpportunity` dependency.

```ts
expect(source).not.toMatch(/firestore|AsyncStorage|trackSoftUpsell|useSoftUpsellOpportunity|useRouter/);
for (const preview of SOFT_UPSELL_ADMIN_PREVIEWS) {
  fireEvent.press(view.getByTestId(`admin-soft-upsell-preview-${preview.id}`));
  expect(view.getByTestId('soft-upsell-card')).toHaveTextContent(preview.title);
}
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- --runTestsByPath tests/soft_upsell_admin_preview_section.test.ts --no-cache --runInBand`

Expected: FAIL because the section does not exist.

- [ ] **Step 3: Implement the section**

```tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import SoftContextualUpsellCard from '../../SoftContextualUpsellCard';
import { AccordionSection, AdminHint, ADMIN_BORDER_MUTED, ADMIN_SURFACE, ADMIN_TEXT, ButtonRow } from '../ui';
import { qaToast } from '../qa_utils';
import { SOFT_UPSELL_ADMIN_PREVIEWS, type SoftUpsellAdminPreview } from '../soft_upsell_preview_catalog';

interface Props { open: boolean; onToggle: (id: string) => void }

export default function SoftUpsellPreviewSection({ open, onToggle }: Props) {
  const [selected, setSelected] = useState<SoftUpsellAdminPreview | null>(null);
  return (
    <>
      <AccordionSection id="soft_upsell_previews" icon="sparkles-outline" title="Мягкие пейволы — превью" badge={6} open={open} onToggle={onToggle}>
        <AdminHint>Локальное превью. Ничего не публикует и не меняет у пользователей.</AdminHint>
        {SOFT_UPSELL_ADMIN_PREVIEWS.map((preview) => (
          <ButtonRow key={preview.id} testID={`admin-soft-upsell-preview-${preview.id}`} icon={preview.icon} label={preview.adminLabel} sub={preview.adminDescription} onPress={() => setSelected(preview)} />
        ))}
      </AccordionSection>
      <Modal visible={selected != null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 16 }}>
          <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 560, maxHeight: '90%', alignSelf: 'center', backgroundColor: ADMIN_SURFACE, borderColor: ADMIN_BORDER_MUTED, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }}>
            <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, borderBottomColor: ADMIN_BORDER_MUTED, borderBottomWidth: 1 }}>
              <Text style={{ color: ADMIN_TEXT, fontSize: 16, fontWeight: '700', flex: 1 }}>Локальное QA-превью</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Закрыть локальное превью" onPress={() => setSelected(null)} style={{ width: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={24} color={ADMIN_TEXT} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {selected && <SoftContextualUpsellCard
                title={selected.title}
                body={selected.body}
                ctaLabel={selected.ctaLabel}
                dismissLabel="Не сейчас"
                dismissAccessibilityLabel="Закрыть предложение"
                dismissAccessibilityHint="Закрывает только локальное QA-превью"
                ctaAccessibilityLabel={selected.ctaLabel}
                ctaAccessibilityHint="Показывает результат локальной проверки без навигации"
                opportunity={selected.opportunity}
                onImpression={() => undefined}
                onDismiss={() => setSelected(null)}
                onCta={() => qaToast('info', `QA: ${selected.ctaLabel}`)}
              />}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
```

Pass `onImpression={() => undefined}`, `onDismiss={() => setSelected(null)}`, and a CTA handler that only calls `qaToast('info', ...)`. The modal shell shows `Локальное QA-превью`, uses `accessibilityViewIsModal`, caps card width, and includes an accessible visible close button.

- [ ] **Step 4: Run section and existing card tests**

Run: `npm test -- --runTestsByPath tests/soft_upsell_admin_preview_section.test.ts tests/soft_contextual_upsell_card_contract.test.ts --no-cache --runInBand`

Expected: both suites PASS.

- [ ] **Step 5: Commit**

```powershell
git add components/admin_panel/sections/SoftUpsellPreviewSection.tsx tests/soft_upsell_admin_preview_section.test.ts
git commit -m "feat: add local soft upsell previews"
```

### Task 3: Подключение только к dev-only админ-панели

**Files:**
- Modify: `components/admin_panel/ui.tsx`
- Modify: `app/_admin_settings_testers.tsx`
- Create: `tests/soft_upsell_admin_preview_integration.test.ts`

- [ ] **Step 1: Write the failing integration contract**

```ts
expect(privateAdminSource).toContain("import SoftUpsellPreviewSection from '../components/admin_panel/sections/SoftUpsellPreviewSection'");
expect(privateAdminSource).toContain('<SoftUpsellPreviewSection');
expect(uiSource).toContain('soft_upsell_previews:');
expect(publicGateSource).toContain("require('./_admin_settings_testers')");
expect(publicGateSource).not.toContain('SoftUpsellPreviewSection');
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- --runTestsByPath tests/soft_upsell_admin_preview_integration.test.ts --no-cache --runInBand`

Expected: FAIL because import, render and search metadata are absent.

- [ ] **Step 3: Wire the section minimally**

Add `SECTION_META.soft_upsell_previews` under `monetization`. Import the section only in `_admin_settings_testers.tsx` and render:

```tsx
<SoftUpsellPreviewSection
  open={openSection === 'soft_upsell_previews'}
  onToggle={toggleSection}
/>
```

Do not alter `app/settings_testers.tsx`, config gates, Firestore rules, Remote Config, backend callables or admin web files.

- [ ] **Step 4: Run integration and production-gate tests**

Run: `npm test -- --runTestsByPath tests/soft_upsell_admin_preview_integration.test.ts tests/settings_dev_admin_gate.test.ts --no-cache --runInBand`.

Expected: all selected suites PASS.

- [ ] **Step 5: Commit**

```powershell
git add components/admin_panel/ui.tsx app/_admin_settings_testers.tsx tests/soft_upsell_admin_preview_integration.test.ts
git commit -m "feat: expose soft upsell previews in admin console"
```

### Task 4: Финальная проверка и безопасное вливание

**Files:**
- Verify all files changed by Tasks 1–3

- [ ] **Step 1: Run focused behavior tests**

```powershell
npm test -- --runTestsByPath tests/soft_upsell_admin_preview_catalog.test.ts tests/soft_upsell_admin_preview_section.test.ts tests/soft_upsell_admin_preview_integration.test.ts tests/soft_contextual_upsell_card_contract.test.ts tests/soft_upsell_core.test.ts --no-cache --runInBand
```

Expected: all selected suites PASS.

- [ ] **Step 2: Run lint and diff checks**

```powershell
npx eslint components/admin_panel/soft_upsell_preview_catalog.ts components/admin_panel/sections/SoftUpsellPreviewSection.tsx app/_admin_settings_testers.tsx components/admin_panel/ui.tsx tests/soft_upsell_admin_preview_catalog.test.ts tests/soft_upsell_admin_preview_section.test.ts tests/soft_upsell_admin_preview_integration.test.ts
git diff --check
```

Expected: zero ESLint errors and no whitespace failures.

- [ ] **Step 3: Inspect responsive layout**

Verify compact and wide widths: no horizontal overflow, bounded card width, wrapping action buttons, 44 px touch targets, and dark text on bright CTA.

- [ ] **Step 4: Request final Advisor review**

Provide objective, spec, final diff, test/lint evidence and confirmation that the preview has no Firestore/analytics/router dependencies. Apply required changes and resubmit until `DECISION: APPROVED`.

- [ ] **Step 5: Fast-forward release without touching unrelated work**

From the dirty release worktree, verify changed paths do not overlap unrelated edits, then run `git merge --ff-only codex/soft-upsell-admin-preview`. Expected: fast-forward succeeds and all pre-existing unrelated modified files remain unchanged.
