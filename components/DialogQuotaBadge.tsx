import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { triLang, type Lang } from '../constants/i18n';
import { useV2Palette } from './v2/useV2Palette';
import { useV2GlassStyle } from './v2/V2Glass';

type DialogQuotaBadgeProps = Readonly<{
  lang: Lang;
  remaining: number;
  limit: number;
  testID?: string;
}>;

/**
 * Compact, non-interactive quota indicator shared by every text AI dialogue
 * surface. Стиль 2.0 (владелец 24.09): стеклянная пилюля с тонкой кромкой,
 * как «⚡ 100» рядом — обе живут в одной визуальной семье пилюль хаба.
 */
export default function DialogQuotaBadge({ lang, remaining, limit, testID }: DialogQuotaBadgeProps) {
  const p = useV2Palette();
  const glass = useV2GlassStyle();
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
      style={[
        {
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 32,
          paddingHorizontal: 12,
          borderRadius: 999,
        },
        glass,
      ]}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={15} color={p.iconTint} />
      <Text style={{ color: p.text, fontSize: 17, fontWeight: '700' }}>
        {safeRemaining}/{safeLimit}
      </Text>
    </View>
  );
}
