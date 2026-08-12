// ═══════════════════════════════════════════════════════════════════════════
// trainer_phrases_session.tsx — Сессия фраз
//
// Два режима чередуются:
//   word_bank  — сборка фразы из перемешанных слов (как в уроке)
//   fill_gap   — вставь пропущенное слово (то слово где была ошибка)
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import {
  getDueItems,
  markTrainerResult,
  type TrainerItem,
} from './trainer_store';
import { hasUsedFreeSessionToday, isTrainerSessionLocked, markFreeSessionUsed } from './trainer_session';
import { getVerifiedPremiumStatus } from './premium_guard';
import { actionToastTri, emitAppEvent } from './events';
import { registerXP } from './xp_manager';
import SessionResultScreen from './flashcards/SessionResultScreen';
import {
  autoSpeakAfterSfx,
  cancelPendingFcTts,
  fcHaptic,
  setFcTtsSpeaker,
} from './flashcards/SoundService';
import { awardSessionStars, type AwardStarsOutcome } from './flashcards/stars_system';
import {
  requeueAfterMistake,
  summarizeSession,
  type SessionAnswerEvent,
  type SessionOutcomeSummary,
} from './flashcards/session_queue';
import {
  shuffleWordBankTiles,
  tokenizeRecallPhrase,
  type WordBankTile,
} from './review_evaluator';

/** Cards 2.0 E5: XP +5/верный ответ (паритет с review, §3.6 мастер-плана). */
const XP_PER_CORRECT = 5;
const ACCENT = '#40C080';

type SessionMode = 'word_bank' | 'fill_gap';

interface SessionCard {
  item: TrainerItem;
  mode: SessionMode;
}

function buildDeck(items: TrainerItem[]): SessionCard[] {
  const deck: SessionCard[] = [];
  items.forEach((item, i) => {
    // Если есть errorWord — чередуем word_bank и fill_gap; иначе всегда word_bank
    const hasFillGap = !!item.errorWord;
    const mode: SessionMode = hasFillGap && i % 2 === 0 ? 'fill_gap' : 'word_bank';
    deck.push({ item, mode });
  });
  return deck;
}

// Набор заглушек на случай если в фразе мало слов для 3 ложных вариантов
const DECOY_FILLERS = ['the', 'a', 'is', 'was', 'have', 'do', 'not', 'in', 'on', 'at'];

function buildFillGapOptions(errorWord: string, phrase: string): string[] {
  const words = tokenizeRecallPhrase(phrase).filter(w => w.toLowerCase() !== errorWord.toLowerCase());
  const pool = [...words];
  // Добиваем заглушками если слов мало
  for (const f of DECOY_FILLERS) {
    if (pool.length >= 3) break;
    if (f.toLowerCase() !== errorWord.toLowerCase() && !pool.includes(f)) pool.push(f);
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  return [...shuffled, errorWord].sort(() => Math.random() - 0.5);
}

// ── WordBank режим ────────────────────────────────────────────────────────────
interface WordBankProps {
  item: TrainerItem;
  onResult: (correct: boolean) => void;
}

function WordBankMode({ item, onResult }: WordBankProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const [bank, setBank] = useState<WordBankTile[]>(() => shuffleWordBankTiles(item.key));
  const [selected, setSelected] = useState<WordBankTile[]>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const correctTokens = tokenizeRecallPhrase(item.key);

  const tapBank = (tile: WordBankTile) => {
    if (feedback !== 'none') return;
    setSelected(s => [...s, tile]);
    setBank(b => b.filter(t => t.slot !== tile.slot));
  };

  const tapSelected = (tile: WordBankTile) => {
    if (feedback !== 'none') return;
    setBank(b => [...b, tile].sort((a, b) => a.slot - b.slot));
    setSelected(s => s.filter(t => t.slot !== tile.slot));
  };

  const check = () => {
    if (selected.length !== correctTokens.length) return;
    const userAnswer = selected.map(t => t.text).join(' ').toLowerCase();
    const correct = correctTokens.join(' ').toLowerCase();
    const isOk = userAnswer === correct;
    setFeedback(isOk ? 'correct' : 'wrong');
    // E9: SFX/хаптика §5 в момент ответа + автоозвучка полной EN-фразы
    fcHaptic(isOk ? 'correct' : 'wrong');
    autoSpeakAfterSfx(item.key, {
      sfx: isOk ? 'correct' : 'incorrect',
      language: 'en-US',
    });
    if (isOk) {
      setTimeout(() => onResult(true), 700);
    } else {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        setFeedback('none');
        setSelected([]);
        setBank(shuffleWordBankTiles(item.key));
        onResult(false);
      }, 1200);
    }
  };

  const borderColor = feedback === 'correct' ? '#40C080' : feedback === 'wrong' ? '#E05050' : t.border;

  return (
    <View style={{ flex: 1, gap: 16 }}>
      {/* Перевод — задание */}
      <View style={[styles.translationBox, { backgroundColor: t.bgCard, borderColor: t.border }]}>
        <Text style={[styles.translationText, { color: t.textMuted, fontSize: f.caption }]}>
          {triLang(lang, { ru: 'Составь фразу:', uk: 'Склади фразу:', es: 'Forma la frase:' })}
        </Text>
        <Text style={[styles.translationMain, { color: t.textPrimary, fontSize: f.body }]}>
          {lang === 'uk' ? item.translationUk || item.translationRu : item.translationRu}
        </Text>
      </View>

      {/* Область сборки */}
      <Animated.View style={[
        styles.assemblyBox,
        { backgroundColor: t.bgCard, borderColor, transform: [{ translateX: shakeAnim }] },
      ]}>
        {selected.length === 0
          ? <Text style={{ color: t.textMuted, fontSize: f.caption }}>
              {triLang(lang, { ru: 'Тут появятся слова…', uk: 'Тут зʼявляться слова…', es: 'Aquí aparecerán las palabras…' })}
            </Text>
          : <View style={styles.tilesRow}>
              {selected.map(tile => (
                <TouchableOpacity
                  key={tile.slot}
                  onPress={() => tapSelected(tile)}
                  style={[styles.tile, { backgroundColor: borderColor + '22', borderColor }]}
                >
                  <Text style={[styles.tileText, { color: t.textPrimary, fontSize: f.body }]}>{tile.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
        }
      </Animated.View>

      {/* Банк слов */}
      <View style={styles.tilesRow}>
        {bank.map(tile => (
          <TouchableOpacity
            key={tile.slot}
            onPress={() => tapBank(tile)}
            style={[styles.tile, { backgroundColor: t.bgCard, borderColor: t.border }]}
          >
            <Text style={[styles.tileText, { color: t.textPrimary, fontSize: f.body }]}>{tile.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Кнопка проверки */}
      <TouchableOpacity
        onPress={check}
        disabled={selected.length === 0 || feedback !== 'none'}
        style={[styles.checkBtn, {
          backgroundColor: selected.length > 0 ? '#4A9EFF' : t.bgSurface,
          opacity: selected.length > 0 ? 1 : 0.4,
        }]}
      >
        <Text style={[styles.checkBtnText, { fontSize: f.body }]}>
          {triLang(lang, { ru: 'Проверить', uk: 'Перевірити', es: 'Comprobar' })}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Fill Gap режим ────────────────────────────────────────────────────────────
interface FillGapProps {
  item: TrainerItem;
  onResult: (correct: boolean) => void;
}

function FillGapMode({ item, onResult }: FillGapProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const errorWord = item.errorWord ?? '';
  const [options] = useState(() => buildFillGapOptions(errorWord, item.key));
  const [chosen, setChosen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');

  const phraseWithGap = item.key.replace(new RegExp(`\\b${errorWord}\\b`, 'i'), '___');

  const pick = (opt: string) => {
    if (feedback !== 'none') return;
    const isOk = opt.toLowerCase() === errorWord.toLowerCase();
    setChosen(opt);
    setFeedback(isOk ? 'correct' : 'wrong');
    // E9: SFX/хаптика §5 в момент ответа + автоозвучка полной EN-фразы
    fcHaptic(isOk ? 'correct' : 'wrong');
    autoSpeakAfterSfx(item.key, {
      sfx: isOk ? 'correct' : 'incorrect',
      language: 'en-US',
    });
    if (isOk) {
      setTimeout(() => onResult(true), 700);
    } else {
      setTimeout(() => {
        setChosen(null);
        setFeedback('none');
        onResult(false);
      }, 1100);
    }
  };

  return (
    <View style={{ flex: 1, gap: 16 }}>
      {/* Перевод */}
      <View style={[styles.translationBox, { backgroundColor: t.bgCard, borderColor: t.border }]}>
        <Text style={[styles.translationText, { color: t.textMuted, fontSize: f.caption }]}>
          {triLang(lang, { ru: 'Вставь пропущенное слово:', uk: 'Встав пропущене слово:', es: 'Elige la palabra que falta:' })}
        </Text>
        <Text style={[styles.translationMain, { color: t.textPrimary, fontSize: f.bodyLg }]}>
          {phraseWithGap}
        </Text>
      </View>

      {/* Варианты */}
      <View style={{ gap: 10 }}>
        {options.map(opt => {
          const isChosen = chosen === opt;
          const isCorrect = opt.toLowerCase() === errorWord.toLowerCase();
          let bg = t.bgCard;
          let bc = t.border;
          let tc = t.textPrimary;
          if (isChosen && feedback === 'correct') { bg = '#40C080' + '22'; bc = '#40C080'; tc = '#40C080'; }
          if (isChosen && feedback === 'wrong')   { bg = '#E05050' + '22'; bc = '#E05050'; tc = '#E05050'; }
          if (!isChosen && feedback !== 'none' && isCorrect) { bg = '#40C080' + '22'; bc = '#40C080'; tc = '#40C080'; }
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => pick(opt)}
              style={[styles.optionBtn, { backgroundColor: bg, borderColor: bc }]}
            >
              <Text style={[styles.optionText, { color: tc, fontSize: f.body }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Основной экран ────────────────────────────────────────────────────────────
export default function TrainerPhrasesSession() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { speak, stop: stopSpeech } = useAudio();

  // E9: инъекция реального TTS в очередь SoundService (SFX → 120мс → TTS);
  // на выходе — отменить отложенную речь и заглушить текущую.
  useEffect(() => {
    setFcTtsSpeaker(speak);
    return () => {
      setFcTtsSpeaker(null);
      cancelPendingFcTts();
      stopSpeech();
    };
  }, [speak, stopSpeech]);

  const [deck, setDeck] = useState<SessionCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  // E5: каркас результата — кэп повторов, журнал ответов, звёзды/XP
  const [repeatCounts, setRepeatCounts] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    summary: SessionOutcomeSummary;
    outcome: AwardStarsOutcome | null;
    xp: number;
  } | null>(null);
  const eventsRef = useRef<SessionAnswerEvent[]>([]);
  const finishingRef = useRef(false);
  const cardShownAtRef = useRef(Date.now());

  useEffect(() => {
    void (async () => {
      // Дневной лимит тренера (§4): free — 1 сессия/день на весь тренер, премиум — безлимит
      const [premium, usedToday] = await Promise.all([
        getVerifiedPremiumStatus().catch(() => false),
        hasUsedFreeSessionToday(),
      ]);
      if (isTrainerSessionLocked(premium, usedToday)) {
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'Бесплатная сессия тренера на сегодня использована. Новая — завтра, с Премиум — без лимита.',
          uk: 'Безкоштовну сесію тренера на сьогодні використано. Нова — завтра, з Преміум — без ліміту.',
          es: 'Ya usaste la sesión gratuita de hoy. Nueva mañana; con Premium, sin límite.',
        }));
        router.replace('/trainer' as any);
        return;
      }
      const items = await getDueItems('phrases', 15);
      if (items.length === 0) { setDone(true); setLoading(false); return; }
      if (!premium) void markFreeSessionUsed();
      setDeck(buildDeck(items));
      cardShownAtRef.current = Date.now();
      setLoading(false);
    })();
  }, [router]);

  const finishSession = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const summary = summarizeSession(eventsRef.current);
    // Звёзды (§4: тренер; word_bank/fill_gap → порог 3★ fill_gap 10с)
    let outcome: AwardStarsOutcome | null = null;
    if (summary.total > 0) {
      outcome = await awardSessionStars('trainer', {
        correct: summary.correct,
        total: summary.total,
        avgAnswerSec: summary.avgAnswerSec,
        inputKind: 'fill_gap',
      }).catch(() => null);
    }
    // XP +5/верный, одним начислением в финале
    let xp = summary.correct * XP_PER_CORRECT;
    if (xp > 0) {
      try {
        const r = await registerXP(xp, 'trainer_answer', '', lang);
        xp = r.finalDelta;
      } catch {}
    }
    setResult({ summary, outcome, xp });
    setDone(true);
  }, [lang]);

  const handleResult = useCallback(async (answeredCorrectly: boolean) => {
    const card = deck[current];
    if (!card) return;

    // E9: SFX/хаптика/озвучка — в режимах в момент ответа (тут был бы лаг 0.7–1.2с)
    if (answeredCorrectly) setCorrect(c => c + 1);
    else setWrong(c => c + 1);
    eventsRef.current.push({
      key: card.item.key,
      correct: answeredCorrectly,
      ms: Date.now() - cardShownAtRef.current,
    });

    // «Ошибка → в конец очереди», максимум 2 повтора карточки (§3.5)
    let nextDeck = deck;
    if (!answeredCorrectly) {
      const rq = requeueAfterMistake(deck, card, card.item.key, repeatCounts);
      nextDeck = rq.queue;
      setDeck(rq.queue);
      setRepeatCounts(rq.repeatCounts);
    }

    await markTrainerResult(card.item.key, 'phrases', answeredCorrectly);

    const next = current + 1;
    if (next >= nextDeck.length) void finishSession();
    else {
      setCurrent(next);
      cardShownAtRef.current = Date.now();
    }
  }, [deck, current, repeatCounts, finishSession]);

  // «Добить: Ещё учу (N)» — второй раунд по ошибочным карточкам
  const handleRetryWrong = useCallback(() => {
    if (!result) return;
    const learn = new Set(result.summary.learnKeys);
    const seen = new Set<string>();
    const retry: SessionCard[] = [];
    for (const c of deck) {
      if (learn.has(c.item.key) && !seen.has(c.item.key)) {
        seen.add(c.item.key);
        retry.push(c);
      }
    }
    if (retry.length === 0) return;
    eventsRef.current = [];
    finishingRef.current = false;
    setRepeatCounts({});
    setDeck(retry);
    setCurrent(0);
    setCorrect(0);
    setWrong(0);
    setResult(null);
    setDone(false);
    cardShownAtRef.current = Date.now();
  }, [result, deck]);

  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#888' }}>…</Text>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (done) {
    const summary = result?.summary ?? summarizeSession(eventsRef.current);
    return (
      <SessionResultScreen
        correct={summary.correct}
        wrong={summary.wrong}
        xpGained={result?.xp ?? 0}
        outcome={result?.outcome ?? null}
        learnLeft={summary.learnKeys.length}
        onRetryWrong={summary.learnKeys.length > 0 ? handleRetryWrong : undefined}
        onDone={() => { hapticTap(); router.back(); }}
        accentColor={ACCENT}
      />
    );
  }

  const card = deck[current];
  const modeLabel = card?.mode === 'fill_gap'
    ? triLang(lang, { ru: 'Вставь слово', uk: 'Встав слово', es: 'Completa' })
    : triLang(lang, { ru: 'Составь фразу', uk: 'Склади фразу', es: 'Forma la frase' });

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => { hapticTap(); router.back(); }} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
              {triLang(lang, { ru: 'Фразы', uk: 'Фрази', es: 'Frases' })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption }}>
              {current + 1} / {deck.length}
            </Text>
          </View>

          {/* Прогресс */}
          <View style={[styles.progressBar, { backgroundColor: t.bgSurface }]}>
            <View style={[styles.progressFill, { backgroundColor: '#40C080', width: `${(current / deck.length) * 100}%` }]} />
          </View>

          {/* Лейбл режима */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>{modeLabel}</Text>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingTop: 8, flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {card?.mode === 'word_bank'
              ? <WordBankMode key={card.item.key + '_wb'} item={card.item} onResult={handleResult} />
              : card && <FillGapMode key={card.item.key + '_fg'} item={card.item} onResult={handleResult} />
            }
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontWeight: '700' },
  progressBar: { height: 4, borderRadius: 2, marginHorizontal: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  translationBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
  },
  translationText: { fontWeight: '600' },
  translationMain: { fontWeight: '700', lineHeight: 24 },
  assemblyBox: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tileText: { fontWeight: '600' },
  checkBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  checkBtnText: { color: '#fff', fontWeight: '800' },
  optionBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  optionText: { fontWeight: '700' },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  doneTitle: { fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  doneStats: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 32,
    width: '100%',
  },
  doneStat: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  doneBtn: { borderRadius: 16, paddingHorizontal: 48, paddingVertical: 14 },
  doneBtnText: { color: '#fff', fontWeight: '800' },
});
