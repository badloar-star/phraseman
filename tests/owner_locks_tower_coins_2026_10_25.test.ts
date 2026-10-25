/**
 * ЗАМОК ВЛАДЕЛЬЦА 25.10: «убери обводки фиолетовые вокруг монеток на башне! Пик».
 * Монеты на башне Пика (соперники на этажах и своя метка) — без кольца Plus и без обводки, во всех темах.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('ЗАМОК 25.10: монеты на башне Пика без обводки', () => {
  it('соперники на этажах: SpireRankCoin без кольца Plus', () => {
    const src = read('components/spire/SpireTowerRivals.tsx');
    expect(src).toContain('const coin = <SpireRankCoin rank={m.coinRank} size={size} plus={false} />;');
    expect(src).not.toMatch(/SpireRankCoin[^>]*plus=\{m\.isPremium\}/);
    expect(src).not.toMatch(/borderWidth|borderColor/);
  });

  it('своя метка: монета без кольца Plus и на «Сцене», и в прежнем окне', () => {
    const src = read('components/spire/SpireTowerMarker.tsx');
    const coins = src.match(/<AvatarView [^>]*\/>/g) ?? [];
    expect(coins.length).toBeGreaterThanOrEqual(2);
    for (const c of coins) expect(c).toContain('plus={false}');
  });

  it('замок записан в журнале замков владельца', () => {
    expect(read('docs/work/OWNER_LOCKS.md')).toContain('tests/owner_locks_tower_coins_2026_10_25.test.ts');
  });
});
