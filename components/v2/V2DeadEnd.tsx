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
  // зачем (Ревизор по c16f93ab5, 🟡): кегли и высота кнопки — из общей шкалы (f/ds: размер шрифта в настройках и uiScale окна), а не константы 22/16/52
  const { liquidGlassThemeId, f, ds } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  return (
    <View testID={testID} style={s.wrap}>
      <Ionicons name={icon} size={40} color={g.secondary} />
      {title ? <Text accessibilityRole="header" style={[s.title, { color: g.text, fontSize: f.h1, lineHeight: Math.round(f.h1 * 1.3) }]}>{title}</Text> : null}
      <Text style={[s.body, { color: g.secondary, fontSize: f.body, lineHeight: Math.round(f.body * 1.45) }]}>{body}</Text>
      <V2Pressable
        testID={`${testID}-action`}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onAction}
        style={[s.cta, { backgroundColor: g.cta, minHeight: Math.max(CTA_MIN_HEIGHT, ds.buttonHeight) }]}
      >
        <Text style={[s.ctaText, { color: g.ctaInk, fontSize: f.bodyLg }]}>{actionLabel}</Text>
      </V2Pressable>
    </View>
  );
}

export default memo(V2DeadEndBase);

/** Минимальная высота основной кнопки экранов 2.0; на крупной шкале растёт вместе с ds.buttonHeight. */
const CTA_MIN_HEIGHT = 52;

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 520, alignItems: 'center', alignSelf: 'center', paddingHorizontal: 20 },
  title: { marginTop: 14, fontWeight: '700', textAlign: 'center' },
  body: { marginTop: 8, textAlign: 'center' },
  // основная кнопка на всю ширину блока (минимальная высота 52, как у основных кнопок экранов 2.0)
  cta: { alignSelf: 'stretch', borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 28, paddingHorizontal: 20 },
  ctaText: { fontWeight: '700' },
});
