// PeakAllList — все участники комнаты (до 30) с монетами; зоны — тонкой линией-разделителем и подписью, как в «Все участники».
// зачем (координатор 04.11): каркас без раскладки; вся прокрутка — у родителя, список — обычный View (30 строк, без вложенного ScrollView).
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { useSpirePalette } from '../useSpirePalette';
import { spireText } from '../spire_strings';
import PeakTopRow from './PeakTopRow';
import type { PeakRow } from '../../../modules/spire/peak_model';

type Props = Readonly<{ lang: Lang; rows: readonly PeakRow[]; onPressRow?: (row: PeakRow) => void }>;

function PeakAllList({ lang, rows, onPressRow }: Props) {
  const p = useSpirePalette();
  return (
    <View testID="peak-all-list">
      {rows.map((row, i) => {
        const prev = i > 0 ? rows[i - 1] : null;
        const boundary = prev !== null && prev.zone !== row.zone;
        const label = row.zone === 'up' ? spireText(lang, 'zoneUp') : row.zone === 'down' ? spireText(lang, 'zoneDown') : spireText(lang, 'zoneStay');
        const color = row.zone === 'up' ? p.correct : row.zone === 'down' ? p.wrong : p.textSecondary;
        return (
          <React.Fragment key={row.uid}>
            {i === 0 || boundary ? (
              <View style={s.zone}>
                <Text style={[s.zoneText, { color }]}>{label}</Text>
                <View style={[s.zoneLine, { backgroundColor: p.hairline }]} />
              </View>
            ) : null}
            <PeakTopRow lang={lang} row={row} onPress={onPressRow} />
          </React.Fragment>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  zone: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 6, marginHorizontal: 2 },
  zoneText: { fontSize: 15, fontWeight: '700' },
  zoneLine: { flex: 1, height: 1 },
});

export default memo(PeakAllList);
