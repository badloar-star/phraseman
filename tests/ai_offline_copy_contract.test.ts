import {
  aiOfflineToast,
  aiOfflineDialogScreen,
  aiPersonalLimitToast,
  aiGlobalBudgetToast,
  aiErrorToast,
  isAiOfflineError,
  isAiGlobalBudgetError,
  AI_OFFLINE_ERROR_CODE,
  AI_GLOBAL_BUDGET_ERROR_CODE,
  type AiOfflineToastKey,
} from '../app/ai_kill_switch_copy';
import {
  classifyPremiumDialogError,
  getPremiumDialogErrorMessage,
} from '../app/ai_dialog_client';

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn() }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => false),
}));

const LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Прогоняет функцию по фиксированному Math.random, чтобы поймать КАЖДЫЙ вариант. */
function forEachVariant<T>(fn: () => T, samples = 12): T[] {
  const out: T[] = [];
  const orig = Math.random;
  try {
    for (let i = 0; i < samples; i += 1) {
      // равномерно покрываем [0,1): 0, 1/samples, 2/samples, …
      const v = i / samples;
      Math.random = () => v;
      out.push(fn());
    }
  } finally {
    Math.random = orig;
  }
  return out;
}

describe('ai offline copy — коды ошибок', () => {
  it('коды ошибок различимы и не пересекаются', () => {
    expect(AI_OFFLINE_ERROR_CODE).toBe('ai_globally_disabled');
    expect(AI_GLOBAL_BUDGET_ERROR_CODE).toBe('explain_global_budget');
    expect(AI_OFFLINE_ERROR_CODE).not.toBe(AI_GLOBAL_BUDGET_ERROR_CODE);
  });

  it('isAiOfflineError ловит рубильник и НЕ ловит бюджет/лимит', () => {
    expect(isAiOfflineError(new Error('ai_globally_disabled'))).toBe(true);
    expect(isAiOfflineError({ message: 'FUNCTIONS: ai_globally_disabled here' })).toBe(true);
    expect(isAiOfflineError(new Error('explain_global_budget'))).toBe(false);
    expect(isAiOfflineError(new Error('explain_free_daily_limit'))).toBe(false);
    expect(isAiOfflineError(null)).toBe(false);
  });

  it('isAiGlobalBudgetError ловит глобальный бюджет и НЕ ловит рубильник/личный лимит', () => {
    expect(isAiGlobalBudgetError(new Error('explain_global_budget'))).toBe(true);
    expect(isAiGlobalBudgetError({ message: 'resource-exhausted: explain_global_budget' })).toBe(true);
    expect(isAiGlobalBudgetError(new Error('ai_globally_disabled'))).toBe(false);
    expect(isAiGlobalBudgetError(new Error('explain_free_daily_limit'))).toBe(false);
    expect(isAiGlobalBudgetError(undefined)).toBe(false);
  });
});

describe('ai offline copy — полнота и непустота текстов', () => {
  const toastKeys: AiOfflineToastKey[] = ['explain', 'compass_voice', 'speaking'];

  it('тосты: непустые title/message на всех 8 языках и всех вариантах', () => {
    for (const lang of LANGS) {
      for (const key of toastKeys) {
        for (const t of forEachVariant(() => aiOfflineToast(lang, key))) {
          expect(t.title.trim().length).toBeGreaterThan(0);
          expect(t.message.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('диалоговые заглушки: непустые на всех категориях, языках, вариантах', () => {
    const categories = ['everyday', 'travel', 'social'] as const;
    for (const lang of LANGS) {
      for (const cat of categories) {
        for (const s of forEachVariant(() => aiOfflineDialogScreen(lang, cat))) {
          expect(s.title.trim().length).toBeGreaterThan(0);
          expect(s.message.trim().length).toBeGreaterThan(0);
        }
      }
      // спец-сценарий робота
      for (const s of forEachVariant(() => aiOfflineDialogScreen(lang, 'everyday', 'broken_robot_waiter'))) {
        expect(s.title.trim().length).toBeGreaterThan(0);
        expect(s.message.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('новые наборы (лимит/бюджет/ошибка): непустые на всех языках и вариантах', () => {
    for (const lang of LANGS) {
      for (const make of [aiPersonalLimitToast, aiGlobalBudgetToast, aiErrorToast]) {
        for (const t of forEachVariant(() => make(lang))) {
          expect(t.title.trim().length).toBeGreaterThan(0);
          expect(t.message.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('русский вариант отличается от английского placeholder — локализация реальна', () => {
    const ru = aiErrorToast('ru');
    const es = aiErrorToast('es');
    // оба непустые; ru на кириллице, es — нет
    expect(ru.title).toMatch(/[а-яё]/i);
    expect(es.title).not.toMatch(/[а-яё]/i);
  });
});

describe('ai offline copy — ротация вариантов', () => {
  it('explain выдаёт более одного различного заголовка при разном random', () => {
    const titles = new Set(forEachVariant(() => aiOfflineToast('ru', 'explain').title));
    expect(titles.size).toBeGreaterThan(1);
  });

  it('бюджет и ошибка дают РАЗНЫЕ наборы текстов (не путаются)', () => {
    const budget = new Set(forEachVariant(() => aiGlobalBudgetToast('ru').title));
    const error = new Set(forEachVariant(() => aiErrorToast('ru').title));
    // пересечения быть не должно — это разные ситуации
    for (const b of budget) expect(error.has(b)).toBe(false);
  });
});

describe('dialog error mapping — глобальный бюджет vs rate-limit', () => {
  it('глобальный бюджет НЕ читается как rate_limited', () => {
    const budgetErr = { code: 'functions/resource-exhausted', message: 'explain_global_budget' };
    expect(classifyPremiumDialogError(budgetErr)).toBe('global_budget');
  });

  it('обычный resource-exhausted (без бюджета) остаётся rate_limited', () => {
    const rate = { code: 'functions/resource-exhausted', message: 'dialog_rate_limited' };
    expect(classifyPremiumDialogError(rate)).toBe('rate_limited');
  });

  it('лимиты, auth и age по-прежнему классифицируются отдельно', () => {
    expect(classifyPremiumDialogError({ message: 'dialog_free_limit' })).toBe('free_limit');
    expect(classifyPremiumDialogError({ message: 'dialog_plus_required' })).toBe('free_limit');
    expect(classifyPremiumDialogError({ message: 'dialog_premium_cap' })).toBe('premium_limit');
    expect(classifyPremiumDialogError({ code: 'unauthenticated' })).toBe('auth_required');
    expect(classifyPremiumDialogError({ message: 'age_restricted' })).toBe('age_restricted');
  });

  it('сообщение глобального бюджета — забавный непустой текст (не «слишком много сообщений»)', () => {
    const budgetErr = { code: 'functions/resource-exhausted', message: 'explain_global_budget' };
    const msg = getPremiumDialogErrorMessage(budgetErr, { lang: 'ru' });
    expect(msg.trim().length).toBeGreaterThan(0);
    // не должно быть текста rate-limit
    expect(msg).not.toContain('Слишком много сообщений');
  });

  it('лимиты остаются серьёзными (Plus/лимит), не подменяются шуткой', () => {
    const free = getPremiumDialogErrorMessage({ message: 'dialog_plus_required' }, { lang: 'ru' });
    expect(free).toContain('Plus');
    expect(free).not.toContain('Пробный диалог');
    const premium = getPremiumDialogErrorMessage({ message: 'dialog_premium_cap' }, { lang: 'ru' });
    expect(premium).toContain('Лимит диалогов');
  });
});
