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

/**
 * Собирает персональную строку из того, что реально известно о пользователе.
 * Деградирует мягко: нет имени → начинаем с прогресса; нет ни имени, ни прогресса,
 * ни цели → компонент не рендерится (return null), пейвол просто остаётся как был.
 */
export default function PaywallGreetingLine({ lang, chrome, profile, mirror }: PaywallGreetingLineProps) {
  const name = profile?.name?.trim() || '';
  const goalLabel = profile?.goalLabel || '';
  const hasProgress = !!mirror && (mirror.phrases > 0 || mirror.streak > 0);

  // Нечего сказать персонального — не показываем строку вовсе.
  if (!name && !goalLabel && !hasProgress) return null;

  const accent = chrome.tc.heroAccent;

  // ── Часть 1: прогресс с обращением по имени ──────────────────────────────────
  // «{Имя}, ты уже выучил(а) N фраз и держишь серию M дней — Premium не даст потерять.»
  let progressLine: string | null = null;
  if (hasProgress && mirror) {
    const phrasesStr =
      mirror.phrases > 0
        ? `${mirror.phrases} ${triLang(lang, {
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
      ru: '— Plus не даст это потерять.',
      uk: '— Plus не дасть це втратити.',
      es: '— Plus no te dejará perderlo.',
      'pt-BR': '— o Plus não deixa você perder isso.',
      vi: '— Plus sẽ không để bạn mất điều đó.',
      id: '— Plus tak akan membiarkanmu kehilangan itu.',
      tr: '— Plus bunu kaybetmene izin vermez.',
      pl: '— Plus nie pozwoli tego stracić.',
    });
    progressLine = `${lead} ${earned} ${tail}`;
  }

  // ── Часть 2: цель (если её нет в прогресс-строке выше — отдельной строкой) ────
  // «Твоя цель — {goalLabel}. Premium ведёт к ней быстрее.»
  let goalLine: string | null = null;
  if (goalLabel) {
    const lead =
      !progressLine && name
        ? `${name}, ${triLang(lang, {
            ru: 'твоя цель —', uk: 'твоя ціль —', es: 'tu meta es', 'pt-BR': 'sua meta é',
            vi: 'mục tiêu của bạn là', id: 'tujuanmu adalah', tr: 'hedefin', pl: 'twój cel to',
          })}`
        : triLang(lang, {
            ru: 'Твоя цель —', uk: 'Твоя ціль —', es: 'Tu meta es', 'pt-BR': 'Sua meta é',
            vi: 'Mục tiêu của bạn là', id: 'Tujuanmu adalah', tr: 'Hedefin', pl: 'Twój cel to',
          });
    const tail = triLang(lang, {
      ru: '. Plus ведёт к ней быстрее.',
      uk: '. Plus веде до неї швидше.',
      es: '. Plus te lleva más rápido.',
      'pt-BR': '. O Plus te leva mais rápido.',
      vi: '. Plus đưa bạn đến đó nhanh hơn.',
      id: '. Plus membawamu ke sana lebih cepat.',
      tr: '. Plus oraya daha hızlı götürür.',
      pl: '. Plus prowadzi do niego szybciej.',
    });
    goalLine = `${lead} ${goalLabel}${tail}`;
  }

  // Если есть и прогресс, и цель — показываем обе строки (прогресс — главная).
  const lines = [progressLine, goalLine].filter(Boolean) as string[];
  if (!lines.length) return null;

  return (
    <View style={[S.wrap, { backgroundColor: `${accent}12`, borderColor: `${accent}26` }]}>
      <Ionicons name="sparkles" size={15} color={accent} style={S.icon} />
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
    gap: 9,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: 12,
  },
  icon: { marginTop: 1, flexShrink: 0 },
  textCol: { flex: 1, gap: 4 },
  primary: { fontSize: 13.5, fontWeight: '700', lineHeight: 18.5, letterSpacing: -0.2 },
  secondary: { fontSize: 12, lineHeight: 16.5 },
});
