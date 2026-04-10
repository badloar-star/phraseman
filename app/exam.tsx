import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ScrollView, Share,
    Text, TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { registerXP } from './xp_manager';
import { checkAchievements } from './achievements';
import { DEV_MODE, STORE_URL } from './config';
import { shuffle } from './utils_shuffle';
import { isLingmanExamAvailable } from './lesson_lock_system';

const TOTAL_EXAM_SECONDS = 60 * 60; // 60 minutes total

type ExamQType = 'fill' | 'choice4' | 'error';
interface ExamQuestion {
  lessonNum: number;
  topic:   string;   // RU topic name
  topicUK: string;   // UK topic name
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
  {lessonNum:16, topic:'Фразовые глаголы',      topicUK:'Фразові дієслова',        q:'Could you ___ the TV?',             opts:['turn off','turn down','put off','turn in'],                                      correct:0},
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
  {lessonNum:18, topic:'Повелительное наклонение', topicUK:'Наказовий спосіб',    q:"Correct: [Please not be] late.",    opts:["Don't be","Please not be","Please are not","Please is not"],                     correct:0, type:'error'},
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
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:'There is ___ in the room.',      opts:['somebody','anybody','nobody','everybody'],                                        correct:0},
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:'Is there ___ here?',             opts:['someone','anyone','no one','everyone'],                                          correct:1},
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:"I don't have ___ money.",        opts:['some','any','no','every'],                                                       correct:1},
  {lessonNum:21, topic:'Неопределённые местоимения', topicUK:'Неозначені займенники', q:'Which sentence is correct?',     opts:["I have any money.","She needs some help.","Is there somebody here? (neutral context)", "He doesn't want anything."], correct:3, type:'choice4'},
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
  {lessonNum:31, topic:'Complex Object',         topicUK:'Complex Object',           q:'I heard her ___ a song.',           opts:['sing','singing','to sing','sang'],                                               correct:1},
  {lessonNum:31, topic:'Complex Object',         topicUK:'Complex Object',           q:'Which sentence is correct?',        opts:['I want you doing this.','She expects him arrive.','He wants me to help.','I saw him to run.'], correct:2, type:'choice4'},
  {lessonNum:31, topic:'Complex Object',         topicUK:'Complex Object',           q:'Correct: I want you [doing] this.', opts:['to do','doing','do','done'],                                                    correct:0, type:'error'},
  // ── LESSON 32: Review ─────────────────────────────────────────────────────
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'She ___ not have come so early.',   opts:['should','shall','would','will'],                                                 correct:0},
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'By the time she arrived, he ___ left.', opts:['left','has left','had left','was leaving'],                                correct:2},
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'If you had come, you ___ her.',     opts:['meet','met','would have met','had met'],                                         correct:2},
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'Which sentence is correct?',        opts:['She has never went there.','He have been working hard.','They have already arrived.','I has just eaten.'], correct:2, type:'choice4'},
  {lessonNum:32, topic:'Повторение всех тем',    topicUK:'Повторення всіх тем',      q:'Correct: She [have] worked here for years.', opts:['has','have','had','is'],                                             correct:0, type:'error'},
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

type Phase = 'locked'|'intro'|'quiz'|'review'|'result';

export default function ExamScreen() {
  const router = useRouter();
  const {theme:t, f } = useTheme();
  const {lang} = useLang();
  const insets = useSafeAreaInsets();
  const isUK = lang==='uk';

  const [phase, setPhase]           = useState<Phase>('intro');
  const [lessonsCompleted, setCompleted] = useState(0);
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
    if (!isUK) return result;
    return result.map(q => ({ ...q, topic: q.topicUK || q.topic }));
  }, [isUK]);
  const [idx, setIdx]               = useState(0);
  const [choices, setChoices]       = useState<(number|null)[]>(() => Array(questions.length).fill(null));
  const [flagged, setFlagged]       = useState<boolean[]>(() => Array(questions.length).fill(false));
  const [totalTimeLeft, setTotalTimeLeft] = useState(TOTAL_EXAM_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

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

  const startExam = () => {
    setIdx(0);
    setChoices(Array(questions.length).fill(null));
    setFlagged(Array(questions.length).fill(false));
    setTotalTimeLeft(TOTAL_EXAM_SECONDS);
    setPhase('quiz');
  };

  const submitExam = async () => {
    const s = choices.filter((c, i) => c !== null && c === questions[i].correct).length;
    const p = questions.length > 0 ? Math.round(s / questions.length * 100) : 0;
    // XP: 50 за сдачу, до +50 бонус за %
    const xp = 50 + Math.round(p / 2);
    checkAchievements({ type: 'exam', pct: p }).catch(() => {});
    try {
      const nameRaw = await AsyncStorage.getItem('user_name');
      if (nameRaw) {
        await registerXP(xp, 'exam_complete', nameRaw, lang as 'ru'|'uk');
      }
    } catch {}
    setPhase('result');
  };

  const score = choices.filter((c,i) => c !== null && c === questions[i].correct).length;
  const answered = choices.filter(c => c !== null).length;
  const pct = questions.length>0?Math.round(score/questions.length*100):0;
  const q = questions[idx]||questions[0];
  const chosen = choices[idx];
  const isFlagged = flagged[idx];
  const isLowTime = totalTimeLeft < 5 * 60; // < 5 min

  // ── LOCKED ────────────────────────────────────────────────────────────────
  if(phase==='locked') return(
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      <View style={{flexDirection:'row',alignItems:'center',padding:15,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <TouchableOpacity onPress={()=>router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700',marginLeft:8}}>
          {isUK ? 'Іспит' : 'Экзамен'}
        </Text>
      </View>
      <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:30}}>
        <ProgressRing progress={lessonsCompleted/32} size={90} color={t.correct} bg={t.border}/>
        <Text style={{color:t.textPrimary,fontSize:f.h1,fontWeight:'700',textAlign:'center',marginTop:24,marginBottom:12}}>
          {isUK ? 'Іспит недоступний' : 'Экзамен недоступен'}
        </Text>
        <Text style={{color:t.textMuted,fontSize:f.body,textAlign:'center',lineHeight:24}}>
          {isUK
            ? 'Пройди всі 32 уроки з оцінкою 5.0 та склади всі 4 заліки щоб отримати сертифікат Професора Лінгмана.'
            : 'Пройди все 32 урока с оценкой 5.0 и сдай все 4 зачёта, чтобы получить сертификат Профессора Лингмана.'}
        </Text>
        <View style={{backgroundColor:t.bgCard,borderRadius:16,padding:16,borderWidth:0.5,borderColor:t.border,width:'100%',marginTop:28}}>
          <View style={{height:8,backgroundColor:t.border,borderRadius:4,overflow:'hidden'}}>
            <View style={{height:'100%',width:`${lessonsCompleted/32*100}%` as any,backgroundColor:t.textSecond,borderRadius:4}}/>
          </View>
          <Text style={{color:t.textMuted,fontSize:f.caption,marginTop:8,textAlign:'center'}}>
            {lessonsCompleted} {isUK ? 'з 32 уроків завершено' : 'из 32 уроков завершено'}
          </Text>
        </View>
        <TouchableOpacity style={{marginTop:24}} onPress={()=>router.back()}>
          <Text style={{color:t.textSecond,fontSize:f.bodyLg,textDecorationLine:'underline'}}>
            {isUK ? 'Перейти до уроків →' : 'Перейти к урокам →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </ScreenGradient>
  );

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if(phase==='intro') return(
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      <View style={{flexDirection:'row',alignItems:'center',padding:15,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <TouchableOpacity onPress={()=>router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700',marginLeft:8}}>
          {isUK ? 'Іспит Професора' : 'Экзамен Профессора'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{padding:20}}>
        <View style={{alignItems:'center',marginBottom:24}}>
          <View style={{width:90,height:90,borderRadius:45,backgroundColor:t.bgCard,borderWidth:1.5,borderColor:t.border,justifyContent:'center',alignItems:'center',marginBottom:16}}>
            <Ionicons name="ribbon-outline" size={40} color={t.textSecond}/>
          </View>
          <Text style={{color:t.textPrimary,fontSize:f.numMd+6,fontWeight:'700',textAlign:'center'}}>
            {isUK ? 'Фінальний іспит' : 'Финальный экзамен'}
          </Text>
          <Text style={{color:t.textMuted,fontSize:f.body,textAlign:'center',marginTop:8,lineHeight:22}}>
            {isUK ? '50 питань по кожній пройденій темі' : '50 вопросов по каждой пройденной теме'}
          </Text>
        </View>
        {[
          {icon:'timer-outline',    ru:'60 минут на весь экзамен',                                                            uk:'60 хвилин на весь іспит'},
          {icon:'bookmark-outline', ru:'Можно отмечать и пропускать вопросы и возвращаться к ним позже если есть время',      uk:'Можна позначати та пропускати питання і повертатися до них пізніше якщо є час'},
          {icon:'ribbon-outline',   ru:'Сертификат Профессора Лингмана',                                                      uk:'Сертифікат Професора Лінгмана',  sub: true},
        ].map((item,i)=>(
          <View key={i} style={{flexDirection:'row',alignItems:'flex-start',gap:12,marginBottom:12,backgroundColor:t.bgCard,padding:14,borderRadius:14,borderWidth:0.5,borderColor:t.border}}>
            <Ionicons name={item.icon as any} size={22} color={t.textSecond} style={{marginTop:1}}/>
            <View style={{flex:1}}>
              <Text style={{color:t.textPrimary,fontSize:f.body,flex:1}}>{isUK?item.uk:item.ru}</Text>
              {(item as any).sub && (
                <Text style={{color:t.textMuted,fontSize:f.caption,marginTop:3}}>
                  {isUK ? 'тимчасово недоступно (бета тест)' : 'временно недоступно (бета тест)'}
                </Text>
              )}
            </View>
          </View>
        ))}
        <TouchableOpacity
          style={{backgroundColor:t.bgSurface,borderRadius:16,padding:18,alignItems:'center',marginTop:12,borderWidth:0.5,borderColor:t.border}}
          onPress={startExam}
          activeOpacity={0.85}
        >
          <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700'}}>
            {isUK ? 'Почати іспит' : 'Начать экзамен'}
          </Text>
        </TouchableOpacity>
        <Text style={{color:t.textMuted,fontSize:f.caption,textAlign:'center',marginTop:12}}>
          {isUK ? 'Після початку таймер не зупиняється' : 'После начала таймер не останавливается'}
        </Text>
      </ScrollView>
    </SafeAreaView>
    </ScreenGradient>
  );

  // ── REVIEW ────────────────────────────────────────────────────────────────
  if(phase==='review') return(
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
          {isUK ? 'Перевірка відповідей' : 'Проверка ответов'}
        </Text>
        <Text style={{color:isLowTime?t.wrong:t.textSecond,fontSize:f.body,fontWeight:'600'}}>
          {formatTime(totalTimeLeft)}
        </Text>
      </View>

      <View style={{flexDirection:'row',gap:8,paddingHorizontal:16,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,flexShrink:1}}>
          <View style={{width:10,height:10,borderRadius:5,backgroundColor:t.correct,flexShrink:0}}/>
          <Text style={{color:t.textSecond,fontSize:f.sub}} numberOfLines={1}>
            {answered} {isUK?'відп.':'отв.'}
          </Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,flexShrink:1}}>
          <View style={{width:10,height:10,borderRadius:5,backgroundColor:t.wrong,flexShrink:0}}/>
          <Text style={{color:t.textSecond,fontSize:f.sub}} numberOfLines={1}>
            {questions.length-answered} {isUK?'без відп.':'без отв.'}
          </Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,flexShrink:1}}>
          <Ionicons name="bookmark" size={12} color="#D4A017"/>
          <Text style={{color:t.textSecond,fontSize:f.sub}} numberOfLines={1}>
            {flagged.filter(Boolean).length} {isUK?'позн.':'помеч.'}
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
                <Text style={{color:t.textMuted,fontSize:f.label}}>{isUK?'Урок':'Урок'} {qItem.lessonNum}</Text>
                <Text style={{color:t.textPrimary,fontSize:f.sub,fontWeight:'500'}} numberOfLines={1}>{qItem.topic}</Text>
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
        padding:16,
      }}>
        {answered < questions.length && (
          <Text style={{color:t.wrong,fontSize:f.sub,textAlign:'center',marginBottom:10}}>
            {isUK
              ? `⚠️ ${questions.length-answered} питань без відповіді`
              : `⚠️ ${questions.length-answered} вопросов без ответа`}
          </Text>
        )}
        <TouchableOpacity
          style={{backgroundColor:t.bgSurface,borderRadius:14,padding:16,alignItems:'center',borderWidth:0.5,borderColor:t.border}}
          onPress={submitExam}
          activeOpacity={0.85}
        >
          <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700'}}>
            {isUK ? 'Здати іспит' : 'Сдать экзамен'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </ScreenGradient>
  );

  // ── RESULT ────────────────────────────────────────────────────────────────
  if(phase==='result') return(
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      <ScrollView contentContainerStyle={{padding:24,alignItems:'center'}}>
        <View style={{width:100,height:100,borderRadius:50,backgroundColor:t.bgCard,borderWidth:1.5,borderColor:t.border,justifyContent:'center',alignItems:'center',marginTop:20,marginBottom:20}}>
          <Ionicons name="ribbon" size={44} color={t.textSecond}/>
        </View>
        <Text style={{color:t.textPrimary,fontSize:f.numLg,fontWeight:'700',marginBottom:8}}>
          {isUK ? 'Іспит завершено!' : 'Экзамен завершён!'}
        </Text>
        <Text style={{color:t.textSecond,fontSize:f.h2,marginBottom:24}}>{score} / {questions.length} — {pct}%</Text>

        <View style={{backgroundColor:t.bgCard,borderRadius:16,padding:20,borderWidth:0.5,borderColor:t.border,width:'100%',marginBottom:16}}>
          <Text style={{color:t.textMuted,fontSize:f.caption,marginBottom:12,textAlign:'center'}}>
            {isUK ? 'Результати по темах' : 'Результаты по темам'}
          </Text>
          {questions
            .map((qItem, i) => ({ qItem, i, correct: choices[i] === qItem.correct }))
            .map(({ qItem, i, correct }) => (
            <View key={i} style={{flexDirection:'row',alignItems:'center',paddingVertical:6,borderBottomWidth:i<questions.length-1?0.5:0,borderBottomColor:t.border}}>
              <Ionicons name={correct?'checkmark-circle':'close-circle'} size={16} color={correct?t.correct:t.wrong} style={{marginRight:8}}/>
              <Text style={{color:t.textMuted,fontSize:f.label,marginRight:6,width:26}}>{i + 1}.</Text>
              <Text style={{color:correct?t.textPrimary:t.textSecond,fontSize:f.sub,flex:1}}>{qItem.topic}</Text>
            </View>
          ))}
        </View>

        {pct>=80&&(
          <View style={{backgroundColor:t.bgCard,borderRadius:16,padding:20,borderWidth:1,borderColor:t.textSecond,width:'100%',alignItems:'center',marginBottom:16}}>
            <Ionicons name="ribbon" size={32} color={t.textSecond}/>
            <Text style={{color:t.textPrimary,fontSize:f.bodyLg,fontWeight:'700',marginTop:8}}>
              {isUK ? 'Сертифікат Професора Лінгмана' : 'Сертификат Профессора Лингмана'}
            </Text>
            <Text style={{color:t.textMuted,fontSize:f.sub,textAlign:'center',marginTop:6}}>
              {isUK ? 'Завантаження буде доступне незабаром' : 'Скачивание будет доступно в следующем обновлении'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={{backgroundColor:t.bgCard,borderRadius:14,padding:16,width:'100%',alignItems:'center',borderWidth:0.5,borderColor:t.border,marginBottom:12}}
          onPress={startExam}
        >
          <Text style={{color:t.textPrimary,fontSize:f.bodyLg,fontWeight:'600'}}>
            {isUK ? '🔄 Спробувати ще раз' : '🔄 Попробовать ещё раз'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{flexDirection:'row',alignItems:'center',gap:8,padding:12,marginBottom:4}}
          onPress={async () => {
            const msg = isUK
              ? `Склав іспит у Phraseman — ${score}/${questions.length} (${pct}%) 🎓\n${STORE_URL}`
              : `Сдал экзамен в Phraseman — ${score}/${questions.length} (${pct}%) 🎓\n${STORE_URL}`;
            try { await Share.share({ message: msg }); } catch {}
          }}
        >
          <Ionicons name="share-outline" size={18} color={t.textSecond}/>
          <Text style={{color:t.textSecond,fontSize:f.bodyLg}}>
            {isUK ? 'Поділитися результатом' : 'Поделиться результатом'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{padding:14}} onPress={()=>router.back()}>
          <Text style={{color:t.textSecond,fontSize:f.bodyLg}}>
            {isUK ? 'На головну' : 'На главную'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </ScreenGradient>
  );

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  return(
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      {/* Header */}
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:15,paddingBottom:10}}>
        <Text style={{color:t.textSecond,fontSize:f.sub,fontWeight:'500'}}>{idx+1} / {questions.length}</Text>
        <View style={{backgroundColor:t.bgCard,borderRadius:10,paddingHorizontal:10,paddingVertical:4,borderWidth:0.5,borderColor:t.border,flex:1,marginHorizontal:8}}>
          <Text style={{color:t.textSecond,fontSize:f.caption,fontWeight:'600'}} numberOfLines={1} adjustsFontSizeToFit>
            {isUK?'Урок':'Урок'} {q.lessonNum} · {q.topic}
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
            🔤 {isUK ? 'Яке речення правильне?' : 'Какое предложение верное?'}
          </Text>
        )}
        {q.type === 'error' && (
          <Text style={{color:t.wrong,fontSize:f.label,marginBottom:8,fontWeight:'600'}}>
            🔍 {isUK ? 'Виправ помилку' : 'Исправь ошибку'}
          </Text>
        )}
        <Text style={{color:t.textPrimary,fontSize:f.h2+4,fontWeight:'500',lineHeight:32,marginBottom:20}}>{q.q}</Text>

        {q.opts.map((opt,ci)=>{
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
                {isUK ? 'Пропустити →' : 'Пропустить →'}
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
                ? (isUK ? 'Перевірити →' : 'Проверить →')
                : (isUK ? 'Далі →' : 'Далее →')
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
  );
}
