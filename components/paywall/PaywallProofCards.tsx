// ════════════════════════════════════════════════════════════════════════════
// PaywallProofCards.tsx — «галерея доказательств» (ниже фолда, для сомневающихся):
//   MirrorCard      — «Уже твоё»: зеркало прогресса (endowment, из v1)
//   PercentileCard  — честное соцдоказательство из СВОИХ данных юзера
//   CompareCard     — сжатое сравнение Free → Premium (5 строк, читаемый шрифт)
//   FaqCard         — 3 вопроса, бьющие в страх №1 («забуду отменить»)
// Отзывы намеренно НЕ здесь: рендер только verified-отзывов через
// paywall_testimonials (пока их нет — секции нет; не выдумываем).
// ════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { triLang, type Lang } from '../../constants/i18n';
import type { ProgressMirror } from '../../app/paywall_progress_mirror';
import type { PaywallChrome } from './paywallShared';
import { hapticTap } from '../../hooks/use-haptics';

// ── обёртка-карточка ──────────────────────────────────────────────────────────
function ProofCard({ title, chrome, children }: { title: string; chrome: PaywallChrome; children: React.ReactNode }) {
  return (
    <View style={[S.card, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
      <Text style={[S.cardTitle, { color: chrome.textMuted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

// ── «Уже твоё» ────────────────────────────────────────────────────────────────
export function MirrorCard({ lang, chrome, mirror }: { lang: Lang; chrome: PaywallChrome; mirror: ProgressMirror }) {
  const stats: { value: number; label: string }[] = [];
  if (mirror.phrases > 0) stats.push({ value: mirror.phrases, label: triLang(lang, { ru: 'фраз', uk: 'фраз', es: 'frases' }) });
  if (mirror.words > 0) stats.push({ value: mirror.words, label: triLang(lang, { ru: 'слов', uk: 'слів', es: 'palabras' }) });
  if (mirror.xp > 0) stats.push({ value: mirror.xp, label: 'XP' });
  if (mirror.streak > 0) stats.push({ value: mirror.streak, label: triLang(lang, { ru: 'дн. серия', uk: 'дн. серія', es: 'días racha' }) });
  if (!stats.length) return null;
  return (
    <ProofCard title={triLang(lang, { ru: 'Уже твоё', uk: 'Вже твоє', es: 'Ya es tuyo' })} chrome={chrome}>
      <View style={S.mirrorRow}>
        {stats.slice(0, 4).map((s) => (
          <View key={s.label} style={[S.mirrorStat, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
            <Text style={[S.mirrorValue, { color: chrome.textPrimary }]}>{s.value.toLocaleString('ru-RU')}</Text>
            <Text style={[S.mirrorLabel, { color: chrome.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[S.mirrorLine, { color: chrome.textPrimary }]}>
        {triLang(lang, { ru: 'Premium держит этот темп.', uk: 'Premium тримає цей темп.', es: 'Premium mantiene este ritmo.' })}
      </Text>
    </ProofCard>
  );
}

// ── перцентиль ────────────────────────────────────────────────────────────────
export function PercentileCard({ lang, chrome, line }: { lang: Lang; chrome: PaywallChrome; line: string }) {
  return (
    <ProofCard title={triLang(lang, { ru: 'Твоё место', uk: 'Твоє місце', es: 'Tu lugar' })} chrome={chrome}>
      <View style={S.pctRow}>
        <Ionicons name="trending-up" size={22} color={chrome.textMuted} />
        <Text style={[S.pctText, { color: chrome.textPrimary }]}>{line}</Text>
      </View>
    </ProofCard>
  );
}

// ── сравнение Free → Premium (копии = реальные лимиты + самые ценные фичи) ─────
type CompareCell = Record<Lang, string>;
type CompareRow = { t: CompareCell; free: CompareCell; prem: CompareCell };
const COMPARE_ROWS: CompareRow[] = [
  // Самые ценные фичи — сверху (умный разбор, диалоги, личный план, произношение+озвучка).
  {
    t: { ru: 'Умный разбор ошибок', uk: 'Розумний розбір помилок', es: 'Análisis de errores', 'pt-BR': 'Análise de erros', vi: 'Phân tích lỗi thông minh', id: 'Analisis kesalahan', tr: 'Akıllı hata analizi', pl: 'Inteligentna analiza błędów' },
    free: { ru: 'Только ответ', uk: 'Лише відповідь', es: 'Solo la respuesta', 'pt-BR': 'Só a resposta', vi: 'Chỉ đáp án', id: 'Hanya jawaban', tr: 'Sadece cevap', pl: 'Tylko odpowiedź' },
    prem: { ru: 'Разбор каждой ошибки', uk: 'Розбір кожної помилки', es: 'Explica cada error', 'pt-BR': 'Explica cada erro', vi: 'Giải thích từng lỗi', id: 'Jelaskan tiap kesalahan', tr: 'Her hatayı açıklar', pl: 'Wyjaśnia każdy błąd' },
  },
  {
    t: { ru: 'Диалоги с ИИ', uk: 'Діалоги з ШІ', es: 'Diálogos con IA', 'pt-BR': 'Diálogos com IA', vi: 'Hội thoại với AI', id: 'Dialog dengan AI', tr: 'Yapay zekâ ile diyalog', pl: 'Dialogi z AI' },
    free: { ru: '1 раз попробовать', uk: '1 раз спробувати', es: '1 prueba', 'pt-BR': '1 teste', vi: 'Thử 1 lần', id: 'Coba 1 kali', tr: '1 deneme', pl: '1 próba' },
    prem: { ru: 'Без ограничений', uk: 'Без обмежень', es: 'Sin límites', 'pt-BR': 'Sem limites', vi: 'Không giới hạn', id: 'Tanpa batas', tr: 'Sınırsız', pl: 'Bez limitów' },
  },
  {
    t: { ru: 'Личный план', uk: 'Особистий план', es: 'Plan personal', 'pt-BR': 'Plano pessoal', vi: 'Kế hoạch cá nhân', id: 'Rencana pribadi', tr: 'Kişisel plan', pl: 'Plan osobisty' },
    free: { ru: 'Недоступен', uk: 'Недоступний', es: 'No disponible', 'pt-BR': 'Indisponível', vi: 'Không có', id: 'Tidak tersedia', tr: 'Yok', pl: 'Niedostępny' },
    prem: { ru: 'План под твою цель', uk: 'План під твою ціль', es: 'Plan a tu medida', 'pt-BR': 'Plano sob medida', vi: 'Lộ trình riêng', id: 'Sesuai targetmu', tr: 'Hedefine özel plan', pl: 'Plan pod twój cel' },
  },
  {
    t: { ru: 'Произношение и озвучка', uk: 'Вимова й озвучення', es: 'Pronunciación y voz', 'pt-BR': 'Pronúncia e voz', vi: 'Phát âm và lồng tiếng', id: 'Pelafalan dan suara', tr: 'Telaffuz ve seslendirme', pl: 'Wymowa i lektor' },
    free: { ru: 'Ограничено', uk: 'Обмежено', es: 'Limitado', 'pt-BR': 'Limitado', vi: 'Hạn chế', id: 'Terbatas', tr: 'Sınırlı', pl: 'Ograniczone' },
    prem: { ru: 'Оценка речи + живой голос', uk: 'Оцінка мовлення + живий голос', es: 'Evalúa tu voz + voz real', 'pt-BR': 'Avalia sua fala + voz real', vi: 'Chấm phát âm + giọng thật', id: 'Nilai ucapan + suara asli', tr: 'Konuşma puanı + gerçek ses', pl: 'Ocena mowy + żywy głos' },
  },
  {
    t: { ru: 'Энергия', uk: 'Енергія', es: 'Energía', 'pt-BR': 'Energia', vi: 'Năng lượng', id: 'Energi', tr: 'Enerji', pl: 'Energia' },
    free: { ru: '+1 раз в ~10 мин', uk: '+1 раз на ~10 хв', es: '+1 cada ~10 min', 'pt-BR': '+1 a cada ~10 min', vi: '+1 mỗi ~10 phút', id: '+1 tiap ~10 mnt', tr: '~10 dakikada +1', pl: '+1 co ~10 min' },
    prem: { ru: 'Не заканчивается', uk: 'Не закінчується', es: 'No se agota', 'pt-BR': 'Não acaba', vi: 'Không cạn', id: 'Tak habis', tr: 'Bitmez', pl: 'Nie kończy się' },
  },
  {
    t: { ru: 'Уроки', uk: 'Уроки', es: 'Lecciones', 'pt-BR': 'Lições', vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje' },
    free: { ru: 'Уроки 1–8', uk: 'Уроки 1–8', es: 'Lecciones 1–8', 'pt-BR': 'Lições 1–8', vi: 'Bài 1–8', id: 'Pelajaran 1–8', tr: 'Ders 1–8', pl: 'Lekcje 1–8' },
    prem: { ru: 'Все уроки уровня', uk: 'Усі уроки рівня', es: 'Todas las del nivel', 'pt-BR': 'Todas do nível', vi: 'Mọi bài của cấp độ', id: 'Semua di level', tr: 'Seviyedeki tüm dersler', pl: 'Wszystkie lekcje poziomu' },
  },
  {
    t: { ru: 'Квизы', uk: 'Квізи', es: 'Quizzes', 'pt-BR': 'Quizzes', vi: 'Quiz', id: 'Kuis', tr: 'Quizler', pl: 'Quizy' },
    free: { ru: 'Только Easy', uk: 'Лише Easy', es: 'Solo Easy', 'pt-BR': 'Só Easy', vi: 'Chỉ Easy', id: 'Hanya Easy', tr: 'Sadece Easy', pl: 'Tylko Easy' },
    prem: { ru: 'Все уровни', uk: 'Усі рівні', es: 'Todos los niveles', 'pt-BR': 'Todos os níveis', vi: 'Mọi cấp độ', id: 'Semua level', tr: 'Tüm seviyeler', pl: 'Wszystkie poziomy' },
  },
  {
    t: { ru: 'Карточки', uk: 'Картки', es: 'Tarjetas', 'pt-BR': 'Cartões', vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Fiszki' },
    free: { ru: 'До 20 сохранённых', uk: 'До 20 збережених', es: 'Hasta 20 guardadas', 'pt-BR': 'Até 20 salvos', vi: 'Tối đa 20 thẻ', id: 'Maks. 20 tersimpan', tr: 'En çok 20 kayıt', pl: 'Do 20 zapisanych' },
    prem: { ru: 'Без ограничений', uk: 'Без обмежень', es: 'Sin límites', 'pt-BR': 'Sem limites', vi: 'Không giới hạn', id: 'Tanpa batas', tr: 'Sınırsız', pl: 'Bez limitów' },
  },
  {
    t: { ru: 'Серия', uk: 'Серія', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Rentetan', tr: 'Seri', pl: 'Seria' },
    free: { ru: 'Сгорает за пропуск', uk: 'Згорає за пропуск', es: 'Se pierde al fallar un día', 'pt-BR': 'Some ao faltar um dia', vi: 'Mất khi bỏ lỡ', id: 'Hangus jika bolong', tr: 'Kaçırınca sıfırlanır', pl: 'Znika po przerwie' },
    prem: { ru: 'Заморозка серии', uk: 'Заморозка серії', es: 'Protección de racha', 'pt-BR': 'Proteção de sequência', vi: 'Đóng băng chuỗi', id: 'Bekukan rentetan', tr: 'Seri dondurma', pl: 'Zamrożenie serii' },
  },
];

export function CompareCard({ lang, chrome }: { lang: Lang; chrome: PaywallChrome }) {
  const pick = (d: CompareCell) => triLang(lang, d);
  return (
    <ProofCard title={triLang(lang, { ru: 'Что меняется с Premium', uk: 'Що змінюється з Premium', es: 'Qué cambia con Premium' })} chrome={chrome}>
      {COMPARE_ROWS.map((row, i) => (
        <View key={row.t.ru} style={[S.cmpRow, i < COMPARE_ROWS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: chrome.cardBorder }]}>
          <View style={S.cmpLeft}>
            <Text style={[S.cmpTitle, { color: chrome.textPrimary }]} numberOfLines={2}>{pick(row.t)}</Text>
            <Text style={[S.cmpFree, { color: chrome.textMuted }]} numberOfLines={2}>{pick(row.free)}</Text>
          </View>
          <Ionicons name="arrow-forward" size={12} color={chrome.textMuted} style={S.cmpArrow} />
          <Text style={[S.cmpPrem, { color: chrome.tc.heroAccent }]} numberOfLines={2}>{pick(row.prem)}</Text>
        </View>
      ))}
    </ProofCard>
  );
}

// ── FAQ: 3 вопроса прямо в страх «забуду отменить» ────────────────────────────
export function FaqCard({ lang, chrome, trialDays, priceLine }: {
  lang: Lang;
  chrome: PaywallChrome;
  trialDays: number | null;
  /** «2 990 ₽ за год» — для честного ответа про списание. */
  priceLine: string;
}) {
  const [open, setOpen] = useState(0);
  const qa: { q: string; a: string }[] = [
    ...(trialDays ? [{
      q: triLang(lang, { ru: 'Что будет после триала?', uk: 'Що буде після тріалу?', es: '¿Qué pasa tras la prueba?' }),
      a: triLang(lang, {
        ru: `${trialDays} дн. всё открыто бесплатно. За день до конца пришлём пуш. Спишется только если не отменишь — ${priceLine}.`,
        uk: `${trialDays} дн. усе відкрито безкоштовно. За день до кінця надішлемо пуш. Спишеться лише якщо не скасуєш — ${priceLine}.`,
        es: `${trialDays} días todo gratis. Un día antes te avisamos. Solo se cobra si no cancelas: ${priceLine}.`,
      }),
    }] : []),
    {
      q: triLang(lang, { ru: 'Как отменить?', uk: 'Як скасувати?', es: '¿Cómo cancelo?' }),
      a: triLang(lang, {
        ru: 'Настройки телефона → Подписки → Phraseman → Отменить. Две минуты, без писем и звонков. Доступ останется до конца оплаченного срока.',
        uk: 'Налаштування телефона → Підписки → Phraseman → Скасувати. Дві хвилини, без листів і дзвінків. Доступ лишиться до кінця оплаченого строку.',
        es: 'Ajustes del teléfono → Suscripciones → Phraseman → Cancelar. Dos minutos, sin correos ni llamadas. El acceso sigue hasta el final del período pagado.',
      }),
    },
    {
      q: triLang(lang, { ru: 'Что входит в Premium?', uk: 'Що входить у Premium?', es: '¿Qué incluye Premium?' }),
      a: triLang(lang, {
        ru: 'Все уроки и уровни, безлимит энергии и карточек, все квизы, заморозка серии, занятия офлайн.',
        uk: 'Усі уроки й рівні, безліміт енергії та карток, усі квізи, заморозка серії, заняття офлайн.',
        es: 'Todas las lecciones y niveles, energía y tarjetas sin límite, todos los quizzes, protección de racha y modo offline.',
      }),
    },
  ];
  return (
    <ProofCard title={triLang(lang, { ru: 'Частые вопросы', uk: 'Часті питання', es: 'Preguntas frecuentes' })} chrome={chrome}>
      {qa.map((item, i) => {
        const isOpen = open === i;
        return (
          <TouchableOpacity
            key={item.q}
            activeOpacity={0.7}
            onPress={() => {
              hapticTap();
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setOpen(isOpen ? -1 : i);
            }}
            style={[S.faqQ, i < qa.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: chrome.cardBorder }]}
          >
            <View style={S.faqHead}>
              <Text style={[S.faqQText, { color: chrome.textPrimary }]}>{item.q}</Text>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={13} color={chrome.textMuted} />
            </View>
            {isOpen && <Text style={[S.faqA, { color: chrome.textMuted }]}>{item.a}</Text>}
          </TouchableOpacity>
        );
      })}
    </ProofCard>
  );
}

const S = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 13, marginTop: 12 },
  cardTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },

  mirrorRow: { flexDirection: 'row', gap: 8 },
  mirrorStat: { flex: 1, borderRadius: 11, borderWidth: 1, paddingVertical: 9, alignItems: 'center' },
  mirrorValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  mirrorLabel: { fontSize: 9.5, marginTop: 2 },
  mirrorLine: { fontSize: 12, marginTop: 10, lineHeight: 17 },

  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pctText: { flex: 1, fontSize: 12.5, lineHeight: 18 },

  cmpRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8.5, gap: 8 },
  cmpLeft: { flex: 1, minWidth: 0 },
  cmpTitle: { fontSize: 12, fontWeight: '700' },
  cmpFree: { fontSize: 10.5, marginTop: 1 },
  cmpArrow: { flexShrink: 0 },
  cmpPrem: { width: 122, textAlign: 'right', fontSize: 11, fontWeight: '700', lineHeight: 14 },

  faqQ: { paddingVertical: 10 },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  faqQText: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  faqA: { fontSize: 11.5, lineHeight: 16.5, marginTop: 7 },
});
