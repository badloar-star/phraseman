import {
  mergeAccessibilityDisabled,
  mergeSwitchAccessibilityState,
} from '../components/a11y_state';

describe('mergeAccessibilityDisabled', () => {
  it('выводит disabled из флага, когда extra пуст', () => {
    expect(mergeAccessibilityDisabled(undefined, true)).toEqual({ disabled: true });
    expect(mergeAccessibilityDisabled(undefined, false)).toEqual({ disabled: false });
    expect(mergeAccessibilityDisabled(undefined, undefined)).toEqual({ disabled: false });
  });

  it('сохраняет прочие поля extra (selected, busy и т.д.)', () => {
    expect(
      mergeAccessibilityDisabled({ selected: true, busy: true }, false),
    ).toEqual({ selected: true, busy: true, disabled: false });
  });

  it('реальный disabled перекрывает disabled из extra', () => {
    // вызывающий ошибочно передал disabled:false, но компонент disabled
    expect(mergeAccessibilityDisabled({ disabled: false }, true)).toEqual({
      disabled: true,
    });
  });

  it('не мутирует переданный extra', () => {
    const extra = { selected: true };
    mergeAccessibilityDisabled(extra, true);
    expect(extra).toEqual({ selected: true });
  });
});

describe('mergeSwitchAccessibilityState', () => {
  it('checked выводится из value, disabled из флага', () => {
    expect(mergeSwitchAccessibilityState(undefined, true, false)).toEqual({
      checked: true,
      disabled: false,
    });
    expect(mergeSwitchAccessibilityState(undefined, false, true)).toEqual({
      checked: false,
      disabled: true,
    });
  });

  it('value/disabled перекрывают одноимённые поля в extra', () => {
    expect(
      mergeSwitchAccessibilityState({ checked: false, disabled: false }, true, true),
    ).toEqual({ checked: true, disabled: true });
  });

  it('сохраняет прочие поля extra', () => {
    expect(
      mergeSwitchAccessibilityState({ busy: true }, true, false),
    ).toEqual({ busy: true, checked: true, disabled: false });
  });
});
