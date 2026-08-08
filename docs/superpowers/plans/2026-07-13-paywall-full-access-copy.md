# Paywall Full-Access Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the lesson-lock paywall's current-level promise with the approved full-access promise in every supported locale.

**Architecture:** Keep the existing `course_after_lesson3` context and all A/B/C paywall rendering unchanged. Update only its shared hero copy and three benefit lines in `app/paywall_copy.ts`, protected by a focused contract in the existing paywall-copy test file.

**Tech Stack:** TypeScript, React Native copy registry, Jest

---

### Task 1: Broaden the `course_after_lesson3` promise

**Files:**
- Modify: `tests/paywall_copy_contract.test.ts`
- Modify: `app/paywall_copy.ts:83-106`
- Modify: `app/paywall_copy.ts:1073-1077`
- Modify: `app/paywall_copy.ts:1301-1305`

- [x] **Step 1: Write the failing copy contract**

Add this test inside the main `paywall_copy` contract suite:

```ts
it('course_after_lesson3 promises full Plus access, not only the current level', () => {
  const copy = getPaywallCopy('course_after_lesson3');

  expect(copy.titleRu).toBe('Открой полный доступ к Phraseman');
  expect(copy.subtitleRu).toBe(
    'Plus открывает доступ ко всем урокам, безлимитную практику и все возможности Plus.',
  );
  expect(CONTEXT_BENEFITS.course_after_lesson3?.map((benefit) => benefit.ru)).toEqual([
    'Доступ ко всем урокам',
    'Безлимитная практика без пауз',
    'Все возможности Plus',
  ]);
  expect(CONTEXT_BENEFITS_PLANNED.course_after_lesson3).toEqual([
    { 'pt-BR': 'Acesso a todas as lições', vi: 'Truy cập tất cả bài học', id: 'Akses ke semua pelajaran', tr: 'Tüm derslere erişim', pl: 'Dostęp do wszystkich lekcji' },
    { 'pt-BR': 'Prática ilimitada sem pausas', vi: 'Luyện tập không giới hạn, không gián đoạn', id: 'Latihan tanpa batas dan tanpa jeda', tr: 'Sınırsız ve kesintisiz pratik', pl: 'Nieograniczona praktyka bez przerw' },
    { 'pt-BR': 'Todos os recursos Plus', vi: 'Mọi tính năng Plus', id: 'Semua fitur Plus', tr: 'Tüm Plus özellikleri', pl: 'Wszystkie funkcje Plus' },
  ]);

  const russianCopy = [
    copy.titleRu,
    copy.subtitleRu,
    ...(CONTEXT_BENEFITS.course_after_lesson3?.map((benefit) => benefit.ru) ?? []),
  ].join(' ');
  expect(russianCopy).not.toContain('текущ');
  expect(russianCopy).not.toContain('экзамен');
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx jest --runTestsByPath tests/paywall_copy_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because the production title is still `Открой весь текущий уровень`.

- [x] **Step 3: Update the shared hero and benefits**

Replace `COURSE_AFTER_LESSON3_COPY` with:

```ts
const COURSE_AFTER_LESSON3_COPY: PaywallCopy = {
  titleRu: 'Открой полный доступ к Phraseman',
  titleUk: 'Відкрий повний доступ до Phraseman',
  titleEs: 'Obtén acceso completo a Phraseman',
  subtitleRu: 'Plus открывает доступ ко всем урокам, безлимитную практику и все возможности Plus.',
  subtitleUk: 'Plus відкриває доступ до всіх уроків, безлімітної практики та всіх можливостей Plus.',
  subtitleEs: 'Plus te da acceso a todas las lecciones, práctica ilimitada y todas las funciones de Plus.',
};
```

Replace `COURSE_AFTER_LESSON3_PLANNED_COPY` with:

```ts
const COURSE_AFTER_LESSON3_PLANNED_COPY: PremiumPlannedHeroCopy = {
  title: {
    'pt-BR': 'Tenha acesso completo ao Phraseman',
    vi: 'Mở toàn quyền truy cập Phraseman',
    id: 'Buka akses penuh ke Phraseman',
    tr: "Phraseman'a tam erişimi aç",
    pl: 'Odblokuj pełny dostęp do Phraseman',
  },
  subtitle: {
    'pt-BR': 'O Plus dá acesso a todas as lições, prática ilimitada e todos os recursos Plus.',
    vi: 'Plus cho bạn quyền truy cập vào tất cả bài học, luyện tập không giới hạn và mọi tính năng Plus.',
    id: 'Plus memberi akses ke semua pelajaran, latihan tanpa batas, dan semua fitur Plus.',
    tr: 'Plus, tüm derslere, sınırsız pratiğe ve tüm Plus özelliklerine erişim sağlar.',
    pl: 'Plus zapewnia dostęp do wszystkich lekcji, nieograniczonej praktyki i wszystkich funkcji Plus.',
  },
};
```

Replace the three `CONTEXT_BENEFITS.course_after_lesson3` entries and the matching
`CONTEXT_BENEFITS_PLANNED.course_after_lesson3` entries with localized equivalents of:

```ts
[
  'Доступ ко всем урокам',
  'Безлимитная практика без пауз',
  'Все возможности Plus',
]
```

Use these corresponding values for UK/ES/PT-BR/VI/ID/TR/PL:

```text
UK: Доступ до всіх уроків | Безлімітна практика без пауз | Усі можливості Plus
ES: Acceso a todas las lecciones | Práctica ilimitada sin pausas | Todas las funciones de Plus
PT-BR: Acesso a todas as lições | Prática ilimitada sem pausas | Todos os recursos Plus
VI: Truy cập tất cả bài học | Luyện tập không giới hạn, không gián đoạn | Mọi tính năng Plus
ID: Akses ke semua pelajaran | Latihan tanpa batas dan tanpa jeda | Semua fitur Plus
TR: Tüm derslere erişim | Sınırsız ve kesintisiz pratik | Tüm Plus özellikleri
PL: Dostęp do wszystkich lekcji | Nieograniczona praktyka bez przerw | Wszystkie funkcje Plus
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npx jest --runTestsByPath tests/paywall_copy_contract.test.ts --no-cache --runInBand
```

Expected: PASS with no failed tests.

- [x] **Step 5: Verify scope and commit**

Run:

```bash
git diff --check -- app/paywall_copy.ts tests/paywall_copy_contract.test.ts
git diff -- app/paywall_copy.ts tests/paywall_copy_contract.test.ts
```

Confirm only `course_after_lesson3` copy and its focused contract changed, then commit:

```bash
git add app/paywall_copy.ts tests/paywall_copy_contract.test.ts docs/superpowers/plans/2026-07-13-paywall-full-access-copy.md
git commit -m "fix: broaden lesson paywall promise"
```
