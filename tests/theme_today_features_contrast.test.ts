// зачем (координатор 13.10, аудит тем по фичам дня): тур Шпиля (игроки с монетами), красная «Очистить память» без заливки, карточка целей итога диалога,
// инфо-тосты — все цвета берутся из токенов темы; здесь проверяем, что пары читаются (текст ≥ 4,5, значки ≥ 3) во всех 23 темах, обоих оформлениях и на
// пяти шагах ползунка (в том числе на краях 0 и 1: светлая «Сумерки» и тёмный «Океан» входят в 23).
import { liquidGlassTokens, LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';

const lum = (hex: string) => {
  const h = hex.replace('#', '').slice(0, 6);
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

describe('контраст фич дня 13.10 по токенам темы', () => {
  const bad: string[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
        const t = liquidGlassTokens(id, { intensity, appearance } as never) as unknown as Record<string, string>;
        const at = `${id}|${appearance}|${intensity}`;
        // тур Шпиля, страница 3: строки игроков лежат на opaqueControl (cardRaised)
        if (ratio(t.text!, t.opaqueControl!) < 4.5) bad.push(`${at} тур: text→opaqueControl`);
        if (ratio(t.secondary!, t.opaqueControl!) < 4.5) bad.push(`${at} тур: secondary→opaqueControl (подпись «ступ.», номер места)`);
        if (ratio(t.good!, t.opaqueControl!) < 3) bad.push(`${at} тур: стрелка вверх good→opaqueControl`);
        // «Очистить память этого языка»: красный текст без заливки лежит прямо на градиенте фона
        for (const surface of ['bgTop', 'bgBottom']) if (ratio(t.bad!, t[surface]!) < 4.5) bad.push(`${at} память: bad→${surface}`);
        // карточка целей итога диалога и строки итога: основной и вторичный текст на плите
        for (const surface of ['opaqueCard', 'plateFillFrom']) {
          if (ratio(t.text!, t[surface]!) < 4.5) bad.push(`${at} цели: text→${surface}`);
          if (ratio(t.secondary!, t[surface]!) < 4.5) bad.push(`${at} цели: secondary→${surface}`);
        }
        // инфо-тосты (Карточки): тон info как текст/значок на плите тоста
        if (ratio(t.info!, t.opaqueCard!) < 3) bad.push(`${at} инфо-тост: info→opaqueCard`);
      }
    }
  }
  it('нарушений нет', () => {
    expect(bad).toEqual([]);
  });
});
