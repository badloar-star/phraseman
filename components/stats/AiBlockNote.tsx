import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, {
  FadeIn,
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { compassIconSource } from '../../constants/weeklyCompassIcons';
import { useTheme } from '../ThemeContext';

/**
 * Маленькая плашка ИИ-заметки под карточкой статистики. Premium видит текст
 * (заметку пишет Компас по этому конкретному блоку), free — мягкую заглушку
 * «Открыть с Premium», которая ведёт на пейвол.
 *
 * Текст приходит из stats_insights_client (один CF-вызов на все блоки, кэш).
 * Компонент НЕ дёргает сеть — только показывает готовое.
 */
type AiBlockNoteProps = {
  /** Готовый текст заметки. Пусто/undefined → ничего не рендерим (premium). */
  note?: string;
  isPremium: boolean;
  /** Идёт ли первичная генерация (показать «Компас готовит подсказку…»). */
  loading?: boolean;
  accent: string;
  softBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  /** Подпись «Компас» / «Compass» на языке UI. */
  authorLabel: string;
  /** Тексты заглушки/загрузки на языке UI. */
  lockedLabel: string;
  loadingLabel: string;
  onUnlock?: () => void;
};

function CompassNoteIcon({ source }: { source: ImageSourcePropType }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [progress]);

  const compassStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${-7 + progress.value * 14}deg` },
      { scale: 1 + progress.value * 0.06 },
    ],
  }));

  return (
    <Reanimated.View style={compassStyle}>
      <Image source={source} style={styles.compassNoteIcon} contentFit="contain" />
    </Reanimated.View>
  );
}

export function AiBlockNote({
  note,
  isPremium,
  loading = false,
  accent,
  softBg,
  borderColor,
  textColor,
  mutedColor,
  authorLabel,
  lockedLabel,
  loadingLabel,
  onUnlock,
}: AiBlockNoteProps) {
  const { themeMode } = useTheme();
  const aiCompassIcon = compassIconSource(themeMode);

  // Free: мягкая заглушка-тизер, ведёт на пейвол.
  if (!isPremium) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onUnlock}
        accessibilityRole="button"
        accessibilityLabel={lockedLabel}
        style={[styles.wrap, { backgroundColor: softBg, borderColor }]}
      >
        <View style={[styles.avatar, { backgroundColor: accent + '24' }]}>
          <CompassNoteIcon source={aiCompassIcon} />
        </View>
        <Text style={[styles.lockedText, { color: mutedColor }]} numberOfLines={2}>
          {lockedLabel}
        </Text>
        <Ionicons name="lock-closed" size={13} color={mutedColor} />
      </TouchableOpacity>
    );
  }

  // Premium, генерация ещё идёт.
  if (loading && !note) {
    return (
      <View style={[styles.wrap, { backgroundColor: softBg, borderColor }]}>
        <View style={[styles.avatar, { backgroundColor: accent + '24' }]}>
          <CompassNoteIcon source={aiCompassIcon} />
        </View>
        <Text style={[styles.loadingText, { color: mutedColor }]} numberOfLines={1}>
          {loadingLabel}
        </Text>
      </View>
    );
  }

  // Premium, текста нет (не сгенерилось / мало данных) → ничего не показываем.
  if (!note) return null;

  return (
    <Reanimated.View entering={FadeIn.duration(260)} style={[styles.wrap, { backgroundColor: softBg, borderColor }]}>
      <View style={[styles.avatar, { backgroundColor: accent + '24' }]}>
        <CompassNoteIcon source={aiCompassIcon} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.author, { color: accent }]}>{authorLabel}</Text>
        <Text style={[styles.note, { color: textColor }]}>{note}</Text>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  avatar: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  compassNoteIcon: { height: 24, width: 24 },
  author: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  note: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  lockedText: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: '700', lineHeight: 17 },
  loadingText: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: '700', fontStyle: 'italic' },
});

export default AiBlockNote;
