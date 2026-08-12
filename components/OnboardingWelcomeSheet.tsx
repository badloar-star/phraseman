/**
 * OnboardingWelcomeSheet — приветственная шторка сразу после последнего экрана
 * онбординга.
 *
 * зачем: владелец (2026-07-26) — «после последнего экрана хочу модалку-лист,
 * которая благодарит и вводит в курс дела». Исследование поведения новичков:
 * работает только КОРОТКОЕ приветствие с ОДНИМ понятным следующим шагом —
 * многостраничные фиче-туры пролистывают, не читая. Поэтому здесь строго:
 * спасибо по имени → одна мысль (заниматься понемногу каждый день) → одна
 * кнопка, закрывающая шторку. Свайп вниз тоже закрывает.
 *
 * Каркас (выезд снизу, drag-to-dismiss, подложка) переиспользован из
 * ReferralSheetShell — единый паттерн шторок по DESIGN.md, ничего не изобретаем.
 * Токены темы, без обводок (тон), fontWeight только 400/700.
 */
import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ReferralSheetShell from './referral_sheet_shell';
import TapScale from './TapScale';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';

interface Props {
  visible: boolean;
  /** Имя из онбординга. Пустое/пробелы → безличный тёплый заголовок. */
  userName?: string | null;
  onClose: () => void;
  testID?: string;
}

/** Заголовок с именем, но без «Спасибо, !», если имя пустое. */
export function welcomeSheetTitle(userName?: string | null, lang: Lang = 'ru'): string {
  const name = String(userName ?? '').trim();
  return name
    ? triLang(lang, { ru: `Спасибо, ${name}!`, uk: `Дякуємо, ${name}!`, es: `¡Gracias, ${name}!`, 'pt-BR': `Obrigado, ${name}!`, vi: `Cảm ơn bạn, ${name}!`, id: `Terima kasih, ${name}!`, tr: `Teşekkürler, ${name}!`, pl: `Dziękujemy, ${name}!` })
    : triLang(lang, { ru: 'Спасибо!', uk: 'Дякуємо!', es: '¡Gracias!', 'pt-BR': 'Obrigado!', vi: 'Cảm ơn bạn!', id: 'Terima kasih!', tr: 'Teşekkürler!', pl: 'Dziękujemy!' });
}

function OnboardingWelcomeSheet({ visible, userName, onClose, testID }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = (copy: Record<Lang, string>) => triLang(lang, copy);

  // зачем: закрытие — единственное действие шторки; хаптика на управляющем
  // элементе (по правилам владельца — не на плитках), состояние локальное,
  // никакой сети, поэтому отклик мгновенный и откатывать нечего.
  const handleClose = useCallback(() => {
    void hapticTap();
    onClose();
  }, [onClose]);

  return (
    <ReferralSheetShell
      visible={visible}
      onClose={onClose}
      title={welcomeSheetTitle(userName, lang)}
      closeLabel={L({ ru: 'Закрыть приветствие', uk: 'Закрити привітання', es: 'Cerrar bienvenida', 'pt-BR': 'Fechar boas-vindas', vi: 'Đóng lời chào', id: 'Tutup sambutan', tr: 'Karşılamayı kapat', pl: 'Zamknij powitanie' })}
      testID={testID ?? 'onboarding-welcome-sheet'}
    >
      <View style={styles.body}>
        {/* зачем: владелец (2026-07-27) — обещание персонального плана врало,
            никакого плана под ответы мы не собираем. Оставляем ровно две мысли:
            спасибо за установку + один совет про регулярность. */}
        <Text
          style={[styles.lead, { color: t.textPrimary, fontSize: f.body }]}
          maxFontSizeMultiplier={1.2}
        >
          {L({ ru: 'Спасибо, что установил приложение.', uk: 'Дякуємо, що встановили застосунок.', es: 'Gracias por instalar la aplicación.', 'pt-BR': 'Obrigado por instalar o aplicativo.', vi: 'Cảm ơn bạn đã cài đặt ứng dụng.', id: 'Terima kasih telah memasang aplikasi.', tr: 'Uygulamayı yüklediğiniz için teşekkürler.', pl: 'Dziękujemy za zainstalowanie aplikacji.' })}
        </Text>
        <Text
          style={[styles.note, { color: t.textSecond, fontSize: f.body }]}
          maxFontSizeMultiplier={1.2}
        >
          {L({ ru: 'Занимайся понемногу, но каждый день: несколько минут ежедневно дают больше, чем редкие длинные подходы.', uk: 'Займайтеся потроху, але щодня: кілька хвилин щодня дають більше, ніж рідкісні довгі заняття.', es: 'Practica un poco cada día: unos minutos diarios dan más resultado que sesiones largas y esporádicas.', 'pt-BR': 'Pratique um pouco todos os dias: alguns minutos diários rendem mais do que sessões longas e raras.', vi: 'Hãy học một chút mỗi ngày: vài phút hằng ngày hiệu quả hơn những buổi học dài nhưng thưa thớt.', id: 'Belajarlah sedikit setiap hari: beberapa menit setiap hari lebih efektif daripada sesi panjang yang jarang.', tr: 'Her gün biraz çalışın: her gün birkaç dakika, seyrek yapılan uzun çalışmalardan daha etkilidir.', pl: 'Ucz się po trochu każdego dnia: kilka minut dziennie daje więcej niż rzadkie, długie sesje.' })}
        </Text>

        <TapScale
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={L({ ru: 'Начать', uk: 'Почати', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Mulai', tr: 'Başla', pl: 'Zacznij' })}
          testID="onboarding-welcome-sheet-cta"
          style={[styles.cta, { backgroundColor: t.accent }]}
        >
          <Text
            style={[styles.ctaLabel, { color: t.correctText, fontSize: f.bodyLg }]}
            maxFontSizeMultiplier={1.2}
          >
            {L({ ru: 'Понятно, начнём', uk: 'Зрозуміло, почнімо', es: 'Entendido, empecemos', 'pt-BR': 'Entendi, vamos começar', vi: 'Đã hiểu, bắt đầu thôi', id: 'Mengerti, mari mulai', tr: 'Anladım, başlayalım', pl: 'Rozumiem, zaczynajmy' })}
          </Text>
        </TapScale>
      </View>
    </ReferralSheetShell>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingTop: 4 },
  lead: { fontWeight: '700', lineHeight: 22 },
  note: { fontWeight: '400', lineHeight: 22 },
  cta: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { fontWeight: '700' },
});

export default React.memo(OnboardingWelcomeSheet);
