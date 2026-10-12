// зачем (координатор 12.10, Сверка cards-v2-016; «сперва логи»): после «Добавить себе» в чужом наборе экран должен остаться открытым и перейти из
// просмотра в «добавлен». Сверка видела уход в каталог без видимой причины в коде — журнал [CARDS-PACK-ADD] показывает режим просмотра, источник
// владения и размонтирование экрана набора, чтобы при пересъёмке причина читалась из лога, а не гадалась.
import fs from 'node:fs';
import path from 'node:path';

const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_collection.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('экран набора: журнал добавления [CARDS-PACK-ADD]', () => {
  it('пишет смену режима (просмотр → добавлен) со всеми источниками владения', () => {
    expect(screen).toContain("console.log('[CARDS-PACK-ADD]'");
    for (const field of ['previewRequested', 'packOwnedByMe', 'previewMode', 'owned:', 'communityOwned:', 'hasMarketPack', 'cards:']) {
      expect(screen).toContain(field);
    }
  });
  it('пишет размонтирование экрана набора', () => {
    expect(screen).toContain("stage: 'unmount'");
  });
});
