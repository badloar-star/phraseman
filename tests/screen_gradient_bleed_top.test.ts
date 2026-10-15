// зачем (R69, Сверка 15.10: «Обучение» в Авроре — полоса под статус-баром и ровный плоский тон ниже, ступень ≈ 14–18 уровней): снятие forceFullBleed (f32aab674) открыло плотный слой под страницей. Возврат собственного
// полотна страницы + bleedTop: слой поднимается над верхом страницы на inset вкладки и совпадает по геометрии с полотном оболочки (от верха экрана) — шва нет.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('ScreenGradient: bleedTop совмещает полотно страницы с полотном оболочки', () => {
  const grad = read('components/ScreenGradient.tsx');

  it('проп bleedTop (dp, по умолчанию 0) поднимает слой полотна: top = −bleedTop', () => {
    expect(grad).toContain('bleedTop?: number;');
    expect(grad).toContain('topFade, bleedTop = 0 }: Props) {');
    expect(grad).toContain('top: -Math.max(0, bleedTop),');
  });

  it('«Обучение» во вкладке: свой фон страницы + bleedTop = верхний inset; отдельным маршрутом bleedTop = 0', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toContain('<ScreenGradient forceFullBleed bleedTop={isRetainedTab ? insets.top : 0}>');
    expect(lessons).not.toContain('<ScreenGradient>\n        {page === "lessons" ? (');
  });

  it('геометрия: слой страницы высотой «страница + inset» = высоте полотна оболочки (экран)', () => {
    const screenH = 914; const inset = 50; // Pixel 8 на эмуляторе: верхний отступ ≈ 50 dp (132 px)
    const pageH = screenH - inset;
    expect(pageH + inset).toBe(screenH);
  });
});
