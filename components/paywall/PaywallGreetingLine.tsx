// ════════════════════════════════════════════════════════════════════════════
// PaywallGreetingLine.tsx — персональная строка-обращение для пейвола.
//
// Чинит «протечку персонализации»: переиспользуемые A/B/C-пейволы раньше были
// обезличены. Эта строка обращается по ИМЕНИ (как подписался юзер), напоминает
// его ЦЕЛЬ и его ПРОГРЕСС — «приложение тебя понимает».
//
// Намеренно вынесено в отдельный файл (не в PaywallProofCards/paywallShared),
// чтобы не трогать общие карточки и единообразно работать во всех вариантах.
// Чистый презентационный компонент: ничего не читает сам, всё приходит в props.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallChrome } from './paywallShared';
import type { PaywallProfile } from '../../app/paywall_profile';
import type { ProgressMirror } from '../../app/paywall_progress_mirror';

interface PaywallGreetingLineProps {
  lang: Lang;
  chrome: PaywallChrome;
  profile: PaywallProfile | null;
  mirror: ProgressMirror | null;
}

function compactPaywallNumber(value: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  if (n < 1000) return String(n);
  const thousands = n / 1000;
  const rounded = thousands < 10 ? Math.round(thousands * 10) / 10 : Math.round(thousands);
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}K`;
}

/**
 * Собирает персональную строку из того, что реально известно о пользователе.
 * Деградирует мягко: нет имени → начинаем с прогресса; нет ни имени, ни прогресса,
 * ни цели → компонент не рендерится (return null), пейвол просто остаётся как был.
 */
export default function PaywallGreetingLine({ lang, chrome, profile, mirror }: PaywallGreetingLineProps) {
  const name = profile?.name?.trim() || '';
  const hasProgress = !!mirror && (mirror.phrases > 0 || mirror.streak > 0);

  // Нечего сказать персонального — не показываем строку вовсе.
  if (!name && !hasProgress) return null;

  const accent = chrome.tc.heroAccent;

  // ── Часть 1: прогресс с обращением по имени ──────────────────────────────────
  // «{Имя}, ты уже выучил(а) N фраз и держишь серию M дней — Premium не даст потерять.»
  let progressLine: string | null = null;
  if (hasProgress && mirror) {
    const phrasesStr =
      mirror.phrases > 0
        ? `${compactPaywallNumber(mirror.phrases)} ${triLang(lang, {
            ru: 'фраз', uk: 'фраз', es: 'frases', 'pt-BR': 'frases',
            vi: 'cụm từ', id: 'frasa', tr: 'ifade', pl: 'fraz',
          })}`
        : '';
    const streakStr =
      mirror.streak > 0
        ? `${mirror.streak} ${triLang(lang, {
            ru: 'дн. серия', uk: 'дн. серія', es: 'días de racha', 'pt-BR': 'dias seguidos',
            vi: 'ngày liên tiếp', id: 'hari beruntun', tr: 'günlük seri', pl: 'dni serii',
          })}`
        : '';
    const earned = [phrasesStr, streakStr].filter(Boolean).join(
      triLang(lang, {
        ru: ' и ', uk: ' і ', es: ' y ', 'pt-BR': ' e ',
        vi: ' và ', id: ' dan ', tr: ' ve ', pl: ' i ',
      }),
    );
    const lead = name
      ? `${name}, ${triLang(lang, {
          ru: 'у тебя уже', uk: 'у тебе вже', es: 'ya tienes', 'pt-BR': 'você já tem',
          vi: 'bạn đã có', id: 'kamu sudah punya', tr: 'şimdiden', pl: 'masz już',
        })}`
      : triLang(lang, {
          ru: 'У тебя уже', uk: 'У тебе вже', es: 'Ya tienes', 'pt-BR': 'Você já tem',
          vi: 'Bạn đã có', id: 'Kamu sudah punya', tr: 'Şimdiden', pl: 'Masz już',
        });
    const tail = triLang(lang, {
      ru: '— Plus убирает лимиты, чтобы практиковаться без пауз.',
      uk: '— Plus прибирає ліміти, щоб практикуватися без пауз.',
      es: '— Plus quita límites para practicar sin pausas.',
      'pt-BR': '— o Plus remove limites para praticar sem pausas.',
      vi: '— Plus gỡ giới hạn để bạn luyện tập không gián đoạn.',
      id: '— Plus menghapus batas agar kamu bisa berlatih tanpa jeda.',
      tr: '— Plus sınırları kaldırır, ara vermeden pratik yaptırır.',
      pl: '— Plus usuwa limity, żeby ćwiczyć bez przerw.',
    });
    progressLine = `${lead} ${earned} ${tail}`;
  }

  const lines = [progressLine].filter(Boolean) as string[];
  if (!lines.length) return null;

  return (
    <View style={[S.wrap, { backgroundColor: `${accent}12`, borderColor: `${accent}26` }]}>
      <Ionicons name="sparkles" size={17} color={accent} style={S.icon} />
      <View style={S.textCol}>
        {lines.map((line, i) => (
          <Text
            key={i}
            style={[
              i === 0 ? S.primary : S.secondary,
              { color: i === 0 ? chrome.textPrimary : chrome.textMuted },
            ]}
          >
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 0,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginTop: 14,
  },
  icon: { marginTop: 1, flexShrink: 0 },
  textCol: { flex: 1, gap: 5 },
  primary: { fontSize: 15, fontWeight: '800', lineHeight: 20.5, letterSpacing: 0 },
  secondary: { fontSize: 13.5, lineHeight: 18.5 },
});
