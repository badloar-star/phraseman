// ═══════════════════════════════════════════════════════════════════════════
// SpireScenePodium.tsx — пьедестал «Комнаты недели» на «Сцене» Пика: блоки 2-1-3 во всю ширину перед башней.
//
// зачем (владелец 22.10: «комната недели внизу — всё ещё как пьедестал»; выбран V2 «Пьедестал перед башней», эталон peak-scene-v2.html
// под замком): классический пьедестал 2-1-3, монеты лидеров стоят на блоках (наезжают на верх блока), на лицевой стороне — место, имя
// и монеты недели (при подсчёте по ступеням — ступени). Подбор комнаты — пустые блоки и кружки (скелет той же высоты), без сети —
// приглушён. Блоки — белое стекло сцены без рамок, тень вниз (стиль «Тень»). Ширина колонок — от экрана, высоты — постоянные.
// ═══════════════════════════════════════════════════════════════════════════
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import AvatarView from '../../AvatarView';
import SpireRankCoin from '../SpireRankCoin';
import { spireGroupThousands, spireStepsShort } from '../spire_plurals';
import type { SpireMemberRow, SpireRankByView } from '../spire_room_types';
import { SPIRE_SCENE_BLOCK, SPIRE_SCENE_INK } from './spire_scene_palette';

/** Колонки по порядку на пьедестале: 2-е, 1-е, 3-е место (индексы в тройке лидеров). */
const ORDER = [1, 0, 2] as const;
/** Высоты блоков и размер монет по местам 1, 2, 3 (эталон: 124 / 100 / 80; третий выше на 6, чтобы лицо блока вмещало строки 13/17). */
const BLOCK_H = [124, 100, 86] as const;
const COIN = [48, 38, 38] as const;
/** Доля монеты, наезжающая на верх блока (эталон: 22 из 48 и 18 из 38). */
const COIN_OVERLAP = 0.47;
const BASE_COIN_RANK = 0;

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
                : <View style={[s.coinEmpty, { width: coin, height: coin, borderRadius: coin / 2 }]} />}
            </View>
            <View style={[s.block, { height: BLOCK_H[placeIndex] }]}>
              {m ? (
                <LinearGradient colors={placeIndex === 0 ? SPIRE_SCENE_BLOCK.first : SPIRE_SCENE_BLOCK.regular} locations={SPIRE_SCENE_BLOCK.locations} style={StyleSheet.absoluteFill} />
              ) : <View style={[StyleSheet.absoluteFill, s.blockEmpty]} />}
              <View style={s.highlight} />
              {m ? (
                <View style={[s.face, { paddingTop: overlap + 4 }]}>
                  <Text style={s.place}>{place}</Text>
                  <Text style={s.name} numberOfLines={1}>{m.name}</Text>
                  <View style={s.scoreRow}>
                    <Text style={s.score}>{score}</Text>
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
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingHorizontal: 22 },
  dim: { opacity: 0.55 },
  col: { flex: 1, alignItems: 'center' },
  coin: { zIndex: 2, alignItems: 'center', justifyContent: 'center' },
  coinEmpty: { backgroundColor: SPIRE_SCENE_INK.skeletonCoin },
  // зачем (эталон .pk2-blk, стиль «Тень»): стекло без рамки, скругление сверху 16, снизу 6, мягкая тень вниз
  block: {
    alignSelf: 'stretch', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, overflow: 'hidden',
    boxShadow: [{ offsetX: 0, offsetY: 24, blurRadius: 34, spreadDistance: -22, color: SPIRE_SCENE_INK.blockShadow }],
  },
  blockEmpty: { backgroundColor: SPIRE_SCENE_INK.skeleton },
  // блик по верхней кромке блока (эталон: inset 0 1.5px 0 белый 42 %)
  highlight: { position: 'absolute', left: 0, right: 0, top: 0, height: 1.5, backgroundColor: SPIRE_SCENE_INK.blockHighlight },
  face: { alignItems: 'center', paddingHorizontal: 6 },
  place: { color: SPIRE_SCENE_INK.text, fontSize: 22, lineHeight: 24, fontWeight: '800', opacity: 0.9 },
  name: { color: SPIRE_SCENE_INK.text, fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 2, maxWidth: '100%' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  score: { color: SPIRE_SCENE_INK.text, fontSize: 13, lineHeight: 17, opacity: 0.86, fontVariant: ['tabular-nums'] }, // guard-ok: монеты лидера на блоке — данные пьедестала (эталон V2), не подпись-расшифровка
});
