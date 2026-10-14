// ═══════════════════════════════════════════════════════════
// dev_moments_preview — DEV-превью «моментов вовлечения» Пика на моках (только разработка).
//
// зачем (координатор 14.10): моменты m01/m02/m03 (components/spire/moments) пока никто не подключил (показ и флаг moments_v3 решает Ядро), а Сверке нужны кадры
// «эмулятор | эталон». Здесь они открываются на готовых моках без сети и без входа:
//   /dev_moments_preview?state=promo | stay | down
//   &tier=N   — лига 0…11 (promo: В какую поднимаемся, из tier−1; stay: в какой остаёмся; down: В какую спускаемся); по умолчанию promo 1 · stay 0 · down 0
//   &place=N  — место в комнате (promo 5 · stay 12); &gap=N — не хватило до топ-5 (stay, 240); &coins=N — монеты недели (stay, 1180); &rank=N — ранг монеты 0…19 (5)
//   state=streak&d=N — рубеж серии (1,3,7,14,30,50,100,150,200,250,300,365,400,500,600,730,800,900,1000; по умолчанию 7); state=rings&p=1,3,10 — выполнено по трём кольцам «Сегодня» (по умолчанию 0,1,2)
//   state=back — «С возвращением» (m21): моки образца — 9 дней, 412 фраз, ранг &rank=N (5), энергия полная, 5 карточек; state=rankenough — «Хватает на ранг N» (m14A): &rank=N текущий 0…18 (5), &coins=N баланс (7004)
//   &selector=1 — снизу полоса переключения состояний и «Повторить» (по умолчанию скрыта, чтобы не попадать в кадр); &replay=N — перезапуск показа
// Экраны — ТЕ ЖЕ компоненты, что будут в бою; данные — моки без сети, ничего не пишется и не начисляется. Тема и язык — текущие настройки приложения (dev_state?theme=…).
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную; в стор-сборке файл исключён регуляркой router.ctx.js.
// Охраняет tests/moments_dev_preview_release_guard.test.mjs.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import CoinRankEnoughDialog from '../components/coin_rank_moments/CoinRankEnoughDialog';
import WelcomeBackMoment from '../components/moments/WelcomeBackMoment';
import MomentDown from '../components/spire/moments/MomentDown';
import MomentPromotion, { type MomentRoomRow } from '../components/spire/moments/MomentPromotion';
import MomentStay from '../components/spire/moments/MomentStay';
import StreakMilestoneMoment from '../components/streak/moments/StreakMilestoneMoment';
import TodayRings from '../components/streak/moments/TodayRings';
import { STREAK_MILESTONES, isStreakMilestone, type StreakMilestone } from '../components/streak/moments/streak_milestones';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';

const STATES = ['promo', 'stay', 'down', 'streak', 'rings', 'back', 'rankenough'] as const;
type PreviewState = (typeof STATES)[number];
const isState = (v: unknown): v is PreviewState => typeof v === 'string' && (STATES as readonly string[]).includes(v);
const noop = (): void => undefined;

/** Комната недели образца (engagement-moments-v3-all.html): «Ты» — 5-й, повышаются 5 из 30. */
const MOCK_ROWS: readonly MomentRoomRow[] = [
  { uid: 'p1', name: 'Марк', coinRank: 12, coins: 610, isMe: false },
  { uid: 'p2', name: 'Ира', coinRank: 7, coins: 580, isMe: false },
  { uid: 'p3', name: 'Соня', coinRank: 8, coins: 520, isMe: false },
  { uid: 'p4', name: 'Олег', coinRank: 4, coins: 500, isMe: false },
  { uid: 'me', name: 'Ты', coinRank: 5, coins: 470, isMe: true },
  { uid: 'p6', name: 'Лена', coinRank: 9, coins: 450, isMe: false },
];

const int = (raw: string | undefined, fallback: number, min: number, max: number): number => {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && raw !== undefined && raw !== '' ? Math.max(min, Math.min(max, n)) : fallback;
};

function Inner() {
  const params = useLocalSearchParams<{ state?: string; tier?: string; place?: string; gap?: string; coins?: string; rank?: string; selector?: string; replay?: string; d?: string; p?: string }>();
  const { lang } = useLang();
  const fromParam: PreviewState = isState(params.state) ? params.state : 'promo';
  const [state, setState] = useState<PreviewState>(fromParam);
  const [replay, setReplay] = useState(0);
  React.useEffect(() => { setState(fromParam); }, [fromParam]);
  // зачем (координатор 14.10): кадры рубежей серии и колец «Сегодня» для гейта паритета Макетов — те же компоненты, что будут в бою, моки без сети
  const dRaw = int(params.d, 7, 1, 1000);
  const milestone: StreakMilestone = isStreakMilestone(dRaw) ? dRaw : (STREAK_MILESTONES.find((m) => m >= dRaw) ?? 1000);
  const ringsRaw = (params.p ?? '0,1,2').split(',').map((x) => int(x, 0, 0, 99));
  const rings: readonly [number, number, number] = [ringsRaw[0] ?? 0, ringsRaw[1] ?? 0, ringsRaw[2] ?? 0];
  const tierDefault = state === 'promo' ? 1 : 0;
  const tier = int(params.tier, tierDefault, state === 'promo' ? 1 : 0, 11);
  const rank = int(params.rank, 5, 0, 19);
  const place = int(params.place, state === 'promo' ? 5 : 12, 1, 30);
  const gap = int(params.gap, 240, 0, 99999);
  const coins = int(params.coins, state === 'rankenough' ? 7004 : 1180, 0, 999999);
  const key = useMemo(() => `${state}-${tier}-${rank}-${place}-${milestone}-${replay}-${params.replay ?? ''}`, [state, tier, rank, place, milestone, replay, params.replay]);
  return (
    <ScreenGradient>
      <View style={s.fill}>
        {state === 'promo' ? (
          <MomentPromotion key={key} lang={lang} fromTier={Math.max(0, tier - 1)} toTier={tier} rows={MOCK_ROWS} myPlace={place} myCoinRank={rank} bonusCoins={100} onPlay={noop} />
        ) : null}
        {state === 'stay' ? (
          <MomentStay key={key} lang={lang} tier={tier} coinRank={rank} place={place} weekCoins={coins} gapToTop5={gap} onPlay={noop} />
        ) : null}
        {state === 'down' ? (
          <MomentDown key={key} lang={lang} newTier={tier} coinRank={rank} onPlay={noop} onRemind={noop} />
        ) : null}
        {state === 'streak' ? (
          <StreakMilestoneMoment key={key} lang={lang} milestone={milestone} coinRank={rank} onDone={noop} onShare={noop} />
        ) : null}
        {state === 'rings' ? (
          <View style={s.rings}><TodayRings key={key} lang={lang} progress={rings} coinRank={rank} /></View>
        ) : null}
        {state === 'back' ? (
          <WelcomeBackMoment key={key} lang={lang} coinRank={rank} decision={{ show: true, reason: 'away', stats: { awayDays: 9, phrasesLearned: 412, coinRank: rank, energyFull: true, aliveStreakDays: null }, primary: { kind: 'cards', count: 5, source: 'recent_saved' } }} onCards={noop} onHome={noop} />
        ) : null}
        {state === 'rankenough' ? (
          <CoinRankEnoughDialog key={key} lang={lang} coinRank={Math.min(rank, 18)} coins={coins} onUpgrade={noop} onLater={noop} />
        ) : null}
        {params.selector === '1' ? (
          <View style={s.bar} pointerEvents="box-none">
            {STATES.map((st) => (
              <Pressable key={st} onPress={() => setState(st)} style={[s.chip, st === state ? s.chipOn : null]} accessibilityRole="button" accessibilityLabel={st}>
                <Text style={s.chipText}>{st}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setReplay((n) => n + 1)} style={s.chip} accessibilityRole="button" accessibilityLabel="replay"><Text style={s.chipText}>↻</Text></Pressable>
          </View>
        ) : null}
      </View>
    </ScreenGradient>
  );
}

export default function DevMomentsPreviewRoute() {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;
  return <Inner />;
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  rings: { flex: 1, alignItems: 'center', paddingTop: 160 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 4, zIndex: 999, flexDirection: 'row', justifyContent: 'space-evenly', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)' }, // theme-exempt: dev-полоса превью, не боевой UI
  chipOn: { backgroundColor: 'rgba(255,255,255,0.28)' }, // theme-exempt: dev-полоса превью, не боевой UI
  chipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }, // theme-exempt: dev-полоса превью, не боевой UI
});
