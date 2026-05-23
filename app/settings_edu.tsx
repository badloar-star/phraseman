import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import CustomSwitch from '../components/CustomSwitch';
import ReportErrorButton from '../components/ReportErrorButton';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useAudio } from '../hooks/use-audio';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
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

  // Backup: use name as-is if it's already human-readable
  const name = voice.name ?? '';
  if (name && !/^en-/i.test(name)) return `${name} · ${accent}`;

  return `${accent} · ${type}`;
}

export default function SettingsEdu() {
  const router = useRouter();
  const { theme: t } = useTheme();
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

  const L = (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const rows: { key: RowKey; label: string; sub: string }[] = [
    {
      key: 'autoCheck',
      label: L('Автопроверка', 'Автоперевірка', 'Comprobación automática', 'Verificação automática', 'Tự động kiểm tra', 'Periksa otomatis', 'Otomatik kontrol', 'Automatyczne sprawdzanie'),
      sub: L('Проверять при наборе последнего слова', 'Перевіряти при наборі останнього слова', 'Comprobar al escribir la última palabra', 'Verificar ao digitar a última palavra', 'Kiểm tra khi nhập từ cuối cùng', 'Periksa saat mengetik kata terakhir', 'Son kelime yazıldığında kontrol et', 'Sprawdzaj po wpisaniu ostatniego słowa'),
    },
    {
      key: 'voiceOut',
      label: L('Озвучить ответ', 'Озвучити відповідь', 'Leer la respuesta', 'Ler a resposta em voz alta', 'Đọc đáp án', 'Bacakan jawaban', 'Yanıtı seslendir', 'Odczytaj odpowiedź'),
      sub: L('Произносить фразу после ответа', 'Вимовляти фразу після відповіді', 'Leer la frase después de responder', 'Pronunciar a frase depois da resposta', 'Phát âm cụm từ sau khi trả lời', 'Ucapkan frasa setelah menjawab', 'Yanıttan sonra ifadeyi seslendir', 'Wypowiadaj frazę po odpowiedzi'),
    },
    {
      key: 'autoAdvance',
      label: L('Автопереход после ответа', 'Автоперехід після відповіді', 'Siguiente automático', 'Avanço automático', 'Tự động chuyển tiếp', 'Lanjut otomatis', 'Otomatik ilerleme', 'Automatyczne przejście'),
      sub: L('Переходить к следующему заданию при правильном ответе', 'Переходити до наступного завдання при правильній відповіді', 'Pasar a la siguiente pregunta cuando aciertas', 'Ir para a próxima tarefa após uma resposta correta', 'Chuyển sang bài tiếp theo khi trả lời đúng', 'Pindah ke soal berikutnya saat jawaban benar', 'Doğru yanıttan sonra sonraki göreve geç', 'Przechodź do następnego zadania po poprawnej odpowiedzi'),
    },
    {
      key: 'hardMode',
      label: L('Ввод с клавиатуры', 'Введення з клавіатури', 'Escribir con el teclado', 'Digitação pelo teclado', 'Nhập bằng bàn phím', 'Ketik dengan keyboard', 'Klavye ile yazma', 'Wpisywanie z klawiatury'),
      sub: L('Вводить ответ вручную вместо выбора слов', 'Вводити відповідь вручну замість вибору слів', 'Escribir la respuesta completa con el teclado', 'Digitar a resposta manualmente em vez de escolher palavras', 'Nhập câu trả lời thủ công thay vì chọn từ', 'Ketik jawaban lengkap alih-alih memilih kata', 'Kelimeleri seçmek yerine yanıtı elle yaz', 'Wpisuj odpowiedź ręcznie zamiast wybierać słowa'),
    },
    {
      key: 'haptics',
      label: L('Вибрация при ошибке', 'Вібрація при помилці', 'Vibración al fallar', 'Vibração ao errar', 'Rung khi sai', 'Getar saat salah', 'Hata yapınca titreşim', 'Wibracja przy błędzie'),
      sub: L('Тактильный сигнал при неправильном ответе', 'Тактильний сигнал при неправильній відповіді', 'Pequeño aviso háptico si la respuesta es incorrecta', 'Sinal tátil quando a resposta estiver incorreta', 'Phản hồi rung nhẹ khi trả lời sai', 'Umpan balik haptik saat jawaban salah', 'Yanıt yanlışsa kısa dokunsal uyarı', 'Krótki sygnał haptyczny przy błędnej odpowiedzi'),
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
    ? englishVoices.find(v => v.identifier === s.speechVoiceId)?.name ?? L('Выбранный голос', 'Вибраний голос', 'Selected voice', 'Voz selecionada', 'Giọng đã chọn', 'Suara terpilih', 'Seçili ses', 'Wybrany głos')
    : L('Системный голос', 'Системний голос', 'System voice', 'Voz do sistema', 'Giọng hệ thống', 'Suara sistem', 'Sistem sesi', 'Głos systemowy');

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, marginBottom: 8 }}>
            <TouchableOpacity
              style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => {
                hapticTap();
                safeRouterBack(router, '/(tabs)/home' as any);
              }}
            >
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '600' }}>
              {loc.edu.title}
            </Text>
            <ReportErrorButton
              screen="settings_edu"
              dataId="settings_edu"
              dataText={loc.edu.title}
              variant="icon-flag"
              accessibilityLabel="Сообщить о баге на экране обучения"
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border }}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {rows.map(row => {
              const isOn = !!s[row.key];
              return (
                <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
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
              <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
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
                  minimumValue={0.5}
                  maximumValue={2.5}
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
                      {L('Голос', 'Голос', 'Voice', 'Voz', 'Giọng đọc', 'Suara', 'Ses', 'Głos')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => { hapticTap(); setVoicePickerOpen(v => !v); }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: t.bgCard,
                        borderWidth: 1,
                        borderColor: t.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                      }}
                    >
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
                          borderColor: !s.speechVoiceId ? t.accent : t.border,
                          backgroundColor: !s.speechVoiceId ? `${t.accent}22` : t.bgCard,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                        }}
                      >
                        <Text style={{ color: !s.speechVoiceId ? t.accent : t.textPrimary, fontSize: 13, fontWeight: '700' }}>
                          {L('Системный', 'Системний', 'System', 'Sistema', 'Hệ thống', 'Sistem', 'Sistem', 'Systemowy')}
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
                              borderColor: selected ? t.accent : t.border,
                              backgroundColor: selected ? `${t.accent}22` : t.bgCard,
                              borderRadius: 10,
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                            }}
                          >
                            <Text style={{ color: selected ? t.accent : t.textPrimary, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                              {formatVoiceLabel(voice)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      {englishVoices.length === 0 ? (
                        <Text style={{ color: t.textMuted, fontSize: 12 }}>
                          {L('Голосов не найдено. Попробуйте скачать английский язык в настройках телефона.', 'Голосів не знайдено. Спробуйте завантажити англійську мову в налаштуваннях телефону.', 'No voices found. Try downloading English in your phone settings.', 'Nenhuma voz encontrada. Tente baixar o inglês nas configurações do telefone.', 'Không tìm thấy giọng đọc. Hãy thử tải tiếng Anh trong cài đặt điện thoại.', 'Tidak ada suara ditemukan. Coba unduh bahasa Inggris di pengaturan ponsel.', 'Ses bulunamadı. Telefon ayarlarından İngilizce indirmeyi deneyin.', 'Nie znaleziono głosów. Spróbuj pobrać język angielski w ustawieniach telefonu.')}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Fun disclaimer */}
                  <View style={{ marginTop: 4, backgroundColor: `${t.accent}12`, borderRadius: 12, padding: 14 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>
                      {L('🎙️ Почему голос звучит странно?', '🎙️ Чому голос звучить дивно?', '🎙️ Why does the voice sound odd?', '🎙️ Por que a voz soa estranha?', '🎙️ Vì sao giọng đọc nghe lạ?', '🎙️ Mengapa suaranya terdengar aneh?', '🎙️ Ses neden tuhaf geliyor?', '🎙️ Dlaczego głos brzmi dziwnie?')}
                    </Text>
                    <Text style={{ color: t.textSecond, fontSize: 13, lineHeight: 20 }}>
                      {L(
                        'У нас нет записанной озвучки — фразы произносит встроенный голосовой помощник вашего телефона (Android или iOS). Именно он отвечает за качество произношения.\n\nМы бы рады нанять настоящего британца с безупречным акцентом, но спонсора пока нет. Так что если ударение не там — спасибо телефону. 😅',
                        'У нас немає записаного озвучення — фрази вимовляє вбудований голосовий помічник вашого телефону (Android або iOS). Саме він відповідає за якість вимови.\n\nМи б раді найняти справжнього британця з бездоганним акцентом, але спонсора поки немає. Тож якщо наголос не там — дякуємо телефону. 😅',
                        'We have no recorded voice — phrases are spoken by your phone\'s built-in voice assistant (Android or iOS). It\'s fully responsible for pronunciation quality.\n\nWe\'d love to hire a real British actor with a flawless accent, but no sponsor yet. So if the stress sounds off — thank your phone. 😅',
                        'Não temos narração gravada — as frases são faladas pelo assistente de voz integrado do seu telefone (Android ou iOS). Ele é responsável pela qualidade da pronúncia.\n\nAdoraríamos contratar um ator britânico de verdade com sotaque impecável, mas ainda não temos patrocinador. Então, se a tonicidade sair estranha, agradeça ao telefone. 😅',
                        'Chúng tôi không có bản thu âm sẵn — các cụm từ được đọc bằng trợ lý giọng nói tích hợp trên điện thoại của bạn (Android hoặc iOS). Chính nó quyết định chất lượng phát âm.\n\nChúng tôi rất muốn thuê một diễn viên Anh thật với giọng chuẩn, nhưng hiện chưa có nhà tài trợ. Nên nếu trọng âm hơi lạ, hãy cảm ơn điện thoại nhé. 😅',
                        'Kami tidak memiliki rekaman suara — frasa dibacakan oleh asisten suara bawaan ponsel Anda (Android atau iOS). Dialah yang menentukan kualitas pelafalan.\n\nKami ingin sekali menyewa aktor Inggris asli dengan aksen sempurna, tetapi belum ada sponsor. Jadi kalau tekanan katanya terdengar aneh, terima kasihlah pada ponsel Anda. 😅',
                        'Kayıtlı sesimiz yok — ifadeler telefonunuzun yerleşik sesli asistanı (Android veya iOS) tarafından okunur. Telaffuz kalitesinden tamamen o sorumludur.\n\nKusursuz aksanlı gerçek bir İngiliz oyuncu tutmayı isterdik, ama henüz sponsor yok. Vurgu tuhafsa, telefonu suçlayın. 😅',
                        'Nie mamy nagranego lektora — frazy czyta wbudowany asystent głosowy telefonu (Android lub iOS). To on odpowiada za jakość wymowy.\n\nChętnie zatrudnilibyśmy prawdziwego Brytyjczyka z perfekcyjnym akcentem, ale sponsora na razie brak. Jeśli więc akcent brzmi dziwnie, podziękuj telefonowi. 😅',
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
