import fs from 'fs';
import path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

// зачем (Макеты df9ecf2c3): на «Пике» монеты рангов пустые до ~9 с после данных. Пока картинка не отрисована — круг тона скелета
// того же размера; журнал [PIK-IMG] пишет время до onLoad и откуда ассет (сперва логи — потом решение о предзагрузке).
describe('монета ранга на «Пике»: заглушка того же размера и журнал загрузки', () => {
  it('держит круг тона скелета до onLoad и снимает его после', () => {
    const coin = read('components/spire/SpireRankCoin.tsx');
    expect(coin).toContain("borderRadius: size / 2, backgroundColor: loaded ? 'transparent' : p.card");
    expect(coin).toContain('onCoinLoad={onCoinLoad} loadTrace="[PIK-IMG]"');
    expect(coin).toContain('coinRank={rank ?? SPIRE_BASE_COIN_RANK}');
  });

  it('AvatarView зовёт onCoinLoad и пишет журнал только по запросу', () => {
    const avatar = read('components/AvatarView.tsx');
    expect(avatar).toContain('onLoad={onCoinLoad || loadTrace ? () => {');
    expect(avatar).toContain("stage: 'coin:load'");
    expect(avatar).toContain("stage: 'coin:error'");
    // отсчёт от монтирования, а не от последней перерисовки
    expect(avatar).toContain('const traceStartedAt = mountedAtRef.current;');
  });
});
