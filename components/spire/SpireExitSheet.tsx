// ═══════════════════════════════════════════════════════════════════════════
// SpireExitSheet.tsx — «Выйти из ступени?» (макет §6, шторка на стекле).
//
// зачем (владелец T18): «назад» посреди ступени — это провал, поэтому без
// подтверждения не выходим. Главная кнопка — «Продолжить ступень» (безопасный
// путь), «Выйти» — тихая, цветом «неверно». Пока шторка открыта, таймер стоит.
// Каркас — общая HybridSheetShell с непрозрачным стеклом (liquid-glass-opaque).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import { spireGameText } from './spire_game_strings';

type Props = Readonly<{ lang: Lang; visible: boolean; floor: number; onContinue: () => void; onExit: () => void }>;

function SpireExitSheet({ lang, visible, floor, onContinue, onExit }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  return (
    <HybridSheetShell
      visible={visible}
      onClose={onContinue}
      closeLabel={spireGameText(lang, 'continueStep')}
      material="liquid-glass-opaque"
      testID="spire-exit-sheet"
    >
      <View style={s.body}>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{spireGameText(lang, 'exitTitle')}</Text>
        <Text style={[s.text, { color: p.textSecondary }]}>{spireGameText(lang, 'exitText', { n: floor })}</Text>
        <V2Pressable onPress={onContinue} accessibilityRole="button" style={[s.cta, { backgroundColor: p.cta }, sh.action(p.cta)]} testID="spire-exit-continue">
          <Text style={[s.ctaText, { color: p.ctaText }]}>{spireGameText(lang, 'continueStep')}</Text>
        </V2Pressable>
        <V2Pressable onPress={onExit} accessibilityRole="button" style={s.ghost} testID="spire-exit-confirm">
          <Text style={[s.ctaText, { color: p.wrong }]}>{spireGameText(lang, 'exit')}</Text>
        </V2Pressable>
      </View>
    </HybridSheetShell>
  );
}

const s = StyleSheet.create({
  body: { paddingTop: 12, paddingBottom: 8, alignItems: 'stretch' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  text: { fontSize: 16, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  cta: { marginTop: 26, minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ghost: { marginTop: 12, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
});

export default memo(SpireExitSheet);
