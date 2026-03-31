import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import PremiumCard from '../components/PremiumCard';
import { LESSON_NAMES_RU, LESSON_NAMES_UK } from '../constants/lessons';
import { hapticTap } from '../hooks/use-haptics';
import { LESSONS_WITH_WORDS, WORD_COUNT_BY_LESSON } from './lesson_words';
import { LESSONS_WITH_IRREGULAR_VERBS, IRREGULAR_VERB_COUNT_BY_LESSON, IRREGULAR_VERBS_BY_LESSON } from './irregular_verbs_data';
import { GLOBAL_IRREGULAR_KEY } from './lesson_irregular_verbs';
import CircularProgress from '../components/CircularProgress';
import { getMedalTier, getNextMedalHint, loadMedalInfo, getEarnedDots } from './medal_utils';
import { Image } from 'react-native';
import { isLessonUnlocked, getLessonLockInfo, getLockMessageText } from './lesson_lock_system';

// Medal images
const MEDAL_IMAGES: Record<string, any> = {
  bronze:  require('../assets/images/levels/bronza.png'),
  silver:  require('../assets/images/levels/serebro.png'),
  gold:    require('../assets/images/levels/zoloto.png'),
  ruby:    require('../assets/images/levels/rubin.png'),
  emerald: require('../assets/images/levels/izumrud.png'),
  diamond: require('../assets/images/levels/almaz.png'),
};

export default function LessonMenu() {
  const router = useRouter();
  const { theme:t, f } = useTheme();
  const { s, lang } = useLang();
  const { id } = useLocalSearchParams<{id:string}>();
  const lessonId = parseInt(id||'1',10);

  const lessonNames = lang==='uk' ? LESSON_NAMES_UK : LESSON_NAMES_RU;
  const lessonName = lessonNames[lessonId-1] || `Урок ${lessonId}`;

  const [score,setScore] = useState(0);
  const [progress,setProgress] = useState(0);
  const [progressArr, setProgressArr] = useState<string[]>(new Array(50).fill('empty'));
  const [wordsLearned, setWordsLearned] = useState(0);
  const [irregularLearned, setIrregularLearned] = useState(0);
  const [passCount, setPassCount] = useState(0);
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

      const unlocked = await isLessonUnlocked(lessonId);
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
    });
    loadMedalInfo(lessonId).then(info => setPassCount(info.passCount));
    AsyncStorage.getItem(`lesson${lessonId}_words`).then(saved => {
      try {
        if (!saved) { setWordsLearned(0); return; }
        const counts: Record<string,number> = JSON.parse(saved);
        setWordsLearned(Object.values(counts).filter(c => c >= 3).length);
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
  }, [lessonId]);

  useEffect(() => {
    AsyncStorage.setItem('last_opened_lesson', String(lessonId));
    vocabAlertShown.current = false;
    setScore(0);
    setProgress(0);
    setProgressArr(new Array(50).fill('empty'));
    setWordsLearned(0);
    setIrregularLearned(0);
    setPassCount(0);

    loadLockState();
  }, [lessonId, loadLockState]);

  // Показать подсказку при первом нажатии «Начать урок»
  const handleStartLesson = useCallback(() => {
    if (!vocabAlertShown.current && LESSONS_WITH_WORDS.has(lessonId)) {
      vocabAlertShown.current = true;
      const hasTheory = true; // теория есть для всех уроков
      Alert.alert(
        lang === 'uk' ? '💡 Порада' : '💡 Совет',
        lang === 'uk'
          ? 'Якщо тема нова — спочатку перегляньте Слова уроку та розділ Теорія. Це допоможе краще засвоїти матеріал.'
          : 'Если тема для вас новая — рекомендуем сначала изучить Слова урока и раздел Теория. Это поможет лучше усвоить материал.',
        [
          {
            text: lang === 'uk' ? 'Слова уроку' : 'Слова урока',
            onPress: () => router.push({ pathname: '/lesson_words', params: { id: lessonId } }),
          },
          {
            text: lang === 'uk' ? 'Теорія' : 'Теория',
            onPress: () => router.push({ pathname: '/lesson_help', params: { id: lessonId } }),
          },
          {
            text: lang === 'uk' ? 'Почати урок' : 'Начать урок',
            style: 'cancel',
            onPress: () => router.push({ pathname: '/lesson1', params: { id: lessonId } }),
          },
        ]
      );
    } else {
      router.push({ pathname: '/lesson1', params: { id: lessonId } });
    }
  }, [lessonId, lang]);

  const handleLockedLessonPress = useCallback(() => {
    hapticTap();
    setShowLockModal(true);
  }, []);

  useFocusEffect(loadProgress);
  useFocusEffect(loadLockState);

  const isStarted = progress > 0;

  type IconName = React.ComponentProps<typeof Ionicons>['name'];
  const menuItems: {label:string; sub:string; icon:IconName; pct?:number; onPress:()=>void; disabled?: boolean}[] = [
    {
      label: isStarted ? s.lessonMenu.continue : s.lessonMenu.start,
      sub: isStarted
        ? `${progress} / 50  ★ ${score.toFixed(1)}`
        : lang==='uk' ? 'Починаємо з нуля' : 'Начинаем с нуля',
      icon: isLessonLocked ? 'lock-closed' : (isStarted ? 'play-circle-outline' : 'rocket-outline'),
      pct: Math.round(progress / 50 * 100),
      onPress: isLessonLocked ? handleLockedLessonPress : (isStarted
        ? () => router.push({ pathname: '/lesson1', params: { id: lessonId } })
        : handleStartLesson),
      disabled: isLessonLocked,
    },
    {
      label: s.lessonMenu.vocab,
      sub: LESSONS_WITH_WORDS.has(lessonId)
        ? (() => {
            const total = WORD_COUNT_BY_LESSON[lessonId] ?? 0;
            if (total > 0) {
              return lang==='uk'
                ? `${wordsLearned}/${total} слів`
                : `${wordsLearned}/${total} слов`;
            }
            return lang==='uk' ? 'Слова цього уроку' : 'Слова этого урока';
          })()
        : (lang==='uk' ? 'Скоро буде доступно' : 'Скоро будет доступно'),
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
          Alert.alert(
            lang==='uk' ? 'Скоро' : 'Скоро',
            lang==='uk' ? 'Словник для цього уроку ще готується' : 'Словарь для этого урока ещё готовится'
          );
        }
      },
    },
    ...(LESSONS_WITH_IRREGULAR_VERBS.has(lessonId) ? [{
      label: lang==='uk' ? 'Неправильні дієслова' : 'Неправильные глаголы',
      sub: (() => {
        const total = IRREGULAR_VERB_COUNT_BY_LESSON[lessonId] ?? 0;
        return total > 0
          ? (lang==='uk'
              ? `${irregularLearned}/${total} дієслів`
              : `${irregularLearned}/${total} глаголов`)
          : (lang==='uk' ? 'Неправильні дієслова уроку' : 'Неправильные глаголы урока');
      })(),
      icon: 'flash-outline' as const,
      pct: (() => {
        const total = IRREGULAR_VERB_COUNT_BY_LESSON[lessonId] ?? 0;
        return total > 0 ? Math.round(irregularLearned / total * 100) : undefined;
      })(),
      onPress: () => { hapticTap(); router.push({ pathname: '/lesson_irregular_verbs', params: { id: lessonId } }); },
    }] : []),
    {
      label: s.lessonMenu.theory,
      sub: lang==='uk' ? 'Граматика та правила' : 'Грамматика и правила',
      icon: 'book-outline',
      pct: undefined,
      onPress: () => { vocabAlertShown.current = true; router.push({pathname:'/lesson_help',params:{id:lessonId}}); },
    },
  ];

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
          {lang==='uk' ? 'УРОК' : 'УРОК'} {lessonId}{'  '}<Text style={{fontSize: f.label,fontWeight:'700',color:lessonId<=8?'#4CAF72':lessonId<=18?'#40B4E8':lessonId<=28?'#D4A017':'#DC6428'}}>{lessonId<=8?'A1':lessonId<=18?'A2':lessonId<=28?'B1':'B2'}</Text>
        </Text>
        <PremiumCard level={1} onPress={()=>{ hapticTap(); router.push('/settings_edu'); }}
          style={{width:38,height:38,borderRadius:19}}
          innerStyle={{width:38,height:38,borderRadius:19,justifyContent:'center',alignItems:'center'}}
        >
          <Ionicons name="settings-outline" size={20} color={t.textSecond}/>
        </PremiumCard>
      </View>

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
              <View style={{flexDirection:'row', justifyContent:'center', gap, alignItems:'center'}}>
                {earnedDots.map((dot, i) => (
                  <View key={i} style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 4,
                  }}>
                    <Image
                      source={MEDAL_IMAGES[dot]}
                      style={{width: medalSize, height: medalSize}}
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
                const hint = getNextMedalHint(score, lang as 'ru'|'uk');
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
        {menuItems.map((item,i)=>(
          <PremiumCard key={i} level={2} onPress={() => { !item.disabled && (hapticTap(), item.onPress()); }}
            innerStyle={{padding:18, flexDirection:'row', alignItems:'center', gap:14, opacity: item.disabled ? 0.5 : 1}}
          >
            {item.pct !== undefined ? (
              <CircularProgress
                pct={item.pct}
                size={44}
                sw={4}
                color={t.accent}
                bg={t.bgSurface}
                textColor={t.textPrimary}
                fontSize={9}
              />
            ) : (
              <View style={{
                width:44,height:44,borderRadius:22,
                backgroundColor: item.disabled ? t.bgMuted : t.bgSurface,
                borderTopWidth:0.5, borderLeftWidth:0.5,
                borderRightWidth:0.5, borderBottomWidth:0.5,
                borderTopColor:t.borderHighlight, borderLeftColor:t.borderHighlight,
                borderRightColor:t.border, borderBottomColor:t.border,
                justifyContent:'center', alignItems:'center',
              }}>
                <Ionicons name={item.icon} size={22} color={item.disabled ? t.textGhost : t.textSecond}/>
              </View>
            )}
            <View style={{flex:1}}>
              <Text style={{color:t.textPrimary,fontSize: f.bodyLg,fontWeight:'600'}}>{item.label}</Text>
              <Text style={{color:t.textMuted,fontSize: f.sub,marginTop:3}}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={item.disabled ? t.textGhost : t.textGhost}/>
          </PremiumCard>
        ))}
      </View>

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
                  {lang==='uk' ? 'Урок заблокований' : 'Урок заблокирован'}
                </Text>
                <Text style={{color:t.textMuted, fontSize:f.body, textAlign:'center', marginBottom:28, lineHeight:22}}>
                  {lockInfo ? getLockMessageText(lessonId, lang as 'ru'|'uk') : ''}
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
                  <Text style={{color:'#fff', fontSize:f.body, fontWeight:'700'}}>
                    {lang==='uk' ? 'Розумію' : 'Понимаю'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}

