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

  // Track which text blocks are visible (0, 1, 2)
  const [blockIndex, setBlockIndex] = useState(0);

  // Three separate animations for each text block
  const fadeAnimBlock0 = useRef(new Animated.Value(1)).current; // First block always visible
  const fadeAnimBlock1 = useRef(new Animated.Value(0)).current;
  const fadeAnimBlock2 = useRef(new Animated.Value(0)).current;

  const blockAnims = [fadeAnimBlock0, fadeAnimBlock1, fadeAnimBlock2];

  // Get text for each block
  const getBlockText = (index: number) => {
    if (!introScreens[index]) return '';
    return lang === 'uk' ? introScreens[index].textUK : introScreens[index].textRU;
  };

  // Handle tap: advance to next block or complete
  const handleTap = () => {
    if (blockIndex < 2) {
      // Advance to next block
      setBlockIndex(blockIndex + 1);
    } else {
      // All 3 blocks shown, complete intro
      onComplete();
    }
  };

  // Handle Skip: dismiss immediately
  const handleSkip = () => {
    onComplete();
  };

  // Animate blocks appearing sequentially with 3-second pauses
  useEffect(() => {
    if (blockIndex === 0) {
      // First block already visible, set up timer for second block
      const timer = setTimeout(() => {
        Animated.timing(fadeAnimBlock1, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 3000);
      return () => clearTimeout(timer);
    } else if (blockIndex === 1) {
      // Second block now visible, set up timer for third block
      const timer = setTimeout(() => {
        Animated.timing(fadeAnimBlock2, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 3000);
      return () => clearTimeout(timer);
    }
    // If blockIndex === 2, all blocks visible (no action needed)
  }, [blockIndex, fadeAnimBlock1, fadeAnimBlock2]);

  return (
    <View style={[styles.container, { backgroundColor: t.bgPrimary }]}>
      {/* Skip button in top right */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Ionicons name="close" size={24} color={t.textSecond} />
      </TouchableOpacity>

      {/* Main content area - tap to advance through blocks */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleTap}
        style={styles.tapArea}
      >
        {/* Text Block 1 */}
        <Animated.View style={[styles.textContainer, { opacity: fadeAnimBlock0 }]}>
          <Text style={[styles.screenText, { color: t.textPrimary }]}>
            {getBlockText(0)}
          </Text>
        </Animated.View>

        {/* Text Block 2 */}
        <Animated.View style={[styles.textContainer, { opacity: fadeAnimBlock1, marginTop: 20 }]}>
          <Text style={[styles.screenText, { color: t.textPrimary }]}>
            {getBlockText(1)}
          </Text>
        </Animated.View>

        {/* Text Block 3 */}
        <Animated.View style={[styles.textContainer, { opacity: fadeAnimBlock2, marginTop: 20 }]}>
          <Text style={[styles.screenText, { color: t.textPrimary }]}>
            {getBlockText(2)}
          </Text>
        </Animated.View>

        {/* Progress indicator - show which block is currently visible */}
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: t.textMuted }]}>
            {blockIndex + 1} / 3
          </Text>
        </View>

        {/* Tap hint */}
        <Text style={[styles.tapHint, { color: t.textGhost }]}>
          {blockIndex < 2
            ? (lang === 'uk' ? 'Торкніться для продовження' : 'Нажмите для продолжения')
            : (lang === 'uk' ? 'Торкніться для старту' : 'Нажмите для начала')}
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
