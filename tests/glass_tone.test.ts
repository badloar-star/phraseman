import { glassTone } from '../components/dialogs/glass/glassTone';

// зачем (координатор 05.10): ступени тона хаба диалогов считаются от цвета ТЕКСТА темы — светлая тема темнеет, тёмная светлеет; не-hex не даёт непрозрачной заливки.
describe('glassTone', () => {
  test('dark theme (light text) lightens, light theme (dark text) darkens', () => {
    expect(glassTone('#FFFFFF', 0.09)).toBe('rgba(255,255,255,0.09)');
    expect(glassTone('#1A1B20', 0.09)).toBe('rgba(26,27,32,0.09)');
  });
  test('8-digit and 3-digit hex are supported, alpha is clamped', () => {
    expect(glassTone('#FFFFFFAA', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(glassTone('#fff', 2)).toBe('rgba(255,255,255,1)');
    expect(glassTone('#fff', -1)).toBe('rgba(255,255,255,0)');
  });
  test('non-hex input falls back to a faint neutral veil, never to the opaque colour', () => {
    expect(glassTone('rgb(10,10,10)', 0.09)).toBe('rgba(255,255,255,0.09)');
    expect(glassTone('red', 0.045)).toBe('rgba(255,255,255,0.045)');
    expect(glassTone('#GGGGGG', 0.09)).toBe('rgba(255,255,255,0.09)');
  });
});
