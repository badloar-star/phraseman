import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenGradient from '../components/ScreenGradient';
import StatsCardArtSurface from '../components/StatsCardArtSurface';
import MaxHomeOrb from '../components/home/MaxHomeOrb';
import MaxDailyQuotaMeter from '../components/max/MaxDailyQuotaMeter';
import { glassFill } from '../components/GlassSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import { getScenarioById, dialogScenarioTitle } from './ai_dialog_scenarios';
import { loadMaxVoiceNative } from './max_webrtc_module';
import { isMaxVoiceFailureRetryable, maxVoiceFailureMessage, maxVoiceFailureReason } from './max_voice_error';
import {
  initialMintRequest,
  performMaxVoiceMint,
  prefetchMaxTutorPreview,
  releaseUnusedMint,
  type MaxCallParams,
} from './max_call_mint_request';
import {
  abandonPremint,
  beginPremint,
  markPremintHandoff,
  premintKey,
} from './max_call_premint';
import { getMaxHomeOrbLayers } from './max_home_orb_assets';
import {
  maxTutorPreviewKey,
  peekMaxTutorPreview,
  type MaxTutorPreview,
} from './max_tutor_preview';
import MaxVoiceConsentGate from './max_voice_consent_gate';

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

type PreparationState = 'preparing' | 'ready' | 'failed';

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

function MaxCallPrestartContent() {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
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
    () => ({ format, scenarioId, cefr, devMode, interfaceLang: lang, studyTarget: format === 'tutor' ? 'en' : studyTarget }),
    [format, scenarioId, cefr, devMode, lang, studyTarget],
  );
  const key = premintKey(callParams);
  const previewKey = maxTutorPreviewKey(callParams);
  const [tutorPreview, setTutorPreview] = useState<MaxTutorPreview | null>(
    () => peekMaxTutorPreview(previewKey, Date.now(), true),
  );

  const [preflight, setPreflight] = useState<PreflightView | null>(null);
  const [preflightReason, setPreflightReason] = useState<string | null>(null);
  const [prepState, setPrepState] = useState<PreparationState>('preparing');
  const [prepAttempt, setPrepAttempt] = useState(0);
  const a11y = useMemo(() => ({
    backHint: triLang(lang, { ru: 'Закрывает подготовку MAX и возвращает на предыдущий экран', uk: 'Закриває підготовку MAX і повертає на попередній екран', es: 'Cierra la preparación de MAX y vuelve a la pantalla anterior', 'pt-BR': 'Fecha a preparação do MAX e volta à tela anterior', vi: 'Đóng phần chuẩn bị MAX và quay lại màn hình trước', id: 'Menutup persiapan MAX dan kembali ke layar sebelumnya', tr: 'MAX hazırlığını kapatıp önceki ekrana döner', pl: 'Zamyka przygotowanie MAX i wraca do poprzedniego ekranu' }),
    retryLabel: triLang(lang, { ru: 'Повторить подготовку', uk: 'Повторити підготовку', es: 'Reintentar preparación', 'pt-BR': 'Tentar preparar novamente', vi: 'Thử chuẩn bị lại', id: 'Coba siapkan lagi', tr: 'Hazırlamayı tekrar dene', pl: 'Spróbuj przygotować ponownie' }),
    retryHint: triLang(lang, { ru: 'Снова подготовит урок и голосовое соединение', uk: 'Знову підготує урок і голосове з’єднання', es: 'Vuelve a preparar la clase y la conexión de voz', 'pt-BR': 'Prepara novamente a aula e a conexão de voz', vi: 'Chuẩn bị lại bài học và kết nối thoại', id: 'Menyiapkan lagi pelajaran dan koneksi suara', tr: 'Dersi ve ses bağlantısını yeniden hazırlar', pl: 'Ponownie przygotuje lekcję i połączenie głosowe' }),
    startLabel: triLang(lang, { ru: 'Начать разговор с MAX', uk: 'Почати розмову з MAX', es: 'Empezar conversación con MAX', 'pt-BR': 'Começar conversa com o MAX', vi: 'Bắt đầu trò chuyện với MAX', id: 'Mulai percakapan dengan MAX', tr: 'MAX ile konuşmayı başlat', pl: 'Rozpocznij rozmowę z MAX' }),
    startHint: triLang(lang, { ru: 'Запускает уже подготовленный урок и начинает отсчёт времени', uk: 'Запускає вже підготовлений урок і починає відлік часу', es: 'Inicia la clase ya preparada y comienza a contar el tiempo', 'pt-BR': 'Inicia a aula já preparada e começa a contar o tempo', vi: 'Bắt đầu bài học đã chuẩn bị và tính thời gian', id: 'Memulai pelajaran yang sudah disiapkan dan penghitungan waktu', tr: 'Hazırlanmış dersi başlatır ve süreyi saymaya başlar', pl: 'Uruchamia przygotowaną lekcję i zaczyna odliczać czas' }),
  }), [lang]);

  useEffect(() => {
    if (!isTutor) return;
    let active = true;
    const cached = peekMaxTutorPreview(previewKey, Date.now(), true);
    if (cached) {
      setTutorPreview(cached);
      if (cached.limits) setPreflight(parsePreflight({ limits: cached.limits }, format));
    }
    void prefetchMaxTutorPreview(callParams).then((preview) => {
      if (!active || !preview) return;
      setTutorPreview(preview);
      if (preview.limits) setPreflight(parsePreflight({ limits: preview.limits }, format));
    }).catch(() => {
      // Preview is non-blocking: preserve stale cache or the authored fallback.
    });
    return () => { active = false; };
  }, [callParams, format, isTutor, previewKey]);

  useEffect(() => {
    let active = true;
    setPrepState('preparing');
    setPreflightReason(null);
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
        if (!active) return;
        setPreflight(parsePreflight({ limits: limitsBeforeReserve(mint.limits) }, format));
        setPreflightReason(null);
        setPrepState('ready');
        void AccessibilityInfo.announceForAccessibility(triLang(lang, {
          ru: 'Урок готов к началу', uk: 'Урок готовий до початку', es: 'La clase está lista',
          'pt-BR': 'A aula está pronta', vi: 'Bài học đã sẵn sàng', id: 'Pelajaran siap dimulai',
          tr: 'Ders başlamaya hazır', pl: 'Lekcja jest gotowa',
        }));
      },
      (error) => {
        if (!active) return;
        setPreflight(null);
        setPreflightReason(maxVoiceFailureReason(error, 'preflight_failed'));
        setPrepState('failed');
        // Отклонённый promise нельзя переиспользовать при ручном повторе.
        abandonPremint(key, releaseUnusedMint);
      },
    );
    return () => {
      active = false;
      // Ушёл с пре-экрана без звонка (назад/смена параметров) — резерв назад.
      // После тапа «Позвонить» заготовка уже помечена handoff — это no-op.
      abandonPremint(key, releaseUnusedMint);
    };
  }, [key, callParams, format, lang, prepAttempt]);

  const capSec = preflight?.capSec ?? DEFAULT_CAP_SEC[format];
  const capMin = Math.max(1, Math.round(capSec / 60));
  const dayRemainingSec = preflight?.dayRemainingSec ?? DEFAULT_DAY_SEC;
  const dayMaxSec = preflight?.dayMaxSec ?? DEFAULT_DAY_SEC;
  const remainingMin = Math.max(0, Math.floor(dayRemainingSec / 60));
  const dayMaxMin = Math.max(remainingMin, Math.round(dayMaxSec / 60));
  const noMinutesLeft = dayRemainingSec < 60;
  /*
   * зачем (владелец 2026-08-23): «убери "подготавливаем связь" и недоступную
   * кнопку — раздел должен быть всегда прогрет». Кнопка блокируется ТОЛЬКО
   * когда звонок физически невозможен (кончились минуты) или подготовка
   * провалилась. Ожидание сети больше не запирает человека: экран звонка и так
   * умеет дозреть параллельно с offer (см. startCall ниже), а заготовка теперь
   * стартует ещё на главной, в момент тапа по плитке.
   */
  const startReady = prepState !== 'failed' && !noMinutesLeft;

  const title =
    isTutor
      ? (tutorPreview?.tutorName ?? 'Max')
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
  const activeTutorPreview: MaxTutorPreview = tutorPreview ?? {
    tutorName: 'Max',
    lessonOrdinal: 1,
    lessonType: 'new_material',
    dueCount: 0,
    homeworkCount: 0,
    nextTopic: '',
    goalId: '',
    goalTitle: '',
    goalLevel: cefr ?? 'A1',
    goalMastery: 0,
    displayTitle: triLang(lang, {
      ru: 'Разговор начинается', uk: 'Розмова починається', es: 'La conversación empieza',
      'pt-BR': 'A conversa começa', vi: 'Cuộc trò chuyện bắt đầu', id: 'Percakapan dimulai',
      tr: 'Konuşma başlıyor', pl: 'Rozmowa się zaczyna',
    }),
    outcome: triLang(lang, {
      ru: 'Сегодня превратишь знакомые слова в живую речь.', uk: 'Сьогодні перетвориш знайомі слова на живе мовлення.', es: 'Hoy convertirás palabras conocidas en una conversación real.',
      'pt-BR': 'Hoje você vai transformar palavras conhecidas em fala real.', vi: 'Hôm nay bạn sẽ biến những từ quen thuộc thành lời nói thực tế.', id: 'Hari ini kamu akan mengubah kata yang dikenal menjadi percakapan nyata.',
      tr: 'Bugün bildiğin kelimeleri gerçek konuşmaya dönüştüreceksin.', pl: 'Dziś zamienisz znane słowa w prawdziwą rozmowę.',
    }),
  };
  const maxOrbLayers = getMaxHomeOrbLayers(themeMode);
  const startCall = () => {
    if (!startReady) return;
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

  const retryPreparation = () => {
    hapticTap();
    setPrepAttempt((attempt) => attempt + 1);
  };

  if (isTutor) {
    const heroAccessibilityLabel = triLang(lang, {
      ru: `Урок ${activeTutorPreview.lessonOrdinal}. ${activeTutorPreview.displayTitle}. ${activeTutorPreview.outcome}. Уровень ${activeTutorPreview.goalLevel}. Осталось ${remainingMin} минут.`,
      uk: `Урок ${activeTutorPreview.lessonOrdinal}. ${activeTutorPreview.displayTitle}. ${activeTutorPreview.outcome}. Рівень ${activeTutorPreview.goalLevel}. Залишилося ${remainingMin} хвилин.`,
      es: `Clase ${activeTutorPreview.lessonOrdinal}. ${activeTutorPreview.displayTitle}. ${activeTutorPreview.outcome}. Nivel ${activeTutorPreview.goalLevel}. Quedan ${remainingMin} minutos.`,
      'pt-BR': `Aula ${activeTutorPreview.lessonOrdinal}. ${activeTutorPreview.displayTitle}. ${activeTutorPreview.outcome}. Nível ${activeTutorPreview.goalLevel}. Restam ${remainingMin} minutos.`,
      vi: `Bài ${activeTutorPreview.lessonOrdinal}. ${activeTutorPreview.displayTitle}. ${activeTutorPreview.outcome}. Trình độ ${activeTutorPreview.goalLevel}. Còn ${remainingMin} phút.`,
      id: `Pelajaran ${activeTutorPreview.lessonOrdinal}. ${activeTutorPreview.displayTitle}. ${activeTutorPreview.outcome}. Level ${activeTutorPreview.goalLevel}. Tersisa ${remainingMin} menit.`,
      tr: `Ders ${activeTutorPreview.lessonOrdinal}. ${activeTutorPreview.displayTitle}. ${activeTutorPreview.outcome}. Seviye ${activeTutorPreview.goalLevel}. ${remainingMin} dakika kaldı.`,
      pl: `Lekcja ${activeTutorPreview.lessonOrdinal}. ${activeTutorPreview.displayTitle}. ${activeTutorPreview.outcome}. Poziom ${activeTutorPreview.goalLevel}. Zostało ${remainingMin} minut.`,
    });

    return (
      <ScreenGradient>
        <SafeAreaView testID="max-call-prestart-screen" style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar',
                vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
              })}
              accessibilityHint={a11y.backHint}
              onPress={() => {
                hapticTap();
                safeRouterBack(router, '/(tabs)/home' as any);
              }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: t.bgCard,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
            >
              <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900', flex: 1 }} maxFontSizeMultiplier={2}>
              MAX
            </Text>
          </View>

          <ScrollView
            testID="max-call-prestart-scroll"
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
            showsVerticalScrollIndicator
          >
            <StatsCardArtSurface
              testID="max-call-tutor-hero"
              name="practiceBalance"
              theme={t}
              themeMode={themeMode}
              isGoldTheme={themeMode === 'gold'}
              gradientColors={[t.bgCard, t.bgSurface, t.bgSurface2]}
              radius={24}
              scrim="stats"
              style={{ borderRadius: 24, padding: 20, overflow: 'hidden' }}
            >
              <View accessible accessibilityLabel={heroAccessibilityLabel}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <MaxHomeOrb layers={maxOrbLayers} size={118} ownerVisible />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '800' }} maxFontSizeMultiplier={2}>
                      {triLang(lang, {
                        ru: `Урок ${activeTutorPreview.lessonOrdinal}`, uk: `Урок ${activeTutorPreview.lessonOrdinal}`,
                        es: `Clase ${activeTutorPreview.lessonOrdinal}`, 'pt-BR': `Aula ${activeTutorPreview.lessonOrdinal}`,
                        vi: `Bài ${activeTutorPreview.lessonOrdinal}`, id: `Pelajaran ${activeTutorPreview.lessonOrdinal}`,
                        tr: `Ders ${activeTutorPreview.lessonOrdinal}`, pl: `Lekcja ${activeTutorPreview.lessonOrdinal}`,
                      })}
                    </Text>
                    <Text
                      style={{ color: t.textPrimary, fontSize: f.numMd + 4, fontWeight: '900', lineHeight: Math.round((f.numMd + 4) * 1.16), marginTop: 5 }}
                      maxFontSizeMultiplier={2}
                    >
                      {activeTutorPreview.displayTitle}
                    </Text>
                  </View>
                </View>

                <Text
                  style={{ color: t.textSecond, fontSize: f.bodyLg, fontWeight: '700', lineHeight: Math.round(f.bodyLg * 1.42), marginTop: 16 }}
                  maxFontSizeMultiplier={2}
                >
                  {activeTutorPreview.outcome}
                </Text>

                <View style={{ marginTop: 18 }}>
                  <View style={{ minHeight: 76, borderRadius: 18, backgroundColor: glassFill(t.bgSurface, 0.58), padding: 14 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.numMd + 2, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                      {activeTutorPreview.goalLevel}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', marginTop: 5 }} maxFontSizeMultiplier={2}>
                      {triLang(lang, { ru: 'уровень речи', uk: 'рівень мовлення', es: 'nivel oral', 'pt-BR': 'nível de fala', vi: 'trình độ nói', id: 'level bicara', tr: 'konuşma seviyesi', pl: 'poziom mówienia' })}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 20 }}>
                  <MaxDailyQuotaMeter
                    startRemainingSec={dayRemainingSec}
                    maxSec={dayMaxSec}
                    runningSinceMs={null}
                    variant="hero"
                    lang={lang}
                  />
                </View>
              </View>
            </StatsCardArtSurface>

            <View accessibilityLiveRegion="polite" style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 4, marginTop: 10 }}>
              <Text style={{ color: prepState === 'failed' ? t.wrong : t.textMuted, fontSize: f.sub, fontWeight: '700', textAlign: 'center' }} maxFontSizeMultiplier={2}>
                {prepState === 'ready'
                  ? triLang(lang, { ru: 'Можно начинать', uk: 'Можна починати', es: 'Todo listo', 'pt-BR': 'Tudo pronto', vi: 'Sẵn sàng bắt đầu', id: 'Siap dimulai', tr: 'Başlamaya hazır', pl: 'Możesz zaczynać' })
                  : prepState === 'failed'
                    ? maxVoiceFailureMessage(preflightReason ?? 'preflight_failed', lang)
                    : ''}
              </Text>
            </View>

            {noMinutesLeft ? (
              <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '700', textAlign: 'center', marginBottom: 12 }} maxFontSizeMultiplier={2}>
                {triLang(lang, { ru: 'Минуты на сегодня закончились — возвращайся завтра', uk: 'Хвилини на сьогодні закінчилися — повертайся завтра', es: 'Se acabaron los minutos de hoy: vuelve mañana', 'pt-BR': 'Os minutos de hoje acabaram: volte amanhã', vi: 'Hết phút hôm nay — hãy quay lại vào ngày mai', id: 'Menit hari ini habis — kembali besok', tr: 'Bugünkü dakikalar bitti — yarın tekrar gel', pl: 'Minuty na dziś się skończyły — wróć jutro' })}
              </Text>
            ) : null}

            {/* зачем: аудит 2026-08-22 — при неретраебельной причине (минуты
                кончились, линия выключена) кнопка повтора лишь дразнила. */}
            {prepState === 'failed' && isMaxVoiceFailureRetryable(preflightReason) ? (
              <>
                <TouchableOpacity
                  testID="max-preflight-retry-button"
                  accessibilityRole="button"
                  accessibilityLabel={a11y.retryLabel}
                  accessibilityHint={a11y.retryHint}
                  onPress={retryPreparation}
                  style={{ minHeight: 52, backgroundColor: t.bgSurface, borderRadius: 16, paddingHorizontal: 18, marginBottom: 10, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} maxFontSizeMultiplier={2}>
                    {triLang(lang, { ru: 'Повторить подготовку', uk: 'Повторити підготовку', es: 'Reintentar preparación', 'pt-BR': 'Tentar preparar novamente', vi: 'Thử chuẩn bị lại', id: 'Coba siapkan lagi', tr: 'Hazırlamayı tekrar dene', pl: 'Spróbuj przygotować ponownie' })}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              testID="max-call-start-button"
              accessibilityRole="button"
              accessibilityLabel={a11y.startLabel}
              accessibilityHint={a11y.startHint}
              accessibilityState={{ disabled: !startReady, busy: prepState === 'preparing' }}
              disabled={!startReady}
              onPress={startCall}
              style={{
                minHeight: 60,
                backgroundColor: startReady ? t.accent : t.bgSurface2,
                borderRadius: 20,
                paddingVertical: 17,
                paddingHorizontal: 18,
                marginTop: 2,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Ionicons name="call" size={22} color={startReady ? t.correctText : t.textGhost} />
              <Text style={{ color: startReady ? t.correctText : t.textGhost, fontSize: f.bodyLg, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                {/* зачем: кнопка больше не сообщает о подготовке — она зовёт
                    начать. Если заготовка не дозрела, ожидание происходит уже
                    внутри звонка, параллельно с открытием соединения. */}
                {triLang(lang, { ru: 'Начать урок', uk: 'Почати урок', es: 'Empezar la clase', 'pt-BR': 'Começar a aula', vi: 'Bắt đầu bài học', id: 'Mulai pelajaran', tr: 'Dersi başlat', pl: 'Rozpocznij lekcję' })}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <SafeAreaView testID="max-call-prestart-screen" style={{ flex: 1 }}>
        {/* Шапка */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
            accessibilityHint={a11y.backHint}
            onPress={() => {
              hapticTap();
              safeRouterBack(router, '/ai_dialog_home' as any);
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
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
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }} maxFontSizeMultiplier={2}>
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
                maxFontSizeMultiplier={2}
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
              {isMaxVoiceFailureRetryable(preflightReason) ? (
                <TouchableOpacity
                  testID="max-preflight-retry-button"
                  accessibilityRole="button"
                  accessibilityLabel={a11y.retryLabel}
                  accessibilityHint={a11y.retryHint}
                  onPress={retryPreparation}
                  style={{
                    minHeight: 48,
                    backgroundColor: t.bgSurface,
                    borderRadius: 14,
                    paddingHorizontal: 18,
                    marginBottom: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {triLang(lang, { ru: 'Повторить подготовку', uk: 'Повторити підготовку', es: 'Reintentar preparación', 'pt-BR': 'Tentar preparar novamente', vi: 'Thử chuẩn bị lại', id: 'Coba siapkan lagi', tr: 'Hazırlamayı tekrar dene', pl: 'Spróbuj przygotować ponownie' })}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {/* зачем: владелец 2026-08-22 — «радио-режим» (walkie-talkie фолбэк)
                  убран совсем; при сбое подготовки остаётся только «Повторить». */}
            </>
          ) : null}

          {/* Разговор стартует только после готового premint: нажатие уже не ждёт сеть. */}
          <TouchableOpacity
            testID="max-call-start-button"
            accessibilityRole="button"
            accessibilityLabel={a11y.startLabel}
            accessibilityHint={a11y.startHint}
            accessibilityState={{ disabled: !startReady, busy: prepState === 'preparing' }}
            disabled={!startReady}
            onPress={startCall}
            style={{
              minHeight: 56,
              backgroundColor: startReady ? t.accent : t.bgSurface2,
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
            {/* зачем: песочные часы вместо трубки читались как «жди» — кнопка
                теперь активна всегда, значок только трубка. */}
            <Ionicons name="call" size={20} color={startReady ? t.correctText : t.textGhost} />
            <Text
              style={{
                color: startReady ? t.correctText : t.textGhost,
                fontSize: f.bodyLg,
                fontWeight: '900',
              }}
              maxFontSizeMultiplier={2}
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

export default function MaxCallPrestart() {
  return (
    <MaxVoiceConsentGate>
      <MaxCallPrestartContent />
    </MaxVoiceConsentGate>
  );
}
