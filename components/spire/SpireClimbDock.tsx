// ═══════════════════════════════════════════════════════════════════════════
// SpireClimbDock.tsx — нижняя кнопка «Подняться» и её состояния (макет §2, §10).
//
// зачем: «Нет энергии» — без блокирующей модалки (макет §10): кнопка честно
// неактивна и показывает «Энергия через 6:40» (живой отсчёт энергии приложения),
// под ней мягкое «Поднимайся без ожидания с Plus ›» → пейвол. Если пакет недели не
// скачался / ещё не собран — строка причины над кнопкой, без красных ошибок.
// Двойной тап защищён выше (useSpireGame: один старт за раз) и здесь (busy).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { Lang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import type { SpireStartBlock } from '../../app/spire/use_spire_game';
import { useEnergy, useEnergyCountdown } from '../EnergyContext';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import { spireText } from './spire_strings';
import { spireGameText } from './spire_game_strings';
import { logSpireLayout, roundLayout } from './spire_layout_log';

type Props = Readonly<{
  lang: Lang;
  /** Игра доступна (ворота открыты, комната и шпиль известны). */
  ready: boolean;
  busy: boolean;
  premium: boolean;
  block: SpireStartBlock;
  onClimb: () => void;
}>;

function SpireClimbDock({ lang, ready, busy, premium, block, onClimb }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const router = useRouter();
  const { energy, bonusEnergy, isUnlimited, energyReady } = useEnergy();
  const noEnergy = !premium && !isUnlimited && energyReady && energy + bonusEnergy < 1;
  const { formattedTime } = useEnergyCountdown({ visible: noEnergy });
  const openPlus = useCallback(() => {
    router.push({ pathname: '/premium_modal', params: { context: 'no_energy', source: 'spire_no_energy' } } as never);
  }, [router]);

  if (noEnergy) {
    return (
      <View testID="spire-dock-no-energy">
        <View
          style={[s.cta, { backgroundColor: p.control }, sh.nested]}
          accessible
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={spireGameText(lang, 'energyIn', { t: formattedTime || '—' })}
        >
          <Ionicons name="flash" size={18} color={p.textSecondary} />
          <Text style={[s.ctaText, { color: p.textSecondary }]}>{spireGameText(lang, 'energyIn', { t: formattedTime || '—' })}</Text>
        </View>
        <V2Pressable onPress={openPlus} accessibilityRole="link" style={s.plus} testID="spire-dock-plus">
          <Text style={[s.plusText, { color: p.textSecondary }]}>
            {`${spireGameText(lang, 'climbNoWait')} `}<Text style={{ color: p.text }}>{spireGameText(lang, 'withPlus')}</Text>
          </Text>
          <Ionicons name="chevron-forward" size={16} color={p.textSecondary} />
        </V2Pressable>
      </View>
    );
  }

  const enabled = ready && !busy;
  const note = block === 'pack_offline' ? spireGameText(lang, 'packOffline')
    : block === 'pack_missing' ? spireGameText(lang, 'packMissing')
      : block === 'no_identity' ? spireGameText(lang, 'noIdentity')
        : block === 'no_tier' ? spireGameText(lang, 'noTier') : null;
  return (
    <View testID="spire-dock" onLayout={(e) => logSpireLayout('dock', { block: block ?? 'none', h: roundLayout(e.nativeEvent.layout.height), w: roundLayout(e.nativeEvent.layout.width) })}>
      {note ? (
        <Text
          style={[s.note, { color: p.textSecondary }]}
          accessibilityLiveRegion="polite"
          onLayout={(e) => logSpireLayout('dock.note', { block: block ?? 'none', y: roundLayout(e.nativeEvent.layout.y), h: roundLayout(e.nativeEvent.layout.height), marginBottom: 10 })}
        >{note}</Text>
      ) : null}
      <V2Pressable
        onPress={onClimb}
        disabled={!enabled}
        accessibilityLabel={note ? `${spireText(lang, 'climb')}. ${note}` : spireText(lang, 'climb')}
        accessibilityState={{ disabled: !enabled, busy }}
        style={[s.cta, { backgroundColor: p.cta, opacity: enabled ? 1 : 0.4 }, enabled ? sh.action(p.cta) : null]}
        testID="spire-climb"
        onLayout={(e) => logSpireLayout('dock.cta', { y: roundLayout(e.nativeEvent.layout.y), h: roundLayout(e.nativeEvent.layout.height) })}
      >
        <Text style={[s.ctaText, { color: p.ctaText }]}>{note ? spireGameText(lang, 'retry') : spireText(lang, 'climb')}</Text>
        <Ionicons name="arrow-forward" size={20} color={p.ctaText} />
      </V2Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  cta: { minHeight: V2.cta.height, borderRadius: V2.cta.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 16, fontWeight: '700' },
  plus: { minHeight: 44, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  plusText: { fontSize: 16, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 10 },
});

export default memo(SpireClimbDock);
