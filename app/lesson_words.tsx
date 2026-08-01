import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import DuoPressable from '../components/DuoPressable';
import { useWordFlash } from '../hooks/use-word-flash';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  InteractionManager,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddToFlashcard from '../components/AddToFlashcard';
import ContentWrap from '../components/ContentWrap';
import { triLang as pickTriLang, type Lang } from '../constants/i18n';
import { isCorrectAnswer } from '../constants/contractions';
import { screenTextOnGradient } from '../constants/theme';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useEnergy } from '../components/EnergyContext';
import { useScreen } from '../hooks/use-screen';
import NoEnergyModal from '../components/NoEnergyModal';
import CoachToast from '../components/CoachToast';
import {
  cancelScheduledAnimatedStateUpdates,
  scheduleTrackedAnimatedStateUpdate,
  type ScheduledAnimatedStateUpdate,
} from '../components/animationScheduling';
import fk from './feedback/feedback_kit';
import VictoryBurst from '../components/feedback/VictoryBurst';
import { wordsSessionDoneTitle, wordsSessionDoneSubtitle } from './feedback/feedback_i18n';
import { loadFlashcards } from '../hooks/use-flashcards';
import { useAudio } from '../hooks/use-audio';
import { hapticTap } from '../hooks/use-haptics';
import { updateMultipleTaskProgress } from './daily_tasks';
import { loadSettings } from './settings_edu';
import { registerXP } from './xp_manager';
import { addShards } from './shards_system';
import ReportErrorButton from '../components/ReportErrorButton';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import CollectibleDropModal from '../components/CollectibleDropModal';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { maybeRollCollectibleDrop, type CollectibleDropOutcome } from './collectibles/storage';
import { safeRouterBack } from './navigation_back';
import { lessonWordRecognitionPrompt } from './lesson_words_spanish_gloss';
import { LESSON_WORD_ES_BY_EN } from './lesson_words_es_by_en';
import { logMistake } from './mistake_log';
import { recordWordMistake, activateWordForTrainer } from './trainer_store';
import { checkCoachToastNeededWithAnalytics, type CoachToastDecision } from './coach_toast_trigger';
import type { PhraseMistakeInput } from './phrase_analytics';
import { bumpStatsDaily } from './stats_daily_breakdown';
import { LESSON_DATA } from './lesson_data_all';
import { openLessonGateByRuntime, shouldBlockLessonAccess } from './lesson_premium_gate';
import { buildLessonWordOptions } from './lesson_word_options';
import { useStudyTarget } from '../components/StudyTargetContext';
import {
  lessonWordsKey,
  lessonWordsShardsGrantedKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import { frenchVocabularyGateCopy, vocabularyContentAvailableForTarget } from './vocabulary_target_gate';
import { loadFrenchRemoteLessonWordBank } from './french_lesson_words_remote_runtime';

import { noAndroidOutline } from '../constants/androidGlow';
const lessonWordsProgressCache = new Map<string, Record<string, number>>();

const safeVocabularyEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

function parseLessonWordCounts(raw: string | null, lessonId: number): Record<string, number> {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    let counts: Record<string, number> = {};
    if (Array.isArray(data)) {
      data.forEach((w: string) => { counts[w] = REQUIRED; });
    } else if (data && typeof data === 'object') {
      counts = data;
    }
    if (lessonId === 1 && Object.values(counts).some(c => c >= REQUIRED)) {
      for (const p of ['I', 'you', 'he', 'she', 'we', 'it']) {
        if (!counts[p] || counts[p] < REQUIRED) counts[p] = REQUIRED;
      }
    }
    return mergeLegacyPluralLessonWordCounts(counts).counts;
  } catch {
    return {};
  }
}

export async function primeAllLessonWordsFromStorageOnAppLaunch(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const lessonIds = Array.from(LESSONS_WITH_WORDS);
  const keys = lessonIds.map(id => lessonWordsKey(id, studyTarget));
  const entries = await AsyncStorage.multiGet(keys);
  entries.forEach(([key, raw], index) => {
    lessonWordsProgressCache.set(key, parseLessonWordCounts(raw, lessonIds[index] ?? 1));
  });
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const isTrainingCard = (card: TrainingQueueItem | undefined | null): card is TrainingQueueItem =>
  !!card?.word?.en && Number.isInteger(card.roundIndex);

const sanitizeTrainingQueue = (queue: Array<TrainingQueueItem | undefined | null>): TrainingQueueItem[] =>
  queue.filter(isTrainingCard);

const shuffleNoConsecutive = (arr: Array<TrainingQueueItem | undefined | null>): TrainingQueueItem[] => {
  const result = shuffle(sanitizeTrainingQueue(arr));
  for (let i = 1; i < result.length; i++) {
    const currentWord = result[i]?.word?.en;
    const previousWord = result[i - 1]?.word?.en;
    if (!currentWord || !previousWord) continue;
    if (currentWord === previousWord) {
      for (let j = i + 1; j < result.length; j++) {
        if (result[j]?.word?.en && result[j].word.en !== previousWord) {
          [result[i], result[j]] = [result[j], result[i]];
          break;
        }
      }
    }
  }
  return result;
};

const REQUIRED = 3;
const POINTS_PER_CORRECT = 5;

const vocabularyStepBaseXP = (prevCount: number): number => {
  const clampedPrevCount = Math.min(Math.max(0, prevCount), REQUIRED);
  if (clampedPrevCount >= REQUIRED) return 0;
  return POINTS_PER_CORRECT;
};

/**
 * После верного: почти сразу (озвучка не блокирует таймер — вынесена в конец callback).
 * Неверно: дольше, чтобы увидеть ошибку.
 */
const ANSWER_FEEDBACK_MS = { correct: 500, wrong: 1500 } as const;

type POS = 'pronouns'|'verbs'|'irregular_verbs'|'adjectives'|'adverbs'|'nouns'|'prepositions'|'conjunctions'|'articles'|'phrases';
interface Word {
  en:string;
  ru:string;
  uk:string;
  es:string;
  'pt-BR'?: string;
  vi?: string;
  id?: string;
  tr?: string;
  pl?: string;
  pos:POS;
  context?:string;
  definition?:string;
}

function prioritizeQaFocusWords(words: Word[], focusParam?: string | string[]): Word[] {
  if (!__DEV__) return words;
  const raw = Array.isArray(focusParam) ? focusParam.join(',') : focusParam;
  const focus = raw
    ?.split(',')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean);
  if (!focus?.length) return words;

  const rank = new Map(focus.map((word, index) => [word, index]));
  const focused: Word[] = [];
  const rest: Word[] = [];
  for (const word of words) {
    if (rank.has(word.en.toLowerCase())) focused.push(word);
    else rest.push(word);
  }
  focused.sort((a, b) => (rank.get(a.en.toLowerCase()) ?? 0) - (rank.get(b.en.toLowerCase()) ?? 0));
  return focused.length ? [...focused, ...rest] : words;
}

function vocabularyProgressMetrics(
  words: Word[],
  counts: Record<string, number>,
): { correctSteps: number; totalSteps: number; fullyLearned: number; pct: number } {
  const fullyLearned = words.filter(w => (counts[w.en] ?? 0) >= REQUIRED).length;
  const totalSteps = words.length;
  const correctSteps = fullyLearned;
  const pct = totalSteps > 0 ? Math.min(100, Math.round((correctSteps / totalSteps) * 100)) : 0;
  return { correctSteps, totalSteps, fullyLearned, pct };
}

const POS_LABELS_RU: Record<POS,string> = {
  pronouns:'Местоимения', verbs:'Глаголы (to-be)', irregular_verbs:'Неправильные глаголы', adjectives:'Прилагательные',
  adverbs:'Наречия', nouns:'Существительные', prepositions:'Предлоги', conjunctions:'Союзы', articles:'Артикли', phrases:'Конструкции',
};
const POS_LABELS_UK: Record<POS,string> = {
  pronouns:'Займенники', verbs:'Дієслова (to-be)', irregular_verbs:'Неправильні дієслова', adjectives:'Прикметники',
  adverbs:'Прислівники', nouns:'Іменники', prepositions:'Прийменники', conjunctions:'Сполучники', articles:'Артиклі', phrases:'Конструкції',
};
const POS_LABELS_ES: Record<POS,string> = {
  pronouns:'Pronombres', verbs:'Verbos (to-be)', irregular_verbs:'Verbos irregulares', adjectives:'Adjetivos',
  adverbs:'Adverbios', nouns:'Sustantivos', prepositions:'Preposiciones', conjunctions:'Conjunciones', articles:'Artículos', phrases:'Construcciones',
};
const POS_LABELS_PT_BR: Record<POS,string> = {
  pronouns:'Pronomes', verbs:'Verbos (to-be)', irregular_verbs:'Verbos irregulares', adjectives:'Adjetivos',
  adverbs:'Advérbios', nouns:'Substantivos', prepositions:'Preposições', conjunctions:'Conjunções', articles:'Artigos', phrases:'Construções',
};
const POS_LABELS_VI: Record<POS,string> = {
  pronouns:'Đại từ', verbs:'Động từ (to-be)', irregular_verbs:'Động từ bất quy tắc', adjectives:'Tính từ',
  adverbs:'Trạng từ', nouns:'Danh từ', prepositions:'Giới từ', conjunctions:'Liên từ', articles:'Mạo từ', phrases:'Cấu trúc',
};
const POS_LABELS_ID: Record<POS,string> = {
  pronouns:'Kata ganti', verbs:'Kata kerja (to-be)', irregular_verbs:'Kata kerja tak beraturan', adjectives:'Kata sifat',
  adverbs:'Kata keterangan', nouns:'Kata benda', prepositions:'Preposisi', conjunctions:'Konjungsi', articles:'Artikel', phrases:'Konstruksi',
};
const POS_LABELS_TR: Record<POS,string> = {
  pronouns:'Zamirler', verbs:'Fiiller (to-be)', irregular_verbs:'Düzensiz fiiller', adjectives:'Sıfatlar',
  adverbs:'Zarflar', nouns:'İsimler', prepositions:'Edatlar', conjunctions:'Bağlaçlar', articles:'Artikeller', phrases:'Yapılar',
};
const POS_LABELS_PL: Record<POS,string> = {
  pronouns:'Zaimki', verbs:'Czasowniki (to-be)', irregular_verbs:'Czasowniki nieregularne', adjectives:'Przymiotniki',
  adverbs:'Przysłówki', nouns:'Rzeczowniki', prepositions:'Przyimki', conjunctions:'Spójniki', articles:'Przedimki', phrases:'Konstrukcje',
};

const FUNCTION_WORDS: Record<string, Word> = {
  a: { en: 'a', ru: 'неопределённый артикль', uk: 'неозначений артикль', es: 'un / una', 'pt-BR': 'um / uma', vi: 'mạo từ không xác định', id: 'artikel tak tentu', tr: 'belirsiz artikel', pl: 'przedimek nieokreślony', pos: 'articles' },
  an: { en: 'an', ru: 'неопределённый артикль перед гласной', uk: 'неозначений артикль перед голосною', es: 'un / una', 'pt-BR': 'um / uma antes de som vocálico', vi: 'mạo từ không xác định trước âm nguyên âm', id: 'artikel tak tentu sebelum bunyi vokal', tr: 'ünlü ses öncesi belirsiz artikel', pl: 'przedimek nieokreślony przed samogłoską', pos: 'articles' },
  the: { en: 'the', ru: 'определённый артикль', uk: 'означений артикль', es: 'el / la / los / las', 'pt-BR': 'artigo definido', vi: 'mạo từ xác định', id: 'artikel tertentu', tr: 'belirli artikel', pl: 'przedimek określony', pos: 'articles' },
  about: { en: 'about', ru: 'о / про', uk: 'про', es: 'sobre / acerca de', 'pt-BR': 'sobre / a respeito de', vi: 'về / khoảng', id: 'tentang / sekitar', tr: 'hakkında / yaklaşık', pl: 'o / około', pos: 'prepositions' },
  above: { en: 'above', ru: 'над / выше', uk: 'над / вище', es: 'encima de', 'pt-BR': 'acima de', vi: 'ở trên / cao hơn', id: 'di atas / lebih tinggi dari', tr: 'üstünde / daha yukarıda', pl: 'nad / powyżej', pos: 'prepositions' },
  across: { en: 'across', ru: 'через / поперёк', uk: 'через / упоперек', es: 'a través de', 'pt-BR': 'através de / do outro lado de', vi: 'qua / ngang qua', id: 'melintasi / di seberang', tr: 'karşıya / boyunca', pl: 'przez / w poprzek', pos: 'prepositions' },
  after: { en: 'after', ru: 'после', uk: 'після', es: 'después de', 'pt-BR': 'depois de', vi: 'sau', id: 'setelah', tr: 'sonra', pl: 'po', pos: 'prepositions' },
  against: { en: 'against', ru: 'против / к', uk: 'проти / до', es: 'contra', 'pt-BR': 'contra / encostado em', vi: 'chống lại / tựa vào', id: 'melawan / menempel pada', tr: 'karşı / dayanmış', pl: 'przeciw / o', pos: 'prepositions' },
  along: { en: 'along', ru: 'вдоль', uk: 'уздовж', es: 'a lo largo de', 'pt-BR': 'ao longo de', vi: 'dọc theo', id: 'sepanjang', tr: 'boyunca', pl: 'wzdłuż', pos: 'prepositions' },
  among: { en: 'among', ru: 'среди', uk: 'серед', es: 'entre', 'pt-BR': 'entre / no meio de', vi: 'giữa nhiều người hoặc vật', id: 'di antara banyak hal/orang', tr: 'arasında', pl: 'wśród', pos: 'prepositions' },
  around: { en: 'around', ru: 'вокруг / около', uk: 'навколо / близько', es: 'alrededor de', 'pt-BR': 'ao redor de / por volta de', vi: 'xung quanh / khoảng', id: 'di sekitar / kira-kira', tr: 'etrafında / yaklaşık', pl: 'wokół / około', pos: 'prepositions' },
  as: { en: 'as', ru: 'как / в качестве', uk: 'як / у ролі', es: 'como', 'pt-BR': 'como / na função de', vi: 'như / với vai trò là', id: 'sebagai / seperti', tr: 'olarak / gibi', pl: 'jako / gdy', pos: 'conjunctions' },
  at: { en: 'at', ru: 'в / у / на (точка)', uk: 'у / в / на (точка)', es: 'en / a', 'pt-BR': 'em / a (ponto)', vi: 'ở / tại một điểm', id: 'di / pada titik tertentu', tr: '-de / belirli noktada', pl: 'w / przy / o (punkt)', pos: 'prepositions' },
  before: { en: 'before', ru: 'до / перед', uk: 'до / перед', es: 'antes de', 'pt-BR': 'antes de', vi: 'trước', id: 'sebelum', tr: 'önce', pl: 'przed', pos: 'prepositions' },
  behind: { en: 'behind', ru: 'за / позади', uk: 'за / позаду', es: 'detrás de', 'pt-BR': 'atrás de', vi: 'phía sau', id: 'di belakang', tr: 'arkasında', pl: 'za / z tyłu', pos: 'prepositions' },
  below: { en: 'below', ru: 'ниже', uk: 'нижче', es: 'debajo de', 'pt-BR': 'abaixo de', vi: 'bên dưới / thấp hơn', id: 'di bawah / lebih rendah dari', tr: 'altında / daha aşağıda', pl: 'poniżej', pos: 'prepositions' },
  between: { en: 'between', ru: 'между', uk: 'між', es: 'entre', 'pt-BR': 'entre dois ou mais pontos', vi: 'giữa hai hoặc vài điểm', id: 'di antara dua atau beberapa hal', tr: 'iki ya da birkaç şey arasında', pl: 'między', pos: 'prepositions' },
  by: { en: 'by', ru: 'у / рядом / кем-то', uk: 'біля / кимось', es: 'por / junto a', 'pt-BR': 'por / perto de / feito por', vi: 'bởi / gần / bằng', id: 'oleh / di dekat / dengan', tr: 'tarafından / yanında / ile', pl: 'przez / obok / przy', pos: 'prepositions' },
  down: { en: 'down', ru: 'вниз', uk: 'вниз', es: 'abajo', 'pt-BR': 'para baixo', vi: 'xuống / xuống dưới', id: 'turun / ke bawah', tr: 'aşağı / aşağıya', pl: 'w dół', pos: 'prepositions' },
  during: { en: 'during', ru: 'во время', uk: 'під час', es: 'durante', 'pt-BR': 'durante', vi: 'trong khi / trong suốt', id: 'selama', tr: 'sırasında / boyunca', pl: 'podczas / w trakcie', pos: 'prepositions' },
  for: { en: 'for', ru: 'для / за / в течение', uk: 'для / за / протягом', es: 'para / por', 'pt-BR': 'para / por / durante', vi: 'cho / trong khoảng thời gian', id: 'untuk / selama', tr: 'için / boyunca', pl: 'dla / przez', pos: 'prepositions' },
  from: { en: 'from', ru: 'из / от / с', uk: 'з / від', es: 'de / desde', 'pt-BR': 'de / desde', vi: 'từ', id: 'dari', tr: '-den / -dan', pl: 'z / od', pos: 'prepositions' },
  in: { en: 'in', ru: 'в / внутри', uk: 'у / в / всередині', es: 'en / dentro de', 'pt-BR': 'em / dentro de', vi: 'trong / bên trong', id: 'di dalam / di', tr: 'içinde / -de', pl: 'w / wewnątrz', pos: 'prepositions' },
  inside: { en: 'inside', ru: 'внутри', uk: 'всередині', es: 'dentro de', 'pt-BR': 'dentro de', vi: 'bên trong', id: 'di dalam', tr: 'içinde', pl: 'wewnątrz', pos: 'prepositions' },
  into: { en: 'into', ru: 'внутрь / в', uk: 'всередину / у', es: 'a / dentro de', 'pt-BR': 'para dentro de', vi: 'vào bên trong', id: 'ke dalam', tr: 'içine / içeri', pl: 'do środka / w', pos: 'prepositions' },
  like: { en: 'like', ru: 'как / похожий на', uk: 'як / схожий на', es: 'como', 'pt-BR': 'como / parecido com', vi: 'như / giống', id: 'seperti / mirip dengan', tr: 'gibi / benzer', pl: 'jak / podobny do', pos: 'prepositions' },
  near: { en: 'near', ru: 'рядом / около', uk: 'поруч / біля', es: 'cerca de', 'pt-BR': 'perto de', vi: 'gần', id: 'dekat', tr: 'yakınında', pl: 'blisko / obok', pos: 'prepositions' },
  of: { en: 'of', ru: 'из / от / принадлежность', uk: 'з / від / належність', es: 'de', 'pt-BR': 'de / pertencente a', vi: 'của / thuộc về', id: 'dari / milik', tr: '-in / aitlik', pl: 'z / od / przynależność', pos: 'prepositions' },
  off: { en: 'off', ru: 'с / прочь / выключено', uk: 'з / геть / вимкнено', es: 'fuera / apagado', 'pt-BR': 'fora / desligado', vi: 'ra khỏi / tắt', id: 'lepas / mati', tr: 'kapalı / üzerinden', pl: 'z / wyłączony / precz', pos: 'prepositions' },
  on: { en: 'on', ru: 'на / вкл.', uk: 'на / увімкнено', es: 'en / sobre', 'pt-BR': 'em / sobre / ligado', vi: 'trên / đang bật', id: 'di atas / menyala', tr: 'üzerinde / açık', pl: 'na / włączony', pos: 'prepositions' },
  onto: { en: 'onto', ru: 'на поверхность', uk: 'на поверхню', es: 'sobre / encima de', 'pt-BR': 'para cima de / sobre', vi: 'lên trên bề mặt', id: 'ke atas permukaan', tr: 'üstüne / yüzeye doğru', pl: 'na powierzchnię', pos: 'prepositions' },
  out: { en: 'out', ru: 'наружу / вне', uk: 'назовні / поза', es: 'fuera', 'pt-BR': 'para fora / fora', vi: 'ra ngoài / ở ngoài', id: 'keluar / di luar', tr: 'dışarı / dışında', pl: 'na zewnątrz / poza', pos: 'prepositions' },
  outside: { en: 'outside', ru: 'снаружи / за пределами', uk: 'зовні / поза', es: 'fuera de', 'pt-BR': 'fora de / do lado de fora', vi: 'bên ngoài / ngoài phạm vi', id: 'di luar / di bagian luar', tr: 'dışında / dışarıda', pl: 'na zewnątrz / poza', pos: 'prepositions' },
  over: { en: 'over', ru: 'над / через / более', uk: 'над / через / понад', es: 'sobre / por encima de', 'pt-BR': 'sobre / por cima de / mais de', vi: 'phía trên / qua / hơn', id: 'di atas / melewati / lebih dari', tr: 'üzerinde / üzerinden / fazla', pl: 'nad / przez / ponad', pos: 'prepositions' },
  through: { en: 'through', ru: 'через / сквозь', uk: 'через / крізь', es: 'a través de', 'pt-BR': 'através de / por dentro de', vi: 'xuyên qua / thông qua', id: 'melalui / menembus', tr: 'içinden / boyunca', pl: 'przez / poprzez', pos: 'prepositions' },
  to: { en: 'to', ru: 'к / в / частица инфинитива', uk: 'до / у / частка інфінітива', es: 'a / para', 'pt-BR': 'para / a / marcador do infinitivo', vi: 'đến / để / dấu hiệu nguyên mẫu', id: 'ke / untuk / penanda infinitive', tr: '-e / için / infinitive işareti', pl: 'do / dla / znacznik bezokolicznika', pos: 'prepositions' },
  under: { en: 'under', ru: 'под', uk: 'під', es: 'debajo de', 'pt-BR': 'embaixo de / sob', vi: 'dưới', id: 'di bawah', tr: 'altında', pl: 'pod', pos: 'prepositions' },
  until: { en: 'until', ru: 'до тех пор пока / до', uk: 'доки / до', es: 'hasta', 'pt-BR': 'até', vi: 'cho đến khi / đến', id: 'sampai / hingga', tr: '-e kadar', pl: 'aż do / dopóki', pos: 'prepositions' },
  up: { en: 'up', ru: 'вверх / до конца', uk: 'вгору / до кінця', es: 'arriba', 'pt-BR': 'para cima / até o fim', vi: 'lên / đến hết', id: 'naik / sampai selesai', tr: 'yukarı / tamamen', pl: 'w górę / do końca', pos: 'prepositions' },
  with: { en: 'with', ru: 'с / вместе с', uk: 'з / разом із', es: 'con', 'pt-BR': 'com / junto com', vi: 'với / cùng với', id: 'dengan / bersama', tr: 'ile / birlikte', pl: 'z / razem z', pos: 'prepositions' },
  without: { en: 'without', ru: 'без', uk: 'без', es: 'sin', 'pt-BR': 'sem', vi: 'không có / thiếu', id: 'tanpa', tr: 'olmadan / -siz', pl: 'bez', pos: 'prepositions' },
  and: { en: 'and', ru: 'и', uk: 'і / та', es: 'y', 'pt-BR': 'e', vi: 'và', id: 'dan', tr: 've', pl: 'i / oraz', pos: 'conjunctions' },
  but: { en: 'but', ru: 'но', uk: 'але', es: 'pero', 'pt-BR': 'mas / porém', vi: 'nhưng', id: 'tetapi / tapi', tr: 'ama / fakat', pl: 'ale', pos: 'conjunctions' },
  because: { en: 'because', ru: 'потому что', uk: 'тому що', es: 'porque', 'pt-BR': 'porque', vi: 'bởi vì', id: 'karena', tr: 'çünkü', pl: 'ponieważ / bo', pos: 'conjunctions' },
  if: { en: 'if', ru: 'если', uk: 'якщо', es: 'si', 'pt-BR': 'se', vi: 'nếu', id: 'jika / kalau', tr: 'eğer / -se', pl: 'jeśli / gdyby', pos: 'conjunctions' },
  when: { en: 'when', ru: 'когда', uk: 'коли', es: 'cuando', 'pt-BR': 'quando', vi: 'khi / khi nào', id: 'ketika / kapan', tr: 'ne zaman / -diğinde', pl: 'kiedy / gdy', pos: 'conjunctions' },
  while: { en: 'while', ru: 'пока / в то время как', uk: 'поки / тоді як', es: 'mientras', 'pt-BR': 'enquanto', vi: 'trong khi / khi', id: 'sementara / ketika', tr: 'iken / sırasında', pl: 'podczas gdy / kiedy', pos: 'conjunctions' },
  or: { en: 'or', ru: 'или', uk: 'або', es: 'o', 'pt-BR': 'ou', vi: 'hoặc', id: 'atau', tr: 'veya / ya da', pl: 'albo / lub', pos: 'conjunctions' },
  so: { en: 'so', ru: 'поэтому / так', uk: 'тому / так', es: 'así que / tan', 'pt-BR': 'então / por isso / tão', vi: 'vì vậy / rất', id: 'jadi / begitu', tr: 'bu yüzden / çok', pl: 'więc / tak', pos: 'conjunctions' },
  than: { en: 'than', ru: 'чем', uk: 'ніж', es: 'que', 'pt-BR': 'do que', vi: 'hơn / so với', id: 'daripada', tr: '-den / -dan daha', pl: 'niż', pos: 'conjunctions' },
  am: { en: 'am', ru: 'форма to be для I', uk: 'форма to be для I', es: 'soy / estoy', 'pt-BR': 'forma de to be com I', vi: 'dạng to be dùng với I', id: 'bentuk to be untuk I', tr: 'I ile kullanılan to be biçimi', pl: 'forma to be dla I', pos: 'verbs' },
  is: { en: 'is', ru: 'есть / является', uk: 'є', es: 'es / está', 'pt-BR': 'é / está', vi: 'là / đang / ở', id: 'adalah / sedang / berada', tr: '-dır / oluyor / bulunuyor', pl: 'jest', pos: 'verbs' },
  are: { en: 'are', ru: 'есть / являются', uk: 'є', es: 'son / están', 'pt-BR': 'são / estão', vi: 'là / đang / ở', id: 'adalah / sedang / berada', tr: '-dır / oluyorlar / bulunuyorlar', pl: 'są / jesteś', pos: 'verbs' },
  be: { en: 'be', ru: 'быть', uk: 'бути', es: 'ser / estar', 'pt-BR': 'ser / estar', vi: 'là / ở / trở thành', id: 'menjadi / berada', tr: 'olmak', pl: 'być', pos: 'verbs' },
  been: { en: 'been', ru: 'был / бывал', uk: 'був / бувала', es: 'sido / estado', 'pt-BR': 'sido / estado', vi: 'đã từng là / đã ở', id: 'pernah menjadi / pernah berada', tr: 'olmuş / bulunmuş', pl: 'był / była / było', pos: 'verbs' },
  being: { en: 'being', ru: 'будучи / являясь', uk: 'будучи / перебуваючи', es: 'siendo / estando', 'pt-BR': 'sendo / estando', vi: 'đang là / đang ở', id: 'sedang menjadi / sedang berada', tr: 'olurken / bulunurken', pl: 'będąc', pos: 'verbs' },
  wifi: { en: 'wifi', ru: 'вай-фай', uk: 'вай-фай', es: 'wifi', 'pt-BR': 'wi-fi', vi: 'wifi', id: 'wifi', tr: 'wifi', pl: 'wifi', pos: 'nouns' },
  no: { en: 'no', ru: 'нет / никакой', uk: 'ні / жодний', es: 'no / ningun', 'pt-BR': 'não / nenhum', vi: 'không / không có', id: 'tidak / tidak ada', tr: 'hayır / hiç', pl: 'nie / żaden', pos: 'adverbs' },
  every: { en: 'every', ru: 'каждый', uk: 'кожний', es: 'cada', 'pt-BR': 'cada / todo', vi: 'mỗi / mọi', id: 'setiap', tr: 'her', pl: 'każdy', pos: 'adjectives' },
  too: { en: 'too', ru: 'тоже / слишком', uk: 'теж / занадто', es: 'tambien / demasiado', 'pt-BR': 'também / demais', vi: 'cũng / quá', id: 'juga / terlalu', tr: 'de / çok fazla', pl: 'też / zbyt', pos: 'adverbs' },
  yes: { en: 'yes', ru: 'да', uk: 'так', es: 'si', 'pt-BR': 'sim', vi: 'vâng / có', id: 'ya', tr: 'evet', pl: 'tak', pos: 'adverbs' },
  great: { en: 'great', ru: 'отличный / здорово', uk: 'чудовий / чудово', es: 'genial', 'pt-BR': 'ótimo / excelente', vi: 'tuyệt / rất tốt', id: 'hebat / bagus sekali', tr: 'harika / çok iyi', pl: 'świetny / wspaniale', pos: 'adjectives' },
  reserve: { en: 'reserve', ru: 'бронировать', uk: 'бронювати', es: 'reservar', 'pt-BR': 'reservar', vi: 'đặt trước / giữ chỗ', id: 'memesan / mencadangkan', tr: 'rezerve etmek / ayırmak', pl: 'rezerwować', pos: 'verbs' },
  route: { en: 'route', ru: 'маршрут', uk: 'маршрут', es: 'ruta', 'pt-BR': 'rota / trajeto', vi: 'tuyến đường / lộ trình', id: 'rute / jalur', tr: 'rota / güzergah', pl: 'trasa', pos: 'nouns' },
  show: { en: 'show', ru: 'показывать', uk: 'показувати', es: 'mostrar', 'pt-BR': 'mostrar', vi: 'cho xem / chỉ ra', id: 'menunjukkan / memperlihatkan', tr: 'göstermek', pl: 'pokazywać', pos: 'verbs' },
  enter: { en: 'enter', ru: 'входить', uk: 'входити', es: 'entrar', 'pt-BR': 'entrar', vi: 'đi vào / nhập vào', id: 'masuk / memasukkan', tr: 'girmek', pl: 'wchodzić / wpisać', pos: 'verbs' },
  clothes: { en: 'clothes', ru: 'одежда', uk: 'одяг', es: 'ropa', 'pt-BR': 'roupas', vi: 'quần áo', id: 'pakaian', tr: 'giysiler / kıyafetler', pl: 'ubrania', pos: 'nouns' },
  advice: { en: 'advice', ru: 'совет', uk: 'порада', es: 'consejo', 'pt-BR': 'conselho / orientação', vi: 'lời khuyên', id: 'nasihat / saran', tr: 'tavsiye / öğüt', pl: 'rada / porada', pos: 'nouns' },
  small: { en: 'small', ru: 'маленький', uk: 'маленький', es: 'pequeno', 'pt-BR': 'pequeno', vi: 'nhỏ', id: 'kecil', tr: 'küçük', pl: 'mały', pos: 'adjectives' },
  clear: { en: 'clear', ru: 'ясный / понятный', uk: 'ясний / зрозумілий', es: 'claro', 'pt-BR': 'claro / fácil de entender', vi: 'rõ / dễ hiểu', id: 'jelas / mudah dipahami', tr: 'açık / anlaşılır', pl: 'jasny / zrozumiały', pos: 'adjectives' },
  simple: { en: 'simple', ru: 'простой', uk: 'простий', es: 'simple', 'pt-BR': 'simples', vi: 'đơn giản', id: 'sederhana', tr: 'basit / sade', pl: 'prosty', pos: 'adjectives' },
  easy: { en: 'easy', ru: 'лёгкий', uk: 'легкий', es: 'facil', 'pt-BR': 'fácil', vi: 'dễ', id: 'mudah', tr: 'kolay', pl: 'łatwy', pos: 'adjectives' },
  body: { en: 'body', ru: 'тело', uk: 'тіло', es: 'cuerpo', 'pt-BR': 'corpo', vi: 'cơ thể / thân thể', id: 'tubuh / badan', tr: 'vücut / beden', pl: 'ciało', pos: 'nouns' },
  learn: { en: 'learn', ru: 'учиться / узнавать', uk: 'вчитися / дізнаватися', es: 'aprender', 'pt-BR': 'aprender', vi: 'học / biết thêm', id: 'belajar / mengetahui', tr: 'öğrenmek', pl: 'uczyć się / dowiadywać się', pos: 'verbs' },
  online: { en: 'online', ru: 'онлайн', uk: 'онлайн', es: 'en linea', 'pt-BR': 'online', vi: 'trực tuyến', id: 'online / daring', tr: 'çevrim içi', pl: 'online / w internecie', pos: 'adverbs' },
  thank: { en: 'thank', ru: 'благодарить', uk: 'дякувати', es: 'agradecer', 'pt-BR': 'agradecer', vi: 'cảm ơn', id: 'berterima kasih', tr: 'teşekkür etmek', pl: 'dziękować', pos: 'verbs' },
  rain: { en: 'rain', ru: 'дождь / идти дождю', uk: 'дощ / дощити', es: 'lluvia / llover', 'pt-BR': 'chuva / chover', vi: 'mưa / trời mưa', id: 'hujan', tr: 'yağmur / yağmak', pl: 'deszcz / padać', pos: 'nouns' },
  use: { en: 'use', ru: 'использовать', uk: 'використовувати', es: 'usar', 'pt-BR': 'usar / utilizar', vi: 'dùng / sử dụng', id: 'menggunakan / memakai', tr: 'kullanmak', pl: 'używać', pos: 'verbs' },
  walk: { en: 'walk', ru: 'ходить пешком / гулять', uk: 'ходити пішки / гуляти', es: 'caminar', 'pt-BR': 'andar / caminhar', vi: 'đi bộ / đi dạo', id: 'berjalan kaki / jalan-jalan', tr: 'yürümek / gezmek', pl: 'iść pieszo / spacerować', pos: 'verbs' },
  spend: { en: 'spend', ru: 'тратить / проводить время', uk: 'витрачати / проводити час', es: 'gastar / pasar', 'pt-BR': 'gastar / passar tempo', vi: 'tiêu / dành thời gian', id: 'menghabiskan uang/waktu', tr: 'harcamak / zaman geçirmek', pl: 'wydawać / spędzać czas', pos: 'verbs' },
  throw: { en: 'throw', ru: 'бросать', uk: 'кидати', es: 'lanzar', 'pt-BR': 'jogar / arremessar', vi: 'ném / quăng', id: 'melempar', tr: 'atmak / fırlatmak', pl: 'rzucać', pos: 'verbs' },
  away: { en: 'away', ru: 'прочь / в сторону', uk: 'геть / убік', es: 'lejos / fuera', 'pt-BR': 'para longe / embora', vi: 'đi xa / ra khỏi', id: 'pergi / menjauh', tr: 'uzağa / bir yere', pl: 'precz / z dala', pos: 'adverbs' },
  back: { en: 'back', ru: 'назад / обратно', uk: 'назад / назад', es: 'de vuelta', 'pt-BR': 'de volta / para trás', vi: 'trở lại / phía sau', id: 'kembali / ke belakang', tr: 'geri / tekrar', pl: 'z powrotem / do tyłu', pos: 'adverbs' },
  go: { en: 'go', ru: 'идти / ехать', uk: 'йти / їхати', es: 'ir', 'pt-BR': 'ir', vi: 'đi', id: 'pergi', tr: 'gitmek', pl: 'iść / jechać', pos: 'verbs' },
  leave: { en: 'leave', ru: 'уходить / оставлять', uk: 'йти / залишати', es: 'salir / dejar', 'pt-BR': 'sair / deixar', vi: 'rời đi / để lại', id: 'pergi / meninggalkan', tr: 'ayrılmak / bırakmak', pl: 'wychodzić / zostawiać', pos: 'verbs' },
  bring: { en: 'bring', ru: 'приносить', uk: 'приносити', es: 'traer', 'pt-BR': 'trazer', vi: 'mang đến', id: 'membawa ke sini', tr: 'getirmek', pl: 'przynosić', pos: 'verbs' },
  get: { en: 'get', ru: 'получать / становиться', uk: 'отримувати / ставати', es: 'conseguir / ponerse', 'pt-BR': 'pegar / conseguir / ficar', vi: 'nhận / lấy / trở nên', id: 'mendapat / menjadi', tr: 'almak / olmak', pl: 'dostać / stać się', pos: 'verbs' },
  choose: { en: 'choose', ru: 'выбирать', uk: 'обирати', es: 'elegir', 'pt-BR': 'escolher', vi: 'chọn', id: 'memilih', tr: 'seçmek', pl: 'wybierać', pos: 'verbs' },
  put: { en: 'put', ru: 'класть / ставить', uk: 'класти / ставити', es: 'poner', 'pt-BR': 'colocar / pôr', vi: 'đặt / để', id: 'menaruh / meletakkan', tr: 'koymak', pl: 'kłaść / stawiać', pos: 'verbs' },
  sit: { en: 'sit', ru: 'сидеть / садиться', uk: 'сидіти / сідати', es: 'sentarse', 'pt-BR': 'sentar / estar sentado', vi: 'ngồi / ngồi xuống', id: 'duduk', tr: 'oturmak', pl: 'siedzieć / siadać', pos: 'verbs' },
  sleep: { en: 'sleep', ru: 'спать', uk: 'спати', es: 'dormir', 'pt-BR': 'dormir', vi: 'ngủ', id: 'tidur', tr: 'uyumak', pl: 'spać', pos: 'verbs' },
  run: { en: 'run', ru: 'бежать / работать', uk: 'бігти / працювати', es: 'correr / funcionar', 'pt-BR': 'correr / funcionar', vi: 'chạy / hoạt động', id: 'berlari / berjalan/berfungsi', tr: 'koşmak / çalışmak', pl: 'biec / działać', pos: 'verbs' },
  give: { en: 'give', ru: 'давать', uk: 'давати', es: 'dar', 'pt-BR': 'dar / entregar', vi: 'cho / đưa', id: 'memberi', tr: 'vermek', pl: 'dawać', pos: 'verbs' },
  wake: { en: 'wake', ru: 'просыпаться / будить', uk: 'прокидатися / будити', es: 'despertar', 'pt-BR': 'acordar / despertar alguém', vi: 'thức dậy / đánh thức', id: 'bangun / membangunkan', tr: 'uyanmak / uyandırmak', pl: 'budzić się / budzić kogoś', pos: 'verbs' },
  write: { en: 'write', ru: 'писать', uk: 'писати', es: 'escribir', 'pt-BR': 'escrever', vi: 'viết', id: 'menulis', tr: 'yazmak', pl: 'pisać', pos: 'verbs' },
  see: { en: 'see', ru: 'видеть', uk: 'бачити', es: 'ver', 'pt-BR': 'ver / entender', vi: 'thấy / hiểu', id: 'melihat / mengerti', tr: 'görmek / anlamak', pl: 'widzieć / rozumieć', pos: 'verbs' },
  say: { en: 'say', ru: 'сказать / говорить', uk: 'сказати / говорити', es: 'decir', 'pt-BR': 'dizer', vi: 'nói / nói rằng', id: 'mengatakan', tr: 'söylemek / demek', pl: 'powiedzieć / mówić', pos: 'verbs' },
  forget: { en: 'forget', ru: 'забывать', uk: 'забувати', es: 'olvidar', 'pt-BR': 'esquecer', vi: 'quên', id: 'lupa / melupakan', tr: 'unutmak', pl: 'zapominać', pos: 'verbs' },
  those: { en: 'those', ru: 'те', uk: 'ті', es: 'esos / aquellos', 'pt-BR': 'aqueles / aquelas', vi: 'những cái/người đó', id: 'itu / mereka yang itu', tr: 'şunlar / onlar', pl: 'tamte / ci', pos: 'pronouns' },
  inexperienced: { en: 'inexperienced', ru: 'неопытный', uk: 'недосвідчений', es: 'inexperto', 'pt-BR': 'inexperiente', vi: 'thiếu kinh nghiệm', id: 'tidak berpengalaman', tr: 'deneyimsiz', pl: 'niedoświadczony', pos: 'adjectives' },
  huge: { en: 'huge', ru: 'огромный', uk: 'величезний', es: 'enorme', 'pt-BR': 'enorme / gigantesco', vi: 'rất lớn / khổng lồ', id: 'sangat besar / raksasa', tr: 'devasa / çok büyük', pl: 'ogromny', pos: 'adjectives' },
  pilot: { en: 'pilot', ru: 'пилот', uk: 'пілот', es: 'piloto', 'pt-BR': 'piloto', vi: 'phi công', id: 'pilot', tr: 'pilot', pl: 'pilot', pos: 'nouns' },
  complex: { en: 'complex', ru: 'сложный', uk: 'складний', es: 'complejo', 'pt-BR': 'complexo / complicado', vi: 'phức tạp', id: 'kompleks / rumit', tr: 'karmaşık', pl: 'złożony / skomplikowany', pos: 'adjectives' },
  strict: { en: 'strict', ru: 'строгий', uk: 'суворий', es: 'estricto', 'pt-BR': 'rígido / rigoroso', vi: 'nghiêm khắc / chặt chẽ', id: 'ketat / tegas', tr: 'katı / sıkı', pl: 'surowy / rygorystyczny', pos: 'adjectives' },
  guard: { en: 'guard', ru: 'охранник', uk: 'охоронець', es: 'guardia', 'pt-BR': 'guarda / segurança', vi: 'bảo vệ / lính gác', id: 'penjaga / satpam', tr: 'güvenlik görevlisi / nöbetçi', pl: 'strażnik / ochroniarz', pos: 'nouns' },
  suspicious: { en: 'suspicious', ru: 'подозрительный', uk: 'підозрілий', es: 'sospechoso', 'pt-BR': 'suspeito / desconfiado', vi: 'đáng nghi / nghi ngờ', id: 'mencurigakan / curiga', tr: 'şüpheli / kuşkucu', pl: 'podejrzany / podejrzliwy', pos: 'adjectives' },
  visitor: { en: 'visitor', ru: 'посетитель', uk: 'відвідувач', es: 'visitante', 'pt-BR': 'visitante', vi: 'khách thăm / người ghé thăm', id: 'pengunjung / tamu', tr: 'ziyaretçi', pl: 'gość / odwiedzający', pos: 'nouns' },
  contents: { en: 'contents', ru: 'содержимое', uk: 'вміст', es: 'contenido', 'pt-BR': 'conteúdo / o que há dentro', vi: 'nội dung / đồ bên trong', id: 'isi / barang di dalam', tr: 'içindekiler / içerik', pl: 'zawartość / treść', pos: 'nouns' },
  leather: { en: 'leather', ru: 'кожаный / кожа', uk: 'шкіряний / шкіра', es: 'cuero', 'pt-BR': 'couro / de couro', vi: 'da thuộc / bằng da', id: 'kulit / dari kulit', tr: 'deri / deriden', pl: 'skóra / skórzany', pos: 'nouns' },
  briefcase: { en: 'briefcase', ru: 'портфель', uk: 'портфель', es: 'maletin', 'pt-BR': 'pasta executiva / maleta', vi: 'cặp tài liệu', id: 'tas kerja / koper dokumen', tr: 'evrak çantası', pl: 'teczka / aktówka', pos: 'nouns' },
  powerful: { en: 'powerful', ru: 'мощный', uk: 'потужний', es: 'poderoso', 'pt-BR': 'poderoso / potente', vi: 'mạnh mẽ / có sức mạnh', id: 'kuat / berpengaruh', tr: 'güçlü / etkili', pl: 'potężny / silny', pos: 'adjectives' },
  brick: { en: 'brick', ru: 'кирпич / кирпичный', uk: 'цегла / цегляний', es: 'ladrillo', 'pt-BR': 'tijolo / de tijolo', vi: 'gạch / bằng gạch', id: 'batu bata / dari bata', tr: 'tuğla / tuğladan', pl: 'cegła / ceglany', pos: 'nouns' },
  envelope: { en: 'envelope', ru: 'конверт', uk: 'конверт', es: 'sobre', 'pt-BR': 'envelope', vi: 'phong bì', id: 'amplop', tr: 'zarf', pl: 'koperta', pos: 'nouns' },
  lightning: { en: 'lightning', ru: 'молния', uk: 'блискавка', es: 'relampago', 'pt-BR': 'relâmpago / raio', vi: 'tia chớp / sét', id: 'kilat / petir', tr: 'şimşek / yıldırım', pl: 'błyskawica / piorun', pos: 'nouns' },
  sharp: { en: 'sharp', ru: 'острый / резкий', uk: 'гострий / різкий', es: 'afilado / intenso', 'pt-BR': 'afiado / brusco / intenso', vi: 'sắc / rõ / đột ngột', id: 'tajam / jelas / mendadak', tr: 'keskin / ani', pl: 'ostry / gwałtowny', pos: 'adjectives' },
  wind: { en: 'wind', ru: 'ветер', uk: 'вітер', es: 'viento', 'pt-BR': 'vento', vi: 'gió', id: 'angin', tr: 'rüzgar', pl: 'wiatr', pos: 'nouns' },
  touch: { en: 'touch', ru: 'касаться', uk: 'торкатися', es: 'tocar', 'pt-BR': 'tocar / encostar', vi: 'chạm / đụng vào', id: 'menyentuh', tr: 'dokunmak', pl: 'dotykać', pos: 'verbs' },
  boss: { en: 'boss', ru: 'начальник', uk: 'начальник', es: 'jefe', 'pt-BR': 'chefe', vi: 'sếp / cấp trên', id: 'atasan / bos', tr: 'patron / yönetici', pl: 'szef', pos: 'nouns' },
  skillful: { en: 'skillful', ru: 'умелый', uk: 'умілий', es: 'habilidoso', 'pt-BR': 'habilidoso / competente', vi: 'khéo léo / có kỹ năng', id: 'terampil / mahir', tr: 'becerikli / yetenekli', pl: 'zręczny / umiejętny', pos: 'adjectives' },
  ladder: { en: 'ladder', ru: 'лестница', uk: 'драбина', es: 'escalera', 'pt-BR': 'escada de mão', vi: 'thang', id: 'tangga lipat / tangga', tr: 'merdiven', pl: 'drabina', pos: 'nouns' },
  delegation: { en: 'delegation', ru: 'делегация', uk: 'делегація', es: 'delegacion', 'pt-BR': 'delegação', vi: 'phái đoàn / đoàn đại biểu', id: 'delegasi', tr: 'heyet / delegasyon', pl: 'delegacja', pos: 'nouns' },
  laboratory: { en: 'laboratory', ru: 'лаборатория', uk: 'лабораторія', es: 'laboratorio', 'pt-BR': 'laboratório', vi: 'phòng thí nghiệm', id: 'laboratorium', tr: 'laboratuvar', pl: 'laboratorium', pos: 'nouns' },
  inspector: { en: 'inspector', ru: 'инспектор', uk: 'інспектор', es: 'inspector', 'pt-BR': 'inspetor / fiscal', vi: 'thanh tra / người kiểm tra', id: 'inspektur / pemeriksa', tr: 'müfettiş / denetçi', pl: 'inspektor / kontroler', pos: 'nouns' },
  needle: { en: 'needle', ru: 'игла', uk: 'голка', es: 'aguja', 'pt-BR': 'agulha', vi: 'kim / kim tiêm', id: 'jarum', tr: 'iğne', pl: 'igła', pos: 'nouns' },
  base: { en: 'base', ru: 'база', uk: 'база', es: 'base', 'pt-BR': 'base / fundamento', vi: 'căn cứ / nền tảng', id: 'basis / pangkalan', tr: 'temel / üs', pl: 'baza / podstawa', pos: 'nouns' },
  landlord: { en: 'landlord', ru: 'арендодатель', uk: 'орендодавець', es: 'propietario', 'pt-BR': 'senhorio / proprietário do imóvel', vi: 'chủ nhà cho thuê', id: 'pemilik kontrakan / tuan tanah', tr: 'ev sahibi / mülk sahibi', pl: 'właściciel mieszkania / wynajmujący', pos: 'nouns' },
  electricity: { en: 'electricity', ru: 'электричество', uk: 'електрика', es: 'electricidad', 'pt-BR': 'eletricidade / energia elétrica', vi: 'điện / điện năng', id: 'listrik', tr: 'elektrik', pl: 'elektryczność / prąd', pos: 'nouns' },
  object: { en: 'object', ru: 'предмет / объект', uk: 'предмет / об\'єкт', es: 'objeto', 'pt-BR': 'objeto / coisa', vi: 'đồ vật / đối tượng', id: 'benda / objek', tr: 'nesne / obje', pl: 'przedmiot / obiekt', pos: 'nouns' },
  left: { en: 'left', ru: 'левый / оставил', uk: 'лівий / залишив', es: 'izquierdo / dejo', 'pt-BR': 'esquerdo / deixou', vi: 'bên trái / đã rời đi hoặc để lại', id: 'kiri / sudah pergi atau meninggalkan', tr: 'sol / ayrıldı ya da bıraktı', pl: 'lewy / zostawił lub wyszedł', pos: 'adjectives' },
  engine: { en: 'engine', ru: 'двигатель', uk: 'двигун', es: 'motor', 'pt-BR': 'motor', vi: 'động cơ', id: 'mesin', tr: 'motor / makine', pl: 'silnik', pos: 'nouns' },
  stray: { en: 'stray', ru: 'бродячий', uk: 'бродячий', es: 'callejero', 'pt-BR': 'de rua / perdido', vi: 'đi lạc / không có chủ', id: 'liar / tersesat / tanpa pemilik', tr: 'sokak / başıboş', pl: 'bezdomny / zabłąkany', pos: 'adjectives' },
  cross: { en: 'cross', ru: 'пересекать', uk: 'переходити / перетинати', es: 'cruzar', 'pt-BR': 'atravessar / cruzar', vi: 'băng qua / đi qua', id: 'menyeberang / melintasi', tr: 'geçmek / karşıya geçmek', pl: 'przechodzić przez / przecinać', pos: 'verbs' },
  sunlight: { en: 'sunlight', ru: 'солнечный свет', uk: 'сонячне світло', es: 'luz solar', 'pt-BR': 'luz do sol', vi: 'ánh sáng mặt trời', id: 'sinar matahari', tr: 'güneş ışığı', pl: 'światło słoneczne', pos: 'nouns' },
  stranger: { en: 'stranger', ru: 'незнакомец', uk: 'незнайомець', es: 'desconocido', 'pt-BR': 'desconhecido / estranho', vi: 'người lạ', id: 'orang asing / orang tak dikenal', tr: 'yabancı / tanımadığın kişi', pl: 'nieznajomy / obcy', pos: 'nouns' },
  station: { en: 'station', ru: 'станция', uk: 'станція', es: 'estacion', 'pt-BR': 'estação / posto', vi: 'ga / trạm', id: 'stasiun / pos', tr: 'istasyon', pl: 'stacja', pos: 'nouns' },
  firefighter: { en: 'firefighter', ru: 'пожарный', uk: 'пожежник', es: 'bombero', 'pt-BR': 'bombeiro', vi: 'lính cứu hỏa', id: 'petugas pemadam kebakaran', tr: 'itfaiyeci', pl: 'strażak', pos: 'nouns' },
  emergency: { en: 'emergency', ru: 'экстренный / чрезвычайный', uk: 'екстрений / надзвичайний', es: 'emergencia', 'pt-BR': 'emergência / de emergência', vi: 'trường hợp khẩn cấp / khẩn cấp', id: 'darurat / keadaan darurat', tr: 'acil durum / acil', pl: 'nagły wypadek / awaryjny', pos: 'nouns' },
  wedding: { en: 'wedding', ru: 'свадьба', uk: 'весілля', es: 'boda', 'pt-BR': 'casamento', vi: 'đám cưới / lễ cưới', id: 'pernikahan', tr: 'düğün', pl: 'ślub / wesele', pos: 'nouns' },
  official: { en: 'official', ru: 'официальный', uk: 'офіційний', es: 'oficial', 'pt-BR': 'oficial', vi: 'chính thức', id: 'resmi', tr: 'resmi', pl: 'oficjalny', pos: 'adjectives' },
  mural: { en: 'mural', ru: 'настенная роспись', uk: 'мурал', es: 'mural', 'pt-BR': 'mural / pintura na parede', vi: 'tranh tường', id: 'mural / lukisan dinding', tr: 'duvar resmi / mural', pl: 'mural / malowidło ścienne', pos: 'nouns' },
  cart: { en: 'cart', ru: 'тележка', uk: 'візок', es: 'carrito', 'pt-BR': 'carrinho / carroça', vi: 'xe đẩy', id: 'kereta dorong / gerobak', tr: 'el arabası / alışveriş arabası', pl: 'wózek', pos: 'nouns' },
  drain: { en: 'drain', ru: 'сток / слив', uk: 'злив / стік', es: 'desague', 'pt-BR': 'ralo / escoamento', vi: 'cống thoát nước / lỗ thoát', id: 'saluran pembuangan / lubang pembuangan', tr: 'gider / drenaj', pl: 'odpływ / ściek', pos: 'nouns' },
  verdict: { en: 'verdict', ru: 'вердикт / приговор', uk: 'вердикт / вирок', es: 'veredicto', 'pt-BR': 'veredicto / decisão final', vi: 'phán quyết / kết luận', id: 'putusan / vonis', tr: 'karar / hüküm', pl: 'werdykt / wyrok', pos: 'nouns' },
  building: { en: 'building', ru: 'здание', uk: 'будівля', es: 'edificio', 'pt-BR': 'prédio / edifício', vi: 'tòa nhà', id: 'gedung / bangunan', tr: 'bina', pl: 'budynek', pos: 'nouns' },
  earthquake: { en: 'earthquake', ru: 'землетрясение', uk: 'землетрус', es: 'terremoto', 'pt-BR': 'terremoto', vi: 'động đất', id: 'gempa bumi', tr: 'deprem', pl: 'trzęsienie ziemi', pos: 'nouns' },
  ancient: { en: 'ancient', ru: 'древний', uk: 'давній', es: 'antiguo', 'pt-BR': 'antigo / ancestral', vi: 'cổ xưa / cổ đại', id: 'kuno / purba', tr: 'antik / eski çağlardan', pl: 'starożytny / pradawny', pos: 'adjectives' },
  mechanic: { en: 'mechanic', ru: 'механик', uk: 'механік', es: 'mecanico', 'pt-BR': 'mecânico', vi: 'thợ máy / thợ sửa xe', id: 'montir / mekanik', tr: 'tamirci / mekanik', pl: 'mechanik', pos: 'nouns' },
  branch: { en: 'branch', ru: 'ветка', uk: 'гілка', es: 'rama', 'pt-BR': 'galho / filial', vi: 'cành cây / chi nhánh', id: 'cabang pohon / cabang kantor', tr: 'dal / şube', pl: 'gałąź / oddział', pos: 'nouns' },
};

const GRAMMAR_CHUNKS: Record<string, Word> = {
  'there is': { en: 'there is', ru: 'есть / находится (один предмет)', uk: 'є / знаходиться (один предмет)', es: 'hay', 'pt-BR': 'há / existe (uma coisa)', vi: 'có (một vật / một người)', id: 'ada (satu benda/orang)', tr: 'var (tekil şey)', pl: 'jest / znajduje się (jedna rzecz)', pos: 'phrases' },
  'there are': { en: 'there are', ru: 'есть / находятся (несколько)', uk: 'є / знаходяться (кілька)', es: 'hay', 'pt-BR': 'há / existem (várias coisas)', vi: 'có (nhiều vật/người)', id: 'ada (beberapa benda/orang)', tr: 'var (çoğul şeyler)', pl: 'są / znajdują się (kilka rzeczy)', pos: 'phrases' },
  'is there': { en: 'is there', ru: 'есть...? (один предмет / неисчисляемое)', uk: 'є...? (один предмет / незлічуване)', es: '¿hay...? (uno / incontable)', 'pt-BR': 'há...? / existe...? (singular ou incontável)', vi: 'có...? (một thứ / không đếm được)', id: 'ada...? (satu / tak terhitung)', tr: 'var mı...? (tekil / sayılamayan)', pl: 'czy jest...? (jedna rzecz / niepoliczalne)', pos: 'phrases' },
  'are there': { en: 'are there', ru: 'есть...? (несколько / множественное)', uk: 'є...? (кілька / множина)', es: '¿hay...? (plural)', 'pt-BR': 'há...? / existem...? (plural)', vi: 'có...? (số nhiều)', id: 'ada...? (jamak)', tr: 'var mı...? (çoğul)', pl: 'czy są...? (liczba mnoga)', pos: 'phrases' },
  'have to': { en: 'have to', ru: 'нужно / приходится', uk: 'потрібно / доводиться', es: 'tener que', 'pt-BR': 'ter que / precisar', vi: 'phải / cần phải', id: 'harus / perlu', tr: 'zorunda olmak / yapmak gerek', pl: 'musieć / trzeba', pos: 'phrases' },
  'has to': { en: 'has to', ru: 'нужно / приходится (he/she/it)', uk: 'потрібно / доводиться (he/she/it)', es: 'tener que', 'pt-BR': 'tem que (he/she/it)', vi: 'phải (với he/she/it)', id: 'harus (untuk he/she/it)', tr: 'zorunda (he/she/it)', pl: 'musi (he/she/it)', pos: 'phrases' },
  'had to': { en: 'had to', ru: 'пришлось / нужно было', uk: 'довелося / потрібно було', es: 'tuvo que', 'pt-BR': 'teve que / precisou', vi: 'đã phải / đã cần phải', id: 'harus / terpaksa di masa lalu', tr: 'zorunda kaldı / gerekiyordu', pl: 'musiał / trzeba było', pos: 'phrases' },
  'do not have to': { en: 'do not have to', ru: 'не нужно / не обязан', uk: 'не потрібно / не зобов\'язаний', es: 'no tener que', 'pt-BR': 'não precisa / não é obrigado', vi: 'không cần / không bắt buộc', id: 'tidak perlu / tidak wajib', tr: 'gerekmiyor / zorunda değil', pl: 'nie trzeba / nie musisz', pos: 'phrases' },
  'does not have to': { en: 'does not have to', ru: 'не нужно / не обязан(а)', uk: 'не потрібно / не зобов\'язаний(а)', es: 'no tener que', 'pt-BR': 'não precisa (he/she/it)', vi: 'không cần (với he/she/it)', id: 'tidak perlu (untuk he/she/it)', tr: 'gerekmiyor (he/she/it)', pl: 'nie musi (he/she/it)', pos: 'phrases' },
  "don't have to": { en: "don't have to", ru: 'не нужно / не обязан', uk: 'не потрібно / не зобов\'язаний', es: 'no tener que', 'pt-BR': 'não precisa / não é obrigado', vi: 'không cần / không bắt buộc', id: 'tidak perlu / tidak wajib', tr: 'gerekmiyor / zorunda değil', pl: 'nie trzeba / nie musisz', pos: 'phrases' },
  'need to': { en: 'need to', ru: 'нужно / необходимо', uk: 'потрібно / необхідно', es: 'necesitar / tener que', 'pt-BR': 'precisar / ter que', vi: 'cần phải', id: 'perlu / harus', tr: 'ihtiyacı olmak / yapması gerek', pl: 'potrzebować / musieć', pos: 'phrases' },
  'needs to': { en: 'needs to', ru: 'нужно / необходимо (he/she/it)', uk: 'потрібно / необхідно (he/she/it)', es: 'necesita', 'pt-BR': 'precisa (he/she/it)', vi: 'cần phải (với he/she/it)', id: 'perlu (untuk he/she/it)', tr: 'gerekiyor (he/she/it)', pl: 'musi / potrzebuje (he/she/it)', pos: 'phrases' },
  'used to': { en: 'used to', ru: 'раньше обычно', uk: 'раніше зазвичай', es: 'solía', 'pt-BR': 'costumava / antes fazia', vi: 'từng thường / trước đây hay', id: 'dulu biasa / pernah biasa', tr: 'eskiden ... yapardı', pl: 'kiedyś zwykle / dawniej', pos: 'phrases' },
  'did not use to': { en: 'did not use to', ru: 'раньше не', uk: 'раніше не', es: 'no solía', 'pt-BR': 'não costumava', vi: 'trước đây không thường', id: 'dulu tidak biasa', tr: 'eskiden ... yapmazdı', pl: 'kiedyś nie zwykł / dawniej nie', pos: 'phrases' },
  "didn't use to": { en: "didn't use to", ru: 'раньше не', uk: 'раніше не', es: 'no solía', 'pt-BR': 'não costumava', vi: 'trước đây không thường', id: 'dulu tidak biasa', tr: 'eskiden ... yapmazdı', pl: 'kiedyś nie zwykł / dawniej nie', pos: 'phrases' },
  'going to': { en: 'going to', ru: 'собираться / будущее намерение', uk: 'збиратися / майбутній намір', es: 'ir a', 'pt-BR': 'vai / pretende fazer', vi: 'sẽ / định làm', id: 'akan / berencana', tr: 'yapacak / niyet ediyor', pl: 'zamierzać / będzie', pos: 'phrases' },
  'able to': { en: 'able to', ru: 'способен / может', uk: 'здатний / може', es: 'capaz de', 'pt-BR': 'capaz de / conseguir', vi: 'có thể / đủ khả năng', id: 'mampu / bisa', tr: 'yapabilmek / muktedir olmak', pl: 'być w stanie / móc', pos: 'phrases' },
  'because of': { en: 'because of', ru: 'из-за / по причине', uk: 'через / з причини', es: 'debido a', 'pt-BR': 'por causa de / devido a', vi: 'vì / do', id: 'karena / disebabkan oleh', tr: 'yüzünden / nedeniyle', pl: 'z powodu / przez', pos: 'phrases' },
  'instead of': { en: 'instead of', ru: 'вместо', uk: 'замість', es: 'en vez de', 'pt-BR': 'em vez de / no lugar de', vi: 'thay vì', id: 'alih-alih / sebagai ganti', tr: 'yerine', pl: 'zamiast', pos: 'phrases' },
  'as soon as': { en: 'as soon as', ru: 'как только', uk: 'щойно / як тільки', es: 'tan pronto como', 'pt-BR': 'assim que / logo que', vi: 'ngay khi', id: 'segera setelah', tr: 'olur olmaz / -ir -mez', pl: 'jak tylko / gdy tylko', pos: 'phrases' },
  'in order to': { en: 'in order to', ru: 'для того чтобы', uk: 'для того щоб', es: 'para', 'pt-BR': 'para / a fim de', vi: 'để / nhằm', id: 'agar / untuk', tr: 'için / amacıyla', pl: 'żeby / w celu', pos: 'phrases' },
  'look forward to': { en: 'look forward to', ru: 'ждать с нетерпением', uk: 'чекати з нетерпінням', es: 'esperar con ganas', 'pt-BR': 'estar ansioso por / esperar com entusiasmo', vi: 'mong chờ / háo hức chờ', id: 'menantikan dengan senang', tr: 'dört gözle beklemek', pl: 'czekać z niecierpliwością', pos: 'phrases' },
  'take care of': { en: 'take care of', ru: 'заботиться о', uk: 'піклуватися про', es: 'cuidar de', 'pt-BR': 'cuidar de / resolver', vi: 'chăm sóc / xử lý', id: 'merawat / mengurus', tr: 'ilgilenmek / bakımını yapmak', pl: 'opiekować się / zająć się', pos: 'phrases' },
};

function phraseTextForCoverage(english: string): string {
  return String(english ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[']/g, "'")
    .replace(/\bwi[\s-]?fi\b/g, 'wifi')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function supplementalWordsForLesson(lessonId: number): Word[] {
  return [];
}

const WORDS_BY_LESSON: Record<number, Word[]> = {
  1: [
    { en: 'I', ru: 'Я', uk: 'Я', es: 'Yo', pos: 'pronouns' },
    { en: 'you', ru: 'Ты / Вы', uk: 'Ти / Ви', es: 'Tú / usted', pos: 'pronouns' },
    { en: 'he', ru: 'Он', uk: 'Він', es: 'Él', pos: 'pronouns' },
    { en: 'she', ru: 'Она', uk: 'Вона', es: 'Ella', pos: 'pronouns' },
    { en: 'we', ru: 'Мы', uk: 'Ми', es: 'Nosotros / nosotras', pos: 'pronouns' },
    { en: 'they', ru: 'Они', uk: 'Вони', es: 'Ellos / ellas', pos: 'pronouns' },
    { en: 'it', ru: 'Это / Оно', uk: 'Це / Воно', es: 'Eso / ello', pos: 'pronouns' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', es: 'aquí', pos: 'adverbs' },
    { en: 'outside', ru: 'Снаружи / На улице', uk: 'Зовні / Надворі', es: 'afuera', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутри', uk: 'Всередині', es: 'adentro', pos: 'adverbs' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', es: 'juntos', pos: 'adverbs' },
    { en: 'near', ru: 'Близко / Рядом', uk: 'Близько / Поруч', es: 'cerca', pos: 'adjectives' },
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', es: 'listo', pos: 'adjectives' },
    { en: 'busy', ru: 'Занятый', uk: 'Зайнятий', es: 'ocupado', pos: 'adjectives' },
    { en: 'calm', ru: 'Спокойный', uk: 'Спокійний', es: 'tranquilo', pos: 'adjectives' },
    { en: 'happy', ru: 'Счастливый', uk: 'Щасливий', es: 'feliz', pos: 'adjectives' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', es: 'importante', pos: 'adjectives' },
    { en: 'okay', ru: 'В порядке (хорошо)', uk: 'В порядку (добре)', es: 'bien', pos: 'adjectives' },
    { en: 'right', ru: 'Правый / Правильный', uk: 'Правий / Правильний', es: 'correcto', pos: 'adjectives' },
    { en: 'safe', ru: 'В безопасности', uk: 'В безпеці', es: 'seguro', pos: 'adjectives' },
    { en: 'sick', ru: 'Больной', uk: 'Хворий', es: 'enfermo', pos: 'adjectives' },
    { en: 'cheap', ru: 'Дешевый', uk: 'Дешевий', es: 'barato', pos: 'adjectives' },
    { en: 'sad', ru: 'Грустный', uk: 'Сумний', es: 'triste', pos: 'adjectives' },
    { en: 'late', ru: 'Поздний / Опаздывающий', uk: 'Пізній / Запізнілий', es: 'tarde', pos: 'adjectives' },
    { en: 'tired', ru: 'Уставший', uk: 'Втомлений', es: 'cansado', pos: 'adjectives' },
    { en: 'free', ru: 'Бесплатный / Свободный', uk: 'Безкоштовний / Вільний', es: 'gratis / libre',
    'pt-BR': 'grátis / livre', pos: 'adjectives' },
    { en: 'strong', ru: 'Сильный', uk: 'Сильний', es: 'fuerte', pos: 'adjectives' },
    { en: 'kind', ru: 'Добрый', uk: 'Добрий', es: 'amable', pos: 'adjectives' },
    { en: 'serious', ru: 'Серьёзный', uk: 'Серйозний', es: 'serio', pos: 'adjectives' },
    { en: 'fine', ru: 'Хорошо (в порядке)', uk: 'Добре (в порядку)', es: 'bien', pos: 'adjectives' },
    { en: 'smart', ru: 'Умный', uk: 'Розумний', es: 'inteligente', pos: 'adjectives' },
    { en: 'nervous', ru: 'Нервный / Нервничающий', uk: 'Нервовий / Тривожний', es: 'nervioso', pos: 'adjectives' },
    { en: 'hungry', ru: 'Голодный', uk: 'Голодний', es: 'hambriento', pos: 'adjectives' },
    { en: 'broken', ru: 'Сломанный', uk: 'Зламаний', es: 'roto', pos: 'adjectives' },
    { en: 'angry', ru: 'Злой', uk: 'Злий', es: 'enojado', pos: 'adjectives' },
    { en: 'empty', ru: 'Пустой', uk: 'Порожній', es: 'vacío', pos: 'adjectives' },
    { en: 'friends', ru: 'Друзья', uk: 'Друзі', es: 'amigos', pos: 'nouns' },
  ],
  2: [
    // Местоимения — повторение из урока 1
    { en: 'I', ru: 'Я', uk: 'Я', es: 'Yo', pos: 'pronouns' },
    { en: 'you', ru: 'Ты / Вы', uk: 'Ти / Ви', es: 'Tú / usted', pos: 'pronouns' },
    { en: 'he', ru: 'Он', uk: 'Він', es: 'Él', pos: 'pronouns' },
    { en: 'she', ru: 'Она', uk: 'Вона', es: 'Ella', pos: 'pronouns' },
    { en: 'we', ru: 'Мы', uk: 'Ми', es: 'Nosotros / nosotras', pos: 'pronouns' },
    { en: 'they', ru: 'Они', uk: 'Вони', es: 'Ellos / ellas', pos: 'pronouns' },
    { en: 'it', ru: 'Это / Оно', uk: 'Це / Воно', es: 'Eso / ello', pos: 'pronouns' },
    // Отрицание — новая грамматика урока 2
    { en: 'not', ru: 'Не (отрицание)', uk: 'Не (заперечення)', es: 'no', pos: 'adverbs' },
    // Слова из урока 1 — повторение
    { en: 'here', ru: 'Здесь', uk: 'Тут', es: 'aquí', pos: 'adverbs' },
    { en: 'outside', ru: 'Снаружи / На улице', uk: 'Зовні / Надворі', es: 'afuera', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутри', uk: 'Всередині', es: 'adentro', pos: 'adverbs' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', es: 'juntos', pos: 'adverbs' },
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', es: 'listo', pos: 'adjectives' },
    { en: 'busy', ru: 'Занятый', uk: 'Зайнятий', es: 'ocupado', pos: 'adjectives' },
    { en: 'calm', ru: 'Спокойный', uk: 'Спокійний', es: 'tranquilo', pos: 'adjectives' },
    { en: 'happy', ru: 'Счастливый', uk: 'Щасливий', es: 'feliz', pos: 'adjectives' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', es: 'importante', pos: 'adjectives' },
    { en: 'okay', ru: 'В порядке (хорошо)', uk: 'В порядку (добре)', es: 'bien', pos: 'adjectives' },
    { en: 'right', ru: 'Правый / Правильный', uk: 'Правий / Правильний', es: 'correcto', pos: 'adjectives' },
    { en: 'safe', ru: 'В безопасности', uk: 'В безпеці', es: 'seguro', pos: 'adjectives' },
    { en: 'sick', ru: 'Больной', uk: 'Хворий', es: 'enfermo', pos: 'adjectives' },
    { en: 'sad', ru: 'Грустный', uk: 'Сумний', es: 'triste', pos: 'adjectives' },
    { en: 'late', ru: 'Поздний / Опаздывающий', uk: 'Пізній / Запізнілий', es: 'tarde', pos: 'adjectives' },
    { en: 'tired', ru: 'Уставший', uk: 'Втомлений', es: 'cansado', pos: 'adjectives' },
    { en: 'free', ru: 'Бесплатный / Свободный', uk: 'Безкоштовний / Вільний', es: 'gratis / libre', pos: 'adjectives' },
    { en: 'nervous', ru: 'Нервный', uk: 'Нервовий', es: 'nervioso', pos: 'adjectives' },
    { en: 'hungry', ru: 'Голодный', uk: 'Голодний', es: 'hambriento', pos: 'adjectives' },
    { en: 'angry', ru: 'Злой', uk: 'Злий', es: 'enojado', pos: 'adjectives' },
    // Новые слова урока 2
    { en: 'sure', ru: 'Уверенный', uk: 'Впевнений', es: 'seguro', pos: 'adjectives' },
    { en: 'expensive', ru: 'Дорогой', uk: 'Дорогий', es: 'caro', pos: 'adjectives' },
    { en: 'scary', ru: 'Страшный', uk: 'Страшний', es: 'aterrador',
    'pt-BR': 'Assustador', pos: 'adjectives' },
    { en: 'open', ru: 'Открытый', uk: 'Відкритий', es: 'abierto', pos: 'adjectives' },
    { en: 'funny', ru: 'Смешной', uk: 'Смішний', es: 'gracioso', pos: 'adjectives' },
    { en: 'afraid', ru: 'Испуганный / Боящийся', uk: 'Наляканий / Боязливий', es: 'asustado', pos: 'adjectives' },
    { en: 'far', ru: 'Далеко / Далёкий', uk: 'Далеко / Далекий', es: 'lejos', pos: 'adjectives' },
    { en: 'wrong', ru: 'Неправильный / Неправый', uk: 'Неправильний / Неправий', es: 'equivocado', pos: 'adjectives' },
    { en: 'true', ru: 'Правда / Истинный', uk: 'Правда / Істинний', es: 'verdadero', pos: 'adjectives' },
    { en: 'dangerous', ru: 'Опасный', uk: 'Небезпечний', es: 'peligroso', pos: 'adjectives' },
    { en: 'serious', ru: 'Серьёзный', uk: 'Серйозний', es: 'serio', pos: 'adjectives' },
  ],
  3: [
    // Личные местоимения — повторение
    { en: 'I', ru: 'Я', uk: 'Я', es: 'Yo', pos: 'pronouns' },
    { en: 'you', ru: 'Ты / Вы', uk: 'Ти / Ви', es: 'Tú / usted', pos: 'pronouns' },
    { en: 'he', ru: 'Он', uk: 'Він', es: 'Él', pos: 'pronouns' },
    { en: 'she', ru: 'Она', uk: 'Вона', es: 'Ella', pos: 'pronouns' },
    { en: 'we', ru: 'Мы', uk: 'Ми', es: 'Nosotros / nosotras', pos: 'pronouns' },
    { en: 'they', ru: 'Они', uk: 'Вони', es: 'Ellos / ellas', pos: 'pronouns' },
    { en: 'it', ru: 'Это / Оно', uk: 'Це / Воно', es: 'Eso / ello', pos: 'pronouns' },
    // Объектные местоимения — новые в уроке 3
    { en: 'me', ru: 'Меня / Мне', uk: 'Мене / Мені', es: 'me', pos: 'pronouns' },
    { en: 'him', ru: 'Его / Ему', uk: 'Його / Йому', es: 'lo / le', pos: 'pronouns' },
    { en: 'her', ru: 'Её / Ей', uk: 'Її / Їй', es: 'la / le', pos: 'pronouns' },
    { en: 'us', ru: 'Нас / Нам', uk: 'Нас / Нам', es: 'nos', pos: 'pronouns' },
    { en: 'them', ru: 'Их / Им', uk: 'Їх / Їм', es: 'los / les', pos: 'pronouns' },
    // Глаголы — основные новые слова урока
    { en: 'work', ru: 'Работать', uk: 'Працювати', es: 'trabajar', pos: 'verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', es: 'entender', pos: 'verbs' },
    { en: 'live', ru: 'Жить', uk: 'Жити', es: 'vivir', pos: 'verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', es: 'beber / tomar', pos: 'verbs' },
    { en: 'speak', ru: 'Говорить', uk: 'Говорити', es: 'hablar', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', es: 'ver / mirar', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'know', ru: 'Знать', uk: 'Знати', es: 'saber / conocer', pos: 'verbs' },
    { en: 'eat', ru: 'Есть / Кушать', uk: 'Їсти', es: 'comer', pos: 'verbs' },
    { en: 'love', ru: 'Любить', uk: 'Любити', es: 'amar / encantar', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', es: 'comprar', pos: 'verbs' },
    { en: 'cost', ru: 'Стоить', uk: 'Коштувати', es: 'costar', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', es: 'leer', pos: 'verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', es: 'oír / escuchar', pos: 'verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', es: 'escribir', pos: 'verbs' },
    { en: 'listen', ru: 'Слушать', uk: 'Слухати', es: 'escuchar', pos: 'verbs' },
    { en: 'wash', ru: 'Мыть', uk: 'Мити', es: 'lavar', pos: 'verbs' },
    { en: 'drive', ru: 'Водить / Ехать', uk: 'Водити / Їхати', es: 'conducir / manejar', pos: 'verbs' },
    { en: 'need', ru: 'Нуждаться / Нужно', uk: 'Потребувати / Потрібно', es: 'necesitar', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати / Дзвонити', es: 'llamar', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', es: 'cocinar', pos: 'verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', es: 'sentir',
    'pt-BR': 'Sentir', pos: 'verbs' },
    { en: 'travel', ru: 'Путешествовать', uk: 'Подорожувати', es: 'viajar', pos: 'verbs' },
    { en: 'teach', ru: 'Преподавать / Учить', uk: 'Викладати / Навчати', es: 'enseñar', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', es: 'olvidar', pos: 'verbs' },
    { en: 'remember', ru: 'Помнить', uk: 'Пам\'ятати', es: 'recordar', pos: 'verbs' },
    { en: 'wear', ru: 'Носить (одежду)', uk: 'Носити (одяг)', es: 'llevar / usar', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', es: 'pedir / ordenar', pos: 'verbs' },
    { en: 'use', ru: 'Использовать', uk: 'Використовувати', es: 'usar / utilizar', pos: 'verbs' },
    { en: 'trust', ru: 'Доверять', uk: 'Довіряти', es: 'confiar', pos: 'verbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', es: 'esperar', pos: 'verbs' },
    { en: 'come', ru: 'Приходить', uk: 'Приходити', es: 'venir', pos: 'verbs' },
    { en: 'look', ru: 'Выглядеть / Смотреть', uk: 'Виглядати / Дивитися', es: 'verse / mirar', pos: 'verbs' },
    { en: 'sound', ru: 'Звучать', uk: 'Звучати', es: 'sonar', pos: 'verbs' },
    { en: 'take', ru: 'Брать / Занимать', uk: 'Брати / Займати', es: 'tomar / llevar', pos: 'verbs' },
    // Существительные
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', es: 'café', pos: 'nouns' },
    { en: 'English', ru: 'Английский', uk: 'Англійська', es: 'inglés', pos: 'nouns' },
    { en: 'TV', ru: 'Телевизор', uk: 'Телевізор', es: 'televisión', pos: 'nouns' },
    { en: 'people', ru: 'Люди', uk: 'Люди', es: 'gente', pos: 'nouns' },
    { en: 'meat', ru: 'Мясо', uk: "М\'ясо", es: 'carne', pos: 'nouns' },
    { en: 'music', ru: 'Музыка', uk: 'Музика', es: 'música', pos: 'nouns' },
    { en: 'food', ru: 'Еда', uk: 'Їжа', es: 'comida', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', es: 'dinero', pos: 'nouns' },
    { en: 'books', ru: 'Книги', uk: 'Книжки', es: 'libros', pos: 'nouns' },
    { en: 'messages', ru: 'Сообщения', uk: 'Повідомлення', es: 'mensajes', pos: 'nouns' },
    { en: 'dishes', ru: 'Посуда', uk: 'Посуд', es: 'platos', pos: 'nouns' },
    { en: 'cars', ru: 'Машины', uk: 'Машини', es: 'coches', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', es: 'tiempo', pos: 'nouns' },
    { en: 'names', ru: 'Имена', uk: 'Імена', es: 'nombres', pos: 'nouns' },
    { en: 'glasses', ru: 'Очки', uk: 'Окуляри', es: 'gafas', pos: 'nouns' },
    { en: 'pizza', ru: 'Пицца', uk: 'Піца', es: 'pizza', pos: 'nouns' },
    { en: 'apps', ru: 'Приложения', uk: 'Застосунки', es: 'aplicaciones', pos: 'nouns' },
    { en: 'rest', ru: 'Отдых', uk: 'Відпочинок', es: 'descanso', pos: 'nouns' },
    { en: 'tea', ru: 'Чай', uk: 'Чай', es: 'té', pos: 'nouns' },
    // Наречия
    { en: 'often', ru: 'Часто', uk: 'Часто', es: 'a menudo', pos: 'adverbs' },
    { en: 'well', ru: 'Хорошо', uk: 'Добре', es: 'bien', pos: 'adverbs' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', es: 'aquí', pos: 'adverbs' },
  ],
  4: [
    // Вспомогательные глаголы — новая грамматика урока 4
    { en: 'do', ru: 'Делать', uk: 'Робити', es: 'hacer', pos: 'verbs' },
    { en: 'does', ru: 'Делает', uk: 'Робить', es: 'hace', pos: 'verbs' },
    // Новые глаголы урока 4
    { en: 'smoke', ru: 'Курить', uk: 'Курити', es: 'fumar', pos: 'verbs' },
    { en: 'pay', ru: 'Платить', uk: 'Платити', es: 'pagar', pos: 'verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', es: 'vender', pos: 'verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', es: 'perder',
    'pt-BR': 'Perder', pos: 'verbs' },
    { en: 'break', ru: 'Ломать', uk: 'Ламати', es: 'romper', pos: 'verbs' },
    { en: 'waste', ru: 'Тратить зря', uk: 'Витрачати даремно', es: 'desperdiciar', pos: 'verbs' },
    { en: 'share', ru: 'Делиться', uk: 'Ділитися', es: 'compartir', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', es: 'enviar', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'revisar', pos: 'verbs' },
    { en: 'skip', ru: 'Пропускать', uk: 'Пропускати', es: 'saltarse', pos: 'verbs' },
    { en: 'carry', ru: 'Носить с собой', uk: 'Носити з собою', es: 'llevar', pos: 'verbs' },
    { en: 'ask', ru: 'Спрашивать / Просить', uk: 'Питати / Просити', es: 'preguntar / pedir', pos: 'verbs' },
    { en: 'believe', ru: 'Верить', uk: 'Вірити', es: 'creer', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', es: 'ver', pos: 'verbs' },
    { en: 'like', ru: 'Нравиться / Любить', uk: 'Подобатися / Любити', es: 'gustar', pos: 'verbs' },
    // Закрепление глаголов из урока 3
    { en: 'drink', ru: 'Пить', uk: 'Пити', es: 'beber', pos: 'verbs' },
    { en: 'listen', ru: 'Слушать', uk: 'Слухати', es: 'escuchar', pos: 'verbs' },
    { en: 'eat', ru: 'Есть', uk: 'Їсти', es: 'comer', pos: 'verbs' },
    { en: 'understand', ru: 'Понимать', uk: 'Розуміти', es: 'entender', pos: 'verbs' },
    { en: 'live', ru: 'Жить', uk: 'Жити', es: 'vivir', pos: 'verbs' },
    { en: 'work', ru: 'Работать', uk: 'Працювати', es: 'trabajar', pos: 'verbs' },
    { en: 'know', ru: 'Знать', uk: 'Знати', es: 'saber / conocer', pos: 'verbs' },
    { en: 'remember', ru: 'Помнить', uk: 'Пам\'ятати', es: 'recordar', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', es: 'comprar', pos: 'verbs' },
    { en: 'use', ru: 'Использовать', uk: 'Використовувати', es: 'usar', pos: 'verbs' },
    { en: 'wear', ru: 'Носить (одежду)', uk: 'Носити (одяг)', es: 'llevar / usar', pos: 'verbs' },
    { en: 'drive', ru: 'Водить', uk: 'Водити', es: 'conducir', pos: 'verbs' },
    { en: 'feel', ru: 'Чувствовать', uk: 'Відчувати', es: 'sentir', pos: 'verbs' },
    { en: 'forget', ru: 'Забывать', uk: 'Забувати', es: 'olvidar', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'need', ru: 'Нуждаться', uk: 'Потребувати', es: 'necesitar', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', es: 'leer', pos: 'verbs' },
    { en: 'trust', ru: 'Доверять', uk: 'Довіряти', es: 'confiar', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', es: 'cocinar', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', es: 'llamar', pos: 'verbs' },
    { en: 'hear', ru: 'Слышать', uk: 'Чути', es: 'oír', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', es: 'ver / mirar', pos: 'verbs' },
    { en: 'take', ru: 'Брать', uk: 'Брати', es: 'tomar', pos: 'verbs' },
    // Новые существительные урока 4
    { en: 'milk', ru: 'Молоко', uk: 'Молоко', es: 'leche', pos: 'nouns' },
    { en: 'sugar', ru: 'Сахар', uk: 'Цукор', es: 'azúcar', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', es: 'efectivo', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'entradas', pos: 'nouns' },
    { en: 'things', ru: 'Вещи', uk: 'Речі', es: 'cosas', pos: 'nouns' },
    { en: 'maps', ru: 'Карты', uk: 'Карти', es: 'mapas', pos: 'nouns' },
    { en: 'breakfast', ru: 'Завтрак', uk: 'Сніданок', es: 'desayuno', pos: 'nouns' },
  ],
  5: [
    { en: 'sing', ru: 'Петь', uk: 'Співати', es: 'cantar', pos: 'verbs' },
    { en: 'book', ru: 'Бронировать', uk: 'Бронювати', es: 'reservar',
    'pt-BR': 'reservar', pos: 'verbs' },
    { en: 'code', ru: 'Код', uk: 'Код', es: 'código', pos: 'nouns' },
    { en: 'room', ru: 'Номер', uk: 'Номер', es: 'habitación', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', es: 'mesa', pos: 'nouns' },
    { en: 'vegetable', ru: 'Овощ', uk: 'Овоч', es: 'verdura', pos: 'nouns' },
    { en: 'job', ru: 'Работа', uk: 'Робота', es: 'trabajo', pos: 'nouns' },
    { en: 'luck', ru: 'Удача', uk: 'Вдача', es: 'suerte', pos: 'nouns' },
    { en: 'noise', ru: 'Шум', uk: 'Шум', es: 'ruido', pos: 'nouns' },
    { en: 'mask', ru: 'Маска', uk: 'Маска', es: 'mascarilla', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'boleto', pos: 'nouns' },
    { en: 'price', ru: 'Цена', uk: 'Ціна', es: 'precio', pos: 'nouns' },
    { en: 'credit', ru: 'Кредит', uk: 'Кредит', es: 'crédito', pos: 'nouns' },
    { en: 'card', ru: 'Карта (карточка)', uk: 'Картка', es: 'tarjeta', pos: 'nouns' },
    { en: 'rule', ru: 'Правило', uk: 'Правило', es: 'regla', pos: 'nouns' },
    { en: 'tax', ru: 'Налог', uk: 'Податок', es: 'impuesto', pos: 'nouns' },
    { en: 'taxes', ru: 'Налоги', uk: 'Податки', es: 'impuestos', pos: 'nouns' },
    { en: 'mistake', ru: 'Ошибка', uk: 'Помилка', es: 'error', pos: 'nouns' },
    { en: 'tomorrow', ru: 'Завтра', uk: 'Завтра', es: 'mañana', pos: 'adverbs' },
    { en: 'much', ru: 'Много', uk: 'Багато', es: 'mucho', pos: 'adverbs' },
    { en: 'well', ru: 'Хорошо', uk: 'Добре', es: 'Bueno', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутрь', uk: 'Всередину', es: 'adentro', pos: 'adverbs' },
    { en: 'correctly', ru: 'Правильно', uk: 'Правильно', es: 'correctamente', pos: 'adverbs' },
    { en: 'enough', ru: 'Достаточно', uk: 'Достатньо', es: 'suficiente', pos: 'adverbs' },
    { en: 'cold', ru: 'Холодный', uk: 'Холодний', es: 'frío', pos: 'adjectives' },
  ],
  6: [
    { en: 'where', ru: 'Где', uk: 'Де', es: 'dónde', pos: 'adverbs' },
    { en: 'what', ru: 'Что', uk: 'Що', es: 'qué', pos: 'adverbs' },
    { en: 'when', ru: 'Когда', uk: 'Коли', es: 'cuándo', pos: 'adverbs' },
    { en: 'who', ru: 'Кто', uk: 'Хто', es: 'quién', pos: 'adverbs' },
    { en: 'why', ru: 'Почему', uk: 'Чому', es: 'por qué', pos: 'adverbs' },
    { en: 'how', ru: 'Как', uk: 'Як', es: 'cómo', pos: 'adverbs' },
    { en: 'which', ru: 'Какой (из)', uk: 'Який (з)', es: 'cuál', pos: 'adverbs' },
    { en: 'how much', ru: 'Сколько (цена или количество)', uk: 'Скільки (ціна або кількість)', es: 'cuánto', pos: 'adverbs' },
    { en: 'start', ru: 'Начинать', uk: 'Починати', es: 'empezar', pos: 'verbs' },
    { en: 'cry', ru: 'Плакать', uk: 'Плакати', es: 'llorar', pos: 'verbs' },
    { en: 'cost', ru: 'Стоить', uk: 'Коштувати', es: 'costar', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', es: 'llamar', pos: 'verbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', es: 'esperar', pos: 'verbs' },
    { en: 'usually', ru: 'Обычно', uk: 'Зазвичай', es: 'generalmente', pos: 'adverbs' },
    { en: 'now', ru: 'Сейчас', uk: 'Зараз', es: 'ahora', pos: 'adverbs' },
    { en: 'open', ru: 'Открывать', uk: 'Відкривати', es: 'abrir', pos: 'verbs' },
    { en: 'sign', ru: 'Подписывать', uk: 'Підписувати', es: 'firmar', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Відправляти', es: 'enviar', pos: 'verbs' },
    { en: 'want', ru: 'Хотеть', uk: 'Хотіти', es: 'querer',
    'pt-BR': 'querer', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', es: 'terminar', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', es: 'ver', pos: 'verbs' },
    { en: 'carry', ru: 'Носить (в руках)', uk: 'Носити (в руках)', es: 'llevar', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'revisar', pos: 'verbs' },
    { en: 'speak', ru: 'Говорить', uk: 'Говорити', es: 'hablar', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', es: 'mirar', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', es: 'pedir', pos: 'verbs' },
    { en: 'slowly', ru: 'Медленно', uk: 'Повільно', es: 'despacio', pos: 'adverbs' },
    { en: 'always', ru: 'Всегда', uk: 'Завжди', es: 'siempre', pos: 'adverbs' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', es: 'puerta', pos: 'nouns' },
    { en: 'home', ru: 'Дом; домой', uk: 'Дім; додому', es: 'casa; a casa', pos: 'nouns' },
    { en: 'report', ru: 'Отчёт', uk: 'Звіт', es: 'informe', pos: 'nouns' },
    { en: 'exit', ru: 'Выход', uk: 'Вихід', es: 'salida', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'shop', ru: 'Магазин', uk: 'Магазин', es: 'tienda', pos: 'nouns' },
    { en: 'guest', ru: 'Гость', uk: 'Гість', es: 'invitado', pos: 'nouns' },
    { en: 'mail', ru: 'Почта', uk: 'Пошта', es: 'correo', pos: 'nouns' },
    { en: 'groceries', ru: 'Продукты (бакалея)', uk: 'Продукти (бакалія)', es: 'compra (víveres)', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', es: 'reunión', pos: 'nouns' },
    { en: 'luggage', ru: 'Багаж', uk: 'Багаж', es: 'equipaje', pos: 'nouns' },
    { en: 'way', ru: 'Путь; дорога', uk: 'Шлях; дорога', es: 'camino', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'bill', ru: 'Счёт (в ресторане)', uk: 'Рахунок (у ресторані)', es: 'cuenta', pos: 'nouns' },
    { en: 'cafe', ru: 'Кафе (заведение; не напиток «кофе»)', uk: 'Кафе (заклад; не напій «кава»)', es: 'café', pos: 'nouns' },
  ],
  7: [
    { en: 'i', ru: 'Я', uk: 'Я', es: 'yo', pos: 'nouns' },
    { en: 'he', ru: 'Он', uk: 'Він', es: 'él', pos: 'nouns' },
    { en: 'she', ru: 'Она', uk: 'Вона', es: 'ella', pos: 'nouns' },
    { en: 'we', ru: 'Мы', uk: 'Ми', es: 'nosotros', pos: 'nouns' },
    { en: 'they', ru: 'Они', uk: 'Вони', es: 'ellos', pos: 'nouns' },
    { en: 'my', ru: 'Мой (моя, моё)', uk: 'Мій (моя, моє)', es: 'mi', pos: 'adjectives' },
    { en: 'his', ru: 'Его', uk: 'Його', es: 'su', pos: 'adjectives' },
    { en: 'this', ru: 'Этот (эта, это)', uk: 'Цей (ця, це)', es: 'este', pos: 'adjectives' },
    { en: 'not', ru: 'Не', uk: 'Не', es: 'no', pos: 'nouns' },
    { en: 'do', ru: 'Делать (вспомогательный в вопросах и отрицании)', uk: 'Робити (допоміжне в запитаннях і запереченні)', es: 'hacer (auxiliar)', pos: 'verbs' },
    { en: 'does', ru: 'Форма do в вопросах (он, она, оно)', uk: 'Форма do у запитаннях (він, вона, воно)', es: 'hace (auxiliar)', pos: 'verbs' },
    { en: 'have', ru: 'Иметь (обладать)', uk: 'Мати (володіти)', es: 'tener', pos: 'verbs' },
    { en: 'has', ru: 'Имеет (форма have: он, она, оно)', uk: 'Має (форма «мати»: він, вона, воно)', es: 'tiene (tener)', pos: 'verbs' },
    { en: 'about', ru: 'О; про (насчёт)', uk: 'Про; щодо', es: 'sobre', pos: 'nouns' },
    { en: 'for', ru: 'Для', uk: 'Для', es: 'para', pos: 'nouns' },
    { en: 'with', ru: 'С; со (предлог «с»)', uk: 'З; із (прийменник «з»)', es: 'con', pos: 'nouns' },
    { en: 'and', ru: 'И', uk: 'І; та', es: 'y', pos: 'nouns' },
    { en: 'insurance', ru: 'Страховка', uk: 'Страховка', es: 'seguro',
    'pt-BR': 'Seguro', pos: 'nouns' },
    { en: 'driver', ru: 'Водитель', uk: 'Водій', es: 'conductor', pos: 'nouns' },
    { en: 'license', ru: 'Лицензия / разрешение', uk: 'Ліцензія / дозвіл', es: 'licencia / permiso', pos: 'nouns' },
    { en: 'free', ru: 'Свободный (о времени)', uk: 'Вільний (про час)', es: 'libre', pos: 'adjectives' },
    { en: 'time', ru: 'Время', uk: 'Час', es: 'tiempo', pos: 'nouns' },
    { en: 'allergy', ru: 'Аллергия', uk: 'Алергія', es: 'alergia', pos: 'nouns' },
    { en: 'nut', ru: 'Орех (плод)', uk: 'Горіх (плід)', es: 'fruto seco', pos: 'nouns' },
    { en: 'reservation', ru: 'Бронь; резерв (столика, места)', uk: 'Бронь; резервування місця', es: 'reserva', pos: 'nouns' },
    { en: 'booking', ru: 'Бронирование (номер, билет, запись)', uk: 'Бронювання (номер, квиток, запис)', es: 'reserva', pos: 'nouns' },
    { en: 'lighter', ru: 'Зажигалка', uk: 'Запальничка', es: 'encendedor', pos: 'nouns' },
    { en: 'pass', ru: 'Пропуск', uk: 'Пропуск', es: 'pase', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные (деньги)', uk: 'Готівка', es: 'efectivo', pos: 'nouns' },
    { en: 'change', ru: 'Сдача', uk: 'Решта', es: 'cambio', pos: 'nouns' },
    { en: 'tablet', ru: 'Планшет', uk: 'Планшет', es: 'tableta', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядное устройство', uk: 'Зарядний пристрій', es: 'cargador', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', es: 'pasaporte', pos: 'nouns' },
    { en: 'menu', ru: 'Меню', uk: 'Меню', es: 'menú', pos: 'nouns' },
    { en: 'device', ru: 'Устройство', uk: 'Пристрій', es: 'dispositivo', pos: 'nouns' },
    { en: 'discount', ru: 'Скидка', uk: 'Знижка', es: 'descuento', pos: 'nouns' },
    { en: 'city', ru: 'Город', uk: 'Місто', es: 'ciudad', pos: 'nouns' },
    { en: 'cities', ru: 'Города', uk: 'Міста', es: 'ciudades', pos: 'nouns' },
    { en: 'map', ru: 'Карта', uk: 'Карта', es: 'mapa', pos: 'nouns' },
    { en: 'guide', ru: 'Путеводитель', uk: 'Путівник', es: 'guía', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', es: 'hotel', pos: 'nouns' },
    { en: 'Wi-Fi', ru: 'Беспроводной интернет', uk: 'Бездротовий інтернет', es: 'wifi', pos: 'nouns' },
    { en: 'lunch', ru: 'Обед', uk: 'Обід', es: 'almuerzo', pos: 'nouns' },
    { en: 'break', ru: 'Перерыв', uk: 'Перерва', es: 'descanso', pos: 'nouns' },
    { en: 'spare', ru: 'Запасной', uk: 'Запасний', es: 'repuesto', pos: 'adjectives' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', es: 'llave', pos: 'nouns' },
    { en: 'appetite', ru: 'Аппетит', uk: 'Апетит', es: 'apetito', pos: 'nouns' },
    { en: 'international', ru: 'Международный', uk: 'Міжнародний', es: 'internacional', pos: 'adjectives' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', es: 'pregunta', pos: 'nouns' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'teléfono', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', es: 'dirección', pos: 'nouns' },
    { en: 'return', ru: 'Обратный (о билете)', uk: 'Зворотний (про квиток)', es: 'de vuelta', pos: 'adjectives' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'billete', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'billetes', pos: 'nouns' },
    { en: 'confirmation', ru: 'Подтверждение', uk: 'Підтвердження', es: 'confirmación', pos: 'nouns' },
    { en: 'power bank', ru: 'Внешний аккумулятор (power bank)', uk: 'Зовнішній акумулятор (павербанк)', es: 'batería externa', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'documents', ru: 'Документы', uk: 'Документи', es: 'documentos', pos: 'nouns' },
    { en: 'policy', ru: 'Политика (компании)', uk: 'Політика (компанії)', es: 'política (empresa)', pos: 'nouns' },
    {
      en: 'issue',
      ru: 'Спорный вопрос; пункт',
      uk: 'Спірне питання; пункт',
      es: 'asunto',
      'pt-BR': 'Questão controversa; item',
      pos: 'nouns',
      context: 'There is a serious ... with the payment system that we need to fix.',
    },
    { en: 'number', ru: 'Номер', uk: 'Номер', es: 'número', pos: 'nouns' },
    { en: 'all', ru: 'Все (целиком)', uk: 'Усі; все', es: 'todo', pos: 'adjectives' },
    { en: 'needed', ru: 'Нужный; необходимый', uk: 'Потрібний; необхідний', es: 'necesario', pos: 'adjectives' },
    { en: 'umbrella', ru: 'Зонт', uk: 'Парасоля', es: 'paraguas', pos: 'nouns' },
    { en: 'headache', ru: 'Головная боль', uk: 'Головний біль', es: 'dolor de cabeza', pos: 'nouns' },
    { en: 'pen', ru: 'Ручка', uk: 'Ручка', es: 'bolígrafo', pos: 'nouns' },
    { en: 'suitcase', ru: 'Чемодан', uk: 'Валіза', es: 'maleta', pos: 'nouns' },
    { en: 'bicycle', ru: 'Велосипед', uk: 'Велосипед', es: 'bicicleta', pos: 'nouns' },
    { en: 'dog', ru: 'Собака', uk: 'Собака', es: 'perro', pos: 'nouns' },
    { en: 'backpack', ru: 'Рюкзак', uk: 'Рюкзак', es: 'mochila', pos: 'nouns' },
    { en: 'plan', ru: 'План', uk: 'План', es: 'plan', pos: 'nouns' },
    { en: 'good', ru: 'Хороший', uk: 'Гарний', es: 'bueno', pos: 'adjectives' },
    { en: 'news', ru: 'Новости', uk: 'Новини', es: 'noticias', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', es: 'café', pos: 'nouns' },
  ],
  8: [
    { en: 'on', ru: 'В / по (дни недели)', uk: 'У / по (дні тижня)', es: 'el / los + день', pos: 'adverbs' },
    { en: 'in', ru: 'В (месяцы, сезоны, части суток)', uk: 'У (місяці, пори року, частини доби)', es: 'en + месяц / сезон', pos: 'adverbs' },
    { en: 'at', ru: 'В / о (точное время, час)', uk: 'О / у (точний час, година)', es: 'a las + время', pos: 'adverbs' },
    { en: 'Monday', ru: 'Понедельник', uk: 'Понеділок', es: 'Lunes', pos: 'nouns' },
    { en: 'Tuesday', ru: 'Вторник', uk: 'Вівторок', es: 'Martes', pos: 'nouns' },
    { en: 'Wednesday', ru: 'Среда', uk: 'Середа', es: 'Miércoles', pos: 'nouns' },
    { en: 'Thursday', ru: 'Четверг', uk: 'Четвер', es: 'Jueves', pos: 'nouns' },
    { en: 'Friday', ru: 'Пятница', uk: "П\'ятниця", es: 'Viernes', pos: 'nouns' },
    { en: 'Saturday', ru: 'Суббота', uk: 'Субота', es: 'Sábado', pos: 'nouns' },
    { en: 'Sunday', ru: 'Воскресенье', uk: 'Неділя', es: 'Domingo', pos: 'nouns' },
    { en: 'weekend', ru: 'Выходные', uk: 'Вихідні', es: 'fin de semana', pos: 'nouns' },
    { en: 'weekends', ru: 'Выходные (повторяющиеся)', uk: 'Вихідні (кілька разів)', es: 'fines de semana', pos: 'nouns' },
    { en: 'morning', ru: 'Утро', uk: 'Ранок', es: 'mañana (утро)', pos: 'nouns' },
    { en: 'noon', ru: 'Полдень', uk: 'Полудень', es: 'mediodía', pos: 'nouns' },
    { en: 'afternoon', ru: 'День (после полудня)', uk: 'Після полудня (друга половина дня)', es: 'tarde', pos: 'nouns' },
    { en: 'evening', ru: 'Вечер', uk: 'Вечір', es: 'tarde (вечер)', pos: 'nouns' },
    { en: 'night', ru: 'Ночь', uk: 'Ніч', es: 'noche', pos: 'nouns' },
    { en: 'midnight', ru: 'Полночь', uk: 'Опівніч', es: 'medianoche', pos: 'nouns' },
    { en: 'AM', ru: 'До полудня (утро)', uk: 'До полудня (ранок)', es: 'a. m.', pos: 'nouns' },
    { en: 'PM', ru: 'После полудня (день и вечер)', uk: 'Після полудня (день і вечір)', es: 'p. m.', pos: 'nouns' },
    { en: "o\'clock", ru: 'Ровно (указание часа)', uk: 'Рівно (на годиннику)', es: 'en punto', 'pt-BR': 'em ponto', vi: 'đúng giờ', id: 'tepat pukul', tr: 'tam saat', pl: 'punkt / równo o', pos: 'nouns' },
    { en: 'one', ru: 'Один', uk: 'Один', es: 'uno', pos: 'nouns' },
    { en: 'two', ru: 'Два', uk: 'Два', es: 'dos', pos: 'nouns' },
    { en: 'five', ru: 'Пять', uk: "П\'ять", es: 'cinco', pos: 'nouns' },
    { en: 'six', ru: 'Шесть', uk: 'Шість', es: 'seis', pos: 'nouns' },
    { en: 'seven', ru: 'Семь', uk: 'Сім', es: 'siete', pos: 'nouns' },
    { en: 'eight', ru: 'Восемь', uk: 'Вісім', es: 'ocho', pos: 'nouns' },
    { en: 'nine', ru: 'Девять', uk: "Дев\'ять", es: 'nueve',
    'pt-BR': 'Nove', pos: 'nouns' },
    { en: 'ten', ru: 'Десять', uk: 'Десять', es: 'diez', pos: 'nouns' },
    { en: 'fifteen', ru: 'Пятнадцать', uk: "П\'ятнадцять", es: 'quince', pos: 'nouns' },
    { en: 'thirty', ru: 'Тридцать', uk: 'Тридцять', es: 'treinta', pos: 'nouns' },
    { en: 'January', ru: 'Январь', uk: 'Січень', es: 'enero', pos: 'nouns' },
    { en: 'February', ru: 'Февраль', uk: 'Лютий', es: 'febrero', pos: 'nouns' },
    { en: 'March', ru: 'Март', uk: 'Березень', es: 'marzo', pos: 'nouns' },
    { en: 'April', ru: 'Апрель', uk: 'Квітень', es: 'abril', pos: 'nouns' },
    { en: 'May', ru: 'Май', uk: 'Травень', es: 'mayo', pos: 'nouns' },
    { en: 'June', ru: 'Июнь', uk: 'Червень', es: 'junio', pos: 'nouns' },
    { en: 'July', ru: 'Июль', uk: 'Липень', es: 'julio', pos: 'nouns' },
    { en: 'August', ru: 'Август', uk: 'Серпень', es: 'agosto', pos: 'nouns' },
    { en: 'September', ru: 'Сентябрь', uk: 'Вересень', es: 'septiembre', pos: 'nouns' },
    { en: 'October', ru: 'Октябрь', uk: 'Жовтень', es: 'octubre', pos: 'nouns' },
    { en: 'November', ru: 'Ноябрь', uk: 'Листопад', es: 'noviembre', pos: 'nouns' },
    { en: 'December', ru: 'Декабрь', uk: 'Грудень', es: 'diciembre', pos: 'nouns' },
    { en: 'spring', ru: 'Весна', uk: 'Весна', es: 'primavera', pos: 'nouns' },
    { en: 'summer', ru: 'Лето', uk: 'Літо', es: 'verano', pos: 'nouns' },
    { en: 'winter', ru: 'Зима', uk: 'Зима', es: 'invierno', pos: 'nouns' },
    { en: 'birthday', ru: 'День рождения', uk: 'День народження', es: 'cumpleaños', pos: 'nouns' },
    { en: 'vacation', ru: 'Отпуск', uk: 'Відпустка', es: 'vacaciones', pos: 'nouns' },
    { en: 'rent', ru: 'Аренда', uk: 'Оренда', es: 'alquiler', pos: 'nouns' },
    { en: 'gym', ru: 'Спортзал', uk: 'Спортзал', es: 'gimnasio', pos: 'nouns' },
    { en: 'train', ru: 'Поезд', uk: 'Потяг', es: 'tren', pos: 'nouns' },
    { en: 'park', ru: 'Парк', uk: 'Парк', es: 'parque', pos: 'nouns' },
    { en: 'sport', ru: 'Спорт', uk: 'Спорт', es: 'deporte', pos: 'nouns' },
    { en: 'do', ru: 'Делать (в выражении про спорт — заниматься)', uk: 'Робити (у виразі про спорт — займатися)', es: 'hacer', pos: 'verbs' },
    { en: 'visit', ru: 'Посещать', uk: 'Відвідувати', es: 'visitar', pos: 'verbs' },
    { en: 'visits', ru: 'Посещает (он, она)', uk: 'Відвідує (він, вона)', es: 'visita', pos: 'verbs' },
    { en: 'music', ru: 'Музыка', uk: 'Музика', es: 'música', pos: 'nouns' },
    { en: 'pizza', ru: 'Пицца', uk: 'Піца', es: 'pizza', pos: 'nouns' },
    { en: 'mother', ru: 'Мама', uk: 'Мама', es: 'madre', pos: 'nouns' },
    { en: 'tea', ru: 'Чай', uk: 'Чай', es: 'té', pos: 'nouns' },
    { en: 'arrive', ru: 'Прибывать', uk: 'Прибувати', es: 'llegar', pos: 'verbs' },
    { en: 'depart', ru: 'Отправляться', uk: 'Відправлятися', es: 'salir', pos: 'verbs' },
    { en: 'travel', ru: 'Путешествовать', uk: 'Подорожувати', es: 'viajar', pos: 'verbs' },
    { en: 'relax', ru: 'Отдыхать', uk: 'Відпочивати', es: 'relajarse', pos: 'verbs' },
    { en: 'class', ru: 'Занятие (урок)', uk: 'Заняття (урок)', es: 'clase', pos: 'nouns' },
    { en: 'classes', ru: 'Уроки (занятия)', uk: 'Заняття (уроки)', es: 'clases', pos: 'nouns' },
    { en: 'shower', ru: 'Душ', uk: 'Душ', es: 'ducha', pos: 'nouns' },
  ],
  9: [
    { en: 'bed', ru: 'Кровать', uk: 'Ліжко', es: 'cama', pos: 'nouns' },
    { en: 'fridge', ru: 'Холодильник', uk: 'Холодильник', es: 'refrigerador', pos: 'nouns' },
    { en: 'lift', ru: 'Лифт', uk: 'Ліфт', es: 'ascensor',
    'pt-BR': 'Elevador', pos: 'nouns' },
    { en: 'street', ru: 'Улица', uk: 'Вулиця', es: 'calle', pos: 'nouns' },
    { en: 'towel', ru: 'Полотенце', uk: 'Рушник', es: 'toalla', pos: 'nouns' },
    { en: 'space', ru: 'Место (пространство)', uk: 'Місце (простір)', es: 'espacio', pos: 'nouns' },
    { en: 'parking lot', ru: 'Парковка', uk: 'Парковка', es: 'estacionamiento', pos: 'nouns' },
    { en: 'shelf', ru: 'Полка', uk: 'Полиця', es: 'estante', pos: 'nouns' },
    { en: 'shelves', ru: 'Полки', uk: 'Полиці', es: 'estantes', pos: 'nouns' },
    { en: 'district', ru: 'Район', uk: 'Район', es: 'distrito', pos: 'nouns' },
    { en: 'first aid kit', ru: 'Аптечка', uk: 'Аптечка', es: 'botiquín de primeros auxilios', pos: 'nouns' },
    { en: 'ice', ru: 'Лед', uk: 'Лід', es: 'hielo', pos: 'nouns' },
    { en: 'glass', ru: 'Стакан', uk: 'Склянка', es: 'vaso', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', es: 'muro', pos: 'nouns' },
    { en: 'garden', ru: 'Сад', uk: 'Сад', es: 'jardín', pos: 'nouns' },
    { en: 'plate', ru: 'Тарелка', uk: 'Тарілка', es: 'plato', pos: 'nouns' },
    { en: 'living room', ru: 'Гостиная', uk: 'Вітальня', es: 'sala de estar', pos: 'nouns' },
    { en: 'information', ru: 'Информация', uk: 'Інформація', es: 'información', pos: 'nouns' },
    { en: 'apartment', ru: 'Квартира', uk: 'Квартира', es: 'departamento', pos: 'nouns' },
    { en: 'coffeemaker', ru: 'Кофемашина', uk: 'Кавомашина', es: 'cafetera', pos: 'nouns' },
    { en: 'desk', ru: 'Письменный стол', uk: 'Письмовий стіл', es: 'escritorio', pos: 'nouns' },
    { en: 'library', ru: 'Библиотека', uk: 'Бібліотека', es: 'biblioteca', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелек', uk: 'Гаманець', es: 'billetera', pos: 'nouns' },
    { en: 'furniture', ru: 'Мебель', uk: 'Меблі', es: 'muebles', pos: 'nouns' },
    { en: 'supermarket', ru: 'Супермаркет', uk: 'Супермаркет', es: 'supermercado', pos: 'nouns' },
    { en: 'museum', ru: 'Музей', uk: 'Музей', es: 'museo', pos: 'nouns' },
    { en: 'link', ru: 'Ссылка', uk: 'Посилання', es: 'enlace', pos: 'nouns' },
    { en: 'email', ru: 'Электронное письмо', uk: 'Електронний лист', es: 'correo electrónico', pos: 'nouns' },
    { en: 'group', ru: 'Группа', uk: 'Група', es: 'grupo', pos: 'nouns' },
    { en: 'video', ru: 'Видео', uk: 'Відео', es: 'video', pos: 'nouns' },
    { en: 'profile', ru: 'Профиль', uk: 'Профіль', es: 'perfil', pos: 'nouns' },
    { en: 'house', ru: 'Дом', uk: 'Будинок', es: 'casa', pos: 'nouns' },
    { en: 'country', ru: 'Страна', uk: 'Країна', es: 'país', pos: 'nouns' },
    { en: 'countries', ru: 'Страны', uk: 'Країни', es: 'países', pos: 'nouns' },
    { en: 'any', ru: 'Любой / какой-нибудь', uk: 'Будь-який', es: 'cualquier', pos: 'adjectives' },
    { en: 'apple', ru: 'Яблоко', uk: 'Яблуко', es: 'manzana', pos: 'nouns' },
    { en: 'beautiful', ru: 'Красивый', uk: 'Гарний', es: 'hermoso', pos: 'adjectives' },
    { en: 'bedroom', ru: 'Спальня', uk: 'Спальня', es: 'dormitorio', pos: 'nouns' },
    { en: 'big', ru: 'Большой', uk: 'Великий', es: 'grande', pos: 'nouns' },
    { en: 'cafe', ru: 'Кафе (заведение; не напиток «кофе»)', uk: 'Кафе (заклад; не напій «кава»)', es: 'cafetería', pos: 'nouns' },
    { en: 'car', ru: 'Машина', uk: 'Машина', es: 'carro', pos: 'nouns' },
    { en: 'classroom', ru: 'Класс', uk: 'Класна кімната', es: 'aula', pos: 'nouns' },
    { en: 'clean', ru: 'Чистый', uk: 'Чистий', es: 'limpio', pos: 'adjectives' },
    { en: 'clock', ru: 'Часы', uk: 'Годинник', es: 'reloj', pos: 'nouns' },
    { en: 'dessert', ru: 'Десерт', uk: 'Десерт', es: 'postre', pos: 'nouns' },
    { en: 'famous', ru: 'Известный', uk: 'Відомий', es: 'famoso',
    'pt-BR': 'famoso', pos: 'adjectives' },
    { en: 'film', ru: 'Фильм', uk: 'Фільм', es: 'película', pos: 'nouns' },
    { en: 'machine', ru: 'Машина (механизм)', uk: 'Машина (механізм)', es: 'máquina', pos: 'nouns' },
    { en: 'magazine', ru: 'Журнал', uk: 'Журнал', es: 'revista', pos: 'nouns' },
    { en: 'many', ru: 'Много', uk: 'Багато', es: 'muchos', pos: 'nouns' },
    { en: 'much', ru: 'Много (с неисчисляемым)', uk: 'Багато (з незлічуваним)', es: 'mucho', pos: 'adverbs' },
    { en: 'mirror', ru: 'Зеркало', uk: 'Дзеркало', es: 'espejo', pos: 'nouns' },
    { en: 'mountain', ru: 'Гора', uk: 'Гора', es: 'montaña', pos: 'nouns' },
    { en: 'new', ru: 'Новый', uk: 'Новий', es: 'nuevo', pos: 'nouns' },
    { en: 'note', ru: 'Записка', uk: 'Записка', es: 'nota', pos: 'nouns' },
    { en: 'old', ru: 'Старый', uk: 'Старий', es: 'viejo', pos: 'nouns' },
    { en: 'pen', ru: 'Ручка', uk: 'Ручка', es: 'bolígrafo', pos: 'nouns' },
    { en: 'pharmacy', ru: 'Аптека', uk: 'Аптека', es: 'farmacia', pos: 'nouns' },
    { en: 'photo', ru: 'Фото', uk: 'Фото', es: 'foto', pos: 'nouns' },
    { en: 'place', ru: 'Место', uk: 'Місце', es: 'lugar', pos: 'nouns' },
    { en: 'pocket', ru: 'Карман', uk: 'Кишеня', es: 'bolsillo', pos: 'nouns' },
    { en: 'pool', ru: 'Бассейн', uk: 'Басейн', es: 'piscina', pos: 'nouns' },
    { en: 'printer', ru: 'Принтер', uk: 'Принтер', es: 'impresora', pos: 'nouns' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', es: 'pregunta', pos: 'nouns' },
    { en: 'quiet', ru: 'Тихий', uk: 'Тихий', es: 'tranquilo', pos: 'nouns' },
    { en: 'sky', ru: 'Небо', uk: 'Небо', es: 'cielo', pos: 'nouns' },
    { en: 'some', ru: 'Некоторые', uk: 'Деякі', es: 'alguno', pos: 'nouns' },
    { en: 'star', ru: 'Звезда', uk: 'Зірка', es: 'estrella', pos: 'nouns' },
    { en: 'student', ru: 'Учащийся', uk: 'Студент', es: 'estudiante', pos: 'nouns' },
    { en: 'task', ru: 'Задача', uk: 'Завдання', es: 'tarea', pos: 'nouns' },
    { en: 'there', ru: 'Там', uk: 'Там', es: 'allá', pos: 'adverbs' },
    { en: 'toy', ru: 'Игрушка', uk: 'Іграшка', es: 'juguete', pos: 'nouns' },
    { en: 'tree', ru: 'Дерево', uk: 'Дерево', es: 'árbol', pos: 'nouns' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисний', es: 'útil', pos: 'adjectives' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', es: 'ventana', pos: 'nouns' },
  ],
  10: [
    { en: 'can', ru: 'Мочь / Уметь', uk: 'Могти / Вміти', es: 'poder', pos: 'verbs' },
    { en: 'must', ru: 'Должен / Обязан', uk: 'Повинен / Зобов\'язаний', es: 'deber', pos: 'verbs' },
    { en: "can\'t", ru: 'Нельзя / не могу', uk: 'Не можна / не можу', es: 'no poder', 'pt-BR': 'não pode / não consigo', vi: 'không thể / không được', id: 'tidak bisa / tidak boleh', tr: 'yapamamak / yasak', pl: 'nie mogę / nie wolno', pos: 'verbs' },
    { en: "mustn\'t", ru: 'Нельзя (запрет)', uk: 'Не можна (заборона)', es: 'prohibido', 'pt-BR': 'não se deve / proibido', vi: 'không được / bị cấm', id: 'tidak boleh / dilarang', tr: 'yapmamalı / yasak', pl: 'nie wolno / zabronione', pos: 'verbs' },
    { en: 'have to', ru: 'Нужно / приходится', uk: 'Потрібно / доводиться', es: 'tener que', pos: 'verbs' },
    { en: 'may', ru: 'Можно (разрешение)', uk: 'Можна (дозвіл)', es: 'poder (permiso)', pos: 'verbs' },
    { en: 'should', ru: 'Следует / стоило бы', uk: 'Слід / варто було б', es: 'debería', pos: 'verbs' },
    { en: 'could', ru: 'Мог бы / смог бы', uk: 'Міг би / зміг би', es: 'podría', pos: 'verbs' },
    { en: 'might', ru: 'Возможно (мало вероятно)', uk: 'Можливо', es: 'quizá', pos: 'verbs' },
    { en: 'would', ru: 'Бы (условное намерение)', uk: 'Би (умовний)', es: 'condicional (‑ía)', pos: 'verbs' },
    { en: 'will', ru: 'Буду / будет (будущее)', uk: 'Буду / буде (майбутній)', es: 'futuro (‑rá)', pos: 'verbs' },
    { en: 'need', ru: 'Нужно / нуждаться', uk: 'Потрібно / потребувати', es: 'necesitar', pos: 'verbs' },
    { en: 'translate', ru: 'Переводить', uk: 'Перекладати', es: 'traducir',
    'pt-BR': 'traduzir', pos: 'verbs' },
    { en: 'fix', ru: 'Починить', uk: 'Полагодити', es: 'arreglar', pos: 'verbs' },
    { en: 'explain', ru: 'Объяснять', uk: 'Пояснювати', es: 'explicar', pos: 'verbs' },
    { en: 'discuss', ru: 'Обсуждать', uk: 'Обговорювати', es: 'comentar', pos: 'verbs' },
    { en: 'repair', ru: 'Ремонтировать', uk: 'Ремонтувати', es: 'reparar', pos: 'verbs' },
    { en: 'save', ru: 'Экономить / Сохранять', uk: 'Економити / Зберігати', es: 'ahorrar / guardar', pos: 'verbs' },
    { en: 'protect', ru: 'Защищать', uk: 'Захищати', es: 'proteger', pos: 'verbs' },
    { en: 'organize', ru: 'Организовывать', uk: 'Організувати', es: 'organizar', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', es: 'terminar', pos: 'verbs' },
    { en: 'remember', ru: 'Помнить / Запомнить', uk: 'Пам\'ятати / Запам\'ятати', es: 'recordar', pos: 'verbs' },
    { en: 'answer', ru: 'Отвечать', uk: 'Відповідати', es: 'responder', pos: 'verbs' },
    { en: 'ask', ru: 'Спрашивать', uk: 'Питати', es: 'preguntar', pos: 'verbs' },
    { en: 'study', ru: 'Учиться / Изучать', uk: 'Вчитися / Вивчати', es: 'estudiar', pos: 'verbs' },
    { en: 'print', ru: 'Распечатывать', uk: 'Роздруковувати', es: 'imprimir', pos: 'verbs' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', es: 'contraseña', pos: 'nouns' },
    { en: 'report', ru: 'Отчёт', uk: 'Звіт', es: 'informe', pos: 'nouns' },
    { en: 'luggage', ru: 'Багаж', uk: 'Багаж', es: 'equipaje', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: 'Комп\'ютер', es: 'ordenador', pos: 'nouns' },
    { en: 'energy', ru: 'Энергия', uk: 'Енергія', es: 'energía', pos: 'nouns' },
    { en: 'suit', ru: 'Костюм', uk: 'Костюм', es: 'traje', pos: 'nouns' },
    { en: 'medicine', ru: 'Лекарство', uk: 'Ліки', es: 'medicamento', pos: 'nouns' },
    { en: 'task', ru: 'Задание', uk: 'Завдання', es: 'tarea', pos: 'nouns' },
    { en: 'gift', ru: 'Подарок', uk: 'Подарунок', es: 'regalo', pos: 'nouns' },
    { en: 'email', ru: 'Электронное письмо', uk: 'Електронний лист', es: 'correo electrónico', pos: 'nouns' },
    { en: 'photo', ru: 'Фото', uk: 'Фото', es: 'foto', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'boleto', pos: 'nouns' },
    { en: 'project', ru: 'Проект', uk: 'Проект', es: 'proyecto', pos: 'nouns' },
    { en: 'bike', ru: 'Велосипед (разг.)', uk: 'Велосипед (розм.)', es: 'bicicleta', pos: 'nouns' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', es: 'pregunta', pos: 'nouns' },
    { en: 'address', ru: 'Адрес', uk: 'Адреса', es: 'dirección', pos: 'nouns' },
    { en: 'taxi', ru: 'Такси', uk: 'Таксі', es: 'taxi', pos: 'nouns' },
    { en: 'holiday', ru: 'Праздник', uk: 'Свято', es: 'fiesta / día festivo', pos: 'nouns' },
    { en: 'nature', ru: 'Природа', uk: 'Природа', es: 'naturaleza', pos: 'nouns' },
    { en: 'rule', ru: 'Правило', uk: 'Правило', es: 'regla', pos: 'nouns' },
    { en: 'mask', ru: 'Маска', uk: 'Маска', es: 'máscara', pos: 'nouns' },
  ],
  11: [
    { en: 'past simple', ru: 'Прошедшее простое время', uk: 'Минулий простий час', es: 'pasado simple', pos: 'nouns' },
    { en: 'yesterday', ru: 'Вчера', uk: 'Вчора', es: 'ayer', pos: 'adverbs' },
    { en: 'last week', ru: 'На прошлой неделе', uk: 'Минулого тижня', es: 'la semana pasada', pos: 'adverbs' },
    { en: 'last month', ru: 'В прошлом месяце', uk: 'Минулого місяця', es: 'el mes pasado', pos: 'adverbs' },
    { en: 'ago', ru: 'Назад (тому)', uk: 'Тому (назад)', es: 'hace', pos: 'adverbs' },
    { en: 'this morning', ru: 'Сегодня утром', uk: 'Сьогодні вранці', es: 'esta mañana', pos: 'adverbs' },
    { en: 'morning', ru: 'Утро', uk: 'Ранок', es: 'mañana',
    'pt-BR': 'Manhã', pos: 'nouns' },
    { en: 'evening', ru: 'Вечер', uk: 'Вечір', es: 'tarde', pos: 'nouns' },
    { en: 'day', ru: 'День', uk: 'День', es: 'día', pos: 'nouns' },
    { en: 'hour', ru: 'Час (единица времени)', uk: 'Година', es: 'hora', pos: 'nouns' },
    { en: 'minute', ru: 'Минута', uk: 'Хвилина', es: 'minuto', pos: 'nouns' },
    { en: 'week', ru: 'Неделя', uk: 'Тиждень', es: 'semana', pos: 'nouns' },
    { en: 'month', ru: 'Месяц', uk: 'Місяць', es: 'mes', pos: 'nouns' },
    { en: 'last', ru: 'Последний (прошлый)', uk: 'Минулий / останній', es: 'pasado / último', pos: 'adjectives' },
    { en: 'Monday', ru: 'Понедельник', uk: 'Понеділок', es: 'Lunes', pos: 'nouns' },
    { en: 'Tuesday', ru: 'Вторник', uk: 'Вівторок', es: 'Martes', pos: 'nouns' },
    { en: 'Thursday', ru: 'Четверг', uk: 'Четвер', es: 'Jueves', pos: 'nouns' },
    { en: 'Friday', ru: 'Пятница', uk: 'П\'ятниця', es: 'Viernes', pos: 'nouns' },
    { en: 'Saturday', ru: 'Суббота', uk: 'Субота', es: 'Sábado', pos: 'nouns' },
    { en: 'Sunday', ru: 'Воскресенье', uk: 'Неділя', es: 'Domingo', pos: 'nouns' },
    { en: 'two', ru: 'Два', uk: 'Два', es: 'dos', pos: 'nouns' },
    { en: 'three', ru: 'Три', uk: 'Три', es: 'tres', pos: 'nouns' },
    { en: 'five', ru: 'Пять', uk: 'П\'ять', es: 'cinco', pos: 'nouns' },
    { en: 'ten', ru: 'Десять', uk: 'Десять', es: 'diez', pos: 'nouns' },
    { en: 'book', ru: 'Бронировать', uk: 'Бронювати', es: 'reservar', pos: 'verbs' },
    { en: 'visit', ru: 'Навещать / посещать', uk: 'Відвідувати', es: 'visitar', pos: 'verbs' },
    { en: 'paint', ru: 'Красить', uk: 'Фарбувати', es: 'pintar', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'comprobar', pos: 'verbs' },
    { en: 'park', ru: 'Парковаться', uk: 'Паркуватися', es: 'estacionar', pos: 'verbs' },
    { en: 'confirm', ru: 'Подтверждать', uk: 'Підтверджувати', es: 'confirmar', pos: 'verbs' },
    { en: 'upload', ru: 'Загружать (в сеть)', uk: 'Завантажувати (в мережу)', es: 'subir', pos: 'verbs' },
    { en: 'iron', ru: 'Гладить (одежду)', uk: 'Прасувати (одяг)', es: 'planchar', pos: 'verbs' },
    { en: 'deliver', ru: 'Доставлять', uk: 'Доставляти', es: 'entregar', pos: 'verbs' },
    { en: 'rent', ru: 'Арендовать', uk: 'Орендувати', es: 'alquilar', pos: 'verbs' },
    { en: 'wash', ru: 'Мыть / стирать', uk: 'Мити / прати', es: 'lavar', pos: 'verbs' },
    { en: 'post', ru: 'Отправлять (почтой)', uk: 'Надсилати (поштою)', es: 'enviar (por correo)', pos: 'verbs' },
    { en: 'cancel', ru: 'Отменять', uk: 'Скасовувати', es: 'cancelar', pos: 'verbs' },
    { en: 'miss', ru: 'Пропускать / скучать', uk: 'Пропускати / сумувати', es: 'perder / echar de menos', pos: 'verbs' },
    { en: 'lock', ru: 'Запирать (на замок)', uk: 'Замикати', es: 'cerrar con llave', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Закривати', es: 'cerrar', pos: 'verbs' },
    { en: 'move', ru: 'Передвигать / переезжать', uk: 'Пересувати / переїжджати', es: 'mover / mudarse', pos: 'verbs' },
    { en: 'return', ru: 'Возвращать', uk: 'Повертати', es: 'devolver', pos: 'verbs' },
    { en: 'water', ru: 'Поливать', uk: 'Поливати', es: 'regar', pos: 'verbs' },
    { en: 'attend', ru: 'Посещать (мероприятие)', uk: 'Відвідувати (захід)', es: 'asistir', pos: 'verbs' },
    { en: 'prepare', ru: 'Готовить / подготавливать', uk: 'Готувати / підготовлювати', es: 'preparar', pos: 'verbs' },
    { en: 'booked', ru: 'Забронировал(а)', uk: 'Забронював(ла)', es: 'reservó', pos: 'verbs' },
    { en: 'visited', ru: 'Посетил(а)', uk: 'Відвідав(ла)', es: 'visitó', pos: 'verbs' },
    { en: 'painted', ru: 'Покрасил(а)', uk: 'Пофарбував(ла)', es: 'pintó', pos: 'verbs' },
    { en: 'checked', ru: 'Проверил(а)', uk: 'Перевірив(ла)', es: 'comprobó',
    'pt-BR': 'Verificou / conferiu', pos: 'verbs' },
    { en: 'parked', ru: 'Припарковал(а)', uk: 'Припаркував(ла)', es: 'estacionó', pos: 'verbs' },
    { en: 'confirmed', ru: 'Подтвердил(а)', uk: 'Підтвердив(ла)', es: 'confirmó', pos: 'verbs' },
    { en: 'uploaded', ru: 'Загрузил(а) (в сеть)', uk: 'Завантажив(ла) (в мережу)', es: 'subió', pos: 'verbs' },
    { en: 'ironed', ru: 'Погладил(а)', uk: 'Випрасував(ла)', es: 'planchó', pos: 'verbs' },
    { en: 'delivered', ru: 'Доставил(а)', uk: 'Доставив(ла)', es: 'entregó', pos: 'verbs' },
    { en: 'rented', ru: 'Арендовал(а)', uk: 'Орендував(ла)', es: 'alquiló', pos: 'verbs' },
    { en: 'washed', ru: 'Вымыл(а) / постирал(а)', uk: 'Вимив(ла) / випрала', es: 'lavó', pos: 'verbs' },
    { en: 'canceled', ru: 'Отменил(а)', uk: 'Скасував(ла)', es: 'canceló', pos: 'verbs' },
    { en: 'missed', ru: 'Пропустил(а)', uk: 'Пропустив(ла)', es: 'perdió', pos: 'verbs' },
    { en: 'locked', ru: 'Запер(ла) на замок', uk: 'Замкнув(ла)', es: 'cerró con llave', pos: 'verbs' },
    { en: 'closed', ru: 'Закрыл(а)', uk: 'Закрив(ла)', es: 'cerró', pos: 'verbs' },
    { en: 'moved', ru: 'Передвинул(а) / переехал(а)', uk: 'Пересунув(ла) / переїхав(ла)', es: 'movió / se mudó', pos: 'verbs' },
    { en: 'returned', ru: 'Вернул(а) / отдал(а) назад', uk: 'Повернув(ла)', es: 'devolvió', pos: 'verbs' },
    { en: 'watered', ru: 'Полил(а)', uk: 'Полив(ла)', es: 'regó', pos: 'verbs' },
    { en: 'attended', ru: 'Посетил(а) (мероприятие)', uk: 'Відвідав(ла) (захід)', es: 'asistió', pos: 'verbs' },
    { en: 'prepared', ru: 'Приготовил(а) / подготовил(а)', uk: 'Приготував(ла) / підготував(ла)', es: 'preparó', pos: 'verbs' },
    { en: 'cooked', ru: 'Приготовил(а) (еду)', uk: 'Приготував(ла) (їжу)', es: 'cocinó', pos: 'verbs' },
    { en: 'opened', ru: 'Открыл(а)', uk: 'Відкрив(ла)', es: 'abrió', pos: 'verbs' },
    { en: 'ordered', ru: 'Заказал(а)', uk: 'Замовив(ла)', es: 'pidió', pos: 'verbs' },
    { en: 'called', ru: 'Позвонил(а)', uk: 'Подзвонив(ла)', es: 'llamó', pos: 'verbs' },
    { en: 'answered', ru: 'Ответил(а)', uk: 'Відповів(ла)', es: 'respondió', pos: 'verbs' },
    { en: 'changed', ru: 'Поменял(а)', uk: 'Змінив(ла)', es: 'cambió', pos: 'verbs' },
    { en: 'charged', ru: 'Зарядил(а)', uk: 'Зарядив(ла)', es: 'cargó', pos: 'verbs' },
    { en: 'cleaned', ru: 'Почистил(а)', uk: 'Прибрав(ла)', es: 'limpió', pos: 'verbs' },
    { en: 'deleted', ru: 'Удалил(а)', uk: 'Видалив(ла)', es: 'eliminó', pos: 'verbs' },
    { en: 'discussed', ru: 'Обсудил(а)', uk: 'Обговорив(ла)', es: 'habló de', pos: 'verbs' },
    { en: 'finished', ru: 'Закончил(а)', uk: 'Закінчив(ла)', es: 'terminó', pos: 'verbs' },
    { en: 'fixed', ru: 'Починил(а)', uk: 'Відремонтував(ла)', es: 'arregló', pos: 'verbs' },
    { en: 'helped', ru: 'Помог(ла)', uk: 'Допоміг(ла)', es: 'ayudó', pos: 'verbs' },
    { en: 'mailed', ru: 'Отправил(а) почтой', uk: 'Надіслав(ла) поштою', es: 'envió por correo', pos: 'verbs' },
    { en: 'packed', ru: 'Упаковал(а)', uk: 'Упакував(ла)', es: 'empacó', pos: 'verbs' },
    { en: 'printed', ru: 'Распечатал(а)', uk: 'Роздрукував(ла)', es: 'imprimió', pos: 'verbs' },
    { en: 'saved', ru: 'Сохранил(а) / сэкономил(а)', uk: 'Зберіг(ла) / заощадив(ла)', es: 'guardó / ahorró', pos: 'verbs' },
    { en: 'turned', ru: 'Выключил(а) (с off) / повернул(а)', uk: 'Вимкнув(ла) (з off) / повернув(ла)', es: 'apagó / giró', pos: 'verbs' },
    { en: 'watched', ru: 'Посмотрел(а)', uk: 'Дивився / дивилась', es: 'vio', pos: 'verbs' },
    { en: 'brush', ru: 'Чистить щёткой; расчёсывать', uk: 'Чистити щіткою; розчісувати', es: 'cepillar', pos: 'verbs' },
    { en: 'shirt', ru: 'Рубашка', uk: 'Сорочка', es: 'camisa', pos: 'nouns' },
    { en: 'shoe', ru: 'Туфля / ботинок', uk: 'Туфля / черевик', es: 'zapato', pos: 'nouns' },
    { en: 'dish', ru: 'Блюдо', uk: 'Страва', es: 'plato', pos: 'nouns' },
    { en: 'dishes', ru: 'Блюда / посуда', uk: 'Страви / посуд', es: 'platos', pos: 'nouns' },
    { en: 'laptop', ru: 'Ноутбук', uk: 'Ноутбук', es: 'portátil', pos: 'nouns' },
    { en: 'battery', ru: 'Батарейка', uk: 'Батарейка', es: 'pila / batería',
    'pt-BR': 'Pilha', pos: 'nouns' },
    { en: 'batteries', ru: 'Батарейки', uk: 'Батарейки', es: 'pilas', pos: 'nouns' },
    { en: 'plant', ru: 'Растение', uk: 'Рослина', es: 'planta', pos: 'nouns' },
    { en: 'parcel', ru: 'Посылка', uk: 'Посилка', es: 'paquete', pos: 'nouns' },
    { en: 'lecture', ru: 'Лекция', uk: 'Лекція', es: 'conferencia', pos: 'nouns' },
    { en: 'suitcase', ru: 'Чемодан', uk: 'Валіза', es: 'maleta', pos: 'nouns' },
    { en: 'suitcases', ru: 'Чемоданы', uk: 'Валізи', es: 'maletas', pos: 'nouns' },
    { en: 'movie', ru: 'Фильм (разг.)', uk: 'Фільм (розм.)', es: 'película', pos: 'nouns' },
    { en: 'present', ru: 'Подарок', uk: 'Подарунок', es: 'regalo', pos: 'nouns' },
    { en: 'card', ru: 'Открытка / карточка', uk: 'Листівка / картка', es: 'tarjeta', pos: 'nouns' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', es: 'puerta', pos: 'nouns' },
    { en: 'dirty', ru: 'Грязный', uk: 'Брудний', es: 'sucio', pos: 'adjectives' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', es: 'mesa', pos: 'nouns' },
    { en: 'window', ru: 'Окно', uk: 'Вікно', es: 'ventana', pos: 'nouns' },
    { en: 'car', ru: 'Машина', uk: 'Машина', es: 'coche', pos: 'nouns' },
    { en: 'wall', ru: 'Стена', uk: 'Стіна', es: 'pared', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'billete', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'billetes', pos: 'nouns' },
    { en: 'friend', ru: 'Друг', uk: 'Друг', es: 'amigo', pos: 'nouns' },
    { en: 'friends', ru: 'Друзья', uk: 'Друзі', es: 'amigos', pos: 'nouns' },
    { en: 'project', ru: 'Проект', uk: 'Проєкт', es: 'proyecto', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'computer', ru: 'Компьютер', uk: 'Комп\'ютер', es: 'ordenador', pos: 'nouns' },
    { en: 'email', ru: 'Электронное письмо', uk: 'Електронний лист', es: 'correo electrónico', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', es: 'contraseña', pos: 'nouns' },
    { en: 'message', ru: 'Сообщение', uk: 'Повідомлення', es: 'mensaje', pos: 'nouns' },
    { en: 'report', ru: 'Отчёт', uk: 'Звіт', es: 'informe', pos: 'nouns' },
    { en: 'order', ru: 'Заказ', uk: 'Замовлення', es: 'pedido', pos: 'nouns' },
    { en: 'item', ru: 'Товар (позиция)', uk: 'Товар (позиція)', es: 'artículo', pos: 'nouns' },
    { en: 'apartment', ru: 'Квартира', uk: 'Квартира', es: 'apartamento', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', es: 'hotel', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', es: 'reunión', pos: 'nouns' },
    { en: 'doctor', ru: 'Врач', uk: 'Лікар', es: 'médico', pos: 'nouns' },
    { en: 'work', ru: 'Работа', uk: 'Робота', es: 'trabajo', pos: 'nouns' },
    { en: 'shop', ru: 'Магазин', uk: 'Крамниця', es: 'tienda', pos: 'nouns' },
    { en: 'pizza', ru: 'Пицца', uk: 'Піца', es: 'pizza', pos: 'nouns' },
    { en: 'photos', ru: 'Фотографии', uk: 'Фотографії', es: 'fotos', pos: 'nouns' },
    { en: 'hair', ru: 'Волосы', uk: 'Волосся', es: 'pelo', pos: 'nouns' },
    { en: 'shelf', ru: 'Полка', uk: 'Полиця', es: 'estante', pos: 'nouns' },
    { en: 'shelves', ru: 'Полки', uk: 'Полиці', es: 'estantes', pos: 'nouns' },
    { en: 'plants', ru: 'Растения', uk: 'Рослини', es: 'plantas', pos: 'nouns' },
    { en: 'sister', ru: 'Сестра', uk: 'Сестра', es: 'hermana',
    'pt-BR': 'Irmã', pos: 'nouns' },
    { en: 'man', ru: 'Мужчина', uk: 'Чоловік', es: 'hombre', pos: 'nouns' },
    { en: 'woman', ru: 'Женщина', uk: 'Жінка', es: 'mujer', pos: 'nouns' },
    { en: 'printer', ru: 'Принтер', uk: 'Принтер', es: 'impresora', pos: 'nouns' },
    { en: 'good', ru: 'Хороший', uk: 'Гарний', es: 'bueno', pos: 'adjectives' },
    { en: 'new', ru: 'Новый', uk: 'Новий', es: 'nuevo', pos: 'adjectives' },
    { en: 'old', ru: 'Старый', uk: 'Старий', es: 'viejo', pos: 'adjectives' },
    { en: 'long', ru: 'Длинный', uk: 'Довгий', es: 'largo', pos: 'adjectives' },
    { en: 'white', ru: 'Белый', uk: 'Білий', es: 'blanco', pos: 'adjectives' },
    { en: 'difficult', ru: 'Сложный', uk: 'Складний', es: 'difícil', pos: 'adjectives' },
    { en: 'call', ru: 'Звонок', uk: 'Дзвінок', es: 'llamada', pos: 'nouns' },
    { en: 'days', ru: 'Дни', uk: 'Дні', es: 'días', pos: 'nouns' },
    { en: 'shoes', ru: 'Туфли / ботинки', uk: 'Туфлі / черевики', es: 'zapatos', pos: 'nouns' },
  ],
  12: [
    // Past Simple — неправильные формы (инфинитив → прошедшее)
    // Словарь урока
    { en: 'apple', ru: 'Яблоко', uk: 'Яблуко', es: 'manzana', pos: 'nouns' },
    { en: 'boat', ru: 'Лодка', uk: 'Човен', es: 'barco', pos: 'nouns' },
    { en: 'box', ru: 'Ящик / коробка', uk: 'Ящик / коробка', es: 'caja', pos: 'nouns' },
    { en: 'boxes', ru: 'Ящики / коробки', uk: 'Ящики / коробки', es: 'cajas', pos: 'nouns' },
    { en: 'bridge', ru: 'Мост', uk: 'Міст', es: 'puente', pos: 'nouns' },
    { en: 'fence', ru: 'Забор', uk: 'Паркан', es: 'valla', pos: 'nouns' },
    { en: 'glove', ru: 'Перчатка', uk: 'Рукавичка', es: 'guante', pos: 'nouns' },
    { en: 'headphones', ru: 'Наушники', uk: 'Навушники', es: 'auriculares', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', es: 'chaqueta', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', es: 'llave', pos: 'nouns' },
    { en: 'letter', ru: 'Письмо', uk: 'Лист', es: 'carta', pos: 'nouns' },
    { en: 'neighbor', ru: 'Сосед', uk: 'Сусід', es: 'vecino', pos: 'nouns' },
    { en: 'picture', ru: 'Картина / фото', uk: 'Картина / фото', es: 'cuadro', pos: 'nouns' },
    { en: 'sofa', ru: 'Диван', uk: 'Диван', es: 'sofá', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелёк', uk: 'Гаманець', es: 'cartera', pos: 'nouns' },
    { en: 'article', ru: 'Статья', uk: 'Стаття', es: 'artículo', pos: 'nouns' },
    { en: 'story', ru: 'История / рассказ', uk: 'Історія / розповідь', es: 'historia', pos: 'nouns' },
    { en: 'stories', ru: 'Истории / рассказы', uk: 'Історії / розповіді', es: 'historias', pos: 'nouns' },
    { en: 'song', ru: 'Песня', uk: 'Пісня', es: 'canción', pos: 'nouns' },
    { en: 'fruit', ru: 'Фрукт / фрукты', uk: 'Фрукт / фрукти', es: 'fruta', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'blue', ru: 'Синий / голубой', uk: 'Синій / блакитний', es: 'azul', pos: 'adjectives' },
    { en: 'comfortable', ru: 'Удобный', uk: 'Зручний', es: 'cómodo', pos: 'adjectives' },
    { en: 'fresh', ru: 'Свежий', uk: 'Свіжий', es: 'fresco', pos: 'adjectives' },
    { en: 'funny', ru: 'Смешной / забавный', uk: 'Смішний / кумедний', es: 'divertido', pos: 'adjectives' },
    { en: 'heavy', ru: 'Тяжёлый', uk: 'Важкий', es: 'pesado', pos: 'adjectives' },
    { en: 'hot', ru: 'Горячий', uk: 'Гарячий', es: 'caliente', pos: 'adjectives' },
    { en: 'interesting', ru: 'Интересный', uk: 'Цікавий', es: 'interesante', pos: 'adjectives' },
    { en: 'rare', ru: 'Редкий', uk: 'Рідкісний', es: 'raro', pos: 'adjectives' },
    { en: 'red', ru: 'Красный', uk: 'Червоний', es: 'rojo', pos: 'adjectives' },
    { en: 'short', ru: 'Короткий', uk: 'Короткий', es: 'corto',
    'pt-BR': 'curto', pos: 'adjectives' },
    { en: 'soft', ru: 'Мягкий', uk: "М\'який", es: 'suave', pos: 'adjectives' },
    { en: 'strange', ru: 'Странный', uk: 'Дивний', es: 'extraño', pos: 'adjectives' },
    { en: 'sweet', ru: 'Сладкий', uk: 'Солодкий', es: 'dulce', pos: 'adjectives' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисний', es: 'útil', pos: 'adjectives' },
    { en: 'wooden', ru: 'Деревянный', uk: "Дерев\'яний", es: 'de madera', pos: 'adjectives' },
    { en: 'warm', ru: 'Тёплый', uk: 'Теплий', es: 'cálido', pos: 'adjectives' },
    { en: 'long', ru: 'Длинный', uk: 'Довгий', es: 'largo', pos: 'adjectives' },
    { en: 'tired', ru: 'Усталый', uk: 'Втомлений', es: 'cansado', pos: 'adjectives' },
    { en: 'noisy', ru: 'Шумный', uk: 'Шумний', es: 'ruidoso', pos: 'adjectives' },
    // Лексика из фраз урока 12 (не в официальном VOCABULARY)
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'bird', ru: 'Птица', uk: 'Птах', es: 'pájaro', pos: 'nouns' },
    { en: 'bread', ru: 'Хлеб', uk: 'Хліб', es: 'pan', pos: 'nouns' },
    { en: 'juice', ru: 'Сок', uk: 'Сік', es: 'zumo', pos: 'nouns' },
    { en: 'text', ru: 'Текст', uk: 'Текст', es: 'mensaje', pos: 'nouns' },
    { en: 'topic', ru: 'Тема', uk: 'Тема', es: 'tema', pos: 'nouns' },
    { en: 'wednesday', ru: 'Среда', uk: 'Середа', es: 'miércoles', pos: 'nouns' },
    { en: 'words', ru: 'Слова', uk: 'Слова', es: 'palabras', pos: 'nouns' },
    { en: 'tasty', ru: 'Вкусный', uk: 'Смачний', es: 'sabroso', pos: 'adjectives' },
    { en: 'drank', ru: 'Пил(а)', uk: 'Пив / пила', es: 'bebió', pos: 'verbs' },
    { en: 'came', ru: 'Пришёл / пришла', uk: 'Прийшов / прийшла', es: 'vino', pos: 'verbs' },
    { en: 'ate', ru: 'Ел(а)', uk: 'Їв / їла', es: 'comió', pos: 'verbs' },
    { en: 'took', ru: 'Взял(а)', uk: 'Взяв / взяла', es: 'tomó', pos: 'verbs' },
    { en: 'heard', ru: 'Услышал(а)', uk: 'Почув / почула', es: 'oyó', pos: 'verbs' },
    { en: 'felt', ru: 'Чувствовал(а)', uk: 'Відчував / відчувала', es: 'sintió', pos: 'verbs' },
    { en: 'spoke', ru: 'Говорил(а)', uk: 'Говорив / говорила', es: 'habló', pos: 'verbs' },
    { en: 'knew', ru: 'Знал(а)', uk: 'Знав / знала', es: 'sabía', pos: 'verbs' },
    { en: 'wore', ru: 'Носил(а)', uk: 'Носив / носила', es: 'llevaba', pos: 'verbs' },
    { en: 'drove', ru: 'Вёл / вела машину', uk: 'Керував / керувала авто', es: 'condujo', pos: 'verbs' },
    { en: 'had', ru: 'Имел(а) / был(а)', uk: 'Мав / мала; був / була', es: 'tenía', pos: 'verbs' },
  ],
  13: [
    { en: 'will', ru: 'Буду / будешь / будет… (will)', uk: 'Буду / будеш / буде… (will)', es: 'will (futuro)', pos: 'adverbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', es: 'llamar', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', es: 'enviar', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', es: 'cocinar', pos: 'verbs' },
    { en: 'sing', ru: 'Петь', uk: 'Співати', es: 'cantar', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Зачиняти', es: 'cerrar', pos: 'verbs' },
    { en: 'tomorrow', ru: 'Завтра', uk: 'Завтра', es: 'mañana', pos: 'adverbs' },
    { en: 'soon', ru: 'Скоро', uk: 'Скоро', es: 'pronto', pos: 'adverbs' },
    { en: 'later', ru: 'Позже', uk: 'Пізніше', es: 'después / más tarde', pos: 'adverbs' },
    { en: 'tonight', ru: 'Сегодня вечером / ночью', uk: 'Сьогодні ввечері / вночі', es: 'esta noche', pos: 'adverbs' },
    { en: 'next week', ru: 'На следующей неделе', uk: 'Наступного тижня', es: 'la semana que viene', pos: 'adverbs' },
    { en: 'next month', ru: 'В следующем месяце', uk: 'Наступного місяця', es: 'el mes que viene',
    'pt-BR': 'o mês que vem', pos: 'adverbs' },
    { en: 'in two days', ru: 'Через два дня', uk: 'Через два дні', es: 'en dos días', pos: 'adverbs' },
    { en: 'in ten minutes', ru: 'Через десять минут', uk: 'Через десять хвилин', es: 'en diez minutos', pos: 'adverbs' },
    { en: 'food', ru: 'Еда', uk: 'їжа', es: 'comida', pos: 'nouns' },
    { en: 'soup', ru: 'Суп', uk: 'Суп', es: 'sopa', pos: 'nouns' },
    { en: 'glasses', ru: 'Очки', uk: 'Окуляри', es: 'gafas / lentes', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', es: 'efectivo', pos: 'nouns' },
    { en: 'plan', ru: 'План', uk: 'План', es: 'plan', pos: 'nouns' },
    { en: 'rent', ru: 'Аренда', uk: 'Оренда', es: 'alquiler', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядное устройство', uk: 'Зарядний пристрій', es: 'cargador', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'better', ru: 'Лучше', uk: 'Краще', es: 'mejor', pos: 'adjectives' },
    { en: 'early', ru: 'Рано', uk: 'Рано', es: 'temprano', pos: 'adverbs' },
  ],
  14: [
    { en: 'cheaper', ru: 'Дешевле · более дешёвый', uk: 'Дешевший', es: 'más barato', pos: 'adjectives' },
    { en: 'more expensive', ru: 'Дороже · более дорогой', uk: 'Дорожчий', es: 'más caro', pos: 'adjectives' },
    { en: 'better', ru: 'Лучше (сравн. от good)', uk: 'Краще (від good)', es: 'mejor', pos: 'adjectives' },
    { en: 'worse', ru: 'Хуже (сравн. от bad)', uk: 'Гірше (від bad)', es: 'peor', pos: 'adjectives' },
    { en: 'happier', ru: 'Счастливее', uk: 'Щасливіший', es: 'más feliz', pos: 'adjectives' },
    { en: 'more serious', ru: 'Серьёзнее', uk: 'Серйозніший', es: 'más serio', pos: 'adjectives' },
    { en: 'faster', ru: 'Быстрее', uk: 'Швидший', es: 'más rápido', pos: 'adjectives' },
    { en: 'slower', ru: 'Медленнее', uk: 'Повільніший', es: 'más lento', pos: 'adjectives' },
    { en: 'easier', ru: 'Проще · легче', uk: 'Простіший · легший', es: 'más fácil', pos: 'adjectives' },
    { en: 'harder', ru: 'Сложнее · труднее', uk: 'Складніший', es: 'más difícil', pos: 'adjectives' },
    { en: 'more interesting', ru: 'Интереснее', uk: 'Цікавіший', es: 'más interesante', pos: 'adjectives' },
    { en: 'more important', ru: 'Важнее', uk: 'Важливіший', es: 'más importante', pos: 'adjectives' },
    { en: 'safer', ru: 'Безопаснее', uk: 'Безпечніший', es: 'más seguro', pos: 'adjectives' },
    { en: 'more dangerous', ru: 'Опаснее', uk: 'Небезпечніший', es: 'más peligroso', pos: 'adjectives' },
    { en: 'colder', ru: 'Холоднее', uk: 'Холодніший', es: 'más frío', pos: 'adjectives' },
    { en: 'warmer', ru: 'Теплее', uk: 'Тепліший', es: 'más cálido', pos: 'adjectives' },
    { en: 'lighter', ru: 'Легче (по весу)', uk: 'Легший (за вагою)', es: 'más ligero', pos: 'adjectives' },
    { en: 'heavier', ru: 'Тяжелее', uk: 'Важчий', es: 'más pesado', pos: 'adjectives' },
    { en: 'newer', ru: 'Новее', uk: 'Новіший', es: 'más nuevo', pos: 'adjectives' },
    { en: 'older', ru: 'Старее', uk: 'Старший', es: 'más viejo', pos: 'adjectives' },
    { en: 'shorter', ru: 'Короче', uk: 'Коротший', es: 'más corto', pos: 'adjectives' },
    { en: 'longer', ru: 'Длиннее', uk: 'Довший', es: 'más largo', pos: 'adjectives' },
    { en: 'clearer', ru: 'Понятнее · яснее', uk: 'Зрозуміліший', es: 'más claro', pos: 'adjectives' },
    { en: 'more confusing', ru: 'Более запутанный', uk: 'Більш заплутаний', es: 'más confuso', pos: 'adjectives' },
    { en: 'the best', ru: 'Лучший · самый лучший', uk: 'Найкращий', es: 'el mejor / la mejor', pos: 'adjectives' },
    { en: 'the worst', ru: 'Худший · самый плохой', uk: 'Найгірший', es: 'el peor / la peor', pos: 'adjectives' },
    { en: 'the cheapest', ru: 'Самый дешёвый', uk: 'Найдешевший', es: 'el más barato', pos: 'adjectives' },
    { en: 'the most expensive', ru: 'Самый дорогой', uk: 'Найдорожчий', es: 'el más caro', pos: 'adjectives' },
    { en: 'the fastest', ru: 'Самый быстрый', uk: 'Найшвидший', es: 'el más rápido', pos: 'adjectives' },
    { en: 'the slowest', ru: 'Самый медленный', uk: 'Найповільніший', es: 'el más lento',
    'pt-BR': 'O mais lento', pos: 'adjectives' },
    { en: 'the easiest', ru: 'Самый простой', uk: 'Найпростіший', es: 'el más fácil', pos: 'adjectives' },
    { en: 'the hardest', ru: 'Самый сложный', uk: 'Найскладніший', es: 'el más difícil', pos: 'adjectives' },
    { en: 'the safest', ru: 'Самый безопасный', uk: 'Найбезпечніший', es: 'el más seguro', pos: 'adjectives' },
    { en: 'the most dangerous', ru: 'Самый опасный', uk: 'Найнебезпечніший', es: 'el más peligroso', pos: 'adjectives' },
    { en: 'much', ru: 'Намного (усилитель)', uk: 'Набагато (підсилювач)', es: 'mucho / mucho más', pos: 'adverbs' },
    { en: 'more', ru: 'Более (сравнение)', uk: 'Більш (порівняння)', es: 'más (comparativo)', pos: 'adverbs' },
    { en: 'option', ru: 'Вариант', uk: 'Варіант', es: 'opción', pos: 'nouns' },
    { en: 'way', ru: 'Способ · путь', uk: 'Спосіб · шлях', es: 'forma / camino', pos: 'nouns' },
    { en: 'job', ru: 'Работа', uk: 'Робота', es: 'trabajo', pos: 'nouns' },
    { en: 'place', ru: 'Место', uk: 'Місце', es: 'lugar', pos: 'nouns' },
    { en: 'room', ru: 'Комната', uk: 'Кімната', es: 'habitación', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'app', ru: 'Приложение', uk: 'Застосунок', es: 'aplicación / app', pos: 'nouns' },
    { en: 'lesson', ru: 'Урок', uk: 'Урок', es: 'lección', pos: 'nouns' },
    { en: 'answer', ru: 'Ответ', uk: 'Відповідь', es: 'respuesta', pos: 'nouns' },
    { en: 'looks', ru: 'Выглядит', uk: 'Виглядає', es: 'parece', pos: 'verbs' },
    { en: 'feels', ru: 'Чувствует себя', uk: 'Почувається', es: 'se siente', pos: 'verbs' },
    { en: 'works', ru: 'Работает', uk: 'Працює', es: 'trabaja', pos: 'verbs' },
  ],
  15: [
    { en: 'my', ru: 'мой; моя; моё (перед сущ.)', uk: 'мій; моя; моє (перед ім.)', es: 'mi / mis', pos: 'pronouns' },
    { en: 'mine', ru: 'мой; моя; моё (самост.)', uk: 'мій; моя; моє (самост.)', es: 'mío / mía / míos / mías', pos: 'pronouns' },
    { en: 'your', ru: 'твой; ваш (перед сущ.)', uk: 'твій; ваш (перед ім.)', es: 'tu / tus; su / sus (usted)', pos: 'pronouns' },
    { en: 'yours', ru: 'твоё; ваше (самост.)', uk: 'твоє; ваше (самост.)', es: 'tuyo / tuya / tuyos / tuyas', pos: 'pronouns' },
    { en: 'his', ru: 'его (перед сущ. и самост.)', uk: 'його (перед ім. і самост.)', es: 'su; suyo / suya (él)', pos: 'pronouns' },
    { en: 'her', ru: 'её (перед сущ.)', uk: 'її (перед ім.)', es: 'su (ella)', pos: 'pronouns' },
    { en: 'hers', ru: 'её (самост.)', uk: 'її (самост.)', es: 'suyo / suya (ella)', pos: 'pronouns' },
    { en: 'our', ru: 'наш; наша; наше (перед сущ.)', uk: 'наш; наша; наше (перед ім.)', es: 'nuestro / nuestra / nuestros / nuestras', pos: 'pronouns' },
    { en: 'ours', ru: 'наше; наши (самост.)', uk: 'наше; наші (самост.)', es: 'el nuestro / la nuestra', pos: 'pronouns' },
    { en: 'their', ru: 'их (перед сущ.)', uk: 'їхній; їхня (перед ім.)', es: 'su (ellos / ellas)', pos: 'pronouns' },
    { en: 'theirs', ru: 'их (самост.)', uk: 'їхній; їхнє (самост.)', es: 'suyo / suya (ellos)', pos: 'pronouns' },
    { en: 'this', ru: 'этот; эта; это', uk: 'цей; ця; це', es: 'este / esta / esto', pos: 'pronouns' },
    { en: 'these', ru: 'эти', uk: 'ці', es: 'estos / estas', pos: 'pronouns' },
    { en: 'not', ru: 'не (с is / are)', uk: 'не (з is / are)', es: 'no', pos: 'adverbs' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'teléfono', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', es: 'llave', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'billete / entrada', pos: 'nouns' },
    { en: 'room', ru: 'Комната', uk: 'Кімната', es: 'habitación', pos: 'nouns' },
    { en: 'car', ru: 'Машина · автомобиль', uk: 'Машина · автомобіль', es: 'coche / carro / auto', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядное устройство', uk: 'Зарядний пристрій', es: 'cargador', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', es: 'pasaporte', pos: 'nouns' },
    { en: 'documents', ru: 'Документы', uk: 'Документи', es: 'documentos', pos: 'nouns' },
    { en: 'messages', ru: 'Сообщения', uk: 'Повідомлення', es: 'mensajes', pos: 'nouns' },
    { en: 'books', ru: 'Книги', uk: 'Книги', es: 'libros',
    'pt-BR': 'Livros', pos: 'nouns' },
    { en: 'keys', ru: 'Ключи', uk: 'Ключі', es: 'llaves', pos: 'nouns' },
    { en: 'bags', ru: 'Сумки', uk: 'Сумки', es: 'bolsas', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'billetes / entradas', pos: 'nouns' },
    { en: 'answer', ru: 'Ответ', uk: 'Відповідь', es: 'respuesta', pos: 'nouns' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', es: 'pregunta', pos: 'nouns' },
    { en: 'outside', ru: 'Снаружи · на улице', uk: 'Надворі · зовні', es: 'afuera', pos: 'adverbs' },
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', es: 'listo', pos: 'adjectives' },
    { en: 'here', ru: 'Здесь', uk: 'Тут', es: 'aquí', pos: 'adverbs' },
  ],
  16: [
    { en: 'wake up', ru: 'Просыпаться', uk: 'Прокидатися', es: 'despertarse', pos: 'verbs' },
    { en: 'get up', ru: 'Вставать', uk: 'Вставати', es: 'levantarse', pos: 'verbs' },
    { en: 'put on', ru: 'Надевать', uk: 'Надягати', es: 'ponerse', pos: 'verbs' },
    { en: 'take off', ru: 'Снимать (одежду)', uk: 'Знімати (одяг)', es: 'quitarse', pos: 'verbs' },
    { en: 'turn on', ru: 'Включать', uk: 'Вмикати', es: 'encender / poner', pos: 'verbs' },
    { en: 'turn off', ru: 'Выключать', uk: 'Вимикати', es: 'apagar', pos: 'verbs' },
    { en: 'look for', ru: 'Искать', uk: 'Шукати', es: 'buscar', pos: 'verbs' },
    { en: 'clean up', ru: 'Убирать · наводить порядок', uk: 'Прибирати · наводити лад', es: 'limpiar / ordenar', pos: 'verbs' },
    { en: 'throw away', ru: 'Выбрасывать', uk: 'Викидати', es: 'tirar / botar', pos: 'verbs' },
    { en: 'give back', ru: 'Возвращать (отдавать обратно)', uk: 'Повертати (віддавати назад)', es: 'devolver', pos: 'verbs' },
    { en: 'find out', ru: 'Выяснять · узнавать', uk: "З\'ясовувати · дізнаватися", es: 'averiguar / enterarse', pos: 'verbs' },
    { en: 'go back', ru: 'Возвращаться назад', uk: 'Повертатися назад', es: 'volver / regresar', pos: 'verbs' },
    { en: 'lights', ru: 'Свет · лампы', uk: 'Світло · лампи', es: 'luces', pos: 'nouns' },
    { en: 'shoes', ru: 'Туфли / ботинки', uk: 'Туфлі / черевики', es: 'zapatos', pos: 'nouns' },
    { en: 'papers', ru: 'Бумаги', uk: 'Папери', es: 'papeles', pos: 'nouns' },
    { en: 'facts', ru: 'Факты', uk: 'Факти', es: 'hechos', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', es: 'chaqueta', pos: 'nouns' },
    { en: 'problems', ru: 'Проблемы', uk: 'Проблеми', es: 'problemas', pos: 'nouns' },
    { en: 'noon', ru: 'Полдень', uk: 'Полудень', es: 'mediodía', pos: 'nouns' },
    { en: 'early', ru: 'Рано', uk: 'Рано', es: 'temprano', pos: 'adverbs' },
    { en: 'late', ru: 'Поздно', uk: 'Пізно', es: 'tarde', pos: 'adverbs' },
    { en: 'now', ru: 'Сейчас', uk: 'Зараз', es: 'ahora', pos: 'adverbs' },
    { en: 'yesterday', ru: 'Вчера', uk: 'Вчора', es: 'ayer', pos: 'adverbs' },
    { en: 'this morning', ru: 'Сегодня утром', uk: 'Сьогодні вранці', es: 'esta mañana', pos: 'adverbs' },
    { en: 'last week', ru: 'На прошлой неделе', uk: 'Минулого тижня', es: 'la semana pasada', pos: 'adverbs' },
    { en: 'at night', ru: 'Ночью', uk: 'Вночі', es: 'por la noche', pos: 'adverbs' },
    { en: 'at noon', ru: 'В полдень', uk: 'Опівдні', es: 'al mediodía', pos: 'adverbs' },
    { en: 'should', ru: 'Следует · стоит (совет)', uk: 'Слід · варто (порада)', es: 'debería / deberíamos', pos: 'verbs' },
  ],
  17: [
    { en: 'work', ru: 'Работать', uk: 'Працювати', es: 'trabajar', pos: 'verbs' },
    { en: 'read', ru: 'Читать', uk: 'Читати', es: 'leer', pos: 'verbs' },
    { en: 'cook', ru: 'Готовить', uk: 'Готувати', es: 'cocinar', pos: 'verbs' },
    { en: 'write', ru: 'Писать', uk: 'Писати', es: 'escribir', pos: 'verbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', es: 'esperar', pos: 'verbs' },
    { en: 'watch', ru: 'Смотреть', uk: 'Дивитися', es: 'mirar',
    'pt-BR': 'Assistir / olhar', pos: 'verbs' },
    { en: 'listen', ru: 'Слушать', uk: 'Слухати', es: 'escuchar', pos: 'verbs' },
    { en: 'drink', ru: 'Пить', uk: 'Пити', es: 'beber', pos: 'verbs' },
    { en: 'speak', ru: 'Говорить', uk: 'Говорити', es: 'hablar', pos: 'verbs' },
    { en: 'drive', ru: 'Вести машину', uk: 'Їхати за кермом', es: 'conducir', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'revisar', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', es: 'enviar', pos: 'verbs' },
    { en: 'clean', ru: 'Убирать / чистить', uk: 'Прибирати / чистити', es: 'limpiar', pos: 'verbs' },
    { en: 'fix', ru: 'Чинить / исправлять', uk: 'Лагодити / виправляти', es: 'arreglar', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', es: 'pedir', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', es: 'comprar', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', es: 'llamar', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'sleep', ru: 'Спать', uk: 'Спати', es: 'dormir', pos: 'verbs' },
    { en: 'do', ru: 'Делать', uk: 'Робити', es: 'hacer', pos: 'verbs' },
    { en: 'go', ru: 'Идти / ехать', uk: 'Іти / їхати', es: 'ir', pos: 'verbs' },
    { en: 'cry', ru: 'Плакать', uk: 'Плакати', es: 'llorar', pos: 'verbs' },
    { en: 'turn off', ru: 'Выключать', uk: 'Вимикати', es: 'apagar', pos: 'verbs' },
    { en: 'put on', ru: 'Надевать', uk: 'Надягати', es: 'ponerse', pos: 'verbs' },
    { en: 'clean up', ru: 'Убирать / наводить порядок', uk: 'Прибирати / наводити лад', es: 'limpiar', pos: 'verbs' },
    { en: 'go back', ru: 'Возвращаться назад', uk: 'Повертатися назад', es: 'volver', pos: 'verbs' },
    { en: 'now', ru: 'Сейчас', uk: 'Зараз', es: 'ahora', pos: 'adverbs' },
    { en: 'right now', ru: 'Прямо сейчас', uk: 'Прямо зараз', es: 'ahora mismo', pos: 'adverbs' },
    { en: 'at the moment', ru: 'В данный момент', uk: 'На даний момент', es: 'en este momento', pos: 'adverbs' },
    { en: 'today', ru: 'Сегодня', uk: 'Сьогодні', es: 'hoy', pos: 'adverbs' },
    { en: 'too fast', ru: 'Слишком быстро', uk: 'Занадто швидко', es: 'demasiado rápido', pos: 'adverbs' },
    { en: 'well', ru: 'Хорошо', uk: 'Добре', es: 'bien', pos: 'adverbs' },
    { en: 'outside', ru: 'Снаружи', uk: 'Надворі', es: 'fuera', pos: 'adverbs' },
    { en: 'music', ru: 'Музыка', uk: 'Музика', es: 'música', pos: 'nouns' },
    { en: 'TV', ru: 'Телевизор', uk: 'Телевізор', es: 'televisión', pos: 'nouns' },
    { en: 'English', ru: 'Английский язык', uk: 'Англійська мова', es: 'inglés', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', es: 'problema', pos: 'nouns' },
    { en: 'jacket', ru: 'Куртка', uk: 'Куртка', es: 'chaqueta', pos: 'nouns' },
    { en: 'turning', ru: 'Поворачивая / выключая', uk: 'Повертаючи / вимикаючи', es: 'girando / apagando', pos: 'verbs' },
  ],
  18: [
    { en: 'please', ru: 'Пожалуйста', uk: 'Будь ласка', es: 'por favor', pos: 'adverbs' },
    { en: 'wait', ru: 'Ждать', uk: 'Чекати', es: 'esperar', pos: 'verbs' },
    { en: 'help', ru: 'Помогать', uk: 'Допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'call', ru: 'Звонить', uk: 'Телефонувати', es: 'llamar', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'revisar', pos: 'verbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', es: 'enviar', pos: 'verbs' },
    { en: 'open', ru: 'Открывать', uk: 'Відкривати', es: 'abrir', pos: 'verbs' },
    { en: 'close', ru: 'Закрывать', uk: 'Закривати', es: 'cerrar', pos: 'verbs' },
    { en: 'clean', ru: 'Убирать / чистить', uk: 'Прибирати / чистити', es: 'limpiar',
    'pt-BR': 'Arrumar / limpar', pos: 'verbs' },
    { en: 'start', ru: 'Начинать', uk: 'Починати', es: 'empezar', pos: 'verbs' },
    { en: 'listen', ru: 'Слушать', uk: 'Слухати', es: 'escuchar', pos: 'verbs' },
    { en: 'look', ru: 'Смотреть', uk: 'Дивитися', es: 'mirar', pos: 'verbs' },
    { en: 'share', ru: 'Делиться', uk: 'Ділитися', es: 'compartir', pos: 'verbs' },
    { en: 'use', ru: 'Использовать', uk: 'Використовувати', es: 'usar', pos: 'verbs' },
    { en: 'waste', ru: 'Тратить зря', uk: 'Витрачати даремно', es: 'desperdiciar', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', es: 'terminar', pos: 'verbs' },
    { en: 'talk', ru: 'Говорить / поговорить', uk: 'Говорити / поговорити', es: 'hablar', pos: 'verbs' },
    { en: 'work', ru: 'Работать', uk: 'Працювати', es: 'trabajar', pos: 'verbs' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', es: 'juntos', pos: 'adverbs' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', es: 'puerta', pos: 'nouns' },
    { en: 'lights', ru: 'Свет / лампы', uk: 'Світло / лампи', es: 'luces', pos: 'nouns' },
    { en: 'passwords', ru: 'Пароли', uk: 'Паролі', es: 'contraseñas', pos: 'nouns' },
    { en: 'charger', ru: 'Зарядное устройство', uk: 'Зарядний пристрій', es: 'cargador', pos: 'nouns' },
    { en: 'option', ru: 'Вариант', uk: 'Варіант', es: 'opción', pos: 'nouns' },
    { en: 'time', ru: 'Время', uk: 'Час', es: 'tiempo', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', es: 'efectivo', pos: 'nouns' },
  ],
  19: [
    /* Урок 19: предлоги места + существительные из фраз + неправильные глаголы */
    { en: 'in', ru: 'В / внутри (место)', uk: 'В / всередині (місце)', es: 'en / dentro de', pos: 'adverbs' },
    { en: 'on', ru: 'На (поверхность)', uk: 'На (поверхня)', es: 'en / sobre', pos: 'adverbs' },
    { en: 'under', ru: 'Под', uk: 'Під', es: 'bajo / debajo de', pos: 'adverbs' },
    { en: 'near', ru: 'Рядом / около', uk: 'Поруч / біля', es: 'cerca de', pos: 'adverbs' },
    { en: 'next to', ru: 'Рядом с', uk: 'Поруч з', es: 'al lado de', pos: 'adverbs' },
    { en: 'behind', ru: 'За / позади', uk: 'За / позаду', es: 'detrás de', pos: 'adverbs' },
    { en: 'in front of', ru: 'Перед', uk: 'Перед', es: 'delante de', pos: 'adverbs' },
    { en: 'between', ru: 'Между', uk: 'Між', es: 'entre', pos: 'adverbs' },
    { en: 'inside', ru: 'Внутри', uk: 'Всередині', es: 'dentro (de)', pos: 'adverbs' },
    { en: 'outside', ru: 'Снаружи', uk: 'Зовні', es: 'fuera (de)', pos: 'adverbs' },
    { en: 'above', ru: 'Над / выше', uk: 'Над / вище', es: 'encima de', pos: 'adverbs' },
    { en: 'opposite', ru: 'Напротив', uk: 'Навпроти', es: 'enfrente de', pos: 'adverbs' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', es: 'mesa', pos: 'nouns' },
    { en: 'desk', ru: 'Рабочий стол', uk: 'Робочий стіл', es: 'escritorio', pos: 'nouns' },
    { en: 'chair', ru: 'Стул', uk: 'Стілець', es: 'silla', pos: 'nouns' },
    { en: 'bed', ru: 'Кровать', uk: 'Ліжко', es: 'cama', pos: 'nouns' },
    { en: 'door', ru: 'Дверь', uk: 'Двері', es: 'puerta', pos: 'nouns' },
    { en: 'house', ru: 'Дом', uk: 'Будинок', es: 'casa', pos: 'nouns' },
    { en: 'shop', ru: 'Магазин', uk: 'Магазин', es: 'tienda', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', es: 'hotel', pos: 'nouns' },
    { en: 'bank', ru: 'Банк', uk: 'Банк', es: 'banco', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелёк', uk: 'Гаманець', es: 'cartera', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', es: 'pasaporte', pos: 'nouns' },
    { en: 'light', ru: 'Свет / лампа', uk: 'Світло / лампа', es: 'luz / lámpara', pos: 'nouns' },
    { en: 'stand', ru: 'Стоять', uk: 'Стояти', es: 'estar de pie', pos: 'verbs' },
  ],
  20: [
    /* Урок 20: артикли a / an / the / нулевой артикль */
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'teléfono',
    'pt-BR': 'telefone', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'key', ru: 'Ключ', uk: 'Ключ', es: 'llave', pos: 'nouns' },
    { en: 'ticket', ru: 'Билет', uk: 'Квиток', es: 'boleto', pos: 'nouns' },
    { en: 'wallet', ru: 'Кошелёк', uk: 'Гаманець', es: 'billetera', pos: 'nouns' },
    { en: 'phone charger', ru: 'Зарядка для телефона', uk: 'Зарядка для телефону', es: 'cargador de teléfono', pos: 'nouns' },
    { en: 'passport', ru: 'Паспорт', uk: 'Паспорт', es: 'pasaporte', pos: 'nouns' },
    { en: 'email', ru: 'Письмо / имейл', uk: 'Лист / імейл', es: 'correo', pos: 'nouns' },
    { en: 'idea', ru: 'Идея', uk: 'Ідея', es: 'idea', pos: 'nouns' },
    { en: 'app', ru: 'Приложение', uk: 'Застосунок', es: 'aplicación', pos: 'nouns' },
    { en: 'umbrella', ru: 'Зонт', uk: 'Парасолька', es: 'paraguas', pos: 'nouns' },
    { en: 'cup', ru: 'Чашка', uk: 'Чашка', es: 'taza', pos: 'nouns' },
    { en: 'man', ru: 'Мужчина', uk: 'Чоловік', es: 'hombre', pos: 'nouns' },
    { en: 'option', ru: 'Вариант', uk: 'Варіант', es: 'opción', pos: 'nouns' },
    { en: 'inbox', ru: 'Папка входящих', uk: 'Папка вхідних', es: 'bandeja de entrada', pos: 'nouns' },
    { en: 'coffee', ru: 'Кофе', uk: 'Кава', es: 'café', pos: 'nouns' },
    { en: 'water', ru: 'Вода', uk: 'Вода', es: 'agua', pos: 'nouns' },
    { en: 'money', ru: 'Деньги', uk: 'Гроші', es: 'dinero', pos: 'nouns' },
    { en: 'food', ru: 'Еда', uk: 'Їжа', es: 'comida', pos: 'nouns' },
  ],
  21: [
    { en: 'someone', ru: 'Кто-то (нейтрально)', uk: 'Хтось (нейтрально)', es: 'alguien', pos: 'pronouns' },
    { en: 'somebody', ru: 'Кто-то (разговорно)', uk: 'Хтось (розмовно)', es: 'alguien', pos: 'pronouns' },
    { en: 'anyone', ru: 'Кто-нибудь (нейтрально)', uk: 'Хто-небудь (нейтрально)', es: 'alguien', pos: 'pronouns' },
    { en: 'anybody', ru: 'Кто-нибудь (разговорно)', uk: 'Хто-небудь (розмовно)', es: 'alguien', pos: 'pronouns' },
    { en: 'no one', ru: 'Никто (пишется раздельно)', uk: 'Ніхто (два слова в английском)', es: 'nadie', pos: 'pronouns' },
    { en: 'nobody', ru: 'Никто (одно слово)', uk: 'Ніхто (одне слово в англійській)', es: 'nadie', pos: 'pronouns' },
    { en: 'everyone', ru: 'Все; каждый', uk: 'Усі; кожен', es: 'todos', pos: 'pronouns' },
    { en: 'everybody', ru: 'Все люди / каждый', uk: 'Усі люди / кожен', es: 'todos', pos: 'pronouns' },
    { en: 'something', ru: 'Что-то', uk: 'Щось', es: 'algo', pos: 'pronouns' },
    { en: 'anything', ru: 'Что-нибудь', uk: 'Що-небудь', es: 'algo / nada', pos: 'pronouns' },
    { en: 'nothing', ru: 'Ничего', uk: 'Нічого', es: 'nada', pos: 'pronouns' },
    { en: 'everything', ru: 'Всё (вещи / события)', uk: 'Усе (речі / події)', es: 'todo', pos: 'pronouns' },
    { en: 'wrong', ru: 'Неверный; неправильный', uk: 'Невірний; неправильний', es: 'incorrecto', pos: 'adjectives' },
    { en: 'strange', ru: 'Странный', uk: 'Дивний', es: 'extraño', pos: 'adjectives' },
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', es: 'listo', pos: 'adjectives' },
    { en: 'sure', ru: 'Уверенный', uk: 'Впевнений', es: 'seguro', pos: 'adjectives' },
    { en: 'happen', ru: 'Происходить', uk: 'Відбуватися', es: 'pasar', pos: 'verbs' },
    { en: 'need', ru: 'Нуждаться; нужно', uk: 'Потребувати; треба', es: 'necesitar', pos: 'verbs' },
    { en: 'help', ru: 'Помогать; помощь', uk: 'Допомагати; допомога', es: 'ayudar', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать; заказ', uk: 'Замовляти; замовлення', es: 'pedir', pos: 'verbs' },
    { en: 'answer', ru: 'Отвечать; ответ', uk: 'Відповідати; відповідь', es: 'responder', pos: 'verbs' },
    { en: 'explain', ru: 'Объяснять', uk: 'Пояснювати', es: 'explicar', pos: 'verbs' },
    { en: 'miss', ru: 'Пропускать; скучать', uk: 'Пропускати; сумувати', es: 'perder', pos: 'verbs' },
    { en: 'arrive', ru: 'Прибывать', uk: 'Прибувати', es: 'llegar',
    'pt-BR': 'chegar', pos: 'verbs' },
    { en: 'told', ru: 'Сказал(а)', uk: 'Сказав / сказала', es: 'dijo', pos: 'verbs' },
  ],
  22: [
    { en: 'reading', ru: 'Чтение', uk: 'Читання', es: 'leer', pos: 'verbs' },
    { en: 'cooking', ru: 'Готовка; приготовление', uk: 'Готування', es: 'cocinar', pos: 'verbs' },
    { en: 'waiting', ru: 'Ожидание; ждать', uk: 'Очікування; чекати', es: 'esperar', pos: 'verbs' },
    { en: 'learning', ru: 'Процесс обучения / изучения', uk: 'Процес навчання / вивчення', es: 'aprender', pos: 'verbs' },
    { en: 'driving', ru: 'Вождение; водить', uk: 'Водіння; водити', es: 'conducir', pos: 'verbs' },
    { en: 'walking', ru: 'Ходьба; гулять', uk: 'Ходьба; гуляти', es: 'caminar', pos: 'verbs' },
    { en: 'running', ru: 'Бег; бегать', uk: 'Біг; бігати', es: 'correr', pos: 'verbs' },
    { en: 'sleeping', ru: 'Сон; спать', uk: 'Сон; спати', es: 'dormir', pos: 'verbs' },
    { en: 'listening', ru: 'Слушание; слушать', uk: 'Слухання; слухати', es: 'escuchar', pos: 'verbs' },
    { en: 'speaking', ru: 'Говорение; говорить', uk: 'Говоріння; говорити', es: 'hablar', pos: 'verbs' },
    { en: 'working', ru: 'Работа; работать', uk: 'Робота; працювати', es: 'trabajar', pos: 'verbs' },
    { en: 'studying', ru: 'Учеба; учиться', uk: 'Навчання; вчитися', es: 'estudiar', pos: 'verbs' },
    { en: 'cleaning', ru: 'Уборка; убирать', uk: 'Прибирання; прибирати', es: 'limpiar', pos: 'verbs' },
    { en: 'helping', ru: 'Помощь; помогать', uk: 'Допомога; допомагати', es: 'ayudar', pos: 'verbs' },
    { en: 'watching', ru: 'Просмотр; смотреть', uk: 'Перегляд; дивитися', es: 'ver', pos: 'verbs' },
    { en: 'writing', ru: 'Письмо; писать', uk: 'Письмо; писати', es: 'escribir', pos: 'verbs' },
    { en: 'traveling', ru: 'Путешествие; путешествовать', uk: 'Подорож; подорожувати', es: 'viajar', pos: 'verbs' },
    { en: 'spending', ru: 'Трата; тратить', uk: 'Витрата; витрачати', es: 'gastar', pos: 'verbs' },
    { en: 'wasting', ru: 'Трата зря; тратить зря', uk: 'Марна витрата; витрачати даремно', es: 'desperdiciar', pos: 'verbs' },
    { en: 'calling', ru: 'Звонок; звонить', uk: 'Дзвінок; дзвонити', es: 'llamar', pos: 'verbs' },
    { en: 'enjoy', ru: 'Получать удовольствие; любить делать', uk: 'Отримувати задоволення; любити робити', es: 'disfrutar', pos: 'verbs' },
    { en: 'like', ru: 'Нравиться; любить', uk: 'Подобатися; любити', es: 'gustar', pos: 'verbs' },
    { en: 'hate', ru: 'Ненавидеть', uk: 'Ненавидіти', es: 'odiar', pos: 'verbs' },
    { en: 'finish', ru: 'Заканчивать', uk: 'Закінчувати', es: 'terminar', pos: 'verbs' },
    { en: 'stop', ru: 'Прекращать; переставать', uk: 'Припиняти; переставати', es: 'parar', pos: 'verbs' },
    { en: 'avoid', ru: 'Избегать', uk: 'Уникати', es: 'evitar', pos: 'verbs' },
    { en: 'keep', ru: 'Держать, хранить; продолжать (делать)', uk: 'Тримати, зберігати; продовжувати (робити)', es: 'guardar; seguir (haciendo)', pos: 'verbs' },
    { en: 'suggest', ru: 'Предлагать', uk: 'Пропонувати', es: 'sugerir', pos: 'verbs' },
    { en: 'practice', ru: 'Практика', uk: 'Практика', es: 'pr?ctica', pos: 'nouns' },
    { en: 'useful', ru: 'Полезный', uk: 'Корисний', es: '?til', pos: 'adjectives' },
    { en: 'dangerous', ru: 'Опасный', uk: 'Небезпечний', es: 'peligroso', pos: 'adjectives' },
    { en: 'hard', ru: 'Сложный; тяжелый', uk: 'Складний; важкий', es: 'dif?cil', pos: 'adjectives' },
    { en: 'before', ru: 'До; перед', uk: 'До; перед', es: 'antes de', pos: 'prepositions' },
    { en: 'after', ru: 'После', uk: 'Після', es: 'despu?s de', pos: 'prepositions' },
    { en: 'music', ru: 'Музыка', uk: 'Музика', es: 'm?sica', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'cash', ru: 'Наличные', uk: 'Готівка', es: 'efectivo', pos: 'nouns' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'tel?fono', pos: 'nouns' },
    { en: 'food', ru: 'Еда', uk: 'Їжа', es: 'comida', pos: 'nouns' },
    { en: 'late', ru: 'Опаздывать; поздно', uk: 'Запізнюватися; пізно', es: 'tarde', pos: 'adjectives' },
  ],
  23: [
    { en: 'cleaned', ru: 'Убирается / убран', uk: 'Прибирається', es: 'se limpia / limpiado',
    'pt-BR': 'É limpo / está arrumado', pos: 'verbs' },
    { en: 'checked', ru: 'Проверяется / проверен', uk: 'Перевіряється', es: 'se revisa / revisado', pos: 'verbs' },
    { en: 'sold', ru: 'Продаётся / продан', uk: 'Продається', es: 'se vende / vendido', pos: 'verbs' },
    { en: 'cooked', ru: 'Готовится / приготовлен', uk: 'Готується', es: 'se cocina / cocinado', pos: 'verbs' },
    { en: 'made', ru: 'Делается / сделан', uk: 'Робиться', es: 'se hace / hecho', pos: 'verbs' },
    { en: 'closed', ru: 'Закрывается / закрыт', uk: 'Зачиняється', es: 'se cierra / cerrado', pos: 'verbs' },
    { en: 'opened', ru: 'Открывается / открыт', uk: 'Відкривається', es: 'se abre / abierto', pos: 'verbs' },
    { en: 'sent', ru: 'Отправляется / отправлен', uk: 'Надсилається', es: 'se envía / enviado', pos: 'verbs' },
    { en: 'used', ru: 'Используется / использован', uk: 'Використовується', es: 'se usa / usado', pos: 'verbs' },
    { en: 'charged', ru: 'Заряжается / заряжен', uk: 'Заряджається', es: 'se carga / cargado', pos: 'verbs' },
    { en: 'kept', ru: 'Хранится / хранился', uk: 'Зберігається', es: 'se guarda / guardado', pos: 'verbs' },
    { en: 'changed', ru: 'Меняется / изменён', uk: 'Змінюється', es: 'se cambia / cambiado', pos: 'verbs' },
    { en: 'answered', ru: 'Отвечают / дан ответ', uk: 'Відповідають', es: 'se responde / respondido', pos: 'verbs' },
    { en: 'explained', ru: 'Объясняется / объяснён', uk: 'Пояснюється', es: 'se explica / explicado', pos: 'verbs' },
    { en: 'discussed', ru: 'Обсуждается / обсуждён', uk: 'Обговорюється', es: 'se discute / discutido', pos: 'verbs' },
    { en: 'supported', ru: 'Поддерживается / поддержан', uk: 'Підтримується', es: 'se apoya / apoyado', pos: 'verbs' },
    { en: 'solved', ru: 'Решается / решён', uk: 'Вирішується', es: 'se resuelve / resuelto', pos: 'verbs' },
    { en: 'finished', ru: 'Заканчивается / закончен', uk: 'Закінчується', es: 'se termina / terminado', pos: 'verbs' },
    { en: 'invited', ru: 'Приглашается / приглашён', uk: 'Запрошується', es: 'se invita / invitado', pos: 'verbs' },
    { en: 'called', ru: 'Называется / так называют', uk: 'Називається', es: 'se llama / llamado', pos: 'verbs' },
    { en: 'signed', ru: 'Подписывается / подписан', uk: 'Підписується', es: 'se firma / firmado', pos: 'verbs' },
    { en: 'room', ru: 'Комната', uk: 'Кімната', es: 'habitación', pos: 'nouns' },
    { en: 'documents', ru: 'Документы', uk: 'Документи', es: 'documentos', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'entradas / billetes', pos: 'nouns' },
    { en: 'messages', ru: 'Сообщения', uk: 'Повідомлення', es: 'mensajes', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', es: 'contraseña', pos: 'nouns' },
    { en: 'keys', ru: 'Ключи', uk: 'Ключі', es: 'llaves', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', es: 'problema', pos: 'nouns' },
    { en: 'plan', ru: 'План', uk: 'План', es: 'plan', pos: 'nouns' },
    { en: 'ideas', ru: 'Идеи', uk: 'Ідеї', es: 'ideas', pos: 'nouns' },
    { en: 'rules', ru: 'Правила', uk: 'Правила', es: 'reglas', pos: 'nouns' },
    { en: 'often', ru: 'Часто', uk: 'Часто', es: 'a menudo', pos: 'adverbs' },
    { en: 'carefully', ru: 'Внимательно', uk: 'Уважно', es: 'cuidadosamente', pos: 'adverbs' },
    { en: 'quickly', ru: 'Быстро', uk: 'Швидко', es: 'rápidamente', pos: 'adverbs' },
    { en: 'clearly', ru: 'Чётко', uk: 'Чітко', es: 'claramente', pos: 'adverbs' },
    { en: 'on time', ru: 'Вовремя', uk: 'Вчасно', es: 'a tiempo', pos: 'adverbs' },
    { en: 'send', ru: 'Отправлять', uk: 'Надсилати', es: 'enviar', pos: 'verbs' },
    { en: 'keep', ru: 'Хранить, держать', uk: 'Зберігати, тримати', es: 'guardar', pos: 'verbs' },
    { en: 'sell', ru: 'Продавать', uk: 'Продавати', es: 'vender', pos: 'verbs' },
    { en: 'make', ru: 'Делать', uk: 'Робити', es: 'hacer', pos: 'verbs' },
    { en: 'hold', ru: 'Держать, проводить', uk: 'Тримати, проводити', es: 'sostener', pos: 'verbs' },
  ],
    24: [
    { en: 'just', ru: 'Только что', uk: 'Щойно', es: 'recién / acabar de', pos: 'adverbs' },
    { en: 'already', ru: 'Уже', uk: 'Вже', es: 'ya',
    'pt-BR': 'Já', pos: 'adverbs' },
    { en: 'yet', ru: 'Ещё (в отриц.) / уже (в вопросе)', uk: 'Ще / вже', es: 'todavía / ya', pos: 'adverbs' },
    { en: 'ever', ru: 'Когда-нибудь', uk: 'Коли-небудь', es: 'alguna vez', pos: 'adverbs' },
    { en: 'never', ru: 'Никогда', uk: 'Ніколи', es: 'nunca', pos: 'adverbs' },
    { en: 'before', ru: 'Раньше', uk: 'Раніше', es: 'antes', pos: 'adverbs' },
    { en: 'there', ru: 'Там', uk: 'Там', es: 'allí', pos: 'adverbs' },
    { en: 'arrived', ru: 'Прибыл / пришёл', uk: 'Прибув / прийшов', es: 'llegado', pos: 'verbs' },
    { en: 'found', ru: 'Нашёл', uk: 'Знайшов', es: 'encontrado', pos: 'verbs' },
    { en: 'seen', ru: 'Видел', uk: 'Бачив', es: 'visto', pos: 'verbs' },
    { en: 'sent', ru: 'Отправил', uk: 'Надіслав', es: 'enviado', pos: 'verbs' },
    { en: 'chosen', ru: 'Выбрал', uk: 'Обрав', es: 'elegido', pos: 'verbs' },
    { en: 'read', ru: 'Прочитал', uk: 'Прочитав', es: 'leído', pos: 'verbs' },
    { en: 'done', ru: 'Сделал / завершил', uk: 'Зробив / завершив', es: 'hecho', pos: 'verbs' },
    { en: 'been', ru: 'Был', uk: 'Був', es: 'estado', pos: 'verbs' },
    { en: 'made', ru: 'Сделал / создал', uk: 'Зробив / створив', es: 'hecho', pos: 'verbs' },
    { en: 'met', ru: 'Встретил', uk: 'Зустрів', es: 'conocido', pos: 'verbs' },
    { en: 'lost', ru: 'Потерял', uk: 'Загубив', es: 'perdido', pos: 'verbs' },
    { en: 'paid', ru: 'Заплатил', uk: 'Заплатив', es: 'pagado', pos: 'verbs' },
    { en: 'bought', ru: 'Купил', uk: 'Купив', es: 'comprado', pos: 'verbs' },
    { en: 'cleaned', ru: 'Убрал', uk: 'Прибрав', es: 'limpiado', pos: 'verbs' },
    { en: 'changed', ru: 'Изменил', uk: 'Змінив', es: 'cambiado', pos: 'verbs' },
    { en: 'checked', ru: 'Проверил', uk: 'Перевірив', es: 'revisado', pos: 'verbs' },
    { en: 'discussed', ru: 'Обсудил', uk: 'Обговорив', es: 'discutido', pos: 'verbs' },
    { en: 'answered', ru: 'Ответил', uk: 'Відповів', es: 'respondido', pos: 'verbs' },
    { en: 'visited', ru: 'Навестил / посетил', uk: 'Відвідав', es: 'visitado', pos: 'verbs' },
    { en: 'used', ru: 'Использовал', uk: 'Використав', es: 'usado', pos: 'verbs' },
    { en: 'keys', ru: 'Ключи', uk: 'Ключі', es: 'llaves', pos: 'nouns' },
    { en: 'documents', ru: 'Документы', uk: 'Документи', es: 'documentos', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'entradas', pos: 'nouns' },
    { en: 'messages', ru: 'Сообщения', uk: 'Повідомлення', es: 'mensajes', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', es: 'contraseña', pos: 'nouns' },
    { en: 'option', ru: 'Вариант', uk: 'Варіант', es: 'opción', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', es: 'problema', pos: 'nouns' },
    { en: 'app', ru: 'Приложение', uk: 'Застосунок', es: 'aplicación', pos: 'nouns' },
    { en: 'mistakes', ru: 'Ошибки', uk: 'Помилки', es: 'errores', pos: 'nouns' },
    { en: 'email', ru: 'Письмо / email', uk: 'Лист / email', es: 'correo electrónico', pos: 'nouns' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'teléfono', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'room', ru: 'Комната', uk: 'Кімната', es: 'habitación', pos: 'nouns' },
    { en: 'find', ru: 'Находить', uk: 'Знаходити', es: 'encontrar', pos: 'verbs' },
    { en: 'see', ru: 'Видеть', uk: 'Бачити', es: 'ver', pos: 'verbs' },
    { en: 'buy', ru: 'Покупать', uk: 'Купувати', es: 'comprar', pos: 'verbs' },
    { en: 'lose', ru: 'Терять', uk: 'Втрачати', es: 'perder',
    'pt-BR': 'Perder', pos: 'verbs' },
    { en: 'meet', ru: 'Встретить; познакомиться', uk: 'Зустріти; познайомитися', es: 'conocer', pos: 'verbs' },
  ],
    25: [
    { en: 'was', ru: 'Был (для I/he/she/it)', uk: 'Був', es: 'estaba/estuvo', pos: 'verbs' },
    { en: 'were', ru: 'Были (для you/we/they)', uk: 'Були', es: 'estabas/estaban', pos: 'verbs' },
    { en: 'while', ru: 'Пока', uk: 'Поки', es: 'mientras', pos: 'adverbs' },
    { en: 'when', ru: 'Когда', uk: 'Коли', es: 'cuando', pos: 'adverbs' },
    { en: 'at that time', ru: 'В тот момент', uk: 'У той момент', es: 'en ese momento', pos: 'adverbs' },
    { en: 'at noon', ru: 'В полдень', uk: 'Опівдні', es: 'al mediodía', pos: 'adverbs' },
    { en: 'at midnight', ru: 'В полночь', uk: 'Опівночі', es: 'a medianoche', pos: 'adverbs' },
    { en: 'last night', ru: 'Прошлой ночью', uk: 'Минулої ночі', es: 'anoche', pos: 'adverbs' },
    { en: 'yesterday evening', ru: 'Вчера вечером', uk: 'Вчора ввечері', es: 'ayer por la tarde', pos: 'adverbs' },
    { en: 'working', ru: 'Работал', uk: 'Працював', es: 'trabajando', pos: 'verbs' },
    { en: 'reading', ru: 'Читал', uk: 'Читав', es: 'leyendo', pos: 'verbs' },
    { en: 'cooking', ru: 'Готовил', uk: 'Готував', es: 'cocinando', pos: 'verbs' },
    { en: 'writing', ru: 'Писал', uk: 'Писав', es: 'escribiendo', pos: 'verbs' },
    { en: 'waiting', ru: 'Ждал', uk: 'Чекав', es: 'esperando', pos: 'verbs' },
    { en: 'watching', ru: 'Смотрел', uk: 'Дивився', es: 'viendo', pos: 'verbs' },
    { en: 'looking for', ru: 'Искать', uk: 'Шукати', es: 'buscando', pos: 'verbs' },
    { en: 'talking', ru: 'Разговаривал', uk: 'Розмовляв', es: 'hablando', pos: 'verbs' },
    { en: 'driving', ru: 'Ехал / вёл машину', uk: 'Їхав / вів машину', es: 'conduciendo', pos: 'verbs' },
    { en: 'cleaning', ru: 'Убирал', uk: 'Прибирав', es: 'limpiando', pos: 'verbs' },
    { en: 'checking', ru: 'Проверял', uk: 'Перевіряв', es: 'revisando', pos: 'verbs' },
    { en: 'walking', ru: 'Шёл / гулял', uk: 'Йшов / гуляв', es: 'caminando', pos: 'verbs' },
    { en: 'listening', ru: 'Слушал', uk: 'Слухав', es: 'escuchando', pos: 'verbs' },
    { en: 'speaking', ru: 'Говорил', uk: 'Говорив', es: 'hablando', pos: 'verbs' },
    { en: 'studying', ru: 'Занимался', uk: 'Навчався', es: 'estudiando', pos: 'verbs' },
    { en: 'sleeping', ru: 'Спал', uk: 'Спав', es: 'durmiendo', pos: 'verbs' },
    { en: 'eating', ru: 'Ел', uk: 'Їв', es: 'comiendo', pos: 'verbs' },
    { en: 'crying', ru: 'Плакала', uk: 'Плакала', es: 'llorando', pos: 'verbs' },
    { en: 'raining', ru: 'Шёл дождь', uk: 'Йшов дощ', es: 'lloviendo', pos: 'verbs' },
    { en: 'outside', ru: 'Снаружи / на улице', uk: 'Надворі', es: 'afuera', pos: 'adverbs' },
    { en: 'fast', ru: 'Быстро', uk: 'Швидко', es: 'rápido', pos: 'adverbs' },
    { en: 'then', ru: 'Тогда', uk: 'Тоді', es: 'entonces', pos: 'adverbs' },
    { en: 'near', ru: 'Рядом / у', uk: 'Поруч / біля', es: 'cerca de', pos: 'adverbs' },
    { en: 'keys', ru: 'Ключи', uk: 'Ключі', es: 'llaves', pos: 'nouns' },
    { en: 'documents', ru: 'Документы', uk: 'Документи', es: 'documentos', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'entradas', pos: 'nouns' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'teléfono', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', es: 'problema', pos: 'nouns' },
    { en: 'knock', ru: 'Стучать', uk: 'Стукати', es: 'llamar (a la puerta)', pos: 'verbs' },
    { en: 'bus', ru: 'Автобус', uk: 'Автобус', es: 'autobús', pos: 'nouns' },
  ],
    26: [
    { en: 'if', ru: 'Если', uk: 'Якщо', es: 'si',
    'pt-BR': 'Se', pos: 'adverbs' },
    { en: 'will', ru: 'Будет / сделает (будущее)', uk: 'Буде / зробить', es: 'will (futuro)', pos: 'verbs' },
    { en: 'faster', ru: 'Быстрее', uk: 'Швидше', es: 'más rápido', pos: 'adverbs' },
    { en: 'improve', ru: 'Улучшаться', uk: 'Покращуватися', es: 'mejorar', pos: 'verbs' },
    { en: 'happen', ru: 'Происходить', uk: 'Траплятися', es: 'ocurrir', pos: 'verbs' },
    { en: 'miss', ru: 'Пропустить', uk: 'Пропустити', es: 'perderse', pos: 'verbs' },
    { en: 'restart', ru: 'Перезапустить', uk: 'Перезапустити', es: 'reiniciar', pos: 'verbs' },
    { en: 'button', ru: 'Кнопка', uk: 'Кнопка', es: 'botón', pos: 'nouns' },
    { en: 'less', ru: 'Меньше', uk: 'Менше', es: 'menos', pos: 'adverbs' },
    { en: 'tired', ru: 'Уставший', uk: 'Стомлений', es: 'cansado', pos: 'adjectives' },
    { en: 'rest', ru: 'Отдыхать', uk: 'Відпочивати', es: 'descansar', pos: 'verbs' },
    { en: 'fix', ru: 'Исправить', uk: 'Виправити', es: 'corregir', pos: 'verbs' },
    { en: 'mistake', ru: 'Ошибка', uk: 'Помилка', es: 'error', pos: 'nouns' },
    { en: 'news', ru: 'Новости', uk: 'Новини', es: 'noticias', pos: 'nouns' },
    { en: 'ourselves', ru: 'Сами', uk: 'Самі', es: 'nosotros mismos', pos: 'pronouns' },
    { en: 'without', ru: 'Без', uk: 'Без', es: 'sin', pos: 'adverbs' },
    { en: 'save money', ru: 'Сэкономить деньги', uk: 'Заощадити гроші', es: 'ahorrar dinero', pos: 'verbs' },
    { en: 'stay home', ru: 'Остаться дома', uk: 'Залишитися вдома', es: 'quedarse en casa', pos: 'verbs' },
    { en: 'come back', ru: 'Вернуться', uk: 'Повернутися', es: 'volver', pos: 'verbs' },
    { en: 'invite', ru: 'Приглашать', uk: 'Запрошувати', es: 'invitar', pos: 'verbs' },
    { en: 'arrive', ru: 'Прибывать', uk: 'Прибувати', es: 'llegar', pos: 'verbs' },
    { en: 'heat', ru: 'Нагревать', uk: 'Нагрівати', es: 'calentar', pos: 'verbs' },
    { en: 'press', ru: 'Нажимать', uk: 'Натискати', es: 'presionar', pos: 'verbs' },
    { en: 'tell', ru: 'Сказать / рассказать', uk: 'Сказати / розповісти', es: 'decir / contar', pos: 'verbs' },
  ],
    27: [
    { en: 'explain', ru: 'Объяснять', uk: 'Пояснювати', es: 'explicar', pos: 'verbs' },
    { en: 'admit', ru: 'Признавать', uk: 'Визнавати', es: 'admitir', 'pt-BR': 'admitir', vi: 'thừa nhận', id: 'mengakui', tr: 'kabul etmek', pl: 'przyznawać się / przyznawać', pos: 'verbs' },
    { en: 'promise', ru: 'Обещать', uk: 'Обіцяти', es: 'prometer', 'pt-BR': 'prometer', vi: 'hứa', id: 'berjanji', tr: 'söz vermek', pl: 'obiecywać', pos: 'verbs' },
    { en: 'warn', ru: 'Предупреждать', uk: 'Попереджати', es: 'advertir', 'pt-BR': 'avisar / advertir', vi: 'cảnh báo', id: 'memperingatkan', tr: 'uyarmak', pl: 'ostrzegać', pos: 'verbs' },
    { en: 'reply', ru: 'Отвечать', uk: 'Відповідати', es: 'responder', 'pt-BR': 'responder', vi: 'trả lời', id: 'membalas / menjawab', tr: 'cevap vermek', pl: 'odpowiadać', pos: 'verbs' },
    { en: 'would', ru: 'Бы / Будет (косвен.)', uk: 'Б / Буде (косв.)', es: 'condicional', pos: 'verbs' },
    { en: 'could', ru: 'Мог(ла)', uk: 'Міг(ла)', es: 'podría', pos: 'verbs' },
    { en: 'busy', ru: 'Занятой', uk: 'Зайнятий', es: 'ocupado', pos: 'adjectives' },
    { en: 'ready', ru: 'Готовый', uk: 'Готовий', es: 'listo', pos: 'adjectives' },
    { en: 'wrong', ru: 'Неправильный', uk: 'Неправильний', es: 'equivocado', pos: 'adjectives' },
    { en: 'dangerous', ru: 'Опасный', uk: 'Небезпечний', es: 'peligroso', pos: 'adjectives' },
    { en: 'important', ru: 'Важный', uk: 'Важливий', es: 'importante', pos: 'adjectives' },
    { en: 'experienced', ru: 'Опытный', uk: 'Досвідчений', es: 'experimentado', 'pt-BR': 'experiente', vi: 'có kinh nghiệm', id: 'berpengalaman', tr: 'deneyimli', pl: 'doświadczony', pos: 'adjectives' },
    { en: 'reliable', ru: 'Надежный', uk: 'Надійний', es: 'confiable', 'pt-BR': 'confiável', vi: 'đáng tin cậy', id: 'dapat diandalkan', tr: 'güvenilir', pl: 'niezawodny / godny zaufania', pos: 'adjectives' },
    { en: 'honest', ru: 'Честный', uk: 'Чесний', es: 'honesto', 'pt-BR': 'honesto', vi: 'trung thực', id: 'jujur', tr: 'dürüst', pl: 'uczciwy', pos: 'adjectives' },
    { en: 'okay', ru: 'В порядке', uk: 'Гаразд', es: 'bien', pos: 'adverbs' },
    { en: 'later', ru: 'Позже', uk: 'Пізніше', es: 'más tarde', pos: 'adverbs' },
    { en: 'soon', ru: 'Скоро', uk: 'Скоро', es: 'pronto', pos: 'adverbs' },
    { en: 'still', ru: 'Всё ещё', uk: 'Ще', es: 'todavía', 'pt-BR': 'ainda', vi: 'vẫn / vẫn còn', id: 'masih', tr: 'hâlâ', pl: 'nadal / wciąż', pos: 'adverbs' },
    { en: 'contract', ru: 'Контракт', uk: 'Контракт', es: 'contrato', 'pt-BR': 'contrato', vi: 'hợp đồng', id: 'kontrak', tr: 'sözleşme', pl: 'kontrakt / umowa', pos: 'nouns' },
    { en: 'document', ru: 'Документ', uk: 'Документ', es: 'documento', pos: 'nouns' },
    { en: 'password', ru: 'Пароль', uk: 'Пароль', es: 'contraseña', pos: 'nouns' },
    { en: 'meeting', ru: 'Встреча', uk: 'Зустріч', es: 'reunión', pos: 'nouns' },
    { en: 'report', ru: 'Отчет', uk: 'Звіт', es: 'informe', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', es: 'problema', pos: 'nouns' },
    { en: 'everything', ru: 'Всё', uk: 'Все', es: 'todo', pos: 'pronouns' },
    { en: 'nothing', ru: 'Ничего', uk: 'Нічого', es: 'nada', pos: 'pronouns' },
  ],
  28: [
    { en: 'myself', ru: 'Себя / сам (я)', uk: 'Себе / сам (я)', es: 'me mismo', 'pt-BR': 'eu mesmo / a mim mesmo', vi: 'chính tôi / bản thân tôi', id: 'diri saya sendiri', tr: 'kendim', pl: 'sam / siebie', pos: 'pronouns' },
    { en: 'yourself', ru: 'Себя / сам (ты/вы)', uk: 'Себе / сам (ти/ви)', es: 'te mismo', 'pt-BR': 'você mesmo / a si mesmo', vi: 'chính bạn / bản thân bạn', id: 'dirimu sendiri', tr: 'kendin / kendiniz', pl: 'sam / siebie', pos: 'pronouns' },
    { en: 'himself', ru: 'Себя / сам (он)', uk: 'Себе / сам (він)', es: 'se mismo', 'pt-BR': 'ele mesmo / a si mesmo', vi: 'chính anh ấy / bản thân anh ấy', id: 'dirinya sendiri', tr: 'kendisi', pl: 'sam / siebie', pos: 'pronouns' },
    { en: 'herself', ru: 'Себя / сама', uk: 'Себе / сама', es: 'se misma', 'pt-BR': 'ela mesma / a si mesma', vi: 'chính cô ấy / bản thân cô ấy', id: 'dirinya sendiri', tr: 'kendisi', pl: 'sama / siebie', pos: 'pronouns' },
    { en: 'itself', ru: 'Себя / само', uk: 'Себе / само', es: 'se mismo', 'pt-BR': 'ele/ela mesmo(a) / a si mesmo', vi: 'chính nó / bản thân nó', id: 'dirinya sendiri', tr: 'kendisi', pl: 'samo / siebie', pos: 'pronouns' },
    { en: 'ourselves', ru: 'Себя / сами (мы)', uk: 'Себе / самі (ми)', es: 'nos mismos', pos: 'pronouns' },
    { en: 'yourselves', ru: 'Себя / сами (вы)', uk: 'Себе / самі (ви)', es: 'os mismos', 'pt-BR': 'vocês mesmos / a si mesmos', vi: 'chính các bạn / bản thân các bạn', id: 'diri kalian sendiri', tr: 'kendiniz', pl: 'sami / siebie', pos: 'pronouns' },
    { en: 'themselves', ru: 'Себя / сами (они)', uk: 'Себе / самі (вони)', es: 'se mismos', 'pt-BR': 'eles/elas mesmos / a si mesmos', vi: 'chính họ / bản thân họ', id: 'diri mereka sendiri', tr: 'kendileri', pl: 'sami / siebie', pos: 'pronouns' },
    { en: 'prepare', ru: 'Подготовиться', uk: 'Підготуватися', es: 'preparar', pos: 'verbs' },
    { en: 'protect', ru: 'Защитить себя', uk: 'Захистити себе', es: 'proteger', pos: 'verbs' },
    { en: 'control', ru: 'Контролировать себя', uk: 'Контролювати себе', es: 'controlar', 'pt-BR': 'controlar-se', vi: 'tự kiểm soát', id: 'mengendalikan diri', tr: 'kendini kontrol etmek', pl: 'kontrolować się', pos: 'verbs' },
    { en: 'force', ru: 'Заставить себя', uk: 'Змусити себе', es: 'forzar', 'pt-BR': 'forçar-se', vi: 'ép bản thân', id: 'memaksa diri', tr: 'kendini zorlamak', pl: 'zmuszać się', pos: 'verbs' },
    { en: 'forgive', ru: 'Простить себя', uk: 'Пробачити себе', es: 'perdonar', 'pt-BR': 'perdoar-se', vi: 'tha thứ cho bản thân', id: 'memaafkan diri sendiri', tr: 'kendini affetmek', pl: 'wybaczać sobie', pos: 'verbs' },
    { en: 'blame', ru: 'Винить себя', uk: 'Звинувачувати себе', es: 'culpar', 'pt-BR': 'culpar-se', vi: 'tự trách mình', id: 'menyalahkan diri sendiri', tr: 'kendini suçlamak', pl: 'obwiniać się', pos: 'verbs' },
    { en: 'stop', ru: 'Остановить себя', uk: 'Зупинити себе', es: 'parar', pos: 'verbs' },
    { en: 'believe', ru: 'Верить в себя', uk: 'Вірити в себе', es: 'creer', pos: 'verbs' },
    { en: 'trust', ru: 'Доверять себе', uk: 'Довіряти собі', es: 'confiar', pos: 'verbs' },
    { en: 'remind', ru: 'Напомнить себе', uk: 'Нагадати собі', es: 'recordar', 'pt-BR': 'lembrar-se', vi: 'tự nhắc mình', id: 'mengingatkan diri sendiri', tr: 'kendine hatırlatmak', pl: 'przypominać sobie', pos: 'verbs' },
    { en: 'ask', ru: 'Спросить себя', uk: 'Запитати себе', es: 'preguntar', pos: 'verbs' },
    { en: 'truth', ru: 'Правда', uk: 'Правда', es: 'verdad', 'pt-BR': 'verdade', vi: 'sự thật', id: 'kebenaran', tr: 'gerçek', pl: 'prawda', pos: 'nouns' },
    { en: 'dinner', ru: 'Ужин', uk: 'Вечеря', es: 'cena', pos: 'nouns' },
    { en: 'room', ru: 'Комната', uk: 'Кімната', es: 'habitación', pos: 'nouns' },
    { en: 'question', ru: 'Вопрос', uk: 'Питання', es: 'pregunta', pos: 'nouns' },
    { en: 'why', ru: 'Почему', uk: 'Чому', es: 'por qué', pos: 'adverbs' },
    { en: 'rest', ru: 'Отдыхать', uk: 'Відпочивати', es: 'descansar', pos: 'verbs' },
    { en: 'take care of', ru: 'Заботиться о', uk: 'Піклуватися про', es: 'cuidar de', 'pt-BR': 'cuidar de', vi: 'chăm sóc', id: 'merawat / mengurus', tr: 'ilgilenmek / bakmak', pl: 'opiekować się', pos: 'verbs' },
  ],
  29: [
    { en: 'used to', ru: 'Раньше обычно', uk: 'Раніше зазвичай', es: 'solía', 'pt-BR': 'costumava', vi: 'đã từng thường', id: 'dulu biasa', tr: 'eskiden ... yapardı', pl: 'kiedyś zwykle', pos: 'verbs' },
    { en: 'live', ru: 'Жить', uk: 'Жити', es: 'vivir', pos: 'verbs' },
    { en: 'travel', ru: 'Путешествовать', uk: 'Подорожувати', es: 'viajar', pos: 'verbs' },
    { en: 'save', ru: 'Экономить', uk: 'Економити', es: 'ahorrar', pos: 'verbs' },
    { en: 'check', ru: 'Проверять', uk: 'Перевіряти', es: 'revisar', pos: 'verbs' },
    { en: 'order', ru: 'Заказывать', uk: 'Замовляти', es: 'pedir', pos: 'verbs' },
    { en: 'shy', ru: 'Стеснительный', uk: "Сором\'язливий", es: 'tímido', 'pt-BR': 'tímido', vi: 'nhút nhát', id: 'pemalu', tr: 'utangaç', pl: 'nieśmiały', pos: 'adjectives' },
    { en: 'patient', ru: 'Терпеливый', uk: 'Терплячий', es: 'paciente', 'pt-BR': 'paciente', vi: 'kiên nhẫn', id: 'sabar', tr: 'sabırlı', pl: 'cierpliwy', pos: 'adjectives' },
    { en: 'confidently', ru: 'Уверенно', uk: 'Впевнено', es: 'con confianza', 'pt-BR': 'com confiança', vi: 'một cách tự tin', id: 'dengan percaya diri', tr: 'kendinden emin şekilde', pl: 'pewnie / z pewnością', pos: 'adverbs' },
    { en: 'slowly', ru: 'Медленно', uk: 'Повільно', es: 'lentamente', pos: 'adverbs' },
    { en: 'faster', ru: 'Быстрее', uk: 'Швидше', es: 'más rápido', pos: 'adverbs' },
    { en: 'on time', ru: 'Вовремя', uk: 'Вчасно', es: 'a tiempo', pos: 'adverbs' },
    { en: 'together', ru: 'Вместе', uk: 'Разом', es: 'juntos', pos: 'adverbs' },
    { en: 'near', ru: 'Рядом', uk: 'Поруч', es: 'cerca', pos: 'adverbs' },
    { en: 'mistake', ru: 'Ошибка', uk: 'Помилка', es: 'error', pos: 'nouns' },
    { en: 'keys', ru: 'Ключи', uk: 'Ключі', es: 'llaves', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolsa', pos: 'nouns' },
    { en: 'play', ru: 'Играть', uk: 'Грати', es: 'tocar / jugar', 'pt-BR': 'tocar / jogar', vi: 'chơi / chơi nhạc', id: 'bermain / memainkan', tr: 'çalmak / oynamak', pl: 'grać', pos: 'verbs' },
  ],
  30: [
    { en: 'who', ru: 'Который (про людей)', uk: 'Який / яка / які', es: 'que (personas)', pos: 'pronouns' },
    { en: 'which', ru: 'Который (про вещи)', uk: 'Який / яке (про речі)', es: 'que (cosas)', pos: 'pronouns' },
    { en: 'that', ru: 'Который (универсально)', uk: 'Що / який (універсально)', es: 'que', 'pt-BR': 'que', vi: 'mà / cái mà', id: 'yang', tr: 'ki / o', pl: 'który / że', pos: 'pronouns' },
    { en: 'where', ru: 'Где / в котором', uk: 'Де / в якому', es: 'donde', pos: 'adverbs' },
    { en: 'whose', ru: 'Чей / чья / чьи', uk: 'Чий / чия / чиї', es: 'cuyo', 'pt-BR': 'cujo / de quem', vi: 'của ai / mà ... của', id: 'yang ...-nya / milik siapa', tr: 'kimin / -in ... olduğu', pl: 'czyj / którego', pos: 'pronouns' },
    { en: 'explain', ru: 'Объяснять', uk: 'Пояснювати', es: 'explicar', pos: 'verbs' },
    { en: 'solve', ru: 'Решать', uk: 'Вирішувати', es: 'resolver', 'pt-BR': 'resolver', vi: 'giải quyết', id: 'menyelesaikan / memecahkan', tr: 'çözmek', pl: 'rozwiązywać', pos: 'verbs' },
    { en: 'invite', ru: 'Приглашать', uk: 'Запрошувати', es: 'invitar', pos: 'verbs' },
    { en: 'stay', ru: 'Останавливаться', uk: 'Зупинятися', es: 'quedarse', 'pt-BR': 'ficar / hospedar-se', vi: 'ở lại / dừng lại', id: 'tinggal / berhenti', tr: 'kalmak', pl: 'zostawać / zatrzymywać się', pos: 'verbs' },
    { en: 'person', ru: 'Человек', uk: 'Людина', es: 'persona', 'pt-BR': 'pessoa', vi: 'người', id: 'orang', tr: 'kişi', pl: 'osoba', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'entradas', pos: 'nouns' },
    { en: 'plan', ru: 'План', uk: 'План', es: 'plan', pos: 'nouns' },
    { en: 'hotel', ru: 'Отель', uk: 'Готель', es: 'hotel', pos: 'nouns' },
    { en: 'bank', ru: 'Банк', uk: 'Банк', es: 'banco', pos: 'nouns' },
    { en: 'table', ru: 'Стол', uk: 'Стіл', es: 'mesa', pos: 'nouns' },
    { en: 'nearby', ru: 'Рядом / неподалёку', uk: 'Поруч / неподалік', es: 'cerca', 'pt-BR': 'perto / nas proximidades', vi: 'gần đây / ở gần', id: 'di dekat / sekitar', tr: 'yakında / yakınlarda', pl: 'w pobliżu', pos: 'adverbs' },
    { en: 'correctly', ru: 'Правильно', uk: 'Правильно', es: 'correctamente', pos: 'adverbs' },
    { en: 'carefully', ru: 'Внимательно', uk: 'Уважно', es: 'con cuidado', pos: 'adverbs' },
  ],
  31: [
    { en: 'demand', ru: 'Требовать', uk: 'Вимагати', es: 'exigir', 'pt-BR': 'exigir', vi: 'yêu cầu / đòi hỏi', id: 'menuntut', tr: 'talep etmek', pl: 'żądać', pos: 'verbs' },
    { en: 'conduct', ru: 'Проводить', uk: 'Проводити', es: 'dirigir', 'pt-BR': 'conduzir / realizar', vi: 'tiến hành / thực hiện', id: 'melakukan / memimpin', tr: 'yürütmek', pl: 'prowadzić / przeprowadzać', pos: 'verbs' },
    { en: 'verify', ru: 'Проверять', uk: 'Перевіряти', es: 'verificar', 'pt-BR': 'verificar', vi: 'xác minh', id: 'memverifikasi', tr: 'doğrulamak', pl: 'weryfikować / sprawdzać', pos: 'verbs' },
    { en: 'carpenter', ru: 'Плотник', uk: 'Тесляр', es: 'carpintero', 'pt-BR': 'carpinteiro', vi: 'thợ mộc', id: 'tukang kayu', tr: 'marangoz', pl: 'stolarz', pos: 'nouns' },
    { en: 'supplier', ru: 'Поставщик', uk: 'Постачальник', es: 'proveedor', 'pt-BR': 'fornecedor', vi: 'nhà cung cấp', id: 'pemasok', tr: 'tedarikçi', pl: 'dostawca', pos: 'nouns' },
    { en: 'tenant', ru: 'Жилец', uk: 'Мешканець', es: 'arrendatario', 'pt-BR': 'inquilino', vi: 'người thuê nhà', id: 'penyewa', tr: 'kiracı', pl: 'najemca / lokator', pos: 'nouns' },
    { en: 'thesis', ru: 'Диссертация', uk: 'Дисертація', es: 'tesis', 'pt-BR': 'tese', vi: 'luận văn', id: 'tesis', tr: 'tez', pl: 'praca dyplomowa / teza', pos: 'nouns' },
    { en: 'tremor', ru: 'Толчок', uk: 'Поштовх', es: 'temblor', 'pt-BR': 'tremor / abalo', vi: 'cơn run / rung chấn', id: 'getaran / tremor', tr: 'sarsıntı / titreme', pl: 'drżenie / wstrząs', pos: 'nouns' },
    { en: 'injection', ru: 'Инъекция', uk: "Ін\'єкція", es: 'inyección', 'pt-BR': 'injeção', vi: 'mũi tiêm', id: 'suntikan', tr: 'enjeksiyon / iğne', pl: 'zastrzyk', pos: 'nouns' },
    { en: 'forecast', ru: 'Прогноз', uk: 'Прогноз', es: 'pronóstico', 'pt-BR': 'previsão', vi: 'dự báo', id: 'prakiraan', tr: 'tahmin', pl: 'prognoza', pos: 'nouns' },
    { en: 'furious', ru: 'Разъяренный', uk: 'Розлючений', es: 'furioso', 'pt-BR': 'furioso', vi: 'giận dữ', id: 'sangat marah', tr: 'öfkeli', pl: 'wściekły', pos: 'adjectives' },
    { en: 'pale', ru: 'Бледный', uk: 'Блідий', es: 'pálido', 'pt-BR': 'pálido', vi: 'tái nhợt', id: 'pucat', tr: 'solgun', pl: 'blady', pos: 'adjectives' },
    { en: 'painless', ru: 'Безболезненный', uk: 'Безболісний', es: 'sin dolor', 'pt-BR': 'indolor / sem dor', vi: 'không đau', id: 'tanpa rasa sakit', tr: 'ağrısız', pl: 'bezbolesny', pos: 'adjectives' },
    { en: 'perfectly', ru: 'Идеально', uk: 'Ідеально', es: 'perfectamente', 'pt-BR': 'perfeitamente', vi: 'một cách hoàn hảo', id: 'dengan sempurna', tr: 'mükemmel şekilde', pl: 'idealnie', pos: 'adverbs' },
    { en: 'efficiently', ru: 'Эффективно', uk: 'Ефективно', es: 'eficientemente', 'pt-BR': 'eficientemente', vi: 'hiệu quả', id: 'secara efisien', tr: 'verimli şekilde', pl: 'efektywnie', pos: 'adverbs' },
    { en: 'flight', ru: 'Полёт, рейс', uk: 'Політ, рейс', es: 'vuelo', 'pt-BR': 'voo / рейс', vi: 'chuyến bay', id: 'penerbangan', tr: 'uçuş / sefer', pl: 'lot / rejs', pos: 'nouns' },
    { en: 'procedure', ru: 'Процедура', uk: 'Процедура', es: 'procedimiento', 'pt-BR': 'procedimento', vi: 'quy trình / thủ tục', id: 'prosedur', tr: 'prosedür / işlem', pl: 'procedura', pos: 'nouns' },
    { en: 'raindrop', ru: 'Капля дождя', uk: 'Крапля дощу', es: 'gota de agua', 'pt-BR': 'gota de chuva', vi: 'giọt mưa', id: 'tetes hujan', tr: 'yağmur damlası', pl: 'kropla deszczu', pos: 'nouns' },
    { en: 'shoulder', ru: 'Плечо', uk: 'Плече', es: 'hombro', 'pt-BR': 'ombro', vi: 'vai', id: 'bahu', tr: 'omuz', pl: 'ramię / bark', pos: 'nouns' },
    { en: 'jazz', ru: 'Джаз', uk: 'Джаз', es: 'jazz', 'pt-BR': 'jazz', vi: 'nhạc jazz', id: 'jazz', tr: 'caz', pl: 'jazz', pos: 'nouns' },
    { en: 'composition', ru: 'Сочинение, состав', uk: 'Твір, склад', es: 'composición', 'pt-BR': 'composição / redação', vi: 'bài viết / thành phần', id: 'komposisi / karangan', tr: 'beste / kompozisyon', pl: 'kompozycja / wypracowanie', pos: 'nouns' },
    { en: 'earth', ru: 'Земля (планета); почва', uk: 'Земля; ґрунт', es: 'tierra', 'pt-BR': 'terra / solo', vi: 'trái đất / đất', id: 'bumi / tanah', tr: 'dünya / toprak', pl: 'ziemia / gleba', pos: 'nouns' },
    { en: 'unknown', ru: 'Неизвестный', uk: 'Невідомий', es: 'desconocido', 'pt-BR': 'desconhecido', vi: 'không rõ / chưa biết', id: 'tidak dikenal / tidak diketahui', tr: 'bilinmeyen', pl: 'nieznany', pos: 'adjectives' },
    { en: 'slot', ru: 'Слот, щель', uk: 'Слот, щілина', es: 'ranura', 'pt-BR': 'slot / fenda', vi: 'khe / ô', id: 'slot / celah', tr: 'yuva / aralık', pl: 'slot / szczelina', pos: 'nouns' },
    { en: 'protester', ru: 'Протестующий', uk: 'Протестувальник', es: 'manifestante', 'pt-BR': 'manifestante', vi: 'người biểu tình', id: 'pengunjuk rasa', tr: 'protestocu', pl: 'protestujący', pos: 'nouns' },
    { en: 'political', ru: 'Политический', uk: 'Політичний', es: 'político', 'pt-BR': 'político', vi: 'chính trị', id: 'politik', tr: 'siyasi / politik', pl: 'polityczny', pos: 'adjectives' },
    { en: 'slogan', ru: 'Лозунг', uk: 'Гасло', es: 'lema', 'pt-BR': 'slogan / lema', vi: 'khẩu hiệu', id: 'slogan', tr: 'slogan', pl: 'hasło', pos: 'nouns' },
    { en: 'strike', ru: 'Удар; забастовка', uk: 'Удар; страйк', es: 'huelga', 'pt-BR': 'greve / golpe', vi: 'đình công / cú đánh', id: 'mogok / pukulan', tr: 'grev / vuruş', pl: 'strajk / uderzenie', pos: 'nouns' },
    { en: 'lonely', ru: 'Одинокий', uk: 'Самотній', es: 'solitario', 'pt-BR': 'solitário', vi: 'cô đơn', id: 'kesepian / sendirian', tr: 'yalnız', pl: 'samotny', pos: 'adjectives' },
    { en: 'face', ru: 'Лицо; лицом к', uk: 'Обличчя; зіткнутися', es: 'rostro', 'pt-BR': 'rosto / encarar', vi: 'khuôn mặt / đối mặt', id: 'wajah / menghadapi', tr: 'yüz / yüzleşmek', pl: 'twarz / stawić czoła', pos: 'nouns' },
    { en: 'production', ru: 'Производство, постановка', uk: 'Виробництво, вистава', es: 'producción', 'pt-BR': 'produção / encenação', vi: 'sản xuất / vở diễn', id: 'produksi / pementasan', tr: 'üretim / sahneleme', pl: 'produkcja / wystawienie', pos: 'nouns' },
    { en: 'quota', ru: 'Квота, норма', uk: 'Квота, норма', es: 'cuota', 'pt-BR': 'cota / quota', vi: 'hạn ngạch / chỉ tiêu', id: 'kuota', tr: 'kota', pl: 'kwota / limit', pos: 'nouns' },
    { en: 'trunk', ru: 'Багажник; ствол', uk: 'Багажник; стовбур', es: 'trompa', 'pt-BR': 'porta-malas / tronco', vi: 'cốp xe / thân cây / vòi', id: 'bagasi / batang / belalai', tr: 'bagaj / gövde / hortum', pl: 'bagażnik / pień / trąba', pos: 'nouns' },
    { en: 'layer', ru: 'Слой', uk: 'Шар', es: 'capa', 'pt-BR': 'camada', vi: 'lớp', id: 'lapisan', tr: 'katman', pl: 'warstwa', pos: 'nouns' },
    { en: 'genius', ru: 'Гений', uk: 'Геній', es: 'genio', 'pt-BR': 'gênio', vi: 'thiên tài', id: 'jenius', tr: 'dahi', pl: 'geniusz', pos: 'nouns' },
    { en: 'refund', ru: 'Возврат (денег)', uk: 'Повернення (коштів)', es: 'reembolso', 'pt-BR': 'reembolso / devolução', vi: 'hoàn tiền', id: 'pengembalian dana', tr: 'para iadesi', pl: 'zwrot pieniędzy', pos: 'nouns' },
    { en: 'fabric', ru: 'Ткань', uk: 'Тканина', es: 'tela', 'pt-BR': 'tecido', vi: 'vải', id: 'kain', tr: 'kumaş', pl: 'tkanina', pos: 'nouns' },
    { en: 'sensitive', ru: 'Чувствительный', uk: 'Чутливий', es: 'sensible', 'pt-BR': 'sensível', vi: 'nhạy cảm', id: 'sensitif', tr: 'hassas', pl: 'wrażliwy', pos: 'adjectives' },
    { en: 'skin', ru: 'Кожа', uk: 'Шкіра', es: 'piel', 'pt-BR': 'pele', vi: 'da', id: 'kulit', tr: 'cilt / deri', pl: 'skóra', pos: 'nouns' },
    { en: 'archaeologist', ru: 'Археолог (AmE)', uk: 'Археолог (AmE)', es: 'arqueólogo', 'pt-BR': 'arqueólogo', vi: 'nhà khảo cổ', id: 'arkeolog', tr: 'arkeolog', pl: 'archeolog', pos: 'nouns' },
    { en: 'rewrite', ru: 'Переписать', uk: 'Переписати', es: 'volver a escribir', 'pt-BR': 'reescrever', vi: 'viết lại', id: 'menulis ulang', tr: 'yeniden yazmak', pl: 'przepisać / napisać od nowa', pos: 'verbs' },
    { en: 'graduation', ru: 'Выпуск (из учебного)', uk: 'Випуск (закінчення)', es: 'graduación', 'pt-BR': 'formatura / graduação', vi: 'lễ tốt nghiệp', id: 'kelulusan / wisuda', tr: 'mezuniyet', pl: 'ukończenie szkoły / dyplom', pos: 'nouns' },
    { en: 'violinist', ru: 'Скрипач(ка)', uk: 'Скрипаль(ка)', es: 'violinista', 'pt-BR': 'violinista', vi: 'nghệ sĩ vĩ cầm', id: 'pemain biola', tr: 'kemancı', pl: 'skrzypek / skrzypaczka', pos: 'nouns' },
    { en: 'melody', ru: 'Мелодия', uk: 'Мелодія', es: 'melodía', 'pt-BR': 'melodia', vi: 'giai điệu', id: 'melodi', tr: 'melodi', pl: 'melodia', pos: 'nouns' },
    { en: 'square', ru: 'Площадь, квадратный', uk: 'Площа, квадратний', es: 'cuadrado', 'pt-BR': 'quadrado / praça', vi: 'hình vuông / quảng trường', id: 'persegi / alun-alun', tr: 'kare / meydan', pl: 'kwadrat / plac', pos: 'nouns' },
    { en: 'steam', ru: 'Пар', uk: 'Пар', es: 'vapor', 'pt-BR': 'vapor', vi: 'hơi nước', id: 'uap', tr: 'buhar', pl: 'para', pos: 'nouns' },
    { en: 'mayor', ru: 'Мэр', uk: 'Мер', es: 'alcalde', 'pt-BR': 'prefeito', vi: 'thị trưởng', id: 'wali kota', tr: 'belediye başkanı', pl: 'burmistrz / prezydent miasta', pos: 'nouns' },
    { en: 'arm', ru: 'Рука (от плеча до кисти)', uk: 'Рука (від плеча до кисті)', es: 'brazo', 'pt-BR': 'braço', vi: 'cánh tay', id: 'lengan', tr: 'kol', pl: 'ręka / ramię', pos: 'nouns' },
    { en: 'hand', ru: 'Рука (кисть)', uk: 'Рука (кисть)', es: 'mano', 'pt-BR': 'mão', vi: 'bàn tay', id: 'tangan', tr: 'el', pl: 'dłoń', pos: 'nouns' },
    { en: 'bare', ru: 'Голый, оголённый', uk: 'Голий, оголений', es: 'desnudo', 'pt-BR': 'nu / descoberto', vi: 'trần / để lộ', id: 'telanjang / terbuka', tr: 'çıplak / açık', pl: 'goły / odsłonięty', pos: 'adjectives' },
    { en: 'child', ru: 'Ребёнок', uk: 'Дитина', es: 'niño', 'pt-BR': 'criança', vi: 'đứa trẻ', id: 'anak', tr: 'çocuk', pl: 'dziecko', pos: 'nouns' },
    { en: 'chocolate', ru: 'Шоколадный', uk: 'Шоколадний', es: 'de chocolate', 'pt-BR': 'de chocolate', vi: 'sô cô la', id: 'cokelat', tr: 'çikolatalı', pl: 'czekoladowy', pos: 'adjectives' },
    { en: 'cake', ru: 'Торт', uk: 'Торт', es: 'pastel', 'pt-BR': 'bolo', vi: 'bánh', id: 'kue', tr: 'pasta / kek', pl: 'ciasto / tort', pos: 'nouns' },
    { en: 'little', ru: 'Маленький', uk: 'Маленький', es: 'pequeño', 'pt-BR': 'pequeno', vi: 'nhỏ', id: 'kecil', tr: 'küçük', pl: 'mały', pos: 'adjectives' },
    { en: 'notice', ru: 'Замечать', uk: 'Помічати', es: 'notar', 'pt-BR': 'notar / perceber', vi: 'nhận thấy', id: 'memperhatikan / menyadari', tr: 'fark etmek', pl: 'zauważać', pos: 'verbs' },
    { en: 'shout', ru: 'Кричать', uk: 'Кричати', es: 'gritar', 'pt-BR': 'gritar', vi: 'hét / la lên', id: 'berteriak', tr: 'bağırmak', pl: 'krzyczeć', pos: 'verbs' },
    { en: 'loud', ru: 'Громкий', uk: 'Гучний', es: 'fuerte / alto', 'pt-BR': 'alto / barulhento', vi: 'to / ồn', id: 'keras / nyaring', tr: 'yüksek sesli', pl: 'głośny', pos: 'adjectives' },
    { en: 'bright', ru: 'Яркий', uk: 'Яскравий', es: 'brillante', 'pt-BR': 'brilhante / claro', vi: 'sáng / rực rỡ', id: 'terang / cerah', tr: 'parlak', pl: 'jasny / jaskrawy', pos: 'adjectives' },
    { en: 'hill', ru: 'Холм', uk: 'Пагорб', es: 'colina', 'pt-BR': 'colina', vi: 'ngọn đồi', id: 'bukit', tr: 'tepe', pl: 'wzgórze', pos: 'nouns' },
    { en: 'lazy', ru: 'Ленивый', uk: 'Лінивий', es: 'perezoso', 'pt-BR': 'preguiçoso', vi: 'lười biếng', id: 'malas', tr: 'tembel', pl: 'leniwy', pos: 'adjectives' },
    { en: 'manager', ru: 'Менеджер', uk: 'Менеджер', es: 'gerente', 'pt-BR': 'gerente', vi: 'quản lý', id: 'manajer', tr: 'yönetici', pl: 'menedżer / kierownik', pos: 'nouns' },
    { en: 'worker', ru: 'Работник', uk: 'Працівник', es: 'trabajador', 'pt-BR': 'trabalhador', vi: 'công nhân / nhân viên', id: 'pekerja', tr: 'işçi / çalışan', pl: 'pracownik', pos: 'nouns' },
    { en: 'necessary', ru: 'Необходимый', uk: 'Необхідний', es: 'necesario', 'pt-BR': 'necessário', vi: 'cần thiết', id: 'perlu / penting', tr: 'gerekli', pl: 'konieczny / potrzebny', pos: 'adjectives' },
    { en: 'construction', ru: 'Строительный', uk: 'Будівельний', es: 'de construcción', 'pt-BR': 'de construção', vi: 'xây dựng', id: 'konstruksi / bangunan', tr: 'inşaat', pl: 'budowlany', pos: 'adjectives' },
    { en: 'materials', ru: 'Материалы', uk: 'Матеріали', es: 'materiales', 'pt-BR': 'materiais', vi: 'vật liệu', id: 'bahan-bahan', tr: 'malzemeler', pl: 'materiały', pos: 'nouns' },
    { en: 'foreign', ru: 'Иностранный', uk: 'Іноземний', es: 'extranjero', 'pt-BR': 'estrangeiro', vi: 'nước ngoài', id: 'asing', tr: 'yabancı', pl: 'zagraniczny / obcy', pos: 'adjectives' },
    { en: 'inspect', ru: 'Проверять / осматривать', uk: 'Перевіряти / оглядати', es: 'inspeccionar', 'pt-BR': 'inspecionar / verificar', vi: 'kiểm tra', id: 'memeriksa', tr: 'incelemek / denetlemek', pl: 'sprawdzać / kontrolować', pos: 'verbs' },
    { en: 'modern', ru: 'Современный', uk: 'Сучасний', es: 'moderno', 'pt-BR': 'moderno', vi: 'hiện đại', id: 'modern', tr: 'modern', pl: 'nowoczesny', pos: 'adjectives' },
    { en: 'chemical', ru: 'Химический', uk: 'Хімічний', es: 'químico', 'pt-BR': 'químico', vi: 'hóa học', id: 'kimia', tr: 'kimyasal', pl: 'chemiczny', pos: 'adjectives' },
    { en: 'pierce', ru: 'Прокалывать', uk: 'Проколювати', es: 'perforar', 'pt-BR': 'perfurar', vi: 'đâm thủng / xỏ', id: 'menusuk / menembus', tr: 'delmek', pl: 'przebijać / przekłuwać', pos: 'verbs' },
    { en: 'thick', ru: 'Толстый', uk: 'Товстий', es: 'grueso', 'pt-BR': 'grosso / espesso', vi: 'dày', id: 'tebal', tr: 'kalın', pl: 'gruby / gęsty', pos: 'adjectives' },
    { en: 'protective', ru: 'Защитный', uk: 'Захисний', es: 'protector', 'pt-BR': 'protetor / de proteção', vi: 'bảo vệ', id: 'pelindung', tr: 'koruyucu', pl: 'ochronny', pos: 'adjectives' },
    { en: 'young', ru: 'Молодой', uk: 'Молодий', es: 'joven', 'pt-BR': 'jovem', vi: 'trẻ', id: 'muda', tr: 'genç', pl: 'młody', pos: 'adjectives' },
    { en: 'secret', ru: 'Секретный', uk: 'Таємний', es: 'secreto', 'pt-BR': 'secreto', vi: 'bí mật', id: 'rahasia', tr: 'gizli', pl: 'tajny / sekretny', pos: 'adjectives' },
    { en: 'government', ru: 'Правительство', uk: 'Уряд', es: 'gobierno', 'pt-BR': 'governo', vi: 'chính phủ', id: 'pemerintah', tr: 'hükümet', pl: 'rząd', pos: 'nouns' },
    { en: 'farmer', ru: 'Фермер', uk: 'Фермер', es: 'agricultor', 'pt-BR': 'agricultor / fazendeiro', vi: 'nông dân', id: 'petani', tr: 'çiftçi', pl: 'rolnik', pos: 'nouns' },
    { en: 'irrigation', ru: 'Ирригационный', uk: 'Зрошувальний', es: 'de riego', 'pt-BR': 'de irrigação', vi: 'tưới tiêu', id: 'irigasi', tr: 'sulama', pl: 'nawadniający / irygacyjny', pos: 'adjectives' },
    { en: 'system', ru: 'Система', uk: 'Система', es: 'sistema', 'pt-BR': 'sistema', vi: 'hệ thống', id: 'sistem', tr: 'sistem', pl: 'system', pos: 'nouns' },
    { en: 'customer', ru: 'Клиент', uk: 'Клієнт', es: 'cliente', 'pt-BR': 'cliente', vi: 'khách hàng', id: 'pelanggan', tr: 'müşteri', pl: 'klient', pos: 'nouns' },
    { en: 'immediate', ru: 'Немедленный', uk: 'Негайний', es: 'inmediato', 'pt-BR': 'imediato', vi: 'ngay lập tức', id: 'segera / langsung', tr: 'acil / hemen', pl: 'natychmiastowy', pos: 'adjectives' },
    { en: 'woolen', ru: 'Шерстяной', uk: 'Вовняний', es: 'de lana', 'pt-BR': 'de lã', vi: 'bằng len', id: 'wol / berbahan wol', tr: 'yünlü', pl: 'wełniany', pos: 'adjectives' },
    { en: 'gold', ru: 'Золотой', uk: 'Золотий', es: 'de oro', 'pt-BR': 'de ouro / dourado', vi: 'bằng vàng / màu vàng', id: 'emas / dari emas', tr: 'altın / altından', pl: 'złoty', pos: 'adjectives' },
    { en: 'coin', ru: 'Монета', uk: 'Монета', es: 'moneda', 'pt-BR': 'moeda', vi: 'đồng xu', id: 'koin', tr: 'madeni para', pl: 'moneta', pos: 'nouns' },
    { en: 'wise', ru: 'Мудрый', uk: 'Мудрий', es: 'sabio', 'pt-BR': 'sábio', vi: 'khôn ngoan', id: 'bijak', tr: 'bilge', pl: 'mądry', pos: 'adjectives' },
    { en: 'mentor', ru: 'Наставник', uk: 'Наставник', es: 'mentor', 'pt-BR': 'mentor', vi: 'người cố vấn', id: 'mentor / pembimbing', tr: 'mentor / rehber', pl: 'mentor / opiekun', pos: 'nouns' },
    { en: 'talented', ru: 'Талантливый', uk: 'Талановитий', es: 'talentoso', 'pt-BR': 'talentoso', vi: 'tài năng', id: 'berbakat', tr: 'yetenekli', pl: 'utalentowany', pos: 'adjectives' },
    { en: 'perform', ru: 'Исполнять', uk: 'Виконувати', es: 'interpretar', 'pt-BR': 'apresentar / executar', vi: 'biểu diễn / thực hiện', id: 'menampilkan / melakukan', tr: 'icra etmek / gerçekleştirmek', pl: 'wykonywać / występować', pos: 'verbs' },
    { en: 'burn', ru: 'Жечь / обжигать', uk: 'Пекти / обпікати', es: 'quemar', 'pt-BR': 'queimar', vi: 'đốt / làm bỏng', id: 'membakar / terbakar', tr: 'yakmak / yanmak', pl: 'palić / parzyć', pos: 'verbs' },
    { en: 'local', ru: 'Местный', uk: 'Місцевий', es: 'local', 'pt-BR': 'local', vi: 'địa phương', id: 'lokal / setempat', tr: 'yerel', pl: 'lokalny / miejscowy', pos: 'adjectives' },
    { en: 'interview', ru: 'Брать интервью', uk: 'Брати інтерв\'ю', es: 'entrevistar', 'pt-BR': 'entrevistar', vi: 'phỏng vấn', id: 'mewawancarai', tr: 'röportaj yapmak / görüşme yapmak', pl: 'przeprowadzać wywiad', pos: 'verbs' },
    { en: 'knee', ru: 'Колено', uk: 'Коліно', es: 'rodilla', 'pt-BR': 'joelho', vi: 'đầu gối', id: 'lutut', tr: 'diz', pl: 'kolano', pos: 'nouns' },
    { en: 'engineer', ru: 'Инженер', uk: 'Інженер', es: 'ingeniero', 'pt-BR': 'engenheiro', vi: 'kỹ sư', id: 'insinyur', tr: 'mühendis', pl: 'inżynier', pos: 'nouns' },
    { en: 'test', ru: 'Тестировать', uk: 'Тестувати', es: 'probar', 'pt-BR': 'testar', vi: 'kiểm tra / thử nghiệm', id: 'menguji', tr: 'test etmek / denemek', pl: 'testować / sprawdzać', pos: 'verbs' },
    { en: 'solar', ru: 'Солнечный', uk: 'Сонячний', es: 'solar', 'pt-BR': 'solar', vi: 'mặt trời', id: 'surya / solar', tr: 'güneş', pl: 'słoneczny', pos: 'adjectives' },
    { en: 'reach', ru: 'Достигать', uk: 'Досягати', es: 'alcanzar', 'pt-BR': 'alcançar', vi: 'đạt tới / với tới', id: 'mencapai', tr: 'ulaşmak', pl: 'osiągać / sięgać', pos: 'verbs' },
    { en: 'eyes', ru: 'Глаза', uk: 'Очі', es: 'ojos', 'pt-BR': 'olhos', vi: 'đôi mắt', id: 'mata', tr: 'gözler', pl: 'oczy', pos: 'nouns' },
    { en: 'tall', ru: 'Высокий (о росте)', uk: 'Високий (про зріст)', es: 'alto', 'pt-BR': 'alto', vi: 'cao', id: 'tinggi', tr: 'uzun', pl: 'wysoki', pos: 'adjectives' },
    { en: 'crowded', ru: 'Многолюдный', uk: 'Людний', es: 'concurrido', 'pt-BR': 'lotado / cheio de gente', vi: 'đông đúc', id: 'ramai / penuh sesak', tr: 'kalabalık', pl: 'zatłoczony', pos: 'adjectives' },
    { en: 'brave', ru: 'Смелый', uk: 'Хоробрий', es: 'valiente', 'pt-BR': 'corajoso', vi: 'dũng cảm', id: 'berani', tr: 'cesur', pl: 'odważny', pos: 'adjectives' },
    { en: 'panicked', ru: 'Охваченный паникой', uk: 'Охоплений панікою', es: 'en pánico', 'pt-BR': 'em pânico', vi: 'hoảng loạn', id: 'panik', tr: 'paniklemiş', pl: 'spanikowany', pos: 'adjectives' },
    { en: 'family', ru: 'Семья', uk: 'Родина', es: 'familia', 'pt-BR': 'família', vi: 'gia đình', id: 'keluarga', tr: 'aile', pl: 'rodzina', pos: 'nouns' },
    { en: 'follow', ru: 'Следовать / идти за', uk: 'Слідувати / іти за', es: 'seguir', 'pt-BR': 'seguir', vi: 'theo / đi theo', id: 'mengikuti', tr: 'takip etmek', pl: 'podążać za / śledzić', pos: 'verbs' },
    { en: 'couple', ru: 'Пара', uk: 'Пара', es: 'pareja', 'pt-BR': 'casal / par', vi: 'cặp đôi / vài', id: 'pasangan / beberapa', tr: 'çift / birkaç', pl: 'para / kilka', pos: 'nouns' },
    { en: 'candidate', ru: 'Кандидат', uk: 'Кандидат', es: 'candidato', 'pt-BR': 'candidato', vi: 'ứng viên', id: 'kandidat', tr: 'aday', pl: 'kandydat', pos: 'nouns' },
    { en: 'artist', ru: 'Художник', uk: 'Художник', es: 'artista', 'pt-BR': 'artista', vi: 'nghệ sĩ', id: 'seniman', tr: 'sanatçı', pl: 'artysta', pos: 'nouns' },
    { en: 'massive', ru: 'Огромный / массивный', uk: 'Величезний / масивний', es: 'masivo', 'pt-BR': 'enorme / maciço', vi: 'khổng lồ / đồ sộ', id: 'besar sekali / masif', tr: 'devasa / masif', pl: 'ogromny / masywny', pos: 'adjectives' },
    { en: 'push', ru: 'Толкать', uk: 'Штовхати', es: 'empujar', 'pt-BR': 'empurrar', vi: 'đẩy', id: 'mendorong', tr: 'itmek', pl: 'pchać', pos: 'verbs' },
    { en: 'list', ru: 'Список', uk: 'Список', es: 'lista', 'pt-BR': 'lista', vi: 'danh sách', id: 'daftar', tr: 'liste', pl: 'lista', pos: 'nouns' },
    { en: 'nurse', ru: 'Медсестра', uk: 'Медсестра', es: 'enfermera', 'pt-BR': 'enfermeira / enfermeiro', vi: 'y tá', id: 'perawat', tr: 'hemşire', pl: 'pielęgniarka / pielęgniarz', pos: 'nouns' },
    { en: 'bitter', ru: 'Горький', uk: 'Гіркий', es: 'amargo', 'pt-BR': 'amargo', vi: 'đắng', id: 'pahit', tr: 'acı', pl: 'gorzki', pos: 'adjectives' },
    { en: 'drop', ru: 'Ронять', uk: 'Кидати / ронити', es: 'dejar caer', 'pt-BR': 'deixar cair / derrubar', vi: 'làm rơi / thả', id: 'menjatuhkan', tr: 'düşürmek / bırakmak', pl: 'upuszczać / rzucać', pos: 'verbs' },
    { en: 'metal', ru: 'Металлический', uk: 'Металевий', es: 'metálico', 'pt-BR': 'metálico / de metal', vi: 'kim loại', id: 'logam / dari logam', tr: 'metal / metalden', pl: 'metalowy', pos: 'adjectives' },
    { en: 'storm', ru: 'Ливень / шторм', uk: 'Злива / шторм', es: 'tormenta', 'pt-BR': 'tempestade', vi: 'cơn bão', id: 'badai', tr: 'fırtına', pl: 'burza / sztorm', pos: 'nouns' },
    { en: 'wild', ru: 'Дикий', uk: 'Дикий', es: 'salvaje', 'pt-BR': 'selvagem', vi: 'hoang dã', id: 'liar', tr: 'vahşi', pl: 'dziki', pos: 'adjectives' },
    { en: 'horse', ru: 'Лошадь', uk: 'Кінь', es: 'caballo', 'pt-BR': 'cavalo', vi: 'con ngựa', id: 'kuda', tr: 'at', pl: 'koń', pos: 'nouns' },
    { en: 'jump', ru: 'Прыгать', uk: 'Стрибати', es: 'saltar', 'pt-BR': 'pular / saltar', vi: 'nhảy', id: 'melompat', tr: 'zıplamak / atlamak', pl: 'skakać', pos: 'verbs' },
    { en: 'high', ru: 'Высокий (по высоте)', uk: 'Високий (за висотою)', es: 'alto', 'pt-BR': 'alto', vi: 'cao', id: 'tinggi', tr: 'yüksek', pl: 'wysoki', pos: 'adjectives' },
    { en: 'judge', ru: 'Судья', uk: 'Суддя', es: 'juez', 'pt-BR': 'juiz', vi: 'thẩm phán', id: 'hakim', tr: 'hakim / yargıç', pl: 'sędzia', pos: 'nouns' },
    { en: 'announce', ru: 'Объявлять', uk: 'Оголошувати', es: 'anunciar', 'pt-BR': 'anunciar', vi: 'thông báo', id: 'mengumumkan', tr: 'duyurmak / ilan etmek', pl: 'ogłaszać', pos: 'verbs' },
    { en: 'surprising', ru: 'Удивительный', uk: 'Дивовижний', es: 'sorprendente', 'pt-BR': 'surpreendente', vi: 'đáng ngạc nhiên', id: 'mengejutkan', tr: 'şaşırtıcı', pl: 'zaskakujący', pos: 'adjectives' },
    { en: 'whole', ru: 'Весь / целый', uk: 'Весь / цілий', es: 'entero', 'pt-BR': 'inteiro / todo', vi: 'toàn bộ', id: 'seluruh / utuh', tr: 'bütün / tüm', pl: 'cały', pos: 'adjectives' },
    { en: 'helpful', ru: 'Полезный / готовый помочь', uk: 'Корисний / готовий допомогти', es: 'útil', 'pt-BR': 'útil / prestativo', vi: 'hữu ích / hay giúp đỡ', id: 'membantu / berguna', tr: 'yardımsever / faydalı', pl: 'pomocny / użyteczny', pos: 'adjectives' },
    { en: 'tourist', ru: 'Турист', uk: 'Турист', es: 'turista', 'pt-BR': 'turista', vi: 'du khách', id: 'turis / wisatawan', tr: 'turist', pl: 'turysta', pos: 'nouns' },
    { en: 'firm', ru: 'Строгий / твёрдый', uk: 'Суворий / твердий', es: 'firme', 'pt-BR': 'firme / rígido', vi: 'vững chắc / nghiêm khắc', id: 'tegas / kuat', tr: 'sıkı / sağlam', pl: 'stanowczy / twardy', pos: 'adjectives' },
    { en: 'employee', ru: 'Сотрудник', uk: 'Працівник / співробітник', es: 'empleado', 'pt-BR': 'funcionário / empregado', vi: 'nhân viên', id: 'karyawan / pegawai', tr: 'çalışan / personel', pl: 'pracownik', pos: 'nouns' },
    { en: 'boring', ru: 'Скучный', uk: 'Нудний', es: 'aburrido', 'pt-BR': 'chato / entediante', vi: 'nhàm chán', id: 'membosankan', tr: 'sıkıcı', pl: 'nudny', pos: 'adjectives' },
    { en: 'skilled', ru: 'Опытный / умелый', uk: 'Досвідчений / вмілий', es: 'hábil', 'pt-BR': 'habilidoso / qualificado', vi: 'có kỹ năng / lành nghề', id: 'terampil / ahli', tr: 'becerikli / nitelikli', pl: 'wykwalifikowany / zręczny', pos: 'adjectives' },
    { en: 'let', ru: 'Позволил(а) / позволять', uk: 'Дозволив / дозволила; дозволяти', es: 'dejó / permitir', 'pt-BR': 'deixou / permitir', vi: 'đã cho phép / cho phép', id: 'membiarkan / mengizinkan', tr: 'izin verdi / izin vermek', pl: 'pozwolił / pozwalać', pos: 'verbs' },
  ],
  32: [
    { en: 'be used to', ru: 'Быть привыкшим к', uk: 'Бути звиклим до', es: 'estar acostumbrado a', 'pt-BR': 'estar acostumado a', vi: 'quen với', id: 'terbiasa dengan', tr: 'alışkın olmak', pl: 'być przyzwyczajonym do', pos: 'verbs' },
    { en: 'working', ru: 'Работать (в процессе)', uk: 'Працювати (у процесі)', es: 'trabajando', pos: 'verbs' },
    { en: 'studying', ru: 'Учиться', uk: 'Вчитися', es: 'estudiando', pos: 'verbs' },
    { en: 'driving', ru: 'Водить (машину)', uk: 'Керувати (автомобілем)', es: 'conduciendo', pos: 'verbs' },
    { en: 'living', ru: 'Жить', uk: 'Жити', es: 'viviendo', 'pt-BR': 'morando / vivendo', vi: 'đang sống', id: 'sedang tinggal / hidup', tr: 'yaşamak / yaşıyor olmak', pl: 'mieszkanie / życie', pos: 'verbs' },
    { en: 'waking up', ru: 'Просыпаться', uk: 'Прокидатися', es: 'levantarse', 'pt-BR': 'acordar', vi: 'thức dậy', id: 'bangun', tr: 'uyanmak', pl: 'budzenie się', pos: 'verbs' },
    { en: 'person', ru: 'Человек', uk: 'Людина', es: 'persona', 'pt-BR': 'pessoa', vi: 'người', id: 'orang', tr: 'kişi', pl: 'osoba', pos: 'nouns' },
    { en: 'bag', ru: 'Сумка', uk: 'Сумка', es: 'bolso', pos: 'nouns' },
    { en: 'app', ru: 'Приложение', uk: 'Додаток', es: 'aplicación', pos: 'nouns' },
    { en: 'place', ru: 'Место', uk: 'Місце', es: 'lugar', pos: 'nouns' },
    { en: 'message', ru: 'Сообщение', uk: 'Повідомлення', es: 'mensaje', pos: 'nouns' },
    { en: 'keys', ru: 'Ключи', uk: 'Ключі', es: 'llaves', pos: 'nouns' },
    { en: 'teacher', ru: 'Учитель', uk: 'Вчитель', es: 'profesor', 'pt-BR': 'professor / professora', vi: 'giáo viên', id: 'guru', tr: 'öğretmen', pl: 'nauczyciel / nauczycielka', pos: 'nouns' },
    { en: 'lesson', ru: 'Урок', uk: 'Урок', es: 'lección', pos: 'nouns' },
    { en: 'documents', ru: 'Документы', uk: 'Документи', es: 'documentos', pos: 'nouns' },
    { en: 'tickets', ru: 'Билеты', uk: 'Квитки', es: 'entradas', pos: 'nouns' },
    { en: 'problem', ru: 'Проблема', uk: 'Проблема', es: 'problema', pos: 'nouns' },
    { en: 'room', ru: 'Комната', uk: 'Кімната', es: 'habitación', pos: 'nouns' },
    { en: 'phone', ru: 'Телефон', uk: 'Телефон', es: 'teléfono', pos: 'nouns' },
    { en: 'evening', ru: 'Вечер', uk: 'Вечір', es: 'noche', pos: 'nouns' },
    { en: 'vibrate', ru: 'Вибрировать', uk: 'Вібрувати', es: 'vibrar', 'pt-BR': 'vibrar', vi: 'rung', id: 'bergetar', tr: 'titremek', pl: 'wibrować', pos: 'verbs' },
    { en: 'would rather', ru: 'Предпочёл бы', uk: 'Волів би', es: 'preferiría', 'pt-BR': 'preferiria', vi: 'thà ... hơn', id: 'lebih suka', tr: 'tercih ederdi / etmeyi tercih etmek', pl: 'wolałby / woleć', pos: 'verbs' },
    { en: 'without', ru: 'Без', uk: 'Без', es: 'sin', pos: 'adverbs' },
    { en: 'earlier', ru: 'Раньше', uk: 'Раніше', es: 'antes', 'pt-BR': 'mais cedo / antes', vi: 'sớm hơn / trước đó', id: 'lebih awal / sebelumnya', tr: 'daha önce / daha erken', pl: 'wcześniej', pos: 'adverbs' },
    { en: 'later', ru: 'Позже', uk: 'Пізніше', es: 'más tarde', pos: 'adverbs' },
    { en: 'better', ru: 'Лучше', uk: 'Краще', es: 'mejor', pos: 'adverbs' },
    { en: 'since', ru: 'С (момента)', uk: 'З (часу)', es: 'desde', 'pt-BR': 'desde', vi: 'từ khi / kể từ', id: 'sejak', tr: '-den beri', pl: 'od / odkąd', pos: 'adverbs' },
    { en: 'outside', ru: 'Снаружи', uk: 'На вулиці', es: 'afuera', pos: 'adverbs' },
    { en: 'quickly', ru: 'Быстро', uk: 'Швидко', es: 'rápidamente', pos: 'adverbs' },
    { en: 'okay', ru: 'В порядке', uk: 'Гаразд', es: 'bien', pos: 'adverbs' },
    { en: 'today', ru: 'Сегодня', uk: 'Сьогодні', es: 'hoy', pos: 'adverbs' },
    { en: 'known', ru: 'Известный / знал(а)', uk: 'Відомий / знав(ла)', es: 'conocido', 'pt-BR': 'conhecido / soube', vi: 'được biết / đã biết', id: 'dikenal / diketahui', tr: 'bilinen / biliyordu', pl: 'znany / wiedział', pos: 'verbs' },
  ],
};

/** Лексикон всех поверхностных форм глаголов (verbs + irregular_verbs) для BFS-лемматизации словаря. */
function collectVerbSurfaceLexicon(raw: Record<number, Word[]>): Set<string> {
  const s = new Set<string>();
  for (const id of Object.keys(raw).map(Number)) {
    for (const w of raw[id] ?? []) {
      if (w.pos === 'verbs' || w.pos === 'irregular_verbs') {
        s.add(w.en.trim().toLowerCase());
      }
    }
  }
  return s;
}

function morphNeighborsForVerbLemma(lower: string, lex: Set<string>): string[] {
  const out = new Set<string>();
  const add = (x: string) => {
    if (x.length >= 2) out.add(x);
  };
  if (lower.endsWith('ies') && lower.length >= 4) add(lower.slice(0, -3) + 'y');
  if (/(ches|shes|xes|zes|oes|ses)$/.test(lower) && lower.length >= 4) add(lower.slice(0, -2));
  else if (lower.endsWith('es') && lower.length >= 4) add(lower.slice(0, -2));
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length >= 3) {
    const a = lower.slice(0, -1);
    if (lex.has(a)) add(a);
  }
  if (lower.endsWith('ing') && lower.length > 4) {
    const b = lower.slice(0, -3);
    add(b);
    add(b + 'e');
    if (b.length >= 2 && b[b.length - 1] === b[b.length - 2]) add(b.slice(0, -1));
  }
  if (lower.endsWith('ied')) add(lower.slice(0, -3) + 'y');
  else if (lower.endsWith('ed') && lower.length > 3) {
    add(lower.slice(0, -2));
    const st = lower.slice(0, -2);
    if (st.length >= 2) add(st + 'e');
  }
  return [...out];
}

function regularVerbSurfaceLemma(lower: string): string {
  if (!lower || lower.includes(' ')) return lower;
  if (lower.endsWith('ies') && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (/(ches|shes|xes|zes|oes|ses)$/.test(lower) && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1);
  if (lower.endsWith('ying') && lower.length > 5) return lower.slice(0, -4) + 'ie';
  if (lower.endsWith('ing') && lower.length > 5) {
    const stem = lower.slice(0, -3);
    if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) return stem.slice(0, -1);
    if (/(iv|ov|av|us|ak|it|at|iz)$/.test(stem)) return stem + 'e';
    return stem;
  }
  if (lower.endsWith('ied') && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('ed') && lower.length > 4) {
    const noD = lower.slice(0, -1);
    const noEd = lower.slice(0, -2);
    if (noD.endsWith('e') && !/(ch|sh|ss|x|z)$/.test(noEd)) return noD;
    if (noEd.length >= 2 && noEd[noEd.length - 1] === noEd[noEd.length - 2]) return noEd.slice(0, -1);
    return noEd;
  }
  return lower;
}

/** Инфинитив / словарная форма для строк из уроков (только pos `verbs`). */
function canonicalLemmaVerb(lower: string, lex: Set<string>): string {
  const regularLemma = regularVerbSurfaceLemma(lower);
  const q = [lower];
  const seen = new Set<string>();
  const hits: string[] = [];
  while (q.length) {
    const cur = q.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    if (lex.has(cur)) hits.push(cur);
    for (const nb of morphNeighborsForVerbLemma(cur, lex)) {
      if (!seen.has(nb)) q.push(nb);
    }
  }
  if (!hits.length) return regularLemma;
  const minLen = Math.min(...hits.map((h) => h.length));
  let cand = hits.filter((h) => h.length === minLen);
  if (cand.length > 1 && cand.includes(lower)) {
    const others = cand.filter((h) => h !== lower);
    if (others.length) cand = others;
  }
  cand.sort((a, b) => a.localeCompare(b));
  const best = cand[0]!;
  return best === lower && regularLemma !== lower ? regularLemma : best;
}

const NOUN_PLURAL_SURFACE_EXCEPTIONS = new Set([
  'belongings',
  'boots',
  'children',
  'clothes',
  'contents',
  'genius',
  'glasses',
  'goods',
  'graphics',
  'groceries',
  'halves',
  'headphones',
  'knives',
  'leaves',
  'metropolis',
  'mice',
  'news',
  'overalls',
  'people',
  'scissors',
  'series',
  'shoes',
  'shelves',
  'sneakers',
  'species',
  'stairs',
  'sunglasses',
  'thesis',
  'thieves',
  'things',
]);

const NOUN_LEMMA_GLOSS_OVERRIDES: Record<string, Pick<Word, 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl'>> = {
  book: { ru: 'Книга', uk: 'Книжка', es: 'libro', 'pt-BR': 'livro', vi: 'sách', id: 'buku', tr: 'kitap', pl: 'książka' },
  cookie: { ru: 'Печенье', uk: 'Печиво', es: 'galleta', 'pt-BR': 'biscoito / bolacha', vi: 'bánh quy', id: 'kue kering / biskuit', tr: 'kurabiye', pl: 'ciastko' },
  eye: { ru: 'Глаз', uk: 'Око', es: 'ojo', 'pt-BR': 'olho', vi: 'mắt', id: 'mata', tr: 'göz', pl: 'oko' },
  fact: { ru: 'Факт', uk: 'Факт', es: 'hecho', 'pt-BR': 'fato', vi: 'sự thật', id: 'fakta', tr: 'gerçek / olgu', pl: 'fakt' },
  material: { ru: 'Материал', uk: 'Матеріал', es: 'material', 'pt-BR': 'material', vi: 'tài liệu / vật liệu', id: 'bahan / materi', tr: 'malzeme / materyal', pl: 'materiał' },
  name: { ru: 'Имя', uk: "Ім\'я", es: 'nombre', 'pt-BR': 'nome', vi: 'tên', id: 'nama', tr: 'isim / ad', pl: 'imię / nazwa' },
  paper: { ru: 'Бумага', uk: 'Папір', es: 'papel', 'pt-BR': 'papel', vi: 'giấy / bài báo', id: 'kertas / makalah', tr: 'kağıt / makale', pl: 'papier / praca' },
  thing: { ru: 'Вещь', uk: 'Річ', es: 'cosa', 'pt-BR': 'coisa', vi: 'thứ / đồ vật', id: 'benda / hal', tr: 'şey', pl: 'rzecz' },
  word: { ru: 'Слово', uk: 'Слово', es: 'palabra', 'pt-BR': 'palavra', vi: 'từ', id: 'kata', tr: 'kelime', pl: 'słowo' },
};

const IRREGULAR_SURFACE_TO_BASE: Record<string, string> = {
  went: 'go',
  gone: 'go',
  left: 'leave',
  brought: 'bring',
  got: 'get',
  gotten: 'get',
  chose: 'choose',
  chosen: 'choose',
  wrote: 'write',
  written: 'write',
  saw: 'see',
  seen: 'see',
  said: 'say',
  gave: 'give',
  given: 'give',
  woke: 'wake',
  woken: 'wake',
  sat: 'sit',
  slept: 'sleep',
  ran: 'run',
  did: 'do',
  done: 'do',
  forgot: 'forget',
  forgotten: 'forget',
};

const DICTIONARY_VERB_SURFACE_FORMS = new Set([
  'charged',
  'learning',
  'mailed',
  'packed',
  'turned',
]);

function canonicalLemmaNoun(lower: string): string {
  if (NOUN_PLURAL_SURFACE_EXCEPTIONS.has(lower)) return lower;
  if (/[^aeiou]ies$/.test(lower) && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('ves') && lower.length > 4) return lower.slice(0, -3) + 'f';
  if (/(ches|shes|xes|zes|sses)$/.test(lower) && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('oes') && lower.length > 4) return lower.slice(0, -1);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1);
  return lower;
}

function canonicalDictionaryEnglish(w: Word, verbLex: Set<string>): string {
  const lower = w.en.trim().toLowerCase();
  if (w.pos === 'verbs' && DICTIONARY_VERB_SURFACE_FORMS.has(lower)) return lower;
  if (w.pos === 'verbs') return canonicalLemmaVerb(lower, verbLex);
  if (w.pos === 'nouns') return canonicalLemmaNoun(lower);
  return lower;
}

function bankDictionaryKey(w: Word, verbLex: Set<string>): string {
  return canonicalDictionaryEnglish(w, verbLex);
}

function mergeSurfaceToLemma(w: Word, lemma: string, singularNounGlosses?: Map<string, Word>): Word {
  const lem = lemma.trim().toLowerCase();
  if (w.en.trim().toLowerCase() === lem) return w;
  const esFromMap = LESSON_WORD_ES_BY_EN[lem]?.trim();
  const nounOverride = w.pos === 'nouns' ? NOUN_LEMMA_GLOSS_OVERRIDES[lem] : undefined;
  const singularNoun = w.pos === 'nouns' ? singularNounGlosses?.get(lem) : undefined;
  return {
    ...w,
    en: lem,
    ru: nounOverride?.ru ?? singularNoun?.ru ?? w.ru,
    uk: nounOverride?.uk ?? singularNoun?.uk ?? w.uk,
    es: nounOverride?.es ?? singularNoun?.es ?? esFromMap ?? w.es,
    'pt-BR': nounOverride?.['pt-BR'] ?? singularNoun?.['pt-BR'] ?? w['pt-BR'],
    vi: nounOverride?.vi ?? singularNoun?.vi ?? w.vi,
    id: nounOverride?.id ?? singularNoun?.id ?? w.id,
    tr: nounOverride?.tr ?? singularNoun?.tr ?? w.tr,
    pl: nounOverride?.pl ?? singularNoun?.pl ?? w.pl,
  };
}

function coverageTokenCandidates(token: string, verbLex: Set<string>): string[] {
  const lower = token.trim().toLowerCase();
  if (!lower) return [];
  const candidates = new Set<string>([lower, canonicalLemmaNoun(lower), canonicalLemmaVerb(lower, verbLex)]);
  const irregularBase = IRREGULAR_SURFACE_TO_BASE[lower];
  if (irregularBase) candidates.add(irregularBase);

  if (/[^aeiou]ies$/.test(lower) && lower.length > 4) candidates.add(lower.slice(0, -3) + 'y');
  if (lower.endsWith('es') && lower.length > 4) {
    candidates.add(lower.slice(0, -2));
    candidates.add(lower.slice(0, -1));
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) candidates.add(lower.slice(0, -1));
  if (lower.endsWith('ied') && lower.length > 4) candidates.add(lower.slice(0, -3) + 'y');
  if (lower.endsWith('ed') && lower.length > 4) {
    candidates.add(lower.slice(0, -2));
    candidates.add(lower.slice(0, -1));
    if (lower.length > 5 && lower.at(-3) === lower.at(-4)) candidates.add(lower.slice(0, -3));
  }
  if (lower.endsWith('ing') && lower.length > 4) {
    candidates.add(lower.slice(0, -3));
    candidates.add(lower.slice(0, -3) + 'e');
    if (lower.length > 6 && lower.at(-4) === lower.at(-5)) candidates.add(lower.slice(0, -4));
  }
  if (lower.endsWith('ier') && lower.length > 4) candidates.add(lower.slice(0, -3) + 'y');
  if (lower.endsWith('iest') && lower.length > 5) candidates.add(lower.slice(0, -4) + 'y');
  if (lower.endsWith('er') && lower.length > 4) candidates.add(lower.slice(0, -2));
  if (lower.endsWith('est') && lower.length > 5) candidates.add(lower.slice(0, -3));

  return [...candidates];
}

function buildGlobalGlossIndex(
  raw: Record<number, Word[]>,
  verbLex: Set<string>,
  singularNounGlosses: Map<string, Word>,
): Map<string, Word> {
  const index = new Map<string, Word>();
  for (const lid of Object.keys(raw).map(Number).sort((a, b) => a - b)) {
    for (const w of raw[lid] ?? []) {
      if (w.pos === 'irregular_verbs') continue;
      const key = bankDictionaryKey(w, verbLex);
      if (index.has(key)) continue;
      const row = w.pos === 'verbs' || w.pos === 'nouns'
        ? mergeSurfaceToLemma(w, canonicalDictionaryEnglish(w, verbLex), singularNounGlosses)
        : w;
      index.set(key, row);
      const compactKey = phraseTextForCoverage(w.en).replace(/\s+/g, '');
      if (compactKey && !compactKey.includes(' ') && !index.has(compactKey)) index.set(compactKey, row);
    }
  }
  return index;
}

function knownSupplementalWordsForLesson(
  lessonId: number,
  globalGlosses: Map<string, Word>,
  verbLex: Set<string>,
): Word[] {
  const phrases = LESSON_DATA[lessonId]?.phrases ?? [];
  const found = new Map<string, Word>();

  for (const phrase of phrases) {
    const text = phraseTextForCoverage(phrase.english);
    if (!text) continue;
    const padded = ` ${text} `;

    for (const [key, row] of globalGlosses) {
      if (key.includes(' ') && padded.includes(` ${key} `)) found.set(key, row);
    }

    for (const token of text.split(' ')) {
      for (const candidate of coverageTokenCandidates(token, verbLex)) {
        const row = globalGlosses.get(candidate);
        if (row) {
          found.set(row.en.toLowerCase(), row);
          break;
        }
      }
    }
  }

  return [...found.values()];
}

/**
 * Слова урока для словаря/тренажёра: лемма EN для `verbs`, без повторов леммы внутри урока
 * и без повторов между уроками (первое вхождение по номеру урока сохраняется).
 * `irregular_verbs` живут в отдельном источнике для экрана неправильных глаголов; здесь они только поддержаны
 * на уровне типа для старых сохранений/тестов.
 */
function buildWordsByLessonForBank(raw: Record<number, Word[]>): Record<number, Word[]> {
  const verbLex = collectVerbSurfaceLexicon(raw);
  const lessonIds = Object.keys(raw).map(Number).sort((a, b) => a - b);
  const singularNounGlosses = new Map<string, Word>();
  for (const lid of lessonIds) {
    for (const w of raw[lid] ?? []) {
      if (w.pos !== 'nouns') continue;
      const en = w.en.trim().toLowerCase();
      if (canonicalLemmaNoun(en) === en && !singularNounGlosses.has(en)) {
        singularNounGlosses.set(en, w);
      }
    }
  }
  const globalGlosses = buildGlobalGlossIndex(raw, verbLex, singularNounGlosses);
  const out: Record<number, Word[]> = {};
  const seenAcrossLessons = new Set<string>();
  for (const lid of lessonIds) {
    const arr = [
      ...(raw[lid] ?? []),
      ...supplementalWordsForLesson(lid),
      ...knownSupplementalWordsForLesson(lid, globalGlosses, verbLex),
    ];
    const rowOut: Word[] = [];
    const seenInLesson = new Set<string>();
    for (let i = 0; i < arr.length; i++) {
      const w = arr[i]!;
      const row = w.pos === 'verbs' || w.pos === 'nouns'
        ? mergeSurfaceToLemma(w, canonicalDictionaryEnglish(w, verbLex), singularNounGlosses)
        : w;
      if (!isDictionaryWordAllowed(row)) continue;
      const k = row.en.trim().toLowerCase();
      if (seenInLesson.has(k)) continue;
      seenInLesson.add(k);
      if (seenAcrossLessons.has(k)) continue;
      seenAcrossLessons.add(k);
      rowOut.push(row);
    }
    out[lid] = rowOut;
  }
  return out;
}

const AUXILIARY_DICTIONARY_BLOCKLIST = new Set([
  'am',
  'is',
  'are',
  'was',
  'were',
  'been',
  'being',
  'does',
  'did',
  'has',
  'had',
  'not',
  'can',
  'could',
  'may',
  'might',
  'must',
  'shall',
  'should',
  'will',
  'would',
  'past simple',
  'how much',
  'last week',
  'last month',
  'this morning',
  'am',
  'pm',
]);

function isDictionaryWordAllowed(word: Word): boolean {
  const en = word.en.trim().toLowerCase();
  if (!en) return false;
  if (word.pos === 'irregular_verbs') return false;
  if (word.pos === 'phrases' || word.pos === 'articles' || word.pos === 'prepositions' || word.pos === 'conjunctions') return false;
  if (AUXILIARY_DICTIONARY_BLOCKLIST.has(en)) return false;
  return true;
}

const WORDS_BY_LESSON_FOR_BANK = buildWordsByLessonForBank(WORDS_BY_LESSON);

/**
 * Слова урока для словаря и тренажёра: без `irregular_verbs` (отдельный экран «Неправильные глаголы»)
 * и без дублей he/she/it (…s / …es), если в том же уроке уже есть соответствующая лемма.
 */
export function lessonWordBank(lessonId: number): Word[] {
  const raw = WORDS_BY_LESSON_FOR_BANK[lessonId] ?? WORDS_BY_LESSON_FOR_BANK[1]!;
  const noIrreg = raw.filter((w) => w.pos !== 'irregular_verbs' && isDictionaryWordAllowed(w));
  const ens = new Set(noIrreg.map((w) => w.en.toLowerCase()));
  return noIrreg.filter((w) => {
    if (w.pos !== 'verbs') return true;
    const l = w.en.toLowerCase();
    if (l.length <= 3) return true;
    if (!l.endsWith('s')) return true;
    if (l.endsWith('ss')) return true;
    if (ens.has(l.slice(0, -1))) return false;
    if (l.endsWith('ies') && l.length >= 4) {
      const y = l.slice(0, -3) + 'y';
      if (ens.has(y)) return false;
    }
    if (l.endsWith('es') && l.length >= 4) {
      const stem = l.slice(0, -2);
      if (stem.length >= 2 && ens.has(stem)) return false;
    }
    return true;
  });
}

const groupByPOS = (words: Word[], lang: Lang) => {
  const map: Partial<Record<POS, Word[]>> = {};
  for (const w of words) {
    if (!map[w.pos]) map[w.pos] = [];
    map[w.pos]!.push(w);
  }
  return (['phrases','pronouns','verbs','articles','prepositions','conjunctions','adjectives','adverbs','nouns'] as POS[])
    .filter(k => map[k]?.length)
    .map(k => ({
      title: pickTriLang(lang, {
        ru: POS_LABELS_RU[k],
        uk: POS_LABELS_UK[k],
        es: POS_LABELS_ES[k],
        'pt-BR': POS_LABELS_PT_BR[k],
        vi: POS_LABELS_VI[k],
        id: POS_LABELS_ID[k],
        tr: POS_LABELS_TR[k],
        pl: POS_LABELS_PL[k],
      }),
      data: map[k]!,
    }));
};

// Cross-lesson pool: deduped union of all lesson words for expanding distractors
const ALL_WORDS_FLAT: Word[] = (() => {
  const seen = new Set<string>();
  const result: Word[] = [];
  for (const id of Object.keys(WORDS_BY_LESSON).map(Number)) {
    for (const w of lessonWordBank(id)) {
      if (!seen.has(w.en)) {
        seen.add(w.en);
        result.push(w);
      }
    }
  }
  return result;
})();

const LESSON_WORD_BANK_EN_SET = new Set(ALL_WORDS_FLAT.map((w) => w.en));

/**
 * Старые ключи прогресса (мн. ч.) до singularize — см. scripts/singularize_lesson_vocab.py.
 * Плюс `jewels` → `jewel`, если осталось в сохранении после правок словаря.
 */
const LEGACY_PLURAL_WORD_COUNT_MERGES: Record<string, string> = {
  friends: 'friend',
  enemies: 'enemy',
  books: 'book',
  things: 'thing',
  dishes: 'dish',
  keys: 'key',
  letters: 'letter',
  strangers: 'stranger',
  ads: 'ad',
  details: 'detail',
  masks: 'mask',
  messages: 'message',
  rules: 'rule',
  secrets: 'secret',
  tickets: 'ticket',
  vegetables: 'vegetable',
  cards: 'card',
  mistakes: 'mistake',
  taxes: 'tax',
  groceries: 'grocery bag',
  guests: 'guest',
  bookings: 'booking',
  chargers: 'charger',
  documents: 'document',
  mondays: 'Monday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  saturdays: 'Saturday',
  sundays: 'Sunday',
  thursdays: 'Thursday',
  tuesdays: 'Tuesday',
  wednesdays: 'Wednesday',
  weekends: 'weekend',
  apples: 'apple',
  cafes: 'cafe',
  cars: 'car',
  desserts: 'dessert',
  magazines: 'magazine',
  mountains: 'mountain',
  pens: 'pen',
  pharmacies: 'pharmacy',
  photos: 'photo',
  places: 'place',
  printers: 'printer',
  questions: 'question',
  stars: 'star',
  students: 'student',
  tasks: 'task',
  towels: 'towel',
  trees: 'tree',
  windows: 'window',
  days: 'day',
  hours: 'hour',
  minutes: 'minute',
  plants: 'plant',
  shelves: 'shelf',
  shoes: 'shoe',
  suitcases: 'suitcase',
  bags: 'bag',
  fruits: 'fruit',
  words: 'word',
  armchairs: 'armchair',
  boots: 'boot',
  gloves: 'glove',
  batteries: 'battery',
  papers: 'paper',
  facts: 'fact',
  terms: 'term',
  people: 'person',
  children: 'child',
  builders: 'builder',
  conditions: 'condition',
  farmers: 'farmer',
  flowers: 'flower',
  gardeners: 'gardener',
  gifts: 'gift',
  panels: 'panel',
  gates: 'gate',
  berries: 'berry',
  watches: 'watch',
  blueprints: 'blueprint',
  lamps: 'lamp',
  newspapers: 'newspaper',
  stairs: 'stair step',
  sneakers: 'sneaker',
  boxes: 'box',
  bushes: 'bush',
  clouds: 'cloud',
  forests: 'forest',
  hills: 'hill',
  parks: 'park',
  tables: 'table',
  employees: 'employee',
  crumbs: 'crumb',
  bananas: 'banana',
  blankets: 'blanket',
  buildings: 'building',
  clocks: 'clock',
  cookies: 'cookie',
  curtains: 'curtain',
  drones: 'drone',
  knives: 'knife',
  licenses: 'license',
  maps: 'map',
  mice: 'mouse',
  nuts: 'nut',
  ribbons: 'ribbon',
  rings: 'ring',
  scarves: 'scarf',
  tomatoes: 'tomato',
  tools: 'tool',
  addresses: 'address',
  bottles: 'bottle',
  clients: 'client',
  coins: 'coin',
  colleagues: 'colleague',
  deals: 'deal',
  drops: 'drop',
  folders: 'folder',
  hands: 'hand',
  jackets: 'jacket',
  leaflets: 'leaflet',
  parcels: 'parcel',
  plates: 'plate',
  problems: 'problem',
  socks: 'sock',
  snacks: 'snack',
  grapes: 'grape',
  pears: 'pear',
  jewels: 'jewel',
  materials: 'material',
  eyes: 'eye',
};

function mergeLegacyPluralLessonWordCounts(counts: Record<string, number>): { counts: Record<string, number>; dirty: boolean } {
  let dirty = false;
  const out = { ...counts };
  for (const [legacyPlural, canonical] of Object.entries(LEGACY_PLURAL_WORD_COUNT_MERGES)) {
    if (legacyPlural === canonical) continue;
    if (out[legacyPlural] == null) continue;
    if (LESSON_WORD_BANK_EN_SET.has(legacyPlural)) continue;
    if (!LESSON_WORD_BANK_EN_SET.has(canonical)) continue;
    const a = Number(out[canonical]) || 0;
    const b = Number(out[legacyPlural]) || 0;
    out[canonical] = Math.max(a, b);
    delete out[legacyPlural];
    dirty = true;
  }
  return { counts: dirty ? out : counts, dirty };
}

// 6 вариантов – правильный гарантирован, дистракторы того же POS
// Всегда берём часть из cross-lesson для разнообразия (не всегда одни и те же слова урока)
type RoundType = 'recognition' | 'context';

/** Слишком близко по смыслу к «cafe» — путают в узнавании EN. */
const CAFE_EN_DISTRACTOR_SKIP = new Set<string>(['place', 'places']);

/** issue в уроке 7 рядом с «проблема» во фразе — в шести кнопках путают с problem и answer (#error_reports). */
const ISSUE_RECOGNITION_DISTRACTOR_SKIP = new Set<string>(['answer', 'problem']);

const makeOptions = (correct: Word, all: Word[]): string[] => {
  const blockedValues = new Set<string>();
  if (correct.en === 'cafe') {
    CAFE_EN_DISTRACTOR_SKIP.forEach((value) => blockedValues.add(value));
  }
  if (correct.en === 'issue') {
    ISSUE_RECOGNITION_DISTRACTOR_SKIP.forEach((value) => blockedValues.add(value));
  }

  return buildLessonWordOptions(correct, all, ALL_WORDS_FLAT, { blockedValues });
};

const isLessonWordOptionCorrect = (option: string, correct: string): boolean =>
  option === correct || isCorrectAnswer(option, correct);

interface Card {
  word: Word;
  options: string[];
  correctOption: string;
  roundIndex: number;  // 0 | 1 | 2 — какой именно раунд
  roundType: RoundType;
  question: string;
}

interface TrainingQueueItem {
  word: Word;
  roundIndex: number;
}

function wordTranslation(word: Word, lang: Lang): string {
  return lessonWordRecognitionPrompt(word, lang);
}

function buildCard(word: Word, roundIndex: number, all: Word[], lang: Lang): Card {
  const correctOption = word.en;
  const translation = wordTranslation(word, lang);
  const options = makeOptions(word, all);
  if (roundIndex === 1 && word.context) {
    return { word, options, correctOption, roundIndex, roundType: 'context', question: word.context };
  }
  return { word, options, correctOption, roundIndex, roundType: 'recognition', question: translation };
}

function buildQueueItem(word: Word, roundIndex: number): TrainingQueueItem {
  return { word, roundIndex };
}

/** One source of truth for queue + counts (shuffle runs once). */
function makeTrainingQueueState(
  words: Word[],
  initialLearned: string[],
  initialCounts: Record<string, number>,
  lang: Lang,
): { counts: Record<string, number>; queue: TrainingQueueItem[]; learnedCnt: number } {
  void initialLearned;
  const scopedCounts = Object.fromEntries(
    words.map(w => [w.en, Math.min(Math.max(Number(initialCounts[w.en] ?? 0), 0), REQUIRED)]),
  ) as Record<string, number>;
  const dueWords = words.filter(w => scopedCounts[w.en] < REQUIRED);
  const cards = dueWords.map(w => buildQueueItem(w, scopedCounts[w.en] ?? 0));
  return {
    counts: scopedCounts,
    queue: shuffleNoConsecutive(cards),
    learnedCnt: words.filter(w => scopedCounts[w.en] >= REQUIRED).length,
  };
}

function countLearnedWords(words: Word[], counts: Record<string, number>): number {
  return words.filter(w => (counts[w.en] ?? 0) >= REQUIRED).length;
}

function clampQueueIndex(index: number, queueLength: number): number {
  if (queueLength <= 0) return 0;
  return ((index % queueLength) + queueLength) % queueLength;
}

function insertTrainingCardLater(queue: TrainingQueueItem[], currentIndex: number, card: TrainingQueueItem): { queue: TrainingQueueItem[]; index: number } {
  const nextIndex = clampQueueIndex(currentIndex, queue.length);
  const minInsert = Math.min(nextIndex + 2, queue.length);
  const maxInsert = queue.length;
  const insertAt = minInsert + Math.floor(Math.random() * Math.max(maxInsert - minInsert + 1, 1));
  const nextQueue = [...queue];
  nextQueue.splice(Math.min(insertAt, nextQueue.length), 0, card);
  return { queue: nextQueue, index: nextIndex };
}

// ── ТРЕНИРОВКА ───────────────────────────────────────────────────────────────
function Training({ words, storageKey, wordsShardGrantKey, lessonId, lang, initialLearned, initialCounts, onCountUpdate, userName: userNameProp = '', onNoEnergy, studyTarget, onAndroidBackIntercept }: { words:Word[]; storageKey:string; wordsShardGrantKey:string; lessonId: number; lang: Lang; initialLearned:string[]; initialCounts:Record<string,number>; onCountUpdate:(word:string, count:number)=>void; userName?: string; onNoEnergy: () => void; studyTarget?: RuntimeStudyTarget; onAndroidBackIntercept?: (handler: (() => boolean) | null) => void }) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const { flashKey, flash } = useWordFlash();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme:t, f, themeMode } = useTheme();
  const { s } = useLang();
  const router = useRouter();
  const ws = s.words;
  const isLightTheme = false;
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);

  const { energy: currentEnergy, isUnlimited: testerEnergyDisabled, spendOne } = useEnergy();
  const currentEnergyRef = useRef(currentEnergy);
  const testerEnergyDisabledRef = useRef(testerEnergyDisabled);
  const spendOneRef = useRef(spendOne);
  useEffect(() => { currentEnergyRef.current = currentEnergy; }, [currentEnergy]);
  useEffect(() => { testerEnergyDisabledRef.current = testerEnergyDisabled; }, [testerEnergyDisabled]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);


  const onNoEnergyRef = useRef(onNoEnergy);
  useEffect(() => { onNoEnergyRef.current = onNoEnergy; }, [onNoEnergy]);
  const [practiceRepeatConfirm, setPracticeRepeatConfirm] = useState(false);

  // Состояние прогресса слов (сколько раундов пройдено). Окно рисуется сразу; с диска подмешиваем после (см. effect).
  const initialTrainingState = useMemo(
    () => makeTrainingQueueState(words, initialLearned, initialCounts, lang),
    [words, initialLearned, initialCounts, lang],
  );
  const [counts, setCounts] = useState<Record<string, number>>(() => initialTrainingState.counts);
  const [queue, setQueue] = useState<TrainingQueueItem[]>(() => initialTrainingState.queue);
  const [qIdx,       setQIdx]       = useState(0);
  const [chosen,     setChosen]     = useState<string|null>(null);
  const [totalPts,   setTotalPts]   = useState(0);
  const [learnedCnt, setLearnedCnt] = useState(initialTrainingState.learnedCnt);
  const sessionTouchedRef = useRef(false);
  // Счётчик ошибок на слово в этой сессии (для порога тренера: 2+ ошибки → активация)
  const wordMistakeCountRef = useRef<Record<string, number>>({});
  // [FeedbackKit] Локальная серия подряд-верных ответов ТОЛЬКО для ощущений
  // (лесенка комбо/стингеры). НЕ участвует в экономике/XP — те считаются выше
  // по своим правилам. Свой счётчик, т.к. в lesson_words нет combo-формулы.
  const fkComboRef = useRef(0);
  // [FeedbackKit] Показ VictoryBurst на финал сессии — один раз (guard от
  // повторного показа при ре-рендерах, пока allDone держится true).
  const [victoryShown, setVictoryShown] = useState(false);
  const victoryFiredRef = useRef(false);
  const [userName,   setUserName]   = useState(userNameProp);
  const [hapticsOn,  setHapticsOn]  = useState(true);
  const [voiceOut,   setVoiceOut]   = useState(true);
  const [speechRate, setSpeechRate] = useState(0.9);
  const [allDone,    setAllDone]    = useState(false);
  const [coachToast, setCoachToast] = useState<CoachToastDecision | null>(null);
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [xpToastAmount, setXpToastAmount] = useState(POINTS_PER_CORRECT);
  const wrongMistakesRef = useRef<PhraseMistakeInput[]>([]);

  // зачем: системный «Назад» перехватывает родитель (LessonWords) — там обработчик активен
  // на ЛЮБОЙ вкладке, а Training монтируется только на вкладке тренировки. Свои модалки
  // Training прокидывает наверх через onAndroidBackIntercept, чтобы «Назад» закрывал их,
  // а не выкидывал с экрана.
  useEffect(() => {
    if (!onAndroidBackIntercept) return;
    onAndroidBackIntercept(() => {
      if (practiceRepeatConfirm) {
        setPracticeRepeatConfirm(false);
        return true;
      }
      if (victoryShown) {
        setVictoryShown(false);
        return true;
      }
      return false;
    });
    return () => onAndroidBackIntercept(null);
  }, [onAndroidBackIntercept, practiceRepeatConfirm, victoryShown]);

  /** Снизу вверх + фейд; исчезновение — фейд и лёгкий подъём */
  const xpTranslateY = useRef(new Animated.Value(44)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const xpToastAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const xpToastRunIdRef = useRef(0);
  const scheduledStateUpdatesRef = useRef<ScheduledAnimatedStateUpdate[]>([]);
  useEffect(() => {
    return () => {
      xpToastRunIdRef.current += 1;
      xpToastAnimRef.current?.stop();
      xpToastAnimRef.current = null;
      cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
    };
  }, []);

  const showXpToast = (amount: number = POINTS_PER_CORRECT) => {
    const safeAmount = Number.isFinite(amount) && amount >= 0
      ? Math.round(amount)
      : POINTS_PER_CORRECT;
    const runId = xpToastRunIdRef.current + 1;
    xpToastRunIdRef.current = runId;
    cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
    xpToastAnimRef.current?.stop();
    setXpToastAmount(safeAmount);
    const rise = 44;
    const easeIn = Easing.out(Easing.cubic);
    const easeOut = Easing.in(Easing.cubic);
    xpTranslateY.setValue(rise);
    xpOpacity.setValue(0);
    setXpToastVisible(true);
    const toastAnim = Animated.sequence([
      Animated.parallel([
        Animated.timing(xpTranslateY, { toValue: 0, duration: 420, easing: easeIn, useNativeDriver: true }),
        Animated.timing(xpOpacity, { toValue: 1, duration: 400, easing: easeIn, useNativeDriver: true }),
      ]),
      Animated.delay(1000),
      Animated.parallel([
        Animated.timing(xpOpacity, { toValue: 0, duration: 480, easing: easeOut, useNativeDriver: true }),
        Animated.timing(xpTranslateY, { toValue: -12, duration: 480, easing: easeOut, useNativeDriver: true }),
      ]),
    ]);
    xpToastAnimRef.current = toastAnim;
    toastAnim.start(({ finished }) => {
      if (!finished || xpToastRunIdRef.current !== runId) return;
      xpToastAnimRef.current = null;
      scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, () => {
        if (xpToastRunIdRef.current === runId) setXpToastVisible(false);
      });
    });
  };

  // Блокировка: не даём запустить обработку дважды
  const locked = useRef(false);
  const countsRef = useRef(counts);
  const queueRef = useRef(queue);
  const qIdxRef = useRef(qIdx);
  useEffect(() => { countsRef.current = counts; }, [counts]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { qIdxRef.current = qIdx; }, [qIdx]);

  const applyTrainingCounts = (nextCounts: Record<string, number>) => {
    countsRef.current = nextCounts;
    setCounts(nextCounts);
  };
  const applyTrainingQueue = (nextQueue: TrainingQueueItem[], nextIndex = 0) => {
    const sanitized = sanitizeTrainingQueue(nextQueue);
    const safeIndex = clampQueueIndex(nextIndex, sanitized.length);
    queueRef.current = sanitized;
    qIdxRef.current = safeIndex;
    setQueue(sanitized);
    setQIdx(safeIndex);
  };
  const applyLearnedCount = (nextLearnedCnt: number) => {
    setLearnedCnt(nextLearnedCnt);
  };

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      if (!userNameProp) AsyncStorage.getItem('user_name').then(n => { if(n) setUserName(n); });
      loadSettings().then(s => { setHapticsOn(s.haptics); setVoiceOut(s.voiceOut); setSpeechRate(s.speechRate); });
    });
    return () => task.cancel();
  }, [userNameProp]);

  useEffect(() => {
    if (!allDone) return;
    let cancelled = false;
    void checkCoachToastNeededWithAnalytics(wrongMistakesRef.current, studyTarget, lang === 'uk' ? 'uk' : 'ru').then((decision) => {
      if (!cancelled && decision.show) setCoachToast(decision);
    });
    return () => { cancelled = true; };
  }, [allDone, lang, studyTarget]);

  const validQueue = useMemo(() => sanitizeTrainingQueue(queue), [queue]);

  // [FeedbackKit] Мини-победа на финал сессии Training — один раз при первом
  // достижении завершения (guard victoryFiredRef; сбрасывается в startPractice).
  // Только ощущение поверх существующего экрана итога — экономику не трогает.
  const sessionFinished = allDone || (validQueue.length === 0 && learnedCnt >= words.length);
  useEffect(() => {
    if (!sessionFinished) return;
    if (victoryFiredRef.current) return;
    if (!sessionTouchedRef.current) return; // не показываем, если вошли в уже пройденный раздел без ответов
    victoryFiredRef.current = true;
    setVictoryShown(true);
  }, [sessionFinished]);

  // ── Дроп коллекционной карточки за закрытый словарь урока ─────────────────
  // зачем: владелец попросил шанс карточки не только за урок, но и за закрытие
  // словаря. Шанс/дневной кап/pity — общие с уроком, считает сервер. eventId =
  // vocab:<цель>:<урок> без дня: словарь урока закрывается один раз, второй
  // ролл за него не положен (серверный леджер идемпотентен по eventId).
  // Условие sessionTouchedRef — вход в уже пройденный раздел без ответов
  // карточку не даёт, иначе фарм повторным открытием экрана.
  const [cardDrop, setCardDrop] = useState<CollectibleDropOutcome | null>(null);
  const cardDropRolledRef = useRef(false);
  const cardDropVisible = useOverlayVisible('collectibleDrop', cardDrop != null);

  useEffect(() => {
    if (!sessionFinished) return;
    if (cardDropRolledRef.current) return;
    if (!sessionTouchedRef.current) return;
    cardDropRolledRef.current = true;
    void maybeRollCollectibleDrop('vocab', `${studyTarget}:${lessonId ?? 0}`, { dailyScoped: false })
      .then((drop) => { if (drop) setCardDrop(drop); })
      .catch(() => {});
  }, [sessionFinished, studyTarget, lessonId]);

  const currentItem: TrainingQueueItem | undefined = validQueue[qIdx % Math.max(validQueue.length, 1)];
  const current: Card | undefined = useMemo(
    () => currentItem ? buildCard(currentItem.word, currentItem.roundIndex, words, lang) : undefined,
    [currentItem, words, lang],
  );

  useEffect(() => {
    if (allDone || validQueue.length > 0 || learnedCnt >= words.length) return;
    const rebuilt = makeTrainingQueueState(words, [], countsRef.current, lang);
    applyTrainingCounts(rebuilt.counts);
    applyTrainingQueue(rebuilt.queue, 0);
    applyLearnedCount(rebuilt.learnedCnt);
  }, [allDone, validQueue.length, learnedCnt, words, lang]);

  const handleChoice = async (opt: string) => {
    if (locked.current || chosen !== null || !current) return;
    // Блокируем если энергия кончилась
    if (!testerEnergyDisabledRef.current && currentEnergyRef.current <= 0) {
      onNoEnergyRef.current();
      return;
    }
    sessionTouchedRef.current = true;
    locked.current = true;

    setChosen(opt);
    const isRight = isLessonWordOptionCorrect(opt, current.correctOption);
    const wordEn = current.word.en;
    // [FeedbackKit] Серия ДО обновления этим ответом — нужна, чтобы отличить
    // обрыв заметной серии (comboBreak) от обычной ошибки (wrong). Только для
    // ОЩУЩЕНИЙ; экономика/прогресс ниже её не читают.
    const fkStreakBefore = fkComboRef.current;
    // Результат ответа в момент выбора: успех на верном, ошибка на неверном.
    // [FeedbackKit] Ранее: hapticSuccess/hapticError + correct-звук; теперь
    // fk.correct/fk.wrong дают тот же haptic + тёплый «дин-дон»/мягкий «туп».
    if (voiceOut) speakAudio(wordEn, speechRate, { language: 'en-US' });
    if (isRight) {
      fkComboRef.current = fkStreakBefore + 1;
      fk.correct();
      fk.combo(fkComboRef.current);
    } else {
      fkComboRef.current = 0;
      if (fkStreakBefore >= 3) fk.comboBreak(fkStreakBefore);
      else fk.wrong();
    }
    if (isRight) {
      // Тост опыта — СРАЗУ после ответа, синхронно: не ждём ни задержку
      // обратной связи (setTimeout ниже), ни сетевой round-trip registerXP.
      const prevCountNow = Math.min(Math.max(Number(countsRef.current[wordEn] ?? 0), 0), REQUIRED);
      const xpNow = vocabularyStepBaseXP(prevCountNow);
      const wordJustCompletedNow = prevCountNow < REQUIRED;
      if (xpNow > 0 && wordJustCompletedNow) showXpToast(xpNow);
    }

    setTimeout(() => {
      const newQueue = sanitizeTrainingQueue(queueRef.current);
      const liveIndex = clampQueueIndex(qIdxRef.current, newQueue.length);
      if (newQueue.length === 0 || !isTrainingCard(current)) {
        const rebuilt = makeTrainingQueueState(words, [], countsRef.current, lang);
        applyTrainingCounts(rebuilt.counts);
        applyTrainingQueue(rebuilt.queue, 0);
        applyLearnedCount(rebuilt.learnedCnt);
        setAllDone(rebuilt.queue.length === 0 && rebuilt.learnedCnt >= words.length);
        setChosen(null);
        locked.current = false;
        return;
      }

      if (isRight) {
        // Читаем counts через ref чтобы избежать stale closure
        const prevCounts = countsRef.current;
        const prevCount = Math.min(Math.max(Number(prevCounts[wordEn] ?? 0), 0), REQUIRED);
        const newCount = REQUIRED;
        const newCounts = { ...prevCounts, [wordEn]: newCount };
        applyTrainingCounts(newCounts);
        onCountUpdate(wordEn, newCount);

        // Сохраняем полный объект counts напрямую — без read-modify-write (нет race condition)
        lessonWordsProgressCache.set(storageKey, newCounts);
        void AsyncStorage.setItem(storageKey, JSON.stringify(newCounts));

        // Удаляем текущую карточку из очереди
        newQueue.splice(liveIndex, 1);

        const wordJustCompleted = prevCount < REQUIRED && newCount >= REQUIRED;
        const xpThisStep = vocabularyStepBaseXP(prevCount);
        if (xpThisStep > 0) {
          setTotalPts(p => p + xpThisStep);
          void registerXP(xpThisStep, 'vocabulary_learned', userName, lang, lessonId, {
            eventId: [
              'vocabulary',
              safeVocabularyEventPart(studyTarget),
              String(lessonId),
              safeVocabularyEventPart(wordEn, 50),
              String(newCount),
            ].join(':'),
            payload: {
              lessonId,
              studyTarget,
              word: wordEn,
              previousCount: prevCount,
              newCount,
              completed: wordJustCompleted,
            },
          });
          // Тост опыта показан синхронно при выборе ответа (см. handleChoice
          // выше) — здесь его НЕ дублируем, чтобы не появлялся повторно/поздно.
        }

        if (wordJustCompleted) {
          void bumpStatsDaily('words_learned', 1, studyTarget);
          // Слово выучено — убираем все оставшиеся карточки этого слова из очереди
          const finalQ = newQueue.filter(c => isTrainingCard(c) && c.word.en !== current.word.en);
          const newLearned = countLearnedWords(words, newCounts);
          updateMultipleTaskProgress([{ type: 'words_learned' }], { studyTarget });
          if (finalQ.length === 0) {
            if (newLearned >= words.length) {
              applyLearnedCount(newLearned); applyTrainingQueue(finalQ, 0); setAllDone(true);
              setChosen(null); locked.current = false;
              // Осколок за завершение раздела слов (единоразово)
              AsyncStorage.getItem(wordsShardGrantKey).then(done => {
                if (!done) {
                  addShards('lesson_completed')
                    .then(n => {
                      if (n > 0) {
                        AsyncStorage.setItem(wordsShardGrantKey, '1').catch(() => {});
                      }
                    })
                    .catch(() => {});
                }
              }).catch(() => {});
              return;
            }
            const rebuilt = makeTrainingQueueState(words, [], newCounts, lang);
            applyLearnedCount(rebuilt.learnedCnt);
            applyTrainingCounts(rebuilt.counts);
            applyTrainingQueue(rebuilt.queue, 0);
            setChosen(null); locked.current = false;
            return;
          }
          applyLearnedCount(newLearned);
          applyTrainingQueue(finalQ, liveIndex);
        } else {
          const nextCard = buildQueueItem(current.word, newCount);
          const inserted = insertTrainingCardLater(newQueue, liveIndex, nextCard);
          applyTrainingQueue(inserted.queue, inserted.index);
        }
      } else {
        // Ошибка — логируем в аналитику и перемещаем карточку вперёд
        const mistakeMeta = {
          tokenText: current.word.en,
          expected: current.word.en,
          rawCategory: current.word.pos,
        };
        logMistake(current.word.en, lessonId, 'lesson_words', 'wrong_pick', mistakeMeta, studyTarget);
        wrongMistakesRef.current.push({ phrase: current.word.en, ...mistakeMeta });
        // Тренер: считаем ошибки; при 2-й — активируем слово в очереди
        const wKey = current.word.en;
        const prevCount = wordMistakeCountRef.current[wKey] ?? 0;
        const newCount = prevCount + 1;
        wordMistakeCountRef.current[wKey] = newCount;
        if (newCount === 2) {
          void activateWordForTrainer(wKey, current.word.ru, current.word.uk, lessonId, current.word.pos, current.word.es, studyTarget);
        } else {
          void recordWordMistake(wKey, current.word.ru, current.word.uk, lessonId, current.word.pos, current.word.es, studyTarget);
        }
        const resetCard = buildQueueItem(current.word, current.roundIndex);
        newQueue.splice(liveIndex, 1);
        const rem = newQueue.length;
        // currentNext — индекс следующей карточки после удаления текущей
        const currentNext = clampQueueIndex(liveIndex, rem);
        // Вставляем не раньше чем через 2 позиции от currentNext
        const firstInsert = insertTrainingCardLater(newQueue, currentNext, resetCard);
        const secondInsert = insertTrainingCardLater(firstInsert.queue, firstInsert.index, resetCard);
        applyTrainingQueue(secondInsert.queue, currentNext);

        // Тратим энергию при ошибке
        if (!testerEnergyDisabledRef.current) {
          const energyBefore = currentEnergyRef.current;
          spendOneRef.current().then(success => {
            if (success && energyBefore === 1) {
              setTimeout(() => { onNoEnergyRef.current(); }, 800);
            }
          }).catch(() => {});
        }
      }

      setChosen(null);
      locked.current = false;
    }, isRight ? ANSWER_FEEDBACK_MS.correct : ANSWER_FEEDBACK_MS.wrong);
  };

  const startPractice = () => {
    // Пересобираем очередь со ВСЕМИ словами — прогресс не меняем
    const cards = words.map(w => buildQueueItem(w, 0));
    applyTrainingQueue(shuffleNoConsecutive(cards), 0);
    setChosen(null);
    applyLearnedCount(countLearnedWords(words, countsRef.current));
    setAllDone(false);
    setCoachToast(null);
    wrongMistakesRef.current = [];
    locked.current = false;
    // [FeedbackKit] Новый прогон — сбрасываем серию ощущений и разрешаем показать
    // финальную мини-победу снова.
    fkComboRef.current = 0;
    victoryFiredRef.current = false;
    setVictoryShown(false);
  };

  const trainingStepLabel = `${learnedCnt} / ${words.length}`;
  const xpToastOverlay = xpToastVisible ? (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 100, alignSelf: 'center',
        backgroundColor: isLightTheme ? '#92400E' : '#FFC800', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
        transform: [{ translateY: xpTranslateY }], opacity: xpOpacity, zIndex: 99999, ...noAndroidOutline,
      }}
    >
      <Text style={{ color: isLightTheme ? '#FFF3C4' : '#000', fontWeight: '700', fontSize: 16 }}>+{xpToastAmount} XP</Text>
    </Animated.View>
  ) : null;

  if (allDone || (validQueue.length === 0 && learnedCnt >= words.length)) return (
    <View style={{ flex: 1 }}>
      <View testID="lesson-words-complete" style={{ flex:1, justifyContent:'center', alignItems:'center', gap:16, padding:20 }}>
        <View style={{ width:80,height:80,borderRadius:40,backgroundColor:t.bgCard,justifyContent:'center',alignItems:'center' }}>
          <Ionicons name="checkmark-done-outline" size={36} color={t.correct}/>
        </View>
        <Text style={{ color:sx.primary, fontSize:f.h1, fontWeight:'700' }}>{ws.allLearned}</Text>
        <Text style={{ color:sx.muted, fontSize:f.bodyLg }}>{ws.learnedOf(words.length, words.length)}</Text>
        {totalPts > 0 && (
          <View style={{ flexDirection:'row',alignItems:'center',gap:6,backgroundColor:t.correctBg,borderRadius:10,paddingHorizontal:14,paddingVertical:8 }}>
            <Ionicons name="star" size={16} color={t.correct}/>
            <Text style={{ color:t.correct, fontSize:f.bodyLg, fontWeight:'700' }}>{ws.plusPoints(totalPts)}</Text>
          </View>
        )}
        <TouchableOpacity
          testID="lesson-words-complete-back"
          style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 }}
          onPress={() => safeRouterBack(router, '/(tabs)/lessons')}
        >
          <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>{pickTriLang(lang, { ru: '← К уроку', uk: '← До уроку', es: '← A la lección', 'pt-BR': '← Para a lição', vi: '← Về bài học', id: '← Ke pelajaran', tr: '← Derse', pl: '← Do lekcji' })}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="lesson-words-repeat"
          style={{ backgroundColor: t.bgCard, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={() => {
            fk.tap();
            setPracticeRepeatConfirm(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={18} color={t.textSecond} />
          <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '600' }}>{pickTriLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Repetir', 'pt-BR': 'Repetir', vi: 'Lặp lại', id: 'Ulangi', tr: 'Tekrarla', pl: 'Powtórz' })}</Text>
        </TouchableOpacity>
      </View>
      {/* Карточка за закрытый словарь — сюрприз поверх экрана итога. */}
      <CollectibleDropModal
        outcome={cardDropVisible ? cardDrop : null}
        onClose={() => setCardDrop(null)}
        onOpenCollection={() => {
          setCardDrop(null);
          router.push('/collectibles_screen' as any);
        }}
      />
      <ThemedConfirmModal
        visible={practiceRepeatConfirm}
        title={pickTriLang(lang, { ru: 'Повторение', uk: 'Повторення', es: 'Repaso', 'pt-BR': 'Revisão', vi: 'Ôn tập', id: 'Pengulangan', tr: 'Tekrar', pl: 'Powtórka' })}
        message={
          pickTriLang(lang, {
            ru: 'Твой путь сохранён. Это тренировка — выученные фразы не сбросятся.',
            uk: 'Твій шлях збережено. Це тренування — виучені фрази не скинуться.',
            es: 'El progreso está guardado. Es solo práctica: las palabras aprendidas no se reinician.',
            'pt-BR': 'O progresso foi salvo. Isto é só treino: as palavras aprendidas não serão reiniciadas.',
            vi: 'Tiến độ đã được lưu. Đây chỉ là luyện tập: các từ đã học sẽ không bị đặt lại.',
            id: 'Progres tersimpan. Ini hanya latihan: kata yang sudah dipelajari tidak akan direset.',
            tr: 'İlerleme kaydedildi. Bu sadece alıştırma: öğrenilen kelimeler sıfırlanmaz.',
            pl: 'Postęp zapisany. To tylko trening: nauczone słowa nie zostaną zresetowane.',
          })
        }
        cancelLabel={pickTriLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}
        confirmLabel={pickTriLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Repetir', 'pt-BR': 'Repetir', vi: 'Lặp lại', id: 'Ulangi', tr: 'Tekrarla', pl: 'Powtórz' })}
        onCancel={() => setPracticeRepeatConfirm(false)}
        onConfirm={() => {
          setPracticeRepeatConfirm(false);
          startPractice();
        }}
        confirmVariant="accent"
      />
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
      {xpToastOverlay}
      {/* [FeedbackKit] Мини-победа «Слова закреплены» — карточка с пружиной,
          звук/конфетти, уходит сама или по тапу. Монтируется только на показ. */}
      <VictoryBurst
        visible={victoryShown}
        title={wordsSessionDoneTitle(lang)}
        subtitle={wordsSessionDoneSubtitle(lang, learnedCnt, words.length)}
        heroEmoji="📚"
        celebrateSound="medal"
        onDone={() => setVictoryShown(false)}
      />
    </View>
  );

  if (!current) {
    return (
      <View testID="lesson-words-training" style={{ flex:1, justifyContent:'center', alignItems:'center', padding:20 }}>
        <Text style={{ color:sx.muted, fontSize:f.bodyLg }}>
          {pickTriLang(lang, { ru: 'Готовим тренировку...', uk: 'Готуємо тренування...', es: 'Preparando práctica...', 'pt-BR': 'Preparando treino...', vi: 'Đang chuẩn bị luyện tập...', id: 'Menyiapkan latihan...', tr: 'Alıştırma hazırlanıyor...', pl: 'Przygotowuję trening...' })}
        </Text>
      </View>
    );
  }

  const ROUND_CONFIG: Record<RoundType, { label: string; color: string; bg: string; icon: string }> = {
    recognition: {
      label: pickTriLang(lang, { ru: 'Узнавание', uk: 'Впізнавання', es: 'Reconocimiento', 'pt-BR': 'Reconhecimento', vi: 'Nhận diện', id: 'Pengenalan', tr: 'Tanıma', pl: 'Rozpoznawanie' }),
      color: t.correct,
      bg: t.correctBg,
      icon: 'eye-outline',
    },
    context: {
      label: pickTriLang(lang, { ru: 'Контекст', uk: 'Контекст', es: 'Contexto', 'pt-BR': 'Contexto', vi: 'Ngữ cảnh', id: 'Konteks', tr: 'Bağlam', pl: 'Kontekst' }),
      color: '#4A9EFF',
      bg: 'rgba(74,158,255,0.14)',
      icon: 'text-outline',
    },
  };
  const round = ROUND_CONFIG[current.roundType];

  return (
    <View testID="lesson-words-training" style={{ flex:1, paddingHorizontal:20, paddingTop:12 }}>

      <View style={{ width:'100%', marginBottom:14, alignItems:'flex-end' }}>
        <Text style={{ color:sx.muted, fontSize:f.label, fontWeight:'700' }}>
          {trainingStepLabel}
        </Text>
      </View>

      {/* Вопрос */}
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', gap:10 }}>
        {current.roundType === 'context' ? (
          <View style={{ alignItems:'center', gap:10, paddingHorizontal:4 }}>
            <Text style={{ color:sx.muted, fontSize:f.sub, letterSpacing:0.5 }}>
              {pickTriLang(lang, { ru: 'Вставь слово в предложение:', uk: 'Встав слово у речення:', es: 'Coloca la palabra en la frase:', 'pt-BR': 'Coloque a palavra na frase:', vi: 'Điền từ vào câu:', id: 'Masukkan kata ke dalam kalimat:', tr: 'Kelimeyi cümleye yerleştir:', pl: 'Wstaw słowo do zdania:' })}
            </Text>
            <View style={{ backgroundColor: round.bg, borderRadius:16, paddingHorizontal:20, paddingVertical:16, borderWidth:0, borderColor: round.color + '40' }}>
              {(() => {
                const parts = current.question.split('...');
                return (
                  <Text style={{ color:sx.primary, fontSize:22, fontWeight:'400', textAlign:'center', lineHeight:32 }}>
                    {parts[0]}
                    <Text style={{ color: round.color, fontWeight:'800', letterSpacing:1 }}>{'___'}</Text>
                    {parts[1] ?? ''}
                  </Text>
                );
              })()}
            </View>
          </View>
        ) : (
          <View style={{ alignItems:'center', gap:8 }}>
            <Text style={{ color:sx.muted, fontSize:f.sub, letterSpacing:0.5 }}>
              {pickTriLang(lang, {
                ru: 'Выбери английский перевод:',
                uk: 'Оберіть англійський переклад:',
                es: 'Elige la traducción en inglés:',
                'pt-BR': 'Escolha a tradução em inglês:',
                vi: 'Chọn bản dịch tiếng Anh:',
                id: 'Pilih terjemahan bahasa Inggris:',
                tr: 'İngilizce çeviriyi seç:',
                pl: 'Wybierz angielskie tłumaczenie:',
              })}
            </Text>
            <Text
              style={{ color:sx.primary, fontSize:38, fontWeight:'300', textAlign:'center', lineHeight:46, maxWidth:'100%' }}
              numberOfLines={4}
            >
              {current.question}
            </Text>
          </View>
        )}
      </View>

      {/* Варианты ответов — 2 колонки */}
      <View style={{ width:'100%', flexDirection:'row', flexWrap:'wrap', gap:10, paddingBottom:16 }}>
        {current.options.map((opt, i) => {
          const isCorrect  = isLessonWordOptionCorrect(opt, current.correctOption);
          const isSelected = opt === chosen;
          const hasStatusIcon = chosen !== null && (isCorrect || isSelected);
          const optionFontSize = Math.min(f.h2, 22);
          const optionLineHeight = Math.round(optionFontSize * 1.18);
          let bg = t.bgCard, borderColor = t.border, tc = t.textSecond, bw = 1;
          if (chosen !== null) {
            if (isCorrect)       { bg = t.correctBg; borderColor = t.correct; tc = t.correct; bw = 1.5; }
            else if (isSelected) { bg = t.wrongBg;   borderColor = t.wrong;   tc = t.wrong;   bw = 1.5; }
          }
          const on = flashKey === `${i}`;
          return (
            <DuoPressable key={i}
              testID={isCorrect ? 'lesson-words-option-correct' : `lesson-words-option-${i}`}
              edgeHeight={5}
              withHaptic={false}
              edgeColor={on ? t.accent : 'rgba(0,0,0,0.30)'}
              wrapStyle={{ flexBasis:'47.5%', maxWidth:'48%', flexGrow:1, flexShrink:1, minWidth:0 }}
              style={{ minHeight:68, paddingVertical:12, paddingLeft:10, paddingRight:hasStatusIcon ? 28 : 10, borderRadius:16, borderWidth: 0, backgroundColor: on ? t.accent : bg, borderColor: on ? t.accent : borderColor, overflow:'hidden' }}
              onPress={() => { if (chosen !== null) return; flash(`${i}`); handleChoice(opt); }}
              disabled={chosen !== null}
            >
              {chosen !== null && isCorrect && (
                <View style={{ position:'absolute', top:7, right:8 }}>
                  <Ionicons name="checkmark-circle" size={15} color={t.correct} />
                </View>
              )}
              {chosen !== null && isSelected && !isCorrect && (
                <View style={{ position:'absolute', top:7, right:8 }}>
                  <Ionicons name="close-circle" size={15} color={t.wrong} />
                </View>
              )}
              <Text
                style={{ width:'100%', minWidth:0, flexShrink:1, color: on ? (t.correctText ?? '#fff') : tc, fontSize:optionFontSize, lineHeight:optionLineHeight, fontWeight: on ? '700' : '500', textAlign:'center' }}
                numberOfLines={2}
                maxFontSizeMultiplier={1.2}
                ellipsizeMode="tail"
              >
                {opt}
              </Text>
            </DuoPressable>
          );
        })}
      </View>

      {current && (
        <ReportErrorButton
          screen="lesson_words"
          dataId={`word_${current.correctOption.replace(/\s+/g,'_')}`}
          dataText={[
            `${pickTriLang(lang, { ru: 'Вопрос', uk: 'Питання', es: 'Pregunta', 'pt-BR': 'Pergunta', vi: 'Câu hỏi', id: 'Pertanyaan', tr: 'Soru', pl: 'Pytanie' })}: ${current.question}`,
            `${pickTriLang(lang, { ru: 'Варианты', uk: 'Варіанти', es: 'Opciones', 'pt-BR': 'Opções', vi: 'Các lựa chọn', id: 'Pilihan', tr: 'Seçenekler', pl: 'Opcje' })}: ${current.options.map(o=>o===current.correctOption?`[✓${o}]`:o).join(' | ')}`,
          ].join('\n')}
          style={{ alignSelf: 'flex-end', marginBottom: 4 }}
          textColor={sx.muted}
        />
      )}

      {xpToastOverlay}

    </View>
  );
}

// ── СПИСОК ───────────────────────────────────────────────────────────────────
function WordList({ words, learnedCounts, lang, lessonId, onStartTraining }: { words:Word[]; learnedCounts:Record<string,number>; lang: Lang; lessonId?: number; onStartTraining?: () => void; }) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme: t, f, ds, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { hPad } = useScreen();
  const sections = groupByPOS(words, lang);

  // Какое слово СЕЙЧАС звучит — для подсветки на время озвучки. Тап по слову
  // подсвечивает его мгновенно (Pressable pressed) и держит фон, пока идёт TTS.
  //
  // ВАЖНО про снятие подсветки: на onDone/onStopped полагаться НЕЛЬЗЯ — expo-speech
  // часто не зовёт onDone на коротких словах, а при ПРЕРЫВАНИИ прошлой озвучки
  // новым тапом (safeSpeechStop/stopPhraseAudio) колбэки не приходят вовсе → слово
  // залипало подсвеченным навсегда. Поэтому снятие держим на СТРАХОВОЧНОМ ТАЙМЕРЕ,
  // который перезапускается на каждом тапе; onDone лишь гасит раньше, если пришёл.
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current); }, []);
  const speakWord = useCallback((word: string) => {
    hapticTap();
    // Новый тап — сбрасываем прошлый таймер (иначе он снимет подсветку у нового слова).
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setSpeakingWord(word);
    const done = () => setSpeakingWord((cur) => (cur === word ? null : cur));
    // Страховка: подсветка гаснет максимум через 2.5 с, даже если onDone не придёт.
    highlightTimerRef.current = setTimeout(done, 2500);
    speakAudio(word, undefined, {
      language: 'en-US',
      // onDone может прийти раньше таймера — гасим сразу и чистим таймер.
      onDone: () => { if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; } done(); },
    });
  }, [speakAudio]);

  return (
    <View style={{ flex:1 }}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.en}
        removeClippedSubviews={false}
        contentContainerStyle={{ paddingBottom: ds.spacing.xxl }}
        ListFooterComponent={
          <ReportErrorButton
            screen="lesson_words"
            dataId={`wordlist_lesson_${lessonId ?? 0}`}
            dataText={pickTriLang(lang, {
              ru: `Словарь урока ${lessonId ?? ''}`,
              uk: `Словник уроку ${lessonId ?? ''}`,
              es: `Vocabulario de la lección ${lessonId ?? ''}`,
              'pt-BR': `Vocabulário da lição ${lessonId ?? ''}`,
              vi: `Từ vựng bài ${lessonId ?? ''}`,
              id: `Kosakata pelajaran ${lessonId ?? ''}`,
              tr: `Ders ${lessonId ?? ''} kelime listesi`,
              pl: `Słownictwo lekcji ${lessonId ?? ''}`,
            })}
            style={{ alignSelf: 'flex-end', marginHorizontal: hPad, marginTop: ds.spacing.sm }}
            textColor={sx.muted}
          />
        }
        ListHeaderComponent={onStartTraining ? (
          <TouchableOpacity
            onPress={onStartTraining}
            style={{ marginHorizontal: hPad, marginTop: ds.spacing.md, marginBottom: ds.spacing.xs, backgroundColor:t.bgCard, borderRadius: ds.radius.lg, paddingVertical: ds.spacing.sm, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:8 }}
          >
            <Ionicons name="pencil-outline" size={18} color={t.textSecond} />
            <Text style={{ color:t.textSecond, fontSize:f.bodyLg, fontWeight:'600' }}>
              {pickTriLang(lang, { ru: 'Начать тренировку', uk: 'Почати тренування', es: 'Comenzar práctica', 'pt-BR': 'Começar treino', vi: 'Bắt đầu luyện tập', id: 'Mulai latihan', tr: 'Alıştırmaya başla', pl: 'Zacznij trening' })}
            </Text>
          </TouchableOpacity>
        ) : null}
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor:t.bgPrimary, paddingHorizontal:hPad, paddingTop:ds.spacing.md, paddingBottom:ds.spacing.sm }}>
            <Text style={{ color:sx.muted, fontSize:f.label, fontWeight:'600', textTransform:'uppercase', letterSpacing:1 }}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const count = learnedCounts[item.en] ?? 0;
          const tr = wordTranslation(item, lang);
          return (
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: t.border }}>
              <ScrollView
                horizontal
                decelerationRate="normal"
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingLeft: hPad,
                  paddingRight: hPad,
                  paddingVertical: ds.spacing.sm,
                }}
                contentInset={{ right: hPad }}
              >
                <View style={{ width: 20, marginRight: ds.spacing.sm, alignItems: 'center', flexShrink: 0 }}>
                  {count >= REQUIRED
                    ? <Ionicons name="checkmark-circle" size={18} color={t.correct} />
                    : <Ionicons name="ellipse-outline" size={18} color={t.textMuted} />
                  }
                </View>
                <Pressable
                  onPress={() => speakWord(item.en)}
                  accessibilityRole="button"
                  accessibilityLabel={item.en}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => {
                    const active = pressed || speakingWord === item.en;
                    return {
                      flexShrink: 0,
                      marginRight: ds.spacing.sm,
                      marginLeft: -6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                      backgroundColor: active ? `${t.accent}22` : 'transparent',
                    };
                  }}
                >
                  <Text
                    maxFontSizeMultiplier={1.35}
                    style={{ color: speakingWord === item.en ? t.accent : sx.primary, fontSize: f.bodyLg, fontWeight: '600', flexShrink: 0 }}
                  >
                    {item.en}
                  </Text>
                </Pressable>
                <View style={{ flexShrink: 0, marginRight: ds.spacing.sm }}>
                  <Text maxFontSizeMultiplier={1.35} style={{ color: sx.muted, fontSize: f.body, flexShrink: 0 }}>
                    {tr}
                  </Text>
                </View>
                <View style={{ flexShrink: 0, marginRight: hPad }}>
                  <AddToFlashcard en={item.en} ru={item.ru} uk={item.uk} es={item.es} source="word" />
                </View>
              </ScrollView>
            </View>
          );
        }}
      />
    </View>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
function FrenchVocabularyUnavailable({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const { theme: t, f, ds, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const copy = frenchVocabularyGateCopy('lesson_words', lang);

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: ds.spacing.md }}>
      <View style={{ alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: t.bgCard, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="shield-checkmark-outline" size={34} color={sx.second} />
      </View>
      <Text style={{ color: sx.primary, fontSize: f.h1, fontWeight: '800', textAlign: 'center' }}>
        {copy.title}
      </Text>
      <Text style={{ color: sx.muted, fontSize: f.bodyLg, lineHeight: 24, textAlign: 'center' }}>
        {copy.body}
      </Text>
      <TouchableOpacity
        testID="lesson-words-french-source-gate-back"
        onPress={onBack}
        activeOpacity={0.82}
        style={{ marginTop: ds.spacing.sm, alignSelf: 'center', backgroundColor: sx.second, borderRadius: 14, paddingHorizontal: 26, paddingVertical: 13 }}
      >
        <Text style={{ color: monoIcon(themeMode, '#06111f', MONO_ICON.onLight), fontSize: f.bodyLg, fontWeight: '800' }}>
          {copy.action}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function LessonWords() {
  const router = useRouter();
  const { theme:t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { s, lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { energy, isUnlimited: energyUnlimited } = useEnergy();
  const canTrain = energyUnlimited || energy > 0;
  const { id, tab: tabParam, qaFocusWords } = useLocalSearchParams<{ id:string; tab?: string | string[]; qaFocusWords?: string | string[] }>();
  const lessonId = parseInt(id || '1', 10);
  const initialTab = (Array.isArray(tabParam) ? tabParam[0] : tabParam) === 'list' ? 'list' : null;
  useEffect(() => {
    let cancelled = false;
    void shouldBlockLessonAccess(lessonId, studyTarget).then(blocked => {
      if (!cancelled && blocked) void openLessonGateByRuntime(router, lessonId, studyTarget);
    });
    return () => { cancelled = true; };
  }, [lessonId, router, studyTarget]);
  const frenchVocabularyBlocked = !vocabularyContentAvailableForTarget(studyTarget, 'lesson_words');
  const isFrenchLessonWords = storageStudyTarget(studyTarget) === 'fr';
  const frenchSourceLocale = lang === 'uk' ? 'uk' : 'ru';
  const [frenchRemoteWords, setFrenchRemoteWords] = useState<Word[] | null>(null);
  useEffect(() => {
    if (!isFrenchLessonWords || frenchVocabularyBlocked) {
      setFrenchRemoteWords(null);
      return;
    }
    let cancelled = false;
    setFrenchRemoteWords(null);
    loadFrenchRemoteLessonWordBank(lessonId, frenchSourceLocale)
      .then(items => {
        if (!cancelled) setFrenchRemoteWords(items as Word[]);
      })
      .catch(() => {
        if (!cancelled) setFrenchRemoteWords([]);
      });
    return () => { cancelled = true; };
  }, [frenchSourceLocale, frenchVocabularyBlocked, isFrenchLessonWords, lessonId]);
  const frenchRemoteWordsLoading = isFrenchLessonWords && !frenchVocabularyBlocked && frenchRemoteWords === null;
  const words = useMemo(
    () => {
      if (frenchVocabularyBlocked) return [];
      if (isFrenchLessonWords) return prioritizeQaFocusWords(frenchRemoteWords ?? [], qaFocusWords);
      return prioritizeQaFocusWords(lessonWordBank(lessonId), qaFocusWords);
    },
    [frenchRemoteWords, frenchVocabularyBlocked, isFrenchLessonWords, lessonId, qaFocusWords],
  );
  const storageKey = lessonWordsKey(lessonId, studyTarget);
  const wordsShardGrantKey = lessonWordsShardsGrantedKey(lessonId, studyTarget);
  const ws = s.words;

  // зачем: системный «Назад» на Android уходил мимо safeRouterBack и вёл себя иначе, чем
  // кнопка в шапке — терялся честный стек навигации (navigation_back.ts), и пользователь
  // мог оказаться не на экране уроков. Обработчик живёт ЗДЕСЬ, а не в Training: Training
  // монтируется только на вкладке тренировки, и на вкладке «Словарь» (а также при нулевой
  // энергии, где список открыт сразу) «Назад» остался бы необработанным.
  // Ссылка-перехватчик: Training регистрирует в неё свою проверку открытых модалок и
  // возвращает true, если нажатие поглощено, — иначе выходим с экрана.
  const androidBackInterceptRef = useRef<(() => boolean) | null>(null);
  const setAndroidBackIntercept = useCallback((handler: (() => boolean) | null) => {
    androidBackInterceptRef.current = handler;
  }, []);

  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);

  // Обработчик системного «Назад» (см. комментарий у androidBackInterceptRef выше).
  // Порядок перехвата: модалка энергии → модалки тренировки → выход с экрана.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (noEnergyModalOpen) {
        setNoEnergyModalOpen(false);
        return true;
      }
      if (androidBackInterceptRef.current?.()) return true;
      safeRouterBack(router, { pathname: '/(tabs)/lessons', params: { id: String(lessonId) } } as any);
      return true;
    });
    return () => sub.remove();
  }, [router, lessonId, noEnergyModalOpen]);

  /** null = «авто»: при 0 энергии сразу Словарь, при наличии — Повторение, без кадра с неверной вкладкой */
  const [userTab, setUserTab] = useState<'train' | 'list' | null>(initialTab);
  const tab = userTab !== null ? userTab : (canTrain ? 'train' : 'list');
  useEffect(() => {
    if (!canTrain) setUserTab(null);
  }, [canTrain]);
  useEffect(() => {
    if (energyUnlimited || energy > 0) setNoEnergyModalOpen(false);
  }, [energyUnlimited, energy]);
  useEffect(() => {
    if (tab === 'list') void loadFlashcards(studyTarget);
  }, [studyTarget, tab]);
  const cachedInitialCounts = lessonWordsProgressCache.get(storageKey) ?? {};
  const [learnedCounts, setLearnedCounts] = useState<Record<string,number>>(() => cachedInitialCounts);
  /** true после чтения lessonN_words: тренажёр монтируется один раз, без кадра со случайной временной очередью. */
  const [wordProgressReady, setWordProgressReady] = useState(false);
  const learnedListForTraining = useMemo(
    () => Object.keys(learnedCounts).filter(k => (learnedCounts[k] ?? 0) >= REQUIRED),
    [learnedCounts],
  );
  const [userName, setUserName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
  }, []);

  useLayoutEffect(() => {
    const cached = lessonWordsProgressCache.get(storageKey) ?? {};
    setLearnedCounts(cached);
    setWordProgressReady(false);
    setUserTab(initialTab);
  }, [initialTab, lessonId, storageKey]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey)
      .then(v => {
        if (cancelled) return;
        const counts = parseLessonWordCounts(v, lessonId);
        lessonWordsProgressCache.set(storageKey, counts);
        if (v && JSON.stringify(counts) !== v) {
          AsyncStorage.setItem(storageKey, JSON.stringify(counts)).catch(() => {});
        }
        setLearnedCounts(counts);
      })
      .catch(() => {
        if (!cancelled) {
          lessonWordsProgressCache.set(storageKey, {});
          setLearnedCounts({});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWordProgressReady(true);
        }
      });
    return () => { cancelled = true; };
  }, [lessonId, storageKey]);

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:15, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TapScale testID="lesson-words-header-back" onPress={() => safeRouterBack(router, { pathname: '/(tabs)/lessons', params: { id: String(lessonId) } } as any)}>
          <Ionicons name="chevron-back" size={28} color={sx.primary}/>
        </TapScale>
        <Text style={{ color:sx.primary, fontSize:f.h2, fontWeight:'600', flex:1, textAlign:'center', marginHorizontal:8 }} numberOfLines={1}>{ws.title(lessonId)}</Text>
        <View style={{ width:28 }} />
      </View>

      <View style={{ flex:1 }}>
        {frenchVocabularyBlocked ? (
          <FrenchVocabularyUnavailable
            lang={lang}
            onBack={() => router.replace({ pathname: '/(tabs)/lessons', params: { id: String(lessonId) } } as any)}
          />
        ) : frenchRemoteWordsLoading ? (
          <View testID="lesson-words-french-remote-loading" style={{ flex:1, justifyContent:'center', alignItems:'center', padding:20 }}>
            <Text style={{ color:sx.muted, fontSize:f.bodyLg }}>
              {pickTriLang(lang, { ru: 'Загружаем французский словарь...', uk: 'Завантажуємо французький словник...', es: 'Cargando vocabulario francés...', 'pt-BR': 'Carregando vocabulário francês...', vi: 'Đang tải từ vựng tiếng Pháp...', id: 'Memuat kosakata Prancis...', tr: 'Fransizca kelime listesi yukleniyor...', pl: 'Ladowanie francuskiego slownictwa...' })}
            </Text>
          </View>
        ) : tab === 'list' ? (
          <WordList
            words={words}
            learnedCounts={learnedCounts}
            lang={lang}
            lessonId={lessonId}
            onStartTraining={() => {
              if (!canTrain) {
                setNoEnergyModalOpen(true);
                return;
              }
              setUserTab('train');
            }}
          />
        ) : !wordProgressReady ? (
          <View testID="lesson-words-training-progress-loading" style={{ flex:1, justifyContent:'center', alignItems:'center', padding:20 }}>
            <Text style={{ color:sx.muted, fontSize:f.bodyLg }}>
              {pickTriLang(lang, { ru: 'Готовим тренировку...', uk: 'Готуємо тренування...', es: 'Preparando práctica...', 'pt-BR': 'Preparando treino...', vi: 'Đang chuẩn bị luyện tập...', id: 'Menyiapkan latihan...', tr: 'Alıştırma hazırlanıyor...', pl: 'Przygotowuję trening...' })}
            </Text>
          </View>
        ) : (
          <Training
            key={storageKey}
            words={words}
            storageKey={storageKey}
            wordsShardGrantKey={wordsShardGrantKey}
            lessonId={lessonId}
            lang={lang}
            userName={userName}
            initialLearned={learnedListForTraining}
            initialCounts={learnedCounts}
            onCountUpdate={(word, count) => setLearnedCounts(prev => ({ ...prev, [word]: count }))}
            onNoEnergy={() => setNoEnergyModalOpen(true)}
            studyTarget={studyTarget}
            onAndroidBackIntercept={setAndroidBackIntercept}
          />
        )}
      </View>

      {!frenchVocabularyBlocked && (
      <View style={{ flexDirection:'row', borderTopWidth:0.5, borderTopColor:t.border }}>
        {(['train','list'] as const).map(key => {
          const isActive = tab === key;
          const label = key === 'train' ? ws.training : ws.wordList;
          const icon  = key === 'train'
            ? (isActive ? 'pencil'  : 'pencil-outline')
            : (isActive ? 'list'    : 'list-outline');
          return (
            <TouchableOpacity key={key}
              testID={key === 'train' ? 'lesson-words-tab-train' : 'lesson-words-tab-list'}
              style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:14, gap:8, borderTopWidth:isActive?2:0, borderTopColor:sx.second }}
              onPress={() => {
                if (key === 'train') {
                  if (!canTrain) {
                    setNoEnergyModalOpen(true);
                    return;
                  }
                }
                setUserTab(key);
              }}
            >
              <Ionicons name={icon as any} size={20} color={isActive?sx.primary:sx.ghost}/>
              <Text style={{ color:isActive?sx.primary:sx.ghost, fontSize:f.body, fontWeight:'500' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      )}
      </ContentWrap>

      <NoEnergyModal visible={noEnergyModalOpen} onClose={() => setNoEnergyModalOpen(false)} />
    </SafeAreaView>
    </ScreenGradient>
  );
}

export const LESSONS_WITH_WORDS: Set<number> = new Set(Object.keys(WORDS_BY_LESSON).map(Number));
export const WORD_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.keys(WORDS_BY_LESSON).map((k) => {
    const id = Number(k);
    return [id, lessonWordBank(id).length] as const;
  }),
);
export const WORD_KEYS_BY_LESSON: Record<number, Set<string>> = Object.fromEntries(
  Object.keys(WORDS_BY_LESSON).map((k) => {
    const id = Number(k);
    return [id, new Set(lessonWordBank(id).map((w: Word) => w.en))] as const;
  }),
);
