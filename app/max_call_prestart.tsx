import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
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
  const lessonTypeLabel = (kind: 'new_material' | 'review_and_scene' | 'free_talk'): string =>
    kind === 'new_material'
      ? triLang(lang, { ru: 'Новый материал', uk: 'Новий матеріал', es: 'Material nuevo', 'pt-BR': 'Conteúdo novo', vi: 'Bài mới', id: 'Materi baru', tr: 'Yeni konu', pl: 'Nowy materiał' })
      : kind === 'review_and_scene'
        ? triLang(lang, { ru: 'Повторение и сцена', uk: 'Повторення і сцена', es: 'Repaso y escena', 'pt-BR': 'Revisão e cena', vi: 'Ôn tập và tình huống', id: 'Ulangan dan adegan', tr: 'Tekrar ve sahne', pl: 'Powtórka i scenka' })
        : triLang(lang, { ru: 'Свободный разговор', uk: 'Вільна розмова', es: 'Conversación libre', 'pt-BR': 'Conversa livre', vi: 'Trò chuyện tự do', id: 'Percakapan bebas', tr: 'Serbest sohbet', pl: 'Swobodna rozmowa' });
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
    () => ({ format, scenarioId, cefr, devMode, interfaceLang: lang, studyTarget }),
    [format, scenarioId, cefr, devMode, lang, studyTarget],
  );
  // Учитель: имя из минта (конфиг админки); до ответа — дефолт сервера.
  const [tutorName, setTutorName] = useState('Max');
  // План сегодняшнего урока (ступень 1): тип урока, сколько фраз повторим, домашка.
  // Показывается ученику на экране «Учитель» (решение владельца 2026-08-17).
  const [tutorPlan, setTutorPlan] = useState<{
    lessonsSoFar: number;
    lessonType: 'new_material' | 'review_and_scene' | 'free_talk';
    dueCount: number;
    homeworkCount: number;
    nextTopic: string;
    goalTitle: string;
    goalLevel: string;
    goalsDone: number;
    goalsTotal: number;
    upcoming: Array<{ ordinal: number; lessonType: 'new_material' | 'review_and_scene' | 'free_talk'; goalTitle: string }>;
  } | null>(null);
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
        if (mint.tutor) {
          setTutorPlan({
            lessonsSoFar: mint.tutor.lessonsSoFar,
            lessonType: mint.tutor.plan?.lessonType ?? 'new_material',
            dueCount: mint.tutor.plan?.duePhrases.length ?? 0,
            homeworkCount: mint.tutor.homework.length,
            nextTopic: mint.tutor.nextTopic,
            goalTitle: mint.tutor.plan?.goal
              ? (lang === 'ru' ? mint.tutor.plan.goal.title.ru : lang === 'uk' ? mint.tutor.plan.goal.title.uk : mint.tutor.plan.goal.title.en)
              : '',
            goalLevel: mint.tutor.plan?.goal?.level ?? '',
            goalsDone: mint.tutor.plan?.goalsDone ?? 0,
            goalsTotal: mint.tutor.plan?.goalsTotal ?? 0,
            upcoming: (mint.tutor.plan?.upcoming ?? []).slice(0, 5).map((u) => ({
              ordinal: u.ordinal,
              lessonType: u.lessonType,
              goalTitle: u.goal ? (lang === 'ru' ? u.goal.title.ru : lang === 'uk' ? u.goal.title.uk : u.goal.title.en) : '',
            })),
          });
        }
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

          {/* План урока учителя: что будет сегодня — тип, повторение, домашка (без ожидания: до ответа блока нет) */}
          {isTutor && tutorPlan && (
            <View
              testID="max-call-tutor-plan"
              style={{
                backgroundColor: glassFill(t.bgSurface, 0.46),
                borderRadius: 16,
                padding: 14,
                marginTop: 12,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} maxFontSizeMultiplier={1.2}>
                {triLang(lang, {
                  ru: `Урок ${tutorPlan.lessonsSoFar + 1}`,
                  uk: `Урок ${tutorPlan.lessonsSoFar + 1}`,
                  es: `Clase ${tutorPlan.lessonsSoFar + 1}`,
                  'pt-BR': `Aula ${tutorPlan.lessonsSoFar + 1}`,
                  vi: `Buổi học ${tutorPlan.lessonsSoFar + 1}`,
                  id: `Pelajaran ${tutorPlan.lessonsSoFar + 1}`,
                  tr: `Ders ${tutorPlan.lessonsSoFar + 1}`,
                  pl: `Lekcja ${tutorPlan.lessonsSoFar + 1}`,
                })}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {[
                  lessonTypeLabel(tutorPlan.lessonType),
                  tutorPlan.dueCount > 0
                    ? triLang(lang, { ru: `Повторим: ${tutorPlan.dueCount}`, uk: `Повторимо: ${tutorPlan.dueCount}`, es: `Repaso: ${tutorPlan.dueCount}`, 'pt-BR': `Revisão: ${tutorPlan.dueCount}`, vi: `Ôn: ${tutorPlan.dueCount}`, id: `Ulang: ${tutorPlan.dueCount}`, tr: `Tekrar: ${tutorPlan.dueCount}`, pl: `Powtórka: ${tutorPlan.dueCount}` })
                    : '',
                  tutorPlan.homeworkCount > 0
                    ? triLang(lang, { ru: `Домашка: ${tutorPlan.homeworkCount}`, uk: `Домашка: ${tutorPlan.homeworkCount}`, es: `Tarea: ${tutorPlan.homeworkCount}`, 'pt-BR': `Tarefa: ${tutorPlan.homeworkCount}`, vi: `Bài tập: ${tutorPlan.homeworkCount}`, id: `PR: ${tutorPlan.homeworkCount}`, tr: `Ödev: ${tutorPlan.homeworkCount}`, pl: `Zadanie: ${tutorPlan.homeworkCount}` })
                    : '',
                ].filter((c) => c !== '').map((chip, i) => (
                  <View key={`plan-chip-${i}`} style={{ backgroundColor: i === 0 ? t.accentBg : glassFill(t.bgSurface, 0.7), borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ color: i === 0 ? t.accent : t.textPrimary, fontSize: f.caption, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>{chip}</Text>
                  </View>
                ))}
              </View>
              {tutorPlan.goalTitle !== '' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <Ionicons name="flag-outline" size={15} color={t.accent} />
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700', flex: 1 }} maxFontSizeMultiplier={1.2}>
                    {`${tutorPlan.goalLevel} · ${tutorPlan.goalTitle}`}
                  </Text>
                  {tutorPlan.goalsTotal > 0 && (
                    <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800', fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.2}>
                      {`${tutorPlan.goalsDone} / ${tutorPlan.goalsTotal}`}
                    </Text>
                  )}
                </View>
              )}
              {tutorPlan.upcoming.length > 1 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.4 }} maxFontSizeMultiplier={1.2}>
                    {triLang(lang, { ru: 'Ближайшие уроки', uk: 'Найближчі уроки', es: 'Próximas clases', 'pt-BR': 'Próximas aulas', vi: 'Các buổi học tới', id: 'Pelajaran berikutnya', tr: 'Sonraki dersler', pl: 'Najbliższe lekcje' })}
                  </Text>
                  {tutorPlan.upcoming.map((u, i) => (
                    <View key={`up-${u.ordinal}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: i === 0 ? 6 : 4 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: i === 0 ? t.accentBg : glassFill(t.bgSurface, 0.8), alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: i === 0 ? t.accent : t.textMuted, fontSize: f.label, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{String(u.ordinal)}</Text>
                      </View>
                      <Text style={{ color: i === 0 ? t.textPrimary : t.textSecond, fontSize: f.caption, fontWeight: i === 0 ? '700' : '600', flex: 1 }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                        {`${lessonTypeLabel(u.lessonType)}${u.goalTitle ? ' · ' + u.goalTitle : ''}`}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {tutorPlan.nextTopic !== '' && (
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 10 }} maxFontSizeMultiplier={1.2}>
                  {triLang(lang, {
                    ru: `Тема: ${tutorPlan.nextTopic}`, uk: `Тема: ${tutorPlan.nextTopic}`, es: `Tema: ${tutorPlan.nextTopic}`,
                    'pt-BR': `Tema: ${tutorPlan.nextTopic}`, vi: `Chủ đề: ${tutorPlan.nextTopic}`, id: `Topik: ${tutorPlan.nextTopic}`,
                    tr: `Konu: ${tutorPlan.nextTopic}`, pl: `Temat: ${tutorPlan.nextTopic}`,
                  })}
                </Text>
              )}
            </View>
          )}

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
