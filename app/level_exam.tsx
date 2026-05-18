import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type PlannedInterfaceLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import ReportErrorButton from '../components/ReportErrorButton';
import ClozeGapText from '../components/ClozeGapText';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { checkAchievements } from './achievements';
import { saveExamProgress, type MedalTier } from './medal_utils';
import { getPremiumCourseLevel, markPremiumCourseLevelReached, unlockLesson } from './lesson_lock_system';
import { addShards, awardOneTime } from './shards_system';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import GoldBevel from '../components/GoldBevel';
import { buildLevelExamEnglish, buildLevelExamHintPair, recordMistake } from './active_recall';
import { trackFeatureError, trackFeatureStart, trackFeatureSuccess } from './app_activity';
import { logMistake } from './mistake_log';
import { resolveChoiceMistakeToken, resolvePhraseMistakeToken } from './mistake_token_resolver';
import { isUserFacingCategory, normalizeWordCategory, type WordCategory } from './pos_taxonomy';
import { getCourseLevelIndex, getFirstLessonForLevel, getNextCourseLevel, getPreviousCourseLevel, type CourseLevel } from './course_levels';
import { getVerifiedPremiumStatus } from './premium_guard';
import { lessonPaywallContext } from './monetization_policy';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';

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

function levelTopicPlanned(q: LevelQ, locale: PlannedInterfaceLang): string {
  return LEVEL_TOPIC_PLANNED[q.topicES]?.[locale] ?? q.topicES;
}

function levelExamCategory(q: LevelQ, token?: string): WordCategory | undefined {
  const category = normalizeWordCategory(`${q.topic} ${q.topicUK} ${q.topicES}`, token).category;
  return isUserFacingCategory(category) ? category : undefined;
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
  {lessonNum:6,topic:'Специальные вопросы',topicUK:'Спеціальні питання',topicES:'Preguntas con wh-',q:'___ are you?',opts:['Where','How','What','Who'],correct:1},
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
  {lessonNum:23,topic:'Passive Voice',topicUK:'Passive Voice',topicES:'Voz pasiva',q:'The report ___ submitted by Friday.',opts:['must be','must have','should','is going'],correct:0},
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
  {lessonNum:26,topic:'Условные предложения (if)',topicUK:'Умовні речення (if)',topicES:'Oraciones condicionales (if)',q:'If she had tried, she ___ passed.',opts:['will have','would have','had','did'],correct:1},
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

const LEVEL_LABELS: Record<string, { ru: string; uk: string; es: string } & Record<PlannedInterfaceLang, string>> = {
  A1: { ru: 'Зачёт A1', uk: 'Залік A1', es: 'Examen de nivel A1', 'pt-BR': 'Teste de nível A1', vi: 'Bài kiểm tra trình độ A1', id: 'Ujian level A1', tr: 'A1 seviye sınavı', pl: 'Test poziomu A1' },
  A2: { ru: 'Зачёт A2', uk: 'Залік A2', es: 'Examen de nivel A2', 'pt-BR': 'Teste de nível A2', vi: 'Bài kiểm tra trình độ A2', id: 'Ujian level A2', tr: 'A2 seviye sınavı', pl: 'Test poziomu A2' },
  B1: { ru: 'Зачёт B1', uk: 'Залік B1', es: 'Examen de nivel B1', 'pt-BR': 'Teste de nível B1', vi: 'Bài kiểm tra trình độ B1', id: 'Ujian level B1', tr: 'B1 seviye sınavı', pl: 'Test poziomu B1' },
  B2: { ru: 'Зачёт B2', uk: 'Залік B2', es: 'Examen de nivel B2', 'pt-BR': 'Teste de nível B2', vi: 'Bài kiểm tra trình độ B2', id: 'Ujian level B2', tr: 'B2 seviye sınavı', pl: 'Test poziomu B2' },
};

const PASS_PCT = 70; // минимум % для сдачи

/** Премиальный тон интро-экрана зачёта (как «дорогой» тёмный макет). */
const LX = {
  screen: '#121212',
  card: '#1C1D22',
  cardLine: 'rgba(232, 199, 111, 0.22)',
  gold: '#E8C76F',
  goldSoft: 'rgba(232, 199, 111, 0.14)',
  ink: '#141109',
};

const INTRO_Q_COUNT = 30;

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function LevelExam() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const isGoldTheme = themeMode === 'gold';
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();
  const { level } = useLocalSearchParams<{ level: string }>();
  const validLevels = ['A1', 'A2', 'B1', 'B2'];
  const lvl = validLevels.includes(level) ? level : 'A1';

  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState<(number | null)[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [examMedalTier, setExamMedalTier] = useState<MedalTier>('none');
  const [examPassCount, setExamPassCount] = useState(0);
  const [medalImproved, setMedalImproved] = useState(false);
  const [exitExamConfirm, setExitExamConfirm] = useState(false);
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'blocked'>('checking');
  const [blockedText, setBlockedText] = useState('');
  const [accessBlockKind, setAccessBlockKind] = useState<'premium' | 'level' | 'error'>('level');

  const questions = useMemo(() => {
    const [from, to] = LEVEL_RANGES[lvl] ?? [1, 8];
    return QUESTION_POOL.filter(q => q.lessonNum >= from && q.lessonNum <= to);
  }, [lvl]);

  useEffect(() => {
    let cancelled = false;
    setAccessState('checking');
    setBlockedText('');
    setAccessBlockKind('level');
    void (async () => {
      const noLimits = await AsyncStorage.getItem('tester_no_limits');
      if (noLimits === 'true') {
        if (!cancelled) setAccessState('allowed');
        return;
      }

      const premiumNow = await getVerifiedPremiumStatus();
      if (!premiumNow) {
        if (!cancelled) {
          setAccessBlockKind('premium');
          setBlockedText(triLang(lang, {
            ru: 'Premium откроет уроки уровня и доступ к зачёту. Без Premium доступны только первые 3 урока.',
            uk: 'Premium відкриє уроки рівня і доступ до заліку. Без Premium доступні лише перші 3 уроки.',
            es: 'Premium abre las lecciones del nivel y el acceso al examen. Sin Premium solo están disponibles las 3 primeras lecciones.',
            'pt-BR': "O Premium abre as aulas do nível e o acesso ao teste. Sem Premium, só as 3 primeiras aulas ficam disponíveis.",
            vi: "Premium mở các bài học của cấp độ và quyền truy cập vào bài kiểm tra. Không có Premium, chỉ 3 bài học đầu tiên khả dụng.",
            id: "Premium membuka pelajaran level ini dan akses ke ujian. Tanpa Premium, hanya 3 pelajaran pertama yang tersedia.",
            tr: "Premium, seviyenin derslerini ve sınava erişimi açar. Premium olmadan yalnızca ilk 3 ders kullanılabilir.",
            pl: "Premium odblokowuje lekcje poziomu i dostęp do testu. Bez Premium dostępne są tylko pierwsze 3 lekcje.",
          }));
          setAccessState('blocked');
        }
        return;
      }

      const reachedLevel = await getPremiumCourseLevel();
      const examLevel = lvl as CourseLevel;
      if (getCourseLevelIndex(examLevel) <= getCourseLevelIndex(reachedLevel)) {
        if (!cancelled) setAccessState('allowed');
        return;
      }

      const prevLevel = getPreviousCourseLevel(examLevel);
      if (!cancelled) {
        setAccessBlockKind('level');
        setBlockedText(prevLevel
          ? triLang(lang, {
            ru: `Чтобы открыть уровень ${examLevel}, сначала сдайте зачёт ${prevLevel}.`,
            uk: `Щоб відкрити рівень ${examLevel}, спочатку складіть залік ${prevLevel}.`,
            es: `Para abrir el nivel ${examLevel}, primero supera el examen de ${prevLevel}.`,
            'pt-BR': `Para abrir o nível ${examLevel}, primeiro passe no teste ${prevLevel}.`,
            vi: `Để mở cấp độ ${examLevel}, trước tiên hãy vượt qua bài kiểm tra ${prevLevel}.`,
            id: `Untuk membuka level ${examLevel}, selesaikan dulu ujian ${prevLevel}.`,
            tr: `${examLevel} seviyesini açmak için önce ${prevLevel} sınavını geç.`,
            pl: `Aby odblokować poziom ${examLevel}, najpierw zalicz test ${prevLevel}.`,
          })
          : triLang(lang, {
            ru: 'Этот зачёт пока недоступен.',
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
    })().catch(() => {
      if (!cancelled) {
        setAccessBlockKind('error');
        setBlockedText(triLang(lang, {
          ru: 'Не удалось проверить доступ к зачёту. Попробуйте открыть его ещё раз.',
          uk: 'Не вдалося перевірити доступ до заліку. Спробуйте відкрити його ще раз.',
          es: 'No se pudo comprobar el acceso al examen. Inténtalo de nuevo.',
          'pt-BR': "Não foi possível verificar o acesso ao teste. Tente abri-lo de novo.",
          vi: "Không thể kiểm tra quyền truy cập vào bài kiểm tra. Hãy thử mở lại.",
          id: "Tidak dapat memeriksa akses ke ujian. Coba buka lagi.",
          tr: "Sınava erişim kontrol edilemedi. Tekrar açmayı dene.",
          pl: "Nie udało się sprawdzić dostępu do testu. Spróbuj otworzyć go jeszcze raz.",
        }));
        setAccessState('blocked');
      }
    });
    return () => { cancelled = true; };
  }, [lang, lvl]);

  const levelLabel = LEVEL_LABELS[lvl];
  const title = levelLabel
    ? triLang(lang, {
        ru: levelLabel.ru,
        uk: levelLabel.uk,
        es: levelLabel.es,
        'pt-BR': levelLabel['pt-BR'],
        vi: levelLabel.vi,
        id: levelLabel.id,
        tr: levelLabel.tr,
        pl: levelLabel.pl,
      })
    : triLang(lang, {
        ru: `Зачёт ${lvl}`,
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

  const startExam = useCallback(() => {
    void trackFeatureStart('level_exam', 'start', { level: lvl, total: questions.length }, 'level_exam');
    setChoices(new Array(questions.length).fill(null));
    setIdx(0);
    setShowAnswer(false);
    setPhase('quiz');
  }, [questions.length, lvl]);

  const handlePick = (ci: number) => {
    if (chosen !== null) return;
    hapticTap();
    if (q && ci !== q.correct) {
      const hints = buildLevelExamHintPair(q);
      const phrase = buildLevelExamEnglish(q);
      const expected = q.opts[q.correct];
      const picked = q.opts[ci];
      const resolvedToken = q.type === 'choice4'
        ? resolveChoiceMistakeToken(phrase, picked, q.topic)
        : resolvePhraseMistakeToken(phrase, picked, q.topic);
      const tokenMetaBase = q.q.includes('___') && expected
        ? { tokenText: expected, expected, picked, rawCategory: q.topic }
        : {
            ...(resolvedToken ?? { expected }),
            rawCategory: q.topic,
          };
      const category = levelExamCategory(q, tokenMetaBase.tokenText || tokenMetaBase.expected);
      const tokenMeta = { ...tokenMetaBase, category };
      void recordMistake(
        phrase,
        hints.ru,
        q.lessonNum,
        hints.uk,
        'exam',
        undefined,
        tokenMeta,
      );
      logMistake(
        phrase,
        q.lessonNum,
        'exam',
        'wrong_pick',
        tokenMeta,
      );
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
    const noLimits = await AsyncStorage.getItem('tester_no_limits');
    const passed = noLimits === 'true' || pct >= PASS_PCT;
    try {
      await AsyncStorage.setItem(`level_exam_${lvl}_pct`, String(pct));
      await AsyncStorage.setItem(`level_exam_${lvl}_passed`, passed ? '1' : '0');
      // При сдаче зачёта открываем следующий уровень.
      if (passed) {
        const nextLevel = getNextCourseLevel(lvl as CourseLevel);
        if (nextLevel) {
          await markPremiumCourseLevelReached(nextLevel);
          await unlockLesson(getFirstLessonForLevel(nextLevel));
        }
        addShards('lesson_quiz_passed').catch(() => {});
      }
      if (pct >= 90) awardOneTime('exam_excellent').catch(() => {});
      const { newTier, prevTier, newPassCount } = await saveExamProgress(lvl, pct);
      setExamMedalTier(newTier);
      setExamPassCount(newPassCount);
      setMedalImproved(newTier !== prevTier && newTier !== 'none');
      // Gem achievements for exam
      const gemMap: Record<number, 'ruby' | 'emerald' | 'diamond'> = { 2: 'ruby', 3: 'emerald', 4: 'diamond' };
      const gem = gemMap[newPassCount];
      if (gem) checkAchievements({ type: 'gem', level: lvl, gem } as any).catch(() => {});
      checkAchievements({ type: 'exam', pct }).catch(() => {});
      void trackFeatureSuccess('level_exam', 'complete', { level: lvl, correct, total, pct, passed }, 'level_exam');
    } catch (e) {
      void trackFeatureError('level_exam', 'complete', e, { level: lvl, correct, total, pct, passed }, 'level_exam');
    }
    setPhase('result');
  };

  const correctCount = choices.filter((c, i) => c !== null && c === questions[i]?.correct).length;
  const pct = total > 0 ? Math.round(correctCount / total * 100) : 0;
  const passed = pct >= PASS_PCT;

  if (accessState !== 'allowed') {
    const checking = accessState === 'checking';
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: LX.screen }}>
        <ContentWrap>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: LX.cardLine,
            }}
          >
            <TouchableOpacity onPress={() => { hapticTap(); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
            <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: LX.card, borderWidth: 1, borderColor: LX.cardLine, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
              <Ionicons name={checking ? 'hourglass-outline' : 'lock-closed-outline'} size={38} color={LX.gold} />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
              {checking
                ? triLang(lang, {
                  ru: 'Проверяем доступ',
                  uk: 'Перевіряємо доступ',
                  es: 'Comprobando acceso',
                  'pt-BR': "Verificando acesso",
                  vi: "Đang kiểm tra quyền truy cập",
                  id: "Memeriksa akses",
                  tr: "Erişim kontrol ediliyor",
                  pl: "Sprawdzanie dostępu",
                })
                : title}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.74)', fontSize: f.bodyLg, lineHeight: 24, textAlign: 'center', marginBottom: 26 }}>
              {checking
                ? triLang(lang, {
                  ru: 'Секунду, сверяем текущий уровень.',
                  uk: 'Секунду, звіряємо поточний рівень.',
                  es: 'Un segundo, estamos comprobando tu nivel actual.',
                  'pt-BR': "Um segundo, estamos conferindo seu nível atual.",
                  vi: "Chờ một chút, chúng tôi đang kiểm tra cấp độ hiện tại của bạn.",
                  id: "Sebentar, kami sedang memeriksa levelmu saat ini.",
                  tr: "Bir saniye, mevcut seviyeni kontrol ediyoruz.",
                  pl: "Chwileczkę, sprawdzamy Twój aktualny poziom.",
                })
                : blockedText}
            </Text>
            {!checking && (
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => {
                  hapticTap();
                  if (accessBlockKind === 'premium') {
                    router.push({
                      pathname: '/premium_modal',
                      params: {
                        context: lessonPaywallContext(getFirstLessonForLevel(lvl as CourseLevel)),
                        lessons_done: '0',
                      },
                    } as any);
                  } else {
                    router.replace('/(tabs)/lessons' as any);
                  }
                }}
                style={{ backgroundColor: LX.gold, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14 }}
              >
                <Text style={{ color: LX.ink, fontSize: f.body, fontWeight: '900' }}>
                  {accessBlockKind === 'premium'
                    ? triLang(lang, {
                      ru: 'Получить Premium',
                      uk: 'Отримати Premium',
                      es: 'Obtener Premium',
                      'pt-BR': "Obter Premium",
                      vi: "Mở Premium",
                      id: "Dapatkan Premium",
                      tr: "Premium al",
                      pl: "Kup Premium",
                    })
                    : triLang(lang, {
                      ru: 'К урокам',
                      uk: 'До уроків',
                      es: 'Ir a lecciones',
                      'pt-BR': "Ir para as aulas",
                      vi: "Đến bài học",
                      id: "Ke pelajaran",
                      tr: "Derslere git",
                      pl: "Do lekcji",
                    })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ContentWrap>
      </SafeAreaView>
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
      ru: `${INTRO_Q_COUNT} вопросов по ключевым темам уровня ${lvl}. Для перехода дальше нужно набрать минимум ${PASS_PCT}%. Если результат не устроит, зачёт можно пройти повторно — без штрафа, с сохранением лучшего результата.`,
      uk: `${INTRO_Q_COUNT} запитань за ключовими темами рівня ${lvl}. Щоб перейти далі, потрібно набрати щонайменше ${PASS_PCT}%. Якщо результат не влаштує, залік можна пройти повторно — без штрафу, зі збереженням найкращого результату.`,
      es: `${INTRO_Q_COUNT} preguntas sobre los temas clave del nivel ${lvl}. Para avanzar necesitas al menos un ${PASS_PCT} %. Si quieres mejorar, puedes repetir el examen sin penalización: guardaremos tu mejor resultado.`,
      'pt-BR': `${INTRO_Q_COUNT} perguntas sobre os temas principais do nível ${lvl}. Para avançar, você precisa acertar pelo menos ${PASS_PCT}%. Se quiser melhorar, pode refazer o teste sem penalidade: vamos guardar seu melhor resultado.`,
      vi: `${INTRO_Q_COUNT} câu hỏi về các chủ đề chính của cấp độ ${lvl}. Để đi tiếp, bạn cần đạt ít nhất ${PASS_PCT}%. Nếu muốn cải thiện, bạn có thể làm lại bài kiểm tra không bị phạt; kết quả tốt nhất sẽ được giữ lại.`,
      id: `${INTRO_Q_COUNT} pertanyaan tentang topik utama level ${lvl}. Untuk lanjut, kamu perlu mendapat minimal ${PASS_PCT}%. Jika ingin memperbaiki hasil, kamu bisa mengulang ujian tanpa penalti; hasil terbaikmu akan disimpan.`,
      tr: `${lvl} seviyesinin ana konularından ${INTRO_Q_COUNT} soru. Devam etmek için en az %${PASS_PCT} alman gerekir. Sonucunu iyileştirmek istersen sınavı cezasız tekrar edebilirsin; en iyi sonucun saklanır.`,
      pl: `${INTRO_Q_COUNT} pytań z głównych tematów poziomu ${lvl}. Aby przejść dalej, potrzebujesz co najmniej ${PASS_PCT}%. Jeśli chcesz poprawić wynik, możesz powtórzyć test bez kary; zapiszemy najlepszy rezultat.`,
    });
    const premiumNote =
      lvl !== 'B2'
        ? triLang(lang, {
          ru: 'С Premium все уроки текущего уровня открыты сразу; следующий уровень откроется после сдачи этого зачёта.',
          uk: 'З Premium усі уроки поточного рівня відкриті одразу; наступний рівень відкриється після складання цього заліку.',
          es: 'Con Premium todas las lecciones del nivel actual están abiertas; el siguiente nivel se abrirá al aprobar este examen.',
          'pt-BR': "Com Premium, todas as aulas do nível atual ficam abertas de uma vez; o próximo nível será aberto depois que você passar neste teste.",
          vi: "Với Premium, tất cả bài học của cấp độ hiện tại được mở ngay; cấp độ tiếp theo sẽ mở sau khi bạn vượt qua bài kiểm tra này.",
          id: "Dengan Premium, semua pelajaran di level saat ini langsung terbuka; level berikutnya akan terbuka setelah kamu lulus ujian ini.",
          tr: "Premium ile mevcut seviyenin tüm dersleri hemen açılır; bir sonraki seviye bu sınavı geçtikten sonra açılır.",
          pl: "Z Premium wszystkie lekcje obecnego poziomu są od razu otwarte; następny poziom odblokuje się po zaliczeniu tego testu.",
        })
        : null;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: LX.screen }}>
        <ContentWrap>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: LX.cardLine,
            }}
          >
            <TouchableOpacity onPress={() => { hapticTap(); router.back(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 }}>
            <View
              style={{
                backgroundColor: LX.card,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: LX.cardLine,
                padding: 20,
                gap: 18,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: LX.gold,
                    backgroundColor: LX.goldSoft,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="diamond-outline" size={26} color={LX.gold} />
                </View>
                <View style={{ flex: 1, paddingTop: 2 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: f.h1, fontWeight: '800', lineHeight: Math.round(f.h1 * 1.15) }}>
                    {title}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                {statTriples.map((s, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 6,
                      borderRadius: 16,
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      borderWidth: 1,
                      borderColor: LX.cardLine,
                    }}
                  >
                    <Ionicons name={s.icon} size={18} color={LX.gold} style={{ marginBottom: 8 }} />
                    <Text style={{ color: LX.gold, fontSize: f.numMd, fontWeight: '800', marginBottom: 4 }}>{s.value}</Text>
                    <Text
                      style={{
                        color: LX.gold,
                        fontSize: f.label - 1,
                        fontWeight: '700',
                        letterSpacing: 0,
                        textAlign: 'center',
                      }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.62}
                    >
                      {s.cap}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: f.body, lineHeight: 22 }}>{introBody}</Text>

              {premiumNote ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: LX.goldSoft,
                    borderWidth: 1,
                    borderColor: LX.cardLine,
                  }}
                >
                  <Ionicons name="sparkles-outline" size={20} color={LX.gold} style={{ marginTop: 2 }} />
                  <Text style={{ flex: 1, color: 'rgba(255,255,255,0.92)', fontSize: f.body, lineHeight: 21 }}>{premiumNote}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => { hapticTap(); startExam(); }}
                style={{ borderRadius: 18, overflow: 'hidden', marginTop: 4 }}
              >
                <LinearGradient
                  colors={['#FFE9A8', '#E8C040', '#C99516']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    paddingVertical: 16,
                  }}
                >
                  <Ionicons name="sparkles" size={20} color={LX.ink} />
                  <Text style={{ color: LX.ink, fontSize: f.bodyLg, fontWeight: '800' }}>
                    {triLang(lang, {
                      ru: 'Начать зачёт',
                      uk: 'Почати залік',
                      es: 'Empezar examen',
                      'pt-BR': "Começar teste",
                      vi: "Bắt đầu bài kiểm tra",
                      id: "Mulai ujian",
                      tr: "Sınava başla",
                      pl: "Rozpocznij test",
                    })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginTop: 18 }}>
              <ReportErrorButton
                screen="level_exam"
                dataId={`level_exam_intro_${lvl}`}
                dataText={triLang(lang, {
                  ru: `Зачёт уровня ${lvl}: вступление`,
                  uk: `Залік рівня ${lvl}: вступ`,
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
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const wrongItems = questions
      .map((qu, i) => ({ q: qu, chosen: choices[i] ?? null, correct: qu?.correct ?? -1 }))
      .filter(x => x.q && x.chosen !== x.correct);
    return (
      <>
      <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TouchableOpacity onPress={() => { hapticTap(); router.back(); }}>
              <Ionicons name="chevron-back" size={26} color={sx.primary} />
            </TouchableOpacity>
            <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700', marginLeft: 10 }}>{title}</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {/* Итог */}
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
              {examMedalTier !== 'none' && MEDAL_IMAGES_EXAM[examMedalTier] ? (
                <Image
                  source={MEDAL_IMAGES_EXAM[examMedalTier]}
                  style={{ width: 90, height: 90 }}
                  resizeMode="contain"
                />
              ) : (
                <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#3A3A3A', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 36, color: '#555' }}>?</Text>
                </View>
              )}
              {medalImproved && (
                <Text style={{ color: t.gold, fontSize: f.bodyLg, fontWeight: '700', marginTop: 4 }}>
                  {examMedalTier === 'gold'
                    ? triLang(lang, {
                      ru: '🥇 Золото!',
                      uk: '🥇 Золото!',
                      es: '🥇 ¡Oro!',
                      'pt-BR': "🥇 Ouro!",
                      vi: "🥇 Vàng!",
                      id: "🥇 Emas!",
                      tr: "🥇 Altın!",
                      pl: "🥇 Złoto!",
                    })
                    : examMedalTier === 'silver'
                      ? triLang(lang, {
                        ru: '🥈 Новая медаль!',
                        uk: '🥈 Нова медаль!',
                        es: '🥈 ¡Nueva medalla!',
                        'pt-BR': "🥈 Nova medalha!",
                        vi: "🥈 Huy chương mới!",
                        id: "🥈 Medali baru!",
                        tr: "🥈 Yeni madalya!",
                        pl: "🥈 Nowy medal!",
                      })
                      : triLang(lang, {
                        ru: '🥉 Новая медаль!',
                        uk: '🥉 Нова медаль!',
                        es: '🥉 ¡Nueva medalla!',
                        'pt-BR': "🥉 Nova medalha!",
                        vi: "🥉 Huy chương mới!",
                        id: "🥉 Medali baru!",
                        tr: "🥉 Yeni madalya!",
                        pl: "🥉 Nowy medal!",
                      })}
                </Text>
              )}
              <Text style={{ color: sx.primary, fontSize: f.h1, fontWeight: '800' }}>{pct}%</Text>
              <Text style={{ color: sx.muted, fontSize: f.body }}>
                {triLang(lang, {
                  ru: `${correctCount} из ${total} правильно`,
                  uk: `${correctCount} з ${total} правильно`,
                  es: `${correctCount} de ${total} acertadas`,
                  'pt-BR': `${correctCount} de ${total} corretas`,
                  vi: `${correctCount} / ${total} câu đúng`,
                  id: `${correctCount} dari ${total} benar`,
                  tr: `${total} sorudan ${correctCount} doğru`,
                  pl: `${correctCount} z ${total} poprawnie`,
                })}
              </Text>
              <Text style={{ color: sx.muted, fontSize: f.sub }}>
                {triLang(lang, {
                  ru: `Попытка №${examPassCount}`,
                  uk: `Спроба №${examPassCount}`,
                  es: `Intento n.º ${examPassCount}`,
                  'pt-BR': `Tentativa nº ${examPassCount}`,
                  vi: `Lần thứ ${examPassCount}`,
                  id: `Percobaan ke-${examPassCount}`,
                  tr: `${examPassCount}. deneme`,
                  pl: `Podejście nr ${examPassCount}`,
                })}
              </Text>
            </View>

            {/* Прогресс-бар */}
            <View
              style={{
                height: 8,
                backgroundColor: isGoldTheme ? 'rgba(0,0,0,0.44)' : t.bgSurface,
                borderRadius: 4,
                overflow: 'hidden',
                borderWidth: isGoldTheme ? StyleSheet.hairlineWidth : 0,
                borderColor: isGoldTheme ? GOLD_RICH.hairline : 'transparent',
              }}
            >
              {isGoldTheme ? (
                <LinearGradient
                  colors={passed ? GOLD_GRADIENTS.progressMetal : (['#7A302A', '#2A0D0B', '#140605'] as [string, string, string])}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: '100%', width: `${pct}%` as any, borderRadius: 4 }}
                />
              ) : (
                <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: passed ? t.correct : t.wrong, borderRadius: 4 }} />
              )}
            </View>

            <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center', lineHeight: 22, marginTop: 12, paddingHorizontal: 8 }}>
              {!passed
                ? triLang(lang, {
                  ru: `Ниже ${PASS_PCT}% зачёт не засчитан — вернись к «Теории», «Словарю» и «Формам глаголов» по ошибкам.`,
                  uk: `Нижче ${PASS_PCT}% залік не зараховано — повернись до «Теорії», «Словника» й форм дієслів за помилками.`,
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
                    es: 'Muy bien por temas del nivel: refuerza lecciones flojas para mantener el ritmo.',
                    'pt-BR': "Muito bem nos temas do nível: reforce as aulas mais fracas para manter o ritmo.",
                    vi: "Bạn làm rất tốt ở các chủ đề của cấp độ này: hãy củng cố các bài còn yếu để giữ nhịp.",
                    id: "Bagus sekali untuk topik level ini: perkuat pelajaran yang masih lemah agar ritmenya terjaga.",
                    tr: "Seviye konularında çok iyi: tempoyu korumak için zayıf dersleri pekiştir.",
                    pl: "Bardzo dobrze z tematów tego poziomu: utrwal słabsze lekcje, żeby utrzymać formę.",
                  })
                  : triLang(lang, {
                    ru: `Зачёт сдан (${PASS_PCT}%+) — при желании добейся ${90}% для золота.`,
                    uk: `Залік здано (${PASS_PCT}%+) — за бажанням добийся ${90}% для золота.`,
                    es: `Aprobado (${PASS_PCT} %+); si quieres, apunta al ${90} % para el oro.`,
                    'pt-BR': `Teste aprovado (${PASS_PCT}%+); se quiser, mire em ${90}% para ganhar ouro.`,
                    vi: `Đã đạt (${PASS_PCT}%+); nếu muốn, hãy nhắm tới ${90}% để lấy vàng.`,
                    id: `Lulus (${PASS_PCT}%+); kalau mau, kejar ${90}% untuk emas.`,
                    tr: `Geçtin (%${PASS_PCT}+); istersen altın için %${90} hedefle.`,
                    pl: `Zaliczone (${PASS_PCT}%+); jeśli chcesz, celuj w ${90}% na złoto.`,
                  })}
            </Text>

            {/* Ошибки */}
            {wrongItems.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                  {triLang(lang, {
                    ru: 'Ошибки:',
                    uk: 'Помилки:',
                    es: 'Errores:',
                    'pt-BR': "Erros:",
                    vi: "Lỗi sai:",
                    id: "Kesalahan:",
                    tr: "Hatalar:",
                    pl: "Błędy:",
                  })}
                </Text>
                {wrongItems.map((item, i) => (
                  <LinearGradient
                    key={i}
                    colors={isGoldTheme ? GOLD_GRADIENTS.raisedTile : ([t.bgCard, t.bgCard, t.bgCard] as [string, string, string])}
                    locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                    start={isGoldTheme ? { x: 0, y: 0 } : undefined}
                    end={isGoldTheme ? { x: 1, y: 1 } : undefined}
                    style={{
                      borderRadius: 12,
                      borderWidth: 0.5,
                      borderColor: isGoldTheme ? GOLD_RICH.hairline : t.border,
                      padding: 14,
                      gap: 6,
                      overflow: 'hidden',
                      ...(isGoldTheme ? goldShadow(1) : {}),
                    }}
                  >
                    {isGoldTheme && <GoldBevel radius={12} intensity="quiet" />}
                    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', zIndex: 10 }}>
                      {triLang(lang, {
                        ru: item.q.topic ?? '',
                        uk: item.q.topicUK ?? '',
                        es: item.q.topicES ?? '',
                        'pt-BR': levelTopicPlanned(item.q, 'pt-BR'),
                        vi: levelTopicPlanned(item.q, 'vi'),
                        id: levelTopicPlanned(item.q, 'id'),
                        tr: levelTopicPlanned(item.q, 'tr'),
                        pl: levelTopicPlanned(item.q, 'pl'),
                      })}
                    </Text>
                    <ClozeGapText text={item.q.q ?? ''} style={{ color: t.textPrimary, fontSize: f.body, zIndex: 10 }} />
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', zIndex: 10 }}>
                      {item.chosen !== null && item.chosen !== undefined && (
                        <Text style={{ color: t.wrong, fontSize: f.sub }}>
                          ✗ {item.q.opts?.[item.chosen] ?? '—'}
                        </Text>
                      )}
                      <Text style={{ color: t.correct, fontSize: f.sub }}>
                        ✓ {item.q.opts?.[item.correct] ?? '—'}
                      </Text>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            )}

            {/* Кнопки */}
            <TouchableOpacity
              onPress={() => { hapticTap(); startExam(); }}
              style={{
                borderRadius: 14,
                borderWidth: 0.5,
                borderColor: isGoldTheme ? GOLD_RICH.hairline : t.border,
                overflow: 'hidden',
                ...(isGoldTheme ? goldShadow(1) : {}),
              }}
            >
              <LinearGradient
                colors={isGoldTheme ? GOLD_GRADIENTS.raisedTile : ([t.bgCard, t.bgCard, t.bgCard] as [string, string, string])}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                start={isGoldTheme ? { x: 0, y: 0 } : undefined}
                end={isGoldTheme ? { x: 1, y: 1 } : undefined}
                style={{ paddingVertical: 14, alignItems: 'center', paddingHorizontal: 16 }}
              >
                {isGoldTheme && <GoldBevel radius={14} intensity="quiet" />}
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', zIndex: 10 }}>
                {triLang(lang, {
                  ru: 'Попробовать ещё раз',
                  uk: 'Спробувати ще раз',
                  es: 'Intentar de nuevo',
                  'pt-BR': "Tentar de novo",
                  vi: "Thử lại",
                  id: "Coba lagi",
                  tr: "Tekrar dene",
                  pl: "Spróbuj ponownie",
                })}
              </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { hapticTap(); router.back(); }}
              style={{
                borderRadius: 14,
                borderWidth: isGoldTheme ? 1 : 0,
                borderColor: isGoldTheme ? GOLD_RICH.edgeLight : 'transparent',
                overflow: 'hidden',
                ...(isGoldTheme ? goldShadow(2) : {}),
              }}
            >
              <LinearGradient
                colors={isGoldTheme ? GOLD_GRADIENTS.primaryButton : ([t.accent, t.accent, t.accent] as [string, string, string])}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                start={isGoldTheme ? { x: 0, y: 0 } : undefined}
                end={isGoldTheme ? { x: 1, y: 1 } : undefined}
                style={{ paddingVertical: 14, alignItems: 'center', paddingHorizontal: 16 }}
              >
                {isGoldTheme && <GoldBevel radius={14} intensity="strong" />}
              <Text style={{ color: isGoldTheme ? GOLD_RICH.blackPiano : t.correctText, fontSize: f.bodyLg, fontWeight: '700', zIndex: 10 }}>
                {triLang(lang, {
                  ru: 'К урокам',
                  uk: 'До уроків',
                  es: 'Volver a las lecciones',
                  'pt-BR': "Voltar às aulas",
                  vi: "Quay lại bài học",
                  id: "Kembali ke pelajaran",
                  tr: "Derslere dön",
                  pl: "Wróć do lekcji",
                })}
              </Text>
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <ReportErrorButton
                screen="level_exam"
                dataId={`level_exam_result_${lvl}_${pct}`}
                dataText={triLang(lang, {
                  ru: `Зачёт ${lvl}: результат ${pct}%`,
                  uk: `Залік ${lvl}: результат ${pct}%`,
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
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
      </>
    );
  }

  // ── QUIZ ─────────────────────────────────────────────────────────────────────
  if (!q) return null;

  const progressPct = Math.round((idx + 1) / total * 100);
  return (
    <ScreenGradient artBackdrop="exam">
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
        {/* Хедер */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => {
            hapticTap();
            setExitExamConfirm(true);
          }}>
            <Ionicons name="close" size={26} color={sx.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <View
              style={{
                height: 6,
                backgroundColor: isGoldTheme ? 'rgba(0,0,0,0.44)' : t.bgSurface,
                borderRadius: 3,
                overflow: 'hidden',
                borderWidth: isGoldTheme ? StyleSheet.hairlineWidth : 0,
                borderColor: isGoldTheme ? GOLD_RICH.hairline : 'transparent',
              }}
            >
              {isGoldTheme ? (
                <LinearGradient
                  colors={GOLD_GRADIENTS.progressMetal}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: '100%', width: `${progressPct}%` as any, borderRadius: 3 }}
                />
              ) : (
                <View style={{ height: '100%', width: `${progressPct}%` as any, backgroundColor: t.accent, borderRadius: 3 }} />
              )}
            </View>
          </View>
          <Text style={{ color: sx.muted, fontSize: f.label, fontWeight: '700', minWidth: 48, textAlign: 'right' }}>
            {idx + 1} / {total}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} bounces={false}>
          {/* Топик */}
          <Text style={{ color: sx.muted, fontSize: f.label, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            {triLang(lang, {
              ru: q.topic,
              uk: q.topicUK,
              es: q.topicES,
              'pt-BR': levelTopicPlanned(q, 'pt-BR'),
              vi: levelTopicPlanned(q, 'vi'),
              id: levelTopicPlanned(q, 'id'),
              tr: levelTopicPlanned(q, 'tr'),
              pl: levelTopicPlanned(q, 'pl'),
            })} · {triLang(lang, {
              ru: 'Урок',
              uk: 'Урок',
              es: 'Lección',
              'pt-BR': "Aula",
              vi: "Bài học",
              id: "Pelajaran",
              tr: "Ders",
              pl: "Lekcja",
            })} {q.lessonNum}
          </Text>

          {/* Вопрос */}
          <LinearGradient
            colors={isGoldTheme ? GOLD_GRADIENTS.premiumPanel : ([t.bgCard, t.bgCard, t.bgCard] as [string, string, string])}
            locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
            start={isGoldTheme ? { x: 0, y: 0 } : undefined}
            end={isGoldTheme ? { x: 1, y: 1 } : undefined}
            style={{
              borderRadius: 16,
              borderWidth: 0.5,
              borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : t.border,
              padding: 20,
              overflow: 'hidden',
              ...(isGoldTheme ? goldShadow(2) : {}),
            }}
          >
            {isGoldTheme && <GoldBevel radius={16} intensity="normal" />}
            <ClozeGapText text={q.q} style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600', lineHeight: 26, zIndex: 10 }} />
          </LinearGradient>

          {/* Варианты ответов */}
          <View style={{ gap: 10 }}>
            {(q.opts ?? []).map((opt, ci) => {
              const isChosen  = chosen === ci;
              const isOptCorrect = ci === q.correct;
              let bg = t.bgCard;
              let border = t.border;
              let textColor = t.textPrimary;
              if (showAnswer && isOptCorrect)  { bg = t.correctBg ?? t.bgCard; border = t.correct; textColor = t.correct; }
              if (showAnswer && isChosen && !isOptCorrect) { bg = '#3A1A1A'; border = t.wrong; textColor = t.wrong; }
              return (
                <TouchableOpacity
                  key={ci}
                  onPress={() => handlePick(ci)}
                  disabled={chosen !== null}
                  style={{ backgroundColor: bg, borderRadius: 14, borderWidth: 1.5, borderColor: border, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.bgSurface, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700' }}>
                      {['A','B','C','D'][ci]}
                    </Text>
                  </View>
                  <Text style={{ color: textColor, fontSize: f.body, flex: 1 }}>{opt}</Text>
                  {showAnswer && isOptCorrect && <Ionicons name="checkmark-circle" size={20} color={t.correct} />}
                  {showAnswer && isChosen && !isOptCorrect && <Ionicons name="close-circle" size={20} color={t.wrong} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Кнопка Далее */}
          {showAnswer && (
            <TouchableOpacity
              onPress={() => { hapticTap(); goNext(); }}
              style={{ backgroundColor: t.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>
                {idx + 1 < total
                  ? triLang(lang, {
                    ru: 'Далее →',
                    uk: 'Далі →',
                    es: 'Siguiente →',
                    'pt-BR': "Próximo →",
                    vi: "Tiếp theo →",
                    id: "Berikutnya →",
                    tr: "İleri →",
                    pl: "Dalej →",
                  })
                  : triLang(lang, {
                    ru: 'Завершить',
                    uk: 'Завершити',
                    es: 'Terminar',
                    'pt-BR': "Finalizar",
                    vi: "Hoàn thành",
                    id: "Selesai",
                    tr: "Bitir",
                    pl: "Zakończ",
                  })}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <ReportErrorButton
              screen="level_exam"
              dataId={`level_exam_${lvl}_q${idx}_L${q.lessonNum}`}
              dataText={`${q.q ?? ''}`.slice(0, 120)}
              textColor={sx.muted}
            />
          </View>
        </ScrollView>
      </ContentWrap>
      <ThemedConfirmModal
        visible={exitExamConfirm}
        title={triLang(lang, {
          ru: 'Выйти?',
          uk: 'Вийти?',
          es: '¿Salir del examen?',
          'pt-BR': "Sair do teste?",
          vi: "Thoát bài kiểm tra?",
          id: "Keluar dari ujian?",
          tr: "Sınavdan çıkılsın mı?",
          pl: "Wyjść z testu?",
        })}
        message={triLang(lang, {
          ru: 'Прогресс зачёта будет потерян',
          uk: 'Прогрес заліку буде втрачено',
          es: 'Perderás el progreso de este examen.',
          'pt-BR': "O progresso deste teste será perdido.",
          vi: "Tiến trình bài kiểm tra sẽ bị mất.",
          id: "Progres ujian ini akan hilang.",
          tr: "Bu sınavdaki ilerlemen kaybolacak.",
          pl: "Postęp w tym teście zostanie utracony.",
        })}
        cancelLabel={triLang(lang, {
          ru: 'Отмена',
          uk: 'Скасувати',
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
          router.back();
        }}
        confirmVariant="accent"
      />
    </SafeAreaView>
    </ScreenGradient>
  );
}
