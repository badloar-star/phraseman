// PeakMyCounter — «мои монеты + моё место» для экрана Пика. Каркас без раскладки: родитель (вариант A/B) задаёт отступы и ширину.
// зачем (координатор 04.11): общий под-компонент, чтобы сборка выбранного варианта была быстрой; токены Тем, без обводок, тексты ≥15.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { useSpirePalette } from '../useSpirePalette';
import { spireGameText } from '../spire_game_strings';
import { spireGroupThousands } from '../spire_plurals';
import type { PeakMe } from '../../../modules/spire/peak_model';

type Props = Readonly<{ lang: Lang; me: PeakMe }>;

function PeakMyCounter({ lang, me }: Props) {
  const p = useSpirePalette();
  return (
    <View style={s.row} testID="peak-my-counter">
      <View style={s.cell}>
        <Text style={[s.label, { color: p.textSecondary }]}>{spireGameText(lang, 'peakMyCoins')}</Text>
        <Text style={[s.value, { color: p.text }]} testID="peak-my-coins">{spireGroupThousands(me.weekCoins)}</Text>
      </View>
      <View style={s.cell}>
        <Text style={[s.label, { color: p.textSecondary }]}>{spireGameText(lang, 'peakMyPlace')}</Text>
        <Text style={[s.value, { color: p.text }]} testID="peak-my-place">{me.place === null ? '—' : String(me.place)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 24 },
  cell: { flexShrink: 1 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  value: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
});

export default memo(PeakMyCounter);
