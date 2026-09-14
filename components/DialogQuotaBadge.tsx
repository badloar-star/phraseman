import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { triLang, type Lang } from '../constants/i18n';
import { useTheme } from './ThemeContext';

type DialogQuotaBadgeProps = Readonly<{
  lang: Lang;
  remaining: number;
  limit: number;
  testID?: string;
}>;

/** Compact, non-interactive quota indicator shared by every text AI dialogue surface. */
export default function DialogQuotaBadge({ lang, remaining, limit, testID }: DialogQuotaBadgeProps) {
  const { theme: t, f } = useTheme();
  const safeLimit = Math.max(1, Math.floor(limit));
  const safeRemaining = Math.max(0, Math.min(safeLimit, Math.floor(remaining)));
  const label = triLang(lang, {
    ru: `Осталось бесплатных реплик: ${safeRemaining} из ${safeLimit}`,
    uk: `Залишилося безкоштовних реплік: ${safeRemaining} з ${safeLimit}`,
    en: `Free replies left: ${safeRemaining} of ${safeLimit}`,
    es: `Respuestas gratuitas restantes: ${safeRemaining} de ${safeLimit}`,
    'pt-BR': `Respostas gratuitas restantes: ${safeRemaining} de ${safeLimit}`,
    vi: `Còn ${safeRemaining}/${safeLimit} lượt miễn phí`,
    id: `Sisa balasan gratis: ${safeRemaining} dari ${safeLimit}`,
    tr: `Kalan ücretsiz yanıt: ${safeRemaining}/${safeLimit}`,
    pl: `Darmowe odpowiedzi: ${safeRemaining} z ${safeLimit}`,
  });

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        minHeight: 28,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: t.bgSurface,
      }}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={14} color={t.accent} />
      <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '800' }}>
        {safeRemaining}/{safeLimit}
      </Text>
    </View>
  );
}
