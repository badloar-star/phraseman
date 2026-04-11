import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { Ionicons } from '@expo/vector-icons';
import { LessonIntroScreen } from './lesson_data_all';

const { width } = Dimensions.get('window');

interface LessonIntroScreensProps {
  introScreens: LessonIntroScreen[];
  lessonId: number;
  onComplete: () => void;
}

export default function LessonIntroScreens({
  introScreens,
  lessonId,
  onComplete,
}: LessonIntroScreensProps) {
  const { theme: t } = useTheme();
  const { lang } = useLang();

  const [visibleCount, setVisibleCount] = useState(1);

  const fadeAnims = useRef<Animated.Value[]>(
    introScreens.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))
  ).current;

  const getBlockText = (index: number) => {
    if (!introScreens[index]) return '';
    return lang === 'uk' ? introScreens[index].textUK : introScreens[index].textRU;
  };

  const handleTap = () => {
    if (visibleCount < introScreens.length) {
      const next = visibleCount;
      Animated.timing(fadeAnims[next], {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
      setVisibleCount(visibleCount + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const isLast = visibleCount >= introScreens.length;

  return (
    <View style={[styles.container, { backgroundColor: t.bgPrimary }]}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Ionicons name="close" size={24} color={t.textSecond} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleTap}
        style={styles.tapArea}
      >
        {introScreens.map((_, index) => (
          <Animated.View
            key={index}
            style={[styles.textContainer, { opacity: fadeAnims[index], marginTop: index > 0 ? 20 : 0 }]}
          >
            <Text style={[styles.screenText, { color: t.textPrimary }]}>
              {getBlockText(index)}
            </Text>
          </Animated.View>
        ))}

        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: t.textMuted }]}>
            {visibleCount} / {introScreens.length}
          </Text>
        </View>

        <Text style={[styles.tapHint, { color: t.textGhost }]}>
          {isLast
            ? (lang === 'uk' ? 'Торкніться, щоб почати' : 'Нажмите для начала')
            : (lang === 'uk' ? 'Торкніться, щоб продовжити' : 'Нажмите для продолжения')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 8,
    zIndex: 100,
  },
  tapArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  screenText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: width - 48,
  },
  progressContainer: {
    marginTop: 60,
    marginBottom: 40,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 12,
    marginTop: 20,
  },
});
