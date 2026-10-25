// PaywallMWorkshopPreview.tsx — блок «что внутри» панели Мастерской: русская фраза, плитки слов (первые выбраны) и строка примеров с «+N».
// зачем (Макеты 25.10, 🟡4): панель должна показывать содержимое Мастерской урока. Цвета — токены темы; данные — paywall_m_workshop_preview.ts (только банк на телефоне).
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';
import { paywallPlateBg } from '../paywall_surfaces';
import type { PaywallMWorkshopPreview } from './paywall_m_workshop_preview';

export const PaywallMWorkshopPreviewBlock = memo(function PaywallMWorkshopPreviewBlock({ g, preview }: Readonly<{ g: GlassTokens; preview: PaywallMWorkshopPreview }>) {
  const plate = paywallPlateBg(g);
  return (
    <View testID="paywall-m-workshop-preview" style={[S.card, { backgroundColor: g.opaqueCard }]}>
      <Text style={[S.meaning, { color: g.secondary }]} numberOfLines={2}>{preview.meaning}</Text>
      <View style={S.tiles}>
        {preview.tokens.map((token, i) => {
          const picked = i < preview.selected;
          return (
            <View key={`${token}-${i}`} style={[S.tile, { backgroundColor: picked ? g.ctaFill : g.opaqueControl }]}>
              <Text style={[S.tileText, { color: picked ? g.ctaFillInk : g.text }]} numberOfLines={1}>{token}</Text>
            </View>
          );
        })}
      </View>
      <View style={S.samples}>
        {preview.samples.map((sample, i) => (
          <View key={`${sample}-${i}`} style={[S.sample, { backgroundColor: plate }]}><Text style={[S.sampleText, { color: g.text }]}>{sample}</Text></View>
        ))}
        {preview.more > 0 ? <View style={[S.sample, { backgroundColor: plate }]}><Text style={[S.sampleText, { color: g.secondary }]}>{`+${preview.more}`}</Text></View> : null}
      </View>
    </View>
  );
});

const S = StyleSheet.create({
  card: { borderRadius: 20, padding: 14, gap: 12 },
  // зачем (Макеты 25.10 (б)): русская фраза — подсказка к плиткам (13/17, secondary), а не второй заголовок рядом с заголовком панели
  meaning: { fontSize: 13, lineHeight: 17 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { minHeight: 36, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  samples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sample: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  sampleText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
