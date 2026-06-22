import {
  TRANSLATE_LIMIT_PER_DIALOG,
  decideTranslateAction,
  shouldShowTranslateButton,
  translateRemaining,
} from '../app/dialog_translate_limit';

describe('dialog_translate_limit — лимит переводов реплик собеседника', () => {
  describe('translateRemaining', () => {
    it('считает остаток от лимита по умолчанию (3)', () => {
      expect(translateRemaining(0)).toBe(3);
      expect(translateRemaining(1)).toBe(2);
      expect(translateRemaining(3)).toBe(0);
    });

    it('никогда не отрицательный (защита от перерасхода)', () => {
      expect(translateRemaining(5)).toBe(0);
      expect(translateRemaining(99, TRANSLATE_LIMIT_PER_DIALOG)).toBe(0);
    });
  });

  describe('decideTranslateAction', () => {
    const base = { hasTranslation: false, isFlipped: false, used: 0, isBusy: false };

    it('новая реплика при наличии лимита → загрузить с сервера (тратит лимит)', () => {
      expect(decideTranslateAction({ ...base })).toBe('fetch');
    });

    it('уже показанный перевод → скрыть (бесплатно)', () => {
      expect(decideTranslateAction({ ...base, hasTranslation: true, isFlipped: true })).toBe('hide');
    });

    it('перевод загружен, но скрыт → показать из кэша (бесплатно, без сервера)', () => {
      expect(decideTranslateAction({ ...base, hasTranslation: true, isFlipped: false })).toBe('show_cached');
    });

    it('кэш доступен даже при исчерпанном лимите → показать из кэша', () => {
      expect(
        decideTranslateAction({ hasTranslation: true, isFlipped: false, used: 3, isBusy: false }),
      ).toBe('show_cached');
    });

    it('новая реплика при исчерпанном лимите → ничего (платный запрос заблокирован)', () => {
      expect(decideTranslateAction({ ...base, used: 3 })).toBe('noop');
    });

    it('идёт загрузка другого перевода → ничего (без параллельных запросов)', () => {
      expect(decideTranslateAction({ ...base, isBusy: true })).toBe('noop');
    });

    it('флип назад приоритетнее лимита: уже открытую реплику всегда можно свернуть', () => {
      expect(
        decideTranslateAction({ hasTranslation: true, isFlipped: true, used: 3, isBusy: true }),
      ).toBe('hide');
    });
  });

  describe('shouldShowTranslateButton', () => {
    it('у НЕ открытой реплики прячем кнопку при исчерпанном лимите', () => {
      expect(shouldShowTranslateButton(false, 3)).toBe(false);
    });

    it('у НЕ открытой реплики показываем, пока лимит есть', () => {
      expect(shouldShowTranslateButton(false, 0)).toBe(true);
      expect(shouldShowTranslateButton(false, 2)).toBe(true);
    });

    it('у уже переведённой реплики кнопка ВСЕГДА видна (свернуть/развернуть)', () => {
      expect(shouldShowTranslateButton(true, 3)).toBe(true);
      expect(shouldShowTranslateButton(true, 99)).toBe(true);
    });
  });

  describe('сценарий «3 перевода на диалог суммарно»', () => {
    it('после 3 загрузок новые реплики больше не переводятся, но кэш доступен', () => {
      // Открыли 3 разные реплики (used=3). Четвёртая новая — заблокирована.
      expect(decideTranslateAction({ hasTranslation: false, isFlipped: false, used: 3, isBusy: false })).toBe('noop');
      expect(shouldShowTranslateButton(false, 3)).toBe(false);
      // Любую из 3 уже открытых — сворачиваем/разворачиваем бесплатно.
      expect(decideTranslateAction({ hasTranslation: true, isFlipped: true, used: 3, isBusy: false })).toBe('hide');
      expect(decideTranslateAction({ hasTranslation: true, isFlipped: false, used: 3, isBusy: false })).toBe('show_cached');
    });
  });
});
