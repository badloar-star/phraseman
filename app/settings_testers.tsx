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
import ContentWrap from '../components/ContentWrap';
import { unlockAllAchievements } from './achievements';

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
    Alert.alert(
      isUK ? 'Добавить 5000 XP?' : 'Добавить 5000 XP?',
      '',
      [
        { text: isUK ? 'Отмена' : 'Отмена', style: 'cancel' },
        {
          text: isUK ? 'Добавить' : 'Добавить',
          onPress: async () => {
            try {
              const current = parseInt(await AsyncStorage.getItem('user_total_xp') || '0') || 0;
              await AsyncStorage.setItem('user_total_xp', String(current + 5000));
              Alert.alert('OK', '5000 XP добавлено');
            } catch {
              Alert.alert('Ошибка', 'Не удалось добавить XP');
            }
          },
        },
      ]
    );
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
              // Разблокиваем все достижения в базе данных
              await unlockAllAchievements();
              Alert.alert('OK', isUK ? 'Все разблокировано' : 'Все разблокировано');
            } catch {
              Alert.alert('Ошибка', isUK ? 'Ошибка разблокировки' : 'Ошибка разблокировки');
            }
          },
        },
      ]
    );
  };

  const ToggleRow = ({ icon, label, sub, value, onToggle }: {
    icon: string; label: string; sub?: string; value: boolean; onToggle: (val: boolean) => void;
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

  const ButtonRow = ({ icon, label, sub, onPress, danger }: {
    icon: string; label: string; sub?: string; onPress: () => void; danger?: boolean;
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

  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
      {title}
    </Text>
  );

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header with Back Button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
                {isUK ? 'Функції для тестерів' : 'Функции для тестеров'}
              </Text>
            </View>
          </View>
        </ContentWrap>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          <SectionTitle title={isUK ? 'Активи' : 'АКТИВЫ'} />
          <ToggleRow
            icon="lock-open-outline"
            label={isUK ? 'Без обмежень' : 'Без ограничений'}
            sub={isUK ? 'Всі уроки і екзамени доступні' : 'Все уроки и экзамены доступны'}
            value={noLimitsEnabled}
            onToggle={toggleNoLimits}
          />

          <SectionTitle title={isUK ? 'Енергія' : 'ЭНЕРГИЯ'} />
          <ToggleRow
            icon="flash-outline"
            label={isUK ? 'Енергія не витрачається' : 'Энергия не тратится'}
            sub={isUK ? 'Уроки не будуть коштувати енергію' : 'Уроки не будут стоить энергию'}
            value={energyDisabled}
            onToggle={toggleEnergyDisabled}
          />

          <ToggleRow
            icon="flash"
            label={isUK ? 'Миттєве відновлення' : 'Моментальное восстановление'}
            sub={isUK ? 'Енергія відновлюється відразу' : 'Энергия восстанавливается сразу'}
            value={energyInstantRecovery}
            onToggle={toggleEnergyInstantRecovery}
          />

          <SectionTitle title={isUK ? 'Опит' : 'ОПЫТ'} />
          <ButtonRow
            icon="add-circle-outline"
            label={isUK ? 'Додати 5000 XP' : 'Добавить 5000 XP'}
            onPress={addXP}
          />

          <SectionTitle title={isUK ? 'Досягнення' : 'ДОСТИЖЕНИЯ'} />
          <ButtonRow
            icon="star-outline"
            label={isUK ? 'Розблокувати все' : 'Разблокировать всё'}
            sub={isUK ? 'Досягнення та рамки' : 'Достижения и рамки'}
            onPress={unlockAllAchievementsHandler}
          />
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
