import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import BouncyScrollView from '../components/BouncyScrollView';
import DuoPressable from '../components/DuoPressable';
import { useWordFlash } from '../hooks/use-word-flash';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useTimerTickCue } from '../hooks/use-timer-tick-cue';
import { soundDirector } from '../modules/audio/sound_director';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    BackHandler,
    Platform,
    ScrollView,
    Pressable,
    Share,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from 'react-native';
import Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import { createEnergySessionIntent, type EnergySessionIntent } from './energy_session_operation_ledger';
import { useFirstQuestionEnergyGate } from '../hooks/useFirstQuestionEnergyGate';
import { useStudyTarget } from '../components/StudyTargetContext';
import NoEnergyModal from '../components/NoEnergyModal';
import ScreenGradient from '../components/ScreenGradient';
import GradientProgressBar from '../components/GradientProgressBar';
import { useTheme } from '../components/ThemeContext';
import { screenTextOnGradient } from '../constants/theme';
import ReportErrorButton from '../components/ReportErrorButton';
import ClozeGapText from '../components/ClozeGapText';
import { safeRouterBack } from './navigation_back';
import { checkAchievements } from './achievements';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { PracticeCta, PracticeStatePanel } from '../components/practice/PracticeStates';
import { PracticeBackButton, PracticeRoundIconButton } from '../components/practice/PracticeChrome';
import {
  ExamFooter, ExamHeader, ExamHero, ExamKvCard, ExamOption, ExamPill, ExamQuietButton, ExamStatRow,
  ExamTile, ExamTrack, examCardStyle,
} from '../components/level-exam/ExamGlassParts';
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
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import { isMistakeStudyTargetValue } from '../modules/mistake-practice/contracts';
import { lessonProgressKey, storageStudyTarget } from './target_storage_keys';
import { examContentAvailableForTarget, frenchExamGateCopy } from './exam_target_gate';
import { loadFrenchRemoteFinalExamQuestions } from './french_exam_remote_runtime';
import { DebugLogger } from './debug-logger';
import { notifyActivityStartFailed, useScreenOpenRef } from './activity_start_failed_toast';
import { useSilentLeave } from '../hooks/use_silent_leave';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const TOTAL_EXAM_SECONDS = 60 * 60; // 60 minutes total
// зачем (PM-086/D06): экзамен, как любое начатое занятие, стоит 1 энергию. Сумма в confirmSpendAmount не используется —
// реальную цену определяет таблица активностей; константа нужна только для аналитики отказа.
// Прежняя цена была недостижима: экзамен требовал 8 ⚡ при потолке 5, то есть
// без подарочных слотов или премиума сдать его было физически нельзя.
const LINGMAN_EXAM_ENERGY = 1;

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
  liquidGlassThemeId,
}: {
  lang: string;
  onBack: () => void;
  onLessons: () => void;
  liquidGlassThemeId: ReturnType<typeof useTheme>['liquidGlassThemeId'];
}) {
  const copy = frenchExamGateCopy('final', lang);
  const glass = liquidGlassTokens(liquidGlassThemeId);
  return (
    <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={{ flex: 1 }}>
        <ExamHeader glass={glass} title="" onBack={onBack} />
        <PracticeStatePanel
          glass={glass}
          icon="shield-checkmark-outline"
          title={copy.title}
          message={copy.body}
          action={{ label: copy.cta, onPress: onLessons }}
        />
      </SafeAreaView>
    </ScreenGradient>
  );
}

export default function ExamScreen() {
  const router = useRouter();
  const runtimeActive = useRuntimeActive();
  const { playTimerExpired } = useTimerTickCue();
  const {theme:t, f, themeMode, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
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
    en: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang as any, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const { energy, bonusEnergy, isUnlimited } = useEnergy();
  const [noEnergy, setNoEnergy] = useState(false);
  // Блокировка двойного тапа по «Начать тест»: спендим энергию ровно один раз, см. H12.
  const [examStarting, setExamStarting] = useState(false);
  const certificateSvgRef = useRef<InstanceType<typeof Svg> | null>(null);

  const [phase, setPhase]           = useState<Phase>('intro');
  const [exitExamConfirm, setExitExamConfirm] = useState(false);
  const phaseBackRef = useRef<Phase>('intro');
  phaseBackRef.current = phase;

  // Android: системный «Назад» посреди идущего экзамена раньше мгновенно
  // уносил с экрана — часовая попытка терялась без единого вопроса.
  // Теперь во время quiz/review/countdown back требует подтверждения.
  useEffect(() => {
    if (!runtimeActive || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const p = phaseBackRef.current;
      if (p !== 'quiz' && p !== 'review' && p !== 'countdown') {
        safeRouterBack(router, '/lessons_list' as any);
        return true;
      }
      // L10: вместо нативного Alert — стеклянное подтверждение (ThemedConfirmModal), тексты те же
      setExitExamConfirm(true);
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
  // зачем: D72/D67 — одна попытка экзамена = один operationId. Новый «Начать
  // тест» создаёт новую попытку, повтор/remount той же попытки не спишет дважды.
  const [examEnergyIntent, setExamEnergyIntent] = useState<EnergySessionIntent>(
    () => createEnergySessionIntent('exam', studyTarget, examAttemptIdRef.current),
  );
  const examEnergyGate = useFirstQuestionEnergyGate({ intent: examEnergyIntent, screen: 'exam' });
  const examStartCommitInFlightRef = useRef(false);
  const screenOpenRef = useScreenOpenRef();
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
      .catch((error: unknown) => {
        // зачем (аудит Optimistic UI, 12.10): сбой загрузки вопросов был немым — экран просто оставался без вопросов
        console.warn(`[EXAM] вопросы не загрузились locale=${frenchExamSourceLocale}: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
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
        if(saved){ try{const p:string[]=JSON.parse(saved);if(p.filter((x:string)=>x==='correct'||x==='replay_correct').length>=45)done++;}catch (e) {
      DebugLogger.error('exam:done', e instanceof Error ? e : new Error(String(e)), 'warning');
    } }
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

  const commitExamFirstQuestion = React.useCallback(async () => {
    if (examStartCommitInFlightRef.current) return;
    examStartCommitInFlightRef.current = true;
    try {
      // зачем: D72 — энергия списывается в момент показа первого вопроса, т.е.
      // здесь, после отсчёта, а не на кнопке «Начать тест». Списание — последний
      // async-шаг; после него вопрос открывается синхронно.
      const energyResult = await examEnergyGate.charge();
      if (energyResult === 'cancelled') {
        setPhase('intro');
        // зачем (координатор 15.10, п.3): отказ списания — тост «Не получилось начать», если экран ещё открыт.
        notifyActivityStartFailed('exam', screenOpenRef);
        return;
      }
      if (energyResult === 'insufficient') {
        void trackFeatureBlocked('exam', 'start', 'no_energy', { energy, bonusEnergy, required: LINGMAN_EXAM_ENERGY }, 'exam');
        setNoEnergy(true);
        setPhase('intro');
        return;
      }
      setTotalTimeLeft(TOTAL_EXAM_SECONDS);
      examDeadlineRef.current = Date.now() + TOTAL_EXAM_SECONDS * 1000;
      setPhase('quiz');
      // зачем: D87 — до этой строки уход/падение вернёт энергию, после — нет.
      examEnergyGate.markShown();
      void trackFeatureStart('exam', 'start', { questions: questions.length }, 'exam');
      soundDirector.request('pm.exam.begin', {
        scope: 'exam',
        dedupeKey: examAttemptIdRef.current,
      });
    } catch (error) {
      // Неожиданное исключение до показа вопроса: вопрос не показан → возврат (D87).
      examEnergyGate.refundNotShown('exam_first_question_commit_failed');
      setPhase('intro');
      void trackFeatureError('exam', 'start', error, {
        attemptId: examAttemptIdRef.current,
      }, 'exam');
    } finally {
      examStartCommitInFlightRef.current = false;
    }
  }, [bonusEnergy, energy, examEnergyGate, questions.length]);

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
        void commitExamFirstQuestion();
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
  }, [commitExamFirstQuestion, phase, runtimeActive]);

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
    // Предпроверка без списания: не гоняем отсчёт, если энергии заведомо нет.
    if (!isUnlimited && energy + bonusEnergy < LINGMAN_EXAM_ENERGY) {
      void trackFeatureBlocked('exam', 'start', 'no_energy', { energy, bonusEnergy, required: LINGMAN_EXAM_ENERGY }, 'exam');
      setNoEnergy(true);
      return;
    }
    setExamStarting(true);
    try {
      // зачем: D67 — каждое «Начать тест» = новая попытка со своим operationId;
      // само списание — в commitExamFirstQuestion (D72).
      examAttemptIdRef.current = makeExamAttemptId();
      setExamEnergyIntent(createEnergySessionIntent('exam', studyTarget, examAttemptIdRef.current));
      setIdx(0);
      setChoices(Array(questions.length).fill(null));
      setFlagged(Array(questions.length).fill(false));
      countdownRemainingMsRef.current = 3 * 650;
      setPhase('countdown');
    } finally {
      // Сбрасываем не сразу — даём React закоммитить переход фазы; при failure
      // тоже сбрасываем чтобы кнопку можно было нажать снова.
      setExamStarting(false);
    }
  };

  // зачем (аудит Optimistic UI, 12.10): второй тап «Завершить» в том же кадре запускал вторую сдачу — второй сертификат,
  // второй showName и повторные записи ошибок. Замок синхронный; страница итога открывается один раз.
  const submitExamInFlightRef = useRef(false);
  const submitExam = async () => {
    if (submitExamInFlightRef.current) {
      console.warn('[EXAM] submit: уже в пути — повторный тап пропущен'); // guard-ok: ранний выход называет причину
      return;
    }
    submitExamInFlightRef.current = true;
    try {
      const s = choices.filter((c, i) => c !== null && c === questions[i]?.correct).length;
      const p = questions.length > 0 ? Math.round(s / questions.length * 100) : 0;
      // зачем (22.09): узкий список языков не пускал запись ошибок экзамена
      // для испанского и немецкого — раздел «Мои ошибки» их не получал.
      if (isMistakeStudyTargetValue(studyTarget)) {
        questions.forEach((question, questionIndex) => {
          const pickedIndex = choices[questionIndex];
          if (pickedIndex === null || pickedIndex === question.correct) return;
          const expected = question.opts[question.correct] ?? '';
          if (!expected) return;
          void captureCurrentAccountObjectiveAttempt({
            attemptId: `exam:${examAttemptIdRef.current}:${questionIndex}:${pickedIndex}`,
            studyTarget,
            verdict: 'wrong',
            objective: true,
            content: {
              sourceKind: 'exam',
              sourceId: `${question.lessonNum}:${question.q}`,
              canonicalTarget: buildExamQuestionPhrase(question),
              sourceMeaning: question.rawTopic ?? question.topic,
              lessonId: String(question.lessonNum),
              distractors: question.opts,
            },
            facet: {
              kind: question.q.includes('___') ? 'missing_token' : 'form',
              expected,
            },
          }).catch(noteSwallowedHandler('exam:submitExam.captureCurrentAccountObjectiveAttempt'));
        });
      }
    checkAchievements({ type: 'exam', pct: p, studyTarget }).catch(noteSwallowedHandler('exam:submitExam.checkAchievements'));
    let storedName = '';
    try {
      const raw = await AsyncStorage.getItem('user_name');
      storedName = (raw || '').trim();
    } catch (e) {
      DebugLogger.error('exam:raw', e instanceof Error ? e : new Error(String(e)), 'warning');
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
        certificate: p >= LINGMAN_CERT_MIN_PCT,
      }, 'exam');
      setPhase('result');
    } catch (e) {
      console.warn(`[EXAM] submit: сбой подсчёта/записи — показываю итог без сертификата: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch пишет причину
      void trackFeatureError('exam', 'complete', e, { answered: choices.filter(c => c !== null).length, total: questions.length }, 'exam');
      setPhase('result');
    } finally {
      submitExamInFlightRef.current = false;
    }
  };

  const handleSaveName = async (name: string) => {
    try {
      await AsyncStorage.setItem('user_name', name);
    } catch (e) {
      DebugLogger.error('exam:handleSaveName', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
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
    await Share.share({ message: msg }).catch(noteSwallowedHandler('exam:shareExamResult.share'));
  };

  const score = choices.filter((c,i) => c !== null && c === questions[i]?.correct).length;
  const answered = choices.filter(c => c !== null).length;
  const pct = questions.length>0?Math.round(score/questions.length*100):0;
  // зачем (владелец 18.10 07:45: «экранов-ошибок нигде»): экзамен для закрытого языка — тихо назад вместо заглушки
  // «…ещё готовится». Причина — в журнал [NO-ERROR-SCREEN].
  useSilentLeave(frenchExamBlocked, 'exam', 'french_gate_closed', () => safeRouterBack(router));
  if (frenchExamBlocked) return <ScreenGradient artBackdrop="exam"><View style={{ flex: 1 }} /></ScreenGradient>;
  const q = questions[idx]||questions[0];
  if (!q) return null;
  const chosen = choices[idx];
  const isFlagged = flagged[idx];
  const isLowTime = totalTimeLeft < 5 * 60; // < 5 min

  // зачем (владелец 2026-09-30): состояния экзамена переносятся 1 в 1 по макету learn.html
  // (Liquid Glass, блок L). Только ВИД: подсчёт, таймер, энергия, сертификат, шеринг — прежние.
  const stripArrow = (s: string) => s.replace(/\s*→\s*$/u, '');
  const examTitle = t3('Экзамен', 'Іспит', 'Exam', 'Examen', 'Exame', 'Bài kiểm tra', 'Ujian', 'Sınav', 'Egzamin');
  const homeLabel = t3('На главную', 'На головну', 'Back to home', 'Volver al inicio', 'Voltar ao início', 'Về trang chủ', 'Kembali ke beranda', 'Ana sayfaya dön', 'Wróć na stronę główną');
  const shareCertLabel = t3('Поделиться наградой', 'Поділитися нагородою', 'Share the diploma', 'Compartir diploma', 'Compartilhar diploma', 'Chia sẻ phần thưởng', 'Bagikan diploma', 'Diplomayı paylaş', 'Udostępnij dyplom');
  const changeNameLabel = t3('Изменить имя на награде', 'Змінити імʼя на нагороді', 'Change the name on the diploma', 'Cambiar el nombre en el diploma', 'Alterar nome no diploma', 'Đổi tên trên phần thưởng', 'Ubah nama di diploma', 'Diplomadaki adı değiştir', 'Zmień imię na dyplomie');
  const addNameLabel = t3('Указать имя на награде', 'Вказати імʼя на нагороді', 'Put your name on the diploma', 'Poner nombre en el diploma', 'Informar nome no diploma', 'Nhập tên trên phần thưởng', 'Masukkan nama di diploma', 'Diplomaya isim ekle', 'Podaj imię na dyplomie');
  const retryLabel = t3('Попробовать ещё раз', 'Спробувати ще раз', 'Try again', 'Intentar otra vez', 'Tentar de novo', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Spróbuj ponownie');
  // L10: выход из экзамена — стеклянное подтверждение вместо нативного окна системы
  const exitModal = (
    <ThemedConfirmModal
      visible={exitExamConfirm}
      title={t3('Выйти из экзамена?', 'Вийти з іспиту?', 'Exit the exam?', '¿Salir del examen?', 'Sair do exame?', 'Thoát bài kiểm tra?', 'Keluar dari ujian?', 'Sınavdan çıkılsın mı?', 'Wyjść z egzaminu?')}
      message={t3(
        'Текущая попытка будет потеряна, ответы не сохранятся.',
        'Поточну спробу буде втрачено, відповіді не збережуться.',
        'Your current attempt will be lost and answers won\'t be saved.',
        'Perderás el intento actual y tus respuestas no se guardarán.',
        'A tentativa atual será perdida e as respostas não serão salvas.',
        'Lần làm bài hiện tại sẽ mất, câu trả lời không được lưu.',
        'Percobaan saat ini akan hilang dan jawaban tidak disimpan.',
        'Mevcut deneme kaybolacak, cevaplar kaydedilmeyecek.',
        'Bieżąca próba zostanie utracona, odpowiedzi nie zostaną zapisane.',
      )}
      cancelLabel={t3('Продолжить экзамен', 'Продовжити іспит', 'Continue the exam', 'Seguir con el examen', 'Continuar o exame', 'Tiếp tục làm bài', 'Lanjutkan ujian', 'Sınava devam et', 'Kontynuuj egzamin')}
      confirmLabel={t3('Выйти', 'Вийти', 'Exit', 'Salir', 'Sair', 'Thoát', 'Keluar', 'Çık', 'Wyjdź')}
      onCancel={() => setExitExamConfirm(false)}
      onConfirm={() => { setExitExamConfirm(false); safeRouterBack(router); }}
      confirmVariant="accent"
    />
  );
  // Скрытый холст для экспорта сертификата в PNG (как прежде).
  const exportCanvas = mountExportCert && certificate ? (
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
  ) : null;
  // Блок награды (L8/L10): диплом + «поделиться» + «изменить имя», либо приглашение указать имя.
  const renderCertificateBlock = (svgWidth: number) => {
    if (!certificate) return null;
    if (certificate.name?.trim()) {
      return (
        <View style={[examCardStyle(glass), { padding: 16, alignItems: 'center' }]}>
          <View style={{ borderRadius: 14, overflow: 'hidden' }}>
            <LingmanCertificateSvg
              name={certificate.name}
              score={certificate.score}
              total={certificate.total}
              pct={certificate.pct}
              certId={certificate.certId}
              completedAt={certificate.completedAt}
              lang={certificate.lang}
              layoutWidth={svgWidth}
            />
          </View>
          <Text
            style={{ color: glass.secondary, fontSize: 13, marginTop: 10, letterSpacing: 1 }}
            accessibilityRole="text"
            accessibilityLabel={t3(
              `Номер сертификата: ${certificate.certId}`,
              `Номер сертифіката: ${certificate.certId}`,
              `Certificate number: ${certificate.certId}`,
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
          <View style={{ alignSelf: 'stretch', marginTop: 18, gap: 4 }}>
            <PracticeCta glass={glass} icon="share-outline" label={shareCertLabel} onPress={() => { hapticTap(); void shareCertificate(); }} />
            <ExamQuietButton glass={glass} label={changeNameLabel} onPress={() => { hapticTap(); setNameModalVisible(true); }} />
          </View>
        </View>
      );
    }
    // Имени нет: диплом не показываем (чтобы его не расшарили без имени) — приглашение указать имя.
    return (
      <View style={[examCardStyle(glass), { padding: 20, alignItems: 'center', gap: 12 }]}>
        <ExamTile glass={glass} icon="ribbon-outline" />
        <Text style={{ color: glass.text, fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center' }}>
          {t3(
            'Награда готова — добавь имя',
            'Нагорода готова — додай імʼя',
            'Your diploma is ready — add your name',
            'Tu diploma está listo — añade tu nombre',
            'Seu diploma está pronto — adicione o nome',
            'Phần thưởng đã sẵn sàng — thêm tên',
            'Diploma siap — tambahkan nama',
            'Diploma hazır — adını ekle',
            'Dyplom jest gotowy — dodaj imię',
          )}
        </Text>
        <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center' }}>
          {t3(
            `Твой результат: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nУкажи имя — и сертификат появится ниже.`,
            `Твій результат: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nВкажи імʼя — і сертифікат зʼявиться нижче.`,
            `Your result: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nAdd your name and the certificate will appear below.`,
            `Tu resultado: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nIndica tu nombre y el certificado aparecerá abajo.`,
            `Seu resultado: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nInforme o nome e o certificado aparecerá abaixo.`,
            `Kết quả của bạn: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nNhập tên và chứng chỉ sẽ xuất hiện bên dưới.`,
            `Hasilmu: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nMasukkan nama dan sertifikat akan muncul di bawah.`,
            `Sonucun: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nAdını yaz, sertifika aşağıda görünecek.`,
            `Twój wynik: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nPodaj imię, a certyfikat pojawi się niżej.`,
          )}
        </Text>
        <PracticeCta glass={glass} icon="create-outline" label={addNameLabel} onPress={() => { hapticTap(); setNameModalVisible(true); }} />
      </View>
    );
  };

  // ── LOCKED (L1) ───────────────────────────────────────────────────────────
  if(phase==='locked') return(
    <>
    <ScreenGradient artBackdrop="exam">
    <SafeAreaView style={{flex:1}}>
      <ExamHeader glass={glass} title={examTitle} onBack={() => safeRouterBack(router)} />
      <View style={{flex:1,justifyContent:'center',paddingBottom:40}}>
        <ExamHero
          glass={glass}
          icon="ribbon-outline"
          title={t3('Экзамен недоступен', 'Іспит недоступний', 'Exam unavailable', 'Examen no disponible', 'Exame indisponível', 'Bài kiểm tra chưa khả dụng', 'Ujian belum tersedia', 'Sınav kullanılamıyor', 'Egzamin niedostępny')}
          message={t3(
            'Пройди все 32 урока с оценкой 5.0 и сдай все 4 зачёта, чтобы открыть финальный тест Phraseman.',
            'Пройди всі 32 уроки з оцінкою 5.0 та склади всі 4 заліки, щоб відкрити фінальний тест Phraseman.',
            'Complete all 32 lessons with a 5.0 grade and pass all 4 level checks to unlock the Phraseman final exam.',
            'Completa las 32 lecciones con nota 5,0 y supera los 4 exágenes de nivel para desbloquear el examen final de Phraseman.',
            'Complete as 32 lições com nota 5,0 e passe nos 4 testes de nível para desbloquear o exame final do Phraseman.',
            'Hoàn thành tất cả 32 bài học với điểm 5,0 và vượt qua 4 bài kiểm tra cấp độ để mở bài kiểm tra cuối của Phraseman.',
            'Selesaikan semua 32 pelajaran dengan nilai 5,0 dan lulus 4 tes level untuk membuka ujian akhir Phraseman.',
            'Phraseman final sınavını açmak için 32 dersin tamamını 5,0 puanla bitir ve 4 seviye testini geç.',
            'Ukończ wszystkie 32 lekcje z oceną 5,0 i zdaj 4 testy poziomujące, aby odblokować egzamin końcowy Phraseman.',
          )}
        />
        <View style={{paddingHorizontal:16}}>
          <ExamKvCard glass={glass} style={{marginTop:26}}>
            <Text style={{color:glass.text,fontSize:16,fontWeight:'700',fontVariant:['tabular-nums']}}>
              {lessonsCompleted} {t3('из 32 уроков завершено', 'з 32 уроків завершено', 'of 32 lessons completed', 'de 32 lecciones completadas', 'de 32 lições concluídas', 'trong 32 bài học đã hoàn thành', 'dari 32 pelajaran selesai', '/ 32 ders tamamlandı', 'z 32 lekcji ukończono')}
            </Text>
            <ExamTrack glass={glass} ratio={lessonsCompleted/32} style={{marginTop:12}} />
          </ExamKvCard>
        </View>
      </View>
      <ExamFooter bottomInset={0}>
        <PracticeCta
          glass={glass}
          label={stripArrow(t3('Перейти к урокам →', 'Перейти до уроків →', 'Go to lessons →', 'Ir a las lecciones →', 'Ir para as lições →', 'Đi tới bài học →', 'Ke pelajaran →', 'Derslere git →', 'Przejdź do lekcji →'))}
          trailingArrow
          onPress={()=>router.replace('/lessons_list' as any)}
        />
      </ExamFooter>
    </SafeAreaView>
    </ScreenGradient>
    <NoEnergyModal variant="learn" visible={noEnergy} onClose={() => setNoEnergy(false)} activity="level_exam" />
    </>
  );

  // ── INTRO (L2) ────────────────────────────────────────────────────────────
  if(phase==='intro') return (
    <>
      <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={{flex:1}}>
        <ExamHeader glass={glass} title={examTitle} onBack={() => certificate ? setPhase('cert') : safeRouterBack(router)} />
        <BouncyScrollView decelerationRate="fast" style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,paddingTop:22,paddingBottom:24}}>
          <ExamHero
            glass={glass}
            icon="ribbon-outline"
            title={t3('Итоговый тест курса', 'Підсумковий тест курсу', 'Final course exam', 'Examen integrador del curso', 'Teste final do curso', 'Bài kiểm tra tổng kết khóa học', 'Tes akhir kursus', 'Kurs final sınavı', 'Test końcowy kursu')}
            message={t3(
              '50 заданий: грамматика и лексика по темам уроков. Это проверка внутри приложения, а не официальный экзамен.',
              '50 завдань: граматика й лексика за темами уроків. Це перевірка в застосунку, а не офіційний іспит.',
              '50 tasks: grammar and vocabulary from the lesson topics. It’s an in-app check, not an official exam.',
              '50 tareas: gramática y léxico según las lecciones. Es una prueba de la app, no un examen oficial.',
              '50 tarefas: gramática e vocabulário dos temas das lições. É uma avaliação do app, não um exame oficial.',
              '50 câu hỏi: ngữ pháp và từ vựng theo chủ đề bài học. Đây là bài kiểm tra trong ứng dụng, không phải kỳ thi chính thức.',
              '50 soal: tata bahasa dan kosakata dari topik pelajaran. Ini tes di aplikasi, bukan ujian resmi.',
              '50 soru: ders konularına göre gramer ve kelime. Bu bir uygulama içi test, resmi sınav değil.',
              '50 zadań: gramatyka i słownictwo z tematów lekcji. To sprawdzian w aplikacji, a nie oficjalny egzamin.',
            )}
          />
          {certificate && (
            <ExamKvCard
              glass={glass}
              style={{marginTop:22}}
              note={t3(
                `Текущий результат: ${certificate.pct}%. Новый пересчёт — только при 80% и выше (награда в приложении).`,
                `Поточний результат: ${certificate.pct}%. Новий перерахунок — лише за ≥ 80% (нагорода в застосунку).`,
                `Current result: ${certificate.pct}%. The in-app diploma only updates at ≥ 80%.`,
                `Resultado actual: ${certificate.pct} %. Solo se actualizará el diploma en la app si sacas ≥ 80 %.`,
                `Resultado atual: ${certificate.pct}%. A premiação no app só será atualizada com ≥ 80%.`,
                `Kết quả hiện tại: ${certificate.pct}%. Phần thưởng trong ứng dụng chỉ cập nhật khi đạt ≥ 80%.`,
                `Hasil saat ini: ${certificate.pct}%. Penghargaan di aplikasi hanya diperbarui jika nilainya ≥ 80%.`,
                `Mevcut sonuç: ${certificate.pct}%. Uygulamadaki ödül yalnızca ≥ 80% olursa güncellenir.`,
                `Aktualny wynik: ${certificate.pct}%. Nagroda w aplikacji zaktualizuje się tylko przy wyniku ≥ 80%.`,
              )}
            />
          )}
          <View style={[examCardStyle(glass), {marginTop:22,paddingHorizontal:16,paddingVertical:6}]}>
            <Text style={{color:glass.secondary,fontSize:13,letterSpacing:1.6,textTransform:'uppercase',paddingTop:12,paddingBottom:6}}>
              {t3('Что будет на экзамене', 'Що буде на іспиті', 'What\'s on the exam', 'Qué incluye el examen', 'O que cai no exame', 'Bài kiểm tra gồm những gì', 'Isi ujian', 'Sınavda neler var', 'Co obejmuje egzamin')}
            </Text>
            {[
              { icon: 'timer-outline', ru: '60 минут на весь блок', uk: '60 хвилин на весь блок', es: '60 minutos para todo el bloque', en: '60 minutes for the whole block', 'pt-BR': '60 minutos para todo o bloco', ptBr: '60 minutos para todo o bloco', vi: '60 phút cho toàn bộ phần', id: '60 menit untuk seluruh blok', tr: 'Tüm blok için 60 dakika', pl: '60 minut na cały blok' },
              {
                icon: 'bookmark-outline',
                ru: 'Можно помечать и пропускать вопросы, затем вернуться, если есть время',
                uk: 'Можна позначати й пропускати питання, потім повернутися, якщо є час',
                es: 'Puedes marcar y saltar preguntas y volver si te da tiempo', en: 'You can flag and skip questions, then come back if there is time',
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
                es: 'Insignia nivel B2 en la app al completar con éxito', en: 'B2 level award in the app for passing',
                'pt-BR': 'Insígnia nível B2 no app ao concluir com sucesso',
                ptBr: 'Insígnia nível B2 no app ao concluir com sucesso',
                vi: 'Huy hiệu cấp B2 trong ứng dụng khi hoàn thành thành công',
                id: 'Badge level B2 di aplikasi setelah berhasil selesai',
                tr: 'Başarıyla tamamlarsan uygulamada B2 seviyesi rozeti',
                pl: 'Odznaka poziomu B2 w aplikacji po zdaniu testu',
                sub: true as const,
              },
            ].map((item,i)=>(
              <View key={i} style={{flexDirection:'row',alignItems:'flex-start',gap:14,paddingVertical:12,borderTopWidth:i===0?0:StyleSheet.hairlineWidth,borderTopColor:glass.line}}>
                <Ionicons name={item.icon as any} size={20} color={glass.text} style={{marginTop:1}}/>
                <View style={{flex:1}}>
                  <Text style={{color:glass.text,fontSize:16,lineHeight:22,fontWeight:'600'}}>{t3(item.ru, item.uk, item.ru, item.es, item.ptBr, item.vi, item.id, item.tr, item.pl)}</Text>
                  {'sub' in item && item.sub && (
                    <Text style={{color:glass.secondary,fontSize:13,lineHeight:18,marginTop:3}}>
                      {t3(
                        'диплом в приложении при результате 80% и выше',
                        'диплом у застосунку за результатом ≥ 80%',
                        'in-app diploma at 80% or higher',
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
          </View>
          <Text style={{color:glass.secondary,fontSize:13,textAlign:'center',marginTop:16}}>
            {t3(
              'После начала таймер не останавливается',
              'Після початку таймер не зупиняється',
              'The timer doesn\'t stop once started',
              'Cuando empiezas, el temporizador no se detiene',
              'Depois de começar, o cronômetro não para',
              'Sau khi bắt đầu, đồng hồ sẽ không dừng',
              'Setelah mulai, timer tidak berhenti',
              'Başladıktan sonra süre durmaz',
              'Po rozpoczęciu licznik się nie zatrzymuje',
            )}
          </Text>
        </BouncyScrollView>
        {/* зачем (PM-086): ценник энергии на кнопке убран — сам расход энергии не менялся.
            (решение панели по поручению владельца 2026-09-30: подпись с ценой энергии убрана — энергия видна одним индикатором в шапке, занятие стоит 1 (D06).) */}
        <ExamFooter bottomInset={0}>
          <PracticeCta
            glass={glass}
            label={t3('Начать тест', 'Почати тест', 'Start', 'Empezar', 'Começar', 'Bắt đầu', 'Mulai', 'Başla', 'Rozpocznij')}
            trailingArrow
            disabled={examStarting}
            onPress={() => { hapticTap(); void startExam(); }}
          />
          <ExamQuietButton glass={glass} label={homeLabel} onPress={() => { hapticTap(); router.replace('/(tabs)/home' as any); }} />
        </ExamFooter>
      </SafeAreaView>
      </ScreenGradient>
      <NoEnergyModal variant="learn" visible={noEnergy} onClose={() => setNoEnergy(false)} activity="level_exam" />
    </>
  );

  // ── REVIEW (L7) ───────────────────────────────────────────────────────────
  if(phase==='review') return (
    <>
      <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={{flex:1}}>
        <ExamHeader
          glass={glass}
          title={t3('Проверка ответов', 'Перевірка відповідей', 'Reviewing answers', 'Revisión de respuestas', 'Revisão das respostas', 'Kiểm tra câu trả lời', 'Tinjau jawaban', 'Cevapları kontrol et', 'Sprawdzenie odpowiedzi')}
          subtitle={[
            `${answered} ${t3('отв.', 'відп.', 'ans.', 'resp.', 'resp.', 'đã trả lời', 'jawab', 'cevap', 'odp.')}`,
            `${questions.length-answered} ${t3('без отв.', 'без відп.', 'no ans.', 'sin resp.', 'sem resp.', 'chưa trả lời', 'tanpa jawaban', 'cevapsız', 'bez odp.')}`,
            `${flagged.filter(Boolean).length} ${t3('помеч.', 'позн.', 'flag.', 'marc.', 'marc.', 'đã đánh dấu', 'ditandai', 'işaretli', 'ozn.')}`,
          ].join(' · ')}
          onBack={()=>setPhase('quiz')}
          right={<ExamPill glass={glass} icon="timer-outline" text={formatTime(totalTimeLeft)} color={isLowTime?t.wrong:glass.text} />}
        />
        <BouncyScrollView decelerationRate="fast" style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,paddingTop:22,paddingBottom:24}}>
          <View style={[examCardStyle(glass), {overflow:'hidden'}]}>
            {questions.map((qItem, i) => {
              const isAnswered = choices[i] !== null;
              const isFlaggedItem = flagged[i];
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  style={({pressed}) => ({
                    flexDirection:'row', alignItems:'center', gap:12,
                    minHeight:56, paddingHorizontal:16, paddingVertical:10,
                    borderTopWidth: i===0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: glass.line,
                    backgroundColor: pressed || i===idx ? glass.selected : 'transparent',
                  })}
                  onPress={()=>{ setIdx(i); setPhase('quiz'); }}
                >
                  <View style={{
                    width:30, height:30, borderRadius:15,
                    backgroundColor: isAnswered ? glass.opaqueControl : t.wrongBg,
                    justifyContent:'center', alignItems:'center',
                  }}>
                    <Text style={{color:isAnswered?glass.text:t.wrong,fontSize:13,fontWeight:'700',fontVariant:['tabular-nums']}}>{i+1}</Text>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={{color:glass.text,fontSize:16,lineHeight:21,fontWeight:'600'}}>{t3('Урок', 'Урок', 'Lesson', 'Lección', 'Lição', 'Bài học', 'Pelajaran', 'Ders', 'Lekcja')} {qItem.lessonNum} · {examTopicForLang(qItem, lang)}</Text>
                    <Text style={{color:isAnswered?glass.secondary:t.wrong,fontSize:13,lineHeight:18,marginTop:1}}>
                      {isAnswered
                        ? t3('отв.', 'відп.', 'ans.', 'resp.', 'resp.', 'đã trả lời', 'jawab', 'cevap', 'odp.')
                        : t3('без отв.', 'без відп.', 'no ans.', 'sin resp.', 'sem resp.', 'chưa trả lời', 'tanpa jawaban', 'cevapsız', 'bez odp.')}
                    </Text>
                  </View>
                  {isFlaggedItem && <Ionicons name="bookmark" size={18} color={glass.text}/>}
                </Pressable>
              );
            })}
          </View>
        </BouncyScrollView>
        <ExamFooter bottomInset={0}>
          {answered < questions.length && (
            <Text style={{color:t.wrong,fontSize:16,textAlign:'center',marginBottom:6}}>
              {t3(
                `${questions.length - answered} вопросов без ответа`,
                `${questions.length - answered} питань без відповіді`,
                `${questions.length - answered} unanswered questions`,
                `${questions.length - answered} preguntas sin respuesta`,
                `${questions.length - answered} perguntas sem resposta`,
                `${questions.length - answered} câu hỏi chưa trả lời`,
                `${questions.length - answered} soal belum dijawab`,
                `${questions.length - answered} soru cevapsız`,
                `${questions.length - answered} pytań bez odpowiedzi`,
              )}
            </Text>
          )}
          <PracticeCta
            glass={glass}
            label={t3('Сдать экзамен', 'Здати іспит', 'Submit the exam', 'Entregar el examen', 'Enviar o exame', 'Nộp bài kiểm tra', 'Kumpulkan ujian', 'Sınavı gönder', 'Oddaj egzamin')}
            trailingArrow
            onPress={() => { hapticTap(); submitExam(); }}
          />
        </ExamFooter>
      </SafeAreaView>
      </ScreenGradient>
      <NoEnergyModal variant="learn" visible={noEnergy} onClose={() => setNoEnergy(false)} activity="level_exam" />
      {exitModal}
    </>
  );

  // ── COUNTDOWN (L3) ────────────────────────────────────────────────────────
  if (phase === 'countdown') return (
    <>
      <ScreenGradient artBackdrop="exam">
        <SafeAreaView style={{ flex: 1 }}>
          <ExamHeader glass={glass} title={examTitle} onBack={() => setExitExamConfirm(true)} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            <Animated.Text
              style={{
                color: glass.text,
                fontSize: 132,
                lineHeight: 140,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                transform: [{ scale: countdownAnim }],
              }}
            >
              {countdownNum}
            </Animated.Text>
            <Text style={{ color: glass.secondary, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
              {t3('Приготовься', 'Приготуйся', 'Get ready', 'Prepárate', 'Prepare-se', 'Chuẩn bị', 'Bersiap', 'Hazırlan', 'Przygotuj się')}
            </Text>
          </View>
        </SafeAreaView>
      </ScreenGradient>
      <NoEnergyModal variant="learn" visible={noEnergy} onClose={() => setNoEnergy(false)} activity="level_exam" />
      {exitModal}
    </>
  );

  // ── RESULT (L8) ───────────────────────────────────────────────────────────
  if (phase === 'result') {
    // Результаты по темам: та же информация, что была списком по вопросам, свёрнутая по темам (как в макете)
    const topicRows = (() => {
      const map = new Map<string, { right: number; all: number }>();
      questions.forEach((qItem, i) => {
        const key = examTopicForLang(qItem, lang);
        const cur = map.get(key) ?? { right: 0, all: 0 };
        map.set(key, { right: cur.right + (choices[i] === qItem.correct ? 1 : 0), all: cur.all + 1 });
      });
      return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
    })();
    return (
      <>
        <ScreenGradient artBackdrop="exam">
        <SafeAreaView style={{flex:1}}>
          {exportCanvas}
          <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:12,minHeight:52}}>
            <PracticeRoundIconButton
              glass={glass}
              color={glass.text}
              icon="close"
              accessibilityLabel={homeLabel}
              onPress={() => { hapticTap(); router.replace('/(tabs)/home' as any); }}
            />
          </View>
          <BouncyScrollView decelerationRate="fast" style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,paddingTop:16,paddingBottom:24}}>
            <ExamHero
              glass={glass}
              icon="ribbon-outline"
              title={t3('Блок завершён', 'Блок завершено', 'Block finished', 'Bloque terminado', 'Bloco concluído', 'Đã hoàn thành phần này', 'Blok selesai', 'Blok tamamlandı', 'Blok ukończony')}
              message={pct >= 80
                ? t3(
                    'Сильный результат по темам курса — закрепляй слабые места в уроках.',
                    'Сильний результат за темами курсу — закріплюй слабкі місця в уроках.',
                    'Strong result by topic — reinforce your weak spots in the lessons.',
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
                      'A middling score is a normal growth point — revisit "Theory" and "Vocabulary".',
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
                      'A low score isn\'t about ability — it signals which topics to revisit.',
                      'Un bajo porcentaje no mide «talento»: indica temas para repasar con calma.',
                      'Uma nota baixa não mede talento: mostra quais temas revisar com calma.',
                      'Điểm thấp không nói lên năng lực; nó cho biết chủ đề nào cần học lại.',
                      'Nilai rendah bukan soal kemampuan; ini sinyal topik mana yang perlu diulang.',
                      'Düşük puan yetenek meselesi değildir; hangi konulara dönmen gerektiğini gösterir.',
                      'Niski wynik nie mówi o zdolnościach; pokazuje, które tematy warto przerobić ponownie.',
                    )}
            />
            <ExamStatRow
              glass={glass}
              items={[
                { value: String(score), label: t3(`из ${questions.length}`, `з ${questions.length}`, `of ${questions.length}`, `de ${questions.length}`, `de ${questions.length}`, `/ ${questions.length}`, `dari ${questions.length}`, `/ ${questions.length}`, `z ${questions.length}`) },
                { value: `${pct}%`, label: t3('точность', 'точність', 'accuracy', 'precisión', 'precisão', 'chính xác', 'akurasi', 'doğruluk', 'trafność') },
              ]}
            />
            <View style={[examCardStyle(glass), {marginTop:18,paddingHorizontal:16,paddingVertical:8}]}>
              <Text style={{color:glass.secondary,fontSize:13,letterSpacing:1.6,textTransform:'uppercase',paddingTop:10,paddingBottom:6}}>
                {t3('Результаты по темам', 'Результати по темах', 'Results by topic', 'Resultados por temas', 'Resultados por tema', 'Kết quả theo chủ đề', 'Hasil per topik', 'Konu bazında sonuçlar', 'Wyniki według tematów')}
              </Text>
              {topicRows.map((row, i) => (
                <View key={`${row.name}-${i}`} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:10}}>
                  <Text style={{flex:1.3,color:glass.text,fontSize:16,lineHeight:21}}>{row.name}</Text>
                  <View style={{flex:1}}>
                    <ExamTrack glass={glass} ratio={row.all > 0 ? row.right / row.all : 0} />
                  </View>
                  <Text style={{minWidth:36,textAlign:'right',color:glass.secondary,fontSize:13,fontVariant:['tabular-nums']}}>{row.right}/{row.all}</Text>
                </View>
              ))}
            </View>
            {certificate ? <View style={{marginTop:18}}>{renderCertificateBlock(420)}</View> : null}
          </BouncyScrollView>
          {/* зачем (PM-086, владелец 2026-09-24): ценник энергии над кнопкой убран — расход энергии за повтор не меняется. */}
          <ExamFooter bottomInset={0}>
            <PracticeCta glass={glass} icon="share-outline" label={t3('Поделиться результатом', 'Поділитися результатом', 'Share the result', 'Compartir resultado', 'Compartilhar resultado', 'Chia sẻ kết quả', 'Bagikan hasil', 'Sonucu paylaş', 'Udostępnij wynik')} onPress={() => { hapticTap(); void shareExamResult(); }} />
            <ExamQuietButton glass={glass} label={retryLabel} onPress={() => { hapticTap(); void startExam(); }} />
            <ExamQuietButton glass={glass} label={homeLabel} onPress={() => { hapticTap(); router.replace('/(tabs)/home' as any); }} />
          </ExamFooter>
        </SafeAreaView>
        </ScreenGradient>
        <NoEnergyModal variant="learn" visible={noEnergy} onClose={() => setNoEnergy(false)} activity="level_exam" />
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
          {exportCanvas}
          <ExamHeader
            glass={glass}
            title={t3('Моя награда B2', 'Моя нагорода B2', 'My B2 diploma', 'Mi diploma B2', 'Meu diploma B2', 'Phần thưởng B2 của tôi', 'Diploma B2 saya', 'B2 diplomam', 'Mój dyplom B2')}
            onBack={() => { safeRouterBack(router); }}
          />
          <BouncyScrollView decelerationRate="fast" style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,paddingTop:22,paddingBottom:24}}>
            <Text style={{color:glass.secondary,fontSize:13,letterSpacing:1.6,textTransform:'uppercase',textAlign:'center'}}>PHRASEMAN ACADEMY</Text>
            <Text style={{color:glass.secondary,fontSize:13,textAlign:'center',marginTop:8,marginBottom:18,fontVariant:['tabular-nums']}}>
              {`${certificate.score} / ${certificate.total} · ${certificate.pct}% · ${formatCertDate(certificate.completedAt, certificate.lang)}`}
            </Text>
            {renderCertificateBlock(520)}
            <Text style={{color:glass.secondary,fontSize:13,marginTop:14,textAlign:'center'}}>
              {t3(
                'Новый результат перезапишет награду только если наберёшь 80% и выше',
                'Новий результат перезапише нагороду тільки якщо набереш ≥ 80%',
                'A new result overwrites the reward only if you score ≥ 80%',
                'Un nuevo resultado sustituye el diploma solo si sacas ≥ 80%',
                'Um novo resultado só substituirá o diploma se você fizer ≥ 80%',
                'Kết quả mới chỉ ghi đè phần thưởng nếu bạn đạt ≥ 80%',
                'Hasil baru hanya mengganti diploma jika nilainya ≥ 80%',
                'Yeni sonuç diplomayı yalnızca ≥ 80% alırsan değiştirir',
                'Nowy wynik nadpisze dyplom tylko przy wyniku ≥ 80%',
              )}
            </Text>
            <View style={{alignItems:'center',marginTop:6}}>
              <ExamQuietButton
                glass={glass}
                label={t3(
                  'Попробовать ещё раз — улучшить результат',
                  'Спробувати ще раз — поліпшити результат',
                  'Try again — improve the result',
                  'Intentar de nuevo — mejorar la nota',
                  'Tentar de novo — melhorar o resultado',
                  'Thử lại — cải thiện kết quả',
                  'Coba lagi — tingkatkan hasil',
                  'Tekrar dene — sonucu iyileştir',
                  'Spróbuj ponownie — popraw wynik',
                )}
                onPress={() => setPhase('intro')}
              />
            </View>
          </BouncyScrollView>
        </SafeAreaView>
        </ScreenGradient>
        <NoEnergyModal variant="learn" visible={noEnergy} onClose={() => setNoEnergy(false)} activity="level_exam" />
        <CertificateNameModal
          visible={nameModalVisible}
          initialName={certificate.name?.trim() ? certificate.name : certNamePrefill}
          onSave={(n) => { void handleSaveName(n); }}
          onSkip={() => setNameModalVisible(false)}
        />
      </>
    );
  }

  // ── QUIZ (L4–L6) ──────────────────────────────────────────────────────────
  const questionKicker = q.type === 'choice4'
    ? t3('Какое предложение верное?', 'Яке речення правильне?', 'Which sentence is correct?', '¿Qué frase es correcta?', 'Qual frase está correta?', 'Câu nào đúng?', 'Kalimat mana yang benar?', 'Hangi cümle doğru?', 'Które zdanie jest poprawne?')
    : q.type === 'error'
      ? t3('Исправь ошибку', 'Виправ помилку', 'Fix the mistake', 'Corrige el error', 'Corrija o erro', 'Sửa lỗi', 'Perbaiki kesalahan', 'Hatayı düzelt', 'Popraw błąd')
      : undefined;
  return (
    <>
      <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={{flex:1}}>
        <ExamHeader
          glass={glass}
          title={examTitle}
          subtitle={`${idx+1} / ${questions.length}`}
          onBack={() => { hapticTap(); setExitExamConfirm(true); }}
          right={<ExamPill glass={glass} icon="timer-outline" text={formatTime(totalTimeLeft)} color={isLowTime?t.wrong:glass.text} testID="exam-timer" />}
        />
        <View style={{paddingHorizontal:16,marginTop:14}}>
          <ExamTrack glass={glass} ratio={questions.length > 0 ? (idx+1) / questions.length : 0} />
        </View>

        <BouncyScrollView
          decelerationRate="fast"
          style={{flex:1}}
          contentContainerStyle={{paddingHorizontal:16,paddingTop:14,paddingBottom:24}}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,minHeight:44}}>
            <Text style={{flex:1,color:glass.secondary,fontSize:16,lineHeight:21,fontWeight:'700'}}>
              {t3('Урок', 'Урок', 'Lesson', 'Lección', 'Lição', 'Bài học', 'Pelajaran', 'Ders', 'Lekcja')} {q.lessonNum} · {examTopicForLang(q, lang)}
            </Text>
            <PracticeRoundIconButton glass={glass} color={glass.text} icon="list-outline" onPress={()=>setPhase('review')} accessibilityLabel={t3('Проверка ответов', 'Перевірка відповідей', 'Reviewing answers', 'Revisión de respuestas', 'Revisão das respostas', 'Kiểm tra câu trả lời', 'Tinjau jawaban', 'Cevapları kontrol et', 'Sprawdzenie odpowiedzi')} />
            <PracticeRoundIconButton glass={glass} color={isFlagged ? glass.ctaInk : glass.text} icon={isFlagged ? 'bookmark' : 'bookmark-outline'} onPress={toggleFlag} accessibilityLabel={t3('Пометить вопрос', 'Позначити питання', 'Flag question', 'Marcar pregunta', 'Marcar pergunta', 'Đánh dấu câu hỏi', 'Tandai soal', 'Soruyu işaretle', 'Oznacz pytanie')} />
          </View>
          <View style={[examCardStyle(glass), {marginTop:8,paddingVertical:22,paddingHorizontal:22,minHeight:110}]}>
            {questionKicker ? <Text style={{color:glass.secondary,fontSize:16,lineHeight:21,marginBottom:8}}>{questionKicker}</Text> : null}
            <ClozeGapText text={q.q} style={{color:glass.text,fontSize:24,fontWeight:'600',lineHeight:30}} />
          </View>

          <View style={{gap:10,marginTop:18}}>
            {(q.opts ?? []).map((opt,ci)=>{
              const on = flashKey === `${ci}`;
              return (
                <ExamOption
                  key={ci}
                  glass={glass}
                  label={opt}
                  state={on || chosen===ci ? 'pressed' : 'idle'}
                  okColor={t.correct}
                  okBg={t.correctBg}
                  noColor={t.wrong}
                  noBg={t.wrongBg}
                  onPress={()=>{ flash(`${ci}`); handleAnswer(ci); }}
                />
              );
            })}
          </View>
          <View style={{alignItems:'flex-end',marginTop:8}}>
            <ReportErrorButton
              screen="exam"
              dataId={`exam_lesson_${q.lessonNum}_q${idx}`}
              dataText={[
                `Q: ${q.q}`,
                `Варианты: ${(q.opts ?? []).map((o,i)=>i===q.correct?`[✓${o}]`:o).join(' | ')}`,
              ].join('\n')}
              style={{ paddingHorizontal: 16 }}
              textColor={sx.muted}
            />
          </View>
        </BouncyScrollView>

        {/* Низ: назад · пропустить · дальше (`.fx`) */}
        <ExamFooter bottomInset={0}>
          <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
            <View style={{opacity: idx===0 ? 0.35 : 1}}>
              <PracticeBackButton glass={glass} color={glass.text} onPress={idx===0 ? undefined : goPrev} accessibilityLabel={t3('Предыдущий вопрос', 'Попереднє питання', 'Previous question', 'Pregunta anterior', 'Pergunta anterior', 'Câu trước', 'Soal sebelumnya', 'Önceki soru', 'Poprzednie pytanie')} />
            </View>
            {chosen === null ? (
              <View style={{flex:1}}>
                <ExamQuietButton glass={glass} label={stripArrow(t3('Пропустить →', 'Пропустити →', 'Skip →', 'Omitir →', 'Pular →', 'Bỏ qua →', 'Lewati →', 'Atla →', 'Pomiń →'))} onPress={skipToNext} />
              </View>
            ) : null}
            <View style={{flex:1}}>
              <PracticeCta
                glass={glass}
                trailingArrow
                label={idx+1===questions.length
                  ? stripArrow(t3('Проверить →', 'Перевірити →', 'Check →', 'Revisar →', 'Revisar →', 'Kiểm tra →', 'Tinjau →', 'Kontrol et →', 'Sprawdź →'))
                  : stripArrow(t3('Следующий вопрос →', 'Наступне питання →', 'Next question →', 'Siguiente pregunta →', 'Próxima pergunta →', 'Câu tiếp →', 'Soal berikutnya →', 'Sonraki soru →', 'Następne pytanie →'))}
                onPress={goNext}
              />
            </View>
          </View>
        </ExamFooter>
      </SafeAreaView>
      </ScreenGradient>
      <NoEnergyModal variant="learn" visible={noEnergy} onClose={() => setNoEnergy(false)} activity="level_exam" />
      {exitModal}
    </>
  );
}
