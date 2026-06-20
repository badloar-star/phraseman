import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VoiceEqualizer } from '../app/voice_equalizer';
import {
  PLAN_PRONUNCIATION_PASS_THRESHOLD,
  scorePlanPronunciationTranscript,
} from '../app/personal_plan_pronunciation_scoring_client';
import {
  speakingMatchedFlags,
  speakingTargetTokens,
} from '../app/speaking_word_match';
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
  // Latest raw `volumechange` sample (~ -2..10) for the equalizer; the
  // VoiceEqualizer turns it into loudness + tone-driven bar heights itself.
  const [voiceSample, setVoiceSample] = useState(0);
  const [score, setScore] = useState<number | null>(
    isPreview && (previewStatus === 'passed' || previewStatus === 'failed')
      ? previewScore ?? (previewStatus === 'passed' ? 97 : 45)
      : null,
  );
  const listenersRef = useRef<Array<{ remove?: () => void }>>([]);
  const mountedRef = useRef(true);

  const tokens = useMemo(() => speakingTargetTokens(targetText), [targetText]);
  const matched = useMemo(
    () => speakingMatchedFlags(targetText, transcript),
    [targetText, transcript],
  );

  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((sub) => sub?.remove?.());
    listenersRef.current = [];
  }, []);

  const finishAttempt = useCallback(
    (finalTranscript: string) => {
      if (!mountedRef.current) return;
      const text = finalTranscript.trim();
      // Attempt finished -> let the equalizer settle to rest before the ring.
      setVoiceSample(0);
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
      });
      setScore(result.score);
      if (result.passed) {
        setStatus('passed');
        hapticSuccess();
        onPass?.({ score: result.score, transcript: text });
      } else {
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
    setScore(null);
    setVoiceSample(0);
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
    // Лучший (самый ПОЛНЫЙ) распознанный вариант за попытку. При быстрой беглой
    // речи движок иногда шлёт финальный обрывок ("you") после более полного
    // interim ("you are late") и рано стреляет `end` → раньше скорилось по
    // обрывку = 3%. Берём вариант с наибольшим числом слов (а при равенстве —
    // длиннее), чтобы беглую речь не штрафовать за раннюю остановку движка.
    let best = '';
    const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
    const considerBest = (candidate: string) => {
      const c = candidate.trim();
      if (!c) return;
      if (wordCount(c) > wordCount(best) || (wordCount(c) === wordCount(best) && c.length > best.length)) {
        best = c;
      }
    };

    const resultSub = speech.addListener('result', (event: any) => {
      const top = event?.results?.[0];
      const next = String(top?.transcript ?? '').trim();
      if (next) {
        latest = next;
        considerBest(next);
        if (mountedRef.current) setTranscript(next);
      }
    });
    const endSub = speech.addListener('end', () => {
      // Скорим по самому полному варианту, а не по последнему обрывку.
      finishAttempt(best || latest);
    });
    const errorSub = speech.addListener('error', () => {
      if (mountedRef.current) {
        const final = best || latest;
        if (final) finishAttempt(final);
        else setStatus('no_speech');
      }
    });
    const noMatchSub = speech.addListener('nomatch', () => {
      if (mountedRef.current) setStatus('no_speech');
    });
    // Live volume -> equalizer. Forward the raw sample; the equalizer derives
    // loudness + tone-driven bar heights from it.
    const volumeSub = speech.addListener('volumechange', (event: any) => {
      if (!mountedRef.current) return;
      setVoiceSample(Number(event?.value));
    });

    listenersRef.current = [resultSub, endSub, errorSub, noMatchSub, volumeSub].filter(
      Boolean,
    ) as Array<{ remove?: () => void }>;

    try {
      setStatus('listening');
      speech.start({
        lang: recognitionLocale,
        interimResults: true,
        continuous: false,
        // Enable real-time volume metering so the equalizer reacts to the voice.
        // Value arrives in `volumechange` (-2..10); ~100ms cadence is plenty.
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
        ...(Platform.OS === 'ios' ? { recordingOptions: { persist: true } } : {}),
      });
      // Mic is live now -> canonical "recording started" cue (sound + haptic).
      playRecordStart();
    } catch {
      if (mountedRef.current) setStatus('unavailable');
    }
  }, [isPreview, speech, recognitionLocale, cleanupListeners, finishAttempt, playRecordStart]);

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
        });
      case 'requesting':
        return L(lang, { ru: 'Готовимся слушать…', uk: 'Готуємось слухати…', es: 'Preparando…' });
      case 'listening':
        return L(lang, { ru: 'Слушаю… говори', uk: 'Слухаю… говори', es: 'Escuchando… habla' });
      case 'scoring':
        return L(lang, { ru: 'Проверяю…', uk: 'Перевіряю…', es: 'Comprobando…' });
      case 'passed':
        return L(lang, { ru: 'Отлично! Чисто сказано', uk: 'Чудово! Чітко сказано', es: '¡Genial! Bien dicho' });
      case 'failed':
        return L(lang, { ru: 'Почти. Попробуй ещё раз', uk: 'Майже. Спробуй ще раз', es: 'Casi. Inténtalo otra vez' });
      case 'no_speech':
        return L(lang, {
          ru: 'Не расслышал. Скажи чуть громче',
          uk: 'Не розчув. Скажи трохи гучніше',
          es: 'No te oí. Habla un poco más alto',
        });
      case 'denied':
        return L(lang, {
          ru: 'Нужен доступ к микрофону',
          uk: 'Потрібен доступ до мікрофона',
          es: 'Se necesita el micrófono',
        });
      case 'unavailable':
        return L(lang, {
          ru: 'Это устройство не умеет распознавать речь. Остальные упражнения доступны',
          uk: 'Цей пристрій не вміє розпізнавати мовлення. Інші вправи доступні',
          es: 'Este dispositivo no reconoce voz. Los demás ejercicios están disponibles',
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
              {L(lang, { ru: 'Скажи вслух', uk: 'Скажи вголос', es: 'Dilo en voz alta' })}
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={L(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar' })}
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
                  })}
                </Text>
              </View>
            ) : (
              <VoiceEqualizer
                active={listening}
                color={theme.accent}
                idleColor={theme.border}
                {...(isPreview ? {} : { rawSample: voiceSample })}
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
                  ? L(lang, { ru: 'Остановить запись', uk: 'Зупинити запис', es: 'Detener' })
                  : L(lang, { ru: 'Начать говорить', uk: 'Почати говорити', es: 'Empezar a hablar' })
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
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name={listening ? 'stop' : 'mic'} size={28} color="#fff" />
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
              accessibilityLabel={L(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo' })}
              style={[styles.actionBtn, { backgroundColor: theme.correct }]}
            >
              <Text style={styles.actionBtnText}>
                {L(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo' })}
              </Text>
            </Pressable>
          )}

          {/* Retry link after an attempt (pass / fail / nothing heard). */}
          {(status === 'failed' || status === 'passed' || status === 'no_speech') && (
            <Pressable onPress={startListening} hitSlop={8} style={styles.retry}>
              <Text style={[styles.retryText, { color: theme.accent }]}>
                {L(lang, { ru: 'Сказать ещё раз', uk: 'Сказати ще раз', es: 'Decir de nuevo' })}
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
              <Text style={styles.actionBtnText}>
                {L(lang, { ru: 'Открыть настройки', uk: 'Відкрити налаштування', es: 'Abrir ajustes' })}
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
              <Text style={styles.actionBtnText}>
                {L(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido' })}
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
