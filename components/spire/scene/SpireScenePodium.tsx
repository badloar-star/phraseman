// ═══════════════════════════════════════════════════════════════════════════
// SpireScenePodium.tsx — пьедестал «Комнаты недели» в панели под «Сценой» Пика: блоки 2-1-3, монеты лидеров стоят на блоках.
//
// зачем (владелец 22.10: «комната недели — всё ещё как пьедестал»; выбран V2 «Пьедестал перед башней»; затем владелец 22.10 выбрал вариант 2
// scenes-compact.html — сцены 46 %): пьедестал переехал со сцены в панель «Комната недели» под ней — классический 2-1-3, монеты лидеров на
// блоках (наезжают на верх блока), на лицевой стороне место, имя и монеты недели (при подсчёте по ступеням — ступени). Цвета — темы (панель
// не на свету сцены): блоки — тон «контрола» темы, без рамок и теней внутри карточки. Подбор комнаты — пустые блоки и кружки той же
// высоты, без сети — приглушён. Ширина колонок — от панели, высоты — постоянные (spire_scene_layout).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import AvatarView from '../../AvatarView';
import SpireRankCoin from '../SpireRankCoin';
import { spireGroupThousands, spireStepsShort } from '../spire_plurals';
import type { SpireMemberRow, SpireRankByView } from '../spire_room_types';
import { useSpirePalette } from '../useSpirePalette';
import { SPIRE_SCENE_PODIUM } from './spire_scene_layout';

/** Колонки по порядку на пьедестале: 2-е, 1-е, 3-е место (индексы в тройке лидеров). */
const ORDER = [1, 0, 2] as const;
// зачем: высоты блоков, монеты и их заход на блок — в spire_scene_layout (одно место для сетки панели)
const BLOCK_H = SPIRE_SCENE_PODIUM.blockH;
const COIN = SPIRE_SCENE_PODIUM.coin;
const COIN_OVERLAP = SPIRE_SCENE_PODIUM.coinOverlap;
const BASE_COIN_RANK = 0;
/** Рост ника и монет на лице блока: 1,1 — третий блок вмещает место, ник и монеты при любом системном шрифте. */
export const FACE_MAX_SCALE = 1.1;

type Props = Readonly<{
  lang: Lang;
  /** Тройка лидеров по местам 1, 2, 3 (spireSceneRoom); меньше трёх — пустые блоки. */
  top: readonly SpireMemberRow[];
  rankBy: SpireRankByView;
  /** Комната подбирается: блоки и кружки без имён. */
  loading: boolean;
  /** Нет сети: чужие цифры приглушены. */
  dim: boolean;
}>;

function SpireScenePodium({ lang, top, rankBy, loading, dim }: Props) {
  const pal = useSpirePalette();
  // зачем (координатор 22.10, крайние случаи: шрифт 1,3): ник и монеты на блоке растут до 1,1 вместе с межстрочным — лицо третьего блока вмещает строки
  const ts = useScaledTextStyles(s, FACE_MAX_SCALE);
  return (
    <View testID={loading ? 'spire-scene-podium-skeleton' : 'spire-scene-podium'} style={[s.row, dim ? s.dim : null]}>
      {ORDER.map((placeIndex) => {
        const place = placeIndex + 1;
        const m = loading ? undefined : top[placeIndex];
        const coin = COIN[placeIndex];
        const overlap = Math.round(coin * COIN_OVERLAP);
        const score = m ? (rankBy === 'coins' ? spireGroupThousands(m.weekCoins ?? 0) : `${m.steps} ${spireStepsShort(lang, m.steps)}`) : '';
        return (
          <View
            key={place}
            style={s.col}
            accessible={m !== undefined}
            accessibilityLabel={m ? `${place}. ${m.name}, ${score}` : undefined}
            testID={`spire-scene-podium-${place}`}
          >
            <View style={[s.coin, { width: coin, height: coin, borderRadius: coin / 2, marginBottom: -overlap }]}>
              {m ? <SpireRankCoin rank={m.coinRank ?? null} size={coin} plus={m.isPremium === true} plusKind="flat" />
                : <View style={[s.coinEmpty, { width: coin, height: coin, borderRadius: coin / 2, backgroundColor: pal.control }]} />}
            </View>
            <View style={[s.block, { height: BLOCK_H[placeIndex], backgroundColor: pal.control }, m ? null : s.blockEmpty]}>
              {m ? (
                <View style={[s.face, { paddingTop: overlap + 4 }]}>
                  <Text style={[s.place, { color: pal.text }]} maxFontSizeMultiplier={1}>{place}</Text>
                  <Text style={[ts.name, { color: pal.text }]} numberOfLines={1} maxFontSizeMultiplier={FACE_MAX_SCALE}>{m.name}</Text>
                  <View style={s.scoreRow}>
                    <Text style={[ts.score, { color: pal.textSecondary }]} maxFontSizeMultiplier={FACE_MAX_SCALE}>{score}</Text>
                    {rankBy === 'coins' ? <AvatarView avatar="" coinRank={BASE_COIN_RANK} size={12} /> : null}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default memo(SpireScenePodium);

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingTop: 4 },
  dim: { opacity: 0.55 },
  col: { flex: 1, alignItems: 'center' },
  coin: { zIndex: 2, alignItems: 'center', justifyContent: 'center' },
  coinEmpty: { opacity: 0.7 },
  // зачем (вариант 2, .podium .b): блок — тон «контрола» темы внутри карточки, без рамки и тени; скругление сверху 14, снизу 6
  block: { alignSelf: 'stretch', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, overflow: 'hidden' },
  blockEmpty: { opacity: 0.6 },
  face: { alignItems: 'center', paddingHorizontal: 6 },
  place: { fontSize: 22, lineHeight: 24, fontWeight: '800', opacity: 0.9 },
  name: { fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 2, maxWidth: '100%' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  score: { fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'] }, // guard-ok: монеты лидера на блоке — данные пьедестала (эталон V2), не подпись-расшифровка
});
