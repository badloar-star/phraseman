import fs from 'node:fs';
import path from 'node:path';

import { CONTEXT_BENEFITS, getHeroPlannedCopy, getPaywallCopy } from '../app/paywall_copy';
import { REVENUE_DAILY_LIMITS } from '../app/revenue_daily_limits';
import type { Lang } from '../constants/i18n';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

const PLANNED_LANGS = ['en', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Пейволы/онбординг/настройки — всё, что продаёт Plus новому пользователю. */
const SALES_SURFACES = [
  'app/paywall_copy.ts',
  'app/main_course_plus_copy.ts',
  'app/paywall_a.tsx', 'app/paywall_b.tsx', 'app/paywall_c.tsx', 'app/paywall_d.tsx',
  'app/paywall_e.tsx', 'app/paywall_f.tsx', 'app/paywall_g.tsx',
  'app/premium_modal.tsx',
  'components/CleanOnboarding.tsx',
  'components/paywall/PaywallProofCards.tsx',
  'components/paywall/paywallShared.tsx',
  'components/paywall/PaywallTrialTimeline.tsx',
  'components/PremiumCelebrationModal.tsx',
  'components/EntitlementExpiredHost.tsx',
  'app/(tabs)/settings.tsx',
  'app/manage_subscription.tsx',
  'components/StatsPremiumBlur.tsx',
  'app/streak_stats.tsx',
];

const RETIRED_PERSONAL_PLAN_SALES_COPY = [
  'Личный план занятий', 'Особистий план занять', 'Personal learning plan', 'Plan de estudio personal',
  'Plano de estudos pessoal', 'Kế hoạch học cá nhân', 'Rencana belajar pribadi', 'Kişisel çalışma planı', 'Osobisty plan nauki',
  'Персональный план на 30 дней', 'Personal Plan on 30 days',
];

describe('дневные лимиты обычного аккаунта — правда в текстах пейвола', () => {
  test.each([
    ['dialog_limit', REVENUE_DAILY_LIMITS.ai_dialog_replies],
    ['speaking', REVENUE_DAILY_LIMITS.speaking_attempts],
    ['ai_voice_input', REVENUE_DAILY_LIMITS.speaking_attempts],
    ['flashcard_training', REVENUE_DAILY_LIMITS.flashcard_training_starts],
  ] as const)('%s говорит про дневной лимит с числом %d во всех 9 локалях', (context, limit) => {
    const copy = getPaywallCopy(context);
    const planned = getHeroPlannedCopy(context, 0);
    const subtitles = [copy.subtitleRu, copy.subtitleUk, copy.subtitleEs, ...PLANNED_LANGS.map((lang) => planned.subtitle[lang] ?? '')];
    for (const subtitle of subtitles) {
      expect(subtitle).toContain(String(limit));
      expect(subtitle.toLowerCase()).toContain('plus');
    }
    expect(copy.titleRu.toLowerCase()).toContain('дневной лимит');
    expect(copy.titleUk.toLowerCase()).toContain('денний ліміт');
    expect((planned.title.en ?? '').toLowerCase()).toContain('daily');
    // Старое ложное обещание «только в Plus» ушло.
    expect(copy.titleRu).not.toMatch(/— в Plus$/);
    expect(copy.subtitleRu).not.toContain('входят в Plus');
    expect(CONTEXT_BENEFITS[context]?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  test('числа лимитов в тексте совпадают с гейтами (один источник)', () => {
    expect(read('app/revenue_quota_access.ts')).toContain(`FLASHCARD_TRAINING_DAILY_LIMIT = ${REVENUE_DAILY_LIMITS.flashcard_training_starts}`);
    expect(read('functions/src/openai_dialog_model_config.ts')).toContain(`DIALOG_FREE_DAILY_REPLIES_DEFAULT = ${REVENUE_DAILY_LIMITS.ai_dialog_replies}`);
    expect(read('app/paywall_copy.ts')).toContain("from './revenue_daily_limits'");
  });
});

describe('в русских и украинских текстах нет слова «Free»', () => {
  const ruUkStringPattern = /(?:^|[\s{,(])(?:ru|uk|titleRu|titleUk|subtitleRu|subtitleUk|messageRu|messageUk)\s*:\s*(['"`])((?:\\\1|(?!\1)[\s\S])*)\1/g;

  test.each(SALES_SURFACES)('%s', (relative) => {
    const source = read(relative);
    const offenders: string[] = [];
    for (const match of source.matchAll(ruUkStringPattern)) {
      const text = match[2];
      if (/\bFree\b/.test(text) || /\bfree\b/i.test(text) && /[А-Яа-яЁёІіЇїЄє]/.test(text)) offenders.push(text.slice(0, 80));
    }
    expect(offenders).toEqual([]);
  });

  test('онбординг предлагает «обычный аккаунт», а не Free', () => {
    const onboarding = read('components/CleanOnboarding.tsx');
    expect(onboarding).toContain('Продолжить на обычном аккаунте');
    expect(onboarding).not.toMatch(/Продолжить (?:на )?Free/);
  });
});

describe('Personal Plan не продаётся новым пользователям', () => {
  test.each(SALES_SURFACES)('%s не содержит продающего copy снятого плана', (relative) => {
    const source = read(relative);
    for (const phrase of RETIRED_PERSONAL_PLAN_SALES_COPY) expect(source).not.toContain(phrase);
  });

  test('онбординг продаёт onboarding_plan, а не personal_plan', () => {
    const onboarding = read('components/CleanOnboarding.tsx');
    expect(onboarding).toContain("context: 'onboarding_plan'");
    expect(onboarding).toContain("source: 'onboarding_plan'");
    expect(onboarding).not.toContain("context: 'personal_plan'");
  });

  test('main-course контексты продают именно MAIN_COURSE_PLUS_BENEFITS', () => {
    for (const context of ['course_after_lesson3', 'lesson_b1', 'free_lessons_complete', 'level_up', 'notification_upsell', 'onboarding_plan'] as const) {
      const benefits = (CONTEXT_BENEFITS[context] ?? []) as Record<Lang, string>[];
      for (const benefit of benefits) {
        for (const phrase of RETIRED_PERSONAL_PLAN_SALES_COPY) expect(Object.values(benefit)).not.toContain(phrase);
      }
    }
  });
});
