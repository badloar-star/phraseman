import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { addFlashcard, alignSavedVideoFlashcardsWithChannel, loadFlashcards } from '../../hooks/use-flashcards';
import { fetchPublishedVideoPhrases } from '../../app/video_phrases_client';
import { isVideoPhrasesEnabled } from '../../app/remote_flags';
import type { VideoPhrase } from '../../shared/video_phrases_contract';
import { SaveToCardsButton } from '../SaveToCardsButton';
import { normalizePackLanguage, type PackLanguage } from '../../app/flashcards/pack_languages';
import { DebugLogger } from '../../app/debug-logger';
import { hapticTap } from '../../hooks/use-haptics';
import {
  activePhraseIndex,
  hasYoutubeSeekHandler,
  requestYoutubeSeek,
  subscribeYoutubePosition,
} from '../../app/youtube_player_seek_bus';

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
  // зачем: Liquid Glass (макет video.html «Фразы из видео») — все цвета из токенов
  // активной темы, шторка «Фраза» на HybridSheetShell material="liquid-glass".
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const [phrases, setPhrases] = useState<readonly VideoPhrase[]>([]);
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<VideoPhrase | null>(null);
  // Держим последнюю открытую фразу, чтобы содержимое шторки не пропадало на время анимации закрытия.
  const lastSelectedRef = useRef<VideoPhrase | null>(null);
  if (selected) lastSelectedRef.current = selected;
  const shown = selected ?? lastSelectedRef.current;
  const [localExpanded, setLocalExpanded] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const savingIdsRef = useRef(new Set<string>());
  // зачем: сетевой сбой прятал блок фраз навсегда — в зависимостях
  // эффекта были только пропсы, а при повторе они не меняются. Этот
  // счётчик — единственный способ перезапустить загрузку, не уходя с экрана.
  const [retryTick, setRetryTick] = useState(0);
  const isExpanded = expanded ?? localExpanded;
  // зачем (владелец 2026-09-25): подсвечиваем фразу, которая звучит сейчас.
  const [activeIndex, setActiveIndex] = useState(-1);
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

  // Позиция приходит раз в секунду и только пока видео играет (канал плеера).
  // setState с тем же индексом не перерисовывает список. Подписка только у
  // развёрнутого списка с таймкодами.
  useEffect(() => {
    if (!isExpanded) return undefined;
    const starts = phrases.map((phrase) => phrase.startSec ?? undefined);
    if (!starts.some((value) => typeof value === 'number')) return undefined;
    return subscribeYoutubePosition(videoId, (positionSec) => setActiveIndex(activePhraseIndex(starts, positionSec)));
  }, [isExpanded, phrases, videoId]);

  const onPhrasePress = useCallback((phrase: VideoPhrase, index: number) => {
    const start = phrase.startSec;
    if (typeof start === 'number' && hasYoutubeSeekHandler(videoId)) {
      void hapticTap();
      // Optimistic UI: подсветка меняется на том же тапе, не дожидаясь плеера.
      setActiveIndex(index);
      const delivered = requestYoutubeSeek(videoId, start);
      console.log(`[VIDEO-SEEK] тап по фразе ${phrase.id} ${start}s доставлен=${String(delivered)}`);
      return;
    }
    console.log(`[VIDEO-SEEK] тап по фразе ${phrase.id}: ${typeof start === 'number' ? 'плеер закрыт' : 'нет таймкода'} — открываю карточку фразы`);
    setSelected(phrase);
  }, [videoId]);

  const copy = useMemo(() => lang === 'ru'
    ? { title: 'Фразы из видео', error: 'Не удалось загрузить. Нажмите, чтобы повторить', phrase: 'Фраза', translation: 'Перевод', explanation: 'Подробно', save: 'Сохранить фразу', saved: 'Фраза сохранена', close: 'Закрыть' }
    : { title: 'Phrases from this video', error: 'Could not load. Tap to try again', phrase: 'Phrase', translation: 'Translation', explanation: 'Explanation', save: 'Save phrase', saved: 'Phrase saved', close: 'Close' }, [lang]);

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
  if (state === 'loading') {
    // Макет: четыре скелетона по 58dp вместо одинокого «…».
    return (
      <View
        testID={testID ? `${testID}-loading` : 'video-phrases-loading'}
        style={styles.block}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={copy.title}
        accessibilityState={{ busy: true }}
      >
        {[0, 1, 2, 3].map((index) => (
          <View key={index} style={[styles.skeleton, { backgroundColor: glass.opaqueCard }]} />
        ))}
      </View>
    );
  }
  if (state === 'error') {
    return (
      <View testID={testID ? `${testID}-error` : 'video-phrases-error'} style={styles.block}>
        <Pressable
          testID={testID ? `${testID}-retry` : 'video-phrases-retry'}
          accessibilityRole="button"
          accessibilityLabel={copy.error}
          onPress={retry}
          style={({ pressed }) => [styles.retry, { backgroundColor: glass.opaqueCard, opacity: pressed ? 0.78 : 1 }]}
        >
          <Ionicons name="cloud-offline-outline" size={22} color={glass.secondary} />
          <Text style={[styles.retryText, { color: glass.secondary }]}>{copy.error}</Text>
        </Pressable>
      </View>
    );
  }
  if (!phrases.length) return null;

  const toggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    setLocalExpanded((value) => !value);
  };

  const selectedSaved = shown ? savedIds.has(shown.id) : false;

  return <View testID={rootTestID} style={styles.block}>
    <Pressable
      testID={toggleTestID}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      onPress={toggle}
      style={({ pressed }) => [styles.toggle, { backgroundColor: glass.opaqueCard, opacity: pressed ? 0.78 : 1 }]}
    >
      <Text style={[styles.title, { color: glass.text }]}>{copy.title}</Text>
      <Text style={[styles.count, { color: glass.mutedText }]}>{phrases.length}</Text>
      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={21} color={glass.secondary} />
    </Pressable>
    {isExpanded && phrases.map((phrase, index) => <View key={phrase.id} testID={`video-phrase-${phrase.ordinal}`} style={[styles.row, { backgroundColor: index === activeIndex ? glass.opaqueControl : glass.opaqueCard }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${copy.phrase}: ${phrase.phrase}`} onPress={() => onPhrasePress(phrase, index)} onLongPress={() => setSelected(phrase)} accessibilityState={{ selected: index === activeIndex }} style={({ pressed }) => [styles.rowCopyPressable, { opacity: pressed ? 0.78 : 1 }]}>
        {typeof phrase.startSec === 'number' ? <Text style={[styles.time, { color: glass.mutedText }]}>{formatTimecode(phrase.startSec)}</Text> : null}
        <View style={styles.rowCopy}><Text style={[styles.phrase, { color: glass.text }]}>{phrase.phrase}</Text><Text style={[styles.translation, { color: glass.secondary }]}>{phrase.translation}</Text></View>
      </Pressable>
      <View style={styles.rowSave}><SaveToCardsButton label={copy.save} savedLabel={copy.saved} saved={savedIds.has(phrase.id)} pulse={false} onSave={() => void save(phrase)} colors={{ surface: glass.opaqueControl, text: glass.text, muted: glass.secondary, accent: glass.lightTint }} testID={`video-phrase-save-${phrase.ordinal}`} /></View>
    </View>)}
    <HybridSheetShell
      visible={!!selected}
      onClose={() => setSelected(null)}
      closeLabel={copy.close}
      material="liquid-glass"
      testID="video-phrase-sheet"
    >
      {shown ? (
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.eyebrow, { color: glass.secondary }]}>
            {typeof shown.startSec === 'number' ? `${copy.phrase} · ${formatTimecode(shown.startSec)}` : copy.phrase}
          </Text>
          <Text accessibilityRole="header" style={[styles.sheetPhrase, { color: glass.text }]}>{shown.phrase}</Text>
          <View style={[styles.infoCard, { backgroundColor: glass.opaqueControl }]}>
            <Text style={[styles.label, { color: glass.secondary }]}>{copy.translation}</Text>
            <Text style={[styles.sheetTranslation, { color: glass.text }]}>{shown.translation}</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: glass.opaqueControl }]}>
            <Text style={[styles.label, { color: glass.secondary }]}>{copy.explanation}</Text>
            <Text style={[styles.explanation, { color: glass.text }]}>{shown.explanation}</Text>
          </View>
          <Pressable
            testID="video-phrase-sheet-save"
            accessibilityRole="button"
            accessibilityLabel={selectedSaved ? copy.saved : copy.save}
            accessibilityState={{ selected: selectedSaved }}
            onPress={() => void save(shown)}
            style={({ pressed }) => [
              styles.sheetCta,
              { backgroundColor: selectedSaved ? glass.opaqueControl : glass.cta, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Ionicons name={selectedSaved ? 'checkmark' : 'bookmark-outline'} size={20} color={selectedSaved ? glass.text : glass.ctaInk} />
            <Text style={[styles.sheetCtaText, { color: selectedSaved ? glass.text : glass.ctaInk }]}>{selectedSaved ? copy.saved : copy.save}</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </HybridSheetShell>
  </View>;
}

/** m:ss (или h:mm:ss) для таймкода фразы, как в макете «Фраза · 3:26». */
function formatTimecode(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const sec = String(safe % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

const styles = StyleSheet.create({
  block: { marginTop: 4, marginBottom: 16 },
  toggle: { minHeight: 56, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  count: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  row: { minHeight: 72, borderRadius: 18, paddingLeft: 16, paddingRight: 8, marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  rowCopyPressable: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowCopy: { flex: 1, paddingVertical: 12, paddingRight: 8 },
  rowSave: { transform: [{ translateY: 4 }] },
  time: { minWidth: 40, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  phrase: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  translation: { marginTop: 4, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  skeleton: { height: 58, borderRadius: 18, marginTop: 8, opacity: 0.7 },
  retry: { minHeight: 76, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryText: { fontSize: 15, lineHeight: 21, fontWeight: '400', textAlign: 'center' },
  sheetScroll: { flexShrink: 1 },
  sheetContent: { paddingTop: 12, paddingBottom: 8 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  sheetPhrase: { fontSize: 30, lineHeight: 36, fontWeight: '700', marginTop: 6 },
  infoCard: { borderRadius: 16, padding: 16, marginTop: 12 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  sheetTranslation: { fontSize: 17, lineHeight: 24, fontWeight: '400', marginTop: 8 },
  explanation: { fontSize: 16, lineHeight: 22, fontWeight: '400', marginTop: 8 },
  sheetCta: { minHeight: 52, borderRadius: 16, marginTop: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sheetCtaText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
