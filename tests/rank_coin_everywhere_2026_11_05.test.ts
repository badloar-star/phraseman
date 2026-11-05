// зачем (слово владельца 05.11, «монета абсолютно во всех местах обязана соответствовать рангу строго»):
// сторож — в потребителях валюты нет прямой базовой монеты coin_rank_00 / HOME_RUNE_ICON_SOURCE;
// везде монета ранга (MyRankCoin / useMyRankCoinSource). Сработал — чини потребителя, а не сторожа.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const CONSUMERS = [
  'components/home/HomeRuneBalance.tsx',
  'components/completion/V2DoneChain.tsx',
  'components/completion/V2DoneScreen.tsx',
  'components/feedback/ResultsSequence.tsx',
  'components/learning-v2/horizons/HorizonResultGlass.tsx',
  'components/legacy_bonus/LegacyBonusFlyLayer.tsx',
  'components/rewards/CoinRewardFlight.tsx',
  'components/PracticeRuneCounter.tsx',
  'components/onboarding/ApprovedWelcome.tsx',
  'components/RuneGlyph.tsx',
  'components/spire/SpireGoldReward.tsx',
  'components/FirstPurchaseSealCelebration.tsx',
  'app/flashcards/CardsSessionResultV2.tsx',
  'app/learning_v2_direct_session_player_v1.tsx',
];

describe('монета строго по рангу — везде', () => {
  it.each(CONSUMERS)('%s не берёт базовую монету напрямую', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/require\([^)]*coin_rank_00/);
    expect(src).not.toContain('HOME_RUNE_ICON_SOURCE');
    expect(src).toMatch(/MyRankCoin|useMyRankCoinSource/);
  });

  // зачем (аудит Диспетчера 05.11): аватары друзей/уведомлений рисуют монету ранга, а не старый аватар; настройки не мелькают бронзой
  it('аватары в «Вместе» и уведомлениях получают ранг; настройки берут последний известный', () => {
    const sheet = read('components/friends_together/FriendTogetherSheet.tsx');
    expect(sheet).toContain('coinRank={myCoinRank}');
    expect(sheet).toContain('coinRank={friendCoinRank}');
    expect(read('components/NotificationCenterButton.tsx')).toMatch(/<AvatarView[\s\S]{0,200}coinRank=/);
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toContain('useMyRankCoinRank');
    expect(settings).not.toContain('coinRankRowForDisplay(0)');
  });

  it('общий модуль homeRuneAsset не хранит базовую монету', () => {
    expect(read('components/home/homeRuneAsset.ts')).not.toMatch(/require\(/);
  });

  it('хук ранга: ранг не прочитан → пишет pending_base, прочитан → live, потом last_known', () => {
    const hook = read('hooks/use_my_rank_coin.ts');
    expect(hook).toContain("'pending_base'");
    expect(hook).toContain("'last_known'");
    expect(hook).toContain('[RANK-COIN]');
    expect(hook).toContain('useMyCoinRank');
    expect(hook).not.toMatch(/fetch\(|firestore|httpsCallable/i); // без сети
  });
});
