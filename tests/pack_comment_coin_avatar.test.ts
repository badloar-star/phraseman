// зачем (cards-052, образец cards-states `.cmt .av`): аватар отклика под набором — монета ранга автора, а при неизвестном ранге — прежний AvatarView (ранг не выдумываем).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/community_packs/PackCommentsSheet.tsx'), 'utf8');

describe('отклики: аватар = монета ранга автора', () => {
  it('ранг берётся из профиля автора, для своего — из локального состояния', () => {
    expect(src).toContain('useMyCoinRankBinding()');
    expect(src).toContain('const authorCoinRank = mine ? myCoinRank : profiles[item.authorId]?.coinRank;');
    expect(src).toContain('isValidCoinRank(authorCoinRank)');
    expect(src).toContain('COIN_RANK_TABLE.find');
  });
  it('без ранга остаётся прежний AvatarView, ранг не выдумывается', () => {
    expect(src).toContain('<CoinImage source={rankCoin.source}');
    expect(src).toContain('<AvatarView');
    expect(src).toMatch(/\{rankCoin \? \([\s\S]{0,200}CoinImage[\s\S]{0,400}\) : \(\s*<AvatarView/);
  });
  it('список перерисовывается при смене своего ранга', () => {
    expect(src).toContain('profiles, myAvatarProfile, myCoinRank]');
  });
});
