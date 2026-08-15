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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { useAudio } from '../hooks/use-audio';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { fcHaptic } from './flashcards/SoundService';
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

  const leave = useCallback(() => {
    fcHaptic('tap');
    stop();
    safeRouterBack(router, '/settings_edu' as any);
  }, [router, stop]);

  const rateLabels: Record<(typeof RATE_PRESETS)[number]['key'], string> = {
    slow: triLang(lang, { ru: 'Медленно', uk: 'Повільно', es: 'Lento' }),
    norm: triLang(lang, { ru: 'Норма', uk: 'Норма', es: 'Normal' }),
    fast: triLang(lang, { ru: 'Быстро', uk: 'Швидко', es: 'Rápido' }),
  };

  const enhancedBadgeLabel = triLang(lang, { ru: 'Улучшенный', uk: 'Покращений', es: 'Mejorada' });

  const voiceRow = (v: FcVoiceLike | null) => {
    const id = v?.identifier ?? null;
    const active = selectedId === id;
    const title = v
      ? voiceTitle(v)
      : triLang(lang, { ru: 'Системный (авто)', uk: 'Системний (авто)', es: 'Sistema (auto)' });
    const sub = v
      ? v.language
      : triLang(lang, {
          ru: 'Голос подберёт устройство',
          uk: 'Голос підбере пристрій',
          es: 'El dispositivo elige la voz',
        });
    return (
      <TouchableOpacity
        key={id ?? '__system__'}
        testID={id ? `fc-voice-row-${id}` : 'fc-voice-row-system'}
        accessibilityLabel={id ? `qa-fc-voice-row-${id}` : 'qa-fc-voice-row-system'}
        accessible
        activeOpacity={0.8}
        onPress={() => pickVoice(id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: active ? t.accent : t.border,
          backgroundColor: active ? `${t.accent}14` : t.bgSurface,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Ionicons
          name={active ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={active ? t.accent : t.textGhost}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flexShrink: 1 }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {v && isEnhanced(v) ? (
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: `${t.gold}77`,
                  backgroundColor: t.goldBg,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: t.gold, fontSize: f.caption - 1, fontWeight: '800' }}>
                  {enhancedBadgeLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }} numberOfLines={1}>
            {sub}
          </Text>
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
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.bgCard,
          }}
        >
          <Ionicons name="volume-medium" size={17} color={t.accent} />
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
              {triLang(lang, { ru: 'Голос озвучки · EN', uk: 'Голос озвучення · EN', es: 'Voz de lectura · EN' })}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={t.accent} />
            </View>
          ) : (
            <ScrollView
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
                {triLang(lang, { ru: 'Скорость речи', uk: 'Швидкість мовлення', es: 'Velocidad' })}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {RATE_PRESETS.map((p) => {
                  const active = Math.abs(activeRate - p.value) < 0.05;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      testID={`fc-voice-rate-${p.key}`}
                      accessibilityLabel={`qa-fc-voice-rate-${p.key}`}
                      accessible
                      activeOpacity={0.8}
                      onPress={() => pickRate(p.value)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        borderRadius: 14,
                        borderWidth: 1.5,
                        borderColor: active ? t.accent : t.border,
                        backgroundColor: active ? `${t.accent}1F` : t.bgSurface,
                        paddingVertical: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? t.accent : t.textMuted,
                          fontSize: f.sub,
                          fontWeight: active ? '800' : '600',
                        }}
                      >
                        {rateLabels[p.key]}
                      </Text>
                      <Text style={{ color: active ? t.accent : t.textGhost, fontSize: f.caption - 1, marginTop: 1 }}>
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
                {triLang(lang, { ru: 'Голос', uk: 'Голос', es: 'Voz' })}
              </Text>
              {voiceRow(null)}
              {enhancedVoices.map((v) => voiceRow(v))}
              {regularVoices.map((v) => voiceRow(v))}

              {voices.length === 0 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: t.border,
                    backgroundColor: t.bgSurface,
                    padding: 14,
                  }}
                  testID="fc-voice-empty"
                >
                  <Ionicons name="information-circle-outline" size={20} color={t.textMuted} />
                  <Text style={{ color: t.textMuted, fontSize: f.caption, flex: 1, lineHeight: 17 }}>
                    {triLang(lang, {
                      ru: 'Список голосов недоступен на этом устройстве — используется системный голос.',
                      uk: 'Список голосів недоступний на цьому пристрої — використовується системний голос.',
                      es: 'La lista de voces no está disponible en este dispositivo; se usa la voz del sistema.',
                    })}
                  </Text>
                </View>
              ) : null}

              {/* Превью выбранного */}
              <TouchableOpacity
                testID="fc-voice-preview-selected"
                accessibilityLabel="qa-fc-voice-preview-selected"
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
                <Ionicons name="play" size={18} color={t.correctText} />
                <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Прослушать пример', uk: 'Прослухати приклад', es: 'Escuchar ejemplo' })}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: t.textGhost, fontSize: f.caption, textAlign: 'center' }}>
                «{PREVIEW_PHRASE}»
              </Text>

              {/* Платформенная подсказка про докачку голосов */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: `${t.accent}44`,
                  backgroundColor: `${t.accent}0F`,
                  padding: 14,
                  marginTop: 10,
                }}
                testID="fc-voice-hint"
              >
                <Ionicons name="download-outline" size={20} color={t.accent} />
                <Text style={{ color: t.textMuted, fontSize: f.caption, flex: 1, lineHeight: 18 }}>
                  {effectiveOs === 'ios'
                    ? triLang(lang, {
                        ru: 'Улучшенные голоса можно докачать: Настройки → Универсальный доступ → Устный контент → Голоса → English.',
                        uk: 'Покращені голоси можна довантажити: Параметри → Доступність → Промовлення → Голоси → English.',
                        es: 'Puedes descargar voces mejoradas: Ajustes → Accesibilidad → Contenido leído → Voces → Inglés.',
                      })
                    : effectiveOs === 'android'
                      ? triLang(lang, {
                          ru: 'Голоса можно докачать в настройках телефона: Настройки → Система → Язык и ввод → Синтез речи → Google TTS → английские голоса.',
                          uk: 'Голоси можна довантажити в налаштуваннях телефона: Налаштування → Система → Мова і введення → Синтез мовлення → Google TTS → англійські голоси.',
                          es: 'Puedes descargar voces en los ajustes del teléfono: Ajustes → Sistema → Idioma → Síntesis de voz → Google TTS → voces en inglés.',
                        })
                      : triLang(lang, {
                          ru: 'Голоса зависят от браузера и системы — дополнительные можно установить в настройках устройства.',
                          uk: 'Голоси залежать від браузера і системи — додаткові можна встановити в налаштуваннях пристрою.',
                          es: 'Las voces dependen del navegador y del sistema; puedes instalar más en los ajustes del dispositivo.',
                        })}
                </Text>
              </View>
            </ScrollView>
          )}
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
