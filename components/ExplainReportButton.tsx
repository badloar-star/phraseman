/**
 * ExplainReportButton — тонкая кнопка-репорт для шторки объяснения (план 04).
 *
 * ПОЧЕМУ не ReportErrorButton: тот хардкодит submitErrorReport (CF error_reports).
 * Нам нужен submitExplainReport (CF explain_reports). Поэтому переиспользуем ТОЛЬКО
 * визуал icon-flag (Ionicons "flag", цвет t.wrong), а вызываем callSubmitExplainReport.
 *
 * ИНВАРИАНТ: шлём phraseEn СЫРЫМ — phraseHash считает сервер. Клиент хэш НЕ вычисляет
 * (иначе нормализация задвоится с планом 01).
 */
import React, { memo, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { callSubmitExplainReport } from '../app/explain_phrase_client';
import { asLang } from '../app/explain_phrase_request';

interface Props {
  /** Английская фраза — сервер сам выведет phraseHash; клиент хэш НЕ шлёт. */
  phraseEn: string;
  /** Язык объяснения, на которое жалуемся (кэш per-(phrase,lang)). Дефолт — язык интерфейса. */
  lang?: string;
}

function ExplainReportButton({ phraseEn, lang: langProp }: Props) {
  const { theme: t, f } = useTheme();
  const { lang: ctxLang } = useLang();
  const lang = langProp || ctxLang;
  const uiLang = asLang(lang);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handlePress = async () => {
    if (sending || sent) return;
    hapticTap();
    setSending(true);
    try {
      await callSubmitExplainReport({ phraseEn, lang });
      setSent(true);
    } catch {
      // Репорт — бэкстоп-сигнал, не критичный путь. Сбой проглатываем тихо для
      // пользователя (не пугаем), но кнопку возвращаем в исходное состояние.
      setSending(false);
      return;
    }
    setSending(false);
  };

  const label = sent
    ? triLang(uiLang, {
        ru: 'Спасибо, учтём',
        uk: 'Дякуємо, врахуємо',
        es: 'Gracias, lo revisaremos',
        'pt-BR': 'Obrigado, vamos verificar',
        vi: 'Cảm ơn, chúng tôi sẽ xem lại',
        id: 'Terima kasih, akan kami periksa',
        tr: 'Teşekkürler, inceleyeceğiz',
        pl: 'Dzięki, sprawdzimy',
      })
    : triLang(uiLang, {
        ru: 'Непонятно объяснили',
        uk: 'Незрозуміло пояснили',
        es: 'Explicación poco clara',
        'pt-BR': 'Explicação confusa',
        vi: 'Giải thích khó hiểu',
        id: 'Penjelasan kurang jelas',
        tr: 'Açıklama belirsiz',
        pl: 'Niejasne wyjaśnienie',
      });

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={sending || sent}
      style={[styles.trigger, (sending || sent) && styles.triggerMuted]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={triLang(uiLang, {
        ru: 'Сообщить, что объяснение непонятное',
        uk: 'Повідомити, що пояснення незрозуміле',
        es: 'Informar de que la explicación no es clara',
        'pt-BR': 'Informar que a explicação está confusa',
        vi: 'Báo rằng phần giải thích khó hiểu',
        id: 'Laporkan bahwa penjelasannya kurang jelas',
        tr: 'Açıklamanın belirsiz olduğunu bildir',
        pl: 'Zgłoś, że wyjaśnienie jest niejasne',
      })}
    >
      {sending ? (
        <ActivityIndicator size="small" color={t.wrong} />
      ) : (
        <Ionicons name={sent ? 'checkmark-circle' : 'flag'} size={16} color={sent ? t.accent : t.wrong} />
      )}
      <Text
        style={[styles.label, { color: sent ? t.textMuted : t.textSecond, fontSize: f.sub }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default memo(ExplainReportButton);

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    opacity: 0.92,
  },
  triggerMuted: {
    opacity: 0.7,
  },
  label: {
    fontWeight: '600',
  },
});
