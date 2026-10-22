// ═══════════════════════════════════════════════════════════════════════════
// DialogsScenePanel.tsx — панель «Диалоги» под сценой: фильтр миров и карточки диалогов (эталон dialogs-scene-states.html, `.dpanel`, `.wseg`, `.dcard`).
//
// зачем (владелец 21.10, после первого показа: «выбирается ДИАЛОГ, а не собеседник»): карточка — это диалог: мир, название, цели и первая цель, а собеседник
// стоит ВНУТРИ карточки («с Милой»), справа — «пройдено» ✓, «продолжить» ▶ с кольцом 2/6 или стрелка. Панель наезжает на сцену на 38 и лежит на непрозрачной
// карточке темы с мягкой тенью, без обводок. Цвета — токены темы (useLv2Glass), размеры текста 13/16 и заголовок 20.
// Вид — только из пропсов: каталог диалогов приходит от раздела (в превью — моки), здесь нет ни сети, ни хранилища.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { alphaHex } from '../../../constants/v2Style';
import { useLv2Glass } from '../../learning-v2/LearningV2Glass';
import V2Pressable from '../../v2/V2Pressable';
import { DIALOGS_SCENE_PANEL_OVERLAP } from './DialogsSceneStage';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

export type DialogsSceneCardStatus = 'new' | 'current' | 'done';

export type DialogsSceneCardData = Readonly<{
  id: string;
  world: string;
  worldIcon: IonName;
  title: string;
  /** Строка целей: «6 целей · первая: поздороваться». */
  goalsLine: string;
  /** Собеседники внутри карточки: инициалы кружков и подпись «с Мариной». */
  initials: readonly string[];
  /** Подпись «с Мариной» тремя кусками: слово до имени, имя (жирным), слово после (в турецком «Marina ile»). */
  whoBefore: string;
  whoName: string;
  whoAfter: string;
  status: DialogsSceneCardStatus;
  /** Кольцо рядом с ▶ («2/6»); только у current. */
  ring: string | null;
}>;

export type DialogsScenePanelProps = Readonly<{
  title: string;
  count: string;
  /** Миры: «Все» и четыре мира; выбран — по id. */
  worlds: readonly Readonly<{ id: string; label: string }>[];
  worldId: string;
  onWorld: (id: string) => void;
  cards: readonly DialogsSceneCardData[];
  onCard: (id: string) => void;
}>;

function DialogCard({ card, onPress }: Readonly<{ card: DialogsSceneCardData; onPress: () => void }>) {
  const g = useLv2Glass();
  const current = card.status === 'current';
  return (
    <V2Pressable
      testID={`dialogs-scene-card-${card.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${card.whoBefore}${card.whoName}${card.whoAfter}`}
      onPress={onPress}
      scaleTo={0.98}
      style={[s.card, { backgroundColor: current ? alphaHex(g.accentText, 0.16) : g.opaqueControl }]}
    >
      <View style={s.cardMain}>
        <View style={s.worldRow}>
          <Ionicons name={card.worldIcon} size={14} color={g.secondary} />
          <Text style={[s.world, { color: g.secondary }]}>{card.world}</Text>
        </View>
        <Text style={[s.cardTitle, { color: g.text }]}>{card.title}</Text>
        <Text style={[s.small, { color: g.secondary }]}>{card.goalsLine}</Text>
        <View style={s.whoRow}>
          <View style={s.avatars}>
            {card.initials.map((ch, i) => (
              <View key={`${card.id}-${ch}-${String(i)}`} style={[s.av, { backgroundColor: g.selected }]}>
                <Text style={[s.avText, { color: g.text }]}>{ch}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.small, { color: g.secondary, flexShrink: 1 }]} numberOfLines={2}>{card.whoBefore}<Text style={[s.bold, { color: g.text }]}>{card.whoName}</Text>{card.whoAfter}</Text>
        </View>
      </View>
      <View style={s.end}>
        {card.status === 'done' ? (
          <View style={[s.ok, { backgroundColor: g.good }]}><Ionicons name="checkmark" size={15} color={g.ctaInk} /></View>
        ) : (
          <>
            <View style={[s.go, { backgroundColor: current ? g.cta : g.selected }]}>
              <Ionicons name={current ? 'play' : 'chevron-forward'} size={16} color={current ? g.ctaInk : g.text} />
            </View>
            {card.ring ? <Text style={[s.ring, { color: g.accentText }]}>{card.ring}</Text> : null}
          </>
        )}
      </View>
    </V2Pressable>
  );
}

export type DialogsScenePlusRow = Readonly<{ icon: IonName; label: string }>;

/** Панель состояния «лимит»: вместо каталога — три строки про Plus (эталон `.plus-row`). */
export const DialogsScenePlusPanel = memo(function DialogsScenePlusPanel({ rows }: Readonly<{ rows: readonly DialogsScenePlusRow[] }>) {
  const g = useLv2Glass();
  return (
    <View testID="dialogs-scene-plus-panel" style={[s.panel, { backgroundColor: g.opaqueCard, boxShadow: `0 26px 50px -22px ${g.isLight ? g.shadowTint : 'rgba(0,0,0,0.62)'}` /* theme-exempt: тень панели тёмного оформления, эталон --shc */ }]}>
      {rows.map((r) => (
        <View key={r.label} style={s.plusRow}>
          <Ionicons name={r.icon} size={20} color={g.accentText} />
          <Text style={[s.plusText, { color: g.text }]}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
});

function DialogsScenePanel(p: DialogsScenePanelProps) {
  const g = useLv2Glass();
  return (
    <View testID="dialogs-scene-panel" style={[s.panel, { backgroundColor: g.opaqueCard, boxShadow: `0 26px 50px -22px ${g.isLight ? g.shadowTint : 'rgba(0,0,0,0.62)'}` /* theme-exempt: тень панели тёмного оформления, эталон --shc */ }]}>
      <View style={s.head}>
        <Text accessibilityRole="header" style={[s.headTitle, { color: g.text }]}>{p.title}</Text>
        <Text style={[s.headCount, { color: g.secondary }]}>{p.count}</Text>
      </View>
      <View style={s.worlds}>
        {p.worlds.map((w) => {
          const on = w.id === p.worldId;
          return (
            <V2Pressable key={w.id} testID={`dialogs-scene-world-${w.id}`} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => p.onWorld(w.id)} scaleTo={0.96}
              style={[s.chip, { backgroundColor: on ? g.cta : g.opaqueControl }]}>
              <Text style={[s.chipText, { color: on ? g.ctaInk : g.text }]}>{w.label}</Text>
            </V2Pressable>
          );
        })}
      </View>
      <View style={s.cards}>
        {p.cards.map((card) => <DialogCard key={card.id} card={card} onPress={() => p.onCard(card.id)} />)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // зачем: панель наезжает на сцену (.dpanel margin −38 16 0) и лежит выше неё
  panel: { zIndex: 3, marginTop: -DIALOGS_SCENE_PANEL_OVERLAP, marginHorizontal: 16, borderRadius: 28, padding: 16 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  headTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  headCount: { marginLeft: 'auto', fontSize: 16, lineHeight: 21, fontVariant: ['tabular-nums'] },
  worlds: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { height: 34, borderRadius: 17, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  cards: { gap: 10, marginTop: 12 },
  card: { borderRadius: 22, paddingVertical: 14, paddingLeft: 16, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardMain: { flex: 1, minWidth: 0, gap: 4 },
  worldRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  world: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  small: { fontSize: 13, lineHeight: 17 },
  bold: { fontWeight: '700' },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, minWidth: 0 },
  avatars: { flexDirection: 'row', gap: 6 },
  av: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  plusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  plusText: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  end: { alignItems: 'center', gap: 6 },
  ok: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  go: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ring: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

export default memo(DialogsScenePanel);
