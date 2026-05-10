// ═══════════════════════════════════════════════════════════════════════════
// trainer_arena_session.tsx — Сессия арены: 4 варианта ответа
// Тот же интерфейс что в арене — вопрос с пропуском + 4 кнопки.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import {
  getDueItems,
  markTrainerResult,
  type TrainerItem,
} from './trainer_store';

type BtnState = 'idle' | 'correct' | 'wrong';

export default function TrainerArenaSession() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [items, setItems] = useState<TrainerItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [btnStates, setBtnStates] = useState<BtnState[]>(['idle', 'idle', 'idle', 'idle']);
  const [locked, setLocked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const flashAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void (async () => {
      const loaded = await getDueItems('arena', 15);
      if (loaded.length === 0) { setDone(true); setLoading(false); return; }
      setItems(loaded);
      setLoading(false);
    })();
  }, []);

  const flash = useCallback((ok: boolean) => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.5, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [flashAnim]);

  const pick = useCallback(async (optIdx: number) => {
    if (locked) return;
    const item = items[current];
    if (!item?.arenaQuestion) return;

    setLocked(true);
    const correctAnswer = item.arenaQuestion.correct;
    const options = item.arenaQuestion.options;
    const isOk = options[optIdx] === correctAnswer;

    const newStates: BtnState[] = options.map((opt, i) => {
      if (opt === correctAnswer) return 'correct';
      if (i === optIdx && !isOk) return 'wrong';
      return 'idle';
    });
    setBtnStates(newStates);

    if (isOk) {
      hapticSuccess();
      setCorrect(c => c + 1);
    } else {
      hapticError();
      setWrong(c => c + 1);
    }
    flash(isOk);

    await markTrainerResult(item.key, 'arena', isOk);

    setTimeout(() => {
      const next = current + 1;
      if (next >= items.length) {
        setDone(true);
      } else {
        setCurrent(next);
        setBtnStates(['idle', 'idle', 'idle', 'idle']);
        setLocked(false);
      }
    }, isOk ? 700 : 1100);
  }, [locked, items, current, flash]);

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
    const total = correct + wrong;
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={styles.doneContainer}>
              <Text style={[styles.doneTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
                {triLang(lang, { ru: 'Сессия завершена', uk: 'Сесію завершено', es: 'Sesión terminada' })}
              </Text>
              <View style={[styles.doneStats, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <View style={styles.doneStat}>
                  <Text style={{ color: '#40C080', fontSize: f.numLg, fontWeight: '900' }}>{correct}</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                    {triLang(lang, { ru: 'верно', uk: 'вірно', es: 'correcto' })}
                  </Text>
                </View>
                <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: t.border }} />
                <View style={styles.doneStat}>
                  <Text style={{ color: '#E05050', fontSize: f.numLg, fontWeight: '900' }}>{wrong}</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                    {triLang(lang, { ru: 'ошибок', uk: 'помилок', es: 'errores' })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => { hapticTap(); router.back(); }}
                style={[styles.doneBtn, { backgroundColor: '#E05050' }]}
              >
                <Text style={[styles.doneBtnText, { fontSize: f.body }]}>
                  {triLang(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo' })}
                </Text>
              </TouchableOpacity>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const item = items[current];
  const q = item?.arenaQuestion;
  if (!q) return null;

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
              {triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption }}>
              {current + 1} / {items.length}
            </Text>
          </View>

          {/* Прогресс */}
          <View style={[styles.progressBar, { backgroundColor: t.bgSurface }]}>
            <View style={[styles.progressFill, {
              backgroundColor: '#E05050',
              width: `${(current / items.length) * 100}%`,
            }]} />
          </View>

          <View style={{ flex: 1, padding: 16, gap: 16, justifyContent: 'center' }}>
            {/* Правило/тема (если есть) */}
            {q.rule ? (
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600', textAlign: 'center' }}>
                {q.rule}
              </Text>
            ) : null}

            {/* Вопрос */}
            <Animated.View style={[
              styles.questionBox,
              { backgroundColor: t.bgCard, borderColor: t.border, opacity: flashAnim },
            ]}>
              <Text style={[styles.questionText, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                {q.question}
              </Text>
            </Animated.View>

            {/* Варианты */}
            <View style={{ gap: 10 }}>
              {q.options.map((opt, i) => {
                const state = btnStates[i];
                let bg = t.bgCard;
                let bc = t.border;
                let tc = t.textPrimary;
                if (state === 'correct') { bg = '#40C080' + '22'; bc = '#40C080'; tc = '#40C080'; }
                if (state === 'wrong')   { bg = '#E05050' + '22'; bc = '#E05050'; tc = '#E05050'; }
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => void pick(i)}
                    disabled={locked}
                    style={[styles.optionBtn, { backgroundColor: bg, borderColor: bc }]}
                  >
                    <Text style={[styles.optionText, { color: tc, fontSize: f.body }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
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
  questionBox: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  questionText: { fontWeight: '700', textAlign: 'center', lineHeight: 28 },
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
