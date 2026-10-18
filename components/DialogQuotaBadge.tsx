import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { triLang, type Lang } from '../constants/i18n';
import { useV2Palette } from './v2/useV2Palette';
import { useV2GlassStyle } from './v2/V2Glass';

type DialogQuotaBadgeProps = Readonly<{
  lang: Lang;
  /** null — остаток телефону неизвестен (зеркала нет / прошлый месяц): «—/30», не обещаем полный лимит (Ревизор 3.45). */
  remaining: number | null;
  limit: number;
  /** Серверная граница месяца (UTC). Нет значения — дату не показываем, не выдумываем. */
  resetAtMs?: number | null;
  /**
   * 'compact' — «N/30» для угла шапки сессии (там нет места под текст).
   * 'monthly' — «N из 30 в этом месяце · сброс 1 октября» для каталога.
   */
  variant?: 'compact' | 'monthly';
  testID?: string;
}>;

const QUOTA_DATE_LOCALE: Readonly<Record<Lang, string>> = Object.freeze({
  ru: 'ru-RU', uk: 'uk-UA', en: 'en-GB', es: 'es-ES', 'pt-BR': 'pt-BR',
  vi: 'vi-VN', id: 'id-ID', tr: 'tr-TR', pl: 'pl-PL',
});

/**
 * зачем (D111, 2026-09-30): лимит Free в Диалогах — 30 ответов в календарный
 * месяц UTC. Дата сброса приходит от сервера (resetAtMs = 1-е число 00:00 UTC),
 * клиент её только форматирует — в UTC, чтобы «1 октября» не превратилось в
 * «30 сентября» у человека западнее Гринвича.
 */
export function formatAiDialogQuotaResetDate(resetAtMs: number | null | undefined, lang: Lang): string | null {
  if (!resetAtMs || !Number.isSafeInteger(resetAtMs) || resetAtMs <= 0) return null;
  try {
    return new Intl.DateTimeFormat(QUOTA_DATE_LOCALE[lang] ?? 'en-GB', {
      day: 'numeric', month: 'long', timeZone: 'UTC',
    }).format(new Date(resetAtMs));
  } catch (error: unknown) {
    // Лог только в редком catch (правило владельца: немых catch нет).
    console.warn('[DIALOG-QUOTA] reset-date:format failed', error instanceof Error ? error.message : String(error)); // guard-ok
    return null;
  }
}

export function aiDialogMonthlyRemainingText(lang: Lang, remaining: number, limit: number): string {
  return triLang(lang, {
    ru: `${remaining} из ${limit} в этом месяце`,
    uk: `${remaining} з ${limit} цього місяця`,
    en: `${remaining} of ${limit} this month`,
    es: `${remaining} de ${limit} este mes`,
    'pt-BR': `${remaining} de ${limit} neste mês`,
    vi: `${remaining}/${limit} trong tháng này`,
    id: `${remaining} dari ${limit} bulan ini`,
    tr: `Bu ay ${limit} yanıttan ${remaining}`,
    pl: `${remaining} z ${limit} w tym miesiącu`,
  });
}

// зачем (18.10): текст лимита и формы слова живут в dialog_limit_text.ts (без иконок) — здесь переэкспорт для прежних импортов.
import { aiDialogMonthlyLimitText, DIALOG_REPLY_FORMS } from './dialog_limit_text';
export { aiDialogMonthlyLimitText, DIALOG_REPLY_FORMS };

function resetText(lang: Lang, date: string): string {
  return triLang(lang, {
    ru: `сброс ${date}`,
    uk: `скидання ${date}`,
    en: `resets ${date}`,
    es: `se reinicia el ${date}`,
    'pt-BR': `renova em ${date}`,
    vi: `đặt lại ${date}`,
    id: `reset ${date}`,
    tr: `${date} sıfırlanır`,
    pl: `reset ${date}`,
  });
}

/**
 * Compact, non-interactive quota indicator shared by every text AI dialogue
 * surface. Стиль 2.0 (владелец 24.09): стеклянная пилюля с тонкой кромкой,
 * как «⚡ 100» рядом — обе живут в одной визуальной семье пилюль хаба.
 */
export default function DialogQuotaBadge({
  lang,
  remaining,
  limit,
  resetAtMs,
  variant = 'compact',
  testID,
}: DialogQuotaBadgeProps) {
  const p = useV2Palette();
  const glass = useV2GlassStyle();
  const safeLimit = Math.max(1, Math.floor(limit));
  const known = remaining !== null && Number.isFinite(remaining);
  const safeRemaining = known ? Math.max(0, Math.min(safeLimit, Math.floor(remaining))) : null;
  const resetDate = formatAiDialogQuotaResetDate(resetAtMs, lang);
  const monthly = safeRemaining === null ? aiDialogMonthlyLimitText(lang, safeLimit) : aiDialogMonthlyRemainingText(lang, safeRemaining, safeLimit);
  const label = resetDate ? `${monthly}, ${resetText(lang, resetDate)}` : monthly;

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        {
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 6,
          minHeight: 32,
          paddingHorizontal: 12,
          borderRadius: 999,
        },
        glass,
      ]}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={15} color={p.iconTint} />
      {variant === 'monthly' ? (
        <>
          <Text style={{ color: p.text, fontSize: 16, fontWeight: '700' }}>{monthly}</Text>
          {resetDate ? (
            // guard-ok: дата в той же строке пилюли через «·», не подпись под названием (стиль 2.0).
            <Text style={{ color: p.textSecondary, fontSize: 13, fontWeight: '600' }}>
              {`· ${resetText(lang, resetDate)}`}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={{ color: p.text, fontSize: 16, fontWeight: '700' }}>
          {safeRemaining === null ? '—' : safeRemaining}/{safeLimit}
        </Text>
      )}
    </View>
  );
}
