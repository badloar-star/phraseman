/**
 * cards-2.0 (E13): экран выбора TTS-голоса для EN (§3.8 мастер-плана).
 *
 * - Список голосов из Speech.getAvailableVoicesAsync (кэш tts_voices.getVoicesOnce),
 *   фильтр en-*, исключение eloquence/novelty-голосов; Enhanced/Premium — сверху
 *   с бейджем «Улучшенный»; Android — приоритет `-local`-голосов.
 * - Выбор персистится в fc_voice_prefs_v1 {voiceIdEn} (voice_prefs.ts);
 *   use-audio.speak подставляет голос для en-*, не трогая uk/ru/es.
 * - Превью: «Look forward to seeing you» выбранным голосом (кнопка + при выборе).
 * - Rate-пресеты Медленно 0.7 / Норма 0.9 / Быстро 1.0 — связка с существующим
 *   speechRate из user_settings_store (та же настройка, что слайдер в settings_edu).
 * - Подсказка: улучшенные голоса докачиваются в настройках телефона (платформенно).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { useAudio } from '../hooks/use-audio';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { fcHaptic } from './flashcards/SoundService';
import { nestedBoxShadow, useShadowGlass } from '../components/v2/ShadowSurface';
import { getVoicesOnce, type FcVoiceLike } from './flashcards/tts_voices';
import { getVoicePrefs, setEnVoiceId } from './flashcards/voice_prefs';
import { safeRouterBack } from './navigation_back';
import {
  applyUserSettingsNow,
  getUserSettingsSnapshot,
  normalizeSpeechRate,
  type UserSettings,
} from './user_settings_store';

const PREVIEW_PHRASE = 'Look forward to seeing you';

/** Novelty/спец-голоса iOS — не для обучения (§3.8: исключить eloquence/novelty). */
const NOVELTY_NAMES = new Set([
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'deranged',
  'good news', 'jester', 'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox',
]);

export function isPickableEnVoice(v: FcVoiceLike): boolean {
  const langTag = (v.language ?? '').toLowerCase().replace(/_/g, '-');
  if (!langTag.startsWith('en')) return false;
  const id = (v.identifier ?? '').toLowerCase();
  if (id.includes('eloquence')) return false;
  const name = (v.name ?? '').toLowerCase().trim();
  if (NOVELTY_NAMES.has(name)) return false;
  return true;
}

function isEnhanced(v: FcVoiceLike): boolean {
  const q = (v.quality ?? '').toLowerCase();
  const n = (v.name ?? '').toLowerCase();
  return q.includes('enhanced') || q.includes('premium') || n.includes('enhanced') || n.includes('premium');
}

/** Читаемое имя: «Samantha · en-US» без служебных суффиксов идентификатора. */
function voiceTitle(v: FcVoiceLike): string {
  const name = (v.name ?? '').trim();
  if (name) return name.replace(/\s*\((enhanced|premium)\)\s*/i, '').trim() || name;
  const parts = v.identifier.split('.');
  return parts[parts.length - 1] || v.identifier;
}

/** Rate-пресеты §3.8/E13 — та же шкала, что слайдер speechRate (0.5–1.0). */
const RATE_PRESETS = [
  { value: 0.7, key: 'slow' },
  { value: 0.9, key: 'norm' },
  { value: 1.0, key: 'fast' },
] as const;

export default function FlashcardsVoicePickerScreen() {
  const router = useRouter();
  const { theme: t, f, statusBarLight } = useTheme();
  const { lang } = useLang();
  const effectiveOs = useEffectivePlatformOS();
  const { speak, stop } = useAudio();

  const [loading, setLoading] = useState(true);
  const [voices, setVoices] = useState<FcVoiceLike[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => getUserSettingsSnapshot());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [list, prefs] = await Promise.all([getVoicesOnce(), getVoicePrefs()]);
      if (cancelled) return;
      setVoices(list.filter(isPickableEnVoice));
      setSelectedId(prefs.voiceIdEn);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  /** Enhanced сверху; внутри групп: Android — local первыми, затем по имени. */
  const sorted = useMemo(() => {
    const byName = (a: FcVoiceLike, b: FcVoiceLike) => voiceTitle(a).localeCompare(voiceTitle(b));
    const localScore = (v: FcVoiceLike) =>
      effectiveOs === 'android' && v.identifier.toLowerCase().includes('local') ? 0 : 1;
    return [...voices].sort((a, b) => {
      const e = Number(isEnhanced(b)) - Number(isEnhanced(a));
      if (e !== 0) return e;
      const l = localScore(a) - localScore(b);
      if (l !== 0) return l;
      return byName(a, b);
    });
  }, [voices, effectiveOs]);

  const previewWith = useCallback(
    (voiceId: string | null) => {
      stop();
      // voiceId: null → системный голос (явный override кэша выбора)
      speak(PREVIEW_PHRASE, undefined, { language: 'en-US', voiceId });
    },
    [speak, stop],
  );

  const pickVoice = useCallback(
    (voiceId: string | null) => {
      fcHaptic('tap');
      setSelectedId(voiceId);
      void setEnVoiceId(voiceId);
      previewWith(voiceId);
    },
    [previewWith],
  );

  const activeRate = normalizeSpeechRate(settings.speechRate);
  const pickRate = useCallback(
    (rate: number) => {
      fcHaptic('tap');
      setSettings((prev) => {
        const next = { ...prev, speechRate: normalizeSpeechRate(rate) };
        applyUserSettingsNow(next);
        return next;
      });
      stop();
      speak(PREVIEW_PHRASE, rate, { language: 'en-US', voiceId: selectedId });
    },
    [selectedId, speak, stop],
  );

  const gs = useShadowGlass(); // зачем (Тень 12.10): токены тени для пилюли «Улучшенный» и кнопки превью
  const leave = useCallback(() => {
    fcHaptic('tap');
    stop();
    safeRouterBack(router, '/settings_edu' as any);
  }, [router, stop]);

  const rateLabels: Record<(typeof RATE_PRESETS)[number]['key'], string> = {
    slow: triLang(lang, {
      ru: 'Медленно', uk: 'Повільно', en: 'Slow', es: 'Lento',
      'pt-BR': 'Devagar', vi: 'Chậm', id: 'Pelan', tr: 'Yavaş', pl: 'Wolno',
    }),
    norm: triLang(lang, {
      ru: 'Норма', uk: 'Норма', en: 'Normal', es: 'Normal',
      'pt-BR': 'Normal', vi: 'Bình thường', id: 'Normal', tr: 'Normal', pl: 'Normalnie',
    }),
    fast: triLang(lang, {
      ru: 'Быстро', uk: 'Швидко', en: 'Fast', es: 'Rápido',
      'pt-BR': 'Rápido', vi: 'Nhanh', id: 'Cepat', tr: 'Hızlı', pl: 'Szybko',
    }),
  };

  const enhancedBadgeLabel = triLang(lang, {
    ru: 'Улучшенный', uk: 'Покращений', en: 'Enhanced', es: 'Mejorada',
    'pt-BR': 'Aprimorada', vi: 'Nâng cao', id: 'Ditingkatkan', tr: 'Gelişmiş', pl: 'Ulepszony',
  });

  const voiceRow = (v: FcVoiceLike | null) => {
    const id = v?.identifier ?? null;
    const active = selectedId === id;
    const title = v
      ? voiceTitle(v)
      : triLang(lang, {
          ru: 'Системный (авто)', uk: 'Системний (авто)', en: 'System (auto)', es: 'Sistema (auto)',
          'pt-BR': 'Sistema (auto)', vi: 'Hệ thống (tự động)', id: 'Sistem (otomatis)', tr: 'Sistem (otomatik)', pl: 'Systemowy (auto)',
        });
    // зачем (DQA, 04.10): у «Системный (авто)» подписи нет — название самодостаточно (экрана нет в макетах,
    // правило владельца: без расшифровок мелким шрифтом); у конкретного голоса подпись — его язык.
    const sub = v ? v.language : null;
    return (
      <TouchableOpacity
        key={id ?? '__system__'}
        testID={id ? `fc-voice-row-${id}` : 'fc-voice-row-system'}
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessible
        activeOpacity={0.8}
        onPress={() => pickVoice(id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 16,
          backgroundColor: active ? `${t.accent}14` : t.bgSurface,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Ionicons
          name={active ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={active ? t.accentText : t.textGhost}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flexShrink: 1 }}
            >
              {title}
            </Text>
            {v && isEnhanced(v) ? (
              <View
                style={{
                  borderRadius: 999,
                  backgroundColor: t.goldBg,
                  boxShadow: nestedBoxShadow(gs),
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: t.accentText, fontSize: f.caption - 1, fontWeight: '800' }}>
                  {enhancedBadgeLabel}
                </Text>
              </View>
            ) : null}
          </View>
          {sub ? (
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
              {sub}
            </Text>
          ) : null}
        </View>
        {/* Превью конкретного голоса без смены выбора */}
        <TouchableOpacity
          testID={id ? `fc-voice-preview-${id}` : 'fc-voice-preview-system'}
          accessibilityRole="button"
          onPress={() => previewWith(id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.bgCard,
            boxShadow: nestedBoxShadow(gs),
          }}
        >
          <Ionicons name="volume-medium" size={17} color={t.accentText} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const enhancedVoices = sorted.filter(isEnhanced);
  const regularVoices = sorted.filter((v) => !isEnhanced(v));

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} />
        <ContentWrap>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <TouchableOpacity
              testID="fc-voice-picker-back"
              onPress={leave}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }} testID="fc-voice-picker-title">
              {triLang(lang, {
                ru: 'Голос озвучки · EN', uk: 'Голос озвучення · EN', en: 'Voiceover voice · EN', es: 'Voz de lectura · EN',
                'pt-BR': 'Voz de leitura · EN', vi: 'Giọng đọc · EN', id: 'Suara narasi · EN', tr: 'Seslendirme sesi · EN', pl: 'Głos odczytu · EN',
              })}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/*
            * зачем (владелец, 2026-08-16, «прыжки страниц»): системный список
            * голосов (getVoicesOnce) отвечает не мгновенно, и весь экран
            * подменялся спиннером, а потом список запрыгивал целиком. Держим
            * геометрию: чипы скорости + строки голосов той же высоты (~62).
            */}
          {loading ? (
            <View style={{ flex: 1, paddingHorizontal: 16, gap: 10, paddingTop: 4 }}>
              <SkeletonBlock width={140} height={f.caption} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {Array.from({ length: 3 }, (_, i) => (
                  <SkeletonBlock key={i} width={92} height={38} borderRadius={12} />
                ))}
              </View>
              <SkeletonBlock width={110} height={f.caption} style={{ marginTop: 12 }} />
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonBlock key={i} width="100%" height={62} borderRadius={16} />
              ))}
            </View>
          ) : (
            <ScrollView decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Скорость: пресеты — общая настройка speechRate (слайдер в settings_edu) */}
              <Text
                style={{
                  color: t.textMuted,
                  fontSize: f.caption,
                  fontWeight: '800',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginTop: 4,
                }}
              >
                {triLang(lang, {
                  ru: 'Скорость речи', uk: 'Швидкість мовлення', en: 'Speech speed', es: 'Velocidad',
                  'pt-BR': 'Velocidade da fala', vi: 'Tốc độ nói', id: 'Kecepatan bicara', tr: 'Konuşma hızı', pl: 'Szybkość mowy',
                })}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {RATE_PRESETS.map((p) => {
                  const active = Math.abs(activeRate - p.value) < 0.05;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      testID={`fc-voice-rate-${p.key}`}
                      accessibilityLabel={`${rateLabels[p.key]}, ${p.value.toFixed(1)}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessible
                      activeOpacity={0.8}
                      onPress={() => pickRate(p.value)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        borderRadius: 14,
                        backgroundColor: active ? `${t.accent}1F` : t.bgSurface,
                        paddingVertical: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? t.accentText : t.textMuted,
                          fontSize: f.sub,
                          fontWeight: active ? '800' : '600',
                        }}
                      >
                        {rateLabels[p.key]}
                      </Text>
                      <Text style={{ color: active ? t.accentText : t.textGhost, fontSize: f.caption - 1, marginTop: 1 }}>
                        {p.value.toFixed(1)}x
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Голоса */}
              <Text
                style={{
                  color: t.textMuted,
                  fontSize: f.caption,
                  fontWeight: '800',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginTop: 12,
                }}
              >
                {triLang(lang, {
                  ru: 'Голос', uk: 'Голос', en: 'Voice', es: 'Voz',
                  'pt-BR': 'Voz', vi: 'Giọng đọc', id: 'Suara', tr: 'Ses', pl: 'Głos',
                })}
              </Text>
              {voiceRow(null)}
              {enhancedVoices.map((v) => voiceRow(v))}
              {regularVoices.map((v) => voiceRow(v))}

              {/* зачем (PM-097-A2, координатор 04.10): по D128 карточки озвучиваются клипами нужного языка —
                  подсказки про голоса телефона («список недоступен», «докачать в Google TTS») вводили в заблуждение и убраны. */}

              {/* Превью выбранного */}
              <TouchableOpacity
                testID="fc-voice-preview-selected"
                accessibilityLabel={triLang(lang, {
                  ru: 'Прослушать пример', uk: 'Прослухати приклад', en: 'Listen to example', es: 'Escuchar ejemplo',
                  'pt-BR': 'Ouvir exemplo', vi: 'Nghe ví dụ', id: 'Dengarkan contoh', tr: 'Örneği dinle', pl: 'Odsłuchaj przykład',
                })}
                accessible
                activeOpacity={0.8}
                onPress={() => previewWith(selectedId)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 16,
                  backgroundColor: t.accent,
                  paddingVertical: 14,
                  marginTop: 8,
                }}
              >
                <Ionicons name="play" size={18} color={t.textOnGold} />
                <Text style={{ color: t.textOnGold, fontSize: f.body, fontWeight: '700' }}>
                  {triLang(lang, {
                    ru: 'Прослушать пример', uk: 'Прослухати приклад', en: 'Listen to example', es: 'Escuchar ejemplo',
                    'pt-BR': 'Ouvir exemplo', vi: 'Nghe ví dụ', id: 'Dengarkan contoh', tr: 'Örneği dinle', pl: 'Odsłuchaj przykład',
                  })}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: t.textGhost, fontSize: f.caption, textAlign: 'center' }}>
                «{PREVIEW_PHRASE}»
              </Text>

            </ScrollView>
          )}
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
