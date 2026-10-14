// ═══════════════════════════════════════════════════════════
// dev_moments_preview — DEV-превью «моментов вовлечения» Пика на моках (только разработка).
//
// зачем (координатор 14.10): моменты m01/m02/m03 (components/spire/moments) пока никто не подключил (показ и флаг moments_v3 решает Ядро), а Сверке нужны кадры
// «эмулятор | эталон». Здесь они открываются на готовых моках без сети и без входа:
//   /dev_moments_preview?state=promo | stay | down
//   &tier=N   — лига 0…11 (promo: В какую поднимаемся, из tier−1; stay: в какой остаёмся; down: В какую спускаемся); по умолчанию promo 1 · stay 0 · down 0
//   &place=N  — место в комнате (promo 5 · stay 12); &gap=N — не хватило до топ-5 (stay, 240); &coins=N — монеты недели (stay, 1180); &rank=N — ранг монеты 0…19 (5)
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
import MomentDown from '../components/spire/moments/MomentDown';
import MomentPromotion, { type MomentRoomRow } from '../components/spire/moments/MomentPromotion';
import MomentStay from '../components/spire/moments/MomentStay';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';

const STATES = ['promo', 'stay', 'down'] as const;
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
  const params = useLocalSearchParams<{ state?: string; tier?: string; place?: string; gap?: string; coins?: string; rank?: string; selector?: string; replay?: string }>();
  const { lang } = useLang();
  const fromParam: PreviewState = isState(params.state) ? params.state : 'promo';
  const [state, setState] = useState<PreviewState>(fromParam);
  const [replay, setReplay] = useState(0);
  React.useEffect(() => { setState(fromParam); }, [fromParam]);
  const tierDefault = state === 'promo' ? 1 : 0;
  const tier = int(params.tier, tierDefault, state === 'promo' ? 1 : 0, 11);
  const rank = int(params.rank, 5, 0, 19);
  const place = int(params.place, state === 'promo' ? 5 : 12, 1, 30);
  const gap = int(params.gap, 240, 0, 99999);
  const coins = int(params.coins, 1180, 0, 999999);
  const key = useMemo(() => `${state}-${tier}-${rank}-${place}-${replay}-${params.replay ?? ''}`, [state, tier, rank, place, replay, params.replay]);
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
  bar: { position: 'absolute', left: 0, right: 0, bottom: 4, zIndex: 999, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)' }, // theme-exempt: dev-полоса превью, не боевой UI
  chipOn: { backgroundColor: 'rgba(255,255,255,0.28)' }, // theme-exempt: dev-полоса превью, не боевой UI
  chipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }, // theme-exempt: dev-полоса превью, не боевой UI
});
