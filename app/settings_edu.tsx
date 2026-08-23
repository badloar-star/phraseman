import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import CustomSwitch from '../components/CustomSwitch';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SectionSheetHeader from '../components/SectionSheetHeader';
import { useTheme } from '../components/ThemeContext';
import { useAudio } from '../hooks/use-audio';
import {
  isFcAutoSpeakEnabled,
  isFcSfxEnabled,
  setFcAutoSpeakEnabled,
  setFcSfxEnabled,
} from './flashcards/SoundService';
import {
  applyUserSettingsNow,
  getUserSettingsSnapshot,
  loadSettings,
  normalizeSpeechRate,
  type UserSettings,
} from './user_settings_store';
import { safeRouterBack } from './navigation_back';
import { voicePlaybackPolicy } from '../modules/audio/voice_playback_policy';

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

export default function SettingsEdu() {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const { lang, s: loc } = useLang();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
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
    }, []),
  );

  const update = (key: keyof UserSettings, val: boolean | number) => {
    setS(prev => {
      const next = { ...prev, [key]: val };
      applyUserSettingsNow(next);
      return next;
    });
  };

  const L = (m: Record<string, string>): string => m[lang] ?? m.ru;

  const rows: { key: RowKey; label: string; sub: string }[] = [
    {
      key: 'autoCheck',
      label: L({
        ru: 'Автопроверка',
        uk: 'Автоперевірка',
        es: 'Comprobación automática',
        'pt-BR': 'Verificação automática',
        vi: 'Tự động kiểm tra',
        id: 'Periksa otomatis',
        tr: 'Otomatik kontrol',
        pl: 'Automatyczne sprawdzanie',
      }),
      sub: L({
        ru: 'Проверять при наборе последнего слова',
        uk: 'Перевіряти при наборі останнього слова',
        es: 'Comprobar al escribir la última palabra',
        'pt-BR': 'Verificar ao digitar a última palavra',
        vi: 'Kiểm tra khi nhập từ cuối cùng',
        id: 'Periksa saat mengetik kata terakhir',
        tr: 'Son kelimeyi yazınca kontrol et',
        pl: 'Sprawdzaj po wpisaniu ostatniego słowa',
      }),
    },
    {
      key: 'autoAdvance',
      label: L({
        ru: 'Автопереход после ответа',
        uk: 'Автоперехід після відповіді',
        es: 'Siguiente automático',
        'pt-BR': 'Avançar automaticamente',
        vi: 'Tự động chuyển tiếp',
        id: 'Lanjut otomatis',
        tr: 'Otomatik ilerleme',
        pl: 'Automatyczne przejście dalej',
      }),
      sub: L({
        ru: 'Переходить к следующему заданию при правильном ответе',
        uk: 'Переходити до наступного завдання при правильній відповіді',
        es: 'Pasar a la siguiente pregunta cuando aciertas',
        'pt-BR': 'Ir para a próxima tarefa quando acertar',
        vi: 'Chuyển sang câu tiếp theo khi trả lời đúng',
        id: 'Lanjut ke soal berikutnya saat jawaban benar',
        tr: 'Doğru cevapta sonraki göreve geç',
        pl: 'Przechodź do następnego zadania przy poprawnej odpowiedzi',
      }),
    },
    {
      key: 'hardMode',
      label: L({
        ru: 'Ввод с клавиатуры',
        uk: 'Введення з клавіатури',
        es: 'Escribir con el teclado',
        'pt-BR': 'Digitar no teclado',
        vi: 'Nhập bằng bàn phím',
        id: 'Ketik dengan keyboard',
        tr: 'Klavyeyle yazma',
        pl: 'Wpisywanie z klawiatury',
      }),
      sub: L({
        ru: 'Вводить ответ вручную вместо выбора слов',
        uk: 'Вводити відповідь вручну замість вибору слів',
        es: 'Escribir la respuesta completa con el teclado',
        'pt-BR': 'Digitar a resposta em vez de escolher palavras',
        vi: 'Tự gõ câu trả lời thay vì chọn từ',
        id: 'Ketik jawaban sendiri alih-alih memilih kata',
        tr: 'Kelime seçmek yerine cevabı elle yaz',
        pl: 'Wpisuj odpowiedź ręcznie zamiast wybierać słowa',
      }),
    },
    {
      key: 'haptics',
      label: L({
        ru: 'Вибрация при ошибке',
        uk: 'Вібрація при помилці',
        es: 'Vibración al fallar',
        'pt-BR': 'Vibração ao errar',
        vi: 'Rung khi sai',
        id: 'Getar saat salah',
        tr: 'Hatada titreşim',
        pl: 'Wibracja przy błędzie',
      }),
      sub: L({
        ru: 'Работает при включённом тактильном отклике (Настройки → Внешний вид и отклик)',
        uk: 'Працює за увімкненого тактильного відгуку (Налаштування → Вигляд і відгук)',
        es: 'Requiere la respuesta háptica activa (Ajustes → Apariencia y respuesta)',
        'pt-BR': 'Requer a resposta tátil ativa (Configurações → Aparência e resposta)',
        vi: 'Cần bật phản hồi rung (Cài đặt → Giao diện và phản hồi)',
        id: 'Perlu umpan balik haptik aktif (Pengaturan → Tampilan dan respons)',
        tr: 'Dokunsal geri bildirim açık olmalı (Ayarlar → Görünüm ve geri bildirim)',
        pl: 'Wymaga włączonej reakcji haptycznej (Ustawienia → Wygląd i reakcje)',
      }),
    },
  ];

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* зачем: стандарт «шторки раздела» — модал с выездом снизу, шапка
              с центрированным заголовком и крестиком вместо стрелки «назад». */}
          <SectionSheetHeader
            title={loc.edu.title}
            onClose={() => safeRouterBack(router, '/(tabs)/settings' as any)}
          />

          <BouncyScrollView decelerationRate="normal" showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            {rows.map(row => {
              const isOn = !!s[row.key];
              return (
                <View
                  key={row.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 0.5,
                    borderBottomColor: t.border,
                  }}
                >
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

            {
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 0.5,
                  borderBottomColor: t.border,
                }}
              >
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
                    // Preview the real OpenAI "echo" clip (this exact phrase has
                    // one in PHRASE_AUDIO_URL_MAP) so the user hears the actual
                    // app voice and its true loudness, not the robotic expo-speech
                    // voice. Reverts to TTS automatically if the clip is missing.
                        if (voicePlaybackPolicy.isEnabled()) {
                          speakAudio('a dark horse', rate, { language: 'en-US' });
                        }
                  }}
                  minimumTrackTintColor={t.textSecond}
                  maximumTrackTintColor={t.border}
                  thumbTintColor={t.textSecond}
                />
              </View>
            }
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
            void Haptics.selectionAsync();
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
          </BouncyScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
