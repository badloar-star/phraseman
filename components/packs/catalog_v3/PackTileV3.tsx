// ═══════════════════════════════════════════════════════════════════════════
// PackTileV3.tsx — игровая плитка набора: обложка в тоне темы, название, автор, число карточек, лайк.
//
// зачем (слово владельца 26.10: «в плитке НЕ показывать карточки-превью — чипы Significant / Crucial… убрать; плитка игровая; минимум мелких текстов»):
// три строки — название (16), автор (13), нижняя строка из двух значков с числами (карточки слева, сердце справа). Никаких чипов, обводок и подписей:
// число карточек и лайки — значок + цифра, читаются голосом через accessibilityLabel. Поверхность — белое стекло сцены (SPIRE_SCENE_INK.glass),
// кромка — внутренний блик и тень, а не рамка. Нажатие — V2Pressable (kit `.t`). Лайк на плитке — счётчик; переключается на экране набора.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { SPIRE_SCENE_INK } from '../../spire/scene/spire_scene_palette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import V2Pressable from '../../v2/V2Pressable';
import PackCoverV3 from './PackCoverV3';
import { packsCatalogV3Text } from './packs_catalog_v3_copy';
import { packCoverPaint, type PacksCatalogColors } from './packs_catalog_v3_tokens';

/** Рост подписей с системным шрифтом — как у текста сцены Пика. */
const TEXT_MAX_SCALE = 1.3;
export const PACK_TILE_COVER_H = 96;

export type PackTileData = Readonly<{
  id: string;
  title: string;
  authorName: string;
  cardCount: number;
  likes: number;
}>;

type Props = Readonly<{
  pack: PackTileData;
  lang: Lang;
  colors: PacksCatalogColors;
  width: number;
  onOpen: (id: string) => void;
}>;

const PANEL = colorWithAlpha(SPIRE_SCENE_INK.text, 0.12);
const PANEL_EDGE = colorWithAlpha(SPIRE_SCENE_INK.text, 0.3);
const PANEL_SHADOW = colorWithAlpha(SPIRE_SCENE_INK.blockShadow, 0.35);

function PackTileV3({ pack, lang, colors, width, onOpen }: Props) {
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  const paint = useMemo(() => packCoverPaint(pack.id, colors), [pack.id, colors]);
  const label = `${pack.title}. ${pack.authorName}. ${pack.cardCount} ${packsCatalogV3Text(lang, 'cardsA11y')}, ${pack.likes} ${packsCatalogV3Text(lang, 'likesA11y')}`;
  return (
    <V2Pressable
      testID={`packs-v3-tile-${pack.id}`}
      accessibilityLabel={label}
      accessibilityHint={packsCatalogV3Text(lang, 'openPack')}
      onPress={() => onOpen(pack.id)}
      scaleTo={0.97}
      outerStyle={{ width }}
      style={s.tile}
    >
      <PackCoverV3 paint={paint} glyphSize={44} style={s.cover} />
      <View style={s.body}>
        <Text style={ts.title} numberOfLines={2} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{pack.title}</Text>
        <Text style={ts.author} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{pack.authorName}</Text>
        <View style={s.stats}>
          <View style={s.stat}>
            <Ionicons name="albums-outline" size={16} color={SPIRE_SCENE_INK.label} />
            <Text style={ts.num} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{pack.cardCount}</Text>
          </View>
          <View style={s.stat}>
            <Ionicons name="heart" size={16} color={SPIRE_SCENE_INK.text} />
            <Text style={ts.num} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{pack.likes}</Text>
          </View>
        </View>
      </View>
    </V2Pressable>
  );
}

export default memo(PackTileV3);

const s = StyleSheet.create({
  tile: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: PANEL,
    boxShadow: [
      { offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: PANEL_EDGE, inset: true },
      { offsetX: 0, offsetY: 10, blurRadius: 22, spreadDistance: -8, color: PANEL_SHADOW },
    ],
  },
  cover: { height: PACK_TILE_COVER_H },
  body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text, minHeight: 44 },
  author: { marginTop: 2, fontSize: 13, lineHeight: 18, color: SPIRE_SCENE_INK.muted }, // guard-ok: автор набора — данные плитки по слову владельца («название, автор, число карточек, лайк»), а не подпись-расшифровка
  stats: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  num: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: SPIRE_SCENE_INK.text, fontVariant: ['tabular-nums'] },
});
