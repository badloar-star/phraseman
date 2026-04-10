import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  ScrollView,
  Switch,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { unlockAllFrames } from '../constants/avatars';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { unlockAllAchievements, ALL_ACHIEVEMENTS } from './achievements';
import { getMyWeekPoints } from './hall_of_fame_utils';
import { calculateResult, LeagueResult, loadLeagueState, savePendingResult, getWeekId } from './league_engine';
import LeagueResultModal from './LeagueResultModal';
import { registerXP } from './xp_manager';
import { useAchievement } from '../components/AchievementContext';
import { invalidatePremiumCache } from './premium_guard';

const ToggleRow = ({ icon, label, sub, value, onToggle, t, f }: {
  icon: string; label: string; sub?: string; value: boolean; onToggle: (val: boolean) => void;
  t: any; f: any;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
    <Ionicons name={icon as any} size={22} color={t.textSecond} style={{ marginRight: 14 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg }}>{label}</Text>
      {sub && <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>{sub}</Text>}
    </View>
    <Switch value={value} onValueChange={onToggle} />
  </View>
);

const ButtonRow = ({ icon, label, sub, onPress, danger, t, f, doHaptic }: {
  icon: string; label: string; sub?: string; onPress: () => void; danger?: boolean;
  t: any; f: any; doHaptic: () => void;
}) => (
  <TouchableOpacity
    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}
    onPress={() => { doHaptic(); onPress(); }}
    activeOpacity={0.7}
  >
    <Ionicons name={icon as any} size={22} color={danger ? t.wrong : t.textSecond} style={{ marginRight: 14 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ color: danger ? t.wrong : t.textPrimary, fontSize: f.bodyLg }}>{label}</Text>
      {sub && <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>{sub}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
  </TouchableOpacity>
);

const SectionTitle = ({ title, t, f }: { title: string; t: any; f: any }) => (
  <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
    {title}
  </Text>
);

export default function SettingsTestersFunctions() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const [noLimitsEnabled, setNoLimitsEnabled] = useState(false);
  const [energyDisabled, setEnergyDisabled] = useState(false);
  const [noPremiumEnabled, setNoPremiumEnabled] = useState(false);
  const { reload: reloadEnergy } = useEnergy();

  const [leagueResultVisible, setLeagueResultVisible] = useState(false);
  const [leagueResult, setLeagueResult] = useState<LeagueResult | null>(null);
  const { showAchievement } = useAchievement();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings to AsyncStorage
  const loadSettings = async () => {
    try {
      const [noLimits, noEnergy, noPrem] = await AsyncStorage.multiGet([
        'tester_no_limits',
        'tester_energy_disabled',
        'tester_no_premium',
      ]);
      setNoLimitsEnabled(noLimits[1] === 'true');
      setEnergyDisabled(noEnergy[1] === 'true');
      setNoPremiumEnabled(noPrem[1] === 'true');
    } catch {}
  };

  const saveSettings = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch {}
  };

  const toggleNoLimits = async (val: boolean) => {
    doHaptic();
    setNoLimitsEnabled(val);
    await saveSettings('tester_no_limits', val);
    // Enabling NoLimits restores premium mode — clear the no-premium override
    if (val) {
      await AsyncStorage.removeItem('tester_no_premium');
      setNoPremiumEnabled(false);
      invalidatePremiumCache();
      // Уведомляем PremiumContext — isPremium сразу станет true
      DeviceEventEmitter.emit('premium_activated');
    } else {
      invalidatePremiumCache();
      DeviceEventEmitter.emit('premium_deactivated');
    }
    await reloadEnergy(); // сразу синхронизируем EnergyContext

    // When enabling No Limits, award all medals on lessons and exams
    if (val) {
      try {
        const keysToSet: [string, string][] = [];

        // Award gold medals on all 32 lessons
        for (let i = 1; i <= 32; i++) {
          // Set all necessary lesson data for gold medal
          keysToSet.push([`lesson${i}_score`, '5']);
          keysToSet.push([`lesson${i}_best_score`, '5']); // Gold medal requires best_score = 5
          keysToSet.push([`lesson${i}_pass_count`, '1']);
          // Create full progress array (all 50 answers marked as correct)
          const progressArray = new Array(50).fill('correct');
          keysToSet.push([`lesson${i}_progress`, JSON.stringify(progressArray)]);
          keysToSet.push([`lesson${i}_cellIndex`, '0']);
        }

        // Unlock all lessons
        const unlockedLessons = Array.from({ length: 32 }, (_, i) => i + 1);
        keysToSet.push(['unlocked_lessons', JSON.stringify(unlockedLessons)]);

        // Award gold medals on all 4 exams (90%+ = gold)
        // Use string level IDs ('A1','A2','B1','B2') to match level_exam.tsx format
        const examLevels = ['A1', 'A2', 'B1', 'B2'];
        for (const lvl of examLevels) {
          keysToSet.push([`level_exam_${lvl}_pct`, '100']);
          keysToSet.push([`level_exam_${lvl}_best_pct`, '100']); // Gold medal requires best_pct >= 90
          keysToSet.push([`level_exam_${lvl}_passed`, '1']);
          keysToSet.push([`level_exam_${lvl}_pass_count`, '1']);
        }

        // Set all keys at once
        await AsyncStorage.multiSet(keysToSet);

        Alert.alert(
          isUK ? 'Готово' : 'Готово',
          isUK ? 'Всім урокам дані ЗОЛОТІ МЕДАЛІ\nУсім екзаменам дані ЗОЛОТІ МЕДАЛІ' : 'Всем урокам даны ЗОЛОТЫЕ МЕДАЛИ\nВсем экзаменам даны ЗОЛОТЫЕ МЕДАЛИ'
        );
      } catch {
        Alert.alert(isUK ? 'Помилка' : 'Ошибка', isUK ? 'Не вдалось активувати' : 'Не удалось активировать');
      }
    }
  };

  const toggleEnergyDisabled = async (val: boolean) => {
    doHaptic();
    setEnergyDisabled(val);
    await saveSettings('tester_energy_disabled', val);
    await reloadEnergy(); // сразу синхронизируем EnergyContext
  };

  const addXP = async () => {
    doHaptic();
    try { // Use registerXP for adding XP
      const name = await AsyncStorage.getItem('user_name');
      if (name) { await registerXP(5000, 'bonus_chest', name, lang); }
      Alert.alert(isUK ? 'Готово' : 'Готово', isUK ? '5000 XP додано' : '5000 XP добавлено');
    } catch {
      Alert.alert(isUK ? 'Помилка' : 'Ошибка', isUK ? 'Не вдалось додати XP' : 'Не удалось добавить XP');
    }
  };

  const unlockAllAchievementsHandler = async () => {
    doHaptic();
    Alert.alert(
      isUK ? 'Разблокировать все?' : 'Разблокировать все?',
      isUK ? 'Это разблокирует все достижения и рамки' : 'Это разблокирует все достижения и рамки',
      [
        { text: isUK ? 'Отмена' : 'Отмена', style: 'cancel' },
        {
          text: isUK ? 'Разблокировать' : 'Разблокировать',
          onPress: async () => {
            try {
              // Разблокиваем все достижения и рамки (без изменения XP/уровня)
              await unlockAllAchievements();
              await unlockAllFrames();

              Alert.alert('OK', isUK ? 'Все достижения и рамки разблокированы' : 'Все достижения и рамки разблокированы');
            } catch {
              Alert.alert('Ошибка', isUK ? 'Ошибка разблокировки' : 'Ошибка разблокировки');
            }
          },
        },
      ]
    );
  };

  const triggerEndOfWeek = async () => {
    doHaptic();
    try {
      // Load current league state
      const state = await loadLeagueState();
      if (!state) {
        Alert.alert(isUK ? 'Помилка' : 'Ошибка', isUK ? 'Ліга не ініціалізована' : 'Лига не инициализирована');
        return;
      }

      // Get current week points
      const myWeekPoints = await getMyWeekPoints();

      // For testing: if group has only 1 member (just me, no bots in week_leaderboard),
      // inject fake competitors so ranking is meaningful
      let testState = state;
      const realMembers = state.group.filter(m => !m.isMe);
      if (realMembers.length < 4) {
        // Bot XP: deterministic random per (name + day), 3–366 XP/day × days elapsed this week
        const today = new Date();
        const dayOfWeek = today.getUTCDay() || 7; // 1=Mon … 7=Sun
        const daysElapsed = dayOfWeek; // days since week started (inclusive of today)
        const seededRand = (seed: number) => {
          let s = seed;
          s = ((s >>> 16) ^ s) * 0x45d9f3b;
          s = ((s >>> 16) ^ s) * 0x45d9f3b;
          s = (s >>> 16) ^ s;
          return (s >>> 0) / 0xffffffff;
        };
        const dateNum = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();
        const botNames = ['Alex', 'Maria', 'Ivan', 'Olga', 'Sergey', 'Dasha', 'Misha', 'Ira', 'Kolya', 'Tanya',
                          'Petro', 'Oksana', 'Vlad', 'Lena', 'Roma', 'Nastya', 'Dima', 'Katya', 'Andrey'];
        const fakeBots = botNames.slice(0, 19 - realMembers.length).map((name, i) => {
          let weekPoints = 0;
          for (let day = 1; day <= daysElapsed; day++) {
            const seed = (dateNum - dayOfWeek + day) * 100 + i;
            weekPoints += Math.round(3 + seededRand(seed) * (366 - 3));
          }
          return { name, points: weekPoints, isMe: false };
        });
        const fakeGroup = [
          ...fakeBots,
          ...realMembers,
          { name: state.group.find(m => m.isMe)?.name ?? 'Me', points: myWeekPoints, isMe: true },
        ];
        testState = { ...state, group: fakeGroup } as typeof state;
      }

      // Force calculate league result (for testing, not checking if week changed)
      const leagueResult = calculateResult(testState, myWeekPoints);

      // Save as pending so it persists and shows on next app open
      await savePendingResult(leagueResult);

      // Update state to new leagueId — keep only real members (not fake bots)
      const myMember = testState.group.find(m => m.isMe);
      const newGroup = [...realMembers, ...(myMember ? [myMember] : [])];
      const newState = { ...state, leagueId: leagueResult.newLeagueId, weekId: getWeekId(), group: newGroup };
      await AsyncStorage.setItem('league_state_v3', JSON.stringify(newState));

      // Show the beautiful modal immediately (no confirmation alert)
      setLeagueResult(leagueResult);
      setLeagueResultVisible(true);
    } catch (error) {
      Alert.alert(isUK ? 'Помилка' : 'Ошибка', isUK ? 'Не вдалось виконати конец тижня' : 'Не удалось выполнить конец недели');
    }
  };


  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header with Back Button - outside ContentWrap */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
              {isUK ? 'Функції для тестерів' : 'Функции для тестеров'}
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          <SectionTitle title={isUK ? 'Активи' : 'АКТИВЫ'} t={t} f={f} />
          <ButtonRow
            icon={noLimitsEnabled ? "lock-open-outline" : "lock-outline"}
            label={noLimitsEnabled ? (isUK ? 'Без обмежень ✓' : 'Без ограничений ✓') : (isUK ? 'Без обмежень' : 'Без ограничений')}
            sub={isUK ? 'Всі уроки і екзамени доступні' : 'Все уроки и экзамены доступны'}
            onPress={() => toggleNoLimits(!noLimitsEnabled)}
            t={t} f={f} doHaptic={doHaptic}
          />

          <SectionTitle title={isUK ? 'Енергія' : 'ЭНЕРГИЯ'} t={t} f={f} />
          <ToggleRow
            icon="flash-outline"
            label={isUK ? 'Енергія не витрачається' : 'Энергия не тратится'}
            sub={isUK ? 'Уроки не будуть коштувати енергію' : 'Уроки не будут стоить энергию'}
            value={energyDisabled}
            onToggle={toggleEnergyDisabled}
            t={t} f={f}
          />

          <SectionTitle title={isUK ? 'Опит' : 'ОПЫТ'} t={t} f={f} />
          <ButtonRow
            icon="add-circle-outline"
            label={isUK ? 'Додати 5000 XP' : 'Добавить 5000 XP'}
            onPress={addXP}
            t={t} f={f} doHaptic={doHaptic}
          />

          <SectionTitle title={isUK ? 'Досягнення' : 'ДОСТИЖЕНИЯ'} t={t} f={f} />
          <ButtonRow
            icon="star-outline"
            label={isUK ? 'Розблокувати все' : 'Разблокировать всё'}
            sub={isUK ? 'Досягнення та рамки' : 'Достижения и рамки'}
            onPress={unlockAllAchievementsHandler}
            t={t} f={f} doHaptic={doHaptic}
          />

          <SectionTitle title={isUK ? 'Преміум' : 'ПРЕМИУМ'} t={t} f={f} />
          <ButtonRow
            icon="diamond-outline"
            label={isUK ? 'Зняти преміум' : 'Снять премиум'}
            sub={isUK ? 'Переключити акаунт у режим без преміуму' : 'Переключить аккаунт в режим без премиума'}
            danger
            t={t} f={f} doHaptic={doHaptic}
            onPress={() => {
              Alert.alert(
                isUK ? 'Зняти преміум?' : 'Снять премиум?',
                isUK ? 'Акаунт буде переведено у режим без преміуму. RevenueCat не буде зачіпатись.' : 'Аккаунт будет переведён в режим без премиума. RevenueCat не будет затронут.',
                [
                  { text: isUK ? 'Скасувати' : 'Отмена', style: 'cancel' },
                  {
                    text: isUK ? 'Зняти' : 'Снять',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await AsyncStorage.multiSet([
                          ['premium_active', 'false'],
                          ['premium_plan', ''],
                          ['tester_no_limits', 'false'],
                          ['tester_energy_disabled', 'false'],
                          ['tester_no_premium', 'true'],
                        ]);
                        invalidatePremiumCache();
                        setNoLimitsEnabled(false);
                        setEnergyDisabled(false);
                        setNoPremiumEnabled(true);
                        DeviceEventEmitter.emit('premium_deactivated');
                        await reloadEnergy();
                        Alert.alert(
                          isUK ? 'Готово' : 'Готово',
                          isUK ? 'Преміум знято' : 'Премиум снят'
                        );
                      } catch {
                        Alert.alert(isUK ? 'Помилка' : 'Ошибка', isUK ? 'Не вдалось зняти преміум' : 'Не удалось снять премиум');
                      }
                    },
                  },
                ]
              );
            }}
          />

          {/* ── ПЕЙВОЛЛЫ ── */}
          <SectionTitle title={isUK ? 'ПЕЙВОЛИ' : 'ПЕЙВОЛЛЫ'} t={t} f={f} />
          {([
            { label: isUK ? '🎓 Урок 19 — B1 контент'         : '🎓 Урок 19 — B1 контент',      params: { context: 'lesson_b1',       lessons_done: '18' } },
            { label: isUK ? '⚡ Квізи — ліміт вичерпано'      : '⚡ Квизы — лимит исчерпан',     params: { context: 'quiz_limit'  } },
            { label: isUK ? '🧠 Квіз рівень B1/B2'            : '🧠 Квиз уровень B1/B2',         params: { context: 'quiz_level',      level: 'medium' } },
            { label: isUK ? '📚 Картки — переповнено'         : '📚 Карточки — переполнено',      params: { context: 'flashcard_limit', saved: '20' } },
            { label: isUK ? '🔥 Стрік під загрозою (7 днів)'  : '🔥 Стрик под угрозой (7 дней)', params: { context: 'streak',          streak: '7' } },
            { label: isUK ? '💬 Діалог заблоковано'           : '💬 Диалог заблокирован',         params: { context: 'dialog' } },
            { label: isUK ? '💎 Загальний (з налаштувань)'    : '💎 Общий (из настроек)',          params: { context: 'generic' } },
          ] as { label: string; params: Record<string, string> }[]).map(({ label, params: p }) => (
            <ButtonRow
              key={p.context}
              icon="card-outline"
              label={label}
              sub={p.context}
              onPress={() => router.push({ pathname: '/premium_modal', params: p } as any)}
              t={t} f={f} doHaptic={doHaptic}
            />
          ))}

          {/* ── ВСПЛЫВАЮЩИЕ ОКНА ── */}
          <SectionTitle title={isUK ? 'СПЛИВАЮЧІ ВІКНА' : 'ВСПЛЫВАЮЩИЕ ОКНА'} t={t} f={f} />
          <ButtonRow
            icon="star-outline"
            label={isUK ? '🏅 Тост — досягнення' : '🏅 Тост — достижение'}
            sub={isUK ? 'Показати тост з нагородою' : 'Показать тост с наградой'}
            onPress={() => {
              const testAch = ALL_ACHIEVEMENTS.find(a => a.id === 'streak_7') ?? ALL_ACHIEVEMENTS[0];
              if (testAch) showAchievement(testAch);
            }}
            t={t} f={f} doHaptic={doHaptic}
          />
          <ButtonRow
            icon="trophy-outline"
            label={isUK ? '🏆 Фінал тижня — ліга' : '🏆 Финал недели — лига'}
            sub={isUK ? 'Показати результат тижня' : 'Показать результат недели'}
            onPress={triggerEndOfWeek}
            t={t} f={f} doHaptic={doHaptic}
          />
          <ButtonRow
            icon="diamond-outline"
            label={isUK ? '💎 Екран успіху Premium' : '💎 Экран успеха Premium'}
            sub={isUK ? 'Красивий екран після покупки' : 'Красивый экран после покупки'}
            onPress={() => router.push({ pathname: '/premium_modal', params: { context: 'generic', _preview_success: '1' } } as any)}
            t={t} f={f} doHaptic={doHaptic}
          />
          <ButtonRow
            icon="play-circle-outline"
            label={isUK ? '👋 Онбординг' : '👋 Онбординг'}
            sub={isUK ? 'Переглянути повторно' : 'Просмотреть повторно'}
            onPress={async () => { await AsyncStorage.removeItem('onboarding_done'); router.replace('/(tabs)/home' as any); }}
            t={t} f={f} doHaptic={doHaptic}
          />

          <SectionTitle title={isUK ? 'Управління' : 'УПРАВЛЕНИЕ'} t={t} f={f} />
          <ButtonRow
            icon="refresh-outline"
            label={isUK ? 'Скинути ВСЕ дані' : 'Сбросить ВСЕ данные'}
            sub={isUK ? 'Видалити весь прогрес та налаштування' : 'Удалить весь прогресс и настройки'}
            danger
            t={t} f={f} doHaptic={doHaptic}
            onPress={() => {
              Alert.alert(
                isUK ? 'Скинути все?' : 'Сбросить все?',
                isUK ? 'Це видалить уроки, досягнення, рамки, енергію, XP та всі налаштування. Це не можна скасувати!' : 'Это удалит уроки, достижения, рамки, энергию, XP и все настройки. Это нельзя отменить!',
                [
                  { text: isUK ? 'Скасувати' : 'Отмена', onPress: () => {}, style: 'cancel' },
                  { text: isUK ? 'Скинути' : 'Сбросить', onPress: async () => {
                    try {
                      // Уроки — прогресс, оценки, слова, слушание, медали
                      const lessonKeys = Array.from({ length: 32 }, (_, i) => [
                        `lesson${i + 1}_progress`,
                        `lesson${i + 1}_cellIndex`,
                        `lesson${i + 1}_score`,
                        `lesson${i + 1}_words`,
                        `lesson${i + 1}_listening_progress`,
                        `lesson${i + 1}_best_score`,
                        `lesson${i + 1}_pass_count`,
                        `lesson${i + 1}_intro_shown`,
                      ]).flat();

                      // Достижения и медали
                      const achievementKeys = [
                        'achievement_states',
                        'achievement_progress',
                        'medal_states',
                        'medal_tiers',
                        'achievements_v1',
                        'quiz_hard_count',
                      ];

                      // Рамки и аватары
                      const frameKeys = ['user_frame', 'user_avatar', 'unlocked_frames'];

                      // Энергия и XP
                      const systemKeys = ['user_total_xp', 'current_energy', 'last_energy_recovery'];

                      // Статистика и статус
                      const statsKeys = [
                        'streak_count', 'login_bonus_v1', 'daily_stats',
                        'streak_freeze', 'last_opened_lesson',
                      ];

                      // Лига и рейтинг
                      const leagueKeys = [
                        'league_state_v3',
                        'league_result_pending',
                        'week_leaderboard',
                        'my_week_points',
                      ];

                      // Экзамены (string level IDs used by level_exam.tsx + legacy numeric keys)
                      const examLevelIds = ['A1', 'A2', 'B1', 'B2'];
                      const examKeys = [
                        ...examLevelIds.flatMap(lvl => [
                          `level_exam_${lvl}_pct`,
                          `level_exam_${lvl}_passed`,
                          `level_exam_${lvl}_best_pct`,
                          `level_exam_${lvl}_medal_tier`,
                          `level_exam_${lvl}_pass_count`,
                        ]),
                        // Also clean up legacy numeric keys (1-4)
                        ...Array.from({ length: 4 }, (_, i) => [
                          `level_exam_${i + 1}_pct`,
                          `level_exam_${i + 1}_passed`,
                          `level_exam_${i + 1}_best_pct`,
                          `level_exam_${i + 1}_medal_tier`,
                          `level_exam_${i + 1}_pass_count`,
                        ]).flat(),
                      ];

                      // Тестер настройки
                      const testerKeys = [
                        'tester_no_limits',
                        'tester_energy_disabled',
                        'tester_no_premium',
                      ];

                      const allKeys = [
                        ...lessonKeys, ...achievementKeys, ...frameKeys,
                        ...systemKeys, ...statsKeys, ...leagueKeys,
                        ...examKeys, ...testerKeys,
                      ];

                      await AsyncStorage.multiRemove(allKeys);
                      invalidatePremiumCache();
                      DeviceEventEmitter.emit('premium_deactivated');
                      await reloadEnergy();

                      Alert.alert(
                        isUK ? 'Готово' : 'Готово',
                        isUK ? 'Всі дані скинуті на рівень 0' : 'Все данные сброшены на уровень 0'
                      );
                    } catch {
                      Alert.alert(isUK ? 'Помилка' : 'Ошибка', isUK ? 'Не вдалось скинути дані' : 'Не удалось сбросить данные');
                    }
                  }, style: 'destructive' }
                ]
              );
            }}
          />
          <ButtonRow
            icon="trash-outline"
            label={isUK ? 'Скинути статистику' : 'Сбросить статистику'}
            sub={isUK ? 'Скинути стрік та інші статистики' : 'Сбросить стрик и другую статистику'}
            danger
            t={t} f={f} doHaptic={doHaptic}
            onPress={() => {
              Alert.alert(
                isUK ? 'Скинути статистику?' : 'Сбросить статистику?',
                isUK ? 'Це видалить стрік, щоденну статистику та інші досягнення. Це не можна скасувати!' : 'Это удалит стрик, ежедневную статистику и другие достижения. Это нельзя отменить!',
                [
                  { text: isUK ? 'Скасувати' : 'Отмена', onPress: () => {}, style: 'cancel' },
                  { text: isUK ? 'Скинути' : 'Сбросить', onPress: async () => {
                    try {
                      await AsyncStorage.multiRemove(['streak_count', 'daily_stats', 'streak_freeze']);
                      Alert.alert(isUK ? 'Готово' : 'Готово', isUK ? 'Статистику скинуто' : 'Статистика сброшена');
                    } catch {
                      Alert.alert(isUK ? 'Помилка' : 'Ошибка', isUK ? 'Не вдалось скинути статистику' : 'Не удалось сбросить статистику');
                    }
                  }, style: 'destructive' }
                ]
              );
            }}
          />
        </ScrollView>
      </SafeAreaView>

      {leagueResult && (
        <LeagueResultModal
          visible={leagueResultVisible}
          result={leagueResult}
          onClose={() => setLeagueResultVisible(false)}
        />
      )}
    </ScreenGradient>
  );
}
