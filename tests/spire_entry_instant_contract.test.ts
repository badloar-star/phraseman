// зачем (аудит Optimistic UI Шпиля, координатор 13.10): вход на экран Шпиля не рисует пустой кадр ожидания конфига, а блоки, которые появляются в потоке НАД башней
// (плашка «нет сети», карточка «Итог недели»), встают плавно, а не скачком (Performance Bible → Layout Stability). Контракт по строкам файлов.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('вход в Шпиль: первый кадр из памяти процесса', () => {
  const client = read('app/spire_config_client.ts');
  const home = read('components/spire/SpireHomeScreen.tsx');

  it('клиент конфига отдаёт последний настоящий конфиг синхронно и не запоминает дефолт «выключен»', () => {
    expect(client).toMatch(/export function peekSpireConfig\(\): SpireConfigDoc \| null/);
    // память пишется на всех путях, где вернулся НАСТОЯЩИЙ конфиг (кэш, сеть, старый кэш при сбое)…
    expect((client.match(/configMemory = /g) ?? []).length).toBeGreaterThanOrEqual(5);
    // …но дефолт при сбое без кэша в память не попадает
    expect(client).not.toMatch(/configMemory = SPIRE_CONFIG_DEFAULTS/);
  });

  it('сброс кэша конфига сбрасывает и память (флаг сменился на сервере)', () => {
    expect(client).toMatch(/invalidateSpireConfigCache[\s\S]*?configMemory = null/);
  });

  it('экран стартует с конфигом из памяти, а не с пустого spire-loading', () => {
    expect(home).toMatch(/useState<SpireConfigDoc \| null>\(\(\) => preview\?\.config \?\? peekSpireConfig\(\)\)/);
    expect(home).toMatch(/loadSpireConfig\(\)/); // фоновое освежение осталось
  });
});

describe('блоки над башней встают плавно', () => {
  const game = read('app/spire/use_spire_game.ts');

  it('плашка «нет сети» и карточка итога недели вставляются через layout-переход', () => {
    expect(game).toMatch(/import \{ animateNextLayoutTransition \} from '..\/smooth_layout'/);
    expect(game).toMatch(/if \(load\.status === 'offline'\) animateNextLayoutTransition\(\);\n\s*setRoomLoad\(load\)/);
    expect(game).toMatch(/if \(res\) animateNextLayoutTransition\(\);\n\s*setWeekResult\(res\)/);
  });

  it('крестик на карточке итога убирает её тоже плавно', () => {
    expect(game).toMatch(/if \(res\) animateNextLayoutTransition\(\);[^\n]*\n\s*setWeekResult\(null\)/);
  });
});
