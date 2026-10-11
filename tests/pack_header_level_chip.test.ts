// зачем (сверка Макетов e4e4149d0): шапка своего и добавленного набора показывает уровень (A2/B2) тем же чипом, что каталог.
import { readFileSync } from 'fs';
import { join } from 'path';
import { packDeckLevel } from '../components/packs/packDeckModel';

const collection = readFileSync(join(__dirname, '..', 'app', 'flashcards_collection.tsx'), 'utf8');

describe('уровень в шапке набора', () => {
  it('flashcards_collection передаёт уровень набора в PackInfoBlock', () => {
    expect(collection).toMatch(/level=\{packDeckLevel\(currentMarketPack\)\}/);
    expect(collection).toMatch(/import \{ packDeckLevel \} from '\.\.\/components\/packs\/packDeckModel'/);
  });

  it('packDeckLevel: A1–C2 приводится к верхнему регистру, мусор и пустое — null (чип скрыт)', () => {
    expect(packDeckLevel({ level: 'b2' })).toBe('B2');
    expect(packDeckLevel({ level: ' A2 ' })).toBe('A2');
    expect(packDeckLevel({ level: 'D9' })).toBeNull();
    expect(packDeckLevel(null)).toBeNull();
    expect(packDeckLevel({})).toBeNull();
  });
});
