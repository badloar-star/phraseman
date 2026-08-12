import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useRouter, useFocusEffect } from 'expo-router';
import CustomSwitch from '../components/CustomSwitch';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import {
  isFcAutoSpeakEnabled,
  isFcSfxEnabled,
  setFcAutoSpeakEnabled,
  setFcSfxEnabled,
} from './flashcards/SoundService';
import {
  type UserSettings,
  getUserSettingsSnapshot,
  loadSettings,
  applyUserSettingsNow,
  normalizeSpeechRate,
} from './user_settings_store';

export {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type UserSettings,
  getUserSettingsSnapshot,
  hydrateUserSettingsFromStorage,
  applyUserSettingsNow,
} from './user_settings_store';

const PREVIEW = 'She did not tell him about it';

export default function SettingsEdu() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang, s: loc } = useLang();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  /** Снимок после bootstrap — без «загрузки»; при фокусе подтягиваем с диска (облако и т.д.) */
  const [s, setS] = useState<UserSettings>(() => getUserSettingsSnapshot());
  // E9: тумблеры раздела карточек — «Звуковые эффекты» (fc_sfx_on) и
  // «Автопроизношение» (fc_autospeak_on), оба дефолт true (SoundService).
  const [fcSfx, setFcSfx] = useState(() => isFcSfxEnabled());
  const [fcAutoSpeak, setFcAutoSpeak] = useState(() => isFcAutoSpeakEnabled());

  useFocusEffect(
    useCallback(() => {
      void loadSettings().then(setS);
      setFcSfx(isFcSfxEnabled());
      setFcAutoSpeak(isFcAutoSpeakEnabled());
    }, [])
  );

  const update = (key: keyof UserSettings, val: boolean | number) => {
    setS(prev => {
      const next = { ...prev, [key]: val };
      applyUserSettingsNow(next);
      return next;
    });
  };

  const ROWS: { key: keyof UserSettings; label: string; labelUK: string; labelES: string; sub: string; subUK: string; subES: string }[] = [
    { key:'autoCheck',   label:'Автопроверка',             labelUK:'Автоперевірка',         labelES:'Comprobación automática', sub:'Проверять при наборе последнего слова',                                  subUK:'Перевіряти при наборі останнього слова', subES:'Comprobar al escribir la última palabra' },
    { key:'voiceOut',    label:'Озвучить ответ',            labelUK:'Озвучити відповідь',     labelES:'Leer la respuesta', sub:'Произносить фразу после ответа',                                        subUK:'Вимовляти фразу після відповіді', subES:'Leer la frase después de responder' },
    { key:'autoAdvance', label:'Автопереход после ответа', labelUK:'Автоперехід після відповіді', labelES:'Siguiente automático', sub:'Автоматически переходить к следующему заданию при правильном ответе', subUK:'Автоматично переходити до наступного завдання при правильній відповіді', subES:'Pasas a la siguiente pregunta cuando aciertas.' },
    { key:'hardMode',    label:'Ввод с клавиатуры',        labelUK:'Введення з клавіатури',  labelES:'Escribir con el teclado', sub:'Вводить ответ вручную вместо выбора слов (работает и в квизах)',          subUK:'Вводити відповідь вручну замість вибору слів (працює і в квізах)', subES:'Escribir la respuesta completa con el teclado (también en cuestionarios).' },
    { key:'haptics',    label:'Вибрация при ошибке',    labelUK:'Вібрація при помилці',   labelES:'Vibración al fallar', sub:'Тактильный сигнал при неправильном ответе',                              subUK:'Тактильний сигнал при неправильній відповіді', subES:'Pequeño aviso háptico si la respuesta es incorrecta.' },
  ];

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => {
          hapticTap();
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/home' as any);
        }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '600' }}>
          {loc.edu.title}
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
                {lang === 'uk' ? row.labelUK : lang === 'es' ? row.labelES : row.label}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 3 }}>
                {lang === 'uk' ? row.subUK : lang === 'es' ? row.subES : row.sub}
              </Text>
            </View>
            <CustomSwitch value={isOn} onValueChange={val => update(row.key, val)} />
          </View>
        );
      })}

      {/* E9: тумблеры звука раздела «Карточки и тренировки» (§5 Cards 2.0) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }} testID="fc-sfx-row">
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '500' }}>
            {lang === 'uk' ? 'Звукові ефекти' : lang === 'es' ? 'Efectos de sonido' : 'Звуковые эффекты'}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 3 }}>
            {lang === 'uk'
              ? 'Короткі звуки у картках і тренуваннях'
              : lang === 'es'
                ? 'Sonidos breves en tarjetas y entrenamientos'
                : 'Короткие звуки в карточках и тренировках'}
          </Text>
        </View>
        <CustomSwitch
          testID="fc-sfx-toggle"
          value={fcSfx}
          onValueChange={val => {
            setFcSfx(val);
            void setFcSfxEnabled(val);
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }} testID="fc-autospeak-row">
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '500' }}>
            {lang === 'uk' ? 'Автовимова' : lang === 'es' ? 'Pronunciación automática' : 'Автопроизношение'}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 3 }}>
            {lang === 'uk'
              ? 'Озвучувати англійську фразу після відповіді'
              : lang === 'es'
                ? 'Leer la frase en inglés después de responder'
                : 'Озвучивать английскую фразу после ответа'}
          </Text>
        </View>
        <CustomSwitch
          testID="fc-autospeak-toggle"
          value={fcAutoSpeak}
          onValueChange={val => {
            setFcAutoSpeak(val);
            void setFcAutoSpeakEnabled(val);
          }}
        />
      </View>

      {/* E13: выбор TTS-голоса для EN (fc_voice_prefs_v1) — экран flashcards_voice_picker */}
      <TouchableOpacity
        testID="fc-voice-picker-row"
        accessibilityLabel="qa-fc-voice-picker-row"
        accessible
        activeOpacity={0.75}
        onPress={() => {
          hapticTap();
          router.push('/flashcards_voice_picker' as any);
        }}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '500' }}>
            {lang === 'uk' ? 'Голос озвучення (EN)' : lang === 'es' ? 'Voz de lectura (EN)' : 'Голос озвучки (EN)'}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 3 }}>
            {lang === 'uk'
              ? 'Вибір голосу і швидкості для англійської'
              : lang === 'es'
                ? 'Elige la voz y la velocidad para el inglés'
                : 'Выбор голоса и скорости для английского'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
      </TouchableOpacity>

      {s.voiceOut && <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '500' }}>
            {loc.edu.speed}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: 16, fontWeight: '600' }}>{s.speechRate.toFixed(1)}x</Text>
        </View>
        <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 6 }}>
          {loc.edu.speedHint}
        </Text>
        <Slider
          style={{ width: '100%', height: 44 }}
          minimumValue={0.5} maximumValue={1.0} step={0.1}
          value={normalizeSpeechRate(s.speechRate)}
          onValueChange={v => setS(prev => ({ ...prev, speechRate: normalizeSpeechRate(v) }))}
          onSlidingComplete={v => {
            const rate = normalizeSpeechRate(v);
            update('speechRate', rate);
            stopAudio();
            speakAudio(PREVIEW, rate);
          }}
          minimumTrackTintColor={t.textSecond}
          maximumTrackTintColor={t.border}
          thumbTintColor={t.textSecond}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: t.textMuted, fontSize: 11 }}>0.5x  {loc.edu.speedSlowLabel}</Text>
          <Text style={{ color: t.textMuted, fontSize: 11 }}>{loc.edu.speedFastLabel}  1.0x</Text>
        </View>
      </View>}
      </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
