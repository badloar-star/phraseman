// PaywallDuoStoreOff — первый экран пейвола «Два пути», когда магазин на устройстве недоступен: выход вместо тупика.
// зачем (владелец 11.11, макет docs/work/mockups/paywall-store-unavailable-2026-11-11/index.html, «Делать оба варианта»): раньше человек видел
// кнопки-тарифы с примерной ценой, нажатие кончалось «Попробуй через минуту», и он закрывал окно. Теперь на месте тарифов две кнопки:
// Android — «Оплатить через Telegram» (бот @PhrasemanPremiumBot называет способы оплаты и присылает код) и «У меня есть код»;
// iPhone — «Написать в поддержку» и «У меня есть код». На iPhone бота нет намеренно: Apple запрещает звать к стороннему способу оплаты (3.1.1).
// Размеры — как у кнопок-тарифов (PaywallDuoPlans): высота 74, радиус 22, поля 14×18, зазор 10; название 17/700, подпись 13.
// Цены здесь нет: её называет бот — так она не разойдётся с ботом.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../../constants/i18n';
import type { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import type { SubscriptionTier } from '../../../app/subscription_tier';
import { LinearGradient } from '../../SafeLinearGradient';
import V2Pressable from '../../v2/V2Pressable';
import { pick } from '../PaywallPlusCopy';
import { DUO_TIER_COLORS, DUO_TIER_INK } from './PaywallDuoHero';
import { STORE_OFF_COPY, type StoreOffRoute } from './paywall_store_off_copy';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

const ROW_MIN_HEIGHT = 74;

type RowProps = Readonly<{
  g: GlassTokens; tier: SubscriptionTier; primary: boolean; disabled: boolean; title: string; sub: string; testID: string; onPress: () => void;
}>;

const Row = memo(function Row({ g, tier, primary, disabled, title, sub, testID, onPress }: RowProps) {
  const colors = DUO_TIER_COLORS[tier];
  const ink = primary ? DUO_TIER_INK[tier] : g.text;
  return (
    <V2Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      // зачем: управляющая кнопка окна — отклик хаптиком, как у кнопок-тарифов
      withHaptic
      scaleTo={0.97}
      // зачем: вторая кнопка отделена тоном (opaqueControl), без обводки — правило владельца
      style={[S.row, { backgroundColor: primary ? colors[1] : g.opaqueControl }, primary ? { shadowColor: colors[1] } : null, primary ? S.rowOn : null, disabled ? S.disabled : null]}
    >
      {primary ? <LinearGradient pointerEvents="none" colors={[...colors]} locations={[0, 0.48, 1]} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={StyleSheet.absoluteFill} /> : null}
      <View style={S.side}>
        <Text style={[S.name, { color: ink }]}>{title}</Text>
        <Text style={[S.small, { color: ink }]}>{sub}</Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color={ink} />
    </V2Pressable>
  );
});

export const PaywallDuoStoreOff = memo(function PaywallDuoStoreOff({ lang, g, tier, route, codeVisible, busy, onPrimary, onCode }: {
  lang: Lang; g: GlassTokens; tier: SubscriptionTier;
  /** Выход по платформе: Telegram (Android) или поддержка. */
  route: StoreOffRoute;
  /** Кнопка кода видна только при включённых промокодах («Пульт» → «Промокоды в настройках»). */
  codeVisible: boolean;
  /** Идёт восстановление покупок: кнопки заняты. */
  busy: boolean;
  onPrimary: () => void;
  onCode: () => void;
}) {
  const telegram = route === 'telegram';
  return (
    <View testID="paywall-store-off">
      <View style={S.list}>
        <Row g={g} tier={tier} primary disabled={busy} testID={telegram ? 'paywall-store-off-telegram' : 'paywall-store-off-support'}
          title={pick(lang, telegram ? STORE_OFF_COPY.telegramTitle : STORE_OFF_COPY.supportTitle)}
          sub={pick(lang, telegram ? STORE_OFF_COPY.telegramSub : STORE_OFF_COPY.supportSub)} onPress={onPrimary} />
        {codeVisible ? (
          <Row g={g} tier={tier} primary={false} disabled={busy} testID="paywall-store-off-code"
            title={pick(lang, STORE_OFF_COPY.codeTitle)} sub={pick(lang, STORE_OFF_COPY.codeSub)} onPress={onCode} />
        ) : null}
      </View>
      <Text testID="paywall-store-off-fine" style={[S.fine, { color: g.mutedText }]}>{pick(lang, STORE_OFF_COPY.fine)}</Text>
    </View>
  );
});

const S = StyleSheet.create({
  list: { gap: 10 },
  row: { overflow: 'hidden', minHeight: ROW_MIN_HEIGHT, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  // макет: тень 0 14 34 −12 цветом уровня под яркой кнопкой — как у выбранного тарифа
  rowOn: { shadowOpacity: 0.65, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  disabled: { opacity: 0.4 },
  side: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: -0.17 },
  small: { fontSize: 13, lineHeight: 17, marginTop: 2, opacity: 0.86 }, // guard-ok: короткая подпись кнопки по одобренному макету (исключение PhraseMan 2.0), как у кнопок-тарифов
  // макет .fine: 13, по центру, отступ 12
  fine: { marginTop: 12, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
