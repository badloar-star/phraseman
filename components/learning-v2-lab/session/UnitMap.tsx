// зачем: RN-порт source/src/session/UnitMap.tsx — ГЛАВНЫЙ экран урока, «тропа»:
// одна вьющаяся вертикальная дорожка, без сеток и таблиц. Большие круглые узлы:
// done (золотой с галкой) · current (приподнят, пилюля «НАЧАТЬ») · open (цветной) ·
// locked (приглушён, замок). Ленты зон несут формулировки can-do, «Моя практика»
// и Challenge идут сбоку тропы, под узлами — 0–3 звезды. Все состояния из фикстуры.
import React, { memo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import TapScale from '../../TapScale';
import { GraphemeText } from '../kimi/primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT } from '../kimi/tokens';
import type { UnitMapVM, UnitSessionNode } from './contracts';

/** Вьющаяся кривая: горизонтальные сдвиги узлов, одна волна на 7 узлов. */
const WAVE = [0, 1, 0.5, -0.5, -1, -0.5, 0.5];
const NODE_SHIFT = 42;

export interface UnitMapProps {
  readonly vm: UnitMapVM;
  readonly onOpenSession: (sessionRef: string) => void;
  /** Боковой узел тропы («Моя практика»). */
  readonly onOpenSurface: (surfaceRef: string) => void;
  readonly bottomPadding?: number;
}

export const UnitMap = memo(function UnitMap({
  vm,
  onOpenSession,
  onOpenSurface,
  bottomPadding = 0,
}: UnitMapProps) {
  const [plan, setPlan] = useState<'free' | 'plus'>('free');

  // Индекс волны идёт сквозь зоны, чтобы кривая не начиналась заново.
  let waveCursor = 0;
  const zones = vm.zones.map((zone) => {
    const nodes = zone.sessions.map((node) => {
      const offset = WAVE[waveCursor % WAVE.length];
      waveCursor += 1;
      return { node, offset };
    });
    return { zone, nodes };
  });

  return (
    <ScrollView
      // guard-ok: юнит фиксирован — 12 узлов и 2 боковых, виртуализация дороже
      style={s.root}
      contentContainerStyle={[s.body, { paddingBottom: bottomPadding + SPACE.s8 }]}
      showsVerticalScrollIndicator={false}
      testID="v2-unit-map"
    >
      <View style={s.hero}>
        <Text style={s.kicker}>{vm.unit.kicker}</Text>
        <GraphemeText text={vm.unit.title} maxGraphemes={40} style={s.title} />
        <GraphemeText text={vm.unit.canDo} maxGraphemes={90} style={s.canDo} />
        <View style={s.meta}>
          <View style={s.tagMuted}>
            <Text style={s.tagMutedText}>{vm.unit.progressDisplay}</Text>
          </View>
          <View style={s.tagGold}>
            <Text style={s.tagGoldText}>★ {vm.unit.starsDisplay}</Text>
          </View>
          <View style={s.planRow}>
            {(['free', 'plus'] as const).map((p) => (
              <TapScale
                key={p}
                onPress={() => setPlan(p)}
                withHaptic
                scaleTo={0.96}
                accessibilityLabel={p === 'free' ? vm.planToggle.freeLabel : vm.planToggle.plusLabel}
                accessibilityState={{ selected: plan === p }}
                style={[s.planChip, plan === p ? s.planChipActive : null]}
              >
                <Text style={[s.planChipText, plan === p ? s.planChipTextActive : null]}>
                  {p === 'free' ? vm.planToggle.freeLabel : vm.planToggle.plusLabel}
                </Text>
              </TapScale>
            ))}
          </View>
        </View>
      </View>

      {zones.map(({ zone, nodes }, zoneIndex) => (
        <View key={zone.id} style={s.zone}>
          <View style={s.ribbon}>
            <GraphemeText text={zone.title} maxGraphemes={24} style={s.ribbonTitle} />
            <GraphemeText text={zone.canDo} maxGraphemes={70} style={s.ribbonCanDo} />
          </View>

          <View style={s.trail}>
            {nodes.map(({ node, offset }) => (
              <PathNode
                key={node.id}
                node={node}
                offset={offset}
                onOpen={() => {
                  if (node.state === 'locked' || !node.sessionRef) return;
                  onOpenSession(node.sessionRef);
                }}
              />
            ))}
          </View>

          {zoneIndex < vm.sideNodes.length ? (
            <TreasureNode
              node={vm.sideNodes[zoneIndex]}
              side={zoneIndex % 2 === 0 ? 'end' : 'start'}
              onOpen={onOpenSurface}
            />
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
});

const PathNode = memo(function PathNode(props: {
  readonly node: UnitSessionNode;
  readonly offset: number;
  readonly onOpen: () => void;
}) {
  const { node, offset, onOpen } = props;
  const locked = node.state === 'locked';
  const done = node.state === 'done';
  const current = node.state === 'current';

  return (
    <View style={[s.spot, { transform: [{ translateX: offset * NODE_SHIFT }] }]}>
      {current ? (
        <View style={s.startPill}>
          <Text style={s.startPillText}>НАЧАТЬ</Text>
        </View>
      ) : null}
      <TapScale
        onPress={onOpen}
        disabled={locked}
        withHaptic
        scaleTo={0.93}
        accessibilityLabel={locked ? `${node.title} — закрыто` : node.title}
        accessibilityState={{ disabled: locked }}
        style={[
          s.node,
          done ? s.nodeDone : null,
          current ? s.nodeCurrent : null,
          node.state === 'open' ? s.nodeOpen : null,
          locked ? s.nodeLocked : null,
        ]}
        testID={`v2-map-node-${node.id}`}
      >
        <Text style={[s.nodeGlyph, locked ? s.nodeGlyphLocked : null]}>
          {done ? '✓' : locked ? '🔒' : node.index}
        </Text>
      </TapScale>
      <View style={s.nodeStars} accessibilityLabel={`Звёзд: ${node.nodeStars} из 3`}>
        {NODE_STAR_SLOTS.map((slot, i) => (
          <Text key={slot} style={[s.nodeStar, i < node.nodeStars ? s.nodeStarOn : null]}>
            ★
          </Text>
        ))}
      </View>
      <GraphemeText text={node.title} maxGraphemes={34} style={s.nodeTitle} />
    </View>
  );
});

const NODE_STAR_SLOTS = ['ns-1', 'ns-2', 'ns-3'] as const;

const TreasureNode = memo(function TreasureNode(props: {
  readonly node: UnitMapVM['sideNodes'][number];
  readonly side: 'start' | 'end';
  readonly onOpen: (surfaceRef: string) => void;
}) {
  const { node, side, onOpen } = props;
  const locked = node.state === 'locked';
  return (
    <View style={[s.treasureRow, side === 'end' ? s.treasureEnd : s.treasureStart]}>
      <TapScale
        onPress={() => {
          if (locked || !node.surfaceRef) return;
          onOpen(node.surfaceRef);
        }}
        disabled={locked || !node.surfaceRef}
        withHaptic
        scaleTo={0.96}
        accessibilityLabel={locked ? `${node.title} — закрыто` : `${node.title}. ${node.sub}`}
        accessibilityState={{ disabled: locked }}
        style={[s.treasure, locked ? s.treasureLocked : null]}
        testID={`v2-map-side-${node.id}`}
      >
        <Text style={s.treasureGlyph}>{locked ? '🔒' : node.icon === 'target' ? '🎯' : '🏆'}</Text>
        <View style={s.treasureTexts}>
          <GraphemeText text={node.title} maxGraphemes={24} style={s.treasureTitle} />
          <GraphemeText
            text={locked && node.lockNote ? node.lockNote : node.sub}
            maxGraphemes={44}
            style={s.treasureSub}
          />
        </View>
      </TapScale>
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgCanvas },
  body: { gap: SPACE.s6 },
  hero: { paddingHorizontal: SPACE.s5, paddingTop: SPACE.s5, gap: SPACE.s2 },
  kicker: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.bold,
    color: C.fgSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: TEXT.xxl,
    fontWeight: WEIGHT.bold,
    color: C.fgPrimary,
    lineHeight: TEXT.xxl * LEADING.tight,
  },
  canDo: { fontSize: TEXT.md, color: C.fgSecondary, lineHeight: TEXT.md * LEADING.snug },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s2, marginTop: SPACE.s2 },
  tagMuted: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSubtle,
  },
  tagMutedText: { fontSize: TEXT.sm, color: C.fgSecondary },
  tagGold: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: '#2A2418',
  },
  tagGoldText: { fontSize: TEXT.sm, color: C.gold, fontWeight: WEIGHT.bold },
  planRow: { flexDirection: 'row', borderRadius: RADIUS.pill, backgroundColor: C.bgSubtle, overflow: 'hidden' },
  planChip: { paddingVertical: SPACE.s1, paddingHorizontal: SPACE.s4, minHeight: 34, justifyContent: 'center' },
  planChipActive: { backgroundColor: '#2A2418' },
  planChipText: { fontSize: TEXT.sm, color: C.accentPrimary, fontWeight: WEIGHT.semibold },
  planChipTextActive: { color: C.gold },
  zone: { gap: SPACE.s4 },
  ribbon: {
    marginHorizontal: SPACE.s4,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.card3,
    gap: 2,
  },
  ribbonTitle: { fontSize: TEXT.lg, fontWeight: WEIGHT.bold, color: C.fgPrimary },
  ribbonCanDo: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  trail: { gap: SPACE.s6, alignItems: 'center' },
  spot: { alignItems: 'center', gap: SPACE.s1 },
  startPill: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: C.accentPrimary,
    marginBottom: SPACE.s1,
  },
  startPillText: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.bold,
    color: C.accentOnPrimary,
    letterSpacing: 1,
  },
  node: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bgSubtle,
  },
  nodeDone: { backgroundColor: C.gold },
  nodeCurrent: { backgroundColor: C.accentPrimary },
  nodeOpen: { backgroundColor: C.second },
  nodeLocked: { backgroundColor: C.bgSurface, opacity: 0.6 },
  nodeGlyph: { fontSize: TEXT.xl, fontWeight: WEIGHT.bold, color: C.accentOnPrimary },
  nodeGlyphLocked: { fontSize: TEXT.lg, color: C.fgSecondary },
  nodeStars: { flexDirection: 'row', gap: 2 },
  nodeStar: { fontSize: TEXT.xs, color: C.bgSubtle },
  nodeStarOn: { color: C.gold },
  nodeTitle: { fontSize: TEXT.sm, color: C.fgSecondary, textAlign: 'center', maxWidth: 200 },
  treasureRow: { paddingHorizontal: SPACE.s4 },
  treasureStart: { alignItems: 'flex-start' },
  treasureEnd: { alignItems: 'flex-end' },
  treasure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
    maxWidth: 300,
  },
  treasureLocked: { opacity: 0.6 },
  treasureGlyph: { fontSize: 26 },
  treasureTexts: { flex: 1, gap: 2 },
  treasureTitle: { fontSize: TEXT.md, fontWeight: WEIGHT.bold, color: C.fgPrimary },
  treasureSub: { fontSize: TEXT.xs, color: C.fgSecondary, lineHeight: TEXT.xs * LEADING.normal },
});
