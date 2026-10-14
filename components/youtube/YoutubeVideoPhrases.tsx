import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { addFlashcard, alignSavedVideoFlashcardsWithChannel, loadFlashcards } from '../../hooks/use-flashcards';
import { loadVideoPhrasesCached, peekCachedVideoPhrases, type VideoPhrasesSource } from '../../app/video_phrases_client';
import { isVideoPhrasesEnabled } from '../../app/remote_flags';
import type { VideoPhrase } from '../../shared/video_phrases_contract';
import { SaveToCardsButton } from '../SaveToCardsButton';
import { normalizePackLanguage, type PackLanguage } from '../../app/flashcards/pack_languages';
import { DebugLogger } from '../../app/debug-logger';
import {
  activePhraseIndex,
  hasYoutubeSeekHandler,
  requestYoutubeSeek,
  subscribeYoutubePosition,
} from '../../app/youtube_player_seek_bus';
import { actionToastTri, emitAppEvent } from '../../app/events';
import { actionBoxShadow, nestedBoxShadow } from '../v2/ShadowSurface';
import { noteSwallowedAs } from '../../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type YoutubeVideoPhrasesProps = {
  videoId: string;
  packLanguage?: PackLanguage;
  sourceTitle?: string;
  expanded?: boolean;
  /** Экран ролика (макет video-redesign #c1, экран 3): список фраз раскрыт сразу; без него — свёрнут, как в ленте. */
  defaultExpanded?: boolean;
  onToggle?: () => void;
  testID?: string;
  /** Откуда пришли фразы (память/диск/сеть) — для лога экрана ролика [VIDEO-SCREEN]. */
  onSourceResolved?: (from: VideoPhrasesSource, count: number) => void;
};

/**
 * зачем (аудит Optimistic UI 05.10, п.5): откат закладки фразы больше не молчит — тост по причине, как у избранного видео.
 */
function toastPhraseSaveRollback(reason: string): void {
  emitAppEvent('action_toast', reason === 'limit_reached'
    ? actionToastTri('error', {
      ru: 'Место для карточек закончилось — освободи немного в «Карточках»',
      uk: 'Місце для карток закінчилося — звільни трохи в «Картках»',
      en: 'No room for more cards — free some up in Cards',
      es: 'No queda espacio para tarjetas: libera algo en Tarjetas',
      'pt-BR': 'Sem espaço para cartões — libere um pouco em Cartões',
      vi: 'Hết chỗ cho thẻ — hãy giải phóng bớt trong Thẻ',
      id: 'Tidak ada ruang untuk kartu — kosongkan sedikit di Kartu',
      tr: 'Kart için yer kalmadı — Kartlar bölümünde biraz yer aç',
      pl: 'Brak miejsca na karty — zwolnij trochę w Kartach',
    })
    : actionToastTri('error', {
      ru: 'Не удалось сохранить фразу. Попробуй ещё раз',
      uk: 'Не вдалося зберегти вислів. Спробуй ще раз',
      en: "Couldn't save the phrase. Try again",
      es: 'No se pudo guardar la frase. Inténtalo de nuevo',
      'pt-BR': 'Não foi possível salvar a frase. Tente de novo',
      vi: 'Không lưu được cụm từ. Hãy thử lại',
      id: 'Gagal menyimpan frasa. Coba lagi',
      tr: 'İfade kaydedilemedi. Tekrar dene',
      pl: 'Nie udało się zapisać frazy. Spróbuj ponownie',
    }));
}

/** Тихие повторы загрузки фраз: 5 попыток, пауза 4 с × номер попытки. */
const PHRASES_SILENT_RETRIES = 5;
const PHRASES_RETRY_BASE_MS = 4000;

export default function YoutubeVideoPhrases({ videoId, packLanguage = 'en', sourceTitle, expanded, defaultExpanded = false, onToggle, testID, onSourceResolved }: YoutubeVideoPhrasesProps) {
  const { lang } = useLang();
  const studyTarget = packLanguage;
  // зачем: Liquid Glass (макет video.html «Фразы из видео») — все цвета из токенов
  // активной темы, шторка «Фраза» на HybridSheetShell material="liquid-glass".
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  // зачем (video-011, «каждый раздел мгновенно»): фразы из памяти процесса — уже на первом кадре, без скелетонов.
  const [phrases, setPhrases] = useState<readonly VideoPhrase[]>(() => peekCachedVideoPhrases(videoId) ?? []);
  const onSourceResolvedRef = useRef(onSourceResolved);
  onSourceResolvedRef.current = onSourceResolved;
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<VideoPhrase | null>(null);
  // Держим последнюю открытую фразу, чтобы содержимое шторки не пропадало на время анимации закрытия.
  const lastSelectedRef = useRef<VideoPhrase | null>(null);
  if (selected) lastSelectedRef.current = selected;
  const shown = selected ?? lastSelectedRef.current;
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(() => (peekCachedVideoPhrases(videoId) ? 'ready' : 'loading'));
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
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    // Уже показанные фразы из кэша не прячем под скелетоны на время проверки свежести.
    if (!peekCachedVideoPhrases(videoId)) setState('loading');
    const savedCards = alignSavedVideoFlashcardsWithChannel({ videoId, packLanguage: studyTarget, sourceTitle })
      .catch(noteSwallowedAs('YoutubeVideoPhrases:useEffect.alignSavedVideoFlashcardsWithChannel', 0))
      .then(() => loadFlashcards(studyTarget));
    const startedAt = Date.now();
    void Promise.all([loadVideoPhrasesCached(videoId), savedCards]).then(([loaded, cards]) => {
      const next = loaded.phrases;
      onSourceResolvedRef.current?.(loaded.from, next.length);
      if (!active) {
        DebugLogger.info('[YT-PHRASES]', `stale result dropped videoId=${videoId} target=${studyTarget} attempt=${retryTick}`);
        return;
      }
      setPhrases(next);
      setSavedIds(new Set(cards.filter((card) => card.source === 'video_phrase' && card.sourceId?.startsWith(`${videoId}:`)).map((card) => card.sourceId as string)));
      setState('ready');
      DebugLogger.info('[YT-PHRASES]', `ready videoId=${videoId} target=${studyTarget} from=${loaded.from} phrases=${next.length} savedCards=${cards.length} attempt=${retryTick} ms=${Date.now() - startedAt}`);
    }).catch((e) => {
      // зачем: раньше причина глохла в немом catch, и отличить обрыв сети
      // от постоянной ошибки (нет индекса, отказ правил) было нечем.
      const reason = e instanceof Error ? e.message : String(e);
      DebugLogger.error(
        'YoutubeVideoPhrases:load',
        new Error(`[YT-PHRASES] videoId=${videoId} target=${studyTarget} attempt=${retryTick} ms=${Date.now() - startedAt}: ${reason}`),
        'warning',
      );
      if (!active) return;
      // зачем (правило владельца 01.10, как в пейволе): текста «не удалось» нет. Держим
      // заготовки и тихо повторяем с растущей паузой; кончились попытки — блок прячем.
      if (retryTick < PHRASES_SILENT_RETRIES) {
        const delayMs = PHRASES_RETRY_BASE_MS * (retryTick + 1);
        console.warn(`[YT-PHRASES] тихий повтор videoId=${videoId} попытка=${retryTick + 1}/${PHRASES_SILENT_RETRIES} через ${delayMs}ms`);
        retryTimer = setTimeout(() => setRetryTick((value) => value + 1), delayMs);
        return;
      }
      console.warn(`[YT-PHRASES] попытки исчерпаны videoId=${videoId} — блок фраз скрыт`);
      setState('error');
    });
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
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
      // зачем (правило владельца): хаптик только на управляющих кнопках — тап по плитке/строке без вибрации.
      // Optimistic UI: подсветка меняется на том же тапе, не дожидаясь плеера.
      setActiveIndex(index);
      const delivered = requestYoutubeSeek(videoId, start);
      console.log(`[VIDEO-SEEK] тап по фразе ${phrase.id} ${start}s доставлен=${String(delivered)}`);
      return;
    }
    console.log(`[VIDEO-SEEK] тап по фразе ${phrase.id}: ${typeof start === 'number' ? 'плеер закрыт' : 'нет таймкода'} — открываю карточку фразы`);
    setSelected(phrase);
  }, [videoId]);

  // зачем (координатор 12.10): раньше был только ru/en — украинец, испанец и остальные видели английский; теперь все 9 языков.
  const copy = useMemo(() => triLang(lang, {
    ru: { title: 'Фразы из видео', phrase: 'Фраза', translation: 'Перевод', explanation: 'Подробно', save: 'Сохранить фразу', saved: 'Фраза сохранена', close: 'Закрыть' },
    uk: { title: 'Вислови з відео', phrase: 'Фраза', translation: 'Переклад', explanation: 'Докладно', save: 'Зберегти фразу', saved: 'Фразу збережено', close: 'Закрити' },
    en: { title: 'Phrases from this video', phrase: 'Phrase', translation: 'Translation', explanation: 'Explanation', save: 'Save phrase', saved: 'Phrase saved', close: 'Close' },
    es: { title: 'Frases del vídeo', phrase: 'Frase', translation: 'Traducción', explanation: 'Explicación', save: 'Guardar frase', saved: 'Frase guardada', close: 'Cerrar' },
    'pt-BR': { title: 'Frases do vídeo', phrase: 'Frase', translation: 'Tradução', explanation: 'Explicação', save: 'Salvar frase', saved: 'Frase salva', close: 'Fechar' },
    vi: { title: 'Cụm từ trong video', phrase: 'Cụm từ', translation: 'Bản dịch', explanation: 'Giải thích', save: 'Lưu cụm từ', saved: 'Đã lưu cụm từ', close: 'Đóng' },
    id: { title: 'Frasa dari video', phrase: 'Frasa', translation: 'Terjemahan', explanation: 'Penjelasan', save: 'Simpan frasa', saved: 'Frasa tersimpan', close: 'Tutup' },
    tr: { title: 'Videodaki kalıplar', phrase: 'Kalıp', translation: 'Çeviri', explanation: 'Açıklama', save: 'Kalıbı kaydet', saved: 'Kalıp kaydedildi', close: 'Kapat' },
    pl: { title: 'Zwroty z filmu', phrase: 'Zwrot', translation: 'Tłumaczenie', explanation: 'Wyjaśnienie', save: 'Zapisz zwrot', saved: 'Zwrot zapisany', close: 'Zamknij' },
  }), [lang]);

  const save = useCallback(async (phrase: VideoPhrase) => {
    if (savedIds.has(phrase.id) || savingIdsRef.current.has(phrase.id)) return;
    savingIdsRef.current.add(phrase.id);
    // Optimistic UI: fill the bookmark on the same tap. If local persistence
    // rejects the card, the visual state is rolled back below.
    setSavedIds((current) => new Set(current).add(phrase.id));
    try {
      const result = await addFlashcard({ en: phrase.phrase, ru: phrase.translation, uk: phrase.translation, source: 'video_phrase', sourceId: phrase.id, sourceTitle, explanationRu: phrase.explanation, packLanguage: normalizePackLanguage(studyTarget) }, studyTarget);
      if (result !== 'added' && result !== 'duplicate') {
        // зачем (аудит Optimistic UI 05.10): откат обязан называть причину — иначе закладка «сама» снимается без следа.
        console.warn(`[VIDEO-PHRASE-SAVE] rollback reason=${String(result)} phrase=${phrase.id}`); // guard-ok: ранний выход логируется
        toastPhraseSaveRollback(String(result));
        setSavedIds((current) => {
          const next = new Set(current);
          next.delete(phrase.id);
          return next;
        });
      }
    } catch (error) {
      // зачем: запрет немого catch — причина отката в журнал.
      console.warn(`[VIDEO-PHRASE-SAVE] rollback reason=threw phrase=${phrase.id} message=${error instanceof Error ? error.message : String(error)}`); // guard-ok
      toastPhraseSaveRollback('threw');
      setSavedIds((current) => {
        const next = new Set(current);
        next.delete(phrase.id);
        return next;
      });
    } finally {
      savingIdsRef.current.delete(phrase.id);
    }
  }, [savedIds, studyTarget, sourceTitle]);

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
  // Попытки исчерпаны — блок молча прячем (причина уже в логе [YT-PHRASES]).
  if (state === 'error') return null;
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
      // зачем: паритет с макетом video.html — заголовок «Фразы из видео» это `.sec` без плашки (тон не заливаем).
      style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.78 : 1 }]}
    >
      <Text style={[styles.title, { color: glass.text }]}>{copy.title}</Text>
      <Text style={[styles.count, { color: glass.mutedText }]}>{phrases.length}</Text>
      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={glass.secondary} />
    </Pressable>
    {isExpanded && phrases.map((phrase, index) => <View key={phrase.id} testID={`video-phrase-${phrase.ordinal}`} style={[styles.row, { backgroundColor: index === activeIndex ? `${glass.accent}29` : 'transparent' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${copy.phrase}: ${phrase.phrase}`} onPress={() => onPhrasePress(phrase, index)} onLongPress={() => setSelected(phrase)} accessibilityState={{ selected: index === activeIndex }} style={({ pressed }) => [styles.rowCopyPressable, { opacity: pressed ? 0.78 : 1 }]}>
        {typeof phrase.startSec === 'number' ? <Text style={[styles.time, { color: index === activeIndex ? glass.accentText : glass.secondary }]}>{formatTimecode(phrase.startSec)}</Text> : null}
        <View style={styles.rowCopy}><Text style={[styles.phrase, { color: index === activeIndex ? glass.accentText : glass.text }]}>{phrase.phrase}</Text><Text style={[styles.translation, { color: glass.secondary }]}>{phrase.translation}</Text></View>
      </Pressable>
      <View style={styles.rowSave}><SaveToCardsButton label={copy.save} savedLabel={copy.saved} saved={savedIds.has(phrase.id)} pulse={false} onSave={() => void save(phrase)} colors={{ surface: 'transparent', text: glass.secondary, muted: glass.secondary, accent: glass.text }} testID={`video-phrase-save-${phrase.ordinal}`} /></View>
    </View>)}
    <HybridSheetShell
      visible={!!selected}
      onClose={() => setSelected(null)}
      closeLabel={copy.close}
      material="liquid-glass"
      testID="video-phrase-sheet"
    >
      {shown ? (
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false} decelerationRate="fast">
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
              // зачем (Тень 12.10): контурная `.cta.gh` («сохранено») — плашка с малой тенью вместо контура; главная — цветная тень действия
              selectedSaved ? { backgroundColor: glass.buttonFill, boxShadow: nestedBoxShadow(glass) } : { backgroundColor: glass.cta, boxShadow: actionBoxShadow(glass) },
              { opacity: pressed ? 0.82 : 1 },
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
  toggle: { minHeight: 44, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  count: { flex: 1, marginLeft: 0, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  // зачем (макет video-redesign #c1, `.ph1`): строка от 66; текущая фраза — тон акцента 16 % и текст цветом акцента.
  row: { minHeight: 66, borderRadius: 14, paddingLeft: 12, paddingRight: 4, marginTop: 2, flexDirection: 'row', alignItems: 'center' },
  rowCopyPressable: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowCopy: { flex: 1, paddingVertical: 12, paddingRight: 8 },
  rowSave: { alignSelf: 'center' },
  time: { minWidth: 40, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  phrase: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  translation: { marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  skeleton: { height: 58, borderRadius: 18, marginTop: 8, opacity: 0.7 },
  sheetScroll: { flexShrink: 1 },
  sheetContent: { paddingTop: 12, paddingBottom: 8 },
  eyebrow: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  sheetPhrase: { fontSize: 30, lineHeight: 36, fontWeight: '700', marginTop: 6 },
  infoCard: { borderRadius: 16, padding: 16, marginTop: 12 },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  sheetTranslation: { fontSize: 16, lineHeight: 22, fontWeight: '400', marginTop: 8 },
  explanation: { fontSize: 16, lineHeight: 22, fontWeight: '400', marginTop: 8 },
  sheetCta: { minHeight: 52, borderRadius: 26, marginTop: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sheetCtaText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
