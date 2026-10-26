// ═══════════════════════════════════════════════════════════════════════════
// PackContestRulesV3.tsx — «Условия участия» в «Наборе месяца» на «Сцене»: три правила и три приза, одна кнопка «Понятно».
//
// зачем (слово владельца через координатора 26.10: «Условия участия конкурса»; решения владельца: «голос = лайк, участвуют все новые наборы месяца, призы — Plus и монеты»;
// «минимум кнопок, без мелких подписей»): правила — три строки значок + одна фраза (16), призы — три блока пьедестала 1-2-3 в языке Пика (белое стекло, первый ярче).
// Размеры призов НЕ выдуманы: первое место — «Plus и монеты», второе и третье — «Монеты»; числа решает владелец. Итоговая дата — «последний день месяца», без числа дней.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { SPIRE_SCENE_BLOCK, SPIRE_SCENE_INK } from '../../spire/scene/spire_scene_palette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import PackSceneFrameV3 from './PackSceneFrameV3';
import { packScreensText, type PackScreensTextKey } from './packs_catalog_v3_screens_copy';
import type { PacksCatalogColors } from './packs_catalog_v3_tokens';

const TEXT_MAX_SCALE = 1.3;

type Props = Readonly<{
  lang: Lang;
  colors: PacksCatalogColors;
  topInset: number;
  bottomInset: number;
  onBack: () => void;
  onDone: () => void;
}>;

const RULES: readonly Readonly<{ icon: 'layers-outline' | 'heart' | 'calendar-outline'; key: PackScreensTextKey }>[] = [
  { icon: 'layers-outline', key: 'rule1' },
  { icon: 'heart', key: 'rule2' },
  { icon: 'calendar-outline', key: 'rule3' },
];
const PRIZES: readonly Readonly<{ place: 1 | 2 | 3; icon: 'trophy' | 'ribbon-outline'; key: PackScreensTextKey; height: number }>[] = [
  { place: 2, icon: 'ribbon-outline', key: 'prizeOther', height: 112 },
  { place: 1, icon: 'trophy', key: 'prizeFirst', height: 136 },
  { place: 3, icon: 'ribbon-outline', key: 'prizeOther', height: 96 },
];
const GLASS = colorWithAlpha(SPIRE_SCENE_INK.text, 0.12);

function PackContestRulesV3({ lang, colors, topInset, bottomInset, onBack, onDone }: Props) {
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  return (
    <PackSceneFrameV3
      testID="packs-v3-rules"
      colors={colors}
      topInset={topInset}
      bottomInset={bottomInset}
      onBack={onBack}
      backLabel={packScreensText(lang, 'back')}
      cta={{ label: packScreensText(lang, 'gotIt'), onPress: onDone, icon: 'checkmark' }}
    >
      <Text style={ts.title} maxFontSizeMultiplier={TEXT_MAX_SCALE} accessibilityRole="header">{packScreensText(lang, 'rulesTitle')}</Text>
      <View style={s.rules}>
        {RULES.map((rule) => (
          <View key={rule.key} style={s.rule} testID={`packs-v3-rules-${rule.key}`}>
            <View style={s.ruleIcon}><Ionicons name={rule.icon} size={22} color={SPIRE_SCENE_INK.text} /></View>
            <Text style={[ts.ruleText, s.grow]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{packScreensText(lang, rule.key)}</Text>
          </View>
        ))}
      </View>
      <Text style={ts.prizesTitle} maxFontSizeMultiplier={TEXT_MAX_SCALE} accessibilityRole="header">{packScreensText(lang, 'prizes')}</Text>
      <View style={s.prizes}>
        {PRIZES.map((prize) => (
          <View key={prize.place} style={s.prizeCol} testID={`packs-v3-rules-prize-${prize.place}`}>
            <View style={[s.prizeBlock, { height: prize.height }]}>
              <LinearGradient colors={[...(prize.place === 1 ? SPIRE_SCENE_BLOCK.first : SPIRE_SCENE_BLOCK.regular)]} locations={[...SPIRE_SCENE_BLOCK.locations]} style={StyleSheet.absoluteFill} />
              <Text style={ts.place} maxFontSizeMultiplier={1}>{prize.place}</Text>
              <Ionicons name={prize.icon} size={26} color={SPIRE_SCENE_INK.text} />
              <Text style={ts.prizeText} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{packScreensText(lang, prize.key)}</Text>
            </View>
          </View>
        ))}
      </View>
    </PackSceneFrameV3>
  );
}

export default memo(PackContestRulesV3);

const s = StyleSheet.create({
  title: { marginTop: 16, fontSize: 26, lineHeight: 32, fontWeight: '800', color: SPIRE_SCENE_INK.text, letterSpacing: -0.3 },
  rules: { marginTop: 16, gap: 8 },
  rule: { minHeight: 64, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: GLASS },
  ruleIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: GLASS },
  grow: { flex: 1 },
  ruleText: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  prizesTitle: { marginTop: 28, fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  prizes: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  prizeCol: { flex: 1 },
  prizeBlock: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10, paddingHorizontal: 6, gap: 6 },
  place: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: SPIRE_SCENE_INK.text },
  prizeText: { fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center', color: SPIRE_SCENE_INK.text },
});
