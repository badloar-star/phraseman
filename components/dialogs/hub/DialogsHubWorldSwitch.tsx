// ═════════════════════════════════════════════════════════════════════
// DialogsHubWorldSwitch.tsx — переключатель тем «таблеткой» на экране темы вместо чипов (макет dialogs-hub-v4.html, кадры 3 и 6).
//
// зачем (владелец 22.10: «УБРАТЬ ВОТ ТАКИЕ КНОПКИ [чипы тем в две строки] — ЭТО НЕУДОБНО», решение (в)): первая ячейка «Все», затем иконки миров; выбранная ячейка раскрывается названием и
// заливается «текст на фоне» (dialogsHubTokens().pill). Переключение — локальное состояние экрана, мгновенно, без сети; сдвиг ячеек — animateNextLayoutTransition.
// ═════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { animateNextLayoutTransition } from '../../../app/smooth_layout';
import { useLang } from '../../LangContext';
import { useLv2Glass } from '../../learning-v2/LearningV2Glass';
import V2Pressable from '../../v2/V2Pressable';
import { dialogueWorldIcon } from '../dialogue_scenario_icons';
import { dialogsHubTokens } from '../scene/dialogs_hub_tokens';
import { dialogsSceneText } from '../scene/dialogs_scene_copy';
import { DIALOGS_HUB_ALL, type DialogsHubWorldCount } from './dialogs_hub_model';

type Props = Readonly<{
  worlds: readonly DialogsHubWorldCount[];
  selected: string;
  onSelect: (worldId: string) => void;
}>;

function DialogsHubWorldSwitch({ worlds, selected, onSelect }: Props) {
  const { lang } = useLang();
  const g = useLv2Glass();
  const pill = dialogsHubTokens(g).pill;
  const cells = [{ id: DIALOGS_HUB_ALL, title: dialogsSceneText(lang, 'allWorlds'), icon: null as null | ReturnType<typeof dialogueWorldIcon> }, ...worlds.map((w) => ({ id: w.id, title: w.title, icon: dialogueWorldIcon(w.id) as null | ReturnType<typeof dialogueWorldIcon> }))];
  return (
    <View testID="dialogs-hub-world-switch" style={[styles.track, { backgroundColor: pill.track }]}>
      {cells.map((cell) => {
        const on = cell.id === selected;
        const ink = on ? pill.selectedInk : pill.idleInk;
        return (
          <V2Pressable
            key={cell.id}
            testID={`dialogs-hub-switch-${cell.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={cell.title}
            onPress={() => { if (!on) { animateNextLayoutTransition(); onSelect(cell.id); } }}
            outerStyle={on ? styles.onOuter : styles.offOuter}
            scaleTo={0.97}
            style={[styles.cell, on ? styles.cellOn : null, { backgroundColor: on ? pill.selectedBg : 'transparent' }]}
          >
            {cell.icon ? <Ionicons name={cell.icon} size={18} color={ink} /> : null}
            {on || !cell.icon ? <Text style={[styles.text, { color: ink }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{cell.title}</Text> : null}
          </V2Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // зачем: макет `.dv-sw` — высота 48, радиус 24, поля 4, зазор 2; ячейка 40 / радиус 20
  track: { height: 48, borderRadius: 24, padding: 4, flexDirection: 'row', gap: 2 },
  onOuter: { flexShrink: 0 },
  offOuter: { flex: 1, minWidth: 40 },
  cell: { height: 40, minWidth: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cellOn: { paddingHorizontal: 14 },
  text: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
});

export default memo(DialogsHubWorldSwitch);
