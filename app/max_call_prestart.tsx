import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { safeRouterBack } from './navigation_back';
import { getScenarioById, dialogScenarioTitle } from './ai_dialog_scenarios';
import { loadMaxVoiceNative } from './max_webrtc_module';
import { maxVoiceFailureMessage, maxVoiceFailureReason } from './max_voice_error';

/**
 * Пре-экран «Позвонить» (спека, раздел 1: max_call_prestart).
 *
 * Зачем отдельный экран: «топливо» (остаток минут дня) живёт ЗДЕСЬ крупно,
 * а не в звонке — во время разговора таймер давит на ученика, до разговора
 * помогает решиться. Здесь заранее греется облачный mint; микрофон открывает
 * только настоящий звонок, чтобы prewarm-трек не гонялся с WebRTC на iPhone.
 *
 * Дешёвый maxVoicePreflight — при входе (квота/гейты без минта); сам минт
 * делает экран звонка: резерв не должен висеть, пока юзер раздумывает.
 */

const FUNCTIONS_REGION = 'us-central1';

/** Дефолтные капы форматов (спека §3 sessionCapSec) до ответа preflight. */
const DEFAULT_CAP_SEC: Record<'scenario' | 'companion' | 'trial', number> = {
  scenario: 300,
  companion: 480,
  trial: 180,
};
/** Дневной пул по умолчанию (спека §3 dailyVoiceSecMax) — до ответа сервера. */
const DEFAULT_DAY_SEC = 900;

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

interface PreflightView {
  dayRemainingSec: number | null;
  dayMaxSec: number | null;
  capSec: number | null;
}

/**
 * Защитный разбор ответа maxVoicePreflight: сервер пишется параллельной
 * сессией, поэтому читаем оба стиля ключей и не падаем на недостающих полях —
 * до ответа/при ошибке работаем от дефолтов спеки.
 */
function parsePreflight(data: unknown, format: 'scenario' | 'companion' | 'trial'): PreflightView {
  const d = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const limits =
    d.limits !== null && typeof d.limits === 'object' ? (d.limits as Record<string, unknown>) : d;
  const dayRemainingSec = finiteOrNull(limits.dayRemainingSec ?? limits.day_remaining_sec);
  const dayMaxSec = finiteOrNull(limits.dailyVoiceSecMax ?? limits.day_max_sec);
  let capSec = finiteOrNull(limits.sessionCapSec);
  if (capSec === null && limits.sessionCapSec !== null && typeof limits.sessionCapSec === 'object') {
    capSec = finiteOrNull((limits.sessionCapSec as Record<string, unknown>)[format]);
  }
  return { dayRemainingSec, dayMaxSec, capSec };
}

export default function MaxCallPrestart() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const params = useLocalSearchParams<{ format?: string; scenarioId?: string; cefr?: string; devMode?: string }>();

  const format: 'scenario' | 'companion' | 'trial' =
    params.format === 'companion' || params.format === 'trial' ? params.format : 'scenario';
  const scenarioId = String(params.scenarioId ?? 'coffee');
  const devMode = params.devMode === '1';
  const scenario = useMemo(
    () => (format === 'companion' ? undefined : getScenarioById(scenarioId)),
    [format, scenarioId],
  );

  const [preflight, setPreflight] = useState<PreflightView | null>(null);
  const [preflightReason, setPreflightReason] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Дешёвый preflight без минта: остаток дня + кап формата для карточки.
    void (async () => {
      try {
        await initFirebaseAppCheckIfAvailable();
        const functions = getFunctions(getApp(), FUNCTIONS_REGION);
        const fn = httpsCallable(functions, 'maxVoicePreflight');
        // Греем тот же инстанс минта заранее. На тап кнопки сеть больше не
        // блокирует навигацию, а production minInstances страхует быстрый тап.
        void httpsCallable(functions, 'maxVoiceMint')({ warmupPing: true }).catch(() => {});
        const res = await fn({
          format,
          scenarioId: format === 'companion' ? undefined : scenarioId,
          ...(devMode ? { devMode: true } : {}),
        });
        if (mountedRef.current) {
          setPreflight(parsePreflight(res.data, format));
          setPreflightReason(null);
        }
      } catch (error) {
        if (mountedRef.current) {
          setPreflight(null);
          setPreflightReason(maxVoiceFailureReason(error, 'preflight_failed'));
        }
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [devMode, format, scenarioId]);

  const capSec = preflight?.capSec ?? DEFAULT_CAP_SEC[format];
  const capMin = Math.max(1, Math.round(capSec / 60));
  const dayRemainingSec = preflight?.dayRemainingSec ?? DEFAULT_DAY_SEC;
  const dayMaxSec = preflight?.dayMaxSec ?? DEFAULT_DAY_SEC;
  const remainingMin = Math.max(0, Math.floor(dayRemainingSec / 60));
  const dayMaxMin = Math.max(remainingMin, Math.round(dayMaxSec / 60));
  const noMinutesLeft = dayRemainingSec < 60;

  const title =
    format === 'companion'
      ? triLang(lang, {
          ru: 'Разговор с собеседником',
          uk: 'Розмова зі співрозмовником',
          es: 'Charla con tu compañero',
          'pt-BR': 'Conversa com seu parceiro',
          vi: 'Trò chuyện với bạn đồng hành',
          id: 'Ngobrol dengan teman bicara',
          tr: 'Konuşma arkadaşınla sohbet',
          pl: 'Rozmowa z partnerem',
        })
      : scenario
        ? dialogScenarioTitle(scenario, lang)
        : '';

  const startCall = () => {
    hapticTap();
    const native = loadMaxVoiceNative();
    if (!native) {
      // Гейт должен был скрыть вход, но deeplink обязан деградировать честно.
      Alert.alert(
        triLang(lang, {
          ru: 'Звонки недоступны',
          uk: 'Дзвінки недоступні',
          es: 'Las llamadas no están disponibles',
          'pt-BR': 'As ligações não estão disponíveis',
          vi: 'Cuộc gọi không khả dụng',
          id: 'Panggilan tidak tersedia',
          tr: 'Aramalar kullanılamıyor',
          pl: 'Połączenia są niedostępne',
        }),
        triLang(lang, {
          ru: 'Обнови приложение до последней версии',
          uk: 'Онови застосунок до останньої версії',
          es: 'Actualiza la app a la última versión',
          'pt-BR': 'Atualize o app para a versão mais recente',
          vi: 'Hãy cập nhật ứng dụng lên phiên bản mới nhất',
          id: 'Perbarui aplikasi ke versi terbaru',
          tr: 'Uygulamayı son sürüme güncelle',
          pl: 'Zaktualizuj aplikację do najnowszej wersji',
        }),
      );
      return;
    }
    // Первый тап сразу открывает живой разговорный экран. Все серверные гейты
    // всё равно повторно и атомарно проверяет maxVoiceMint.
    router.replace({
      pathname: '/max_call_session',
      params: {
        format,
        ...(format === 'companion' ? {} : { scenarioId }),
        ...(typeof params.cefr === 'string' && params.cefr !== '' ? { cefr: params.cefr } : {}),
        ...(devMode ? { devMode: '1' } : {}),
      },
    } as any);
  };

  return (
    <ScreenGradient>
      <SafeAreaView testID="max-call-prestart-screen" style={{ flex: 1 }}>
        {/* Шапка */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              hapticTap();
              safeRouterBack(router, '/ai_dialog_home' as any);
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: t.bgCard,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Звонок',
                uk: 'Дзвінок',
                es: 'Llamada',
                'pt-BR': 'Ligação',
                vi: 'Cuộc gọi',
                id: 'Panggilan',
                tr: 'Arama',
                pl: 'Rozmowa',
              })}
            </Text>
            <View style={{ backgroundColor: t.gold, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color: t.textOnGold, fontSize: f.label, fontWeight: '900' }}>MAX</Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 14 }}>
          {/* Карточка формата */}
          <View
            style={{
              backgroundColor: glassFill(t.bgSurface, 0.46),
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: t.accentBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={(scenario?.icon ?? 'chatbubbles-outline') as any} size={24} color={t.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '800' }}>
                {title}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 3 }}>
                {triLang(lang, {
                  ru: `Живой разговор голосом · до ${capMin} мин`,
                  uk: `Жива розмова голосом · до ${capMin} хв`,
                  es: `Conversación de voz en vivo · hasta ${capMin} min`,
                  'pt-BR': `Conversa de voz ao vivo · até ${capMin} min`,
                  vi: `Trò chuyện bằng giọng nói · tối đa ${capMin} phút`,
                  id: `Percakapan suara langsung · hingga ${capMin} mnt`,
                  tr: `Canlı sesli konuşma · en fazla ${capMin} dk`,
                  pl: `Rozmowa głosowa na żywo · do ${capMin} min`,
                })}
              </Text>
            </View>
          </View>

          {/* Остаток минут дня — КРУПНО: топливо живёт здесь, не в звонке */}
          <View
            style={{
              backgroundColor: glassFill(t.bgSurface, 0.46),
              borderRadius: 16,
              padding: 16,
              marginTop: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: noMinutesLeft ? t.wrong : t.textPrimary, fontSize: f.numLg * 1.6, fontWeight: '900' }}>
              {remainingMin}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }} maxFontSizeMultiplier={1.2}>
              {triLang(lang, {
                ru: `минут на сегодня из ${dayMaxMin}`,
                uk: `хвилин на сьогодні з ${dayMaxMin}`,
                es: `minutos para hoy de ${dayMaxMin}`,
                'pt-BR': `minutos para hoje de ${dayMaxMin}`,
                vi: `phút hôm nay trên ${dayMaxMin}`,
                id: `menit hari ini dari ${dayMaxMin}`,
                tr: `bugün için dakika (${dayMaxMin} üzerinden)`,
                pl: `minut na dziś z ${dayMaxMin}`,
              })}
            </Text>
            {noMinutesLeft && (
              <Text
                style={{ color: t.wrong, fontSize: f.caption, marginTop: 8, textAlign: 'center' }}
                maxFontSizeMultiplier={1.2}
              >
                {triLang(lang, {
                  ru: 'Минуты на сегодня закончились — возвращайся завтра',
                  uk: 'Хвилини на сьогодні закінчилися — повертайся завтра',
                  es: 'Se acabaron los minutos de hoy: vuelve mañana',
                  'pt-BR': 'Os minutos de hoje acabaram: volte amanhã',
                  vi: 'Hết phút hôm nay — hãy quay lại vào ngày mai',
                  id: 'Menit hari ini habis — kembali besok',
                  tr: 'Bugünkü dakikalar bitti — yarın tekrar gel',
                  pl: 'Minuty na dziś się skończyły — wróć jutro',
                })}
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }} />

          {preflightReason ? (
            <>
              <View
                testID="max-call-preflight-error"
                style={{ backgroundColor: t.wrongBg, borderRadius: 14, padding: 12, marginBottom: 10 }}
              >
                <Text style={{ color: t.wrong, fontSize: f.caption, fontWeight: '700', textAlign: 'center' }}>
                  {maxVoiceFailureMessage(preflightReason, lang)}
                </Text>
                {__DEV__ ? (
                  <Text style={{ color: t.textMuted, fontSize: f.label, textAlign: 'center', marginTop: 4 }}>
                    {`MAX: ${preflightReason}`}
                  </Text>
                ) : null}
              </View>
              {format !== 'companion' ? (
                <TouchableOpacity
                  testID="max-preflight-fallback-button"
                  accessibilityRole="button"
                  onPress={() => {
                    hapticTap();
                    router.replace({
                      pathname: '/ai_dialog_session',
                      params: { scenarioId, maxFallback: '1' },
                    } as any);
                  }}
                  style={{
                    backgroundColor: t.bgSurface,
                    borderRadius: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    marginBottom: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {triLang(lang, {
                      ru: 'Продолжить в режиме рации',
                      uk: 'Продовжити в режимі рації',
                      es: 'Continuar en modo walkie-talkie',
                      'pt-BR': 'Continuar no modo rádio',
                      vi: 'Tiếp tục ở chế độ bộ đàm',
                      id: 'Lanjut dalam mode walkie-talkie',
                      tr: 'Telsiz modunda devam et',
                      pl: 'Kontynuuj w trybie krótkofalówki',
                    })}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          {/* Кнопка «Позвонить»: никаких сетевых await и loading-state. */}
          <TouchableOpacity
            testID="max-call-start-button"
            accessibilityRole="button"
            disabled={noMinutesLeft}
            onPress={startCall}
            style={{
              backgroundColor: noMinutesLeft ? t.bgSurface2 : t.accent,
              opacity: 1,
              borderRadius: 18,
              paddingVertical: 16,
              marginBottom: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="call" size={20} color={noMinutesLeft ? t.textMuted : t.correctText} />
            <Text
              style={{
                color: noMinutesLeft ? t.textMuted : t.correctText,
                fontSize: f.bodyLg,
                fontWeight: '900',
              }}
              maxFontSizeMultiplier={1.2}
            >
              {triLang(lang, {
                ru: 'Позвонить',
                uk: 'Подзвонити',
                es: 'Llamar',
                'pt-BR': 'Ligar',
                vi: 'Gọi',
                id: 'Telepon',
                tr: 'Ara',
                pl: 'Zadzwoń',
              })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}
