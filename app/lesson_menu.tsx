import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import EnergyBar from '../components/EnergyBar';
import PremiumCard from '../components/PremiumCard';
import { lessonNamesForLang } from '../constants/lessons';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { LESSONS_WITH_WORDS, WORD_COUNT_BY_LESSON, WORD_KEYS_BY_LESSON } from './lesson_words';
import { LESSONS_WITH_IRREGULAR_VERBS, IRREGULAR_VERB_COUNT_BY_LESSON, IRREGULAR_VERBS_BY_LESSON } from './irregular_verbs_data';
import { GLOBAL_IRREGULAR_KEY } from './lesson_irregular_verbs';
import { getLessonPrepositionPack, hasLessonPrepositionDrill } from './lesson_prepositions';
import CircularProgress from '../components/CircularProgress';
import { getMedalTier, getNextMedalHint, loadMedalInfo, getEarnedDots } from './medal_utils';
import { Image } from 'react-native';
import { isLessonUnlocked, getLessonLockInfo, getLockMessageText } from './lesson_lock_system';
import { perfScreenMount } from './perf-monitor';
import ThemedChoiceModal from '../components/ThemedChoiceModal';

// Medal images
const MEDAL_IMAGES: Record<string, any> = {
  bronze:  require('../assets/images/levels/bronza.png'),
  silver:  require('../assets/images/levels/serebro.png'),
  gold:    require('../assets/images/levels/zoloto.png'),
  ruby:    require('../assets/images/levels/rubin.png'),
  emerald: require('../assets/images/levels/izumrud.png'),
  diamond: require('../assets/images/levels/almaz.png'),
};

type LessonMenuCache = {
  score: number;
  progress: number;
  progressArr: string[];
  wordsLearned: number;
  irregularLearned: number;
  prepositionAnswered: number;
  prepositionTotal: number;
  passCount: number;
};

const lessonMenuCacheById: Record<number, LessonMenuCache> = {};

const emptyProgress = () => new Array(50).fill('empty');

function parseProgress(progressRaw: string | null): Pick<LessonMenuCache, 'score' | 'progress' | 'progressArr'> {
  try {
    if (progressRaw) {
      const progressArr: string[] = JSON.parse(progressRaw);
      const correct = progressArr.filter(x => x === 'correct' || x === 'replay_correct').length;
      return {
        score: correct / 50 * 5,
        progress: correct,
        progressArr: progressArr.length === 50 ? progressArr : emptyProgress(),
      };
    }
  } catch { /* keep defaults */ }
  return { score: 0, progress: 0, progressArr: emptyProgress() };
}

function parseWordsLearned(lessonId: number, wordsRaw: string | null): number {
  try {
    if (!wordsRaw) return 0;
    const counts: Record<string, number> = JSON.parse(wordsRaw);
    const validKeys = WORD_KEYS_BY_LESSON[lessonId];
    return validKeys
      ? Object.entries(counts).filter(([k, c]) => c >= 3 && validKeys.has(k)).length
      : Object.values(counts).filter(c => c >= 3).length;
  } catch {
    return 0;
  }
}

function parseIrregularLearned(lessonId: number, irregularRaw: string | null): number {
  if (!LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)) return 0;
  try {
    const counts: Record<string, number> = irregularRaw ? JSON.parse(irregularRaw) : {};
    const lessonVerbs = IRREGULAR_VERBS_BY_LESSON[lessonId] ?? [];
    return lessonVerbs.filter(v => (counts[v.base] ?? 0) >= 3).length;
  } catch {
    return 0;
  }
}

function parsePrepositionAnswered(lessonId: number, raw: string | null): { answered: number; total: number } {
  const pack = getLessonPrepositionPack(lessonId);
  const total = pack?.items.length ?? 0;
  if (!pack || total === 0) return { answered: 0, total: 0 };
  try {
    const saved = raw ? JSON.parse(raw) : null;
    const validIds = new Set(pack.items.map(item => item.id));
    const answeredIds: string[] = Array.isArray(saved?.answeredIds) ? saved.answeredIds : [];
    const answered = answeredIds.filter(id => validIds.has(id)).length;
    return { answered: Math.min(answered, total), total };
  } catch {
    return { answered: 0, total };
  }
}

export async function prefetchLessonMenuCache(lessonId: number): Promise<void> {
  const id = Math.max(1, Math.floor(lessonId || 1));
  try {
    const [entries, medalInfo] = await Promise.all([
      AsyncStorage.multiGet([
        `lesson${id}_progress`,
        `lesson${id}_words`,
        GLOBAL_IRREGULAR_KEY,
        `lesson${id}_preposition_progress`,
      ]),
      loadMedalInfo(id),
    ]);
    const map = Object.fromEntries(entries) as Record<string, string | null>;
    const prep = parsePrepositionAnswered(id, map[`lesson${id}_preposition_progress`] ?? null);
    lessonMenuCacheById[id] = {
      ...parseProgress(map[`lesson${id}_progress`] ?? null),
      wordsLearned: parseWordsLearned(id, map[`lesson${id}_words`] ?? null),
      irregularLearned: parseIrregularLearned(id, map[GLOBAL_IRREGULAR_KEY] ?? null),
      prepositionAnswered: prep.answered,
      prepositionTotal: prep.total,
      passCount: medalInfo.passCount,
    };
  } catch { /* prefetch should never block navigation */ }
}

export default function LessonMenu() {
  useEffect(() => { perfScreenMount('lesson_menu'); }, []);
  const router = useRouter();
  const { theme:t, f, themeMode } = useTheme();
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';
  const { s, lang } = useLang();
  const { id } = useLocalSearchParams<{id:string}>();
  const lessonId = parseInt(id || '1', 10) || 1;

  const lessonNames = lessonNamesForLang(lang);
  const fallbackLessonTitle = triLang(lang, {
    ru: `Урок ${lessonId}`,
    uk: `Урок ${lessonId}`,
    es: `Lección ${lessonId}`,
  });
  const lessonName = lessonNames[lessonId - 1] || fallbackLessonTitle;
  const cachedMenu = lessonMenuCacheById[lessonId];

  const [score,setScore] = useState(cachedMenu?.score ?? 0);
  const [progress,setProgress] = useState(cachedMenu?.progress ?? 0);
  const [progressArr, setProgressArr] = useState<string[]>(cachedMenu?.progressArr ?? emptyProgress());
  const [wordsLearned, setWordsLearned] = useState(cachedMenu?.wordsLearned ?? 0);
  const [irregularLearned, setIrregularLearned] = useState(cachedMenu?.irregularLearned ?? 0);
  const [prepositionAnswered, setPrepositionAnswered] = useState(cachedMenu?.prepositionAnswered ?? 0);
  const [prepositionTotal, setPrepositionTotal] = useState(cachedMenu?.prepositionTotal ?? 0);
  const [passCount, setPassCount] = useState(cachedMenu?.passCount ?? 0);
  const [dataLoaded, setDataLoaded] = useState(Boolean(cachedMenu));
  const [vocabTipOpen, setVocabTipOpen] = useState(false);
  const [soonOpen, setSoonOpen] = useState<null | 'vocab' | 'verbs' | 'prepositions'>(null);
  const vocabAlertShown = useRef(false);

  // Состояние блокировки урока
  const [isLessonLocked, setIsLessonLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState<Awaited<ReturnType<typeof getLessonLockInfo>> | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  const loadLockState = useCallback(() => {
    // Проверить, заблокирован ли урок (с учётом тестерской функции "Без ограничений")
    (async () => {
      const noLimits = await AsyncStorage.getItem('tester_no_limits');
      if (noLimits === 'true') {
        setIsLessonLocked(false);
        return;
      }

      let unlocked = await isLessonUnlocked(lessonId);
      const placementLevelRaw = await AsyncStorage.getItem('placement_level');
      const placementLevel = String(placementLevelRaw || 'A1').toUpperCase();
      const placementPreunlock = placementLevel === 'B2' ? 28 : placementLevel === 'B1' ? 18 : placementLevel === 'A2' ? 8 : 0;
      // Placement test pre-unlock must match lessons list behavior.
      if (!unlocked && lessonId <= placementPreunlock) {
        unlocked = true;
      }

      // Fallback: если урок не в persisted unlock list, проверяем предыдущий урок
      // через best_score или динамически через прогресс (как в index.tsx)
      if (!unlocked && lessonId > 1) {
        const prevId = lessonId - 1;
        const prevBestRaw = await AsyncStorage.getItem(`lesson${prevId}_best_score`);
        let prevScore = parseFloat(prevBestRaw ?? '0') || 0;

        // Если best_score ещё не записан — считаем из прогресса (урок в процессе)
        if (prevScore === 0) {
          const savedProg = await AsyncStorage.getItem(`lesson${prevId}_progress`);
          if (savedProg) {
            const p: string[] = JSON.parse(savedProg);
            if (p.length > 0) {
              const correct = p.filter((x: string) => x === 'correct' || x === 'replay_correct').length;
              prevScore = (correct / p.length) * 5;
            }
          }
        }

        if (prevScore >= 2.5) {
          const { unlockLesson } = await import('./lesson_lock_system');
          await unlockLesson(lessonId);
          unlocked = true;
        }
      }

      setIsLessonLocked(!unlocked);
      if (!unlocked) {
        const info = await getLessonLockInfo(lessonId);
        setLockInfo(info);
      }
    })();
  }, [lessonId]);

  const loadProgress = useCallback(() => {
    AsyncStorage.getItem(`lesson${lessonId}_progress`).then(saved => {
      try {
        if (saved) {
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          setScore(correct / 50 * 5);
          setProgress(correct);
          setProgressArr(p.length === 50 ? p : new Array(50).fill('empty'));
        } else {
          setScore(0); setProgress(0);
          setProgressArr(new Array(50).fill('empty'));
        }
      } catch { setScore(0); setProgress(0); setProgressArr(new Array(50).fill('empty')); }
      setDataLoaded(true);
    });
    loadMedalInfo(lessonId).then(info => setPassCount(info.passCount));
    AsyncStorage.getItem(`lesson${lessonId}_words`).then(saved => {
      try {
        if (!saved) { setWordsLearned(0); return; }
        let counts: Record<string,number> = JSON.parse(saved);
        // Миграция урока 1: местоимения → auto-learned для старых юзеров
        if (lessonId === 1 && Object.values(counts).some(c => c >= 3)) {
          const pronouns = ['I', 'you', 'he', 'she', 'we', 'it'];
          let migrated = false;
          for (const p of pronouns) {
            if (!counts[p] || counts[p] < 3) { counts = { ...counts, [p]: 3 }; migrated = true; }
          }
          if (migrated) AsyncStorage.setItem('lesson1_words', JSON.stringify(counts));
        }
        const validKeys = WORD_KEYS_BY_LESSON[lessonId];
        const learned = validKeys
          ? Object.entries(counts).filter(([k, c]) => c >= 3 && validKeys.has(k)).length
          : Object.values(counts).filter(c => c >= 3).length;
        setWordsLearned(learned);
      } catch { setWordsLearned(0); }
    });
    if (LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)) {
      AsyncStorage.getItem(GLOBAL_IRREGULAR_KEY).then(saved => {
        try {
          const counts: Record<string,number> = saved ? JSON.parse(saved) : {};
          const lessonVerbs = IRREGULAR_VERBS_BY_LESSON[lessonId] ?? [];
          setIrregularLearned(lessonVerbs.filter(v => (counts[v.base] ?? 0) >= 3).length);
        } catch { setIrregularLearned(0); }
      });
    }
    AsyncStorage.getItem(`lesson${lessonId}_preposition_progress`).then(saved => {
      const prep = parsePrepositionAnswered(lessonId, saved);
      setPrepositionAnswered(prep.answered);
      setPrepositionTotal(prep.total);
    }).catch(() => {
      const prep = parsePrepositionAnswered(lessonId, null);
      setPrepositionAnswered(prep.answered);
      setPrepositionTotal(prep.total);
    });
  }, [lessonId]);

  useEffect(() => {
    void AsyncStorage.setItem('last_opened_lesson', String(lessonId));
    vocabAlertShown.current = false;
    loadLockState();
    // Не сбрасываем dataLoaded вслепую: это ломало мгновенный UI после prefetch и
    // оставляло пустые кольца до первого getItem(progress). Если кэш уже есть — сразу гидратим.
    const warm = lessonMenuCacheById[lessonId];
    if (warm) {
      setScore(warm.score);
      setProgress(warm.progress);
      setProgressArr(warm.progressArr);
      setWordsLearned(warm.wordsLearned);
      setIrregularLearned(warm.irregularLearned);
      setPrepositionAnswered(warm.prepositionAnswered);
      setPrepositionTotal(warm.prepositionTotal);
      setPassCount(warm.passCount);
      setDataLoaded(true);
    } else {
      setDataLoaded(false);
    }
  }, [lessonId, loadLockState]);

  // Показать подсказку при первом нажатии «Начать урок»
  const handleStartLesson = useCallback(() => {
    if (!vocabAlertShown.current && LESSONS_WITH_WORDS.has(lessonId)) {
      vocabAlertShown.current = true;
      setVocabTipOpen(true);
    } else {
      router.replace({ pathname: '/lesson1', params: { id: lessonId, from: 'lesson_menu' } });
    }
  }, [lessonId, router]);

  const handleLockedLessonPress = useCallback(() => {
    hapticTap();
    setShowLockModal(true);
  }, []);

  useFocusEffect(loadProgress);
  useFocusEffect(loadLockState);

  const isStarted = progress > 0;

  type IconName = React.ComponentProps<typeof Ionicons>['name'];
  const menuItems: {label:string; sub:string; icon:IconName; pct?:number; onPress:()=>void; disabled?: boolean; unavailable?: boolean; hidden?: boolean}[] = [
    {
      label: isStarted ? s.lessonMenu.continue : s.lessonMenu.start,
      sub: isStarted
        ? `${progress} / 50  ★ ${score.toFixed(1)}`
        : s.lessonMenu.fromScratch,
      icon: isLessonLocked ? 'lock-closed' : (isStarted ? 'play-circle-outline' : 'rocket-outline'),
      pct: Math.round(progress / 50 * 100),
      onPress: isLessonLocked ? handleLockedLessonPress : (isStarted
        ? () => router.push({ pathname: '/lesson1', params: { id: lessonId, from: 'lesson_menu' } })
        : handleStartLesson),
      disabled: isLessonLocked,
    },
    {
      label: s.lessonMenu.vocab,
      sub: LESSONS_WITH_WORDS.has(lessonId)
        ? (() => {
            const total = WORD_COUNT_BY_LESSON[lessonId] ?? 0;
            if (total > 0) {
              return lang === 'uk'
                ? `${wordsLearned}/${total} слів`
                : lang === 'es'
                  ? `${wordsLearned}/${total} palabras`
                  : `${wordsLearned}/${total} слов`;
            }
            return lang === 'uk'
              ? 'Слова цього уроку'
              : lang === 'es'
                ? 'Palabras de esta lección'
                : 'Слова этого урока';
          })()
        : (lang === 'uk'
            ? 'Слова цього уроку'
            : lang === 'es'
              ? 'Palabras de esta lección'
              : 'Слова этого урока'),
      icon: 'book-outline',
      pct: (() => {
        if (!LESSONS_WITH_WORDS.has(lessonId)) return undefined;
        const total = WORD_COUNT_BY_LESSON[lessonId] ?? 0;
        return total > 0 ? Math.round(wordsLearned / total * 100) : undefined;
      })(),
      onPress: () => {
        if (LESSONS_WITH_WORDS.has(lessonId)) {
          vocabAlertShown.current = true;
          router.push({pathname:'/lesson_words',params:{id:lessonId}});
        } else {
          setSoonOpen('vocab');
        }
      },
    },
    {
      hidden: !LESSONS_WITH_IRREGULAR_VERBS.has(lessonId),
      label: s.lessonMenu.verbs,
      sub: LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)
        ? (() => {
            const total = IRREGULAR_VERB_COUNT_BY_LESSON[lessonId] ?? 0;
            return total > 0
              ? (lang === 'uk'
                  ? `${irregularLearned}/${total} дієслів`
                  : lang === 'es'
                    ? `${irregularLearned}/${total} verbos`
                    : `${irregularLearned}/${total} глаголов`)
              : (lang === 'uk'
                  ? 'Неправильні дієслова уроку'
                  : lang === 'es'
                    ? 'Formas verbales irregulares de esta lección'
                    : 'Неправильные глаголы урока');
          })()
        : (lang === 'uk'
            ? 'Неправильні дієслова уроку'
            : lang === 'es'
              ? 'Formas verbales irregulares de esta lección'
              : 'Неправильные глаголы урока'),
      icon: 'flash-outline' as const,
      pct: (() => {
        if (!LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)) return undefined;
        const total = IRREGULAR_VERB_COUNT_BY_LESSON[lessonId] ?? 0;
        return total > 0 ? Math.round(irregularLearned / total * 100) : undefined;
      })(),
      onPress: () => {
        hapticTap();
        if (LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)) {
          router.push({ pathname: '/lesson_irregular_verbs', params: { id: lessonId } });
        } else {
          setSoonOpen('verbs');
        }
      },
    },
    {
      hidden: !hasLessonPrepositionDrill(lessonId),
      label: triLang(lang, {
        ru: 'Тренажёр предлогов',
        uk: 'Тренажер прийменників',
        es: 'Práctica de preposiciones',
      }),
      sub: prepositionTotal > 0
        ? (lang === 'uk'
            ? `${prepositionAnswered}/${prepositionTotal} завдань`
            : lang === 'es'
              ? `${prepositionAnswered}/${prepositionTotal} ejercicios`
              : `${prepositionAnswered}/${prepositionTotal} заданий`)
        : (lang === 'uk'
            ? 'Прийменники цього уроку'
            : lang === 'es'
              ? 'Preposiciones de esta lección'
              : 'Предлоги этого урока'),
      icon: 'funnel-outline' as const,
      pct: prepositionTotal > 0 ? Math.round(prepositionAnswered / prepositionTotal * 100) : undefined,
      onPress: () => {
        hapticTap();
        if (hasLessonPrepositionDrill(lessonId)) {
          router.push({ pathname: '/preposition_drill', params: { id: lessonId } });
        } else {
          setSoonOpen('prepositions');
        }
      },
    },
    {
      label: s.lessonMenu.theory,
      sub: triLang(lang, {
        ru: 'Правила и пояснения',
        uk: 'Правила та пояснення',
        es: 'Reglas y explicaciones',
      }),
      icon: 'book-outline' as const,
      onPress: () => { hapticTap(); router.push({ pathname: '/lesson_help', params: { id: lessonId } }); },
    },
  ];

  // Заглушка для заблокированного урока
  if (isLessonLocked) {
    const prevId = lessonId - 1;
    return (
      <ScreenGradient>
      <SafeAreaView style={{flex:1}}>
        <ContentWrap>
        {/* Хедер */}
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:0.5,borderBottomColor:t.border}}>
          <PremiumCard level={1} onPress={()=>{ hapticTap(); router.back(); }}
            style={{width:38,height:38,borderRadius:19}}
            innerStyle={{width:38,height:38,borderRadius:19,justifyContent:'center',alignItems:'center'}}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary}/>
          </PremiumCard>
          <Text style={{color:t.textPrimary,fontSize:f.body,fontWeight:'700',letterSpacing:0.5}}>
            {triLang(lang, { ru: 'УРОК', uk: 'УРОК', es: 'LECCIÓN' })} {lessonId}
          </Text>
          <View style={{width:38}}/>
        </View>

        {/* Заглушка */}
        <View style={{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:32}}>
          <View style={{
            width:90,height:90,borderRadius:45,
            backgroundColor:t.bgCard,
            borderWidth:1,borderColor:t.border,
            justifyContent:'center',alignItems:'center',
            marginBottom:24,
            shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.2,shadowRadius:8,elevation:6
          }}>
            <Ionicons name="lock-closed" size={40} color={t.textMuted}/>
          </View>
          <Text style={{color:t.textPrimary,fontSize:f.h2,fontWeight:'700',textAlign:'center',marginBottom:12}}>
            {triLang(lang, {
              ru: 'Урок заблокирован',
              uk: 'Урок заблоковано',
              es: 'Lección bloqueada',
            })}
          </Text>
          <Text style={{color:t.textMuted,fontSize:f.bodyLg,textAlign:'center',lineHeight:24,marginBottom:32}}>
            {triLang(lang, {
              ru: `Пройдите урок ${prevId} с оценкой 2.5 или больше, чтобы открыть этот урок`,
              uk: `Пройдіть урок ${prevId} з оцінкою 2.5 або більше, щоб відкрити цей урок`,
              es: `Completa la lección ${prevId} con nota mínima de 2,5 para desbloquear esta lección`,
            })}
          </Text>
          <PremiumCard level={2}
            onPress={() => {
              hapticTap();
              void (async () => {
                await prefetchLessonMenuCache(prevId);
                router.replace({ pathname: '/lesson_menu', params: { id: prevId } });
              })();
            }}
            innerStyle={{paddingHorizontal:28,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:10}}
          >
            <Ionicons name="arrow-back-outline" size={20} color={t.textPrimary}/>
            <Text style={{color:t.textPrimary,fontSize:f.bodyLg,fontWeight:'600'}}>
              {triLang(lang, {
                ru: `Перейти к уроку ${prevId}`,
                uk: `Перейти до уроку ${prevId}`,
                es: `Ir a la lección ${prevId}`,
              })}
            </Text>
          </PremiumCard>
        </View>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
    <SafeAreaView style={{flex:1}}>
      <ContentWrap>
      {/* Хедер */}
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <PremiumCard level={1} onPress={()=>{ hapticTap(); router.back(); }}
          style={{width:38,height:38,borderRadius:19}}
          innerStyle={{width:38,height:38,borderRadius:19,justifyContent:'center',alignItems:'center'}}
        >
          <Ionicons name="chevron-back" size={22} color={t.textPrimary}/>
        </PremiumCard>
        <Text style={{color:t.textPrimary,fontSize: f.body,fontWeight:'700',letterSpacing:0.5}}>
          {triLang(lang, { ru: 'УРОК', uk: 'УРОК', es: 'LECCIÓN' })} {lessonId}{'  '}<Text style={{fontSize: f.label,fontWeight:'700',color:
            lessonId<=8  ? (isLightTheme?'#15803D':'#4CAF72') :
            lessonId<=18 ? (isLightTheme?'#0369A1':'#40B4E8') :
            lessonId<=28 ? (isLightTheme?'#92400E':'#D4A017') :
                           (isLightTheme?'#9A3412':'#DC6428')
          }}>{lessonId<=8?'A1':lessonId<=18?'A2':lessonId<=28?'B1':'B2'}</Text>
        </Text>
        <EnergyBar size={20} />
        <PremiumCard level={1} onPress={()=>{ hapticTap(); router.push('/settings_edu'); }}
          style={{width:38,height:38,borderRadius:19,marginLeft:8}}
          innerStyle={{width:38,height:38,borderRadius:19,justifyContent:'center',alignItems:'center'}}
        >
          <Ionicons name="settings-outline" size={20} color={t.textSecond}/>
        </PremiumCard>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Тема урока */}
      <Text style={{color:t.textMuted,fontSize: f.bodyLg,textAlign:'center',marginTop:20,marginHorizontal:30,lineHeight:24}}>
        {lessonName}
      </Text>

      {/* Медали прогресса */}
      <View style={{alignItems:'center',marginTop:12,marginBottom:8}}>
        {(() => {
          const earnedDots = getEarnedDots(getMedalTier(score), passCount);
          const medalSize = 60;
          const gap = 8;
          return (
            <View style={{gap:8}}>
              <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'center', gap, alignItems:'center'}}>
                {earnedDots.map((dot, i) => (
                  <View key={i} style={{
                    width: medalSize,
                    height: medalSize,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 4,
                  }}>
                    <Image
                      source={MEDAL_IMAGES[dot]}
                      style={{ width: medalSize, height: medalSize }}
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </View>
              {progress > 0 && (
                <Text style={{color:t.textMuted,fontSize:f.caption,textAlign:'center'}}>
                  {progress}/50  ★ {score.toFixed(1)}
                </Text>
              )}
              {(() => {
                const hint = getNextMedalHint(score, lang);
                return hint ? (
                  <Text style={{color:t.textSecond,fontSize:f.sub,opacity:0.85,textAlign:'center'}}>
                    {hint}
                  </Text>
                ) : null;
              })()}
            </View>
          );
        })()}
      </View>

      {/* Меню */}
      <View style={{paddingHorizontal:16,gap:10}}>
        {menuItems.filter(item => !item.hidden).map((item,i)=>(
          <PremiumCard key={i} level={2} onPress={() => {
            if (item.disabled) return;
            hapticTap();
            item.onPress();
          }}
            innerStyle={{padding:18, flexDirection:'row', alignItems:'center', gap:14, opacity: (item.disabled || item.unavailable) ? 0.5 : 1}}
          >
            {item.pct !== undefined && dataLoaded ? (
              <CircularProgress
                pct={item.pct}
                size={44}
                sw={4}
                color={t.accent}
                bg={t.bgSurface}
                textColor={t.textPrimary}
                fontSize={9}
              />
            ) : item.pct !== undefined ? (
              <View style={{
                width:44,height:44,borderRadius:22,
                backgroundColor:t.bgSurface,
                borderWidth:0.5,borderColor:t.border,
              }}/>
            ) : (
              <View style={{
                width:44,height:44,borderRadius:22,
                backgroundColor: (item.disabled || item.unavailable) ? t.bgPrimary : t.bgSurface,
                borderTopWidth:0.5, borderLeftWidth:0.5,
                borderRightWidth:0.5, borderBottomWidth:0.5,
                borderTopColor:t.borderHighlight, borderLeftColor:t.borderHighlight,
                borderRightColor:t.border, borderBottomColor:t.border,
                justifyContent:'center', alignItems:'center',
              }}>
                <Ionicons name={item.icon} size={22} color={(item.disabled || item.unavailable) ? t.textGhost : t.textSecond}/>
              </View>
            )}
            <View style={{flex:1}}>
              <Text style={{color:(item.disabled || item.unavailable) ? t.textGhost : t.textPrimary,fontSize: f.bodyLg,fontWeight:'600'}}>{item.label}</Text>
              <Text style={{color:t.textMuted,fontSize: f.sub,marginTop:3}}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={item.disabled ? t.textGhost : t.textGhost}/>
          </PremiumCard>
        ))}
      </View>

      </ScrollView>
      {/* Модальное окно блокировки */}
      <Modal transparent animationType="fade" visible={showLockModal} onRequestClose={() => setShowLockModal(false)}>
        <Pressable style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)'}} onPress={() => setShowLockModal(false)}>
          <View style={{flex:1, justifyContent:'flex-end'}}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{
                backgroundColor:t.bgCard,
                borderTopLeftRadius:24, borderTopRightRadius:24,
                padding:28, paddingBottom:40,
                borderTopWidth:0.5, borderColor:t.border,
                alignItems:'center'
              }}>
                <Text style={{fontSize:56, marginBottom:16}}>🔐</Text>
                <Text style={{color:t.textPrimary, fontSize:f.h2, fontWeight:'700', textAlign:'center', marginBottom:12}}>
                  {triLang(lang, {
                    ru: 'Урок заблокирован',
                    uk: 'Урок заблоковано',
                    es: 'Lección bloqueada',
                  })}
                </Text>
                <Text style={{color:t.textMuted, fontSize:f.body, textAlign:'center', marginBottom:28, lineHeight:22}}>
                  {lockInfo ? getLockMessageText(lockInfo, lang) : ''}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor:t.accent,
                    borderRadius:14, padding:16, width:'100%', alignItems:'center'
                  }}
                  onPress={() => {
                    hapticTap();
                    setShowLockModal(false);
                  }}
                >
                  <Text style={{color:t.correctText, fontSize:f.body, fontWeight:'700'}}>
                    {triLang(lang, { ru: 'Понимаю', uk: 'Розумію', es: 'Entendido' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <ThemedChoiceModal
        visible={vocabTipOpen}
        title={triLang(lang, { ru: '💡 Совет', uk: '💡 Порада', es: '💡 Consejo' })}
        message={
          lang === 'uk'
            ? 'Якщо тема нова — спочатку перегляньте Слова уроку та розділ Теорія. Це допоможе краще засвоїти матеріал.'
            : lang === 'es'
              ? 'Si el tema es nuevo para ti, repasa primero el vocabulario y la teoría: asimilarás mejor.'
              : 'Если тема для вас новая — рекомендуем сначала изучить Слова урока и раздел Теория. Это поможет лучше усвоить материал.'
        }
        choices={[
          {
            label: s.lessonMenu.wordsOfLesson,
            variant: 'secondary',
            onPress: () => router.push({ pathname: '/lesson_words', params: { id: lessonId } }),
          },
          {
            label: s.lessonMenu.start,
            onPress: () => router.replace({ pathname: '/lesson1', params: { id: lessonId, from: 'lesson_menu' } }),
          },
        ]}
        onRequestClose={() => setVocabTipOpen(false)}
      />
      <ThemedChoiceModal
        visible={soonOpen !== null}
        title={triLang(lang, { ru: 'Скоро', uk: 'Скоро', es: 'Próximamente' })}
        message={
          soonOpen === 'vocab'
            ? triLang(lang, {
                ru: 'Словарь для этого урока ещё готовится',
                uk: 'Словник для цього уроку ще готується',
                es: 'El vocabulario de esta lección aún está en preparación.',
              })
            : soonOpen === 'verbs'
              ? triLang(lang, {
                  ru: 'Материал для этого урока ещё готовится',
                  uk: 'Матеріал для цього уроку ще готується',
                  es: 'El material de esta lección aún está en preparación.',
                })
              : soonOpen === 'prepositions'
                ? triLang(lang, {
                    ru: 'Тренажёр предлогов временно недоступен.',
                    uk: 'Тренажер прийменників тимчасово недоступний.',
                    es: 'La práctica de preposiciones no está disponible por ahora.',
                  })
              : ''
        }
        choices={[{ label: triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido' }), onPress: () => {} }]}
        onRequestClose={() => setSoonOpen(null)}
      />
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}

