import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { addFlashcard, removeFlashcard, isFlashcardSaved, loadFlashcards, Flashcard } from '../hooks/use-flashcards';

interface Props {
  en: string;
  ru: string;
  uk: string;
  source: Flashcard['source'];
  sourceId?: string;
  size?: number;
}

export default function AddToFlashcard({ en, ru, uk, source, sourceId, size = 20 }: Props) {
  const { theme: t } = useTheme();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Scale pop animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const popAnimation = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.45, useNativeDriver: true, friction: 4, tension: 200 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, friction: 6, tension: 180 }),
    ]).start();
  };

  // Check saved state on mount and whenever `en` prop changes
  useEffect(() => {
    let cancelled = false;
    isFlashcardSaved(en).then(result => {
      if (!cancelled) setSaved(result);
    });
    return () => { cancelled = true; };
  }, [en]);

  const handlePress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (saved) {
        // Find the id and remove
        const cards = await loadFlashcards();
        const normalizedEn = en.trim().toLowerCase();
        const card = cards.find(c => c.en.trim().toLowerCase() === normalizedEn);
        if (card) await removeFlashcard(card.id);
        setSaved(false);
        popAnimation();
      } else {
        const added = await addFlashcard({ en, ru, uk, source, sourceId });
        if (added) {
          setSaved(true);
          popAnimation();
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const iconName = saved ? 'bookmark' : 'bookmark-outline';
  const iconColor = saved ? t.accent : t.textMuted;

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
      style={styles.root}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from flashcards' : 'Add to flashcards'}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons name={iconName as any} size={size} color={iconColor} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
});
