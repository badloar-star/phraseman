import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';

import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { LinearGradient } from '../SafeLinearGradient';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;
type Localized = Readonly<Record<Lang, string>>;
type BenefitId =
  | 'saved_phrases'
  | 'own_cards'
  | 'flashcard_training'
  | 'course_lessons'
  | 'study_languages'
  | 'energy'
  | 'own_packs'
  | 'dialogue_replies'
  | 'text_dialogue_review'
  | 'pronunciation'
  | 'mistake_practice'
  | 'ai_mistake_explain'
  | 'combined_lesson'
  | 'streak_freezes'
  | 'detailed_stats';

type Benefit = Readonly<{
  id: BenefitId | 'cards_bundle';
  icon: keyof typeof Ionicons.glyphMap;
  label: Localized;
  freeValue: Localized;
  plusValue: Localized;
  note?: Localized;
}>;

const LP = (
  ru: string,
  en: string,
  uk: string,
  es: string,
  ptBR: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
): Localized => ({ ru, en, uk, es, 'pt-BR': ptBR, vi, id, tr, pl });

// зачем: слово «Безлимит» для Plus — маркетинговое решение владельца и макет paywall-review.
// Ставим его только там, где код действительно не ограничивает Plus (см. совет 2026-09-30, B7).
const UNLIMITED: Localized = LP('Безлимит', 'Unlimited', 'Безліміт', 'Ilimitado', 'Ilimitado', 'Không giới hạn', 'Tanpa batas', 'Sınırsız', 'Bez limitu');

const BENEFITS: readonly Benefit[] = [
  {
    id: 'saved_phrases', icon: 'bookmark-outline',
    label: LP('Сохранённые фразы', 'Saved phrases', 'Збережені фрази', 'Frases guardadas', 'Frases salvas', 'Cụm từ đã lưu', 'Frasa tersimpan', 'Kaydedilen ifadeler', 'Zapisane zwroty'),
    freeValue: LP('До 50', 'Up to 50', 'До 50', 'Hasta 50', 'Até 50', 'Tối đa 50', 'Hingga 50', 'En fazla 50', 'Do 50'),
    plusValue: UNLIMITED,
  },
  // зачем (совет 2026-09-30, B7a): код держит Plus на 1500 своих карточек на язык
  // (app/flashcards/custom_card_access.ts, PLUS_CUSTOM_CARD_LIMIT) — «Безлимит» был неправдой.
  {
    id: 'own_cards', icon: 'create-outline',
    label: LP('Свои карточки', 'Your own cards', 'Власні картки', 'Tus propias tarjetas', 'Seus próprios cartões', 'Thẻ của bạn', 'Kartu buatanmu', 'Kendi kartların', 'Własne karty'),
    freeValue: LP('До 50', 'Up to 50', 'До 50', 'Hasta 50', 'Até 50', 'Tối đa 50', 'Hingga 50', 'En fazla 50', 'Do 50'),
    plusValue: LP('До 1500', 'Up to 1,500', 'До 1500', 'Hasta 1500', 'Até 1.500', 'Tối đa 1.500', 'Hingga 1.500', 'En fazla 1.500', 'Do 1500'),
  },
  {
    id: 'own_packs', icon: 'albums-outline',
    label: LP('Свои наборы', 'Your own packs', 'Власні набори', 'Tus propios sets', 'Seus próprios conjuntos', 'Bộ thẻ của bạn', 'Paket buatanmu', 'Kendi setlerin', 'Własne zestawy'),
    freeValue: LP('До 3', 'Up to 3', 'До 3', 'Hasta 3', 'Até 3', 'Tối đa 3', 'Hingga 3', 'En fazla 3', 'Do 3'),
    plusValue: UNLIMITED,
    note: LP('10–50 карточек в наборе. Платные наборы приобретаются отдельно.', '10–50 cards per pack. Paid packs are purchased separately.', '10–50 карток у наборі. Платні набори купуються окремо.', '10–50 tarjetas por set. Los sets de pago se compran aparte.', '10–50 cartões por conjunto. Conjuntos pagos são comprados à parte.', '10–50 thẻ mỗi bộ. Bộ trả phí được mua riêng.', '10–50 kartu per paket. Paket berbayar dibeli terpisah.', 'Set başına 10–50 kart. Ücretli setler ayrıca alınır.', '10–50 kart w zestawie. Płatne zestawy kupuje się osobno.'),
  },
  // зачем (B7c, 2026-09-30): Plus без лимита тренировок — app/monthly_training_sessions.ts
  // пропускает hasPremiumAccess (tests/monthly_training_plus_unlimited.test.mjs).
  {
    id: 'flashcard_training', icon: 'repeat-outline',
    label: LP('Тренировки с карточками', 'Flashcard training', 'Тренування з картками', 'Entrenamiento con tarjetas', 'Treino com cartões', 'Luyện tập thẻ', 'Latihan kartu', 'Kart antrenmanı', 'Trening z kartami'),
    freeValue: LP('30 в месяц', '30 a month', '30 на місяць', '30 al mes', '30 por mês', '30 mỗi tháng', '30 per bulan', 'Ayda 30', '30 miesięcznie'),
    plusValue: UNLIMITED,
  },
  // зачем (совет 2026-09-30, B7b): строки «Сценарии диалогов» нет — диалоги открываются по
  // рангу, а не по Plus (D05/PM-014); обещание «51 сценарий в Plus» было неправдой.
  {
    id: 'course_lessons', icon: 'school-outline',
    label: LP('Основной курс', 'Main course', 'Основний курс', 'Curso principal', 'Curso principal', 'Khóa học chính', 'Kursus utama', 'Ana kurs', 'Kurs główny'),
    freeValue: LP('Уроки 1–3', 'Lessons 1–3', 'Уроки 1–3', 'Lecciones 1–3', 'Lições 1–3', 'Bài 1–3', 'Pelajaran 1–3', 'Dersler 1–3', 'Lekcje 1–3'),
    plusValue: LP('Все 32 урока', 'All 32 lessons', 'Усі 32 уроки', 'Las 32 lecciones', 'Todas as 32 lições', 'Đủ 32 bài', 'Semua 32 pelajaran', '32 dersin tümü', 'Wszystkie 32 lekcje'),
  },
  {
    id: 'study_languages', icon: 'language-outline',
    label: LP('Языки обучения', 'Study languages', 'Мови навчання', 'Idiomas de estudio', 'Idiomas de estudo', 'Ngôn ngữ học', 'Bahasa belajar', 'Öğrenme dilleri', 'Języki nauki'),
    freeValue: LP('1 язык', '1 language', '1 мова', '1 idioma', '1 idioma', '1 ngôn ngữ', '1 bahasa', '1 dil', '1 język'),
    plusValue: LP('4 языка', '4 languages', '4 мови', '4 idiomas', '4 idiomas', '4 ngôn ngữ', '4 bahasa', '4 dil', '4 języki'),
    note: LP('Английский, испанский, французский и немецкий.', 'English, Spanish, French and German.', 'Англійська, іспанська, французька та німецька.', 'Inglés, español, francés y alemán.', 'Inglês, espanhol, francês e alemão.', 'Tiếng Anh, Tây Ban Nha, Pháp và Đức.', 'Inggris, Spanyol, Prancis, dan Jerman.', 'İngilizce, İspanyolca, Fransızca ve Almanca.', 'Angielski, hiszpański, francuski i niemiecki.'),
  },
  {
    id: 'energy', icon: 'flash-outline',
    label: LP('Занятия без ожидания', 'Sessions without waiting', 'Заняття без очікування', 'Sesiones sin espera', 'Sessões sem espera', 'Học không phải chờ', 'Sesi tanpa menunggu', 'Beklemeden çalışma', 'Nauka bez czekania'),
    freeValue: LP('Запас 5, +1 каждые 10 мин.', '5 stored, +1 every 10 min.', 'Запас 5, +1 кожні 10 хв.', '5 disponibles, +1 cada 10 min.', '5 disponíveis, +1 a cada 10 min.', 'Có 5, +1 mỗi 10 phút', 'Stok 5, +1 tiap 10 mnt.', '5 hak, 10 dk.da +1', 'Zapas 5, +1 co 10 min'),
    plusValue: LP('Энергия не тратится', 'Energy is not spent', 'Енергія не витрачається', 'No se gasta energía', 'Não gasta energia', 'Không tốn năng lượng', 'Energi tidak terpakai', 'Enerji harcanmaz', 'Energia nie jest zużywana'),
  },
  {
    id: 'dialogue_replies', icon: 'chatbox-ellipses-outline',
    label: LP('Реплики в AI-диалогах', 'Replies in AI dialogues', 'Репліки в AI-діалогах', 'Respuestas en diálogos con IA', 'Respostas em diálogos com IA', 'Lượt nói trong hội thoại AI', 'Balasan dalam dialog AI', 'AI diyalog yanıtları', 'Odpowiedzi w dialogach AI'),
    freeValue: LP('30 в месяц', '30 a month', '30 на місяць', '30 al mes', '30 por mês', '30 mỗi tháng', '30 per bulan', 'Ayda 30', '30 miesięcznie'),
    plusValue: UNLIMITED,
  },
  {
    id: 'text_dialogue_review', icon: 'document-text-outline',
    label: LP('Разбор текстового диалога', 'Text dialogue review', 'Розбір текстового діалогу', 'Análisis del diálogo escrito', 'Análise do diálogo em texto', 'Phân tích hội thoại văn bản', 'Ulasan dialog teks', 'Metin diyaloğu incelemesi', 'Analiza dialogu tekstowego'),
    freeValue: LP('Кратко + 1 фраза', 'Brief + 1 phrase', 'Коротко + 1 фраза', 'Breve + 1 frase', 'Breve + 1 frase', 'Ngắn + 1 cụm từ', 'Ringkas + 1 frasa', 'Kısa + 1 ifade', 'Krótka + 1 zwrot'),
    plusValue: LP('Полный разбор', 'Full review', 'Повний розбір', 'Análisis completo', 'Análise completa', 'Phân tích đầy đủ', 'Ulasan lengkap', 'Tam inceleme', 'Pełna analiza'),
  },
  {
    id: 'pronunciation', icon: 'volume-high-outline',
    label: LP('Практика произношения', 'Pronunciation practice', 'Практика вимови', 'Práctica de pronunciación', 'Prática de pronúncia', 'Luyện phát âm', 'Latihan pengucapan', 'Telaffuz pratiği', 'Ćwiczenie wymowy'),
    freeValue: LP('3 попытки в день', '3 attempts a day', '3 спроби на день', '3 intentos al día', '3 tentativas por dia', '3 lượt mỗi ngày', '3 percobaan per hari', 'Günde 3 deneme', '3 próby dziennie'),
    plusValue: UNLIMITED,
  },
  {
    id: 'mistake_practice', icon: 'refresh-outline',
    label: LP('Работа над ошибками', 'Mistake practice', 'Робота над помилками', 'Práctica de errores', 'Prática de erros', 'Luyện lại lỗi sai', 'Latihan kesalahan', 'Hata pratiği', 'Ćwiczenie błędów'),
    freeValue: LP('1 раз в день', 'Once a day', '1 раз на день', '1 vez al día', '1 vez por dia', '1 lần mỗi ngày', '1 kali per hari', 'Günde 1 kez', 'Raz dziennie'),
    plusValue: UNLIMITED,
  },
  // зачем (B6, 2026-09-30): клиент больше не режет Plus на 3 разбора (mistake_explain_plus_gate.ts).
  {
    id: 'ai_mistake_explain', icon: 'sparkles-outline',
    label: LP('AI-разборы ошибок', 'AI mistake explanations', 'AI-розбори помилок', 'Explicaciones de errores con IA', 'Explicações de erros com IA', 'AI phân tích lỗi', 'Penjelasan kesalahan AI', 'AI hata açıklamaları', 'Wyjaśnienia błędów AI'),
    freeValue: LP('3 в день', '3 a day', '3 на день', '3 al día', '3 por dia', '3 mỗi ngày', '3 per hari', 'Günde 3', '3 dziennie'),
    plusValue: UNLIMITED,
  },
  {
    id: 'combined_lesson', icon: 'git-merge-outline',
    label: LP('Комбинированный урок', 'Combined lesson', 'Комбінований урок', 'Lección combinada', 'Lição combinada', 'Bài học kết hợp', 'Pelajaran gabungan', 'Birleşik ders', 'Lekcja łączona'),
    freeValue: LP('Недоступен', 'Unavailable', 'Недоступний', 'No disponible', 'Indisponível', 'Không có', 'Tidak tersedia', 'Kullanılamaz', 'Niedostępna'),
    plusValue: LP('Доступен', 'Available', 'Доступний', 'Disponible', 'Disponível', 'Có sẵn', 'Tersedia', 'Kullanılabilir', 'Dostępna'),
  },
  {
    id: 'streak_freezes', icon: 'snow-outline',
    label: LP('Заморозки серии', 'Streak freezes', 'Заморозки серії', 'Protectores de racha', 'Proteções de sequência', 'Đóng băng chuỗi', 'Pembeku rentetan', 'Seri dondurma', 'Zamrożenia serii'),
    freeValue: LP('0', '0', '0', '0', '0', '0', '0', '0', '0'),
    plusValue: LP('3 в месяц', '3 a month', '3 на місяць', '3 al mes', '3 por mês', '3 mỗi tháng', '3 per bulan', 'Ayda 3', '3 miesięcznie'),
  },
  {
    id: 'detailed_stats', icon: 'stats-chart-outline',
    label: LP('Статистика занятий', 'Learning statistics', 'Статистика занять', 'Estadísticas de estudio', 'Estatísticas de estudo', 'Thống kê học tập', 'Statistik belajar', 'Öğrenme istatistikleri', 'Statystyki nauki'),
    freeValue: LP('Основная', 'Basic', 'Основна', 'Básica', 'Básica', 'Cơ bản', 'Dasar', 'Temel', 'Podstawowe'),
    plusValue: LP('Подробная', 'Detailed', 'Докладна', 'Detallada', 'Detalhada', 'Chi tiết', 'Terperinci', 'Ayrıntılı', 'Szczegółowe'),
  },
] as const;

export const PAYWALL_COMPARISON_BENEFIT_IDS = [
  'saved_phrases',
  'own_cards',
  'own_packs',
  'flashcard_training',
  'dialogue_replies',
  'text_dialogue_review',
  'pronunciation',
  'course_lessons',
  'combined_lesson',
  'study_languages',
  'mistake_practice',
  'ai_mistake_explain',
  'energy',
  'streak_freezes',
  'detailed_stats',
] as const;

export const PAYWALL_MAIN_BENEFIT_IDS = [
  'cards_bundle',
  'course_lessons',
  'ai_mistake_explain',
  'energy',
  'streak_freezes',
] as const;

const HIGHLIGHTS: readonly Benefit[] = [
  {
    id: 'cards_bundle', icon: 'layers-outline',
    label: LP('Карточки без ограничений', 'Cards without limits', 'Картки без обмежень', 'Tarjetas sin límites', 'Cartões sem limites', 'Thẻ không giới hạn', 'Kartu tanpa batas', 'Sınırsız kartlar', 'Karty bez limitów'),
    freeValue: LP('', '', '', '', '', '', '', '', ''),
    plusValue: LP('Сохраняй, создавай и тренируйся', 'Save, create and train', 'Зберігай, створюй і тренуйся', 'Guarda, crea y entrena', 'Salve, crie e treine', 'Lưu, tạo và luyện tập', 'Simpan, buat, dan berlatih', 'Kaydet, oluştur ve çalış', 'Zapisuj, twórz i ćwicz'),
  },
  BENEFITS.find((benefit) => benefit.id === 'course_lessons')!,
  BENEFITS.find((benefit) => benefit.id === 'ai_mistake_explain')!,
  BENEFITS.find((benefit) => benefit.id === 'energy')!,
  // зачем (B7b): пятая строка вместо «Сценариев диалогов» — подтверждённая кодом
  // (app/premium_freeze_allowance.ts, PREMIUM_FREE_FREEZES_PER_MONTH = 3).
  BENEFITS.find((benefit) => benefit.id === 'streak_freezes')!,
] as const;

type GroupId = 'cards' | 'dialogues' | 'course' | 'personal' | 'stats';
const GROUP_TITLES: Readonly<Record<GroupId, Localized>> = {
  cards: LP('Карточки и наборы', 'Cards and packs', 'Картки та набори', 'Tarjetas y sets', 'Cartões e conjuntos', 'Thẻ và bộ thẻ', 'Kartu dan paket', 'Kartlar ve setler', 'Karty i zestawy'),
  dialogues: LP('Диалоги и произношение', 'Dialogues and pronunciation', 'Діалоги та вимова', 'Diálogos y pronunciación', 'Diálogos e pronúncia', 'Hội thoại và phát âm', 'Dialog dan pengucapan', 'Diyaloglar ve telaffuz', 'Dialogi i wymowa'),
  course: LP('Курс и языки', 'Course and languages', 'Курс і мови', 'Curso e idiomas', 'Curso e idiomas', 'Khóa học và ngôn ngữ', 'Kursus dan bahasa', 'Kurs ve diller', 'Kurs i języki'),
  personal: LP('Занятия и серия', 'Sessions and streak', 'Заняття та серія', 'Sesiones y racha', 'Sessões e sequência', 'Buổi học và chuỗi', 'Sesi dan rentetan', 'Dersler ve seri', 'Sesje i seria'),
  stats: LP('Статистика', 'Statistics', 'Статистика', 'Estadísticas', 'Estatísticas', 'Thống kê', 'Statistik', 'İstatistikler', 'Statystyki'),
};
// Группы как в макете paywall-review-data.js: заголовок ставится перед первой строкой группы.
const GROUP_OF: Readonly<Record<(typeof PAYWALL_COMPARISON_BENEFIT_IDS)[number], GroupId>> = {
  saved_phrases: 'cards', own_cards: 'cards', own_packs: 'cards', flashcard_training: 'cards',
  dialogue_replies: 'dialogues', text_dialogue_review: 'dialogues', pronunciation: 'dialogues',
  course_lessons: 'course', combined_lesson: 'course', study_languages: 'course', mistake_practice: 'course', ai_mistake_explain: 'course',
  energy: 'personal', streak_freezes: 'personal',
  detailed_stats: 'stats',
};

const UI = {
  all: LP('Все преимущества', 'All benefits', 'Усі переваги', 'Todas las ventajas', 'Todos os benefícios', 'Tất cả lợi ích', 'Semua manfaat', 'Tüm avantajlar', 'Wszystkie korzyści'),
  hide: LP('Скрыть преимущества', 'Hide benefits', 'Сховати переваги', 'Ocultar ventajas', 'Ocultar benefícios', 'Ẩn lợi ích', 'Sembunyikan manfaat', 'Avantajları gizle', 'Ukryj korzyści'),
  free: LP('Free', 'Free', 'Free', 'Free', 'Free', 'Free', 'Free', 'Free', 'Free'),
  plus: LP('Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus', 'Plus'),
};

function localized(copy: Localized, lang: Lang): string {
  return copy[lang] ?? copy.en;
}

function GlassSheen({ g }: { g: GlassTokens }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {Platform.OS === 'ios' ? <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} /> : null}
    <LinearGradient colors={[`${g.lightTint.slice(0, 7)}24`, `${g.lightTint.slice(0, 7)}08`, 'transparent']} style={S.sheen} />
  </View>;
}

function BenefitRow({ benefit, lang, g, comparison }: {
  benefit: Benefit;
  lang: Lang;
  g: GlassTokens;
  comparison: boolean;
}) {
  return <View style={[S.row, { backgroundColor: g.card }]}>
    <GlassSheen g={g} />
    <View style={[S.icon, { backgroundColor: g.opaqueControl }]}>
      <Ionicons name={benefit.icon} size={20} color={g.text} />
    </View>
    <View style={S.copy}>
      <Text style={[S.label, { color: g.text }]}>{localized(benefit.label, lang)}</Text>
      {comparison ? <View style={S.values}>
        <View style={S.valueLine}><Text style={[S.valuePrefix, { color: g.mutedText }]}>{localized(UI.free, lang)}</Text><Text style={[S.valueText, { color: g.secondary }]}>{localized(benefit.freeValue, lang)}</Text></View>
        <View style={S.valueLine}><Text style={[S.valuePrefix, { color: g.text }]}>{localized(UI.plus, lang)}</Text><Text style={[S.valueText, { color: g.text }]}>{localized(benefit.plusValue, lang)}</Text></View>
      </View> : <Text style={[S.detail, { color: g.secondary }]}>{localized(benefit.plusValue, lang)}</Text>}
      {comparison && benefit.note ? <Text style={[S.note, { color: g.mutedText }]}>{localized(benefit.note, lang)}</Text> : null}
    </View>
    <Ionicons name="checkmark" size={18} color={g.secondary} />
  </View>;
}

export default function PaywallBenefitComparison({ lang, tokens: g }: { lang: Lang; tokens: GlassTokens }) {
  const [expanded, setExpanded] = useState(false);
  const main = useMemo(
    () => PAYWALL_MAIN_BENEFIT_IDS.map((id) => HIGHLIGHTS.find((benefit) => benefit.id === id)).filter((benefit): benefit is Benefit => !!benefit),
    [],
  );
  const comparison = useMemo(
    () => PAYWALL_COMPARISON_BENEFIT_IDS.map((id) => BENEFITS.find((benefit) => benefit.id === id)).filter((benefit): benefit is Benefit => !!benefit),
    [],
  );

  return <>
    {main.map((benefit) => <BenefitRow key={benefit.id} benefit={benefit} lang={lang} g={g} comparison={false} />)}
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={() => setExpanded((current) => !current)}
      style={S.toggle}
    >
      <Text style={[S.toggleText, { color: g.secondary }]}>{localized(expanded ? UI.hide : UI.all, lang)}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={g.secondary} />
    </Pressable>
    {expanded ? <View accessibilityRole="list">
      {comparison.map((benefit, index) => {
        const group = GROUP_OF[benefit.id as keyof typeof GROUP_OF];
        const startsGroup = index === 0 || GROUP_OF[comparison[index - 1].id as keyof typeof GROUP_OF] !== group;
        return <View key={benefit.id}>
          {startsGroup ? <Text accessibilityRole="header" style={[S.group, { color: g.secondary }]}>{localized(GROUP_TITLES[group], lang)}</Text> : null}
          <View accessibilityRole="listitem"><BenefitRow benefit={benefit} lang={lang} g={g} comparison /></View>
        </View>;
      })}
    </View> : null}
  </>;
}

const S = StyleSheet.create({
  group: { marginTop: 22, marginBottom: 2, fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 13, paddingVertical: 11, marginTop: 8, borderRadius: 17, overflow: 'hidden' },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 74 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  detail: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  values: { marginTop: 5, gap: 4 },
  valueLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  valuePrefix: { width: 32, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  valueText: { flex: 1, fontSize: 12, lineHeight: 16 },
  note: { marginTop: 5, fontSize: 11, lineHeight: 15 },
  toggle: { minHeight: 48, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  toggleText: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
