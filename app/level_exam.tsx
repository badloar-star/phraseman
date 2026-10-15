import React, { useState, useMemo, useCallback, useEffect } from 'react';
import TapScale from '../components/TapScale';
import BouncyScrollView from '../components/BouncyScrollView';
import DuoPressable from '../components/DuoPressable';
import { useWordFlash } from '../hooks/use-word-flash';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../components/SafeLinearGradient';
import { lightenHex } from '../components/GradientProgressBar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { triLang, type PlannedInterfaceLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { OLIVE_RICH } from '../constants/oliveTheme';
import { oliveLevelExamChrome } from './olive_completion_chrome';
import { hapticTap, hapticSuccess, hapticError } from '../hooks/use-haptics';
import ReportErrorButton from '../components/ReportErrorButton';
import ClozeGapText from '../components/ClozeGapText';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { checkAchievements } from './achievements';
import { saveExamProgress, type MedalTier } from './medal_utils';
import { getPremiumCourseLevel, markPremiumCourseLevelReached, unlockLesson } from './lesson_lock_system';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import GoldBevel from '../components/GoldBevel';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import { isMistakeStudyTargetValue } from '../modules/mistake-practice/contracts';
import { trackFeatureBlocked, trackFeatureError, trackFeatureStart, trackFeatureSuccess } from './app_activity';
import { getCourseLevelIndex, getFirstLessonForLevel, getLastLessonForLevel, getNextCourseLevel, getPreviousCourseLevel, type CourseLevel } from './course_levels';
import { getVerifiedPremiumStatus, isTesterNoLimitsActive } from './premium_guard';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import { usePremium } from '../components/PremiumContext';
import { lessonPaywallContext, requiresPremiumForLesson } from './monetization_policy';
import { readLegacyFreeLessonCap } from './legacy_free_lesson_access';
import { lessonPurchaseContinuationParams } from './paywall_lesson_continuation';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import { levelExamKey, storageStudyTarget, storedProgressFlagIsTrue } from './target_storage_keys';
import { examContentAvailableForTarget, frenchExamGateCopy } from './exam_target_gate';
import { loadFrenchRemoteLevelExamQuestions } from './french_exam_remote_runtime';
import { recordLevelExamAttempt } from './level_exam_attempts';
import { safeRouterBack } from './navigation_back';
import { canShowReview } from './review_utils';
import ReviewPromptModal from '../components/ReviewPromptModal';
import { soundDirector } from '../modules/audio/sound_director';
import LevelExamV2 from '../components/level-exam/LevelExamV2';
import { DebugLogger } from './debug-logger';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { LEVEL_EXAM_PASS_PERCENT } from './lesson_star_scale';
import { PracticeCta, PracticeStatePanel } from '../components/practice/PracticeStates';
import {
  ExamFooter, ExamHeader, ExamHero, ExamKvCard, ExamOption, ExamQuietButton, ExamStatRow,
  ExamTrack, examCardStyle, type ExamOptionState,
} from '../components/level-exam/ExamGlassParts';
import { notifyActivityStartFailed, useScreenOpenRef } from './activity_start_failed_toast';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее


/** Энергия за ПОПЫТКУ зачёта уровня (списывается авансом на старте, не за ошибку). */
// зачем (PM-086/D06): зачёт уровня стоит 1 энергию, как любое начатое занятие; сумма в confirmSpendAmount не используется (цену задаёт таблица активностей).
const LEVEL_EXAM_ENERGY = 1;

const MEDAL_IMAGES_EXAM: Record<string, any> = {
  bronze:  require('../assets/images/levels/bronza.webp'),
  silver:  require('../assets/images/levels/serebro.webp'),
  gold:    require('../assets/images/levels/zoloto.webp'),
};

// ── Пул вопросов (общий с exam.tsx) ──────────────────────────────────────────
type QType = 'fill' | 'choice4' | 'error';
interface LevelQ {
  lessonNum: number;
  topic:   string;
  topicUK: string;
  topicES: string;
  q:       string;
  opts:    string[];
  correct: number;
  type?:   QType;
}

const LEVEL_TOPIC_PLANNED: Record<string, Record<PlannedInterfaceLang, string>> = {
  'El verbo to be': {
    'pt-BR': 'Verbo to be',
    vi: 'Động từ to be',
    id: 'Kata kerja to be',
    tr: 'To be fiili',
    pl: 'Czasownik to be',
  },
  'Negación con to be': {
    'pt-BR': 'Negação com to be',
    vi: 'Phủ định với to be',
    id: 'Negasi dengan to be',
    tr: 'To be ile olumsuzluk',
    pl: 'Przeczenia z to be',
  },
  'Present Simple: afirmativo': {
    'pt-BR': 'Present Simple: afirmativo',
    vi: 'Present Simple: câu khẳng định',
    id: 'Present Simple: afirmatif',
    tr: 'Present Simple: olumlu cümle',
    pl: 'Present Simple: zdania twierdzące',
  },
  'Present Simple: negación': {
    'pt-BR': 'Present Simple: negativo',
    vi: 'Present Simple: câu phủ định',
    id: 'Present Simple: negatif',
    tr: 'Present Simple: olumsuz cümle',
    pl: 'Present Simple: przeczenia',
  },
  'Present Simple: preguntas': {
    'pt-BR': 'Present Simple: perguntas',
    vi: 'Present Simple: câu hỏi',
    id: 'Present Simple: pertanyaan',
    tr: 'Present Simple: sorular',
    pl: 'Present Simple: pytania',
  },
  'Preguntas con wh-': {
    'pt-BR': 'Perguntas com wh-',
    vi: 'Câu hỏi wh-',
    id: 'Pertanyaan wh-',
    tr: 'Wh- soruları',
    pl: 'Pytania wh-',
  },
  'El verbo to have': {
    'pt-BR': 'Verbo to have',
    vi: 'Động từ to have',
    id: 'Kata kerja to have',
    tr: 'To have fiili',
    pl: 'Czasownik to have',
  },
  'Preposiciones de tiempo': {
    'pt-BR': 'Preposições de tempo',
    vi: 'Giới từ chỉ thời gian',
    id: 'Preposisi waktu',
    tr: 'Zaman edatları',
    pl: 'Przyimki czasu',
  },
  'There is / There are': {
    'pt-BR': 'There is / There are',
    vi: 'There is / There are',
    id: 'There is / There are',
    tr: 'There is / There are',
    pl: 'There is / There are',
  },
  'Verbos modales': {
    'pt-BR': 'Verbos modais',
    vi: 'Động từ khuyết thiếu',
    id: 'Kata kerja modal',
    tr: 'Modal fiiller',
    pl: 'Czasowniki modalne',
  },
  'Past Simple: regulares': {
    'pt-BR': 'Past Simple: verbos regulares',
    vi: 'Past Simple: động từ có quy tắc',
    id: 'Past Simple: beraturan',
    tr: 'Past Simple: düzenli fiiller',
    pl: 'Past Simple: czasowniki regularne',
  },
  'Past Simple: irregulares': {
    'pt-BR': 'Past Simple: verbos irregulares',
    vi: 'Past Simple: động từ bất quy tắc',
    id: 'Past Simple: tidak beraturan',
    tr: 'Past Simple: düzensiz fiiller',
    pl: 'Past Simple: czasowniki nieregularne',
  },
  'Future Simple (will)': {
    'pt-BR': 'Future Simple (will)',
    vi: 'Future Simple (will)',
    id: 'Future Simple (will)',
    tr: 'Future Simple (will)',
    pl: 'Future Simple (will)',
  },
  'Grados de comparación': {
    'pt-BR': 'Graus de comparação',
    vi: 'Cấp so sánh',
    id: 'Tingkat perbandingan',
    tr: 'Karşılaştırma dereceleri',
    pl: 'Stopniowanie przymiotników',
  },
  'Pronombres y adjetivos posesivos': {
    'pt-BR': 'Pronomes e adjetivos possessivos',
    vi: 'Đại từ và tính từ sở hữu',
    id: 'Kata ganti dan kata sifat kepunyaan',
    tr: 'İyelik zamirleri ve sıfatları',
    pl: 'Zaimki i przymiotniki dzierżawcze',
  },
  'Verbos frasales': {
    'pt-BR': 'Phrasal verbs',
    vi: 'Cụm động từ',
    id: 'Phrasal verbs',
    tr: 'Phrasal verbs',
    pl: 'Czasowniki frazowe',
  },
  'Present Continuous': {
    'pt-BR': 'Present Continuous',
    vi: 'Present Continuous',
    id: 'Present Continuous',
    tr: 'Present Continuous',
    pl: 'Present Continuous',
  },
  Imperativo: {
    'pt-BR': 'Imperativo',
    vi: 'Câu mệnh lệnh',
    id: 'Imperatif',
    tr: 'Emir kipi',
    pl: 'Tryb rozkazujący',
  },
  'Preposiciones de lugar': {
    'pt-BR': 'Preposições de lugar',
    vi: 'Giới từ chỉ nơi chốn',
    id: 'Preposisi tempat',
    tr: 'Yer edatları',
    pl: 'Przyimki miejsca',
  },
  'Artículos (a/an/the)': {
    'pt-BR': 'Artigos (a/an/the)',
    vi: 'Mạo từ (a/an/the)',
    id: 'Artikel (a/an/the)',
    tr: 'Artikeller (a/an/the)',
    pl: 'Przedimki (a/an/the)',
  },
  'Pronombres indefinidos': {
    'pt-BR': 'Pronomes indefinidos',
    vi: 'Đại từ bất định',
    id: 'Kata ganti tak tentu',
    tr: 'Belgisiz zamirler',
    pl: 'Zaimki nieokreślone',
  },
  'Gerundio (-ing)': {
    'pt-BR': 'Gerúndio (-ing)',
    vi: 'Danh động từ (-ing)',
    id: 'Gerund (-ing)',
    tr: 'Gerund (-ing)',
    pl: 'Gerundium (-ing)',
  },
  'Voz pasiva': {
    'pt-BR': 'Voz passiva',
    vi: 'Câu bị động',
    id: 'Passive Voice',
    tr: 'Edilgen çatı',
    pl: 'Strona bierna',
  },
  'Present Perfect': {
    'pt-BR': 'Present Perfect',
    vi: 'Present Perfect',
    id: 'Present Perfect',
    tr: 'Present Perfect',
    pl: 'Present Perfect',
  },
  'Past Continuous': {
    'pt-BR': 'Past Continuous',
    vi: 'Past Continuous',
    id: 'Past Continuous',
    tr: 'Past Continuous',
    pl: 'Past Continuous',
  },
  'Oraciones condicionales (if)': {
    'pt-BR': 'Orações condicionais (if)',
    vi: 'Câu điều kiện (if)',
    id: 'Kalimat kondisional (if)',
    tr: 'Koşul cümleleri (if)',
    pl: 'Zdania warunkowe (if)',
  },
  'Estilo indirecto': {
    'pt-BR': 'Discurso indireto',
    vi: 'Câu tường thuật',
    id: 'Kalimat tidak langsung',
    tr: 'Dolaylı anlatım',
    pl: 'Mowa zależna',
  },
  'Pronombres reflexivos': {
    'pt-BR': 'Pronomes reflexivos',
    vi: 'Đại từ phản thân',
    id: 'Kata ganti refleksif',
    tr: 'Dönüşlülük zamirleri',
    pl: 'Zaimki zwrotne',
  },
  'Used to': {
    'pt-BR': 'Used to',
    vi: 'Used to',
    id: 'Used to',
    tr: 'Used to',
    pl: 'Used to',
  },
  'Oraciones relativas': {
    'pt-BR': 'Orações relativas',
    vi: 'Mệnh đề quan hệ',
    id: 'Relative clauses',
    tr: 'İlgi cümlecikleri',
    pl: 'Zdania względne',
  },
  'Construcciones con objeto e infinitivo': {
    'pt-BR': 'Construções com objeto e infinitivo',
    vi: 'Cấu trúc tân ngữ và động từ nguyên mẫu',
    id: 'Konstruksi objek dan infinitif',
    tr: 'Nesne ve mastar yapıları',
    pl: 'Konstrukcje z dopełnieniem i bezokolicznikiem',
  },
  'Repaso general': {
    'pt-BR': 'Revisão geral',
    vi: 'Ôn tập tổng hợp',
    id: 'Ulangan umum',
    tr: 'Genel tekrar',
    pl: 'Powtórka ogólna',
  },
};

const LEVEL_TOPIC_UNAVAILABLE: Record<PlannedInterfaceLang, string> = {
  'pt-BR': 'Tópico do teste de nível indisponível',
  vi: 'Chưa có chủ đề bài kiểm tra trình độ',
  id: 'Topik ujian level belum tersedia',
  tr: 'Seviye sınavı konusu kullanılamıyor',
  pl: 'Temat testu poziomu jest niedostępny',
};

function levelTopicPlanned(q: LevelQ, locale: PlannedInterfaceLang): string {
  const planned = LEVEL_TOPIC_PLANNED[q.topicES]?.[locale];
  return planned && planned.trim().length > 0 ? planned : LEVEL_TOPIC_UNAVAILABLE[locale];
}

// зачем: EN — чистый UI-язык (не PlannedInterfaceLang, см. app/config.ts
// ENGLISH_UI_LOCALE_ENABLED), поэтому тема экзамена на английском живёт
// отдельным словарём с теми же ключами topicES, а не в LEVEL_TOPIC_PLANNED.
const LEVEL_TOPIC_EN: Record<string, string> = {
  'El verbo to be': 'The verb to be',
  'Negación con to be': 'Negation with to be',
  'Present Simple: afirmativo': 'Present Simple: affirmative',
  'Present Simple: negación': 'Present Simple: negative',
  'Present Simple: preguntas': 'Present Simple: questions',
  'Preguntas con wh-': 'Wh- questions',
  'El verbo to have': 'The verb to have',
  'Preposiciones de tiempo': 'Prepositions of time',
  'There is / There are': 'There is / There are',
  'Verbos modales': 'Modal verbs',
  'Past Simple: regulares': 'Past Simple: regular verbs',
  'Past Simple: irregulares': 'Past Simple: irregular verbs',
  'Future Simple (will)': 'Future Simple (will)',
  'Grados de comparación': 'Degrees of comparison',
  'Pronombres y adjetivos posesivos': 'Possessive pronouns and adjectives',
  'Verbos frasales': 'Phrasal verbs',
  'Present Continuous': 'Present Continuous',
  Imperativo: 'Imperative',
  'Preposiciones de lugar': 'Prepositions of place',
  'Artículos (a/an/the)': 'Articles (a/an/the)',
  'Pronombres indefinidos': 'Indefinite pronouns',
  'Gerundio (-ing)': 'Gerund (-ing)',
  'Voz pasiva': 'Passive voice',
  'Present Perfect': 'Present Perfect',
  'Past Continuous': 'Past Continuous',
  'Oraciones condicionales (if)': 'Conditional sentences (if)',
  'Estilo indirecto': 'Reported speech',
  'Pronombres reflexivos': 'Reflexive pronouns',
  'Used to': 'Used to',
  'Oraciones relativas': 'Relative clauses',
  'Construcciones con objeto e infinitivo': 'Object + infinitive constructions',
  'Repaso general': 'General review',
};

function levelTopicEn(q: LevelQ): string {
  const en = LEVEL_TOPIC_EN[q.topicES];
  return en && en.trim().length > 0 ? en : 'Level test topic unavailable';
}

// 3 вопроса per lesson (первые 3 из pool = fill-типы, они лучше всего подходят)
const QUESTION_POOL: LevelQ[] = [
  // L1
  {lessonNum:1,topic:'To Be',topicUK:'To Be',topicES:'El verbo to be',q:'She ___ a teacher.',opts:['am','is','are','be'],correct:1},
  {lessonNum:1,topic:'To Be',topicUK:'To Be',topicES:'El verbo to be',q:'We ___ at home now.',opts:['is','am','are','be'],correct:2},
  {lessonNum:1,topic:'To Be',topicUK:'To Be',topicES:'El verbo to be',q:'I ___ not tired.',opts:['is','are','am','be'],correct:2},
  // L2
  {lessonNum:2,topic:'Отрицание To Be',topicUK:'Заперечення To Be',topicES:'Negación con to be',q:'They ___ not here.',opts:['is','am','are','be'],correct:2},
  {lessonNum:2,topic:'Отрицание To Be',topicUK:'Заперечення To Be',topicES:'Negación con to be',q:'She ___ not ready yet.',opts:['is','am','are','be'],correct:0},
  {lessonNum:2,topic:'Отрицание To Be',topicUK:'Заперечення To Be',topicES:'Negación con to be',q:'Which sentence is correct?',opts:['I am not ready.','She are not happy.','He am not here.','We is not late.'],correct:0,type:'choice4'},
  // L3
  {lessonNum:3,topic:'Present Simple — утверждение',topicUK:'Present Simple — ствердження',topicES:'Present Simple: afirmativo',q:'He ___ every day.',opts:['work','works','worked','working'],correct:1},
  {lessonNum:3,topic:'Present Simple — утверждение',topicUK:'Present Simple — ствердження',topicES:'Present Simple: afirmativo',q:'She ___ English.',opts:['speak','speaks','spoke','speaking'],correct:1},
  {lessonNum:3,topic:'Present Simple — утверждение',topicUK:'Present Simple — ствердження',topicES:'Present Simple: afirmativo',q:'They ___ in London.',opts:['live','lives','lived','living'],correct:0},
  // L4
  {lessonNum:4,topic:'Present Simple — отрицание',topicUK:'Present Simple — заперечення',topicES:'Present Simple: negación',q:'She ___ not understand.',opts:['do','does','did','doing'],correct:1},
  {lessonNum:4,topic:'Present Simple — отрицание',topicUK:'Present Simple — заперечення',topicES:'Present Simple: negación',q:'He ___ not smoke.',opts:['do','does','did','doing'],correct:1},
  {lessonNum:4,topic:'Present Simple — отрицание',topicUK:'Present Simple — заперечення',topicES:'Present Simple: negación',q:'They ___ not know the answer.',opts:['does','do','did','doing'],correct:1},
  // L5
  {lessonNum:5,topic:'Present Simple — вопросы',topicUK:'Present Simple — питання',topicES:'Present Simple: preguntas',q:'___ you speak English?',opts:['Do','Does','Did','Are'],correct:0},
  {lessonNum:5,topic:'Present Simple — вопросы',topicUK:'Present Simple — питання',topicES:'Present Simple: preguntas',q:'___ she like music?',opts:['Do','Does','Did','Is'],correct:1},
  {lessonNum:5,topic:'Present Simple — вопросы',topicUK:'Present Simple — питання',topicES:'Present Simple: preguntas',q:'___ they play football?',opts:['Do','Does','Did','Are'],correct:0},
  // L6
  {lessonNum:6,topic:'Специальные вопросы',topicUK:'Спеціальні питання',topicES:'Preguntas con wh-',q:'___ do you live?',opts:['What','Where','Who','When'],correct:1},
  {lessonNum:6,topic:'Специальные вопросы',topicUK:'Спеціальні питання',topicES:'Preguntas con wh-',q:'___ is your name?',opts:['Where','How','What','Who'],correct:2},
  {lessonNum:6,topic:'Специальные вопросы',topicUK:'Спеціальні питання',topicES:'Preguntas con wh-',q:'___ time is it?',opts:['Where','Who','What','When'],correct:2},
  // L7
  {lessonNum:7,topic:'Глагол To Have',topicUK:'Дієслово To Have',topicES:'El verbo to have',q:'I ___ a car.',opts:['has','have','had','having'],correct:1},
  {lessonNum:7,topic:'Глагол To Have',topicUK:'Дієслово To Have',topicES:'El verbo to have',q:'She ___ two children.',opts:['have','has','had','having'],correct:1},
  {lessonNum:7,topic:'Глагол To Have',topicUK:'Дієслово To Have',topicES:'El verbo to have',q:'Do they ___ a car?',opts:['has','have','had','having'],correct:1},
  // L8
  {lessonNum:8,topic:'Предлоги времени',topicUK:'Прийменники часу',topicES:'Preposiciones de tiempo',q:"I wake up ___ 7 o\'clock.",opts:['in','on','at','by'],correct:2},
  {lessonNum:8,topic:'Предлоги времени',topicUK:'Прийменники часу',topicES:'Preposiciones de tiempo',q:'She was born ___ Monday.',opts:['in','on','at','by'],correct:1},
  {lessonNum:8,topic:'Предлоги времени',topicUK:'Прийменники часу',topicES:'Preposiciones de tiempo',q:'He was born ___ 1990.',opts:['in','on','at','by'],correct:0},
  // L9
  {lessonNum:9,topic:'There is / There are',topicUK:'There is / There are',topicES:'There is / There are',q:'There ___ a book on the table.',opts:['are','am','is','be'],correct:2},
  {lessonNum:9,topic:'There is / There are',topicUK:'There is / There are',topicES:'There is / There are',q:'There ___ many people here.',opts:['is','am','are','be'],correct:2},
  {lessonNum:9,topic:'There is / There are',topicUK:'There is / There are',topicES:'There is / There are',q:'There ___ no milk in the fridge.',opts:['are','am','is','be'],correct:2},
  // L10
  {lessonNum:10,topic:'Модальные глаголы',topicUK:'Модальні дієслова',topicES:'Verbos modales',q:'You ___ speak louder.',opts:['can','could','should','must'],correct:2},
  {lessonNum:10,topic:'Модальные глаголы',topicUK:'Модальні дієслова',topicES:'Verbos modales',q:'She ___ swim very well.',opts:['can','should','must','shall'],correct:0},
  {lessonNum:10,topic:'Модальные глаголы',topicUK:'Модальні дієслова',topicES:'Verbos modales',q:'No parking. You ___ park here.',opts:["mustn't",'can','could','should'],correct:0},
  // L11
  {lessonNum:11,topic:'Past Simple — правильные',topicUK:'Past Simple — правильні',topicES:'Past Simple: regulares',q:'She ___ the letter yesterday.',opts:['send','sends','sent','sending'],correct:2},
  {lessonNum:11,topic:'Past Simple — правильные',topicUK:'Past Simple — правильні',topicES:'Past Simple: regulares',q:'They ___ football last week.',opts:['play','plays','played','playing'],correct:2},
  {lessonNum:11,topic:'Past Simple — правильные',topicUK:'Past Simple — правильні',topicES:'Past Simple: regulares',q:'I ___ him yesterday.',opts:['call','calls','called','calling'],correct:2},
  // L12
  {lessonNum:12,topic:'Past Simple — неправильные',topicUK:'Past Simple — неправильні',topicES:'Past Simple: irregulares',q:'He ___ to London last year.',opts:['go','goes','went','gone'],correct:2},
  {lessonNum:12,topic:'Past Simple — неправильные',topicUK:'Past Simple — неправильні',topicES:'Past Simple: irregulares',q:'They ___ a lot of money.',opts:['spend','spends','spent','spending'],correct:2},
  {lessonNum:12,topic:'Past Simple — неправильные',topicUK:'Past Simple — неправильні',topicES:'Past Simple: irregulares',q:'She ___ the book last week.',opts:['read','reads','readed','reading'],correct:0},
  // L13
  {lessonNum:13,topic:'Future Simple (will)',topicUK:'Future Simple (will)',topicES:'Future Simple (will)',q:'She ___ come tomorrow.',opts:['will','would','is going','shall be'],correct:0},
  {lessonNum:13,topic:'Future Simple (will)',topicUK:'Future Simple (will)',topicES:'Future Simple (will)',q:'I ___ not be late.',opts:['will','shall','would','am'],correct:0},
  {lessonNum:13,topic:'Future Simple (will)',topicUK:'Future Simple (will)',topicES:'Future Simple (will)',q:'It ___ rain tomorrow.',opts:['will','would','shall','is'],correct:0},
  // L14
  {lessonNum:14,topic:'Степени сравнения',topicUK:'Ступені порівняння',topicES:'Grados de comparación',q:"This is ___ book I\'ve read.",opts:['good','better','the best','best'],correct:2},
  {lessonNum:14,topic:'Степени сравнения',topicUK:'Ступені порівняння',topicES:'Grados de comparación',q:'She is ___ than her sister.',opts:['tall','taller','tallest','most tall'],correct:1},
  {lessonNum:14,topic:'Степени сравнения',topicUK:'Ступені порівняння',topicES:'Grados de comparación',q:'This test is ___ than the last one.',opts:['hard','harder','hardest','more hard'],correct:1},
  // L15
  {lessonNum:15,topic:'Притяжательные местоимения',topicUK:'Присвійні займенники',topicES:'Pronombres y adjetivos posesivos',q:'This is ___ bag.',opts:['her','hers','she','herself'],correct:0},
  {lessonNum:15,topic:'Притяжательные местоимения',topicUK:'Присвійні займенники',topicES:'Pronombres y adjetivos posesivos',q:'Is this pen ___?',opts:['your','yours','you','yourself'],correct:1},
  {lessonNum:15,topic:'Притяжательные местоимения',topicUK:'Присвійні займенники',topicES:'Pronombres y adjetivos posesivos',q:'These are ___ books.',opts:['their','theirs','they','themselves'],correct:0},
  // L16
  {lessonNum:16,topic:'Фразовые глаголы',topicUK:'Фразові дієслова',topicES:'Verbos frasales',q:'Please ___ the light.',opts:['turn on','turn up','turn in','turn out'],correct:0},
  {lessonNum:16,topic:'Фразовые глаголы',topicUK:'Фразові дієслова',topicES:'Verbos frasales',q:'She ___ smoking last year.',opts:['gave up','give up','gives up','given up'],correct:0},
  {lessonNum:16,topic:'Фразовые глаголы',topicUK:'Фразові дієслова',topicES:'Verbos frasales',q:'I am going to bed. Could you ___ the TV?',opts:['turn off','turn out','put off','turn in'],correct:0},
  // L17
  {lessonNum:17,topic:'Present Continuous',topicUK:'Present Continuous',topicES:'Present Continuous',q:'She ___ now.',opts:['study','studies','is studying','studied'],correct:2},
  {lessonNum:17,topic:'Present Continuous',topicUK:'Present Continuous',topicES:'Present Continuous',q:'They ___ football right now.',opts:['play','plays','are playing','played'],correct:2},
  {lessonNum:17,topic:'Present Continuous',topicUK:'Present Continuous',topicES:'Present Continuous',q:'I ___ dinner at the moment.',opts:['cook','cooks','am cooking','cooked'],correct:2},
  // L18
  {lessonNum:18,topic:'Повелительное наклонение',topicUK:'Наказовий спосіб',topicES:'Imperativo',q:'___ quiet, please.',opts:['Be','Is','Are','Being'],correct:0},
  {lessonNum:18,topic:'Повелительное наклонение',topicUK:'Наказовий спосіб',topicES:'Imperativo',q:"Don\'t ___ late.",opts:['be','is','are','being'],correct:0},
  {lessonNum:18,topic:'Повелительное наклонение',topicUK:'Наказовий спосіб',topicES:'Imperativo',q:'___ the window, please.',opts:['Open','Opens','Opening','Opened'],correct:0},
  // L19
  {lessonNum:19,topic:'Предлоги места',topicUK:'Прийменники місця',topicES:'Preposiciones de lugar',q:'The cat is ___ the table.',opts:['in','on','under','between'],correct:1},
  {lessonNum:19,topic:'Предлоги места',topicUK:'Прийменники місця',topicES:'Preposiciones de lugar',q:'The book is ___ the bag.',opts:['on','in','at','between'],correct:1},
  {lessonNum:19,topic:'Предлоги места',topicUK:'Прийменники місця',topicES:'Preposiciones de lugar',q:'She lives ___ London.',opts:['on','at','in','by'],correct:2},
  // L20
  {lessonNum:20,topic:'Артикли (a/an/the)',topicUK:'Артиклі (a/an/the)',topicES:'Artículos (a/an/the)',q:'She is ___ doctor.',opts:['a','an','the','—'],correct:0},
  {lessonNum:20,topic:'Артикли (a/an/the)',topicUK:'Артиклі (a/an/the)',topicES:'Artículos (a/an/the)',q:'I am ___ engineer.',opts:['a','an','the','—'],correct:1},
  {lessonNum:20,topic:'Артикли (a/an/the)',topicUK:'Артиклі (a/an/the)',topicES:'Artículos (a/an/the)',q:'She loves ___ sun.',opts:['a','an','the','—'],correct:2},
  // L21
  {lessonNum:21,topic:'Неопределённые местоимения',topicUK:'Неозначені займенники',topicES:'Pronombres indefinidos',q:'I heard a noise. There must be ___ outside.',opts:['somebody','anybody','nobody','everybody'],correct:0},
  {lessonNum:21,topic:'Неопределённые местоимения',topicUK:'Неозначені займенники',topicES:'Pronombres indefinidos',q:'Is there ___ who can help me?',opts:['somewhere','anyone','no one','everyone'],correct:1},
  {lessonNum:21,topic:'Неопределённые местоимения',topicUK:'Неозначені займенники',topicES:'Pronombres indefinidos',q:"I don\'t have ___ money.",opts:['some','any','no','every'],correct:1},
  // L22
  {lessonNum:22,topic:'Герундий (-ing)',topicUK:'Герундій (-ing)',topicES:'Gerundio (-ing)',q:'She enjoys ___.',opts:['dance','dances','dancing','to dance'],correct:2},
  {lessonNum:22,topic:'Герундий (-ing)',topicUK:'Герундій (-ing)',topicES:'Gerundio (-ing)',q:'He avoids ___ the problem.',opts:['discuss','discussed','discussing','to discuss'],correct:2},
  {lessonNum:22,topic:'Герундий (-ing)',topicUK:'Герундій (-ing)',topicES:'Gerundio (-ing)',q:'They finished ___ dinner.',opts:['cook','cooks','cooking','to cook'],correct:2},
  // L23
  {lessonNum:23,topic:'Passive Voice',topicUK:'Passive Voice',topicES:'Voz pasiva',q:'The letter ___ by her.',opts:['wrote','is written','was written','had written'],correct:2},
  {lessonNum:23,topic:'Passive Voice',topicUK:'Passive Voice',topicES:'Voz pasiva',q:'Cars ___ made in factories.',opts:['is','am','are','were'],correct:2},
  {lessonNum:23,topic:'Passive Voice',topicUK:'Passive Voice',topicES:'Voz pasiva',q:'The documents ___ checked today.',opts:['must be','must have','should','is going'],correct:0},
  // L24
  {lessonNum:24,topic:'Present Perfect',topicUK:'Present Perfect',topicES:'Present Perfect',q:"I ___ never been to Paris.",opts:['have','has','had','was'],correct:0},
  {lessonNum:24,topic:'Present Perfect',topicUK:'Present Perfect',topicES:'Present Perfect',q:'She ___ just finished.',opts:['have','has','had','is'],correct:1},
  {lessonNum:24,topic:'Present Perfect',topicUK:'Present Perfect',topicES:'Present Perfect',q:'Have you ever ___ sushi?',opts:['eat','ate','eating','eaten'],correct:3},
  // L25
  {lessonNum:25,topic:'Past Continuous',topicUK:'Past Continuous',topicES:'Past Continuous',q:'She ___ when I called.',opts:['sleep','slept','was sleeping','has slept'],correct:2},
  {lessonNum:25,topic:'Past Continuous',topicUK:'Past Continuous',topicES:'Past Continuous',q:'They ___ TV at 8 pm.',opts:['watch','watched','were watching','have watched'],correct:2},
  {lessonNum:25,topic:'Past Continuous',topicUK:'Past Continuous',topicES:'Past Continuous',q:'I ___ when the phone rang.',opts:['work','worked','was working','am working'],correct:2},
  // L26
  {lessonNum:26,topic:'Условные предложения (if)',topicUK:'Умовні речення (if)',topicES:'Oraciones condicionales (if)',q:'If it rains, I ___ stay home.',opts:['will','would','shall','should'],correct:0},
  {lessonNum:26,topic:'Условные предложения (if)',topicUK:'Умовні речення (if)',topicES:'Oraciones condicionales (if)',q:'If I ___ rich, I would travel.',opts:['am','was','were','be'],correct:2},
  {lessonNum:26,topic:'Условные предложения (if)',topicUK:'Умовні речення (if)',topicES:'Oraciones condicionales (if)',q:'If we had started earlier, we ___ finished.',opts:['will have','would have','had','did'],correct:1},
  // L27
  {lessonNum:27,topic:'Косвенная речь',topicUK:'Непряма мова',topicES:'Estilo indirecto',q:'He said he ___ tired.',opts:['is','was','were','be'],correct:1},
  {lessonNum:27,topic:'Косвенная речь',topicUK:'Непряма мова',topicES:'Estilo indirecto',q:'She told me she ___ leave.',opts:['will','would','shall','should'],correct:1},
  {lessonNum:27,topic:'Косвенная речь',topicUK:'Непряма мова',topicES:'Estilo indirecto',q:'He asked where I ___.',opts:['live','lived','living','lives'],correct:1},
  // L28
  {lessonNum:28,topic:'Возвратные местоимения',topicUK:'Зворотні займенники',topicES:'Pronombres reflexivos',q:'She did it ___.',opts:['her','herself','hers','she'],correct:1},
  {lessonNum:28,topic:'Возвратные местоимения',topicUK:'Зворотні займенники',topicES:'Pronombres reflexivos',q:'He hurt ___ playing football.',opts:['him','himself','his','he'],correct:1},
  {lessonNum:28,topic:'Возвратные местоимения',topicUK:'Зворотні займенники',topicES:'Pronombres reflexivos',q:'They enjoyed ___ at the party.',opts:['them','themselves','their','they'],correct:1},
  // L29
  {lessonNum:29,topic:'Used to',topicUK:'Used to',topicES:'Used to',q:'I ___ play football as a kid.',opts:['used to','use to','am used to','was used to'],correct:0},
  {lessonNum:29,topic:'Used to',topicUK:'Used to',topicES:'Used to',q:'She ___ live in Paris.',opts:['used to','use to','is used to','uses to'],correct:0},
  {lessonNum:29,topic:'Used to',topicUK:'Used to',topicES:'Used to',q:'He is ___ waking up early.',opts:['use to','used to','used','get used to'],correct:1},
  // L30
  {lessonNum:30,topic:'Relative Clauses',topicUK:'Relative Clauses',topicES:'Oraciones relativas',q:'The man ___ called is my friend.',opts:['who','which','whose','whom'],correct:0},
  {lessonNum:30,topic:'Relative Clauses',topicUK:'Relative Clauses',topicES:'Oraciones relativas',q:'The book ___ I read was great.',opts:['who','which','whose','whom'],correct:1},
  {lessonNum:30,topic:'Relative Clauses',topicUK:'Relative Clauses',topicES:'Oraciones relativas',q:"The girl ___ mother is a doctor studies here.",opts:['who','which','whose','whom'],correct:2},
  // L31
  {lessonNum:31,topic:'Complex Object',topicUK:'Complex Object',topicES:'Construcciones con objeto e infinitivo',q:'I want you ___ this.',opts:['do','doing','to do','done'],correct:2},
  {lessonNum:31,topic:'Complex Object',topicUK:'Complex Object',topicES:'Construcciones con objeto e infinitivo',q:'She expects him ___ on time.',opts:['arrive','arriving','to arrive','arrived'],correct:2},
  {lessonNum:31,topic:'Complex Object',topicUK:'Complex Object',topicES:'Construcciones con objeto e infinitivo',q:'I heard her ___ a song.',opts:['sing','singing','to sing','sang'],correct:1},
  // L32
  {lessonNum:32,topic:'Повторение всех тем',topicUK:'Повторення всіх тем',topicES:'Repaso general',q:'She ___ not have come so early.',opts:['should','shall','would','will'],correct:0},
  {lessonNum:32,topic:'Повторение всех тем',topicUK:'Повторення всіх тем',topicES:'Repaso general',q:'By the time she arrived, he ___.',opts:['left','has left','had left','was leaving'],correct:2},
  {lessonNum:32,topic:'Повторение всех тем',topicUK:'Повторення всіх тем',topicES:'Repaso general',q:'If you had come, you ___ her.',opts:['meet','met','would have met','had met'],correct:2},
];

const LEVEL_RANGES: Record<string, [number, number]> = {
  A1: [1, 8], A2: [9, 18], B1: [19, 28], B2: [29, 32],
};

const LEVEL_LABELS: Record<string, { ru: string; uk: string; es: string; en: string } & Record<PlannedInterfaceLang, string>> = {
  A1: { ru: 'Зачёт A1', uk: 'Залік A1', es: 'Examen de nivel A1', en: 'A1 Exam', 'pt-BR': 'Teste de nível A1', vi: 'Bài kiểm tra trình độ A1', id: 'Ujian level A1', tr: 'A1 seviye sınavı', pl: 'Test poziomu A1' },
  A2: { ru: 'Зачёт A2', uk: 'Залік A2', es: 'Examen de nivel A2', en: 'A2 Exam', 'pt-BR': 'Teste de nível A2', vi: 'Bài kiểm tra trình độ A2', id: 'Ujian level A2', tr: 'A2 seviye sınavı', pl: 'Test poziomu A2' },
  B1: { ru: 'Зачёт B1', uk: 'Залік B1', es: 'Examen de nivel B1', en: 'B1 Exam', 'pt-BR': 'Teste de nível B1', vi: 'Bài kiểm tra trình độ B1', id: 'Ujian level B1', tr: 'B1 seviye sınavı', pl: 'Test poziomu B1' },
  B2: { ru: 'Зачёт B2', uk: 'Залік B2', es: 'Examen de nivel B2', en: 'B2 Exam', 'pt-BR': 'Teste de nível B2', vi: 'Bài kiểm tra trình độ B2', id: 'Ujian level B2', tr: 'B2 seviye sınavı', pl: 'Test poziomu B2' },
};

// зачем (PM-152): порог сдачи зачёта живёт в общей шкале рядом с порогами уроков;
// значение прежнее (70%). Сохранённый passed='1' не пересчитывается — сданное остаётся сданным.
const PASS_PCT = LEVEL_EXAM_PASS_PERCENT; // минимум % для сдачи

/** Премиальный тон интро-экрана зачёта (как «дорогой» тёмный макет). */
const LX = {
  screen: '#121212', // theme-exempt: экзамен уровня: собственная тёмно-золотая палитра экрана (токен экзамена — у «Тем»)
  card: '#1C1D22', // theme-exempt: экзамен уровня: собственная тёмно-золотая палитра экрана (токен экзамена — у «Тем»)
  cardLine: 'rgba(232, 199, 111, 0.22)', // theme-exempt: экзамен уровня: собственная тёмно-золотая палитра экрана (токен экзамена — у «Тем»)
  gold: '#E8C76F', // theme-exempt: экзамен уровня: собственная тёмно-золотая палитра экрана (токен экзамена — у «Тем»)
  goldSoft: 'rgba(232, 199, 111, 0.14)', // theme-exempt: экзамен уровня: собственная тёмно-золотая палитра экрана (токен экзамена — у «Тем»)
  ink: '#141109', // theme-exempt: экзамен уровня: собственная тёмно-золотая палитра экрана (токен экзамена — у «Тем»)
};

const INTRO_Q_COUNT = 30;
const LEVEL_EXAM_ACCESS_TIMEOUT_MS = 12_000;

function FrenchLevelExamUnavailable({
  lang,
  onBack,
  onLessons,
  liquidGlassThemeId,
}: {
  lang: string;
  onBack: () => void;
  onLessons: () => void;
  liquidGlassThemeId: ReturnType<typeof useTheme>['liquidGlassThemeId'];
}) {
  const copy = frenchExamGateCopy('level', lang);
  const glass = liquidGlassTokens(liquidGlassThemeId);
  return (
    <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <ExamHeader glass={glass} title="" onBack={onBack} />
          <PracticeStatePanel
            glass={glass}
            icon="shield-checkmark-outline"
            title={copy.title}
            message={copy.body}
            action={{ label: copy.cta, onPress: onLessons }}
          />
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function LevelExam() {
  const router = useRouter();
  const { theme: t, f, themeMode, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const isGoldTheme = themeMode === 'gold';
  const isOliveTheme = themeMode === 'olive';
  const oliveExamChrome = oliveLevelExamChrome(themeMode);
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const frenchExamBlocked = !examContentAvailableForTarget(studyTarget);
  const isFrenchExam = storageStudyTarget(studyTarget) === 'fr';
  const frenchExamSourceLocale = lang === 'uk' ? 'uk' : 'ru';
  const { level } = useLocalSearchParams<{ level: string }>();
  const validLevels = ['A1', 'A2', 'B1', 'B2'];
  const lvl = validLevels.includes(level) ? level : 'A1';

  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState<(number | null)[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [examMedalTier, setExamMedalTier] = useState<MedalTier>('none');
  const [, setExamPassCount] = useState(0);
  const [examAttemptNumber, setExamAttemptNumber] = useState(1);
  const [medalImproved, setMedalImproved] = useState(false);
  const [exitExamConfirm, setExitExamConfirm] = useState(false);
  // Блокировка двойного тапа по «Начать тест» (H12): второй тап не должен повторно списать энергию.
  const [examStarting, setExamStarting] = useState(false);
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'blocked'>('checking');
  const [blockedText, setBlockedText] = useState('');
  const [accessBlockKind, setAccessBlockKind] = useState<'premium' | 'level' | 'error'>('level');
  // Энергия: залог уровня стоит фиксированную сумму ЗА ПОПЫТКУ (аванс), а не за ошибку.
  // Премиум/тестер обходят подтверждение внутри confirmSpendAmount.
  const { isUnlimited: energyUnlimited, confirmSpendAmount, acknowledgeSessionStart, energy, bonusEnergy } = useEnergy();
  const screenOpenRef = useScreenOpenRef();
  const examEnergyMountIdRef = React.useRef(
    `level-exam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  );
  const [examEnergyAttemptRevision, setExamEnergyAttemptRevision] = useState(0);
  const levelExamEnergyIntent = useEnergySessionIntent(
    'level_exam',
    lvl,
    `${examEnergyMountIdRef.current}:${examEnergyAttemptRevision}`,
  );
  const { hasPremiumAccess } = usePremium();
  const examEnergyUnlimited = energyUnlimited || hasPremiumAccess;
  const [noEnergy, setNoEnergy] = useState(false);

  const englishQuestions = useMemo(() => {
    if (frenchExamBlocked) return [];
    const [from, to] = LEVEL_RANGES[lvl] ?? [1, 8];
    return QUESTION_POOL.filter(q => q.lessonNum >= from && q.lessonNum <= to);
  }, [frenchExamBlocked, lvl]);
  const [frenchQuestions, setFrenchQuestions] = useState<LevelQ[]>([]);
  const [examQuestionsLoading, setExamQuestionsLoading] = useState(false);
  const questions = isFrenchExam ? frenchQuestions : englishQuestions;

  useEffect(() => {
    let cancelled = false;
    if (!isFrenchExam || frenchExamBlocked) {
      setFrenchQuestions([]);
      setExamQuestionsLoading(false);
      return () => { cancelled = true; };
    }
    setExamQuestionsLoading(true);
    loadFrenchRemoteLevelExamQuestions(lvl, frenchExamSourceLocale, INTRO_Q_COUNT)
      .then((rows) => {
        if (!cancelled) setFrenchQuestions(rows);
      })
      .catch(() => {
        if (!cancelled) setFrenchQuestions([]);
      })
      .finally(() => {
        if (!cancelled) setExamQuestionsLoading(false);
      });
    return () => { cancelled = true; };
  }, [frenchExamBlocked, frenchExamSourceLocale, isFrenchExam, lvl]);

  useEffect(() => {
    setIdx(0);
    setChoices(new Array(questions.length).fill(null));
    setShowAnswer(false);
  }, [questions.length]);

  useEffect(() => {
    let cancelled = false;
    setAccessState('checking');
    setBlockedText('');
    setAccessBlockKind('level');
    let accessTimeout: ReturnType<typeof setTimeout> | null = null;
    const accessCheck = (async () => {
      if (frenchExamBlocked) {
        if (!cancelled) {
          setAccessState('blocked');
          setBlockedText(frenchExamGateCopy('level', lang).body);
        }
        return;
      }
      const noLimits = await isTesterNoLimitsActive();
      if (noLimits) {
        if (!cancelled) setAccessState('allowed');
        return;
      }

      const examLevel = lvl as CourseLevel;
      const lastLessonForLevel = getLastLessonForLevel(examLevel);
      const legacyFreeLessonCap = await readLegacyFreeLessonCap(studyTarget);
      const premiumNow = await getVerifiedPremiumStatus();
      if (!premiumNow && requiresPremiumForLesson(lastLessonForLevel, legacyFreeLessonCap)) {
        if (!cancelled) {
          setAccessBlockKind('premium');
          setBlockedText(triLang(lang, {
            ru: 'Plus откроет уроки уровня и доступ к зачёту. Без Plus доступен A1, уроки открываются последовательно.',
            en: 'Plus unlocks the level lessons and exam access. Without Plus, only A1 is available, unlocked step by step.',
            uk: 'Plus відкриє уроки рівня і доступ до заліку. Без Plus доступний A1, уроки відкриваються послідовно.',
            es: 'Plus abre las lecciones del nivel y el acceso al examen. Sin Plus, A1 está disponible paso a paso.',
            'pt-BR': "O Plus abre as aulas do nível e o acesso ao teste. Sem Plus, o A1 fica disponível passo a passo.",
            vi: "Plus mở các bài học của cấp độ và quyền truy cập vào bài kiểm tra. Không có Plus, A1 mở từng bài theo tiến độ.",
            id: "Plus membuka pelajaran level ini dan akses ke ujian. Tanpa Plus, A1 tersedia bertahap.",
            tr: "Plus, seviyenin derslerini ve sınava erişimi açar. Plus olmadan A1 adım adım kullanılabilir.",
            pl: "Plus odblokowuje lekcje poziomu i dostęp do testu. Bez Plus A1 jest dostępny krok po kroku.",
          }));
          setAccessState('blocked');
        }
        return;
      }

      if (!premiumNow) {
        if (!cancelled) setAccessState('allowed');
        return;
      }

      const reachedLevel = await getPremiumCourseLevel(studyTarget);
      if (getCourseLevelIndex(examLevel) <= getCourseLevelIndex(reachedLevel)) {
        if (!cancelled) setAccessState('allowed');
        return;
      }

      const prevLevel = getPreviousCourseLevel(examLevel);
      if (!cancelled) {
        setAccessBlockKind('level');
        setBlockedText(prevLevel
          ? triLang(lang, {
            ru: `Чтобы открыть уровень ${examLevel}, сначала сдай зачёт ${prevLevel}.`,
            en: `To unlock level ${examLevel}, first pass the ${prevLevel} exam.`,
            uk: `Щоб відкрити рівень ${examLevel}, спочатку склади залік ${prevLevel}.`,
            es: `Para abrir el nivel ${examLevel}, primero supera el examen de ${prevLevel}.`,
            'pt-BR': `Para abrir o nível ${examLevel}, primeiro passe no teste ${prevLevel}.`,
            vi: `Để mở cấp độ ${examLevel}, trước tiên hãy vượt qua bài kiểm tra ${prevLevel}.`,
            id: `Untuk membuka level ${examLevel}, selesaikan dulu ujian ${prevLevel}.`,
            tr: `${examLevel} seviyesini açmak için önce ${prevLevel} sınavını geç.`,
            pl: `Aby odblokować poziom ${examLevel}, najpierw zalicz test ${prevLevel}.`,
          })
          : triLang(lang, {
            ru: 'Этот зачёт пока недоступен.',
            en: 'This exam is not available yet.',
            uk: 'Цей залік поки недоступний.',
            es: 'Este examen todavía no está disponible.',
            'pt-BR': "Este teste ainda não está disponível.",
            vi: "Bài kiểm tra này hiện chưa khả dụng.",
            id: "Ujian ini belum tersedia.",
            tr: "Bu sınav henüz kullanılamıyor.",
            pl: "Ten test nie jest jeszcze dostępny.",
          }));
        setAccessState('blocked');
      }
    })();
    const accessDeadline = new Promise<never>((_, reject) => {
      accessTimeout = setTimeout(
        () => reject(new Error('level_exam_access_timeout')),
        LEVEL_EXAM_ACCESS_TIMEOUT_MS,
      );
    });
    void Promise.race([accessCheck, accessDeadline]).catch(() => {
      if (!cancelled) {
        setAccessBlockKind('error');
        setBlockedText(triLang(lang, {
          ru: 'Доступ к зачёту не проверился. Попробуй открыть его ещё раз.',
          en: 'Could not verify exam access. Try opening it again.',
          uk: 'Не вдалося перевірити доступ до заліку. Спробуй відкрити його ще раз.',
          es: 'No se pudo comprobar el acceso al examen. Inténtalo de nuevo.',
          'pt-BR': "Não foi possível verificar o acesso ao teste. Tente abri-lo de novo.",
          vi: "Không thể kiểm tra quyền truy cập vào bài kiểm tra. Hãy thử mở lại.",
          id: "Tidak dapat memeriksa akses ke ujian. Coba buka lagi.",
          tr: "Sınava erişim kontrol edilemedi. Tekrar açmayı dene.",
          pl: "Nie udało się sprawdzić dostępu do testu. Spróbuj otworzyć go jeszcze raz.",
        }));
        setAccessState('blocked');
        // Keep a late entitlement response from reopening or replacing the fail-closed state.
        cancelled = true;
      }
    }).finally(() => {
      if (accessTimeout) clearTimeout(accessTimeout);
    });
    return () => {
      cancelled = true;
      if (accessTimeout) clearTimeout(accessTimeout);
    };
  }, [frenchExamBlocked, lang, lvl, studyTarget]);

  const levelLabel = LEVEL_LABELS[lvl];
  const title = levelLabel
    ? triLang(lang, {
        ru: levelLabel.ru,
        uk: levelLabel.uk,
        es: levelLabel.es,
        en: levelLabel.en,
        'pt-BR': levelLabel['pt-BR'],
        vi: levelLabel.vi,
        id: levelLabel.id,
        tr: levelLabel.tr,
        pl: levelLabel.pl,
      })
    : triLang(lang, {
        ru: `Зачёт ${lvl}`,
        en: `${lvl} Exam`,
        uk: `Залік ${lvl}`,
        es: `Examen de nivel ${lvl}`,
        'pt-BR': `Teste de nível ${lvl}`,
        vi: `Bài kiểm tra trình độ ${lvl}`,
        id: `Ujian level ${lvl}`,
        tr: `${lvl} seviye sınavı`,
        pl: `Test poziomu ${lvl}`,
      });
  const total = questions.length;
  const q = idx < questions.length ? questions[idx] : undefined;
  const chosen = choices[idx] ?? null;

  const startExam = useCallback(async () => {
    if (examStarting) return; // двойной тап — игнор
    if (frenchExamBlocked) {
      void trackFeatureBlocked('level_exam', 'start', 'exam_content_gate_disabled', { level: lvl, studyTarget }, 'level_exam');
      return;
    }
    if (examQuestionsLoading || questions.length === 0) {
      void trackFeatureBlocked('level_exam', 'start', 'exam_questions_unavailable', {
        level: lvl,
        studyTarget,
        loading: examQuestionsLoading,
      }, 'level_exam');
      return;
    }
    setExamStarting(true);
    try {
      // Энергия: списываем фиксированную сумму ЗА ПОПЫТКУ авансом (как exam.tsx / диагностика).
      let energyCharged = false;
      {
        const energyResult = await confirmSpendAmount(LEVEL_EXAM_ENERGY, levelExamEnergyIntent);
        if (energyResult === 'cancelled') {
          // зачем (координатор 15.10, п.3): отказ списания — тост «Не получилось начать», если экран ещё открыт.
          notifyActivityStartFailed('level_exam', screenOpenRef);
          return;
        }
        if (energyResult === 'insufficient') {
          void trackFeatureBlocked('level_exam', 'start', 'energy_spend_failed', { level: lvl, energy, bonusEnergy, required: LEVEL_EXAM_ENERGY }, 'level_exam');
          setNoEnergy(true);
          return;
        }
        energyCharged = energyResult === 'spent';
      }
      mistakeCaptureRunRef.current = `level-exam-${Date.now().toString(36)}`;
      void acknowledgeSessionStart(levelExamEnergyIntent.operationId);
      void trackFeatureStart('level_exam', 'start', { level: lvl, total: questions.length }, 'level_exam');
      setChoices(new Array(questions.length).fill(null));
      setIdx(0);
      setShowAnswer(false);
      setPhase('quiz');
      if (energyCharged) void acknowledgeSessionStart(levelExamEnergyIntent.operationId);
      // The next press from the result screen is a new paid attempt. Rotate
      // only after this one is durably granted; double taps still share the
      // current in-flight identity.
      setExamEnergyAttemptRevision((current) => current + 1);
    } finally {
      setExamStarting(false);
    }
  }, [acknowledgeSessionStart, bonusEnergy, confirmSpendAmount, energy, examQuestionsLoading, examStarting, frenchExamBlocked, levelExamEnergyIntent, lvl, questions.length, studyTarget]);

  const { flashKey, flash } = useWordFlash();
  const mistakeCaptureRunRef = React.useRef(`level-exam-${Date.now().toString(36)}`);

  const handlePick = (ci: number) => {
    if (chosen !== null) return;
    // Результат ответа: успех на верном, ошибка на неверном
    // (раньше был общий tap без сигнала результата).
    if (q && ci === q.correct) void hapticSuccess(); else void hapticError();
    if (q && ci !== q.correct) {
      const expected = q.opts[q.correct];
      const canonicalTarget = q.type === 'choice4'
        ? expected
        : q.q.replace('___', expected).replace(/\[[^\]]+\]/, expected).replace(/^Correct:\s*/i, '');
      // зачем (22.09): узкий список языков не пускал запись ошибки для
      // испанского и немецкого — экзамен уровня не пополнял «Мои ошибки».
      if (isMistakeStudyTargetValue(studyTarget) && expected) {
        void captureCurrentAccountObjectiveAttempt({
          attemptId: `${mistakeCaptureRunRef.current}:${idx}:${ci}`,
          studyTarget,
          verdict: 'wrong',
          objective: true,
          content: {
            sourceKind: 'level_exam',
            sourceId: `${lvl}:${q.lessonNum}:${q.q}`,
            canonicalTarget,
            sourceMeaning: q.topic,
            lessonId: String(q.lessonNum),
            distractors: q.opts,
          },
          facet: {
            kind: q.q.includes('___') ? 'missing_token' : 'form',
            expected,
          },
        }).catch(noteSwallowedHandler('level_exam:handlePick.captureCurrentAccountObjectiveAttempt'));
      }
    }
    setChoices(prev => { const n = [...prev]; n[idx] = ci; return n; });
    setShowAnswer(true);
  };

  const goNext = () => {
    setShowAnswer(false);
    if (idx + 1 < total) setIdx(i => i + 1);
    else finishExam();
  };

  const finishExam = async () => {
    const correct = choices.filter((c, i) => c !== null && c === questions[i]?.correct).length;
    const pct = Math.round(correct / total * 100);
    // Без ограничений: засчитываем сдачу и открытия, но % и награды «за идеал» — по фактическому счёту
    const noLimits = await isTesterNoLimitsActive();
    const passed = noLimits || pct >= PASS_PCT;
    try {
      const attemptNumber = await recordLevelExamAttempt(lvl, studyTarget);
      setExamAttemptNumber(attemptNumber);
      const [[, previousPctRaw], [, previousPassedRaw]] = await AsyncStorage.multiGet([
        levelExamKey(lvl, 'pct', studyTarget),
        levelExamKey(lvl, 'passed', studyTarget),
      ]);
      const previousPct = Number(previousPctRaw ?? 0);
      const persistedPct = Math.max(Number.isFinite(previousPct) ? previousPct : 0, pct);
      const persistedPassed = storedProgressFlagIsTrue(previousPassedRaw) || passed;
      // Локальный формат 1/0 сохраняет совместимость со старыми клиентами;
      // читатели понимают и его, и канонические cloud-значения true/false. Результат
      // монотонный: пересдача не может понизить лучший процент или снова закрыть
      // уже открытый уровень.
      await AsyncStorage.multiSet([
        [levelExamKey(lvl, 'pct', studyTarget), String(persistedPct)],
        [levelExamKey(lvl, 'passed', studyTarget), persistedPassed ? '1' : '0'],
      ]);
      // При сдаче зачёта открываем следующий уровень.
      if (passed) {
        const nextLevel = getNextCourseLevel(lvl as CourseLevel);
        if (nextLevel) {
          await markPremiumCourseLevelReached(nextLevel, studyTarget);
          await unlockLesson(getFirstLessonForLevel(nextLevel), studyTarget);
        }
      }
      const { newTier, prevTier, newPassCount } = await saveExamProgress(lvl, pct, studyTarget);
      setExamMedalTier(newTier);
      setExamPassCount(newPassCount);
      setMedalImproved(newTier !== prevTier && newTier !== 'none');
      // Gem achievements for exam
      const gemMap: Record<number, 'ruby' | 'emerald' | 'diamond'> = { 2: 'ruby', 3: 'emerald', 4: 'diamond' };
      const gem = gemMap[newPassCount];
      if (gem) checkAchievements({ type: 'gem', level: lvl, gem, studyTarget }).catch(noteSwallowedHandler('level_exam:finishExam.checkAchievements'));
      checkAchievements({ type: 'exam', pct, studyTarget }).catch(noteSwallowedHandler('level_exam:finishExam.checkAchievements_2'));
      void trackFeatureSuccess('level_exam', 'complete', { level: lvl, correct, total, pct, passed }, 'level_exam');
    } catch (e) {
      void trackFeatureError('level_exam', 'complete', e, { level: lvl, correct, total, pct, passed }, 'level_exam');
    }
    soundDirector.request(passed ? 'pm.complete.exam_pass' : 'pm.complete.exam_retry', {
      scope: 'level-exam-result',
      dedupeKey: `${studyTarget}:${lvl}:${pct}`,
    });
    setPhase('result');
  };

  const correctCount = choices.filter((c, i) => c !== null && c === questions[i]?.correct).length;
  const pct = total > 0 ? Math.round(correctCount / total * 100) : 0;
  const passed = pct >= PASS_PCT;
  const [reviewPromptVisible, setReviewPromptVisible] = useState(false);
  const leaveResultAfterReview = useCallback(async () => {
    hapticTap();
    if (await canShowReview({ trigger: 'level_exam_pass', scorePercent: pct, userContinued: true })) {
      setReviewPromptVisible(true);
      return;
    }
    safeRouterBack(router, '/lessons_list' as any);
  }, [pct, router]);

  if (!isFrenchExam && !frenchExamBlocked) {
    return (
      <LevelExamV2
        level={lvl as CourseLevel}
        lang={lang}
        accessState={accessState}
        blockedText={blockedText}
      />
    );
  }

  if (frenchExamBlocked) {
    return (
      <FrenchLevelExamUnavailable
        lang={lang}
        onBack={() => { hapticTap(); safeRouterBack(router, '/lessons_list' as any); }}
        onLessons={() => { hapticTap(); router.replace('/lessons_list' as any); }}
        liquidGlassThemeId={liquidGlassThemeId}
      />
    );
  }

  if (accessState !== 'allowed') {
    const checking = accessState === 'checking';
    const accessCtaLabel = accessBlockKind === 'premium'
      ? triLang(lang, { ru: 'Получить Plus', uk: 'Отримати Plus', en: 'Get Plus', es: 'Obtener Plus', 'pt-BR': "Obter Plus", vi: "Mở Plus", id: "Dapatkan Plus", tr: "Plus al", pl: "Kup Plus" })
      : triLang(lang, { ru: 'К урокам', uk: 'До уроків', en: 'To lessons', es: 'Ir a lecciones', 'pt-BR': "Ir para as aulas", vi: "Đến bài học", id: "Ke pelajaran", tr: "Derslere git", pl: "Do lekcji" });
    return (
      <ScreenGradient artBackdrop="exam">
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <ExamHeader glass={glass} title={title} onBack={() => { hapticTap(); safeRouterBack(router, '/lessons_list' as any); }} />
            <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 60 }}>
              <ExamHero
                glass={glass}
                icon={checking ? 'hourglass-outline' : 'lock-closed-outline'}
                title={checking
                  ? triLang(lang, {
                    ru: 'Проверяем доступ', en: 'Checking access', uk: 'Перевіряємо доступ', es: 'Comprobando acceso',
                    'pt-BR': "Verificando acesso", vi: "Đang kiểm tra quyền truy cập", id: "Memeriksa akses", tr: "Erişim kontrol ediliyor", pl: "Sprawdzanie dostępu",
                  })
                  : title}
                message={checking
                  ? triLang(lang, {
                    ru: 'Секунду, сверяем текущий уровень.', en: 'One second, checking your current level.', uk: 'Секунду, звіряємо поточний рівень.',
                    es: 'Un segundo, estamos comprobando tu nivel actual.', 'pt-BR': "Um segundo, estamos conferindo seu nível atual.",
                    vi: "Chờ một chút, chúng tôi đang kiểm tra cấp độ hiện tại của bạn.", id: "Sebentar, kami sedang memeriksa levelmu saat ini.",
                    tr: "Bir saniye, mevcut seviyeni kontrol ediyoruz.", pl: "Chwileczkę, sprawdzamy Twój aktualny poziom.",
                  })
                  : blockedText}
              />
            </View>
            {!checking && (
              <ExamFooter bottomInset={0}>
                <PracticeCta
                  glass={glass}
                  label={accessCtaLabel}
                  trailingArrow
                  onPress={() => {
                    hapticTap();
                    if (accessBlockKind === 'premium') {
                      const firstLessonForLevel = getFirstLessonForLevel(lvl as CourseLevel);
                      router.push({
                        pathname: '/premium_modal',
                        params: {
                          context: lessonPaywallContext(firstLessonForLevel),
                          source: 'level_exam',
                          lessons_done: '0',
                          ...lessonPurchaseContinuationParams(firstLessonForLevel),
                        },
                      } as any);
                    } else {
                      router.replace('/lessons_list' as any);
                    }
                  }}
                />
              </ExamFooter>
            )}
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── INTRO ────────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    const statTriples = [
      {
        icon: 'reader-outline' as const,
        value: String(INTRO_Q_COUNT),
        cap: triLang(lang, {
          ru: 'ВОПРОСОВ',
          uk: 'ЗАПИТАНЬ',
          en: 'QUESTIONS',
          es: 'PREGUNTAS',
          'pt-BR': "PERGUNTAS",
          vi: "CÂU HỎI",
          id: "PERTANYAAN",
          tr: "SORU",
          pl: "PYTANIA",
        }),
      },
      {
        icon: 'ribbon-outline' as const,
        value: `${PASS_PCT}%`,
        cap: triLang(lang, {
          ru: 'ДЛЯ СДАЧИ',
          uk: 'ДЛЯ ЗДАЧІ',
          en: 'TO PASS',
          es: 'PARA APROBAR',
          'pt-BR': "PARA PASSAR",
          vi: "ĐỂ ĐẠT",
          id: "UNTUK LULUS",
          tr: "GEÇMEK İÇİN",
          pl: "DO ZALICZENIA",
        }),
      },
      {
        icon: 'refresh-circle-outline' as const,
        value: triLang(lang, {
          ru: 'БЕЗ',
          uk: 'БЕЗ',
          en: 'NO',
          es: 'SIN',
          'pt-BR': "SEM",
          vi: "KHÔNG",
          id: "TANPA",
          tr: "YOK",
          pl: "BEZ",
        }),
        cap: triLang(lang, {
          ru: 'ШТРАФА',
          uk: 'ШТРАФУ',
          en: 'PENALTY',
          es: 'PENALIZAR',
          'pt-BR': "PENALIDADE",
          vi: "PHẠT",
          id: "PENALTI",
          tr: "CEZA",
          pl: "KARY",
        }),
      },
    ];
    const introBody = triLang(lang, {
      ru: `${INTRO_Q_COUNT} вопросов по ключевым темам уровня ${lvl}. Чтобы перейти дальше — нужно ${PASS_PCT}% и выше. Не понравился результат? Пройди зачёт снова — без штрафа, лучший результат сохранится.`,
      uk: `${INTRO_Q_COUNT} запитань за ключовими темами рівня ${lvl}. Щоб перейти далі, потрібно набрати щонайменше ${PASS_PCT}%. Якщо результат не влаштує, залік можна пройти повторно — без штрафу, зі збереженням найкращого результату.`,
      en: `${INTRO_Q_COUNT} questions on the key topics of level ${lvl}. You need at least ${PASS_PCT}% to move on. Not happy with the result? Retake the test — no penalty, your best score is kept.`,
      es: `${INTRO_Q_COUNT} preguntas sobre los temas clave del nivel ${lvl}. Para avanzar necesitas al menos un ${PASS_PCT} %. Si quieres mejorar, puedes repetir el examen sin penalización: guardaremos tu mejor resultado.`,
      'pt-BR': `${INTRO_Q_COUNT} perguntas sobre os temas principais do nível ${lvl}. Para avançar, você precisa acertar pelo menos ${PASS_PCT}%. Se quiser melhorar, pode refazer o teste sem penalidade: vamos guardar seu melhor resultado.`,
      vi: `${INTRO_Q_COUNT} câu hỏi về các chủ đề chính của cấp độ ${lvl}. Để đi tiếp, bạn cần đạt ít nhất ${PASS_PCT}%. Nếu muốn cải thiện, bạn có thể làm lại bài kiểm tra không bị phạt; kết quả tốt nhất sẽ được giữ lại.`,
      id: `${INTRO_Q_COUNT} pertanyaan tentang topik utama level ${lvl}. Untuk lanjut, kamu perlu mendapat minimal ${PASS_PCT}%. Jika ingin memperbaiki hasil, kamu bisa mengulang ujian tanpa penalti; hasil terbaikmu akan disimpan.`,
      tr: `${lvl} seviyesinin ana konularından ${INTRO_Q_COUNT} soru. Devam etmek için en az %${PASS_PCT} alman gerekir. Sonucunu iyileştirmek istersen sınavı cezasız tekrar edebilirsin; en iyi sonucun saklanır.`,
      pl: `${INTRO_Q_COUNT} pytań z głównych tematów poziomu ${lvl}. Aby przejść dalej, potrzebujesz co najmniej ${PASS_PCT}%. Jeśli chcesz poprawić wynik, możesz powtórzyć test bez kary; zapiszemy najlepszy rezultat.`,
    });
    // Подсказка про Premium объясняет ФРИ-юзеру, зачем гейт уровней. Для premium-юзера
    // она бессмысленна («у нас и так премиум») — не показываем её, когда доступ уже есть.
    const premiumNote =
      lvl !== 'B2' && !hasPremiumAccess
        ? triLang(lang, {
          ru: 'С Plus все уроки текущего уровня открыты сразу; следующий уровень откроется после сдачи этого зачёта.',
          uk: 'З Plus усі уроки поточного рівня відкриті одразу; наступний рівень відкриється після складання цього заліку.',
          en: 'With Plus, all lessons of the current level are unlocked right away; the next level opens after you pass this test.',
          es: 'Con Plus todas las lecciones del nivel actual están abiertas; el siguiente nivel se abrirá al aprobar este examen.',
          'pt-BR': "Com Plus, todas as aulas do nível atual ficam abertas de uma vez; o próximo nível será aberto depois que você passar neste teste.",
          vi: "Với Plus, tất cả bài học của cấp độ hiện tại được mở ngay; cấp độ tiếp theo sẽ mở sau khi bạn vượt qua bài kiểm tra này.",
          id: "Dengan Plus, semua pelajaran di level saat ini langsung terbuka; level berikutnya akan terbuka setelah kamu lulus ujian ini.",
          tr: "Plus ile mevcut seviyenin tüm dersleri hemen açılır; bir sonraki seviye bu sınavı geçtikten sonra açılır.",
          pl: "Z Plus wszystkie lekcje obecnego poziomu są od razu otwarte; następny poziom odblokuje się po zaliczeniu tego testu.",
        })
        : null;

    return (
      <ScreenGradient artBackdrop="exam">
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <ExamHeader glass={glass} title={title} onBack={() => { hapticTap(); safeRouterBack(router, '/lessons_list' as any); }} />
            <BouncyScrollView decelerationRate="fast" style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 24 }}>
              <ExamHero glass={glass} icon="ribbon-outline" title={title} message={introBody} />
              <ExamStatRow
                glass={glass}
                items={statTriples.map((st) => ({ value: st.value, label: st.cap.toLocaleLowerCase() }))}
              />
              {premiumNote ? <ExamKvCard glass={glass} note={premiumNote} style={{ marginTop: 18 }} /> : null}
              <View style={{ alignItems: 'center', marginTop: 18 }}>
                <ReportErrorButton
                  screen="level_exam"
                  dataId={`level_exam_intro_${lvl}`}
                  dataText={triLang(lang, {
                    ru: `Зачёт уровня ${lvl}: вступление`,
                    uk: `Залік рівня ${lvl}: вступ`,
                    en: `Level ${lvl} test: intro`,
                    es: `Examen de nivel ${lvl}: intro`,
                    'pt-BR': `Teste de nível ${lvl}: introdução`,
                    vi: `Bài kiểm tra trình độ ${lvl}: mở đầu`,
                    id: `Ujian level ${lvl}: pengantar`,
                    tr: `${lvl} seviye sınavı: giriş`,
                    pl: `Test poziomu ${lvl}: wstęp`,
                  })}
                  textColor={sx.muted}
                />
              </View>
            </BouncyScrollView>
            {/* зачем (PM-086): ценник энергии на кнопке убран — сам расход энергии не менялся. */}
            <ExamFooter bottomInset={0}>
              <PracticeCta
                glass={glass}
                label={triLang(lang, { ru: 'Начать зачёт', uk: 'Почати залік', en: 'Start the test', es: 'Empezar examen', 'pt-BR': "Começar teste", vi: "Bắt đầu bài kiểm tra", id: "Mulai ujian", tr: "Sınava başla", pl: "Rozpocznij test" })}
                trailingArrow
                disabled={examStarting}
                onPress={() => { hapticTap(); void startExam(); }}
              />
            </ExamFooter>
          </ContentWrap>
          <NoEnergyModal variant="learn" visible={noEnergy} onClose={() => setNoEnergy(false)} activity="level_exam" />
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const wrongItems = questions
      .map((qu, i) => ({ q: qu, chosen: choices[i] ?? null, correct: qu?.correct ?? -1 }))
      .filter(x => x.q && x.chosen !== x.correct);
    const attemptWord = triLang(lang, { ru: 'попытка', uk: 'спроба', en: 'attempt', es: 'intento', 'pt-BR': 'tentativa', vi: 'lần thử', id: 'percobaan', tr: 'deneme', pl: 'podejście' });
    const accuracyWord = triLang(lang, { ru: 'точность', uk: 'точність', en: 'accuracy', es: 'precisión', 'pt-BR': 'precisão', vi: 'chính xác', id: 'akurasi', tr: 'doğruluk', pl: 'trafność' });
    const ofWord = triLang(lang, { ru: `из ${total}`, uk: `з ${total}`, en: `of ${total}`, es: `de ${total}`, 'pt-BR': `de ${total}`, vi: `/ ${total}`, id: `dari ${total}`, tr: `/ ${total}`, pl: `z ${total}` });
    const toLessonsLabel = triLang(lang, { ru: 'К урокам', uk: 'До уроків', en: 'Back to lessons', es: 'Volver a las lecciones', 'pt-BR': "Voltar às aulas", vi: "Quay lại bài học", id: "Kembali ke pelajaran", tr: "Derslere dön", pl: "Wróć do lekcji" });
    const retryLabel = triLang(lang, { ru: 'Попробовать ещё раз', uk: 'Спробувати ще раз', en: 'Try again', es: 'Intentar de nuevo', 'pt-BR': "Tentar de novo", vi: "Thử lại", id: "Coba lagi", tr: "Tekrar dene", pl: "Spróbuj ponownie" });
    const resultMessage = !passed
      ? triLang(lang, {
        ru: `Ниже ${PASS_PCT}% зачёт не засчитан — вернись к «Теории», «Словарю» и «Формам глаголов» по слабым местам.`,
        uk: `Нижче ${PASS_PCT}% залік не зараховано — повернись до «Теорії», «Словника» й форм дієслів за слабкими місцями.`,
        en: `Below ${PASS_PCT}% the test doesn't count as passed — go back to "Theory", "Vocabulary" and "Verb forms" for your weak spots.`,
        es: `Por debajo del ${PASS_PCT} % no hay aprobado: repasa «Teoría», «Vocabulario» y verbos en los temas fallidos.`,
        'pt-BR': `Abaixo de ${PASS_PCT}%, o teste não conta como aprovado — volte a "Teoria", "Vocabulário" e "Formas verbais" nos temas em que errou.`,
        vi: `Dưới ${PASS_PCT}% thì chưa đạt: hãy quay lại "Lý thuyết", "Từ vựng" và "Dạng động từ" ở các chủ đề bị sai.`,
        id: `Di bawah ${PASS_PCT}%, ujian belum lulus — kembali ke "Teori", "Kosakata", dan "Bentuk kata kerja" pada topik yang salah.`,
        tr: `%${PASS_PCT} altı geçerli sayılmaz — hata yaptığın konularda "Teori", "Kelime" ve "Fiil formları" bölümlerine dön.`,
        pl: `Poniżej ${PASS_PCT}% test nie jest zaliczony — wróć do "Teorii", "Słownika" i "Form czasowników" przy tematach z błędami.`,
      })
      : pct >= 90
        ? triLang(lang, {
          ru: 'Отлично по темам уровня — закрепи слабые уроки, чтобы удерживать планку.',
          uk: 'Чудово за темами рівня — закріплюй слабкі уроки, щоб тримати планку.',
          en: 'Great on the level topics — reinforce your weaker lessons to keep it up.',
          es: 'Muy bien por temas del nivel: refuerza lecciones flojas para mantener el ritmo.',
          'pt-BR': "Muito bem nos temas do nível: reforce as aulas mais fracas para manter o ritmo.",
          vi: "Bạn làm rất tốt ở các chủ đề của cấp độ này: hãy củng cố các bài còn yếu để giữ nhịp.",
          id: "Bagus sekali untuk topik level ini: perkuat pelajaran yang masih lemah agar ritmenya terjaga.",
          tr: "Seviye konularında çok iyi: tempoyu korumak için zayıf dersleri pekiştir.",
          pl: "Bardzo dobrze z tematów tego poziomu: utrwal słabsze lekcje, żeby utrzymać formę.",
        })
        // зачем (Сверка learn-091 K6, макет learn.html): текст сданного зачёта <90 % — «закрепи слабые уроки…»; подсказка про золото вынесена в кнопку «Пересдать на 90%+»
        : triLang(lang, {
          ru: 'Отлично по темам уровня — закрепи слабые уроки, чтобы двигаться дальше уверенно.',
          uk: 'Чудово за темами рівня — закріпи слабкі уроки, щоб рухатися далі впевнено.',
          en: 'Great on the level topics — reinforce your weaker lessons to move on with confidence.',
          es: 'Muy bien por temas del nivel: refuerza las lecciones más flojas para avanzar con seguridad.',
          'pt-BR': 'Muito bem nos temas do nível: reforce as aulas mais fracas para avançar com segurança.',
          vi: 'Bạn làm rất tốt ở các chủ đề của cấp độ này: hãy củng cố các bài còn yếu để tiến tiếp thật vững.',
          id: 'Bagus sekali untuk topik level ini: perkuat pelajaran yang masih lemah agar melangkah dengan percaya diri.',
          tr: 'Seviye konularında çok iyi: ilerlemek için zayıf dersleri pekiştir.',
          pl: 'Bardzo dobrze z tematów tego poziomu: utrwal słabsze lekcje, żeby iść dalej pewnie.',
        });
    return (
      <>
      <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <ExamHeader glass={glass} title={title} onBack={() => { hapticTap(); safeRouterBack(router, '/lessons_list' as any); }} />
          <BouncyScrollView decelerationRate="fast" style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 24 }}>
            <ExamHero
              glass={glass}
              icon={passed ? 'ribbon-outline' : 'refresh-outline'}
              title={passed ? triLang(lang, { ru: `Зачёт ${lvl} сдан`, uk: `Залік ${lvl} складено`, en: `${lvl} test passed`, es: `Examen ${lvl} aprobado`, 'pt-BR': `Teste ${lvl} aprovado`, vi: `Đã đạt bài kiểm tra ${lvl}`, id: `Ujian ${lvl} lulus`, tr: `${lvl} sınavı geçildi`, pl: `Test ${lvl} zaliczony` }) : triLang(lang, { ru: 'Пока не сдан', uk: 'Поки не складено', en: 'Not passed yet', es: 'Aún no aprobado', 'pt-BR': 'Ainda não aprovado', vi: 'Chưa đạt', id: 'Belum lulus', tr: 'Henüz geçilmedi', pl: 'Jeszcze niezaliczony' })}
              message={resultMessage}
            />
            {/* медаль показываем только когда она реально улучшилась — это уже существующая механика экзамена */}
            {medalImproved && examMedalTier !== 'none' && MEDAL_IMAGES_EXAM[examMedalTier] ? (
              <View style={{ alignItems: 'center', marginTop: 18 }}>
                <Image source={MEDAL_IMAGES_EXAM[examMedalTier]} style={{ width: 72, height: 72 }} contentFit="contain" />
                <Text style={{ color: glass.text, fontSize: 16, fontWeight: '600', marginTop: 6 }}>
                  {examMedalTier === 'gold'
                    ? triLang(lang, { ru: 'Золото!', uk: 'Золото!', en: 'Gold!', es: '¡Oro!', 'pt-BR': "Ouro!", vi: "Vàng!", id: "Emas!", tr: "Altın!", pl: "Złoto!" })
                    : triLang(lang, { ru: 'Новая медаль!', uk: 'Нова медаль!', en: 'New medal!', es: '¡Nueva medalla!', 'pt-BR': "Nova medalha!", vi: "Huy chương mới!", id: "Medali baru!", tr: "Yeni madalya!", pl: "Nowy medal!" })}
                </Text>
              </View>
            ) : null}
            <ExamStatRow
              glass={glass}
              items={[
                { value: String(correctCount), label: ofWord },
                { value: `${pct}%`, label: accuracyWord },
                { value: `№ ${examAttemptNumber}`, label: attemptWord },
              ]}
            />

            {/* Ошибки */}
            {wrongItems.length > 0 && (
              <View style={[examCardStyle(glass), { marginTop: 18, paddingHorizontal: 16, paddingVertical: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ flex: 1, color: glass.text, fontSize: 16, fontWeight: '700' }}>
                    {triLang(lang, { ru: 'Что разобрать', uk: 'Що розібрати', en: 'What to review', es: 'Qué repasar', 'pt-BR': "Erros", vi: "Lỗi sai", id: "Kesalahan", tr: "Hatalar", pl: "Błędy" })}
                  </Text>
                  <Text style={{ color: glass.secondary, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{wrongItems.length}</Text>
                </View>
                {wrongItems.map((item, i) => (
                  <View key={i} style={{ paddingVertical: 12, gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: glass.line }}>
                    <Text style={{ color: glass.secondary, fontSize: 13, fontWeight: '600' }}>
                      {triLang(lang, {
                        ru: item.q.topic ?? '',
                        uk: item.q.topicUK ?? '',
                        en: levelTopicEn(item.q),
                        es: item.q.topicES ?? '',
                        'pt-BR': levelTopicPlanned(item.q, 'pt-BR'),
                        vi: levelTopicPlanned(item.q, 'vi'),
                        id: levelTopicPlanned(item.q, 'id'),
                        tr: levelTopicPlanned(item.q, 'tr'),
                        pl: levelTopicPlanned(item.q, 'pl'),
                      })}
                    </Text>
                    <ClozeGapText text={item.q.q ?? ''} style={{ color: glass.text, fontSize: 16, lineHeight: 22 }} />
                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                      {item.chosen !== null && item.chosen !== undefined && (
                        <Text style={{ color: t.wrong, fontSize: 16 }}>
                          ✗ {item.q.opts?.[item.chosen] ?? '—'}
                        </Text>
                      )}
                      <Text style={{ color: t.correct, fontSize: 16 }}>
                        ✓ {item.q.opts?.[item.correct] ?? '—'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <ReportErrorButton
                screen="level_exam"
                dataId={`level_exam_result_${lvl}_${pct}`}
                dataText={triLang(lang, {
                  ru: `Зачёт ${lvl}: результат ${pct}%`,
                  uk: `Залік ${lvl}: результат ${pct}%`,
                  en: `${lvl} test: score ${pct}%`,
                  es: `Examen ${lvl}: resultado ${pct}%`,
                  'pt-BR': `Teste ${lvl}: resultado ${pct}%`,
                  vi: `Bài kiểm tra ${lvl}: kết quả ${pct}%`,
                  id: `Ujian ${lvl}: hasil ${pct}%`,
                  tr: `${lvl} sınavı: sonuç %${pct}`,
                  pl: `Test ${lvl}: wynik ${pct}%`,
                })}
                textColor={sx.muted}
              />
            </View>
          </BouncyScrollView>
          {/* зачем (PM-086): ценник энергии на кнопке убран — сам расход энергии не менялся. */}
          <ExamFooter bottomInset={0}>
            {passed ? (
              <>
                <PracticeCta glass={glass} label={toLessonsLabel} trailingArrow onPress={() => { void leaveResultAfterReview(); }} />
                <ExamQuietButton
                  glass={glass}
                  label={pct < 90
                    ? triLang(lang, { ru: 'Пересдать на 90%+', uk: 'Перездати на 90%+', en: 'Retake for 90%+', es: 'Repetir para 90 %+', 'pt-BR': 'Refazer para 90%+', vi: 'Làm lại để đạt 90%+', id: 'Ulangi untuk 90%+', tr: '%90+ için tekrar dene', pl: 'Powtórz na 90%+' })
                    : retryLabel}
                  onPress={() => { hapticTap(); void startExam(); }}
                />
              </>
            ) : (
              <>
                <PracticeCta glass={glass} label={retryLabel} trailingArrow onPress={() => { hapticTap(); void startExam(); }} />
                <ExamQuietButton glass={glass} label={toLessonsLabel} onPress={() => { void leaveResultAfterReview(); }} />
              </>
            )}
          </ExamFooter>
        </ContentWrap>
        <NoEnergyModal variant="learn" visible={noEnergy} onClose={() => setNoEnergy(false)} activity="level_exam" />
      </SafeAreaView>
      </ScreenGradient>
      </>
    );
  }

  // ── QUIZ ─────────────────────────────────────────────────────────────────────
  if (!q) return null;

  const progressPct = Math.round((idx + 1) / total * 100);
  const nextLabel = idx + 1 < total
    ? triLang(lang, { ru: 'Следующий вопрос', uk: 'Наступне питання', en: 'Next question', es: 'Siguiente pregunta', 'pt-BR': "Próximo", vi: "Tiếp theo", id: "Berikutnya", tr: "İleri", pl: "Dalej" })
    : triLang(lang, { ru: 'Завершить', uk: 'Завершити', en: 'Finish', es: 'Terminar', 'pt-BR': "Finalizar", vi: "Hoàn thành", id: "Selesai", tr: "Bitir", pl: "Zakończ" });
  const lessonWord = triLang(lang, { ru: 'Урок', uk: 'Урок', en: 'Lesson', es: 'Lección', 'pt-BR': "Aula", vi: "Bài học", id: "Pelajaran", tr: "Ders", pl: "Lekcja" });
  return (
    <ScreenGradient artBackdrop="exam">
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
        <ExamHeader
          glass={glass}
          title={title}
          subtitle={`${idx + 1} / ${total}`}
          onBack={() => { hapticTap(); setExitExamConfirm(true); }}
        />
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <ExamTrack glass={glass} ratio={(idx + 1) / Math.max(1, total)} />
        </View>

        <BouncyScrollView decelerationRate="fast" style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24 }}>
          {/* Топик и номер урока (`.qhead`) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 34 }}>
            <Text style={{ flexShrink: 1, color: glass.secondary, fontSize: 13, lineHeight: 18, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600' }}>
              {triLang(lang, {
                ru: q.topic,
                uk: q.topicUK,
                en: levelTopicEn(q),
                es: q.topicES,
                'pt-BR': levelTopicPlanned(q, 'pt-BR'),
                vi: levelTopicPlanned(q, 'vi'),
                id: levelTopicPlanned(q, 'id'),
                tr: levelTopicPlanned(q, 'tr'),
                pl: levelTopicPlanned(q, 'pl'),
              })}
            </Text>
            <Text style={{ color: glass.secondary, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{lessonWord} {q.lessonNum}</Text>
          </View>

          {/* Вопрос */}
          <View style={[examCardStyle(glass), { marginTop: 14, paddingVertical: 22, paddingHorizontal: 22 }]}>
            <ClozeGapText text={q.q} style={{ color: glass.text, fontSize: 24, fontWeight: '600', lineHeight: 30 }} />
          </View>

          {/* Варианты ответов */}
          <View style={{ gap: 10, marginTop: 18 }}>
            {(q.opts ?? []).map((opt, ci) => {
              const on = flashKey === `${ci}`;
              const isChosen  = chosen === ci;
              const isOptCorrect = ci === q.correct;
              let state: ExamOptionState = on ? 'pressed' : 'idle';
              if (!on && showAnswer && isOptCorrect) state = 'ok';
              if (!on && showAnswer && isChosen && !isOptCorrect) state = 'no';
              return (
                <ExamOption
                  key={ci}
                  glass={glass}
                  label={opt}
                  state={state}
                  okColor={t.correct}
                  okBg={t.correctBg ?? glass.opaqueCard}
                  noColor={t.wrong}
                  noBg={t.wrongBg ?? glass.opaqueCard}
                  onPress={() => { flash(`${ci}`); handlePick(ci); }}
                  disabled={chosen !== null}
                />
              );
            })}
          </View>
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <ReportErrorButton
              screen="level_exam"
              dataId={`level_exam_${lvl}_q${idx}_L${q.lessonNum}`}
              dataText={`${q.q ?? ''}`.slice(0, 120)}
              textColor={sx.muted}
            />
          </View>
        </BouncyScrollView>
        {showAnswer ? (
          <ExamFooter bottomInset={0}>
            <PracticeCta glass={glass} label={nextLabel} trailingArrow onPress={() => { hapticTap(); goNext(); }} />
          </ExamFooter>
        ) : null}
      </ContentWrap>
      <ThemedConfirmModal
        visible={exitExamConfirm}
        title={triLang(lang, {
          ru: 'Выйти?',
          uk: 'Вийти?',
          en: 'Leave?',
          es: '¿Salir del examen?',
          'pt-BR': "Sair do teste?",
          vi: "Thoát bài kiểm tra?",
          id: "Keluar dari ujian?",
          tr: "Sınavdan çıkılsın mı?",
          pl: "Wyjść z testu?",
        })}
        message={triLang(lang, {
          ru: 'Зачёт начнётся заново',
          uk: 'Залік почнеться заново',
          en: 'Your progress on this test will be lost.',
          es: 'El examen empezará de nuevo.',
          'pt-BR': "O progresso deste teste será perdido.",
          vi: "Tiến trình bài kiểm tra sẽ bị mất.",
          id: "Progres ujian ini akan hilang.",
          tr: "Bu sınavdaki ilerlemen kaybolacak.",
          pl: "Postęp w tym teście zostanie utracony.",
        })}
        cancelLabel={triLang(lang, {
          ru: 'Отмена',
          uk: 'Скасувати',
          en: 'Cancel',
          es: 'Cancelar',
          'pt-BR': "Cancelar",
          vi: "Hủy",
          id: "Batal",
          tr: "İptal",
          pl: "Anuluj",
        })}
        confirmLabel={triLang(lang, {
          ru: 'Выйти',
          uk: 'Вийти',
          en: 'Leave',
          es: 'Salir',
          'pt-BR': "Sair",
          vi: "Thoát",
          id: "Keluar",
          tr: "Çık",
          pl: "Wyjdź",
        })}
        onCancel={() => setExitExamConfirm(false)}
        onConfirm={() => {
          setExitExamConfirm(false);
          safeRouterBack(router, '/lessons_list' as any);
        }}
        confirmVariant="accent"
      />
      <ReviewPromptModal
        visible={reviewPromptVisible}
        context="level_exam_pass"
        lang={lang}
        onClose={() => {
          setReviewPromptVisible(false);
          safeRouterBack(router, '/lessons_list' as any);
        }}
      />
    </SafeAreaView>
    </ScreenGradient>
  );
}
