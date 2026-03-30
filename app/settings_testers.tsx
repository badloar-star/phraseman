import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { unlockAllAchievements } from './achievements';
import { unlockAllFrames } from '../constants/avatars';
import { checkLeagueOnAppOpen, CLUBS } from './league_engine';
import { getMyWeekPoints } from './hall_of_fame_utils';

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
  const [energyInstantRecovery, setEnergyInstantRecovery] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings to AsyncStorage
  const loadSettings = async () => {
    try {
      const [noLimits, noEnergy, instantEnergy] = await AsyncStorage.multiGet([
        'tester_no_limits',
        'tester_energy_disabled',
        'tester_energy_instant_recovery',
      ]);
      setNoLimitsEnabled(noLimits[1] === 'true');
      setEnergyDisabled(noEnergy[1] === 'true');
      setEnergyInstantRecovery(instantEnergy[1] === 'true');
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
  };

  const toggleEnergyDisabled = async (val: boolean) => {
    doHaptic();
    setEnergyDisabled(val);
    await saveSettings('tester_energy_disabled', val);
  };

  const toggleEnergyInstantRecovery = async (val: boolean) => {
    doHaptic();
    setEnergyInstantRecovery(val);
    await saveSettings('tester_energy_instant_recovery', val);
  };

  const addXP = async () => {
    doHaptic();
    try {
      const current = parseInt(await AsyncStorage.getItem('user_total_xp') || '0') || 0;
      await AsyncStorage.setItem('user_total_xp', String(current + 5000));
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
    Alert.alert(
      isUK ? 'Конец тижня?' : 'Конец недели?',
      isUK ? 'Це спровокує рух між клубами' : 'Это спровоцирует движение между клубами',
      [
        { text: isUK ? 'Скасувати' : 'Отмена', style: 'cancel' },
        {
          text: isUK ? 'Виконати' : 'Выполнить',
          onPress: async () => {
            try {
              const userName = await AsyncStorage.getItem('user_name') || 'TestUser';
              const myWeekPoints = await getMyWeekPoints();

              const result = await checkLeagueOnAppOpen(userName, myWeekPoints);

              if (result.result) {
                const { promoted, demoted, newLeagueId } = result.result;
                const newClub = CLUBS[newLeagueId];
                let msg = '';
                if (promoted) {
                  msg = isUK
                    ? `Підвищення! 🎉 Тепер ви в ${newClub.nameUK}`
                    : `Повышение! 🎉 Теперь вы в ${newClub.nameRU}`;
                } else if (demoted) {
                  msg = isUK
                    ? `Пониження 📉 Тепер ви в ${newClub.nameUK}`
                    : `Понижение 📉 Теперь вы в ${newClub.nameRU}`;
                } else {
                  msg = isUK
                    ? `На місці 📍 Залишилися в ${newClub.nameUK}`
                    : `На месте 📍 Остались в ${newClub.nameRU}`;
                }
                Alert.alert('OK', msg);
              }
            } catch {
              Alert.alert(isUK ? 'Помилка' : 'Ошибка', isUK ? 'Не вдалось виконати конец тижня' : 'Не удалось выполнить конец недели');
            }
          },
        },
      ]
    );
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

          <ToggleRow
            icon="flash"
            label={isUK ? 'Миттєве відновлення' : 'Моментальное восстановление'}
            sub={isUK ? 'Енергія відновлюється відразу' : 'Энергия восстанавливается сразу'}
            value={energyInstantRecovery}
            onToggle={toggleEnergyInstantRecovery}
            t={t} f={f}
          />

          <SectionTitle title={isUK ? 'Опит' : 'ОПЫТ'} t={t} f={f} />
          <ButtonRow
            icon="add-circle-outline"
            label={isUK ? 'Додати 5000 XP' : 'Добавить 5000 XP'}
            onPress={addXP}
            t={t} f={f} doHaptic={doHaptic}
          />

          <SectionTitle title={isUK ? 'Ліга' : 'ЛИГА'} t={t} f={f} />
          <ButtonRow
            icon="trophy-outline"
            label={isUK ? 'Конец недели' : 'Конец недели'}
            sub={isUK ? 'Рух между клубами' : 'Движение между клубами'}
            onPress={triggerEndOfWeek}
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

          <SectionTitle title={isUK ? 'Управління' : 'УПРАВЛЕНИЕ'} t={t} f={f} />
          <ButtonRow
            icon="play-circle-outline"
            label={isUK ? 'Переглянути онбординг' : 'Просмотреть онбординг'}
            sub={isUK ? 'Повторити пошаговое введення' : 'Повторить пошаговое введение'}
            onPress={async () => { await AsyncStorage.removeItem('onboarding_done'); router.replace('/(tabs)/home' as any); }}
            t={t} f={f} doHaptic={doHaptic}
          />
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
                      // Уроки
                      const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`);
                      // Достижения
                      const achievementKeys = ['achievement_states'];
                      // Рамки и аватары
                      const frameKeys = ['user_frame', 'user_avatar', 'unlocked_frames'];
                      // Энергия и XP
                      const systemKeys = ['user_total_xp', 'current_energy', 'last_energy_recovery'];
                      // Статистика
                      const statsKeys = ['streak_count', 'login_bonus_v1'];
                      // Тестер настройки
                      const testerKeys = ['tester_no_limits', 'tester_energy_disabled', 'tester_energy_instant_recovery'];

                      const allKeys = [...lessonKeys, ...achievementKeys, ...frameKeys, ...systemKeys, ...statsKeys, ...testerKeys];
                      await AsyncStorage.multiRemove(allKeys);

                      Alert.alert(isUK ? 'Готово' : 'Готово', isUK ? 'Всі дані скинуті' : 'Все данные сброшены');
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
    </ScreenGradient>
  );
}
