// ManageSubscriptionDuoView — содержимое экрана «Подписка подключена» в стиле пейвола «Два пути».
// зачем (владелец 11.11, макет docs/work/mockups/plus-screens-duo-2026-11-11/index.html, раздел B, «в точности как на макете»):
// экран окрашен в цвет своего уровня (Ultra — коралловый шестиугольник ✦, Plus — фиолетовый круг ◆): знак со свечением, строка статуса,
// карточка-«пропуск» градиентом уровня с датой следующего списания, «Что включено» одним блоком, карточка перехода на год (только у месячного),
// тихая «Восстановить покупки» и текстовая «Перейти к отмене».
// Компонент только рисует: статус подписки, дата, покупка, восстановление и отмена остаются в app/manage_subscription.tsx и приходят сюда готовыми.
// Размеры — из макета (.sbtop, .live, .pass, .sec, .inc, .row, .up, .quiet, .leave, .fine).
import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Polygon, Stop } from 'react-native-svg';

import { SUBSCRIPTION_TIER_NAME, type SubscriptionTier } from '../../app/subscription_tier';
import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { DUO_TIER_COLORS, DUO_TIER_INK, PaywallDuoGlow, PaywallDuoHero, useDuoTierMix } from '../paywall/duo/PaywallDuoHero';
import { Sheen } from '../paywall/duo/PaywallDuoPlans';
import { COPY, LP, pick } from '../paywall/PaywallPlusCopy';
import { LinearGradient } from '../SafeLinearGradient';
import V2Pressable from '../v2/V2Pressable';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

export type ManageSubscriptionDuoBenefit = Readonly<{ id: string; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }>;
export type ManageSubscriptionDuoPeriod = 'year' | 'month' | 'lifetime' | null;

export type ManageSubscriptionDuoViewProps = Readonly<{
  lang: Lang;
  g: GlassTokens;
  tier: SubscriptionTier;
  period: ManageSubscriptionDuoPeriod;
  /** «Подписка Ultra» / «Подписка Plus» — заголовок экрана. */
  title: string;
  /** «Ultra активирован». */
  status: string;
  /** Дата следующего списания; пусто — даты нет (ещё грузится или магазин её не дал): строка держит высоту. */
  nextDate: string;
  nextDateLabel: string;
  /** Разовая покупка: вместо даты — «Навсегда» и эта строка. */
  lifetimeNote: string;
  /** Идёт первая загрузка без кэша: на месте списка — переданный скелет. */
  loading: boolean;
  loadingSlot?: React.ReactNode;
  benefits: readonly ManageSubscriptionDuoBenefit[];
  /** Карточка перехода на год; null — не показывать (не месячный план или годового пакета нет). */
  upgrade: Readonly<{ title: string; sub: string; busy: boolean; onPress: () => void }> | null;
  restore: Readonly<{ label: string; busy: boolean; onPress: () => void }>;
  /** Переход к отмене в магазине; null — у разовой покупки отмены нет. */
  cancel: Readonly<{ label: string; onPress: () => void }> | null;
  storeNote: string;
  /** Название на карточке вместо «уровень · период» (разовая покупка называется «Phraseman Pro»). */
  passNameOverride?: string;
}>;

const INCLUDED_TITLE = LP('Что включено', 'Що включено', 'What’s included', 'Qué incluye', 'O que inclui', 'Bao gồm', 'Yang termasuk', 'Neler dahil', 'Co zawiera');
const FOREVER = LP('Навсегда', 'Назавжди', 'Forever', 'Para siempre', 'Para sempre', 'Vĩnh viễn', 'Selamanya', 'Süresiz', 'Na zawsze');
const BRAND = 'PhraseMan';
// theme-exempt: карточка перехода на год всегда в цвете Ultra — макет (.up: rgba(255,95,143,.26) → прозрачный, подпись #ffb3c8)
const UP_GLOW = ['#FF5F8F42', '#FF5F8F00'] as const;
const UP_SOFT = '#FFB3C8';
const HEX = '20,0 37.2,10 37.2,30 20,40 2.8,30 2.8,10';

const UltraHex = memo(function UltraHex() {
  const [from, mid, to] = DUO_TIER_COLORS.ultra;
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40">
      <Defs>
        <SvgLinearGradient id="manage-up-hex" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} /><Stop offset="0.5" stopColor={mid} /><Stop offset="1" stopColor={to} />
        </SvgLinearGradient>
      </Defs>
      <Polygon points={HEX} fill="url(#manage-up-hex)" />
      <Polygon points="20,10.5 22.4,17.6 29.5,20 22.4,22.4 20,29.5 17.6,22.4 10.5,20 17.6,17.6" fill={DUO_TIER_INK.ultra} />
    </Svg>
  );
});

/** Свечение цвета уровня под шапкой экрана: кладётся на корень экрана, чтобы шло от самого верха (макет), а не от начала прокрутки. */
export const ManageSubscriptionDuoGlow = memo(function ManageSubscriptionDuoGlow({ tier, isLight }: { tier: SubscriptionTier; isLight: boolean }) {
  const mix = useDuoTierMix(tier);
  return <PaywallDuoGlow mix={mix} isLight={isLight} height={420} />;
});

// зачем: вибрацию дают сами обработчики экрана (смена плана, восстановление, отмена) — у кнопок она выключена, иначе была бы двойной
export const ManageSubscriptionDuoView = memo(function ManageSubscriptionDuoView({
  lang, g, tier, period, title, status, nextDate, nextDateLabel, lifetimeNote, loading, loadingSlot, benefits, upgrade, restore, cancel, storeNote, passNameOverride,
}: ManageSubscriptionDuoViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const mix = useDuoTierMix(tier);
  const colors = DUO_TIER_COLORS[tier];
  const ink = DUO_TIER_INK[tier];
  // зачем: в светлой теме яркий цвет уровня на светлом фоне не читается — акцентные подписи и значки цветом текста темы (как в пейволе)
  const accent = g.isLight ? g.text : colors[0];
  const tierName = SUBSCRIPTION_TIER_NAME[tier];
  const isLifetime = period === 'lifetime';
  const periodWord = period === 'year' ? pick(lang, COPY.year).toLowerCase() : period === 'month' ? pick(lang, COPY.month).toLowerCase() : isLifetime ? pick(lang, FOREVER) : '';
  const passName = passNameOverride || `${tier === 'ultra' ? '✦' : '◆'} ${tierName}${periodWord ? ` · ${periodWord}` : ''}`;
  const passValue = isLifetime ? pick(lang, FOREVER) : nextDate;
  const passLabel = isLifetime ? lifetimeNote : nextDateLabel;
  return (
    <View testID="manage-subscription-duo">
      <View style={S.top}>
        <View style={S.mark}><PaywallDuoHero mix={mix} /></View>
        <View style={S.live}>
          <View style={[S.liveHalo, { backgroundColor: `${colors[1]}42` }]}><View style={[S.liveDot, { backgroundColor: accent }]} /></View>
          <Text style={[S.liveText, { color: accent }]}>{status}</Text>
        </View>
        <Text accessibilityRole="header" testID="manage-subscription-title" style={[S.title, { color: g.text }]}>{title}</Text>

        <View
          testID="manage-subscription-status-card" accessible accessibilityLabel={`${passName}. ${passValue ? `${passLabel}: ${passValue}` : ''}`}
          style={[S.pass, { backgroundColor: colors[1], shadowColor: colors[1] }]}
        >
          <LinearGradient pointerEvents="none" colors={[...colors]} locations={[0, 0.48, 1]} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={StyleSheet.absoluteFill} />
          <Sheen width={windowWidth} />
          <View style={S.passHead}>
            <Text style={[S.passName, { color: ink }]}>{passName}</Text>
            <Text style={[S.passBrand, { color: ink }]}>{BRAND}</Text>
          </View>
          {/* зачем: дата приходит из магазина позже кэша — строка держит высоту, карточка не прыгает */}
          <Text testID="manage-subscription-next-date" style={[S.passValue, { color: ink }]}>{passValue || ' '}</Text>
          <Text style={[S.passLabel, { color: ink }]}>{passValue ? passLabel : ' '}</Text>
        </View>

        <Text accessibilityRole="header" style={[S.section, { color: g.text }]}>{pick(lang, INCLUDED_TITLE)}</Text>
        {loading ? (loadingSlot ?? null) : (
          <View style={[S.included, { backgroundColor: g.opaqueCard }]}>
            {benefits.map((benefit, index) => (
              <View key={benefit.id} testID={`manage-subscription-benefit-${benefit.id}`} accessibilityRole="text" style={[S.row, index > 0 ? [S.rowLine, { borderTopColor: g.line }] : null]}>
                <Ionicons name={benefit.icon} size={22} color={accent} />
                <Text style={[S.rowText, { color: g.text }]}>{benefit.label}</Text>
                <Ionicons name="checkmark" size={18} color={accent} />
              </View>
            ))}
          </View>
        )}
      </View>

      {loading ? null : (
        <View style={S.end}>
          {upgrade ? (
            <V2Pressable
              testID="manage-subscription-change-plan" accessibilityRole="button" accessibilityLabel={`${upgrade.title}. ${upgrade.sub}`}
              accessibilityState={{ disabled: upgrade.busy, busy: upgrade.busy }} disabled={upgrade.busy} onPress={upgrade.onPress}
              withHaptic={false} scaleTo={0.97} style={[S.up, { backgroundColor: g.opaqueControl }]}
            >
              <LinearGradient pointerEvents="none" colors={[...UP_GLOW]} locations={[0, 0.62]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <UltraHex />
              <View style={S.upCopy}>
                <Text style={[S.upTitle, { color: g.text }]}>{upgrade.title}</Text>
                <Text style={[S.upSub, { color: g.isLight ? g.text : UP_SOFT }]}>{upgrade.sub}</Text>
              </View>
              {upgrade.busy ? <ActivityIndicator color={g.isLight ? g.text : UP_SOFT} /> : <Ionicons name="arrow-forward" size={20} color={g.isLight ? g.text : UP_SOFT} />}
            </V2Pressable>
          ) : null}

          {/* зачем: строка не меняет геометрию в busy — крутится только значок справа, текст на месте */}
          <V2Pressable
            testID="manage-subscription-restore" accessibilityRole="button" accessibilityLabel={restore.label}
            accessibilityState={{ disabled: restore.busy, busy: restore.busy }} disabled={restore.busy} onPress={restore.onPress}
            withHaptic={false} scaleTo={0.97} style={[S.quiet, { backgroundColor: g.opaqueControl }]}
          >
            <Text style={[S.quietText, { color: g.text }]}>{restore.label}</Text>
            {restore.busy ? <ActivityIndicator color={g.mutedText} /> : <Ionicons name="chevron-forward" size={18} color={g.mutedText} />}
          </V2Pressable>

          {cancel ? (
            <V2Pressable testID="manage-subscription-cancel" accessibilityRole="button" accessibilityLabel={cancel.label} onPress={cancel.onPress} withHaptic={false} scaleTo={0.97} style={S.leave}>
              <Text style={[S.leaveText, { color: g.mutedText }]}>{cancel.label}</Text>
            </V2Pressable>
          ) : null}
          <Text style={[S.fine, { color: g.mutedText }]}>{storeNote}</Text>
        </View>
      )}
    </View>
  );
});

const S = StyleSheet.create({
  top: { paddingHorizontal: 22 },
  // знак несёт свой нижний отступ 26 (пейвол); в макете этого экрана — 22
  mark: { marginBottom: -4 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  liveHalo: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.26 },
  title: { fontSize: 33, lineHeight: 37, fontWeight: '900', letterSpacing: -1 },
  pass: { overflow: 'hidden', marginTop: 24, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 20, borderRadius: 26, shadowOpacity: 0.65, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  passHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  passName: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  passBrand: { fontSize: 14, lineHeight: 20, fontWeight: '600', opacity: 0.8 },
  passValue: { marginTop: 26, fontSize: 27, lineHeight: 31, fontWeight: '900', letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
  passLabel: { marginTop: 3, fontSize: 13, lineHeight: 18, opacity: 0.82 }, // guard-ok: «Следующее списание» под датой — по утверждённому макету 11.11 (.pass .l)
  section: { marginTop: 30, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  included: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 18, borderRadius: 24 },
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 8 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 21 },
  end: { paddingHorizontal: 22, paddingBottom: 34 },
  up: { overflow: 'hidden', marginTop: 14, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 14 },
  upCopy: { flex: 1, minWidth: 0 },
  upTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  upSub: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  quiet: { marginTop: 10, minHeight: 54, paddingHorizontal: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  quietText: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  leave: { marginTop: 4, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  leaveText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  fine: { marginTop: 10, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
