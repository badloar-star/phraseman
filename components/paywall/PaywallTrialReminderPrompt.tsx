// ════════════════════════════════════════════════════════════════════════════
// PaywallTrialReminderPrompt.tsx — экран после покупки (макет paywall-v3 «AB»).
//
// зачем (владелец 2026-09-30): «если у юзера не разрешены уведомления — после
// покупки должно спросить можно ли отправлять». Показывается ВМЕСТО пейвола на
// том же месте (не окно поверх окна), только когда пробный начался, а системного
// разрешения нет. «Разрешить напоминание» → системный запрос → при согласии
// ставим напоминание (логика в usePaywallPurchase.allowTrialReminder).
// «Не сейчас» — закрыть без системного запроса.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../constants/i18n';
import V2Pressable from '../v2/V2Pressable';
import { LinearGradient } from '../SafeLinearGradient';
import { useV2GlassStyle, V2GlassSheen } from '../v2/V2Glass';
import type { GlassTokens } from './PaywallPlus';
import { ctaFillGradient } from '../../constants/accentFill';
import { COPY, pick } from './PaywallPlusCopy';

type Props = Readonly<{
  lang: Lang;
  g: GlassTokens;
  topInset: number;
  bottomInset: number;
  onAllow: () => Promise<void>;
  onSkip: () => void;
}>;

function PaywallTrialReminderPrompt({ lang, g, topInset, bottomInset, onAllow, onSkip }: Props) {
  const glass = useV2GlassStyle();
  // Мгновенный отклик: кнопка сразу показывает ожидание системного окна,
  // повторные тапы гасятся здесь и в хуке (trialReminderPromptBusyRef).
  const [asking, setAsking] = useState(false);
  const allow = useCallback(() => {
    if (asking) return;
    setAsking(true);
    void onAllow().finally(() => setAsking(false));
  }, [asking, onAllow]);

  return (
    // зачем: ScrollView с flexGrow — на низком экране кнопки не уходят за край
    // (reachable_action_buttons_contract), на обычном вид как в макете.
    <ScrollView
      testID="paywall-trial-reminder-prompt"
      style={S.scroll}
      contentContainerStyle={[S.root, { paddingTop: topInset + 60, paddingBottom: Math.max(bottomInset, 16) }]}
      showsVerticalScrollIndicator={false} decelerationRate="fast"
    >
      <View style={[S.bell, glass]}>
        <V2GlassSheen seed={2} />
        <Ionicons name="notifications-outline" size={38} color={g.text} />
      </View>
      <Text accessibilityRole="header" style={[S.title, { color: g.text }]}>{pick(lang, COPY.afterTitle)}</Text>
      <Text style={[S.body, { color: g.secondary }]}>{pick(lang, COPY.afterBody)}</Text>
      <View style={S.spacer} />
      <V2Pressable
        testID="paywall-trial-reminder-allow"
        accessibilityState={{ busy: asking }}
        disabled={asking}
        onPress={allow}
        withHaptic={false}
        outerStyle={S.stretch}
        // зачем (paywall-gaps-states `.wcta`): кнопка с градиентом и свечением, как главная кнопка покупки
        style={[S.cta, { backgroundColor: g.ctaFill, boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 26, color: `${g.ctaFill}4D` }] }]}
      >
        {/* зачем (Дизайн 12.10): см. PaywallPlus — заливка под accentInk через accentFillGradient */}
        <LinearGradient pointerEvents="none" colors={[...ctaFillGradient(g)]} style={StyleSheet.absoluteFill} />
        {asking
          ? <ActivityIndicator color={g.ctaFillInk} /> /* зачем (R1_PAYWALL_UX): цвет по подписи кнопки и её заливке accentFillGradient; ctaInk — другой токен и мог не читаться на этой заливке */
          : <Text style={[S.ctaText, { color: g.ctaFillInk }]}>{pick(lang, COPY.afterAllow)}</Text>}
      </V2Pressable>
      <V2Pressable
        testID="paywall-trial-reminder-skip"
        disabled={asking}
        onPress={onSkip}
        withHaptic={false}
        scaleTo={0.96}
        outerStyle={S.stretch}
        // зачем (владелец 13.10, №35 «никакие кнопки чтобы не сливались»; повод — вторичная «Напомнить за день» слилась с фоном и стояла впритык к главной): вторичная — пилюля на токене buttonFill, подпись text, зазор 12
        style={[S.ghost, { backgroundColor: g.buttonFill }]}
      >
        <Text style={[S.ghostText, { color: g.text }]}>{pick(lang, COPY.afterNotNow)}</Text>
      </V2Pressable>
    </ScrollView>
  );
}

export default memo(PaywallTrialReminderPrompt);

const S = StyleSheet.create({
  scroll: { flex: 1 },
  root: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24 },
  bell: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 24, fontSize: 28, lineHeight: 33, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  body: { marginTop: 10, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  spacer: { flexGrow: 1, minHeight: 24 },
  // зачем (paywall-gap-006, Макеты 12.10): кнопка была узким прямоугольником с прямыми углами. Причины две: (1) V2Pressable кладёт внешний Pressable в колонку с alignItems:'center' —
  // он сжимался по тексту, а `alignSelf:'stretch'` стоял на внутреннем слое (stretch переехал в outerStyle); (2) градиент на всю кнопку без overflow:'hidden' перекрывал скругление, как у главной кнопки покупки (PaywallPlus.cta).
  stretch: { alignSelf: 'stretch' },
  cta: { alignSelf: 'stretch', minHeight: 58, borderRadius: 29, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  ghost: { alignSelf: 'stretch', minHeight: 50, marginTop: 12, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontSize: 16, fontWeight: '700' },
});
