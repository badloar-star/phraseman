// PaywallDuoMore — нижняя часть пейвола «Два пути»: всё, что человек видит, если листает вниз.
// зачем (владелец 11.11, макет docs/work/mockups/paywall-sell-2026-11-11/variant-a.html, «в точности 1 к 1»): на первом экране
// минимум текста, а подробности — здесь: короткая таблица «Бесплатно / уровень» (6 сильных строк, остальные по кнопке),
// шкала пробного периода (только когда пробный реально пришёл из магазина), три частых вопроса и кнопка покупки,
// которая появляется внизу, когда тарифы первого экрана ушли из вида.
// Строки таблицы — из того же источника, что вкладка Plus (plus_tab_items): ничего не выдумываем.
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { triLang, type Lang } from '../../../constants/i18n';
import type { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { animateNextLayoutTransition } from '../../../app/smooth_layout';
import { SUBSCRIPTION_TIER_NAME, type SubscriptionTier } from '../../../app/subscription_tier';
import { useReduceMotion } from '../../../hooks/use_reduce_motion';
import { PLUS_TAB_FREE_LABEL, type PlusTabCopy, type PlusTabItem } from '../../plus-tab/plus_tab_items';
import { LinearGradient } from '../../SafeLinearGradient';
import V2Pressable from '../../v2/V2Pressable';
import { chargeLine, compareMore, COPY, LP, pick, reminderDayTitle } from '../PaywallPlusCopy';
import { DUO_TIER_COLORS, DUO_TIER_INK } from './PaywallDuoHero';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

/** Шесть строк, которые видны сразу (порядок макета); остальные — по кнопке «Все N возможностей». */
export const DUO_TOP_ROW_KEYS = ['lessons', 'energy', 'speak', 'ai_explain', 'languages', 'streak_shield'] as const;
/** Напоминание о конце пробного уходит за 2 дня до списания (как в COPY.heroTrialSub и экране после покупки). */
const REMINDER_DAYS_BEFORE_CHARGE = 2;

const H_CHANGES = LP('Что меняется с подпиской', 'Що змінюється з підпискою', 'What changes with a subscription', 'Qué cambia con la suscripción', 'O que muda com a assinatura', 'Điều gì thay đổi khi đăng ký', 'Yang berubah dengan langganan', 'Abonelikle neler değişir', 'Co się zmienia z subskrypcją');
const H_TRIAL = LP('Как работает пробный период', 'Як працює пробний період', 'How the free trial works', 'Cómo funciona la prueba gratis', 'Como funciona o teste grátis', 'Dùng thử hoạt động thế nào', 'Cara kerja uji coba gratis', 'Ücretsiz deneme nasıl işler', 'Jak działa okres próbny');
const H_FAQ = LP('Частые вопросы', 'Часті запитання', 'Common questions', 'Preguntas frecuentes', 'Perguntas frequentes', 'Câu hỏi thường gặp', 'Pertanyaan umum', 'Sık sorulanlar', 'Częste pytania');
const FAQ = [
  {
    key: 'cancel',
    q: LP('Как отменить?', 'Як скасувати?', 'How do I cancel?', '¿Cómo cancelo?', 'Como cancelo?', 'Hủy bằng cách nào?', 'Bagaimana cara membatalkan?', 'Nasıl iptal ederim?', 'Jak anulować?'),
    a: LP(
      'В настройках App Store или Google Play, в два тапа. Доступ останется до конца оплаченного срока.',
      'У налаштуваннях App Store або Google Play, у два дотики. Доступ залишиться до кінця оплаченого терміну.',
      'In your App Store or Google Play settings, in two taps. Access stays until the end of the paid period.',
      'En los ajustes de App Store o Google Play, en dos toques. El acceso sigue hasta el final del periodo pagado.',
      'Nos ajustes da App Store ou do Google Play, em dois toques. O acesso continua até o fim do período pago.',
      'Trong cài đặt App Store hoặc Google Play, chỉ hai chạm. Quyền truy cập giữ đến hết kỳ đã trả.',
      'Di pengaturan App Store atau Google Play, dua ketukan. Akses tetap ada sampai akhir periode yang dibayar.',
      'App Store veya Google Play ayarlarından, iki dokunuşla. Erişim ödenen sürenin sonuna kadar sürer.',
      'W ustawieniach App Store lub Google Play, dwoma dotknięciami. Dostęp zostaje do końca opłaconego okresu.',
    ),
  },
  {
    key: 'progress',
    q: LP('Что будет с моим прогрессом?', 'Що буде з моїм прогресом?', 'What happens to my progress?', '¿Qué pasa con mi progreso?', 'O que acontece com meu progresso?', 'Tiến độ của tôi sẽ ra sao?', 'Bagaimana dengan progres saya?', 'İlerlemem ne olur?', 'Co z moimi postępami?'),
    a: LP(
      'Уроки, серия и карточки сохраняются всегда — с подпиской и без неё.',
      'Уроки, серія та картки зберігаються завжди — з підпискою і без неї.',
      'Lessons, streak and cards are always kept — with or without a subscription.',
      'Las lecciones, la racha y las tarjetas se guardan siempre, con o sin suscripción.',
      'Lições, sequência e cartões ficam sempre salvos — com ou sem assinatura.',
      'Bài học, chuỗi và thẻ luôn được giữ — dù có đăng ký hay không.',
      'Pelajaran, rentetan, dan kartu selalu tersimpan — dengan atau tanpa langganan.',
      'Dersler, seri ve kartlar her zaman saklanır — abonelikle de aboneliksiz de.',
      'Lekcje, seria i karty zostają zawsze — z subskrypcją i bez niej.',
    ),
  },
  {
    key: 'switch',
    q: LP('Можно перейти с месяца на год?', 'Можна перейти з місяця на рік?', 'Can I switch from monthly to yearly?', '¿Puedo pasar de mensual a anual?', 'Posso mudar do mensal para o anual?', 'Có thể đổi từ tháng sang năm không?', 'Bisa pindah dari bulanan ke tahunan?', 'Aylıktan yıllığa geçebilir miyim?', 'Czy mogę przejść z miesiąca na rok?'),
    a: LP(
      'Да, в любой момент в настройках магазина.', 'Так, будь-коли в налаштуваннях магазину.', 'Yes, anytime in your store settings.',
      'Sí, en cualquier momento en los ajustes de la tienda.', 'Sim, a qualquer momento nos ajustes da loja.', 'Có, bất cứ lúc nào trong cài đặt cửa hàng.',
      'Ya, kapan saja di pengaturan toko.', 'Evet, istediğin zaman mağaza ayarlarından.', 'Tak, w każdej chwili w ustawieniach sklepu.',
    ),
  },
] as const;

const word = (lang: Lang, copy: PlusTabCopy): string => triLang(lang, copy) ?? copy.ru;

const Faq = memo(function Faq({ lang, g, item }: { lang: Lang; g: GlassTokens; item: (typeof FAQ)[number] }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => { animateNextLayoutTransition(); setOpen((was) => !was); }, []);
  return (
    <View style={[S.faq, { borderTopColor: g.line }]}>
      <V2Pressable testID={`paywall-duo-faq-${item.key}`} accessibilityRole="button" accessibilityState={{ expanded: open }} withHaptic={false} scaleTo={0.99} onPress={toggle} style={S.faqHead}>
        <Text style={[S.faqQ, { color: g.text }]}>{pick(lang, item.q)}</Text>
        <Text style={[S.faqSign, { color: g.mutedText }]}>{open ? '×' : '+'}</Text>
      </V2Pressable>
      {open ? <Text style={[S.faqA, { color: g.mutedText }]}>{pick(lang, item.a)}</Text> : null}
    </View>
  );
});

export const PaywallDuoMore = memo(function PaywallDuoMore({ lang, g, tier, items, trialDays, chargePrice }: {
  lang: Lang; g: GlassTokens; tier: SubscriptionTier; items: readonly PlusTabItem[];
  /** Пробный период ВЫБРАННОГО тарифа из магазина; null — шкалы нет. */
  trialDays: number | null;
  /** Сумма первого списания после пробного (цена выбранного тарифа из магазина). */
  chargePrice: string;
}) {
  const [all, setAll] = useState(false);
  const toggleAll = useCallback(() => { animateNextLayoutTransition(); setAll((was) => !was); }, []);
  const [c1, c2] = DUO_TIER_COLORS[tier];
  const top = DUO_TOP_ROW_KEYS.map((key) => items.find((item) => item.key === key)).filter((item): item is PlusTabItem => !!item);
  const rows = all ? [...top, ...items.filter((item) => !top.includes(item))] : top;
  const tint = `${c2}1F`; // макет: колонка уровня — цвет уровня 12 %
  const reminderDay = trialDays && trialDays > REMINDER_DAYS_BEFORE_CHARGE ? trialDays - REMINDER_DAYS_BEFORE_CHARGE : null;
  useEffect(() => {
    console.log(`[PAYWALL-DUO] низ: уровень=${tier} строк=${rows.length}/${items.length} развёрнуто=${String(all)} пробный=${trialDays ?? 'нет'} напоминаниеНаДень=${reminderDay ?? 'нет'} списание=${chargePrice || 'нет цены'}`); // guard-ok: одна строка на смену состояния
  }, [all, chargePrice, items.length, reminderDay, rows.length, tier, trialDays]);
  return (
    <View testID="paywall-duo-more">
      <Text accessibilityRole="header" style={[S.h3, { color: g.text }]}>{pick(lang, H_CHANGES)}</Text>
      <View style={S.tr}>
        <View style={S.cName} />
        <Text style={[S.cFree, S.th, { color: g.mutedText }]}>{word(lang, PLUS_TAB_FREE_LABEL)}</Text>
        <View style={[S.cTier, S.thTier, { backgroundColor: tint }]}><Text style={[S.th, { color: g.isLight ? g.text : c1 }]}>{SUBSCRIPTION_TIER_NAME[tier]}</Text></View>
      </View>
      {rows.map((item, index) => (
        <View key={item.key} testID={`paywall-duo-row-${item.key}`} style={S.tr}>
          <Text style={[S.cName, S.td, S.line, { color: g.text, borderTopColor: g.line }]}>{word(lang, item.title)}</Text>
          <Text style={[S.cFree, S.td, S.line, { color: g.mutedText, borderTopColor: g.line }]}>{item.free ? word(lang, item.free) : '—'}</Text>
          <View style={[S.cTier, S.line, { backgroundColor: tint, borderTopColor: g.line }, index === rows.length - 1 ? S.tierLast : null]}>
            <Text style={[S.td, S.tdTier, { color: g.text }]}>{word(lang, item.plus)}</Text>
          </View>
        </View>
      ))}
      {items.length > top.length ? (
        <V2Pressable testID="paywall-duo-all" accessibilityRole="button" accessibilityState={{ expanded: all }} withHaptic={false} scaleTo={0.97} onPress={toggleAll} outerStyle={S.allOuter} style={S.all}>
          <Text style={[S.allText, { color: g.isLight ? g.text : c1 }]}>{all ? pick(lang, COPY.collapse) : compareMore(lang, items.length)}</Text>
        </V2Pressable>
      ) : null}

      {trialDays ? (
        <View testID="paywall-duo-trial">
          <Text accessibilityRole="header" style={[S.h3, { color: g.text }]}>{pick(lang, H_TRIAL)}</Text>
          {[
            { key: 'today', title: pick(lang, COPY.today), text: pick(lang, COPY.todayDetail).replace(/\bPlus\b/g, SUBSCRIPTION_TIER_NAME[tier]) },
            ...(reminderDay ? [{ key: 'remind', title: reminderDayTitle(lang, reminderDay), text: pick(lang, COPY.reminderDetail) }] : []),
            { key: 'charge', title: reminderDayTitle(lang, trialDays), text: chargePrice ? chargeLine(lang, chargePrice) : pick(lang, COPY.priceWillConfirm) },
          ].map((step, index, list) => (
            <View key={step.key} style={S.step}>
              <View style={S.rail}>
                <View style={[S.dot, { backgroundColor: c2 }]} />
                {index < list.length - 1 ? <View style={[S.railLine, { backgroundColor: g.line }]} /> : null}
              </View>
              <View style={S.stepCopy}>
                <Text style={[S.stepTitle, { color: g.text }]}>{step.title}</Text>
                <Text style={[S.stepText, { color: g.mutedText }]}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text accessibilityRole="header" style={[S.h3, { color: g.text }]}>{pick(lang, H_FAQ)}</Text>
      {FAQ.map((item) => <Faq key={item.key} lang={lang} g={g} item={item} />)}
    </View>
  );
});

/** Кнопка покупки, которая выезжает снизу, когда тарифы первого экрана ушли из вида (макет .dock: 0,32 с, cubic-bezier(.23,1,.32,1)). */
export const PaywallDuoStickyBuy = memo(function PaywallDuoStickyBuy({ g, tier, visible, label, note, busy, disabled, bottomInset, onPress }: {
  g: GlassTokens; tier: SubscriptionTier; visible: boolean; label: string; note: string; busy: boolean; disabled: boolean; bottomInset: number; onPress: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const shown = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) { shown.setValue(visible ? 1 : 0); return undefined; }
    const animation = Animated.timing(shown, { toValue: visible ? 1 : 0, duration: 320, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, shown, visible]);
  const colors = DUO_TIER_COLORS[tier];
  const ink = DUO_TIER_INK[tier];
  const fade = g.opaqueCard.slice(0, 7);
  return (
    <Animated.View testID="paywall-duo-sticky" pointerEvents={visible ? 'box-none' : 'none'} accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[S.sticky, { paddingBottom: Math.max(bottomInset, 16), transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [140, 0] }) }] }]}>
      <LinearGradient pointerEvents="none" colors={[`${fade}00`, fade]} locations={[0, 0.34]} style={StyleSheet.absoluteFill} />
      <V2Pressable testID="paywall-duo-sticky-buy" accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy }} disabled={disabled}
        withHaptic scaleTo={0.97} onPress={onPress} style={[S.stickyBtn, { backgroundColor: colors[1] }]}>
        <LinearGradient pointerEvents="none" colors={[...colors]} locations={[0, 0.48, 1]} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={StyleSheet.absoluteFill} />
        {busy ? <ActivityIndicator color={ink} /> : (
          <>
            <Text style={[S.stickyLabel, { color: ink }]}>{label}</Text>
            {note ? <Text style={[S.stickyNote, { color: ink }]}>{note}</Text> : null}
          </>
        )}
      </V2Pressable>
    </Animated.View>
  );
});

const S = StyleSheet.create({
  // макет .more h3: 20 / 700 / −0.3, отступы 26 сверху и 12 снизу
  h3: { marginTop: 26, marginBottom: 12, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  tr: { flexDirection: 'row', alignItems: 'stretch' },
  cName: { flex: 1, minWidth: 0 },
  cFree: { width: 92, textAlign: 'center' },
  cTier: { width: 92, alignItems: 'center', justifyContent: 'center' },
  th: { fontSize: 13, lineHeight: 18, fontWeight: '600', paddingBottom: 6 },
  thTier: { paddingTop: 8, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  td: { fontSize: 14, lineHeight: 20, paddingVertical: 11 },
  tdTier: { fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  line: { borderTopWidth: StyleSheet.hairlineWidth },
  tierLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  allOuter: { alignSelf: 'flex-start', marginTop: 10 },
  all: { minHeight: 44, justifyContent: 'center' },
  allText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  step: { flexDirection: 'row', gap: 10 },
  rail: { width: 20, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  railLine: { flex: 1, width: 1, marginTop: 2 },
  stepCopy: { flex: 1, minWidth: 0, paddingBottom: 18 },
  stepTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  stepText: { fontSize: 14, lineHeight: 20 },
  faq: { borderTopWidth: StyleSheet.hairlineWidth },
  faqHead: { minHeight: 48, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQ: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  faqSign: { fontSize: 18, lineHeight: 22 },
  faqA: { fontSize: 14, lineHeight: 20, paddingBottom: 14 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, paddingHorizontal: 16 },
  stickyBtn: { overflow: 'hidden', minHeight: 56, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stickyLabel: { flexShrink: 1, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  stickyNote: { flexShrink: 1, fontSize: 13, lineHeight: 17, textAlign: 'right', opacity: 0.86 },
});
