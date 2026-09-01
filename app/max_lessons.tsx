// ═══════════════════════════════════════════════════════════════════════════
// max_lessons.tsx — раздел «Уроки с МАКСом».
//
// зачем (владелец 2026-08-31): «ни 1 юзер не видит ничего кроме кнопки начать
// и купить минуты — какой смысл покупать минуты если не понятно зачем». Сервер
// давно ведёт ученика по 78 речевым целям, но клиент показывал только текущую.
// Здесь весь курс виден целиком: что уже закрыто, что дальше, чему научит
// каждый урок.
//
// Решения владельца 2026-08-31, зашитые в этот экран:
//   • все уроки открыты сразу, порядок — только рекомендация (не блокировка);
//   • три ступени освоения видны звёздами, урок закрыт на трёх;
//   • слова «не сдал» на экране нет вообще — только достигнутый прогресс;
//   • уровень показываем торжественно при повышении, а не счётчиком в шапке;
//   • фильтр по темам: общение, каждый день, поездка, работа, основы.
//
// Первый кадр обязан совпадать с финальным (Performance Bible): звёзды берутся
// из peek-кэша превью синхронно, до всякой сети. Сеть только уточняет.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import { DebugLogger } from './debug-logger';
import {
  MAX_LESSON_CATALOG,
  MAX_LESSON_LEVELS,
  MAX_LESSON_TOPICS,
  maxLessonStars,
  maxLessonTopicTitle,
  maxLessonsDone,
  recommendedMaxLessonId,
  type MaxLessonCatalogItem,
  type MaxLessonTopic,
} from './max_lesson_catalog';
import { maxTutorPreviewKey, peekMaxTutorPreview } from './max_tutor_preview';
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
import { computeVoiceTrends, type VoiceTrends } from './max_voice_metrics';
import { useStudyTarget } from '../components/StudyTargetContext';

/** Названия уроков приходят с сервера; до первого ответа показываем id-независимую заглушку. */
type LessonTitles = Record<string, string>;

export default function MaxLessonsScreen() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const { studyTarget } = useStudyTarget();

  // Синхронный первый кадр: звёзды из уже прогретого превью, без спиннера и
  // без сетевого ожидания. Пусто — рисуем нули, экран всё равно полноценный.
  //
  // ⚠️ Ключ обязан совпасть с тем, которым Главная греет превью на фокусе
  // (app/(tabs)/home.tsx: maxTutorCallParams), иначе кэш не найдётся и раздел
  // откроется с нулями там, где данные уже есть. Отличие хотя бы в одном поле
  // ключа — молчаливая потеря прогресса на глазах у человека.
  const previewKey = maxTutorPreviewKey({
    format: 'tutor',
    cefr: guessLearnerCefr(),
    interfaceLang: lang,
    studyTarget,
  });
  const cachedPreview = peekMaxTutorPreview(previewKey, Date.now(), true);
  const mastery = cachedPreview?.catalogMastery ?? {};
  const level = cachedPreview?.catalogProgress.level ?? cachedPreview?.goalLevel ?? 'A1';

  const [topic, setTopic] = useState<MaxLessonTopic | null>(null);
  const [minuteSheetVisible, setMinuteSheetVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

  /**
   * Остаток минут для шапки.
   *
   * зачем (владелец 2026-09-01, «индикатор сколько минут всего осталось»):
   * первый кадр берётся из peek-кэша СИНХРОННО — цифра не должна прыгать с
   * нуля на реальную через секунду (правило стабильности первого кадра).
   * Сеть только уточняет.
   */
  const [walletSec, setWalletSec] = useState<number | null>(() => peekVoiceMinutes()?.seconds ?? null);
  // guard-ok: клиент НИЧЕГО не списывает и не понижает. Здесь только показ:
  // читаем серверный остаток и переводим секунды в минуты для глаза. Источник
  // истины по минутам — серверный кошелёк, списывает их минт при звонке.
  const minutesLeft = walletSec === null ? '—' : String(Math.max(0, Math.floor(walletSec / 60)));

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
        // Немой catch запрещён: без минут раздел всё равно открывается, но
        // причина «почему прочерк вместо числа» обязана быть видна.
        DebugLogger.warn('[MAX-LESSONS]', `кошелёк не прочитан: ${e instanceof Error ? e.message : String(e)}`);
      });
    return () => { active = false; };
  }, []);
  // Тренды речи за 28 дней. Первый кадр — из памяти процесса (без await), диск
  // догоняет: цифры не должны появляться рывком после отрисовки.
  const [trends, setTrends] = useState<VoiceTrends | null>(() => {
    const cached = peekSpeechHistory();
    return cached ? computeVoiceTrends(cached, Date.now()) : null;
  });

  useEffect(() => {
    let active = true;
    void loadSpeechHistory().then((samples) => {
      if (!active) return;
      const computed = computeVoiceTrends(samples, Date.now());
      setTrends(computed);
      DebugLogger.info(
        '[MAX-SPEECH]',
        `тренды за 28 дней: минут=${computed.spokeMinutes} слов=${computed.vocabWords} чистых=${computed.cleanPhrasePct ?? 'мало данных'}`,
      );
    });
    return () => { active = false; };
  }, []);
  // Тик перерисовки после фоновой догрузки: сам ответ лежит в кэше превью,
  // держать его копию в состоянии незачем — это был бы второй источник правды.
  const [, setRefreshTick] = useState(0);

  // Заголовки уроков: память → диск → сеть. Экран уже отрисован (в худшем
  // случае с id вместо названий), поэтому ждать нечего и спиннера нет.
  // Защита от повторных запросов: эффект перезапускается при смене языка
  // курса, и без этого замка раздел стучался в сеть трижды за один заход
  // (видно в логах эмулятора). Один запрос на язык — больше не нужно.
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
      // зачем (проверка на эмуляторе 2026-08-31): согласие на обработку ГОЛОСА
      // здесь не требуется — заголовки уроков это витрина, а не запись речи.
      // Прежний гейт давал ровно тот баг, который видно на скриншоте: человек
      // до первого звонка читал технические id (a1_daily_routine) вместо
      // «Мой день», хотя названия давно готовы на сервере.
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
    // titles намеренно НЕ в зависимостях: эффект должен отработать один раз на
    // язык, иначе setTitles внутри него запускал бы сам себя по кругу.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, studyTarget]);

  // Догрузка звёзд, когда Главная не успела прогреть превью (заход по диплинку,
  // холодный старт). Экран УЖЕ отрисован из кэша или нулями — спиннера нет,
  // ждать нечего: цифры уточняются на месте. Один read-only вызов, минуты не
  // резервирует (preflight не создаёт ни токена, ни резерва).
  useEffect(() => {
    let active = true;
    if (peekMaxTutorPreview(previewKey, Date.now(), true)) {
      DebugLogger.info('[MAX-LESSONS]', `stars from cache key=${previewKey}`);
      return () => { active = false; };
    }
    if (!isAiVoiceConsentGranted()) {
      // Ранний выход обязан объяснять себя: без согласия на обработку голоса
      // сетевого запроса быть не должно, и это не ошибка, а нормальный путь.
      DebugLogger.info('[MAX-LESSONS]', 'stars skipped: voice consent not granted yet');
      return () => { active = false; };
    }
    DebugLogger.info('[MAX-LESSONS]', `stars fetch start key=${previewKey}`);
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
        DebugLogger.warn('[MAX-LESSONS]', 'stars fetch: server returned no preview, keeping current numbers');
        return;
      }
      DebugLogger.info('[MAX-LESSONS]', `stars fetch ok: done=${preview.catalogProgress.done} level=${preview.catalogProgress.level}`);
      setRefreshTick((n) => n + 1);
    }).catch((e) => {
      // Раздел остаётся рабочим и без сети: показываем то, что уже знаем.
      DebugLogger.warn('[MAX-LESSONS]', `stars fetch failed: ${e instanceof Error ? e.message : String(e)}`);
    });
    return () => { active = false; };
  }, [lang, previewKey, studyTarget]);

  const done = useMemo(() => maxLessonsDone(mastery), [mastery]);
  const recommendedId = useMemo(() => recommendedMaxLessonId(mastery, level), [mastery, level]);

  /**
   * Прогрев рекомендованного урока.
   *
   * зачем (владелец 2026-09-01): «уроки должны быть прогреты и готовы ещё до
   * того, как раздел откроется» — тогда тап сразу превращается в разговор, без
   * паузы на подготовку связи.
   *
   * Греем РОВНО ОДИН урок — тот, что подсвечен (решение владельца). Заготовка
   * держит серверный резерв минут: греть весь видимый экран значило бы
   * занимать несколько резервов разом, и сервер отказал бы по
   * voice_session_active. Остальные уроки готовятся в момент тапа — экран
   * звонка умеет это сам.
   */
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
    void import('./max_call_premint').then(({ beginPremint, premintKey }) =>
      import('./max_call_mint_request').then(({ initialMintRequest, performMaxVoiceMint, releaseUnusedMint }) => {
        if (!isAiVoiceConsentGranted()) return;
        beginPremint(
          premintKey(callParams),
          () => performMaxVoiceMint(callParams, initialMintRequest(callParams)),
          Date.now(),
          releaseUnusedMint,
        );
      }),
    ).catch((e) => {
      // Прогрев — оптимизация, не критичный путь: не вышло, значит связь
      // подготовится при тапе. Но причина обязана быть видна.
      DebugLogger.warn('[MAX-LESSONS]', `прогрев не удался: ${e instanceof Error ? e.message : String(e)}`);
    });
  }, [lang, recommendedId, studyTarget]);

  // Названия уроков локализованы на сервере (CAN_DO_GOALS.title). Дублировать
  // 78×9 строк в бандле нельзя (~40 КБ, бандл-диета), поэтому сервер шлёт
  // только язык интерфейса и клиент кэширует их на диск: список меняется лишь
  // с релизом, значит один запрос на язык — и дальше мгновенно.
  const [titles, setTitles] = useState<LessonTitles>(() => peekMaxCatalogTitles(lang) ?? {});

  /**
   * Плоский список «заголовок уровня + строки уроков» для FlatList.
   *
   * зачем: 78 строк в ScrollView рендерились бы все сразу и роняли первый кадр
   * (PERF-GUARD, Performance Bible). FlatList рисует только видимое. Секции
   * склеены в один плоский массив, потому что SectionList здесь ничего не даёт:
   * заголовки не липкие, а данных мало.
   */
  const rows = useMemo(() => {
    const visible = topic ? MAX_LESSON_CATALOG.filter((l) => l.topic === topic) : MAX_LESSON_CATALOG;
    const out: Array<
      | { kind: 'header'; key: string; level: string }
      | { kind: 'lesson'; key: string; lesson: MaxLessonCatalogItem }
    > = [];
    for (const lvl of MAX_LESSON_LEVELS) {
      const inLevel = visible.filter((l) => l.level === lvl);
      // Фильтр по теме может опустошить уровень — тогда заголовка тоже нет.
      if (inLevel.length === 0) continue;
      out.push({ kind: 'header', key: `h_${lvl}`, level: lvl });
      for (const lesson of inLevel) out.push({ kind: 'lesson', key: lesson.id, lesson });
    }
    // зачем (владелец 2026-09-01, «нет ни 1 урока списка»): пустой список при
    // живой шапке неотличим от «каталог не загрузился». Лог показывает РАЗМЕР
    // источника и результата — сразу видно, каталог пуст или отвалилась
    // отрисовка. Остаётся навсегда: без него симптом молчит.
    DebugLogger.info(
      '[MAX-LESSONS]',
      `список: каталог=${MAX_LESSON_CATALOG.length} фильтр=${topic ?? 'все'} видимых=${visible.length} строк=${out.length}`,
    );
    return out;
  }, [topic]);

  // Защита от двойного тапа: урок теперь открывает ЗВОНОК, и второй тап по
  // соседней строке за те же полсекунды создал бы второй экран разговора с
  // собственным резервом минут. Замок снимается при уходе с экрана.
  const openingRef = useRef(false);
  const openLesson = useCallback((lesson: MaxLessonCatalogItem) => {
    if (openingRef.current) {
      DebugLogger.info('[MAX-LESSONS]', `повторный тап проигнорирован: уже открываем урок`);
      return;
    }
    openingRef.current = true;
    // Экран остаётся в стеке; вернулся назад — можно открывать снова.
    setTimeout(() => { openingRef.current = false; }, 1200);
    DebugLogger.info('[MAX-LESSONS]', `open lesson=${lesson.id} level=${lesson.level} stars=${maxLessonStars(mastery, lesson.id)}`);
    // Урок = звонок с этой целью. Экран подготовки уже умеет формат 'tutor';
    // цель передаём параметром, чтобы сервер вёл именно её, а не «следующую».
    // зачем (владелец 2026-09-01): «при открытии любого урока должен начинаться
    // звонок сразу», без промежуточного экрана с минутами. Ведём прямо в
    // разговор: экран звонка сам готовит связь, если заготовка не подоспела.
    //
    // Деньги при этом в безопасности, и это не допущение: сервер считает
    // секунды от АКТИВАЦИИ (voiceSessionClockStartMs — activatedAtMs, то есть
    // от первой реплики), а не от соединения. Пока идёт отсчёт и человек может
    // отменить — минуты не тратятся.
    router.push({
      pathname: '/max_call_session',
      params: {
        format: 'tutor',
        cefr: lesson.level,
        studyTarget,
        goalId: lesson.id,
        // Отсчёт перед началом урока: 5 секунд на передумать (решение владельца).
        countdown: '5',
      },
    } as never);
  }, [mastery, router, studyTarget]);

  const c = useMemo(() => ({
    // Подпись под цифрой НЕ повторяет её («0 из 78» под «0 / 78» — пустой шум).
    // Она называет, что за число: уроков пройдено.
    lessonsDone: triLang(lang, {
      ru: 'уроков пройдено', uk: 'уроків пройдено', en: 'lessons completed',
      es: 'clases completadas', 'pt-BR': 'aulas concluídas',
      vi: 'bài học đã xong', id: 'pelajaran selesai',
      tr: 'ders tamamlandı', pl: 'lekcji ukończonych',
    }),
    minutesLeft: triLang(lang, {
      ru: 'мин', uk: 'хв', en: 'min', es: 'min', 'pt-BR': 'min',
      vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min',
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
    recommended: triLang(lang, {
      ru: 'Продолжить', uk: 'Продовжити', en: 'Continue', es: 'Continuar',
      'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj',
    }),
    all: triLang(lang, {
      ru: 'Все', uk: 'Усі', en: 'All', es: 'Todas', 'pt-BR': 'Todas',
      vi: 'Tất cả', id: 'Semua', tr: 'Tümü', pl: 'Wszystkie',
    }),
    back: triLang(lang, {
      ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
      vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
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
        {/* зачем (владелец 2026-09-01): заголовок «Уроки с МАКСом» убран — он
            занимал самое ценное место и не нёс информации: человек и так знает,
            куда вошёл. Вместо него ГЛАВНОЕ ЧИСЛО экрана: сколько минут осталось
            говорить. Рядом два действия, которые владелец просил вынести
            наверх, — купить минуты и посмотреть прогресс. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 14, paddingHorizontal: 14, gap: 10 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={c.back}
            onPressIn={() => { void hapticTap(); }}
            onPress={() => { safeRouterBack(router, '/(tabs)/home' as any); }}
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: t.bgCard,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
          </TouchableOpacity>

          {/* Остаток минут. Цифра крупная и живая, слово «минут» — тише:
              иерархия внутри одной строки, без подписи снизу (запрет владельца). */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text
              style={{ color: t.textPrimary, fontSize: f.numMd + 6, fontWeight: '900' }}
              maxFontSizeMultiplier={1.6}
              numberOfLines={1}
            >
              {minutesLeft}
            </Text>
            <Text
              style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800' }}
              maxFontSizeMultiplier={1.6}
              numberOfLines={1}
            >
              {c.minutesLeft}
            </Text>
          </View>

          <TouchableOpacity
            testID="max-lessons-stats"
            accessibilityRole="button"
            accessibilityLabel={c.statsLabel}
            onPressIn={() => { void hapticTap(); }}
            onPress={() => setStatsVisible(true)}
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: t.bgCard,
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons name="stats-chart" size={19} color={t.textPrimary} />
          </TouchableOpacity>

          {/* Покупка минут — акцентная: это единственное действие на экране,
              которое возвращает возможность говорить, когда минуты кончились. */}
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
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          // Первый экран рисуется сразу, остальное — по мере прокрутки.
          // зачем (владелец 2026-09-01, «нет ни 1 урока списка»): без flex:1
          // FlatList внутри SafeAreaView схлопывается в нулевую высоту — шапка
          // видна, а список нет. На эмуляторе прошло случайно, на телефоне —
          // пустой экран.
          style={{ flex: 1 }}
          // removeClippedSubviews УБРАН намеренно: на Android он давно известен
          // тем, что выбрасывает строки из дерева и оставляет пустоту. Выигрыш
          // на 78 коротких строках мизерный, риск пустого раздела — нет.
          initialNumToRender={12}
          windowSize={7}
          ListHeaderComponent={(
            <View>
              {/* Прогресс курса. Уровень здесь НЕ показываем — решение
                  владельца: уровень объявляется торжественно при повышении, а
                  не висит счётчиком, который давит на новичка каждый заход. */}
              {/* зачем (владелец 2026-09-01): крупная карточка прогресса
                  съедала верх экрана ради двух цифр. Прогресс остался, но
                  превратился в тонкую полосу: сколько закрыто — видно, а место
                  отдано урокам. Подробные цифры речи живут в листе статистики
                  (кнопка в шапке), где их и ищут осознанно. */}
              <View style={{ marginBottom: 16, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800' }} maxFontSizeMultiplier={2}>
                    {c.lessonsDone}
                  </Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                    {`${done} / ${MAX_LESSON_CATALOG.length}`}
                  </Text>
                </View>
                {/* Полоса заполняется тоном акцента — без обводки (запрет владельца). */}
                <View style={{ height: 6, borderRadius: 3, backgroundColor: t.bgSurface, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${Math.min(100, Math.round((done / MAX_LESSON_CATALOG.length) * 100))}%`,
                      height: '100%',
                      borderRadius: 3,
                      backgroundColor: t.accent,
                    }}
                  />
                </View>
              </View>

              {/* Фильтр по темам: горизонтальный ряд, пять тем плюс «Все».
                  guard-ok: шесть чипов — FlatList здесь дороже пользы
                  (виртуализация ради шести элементов только добавляет работы). */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                // paddingRight: последний чип не должен липнуть к краю экрана —
                // без него он выглядит обрезанным (видно на скриншоте проверки).
                contentContainerStyle={{ gap: 8, paddingBottom: 14, paddingRight: 14 }}
              >
                <TopicChip
                  label={c.all}
                  active={topic === null}
                  onPress={() => setTopic(null)}
                />
                {MAX_LESSON_TOPICS.map((item) => (
                  <TopicChip
                    key={item}
                    label={maxLessonTopicTitle(item, lang)}
                    active={topic === item}
                    onPress={() => setTopic(topic === item ? null : item)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
          renderItem={({ item }) => (
            item.kind === 'header' ? (
              <Text
                style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800', marginTop: 10, marginBottom: 8, marginLeft: 4 }}
                maxFontSizeMultiplier={2}
              >
                {item.level}
              </Text>
            ) : (
              <View style={{ marginBottom: 8 }}>
                <LessonRow
                  lesson={item.lesson}
                  title={titles[item.lesson.id] ?? ''}
                  stars={maxLessonStars(mastery, item.lesson.id)}
                  recommended={item.lesson.id === recommendedId}
                  recommendedLabel={c.recommended}
                  starsLabel={c.starsLabel}
                  onPress={openLesson}
                />
              </View>
            )
          )}
        />
      </SafeAreaView>

      {/* Покупка минут прямо из раздела: человек видит остаток в шапке и может
          пополнить, не уходя к уроку и не упираясь в отказ посреди звонка. */}
      <VoiceMinutePackSheet
        visible={minuteSheetVisible}
        onClose={() => setMinuteSheetVisible(false)}
        onCredited={(wallet) => {
          // Optimistic UI: число в шапке меняется СРАЗУ после покупки, не
          // дожидаясь следующего чтения кошелька.
          const total = wallet.availableSeconds + wallet.reservedSeconds;
          setWalletSec(total);
          writeVoiceMinutePeek(total);
          setMinuteSheetVisible(false);
          DebugLogger.info('[MAX-LESSONS]', `минуты пополнены: стало ${total}с`);
        }}
      />

      <MaxLessonsStatsSheet
        visible={statsVisible}
        onClose={() => setStatsVisible(false)}
        trends={trends}
        done={done}
        total={MAX_LESSON_CATALOG.length}
        level={level}
        lang={lang}
      />
    </ScreenGradient>
  );
}

function TopicChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme: t, f } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      // Фильтр переключается локально и мгновенно — сети здесь нет вовсе.
      onPressIn={() => { void hapticTap(); }}
      onPress={onPress}
      style={{
        minHeight: 40,
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderRadius: 20,
        // Активный чип отделяется тоном, а не обводкой (запрет владельца).
        backgroundColor: active ? t.accent : t.bgSurface,
      }}
    >
      <Text
        style={{ color: active ? t.correctText : t.textPrimary, fontSize: f.sub, fontWeight: '800' }}
        maxFontSizeMultiplier={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function LessonRow({
  lesson, title, stars, recommended, recommendedLabel, starsLabel, onPress,
}: {
  lesson: MaxLessonCatalogItem;
  title: string;
  stars: number;
  recommended: boolean;
  recommendedLabel: string;
  starsLabel: (n: number) => string;
  onPress: (lesson: MaxLessonCatalogItem) => void;
}) {
  const { theme: t, f } = useTheme();
  // Урок закрыт на трёх звёздах (решение владельца). Он НЕ исчезает и остаётся
  // доступным: «войдя в урок MAX должен помнить, что юзер его уже прошёл».
  const done = stars >= 3;
  return (
    <TouchableOpacity
      testID={`max-lesson-${lesson.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${title || lesson.id}. ${starsLabel(stars)}`}
      // Хаптик на onPressIn: правило проекта (hooks/use-haptics) — в onPress
      // отклик ощущается с запозданием, палец уже ждёт подтверждения.
      onPressIn={() => { void hapticTap(); }}
      onPress={() => onPress(lesson)}
      style={{
        minHeight: 60,
        borderRadius: 16,
        // Три состояния, все различаются ТОНОМ, без единой рамки (запрет
        // владельца): рекомендованный — акцентный фон; пройденный — приглушён,
        // он уже сделан и не должен спорить за внимание; обычный — ровный.
        backgroundColor: recommended ? t.accentBg : t.bgSurface,
        opacity: done && !recommended ? 0.72 : 1,
        paddingVertical: 13,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}
          numberOfLines={2}
          maxFontSizeMultiplier={2}
        >
          {title || lesson.id}
        </Text>
        {recommended ? (
          <Text
            style={{ color: t.accent, fontSize: f.caption, fontWeight: '900', marginTop: 3 }}
            maxFontSizeMultiplier={2}
          >
            {recommendedLabel}
          </Text>
        ) : null}
      </View>
      <Stars value={stars} />
    </TouchableOpacity>
  );
}

/** Три ступени освоения. Форма несёт смысл наравне с цветом — заполненная
 *  звезда против контурной читается и при дальтонизме. */
function Stars({ value }: { value: number }) {
  const { theme: t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((i) => (
        <Ionicons
          key={i}
          name={i < value ? 'star' : 'star-outline'}
          size={15}
          color={i < value ? t.accent : t.textMuted}
        />
      ))}
    </View>
  );
}
