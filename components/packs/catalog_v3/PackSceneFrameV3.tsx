// ═══════════════════════════════════════════════════════════════════════════
// PackSceneFrameV3.tsx — общая рамка экранов «Наборов» на «Сцене»: фон сцены темы, кнопка «назад», прокручиваемое тело и ОДНА закреплённая кнопка внизу.
//
// зачем (слово владельца через координатора 26.10: «один макет со всеми экранами; тот же стиль Сцены, минимум кнопок, без мелких подписей; компоненты и кегли приложения»):
// экран набора, подача набора, «Условия участия» и праздничное окно собираются на одной рамке — фон тот же, что у каталога (SpireSceneBackdrop из токенов темы),
// главное действие закреплено внизу, как «Играть» у Пика и «Создать набор» в каталоге. Без обводок: кнопка «назад» — белое стекло.
// Рамка не знает ни про сеть, ни про навигацию приложения — только про вид (dev-фотостудия макета).
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useScaledTextStyles } from '../../../hooks/useLineScale';
import SpireSceneBackdrop from '../../spire/scene/spire_scene_backdrop';
import { SPIRE_SCENE_INK } from '../../spire/scene/spire_scene_palette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import V2Pressable from '../../v2/V2Pressable';
import type { PacksCatalogColors } from './packs_catalog_v3_tokens';

const TEXT_MAX_SCALE = 1.3;
export const PACK_FRAME_SIDE = 16;
const BUTTON_H = 56;
const FADE_H = 132;
const BACK = 44;

export type PackFrameCta = Readonly<{ label: string; onPress: () => void; disabled?: boolean; icon?: 'add' | 'checkmark' | 'trophy' | 'sparkles' }>;

type Props = Readonly<{
  colors: PacksCatalogColors;
  topInset: number;
  bottomInset: number;
  /** Кнопка «назад» слева сверху; null — без неё (праздничное окно). */
  onBack: (() => void) | null;
  /** Голосовая подпись кнопки «назад». */
  backLabel: string;
  /** Правый верх рядом с «назад» (например, язык набора). */
  trailing?: ReactNode;
  /** Закреплённая кнопка внизу; null — экран без неё (главное действие лежит в самом блоке, как на экране набора). */
  cta: PackFrameCta | null;
  testID: string;
  children: ReactNode;
}>;

const GLASS = colorWithAlpha(SPIRE_SCENE_INK.text, 0.14);

function PackSceneFrameV3({ colors, topInset, bottomInset, onBack, backLabel, trailing, cta, testID, children }: Props) {
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  const { height: windowH } = useWindowDimensions();
  const backdrop = { top: colors.scene.sceneTop, bottom: colors.scene.sceneBottom, glow: colors.scene.sceneGlow, evening: false, bleed: 0, sceneH: windowH };
  return (
    <View testID={testID} style={s.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><SpireSceneBackdrop spec={backdrop} offsetTop={0} /></View>
      <ScrollView
        contentContainerStyle={{ paddingTop: topInset, paddingHorizontal: PACK_FRAME_SIDE, paddingBottom: bottomInset + (cta ? BUTTON_H + 48 : 24) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topRow}>
          {onBack ? (
            <V2Pressable testID={`${testID}-back`} accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} scaleTo={0.94} style={s.back}>
              <Ionicons name="chevron-back" size={22} color={SPIRE_SCENE_INK.text} />
            </V2Pressable>
          ) : <View style={s.backGap} />}
          <View style={s.trailing}>{trailing}</View>
        </View>
        {children}
      </ScrollView>
      {cta ? (
        <>
          <View pointerEvents="none" style={[s.fade, { height: FADE_H + bottomInset }]}>
            <LinearGradient colors={[colors.fadeFrom, colors.scene.sceneBottom]} locations={[0, 0.75]} style={StyleSheet.absoluteFill} />
          </View>
          <View style={[s.dock, { paddingBottom: Math.max(bottomInset, 12) }]}>
            <V2Pressable
              testID={`${testID}-cta`}
              accessibilityRole="button"
              accessibilityLabel={cta.label}
              accessibilityState={{ disabled: !!cta.disabled }}
              disabled={cta.disabled}
              withHaptic={false}
              scaleTo={0.97}
              onPress={cta.onPress}
              style={[s.cta, { backgroundColor: colors.cta, opacity: cta.disabled ? 0.5 : 1 }]}
            >
              {cta.icon ? <Ionicons name={cta.icon} size={22} color={colors.ctaInk} /> : null}
              <Text style={[ts.ctaText, { color: colors.ctaInk }]} numberOfLines={2} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{cta.label}</Text>
            </V2Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

export default memo(PackSceneFrameV3);

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  topRow: { minHeight: BACK, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: BACK, height: BACK, borderRadius: BACK / 2, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  backGap: { width: BACK, height: BACK },
  trailing: { flexDirection: 'row', alignItems: 'center' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: PACK_FRAME_SIDE },
  cta: { minHeight: BUTTON_H, borderRadius: BUTTON_H / 2, paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
});
