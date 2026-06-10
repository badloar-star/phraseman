/**
 * СПАЙК 0 — прототип голосового цикла (НЕ прод-фича, dev-инструмент замеров).
 * План: docs/reports/spike0_voice_setup_2026-06-10.md
 *
 * Цикл: зажал-говоришь → on-device ASR (expo-speech-recognition) → premium_dialog.ts
 * (как есть) → озвучка. Озвучка через Kokoro (react-native-executorch), ЕСЛИ установлен;
 * иначе честный fallback на сток-expo-speech (чтобы файл компилировался ДО установки нативного модуля).
 *
 * Цель — НЕ красивый UX, а голые ЗАМЕРЫ: воспринимаемый roundtrip, что услышал ASR,
 * как звучит голос. Экран показывает тайминги прямо на себе.
 *
 * Маршрут expo-router: /spike_voice. Открывать из QA-панели (dev), не из прод-навигации.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpoSpeechRecognitionModule as speechModule } from 'expo-speech-recognition';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { callPremiumDialogSend } from './ai_dialog_client';
import { stripMarkers } from './ai_dialog_markup';

/**
 * Опциональная загрузка Kokoro: до `npm i react-native-executorch` модуля нет,
 * поэтому грузим его лениво и мягко. Если нет — kokoro останется null, экран
 * озвучит через сток-TTS и честно покажет это в статусе.
 */
type KokoroSpeak = (text: string) => Promise<void>;
let kokoroSpeak: KokoroSpeak | null = null;
let kokoroLoadTried = false;

interface TimingRow {
  label: string;
  ms: number;
}

export default function SpikeVoice() {
  const { theme: t, f } = useTheme();
  const { speak: stockSpeak } = useAudio();

  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [timings, setTimings] = useState<TimingRow[]>([]);
  const [ttsEngine, setTtsEngine] = useState<'kokoro' | 'stock' | 'unknown'>('unknown');

  const speakStartRef = useRef(0); // момент отпускания кнопки «говорю» (t0)
  const asrDoneRef = useRef(0);

  // Пробуем поднять Kokoro один раз (no-op, если пакет не установлен).
  useEffect(() => {
    if (kokoroLoadTried) {
      setTtsEngine(kokoroSpeak ? 'kokoro' : 'stock');
      return;
    }
    kokoroLoadTried = true;
    setTtsEngine('stock'); // дефолт, пока не доказали обратное
    // Динамический require, чтобы Metro не падал на отсутствующем модуле.
    // Когда executorch установлен — здесь будет реальная инициализация Kokoro.
    // ВАЖНО: useTextToSpeech — это ХУК, его нельзя звать здесь; реальная интеграция
    // обернёт Kokoro в отдельный компонент-провайдер. Для Спайка 0 оставляем
    // место-заглушку: фактическую инициализацию допишем сразу после установки.
  }, []);

  const playReply = useCallback(
    async (text: string) => {
      const clean = stripMarkers(text);
      if (kokoroSpeak) {
        setTtsEngine('kokoro');
        try {
          await kokoroSpeak(clean);
          return;
        } catch {
          // упало — падаем на сток
        }
      }
      setTtsEngine('stock');
      stockSpeak(clean, undefined, { language: 'en-US' });
    },
    [stockSpeak],
  );

  // Результат ASR → шлём в premium_dialog → озвучиваем. Меряем тайминги.
  useEffect(() => {
    const onResult = (event: { results?: { transcript?: string }[] }) => {
      const transcript = (event?.results?.[0]?.transcript ?? '').trim();
      asrDoneRef.current = nowMs();
      setListening(false);
      if (!transcript) return;
      setHeard(transcript);

      const asrMs = asrDoneRef.current - speakStartRef.current;
      setThinking(true);
      void (async () => {
        const llmStart = nowMs();
        try {
          const res = await callPremiumDialogSend({
            mode: 'scenario',
            userText: transcript,
            cefr: 'A2',
            history: [],
            role: 'a friendly conversation partner',
            setting: 'a casual chat',
            goalEn: 'have a natural friendly conversation',
            scenarioId: 'spike',
            isPremium: true,
          });
          const llmMs = nowMs() - llmStart;
          setReply(res.assistantMessage);
          const ttsStart = nowMs();
          await playReply(res.assistantMessage);
          const ttsMs = nowMs() - ttsStart;
          setTimings([
            { label: 'ASR (распознавание)', ms: asrMs },
            { label: 'LLM (ответ Фила)', ms: llmMs },
            { label: 'TTS (старт озвучки)', ms: ttsMs },
            { label: 'ИТОГО до звука', ms: asrMs + llmMs + ttsMs },
          ]);
        } catch {
          setReply('Ошибка вызова диалога (проверь деплой premium_dialog + сеть).');
        } finally {
          setThinking(false);
        }
      })();
    };

    const resultSub = speechModule.addListener('result', onResult);
    const endSub = speechModule.addListener('end', () => setListening(false));
    const errorSub = speechModule.addListener('error', () => {
      setListening(false);
      setThinking(false);
    });
    return () => {
      resultSub?.remove?.();
      endSub?.remove?.();
      errorSub?.remove?.();
    };
  }, [playReply]);

  const onPressIn = useCallback(async () => {
    hapticTap();
    setHeard('');
    setReply('');
    setTimings([]);
    try {
      const permission = await speechModule.requestPermissionsAsync();
      if (!permission.granted) return;
      speakStartRef.current = nowMs();
      setListening(true);
      speechModule.start({
        lang: 'en-US',
        interimResults: false,
        continuous: false,
        ...(Platform.OS === 'ios' ? { recordingOptions: { persist: true } } : {}),
      });
    } catch {
      setListening(false);
    }
  }, []);

  const onPressOut = useCallback(() => {
    try {
      speechModule.stop();
    } catch {
      // end/error listener settles state
    }
  }, []);

  const status = listening ? 'Слушаю…' : thinking ? 'Думаю…' : 'Зажми и говори';

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800' }}>
            Спайк 0 · голос
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption }}>
            Dev-замер. Озвучка: {ttsEngine === 'kokoro' ? 'Kokoro (on-device)' : 'сток expo-speech (Kokoro не установлен)'}
          </Text>

          {/* Что услышал ASR */}
          <Block t={t} f={f} title="Услышал (ASR)">
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg }}>{heard || '—'}</Text>
          </Block>

          {/* Ответ Фила */}
          <Block t={t} f={f} title="Ответ Фила">
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg }}>
              {reply ? stripMarkers(reply) : '—'}
            </Text>
          </Block>

          {/* Тайминги */}
          {timings.length > 0 && (
            <Block t={t} f={f} title="Тайминги (мс)">
              {timings.map((row) => (
                <View
                  key={row.label}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}
                >
                  <Text style={{ color: t.textMuted, fontSize: f.sub }}>{row.label}</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
                    {Math.round(row.ms)}
                  </Text>
                </View>
              ))}
            </Block>
          )}

          {/* Кнопка hold-to-talk */}
          <TouchableOpacity
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={0.85}
            disabled={thinking}
            style={{
              marginTop: 8,
              borderRadius: 20,
              paddingVertical: 22,
              alignItems: 'center',
              backgroundColor: listening ? t.accent : t.bgCard,
              borderWidth: 1,
              borderColor: t.border,
              opacity: thinking ? 0.5 : 1,
            }}
          >
            <Text style={{ color: listening ? '#fff' : t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
              {status}
            </Text>
          </TouchableOpacity>

          <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center' }}>
            Зажми кнопку, скажи фразу по-английски, отпусти. Замерь roundtrip и послушай голос.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

function Block({
  t,
  f,
  title,
  children,
}: {
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: t.bgCard,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: t.border,
        padding: 16,
      }}
    >
      <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', marginBottom: 6 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Время в мс. Date.now() недоступен в workflow-скриптах, но это обычный RN-рантайм —
 * здесь Date.now() легален. Вынесено в функцию на случай замены на performance.now().
 */
function nowMs(): number {
  return Date.now();
}
