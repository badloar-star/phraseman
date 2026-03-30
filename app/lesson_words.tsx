import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  SectionList, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { hapticTap } from '../hooks/use-haptics';
import * as Haptics from 'expo-haptics';
import { loadSettings } from './settings_edu';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import { addOrUpdateScore } from './hall_of_fame_utils';
import { updateMultipleTaskProgress } from './daily_tasks';
import AddToFlashcard from '../components/AddToFlashcard';
import ScreenGradient from '../components/ScreenGradient';

const REQUIRED = 3;
const POINTS_PER_WORD = 3;

type POS = 'pronouns'|'verbs'|'irregular_verbs'|'adjectives'|'adverbs'|'nouns';
interface Word { en:string; ru:string; uk:string; pos:POS; }

const POS_LABELS_RU: Record<POS,string> = {
  pronouns:'Местоимения', verbs:'Глаголы (to-be)', irregular_verbs:'Неправильные глаголы', adjectives:'Прилагательные',
  adverbs:'Наречия', nouns:'Существительные',
};
const POS_LABELS_UK: Record<POS,string> = {
  pronouns:'Займенники', verbs:'Дієслова (to-be)', irregular_verbs:'Неправильні дієслова', adjectives:'Прикметники',
  adverbs:'Прислівники', nouns:'Іменники',
};

// LESSON 1 VOCABULARY — Empty (will be provided by user)
const WORDS_BY_LESSON: Record<number, Word[]> = {
  1: [],
};

const groupByPOS = (words: Word[], lang: 'ru'|'uk') => {
  const labels = lang === 'uk' ? POS_LABELS_UK : POS_LABELS_RU;
  const map: Partial<Record<POS, Word[]>> = {};
  for (const w of words) {
    if (!map[w.pos]) map[w.pos] = [];
    map[w.pos]!.push(w);
  }
  return (['pronouns','verbs','irregular_verbs','adjectives','adverbs','nouns'] as POS[])
    .filter(k => map[k]?.length)
    .map(k => ({ title: labels[k], data: map[k]! }));
};

const fy = <T,>(a: T[]): T[] => { const r=[...a]; for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];} return r; };

// Cross-lesson pool: deduped union of all lesson words for expanding distractors
const ALL_WORDS_FLAT: Word[] = (() => {
  const seen = new Set<string>();
  const result: Word[] = [];
  for (const lw of Object.values(WORDS_BY_LESSON)) {
    for (const w of lw) {
      if (!seen.has(w.en)) { seen.add(w.en); result.push(w); }
    }
  }
  return result;
})();

// 6 вариантов – правильный гарантирован, дистракторы того же POS
// Всегда берём часть из cross-lesson для разнообразия (не всегда одни и те же слова урока)
const makeOptions = (correct: Word, all: Word[]): string[] => {
  const notMe = (w: Word) => w.en !== correct.en;
  // Из текущего урока (не более 3 — чтобы не повторялись одни и те же дистракторы)
  const lessonSamePos = fy(all.filter(w => notMe(w) && w.pos === correct.pos));
  const fromLesson    = lessonSamePos.slice(0, Math.min(3, lessonSamePos.length));
  // Из других уроков (добираем до 5)
  const fromCross = fy(
    ALL_WORDS_FLAT.filter(w => notMe(w) && w.pos === correct.pos && !fromLesson.some(l => l.en === w.en))
  ).slice(0, 5 - fromLesson.length);
  let combined = [...fromLesson, ...fromCross];
  // Если всё равно < 5, заполняем любыми словами урока/cross
  if (combined.length < 5) {
    const fallback = fy(
      [...all, ...ALL_WORDS_FLAT].filter(w => notMe(w) && !combined.some(c => c.en === w.en))
    );
    combined = [...combined, ...fallback].slice(0, 5);
  }
  return fy([...combined.slice(0, 5).map(w => w.en), correct.en]);
};

interface Card {
  word: Word;
  options: string[];
  correctCount: number;
}

function buildCard(word: Word, correctCount: number, all: Word[]): Card {
  return { word, options: makeOptions(word, all), correctCount };
}

// ── Мини-гексагон ────────────────────────────────────────────────────────────
// Flat-top hex: flat edges at top/bottom, pointed left/right
function MiniHex({ filled, partial, size = 16 }: { filled: boolean; partial?: boolean; size?: number }) {
  const { theme: t } = useTheme();
  const w     = size;
  const h     = w * 0.866;  // √3/2
  const tip   = w / 4;
  const mid   = w / 2;
  const color = filled ? t.correct : partial ? t.correct + '55' : t.bgSurface2;
  return (
    <View style={{ flexDirection: 'row', width: w, height: h }}>
      <View style={{ width: 0, height: 0, borderTopWidth: h/2, borderBottomWidth: h/2, borderRightWidth: tip, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: color, marginRight: -1 }} />
      <View style={{ width: mid + 2, height: h, backgroundColor: color }} />
      <View style={{ width: 0, height: 0, borderTopWidth: h/2, borderBottomWidth: h/2, borderLeftWidth: tip, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color, marginLeft: -1 }} />
    </View>
  );
}

// ── ТРЕНИРОВКА ───────────────────────────────────────────────────────────────
function Training({ words, storageKey, lang, initialLearned, initialCounts, onCountUpdate }: { words:Word[]; storageKey:string; lang:'ru'|'uk'; initialLearned:string[]; initialCounts:Record<string,number>; onCountUpdate:(word:string, count:number)=>void }) {
  const { theme:t, f } = useTheme();
  const { s } = useLang();
  const router = useRouter();
  const ws = s.words;

  const [queue,      setQueue]      = useState<Card[]>(() => {
    const notLearned = words.filter(w => !initialLearned.includes(w.en));
    const pool = notLearned.length > 0 ? notLearned : words;
    return [...pool].sort(() => Math.random() - 0.5).map(w => buildCard(w, initialCounts[w.en] ?? 0, words));
  });
  const [qIdx,       setQIdx]       = useState(0);
  const [chosen,     setChosen]     = useState<string|null>(null);
  const [dotCount,   setDotCount]   = useState(0); // кружочки – обновляются сразу
  const [totalPts,   setTotalPts]   = useState(0);
  const [learnedCnt, setLearnedCnt] = useState(initialLearned.length);
  const [userName,   setUserName]   = useState('');
  const [hapticsOn,  setHapticsOn]  = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [allDone,    setAllDone]    = useState(false);
  const [xpToastVisible, setXpToastVisible] = useState(false);

  const xpAnim = useRef(new Animated.ValueXY({ x: 0, y: 60 })).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;

  const showXpToast = () => {
    xpAnim.setValue({ x: 0, y: 60 });
    xpOpacity.setValue(0);
    setXpToastVisible(true);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(xpAnim, { toValue: { x: 0, y: 0 }, duration: 200, useNativeDriver: true }),
        Animated.timing(xpOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(800),
      Animated.timing(xpOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setXpToastVisible(false));
  };

  // Блокировка: не даём запустить обработку дважды
  const locked = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if(n) setUserName(n); });
    loadSettings().then(s => { setHapticsOn(s.haptics); setSpeechRate(s.speechRate ?? 1.0); });
  }, []);

  const current: Card | undefined = queue[qIdx % Math.max(queue.length, 1)];
  const prevEnRef = React.useRef('');
  React.useEffect(() => {
    if (current && current.word.en !== prevEnRef.current) {
      prevEnRef.current = current.word.en;
      setDotCount(current.correctCount);
    }
  }, [current?.word.en]);

  const handleChoice = (opt: string) => {
    if (locked.current || chosen !== null || !current) return;
    locked.current = true;

    setChosen(opt);
    const isRight = opt === current.word.en;
    if (isRight) setDotCount(c => Math.min(c + 1, REQUIRED)); // сразу показать заполнение

    Speech.speak(current.word.en, { language: 'en-US', rate: speechRate });
    if (!isRight) {
      try { if(hapticsOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }

    setTimeout(() => {
      // Все изменения очереди – внутри одного setTimeout, один ре-рендер
      const newQueue = [...queue];

      if (isRight) {
        const newCount = current.correctCount + 1;

        if (newCount >= REQUIRED) {
          // Выучено – удаляем из очереди
          newQueue.splice(qIdx % newQueue.length, 1);
          const newLearned = Math.min(learnedCnt + 1, words.length);

          AsyncStorage.getItem(storageKey + '_words').then(saved => {
            const counts: Record<string,number> = saved ? JSON.parse(saved) : {};
            counts[current.word.en] = REQUIRED;
            AsyncStorage.setItem(storageKey + '_words', JSON.stringify(counts));
          });
          onCountUpdate(current.word.en, REQUIRED);
          updateMultipleTaskProgress([{ type: 'words_learned' }, { type: 'daily_active' }]);
          showXpToast();

          AsyncStorage.getItem('user_total_xp').then(raw => {
            AsyncStorage.setItem('user_total_xp', String((parseInt(raw || '0') || 0) + POINTS_PER_WORD));
          });
          if (userName) {
            addOrUpdateScore(userName, POINTS_PER_WORD, lang);
            setTotalPts(p => p + POINTS_PER_WORD);
          }

          if (newQueue.length === 0) {
            setLearnedCnt(newLearned);
            setQueue(newQueue);
            setAllDone(true);
            setChosen(null);
            locked.current = false;
            return;
          }

          const nextIdx = (qIdx % newQueue.length);
          setLearnedCnt(newLearned);
          setQueue(newQueue);
          setQIdx(nextIdx);
        } else {
          // Не выучено ещё – сохраняем частичный прогресс
          AsyncStorage.getItem(storageKey + '_words').then(saved => {
            const counts: Record<string,number> = saved ? JSON.parse(saved) : {};
            counts[current.word.en] = newCount;
            AsyncStorage.setItem(storageKey + '_words', JSON.stringify(counts));
          });
          onCountUpdate(current.word.en, newCount);
          const updated = buildCard(current.word, newCount, words);
          newQueue.splice(qIdx % newQueue.length, 1);
          newQueue.push(updated);
          const nextIdx = qIdx % newQueue.length;
          setQueue(newQueue);
          setQIdx(nextIdx);
        }
      } else {
        // Ошибка – перемещаем в конец с новыми вариантами
        const resetCard = buildCard(current.word, current.correctCount, words);
        newQueue.splice(qIdx % newQueue.length, 1);
        newQueue.push(resetCard);
        const nextIdx = qIdx % newQueue.length;
        setQueue(newQueue);
        setQIdx(nextIdx);
      }

      setChosen(null);
      locked.current = false;
    }, 900);
  };

  if (allDone || queue.length === 0) return (
    <View style={{ flex:1, justifyContent:'center', alignItems:'center', gap:16, padding:20 }}>
      <View style={{ width:80,height:80,borderRadius:40,backgroundColor:t.bgCard,borderWidth:1,borderColor:t.border,justifyContent:'center',alignItems:'center' }}>
        <Ionicons name="checkmark-done-outline" size={36} color={t.correct}/>
      </View>
      <Text style={{ color:t.textPrimary, fontSize:f.h1, fontWeight:'700' }}>{ws.allLearned}</Text>
      <Text style={{ color:t.textMuted, fontSize:f.bodyLg }}>{ws.learnedOf(words.length, words.length)}</Text>
      {totalPts > 0 && (
        <View style={{ flexDirection:'row',alignItems:'center',gap:6,backgroundColor:t.correctBg,borderRadius:10,paddingHorizontal:14,paddingVertical:8 }}>
          <Ionicons name="star" size={16} color={t.correct}/>
          <Text style={{ color:t.correct, fontSize:f.bodyLg, fontWeight:'700' }}>{ws.plusPoints(totalPts)}</Text>
        </View>
      )}
      <TouchableOpacity
        style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 }}
        onPress={() => router.back()}
      >
        <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>{lang === 'uk' ? '← До уроку' : '← К уроку'}</Text>
      </TouchableOpacity>
    </View>
  );

  if (!current) return null;

  const question = lang === 'uk' ? current.word.uk : current.word.ru;

  const displayLearned = Math.min(learnedCnt, words.length);

  return (
    <View style={{ flex:1, paddingHorizontal:20, paddingTop:12 }}>
      {/* Прогресс — вверху */}
      <View style={{ width:'100%', marginBottom:16 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:5 }}>
          <Text style={{ color:t.textMuted, fontSize:f.label }}>
            {ws.learnedOf(displayLearned, words.length)}
          </Text>
          <Text style={{ color:displayLearned>0?t.correct:t.textMuted, fontSize:f.label, fontWeight:'600' }}>
            {Math.min(Math.round(displayLearned/words.length*100), 100)}%
          </Text>
        </View>
        <View style={{ height:5, backgroundColor:t.border, borderRadius:3, overflow:'hidden' }}>
          <View style={{ height:'100%', width:`${Math.min((displayLearned/words.length)*100, 100)}%` as any, backgroundColor:t.correct, borderRadius:3 }}/>
        </View>
      </View>

      {/* 3 гексагона */}
      <View style={{ flexDirection:'row', gap:10, marginBottom:20, justifyContent:'center', alignItems:'center' }}>
        {[0,1,2].map(i => (
          <MiniHex key={i} filled={dotCount > i} size={22} />
        ))}
      </View>

      {/* Вопрос — занимает всё свободное пространство, центрируется */}
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <Text style={{ color:t.textPrimary, fontSize:36, fontWeight:'300', textAlign:'center' }}>
          {question}
        </Text>
      </View>

      {/* 6 вариантов в 2 колонки — внизу */}
      <View style={{ width:'100%', flexDirection:'row', flexWrap:'wrap', gap:10, paddingBottom: 16 }}>
        {current.options.map((opt, i) => {
          const isCorrect  = opt === current.word.en;
          const isSelected = opt === chosen;
          let bg=t.bgCard, border=t.border, tc=t.textSecond;
          if (chosen !== null) {
            if (isCorrect)        { bg=t.correctBg; border=t.correct; tc=t.correct; }
            else if (isSelected)  { bg=t.wrongBg;   border=t.wrong;   tc=t.wrong;   }
          }
          return (
            <TouchableOpacity key={i}
              style={{ width:'48%', minHeight:64, paddingVertical:12, paddingHorizontal:8, borderRadius:14, alignItems:'center', justifyContent:'center', borderWidth:1, backgroundColor:bg, borderColor:border }}
              onPress={() => { hapticTap(); handleChoice(opt); }}
              activeOpacity={0.8}
              disabled={chosen !== null}
            >
              <Text style={{ color:tc, fontSize:f.h2, fontWeight:'500', textAlign:'center' }} numberOfLines={2} adjustsFontSizeToFit>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {xpToastVisible && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 110,
            alignSelf: 'center',
            backgroundColor: '#FFC800',
            borderRadius: 20,
            paddingHorizontal: 20,
            paddingVertical: 10,
            transform: [{ translateY: xpAnim.y }],
            opacity: xpOpacity,
            zIndex: 999,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>+3 XP</Text>
        </Animated.View>
      )}

    </View>
  );
}

// ── СПИСОК ───────────────────────────────────────────────────────────────────
function WordList({ words, learnedCounts, lang, speechRate, onStartTraining }: { words:Word[]; learnedCounts:Record<string,number>; lang:'ru'|'uk'; speechRate:number; onStartTraining?: () => void }) {
  const { theme:t, f } = useTheme();
  const sections = groupByPOS(words, lang);
  const isUK = lang === 'uk';

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.en}
      contentContainerStyle={{ paddingBottom:30 }}
      ListFooterComponent={onStartTraining ? (
        <TouchableOpacity
          onPress={onStartTraining}
          style={{ marginHorizontal:16, marginTop:16, marginBottom:8, backgroundColor:t.bgCard, borderRadius:14, paddingVertical:13, alignItems:'center', borderWidth:1, borderColor:t.textSecond+'55', flexDirection:'row', justifyContent:'center', gap:8 }}
        >
          <Ionicons name="pencil" size={18} color={t.textSecond} />
          <Text style={{ color:t.textSecond, fontSize:f.bodyLg, fontWeight:'600' }}>{isUK ? 'Повернутись до тренування' : 'Вернуться к тренировке'}</Text>
        </TouchableOpacity>
      ) : null}
      ListHeaderComponent={onStartTraining ? (
        <TouchableOpacity
          onPress={onStartTraining}
          style={{ marginHorizontal:16, marginTop:14, marginBottom:4, backgroundColor:t.bgCard, borderRadius:14, paddingVertical:13, alignItems:'center', borderWidth:1, borderColor:t.border, flexDirection:'row', justifyContent:'center', gap:8 }}
        >
          <Ionicons name="pencil-outline" size={18} color={t.textSecond} />
          <Text style={{ color:t.textSecond, fontSize:f.bodyLg, fontWeight:'600' }}>{isUK ? 'Почати тренування' : 'Начать тренировку'}</Text>
        </TouchableOpacity>
      ) : null}
      renderSectionHeader={({ section }) => (
        <View style={{ backgroundColor:t.bgPrimary, paddingHorizontal:20, paddingTop:16, paddingBottom:8 }}>
          <Text style={{ color:t.textMuted, fontSize:f.label, fontWeight:'600', textTransform:'uppercase', letterSpacing:1 }}>
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => {
        const count = learnedCounts[item.en] ?? 0;
        const learned = count >= REQUIRED;
        const tr = lang === 'uk' ? item.uk : item.ru;
        return (
          <View
            style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingVertical:14, borderBottomWidth:0.5, borderBottomColor:t.border }}
          >
            <View style={{ flexDirection:'row', gap:3, marginRight:12, alignItems:'center' }}>
              {[0,1,2].map(i => (
                <MiniHex key={i} filled={count > i} partial={count > i && count < REQUIRED} size={11} />
              ))}
            </View>
            <Text style={{ flex:1, color:t.textPrimary, fontSize:f.bodyLg }}>{item.en}</Text>
            <Text style={{ color:t.textMuted, fontSize:f.body, marginRight:8 }}>{tr}</Text>
            <AddToFlashcard en={item.en} ru={item.ru} uk={item.uk} source="word" />
          </View>
        );
      }}
    />
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
export default function LessonWords() {
  const router = useRouter();
  const { theme:t, f } = useTheme();
  const { s, lang } = useLang();
  const { id } = useLocalSearchParams<{ id:string }>();
  const lessonId = parseInt(id || '1', 10);
  const words = WORDS_BY_LESSON[lessonId] || WORDS_BY_LESSON[1];
  const storageKey = `lesson${lessonId}`;
  const ws = s.words;

  const [tab, setTab]              = useState<'train'|'list'>('train');
  const [learnedCounts, setLearnedCounts] = useState<Record<string,number>>({});
  const learnedWords = Object.keys(learnedCounts).filter(k => learnedCounts[k] >= REQUIRED);
  const [listSpeechRate, setListSpeechRate] = useState(1.0);

  useEffect(() => {
    AsyncStorage.getItem(storageKey + '_words').then(v => {
      if (!v) return;
      const data = JSON.parse(v);
      if (Array.isArray(data)) {
        // старый формат string[] → конвертируем
        const counts: Record<string,number> = {};
        data.forEach((w: string) => { counts[w] = REQUIRED; });
        setLearnedCounts(counts);
      } else {
        setLearnedCounts(data);
      }
    });
    loadSettings().then(cfg => setListSpeechRate(cfg.speechRate ?? 1.0));
  }, [storageKey]);

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:15, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{ color:t.textPrimary, fontSize:f.h2, fontWeight:'600' }}>{ws.title(lessonId)}</Text>
        <View style={{ width:28 }}/>
      </View>

      <View style={{ flex:1 }}>
        {tab === 'train'
          ? <Training
            words={words}
            storageKey={storageKey}
            lang={lang}
            initialLearned={Object.keys(learnedCounts).filter(k => learnedCounts[k] >= REQUIRED)}
            initialCounts={learnedCounts}
            onCountUpdate={(word, count) => setLearnedCounts(prev => ({ ...prev, [word]: count }))}
          />
          : <WordList words={words} learnedCounts={learnedCounts} lang={lang} speechRate={listSpeechRate} onStartTraining={() => setTab('train')} />
        }
      </View>

      <View style={{ flexDirection:'row', borderTopWidth:0.5, borderTopColor:t.border }}>
        {(['train','list'] as const).map(key => {
          const isActive = tab === key;
          const label = key === 'train'
            ? (lang === 'uk' ? 'Повторення' : 'Повторение')
            : (lang === 'uk' ? 'Словник' : 'Словарь');
          const icon  = key === 'train'
            ? (isActive ? 'pencil'  : 'pencil-outline')
            : (isActive ? 'list'    : 'list-outline');
          return (
            <TouchableOpacity key={key}
              style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:14, gap:8, borderTopWidth:isActive?2:0, borderTopColor:t.textSecond }}
              onPress={() => setTab(key)}
            >
              <Ionicons name={icon as any} size={20} color={isActive?t.textSecond:t.textGhost}/>
              <Text style={{ color:isActive?t.textSecond:t.textGhost, fontSize:f.body, fontWeight:'500' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}

export const LESSONS_WITH_WORDS: Set<number> = new Set(Object.keys(WORDS_BY_LESSON).map(Number));
export const WORD_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(WORDS_BY_LESSON).map(([k, v]) => [Number(k), v.length])
);
