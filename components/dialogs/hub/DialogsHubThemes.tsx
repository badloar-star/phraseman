// ═════════════════════════════════════════════════════════════════════
// DialogsHubThemes.tsx — плитки тем 2 × 2 и широкая «Все диалоги» под плиткой «Свободный разговор» (макет dialogs-hub-v4.html, кадры 1–2).
//
// зачем (владелец 22.10, «Да, переносить»; чипы в две строки убраны — «ЭТО НЕУДОБНО»): темы выбираются плитками одного стиля с «Свободным разговором» (высота 58, заливка «контрол» темы, без обводок),
// тап открывает тему ОТДЕЛЬНЫМ экраном (решение (г)), «Все диалоги» — тот же экран со всеми темами. На плитке темы — «k из n» и тонкая дорожка прогресса. Цвета — только токены dialogs_hub_tokens.
// Данные — счётчики из проекции каталога хаба (dialogs_hub_model), чтений Firestore нет.
// ═════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLang } from '../../LangContext';
import { useLv2Glass } from '../../learning-v2/LearningV2Glass';
import { lv2Mix } from '../../learning-v2/learning_v2_task_theme_tokens';
import V2Pressable from '../../v2/V2Pressable';
import { dialogueWorldIcon } from '../dialogue_scenario_icons';
import { dialogsHubTokens } from '../scene/dialogs_hub_tokens';
import { dialogsSceneText } from '../scene/dialogs_scene_copy';
import { dialogsHubProgress, type DialogsHubTotals, type DialogsHubWorldCount } from './dialogs_hub_model';

export const DIALOGS_HUB_TILE_HEIGHT = 58;
export const DIALOGS_HUB_TILE_RADIUS = 20;

type Props = Readonly<{
  worlds: readonly DialogsHubWorldCount[];
  totals: DialogsHubTotals;
  onWorld: (worldId: string) => void;
  onAll: () => void;
}>;

function chunk<T>(list: readonly T[], size: number): readonly (readonly T[])[] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function DialogsHubThemes({ worlds, totals, onWorld, onAll }: Props) {
  const { lang } = useLang();
  const g = useLv2Glass();
  const t = dialogsHubTokens(g);
  const track = lv2Mix(t.tile.bg, g.text, 0.16);
  const rows = chunk(worlds, 2);
  return (
    <View testID="dialogs-hub-themes">
      <Text style={[styles.label, { color: g.secondary }]}>{dialogsSceneText(lang, 'topics')}</Text>
      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row.map((w) => w.id).join('+')} style={styles.gridRow}>
            {row.map((world) => {
              const counter = dialogsSceneText(lang, 'ofPair', { k: world.done, n: world.total });
              return (
                <V2Pressable
                  key={world.id}
                  testID={`dialogs-hub-world-${world.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${world.title}, ${counter}`}
                  onPress={() => onWorld(world.id)}
                  outerStyle={styles.flex}
                  style={[styles.tile, { backgroundColor: t.tile.bg }]}
                >
                  <Ionicons name={dialogueWorldIcon(world.id)} size={20} color={t.tile.icon} />
                  <View style={styles.flex}>
                    <Text style={[styles.title, { color: t.tile.label }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{world.title}</Text>
                    <Text style={[styles.sub, { color: t.tile.count }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{counter}</Text>
                  </View>
                  <View pointerEvents="none" style={[styles.track, { backgroundColor: track }]}>
                    <View style={[styles.fill, { width: `${Math.round(dialogsHubProgress(world.done, world.total) * 100)}%`, backgroundColor: g.accent }]} />
                  </View>
                </V2Pressable>
              );
            })}
            {row.length === 1 ? <View style={styles.flex} /> : null}
          </View>
        ))}
      </View>
      <V2Pressable
        testID="dialogs-hub-all"
        accessibilityRole="button"
        accessibilityLabel={`${dialogsSceneText(lang, 'allDialogs')}, ${dialogsSceneText(lang, 'ofPair', { k: totals.done, n: totals.total })}`}
        onPress={onAll}
        outerStyle={styles.allOuter}
        style={[styles.tile, styles.allTile, { backgroundColor: t.tile.bg }]}
      >
        <Ionicons name="apps-outline" size={22} color={t.tile.icon} />
        <Text style={[styles.title, styles.flex, { color: t.tile.label }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{dialogsSceneText(lang, 'allDialogs')}</Text>
        <Text style={[styles.count, { color: t.tile.count }]} maxFontSizeMultiplier={1.2}>{dialogsSceneText(lang, 'ofPair', { k: totals.done, n: totals.total })}</Text>
        <Ionicons name="chevron-forward" size={18} color={t.tile.count} />
      </V2Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  label: { marginTop: 16, paddingHorizontal: 4, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  grid: { marginTop: 7, gap: 8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  // зачем: плитка строго 58, заливка «контрол», без обводок — тот же размер и стиль, что у «Свободного разговора» и плиток хаба уроков
  tile: { height: DIALOGS_HUB_TILE_HEIGHT, borderRadius: DIALOGS_HUB_TILE_RADIUS, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  allOuter: { marginTop: 20 },
  allTile: { paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  sub: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  count: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { position: 'absolute', left: 12, right: 12, bottom: 7, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
});

export default memo(DialogsHubThemes);
