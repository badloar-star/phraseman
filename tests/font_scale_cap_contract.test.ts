import fs from 'node:fs';
import path from 'node:path';

import { APP_MAX_FONT_SCALE, effectiveFontScale } from '../constants/font_scale_cap';

// Сторож общего потолка системного шрифта (владелец 11.11.2026, жалоба Стеллы: «интерфейс обязан подстраиваться под размер устройства,
// а не быть на маленьких устройствах огромным»). Раньше свой потолок стоял примерно у 12% текстов, остальные росли до ×2.
// Потолок ставится патчем Text/TextInput (defaultProps на React 19 не работают). Сработал сторож — чинить причину, а не ослаблять его.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('общий потолок системного шрифта', () => {
  const patch = read('patches/react-native+0.81.5.patch');
  const section = (file: string): string => {
    const start = patch.indexOf(`diff --git a/node_modules/react-native/${file}`);
    expect(start).toBeGreaterThanOrEqual(0);
    const next = patch.indexOf('\ndiff --git ', start + 1);
    return next === -1 ? patch.slice(start) : patch.slice(start, next);
  };

  it('потолок — 1.3, и число в патче совпадает с константой приложения', () => {
    expect(APP_MAX_FONT_SCALE).toBe(1.3);
    const declared = [...patch.matchAll(/^\+const phrasemanMaxFontSizeMultiplier = ([\d.]+);$/gm)].map((m) => Number(m[1]));
    expect(declared).toEqual([APP_MAX_FONT_SCALE, APP_MAX_FONT_SCALE]);
  });

  it('Text получает потолок на всех четырёх путях отрисовки, и стоит он ДО пропсов вызывающего — явный проп побеждает', () => {
    const text = section('Libraries/Text/Text.js');
    expect(text.match(/^\+\s+maxFontSizeMultiplier: phrasemanMaxFontSizeMultiplier,\n[ +-]\s+\.\.\.restProps,$/gm)).toHaveLength(2);
    expect(text.match(/^\+\s+maxFontSizeMultiplier=\{phrasemanMaxFontSizeMultiplier\}\n\s+\{\.\.\.restProps\}$/gm)).toHaveLength(2);
    // прежняя часть патча (шрифт приложения) на месте
    expect(text).toContain("+const phrasemanDefaultTextStyle = {fontFamily: 'Inter'};");
    expect(text).toContain('+  _style = [phrasemanDefaultTextStyle, _style];');
  });

  it('поле ввода получает тот же потолок на обеих платформах', () => {
    const input = section('Libraries/Components/TextInput/TextInput.js');
    expect(input.match(/^\+\s+maxFontSizeMultiplier=\{phrasemanMaxFontSizeMultiplier\}\n\s+\{\.\.\.otherProps\}$/gm)).toHaveLength(2);
  });

  it('прежняя правка анимаций в том же патче не потеряна', () => {
    expect(section('src/private/animated/createAnimatedPropsHook.js')).toContain('+    const useAnimatedPropsLifecycle = useAnimatedPropsLifecycleWithPrevNodeRef;');
  });

  it('effectiveFontScale: не ниже 1, не выше потолка; явный предел побеждает', () => {
    for (const scale of [1, 0.85, 0, -1, Number.NaN]) expect(effectiveFontScale(scale)).toBe(1);
    expect(effectiveFontScale(1.15)).toBe(1.15);
    expect(effectiveFontScale(2)).toBe(1.3);
    expect(effectiveFontScale(2, 1.4)).toBe(1.4);
    expect(effectiveFontScale(2, 1.15)).toBe(1.15);
  });
});
