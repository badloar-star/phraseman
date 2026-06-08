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
import TapScale from '../components/TapScale';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { safeRouterBack } from './navigation_back';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import SpeakingButton from '../components/SpeakingButton';
import ScreenGradient from '../components/ScreenGradient';
import { TrainerLoadingView, TrainerErrorView } from '../components/TrainerLoadStates';
import ContentWrap from '../components/ContentWrap';
import CompassDepthSurface from '../components/CompassDepthSurface';
import { triLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useCorrectSound } from '../hooks/use-correct-sound';
import {
  getDueItems,
  markTrainerResult,
  trainerTranslationForLang,
  type TrainerItem,
} from './trainer_store';
import { updateMultipleTaskProgress, type TaskType } from './daily_tasks';
import { checkAchievements } from './achievements';
import {
  shuffleWordBankTiles,
  tokenizeRecallPhrase,
  type WordBankTile,
} from './review_evaluator';
import { getLessonData } from './lesson_data_all';
import { consumeTrainerSessionEntry } from './trainer_session';
import { logTrainerDirectGateBlocked } from './firebase';
import TrainerSessionReport from './trainer_session_report';
import { buildTrainerFillGapOptions } from './trainer_fill_gap_options';
import type { LessonWord } from './lesson_data_types';

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

function normalizeFillGapToken(value?: string): string {
  return (value ?? '').toLowerCase().replace(/^[.!?,;:"()[\]{}]+|[.!?,;:"()[\]{}]+$/g, '').trim();
}

function lessonSourceDistractorsForItem(item: TrainerItem, errorWord: string): readonly string[] | undefined {
  if (!item.lessonId || !errorWord) return undefined;
  const phrase = getLessonData(item.lessonId).find(row => row.english.trim() === item.key.trim());
  const rows: readonly LessonWord[] = phrase?.wordsEn ?? phrase?.words ?? [];
  const errorKey = normalizeFillGapToken(errorWord);
  const row = rows.find(word => {
    const correct = normalizeFillGapToken(word.correct || word.text);
    const text = normalizeFillGapToken(word.text);
    return correct === errorKey || text === errorKey;
  });
  return row?.distractors;
}

// ── WordBank режим ────────────────────────────────────────────────────────────
interface WordBankProps {
  item: TrainerItem;
  onResult: (correct: boolean) => void;
}

function WordBankMode({ item, onResult }: WordBankProps) {
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = themeMode === 'compass';
  const { lang } = useLang();
  const { playCorrect } = useCorrectSound();
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
      playCorrect();
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
      <View style={[styles.translationBox, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border, borderRadius: isCompassTheme ? 9 : 16, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
        {isCompassTheme ? <CompassDepthSurface radius={9} quiet /> : null}
        <Text style={[styles.translationText, { color: t.textMuted, fontSize: f.caption }]}>
          {triLang(lang, {
            ru: 'Составь фразу:',
            uk: 'Склади фразу:',
            es: 'Forma la frase:',
            'pt-BR': 'Monte a frase:',
            vi: 'Sắp xếp câu:',
            id: 'Susun frasa:',
            tr: 'Cümleyi kur:',
            pl: 'Ułóż frazę:',
          })}
        </Text>
        <Text style={[styles.translationMain, { color: t.textPrimary, fontSize: f.body }]}>
          {trainerTranslationForLang(item, lang)}
        </Text>
      </View>

      {/* Область сборки */}
      <Animated.View style={[
        styles.assemblyBox,
        isCompassTheme && compassShadow(2),
        { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderColor: isCompassTheme ? (feedback === 'correct' ? COMPASS_RICH.hairlineStrong : feedback === 'wrong' ? COMPASS_RICH.copper : COMPASS_RICH.hairline) : borderColor, borderRadius: isCompassTheme ? 10 : 16, overflow: isCompassTheme ? 'hidden' : 'visible', transform: [{ translateX: shakeAnim }] },
      ]}>
        {isCompassTheme ? <CompassDepthSurface radius={10} selected={feedback !== 'none'} quiet={feedback === 'none'} /> : null}
        {selected.length === 0
          ? <Text style={{ color: t.textMuted, fontSize: f.caption }}>
              {triLang(lang, {
                ru: 'Тут появятся слова…',
                uk: 'Тут з\'являться слова…',
                es: 'Aquí aparecerán las palabras…',
                'pt-BR': 'As palavras aparecerão aqui…',
                vi: 'Các từ sẽ xuất hiện ở đây…',
                id: 'Kata-kata akan muncul di sini…',
                tr: 'Kelimeler burada görünecek…',
                pl: 'Tutaj pojawią się słowa…',
              })}
            </Text>
          : <View style={styles.tilesRow}>
              {selected.map(tile => (
                <TouchableOpacity
                  key={tile.slot}
                  onPress={() => tapSelected(tile)}
                  style={[styles.tile, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : borderColor + '22', borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : borderColor, borderRadius: isCompassTheme ? 8 : 10, overflow: isCompassTheme ? 'hidden' : 'visible' }]}
                >
                  {isCompassTheme ? <CompassDepthSurface radius={8} selected /> : null}
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
            style={[styles.tile, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border, borderRadius: isCompassTheme ? 8 : 10, overflow: isCompassTheme ? 'hidden' : 'visible' }]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
            <Text style={[styles.tileText, { color: t.textPrimary, fontSize: f.body }]}>{tile.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Кнопка проверки */}
      <TouchableOpacity
        onPress={check}
        disabled={selected.length === 0 || feedback !== 'none'}
        style={[styles.checkBtn, {
          backgroundColor: isCompassTheme ? (selected.length > 0 ? COMPASS_RICH.champagne : COMPASS_RICH.charcoalSoft) : selected.length > 0 ? '#4A9EFF' : t.bgSurface,
          borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0,
          borderColor: isCompassTheme ? COMPASS_RICH.hairline : 'transparent',
          borderRadius: isCompassTheme ? 9 : 16,
          overflow: isCompassTheme ? 'hidden' : 'visible',
          opacity: selected.length > 0 ? 1 : 0.4,
        }]}
      >
        {isCompassTheme ? <CompassDepthSurface radius={9} cream={selected.length > 0} quiet={selected.length === 0} /> : null}
        <Text style={[styles.checkBtnText, { fontSize: f.body }]}>
          {triLang(lang, {
            ru: 'Проверить',
            uk: 'Перевірити',
            es: 'Comprobar',
            'pt-BR': 'Verificar',
            vi: 'Kiểm tra',
            id: 'Periksa',
            tr: 'Kontrol et',
            pl: 'Sprawdź',
          })}
        </Text>
      </TouchableOpacity>

      {/* [SPEAKING] Произнести фразу вслух (premium) */}
      <SpeakingButton targetText={correctTokens.join(' ')} lang={lang} variant="pill" />
    </View>
  );
}

// ── Fill Gap режим ────────────────────────────────────────────────────────────
interface FillGapProps {
  item: TrainerItem;
  onResult: (correct: boolean) => void;
}

function FillGapMode({ item, onResult }: FillGapProps) {
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = themeMode === 'compass';
  const { playCorrect } = useCorrectSound();
  const { lang } = useLang();
  const errorWord = item.errorWord ?? '';
  const [options] = useState(() => buildTrainerFillGapOptions({
    correctWord: errorWord,
    phrase: item.key,
    category: item.category,
    grammarTag: item.grammarTag,
    sourceDistractors: lessonSourceDistractorsForItem(item, errorWord),
  }));
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
      playCorrect();
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
      <View style={[styles.translationBox, isCompassTheme && compassShadow(2), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border, borderRadius: isCompassTheme ? 10 : 16, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
        {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
        <Text style={[styles.translationText, { color: t.textMuted, fontSize: f.caption }]}>
          {triLang(lang, {
            ru: 'Вставь пропущенное слово:',
            uk: 'Встав пропущене слово:',
            es: 'Elige la palabra que falta:',
            'pt-BR': 'Escolha a palavra que falta:',
            vi: 'Chọn từ còn thiếu:',
            id: 'Pilih kata yang hilang:',
            tr: 'Eksik kelimeyi seç:',
            pl: 'Wybierz brakujące słowo:',
          })}
        </Text>
        <Text style={[styles.translationHint, { color: t.textMuted, fontSize: f.caption }]}>
          {trainerTranslationForLang(item, lang)}
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
          let bg = isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard;
          let bc = isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border;
          let tc = t.textPrimary;
          let opacity = 1;
          if (isChosen && feedback === 'correct') { bg = isCompassTheme ? COMPASS_RICH.washStrong : t.correctBg; bc = isCompassTheme ? COMPASS_RICH.hairlineStrong : t.correct; tc = isCompassTheme ? COMPASS_RICH.champagne : t.correct; }
          if (isChosen && feedback === 'wrong')   { bg = isCompassTheme ? COMPASS_RICH.copperWash : t.wrongBg; bc = isCompassTheme ? COMPASS_RICH.copper : t.wrong; tc = isCompassTheme ? COMPASS_RICH.peach : t.wrong; }
          if (!isChosen && feedback !== 'none' && isCorrect) { bg = isCompassTheme ? COMPASS_RICH.washStrong : t.correctBg; bc = isCompassTheme ? COMPASS_RICH.hairlineStrong : t.correct; tc = isCompassTheme ? COMPASS_RICH.champagne : t.correct; }
          if (feedback !== 'none' && !isChosen && !isCorrect) opacity = 0.58;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => pick(opt)}
              disabled={feedback !== 'none'}
              activeOpacity={0.82}
              style={[styles.optionBtn, isCompassTheme && compassShadow(feedback === 'none' ? 1 : 2), { backgroundColor: bg, borderColor: bc, borderRadius: isCompassTheme ? 9 : 14, overflow: isCompassTheme ? 'hidden' : 'visible', opacity }]}
            >
              {isCompassTheme ? <CompassDepthSurface radius={9} selected={feedback !== 'none' && (isChosen || isCorrect)} quiet={feedback === 'none'} /> : null}
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
  const isCompassTheme = themeMode === 'compass';
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();

  const [deck, setDeck] = useState<SessionCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessReady, setAccessReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const dailySessionTracked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setLoading(true);
    void (async () => {
      try {
        const allowed = await consumeTrainerSessionEntry('/trainer_phrases_session');
        if (cancelled) return;
        if (!allowed) {
          logTrainerDirectGateBlocked('/trainer_phrases_session');
          router.replace({ pathname: '/premium_modal', params: { context: 'trainer_limit' } } as any);
          return;
        }
        setAccessReady(true);
        const items = await getDueItems('phrases', 15);
        if (cancelled) return;
        if (items.length === 0) { setDone(true); setLoading(false); return; }
        setDeck(buildDeck(items));
        setLoading(false);
      } catch {
        // Сбой загрузки колоды → экран ошибки с retry вместо вечного лоадера.
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router, reloadKey]);

  const handleResult = useCallback(async (answeredCorrectly: boolean) => {
    const card = deck[current];
    if (!card) return;

    const nextCorrect = correct + (answeredCorrectly ? 1 : 0);
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
      checkAchievements({ type: 'trainer_correct', correct: 1 }).catch(() => {});
    }

    const next = current + 1;
    if (next >= deck.length) {
      if (deck.length >= 5 && nextWrong === 0) updates.push({ type: 'recall_perfect', increment: 1 });
      checkAchievements({
        type: 'trainer_session_result',
        correct: nextCorrect,
        wrong: nextWrong,
        total: deck.length,
      }).catch(() => {});
      setDone(true);
    } else {
      setCurrent(next);
    }
    if (updates.length > 0) updateMultipleTaskProgress(updates).catch(() => {});
  }, [deck, current, correct, wrong]);

  if (loadError) {
    return (
      <TrainerErrorView
        lang={lang}
        onRetry={() => { hapticTap(); setReloadKey(k => k + 1); }}
        onExit={() => { hapticTap(); safeRouterBack(router, '/trainer' as any); }}
      />
    );
  }

  if (!accessReady || loading) {
    return <TrainerLoadingView lang={lang} />;
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
              onDone={() => { hapticTap(); safeRouterBack(router, '/trainer'); }}
              onPracticeMore={() => { hapticTap(); router.replace('/trainer' as any); }}
            />
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const card = deck[current];
  const modeLabel = card?.mode === 'fill_gap'
    ? triLang(lang, {
      ru: 'Вставь слово',
      uk: 'Встав слово',
      es: 'Completa',
      'pt-BR': 'Complete',
      vi: 'Điền từ',
      id: 'Lengkapi',
      tr: 'Tamamla',
      pl: 'Uzupełnij',
    })
    : triLang(lang, {
      ru: 'Составь фразу',
      uk: 'Склади фразу',
      es: 'Forma la frase',
      'pt-BR': 'Monte a frase',
      vi: 'Sắp xếp câu',
      id: 'Susun frasa',
      tr: 'Cümleyi kur',
      pl: 'Ułóż frazę',
    });

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={styles.headerRow}>
            <TapScale onPress={() => safeRouterBack(router, '/trainer')} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TapScale>
            <Text style={[styles.headerTitle, { color: sx.primary, fontSize: f.body }]}>
              {triLang(lang, {
                ru: 'Фразы',
                uk: 'Фрази',
                es: 'Frases',
                'pt-BR': 'Frases',
                vi: 'Cụm từ',
                id: 'Frasa',
                tr: 'İfadeler',
                pl: 'Frazy',
              })}
            </Text>
            <Text style={{ color: sx.muted, fontSize: f.caption }}>
              {current + 1} / {deck.length}
            </Text>
          </View>

          {/* Прогресс */}
          <View style={[styles.progressBar, { backgroundColor: t.bgSurface }]}>
            <View style={[styles.progressFill, { backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : '#40C080', width: `${(current / deck.length) * 100}%` }]} />
          </View>

          {/* Лейбл режима */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ color: sx.muted, fontSize: f.caption, fontWeight: '600' }}>{modeLabel}</Text>
          </View>

          <ScrollView
            decelerationRate="normal"
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
  translationHint: { fontWeight: '600', lineHeight: 19 },
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
