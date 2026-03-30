// dialog_vocab.tsx — экран изучения слов/глаголов диалога
// Работает как lesson_words/lesson_verbs но для диалогов
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { getDialogById, DIALOGS } from './dialogs_data';

// Fisher-Yates shuffle
const fy = <T,>(a: T[]): T[] => { const r=[...a]; for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];} return r; };

// Cross-dialog word pool for expanding distractors
const ALL_DIALOG_WORDS: string[] = (() => {
  const seen = new Set<string>();
  const res: string[] = [];
  for (const d of DIALOGS) {
    for (const w of d.words || []) {
      if (!seen.has(w.en)) { seen.add(w.en); res.push(w.en); }
    }
  }
  return res;
})();

const REQUIRED = 3;

export default function DialogVocabScreen() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const { id, type } = useLocalSearchParams<{ id: string; type: 'words' | 'verbs' }>();
  
  const dialog = getDialogById(id || '');
  const [tab, setTab] = useState<'train'|'list'>('train');
  const [learnedCounts, setLearnedCounts] = useState<Record<string,number>>({});

  const storageKey = `dialog_${id}_${type}`;
  const isWords = type === 'words';
  const items = isWords ? (dialog?.words || []) : (dialog?.verbs || []);

  useEffect(() => {
    AsyncStorage.getItem(storageKey + '_progress').then(v => {
      if (v) setLearnedCounts(JSON.parse(v));
    });
  }, []);

  if (!dialog) return null;
  if (items.length === 0) return null;

  // ── Training ─────────────────────────────────────────────────────────────
  const WordTraining = () => {
    const words = dialog.words || [];
    const [idx, setIdx] = useState(0);
    const [chosen, setChosen] = useState<string | null>(null);
    const [counts, setCounts] = useState<Record<string,number>>({ ...learnedCounts });
    
    const current = words[idx % words.length];
    
    const makeOptions = (correct: string): string[] => {
      const lessonOthers = words.filter(w => w.en !== correct).map(w => w.en);
      const crossOthers = lessonOthers.length >= 5 ? [] :
        fy(ALL_DIALOG_WORDS.filter(w => w !== correct && !lessonOthers.includes(w)));
      const decoys = [...lessonOthers, ...crossOthers].slice(0, 5);
      return fy([...decoys, correct]);
    };

    const [options] = useState(() => makeOptions(current.en));
    const question = isUK ? current.uk : current.ru;
    const learnedCount = Object.values(counts).filter(c => c >= REQUIRED).length;

    const handleChoice = async (opt: string) => {
      if (chosen !== null) return;
      setChosen(opt);
      Speech.speak(current.en, { language: 'en-US', rate: 0.9 });
      
      const isRight = opt === current.en;
      const newCount = isRight ? (counts[current.en] || 0) + 1 : 0;
      const newCounts = { ...counts, [current.en]: newCount };
      setCounts(newCounts);
      
      const saved = await AsyncStorage.getItem(storageKey + '_progress');
      const existing = saved ? JSON.parse(saved) : {};
      existing[current.en] = newCount;
      await AsyncStorage.setItem(storageKey + '_progress', JSON.stringify(existing));
      setLearnedCounts(existing);

      setTimeout(() => {
        setChosen(null);
        setIdx(i => i + 1);
      }, 900);
    };

    return (
      <View style={{ flex:1, padding:20, alignItems:'center' }}>
        {/* Кружки */}
        <View style={{ flexDirection:'row', gap:10, marginBottom:24 }}>
          {[0,1,2].map(i => (
            <View key={i} style={{ width:20, height:20, borderRadius:10, borderWidth:2, borderColor:t.textSecond, backgroundColor:(counts[current.en]||0)>i?t.textSecond:'transparent' }} />
          ))}
        </View>
        {/* Вопрос */}
        <Text style={{ color:t.textPrimary, fontSize:32, fontWeight:'300', marginBottom:32, textAlign:'center' }}>
          {question}
        </Text>
        {/* Варианты */}
        <View style={{ width:'100%', flexDirection:'row', flexWrap:'wrap', gap:10 }}>
          {options.map((opt, i) => {
            const isCorrect = opt === current.en;
            const isSelected = opt === chosen;
            let bg = t.bgCard, border = t.border, tc = t.textSecond;
            if (chosen !== null) {
              if (isCorrect) { bg = t.correctBg; border = t.correct; tc = t.correct; }
              else if (isSelected) { bg = t.wrongBg; border = t.wrong; tc = t.wrong; }
            }
            return (
              <TouchableOpacity key={i} onPress={() => handleChoice(opt)} disabled={chosen !== null} activeOpacity={0.8}
                style={{ width:'48%', padding:16, borderRadius:14, alignItems:'center', borderWidth:1, backgroundColor:bg, borderColor:border }}>
                <Text style={{ color:tc, fontSize:16, fontWeight:'500', textAlign:'center' }}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Прогресс */}
        <View style={{ width:'100%', height:4, backgroundColor:t.border, borderRadius:2, marginTop:24 }}>
          <View style={{ height:'100%', width:`${(learnedCount/words.length)*100}%` as any, backgroundColor:t.correct, borderRadius:2 }} />
        </View>
        <Text style={{ color:t.textMuted, fontSize:12, marginTop:6 }}>
          {learnedCount} / {words.length} {isUK ? 'вивчено' : 'выучено'}
        </Text>
      </View>
    );
  };

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight:12 }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color:t.textPrimary, fontSize:17, fontWeight:'700' }}>
          {isWords
            ? (isUK ? 'Слова діалогу' : 'Слова диалога')
            : (isUK ? 'Дієслова діалогу' : 'Глаголы диалога')}
        </Text>
      </View>

      <View style={{ flex:1 }}>
        {tab === 'train'
          ? <WordTraining />
          : (
            <FlatList
              data={isWords ? dialog.words : dialog.verbs}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ padding:16 }}
              renderItem={({ item }) => {
                if (isWords) {
                  const w = item as any;
                  const count = learnedCounts[w.en] || 0;
                  return (
                    <TouchableOpacity
                      onPress={() => Speech.speak(w.en, { language:'en-US' })}
                      style={{ flexDirection:'row', alignItems:'center', padding:14, borderBottomWidth:0.5, borderBottomColor:t.border }}
                    >
                      <View style={{ width:22, height:22, borderRadius:11, borderWidth:1.5, borderColor:count>=REQUIRED?t.correct:t.border, backgroundColor:'transparent', justifyContent:'center', alignItems:'center', marginRight:14, overflow:'hidden' }}>
                        {count >= REQUIRED
                          ? <Ionicons name="checkmark" size={12} color={t.correct} />
                          : count > 0
                            ? <View style={{ position:'absolute', bottom:0, left:0, right:0, height:`${(count/REQUIRED)*100}%` as any, backgroundColor:t.correctBg }} />
                            : null}
                      </View>
                      <Text style={{ flex:1, color:t.textPrimary, fontSize:16 }}>{w.en}</Text>
                      <Text style={{ color:t.textMuted, fontSize:14 }}>{isUK ? w.uk : w.ru}</Text>
                    </TouchableOpacity>
                  );
                } else {
                  const v = item as any;
                  return (
                    <TouchableOpacity
                      onPress={() => Speech.speak(`${v[0]}, ${v[1]}, ${v[2]}`, { language:'en-US', rate:0.85 })}
                      style={{ flexDirection:'row', alignItems:'center', padding:14, borderBottomWidth:0.5, borderBottomColor:t.border, gap:8 }}
                    >
                      <Text style={{ color:t.textPrimary, fontSize:15, width:60 }}>{v[0]}</Text>
                      <Text style={{ color:t.textSecond, fontSize:14, width:60 }}>{v[1]}</Text>
                      <Text style={{ color:t.textSecond, fontSize:14, width:60 }}>{v[2]}</Text>
                      <Text style={{ color:t.textMuted, fontSize:13, flex:1 }}>{isUK ? v[4] : v[3]}</Text>
                    </TouchableOpacity>
                  );
                }
              }}
            />
          )
        }
      </View>

      <View style={{ flexDirection:'row', borderTopWidth:0.5, borderTopColor:t.border }}>
        {(['train','list'] as const).map(key => {
          const isActive = tab === key;
          const label = key === 'train'
            ? (isUK ? 'Тренування' : 'Тренировка')
            : (isUK ? 'Список' : 'Список');
          return (
            <TouchableOpacity key={key} style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:14, gap:8, borderTopWidth:isActive?2:0, borderTopColor:t.textSecond }}
              onPress={() => setTab(key)}>
              <Ionicons name={key==='train'?(isActive?'pencil':'pencil-outline'):(isActive?'list':'list-outline')} size={20} color={isActive?t.textSecond:t.textGhost} />
              <Text style={{ color:isActive?t.textSecond:t.textGhost, fontSize:14, fontWeight:'500' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
    </ScreenGradient>
  );
}
