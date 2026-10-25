// Сверка m18-A (parity-311 строка 5б, координатор 25.10): в итоге диалога «+N монет» — строка-плашка как в эталоне `.sf`
// (монета 30 слева, «+N монет» 16/700), а не крупное центрованное число итога урока. Итог урока не меняется.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('итог диалога: плашка «+N монет»', () => {
  const done = read('components/completion/V2DoneScreen.tsx');
  const route = read('app/dialogue_v2_completion.tsx');

  it('итог диалога включает плашку, итог урока — нет', () => {
    expect(route).toContain('<CoinAward amount={dialogCoinReward.coins} lang={lang} g={lv2Glass} animate={!reduceMotion} plaque />');
    expect(done).toMatch(/plaque = false \}: \{ amount: number; lang: Lang; g: Lv2Glass; animate: boolean; plaque\?: boolean \}/);
    expect((done.match(/<CoinAward [^>]*plaque/g) ?? []).length).toBe(0);
  });

  it('плашка — тон и тень темы, без обводки; монета 30, текст 16/700 слева', () => {
    expect(done).toContain('s.awardPlaque, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }');
    const style = /awardPlaque: \{([^}]*)\}/.exec(done)?.[1] ?? '';
    expect(style).not.toMatch(/border(Width|Color)/);
    expect(done).toContain('awardPlaqueCoin: { width: 30, height: 30 }');
    expect(done).toMatch(/awardPlaqueText: \{ flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700'/);
    expect(done).not.toMatch(/adjustsFontSizeToFit/);
  });
});
