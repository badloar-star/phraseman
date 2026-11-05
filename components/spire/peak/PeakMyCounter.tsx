// PeakMyCounter — «мои монеты + моё место» для экрана Пика. Каркас без раскладки: родитель (вариант A/B) задаёт отступы и ширину.
// зачем (координатор 04.11): общий под-компонент, чтобы сборка выбранного варианта была быстрой; токены Тем, без обводок, тексты ≥15.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { useSpirePalette } from '../useSpirePalette';
import { spireGameText } from '../spire_game_strings';
import { spireGroupThousands } from '../spire_plurals';
import type { PeakMe, PeakRankBy } from '../../../modules/spire/peak_model';

// loading — комната ещё не прочитана: вместо нулей «—» (владелец: не показывать выдуманные цифры)
type Props = Readonly<{ lang: Lang; me: PeakMe; rankBy?: PeakRankBy; loading?: boolean }>;

function PeakMyCounter({ lang, me, rankBy = 'coins', loading = false }: Props) {
  const p = useSpirePalette();
  return (
    <View style={s.row} testID="peak-my-counter">
      {/* зачем (Макеты 05.11, макет B): крупные «744» и «12 место» без подписей над ними; подпись остаётся для диктора (accessibilityLabel) */}
      <View style={s.cell} accessible accessibilityLabel={`${spireGameText(lang, 'peakMyCoins')}: ${loading ? '—' : spireGroupThousands(me.value)}`}>
        <Text style={[s.value, { color: p.text }]} testID="peak-my-coins">{loading ? '—' : spireGroupThousands(me.value)}</Text>
      </View>
      <View style={s.cell} accessible accessibilityLabel={`${spireGameText(lang, 'peakMyPlace')}: ${loading || me.place === null ? '—' : String(me.place)}`}>
        <Text style={[s.value, { color: p.text }]} testID="peak-my-place">{loading || me.place === null ? '—' : spireGameText(lang, 'placeN', { n: me.place })}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // зачем (Сверка 05.11, живой кадр: «0 ступен/ей», «6/место» — слова рвались по символам в узкой колонке): блоки переносятся ЦЕЛИКОМ (flexWrap), слово внутри блока не рвётся; без сжатия шрифта и без обрезки
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, rowGap: 2 },
  cell: { flexShrink: 1 },
  value: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
});

export default memo(PeakMyCounter);
