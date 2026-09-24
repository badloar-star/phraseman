import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('streak revive shop and stats contract', () => {
  // PM-057 (PhraseMan 2.0, D28): магазина жемчуга больше нет. Прежние два
  // контракта («ведём в магазин с returnTo» и «возвращаемся из магазина»)
  // сторожили отменённое правило. Теперь нехватка — честное сообщение без перехода.
  it('tells users who lack pearls about the shortage instead of sending them to a shop', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'StreakReviveModal.tsx'), 'utf8');

    expect(source).toContain("notifyPearlShortageWithoutStore('streak_revive', need)");
    expect(source).not.toContain("pathname: '/shards_shop'");
  });

  it('keeps a one-day revive action on the streak statistics screen', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');

    expect(source).toContain('getReviveOffer');
    expect(source).toContain('<StreakReviveModal');
    expect(source).toContain("shopReturnTo=\"streak_stats\"");
    expect(source).toContain('reviveOffer={reviveOffer}');
    expect(source).toContain('onRevivePress={handleReviveStreak}');
  });
});
