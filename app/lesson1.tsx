import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Pressable,
  Animated, useWindowDimensions, TextInput, KeyboardAvoidingView, ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useTheme, getCardShadow } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { isCorrectAnswer } from '../constants/contractions';
import { L1_PHRASE_STRUCTURES, getDistractorsForWord } from './lesson1_distractor_logic';
import { addOrUpdateScore } from './hall_of_fame_utils';
import { checkAchievements } from './achievements';
import { updateMultipleTaskProgress, resetAndUpdateTaskProgress } from './daily_tasks';
// [SRS] Модуль интервального повторения (active_recall.ts).
// recordMistake() вызывается при каждом неверном ответе в уроке.
// Фраза попадает в AsyncStorage ('active_recall_items') с алгоритмом SM-2:
//   interval=1 день, easeFactor=2.5. При повторных ошибках easeFactor снижается.
// Связь: review.tsx читает эти данные через getDueItems() и показывает карточки.
// Связь: home.tsx показывает счётчик getDueItems().length на главном экране.
import { recordMistake } from './active_recall';
import { findAllExplanations } from './feedback_engine';
import { getErrorTrapsByIndex } from './error_traps/index';
import type { FeedbackResult } from './types/feedback';
import { getLessonData, getLessonIntroScreens, getLessonEncouragementScreens, ALL_LESSONS_RU, ALL_LESSONS_UK } from './lesson_data_all';
import { hapticTap } from '../hooks/use-haptics';
import AddToFlashcard from '../components/AddToFlashcard';
import { loadMedalInfo, getProgressCellColor } from './medal_utils';
import { spendEnergy, checkAndRecover } from './energy_system';
import LessonEnergyLightning from '../components/LessonEnergyLightning';
import LessonIntroScreens from './lesson_intro_screens';

import { tryUnlockNextLesson } from './lesson_lock_system';

let SpeechRec: any = null;
let tapHintShownThisSession = false;
try {
  SpeechRec = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
  if (!SpeechRec) SpeechRec = null;
} catch { SpeechRec = null; }
const VOICE_OK = SpeechRec !== null;


// ── Умные варианты ответов для урока 1 ──────────────────────────────────────
// Слова сгруппированы по категориям — дистракторы берутся из той же группы

const WORD_POOLS_L1 = {
  days:       ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
                'Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays','Sundays'],
  months:     ['January','February','March','April','May','June','July','August',
                'September','October','November','December'],
  cities:     ['London','Paris','Berlin','Barcelona','Rome','Madrid','Amsterdam','Vienna','Prague','Athens',
                'Lisbon','Brussels','Warsaw','Budapest','Zurich','Munich','Stockholm','Oslo','Copenhagen','Helsinki',
                'Tokyo','Sydney','Toronto','Dubai','Singapore','Dublin','Edinburgh','Geneva','Lyon','Kyoto'],
  languages:  ['English','French','Spanish','German','Italian','Portuguese','Chinese','Japanese','Arabic',
                'Dutch','Polish','Swedish','Norwegian','Danish','Turkish','Korean','Hindi','Greek','Ukrainian'],
  pronouns:   ['I','you','he','she','it','we','they','this','that','these','those','me','him','her','us','them'],
  toBe:       ['am','is','are','was','were','be','been','being',"isn't","aren't","wasn't","weren't"],
  negation:   ['not',"don't","doesn't","didn't","won't","can't","couldn't","shouldn't","wouldn't","haven't","hadn't","never"],
  verbs:      ['work','works','worked','do','does','did','go','goes','went','come','comes','came',
                'have','has','had','know','knew','think','thought','get','got','make','made','take','took',
                'give','gave','find','found','tell','told','buy','bought','write','wrote','read','eat','ate',
                'drink','drank','sleep','slept','drive','drove','run','ran','sit','sat','stand','stood',
                'bring','brought','start','finish','help','open','close','watch','listen','play','study',
                'travel','visit','move','speak','spoke','break','broke','pass','prepare','arrive','leave',
                'stay','see','saw','say','said','use','used','try','want','like','need','stop','call',
                'exercise','exercises','exercised','negotiate','negotiates','negotiated',
                'manage','manages','managed','practise','practises','practised','practice','practices','practiced',
                'attend','attends','attended','develop','develops','developed',
                'solve','solves','solved','cook','cooks','cooked',
                'prefer','prefers','preferred','offer','offers','offered',
                'plan','plans','planned','discuss','discusses','discussed',
                'improve','improves','improved','suggest','suggests','suggested',
                'explain','explains','explained','complete','completes','completed',
                'review','reviews','reviewed','present','presents','presented',
                'support','supports','supported','provide','provides','provided',
                'join','joins','joined','lead','leads','led',
                'create','creates','created','build','builds','built',
                'reach','reaches','reached','reduce','reduces','reduced',
                'increase','increases','increased','report','reports','reported',
                'save','saves','saved','choose','chose','chosen','chooses',
                'share','shares','shared','send','sends','sent',
                'check','checks','checked','change','changes','changed',
                'follow','follows','followed','ask','asks','asked',
                'answer','answers','answered','allow','allows','allowed',
                'involve','involves','involved','require','requires','required',
                'happen','happens','happened','appear','appears','appeared',
                'seem','seems','seemed','love','loves','loved',
                'enjoy','enjoys','enjoyed','miss','misses','missed',
                'hope','hopes','hoped','wish','wishes','wished',
                'hire','hires','hired','fire','fires','fired',
                'sign','signs','signed','check','checks','checked',
                'meet','meets','met','pay','pays','paid',
                'spend','spends','spent','earn','earns','earned',
                'decide','decides','decided','agree','agrees','agreed',
                'disagree','disagrees','disagreed','refuse','refuses','refused'],
  nouns:      ['teacher','doctor','manager','driver','engineer','programmer','lawyer','colleague','friend',
                'sister','brother','student','mother','father','husband','wife','son','daughter','partner',
                'office','school','hospital','city','country','home','house','car','phone','book','plan',
                'idea','project','meeting','ticket','passport','key','wallet','bag','name','time','day',
                'week','month','year','morning','evening','night','holiday','trip','hotel','restaurant','bank',
                'technology','technologies','solution','solutions','decision','decisions',
                'news','problem','problems','business','businesses',
                'blog','blogs','email','emails','presentation','presentations',
                'podcast','podcasts','article','articles','lunch','coffee',
                'guitar','supermarket','supermarkets','word','words',
                'contract','contracts','document','documents','budget','budgets',
                'service','services','skill','skills','salary','salaries',
                'company','companies','course','courses','sport','sports',
                'information','experience','experiences','report','reports',
                'task','tasks','result','results','advice','goal','goals',
                'question','questions','answer','answers','letter','letters',
                'message','messages','number','numbers','habit','habits',
                'interview','interviews','event','events','reason','reasons',
                'issue','issues','system','systems','data','software',
                'programme','programs','program','programmes',
                'rule','rules','method','methods','subject','subjects',
                'fact','facts','detail','details','point','points',
                'topic','topics','level','levels','type','types',
                'market','markets','industry','industries','sector','sectors',
                'cost','costs','price','prices','profit','profits',
                'product','products','project','projects','process','processes',
                'team','department','departments','role','roles','position','positions',
                'record','records','list','lists','note','notes','comment','comments',
                'mistake','mistakes','error','errors','success','failure',
                'opportunity','opportunities','challenge','challenges','solution'],
  adjectives: ['tired','busy','ready','young','old','smart','tall','short','free','happy','right','wrong',
                'good','great','easy','hard','new','big','small','long','fast','slow','early','late',
                'important','serious','comfortable','expensive','cheap','modern','popular','beautiful',
                'experienced','favourite','favorite','kind','lovely','wonderful','excellent','brilliant','professional','friendly','creative','skilled','qualified','terrible','awful','amazing','perfect','typical','natural','special','similar','different','straight','complex','obvious','confident','patient','polite','rude','strict','gentle','generous','honest','clever','brave','calm','quiet','loud','plain','sharp','raw','rare','pure','soft','rough','tough','deep','wide','narrow','thick','thin','light','dark','clear','bright','smooth','flat',
                'difficult','latest','recent','weekly','daily','monthly','annual','necessary',
                'local','national','international','global','main','major','current',
                'high','low','full','real','actual','various','common','general',
                'specific','certain','possible','available','useful','effective','successful',
                'responsible','junior','senior','civil','next','previous',
                'strong','weak','rich','poor','healthy','sick','safe','dangerous',
                'interesting','boring','exciting','funny','serious','formal','informal',
                'open','closed','positive','negative','direct','indirect'],
  adverbs:    ['very','here','home','now','today','together','away','far','always','usually','often',
                'sometimes','rarely','never','already','yet','just','recently','still','again','also',
                'probably','definitely','perhaps','soon','quickly','slowly','well','hard','really','finally'],
  articles:   ['a','an','the','my','your','his','her','our','their','its','this','that','these','those'],
  question:   ['what','where','how','who','why','when','which','whose'],
  numbers:    ['one','two','three','four','five','ten','twenty','thirty','fifty','hundred','first','last'],
  timeUnits:  ['second','minute','hour','day','week','month','year','moment','morning','afternoon','evening','night','time','while',
                'summer','winter','spring','autumn','fall','weekend','weekends','weekday','weekdays','season','seasons'],
  prepositions:['in','on','at','to','for','with','from','by','about','after','before','during','until',
                 'since','between','behind','under','over','near','opposite','through','into','next'],
  conjunctions:['and','or','but','because','although','while','when','if','unless','since','until',
                 'whereas','however','therefore','furthermore','nevertheless','despite','though'],
  modals:     ['can','could','will','would','should','must','may','might','shall','need'],
  misc:       ['yes','no','not','like','fine','okay','everything','something','nothing','anyone',
                'someone','everyone','nowhere','somewhere','everywhere','ago','back','up','down','out','off'],
  jobs:       ['doctor','lawyer','teacher','engineer','nurse','manager','designer','programmer','accountant',
                'chef','driver','pilot','architect','scientist','journalist','artist','musician','actor',
                'writer','professor','student','secretary','receptionist','director','assistant','mechanic',
                'plumber','electrician','dentist','pharmacist','firefighter','officer','soldier','coach',
                'trainer','analyst','consultant','developer','investor','farmer','baker','butcher'],
  // CHANGE v4: removed multi-word entries ("am not","was not","were not","be not") — rule: each distractor must be a single word.
  // Only contractions like "isn't","weren't" are allowed since they are one orthographic unit.
  toBe_neg:   ["isn't","aren't","wasn't","weren't"],
  // CHANGE v4: removed "don't have","doesn't have","didn't have","have got","has got" — all multi-word.
  have:       ['have','has','had'],
  // CHANGE v4: "there is","there are",… are all multi-word — replaced with single-word location adverbs
  // so that "there" as a word in a phrase gets sensible distractors.
  there:      ['there','here','where','somewhere','anywhere','everywhere','nowhere'],
  // CHANGE v4: removed "have been","has been","will be" — multi-word.
  passive:    ['was','were','been','is','are','by','being'],
  perfect:    ['have','has','had','been','done','gone','seen','taken','made','written','spoken','eaten'],
  continuous: ['is','are','was','were','am','being','working','going','coming','doing','saying','getting'],
  conditional:['if','would','could','might','should','were','had','unless','when','will','can','shall'],
  // CHANGE v4: removed "said that","told me","asked if" — multi-word.
  reported:   ['said','told','asked','thought','knew','heard'],
  // CHANGE v4: removed "by myself","on my own" — multi-word.
  reflexive:  ['myself','yourself','himself','herself','itself','ourselves','yourselves','themselves'],
  gerund:     ['working','going','coming','doing','saying','getting','making','taking','having','being',
                'reading','writing','playing','eating','drinking','sleeping','studying','watching','listening'],
  // NOTE v4: phrasal pool kept for reference but REMOVED from SEMANTIC_POOLS — all entries are multi-word
  // and must never appear as distractors (e.g. "get up","turn on" cannot be single-cell distractors).
  phrasal:    ['get up','turn on','turn off','look for','give up','find out','come back','put on','take off',
                'go on','pick up','set up','carry on','look up','bring up','hold on','run out','break down'],
  relative:   ['who','which','that','whose','where','when','whom'],
  complex:    ['want','expect','ask','tell','make','let','allow','need','see','hear','watch','feel','help'],
  // NOTE v4: usedto pool kept for reference but REMOVED from SEMANTIC_POOLS — all entries are multi-word.
  usedto:     ['used to','would','was used to','get used to','am used to','be used to'],
  comparison: ['more','less','most','least','better','worse','best','worst','than','as','very','quite'],
  // Physical objects (singular + plural so plurality matching works)
  objects:    ['table','tables','chair','chairs','bottle','bottles','window','windows','door','doors',
                'carpet','carpets','cup','cups','glass','glasses','plate','plates','box','boxes',
                'bag','bags','key','keys','pen','pens','pencil','pencils','lamp','lamps',
                'bed','beds','sofa','sofas','desk','desks','wall','walls','floor','floors',
                'bowl','bowls','fork','forks','spoon','spoons','flower','flowers','ball','balls',
                'toy','toys','letter','letters','card','cards','photo','photos','map','maps',
                'coat','coats','hat','hats','umbrella','umbrellas','shelf','shelves','book','books',
                'notebook','notebooks','phone','phones','ticket','tickets','passport','passports',
                'wallet','wallets','knife','knives','coin','coins','ring','rings','watch','watches'],
  // People words (singular + plural)
  people:     ['teacher','teachers','doctor','doctors','manager','managers','driver','drivers',
                'engineer','engineers','programmer','programmers','lawyer','lawyers',
                'colleague','colleagues','friend','friends','sister','sisters','brother','brothers',
                'student','students','mother','mothers','father','fathers','husband','husbands',
                'wife','wives','son','sons','daughter','daughters','partner','partners',
                'man','men','woman','women','boy','boys','girl','girls','person','people',
                'child','children','boss','bosses','customer','customers','client','clients',
                'visitor','visitors','neighbor','neighbors','stranger','strangers',
                'specialist','specialists','expert','experts','team','teams','professional','professionals','analyst','analysts','leader','leaders','member','members','participant','participants','volunteer','volunteers','citizen','citizens','resident','residents'],
  // Places / locations
  places:     ['office','offices','school','schools','hospital','hospitals','hotel','hotels',
                'restaurant','restaurants','bank','banks','shop','shops','market','markets',
                'park','parks','station','stations','airport','airports','museum','museums',
                'cafe','cafes','gym','gyms','beach','beaches','garden','gardens',
                'kitchen','bedroom','bathroom','classroom','library','theatre','cinema',
                'city','cities','country','countries','home','house','houses','room','rooms'],
};

// CHANGELOG v5: CONTRACTION_MAP — maps each contraction to its expanded token pair.
// Used for branching: when expected word is "don't", show both "don't" AND "do" as valid choices.
// If student picks "do", the next expected word becomes "not" (collected before advancing).
// "n't" is NEVER shown as a separate token. Only [contracted, expanded_first] in one step.
const CONTRACTION_MAP: Record<string, [string, string]> = {
  "don't":    ["do",    "not"],
  "doesn't":  ["does",  "not"],
  "didn't":   ["did",   "not"],
  "won't":    ["will",  "not"],
  "can't":    ["can",   "not"],
  "couldn't": ["could", "not"],
  "shouldn't":["should","not"],
  "wouldn't": ["would", "not"],
  "haven't":  ["have",  "not"],
  "hadn't":   ["had",   "not"],
  "hasn't":   ["has",   "not"],
  "isn't":    ["is",    "not"],
  "aren't":   ["are",   "not"],
  "wasn't":   ["was",   "not"],
  "weren't":  ["were",  "not"],
  "needn't":  ["need",  "not"],
  "mustn't":  ["must",  "not"],
  "it's":     ["it",    "is"],
  "that's":   ["that",  "is"],
  "there's":  ["there", "is"],
  "what's":   ["what",  "is"],
  "he's":     ["he",    "is"],
  "she's":    ["she",   "is"],
  "I'm":      ["I",     "am"],
  "I've":     ["I",     "have"],
  "I'll":     ["I",     "will"],
  "I'd":      ["I",     "would"],
  "you're":   ["you",   "are"],
  "we're":    ["we",    "are"],
  "they're":  ["they",  "are"],
  "you've":   ["you",   "have"],
  "we've":    ["we",    "have"],
  "they've":  ["they",  "have"],
  "you'll":   ["you",   "will"],
  "he'll":    ["he",    "will"],
  "she'll":   ["she",   "will"],
  "we'll":    ["we",    "will"],
  "they'll":  ["they",  "will"],
  "you'd":    ["you",   "would"],
  "he'd":     ["he",    "would"],
  "she'd":    ["she",   "would"],
  "we'd":     ["we",    "would"],
  "they'd":   ["they",  "would"],
  "let's":    ["let",   "us"],
};

// Дополнительные пулы для конкретных тем уроков
const LESSON_TOPIC_POOLS: Record<number, (keyof typeof WORD_POOLS_L1)[]> = {
  1:  ['pronouns','toBe','adjectives','nouns'],
  2:  ['pronouns','toBe','toBe_neg','adjectives'],
  3:  ['verbs','adverbs','nouns','pronouns'],
  4:  ['verbs','negation','modals','adverbs'],
  5:  ['verbs','negation','question','adverbs'],
  6:  ['question','prepositions','adverbs','pronouns'],
  7:  ['have','verbs','nouns','pronouns'],
  8:  ['prepositions','nouns','adverbs','articles'],
  9:  ['there','prepositions','articles','nouns'],
  10: ['modals','verbs','negation','adverbs'],
  11: ['verbs','adverbs','nouns','prepositions'],
  12: ['verbs','adverbs','nouns','prepositions'],
  13: ['modals','verbs','adverbs','nouns'],
  14: ['comparison','adjectives','adverbs','nouns'],
  15: ['articles','pronouns','nouns','adjectives'],
  16: ['phrasal','verbs','adverbs','prepositions'],
  17: ['continuous','toBe','adverbs','verbs'],
  18: ['verbs','negation','adverbs','nouns'],
  19: ['prepositions','articles','nouns','adverbs'],
  20: ['articles','nouns','adjectives','pronouns'],
  21: ['misc','pronouns','adverbs','adjectives'],
  22: ['gerund','verbs','nouns','adverbs'],
  23: ['passive','verbs','adverbs','prepositions'],
  24: ['perfect','verbs','adverbs','nouns'],
  25: ['continuous','toBe','adverbs','verbs'],
  26: ['conditional','verbs','modals','adverbs'],
  27: ['reported','verbs','pronouns','adverbs'],
  28: ['reflexive','pronouns','verbs','adverbs'],
  29: ['usedto','verbs','adverbs','modals'],
  30: ['relative','pronouns','verbs','nouns'],
  31: ['complex','verbs','pronouns','nouns'],
  32: ['verbs','modals','adverbs','prepositions'],
};


// Группы форм глаголов — когда правильный ответ это форма глагола,
// дистракторы берутся из той же группы (run → runs/ran/running/is running)
const VERB_FORM_GROUPS: string[][] = [
  ['run','runs','ran','running','is running','was running','has run','will run'],
  ['go','goes','went','going','is going','was going','has gone','will go'],
  ['work','works','worked','working','is working','was working','has worked','will work'],
  ['play','plays','played','playing','is playing','was playing','has played','will play'],
  ['study','studies','studied','studying','is studying','was studying','has studied','will study'],
  ['read','reads','reading','is reading','was reading','has read','will read'],
  ['write','writes','wrote','writing','is writing','was writing','has written','will write'],
  ['speak','speaks','spoke','speaking','is speaking','was speaking','has spoken','will speak'],
  ['eat','eats','ate','eating','is eating','was eating','has eaten','will eat'],
  ['drink','drinks','drank','drinking','is drinking','was drinking','has drunk','will drink'],
  ['sleep','sleeps','slept','sleeping','is sleeping','was sleeping','has slept','will sleep'],
  ['drive','drives','drove','driving','is driving','was driving','has driven','will drive'],
  ['come','comes','came','coming','is coming','was coming','has come','will come'],
  ['take','takes','took','taking','is taking','was taking','has taken','will take'],
  ['make','makes','made','making','is making','was making','has made','will make'],
  ['give','gives','gave','giving','is giving','was giving','has given','will give'],
  ['find','finds','found','finding','is finding','was finding','has found','will find'],
  ['know','knows','knew','knowing','is knowing','was knowing','has known','will know'],
  ['think','thinks','thought','thinking','is thinking','was thinking','has thought','will think'],
  ['get','gets','got','getting','is getting','was getting','has got','will get'],
  ['see','sees','saw','seeing','is seeing','was seeing','has seen','will see'],
  ['say','says','said','saying','is saying','was saying','has said','will say'],
  ['tell','tells','told','telling','is telling','was telling','has told','will tell'],
  ['buy','buys','bought','buying','is buying','was buying','has bought','will buy'],
  ['bring','brings','brought','bringing','is bringing','was bringing','has brought','will bring'],
  ['start','starts','started','starting','is starting','was starting','has started','will start'],
  ['finish','finishes','finished','finishing','is finishing','was finishing','has finished','will finish'],
  ['help','helps','helped','helping','is helping','was helping','has helped','will help'],
  ['open','opens','opened','opening','is opening','was opening','has opened','will open'],
  ['close','closes','closed','closing','is closing','was closing','has closed','will close'],
  ['watch','watches','watched','watching','is watching','was watching','has watched','will watch'],
  ['listen','listens','listened','listening','is listening','was listening','has listened','will listen'],
  ['travel','travels','travelled','travelling','is travelling','was travelling','has travelled','will travel'],
  ['visit','visits','visited','visiting','is visiting','was visiting','has visited','will visit'],
  ['move','moves','moved','moving','is moving','was moving','has moved','will move'],
  ['live','lives','lived','living','is living','was living','has lived','will live'],
  ['do','does','did','doing','is doing','was doing','has done','will do'],
  ['use','uses','used','using','is using','was using','has used','will use'],
  ['try','tries','tried','trying','is trying','was trying','has tried','will try'],
  ['want','wants','wanted','wanting','is wanting','was wanting','has wanted','will want'],
  ['like','likes','liked','liking','is liking','was liking','has liked','will like'],
  ['need','needs','needed','needing','is needing','was needing','has needed','will need'],
  ['stop','stops','stopped','stopping','is stopping','was stopping','has stopped','will stop'],
  ['call','calls','called','calling','is calling','was calling','has called','will call'],
  ['ask','asks','asked','asking','is asking','was asking','has asked','will ask'],
  ['answer','answers','answered','answering','is answering','was answering','has answered','will answer'],
  ['prepare','prepares','prepared','preparing','is preparing','was preparing','has prepared','will prepare'],
  ['arrive','arrives','arrived','arriving','is arriving','was arriving','has arrived','will arrive'],
  ['leave','leaves','left','leaving','is leaving','was leaving','has left','will leave'],
  ['stay','stays','stayed','staying','is staying','was staying','has stayed','will stay'],
  ['sit','sits','sat','sitting','is sitting','was sitting','has sat','will sit'],
  ['stand','stands','stood','standing','is standing','was standing','has stood','will stand'],
  ['pass','passes','passed','passing','is passing','was passing','has passed','will pass'],
  ['break','breaks','broke','breaking','is breaking','was breaking','has broken','will break'],
  ['check','checks','checked','checking','is checking','was checking','has checked','will check'],
  ['change','changes','changed','changing','is changing','was changing','has changed','will change'],
  ['wait','waits','waited','waiting','is waiting','was waiting','has waited','will wait'],
  ['meet','meets','met','meeting','is meeting','was meeting','has met','will meet'],
  ['send','sends','sent','sending','is sending','was sending','has sent','will send'],
  ['show','shows','showed','showing','is showing','was showing','has shown','will show'],
  ['put','puts','putting','is putting','was putting','has put','will put'],
  ['keep','keeps','kept','keeping','is keeping','was keeping','has kept','will keep'],
  ['pay','pays','paid','paying','is paying','was paying','has paid','will pay'],
  ['forget','forgets','forgot','forgetting','is forgetting','was forgetting','has forgotten','will forget'],
  ['remember','remembers','remembered','remembering','is remembering','was remembering','has remembered','will remember'],
  ['understand','understands','understood','understanding','is understanding','was understanding','has understood','will understand'],
  ['feel','feels','felt','feeling','is feeling','was feeling','has felt','will feel'],
  ['hear','hears','heard','hearing','is hearing','was hearing','has heard','will hear'],
  ['lose','loses','lost','losing','is losing','was losing','has lost','will lose'],
  ['win','wins','won','winning','is winning','was winning','has won','will win'],
  ['turn','turns','turned','turning','is turning','was turning','has turned','will turn'],
  ['walk','walks','walked','walking','is walking','was walking','has walked','will walk'],
  ['talk','talks','talked','talking','is talking','was talking','has talked','will talk'],
  ['look','looks','looked','looking','is looking','was looking','has looked','will look'],
  ['follow','follows','followed','following','is following','was following','has followed','will follow'],
  ['choose','chooses','chose','choosing','is choosing','was choosing','has chosen','will choose'],
  ['learn','learns','learned','learning','is learning','was learning','has learned','will learn'],
  ['teach','teaches','taught','teaching','is teaching','was teaching','has taught','will teach'],
  ['show','shows','showed','showing','is showing','was showing','has shown','will show'],
  ['spend','spends','spent','spending','is spending','was spending','has spent','will spend'],
  ['enjoy','enjoys','enjoyed','enjoying','is enjoying','was enjoying','has enjoyed','will enjoy'],
  ['miss','misses','missed','missing','is missing','was missing','has missed','will miss'],
  ['try','tries','tried','trying','is trying','was trying','has tried','will try'],
  ['carry','carries','carried','carrying','is carrying','was carrying','has carried','will carry'],
  ['have','has','had','having','is having','was having','has had','will have'],
];

// ════════════════════════════════════════════════════════════════════════════════════
// LESSON 1: INTELLIGENT DISTRACTOR SELECTION
// Uses position-aware distractor logic for better learning outcomes
// ════════════════════════════════════════════════════════════════════════════════════
// ==================== NEW: Per-word distractor logic ====================
const getPerWordDistracts = (phrase: any, wordIndex: number = 0): string[] => {
  const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

  // NEW format: phrase has .words array with explicit distractors
  if (phrase && phrase.words && phrase.words[wordIndex]) {
    const wordData = phrase.words[wordIndex];
    const allOptions = [wordData.correct, ...wordData.distractors];
    return shuffle(allOptions);
  }

  // Fallback for old format (shouldn't happen with new lesson data)
  return [];
};

const makeSmartOptionsL1 = (english: string, wordIndex: number = 0): string[] => {
  const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

  // Find the phrase structure from L1_PHRASE_STRUCTURES
  const phraseStr = L1_PHRASE_STRUCTURES.find(ps =>
    ps.phrase.toLowerCase() === english.toLowerCase()
  );

  if (!phraseStr || !phraseStr.tokens[wordIndex]) {
    // Fall back to regular makeSmartOptions if phrase not found in structures
    return [];
  }

  const token = phraseStr.tokens[wordIndex];
  const correctWord = token.word;

  // Get smart distractors based on position and category
  const previousTokens = phraseStr.tokens
    .slice(0, wordIndex)
    .map(t => t.word);

  const distractors = getDistractorsForWord(correctWord, token.category, previousTokens);

  // Return correct word + 5-6 distractors, shuffled
  return shuffle([correctWord, ...distractors.slice(0, 5)]);
};

const makeSmartOptions = (english: string, wordIndex: number = 0, lessonId: number = 1): string[] => {
  const normalizePool = (w: string) => w.toLowerCase() === 'i' ? 'I' : w.toLowerCase();
  const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

  // Phrasal-aware token array (phrasal verbs merged into single tokens)
  const allWords = tokenizePhrase(english);

  const correctWord = allWords[wordIndex] ?? allWords[0];

  // Phrasal verb token (e.g. "get up", "turn on") — use other phrasal verbs as distractors
  if (correctWord.includes(' ')) {
    const pool = WORD_POOLS_L1.phrasal.filter(p => p !== correctWord);
    return shuffle([correctWord, ...shuffle(pool).slice(0, 5)]);
  }

  // Дни недели → только дни недели
  if (WORD_POOLS_L1.days.includes(correctWord)) {
    const pool = WORD_POOLS_L1.days.filter(d => d !== correctWord);
    return shuffle([correctWord, ...shuffle(pool).slice(0, 5)]);
  }
  // Месяцы → только месяцы (но не модальные глаголы типа "May" в начале предложения)
  if (WORD_POOLS_L1.months.includes(correctWord) && !WORD_POOLS_L1.modals.includes(correctWord.toLowerCase())) {
    const pool = WORD_POOLS_L1.months.filter(m => m !== correctWord);
    return shuffle([correctWord, ...shuffle(pool).slice(0, 5)]);
  }

  // Определяем тип имени собственного и подбираем нужный пул дистракторов
  if (WORD_POOLS_L1.cities.includes(correctWord)) {
    const pool = WORD_POOLS_L1.cities.filter(c => c !== correctWord);
    return shuffle([correctWord, ...shuffle(pool).slice(0, 5)]);
  }
  if (WORD_POOLS_L1.languages.includes(correctWord)) {
    const pool = WORD_POOLS_L1.languages.filter(l => l !== correctWord);
    return shuffle([correctWord, ...shuffle(pool).slice(0, 5)]);
  }
  // Прочие имена собственные (заглавная в середине предложения) — города как дефолт
  // Исключаем: обычные нарицательные существительные, стоящие в начале предложения с заглавной буквы
  const SENTENCE_START_COMMON = new Set([
    'management','managers','leadership','investors','investor',
    'staff','employees','workers','colleagues','clients','customers',
    'everyone','everything','something','nothing','nobody','somebody',
    'anyone','anywhere','someone','somewhere','anyone','nobody',
  ]);
  const isProperNoun = correctWord !== 'I' && correctWord.length > 0 &&
    correctWord[0] !== correctWord[0].toLowerCase() &&
    !SENTENCE_START_COMMON.has(correctWord.toLowerCase());
  if (isProperNoun) {
    const pool = WORD_POOLS_L1.cities.filter(c => c !== correctWord);
    return shuffle([correctWord, ...shuffle(pool).slice(0, 5)]);
  }

  // RULE v4: every distractor must be a single orthographic word — no spaces.
  // Contractions (don't, isn't) are fine — they have no space and are one unit.
  const singleWord = (w: string) => !w.includes(' ');

  // CHANGE v5: contraction branching — when the correct word is a contraction,
  // show BOTH the contracted form AND the first expanded token as valid choices.
  // If user picks expanded[0] (e.g. "do"), the next step will ask for expanded[1] ("not").
  const contrBranch = CONTRACTION_MAP[correctWord]
    ?? CONTRACTION_MAP[correctWord.charAt(0).toUpperCase() + correctWord.slice(1)];
  if (contrBranch) {
    const [expandedFirst] = contrBranch;
    const contrDistPool = [
      ...WORD_POOLS_L1.negation,
      ...WORD_POOLS_L1.modals,
      ...WORD_POOLS_L1.toBe,
      ...WORD_POOLS_L1.verbs,
    ].filter(w => singleWord(w) && w !== correctWord && w.toLowerCase() !== expandedFirst.toLowerCase());
    return shuffle([correctWord, expandedFirst, ...shuffle(contrDistPool).slice(0, 4)]);
  }

  // Отрицательные формы (don't / isn't / can't / won't…) — только отрицания
  const NEGATION_FORMS = [
    "don't","doesn't","didn't","won't","can't","couldn't","shouldn't","wouldn't",
    "haven't","hadn't","hasn't","isn't","aren't","wasn't","weren't","needn't","mustn't",
    "shan't","mightn't","daren't","not","never",
  ];
  if (NEGATION_FORMS.includes(correctWord)) {
    const pool = NEGATION_FORMS.filter(n => n !== correctWord);
    return shuffle([correctWord, ...shuffle(pool).slice(0, 5)]);
  }

  // Глагольные формы — когда правильное слово является формой глагола,
  // используем другие формы того же глагола как дистракторы.
  // CHANGE v4: multi-word forms ("is running","has gone","will do") kept in VERB_FORM_GROUPS
  // for identification purposes but FILTERED OUT from distractors (singleWord guard).
  // If single-word forms are not enough, supplement from the general verbs pool.
  const verbGroup = VERB_FORM_GROUPS.find(g => g.includes(correctWord));
  if (verbGroup) {
    const pool = verbGroup.filter(f => f !== correctWord && singleWord(f));
    let distractors = shuffle(pool).slice(0, 5);
    if (distractors.length < 5) {
      const extras = WORD_POOLS_L1.verbs
        .filter(v => singleWord(v) && v !== correctWord && !distractors.includes(v));
      distractors = [...distractors, ...shuffle(extras)].slice(0, 5);
    }
    return shuffle([correctWord, ...distractors]);
  }

  // CHANGELOG v3: Disambiguation pools — 6 choices total (1 correct + 5 distractors).
  // Rules: distractors must NOT be words that also grammatically fit the sentence.
  // it/this/that all mean "это" in Russian → never use as distractors for each other.
  // can/may both express permission → never pair as distractors.
  // a/an: wrong article sound prevents substitution. the: keep with a/an for article learning.
  // Possessives: Russian context disambiguates which possessive is correct → safe to pair.
  const DISAMBIG_POOLS: Partial<Record<string, string[]>> = {
    // it/this/that/these/those: all map to "это/эти" — distractors from verb/adverb categories
    'it':    ['done', 'going', 'often', 'already', 'because'],
    'this':  ['done', 'going', 'often', 'already', 'because'],
    'that':  ['worked', 'going', 'often', 'always',  'because'],
    'these': ['done', 'going', 'often', 'already', 'since'],
    'those': ['worked', 'going', 'often', 'always',  'since'],
    // can/may: both = permission/ability — use obligation modal + non-modals
    'can':   ['must', 'should', 'had', 'done', 'often'],
    'may':   ['must', 'should', 'had', 'done', 'often'],
    'such':  ['so', 'very', 'quite', 'really', 'rather', 'pretty'],
    'so':    ['such', 'very', 'quite', 'really', 'rather', 'pretty'],
    // Articles: 'an' before vowel vs 'a' before consonant is a real distinction
    'a':     ['an', 'was', 'did', 'very', 'often'],
    'an':    ['a',  'was', 'did', 'very', 'often'],
    'the':   ['a',  'an', 'was', 'did',  'very'],
    // Possessives: Russian disambiguates context — keep within possessive set
    'my':    ['your', 'his', 'her', 'our', 'their'],
    'your':  ['my',   'his', 'her', 'our', 'their'],
    'his':   ['my',  'your', 'her', 'our', 'their'],
    'her':   ['my',  'your', 'his', 'our', 'their'],
    'our':   ['my',  'your', 'his', 'her', 'their'],
    'their': ['my',  'your', 'his', 'her', 'our'],
    'its':   ['my',  'your', 'his', 'her', 'our'],
    // ── L1 CONTENT NOUNS — ручные дистракторы ────────────────────────────
    'project':      ['plan','task','idea','report','proposal'],
    'projects':     ['plans','tasks','ideas','reports','proposals'],
    'phone':        ['laptop','tablet','computer','device','charger'],
    'phones':       ['laptops','tablets','computers','devices','gadgets'],
    'book':         ['magazine','newspaper','report','article','document'],
    'books':        ['magazines','newspapers','reports','articles','documents'],
    'meeting':      ['conference','interview','workshop','presentation','discussion'],
    'meetings':     ['conferences','interviews','workshops','presentations','discussions'],
    'city':         ['town','village','country','capital','region'],
    'team':         ['group','department','class','staff','crew'],
    'teams':        ['groups','departments','classes','workers','crews'],
    'person':       ['member','colleague','individual','employee','specialist'],
    'partner':      ['colleague','client','employee','consultant','associate'],
    'partners':     ['colleagues','clients','employees','consultants','associates'],
    'colleague':    ['partner','employee','client','assistant','member'],
    'colleagues':   ['partners','employees','clients','assistants','members'],
    'neighbour':    ['colleague','friend','partner','guest','visitor'],
    'neighbours':   ['colleagues','friends','partners','guests','visitors'],
    'neighbor':     ['colleague','friend','partner','guest','visitor'],
    'neighbors':    ['colleagues','friends','partners','guests','visitors'],
    'client':       ['customer','partner','visitor','colleague','user'],
    'clients':      ['customers','partners','visitors','colleagues','users'],
    'specialist':   ['expert','consultant','professional','analyst','adviser'],
    'specialists':  ['experts','consultants','professionals','analysts','advisers'],
    'analyst':      ['specialist','consultant','manager','researcher','expert'],
    'analysts':     ['specialists','consultants','managers','researchers','experts'],
    'students':     ['colleagues','employees','clients','workers','members'],
    'parents':      ['relatives','siblings','friends','colleagues','guardians'],
    'drivers':      ['workers','employees','colleagues','managers','staff'],
    'home':         ['office','work','school','abroad','university'],
    'answer':       ['question','solution','result','response','option'],
    // ── L1 ADJECTIVES — ручные дистракторы ───────────────────────────────
    'young':        ['old','senior','junior','experienced','new'],
    'tall':         ['short','slim','strong','thin','heavy'],
    'smart':        ['clever','creative','talented','capable','brilliant'],
    'ready':        ['available','prepared','active','present','able'],
    'free':         ['busy','available','open','active','absent'],
    'busy':         ['free','tired','active','occupied','available'],
    'tired':        ['busy','free','bored','stressed','sick'],
    'easy':         ['hard','simple','clear','fast','direct'],
    'hard':         ['easy','tough','complex','difficult','challenging'],
    'important':    ['urgent','critical','significant','major','serious'],
    'comfortable':  ['pleasant','cozy','warm','quiet','relaxing'],
    'expensive':    ['cheap','costly','affordable','valuable','pricey'],
    'modern':       ['classic','traditional','current','recent','latest'],
    'beautiful':    ['lovely','elegant','charming','attractive','stunning'],
    'experienced':  ['skilled','qualified','talented','competent','expert'],
    'kind':         ['nice','warm','friendly','gentle','caring'],
    'civil':        ['structural','mechanical','electrical','industrial','chemical'],
    'senior':       ['junior','lead','chief','head','principal'],
    'right':        ['wrong','correct','exact','proper','suitable'],
    'big':          ['small','large','huge','wide','massive'],
    'favourite':    ['best','main','top','preferred','special'],
    'favorite':     ['best','main','top','preferred','special'],
    // ── L1 PROFESSIONS — ручные дистракторы ──────────────────────────────
    'engineer':     ['programmer','architect','developer','technician','consultant'],
    'programmer':   ['developer','engineer','designer','analyst','technician'],
    'lawyer':       ['consultant','notary','accountant','advisor','director'],
    'accountant':   ['auditor','analyst','economist','treasurer','advisor'],
    'dentist':      ['surgeon','therapist','pharmacist','specialist','dermatologist'],
    'consultant':   ['adviser','specialist','expert','analyst','coach'],
    'surgeon':      ['therapist','pharmacist','dentist','specialist','radiologist'],
    // ── to-be forms — always include "is" as distractor for "are" and vice versa
    'are':  ['is', 'was', 'were', 'am', 'been'],
    'is':   ['are', 'was', 'were', 'am', 'been'],
    'was':  ['is', 'are', 'were', 'be', 'been'],
    'were': ['was', 'are', 'is', 'be', 'been'],
    'am':   ['is', 'are', 'was', 'were', 'be'],
    'be':   ['is', 'are', 'was', 'were', 'been'],
    // Core prepositions: in/at/on/to/for all overlap in location/time/beneficiary contexts.
    // Distractors: temporal/negating prepositions that never substitute for these.
    'in':   ['since', 'before', 'during', 'without', 'across', 'until'],
    'at':   ['since', 'before', 'during', 'without', 'across', 'until'],
    'on':   ['since', 'before', 'during', 'without', 'across', 'until'],
    'to':   ['since', 'before', 'during', 'without', 'across', 'until'],
    'for':  ['since', 'before', 'during', 'without', 'across', 'until'],
    'of':   ['since', 'before', 'during', 'without', 'across', 'until'],
    'with': ['since', 'before', 'during', 'without', 'across', 'until'],
    'from': ['before', 'during', 'without', 'across', 'until', 'between'],
    'by':   ['since', 'before', 'during', 'without', 'across', 'until'],
    'into': ['since', 'before', 'during', 'without', 'across', 'until'],
    // 'since' overlaps with 'from' for duration — exclude 'from' from distractors
    'since':['before', 'during', 'without', 'across', 'until', 'between'],
    // Prepositions missing from pool
    'without': ['despite','except','beyond','against','outside'],
    'about':   ['around','over','across','beyond','through'],
    'until':   ['before','after','since','during','unless'],
    'after':   ['before','during','since','until','within'],
    'before':  ['after','during','since','until','within'],
    'through': ['across','over','along','past','beyond'],
    'over':    ['under','above','across','beyond','past'],
    'under':   ['over','above','below','behind','beside'],
    'between': ['among','within','beside','across','behind'],
    'near':    ['beside','behind','opposite','above','below'],
    'during':  ['before','after','since','until','while'],
    // ── L32 NOUNS — ручные дистракторы ───────────────────────────────────
    'strategy':     ['plan','approach','method','policy','framework'],
    'strategies':   ['plans','approaches','methods','policies','frameworks'],
    'board':        ['team','council','committee','panel','management'],
    'directors':    ['managers','executives','officers','partners','shareholders'],
    'security':     ['safety','privacy','protection','access','defence'],
    'folder':       ['file','archive','directory','cabinet','binder'],
    'market':       ['industry','sector','economy','competition','area'],
    'markets':      ['industries','sectors','economies','regions','areas'],
    'calendar':     ['schedule','planner','agenda','timetable','diary'],
    'way':          ['method','approach','means','option','path'],
    'candidate':    ['applicant','nominee','professional','expert','employee'],
    'history':      ['story','background','record','tradition','experience'],
    'quality':      ['standard','level','performance','grade','value'],
    'backup':       ['copy','file','version','record','archive'],
    'manual':       ['guide','handbook','instructions','reference','document'],
    'midnight':     ['morning','evening','noon','dawn','sunrise'],
    'town':         ['city','village','district','area','suburb'],
    'plan':         ['proposal','strategy','schedule','idea','approach'],
    'plans':        ['proposals','strategies','schedules','ideas','approaches'],
    'place':        ['event','time','chance','space','location'],
    'success':      ['achievement','result','outcome','progress','improvement'],
    'CV':           ['resume','portfolio','profile','application','document'],
    'director':     ['manager','executive','officer','chairman','principal'],
    // ── L32 ADJECTIVES — ручные дистракторы ──────────────────────────────
    'honest':       ['fair','open','direct','sincere','transparent'],
    'proud':        ['happy','pleased','satisfied','glad','confident'],
    'beneficial':   ['useful','valuable','profitable','positive','helpful'],
    'digital':      ['online','virtual','electronic','automated','technical'],
    'large':        ['big','huge','significant','considerable','major'],
    'high':         ['low','strong','great','significant','full'],
    'last':         ['first','next','previous','final','recent'],
    'different':    ['similar','other','various','new','alternative'],
    'selected':     ['chosen','hired','appointed','approved','promoted'],
    'difficult':    ['easy','complex','simple','challenging','serious'],
    // ── L32 VERBS (не в VERB_FORM_GROUPS) — ручные дистракторы ──────────
    'cancelled':    ['postponed','delayed','moved','rescheduled','suspended'],
    'canceled':     ['postponed','delayed','moved','rescheduled','suspended'],
    'received':     ['sent','given','written','prepared','delivered'],
    'expect':       ['require','need','demand','ask','want'],
    'expects':      ['requires','needs','demands','asks','wants'],
    'expected':     ['required','needed','planned','arranged','decided'],
    'admitted':     ['confirmed','revealed','explained','mentioned','acknowledged'],
    'admit':        ['confirm','reveal','explain','mention','acknowledge'],
    'avoids':       ['refuses','stops','prevents','dislikes','ignores'],
    'avoid':        ['refuse','stop','prevent','dislike','ignore'],
    'existed':      ['operated','worked','remained','continued','survived'],
    'exist':        ['operate','work','remain','continue','survive'],
    'recorded':     ['saved','stored','written','documented','listed'],
    'managing':     ['leading','running','organizing','directing','supervising'],
    'discussing':   ['reviewing','presenting','examining','considering','analyzing'],
    'updating':     ['installing','restarting','saving','applying','changing'],
    // ── DETERMINERS / QUANTIFIERS — ручные дистракторы ───────────────────
    'all':          ['some','most','several','many','few'],
    'both':         ['each','every','either','neither','all'],
    'every':        ['each','any','all','another','no'],
    'nobody':       ['somebody','everybody','anyone','everyone','nothing'],
    'Nobody':       ['Somebody','Everybody','Anyone','Everyone','Nothing'],
    'everything':   ['something','nothing','anything','everywhere','everyone'],
    'something':    ['nothing','everything','anything','somewhere','someone'],
    'nothing':      ['something','everything','anything','nowhere','nobody'],
    'someone':      ['nobody','everybody','anyone','everyone','somebody'],
    'everyone':     ['nobody','somebody','anyone','someone','noone'],
    'anywhere':     ['nowhere','somewhere','everywhere','anytime','anyhow'],
    'evenings':     ['mornings','afternoons','nights','weekends','holidays'],
    'mornings':     ['evenings','afternoons','nights','weekdays','weekends'],
    'nights':       ['days','mornings','evenings','afternoons','weekends'],
    'weekends':     ['weekdays','evenings','mornings','holidays','nights'],
    // ── ADVERBS missing from pool ─────────────────────────────────────────
    'yesterday':    ['today','tomorrow','recently','lately','before'],
    'tomorrow':     ['today','yesterday','soon','next','later'],
    'tonight':      ['today','yesterday','tomorrow','recently','soon'],
    'meanwhile':    ['however','therefore','instead','otherwise','already'],
    'otherwise':    ['therefore','however','instead','meanwhile','anyway'],
    'instead':      ['otherwise','however','therefore','meanwhile','anyway'],
    'anyway':       ['however','otherwise','instead','meanwhile','therefore'],
    // ── L31 NOUNS — ручные дистракторы ───────────────────────────────────
    'result':        ['outcome','finding','score','performance','achievement'],
    'results':       ['outcomes','findings','scores','performance','achievements'],
    'report':        ['document','summary','analysis','memo','review'],
    'reports':       ['documents','summaries','analyses','memos','reviews'],
    'decision':      ['choice','conclusion','agreement','resolution','outcome'],
    'decisions':     ['choices','conclusions','agreements','resolutions','outcomes'],
    'document':      ['file','report','contract','certificate','letter'],
    'documents':     ['files','reports','contracts','certificates','letters'],
    'situation':     ['condition','problem','case','issue','matter'],
    'explanation':   ['reason','response','statement','description','comment'],
    'atmosphere':    ['mood','environment','feeling','tone','climate'],
    'role':          ['position','function','duty','task','responsibility'],
    'coordinator':   ['manager','supervisor','organiser','assistant','representative'],
    'building':      ['opening','creating','launching','renovating','expanding'],
    'data':          ['information','figures','numbers','statistics','records'],
    'product':       ['service','solution','item','offering','package'],
    'products':      ['services','solutions','items','offerings','packages'],
    'training':      ['course','programme','workshop','seminar','session'],
    'mistake':       ['error','issue','problem','fault','failure'],
    'mistakes':      ['errors','issues','problems','faults','failures'],
    'proposal':      ['offer','plan','draft','suggestion','application'],
    'proposals':     ['offers','plans','drafts','suggestions','applications'],
    'obligation':    ['duty','commitment','responsibility','requirement','agreement'],
    'obligations':   ['duties','commitments','responsibilities','requirements','agreements'],
    'idea':          ['suggestion','proposal','thought','option','approach'],
    'ideas':         ['suggestions','proposals','thoughts','options','approaches'],
    'metrics':       ['indicators','figures','statistics','targets','benchmarks'],
    'wall':          ['door','window','floor','ceiling','desk'],
    'office':        ['building','workplace','department','centre','studio'],
    'priority':      ['goal','objective','target','task','requirement'],
    'priorities':    ['goals','objectives','targets','tasks','requirements'],
    'approach':      ['method','strategy','technique','style','solution'],
    'negotiation':   ['discussion','talk','consultation','process','procedure'],
    'negotiations':  ['discussions','talks','consultations','proceedings','meetings'],
    'presentation':  ['summary','briefing','proposal','document','report'],
    'presentations': ['summaries','briefings','proposals','documents','reports'],
    'overtime':      ['late','remotely','flexibly','permanently','actively'],
    'scratch':       ['start','beginning','zero','nothing','basics'],
    'manager':       ['director','supervisor','officer','coordinator','executive'],
    'child':         ['student','employee','colleague','worker','member'],
    'children':      ['students','colleagues','employees','workers','members'],
    // ── L31 VERBS (не в VERB_FORM_GROUPS) — ручные дистракторы ──────────
    'redo':          ['review','finish','present','submit','reconsider'],
    'redoing':       ['reviewing','finishing','presenting','submitting','reconsidering'],
    'confess':       ['admit','reveal','explain','accept','acknowledge'],
    'confesses':     ['admits','reveals','explains','accepts','acknowledges'],
    'confessed':     ['admitted','revealed','explained','accepted','acknowledged'],
    'confessing':    ['admitting','revealing','explaining','accepting','acknowledging'],
    'persuade':      ['convince','encourage','remind','warn','advise'],
    'persuades':     ['convinces','encourages','reminds','warns','advises'],
    'persuaded':     ['convinced','encouraged','reminded','warned','advised'],
    'persuading':    ['convincing','encouraging','reminding','warning','advising'],
    'advise':        ['recommend','remind','inform','warn','instruct'],
    'advises':       ['recommends','reminds','informs','warns','instructs'],
    'advised':       ['recommended','reminded','informed','warned','instructed'],
    'advising':      ['recommending','reminding','informing','warning','instructing'],
    'demand':        ['require','request','expect','insist','command'],
    'demands':       ['requires','requests','expects','insists','commands'],
    'demanded':      ['required','requested','insisted','commanded','ordered'],
    'correct':       ['fix','check','update','adjust','verify'],
    'corrects':      ['fixes','checks','updates','adjusts','verifies'],
    'corrected':     ['fixed','checked','updated','adjusted','verified'],
    'correcting':    ['fixing','checking','updating','adjusting','verifying'],
    'refuse':        ['decline','reject','ignore','avoid','disagree'],
    'refuses':       ['declines','rejects','ignores','avoids','disagrees'],
    'refused':       ['declined','rejected','ignored','avoided','disagreed'],
    'refusing':      ['declining','rejecting','ignoring','avoiding','disagreeing'],
    'publish':       ['share','send','release','submit','distribute'],
    'publishes':     ['shares','sends','releases','submits','distributes'],
    'published':     ['shared','sent','released','submitted','distributed'],
    'publishing':    ['sharing','sending','releasing','submitting','distributing'],
    'deliver':       ['provide','present','submit','supply','achieve'],
    'delivers':      ['provides','presents','submits','supplies','achieves'],
    'delivered':     ['provided','presented','submitted','supplied','achieved'],
    'delivering':    ['providing','presenting','submitting','supplying','achieving'],
    'complete':      ['skip','cancel','review','deliver','pass'],
    'completes':     ['skips','cancels','reviews','delivers','passes'],
    'completed':     ['started','approved','cancelled','submitted','reviewed'],
    'completing':    ['starting','cancelling','reviewing','delivering','presenting'],
    'convince':      ['persuade','remind','advise','encourage','explain'],
    'convinces':     ['persuades','reminds','advises','encourages','explains'],
    'convinced':     ['persuaded','reminded','advised','encouraged','explained'],
    'convincing':    ['persuading','reminding','advising','encouraging','explaining'],
    'fulfil':        ['meet','achieve','honour','maintain','respect'],
    'fulfils':       ['meets','achieves','honours','maintains','respects'],
    'fulfilled':     ['met','achieved','honoured','maintained','respected'],
    'fulfilling':    ['meeting','achieving','honouring','maintaining','respecting'],
    'fulfill':       ['meet','achieve','honor','maintain','respect'],
    'fulfills':      ['meets','achieves','honors','maintains','respects'],
    'revise':        ['update','rework','adjust','rewrite','reconsider'],
    'revises':       ['updates','reworks','adjusts','rewrites','reconsiders'],
    'revised':       ['updated','reworked','adjusted','rewritten','reconsidered'],
    'revising':      ['updating','reworking','adjusting','rewriting','reconsidering'],
    'interrupt':     ['disturb','stop','prevent','challenge','ignore'],
    'interrupts':    ['disturbs','stops','prevents','challenges','ignores'],
    'interrupted':   ['disturbed','stopped','prevented','challenged','ignored'],
    'interrupting':  ['disturbing','stopping','preventing','challenging','ignoring'],
    'order':         ['direct','command','instruct','require','force'],
    'orders':        ['directs','commands','instructs','requires','forces'],
    'ordered':       ['directed','commanded','instructed','required','forced'],
    'ordering':      ['directing','commanding','instructing','requiring','forcing'],
    'disturb':       ['contact','follow','delay','observe','rush'],
    'disturbs':      ['contacts','follows','delays','observes','rushes'],
    'disturbed':     ['bothered','contacted','warned','delayed','ignored'],
    'disturbing':    ['contacting','following','delaying','observing','rushing'],
    'focus':         ['concentrate','rely','depend','aim','insist'],
    'focuses':       ['concentrates','relies','depends','aims','insists'],
    'focused':       ['concentrated','relied','depended','aimed','insisted'],
    'focusing':      ['concentrating','relying','depending','aiming','insisting'],
    'argue':         ['discuss','disagree','complain','debate','object'],
    'argues':        ['discusses','disagrees','complains','debates','objects'],
    'argued':        ['discussed','disagreed','complained','debated','objected'],
    'arguing':       ['discussing','disagreeing','complaining','debating','objecting'],
    'sign':          ['write','read','approve','review','prepare'],
    'signs':         ['writes','reads','approves','reviews','prepares'],
    'signed':        ['written','read','approved','reviewed','prepared'],
    'signing':       ['writing','reading','approving','reviewing','preparing'],
    'support':       ['approve','accept','confirm','endorse','challenge'],
    'supports':      ['approves','accepts','confirms','endorses','challenges'],
    'supported':     ['approved','accepted','confirmed','endorsed','challenged'],
    'supporting':    ['approving','accepting','confirming','endorsing','challenging'],
    'grow':          ['fall','change','shift','vary','decline'],
    'grows':         ['falls','changes','shifts','varies','declines'],
    'grew':          ['fell','changed','shifted','varied','declined'],
    'growing':       ['falling','changing','shifting','varying','declining'],
    'grown':         ['fallen','changed','shifted','varied','declined'],
    'improve':       ['maintain','reduce','review','report','deliver'],
    'improves':      ['maintains','reduces','reviews','reports','delivers'],
    'improved':      ['maintained','reduced','reviewed','reported','delivered'],
    'improving':     ['maintaining','reducing','reviewing','reporting','delivering'],
    'cry':           ['speak','laugh','smile','shout','sing'],
    'cries':         ['speaks','laughs','smiles','shouts','sings'],
    'cried':         ['spoke','laughed','smiled','shouted','sang'],
    'crying':        ['speaking','laughing','smiling','shouting','singing'],
    'explain':       ['describe','discuss','mention','confirm','clarify'],
    'explains':      ['describes','discusses','mentions','confirms','clarifies'],
    'explained':     ['described','discussed','mentioned','confirmed','clarified'],
    'explaining':    ['describing','discussing','mentioning','confirming','clarifying'],
    // ── L31 ADJECTIVES / ADVERBS — ручные дистракторы ────────────────────
    'quick':         ['fast','rapid','immediate','prompt','direct'],
    'shorter':       ['longer','later','closer','better','earlier'],
    'measurable':    ['visible','clear','significant','positive','realistic'],
    'worse':         ['better','longer','weaker','harder','lower'],
    'first':         ['second','last','next','final','main'],
    'seriously':     ['properly','directly','fully','completely','carefully'],
    'flexibly':      ['separately','properly','freely','actively','independently'],
    // ── REFLEXIVE PRONOUNS — ручные дистракторы ──────────────────────────
    'myself':        ['yourself','himself','herself','themselves','ourselves'],
    'yourself':      ['myself','himself','herself','themselves','ourselves'],
    'himself':       ['herself','themselves','itself','myself','yourself'],
    'herself':       ['himself','themselves','itself','myself','yourself'],
    'themselves':    ['himself','herself','itself','ourselves','yourselves'],
    'ourselves':     ['themselves','himself','herself','yourselves','itself'],
    'itself':        ['himself','herself','themselves','myself','yourself'],
    // ── SENTENCE-START COMMON NOUNS — ручные дистракторы ─────────────────
    'management':    ['leadership','staff','board','administration','executives'],
    'investors':     ['shareholders','clients','partners','lenders','stakeholders'],
    // ── L30 RELATIVE PRONOUNS — ручные дистракторы ───────────────────────
    'who':           ['which','whom','whose','where','when'],
    'which':         ['who','whom','whose','where','when'],
    'where':         ['when','which','who','whose','how'],
    'when':          ['where','which','who','whose','how'],
    'whose':         ['who','which','where','when','whom'],
    'whom':          ['who','which','where','when','whose'],
    // ── L30 NOUNS — ручные дистракторы ──────────────────────────────────
    'company':       ['business','firm','organisation','agency','enterprise'],
    'companies':     ['businesses','firms','organisations','agencies','enterprises'],
    'girl':          ['woman','lady','student','colleague','assistant'],
    'bag':           ['case','folder','briefcase','box','package'],
    'entrance':      ['exit','reception','lobby','door','gate'],
    'film':          ['movie','show','programme','series','video'],
    'restaurant':    ['cafe','hotel','club','bar','venue'],
    'year':          ['month','week','day','period','decade'],
    'reason':        ['cause','purpose','point','factor','basis'],
    'contract':      ['agreement','deal','document','arrangement','settlement'],
    'contracts':     ['agreements','deals','documents','arrangements','settlements'],
    'student':       ['employee','candidate','specialist','colleague','member'],
    'award':         ['prize','title','certificate','recognition','bonus'],
    'law':           ['rule','policy','regulation','decision','requirement'],
    'technology':    ['system','software','method','solution','tool'],
    'technologies':  ['systems','solutions','methods','tools','platforms'],
    'word':          ['sentence','phrase','question','answer','message'],
    'words':         ['sentences','phrases','questions','answers','messages'],
    'sister':        ['brother','colleague','friend','partner','neighbour'],
    'obstacle':      ['problem','challenge','barrier','difficulty','issue'],
    'obstacles':     ['problems','challenges','barriers','difficulties','issues'],
    'career':        ['work','profession','field','industry','position'],
    'tool':          ['system','platform','method','resource','application'],
    'tools':         ['systems','platforms','methods','resources','applications'],
    'season':        ['period','month','quarter','phase','stage'],
    'sales':         ['revenue','profit','income','turnover','figures'],
    'performance':   ['result','output','quality','standard','progress'],
    'problem':       ['issue','challenge','difficulty','obstacle','matter'],
    'problems':      ['issues','challenges','difficulties','obstacles','matters'],
    'method':        ['approach','technique','system','process','procedure'],
    'methods':       ['approaches','techniques','systems','processes','procedures'],
    'resource':      ['fund','budget','tool','staff','capacity'],
    'resources':     ['funds','budget','tools','staff','capacity'],
    'moment':        ['time','point','period','stage','instance'],
    'truth':         ['fact','answer','result','evidence','detail'],
    'event':         ['meeting','occasion','conference','ceremony','situation'],
    'events':        ['meetings','occasions','conferences','ceremonies','situations'],
    'stage':         ['phase','step','level','period','round'],
    'stages':        ['phases','steps','levels','periods','rounds'],
    'employee':      ['worker','colleague','member','specialist','candidate'],
    'employees':     ['workers','colleagues','members','specialists','candidates'],
    'share':         ['stock','bond','asset','fund','dividend'],
    'shares':        ['stocks','bonds','assets','funds','dividends'],
    'fit':           ['match','choice','option','example','standard'],
    // ── L30 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'interesting':   ['exciting','useful','complex','challenging','relevant'],
    'amazing':       ['excellent','perfect','impressive','outstanding','exceptional'],
    'brilliant':     ['excellent','creative','outstanding','unusual','impressive'],
    'excellent':     ['strong','high','ideal','reliable','successful'],
    'unknown':       ['unclear','missing','unexpected','different','new'],
    'perfect':       ['ideal','best','complete','optimal','absolute'],
    'revolutionary': ['innovative','advanced','effective','technical','modern'],
    'effective':     ['useful','reliable','practical','productive','efficient'],
    'stronger':      ['longer','faster','harder','higher','closer'],
    'easier':        ['faster','clearer','simpler','cheaper','quicker'],
    'highest':       ['lowest','latest','closest','strongest','greatest'],
    'shocking':      ['surprising','unexpected','concerning','serious','unusual'],
    'demanding':     ['strict','competitive','professional','experienced','critical'],
    'urgently':      ['immediately','quickly','directly','carefully','formally'],
    // ── L30 VERBS (не в VERB_FORM_GROUPS) — ручные дистракторы ──────────
    'celebrate':     ['organise','attend','mark','host','plan'],
    'celebrates':    ['organises','attends','marks','hosts','plans'],
    'celebrated':    ['organised','attended','marked','hosted','planned'],
    'celebrating':   ['organising','attending','marking','hosting','planning'],
    'resign':        ['retire','quit','leave','depart','transfer'],
    'resigns':       ['retires','quits','leaves','departs','transfers'],
    'resigned':      ['retired','promoted','dismissed','transferred','appointed'],
    'resigning':     ['retiring','quitting','leaving','departing','transferring'],
    'develop':       ['create','build','design','launch','introduce'],
    'develops':      ['creates','builds','designs','launches','introduces'],
    'developed':     ['created','built','designed','launched','introduced'],
    'developing':    ['creating','building','designing','launching','introducing'],
    'fail':          ['succeed','recover','continue','perform','deliver'],
    'fails':         ['succeeds','recovers','continues','performs','delivers'],
    'failed':        ['succeeded','recovered','continued','performed','delivered'],
    'failing':       ['succeeding','recovering','continuing','performing','delivering'],
    'violate':       ['break','ignore','override','reject','challenge'],
    'violates':      ['breaks','ignores','overrides','rejects','challenges'],
    'violated':      ['broken','ignored','overridden','rejected','challenged'],
    'violating':     ['breaking','ignoring','overriding','rejecting','challenging'],
    'terminate':     ['cancel','end','close','suspend','freeze'],
    'terminates':    ['cancels','ends','closes','suspends','freezes'],
    'terminated':    ['cancelled','ended','closed','suspended','frozen'],
    'terminating':   ['cancelling','ending','closing','suspending','freezing'],
    'discuss':       ['review','present','consider','examine','assess'],
    'discusses':     ['reviews','presents','considers','examines','assesses'],
    'discussed':     ['reviewed','presented','considered','examined','assessed'],
    'solve':         ['fix','address','handle','resolve','settle'],
    'solves':        ['fixes','addresses','handles','resolves','settles'],
    'solved':        ['fixed','addressed','handled','resolved','settled'],
    'solving':       ['fixing','addressing','handling','resolving','settling'],
    'suggest':       ['recommend','propose','mention','describe','request'],
    'suggests':      ['recommends','proposes','mentions','describes','requests'],
    'suggested':     ['recommended','proposed','mentioned','described','requested'],
    'suggesting':    ['recommending','proposing','mentioning','describing','requesting'],
    'overcome':      ['face','address','manage','handle','avoid'],
    'overcomes':     ['faces','addresses','manages','handles','avoids'],
    'overcame':      ['faced','addressed','managed','handled','avoided'],
    'overcoming':    ['facing','addressing','managing','handling','avoiding'],
    'require':       ['suggest','allow','prevent','enable','offer'],
    'requires':      ['suggests','allows','prevents','enables','offers'],
    'required':      ['suggested','allowed','prevented','enabled','offered'],
    'requiring':     ['suggesting','allowing','preventing','enabling','offering'],
    'demolish':      ['rebuild','renovate','close','sell','abandon'],
    'demolished':    ['rebuilt','renovated','closed','sold','abandoned'],
    'realise':       ['notice','discover','confirm','decide','accept'],
    'realises':      ['notices','discovers','confirms','decides','accepts'],
    'realised':      ['noticed','discovered','confirmed','decided','accepted'],
    'realising':     ['noticing','discovering','confirming','deciding','accepting'],
    'realize':       ['notice','discover','confirm','decide','accept'],
    'realizes':      ['notices','discovers','confirms','decides','accepts'],
    'realized':      ['noticed','discovered','confirmed','decided','accepted'],
    'realizing':     ['noticing','discovering','confirming','deciding','accepting'],
    'serve':         ['help','support','assist','contact','manage'],
    'serves':        ['helps','supports','assists','contacts','manages'],
    'served':        ['helped','supported','assisted','contacted','managed'],
    'serving':       ['helping','supporting','assisting','contacting','managing'],
    'rent':          ['buy','own','sell','share','manage'],
    'rents':         ['buys','owns','sells','shares','manages'],
    'rented':        ['bought','owned','sold','shared','managed'],
    'renting':       ['buying','owning','selling','sharing','managing'],
    'reply':         ['respond','react','write','call','contact'],
    'replies':       ['responds','reacts','writes','calls','contacts'],
    'replied':       ['responded','reacted','written','called','contacted'],
    'replying':      ['responding','reacting','writing','calling','contacting'],
    'produce':       ['delay','reduce','present','report','review'],
    'produces':      ['delays','reduces','presents','reports','reviews'],
    'produced':      ['delayed','reduced','presented','reported','reviewed'],
    'producing':     ['delaying','reducing','presenting','reporting','reviewing'],
    // ── L29 NOUNS — ручные дистракторы ──────────────────────────────────
    'cinema':        ['theatre','stadium','museum','gallery','venue'],
    'football':      ['tennis','basketball','hockey','volleyball','golf'],
    'glasses':       ['gloves','contacts','braces','headphones','earrings'],
    'park':          ['garden','square','playground','avenue','market'],
    'smartphones':   ['computers','tablets','laptops','cameras','devices'],
    'smartphone':    ['computer','tablet','laptop','camera','device'],
    'factory':       ['office','store','warehouse','workshop','facility'],
    'diary':         ['notebook','calendar','planner','schedule','report'],
    'grammar':       ['vocabulary','spelling','pronunciation','structure','writing'],
    'emails':        ['messages','letters','calls','texts','reports'],
    'letters':       ['emails','messages','reports','calls','documents'],
    'criticism':     ['feedback','praise','opinion','comment','advice'],
    'system':        ['software','platform','method','network','application'],
    'systems':       ['platforms','methods','networks','applications','tools'],
    'access':        ['connection','entry','permission','link','network'],
    'internet':      ['network','service','connection','technology','platform'],
    'rule':          ['guideline','policy','requirement','procedure','standard'],
    'rules':         ['guidelines','policies','requirements','procedures','standards'],
    'uncertainty':   ['pressure','change','complexity','risk','challenge'],
    'pressure':      ['stress','risk','challenge','demand','workload'],
    'responsibility':['duty','task','obligation','function','role'],
    'responsibilities':['duties','tasks','obligations','functions','roles'],
    'culture':       ['environment','tradition','approach','system','atmosphere'],
    'leader':        ['manager','director','expert','pioneer','specialist'],
    'department':    ['team','division','unit','branch','office'],
    'departments':   ['teams','divisions','units','branches','sections'],
    // ── L29 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'afraid':        ['nervous','worried','tired','confused','surprised'],
    'dark':          ['light','noise','cold','water','heat'],
    'shy':           ['bold','quiet','kind','calm','cheerful'],
    'together':      ['apart','separately','outside','alone','nearby'],
    'outdoors':      ['inside','online','abroad','away','separately'],
    'remote':        ['flexible','hybrid','digital','virtual','independent'],
    'smallest':      ['largest','newest','oldest','busiest','quietest'],
    'there':         ['here','somewhere','anywhere','everywhere','nowhere'],
    'here':          ['there','somewhere','anywhere','everywhere','nowhere'],
    // ── L29 VERBS (не в VERB_FORM_GROUPS) — ручные дистракторы ──────────
    'smoke':         ['drink','eat','exercise','sleep','relax'],
    'smokes':        ['drinks','eats','exercises','sleeps','relaxes'],
    'smoked':        ['drank','ate','exercised','slept','relaxed'],
    'smoking':       ['drinking','eating','exercising','sleeping','relaxing'],
    'wear':          ['use','carry','hold','own','keep'],
    'wears':         ['uses','carries','holds','owns','keeps'],
    'wore':          ['used','carried','held','owned','kept'],
    'wearing':       ['using','carrying','holding','owning','keeping'],
    'wake':          ['sleep','rise','start','leave','arrive'],
    'wakes':         ['sleeps','rises','starts','leaves','arrives'],
    'woke':          ['slept','rose','started','left','arrived'],
    'waking':        ['sleeping','rising','starting','leaving','arriving'],
    'cycle':         ['drive','walk','run','commute','jog'],
    'cycles':        ['drives','walks','runs','commutes','jogs'],
    'cycled':        ['drove','walked','ran','commuted','jogged'],
    'cycling':       ['driving','walking','running','commuting','jogging'],
    'manufacture':   ['produce','create','sell','export','distribute'],
    'manufactures':  ['produces','creates','sells','exports','distributes'],
    'manufactured':  ['produced','created','sold','exported','distributed'],
    'manufacturing': ['producing','creating','selling','exporting','distributing'],
    'deal':          ['cope','handle','manage','face','resolve'],
    'deals':         ['copes','handles','manages','faces','resolves'],
    'dealt':         ['coped','handled','managed','faced','resolved'],
    'dealing':       ['coping','handling','managing','facing','resolving'],
    // ── L28 NOUNS — ручные дистракторы ──────────────────────────────────
    'dinner':        ['lunch','breakfast','meal','coffee','snack'],
    'speech':        ['presentation','report','lecture','talk','message'],
    'research':      ['study','survey','analysis','review','investigation'],
    'finger':        ['hand','nail','thumb','wrist','arm'],
    'president':     ['director','manager','chairman','officer','governor'],
    'start-up':      ['business','company','project','venture','agency'],
    'control':       ['track','sight','count','focus','patience'],
    'policy':        ['strategy','process','procedure','practice','guideline'],
    'policies':      ['strategies','processes','procedures','practices','guidelines'],
    'job':           ['role','position','career','opportunity','task'],
    // ── L28 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'short':         ['long','formal','final','special','extended'],
    'entire':        ['main','final','usual','recent','official'],
    'ashamed':       ['proud','afraid','aware','capable','confident'],
    'again':         ['back','still','more','once','now'],
    'entirely':      ['completely','fully','partly','mainly','simply'],
    'legally':       ['formally','officially','financially','personally','manually'],
    'upon':          ['with','before','after','during','against'],
    'any':           ['some','every','no','much','few'],
    // ── L28 VERBS (не в VERB_FORM_GROUPS) — ручные дистракторы ──────────
    'cut':           ['fix','hurt','damage','break','scratch'],
    'cuts':          ['fixes','hurts','damages','breaks','scratches'],
    'cutting':       ['fixing','hurting','damaging','breaking','scratching'],
    'fix':           ['solve','check','update','review','repair'],
    'fixes':         ['solves','checks','updates','reviews','repairs'],
    'fixed':         ['solved','checked','updated','reviewed','repaired'],
    'fixing':        ['solving','checking','updating','reviewing','repairing'],
    'dress':         ['wear','change','prepare','style','arrange'],
    'dresses':       ['wears','changes','prepares','styles','arranges'],
    'dressed':       ['wore','changed','prepared','styled','arranged'],
    'dressing':      ['wearing','changing','preparing','styling','arranging'],
    'burn':          ['cut','hurt','injure','scratch','damage'],
    'burns':         ['cuts','hurts','injures','scratches','damages'],
    'burned':        ['cut','hurt','injured','scratched','damaged'],
    'burnt':         ['cut','hurt','injured','scratched','damaged'],
    'burning':       ['cutting','hurting','injuring','scratching','damaging'],
    'entertain':     ['enjoy','amuse','occupy','engage','involve'],
    'entertains':    ['enjoys','amuses','occupies','engages','involves'],
    'entertained':   ['enjoyed','amused','occupied','engaged','involved'],
    'entertaining':  ['enjoying','amusing','occupying','engaging','involving'],
    'organise':      ['plan','manage','arrange','coordinate','prepare'],
    'organises':     ['plans','manages','arranges','coordinates','prepares'],
    'organised':     ['planned','managed','arranged','coordinated','prepared'],
    'organising':    ['planning','managing','arranging','coordinating','preparing'],
    'organize':      ['plan','manage','arrange','coordinate','prepare'],
    'organizes':     ['plans','manages','arranges','coordinates','prepares'],
    'organized':     ['planned','managed','arranged','coordinated','prepared'],
    'organizing':    ['planning','managing','arranging','coordinating','preparing'],
    'injure':        ['hurt','burn','cut','damage','wound'],
    'injures':       ['hurts','burns','cuts','damages','wounds'],
    'injured':       ['hurt','burned','cut','damaged','wounded'],
    'injuring':      ['hurting','burning','cutting','damaging','wounding'],
    'introduce':     ['present','greet','meet','contact','address'],
    'introduces':    ['presents','greets','meets','contacts','addresses'],
    'introduced':    ['presented','greeted','met','contacted','addressed'],
    'introducing':   ['presenting','greeting','meeting','contacting','addressing'],
    'pull':          ['push','lift','hold','drag','carry'],
    'pulls':         ['pushes','lifts','holds','drags','carries'],
    'pulled':        ['pushed','lifted','held','dragged','put'],
    'pulling':       ['pushing','lifting','holding','dragging','carrying'],
    'manage':        ['work','cope','lead','run','handle'],
    'manages':       ['works','copes','leads','runs','handles'],
    'managed':       ['worked','coped','led','ran','handled'],
    'rest':          ['sleep','relax','sit','wait','recover'],
    'rests':         ['sleeps','relaxes','sits','waits','recovers'],
    'rested':        ['slept','relaxed','sat','waited','recovered'],
    'resting':       ['sleeping','relaxing','sitting','waiting','recovering'],
    'blame':         ['accuse','criticise','excuse','forgive','judge'],
    'blames':        ['accuses','criticises','excuses','forgives','judges'],
    'blamed':        ['accused','criticised','excused','forgiven','judged'],
    'blaming':       ['accusing','criticising','excusing','forgiving','judging'],
    'renovate':      ['repair','rebuild','update','upgrade','expand'],
    'renovates':     ['repairs','rebuilds','updates','upgrades','expands'],
    'renovated':     ['repaired','rebuilt','updated','upgraded','expanded'],
    'renovating':    ['repairing','rebuilding','updating','upgrading','expanding'],
    'program':       ['code','design','develop','build','create'],
    'programs':      ['codes','designs','develops','builds','creates'],
    'programmed':    ['coded','designed','developed','built','created'],
    'programming':   ['coding','designing','developing','building','creating'],
    'launch':        ['start','create','build','open','found'],
    'launches':      ['starts','creates','builds','opens','founds'],
    'launched':      ['started','created','built','opened','founded'],
    'launching':     ['starting','creating','building','opening','founding'],
    'figure':        ['work','find','sort','solve','calculate'],
    'figures':       ['works','finds','sorts','solves','calculates'],
    'figured':       ['worked','found','sorted','solved','calculated'],
    'figuring':      ['working','finding','sorting','solving','calculating'],
    'calm':          ['settle','prepare','focus','compose','steady'],
    'calms':         ['settles','prepares','focuses','composes','steadies'],
    'calmed':        ['settled','prepared','focused','composed','steadied'],
    'calming':       ['settling','preparing','focusing','composing','steadying'],
    'dedicate':      ['commit','devote','give','focus','apply'],
    'dedicates':     ['commits','devotes','gives','focuses','applies'],
    'dedicated':     ['committed','devoted','given','focused','applied'],
    'dedicating':    ['committing','devoting','giving','focusing','applying'],
    'worry':         ['care','think','wonder','concern','doubt'],
    'worries':       ['cares','thinks','wonders','concerns','doubts'],
    'worried':       ['cared','thought','wondered','concerned','doubted'],
    'worrying':      ['caring','thinking','wondering','concerning','doubting'],
    'prove':         ['show','demonstrate','confirm','reveal','explain'],
    'proves':        ['shows','demonstrates','confirms','reveals','explains'],
    'proved':        ['showed','demonstrated','confirmed','revealed','explained'],
    'proving':       ['showing','demonstrating','confirming','revealing','explaining'],
    'force':         ['make','ask','allow','tell','require'],
    'forces':        ['makes','asks','allows','tells','requires'],
    'forced':        ['made','asked','allowed','told','required'],
    'forcing':       ['making','asking','allowing','telling','requiring'],
    'protect':       ['defend','secure','guard','cover','insure'],
    'protects':      ['defends','secures','guards','covers','insures'],
    'protected':     ['defended','secured','guarded','covered','insured'],
    'protecting':    ['defending','securing','guarding','covering','insuring'],
    'negotiate':     ['discuss','agree','settle','finalise','decide'],
    'negotiates':    ['discusses','agrees','settles','finalises','decides'],
    'negotiated':    ['discussed','agreed','settled','finalised','decided'],
    'negotiating':   ['discussing','agreeing','settling','finalising','deciding'],
    'cook':          ['prepare','make','order','buy','serve'],
    'cooks':         ['prepares','makes','orders','buys','serves'],
    'cooked':        ['prepared','made','ordered','bought','served'],
    'cooking':       ['preparing','making','ordering','buying','serving'],
    // ── L27 NOUNS — ручные дистракторы ──────────────────────────────────
    'expectation':   ['requirement','target','result','standard','guideline'],
    'expectations':  ['requirements','targets','results','standards','guidelines'],
    'traffic':       ['delays','congestion','problems','issues','weather'],
    'noise':         ['mess','mistake','trouble','damage','effort'],
    'money':         ['time','effort','budget','contract','decision'],
    'trip':          ['visit','journey','meeting','conference','call'],
    'information':   ['data','details','figures','records','statistics'],
    'budget':        ['cost','price','revenue','fund','investment'],
    // ── L27 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'guilty':        ['innocent','responsible','correct','certain','aware'],
    'responsible':   ['aware','capable','suitable','available','confident'],
    'longer':        ['harder','faster','earlier','further','quieter'],
    'next':          ['last','same','first','following','previous'],
    'back':          ['here','away','soon','home','out'],
    // ── L27 VERBS (не в VERB_FORM_GROUPS) — ручные дистракторы ──────────
    'state':         ['say','claim','report','announce','confirm'],
    'states':        ['says','claims','reports','announces','confirms'],
    'stated':        ['said','claimed','reported','announced','confirmed'],
    'stating':       ['saying','claiming','reporting','announcing','confirming'],
    'announce':      ['state','confirm','report','inform','declare'],
    'announces':     ['states','confirms','reports','informs','declares'],
    'announced':     ['stated','confirmed','reported','informed','declared'],
    'announcing':    ['stating','confirming','reporting','informing','declaring'],
    'expand':        ['grow','develop','extend','increase','improve'],
    'expands':       ['grows','develops','extends','increases','improves'],
    'expanded':      ['grew','developed','extended','increased','improved'],
    'expanding':     ['growing','developing','extending','increasing','improving'],
    'inform':        ['tell','notify','update','advise','contact'],
    'informs':       ['tells','notifies','updates','advises','contacts'],
    'informed':      ['told','notified','updated','advised','contacted'],
    'informing':     ['telling','notifying','updating','advising','contacting'],
    'claim':         ['state','argue','insist','believe','suggest'],
    'claims':        ['states','argues','insists','believes','suggests'],
    'claimed':       ['stated','argued','insisted','believed','suggested'],
    'claiming':      ['stating','arguing','insisting','believing','suggesting'],
    'approve':       ['confirm','accept','support','agree','endorse'],
    'approves':      ['confirms','accepts','supports','agrees','endorses'],
    'approved':      ['confirmed','accepted','supported','agreed','endorsed'],
    'approving':     ['confirming','accepting','supporting','agreeing','endorsing'],
    'satisfy':       ['meet','please','impress','convince','achieve'],
    'satisfies':     ['meets','pleases','impresses','convinces','achieves'],
    'satisfied':     ['met','pleased','impressed','convinced','achieved'],
    'satisfying':    ['meeting','pleasing','impressing','convincing','achieving'],
    'exceed':        ['meet','reach','achieve','match','deliver'],
    'exceeds':       ['meets','reaches','achieves','matches','delivers'],
    'exceeded':      ['met','reached','achieved','matched','delivered'],
    'exceeding':     ['meeting','reaching','achieving','matching','delivering'],
    'notify':        ['inform','update','tell','remind','contact'],
    'notifies':      ['informs','updates','tells','reminds','contacts'],
    'notified':      ['informed','updated','told','reminded','contacted'],
    'notifying':     ['informing','updating','telling','reminding','contacting'],
    'assure':        ['confirm','guarantee','promise','inform','convince'],
    'assures':       ['confirms','guarantees','promises','informs','convinces'],
    'assured':       ['confirmed','guaranteed','promised','informed','convinced'],
    'assuring':      ['confirming','guaranteeing','promising','informing','convincing'],
    'reported':      ['announced','stated','confirmed','informed','revealed'],
    'reporting':     ['announcing','stating','confirming','informing','revealing'],
    'disclose':      ['share','reveal','publish','confirm','announce'],
    'discloses':     ['shares','reveals','publishes','confirms','announces'],
    'disclosed':     ['shared','revealed','published','confirmed','announced'],
    'disclosing':    ['sharing','revealing','publishing','confirming','announcing'],
    'confirm':       ['approve','accept','announce','verify','acknowledge'],
    'confirms':      ['approves','accepts','announces','verifies','acknowledges'],
    'confirming':    ['approving','accepting','announcing','verifying','acknowledging'],
    'warn':          ['advise','remind','inform','alert','caution'],
    'warns':         ['advises','reminds','informs','alerts','cautions'],
    'warned':        ['advised','reminded','informed','alerted','cautioned'],
    'warning':       ['advising','reminding','informing','alerting','cautioning'],
    'return':        ['stay','leave','continue','transfer','proceed'],
    'returns':       ['stays','leaves','continues','transfers','proceeds'],
    'returned':      ['departed','escaped','relocated','travelled','left'],
    'returning':     ['staying','leaving','continuing','transferring','proceeding'],
    'notice':        ['see','observe','find','realise','discover'],
    'notices':       ['sees','observes','finds','realises','discovers'],
    'noticed':       ['saw','observed','found','realised','discovered'],
    'noticing':      ['seeing','observing','finding','realising','discovering'],
    'insist':        ['claim','demand','argue','state','maintain'],
    'insists':       ['claims','demands','argues','states','maintains'],
    'insisted':      ['claimed','demanded','argued','stated','maintained'],
    'insisting':     ['claiming','demanding','arguing','stating','maintaining'],
    'occur':         ['happen','arise','appear','emerge','result'],
    'occurs':        ['happens','arises','appears','emerges','results'],
    'occurred':      ['happened','arose','appeared','emerged','resulted'],
    'occurring':     ['happening','arising','appearing','emerging','resulting'],
    // ── L26 NOUNS — ручные дистракторы ──────────────────────────────────
    'promotion':     ['bonus','raise','award','recognition','transfer'],
    'flat':          ['house','room','studio','apartment','floor'],
    'umbrella':      ['coat','jacket','bag','hat','gloves'],
    'offer':         ['proposal','deal','suggestion','opportunity','invitation'],
    'qualifications':['experience','skills','degree','background','credentials'],
    'qualification': ['experience','skill','degree','background','credential'],
    'agreement':     ['contract','deal','settlement','arrangement','arrangement'],
    'health':        ['energy','strength','fitness','stamina','mood'],
    'lottery':       ['raffle','competition','award','prize','game'],
    'race':          ['competition','match','game','event','contest'],
    'exam':          ['test','interview','course','review','assessment'],
    'reaction':      ['result','effect','response','change','outcome'],
    'impression':    ['result','effect','reputation','image','opinion'],
    'refund':        ['payment','credit','discount','compensation','fee'],
    'flight':        ['train','bus','journey','trip','service'],
    'snow':          ['rain','wind','ice','fog','storm'],
    'deadline':      ['date','schedule','target','budget','limit'],
    'pump':          ['machine','engine','device','motor','generator'],
    'crisis':        ['problem','issue','conflict','challenge','setback'],
    'supplier':      ['partner','provider','vendor','distributor','contractor'],
    'suppliers':     ['partners','providers','vendors','distributors','contractors'],
    'bacteria':      ['viruses','chemicals','substances','particles','organisms'],
    'courage':       ['confidence','skill','energy','patience','determination'],
    'productivity':  ['performance','output','quality','efficiency','progress'],
    'pipe':          ['tube','cable','wire','line','channel'],
    'pipes':         ['tubes','cables','wires','lines','channels'],
    'chemical':      ['substance','material','compound','liquid','element'],
    'chemicals':     ['substances','materials','compounds','liquids','elements'],
    'cost':          ['price','budget','value','fee','expense'],
    'costs':         ['prices','budgets','values','fees','expenses'],
    'outcome':       ['result','effect','impact','consequence','achievement'],
    'outcomes':      ['results','effects','impacts','consequences','achievements'],
    'cancel':        ['postpone','delay','move','reschedule','suspend'],
    'cancels':       ['postpones','delays','moves','reschedules','suspends'],
    'cancelling':    ['postponing','delaying','moving','rescheduling','suspending'],
    // ── L26 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'upset':         ['angry','pleased','tired','surprised','confused'],
    'wet':           ['dry','cold','hot','dirty','tired'],
    'bankrupt':      ['profitable','successful','closed','sold','independent'],
    'wealthy':       ['rich','successful','famous','powerful','influential'],
    'flexible':      ['creative','available','experienced','independent','competent'],
    'cooler':        ['warmer','darker','quieter','smaller','lighter'],
    'motivated':     ['paid','promoted','trained','hired','employed'],
    'clearly':       ['quickly','properly','further','directly','carefully'],
    // ── L26 VERBS (не в VERB_FORM_GROUPS) — ручные дистракторы ──────────
    'heat':          ['cool','boil','mix','freeze','add'],
    'heats':         ['cools','boils','mixes','freezes','adds'],
    'heated':        ['cooled','boiled','mixed','frozen','added'],
    'heating':       ['cooling','boiling','mixing','freezing','adding'],
    'boil':          ['cool','freeze','heat','melt','dissolve'],
    'boils':         ['cools','freezes','heats','melts','dissolves'],
    'boiled':        ['cooled','frozen','heated','melted','dissolved'],
    'boiling':       ['cooling','freezing','heating','melting','dissolving'],
    'mix':           ['blend','combine','separate','dissolve','add'],
    'mixes':         ['blends','combines','separates','dissolves','adds'],
    'mixed':         ['blended','combined','separated','dissolved','added'],
    'mixing':        ['blending','combining','separating','dissolving','adding'],
    'apologise':     ['explain','admit','confirm','respond','withdraw'],
    'apologises':    ['explains','admits','confirms','responds','withdraws'],
    'apologised':    ['explained','admitted','confirmed','responded','withdrawn'],
    'apologising':   ['explaining','admitting','confirming','responding','withdrawing'],
    'apologize':     ['explain','admit','confirm','respond','withdraw'],
    'apologizes':    ['explains','admits','confirms','responds','withdraws'],
    'apologized':    ['explained','admitted','confirmed','responded','withdrawn'],
    'apologizing':   ['explaining','admitting','confirming','responding','withdrawing'],
    'hire':          ['recruit','appoint','employ','find','attract'],
    'hires':         ['recruits','appoints','employs','finds','attracts'],
    'hired':         ['recruited','appointed','employed','found','attracted'],
    'hiring':        ['recruiting','appointing','employing','finding','attracting'],
    'exercise':      ['train','study','practise','run','work'],
    'exercises':     ['trains','practises','rests','walks','studies'],
    'exercised':     ['trained','practised','rested','walked','studied'],
    'exercising':    ['training','practising','resting','walking','studying'],
    'press':         ['push','pull','touch','click','hold'],
    'presses':       ['pushes','pulls','touches','clicks','holds'],
    'pressed':       ['pushed','pulled','touched','clicked','held'],
    'pressing':      ['pushing','pulling','touching','clicking','holding'],
    'restart':       ['crash','freeze','update','reload','reset'],
    'restarts':      ['crashes','freezes','updates','reloads','resets'],
    'restarted':     ['crashed','frozen','updated','reloaded','reset'],
    'restarting':    ['crashing','freezing','updating','reloading','resetting'],
    'quit':          ['stay','remain','continue','accept','succeed'],
    'quits':         ['stays','remains','continues','accepts','succeeds'],
    'quitting':      ['staying','remaining','continuing','accepting','succeeding'],
    'apply':         ['request','submit','register','contact','confirm'],
    'applies':       ['requests','submits','registers','contacts','confirms'],
    'applied':       ['requested','submitted','registered','contacted','confirmed'],
    'applying':      ['requesting','submitting','registering','contacting','confirming'],
    'cooperate':     ['collaborate','agree','communicate','support','contribute'],
    'cooperates':    ['collaborates','agrees','communicates','supports','contributes'],
    'cooperated':    ['collaborated','agreed','communicated','supported','contributed'],
    'cooperating':   ['collaborating','agreeing','communicating','supporting','contributing'],
    'panic':         ['worry','stress','rush','freeze','hesitate'],
    'panics':        ['worries','stresses','rushes','freezes','hesitates'],
    'panicked':      ['worried','stressed','rushed','frozen','hesitated'],
    'panicking':     ['worrying','stressing','rushing','freezing','hesitating'],
    'complain':      ['request','demand','contact','report','respond'],
    'complains':     ['requests','demands','contacts','reports','responds'],
    'complained':    ['requested','demanded','contacted','reported','responded'],
    'complaining':   ['requesting','demanding','contacting','reporting','responding'],
    'worsen':        ['improve','change','stabilise','recover','decrease'],
    'worsens':       ['improves','changes','stabilises','recovers','decreases'],
    'worsened':      ['improved','changed','stabilised','recovered','decreased'],
    'worsening':     ['improving','changing','stabilising','recovering','decreasing'],
    'survive':       ['exist','remain','continue','persist','last'],
    'survives':      ['exists','remains','continues','persists','lasts'],
    'survived':      ['existed','remained','continued','persisted','lasted'],
    'surviving':     ['existing','remaining','continuing','persisting','lasting'],
    'invest':        ['spend','save','raise','fund','allocate'],
    'invests':       ['spends','saves','raises','funds','allocates'],
    'invested':      ['spent','saved','raised','funded','allocated'],
    'investing':     ['spending','saving','raising','funding','allocating'],
    'respond':       ['delay','ignore','contact','follow','decline'],
    'responds':      ['delays','ignores','contacts','follows','declines'],
    'responded':     ['delayed','ignored','contacted','followed','declined'],
    'responding':    ['delaying','ignoring','contacting','following','declining'],
    'drop':          ['rise','increase','remain','stabilise','recover'],
    'drops':         ['rises','increases','remains','stabilises','recovers'],
    'dropped':       ['rose','increased','remained','stabilised','recovered'],
    'dropping':      ['rising','increasing','remaining','stabilising','recovering'],
    'catch':         ['miss','delay','leave','cancel','book'],
    'catches':       ['misses','delays','leaves','cancels','books'],
    'caught':        ['missed','delayed','left','cancelled','booked'],
    'catching':      ['missing','delaying','leaving','cancelling','booking'],
    'succeed':       ['fail','achieve','manage','deliver','perform'],
    'succeeds':      ['fails','achieves','manages','delivers','performs'],
    'succeeded':     ['failed','achieved','managed','delivered','performed'],
    'succeeding':    ['failing','achieving','managing','delivering','performing'],
    'train':         ['practice','prepare','exercise','develop','study'],
    'trains':        ['practises','prepares','exercises','develops','studies'],
    'trained':       ['practised','prepared','exercised','developed','studied'],
    // ── L25 NOUNS — ручные дистракторы ──────────────────────────────────
    'noon':          ['midnight','evening','morning','dawn','dusk'],
    'attention':     ['focus','interest','effort','time','energy'],
    'courier':       ['colleague','client','driver','worker','visitor'],
    'stairs':        ['lift','floor','door','hall','entrance'],
    'taxi':          ['bus','train','car','bike','shuttle'],
    'ambulance':     ['police','doctor','nurse','helicopter','paramedic'],
    'consciousness': ['memory','control','balance','strength','energy'],
    'furniture':     ['equipment','appliances','storage','documents','belongings'],
    'glance':        ['look','nod','signal','gesture','wave'],
    'glances':       ['looks','nods','signals','gestures','waves'],
    'party':         ['conference','meeting','event','competition','ceremony'],
    'lunch':         ['breakfast','dinner','coffee','snack','tea'],
    'emergency':     ['crisis','incident','accident','problem','situation'],
    'detail':        ['point','fact','aspect','element','part'],
    'details':       ['points','facts','aspects','elements','parts'],
    'direction':     ['path','route','course','approach','side'],
    'directions':    ['paths','routes','courses','approaches','sides'],
    'interview':     ['meeting','assessment','review','test','consultation'],
    'interviews':    ['meetings','assessments','reviews','tests','consultations'],
    'incident':      ['event','situation','accident','problem','issue'],
    'price':         ['cost','rate','fee','charge','amount'],
    'prices':        ['costs','rates','fees','charges','amounts'],
    'boss':          ['manager','supervisor','director','officer','head'],
    'solution':      ['answer','option','approach','result','method'],
    'solutions':     ['answers','options','approaches','results','methods'],
    'notes':         ['orders','messages','photos','calls','breaks'],
    'fingers':       ['hands','shoulders','arms','legs','eyes'],
    'yard':          ['garden','park','street','court','field'],
    'care':          ['charge','control','responsibility','ownership','interest'],
    // ── L25 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'silent':        ['quiet','focused','calm','still','distracted'],
    'nervous':       ['excited','confident','tired','calm','focused'],
    'aware':         ['certain','informed','sure','prepared','confident'],
    'ongoing':       ['upcoming','previous','initial','separate','temporary'],
    'financial':     ['annual','legal','commercial','technical','general'],
    // ── L25 VERBS (не в VERB_FORM_GROUPS) — ручные дистракторы ──────────
    'expecting':     ['requiring','needing','demanding','asking','wanting'],
    'ring':          ['buzz','beep','vibrate','chime','flash'],
    'rings':         ['buzzes','beeps','vibrates','chimes','flashes'],
    'rang':          ['buzzed','beeped','vibrated','chimed','flashed'],
    'ringing':       ['buzzing','beeping','vibrating','chiming','flashing'],
    'set':           ['prepare','clear','arrange','place','clean'],
    'sets':          ['prepares','clears','arranges','places','cleans'],
    'setting':       ['preparing','clearing','arranging','placing','cleaning'],
    'smile':         ['laugh','frown','wave','nod','cry'],
    'smiles':        ['laughs','frowns','waves','nods','cries'],
    'smiled':        ['laughed','frowned','waved','nodded','cried'],
    'smiling':       ['laughing','frowning','waving','nodding','crying'],
    'type':          ['write','edit','enter','record','fill'],
    'types':         ['writes','edits','enters','records','fills'],
    'typed':         ['wrote','edited','entered','recorded','filled'],
    'typing':        ['writing','editing','entering','recording','filling'],
    'repeat':        ['say','mention','confirm','stress','restate'],
    'repeats':       ['says','mentions','confirms','stresses','restates'],
    'repeated':      ['said','mentioned','confirmed','stressed','restated'],
    'repeating':     ['saying','mentioning','confirming','stressing','restating'],
    'head':          ['move','travel','walk','drive','proceed'],
    'heads':         ['moves','travels','walks','drives','proceeds'],
    'headed':        ['moved','travelled','walked','drove','proceeded'],
    'heading':       ['moving','travelling','walking','driving','proceeding'],
    'install':       ['update','remove','download','configure','upgrade'],
    'installs':      ['updates','removes','downloads','configures','upgrades'],
    'installed':     ['updated','removed','downloaded','configured','upgraded'],
    'installing':    ['updating','removing','downloading','configuring','upgrading'],
    'pretend':       ['appear','act','fake','claim','seem'],
    'pretends':      ['appears','acts','fakes','claims','seems'],
    'pretended':     ['appeared','acted','faked','claimed','seemed'],
    'pretending':    ['appearing','acting','faking','claiming','seeming'],
    'happen':        ['occur','arise','appear','emerge','result'],
    'happens':       ['occurs','arises','appears','emerges','results'],
    'happened':      ['occurred','arose','appeared','emerged','resulted'],
    'happening':     ['occurring','arising','appearing','emerging','resulting'],
    'analyse':       ['review','examine','process','interpret','evaluate'],
    'analyses':      ['reviews','examines','processes','interprets','evaluates'],
    'analysed':      ['reviewed','examined','processed','interpreted','evaluated'],
    'analysing':     ['reviewing','examining','processing','interpreting','evaluating'],
    'analyze':       ['review','examine','process','interpret','evaluate'],
    'analyzes':      ['reviews','examines','processes','interprets','evaluates'],
    'analyzed':      ['reviewed','examined','processed','interpreted','evaluated'],
    'analyzing':     ['reviewing','examining','processing','interpreting','evaluating'],
    'note':          ['record','write','document','mention','enter'],
    'noted':         ['recorded','wrote','documented','mentioned','entered'],
    'noting':        ['recording','writing','documenting','mentioning','entering'],
    'exchange':      ['share','send','give','swap','communicate'],
    'exchanges':     ['shares','sends','gives','swaps','communicates'],
    'exchanged':     ['shared','sent','given','swapped','communicated'],
    'exchanging':    ['sharing','sending','giving','swapping','communicating'],
    'rearrange':     ['move','clear','organise','remove','replace'],
    'rearranges':    ['moves','clears','organises','removes','replaces'],
    'rearranged':    ['moved','cleared','organised','removed','replaced'],
    'rearranging':   ['moving','clearing','organising','removing','replacing'],
    'review':        ['check','approve','submit','finalise','process'],
    'reviews':       ['checks','approves','submits','finalises','processes'],
    'reviewed':      ['checked','approved','submitted','finalised','processed'],
    'reviewing':     ['checking','approving','submitting','finalising','processing'],
    'build':         ['open','create','launch','develop','expand'],
    'builds':        ['opens','creates','launches','develops','expands'],
    'built':         ['opened','created','launched','developed','expanded'],
    'rise':          ['fall','drop','remain','decrease','improve'],
    'rises':         ['falls','drops','remains','decreases','improves'],
    'rose':          ['fell','dropped','remained','decreased','improved'],
    'rising':        ['falling','dropping','remaining','decreasing','improving'],
    'present':       ['describe','explain','discuss','show','prepare'],
    'presents':      ['describes','explains','discusses','shows','prepares'],
    'presented':     ['described','explained','discussed','showed','prepared'],
    'presenting':    ['describing','explaining','discussing','showing','preparing'],
    'hurt':          ['ache','burn','shake','fail','freeze'],
    'hurts':         ['aches','burns','shakes','fails','freezes'],
    'hurting':       ['aching','burning','shaking','failing','freezing'],
    'rain':          ['snow','blow','storm','fog','shine'],
    'rains':         ['snows','blows','storms','fogs','shines'],
    'rained':        ['snowed','blew','stormed','froze','shone'],
    'raining':       ['snowing','blowing','storming','freezing','shining'],
    'relax':         ['sleep','recover','rest','wait','stop'],
    'relaxes':       ['sleeps','recovers','rests','waits','stops'],
    'relaxed':       ['slept','recovered','rested','waited','stopped'],
    'relaxing':      ['sleeping','recovering','resting','waiting','stopping'],
    // ── L24 NOUNS — ручные дистракторы ──────────────────────────────────
    'sushi':         ['pasta','pizza','ramen','steak','salad'],
    'childhood':     ['youth','upbringing','school','past','background'],
    'oil':           ['gas','coal','energy','fuel','water'],
    'story':         ['case','example','situation','account','version'],
    'email':         ['letter','message','call','text','response'],
    'celebrity':     ['executive','official','politician','athlete','author'],
    'celebrities':   ['executives','officials','politicians','athletes','authors'],
    'progress':      ['result','success','performance','record','development'],
    'analysis':      ['report','review','summary','assessment','evaluation'],
    'commitment':    ['duty','obligation','task','priority','promise'],
    'commitments':   ['duties','obligations','tasks','priorities','promises'],
    'measure':       ['rule','step','policy','action','requirement'],
    'measures':      ['rules','steps','policies','actions','requirements'],
    'difficulty':    ['problem','issue','challenge','obstacle','barrier'],
    'difficulties':  ['problems','issues','challenges','obstacles','barriers'],
    'decade':        ['century','period','era','generation','year'],
    'reputation':    ['image','status','profile','record','standing'],
    'goal':          ['target','aim','objective','task','priority'],
    'goals':         ['targets','aims','objectives','tasks','priorities'],
    'government':    ['authority','leadership','administration','committee','council'],
    'lives':         ['works','stays','studies','travels','moves'],
    'skydiving':     ['hiking','cycling','surfing','climbing','diving'],
    'field':         ['area','sector','industry','domain','discipline'],
    'paper':         ['article','report','study','document','publication'],
    'papers':        ['articles','reports','studies','documents','publications'],
    'experience':    ['knowledge','expertise','background','understanding','training'],
    // ── L24 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'significantly': ['substantially','consistently','recently','frequently','considerably'],
    'substantially': ['significantly','consistently','recently','dramatically','considerably'],
    'academic':      ['scientific','professional','technical','formal','theoretical'],
    'vast':          ['limited','growing','strong','deep','relevant'],
    'serious':       ['major','urgent','critical','significant','complex'],
    'significant':   ['major','substantial','notable','considerable','dramatic'],
    // ── L24 VERBS (не в VERB_FORM_GROUPS) — ручные дистракторы ──────────
    'confirmed':     ['approved','accepted','announced','verified','acknowledged'],
    'risen':         ['fallen','dropped','decreased','stabilised','improved'],
    'fall':          ['rise','increase','remain','stabilise','recover'],
    'falls':         ['rises','increases','remains','stabilises','recovers'],
    'fell':          ['rose','increased','remained','stabilised','recovered'],
    'fallen':        ['risen','increased','remained','stabilised','recovered'],
    'falling':       ['rising','increasing','remaining','stabilising','recovering'],
    'become':        ['grow','turn','remain','appear','stay'],
    'becomes':       ['grows','turns','remains','appears','stays'],
    'became':        ['grew','turned','remained','appeared','stayed'],
    'becoming':      ['growing','turning','remaining','appearing','staying'],
    'contact':       ['call','email','meet','visit','message'],
    'contacts':      ['calls','emails','meets','visits','messages'],
    'contacted':     ['called','emailed','met','visited','messaged'],
    'contacting':    ['calling','emailing','meeting','visiting','messaging'],
    'encounter':     ['face','find','meet','experience','address'],
    'encounters':    ['faces','finds','meets','experiences','addresses'],
    'encountered':   ['faced','found','met','experienced','addressed'],
    'encountering':  ['facing','finding','meeting','experiencing','addressing'],
    'accumulate':    ['gain','build','develop','collect','acquire'],
    'accumulates':   ['gains','builds','develops','collects','acquires'],
    'accumulated':   ['gained','built','developed','collected','acquired'],
    'accumulating':  ['gaining','building','developing','collecting','acquiring'],
    'face':          ['handle','address','manage','tackle','overcome'],
    'faces':         ['handles','addresses','manages','tackles','overcomes'],
    'faced':         ['handled','addressed','managed','tackled','overcame'],
    'facing':        ['handling','addressing','managing','tackling','overcoming'],
    'deteriorate':   ['improve','change','remain','stabilise','recover'],
    'deteriorates':  ['improves','changes','remains','stabilises','recovers'],
    'deteriorated':  ['improved','changed','remained','stabilised','recovered'],
    'deteriorating': ['improving','changing','remaining','stabilising','recovering'],
    'restore':       ['rebuild','improve','maintain','support','strengthen'],
    'restores':      ['rebuilds','improves','maintains','supports','strengthens'],
    'restored':      ['rebuilt','improved','maintained','supported','strengthened'],
    'restoring':     ['rebuilding','improving','maintaining','supporting','strengthening'],
    'achieve':       ['meet','reach','deliver','complete','succeed'],
    'achieves':      ['meets','reaches','delivers','completes','succeeds'],
    'achieved':      ['met','reached','delivered','completed','succeeded'],
    'achieving':     ['meeting','reaching','delivering','completing','succeeding'],
    // ── L23 NOUNS — ручные дистракторы ──────────────────────────────────
    'bridge':        ['road','tunnel','tower','gate','dam'],
    'parcel':        ['package','document','letter','box','delivery'],
    'account':       ['balance','payment','record','budget','transfer'],
    'conference':    ['seminar','workshop','forum','summit','symposium'],
    'century':       ['decade','generation','era','period','age'],
    'participant':   ['employee','member','candidate','delegate','attendee'],
    'participants':  ['employees','members','candidates','delegates','attendees'],
    'expense':       ['cost','payment','fee','charge','bill'],
    'expenses':      ['costs','payments','fees','charges','bills'],
    'application':   ['request','proposal','form','submission','document'],
    'accusation':    ['claim','complaint','charge','allegation','criticism'],
    'court':         ['committee','board','authority','tribunal','council'],
    'agency':        ['company','firm','service','organisation','bureau'],
    'side':          ['party','team','group','department','member'],
    'sides':         ['parties','teams','groups','departments','members'],
    'merger':        ['takeover','acquisition','deal','partnership','collaboration'],
    'term':          ['condition','requirement','clause','provision','detail'],
    'terms':         ['conditions','requirements','clauses','provisions','details'],
    'audit':         ['review','inspection','assessment','check','survey'],
    'effect':        ['impact','result','outcome','change','consequence'],
    'complaint':     ['request','issue','concern','problem','question'],
    'parties':       ['sides','groups','members','stakeholders','representatives'],
    'risk':          ['issue','concern','threat','problem','challenge'],
    'risks':         ['issues','concerns','threats','problems','challenges'],
    'hold':          ['pause','delay','suspension','review','freeze'],
    // ── L23 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'highly':        ['well','poorly','previously','recently','formally'],
    'exactly':       ['quickly','properly','fully','directly','correctly'],
    'successfully':  ['quickly','properly','finally','entirely','partly'],
    'immediately':   ['quickly','already','finally','directly','formally'],
    'lengthy':       ['long','difficult','complex','formal','detailed'],
    // ── L23 VERBS (не в VERB_FORM_GROUPS) — ручные дистракторы ──────────
    'release':       ['launch','publish','announce','distribute','introduce'],
    'releases':      ['launches','publishes','announces','distributes','introduces'],
    'released':      ['launched','published','announced','distributed','introduced'],
    'releasing':     ['launching','publishing','announcing','distributing','introducing'],
    'transfer':      ['move','send','pay','credit','allocate'],
    'transfers':     ['moves','sends','pays','credits','allocates'],
    'transferred':   ['moved','sent','paid','credited','allocated'],
    'transferring':  ['moving','sending','paying','crediting','allocating'],
    'invite':        ['ask','call','welcome','include','choose'],
    'invites':       ['asks','calls','welcomes','includes','chooses'],
    'invited':       ['asked','called','welcomed','included','chosen'],
    'inviting':      ['asking','calling','welcoming','including','choosing'],
    'implement':     ['introduce','install','launch','apply','adopt'],
    'implements':    ['introduces','installs','launches','applies','adopts'],
    'implemented':   ['introduced','installed','launched','applied','adopted'],
    'implementing':  ['introducing','installing','launching','applying','adopting'],
    'misinterpret':  ['misunderstand','misread','confuse','distort','misuse'],
    'misinterpreted':['misunderstood','misread','confused','distorted','misused'],
    'misinterpreting':['misunderstanding','misreading','confusing','distorting','misusing'],
    'appeal':        ['challenge','contest','submit','review','object'],
    'appeals':       ['challenges','contests','submits','reviews','objects'],
    'appealed':      ['challenged','contested','submitted','reviewed','rejected'],
    'appealing':     ['challenging','contesting','submitting','reviewing','objecting'],
    'dismiss':       ['fire','remove','replace','retire','transfer'],
    'dismisses':     ['fires','removes','replaces','retires','transfers'],
    'dismissed':     ['fired','removed','replaced','retired','transferred'],
    'dismissing':    ['firing','removing','replacing','retiring','transferring'],
    'conclude':      ['sign','reach','complete','finalise','achieve'],
    'concludes':     ['signs','reaches','completes','finalises','achieves'],
    'concluded':     ['signed','reached','completed','finalised','achieved'],
    'concluding':    ['signing','reaching','completing','finalising','achieving'],
    'accept':        ['reject','review','approve','receive','consider'],
    'accepts':       ['rejects','reviews','approves','receives','considers'],
    'accepted':      ['rejected','reviewed','approved','received','considered'],
    'accepting':     ['rejecting','reviewing','approving','receiving','considering'],
    'reject':        ['accept','approve','review','submit','reconsider'],
    'rejects':       ['accepts','approves','reviews','submits','reconsiders'],
    'rejected':      ['accepted','approved','reviewed','submitted','reconsidered'],
    'rejecting':     ['accepting','approving','reviewing','submitting','reconsidering'],
    'reimburse':     ['pay','cover','refund','settle','clear'],
    'reimburses':    ['pays','covers','refunds','settles','clears'],
    'reimbursed':    ['paid','covered','refunded','settled','cleared'],
    'reimbursing':   ['paying','covering','refunding','settling','clearing'],
    'encrypt':       ['secure','protect','process','delete','backup'],
    'encrypts':      ['secures','protects','processes','deletes','backups'],
    'encrypted':     ['secured','protected','processed','deleted','backed'],
    'encrypting':    ['securing','protecting','processing','deleting','backing'],
    'appreciate':    ['value','praise','recognise','mention','reward'],
    'appreciates':   ['values','praises','recognises','mentions','rewards'],
    'appreciated':   ['valued','praised','recognised','mentioned','rewarded'],
    'appreciating':  ['valuing','praising','recognising','mentioning','rewarding'],
    'address':       ['solve','handle','raise','ignore','review'],
    'addresses':     ['solves','handles','raises','ignores','reviews'],
    'addressed':     ['solved','handled','raised','ignored','reviewed'],
    'addressing':    ['solving','handling','raising','ignoring','reviewing'],
    'save':          ['store','back','delete','move','update'],
    'saves':         ['stores','backs','deletes','moves','updates'],
    'saved':         ['stored','backed','deleted','moved','updated'],
    'saving':        ['storing','backing','deleting','moving','updating'],
    'shared':        ['divided','split','distributed','allocated','reduced'],
    'sharing':       ['dividing','splitting','distributing','allocating','transferring'],
    'reach':         ['make','achieve','sign','find','establish'],
    'reaches':       ['makes','achieves','signs','finds','establishes'],
    'reached':       ['made','achieved','signed','found','established'],
    'reaching':      ['making','achieving','signing','finding','establishing'],
    'deny':          ['give','offer','approve','accept','promise'],
    'denies':        ['gives','offers','approves','accepts','promises'],
    'denied':        ['given','offered','approved','accepted','promised'],
    'denying':       ['giving','offering','approving','accepting','promising'],
    'refer':         ['send','submit','pass','move','direct'],
    'refers':        ['sends','submits','passes','moves','directs'],
    'referred':      ['sent','submitted','passed','moved','directed'],
    'referring':     ['sending','submitting','passing','moving','directing'],
    'handle':        ['solve','resolve','address','review','manage'],
    'handles':       ['solves','resolves','addresses','reviews','manages'],
    'handled':       ['solved','resolved','addressed','reviewed','managed'],
    'handling':      ['solving','resolving','addressing','reviewing','managing'],
    'destroy':       ['save','store','delete','remove','protect'],
    'destroys':      ['saves','stores','deletes','removes','protects'],
    'destroyed':     ['saved','stored','deleted','removed','protected'],
    'destroying':    ['saving','storing','deleting','removing','protecting'],
    'lead':          ['manage','run','oversee','direct','coordinate'],
    'leads':         ['manages','runs','oversees','directs','coordinates'],
    'led':           ['managed','ran','oversaw','directed','coordinated'],
    'leading':       ['managing','running','overseeing','directing','coordinating'],
    // ── L22 NOUNS — ручные дистракторы ──────────────────────────────────
    'skill':         ['ability','talent','quality','strength','advantage'],
    'skills':        ['abilities','talents','qualities','strengths','advantages'],
    'effort':        ['time','energy','attention','focus','activity'],
    'efforts':       ['resources','energy','attention','steps','activities'],
    'business':      ['company','firm','organisation','venture','career'],
    'businesses':    ['companies','firms','organisations','ventures','careers'],
    'conversation':  ['discussion','talk','argument','exchange','interview'],
    'conversations': ['discussions','talks','arguments','exchanges','interviews'],
    'matter':        ['issue','topic','case','subject','concern'],
    'matters':       ['issues','topics','cases','subjects','concerns'],
    'thing':         ['issue','point','topic','subject','aspect'],
    'things':        ['issues','points','topics','subjects','aspects'],
    'point':         ['reason','purpose','benefit','value','goal'],
    'points':        ['reasons','purposes','benefits','values','goals'],
    'public':        ['group','audience','crowd','community','workplace'],
    'passion':       ['interest','hobby','talent','focus','strength'],
    'passions':      ['interests','hobbies','talents','focuses','strengths'],
    'piano':         ['guitar','violin','keyboard','instrument','drums'],
    'jobs':          ['roles','positions','careers','opportunities','tasks'],
    'conflict':      ['issue','problem','disagreement','tension','challenge'],
    'conflicts':     ['issues','problems','disagreements','tensions','challenges'],
    // ── L22 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'late':          ['early','sick','absent','busy','free'],
    'bad':           ['poor','wrong','difficult','serious','weak'],
    'alone':         ['free','quiet','together','busy','ready'],
    'ill':           ['busy','tired','absent','away','unavailable'],
    'inexperienced': ['new','junior','young','unknown','unskilled'],
    'worth':         ['good','useful','important','necessary','helpful'],
    'used':          ['ready','willing','likely','prepared','allowed'],
    'involved':      ['included','mentioned','informed','employed','represented'],
    'challenged':    ['praised','rewarded','trusted','motivated','recognised'],
    // ── L22 VERBS (gerund-taking) — ручные дистракторы ──────────────────
    'enjoy':         ['like','love','prefer','hate','mind'],
    'enjoys':        ['likes','loves','prefers','hates','minds'],
    'enjoyed':       ['liked','loved','preferred','hated','minded'],
    'enjoying':      ['liking','loving','preferring','hating','minding'],
    'stop':          ['start','begin','continue','pause','try'],
    'stops':         ['starts','begins','continues','pauses','tries'],
    'stopped':       ['started','tried','continued','paused','managed'],
    'stopping':      ['starting','beginning','continuing','pausing','trying'],
    'consider':      ['suggest','propose','recommend','discuss','review'],
    'considers':     ['suggests','proposes','recommends','discusses','reviews'],
    'considered':    ['suggested','proposed','recommended','discussed','reviewed'],
    'considering':   ['suggesting','proposing','recommending','discussing','reviewing'],
    'finish':        ['start','complete','continue','submit','prepare'],
    'finishes':      ['starts','completes','continues','submits','prepares'],
    'finished':      ['started','completed','continued','submitted','prepared'],
    'finishing':     ['starting','completing','continuing','submitting','preparing'],
    'hate':          ['love','enjoy','like','prefer','mind'],
    'hates':         ['loves','enjoys','likes','prefers','minds'],
    'hated':         ['loved','enjoyed','liked','preferred','minded'],
    'hating':        ['loving','enjoying','liking','preferring','minding'],
    'keep':          ['stop','start','continue','try','begin'],
    'keeps':         ['stops','starts','continues','tries','begins'],
    'kept':          ['started','stopped','tried','continued','managed'],
    'keeping':       ['stopping','starting','continuing','trying','managing'],
    'postpone':      ['cancel','reschedule','delay','arrange','move'],
    'postpones':     ['cancels','reschedules','delays','arranges','moves'],
    'postponed':     ['cancelled','rescheduled','delayed','arranged','moved'],
    'postponing':    ['cancelling','rescheduling','delaying','arranging','moving'],
    'like':          ['love','enjoy','hate','prefer','mind'],
    'likes':         ['loves','enjoys','hates','prefers','minds'],
    'liked':         ['loved','enjoyed','hated','preferred','minded'],
    'liking':        ['loving','enjoying','hating','preferring','minding'],
    'practise':      ['train','study','review','test','improve'],
    'practises':     ['trains','studies','reviews','tests','improves'],
    'practised':     ['trained','studied','reviewed','tested','improved'],
    'practising':    ['training','studying','reviewing','testing','improving'],
    'mind':          ['care','like','want','accept','prefer'],
    'minds':         ['cares','likes','wants','accepts','prefers'],
    'minding':       ['caring','liking','wanting','accepting','preferring'],
    'imagine':       ['plan','picture','describe','consider','expect'],
    'imagines':      ['plans','pictures','describes','considers','expects'],
    'imagined':      ['planned','pictured','described','considered','expected'],
    'imagining':     ['planning','picturing','describing','considering','expecting'],
    'stand':         ['accept','handle','bear','manage','cope'],
    'stands':        ['accepts','handles','bears','manages','copes'],
    'stood':         ['accepted','handled','managed','coped','dealt'],
    'prefer':        ['like','enjoy','choose','suggest','consider'],
    'prefers':       ['likes','enjoys','chooses','suggests','considers'],
    'preferred':     ['liked','enjoyed','chosen','suggested','considered'],
    'preferring':    ['liking','enjoying','choosing','suggesting','considering'],
    'prioritise':    ['consider','plan','organise','manage','review'],
    'prioritises':   ['considers','plans','organises','manages','reviews'],
    'prioritised':   ['considered','planned','organised','managed','reviewed'],
    'prioritising':  ['considering','planning','organising','managing','reviewing'],
    'criticise':     ['praise','mention','report','review','discuss'],
    'criticises':    ['praises','mentions','reports','reviews','discusses'],
    'criticised':    ['praised','mentioned','reported','reviewed','discussed'],
    'criticising':   ['praising','mentioning','reporting','reviewing','discussing'],
    'avoided':       ['prevented','stopped','delayed','cancelled','reduced'],
    'avoiding':      ['preventing','stopping','delaying','cancelling','reducing'],
    'take':          ['make','do','give','need','use'],
    'takes':         ['needs','requires','uses','costs','involves'],
    'took':          ['needed','required','used','cost','involved'],
    'taking':        ['doing','making','getting','giving','leaving'],
    'admits':        ['confirms','reveals','explains','mentions','acknowledges'],
    'admitting':     ['confirming','revealing','explaining','mentioning','acknowledging'],
    // ── L22 GERUNDS — ручные дистракторы ───────────────────────────────
    'reading':       ['writing','watching','learning','studying','listening'],
    'thinking':      ['working','talking','writing','studying','learning'],
    'writing':       ['reading','typing','sending','reviewing','editing'],
    'waiting':       ['working','thinking','sitting','standing','staying'],
    'talking':       ['working','writing','thinking','reading','listening'],
    'making':        ['taking','doing','having','getting','giving'],
    'moving':        ['starting','leaving','changing','going','arriving'],
    'holding':       ['starting','planning','running','attending','cancelling'],
    'playing':       ['working','training','studying','listening','watching'],
    'losing':        ['missing','spending','wasting','delaying','failing'],
    'hearing':       ['reading','learning','checking','seeing','receiving'],
    'working':       ['studying','training','living','talking','helping'],
    'having':        ['making','taking','getting','using','keeping'],
    'starting':      ['finishing','leaving','returning','moving','changing'],
    'speaking':      ['working','writing','sitting','thinking','listening'],
    'travelling':    ['working','studying','living','moving','staying'],
    'trying':        ['doing','making','taking','working','starting'],
    'rushing':       ['working','moving','finishing','leaving','waiting'],
    'stealing':      ['taking','using','copying','removing','accessing'],
    'changing':      ['leaving','starting','moving','taking','finding'],
    'learning':      ['studying','working','teaching','practising','reading'],
    'swimming':      ['running','walking','cycling','climbing','dancing'],
    // ── L21 INDEFINITE PRONOUNS — ручные дистракторы ────────────────────
    'anything':      ['something','nothing','everything','anyone','anywhere'],
    'somewhere':     ['anywhere','nowhere','everywhere','sometime','someone'],
    'nowhere':       ['somewhere','anywhere','everywhere','nobody','nothing'],
    'everywhere':    ['somewhere','anywhere','nowhere','everything','everyone'],
    'anyone':        ['someone','nobody','everyone','anything','everybody'],
    // ── L21 NOUNS — ручные дистракторы ──────────────────────────────────
    'question':      ['issue','problem','topic','request','concern'],
    'questions':     ['issues','problems','topics','requests','concerns'],
    'room':          ['office','building','area','floor','section'],
    'rooms':         ['offices','buildings','areas','floors','sections'],
    'seat':          ['space','place','spot','desk','position'],
    'seats':         ['spaces','places','spots','desks','positions'],
    'service':       ['support','help','assistance','product','response'],
    'services':      ['support','help','assistance','products','responses'],
    'opinion':       ['idea','view','comment','recommendation','suggestion'],
    'opinions':      ['ideas','views','comments','recommendations','suggestions'],
    'cafe':          ['office','shop','room','building','restaurant'],
    'music':         ['noise','sound','news','discussion','talking'],
    'parking':       ['space','area','access','office','exit'],
    'behaviour':     ['attitude','performance','approach','style','conduct'],
    'pen':           ['paper','card','folder','item','document'],
    'camera':        ['monitor','device','screen','sensor','system'],
    'cameras':       ['monitors','devices','screens','sensors','systems'],
    'keys':          ['cards','notes','documents','items','accessories'],
    // ── L21 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'wrong':         ['right','clear','correct','serious','expected'],
    'same':          ['similar','different','correct','usual','standard'],
    'true':          ['correct','clear','possible','usual','expected'],
    'special':       ['new','urgent','specific','standard','particular'],
    'possible':      ['available','necessary','important','correct','expected'],
    'nearby':        ['inside','outside','available','open','empty'],
    'spare':         ['extra','new','available','empty','old'],
    // ── L21 VERBS — ручные дистракторы ──────────────────────────────────
    'know':          ['understand','find','see','check','remember'],
    'knows':         ['understands','finds','sees','checks','remembers'],
    'known':         ['understood','found','seen','checked','remembered'],
    'knowing':       ['understanding','finding','seeing','checking','remembering'],
    'knock':         ['call','enter','stop','wait','stand'],
    'knocks':        ['calls','enters','stops','waits','stands'],
    'knocked':       ['called','entered','stopped','waited','arrived'],
    'knocking':      ['calling','entering','stopping','waiting','standing'],
    'answered':      ['replied','responded','agreed','confirmed','accepted'],
    'answering':     ['replying','responding','agreeing','confirming','accepting'],
    'answers':       ['replies','responds','agrees','confirms','accepts'],
    'tell':          ['show','give','ask','remind','update'],
    'tells':         ['shows','gives','asks','reminds','updates'],
    'told':          ['showed','gave','asked','reminded','updated'],
    'telling':       ['showing','giving','asking','reminding','updating'],
    'change':        ['stop','start','move','improve','continue'],
    'changes':       ['stops','starts','moves','improves','continues'],
    'changed':       ['stopped','happened','improved','continued','started'],
    'agree':         ['decide','say','respond','confirm','report'],
    'agrees':        ['decides','says','responds','confirms','reports'],
    'agreed':        ['decided','said','responded','confirmed','reported'],
    'agreeing':      ['deciding','saying','responding','confirming','reporting'],
    'went':          ['came','got','turned','moved','happened'],
    'depend':        ['change','work','matter','help','affect'],
    'depends':       ['changes','works','helps','affects','counts'],
    'depended':      ['changed','worked','mattered','helped','affected'],
    'depending':     ['changing','working','mattering','helping','affecting'],
    'say':           ['tell','show','confirm','mean','mention'],
    'says':          ['tells','shows','confirms','means','mentions'],
    'said':          ['told','showed','confirmed','meant','mentioned'],
    'saying':        ['telling','showing','confirming','meaning','mentioning'],
    'leave':         ['put','move','find','miss','drop'],
    'leaves':        ['puts','moves','finds','misses','drops'],
    'left':          ['put','moved','found','forgot','dropped'],
    'leaving':       ['putting','moving','finding','missing','dropping'],
    'compare':       ['match','connect','relate','link','meet'],
    'compares':      ['matches','connects','relates','links','meets'],
    'compared':      ['matched','connected','related','linked','met'],
    'comparing':     ['matching','connecting','relating','linking','meeting'],
    'understand':    ['know','find','see','check','realise'],
    'understands':   ['knows','finds','sees','checks','realises'],
    'understood':    ['knew','found','saw','checked','realised'],
    'understanding': ['knowing','finding','seeing','checking','realising'],
    // ── L20 NOUNS — ручные дистракторы ──────────────────────────────────
    'guitar':        ['violin','keyboard','drum','instrument','trumpet'],
    'guitars':       ['violins','keyboards','drums','instruments','trumpets'],
    'printer':       ['scanner','keyboard','monitor','device','projector'],
    'printers':      ['scanners','keyboards','monitors','devices','projectors'],
    'castle':        ['tower','bridge','museum','palace','cathedral'],
    'castles':       ['towers','bridges','museums','palaces','cathedrals'],
    'university':    ['college','school','institute','academy','organisation'],
    'universities':  ['colleges','schools','institutes','academies','organisations'],
    'opportunity':   ['challenge','option','choice','offer','task'],
    'opportunities': ['challenges','options','choices','offers','tasks'],
    'mountain':      ['hill','valley','forest','lake','river'],
    'mountains':     ['hills','valleys','forests','lakes','rivers'],
    'coffee':        ['tea','milk','juice','water','drink'],
    'sky':           ['sun','moon','cloud','earth','ground'],
    'sea':           ['lake','river','ocean','shore','beach'],
    'lesson':        ['class','session','course','training','workshop'],
    'lessons':       ['classes','sessions','courses','trainings','workshops'],
    'life':          ['work','career','future','situation','time'],
    'cup':           ['glass','mug','bottle','bowl','plate'],
    'cups':          ['glasses','mugs','bottles','bowls','plates'],
    'car':           ['bus','taxi','train','van','bike'],
    'cars':          ['buses','taxis','trains','vans','bikes'],
    'house':         ['building','flat','apartment','place','office'],
    'houses':        ['buildings','flats','apartments','places','offices'],
    'apple':         ['orange','pear','banana','grape','lemon'],
    'apples':        ['oranges','pears','bananas','grapes','lemons'],
    'salt':          ['sugar','pepper','flour','cream','butter'],
    'sun':           ['moon','star','cloud','earth','sky'],
    'moon':          ['sun','star','sky','cloud','earth'],
    'elephant':      ['tiger','lion','bear','giraffe','horse'],
    'elephants':     ['tigers','lions','bears','giraffes','horses'],
    'glass':         ['cup','mug','bottle','bowl','plate'],
    'gym':           ['park','pool','office','club','studio'],
    'gyms':          ['parks','pools','offices','clubs','studios'],
    'table':         ['desk','shelf','board','floor','wall'],
    'tables':        ['desks','shelves','boards','floors','walls'],
    'economics':     ['science','history','law','politics','biology'],
    // ── L20 ADJECTIVES / ADVERBS — ручные дистракторы ───────────────────
    'blue':          ['red','green','white','grey','black'],
    'old':           ['new','modern','large','small','recent'],
    'new':           ['old','current','modern','recent','next'],
    'best':          ['worst','highest','largest','most','main'],
    'unique':        ['common','standard','simple','basic','ordinary'],
    'unexpected':    ['expected','planned','routine','known','standard'],
    'brightly':      ['clearly','quickly','softly','strongly','loudly'],
    // ── L20 VERBS — ручные дистракторы ──────────────────────────────────
    'pass':          ['give','send','take','bring','show'],
    'passes':        ['gives','sends','takes','brings','shows'],
    'passed':        ['gave','sent','took','brought','showed'],
    'passing':       ['giving','sending','taking','bringing','showing'],
    'shine':         ['rise','stand','move','fall','glow'],
    'shines':        ['rises','stands','moves','falls','glows'],
    'shining':       ['rising','standing','moving','falling','glowing'],
    'play':          ['use','try','practise','study','learn'],
    'plays':         ['uses','tries','practises','studies','learns'],
    'played':        ['used','tried','practised','studied','learnt'],
    'recommend':     ['suggest','choose','give','need','use'],
    'recommends':    ['suggests','chooses','gives','needs','uses'],
    'recommended':   ['suggested','chosen','given','needed','used'],
    'recommending':  ['suggesting','choosing','giving','needing','using'],
    'revolve':       ['move','orbit','travel','turn','rotate'],
    'revolves':      ['moves','orbits','travels','turns','rotates'],
    'revolved':      ['moved','orbited','travelled','turned','rotated'],
    'revolving':     ['moving','orbiting','travelling','turning','rotating'],
    'graduate':      ['finish','complete','leave','attend','study'],
    'graduates':     ['finishes','completes','leaves','attends','studies'],
    'graduated':     ['finished','completed','left','attended','studied'],
    'graduating':    ['finishing','completing','leaving','attending','studying'],
    'study':         ['work','attend','complete','finish','review'],
    'studies':       ['works','attends','completes','finishes','reviews'],
    'studied':       ['worked','attended','completed','finished','reviewed'],
    'studying':      ['working','attending','completing','finishing','reviewing'],
    'give':          ['make','hold','deliver','present','offer'],
    'gives':         ['makes','holds','delivers','presents','offers'],
    'gave':          ['made','held','delivered','presented','offered'],
    'giving':        ['making','holding','delivering','presenting','offering'],
    'look':          ['search','find','check','see','try'],
    'looks':         ['searches','finds','checks','sees','tries'],
    'looked':        ['searched','found','checked','saw','tried'],
    'looking':       ['searching','finding','checking','seeing','trying'],
    'buy':           ['get','find','order','choose','pick'],
    'buys':          ['gets','finds','orders','chooses','picks'],
    'bought':        ['got','found','ordered','chose','picked'],
    'buying':        ['getting','finding','ordering','choosing','picking'],
    'arrive':        ['come','leave','return','travel','move'],
    'arrives':       ['comes','leaves','returns','travels','moves'],
    'arrived':       ['came','left','returned','travelled','started'],
    'arriving':      ['coming','leaving','returning','travelling','moving'],
    // ── L19 PREPOSITIONS OF PLACE — ручные дистракторы ──────────────────
    'behind':        ['beside','opposite','above','below','across'],
    'above':         ['below','behind','beside','under','opposite'],
    'opposite':      ['beside','behind','above','next','near'],
    'front':         ['back','side','end','top','middle'],
    'corner':        ['end','front','side','top','back'],
    'bottom':        ['top','front','side','end','back'],
    'end':           ['top','front','side','bottom','back'],
    'blocks':        ['streets','floors','minutes','metres','steps'],
    // ── L19 NOUNS — ручные дистракторы ──────────────────────────────────
    'shelf':         ['table','desk','drawer','cabinet','board'],
    'shelves':       ['tables','desks','drawers','cabinets','boards'],
    'sofa':          ['chair','desk','bed','armchair','table'],
    'sofas':         ['chairs','desks','beds','armchairs','tables'],
    'fridge':        ['shelf','cabinet','cupboard','drawer','table'],
    'fridges':       ['shelves','cabinets','cupboards','drawers','tables'],
    'drawer':        ['shelf','cabinet','cupboard','table','box'],
    'drawers':       ['shelves','cabinets','cupboards','tables','boxes'],
    'cat':           ['dog','bird','mouse','rabbit','fish'],
    'cats':          ['dogs','birds','mice','rabbits','fish'],
    'bed':           ['sofa','couch','desk','chair','table'],
    'beds':          ['sofas','couches','desks','chairs','tables'],
    'mat':           ['board','shelf','table','door','desk'],
    'mats':          ['boards','shelves','tables','doors','desks'],
    'wallet':        ['bag','key','card','folder','holder'],
    'wallets':       ['bags','keys','cards','folders','holders'],
    'corridor':      ['hallway','lobby','stairway','floor','office'],
    'corridors':     ['hallways','lobbies','stairways','floors','offices'],
    'lift':          ['stairs','door','corridor','exit','window'],
    'lifts':         ['stairs','doors','corridors','exits','windows'],
    'cabinet':       ['drawer','shelf','cupboard','box','table'],
    'cabinets':      ['drawers','shelves','cupboards','boxes','tables'],
    'station':       ['airport','office','building','centre','branch'],
    'stations':      ['airports','offices','buildings','centres','branches'],
    'armchair':      ['chair','sofa','couch','desk','stool'],
    'armchairs':     ['chairs','sofas','couches','desks','stools'],
    'window':        ['door','wall','floor','ceiling','screen'],
    'windows':       ['doors','walls','floors','ceilings','screens'],
    'bin':           ['box','bag','shelf','table','container'],
    'bins':          ['boxes','bags','shelves','tables','containers'],
    'projector':     ['screen','board','monitor','camera','device'],
    'projectors':    ['screens','boards','monitors','cameras','devices'],
    'warehouse':     ['office','building','factory','storage','shop'],
    'warehouses':    ['offices','buildings','factories','stores','shops'],
    'garage':        ['office','warehouse','building','workshop','parking'],
    'garages':       ['offices','warehouses','buildings','workshops','parkings'],
    'envelope':      ['package','folder','document','letter','parcel'],
    'envelopes':     ['packages','folders','documents','letters','parcels'],
    'safe':          ['cabinet','shelf','drawer','box','vault'],
    'signature':     ['name','date','title','text','stamp'],
    'signatures':    ['names','dates','titles','texts','stamps'],
    'schedule':      ['plan','list','calendar','note','reminder'],
    'schedules':     ['plans','lists','calendars','notes','reminders'],
    'pharmacy':      ['bank','shop','clinic','office','restaurant'],
    'pharmacies':    ['banks','shops','clinics','offices','restaurants'],
    'cloud':         ['network','system','server','database','drive'],
    'floor':         ['ceiling','roof','wall','ground','surface'],
    'ground':        ['floor','ceiling','roof','surface','level'],
    'page':          ['line','section','paragraph','column','row'],
    'pages':         ['lines','sections','paragraphs','columns','rows'],
    'wire':          ['cable','pipe','cord','tube','line'],
    'wires':         ['cables','pipes','cords','tubes','lines'],
    'goods':         ['items','products','orders','files','records'],
    'bathroom':      ['office','kitchen','bedroom','storage','hall'],
    'bathrooms':     ['offices','kitchens','bedrooms','storages','halls'],
    'bank':          ['shop','office','clinic','hotel','pharmacy'],
    'banks':         ['shops','offices','clinics','hotels','pharmacies'],
    'charge':        ['service','repair','storage','use','standby'],
    // ── L19 VERBS — ручные дистракторы ──────────────────────────────────
    'sit':           ['stand','walk','work','wait','stay'],
    'sits':          ['stands','walks','works','waits','stays'],
    'sitting':       ['standing','walking','working','waiting','staying'],
    'standing':      ['sitting','walking','waiting','leaning','staying'],
    'put':           ['place','leave','keep','move','store'],
    'puts':          ['places','leaves','keeps','moves','stores'],
    'putting':       ['placing','leaving','keeping','moving','storing'],
    'hide':          ['put','move','keep','store','lock'],
    'hides':         ['puts','moves','keeps','stores','locks'],
    'hid':           ['put','moved','kept','stored','locked'],
    'hiding':        ['putting','moving','keeping','storing','locking'],
    'store':         ['keep','save','place','hold','maintain'],
    'stores':        ['keeps','saves','places','holds','maintains'],
    'stored':        ['kept','saved','placed','held','maintained'],
    'storing':       ['keeping','saving','placing','holding','maintaining'],
    'found':         ['lost','left','saw','checked','dropped'],
    // ── L18 IMPERATIVES — ручные дистракторы ────────────────────────────
    'open':          ['close','lock','fix','leave','check'],
    'opens':         ['closes','locks','fixes','leaves','checks'],
    'opened':        ['closed','locked','fixed','left','checked'],
    'opening':       ['closing','locking','fixing','leaving','checking'],
    'close':         ['open','lock','turn','leave','break'],
    'closes':        ['opens','locks','turns','leaves','breaks'],
    'closed':        ['opened','locked','turned','left','broken'],
    'closing':       ['opening','locking','turning','leaving','breaking'],
    'help':          ['stop','call','find','fix','join'],
    'helps':         ['stops','calls','finds','fixes','joins'],
    'helped':        ['stopped','called','found','fixed','joined'],
    'helping':       ['stopping','calling','finding','fixing','joining'],
    'listen':        ['speak','read','write','talk','respond'],
    'listens':       ['speaks','reads','writes','talks','responds'],
    'listened':      ['spoke','read','wrote','talked','responded'],
    'listening':     ['speaking','reading','writing','talking','responding'],
    'call':          ['message','email','write','contact','text'],
    'calls':         ['messages','emails','writes','contacts','texts'],
    'called':        ['messaged','emailed','wrote','contacted','texted'],
    'calling':       ['messaging','emailing','writing','contacting','texting'],
    'forget':        ['remember','lose','drop','miss','ignore'],
    'forgets':       ['remembers','loses','drops','misses','ignores'],
    'forgot':        ['remembered','lost','dropped','missed','ignored'],
    'forgotten':     ['remembered','lost','dropped','missed','ignored'],
    'forgetting':    ['remembering','losing','dropping','missing','ignoring'],
    'come':          ['go','arrive','leave','return','stay'],
    'comes':         ['goes','arrives','leaves','returns','stays'],
    'came':          ['went','arrived','left','returned','stayed'],
    'coming':        ['going','arriving','leaving','returning','staying'],
    'turn':          ['switch','change','move','press','click'],
    'turns':         ['switches','changes','moves','presses','clicks'],
    'turned':        ['switched','changed','moved','pressed','clicked'],
    'turning':       ['switching','changing','moving','pressing','clicking'],
    'slowly':        ['quickly','clearly','carefully','correctly','properly'],
    'loudly':        ['quietly','clearly','quickly','slowly','softly'],
    'wait':          ['stay','work','stand','sit','remain'],
    'waits':         ['stays','works','stands','sits','remains'],
    'waited':        ['stayed','worked','stood','sat','remained'],
    'careful':       ['polite','quiet','ready','quick','safe'],
    'send':          ['give','bring','take','post','pass'],
    'sends':         ['gives','brings','takes','posts','passes'],
    'sending':       ['giving','bringing','taking','posting','passing'],
    'check':         ['read','update','review','open','access'],
    'checks':        ['reads','updates','reviews','opens','accesses'],
    'checked':       ['read','updated','reviewed','opened','accessed'],
    'checking':      ['reading','updating','reviewing','opening','accessing'],
    'touch':         ['move','open','use','break','change'],
    'touches':       ['moves','opens','uses','breaks','changes'],
    'touched':       ['moved','opened','used','broke','changed'],
    'touching':      ['moving','opening','using','breaking','changing'],
    'hasty':         ['quick','slow','serious','wrong','difficult'],
    'polite':        ['helpful','quiet','careful','calm','ready'],
    'carefully':     ['quickly','slowly','properly','correctly','directly'],
    'ask':           ['tell','help','remind','show','advise'],
    'asks':          ['tells','helps','reminds','shows','advises'],
    'asking':        ['telling','helping','reminding','showing','advising'],
    'use':           ['open','run','start','try','apply'],
    'using':         ['opening','running','starting','trying','applying'],
    'show':          ['give','tell','send','explain','demonstrate'],
    'shows':         ['gives','tells','sends','explains','demonstrates'],
    'showed':        ['gave','told','sent','explained','demonstrated'],
    'showing':       ['giving','telling','sending','explaining','demonstrating'],
    'bring':         ['send','give','take','carry','pass'],
    'brings':        ['sends','gives','takes','carries','passes'],
    'brought':       ['sent','gave','took','carried','passed'],
    'bringing':      ['sending','giving','taking','carrying','passing'],
    'respect':       ['value','follow','accept','trust','support'],
    'respects':      ['values','follows','accepts','trusts','supports'],
    'respected':     ['valued','followed','accepted','trusted','supported'],
    'respecting':    ['valuing','following','accepting','trusting','supporting'],
    'stay':          ['remain','wait','stand','sit','keep'],
    'stays':         ['remains','waits','stands','sits','keeps'],
    'stayed':        ['remained','waited','stood','sat','kept'],
    'staying':       ['remaining','waiting','standing','sitting','keeping'],
    'express':       ['show','share','describe','mention','explain'],
    'expresses':     ['shows','shares','describes','mentions','explains'],
    'expressed':     ['showed','shared','described','mentioned','explained'],
    'expressing':    ['showing','sharing','describing','mentioning','explaining'],
    'thoughts':      ['ideas','views','plans','words','opinions'],
    'thought':       ['idea','view','plan','word','opinion'],
    'receipt':       ['payment','invoice','order','confirmation','delivery'],
    'receipts':      ['payments','invoices','orders','confirmations','deliveries'],
    'initiative':    ['effort','action','proposal','idea','approach'],
    'initiatives':   ['efforts','actions','proposals','ideas','approaches'],
    'morning':       ['evening','afternoon','night','week','day'],
    'door':          ['window','wall','floor','ceiling','screen'],
    'doors':         ['windows','walls','floors','ceilings','screens'],
    'minute':        ['moment','second','hour','step','day'],
    'minutes':       ['moments','seconds','hours','steps','days'],
    'time':          ['date','day','moment','week','period'],
    'times':         ['dates','days','moments','weeks','periods'],
    'Friday':        ['Monday','Thursday','morning','weekend','evening'],
    // ── L17 PRESENT CONTINUOUS — ручные дистракторы ─────────────────────
    'prepare':       ['plan','arrange','create','organise','schedule'],
    'prepares':      ['plans','arranges','creates','organises','schedules'],
    'prepared':      ['planned','arranged','created','organised','scheduled'],
    'preparing':     ['planning','arranging','creating','organising','scheduling'],
    'planning':      ['preparing','arranging','starting','organising','considering'],
    'do':            ['make','take','give','get','have'],
    'doing':         ['making','taking','giving','getting','having'],
    'done':          ['made','taken','given','got','had'],
    'test':          ['check','review','run','try','evaluate'],
    'tests':         ['checks','reviews','runs','tries','evaluates'],
    'tested':        ['checked','reviewed','ran','tried','evaluated'],
    'testing':       ['checking','reviewing','running','trying','evaluating'],
    'consult':       ['ask','check','talk','discuss','meet'],
    'consults':      ['asks','checks','talks','discusses','meets'],
    'consulted':     ['asked','checked','talked','discussed','met'],
    'consulting':    ['asking','checking','talking','discussing','meeting'],
    'conduct':       ['manage','run','lead','hold','organise'],
    'conducts':      ['manages','runs','leads','holds','organises'],
    'conducted':     ['managed','ran','led','held','organised'],
    'conducting':    ['managing','running','leading','holding','organising'],
    'switch':        ['move','change','convert','migrate','upgrade'],
    'switches':      ['moves','changes','converts','migrates','upgrades'],
    'switched':      ['moved','changed','converted','migrated','upgraded'],
    'switching':     ['moving','changing','converting','migrating','upgrading'],
    'platform':      ['system','tool','network','program','service'],
    'platforms':     ['systems','tools','networks','programs','services'],
    'relationship':  ['connection','contact','partnership','network','link'],
    'relationships': ['connections','contacts','partnerships','networks','links'],
    'remotely':      ['temporarily','daily','currently','regularly','recently'],
    'lately':        ['recently','currently','daily','normally','usually'],
    'usually':       ['always','never','still','daily','often'],
    'still':         ['already','just','often','always','never'],
    'usual':         ['normal','average','expected','standard','typical'],
    // ── L16 PHRASAL VERBS — ручные дистракторы ──────────────────────────
    'up':            ['on','out','off','down','back'],
    'out':           ['up','on','off','back','in'],
    'off':           ['on','up','out','back','in'],
    'down':          ['up','on','out','off','back'],
    'across':        ['up','into','over','on','through'],
    'forward':       ['back','on','up','across','over'],
    'against':       ['up','out','over','through','into'],
    'article':       ['report','document','text','item','piece'],
    'articles':      ['reports','documents','texts','items','pieces'],
    'failure':       ['problem','error','delay','issue','breakdown'],
    'failures':      ['problems','errors','delays','issues','breakdowns'],
    'illness':       ['injury','problem','absence','issue','condition'],
    'illnesses':     ['injuries','problems','absences','issues','conditions'],
    'debt':          ['loan','payment','cost','bill','balance'],
    'debts':         ['loans','payments','costs','bills','balances'],
    'salary':        ['payment','bonus','wage','fee','income'],
    'salaries':      ['payments','bonuses','wages','fees','incomes'],
    'weekend':       ['evening','holiday','break','week','morning'],
    'quarter':       ['month','period','year','week','phase'],
    'quarters':      ['months','periods','years','weeks','phases'],
    'unnecessary':   ['wrong','unclear','unwanted','minor','irrelevant'],
    'carry':         ['keep','go','move','stay','continue'],
    'carries':       ['keeps','goes','moves','stays','continues'],
    'carried':       ['kept','gone','moved','stayed','continued'],
    'carrying':      ['keeping','going','moving','staying','continuing'],
    'walk':          ['run','go','drive','come','move'],
    'walks':         ['runs','goes','drives','comes','moves'],
    'walked':        ['ran','went','drove','came','moved'],
    'walking':       ['running','going','driving','coming','moving'],
    'pick':          ['take','get','collect','bring','find'],
    'picks':         ['takes','gets','collects','brings','finds'],
    'picked':        ['took','got','collected','brought','found'],
    'picking':       ['taking','getting','collecting','bringing','finding'],
    'cross':         ['strike','remove','delete','cancel','erase'],
    'crosses':       ['strikes','removes','deletes','cancels','erases'],
    'crossed':       ['struck','removed','deleted','cancelled','erased'],
    'crossing':      ['striking','removing','deleting','cancelling','erasing'],
    'count':         ['rely','depend','expect','wait','hope'],
    'counts':        ['relies','depends','expects','waits','hopes'],
    'counted':       ['relied','depended','expected','waited','hoped'],
    'counting':      ['relying','depending','expecting','waiting','hoping'],
    'pay':           ['give','return','transfer','send','clear'],
    'pays':          ['gives','returns','transfers','sends','clears'],
    'paid':          ['given','returned','transferred','sent','cleared'],
    'paying':        ['giving','returning','transferring','sending','clearing'],
    'hand':          ['give','pass','submit','deliver','send'],
    'hands':         ['gives','passes','submits','delivers','sends'],
    'handed':        ['given','passed','submitted','delivered','sent'],
    'handing':       ['giving','passing','submitting','delivering','sending'],
    'step':          ['rise','move','stand','come','take'],
    'steps':         ['rises','moves','stands','comes','takes'],
    'stepped':       ['rose','moved','stood','came','took'],
    'stepping':      ['rising','moving','standing','coming','taking'],
    'run':           ['walk','come','go','bump','meet'],
    'runs':          ['walks','comes','goes','meets','arrives'],
    'ran':           ['walked','came','went','met','arrived'],
    'running':       ['walking','coming','going','meeting','arriving'],
    // ── L15 POSSESSIVE PRONOUNS — ручные дистракторы ────────────────────
    'mine':          ['yours','his','hers','ours','theirs'],
    'yours':         ['mine','his','hers','ours','theirs'],
    'hers':          ['mine','yours','his','ours','theirs'],
    'ours':          ['mine','yours','his','hers','theirs'],
    'theirs':        ['mine','yours','his','hers','ours'],
    'territory':     ['area','zone','space','region','domain'],
    'territories':   ['areas','zones','spaces','regions','domains'],
    'fault':         ['mistake','error','problem','issue','failure'],
    'faults':        ['mistakes','errors','problems','issues','failures'],
    'achievement':   ['success','result','outcome','progress','milestone'],
    'achievements':  ['successes','results','outcomes','milestones','improvements'],
    'choice':        ['option','decision','plan','idea','answer'],
    'choices':       ['options','decisions','plans','ideas','answers'],
    'chance':        ['opportunity','option','choice','moment','possibility'],
    'chances':       ['opportunities','options','choices','moments','possibilities'],
    'differ':        ['change','improve','develop','vary','compare'],
    'differs':       ['changes','improves','develops','varies','compares'],
    'differed':      ['changed','improved','developed','varied','compared'],
    'differing':     ['changing','improving','developing','varying','comparing'],
    'deserve':       ['get','need','want','expect','receive'],
    'deserves':      ['gets','needs','wants','expects','receives'],
    'deserved':      ['got','needed','wanted','expected','received'],
    'deserving':     ['getting','needing','wanting','expecting','receiving'],
    'bigger':        ['smaller','higher','longer','lower','shorter'],
    // ── L14 COMPARATIVES / SUPERLATIVES — ручные дистракторы ────────────
    'better':        ['worse','faster','slower','higher','lower'],
    'harder':        ['easier','faster','slower','softer','longer'],
    'cheaper':       ['pricier','costlier','higher','more','longer'],
    'simpler':       ['harder','easier','clearer','faster','smaller'],
    'stricter':      ['looser','easier','softer','clearer','gentler'],
    'faster':        ['slower','harder','longer','shorter','higher'],
    'worst':         ['best','longest','shortest','highest','lowest'],
    'biggest':       ['smallest','longest','highest','lowest','newest'],
    'fastest':       ['slowest','longest','shortest','highest','lowest'],
    'competent':     ['experienced','qualified','skilled','capable','senior'],
    'popular':       ['common','well-known','standard','successful','familiar'],
    'convenient':    ['practical','simple','efficient','useful','easy'],
    'professional':  ['experienced','qualified','competent','skilled','capable'],
    'competitive':   ['strong','high','tough','aggressive','fast'],
    'realistic':     ['practical','achievable','reasonable','simple','possible'],
    'profitable':    ['successful','beneficial','effective','useful','valuable'],
    'complex':       ['simple','serious','difficult','large','major'],
    'risky':         ['safe','difficult','uncertain','serious','challenging'],
    'favourable':    ['positive','good','acceptable','reasonable','beneficial'],
    'qualified':     ['experienced','competent','skilled','senior','capable'],
    'directly':      ['quickly','properly','clearly','recently','personally'],
    'less':          ['more','most','least','few','some'],
    'hotel':         ['office','building','apartment','resort','hostel'],
    'hotels':        ['offices','buildings','apartments','resorts','hostels'],
    'route':         ['road','path','option','direction','journey'],
    'routes':        ['roads','paths','options','directions','journeys'],
    'software':      ['system','program','tool','application','platform'],
    'connection':    ['access','network','link','system','service'],
    'connections':   ['accesses','networks','links','systems','services'],
    'practice':      ['work','business','process','standard','history'],
    'practices':     ['works','businesses','processes','standards','histories'],
    'competitors':   ['clients','partners','customers','suppliers','providers'],
    'competitor':    ['client','partner','customer','supplier','provider'],
    // ── L13 FUTURE SIMPLE (WILL) — ручные дистракторы ───────────────────
    'advice':        ['suggestion','feedback','recommendation','tip','comment'],
    'investor':      ['client','partner','shareholder','manager','director'],
    'holiday':       ['break','vacation','leave','rest','trip'],
    'holidays':      ['breaks','vacations','leaves','rests','trips'],
    'confirmation':  ['response','approval','update','notification','message'],
    'confirmations': ['responses','approvals','updates','notifications','messages'],
    'settle':        ['agree','accept','resolve','close','confirm'],
    'settles':       ['agrees','accepts','resolves','closes','confirms'],
    'settled':       ['agreed','accepted','resolved','closed','confirmed'],
    'settling':      ['agreeing','accepting','resolving','closing','confirming'],
    'renew':         ['extend','update','review','continue','sign'],
    'renews':        ['extends','updates','reviews','continues','signs'],
    'renewed':       ['extended','updated','reviewed','continued','signed'],
    'renewing':      ['extending','updating','reviewing','continuing','signing'],
    'choose':        ['select','find','pick','accept','decide'],
    'chooses':       ['selects','finds','picks','accepts','decides'],
    'chose':         ['selected','found','picked','accepted','decided'],
    'chosen':        ['selected','found','picked','accepted','decided'],
    'choosing':      ['selecting','finding','picking','accepting','deciding'],
    'enter':         ['open','join','reach','access','achieve'],
    'enters':        ['opens','joins','reaches','accesses','achieves'],
    'entered':       ['opened','joined','reached','accessed','achieved'],
    'entering':      ['opening','joining','reaching','accessing','achieving'],
    'increase':      ['reduce','improve','raise','grow','expand'],
    'increases':     ['reduces','improves','raises','grows','expands'],
    'increased':     ['reduced','improved','raised','grown','expanded'],
    'increasing':    ['reducing','improving','raising','growing','expanding'],
    'let':           ['tell','inform','show','remind','update'],
    'lets':          ['tells','informs','shows','reminds','updates'],
    'March':         ['April','January','February','May','June'],
    // ── L12 PAST SIMPLE — ручные дистракторы ────────────────────────────
    'saw':           ['met','found','heard','checked','noticed'],
    'got':           ['had','made','took','found','gave'],
    'made':          ['did','got','had','gave','took'],
    'knew':          ['heard','felt','saw','thought','believed'],
    'wrote':         ['read','sent','checked','prepared','reviewed'],
    'met':           ['saw','heard','found','joined','called'],
    'lost':          ['missed','dropped','left','failed','forgot'],
    'sold':          ['bought','found','gave','sent','transferred'],
    'heard':         ['saw','knew','found','read','noticed'],
    'won':           ['got','found','made','reached','achieved'],
    'split':         ['left','went','stopped','ended','finished'],
    'spoke':         ['said','told','talked','wrote','called'],
    'equipment':     ['tools','devices','supplies','materials','resources'],
    'argument':      ['reason','point','fact','claim','objection'],
    'arguments':     ['reasons','points','facts','claims','objections'],
    'tender':        ['contract','bid','proposal','application','offer'],
    'tenders':       ['contracts','bids','proposals','applications','offers'],
    'loan':          ['credit','payment','fund','investment','grant'],
    'loans':         ['credits','payments','funds','investments','grants'],
    'invoice':       ['bill','receipt','statement','order','payment'],
    'invoices':      ['bills','receipts','statements','orders','payments'],
    'batch':         ['group','set','order','lot','collection'],
    'batches':       ['groups','sets','orders','lots','collections'],
    'letter':        ['email','note','message','memo','document'],
    'night':         ['morning','day','evening','week','hour'],
    'hour':          ['day','week','minute','month','moment'],
    'hours':         ['days','weeks','minutes','months','moments'],
    // ── L11 PAST SIMPLE (REGULAR -ED) — ручные дистракторы ──────────────
    'visited':       ['toured','explored','attended','inspected','travelled'],
    'watched':       ['read','checked','listened','attended','monitored'],
    'wanted':        ['needed','decided','planned','hoped','expected'],
    'worked':        ['studied','trained','lived','helped','stayed'],
    'started':       ['finished','stopped','continued','completed','paused'],
    'moved':         ['started','left','changed','transferred','arrived'],
    'uploaded':      ['downloaded','saved','sent','shared','exported'],
    'tried':         ['managed','completed','tested','submitted','attempted'],
    'filled':        ['completed','submitted','signed','prepared','sent'],
    'translated':    ['written','edited','reviewed','prepared','adapted'],
    'talked':        ['spoke','wrote','discussed','replied','responded'],
    'clarified':     ['confirmed','described','mentioned','noted','restated'],
    'reacted':       ['responded','replied','acted','answered','proceeded'],
    'registered':    ['applied','enrolled','joined','booked','confirmed'],
    'submitted':     ['completed','sent','uploaded','delivered','filed'],
    'reduced':       ['increased','changed','maintained','controlled','managed'],
    'attended':      ['joined','organised','missed','hosted','cancelled'],
    'planned':       ['organised','prepared','arranged','scheduled','confirmed'],
    // ── L11 NOUNS — ручные дистракторы ──────────────────────────────────
    'tennis':        ['football','basketball','golf','volleyball','swimming'],
    'course':        ['class','programme','training','workshop','seminar'],
    'form':          ['document','report','template','request','sheet'],
    'programme':     ['course','project','plan','initiative','scheme'],
    'seminar':       ['workshop','conference','training','session','class'],
    'file':          ['document','folder','report','record','attachment'],
    'task':          ['job','project','activity','assignment','duty'],
    'friend':        ['colleague','partner','manager','contact','client'],
    // ── L11 ADVERBS — ручные дистракторы ────────────────────────────────
    'quickly':       ['slowly','carefully','properly','correctly','directly'],
    'several':       ['many','few','some','most','various'],
    'ahead':         ['early','behind','late','before','after'],
    // ── L10 MODALS (CAN / SHOULD / MUST / MIGHT / MAY / COULD) — ручные дистракторы ──
    'swim':          ['run','walk','cycle','dive','train'],
    'drive':         ['ride','travel','commute','cycle','move'],
    'find':          ['get','make','reach','create','build'],
    'speak':         ['read','write','use','learn','know'],
    'read':          ['write','sign','check','send','review'],
    'work':          ['study','help','live','stay','finish'],
    'rush':          ['hurry','finish','move','leave','wait'],
    // ── L10 NOUNS — ручные дистракторы ──────────────────────────────────
    'doctor':        ['manager','consultant','specialist','adviser','expert'],
    'language':      ['skill','subject','course','tool','area'],
    'languages':     ['skills','subjects','courses','areas','programmes'],
    'option':        ['choice','answer','solution','decision','approach'],
    'options':       ['choices','answers','solutions','decisions','approaches'],
    // ── L10 ADJECTIVES — ручные дистракторы ─────────────────────────────
    'delayed':       ['cancelled','postponed','rescheduled','moved','missed'],
    // ── L9 THERE IS / THERE ARE — ручные дистракторы ────────────────────
    'chair':         ['desk','table','sofa','stool','seat'],
    'chairs':        ['desks','tables','sofas','stools','seats'],
    'space':         ['area','room','place','spot','section'],
    'spaces':        ['areas','rooms','places','spots','sections'],
    'area':          ['zone','region','section','district','location'],
    'metro':         ['bus','train','tram','car','taxi'],
    'stock':         ['supply','inventory','goods','materials','equipment'],
    'website':       ['system','platform','database','network','portal'],
    'transport':     ['traffic','service','travel','access','route'],
    'light':         ['space','air','heat','sound','power'],
    'clause':        ['condition','term','section','point','requirement'],
    'clauses':       ['conditions','terms','sections','points','requirements'],
    'diversion':     ['delay','problem','change','obstacle','closure'],
    'road':          ['street','route','path','motorway','avenue'],
    'error':         ['mistake','problem','issue','fault','defect'],
    'slot':          ['time','space','date','period','opening'],
    'slots':         ['times','spaces','dates','periods','openings'],
    'school':        ['college','university','academy','institute','centre'],
    'schools':       ['colleges','universities','academies','institutes','centres'],
    'competition':   ['demand','pressure','growth','activity','challenge'],
    // ── L9 ADJECTIVES / ADVERBS — ручные дистракторы ────────────────────
    'necessary':     ['required','relevant','important','useful','standard'],
    'enough':        ['sufficient','adequate','available','ready','complete'],
    'alternative':   ['different','additional','new','optional','available'],
    'clear':         ['correct','direct','simple','certain','exact'],
    'disputed':      ['unclear','sensitive','open','unresolved','complex'],
    'good':          ['great','strong','clear','important','useful'],
    // ── L8 PREPOSITIONS OF TIME (AT / ON / IN / BY / AGO) — ручные дистракторы ──
    'ago':           ['later','before','earlier','since','after'],
    // ── L8 VERBS — ручные дистракторы ────────────────────────────────────
    'departs':       ['arrives','leaves','starts','begins','stops'],
    'expires':       ['ends','finishes','closes','stops','renews'],
    'submit':        ['complete','send','prepare','deliver','upload'],
    // ── L8 NOUNS — ручные дистракторы ────────────────────────────────────
    'neighbourhood': ['area','district','location','community','zone'],
    'class':         ['lesson','course','session','workshop','group'],
    'shop':          ['store','office','centre','market','building'],
    'afternoon':     ['morning','evening','night','weekend','midday'],
    'evening':       ['morning','afternoon','night','day','weekend'],
    'weekdays':      ['weekends','mornings','evenings','weeks','days'],
    'Monday':        ['Tuesday','Wednesday','Thursday','Friday','Sunday'],
    'Tuesday':       ['Monday','Wednesday','Thursday','Friday','Saturday'],
    'Wednesday':     ['Tuesday','Thursday','Monday','Friday','Saturday'],
    'Thursday':      ['Wednesday','Friday','Tuesday','Monday','Saturday'],
    'June':          ['July','August','September','October','November'],
    'May':           ['April','June','July','August','September'],
    'January':       ['February','March','April','October','November'],
    'December':      ['November','October','September','January','February'],
    // ── L8 ADJECTIVES — ручные дистракторы ──────────────────────────────
    'born':          ['raised','based','trained','employed','educated'],
    // ── L7 HAVE / HAS — ручные дистракторы ──────────────────────────────
    'have':          ['get','make','take','need','own'],
    'has':           ['gets','makes','takes','needs','owns'],
    // ── L7 NOUNS — ручные дистракторы ────────────────────────────────────
    'brother':       ['sister','colleague','friend','partner','neighbour'],
    'brothers':      ['sisters','colleagues','friends','partners','children'],
    'card':          ['document','form','pass','permit','note'],
    'degree':        ['certificate','diploma','qualification','licence','title'],
    'talent':        ['skill','ability','strength','quality','gift'],
    'computer':      ['laptop','tablet','phone','device','screen'],
    'number':        ['address','code','name','contact','reference'],
    'passport':      ['visa','card','licence','permit','document'],
    'world':         ['market','region','industry','sector','network'],
    'sense':         ['understanding','knowledge','awareness','grasp','feeling'],
    'humour':        ['manner','attitude','personality','style','approach'],
    'offices':       ['buildings','centres','branches','locations','spaces'],
    // ── L7 ADJECTIVES / ADVERBS — ручные дистракторы ────────────────────
    'own':           ['main','new','existing','current','additional'],
    'yet':           ['still','now','already','soon','ever'],
    'now':           ['yet','still','today','here','soon'],
    // ── L6 WH-QUESTIONS — ручные дистракторы ────────────────────────────
    'what':          ['where','when','why','who','how'],
    'why':           ['where','when','what','who','how'],
    'how':           ['where','when','what','who','why'],
    // ── L6 VERBS — ручные дистракторы ────────────────────────────────────
    'live':          ['work','stay','study','travel','move'],
    'lasts':         ['ends','finishes','continues','runs','takes'],
    'mean':          ['say','suggest','indicate','show','imply'],
    'means':         ['says','suggests','indicates','shows','implies'],
    'trust':         ['use','follow','support','confirm','rely'],
    'trusts':        ['uses','follows','supports','confirms','relies'],
    'sell':          ['offer','provide','supply','export','deliver'],
    'sells':         ['offers','provides','supplies','exports','delivers'],
    'update':        ['review','check','upgrade','improve','change'],
    'updates':       ['reviews','checks','upgrades','improves','changes'],
    'follow':        ['use','join','check','read','track'],
    'follows':       ['uses','joins','checks','reads','tracks'],
    // ── L6 NOUNS — ручные дистракторы ────────────────────────────────────
    'name':          ['address','email','title','reference','contact'],
    'discount':      ['offer','deal','saving','reduction','benefit'],
    'discounts':     ['offers','deals','savings','reductions','benefits'],
    'finance':       ['accounting','economics','management','investment','budget'],
    'tax':           ['fee','cost','charge','payment','deduction'],
    'taxes':         ['fees','costs','charges','payments','deductions'],
    'position':      ['role','title','post','level','grade'],
    'news':          ['information','update','announcement','report','notice'],
    'people':        ['employees','members','colleagues','customers','users'],
    'app':           ['tool','software','system','programme','platform'],
    'newspaper':     ['magazine','article','report','document','book'],
    'newspapers':    ['magazines','articles','reports','documents','books'],
    'marketing':     ['sales','finance','operations','management','communications'],
    'podcasts':      ['programmes','series','videos','interviews','shows'],
    // ── L6 ADJECTIVES / ADVERBS — ручные дистракторы ────────────────────
    'long':          ['short','quick','busy','slow','much'],
    'far':           ['near','close','distant','away','abroad'],
    'much':          ['many','few','some','less','more'],
    'many':          ['few','some','more','less','most'],
    'often':         ['always','rarely','sometimes','never','usually'],
    // ── L5 DO / DOES QUESTIONS — ручные дистракторы ──────────────────────
    'drink':         ['eat','read','take','use','have'],
    'drinks':        ['eats','reads','takes','uses','has'],
    'eat':           ['drink','take','use','make','try'],
    'eats':          ['drinks','takes','uses','makes','tries'],
    'travel':        ['work','study','live','commute','move'],
    'travels':       ['works','studies','lives','commutes','moves'],
    'think':         ['know','feel','believe','consider','wonder'],
    'thinks':        ['knows','feels','believes','considers','wonders'],
    'get':           ['go','come','take','make','find'],
    'gets':          ['goes','comes','takes','makes','finds'],
    'waste':         ['use','spend','take','lose','miss'],
    // ── L5 NOUNS — ручные дистракторы ────────────────────────────────────
    'meat':          ['fish','dairy','bread','vegetables','food'],
    'TV':            ['radio','computer','phone','screen','monitor'],
    'alcohol':       ['coffee','tea','water','juice','milk'],
    'personal':      ['private','sensitive','internal','confidential','individual'],
    'consequences':  ['results','effects','outcomes','impacts','implications'],
    'promises':      ['commitments','agreements','plans','targets','goals'],
    'trips':         ['visits','journeys','meetings','conferences','calls'],
    'credit':        ['debit','payment','cash','invoice','transfer'],
    'instructions':  ['guidelines','rules','steps','directions','procedures'],
    // ── L5 ADVERBS — ручные дистракторы ─────────────────────────────────
    'online':        ['offline','remotely','directly','locally','manually'],
    'along':         ['ahead','away','apart','together','across'],
    'latest':        ['recent','current','new','updated','modern'],
    // ── L4 / L3 PRESENT SIMPLE (DO NOT / DOES NOT + AFFIRMATIVE) — ручные дистракторы ──
    'speaks':        ['works','studies','reads','understands','writes'],
    'reads':         ['writes','checks','sends','reviews','studies'],
    'drives':        ['travels','commutes','arrives','leaves','works'],
    'writes':        ['sends','reads','checks','prepares','edits'],
    // ── L4 / L3 NOUNS — ручные дистракторы ──────────────────────────────
    'summer':        ['winter','spring','autumn','year','season'],
    'groceries':     ['supplies','goods','products','food','items'],
    'supermarket':   ['shop','store','market','centre','outlet'],
    'Europe':        ['Asia','America','London','market','region'],
    'blog':          ['website','article','magazine','report','newsletter'],
    'centre':        ['office','building','area','hub','location'],
    'Sunday':        ['Monday','Saturday','Tuesday','Wednesday','Thursday'],
    'Sundays':       ['Mondays','Saturdays','Tuesdays','Wednesdays','Thursdays'],
    'Fridays':       ['Mondays','Saturdays','Tuesdays','Wednesdays','Thursdays'],
    'French':        ['English','German','Italian','Spanish','Russian'],
    // ── L4 / L3 ADVERBS — ручные дистракторы ────────────────────────────
    'weekly':        ['daily','monthly','annually','regularly','occasionally'],
    'once':          ['twice','rarely','often','always','sometimes'],
    'rarely':        ['often','always','never','sometimes','occasionally'],
    'sometimes':     ['always','never','often','rarely','usually'],
    'always':        ['never','rarely','sometimes','often','usually'],
    'never':         ['always','sometimes','rarely','often','usually'],
    // ── L2 / L1 TO BE (AM / IS / ARE + NEGATION) — ручные дистракторы ──
    'teacher':       ['engineer','programmer','lawyer','consultant','analyst'],
    'very':          ['quite','so','really','rather','extremely'],
  };
  const disambigPool = DISAMBIG_POOLS[correctWord.toLowerCase()];
  if (disambigPool) {
    // Next-word trap: for articles and to-be words, include next phrase word as a distractor
    // so that users who try to skip the article/verb still get caught.
    const NEXT_WORD_TRAP_KEYS = new Set(['a','an','the','is','are','was','were','am','be']);
    let pool = [...disambigPool];
    // Only add next-word trap if there is room — prevents randomly dropping a valid distractor
    if (NEXT_WORD_TRAP_KEYS.has(correctWord.toLowerCase()) && pool.length < 5) {
      const nextWord = allWords[wordIndex + 1];
      if (nextWord && singleWord(nextWord) && nextWord !== correctWord
          && !pool.includes(nextWord) && !pool.map(w=>w.toLowerCase()).includes(nextWord.toLowerCase())) {
        pool = [nextWord, ...pool];
      }
    }
    return shuffle([correctWord, ...shuffle(pool).slice(0, 5)]);
  }

  // Проверяем принадлежность слова к конкретному пулу по смыслу
  // Порядок важен: сначала специфические, потом общие
  const SEMANTIC_POOLS: (keyof typeof WORD_POOLS_L1)[] = [
    'toBe','toBe_neg','have','there',
    'pronouns','modals','negation',
    'prepositions','conjunctions','articles','question','numbers','timeUnits',
    'adjectives','adverbs','comparison',
    'passive','perfect','continuous','conditional','reported',
    // CHANGE v4: removed 'phrasal' and 'usedto' — all their entries are multi-word phrases,
    // so they must never be used as distractor sources (rule: one word per cell).
    'reflexive','gerund','relative','complex',
    'jobs','objects','people','places','nouns','verbs','misc',
  ];
  for (const poolKey of SEMANTIC_POOLS) {
    const pool = WORD_POOLS_L1[poolKey];
    if (!pool) continue;
    const cw = correctWord.toLowerCase();
    if (pool.some(w => w.toLowerCase() === cw)) {
      // CHANGE v4: apply singleWord filter — any residual multi-word entries in a pool must not become distractors.
      let distractors = pool.filter(w => w.toLowerCase() !== cw && singleWord(w));
      if (distractors.length >= 3) {
        // For objects/people/places pools: prefer same-plurality distractors
        // e.g. "chairs" (plural) → prefer other plurals as distractors
        if (['objects','people','places','nouns'].includes(poolKey)) {
          const isPluralLike = cw.endsWith('s') && cw.length > 3 && !cw.endsWith('ss');
          const samePlural = isPluralLike
            ? distractors.filter(w => w.endsWith('s') && w.length > 3 && !w.endsWith('ss'))
            : distractors.filter(w => !w.endsWith('s') || w.length <= 3 || w.endsWith('ss'));
          if (samePlural.length >= 3) distractors = samePlural;
        }
        // For pronouns pool: next-word trap (same pedagogical principle as articles)
        if (poolKey === 'pronouns') {
          const nextWord = allWords[wordIndex + 1];
          let trap: string[] = [];
          if (nextWord && singleWord(nextWord) && nextWord !== correctWord
              && !distractors.map(w=>w.toLowerCase()).includes(nextWord.toLowerCase())) {
            trap = [nextWord];
          }
          const pronounDist = shuffle(distractors).slice(0, 5 - trap.length);
          return shuffle([correctWord, ...trap, ...pronounDist]);
        }
        return shuffle([correctWord, ...shuffle(distractors).slice(0, 5)]);
      }
    }
  }

  // Берём категории для текущего урока
  const topicCats = LESSON_TOPIC_POOLS[lessonId] || LESSON_TOPIC_POOLS[1];

  // Пул дистракторов из категорий темы урока
  // CHANGE v4: singleWord guard added to topic and fallback pools.
  const topicPool = topicCats.flatMap(cat => WORD_POOLS_L1[cat])
    .map(normalizePool)
    .filter((w, i, arr) => w !== correctWord && singleWord(w) && arr.indexOf(w) === i);

  let distractors = shuffle(topicPool).slice(0, 5);

  // Если мало — добираем из общего пула
  if (distractors.length < 5) {
    const fallback = [
      ...WORD_POOLS_L1.verbs,
      ...WORD_POOLS_L1.nouns,
      ...WORD_POOLS_L1.adjectives,
      ...WORD_POOLS_L1.adverbs,
    ].map(normalizePool).filter(w => singleWord(w) && w !== correctWord && !distractors.includes(w));
    distractors = [...distractors, ...shuffle(fallback)].slice(0, 5);
  }

  // 1 правильное + 5 дистракторов = ровно 6
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const w of [correctWord, ...distractors]) {
    const key = w.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(w);
    }
  }
  if (unique.length < 6) {
    // CHANGE v4: singleWord guard in final fallback.
    const fallback = [
      ...WORD_POOLS_L1.verbs,
      ...WORD_POOLS_L1.nouns,
      ...WORD_POOLS_L1.adjectives,
    ].map(normalizePool).filter(w => singleWord(w) && !seen.has(w.toLowerCase()));
    for (const w of shuffle(fallback)) {
      if (unique.length >= 6) break;
      const key = w.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(w);
      }
    }
  }
  return shuffle(unique);
};



// CHANGE v5: helpers for contraction branching (module-level, no component state needed)

// Set of phrasal verbs (lowercase) for fast lookup
const PHRASAL_SET = new Set<string>(WORD_POOLS_L1.phrasal.map(p => p.toLowerCase()));

// Splits a phrase into tokens, merging two-word phrasal verbs (get up, turn on…) into one token.
// Mirrors the same case logic used below: first token lowercase (unless proper noun), "I" always uppercase.
const tokenizePhrase = (english: string): string[] => {
  const raw = english.split(' ').filter(Boolean);
  const tokens: string[] = [];
  let i = 0;
  while (i < raw.length) {
    const w1 = raw[i];
    const w2 = raw[i + 1];
    const c1 = w1.replace(/[.,!?;:]/g, '');
    const c2 = w2?.replace(/[.,!?;:]/g, '');
    const pair = c2 !== undefined ? c1.toLowerCase() + ' ' + c2.toLowerCase() : '';
    if (pair && PHRASAL_SET.has(pair)) {
      // Phrasal verb — merge into one token; lowercase at sentence start, keep case otherwise
      tokens.push(i === 0 ? c1.toLowerCase() + ' ' + c2! : c1 + ' ' + c2!);
      i += 2;
    } else {
      if (c1.toLowerCase() === 'i') tokens.push('I');
      else if (i === 0) {
        // Modals take priority: "May/Can/Will/Should..." at sentence start = lowercase modal, not proper noun
        const isModal = WORD_POOLS_L1.modals.includes(c1.toLowerCase());
        const isPN = !isModal && (WORD_POOLS_L1.cities.includes(c1) || WORD_POOLS_L1.months.includes(c1)
          || WORD_POOLS_L1.days.includes(c1) || WORD_POOLS_L1.languages.includes(c1));
        tokens.push(isPN ? c1 : c1.toLowerCase());
      } else tokens.push(c1);
      i++;
    }
  }
  return tokens;
};

// Returns original phrase words with phrasal verbs merged into single tokens
const getPhraseWords = (english: string): string[] => tokenizePhrase(english);

// Case-insensitive CONTRACTION_MAP lookup (handles "i'm" → "I'm" etc.)
const lookupContraction = (word: string): [string, string] | null =>
  CONTRACTION_MAP[word] ?? CONTRACTION_MAP[word.charAt(0).toUpperCase() + word.slice(1)] ?? null;

// Options shown when user must pick the second expansion token (e.g. "not" after "do")
const makeExpansionOptions = (token: string): string[] => {
  const shuf = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);
  let pool: string[];
  if (token === 'not') {
    pool = ['never', 'already', 'still', 'always', 'often', 'also', 'just', 'really'];
  } else if (['is', 'am', 'are', 'was', 'were', 'be'].includes(token)) {
    pool = ['is', 'am', 'are', 'was', 'were', 'be', 'been'].filter(w => w !== token);
  } else if (['have', 'has', 'had'].includes(token)) {
    pool = ['have', 'has', 'had', 'been', 'done', 'got', 'made'].filter(w => w !== token);
  } else if (['will', 'would', 'should', 'could', 'can', 'must'].includes(token)) {
    pool = ['will', 'would', 'should', 'could', 'can', 'must'].filter(w => w !== token);
  } else if (token === 'us') {
    pool = ['them', 'me', 'her', 'him', 'you'];
  } else {
    pool = ['have', 'was', 'did', 'been', 'can', 'should', 'might', 'would'];
  }
  return shuf([token, ...shuf(pool).slice(0, 5)]);
};

const TOTAL = 50;
const SETTINGS_KEY = 'user_settings';

interface Settings {
  speechRate: number; voiceOut: boolean;
  autoAdvance: boolean; hardMode: boolean; autoCheck: boolean; haptics: boolean;
}
const DEFAULT_SETTINGS: Settings = {
  speechRate: 1.0, voiceOut: true, autoAdvance: false,
  hardMode: false, autoCheck: false, haptics: true,
};


// ── XP сохранение ────────────────────────────────────────────────────────────
const saveXP = async (amount: number) => {
  try {
    const { getXPMultiplier } = await import('./club_boosts');
    const multiplier = await getXPMultiplier();
    const finalAmount = Math.floor(amount * multiplier);

    const raw = await AsyncStorage.getItem('user_total_xp');
    const current = parseInt(raw || '0') || 0;
    await AsyncStorage.setItem('user_total_xp', String(current + finalAmount));
  } catch {}
};
// ── Гексагональный прогресс-индикатор ────────────────────────────────────────
// LessonHexProgress is now imported from components/LessonHexProgress.tsx

/**
 * LessonContent: Renders the lesson UI (intro screens, encouragement, or main lesson).
 * Extracted as separate component to ensure SafeAreaView receives exactly ONE child.
 */
interface LessonContentProps {
  showIntroScreens: boolean;
  setShowIntroScreens: (val: boolean) => void;
  showEncouragementScreen: boolean;
  setShowEncouragementScreen: (val: boolean) => void;
  lessonId: number;
  // All the main lesson UI props
  compact: boolean;
  phrase: any;
  selectedWords: string[];
  status: 'playing' | 'result';
  feedbackResult: FeedbackResult | null;
  handleBgTap: () => void;
  handleWordPress: (word: string) => void;
  undoLastWord: () => void;
  goNext: () => void;
  handleTypedSubmit: () => void;
  typedText: string;
  setTypedText: (val: string) => void;
  shuffled: string[];
  cursorAnim: Animated.Value;
  fadeAnim: Animated.Value;
  cellIndex: number;
  passCount: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  currentEnergy: number;
  progress: string[];
  comboCount: number;
  showTapHint: boolean;
  setShowTapHint: (val: boolean) => void;
  showToBeHint: boolean;
  hintPulseAnim: Animated.Value;
  wasWrong: boolean;
  textInputRef: React.RefObject<TextInput>;
  settings: any;
  router: any;
  s: any;
  t: any;
  f: any;
  themeMode: string;
  lang: 'ru' | 'uk';
  emptyTapFlash: boolean;
  setEmptyTapFlash: (val: boolean) => void;
}

function LessonContent({
  showIntroScreens,
  setShowIntroScreens,
  showEncouragementScreen,
  setShowEncouragementScreen,
  lessonId,
  compact,
  phrase,
  selectedWords,
  status,
  feedbackResult,
  handleBgTap,
  handleWordPress,
  undoLastWord,
  goNext,
  handleTypedSubmit,
  typedText,
  setTypedText,
  shuffled,
  cursorAnim,
  fadeAnim,
  cellIndex,
  passCount,
  correctCount,
  wrongCount,
  score,
  currentEnergy,
  progress,
  comboCount,
  showTapHint,
  setShowTapHint,
  showToBeHint,
  hintPulseAnim,
  wasWrong,
  textInputRef,
  settings,
  router,
  s,
  t,
  f,
  themeMode,
  lang,
  emptyTapFlash,
  setEmptyTapFlash,
}: LessonContentProps) {
  // Show intro screens on first visit
  if (showIntroScreens) {
    return (
      <LessonIntroScreens
        introScreens={getLessonIntroScreens(lessonId)}
        lessonId={lessonId}
        onComplete={() => setShowIntroScreens(false)}
      />
    );
  }

  // Show encouragement screen between phrase groups
  if (showEncouragementScreen) {
    return (
      <LessonIntroScreens
        introScreens={getLessonEncouragementScreens(lessonId)}
        lessonId={lessonId}
        onComplete={() => setShowEncouragementScreen(false)}
      />
    );
  }

  // Main lesson UI
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ХЕДЕР */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12 }}>
        {/* Кнопка назад совмещена с названием урока — как на скриншоте */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 0.5, borderColor: t.border }}
        >
          <Ionicons name="chevron-back" size={18} color={t.textPrimary} />
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
            {lang === 'uk' ? 'Урок' : 'Урок'} {lessonId}
          </Text>
        </TouchableOpacity>
        {/* Right side: combo badge + stats */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {comboCount >= 3 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FF9500', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11 }}>🔥</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: f.label }}>×{comboCount >= 5 ? '3' : '2'}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: t.gold, fontSize: f.label, fontWeight: '700' }}>★{score}</Text>
            <Text style={{ color: t.correct, fontSize: f.label, fontWeight: '700' }}>●{correctCount}</Text>
            <Text style={{ color: t.wrong, fontSize: f.label, fontWeight: '700' }}>●{wrongCount}</Text>
          </View>
        </View>
      </View>

      {/* МОЛНИИ ЭНЕРГИИ */}
      <LessonEnergyLightning energyCount={currentEnergy} maxEnergy={5} />

      {/* ОСНОВНАЯ ЗОНА */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: status === 'result' ? 100 : 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={handleBgTap} style={{ width: '100%' }}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2 + 6, marginBottom: compact ? 12 : 20, textAlign: 'center' }} numberOfLines={3} adjustsFontSizeToFit>{phrase.russian}</Text>

          <View style={{ minHeight: 60, borderBottomWidth: 1, borderBottomColor: emptyTapFlash ? '#F5A623' : t.border, marginBottom: compact ? 12 : 20, justifyContent: 'center', backgroundColor: emptyTapFlash ? 'rgba(245,166,35,0.08)' : 'transparent', borderRadius: emptyTapFlash ? 8 : 0 } as any}>
            {settings.hardMode ? (
              /* Keep TextInput always mounted in hardMode — prevents keyboard slide animation between questions */
              <TextInput
                ref={textInputRef}
                style={{ color: t.textSecond, fontSize: f.h1, padding: 0, minHeight: 40, opacity: status === 'playing' ? 1 : 0 }}
                value={typedText}
                onChangeText={setTypedText}
                onSubmitEditing={handleTypedSubmit}
                placeholder={status === 'playing' ? s.lesson.typeHere : ''}
                placeholderTextColor={t.textGhost}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                editable={status === 'playing'}
              />
            ) : (
              <Text style={{ color: t.textSecond, fontSize: f.h1 }}>
                {selectedWords.length > 0
                  ? (selectedWords[0].charAt(0).toUpperCase() + selectedWords[0].slice(1)
                    + (selectedWords.length > 1 ? ' ' + selectedWords.slice(1).map(w => w.toLowerCase() === 'i' ? 'I' : (w[0] !== w[0].toLowerCase() ? w : w.toLowerCase())).join(' ') : ''))
                  : ''
                }{status !== 'result' && <Animated.Text style={{ color: t.textPrimary, opacity: cursorAnim }}>|</Animated.Text>}
              </Text>
            )}
          </View>

          </Pressable>
          {status === 'result' && (
            <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
              {wasWrong && (
                <View style={{ backgroundColor: t.wrongBg, padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: t.wrong }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {selectedWords.map((word, i) => {
                      const correctWord = phrase.english.split(/\s+/)[i]?.toLowerCase();
                      const isWrong = word.toLowerCase() !== correctWord;
                      return (
                        <Text key={i} style={{
                          color: isWrong ? t.wrong : t.textPrimary,
                          fontWeight: isWrong ? '700' : '500',
                          fontSize: f.h1,
                        }}>
                          {word}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={{ backgroundColor: t.correctBg, padding: 15, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: t.correct, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: t.correct, fontSize: f.h1, flex: 1 }}>{
                  /[.?!]$/.test(phrase.english) ? phrase.english
                  : phrase.russian?.endsWith('?') ? phrase.english + '?'
                  : phrase.russian?.endsWith('!') ? phrase.english + '!'
                  : phrase.russian?.endsWith('.') ? phrase.english + '.'
                  : phrase.english
                }</Text>
                <AddToFlashcard
                  en={phrase.english}
                  ru={(ALL_LESSONS_RU[lessonId] || []).find((p: any) => p.english === phrase.english)?.russian ?? phrase.russian}
                  uk={(ALL_LESSONS_UK[lessonId] || []).find((p: any) => p.english === phrase.english)?.russian ?? phrase.russian}
                  source="lesson" sourceId={String(lessonId)}
                />
              </View>

              {feedbackResult && feedbackResult.explanation && (
                <View style={{
                  marginTop: 15,
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  padding: 16,
                  paddingLeft: 18,
                  borderRadius: 10,
                  borderLeftWidth: 4,
                  borderLeftColor: '#3B82F6',
                }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: f.body * 1.6, fontWeight: '500' }}>
                    {(() => {
                      const traps = getErrorTrapsByIndex(lessonId, cellIndex);
                      if (!traps) return feedbackResult.explanation;
                      // Select RU or UA version of generalRule based on user's language setting
                      if (lang === 'uk' && traps.generalRule_UA) return traps.generalRule_UA;
                      return feedbackResult.explanation;
                    })()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={{ alignSelf: 'center', marginTop: 36 }}
                onPress={() => Speech.speak(phrase.english, { language: 'en-US', rate: settings.speechRate })}
              >
                <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: t.correct, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="volume-high" size={42} color={t.bgPrimary} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>

        {/* КНОПКИ СЛОВ — снаружи ScrollView, тап по любому месту работает */}
        {status === 'playing' && !settings.hardMode && (
          <Pressable
            onPress={handleBgTap}
            style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }} pointerEvents="box-none">
              {shuffled.map((word, i) => {
                const isToBeVerb = ['am', 'is', 'are', 'am not', 'is not', 'are not', "isn't", "aren't"].includes(word.toLowerCase());
                const shouldShowHint = showToBeHint && cellIndex === 0 && isToBeVerb;

                return (
                  <Animated.View key={i} style={{
                    width: '48%',
                    marginBottom: compact ? 7 : 10,
                    opacity: shouldShowHint ? hintPulseAnim : hintPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [1, 1] })
                  }}>
                    <TouchableOpacity
                      style={{ width: '100%', backgroundColor: t.bgCard, paddingVertical: compact ? 9 : 14, alignItems: 'center', borderRadius: 12, borderWidth: themeMode === 'neon' ? 1 : 0.5, borderColor: t.border, ...getCardShadow(themeMode, t.glow) }}
                      onPress={() => { hapticTap(); if (showTapHint) setShowTapHint(false); handleWordPress(word); }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '500' }} adjustsFontSizeToFit numberOfLines={1}>{word === 'I' ? 'I' : (word[0] !== word[0].toLowerCase() ? word : word.toLowerCase())}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
            {showTapHint && !settings.autoCheck && (
              <View style={{ alignItems: 'center', marginBottom: 4 }}>
                <View style={{ backgroundColor: t.bgCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 0.5, borderColor: t.border }}>
                  <Text style={{ color: t.textMuted, fontSize: f.caption }} numberOfLines={1}>
                    {lang === 'uk' ? '👆 Торкнись, щоб перевірити' : '👆 Тапни, чтобы проверить'}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        )}

        {/* ГОРИЗОНТАЛЬНЫЙ ПРОГРЕСС-БАР */}
        <View style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
              {Array.from({ length: TOTAL }).map((_, i) => (
                <View key={i} style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: getProgressCellColor(progress[i], passCount, t, i === cellIndex),
                }} />
              ))}
            </View>
            <Text style={{ color: t.textMuted, fontSize: f.label, minWidth: 34, textAlign: 'right' }}>{cellIndex}/{TOTAL}</Text>
          </View>
        </View>

        {/* ФУТЕР */}
        <View style={{ flexDirection: 'row', paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: t.border }}>
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => { hapticTap(); router.push({ pathname: '/hint', params: { id: lessonId } }); }}>
            <Ionicons name="list" size={26} color={t.textSecond} />
            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 4 }}>{s.lesson.cheat}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => { hapticTap(); router.push({ pathname: '/lesson_help', params: { id: lessonId } }); }}>
            <Ionicons name="book-outline" size={26} color={t.textSecond} />
            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 4 }}>{s.lesson.theory}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', opacity: (status === 'playing' && (settings.hardMode ? typedText.trim().length === 0 : selectedWords.length === 0)) ? 0.3 : 1 }}
            onPress={() => {
              hapticTap();
              if (status === 'result') { goNext(); return; }
              if (settings.hardMode) { handleTypedSubmit(); return; }
              // When all words selected and autoCheck is off: check the answer
              if (shuffled.length === 0 && selectedWords.length > 0 && !settings.autoCheck) { handleBgTap(); return; }
              // Otherwise: undo if words are selected
              if (selectedWords.length > 0) { undoLastWord(); return; }
            }}
          >
            {(() => {
              const allDone = status === 'playing' && !settings.hardMode && shuffled.length === 0 && selectedWords.length > 0;
              // When all done: show "Проверить" only if autoCheck is off, else show "Отменить"
              const showUndo = status !== 'result' && !settings.hardMode && selectedWords.length > 0 && !(allDone && !settings.autoCheck);
              return <>
                <Ionicons name={status === 'result' ? 'play-forward' : (showUndo ? 'arrow-undo' : 'checkmark-circle-outline')} size={26} color={t.textSecond} />
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 4 }}>
                  {status === 'result' ? s.lesson.next : (showUndo ? s.lesson.undo : s.lesson.check)}
                </Text>
              </>;
            })()}
          </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
  );
}

export default function LessonScreen() {
  const router = useRouter();
  const { height: windowH } = useWindowDimensions();
  const compact = windowH < 780; // dynamic — recalculates on orientation change and accounts for safe area
  const { theme: t , f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(id || '1', 10);
  const LESSON_KEY = `lesson${lessonId}_progress`;
  const CELL_KEY   = `lesson${lessonId}_cellIndex`;

  const LESSON_DATA = getLessonData(lessonId);

  // cellIndex — позиция в прогресс-баре (0..49), двигается строго по кругу
  const [cellIndex,    setCellIndex]    = useState(0);
  const [status,       setStatus]       = useState<'playing' | 'result'>('playing');
  const [selectedWords,setSelectedWords]= useState<string[]>([]);
  const [shuffled,     setShuffled]     = useState<string[]>([]);
  const [progress,     setProgress]     = useState<string[]>(new Array(TOTAL).fill('empty'));
  const [settings,     setSettings]     = useState<Settings>(DEFAULT_SETTINGS);
  const [wasWrong,     setWasWrong]     = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null);
  const [typedText,    setTypedText]    = useState('');
  const [isListening,  setIsListening]  = useState(false);
  const [showTapHint,  setShowTapHint]  = useState(false);
  // CHANGE v5: contraction branching state
  const [phraseWordIdx, setPhraseWordIdx] = useState(0);        // position in original phrase words
  const [contrExpanded, setContrExpanded] = useState<string[] | null>(null); // pending expansion tokens
  const correctStreakRef = useRef(0);  // для задания correct_streak + combo badge
  const todayAnswersRef  = useRef(0);  // для задания total_answers
  const userNameRef      = useRef<string | null>(null); // кешируем имя чтобы не читать AsyncStorage на каждый ответ
  // [COMBO] Отображаемое значение комбо для UI-бейджа. Обновляется в setState.
  const [comboCount, setComboCount] = useState(0);
  const [passCount, setPassCount]   = useState(0);
  const [insufficientEnergy, setInsufficientEnergy] = useState(false);
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [currentEnergy, setCurrentEnergy] = useState(5); // для отображения молний
  // ==================== NEW: Intro & Encouragement Screens ====================
  const [showIntroScreens, setShowIntroScreens] = useState(false);
  const [showEncouragementScreen, setShowEncouragementScreen] = useState(false);
  const [showToBeHint, setShowToBeHint] = useState(false);

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const cursorAnim  = useRef(new Animated.Value(1)).current;
  const hintPulseAnim = useRef(new Animated.Value(0.4)).current;
  const autoTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textInputRef = useRef<any>(null);
  const voiceResultSub    = useRef<any>(null);
  const voiceErrorSub     = useRef<any>(null);
  const voiceEndSub       = useRef<any>(null);
  const sessionAnswerCount = useRef(0);   // кол-во ответов в текущей сессии
  const isReplayRef        = useRef(false); // true если урок уже был пройден полностью

  // Фраза определяется ТОЛЬКО позицией ячейки — строго цикличная привязка
  const phrase = LESSON_DATA[cellIndex % LESSON_DATA.length];

  // CHANGE v5: cursor blinks only when no words are selected yet; stays solid while composing
  useEffect(() => {
    if (selectedWords.length > 0) {
      cursorAnim.setValue(1);
      return;
    }
    const blink = Animated.loop(Animated.sequence([
      Animated.timing(cursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(cursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]));
    blink.start();
    return () => blink.stop();
  }, [selectedWords.length]);

  useEffect(() => {
    loadData();
    // Кешируем имя один раз при монтировании — избегаем async lookup на каждый ответ
    AsyncStorage.getItem('user_name').then(n => { userNameRef.current = n; });
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      voiceResultSub.current?.remove();
      voiceErrorSub.current?.remove();
      voiceEndSub.current?.remove();
    };
  }, [lang]);

  // Показываем подсказку один раз за сессию
  useEffect(() => {
    if (!settings.autoCheck && !settings.hardMode && !tapHintShownThisSession) {
      setShowTapHint(true);
      tapHintShownThisSession = true;
    }
  }, [settings.autoCheck, settings.hardMode]);

  // Перечитываем настройки при возврате на экран (например из settings_edu)
  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem(SETTINGS_KEY).then(ss => {
        if (ss) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(ss) });
      });
    }, [])
  );

  // Pulsing animation for to-be hint (only on first phrase of lesson 1)
  useEffect(() => {
    if (showToBeHint && cellIndex === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(hintPulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(hintPulseAnim, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      hintPulseAnim.setValue(0.4);
    }
  }, [showToBeHint, cellIndex]);

  const loadData = async () => {
    try {
      // ==================== NEW: Check intro screens ====================
      const introShown = await AsyncStorage.getItem(`lesson${lessonId}_intro_shown`);
      if (!introShown) {
        setShowIntroScreens(true);
        return; // Don't load lesson yet, show intro first
      }

      // Проверяем энергию ПЕРЕД началом урока
      const energyState = await checkAndRecover();
      if (energyState.current <= 0) {
        setShowEnergyModal(true);
        setInsufficientEnergy(true);
        setCurrentEnergy(0);
        // Не загружаем урок, если нет энергии
        return;
      }
      // Инициализируем энергию для отображения молний
      setCurrentEnergy(energyState.current);

      // ==================== NEW: Initialize to-be hint for phrase 1 ====================
      setShowToBeHint(true);

      loadMedalInfo(lessonId).then(info => setPassCount(info.passCount));
      const [sp, ss, ci] = await Promise.all([
        AsyncStorage.getItem(LESSON_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(CELL_KEY),
      ]);

      let restoredProgress = new Array(TOTAL).fill('empty');
      if (sp) {
        const p: string[] = JSON.parse(sp);
        if (p.length === TOTAL) restoredProgress = p;
      }
      setProgress(restoredProgress);

      // Режим повтора: если все ячейки уже correct — крутим по кругу без автозавершения
      sessionAnswerCount.current = 0;
      isReplayRef.current = restoredProgress.every(x => x === 'correct');

      // Восстанавливаем позицию ячейки
      // Если сохранена — используем её, но проверяем что ячейка ещё не отвечена
      // Если нет — ищем первую не-correct ячейку
      let startCell = 0;
      if (ci !== null) {
        const saved = parseInt(ci) || 0;
        // Если эта ячейка уже правильно отвечена — находим следующую не-correct
        if (restoredProgress[saved] === 'correct' || restoredProgress[saved] === 'replay_correct') {
          const nextNotCorrect = restoredProgress.findIndex((x, i) => i > saved && x !== 'correct' && x !== 'replay_correct');
          startCell = nextNotCorrect >= 0 ? nextNotCorrect : saved;
        } else {
          startCell = saved;
        }
      } else {
        // Первый запуск — найти первую не-correct ячейку
        const firstNotCorrect = restoredProgress.findIndex(x => x !== 'correct');
        startCell = firstNotCorrect >= 0 ? firstNotCorrect : 0;
      }
      setCellIndex(startCell);

      // Перемешиваем слова для стартовой фразы
      const startPhrase = LESSON_DATA[startCell % LESSON_DATA.length];
      setShuffled(getPerWordDistracts(startPhrase, 0));

      if (ss) {
        const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(ss) };
        setSettings(loaded);
        if (loaded.hardMode) setTimeout(() => textInputRef.current?.focus(), 400);
      }

      // Тратим энергию после успешной загрузки урока
      await spendEnergy(1);
      setInsufficientEnergy(false);
    } catch {}
  };

  const shuffleWords = (words: string[]) => setShuffled(words);

  const checkAnswer = useCallback(async (answer: string) => {
    const isRight = isCorrectAnswer(answer, phrase.english);
    const np = [...progress];

    // КЛЮЧЕВАЯ ЛОГИКА:
    // Правильный ответ → ячейка зеленеет
    // Неправильный ответ → ячейка краснеет
    //   В режиме повтора (isReplay) ошибка может перекрыть зелёную ячейку → оценка падает
    sessionAnswerCount.current += 1;
    if (isRight) {
      // В режиме повтора правильные ответы — синие (replay_correct)
      np[cellIndex] = isReplayRef.current ? 'replay_correct' : 'correct';
    } else {
      // В режиме повтора и при повторном ответе неправильно — красный
      if (isReplayRef.current || (np[cellIndex] !== 'correct' && np[cellIndex] !== 'replay_correct')) {
        np[cellIndex] = 'wrong';
      }
      if (!isReplayRef.current) {
        correctStreakRef.current = 0;
      }
      // [SRS] Записываем ошибку в хранилище интервального повторения.
      // phrase.english — ключ (английская фраза, будет показана как ответ в review.tsx).
      // phrase.russian — подсказка (русский/украинский перевод, будет показан на лицевой стороне карточки).
      // lessonId — для фильтрации по уроку (getItemsByLesson) и отображения метки на карточке.
      // Если фраза уже есть в базе — errorCount++, interval сбрасывается к 1 дню.
      // Если фраза новая — добавляется с nextDue = завтра.
      {
        const ruData = ALL_LESSONS_RU[lessonId] || [];
        const ukData = ALL_LESSONS_UK[lessonId] || [];
        const ruPhrase = ruData.find(p => p.english === phrase.english);
        const ukPhrase = ukData.find(p => p.english === phrase.english);
        recordMistake(
          phrase.english,
          ruPhrase?.russian ?? phrase.russian,
          lessonId,
          ukPhrase?.russian,
        );
      }
    }

    // Триггеры ежедневных заданий + XP
    if (isRight) {
      correctStreakRef.current += 1;
      todayAnswersRef.current += 1;
      setComboCount(correctStreakRef.current);
      updateMultipleTaskProgress([
        { type: 'correct_streak' },
        { type: 'lesson_no_mistakes' },
        { type: 'total_answers' },
        { type: 'daily_active' },
      ]);
      // Начисляем XP: 1-3 в зависимости от стрика
      const xpAmount = correctStreakRef.current >= 5 ? 3 : correctStreakRef.current >= 3 ? 2 : 1;
      saveXP(xpAmount);
      if (userNameRef.current) {
        addOrUpdateScore(userNameRef.current, xpAmount, lang);
      }
      // [COMBO] Ачивки за серию правильных ответов
      checkAchievements({ type: 'combo', count: correctStreakRef.current }).catch(() => {});
      // [TIME] Ачивки за ночное/утреннее обучение
      if (correctStreakRef.current === 1) {
        checkAchievements({ type: 'time_of_day' }).catch(() => {});
      }
    } else {
      correctStreakRef.current = 0;
      setComboCount(0);
      todayAnswersRef.current += 1;
      if (!isReplayRef.current) {
        // Атомарно сбрасываем streak-задания и считаем total_answers
        resetAndUpdateTaskProgress(
          ['lesson_no_mistakes', 'correct_streak'],
          [{ type: 'total_answers' }],
        );
      } else {
        updateMultipleTaskProgress([{ type: 'total_answers' }]);
      }

      // При ОШИБКЕ: молния исчезает
      if (currentEnergy > 0) {
        setCurrentEnergy(prev => {
          const newEnergy = Math.max(0, prev - 1);
          // Если энергия закончилась, показываем модаль
          if (newEnergy === 0) {
            setTimeout(() => {
              setShowEnergyModal(true);
              setInsufficientEnergy(true);
            }, 1000);
          }
          return newEnergy;
        });
      }
    }

    setWasWrong(!isRight);
    // ВСЕГДА показываем карточку объяснения — для правильных и неправильных ответов
    const userAnswer = settings.hardMode ? typedText : selectedWords.join(' ');
    const traps = getErrorTrapsByIndex(lessonId, cellIndex);
    const feedback = findAllExplanations(userAnswer, phrase.english, traps);
    setFeedbackResult(feedback);

    setProgress(np);

    if (!isRight && settings.haptics) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }

    try { await AsyncStorage.setItem(LESSON_KEY, JSON.stringify(np)); } catch {}

    // СОХРАНЯЕМ РЕЗУЛЬТАТ СРАЗУ при правильном ответе — автоматический переход к следующей фразе
    if (isRight) {
      try {
        // Находим следующую ячейку и сохраняем её как текущую позицию
        let nextCell = (cellIndex + 1) % TOTAL;
        const isDone = (x: string) => x === 'correct' || x === 'replay_correct';
        const hasNonDone = np.some(x => !isDone(x));
        if (hasNonDone) {
          let attempts = 0;
          while (isDone(np[nextCell]) && attempts < TOTAL) {
            nextCell = (nextCell + 1) % TOTAL;
            attempts++;
          }
        }
        // Сохраняем nextCell сразу — результат уже зафиксирован
        await AsyncStorage.setItem(CELL_KEY, String(nextCell));
      } catch {}
    }
    setStatus('result');

    // ==================== NEW: Handle to-be hint and encouragement screens ====================
    if (isRight) {
      // Disable to-be hint after phrase 1
      if (cellIndex === 0) {
        setShowToBeHint(false);
      }

      // Show encouragement screen after phrase 5
      if (cellIndex === 4) {
        setTimeout(() => {
          setShowEncouragementScreen(true);
        }, 1500);
      }
    }

    if (settings.voiceOut) {
      Speech.speak(phrase.english, { rate: settings.speechRate, language: 'en-US' });
    }
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();

    // Проверяем завершение урока
    // В режиме повтора требуем минимум TOTAL ответов в сессии,
    // чтобы не сразу закрыться если все ячейки изначально были correct
    const allCorrect = np.every(x => x === 'correct' || x === 'replay_correct');
    if (allCorrect && sessionAnswerCount.current >= TOTAL) {
      sessionAnswerCount.current = 0; // сброс для следующего повтора
      isReplayRef.current = true;
      setTimeout(async () => {
        // Получаем финальную оценку урока перед переходом на lesson_complete
        const correct = np.filter(x => x === 'correct' || x === 'replay_correct').length;
        const finalScore = parseFloat((correct / TOTAL * 5).toFixed(1));

        // Пытаемся разблокировать следующий урок
        await tryUnlockNextLesson(lessonId, finalScore);

        router.replace({ pathname: '/lesson_complete', params: { id: lessonId } });
      }, 1500);
      return;
    }

    if (settings.autoAdvance && isRight) {
      autoTimer.current = setTimeout(() => goNext(np), 4000);
    }
  }, [progress, cellIndex, phrase, settings, fadeAnim, lessonId]);

  const goNext = useCallback(async (currentProgress?: string[]) => {
    if (autoTimer.current) clearTimeout(autoTimer.current);

    const prog = currentProgress || progress;

    // Двигаемся по кругу: следующая ячейка после текущей
    // Ищем следующую не-correct ячейку начиная с cellIndex+1
    // Если все correct — урок завершён (обработано выше)
    let nextCell = (cellIndex + 1) % TOTAL;

    // Если следующая ячейка correct — продолжаем искать
    // (но только если есть хоть одна не-correct)
    const isDone = (x: string) => x === 'correct' || x === 'replay_correct';
    const hasNonDone = prog.some(x => !isDone(x));
    if (hasNonDone) {
      let attempts = 0;
      while (isDone(prog[nextCell]) && attempts < TOTAL) {
        nextCell = (nextCell + 1) % TOTAL;
        attempts++;
      }
    }

    setCellIndex(nextCell);
    setStatus('playing');
    setSelectedWords([]);
    setTypedText('');
    setWasWrong(false);
    setFeedbackResult(null);
    setPhraseWordIdx(0);    // CHANGE v5: reset contraction branching
    setContrExpanded(null); // CHANGE v5
    fadeAnim.setValue(0);
    if (settings.hardMode) setTimeout(() => textInputRef.current?.focus(), 50);

    // Фраза для следующей ячейки
    const nextPhrase = LESSON_DATA[nextCell % LESSON_DATA.length];
    setShuffled(getPerWordDistracts(nextPhrase, 0));

    // Сохраняем позицию
    try { await AsyncStorage.setItem(CELL_KEY, String(nextCell)); } catch {}
  }, [cellIndex, progress, fadeAnim, LESSON_DATA]);

  // CHANGE v5: rewritten for contraction branching using phraseWordIdx
  const handleWordPress = (word: string) => {
    if (status === 'result') return;

    const phraseWords = getPhraseWords(phrase.english);
    const totalPhraseWords = phraseWords.length;
    const next = [...selectedWords, word];
    setSelectedWords(next);

    // Expansion mode: collecting the second token of a contraction (e.g. "not" after "do")
    if (contrExpanded !== null && contrExpanded.length > 0) {
      const remaining = contrExpanded.slice(1);
      if (remaining.length === 0) {
        // All expansion tokens collected — advance to next phrase word
        const newIdx = phraseWordIdx + 1;
        setContrExpanded(null);
        setPhraseWordIdx(newIdx);
        if (newIdx >= totalPhraseWords) {
          setShuffled([]);
          if (settings.autoCheck) checkAnswer(next.join(' '));
        } else {
          setShuffled(getPerWordDistracts(phrase, newIdx));
        }
      } else {
        setContrExpanded(remaining);
        setShuffled(makeExpansionOptions(remaining[0]));
      }
      return;
    }

    // Normal mode: check if user picked the first expanded token of the expected contraction
    const correctWord = phraseWords[phraseWordIdx];
    const contrEntry = lookupContraction(correctWord ?? '');
    if (contrEntry && word.toLowerCase() === contrEntry[0].toLowerCase()) {
      // User picked expanded[0] (e.g. "do" when expected "don't") — enter expansion mode
      setContrExpanded(contrEntry.slice(1)); // ["not"]
      // phraseWordIdx stays — still on the same original contraction word
      setShuffled(makeExpansionOptions(contrEntry[1]));
      return;
    }

    // Regular word picked (or contraction picked directly)
    const newIdx = phraseWordIdx + 1;
    setPhraseWordIdx(newIdx);
    if (newIdx >= totalPhraseWords) {
      setShuffled([]);
      if (settings.autoCheck) checkAnswer(next.join(' '));
    } else {
      setShuffled(getPerWordDistracts(phrase, newIdx));
    }
  };

  const handleTypedSubmit = () => {
    if (typedText.trim() && status === 'playing') checkAnswer(typedText);
  };

  // CHANGE v5: updated for contraction branching undo
  const undoLastWord = () => {
    if (status === 'result') return;
    if (settings.hardMode) {
      const words = typedText.trim().split(/\s+/);
      words.pop();
      setTypedText(words.join(' '));
    } else {
      if (!selectedWords.length) return;
      if (contrExpanded !== null) {
        // In expansion mode: undo the first expansion token picked, exit expansion mode
        setSelectedWords((p: string[]) => p.slice(0, -1));
        setContrExpanded(null);
        setShuffled(getPerWordDistracts(phrase, phraseWordIdx));
        return;
      }
      // Normal undo: pop last word, decrement phraseWordIdx
      const newSelected = selectedWords.slice(0, -1);
      const newPhraseIdx = Math.max(0, phraseWordIdx - 1);
      setSelectedWords(newSelected);
      setPhraseWordIdx(newPhraseIdx);
      // Check if last remaining word is expansion[0] of the contraction at newPhraseIdx
      // (happens when undoing the last expansion token, e.g. undoing "not" after "do")
      if (newSelected.length > 0) {
        const phraseWords = getPhraseWords(phrase.english);
        const origWord = phraseWords[newPhraseIdx];
        const prevContr = lookupContraction(origWord ?? '');
        if (prevContr && newSelected[newSelected.length - 1].toLowerCase() === prevContr[0].toLowerCase()) {
          // Restore expansion mode — user needs to pick the second token again
          setContrExpanded(prevContr.slice(1));
          setShuffled(makeExpansionOptions(prevContr[1]));
          return;
        }
      }
      setShuffled(getPerWordDistracts(phrase, newPhraseIdx));
    }
  };

  const handleVoice = async () => {
    if (!VOICE_OK) { alert(lang === 'uk' ? 'Потребує EAS Build' : 'Требует EAS Build'); return; }
    if (isListening) { SpeechRec.stop(); setIsListening(false); return; }
    // Удаляем предыдущие слушатели перед добавлением новых
    voiceResultSub.current?.remove();
    voiceErrorSub.current?.remove();
    try {
      const { granted } = await SpeechRec.requestPermissionsAsync();
      if (!granted) return;
      setIsListening(true);
      SpeechRec.start({ lang: 'en-US', interimResults: false });
      voiceResultSub.current = SpeechRec.addListener('result', (e: any) => {
        // expo-speech-recognition: results[i] = { transcript, confidence }, not nested array
        const txt = (e.results?.[0]?.transcript ?? e.results?.[0]?.[0]?.transcript ?? '') as string;
        setIsListening(false);
        voiceEndSub.current?.remove();
        if (txt) checkAnswer(txt);
      });
      voiceErrorSub.current = SpeechRec.addListener('error', () => setIsListening(false));
      voiceEndSub.current   = SpeechRec.addListener('end',   () => setIsListening(false));
    } catch { setIsListening(false); }
  };

  const correctCount = progress.filter(p => p === 'correct' || p === 'replay_correct').length;
  const wrongCount   = progress.filter(p => p === 'wrong').length;
  const score = (correctCount / TOTAL * 5).toFixed(1);


  // Жёлтая подсветка для поля ввода когда 0 слов + тап
  const [emptyTapFlash, setEmptyTapFlash] = useState(false);

  const handleBgTap = () => {
    if (status === 'result') { goNext(); return; } // тап на результате → следующая фраза
    if (settings.hardMode) return; // hard mode — кнопка/enter клавиатуры
    // Скрываем хинт при первом тапе
    if (showTapHint) setShowTapHint(false);
    if (selectedWords.length === 0) {
      // 0 слов — мигаем жёлтым, не считаем за ошибку
      setEmptyTapFlash(true);
      setTimeout(() => setEmptyTapFlash(false), 700);
    } else {
      // ≥1 слово — сразу проверяем (неполный ответ = неправильный)
      checkAnswer(selectedWords.join(' '));
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleBgTap}>
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <LessonContent
            showIntroScreens={showIntroScreens}
            setShowIntroScreens={setShowIntroScreens}
            showEncouragementScreen={showEncouragementScreen}
            setShowEncouragementScreen={setShowEncouragementScreen}
            lessonId={lessonId}
            compact={compact}
            phrase={phrase}
            selectedWords={selectedWords}
            status={status}
            feedbackResult={feedbackResult}
            handleBgTap={handleBgTap}
            handleWordPress={handleWordPress}
            undoLastWord={undoLastWord}
            goNext={goNext}
            handleTypedSubmit={handleTypedSubmit}
            typedText={typedText}
            setTypedText={setTypedText}
            shuffled={shuffled}
            cursorAnim={cursorAnim}
            fadeAnim={fadeAnim}
            cellIndex={cellIndex}
            passCount={passCount}
            correctCount={correctCount}
            wrongCount={wrongCount}
            score={score}
            currentEnergy={currentEnergy}
            progress={progress}
            comboCount={comboCount}
            showTapHint={showTapHint}
            setShowTapHint={setShowTapHint}
            showToBeHint={showToBeHint}
            hintPulseAnim={hintPulseAnim}
            wasWrong={wasWrong}
            textInputRef={textInputRef}
            settings={settings}
            router={router}
            s={s}
            t={t}
            f={f}
            themeMode={themeMode}
            lang={lang}
            emptyTapFlash={emptyTapFlash}
            setEmptyTapFlash={setEmptyTapFlash}
          />
        </SafeAreaView>
        {/* МОДАЛЬНОЕ ОКНО - НЕДОСТАТОЧНО ЭНЕРГИИ */}
        {showEnergyModal && insufficientEnergy && (
        <View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: t.bgCard,
            borderRadius: 16,
            padding: 24,
            width: '85%',
            maxWidth: 320,
            borderWidth: 1,
            borderColor: t.border,
          }}>
            <Text style={{
              color: t.textPrimary,
              fontSize: f.h3,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 12,
            }}>⚡ {s.lesson?.noEnergy || 'Нет энергии'}</Text>

            <Text style={{
              color: t.textSecond,
              fontSize: f.body,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 20,
            }}>{s.lesson?.needEnergyToStart || 'Требуется 1 единица энергии для начала урока. Энергия восстанавливается каждые 2 часа.'}</Text>

            <TouchableOpacity
              onPress={() => {
                setShowEnergyModal(false);
                router.back();
              }}
              style={{
                backgroundColor: t.accent,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: '#fff',
                fontSize: f.bodyLg,
                fontWeight: '600',
              }}>{s.common?.back || 'Назад'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </ScreenGradient>
    </TouchableWithoutFeedback>
  );
}



