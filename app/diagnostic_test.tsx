import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView, Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { checkAchievements } from './achievements';
import { loadSettings } from './settings_edu';
import { shuffle } from './utils_shuffle';
import { isCorrectAnswer } from '../constants/contractions';
import { registerXP } from './xp_manager';

const TIMER_SEC = 30;

type QType = 'fill' | 'build' | 'choice4' | 'type' | 'match';

interface Question {
  phrase:  string;
  hintRU:  string;
  hintUK:  string;
  opts:    string[];
  optsUK?: string[];
  correct: number;
  level:   'A1'|'A2'|'B1'|'B2'|'C1';
  type?:   QType;
  words?:  string[];
  answer?: string;
}

const POOL: Question[] = [
  // ── A1: To Be ────────────────────────────────────────────────────────────
  {phrase:'She ___ a teacher.',            hintRU:'Она ___ учитель.',            hintUK:'Вона ___ вчитель.',         opts:['am','is','are','be'],                  correct:1, level:'A1'},
  {phrase:'We ___ at home.',               hintRU:'Мы ___ дома.',                hintUK:'Ми ___ вдома.',             opts:['is','am','are','be'],                  correct:2, level:'A1'},
  {phrase:'I ___ not tired.',              hintRU:'Я ___ не устал.',              hintUK:'Я ___ не втомився.',        opts:['is','am','are','be'],                  correct:1, level:'A1'},
  {phrase:'This ___ a cat.',               hintRU:'Это ___ кошка.',               hintUK:'Це ___ кішка.',             opts:['am','are','is','be'],                  correct:2, level:'A1'},
  {phrase:'They ___ students.',            hintRU:'Они ___ студенты.',            hintUK:'Вони ___ студенти.',        opts:['is','am','are','be'],                  correct:2, level:'A1'},
  {phrase:'Who ___ you?',                  hintRU:'Кто ___ ты?',                 hintUK:'Хто ___ ти?',               opts:['am','is','are','be'],                  correct:2, level:'A1'},
  {phrase:'He ___ not a doctor.',          hintRU:'Он ___ не врач.',              hintUK:'Він ___ не лікар.',         opts:['am','is','are','be'],                  correct:1, level:'A1'},
  {phrase:'We ___ not at home.',           hintRU:'Мы ___ не дома.',              hintUK:'Ми ___ не вдома.',          opts:['is','am','are','be'],                  correct:2, level:'A1'},
  // A1: Articles
  {phrase:'I am ___ engineer.',            hintRU:'Я ___ инженер.',               hintUK:'Я ___ інженер.',            opts:['a','an','the','—'],                    correct:1, level:'A1'},
  {phrase:'She is ___ teacher.',           hintRU:'Она ___ учитель.',             hintUK:'Вона ___ вчитель.',         opts:['a','an','the','—'],                    correct:0, level:'A1'},
  {phrase:'He loves ___ sun.',             hintRU:'Он любит ___ солнце.',         hintUK:'Він любить ___ сонце.',     opts:['a','an','the','—'],                    correct:2, level:'A1'},
  {phrase:'___ apple a day keeps doctors away.',hintRU:'___ яблоко в день...',    hintUK:'___ яблуко на день...',     opts:['A','An','The','—'],                    correct:1, level:'A1'},
  // A1: Basic pronouns & possessives
  {phrase:'___ name is Anna.',             hintRU:'___ имя — Анна.',              hintUK:'___ ім\'я — Анна.',          opts:['Her','She','His','Him'],               correct:0, level:'A1'},
  {phrase:'This is ___ book.',             hintRU:'Это ___ книга.',               hintUK:'Це ___ книга.',             opts:['my','me','I','mine'],                  correct:0, level:'A1'},
  {phrase:'___ are ready.',                hintRU:'___ готовы.',                  hintUK:'___ готові.',               opts:['We','Our','Us','Ours'],                correct:0, level:'A1'},
  // A1: Match — English→translation
  {phrase:'What does "book" mean?',        hintRU:'Что значит «book»?',           hintUK:'Що значить «book»?',        opts:['книга','дом','стол','стул'],           optsUK:['книга','дім','стіл','стілець'],          correct:0, level:'A1', type:'match'},
  {phrase:'What does "water" mean?',       hintRU:'Что значит «water»?',          hintUK:'Що значить «water»?',       opts:['огонь','вода','земля','воздух'],       optsUK:['вогонь','вода','земля','повітря'],       correct:1, level:'A1', type:'match'},
  {phrase:'What does "friend" mean?',      hintRU:'Что значит «friend»?',         hintUK:'Що значить «friend»?',      opts:['враг','коллега','друг','учитель'],     optsUK:['ворог','колега','друг','вчитель'],       correct:2, level:'A1', type:'match'},
  {phrase:'What does "happy" mean?',       hintRU:'Что значит «happy»?',          hintUK:'Що значить «happy»?',       opts:['грустный','злой','усталый','счастливый'],optsUK:['сумний','злий','втомлений','щасливий'],correct:3, level:'A1', type:'match'},
  {phrase:'What does "small" mean?',       hintRU:'Что значит «small»?',          hintUK:'Що значить «small»?',       opts:['большой','средний','старый','маленький'],optsUK:['великий','середній','старий','маленький'],correct:3, level:'A1', type:'match'},

  // ── A2: Present Simple ────────────────────────────────────────────────────
  {phrase:'She ___ every day.',            hintRU:'Она ___ каждый день.',         hintUK:'Вона ___ щодня.',           opts:['work','works','worked','working'],      correct:1, level:'A2'},
  {phrase:'They ___ not understand.',      hintRU:'Они ___ не понимают.',         hintUK:'Вони ___ не розуміють.',    opts:['does','do','did','doing'],             correct:1, level:'A2'},
  {phrase:'He ___ football.',              hintRU:'Он ___ в футбол.',             hintUK:'Він ___ у футбол.',         opts:['play','plays','played','playing'],      correct:1, level:'A2'},
  {phrase:'I ___ to school.',              hintRU:'Я ___ в школу.',               hintUK:'Я ___ до школи.',           opts:['go','goes','went','going'],             correct:0, level:'A2'},
  {phrase:'She ___ English.',              hintRU:'Она ___ по-английски.',        hintUK:'Вона ___ англійською.',     opts:['speak','speaks','spoke','speaking'],    correct:1, level:'A2'},
  {phrase:'We ___ not know.',              hintRU:'Мы ___ не знаем.',             hintUK:'Ми ___ не знаємо.',         opts:['does','do','did','doing'],             correct:1, level:'A2'},
  {phrase:'He ___ not smoke.',             hintRU:'Он ___ не курит.',             hintUK:'Він ___ не курить.',        opts:['do','does','did','doing'],             correct:1, level:'A2'},
  {phrase:'They ___ in London.',           hintRU:'Они ___ в Лондоне.',           hintUK:'Вони ___ у Лондоні.',       opts:['live','lives','lived','living'],        correct:0, level:'A2'},
  // A2: Have/Has
  {phrase:'She ___ a new car.',            hintRU:'У неё ___ новая машина.',      hintUK:'У неї ___ нова машина.',    opts:['have','has','had','having'],           correct:1, level:'A2'},
  {phrase:'I ___ two brothers.',           hintRU:'У меня ___ два брата.',        hintUK:'У мене ___ два брати.',     opts:['have','has','had','having'],           correct:0, level:'A2'},
  // A2: There is/are
  {phrase:'There ___ a book on the table.',hintRU:'___ книга на столе.',          hintUK:'___ книга на столі.',       opts:['are','am','is','be'],                  correct:2, level:'A2'},
  {phrase:'There ___ many people here.',   hintRU:'___ много людей здесь.',       hintUK:'___ багато людей тут.',     opts:['is','am','are','be'],                  correct:2, level:'A2'},
  // A2: Past simple regular
  {phrase:'She ___ the letter yesterday.', hintRU:'Она ___ письмо вчера.',        hintUK:'Вона ___ листа вчора.',     opts:['sends','sent','send','sending'],       correct:1, level:'A2'},
  {phrase:'They ___ football last week.',  hintRU:'Они ___ в футбол на прошлой неделе.',hintUK:'Вони ___ у футбол минулого тижня.',opts:['play','plays','played','playing'],correct:2, level:'A2'},
  {phrase:'I ___ him yesterday.',          hintRU:'Я ___ ему вчера.',             hintUK:'Я ___ йому вчора.',         opts:['call','calls','called','calling'],      correct:2, level:'A2'},
  // A2: Prepositions
  {phrase:"I wake up ___ 7 o'clock.",      hintRU:'Я просыпаюсь ___ 7 часов.',    hintUK:'Я прокидаюсь ___ 7 годині.',opts:['in','on','at','by'],                  correct:2, level:'A2'},
  {phrase:'She was born ___ Monday.',      hintRU:'Она родилась ___ понедельник.',hintUK:'Вона народилася ___ понеділок.',opts:['in','on','at','by'],               correct:1, level:'A2'},
  {phrase:'He lives ___ London.',          hintRU:'Он живёт ___ Лондоне.',        hintUK:'Він живе ___ Лондоні.',     opts:['in','on','at','by'],                  correct:0, level:'A2'},
  // A2: Future (will/going to)
  {phrase:'She ___ come tomorrow.',        hintRU:'Она ___ прийти завтра.',       hintUK:'Вона ___ прийти завтра.',   opts:['will','would','shall','is'],           correct:0, level:'A2'},
  {phrase:'I ___ going to study tonight.', hintRU:'Я ___ учиться сегодня.',       hintUK:'Я ___ вчитися сьогодні.',   opts:['am','is','are','be'],                  correct:0, level:'A2'},
  {phrase:'It ___ rain tomorrow.',         hintRU:'Завтра ___ дождь.',            hintUK:'Завтра ___ дощ.',           opts:['will','would','is going to','shall'],  correct:0, level:'A2'},
  // A2: Match vocabulary
  {phrase:'What does "tired" mean?',       hintRU:'Что значит «tired»?',          hintUK:'Що значить «tired»?',       opts:['голодный','радостный','усталый','злой'],   optsUK:['голодний','радісний','втомлений','злий'],   correct:2, level:'A2', type:'match'},
  {phrase:'What does "quickly" mean?',     hintRU:'Что значит «quickly»?',        hintUK:'Що значить «quickly»?',     opts:['медленно','громко','тихо','быстро'],        optsUK:['повільно','гучно','тихо','швидко'],         correct:3, level:'A2', type:'match'},
  {phrase:'What does "buy" mean?',         hintRU:'Что значит «buy»?',            hintUK:'Що значить «buy»?',         opts:['продавать','находить','покупать','терять'], optsUK:['продавати','знаходити','купувати','втрачати'],correct:2, level:'A2', type:'match'},
  {phrase:'What does "always" mean?',      hintRU:'Что значит «always»?',         hintUK:'Що значить «always»?',      opts:['никогда','иногда','редко','всегда'],        optsUK:['ніколи','іноді','рідко','завжди'],          correct:3, level:'A2', type:'match'},

  // ── B1: Past Simple ───────────────────────────────────────────────────────
  {phrase:'She did not ___.',              hintRU:'Она не ___.',                  hintUK:'Вона не ___.',              opts:['tell','told','tells','telling'],       correct:0, level:'B1'},
  {phrase:'We ___ speak tomorrow.',        hintRU:'Мы ___ говорить завтра.',      hintUK:'Ми ___ говорити завтра.',   opts:['will','would','shall','should'],       correct:0, level:'B1'},
  {phrase:'She ___ when I called.',        hintRU:'Она ___ когда я позвонил.',    hintUK:'Вона ___, коли я зателефонував.',opts:['sleep','slept','was sleeping','had slept'],correct:2,level:'B1'},
  {phrase:'He ___ to London last year.',   hintRU:'Он ___ в Лондон в прошлом году.',hintUK:'Він ___ до Лондона минулого року.',opts:['go','goes','went','gone'],   correct:2, level:'B1'},
  {phrase:'I ___ not see her last night.', hintRU:'Я ___ не видел её вчера.',     hintUK:'Я ___ не бачив її вчора.',  opts:['do','did','does','doing'],             correct:1, level:'B1'},
  {phrase:'They ___ a lot of money.',      hintRU:'Они ___ много денег.',         hintUK:'Вони ___ багато грошей.',   opts:['spend','spends','spent','spending'],   correct:2, level:'B1'},
  {phrase:'She ___ the book last week.',   hintRU:'Она ___ книгу на прошлой неделе.',hintUK:'Вона ___ книгу минулого тижня.',opts:['read','reads','has read','readed'],correct:0, level:'B1'},
  // B1: Present Perfect
  {phrase:'They ___ already left.',        hintRU:'Они ___ уже ушли.',            hintUK:'Вони ___ вже пішли.',       opts:['have','has','had','did'],              correct:0, level:'B1'},
  {phrase:"I ___ never been to Paris.",    hintRU:'Я ___ никогда не был в Париже.',hintUK:'Я ___ ніколи не був у Парижі.',opts:['have','has','had','was'],          correct:0, level:'B1'},
  {phrase:'She ___ just finished.',        hintRU:'Она ___ только что закончила.', hintUK:'Вона ___ щойно закінчила.',opts:['have','has','had','is'],               correct:1, level:'B1'},
  {phrase:'Have you ever ___ sushi?',      hintRU:'Ты когда-нибудь ___ суши?',    hintUK:'Ти коли-небудь ___ суші?',  opts:['eat','ate','eating','eaten'],          correct:3, level:'B1'},
  // B1: Passive Voice
  {phrase:'The book ___ written by him.',  hintRU:'Книга ___ написана им.',       hintUK:'Книга ___ написана ним.',   opts:['was','were','is','be'],                correct:0, level:'B1'},
  {phrase:'The letter ___ sent yesterday.',hintRU:'Письмо ___ отправлено вчера.', hintUK:'Лист ___ надіслано вчора.', opts:['was','were','is','been'],              correct:0, level:'B1'},
  {phrase:'Cars ___ made in factories.',   hintRU:'Машины ___ делают на заводах.',hintUK:'Машини ___ роблять на заводах.',opts:['is','am','are','were'],            correct:2, level:'B1'},
  // B1: Modal verbs
  {phrase:'You ___ wear a seatbelt.',      hintRU:'Ты ___ пристегнуться.',        hintUK:'Ти ___ пристебнутися.',     opts:['can','should','would','might'],        correct:1, level:'B1'},
  {phrase:'She ___ speak three languages.',hintRU:'Она ___ говорить на трёх языках.',hintUK:'Вона ___ говорити трьома мовами.',opts:['should','must','can','shall'],correct:2, level:'B1'},
  {phrase:'You ___ eat less sugar.',       hintRU:'Тебе ___ есть меньше сахара.', hintUK:'Тобі ___ їсти менше цукру.', opts:['can','could','should','would'],       correct:2, level:'B1'},
  {phrase:'If I knew, I ___ say.',         hintRU:'Если бы я знал, я бы ___.',    hintUK:'Якби я знав, я б ___.',     opts:['say','said','would say','will say'],   correct:2, level:'B1'},
  {phrase:'She ___ wait for you.',         hintRU:'Она ___ ждать тебя.',          hintUK:'Вона ___ чекати тебе.',     opts:['will','would','shall','is'],           correct:0, level:'B1'},
  {phrase:'I ___ not do this.',            hintRU:'Я не ___ этого делать.',       hintUK:'Я не ___ цього робити.',    opts:['should','shall','would','will'],       correct:0, level:'B1'},
  {phrase:'He ___ have helped.',           hintRU:'Он ___ помочь.',               hintUK:'Він ___ допомогти.',        opts:['could','can','would','shall'],         correct:0, level:'B1'},
  // B1: Conditional type 1
  {phrase:'If it rains, I ___ stay home.', hintRU:'Если будет дождь, я ___ дома.', hintUK:'Якщо буде дощ, я ___ вдома.',opts:['will','would','shall','should'],      correct:0, level:'B1'},
  {phrase:'If you work hard, you ___ succeed.',hintRU:'Если ты будешь стараться, ты ___.', hintUK:'Якщо ти будеш старатися, ти ___.',opts:['will','would','shall','should'],correct:0, level:'B1'},
  // B1: Comparatives
  {phrase:'She is ___ than her sister.',   hintRU:'Она ___ своей сестры.',        hintUK:'Вона ___ своєї сестри.',    opts:['tall','taller','tallest','most tall'], correct:1, level:'B1'},
  {phrase:"It's ___ book I've read.",      hintRU:'Это ___ книга, что я читал.',  hintUK:'Це ___ книга, яку я читав.', opts:['good','better','the best','best'],    correct:2, level:'B1'},
  // B1: Build questions
  {phrase:'Собери фразу из слов:', hintRU:'Они уже ушли.', hintUK:'Вони вже пішли.',
   opts:['have','They','left','already'], correct:0, level:'B1', type:'build',
   words:['They','have','already','left'], answer:'They have already left'},
  {phrase:'Собери фразу из слов:', hintRU:'Она читала когда я пришёл.', hintUK:'Вона читала коли я прийшов.',
   opts:['I','was','when','She','reading','came'], correct:0, level:'B1', type:'build',
   words:['She','was','reading','when','I','came'], answer:'She was reading when I came'},
  // B1: Type questions
  {phrase:'She has ___ working here for years.', hintRU:'Она ___ работает здесь годами.', hintUK:'Вона ___ працює тут роками.',
   opts:['been','be','being','was'], correct:0, level:'B1', type:'type', answer:'been'},
  {phrase:'Have you ___ read this book?',  hintRU:'Ты ___ читал эту книгу?',      hintUK:'Ти ___ читав цю книгу?',    opts:['ever','never','always','yet'], correct:0, level:'B1', type:'type', answer:'ever'},

  // ── B2 ────────────────────────────────────────────────────────────────────
  {phrase:'It ___ already been done.',     hintRU:'Это уже ___.',                 hintUK:'Це вже ___.',               opts:['was','been','has been','had'],          correct:2, level:'B2'},
  {phrase:'I should ___ come earlier.',    hintRU:'Мне нужно было ___ раньше.',   hintUK:'Мені треба ___ раніше.',    opts:['come','came','have come','had come'],   correct:2, level:'B2'},
  {phrase:'He has never ___ me.',          hintRU:'Он так и не ___ мне.',         hintUK:'Він так і не ___ мені.',    opts:['calls','called','has called','call'],   correct:3, level:'B2'},
  {phrase:'If she ___, she would know.',   hintRU:'Если бы она ___, знала.',      hintUK:'Якби вона ___, знала.',     opts:['ask','asked','would ask','has asked'],  correct:1, level:'B2'},
  // B2: Passive Voice complex
  {phrase:'The report ___ submitted by Friday.',hintRU:'Отчёт ___ сдан до пятницы.',hintUK:'Звіт ___ здано до п\'ятниці.',opts:['must be','must have','should','is'],correct:0, level:'B2'},
  {phrase:'The new law ___ passed last year.',hintRU:'Новый закон ___ принят в прошлом году.',hintUK:'Новий закон ___ прийнятий торік.',opts:['was','were','has been','had been'],correct:0, level:'B2'},
  {phrase:'English ___ spoken worldwide.', hintRU:'На английском ___ говорят по всему миру.',hintUK:'Англійською ___ говорять у всьому світі.',opts:['is','are','was','were'],correct:0, level:'B2'},
  // B2: Reported speech
  {phrase:'He said he ___ tired.',         hintRU:'Он сказал, что ___ устал.',    hintUK:'Він сказав, що ___ втомлений.',opts:['is','was','were','be'],             correct:1, level:'B2'},
  {phrase:'She told me she ___ leave.',    hintRU:'Она сказала, что ___ уйдёт.',  hintUK:'Вона сказала, що ___ піде.',opts:['will','would','shall','should'],        correct:1, level:'B2'},
  {phrase:'He asked where I ___.',         hintRU:'Он спросил, где я ___.',       hintUK:'Він запитав, де я ___.',    opts:['live','lived','living','lives'],        correct:1, level:'B2'},
  // B2: Conditional type 2
  {phrase:'If I ___ rich, I would travel.',hintRU:'Если бы я ___ богат, путешествовал бы.',hintUK:'Якби я ___ багатий, подорожував би.',opts:['am','was','were','be'],correct:2, level:'B2'},
  {phrase:'She would help if she ___.',    hintRU:'Она бы помогла, если бы ___.',  hintUK:'Вона б допомогла, якби ___.',opts:['can','could','had','knew'],          correct:3, level:'B2'},
  // B2: Relative clauses
  {phrase:'The man ___ called is my friend.',hintRU:'Мужчина, ___ позвонил — мой друг.',hintUK:'Чоловік, ___ зателефонував — мій друг.',opts:['who','which','whose','whom'],correct:0, level:'B2'},
  {phrase:'The book ___ I read was great.',hintRU:'Книга, ___ я читал, была отличной.',hintUK:'Книга, ___ я читав, була чудовою.',opts:['who','which','whose','whom'],  correct:1, level:'B2'},
  {phrase:'The girl ___ mother is a doctor studies here.',hintRU:'Девочка, ___ мать — врач, учится здесь.',hintUK:'Дівчина, ___ мати — лікар, навчається тут.',opts:['who','which','whose','whom'],correct:2, level:'B2'},
  // B2: Gerunds/Infinitives
  {phrase:'She enjoys ___.',               hintRU:'Она любит ___.',               hintUK:'Вона любить ___.',          opts:['dance','dances','dancing','to dance'], correct:2, level:'B2'},
  {phrase:'I want you ___ this.',          hintRU:'Я хочу, чтобы ты ___ это.',    hintUK:'Я хочу, щоб ти ___ це.',    opts:['do','doing','to do','done'],           correct:2, level:'B2'},
  {phrase:'He avoided ___ the problem.',   hintRU:'Он избегал ___ проблемы.',     hintUK:'Він уникав ___ проблеми.',  opts:['discuss','discussed','discussing','to discuss'],correct:2, level:'B2'},
  {phrase:'She decided ___ earlier.',      hintRU:'Она решила ___ раньше.',       hintUK:'Вона вирішила ___ раніше.',  opts:['leave','left','leaving','to leave'],  correct:3, level:'B2'},
  // B2: Build questions
  {phrase:'Собери фразу из слов:', hintRU:'Если бы я знал, я бы сказал.', hintUK:'Якби я знав, я б сказав.',
   opts:['say','I knew','would','If','I'], correct:0, level:'B2', type:'build',
   words:['If','I','knew','I','would','say'], answer:'If I knew I would say'},
  {phrase:'Собери фразу из слов:', hintRU:'Письмо было написано ею.', hintUK:'Лист був написаний нею.',
   opts:['The','was','letter','written','her','by'], correct:0, level:'B2', type:'build',
   words:['The','letter','was','written','by','her'], answer:'The letter was written by her'},
  // B2: choice4 — translation
  {phrase:'She has been working here for years.', hintRU:'Выбери правильный перевод:', hintUK:'Обери правильний переклад:',
   opts:['Она работает здесь годами','Она работала здесь годами','Она будет работать здесь','Она работала бы здесь'],
   optsUK:['Вона працює тут роками','Вона працювала тут роками','Вона буде тут працювати','Вона б тут працювала'],
   correct:0, level:'B2', type:'choice4'},
  {phrase:'The report must be submitted by Friday.', hintRU:'Выбери правильный перевод:', hintUK:'Обери правильний переклад:',
   opts:['Отчёт можно сдать в пятницу','Отчёт должен быть сдан до пятницы','Отчёт был сдан в пятницу','Отчёт сдадут в пятницу'],
   optsUK:["Звіт можна здати в п'ятницю","Звіт має бути зданий до п'ятниці","Звіт був зданий у п'ятницю","Звіт здадуть у п'ятницю"],
   correct:1, level:'B2', type:'choice4'},
  // B2: Type questions
  {phrase:'She has been here ___ 2010.',   hintRU:'Она здесь ___ 2010 года.',     hintUK:'Вона тут ___ 2010 року.',   opts:['for','since','during','from'], correct:1, level:'B2', type:'type', answer:'since'},
  {phrase:'They ___ each other for years.',hintRU:'Они знают друг друга ___ годами.',hintUK:'Вони знають одне одного ___ роки.',opts:['know','knew','have known','known'],correct:2, level:'B2', type:'type', answer:'have known'},

  // ── C1 ────────────────────────────────────────────────────────────────────
  {phrase:'If you had come, you ___ her.', hintRU:'Если бы ты пришёл, ты ___ её.',hintUK:'Якби ти прийшов, ти ___ її.', opts:['meet','met','would have met','had met'],correct:2, level:'C1'},
  {phrase:'He is said ___ been rich.',     hintRU:'Говорят, что он ___ богатым.',  hintUK:'Кажуть, що він ___ багатим.', opts:['to have','to be','having','being'], correct:0, level:'C1'},
  {phrase:'Should I ___ told you earlier?',hintRU:'Не ___ вам сказать правду?',   hintUK:'Не ___ вам сказати правду?', opts:['have','had','be','been'],           correct:0, level:'C1'},
  // C1: Conditional type 3
  {phrase:'If she ___ harder, she would have passed.',hintRU:'Если бы она старалась...',hintUK:'Якби вона старалася...',opts:['worked','had worked','would work','was working'],correct:1,level:'C1'},
  {phrase:'He would ___ the report if he had tried harder.',hintRU:'Он бы ___ отчёт, если бы постарался.',hintUK:'Він би ___ звіт, якби постарався.',opts:['finish','finished','have finished','had finished'],correct:2,level:'C1'},
  {phrase:'If I had known, I ___ the truth.',hintRU:'Если бы я знал, я бы ___ правду.',hintUK:'Якби я знав, я б ___ правду.',opts:['would tell','told','would have told','had told'],correct:2,level:'C1'},
  // C1: Complex passive/perfect
  {phrase:'The project ___ completed by next month.',hintRU:'Проект ___ завершён к следующему месяцу.',hintUK:'Проект ___ завершено до наступного місяця.',opts:['will be','would be','is being','has been'],correct:0,level:'C1'},
  {phrase:'By the time she arrived, he ___ everything.',hintRU:'К тому времени он ___ всё.',hintUK:'На той час він ___ все.',opts:['finish','has finished','had finished','was finishing'],correct:2,level:'C1'},
  {phrase:'She ___ have been waiting for hours.',hintRU:'Она ___ ждать часами.',     hintUK:'Вона ___ чекати годинами.',   opts:['must','can','shall','will'],        correct:0, level:'C1'},
  // C1: Cleft sentences / inversion
  {phrase:'Not only ___ she sing, she also dances.',hintRU:'Она не только поёт...',hintUK:'Вона не тільки співає...',      opts:['can','does','is','has'],             correct:1, level:'C1'},
  {phrase:'___ had I left when it started raining.',hintRU:'Как только я вышел...',hintUK:'Щойно я вийшов...',             opts:['Hardly','Barely','No sooner','Scarcely'],correct:0,level:'C1'},
  // C1: Choice4
  {phrase:'Hardly had she arrived when they left.', hintRU:'Выбери правильный перевод:', hintUK:'Обери правильний переклад:',
   opts:['Едва она прибыла, как они ушли','Она прибыла и они ушли','Она не хотела приходить','Они ушли до её прибытия'],
   optsUK:['Ледве вона прибула, як вони пішли','Вона прибула і вони пішли','Вона не хотіла приходити','Вони пішли до її прибуття'],
   correct:0, level:'C1', type:'choice4'},
  {phrase:'She would rather stay home than go out.', hintRU:'Выбери правильный перевод:', hintUK:'Обери правильний переклад:',
   opts:['Она не может остаться дома','Ей лучше было бы остаться дома','Она не идёт домой','Она идёт гулять'],
   optsUK:['Вона не може залишитися вдома','Їй краще залишитися вдома','Вона не йде додому','Вона йде гуляти'],
   correct:1, level:'C1', type:'choice4'},
  // C1: Type
  {phrase:'___ more she studied, the better she got.',hintRU:'Чем больше занималась...',hintUK:'Чим більше займалася...',opts:['More','The more','The most','Most'],correct:1, level:'C1', type:'type', answer:'The'},
  {phrase:'He is used to ___ up early.',   hintRU:'Он привык вставать рано.',     hintUK:'Він звик вставати рано.',    opts:['wake','wakes','waking','woken'],    correct:2, level:'C1', type:'type', answer:'waking'},
  // C1: Build
  {phrase:'Собери фразу из слов:', hintRU:'Если бы она пришла, ты бы её встретил.', hintUK:'Якби вона прийшла, ти б її зустрів.',
   opts:['had come','you','If','have met','would','she','her'], correct:0, level:'C1', type:'build',
   words:['If','she','had','come','you','would','have','met','her'], answer:'If she had come you would have met her'},
];

// Result thresholds (based on 20 questions)
const LEVEL_RESULTS = [
  {min:0,  level:'A1', ru:'Начинающий',    uk:'Початківець',     msgRU:'Ты только в начале пути — лучший момент начать!',  msgUK:'Ти тільки на початку шляху — найкращий момент почати!'},
  {min:4,  level:'A2', ru:'Элементарный',  uk:'Елементарний',    msgRU:'Основы есть — пора строить фундамент!',            msgUK:'Основи є — час будувати фундамент!'},
  {min:8,  level:'B1', ru:'Средний',       uk:'Середній',        msgRU:'Хороший уровень — ты уже можешь общаться!',        msgUK:'Хороший рівень — ти вже можеш спілкуватися!'},
  {min:12, level:'B2', ru:'Выше среднего', uk:'Вище середнього', msgRU:'Отлично — уверенное владение языком!',             msgUK:'Відмінно — впевнене володіння мовою!'},
  {min:16, level:'C1', ru:'Продвинутый',   uk:'Просунутий',      msgRU:'Впечатляет — почти как носитель!',                 msgUK:'Вражає — майже як носій мови!'},
  {min:20, level:'C2', ru:'Мастер',        uk:'Майстер',         msgRU:'Профессор был бы горд!',                           msgUK:'Професор пишався б!'},
];

// CHANGELOG v2: Level-based scoring — level = highest consecutive level with ≥3/4 correct.
// Simple total-count scoring (16/20 → C1) was too generous and allowed C1 via guessing.
const getResult = (score: number, qs?: Question[], ans?: boolean[]) => {
  if (qs && ans && ans.length === qs.length && qs.length > 0) {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
    let bestLevel = 'A1';
    for (const lv of levels) {
      const lvIdxs = qs.reduce<number[]>((acc, q, i) => q.level === lv ? [...acc, i] : acc, []);
      const lvCorrect = lvIdxs.filter(i => ans[i]).length;
      if (lvCorrect >= 3) bestLevel = lv; // 75% threshold per level
      else break; // levels are sequential — can't skip a failed level
    }
    if (score === qs.length) bestLevel = 'C2'; // perfect score only
    return LEVEL_RESULTS.find(r => r.level === bestLevel) || LEVEL_RESULTS[0];
  }
  return [...LEVEL_RESULTS].reverse().find(r => score >= r.min) || LEVEL_RESULTS[0];
};

// Pick 20 questions: 4×A1, 4×A2, 4×B1, 4×B2, 4×C1 — mix of types
const pickQuestions = () => {
  const result: Question[] = [];
  for (const lv of ['A1','A2','B1','B2','C1'] as const) {
    const lvPool = shuffle(POOL.filter(q => q.level === lv));
    result.push(...lvPool.slice(0, 4));
  }
  return result;
};

type Phase = 'intro' | 'quiz' | 'result';

export default function DiagnosticTest() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isFromOnboarding = params.fromOnboarding === '1';
  const { theme: t , f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const [phase,       setPhase]    = useState<Phase>('intro');
  const [questions]                = useState(pickQuestions);
  const [idx,         setIdx]      = useState(0);
  const [score,       setScore]    = useState(0);
  const [chosen,      setChosen]   = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typeSubmitted, setTypeSubmitted] = useState(false);
  const [buildSelected, setBuildSelected] = useState<string[]>([]);
  const [buildBank,     setBuildBank]     = useState<string[]>([]);
  const [buildSubmitted, setBuildSubmitted] = useState(false);
  const [timeLeft,    setTimeLeft] = useState(TIMER_SEC);
  const [prevResult,  setPrev]     = useState<{ score: number; level: string; date: string } | null>(null);
  const [hapticsOn,   setHapticsOn]= useState(true);
  const [voiceOut,    setVoiceOut] = useState(true);
  const [autoAdvance, setAutoAdvance]= useState(false);

  const locked      = useRef(false);
  const inputRef    = useRef<any>(null);
  const timerAnim   = useRef(new Animated.Value(1)).current;
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef  = useRef<boolean[]>([]);
  const userNameRef = useRef<string>('');

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) userNameRef.current = n; });
    AsyncStorage.getItem('diagnostic_last').then(v => { if (v) setPrev(JSON.parse(v)); });
    loadSettings().then(s => {
      setHapticsOn(s.haptics);
      setVoiceOut(s.voiceOut);
      setAutoAdvance(s.autoAdvance ?? false);
    });
  }, []);

  useEffect(() => {
    if (phase !== 'quiz') return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(TIMER_SEC);
    setTypedAnswer('');
    setTypeSubmitted(false);
    setBuildSelected([]);
    setBuildSubmitted(false);
    const curQ = questions[idx];
    setBuildBank(curQ?.type === 'build' && curQ.words ? shuffle([...curQ.words]) : []);
    timerAnim.setValue(1);
    Animated.timing(timerAnim, { toValue: 0, duration: TIMER_SEC * 1000, useNativeDriver: false }).start();
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(timerRef.current!); handleSkip(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx, phase]);

  const advance = (newScore: number) => {
    if (idx + 1 >= questions.length) {
      const res = getResult(newScore, questions, answersRef.current);
      AsyncStorage.setItem('diagnostic_last', JSON.stringify({
        score: newScore, level: res.level,
        date: new Date().toLocaleDateString(isUK ? 'uk-UA' : 'ru-RU'),
      }));
      AsyncStorage.setItem('placement_level', res.level);
      checkAchievements({ type: 'diagnosis' }).catch(() => {});
      setPhase('result');
    } else {
      setIdx(i => i + 1);
      setChosen(null);
      setTypedAnswer('');
      setTypeSubmitted(false);
      locked.current = false;
    }
  };

  const handleSkip = () => {
    if (locked.current || chosen !== null || typeSubmitted || buildSubmitted) return;
    locked.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setChosen(-1);
    answersRef.current = [...answersRef.current, false];
    setTimeout(() => advance(score), 900);
  };

  const handleAnswer = (ci: number) => {
    if (locked.current || chosen !== null) return;
    locked.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setChosen(ci);
    const isRight = ci === questions[idx].correct;
    answersRef.current = [...answersRef.current, isRight];
    const ns = isRight ? score + 1 : score;
    if (isRight) {
      setScore(ns);
      if (userNameRef.current) {
        registerXP(2, 'diagnostic_test', userNameRef.current, lang as 'ru'|'uk');
      }
    } else if (hapticsOn) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }
    if (autoAdvance) setTimeout(() => advance(ns), 1500);
  };

  const handleTypeSubmit = () => {
    if (locked.current || typeSubmitted) return;
    locked.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const q = questions[idx];
    // Normalize: lowercase, trim, strip trailing punctuation (? ! .) so typing "?" doesn't cause error
    const expectedAnswer = q.answer || q.opts[q.correct];
    const isRight = isCorrectAnswer(typedAnswer, expectedAnswer);
    answersRef.current = [...answersRef.current, isRight];
    const ns = isRight ? score + 1 : score;
    setTypeSubmitted(true);
    setChosen(isRight ? q.correct : -1);
    if (isRight) {
      setScore(ns);
      if (userNameRef.current) registerXP(2, 'diagnostic_test', userNameRef.current, lang as 'ru'|'uk');
    } else if (hapticsOn) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }
    if (autoAdvance) setTimeout(() => advance(ns), 1500);
  };

  const handleBuildSubmit = () => {
    if (locked.current || buildSubmitted || buildSelected.length === 0) return;
    locked.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const expected = questions[idx].answer || '';
    const isRight = isCorrectAnswer(buildSelected.join(' '), expected);
    answersRef.current = [...answersRef.current, isRight];
    const ns = isRight ? score + 1 : score;
    setBuildSubmitted(true);
    setChosen(isRight ? 0 : -1);
    if (isRight) {
      setScore(ns);
      if (userNameRef.current) registerXP(2, 'diagnostic_test', userNameRef.current, lang as 'ru'|'uk');
    } else if (hapticsOn) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }
    if (autoAdvance) setTimeout(() => advance(ns), 1500);
  };

  const q = questions[idx];
  const qOpts = (isUK && q.optsUK) ? q.optsUK : q.opts;
  const result = getResult(score, questions, answersRef.current);
  const barColor = timerAnim.interpolate({
    inputRange: [0, 0.3, 1], outputRange: [t.wrong, t.bgSurface, t.textSecond],
  });

  // ── ИНТРО ────────────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        {!isFromOnboarding && (
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: isFromOnboarding ? 0 : 8 }}>
          {isUK ? 'Тест Професора' : 'Тест Профессора'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: t.bgCard, borderWidth: 1.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name="analytics-outline" size={40} color={t.textSecond} />
          </View>
          <Text style={{ color: t.textPrimary, fontSize: f.numMd + 6, fontWeight: '700', textAlign: 'center' }} adjustsFontSizeToFit numberOfLines={1}>
            {isUK ? 'Тест рівня знань' : 'Тест уровня знаний'}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center', marginTop: 10, lineHeight: 24 }}>
            {isUK
              ? '20 питань · 30 секунд на кожне\nВизначаємо рівень від A1 до C2'
              : '20 вопросов · 30 секунд на каждый\nОпределяем уровень от A1 до C2'}
          </Text>
        </View>


        {prevResult && (
          <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: t.border, marginVertical: 16 }}>
            <Text style={{ color: t.textSecond, fontSize: f.label, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
              {isUK ? 'Попередній результат' : 'Предыдущий результат'}
            </Text>
            <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }} adjustsFontSizeToFit numberOfLines={1}>
              {prevResult.level} — {getResult(prevResult.score)[isUK ? 'uk' : 'ru']}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 4 }}>
              {prevResult.score} / 20 · {prevResult.date}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={{ backgroundColor: t.bgSurface, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 0.5, borderColor: t.border, marginTop: 8 }}
          onPress={() => { hapticTap(); setPhase('quiz'); locked.current = false; }}
          activeOpacity={0.85}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
            {isUK ? 'Почати тест' : 'Начать тест'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );

  // ── РЕЗУЛЬТАТ ────────────────────────────────────────────────────────────
  if (phase === 'result') return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: t.bgCard, borderWidth: 1.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 20 }}>
          <Ionicons name="school-outline" size={44} color={t.textSecond} />
        </View>
        <Text style={{ color: t.textSecond, fontSize: f.caption, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          {isUK ? 'Твій рівень' : 'Твой уровень'}
        </Text>
        <Text style={{ color: t.textPrimary, fontSize: f.numLg + 16, fontWeight: '700' }} adjustsFontSizeToFit numberOfLines={1}>{result.level}</Text>
        <Text style={{ color: t.textSecond, fontSize: f.h1, fontWeight: '600', marginTop: 4 }}>
          {isUK ? result.uk : result.ru}
        </Text>
        <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center', marginTop: 16, lineHeight: 24, marginBottom: 28 }}>
          {isUK ? result.msgUK : result.msgRU}
        </Text>
        <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: t.border, width: '100%', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: t.textSecond, fontSize: f.caption, marginBottom: 6 }}>
            {isUK ? 'Правильних відповідей' : 'Правильных ответов'}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.numLg + 12, fontWeight: '700' }} adjustsFontSizeToFit numberOfLines={1}>{score} / {questions.length}</Text>
          {score > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: t.correctBg, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Ionicons name="star" size={14} color={t.correct} />
              <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '600' }}>
                +{score} {isUK ? 'досвіду' : 'опыта'}
              </Text>
            </View>
          )}
        </View>

        {/* Блок открытых уроков */}
        <View style={{ backgroundColor: t.correctBg, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.correct, width: '100%', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Ionicons name="lock-open-outline" size={20} color={t.correct} />
            <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '700' }}>
              {isUK ? 'Відкрито для вас' : 'Открыто для вас'}
            </Text>
          </View>
          <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: 22, marginBottom: 8 }}>
            {(() => {
              const lv = result.level;
              const rangeRU = lv === 'A1' ? 'Уроки 1–8 (уровень A1)' : lv === 'A2' ? 'Уроки 1–16 (уровни A1–A2)' : lv === 'B1' ? 'Уроки 1–24 (уровни A1–B1)' : 'Все 32 урока (уровни A1–B2+)';
              const rangeUK = lv === 'A1' ? 'Уроки 1–8 (рівень A1)' : lv === 'A2' ? 'Уроки 1–16 (рівні A1–A2)' : lv === 'B1' ? 'Уроки 1–24 (рівні A1–B1)' : 'Усі 32 уроки (рівні A1–B2+)';
              return isUK ? rangeUK : rangeRU;
            })()}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: 22 }}>
            {isUK
              ? 'Рекомендуємо пройти всі попередні уроки для закріплення матеріалу.'
              : 'Рекомендуем пройти все предыдущие уроки для закрепления материала.'}
          </Text>
        </View>

        <TouchableOpacity
          style={{ backgroundColor: t.bgSurface, borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', marginBottom: 12, borderWidth: 0.5, borderColor: t.border }}
          onPress={() => { hapticTap(); setIdx(0); setScore(0); setChosen(null); setTypedAnswer(''); setTypeSubmitted(false); setPhase('quiz'); locked.current = false; }}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
            {isUK ? 'Пройти знову' : 'Пройти снова'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 14 }} onPress={() => { hapticTap(); router.replace('/(tabs)' as any); }}>
          <Text style={{ color: t.textSecond, fontSize: f.body }}>{isUK ? 'На головну' : 'На главную'}</Text>
        </TouchableOpacity>
      </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );

  // ── ВОПРОС ────────────────────────────────────────────────────────────────
  const isTyping = q.type === 'type';
  const isBuilding = q.type === 'build';
  const isAnswered = chosen !== null || typeSubmitted || buildSubmitted;
  const correctAnswer = isTyping ? (q.answer || q.opts[q.correct]) : '';

  return (
    <ScreenGradient>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 }}>
          {isFromOnboarding ? (
            <TouchableOpacity onPress={() => { AsyncStorage.removeItem('open_diagnostic'); router.replace('/(tabs)' as any); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
                {isUK ? 'Відмінити' : 'Отменить'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '500' }}>{idx + 1} / {questions.length}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-circle" size={16} color={t.correct} />
            <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '600' }}>{score}</Text>
          </View>
        </View>

        {/* Таймер-бар */}
        <View style={{ height: 5, backgroundColor: t.border, marginHorizontal: 16, borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
          <Animated.View style={{
            height: '100%', borderRadius: 3, backgroundColor: barColor,
            width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }} />
        </View>
        <Text style={{ color: t.textSecond, fontSize: f.label, textAlign: 'right', marginRight: 16, marginBottom: 12 }}>
          {timeLeft}с
        </Text>

        <View
          style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' }}
          onTouchEnd={() => { if (isAnswered && !autoAdvance) advance(score); }}
        >
          <View>
          {/* Тип вопроса */}
          {q.type === 'build' && (
            <Text style={{ color: t.textSecond, fontSize: f.label, marginBottom: 4 }}>
              {isUK ? '🧩 Збери фразу зі слів' : '🧩 Собери фразу из слов'}
            </Text>
          )}
          {q.type === 'choice4' && (
            <Text style={{ color: t.textSecond, fontSize: f.label, marginBottom: 4 }}>
              {isUK ? '🔤 Обери правильний переклад' : '🔤 Выбери правильный перевод'}
            </Text>
          )}
          {q.type === 'match' && (
            <Text style={{ color: t.textSecond, fontSize: f.label, marginBottom: 4 }}>
              {isUK ? '🔗 Зістав слово з перекладом' : '🔗 Сопоставь слово с переводом'}
            </Text>
          )}
          {q.type === 'type' && (
            <Text style={{ color: t.textSecond, fontSize: f.label, marginBottom: 4 }}>
              {isUK ? '⌨️ Введи пропущене слово' : '⌨️ Введи пропущенное слово'}
            </Text>
          )}

          <Text style={{ color: t.textPrimary, fontSize: f.numMd + 6, fontWeight: '500', lineHeight: 36, marginBottom: 20 }}>
            {q.type === 'build' ? (isUK ? q.hintUK : q.hintRU) : q.phrase}
          </Text>
          </View>

          <View style={{ paddingBottom: 16 }}>
          {/* BUILD — интерактивная сборка фразы */}
          {isBuilding && (
            <View>
              {/* Answer area */}
              <View style={{
                minHeight: 52, flexDirection: 'row', flexWrap: 'wrap', gap: 6,
                backgroundColor: buildSubmitted ? (chosen === 0 ? t.correctBg : t.wrongBg) : t.bgCard,
                borderRadius: 12, padding: 10, marginBottom: 8,
                borderWidth: 1.5,
                borderColor: buildSubmitted ? (chosen === 0 ? t.correct : t.wrong) : (buildSelected.length > 0 ? t.textSecond : t.border),
              }}>
                {buildSelected.length === 0 ? (
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontStyle: 'italic', alignSelf: 'center' }}>
                    {isUK ? 'Торкнись слова нижче...' : 'Тапни слово снизу...'}
                  </Text>
                ) : (
                  buildSelected.map((word, wi) => (
                    <TouchableOpacity
                      key={wi}
                      onPress={() => {
                        if (buildSubmitted) return;
                        setBuildSelected(prev => prev.filter((_, i) => i !== wi));
                        setBuildBank(prev => [...prev, word]);
                      }}
                      style={{ backgroundColor: t.bgSurface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: t.border }}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.body }}>{word}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              {buildSubmitted && chosen !== 0 && (
                <Text style={{ color: t.correct, fontSize: f.sub, marginBottom: 8, marginLeft: 4 }}>
                  ✓ {q.answer}
                </Text>
              )}
              {/* Word bank */}
              {!buildSubmitted && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {buildBank.map((word, wi) => (
                    <TouchableOpacity
                      key={wi}
                      onPress={() => {
                        setBuildBank(prev => prev.filter((_, i) => i !== wi));
                        setBuildSelected(prev => [...prev, word]);
                      }}
                      style={{ backgroundColor: t.bgSurface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: t.border }}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.body }}>{word}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Submit */}
              {!buildSubmitted && (
                <TouchableOpacity
                  style={{
                    backgroundColor: buildSelected.length > 0 ? t.bgSurface : t.bgCard,
                    borderRadius: 12, padding: 14, alignItems: 'center',
                    borderWidth: 1, borderColor: buildSelected.length > 0 ? t.textSecond : t.border,
                    opacity: buildSelected.length > 0 ? 1 : 0.45,
                  }}
                  onPress={handleBuildSubmit}
                  disabled={buildSelected.length === 0}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: buildSelected.length > 0 ? t.textPrimary : t.textMuted, fontSize: f.body, fontWeight: '600' }}>
                    {isUK ? 'Перевірити' : 'Проверить'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* TYPE — текстовый ввод */}
          {isTyping && (
            <View style={{ marginBottom: 16 }}>
              <View style={{
                flexDirection: 'row', borderWidth: 1.5,
                borderColor: typeSubmitted ? (chosen === q.correct ? t.correct : t.wrong) : t.border,
                borderRadius: 14, overflow: 'hidden', backgroundColor: t.bgCard,
              }}>
                <TextInput
                  ref={inputRef}
                  style={{ flex: 1, padding: 16, fontSize: f.h2, color: t.textPrimary, fontWeight: '500' }}
                  placeholder={isUK ? 'Введи відповідь...' : 'Введи ответ...'}
                  placeholderTextColor={t.textSecond}
                  value={typedAnswer}
                  onChangeText={setTypedAnswer}
                  editable={!typeSubmitted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleTypeSubmit}
                />
                {!typeSubmitted && (
                  <TouchableOpacity
                    style={{ backgroundColor: t.bgSurface, paddingHorizontal: 16, justifyContent: 'center', borderLeftWidth: 0.5, borderLeftColor: t.border }}
                    onPress={handleTypeSubmit}
                  >
                    <Ionicons name="checkmark" size={22} color={t.textSecond} />
                  </TouchableOpacity>
                )}
              </View>
              {typeSubmitted && chosen !== q.correct && (
                <Text style={{ color: t.correct, fontSize: f.sub, marginTop: 8, marginLeft: 4 }}>
                  {isUK ? `✓ Правильна відповідь: ${correctAnswer}` : `✓ Правильный ответ: ${correctAnswer}`}
                </Text>
              )}
            </View>
          )}

          {/* Выбор вариантов */}
          {!isTyping && !isBuilding && (
            <View style={{ gap: 10 }}>
              {qOpts.map((opt, ci) => {
                let bg = t.bgCard, border = t.border, tc = t.textPrimary;
                if (chosen !== null) {
                  if (ci === q.correct)                    { bg = t.correctBg; border = t.correct; tc = t.correct; }
                  else if (ci === chosen && chosen !== -1) { bg = t.wrongBg;   border = t.wrong;   tc = t.wrong;   }
                }
                if (chosen === -1 && ci === q.correct)     { bg = t.correctBg; border = t.correct; tc = t.correct; }
                return (
                  <TouchableOpacity key={ci}
                    style={{ backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: 14, padding: 18 }}
                    onPress={() => { hapticTap(); handleAnswer(ci); }}
                    activeOpacity={0.8}
                    disabled={chosen !== null}
                  >
                    <Text style={{ color: tc, fontSize: f.h2, fontWeight: '500' }}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ADDED: кнопка "Пропустить" — пропустить вопрос если не знаешь ответа. Засчитывается как неверно. */}
          {!isAnswered && (
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4 }}
              onPress={() => { hapticTap(); handleSkip(); }}
              activeOpacity={0.5}
            >
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {isUK ? 'Пропустити' : 'Пропустить'}
              </Text>
            </TouchableOpacity>
          )}

          {isAnswered && !autoAdvance && (
            <Text style={{ color: t.textSecond, fontSize: f.caption, textAlign: 'center', marginTop: 14 }}>
              {isUK ? 'Торкніться щоб продовжити' : 'Нажмите чтобы продолжити'}
            </Text>
          )}
          </View>
        </View>
        </ContentWrap>
      </SafeAreaView>
    </KeyboardAvoidingView>
    </ScreenGradient>
  );
}
