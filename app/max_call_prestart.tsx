import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import { getScenarioById, dialogScenarioTitle } from './ai_dialog_scenarios';
import { loadMaxVoiceNative } from './max_webrtc_module';
import { maxVoiceFailureMessage, maxVoiceFailureReason } from './max_voice_error';
import {
  initialMintRequest,
  performMaxVoiceMint,
  releaseUnusedMint,
  type MaxCallParams,
} from './max_call_mint_request';
import {
  abandonPremint,
  beginPremint,
  markPremintHandoff,
  premintKey,
} from './max_call_premint';

/**
 * Пре-экран «Позвонить» (спека, раздел 1: max_call_prestart).
 *
 * Зачем отдельный экран: «топливо» (остаток минут дня) живёт ЗДЕСЬ крупно,
 * а не в звонке — во время разговора таймер давит на ученика, до разговора
 * помогает решиться. Микрофон открывает только настоящий звонок, чтобы
 * prewarm-трек не гонялся с WebRTC на iPhone.
 *
 * зачем premint: владелец 2026-08-16 — «при нажатии на кнопку надо, чтобы
 * сразу работало». Настоящий maxVoiceMint стартует ЗДЕСЬ при входе (он же
 * отдаёт остаток дня и кап для карточки — отдельный preflight больше не
 * нужен); тап «Позвонить» открывает экран звонка, который забирает готовую
 * заготовку и сразу шлёт SDP. Ушёл без звонка — резерв отпускается сразу
 * (release), а секунды разговора сервер считает от «алло», не от минта.
 */

/** Дефолтные капы форматов (спека §3 sessionCapSec) до ответа сервера. */
const DEFAULT_CAP_SEC: Record<'scenario' | 'companion' | 'trial' | 'tutor', number> = {
  scenario: 300,
  companion: 480,
  trial: 180,
  tutor: 600,
};
/**
 * Дневной пул по умолчанию — до ответа сервера. Совпадает с серверным дефолтом
 * dailyVoiceSecMax (лимиты сняты владельцем 2026-08-16: 4ч/день), чтобы цифра
 * на карточке не «прыгала» 15 → 240, когда доезжает минт.
 */
const DEFAULT_DAY_SEC = 14_400;

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

interface PreflightView {
  dayRemainingSec: number | null;
  dayMaxSec: number | null;
  capSec: number | null;
}

/**
 * limits минта отдают остаток дня УЖЕ за вычетом резерва этого звонка; на
 * карточке «минут на сегодня» показываем остаток ДО звонка (как раньше делал
 * preflight) — иначе цифра занижена на длину ещё не состоявшегося разговора.
 */
export function limitsBeforeReserve(limits: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!limits) return {};
  const day = finiteOrNull(limits.dayRemainingSec);
  const reserved = finiteOrNull(limits.reservedSec);
  if (day === null || reserved === null) return limits;
  return { ...limits, dayRemainingSec: day + reserved };
}

/**
 * Защитный разбор limits ответа минта (раньше — preflight): читаем оба стиля
 * ключей и не падаем на недостающих полях — до ответа/при ошибке работаем от
 * дефолтов спеки.
 */
export function parsePreflight(data: unknown, format: 'scenario' | 'companion' | 'trial' | 'tutor'): PreflightView {
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

  const format: 'scenario' | 'companion' | 'trial' | 'tutor' =
    params.format === 'companion' || params.format === 'trial' || params.format === 'tutor'
      ? params.format
      : 'scenario';
  const isTutor = format === 'tutor';
  const scenarioId = String(params.scenarioId ?? 'coffee');
  const devMode = params.devMode === '1';
  const scenario = useMemo(
    () => (format === 'companion' || format === 'tutor' ? undefined : getScenarioById(scenarioId)),
    [format, scenarioId],
  );

  const cefr = typeof params.cefr === 'string' && params.cefr !== '' ? params.cefr : undefined;
  const callParams: MaxCallParams = useMemo(
    () => ({ format, scenarioId, cefr, devMode, interfaceLang: lang }),
    [format, scenarioId, cefr, devMode, lang],
  );
  // Учитель: имя из минта (конфиг админки); до ответа — дефолт сервера.
  const [tutorName, setTutorName] = useState('Max');
  const key = premintKey(callParams);

  const [preflight, setPreflight] = useState<PreflightView | null>(null);
  const [preflightReason, setPreflightReason] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Заготовка минта стартует сразу при входе (см. шапку файла): её же limits
    // питают карточку остатка минут — второй сетевой круг (preflight) не нужен.
    const entry = beginPremint(
      key,
      () => performMaxVoiceMint(callParams, initialMintRequest(callParams)),
      Date.now(),
      releaseUnusedMint,
    );
    entry.promise.then(
      (mint) => {
        if (!mountedRef.current) return;
        setPreflight(parsePreflight({ limits: limitsBeforeReserve(mint.limits) }, format));
        if (mint.tutor?.name) setTutorName(mint.tutor.name);
        setPreflightReason(null);
      },
      (error) => {
        if (!mountedRef.current) return;
        setPreflight(null);
        setPreflightReason(maxVoiceFailureReason(error, 'preflight_failed'));
      },
    );
    return () => {
      mountedRef.current = false;
      // Ушёл с пре-экрана без звонка (назад/смена параметров) — резерв назад.
      // После тапа «Позвонить» заготовка уже помечена handoff — это no-op.
      abandonPremint(key, releaseUnusedMint);
    };
  }, [key, callParams, format]);

  const capSec = preflight?.capSec ?? DEFAULT_CAP_SEC[format];
  const capMin = Math.max(1, Math.round(capSec / 60));
  const dayRemainingSec = preflight?.dayRemainingSec ?? DEFAULT_DAY_SEC;
  const dayMaxSec = preflight?.dayMaxSec ?? DEFAULT_DAY_SEC;
  const remainingMin = Math.max(0, Math.floor(dayRemainingSec / 60));
  const dayMaxMin = Math.max(remainingMin, Math.round(dayMaxSec / 60));
  const noMinutesLeft = dayRemainingSec < 60;

  const title =
    isTutor
      ? tutorName
      : format === 'companion'
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
    // Заготовку заберёт экран звонка — cleanup этого экрана её не отпустит.
    markPremintHandoff(key);
    // Первый тап сразу открывает живой разговорный экран: никакого ожидания
    // сети — минт либо уже готов, либо дозреет параллельно с offer.
    router.replace({
      pathname: '/max_call_session',
      params: {
        format,
        ...(format === 'companion' ? {} : { scenarioId }),
        ...(cefr !== undefined ? { cefr } : {}),
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
              <Ionicons name={(isTutor ? 'school-outline' : (scenario?.icon ?? 'chatbubbles-outline')) as any} size={24} color={t.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '800' }}>
                {title}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 3 }}>
                {isTutor
                  ? triLang(lang, {
                      ru: `Урок с учителем голосом · до ${capMin} мин`,
                      uk: `Урок із вчителем голосом · до ${capMin} хв`,
                      es: `Clase de voz con tu profesor · hasta ${capMin} min`,
                      'pt-BR': `Aula de voz com seu professor · até ${capMin} min`,
                      vi: `Buổi học bằng giọng nói với giáo viên · tối đa ${capMin} phút`,
                      id: `Pelajaran suara bersama guru · hingga ${capMin} mnt`,
                      tr: `Öğretmenle sesli ders · en fazla ${capMin} dk`,
                      pl: `Lekcja głosowa z nauczycielem · do ${capMin} min`,
                    })
                  : triLang(lang, {
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
