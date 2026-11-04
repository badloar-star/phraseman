// Таблица входов пейвола C (координатор 04.11): каждый контекст из PREMIUM_CONTEXT_VALUES проходит всю цепочку
// «маршрут → разбор входа → тексты на 9 языках» и не теряется. Отдельно — именованные сценарии (language_add, уроки 4+, Plus-ряд,
// облако без подтверждения, Plus-пользователь). Тест чистый (без экрана и сети): экран C рисует то, что отдаёт эта цепочка.
import { PREMIUM_CONTEXT_VALUES } from '../app/premium_context';
import { resolvePremiumModalEntry } from '../app/paywall_entry_contract';
import { paywallContextHeadline } from '../app/paywall_context_headline';
import { PAYWALL_TEXT_LANGS } from '../app/paywall_context_texts';
import { lessonPaywallContext } from '../app/monetization_policy';

const FREE_RESOLVED = { accessResolved: true, hasPremiumAccess: false, impressionId: 'imp-test', cloudConfirmedOnDevice: true } as const;

describe('пейвол C: вход из каждого контекста', () => {
  it.each([...PREMIUM_CONTEXT_VALUES])('контекст %s: бесплатный человек видит окно именно этого контекста', (context) => {
    const result = resolvePremiumModalEntry({ ...FREE_RESOLVED, params: { context, source: 'direct' } });
    expect(result.decision).toBe('show');
    if (result.decision === 'show') expect(result.entry.context).toBe(context);
  });

  it.each([...PREMIUM_CONTEXT_VALUES])('контекст %s: заголовок, подзаголовок и первая выгода есть на всех 9 языках', (context) => {
    for (const lang of PAYWALL_TEXT_LANGS) {
      const head = paywallContextHeadline(context, lang);
      expect(head.title.trim().length).toBeGreaterThan(0);
      expect(head.subtitle.trim().length).toBeGreaterThan(0);
      expect(head.firstBenefit.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('пейвол C: именованные сценарии', () => {
  it('«Ещё один язык» (language_add): окно открывается и говорит про язык', () => {
    const r = resolvePremiumModalEntry({ ...FREE_RESOLVED, params: { context: 'language_add', source: 'direct' } });
    expect(r).toMatchObject({ decision: 'show', entry: { context: 'language_add' } });
    expect(paywallContextHeadline('language_add', 'en').copyContext).toBe('language_add');
  });
  it('уроки 4+: контекст курса; уроки 1–3 пейвола не имеют', () => {
    expect(lessonPaywallContext(1)).toBeNull();
    expect(lessonPaywallContext(3)).toBeNull();
    expect(lessonPaywallContext(4)).toBe('course_after_lesson3');
    expect(lessonPaywallContext(9)).toBe('course_after_lesson3');
    const r = resolvePremiumModalEntry({ ...FREE_RESOLVED, params: { context: 'course_after_lesson3', source: 'direct', lessonId: '4' } });
    expect(r).toMatchObject({ decision: 'show', entry: { context: 'course_after_lesson3' } });
  });
  it('универсальный вход (Plus-ряд / «Сегодня» / настройки) открывает generic', () => {
    expect(resolvePremiumModalEntry({ ...FREE_RESOLVED, params: {} })).toMatchObject({ decision: 'show', entry: { context: 'generic' } });
    expect(resolvePremiumModalEntry({ ...FREE_RESOLVED, params: { context: 'generic', source: 'settings_premium' } })).toMatchObject({ decision: 'show', entry: { context: 'generic' } });
  });
  it('замок раздела по рангу: generic-пейвол с источником rank_locked (отдельных текстов нет)', () => {
    const r = resolvePremiumModalEntry({ ...FREE_RESOLVED, params: { context: 'generic', source: 'rank_locked' } });
    expect(r).toMatchObject({ decision: 'show', entry: { context: 'generic', source: 'rank_locked' } });
  });
  it('строка «Попробуй Plus бесплатно»: generic + источник home_trial_row (тексты и триал-оффер общие)', () => {
    const r = resolvePremiumModalEntry({ ...FREE_RESOLVED, params: { context: 'generic', source: 'home_trial_row' } });
    expect(r).toMatchObject({ decision: 'show', entry: { context: 'generic', source: 'home_trial_row' } });
  });
  it('облако не подтвердило статус → окно «Восстановить / Оформить» (plus_server_refused), источник входа сохранён', () => {
    const r = resolvePremiumModalEntry({ ...FREE_RESOLVED, cloudConfirmedOnDevice: false, params: { context: 'language_add', source: 'direct' } });
    expect(r).toMatchObject({ decision: 'show', entry: { context: 'plus_server_refused', source: 'direct' } });
  });
  it('человек с Plus окно не видит (кроме отказа сервера), доступ не определён → ждём', () => {
    expect(resolvePremiumModalEntry({ ...FREE_RESOLVED, hasPremiumAccess: true, params: { context: 'language_add' } })).toMatchObject({ decision: 'dismiss' });
    expect(resolvePremiumModalEntry({ accessResolved: false, hasPremiumAccess: false, impressionId: 'i', params: { context: 'language_add' } })).toMatchObject({ decision: 'wait' });
  });
  it('неизвестный контекст не открывает чужое окно', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    // в тестах и dev вход громко падает (strict), в релизе — молча-логируемый dismiss: в обоих случаях чужое окно не открывается
    expect(() => resolvePremiumModalEntry({ ...FREE_RESOLVED, params: { context: 'no_such_context' } })).toThrow('unknown_paywall_context:no_such_context');
  });
});
