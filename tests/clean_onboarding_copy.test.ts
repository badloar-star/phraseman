import { onboardingCopy, fill, ONBOARDING_COPY_TABLE, type OnboardingCopyKey } from '../components/onboarding/clean_onboarding_copy';
import { ONBOARDING_LANG_KEYS } from '../components/onboarding/clean_onboarding_dates';

// зачем (координатор 12.10): онбординг на 9 языках. Сторож: у каждого ключа есть все 9 языков, подстановки совпадают,
// в чужих языках не остаётся кириллицы, а короткие подписи не длиннее места под них (вид заморожен, строки не должны его ломать).
const KEYS = Object.keys(ONBOARDING_COPY_TABLE) as OnboardingCopyKey[];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const CYRILLIC = /[А-Яа-яЁёІіЇїЄєҐґ]/;

// {days} в русском и украинском сокращается до «дн.», поэтому там подстановки нет — единственное исключение.
const PLACEHOLDER_EXCEPTIONS = new Set<string>(['promoOkDays']);

describe('onboarding copy covers every interface language', () => {
  it('has 9 non-empty entries per key', () => {
    for (const key of KEYS) {
      const tuple = ONBOARDING_COPY_TABLE[key];
      expect(tuple).toHaveLength(ONBOARDING_LANG_KEYS.length);
      tuple.forEach((value, index) => {
        expect({ key, lang: ONBOARDING_LANG_KEYS[index], ok: typeof value === 'string' && value.length > 0 }).toEqual({ key, lang: ONBOARDING_LANG_KEYS[index], ok: true });
      });
    }
  });

  it('keeps the same {placeholders} in every language', () => {
    for (const key of KEYS) {
      if (PLACEHOLDER_EXCEPTIONS.has(key)) continue;
      const tuple = ONBOARDING_COPY_TABLE[key] as readonly string[];
      const reference = placeholders(tuple[0]!);
      tuple.forEach((value, index) => {
        expect({ key, lang: ONBOARDING_LANG_KEYS[index], found: placeholders(value) }).toEqual({ key, lang: ONBOARDING_LANG_KEYS[index], found: reference });
      });
    }
  });

  it('leaves no Cyrillic in non-Slavic languages and no Russian letters in Ukrainian', () => {
    for (const key of KEYS) {
      (ONBOARDING_COPY_TABLE[key] as readonly string[]).forEach((value, index) => {
        const lang = ONBOARDING_LANG_KEYS[index]!;
        if (lang !== 'ru' && lang !== 'uk') expect({ key, lang, cyrillic: CYRILLIC.test(value) }).toEqual({ key, lang, cyrillic: false });
        if (lang === 'uk') expect({ key, lang, russianLetters: /[ыэъё]/i.test(value) }).toEqual({ key, lang, russianLetters: false });
      });
    }
  });

  it('translates every phrase: English and Ukrainian differ from the Russian original', () => {
    // Одинаково по смыслу и написанию в нескольких языках (бренд-слова, пунктуация).
    const SAME_ALLOWED = new Set<string>(['promoCode', 'friendCode', 'friendCodeCaps', 'back', 'legalWelcomePost', 'legalVaultPost', 'legalFinishPost']);
    const same: string[] = [];
    for (const key of KEYS) {
      if (SAME_ALLOWED.has(key)) continue;
      const [ru, uk, en] = ONBOARDING_COPY_TABLE[key] as readonly string[];
      if (en === ru) same.push(`${key}: en`);
      if (uk === ru) same.push(`${key}: uk`);
    }
    expect(same).toEqual([]);
  });

  it('keeps layout-critical strings short', () => {
    const LIMITS: Partial<Record<OnboardingCopyKey, number>> = {
      notifPushTitle: 26, // заголовок пуша в макете телефона — одна строка рядом с «сейчас»
      trialPushTitle: 32, // русский оригинал — 31 знак, остальные языки не длиннее
      tierYear: 12,
      tierMonth: 12,
      bestPrice: 20,
      tileYearCaptionShort: 18,
      tileMonthCaption: 18,
      tileOneTime: 24,
      tileOneTimeAccess: 24,
      sheetBilledMonthly: 24,
      sheetNoSubscription: 20,
      phoneNow: 10,
    };
    const tooLong: string[] = [];
    for (const [key, limit] of Object.entries(LIMITS) as [OnboardingCopyKey, number][]) {
      (ONBOARDING_COPY_TABLE[key] as readonly string[]).forEach((value, index) => {
        if (value.length > limit) tooLong.push(`${key}/${ONBOARDING_LANG_KEYS[index]}: ${value.length} > ${limit} «${value}»`);
      });
    }
    expect(tooLong).toEqual([]);
  });
});

describe('onboarding copy helpers', () => {
  it('picks the language, falls back to English and fills placeholders', () => {
    expect(onboardingCopy('ru').welcomeTitleNew).toBe('Начнём с чистого листа');
    expect(onboardingCopy('en').welcomeTitleNew).toBe('Let’s start fresh');
    expect(onboardingCopy('uk').start).toBe('Почати');
    expect(onboardingCopy('xx').start).toBe(onboardingCopy('en').start);
    expect(fill(onboardingCopy('en').backStep, { n: 2, total: 6 })).toBe('Back. Step 2 of 6');
    expect(fill('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });

  it('keeps the Russian wording that other contracts pin by substring', () => {
    const ru = onboardingCopy('ru');
    // зачем (полный прогон 25.10): текст сменил 10 · ПЕРЕВОДЧИК 18.10 (acd0c034c) — без «провайдера»; его же держит onboarding_auth_busy_state_contract
    expect(ru.signInBusy).toContain('Вход ещё идёт');
    expect(ru.signInBusy).toContain('Кнопки снова заработают');
    expect(ru.legalWelcomePre).toContain('Продолжая, ты принимаешь');
    expect(ru.continueFree).toBe('Продолжить на обычном аккаунте');
    expect(ru.renewalNote).toContain('Подписка продлевается автоматически');
    expect(ru.renewalNote).toContain('Отменить можно в настройках магазина');
    expect(ru.benefitEnergyTitle).toBe('Безлимит энергии');
    expect(ru.benefitAnalyticsTitle).toBe('Аналитика 365 дней');
  });
});
