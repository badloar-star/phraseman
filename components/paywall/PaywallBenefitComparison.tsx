// ════════════════════════════════════════════════════════════════════════════
// PaywallBenefitComparison.tsx — «Что входит» и «Free и Plus» пейвола Plus.
//
// зачем (владелец 2026-09-30, макет paywall-v3.html):
//  • «Что входит» — 5 главных плюсов;
//  • «Free и Plus» — 14 строк сравнения, первые 6 видны, кнопка «Все 14 возможностей»
//    РАСКРЫВАЕТ СПИСОК НА МЕСТЕ — не окно (в старом коде не раскрывалось);
//  • «Свои карточки» у Plus — «Безлимит», и это правда в коде
//    (app/flashcards/custom_card_access.ts: у Plus лимита нет);
//  • «Языки обучения» убраны — все языки бесплатны (study_languages.ts);
//  • «Энергия»: Free — «Тратится», Plus — «Не тратится»;
//  • «Реплики в AI-диалогах»: Free — 30 в МЕСЯЦ (D111);
//  • темы — не преимущество Plus (все темы бесплатны).
// Цвета — только токены активной темы (liquidGlassTokens + V2-стекло).
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path } from 'react-native-svg';

import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { RowDivider } from '../v2/RowDivider';
import { paywallPlateBg } from './paywall_surfaces';
import { COPY, LP, compareMore, pick, type L9 } from './PaywallPlusCopy';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

type MainBenefit = Readonly<{ icon: keyof typeof Ionicons.glyphMap; title: L9; detail: L9 }>;
type ComparisonRow = Readonly<{ id: string; label: L9; free: L9; plus: L9 }>;

const UNLIMITED = LP('Безлимит', 'Безліміт', 'Unlimited', 'Ilimitado', 'Ilimitado', 'Không giới hạn', 'Tanpa batas', 'Sınırsız', 'Bez limitu');
const DASH = LP('—', '—', '—', '—', '—', '—', '—', '—', '—');

export const PAYWALL_MAIN_BENEFITS: readonly MainBenefit[] = [
  {
    icon: 'layers-outline',
    title: LP('Карточки без ограничений', 'Картки без обмежень', 'Cards without limits', 'Tarjetas sin límites', 'Cartões sem limites', 'Thẻ không giới hạn', 'Kartu tanpa batas', 'Sınırsız kartlar', 'Karty bez limitów'),
    detail: LP('Сохраняй, создавай наборы, тренируйся', 'Зберігай, створюй набори, тренуйся', 'Save, build packs, practice', 'Guarda, crea sets y entrena', 'Salve, crie conjuntos e treine', 'Lưu, tạo bộ thẻ và luyện tập', 'Simpan, buat paket, dan berlatih', 'Kaydet, paket oluştur, çalış', 'Zapisuj, twórz zestawy, ćwicz'),
  },
  {
    icon: 'school-outline',
    title: LP('Все 32 урока курса', 'Усі 32 уроки курсу', 'All 32 course lessons', 'Las 32 lecciones del curso', 'Todas as 32 lições do curso', 'Đủ 32 bài của khóa học', 'Semua 32 pelajaran kursus', 'Kursun 32 dersinin tümü', 'Wszystkie 32 lekcje kursu'),
    detail: LP('Бесплатно — уроки 1–3', 'Безкоштовно — уроки 1–3', 'Free: lessons 1–3', 'Gratis: lecciones 1–3', 'Grátis: lições 1–3', 'Miễn phí: bài 1–3', 'Gratis: pelajaran 1–3', 'Ücretsiz: 1–3. dersler', 'Za darmo: lekcje 1–3'),
  },
  {
    icon: 'sparkles-outline',
    title: LP('AI разбирает каждую ошибку', 'AI розбирає кожну помилку', 'AI explains every mistake', 'La IA explica cada error', 'A IA explica cada erro', 'AI phân tích từng lỗi', 'AI menjelaskan setiap kesalahan', 'AI her hatayı açıklar', 'AI wyjaśnia każdy błąd'),
    detail: LP('Бесплатно — 3 разбора в день', 'Безкоштовно — 3 розбори на день', 'Free: 3 a day', 'Gratis: 3 al día', 'Grátis: 3 por dia', 'Miễn phí: 3 lượt mỗi ngày', 'Gratis: 3 per hari', 'Ücretsiz: günde 3', 'Za darmo: 3 dziennie'),
  },
  {
    icon: 'flash-outline',
    title: LP('Энергия не тратится', 'Енергія не витрачається', 'Energy is never spent', 'La energía no se gasta', 'A energia não é gasta', 'Không tốn năng lượng', 'Energi tidak terpakai', 'Enerji harcanmaz', 'Energia się nie zużywa'),
    detail: LP('Учись без пауз', 'Навчайся без пауз', 'Learn without breaks', 'Aprende sin pausas', 'Aprenda sem pausas', 'Học không gián đoạn', 'Belajar tanpa jeda', 'Ara vermeden öğren', 'Ucz się bez przerw'),
  },
  {
    icon: 'snow-outline',
    title: LP('3 заморозки серии в месяц', '3 заморозки серії на місяць', '3 streak freezes a month', '3 protectores de racha al mes', '3 proteções de sequência por mês', '3 lần đóng băng chuỗi mỗi tháng', '3 pembeku rentetan per bulan', 'Ayda 3 seri dondurma', '3 zamrożenia serii miesięcznie'),
    detail: LP('Пропустил день — серия цела', 'Пропустив день — серія ціла', 'Miss a day, keep your streak', 'Si fallas un día, la racha sigue', 'Perdeu um dia? A sequência fica', 'Lỡ một ngày, chuỗi vẫn giữ', 'Lewat sehari, rentetan tetap aman', 'Bir gün kaçırsan da seri korunur', 'Opuścisz dzień — seria zostaje'),
  },
];

export const PAYWALL_COMPARISON_ROWS: readonly ComparisonRow[] = [
  { id: 'saved_phrases', label: LP('Сохранённые фразы', 'Збережені вислови', 'Saved phrases', 'Frases guardadas', 'Frases salvas', 'Cụm từ đã lưu', 'Frasa tersimpan', 'Kaydedilen ifadeler', 'Zapisane zwroty'),
    free: LP('До 50', 'До 50', 'Up to 50', 'Hasta 50', 'Até 50', 'Tối đa 50', 'Hingga 50', 'En fazla 50', 'Do 50'), plus: UNLIMITED },
  { id: 'own_cards', label: LP('Свои карточки', 'Власні картки', 'Your own cards', 'Tus tarjetas', 'Seus cartões', 'Thẻ của bạn', 'Kartu buatanmu', 'Kendi kartların', 'Własne karty'),
    free: LP('До 50', 'До 50', 'Up to 50', 'Hasta 50', 'Até 50', 'Tối đa 50', 'Hingga 50', 'En fazla 50', 'Do 50'), plus: UNLIMITED },
  { id: 'own_packs', label: LP('Свои наборы', 'Власні набори', 'Your own packs', 'Tus sets', 'Seus conjuntos', 'Bộ thẻ của bạn', 'Paket buatanmu', 'Kendi setlerin', 'Własne zestawy'),
    free: LP('До 3', 'До 3', 'Up to 3', 'Hasta 3', 'Até 3', 'Tối đa 3', 'Hingga 3', 'En fazla 3', 'Do 3'), plus: UNLIMITED },
  { id: 'flashcard_training', label: LP('Тренировки с карточками', 'Тренування з картками', 'Flashcard training', 'Entrenar con tarjetas', 'Treino com cartões', 'Luyện thẻ', 'Latihan kartu', 'Kart antrenmanı', 'Trening z kartami'),
    free: LP('30 в месяц', '30 на місяць', '30 a month', '30 al mes', '30 por mês', '30 mỗi tháng', '30 per bulan', 'Ayda 30', '30 miesięcznie'), plus: UNLIMITED },
  { id: 'course_lessons', label: LP('Основной курс', 'Основний курс', 'Main course', 'Curso principal', 'Curso principal', 'Khóa học chính', 'Kursus utama', 'Ana kurs', 'Kurs główny'),
    free: LP('Уроки 1–3', 'Уроки 1–3', 'Lessons 1–3', 'Lecciones 1–3', 'Lições 1–3', 'Bài 1–3', 'Pelajaran 1–3', 'Dersler 1–3', 'Lekcje 1–3'),
    plus: LP('Все 32', 'Усі 32', 'All 32', 'Las 32', 'Todas as 32', 'Đủ 32', 'Semua 32', '32’nin tümü', 'Wszystkie 32') },
  { id: 'dialogue_replies', label: LP('Реплики в AI-диалогах', 'Репліки в AI-діалогах', 'AI dialogue replies', 'Respuestas en diálogos IA', 'Respostas em diálogos IA', 'Lượt nói hội thoại AI', 'Balasan dialog AI', 'AI diyalog yanıtları', 'Odpowiedzi w dialogach AI'),
    free: LP('30 в месяц', '30 на місяць', '30 a month', '30 al mes', '30 por mês', '30 mỗi tháng', '30 per bulan', 'Ayda 30', '30 miesięcznie'), plus: UNLIMITED },
  { id: 'pronunciation', label: LP('Произношение', 'Вимова', 'Pronunciation', 'Pronunciación', 'Pronúncia', 'Phát âm', 'Pengucapan', 'Telaffuz', 'Wymowa'),
    free: LP('3 в день', '3 на день', '3 a day', '3 al día', '3 por dia', '3 mỗi ngày', '3 per hari', 'Günde 3', '3 dziennie'), plus: UNLIMITED },
  { id: 'ai_mistake_explain', label: LP('AI-разборы ошибок', 'AI-розбори помилок', 'AI mistake reviews', 'Análisis de errores IA', 'Análise de erros IA', 'AI phân tích lỗi', 'Ulasan kesalahan AI', 'AI hata incelemesi', 'Analizy błędów AI'),
    free: LP('3 в день', '3 на день', '3 a day', '3 al día', '3 por dia', '3 mỗi ngày', '3 per hari', 'Günde 3', '3 dziennie'), plus: UNLIMITED },
  { id: 'mistake_practice', label: LP('Работа над ошибками', 'Робота над помилками', 'Mistake practice', 'Práctica de errores', 'Prática de erros', 'Luyện lại lỗi sai', 'Latihan kesalahan', 'Hata pratiği', 'Praca nad błędami'),
    free: LP('1 в день', '1 на день', '1 a day', '1 al día', '1 por dia', '1 mỗi ngày', '1 per hari', 'Günde 1', '1 dziennie'), plus: UNLIMITED },
  { id: 'text_dialogue_review', label: LP('Разбор диалога', 'Розбір діалогу', 'Dialogue review', 'Análisis del diálogo', 'Análise do diálogo', 'Phân tích hội thoại', 'Ulasan dialog', 'Diyalog incelemesi', 'Analiza dialogu'),
    free: LP('Кратко', 'Коротко', 'Brief', 'Breve', 'Breve', 'Ngắn gọn', 'Ringkas', 'Kısa', 'Skrócona'),
    plus: LP('Полный', 'Повний', 'Full', 'Completo', 'Completa', 'Đầy đủ', 'Lengkap', 'Tam', 'Pełna') },
  { id: 'combined_lesson', label: LP('Комбинированный урок', 'Комбінований урок', 'Combined lesson', 'Lección combinada', 'Lição combinada', 'Bài học kết hợp', 'Pelajaran gabungan', 'Birleşik ders', 'Lekcja łączona'),
    free: DASH, plus: LP('Есть', 'Є', 'Included', 'Incluida', 'Incluída', 'Có', 'Ada', 'Var', 'Jest') },
  { id: 'energy', label: LP('Энергия', 'Енергія', 'Energy', 'Energía', 'Energia', 'Năng lượng', 'Energi', 'Enerji', 'Energia'),
    free: LP('Тратится', 'Витрачається', 'Spent', 'Se gasta', 'É gasta', 'Bị tiêu hao', 'Terpakai', 'Harcanır', 'Zużywa się'),
    plus: LP('Не тратится', 'Не витрачається', 'Never spent', 'No se gasta', 'Não é gasta', 'Không tiêu hao', 'Tidak terpakai', 'Harcanmaz', 'Nie zużywa się') },
  { id: 'streak_freezes', label: LP('Заморозки серии', 'Заморозки серії', 'Streak freezes', 'Protectores de racha', 'Proteções de sequência', 'Đóng băng chuỗi', 'Pembeku rentetan', 'Seri dondurma', 'Zamrożenia serii'),
    free: DASH, plus: LP('3 в месяц', '3 на місяць', '3 a month', '3 al mes', '3 por mês', '3 mỗi tháng', '3 per bulan', 'Ayda 3', '3 miesięcznie') },
  { id: 'detailed_stats', label: LP('Статистика', 'Статистика', 'Statistics', 'Estadísticas', 'Estatísticas', 'Thống kê', 'Statistik', 'İstatistikler', 'Statystyki'),
    free: LP('Основная', 'Основна', 'Basic', 'Básica', 'Básica', 'Cơ bản', 'Dasar', 'Temel', 'Podstawowa'),
    plus: LP('Подробная', 'Докладна', 'Detailed', 'Detallada', 'Detalhada', 'Chi tiết', 'Terperinci', 'Ayrıntılı', 'Szczegółowa') },
];

/** Сколько строк сравнения видно до раскрытия (макет: первые 6). */
export const PAYWALL_COMPARISON_VISIBLE_ROWS = 6;

type SectionProps = Readonly<{ lang: Lang; g: GlassTokens }>;

// зачем (Сверка paywall-gap-001, 15.10): у AI в эталоне две искры, у заморозки — звёздочка (paywall-gaps-states `IC.sparkles` / `IC.snow`), а не стоковые три искры и снежинка Ionicons.
const EMBER_GLYPHS: Readonly<Record<string, readonly string[]>> = {
  'sparkles-outline': ['M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6z', 'M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z'],
  'snow-outline': ['M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9', 'M9.5 4.5L12 6.5l2.5-2M9.5 19.5L12 17.5l2.5 2'],
};

function BenefitGlyph({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  const paths = EMBER_GLYPHS[name as string];
  if (!paths) return <Ionicons name={name} size={20} color={color} />;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d) => <Path key={d} d={d} />)}
    </Svg>
  );
}

export const PaywallPlusBenefits = memo(function PaywallPlusBenefits({ lang, g }: SectionProps) {
  const glass = { backgroundColor: paywallPlateBg(g) }; // зачем: на шторке поверхности сплошные (светлая тема, Сверка 11.10)
  // зачем: общий список «Что входит» — только у входа без своего текста; контекстная выгода рисуется в PaywallPlusDetails (макет paywall-context-redesign #c1).
  return (
    <View style={[S.card, glass]}>
      {PAYWALL_MAIN_BENEFITS.map((benefit, index) => (
        <View key={benefit.icon} style={S.benefitRow}>
          {index > 0 ? <RowDivider color={g.line} /> : null}
          <View style={[S.iconTile, { backgroundColor: paywallPlateBg(g) }]}>
            <BenefitGlyph name={benefit.icon} color={g.text} />
          </View>
          <View style={S.benefitCopy}>
            <Text style={[S.benefitTitle, { color: g.text }]}>{pick(lang, benefit.title)}</Text>
            <Text style={[S.benefitDetail, { color: g.secondary }]}>{pick(lang, benefit.detail)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
});

export const PaywallPlusComparison = memo(function PaywallPlusComparison({ lang, g }: SectionProps) {
  const glass = { backgroundColor: paywallPlateBg(g) };
  const [open, setOpen] = useState(false);
  // зачем: раскрытие — вставка строк в поток, поэтому только через общий
  // animateNextLayoutTransition (Performance Bible: flow inserts), без окна.
  const toggle = useCallback(() => {
    animateNextLayoutTransition();
    setOpen((current) => !current);
  }, []);
  const rows = open ? PAYWALL_COMPARISON_ROWS : PAYWALL_COMPARISON_ROWS.slice(0, PAYWALL_COMPARISON_VISIBLE_ROWS);
  return (
    <View style={[S.card, glass]}>
      <View style={S.cmpHead}>
        <View style={S.cmpLabel} />
        <Text style={[S.cmpHeadCell, { color: g.mutedText }]}>{pick(lang, COPY.free)}</Text>
        <Text style={[S.cmpHeadCell, S.cmpPlusCell, { color: g.text }]}>{pick(lang, COPY.plus)}</Text>
      </View>
      <View accessibilityRole="list">
        {rows.map((row) => (
          <View key={row.id} accessibilityRole="text" style={S.cmpRow}>
            <RowDivider color={g.line} />
            <Text style={[S.cmpLabel, S.cmpLabelText, { color: g.text }]}>{pick(lang, row.label)}</Text>
            <Text style={[S.cmpCell, { color: g.mutedText }]}>{pick(lang, row.free)}</Text>
            <Text style={[S.cmpCell, S.cmpPlusCell, S.cmpPlusValue, { color: g.text }]}>{pick(lang, row.plus)}</Text>
          </View>
        ))}
      </View>
      <Pressable
        testID="paywall-compare-toggle"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={({ pressed }) => [S.more, { opacity: pressed ? 0.7 : 1 }]}
      >
        <RowDivider color={g.line} />
        <Text style={[S.moreText, { color: g.secondary }]}>
          {open ? pick(lang, COPY.collapse) : compareMore(lang, PAYWALL_COMPARISON_ROWS.length)}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={g.secondary} />
      </Pressable>
    </View>
  );
});

const S = StyleSheet.create({
  card: { borderRadius: 22 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 14 },
  iconTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  benefitCopy: { flex: 1, minWidth: 0 },
  benefitTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  benefitDetail: { marginTop: 2, fontSize: 13, lineHeight: 17 },
  cmpHead: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14 },
  cmpHeadCell: { width: 84, fontSize: 13, fontWeight: '700', letterSpacing: 1.6 },
  cmpRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingVertical: 8, paddingHorizontal: 14 }, // зачем (владелец 12.10, стиль «Тень»): разделитель — линия-View (RowDivider), а не borderTop/borderBottom
  cmpLabel: { flex: 1, minWidth: 0 },
  cmpLabelText: { fontSize: 16, lineHeight: 21, fontWeight: '600' }, // зачем (paywall-gaps-states): название строки 16/600
  cmpCell: { width: 84, fontSize: 13, lineHeight: 17 },
  cmpPlusCell: { width: 88 },
  cmpPlusValue: { fontWeight: '700' },
  more: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  moreText: { fontSize: 13, fontWeight: '700' },
});
