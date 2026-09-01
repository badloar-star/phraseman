// ═══════════════════════════════════════════════════════════════════════════
// MaxLessonsStatsSheet — прогресс речи для раздела «Уроки с МАКСом».
//
// зачем (владелец 2026-09-01, выбор из макетов): вариант 01 «живая линия» +
// подача C «градиентное поле». Дословно: «контейнеры дурацкие, раздел
// некрасивый и не анимирован» — про прежние плашки, три кольца-дубликата и
// столбики в карточке фиксированной высоты, которая на нулях зияла ямой.
//
// Что теперь:
//   1) шапка — крупное число минут докручивается, справа рост «↑ 62%»;
//   2) линия рисуется штрихом, заливка проявляется, точка «сейчас» выпрыгивает;
//   3) цифры — не в коробках, а на одном мягком поле-переливе, гаснущем книзу;
//      строки разделены светом (1px тона), число слева, подпись прижата вправо.
// Колец нет: они дублировали цифры из списка.
//
// Планка — раздел «Статистика» (эталон владельца): числа весом 900, ничего
// мельче f.caption, разделение тоном, ни одной обводки контейнера.
//
// Показываем ТОЛЬКО измеренное (app/max_speech_history.ts). На нулях — те же
// блоки: пунктир вместо линии, нули в строках. Отдельного вида у новичка нет.
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';

import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { LinearGradient } from '../SafeLinearGradient';
import { StatCountUpText } from '../stats/StatCountUpText';
import MaxSpeechSparkline from './MaxSpeechSparkline';
import { useTheme } from '../ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import { withAlpha } from '../../app/flashcards/pill_tabbar_chrome';
import { WEEKLY_BARS, type VoiceTrends, type VoiceWeeklySeries } from '../../app/max_voice_metrics';

interface Props {
  visible: boolean;
  onClose: () => void;
  trends: VoiceTrends | null;
  /** Ряд по отрезкам и рост к прошлому отрезку. null — история не поднята. */
  series: VoiceWeeklySeries | null;
  done: number;
  total: number;
  level: string;
  lang: Lang;
}

/**
 * Горизонтальный отступ контента от края окна: paddingHorizontal оболочки
 * листа (20) + отступ скролла (18). Нужен линии, чтобы ширина совпала с окном
 * на первом кадре без onLayout.
 */
const SHEET_SHELL_INSET = 20;
const CONTENT_INSET = 18;

export default function MaxLessonsStatsSheet({
  visible, onClose, trends, series, done, total, level, lang,
}: Props) {
  const { theme: t, f } = useTheme();

  const spokeMinutes = trends?.spokeMinutes ?? 0;
  const vocabWords = trends?.vocabWords ?? 0;
  const cleanPhrasePct = trends?.cleanPhrasePct ?? 0;
  const changePct = series?.changePct ?? null;
  // История ещё не поднята — пустой ряд той же длины, чтобы высота не прыгала.
  const values = series?.bars ?? new Array<number>(WEEKLY_BARS).fill(0);

  const c = {
    close: triLang(lang, {
      ru: 'Закрыть прогресс', en: 'Close progress', uk: 'Закрити прогрес',
      es: 'Cerrar progreso', 'pt-BR': 'Fechar progresso', vi: 'Đóng tiến độ',
      id: 'Tutup progres', tr: 'İlerlemeyi kapat', pl: 'Zamknij postęp',
    }),
    minutesSpoken: triLang(lang, {
      ru: 'минут речи', uk: 'хвилин мовлення', en: 'minutes spoken',
      es: 'minutos hablados', 'pt-BR': 'minutos falados', vi: 'phút đã nói',
      id: 'menit bicara', tr: 'konuşma dakikası', pl: 'minut mowy',
    }),
    emptyHint: triLang(lang, {
      ru: 'здесь появится твоя речь', uk: 'тут з’явиться твоє мовлення',
      en: 'your speech will show up here', es: 'aquí aparecerá tu voz',
      'pt-BR': 'sua fala vai aparecer aqui', vi: 'giọng nói của bạn sẽ hiện ở đây',
      id: 'suaramu akan muncul di sini', tr: 'konuşman burada görünecek',
      pl: 'tu pojawi się twoja mowa',
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
  };

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={c.close}
      testID="max-lessons-stats-sheet"
      glowColor={t.accent}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: CONTENT_INSET, paddingBottom: 26, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ① Шапка: число ведёт, рост справа. Без коробки — на фоне листа. */}
        <Reanimated.View
          entering={FadeInDown.duration(320)}
          accessible
          accessibilityLabel={`${spokeMinutes} ${c.minutesSpoken}${changePct !== null ? `, ${changePct > 0 ? '+' : ''}${changePct}%` : ''}`}
          style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <StatCountUpText
              value={spokeMinutes}
              numberOfLines={1}
              style={{
                color: spokeMinutes > 0 ? t.textPrimary : t.textMuted,
                fontSize: f.numLg,
                fontWeight: '900',
                letterSpacing: -1,
              }}
            />
            <Text
              style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', marginTop: 4 }}
              maxFontSizeMultiplier={1.6}
            >
              {c.minutesSpoken}
            </Text>
          </View>
          {changePct !== null ? <ChangeBadge pct={changePct} /> : null}
        </Reanimated.View>

        {/* ② Живая линия минут по отрезкам. */}
        <View style={{ marginTop: 14 }}>
          <MaxSpeechSparkline
            values={values}
            horizontalInset={SHEET_SHELL_INSET + CONTENT_INSET}
            emptyHint={c.emptyHint}
            visible={visible}
          />
        </View>

        {/* ③ Градиентное поле: не коробка, а перелив тона, гаснущий книзу.
            Строки разделены светом, число слева, подпись прижата вправо. */}
        <Reanimated.View entering={FadeInDown.delay(80).duration(320)} style={{ marginTop: 10 }}>
          <LinearGradient
            colors={[withAlpha(t.accent, 0.1), withAlpha(t.accent, 0.02), withAlpha(t.accent, 0)]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ borderRadius: 24, paddingHorizontal: 18, paddingVertical: 6 }}
          >
            <FieldRow value={String(vocabWords)} label={c.vocab} first delayMs={120} />
            <FieldRow value={`${cleanPhrasePct}%`} label={c.clean} delayMs={180} />
            <FieldRow value={`${done} / ${total}`} label={c.lessons} delayMs={240} />
            <FieldRow value={level} label={c.levelNow} delayMs={300} />
          </LinearGradient>
        </Reanimated.View>
      </ScrollView>
    </HybridSheetShell>
  );
}

/**
 * Значок роста «↑ 62%». Спад показываем честно, но приглушённым тоном, не
 * красным: тревожный цвет за тихую неделю демотивирует сильнее, чем помогает.
 */
function ChangeBadge({ pct }: { pct: number }) {
  const { theme: t, f } = useTheme();
  const grew = pct >= 0;
  const color = grew ? t.accent : t.textMuted;
  return (
    <Reanimated.View
      entering={FadeInDown.delay(260).duration(300)}
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingTop: 6 }}
    >
      <Text style={{ color, fontSize: f.body, fontWeight: '900' }} maxFontSizeMultiplier={1.4}>
        {grew ? '↑' : '↓'}
      </Text>
      <Text style={{ color, fontSize: f.bodyLg, fontWeight: '900' }} maxFontSizeMultiplier={1.4} numberOfLines={1}>
        {`${Math.abs(pct)}%`}
      </Text>
    </Reanimated.View>
  );
}

/** Строка поля: число слева ведёт, подпись справа поясняет. Разделитель — свет, не рамка. */
function FieldRow({
  value, label, first = false, delayMs,
}: {
  value: string;
  label: string;
  first?: boolean;
  delayMs: number;
}) {
  const { theme: t, f } = useTheme();
  return (
    <Reanimated.View
      entering={FadeInDown.delay(delayMs).duration(300)}
      accessible
      accessibilityLabel={`${value} — ${label}`}
    >
      {/* Разделитель между строками — тонкая полоса света (View, не border). */}
      {!first ? <View style={{ height: 1, backgroundColor: withAlpha(t.accent, 0.09) }} /> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 14,
          paddingVertical: 14,
          paddingHorizontal: 2,
        }}
      >
        <Text
          style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900', letterSpacing: -0.5 }}
          maxFontSizeMultiplier={1.5}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text
          style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}
          maxFontSizeMultiplier={1.7}
        >
          {label}
        </Text>
      </View>
    </Reanimated.View>
  );
}
