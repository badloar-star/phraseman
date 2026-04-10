import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BonusXPCard from '../components/BonusXPCard';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { CEFR_FOR_LESSON } from '../constants/theme';
import { LESSON_NAMES_RU, LESSON_NAMES_UK } from '../constants/lessons';
import { hapticTap } from '../hooks/use-haptics';
import { checkAchievements } from './achievements';
import { STORE_URL } from './config';
import { checkGemAchievements, saveMedalProgress, type MedalTier } from './medal_utils';
import { tryUnlockLevelExam, tryUnlockLingmanExam } from './lesson_lock_system';
import { canShowReview, markReviewPrompted, requestNativeReview } from './review_utils';
import { recordLessonForRepair } from './streak_repair';
import { calculateRewardWithBonus } from './variable_reward_system';
import { registerXP } from './xp_manager';

// Medal images for completion screen
const MEDAL_IMAGES_COMPLETE: Record<string, any> = {
  bronze:  require('../assets/images/levels/bronza.png'),
  silver:  require('../assets/images/levels/serebro.png'),
  gold:    require('../assets/images/levels/zoloto.png'),
};

const BONUS = 500;

// ── Двухшаговый модал оценки ─────────────────────────────────────────────────
function ReviewModal({ visible, isUK, t, f, onClose }: {
  visible: boolean; isUK: boolean; t: any; f: any; onClose: () => void;
}) {
  const [step, setStep] = useState<'ask' | 'thanks'>('ask');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('ask');
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleYes = async () => {
    await markReviewPrompted();
    setStep('thanks');
    await requestNativeReview();
    setTimeout(onClose, 1500);
  };

  const handleNo = async () => {
    await markReviewPrompted();
    onClose();
  };

  if (!visible) return null;

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
          padding: 28, paddingBottom: 40,
          borderTopWidth: 0.5, borderColor: t.border,
          alignItems: 'center',
        }}>
          {step === 'ask' ? (
            <>
              <Text style={{ fontSize: 36, marginBottom: 14 }}>🎉</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                {isUK ? 'Тобі подобається Phraseman?' : 'Тебе нравится Phraseman?'}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginBottom: 28, lineHeight: f.body * 1.5 }}>
                {isUK ? 'Це займе секунду і дуже допоможе нам 🙏' : 'Это займёт секунду и очень нам поможет 🙏'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: t.border }}
                  onPress={handleNo}
                >
                  <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600' }}>
                    {isUK ? 'Поки ні' : 'Пока нет'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1.4, backgroundColor: t.correct, borderRadius: 14, padding: 16, alignItems: 'center' }}
                  onPress={handleYes}
                >
                  <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                    {isUK ? 'Так, оцінити ⭐' : 'Да, оценить ⭐'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🙏</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
                {isUK ? 'Дякуємо!' : 'Спасибо!'}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 8 }}>
                {isUK ? 'Це означає для нас дуже багато.' : 'Это значит для нас очень много.'}
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
function AchievementNotifModal({ notif, isUK, t, f, lessonId, lessonScore, lessonCefr, onDismiss }: {
  notif: Notif; isUK: boolean; t: any; f: any;
  lessonId: number; lessonScore: number; lessonCefr: string;
  onDismiss: () => void;
}) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDismiss);
  };

  const MEDAL_IMAGES: Record<string, any> = {
    bronze: require('../assets/images/levels/bronza.png'),
    silver: require('../assets/images/levels/serebro.png'),
    gold:   require('../assets/images/levels/zoloto.png'),
  };

  const medalLabel = (tier: MedalTier) => {
    if (isUK) {
      if (tier === 'bronze') return '🥉 Бронзова медаль!';
      if (tier === 'silver') return '🥈 Срібна медаль!';
      return '🥇 Золота медаль!';
    }
    if (tier === 'bronze') return '🥉 Бронзовая медаль!';
    if (tier === 'silver') return '🥈 Серебряная медаль!';
    return '🥇 Золотая медаль!';
  };

  const shareMessage = () => {
    if (notif.kind === 'medal' && notif.medalTier) {
      const tier = notif.medalTier;
      const emoji = tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉';
      return isUK
        ? `${emoji} Отримав медаль за урок ${lessonId} (${lessonCefr}) у Phraseman! ★ ${lessonScore} 🔥\n${STORE_URL}`
        : `${emoji} Получил медаль за урок ${lessonId} (${lessonCefr}) в Phraseman! ★ ${lessonScore} 🔥\n${STORE_URL}`;
    }
    if (notif.kind === 'lesson_unlock') {
      return isUK
        ? `🔓 Розблокував урок ${notif.unlockedLessonId} у Phraseman! 🚀\n${STORE_URL}`
        : `🔓 Разблокировал урок ${notif.unlockedLessonId} в Phraseman! 🚀\n${STORE_URL}`;
    }
    if (notif.kind === 'level_exam_unlock') {
      return isUK
        ? `📋 Розблокував залік рівня ${notif.cefrLevel} у Phraseman! 🎯\n${STORE_URL}`
        : `📋 Разблокировал зачёт уровня ${notif.cefrLevel} в Phraseman! 🎯\n${STORE_URL}`;
    }
    return isUK
      ? `🎓 Розблокував іспит Професора Лінгмана у Phraseman! Всі уроки та заліки пройдено! 🏆\n${STORE_URL}`
      : `🎓 Разблокировал экзамен Профессора Лингмана в Phraseman! Все уроки и зачёты пройдены! 🏆\n${STORE_URL}`;
  };

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
          {notif.kind === 'medal' && notif.medalTier ? medalLabel(notif.medalTier) : ''}
          {notif.kind === 'lesson_unlock' ? (isUK ? '🔓 Урок розблоковано!' : '🔓 Урок разблокирован!') : ''}
          {notif.kind === 'level_exam_unlock' ? (isUK ? `📋 Залік ${notif.cefrLevel} доступний!` : `📋 Зачёт ${notif.cefrLevel} доступен!`) : ''}
          {notif.kind === 'lingman_exam_unlock' ? (isUK ? '🎓 Іспит Лінгмана відкрито!' : '🎓 Экзамен Лингмана открыт!') : ''}
        </Text>

        {/* Subtitle */}
        <Text style={{ color: t.textMuted, fontSize: f.bodyLg, fontWeight: '500', marginTop: 8, textAlign: 'center', lineHeight: f.bodyLg * 1.4 }}>
          {notif.kind === 'medal' && (
            isUK ? 'Чудова робота! Продовжуй навчання!' : 'Отличная работа! Продолжай учиться!'
          )}
          {notif.kind === 'lesson_unlock' && notif.unlockedLessonId && (
            isUK
              ? `Урок ${notif.unlockedLessonId} «${LESSON_NAMES_UK[notif.unlockedLessonId - 1]}» тепер доступний!`
              : `Урок ${notif.unlockedLessonId} «${LESSON_NAMES_RU[notif.unlockedLessonId - 1]}» теперь доступен!`
          )}
          {notif.kind === 'level_exam_unlock' && (
            isUK
              ? `Всі уроки рівня ${notif.cefrLevel} пройдено на 4.5+! Тепер можеш скласти залік.`
              : `Все уроки уровня ${notif.cefrLevel} пройдены на 4.5+! Теперь можешь сдать зачёт.`
          )}
          {notif.kind === 'lingman_exam_unlock' && (
            isUK
              ? 'Всі уроки = 5.0 та всі заліки здано! Фінальний іспит відкрито.'
              : 'Все уроки = 5.0 и все зачёты сданы! Финальный экзамен открыт.'
          )}
        </Text>

        {/* Share button */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18,
            backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10 }}
          onPress={async () => {
            hapticTap();
            try { await Share.share({ message: shareMessage() }); } catch {}
          }}
        >
          <Ionicons name="share-outline" size={18} color={t.textSecond} />
          <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600' }}>
            {isUK ? 'Поділитися' : 'Поделиться'}
          </Text>
        </TouchableOpacity>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={() => { hapticTap(); dismiss(); }}
          style={{ marginTop: 14, backgroundColor: t.accent, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 12 }}
        >
          <Text style={{ color: t.bgPrimary, fontWeight: '800', fontSize: f.bodyLg }}>
            {isUK ? 'Чудово!' : 'Отлично!'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export default function LessonComplete() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { s, lang } = useLang();
  const { id, unlocked } = useLocalSearchParams<{ id: string; unlocked?: string }>();
  const lessonId = parseInt(id || '1', 10);
  const didUnlockNext = unlocked === '1';
  const c = s.lessonComplete;
  const isUK = lang === 'uk';

  const [showReview, setShowReview] = useState(false);
  const [lessonScore, setLessonScore] = useState<number>(0);
  const [lessonCefr,  setLessonCefr]  = useState<string>('A1');
  const [medalTier, setMedalTier]     = useState<MedalTier>('none');
  const [medalImproved, setMedalImproved] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [bonusXP, setBonusXP] = useState(0);

  // Notification queue
  const [notifQueue, setNotifQueue] = useState<Notif[]>([]);
  const [activeNotif, setActiveNotif] = useState<Notif | null>(null);

  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

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
      if (saved) {
        const p: string[] = JSON.parse(saved);
        const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
        const score = parseFloat((correct / 50 * 5).toFixed(1));
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
        if (didUnlockNext && lessonId < 32) {
          queue.push({ kind: 'lesson_unlock', unlockedLessonId: lessonId + 1 });
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
      }
    });
    const cefr = CEFR_FOR_LESSON(lessonId);
    setLessonCefr(cefr);
    return () => bounce.stop();
  }, []);

  const grantBonus = async () => {
    try {
      const key = `lesson${lessonId}_bonus_granted`;
      const already = await AsyncStorage.getItem(key);
      if (already) {
      } else {
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

        await AsyncStorage.setItem(key, '1');
      }
      const eligible = await canShowReview();
      if (eligible) setShowReview(true);

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

      // [STREAK REPAIR] Засчитываем урок в прогресс починки стрика
      const repair = await recordLessonForRepair();
      if (repair.nowRepaired) {
        checkAchievements({ type: 'streak_repair' }).catch(() => {});
      }
    } catch {}
  };

  const goNext = () => {
    const next = lessonId + 1;
    if (next <= 32) {
      router.replace({ pathname: '/lesson_menu', params: { id: next } });
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
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
              {medalTier === 'bronze' && (isUK ? '🥉 Нова медаль!' : '🥉 Новая медаль!')}
              {medalTier === 'silver' && (isUK ? '🥈 Нова медаль!' : '🥈 Новая медаль!')}
              {medalTier === 'gold'   && (isUK ? '🥇 Золото!'      : '🥇 Золото!')}
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
            onPress={() => { hapticTap(); router.replace({ pathname: '/lesson1', params: { id: lessonId } }); }}
            activeOpacity={0.85}
          >
            <Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>
              ↺ {c.repeatLesson}
            </Text>
          </TouchableOpacity>

          {/* Поделиться результатом */}
          <TouchableOpacity
            style={{ flexDirection:'row', alignItems:'center', gap:8, padding:12 }}
            onPress={async () => {
              hapticTap();
              const msg = isUK
                ? `Пройшов Урок ${lessonId} (${lessonCefr}) у Phraseman! ★ ${lessonScore} 🔥\n${STORE_URL}`
                : `Прошёл Урок ${lessonId} (${lessonCefr}) в Phraseman! ★ ${lessonScore} 🔥\n${STORE_URL}`;
              try { await Share.share({ message: msg }); } catch {}
            }}
          >
            <Ionicons name="share-outline" size={18} color={t.textSecond} />
            <Text style={{ color: t.textSecond, fontSize: 15 }}>
              {isUK ? 'Поділитися результатом' : 'Поделиться результатом'}
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
        isUK={isUK}
        t={t}
        f={f}
        onClose={() => setShowReview(false)}
      />
      {activeNotif && (
        <AchievementNotifModal
          notif={activeNotif}
          isUK={isUK}
          t={t}
          f={f}
          lessonId={lessonId}
          lessonScore={lessonScore}
          lessonCefr={lessonCefr}
          onDismiss={dismissNotif}
        />
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}
