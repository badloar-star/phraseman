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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  useEffect(() => {
    let active = true;
    if (Object.keys(titles).length > 0) return () => { active = false; };
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
    return out;
  }, [topic]);

  const openLesson = useCallback((lesson: MaxLessonCatalogItem) => {
    DebugLogger.info('[MAX-LESSONS]', `open lesson=${lesson.id} level=${lesson.level} stars=${maxLessonStars(mastery, lesson.id)}`);
    // Урок = звонок с этой целью. Экран подготовки уже умеет формат 'tutor';
    // цель передаём параметром, чтобы сервер вёл именно её, а не «следующую».
    router.push({
      pathname: '/max_call_prestart',
      params: { format: 'tutor', cefr: lesson.level, studyTarget, goalId: lesson.id },
    } as never);
  }, [mastery, router, studyTarget]);

  const c = useMemo(() => ({
    title: triLang(lang, {
      ru: 'Уроки с МАКСом', uk: 'Уроки з МАКСом', en: 'Lessons with MAX', es: 'Clases con MAX',
      'pt-BR': 'Aulas com o MAX', vi: 'Bài học với MAX', id: 'Pelajaran dengan MAX',
      tr: "MAX'la dersler", pl: 'Lekcje z MAXem',
    }),
    // Подпись под цифрой НЕ повторяет её («0 из 78» под «0 / 78» — пустой шум).
    // Она называет, что за число: уроков пройдено.
    lessonsDone: triLang(lang, {
      ru: 'уроков пройдено', uk: 'уроків пройдено', en: 'lessons completed',
      es: 'clases completadas', 'pt-BR': 'aulas concluídas',
      vi: 'bài học đã xong', id: 'pelajaran selesai',
      tr: 'ders tamamlandı', pl: 'lekcji ukończonych',
    }),
    // Подписи статистики: короткие, называют число, а не пересказывают его.
    spokeMinutes: triLang(lang, {
      ru: 'минут речи', uk: 'хвилин мовлення', en: 'minutes spoken', es: 'minutos hablados',
      'pt-BR': 'minutos falados', vi: 'phút đã nói', id: 'menit bicara',
      tr: 'konuşma dakikası', pl: 'minut mówienia',
    }),
    vocabWords: triLang(lang, {
      ru: 'слов в речи', uk: 'слів у мовленні', en: 'words used', es: 'palabras usadas',
      'pt-BR': 'palavras usadas', vi: 'từ đã dùng', id: 'kata dipakai',
      tr: 'kullanılan kelime', pl: 'użytych słów',
    }),
    cleanPhrases: triLang(lang, {
      ru: 'без ошибок', uk: 'без помилок', en: 'clean phrases', es: 'frases correctas',
      'pt-BR': 'frases corretas', vi: 'câu chuẩn', id: 'frasa benar',
      tr: 'hatasız cümle', pl: 'bez błędów',
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
        {/* Шапка: та же геометрия, что на экране подготовки звонка — переход
            между экранами не должен «прыгать». */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={c.back}
            onPressIn={() => { void hapticTap(); }}
            onPress={() => { safeRouterBack(router, '/(tabs)/home' as any); }}
            style={{
              width: 48, height: 48, borderRadius: 24, backgroundColor: t.bgCard,
              justifyContent: 'center', alignItems: 'center', marginRight: 12,
            }}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900', flex: 1 }} maxFontSizeMultiplier={2}>
            {c.title}
          </Text>
        </View>

        <FlatList
          testID="max-lessons-list"
          data={rows}
          keyExtractor={(item) => item.key}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          // Первый экран рисуется сразу, остальное — по мере прокрутки.
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={(
            <View>
              {/* Прогресс курса. Уровень здесь НЕ показываем — решение
                  владельца: уровень объявляется торжественно при повышении, а
                  не висит счётчиком, который давит на новичка каждый заход. */}
              <View style={{ borderRadius: 20, backgroundColor: t.bgSurface, padding: 16, marginBottom: 14 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.numMd + 4, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                  {done}
                  <Text style={{ color: t.textMuted, fontSize: f.numMd, fontWeight: '800' }}>{` / ${MAX_LESSON_CATALOG.length}`}</Text>
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', marginTop: 4 }} maxFontSizeMultiplier={2}>
                  {c.lessonsDone}
                </Text>

                {/* Честная статистика речи за 28 дней. Показываем ТОЛЬКО когда
                    замеры есть: пустые нули на первом заходе выглядели бы как
                    «ты ничего не сделал» — ровно то, чего владелец не хочет
                    видеть на экране. Метрики измеримые, не выдуманные:
                    сколько минут человек реально говорил и сколько разных слов
                    произнёс (правило «показывать прогресс честно»). */}
                {trends && trends.spokeMinutes > 0 ? (
                  <View style={{ flexDirection: 'row', gap: 18, marginTop: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                        {trends.spokeMinutes}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', marginTop: 3 }} maxFontSizeMultiplier={2}>
                        {c.spokeMinutes}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                        {trends.vocabWords}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', marginTop: 3 }} maxFontSizeMultiplier={2}>
                        {c.vocabWords}
                      </Text>
                    </View>
                    {trends.cleanPhrasePct !== null ? (
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900' }} maxFontSizeMultiplier={2}>
                          {`${trends.cleanPhrasePct}%`}
                        </Text>
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', marginTop: 3 }} maxFontSizeMultiplier={2}>
                          {c.cleanPhrases}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
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
        // Рекомендованный урок выделен тоном фона, без рамки и без ярлыка
        // мелким шрифтом под названием (оба — запреты владельца).
        backgroundColor: recommended ? t.accentBg : t.bgSurface,
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
