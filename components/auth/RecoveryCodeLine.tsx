// ═══════════════════════════════════════════════════════════════════════════
// RecoveryCodeLine.tsx — строка над полем кода в панели восстановления по коду из письма: срок / «Отправили новый код» / «Код не подошёл».
//
// зачем (координатор 18.10, эталон docs/design/v2-app/auth-states.html, блок 7, чек-лист A7.3/A7.7/A7.8; правило владельца «красного во входе нет»):
// раньше здесь были красные «Срок действия кода истёк…» и красный блок ошибки под панелью. Теперь одна строка вторым цветом на одном месте (высота ≥ 20):
//  • срок — «Код действует ещё 4:52» (время жирнее, цветом текста);
//  • код просрочен — приложение само отправляет новый, на месте срока «✓ Отправили новый код»;
//  • неверный код — «Код не подошёл. Проверь все 6 цифр.»; поле остаётся обычного тона, введённые цифры на месте.
// Размер 13/19 (шкала D145). ЧЕРНОВИК ТЕКСТОВ ДЛЯ ПЕРЕВОДЧИКА: ru — по макету Макетов, остальные языки проверить.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { triLang, type Lang } from '../../constants/i18n';

/** 4:52 вместо «292 s»: минуты и две цифры секунд. */
export function formatRecoveryClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Код просрочен, приложение само отправило новый (макет: «✓ Отправили новый код»). */
export function recoveryNewCodeSentText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Отправили новый код', uk: 'Надіслали новий код', en: 'We sent a new code', es: 'Enviamos un código nuevo', 'pt-BR': 'Enviamos um novo código',
    vi: 'Đã gửi mã mới', id: 'Kode baru sudah dikirim', tr: 'Yeni kod gönderildi', pl: 'Wysłaliśmy nowy kod',
  });
}

/** Код просрочен, новый ещё отправляется (короткий промежуток до «Отправили новый код»). */
export function recoveryExpiredSendingText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Код истёк, отправляем новый…', uk: 'Код минув, надсилаємо новий…', en: 'The code expired, sending a new one…', es: 'El código caducó, enviamos uno nuevo…', 'pt-BR': 'O código expirou, estamos enviando outro…',
    vi: 'Mã đã hết hạn, đang gửi mã mới…', id: 'Kode kedaluwarsa, mengirim yang baru…', tr: 'Kodun süresi doldu, yenisi gönderiliyor…', pl: 'Kod wygasł, wysyłamy nowy…',
  });
}

export type RecoveryCodeLineProps = Readonly<{
  kind: 'expiry' | 'error' | 'notice';
  /** Основной текст (для срока — подпись «Код действует ещё»). */
  text: string;
  /** Только для срока: время «4:52», выделяется цветом текста. */
  time?: string;
  /** Второй цвет (glass.secondary) и цвет текста (glass.text) — панель стоит на opaqueControl. */
  secondaryColor: string;
  inkColor: string;
  testID?: string;
}>;

function RecoveryCodeLineBase({ kind, text, time, secondaryColor, inkColor, testID }: RecoveryCodeLineProps) {
  return (
    <View testID={testID ?? 'recovery-code-line'} accessibilityRole="text" accessibilityLiveRegion="polite" style={s.row}>
      {kind === 'notice' ? <Ionicons name="checkmark" size={15} color={secondaryColor} accessibilityElementsHidden importantForAccessibility="no" /> : null}
      <Text maxFontSizeMultiplier={1.3} style={[s.text, { color: secondaryColor }]}>
        {text}
        {time ? <Text style={{ color: inkColor, fontWeight: '600' }}>{` ${time}`}</Text> : null}
      </Text>
    </View>
  );
}
export const RecoveryCodeLine = memo(RecoveryCodeLineBase);

// макет `.rec .rx`: min-height 20, 13/19, по центру, сверху 12; `.note` — значок 15 и зазор 6
const s = StyleSheet.create({
  row: { minHeight: 20, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  text: { fontSize: 13, lineHeight: 19, textAlign: 'center', flexShrink: 1 },
});
