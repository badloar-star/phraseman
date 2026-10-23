// ═════════════════════════════════════════════════════════════════════
// V2PillSwitch.tsx — переключатель-«таблетка» с равными ячейками (макеты dialogs-hub-v4 `.dv-sw` и words-lesson-course `.wd-sw`).
//
// зачем (владелец 22.10 «Да, переносить»): один вид переключателя вместо чипов и самодельных сегментов — таблетка 48, радиус 24, поля 4, ячейки 40 / радиус 20; выбранная заливается цветом текста темы, подпись инвертируется.
// Цвета — токены текущей темы (useLv2Glass), нажатие — V2Pressable, переключение — локальное состояние вызывающего экрана (мгновенно, без сети). Тап по выбранной ячейке ничего не делает.
// ═════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLv2Glass } from '../learning-v2/LearningV2Glass';
import V2Pressable from './V2Pressable';

export type V2PillSwitchCell = Readonly<{ id: string; label: string }>;

type Props = Readonly<{
  cells: readonly V2PillSwitchCell[];
  selected: string;
  onSelect: (id: string) => void;
  testID?: string;
}>;

function V2PillSwitch({ cells, selected, onSelect, testID }: Props) {
  const g = useLv2Glass();
  return (
    <View testID={testID} accessibilityRole="tablist" style={[styles.track, { backgroundColor: g.opaqueControl }]}>
      {cells.map((cell) => {
        const on = cell.id === selected;
        return (
          <V2Pressable
            key={cell.id}
            testID={testID ? `${testID}-${cell.id}` : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={cell.label}
            onPress={() => { if (!on) onSelect(cell.id); }}
            outerStyle={styles.outer}
            scaleTo={0.97}
            style={[styles.cell, { backgroundColor: on ? g.text : 'transparent' }]}
          >
            <Text style={[styles.text, { color: on ? g.bg : g.secondary }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{cell.label}</Text>
          </V2Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 48, borderRadius: 24, padding: 4, flexDirection: 'row', gap: 2 },
  outer: { flex: 1 },
  cell: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  text: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
});

export default memo(V2PillSwitch);
