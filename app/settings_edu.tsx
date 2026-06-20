import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import CustomSwitch from '../components/CustomSwitch';
import CompassDepthSurface from '../components/CompassDepthSurface';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useAudio } from '../hooks/use-audio';
import { hapticTap } from '../hooks/use-haptics';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import {
  applyUserSettingsNow,
  getUserSettingsSnapshot,
  loadSettings,
  normalizeSpeechRate,
  type UserSettings,
} from './user_settings_store';
import { safeRouterBack } from './navigation_back';

export {
  DEFAULT_SETTINGS,
  applyUserSettingsNow,
  getUserSettingsSnapshot,
  hydrateUserSettingsFromStorage,
  loadSettings,
  normalizeSpeechRate,
  saveSettings,
  type UserSettings,
} from './user_settings_store';

type RowKey = Exclude<keyof UserSettings, 'speechRate' | 'speechVoiceId'>;

const ACCENT_LABELS: Record<string, string> = {
  'en-au': 'Australian',
  'en-gb': 'British',
  'en-us': 'American',
  'en-in': 'Indian',
  'en-nz': 'New Zealand',
  'en-za': 'South African',
  'en-ie': 'Irish',
  'en-ca': 'Canadian',
};

function formatVoiceLabel(voice: Voice): string {
  const lang = (voice.language ?? '').toLowerCase();
  const accent = ACCENT_LABELS[lang] ?? ACCENT_LABELS[lang.slice(0, 5)] ?? 'English';

  // identifier like "en-au-x-aua-local" → extract variant letter (aua→A, aub→B, auc→C)
  const id = (voice.identifier ?? '').toLowerCase();
  const variantMatch = /x-([a-z]{2,4})-(local|network)/.exec(id);
  const type = id.includes('network') ? 'Online' : 'Local';

  if (variantMatch) {
    const variantCode = variantMatch[1]; // e.g. "aua", "aub", "gba"
    const letter = variantCode.slice(-1).toUpperCase(); // A, B, C…
    return `${accent} ${letter} · ${type}`;
  }

  // fallback: use name as-is if it's already human-readable
  const name = voice.name ?? '';
  if (name && !/^en-/i.test(name)) return `${name} · ${accent}`;

  return `${accent} · ${type}`;
}

export default function SettingsEdu() {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const isCompassTheme = false;
  const { lang, s: loc } = useLang();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const [s, setS] = useState<UserSettings>(() => getUserSettingsSnapshot());
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadSettings().then(setS);
    }, []),
  );

  const update = (key: keyof UserSettings, val: boolean | number) => {
    setS(prev => {
      const next = { ...prev, [key]: val };
      applyUserSettingsNow(next);
      return next;
    });
  };

  const updateVoice = (voiceId: string) => {
    setS(prev => {
      const next = { ...prev, speechVoiceId: voiceId };
      applyUserSettingsNow(next);
      return next;
    });
    stopAudio();
    speakAudio('I speak English every day', s.speechRate, { language: 'en-US', voice: voiceId });
  };

  const L = (ru: string, uk: string, es: string) => (
    lang === 'uk' ? uk : lang === 'es' ? es : ru
  );

  const rows: { key: RowKey; label: string; sub: string }[] = [
    {
      key: 'autoCheck',
      label: L('Автопроверка', 'Автоперевірка', 'Comprobación automática'),
      sub: L('Проверять при наборе последнего слова', 'Перевіряти при наборі останнього слова', 'Comprobar al escribir la última palabra'),
    },
    {
      key: 'voiceOut',
      label: L('Озвучить ответ', 'Озвучити відповідь', 'Leer la respuesta'),
      sub: L('Произносить фразу после ответа', 'Вимовляти фразу після відповіді', 'Leer la frase después de responder'),
    },
    {
      key: 'autoAdvance',
      label: L('Автопереход после ответа', 'Автоперехід після відповіді', 'Siguiente automático'),
      sub: L('Переходить к следующему заданию при правильном ответе', 'Переходити до наступного завдання при правильній відповіді', 'Pasar a la siguiente pregunta cuando aciertas'),
    },
    {
      key: 'hardMode',
      label: L('Ввод с клавиатуры', 'Введення з клавіатури', 'Escribir con el teclado'),
      sub: L('Вводить ответ вручную вместо выбора слов', 'Вводити відповідь вручну замість вибору слів', 'Escribir la respuesta completa con el teclado'),
    },
    {
      key: 'haptics',
      label: L('Вибрация при ошибке', 'Вібрація при помилці', 'Vibración al fallar'),
      sub: L('Тактильный сигнал при неправильном ответе', 'Тактильний сигнал при неправильній відповіді', 'Pequeño aviso háptico si la respuesta es incorrecta'),
    },
  ];

  useEffect(() => {
    let cancelled = false;
    Speech.getAvailableVoicesAsync()
      .then(list => {
        if (!cancelled) setVoices(list);
      })
      .catch(() => {
        if (!cancelled) setVoices([]);
      });
    return () => { cancelled = true; };
  }, []);

  const englishVoices = useMemo(() => {
    const unique = new Map<string, Voice>();
    for (const voice of voices) {
      if (voice.identifier && voice.language?.toLowerCase().startsWith('en')) {
        unique.set(voice.identifier, voice);
      }
    }
    return Array.from(unique.values()).sort((a, b) => {
      const langCompare = String(a.language).localeCompare(String(b.language));
      return langCompare || String(a.name).localeCompare(String(b.name));
    });
  }, [voices]);

  const currentVoiceName = s.speechVoiceId
    ? englishVoices.find(v => v.identifier === s.speechVoiceId)?.name ?? L('Выбранный голос', 'Вибраний голос', 'Selected voice')
    : L('Системный голос', 'Системний голос', 'System voice');

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => {
                hapticTap();
                safeRouterBack(router, '/(tabs)/settings' as any);
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: isCompassTheme ? 8 : 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : 'transparent',
                borderWidth: isCompassTheme ? 0.5 : 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent',
                overflow: 'hidden',
                ...(isCompassTheme ? compassShadow(1) : {}),
              }}
            >
              {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '600' }}>
              {loc.edu.title}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <BouncyScrollView decelerationRate="normal" showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            {rows.map(row => {
              const isOn = !!s[row.key];
              return (
                <View
                  key={row.key}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                      borderBottomWidth: isCompassTheme ? 0 : 0.5,
                      borderBottomColor: t.border,
                    },
                    isCompassTheme && {
                      marginHorizontal: 16,
                      marginVertical: 4,
                      borderRadius: 8,
                      borderWidth: 0.5,
                      borderColor: COMPASS_RICH.hairlineQuiet,
                      backgroundColor: COMPASS_RICH.charcoalRaised,
                      overflow: 'hidden',
                    },
                    isCompassTheme && compassShadow(1),
                  ]}
                >
                  {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '500' }}>
                      {row.label}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 3 }}>
                      {row.sub}
                    </Text>
                  </View>
                  <CustomSwitch value={isOn} onValueChange={val => update(row.key, val)} />
                </View>
              );
            })}

            {s.voiceOut ? (
              <View
                style={[
                  {
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: isCompassTheme ? 0 : 0.5,
                    borderBottomColor: t.border,
                  },
                  isCompassTheme && {
                    marginHorizontal: 16,
                    marginVertical: 4,
                    borderRadius: 8,
                    borderWidth: 0.5,
                    borderColor: COMPASS_RICH.hairlineQuiet,
                    backgroundColor: COMPASS_RICH.charcoalRaised,
                    overflow: 'hidden',
                  },
                  isCompassTheme && compassShadow(1),
                ]}
              >
                {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '500' }}>
                    {loc.edu.speed}
                  </Text>
                  <Text style={{ color: t.textSecond, fontSize: 16, fontWeight: '600' }}>
                    {normalizeSpeechRate(s.speechRate).toFixed(1)}x
                  </Text>
                </View>
                <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 6 }}>
                  {loc.edu.speedHint}
                </Text>
                <Slider
                  style={{ width: '100%', height: 44 }}
                  minimumValue={0.8}
                  maximumValue={1.3}
                  step={0.1}
                  value={normalizeSpeechRate(s.speechRate)}
                  onValueChange={v => setS(prev => ({ ...prev, speechRate: normalizeSpeechRate(v) }))}
                  onSlidingComplete={v => {
                    const rate = normalizeSpeechRate(v);
                    update('speechRate', rate);
                    stopAudio();
                    speakAudio('I speak English every day', rate, { language: 'en-US' });
                  }}
                  minimumTrackTintColor={t.textSecond}
                  maximumTrackTintColor={t.border}
                  thumbTintColor={t.textSecond}
                />

                <View style={{ marginTop: 12 }}>
                  {/* Row: label + current voice + change button */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '500' }}>
                      {L('Голос', 'Голос', 'Voice')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => { hapticTap(); setVoicePickerOpen(v => !v); }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalSoft : t.bgCard,
                        borderWidth: 1,
                        borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                        borderRadius: isCompassTheme ? 8 : 10,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        overflow: 'hidden',
                        ...(isCompassTheme ? compassShadow(1) : {}),
                      }}
                    >
                      {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
                      <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                        {currentVoiceName}
                      </Text>
                      <Ionicons name={voicePickerOpen ? 'chevron-up' : 'chevron-down'} size={14} color={t.accent} />
                    </TouchableOpacity>
                  </View>

                  {/* Expandable voice list */}
                  {voicePickerOpen ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      <TouchableOpacity
                        onPress={() => { updateVoice(''); setVoicePickerOpen(false); }}
                        style={{
                          borderWidth: 1,
                          borderColor: isCompassTheme ? (!s.speechVoiceId ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet) : !s.speechVoiceId ? t.accent : t.border,
                          backgroundColor: isCompassTheme ? (!s.speechVoiceId ? COMPASS_RICH.champagne : COMPASS_RICH.charcoalRaised) : !s.speechVoiceId ? `${t.accent}22` : t.bgCard,
                          borderRadius: isCompassTheme ? 8 : 10,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          overflow: 'hidden',
                          ...(isCompassTheme && !s.speechVoiceId ? compassShadow(1) : {}),
                        }}
                      >
                        {isCompassTheme ? <CompassDepthSurface radius={8} quiet={!!s.speechVoiceId} cream={!s.speechVoiceId} /> : null}
                        <Text style={{ color: isCompassTheme ? (!s.speechVoiceId ? COMPASS_RICH.textDark : t.textPrimary) : !s.speechVoiceId ? t.accent : t.textPrimary, fontSize: 13, fontWeight: '700' }}>
                          {L('Системный', 'Системний', 'System')}
                        </Text>
                      </TouchableOpacity>
                      {englishVoices.map(voice => {
                        const selected = s.speechVoiceId === voice.identifier;
                        return (
                          <TouchableOpacity
                            key={voice.identifier}
                            onPress={() => { updateVoice(voice.identifier); setVoicePickerOpen(false); }}
                            style={{
                              borderWidth: 1,
                              borderColor: isCompassTheme ? (selected ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet) : selected ? t.accent : t.border,
                              backgroundColor: isCompassTheme ? (selected ? COMPASS_RICH.champagne : COMPASS_RICH.charcoalRaised) : selected ? `${t.accent}22` : t.bgCard,
                              borderRadius: isCompassTheme ? 8 : 10,
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              overflow: 'hidden',
                              ...(isCompassTheme && selected ? compassShadow(1) : {}),
                            }}
                          >
                            {isCompassTheme ? <CompassDepthSurface radius={8} quiet={!selected} cream={selected} /> : null}
                            <Text style={{ color: isCompassTheme ? (selected ? COMPASS_RICH.textDark : t.textPrimary) : selected ? t.accent : t.textPrimary, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                              {formatVoiceLabel(voice)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      {englishVoices.length === 0 ? (
                        <Text style={{ color: t.textMuted, fontSize: 12 }}>
                          {L('Голосов не найдено. Попробуй скачать английский язык в настройках телефона.', 'Голосів не знайдено. Спробуйте завантажити англійську мову в налаштуваннях телефону.', 'No voices found. Try downloading English in your phone settings.')}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Fun disclaimer */}
                  <View
                    style={[
                      {
                        marginTop: 4,
                        backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalSoft : `${t.accent}12`,
                        borderRadius: isCompassTheme ? 8 : 12,
                        padding: 14,
                        borderWidth: isCompassTheme ? 0.5 : 0,
                        borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent',
                        overflow: 'hidden',
                      },
                      isCompassTheme && compassShadow(1),
                    ]}
                  >
                    {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
                    <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>
                      {L('🎙️ Почему голос звучит странно?', '🎙️ Чому голос звучить дивно?', '🎙️ Why does the voice sound odd?')}
                    </Text>
                    <Text style={{ color: t.textSecond, fontSize: 13, lineHeight: 20 }}>
                      {L(
                        'У нас нет записанной озвучки — фразы произносит встроенный голосовой помощник вашего телефона (Android или iOS). Именно он отвечает за качество произношения.\n\nМы бы рады нанять настоящего британца с безупречным акцентом, но спонсора пока нет. Так что если ударение не там — спасибо телефону. 😅',
                        'У нас немає записаного озвучення — фрази вимовляє вбудований голосовий помічник вашого телефону (Android або iOS). Саме він відповідає за якість вимови.\n\nМи б раді найняти справжнього британця з бездоганним акцентом, але спонсора поки немає. Тож якщо наголос не там — дякуємо телефону. 😅',
                        'We have no recorded voice — phrases are spoken by your phone\'s built-in voice assistant (Android or iOS). It\'s fully responsible for pronunciation quality.\n\nWe\'d love to hire a real British actor with a flawless accent, but no sponsor yet. So if the stress sounds off — thank your phone. 😅',
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </BouncyScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
