import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VoiceEqualizer, type VoiceEqualizerRef } from '../app/voice_equalizer';
import {
  PLAN_PRONUNCIATION_PASS_THRESHOLD,
  scorePlanPronunciationTranscript,
} from '../app/personal_plan_pronunciation_scoring_client';
import {
  speakingMatchedFlags,
  speakingTargetTokens,
} from '../app/speaking_word_match';
import { buildSpeakingStartOptions } from '../app/speaking_recognition_options';
import { diffPhonemes } from '../app/speaking_phoneme_diff';
import { TranscriptAccumulator } from '../app/speaking_transcript_accumulator';
import {
  analyzeProsody,
  expectedStressPosition,
  stressFeedback,
  type LoudnessSample,
  type StressFeedback,
} from '../app/speaking_prosody';
import SpeakingScoreRing from './SpeakingScoreRing';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useRecordStartCue } from '../hooks/use-record-start-cue';

/**
 * SpeakingPanel — premium "say it out loud" practice surface.
 *
 * Self-contained: owns mic permission, on-device speech recognition, the live
 * waveform, word-by-word highlighting and pass/fail scoring (reuses the plan's
 * 90% threshold). Drop it anywhere (lesson / quiz / trainer / personal plan)
 * and it manages its own lifecycle. The host only supplies the target phrase
 * and is told when the attempt passes.
 *
 * Premium gating is the host's job: only render this when the user tapped the
 * "Устно" button AND has premium. Free users get routed to the paywall by the
 * host before this ever mounts.
 */

export type SpeakingPanelStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'scoring'
  | 'passed'
  | 'failed'
  | 'no_speech'
  | 'denied'
  | 'unavailable';

export interface SpeakingPanelTheme {
  bg: string;
  card: string;
  textPrimary: string;
  textSecond: string;
  textMuted: string;
  accent: string;
  correct: string;
  wrong: string;
  border: string;
  /** Текст/иконка на залитых accent/correct кнопках (в моно-теме accent белый → нужен тёмный текст). */
  onAccent: string;
}

/** Subset of the app theme that the speaking panel needs. */
export interface SpeakingPanelThemeSource {
  bgPrimary: string;
  bgCard: string;
  textPrimary: string;
  textSecond: string;
  textMuted: string;
  accent: string;
  correct: string;
  wrong: string;
  border: string;
  correctText: string;
}

/**
 * Canonical mapping from the app theme to a SpeakingPanelTheme.
 * Single source of truth so every host (lessons / quizzes / trainer / QA lab)
 * builds the panel theme identically instead of duplicating the object.
 */
export function buildSpeakingPanelTheme(t: SpeakingPanelThemeSource): SpeakingPanelTheme {
  return {
    bg: t.bgPrimary,
    card: t.bgCard,
    textPrimary: t.textPrimary,
    textSecond: t.textSecond,
    textMuted: t.textMuted,
    accent: t.accent,
    correct: t.correct,
    wrong: t.wrong,
    border: t.border,
    onAccent: t.correctText,
  };
}

export interface SpeakingPanelProps {
  /** Canonical target phrase the user must say (English). */
  targetText: string;
  /** UI language for the labels. */
  lang: string;
  theme: SpeakingPanelTheme;
  /** BCP-47 recognition locale. Defaults to en-US (study target is English). */
  recognitionLocale?: string;
  /** Called when the spoken attempt reaches the pass threshold. */
  onPass?: (result: { score: number; transcript: string }) => void;
  /**
   * Called on «Готово» after a passing attempt with the phrase to drop into the
   * lesson's answer field (so the user can then press «Проверить»). The host
   * decides what to fill; we pass the canonical target text (clean, guaranteed
   * to pass the lesson check) rather than the raw transcript.
   */
  onFillAnswer?: (text: string) => void;
  /** Called when the user closes the panel. */
  onClose: () => void;
  /**
   * DEV/QA only. When set, the panel mounts in this status and the mic is
   * inert (no permission request, no native speech module) so every visual
   * state can be inspected from the in-app admin lab. Has no effect in normal
   * use — production hosts never pass it.
   */
  previewStatus?: SpeakingPanelStatus;
  /** DEV/QA only. Fixed score shown for the passed/failed preview states. */
  previewScore?: number;
}

type SpeechModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (event: string, cb: (payload: any) => void) => { remove?: () => void } | undefined;
  supportsOnDeviceRecognition?: () => boolean | Promise<boolean>;
};

// expo-speech-recognition is a native module; require lazily so the panel can
// degrade gracefully (status 'unavailable') if the dev build lacks it.
function loadSpeechModule(): SpeechModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-speech-recognition');
    return (mod?.ExpoSpeechRecognitionModule ?? null) as SpeechModule | null;
  } catch {
    return null;
  }
}

const L = (lang: string, map: Record<string, string>): string =>
  map[lang] ?? map.ru ?? Object.values(map)[0] ?? '';

export function SpeakingPanel({
  targetText,
  lang,
  theme,
  recognitionLocale = 'en-US',
  onPass,
  onFillAnswer,
  onClose,
  previewStatus,
  previewScore,
}: SpeakingPanelProps) {
  const isPreview = previewStatus != null;
  // In preview mode the native speech module is never touched, so permission
  // prompts and recognition stay inert while the visual state is inspected.
  const speech = useMemo(() => (isPreview ? null : loadSpeechModule()), [isPreview]);
  const { playRecordStart } = useRecordStartCue();
  const [status, setStatus] = useState<SpeakingPanelStatus>(previewStatus ?? 'idle');
  const [transcript, setTranscript] = useState('');
  // Final heard text of a FAILED attempt, kept for the "which word sounded off" hint.
  const [failedTranscript, setFailedTranscript] = useState('');
  // Equalizer is driven IMPERATIVELY via a ref (setSample) so each ~250ms
  // volumechange sample does NOT re-render the whole modal — that re-render storm
  // was the source of the equalizer lag. Mirrors personal_plan_exercise.
  const equalizerRef = useRef<VoiceEqualizerRef>(null);
  const [score, setScore] = useState<number | null>(
    isPreview && (previewStatus === 'passed' || previewStatus === 'failed')
      ? previewScore ?? (previewStatus === 'passed' ? 97 : 45)
      : null,
  );
  const listenersRef = useRef<Array<{ remove?: () => void }>>([]);
  const mountedRef = useRef(true);
  // Loudness contour for prosody (rhythm/stress) — collected from volumechange.
  const prosodySamplesRef = useRef<LoudnessSample[]>([]);
  const attemptStartRef = useRef(0);
  const [stress, setStress] = useState<StressFeedback>('unknown');

  const tokens = useMemo(() => speakingTargetTokens(targetText), [targetText]);
  const matched = useMemo(
    () => speakingMatchedFlags(targetText, transcript),
    [targetText, transcript],
  );
  // Word-level "which word sounded off" hint, only for a failed attempt.
  const phonemeDiff = useMemo(
    () => (status === 'failed' && failedTranscript ? diffPhonemes(targetText, failedTranscript) : null),
    [status, failedTranscript, targetText],
  );

  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((sub) => sub?.remove?.());
    listenersRef.current = [];
  }, []);

  const finishAttempt = useCallback(
    (
      finalTranscript: string,
      segments?: ReadonlyArray<{ segment?: string; confidence?: number }>,
    ) => {
      if (!mountedRef.current) return;
      const text = finalTranscript.trim();
      // Attempt finished -> the equalizer collapses itself when `active` turns
      // false (its own effect), so no per-sample reset needed here.
      setStatus('scoring');
      if (!text) {
        // Nothing recognized -> "didn't catch that", not a 0% failure.
        setStatus('no_speech');
        hapticError();
        return;
      }
      const result = scorePlanPronunciationTranscript({
        targetText,
        transcript: text,
        segments,
      });
      // Prosody (rhythm/stress) from the loudness contour we collected — local,
      // no native module. Surfaces "monotone" / stress-too-early-or-late hints.
      const prosody = analyzeProsody(prosodySamplesRef.current);
      setStress(stressFeedback(prosody, expectedStressPosition(targetText)));
      setScore(result.score);
      if (result.passed) {
        setFailedTranscript('');
        setStatus('passed');
        hapticSuccess();
        onPass?.({ score: result.score, transcript: text });
      } else {
        // Keep the heard text so the failed view can show "which word sounded off".
        setFailedTranscript(text);
        setStatus('failed');
        hapticError();
      }
    },
    [targetText, onPass],
  );

  const stopListening = useCallback(() => {
    try {
      speech?.stop();
    } catch {
      /* no-op */
    }
  }, [speech]);

  const startListening = useCallback(async () => {
    if (isPreview) return; // mic is inert while previewing a fixed status
    if (!speech) {
      setStatus('unavailable');
      return;
    }
    hapticTap();
    setTranscript('');
    setFailedTranscript('');
    setScore(null);
    equalizerRef.current?.setSample(0);
    setStress('unknown');
    prosodySamplesRef.current = [];
    attemptStartRef.current = Date.now();
    setStatus('requesting');
    try {
      const permission = await speech.requestPermissionsAsync();
      if (!mountedRef.current) return;
      if (!permission?.granted) {
        setStatus('denied');
        return;
      }
    } catch {
      if (mountedRef.current) setStatus('denied');
      return;
    }

    cleanupListeners();
    let latest = '';
    // Лучший вариант за попытку = тот, что даёт МАКСИМАЛЬНЫЙ score против цели
    // среди ВСЕХ альтернатив (maxAlternatives) ВСЕХ result-событий. Движок часто
    // кладёт правильную фразу не в results[0], а в #2/#3; плюс при беглой речи
    // шлёт короткий финальный обрывок после более полного interim. Скоринг
    // дешёвый, поэтому считаем кандидатов на лету и держим лучший.
    let best = '';
    let bestScore = -1;
    let bestSegments: ReadonlyArray<{ segment?: string; confidence?: number }> | undefined;
    // Накопитель всех услышанных слов за попытку: при БЫСТРОЙ речи нейтива движок
    // сегментирует фразу и присылает обрывки, заменяющие друг друга ("I would" …
    // потом хвост "coffee please"). Объединение слов за всю попытку собирает
    // фразу целиком, иначе засчитывалось бы «только последнее слово».
    const acc = new TranscriptAccumulator();
    const considerBest = (
      candidate: string,
      segments?: ReadonlyArray<{ segment?: string; confidence?: number }>,
    ) => {
      const c = candidate.trim();
      if (!c) return;
      const s = scorePlanPronunciationTranscript({ targetText, transcript: c, segments }).score;
      if (s > bestScore) {
        bestScore = s;
        best = c;
        bestSegments = Array.isArray(segments) ? segments : undefined;
      }
    };

    const resultSub = speech.addListener('result', (event: any) => {
      const alternatives: Array<{ transcript?: string; segments?: ReadonlyArray<{ segment?: string; confidence?: number }> }> = Array.isArray(event?.results)
        ? event.results
        : [];
      for (const alt of alternatives) {
        const t = String(alt?.transcript ?? '').trim();
        // segments live only on results[0] per the package; pass when present.
        if (t) considerBest(t, Array.isArray(alt?.segments) ? alt.segments : undefined);
      }
      // Копим объединение слов ТОЛЬКО из топ-гипотезы (не из всех альтернатив —
      // иначе притащим слова из неверных вариантов). Union — ещё один кандидат
      // на скоринг (порядок слов сохраняется, поэтому orderAccuracy не страдает,
      // и перемешанная речь НЕ получит ложный проход).
      acc.add(String(alternatives[0]?.transcript ?? ''));
      const union = acc.union();
      if (union) considerBest(union);
      // Живая подсветка по union: слово, раз загоревшись, больше не гаснет, когда
      // следующий interim заменяет строку только хвостом.
      const next = union || String(alternatives[0]?.transcript ?? '').trim();
      if (next) {
        latest = next;
        if (mountedRef.current) setTranscript(next);
      }
    });
    const endSub = speech.addListener('end', () => {
      // Скорим по самому полному варианту, а не по последнему обрывку.
      finishAttempt(best || latest, bestSegments);
    });
    const errorSub = speech.addListener('error', () => {
      if (mountedRef.current) {
        const final = best || latest;
        if (final) finishAttempt(final, bestSegments);
        else setStatus('no_speech');
      }
    });
    const noMatchSub = speech.addListener('nomatch', () => {
      if (mountedRef.current) setStatus('no_speech');
    });
    // Live volume -> equalizer, pushed IMPERATIVELY (no setState → no re-render
    // of the modal on every sample). The equalizer derives loudness + tone tilt.
    const volumeSub = speech.addListener('volumechange', (event: any) => {
      if (!mountedRef.current) return;
      const value = Number(event?.value);
      equalizerRef.current?.setSample(value);
      // Collect the loudness contour for prosody (cap to keep memory bounded).
      if (prosodySamplesRef.current.length < 240) {
        prosodySamplesRef.current.push({ value, atMs: Date.now() - attemptStartRef.current });
      }
    });

    listenersRef.current = [resultSub, endSub, errorSub, noMatchSub, volumeSub].filter(
      Boolean,
    ) as Array<{ remove?: () => void }>;

    // Prefer the device's offline neural recognizer when available (iOS 17+,
    // Android 13+ with the AOSP model). Cleaner privacy, no network error class,
    // and biasing/formatting work. Falls back to platform default otherwise.
    let onDevice = false;
    try {
      onDevice = (await speech.supportsOnDeviceRecognition?.()) === true;
    } catch {
      onDevice = false;
    }
    if (!mountedRef.current) return;

    try {
      setStatus('listening');
      speech.start(
        buildSpeakingStartOptions({
          lang: recognitionLocale,
          targetText,
          interimResults: true,
          volumeMeter: true,
          onDevice,
        }),
      );
      // Mic is live now -> canonical "recording started" cue (sound + haptic).
      playRecordStart();
    } catch {
      if (mountedRef.current) setStatus('unavailable');
    }
  }, [isPreview, speech, recognitionLocale, targetText, cleanupListeners, finishAttempt, playRecordStart]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupListeners();
      try {
        speech?.abort();
      } catch {
        /* no-op */
      }
    };
  }, [speech, cleanupListeners]);

  // Автостарт: панель монтируется только когда юзер нажал «Устно», поэтому
  // сразу начинаем слушать — без второго нажатия на микрофон. В preview-режиме
  // (QA-лаборатория) микрофон намеренно инертен, так что не трогаем.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (isPreview) return;
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startListening();
  }, [isPreview, startListening]);

  const handleClose = useCallback(() => {
    stopListening();
    try {
      speech?.abort();
    } catch {
      /* no-op */
    }
    onClose();
  }, [stopListening, speech, onClose]);

  const openAppSettings = useCallback(() => {
    hapticTap();
    Linking.openSettings().catch(() => {
      /* no-op: some platforms/contexts can't open settings */
    });
  }, []);

  const listening = status === 'listening';
  const showResult = status === 'passed' || status === 'failed';
  const isBlocked = status === 'denied' || status === 'unavailable';
  // На успехе фраза засчитана — микрофон больше не нужен (иначе юзер «застревает»
  // на экране с микрофоном и «Сказать ещё раз», не понимая, что уже готово).
  // Вместо микрофона показываем явную кнопку «Готово», которая закрывает панель.
  const passed = status === 'passed';
  const passThreshold = PLAN_PRONUNCIATION_PASS_THRESHOLD;

  const statusLine = (() => {
    switch (status) {
      case 'idle':
        return L(lang, {
          ru: 'Нажми на микрофон и произнеси фразу',
          uk: 'Натисни на мікрофон і вимов фразу',
          es: 'Toca el micrófono y di la frase',
          'pt-BR': 'Toque no microfone e diga a frase',
          vi: 'Nhấn vào micrô và nói cụm từ',
          id: 'Ketuk mikrofon dan ucapkan frasa',
          tr: 'Mikrofona dokun ve ifadeyi söyle',
          pl: 'Dotknij mikrofonu i wypowiedz frazę',
        });
      case 'requesting':
        return L(lang, { ru: 'Готовимся слушать…', uk: 'Готуємось слухати…', es: 'Preparando…', 'pt-BR': 'Preparando…', vi: 'Đang chuẩn bị nghe…', id: 'Menyiapkan…', tr: 'Dinlemeye hazırlanıyor…', pl: 'Przygotowuję słuchanie…' });
      case 'listening':
        return L(lang, { ru: 'Слушаю… говори', uk: 'Слухаю… говори', es: 'Escuchando… habla', 'pt-BR': 'Escutando… fale', vi: 'Đang nghe… hãy nói', id: 'Mendengarkan… bicara', tr: 'Dinliyorum… konuş', pl: 'Słucham… mów' });
      case 'scoring':
        return L(lang, { ru: 'Проверяю…', uk: 'Перевіряю…', es: 'Comprobando…', 'pt-BR': 'Verificando…', vi: 'Đang kiểm tra…', id: 'Memeriksa…', tr: 'Kontrol ediyorum…', pl: 'Sprawdzam…' });
      case 'passed':
        return L(lang, { ru: 'Отлично! Чисто сказано', uk: 'Чудово! Чітко сказано', es: '¡Genial! Bien dicho', 'pt-BR': 'Ótimo! Bem pronunciado', vi: 'Tuyệt! Nói rất rõ', id: 'Bagus! Diucapkan dengan jelas', tr: 'Harika! Temiz söyledin', pl: 'Świetnie! Powiedziane czysto' });
      case 'failed':
        return L(lang, { ru: 'Почти. Попробуй ещё раз', uk: 'Майже. Спробуй ще раз', es: 'Casi. Inténtalo otra vez', 'pt-BR': 'Quase. Tente de novo', vi: 'Gần đúng rồi. Thử lại nhé', id: 'Hampir. Coba lagi', tr: 'Neredeyse. Bir daha dene', pl: 'Prawie. Spróbuj jeszcze raz' });
      case 'no_speech':
        return L(lang, {
          ru: 'Не расслышал. Скажи чуть громче',
          uk: 'Не розчув. Скажи трохи гучніше',
          es: 'No te oí. Habla un poco más alto',
          'pt-BR': 'Não ouvi bem. Fale um pouco mais alto',
          vi: 'Không nghe rõ. Hãy nói to hơn một chút',
          id: 'Tidak terdengar. Ucapkan sedikit lebih keras',
          tr: 'Duyamadım. Biraz daha yüksek sesle söyle',
          pl: 'Nie dosłyszałem. Powiedz trochę głośniej',
        });
      case 'denied':
        return L(lang, {
          ru: 'Нужен доступ к микрофону',
          uk: 'Потрібен доступ до мікрофона',
          es: 'Se necesita el micrófono',
          'pt-BR': 'É preciso acesso ao microfone',
          vi: 'Cần quyền truy cập micrô',
          id: 'Perlu akses mikrofon',
          tr: 'Mikrofon izni gerekiyor',
          pl: 'Potrzebny jest dostęp do mikrofonu',
        });
      case 'unavailable':
        return L(lang, {
          ru: 'Это устройство не умеет распознавать речь. Остальные упражнения доступны',
          uk: 'Цей пристрій не вміє розпізнавати мовлення. Інші вправи доступні',
          es: 'Este dispositivo no reconoce voz. Los demás ejercicios están disponibles',
          'pt-BR': 'Este dispositivo não reconhece voz. Os outros exercícios estão disponíveis',
          vi: 'Thiết bị này không nhận dạng giọng nói. Các bài tập khác vẫn dùng được',
          id: 'Perangkat ini tidak bisa mengenali suara. Latihan lain tetap tersedia',
          tr: 'Bu cihaz konuşmayı tanıyamıyor. Diğer alıştırmalar kullanılabilir',
          pl: 'To urządzenie nie rozpoznaje mowy. Pozostałe ćwiczenia są dostępne',
        });
      default:
        return '';
    }
  })();

  const micDisabled = status === 'requesting' || status === 'scoring' || status === 'unavailable';

  return (
    <Modal transparent animationType="fade" onRequestClose={handleClose} visible>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {L(lang, { ru: 'Скажи вслух', uk: 'Скажи вголос', es: 'Dilo en voz alta', 'pt-BR': 'Diga em voz alta', vi: 'Nói thành tiếng', id: 'Ucapkan keras-keras', tr: 'Yüksek sesle söyle', pl: 'Powiedz na głos' })}
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={L(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
            >
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>

          {/* Целевая фраза СКРЫТА за чёрточками по буквам — юзер не видит ответ
              заранее (иначе нет смысла учиться). Слово «загорается» (становится
              читаемым) только когда юзер правильно его произнёс. Заполнение
              пословно по мере распознавания. На passed показываем фразу целиком. */}
          <View style={styles.phraseWrap} accessibilityRole="text">
            {tokens.map((tok, i) => {
              const reveal = matched[i] || status === 'passed';
              // Маска по буквам: каждая буква/цифра → «_», пунктуация остаётся.
              const masked = tok.replace(/[\p{L}\p{N}]/gu, '_');
              return (
                <Text
                  key={`spk-tok-${i}`}
                  style={[
                    styles.phraseWord,
                    {
                      color: reveal ? theme.correct : theme.textMuted,
                      opacity: reveal ? 1 : 0.6,
                      letterSpacing: reveal ? 0 : 2,
                    },
                  ]}
                >
                  {reveal ? tok : masked}
                  {i < tokens.length - 1 ? ' ' : ''}
                </Text>
              );
            })}
          </View>

          {/* While recording: live equalizer. After scoring: the result ring
              takes its place (Rosetta-style, percent in the center). */}
          <View style={styles.waveWrap}>
            {showResult && score != null ? (
              <View
                style={styles.ringWrap}
                accessibilityRole="text"
                accessibilityLabel={L(lang, {
                  ru: `Результат ${score} процентов из ${passThreshold} нужных, ${status === 'passed' ? 'засчитано' : 'не засчитано'}`,
                  uk: `Результат ${score} відсотків із ${passThreshold} потрібних, ${status === 'passed' ? 'зараховано' : 'не зараховано'}`,
                  es: `Resultado ${score} por ciento de ${passThreshold} necesarios, ${status === 'passed' ? 'aprobado' : 'no aprobado'}`,
                  'pt-BR': `Resultado ${score} por cento de ${passThreshold} necessários, ${status === 'passed' ? 'aprovado' : 'não aprovado'}`,
                  vi: `Kết quả ${score} phần trăm trên ${passThreshold} cần thiết, ${status === 'passed' ? 'đã đạt' : 'chưa đạt'}`,
                  id: `Hasil ${score} persen dari ${passThreshold} yang diperlukan, ${status === 'passed' ? 'lulus' : 'belum lulus'}`,
                  tr: `Sonuç gerekli ${passThreshold} üzerinden yüzde ${score}, ${status === 'passed' ? 'geçti' : 'geçmedi'}`,
                  pl: `Wynik ${score} procent z wymaganych ${passThreshold}, ${status === 'passed' ? 'zaliczone' : 'niezaliczone'}`,
                })}
              >
                <SpeakingScoreRing
                  score={score}
                  color={status === 'passed' ? theme.correct : theme.wrong}
                  trackColor={theme.border}
                  textColor={theme.textPrimary}
                  innerBg={theme.card}
                  animate={!isPreview}
                />
                <Text style={[styles.ringTarget, { color: theme.textMuted }]}>
                  {L(lang, {
                    ru: `нужно ${passThreshold}%`,
                    uk: `потрібно ${passThreshold}%`,
                    es: `se necesita ${passThreshold}%`,
                    'pt-BR': `precisa de ${passThreshold}%`,
                    vi: `cần ${passThreshold}%`,
                    id: `butuh ${passThreshold}%`,
                    tr: `%${passThreshold} gerekli`,
                    pl: `potrzeba ${passThreshold}%`,
                  })}
                </Text>
              </View>
            ) : (
              <VoiceEqualizer
                {...(isPreview ? {} : { ref: equalizerRef })}
                active={listening}
                color={theme.accent}
                idleColor={theme.border}
              />
            )}
          </View>

          {/* Status line / score */}
          <Text
            style={[
              styles.status,
              {
                color:
                  status === 'passed'
                    ? theme.correct
                    : status === 'failed' || status === 'denied' || status === 'unavailable'
                    ? theme.wrong
                    : theme.textMuted,
              },
            ]}
          >
            {statusLine}
          </Text>

          {/* "Which word sounded off" — calm, word-level hint after a failed
              attempt. Fully local (phonetic diff). Only the words that didn't
              come through are listed, so the learner knows exactly what to retry. */}
          {phonemeDiff?.hasIssues && (
            <View style={styles.diffWrap} accessibilityRole="text">
              <Text style={[styles.diffLabel, { color: theme.textMuted }]}>
                {L(lang, {
                  ru: 'Поработай над:',
                  uk: 'Попрацюй над:',
                  es: 'Trabaja en:',
                  'pt-BR': 'Pratique:',
                  vi: 'Luyện thêm:',
                  id: 'Latih lagi:',
                  tr: 'Şunları çalış:',
                  pl: 'Popracuj nad:',
                })}
              </Text>
              <View style={styles.diffWords}>
                {phonemeDiff.words
                  .filter((w) => w.status !== 'ok')
                  .map((w, idx) => (
                    <Text
                      key={`diff-${idx}`}
                      style={[styles.diffWord, { color: theme.wrong, borderColor: theme.wrong }]}
                    >
                      {w.target}
                    </Text>
                  ))}
              </View>
              {/* Concrete in-word sound contrast, when we could pinpoint it.
                  Phoneme symbols are language-neutral, so the same hint works
                  for every UI language. */}
              {(() => {
                const hinted = phonemeDiff.words.find(
                  (w) => w.status === 'mispronounced' && w.soundHints && w.soundHints.length > 0,
                );
                const h = hinted?.soundHints?.[0];
                if (!h) return null;
                return (
                  <Text style={[styles.diffSound, { color: theme.textMuted }]}>
                    {L(lang, {
                      ru: `звук /${h.expected}/ вместо /${h.said}/ в «${hinted!.target}»`,
                      uk: `звук /${h.expected}/ замість /${h.said}/ у «${hinted!.target}»`,
                      es: `sonido /${h.expected}/ en vez de /${h.said}/ en «${hinted!.target}»`,
                      'pt-BR': `som /${h.expected}/ em vez de /${h.said}/ em «${hinted!.target}»`,
                      vi: `âm /${h.expected}/ thay vì /${h.said}/ trong «${hinted!.target}»`,
                      id: `bunyi /${h.expected}/ bukan /${h.said}/ pada «${hinted!.target}»`,
                      tr: `«${hinted!.target}» sözcüğünde /${h.said}/ yerine /${h.expected}/`,
                      pl: `dźwięk /${h.expected}/ zamiast /${h.said}/ w «${hinted!.target}»`,
                    })}
                  </Text>
                );
              })()}
            </View>
          )}

          {/* Prosody (rhythm/stress) hint — shown after any scored attempt when
              we detected a clear pattern. Energy-based, local, build-free. */}
          {showResult && (stress === 'monotone' || stress === 'too_early' || stress === 'too_late') && (
            <Text style={[styles.diffSound, { color: theme.textMuted }]}>
              {stress === 'monotone'
                ? L(lang, {
                    ru: 'Звучит ровно — добавь выражения и ударения',
                    uk: 'Звучить рівно — додай виразності та наголосу',
                    es: 'Suena plano — añade más énfasis',
                    'pt-BR': 'Soa monótono — dê mais ênfase',
                    vi: 'Nghe đều đều — hãy nhấn nhá hơn',
                    id: 'Terdengar datar — beri lebih banyak penekanan',
                    tr: 'Tekdüze geldi — vurgu ekle',
                    pl: 'Brzmi płasko — dodaj akcentu',
                  })
                : L(lang, {
                    ru: 'Обрати внимание на ударение во фразе',
                    uk: 'Зверни увагу на наголос у фразі',
                    es: 'Cuida el acento de la frase',
                    'pt-BR': 'Atenção à ênfase da frase',
                    vi: 'Chú ý trọng âm của câu',
                    id: 'Perhatikan penekanan kalimat',
                    tr: 'Cümledeki vurguya dikkat et',
                    pl: 'Zwróć uwagę na akcent w zdaniu',
                  })}
            </Text>
          )}

          {/* Mic button — hidden when blocked (denied/unavailable) or already
              passed: there the mic can't help / isn't needed, so a clear action
              button takes its place. */}
          {!isBlocked && !passed && (
            <Pressable
              onPress={listening ? stopListening : startListening}
              disabled={micDisabled}
              accessibilityRole="button"
              accessibilityLabel={
                listening
                  ? L(lang, { ru: 'Остановить запись', uk: 'Зупинити запис', es: 'Detener', 'pt-BR': 'Parar gravação', vi: 'Dừng ghi âm', id: 'Hentikan rekaman', tr: 'Kaydı durdur', pl: 'Zatrzymaj nagrywanie' })
                  : L(lang, { ru: 'Начать говорить', uk: 'Почати говорити', es: 'Empezar a hablar', 'pt-BR': 'Começar a falar', vi: 'Bắt đầu nói', id: 'Mulai bicara', tr: 'Konuşmaya başla', pl: 'Zacznij mówić' })
              }
              accessibilityState={{ disabled: micDisabled, busy: status === 'requesting' || status === 'scoring' }}
              style={[
                styles.micBtn,
                {
                  backgroundColor: listening ? theme.wrong : theme.accent,
                  opacity: micDisabled ? 0.5 : 1,
                },
              ]}
            >
              {status === 'requesting' || status === 'scoring' ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <Ionicons name={listening ? 'stop' : 'mic'} size={28} color={theme.onAccent} />
              )}
            </Pressable>
          )}

          {/* Passed -> прямой выход: фраза засчитана, явная кнопка «Готово»
              закрывает панель (раньше юзер застревал на микрофоне). «Сказать
              ещё раз» остаётся тихой вторичной ссылкой ниже. */}
          {passed && (
            <Pressable
              onPress={() => {
                // Кладём фразу в поле ответа урока, затем закрываем панель —
                // чтобы юзер сразу мог нажать «Проверить».
                onFillAnswer?.(targetText);
                handleClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={L(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' })}
              style={[styles.actionBtn, { backgroundColor: theme.correct }]}
            >
              <Text style={[styles.actionBtnText, { color: theme.onAccent }]}>
                {L(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' })}
              </Text>
            </Pressable>
          )}

          {/* Retry link after an attempt (pass / fail / nothing heard). */}
          {(status === 'failed' || status === 'passed' || status === 'no_speech') && (
            <Pressable onPress={startListening} hitSlop={8} style={styles.retry}>
              <Text style={[styles.retryText, { color: theme.accent }]}>
                {L(lang, { ru: 'Сказать ещё раз', uk: 'Сказати ще раз', es: 'Decir de nuevo', 'pt-BR': 'Dizer de novo', vi: 'Nói lại lần nữa', id: 'Ucapkan lagi', tr: 'Bir daha söyle', pl: 'Powiedz jeszcze raz' })}
              </Text>
            </Pressable>
          )}

          {/* Denied -> deep-link to system settings so the user can grant mic. */}
          {status === 'denied' && (
            <Pressable
              onPress={openAppSettings}
              accessibilityRole="button"
              style={[styles.actionBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.actionBtnText, { color: theme.onAccent }]}>
                {L(lang, { ru: 'Открыть настройки', uk: 'Відкрити налаштування', es: 'Abrir ajustes', 'pt-BR': 'Abrir ajustes', vi: 'Mở cài đặt', id: 'Buka pengaturan', tr: 'Ayarları aç', pl: 'Otwórz ustawienia' })}
              </Text>
            </Pressable>
          )}

          {/* Unavailable -> not a dead end: a calm "Got it" closes the panel. */}
          {status === 'unavailable' && (
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              style={[styles.actionBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.actionBtnText, { color: theme.onAccent }]}>
                {L(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
              </Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  diffWrap: { alignItems: 'center', marginBottom: 8, marginTop: -8 },
  diffLabel: { fontSize: 13, marginBottom: 6 },
  diffWords: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  diffWord: {
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  diffSound: { fontSize: 12, marginTop: 6, textAlign: 'center' },
  phraseWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  phraseWord: { fontSize: 22, fontWeight: '600', lineHeight: 30 },
  waveWrap: { minHeight: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringTarget: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  status: { fontSize: 14, textAlign: 'center', marginBottom: 20, minHeight: 20 },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retry: { marginTop: 16 },
  retryText: { fontSize: 15, fontWeight: '600' },
  actionBtn: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 180,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default SpeakingPanel;
