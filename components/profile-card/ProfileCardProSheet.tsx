// ─── Визитка 2.0: шторка «Про визитка» (покупка со стилем) / «Стиль визитки» ─
// зачем (D114, макет VC-BUY / VC-BUY-POOR / VC-STYLE): стиль выбирается СРАЗУ при
// покупке — крупное превью + 6 плиток A–F, кнопка «Взять за 10 000». Владелец «Про»
// видит ту же шторку для бесплатной смены стиля. Монет не хватает — кнопка честно
// пишет, сколько ещё нужно, и выключена.
import React, { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import KitTouchable from '../KitTouchable';

import type { Lang } from '../../constants/i18n';
import {
  PROFILE_CARD_DEFAULT_PRO_STYLE,
  PROFILE_CARD_PRO_STYLE_IDS,
  profileCardLookName,
  type ProfileCardProStyle,
} from '../../app/profile_card_styles';
import { hapticTap } from '../../hooks/use-haptics';
import ProfileCardBackdrop from './ProfileCardBackdrop';
import ProfileCardCoin, { CoinImage } from './ProfileCardCoin';
import { buttonInk, ProBadge, ProfileCardButton } from './ProfileCardParts';
import { PROFILE_CARD_LOOKS } from './profile_card_looks';
import { formatCoins, PC, t4 } from './profile_card_copy';
import { useProfileSheetPaint } from './profile_card_sheet_paint';
import SheetSwipeClose from '../modal_fx/SheetSwipeClose';

export type ProSheetMode = 'buy' | 'change';

type Props = Readonly<{
  mode: ProSheetMode;
  lang: Lang;
  name: string;
  rank: number | null;
  currentStyle: ProfileCardProStyle | null;
  balance: number | null;
  price: number;
  busy: boolean;
  animate: boolean;
  bottomInset: number;
  onConfirm: (style: ProfileCardProStyle) => void;
  onClose: () => void;
}>;

const HERO_HEIGHT = 250;

function Swatch({ style, selected, onPress, lang, ring }: {
  style: ProfileCardProStyle; selected: boolean; onPress: () => void; lang: Lang; ring: string;
}) {
  const tokens = PROFILE_CARD_LOOKS[style];
  return (
    <KitTouchable
      testID={`profile-card-style-${style}`}
      accessibilityRole="button"
      accessibilityLabel={`${t4(lang, PC.styleA11y)} ${profileCardLookName(style, lang)}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={styles.swatchOuter}
    >
      <View style={[styles.swatchRing, selected ? [styles.swatchRingOn, { borderColor: ring }] : null]}>
        <View style={[styles.swatch, { backgroundColor: tokens.bg }]}>
          <ProfileCardBackdrop look={style} width={56} height={56} cy={0.5} animate={false} k={1} />
        </View>
      </View>
    </KitTouchable>
  );
}

function ProfileCardProSheetBase({
  mode, lang, name, rank, currentStyle, balance, price, busy, animate, bottomInset, onConfirm, onClose,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const p = useProfileSheetPaint();
  const [selected, setSelected] = useState<ProfileCardProStyle>(currentStyle ?? PROFILE_CARD_DEFAULT_PRO_STYLE);
  useEffect(() => {
    setSelected(currentStyle ?? PROFILE_CARD_DEFAULT_PRO_STYLE);
  }, [currentStyle, mode]);
  const tokens = PROFILE_CARD_LOOKS[selected];
  const heroWidth = windowWidth - 36;
  const buy = mode === 'buy';
  const missing = balance === null ? null : Math.max(0, price - balance);
  const poor = buy && missing !== null && missing > 0;
  const unknown = buy && balance === null;

  const ctaLabel = !buy
    ? t4(lang, PC.applyStyle)
    : poor
      ? `${t4(lang, PC.needMore)} ${formatCoins(missing ?? 0)} ${t4(lang, PC.coinsWord)}`
      : `${t4(lang, PC.buyFor)} ${formatCoins(price)}`;
  const ctaDisabled = busy || (buy && (poor || unknown));

  return (
    // зачем (координатор 14.10, «ручка ⇒ свайп»): свайп вниз = «Отмена», тот же onClose, что тап по ручке; пока идёт покупка (busy) свайп выключен — платёж не прерываем. Лист position:absolute — без следования за пальцем (PM-302)
    <SheetSwipeClose name="profile-card-pro" onClose={onClose} enabled={!busy} follow={false}>
    <View
      testID={buy ? 'profile-card-pro-sheet' : 'profile-card-style-sheet'}
      accessibilityViewIsModal
      style={[styles.sheet, { backgroundColor: p.sheet, shadowColor: p.shadow, paddingBottom: Math.max(26, bottomInset + 12) }]}
    >
      <Pressable accessibilityRole="button" accessibilityLabel={t4(lang, PC.cancel)} onPress={onClose} hitSlop={12} style={styles.handleHit}>
        <View style={[styles.handle, { backgroundColor: p.handle }]} />
      </Pressable>
      <Text accessibilityRole="header" style={[styles.title, { color: p.title }]}>{t4(lang, buy ? PC.sheetBuy : PC.sheetStyle)}</Text>
      <View testID="profile-card-style-preview" style={[styles.hero, { backgroundColor: tokens.bg }]}>
        <ProfileCardBackdrop look={selected} width={heroWidth} height={HERO_HEIGHT} cy={0.44} animate={animate} k={1} />
        {tokens.badge ? (
          <View style={styles.heroBadge}>
            <ProBadge fill={tokens.badge.fill} text={tokens.badge.text} radius={tokens.badge.radius} />
          </View>
        ) : null}
        <View pointerEvents="none" style={[styles.heroCoin, { left: heroWidth / 2 - 59, top: HERO_HEIGHT * 0.44 - 59 }]}>
          <ProfileCardCoin look={selected} rank={rank} size={118} animate={animate} />
        </View>
        <Text style={styles.heroName}>{name}</Text>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.heroEdge, { borderColor: tokens.edge, borderWidth: tokens.edgeWidth }]} />
      </View>
      <View style={styles.swatches}>
        {PROFILE_CARD_PRO_STYLE_IDS.map((style) => (
          <Swatch
            key={style}
            style={style}
            lang={lang}
            ring={p.selectedRing}
            selected={style === selected}
            onPress={() => {
              hapticTap();
              setSelected(style);
            }}
          />
        ))}
      </View>
      <View style={styles.caption}>
        <Text style={[styles.captionName, { color: p.hint }]}>{profileCardLookName(selected, lang)}</Text>
        {buy ? (
          <View style={styles.captionRight}>
            <Text style={[styles.captionMuted, { color: p.hint }]}>{t4(lang, PC.youHave)}</Text>
            <CoinImage rank={rank ?? 0} size={18} />
            <Text testID="profile-card-pro-balance" style={[styles.captionValue, { color: p.title }, poor ? { color: p.warn } : null]}>
              {balance === null ? '—' : formatCoins(balance)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.captionValue, { color: p.title }]}>{t4(lang, PC.freeCap)}</Text>
        )}
      </View>
      <ProfileCardButton
        testID={buy ? 'profile-card-pro-buy' : 'profile-card-style-apply'}
        tone={ctaDisabled ? 'off' : 'primary'}
        paint={p.button}
        label={ctaLabel}
        disabled={ctaDisabled}
        busy={busy}
        onPress={() => onConfirm(selected)}
        outerStyle={styles.ctaOuter}
      >
        <Text style={[styles.ctaText, { color: buttonInk(ctaDisabled ? 'off' : 'primary', null, false, p.button) }]}>
          {buy && !poor ? `${t4(lang, PC.buyFor)} ` : ctaLabel}
        </Text>
        {buy && !poor ? (
          <>
            <CoinImage rank={rank ?? 0} size={20} />
            <Text style={[styles.ctaText, { color: buttonInk(ctaDisabled ? 'off' : 'primary', null, false, p.button) }]}>{formatCoins(price)}</Text>
          </>
        ) : null}
      </ProfileCardButton>
    </View>
    </SheetSwipeClose>
  );
}

export default memo(ProfileCardProSheetBase);

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 12,
    paddingHorizontal: 18,
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -20 },
    elevation: 24,
  },
  handleHit: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 20 },
  handle: { width: 42, height: 5, borderRadius: 5 },
  title: { marginTop: 12, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  hero: { height: HERO_HEIGHT, marginTop: 14, borderRadius: 28, overflow: 'hidden' },
  heroBadge: { position: 'absolute', left: 14, top: 14, zIndex: 12 },
  heroCoin: { position: 'absolute', width: 118, height: 118 },
  heroName: { position: 'absolute', left: 0, right: 0, bottom: 14, textAlign: 'center', color: '#FFFFFF', fontSize: 16, fontWeight: '700' }, // theme-exempt: имя на превью стиля — белое поверх арта (иллюстрация)
  heroEdge: { borderRadius: 28 }, // guard-ok: кант превью = кант визитки (1–1,5pt, полупрозрачный)
  swatches: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'space-between' },
  swatchOuter: { flex: 1, maxWidth: 60, aspectRatio: 1 },
  swatchRing: { flex: 1, borderRadius: 18, padding: 2 },
  swatchRingOn: { borderWidth: 2, padding: 2 }, // shadow-ok: кольцо выбранного образца стиля — индикатор выбора, не контейнер; guard-ok: выбранный стиль (outline в макете)
  swatch: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  caption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 },
  captionName: { fontSize: 13, flexShrink: 1 },
  captionRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  captionMuted: { fontSize: 13 },
  captionValue: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ctaOuter: { marginTop: 14 },
  ctaText: { fontSize: 16, fontWeight: '800' },
});
