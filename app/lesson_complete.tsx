import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BonusXPCard from '../components/BonusXPCard';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { triLang, type Lang } from '../constants/i18n';
import { useTheme } from '../components/ThemeContext';
import { CEFR_FOR_LESSON } from '../constants/theme';
import { LESSON_NAMES_RU, LESSON_NAMES_UK, lessonNamesForLang } from '../constants/lessons';
import { hapticTap } from '../hooks/use-haptics';
import { checkAchievements } from './achievements';
import { STORE_URL } from './config';
import { checkGemAchievements, loadMedalInfo, saveMedalProgress, type MedalTier } from './medal_utils';
import { scheduleD1PersonalizedReminder } from './notifications';
import { tryUnlockLevelExam, tryUnlockLingmanExam } from './lesson_lock_system';
import { canShowReview, markReviewPrompted, markReviewRated, requestNativeReview, getReviewVariant, ReviewContext, ReviewVariant } from './review_utils';
import { recordLessonForRepair } from './streak_repair';
import { calculateRewardWithBonus } from './variable_reward_system';
import { registerXP } from './xp_manager';
import { addShards, SHARD_REWARDS, type ShardSource } from './shards_system';
import { formatLessonShardBatchReason } from './shard_earn_ui';
import { emitAppEvent } from './events';
import { primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { prefetchLessonMenuCache } from './lesson_menu';
import RegistrationPromptModal from '../components/RegistrationPromptModal';
import { AUTH_PROMPT_SHOWN_KEY, getLinkedAuthInfo } from './auth_provider';
import LessonShareCardSvg from '../components/share_cards/LessonShareCardSvg';
import CelebrationShareCardSvg from '../components/share_cards/CelebrationShareCardSvg';
import { getCelebrationVisual } from '../components/share_cards/celebrationCardCopy';
import { shareCardFromSvgRef } from '../components/share_cards/shareCardPng';
import type { ShareCardLang } from '../components/share_cards/streakCardCopy';
import { buildCelebrationShareBody } from './celebration_share_messages';
import { buildLessonShareMessage } from './lesson_share';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';

// Medal images for completion screen
const MEDAL_IMAGES_COMPLETE: Record<string, any> = {
  bronze:  require('../assets/images/levels/bronza.png'),
  silver:  require('../assets/images/levels/serebro.png'),
  gold:    require('../assets/images/levels/zoloto.png'),
};

const BONUS = 500;

// ── Двухшаговый модал оценки ─────────────────────────────────────────────────
function ReviewModal({ visible, context, t, f, bottomInset, lang, onClose }: {
  visible: boolean; context: ReviewContext; t: any; f: any; bottomInset: number; lang: Lang; onClose: () => void;
}) {
  const [step, setStep] = useState<'ask' | 'thanks'>('ask');
  const [variant, setVariant] = useState<ReviewVariant | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('ask');
      getReviewVariant(context, lang).then(setVariant);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [context, fadeAnim, visible]);

  const handleYes = async () => {
    await markReviewRated();
    setStep('thanks');
    await requestNativeReview();
    setTimeout(onClose, 1500);
  };

  const handleNo = async () => {
    await markReviewPrompted();
    onClose();
  };

  if (!visible || !variant) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleNo}>
      <Animated.View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end', opacity: fadeAnim,
      }}>
        <Pressable style={{ flex: 1 }} onPress={handleNo} />
        <View style={{
          backgroundColor: t.bgCard,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 28, paddingBottom: Math.max(40, bottomInset + 20),
          borderTopWidth: 0.5, borderColor: t.border,
          alignItems: 'center',
        }}>
          {step === 'ask' ? (
            <>
              <Text style={{ fontSize: 36, marginBottom: 14 }}>{variant.emoji}</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                {variant.title}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginBottom: 28, lineHeight: f.body * 1.5 }}>
                {variant.subtitle}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: t.border }}
                  onPress={handleNo}
                >
                  <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600' }}>
                    {variant.btnNo}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: t.correct, borderRadius: 14, padding: 16, alignItems: 'center' }}
                  onPress={handleYes}
                >
                  <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                    {variant.btnYes} ⭐
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🙏</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Спасибо!',
                  uk: 'Дякуємо!',
                  es: '¡Gracias!',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 8 }}>
                {triLang(lang, {
                  ru: 'Это значит для нас очень много.',
                  uk: 'Це для нас дуже багато значить.',
                  es: 'Para nosotros es muy importante.',
                })}
              </Text>
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Notification types ────────────────────────────────────────────────────────
type NotifKind = 'medal' | 'lesson_unlock' | 'level_exam_unlock' | 'lingman_exam_unlock';
interface Notif {
  kind: NotifKind;
  medalTier?: MedalTier;
  unlockedLessonId?: number;
  cefrLevel?: string; // for level_exam_unlock
}

// ── AchievementNotifModal ─────────────────────────────────────────────────────
function AchievementNotifModal({ notif, lang, t, f, lessonId, lessonScore, lessonCefr, shareCardLang, onDismiss }: {
  notif: Notif; lang: Lang; t: any; f: any;
  lessonId: number; lessonScore: number; lessonCefr: string;
  shareCardLang: ShareCardLang;
  onDismiss: () => void;
}) {
  const notifShareSvgRef = useRef<InstanceType<typeof Svg> | null>(null);
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  const dismiss = () => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDismiss);
  };

  const MEDAL_IMAGES: Record<string, any> = {
    bronze: require('../assets/images/levels/bronza.png'),
    silver: require('../assets/images/levels/serebro.png'),
    gold:   require('../assets/images/levels/zoloto.png'),
  };

  const medalLabel = (tier: MedalTier) => {
    if (tier === 'bronze') return triLang(lang, { ru: '🥉 Бронзовая медаль!', uk: '🥉 Бронзова медаль!', es: '¡🥉 Medalla de bronce!' });
    if (tier === 'silver') return triLang(lang, { ru: '🥈 Серебряная медаль!', uk: '🥈 Срібна медаль!', es: '¡🥈 Medalla de plata!' });
    return triLang(lang, { ru: '🥇 Золотая медаль!', uk: '🥇 Золота медаль!', es: '¡🥇 Medalla de oro!' });
  };

  const shareMessage = () => {
    const body = buildCelebrationShareBody(notif.kind, lang, lessonId, lessonScore, {
      medalTier: notif.medalTier,
      unlockedLessonId: notif.unlockedLessonId,
      cefrLevel: notif.cefrLevel,
    });
    return `${body}\n${STORE_URL}`;
  };

  let modalTitle = '';
  let modalSub: string | undefined;
  if (notif.kind === 'medal' && notif.medalTier) {
    modalTitle = medalLabel(notif.medalTier);
    modalSub = triLang(lang, {
      ru: 'Отличная работа! Продолжай учиться!',
      uk: 'Чудова робота! Продовжуй навчання!',
      es: '¡Buen trabajo! Sigue con el inglés.',
    });
  } else if (notif.kind === 'lesson_unlock') {
    modalTitle = triLang(lang, {
      ru: '🔓 Урок разблокирован!',
      uk: '🔓 Урок розблоковано!',
      es: '🔓 ¡Lección desbloqueada!',
    });
    modalSub =
      notif.unlockedLessonId
        ? triLang(lang, {
            ru: `Урок ${notif.unlockedLessonId} «${LESSON_NAMES_RU[notif.unlockedLessonId - 1]}» теперь доступен!`,
            uk: `Урок ${notif.unlockedLessonId} «${LESSON_NAMES_UK[notif.unlockedLessonId - 1]}» тепер доступний!`,
            es: `¡La Lección ${notif.unlockedLessonId} («${lessonNamesForLang('es')[notif.unlockedLessonId - 1] ?? ''}») ya está disponible!`,
          })
        : undefined;
  } else if (notif.kind === 'level_exam_unlock') {
    modalTitle = triLang(lang, {
      ru: `📋 Зачёт ${notif.cefrLevel} доступен!`,
      uk: `📋 Залік ${notif.cefrLevel} доступний!`,
      es: `📋 ¡Examen ${notif.cefrLevel} disponible!`,
    });
    modalSub = triLang(lang, {
      ru: `Все уроки уровня ${notif.cefrLevel} пройдены на 4.5+! Теперь можешь сдать зачёт.`,
      uk: `Всі уроки рівня ${notif.cefrLevel} пройдено на 4.5+! Тепер можеш скласти залік.`,
      es: `¡Todas las lecciones del nivel ${notif.cefrLevel} con nota 4,5 o más! Ya puedes hacer el examen de nivel.`,
    });
  } else {
    modalTitle = triLang(lang, {
      ru: '🎓 Экзамен Лингмана открыт!',
      uk: '🎓 Іспит Лінгмана відкрито!',
      es: '🎓 ¡Examen de Lingman desbloqueado!',
    });
    modalSub = triLang(lang, {
      ru: 'Все уроки = 5.0 и все зачёты сданы! Финальный экзамен открыт.',
      uk: 'Всі уроки = 5.0 та всі заліки здано! Фінальний іспит відкрито.',
      es: '¡Todas las lecciones a 5,0 y todos los exámenes de nivel superados! Examen final abierto.',
    });
  }
  const { tone, centerEmoji } = getCelebrationVisual({
    kind: notif.kind,
    medalTier: notif.medalTier,
  });
  /** Строка для PNG без дублирования эмодзи с центром карточки */
  const shareCardLine1 =
    notif.kind === 'medal' && notif.medalTier
      ? (notif.medalTier === 'gold'
          ? triLang(lang, { ru: 'Золотая медаль!', uk: 'Золота медаль!', es: '¡Medalla de oro!' })
          : notif.medalTier === 'silver'
            ? triLang(lang, { ru: 'Серебряная медаль!', uk: 'Срібна медаль!', es: '¡Medalla de plata!' })
            : triLang(lang, { ru: 'Бронзовая медаль!', uk: 'Бронзова медаль!', es: '¡Medalla de bronce!' }))
      : notif.kind === 'lesson_unlock'
        ? triLang(lang, { ru: 'Урок разблокирован!', uk: 'Урок розблоковано!', es: '¡Lección desbloqueada!' })
        : notif.kind === 'level_exam_unlock'
          ? triLang(lang, {
              ru: `Зачёт ${notif.cefrLevel} доступен!`,
              uk: `Залік ${notif.cefrLevel} доступний!`,
              es: `¡Examen ${notif.cefrLevel} disponible!`,
            })
          : triLang(lang, {
              ru: 'Экзамен Лингмана открыт!',
              uk: 'Іспит Лінгмана відкрито!',
              es: '¡Examen de Lingman!',
            });

  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
      opacity, justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.65)',
    }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={dismiss} />
      <Animated.View style={{
        transform: [{ translateY }],
        backgroundColor: t.bgCard,
        borderRadius: 28, padding: 28, marginHorizontal: 24,
        alignItems: 'center', width: '100%', maxWidth: 360,
        borderWidth: 1, borderColor: t.textSecond + '44',
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, elevation: 20,
      }}>
        <View
          pointerEvents="none"
          collapsable={false}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, overflow: 'hidden' }}
        >
          <CelebrationShareCardSvg
            ref={notifShareSvgRef}
            kind={notif.kind}
            centerEmoji={centerEmoji}
            line1={shareCardLine1}
            line2={modalSub}
            tone={tone}
            lang={shareCardLang}
            layoutSize={1080}
          />
        </View>
        {/* Icon / Image */}
        {notif.kind === 'medal' && notif.medalTier && MEDAL_IMAGES[notif.medalTier] && (
          <Image source={MEDAL_IMAGES[notif.medalTier]} style={{ width: 90, height: 90 }} resizeMode="contain" />
        )}
        {notif.kind === 'lesson_unlock' && (
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.accentBg, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 40 }}>🔓</Text>
          </View>
        )}
        {notif.kind === 'level_exam_unlock' && (
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgSurface, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 40 }}>📋</Text>
          </View>
        )}
        {notif.kind === 'lingman_exam_unlock' && (
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.correctBg, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 40 }}>🎓</Text>
          </View>
        )}

        {/* Title */}
        <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '900', textAlign: 'center', marginTop: 12 }}>
          {modalTitle}
        </Text>

        {/* Subtitle */}
        {!!modalSub && (
          <Text style={{ color: t.textMuted, fontSize: f.bodyLg, fontWeight: '500', marginTop: 8, textAlign: 'center', lineHeight: f.bodyLg * 1.4 }}>
            {modalSub}
          </Text>
        )}

        {/* Share button */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18,
            backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10 }}
          onPress={async () => {
            hapticTap();
            await shareCardFromSvgRef(notifShareSvgRef, {
              fileNamePrefix: 'phraseman-celebration',
              textFallback: shareMessage(),
            });
          }}
        >
          <Ionicons name="share-outline" size={18} color={t.textSecond} />
          <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600' }}>
            {triLang(lang, { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir' })}
          </Text>
        </TouchableOpacity>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={() => { hapticTap(); dismiss(); }}
          style={{ marginTop: 14, backgroundColor: t.accent, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 12 }}
        >
          <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.bodyLg }}>
            {triLang(lang, { ru: 'Отлично!', uk: 'Чудово!', es: '¡Genial!' })}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export default function LessonComplete() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t, f } = useTheme();
  const { s, lang } = useLang();
  const { id } = useLocalSearchParams<{ id: string; unlocked?: string }>();
  const lessonId = parseInt(id || '1', 10);
  const c = s.lessonComplete;

  const [showReview, setShowReview] = useState(false);
  const [reviewContext, setReviewContext] = useState<ReviewContext>('general');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [lessonScore, setLessonScore] = useState<number>(0);
  const [lessonCefr,  setLessonCefr]  = useState<string>('A1');
  const [medalTier, setMedalTier]     = useState<MedalTier>('none');
  const [medalImproved, setMedalImproved] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [bonusXP, setBonusXP] = useState(0);

  // Notification queue
  const [, setNotifQueue] = useState<Notif[]>([]);
  const [activeNotif, setActiveNotif] = useState<Notif | null>(null);

  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const lessonCardSvgRef = useRef<InstanceType<typeof Svg> | null>(null);
  const shareCardLang: ShareCardLang = REPORT_SCREENS_RUSSIAN_ONLY
    ? 'ru'
    : lang === 'uk'
      ? 'uk'
      : lang === 'es'
        ? 'es'
        : 'ru';

  const dismissNotif = () => {
    setActiveNotif(null);
    setNotifQueue(prev => {
      const rest = prev.slice(1);
      if (rest.length > 0) {
        setTimeout(() => setActiveNotif(rest[0]), 400);
        return rest;
      }
      return rest;
    });
  };

  const grantBonus = useCallback(async () => {
    const suppress = { suppressEarnEvent: true } as const;
    try {
      const shardKeys: ShardSource[] = [];
      const key = `lesson${lessonId}_bonus_granted`;
      const already = await AsyncStorage.getItem(key);
      if (!already) {
        const name = await AsyncStorage.getItem('user_name');


        // Рассчитываем переменную награду
        const reward = calculateRewardWithBonus(BONUS);
        
        if (name) {
          try { await registerXP(reward.totalXP, 'bonus_chest', name, lang); } catch {}
        }

        // Показываем карточку бонуса если был выигран
        if (reward.hasBonusWon) {
          setBonusXP(reward.bonusXP);
          setShowBonus(true);
        }

        // Осколки за первое прохождение урока (единоразово)
        const nFirst = await addShards('lesson_first', suppress);
        if (nFirst > 0) shardKeys.push('lesson_first');

        await AsyncStorage.setItem(key, '1');
      }
      // [ACHIEVEMENT] Считаем сколько уроков завершено + проверяем идеальность
      let lessonCount = 0;
      let perfectCount = 0;
      let wasPerfect = false;
      for (let i = 1; i <= 32; i++) {
        try {
          const saved = await AsyncStorage.getItem(`lesson${i}_progress`);
          if (saved) {
            const p: string[] = JSON.parse(saved);
            const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
            if (correct >= 45) {
              lessonCount++;
              const wrong = p.filter(x => x === 'wrong').length;
              if (wrong === 0 && i === lessonId) wasPerfect = true;
              if (wrong === 0) perfectCount++;
            }
          }
        } catch {}
      }
      checkAchievements({ type: 'lesson_complete', lessonCount, wasPerfect, perfectCount }).catch(() => {});
      if (wasPerfect) {
        const nP = await addShards('lesson_perfect', suppress);
        if (nP > 0) shardKeys.push('lesson_perfect');
      }

      const eligible = await canShowReview();
      if (eligible) {
        setReviewContext(wasPerfect ? 'perfect_lesson' : 'general');
        setShowReview(true);
      }

      // [SHARDS] 5 уроков подряд без ошибок
      if (perfectCount > 0 && perfectCount % 5 === 0) {
        const perfKey = `shards_5perfect_milestone_${perfectCount}`;
        const alreadyPerfect = await AsyncStorage.getItem(perfKey);
        if (!alreadyPerfect) {
          const n5 = await addShards('lessons_5_perfect', suppress);
          if (n5 > 0) shardKeys.push('lessons_5_perfect');
          AsyncStorage.setItem(perfKey, '1').catch(() => {});
        }
      }

      // [SHARDS] Все уроки темы пройдены (CEFR группа: A1=1-8, A2=9-18, B1=19-28, B2=29-32)
      const CEFR_RANGES: Record<string, [number, number]> = { A1: [1, 8], A2: [9, 18], B1: [19, 28], B2: [29, 32] };
      const currentCefr = lessonId <= 8 ? 'A1' : lessonId <= 18 ? 'A2' : lessonId <= 28 ? 'B1' : 'B2';
      const [rangeStart, rangeEnd] = CEFR_RANGES[currentCefr];
      let topicAllDone = true;
      for (let i = rangeStart; i <= rangeEnd; i++) {
        try {
          const saved = await AsyncStorage.getItem(`lesson${i}_progress`);
          if (!saved) { topicAllDone = false; break; }
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          if (correct < 45) { topicAllDone = false; break; }
        } catch { topicAllDone = false; break; }
      }
      if (topicAllDone) {
        const topicKey = `shards_topic_${currentCefr}_granted`;
        const alreadyTopic = await AsyncStorage.getItem(topicKey);
        if (!alreadyTopic) {
          const nT = await addShards('topic_completed', suppress);
          if (nT > 0) shardKeys.push('topic_completed');
          AsyncStorage.setItem(topicKey, '1').catch(() => {});
        }
      }

      if (shardKeys.length > 0) {
        const total = shardKeys.reduce((acc, k) => acc + (SHARD_REWARDS[k] ?? 0), 0);
        if (total > 0) {
          const reasonText = formatLessonShardBatchReason(shardKeys, lang);
          emitAppEvent('shards_earned', { amount: total, reasonText });
        }
      }

      // [STREAK REPAIR] Засчитываем урок в прогресс починки стрика
      const repair = await recordLessonForRepair();
      if (repair.nowRepaired) {
        checkAchievements({ type: 'streak_repair' }).catch(() => {});
      }

      // D+1 персональное уведомление — только после первого урока
      if (lessonId === 1) {
        try {
          const progressRaw = await AsyncStorage.getItem('lesson1_progress');
          let d1Phrases = 0;
          if (progressRaw) {
            const p: string[] = JSON.parse(progressRaw);
            d1Phrases = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          }
          const streakRaw = await AsyncStorage.getItem('streak_count');
          const d1Streak = parseInt(streakRaw || '0') || 0;
          const langRaw = await AsyncStorage.getItem('app_lang');
          const d1Lang = (langRaw === 'uk' ? 'uk' : 'ru') as 'ru' | 'uk';
          scheduleD1PersonalizedReminder(d1Phrases, d1Streak, d1Lang).catch(() => {});
        } catch {}
      }
    } catch {}
  }, [lang, lessonId]);

  useEffect(() => {
    // Появление иконки
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    // Текст чуть позже
    setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 300);
    // Мягкое покачивание
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -8, duration: 700, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0,  duration: 700, useNativeDriver: true }),
      ])
    );
    setTimeout(() => bounce.start(), 400);

    grantBonus();
    // Загружаем оценку урока, сохраняем медаль
    AsyncStorage.getItem(`lesson${lessonId}_progress`).then(async (saved) => {
      if (!saved) {
        // Fallback: если прогресс не найден (например, очищен до открытия экрана),
        // показываем уже сохранённую медаль по best_score, чтобы не было "?".
        const info = await loadMedalInfo(lessonId);
        setLessonScore(info.bestScore || 0);
        setMedalTier(info.tier);
        setMedalImproved(false);
        return;
      }
      try {
        const p: string[] = JSON.parse(saved);
        const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
        const totalAnswers = Array.isArray(p) && p.length > 0 ? p.length : 50;
        const score = parseFloat(((correct / totalAnswers) * 5).toFixed(1));
        setLessonScore(score);
        const { newTier, prevTier, isNewBest } = await saveMedalProgress(lessonId, score, p);
        setMedalTier(newTier);
        const medalUpgraded = isNewBest && newTier !== prevTier && newTier !== 'none';
        setMedalImproved(medalUpgraded);

        // Build notification queue
        const queue: Notif[] = [];
        if (medalUpgraded) {
          queue.push({ kind: 'medal', medalTier: newTier });
        }

        // Зачёт уровня: все уроки уровня >= 4.5
        const unlockedLevel = await tryUnlockLevelExam(lessonId);
        if (unlockedLevel) {
          queue.push({ kind: 'level_exam_unlock', cefrLevel: unlockedLevel });
        }
        // Экзамен Лингмана: все 32 урока = 5.0 + все зачёты сданы
        const lingmanUnlocked = await tryUnlockLingmanExam();
        if (lingmanUnlocked) {
          queue.push({ kind: 'lingman_exam_unlock' });
        }

        if (queue.length > 0) {
          setNotifQueue(queue);
          setTimeout(() => setActiveNotif(queue[0]), 1200);
        }

        // Gem achievements
        const gems = await checkGemAchievements(lessonId);
        gems.forEach(g => checkAchievements({ type: 'gem', level: g.level, gem: g.gem } as any).catch(() => {}));
      } catch {
        const info = await loadMedalInfo(lessonId);
        setLessonScore(info.bestScore || 0);
        setMedalTier(info.tier);
        setMedalImproved(false);
      }
    });
    const cefr = CEFR_FOR_LESSON(lessonId);
    setLessonCefr(cefr);
    return () => bounce.stop();
  }, [bounceAnim, fadeAnim, grantBonus, lessonId, scaleAnim]);

  // ── Триггер регистрационной модалки после первого урока ────────────────────
  // Показывается ровно один раз: только для урока 1, только если юзер ещё не залогинен
  // и модалка раньше не показывалась. Через 1.5с после монтирования экрана —
  // даём пройти основной анимации завершения.
  useEffect(() => {
    if (lessonId !== 1) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const shown = await AsyncStorage.getItem(AUTH_PROMPT_SHOWN_KEY);
        if (shown === '1') return;
        const linked = await getLinkedAuthInfo();
        if (linked) {
          // Уже залогинен (через онбординг или из Settings) — помечаем чтобы больше не дёргать
          AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(() => {});
          return;
        }
        if (!cancelled) setShowAuthPrompt(true);
      } catch {
        // игнорируем — модалку просто не покажем
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lessonId]);

  const goNext = () => {
    const next = lessonId + 1;
    if (next <= 32) {
      void (async () => {
        await prefetchLessonMenuCache(next);
        router.replace({ pathname: '/lesson_menu', params: { id: next } });
      })();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <View
        pointerEvents="none"
        collapsable={false}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, zIndex: -1, overflow: 'hidden' }}
      >
        <LessonShareCardSvg
          ref={lessonCardSvgRef}
          lessonId={lessonId}
          score={lessonScore}
          cefr={lessonCefr}
          lang={shareCardLang}
          layoutSize={1080}
        />
      </View>
      <ContentWrap>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }} showsVerticalScrollIndicator={false}>

        {/* Анимированная медаль */}
        <Animated.View style={{
          transform: [{ scale: scaleAnim }, { translateY: bounceAnim }],
          marginBottom: 24,
          alignItems: 'center',
        }}>
          {medalTier !== 'none' && MEDAL_IMAGES_COMPLETE[medalTier] ? (
            <Image
              source={MEDAL_IMAGES_COMPLETE[medalTier]}
              style={{ width: 110, height: 110 }}
              resizeMode="contain"
            />
          ) : (
            <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: '#3A3A3A', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 40, color: '#555' }}>?</Text>
            </View>
          )}
          {medalImproved && (
            <Animated.Text style={{
              color: t.gold, fontSize: f.bodyLg, fontWeight: '700',
              marginTop: 6, opacity: fadeAnim,
            }}>
              {medalTier === 'bronze' && triLang(lang, { ru: '🥉 Новая медаль!', uk: '🥉 Нова медаль!', es: '¡🥉 Medalla nueva!' })}
              {medalTier === 'silver' && triLang(lang, { ru: '🥈 Новая медаль!', uk: '🥈 Нова медаль!', es: '¡🥈 Medalla nueva!' })}
              {medalTier === 'gold'   && triLang(lang, { ru: '🥇 Золото!', uk: '🥇 Золото!', es: '¡🥇 Oro!' })}
            </Animated.Text>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <Text style={{ color: t.textPrimary, fontSize: 30, fontWeight: '700', marginBottom: 10, textAlign: 'center' }}>
            {c.title}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: 17, marginBottom: 16, textAlign: 'center' }}>
            {c.subtitle(lessonId)}
          </Text>

          {/* Бонус +500 */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: t.correctBg, borderRadius: 14,
            paddingHorizontal: 18, paddingVertical: 12,
            borderWidth: 1, borderColor: t.correct, marginBottom: 20,
          }}>
            <Ionicons name="star" size={20} color={t.correct} />
            <Text style={{ color: t.correct, fontSize: 18, fontWeight: '700' }}>{c.bonus}</Text>
          </View>

          {/* Совет отдохнуть */}
          <View style={{
            backgroundColor: t.bgCard, borderRadius: 14,
            padding: 16, borderWidth: 0.5, borderColor: t.border,
            width: '100%', marginBottom: 36,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            <Ionicons name="cafe-outline" size={24} color={t.textSecond} />
            <Text style={{ color: t.textMuted, fontSize: 15, lineHeight: 22, flex: 1 }}>
              {c.rest}
            </Text>
          </View>

          {/* Следующий урок */}
          {lessonId < 32 && (
            <TouchableOpacity
              style={{
                width: '100%', backgroundColor: t.bgSurface,
                borderRadius: 16, padding: 18, alignItems: 'center',
                borderWidth: 0.5, borderColor: t.border, marginBottom: 12,
              }}
              onPress={() => { hapticTap(); goNext(); }} activeOpacity={0.85}
            >
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700' }}>
                {c.nextLesson} {lessonId + 1} →
              </Text>
            </TouchableOpacity>
          )}

          {/* Повторить урок */}
          <TouchableOpacity
            style={{
              width: '100%', backgroundColor: t.accentBg,
              borderRadius: 16, padding: 16, alignItems: 'center',
              borderWidth: 0.5, borderColor: t.accent, marginBottom: 14,
            }}
            onPress={() => { void (async () => { hapticTap(); await primeLessonScreenFromStorage(lessonId); router.replace({ pathname: '/lesson1', params: { id: lessonId } }); })(); }}
            activeOpacity={0.85}
          >
            <Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>
              ↺ {c.repeatLesson}
            </Text>
          </TouchableOpacity>

          {/* Поделиться результатом — PNG рисуется с скрытого SVG только при нажатии */}
          <TouchableOpacity
            style={{ flexDirection:'row', alignItems:'center', gap:8, padding:12, marginTop: 4 }}
            onPress={async () => {
              hapticTap();
              const msg = buildLessonShareMessage(
                lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru',
                lessonId,
                lessonScore,
                STORE_URL
              );
              await shareCardFromSvgRef(lessonCardSvgRef, { fileNamePrefix: 'phraseman-lesson', textFallback: msg });
            }}
          >
            <Ionicons name="share-outline" size={18} color={t.textSecond} />
            <Text style={{ color: t.textSecond, fontSize: 15 }}>
              {c.shareResult}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ padding: 14 }} onPress={() => { hapticTap(); router.replace('/(tabs)' as any); }}>
            <Text style={{ color: t.textMuted, fontSize: 16 }}>{c.backHome}</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
      </ContentWrap>
      {showBonus && (
        <BonusXPCard
          bonusXP={bonusXP}
          onDismiss={() => setShowBonus(false)}
          position="center"
          duration={2000}
        />
      )}
      <ReviewModal
        visible={showReview}
        context={reviewContext}
        t={t}
        f={f}
        bottomInset={insets.bottom}
        lang={lang}
        onClose={() => setShowReview(false)}
      />
      {activeNotif && (
        <AchievementNotifModal
          notif={activeNotif}
          lang={lang}
          t={t}
          f={f}
          lessonId={lessonId}
          lessonScore={lessonScore}
          lessonCefr={lessonCefr}
          shareCardLang={shareCardLang}
          onDismiss={dismissNotif}
        />
      )}
      <RegistrationPromptModal
        visible={showAuthPrompt}
        context="lesson1"
        onClose={() => setShowAuthPrompt(false)}
      />
    </SafeAreaView>
    </ScreenGradient>
  );
}
