// FontWeightStrip.tsx — DEV-полоса весов шрифта 400–900: Inter (как в приложении) и системный шрифт рядом (только разработка, как dev_moments_preview).
// зачем (координатор 14.10, типографика): вес 800 в коде рисуется тоньше заказанного (в сборке зарегистрированы 400/600/700/900). Полоса показывает КАЖДЫЙ вес в Inter и в системном шрифте и подпись
// «заказано → рисуется по карте» (app/font_weights.ts): владелец снимает её на iPhone, Сверка — на эмуляторе; по кадру видно, какие начертания различимы, а какие совпали. Ничего не пишет и не читает из сети.
// Открывается: /dev_moments_preview?state=fonts (или dev_state-ссылкой с next=/dev_moments_preview?state=fonts). В стор-сборке маршрута нет.
import React, { memo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { resolveRenderedInterWeight } from '../../app/font_weights';
import { useSpirePalette } from '../spire/useSpirePalette';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';

const WEIGHTS = ['400', '500', '600', '700', '800', '900'] as const;
const SAMPLE = 'Фраза дня · Push the envelope'; // i18n-ok: образец текста dev-полосы для съёмки весов (как карточка «Фраза дня»), не экран игрока
const SYSTEM_FAMILY = Platform.select({ ios: 'System', default: 'sans-serif' });

function FontWeightStrip() {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  return (
    <ScrollView decelerationRate="fast" style={s.fill} contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} testID="dev-font-weight-strip">
      <Text style={[s.head, { color: p.textSecondary }]}>{/* i18n-ok: подпись dev-полосы для владельца и Сверки, не экран игрока */}ВЕСА ШРИФТА · {Platform.OS.toUpperCase()}</Text>
      {WEIGHTS.map((w) => { // guard-ok: шесть фиксированных строк dev-полосы, виртуализация не нужна
        const drawn = resolveRenderedInterWeight(w);
        return (
          <View key={w} style={s.row}>
            <Text style={[s.tag, { color: drawn === Number(w) ? p.textSecondary : p.accentText }]}>{w} → {drawn}{drawn === Number(w) ? '' : ' ≠'}</Text>
            <Text style={[s.sample, { color: p.text, fontWeight: w }]}>{SAMPLE}</Text>
            <Text style={[s.sample, { color: p.textSecondary, fontWeight: w, fontFamily: SYSTEM_FAMILY }]}>{SAMPLE}</Text>
          </View>
        );
      })}
      <Text style={[s.foot, { color: p.textSecondary }]}>{/* i18n-ok: пояснение dev-полосы для владельца и Сверки, не экран игрока */}Первая строка — Inter (как в приложении), вторая — системный шрифт. «≠» — вес рисуется не тем, что заказан (по карте app/font_weights.ts).</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  head: { fontSize: 13, lineHeight: 17, letterSpacing: 1.6, fontWeight: '700' },
  row: { gap: 2 },
  tag: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  sample: { fontSize: 19, lineHeight: 23, letterSpacing: -0.3 },
  foot: { fontSize: 13, lineHeight: 17, marginTop: 8 },
});

export default memo(FontWeightStrip);
