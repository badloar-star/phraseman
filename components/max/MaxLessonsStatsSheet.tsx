// ═══════════════════════════════════════════════════════════════════════════
// MaxLessonsStatsSheet — прогресс речи для раздела «Уроки с МАКСом».
//
// зачем (владелец 2026-09-01): выбран макет 04 «Было → Стало». Абсолютная
// цифра человеку ничего не говорит — «120 минут» это много или мало? Мотивирует
// РАЗНИЦА с собой прежним. Поэтому каждая метрика показана парой: тихое число
// «было» слева, крупное «стало» справа, между ними стрелка.
//
// Планка — раздел «Статистика» (эталон владельца): крупные числа весом 900,
// скругление 18, разделение тоном, без единой обводки. Числа «стало»
// докручиваются тем же StatCountUpText, что и там: рост читается движением,
// а «было» стоит неподвижно — прошлое не растёт.
//
// Показываем ТОЛЬКО измеренное. Ни одной выдуманной метрики: время речи,
// разнообразие слов и доля чистых фраз считаются из настоящих замеров
// (app/max_speech_history.ts). Пока замеров нет — честно говорим об этом,
// а не рисуем нули, которые читаются как «ты ничего не сделал».
//
// Честность сравнения: если в прошлой половине окна звонков не было
// (comparable=false), пары НЕ показываем. Рост «с нуля» — это первый месяц,
// а не достижение, и врать об этом нельзя.
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';

import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { StatCountUpText } from '../stats/StatCountUpText';
import { useTheme } from '../ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import type { VoiceProgress, VoiceTrends } from '../../app/max_voice_metrics';

interface Props {
  visible: boolean;
  onClose: () => void;
  trends: VoiceTrends | null;
  /** Пары «было → стало». null — история ещё не поднята с диска. */
  progress: VoiceProgress | null;
  done: number;
  total: number;
  level: string;
  lang: Lang;
}

export default function MaxLessonsStatsSheet({
  visible, onClose, trends, progress, done, total, level, lang,
}: Props) {
  const { theme: t, f } = useTheme();
  const hasSpeech = trends !== null && trends.spokeMinutes > 0;
  // Пары показываем, только если есть с чем сравнивать. Иначе — текущие цифры.
  const showPairs = progress !== null && progress.comparable;

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
    // Заголовок пар: две недели назад против этих двух недель.
    twoWeeks: triLang(lang, {
      ru: 'Две недели назад → сейчас', uk: 'Два тижні тому → зараз',
      en: 'Two weeks ago → now', es: 'Hace dos semanas → ahora',
      'pt-BR': 'Duas semanas atrás → agora', vi: 'Hai tuần trước → bây giờ',
      id: 'Dua minggu lalu → sekarang', tr: 'İki hafta önce → şimdi',
      pl: 'Dwa tygodnie temu → teraz',
    }),
    lastMonth: triLang(lang, {
      ru: 'За последний месяц', uk: 'За останній місяць', en: 'Over the last month',
      es: 'En el último mes', 'pt-BR': 'No último mês', vi: 'Trong tháng qua',
      id: 'Sebulan terakhir', tr: 'Son bir ayda', pl: 'W ostatnim miesiącu',
    }),
    spoke: triLang(lang, {
      ru: 'минут своей речи', uk: 'хвилин власного мовлення', en: 'minutes you spoke',
      es: 'minutos hablados por ti', 'pt-BR': 'minutos falados por você',
      vi: 'phút bạn đã nói', id: 'menit kamu bicara', tr: 'senin konuşma dakikan',
      pl: 'minut twojej mowy',
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

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={c.close}
      testID="max-lessons-stats-sheet"
      glowColor={t.accent}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 26, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Два главных числа рядом: сколько уроков закрыто и на каком уровне
            человек сейчас говорит. Уровень честный — по закрытым целям. */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, borderRadius: 18, backgroundColor: t.bgSurface, padding: 16 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.numMd + 2, fontWeight: '900' }} maxFontSizeMultiplier={1.8}>
              {done}
              <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '800' }}>{` / ${total}`}</Text>
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', marginTop: 4 }} maxFontSizeMultiplier={1.8}>
              {c.lessons}
            </Text>
          </View>
          <View style={{ flex: 1, borderRadius: 18, backgroundColor: t.bgSurface, padding: 16 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.numMd + 2, fontWeight: '900' }} maxFontSizeMultiplier={1.8}>
              {level}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', marginTop: 4 }} maxFontSizeMultiplier={1.8}>
              {c.levelNow}
            </Text>
          </View>
        </View>

        {hasSpeech ? (
          showPairs ? (
            // Макет 04: каждая метрика — своя карточка с парой «было → стало».
            <View style={{ gap: 12 }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800', paddingHorizontal: 2 }} maxFontSizeMultiplier={1.8}>
                {c.twoWeeks}
              </Text>
              <ProgressPairCard
                before={progress.spokeMinutes.before}
                after={progress.spokeMinutes.after}
                label={c.spoke}
                delayMs={80}
              />
              <ProgressPairCard
                before={progress.vocabWords.before}
                after={progress.vocabWords.after}
                label={c.vocab}
                delayMs={160}
              />
              {progress.cleanPhrasePct !== null ? (
                <ProgressPairCard
                  before={progress.cleanPhrasePct.before}
                  after={progress.cleanPhrasePct.after}
                  label={c.clean}
                  suffix="%"
                  delayMs={240}
                />
              ) : null}
            </View>
          ) : (
            // Сравнивать не с чем — показываем текущие цифры, без ложного роста.
            <View style={{ borderRadius: 18, backgroundColor: t.bgSurface, padding: 16, gap: 14 }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }} maxFontSizeMultiplier={1.8}>
                {c.lastMonth}
              </Text>
              <StatLine value={String(trends.spokeMinutes)} label={c.spoke} />
              <StatLine value={String(trends.vocabWords)} label={c.vocab} />
              {trends.cleanPhrasePct !== null ? (
                <StatLine value={`${trends.cleanPhrasePct}%`} label={c.clean} />
              ) : null}
            </View>
          )
        ) : (
          // Пустое состояние объясняет, что будет здесь, — а не показывает нули.
          <View style={{ borderRadius: 18, backgroundColor: t.bgSurface, padding: 18 }}>
            <Text
              style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', lineHeight: f.body * 1.45 }}
              maxFontSizeMultiplier={1.8}
            >
              {c.empty}
            </Text>
          </View>
        )}
      </ScrollView>
    </HybridSheetShell>
  );
}

/**
 * Карточка одной метрики: «было» тихо, стрелка, «стало» крупно.
 *
 * Иерархия делает работу за подпись: прошлое приглушено и мельче, настоящее
 * ведёт размером и весом. Докручивается ТОЛЬКО «стало» — прошлое неподвижно,
 * поэтому движение читается как рост, а не как общая анимация появления.
 */
function ProgressPairCard({
  before, after, label, suffix = '', delayMs,
}: {
  before: number;
  after: number;
  label: string;
  suffix?: string;
  delayMs: number;
}) {
  const { theme: t, f } = useTheme();
  const grew = after > before;

  return (
    <Reanimated.View
      entering={FadeInDown.delay(delayMs).duration(320)}
      // Пара озвучивается одной фразой: по отдельности «12» и «47» не связаны
      // между собой, и вся мысль макета для незрячего человека пропадает.
      accessible
      accessibilityLabel={`${label}: ${before}${suffix} → ${after}${suffix}`}
      style={{ borderRadius: 18, backgroundColor: t.bgSurface, padding: 16, gap: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <Text
          style={{ color: t.textMuted, fontSize: f.numMd, fontWeight: '900' }}
          maxFontSizeMultiplier={1.6}
          numberOfLines={1}
        >
          {`${before}${suffix}`}
        </Text>
        <Text
          style={{ color: t.textMuted, fontSize: f.body, fontWeight: '900' }}
          maxFontSizeMultiplier={1.6}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          →
        </Text>
        <StatCountUpText
          value={after}
          suffix={suffix}
          delayMs={delayMs + 120}
          numberOfLines={1}
          style={{
            // Рост подсвечен акцентом, спад — обычным цветом текста: падение
            // показываем честно, но не красим тревожно, это демотивирует.
            color: grew ? t.accent : t.textPrimary,
            fontSize: f.numLg,
            fontWeight: '900',
          }}
        />
      </View>
      <Text
        style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700' }}
        maxFontSizeMultiplier={1.8}
      >
        {label}
      </Text>
    </Reanimated.View>
  );
}

/** Строка «число — что это». Число ведёт, подпись поясняет тоном потише. */
function StatLine({ value, label }: { value: string; label: string }) {
  const { theme: t, f } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
      <Text
        style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900', minWidth: 62 }}
        maxFontSizeMultiplier={1.8}
      >
        {value}
      </Text>
      <Text
        style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', flex: 1 }}
        maxFontSizeMultiplier={1.8}
      >
        {label}
      </Text>
    </View>
  );
}
