// ═══════════════════════════════════════════════════════════════════════════
// MaxLessonsStatsSheet — прогресс речи для раздела «Уроки с МАКСом».
//
// зачем (владелец 2026-09-01, показал три макета — «вот так делай»):
//   1) столбики минут речи по отрезкам + рост «↑62%» к прошлому отрезку;
//   2) три кольца — минуты, слова, проценты чистых фраз;
//   3) плотный список: крупное число слева, что это — справа.
// Порядок сверху вниз: динамика → текущее состояние → детали. Каждый блок
// отвечает на свой вопрос, поэтому они не дублируют друг друга.
//
// Планка — раздел «Статистика» (эталон владельца): числа весом 900,
// скругление 18–22, разделение тоном, ни одной обводки. Столбики и кольца —
// те же StatBars/StatScoreRing, что и в эталоне: одинаковая физика анимации
// и скраб-пузырь достаются даром, а раздел ощущается частью приложения.
//
// Показываем ТОЛЬКО измеренное. Ни одной выдуманной метрики: время речи,
// разнообразие слов и доля чистых фраз считаются из настоящих замеров
// (app/max_speech_history.ts). Пока замеров нет — честно говорим об этом,
// а не рисуем нули, которые читаются как «ты ничего не сделал».
//
// Пустые отрезки в ряду НЕ прячем (решение владельца): ряд показывает, что
// накопится — сегодняшний столбик есть, прошлых нет. Это честнее пустого
// места и объясняет человеку, откуда возьмётся история.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';

import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { StatBars, type StatBar } from '../stats/StatBars';
import { StatScoreRing } from '../stats/StatScoreRing';
import { useTheme } from '../ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import type { VoiceTrends, VoiceWeeklySeries } from '../../app/max_voice_metrics';

interface Props {
  visible: boolean;
  onClose: () => void;
  trends: VoiceTrends | null;
  /** Ряд столбиков и рост к прошлому отрезку. null — история не поднята. */
  series: VoiceWeeklySeries | null;
  done: number;
  total: number;
  level: string;
  lang: Lang;
}

/** Потолок шкалы слов для кольца: выше него разница уже не читается. */
const VOCAB_RING_SCALE = 500;
/** Потолок шкалы минут для кольца — примерно месяц активных занятий. */
const MINUTES_RING_SCALE = 120;

export default function MaxLessonsStatsSheet({
  visible, onClose, trends, series, done, total, level, lang,
}: Props) {
  const { theme: t, f } = useTheme();
  const hasSpeech = trends !== null && trends.spokeMinutes > 0;

  const c = {
    close: triLang(lang, {
      ru: 'Закрыть прогресс', en: 'Close progress', uk: 'Закрити прогрес',
      es: 'Cerrar progreso', 'pt-BR': 'Fechar progresso', vi: 'Đóng tiến độ',
      id: 'Tutup progres', tr: 'İlerlemeyi kapat', pl: 'Zamknij postęp',
    }),
    lessons: triLang(lang, {
      ru: 'уроков пройдено', uk: 'уроків пройдено', en: 'lessons completed',
      es: 'clases completadas', 'pt-BR': 'aulas concluídas', vi: 'bài học đã xong',
      id: 'pelajaran selesai', tr: 'ders tamamlandı', pl: 'lekcji ukończonych',
    }),
    levelNow: triLang(lang, {
      ru: 'уровень речи', uk: 'рівень мовлення', en: 'speaking level',
      es: 'nivel oral', 'pt-BR': 'nível de fala', vi: 'trình độ nói',
      id: 'level bicara', tr: 'konuşma seviyesi', pl: 'poziom mówienia',
    }),
    minutesSpoken: triLang(lang, {
      ru: 'минут речи', uk: 'хвилин мовлення', en: 'minutes spoken',
      es: 'minutos hablados', 'pt-BR': 'minutos falados', vi: 'phút đã nói',
      id: 'menit bicara', tr: 'konuşma dakikası', pl: 'minut mowy',
    }),
    now: triLang(lang, {
      ru: 'сейчас', uk: 'зараз', en: 'now', es: 'ahora', 'pt-BR': 'agora',
      vi: 'bây giờ', id: 'sekarang', tr: 'şimdi', pl: 'teraz',
    }),
    min: triLang(lang, {
      ru: 'мин', uk: 'хв', en: 'min', es: 'min', 'pt-BR': 'min',
      vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min',
    }),
    words: triLang(lang, {
      ru: 'слов', uk: 'слів', en: 'words', es: 'palabras', 'pt-BR': 'palavras',
      vi: 'từ', id: 'kata', tr: 'kelime', pl: 'słów',
    }),
    vocab: triLang(lang, {
      ru: 'разных слов сказано', uk: 'різних слів сказано', en: 'different words used',
      es: 'palabras distintas usadas', 'pt-BR': 'palavras diferentes usadas',
      vi: 'từ khác nhau đã dùng', id: 'kata berbeda dipakai',
      tr: 'farklı kelime kullanıldı', pl: 'różnych słów użytych',
    }),
    clean: triLang(lang, {
      ru: 'фраз без ошибок', uk: 'фраз без помилок', en: 'phrases without mistakes',
      es: 'frases sin errores', 'pt-BR': 'frases sem erros', vi: 'câu không lỗi',
      id: 'frasa tanpa kesalahan', tr: 'hatasız cümle', pl: 'fraz bez błędów',
    }),
    empty: triLang(lang, {
      ru: 'Пройди первый урок — здесь появится, сколько ты говорил и какими словами.',
      uk: 'Пройди перший урок — тут з’явиться, скільки ти говорив і якими словами.',
      en: 'Take your first lesson — this will show how much you spoke and which words you used.',
      es: 'Haz tu primera clase: aquí verás cuánto hablaste y con qué palabras.',
      'pt-BR': 'Faça sua primeira aula: aqui verá quanto falou e com quais palavras.',
      vi: 'Hãy học bài đầu tiên — ở đây sẽ hiện bạn đã nói bao nhiêu và bằng những từ nào.',
      id: 'Ikuti pelajaran pertama — di sini akan muncul berapa lama kamu bicara dan kata apa saja.',
      tr: 'İlk dersini yap — burada ne kadar konuştuğun ve hangi kelimeleri kullandığın görünecek.',
      pl: 'Zrób pierwszą lekcję — pojawi się tu, ile mówiłeś i jakimi słowami.',
    }),
  };

  // Столбики нормализуются к своему максимуму: важна форма ряда, а не
  // абсолютная высота. Пустые отрезки остаются «пеньками» — видно, что было
  // тихо, и видно, куда расти.
  const bars = useMemo<StatBar[]>(() => {
    if (!series) return [];
    const peak = Math.max(1, ...series.bars);
    const lastIndex = series.bars.length - 1;
    return series.bars.map((minutes, i) => ({
      key: `bar-${i}`,
      ratio: minutes / peak,
      active: minutes > 0,
      highlight: i === lastIndex,
      bottomLabel: i === lastIndex ? c.now : '',
      scrubLabel: `${minutes} ${c.min}`,
    }));
  }, [series, c.now, c.min]);

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={c.close}
      testID="max-lessons-stats-sheet"
      glowColor={t.accent}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 26, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {hasSpeech ? (
          <>
            {/* ① Динамика: крупное число, рост к прошлому отрезку, ряд столбиков. */}
            <Reanimated.View
              entering={FadeInDown.duration(320)}
              style={{ borderRadius: 22, backgroundColor: t.bgSurface, padding: 18, gap: 16 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '900' }}
                    maxFontSizeMultiplier={1.5}
                    numberOfLines={1}
                  >
                    {trends.spokeMinutes}
                  </Text>
                  <Text
                    style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', marginTop: 2 }}
                    maxFontSizeMultiplier={1.6}
                  >
                    {c.minutesSpoken}
                  </Text>
                </View>
                {series?.changePct !== null && series !== null ? (
                  <ChangeBadge pct={series.changePct as number} />
                ) : null}
              </View>

              {bars.length > 0 ? (
                <StatBars
                  bars={bars}
                  accent={t.accent}
                  inactiveColor={t.bgSurface2}
                  height={112}
                  topLabelColor={t.textPrimary}
                  topLabelMutedColor={t.textMuted}
                  bottomLabelColor={t.textSecond}
                  bottomLabelMutedColor={t.textMuted}
                  delayMs={140}
                  scrubEnabled
                  scrubHighlightColor={t.accent}
                  scrubBubbleBg={t.bgSurface2}
                  scrubValueColor={t.textPrimary}
                  scrubCaptionColor={t.textMuted}
                />
              ) : null}
            </Reanimated.View>

            {/* ② Текущее состояние тремя кольцами — читается одним взглядом. */}
            <Reanimated.View
              entering={FadeInDown.delay(90).duration(320)}
              style={{ flexDirection: 'row', gap: 10 }}
            >
              <RingCard
                progress={Math.min(100, (trends.spokeMinutes / MINUTES_RING_SCALE) * 100)}
                value={trends.spokeMinutes}
                caption={c.min}
                accent={t.accent}
                delayMs={200}
              />
              <RingCard
                progress={Math.min(100, (trends.vocabWords / VOCAB_RING_SCALE) * 100)}
                value={trends.vocabWords}
                caption={c.words}
                accent={t.accent}
                delayMs={280}
              />
              {trends.cleanPhrasePct !== null ? (
                <RingCard
                  progress={trends.cleanPhrasePct}
                  value={trends.cleanPhrasePct}
                  caption="%"
                  accent={t.accent}
                  delayMs={360}
                />
              ) : null}
            </Reanimated.View>

            {/* ③ Детали списком: число ведёт, подпись поясняет тоном потише. */}
            <View style={{ gap: 8 }}>
              <StatRow value={String(trends.vocabWords)} label={c.vocab} delayMs={180} />
              {trends.cleanPhrasePct !== null ? (
                <StatRow value={`${trends.cleanPhrasePct}%`} label={c.clean} delayMs={230} />
              ) : null}
              <StatRow value={`${done} / ${total}`} label={c.lessons} delayMs={280} />
              <StatRow value={level} label={c.levelNow} delayMs={330} />
            </View>
          </>
        ) : (
          // Пустое состояние объясняет, что будет здесь, — а не показывает нули.
          <View style={{ gap: 12 }}>
            <View style={{ borderRadius: 22, backgroundColor: t.bgSurface, padding: 18 }}>
              <Text
                style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', lineHeight: f.body * 1.45 }}
                maxFontSizeMultiplier={1.8}
              >
                {c.empty}
              </Text>
            </View>
            {/* Уроки и уровень известны и без единого звонка — показываем их. */}
            <StatRow value={`${done} / ${total}`} label={c.lessons} delayMs={80} />
            <StatRow value={level} label={c.levelNow} delayMs={130} />
          </View>
        )}
      </ScrollView>
    </HybridSheetShell>
  );
}

/**
 * Значок роста «↑62%».
 *
 * Спад показываем честно, но не красным: тревожный цвет за неделю без занятий
 * демотивирует сильнее, чем помогает, — приглушаем тоном, а не пугаем.
 */
function ChangeBadge({ pct }: { pct: number }) {
  const { theme: t, f } = useTheme();
  const grew = pct >= 0;
  return (
    <View
      accessible
      accessibilityLabel={`${grew ? '+' : ''}${pct}%`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
    >
      <Text
        style={{ color: grew ? t.accent : t.textMuted, fontSize: f.body, fontWeight: '900' }}
        maxFontSizeMultiplier={1.4}
      >
        {grew ? '↑' : '↓'}
      </Text>
      <Text
        style={{ color: grew ? t.accent : t.textMuted, fontSize: f.bodyLg, fontWeight: '900' }}
        maxFontSizeMultiplier={1.4}
        numberOfLines={1}
      >
        {`${Math.abs(pct)}%`}
      </Text>
    </View>
  );
}

/** Кольцо-метрика: доля заполнения показывает состояние без чтения цифры. */
function RingCard({
  progress, value, caption, accent, delayMs,
}: {
  progress: number;
  value: number;
  caption: string;
  accent: string;
  delayMs: number;
}) {
  const { theme: t, f } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${caption}`}
      style={{
        flex: 1,
        borderRadius: 20,
        backgroundColor: t.bgSurface,
        paddingVertical: 16,
        alignItems: 'center',
      }}
    >
      <StatScoreRing
        progress={progress}
        centerValue={value}
        accent={accent}
        trackColor={t.bgSurface2}
        size={86}
        strokeWidth={8}
        centerColor={t.textPrimary}
        subColor={t.textMuted}
        delayMs={delayMs}
        centerTextStyle={{ fontSize: f.numMd, fontWeight: '900' }}
      />
      <Text
        style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '800', marginTop: 8 }}
        maxFontSizeMultiplier={1.6}
        numberOfLines={1}
      >
        {caption}
      </Text>
    </View>
  );
}

/** Строка «число — что это». Число ведёт, подпись поясняет тоном потише. */
function StatRow({ value, label, delayMs }: { value: string; label: string; delayMs: number }) {
  const { theme: t, f } = useTheme();
  return (
    <Reanimated.View
      entering={FadeInDown.delay(delayMs).duration(300)}
      accessible
      accessibilityLabel={`${value} — ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 18,
        backgroundColor: t.bgSurface,
        paddingVertical: 16,
        paddingHorizontal: 18,
      }}
    >
      <Text
        style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900', minWidth: 78 }}
        maxFontSizeMultiplier={1.5}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', flex: 1 }}
        maxFontSizeMultiplier={1.7}
      >
        {label}
      </Text>
    </Reanimated.View>
  );
}
