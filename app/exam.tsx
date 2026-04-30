import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    ScrollView,
    Text, TouchableOpacity,
    View,
} from 'react-native';
import Svg from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import XpGainBadge from '../components/XpGainBadge';
import { registerXP } from './xp_manager';
import { awardOneTime } from './shards_system';
import ReportErrorButton from '../components/ReportErrorButton';
import { checkAchievements } from './achievements';
import { DEV_MODE, STORE_URL } from './config';
import { shuffle } from './utils_shuffle';
import { isLingmanExamAvailable } from './lesson_lock_system';
import QuizShareCardSvg from '../components/share_cards/QuizShareCardSvg';
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
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';
import { bundleLang, triLang } from '../constants/i18n';
import type { ShareCardLang } from '../components/share_cards/streakCardCopy';
import { examTopicForLang } from './exam_locale';

const TOTAL_EXAM_SECONDS = 60 * 60; // 60 minutes total
const LINGMAN_EXAM_ENERGY = 8;

type ExamQType = 'fill' | 'choice4' | 'error';
interface ExamQuestion {
  lessonNum: number;
  topic:   string;   // RU topic name
  topicUK: string;   // UK topic name
  /** ES; если нет — для es показывается topic (RU) */
  topicES?: string;
  q:       string;   // question (English)
  opts:    string[]; // 4 options
  correct: number;
  type?:   ExamQType; // default = 'fill'
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
  {lessonNum:4, topic:'Present Simple — отрицание',  topicUK:'Present Simple — заперечення',  q:'Which sentence is correct?', opts:["She don't like it.","They doesn't eat meat.","He does not smoke.","I does not know."], correct:2, type:'choice4'},
  {lessonNum:4, topic:'Present Simple — отрицание',  topicUK:'Present Simple — заперечення',  q:"Correct: He [don't] understand.", opts:["doesn't","don't","didn't","doesn't not"],                               correct:0, type:'error'},
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
  {lessonNum:8, topic:'Предлоги времени (at/in/on)', topicUK:'Прийменники часу (at/in/on)', q:"I wake up ___ 7 o'clock.",  opts:['in','on','at','by'],                                                            correct:2},
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
  {lessonNum:10, topic:'Модальные глаголы',    topicUK:'Модальні дієслова',       q:'You ___ not park here.',            opts:['must','can','could','should'],                                                     correct:0},
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
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:"This is ___ book I've read.",       opts:['good','better','the best','best'],                                               correct:2},
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:'She is ___ than her sister.',       opts:['tall','taller','tallest','most tall'],                                           correct:1},
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:'This test is ___ than the last one.', opts:['hard','harder','hardest','more hard'],                                        correct:1},
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:'Which sentence is correct?',        opts:['She is more tall.','He is the tallest.','This is more better.','She is taller then him.'], correct:1, type:'choice4'},
  {lessonNum:14, topic:'Степени сравнения',     topicUK:'Ступені порівняння',      q:'Correct: She is [more taller] than me.', opts:['taller','more taller','most tall','tallest'],                             correct:0, type:'error'},
  // ── LESSON 15: Possessive pronouns ───────────────────────────────────────
  {lessonNum:15, topic:'Притяжательные местоимения', topicUK:'Присвійні займенники', q:'This is ___ bag.',               opts:['her','hers','she','herself'],                                                     correct:0},
  {lessonNum:15, topic:'Притяжательные местоимения', topicUK:'Присвійні займенники', q:'Is this pen ___?',               opts:['your','yours','you','yourself'],                                                  correct:1},
  {lessonNum:15, topic:'Притяжательные местоимения', topicUK:'Присвійні займенники', q:'These are ___ books.',           opts:['their','theirs','they','themselves'],                                             correct:0},
  {lessonNum:15, topic:'Притяжательные местоимения', topicUK:'Присвійні займенники', q:'Which sentence is correct?',     opts:["That's hers bag.","That's her bag.","That's she bag.","That's herself bag."],    correct:1, type:'choice4'},
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
  {lessonNum:18, topic:'Повелительное наклонение', topicUK:'Наказовий спосіб',    q:"Don't ___ late.",                   opts:['be','is','are','being'],                                                         correct:0},
  {lessonNum:18, topic:'Повелительное наклонение', topicUK:'Наказовий спосіб',    q:'___ the window, please.',           opts:['Open','Opens','Opening','Opened'],                                                correct:0},
  {lessonNum:18, topic:'Повелительное наклонение', topicUK:'Наказовий спосіб',    q:'Which sentence is correct?',        opts:["Opens the window.","Being careful!","Don't be late.","Is quiet please."],        correct:2, type:'choice4'},
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
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:"I don't have ___ money.",        opts:['some','any','no','every'],                                                       correct:1},
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:'Which sentence is correct?',     opts:["I have any money.","She needs any help.","There is many people in the room.","He doesn't want anything."], correct:3, type:'choice4'},
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:"Correct: I don't have [some] time.", opts:['any','some','no','every'],                                                  correct:0, type:'error'},
  // ── LESSON 22: Gerund ─────────────────────────────────────────────────────
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'She enjoys ___.',                   opts:['dance','dances','dancing','to dance'],                                           correct:2},
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'He avoids ___ the problem.',        opts:['discuss','discussed','discussing','to discuss'],                                 correct:2},
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'They finished ___ dinner.',         opts:['cook','cooks','cooking','to cook'],                                              correct:2},
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'Which sentence is correct?',        opts:['She enjoys dance.','He avoids to talk.','I like swimming.','They finished cook.'], correct:2, type:'choice4'},
  {lessonNum:22, topic:'Герундий (-ing)',        topicUK:'Герундій (-ing)',          q:'Correct: She enjoys [to swim].',    opts:['swimming','to swim','swim','swims'],                                             correct:0, type:'error'},
  // ── LESSON 23: Passive Voice ──────────────────────────────────────────────
  {lessonNum:23, topic:'Passive Voice',          topicUK:'Passive Voice',            q:'The letter ___ by her.',            opts:['wrote','is written','was written','had written'],                                correct:2},
  {lessonNum:23, topic:'Passive Voice',          topicUK:'Passive Voice',            q:'Cars ___ made in factories.',       opts:['is','am','are','were'],                                                         correct:2},
  {lessonNum:23, topic:'Passive Voice',          topicUK:'Passive Voice',            q:'The report ___ submitted by Friday.', opts:['must be','must have','should','is going'],                                   correct:0},
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
  {lessonNum:26, topic:'Условные предложения (if)', topicUK:'Умовні речення (if)',   q:'If she had tried, she ___ passed.', opts:['will have','would have','had','did'],                                           correct:1},
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
  {lessonNum:29, topic:'Used to',                topicUK:'Used to',                  q:"I'm not ___ driving on the left yet.",  opts:['used to','use to','used to it','am used to'],  correct:0},
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

export default function ExamScreen() {
  const router = useRouter();
  const {theme:t, f } = useTheme();
  const {lang} = useLang();
  const insets = useSafeAreaInsets();
  const t3 = (ru: string, uk: string, es: string) => triLang(lang, { ru, uk, es });
  const { isUnlimited, spendAmount, energy, bonusEnergy } = useEnergy();
  const [noEnergy, setNoEnergy] = useState(false);
  const examCardSvgRef = useRef<InstanceType<typeof Svg> | null>(null);
  const certificateSvgRef = useRef<InstanceType<typeof Svg> | null>(null);

  const [phase, setPhase]           = useState<Phase>('intro');
  const [lessonsCompleted, setCompleted] = useState(0);
  const [certificate, setCertificate] = useState<LingmanCertificate | null>(null);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  /** Предзаполнение для модалки ввода имени на сертификат: подсказка из
   *  user_name / Google displayName, чтобы юзеру не пришлось вводить с нуля.
   *  Юзер всё равно явно подтверждает (или меняет) до того как сертификат
   *  с этим именем попадёт в шеринг. */
  const [certNamePrefill, setCertNamePrefill] = useState('');
  // Ленивый монтаж скрытых 1500/1080-px SVG для экспорта PNG: они тяжёлые и
  // тормозят result-экран, если висят в дереве постоянно. Монтируем только
  // на момент шеринга, потом размонтируем.
  const [mountExportExam, setMountExportExam] = useState(false);
  const [mountExportCert, setMountExportCert] = useState(false);
  const questions = React.useMemo(() => {
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
    return result.map(q => ({ ...q, topic: examTopicForLang(q, lang) }));
  }, [lang]);
  const [idx, setIdx]               = useState(0);
  const [choices, setChoices]       = useState<(number|null)[]>(() => Array(questions.length).fill(null));
  const [flagged, setFlagged]       = useState<boolean[]>(() => Array(questions.length).fill(false));
  const [totalTimeLeft, setTotalTimeLeft] = useState(TOTAL_EXAM_SECONDS);
  const [countdownNum, setCountdownNum] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const countdownAnim = useRef(new Animated.Value(1)).current;

  useEffect(()=>{
    (async()=>{
      // Подсчитываем завершённые уроки для отображения прогресса
      const keys = Array.from({length:32},(_,i)=>`lesson${i+1}_progress`);
      const pairs = await AsyncStorage.multiGet(keys);
      let done=0;
      for(const [,saved] of pairs){
        if(saved){ try{const p:string[]=JSON.parse(saved);if(p.filter((x:string)=>x==='correct'||x==='replay_correct').length>=45)done++;}catch{} }
      }
      setCompleted(done);
      const existingCert = await loadLingmanCertificate();
      if (existingCert) {
        setCertificate(existingCert);
        // Юзер уже сдал — открывать сразу его сертификат, а не intro/locked.
        setPhase('cert');
        return;
      }
      // Экзамен Лингмана: все 32 урока = 5.0 + все зачёты сданы
      if(!DEV_MODE){
        const available = await isLingmanExamAvailable();
        if(!available) setPhase('locked');
      }
    })();
  },[]);

  useEffect(()=>{
    if(phase!=='quiz'){
      if(timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(()=>{
      setTotalTimeLeft(p=>{
        if(p<=1){ clearInterval(timerRef.current!); setPhase('review'); return 0; }
        return p-1;
      });
    },1000);
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[phase]);

  useEffect(() => {
    if (phase !== 'countdown') {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }
    setCountdownNum(3);
    let current = 3;
    const tick = () => {
      if (current <= 1) {
        setPhase('quiz');
        countdownTimerRef.current = null;
        return;
      }
      current -= 1;
      setCountdownNum(current);
      countdownTimerRef.current = setTimeout(tick, 650);
    };
    countdownTimerRef.current = setTimeout(tick, 650);
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    countdownAnim.setValue(0.9);
    Animated.spring(countdownAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 140,
    }).start();
  }, [countdownNum, phase, countdownAnim]);

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
    if (!isUnlimited) {
      if (energy + bonusEnergy < LINGMAN_EXAM_ENERGY) {
        setNoEnergy(true);
        return;
      }
      const ok = await spendAmount(LINGMAN_EXAM_ENERGY);
      if (!ok) {
        setNoEnergy(true);
        return;
      }
    }
    setIdx(0);
    setChoices(Array(questions.length).fill(null));
    setFlagged(Array(questions.length).fill(false));
    setTotalTimeLeft(TOTAL_EXAM_SECONDS);
    setPhase('countdown');
  };

  const submitExam = async () => {
    const s = choices.filter((c, i) => c !== null && c === questions[i]?.correct).length;
    const p = questions.length > 0 ? Math.round(s / questions.length * 100) : 0;
    // XP: 10000 за золото (≥90%), иначе 50 + бонус за %
    const xp = p >= 90 ? 10000 : 50 + Math.round(p / 2);
    if (p >= 90) awardOneTime('exam_excellent').catch(() => {});
    checkAchievements({ type: 'exam', pct: p }).catch(() => {});
    let storedName = '';
    try {
      const raw = await AsyncStorage.getItem('user_name');
      storedName = (raw || '').trim();
    } catch {}
    if (storedName) {
      registerXP(xp, 'exam_complete', storedName, lang).catch(() => {});
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
      await saveLingmanCertificate(cert);
      setCertificate(cert);
      // Подсказка для модалки — из локального профиля, юзер может оставить или изменить.
      setCertNamePrefill(storedName);
      setNameModalVisible(true);
    }
    setPhase('result');
  };

  const handleSaveName = async (name: string) => {
    try {
      await AsyncStorage.setItem('user_name', name);
    } catch {}
    const updated = await updateLingmanCertificateName(name);
    if (updated) setCertificate(updated);
    setNameModalVisible(false);
  };

  // Один кадр reqAF недостаточен: react-native-svg успевает создать узел, но
  // ref.current ещё может быть пустым. Двойной reqAF гарантирует, что ref
  // привязан и можно дёрнуть toDataURL.
  const waitTwoFrames = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

  const shareCertificate = async () => {
    if (!certificate) return;
    // Защита: не разрешаем шарить сертификат без имени — иначе уйдёт PNG
    // с пустой подписью на бумажном поле, что выглядит как чужой/незавершённый
    // диплом. Открываем модалку ввода имени вместо шеринга.
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
    setMountExportExam(true);
    try {
      await waitTwoFrames();
      await shareCardFromSvgRef(examCardSvgRef, {
        fileNamePrefix: 'phraseman-exam',
        textFallback: msg,
      });
    } finally {
      setMountExportExam(false);
    }
  };

  const score = choices.filter((c,i) => c !== null && c === questions[i]?.correct).length;
  const answered = choices.filter(c => c !== null).length;
  const pct = questions.length>0?Math.round(score/questions.length*100):0;
  const examXp = pct >= 90 ? 10000 : 50 + Math.round(pct / 2);
  const q = questions[idx]||questions[0];
  if (!q) return null;
  const chosen = choices[idx];
  const isFlagged = flagged[idx];
  const isLowTime = totalTimeLeft < 5 * 60; // < 5 min

  // ── LOCKED ────────────────────────────────────────────────────────────────
  if(phase==='locked') return(
    <>
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      <View style={{flexDirection:'row',alignItems:'center',padding:15,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <TouchableOpacity onPress={()=>router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700',marginLeft:8}}>
          {t3('Экзамен', 'Іспит', 'Examen')}
        </Text>
      </View>
      <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:30}}>
        <ProgressRing progress={lessonsCompleted/32} size={90} color={t.correct} bg={t.border}/>
        <Text style={{color:t.textPrimary,fontSize:f.h1,fontWeight:'700',textAlign:'center',marginTop:24,marginBottom:12}}>
          {t3('Экзамен недоступен', 'Іспит недоступний', 'Examen no disponible')}
        </Text>
        <Text style={{color:t.textMuted,fontSize:f.body,textAlign:'center',lineHeight:24}}>
          {t3(
            'Пройди все 32 урока с оценкой 5.0 и сдай все 4 зачёта, чтобы открыть финальный тест Phraseman.',
            'Пройди всі 32 уроки з оцінкою 5.0 та склади всі 4 заліки, щоб відкрити фінальний тест Phraseman.',
            'Completa las 32 lecciones con nota 5,0 y supera los 4 exágenes de nivel para desbloquear el examen final de Phraseman.',
          )}
        </Text>
        <View style={{backgroundColor:t.bgCard,borderRadius:16,padding:16,borderWidth:0.5,borderColor:t.border,width:'100%',marginTop:28}}>
          <View style={{height:8,backgroundColor:t.border,borderRadius:4,overflow:'hidden'}}>
            <View style={{height:'100%',width:`${lessonsCompleted/32*100}%` as any,backgroundColor:t.textSecond,borderRadius:4}}/>
          </View>
          <Text style={{color:t.textMuted,fontSize:f.caption,marginTop:8,textAlign:'center'}}>
            {lessonsCompleted} {t3('из 32 уроков завершено', 'з 32 уроків завершено', 'de 32 lecciones completadas')}
          </Text>
        </View>
        <TouchableOpacity style={{marginTop:24}} onPress={()=>router.replace('/(tabs)/' as any)}>
          <Text style={{color:t.textSecond,fontSize:f.bodyLg,textDecorationLine:'underline'}}>
            {t3('Перейти к урокам →', 'Перейти до уроків →', 'Ir a las lecciones →')}
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
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      <View style={{flexDirection:'row',alignItems:'center',padding:15,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <TouchableOpacity onPress={() => certificate ? setPhase('cert') : router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700',marginLeft:8}}>
          {t3('Итоговый тест курса', 'Підсумковий тест курсу', 'Examen integrador del curso')}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{padding:20}}>
        {certificate && (
          <View style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(212,160,23,0.08)',borderRadius:10,padding:10,borderWidth:1,borderColor:'#d4a017',marginBottom:16}}>
            <Ionicons name="information-circle" size={18} color="#FFD700"/>
            <Text style={{color:'#FDE68A',fontSize:f.sub,flex:1}}>
              {t3(
                `Текущий результат: ${certificate.pct}%. Новый пересчёт — только при ≥ 80% (награда в приложении).`,
                `Поточний результат: ${certificate.pct}%. Новий перерахунок — лише за ≥ 80% (нагорода в застосунку).`,
                `Resultado actual: ${certificate.pct} %. Solo se actualizará el diploma en la app si sacas ≥ 80 %.`,
              )}
            </Text>
          </View>
        )}
        <View style={{alignItems:'center',marginBottom:24}}>
          <View style={{width:90,height:90,borderRadius:45,backgroundColor:t.bgCard,borderWidth:1.5,borderColor:t.border,justifyContent:'center',alignItems:'center',marginBottom:16}}>
            <Ionicons name="ribbon-outline" size={40} color={t.textSecond}/>
          </View>
          <Text style={{color:t.textPrimary,fontSize:f.numMd+6,fontWeight:'700',textAlign:'center'}}>
            {t3('Итог по программе', 'Підсумок за програмою', 'Balance del programa')}
          </Text>
          <Text style={{color:t.textMuted,fontSize:f.body,textAlign:'center',marginTop:8,lineHeight:22}}>
            {t3(
              '50 заданий: грамматика и лексика по темам уроков; оценка только в приложении (не DELE/SIELE).',
              '50 завдань: граматика й лексика за темами уроків; оцінка лише в застосунку (не DELE/SIELE).',
              '50 tareas: gramática y léxico según las lecciones; resultado orientativo en la app (no es DELE/SIELE).',
            )}
          </Text>
        </View>
        {[
          { icon: 'timer-outline', ru: '60 минут на весь блок', uk: '60 хвилин на весь блок', es: '60 minutos para todo el bloque' },
          {
            icon: 'bookmark-outline',
            ru: 'Можно помечать и пропускать вопросы, затем вернуться, если есть время',
            uk: 'Можна позначати й пропускати питання, потім повернутися, якщо є час',
            es: 'Puedes marcar y saltar preguntas y volver si te da tiempo',
          },
          {
            icon: 'ribbon-outline',
            ru: 'Награда уровня B2 в приложении при успешной сдаче',
            uk: 'Нагорода рівня B2 у застосунку при успішній здачі',
            es: 'Insignia nivel B2 en la app al completar con éxito',
            sub: true as const,
          },
        ].map((item,i)=>(
          <View key={i} style={{flexDirection:'row',alignItems:'flex-start',gap:12,marginBottom:12,backgroundColor:t.bgCard,padding:14,borderRadius:14,borderWidth:0.5,borderColor:t.border}}>
            <Ionicons name={item.icon as any} size={22} color={t.textSecond} style={{marginTop:1}}/>
            <View style={{flex:1}}>
              <Text style={{color:t.textPrimary,fontSize:f.body,flex:1}}>{t3(item.ru, item.uk, item.es)}</Text>
              {'sub' in item && item.sub && (
                <Text style={{color:t.textMuted,fontSize:f.caption,marginTop:3}}>
                  {t3(
                    'диплом в приложении при результате ≥ 80%',
                    'диплом у застосунку за результатом ≥ 80%',
                    'diploma en la app con resultado ≥ 80 %',
                  )}
                </Text>
              )}
            </View>
          </View>
        ))}
        <TouchableOpacity
          style={{backgroundColor:t.bgSurface,borderRadius:16,padding:18,alignItems:'center',marginTop:12,borderWidth:0.5,borderColor:t.border}}
          onPress={() => { void startExam(); }}
          activeOpacity={0.85}
        >
          <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700'}}>
            {t3('Начать тест', 'Почати тест', 'Empezar')}
          </Text>
        </TouchableOpacity>
        {!isUnlimited && (
          <Text style={{color:t.textMuted,fontSize:f.caption,textAlign:'center',marginTop:10}}>
            {t3(
              `${LINGMAN_EXAM_ENERGY} ⚡ списываются за один старт · Premium — без лимита`,
              `${LINGMAN_EXAM_ENERGY} ⚡ знімаються за один старт · Premium — без ліміту`,
              `${LINGMAN_EXAM_ENERGY} ⚡ se descuentan al empezar · Premium — sin límite`,
            )}
          </Text>
        )}
        <Text style={{color:t.textMuted,fontSize:f.caption,textAlign:'center',marginTop:12}}>
          {t3(
            'После начала таймер не останавливается',
            'Після початку таймер не зупиняється',
            'Cuando empiezas, el temporizador no se detiene',
          )}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home' as any)}
          style={{ marginTop: 8, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Text style={{ color: t.textSecond, fontSize: f.sub, textDecorationLine: 'underline' }}>
            {t3('На главную', 'На головну', 'Volver al inicio')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </ScreenGradient>
    <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} minRequired={LINGMAN_EXAM_ENERGY} />
    </>
  );

  // ── REVIEW ────────────────────────────────────────────────────────────────
  if(phase==='review') return(
    <>
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      <View style={{flexDirection:'row',alignItems:'center',padding:15,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <TouchableOpacity
          style={{flexDirection:'row',alignItems:'center',gap:4}}
          onPress={()=>setPhase('quiz')}
        >
          <Ionicons name="chevron-back" size={24} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700',marginLeft:8,flex:1}}>
          {t3('Проверка ответов', 'Перевірка відповідей', 'Revisión de respuestas')}
        </Text>
        <Text style={{color:isLowTime?t.wrong:t.textSecond,fontSize:f.body,fontWeight:'600'}}>
          {formatTime(totalTimeLeft)}
        </Text>
      </View>

      <View style={{flexDirection:'row',gap:8,paddingHorizontal:16,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,flexShrink:1}}>
          <View style={{width:10,height:10,borderRadius:5,backgroundColor:t.correct,flexShrink:0}}/>
          <Text style={{color:t.textSecond,fontSize:f.sub}} numberOfLines={1}>
            {answered} {t3('отв.', 'відп.', 'resp.')}
          </Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,flexShrink:1}}>
          <View style={{width:10,height:10,borderRadius:5,backgroundColor:t.wrong,flexShrink:0}}/>
          <Text style={{color:t.textSecond,fontSize:f.sub}} numberOfLines={1}>
            {questions.length-answered} {t3('без отв.', 'без відп.', 'sin resp.')}
          </Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,flexShrink:1}}>
          <Ionicons name="bookmark" size={12} color="#D4A017"/>
          <Text style={{color:t.textSecond,fontSize:f.sub}} numberOfLines={1}>
            {flagged.filter(Boolean).length} {t3('помеч.', 'позн.', 'marc.')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom:120}}>
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
                width:28, height:28, borderRadius:14, borderWidth:1,
                borderColor: isAnswered ? '#D4A017' : t.wrong,
                backgroundColor: isAnswered ? 'rgba(212,160,23,0.12)' : t.wrongBg,
                justifyContent:'center', alignItems:'center', marginRight:12,
              }}>
                <Text style={{color:isAnswered?'#D4A017':t.wrong,fontSize:f.label,fontWeight:'700'}}>{i+1}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{color:t.textMuted,fontSize:f.label}}>{t3('Урок', 'Урок', 'Lección')} {qItem.lessonNum}</Text>
                <Text style={{color:t.textPrimary,fontSize:f.sub,fontWeight:'500'}} numberOfLines={1}>{examTopicForLang(qItem, lang)}</Text>
              </View>
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                {isFlaggedItem && <Ionicons name="bookmark" size={16} color="#D4A017"/>}
                {isAnswered
                  ? <Ionicons name="checkmark-circle" size={18} color="#D4A017"/>
                  : <Ionicons name="ellipse-outline" size={18} color={t.wrong}/>
                }
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{
        position:'absolute', bottom:0, left:0, right:0,
        backgroundColor:t.bgPrimary, borderTopWidth:0.5, borderTopColor:t.border,
        padding:16, paddingBottom: Math.max(16, insets.bottom + 16),
      }}>
            {answered < questions.length && (
          <Text style={{color:t.wrong,fontSize:f.sub,textAlign:'center',marginBottom:10}}>
            {t3(
              `⚠️ ${questions.length - answered} вопросов без ответа`,
              `⚠️ ${questions.length - answered} питань без відповіді`,
              `⚠️ ${questions.length - answered} preguntas sin respuesta`,
            )}
          </Text>
        )}
        <TouchableOpacity
          style={{backgroundColor:t.bgSurface,borderRadius:14,padding:16,alignItems:'center',borderWidth:0.5,borderColor:t.border}}
          onPress={submitExam}
          activeOpacity={0.85}
        >
          <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700'}}>
            {t3('Сдать экзамен', 'Здати іспит', 'Entregar el examen')}
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
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            <Text style={{ color: t.textMuted, fontSize: f.bodyLg, fontWeight: '600', marginBottom: 18 }}>
              {t3('Приготовься', 'Приготуйся', 'Prepárate')}
            </Text>
            <Animated.Text
              style={{
                color: t.textPrimary,
                fontSize: f.numLg + 10,
                fontWeight: '800',
                transform: [{ scale: countdownAnim }],
              }}
            >
              {countdownNum}
            </Animated.Text>
            <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 18 }}>
              {t3('Старт экзамена...', 'Старт іспиту...', 'Comienza el examen...')}
            </Text>
          </View>
        </SafeAreaView>
      </ScreenGradient>
      <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} minRequired={LINGMAN_EXAM_ENERGY} />
    </>
  );

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const cardLang: ShareCardLang = REPORT_SCREENS_RUSSIAN_ONLY ? 'ru' : bundleLang(lang);
    return (
    <>
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      {/* Скрытые SVG для PNG-экспорта монтируются ТОЛЬКО на момент шеринга:
          раньше они висели в дереве постоянно, что давало ощутимые лаги
          на result-экране (тяжёлый Lingman-серт + QuizShareCardSvg). */}
      {(mountExportExam || mountExportCert) && (
        <View
          pointerEvents="none"
          collapsable={false}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, zIndex: -1, overflow: 'hidden' }}
        >
          {mountExportExam && (
            <QuizShareCardSvg
              ref={examCardSvgRef}
              right={score}
              total={questions.length}
              pct={pct}
              lang={cardLang}
              mode="exam"
              layoutSize={1080}
            />
          )}
          {mountExportCert && certificate && (
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
          )}
        </View>
      )}
      <ScrollView contentContainerStyle={{padding:24,alignItems:'center'}}>
        <View style={{width:100,height:100,borderRadius:50,backgroundColor:t.bgCard,borderWidth:1.5,borderColor:t.border,justifyContent:'center',alignItems:'center',marginTop:20,marginBottom:20}}>
          <Ionicons name="ribbon" size={44} color={t.textSecond}/>
        </View>
        <Text style={{color:t.textPrimary,fontSize:f.numLg,fontWeight:'700',marginBottom:8}}>
          {t3('Блок завершён', 'Блок завершено', 'Bloque terminado')}
        </Text>
        <Text style={{color:t.textMuted,fontSize:f.body,textAlign:'center',lineHeight:22,marginBottom:8,paddingHorizontal:8}}>
          {pct >= 80
            ? t3(
                'Сильный результат по темам курса — закрепляй слабые места в уроках.',
                'Сильний результат за темами курсу — закріплюй слабкі місця в уроках.',
                'Buen resultado por temas: refuerza con lecciones donde fallaste.',
              )
            : pct >= 50
              ? t3(
                  'Средний балл — нормальная точка роста; вернись к «Теории» и «Словарю».',
                  'Середній бал — звичайна точка росту; повернись до «Теорії» й «Словника».',
                  'Resultado intermedio: repasa «Teoría» y «Vocabulario» en los temas marcados.',
                )
              : t3(
                  'Низкий балл не про способности — это сигнал, какие темы разобрать заново.',
                  'Низький бал не про здібності — це сигнал, які теми розібрати знову.',
                  'Un bajo porcentaje no mide «talento»: indica temas para repasar con calma.',
                )}
        </Text>
        <Text style={{color:t.textSecond,fontSize:f.h2,marginBottom:24}}>{score} / {questions.length} — {pct}%</Text>
        <View style={{ marginBottom: 16 }}>
          <XpGainBadge amount={examXp} visible={true} />
        </View>

        <View style={{backgroundColor:t.bgCard,borderRadius:16,padding:20,borderWidth:0.5,borderColor:t.border,width:'100%',marginBottom:16}}>
          <Text style={{color:t.textMuted,fontSize:f.caption,marginBottom:12,textAlign:'center'}}>
            {t3('Результаты по темам', 'Результати по темах', 'Resultados por temas')}
          </Text>
          {questions
            .map((qItem, i) => ({ qItem, i, correct: choices[i] === qItem.correct }))
            .map(({ qItem, i, correct }) => (
            <View key={i} style={{flexDirection:'row',alignItems:'center',paddingVertical:6,borderBottomWidth:i<questions.length-1?0.5:0,borderBottomColor:t.border}}>
              <Ionicons name={correct?'checkmark-circle':'close-circle'} size={16} color={correct?t.correct:t.wrong} style={{marginRight:8}}/>
              <Text style={{color:t.textMuted,fontSize:f.label,marginRight:6,width:26}}>{i + 1}.</Text>
              <Text style={{color:correct?t.textPrimary:t.textSecond,fontSize:f.sub,flex:1}}>{examTopicForLang(qItem, lang)}</Text>
            </View>
          ))}
        </View>

        {certificate && certificate.name?.trim() ? (
          // Имя указано — показываем сам диплом + кнопку шеринга.
          <View style={{backgroundColor:'#0a1620',borderRadius:18,padding:18,borderWidth:1.2,borderColor:'#d4a017',width:'100%',alignItems:'center',marginBottom:16}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12}}>
              <Ionicons name="ribbon" size={22} color="#FFD700"/>
              <Text style={{color:'#FFD700',fontSize:f.bodyLg,fontWeight:'800',letterSpacing:1.2}}>
                PHRASEMAN B2
              </Text>
            </View>
            <View style={{borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:'#d4a017',marginBottom:12}}>
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
              style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#B8860B',borderRadius:12,paddingVertical:12,paddingHorizontal:18,borderWidth:1,borderColor:'#FFD700',width:'100%',marginBottom:8}}
              onPress={() => { void shareCertificate(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={18} color="#FFD700"/>
              <Text style={{color:'#FFD700',fontSize:f.bodyLg,fontWeight:'700'}}>
                {t3('Поделиться наградой', 'Поділитися нагородою', 'Compartir diploma')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{paddingVertical:8}}
              onPress={() => setNameModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={{color:'#FDE68A',fontSize:f.sub,textDecorationLine:'underline'}}>
                {t3('Изменить имя на награде', 'Змінити ім\u02BCя на нагороді', 'Cambiar nombre en el diploma')}
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
            style={{backgroundColor:'#0a1620',borderRadius:18,padding:20,borderWidth:1.2,borderColor:'#d4a017',width:'100%',alignItems:'center',marginBottom:16,gap:10}}
          >
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <Ionicons name="ribbon" size={22} color="#FFD700"/>
              <Text style={{color:'#FFD700',fontSize:f.bodyLg,fontWeight:'800',letterSpacing:1.2}}>
                PHRASEMAN B2
              </Text>
            </View>
            <Text style={{color:'#FDE68A',fontSize:f.body,textAlign:'center',lineHeight:f.body*1.4}}>
              {t3(
                'Укажите имя — и ваш сертификат появится здесь. Без имени награда не показывается.',
                'Вкажіть ім\u02BCя — і ваш сертифікат з\u02BCявиться тут. Без імені нагорода не показується.',
                'Indica tu nombre y aquí aparecerá tu certificado. Sin nombre no mostramos el diploma.',
              )}
            </Text>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#B8860B',borderRadius:12,paddingVertical:12,paddingHorizontal:18,borderWidth:1,borderColor:'#FFD700',width:'100%',marginTop:6}}>
              <Ionicons name="create-outline" size={18} color="#FFD700"/>
              <Text style={{color:'#FFD700',fontSize:f.bodyLg,fontWeight:'700'}}>
                {t3('Указать имя на награде', 'Вказати ім\u02BCя на нагороді', 'Poner nombre en el diploma')}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={{backgroundColor:t.bgCard,borderRadius:14,padding:16,width:'100%',alignItems:'center',borderWidth:0.5,borderColor:t.border,marginBottom:12}}
          onPress={() => { void startExam(); }}
        >
          <Text style={{color:t.textPrimary,fontSize:f.bodyLg,fontWeight:'600'}}>
            {t3('🔄 Попробовать ещё раз', '🔄 Спробувати ще раз', '🔄 Intentar otra vez')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{flexDirection:'row',alignItems:'center',gap:8,padding:12,marginBottom:4}}
          onPress={() => { void shareExamResult(); }}
        >
          <Ionicons name="share-outline" size={18} color={t.textSecond}/>
          <Text style={{color:t.textSecond,fontSize:f.bodyLg}}>
            {t3('Поделиться результатом', 'Поділитися результатом', 'Compartir resultado')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{padding:14}} onPress={()=>router.replace('/(tabs)/home' as any)}>
          <Text style={{color:t.textSecond,fontSize:f.bodyLg,textDecorationLine:'underline'}}>
            {t3('На главную', 'На головну', 'Volver al inicio')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      {/* Скрытый 1500×1080 SVG для экспорта PNG. Раньше висел постоянно и
          рендерил весь сертификат каждый раз, что давало заметный лаг при
          скролле. Теперь монтируется только на момент шеринга. */}
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
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/home' as any);
        }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700',marginLeft:8}}>
          {t3('Моя награда B2', 'Моя нагорода B2', 'Mi diploma B2')}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{padding:20,alignItems:'center'}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
          <Ionicons name="ribbon" size={22} color="#FFD700"/>
          <Text style={{color:'#FFD700',fontSize:f.bodyLg,fontWeight:'800',letterSpacing:1.4}}>
            PHRASEMAN ACADEMY
          </Text>
        </View>
        <Text style={{color:t.textMuted,fontSize:f.sub,textAlign:'center',marginBottom:18}}>
          {`${certificate.score} / ${certificate.total} · ${certificate.pct}% · ${formatCertDate(certificate.completedAt, certificate.lang)}`}
        </Text>
        {certificate.name?.trim() ? (
          <>
            <View style={{borderRadius:14,overflow:'hidden',borderWidth:1.2,borderColor:'#d4a017'}}>
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
              )}
            >
              ID: {certificate.certId}
            </Text>

            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:'#B8860B',borderRadius:14,paddingVertical:16,paddingHorizontal:22,borderWidth:1.2,borderColor:'#FFD700',width:'100%',marginTop:22}}
              onPress={() => { void shareCertificate(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={20} color="#FFD700"/>
              <Text style={{color:'#FFD700',fontSize:f.bodyLg,fontWeight:'800',letterSpacing:0.4}}>
                {t3('Поделиться наградой', 'Поділитися нагородою', 'Compartir diploma')}
              </Text>
            </TouchableOpacity>
            <Text style={{color:t.textMuted,fontSize:f.caption,marginTop:8,textAlign:'center',lineHeight:18}}>
              {t3(
                'PNG 1080×1080 · можно сохранить в галерею или отправить в любой мессенджер',
                'PNG 1080×1080 · можна зберегти в галерею або відправити в будь-який месенджер',
                'PNG 1080×1080 · puedes guardarlo en la galería o enviarlo por cualquier app',
              )}
            </Text>

            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:20,paddingVertical:10}}
              onPress={() => setNameModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={t.textSecond}/>
              <Text style={{color:t.textSecond,fontSize:f.body,textDecorationLine:'underline'}}>
                {t3('Изменить имя на награде', 'Змінити ім\u02BCя на нагороді', 'Cambiar el nombre en el diploma')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          // Сохранённый сертификат без имени (юзер раньше пропустил ввод).
          // Не рендерим SVG: пустая подпись на дипломе выглядит как чужой/
          // незавершённый. Показываем CTA на ввод имени.
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setNameModalVisible(true)}
            style={{borderRadius:14,padding:24,borderWidth:1.2,borderColor:'#d4a017',backgroundColor:'#0a1620',width:'100%',alignItems:'center',gap:14}}
          >
            <Ionicons name="ribbon" size={48} color="#FFD700"/>
            <Text style={{color:'#FFD700',fontSize:f.h2,fontWeight:'800',textAlign:'center',letterSpacing:0.6}}>
              {t3(
                'Награда готова — добавьте имя',
                'Нагорода готова — додайте ім\u02BCя',
                'Tu diploma está listo — añade tu nombre',
              )}
            </Text>
            <Text style={{color:'#FDE68A',fontSize:f.body,textAlign:'center',lineHeight:f.body*1.4}}>
              {t3(
                `Ваш результат: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nУкажите имя — и сертификат появится ниже.`,
                `Ваш результат: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nВкажіть ім\u02BCя — і сертифікат з\u02BCявиться нижче.`,
                `Tu resultado: ${certificate.score} / ${certificate.total} · ${certificate.pct}%.\nIndica tu nombre y el certificado aparecerá abajo.`,
              )}
            </Text>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#B8860B',borderRadius:14,paddingVertical:14,paddingHorizontal:22,borderWidth:1.2,borderColor:'#FFD700',marginTop:6}}>
              <Ionicons name="create-outline" size={18} color="#FFD700"/>
              <Text style={{color:'#FFD700',fontSize:f.bodyLg,fontWeight:'800'}}>
                {t3('Указать имя на награде', 'Вказати ім\u02BCя на нагороді', 'Poner nombre en el diploma')}
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
            )}
          </Text>
        </TouchableOpacity>
        <Text style={{color:t.textMuted,fontSize:f.caption,marginTop:4,textAlign:'center'}}>
          {t3(
            'Новый результат перезапишет награду только если наберёшь ≥ 80%',
            'Новий результат перезапише нагороду тільки якщо набереш ≥ 80%',
            'Un nuevo resultado sustituye el diploma solo si sacas ≥ 80%',
          )}
        </Text>
      </ScrollView>
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
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      {/* Header */}
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:15,paddingBottom:10}}>
        <Text style={{color:t.textSecond,fontSize:f.sub,fontWeight:'500'}}>{idx+1} / {questions.length}</Text>
        <View style={{backgroundColor:t.bgCard,borderRadius:10,paddingHorizontal:10,paddingVertical:4,borderWidth:0.5,borderColor:t.border,flex:1,marginHorizontal:8}}>
          <Text style={{color:t.textSecond,fontSize:f.caption,fontWeight:'600'}} numberOfLines={1} adjustsFontSizeToFit>
            {t3('Урок', 'Урок', 'Lección')} {q.lessonNum} · {examTopicForLang(q, lang)}
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
      <View style={{height:3,backgroundColor:t.border,marginHorizontal:16,borderRadius:2,overflow:'hidden',marginBottom:8}}>
        <View style={{height:'100%',width:`${(answered/questions.length)*100}%` as any,backgroundColor:t.textSecond,borderRadius:2}}/>
      </View>

      <ScrollView
        contentContainerStyle={{paddingHorizontal:20,paddingTop:16,paddingBottom:160}}
        keyboardShouldPersistTaps="handled"
      >
        {q.type === 'choice4' && (
          <Text style={{color:t.textSecond,fontSize:f.label,marginBottom:8,fontWeight:'600'}}>
            🔤 {t3('Какое предложение верное?', 'Яке речення правильне?', '¿Qué frase es correcta?')}
          </Text>
        )}
        {q.type === 'error' && (
          <Text style={{color:t.wrong,fontSize:f.label,marginBottom:8,fontWeight:'600'}}>
            🔍 {t3('Исправь ошибку', 'Виправ помилку', 'Corrige el error')}
          </Text>
        )}
        <Text style={{color:t.textPrimary,fontSize:f.h2+4,fontWeight:'500',lineHeight:32,marginBottom:20}}>{q.q}</Text>

        {(q.opts ?? []).map((opt,ci)=>{
          let bg=t.bgCard, border=t.border, tc=t.textPrimary;
          if(chosen===ci){ bg=t.bgSurface; border=t.textSecond; }
          return(
            <TouchableOpacity key={ci}
              style={{backgroundColor:bg,borderWidth:chosen===ci?2:1,borderColor:border,borderRadius:14,padding:16,marginBottom:10}}
              onPress={()=>handleAnswer(ci)}
              activeOpacity={0.8}
            >
              <Text style={{color:tc,fontSize:f.body,fontWeight:'500'}}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ReportErrorButton
        screen="exam"
        dataId={`exam_lesson_${q.lessonNum}_q${idx}`}
        dataText={[
          `Q: ${q.q}`,
          `Варианты: ${(q.opts ?? []).map((o,i)=>i===q.correct?`[✓${o}]`:o).join(' | ')}`,
        ].join('\n')}
        style={{ alignSelf: 'flex-end', paddingHorizontal: 16, marginBottom: 4 }}
      />

      {/* Bottom navigation — 2 rows, safe area aware */}
      <View style={{
        position:'absolute', bottom:0, left:0, right:0,
        backgroundColor:t.bgPrimary, borderTopWidth:0.5, borderTopColor:t.border,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingHorizontal:12, paddingTop:10, gap:8,
      }}>
        {/* Row 1: Skip / Next (primary actions) */}
        <View style={{ flexDirection:'row', gap:8 }}>
          {chosen === null ? (
            <TouchableOpacity
              style={{
                flex:1, height:52, borderRadius:14, borderWidth:1, borderColor:t.border,
                backgroundColor:t.bgCard, justifyContent:'center', alignItems:'center',
              }}
              onPress={skipToNext}
            >
              <Text style={{color:t.textSecond, fontSize:f.body, fontWeight:'600'}}>
                {t3('Пропустить →', 'Пропустити →', 'Omitir →')}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={{
              flex:1, height:52, borderRadius:14, borderWidth:1,
              borderColor: chosen!==null ? t.textSecond : t.border,
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
                ? t3('Проверить →', 'Перевірити →', 'Revisar →')
                : t3('Далее →', 'Далі →', 'Siguiente →')
              }
            </Text>
          </TouchableOpacity>
        </View>
        {/* Row 2: Prev / Flag / Review */}
        <View style={{ flexDirection:'row', gap:8 }}>
          <TouchableOpacity
            style={{
              flex:1, height:44, borderRadius:12, borderWidth:1, borderColor:t.border,
              backgroundColor:t.bgCard, justifyContent:'center', alignItems:'center',
              opacity: idx===0 ? 0.35 : 1,
            }}
            onPress={goPrev}
            disabled={idx===0}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary}/>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex:1, height:44, borderRadius:12, borderWidth:1,
              borderColor: isFlagged ? '#D4A017' : t.border,
              backgroundColor: isFlagged ? 'rgba(212,160,23,0.12)' : t.bgCard,
              justifyContent:'center', alignItems:'center',
            }}
            onPress={toggleFlag}
          >
            <Ionicons name={isFlagged?'bookmark':'bookmark-outline'} size={20} color={isFlagged?'#D4A017':t.textSecond}/>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex:1, height:44, borderRadius:12, borderWidth:1, borderColor:t.border,
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
