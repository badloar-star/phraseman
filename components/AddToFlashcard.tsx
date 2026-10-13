import React, { memo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { actionToastTri, emitAppEvent } from '../app/events';
import {
  Pressable,
  View,
  Animated,
  Easing,
  StyleSheet,
  InteractionManager,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useStudyTarget } from './StudyTargetContext';
import { checkAchievements } from '../app/achievements';
import { logFlashcardAdded } from '../app/firebase';
import { getTranscription, TRANSCRIPTION_ENGINE_VERSION } from '../app/transcription';
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
import { DebugLogger } from '../app/debug-logger';
import { normalizePackLanguage, type PackLanguage } from '../app/flashcards/pack_languages';
import { FREE_SAVED_CARD_LIMIT } from '../app/flashcards/free_limit';
import { noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
  packLanguage?: PackLanguage;
}

function AddToFlashcard({
  en, ru, uk, es, sourceLocales, source, sourceId, size = 20,
  literalRu, literalUk, literalEs,
  explanationRu, explanationUk, explanationEs,
  exampleEn, exampleRu, exampleUk, exampleEs,
  usageNoteRu, usageNoteUk, usageNoteEs,
  register, level, studyTarget, packLanguage,
}: Props) {
  const { theme: t } = useTheme();
  const { studyTarget: contextStudyTarget } = useStudyTarget();
  const activeStudyTarget = studyTarget ?? contextStudyTarget;
  const activePackLanguage = normalizePackLanguage(packLanguage ?? activeStudyTarget);
  const router = useRouter();
  const [saved, setSaved] = useState(() => isEnSavedInCacheSync(en, activePackLanguage));
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
    setSaved(isEnSavedInCacheSync(en, activePackLanguage));
    let cancelled = false;
    const hydrationTask = InteractionManager.runAfterInteractions(() => {
      isFlashcardSaved(en, activePackLanguage).then(result => {
        if (cancelled) return;
        if (blockStaleStorageHydrationRef.current) return;
        setSaved(result);
      });
    });
    return () => {
      cancelled = true;
      hydrationTask.cancel?.();
    };
  }, [activePackLanguage, en]);

  const applyStorageTruthFor = useCallback((enSnap: string) => {
    isFlashcardSaved(enSnap, activePackLanguage).then(r => {
      if (enRef.current !== enSnap) return;
      setSaved(r);
    });
  }, [activePackLanguage]);

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
        (result as Promise<unknown>).catch(noteSwallowedHandler('AddToFlashcard:safeAsyncSideEffect.result'));
      }
    } catch (e) {
      // Saving/removing the flashcard is the primary action; rewards and analytics are best-effort.
      DebugLogger.error('AddToFlashcard:result', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  };

  const runPostSaveSideEffects = () => {
    InteractionManager.runAfterInteractions(() => {
      safeAsyncSideEffect(() => bumpStatsDaily('flashcards_saved', 1, activeStudyTarget));
      safeAsyncSideEffect(() => logFlashcardAdded());
      if (source === 'daily_phrase') {
        safeAsyncSideEffect(() => setDailyPhraseSavedOnServerForTarget(sourceId, true, activeStudyTarget));
        safeAsyncSideEffect(() => checkAchievements({ type: 'daily_phrase', action: 'save', studyTarget: activeStudyTarget }));
      }
      safeAsyncSideEffect(() => checkAchievements({ type: 'flashcard_saved', source, studyTarget: activeStudyTarget }));
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
            const ok = await removeFlashcardByEnglish(enSnap, activePackLanguage);
            if (!ok) {
              // зачем (координатор 12.10, аудит Optimistic UI R1): откат закладки без причины и сообщения — теперь в журнал и человеку.
              console.warn(`[OPT-UI] card_remove rollback reason=not_removed en=${enSnap.slice(0, 40)}`); // guard-ok: откат называет причину
              setSaved(true);
              emitAppEvent('action_toast', actionToastTri('error', {
                ru: 'Не удалось убрать карточку. Попробуй ещё раз.', uk: 'Не вдалося прибрати картку. Спробуй ще раз.', en: "Couldn't remove the card. Try again.", es: 'No se pudo quitar la tarjeta. Inténtalo de nuevo.',
                'pt-BR': 'Não foi possível remover o cartão. Tente de novo.', vi: 'Không bỏ được thẻ. Hãy thử lại.', id: 'Kartu tidak bisa dihapus. Coba lagi.', tr: 'Kart kaldırılamadı. Tekrar dene.', pl: 'Nie udało się usunąć fiszki. Spróbuj ponownie.',
              }));
            } else if (source === 'daily_phrase') {
              void setDailyPhraseSavedOnServerForTarget(sourceId, false, activeStudyTarget);
            }
          } catch (error: unknown) {
            console.warn(`[OPT-UI] card_remove rollback reason=threw kind=${error instanceof Error ? error.name : typeof error}`); // guard-ok: catch пишет причину
            setSaved(true);
            emitAppEvent('action_toast', actionToastTri('error', {
                ru: 'Не удалось убрать карточку. Попробуй ещё раз.', uk: 'Не вдалося прибрати картку. Спробуй ще раз.', en: "Couldn't remove the card. Try again.", es: 'No se pudo quitar la tarjeta. Inténtalo de nuevo.',
                'pt-BR': 'Não foi possível remover o cartão. Tente de novo.', vi: 'Không bỏ được thẻ. Hãy thử lại.', id: 'Kartu tidak bisa dihapus. Coba lagi.', tr: 'Kart kaldırılamadı. Tekrar dene.', pl: 'Nie udało się usunąć fiszki. Spróbuj ponownie.',
              }));
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
              // зачем: помечаем версией движка, чтобы будущая починка
              // генератора смогла отличить эту запись от старых (репорт
              // 21.09.2026 про guests → /gdʒʌːsts/).
              transcriptionEngineVersion: TRANSCRIPTION_ENGINE_VERSION,
              source,
              sourceId,
              literalRu, literalUk, literalEs,
              explanationRu, explanationUk, explanationEs,
              exampleEn, exampleRu, exampleUk, exampleEs,
              usageNoteRu, usageNoteUk, usageNoteEs,
              register, level,
              packLanguage: activePackLanguage,
            }, activeStudyTarget);
            if (result === 'added') {
              runPostSaveSideEffects();
            } else if (result === 'limit_reached') {
              setSaved(false);
              router.push({ pathname: '/premium_modal', params: { context: 'flashcard_limit', source: 'add_to_flashcard', saved: String(FREE_SAVED_CARD_LIMIT) } } as any);
            } else if (result === 'stale') {
              console.warn('[OPT-UI] card_save rollback reason=stale'); // guard-ok: откат называет причину
              setSaved(false);
              emitAppEvent('action_toast', actionToastTri('error', {
                ru: 'Не удалось сохранить карточку. Попробуй ещё раз.', uk: 'Не вдалося зберегти картку. Спробуй ще раз.', en: "Couldn't save the card. Try again.", es: 'No se pudo guardar la tarjeta. Inténtalo de nuevo.',
                'pt-BR': 'Não foi possível salvar o cartão. Tente de novo.', vi: 'Không lưu được thẻ. Hãy thử lại.', id: 'Kartu tidak bisa disimpan. Coba lagi.', tr: 'Kart kaydedilemedi. Tekrar dene.', pl: 'Nie udało się zapisać fiszki. Spróbuj ponownie.',
              }));
            }
          } catch (error: unknown) {
            console.warn(`[OPT-UI] card_save rollback reason=threw kind=${error instanceof Error ? error.name : typeof error}`); // guard-ok: catch пишет причину
            setSaved(false);
            emitAppEvent('action_toast', actionToastTri('error', {
                ru: 'Не удалось сохранить карточку. Попробуй ещё раз.', uk: 'Не вдалося зберегти картку. Спробуй ще раз.', en: "Couldn't save the card. Try again.", es: 'No se pudo guardar la tarjeta. Inténtalo de nuevo.',
                'pt-BR': 'Não foi possível salvar o cartão. Tente de novo.', vi: 'Không lưu được thẻ. Hãy thử lại.', id: 'Kartu tidak bisa disimpan. Coba lagi.', tr: 'Kart kaydedilemedi. Tekrar dene.', pl: 'Nie udało się zapisać fiszki. Spróbuj ponownie.',
              }));
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
  const iconColor = saved ? t.accentText : t.textMuted;

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
