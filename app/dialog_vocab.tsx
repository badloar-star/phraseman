// dialog_vocab.tsx — экран изучения слов/глаголов диалога
// Работает как lesson_words/lesson_verbs но для диалогов
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import ScreenGradient from '../components/ScreenGradient';
import { getDialogById, DIALOGS } from './dialogs_data';
import { loadSettings } from './settings_edu';
import { hapticError, hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { triLang, type Lang } from '../constants/i18n';

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

type W = { en: string; ru: string; uk: string; es?: string };

function wordTranslation(w: W, lang: Lang): string {
  if (lang === 'es') return w.es ?? w.ru;
  if (lang === 'uk') return w.uk;
  return w.ru;
}

/** Verb row: lesson-style array [..., ru, uk, es?] or { ru, uk, es? }. */
function verbRowGloss(row: unknown, lang: Lang): string {
  if (Array.isArray(row)) {
    if (lang === 'es') return String(row[5] ?? row[3] ?? '');
    if (lang === 'uk') return String(row[4] ?? row[3] ?? '');
    return String(row[3] ?? '');
  }
  if (row && typeof row === 'object' && 'ru' in row) {
    const o = row as { ru: string; uk: string; es?: string };
    if (lang === 'es') return o.es ?? o.ru;
    if (lang === 'uk') return o.uk;
    return o.ru;
  }
  return '';
}

function DialogWordTraining({
  words, storageKey, learnedSync, lang, hapticsOn, speechRate, onNoEnergy,
}: {
  words: W[];
  storageKey: string;
  learnedSync: (c: Record<string, number>) => void;
  lang: Lang;
  hapticsOn: boolean;
  speechRate: number;
  onNoEnergy: () => void;
}) {
  const showRef = useRef(onNoEnergy);
  useEffect(() => { showRef.current = onNoEnergy; }, [onNoEnergy]);
  const { theme: t } = useTheme();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { energy, isUnlimited: energyUnlimited, spendOne } = useEnergy();
  const currentEnergyRef = useRef(energy);
  const unlimitedRef = useRef(energyUnlimited);
  const spendRef = useRef(spendOne);
  useEffect(() => { currentEnergyRef.current = energy; }, [energy]);
  useEffect(() => { unlimitedRef.current = energyUnlimited; }, [energyUnlimited]);
  useEffect(() => { spendRef.current = spendOne; }, [spendOne]);

  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [boot, setBoot] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem(storageKey + '_progress').then(v => {
      if (v) setCounts(JSON.parse(v));
      setBoot(false);
    });
  }, [storageKey]);

  if (words.length === 0) return null;
  if (boot) return null;

  const current = words[idx % words.length];
  const makeOptions = (correct: string): string[] => {
    const lessonOthers = words.filter(w => w.en !== correct).map(w => w.en);
    const crossOthers = lessonOthers.length >= 5 ? [] :
      fy(ALL_DIALOG_WORDS.filter(w => w !== correct && !lessonOthers.includes(w)));
    const decoys = [...lessonOthers, ...crossOthers].slice(0, 5);
    return fy([...decoys, correct]);
  };
  const options = makeOptions(current.en);
  const question = wordTranslation(current, lang);
  const learnedCount = Object.values(counts).filter(c => c >= REQUIRED).length;

  const handleChoice = async (opt: string) => {
    if (chosen !== null) return;
    if (!unlimitedRef.current && currentEnergyRef.current <= 0) {
      showRef.current();
      return;
    }
    setChosen(opt);
    const isRight = opt === current.en;
    const newCount = isRight ? (counts[current.en] || 0) + 1 : 0;
    const newCounts = { ...counts, [current.en]: newCount };
    setCounts(newCounts);
    const saved = await AsyncStorage.getItem(storageKey + '_progress');
    const existing = saved ? JSON.parse(saved) : {};
    existing[current.en] = newCount;
    await AsyncStorage.setItem(storageKey + '_progress', JSON.stringify(existing));
    learnedSync(existing);
    if (isRight) {
      void hapticTap();
    } else {
      if (hapticsOn) void hapticError();
      if (!unlimitedRef.current) {
        const before = currentEnergyRef.current;
        spendRef.current().then(ok => {
          if (ok && before === 1) setTimeout(() => { showRef.current(); }, 800);
        }).catch(() => {});
      }
    }
    setTimeout(() => { speakAudio(current.en, speechRate); }, 140);
    setTimeout(() => { setChosen(null); setIdx(i => i + 1); }, 900);
  };

  return (
    <View style={{ flex:1, padding:20, alignItems:'center' }}>
      <View style={{ flexDirection:'row', gap:10, marginBottom:24 }}>
        {[0,1,2].map(i => (
          <View key={i} style={{ width:20, height:20, borderRadius:10, borderWidth:2, borderColor:t.textSecond, backgroundColor:(counts[current.en]||0)>i?t.textSecond:'transparent' }} />
        ))}
      </View>
      <Text style={{ color:t.textPrimary, fontSize:32, fontWeight:'300', marginBottom:32, textAlign:'center' }}>{question}</Text>
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
      <View style={{ width:'100%', height:4, backgroundColor:t.border, borderRadius:2, marginTop:24 }}>
        <View style={{ height:'100%', width:`${(learnedCount/words.length)*100}%` as any, backgroundColor:t.correct, borderRadius:2 }} />
      </View>
      <Text style={{ color:t.textMuted, fontSize:12, marginTop:6 }}>
        {learnedCount} / {words.length}{' '}
        {triLang(lang, { ru: 'выучено', uk: 'вивчено', es: 'aprendidas' })}
      </Text>
    </View>
  );
}

export default function DialogVocabScreen() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const { id, type } = useLocalSearchParams<{ id: string; type: 'words' | 'verbs' }>();
  const { energy, isUnlimited: energyUnlimited } = useEnergy();
  
  const dialog = getDialogById(id || '');
  const [tab, setTab] = useState<'train'|'list'>('train');
  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);
  const [learnedCounts, setLearnedCounts] = useState<Record<string,number>>({});
  const [hapticsOn, setHapticsOn] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.9);
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  const storageKey = `dialog_${id}_${type}`;
  const isWords = type === 'words';
  const items = isWords ? (dialog?.words || []) : (dialog?.verbs || []);

  useEffect(() => {
    loadSettings().then(s => { setHapticsOn(s.haptics); setSpeechRate(s.speechRate ?? 0.9); });
  }, []);

  useEffect(() => {
    if (!energyUnlimited && energy <= 0) setTab('list');
  }, [energyUnlimited, energy]);
  useEffect(() => {
    if (energyUnlimited || energy > 0) setNoEnergyModalOpen(false);
  }, [energyUnlimited, energy]);

  useEffect(() => {
    AsyncStorage.getItem(storageKey + '_progress').then(v => {
      if (v) setLearnedCounts(JSON.parse(v));
    });
  }, [storageKey]);

  if (!dialog) return null;
  if (items.length === 0) return null;

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
            ? triLang(lang, { ru: 'Слова диалога', uk: 'Слова діалогу', es: 'Palabras del diálogo' })
            : triLang(lang, { ru: 'Глаголы диалога', uk: 'Дієслова діалогу', es: 'Verbos del diálogo' })}
        </Text>
      </View>

      <View style={{ flex:1 }}>
        {tab === 'train'
          ? (isWords && (dialog.words || []).length > 0
            ? (
              <DialogWordTraining
                words={dialog.words || []}
                storageKey={storageKey}
                learnedSync={c => { setLearnedCounts(c); }}
                lang={lang}
                hapticsOn={hapticsOn}
                speechRate={speechRate}
                onNoEnergy={() => setNoEnergyModalOpen(true)}
              />
            )
            : (
              <View style={{ flex:1, justifyContent:'center', alignItems:'center', padding:24 }}>
                <Text style={{ color:t.textMuted, fontSize:15, textAlign:'center' }}>
                  {triLang(lang, {
                    ru: 'Режим тренировки для глаголов пока не подключён — откройте список.',
                    uk: 'Список у режимі тренування для глаголов ще не підключений.',
                    es: 'El modo práctica para verbos del diálogo aún no está disponible — abre la pestaña Lista.',
                  })}
                </Text>
              </View>
            ))
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
                    <View style={{ borderBottomWidth: 0.5, borderBottomColor: t.border }}>
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        showsHorizontalScrollIndicator
                        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }}
                      >
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: count >= REQUIRED ? t.correct : t.border, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 14, overflow: 'hidden', flexShrink: 0 }}>
                          {count >= REQUIRED
                            ? <Ionicons name="checkmark" size={12} color={t.correct} />
                            : count > 0
                              ? <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(count / REQUIRED) * 100}%` as any, backgroundColor: t.correctBg }} />
                              : null}
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            void hapticTap();
                            speakAudio(w.en, speechRate);
                          }}
                          style={{ flexShrink: 0, marginRight: 14 }}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: t.textPrimary, fontSize: 16 }}>{w.en}</Text>
                        </TouchableOpacity>
                        <Text style={{ flexShrink: 0, color: t.textMuted, fontSize: 14 }}>{wordTranslation(w as W, lang)}</Text>
                      </ScrollView>
                    </View>
                  );
                } else {
                  const v = item as any;
                  return (
                    <View style={{ borderBottomWidth: 0.5, borderBottomColor: t.border }}>
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        showsHorizontalScrollIndicator
                        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 }}
                      >
                        <TouchableOpacity
                          onPress={() => {
                            void hapticTap();
                            speakAudio(`${v[0]}, ${v[1]}, ${v[2]}`, speechRate);
                          }}
                          style={{ flexShrink: 0 }}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: t.textPrimary, fontSize: 15 }}>{v[0]}</Text>
                        </TouchableOpacity>
                        <Text style={{ flexShrink: 0, color: t.textSecond, fontSize: 14 }}>{v[1]}</Text>
                        <Text style={{ flexShrink: 0, color: t.textSecond, fontSize: 14 }}>{v[2]}</Text>
                        <Text style={{ flexShrink: 0, color: t.textMuted, fontSize: 13 }}>{verbRowGloss(v, lang)}</Text>
                      </ScrollView>
                    </View>
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
            ? triLang(lang, { ru: 'Тренировка', uk: 'Тренування', es: 'Práctica' })
            : triLang(lang, { ru: 'Список', uk: 'Список', es: 'Lista' });
          return (
            <TouchableOpacity key={key} style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:14, gap:8, borderTopWidth:isActive?2:0, borderTopColor:t.textSecond }}
              onPress={() => {
                void hapticTap();
                if (key === 'train') {
                  if (!energyUnlimited && energy <= 0) {
                    setNoEnergyModalOpen(true);
                    return;
                  }
                }
                setTab(key);
              }}>
              <Ionicons name={key==='train'?(isActive?'pencil':'pencil-outline'):(isActive?'list':'list-outline')} size={20} color={isActive?t.textSecond:t.textGhost} />
              <Text style={{ color:isActive?t.textSecond:t.textGhost, fontSize:14, fontWeight:'500' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
    <NoEnergyModal visible={noEnergyModalOpen} onClose={() => setNoEnergyModalOpen(false)} />
    </ScreenGradient>
  );
}
