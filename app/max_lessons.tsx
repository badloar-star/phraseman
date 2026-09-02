// ═══════════════════════════════════════════════════════════════════════════
// max_lessons.tsx — раздел «Уроки с МАКСом», макет «Циферблат».
//
// зачем (владелец 2026-09-01, выбор из десяти макетов): «первый вариант самый
// чёткий — циферблат, хочу чтобы в приложении выглядело так же». Минуты — не
// строчка текста, а кольцо: остаток виден формой раньше, чем прочитан цифрой.
//
// Решения владельца, зашитые в этот экран:
//   • заголовка «Уроки с МАКСом» нет — вверху кольцо минут и два действия;
//   • чипов-фильтров нет («убери эти кнопки, они не нужны такими»);
//   • тап по уроку РАСКРЫВАЕТ карточку, предыдущая сворачивается;
//   • звонок начинается кнопкой внутри раскрытой карточки — случайный тап
//     по списку не тратит минуты;
//   • перед уроком идёт отсчёт 5 секунд с возможностью отменить;
//   • пройденный урок не исчезает: приглушён тоном, звёзды горят;
//   • всё крупное по эталону раздела «Статистика» (память
//     feedback_design_etalon_stats_krupno): карточки radius 18–22, медальоны
//     44+, главные числа весом 900, ничего мельче f.label.
//
// Первый кадр обязан совпадать с финальным (Performance Bible): минуты, звёзды
// и заголовки берутся из кэшей СИНХРОННО, до всякой сети. Сеть только уточняет.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import { animateNextLayoutTransition } from './smooth_layout';
import { DebugLogger } from './debug-logger';
import {
  MAX_LESSON_CATALOG,
  MAX_LESSON_LEVELS,
  maxLessonStars,
  maxLessonTopicTitle,
  maxLessonsDone,
  recommendedMaxLessonId,
  type MaxLessonCatalogItem,
} from './max_lesson_catalog';
import { invalidateMaxTutorPreview, maxTutorPreviewKey, peekMaxTutorPreview } from './max_tutor_preview';
import {
  bootMaxCatalogTitles,
  fetchMaxCatalogTitles,
  guessLearnerCefr,
  peekMaxCatalogTitles,
  prefetchMaxTutorPreview,
} from './max_call_mint_request';
import { isAiVoiceConsentGranted } from './max_voice_consent';
import { loadSpeechHistory, peekSpeechHistory } from './max_speech_history';
import MaxLessonsStatsSheet from '../components/max/MaxLessonsStatsSheet';
import VoiceMinutePackSheet from '../modules/voice_minutes/VoiceMinutePackSheet';
import { readVoiceMinuteWalletStatus } from '../modules/voice_minutes/wallet';
import { peekVoiceMinutes, writeVoiceMinutePeek } from '../modules/voice_minutes/peek_cache';
import {
  computeVoiceTrends,
  computeVoiceWeeklySeries,
  type VoiceCallTrendSample,
  type VoiceTrends,
  type VoiceWeeklySeries,
} from './max_voice_metrics';
import { useStudyTarget } from '../components/StudyTargetContext';

/** Названия уроков приходят с сервера (там они локализованы на 9 языков). */
type LessonTitles = Record<string, string>;

/**
 * Полный круг кольца минут. Дальше него шкала не растёт: 300-минутный пакет и
 * 1000 минут выглядели бы одинаково полными, и это честно — «минут много».
 */
const MINUTES_FULL_SCALE = 120;

/** Длительность урока для карточки (владелец: урок 12–15 минут). */
const LESSON_MINUTES = '12–15';

export default function MaxLessonsScreen() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const { studyTarget } = useStudyTarget();

  // ⚠️ Ключ обязан совпасть с тем, которым Главная греет превью на фокусе
  // (app/(tabs)/home.tsx: maxTutorCallParams), иначе кэш не найдётся и раздел
  // откроется с нулями там, где данные уже есть.
  const previewKey = maxTutorPreviewKey({
    format: 'tutor',
    cefr: guessLearnerCefr(),
    interfaceLang: lang,
    studyTarget,
  });
  const cachedPreview = peekMaxTutorPreview(previewKey, Date.now(), true);
  const mastery = cachedPreview?.catalogMastery ?? {};
  const level = cachedPreview?.catalogProgress.level ?? cachedPreview?.goalLevel ?? 'A1';

  const [minuteSheetVisible, setMinuteSheetVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [titles, setTitles] = useState<LessonTitles>(() => peekMaxCatalogTitles(lang) ?? {});

  /**
   * Раскрытая карточка: ровно одна за раз.
   *
   * зачем (владелец 2026-09-01): «при нажатии на блок он сначала увеличивался,
   * соответственно тот что был до — уменьшается». Одна открытая карточка
   * держит экран спокойным: нет каши из раскрытых блоков, и всегда понятно,
   * какой урок сейчас в фокусе.
   */
  const [openId, setOpenId] = useState<string | null>(null);

  const done = useMemo(() => maxLessonsDone(mastery), [mastery]);
  const recommendedId = useMemo(() => recommendedMaxLessonId(mastery, level), [mastery, level]);

  // ── Минуты для кольца ─────────────────────────────────────────────────────
  const [walletSec, setWalletSec] = useState<number | null>(() => peekVoiceMinutes()?.seconds ?? null);
  // guard-ok: клиент НИЧЕГО не списывает. Только показ: читаем серверный
  // остаток и переводим секунды в минуты. Источник истины — серверный кошелёк.
  const minutesLeft = walletSec === null ? null : Math.max(0, Math.floor(walletSec / 60));

  useEffect(() => {
    let active = true;
    void readVoiceMinuteWalletStatus()
      .then((w) => {
        if (!active) return;
        const total = w.availableSeconds + w.reservedSeconds;
        setWalletSec(total);
        writeVoiceMinutePeek(total);
        DebugLogger.info('[MAX-LESSONS]', `кошелёк: доступно=${w.availableSeconds}с резерв=${w.reservedSeconds}с`);
      })
      .catch((e) => {
        // Немой catch запрещён: раздел откроется и без минут, но причина
        // «почему прочерк вместо числа» обязана быть видна.
        DebugLogger.warn('[MAX-LESSONS]', `кошелёк не прочитан: ${e instanceof Error ? e.message : String(e)}`);
      });
    return () => { active = false; };
  }, []);

  // ── Тренды речи для листа статистики ──────────────────────────────────────
  // зачем: тренды и ряд столбиков держим ОДНИМ состоянием и считаем от
  // одного Date.now(). Двумя отдельными они разъезжались бы по времени расчёта,
  // и на границе суток итог месяца не сходился бы с суммой отрезков.
  const speechStatsOf = useCallback((samples: VoiceCallTrendSample[]) => {
    const nowMs = Date.now();
    return { trends: computeVoiceTrends(samples, nowMs), series: computeVoiceWeeklySeries(samples, nowMs) };
  }, []);

  const [speechStats, setSpeechStats] = useState<{ trends: VoiceTrends; series: VoiceWeeklySeries } | null>(() => {
    // Синхронный peek: лист открывается с готовыми цифрами, без первого кадра
    // с пустотой (Performance Bible — первый кадр = финальная геометрия).
    const cached = peekSpeechHistory();
    return cached ? speechStatsOf(cached) : null;
  });

  useEffect(() => {
    let active = true;
    void loadSpeechHistory().then((samples) => {
      if (!active) return;
      setSpeechStats(speechStatsOf(samples));
    });
    return () => { active = false; };
  }, [speechStatsOf]);

  // ── Заголовки уроков: память → диск → сеть ────────────────────────────────
  // Один запрос на язык: список меняется только с релизом.
  const titlesRequestedRef = useRef<string>('');
  useEffect(() => {
    let active = true;
    if (Object.keys(titles).length > 0) return () => { active = false; };
    if (titlesRequestedRef.current === lang) return () => { active = false; };
    titlesRequestedRef.current = lang;
    void bootMaxCatalogTitles(lang).then((fromDisk) => {
      if (!active) return;
      if (fromDisk) {
        setTitles(fromDisk);
        return;
      }
      // Согласие на обработку ГОЛОСА здесь не требуется: заголовки уроков —
      // витрина, а не запись речи (проверено на эмуляторе 2026-08-31).
      void fetchMaxCatalogTitles({
        format: 'tutor',
        scenarioId: 'coffee',
        cefr: guessLearnerCefr(),
        devMode: false,
        interfaceLang: lang,
        studyTarget,
      }).then((fromNet) => {
        if (active && fromNet) setTitles(fromNet);
      });
    });
    return () => { active = false; };
    // titles намеренно НЕ в зависимостях: эффект отрабатывает один раз на язык.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, studyTarget]);

  // ── Догрузка звёзд, если Главная не успела прогреть превью ────────────────
  const [, setRefreshTick] = useState(0);
  useEffect(() => {
    let active = true;
    if (peekMaxTutorPreview(previewKey, Date.now(), true)) return () => { active = false; };
    if (!isAiVoiceConsentGranted()) {
      // Ранний выход объясняет себя: звёзды — личный прогресс, без согласия
      // на обработку голоса сети быть не должно. Это штатный путь.
      DebugLogger.info('[MAX-LESSONS]', 'stars skipped: voice consent not granted yet');
      return () => { active = false; };
    }
    void prefetchMaxTutorPreview({
      format: 'tutor',
      scenarioId: 'coffee',
      cefr: guessLearnerCefr(),
      devMode: false,
      interfaceLang: lang,
      studyTarget,
    }).then((preview) => {
      if (!active) return;
      if (!preview) {
        DebugLogger.warn('[MAX-LESSONS]', 'stars fetch: сервер не прислал превью');
        return;
      }
      setRefreshTick((n) => n + 1);
    }).catch((e) => {
      DebugLogger.warn('[MAX-LESSONS]', `stars fetch failed: ${e instanceof Error ? e.message : String(e)}`);
    });
    return () => { active = false; };
  }, [lang, previewKey, studyTarget]);

  // ── Прогрев рекомендованного урока ────────────────────────────────────────
  // Владелец: «уроки должны быть прогреты и готовы ещё до того, как раздел
  // откроется». Греем РОВНО ОДИН: заготовка держит серверный резерв минут,
  // греть весь экран значило бы упереться в voice_session_active.
  const warmedRef = useRef<string>('');
  useEffect(() => {
    if (!recommendedId || warmedRef.current === recommendedId) return;
    if (!isAiVoiceConsentGranted()) {
      DebugLogger.info('[MAX-LESSONS]', 'прогрев пропущен: нет согласия на обработку голоса');
      return;
    }
    const lesson = MAX_LESSON_CATALOG.find((l) => l.id === recommendedId);
    if (!lesson) return;
    warmedRef.current = recommendedId;
    const callParams = {
      format: 'tutor' as const,
      scenarioId: 'coffee',
      cefr: lesson.level,
      devMode: false,
      interfaceLang: lang,
      studyTarget,
      goalId: lesson.id,
    };
    DebugLogger.info('[MAX-LESSONS]', `прогрев урока ${lesson.id} (${lesson.level})`);
    void import('./max_call_premint').then(({ beginPremint, premintKey, isMaxCallLineBusy }) =>
      import('./max_call_mint_request').then(({ initialMintRequest, performMaxVoiceMint, releaseUnusedMint }) => {
        if (!isAiVoiceConsentGranted()) return;
        // зачем (владелец 2026-09-02, лог 20:23:07): этот экран остаётся
        // смонтированным под экраном звонка, и прогрев стрелял НАСТОЯЩИМ
        // минтом в живую сессию — платный вызов впустую плюс мусорный
        // voice_session_active. Хуже: успей он создать резерв, следующий
        // звонок упёрся бы в него ровно как в исходном баге.
        if (isMaxCallLineBusy()) {
          // Ранний выход объясняет себя: прогрев вернётся сам, когда линия
          // освободится (эффект перезапустится по смене рекомендации).
          warmedRef.current = '';
          DebugLogger.info('[MAX-LESSONS]', 'прогрев пропущен: идёт звонок, линия занята');
          return;
        }
        beginPremint(
          premintKey(callParams),
          () => performMaxVoiceMint(callParams, initialMintRequest(callParams)),
          Date.now(),
          releaseUnusedMint,
        );
      }),
    ).catch((e) => {
      // Прогрев — оптимизация: не вышло, значит связь подготовится при старте.
      DebugLogger.warn('[MAX-LESSONS]', `прогрев не удался: ${e instanceof Error ? e.message : String(e)}`);
    });
  }, [lang, recommendedId, studyTarget]);

  // ── Список: заголовки уровней + уроки ─────────────────────────────────────
  const rows = useMemo(() => {
    const out: Array<
      | { kind: 'header'; key: string; level: string }
      | { kind: 'lesson'; key: string; lesson: MaxLessonCatalogItem }
    > = [];
    for (const lvl of MAX_LESSON_LEVELS) {
      const inLevel = MAX_LESSON_CATALOG.filter((l) => l.level === lvl);
      if (inLevel.length === 0) continue;
      out.push({ kind: 'header', key: `h_${lvl}`, level: lvl });
      for (const lesson of inLevel) out.push({ kind: 'lesson', key: lesson.id, lesson });
    }
    DebugLogger.info('[MAX-LESSONS]', `список: каталог=${MAX_LESSON_CATALOG.length} строк=${out.length}`);
    return out;
  }, []);

  /** Тап по карточке: раскрыть эту, свернуть прежнюю. Сети здесь нет. */
  const toggleLesson = useCallback((id: string) => {
    // Плавное перестроение списка одной системной анимацией — так соседние
    // строки не «прыгают», а расступаются (паттерн проекта smooth_layout).
    animateNextLayoutTransition();
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  // Защита от двойного тапа: старт открывает ЗВОНОК, и второй тап за те же
  // полсекунды создал бы второй экран разговора со своим резервом минут.
  const openingRef = useRef(false);
  const startLesson = useCallback((lesson: MaxLessonCatalogItem) => {
    if (openingRef.current) {
      DebugLogger.info('[MAX-LESSONS]', 'повторный тап проигнорирован: урок уже стартует');
      return;
    }
    openingRef.current = true;
    setTimeout(() => { openingRef.current = false; }, 1200);
    DebugLogger.info('[MAX-LESSONS]', `старт урока ${lesson.id} (${lesson.level}) звёзд=${maxLessonStars(mastery, lesson.id)}`);
    // Прямо в разговор. Деньги в безопасности: сервер считает секунды от
    // АКТИВАЦИИ (voiceSessionClockStartMs → activatedAtMs), а не от соединения,
    // поэтому отмена во время отсчёта ничего не стоит.
    router.push({
      pathname: '/max_call_session',
      params: {
        format: 'tutor',
        cefr: lesson.level,
        studyTarget,
        goalId: lesson.id,
        countdown: '5',
      },
    } as never);
  }, [mastery, router, studyTarget]);

  const c = useMemo(() => ({
    back: triLang(lang, {
      ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
      vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
    }),
    minutes: triLang(lang, {
      ru: 'минут', uk: 'хвилин', en: 'minutes', es: 'minutos', 'pt-BR': 'minutos',
      vi: 'phút', id: 'menit', tr: 'dakika', pl: 'minut',
    }),
    buyLabel: triLang(lang, {
      ru: 'Купить минуты', uk: 'Купити хвилини', en: 'Buy minutes', es: 'Comprar minutos',
      'pt-BR': 'Comprar minutos', vi: 'Mua phút', id: 'Beli menit',
      tr: 'Dakika satın al', pl: 'Kup minuty',
    }),
    statsLabel: triLang(lang, {
      ru: 'Мой прогресс', uk: 'Мій прогрес', en: 'My progress', es: 'Mi progreso',
      'pt-BR': 'Meu progresso', vi: 'Tiến độ của tôi', id: 'Progres saya',
      tr: 'İlerlemem', pl: 'Mój postęp',
    }),
    continueLabel: triLang(lang, {
      ru: 'ПРОДОЛЖИТЬ', uk: 'ПРОДОВЖИТИ', en: 'CONTINUE', es: 'CONTINUAR',
      'pt-BR': 'CONTINUAR', vi: 'TIẾP TỤC', id: 'LANJUTKAN', tr: 'DEVAM', pl: 'KONTYNUUJ',
    }),
    startLabel: triLang(lang, {
      ru: 'Начать урок', uk: 'Почати урок', en: 'Start lesson', es: 'Empezar la clase',
      'pt-BR': 'Começar a aula', vi: 'Bắt đầu bài học', id: 'Mulai pelajaran',
      tr: 'Dersi başlat', pl: 'Rozpocznij lekcję',
    }),
    passed: triLang(lang, {
      ru: 'Уже пройден', uk: 'Уже пройдений', en: 'Already completed', es: 'Ya completada',
      'pt-BR': 'Já concluída', vi: 'Đã hoàn thành', id: 'Sudah selesai',
      tr: 'Tamamlandı', pl: 'Już ukończona',
    }),
    againLabel: triLang(lang, {
      ru: 'Пройти снова', uk: 'Пройти знову', en: 'Do it again', es: 'Repetir',
      'pt-BR': 'Fazer de novo', vi: 'Học lại', id: 'Ulangi', tr: 'Tekrar yap', pl: 'Powtórz',
    }),
    duration: (m: string) => triLang(lang, {
      ru: `${m} минут`, uk: `${m} хвилин`, en: `${m} minutes`, es: `${m} minutos`,
      'pt-BR': `${m} minutos`, vi: `${m} phút`, id: `${m} menit`,
      tr: `${m} dakika`, pl: `${m} minut`,
    }),
    starsLabel: (n: number) => triLang(lang, {
      ru: `освоено на ${n} из 3`, uk: `освоєно на ${n} з 3`, en: `${n} of 3 mastered`,
      es: `${n} de 3 dominado`, 'pt-BR': `${n} de 3 dominado`, vi: `thành thạo ${n}/3`,
      id: `${n} dari 3 dikuasai`, tr: `3 üzerinden ${n}`, pl: `opanowane ${n} z 3`,
    }),
  }), [lang]);

  return (
    <ScreenGradient>
      <SafeAreaView testID="max-lessons-screen" style={{ flex: 1 }}>
        {/* Шапка: назад, прогресс, покупка. Заголовка нет — владелец убрал. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingHorizontal: 14 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={c.back}
            onPressIn={() => { void hapticTap(); }}
            onPress={() => { safeRouterBack(router, '/(tabs)/home' as any); }}
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: t.bgSurface,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            testID="max-lessons-stats"
            accessibilityRole="button"
            accessibilityLabel={c.statsLabel}
            onPressIn={() => { void hapticTap(); }}
            onPress={() => setStatsVisible(true)}
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: t.bgSurface,
              justifyContent: 'center', alignItems: 'center', marginRight: 10,
            }}
          >
            <Ionicons name="stats-chart" size={19} color={t.textSecond} />
          </TouchableOpacity>

          {/* Покупка — акцентная: единственное действие, возвращающее минуты. */}
          <TouchableOpacity
            testID="max-lessons-buy-minutes"
            accessibilityRole="button"
            accessibilityLabel={c.buyLabel}
            onPressIn={() => { void hapticTap(); }}
            onPress={() => setMinuteSheetVisible(true)}
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: t.accent,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons name="add" size={24} color={t.correctText} />
          </TouchableOpacity>
        </View>

        <FlatList
          testID="max-lessons-list"
          data={rows}
          keyExtractor={(item) => item.key}
          decelerationRate="fast"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={7}
          ListHeaderComponent={(
            <MinutesDial
              minutes={minutesLeft}
              caption={c.minutes}
              done={done}
              total={MAX_LESSON_CATALOG.length}
            />
          )}
          renderItem={({ item }) => (
            item.kind === 'header' ? (
              <Text
                style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800', marginTop: 14, marginBottom: 10, marginLeft: 4 }}
                maxFontSizeMultiplier={2}
              >
                {item.level}
              </Text>
            ) : (
              <LessonCard
                lesson={item.lesson}
                title={titles[item.lesson.id] ?? ''}
                stars={maxLessonStars(mastery, item.lesson.id)}
                recommended={item.lesson.id === recommendedId}
                expanded={openId === item.lesson.id}
                topicTitle={maxLessonTopicTitle(item.lesson.topic, lang)}
                labels={c}
                onToggle={toggleLesson}
                onStart={startLesson}
              />
            )
          )}
        />
      </SafeAreaView>

      <VoiceMinutePackSheet
        visible={minuteSheetVisible}
        onClose={() => setMinuteSheetVisible(false)}
        onCredited={(wallet) => {
          // Optimistic UI: кольцо перерисовывается СРАЗУ после покупки.
          const total = wallet.availableSeconds + wallet.reservedSeconds;
          setWalletSec(total);
          writeVoiceMinutePeek(total);
          setMinuteSheetVisible(false);
          // зачем (владелец 2026-09-01, «не то количество минут, расходится»):
          // превью помнит ПРЕЖНИЙ тип доступа. Пополнили кошелёк — сервер уже
          // считает доступ платным, но экран звонка ещё берёт из кэша «trial,
          // 3 минуты» и показывает не те минуты. Сбрасываем кэш, чтобы
          // следующий заход спросил сервер заново.
          invalidateMaxTutorPreview();
          DebugLogger.info('[MAX-LESSONS]', `минуты пополнены: стало ${total}с, кэш превью сброшен`);
        }}
      />

      <MaxLessonsStatsSheet
        visible={statsVisible}
        onClose={() => setStatsVisible(false)}
        trends={speechStats?.trends ?? null}
        series={speechStats?.series ?? null}
        done={done}
        total={MAX_LESSON_CATALOG.length}
        level={level}
        lang={lang}
      />
    </ScreenGradient>
  );
}

/**
 * Кольцо минут — сердце макета «Циферблат».
 *
 * зачем: остаток должен читаться формой, а не строчкой текста. Дуга
 * заполняется до MINUTES_FULL_SCALE; всё, что больше, показывает полный круг —
 * «минут много» честнее, чем растягивать шкалу до бесконечности.
 *
 * ⚠️ Дуга рисуется СРАЗУ на финальном значении, без анимации заполнения.
 * Это не упущение: владелец уже отверг такую анимацию у кольца глав
 * (app/(tabs)/lessons.tsx, AnimatedChapterCircle) — прогресс «наливался на
 * глазах» при каждом открытии экрана и раздражал. Не возвращать.
 */
function MinutesDial({
  minutes, caption, done, total,
}: { minutes: number | null; caption: string; done: number; total: number }) {
  const { theme: t, f } = useTheme();
  const R = 43;
  const CIRC = 2 * Math.PI * R;
  const ratio = minutes === null ? 0 : Math.min(1, minutes / MINUTES_FULL_SCALE);
  // Оставляем разрыв внизу кольца: полностью замкнутая дуга читается как
  // «загрузка», а не как шкала.
  const arc = CIRC * 0.78;
  const filled = arc * ratio;

  return (
    <View style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 16 }}>
      <View style={{ width: 148, height: 148, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={148} height={148} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={50} cy={50} r={R}
            stroke={t.bgSurface} strokeWidth={7} fill="none"
            strokeDasharray={`${arc} ${CIRC}`} strokeLinecap="round"
          />
          <Circle
            cx={50} cy={50} r={R}
            stroke={t.accent} strokeWidth={7} fill="none"
            strokeDasharray={`${filled} ${CIRC}`} strokeLinecap="round"
          />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text
            testID="max-lessons-minutes"
            style={{ color: t.textPrimary, fontSize: f.numLg + 6, fontWeight: '900', letterSpacing: -1 }}
            maxFontSizeMultiplier={1.4}
          >
            {minutes === null ? '—' : minutes}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', marginTop: 1 }} maxFontSizeMultiplier={1.6}>
            {caption}
          </Text>
        </View>
      </View>
      {/* Прогресс курса подписью под кольцом: тише минут, но на виду. */}
      <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800', marginTop: 10 }} maxFontSizeMultiplier={1.8}>
        {`${done} / ${total}`}
      </Text>
    </View>
  );
}

interface LessonLabels {
  continueLabel: string;
  startLabel: string;
  passed: string;
  againLabel: string;
  duration: (m: string) => string;
  starsLabel: (n: number) => string;
}

/**
 * Карточка урока: свёрнутая — строка с названием и звёздами; раскрытая —
 * крупный блок с темой, длительностью и кнопкой звонка.
 *
 * зачем (владелец 2026-09-01): «при нажатии на блок он сначала увеличивался,
 * тот что был до — уменьшается». Раскрытие ничего не запускает: звонок
 * начинает только кнопка внутри, поэтому случайный тап по списку не тратит
 * минуты — а именно этого владелец опасался, прося старт «сразу».
 */
function LessonCard({
  lesson, title, stars, recommended, expanded, topicTitle, labels, onToggle, onStart,
}: {
  lesson: MaxLessonCatalogItem;
  title: string;
  stars: number;
  recommended: boolean;
  expanded: boolean;
  topicTitle: string;
  labels: LessonLabels;
  onToggle: (id: string) => void;
  onStart: (lesson: MaxLessonCatalogItem) => void;
}) {
  const { theme: t, f } = useTheme();
  // Урок закрыт на трёх звёздах. Он НЕ исчезает и остаётся доступным: MAX
  // помнит, что ученик его проходил, и предлагает повторить.
  const done = stars >= 3;
  // зачем (владелец 2026-09-01, «названия сперва открываются на английском как
  // коды»): технический id (a1_greet) НИКОГДА не показывается человеку. Пока
  // заголовки едут с диска или из сети, строка держит место скелетоном той же
  // высоты — первый кадр совпадает с финальным (Performance Bible), и текст не
  // подменяется на глазах.
  const label = title;

  return (
    <TouchableOpacity
      testID={`max-lesson-${lesson.id}`}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${label}. ${labels.starsLabel(stars)}`}
      activeOpacity={0.85}
      onPressIn={() => { void hapticTap(); }}
      onPress={() => onToggle(lesson.id)}
      style={{
        borderRadius: expanded ? 22 : 18,
        // Три состояния различаются ТОНОМ, без единой рамки (запрет владельца):
        // раскрытая и рекомендованная — акцентный фон, пройденная приглушена.
        backgroundColor: expanded || recommended ? t.accentBg : t.bgSurface,
        opacity: done && !expanded && !recommended ? 0.72 : 1,
        paddingVertical: expanded ? 18 : 15,
        paddingHorizontal: expanded ? 18 : 16,
        marginBottom: 9,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {recommended && !expanded ? (
            <Text
              style={{ color: t.accent, fontSize: f.caption, fontWeight: '900', letterSpacing: 1, marginBottom: 4 }}
              maxFontSizeMultiplier={1.8}
            >
              {labels.continueLabel}
            </Text>
          ) : null}
          {label !== '' ? (
            <Text
              style={{
                color: t.textPrimary,
                fontSize: expanded ? f.bodyLg : f.body,
                fontWeight: '800',
                lineHeight: (expanded ? f.bodyLg : f.body) * 1.3,
              }}
              numberOfLines={3}
              maxFontSizeMultiplier={1.8}
            >
              {label}
            </Text>
          ) : (
            // Скелетон ровно той высоты, что займёт строка названия: список не
            // «прыгает», когда заголовки доезжают (правило стабильности первого
            // кадра). Тон приглушён — это ожидание, а не содержимое.
            <View
              style={{
                height: (expanded ? f.bodyLg : f.body) * 1.3,
                width: '72%',
                borderRadius: 7,
                backgroundColor: t.textMuted,
                opacity: 0.16,
              }}
            />
          )}
        </View>
        {!expanded ? <Stars value={stars} /> : null}
      </View>

      {expanded ? (
        // FadeInDown — тот же приём разворота, что в эталонной «Статистике»:
        // содержимое не появляется рывком, а спускается следом за высотой.
        <Reanimated.View entering={FadeInDown.duration(220)} style={{ marginTop: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Stars value={stars} />
            <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.8}>
              {done ? labels.passed : topicTitle}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.8}>
              {labels.duration(LESSON_MINUTES)}
            </Text>
          </View>

          <TouchableOpacity
            testID={`max-lesson-start-${lesson.id}`}
            accessibilityRole="button"
            accessibilityLabel={done ? labels.againLabel : labels.startLabel}
            onPressIn={() => { void hapticTap(); }}
            onPress={() => onStart(lesson)}
            style={{
              minHeight: 56,
              borderRadius: 20,
              backgroundColor: t.accent,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="call" size={20} color={t.correctText} />
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '900' }} maxFontSizeMultiplier={1.6}>
              {done ? labels.againLabel : labels.startLabel}
            </Text>
          </TouchableOpacity>
        </Reanimated.View>
      ) : null}
    </TouchableOpacity>
  );
}

/** Три ступени освоения. Форма несёт смысл наравне с цветом — заполненная
 *  звезда против контурной читается и при дальтонизме. */
function Stars({ value }: { value: number }) {
  const { theme: t } = useTheme();
  return (
    <View
      style={{ flexDirection: 'row', gap: 3 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[0, 1, 2].map((i) => (
        <Ionicons
          key={i}
          name={i < value ? 'star' : 'star-outline'}
          size={16}
          color={i < value ? t.accent : t.textMuted}
        />
      ))}
    </View>
  );
}
