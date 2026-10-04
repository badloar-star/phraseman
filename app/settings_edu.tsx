import Ionicons from '@expo/vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import PressableHybrid from '../components/PressableHybrid';
import SafeLinearGradient from '../components/SafeLinearGradient';
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
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

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

type LocalSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
  accessibilityLabel: string;
  glass: ReturnType<typeof liquidGlassTokens>;
};

function LocalSwitch({ value, onValueChange, testID, accessibilityLabel, glass }: LocalSwitchProps) {
  return (
    <PressableHybrid
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      withHaptic={false}
      withSound={false}
      variant="chip"
      style={{ width: 48, minWidth: 48, minHeight: 48, alignSelf: 'center' }}
      contentStyle={{ width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
    >
      <View
        style={{
          width: 48,
          height: 29,
          borderRadius: 16,
          padding: 3,
          justifyContent: 'center',
          backgroundColor: value ? glass.selected : glass.opaqueControl,
          borderWidth: 1,
          borderColor: glass.glassEdge,
        }}
      >
        <View
          style={{
            width: 21,
            height: 21,
            borderRadius: 11,
            backgroundColor: value ? glass.lightTint : glass.secondary,
            transform: [{ translateX: value ? 19 : 0 }],
          }}
        />
      </View>
    </PressableHybrid>
  );
}

export default function SettingsEdu() {
  const router = useRouter();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const { lang, s: loc } = useLang();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
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

  const rows: { key: RowKey; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    {
      key: 'autoCheck',
      icon: 'checkmark-circle-outline',
      label: L({
        ru: 'Автопроверка',
        uk: 'Автоперевірка',
        en: 'Auto-check',
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
        en: 'Check when the last word is typed',
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
      icon: 'arrow-forward-outline',
      label: L({
        ru: 'Автопереход после ответа',
        uk: 'Автоперехід після відповіді',
        en: 'Advance after answering',
        es: 'Siguiente automático',
        'pt-BR': 'Avançar automaticamente',
        vi: 'Tự động chuyển tiếp',
        id: 'Lanjut otomatis',
        tr: 'Otomatik ilerleme',
        pl: 'Automatyczne przejście dalej',
      }),
      sub: L({
        ru: 'После верного ответа следующее задание откроется само. Выключи, если хочешь остановиться и перечитать ответ.',
        uk: 'Після правильної відповіді наступне завдання відкриється саме. Вимкни, якщо хочеш зупинитися й перечитати відповідь.',
        en: 'After a correct answer, the next task opens automatically. Turn it off if you want to pause and reread the answer.',
        es: 'Tras acertar, se abre la siguiente tarea. Desactívalo si quieres detenerte y releer la respuesta.',
        'pt-BR': 'Após acertar, a próxima tarefa abre sozinha. Desative para parar e reler a resposta.',
        vi: 'Sau câu trả lời đúng, bài tiếp theo tự mở. Tắt nếu muốn dừng lại và đọc lại đáp án.',
        id: 'Setelah jawaban benar, soal berikutnya terbuka otomatis. Matikan untuk berhenti dan membaca ulang jawaban.',
        tr: 'Doğru cevaptan sonra sonraki görev açılır. Durup cevabı yeniden okumak istersen kapat.',
        pl: 'Po poprawnej odpowiedzi kolejne zadanie otworzy się samo. Wyłącz, jeśli chcesz się zatrzymać i przeczytać odpowiedź ponownie.',
      }),
    },
    {
      key: 'hardMode',
      icon: 'key-outline',
      label: L({
        ru: 'Ввод с клавиатуры',
        uk: 'Введення з клавіатури',
        en: 'Type with keyboard',
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
        en: 'Type the answer instead of choosing words',
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
      icon: 'flash-outline',
      label: L({
        ru: 'Вибрация при ошибке',
        uk: 'Вібрація при помилці',
        en: 'Vibrate on mistakes',
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
        en: 'Works when haptic feedback is enabled (Settings → Appearance and feedback)',
        es: 'Requiere la respuesta háptica activa (Ajustes → Apariencia y respuesta)',
        'pt-BR': 'Requer a resposta tátil ativa (Configurações → Aparência e resposta)',
        vi: 'Cần bật phản hồi rung (Cài đặt → Giao diện và phản hồi)',
        id: 'Perlu umpan balik haptik aktif (Pengaturan → Tampilan dan respons)',
        tr: 'Dokunsal geri bildirim açık olmalı (Ayarlar → Görünüm ve geri bildirim)',
        pl: 'Wymaga włączonej reakcji haptycznej (Ustawienia → Wygląd i reakcje)',
      }),
    },
  ];

  const soundRows = [
    {
      testID: 'fc-sfx-toggle',
      value: fcSfx,
      label: L({ ru: 'Звуковые эффекты', uk: 'Звукові ефекти', en: 'Sound effects', es: 'Efectos de sonido', 'pt-BR': 'Efeitos sonoros', vi: 'Hiệu ứng âm thanh', id: 'Efek suara', tr: 'Ses efektleri', pl: 'Efekty dźwiękowe' }),
      sub: L({ ru: 'Короткие звуки в карточках и тренировках', uk: 'Короткі звуки у картках і тренуваннях', en: 'Brief sounds in cards and training', es: 'Sonidos breves en tarjetas y entrenamientos', 'pt-BR': 'Sons curtos em cartões e treinos', vi: 'Âm thanh ngắn trong thẻ và luyện tập', id: 'Suara singkat di kartu dan latihan', tr: 'Kartlarda ve antrenmanlarda kısa sesler', pl: 'Krótkie dźwięki w fiszkach i ćwiczeniach' }),
      icon: 'volume-high-outline' as const,
      onValueChange: (value: boolean) => { setFcSfx(value); void setFcSfxEnabled(value); },
    },
    {
      testID: 'fc-autospeak-toggle',
      value: fcAutoSpeak,
      label: L({ ru: 'Автопроизношение', uk: 'Автовимова', en: 'Auto pronunciation', es: 'Pronunciación automática', 'pt-BR': 'Pronúncia automática', vi: 'Tự động phát âm', id: 'Pelafalan otomatis', tr: 'Otomatik telaffuz', pl: 'Automatyczna wymowa' }),
      sub: L({ ru: 'Озвучивать английскую фразу после ответа', uk: 'Озвучувати англійську фразу після відповіді', en: 'Read the English phrase after answering', es: 'Leer la frase en inglés después de responder', 'pt-BR': 'Ler a frase em inglês após responder', vi: 'Đọc câu tiếng Anh sau khi trả lời', id: 'Bacakan frasa Inggris setelah menjawab', tr: 'Cevaptan sonra İngilizce ifadeyi oku', pl: 'Odczytaj angielskie zdanie po odpowiedzi' }),
      icon: 'volume-high-outline' as const,
      onValueChange: (value: boolean) => { setFcAutoSpeak(value); void setFcAutoSpeakEnabled(value); },
    },
  ];

  const RowIcon = ({ name }: { name: keyof typeof Ionicons.glyphMap }) => (
    <View style={{ width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, borderWidth: 1, borderColor: glass.glassEdge }}>
      <Ionicons name={name} size={20} color={glass.lightTint} />
    </View>
  );
  const rowStyle = { minHeight: 64, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 14, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: glass.opaqueCard, borderWidth: 1, borderColor: glass.glassEdge, overflow: 'hidden' as const };
  const titleStyle = { color: t.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700' as const };
  const subStyle = { color: t.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '400' as const, marginTop: 3 };

  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <BouncyScrollView contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }} decelerationRate="fast" showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            <PressableHybrid
              accessibilityLabel={L({ ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)}
              variant="icon"
              withHaptic={false}
              withSound={false}
              style={{ width: 48, height: 44, alignSelf: 'flex-start', marginTop: 4 }}
              // зачем (profile.html `.rb.bare`): «назад» — голый шеврон слева, без круга и кромки; область нажатия 48×44.
              contentStyle={{ width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
            >
              {/* зачем: паритет с макетом profile.html — иконка «назад» это шеврон (kit.js back) */}
              <Ionicons name="chevron-back" size={21} color={glass.text} />
            </PressableHybrid>
            <Text style={{ color: t.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '700', marginTop: 10 }}>
              {loc.edu.title}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 16, lineHeight: 22, marginTop: 7 }}>
              {L({ ru: 'Проверка ответа, ввод и единая озвучка', uk: 'Перевірка відповіді, введення та єдине озвучення', en: 'Answer checking, input, and voice', es: 'Comprobación, escritura y voz', 'pt-BR': 'Verificação, digitação e voz', vi: 'Kiểm tra câu trả lời, nhập và giọng nói', id: 'Pemeriksaan jawaban, input, dan suara', tr: 'Cevap kontrolü, giriş ve ses', pl: 'Sprawdzanie odpowiedzi, wpisywanie i głos' })}
            </Text>
            {/* зачем: паритет с макетом profile.html PRF-05 — eyebrow секции: secondary, разрядка 1.7 */}
            <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 1.7, marginTop: 24, marginHorizontal: 4, marginBottom: 10 }}>
              {L({ ru: 'ОТВЕТ', uk: 'ВІДПОВІДЬ', en: 'ANSWER', es: 'RESPUESTA', 'pt-BR': 'RESPOSTA', vi: 'CÂU TRẢ LỜI', id: 'JAWABAN', tr: 'YANIT', pl: 'ODPOWIEDŹ' })}
            </Text>
            <View style={{ gap: 10 }}>
            {rows.map(row => {
              const isOn = !!s[row.key];
              return (
                <View key={row.key} style={rowStyle}>
                  <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
                  <RowIcon name={row.icon} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={titleStyle}>{row.label}</Text>
                    <Text style={subStyle}>{row.sub}</Text>
                  </View>
                  <LocalSwitch value={isOn} onValueChange={val => update(row.key, val)} accessibilityLabel={row.label} glass={glass} />
                </View>
              );
            })}
            </View>

            {/* зачем: паритет с макетом profile.html PRF-05 — eyebrow секции: secondary, разрядка 1.7 */}
            <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 1.7, marginTop: 24, marginHorizontal: 4, marginBottom: 10 }}>
              {L({ ru: 'ЗВУК', uk: 'ЗВУК', en: 'SOUND', es: 'SONIDO', 'pt-BR': 'SOM', vi: 'ÂM THANH', id: 'SUARA', tr: 'SES', pl: 'DŹWIĘK' })}
            </Text>
            <View style={{ gap: 10 }}>
            {soundRows.map(row => <View key={row.testID} testID={row.testID === 'fc-sfx-toggle' ? 'fc-sfx-row' : 'fc-autospeak-row'} style={rowStyle}>
              <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
              <RowIcon name={row.icon} />
              <View style={{ flex: 1, minWidth: 0 }}><Text style={titleStyle}>{row.label}</Text><Text style={subStyle}>{row.sub}</Text></View>
              <LocalSwitch testID={row.testID} value={row.value} onValueChange={row.onValueChange} accessibilityLabel={row.label} glass={glass} />
            </View>)}
            </View>

            <View style={[rowStyle, { marginTop: 10 }]}>
              <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
              <RowIcon name="volume-high-outline" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Text style={[titleStyle, { flex: 1, minWidth: 0 }]}>{loc.edu.speed}</Text>
                  <Text style={[titleStyle, { color: glass.lightTint, flexShrink: 1 }]}>{normalizeSpeechRate(s.speechRate).toFixed(1)}x</Text>
                </View>
                <Text style={subStyle}>{loc.edu.speedHint}</Text>
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
                    if (voicePlaybackPolicy.isEnabled()) speakAudio('a dark horse', rate, { language: 'en-US' });
                  }}
                  minimumTrackTintColor={t.textSecond}
                  maximumTrackTintColor={t.border}
                  thumbTintColor={t.textSecond}
                />
              </View>
            </View>

            <PressableHybrid
            testID="fc-voice-picker-row"
            accessibilityLabel={L({ ru: 'Голос озвучки (EN)', uk: 'Голос озвучення (EN)', en: 'Voice (EN)', es: 'Voz (EN)', 'pt-BR': 'Voz (EN)', vi: 'Giọng đọc (EN)', id: 'Suara (EN)', tr: 'Ses (EN)', pl: 'Głos (EN)' })}
            accessible
            withHaptic={false}
            withSound={false}
            onPress={() => {
            // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
            router.push('/flashcards_voice_picker' as any);
            }}
            variant="card"
            contentStyle={[rowStyle, { marginTop: 10 }]}
            >
            <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
            <RowIcon name="person-outline" />
            <View style={{ flex: 1, minWidth: 0 }}><Text style={titleStyle}>{L({ ru: 'Голос озвучки (EN)', uk: 'Голос озвучення (EN)', en: 'Voice (EN)', es: 'Voz (EN)', 'pt-BR': 'Voz (EN)', vi: 'Giọng đọc (EN)', id: 'Suara (EN)', tr: 'Ses (EN)', pl: 'Głos (EN)' })}</Text><Text style={subStyle}>{L({ ru: 'Выбор голоса и скорости для английского', uk: 'Вибір голосу і швидкості для англійської', en: 'Choose the English voice and speed', es: 'Elige la voz y la velocidad para el inglés', 'pt-BR': 'Escolha a voz e a velocidade em inglês', vi: 'Chọn giọng và tốc độ tiếng Anh', id: 'Pilih suara dan kecepatan bahasa Inggris', tr: 'İngilizce sesi ve hızı seç', pl: 'Wybierz angielski głos i tempo' })}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
            </PressableHybrid>
          </BouncyScrollView>
        </ContentWrap>
      </View>
    </ScreenGradient>
  );
}
