// зачем (слово владельца через координатора 05.11, «Наборы» rev8, часть 1): сегмент «Топ / Новые» из макета community-scene-v3 —
// дорожка в тоне текста 6 %, скользящая «шайба» цвета главной кнопки темы. Отдельный компонент: Темы встраивают его во flashcards_packs сами.
// Выбор меняется на onPress мгновенно (родитель держит value), шайба только догоняет на нативном драйвере; без цветов вне токенов темы.
import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import { communitySortLabel } from '../../app/community_packs/communityCatalogFilter';
import { useTheme } from '../ThemeContext';

export type TopNewValue = 'top' | 'new';

export type TopNewSwitchProps = Readonly<{
  value: TopNewValue;
  onChange: (next: TopNewValue) => void;
  lang: Lang;
  testID?: string;
}>;

const PAD = 2;
const HEIGHT = 36;
const RADIUS = 18;

/** «Топ» на 9 языках: короткая подпись из макета (не «Популярные»). */
export function topNewLabel(lang: Lang, key: TopNewValue): string {
  if (key === 'new') return communitySortLabel('new', lang);
  return triLang(lang, {
    ru: 'Топ', uk: 'Топ', en: 'Top', es: 'Top', 'pt-BR': 'Top', vi: 'Top', id: 'Teratas', tr: 'Popüler', pl: 'Top',
  });
}

const KEYS: readonly TopNewValue[] = ['top', 'new'];

function TopNewSwitchImpl({ value, onChange, lang, testID = 'top-new-switch' }: TopNewSwitchProps): React.JSX.Element {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const index = value === 'new' ? 1 : 0;
  const anim = useRef(new Animated.Value(index)).current;
  const [width, setWidth] = useState(0);
  const segW = width > 0 ? (width - PAD * 2) / KEYS.length : 0;

  useEffect(() => {
    if (reduceMotion) { anim.setValue(index); return; }
    // зачем: пружина без отскока, как V2SegmentedControl и макет (.26 s ease-out)
    Animated.spring(anim, { toValue: index, stiffness: 420, damping: 36, mass: 0.9, useNativeDriver: true }).start();
  }, [anim, index, reduceMotion]);

  const onLayout = (e: LayoutChangeEvent): void => setWidth(e.nativeEvent.layout.width);

  return (
    <View testID={testID} accessibilityRole="tablist" onLayout={onLayout} style={s.track}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.trackFill, { backgroundColor: g.text }]} />
      {segW > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[s.puck, { width: segW, backgroundColor: g.cta, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, segW] }) }] }]}
        />
      ) : null}
      {KEYS.map((key) => {
        const selected = key === value;
        const label = topNewLabel(lang, key);
        return (
          <Pressable
            key={key}
            testID={`${testID}-${key}`}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPressIn={() => { if (!selected) hapticTap(); }}
            onPress={() => { if (!selected) onChange(key); }}
            style={s.segment}
          >
            <Text style={[s.label, { color: selected ? g.ctaInk : g.secondary }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const TopNewSwitch = memo(TopNewSwitchImpl);

const s = StyleSheet.create({
  track: { flexDirection: 'row', padding: PAD, minHeight: HEIGHT + PAD * 2, borderRadius: RADIUS + PAD, minWidth: 148 },
  trackFill: { borderRadius: RADIUS + PAD, opacity: 0.06 },
  puck: { position: 'absolute', top: PAD, left: PAD, bottom: PAD, borderRadius: RADIUS },
  segment: { flex: 1, minHeight: HEIGHT, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
});
