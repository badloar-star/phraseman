// зачем (владелец 04.11, UX-приятности, волна 1): сторож общего UI-кита — вибрация только на управляющих кнопках, отклик при «Уменьшить движение», KitSpinner в загрузке.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const pressable = read('components/v2/V2Pressable.tsx');
const kit = read('components/v2/V2Kit.tsx');

/** Кусок исходника от объявления компонента до следующего экспорта. */
function block(src: string, name: string): string {
  const start = src.indexOf(`export const ${name} = memo(`);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf('\nexport ', start + 10);
  return src.slice(start, next === -1 ? undefined : next);
}

describe('волна 1 UI-кита', () => {
  it('V2Pressable: вибрация по умолчанию выключена', () => {
    expect(pressable).toContain('withHaptic = false');
    expect(pressable).not.toContain('withHaptic = true');
  });

  it('вибрация включена только на управляющих кнопках, не на строках и карточках', () => {
    expect(block(kit, 'V2Button')).toContain('withHaptic');
    expect(block(kit, 'V2IconButton')).toContain('withHaptic');
    expect(block(kit, 'V2Row')).not.toContain('withHaptic');
    expect(block(kit, 'V2Card')).not.toContain('withHaptic');
    expect(block(kit, 'V2AnswerOption')).not.toContain('withHaptic');
  });

  it('при «Уменьшить движение» остаётся отклик прозрачностью, масштаба нет', () => {
    const start = pressable.indexOf('if (reduceMotion)');
    expect(start).toBeGreaterThan(-1);
    const branch = pressable.slice(start, start + 360);
    expect(branch).toContain('scale.setValue(1)');
    expect(branch).toContain('KIT_PRESS_OPACITY_DOWN');
    expect(branch).toContain('KIT_PRESS_OPACITY_UP');
  });

  it('V2Button.loading рисует KitSpinner, а не системный индикатор', () => {
    expect(kit).toContain('<KitSpinner color={fg} />');
    expect(kit).not.toContain('ActivityIndicator');
  });

  it('тосты объявляются диктором сами (accessibilityLiveRegion=polite)', () => {
    const action = read('components/ActionToast.tsx');
    const game = read('components/InGameToast.tsx');
    expect((action.match(/accessibilityLiveRegion="polite"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((game.match(/accessibilityLiveRegion="polite"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
