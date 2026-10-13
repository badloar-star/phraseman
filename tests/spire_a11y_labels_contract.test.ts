// зачем (№28 R1_BACKLOG, доступность TalkBack новых элементов 13.10): монеты рангов, подиум «Комната недели», «Все участники», «Играть», «Итог недели» —
// подписи только через словари на 9 языков (без хардкода), у каждой кнопки Пика есть подпись, монета рангов скрыта от читалки (её читает родитель).
import fs from 'node:fs';
import path from 'node:path';

import { SPIRE_STRINGS } from '../components/spire/spire_strings';
import { SPIRE_GAME_STRINGS } from '../components/spire/spire_game_strings';

const root = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

describe('Пик: доступность (TalkBack)', () => {
  it('подписи, которые читает TalkBack, есть на всех 9 языках и не пустые', () => {
    const keys: Array<[string, Readonly<Record<string, readonly string[]>>]> = [
      ['title', SPIRE_STRINGS], ['climb', SPIRE_STRINGS], ['allMembers', SPIRE_STRINGS], ['roomWeek', SPIRE_STRINGS], ['you', SPIRE_STRINGS], ['back', SPIRE_STRINGS],
      ['weekResult', SPIRE_GAME_STRINGS], ['retry', SPIRE_GAME_STRINGS],
    ];
    for (const [key, dict] of keys) {
      const row = dict[key];
      expect(row).toBeDefined();
      expect(row).toHaveLength(9);
      for (const text of row) expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  it('каждая кнопка V2Pressable в экранах Пика читается: есть accessibilityLabel или видимый <Text> внутри', () => {
    const files = fs.readdirSync(path.join(root, 'components/spire')).filter((f) => f.endsWith('.tsx'));
    const bad: string[] = [];
    for (const f of files) {
      const src = read(`components/spire/${f}`);
      const re = /<V2Pressable\b([\s\S]*?)<\/V2Pressable>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        // зачем: кнопка с видимым текстом читается TalkBack по этому тексту (он из словаря); без текста подпись обязательна
        if (!m[1].includes('accessibilityLabel') && !m[1].includes('<Text')) bad.push(`${f}: ${m[1].replace(/\s+/g, ' ').slice(0, 70)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('подписи не хардкодятся строкой-литералом: только словари и шаблоны над ними', () => {
    const files = fs.readdirSync(path.join(root, 'components/spire')).filter((f) => f.endsWith('.tsx'));
    const bad: string[] = [];
    for (const f of files) {
      const src = read(`components/spire/${f}`);
      for (const m of src.matchAll(/accessibilityLabel=(["'])([^"']+)\1/g)) bad.push(`${f}: ${m[2]}`);
    }
    expect(bad).toEqual([]);
  });

  it('«Играть», подиум, «Все участники», «Итог недели» — роль, подпись и состояние на месте', () => {
    const dock = read('components/spire/SpireClimbDock.tsx');
    expect(dock).toContain("accessibilityLabel={note ? `${spireText(lang, 'climb')}. ${note}` : spireText(lang, 'climb')}");
    expect(dock).toContain('accessibilityState={{ disabled: !enabled, busy }}');
    const podium = read('components/spire/SpirePodium.tsx');
    expect(podium).toContain('accessibilityRole="header"');
    expect(podium).toContain('accessibilityLabel={allLabel}');
    expect(podium).toContain('accessibilityLabel={`${place}. ${m.name}, ${spireStepsCount(lang, m.steps)}`}');
    expect(read('components/spire/SpireAllMembers.tsx')).toContain("spireText(lang, 'you')");
    expect(read('components/spire/SpireWeekResultCard.tsx')).toContain("accessibilityLabel={`${spireGameText(lang, 'weekResult')}. ${title}. ${sub}`}");
    // V2Pressable сам даёт accessibilityRole="button"
    expect(read('components/v2/V2Pressable.tsx')).toContain('accessibilityRole="button"');
  });

  it('монета ранга скрыта от читалки: имя, место и ступени читает подпись родителя', () => {
    const coin = read('components/spire/SpireRankCoin.tsx');
    expect(coin).toContain('importantForAccessibility="no-hide-descendants"');
    expect(coin).toContain('accessibilityElementsHidden');
  });
});
