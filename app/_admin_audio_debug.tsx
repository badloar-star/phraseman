/**
 * TTS Debug — диагностика expo-speech на устройстве.
 * Помогает понять "почему озвучка ультра-быстрая" — показывает:
 *  - доступные voice'ы и default,
 *  - реальный rate, который мы шлём,
 *  - набор тест-фраз на разных rate (0.3 / 0.5 / 0.7 / 0.9 / 1.0),
 *  - системные настройки Android TTS (если у юзера в Settings → Accessibility → TTS
 *    выкручена скорость, она множится поверх expo-speech rate — это и есть причина).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useAudio } from '../hooks/use-audio';
import { normalizeSpeechRate, getUserSettingsSnapshot } from './user_settings_store';

const SAMPLE = 'She did not tell him about it';
const SAMPLE_LONG = 'I am thinking about going to the gym tomorrow morning if the weather is good';
const RATES = [0.3, 0.5, 0.7, 0.9, 1.0];

type VoiceInfo = {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
};

export default function AudioDebugScreen() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [lastSpoken, setLastSpoken] = useState<{ rate: number; text: string; voice?: string } | null>(null);

  const userSettings = useMemo(() => getUserSettingsSnapshot(), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await Speech.getAvailableVoicesAsync();
        if (cancelled) return;
        const enList = (list || [])
          .filter(v => (v.language || '').toLowerCase().startsWith('en'))
          .map(v => ({
            identifier: v.identifier,
            name: (v as any).name || v.identifier,
            language: v.language,
            quality: (v as any).quality,
          }));
        setVoices(enList);
      } catch (e: any) {
        setVoicesError(String(e?.message || e));
      } finally {
        if (!cancelled) setVoicesLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const speakWithRate = (rate: number, text: string) => {
    stopAudio();
    setLastSpoken({ rate: normalizeSpeechRate(rate), text, voice: selectedVoice ?? undefined });
    if (selectedVoice) {
      // Через прямой Speech.speak — useAudio не пробрасывает voice
      Speech.speak(text, { language: 'en-US', rate: normalizeSpeechRate(rate), voice: selectedVoice });
    } else {
      speakAudio(text, rate);
    }
  };

  const speakRaw = (rate: number, text: string) => {
    // Прямой вызов в обход useAudio для сравнения. Если raw тоже супер-быстрый —
    // проблема в системном движке, не в нашем коде.
    Speech.stop();
    setLastSpoken({ rate, text, voice: selectedVoice ?? undefined });
    Speech.speak(text, {
      language: 'en-US',
      rate,
      voice: selectedVoice ?? undefined,
    });
  };

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700' }}>TTS Debug</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Контекст */}
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 12, backgroundColor: t.bgCard }}>
            <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>Context</Text>
            <Text style={{ color: t.textMuted, fontSize: 12 }}>Platform: {Platform.OS} {Platform.Version}</Text>
            <Text style={{ color: t.textMuted, fontSize: 12 }}>settings.speechRate: {userSettings.speechRate}</Text>
            <Text style={{ color: t.textMuted, fontSize: 12 }}>normalized: {normalizeSpeechRate(userSettings.speechRate)}</Text>
            <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 6 }}>
              Last spoken: {lastSpoken
                ? `rate=${lastSpoken.rate} ${lastSpoken.voice ? `voice=${lastSpoken.voice}` : '(default voice)'} — "${lastSpoken.text.slice(0, 40)}…"`
                : '—'}
            </Text>
          </View>

          {/* Подсказка про Android */}
          {Platform.OS === 'android' && (
            <View style={{ borderWidth: 1, borderColor: '#FB923C', borderRadius: 10, padding: 12, backgroundColor: 'rgba(251,146,60,0.08)' }}>
              <Text style={{ color: '#FB923C', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                Если все значения rate звучат одинаково быстро —
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: 12, lineHeight: 18 }}>
                Это системные настройки Android: Settings → Accessibility → Text-to-speech output → Speech rate.{'\n'}
                Они МНОЖАТСЯ поверх нашего rate. Если там «Very fast» — даже rate=0.3 даст быстрее нормы.{'\n'}
                Также проверь движок (Preferred engine) — Pico/embedded работает быстрее, чем Google TTS.
              </Text>
            </View>
          )}

          {/* Тест rate'ов через useAudio (наш канон) */}
          <View>
            <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
              Test rates (через useAudio)
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {RATES.map(r => (
                <TouchableOpacity
                  key={`use-${r}`}
                  onPress={() => speakWithRate(r, SAMPLE)}
                  style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, minWidth: 80, alignItems: 'center' }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '700' }}>{r.toFixed(1)}x</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 6 }}>{`"${SAMPLE}"`}</Text>
          </View>

          {/* Тест rate'ов БЕЗ нашего хука — прямой Speech.speak */}
          <View>
            <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
              Test rates (raw expo-speech, без useAudio)
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 11, marginBottom: 8 }}>
              Если raw и useAudio звучат одинаково быстро — баг не в нашем коде.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {RATES.map(r => (
                <TouchableOpacity
                  key={`raw-${r}`}
                  onPress={() => speakRaw(r, SAMPLE)}
                  style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border, minWidth: 80, alignItems: 'center' }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '600' }}>{r.toFixed(1)}x raw</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Длинная фраза */}
          <View>
            <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8 }}>Длинная фраза @ 0.5x</Text>
            <TouchableOpacity
              onPress={() => speakWithRate(0.5, SAMPLE_LONG)}
              style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '600' }}>Speak long phrase</Text>
            </TouchableOpacity>
            <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 6 }}>{`"${SAMPLE_LONG}"`}</Text>
            <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 4 }}>
              Норма: ~5 секунд. Если &lt; 1.5с — rate точно не работает.
            </Text>
          </View>

          {/* Voices */}
          <View>
            <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
              English voices ({voices.length})
            </Text>
            {voicesLoading && <ActivityIndicator color={t.textPrimary} />}
            {voicesError && (
              <Text style={{ color: '#ef5350', fontSize: 12 }}>{voicesError}</Text>
            )}
            {!voicesLoading && voices.length === 0 && !voicesError && (
              <Text style={{ color: t.textMuted, fontSize: 12 }}>
                Voices не вернулись. Возможно, TTS engine не установлен или не загружен.
              </Text>
            )}
            <View style={{ gap: 6 }}>
              {voices.map(v => {
                const active = selectedVoice === v.identifier;
                return (
                  <TouchableOpacity
                    key={v.identifier}
                    onPress={() => setSelectedVoice(active ? null : v.identifier)}
                    style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: active ? t.correctBg : t.bgCard, borderWidth: 1, borderColor: active ? t.correct : t.border }}
                  >
                    <Text style={{ color: active ? t.correct : t.textPrimary, fontSize: 13, fontWeight: '700' }}>
                      {v.name}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 2 }}>
                      {v.language} · {v.quality ?? ''} · {v.identifier}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedVoice && (
              <Text style={{ color: t.textSecond, fontSize: 11, marginTop: 8 }}>
                Выбран voice: {selectedVoice} (применяется к следующим тестам)
              </Text>
            )}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
