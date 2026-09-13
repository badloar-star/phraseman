import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { addFlashcard, alignSavedVideoFlashcardsWithChannel, loadFlashcards } from '../../hooks/use-flashcards';
import { fetchPublishedVideoPhrases } from '../../app/video_phrases_client';
import { isVideoPhrasesEnabled } from '../../app/remote_flags';
import type { VideoPhrase } from '../../shared/video_phrases_contract';
import { SaveToCardsButton } from '../SaveToCardsButton';
import { normalizePackLanguage, type PackLanguage } from '../../app/flashcards/pack_languages';
import { DebugLogger } from '../../app/debug-logger';
import { hapticTap } from '../../hooks/use-haptics';

type YoutubeVideoPhrasesProps = {
  videoId: string;
  packLanguage?: PackLanguage;
  sourceTitle?: string;
  expanded?: boolean;
  onToggle?: () => void;
  testID?: string;
};

export default function YoutubeVideoPhrases({ videoId, packLanguage = 'en', sourceTitle, expanded, onToggle, testID }: YoutubeVideoPhrasesProps) {
  const { lang } = useLang();
  const studyTarget = packLanguage;
  const { theme: t } = useTheme();
  const [phrases, setPhrases] = useState<readonly VideoPhrase[]>([]);
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<VideoPhrase | null>(null);
  const [localExpanded, setLocalExpanded] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const savingIdsRef = useRef(new Set<string>());
  // зачем: сетевой сбой прятал блок фраз навсегда — в зависимостях
  // эффекта были только пропсы, а при повторе они не меняются. Этот
  // счётчик — единственный способ перезапустить загрузку, не уходя с экрана.
  const [retryTick, setRetryTick] = useState(0);
  const isExpanded = expanded ?? localExpanded;
  const rootTestID = testID ?? 'video-phrases';
  const toggleTestID = testID ? `${testID}-toggle` : 'video-phrases-toggle';

  const enabled = isVideoPhrasesEnabled();

  useEffect(() => {
    if (!enabled) { setPhrases([]); setState('ready'); return undefined; }
    let active = true;
    setState('loading');
    const savedCards = alignSavedVideoFlashcardsWithChannel({ videoId, packLanguage: studyTarget, sourceTitle })
      .catch(() => 0)
      .then(() => loadFlashcards(studyTarget));
    const startedAt = Date.now();
    void Promise.all([fetchPublishedVideoPhrases(videoId), savedCards]).then(([next, cards]) => {
      if (!active) {
        DebugLogger.info('[YT-PHRASES]', `stale result dropped videoId=${videoId} target=${studyTarget} attempt=${retryTick}`);
        return;
      }
      setPhrases(next);
      setSavedIds(new Set(cards.filter((card) => card.source === 'video_phrase' && card.sourceId?.startsWith(`${videoId}:`)).map((card) => card.sourceId as string)));
      setState('ready');
      DebugLogger.info('[YT-PHRASES]', `ready videoId=${videoId} target=${studyTarget} phrases=${next.length} savedCards=${cards.length} attempt=${retryTick} ms=${Date.now() - startedAt}`);
    }).catch((e) => {
      // зачем: раньше причина глохла в немом catch, и отличить обрыв сети
      // от постоянной ошибки (нет индекса, отказ правил) было нечем.
      const reason = e instanceof Error ? e.message : String(e);
      DebugLogger.error(
        'YoutubeVideoPhrases:load',
        new Error(`[YT-PHRASES] videoId=${videoId} target=${studyTarget} attempt=${retryTick} ms=${Date.now() - startedAt}: ${reason}`),
        'warning',
      );
      if (active) setState('error');
    });
    return () => { active = false; };
  }, [enabled, retryTick, sourceTitle, studyTarget, videoId]);

  const copy = useMemo(() => lang === 'ru'
    ? { title: 'Фразы из видео', error: 'Не удалось загрузить. Нажмите, чтобы повторить', phrase: 'Фраза', translation: 'Перевод', explanation: 'Подробно', save: 'Сохранить фразу', saved: 'Фраза сохранена' }
    : { title: 'Phrases from this video', error: 'Could not load. Tap to try again', phrase: 'Phrase', translation: 'Translation', explanation: 'Explanation', save: 'Save phrase', saved: 'Phrase saved' }, [lang]);

  const save = useCallback(async (phrase: VideoPhrase) => {
    if (savedIds.has(phrase.id) || savingIdsRef.current.has(phrase.id)) return;
    savingIdsRef.current.add(phrase.id);
    // Optimistic UI: fill the bookmark on the same tap. If local persistence
    // rejects the card, the visual state is rolled back below.
    setSavedIds((current) => new Set(current).add(phrase.id));
    try {
      const result = await addFlashcard({ en: phrase.phrase, ru: phrase.translation, uk: phrase.translation, source: 'video_phrase', sourceId: phrase.id, sourceTitle, explanationRu: phrase.explanation, packLanguage: normalizePackLanguage(studyTarget) }, studyTarget);
      if (result !== 'added' && result !== 'duplicate') {
        setSavedIds((current) => {
          const next = new Set(current);
          next.delete(phrase.id);
          return next;
        });
      }
    } catch {
      setSavedIds((current) => {
        const next = new Set(current);
        next.delete(phrase.id);
        return next;
      });
    } finally {
      savingIdsRef.current.delete(phrase.id);
    }
  }, [savedIds, studyTarget, sourceTitle]);

  const retry = () => {
    // Защита от двойного тапа: пока идёт загрузка, повтор не нужен.
    if (state === 'loading') return;
    void hapticTap();
    // Optimistic UI: экран отвечает на тот же тап, до ответа сети.
    setState('loading');
    setRetryTick((value) => value + 1);
  };

  if (!enabled) return null;
  if (state === 'loading') return <View testID={testID ? `${testID}-loading` : 'video-phrases-loading'} style={styles.block}><Text style={[styles.muted, { color: t.textMuted }]}>…</Text></View>;
  if (state === 'error') return <View testID={testID ? `${testID}-error` : 'video-phrases-error'} style={styles.block}>
    <Pressable testID={testID ? `${testID}-retry` : 'video-phrases-retry'} accessibilityRole="button" accessibilityLabel={copy.error} onPress={retry} style={({ pressed }) => [styles.retry, { backgroundColor: t.bgSurface, opacity: pressed ? 0.78 : 1 }]}>
      <Text style={[styles.retryText, { color: t.textMuted }]}>{copy.error}</Text>
      <Ionicons name="refresh" size={20} color={t.textMuted} />
    </Pressable>
  </View>;
  if (!phrases.length) return null;

  const toggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    setLocalExpanded((value) => !value);
  };

  return <View testID={rootTestID} style={styles.block}>
    <Pressable testID={toggleTestID} accessibilityRole="button" accessibilityState={{ expanded: isExpanded }} onPress={toggle} style={({ pressed }) => [styles.toggle, { backgroundColor: t.bgSurface, opacity: pressed ? 0.78 : 1 }]}>
      <Text style={[styles.title, { color: t.textPrimary }]}>{copy.title}</Text>
      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={21} color={t.textMuted} />
    </Pressable>
    {isExpanded && phrases.map((phrase) => <View key={phrase.id} testID={`video-phrase-${phrase.ordinal}`} style={[styles.row, { backgroundColor: t.bgSurface }]}> 
      <Pressable accessibilityRole="button" accessibilityLabel={`${copy.phrase}: ${phrase.phrase}`} onPress={() => setSelected(phrase)} style={({ pressed }) => [styles.rowCopyPressable, { opacity: pressed ? 0.78 : 1 }]}>
        <View style={styles.rowCopy}><Text style={[styles.phrase, { color: t.textPrimary }]}>{phrase.phrase}</Text><Text style={[styles.translation, { color: t.textMuted }]}>{phrase.translation}</Text></View>
      </Pressable>
      <View style={styles.rowSave}><SaveToCardsButton label={copy.save} savedLabel={copy.saved} saved={savedIds.has(phrase.id)} pulse={false} onSave={() => void save(phrase)} colors={{ surface: t.bgSurface2, text: t.textPrimary, muted: t.textMuted, accent: t.accent }} testID={`video-phrase-save-${phrase.ordinal}`} /></View>
    </View>)}
    <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
      <Pressable style={styles.scrim} onPress={() => setSelected(null)}><Pressable style={[styles.sheet, { backgroundColor: t.bgCard }]} onPress={(event) => event.stopPropagation()}>
        {selected && <ScrollView contentContainerStyle={styles.sheetContent}><Text style={[styles.label, { color: t.textMuted }]}>{copy.phrase}</Text><Text style={[styles.sheetPhrase, { color: t.textPrimary }]}>{selected.phrase}</Text><Text style={[styles.label, { color: t.textMuted }]}>{copy.translation}</Text><Text style={[styles.sheetTranslation, { color: t.textPrimary }]}>{selected.translation}</Text><Text style={[styles.label, { color: t.textMuted }]}>{copy.explanation}</Text><Text style={[styles.explanation, { color: t.textPrimary }]}>{selected.explanation}</Text><View style={styles.sheetAction}><SaveToCardsButton label={copy.save} savedLabel={copy.saved} saved={savedIds.has(selected.id)} pulse={false} onSave={() => void save(selected)} colors={{ surface: t.bgSurface, text: t.textPrimary, muted: t.textMuted, accent: t.accent }} /></View></ScrollView>}
      </Pressable></Pressable>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  block: { marginTop: 4, marginBottom: 16 }, toggle: { minHeight: 56, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 18, fontWeight: '900' }, row: { minHeight: 72, borderRadius: 18, paddingLeft: 16, paddingRight: 8, marginTop: 8, flexDirection: 'row', alignItems: 'center' }, rowCopyPressable: { flex: 1 }, rowCopy: { paddingVertical: 12, paddingRight: 8 }, rowSave: { transform: [{ translateY: 4 }] }, phrase: { fontSize: 16, fontWeight: '800' }, translation: { marginTop: 4, fontSize: 13, fontWeight: '700' }, muted: { fontSize: 13, fontWeight: '700' }, retry: { minHeight: 56, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, retryText: { flex: 1, paddingRight: 12, fontSize: 15, fontWeight: '800' }, scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.55)' }, sheet: { maxHeight: '82%', borderTopLeftRadius: 28, borderTopRightRadius: 28 }, sheetContent: { padding: 24, paddingBottom: 36 }, label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12 }, sheetPhrase: { fontSize: 24, lineHeight: 31, fontWeight: '900', marginTop: 5 }, sheetTranslation: { fontSize: 18, lineHeight: 25, fontWeight: '800', marginTop: 5 }, explanation: { fontSize: 16, lineHeight: 24, marginTop: 5 }, sheetAction: { marginTop: 20, alignItems: 'center' },
});
