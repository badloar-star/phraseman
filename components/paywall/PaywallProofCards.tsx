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

// ── сравнение Free → Premium (5 строк; копии = реальные лимиты) ───────────────
type CompareRow = { t: Record<'ru' | 'uk' | 'es', string>; free: Record<'ru' | 'uk' | 'es', string>; prem: Record<'ru' | 'uk' | 'es', string> };
const COMPARE_ROWS: CompareRow[] = [
  {
    t: { ru: 'Энергия', uk: 'Енергія', es: 'Energía' },
    free: { ru: '+1 раз в ~10 мин', uk: '+1 раз на ~10 хв', es: '+1 cada ~10 min' },
    prem: { ru: 'Не заканчивается', uk: 'Не закінчується', es: 'No se agota' },
  },
  {
    t: { ru: 'Уроки', uk: 'Уроки', es: 'Lecciones' },
    free: { ru: 'Уроки 1–8', uk: 'Уроки 1–8', es: 'Lecciones 1–8' },
    prem: { ru: 'Все уроки уровня', uk: 'Усі уроки рівня', es: 'Todas las del nivel' },
  },
  {
    t: { ru: 'Квизы', uk: 'Квізи', es: 'Quizzes' },
    free: { ru: 'Только Easy', uk: 'Лише Easy', es: 'Solo Easy' },
    prem: { ru: 'Все уровни', uk: 'Усі рівні', es: 'Todos los niveles' },
  },
  {
    t: { ru: 'Карточки', uk: 'Картки', es: 'Tarjetas' },
    free: { ru: 'До 20 сохранённых', uk: 'До 20 збережених', es: 'Hasta 20 guardadas' },
    prem: { ru: 'Без ограничений', uk: 'Без обмежень', es: 'Sin límites' },
  },
  {
    t: { ru: 'Серия', uk: 'Серія', es: 'Racha' },
    free: { ru: 'Сгорает за пропуск', uk: 'Згорає за пропуск', es: 'Se pierde al fallar un día' },
    prem: { ru: 'Заморозка серии', uk: 'Заморозка серії', es: 'Protección de racha' },
  },
];

export function CompareCard({ lang, chrome }: { lang: Lang; chrome: PaywallChrome }) {
  const pick = (d: Record<'ru' | 'uk' | 'es', string>) => triLang(lang, d);
  return (
    <ProofCard title={triLang(lang, { ru: 'Что меняется с Premium', uk: 'Що змінюється з Premium', es: 'Qué cambia con Premium' })} chrome={chrome}>
      {COMPARE_ROWS.map((row, i) => (
        <View key={row.t.ru} style={[S.cmpRow, i < COMPARE_ROWS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: chrome.cardBorder }]}>
          <View style={S.cmpLeft}>
            <Text style={[S.cmpTitle, { color: chrome.textPrimary }]} numberOfLines={1}>{pick(row.t)}</Text>
            <Text style={[S.cmpFree, { color: chrome.textMuted }]} numberOfLines={1}>{pick(row.free)}</Text>
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
