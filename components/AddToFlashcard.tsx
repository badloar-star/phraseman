import React, { memo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  Pressable,
  View,
  Animated,
  Easing,
  StyleSheet,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useStudyTarget } from './StudyTargetContext';
import { updateMultipleTaskProgress } from '../app/daily_tasks';
import { checkAchievements } from '../app/achievements';
import { logFlashcardAdded } from '../app/firebase';
import { getTranscription } from '../app/transcription';
import {
  addFlashcard,
  isEnSavedInCacheSync,
  isFlashcardSaved,
  removeFlashcardByEnglish,
  Flashcard,
} from '../hooks/use-flashcards';
import { bumpStatsDaily } from '../app/stats_daily_breakdown';
import { setDailyPhraseSavedOnServerForTarget } from '../app/daily_phrase_system';
import type { RuntimeStudyTarget } from '../app/target_storage_keys';

interface Props {
  en: string;
  ru: string;
  uk: string;
  es?: string;
  sourceLocales?: Flashcard['sourceLocales'];
  source: Flashcard['source'];
  sourceId?: string;
  size?: number;
  // Optional rich detail fields forwarded to the saved flashcard
  literalRu?: string;
  literalUk?: string;
  literalEs?: string;
  explanationRu?: string;
  explanationUk?: string;
  explanationEs?: string;
  exampleEn?: string;
  exampleRu?: string;
  exampleUk?: string;
  exampleEs?: string;
  usageNoteRu?: string;
  usageNoteUk?: string;
  usageNoteEs?: string;
  register?: string;
  level?: string;
  studyTarget?: RuntimeStudyTarget;
}

function AddToFlashcard({
  en, ru, uk, es, sourceLocales, source, sourceId, size = 20,
  literalRu, literalUk, literalEs,
  explanationRu, explanationUk, explanationEs,
  exampleEn, exampleRu, exampleUk, exampleEs,
  usageNoteRu, usageNoteUk, usageNoteEs,
  register, level, studyTarget,
}: Props) {
  const { theme: t } = useTheme();
  const { studyTarget: contextStudyTarget } = useStudyTarget();
  const activeStudyTarget = studyTarget ?? contextStudyTarget;
  const router = useRouter();
  const [saved, setSaved] = useState(() => isEnSavedInCacheSync(en, activeStudyTarget));
  const inFlightRef = useRef(false);
  /** Stale isFlashcardSaved from useEffect can resolve after a save and overwrite the icon with a false. */
  const blockStaleStorageHydrationRef = useRef(false);
  const enRef = useRef(en);
  enRef.current = en;

  // Own Animated.Value per mount; on list recycle `en` changes — stop mid-flight scale so it does not "carry" to the next cell.
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useLayoutEffect(() => {
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
  }, [en, scaleAnim]);

  const popAnimation = () => {
    scaleAnim.setValue(1);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.12,
        duration: 50,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start();
  };

  // Sync with storage: cache hit is instant; first cold load is single AsyncStorage (deduped in loadFlashcards).
  useEffect(() => {
    blockStaleStorageHydrationRef.current = false;
    setSaved(isEnSavedInCacheSync(en, activeStudyTarget));
    let cancelled = false;
    const hydrationTask = InteractionManager.runAfterInteractions(() => {
      isFlashcardSaved(en, activeStudyTarget).then(result => {
        if (cancelled) return;
        if (blockStaleStorageHydrationRef.current) return;
        setSaved(result);
      });
    });
    return () => {
      cancelled = true;
      hydrationTask.cancel?.();
    };
  }, [activeStudyTarget, en]);

  const applyStorageTruthFor = useCallback((enSnap: string) => {
    isFlashcardSaved(enSnap, activeStudyTarget).then(r => {
      if (enRef.current !== enSnap) return;
      setSaved(r);
    });
  }, [activeStudyTarget]);

  useFocusEffect(
    useCallback(() => {
      if (inFlightRef.current) return;
      const focusHydrationTask = InteractionManager.runAfterInteractions(() => {
        if (inFlightRef.current) return;
        applyStorageTruthFor(en);
      });
      return () => focusHydrationTask.cancel?.();
    }, [en, applyStorageTruthFor]),
  );

  const runStorageWork = (fn: () => void) => {
    InteractionManager.runAfterInteractions(fn);
  };

  const safeAsyncSideEffect = (fn: () => void | Promise<unknown>) => {
    try {
      const result = fn();
      if (result && typeof result === 'object' && 'catch' in result) {
        (result as Promise<unknown>).catch(() => {});
      }
    } catch {
      // Saving/removing the flashcard is the primary action; rewards and analytics are best-effort.
    }
  };

  const runPostSaveSideEffects = (
    updates: { type: Parameters<typeof updateMultipleTaskProgress>[0][0]['type']; increment: number }[],
  ) => {
    InteractionManager.runAfterInteractions(() => {
      safeAsyncSideEffect(() => bumpStatsDaily('flashcards_saved', 1, activeStudyTarget));
      safeAsyncSideEffect(() => logFlashcardAdded());
      if (source === 'daily_phrase') {
        safeAsyncSideEffect(() => setDailyPhraseSavedOnServerForTarget(sourceId, true, activeStudyTarget));
        safeAsyncSideEffect(() => checkAchievements({ type: 'daily_phrase', action: 'save', studyTarget: activeStudyTarget }));
      }
      safeAsyncSideEffect(() => checkAchievements({ type: 'flashcard_saved', source, studyTarget: activeStudyTarget }));
      safeAsyncSideEffect(() => updateMultipleTaskProgress(updates, { studyTarget: activeStudyTarget }));
    });
  };

  const handlePress = () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    blockStaleStorageHydrationRef.current = true;
    const enSnap = en;

    if (saved) {
      setSaved(false);
      popAnimation();
      runStorageWork(() => {
        void (async () => {
          try {
            const ok = await removeFlashcardByEnglish(enSnap, activeStudyTarget);
            if (!ok) setSaved(true);
            else if (source === 'daily_phrase') {
              void setDailyPhraseSavedOnServerForTarget(sourceId, false, activeStudyTarget);
            }
          } catch {
            setSaved(true);
          } finally {
            inFlightRef.current = false;
            blockStaleStorageHydrationRef.current = false;
            applyStorageTruthFor(enSnap);
          }
        })();
      });
    } else {
      setSaved(true);
      popAnimation();
      runStorageWork(() => {
        void (async () => {
          try {
            const transcription = getTranscription(enSnap);
            const result = await addFlashcard({
              en: enSnap,
              ru,
              uk,
              es,
              sourceLocales: {
                'pt-BR': sourceLocales?.['pt-BR'],
                vi: sourceLocales?.vi,
                id: sourceLocales?.id,
                tr: sourceLocales?.tr,
                pl: sourceLocales?.pl,
              },
              transcription,
              source,
              sourceId,
              literalRu, literalUk, literalEs,
              explanationRu, explanationUk, explanationEs,
              exampleEn, exampleRu, exampleUk, exampleEs,
              usageNoteRu, usageNoteUk, usageNoteEs,
              register, level,
            }, activeStudyTarget);
            if (result === 'added') {
              const updates: { type: Parameters<typeof updateMultipleTaskProgress>[0][0]['type']; increment: number }[] = [
                { type: 'flashcard_save', increment: 1 },
              ];
              if (source === 'daily_phrase') {
                updates.push({ type: 'daily_phrase_save', increment: 1 });
              }
              runPostSaveSideEffects(updates);
            } else if (result === 'limit_reached') {
              setSaved(false);
              router.push({ pathname: '/premium_modal', params: { context: 'flashcard_limit', saved: '20' } } as any);
            }
          } catch {
            setSaved(false);
          } finally {
            inFlightRef.current = false;
            blockStaleStorageHydrationRef.current = false;
            applyStorageTruthFor(enSnap);
          }
        })();
      });
    }
  };

  const iconName = saved ? 'bookmark' : 'bookmark-outline';
  const iconColor = saved ? t.accent : t.textMuted;

  const box = Math.max(34, size + 12);

  return (
    <Pressable
      onPress={e => {
        e.stopPropagation?.();
        handlePress();
      }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={({ pressed }) => [styles.root, { width: box, height: box }, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from flashcards' : 'Add to flashcards'}
    >
      <View style={{ width: box, height: box, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }} collapsable={false}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons name={iconName as any} size={size} color={iconColor} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

export default memo(AddToFlashcard);

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
});
