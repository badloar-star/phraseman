import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import CustomSwitch from '../components/CustomSwitch';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { hapticTap } from '../hooks/use-haptics';

const SETTINGS_KEY = 'user_settings';
const PREVIEW = 'She did not tell him about it';

export const DEFAULT_SETTINGS = {
  autoCheck:      false,
  voiceOut:       true,
  speechRate:     1.0,
  hardMode:       false,
  autoAdvance:    false,
  haptics:        true,
  immediateCheck: false,
  showHints:      true,
};

export type UserSettings = typeof DEFAULT_SETTINGS;

export const loadSettings = async (): Promise<UserSettings> => {
  try {
    const s = await AsyncStorage.getItem(SETTINGS_KEY);
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
};

export const saveSettings = async (s: UserSettings) => {
  try { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
};

export default function SettingsEdu() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const [s, setS] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => { loadSettings().then(setS); }, []);

  const update = async (key: keyof UserSettings, val: boolean | number) => {
    const next = { ...s, [key]: val };
    setS(next);
    await saveSettings(next);
  };

  const ROWS: { key: keyof UserSettings; label: string; labelUK: string; sub: string; subUK: string }[] = [
    { key:'autoCheck',   label:'Автопроверка',             labelUK:'Автоперевірка',         sub:'Проверять при наборе последнего слова',                                  subUK:'Перевіряти при наборі останнього слова' },
    { key:'voiceOut',    label:'Озвучить ответ',            labelUK:'Озвучити відповідь',     sub:'Произносить фразу после ответа',                                        subUK:'Вимовляти фразу після відповіді' },
    { key:'autoAdvance', label:'Автопереход после ответа', labelUK:'Автоперехід після відповіді', sub:'Автоматически переходить к следующему заданию при правильном ответе', subUK:'Автоматично переходити до наступного завдання при правильній відповіді' },
    { key:'hardMode',    label:'Ввод с клавиатуры',        labelUK:'Введення з клавіатури',  sub:'Вводить ответ вручную вместо выбора слов (работает и в квизах)',          subUK:'Вводити відповідь вручну замість вибору слів (працює і в квізах)' },
    { key:'haptics',    label:'Вибрация при ошибке',    labelUK:'Вібрація при помилці',   sub:'Тактильный сигнал при неправильном ответе',                              subUK:'Тактильний сигнал при неправильній відповіді' },
    { key:'showHints',  label:'Подсказки после ответа', labelUK:'Підказки після відповіді', sub:'Показывать карточки с объяснением после каждого ответа',                subUK:'Показувати картки з поясненням після кожної відповіді' },
  ];

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => { hapticTap(); router.back(); }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '600' }}>
          {isUK ? 'Налаштування навчання' : 'Настройки обучения'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
      {ROWS.map(row => {
        const isOn = !!s[row.key];
        return (
          <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '500' }}>
                {isUK ? row.labelUK : row.label}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 3 }}>
                {isUK ? row.subUK : row.sub}
              </Text>
            </View>
            <CustomSwitch value={isOn} onValueChange={val => update(row.key, val)} />
          </View>
        );
      })}

      {s.voiceOut && <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '500' }}>
            {isUK ? 'Швидкість вимови' : 'Скорость произношения'}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: 16, fontWeight: '600' }}>{s.speechRate.toFixed(1)}x</Text>
        </View>
        <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 6 }}>
          {isUK ? 'Відпусти повзунок — прозвучить приклад' : 'Отпусти ползунок — прозвучит пример'}
        </Text>
        <Slider
          style={{ width: '100%', height: 44 }}
          minimumValue={0.5} maximumValue={1.2} step={0.1}
          value={Math.min(s.speechRate, 1.2)}
          onValueChange={v => setS(prev => ({ ...prev, speechRate: Math.round(v * 10) / 10 }))}
          onSlidingComplete={v => {
            const rate = Math.round(v * 10) / 10;
            update('speechRate', rate);
            Speech.speak(PREVIEW, { rate, language: 'en-US' });
          }}
          minimumTrackTintColor={t.textSecond}
          maximumTrackTintColor={t.border}
          thumbTintColor={t.textSecond}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: t.textMuted, fontSize: 11 }}>0.5x  {isUK ? 'Повільно' : 'Медленно'}</Text>
          <Text style={{ color: t.textMuted, fontSize: 11 }}>{isUK ? 'Швидко' : 'Быстро'}  1.2x</Text>
        </View>
      </View>}
      </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}

