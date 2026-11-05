// зачем (слово владельца ~19:40 05.11, вариант Б; Apple 3.1.2): тонкий ряд «Условия · Конфиденциальность · Восстановить» под кнопкой вкладки Plus.
// Те же ссылки (KNOWLY_LEGAL_*), тот же открыватель (openLegalLink) и те же слова, что в нижней панели окон оплаты (PaywallPlusDock) — без обводок, вторичный тон.
import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../../app/config';
import { openLegalLink } from '../../app/open_legal_link';
import { PAYWALL_V3_RESTORE } from '../../app/paywall_v3_rows';
import type { Lang } from '../../constants/i18n';
import { COPY, pick } from '../paywall/PaywallPlusCopy';
import V2Pressable from '../v2/V2Pressable';

type Props = Readonly<{
  lang: Lang;
  /** Вторичный цвет подписи (g.secondary темы). */
  color: string;
  restoring: boolean;
  disabled: boolean;
  onRestore: () => void;
}>;

export const PlusTabLegalRow = memo(function PlusTabLegalRow({ lang, color, restoring, disabled, onRestore }: Props) {
  const restoreLabel = restoring ? pick(lang, COPY.restoring) : (PAYWALL_V3_RESTORE[lang] ?? PAYWALL_V3_RESTORE.en);
  const dot = <Text style={[S.dot, { color }]} accessible={false}>·</Text>;
  return (
    <View style={S.row} testID="plus-tab-legal-row">
      <V2Pressable accessibilityRole="link" testID="plus-tab-terms" scaleTo={0.95} withHaptic={false} onPress={() => openLegalLink(KNOWLY_LEGAL_TERMS_URL, 'plus_tab')} style={S.hit}>
        <Text style={[S.text, { color }]}>{pick(lang, COPY.terms)}</Text>
      </V2Pressable>
      {dot}
      <V2Pressable accessibilityRole="link" testID="plus-tab-privacy" scaleTo={0.95} withHaptic={false} onPress={() => openLegalLink(KNOWLY_LEGAL_PRIVACY_URL, 'plus_tab')} style={S.hit}>
        <Text style={[S.text, { color }]}>{pick(lang, COPY.privacy)}</Text>
      </V2Pressable>
      {dot}
      <V2Pressable
        accessibilityRole="button" testID="plus-tab-restore" accessibilityLabel={restoreLabel} accessibilityState={{ disabled, busy: restoring }}
        scaleTo={0.95} withHaptic={false} disabled={disabled} onPress={onRestore}
        style={[S.hit, { opacity: disabled && !restoring ? 0.4 : 1 }]}
      >
        {restoring ? <ActivityIndicator size="small" color={color} /> : null}
        <Text style={[S.text, { color }]}>{restoreLabel}</Text>
      </V2Pressable>
    </View>
  );
});

const S = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  hit: { minHeight: 44, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  text: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  dot: { fontSize: 13, lineHeight: 18 },
});
