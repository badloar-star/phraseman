import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, Share, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BonusXPCard from '../components/BonusXPCard';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { CEFR_FOR_LESSON } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import { checkAchievements } from './achievements';
import { STORE_URL } from './config';
import { checkGemAchievements, saveMedalProgress, type MedalTier } from './medal_utils';
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

export default function LessonComplete() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { s, lang } = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(id || '1', 10);
  const c = s.lessonComplete;
  const isUK = lang === 'uk';

  const [showReview, setShowReview] = useState(false);
  const [lessonScore, setLessonScore] = useState<number>(0);
  const [lessonCefr,  setLessonCefr]  = useState<string>('A1');
  const [medalTier, setMedalTier]     = useState<MedalTier>('none');
  const [medalImproved, setMedalImproved] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [bonusXP, setBonusXP] = useState(0);

  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

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
        setMedalImproved(isNewBest && newTier !== prevTier && newTier !== 'none');
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
          await registerXP(reward.totalXP, 'bonus_chest', name, lang);
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>

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

      </View>
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
    </SafeAreaView>
    </ScreenGradient>
  );
}
