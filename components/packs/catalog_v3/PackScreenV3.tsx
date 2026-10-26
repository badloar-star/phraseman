// ═══════════════════════════════════════════════════════════════════════════
// PackScreenV3.tsx — экран набора на «Сцене»: шапка набора, ОТДЕЛЬНЫЙ блок «Добавить себе + лайк», ниже — список карточек.
//
// зачем (слово владельца через координатора 26.10: «Добавить себе и лайк — отдельный блок, список карточек — отдельно, ниже»; «минимум кнопок, без мелких подписей»):
// три слоя без смешения: герой (обложка, название, автор) → блок действий (главная кнопка «Добавить себе» и круглый лайк с числом) → список карточек.
// Закреплённой кнопки нет: главное действие лежит в блоке, экран не загораживается. Текст карточек — данные набора (16 / 13), не подписи.
// Состояния — «добавлено» (кнопка становится спокойной «Добавлено» и не нажимается) и лайк (сердце заливается); оба — мгновенно в самом компоненте-хозяине (optimistic).
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
import PackSceneFrameV3 from './PackSceneFrameV3';
import { packScreensText } from './packs_catalog_v3_screens_copy';
import { packCoverPaint, type PacksCatalogColors } from './packs_catalog_v3_tokens';

const TEXT_MAX_SCALE = 1.3;
const COVER = 96;
const ACTION_H = 56;

export type PackScreenCard = Readonly<{ front: string; back: string }>;
export type PackScreenData = Readonly<{ id: string; title: string; authorName: string; likes: number }>;

type Props = Readonly<{
  lang: Lang;
  colors: PacksCatalogColors;
  pack: PackScreenData;
  cards: readonly PackScreenCard[];
  added: boolean;
  liked: boolean;
  topInset: number;
  bottomInset: number;
  onBack: () => void;
  onAdd: () => void;
  onLike: () => void;
}>;

const GLASS = colorWithAlpha(SPIRE_SCENE_INK.text, 0.12);
const GLASS_STRONG = colorWithAlpha(SPIRE_SCENE_INK.text, 0.2);
const EDGE = colorWithAlpha(SPIRE_SCENE_INK.text, 0.3);
const SHADOW = colorWithAlpha(SPIRE_SCENE_INK.blockShadow, 0.35);

function PackScreenV3({ lang, colors, pack, cards, added, liked, topInset, bottomInset, onBack, onAdd, onLike }: Props) {
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  const paint = useMemo(() => packCoverPaint(pack.id, colors), [pack.id, colors]);
  const likes = pack.likes + (liked ? 1 : 0);
  return (
    <PackSceneFrameV3 testID="packs-v3-pack" colors={colors} topInset={topInset} bottomInset={bottomInset} onBack={onBack} backLabel={packScreensText(lang, 'back')} cta={null}>
      <View style={s.hero}>
        <PackCoverV3 paint={paint} glyphSize={44} style={s.cover} />
        <View style={s.heroText}>
          <Text style={ts.title} numberOfLines={3} maxFontSizeMultiplier={TEXT_MAX_SCALE} accessibilityRole="header">{pack.title}</Text>
          <Text style={ts.author} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{pack.authorName}</Text>
        </View>
      </View>

      <View testID="packs-v3-pack-actions" style={s.actions}>
        <V2Pressable
          testID="packs-v3-pack-add"
          accessibilityRole="button"
          accessibilityLabel={packScreensText(lang, added ? 'added' : 'addToMine')}
          accessibilityState={{ disabled: added }}
          disabled={added}
          withHaptic={false}
          scaleTo={0.97}
          onPress={onAdd}
          outerStyle={s.addOuter}
          style={[s.add, added ? s.addDone : { backgroundColor: colors.cta }]}
        >
          <Ionicons name={added ? 'checkmark' : 'add'} size={22} color={added ? SPIRE_SCENE_INK.text : colors.ctaInk} />
          <Text style={[ts.addText, { color: added ? SPIRE_SCENE_INK.text : colors.ctaInk }]} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{packScreensText(lang, added ? 'added' : 'addToMine')}</Text>
        </V2Pressable>
        <V2Pressable testID="packs-v3-pack-like" accessibilityRole="button" accessibilityState={{ selected: liked }} accessibilityLabel={`${likes}`} withHaptic={false} scaleTo={0.94} onPress={onLike} style={[s.like, liked ? s.likeOn : null]}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={SPIRE_SCENE_INK.text} />
          <Text style={ts.likeNum} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{likes}</Text>
        </V2Pressable>
      </View>

      <View style={s.listHead}>
        <Text style={ts.listTitle} maxFontSizeMultiplier={TEXT_MAX_SCALE} accessibilityRole="header">{packScreensText(lang, 'cards')}</Text>
        <Text style={ts.count} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{cards.length}</Text>
      </View>
      <View style={s.list}>
        {cards.map((card, i) => (
          <View key={`${i}-${card.front}`} style={s.card} testID={`packs-v3-pack-card-${i}`}>
            <Text style={ts.front} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{card.front}</Text>
            <Text style={ts.back} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{card.back}</Text>
          </View>
        ))}
      </View>
    </PackSceneFrameV3>
  );
}

export default memo(PackScreenV3);

const s = StyleSheet.create({
  hero: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  cover: { width: COVER, height: COVER, borderRadius: 28 },
  heroText: { flex: 1 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: SPIRE_SCENE_INK.text, letterSpacing: -0.3 },
  author: { marginTop: 4, fontSize: 13, lineHeight: 18, color: SPIRE_SCENE_INK.muted }, // guard-ok: автор набора — данные экрана, не подпись-расшифровка
  actions: {
    marginTop: 20, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 32, backgroundColor: GLASS,
    boxShadow: [
      { offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: EDGE, inset: true },
      { offsetX: 0, offsetY: 12, blurRadius: 24, spreadDistance: -10, color: SHADOW },
    ],
  },
  addOuter: { flex: 1 },
  add: { minHeight: ACTION_H, borderRadius: ACTION_H / 2, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addDone: { backgroundColor: GLASS_STRONG },
  addText: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  like: { minWidth: ACTION_H + 20, height: ACTION_H, borderRadius: ACTION_H / 2, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GLASS_STRONG },
  likeOn: { backgroundColor: GLASS_STRONG },
  likeNum: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: SPIRE_SCENE_INK.text, fontVariant: ['tabular-nums'] },
  listHead: { marginTop: 28, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  count: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: SPIRE_SCENE_INK.text, fontVariant: ['tabular-nums'] },
  list: { marginTop: 8, gap: 8 },
  card: { minHeight: 64, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: GLASS },
  front: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  back: { marginTop: 2, fontSize: 13, lineHeight: 18, color: SPIRE_SCENE_INK.muted }, // guard-ok: перевод карточки — данные набора
});
