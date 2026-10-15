// ═══════════════════════════════════════════════════════════════════════════
// SpireClimbDock.tsx — нижняя кнопка «Подняться» и её состояния (макет §2, §10).
//
// зачем: «Нет энергии» — без блокирующей модалки (макет §10): кнопка честно
// неактивна и показывает «Энергия через 6:40» (живой отсчёт энергии приложения),
// под ней мягкое «Поднимайся без ожидания с Plus ›» → пейвол. Если пакет недели не
// скачался / ещё не собран — строка причины над кнопкой, без красных ошибок.
// Двойной тап защищён выше (useSpireGame: один старт за раз) и здесь (busy).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useTheme } from '../ThemeContext';
import { V2 } from '../../constants/v2Style';
import type { SpireStartBlock } from '../../app/spire/use_spire_game';
import { useEnergy, useEnergyCountdown } from '../EnergyContext';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import { spireText } from './spire_strings';
import { spireGameText } from './spire_game_strings';
import { logSpireDock, logSpireLayout, roundLayout } from './spire_layout_log';
import SpireNoEnergySheet from './moments/SpireNoEnergySheet';

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
  // зачем (координатор 15.10, spire-gap-010; эталон kit.css `.cta.dis`: background var(--disabled), текст var(--disabled-ink)): неактивная кнопка — токены ОТКЛЮЧЁННОЙ заливки и подписи темы
  // (читаемая светлая серая, правило «кнопки не сливаются»), а не control + приглушённый текст, который на тёмном слипался с фоном
  const { liquidGlassThemeId } = useTheme();
  const off = useMemo(() => { const g = liquidGlassTokens(liquidGlassThemeId); return { fill: g.buttonFillDisabled, ink: g.buttonInkDisabled }; }, [liquidGlassThemeId]);
  const router = useRouter();
  const { energy, bonusEnergy, isUnlimited, energyReady } = useEnergy();
  const noEnergy = !premium && !isUnlimited && energyReady && energy + bonusEnergy < 1;
  const { formattedTime } = useEnergyCountdown({ visible: noEnergy });
  // зачем (координатор 15.10, m22 по эталону v3): «Поднимайся без ожидания с Plus ›» открывает шторку над доком, а не сразу пейвол.
  // «Попробовать Plus» в шторке ведёт в прежний пейвол с той же атрибуцией (no_energy / spire_no_energy) — путь покупки не тронут.
  const [noEnergySheet, setNoEnergySheet] = useState(false);
  const openPlus = useCallback(() => {
    console.log('[M22] dock: шторка открыта');
    setNoEnergySheet(true);
  }, []);
  const closeSheet = useCallback(() => {
    console.log('[M22] dock: шторка закрыта (подожду / фон / назад)');
    setNoEnergySheet(false);
  }, []);
  const sheetToPaywall = useCallback(() => {
    console.log('[M22] dock: шторка → пейвол no_energy');
    setNoEnergySheet(false);
    router.push({ pathname: '/premium_modal', params: { context: 'no_energy', source: 'spire_no_energy' } } as never);
  }, [router]);

  if (noEnergy) {
    return (
      <View testID="spire-dock-no-energy">
        <View
          style={[s.cta, { backgroundColor: off.fill }, sh.nested]}
          accessible
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={spireGameText(lang, 'energyIn', { t: formattedTime || '—' })}
        >
          <Ionicons name="flash" size={18} color={off.ink} />
          <Text style={[s.ctaText, { color: off.ink }]}>{spireGameText(lang, 'energyIn', { t: formattedTime || '—' })}</Text>
        </View>
        <V2Pressable onPress={openPlus} accessibilityRole="link" style={s.plus} testID="spire-dock-plus">
          <Text style={[s.plusText, { color: p.textSecondary }]}>
            {`${spireGameText(lang, 'climbNoWait')} `}<Text style={{ color: p.text }}>{spireGameText(lang, 'withPlus')}</Text>
          </Text>
          <Ionicons name="chevron-forward" size={16} color={p.textSecondary} />
        </V2Pressable>
        <SpireNoEnergySheet lang={lang} visible={noEnergySheet} onPlus={sheetToPaywall} onClose={closeSheet} />
      </View>
    );
  }

  const enabled = ready && !busy;
  // зачем (Макеты spire-gap-009, образец `.cta.dis` kit.css: заливка контрола, приглушённый текст): пока старт невозможен (нет комнаты/уровня) кнопка выглядит как неактивная,
  // а не светлая с прозрачностью. Идущий старт (busy) остаётся прежним — светлая кнопка с прозрачностью, Optimistic UI Шпиля не затронут.
  const dis = !ready && !busy;
  logSpireDock('button', { ready, busy, enabled, dis, block: block ?? 'none', source: 'props: ready=climbReady(HomeScreen), busy=game.starting' });
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
        style={dis
          ? [s.cta, { backgroundColor: off.fill }, sh.nested]
          : [s.cta, { backgroundColor: p.cta, opacity: enabled ? 1 : 0.4 }, enabled ? sh.action(p.cta) : null]}
        testID="spire-climb"
        onLayout={(e) => logSpireLayout('dock.cta', { y: roundLayout(e.nativeEvent.layout.y), h: roundLayout(e.nativeEvent.layout.height) })}
      >
        <Text style={[s.ctaText, { color: dis ? off.ink : p.ctaText }]}>{note ? spireGameText(lang, 'retry') : spireText(lang, 'climb')}</Text>
        {/* зачем (Сверка spire-013, kit.css `.cta .ar`): стрелка у правого края кнопки, текст остаётся по центру */}
        <View pointerEvents="none" style={s.arrow}><Ionicons name="arrow-forward" size={20} color={dis ? off.ink : p.ctaText} /></View>
      </V2Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  cta: { minHeight: V2.cta.height, borderRadius: V2.cta.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 16, fontWeight: '700' },
  arrow: { position: 'absolute', right: 22 },
  plus: { minHeight: 44, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  plusText: { fontSize: 16, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 10 },
});

export default memo(SpireClimbDock);
