import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { checkAchievements } from './achievements';
import { saveExamProgress, getExamMedalTier, type MedalTier } from './medal_utils';

const MEDAL_IMAGES_EXAM: Record<string, any> = {
  bronze:  require('../assets/images/levels/bronza.png'),
  silver:  require('../assets/images/levels/serebro.png'),
  gold:    require('../assets/images/levels/zoloto.png'),
};

// ── Пул вопросов (общий с exam.tsx) ──────────────────────────────────────────
type QType = 'fill' | 'choice4' | 'error';
interface LevelQ {
  lessonNum: number;
  topic:   string;
  topicUK: string;
  q:       string;
  opts:    string[];
  correct: number;
  type?:   QType;
}

// 3 вопроса per lesson (первые 3 из pool = fill-типы, они лучше всего подходят)
const QUESTION_POOL: LevelQ[] = [
  // L1
  {lessonNum:1,topic:'To Be',topicUK:'To Be',q:'She ___ a teacher.',opts:['am','is','are','be'],correct:1},
  {lessonNum:1,topic:'To Be',topicUK:'To Be',q:'We ___ at home now.',opts:['is','am','are','be'],correct:2},
  {lessonNum:1,topic:'To Be',topicUK:'To Be',q:'I ___ not tired.',opts:['is','are','am','be'],correct:2},
  // L2
  {lessonNum:2,topic:'Отрицание To Be',topicUK:'Заперечення To Be',q:'They ___ not here.',opts:['is','am','are','be'],correct:2},
  {lessonNum:2,topic:'Отрицание To Be',topicUK:'Заперечення To Be',q:'She ___ not ready yet.',opts:['is','am','are','be'],correct:0},
  {lessonNum:2,topic:'Отрицание To Be',topicUK:'Заперечення To Be',q:'Which sentence is correct?',opts:['I am not ready.','She are not happy.','He am not here.','We is not late.'],correct:0,type:'choice4'},
  // L3
  {lessonNum:3,topic:'Present Simple — утверждение',topicUK:'Present Simple — ствердження',q:'He ___ every day.',opts:['work','works','worked','working'],correct:1},
  {lessonNum:3,topic:'Present Simple — утверждение',topicUK:'Present Simple — ствердження',q:'She ___ English.',opts:['speak','speaks','spoke','speaking'],correct:1},
  {lessonNum:3,topic:'Present Simple — утверждение',topicUK:'Present Simple — ствердження',q:'They ___ in London.',opts:['live','lives','lived','living'],correct:0},
  // L4
  {lessonNum:4,topic:'Present Simple — отрицание',topicUK:'Present Simple — заперечення',q:'She ___ not understand.',opts:['do','does','did','doing'],correct:1},
  {lessonNum:4,topic:'Present Simple — отрицание',topicUK:'Present Simple — заперечення',q:'He ___ not smoke.',opts:['do','does','did','doing'],correct:1},
  {lessonNum:4,topic:'Present Simple — отрицание',topicUK:'Present Simple — заперечення',q:'They ___ not know the answer.',opts:['does','do','did','doing'],correct:1},
  // L5
  {lessonNum:5,topic:'Present Simple — вопросы',topicUK:'Present Simple — питання',q:'___ you speak English?',opts:['Do','Does','Did','Are'],correct:0},
  {lessonNum:5,topic:'Present Simple — вопросы',topicUK:'Present Simple — питання',q:'___ she like music?',opts:['Do','Does','Did','Is'],correct:1},
  {lessonNum:5,topic:'Present Simple — вопросы',topicUK:'Present Simple — питання',q:'___ they play football?',opts:['Do','Does','Did','Are'],correct:0},
  // L6
  {lessonNum:6,topic:'Специальные вопросы',topicUK:'Спеціальні питання',q:'___ do you live?',opts:['What','Where','Who','When'],correct:1},
  {lessonNum:6,topic:'Специальные вопросы',topicUK:'Спеціальні питання',q:'___ are you?',opts:['Where','How','What','Who'],correct:1},
  {lessonNum:6,topic:'Специальные вопросы',topicUK:'Спеціальні питання',q:'___ time is it?',opts:['Where','Who','What','When'],correct:2},
  // L7
  {lessonNum:7,topic:'Глагол To Have',topicUK:'Дієслово To Have',q:'I ___ a car.',opts:['has','have','had','having'],correct:1},
  {lessonNum:7,topic:'Глагол To Have',topicUK:'Дієслово To Have',q:'She ___ two children.',opts:['have','has','had','having'],correct:1},
  {lessonNum:7,topic:'Глагол To Have',topicUK:'Дієслово To Have',q:'Do they ___ a car?',opts:['has','have','had','having'],correct:1},
  // L8
  {lessonNum:8,topic:'Предлоги времени',topicUK:'Прийменники часу',q:"I wake up ___ 7 o'clock.",opts:['in','on','at','by'],correct:2},
  {lessonNum:8,topic:'Предлоги времени',topicUK:'Прийменники часу',q:'She was born ___ Monday.',opts:['in','on','at','by'],correct:1},
  {lessonNum:8,topic:'Предлоги времени',topicUK:'Прийменники часу',q:'He was born ___ 1990.',opts:['in','on','at','by'],correct:0},
  // L9
  {lessonNum:9,topic:'There is / There are',topicUK:'There is / There are',q:'There ___ a book on the table.',opts:['are','am','is','be'],correct:2},
  {lessonNum:9,topic:'There is / There are',topicUK:'There is / There are',q:'There ___ many people here.',opts:['is','am','are','be'],correct:2},
  {lessonNum:9,topic:'There is / There are',topicUK:'There is / There are',q:'There ___ no milk in the fridge.',opts:['are','am','is','be'],correct:2},
  // L10
  {lessonNum:10,topic:'Модальные глаголы',topicUK:'Модальні дієслова',q:'You ___ speak louder.',opts:['can','could','should','must'],correct:2},
  {lessonNum:10,topic:'Модальные глаголы',topicUK:'Модальні дієслова',q:'She ___ swim very well.',opts:['can','should','must','shall'],correct:0},
  {lessonNum:10,topic:'Модальные глаголы',topicUK:'Модальні дієслова',q:'You ___ not park here.',opts:['must','can','could','should'],correct:0},
  // L11
  {lessonNum:11,topic:'Past Simple — правильные',topicUK:'Past Simple — правильні',q:'She ___ the letter yesterday.',opts:['send','sends','sent','sending'],correct:2},
  {lessonNum:11,topic:'Past Simple — правильные',topicUK:'Past Simple — правильні',q:'They ___ football last week.',opts:['play','plays','played','playing'],correct:2},
  {lessonNum:11,topic:'Past Simple — правильные',topicUK:'Past Simple — правильні',q:'I ___ him yesterday.',opts:['call','calls','called','calling'],correct:2},
  // L12
  {lessonNum:12,topic:'Past Simple — неправильные',topicUK:'Past Simple — неправильні',q:'He ___ to London last year.',opts:['go','goes','went','gone'],correct:2},
  {lessonNum:12,topic:'Past Simple — неправильные',topicUK:'Past Simple — неправильні',q:'They ___ a lot of money.',opts:['spend','spends','spent','spending'],correct:2},
  {lessonNum:12,topic:'Past Simple — неправильные',topicUK:'Past Simple — неправильні',q:'She ___ the book last week.',opts:['read','reads','readed','reading'],correct:0},
  // L13
  {lessonNum:13,topic:'Future Simple (will)',topicUK:'Future Simple (will)',q:'She ___ come tomorrow.',opts:['will','would','is going','shall be'],correct:0},
  {lessonNum:13,topic:'Future Simple (will)',topicUK:'Future Simple (will)',q:'I ___ not be late.',opts:['will','shall','would','am'],correct:0},
  {lessonNum:13,topic:'Future Simple (will)',topicUK:'Future Simple (will)',q:'It ___ rain tomorrow.',opts:['will','would','shall','is'],correct:0},
  // L14
  {lessonNum:14,topic:'Степени сравнения',topicUK:'Ступені порівняння',q:"This is ___ book I've read.",opts:['good','better','the best','best'],correct:2},
  {lessonNum:14,topic:'Степени сравнения',topicUK:'Ступені порівняння',q:'She is ___ than her sister.',opts:['tall','taller','tallest','most tall'],correct:1},
  {lessonNum:14,topic:'Степени сравнения',topicUK:'Ступені порівняння',q:'This test is ___ than the last one.',opts:['hard','harder','hardest','more hard'],correct:1},
  // L15
  {lessonNum:15,topic:'Притяжательные местоимения',topicUK:'Присвійні займенники',q:'This is ___ bag.',opts:['her','hers','she','herself'],correct:0},
  {lessonNum:15,topic:'Притяжательные местоимения',topicUK:'Присвійні займенники',q:'Is this pen ___?',opts:['your','yours','you','yourself'],correct:1},
  {lessonNum:15,topic:'Притяжательные местоимения',topicUK:'Присвійні займенники',q:'These are ___ books.',opts:['their','theirs','they','themselves'],correct:0},
  // L16
  {lessonNum:16,topic:'Фразовые глаголы',topicUK:'Фразові дієслова',q:'Please ___ the light.',opts:['turn on','turn up','turn in','turn out'],correct:0},
  {lessonNum:16,topic:'Фразовые глаголы',topicUK:'Фразові дієслова',q:'She ___ smoking last year.',opts:['gave up','give up','gives up','given up'],correct:0},
  {lessonNum:16,topic:'Фразовые глаголы',topicUK:'Фразові дієслова',q:'Could you ___ the TV?',opts:['turn off','turn down','put off','turn in'],correct:0},
  // L17
  {lessonNum:17,topic:'Present Continuous',topicUK:'Present Continuous',q:'She ___ now.',opts:['study','studies','is studying','studied'],correct:2},
  {lessonNum:17,topic:'Present Continuous',topicUK:'Present Continuous',q:'They ___ football right now.',opts:['play','plays','are playing','played'],correct:2},
  {lessonNum:17,topic:'Present Continuous',topicUK:'Present Continuous',q:'I ___ dinner at the moment.',opts:['cook','cooks','am cooking','cooked'],correct:2},
  // L18
  {lessonNum:18,topic:'Повелительное наклонение',topicUK:'Наказовий спосіб',q:'___ quiet, please.',opts:['Be','Is','Are','Being'],correct:0},
  {lessonNum:18,topic:'Повелительное наклонение',topicUK:'Наказовий спосіб',q:"Don't ___ late.",opts:['be','is','are','being'],correct:0},
  {lessonNum:18,topic:'Повелительное наклонение',topicUK:'Наказовий спосіб',q:'___ the window, please.',opts:['Open','Opens','Opening','Opened'],correct:0},
  // L19
  {lessonNum:19,topic:'Предлоги места',topicUK:'Прийменники місця',q:'The cat is ___ the table.',opts:['in','on','under','between'],correct:1},
  {lessonNum:19,topic:'Предлоги места',topicUK:'Прийменники місця',q:'The book is ___ the bag.',opts:['on','in','at','between'],correct:1},
  {lessonNum:19,topic:'Предлоги места',topicUK:'Прийменники місця',q:'She lives ___ London.',opts:['on','at','in','by'],correct:2},
  // L20
  {lessonNum:20,topic:'Артикли (a/an/the)',topicUK:'Артиклі (a/an/the)',q:'She is ___ doctor.',opts:['a','an','the','—'],correct:0},
  {lessonNum:20,topic:'Артикли (a/an/the)',topicUK:'Артиклі (a/an/the)',q:'I am ___ engineer.',opts:['a','an','the','—'],correct:1},
  {lessonNum:20,topic:'Артикли (a/an/the)',topicUK:'Артиклі (a/an/the)',q:'She loves ___ sun.',opts:['a','an','the','—'],correct:2},
  // L21
  {lessonNum:21,topic:'Неопределённые местоимения',topicUK:'Неозначені займенники',q:'There is ___ in the room.',opts:['somebody','anybody','nobody','everybody'],correct:0},
  {lessonNum:21,topic:'Неопределённые местоимения',topicUK:'Неозначені займенники',q:'Is there ___ here?',opts:['someone','anyone','no one','everyone'],correct:1},
  {lessonNum:21,topic:'Неопределённые местоимения',topicUK:'Неозначені займенники',q:"I don't have ___ money.",opts:['some','any','no','every'],correct:1},
  // L22
  {lessonNum:22,topic:'Герундий (-ing)',topicUK:'Герундій (-ing)',q:'She enjoys ___.',opts:['dance','dances','dancing','to dance'],correct:2},
  {lessonNum:22,topic:'Герундий (-ing)',topicUK:'Герундій (-ing)',q:'He avoids ___ the problem.',opts:['discuss','discussed','discussing','to discuss'],correct:2},
  {lessonNum:22,topic:'Герундий (-ing)',topicUK:'Герундій (-ing)',q:'They finished ___ dinner.',opts:['cook','cooks','cooking','to cook'],correct:2},
  // L23
  {lessonNum:23,topic:'Passive Voice',topicUK:'Passive Voice',q:'The letter ___ by her.',opts:['wrote','is written','was written','had written'],correct:2},
  {lessonNum:23,topic:'Passive Voice',topicUK:'Passive Voice',q:'Cars ___ made in factories.',opts:['is','am','are','were'],correct:2},
  {lessonNum:23,topic:'Passive Voice',topicUK:'Passive Voice',q:'The report ___ submitted by Friday.',opts:['must be','must have','should','is going'],correct:0},
  // L24
  {lessonNum:24,topic:'Present Perfect',topicUK:'Present Perfect',q:"I ___ never been to Paris.",opts:['have','has','had','was'],correct:0},
  {lessonNum:24,topic:'Present Perfect',topicUK:'Present Perfect',q:'She ___ just finished.',opts:['have','has','had','is'],correct:1},
  {lessonNum:24,topic:'Present Perfect',topicUK:'Present Perfect',q:'Have you ever ___ sushi?',opts:['eat','ate','eating','eaten'],correct:3},
  // L25
  {lessonNum:25,topic:'Past Continuous',topicUK:'Past Continuous',q:'She ___ when I called.',opts:['sleep','slept','was sleeping','has slept'],correct:2},
  {lessonNum:25,topic:'Past Continuous',topicUK:'Past Continuous',q:'They ___ TV at 8 pm.',opts:['watch','watched','were watching','have watched'],correct:2},
  {lessonNum:25,topic:'Past Continuous',topicUK:'Past Continuous',q:'I ___ when the phone rang.',opts:['work','worked','was working','am working'],correct:2},
  // L26
  {lessonNum:26,topic:'Условные предложения (if)',topicUK:'Умовні речення (if)',q:'If it rains, I ___ stay home.',opts:['will','would','shall','should'],correct:0},
  {lessonNum:26,topic:'Условные предложения (if)',topicUK:'Умовні речення (if)',q:'If I ___ rich, I would travel.',opts:['am','was','were','be'],correct:2},
  {lessonNum:26,topic:'Условные предложения (if)',topicUK:'Умовні речення (if)',q:'If she had tried, she ___ passed.',opts:['will have','would have','had','did'],correct:1},
  // L27
  {lessonNum:27,topic:'Косвенная речь',topicUK:'Непряма мова',q:'He said he ___ tired.',opts:['is','was','were','be'],correct:1},
  {lessonNum:27,topic:'Косвенная речь',topicUK:'Непряма мова',q:'She told me she ___ leave.',opts:['will','would','shall','should'],correct:1},
  {lessonNum:27,topic:'Косвенная речь',topicUK:'Непряма мова',q:'He asked where I ___.',opts:['live','lived','living','lives'],correct:1},
  // L28
  {lessonNum:28,topic:'Возвратные местоимения',topicUK:'Зворотні займенники',q:'She did it ___.',opts:['her','herself','hers','she'],correct:1},
  {lessonNum:28,topic:'Возвратные местоимения',topicUK:'Зворотні займенники',q:'He hurt ___ playing football.',opts:['him','himself','his','he'],correct:1},
  {lessonNum:28,topic:'Возвратные местоимения',topicUK:'Зворотні займенники',q:'They enjoyed ___ at the party.',opts:['them','themselves','their','they'],correct:1},
  // L29
  {lessonNum:29,topic:'Used to',topicUK:'Used to',q:'I ___ play football as a kid.',opts:['used to','use to','am used to','was used to'],correct:0},
  {lessonNum:29,topic:'Used to',topicUK:'Used to',q:'She ___ live in Paris.',opts:['used to','use to','is used to','uses to'],correct:0},
  {lessonNum:29,topic:'Used to',topicUK:'Used to',q:'He is ___ waking up early.',opts:['use to','used to','used','get used to'],correct:1},
  // L30
  {lessonNum:30,topic:'Relative Clauses',topicUK:'Relative Clauses',q:'The man ___ called is my friend.',opts:['who','which','whose','whom'],correct:0},
  {lessonNum:30,topic:'Relative Clauses',topicUK:'Relative Clauses',q:'The book ___ I read was great.',opts:['who','which','whose','whom'],correct:1},
  {lessonNum:30,topic:'Relative Clauses',topicUK:'Relative Clauses',q:"The girl ___ mother is a doctor studies here.",opts:['who','which','whose','whom'],correct:2},
  // L31
  {lessonNum:31,topic:'Complex Object',topicUK:'Complex Object',q:'I want you ___ this.',opts:['do','doing','to do','done'],correct:2},
  {lessonNum:31,topic:'Complex Object',topicUK:'Complex Object',q:'She expects him ___ on time.',opts:['arrive','arriving','to arrive','arrived'],correct:2},
  {lessonNum:31,topic:'Complex Object',topicUK:'Complex Object',q:'I heard her ___ a song.',opts:['sing','singing','to sing','sang'],correct:1},
  // L32
  {lessonNum:32,topic:'Повторение всех тем',topicUK:'Повторення всіх тем',q:'She ___ not have come so early.',opts:['should','shall','would','will'],correct:0},
  {lessonNum:32,topic:'Повторение всех тем',topicUK:'Повторення всіх тем',q:'By the time she arrived, he ___ left.',opts:['left','has left','had left','was leaving'],correct:2},
  {lessonNum:32,topic:'Повторение всех тем',topicUK:'Повторення всіх тем',q:'If you had come, you ___ her.',opts:['meet','met','would have met','had met'],correct:2},
];

const LEVEL_RANGES: Record<string, [number, number]> = {
  A1: [1, 8], A2: [9, 18], B1: [19, 28], B2: [29, 32],
};

const LEVEL_LABELS: Record<string, { ru: string; uk: string }> = {
  A1: { ru: 'Зачёт A1', uk: 'Залік A1' },
  A2: { ru: 'Зачёт A2', uk: 'Залік A2' },
  B1: { ru: 'Зачёт B1', uk: 'Залік B1' },
  B2: { ru: 'Зачёт B2', uk: 'Залік B2' },
};

const PASS_PCT = 70; // минимум % для сдачи

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function LevelExam() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const { level } = useLocalSearchParams<{ level: string }>();
  const lvl = level || 'A1';

  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState<(number | null)[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [examMedalTier, setExamMedalTier] = useState<MedalTier>('none');
  const [examPassCount, setExamPassCount] = useState(0);
  const [medalImproved, setMedalImproved] = useState(false);

  const questions = useMemo(() => {
    const [from, to] = LEVEL_RANGES[lvl] ?? [1, 8];
    return QUESTION_POOL.filter(q => q.lessonNum >= from && q.lessonNum <= to);
  }, [lvl]);

  const title = LEVEL_LABELS[lvl]?.[isUK ? 'uk' : 'ru'] ?? `Зачёт ${lvl}`;
  const total = questions.length;
  const q = questions[idx];
  const chosen = choices[idx] ?? null;

  const startExam = useCallback(() => {
    setChoices(new Array(questions.length).fill(null));
    setIdx(0);
    setShowAnswer(false);
    setPhase('quiz');
  }, [questions.length]);

  const handlePick = (ci: number) => {
    if (chosen !== null) return;
    hapticTap();
    setChoices(prev => { const n = [...prev]; n[idx] = ci; return n; });
    setShowAnswer(true);
  };

  const goNext = () => {
    setShowAnswer(false);
    if (idx + 1 < total) setIdx(i => i + 1);
    else finishExam();
  };

  const finishExam = async () => {
    const correct = choices.filter((c, i) => c !== null && c === questions[i].correct).length;
    let pct = Math.round(correct / total * 100);

    // Если включен режим "Без ограничений", даём 100% автоматически
    const noLimits = await AsyncStorage.getItem('tester_no_limits');
    if (noLimits === 'true') {
      pct = 100;
    }

    const passed = pct >= PASS_PCT;
    try {
      await AsyncStorage.setItem(`level_exam_${lvl}_pct`, String(pct));
      await AsyncStorage.setItem(`level_exam_${lvl}_passed`, passed ? '1' : '0');
      const { newTier, prevTier, newPassCount } = await saveExamProgress(lvl, pct);
      setExamMedalTier(newTier);
      setExamPassCount(newPassCount);
      setMedalImproved(newTier !== prevTier && newTier !== 'none');
      // Gem achievements for exam
      const gemMap: Record<number, 'ruby' | 'emerald' | 'diamond'> = { 2: 'ruby', 3: 'emerald', 4: 'diamond' };
      const gem = gemMap[newPassCount];
      if (gem) checkAchievements({ type: 'gem', level: lvl, gem } as any).catch(() => {});
      checkAchievements({ type: 'exam', pct }).catch(() => {});
    } catch {}
    setPhase('result');
  };

  const correctCount = choices.filter((c, i) => c !== null && c === questions[i].correct).length;
  const pct = total > 0 ? Math.round(correctCount / total * 100) : 0;
  const passed = pct >= PASS_PCT;

  // ── INTRO ────────────────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => { hapticTap(); router.back(); }}>
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 10 }}>{title}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.accentBg, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="school-outline" size={36} color={t.accent} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '800', textAlign: 'center' }}>{title}</Text>
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: 22 }}>
              {isUK
                ? `${total} питань — по 3 з кожного уроку рівня ${lvl}.`
                : `${total} вопросов — по 3 из каждого урока уровня ${lvl}.`}
            </Text>
          </View>

          <View style={{ backgroundColor: t.bgCard, borderRadius: 16, borderWidth: 0.5, borderColor: t.border, padding: 16, gap: 10 }}>
            {[
              { icon: 'help-circle-outline' as const, text: isUK ? `${total} питань` : `${total} вопросов` },
              { icon: 'medal-outline' as const, text: isUK ? 'Набери 90%+ щоб отримати золото' : 'Набери 90%+ чтобы получить золото' },
              { icon: 'refresh-outline' as const, text: isUK ? 'Можна проходити кілька разів' : 'Можно проходить несколько раз' },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={item.icon} size={20} color={t.accent} />
                <Text style={{ color: t.textSecond, fontSize: f.body, flex: 1 }}>{item.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => { hapticTap(); startExam(); }}
            style={{ backgroundColor: t.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
          >
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>
              {isUK ? 'Почати залік' : 'Начать зачёт'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );

  // ── RESULT ───────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const wrongItems = questions.map((q, i) => ({ q, chosen: choices[i], correct: q.correct })).filter(x => x.chosen !== x.correct);
    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TouchableOpacity onPress={() => { hapticTap(); router.back(); }}>
              <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 10 }}>{title}</Text>
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
                  {examMedalTier === 'gold' ? (isUK ? '🥇 Золото!' : '🥇 Золото!') :
                   examMedalTier === 'silver' ? (isUK ? '🥈 Нова медаль!' : '🥈 Новая медаль!') :
                   (isUK ? '🥉 Нова медаль!' : '🥉 Новая медаль!')}
                </Text>
              )}
              <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '800' }}>{pct}%</Text>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {isUK ? `${correctCount} з ${total} правильно` : `${correctCount} из ${total} правильно`}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {isUK ? `Спроба №${examPassCount}` : `Попытка №${examPassCount}`}
              </Text>
            </View>

            {/* Прогресс-бар */}
            <View style={{ height: 8, backgroundColor: t.bgSurface, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: passed ? t.correct : t.wrong, borderRadius: 4 }} />
            </View>

            {/* Ошибки */}
            {wrongItems.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                  {isUK ? 'Помилки:' : 'Ошибки:'}
                </Text>
                {wrongItems.map((item, i) => (
                  <View key={i} style={{ backgroundColor: t.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: t.border, padding: 14, gap: 6 }}>
                    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700' }}>
                      {isUK ? item.q.topicUK : item.q.topic}
                    </Text>
                    <Text style={{ color: t.textPrimary, fontSize: f.body }}>{item.q.q}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {item.chosen !== null && (
                        <Text style={{ color: t.wrong, fontSize: f.sub }}>
                          ✗ {item.q.opts[item.chosen]}
                        </Text>
                      )}
                      <Text style={{ color: t.correct, fontSize: f.sub }}>
                        ✓ {item.q.opts[item.correct]}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Кнопки */}
            <TouchableOpacity
              onPress={() => { hapticTap(); startExam(); }}
              style={{ backgroundColor: t.bgCard, borderRadius: 14, borderWidth: 0.5, borderColor: t.border, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                {isUK ? 'Спробувати ще раз' : 'Попробовать ещё раз'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { hapticTap(); router.back(); }}
              style={{ backgroundColor: t.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>
                {isUK ? 'До уроків' : 'К урокам'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── QUIZ ─────────────────────────────────────────────────────────────────────
  const progressPct = Math.round((idx + 1) / total * 100);
  const isCorrect = chosen !== null && chosen === q.correct;
  const isWrong   = chosen !== null && chosen !== q.correct;

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
        {/* Хедер */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => {
            hapticTap();
            Alert.alert(
              isUK ? 'Вийти?' : 'Выйти?',
              isUK ? 'Прогрес заліку буде втрачено' : 'Прогресс зачёта будет потерян',
              [
                { text: isUK ? 'Скасувати' : 'Отмена', style: 'cancel' },
                { text: isUK ? 'Вийти' : 'Выйти', style: 'destructive', onPress: () => router.back() },
              ]
            );
          }}>
            <Ionicons name="close" size={26} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <View style={{ height: 6, backgroundColor: t.bgSurface, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${progressPct}%` as any, backgroundColor: t.accent, borderRadius: 3 }} />
            </View>
          </View>
          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', minWidth: 48, textAlign: 'right' }}>
            {idx + 1} / {total}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} bounces={false}>
          {/* Топик */}
          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            {isUK ? q.topicUK : q.topic} · {isUK ? 'Урок' : 'Урок'} {q.lessonNum}
          </Text>

          {/* Вопрос */}
          <View style={{ backgroundColor: t.bgCard, borderRadius: 16, borderWidth: 0.5, borderColor: t.border, padding: 20 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600', lineHeight: 26 }}>{q.q}</Text>
          </View>

          {/* Варианты ответов */}
          <View style={{ gap: 10 }}>
            {q.opts.map((opt, ci) => {
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
              <Text style={{ color: '#fff', fontSize: f.bodyLg, fontWeight: '700' }}>
                {idx + 1 < total ? (isUK ? 'Далі →' : 'Далее →') : (isUK ? 'Завершити' : 'Завершить')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
