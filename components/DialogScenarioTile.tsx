/**
 * DialogScenarioTile — «карточка-сцена» каталога Диалогов.
 *
 * зачем: фулл-редизайн Диалогов (владелец, 2026-08-23) — сценарий подаётся не
 * строкой списка, а кинематографичной сценой: тинт-градиент «света места»
 * поверх токена bgCard, медальон-иконка, чип уровня и статус. Два формата:
 *  - 'shelf' — вертикальная карточка для горизонтальных полок групп курса;
 *  - 'row'   — широкий баннер для мира «Ситуации».
 * Геометрия карточек фиксированная (first frame = final geometry): высота не
 * зависит от длины заголовка — заголовок живёт в зарезервированных 2 строках.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { Text, View } from 'react-native';

import type { DialogSceneTheme } from '../constants/dialogSceneThemes';
import { noAndroidOutline } from '../constants/androidGlow';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { PressableScale } from './feedback/PressableScale';

type ScenarioStatus = 'done' | 'available' | 'locked';

interface DialogScenarioTileProps {
  index: number;
  icon: string;
  title: string;
  levelChip: string;
  status: ScenarioStatus;
  statusLabel: string;
  lockedText: string;
  /** Световая палитра сцены (категория/challenge). */
  scene: DialogSceneTheme;
  /** 'shelf' — карточка полки (вертикальная), 'row' — широкий баннер. */
  layout?: 'shelf' | 'row';
  onPress: () => void;
  onLongPress: () => void;
  colors: {
    accent: string;
    accentBg: string;
    bgCard: string;
    bgSurface: string;
    textPrimary: string;
    textMuted: string;
    correctText: string;
  };
  fontSizes: { body: number; label: number };
  accessibilityLabel: string;
  accessibilityHint: string;
}

const SHELF_WIDTH = 168;
const SHELF_HEIGHT = 172;
const ROW_HEIGHT = 96;

export default function DialogScenarioTile({
  index,
  icon,
  title,
  levelChip,
  status,
  statusLabel,
  lockedText: _lockedText,
  scene,
  layout = 'shelf',
  onPress,
  onLongPress,
  colors,
  fontSizes,
  accessibilityLabel,
  accessibilityHint,
}: DialogScenarioTileProps) {
  const reduceMotion = useReduceMotion();
  const locked = status === 'locked';
  const done = status === 'done';
  const entering = reduceMotion ? undefined : FadeInDown.delay(Math.min(index, 10) * 40).duration(220);
  // Свет сцены: у закрытых сцен свет «выключен» — карточка живёт тоном темы.
  const glyphColor = locked ? colors.textMuted : scene.hue;
  const titleLineHeight = Math.round(fontSizes.body * 1.3);

  if (layout === 'row') {
    return (
      <Reanimated.View entering={entering}>
        <PressableScale
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          delayLongPress={550}
          onLongPress={onLongPress}
          onPress={onPress}
          variant="flat"
          style={{
            height: ROW_HEIGHT,
            marginTop: index === 0 ? 0 : 10,
            marginHorizontal: 20,
            borderRadius: 22,
            backgroundColor: colors.bgCard,
            overflow: 'hidden',
            shadowColor: scene.hueDeep,
            shadowOpacity: locked ? 0 : 0.22,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            ...noAndroidOutline,
          }}
        >
          {!locked && (
            <LinearGradient
              pointerEvents="none"
              colors={[scene.hue + '2E', scene.hueDeep + '10', 'transparent']}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          )}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 13 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                backgroundColor: locked ? colors.bgSurface : scene.hue + '26',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={(locked ? 'lock-closed' : icon) as never} size={24} color={glyphColor} />
            </View>
            <View style={{ flex: 1, minWidth: 0, opacity: locked ? 0.62 : 1 }}>
              <Text
                style={{ color: colors.textPrimary, fontSize: fontSizes.body, fontWeight: '700', lineHeight: titleLineHeight }}
                numberOfLines={2}
                maxFontSizeMultiplier={1.2}
              >
                {title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 }}>
                <View
                  style={{
                    backgroundColor: locked ? colors.bgSurface : scene.hue + '22',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: glyphColor, fontSize: fontSizes.label, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                    {levelChip}
                  </Text>
                </View>
                <Text
                  style={{ color: locked ? colors.textMuted : glyphColor, fontSize: fontSizes.label, fontWeight: '400', flexShrink: 1 }}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {statusLabel}
                </Text>
              </View>
            </View>
            {done ? (
              <Ionicons name="checkmark-circle" size={20} color={scene.hue} />
            ) : locked ? null : (
              <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
            )}
          </View>
        </PressableScale>
      </Reanimated.View>
    );
  }

  return (
    <Reanimated.View entering={entering}>
      <PressableScale
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        delayLongPress={550}
        onLongPress={onLongPress}
        onPress={onPress}
        variant="flat"
        style={{
          width: SHELF_WIDTH,
          height: SHELF_HEIGHT,
          marginLeft: index === 0 ? 20 : 10,
          borderRadius: 22,
          backgroundColor: colors.bgCard,
          overflow: 'hidden',
          shadowColor: scene.hueDeep,
          shadowOpacity: locked ? 0 : 0.22,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          ...noAndroidOutline,
        }}
      >
        {!locked && (
          <LinearGradient
            pointerEvents="none"
            colors={[scene.hue + '30', scene.hueDeep + '12', 'transparent']}
            locations={[0, 0.5, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        )}
        <View style={{ flex: 1, padding: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                backgroundColor: locked ? colors.bgSurface : scene.hue + '26',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={(locked ? 'lock-closed' : icon) as never} size={22} color={glyphColor} />
            </View>
            {done && <Ionicons name="checkmark-circle" size={20} color={scene.hue} />}
          </View>
          {/* Заголовок в зарезервированных 2 строках — высота карточки не пляшет. */}
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: fontSizes.body,
              fontWeight: '700',
              lineHeight: titleLineHeight,
              height: titleLineHeight * 2,
              marginTop: 10,
              opacity: locked ? 0.62 : 1,
            }}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
          >
            {title}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View
              style={{
                backgroundColor: locked ? colors.bgSurface : scene.hue + '22',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: glyphColor, fontSize: fontSizes.label, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                {levelChip}
              </Text>
            </View>
            <Text
              style={{ color: locked ? colors.textMuted : glyphColor, fontSize: fontSizes.label, fontWeight: '400', flexShrink: 1 }}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {statusLabel}
            </Text>
          </View>
        </View>
      </PressableScale>
    </Reanimated.View>
  );
}
