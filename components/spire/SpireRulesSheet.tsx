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
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Lang } from '../../constants/i18n';
import type { SpireCoinsConfig } from '../../modules/spire/config_contract';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
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
  const p = useSpirePalette(); const sh = useSpireShadow();
  const lines = spireRuleLines(lang, coins);
  // зачем (снимок Макетов community-004: 8-е правило «В понедельник…» уходило за край): высота списка считается от экрана, а не константой 440 — 8 правил
  // помещаются, где экран позволяет; где нет — список прокручивается (шрифт не ужимаем). Запас под заголовок, кнопку «Закрыть», ручку и нижнюю зону.
  const { height: windowHeight } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const listMaxHeight = Math.max(240, Math.min(640, Math.round(windowHeight - insets.top - insets.bottom - 250)));
  return (
    <HybridSheetShell visible={visible} onClose={onClose} closeLabel={spireGameText(lang, 'close')} material="liquid-glass-opaque" testID="spire-rules-sheet">
      {({ requestDismiss }) => (
        <View style={s.body}>
          <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{spireGameText(lang, 'rulesTitle')}</Text>
          <ScrollView style={[s.list, { maxHeight: listMaxHeight }]} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false} decelerationRate="fast">
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
          <V2Pressable onPress={requestDismiss} accessibilityRole="button" style={[s.cta, { backgroundColor: p.cta }, sh.action(p.cta)]} testID="spire-rules-close">
            <Text style={[s.ctaText, { color: p.ctaText }]}>{spireGameText(lang, 'close')}</Text>
          </V2Pressable>
        </View>
      )}
    </HybridSheetShell>
  );
}

const s = StyleSheet.create({
  body: { paddingTop: 8 },
  // зачем (реестр community-004, разбор размеров 13.10; образец community.html `leagueRules`): заголовок 19/24, список с отступом 10, строки с padding 10 сверху и снизу,
  // кружок 32 с цифрой 15, зазор кружок→текст 14, «Закрыть» высотой 48 с отступом 14 — dp = css px макета, масштаб кадра 411/390 не учитывается
  title: { fontSize: 19, lineHeight: 24, fontWeight: '700' },
  list: { marginTop: 10, maxHeight: 440 },
  listContent: { paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 10 },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 16, fontWeight: '700' }, // зачем (Темы 13.10, сторож шкалы 16/13): цифра в кружке 32 — 16 вместо 15 макета; разницу в 1 px покажет склейка Сверки
  line: { flex: 1, fontSize: 16, lineHeight: 22 },
  cta: { marginTop: 14, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
});

export default memo(SpireRulesSheet);
