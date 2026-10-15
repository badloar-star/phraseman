// ─── Общий вид тупикового экрана: значок, заголовок, пояснение, ОСНОВНАЯ кнопка на всю ширину ──────────────
// зачем (координатор 15.10: «mistake_detail без записи — тупик, только стрелка; ai_dialog_briefing «Диалог не найден» — «Назад» не на всю ширину; приведи к общему компоненту тупиковых экранов»):
// одна вёрстка вместо кнопок разной ширины. Только вид: когда показывать и куда вести — решает экран. Заливка кнопки и подпись — из токенов темы (cta / ctaInk), нажатие — V2Pressable (как у основных кнопок).
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useTheme } from '../ThemeContext';
import V2Pressable from './V2Pressable';

type Props = Readonly<{
  icon?: keyof typeof Ionicons.glyphMap;
  /** Заголовок; нет — экран состоит из пояснения и кнопки. */
  title?: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  testID?: string;
}>;

function V2DeadEndBase({ icon = 'alert-circle-outline', title, body, actionLabel, onAction, testID = 'v2-dead-end' }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  return (
    <View testID={testID} style={s.wrap}>
      <Ionicons name={icon} size={40} color={g.secondary} />
      {title ? <Text accessibilityRole="header" style={[s.title, { color: g.text }]}>{title}</Text> : null}
      <Text style={[s.body, { color: g.secondary }]}>{body}</Text>
      <V2Pressable
        testID={`${testID}-action`}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onAction}
        style={[s.cta, { backgroundColor: g.cta }]}
      >
        <Text style={[s.ctaText, { color: g.ctaInk }]}>{actionLabel}</Text>
      </V2Pressable>
    </View>
  );
}

export default memo(V2DeadEndBase);

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 520, alignItems: 'center', alignSelf: 'center', paddingHorizontal: 20 },
  title: { marginTop: 14, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { marginTop: 8, fontSize: 16, textAlign: 'center' },
  // основная кнопка на всю ширину блока (минимальная высота 52, как у основных кнопок экранов 2.0)
  cta: { alignSelf: 'stretch', minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 28, paddingHorizontal: 20 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
