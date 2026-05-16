// ═══════════════════════════════════════════════════════════════════════════
// trainer_phrases_session.tsx — Сессия фраз
//
// Два режима чередуются:
//   word_bank  — сборка фразы из перемешанных слов (как в уроке)
//   fill_gap   — вставь пропущенное слово (то слово где была ошибка)
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { screenTextOnGradient } from '../constants/theme';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import {
  getDueItems,
  markTrainerResult,
  type TrainerItem,
} from './trainer_store';
import { updateMultipleTaskProgress, type TaskType } from './daily_tasks';
import {
  shuffleWordBankTiles,
  tokenizeRecallPhrase,
  type WordBankTile,
} from './review_evaluator';
import { consumeTrainerSessionEntry } from './trainer_session';
import { logTrainerDirectGateBlocked } from './firebase';
import TrainerSessionReport from './trainer_session_report';

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
    if (isOk) {
      hapticSuccess();
      setTimeout(() => onResult(true), 700);
    } else {
      hapticError();
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
              {triLang(lang, { ru: 'Тут появятся слова…', uk: 'Тут з\'являться слова…', es: 'Aquí aparecerán las palabras…' })}
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
    if (isOk) {
      hapticSuccess();
      setTimeout(() => onResult(true), 700);
    } else {
      hapticError();
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
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();

  const [deck, setDeck] = useState<SessionCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessReady, setAccessReady] = useState(false);
  const dailySessionTracked = useRef(false);

  useEffect(() => {
    void (async () => {
      const allowed = await consumeTrainerSessionEntry('/trainer_phrases_session');
      if (!allowed) {
        logTrainerDirectGateBlocked('/trainer_phrases_session');
        router.replace({ pathname: '/premium_modal', params: { context: 'trainer_limit' } } as any);
        return;
      }
      setAccessReady(true);
      const items = await getDueItems('phrases', 15);
      if (items.length === 0) { setDone(true); setLoading(false); return; }
      setDeck(buildDeck(items));
      setLoading(false);
    })();
  }, [router]);

  const handleResult = useCallback(async (answeredCorrectly: boolean) => {
    const card = deck[current];
    if (!card) return;

    const nextWrong = wrong + (answeredCorrectly ? 0 : 1);
    if (answeredCorrectly) setCorrect(c => c + 1);
    else setWrong(c => c + 1);

    await markTrainerResult(card.item.key, 'phrases', answeredCorrectly);
    const updates: { type: TaskType; increment: number }[] = [];
    if (!dailySessionTracked.current) {
      dailySessionTracked.current = true;
      updates.push({ type: 'recall_session', increment: 1 });
    }
    if (answeredCorrectly) {
      updates.push({ type: 'recall_answers', increment: 1 });
      updates.push({ type: 'trainer_phrases', increment: 1 });
    }

    const next = current + 1;
    if (next >= deck.length) {
      if (deck.length >= 5 && nextWrong === 0) updates.push({ type: 'recall_perfect', increment: 1 });
      setDone(true);
    } else {
      setCurrent(next);
    }
    if (updates.length > 0) updateMultipleTaskProgress(updates).catch(() => {});
  }, [deck, current, wrong]);

  if (!accessReady || loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#888' }} />
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (done) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <TrainerSessionReport
              queue="phrases"
              correct={correct}
              wrong={wrong}
              total={deck.length || correct + wrong}
              accent="#40C080"
              onDone={() => { hapticTap(); router.back(); }}
              onPracticeMore={() => { hapticTap(); router.replace('/trainer' as any); }}
            />
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
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
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: sx.primary, fontSize: f.body }]}>
              {triLang(lang, { ru: 'Фразы', uk: 'Фрази', es: 'Frases' })}
            </Text>
            <Text style={{ color: sx.muted, fontSize: f.caption }}>
              {current + 1} / {deck.length}
            </Text>
          </View>

          {/* Прогресс */}
          <View style={[styles.progressBar, { backgroundColor: t.bgSurface }]}>
            <View style={[styles.progressFill, { backgroundColor: '#40C080', width: `${(current / deck.length) * 100}%` }]} />
          </View>

          {/* Лейбл режима */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ color: sx.muted, fontSize: f.caption, fontWeight: '600' }}>{modeLabel}</Text>
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
  doneBtn: { borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, width: '100%' },
  doneBtnText: { color: '#fff', fontWeight: '800' },
});
