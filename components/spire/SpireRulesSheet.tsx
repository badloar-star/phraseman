// ═══════════════════════════════════════════════════════════════════════════
// SpireRulesSheet.tsx — «Правила Шпиля» (шторка community.html, чек-лист «правила · шторка»).
//
// зачем: правила — те же, что считают сервер и крон (TOWER §4.1–4.6): 15 этажей,
// комната 30, ступень = 10 заданий / общий таймер / 3 сердца, энергия на первом
// задании (D72), зоны 15% и «все с нулём вниз», монеты из config/spire_v1.
// Числа монет подставляются из конфига, а не пишутся текстом — поменяет владелец
// в админке, поменяется и здесь.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import type { SpireCoinsConfig } from '../../modules/spire/config_contract';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { spireGameText } from './spire_game_strings';

type Props = Readonly<{ lang: Lang; visible: boolean; coins: SpireCoinsConfig; onClose: () => void }>;

export function spireRuleLines(lang: Lang, coins: SpireCoinsConfig): readonly string[] {
  return [
    spireGameText(lang, 'rule1'),
    spireGameText(lang, 'rule2'),
    spireGameText(lang, 'rule3'),
    spireGameText(lang, 'rule4'),
    spireGameText(lang, 'rule5'),
    spireGameText(lang, 'rule6', { step: coins.perStep, floor: coins.perFloorPerLevel, g: coins.guardianMultiplier, summit: coins.summitBonus }),
    spireGameText(lang, 'rule7', { p1: coins.weekPlace1, p2: coins.weekPlace2, p3: coins.weekPlace3, promo: coins.promotionBonus }),
    spireGameText(lang, 'rule8'),
  ];
}

function SpireRulesSheet({ lang, visible, coins, onClose }: Props) {
  const p = useSpirePalette();
  const lines = spireRuleLines(lang, coins);
  return (
    <HybridSheetShell visible={visible} onClose={onClose} closeLabel={spireGameText(lang, 'close')} material="liquid-glass-opaque" testID="spire-rules-sheet">
      {({ requestDismiss }) => (
        <View style={s.body}>
          <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{spireGameText(lang, 'rulesTitle')}</Text>
          <ScrollView style={s.list} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
            {/* guard-ok: ровно 8 строк правил, виртуализация не нужна */}
            {lines.map((line, i) => (
              <View key={`rule-${i + 1}`} style={s.row}>
                <View style={[s.num, { backgroundColor: p.control }]}>
                  <Text style={[s.numText, { color: p.text }]}>{i + 1}</Text>
                </View>
                <Text style={[s.line, { color: p.text }]}>{line}</Text>
              </View>
            ))}
          </ScrollView>
          <V2Pressable onPress={requestDismiss} accessibilityRole="button" style={[s.cta, { backgroundColor: p.cta }]} testID="spire-rules-close">
            <Text style={[s.ctaText, { color: p.ctaText }]}>{spireGameText(lang, 'close')}</Text>
          </V2Pressable>
        </View>
      )}
    </HybridSheetShell>
  );
}

const s = StyleSheet.create({
  body: { paddingTop: 8 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  list: { marginTop: 14, maxHeight: 440 },
  listContent: { gap: 14, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 13, fontWeight: '700' },
  line: { flex: 1, fontSize: 16, lineHeight: 22 },
  cta: { marginTop: 20, minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
});

export default memo(SpireRulesSheet);
