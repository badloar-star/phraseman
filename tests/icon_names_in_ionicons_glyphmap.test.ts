// зачем (координатор 13.10): имя значка, которого нет в Ionicons ('crown' у «Полтысячи»), на экране рисуется «?»,
// а имя, выведенное ТЕКСТОМ ('cube' в окне рассылки), видно человеку как слово. Сторож держит оба места по glyphmap.
import fs from 'node:fs';
import path from 'node:path';
import { ACHIEVEMENT_ICON } from '../constants/achievementIcons';

const root = path.join(__dirname, '..');
const glyphs: Record<string, number> = JSON.parse(
  fs.readFileSync(path.join(root, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'), 'utf8'),
);
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

describe('значки — только существующие имена Ionicons', () => {
  it('ACHIEVEMENT_ICON: каждое имя есть в glyphmap', () => {
    const missing = Object.entries(ACHIEVEMENT_ICON).filter(([, name]) => !(name in glyphs));
    expect(missing).toEqual([]);
    expect(ACHIEVEMENT_ICON.streak_500).toBe('podium');
  });

  it('GlobalBroadcastRewardIconName: всё, кроме собственной «rune», есть в glyphmap', () => {
    const src = read('app/global_broadcast_modal.ts');
    const block = src.slice(src.indexOf('export type GlobalBroadcastRewardIconName ='), src.indexOf(';', src.indexOf('export type GlobalBroadcastRewardIconName =')));
    const names = [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).filter((n) => n !== 'rune');
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => !(n in glyphs))).toEqual([]);
  });

  it('окно рассылки рисует значок награды значком, а не текстом; английская подпись своя', () => {
    const modal = read('components/GlobalBroadcastModal.tsx');
    expect(modal).toContain("import Ionicons from '@expo/vector-icons/Ionicons';");
    expect(modal).toContain('<Ionicons testID="global-broadcast-reward-icon" name={reward.icon} size={44} color={glass.text} />');
    expect(modal).toContain("reward.icon === 'rune'");
    expect(modal).not.toMatch(/<Text[^>]*>\{reward\.icon\}<\/Text>/);
    expect(modal).toContain('en: reward.labelEn,');
    expect(modal).not.toContain('en: reward.labelRu,');
    const badge = read('app/global_broadcast_modal.ts');
    expect(badge).toContain("labelEn: '48-hour trial pack',");
  });
});
