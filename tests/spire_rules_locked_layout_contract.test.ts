// зачем (разбор размеров реестра 13.10, community-004 и spire-gap-011): числа вёрстки шторки правил и замка Шпиля берутся из образцов
// (`community.html` leagueRules, `spire-gaps-states.html` `.sg-lock`) как dp = css px; масштаб кадров 411/390 в правки не попадает.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Шпиль: шторка правил и замок — размеры по образцам', () => {
  const rules = read('components/spire/SpireRulesSheet.tsx');
  const locked = read('components/spire/SpireLockedState.tsx');

  it('шторка правил: заголовок 19/24, кружок 32 с цифрой 15, зазор 14, строки с отступом 10, «Закрыть» 48 с отступом 14', () => {
    expect(rules).toMatch(/title: \{ fontSize: 19, lineHeight: 24, fontWeight: '700' \}/);
    expect(rules).toMatch(/list: \{ marginTop: 10,/);
    expect(rules).toMatch(/row: \{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 10 \}/);
    expect(rules).toMatch(/num: \{ width: 32, height: 32, borderRadius: 16,/);
    expect(rules).toMatch(/numText: \{ fontSize: 15, fontWeight: '700' \}/);
    expect(rules).toMatch(/cta: \{ marginTop: 14, minHeight: 48, borderRadius: 24,/);
    expect(rules).toMatch(/line: \{ flex: 1, fontSize: 16, lineHeight: 22 \}/);
  });

  it('замок: нижний отступ 60 как у `.in` макета — центр на ≈49,5 % высоты', () => {
    expect(locked).toMatch(/root: \{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: V2\.screenPad \* 2, paddingBottom: 60 \}/);
    expect(locked).toMatch(/fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0\.3/);
  });
});
