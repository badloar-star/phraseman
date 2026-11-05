// PeakMyCounter — «мои монеты + моё место» для экрана Пика. Каркас без раскладки: родитель (вариант A/B) задаёт отступы и ширину.
// зачем (координатор 04.11): общий под-компонент, чтобы сборка выбранного варианта была быстрой; токены Тем, без обводок, тексты ≥15.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { useSpirePalette } from '../useSpirePalette';
import { spireGameText } from '../spire_game_strings';
import { spireGroupThousands } from '../spire_plurals';
import RuneGlyph from '../../RuneGlyph';
import type { PeakMe, PeakRankBy } from '../../../modules/spire/peak_model';

// loading — комната ещё не прочитана: вместо нулей «—» (владелец: не показывать выдуманные цифры)
type Props = Readonly<{ lang: Lang; me: PeakMe; rankBy?: PeakRankBy; loading?: boolean }>;

function PeakMyCounter({ lang, me, loading = false }: Props) {
  const p = useSpirePalette();
  // зачем (владелец 05.11, «1 в 1» с variant_B_*): значок-монета + КРУПНОЕ число (~64 dp, акцентный тон) и ниже отдельной строкой «12 место» мельче и приглушённо; без слов про ступени
  return (
    <View style={s.col} testID="peak-my-counter">
      <View style={s.coinsRow} accessible accessibilityLabel={`${spireGameText(lang, 'peakMyCoins')}: ${loading ? '—' : spireGroupThousands(me.value)}`}>
        <View style={s.glyph}><RuneGlyph size={34} /></View>
        <Text style={[s.value, { color: p.accentTextSafe }]} testID="peak-my-coins">{loading ? '—' : spireGroupThousands(me.value)}</Text>
      </View>
      <Text style={[s.place, { color: p.textSecondary }]} accessible accessibilityLabel={`${spireGameText(lang, 'peakMyPlace')}: ${loading || me.place === null ? '—' : String(me.place)}`} testID="peak-my-place">{loading || me.place === null ? '—' : spireGameText(lang, 'placeN', { n: me.place })}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  col: { gap: 2 },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  glyph: { opacity: 0.9 },
  value: { fontSize: 60, lineHeight: 68, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'], flexShrink: 1 },
  place: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
});

export default memo(PeakMyCounter);
