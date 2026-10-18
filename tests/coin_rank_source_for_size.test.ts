// зачем (координатор 18.10, Ревизор: монеты на «Пике» пустые до ~9 с): исходник 768² в 18–40 dp — дорогой декод. Показ берёт копию под размер:
// 96² до 96 px, 192² до 192 px, крупнее — исходник. Копии лежат рядом с исходниками и не подменяют их.
import fs from 'fs';
import path from 'path';
import { COIN_RANK_TABLE, coinRankSourceForSize } from '../app/coin_rank_table_v1';

describe('coinRankSourceForSize — копия монеты под размер показа', () => {
  it('выбор по пикселям: 18 dp×3 → 96², 40 dp×3 → 192², 120 dp×3 → исходник', () => {
    expect(coinRankSourceForSize(5, 18, 3).variant).toBe('s96');
    expect(coinRankSourceForSize(5, 32, 3).variant).toBe('s96');
    expect(coinRankSourceForSize(5, 40, 3).variant).toBe('s192');
    expect(coinRankSourceForSize(5, 64, 3).variant).toBe('s192');
    expect(coinRankSourceForSize(5, 120, 3).variant).toBe('full');
    expect(coinRankSourceForSize(5, 120, 3).source).toBe(COIN_RANK_TABLE[5]!.source);
  });

  it('битый ранг и плотность не роняют показ', () => {
    expect(coinRankSourceForSize(Number.NaN, 24, 2).variant).toBe('s96');
    expect(coinRankSourceForSize(99, 24, 0).variant).toBe('s96');
  });

  it('копии есть для всех 20 рангов и они меньше исходников', () => {
    const dir = path.join(__dirname, '..', 'assets', 'images', 'coins');
    for (let r = 0; r < 20; r += 1) {
      const name = `coin_rank_${String(r).padStart(2, '0')}.webp`;
      const full = fs.statSync(path.join(dir, name)).size;
      for (const sub of ['s96', 's192']) {
        const small = fs.statSync(path.join(dir, sub, name)).size;
        expect(small).toBeGreaterThan(0);
        expect(small).toBeLessThan(full);
      }
    }
  });
});
