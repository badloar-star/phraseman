import fs from 'node:fs';
import path from 'node:path';

import { CONTEXT_BENEFITS, getHeroPlannedCopy, getPaywallCopy } from '../app/paywall_copy';
import { REVENUE_DAILY_LIMITS } from '../app/revenue_daily_limits';
import { MONTHLY_TRAINING_SESSION_LIMIT } from '../app/monthly_training_sessions';
import type { Lang } from '../constants/i18n';
import { ONBOARDING_COPY_SOURCE } from './helpers/onboarding_copy_source';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

const PLANNED_LANGS = ['en', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Пейволы/онбординг/настройки — всё, что продаёт Plus новому пользователю. */
const SALES_SURFACES = [
  'app/paywall_copy.ts',
  'app/main_course_plus_copy.ts',
  // 2026-09-30 (D78): пейволы A–G удалены — единственный пейвол Plus.
  'components/paywall/PaywallPlusScreen.tsx',
  'components/paywall/PaywallPlus.tsx',
  'components/paywall/PaywallPlusCopy.ts',
  'components/paywall/PaywallBenefitComparison.tsx',
  'app/premium_modal.tsx',
  'components/CleanOnboarding.tsx',
  'components/paywall/PaywallProofCards.tsx',
  'components/paywall/paywallShared.tsx',
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
  // зачем (владелец 22.09, 114baf437 + D152 01.10): тексты переписаны по-человечески — «с подпиской»
  // вместо «Plus», заголовки без «лимит исчерпан» (экран открывается и без упора в лимит). Тренировки
  // карточек у бесплатного аккаунта считаются МЕСЯЦЕМ (30, D152), устные попытки — днём (3).
  test.each([
    // dialog_limit — МЕСЯЧНЫЙ лимит (D111), сторожится ai_dialog_paywall_truth_contract.
    ['speaking', REVENUE_DAILY_LIMITS.speaking_attempts, 'в день'],
    ['ai_voice_input', REVENUE_DAILY_LIMITS.speaking_attempts, 'в день'],
    ['flashcard_training', MONTHLY_TRAINING_SESSION_LIMIT, 'в месяц'],
  ] as const)('%s называет реальный лимит (%d) во всех 9 локалях', (context, limit, periodRu) => {
    const copy = getPaywallCopy(context);
    const planned = getHeroPlannedCopy(context, 0);
    const subtitles = [copy.subtitleRu, copy.subtitleUk, copy.subtitleEs, ...PLANNED_LANGS.map((lang) => planned.subtitle[lang] ?? '')];
    for (const subtitle of subtitles) {
      expect(subtitle).toContain(String(limit));
    }
    expect(copy.subtitleRu).toContain(periodRu);
    // Текст не утверждает, что что-то уже «исчерпано»: экран открывается и до упора в лимит.
    expect(copy.titleRu.toLowerCase()).not.toContain('исчерпан');
    // Старое ложное обещание «только в Plus» ушло.
    expect(copy.titleRu).not.toMatch(/— в Plus$/);
    expect(copy.subtitleRu).not.toContain('входят в Plus');
    expect(CONTEXT_BENEFITS[context]?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  test('числа лимитов в тексте совпадают с гейтами (один источник)', () => {
    // зачем (D152): лимит тренировок — месячный счётчик monthly_training_sessions; текст берёт число оттуда.
    expect(read('app/paywall_copy.ts')).toContain("import { MONTHLY_TRAINING_SESSION_LIMIT } from './monthly_training_sessions';");
    // зачем (D111): лимит ответов в диалогах — месячный; сервер держит его в DIALOG_FREE_MONTHLY_REPLIES_DEFAULT.
    expect(read('functions/src/openai_dialog_model_config.ts')).toContain(`DIALOG_FREE_MONTHLY_REPLIES_DEFAULT = ${REVENUE_DAILY_LIMITS.ai_dialog_replies}`);
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
    const onboarding = read('components/CleanOnboarding.tsx') + ONBOARDING_COPY_SOURCE; // // зачем (координатор 12.10): тексты онбординга переехали в components/onboarding/*
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
