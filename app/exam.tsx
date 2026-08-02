import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import BouncyScrollView from '../components/BouncyScrollView';
import DuoPressable from '../components/DuoPressable';
import { useWordFlash } from '../hooks/use-word-flash';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useTimerTickCue } from '../hooks/use-timer-tick-cue';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    BackHandler,
    Platform,
    ScrollView,
    Share,
    Text, TouchableOpacity,
    View,
} from 'react-native';
import Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import NoEnergyModal from '../components/NoEnergyModal';
import ScreenGradient from '../components/ScreenGradient';
import GradientProgressBar from '../components/GradientProgressBar';
import { useTheme } from '../components/ThemeContext';
import { screenTextOnGradient } from '../constants/theme';
import XpGainBadge from '../components/XpGainBadge';
import { registerXP } from './xp_manager';
import { awardOneTime } from './shards_system';
import ReportErrorButton from '../components/ReportErrorButton';
import ClozeGapText from '../components/ClozeGapText';
import { safeRouterBack } from './navigation_back';
import { checkAchievements } from './achievements';
import { DEV_CONTENT_UNLOCK, STORE_URL } from './config';
import { shuffle } from './utils_shuffle';
import { isLingmanExamAvailable } from './lesson_lock_system';
import LingmanCertificateSvg from '../components/share_cards/LingmanCertificateSvg';
import { shareCardFromSvgRef } from '../components/share_cards/shareCardPng';
import { buildExamShareMessage, buildCertificateShareMessage } from './exam_share';
import {
  LINGMAN_CERT_MIN_PCT,
  buildLingmanCertificate,
  formatCertDate,
  loadLingmanCertificate,
  saveLingmanCertificate,
  updateLingmanCertificateName,
  type LingmanCertificate,
} from './exam_certificate';
import CertificateNameModal from '../components/CertificateNameModal';
import { bundleLang, triLang } from '../constants/i18n';
import { examTopicForLang } from './exam_locale';
import { trackFeatureBlocked, trackFeatureError, trackFeatureStart, trackFeatureSuccess } from './app_activity';
import { logMistake, type MistakeWhat } from './mistake_log';
import { resolveChoiceMistakeToken, resolvePhraseMistakeToken } from './mistake_token_resolver';
import type { PhraseMistakeSignal } from './phrase_analytics';
import { isUserFacingCategory, normalizeWordCategory, type WordCategory } from './pos_taxonomy';
import { lessonProgressKey, storageStudyTarget } from './target_storage_keys';
import { examContentAvailableForTarget, frenchExamGateCopy } from './exam_target_gate';
import { loadFrenchRemoteFinalExamQuestions } from './french_exam_remote_runtime';
import { monoIcon } from '../constants/monoIcon';

const TOTAL_EXAM_SECONDS = 60 * 60; // 60 minutes total
const LINGMAN_EXAM_ENERGY = 8;

const safeExamEventPart = (value: unknown): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 80) || 'na';

const makeExamAttemptId = (): string =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

type ExamQType = 'fill' | 'choice4' | 'error';
interface ExamQuestion {
  lessonNum: number;
  topic:   string;   // RU topic name
  rawTopic?: string; // stable, non-localized topic used for analytics
  topicUK: string;   // UK topic name
  /** ES; если нет — для es показывается topic (RU) */
  topicES?: string;
  q:       string;   // question (English)
  opts:    string[]; // 4 options
  correct: number;
  type?:   ExamQType; // default = 'fill'
}

function buildExamQuestionPhrase(q: ExamQuestion): string {
  const expected = q.opts[q.correct] ?? '';
  if (q.q.includes('___')) return q.q.replace('___', expected);
  if (/\[[^\]]+\]/.test(q.q)) return q.q.replace(/\[[^\]]+\]/, expected).replace(/^Correct:\s*/i, '');
  return expected.includes(' ') ? expected : q.q;
}

function examRawCategory(q: ExamQuestion): string {
  return q.rawTopic ?? q.topic;
}

function examTopicCategory(q: ExamQuestion, token?: string): WordCategory | undefined {
  const category = normalizeWordCategory(examRawCategory(q), token).category;
  return isUserFacingCategory(category) ? category : undefined;
}

function buildExamMistakeSignal(
  q: ExamQuestion,
  pickedIndex: number | null,
): { lessonId: number; signal: PhraseMistakeSignal; what: MistakeWhat } | null {
  if (pickedIndex === q.correct) return null;
  const expected = q.opts[q.correct] ?? '';
  if (!expected) return null;
  const picked = pickedIndex === null ? undefined : q.opts[pickedIndex] ?? '';
  const phrase = buildExamQuestionPhrase(q);
  const rawCategory = examRawCategory(q);
  const resolvedToken = picked
    ? q.type === 'choice4'
      ? resolveChoiceMistakeToken(phrase, picked, rawCategory)
      : resolvePhraseMistakeToken(phrase, picked, rawCategory)
    : undefined;
  const tokenMeta = (q.q.includes('___') || /\[[^\]]+\]/.test(q.q)) && expected
    ? { tokenText: expected, expected, picked, rawCategory }
    : {
        ...(resolvedToken ?? { expected }),
        rawCategory,
      };
  const category = examTopicCategory(q, tokenMeta.tokenText || tokenMeta.expected);
  return {
    lessonId: q.lessonNum,
    signal: tokenMeta ? { phrase, ...tokenMeta, category } : { phrase },
    what: pickedIndex === null ? 'forgot' : 'wrong_pick',
  };
}

const EXAM_POOL: ExamQuestion[] = [
  // ── LESSON 1: To Be ──────────────────────────────────────────────────────
  {lessonNum:1, topic:'To Be (am/is/are)',      topicUK:'To Be (am/is/are)',      q:'She ___ a teacher.',                    opts:['am','is','are','be'],                                                          correct:1},
  {lessonNum:1, topic:'To Be (am/is/are)',      topicUK:'To Be (am/is/are)',      q:'We ___ at home now.',                   opts:['is','am','are','be'],                                                          correct:2},
  {lessonNum:1, topic:'To Be (am/is/are)',      topicUK:'To Be (am/is/are)',      q:'I ___ not tired.',                      opts:['is','are','am','be'],                                                          correct:2},
  {lessonNum:1, topic:'To Be (am/is/are)',      topicUK:'To Be (am/is/are)',      q:'Which sentence is correct?',            opts:['She am happy.','He are my friend.','They is late.','You are right.'],          correct:3, type:'choice4'},
  {lessonNum:1, topic:'To Be (am/is/are)',      topicUK:'To Be (am/is/are)',      q:'Correct: He [are] a doctor.',           opts:['is','are','am','was'],                                                         correct:0, type:'error'},
  // ── LESSON 2: Negation To Be ─────────────────────────────────────────────
  {lessonNum:2, topic:'Отрицание To Be',        topicUK:'Заперечення To Be',      q:'They ___ not here.',                    opts:['is','am','are','be'],                                                          correct:2},
  {lessonNum:2, topic:'Отрицание To Be',        topicUK:'Заперечення To Be',      q:'She ___ not ready yet.',                opts:['is','am','are','be'],                                                          correct:0},
  {lessonNum:2, topic:'Отрицание To Be',        topicUK:'Заперечення To Be',      q:'Which sentence is correct?',            opts:['I am not ready.','She are not happy.','He am not here.','We is not late.'],   correct:0, type:'choice4'},
  {lessonNum:2, topic:'Отрицание To Be',        topicUK:'Заперечення To Be',      q:'Correct: They [am] not students.',      opts:['are','am','is','was'],                                                         correct:0, type:'error'},
  // ── LESSON 3: Present Simple affirmative ─────────────────────────────────
  {lessonNum:3, topic:'Present Simple — утверждение', topicUK:'Present Simple — ствердження', q:'He ___ every day.',         opts:['work','works','worked','working'],                                              correct:1},
  {lessonNum:3, topic:'Present Simple — утверждение', topicUK:'Present Simple — ствердження', q:'She ___ English.',          opts:['speak','speaks','spoke','speaking'],                                            correct:1},
  {lessonNum:3, topic:'Present Simple — утверждение', topicUK:'Present Simple — ствердження', q:'They ___ in London.',       opts:['live','lives','lived','living'],                                                correct:0},
  {lessonNum:3, topic:'Present Simple — утверждение', topicUK:'Present Simple — ствердження', q:'Which sentence is correct?', opts:['He work every day.','She speaks French.','They lives here.','We goes to school.'], correct:1, type:'choice4'},
  {lessonNum:3, topic:'Present Simple — утверждение', topicUK:'Present Simple — ствердження', q:'Correct: She [speak] three languages.', opts:['speaks','speak','spoken','speaking'],                               correct:0, type:'error'},
  // ── LESSON 4: Present Simple negation ────────────────────────────────────
  {lessonNum:4, topic:'Present Simple — отрицание',  topicUK:'Present Simple — заперечення',  q:'She ___ not understand.',   opts:['do','does','did','doing'],                                                     correct:1},
  {lessonNum:4, topic:'Present Simple — отрицание',  topicUK:'Present Simple — заперечення',  q:'He ___ not smoke.',         opts:['do','does','did','doing'],                                                     correct:1},
  {lessonNum:4, topic:'Present Simple — отрицание',  topicUK:'Present Simple — заперечення',  q:'They ___ not know the answer.', opts:['does','do','did','doing'],                                                correct:1},
  {lessonNum:4, topic:'Present Simple — отрицание',  topicUK:'Present Simple — заперечення',  q:'Which sentence is correct?', opts:["She don\'t like it.","They doesn\'t eat meat.","He does not smoke.","I does not know."], correct:2, type:'choice4'},
  {lessonNum:4, topic:'Present Simple — отрицание',  topicUK:'Present Simple — заперечення',  q:"Correct: He [don\'t] understand.", opts:["doesn\'t","don\'t","didn\'t","doesn\'t not"],                               correct:0, type:'error'},
  // ── LESSON 5: Present Simple questions ───────────────────────────────────
  {lessonNum:5, topic:'Present Simple — вопросы',    topicUK:'Present Simple — питання',      q:'___ you speak English?',    opts:['Do','Does','Did','Are'],                                                       correct:0},
  {lessonNum:5, topic:'Present Simple — вопросы',    topicUK:'Present Simple — питання',      q:'___ she like music?',       opts:['Do','Does','Did','Is'],                                                        correct:1},
  {lessonNum:5, topic:'Present Simple — вопросы',    topicUK:'Present Simple — питання',      q:'___ they play football?',   opts:['Do','Does','Did','Are'],                                                       correct:0},
  {lessonNum:5, topic:'Present Simple — вопросы',    topicUK:'Present Simple — питання',      q:'Which sentence is correct?', opts:['Do she work here?','Does he works here?','Does she work here?','Does they work here?'], correct:2, type:'choice4'},
  {lessonNum:5, topic:'Present Simple — вопросы',    topicUK:'Present Simple — питання',      q:'Correct: Does she [likes] coffee?', opts:['like','likes','liked','liking'],                                       correct:0, type:'error'},
  // ── LESSON 6: Wh-questions ───────────────────────────────────────────────
  {lessonNum:6, topic:'Специальные вопросы',   topicUK:'Спеціальні питання',      q:'___ do you live?',                  opts:['What','Where','Who','When'],                                                       correct:1},
  {lessonNum:6, topic:'Специальные вопросы',   topicUK:'Спеціальні питання',      q:'___ are you?',                      opts:['Where','How','What','Who'],                                                        correct:1},
  {lessonNum:6, topic:'Специальные вопросы',   topicUK:'Спеціальні питання',      q:'___ time is it?',                   opts:['Where','Who','What','When'],                                                       correct:2},
  {lessonNum:6, topic:'Специальные вопросы',   topicUK:'Спеціальні питання',      q:'Which sentence is correct?',        opts:['Where you live?','Where do you live?','Where does you live?','Where is you live?'], correct:1, type:'choice4'},
  {lessonNum:6, topic:'Специальные вопросы',   topicUK:'Спеціальні питання',      q:"Correct: What time [is] you wake up?", opts:['do','is','are','does'],                                                        correct:0, type:'error'},
  // ── LESSON 7: To Have ────────────────────────────────────────────────────
  {lessonNum:7, topic:'Глагол To Have',        topicUK:'Дієслово To Have',        q:'I ___ a car.',                      opts:['has','have','had','having'],                                                       correct:1},
  {lessonNum:7, topic:'Глагол To Have',        topicUK:'Дієслово To Have',        q:'She ___ two children.',             opts:['have','has','had','having'],                                                       correct:1},
  {lessonNum:7, topic:'Глагол To Have',        topicUK:'Дієслово To Have',        q:'Do they ___ a car?',                opts:['has','have','had','having'],                                                       correct:1},
  {lessonNum:7, topic:'Глагол To Have',        topicUK:'Дієслово To Have',        q:'Which sentence is correct?',        opts:['She have a cat.','He has a cat.','They has a dog.','We has a house.'],              correct:1, type:'choice4'},
  {lessonNum:7, topic:'Глагол To Have',        topicUK:'Дієслово To Have',        q:'Correct: He [have] a new car.',     opts:['has','have','had','having'],                                                       correct:0, type:'error'},
  // ── LESSON 8: Prepositions of time ───────────────────────────────────────
  {lessonNum:8, topic:'Предлоги времени (at/in/on)', topicUK:'Прийменники часу (at/in/on)', q:"I wake up ___ 7 o\'clock.",  opts:['in','on','at','by'],                                                            correct:2},
  {lessonNum:8, topic:'Предлоги времени (at/in/on)', topicUK:'Прийменники часу (at/in/on)', q:'She was born ___ Monday.',  opts:['in','on','at','by'],                                                            correct:1},
  {lessonNum:8, topic:'Предлоги времени (at/in/on)', topicUK:'Прийменники часу (at/in/on)', q:'He was born ___ 1990.',     opts:['in','on','at','by'],                                                            correct:0},
  {lessonNum:8, topic:'Предлоги времени (at/in/on)', topicUK:'Прийменники часу (at/in/on)', q:'Which sentence is correct?', opts:['She arrived in Monday.','He works at night.','They met in weekend.','I wake up on morning.'], correct:1, type:'choice4'},
  {lessonNum:8, topic:'Предлоги времени (at/in/on)', topicUK:'Прийменники часу (at/in/on)', q:'Correct: I study [on] the morning.', opts:['in','on','at','by'],                                                   correct:0, type:'error'},
  // ── LESSON 9: There is / There are ───────────────────────────────────────
  {lessonNum:9, topic:'There is / There are',  topicUK:'There is / There are',    q:'There ___ a book on the table.',    opts:['are','am','is','be'],                                                              correct:2},
  {lessonNum:9, topic:'There is / There are',  topicUK:'There is / There are',    q:'There ___ many people here.',       opts:['is','am','are','be'],                                                              correct:2},
  {lessonNum:9, topic:'There is / There are',  topicUK:'There is / There are',    q:'There ___ no milk in the fridge.',  opts:['are','am','is','be'],                                                              correct:2},
  {lessonNum:9, topic:'There is / There are',  topicUK:'There is / There are',    q:'Which sentence is correct?',        opts:['There are a cat.','There is cats.','There are cats.','There am a dog.'],           correct:2, type:'choice4'},
  {lessonNum:9, topic:'There is / There are',  topicUK:'There is / There are',    q:'Correct: There [are] a big park.',  opts:['is','are','am','be'],                                                              correct:0, type:'error'},
  // ── LESSON 10: Modal verbs ────────────────────────────────────────────────
  {lessonNum:10, topic:'Модальные глаголы',    topicUK:'Модальні дієслова',       q:'You ___ speak louder.',             opts:['can','could','should','must'],                                                     correct:2},
  {lessonNum:10, topic:'Модальные глаголы',    topicUK:'Модальні дієслова',       q:'She ___ swim very well.',           opts:['can','should','must','shall'],                                                     correct:0},
  {lessonNum:10, topic:'Модальные глаголы',    topicUK:'Модальні дієслова',       q:'No parking. You ___ park here.',   opts:["mustn't",'can','could','should'],                                                  correct:0},
  {lessonNum:10, topic:'Модальные глаголы',    topicUK:'Модальні дієслова',       q:'Which sentence is correct?',        opts:['She can to swim.','You should to stop.','He must to go.','She can swim.'],        correct:3, type:'choice4'},
  {lessonNum:10, topic:'Модальные глаголы',    topicUK:'Модальні дієслова',       q:'Correct: You [must to] leave now.', opts:['must','must to','should to','can to'],                                            correct:0, type:'error'},
  // ── LESSON 11: Past Simple regular ───────────────────────────────────────
  {lessonNum:11, topic:'Past Simple — правильные', topicUK:'Past Simple — правильні', q:'She ___ the letter yesterday.', opts:['send','sends','sent','sending'],                                                  correct:2},
  {lessonNum:11, topic:'Past Simple — правильные', topicUK:'Past Simple — правильні', q:'They ___ football last week.',  opts:['play','plays','played','playing'],                                                correct:2},
  {lessonNum:11, topic:'Past Simple — правильные', topicUK:'Past Simple — правильні', q:'I ___ him yesterday.',          opts:['call','calls','called','calling'],                                                correct:2},
  {lessonNum:11, topic:'Past Simple — правильные', topicUK:'Past Simple — правильні', q:'Which sentence is correct?',    opts:['She sended the email.','They plaied well.','He walked to school.','We stoped there.'], correct:2, type:'choice4'},
  {lessonNum:11, topic:'Past Simple — правильные', topicUK:'Past Simple — правильні', q:'Correct: She [sended] a letter.',opts:['sent','sended','send','sends'],                                                  correct:0, type:'error'},
  // ── LESSON 12: Past Simple irregular ─────────────────────────────────────
  {lessonNum:12, topic:'Past Simple — неправильные', topicUK:'Past Simple — неправильні', q:'He ___ to London last year.',opts:['go','goes','went','gone'],                                                       correct:2},
  {lessonNum:12, topic:'Past Simple — неправильные', topicUK:'Past Simple — неправильні', q:'They ___ a lot of money.',  opts:['spend','spends','spent','spending'],                                              correct:2},
  {lessonNum:12, topic:'Past Simple — неправильные', topicUK:'Past Simple — неправильні', q:'She ___ the book last week.',opts:['read','reads','readed','reading'],                                               correct:0},
  {lessonNum:12, topic:'Past Simple — неправильные', topicUK:'Past Simple — неправильні', q:'Which sentence is correct?', opts:['He goed to Paris.','She buyed a dress.','They came home late.','We taked the bus.'], correct:2, type:'choice4'},
  {lessonNum:12, topic:'Past Simple — неправильные', topicUK:'Past Simple — неправильні', q:'Correct: She [goed] to school.', opts:['went','goed','goes','go'],                                                  correct:0, type:'error'},
  // ── LESSON 13: Future Simple ──────────────────────────────────────────────
  {lessonNum:13, topic:'Future Simple (will)',  topicUK:'Future Simple (will)',    q:'She ___ come tomorrow.',            opts:['will','would','is going','shall be'],                                              correct:0},
  {lessonNum:13, topic:'Future Simple (will)',  topicUK:'Future Simple (will)',    q:'I ___ not be late.',                opts:['will','shall','would','am'],                                                       correct:0},
  {lessonNum:13, topic:'Future Simple (will)',  topicUK:'Future Simple (will)',    q:'It ___ rain tomorrow.',             opts:['will','would','shall','is'],                                                       correct:0},
  {lessonNum:13, topic:'Future Simple (will)',  topicUK:'Future Simple (will)',    q:'Which sentence is correct?',        opts:["He wills help.","She will helps.","They will come.","We will to go."],            correct:2, type:'choice4'},
  {lessonNum:13, topic:'Future Simple (will)',  topicUK:'Future Simple (will)',    q:'Correct: She will [to come] tomorrow.', opts:['come','to come','comes','came'],                                             correct:0, type:'error'},
  // ── LESSON 14: Comparatives ───────────────────────────────────────────────
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:"This is ___ book I\'ve read.",       opts:['good','better','the best','best'],                                               correct:2},
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:'She is ___ than her sister.',       opts:['tall','taller','tallest','most tall'],                                           correct:1},
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:'This test is ___ than the last one.', opts:['hard','harder','hardest','more hard'],                                        correct:1},
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:'Which sentence is correct?',        opts:['She is more tall.','He is the tallest.','This is more better.','She is taller then him.'], correct:1, type:'choice4'},
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:'Correct: She is [more taller] than me.', opts:['taller','more taller','most tall','tallest'],                             correct:0, type:'error'},
  // ── LESSON 15: Possessive pronouns ───────────────────────────────────────
  {lessonNum:15, topic:'Притяжательные местоимения', topicUK:'Присвійні займенники', q:'This is ___ bag.',               opts:['her','hers','she','herself'],                                                     correct:0},
  {lessonNum:15, topic:'Притяжательные местоимения', topicUK:'Присвійні займенники', q:'Is this pen ___?',               opts:['your','yours','you','yourself'],                                                  correct:1},
  {lessonNum:15, topic:'Притяжательные местоимения', topicUK:'Присвійні займенники', q:'These are ___ books.',           opts:['their','theirs','they','themselves'],                                             correct:0},
  {lessonNum:15, topic:'Притяжательные местоимения', topicUK:'Присвійні займенники', q:'Which sentence is correct?',     opts:["That\'s hers bag.","That\'s her bag.","That\'s she bag.","That\'s herself bag."],    correct:1, type:'choice4'},
  {lessonNum:15, topic:'Притяжательные местоимения', topicUK:'Присвійні займенники', q:"Correct: Is this [hers] book?",  opts:['her','hers','she','him'],                                                        correct:0, type:'error'},
  // ── LESSON 16: Phrasal verbs ──────────────────────────────────────────────
  {lessonNum:16, topic:'Фразовые глаголы',      topicUK:'Фразові дієслова',        q:'Please ___ the light.',             opts:['turn on','turn up','turn in','turn out'],                                        correct:0},
  {lessonNum:16, topic:'Фразовые глаголы',      topicUK:'Фразові дієслова',        q:'She ___ smoking last year.',        opts:['gave up','give up','gives up','given up'],                                       correct:0},
  {lessonNum:16, topic:'Фразовые глаголы',      topicUK:'Фразові дієслова',        q:'I am going to bed. Could you ___ the TV?', opts:['turn off','turn out','put off','turn in'],                               correct:0},
  {lessonNum:16, topic:'Фразовые глаголы',      topicUK:'Фразові дієслова',        q:'Which sentence is correct?',        opts:['She gave up smoking.','She give up to smoke.','She given up smokes.','She gaved up smoke.'], correct:0, type:'choice4'},
  {lessonNum:16, topic:'Фразовые глаголы',      topicUK:'Фразові дієслова',        q:'Correct: He [look after] his parents.', opts:['looks after','look after','looked up','looked on'],                       correct:0, type:'error'},
  // ── LESSON 17: Present Continuous ────────────────────────────────────────
  {lessonNum:17, topic:'Present Continuous',    topicUK:'Present Continuous',      q:'She ___ now.',                      opts:['study','studies','is studying','studied'],                                        correct:2},
  {lessonNum:17, topic:'Present Continuous',    topicUK:'Present Continuous',      q:'They ___ football right now.',      opts:['play','plays','are playing','played'],                                           correct:2},
  {lessonNum:17, topic:'Present Continuous',    topicUK:'Present Continuous',      q:'I ___ dinner at the moment.',       opts:['cook','cooks','am cooking','cooked'],                                            correct:2},
  {lessonNum:17, topic:'Present Continuous',    topicUK:'Present Continuous',      q:'Which sentence is correct?',        opts:['She is cook now.','They are studying.','He is study now.','I are working.'],    correct:1, type:'choice4'},
  {lessonNum:17, topic:'Present Continuous',    topicUK:'Present Continuous',      q:'Correct: She is [study] English now.', opts:['studying','study','studied','studies'],                                      correct:0, type:'error'},
  // ── LESSON 18: Imperative ─────────────────────────────────────────────────
  {lessonNum:18, topic:'Повелительное наклонение', topicUK:'Наказовий спосіб',    q:'___ quiet, please.',                opts:['Be','Is','Are','Being'],                                                          correct:0},
  {lessonNum:18, topic:'Повелительное наклонение', topicUK:'Наказовий спосіб',    q:"Don\'t ___ late.",                   opts:['be','is','are','being'],                                                         correct:0},
  {lessonNum:18, topic:'Повелительное наклонение', topicUK:'Наказовий спосіб',    q:'___ the window, please.',           opts:['Open','Opens','Opening','Opened'],                                                correct:0},
  {lessonNum:18, topic:'Повелительное наклонение', topicUK:'Наказовий спосіб',    q:'Which sentence is correct?',        opts:["Opens the window.","Being careful!","Don\'t be late.","Is quiet please."],        correct:2, type:'choice4'},
  {lessonNum:18, topic:'Повелительное наклонение', topicUK:'Наказовий спосіб',    q:'Correct: [Being] careful when you drive.',  opts:['Be','Being','Is','Are'],                                             correct:0, type:'error'},
  // ── LESSON 19: Prepositions of place ─────────────────────────────────────
  {lessonNum:19, topic:'Предлоги места',        topicUK:'Прийменники місця',       q:'The cat is ___ the table.',         opts:['in','on','under','between'],                                                     correct:1},
  {lessonNum:19, topic:'Предлоги места',        topicUK:'Прийменники місця',       q:'The book is ___ the bag.',          opts:['on','in','at','between'],                                                        correct:1},
  {lessonNum:19, topic:'Предлоги места',        topicUK:'Прийменники місця',       q:'She lives ___ London.',             opts:['on','at','in','by'],                                                             correct:2},
  {lessonNum:19, topic:'Предлоги места',        topicUK:'Прийменники місця',       q:'Which sentence is correct?',        opts:['The cat is in the table.','The cat is on the table.','The cat is at the table.','The cat is by table top.'], correct:1, type:'choice4'},
  {lessonNum:19, topic:'Предлоги места',        topicUK:'Прийменники місця',       q:'Correct: She lives [in] First Street.', opts:['on','in','at','by'],                                                       correct:0, type:'error'},
  // ── LESSON 20: Articles ───────────────────────────────────────────────────
  {lessonNum:20, topic:'Артикли (a/an/the)',    topicUK:'Артиклі (a/an/the)',       q:'She is ___ doctor.',                opts:['a','an','the','—'],                                                             correct:0},
  {lessonNum:20, topic:'Артикли (a/an/the)',    topicUK:'Артиклі (a/an/the)',       q:'I am ___ engineer.',                opts:['a','an','the','—'],                                                             correct:1},
  {lessonNum:20, topic:'Артикли (a/an/the)',    topicUK:'Артиклі (a/an/the)',       q:'She loves ___ sun.',                opts:['a','an','the','—'],                                                             correct:2},
  {lessonNum:20, topic:'Артикли (a/an/the)',    topicUK:'Артиклі (a/an/the)',       q:'Which sentence is correct?',        opts:['He is an teacher.','She is a engineer.','He is an honest man.','There is an cat.'], correct:2, type:'choice4'},
  {lessonNum:20, topic:'Артикли (a/an/the)',    topicUK:'Артиклі (a/an/the)',       q:'Correct: I am [an] student.',       opts:['a','an','the','—'],                                                             correct:0, type:'error'},
  // ── LESSON 21: Some/Any/Indefinite pronouns ───────────────────────────────
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:'I heard a noise. There must be ___ outside.',  opts:['somebody','anybody','nobody','everybody'],                                correct:0},
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:'Is there ___ who can help me?',             opts:['somewhere','anyone','no one','everyone'],                                          correct:1},
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:"I don\'t have ___ money.",        opts:['some','any','no','every'],                                                       correct:1},
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:'Which sentence is correct?',     opts:["I have any money.","She needs any help.","There is many people in the room.","He doesn\'t want anything."], correct:3, type:'choice4'},
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:"Correct: I don\'t have [some] time.", opts:['any','some','no','every'],                                                  correct:0, type:'error'},
  // ── LESSON 22: Gerund ─────────────────────────────────────────────────────
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'She enjoys ___.',                   opts:['dance','dances','dancing','to dance'],                                           correct:2},
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'He avoids ___ the problem.',        opts:['discuss','discussed','discussing','to discuss'],                                 correct:2},
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'They finished ___ dinner.',         opts:['cook','cooks','cooking','to cook'],                                              correct:2},
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'Which sentence is correct?',        opts:['She enjoys dance.','He avoids to talk.','I like swimming.','They finished cook.'], correct:2, type:'choice4'},
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'Correct: She enjoys [to swim].',    opts:['swimming','to swim','swim','swims'],                                             correct:0, type:'error'},
  // ── LESSON 23: Passive Voice ──────────────────────────────────────────────
  {lessonNum:23, topic:'Passive Voice',          topicUK:'Passive Voice',            q:'The letter ___ by her.',            opts:['wrote','is written','was written','had written'],                                correct:2},
  {lessonNum:23, topic:'Passive Voice',          topicUK:'Passive Voice',            q:'Cars ___ made in factories.',       opts:['is','am','are','were'],                                                         correct:2},
  {lessonNum:23, topic:'Passive Voice',          topicUK:'Passive Voice',            q:'The documents ___ checked today.', opts:['must be','must have','should','is going'],                                     correct:0},
  {lessonNum:23, topic:'Passive Voice',          topicUK:'Passive Voice',            q:'Which sentence is correct?',        opts:['The book wrote by him.','The book was written by him.','The book has write by him.','The book been written.'], correct:1, type:'choice4'},
  {lessonNum:23, topic:'Passive Voice',          topicUK:'Passive Voice',            q:'Correct: The letter [write] yesterday.', opts:['was written','write','written','wrote'],                                  correct:0, type:'error'},
  // ── LESSON 24: Present Perfect ────────────────────────────────────────────
  {lessonNum:24, topic:'Present Perfect',        topicUK:'Present Perfect',          q:"I ___ never been to Paris.",        opts:['have','has','had','was'],                                                        correct:0},
  {lessonNum:24, topic:'Present Perfect',        topicUK:'Present Perfect',          q:'She ___ just finished.',            opts:['have','has','had','is'],                                                         correct:1},
  {lessonNum:24, topic:'Present Perfect',        topicUK:'Present Perfect',          q:'Have you ever ___ sushi?',          opts:['eat','ate','eating','eaten'],                                                    correct:3},
  {lessonNum:24, topic:'Present Perfect',        topicUK:'Present Perfect',          q:'Which sentence is correct?',        opts:["I has never seen this.","She have eaten already.","They have already left.","He has ate his lunch."], correct:2, type:'choice4'},
  {lessonNum:24, topic:'Present Perfect',        topicUK:'Present Perfect',          q:'Correct: She [have] just arrived.', opts:['has','have','had','is'],                                                        correct:0, type:'error'},
  // ── LESSON 25: Past Continuous ────────────────────────────────────────────
  {lessonNum:25, topic:'Past Continuous',        topicUK:'Past Continuous',          q:'She ___ when I called.',            opts:['sleep','slept','was sleeping','has slept'],                                      correct:2},
  {lessonNum:25, topic:'Past Continuous',        topicUK:'Past Continuous',          q:'They ___ TV at 8 pm.',              opts:['watch','watched','were watching','have watched'],                                correct:2},
  {lessonNum:25, topic:'Past Continuous',        topicUK:'Past Continuous',          q:'I ___ when the phone rang.',        opts:['work','worked','was working','am working'],                                      correct:2},
  {lessonNum:25, topic:'Past Continuous',        topicUK:'Past Continuous',          q:'Which sentence is correct?',        opts:['She were sleeping.','They was watching TV.','He was studying.','I were cooking.'], correct:2, type:'choice4'},
  {lessonNum:25, topic:'Past Continuous',        topicUK:'Past Continuous',          q:'Correct: They [was] watching TV.',  opts:['were','was','are','is'],                                                         correct:0, type:'error'},
  // ── LESSON 26: Conditionals ───────────────────────────────────────────────
  {lessonNum:26, topic:'Условные предложения (if)', topicUK:'Умовні речення (if)',   q:'If it rains, I ___ stay home.',     opts:['will','would','shall','should'],                                                 correct:0},
  {lessonNum:26, topic:'Условные предложения (if)', topicUK:'Умовні речення (if)',   q:'If I ___ rich, I would travel.',    opts:['am','was','were','be'],                                                         correct:2},
  {lessonNum:26, topic:'Условные предложения (if)', topicUK:'Умовні речення (if)',   q:'If we had started earlier, we ___ finished.', opts:['will have','would have','had','did'],                                 correct:1},
  {lessonNum:26, topic:'Условные предложения (if)', topicUK:'Умовні речення (if)',   q:'Which sentence is correct?',        opts:['If it will rain, I stay.','If it rains, I will stay.','If it rained, I will stay.','If it rain, I would stay.'], correct:1, type:'choice4'},
  {lessonNum:26, topic:'Условные предложения (if)', topicUK:'Умовні речення (if)',   q:'Correct: If I [am] rich, I would travel.', opts:['were','am','is','be'],                                                 correct:0, type:'error'},
  // ── LESSON 27: Reported speech ────────────────────────────────────────────
  {lessonNum:27, topic:'Косвенная речь',         topicUK:'Непряма мова',             q:'He said he ___ tired.',             opts:['is','was','were','be'],                                                         correct:1},
  {lessonNum:27, topic:'Косвенная речь',         topicUK:'Непряма мова',             q:'She told me she ___ leave.',        opts:['will','would','shall','should'],                                                 correct:1},
  {lessonNum:27, topic:'Косвенная речь',         topicUK:'Непряма мова',             q:'He asked where I ___.',             opts:['live','lived','living','lives'],                                                 correct:1},
  {lessonNum:27, topic:'Косвенная речь',         topicUK:'Непряма мова',             q:'Which sentence is correct?',        opts:['He said he is tired.','She told me she would leave.','He asked where I live.','She said she will come.'], correct:1, type:'choice4'},
  {lessonNum:27, topic:'Косвенная речь',         topicUK:'Непряма мова',             q:"Correct: She said she [will] go.",  opts:['would','will','shall','should'],                                                correct:0, type:'error'},
  // ── LESSON 28: Reflexive pronouns ────────────────────────────────────────
  {lessonNum:28, topic:'Возвратные местоимения', topicUK:'Зворотні займенники',      q:'She did it ___.',                   opts:['her','herself','hers','she'],                                                    correct:1},
  {lessonNum:28, topic:'Возвратные местоимения', topicUK:'Зворотні займенники',      q:'He hurt ___ playing football.',     opts:['him','himself','his','he'],                                                      correct:1},
  {lessonNum:28, topic:'Возвратные местоимения', topicUK:'Зворотні займенники',      q:'They enjoyed ___ at the party.',    opts:['them','themselves','their','they'],                                              correct:1},
  {lessonNum:28, topic:'Возвратные местоимения', topicUK:'Зворотні займенники',      q:'Which sentence is correct?',        opts:['She did it herself.','He hurt hisself.','They enjoyed theirselves.','I saw me in the mirror.'], correct:0, type:'choice4'},
  {lessonNum:28, topic:'Возвратные местоимения', topicUK:'Зворотні займенники',      q:'Correct: He hurt [hisself] playing.', opts:['himself','hisself','himselves','his'],                                       correct:0, type:'error'},
  // ── LESSON 29: Used to ────────────────────────────────────────────────────
  {lessonNum:29, topic:'Used to',                topicUK:'Used to',                  q:'I ___ play football as a kid.',     opts:['used to','use to','am used to','was used to'],                                   correct:0},
  {lessonNum:29, topic:'Used to',                topicUK:'Used to',                  q:'She ___ live in Paris.',            opts:['used to','use to','is used to','uses to'],                                       correct:0},
  {lessonNum:29, topic:'Used to',                topicUK:'Used to',                  q:'He is ___ waking up early.',        opts:['use to','used to','used','get used to'],                                         correct:1},
  {lessonNum:29, topic:'Used to',                topicUK:'Used to',                  q:'Which sentence is correct?',        opts:['She use to dance.','He used to smoke.','They uses to work here.','I am use to it.'], correct:1, type:'choice4'},
  {lessonNum:29, topic:'Used to',                topicUK:'Used to',                  q:'Correct: He [use to] smoke.',       opts:['used to','use to','uses to','used'],                                             correct:0, type:'error'},
  // ── LESSON 30: Relative Clauses ───────────────────────────────────────────
  {lessonNum:30, topic:'Relative Clauses (who/which)', topicUK:'Relative Clauses (who/which)', q:'The man ___ called is my friend.',    opts:['who','which','whose','whom'],                                       correct:0},
  {lessonNum:30, topic:'Relative Clauses (who/which)', topicUK:'Relative Clauses (who/which)', q:'The book ___ I read was great.',      opts:['who','which','whose','whom'],                                       correct:1},
  {lessonNum:30, topic:'Relative Clauses (who/which)', topicUK:'Relative Clauses (who/which)', q:"The girl ___ mother is a doctor studies here.", opts:['who','which','whose','whom'],                             correct:2},
  {lessonNum:30, topic:'Relative Clauses (who/which)', topicUK:'Relative Clauses (who/which)', q:'Which sentence is correct?',          opts:['The boy which won is my brother.','The book who I read is great.','The car which I bought is red.','The girl whose is here is kind.'], correct:2, type:'choice4'},
  {lessonNum:30, topic:'Relative Clauses (who/which)', topicUK:'Relative Clauses (who/which)', q:'Correct: The book [who] I read.',     opts:['which','who','whose','whom'],                                       correct:0, type:'error'},
  // ── LESSON 31: Complex Object ─────────────────────────────────────────────
  {lessonNum:31, topic:'Complex Object',         topicUK:'Complex Object',           q:'I want you ___ this.',              opts:['do','doing','to do','done'],                                                     correct:2},
  {lessonNum:31, topic:'Complex Object',         topicUK:'Complex Object',           q:'She expects him ___ on time.',      opts:['arrive','arriving','to arrive','arrived'],                                       correct:2},
  {lessonNum:31, topic:'Complex Object',         topicUK:'Complex Object',           q:'I heard her ___ a song.',           opts:['sung','singing','to sing','sang'],                                               correct:1},
  {lessonNum:31, topic:'Complex Object',         topicUK:'Complex Object',           q:'Which sentence is correct?',        opts:['I want you doing this.','She expects him arrive.','He wants me to help.','I saw him to run.'], correct:2, type:'choice4'},
  {lessonNum:31, topic:'Complex Object',         topicUK:'Complex Object',           q:'Correct: I want you [doing] this.', opts:['to do','doing','do','done'],                                                    correct:0, type:'error'},
  // ── LESSON 32: Review ─────────────────────────────────────────────────────
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'She ___ not have come so early.',   opts:['should','shall','would','will'],                                                 correct:0},
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'By the time she arrived, he ___.', opts:['left','has left','had left','was leaving'],                                     correct:2},
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'If you had come, you ___ her.',     opts:['meet','met','would have met','had met'],                                         correct:2},
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'Which sentence is correct?',        opts:['She has never went there.','He have been working hard.','They have already arrived.','I has just eaten.'], correct:2, type:'choice4'},
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'Correct: By the time I called, he had [went] home.', opts:['gone','went','go','going'],                             correct:0, type:'error'},

  // — Extra pool: +1 per lesson (stronger mix for 50-question draw) —
  {lessonNum:1,  topic:'To Be (am/is/are)',      topicUK:'To Be (am/is/are)',      q:'The weather ___ nice today.',                    opts:['is','are','am','be'],                                                    correct:0},
  {lessonNum:2,  topic:'Отрицание To Be',        topicUK:'Заперечення To Be',      q:'We ___ not sure about the answer.',              opts:['is','am','are','be'],                                                    correct:2},
  {lessonNum:3,  topic:'Present Simple — утверждение', topicUK:'Present Simple — ствердження', q:'The sun ___ in the east.',    opts:['rise','rises','rose','rising'],                 correct:1},
  {lessonNum:4,  topic:'Present Simple — отрицание',  topicUK:'Present Simple — заперечення',  q:'I ___ not like horror movies.',         opts:['do','does','did','don\'t'],                                       correct:0},
  {lessonNum:5,  topic:'Present Simple — вопросы',    topicUK:'Present Simple — питання',      q:'___ your brother play tennis?',    opts:['Do','Does','Are','Is'],                                           correct:1},
  {lessonNum:6,  topic:'Специальные вопросы',   topicUK:'Спеціальні питання',      q:'___ do you get to work?',            opts:['What','When','How','Why'],                                        correct:2},
  {lessonNum:7,  topic:'Глагол To Have',        topicUK:'Дієслово To Have',        q:'We ___ dinner at 7 p.m. every day.',  opts:['has','have','having','haves'],                                  correct:1},
  {lessonNum:8,  topic:'Предлоги времени (at/in/on)', topicUK:'Прийменники часу (at/in/on)', q:'See you ___ Friday.',  opts:['in','on','at','by'],                        correct:1},
  {lessonNum:9,  topic:'There is / There are',  topicUK:'There is / There are',    q:'There ___ a lot of students in the hall.',  opts:['is','am','are','be'],                                 correct:2},
  {lessonNum:10, topic:'Модальные глаголы',    topicUK:'Модальні дієслова',       q:'It ___ rain later; take an umbrella.',     opts:['can','should','may','ought'],                    correct:2},
  {lessonNum:11, topic:'Past Simple — правильные', topicUK:'Past Simple — правильні', q:'I ___ the door before I left.',  opts:['lock','locked','locks','locking'],    correct:1},
  {lessonNum:12, topic:'Past Simple — неправильные', topicUK:'Past Simple — неправильні', q:'We ___ a great film last night.',  opts:['see','saw','seen','seeing'],  correct:1},
  {lessonNum:13, topic:'Future Simple (will)',  topicUK:'Future Simple (will)',    q:'I think you ___ like this book.',        opts:['will','are','is','wills'],                 correct:0},
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:'This is the ___ day of the year so far.',     opts:['hot','hottest','hotter','more hot'],  correct:1},
  {lessonNum:15, topic:'Притяжательные местоимения', topicUK:'Присвійні займенники', q:'The house is ___.',              opts:['our','ours','us','we'],     correct:1},
  {lessonNum:16, topic:'Фразовые глаголы',      topicUK:'Фразові дієслова',        q:'Please ___ your coat before you sit down.',   opts:['take off','take on','take in','take up'],  correct:0},
  {lessonNum:17, topic:'Present Continuous',    topicUK:'Present Continuous',      q:'Hurry! The bus ___ right now! ',     opts:['is left','is leaving','leave','left'],   correct:1},
  {lessonNum:18, topic:'Повелительное наклонение', topicUK:'Наказовий спосіб',    q:'___ the door, please.',             opts:['Close','Closes','Closing','Closed'],   correct:0},
  {lessonNum:19, topic:'Предлоги места',        topicUK:'Прийменники місця',       q:'The park is ___ the school.',    opts:['in front of','in front','front','before of'],  correct:0},
  {lessonNum:20, topic:'Артикли (a/an/the)',    topicUK:'Артиклі (a/an/the)',       q:'I need ___ hour to finish.',      opts:['a','an','the','—'],   correct:1},
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:'Do you have ___ friends here?',  opts:['any','some','no','every'],   correct:0},
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'I enjoy ___ to music in the car.',  opts:['listen','to listen','listening','listens'],  correct:2},
  {lessonNum:23, topic:'Passive Voice',          topicUK:'Passive Voice',            q:'The windows ___ every week.',     opts:['clean','is cleaned','are cleaned','cleans'],  correct:2},
  {lessonNum:24, topic:'Present Perfect',        topicUK:'Present Perfect',          q:'How long ___ you known him?',  opts:['do','are','have','has'],   correct:2},
  {lessonNum:25, topic:'Past Continuous',        topicUK:'Past Continuous',          q:'While I ___, the lights went out.',  opts:['cook','cooked','was cooking','am cooking'],  correct:2},
  {lessonNum:26, topic:'Условные предложения (if)', topicUK:'Умовні речення (if)',   q:'If you heat ice, it ___.',     opts:['melts','melted','will melt','is melting'],  correct:0},
  {lessonNum:27, topic:'Косвенная речь',         topicUK:'Непряма мова',             q:'She said that she ___.',      opts:['is tired','was tired','be tired','tired'],  correct:1},
  {lessonNum:28, topic:'Возвратные местоимения', topicUK:'Зворотні займенники',      q:'I cut ___ shaving this morning.',  opts:['me','myself','mine','I'],   correct:1},
  {lessonNum:29, topic:'Used to',                topicUK:'Used to',                  q:"I\'m not ___ driving on the left yet.",  opts:['used to','use to','used to it','am used to'],  correct:0},
  {lessonNum:30, topic:'Relative Clauses (who/which)', topicUK:'Relative Clauses (who/which)', q:'This is the house ___ I grew up in.',  opts:['which','who','whom','whose'],  correct:0},
  {lessonNum:31, topic:'Complex Object',         topicUK:'Complex Object',           q:'The teacher made us ___.',    opts:['to study','study','studying','studies'],  correct:1},
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'She might ___ the train if she runs.',   opts:['catch','to catch','catching','caught'],  correct:0},
];

function ProgressRing({progress,size=70,color,bg}:{progress:number;size?:number;color:string;bg:string}) {
  const pct = Math.round(progress*100);
  return(
    <View style={{width:size,height:size,borderRadius:size/2,borderWidth:3,borderColor:progress>0?color:bg,justifyContent:'center',alignItems:'center'}}>
      <Text style={{color:progress===1?color:pct===0?bg:color,fontSize:size*0.18,fontWeight:'700'}}>{pct}%</Text>
    </View>
  );
}

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

type Phase = 'locked'|'intro'|'countdown'|'quiz'|'review'|'result'|'cert';

function FrenchLingmanExamUnavailable({
  lang,
  onBack,
  onLessons,
  sx,
  t,
  f,
}: {
  lang: string;
  onBack: () => void;
  onLessons: () => void;
  sx: ReturnType<typeof screenTextOnGradient>;
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
}) {
  const copy = frenchExamGateCopy('final', lang);
  return (
    <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TapScale onPress={onBack}>
            <Ionicons name="chevron-back" size={28} color={sx.primary} />
          </TapScale>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: t.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <Ionicons name="shield-checkmark-outline" size={40} color={t.textSecond} />
          </View>
          <Text style={{ color: sx.primary, fontSize: f.h1, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
            {copy.title}
          </Text>
          <Text style={{ color: sx.muted, fontSize: f.bodyLg, lineHeight: 25, textAlign: 'center', marginBottom: 26 }}>
            {copy.body}
          </Text>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={onLessons}
            style={{ backgroundColor: t.bgSurface, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 14 }}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{copy.cta}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

export default function ExamScreen() {
  const router = useRouter();
  const runtimeActive = useRuntimeActive();
  const { playTimerExpired } = useTimerTickCue();
  const {theme:t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const {lang} = useLang();
  const { studyTarget } = useStudyTarget();
  const frenchExamBlocked = !examContentAvailableForTarget(studyTarget);
  const isFrenchExam = storageStudyTarget(studyTarget) === 'fr';
  const frenchExamSourceLocale = lang === 'uk' ? 'uk' : 'ru';
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const t3 = (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang as any, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const { isUnlimited, spendAmount, energy, bonusEnergy } = useEnergy();
  const [noEnergy, setNoEnergy] = useState(false);
  // Блокировка двойного тапа по «Начать тест»: спендим энергию ровно один раз, см. H12.
  const [examStarting, setExamStarting] = useState(false);
  const certificateSvgRef = useRef<InstanceType<typeof Svg> | null>(null);

  const [phase, setPhase]           = useState<Phase>('intro');
  const phaseBackRef = useRef<Phase>('intro');
  phaseBackRef.current = phase;

  // Android: системный «Назад» посреди идущего экзамена раньше мгновенно
  // уносил с экрана — часовая попытка терялась без единого вопроса.
  // Теперь во время quiz/review/countdown back требует подтверждения.
  useEffect(() => {
    if (!runtimeActive || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const p = phaseBackRef.current;
      if (p !== 'quiz' && p !== 'review' && p !== 'countdown') return false;
      Alert.alert(
        t3('Выйти из экзамена?', 'Вийти з іспиту?', '¿Salir del examen?', 'Sair do exame?', 'Thoát bài kiểm tra?', 'Keluar dari ujian?', 'Sınavdan çıkılsın mı?', 'Wyjść z egzaminu?'),
        t3(
          'Текущая попытка будет потеряна, ответы не сохранятся.',
          'Поточну спробу буде втрачено, відповіді не збережуться.',
          'Perderás el intento actual y tus respuestas no se guardarán.',
          'A tentativa atual será perdida e as respostas não serão salvas.',
          'Lần làm bài hiện tại sẽ mất, câu trả lời không được lưu.',
          'Percobaan saat ini akan hilang dan jawaban tidak disimpan.',
          'Mevcut deneme kaybolacak, cevaplar kaydedilmeyecek.',
          'Bieżąca próba zostanie utracona, odpowiedzi nie zostaną zapisane.',
        ),
        [
          { text: t3('Продолжить экзамен', 'Продовжити іспит', 'Seguir con el examen', 'Continuar o exame', 'Tiếp tục làm bài', 'Lanjutkan ujian', 'Sınava devam et', 'Kontynuuj egzamin'), style: 'cancel' },
          {
            text: t3('Выйти', 'Вийти', 'Salir', 'Sair', 'Thoát', 'Keluar', 'Çık', 'Wyjdź'),
            style: 'destructive',
            onPress: () => safeRouterBack(router),
          },
        ],
      );
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t3/router стабильны в рамках экрана
  }, [runtimeActive]);

  const [lessonsCompleted, setCompleted] = useState(0);
  const [certificate, setCertificate] = useState<LingmanCertificate | null>(null);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  /** Предзаполнение для модалки ввода имени на сертификат: подсказка из
   *  user_name / Google displayName, чтобы юзеру не пришлось вводить с нуля.
   *  Юзер всё равно явно подтверждает (или меняет) до того как сертификат
   *  с этим именем попадёт в шеринг. */
  const [certNamePrefill, setCertNamePrefill] = useState('');
  const [mountExportCert, setMountExportCert] = useState(false);
  const englishQuestions = React.useMemo(() => {
    if (frenchExamBlocked) return [];
    // Группируем по уроку
    const byLesson: Record<number, ExamQuestion[]> = {};
    for (const q of EXAM_POOL) {
      if (!byLesson[q.lessonNum]) byLesson[q.lessonNum] = [];
      byLesson[q.lessonNum].push(q);
    }
    const mandatory: ExamQuestion[] = [];
    const extras:    ExamQuestion[] = [];
    for (const lessonQs of Object.values(byLesson)) {
      const shuffled = shuffle(lessonQs);
      mandatory.push(shuffled[0]);           // минимум 1 из каждой темы
      if (shuffled[1]) extras.push(shuffled[1]); // кандидат на 2-й вопрос
    }
    const needed = Math.max(0, 50 - mandatory.length);
    const pool = [...mandatory, ...shuffle(extras).slice(0, needed)];
    const result = shuffle(pool);
    return result.map(q => ({ ...q, rawTopic: q.rawTopic ?? q.topic, topic: examTopicForLang(q, lang) }));
  }, [frenchExamBlocked, lang]);
  const [frenchQuestions, setFrenchQuestions] = useState<ExamQuestion[]>([]);
  const [examQuestionsLoading, setExamQuestionsLoading] = useState(false);
  const questions = isFrenchExam ? frenchQuestions : englishQuestions;
  const [idx, setIdx]               = useState(0);
  const [choices, setChoices]       = useState<(number|null)[]>(() => Array(questions.length).fill(null));
  const [flagged, setFlagged]       = useState<boolean[]>(() => Array(questions.length).fill(false));
  const [totalTimeLeft, setTotalTimeLeft] = useState(TOTAL_EXAM_SECONDS);
  const [countdownNum, setCountdownNum] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const examDeadlineRef = useRef<number | null>(null);
  const countdownRemainingMsRef = useRef(3 * 650);
  const countdownDeadlineRef = useRef(0);
  const examAttemptIdRef = useRef<string>(makeExamAttemptId());
  const countdownAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    if (!isFrenchExam || frenchExamBlocked) {
      setFrenchQuestions([]);
      setExamQuestionsLoading(false);
      return () => { cancelled = true; };
    }
    setExamQuestionsLoading(true);
    loadFrenchRemoteFinalExamQuestions(frenchExamSourceLocale, 50)
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
  }, [frenchExamBlocked, frenchExamSourceLocale, isFrenchExam]);

  useEffect(() => {
    setIdx(0);
    setChoices(Array(questions.length).fill(null));
    setFlagged(Array(questions.length).fill(false));
  }, [questions.length]);

  useEffect(()=>{
    (async()=>{
      if (frenchExamBlocked) {
        setCompleted(0);
        setPhase('intro');
        return;
      }
      // Подсчитываем завершённые уроки для отображения прогресса
      const keys = Array.from({length:32},(_,i)=>lessonProgressKey(i + 1, studyTarget));
      const pairs = await AsyncStorage.multiGet(keys);
      let done=0;
      for(const [,saved] of pairs){
        if(saved){ try{const p:string[]=JSON.parse(saved);if(p.filter((x:string)=>x==='correct'||x==='replay_correct').length>=45)done++;}catch{} }
      }
      setCompleted(done);
      const existingCert = await loadLingmanCertificate(studyTarget);
      if (existingCert) {
        setCertificate(existingCert);
        // Юзер уже сдал — открывать сразу его сертификат, а не intro/locked.
        setPhase('cert');
        return;
      }
      // Экзамен Лингмана: все 32 урока = 5.0 + все зачёты сданы
      if(!DEV_CONTENT_UNLOCK){
        const available = await isLingmanExamAvailable(studyTarget);
        if(!available) setPhase('locked');
      }
    })();
  },[frenchExamBlocked, studyTarget]);

  useEffect(()=>{
    if (phase !== 'quiz' && phase !== 'review') {
      if(timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (!examDeadlineRef.current) {
      examDeadlineRef.current = Date.now() + totalTimeLeft * 1000;
    }
    if (!runtimeActive) return;
    const update = () => {
      if (!examDeadlineRef.current) return;
      const next = Math.max(0, Math.ceil((examDeadlineRef.current - Date.now()) / 1000));
      setTotalTimeLeft(next);
      if (next === 0 && phase === 'quiz') {
        // зачем: экзамен сам уходит в разбор — без звука это выглядело как
        // самопроизвольный переход. Предупреждающий тик здесь НЕ ставим:
        // тут таймер на весь экзамен (минуты), а не на задание.
        playTimerExpired();
        setPhase('review');
      }
    };
    update();
    timerRef.current = setInterval(update,1000);
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[phase, runtimeActive, playTimerExpired]);

  useEffect(() => {
    if (phase !== 'countdown') {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }
    if (!runtimeActive) return;
    countdownDeadlineRef.current = Date.now() + countdownRemainingMsRef.current;
    const tick = () => {
      const remainingMs = Math.max(0, countdownDeadlineRef.current - Date.now());
      countdownRemainingMsRef.current = remainingMs;
      if (remainingMs <= 0) {
        setPhase('quiz');
        countdownTimerRef.current = null;
        return;
      }
      setCountdownNum(Math.max(1, Math.ceil(remainingMs / 650)));
      const untilNextStep = remainingMs % 650 || 650;
      countdownTimerRef.current = setTimeout(tick, untilNextStep);
    };
    tick();
    return () => {
      countdownRemainingMsRef.current = Math.max(0, countdownDeadlineRef.current - Date.now());
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [phase, runtimeActive]);

  useEffect(() => {
    if (phase !== 'countdown' || !runtimeActive) return;
    countdownAnim.setValue(0.9);
    Animated.spring(countdownAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 140,
    }).start();
    return () => countdownAnim.stopAnimation();
  }, [countdownNum, phase, countdownAnim, runtimeActive]);

  const { flashKey, flash } = useWordFlash();

  const handleAnswer = (ci: number) => {
    setChoices(prev => { const n=[...prev]; n[idx]=ci; return n; });
  };

  const toggleFlag = () => {
    setFlagged(prev => { const n=[...prev]; n[idx]=!n[idx]; return n; });
  };

  const goNext = () => {
    if(idx+1 < questions.length) setIdx(i=>i+1);
    else setPhase('review');
  };

  const goPrev = () => {
    if(idx > 0) setIdx(i=>i-1);
  };

  const skipToNext = () => {
    for(let offset=1; offset<questions.length; offset++){
      const ni = (idx+offset) % questions.length;
      if(choices[ni]===null){ setIdx(ni); return; }
    }
    setPhase('review');
  };

  const startExam = async () => {
    if (examStarting) return; // двойной тап → второй вызов игнорируем
    if (frenchExamBlocked) {
      void trackFeatureBlocked('exam', 'start', 'exam_content_gate_disabled', { studyTarget }, 'exam');
      return;
    }
    if (examQuestionsLoading || questions.length === 0) {
      void trackFeatureBlocked('exam', 'start', 'exam_questions_unavailable', {
        studyTarget,
        loading: examQuestionsLoading,
      }, 'exam');
      return;
    }
    setExamStarting(true);
    try {
      examAttemptIdRef.current = makeExamAttemptId();
      void trackFeatureStart('exam', 'start', { questions: questions.length }, 'exam');
      if (!isUnlimited) {
        if (energy + bonusEnergy < LINGMAN_EXAM_ENERGY) {
          void trackFeatureBlocked('exam', 'start', 'no_energy', { energy, bonusEnergy, required: LINGMAN_EXAM_ENERGY }, 'exam');
          setNoEnergy(true);
          return;
        }
        const ok = await spendAmount(LINGMAN_EXAM_ENERGY);
        if (!ok) {
          void trackFeatureBlocked('exam', 'start', 'energy_spend_failed', { energy, bonusEnergy, required: LINGMAN_EXAM_ENERGY }, 'exam');
          setNoEnergy(true);
          return;
        }
      }
      setIdx(0);
      setChoices(Array(questions.length).fill(null));
      setFlagged(Array(questions.length).fill(false));
      setTotalTimeLeft(TOTAL_EXAM_SECONDS);
      examDeadlineRef.current = Date.now() + TOTAL_EXAM_SECONDS * 1000;
      countdownRemainingMsRef.current = 3 * 650;
      setPhase('countdown');
    } finally {
      // Сбрасываем не сразу — даём React закоммитить переход фазы; при failure
      // тоже сбрасываем чтобы кнопку можно было нажать снова.
      setExamStarting(false);
    }
  };

  const submitExam = async () => {
    try {
      const s = choices.filter((c, i) => c !== null && c === questions[i]?.correct).length;
      const p = questions.length > 0 ? Math.round(s / questions.length * 100) : 0;
      const mistakeSignals = questions
        .map((question, i) => buildExamMistakeSignal(question, choices[i] ?? null))
        .filter((item): item is { lessonId: number; signal: PhraseMistakeSignal; what: MistakeWhat } => Boolean(item));
      mistakeSignals.forEach(({ lessonId, signal, what }) => {
        const { phrase, ...meta } = signal;
        logMistake(phrase, lessonId, 'exam', what, meta, studyTarget);
      });
    // XP: 10000 за золото (≥90%) — НО только в ПЕРВЫЙ раз (когда сертификата ещё нет).
    // На пересдаче (сертификат уже есть) ≥90% платит как обычная сдача: 50 + бонус за %.
    // Иначе registerXP с новым eventId каждой попытки давал бы 10000 XP за каждую пересдачу.
    const alreadyCertified = !!(await loadLingmanCertificate(studyTarget).catch(() => null));
    const xp = (p >= 90 && !alreadyCertified) ? 10000 : 50 + Math.round(p / 2);
    if (p >= 90) awardOneTime('exam_excellent').catch(() => {});
    checkAchievements({ type: 'exam', pct: p, studyTarget }).catch(() => {});
    let storedName = '';
    try {
      const raw = await AsyncStorage.getItem('user_name');
      storedName = (raw || '').trim();
    } catch {}
    if (storedName) {
      registerXP(xp, 'exam_complete', storedName, lang, undefined, {
        eventId: [
          'exam',
          'final',
          safeExamEventPart(studyTarget),
          safeExamEventPart(examAttemptIdRef.current),
          'complete',
        ].join(':'),
        payload: {
          level: 'final',
          studyTarget,
          pct: p,
          percent: p,
          passed: p >= LINGMAN_CERT_MIN_PCT,
          score: s,
          total: questions.length,
          answered: choices.filter(c => c !== null).length,
        },
      }).catch(() => {});
    }
    if (p >= LINGMAN_CERT_MIN_PCT) {
      // ВАЖНО: при первой сдаче сертификат создаётся БЕЗ имени и сразу
      // открывается модалка ввода имени. Имя из user_name / Google displayName
      // подставляется как initialName для удобства, но юзер обязан
      // подтвердить — потому что:
      //   1. Подставленное имя может быть нежелательным (Google "Anna Levchenko"
      //      когда юзер хочет официальное "Анна Левченко" или вообще другое).
      //   2. Сертификатом юзер делится с другими — это не должно происходить
      //      молча с автоматически подставленным именем.
      // Если юзер уже сдавал ранее — мы не сюда попадаем, а в загрузку
      // existingCert (см. effect выше), где модалка не показывается.
      const cert = buildLingmanCertificate({
        name: '',
        score: s,
        total: questions.length,
        pct: p,
        lang: bundleLang(lang),
      });
      await saveLingmanCertificate(cert, studyTarget);
      setCertificate(cert);
      // Подсказка для модалки — из локального профиля, юзер может оставить или изменить.
      setCertNamePrefill(storedName);
      setNameModalVisible(true);
    }
      void trackFeatureSuccess('exam', 'complete', {
        score: s,
        total: questions.length,
        pct: p,
        xp,
        certificate: p >= LINGMAN_CERT_MIN_PCT,
      }, 'exam');
      setPhase('result');
    } catch (e) {
      void trackFeatureError('exam', 'complete', e, { answered: choices.filter(c => c !== null).length, total: questions.length }, 'exam');
      setPhase('result');
    }
  };

  const handleSaveName = async (name: string) => {
    try {
      await AsyncStorage.setItem('user_name', name);
    } catch {}
    const updated = await updateLingmanCertificateName(name, studyTarget);
    if (updated) setCertificate(updated);
    setNameModalVisible(false);
  };

  // Двойной reqAF нужен, чтобы скрытый SVG успел смонтироваться и ref уже
  // поддерживал toDataURL перед экспортом PNG.
  const waitTwoFrames = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

  const shareCertificate = async () => {
    if (!certificate) return;
    // Защита: не разрешаем шарить сертификат без имени.
    if (!certificate.name?.trim()) {
      setNameModalVisible(true);
      return;
    }
    const msg = buildCertificateShareMessage(
      certificate.lang,
      certificate.name,
      certificate.pct,
      STORE_URL
    );
    setMountExportCert(true);
    try {
      await waitTwoFrames();
      await shareCardFromSvgRef(certificateSvgRef, {
        fileNamePrefix: `phraseman-certificate-${certificate.certId}`,
        textFallback: msg,
        width: 1500,
        height: 1080,
      });
    } finally {
      setMountExportCert(false);
    }
  };

  const shareExamResult = async () => {
    const msg = buildExamShareMessage(bundleLang(lang), score, questions.length, pct, STORE_URL);
    await Share.share({ message: msg }).catch(() => {});
  };

  const score = choices.filter((c,i) => c !== null && c === questions[i]?.correct).length;
  const answered = choices.filter(c => c !== null).length;
  const pct = questions.length>0?Math.round(score/questions.length*100):0;
  const examXp = pct >= 90 ? 10000 : 50 + Math.round(pct / 2);
  if (frenchExamBlocked) return (
    <FrenchLingmanExamUnavailable
      lang={lang}
      onBack={() => safeRouterBack(router)}
      onLessons={() => router.replace('/lessons_list' as any)}
      sx={sx}
      t={t}
      f={f}
    />
  );
  const q = questions[idx]||questions[0];
  if (!q) return null;
  const chosen = choices[idx];
  const isFlagged = flagged[idx];
  const isLowTime = totalTimeLeft < 5 * 60; // < 5 min

  // ── LOCKED ────────────────────────────────────────────────────────────────
  if(phase==='locked') return(
    <>
    <ScreenGradient artBackdrop="exam">
    <SafeAreaView style={{flex:1}}>
      <View style={{flexDirection:'row',alignItems:'center',padding:15,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <TapScale onPress={() => safeRouterBack(router)}>
          <Ionicons name="chevron-back" size={28} color={sx.primary}/>
        </TapScale>
        <Text style={{color:sx.primary,fontSize:f.h2,fontWeight:'700',marginLeft:8}}>
          {t3('Экзамен', 'Іспит', 'Examen', 'Exame', 'Bài kiểm tra', 'Ujian', 'Sınav', 'Egzamin')}
        </Text>
      </View>
      <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:30}}>
        <ProgressRing progress={lessonsCompleted/32} size={90} color={t.correct} bg={t.border}/>
        <Text style={{color:sx.primary,fontSize:f.h1,fontWeight:'700',textAlign:'center',marginTop:24,marginBottom:12}}>
          {t3('Экзамен недоступен', 'Іспит недоступний', 'Examen no disponible', 'Exame indisponível', 'Bài kiểm tra chưa khả dụng', 'Ujian belum tersedia', 'Sınav kullanılamıyor', 'Egzamin niedostępny')}
        </Text>
        <Text style={{color:sx.muted,fontSize:f.body,textAlign:'center',lineHeight:24}}>
          {t3(
            'Пройди все 32 урока с оценкой 5.0 и сдай все 4 зачёта, чтобы открыть финальный тест Phraseman.',
            'Пройди всі 32 уроки з оцінкою 5.0 та склади всі 4 заліки, щоб відкрити фінальний тест Phraseman.',
            'Completa las 32 lecciones con nota 5,0 y supera los 4 exágenes de nivel para desbloquear el examen final de Phraseman.',
            'Complete as 32 lições com nota 5,0 e passe nos 4 testes de nível para desbloquear o exame final do Phraseman.',
            'Hoàn thành tất cả 32 bài học với điểm 5,0 và vượt qua 4 bài kiểm tra cấp độ để mở bài kiểm tra cuối của Phraseman.',
            'Selesaikan semua 32 pelajaran dengan nilai 5,0 dan lulus 4 tes level untuk membuka ujian akhir Phraseman.',
            'Phraseman final sınavını açmak için 32 dersin tamamını 5,0 puanla bitir ve 4 seviye testini geç.',
            'Ukończ wszystkie 32 lekcje z oceną 5,0 i zdaj 4 testy poziomujące, aby odblokować egzamin końcowy Phraseman.',
          )}
        </Text>
        <View style={{backgroundColor:t.bgCard,borderRadius:16,padding:16,width:'100%',marginTop:28}}>
          <View style={{height:8,backgroundColor:t.border,borderRadius:4,overflow:'hidden'}}>
            <View style={{height:'100%',width:`${lessonsCompleted/32*100}%` as any,backgroundColor:t.textSecond,borderRadius:4}}/>
          </View>
          <Text style={{color:t.textMuted,fontSize:f.caption,marginTop:8,textAlign:'center'}}>
            {lessonsCompleted} {t3('из 32 уроков завершено', 'з 32 уроків завершено', 'de 32 lecciones completadas', 'de 32 lições concluídas', 'trong 32 bài học đã hoàn thành', 'dari 32 pelajaran selesai', '/ 32 ders tamamlandı', 'z 32 lekcji ukończono')}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.75} style={{marginTop:24}} onPress={()=>router.replace('/lessons_list' as any)}>
          <Text style={{color:sx.second,fontSize:f.bodyLg,textDecorationLine:'underline'}}>
            {t3('Перейти к урокам →', 'Перейти до уроків →', 'Ir a las lecciones →', 'Ir para as lições →', 'Đi tới bài học →', 'Ke pelajaran →', 'Derslere git →', 'Przejdź do lekcji →')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </ScreenGradient>
    <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} minRequired={LINGMAN_EXAM_ENERGY} />
    </>
  );

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if(phase==='intro') return(
    <>
    <ScreenGradient artBackdrop="exam">
    <SafeAreaView style={{flex:1}}>
      <View style={{flexDirection:'row',alignItems:'center',padding:15,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <TapScale onPress={() => certificate ? setPhase('cert') : safeRouterBack(router)}>
          <Ionicons name="chevron-back" size={28} color={sx.primary}/>
        </TapScale>
        <Text style={{color:sx.primary,fontSize:f.h2,fontWeight:'700',marginLeft:8}}>
          {t3('Итоговый тест курса', 'Підсумковий тест курсу', 'Examen integrador del curso', 'Teste final do curso', 'Bài kiểm tra tổng kết khóa học', 'Tes akhir kursus', 'Kurs final sınavı', 'Test końcowy kursu')}
        </Text>
      </View>
      <BouncyScrollView decelerationRate="normal" contentContainerStyle={{padding:20}}>
        {certificate && (
          <View style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(212,160,23,0.08)',borderRadius:10,padding:10,borderWidth:0,borderColor:'#d4a017',marginBottom:16}}>
            <Ionicons name="information-circle" size={18} color={monoIcon(themeMode, '#FFD700')}/>
            <Text style={{color:monoIcon(themeMode, '#FDE68A'),fontSize:f.sub,flex:1}}>
              {t3(
                `Текущий результат: ${certificate.pct}%. Новый пересчёт — только при 80% и выше (награда в приложении).`,
                `Поточний результат: ${certificate.pct}%. Новий перерахунок — лише за ≥ 80% (нагорода в застосунку).`,
                `Resultado actual: ${certificate.pct} %. Solo se actualizará el diploma en la app si sacas ≥ 80 %.`,
                `Resultado atual: ${certificate.pct}%. A premiação no app só será atualizada com ≥ 80%.`,
                `Kết quả hiện tại: ${certificate.pct}%. Phần thưởng trong ứng dụng chỉ cập nhật khi đạt ≥ 80%.`,
                `Hasil saat ini: ${certificate.pct}%. Penghargaan di aplikasi hanya diperbarui jika nilainya ≥ 80%.`,
                `Mevcut sonuç: ${certificate.pct}%. Uygulamadaki ödül yalnızca ≥ 80% olursa güncellenir.`,
                `Aktualny wynik: ${certificate.pct}%. Nagroda w aplikacji zaktualizuje się tylko przy wyniku ≥ 80%.`,
              )}
            </Text>
          </View>
        )}
        <View style={{alignItems:'center',marginBottom:24}}>
          <View style={{width:90,height:90,borderRadius:45,backgroundColor:t.bgCard,justifyContent:'center',alignItems:'center',marginBottom:16}}>
            <Ionicons name="ribbon-outline" size={40} color={t.textSecond}/>
          </View>
          <Text style={{color:sx.primary,fontSize:f.numMd+6,fontWeight:'700',textAlign:'center'}}>
            {t3('Что будет на экзамене', 'Що буде на іспиті', 'Qué incluye el examen', 'O que cai no exame', 'Bài kiểm tra gồm những gì', 'Isi ujian', 'Sınavda neler var', 'Co obejmuje egzamin')}
          </Text>
          <Text style={{color:sx.muted,fontSize:f.body,textAlign:'center',marginTop:8,lineHeight:22}}>
            {t3(
              '50 заданий: грамматика и лексика по темам уроков; оценка только в приложении (не DELE/SIELE).',
              '50 завдань: граматика й лексика за темами уроків; оцінка лише в застосунку (не DELE/SIELE).',
              '50 tareas: gramática y léxico según las lecciones; resultado orientativo en la app (no es DELE/SIELE).',
              '50 tarefas: gramática e vocabulário dos temas das lições; resultado apenas no app (não é DELE/SIELE).',
              '50 câu hỏi: ngữ pháp và từ vựng theo chủ đề bài học; điểm chỉ dùng trong ứng dụng (không phải DELE/SIELE).',
              '50 soal: tata bahasa dan kosakata dari topik pelajaran; nilai hanya di aplikasi (bukan DELE/SIELE).',
              '50 soru: ders konularına göre gramer ve kelime; sonuç sadece uygulama içindir (DELE/SIELE değildir).',
              '50 zadań: gramatyka i słownictwo z tematów lekcji; wynik tylko w aplikacji (to nie DELE/SIELE).',
            )}
          </Text>
        </View>
        {[
          { icon: 'timer-outline', ru: '60 минут на весь блок', uk: '60 хвилин на весь блок', es: '60 minutos para todo el bloque', 'pt-BR': '60 minutos para todo o bloco', ptBr: '60 minutos para todo o bloco', vi: '60 phút cho toàn bộ phần', id: '60 menit untuk seluruh blok', tr: 'Tüm blok için 60 dakika', pl: '60 minut na cały blok' },
          {
            icon: 'bookmark-outline',
            ru: 'Можно помечать и пропускать вопросы, затем вернуться, если есть время',
            uk: 'Можна позначати й пропускати питання, потім повернутися, якщо є час',
            es: 'Puedes marcar y saltar preguntas y volver si te da tiempo',
            'pt-BR': 'Você pode marcar e pular perguntas e voltar se der tempo',
            ptBr: 'Você pode marcar e pular perguntas e voltar se der tempo',
            vi: 'Bạn có thể đánh dấu, bỏ qua câu hỏi rồi quay lại nếu còn thời gian',
            id: 'Kamu bisa menandai dan melewati soal, lalu kembali jika masih ada waktu',
            tr: 'Soruları işaretleyip atlayabilir, zaman kalırsa geri dönebilirsin',
            pl: 'Możesz oznaczać i pomijać pytania, a potem wrócić, jeśli starczy czasu',
          },
          {
            icon: 'ribbon-outline',
            ru: 'Награда уровня B2 в приложении при успешной сдаче',
            uk: 'Нагорода рівня B2 у застосунку при успішній здачі',
            es: 'Insignia nivel B2 en la app al completar con éxito',
            'pt-BR': 'Insígnia nível B2 no app ao concluir com sucesso',
            ptBr: 'Insígnia nível B2 no app ao concluir com sucesso',
            vi: 'Huy hiệu cấp B2 trong ứng dụng khi hoàn thành thành công',
            id: 'Badge level B2 di aplikasi setelah berhasil selesai',
            tr: 'Başarıyla tamamlarsan uygulamada B2 seviyesi rozeti',
            pl: 'Odznaka poziomu B2 w aplikacji po zdaniu testu',
            sub: true as const,
          },
        ].map((item,i)=>(
          <View key={i} style={{flexDirection:'row',alignItems:'flex-start',gap:12,marginBottom:12,backgroundColor:t.bgCard,padding:14,borderRadius:14}}>
            <Ionicons name={item.icon as any} size={22} color={t.textSecond} style={{marginTop:1}}/>
            <View style={{flex:1}}>
              <Text style={{color:t.textPrimary,fontSize:f.body,flex:1}}>{t3(item.ru, item.uk, item.es, item.ptBr, item.vi, item.id, item.tr, item.pl)}</Text>
              {'sub' in item && item.sub && (
                <Text style={{color:t.textMuted,fontSize:f.caption,marginTop:3}}>
                  {t3(
                    'диплом в приложении при результате 80% и выше',
                    'диплом у застосунку за результатом ≥ 80%',
                    'diploma en la app con resultado ≥ 80 %',
                    'diploma no app com resultado ≥ 80%',
                    'chứng chỉ trong ứng dụng khi đạt ≥ 80%',
                    'diploma di aplikasi dengan hasil ≥ 80%',
                    '≥ 80% sonuçla uygulamada diploma',
                    'dyplom w aplikacji przy wyniku ≥ 80%',
                  )}
                </Text>
              )}
            </View>
          </View>
        ))}
        <TouchableOpacity
          style={{backgroundColor:t.bgSurface,borderRadius:16,padding:18,alignItems:'center',marginTop:12,opacity: examStarting ? 0.6 : 1}}
          onPress={() => { void startExam(); }}
          disabled={examStarting}
          activeOpacity={0.85}
        >
          <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700'}}>
            {t3('Начать тест', 'Почати тест', 'Empezar', 'Começar', 'Bắt đầu', 'Mulai', 'Başla', 'Rozpocznij')}
          </Text>
        </TouchableOpacity>
        {!isUnlimited && (
          <Text style={{color:sx.muted,fontSize:f.caption,textAlign:'center',marginTop:10}}>
            {t3(
              `${LINGMAN_EXAM_ENERGY} ⚡ списываются за один старт · Plus — без лимита`,
              `${LINGMAN_EXAM_ENERGY} ⚡ знімаються за один старт · Plus — без ліміту`,
              `${LINGMAN_EXAM_ENERGY} ⚡ se descuentan al empezar · Plus — sin límite`,
              `${LINGMAN_EXAM_ENERGY} ⚡ são descontados ao começar · Plus sem limite`,
              `Bắt đầu sẽ trừ ${LINGMAN_EXAM_ENERGY} ⚡ · Plus không giới hạn`,
              `${LINGMAN_EXAM_ENERGY} ⚡ dipakai saat mulai · Plus tanpa batas`,
              `Başlangıçta ${LINGMAN_EXAM_ENERGY} ⚡ düşülür · Plus sınırsız`,
              `${LINGMAN_EXAM_ENERGY} ⚡ pobierane przy starcie · Plus bez limitu`,
            )}
          </Text>
        )}
        <Text style={{color:sx.muted,fontSize:f.caption,textAlign:'center',marginTop:12}}>
          {t3(
            'После начала таймер не останавливается',
            'Після початку таймер не зупиняється',
            'Cuando empiezas, el temporizador no se detiene',
            'Depois de começar, o cronômetro não para',
            'Sau khi bắt đầu, đồng hồ sẽ không dừng',
            'Setelah mulai, timer tidak berhenti',
            'Başladıktan sonra süre durmaz',
            'Po rozpoczęciu licznik się nie zatrzymuje',
          )}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home' as any)}
          style={{ marginTop: 8, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Text style={{ color: sx.second, fontSize: f.sub, textDecorationLine: 'underline' }}>
            {t3('На главную', 'На головну', 'Volver al inicio', 'Voltar ao início', 'Về trang chủ', 'Kembali ke beranda', 'Ana sayfaya dön', 'Wróć na stronę główną')}
          </Text>
        </TouchableOpacity>
      </BouncyScrollView>
    </SafeAreaView>
    </ScreenGradient>
    <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} minRequired={LINGMAN_EXAM_ENERGY} />
    </>
  );

  // ── REVIEW ────────────────────────────────────────────────────────────────
  if(phase==='review') return(
    <>
    <ScreenGradient artBackdrop="exam">
    <SafeAreaView style={{flex:1}}>
      <View style={{flexDirection:'row',alignItems:'center',padding:15,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <TapScale
          style={{flexDirection:'row',alignItems:'center',gap:4}}
          onPress={()=>setPhase('quiz')}
        >
          <Ionicons name="chevron-back" size={24} color={t.textPrimary}/>
        </TapScale>
        <Text style={{color:sx.primary,fontSize:f.h2,fontWeight:'700',marginLeft:8,flex:1}}>
          {t3('Проверка ответов', 'Перевірка відповідей', 'Revisión de respuestas', 'Revisão das respostas', 'Kiểm tra câu trả lời', 'Tinjau jawaban', 'Cevapları kontrol et', 'Sprawdzenie odpowiedzi')}
        </Text>
        <Text style={{color:isLowTime?t.wrong:t.textSecond,fontSize:f.body,fontWeight:'600'}}>
          {formatTime(totalTimeLeft)}
        </Text>
      </View>

      <View style={{flexDirection:'row',gap:8,paddingHorizontal:16,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,flexShrink:1}}>
          <View style={{width:10,height:10,borderRadius:5,backgroundColor:t.correct,flexShrink:0}}/>
          <Text style={{color:sx.second,fontSize:f.sub}} numberOfLines={1}>
            {answered} {t3('отв.', 'відп.', 'resp.', 'resp.', 'đã trả lời', 'jawab', 'cevap', 'odp.')}
          </Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,flexShrink:1}}>
          <View style={{width:10,height:10,borderRadius:5,backgroundColor:t.wrong,flexShrink:0}}/>
          <Text style={{color:sx.second,fontSize:f.sub}} numberOfLines={1}>
            {questions.length-answered} {t3('без отв.', 'без відп.', 'sin resp.', 'sem resp.', 'chưa trả lời', 'tanpa jawaban', 'cevapsız', 'bez odp.')}
          </Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,flexShrink:1}}>
          <Ionicons name="bookmark" size={12} color={monoIcon(themeMode, '#D4A017')}/>
          <Text style={{color:sx.second,fontSize:f.sub}} numberOfLines={1}>
            {flagged.filter(Boolean).length} {t3('помеч.', 'позн.', 'marc.', 'marc.', 'đã đánh dấu', 'ditandai', 'işaretli', 'ozn.')}
          </Text>
        </View>
      </View>

      <BouncyScrollView decelerationRate="normal" contentContainerStyle={{paddingBottom:120}}>
        {questions.map((qItem, i) => {
          const isAnswered = choices[i] !== null;
          const isFlaggedItem = flagged[i];
          return (
            <TouchableOpacity
              key={i}
              style={{
                flexDirection:'row', alignItems:'center',
                paddingHorizontal:16, paddingVertical:12,
                borderBottomWidth:0.5, borderBottomColor:t.border,
                backgroundColor: i===idx ? t.bgCard : t.bgPrimary,
              }}
              onPress={()=>{ setIdx(i); setPhase('quiz'); }}
            >
              <View style={{
                width:28, height:28, borderRadius:14,
                backgroundColor: isAnswered ? 'rgba(212,160,23,0.18)' : t.wrongBg,
                justifyContent:'center', alignItems:'center', marginRight:12,
              }}>
                <Text style={{color:isAnswered?'#D4A017':t.wrong,fontSize:f.label,fontWeight:'700'}}>{i+1}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{color:t.textMuted,fontSize:f.label}}>{t3('Урок', 'Урок', 'Lección', 'Lição', 'Bài học', 'Pelajaran', 'Ders', 'Lekcja')} {qItem.lessonNum}</Text>
                <Text style={{color:t.textPrimary,fontSize:f.sub,fontWeight:'500'}} numberOfLines={1}>{examTopicForLang(qItem, lang)}</Text>
              </View>
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                {isFlaggedItem && <Ionicons name="bookmark" size={16} color={monoIcon(themeMode, '#D4A017')}/>}
                {isAnswered
                  ? <Ionicons name="checkmark-circle" size={18} color={monoIcon(themeMode, '#D4A017')}/>
                  : <Ionicons name="ellipse-outline" size={18} color={t.wrong}/>
                }
              </View>
            </TouchableOpacity>
          );
        })}
      </BouncyScrollView>

      <View style={{
        position:'absolute', bottom:0, left:0, right:0,
        borderTopWidth:0.5, borderTopColor:t.border,
        padding:16, paddingBottom: Math.max(16, bottomInset + 16),
      }}>
            {answered < questions.length && (
          <Text style={{color:t.wrong,fontSize:f.sub,textAlign:'center',marginBottom:10}}>
            {t3(
              `⚠️ ${questions.length - answered} вопросов без ответа`,
              `⚠️ ${questions.length - answered} питань без відповіді`,
              `⚠️ ${questions.length - answered} preguntas sin respuesta`,
              `⚠️ ${questions.length - answered} perguntas sem resposta`,
              `⚠️ ${questions.length - answered} câu hỏi chưa trả lời`,
              `⚠️ ${questions.length - answered} soal belum dijawab`,
              `⚠️ ${questions.length - answered} soru cevapsız`,
              `⚠️ ${questions.length - answered} pytań bez odpowiedzi`,
            )}
          </Text>
        )}
        <TouchableOpacity
          style={{backgroundColor:t.bgSurface,borderRadius:14,padding:16,alignItems:'center'}}
          onPress={submitExam}
          activeOpacity={0.85}
        >
          <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700'}}>
            {t3('Сдать экзамен', 'Здати іспит', 'Entregar el examen', 'Enviar o exame', 'Nộp bài kiểm tra', 'Kumpulkan ujian', 'Sınavı gönder', 'Oddaj egzamin')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </ScreenGradient>
    <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} minRequired={LINGMAN_EXAM_ENERGY} />
    </>
  );

  // ── COUNTDOWN ─────────────────────────────────────────────────────────────
  if (phase === 'countdown') return (
    <>
      <ScreenGradient artBackdrop="exam">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            <Text style={{ color: sx.muted, fontSize: f.bodyLg, fontWeight: '600', marginBottom: 18 }}>
              {t3('Приготовься', 'Приготуйся', 'Prepárate', 'Prepare-se', 'Chuẩn bị', 'Bersiap', 'Hazırlan', 'Przygotuj się')}
            </Text>
            <Animated.Text
              style={{
                color: sx.primary,
                fontSize: f.numLg + 10,
                fontWeight: '800',
                transform: [{ scale: countdownAnim }],
              }}
            >
              {countdownNum}
            </Animated.Text>
            <Text style={{ color: sx.second, fontSize: f.sub, marginTop: 18 }}>
              {t3('Старт экзамена...', 'Старт іспиту...', 'Comienza el examen...', 'Começando o exame...', 'Bắt đầu bài kiểm tra...', 'Ujian dimulai...', 'Sınav başlıyor...', 'Egzamin startuje...')}
            </Text>
          </View>
        </SafeAreaView>
      </ScreenGradient>
      <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} minRequired={LINGMAN_EXAM_ENERGY} />
    </>
  );

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
    <>
    <ScreenGradient artBackdrop="exam">
    <SafeAreaView style={{flex:1}}>
      {mountExportCert && certificate && (
        <View
          pointerEvents="none"
          collapsable={false}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, zIndex: -1, overflow: 'hidden' }}
        >
          <LingmanCertificateSvg
            ref={certificateSvgRef}
            name={certificate.name}
            score={certificate.score}
            total={certificate.total}
            pct={certificate.pct}
            certId={certificate.certId}
            completedAt={certificate.completedAt}
            lang={certificate.lang}
            layoutWidth={1500}
          />
        </View>
      )}
      <BouncyScrollView decelerationRate="normal" contentContainerStyle={{padding:24,alignItems:'center'}}>
        <View style={{width:100,height:100,borderRadius:50,backgroundColor:t.bgCard,justifyContent:'center',alignItems:'center',marginTop:20,marginBottom:20}}>
          <Ionicons name="ribbon" size={44} color={t.textSecond}/>
        </View>
        <Text style={{color:sx.primary,fontSize:f.numLg,fontWeight:'700',marginBottom:8}}>
          {t3('Блок завершён', 'Блок завершено', 'Bloque terminado', 'Bloco concluído', 'Đã hoàn thành phần này', 'Blok selesai', 'Blok tamamlandı', 'Blok ukończony')}
        </Text>
        <Text style={{color:sx.muted,fontSize:f.body,textAlign:'center',lineHeight:22,marginBottom:8,paddingHorizontal:8}}>
          {pct >= 80
            ? t3(
                'Сильный результат по темам курса — закрепляй слабые места в уроках.',
                'Сильний результат за темами курсу — закріплюй слабкі місця в уроках.',
                'Buen resultado por temas: refuerza con lecciones donde fallaste.',
                'Resultado forte nos temas do curso — reforce os pontos fracos nas lições.',
                'Kết quả tốt theo các chủ đề khóa học — hãy củng cố điểm yếu trong bài học.',
                'Hasil kuat untuk topik kursus — perkuat bagian yang masih lemah di pelajaran.',
                'Kurs konularında güçlü sonuç — zayıf noktaları derslerde pekiştir.',
                'Mocny wynik z tematów kursu — utrwal słabsze miejsca w lekcjach.',
              )
            : pct >= 50
              ? t3(
                  'Средний балл — нормальная точка роста; вернись к «Теории» и «Словарю».',
                  'Середній бал — звичайна точка росту; повернись до «Теорії» й «Словника».',
                  'Resultado intermedio: repasa «Teoría» y «Vocabulario» en los temas marcados.',
                  'Resultado intermediário: revise “Teoria” e “Vocabulário” nos temas marcados.',
                  'Điểm trung bình là điểm để tiến bộ; hãy quay lại “Lý thuyết” và “Từ vựng”.',
                  'Nilai menengah adalah titik perkembangan; kembali ke “Teori” dan “Kosakata”.',
                  'Orta sonuç normal bir gelişim noktasıdır; “Teori” ve “Kelime” bölümlerine dön.',
                  'Średni wynik to normalny punkt rozwoju; wróć do „Teorii” i „Słownictwa”.',
                )
              : t3(
                  'Низкий балл не про способности — это сигнал, какие темы разобрать заново.',
                  'Низький бал не про здібності — це сигнал, які теми розібрати знову.',
                  'Un bajo porcentaje no mide «talento»: indica temas para repasar con calma.',
                  'Uma nota baixa não mede talento: mostra quais temas revisar com calma.',
                  'Điểm thấp không nói lên năng lực; nó cho biết chủ đề nào cần học lại.',
                  'Nilai rendah bukan soal kemampuan; ini sinyal topik mana yang perlu diulang.',
                  'Düşük puan yetenek meselesi değildir; hangi konulara dönmen gerektiğini gösterir.',
                  'Niski wynik nie mówi o zdolnościach; pokazuje, które tematy warto przerobić ponownie.',
                )}
        </Text>
        <Text style={{color:sx.second,fontSize:f.h2,marginBottom:24}}>{score} / {questions.length} — {pct}%</Text>
        <View style={{ marginBottom: 16 }}>
          <XpGainBadge amount={examXp} visible={true} />
        </View>

        <View style={{backgroundColor:t.bgCard,borderRadius:16,padding:20,width:'100%',marginBottom:16}}>
          <Text style={{color:t.textMuted,fontSize:f.caption,marginBottom:12,textAlign:'center'}}>
            {t3('Результаты по темам', 'Результати по темах', 'Resultados por temas', 'Resultados por tema', 'Kết quả theo chủ đề', 'Hasil per topik', 'Konu bazında sonuçlar', 'Wyniki według tematów')}
          </Text>
          {questions
            .map((qItem, i) => ({ qItem, i, correct: choices[i] === qItem.correct }))
            .map(({ qItem, i, correct }) => (
            <View key={i} style={{flexDirection:'row',alignItems:'center',paddingVertical:6,borderBottomWidth:i<questions.length-1?0.5:0,borderBottomColor:t.border}}>
              <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={16} color={correct ? t.correct : t.wrong} style={{marginRight:8}}/>
              <Text style={{color:t.textMuted,fontSize:f.label,marginRight:6,width:26}}>{i + 1}.</Text>
              <Text style={{color:correct?t.textPrimary:t.textSecond,fontSize:f.sub,flex:1}}>{examTopicForLang(qItem, lang)}</Text>
            </View>
          ))}
        </View>

        {certificate && certificate.name?.trim() ? (
          // Имя указано — показываем сам диплом + кнопку шеринга.
          <View style={{backgroundColor:'#0a1620',borderRadius:18,padding:18,borderWidth:0,borderColor:'#d4a017',width:'100%',alignItems:'center',marginBottom:16}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12}}>
              <Ionicons name="ribbon" size={22} color={monoIcon(themeMode, '#FFD700')}/>
              <Text style={{color:monoIcon(themeMode, '#FFD700'),fontSize:f.bodyLg,fontWeight:'800',letterSpacing:1.2}}>
                PHRASEMAN B2
              </Text>
            </View>
            <View style={{borderRadius:12,overflow:'hidden',borderWidth:0,borderColor:'#d4a017',marginBottom:12}}>
              <LingmanCertificateSvg
                name={certificate.name}
                score={certificate.score}
                total={certificate.total}
                pct={certificate.pct}
                certId={certificate.certId}
                completedAt={certificate.completedAt}
                lang={certificate.lang}
                layoutWidth={420}
              />
            </View>
            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#B8860B',borderRadius:12,paddingVertical:12,paddingHorizontal:18,borderWidth:0,borderColor:'#FFD700',width:'100%',marginBottom:8}}
              onPress={() => { void shareCertificate(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={18} color={monoIcon(themeMode, '#FFD700')}/>
              <Text style={{color:monoIcon(themeMode, '#FFD700'),fontSize:f.bodyLg,fontWeight:'700'}}>
                {t3('Поделиться наградой', 'Поділитися нагородою', 'Compartir diploma', 'Compartilhar diploma', 'Chia sẻ phần thưởng', 'Bagikan diploma', 'Diplomayı paylaş', 'Udostępnij dyplom')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{paddingVertical:8}}
              onPress={() => setNameModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={{color:monoIcon(themeMode, '#FDE68A'),fontSize:f.sub,textDecorationLine:'underline'}}>
                {t3('Изменить имя на награде', 'Змінити ім\u02BCя на нагороді', 'Cambiar nombre en el diploma', 'Alterar nome no diploma', 'Đổi tên trên phần thưởng', 'Ubah nama di diploma', 'Diplomadaki adı değiştir', 'Zmień imię na dyplomie')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : certificate ? (
          // Имени нет (юзер пропустил ввод или сохранён старый серт без имени) —
          // НЕ показываем сам диплом, чтобы юзер случайно не расшарил его без
          // имени и не видел «чужой» подписи. Вместо этого — CTA «Укажите имя».
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setNameModalVisible(true)}
            style={{backgroundColor:'#0a1620',borderRadius:18,padding:20,borderWidth:0,borderColor:'#d4a017',width:'100%',alignItems:'center',marginBottom:16,gap:10}}
          >
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <Ionicons name="ribbon" size={22} color={monoIcon(themeMode, '#FFD700')}/>
              <Text style={{color:monoIcon(themeMode, '#FFD700'),fontSize:f.bodyLg,fontWeight:'800',letterSpacing:1.2}}>
                PHRASEMAN B2
              </Text>
            </View>
            <Text style={{color:monoIcon(themeMode, '#FDE68A'),fontSize:f.body,textAlign:'center',lineHeight:f.body*1.4}}>
              {t3(
                'Укажите имя — и ваш сертификат появится здесь. Без имени награда не показывается.',
                'Вкажіть ім\u02BCя — і ваш сертифікат з\u02BCявиться тут. Без імені нагорода не показується.',
                'Indica tu nombre y aquí aparecerá tu certificado. Sin nombre no mostramos el diploma.',
                'Informe o nome, e seu certificado aparecerá aqui. Sem nome, o diploma não aparece.',
                'Nhập tên, chứng chỉ của bạn sẽ xuất hiện ở đây. Không có tên thì phần thưởng sẽ không hiển thị.',
                'Masukkan nama, dan sertifikatmu akan muncul di sini. Tanpa nama, diploma tidak ditampilkan.',
                'Adını yaz, sertifikan burada görünecek. İsim olmadan ödül gösterilmez.',
                'Podaj imię, a certyfikat pojawi się tutaj. Bez imienia dyplom nie będzie pokazany.',
              )}
            </Text>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#B8860B',borderRadius:12,paddingVertical:12,paddingHorizontal:18,borderWidth:0,borderColor:'#FFD700',width:'100%',marginTop:6}}>
              <Ionicons name="create-outline" size={18} color={monoIcon(themeMode, '#FFD700')}/>
              <Text style={{color:monoIcon(themeMode, '#FFD700'),fontSize:f.bodyLg,fontWeight:'700'}}>
                {t3('Указать имя на награде', 'Вказати ім\u02BCя на нагороді', 'Poner nombre en el diploma', 'Informar nome no diploma', 'Nhập tên trên phần thưởng', 'Masukkan nama di diploma', 'Diplomaya isim ekle', 'Podaj imię na dyplomie')}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={{backgroundColor:t.bgCard,borderRadius:14,padding:16,width:'100%',alignItems:'center',marginBottom:12}}
          onPress={() => { void startExam(); }}
        >
          <Text style={{color:t.textPrimary,fontSize:f.bodyLg,fontWeight:'600'}}>
            {t3('🔄 Попробовать ещё раз', '🔄 Спробувати ще раз', '🔄 Intentar otra vez', '🔄 Tentar de novo', '🔄 Thử lại', '🔄 Coba lagi', '🔄 Tekrar dene', '🔄 Spróbuj ponownie')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{flexDirection:'row',alignItems:'center',gap:8,padding:12,marginBottom:4}}
          onPress={() => { void shareExamResult(); }}
        >
          <Ionicons name="share-outline" size={18} color={t.textSecond}/>
          <Text style={{color:t.textSecond,fontSize:f.bodyLg}}>
            {t3('Поделиться результатом', 'Поділитися результатом', 'Compartir resultado', 'Compartilhar resultado', 'Chia sẻ kết quả', 'Bagikan hasil', 'Sonucu paylaş', 'Udostępnij wynik')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.75} style={{padding:14}} onPress={()=>router.replace('/(tabs)/home' as any)}>
          <Text style={{color:t.textSecond,fontSize:f.bodyLg,textDecorationLine:'underline'}}>
            {t3('На главную', 'На головну', 'Volver al inicio', 'Voltar ao início', 'Về trang chủ', 'Kembali ke beranda', 'Ana sayfaya dön', 'Wróć na stronę główną')}
          </Text>
        </TouchableOpacity>
      </BouncyScrollView>
    </SafeAreaView>
    </ScreenGradient>
    <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} minRequired={LINGMAN_EXAM_ENERGY} />
    <CertificateNameModal
      visible={nameModalVisible}
      initialName={certificate?.name?.trim() ? certificate.name : certNamePrefill}
      onSave={(n) => { void handleSaveName(n); }}
      onSkip={() => setNameModalVisible(false)}
    />
    </>
  );
  }

  // ── CERT (юзер уже сдал — показываем диплом сразу при заходе) ────────────
  if (phase === 'cert' && certificate) {
    return (
    <>
    <ScreenGradient artBackdrop="exam">
    <SafeAreaView style={{flex:1}}>
      {mountExportCert && (
        <View
          pointerEvents="none"
          collapsable={false}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, zIndex: -1, overflow: 'hidden' }}
        >
          <LingmanCertificateSvg
            ref={certificateSvgRef}
            name={certificate.name}
            score={certificate.score}
            total={certificate.total}
            pct={certificate.pct}
            certId={certificate.certId}
            completedAt={certificate.completedAt}
            lang={certificate.lang}
            layoutWidth={1500}
          />
        </View>
      )}
      <View style={{flexDirection:'row',alignItems:'center',padding:15,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <TapScale onPress={() => {
          safeRouterBack(router);
        }}>
          <Ionicons name="chevron-back" size={28} color={sx.primary}/>
        </TapScale>
        <Text style={{color:sx.primary,fontSize:f.h2,fontWeight:'700',marginLeft:8}}>
          {t3('Моя награда B2', 'Моя нагорода B2', 'Mi diploma B2', 'Meu diploma B2', 'Phần thưởng B2 của tôi', 'Diploma B2 saya', 'B2 diplomam', 'Mój dyplom B2')}
        </Text>
      </View>
      <BouncyScrollView decelerationRate="normal" contentContainerStyle={{padding:20,alignItems:'center'}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
          <Ionicons name="ribbon" size={22} color={monoIcon(themeMode, '#FFD700')}/>
          <Text style={{color:monoIcon(themeMode, '#FFD700'),fontSize:f.bodyLg,fontWeight:'800',letterSpacing:1.4}}>
            PHRASEMAN ACADEMY
          </Text>
        </View>
        <Text style={{color:sx.muted,fontSize:f.sub,textAlign:'center',marginBottom:18}}>
          {`${certificate.score} / ${certificate.total} · ${certificate.pct}% · ${formatCertDate(certificate.completedAt, certificate.lang)}`}
        </Text>
        {certificate.name?.trim() ? (
          <>
            <View style={{borderRadius:14,overflow:'hidden',borderWidth:0,borderColor:'#d4a017'}}>
              <LingmanCertificateSvg
                name={certificate.name}
                score={certificate.score}
                total={certificate.total}
                pct={certificate.pct}
                certId={certificate.certId}
                completedAt={certificate.completedAt}
                lang={certificate.lang}
                layoutWidth={520}
              />
            </View>
            <Text
              style={{color:t.textMuted,fontSize:f.caption,marginTop:8,letterSpacing:1}}
              accessibilityRole="text"
              accessibilityLabel={t3(
                `Номер сертификата: ${certificate.certId}`,
                `Номер сертифіката: ${certificate.certId}`,
                `Identificador del certificado: ${certificate.certId}`,
                `Número do certificado: ${certificate.certId}`,
                `Mã chứng chỉ: ${certificate.certId}`,
                `Nomor sertifikat: ${certificate.certId}`,
                `Sertifika numarası: ${certificate.certId}`,
                `Numer certyfikatu: ${certificate.certId}`,
              )}
            >
              ID: {certificate.certId}
            </Text>

            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:'#B8860B',borderRadius:14,paddingVertical:16,paddingHorizontal:22,borderWidth:0,borderColor:'#FFD700',width:'100%',marginTop:22}}
              onPress={() => { void shareCertificate(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={20} color={monoIcon(themeMode, '#FFD700')}/>
              <Text style={{color:monoIcon(themeMode, '#FFD700'),fontSize:f.bodyLg,fontWeight:'800',letterSpacing:0.4}}>
                {t3('Поделиться наградой', 'Поділитися нагородою', 'Compartir diploma', 'Compartilhar diploma', 'Chia sẻ phần thưởng', 'Bagikan diploma', 'Diplomayı paylaş', 'Udostępnij dyplom')}
              </Text>
            </TouchableOpacity>
            <Text style={{color:t.textMuted,fontSize:f.caption,marginTop:8,textAlign:'center',lineHeight:18}}>
              {t3(
                'Шеринг отправит PNG сертификата; текст используется как запасной вариант.',
                'Шеринг надішле PNG сертифіката; текст використовується як запасний варіант.',
                'Se compartira el PNG del diploma; el texto se usa como alternativa.',
                'O compartilhamento envia o PNG do certificado; o texto é usado como alternativa.',
                'Chia sẻ sẽ gửi PNG chứng chỉ; văn bản được dùng làm phương án dự phòng.',
                'Berbagi akan mengirim PNG sertifikat; teks dipakai sebagai cadangan.',
                'Paylaşım sertifikanın PNG dosyasını gönderir; metin yedek olarak kullanılır.',
                'Udostępnianie wyśle PNG certyfikatu; tekst jest używany jako wariant zapasowy.',
              )}
            </Text>

            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:20,paddingVertical:10}}
              onPress={() => setNameModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={t.textSecond}/>
              <Text style={{color:t.textSecond,fontSize:f.body,textDecorationLine:'underline'}}>
                {t3('Изменить имя на награде', 'Змінити ім\u02BCя на нагороді', 'Cambiar el nombre en el diploma', 'Alterar nome no diploma', 'Đổi tên trên phần thưởng', 'Ubah nama di diploma', 'Diplomadaki adı değiştir', 'Zmień imię na dyplomie')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          // Сохранённый сертификат без имени (юзер раньше пропустил ввод).
          // Не рендерим диплом: пустая подпись выглядит как чужая/
          // незавершённый. Показываем CTA на ввод имени.
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setNameModalVisible(true)}
            style={{borderRadius:14,padding:24,borderWidth:0,borderColor:'#d4a017',backgroundColor:'#0a1620',width:'100%',alignItems:'center',gap:14}}
          >
            <Ionicons name="ribbon" size={48} color={monoIcon(themeMode, '#FFD700')}/>
            <Text style={{color:monoIcon(themeMode, '#FFD700'),fontSize:f.h2,fontWeight:'800',textAlign:'center',letterSpacing:0.6}}>
              {t3(
                'Награда готова — добавьте имя',
                'Нагорода готова — додайте ім\u02BCя',
                'Tu diploma está listo — añade tu nombre',
                'Seu diploma está pronto — adicione o nome',
                'Phần thưởng đã sẵn sàng — thêm tên',
                'Diploma siap — tambahkan nama',
                'Diploma hazır — adını ekle',
                'Dyplom jest gotowy — dodaj imię',
              )}
            </Text>
            <Text style={{color:monoIcon(themeMode, '#FDE68A'),fontSize:f.body,textAlign:'center',lineHeight:f.body*1.4}}>
              {t3(
                `Ваш результат: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nУкажите имя — и сертификат появится ниже.`,
                `Ваш результат: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nВкажіть ім\u02BCя — і сертифікат з\u02BCявиться нижче.`,
                `Tu resultado: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nIndica tu nombre y el certificado aparecerá abajo.`,
                `Seu resultado: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nInforme o nome e o certificado aparecerá abaixo.`,
                `Kết quả của bạn: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nNhập tên và chứng chỉ sẽ xuất hiện bên dưới.`,
                `Hasilmu: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nMasukkan nama dan sertifikat akan muncul di bawah.`,
                `Sonucun: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nAdını yaz, sertifika aşağıda görünecek.`,
                `Twój wynik: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nPodaj imię, a certyfikat pojawi się niżej.`,
              )}
            </Text>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#B8860B',borderRadius:14,paddingVertical:14,paddingHorizontal:22,borderWidth:0,borderColor:'#FFD700',marginTop:6}}>
              <Ionicons name="create-outline" size={18} color={monoIcon(themeMode, '#FFD700')}/>
              <Text style={{color:monoIcon(themeMode, '#FFD700'),fontSize:f.bodyLg,fontWeight:'800'}}>
                {t3('Указать имя на награде', 'Вказати ім\u02BCя на нагороді', 'Poner nombre en el diploma', 'Informar nome no diploma', 'Nhập tên trên phần thưởng', 'Masukkan nama di diploma', 'Diplomaya isim ekle', 'Podaj imię na dyplomie')}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{marginTop:18,paddingVertical:10}}
          onPress={() => setPhase('intro')}
          activeOpacity={0.7}
        >
          <Text style={{color:t.textMuted,fontSize:f.sub,textDecorationLine:'underline'}}>
            {t3(
            'Попробовать ещё раз — улучшить результат',
            'Спробувати ще раз — поліпшити результат',
            'Intentar de nuevo — mejorar la nota',
            'Tentar de novo — melhorar o resultado',
            'Thử lại — cải thiện kết quả',
            'Coba lagi — tingkatkan hasil',
            'Tekrar dene — sonucu iyileştir',
            'Spróbuj ponownie — popraw wynik',
          )}
          </Text>
        </TouchableOpacity>
        <Text style={{color:t.textMuted,fontSize:f.caption,marginTop:4,textAlign:'center'}}>
          {t3(
            'Новый результат перезапишет награду только если наберёшь 80% и выше',
            'Новий результат перезапише нагороду тільки якщо набереш ≥ 80%',
            'Un nuevo resultado sustituye el diploma solo si sacas ≥ 80%',
            'Um novo resultado só substituirá o diploma se você fizer ≥ 80%',
            'Kết quả mới chỉ ghi đè phần thưởng nếu bạn đạt ≥ 80%',
            'Hasil baru hanya mengganti diploma jika nilainya ≥ 80%',
            'Yeni sonuç diplomayı yalnızca ≥ 80% alırsan değiştirir',
            'Nowy wynik nadpisze dyplom tylko przy wyniku ≥ 80%',
          )}
        </Text>
      </BouncyScrollView>
    </SafeAreaView>
    </ScreenGradient>
    <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} minRequired={LINGMAN_EXAM_ENERGY} />
    <CertificateNameModal
      visible={nameModalVisible}
      initialName={certificate.name?.trim() ? certificate.name : certNamePrefill}
      onSave={(n) => { void handleSaveName(n); }}
      onSkip={() => setNameModalVisible(false)}
    />
    </>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  return(
    <>
    <ScreenGradient artBackdrop="exam">
    <SafeAreaView style={{flex:1}}>
      {/* Header */}
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:15,paddingBottom:10}}>
        <Text style={{color:sx.second,fontSize:f.sub,fontWeight:'500'}}>{idx+1} / {questions.length}</Text>
        <View style={{backgroundColor:t.bgCard,borderRadius:10,paddingHorizontal:10,paddingVertical:4,flex:1,marginHorizontal:8}}>
          <Text style={{color:t.textSecond,fontSize:f.caption,fontWeight:'600'}} numberOfLines={1}>
            {t3('Урок', 'Урок', 'Lección', 'Lição', 'Bài học', 'Pelajaran', 'Ders', 'Lekcja')} {q.lessonNum} · {examTopicForLang(q, lang)}
          </Text>
        </View>
        {/* Timer */}
        <View style={{
          flexDirection:'row', alignItems:'center', gap:4,
          backgroundColor:t.bgCard, borderRadius:10, paddingHorizontal:10, paddingVertical:5,
          borderWidth:0.5, borderColor:isLowTime?t.wrong:t.border,
        }}>
          <Ionicons name="timer-outline" size={14} color={isLowTime?t.wrong:t.textSecond}/>
          <Text style={{color:isLowTime?t.wrong:t.textSecond,fontSize:f.sub,fontWeight:'700'}}>
            {formatTime(totalTimeLeft)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <GradientProgressBar
        progress={questions.length > 0 ? answered / questions.length : 0}
        accent={t.accent}
        height={6}
        trackColor={sx.ghost}
        style={{ marginHorizontal: 16, marginBottom: 8 }}
      />

      <BouncyScrollView
        decelerationRate="normal"
        contentContainerStyle={{paddingHorizontal:20,paddingTop:16,paddingBottom:160}}
        keyboardShouldPersistTaps="handled"
      >
        {q.type === 'choice4' && (
          <Text style={{color:sx.second,fontSize:f.label,marginBottom:8,fontWeight:'600'}}>
            🔤 {t3('Какое предложение верное?', 'Яке речення правильне?', '¿Qué frase es correcta?', 'Qual frase está correta?', 'Câu nào đúng?', 'Kalimat mana yang benar?', 'Hangi cümle doğru?', 'Które zdanie jest poprawne?')}
          </Text>
        )}
        {q.type === 'error' && (
          <Text style={{color:t.wrong,fontSize:f.label,marginBottom:8,fontWeight:'600'}}>
            🔍 {t3('Исправь ошибку', 'Виправ помилку', 'Corrige el error', 'Corrija o erro', 'Sửa lỗi', 'Perbaiki kesalahan', 'Hatayı düzelt', 'Popraw błąd')}
          </Text>
        )}
        <ClozeGapText text={q.q} style={{color:sx.primary,fontSize:f.h2+4,fontWeight:'500',lineHeight:32,marginBottom:20}} />

        {(q.opts ?? []).map((opt,ci)=>{
          const on = flashKey === `${ci}`;
          let bg = on ? t.accent : t.bgCard;
          let tc = on ? (t.correctText ?? '#fff') : t.textPrimary;
          if(chosen===ci && !on){ bg=t.bgSurface; }
          return(
            <DuoPressable
              key={ci}
              edgeHeight={5}
              withHaptic={false}
              edgeColor={on ? t.accent : 'rgba(0,0,0,0.30)'}
              wrapStyle={{ marginBottom: 10 }}
              style={{backgroundColor:bg,borderRadius:14,padding:16}}
              onPress={()=>{ flash(`${ci}`); handleAnswer(ci); }}
            >
              <Text style={{color:tc,fontSize:f.body,fontWeight: on ? '700' : '500'}}>{opt}</Text>
            </DuoPressable>
          );
        })}
      </BouncyScrollView>

      <ReportErrorButton
        screen="exam"
        dataId={`exam_lesson_${q.lessonNum}_q${idx}`}
        dataText={[
          `Q: ${q.q}`,
          `Варианты: ${(q.opts ?? []).map((o,i)=>i===q.correct?`[✓${o}]`:o).join(' | ')}`,
        ].join('\n')}
        style={{ alignSelf: 'flex-end', paddingHorizontal: 16, marginBottom: 4 }}
        textColor={sx.muted}
      />

      {/* Bottom navigation — 2 rows, safe area aware */}
      <View style={{
        position:'absolute', bottom:0, left:0, right:0,
        borderTopWidth:0.5, borderTopColor:t.border,
        paddingBottom: Math.max(20, bottomInset + 16),
        paddingHorizontal:12, paddingTop:10, gap:8,
      }}>
        {/* Row 1: Skip / Next (primary actions) */}
        <View style={{ flexDirection:'row', gap:8 }}>
          {chosen === null ? (
            <TouchableOpacity
              style={{
                flex:1, height:52, borderRadius:14,
                backgroundColor:t.bgCard, justifyContent:'center', alignItems:'center',
              }}
              onPress={skipToNext}
            >
              <Text style={{color:t.textSecond, fontSize:f.body, fontWeight:'600'}}>
                {t3('Пропустить →', 'Пропустити →', 'Omitir →', 'Pular →', 'Bỏ qua →', 'Lewati →', 'Atla →', 'Pomiń →')}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={{
              flex:1, height:52, borderRadius:14,
              backgroundColor: chosen!==null ? t.bgSurface : t.bgCard,
              justifyContent:'center', alignItems:'center',
            }}
            onPress={goNext}
          >
            <Text style={{
              color: chosen!==null ? t.textPrimary : t.textMuted,
              fontSize:f.body, fontWeight:'700',
            }}>
              {idx+1===questions.length
                ? t3('Проверить →', 'Перевірити →', 'Revisar →', 'Revisar →', 'Kiểm tra →', 'Tinjau →', 'Kontrol et →', 'Sprawdź →')
                : t3('Следующий вопрос →', 'Наступне питання →', 'Siguiente pregunta →', 'Próxima pergunta →', 'Câu tiếp →', 'Soal berikutnya →', 'Sonraki soru →', 'Następne pytanie →')
              }
            </Text>
          </TouchableOpacity>
        </View>
        {/* Row 2: Prev / Flag / Review */}
        <View style={{ flexDirection:'row', gap:8 }}>
          <TapScale
            style={{
              flex:1, height:44, borderRadius:12,
              backgroundColor:t.bgCard, justifyContent:'center', alignItems:'center',
              opacity: idx===0 ? 0.35 : 1,
            }}
            onPress={goPrev}
            disabled={idx===0}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary}/>
          </TapScale>
          <TouchableOpacity
            style={{
              flex:1, height:44, borderRadius:12,
              backgroundColor: isFlagged ? 'rgba(212,160,23,0.18)' : t.bgCard,
              justifyContent:'center', alignItems:'center',
            }}
            onPress={toggleFlag}
          >
            <Ionicons name={isFlagged ? 'bookmark' : 'bookmark-outline'} size={20} color={monoIcon(themeMode, isFlagged ? '#D4A017' : t.textSecond)}/>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex:1, height:44, borderRadius:12,
              backgroundColor:t.bgCard, justifyContent:'center', alignItems:'center',
            }}
            onPress={()=>setPhase('review')}
          >
            <Ionicons name="list-outline" size={22} color={t.textSecond}/>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
    </ScreenGradient>
    <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} minRequired={LINGMAN_EXAM_ENERGY} />
    </>
  );
}
