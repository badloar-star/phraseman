/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REVIEW SCREEN — Экран интервального повторения (SRS-сессия)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Три живых формата:
 *   • Банк слов — только слова этой фразы, тап по порядку (без лишних плиток).
 *   • Смысл — видно по-английски, выбери верный перевод из 4.
 *   • Вспоминание — видно перевод, набери всю фразу на английском.
 *
 * Откуда берутся данные:
 *   lesson1.tsx → checkAnswer() → recordMistake(phrase.english, phrase.russian, lessonId)
 *   → active_recall.ts сохраняет фразу в target-aware AsyncStorage
 *   → getDueItems(SESSION_LIMIT, { commitSessionOverflow: true }) — сессия + перенос перегруза на завтра
 *
 * Свайп по карточке с переводом — переключение фразы сессии до ответа.
 *
 * После проверки:
 *   Правильно → зелёный фидбэк → markReviewed(true) → XP (registerXP, review_answer) → «Далее» вручную
 *   Неправильно → красный фидбэк + правильный ответ → markReviewed(false) → далее вручную
 *
 * Связь с home.tsx:
 *   После сессии safeRouterBack() → focusTick → countDueItemsToday() → бейдж обновляется
 * ═══════════════════════════════════════════════════════════════════════════
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import SkeletonBlock from '../components/SkeletonShimmer';
import DuoPressable from '../components/DuoPressable';
import { useWordFlash } from '../hooks/use-word-flash';
import PopUpActionButton from '../components/PopUpActionButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState, AppStateStatus, Animated, BackHandler, Dimensions, Easing as SlideEasing, Platform, ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { screenTextOnGradient } from '../constants/theme';
import { monoIcon } from '../constants/monoIcon';
import XpGainBadge from '../components/XpGainBadge';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useScreen } from '../hooks/use-screen';
import { useCorrectSound } from '../hooks/use-correct-sound';
import { useSpeakAnswer } from '../hooks/use-speak-answer';
import {
  getDueItems, markReviewed, RecallItem, removeItem, SESSION_LIMIT,
  getTrainerItems, type TrainerMode,
} from './active_recall';
import { logMistake, type MistakeTokenMeta } from './mistake_log';
import { resolvePhraseMistakeToken, resolveSlotMistake } from './mistake_token_resolver';
import { registerXP } from './xp_manager';
import { safeRouterBack } from './navigation_back';
import ReportErrorButton from '../components/ReportErrorButton';
import {
  buildMeaningOptions,
  evaluateRecallAnswer,
  meaningChoiceIsCorrect,
  pickReviewMode,
  ReviewMode,
  shuffleWordBankTiles,
  tokenizeRecallPhrase,
  type WordBankTile,
} from './review_evaluator';
import { spanishLessonUiStringsActive, spanishSurfacesEnabled } from './spanish_content_gate';
import type { StudyTargetLang } from './study_target_lang_dev';
import { storageStudyTarget } from './target_storage_keys';
import { englishRecallSurface } from './phrase_target_utils';
import { checkCoachToastNeededWithAnalytics, type CoachToastDecision } from './coach_toast_trigger';
import type { PhraseMistakeInput } from './phrase_analytics';
import CoachToast from '../components/CoachToast';
import { frenchTrainerGateCopy, srsReviewContentAvailableForTarget } from './trainer_target_gate';
import BouncyScrollView from '../components/BouncyScrollView';
import { trackEvent } from './analytics';
import { buildLearningReviewAnswerPayload } from './learning_review_analytics';

const { width: SCREEN_W } = Dimensions.get('window');

const CONTENT_W = Math.min(SCREEN_W, 640);
/** Одна страница свайпа подсказки (padding по 16 px у родительского ScrollView). */
const CUE_PAGER_PAGE_W = SCREEN_W - 32;
const REVIEW_BURN_HINT_SHOWN_KEY = 'review_burn_hint_shown_v1';
const safeReviewEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';
const makeReviewSessionId = (): string =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const makeReviewAttemptId = (): string =>
  `ra_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

const REVIEW_TRANSLATION_UNAVAILABLE_HINT: Record<PlannedInterfaceLang, string> = {
  'pt-BR': 'Tradução ainda indisponível para esta frase',
  vi: 'Chưa có bản dịch cho cụm này',
  id: 'Terjemahan frasa ini belum tersedia',
  tr: 'Bu ifade için çeviri henüz yok',
  pl: 'Tłumaczenie tej frazy jest jeszcze niedostępne',
};

const REVIEW_COMPLETION_TITLES: Record<Lang, { strong: string[]; steady: string[]; retry: string[] }> = {
  ru: {
    strong: ['Отлично!', 'Великолепно!', 'Ты машина!', 'Так держать!', 'Мощно! 💪'],
    steady: ['Хорошо!', 'Неплохо!', 'Растёшь!', 'Ещё чуть-чуть — и отлично!'],
    retry: ['Ещё поработаем!', 'Не сдавайся!', 'Повтори и попробуй ещё раз!', 'Ошибки — это опыт! 📖'],
  },
  uk: {
    strong: ['Відмінно!', 'Чудово!', 'Ти машина!', 'Так тримати!', 'Мощно! 💪'],
    steady: ['Добре!', 'Непогано!', 'Зростаєш!', 'Ще трохи — і відмінно!'],
    retry: ['Ще попрацюємо!', 'Не здавайся!', 'Повтори і спробуй ще раз!', 'Помилки — це досвід! 📖'],
  },
  es: {
    strong: ['¡Genial!', '¡Excelente!', '¡Eres una máquina!', '¡Así se hace!', '¡Fuerte! 💪'],
    steady: ['¡Bien!', '¡No está mal!', '¡Sigues mejorando!', '¡Un poco más y genial!'],
    retry: ['¡Seguimos!', '¡No te rindas!', 'Repasa e inténtalo otra vez', '¡De los errores también se aprende! 📖'],
  },
  'pt-BR': {
    strong: ['Excelente!', 'Muito bem!', 'Você mandou muito!', 'Continue assim!', 'Forte! 💪'],
    steady: ['Bom!', 'Nada mal!', 'Você está melhorando!', 'Mais um pouco e fica ótimo!'],
    retry: ['Vamos continuar!', 'Não desista!', 'Revise e tente de novo', 'Também se aprende com os erros! 📖'],
  },
  vi: {
    strong: ['Tuyệt vời!', 'Xuất sắc!', 'Bạn làm rất tốt!', 'Cứ thế nhé!', 'Mạnh mẽ lắm! 💪'],
    steady: ['Tốt!', 'Không tệ!', 'Bạn đang tiến bộ!', 'Thêm chút nữa là tuyệt!'],
    retry: ['Tiếp tục nào!', 'Đừng bỏ cuộc!', 'Ôn lại rồi thử lần nữa', 'Sai cũng là cách học! 📖'],
  },
  id: {
    strong: ['Hebat!', 'Luar biasa!', 'Kamu keren!', 'Pertahankan!', 'Kuat! 💪'],
    steady: ['Bagus!', 'Tidak buruk!', 'Kamu makin berkembang!', 'Sedikit lagi jadi luar biasa!'],
    retry: ['Kita lanjutkan!', 'Jangan menyerah!', 'Ulangi dan coba lagi', 'Dari kesalahan juga belajar! 📖'],
  },
  tr: {
    strong: ['Harika!', 'Mükemmel!', 'Çok iyisin!', 'Böyle devam!', 'Güçlü! 💪'],
    steady: ['İyi!', 'Fena değil!', 'Gelişiyorsun!', 'Biraz daha, harika olacak!'],
    retry: ['Devam ediyoruz!', 'Vazgeçme!', 'Tekrar et ve yeniden dene', 'Hatalardan da öğrenilir! 📖'],
  },
  pl: {
    strong: ['Świetnie!', 'Doskonale!', 'Jesteś świetny!', 'Tak trzymaj!', 'Mocno! 💪'],
    steady: ['Dobrze!', 'Nieźle!', 'Robisz postępy!', 'Jeszcze trochę i będzie świetnie!'],
    retry: ['Działamy dalej!', 'Nie poddawaj się!', 'Powtórz i spróbuj jeszcze raz', 'Na błędach też się uczymy! 📖'],
  },
};

/** Подсказка на карточке: ES только при изучении ES + UI es (dev). */
function recallTranslationHint(item: RecallItem, lang: Lang, studyTarget: StudyTargetLang): string {
  const spanishHint = item.correctAnswerES?.trim() || item.correctAnswer;
  if (spanishLessonUiStringsActive(lang, studyTarget)) return spanishHint;
  const localizedHints: Partial<Record<Lang, string | undefined>> = {
    uk: item.correctAnswerUK,
    'pt-BR': REVIEW_TRANSLATION_UNAVAILABLE_HINT['pt-BR'],
    vi: REVIEW_TRANSLATION_UNAVAILABLE_HINT.vi,
    id: REVIEW_TRANSLATION_UNAVAILABLE_HINT.id,
    tr: REVIEW_TRANSLATION_UNAVAILABLE_HINT.tr,
    pl: REVIEW_TRANSLATION_UNAVAILABLE_HINT.pl,
  };
  const localizedHint = localizedHints[lang]?.trim();
  if (localizedHint) return localizedHint;
  return item.correctAnswer;
}

/** Подпись источника фразы на экране повторения. */
function recallOriginCaption(item: RecallItem | undefined, lang: Lang): string {
  if (!item) return triLang(lang, {
    ru: 'Повторение',
    uk: 'Повторення',
    es: 'Repaso',
    'pt-BR': "Revisão",
    vi: "Ôn tập",
    id: "Ulangan",
    tr: "Tekrar",
    pl: "Powtórka",
  });
  const s = item.source;
  // lessonId 99 — служебный (admin test bench), не показываем его пользователю
  if (item.lessonId === 99) return triLang(lang, {
    ru: 'Повторение',
    uk: 'Повторення',
    es: 'Repaso',
    'pt-BR': "Revisão",
    vi: "Ôn tập",
    id: "Ulangan",
    tr: "Tekrar",
    pl: "Powtórka",
  });
  // cards-2.0 (E8): кастомные карточки и карточки паков в очереди review (§3.7)
  if (s === 'custom') return triLang(lang, { ru: 'Мои карточки', uk: 'Мої картки', es: 'Mis tarjetas' });
  if (s === 'pack') return triLang(lang, { ru: 'Набор карточек', uk: 'Набір карток', es: 'Pack de tarjetas' });
  if (s === 'diagnostic') return triLang(lang, {
    ru: 'Диагностика',
    uk: 'Діагностика',
    es: 'Test de nivel',
    'pt-BR': "Teste de nível",
    vi: "Kiểm tra trình độ",
    id: "Tes level",
    tr: "Seviye testi",
    pl: "Test poziomu",
  });
  if (s === 'exam') {
    return triLang(lang, {
      ru: `Зачёт · урок ${item.lessonId}`,
      uk: `Залік · урок ${item.lessonId}`,
      es: `Examen · lección ${item.lessonId}`,
      'pt-BR': `Teste · aula ${item.lessonId}`,
      vi: `Bài kiểm tra · bài ${item.lessonId}`,
      id: `Ujian · pelajaran ${item.lessonId}`,
      tr: `Sınav · ders ${item.lessonId}`,
      pl: `Test · lekcja ${item.lessonId}`,
    });
  }
  return triLang(lang, {
    ru: `Урок ${item.lessonId}`,
    uk: `Урок ${item.lessonId}`,
    es: `Lección ${item.lessonId}`,
    'pt-BR': `Aula ${item.lessonId}`,
    vi: `Bài ${item.lessonId}`,
    id: `Pelajaran ${item.lessonId}`,
    tr: `Ders ${item.lessonId}`,
    pl: `Lekcja ${item.lessonId}`,
  });
}

function recallCueInstruction(mode: ReviewMode, lang: Lang, studyTarget: StudyTargetLang): string {
  if (mode === 'word_bank') {
    return triLang(lang, {
      ru: 'Соберите фразу: жмите слова по порядку',
      uk: 'Зберіть фразу: натискайте слова по порядку',
      es: 'Forma la frase: toca las palabras en orden',
      'pt-BR': "Monte a frase: toque nas palavras em ordem",
      vi: "Ghép câu: chạm các từ theo đúng thứ tự",
      id: "Susun frasa: ketuk kata sesuai urutan",
      tr: "İfadeyi kur: kelimelere sırayla dokun",
      pl: "Ułóż frazę: stukaj słowa po kolei",
    });
  }
  if (mode === 'meaning_match') {
    return triLang(lang, {
      ru: 'Что это значит? Выбери перевод',
      uk: 'Що це значить? Оберіть переклад',
      es: '¿Qué significa? Elige la traducción',
      'pt-BR': "O que significa? Escolha a tradução",
      vi: "Nó nghĩa là gì? Chọn bản dịch",
      id: "Apa artinya? Pilih terjemahan",
      tr: "Ne anlama geliyor? Çeviriyi seç",
      pl: "Co to znaczy? Wybierz tłumaczenie",
    });
  }
  if (storageStudyTarget(studyTarget) === 'fr') {
    return triLang(lang, {
      ru: 'Вспомните и напишите по-французски',
      uk: 'Згадайте і напишіть французькою',
      es: 'Recuerda y escribe en francés',
      'pt-BR': 'Lembre e escreva em francês',
      vi: 'Nhớ lại và viết bằng tiếng Pháp',
      id: 'Ingat dan tulis dalam bahasa Prancis',
      tr: 'Hatırla ve Fransızca yaz',
      pl: 'Przypomnij sobie i napisz po francusku',
    });
  }
  return triLang(lang, {
    ru: 'Вспомните и напишите по-английски',
    uk: 'Згадайте і напишіть англійською',
    es: 'Recuerda y escribe en inglés',
    'pt-BR': "Lembre e escreva em inglês",
    vi: "Nhớ lại và viết bằng tiếng Anh",
    id: "Ingat dan tulis dalam bahasa Inggris",
    tr: "Hatırla ve İngilizce yaz",
    pl: "Przypomnij sobie i napisz po angielsku",
  });
}

type Status = 'playing' | 'result';

/** Выезд / въезд карточки: симметричный timing, без длинного хвоста у spring. */
const SLIDE_OUT_MS = 175;
const SLIDE_IN_MS = 210;

// ─── Частицы: языки пламени ───────────────────────────────────────────────────
function FlameLickParticle({ x, startY, delay, size, color }: {
  x: number; startY: number; delay: number; size: number; color: string;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0.35);
  const rotate     = useSharedValue(0);

  useEffect(() => {
    const totalDist   = startY + 32 + Math.random() * 70;
    const duration    = 950 + Math.random() * 450;
    const wobbleAmp   = 4 + Math.random() * 10;
    translateY.value  = withDelay(delay, withTiming(-totalDist, { duration, easing: Easing.out(Easing.cubic) }));
    translateX.value  = withDelay(delay, withRepeat(
      withSequence(
        withTiming(wobbleAmp,  { duration: 90 + Math.random() * 40 }),
        withTiming(-wobbleAmp, { duration: 90 + Math.random() * 40 }),
      ),
      Math.ceil(duration / 180) + 2,
      false,
    ));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1,   { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(0.95, { duration: Math.min(400, duration * 0.35) }),
      withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }),
    ));
    scale.value = withDelay(delay, withSequence(
      withSpring(1.15 + Math.random() * 0.2, { damping: 5.5, stiffness: 120 }),
      withTiming(0.2 + Math.random() * 0.15, { duration: duration * 0.6, easing: Easing.in(Easing.quad) }),
    ));
    rotate.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-0.45, { duration: 160 }),
        withTiming(0.45,  { duration: 160 }),
      ),
      -1,
      true,
    ));
    // rotate крутится бесконечно (-1) — гасим на анмаунте, чтобы ворклет не пережил
    // компонент (консистентность с остальным кодом; не баг сам по себе).
    return () => {
      cancelAnimation(rotate);
      cancelAnimation(translateX);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot particle choreography per mount
  }, [delay, startY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}rad` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[style, {
        position: 'absolute',
        left: x - size / 2,
        bottom: startY,
        width: size,
        height: size * 1.45,
        borderRadius: size / 2,
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.85,
        shadowRadius: size * 0.75,
        shadowOffset: { width: 0, height: 0 },
      }]}
    />
  );
}

// ─── Быстрые искры ────────────────────────────────────────────────────────────
function SparkParticle({ x, startY, delay, size, color }: {
  x: number; startY: number; delay: number; size: number; color: string;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(1);

  useEffect(() => {
    const d = 380 + Math.random() * 220;
    const drift = (Math.random() - 0.5) * 30;
    translateY.value = withDelay(delay, withTiming(-(startY + 50 + Math.random() * 40), { duration: d, easing: Easing.out(Easing.quad) }));
    translateX.value = withDelay(delay, withTiming(drift, { duration: d, easing: Easing.inOut(Easing.sin) }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 40 }),
      withTiming(1, { duration: d * 0.5 }),
      withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }),
    ));
    scale.value = withDelay(delay, withSequence(
      withTiming(1.4, { duration: 60 }),
      withTiming(0.2, { duration: d - 60 }),
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot particle choreography per mount
  }, [delay, startY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[style, {
        position: 'absolute',
        left: x - size / 2,
        bottom: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        shadowColor: '#FFF8E0',
        shadowOpacity: 1,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 0 },
      }]}
    />
  );
}

// ─── Серо-белый дым / зола ───────────────────────────────────────────────────
function AshSmokeParticle({ x, startY, delay, size }: { x: number; startY: number; delay: number; size: number }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0.6);

  useEffect(() => {
    const d = 1100 + Math.random() * 500;
    translateY.value = withDelay(delay, withTiming(-(startY + 100 + Math.random() * 60), { duration: d, easing: Easing.out(Easing.quad) }));
    translateX.value = withDelay(delay, withTiming((Math.random() - 0.5) * 40, { duration: d }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(0.45, { duration: 200 }),
      withTiming(0.25, { duration: d * 0.55 }),
      withTiming(0, { duration: 280 }),
    ));
    scale.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 400 }),
      withTiming(1.8, { duration: d - 400 }),
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot particle choreography per mount
  }, [delay, startY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[style, {
        position: 'absolute',
        left: x - size / 2,
        bottom: startY,
        width: size,
        height: size * 0.9,
        borderRadius: size / 2,
        backgroundColor: 'rgba(60, 58, 56, 0.75)',
      }]}
    />
  );
}

// ─── Полноэкранный эффект сжигания карточки ───────────────────────────────────
function BurnCardEffect({
  width,
  height,
  borderRadius,
}: {
  width: number;
  height: number;
  borderRadius: number;
}) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);

  const emberFlicker = useSharedValue(0.5);
  const charDarken   = useSharedValue(0);
  const edgeFire     = useSharedValue(0);

  useEffect(() => {
    emberFlicker.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 70 + Math.random() * 50 }),
        withTiming(0.4, { duration: 80 + Math.random() * 60 }),
        withTiming(0.85, { duration: 60 }),
      ),
      -1,
      false,
    );
    charDarken.value = withSequence(
      withDelay(100, withTiming(1, { duration: 1500, easing: Easing.in(Easing.cubic) })),
    );
    edgeFire.value = withSequence(
      withDelay(50, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })),
      withTiming(0.85, { duration: 1200 }),
    );
    // emberFlicker крутится бесконечно (-1) — гасим на анмаунте.
    return () => cancelAnimation(emberFlicker);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; shared values are stable refs
  }, []);

  const emberStyle = useAnimatedStyle(() => ({ opacity: 0.4 + emberFlicker.value * 0.55 }));
  const charStyle  = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    borderRadius,
    // Под пламенем: сажа не перекрывает огонь (слой ниже частиц).
    backgroundColor: `rgba(8,3,0,${0.08 + charDarken.value * 0.42})`,
  }));
  const edgeStyle  = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    height: 5 + edgeFire.value * 10,
    opacity: 0.25 + edgeFire.value * 0.55,
  }));

  const flameColors   = ['#E02000', '#FF4500', '#FF6B00', '#FF8C00', '#FFAA00', '#FFB020', '#FF3000', '#D43800'];
  const sparkColors   = ['#FFF8E6', '#FFECB0', '#FFD54F', '#FFFDE7'];
  const flames: React.ReactNode[] = [];
  const sparks: React.ReactNode[] = [];
  const smokes: React.ReactNode[] = [];

  for (let i = 0; i < 28; i++) {
    const px    = 6 + Math.random() * (w - 12);
    const py    = Math.random() * h * 0.85;
    const delay = Math.random() * 480;
    const size  = 8 + Math.random() * 22;
    const color = flameColors[Math.floor(Math.random() * flameColors.length)]!;
    flames.push(
      <FlameLickParticle key={`f-${i}`} x={px} startY={py} delay={delay} size={size} color={color} />,
    );
  }
  for (let i = 0; i < 22; i++) {
    const px    = 4 + Math.random() * (w - 8);
    const py    = Math.random() * h * 0.5;
    const delay = Math.random() * 300;
    const size  = 2 + Math.random() * 3.5;
    const color = sparkColors[Math.floor(Math.random() * sparkColors.length)]!;
    sparks.push(
      <SparkParticle key={`s-${i}`} x={px} startY={py} delay={delay} size={size} color={color} />,
    );
  }
  for (let i = 0; i < 10; i++) {
    const px    = 10 + Math.random() * (w - 20);
    const py    = Math.random() * h * 0.4;
    const delay = 200 + Math.random() * 400;
    const size  = 14 + Math.random() * 28;
    smokes.push(
      <AshSmokeParticle key={`a-${i}`} x={px} startY={py} delay={delay} size={size} />,
    );
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: w,
        height: h,
        zIndex: 20,
        overflow: 'hidden',
        borderRadius,
      }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,55,0,0.12)', 'rgba(255,35,0,0.4)', 'rgba(180,20,0,0.75)']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.62 }}
      />
      <Reanimated.View style={emberStyle} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(255,100,0,0.28)', 'rgba(255,60,0,0.5)']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0.2 }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.5 }}
        />
      </Reanimated.View>
      <Reanimated.View style={edgeStyle} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,120,0,0.7)', 'rgba(255,60,0,0.2)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Reanimated.View>
      <Reanimated.View style={charStyle} pointerEvents="none" />
      {flames}
      {smokes}
      {sparks}
    </View>
  );
}

// ─── Компонент ────────────────────────────────────────────────────────────────
export default function ReviewScreen() {
  const router  = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const srsReviewGateOpen = srsReviewContentAvailableForTarget(studyTarget);
  const { playCorrect } = useCorrectSound();
  const { speakAnswer } = useSpeakAnswer();
  const { flashKey, flash } = useWordFlash();
  const { bottomInset } = useScreen();
  // trainerMode и lessonId передаются из trainer.tsx при старте режимной сессии.
  const params = useLocalSearchParams<{
    trainerMode?: string;
    lessonId?: string;
    category?: string;
    trainingId?: string;
  }>();
  const trainerMode = (params.trainerMode ?? 'due') as TrainerMode;
  const trainerLessonId = params.lessonId ? parseInt(params.lessonId, 10) : undefined;
  const trainerCategory = params.category;
  const isCompactPracticeLayout = false;

  // ── Энергия ────────────────────────────────────────────────────────────────
  // Повторение (SRS) теперь тратит энергию как обычные уроки:
  //   • при ошибке (не премиум/не безлимит) — 1 единица (сначала бонусная, см. EnergyContext);
  //   • если на входе энергии 0 — сразу показываем модал;
  //   • при попадании в 0 во время сессии — модал с задержкой 800 мс
  //     (даём отрисовать «Неверно» + правильный ответ);
  //   • при закрытии модала без пополнения — выходим из сессии.
  // Премиум/тестер обходят списание внутри spendOne (isUnlimited).
  const { energy, bonusEnergy, isUnlimited: energyUnlimited, spendOne, energyReady } = useEnergy();
  const energyRef = useRef(energy);
  const energyUnlimitedRef = useRef(energyUnlimited);
  const bonusEnergyRef = useRef(bonusEnergy);
  const spendOneRef = useRef(spendOne);
  useEffect(() => { energyRef.current = energy; }, [energy]);
  useEffect(() => { energyUnlimitedRef.current = energyUnlimited; }, [energyUnlimited]);
  useEffect(() => { bonusEnergyRef.current = bonusEnergy; }, [bonusEnergy]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);

  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);
  /** Совпадает с spendOne(): база + подарочная очередь. */
  const totalPlayEnergy = (): number =>
    energyUnlimitedRef.current ? Number.POSITIVE_INFINITY : energyRef.current + bonusEnergyRef.current;

  // Открываем модал только после реальной загрузки из AsyncStorage (не placeholder MAX_ENERGY).
  useEffect(() => {
    if (!energyReady) return;
    if (energyUnlimited) return;
    if (energy + bonusEnergy <= 0) setNoEnergyModalOpen(true);
  }, [energyReady, energy, bonusEnergy, energyUnlimited]);

  useEffect(() => {
    if (energyUnlimited || energy + bonusEnergy > 0) setNoEnergyModalOpen(false);
  }, [energyUnlimited, energy, bonusEnergy]);

  const onCloseEnergyModal = useCallback(() => {
    setNoEnergyModalOpen(false);
    // Закрыли модал без пополнения — выходим, иначе остаёмся без права списания.
    if (!energyUnlimitedRef.current && energyRef.current + bonusEnergyRef.current <= 0) {
      safeRouterBack(router);
    }
  }, [router]);

  // зачем: системный «Назад» на Android уходил мимо safeRouterBack и вёл себя иначе, чем
  // кнопка в шапке — терялся честный стек навигации (navigation_back.ts), из-за чего после
  // повторения пользователь мог не вернуться на экран, с которого пришёл, и бейдж
  // «к повторению» не пересчитывался по focusTick. Модалка энергии перехватывает первым
  // нажатием, как в lesson1.tsx: сначала закрыть её, а не выходить из сессии.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (noEnergyModalOpen) {
        onCloseEnergyModal();
        return true;
      }
      safeRouterBack(router);
      return true;
    });
    return () => sub.remove();
  }, [noEnergyModalOpen, onCloseEnergyModal, router]);

  // Данные сессии
  const [items,   setItems]   = useState<RecallItem[]>([]);
  const [index,   setIndex]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [done,      setDone]      = useState(false);
  const [correct,   setCorrect]   = useState(0);
  const [wrong,     setWrong]     = useState(0);
  const [totalXP,   setTotalXP]   = useState(0);
  const [coachToast, setCoachToast] = useState<CoachToastDecision | null>(null);
  const wrongPhrasesRef = useRef<PhraseMistakeInput[]>([]);

  // Состояние текущей карточки (без плиточной сборки)
  const [mode, setMode]           = useState<ReviewMode>('word_bank');
  const [bankTiles, setBankTiles] = useState<WordBankTile[]>([]);
  const [nextSlot, setNextSlot]   = useState(0);
  const [meaningOptions, setMeaningOptions] = useState<string[]>([]);
  const [typeText, setTypeText]   = useState('');
  // Ref to the recall-type input, so we can auto-focus it the moment a typing
  // card becomes active — the keyboard opens itself, no extra tap to start.
  const typeInputRef = useRef<TextInput>(null);
  const [pickedChoice, setPickedChoice] = useState<string | null>(null);
  const [status,    setStatus]    = useState<Status>('playing');
  const [wasCorrect,  setWasCorrect]  = useState(false);
  const [canBurn,     setCanBurn]     = useState(false);  // кнопка "сжечь" (правильно за 20с)
  const [burning,     setBurning]     = useState(false);  // идёт анимация сжигания
  const [cardLayout,  setCardLayout]  = useState({ width: CONTENT_W - 32, height: 110 });
  const [burnHintSeen, setBurnHintSeen] = useState(true);

  // Анимации
  const resultAnim    = useRef(new Animated.Value(0)).current;  // появление правильного ответа
  const slideAnim     = useRef(new Animated.Value(0)).current;  // переход между карточками
  const burnTextOp    = useRef(new Animated.Value(1)).current;  // сжигание: текст бледнеет
  const burnCardScale = useRef(new Animated.Value(1)).current;  // сжигание: лёгкое сжатие
  const burnHintAnim  = useRef(new Animated.Value(0)).current;
  const autoTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardStartTime = useRef<number>(0);                      // когда была загружена карточка
  const checkingRef   = useRef(false);                          // защита от двойного вызова checkAnswer
  const userNameRef   = useRef<string | null>(null);             // кэш имени пользователя
  const reviewSessionIdRef = useRef(makeReviewSessionId());
  const reviewAttemptIdRef = useRef(makeReviewAttemptId());
  const reviewSessionStartedAtRef = useRef(0);
  const reviewSessionStartedRef = useRef(false);
  const reviewSessionCompletedRef = useRef(false);
  const persistedAnswerCountRef = useRef(0);
  const persistedCorrectCountRef = useRef(0);
  const plannedItemCountRef = useRef(0);
  const pendingReviewWritesRef = useRef<Promise<unknown>[]>([]);
  const cuePagerRef = useRef<ScrollView | null>(null);
  /** После свайпа пользователем — не дёргаем scrollTo из useEffect (уже на месте). */
  const cuePagerSkipSyncScroll = useRef(false);
  const swipeHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [swipeCueHintVisible, setSwipeCueHintVisible] = useState(false);

  const swipeCueHintEligible =
    !isCompactPracticeLayout && !loading && items.length > 1 && status === 'playing' && !burning;

  useEffect(() => {
    if (!swipeCueHintEligible) {
      if (swipeHintTimerRef.current) {
        clearTimeout(swipeHintTimerRef.current);
        swipeHintTimerRef.current = null;
      }
      return;
    }
    setSwipeCueHintVisible(true);
    swipeHintTimerRef.current = setTimeout(() => {
      setSwipeCueHintVisible(false);
      swipeHintTimerRef.current = null;
    }, 4000);
    return () => {
      if (swipeHintTimerRef.current) {
        clearTimeout(swipeHintTimerRef.current);
        swipeHintTimerRef.current = null;
      }
    };
  }, [swipeCueHintEligible]);

  // Инициализирует задание для карточки (пропуск / выбор / ввод)
  const loadCard = useCallback((item: RecallItem, itemIndex: number, poolItems: RecallItem[]) => {
    checkingRef.current = false;
    reviewAttemptIdRef.current = makeReviewAttemptId();
    const nextMode = pickReviewMode(params.trainerMode, itemIndex, item.phrase);
    setMode(nextMode);
    setPickedChoice(null);
    setTypeText('');
    const poolTrans = poolItems.map(it => recallTranslationHint(it, lang, studyTarget));
    const correctTrans = recallTranslationHint(item, lang, studyTarget);
    if (nextMode === 'word_bank') {
      setBankTiles(shuffleWordBankTiles(item.phrase));
      setNextSlot(0);
      setMeaningOptions([]);
    } else if (nextMode === 'meaning_match') {
      setBankTiles([]);
      setMeaningOptions(buildMeaningOptions(correctTrans, poolTrans));
    } else {
      setBankTiles([]);
      setMeaningOptions([]);
    }
    setStatus('playing');
    setWasCorrect(false);
    setCanBurn(false);
    setBurning(false);
    resultAnim.setValue(0);
    burnTextOp.setValue(1);
    burnCardScale.setValue(1);
    cardStartTime.current = Date.now();
  }, [params.trainerMode, lang, studyTarget, resultAnim, burnTextOp, burnCardScale]);

  // Загружаем фразы для повторения сегодня (один раз при монтировании)
  useEffect(() => {
    const timerRef = autoTimer;
    AsyncStorage.getItem(REVIEW_BURN_HINT_SHOWN_KEY)
      .then(v => setBurnHintSeen(v === '1'))
      .catch(() => setBurnHintSeen(true));
    // Когда запускаем из trainer.tsx с trainerMode — используем getTrainerItems.
    // Стандартный /review без params грузит «due» с commitSessionOverflow.
    const itemsPromise = params.trainerMode
      ? getTrainerItems(trainerMode, SESSION_LIMIT, trainerLessonId, trainerCategory, studyTarget)
      : getDueItems(SESSION_LIMIT, { commitSessionOverflow: true }, studyTarget);
    itemsPromise.then(due => {
      setItems(due);
      setLoading(false);
      if (due.length > 0) {
        loadCard(due[0], 0, due);
        if (!reviewSessionStartedRef.current) {
          reviewSessionStartedAtRef.current = Date.now();
          reviewSessionStartedRef.current = true;
          plannedItemCountRef.current = due.length;
          void trackEvent('learning_review_session_start', {
            schema_version: 1,
            event_id: `${reviewSessionIdRef.current}:start`,
            review_session_id: reviewSessionIdRef.current,
            study_target: studyTarget,
            review_mode: trainerMode,
            planned_item_count: due.length,
            occurred_at_ms: reviewSessionStartedAtRef.current,
          });
        }
      }
    });
    AsyncStorage.getItem('user_name').then(n => { userNameRef.current = n; }).catch(() => {});
    return () => {
      const timer = timerRef.current;
      if (timer) clearTimeout(timer);
    };
  }, [loadCard, params.trainerMode, trainerLessonId, trainerCategory, trainerMode, studyTarget]);

  useEffect(() => () => {
    if (!reviewSessionStartedRef.current || reviewSessionCompletedRef.current) return;
    reviewSessionCompletedRef.current = true;
    const abandonedAtMs = Date.now();
    const pendingWrites = [...pendingReviewWritesRef.current];
    void Promise.all(pendingWrites).then(() => trackEvent('learning_review_session_abandoned', {
      schema_version: 1,
      event_id: `${reviewSessionIdRef.current}:abandoned`,
      review_session_id: reviewSessionIdRef.current,
      study_target: studyTarget,
      review_mode: trainerMode,
      planned_item_count: plannedItemCountRef.current,
      answered_item_count: persistedAnswerCountRef.current,
      correct_item_count: persistedCorrectCountRef.current,
      duration_ms: Math.max(0, abandonedAtMs - reviewSessionStartedAtRef.current),
      abandon_reason: 'screen_unmounted_before_complete',
      occurred_at_ms: abandonedAtMs,
    }));
  }, [studyTarget, trainerMode]);

  const shouldShowBurnHint = status === 'result' && canBurn && !burnHintSeen;

  useEffect(() => {
    if (!shouldShowBurnHint) {
      burnHintAnim.setValue(0);
      return;
    }
    AsyncStorage.setItem(REVIEW_BURN_HINT_SHOWN_KEY, '1').catch(() => {});
    setBurnHintSeen(true);
    burnHintAnim.setValue(0);
    Animated.timing(burnHintAnim, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [burnHintAnim, shouldShowBurnHint]);

  // Если индекс вышел за границы (гонка колбэков анимации / перекрывающиеся переходы),
  // приводим к последней карточке — иначе items[index] undefined → краш в recallOriginCaption.
  useEffect(() => {
    if (loading || items.length === 0) return;
    if (index >= items.length) {
      const last = items.length - 1;
      setIndex(last);
      loadCard(items[last]!, last, items);
    }
  }, [loading, items, index, loadCard]);

  useEffect(() => {
    if (loading || items.length === 0) return;
    if (cuePagerSkipSyncScroll.current) {
      cuePagerSkipSyncScroll.current = false;
      return;
    }
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    const x = clamped * CUE_PAGER_PAGE_W;
    requestAnimationFrame(() => {
      cuePagerRef.current?.scrollTo({ x, animated: false });
    });
  }, [loading, items.length, index]);

  // Сбрасываем анимацию и состояние карточки при возврате из фона —
  // это исправляет зависание кнопок и некорректное отображение после свернувшего приложения
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        // Если slideAnim застрял в ненулевом положении — сбросить
        slideAnim.setValue(0);
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [slideAnim]);

  const onCuePagerMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isCompactPracticeLayout) return;
      if (items.length <= 1) return;
      if (status !== 'playing' || burning) return;
      const page = Math.round(e.nativeEvent.contentOffset.x / CUE_PAGER_PAGE_W);
      const clamped = Math.max(0, Math.min(page, items.length - 1));
      if (clamped === index) return;
      hapticTap();
      cuePagerSkipSyncScroll.current = true;
      setIndex(clamped);
      loadCard(items[clamped]!, clamped, items);
    },
    [isCompactPracticeLayout, items, index, status, burning, loadCard],
  );

  const finishCard = useCallback((ok: boolean, userPick: string | null) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    const item = items[index];
    if (!item) {
      checkingRef.current = false;
      return;
    }
    setPickedChoice(userPick);
    setWasCorrect(ok);
    setStatus('result');

    if (ok) { void hapticSuccess(); playCorrect(); speakAnswer(englishRecallSurface(item.phrase), studyTarget); }
    else void hapticError();

    Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();

    if (ok) {
      setCorrect(c => c + 1);
    } else {
      setWrong(w => w + 1);
    }

    let tokenMeta: MistakeTokenMeta | undefined;
    if (!ok) {
      const reviewPhrase = tokenizeRecallPhrase(item.phrase).join(' ');
      const interactionTokenMeta: MistakeTokenMeta | undefined = mode === 'word_bank'
        ? resolveSlotMistake(reviewPhrase, nextSlot, userPick ?? undefined)
        : mode === 'recall_type'
          ? resolvePhraseMistakeToken(englishRecallSurface(item.phrase), userPick)
          : undefined;
      const storedTokenMeta: MistakeTokenMeta | undefined = item.errorWord || item.category || item.grammarTag
        ? {
            tokenText: item.errorWord,
            expected: item.errorWord,
            rawCategory: item.grammarTag,
            category: item.category,
            grammarTag: item.grammarTag,
            tokenIndex: item.tokenIndex,
          }
        : undefined;
      tokenMeta = interactionTokenMeta || storedTokenMeta
        ? {
            ...storedTokenMeta,
            ...interactionTokenMeta,
            tokenText: interactionTokenMeta?.tokenText ?? storedTokenMeta?.tokenText,
            expected: interactionTokenMeta?.expected ?? storedTokenMeta?.expected,
            rawCategory: interactionTokenMeta?.rawCategory ?? storedTokenMeta?.rawCategory,
            category: interactionTokenMeta?.category ?? storedTokenMeta?.category,
            grammarTag: interactionTokenMeta?.grammarTag ?? storedTokenMeta?.grammarTag,
            tokenIndex: Number.isFinite(interactionTokenMeta?.tokenIndex)
              ? interactionTokenMeta?.tokenIndex
              : storedTokenMeta?.tokenIndex,
          }
        : undefined;
      logMistake(item.phrase, item.lessonId, 'trainer', 'wrong_pick', tokenMeta, studyTarget);
      wrongPhrasesRef.current.push(tokenMeta ? { phrase: item.phrase, ...tokenMeta } : item.phrase);

      // Энергия: тратим 1 единицу за ошибку (сначала бонусная, см. EnergyContext).
      // Модал — когда суммарно нечего было тратить (попали в 0), с задержкой,
      // чтобы успел отрисоваться красный фидбэк + правильный ответ.
      if (!energyUnlimitedRef.current) {
        const totalBefore = energyRef.current + bonusEnergyRef.current;
        spendOneRef.current().then(success => {
          if (!success) return;
          setTimeout(() => {
            const totalAfter = energyRef.current + bonusEnergyRef.current;
            if (totalBefore > 0 && totalAfter <= 0) setNoEnergyModalOpen(true);
          }, 800);
        }).catch(() => {});
      }
    }
    const responseTimeMs = Math.max(0, Date.now() - cardStartTime.current);
    const reviewAttemptId = reviewAttemptIdRef.current;
    const persistedReview = markReviewed(item.phrase, ok, tokenMeta, studyTarget).then((transition) => {
      if (!transition) return;
      persistedAnswerCountRef.current += 1;
      if (transition.correct) persistedCorrectCountRef.current += 1;
      return trackEvent('learning_review_answer', buildLearningReviewAnswerPayload({
        eventId: reviewAttemptId,
        reviewSessionId: reviewSessionIdRef.current,
        reviewAttemptId,
        analyticsItemId: transition.analyticsItemId,
        lessonId: transition.lessonId,
        studyTarget,
        source: transition.source,
        reviewMode: mode,
        contentVersion: undefined,
        correct: transition.correct,
        responseTimeMs,
        actualDelayBucket: transition.actualDelayBucket,
        dueStatus: transition.dueStatus,
        previousRepetitions: transition.previousRepetitions,
        nextRepetitions: transition.nextRepetitions,
        previousIntervalDays: transition.previousIntervalDays,
        nextIntervalDays: transition.nextIntervalDays,
        previousMasteryState: transition.previousMasteryState,
        nextMasteryState: transition.nextMasteryState,
        masteryTransition: transition.masteryTransition,
      }));
    }).catch(() => {});
    pendingReviewWritesRef.current.push(persistedReview);
    void persistedReview.finally(() => {
      pendingReviewWritesRef.current = pendingReviewWritesRef.current.filter(pending => pending !== persistedReview);
    });

    if (ok) {
      const elapsed = Date.now() - cardStartTime.current;
      if (elapsed <= 20_000) setCanBurn(true);
      registerXP(5, 'review_answer', userNameRef.current || '', lang, item.lessonId, {
        eventId: [
          'review',
          safeReviewEventPart(studyTarget),
          safeReviewEventPart(reviewSessionIdRef.current, 32),
          String(item.lessonId),
          safeReviewEventPart(index),
          safeReviewEventPart(englishRecallSurface(item.phrase), 50),
        ].join(':'),
        payload: {
          studyTarget,
          lessonId: item.lessonId,
          phrase: englishRecallSurface(item.phrase),
          mode,
        },
      }).then(result => {
        setTotalXP(prev => prev + result.finalDelta);
      }).catch(() => { setTotalXP(prev => prev + 5); });
    }

  }, [items, index, lang, mode, nextSlot, resultAnim, studyTarget, playCorrect, speakAnswer]);

  const onWordBankTap = useCallback((tile: WordBankTile) => {
    if (status !== 'playing' || burning) return;
    if (!energyUnlimitedRef.current && totalPlayEnergy() <= 0) { setNoEnergyModalOpen(true); return; }
    const item = items[index];
    if (!item) return;
    const n = tokenizeRecallPhrase(item.phrase).length;
    if (tile.slot !== nextSlot) {
      // Неверная плитка → finishCard сам даст error. Лишний tap убран,
      // иначе складывается с error в один сильный удар.
      finishCard(false, tile.text);
      return;
    }
    if (nextSlot + 1 >= n) {
      // Последняя верная плитка → finishCard даст success. Tap не нужен.
      finishCard(true, null);
    } else {
      // Промежуточная верная плитка — это раскладка, лёгкий tap уместен.
      hapticTap();
      setNextSlot(s => s + 1);
      setBankTiles(prev => prev.filter(t => t.slot !== tile.slot));
    }
  }, [status, burning, items, index, nextSlot, finishCard]);

  const onMeaningPick = useCallback((choice: string) => {
    if (status !== 'playing' || burning) return;
    if (!energyUnlimitedRef.current && totalPlayEnergy() <= 0) { setNoEnergyModalOpen(true); return; }
    const item = items[index];
    if (!item) return;
    const correct = recallTranslationHint(item, lang, studyTarget);
    const ok = meaningChoiceIsCorrect(choice, correct);
    // Результат (success/error) идёт из finishCard — лишний tap убран.
    finishCard(ok, choice);
  }, [status, burning, items, index, lang, studyTarget, finishCard]);

  const onSubmitTyped = useCallback(() => {
    if (status !== 'playing' || burning || mode !== 'recall_type') return;
    if (!energyUnlimitedRef.current && totalPlayEnergy() <= 0) { setNoEnergyModalOpen(true); return; }
    const item = items[index];
    if (!item) return;
    const { ok } = evaluateRecallAnswer(typeText, item.phrase);
    // Результат (success/error) идёт из finishCard — лишний tap убран.
    finishCard(ok, typeText.trim() || null);
  }, [status, burning, mode, items, index, typeText, finishCard]);

  // Авто-фокус на поле ввода, как только карточка-набор становится активной:
  // клавиатура открывается сама, юзер печатает сразу — без лишнего тапа по полю.
  // Ключ по index+mode+status: срабатывает на КАЖДОЙ новой наборной карточке,
  // а не только при первом монтировании (одного autoFocus тут мало).
  useEffect(() => {
    if (mode !== 'recall_type' || status !== 'playing' || burning) return;
    // Небольшая задержка — даём слайду/раскладке завершиться, иначе фокус на
    // iOS иногда «съедается» during-layout и клавиатура не поднимается.
    const id = setTimeout(() => typeInputRef.current?.focus(), 120);
    return () => clearTimeout(id);
  }, [mode, status, index, burning]);

  /** Общий слайд влево → смена контента → spring в ноль (и для «Далее», и после сжигания). */
  const runSlideToNext = useCallback((
    applyAfterSlideOut: () => void,
  ) => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    Animated.timing(slideAnim, {
      toValue: -CONTENT_W,
      duration: SLIDE_OUT_MS,
      easing: SlideEasing.out(SlideEasing.cubic),
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(CONTENT_W);
      applyAfterSlideOut();
      // Spring давал визуальный «хвост» ~0.5–1 с в конце; timing — предсказуемо и быстро
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: SLIDE_IN_MS,
        easing: SlideEasing.out(SlideEasing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [slideAnim]);

  // Анимированный переход к следующей карточке
  const advanceCard = () => {
    if (index + 1 >= items.length) {
      runSlideToNext(() => { setDone(true); });
    } else {
      const next = index + 1;
      runSlideToNext(() => {
        setIndex(next);
        loadCard(items[next], next, items);
      });
    }
  };

  // Сжечь карточку — удалить навсегда с анимацией
  const burnCard = () => {
    const item = items[index];
    if (!item) return;
    const fromIndex = index;
    setBurning(true);
    setCanBurn(false);
    hapticTap();
    const newItems = items.filter((_, i) => i !== fromIndex);
    // Не await — сразу огонь; запись в storage не должна вставлять кадр «тишины» перед эффектом
    void removeItem(item.phrase, studyTarget).catch(() => {});

    // Слайд сразу по завершению parallel (без setTimeout(2300) — тот и давал секунду «подвисания»)
    const afterBurn = () => {
      if (newItems.length === 0) {
        runSlideToNext(() => {
          setBurning(false);
          setDone(true);
        });
        return;
      }
      const next = fromIndex >= newItems.length ? newItems.length - 1 : fromIndex;
      runSlideToNext(() => {
        setBurning(false);
        setItems(newItems);
        setIndex(next);
        loadCard(newItems[next], next, newItems);
      });
    };

    Animated.parallel([
      Animated.timing(burnTextOp, { toValue: 0, duration: 880, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(burnCardScale, { toValue: 0.9, duration: 800, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (finished) afterBurn();
    });
  };

  // recall_perfect: трекинг при завершении сессии (один раз)
  // ВАЖНО: этот хук должен быть до любых условных return!
  useEffect(() => {
    if (!done) return;
    if (reviewSessionStartedRef.current && !reviewSessionCompletedRef.current) {
      reviewSessionCompletedRef.current = true;
      const completedAtMs = Date.now();
      const pendingWrites = [...pendingReviewWritesRef.current];
      void Promise.all(pendingWrites).then(() => trackEvent('learning_review_session_complete', {
        schema_version: 1,
        event_id: `${reviewSessionIdRef.current}:complete`,
        review_session_id: reviewSessionIdRef.current,
        study_target: studyTarget,
        review_mode: trainerMode,
        planned_item_count: plannedItemCountRef.current,
        answered_item_count: persistedAnswerCountRef.current,
        correct_item_count: persistedCorrectCountRef.current,
        duration_ms: Math.max(0, completedAtMs - reviewSessionStartedAtRef.current),
        completion_reason: 'all_cards_answered',
        occurred_at_ms: completedAtMs,
      }));
    }
    // Проверяем нужен ли тост точного диагноза
    let cancelled = false;
    void checkCoachToastNeededWithAnalytics(wrongPhrasesRef.current, studyTarget, lang).then((decision) => {
      if (!cancelled && decision.show) setCoachToast(decision);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, lang, studyTarget]);

  // ─── Первый кадр: скелетон, пока грузится список повторения ──────────────
  // Без этого гейта первый кадр (items ещё пуст, loading=true) уверенно рисовал
  // «Нечего повторять!» — ложное состояние на глазах у пользователя (B7).
  if (loading) {
    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: isCompactPracticeLayout ? 8 : 12, gap: 12 }}>
          <TapScale onPress={() => safeRouterBack(router)} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={26} color={sx.primary} />
          </TapScale>
          <View style={{ flex: 1 }}>
            <Text style={{ color: sx.primary, fontSize: isCompactPracticeLayout ? f.bodyLg : f.h2, fontWeight: '700' }} numberOfLines={1}>
              {isCompactPracticeLayout
                ? triLang(lang, {
                  ru: 'Моя практика',
                  uk: 'Моя практика',
                  es: 'Mi práctica',
                  'pt-BR': "Minha prática",
                  vi: "Luyện tập của tôi",
                  id: "Latihan saya",
                  tr: "Pratiğim",
                  pl: "Moja praktyka",
                })
                : triLang(lang, {
                  ru: 'Повторение',
                  uk: 'Повторення',
                  es: 'Repaso',
                  'pt-BR': "Revisão",
                  vi: "Ôn tập",
                  id: "Ulangan",
                  tr: "Tekrar",
                  pl: "Powtórka",
                })}
            </Text>
          </View>
          <SkeletonBlock width={44} height={14} />
        </View>
        <View style={{ height: 4, backgroundColor: t.bgSurface, marginHorizontal: 16, borderRadius: 2, marginBottom: isCompactPracticeLayout ? 8 : 20 }} />
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonBlock width="100%" height={210} borderRadius={20} />
          <SkeletonBlock width="100%" height={52} borderRadius={14} style={{ marginTop: 20 }} />
          <SkeletonBlock width="100%" height={52} borderRadius={14} style={{ marginTop: 10 }} />
          <SkeletonBlock width="100%" height={52} borderRadius={14} style={{ marginTop: 10 }} />
        </View>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ─── Нечего повторять ─────────────────────────────────────────────────────
  if (items.length === 0) {
    const sourceGateCopy = frenchTrainerGateCopy(lang);
    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
          <TapScale onPress={() => safeRouterBack(router)} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={26} color={sx.primary} />
          </TapScale>
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700' }}>
            {triLang(lang, {
              ru: 'Повторение',
              uk: 'Повторення',
              es: 'Repaso',
              'pt-BR': "Revisão",
              vi: "Ôn tập",
              id: "Ulangan",
              tr: "Tekrar",
              pl: "Powtórka",
            })}
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>{srsReviewGateOpen ? '✅' : '🔒'}</Text>
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
            {!srsReviewGateOpen ? sourceGateCopy.title : triLang(lang, {
              ru: 'Нечего повторять!',
              uk: 'Нічого повторювати!',
              es: '¡Nada que repasar por ahora!',
              'pt-BR': "Nada para revisar!",
              vi: "Chưa có gì để ôn!",
              id: "Belum ada yang perlu diulas!",
              tr: "Tekrar edecek bir şey yok!",
              pl: "Nie ma teraz nic do powtórki!",
            })}
          </Text>
          <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            {!srsReviewGateOpen ? sourceGateCopy.body : triLang(lang, {
              ru: 'Допускай ошибки в уроках — они появятся здесь для повторения',
              uk: 'Допускай помилки в уроках — вони з\'являться тут для повторення',
              es: 'Si te equivocas en las lecciones, aquí aparecerán frases para repasar.',
              'pt-BR': "Cometa erros nas aulas: eles aparecerão aqui para revisão.",
              vi: "Nếu bạn mắc lỗi trong bài học, các lỗi đó sẽ xuất hiện ở đây để ôn lại.",
              id: "Jika kamu membuat kesalahan di pelajaran, kesalahan itu akan muncul di sini untuk diulas.",
              tr: "Derslerde hata yaptığında, tekrar için burada görünecekler.",
              pl: "Gdy popełnisz błędy w lekcjach, pojawią się tutaj do powtórki.",
            })}
          </Text>
          <TouchableOpacity
            onPress={() => safeRouterBack(router)}
            style={{ marginTop: 32, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
          >
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Назад',
                uk: 'Назад',
                es: 'Volver',
                'pt-BR': "Voltar",
                vi: "Quay lại",
                id: "Kembali",
                tr: "Geri",
                pl: "Wstecz",
              })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ─── Сессия завершена ─────────────────────────────────────────────────────
  if (done) {
    const total = correct + wrong;
    const pct   = total > 0 ? Math.round((correct / total) * 100) : 0;
    const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📖';
    const _rp = (a: string[]) => a[Math.floor(Math.random() * a.length)];
    const titlePool = pct >= 80
      ? REVIEW_COMPLETION_TITLES[lang].strong
      : pct >= 50
        ? REVIEW_COMPLETION_TITLES[lang].steady
        : REVIEW_COMPLETION_TITLES[lang].retry;
    const title = _rp(titlePool);

    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</Text>
          <Text style={{ color: sx.primary, fontSize: f.numLg, fontWeight: '800', textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ color: sx.second, fontSize: f.h2, fontWeight: '700', marginTop: 8 }}>
            {pct}%
          </Text>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 28 }}>
            <View style={{ alignItems: 'center', backgroundColor: t.correctBg, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16 }}>
              <Text style={{ color: t.correct, fontSize: f.numLg, fontWeight: '800' }}>{correct}</Text>
              <Text style={{ color: t.correct, fontSize: f.caption, fontWeight: '600', marginTop: 2 }}>
                {triLang(lang, {
                  ru: 'Верно',
                  uk: 'Вірно',
                  es: 'Aciertos',
                  'pt-BR': "Corretas",
                  vi: 'Đúng',
                  id: "Benar",
                  tr: "Doğru",
                  pl: "Poprawne",
                })}
              </Text>
            </View>
            <View style={{ alignItems: 'center', backgroundColor: t.wrongBg, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16 }}>
              <Text style={{ color: t.wrong, fontSize: f.numLg, fontWeight: '800' }}>{wrong}</Text>
              <Text style={{ color: t.wrong, fontSize: f.caption, fontWeight: '600', marginTop: 2 }}>
                {triLang(lang, {
                  ru: 'Ошибки',
                  uk: 'Помилки',
                  es: 'Errores',
                  'pt-BR': "Erros",
                  vi: "Lỗi sai",
                  id: "Kesalahan",
                  tr: "Hatalar",
                  pl: 'Błędy',
                })}
              </Text>
            </View>
          </View>
          {totalXP > 0 && (
            <View style={{ marginTop: 20, backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center' }}>
              <XpGainBadge amount={totalXP} visible={true} style={{ color: monoIcon(themeMode, '#F5A623'), fontSize: f.numMd, fontWeight: '800' }} />
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                {triLang(lang, {
                  ru: 'заработано за повторение',
                  uk: 'зароблено за повторення',
                  es: 'XP obtenidas en Repaso',
                  'pt-BR': "XP ganho na revisão",
                  vi: "XP nhận được khi ôn tập",
                  id: "XP yang didapat dari ulangan",
                  tr: "Tekrardan kazanılan XP",
                  pl: "XP zdobyte za powtórkę",
                })}
              </Text>
            </View>
          )}
          <Text style={{ color: sx.muted, fontSize: f.caption, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
            {triLang(lang, {
              ru: 'Фразы с ошибками вернутся завтра',
              uk: 'Фрази з помилками повернуться завтра',
              es: 'Las frases con errores volverán mañana',
              'pt-BR': "Frases com erro voltarão amanhã",
              vi: "Các cụm câu sai sẽ quay lại vào ngày mai",
              id: "Frasa yang salah akan kembali besok",
              tr: "Hatalı ifadeler yarın geri dönecek",
              pl: "Frazy z błędami wrócą jutro",
            })}
          </Text>
          {/* safeRouterBack() -> home.tsx обновит dueCount через focusTick -> бейдж исчезнет */}
          <TouchableOpacity
            onPress={() => safeRouterBack(router)}
            style={{ marginTop: 32, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
          >
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Готово',
                uk: 'Готово',
                es: 'Listo',
                'pt-BR': "Pronto",
                vi: "Xong",
                id: "Selesai",
                tr: "Tamam",
                pl: "Gotowe",
              })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      {coachToast?.show && (
        <CoachToast
          category={coachToast.category}
          labelRu={coachToast.labelRu}
          labelUk={coachToast.labelUk}
          labelEs={coachToast.labelEs}
          labelPtBr={coachToast.labelPtBr}
          labelVi={coachToast.labelVi}
          labelId={coachToast.labelId}
          labelTr={coachToast.labelTr}
          labelPl={coachToast.labelPl}
          mistakeCount={coachToast.mistakeCount}
          weaknessScore={coachToast.weaknessScore}
          priorityScore={coachToast.priorityScore}
          recoveryScore={coachToast.recoveryScore}
          focusWords={coachToast.focusWords}
          microDiagnosisId={coachToast.microDiagnosisId}
          microLabelRu={coachToast.microLabelRu}
          microLabelUk={coachToast.microLabelUk}
          microLabelEs={coachToast.microLabelEs}
          microLabelPtBr={coachToast.microLabelPtBr}
          microLabelVi={coachToast.microLabelVi}
          microLabelId={coachToast.microLabelId}
          microLabelTr={coachToast.microLabelTr}
          microLabelPl={coachToast.microLabelPl}
          diagnosisEvidenceCount={coachToast.diagnosisEvidenceCount}
          onDismiss={() => setCoachToast(null)}
        />
      )}
      </ScreenGradient>
    );
  }

  // ─── Основной экран: плиточная сессия ────────────────────────────────────
  const safeIdx = Math.max(0, Math.min(index, items.length - 1));
  const item = items[safeIdx] ?? items[items.length - 1];
  if (!item) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center' }}>
            {triLang(lang, {
              ru: 'Карточка не загрузилась. Вернись и попробуй снова.',
              uk: 'Не вдалося завантажити картку. Натисни «Назад» і спробуй ще раз.',
              es: 'No se pudo cargar la tarjeta. Pulsa «Atrás» e inténtalo de nuevo.',
              'pt-BR': "Não foi possível carregar o cartão. Toque em \"Voltar\" e tente novamente.",
              vi: "Không thể tải thẻ. Nhấn \"Quay lại\" rồi thử lại.",
              id: "Kartu tidak dapat dimuat. Ketuk \"Kembali\" lalu coba lagi.",
              tr: "Kart yüklenemedi. \"Geri\" düğmesine dokunup tekrar dene.",
              pl: "Nie udało się wczytać karty. Stuknij \"Wstecz\" i spróbuj ponownie.",
            })}
          </Text>
          <TouchableOpacity onPress={() => safeRouterBack(router)} style={{ marginTop: 24, padding: 14 }}>
            <Text style={{ color: sx.primary, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Назад',
                uk: 'Назад',
                es: 'Volver',
                'pt-BR': "Voltar",
                vi: "Quay lại",
                id: "Kembali",
                tr: "Geri",
                pl: "Wstecz",
              })}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }
  const typeBorderColor = status === 'result' ? (wasCorrect ? t.correct : t.wrong) : t.border;
  const typeBg          = status === 'result' ? (wasCorrect ? t.correctBg : t.wrongBg) : t.bgSurface;

  const correctTrans = recallTranslationHint(item, lang, studyTarget);
  const mcOptionStyle = (opt: string) => {
    if (status !== 'result' || pickedChoice == null) {
      return { bg: t.bgCard, border: t.border, color: t.textPrimary, opacity: 1 as number };
    }
    const isAnswer = meaningChoiceIsCorrect(opt, correctTrans);
    const isUser = opt.trim().toLowerCase() === (pickedChoice ?? '').trim().toLowerCase();
    if (isAnswer) {
      return { bg: t.correctBg, border: t.correct, color: t.correct, opacity: 1 as number };
    }
    if (isUser && !wasCorrect) {
      return { bg: t.wrongBg, border: t.wrong, color: t.wrong, opacity: 1 as number };
    }
    return { bg: t.bgSurface, border: t.border, color: t.textMuted, opacity: 0.45 as number };
  };

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1, position: 'relative' }}>

      {/* Хедер: назад + заголовок + счётчик */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: isCompactPracticeLayout ? 8 : 12, gap: 12 }}>
        <TapScale onPress={() => safeRouterBack(router)} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={26} color={sx.primary} />
        </TapScale>
        <View style={{ flex: 1 }}>
          <Text style={{ color: sx.primary, fontSize: isCompactPracticeLayout ? f.bodyLg : f.h2, fontWeight: '700' }} numberOfLines={1}>
            {isCompactPracticeLayout
              ? triLang(lang, {
                ru: 'Моя практика',
                uk: 'Моя практика',
                es: 'Mi práctica',
                'pt-BR': "Minha prática",
                vi: "Luyện tập của tôi",
                id: "Latihan saya",
                tr: "Pratiğim",
                pl: "Moja praktyka",
              })
              : triLang(lang, {
                ru: 'Повторение',
                uk: 'Повторення',
                es: 'Repaso',
                'pt-BR': "Revisão",
                vi: "Ôn tập",
                id: "Ulangan",
                tr: "Tekrar",
                pl: "Powtórka",
              })}
          </Text>
        </View>
        <Text style={{ color: sx.muted, fontSize: f.body, fontWeight: '600' }}>
          {index + 1} / {items.length}
        </Text>
      </View>

      {/* Прогресс-бар */}
      <View style={{ height: 4, backgroundColor: t.bgSurface, marginHorizontal: 16, borderRadius: 2, marginBottom: isCompactPracticeLayout ? 8 : 20 }}>
        <View style={{
          width: `${(Math.max(1, index + 1) / items.length) * 100}%` as any,
          height: '100%', borderRadius: 2, backgroundColor: t.accent,
        }} />
      </View>

      <BouncyScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: (isCompactPracticeLayout ? 6 : 32) + bottomInset }}
        decelerationRate="normal"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isCompactPracticeLayout}
        showsVerticalScrollIndicator={false}
      >
        {/* Источник: урок / квиз / арена / … */}
        <Text style={{ color: sx.muted, fontSize: f.caption, marginBottom: isCompactPracticeLayout ? 6 : 12 }} numberOfLines={1}>
          {recallOriginCaption(item, lang)}
        </Text>

        {/* Весь контент карточки анимируется при переходе (slideAnim) */}
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>


          {/* Карточки подсказок: горизонтальный свайп = выбор фразы сессии (до ответа). */}
          <View style={{ marginBottom: isCompactPracticeLayout ? 10 : 20 }}>
            <ScrollView
              ref={cuePagerRef}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={!isCompactPracticeLayout && status === 'playing' && !burning && items.length > 1}
              decelerationRate="fast"
              keyboardShouldPersistTaps="handled"
              onMomentumScrollEnd={onCuePagerMomentumEnd}
            >
              {items.map((it, i) => {
                const pageMode = pickReviewMode(params.trainerMode, i, it.phrase);
                return (
                <View
                  key={`cue-${it.lessonId}-${englishRecallSurface(it.phrase)}-${i}`}
                  style={{ width: CUE_PAGER_PAGE_W }}
                >
                  <Animated.View
                    onLayout={
                      i === index
                        ? e =>
                            setCardLayout({
                              width: e.nativeEvent.layout.width,
                              height: e.nativeEvent.layout.height,
                            })
                        : undefined
                    }
                    style={{
                      backgroundColor: t.bgCard,
                      borderRadius: isCompactPracticeLayout ? 16 : 20,
                      padding: isCompactPracticeLayout ? 16 : 28,
                      minHeight: isCompactPracticeLayout ? 88 : 110,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 0,
                      borderColor: t.border,
                      overflow: 'hidden',
                      ...(i === index ? { transform: [{ scale: burnCardScale }] } : {}),
                    }}
                  >
                    <Animated.View style={{ opacity: i === index ? burnTextOp : 1, zIndex: 1, alignItems: 'center' }}>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: isCompactPracticeLayout ? 6 : 10 }} numberOfLines={1}>
                        {recallCueInstruction(pageMode, lang, studyTarget)}
                      </Text>
                      <Text
                        style={{ color: t.textPrimary, fontSize: isCompactPracticeLayout ? f.h2 : f.h1, fontWeight: '700', textAlign: 'center', lineHeight: isCompactPracticeLayout ? 25 : 30 }}
                        numberOfLines={isCompactPracticeLayout ? 2 : undefined}
                      >
                        {pageMode === 'meaning_match'
                          ? englishRecallSurface(it.phrase)
                          : recallTranslationHint(it, lang, studyTarget)}
                      </Text>
                    </Animated.View>
                    {i === index && burning && (
                      <BurnCardEffect width={cardLayout.width} height={cardLayout.height} borderRadius={20} />
                    )}
                  </Animated.View>
                </View>
              );
              })}
            </ScrollView>
            {swipeCueHintEligible && swipeCueHintVisible && (
              <Text style={{ color: sx.ghost, fontSize: f.caption, textAlign: 'center', marginTop: 8 }}>
                {triLang(lang, {
                  ru: 'Свайпните карточку влево или вправо, чтобы выбрать другую фразу',
                  uk: 'Свайніть картку вліво або вправо, щоб обрати іншу фразу',
                  es: 'Desliza la tarjeta para elegir otra frase',
                  'pt-BR': "Deslize o cartão para a esquerda ou direita para escolher outra frase",
                  vi: "Vuốt thẻ sang trái hoặc phải để chọn cụm câu khác",
                  id: "Geser kartu ke kiri atau kanan untuk memilih frasa lain",
                  tr: "Başka bir ifade seçmek için kartı sola ya da sağa kaydır",
                  pl: "Przesuń kartę w lewo albo w prawo, aby wybrać inną frazę",
                })}
              </Text>
            )}
          </View>

          {/* Задание: банк слов / выбор перевода / ввод */}
          {mode === 'word_bank' && bankTiles.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isCompactPracticeLayout ? 6 : 10, marginBottom: isCompactPracticeLayout ? 8 : 16, justifyContent: 'center' }}>
              {bankTiles.map(tile => {
                const on = flashKey === `wb-${tile.slot}`;
                return (
                <DuoPressable
                  key={`wb-${tile.slot}`}
                  edgeHeight={5}
                  withHaptic={false}
                  edgeColor={on ? t.accent : 'rgba(0,0,0,0.30)'}
                  onPress={() => { flash(`wb-${tile.slot}`); onWordBankTap(tile); }}
                  disabled={status !== 'playing'}
                  style={{
                    backgroundColor: on ? t.accent : t.bgCard,
                    borderRadius: 14,
                    paddingVertical: isCompactPracticeLayout ? 8 : 12,
                    paddingHorizontal: isCompactPracticeLayout ? 12 : 16,
                    borderWidth: 0,
                    borderColor: on ? t.accent : t.border,
                    opacity: status === 'playing' ? 1 : 0.4,
                  }}
                >
                  <Text style={{ color: on ? (t.correctText ?? '#fff') : t.textPrimary, fontSize: isCompactPracticeLayout ? f.body : f.bodyLg, fontWeight: '700' }} numberOfLines={1}>
                    {tile.text}
                  </Text>
                </DuoPressable>
                );
              })}
            </View>
          )}

          {mode === 'meaning_match' && meaningOptions.length > 0 && (
            <View style={{ gap: isCompactPracticeLayout ? 7 : 10, marginBottom: isCompactPracticeLayout ? 8 : 16 }}>
              {meaningOptions.map((opt, j) => {
                const st = mcOptionStyle(opt);
                const on = flashKey === `mm-${j}`;
                return (
                  <DuoPressable
                    key={`mean-${j}-${opt.slice(0, 20)}`}
                    edgeHeight={5}
                    withHaptic={false}
                    edgeColor={on ? t.accent : 'rgba(0,0,0,0.30)'}
                    onPress={() => { flash(`mm-${j}`); onMeaningPick(opt); }}
                    disabled={status !== 'playing'}
                    style={{
                      backgroundColor: on ? t.accent : st.bg,
                      borderRadius: 14,
                      paddingVertical: isCompactPracticeLayout ? 8 : 12,
                      paddingHorizontal: 14,
                      borderWidth: 0,
                      borderColor: on ? t.accent : st.border,
                      opacity: st.opacity,
                    }}
                  >
                    <Text
                      style={{ alignSelf: 'stretch', color: on ? (t.correctText ?? '#fff') : st.color, fontSize: isCompactPracticeLayout ? f.caption : f.body, fontWeight: on ? '700' : '600', textAlign: 'left', lineHeight: isCompactPracticeLayout ? 18 : 22 }}
                      numberOfLines={isCompactPracticeLayout ? 2 : undefined}
                    >
                      {opt}
                    </Text>
                  </DuoPressable>
                );
              })}
            </View>
          )}

          {mode === 'recall_type' && (
            <View style={{ marginBottom: isCompactPracticeLayout ? 8 : 16 }}>
              <TextInput
                ref={typeInputRef}
                value={typeText}
                onChangeText={setTypeText}
                editable={status === 'playing'}
                placeholder={triLang(lang, {
                  ru: 'Введи ответ…',
                  uk: 'Введіть відповідь…',
                  es: 'Escribe la respuesta…',
                  'pt-BR': "Digite a resposta…",
                  vi: "Nhập câu trả lời…",
                  id: "Masukkan jawaban…",
                  tr: "Cevabı yaz…",
                  pl: "Wpisz odpowiedź…",
                })}
                placeholderTextColor={t.textGhost}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={onSubmitTyped}
                style={{
                  borderWidth: 0,
                  borderColor: typeBorderColor,
                  backgroundColor: typeBg,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: isCompactPracticeLayout ? 10 : 14,
                  fontSize: isCompactPracticeLayout ? f.body : f.bodyLg,
                  color: t.textPrimary,
                  marginBottom: isCompactPracticeLayout ? 8 : 12,
                }}
              />
              {/* Кнопка «Проверить» вынесена во всплывающую снизу PopUpActionButton
                  (после ScrollView). Появляется когда введён текст ответа. */}
            </View>
          )}

          {item && (
            <ReportErrorButton
              screen="review"
              dataId={`review_${englishRecallSurface(item.phrase).replace(/\s+/g,'_').slice(0,40)}`}
              dataText={[
                `EN: ${englishRecallSurface(item.phrase)}`,
                `RU: ${item.correctAnswer}`,
                item.correctAnswerUK ? `UK: ${item.correctAnswerUK}` : '',
                item.correctAnswerES && spanishSurfacesEnabled(lang, studyTarget)
                  ? `ES: ${item.correctAnswerES}`
                  : '',
                `Урок: ${item.lessonId}`,
              ].filter(Boolean).join('\n')}
              style={{ alignSelf: 'flex-end', marginBottom: isCompactPracticeLayout ? 2 : 4 }}
              textColor={sx.muted}
            />
          )}

          {status === 'result' && !wasCorrect && (
            <Animated.View style={{
              opacity: resultAnim,
              backgroundColor: t.correctBg,
              borderRadius: 14,
              padding: isCompactPracticeLayout ? 10 : 14,
              borderLeftWidth: 3,
              borderLeftColor: t.correct,
              marginBottom: isCompactPracticeLayout ? 8 : 16,
            }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 4 }}>
                {triLang(lang, {
                  ru: 'Правильный ответ:',
                  uk: 'Правильна відповідь:',
                  es: 'Respuesta correcta:',
                  'pt-BR': "Resposta correta:",
                  vi: "Đáp án đúng:",
                  id: "Jawaban benar:",
                  tr: "Doğru cevap:",
                  pl: "Poprawna odpowiedź:",
                })}
              </Text>
              {/* Обрезка снята: когда скролл выключен,
                  (scrollEnabled={!isCompactPracticeLayout}), и numberOfLines={2} делал
                  правильный ответ нечитаемым. Тот же баг, что в lesson1.tsx. */}
              <Text style={{ color: t.correct, fontSize: isCompactPracticeLayout ? f.body : f.bodyLg, fontWeight: '600' }}>
                {englishRecallSurface(item.phrase)}
              </Text>
            </Animated.View>
          )}

        </Animated.View>
      </BouncyScrollView>

      {/* Всплывающая снизу кнопка «Проверить» — только в режиме ввода текста,
          появляется когда пользователь ввёл ответ (не в футере, выезжает снизу). */}
      {mode === 'recall_type' && (
        <PopUpActionButton
          visible={status === 'playing' && !burning && typeText.trim().length > 0}
          label={triLang(lang, {
            ru: 'Проверить',
            uk: 'Перевірити',
            es: 'Comprobar',
            'pt-BR': 'Verificar',
            vi: 'Kiểm tra',
            id: 'Periksa',
            tr: 'Kontrol et',
            pl: 'Sprawdź',
          })}
          onPress={onSubmitTyped}
          color={t.accent}
          textColor={t.correctText}
          testID="review-check-typed"
        />
      )}

      {/* Кнопки "Далее" и "Сжечь" — появляются после ответа */}
      {status === 'result' && (
        <View style={{ paddingHorizontal: 16, paddingBottom: (isCompactPracticeLayout ? 10 : 16) + bottomInset, paddingTop: isCompactPracticeLayout ? 4 : 8, gap: isCompactPracticeLayout ? 7 : 10 }}>
          {/* Кнопка "Сжечь" — только если правильно за 20 секунд */}
          {canBurn && (
            <>
              {shouldShowBurnHint && (
                <Animated.Text
                  style={{
                    color: monoIcon(themeMode, '#FFB38A'),
                    fontSize: f.caption,
                    textAlign: 'center',
                    opacity: burnHintAnim,
                    transform: [
                      {
                        translateY: burnHintAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [6, 0],
                        }),
                      },
                    ],
                  }}
                >
                  {triLang(lang, {
                    ru: 'Если сжечь карточку — она больше не появится в повторении',
                    uk: 'Якщо спалити картку — вона більше не з\'явиться у повторенні',
                    es: 'Si quemas la tarjeta, no volverá a aparecer en el repaso',
                    'pt-BR': "Se queimar o cartão, ele não aparecerá mais na revisão",
                    vi: "Nếu đốt thẻ, thẻ này sẽ không xuất hiện lại trong ôn tập",
                    id: "Jika kartu dibakar, kartu ini tidak akan muncul lagi di ulasan",
                    tr: "Kartı yakarsan, tekrarda bir daha görünmez",
                    pl: "Jeśli spalisz kartę, nie pojawi się już w powtórce",
                  })}
                </Animated.Text>
              )}
              <TouchableOpacity
                onPress={burnCard}
                disabled={burning}
                style={{
                  backgroundColor: '#1a0a00',
                  borderRadius: 16,
                  paddingVertical: isCompactPracticeLayout ? 10 : 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  borderWidth: 0,
                  borderColor: '#FF4500',
                }}
              >
                <Text style={{ fontSize: f.bodyLg }}>🔥</Text>
                <Text style={{ color: monoIcon(themeMode, '#FF6B2B'), fontSize: isCompactPracticeLayout ? f.body : f.bodyLg, fontWeight: '700' }}>
                  {triLang(lang, {
                    ru: 'Сжечь карточку',
                    uk: 'Спалити картку',
                    es: 'Quemar tarjeta',
                    'pt-BR': "Queimar cartão",
                    vi: "Đốt thẻ",
                    id: "Bakar kartu",
                    tr: "Kartı yak",
                    pl: "Spal kartę",
                  })}
                </Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            onPress={advanceCard}
            disabled={burning}
            style={{
              backgroundColor: wasCorrect ? t.correct : t.accent,
              borderRadius: 16,
              paddingVertical: isCompactPracticeLayout ? 12 : 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.correctText, fontSize: isCompactPracticeLayout ? f.body : f.bodyLg, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Далее →',
                uk: 'Далі →',
                es: 'Siguiente →',
                'pt-BR': "Próximo →",
                vi: "Tiếp theo →",
                id: "Berikutnya →",
                tr: "İleri →",
                pl: "Dalej →",
              })}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <NoEnergyModal visible={noEnergyModalOpen} onClose={onCloseEnergyModal} />
    </SafeAreaView>
    </ScreenGradient>
  );
}
