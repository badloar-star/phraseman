import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import type { Lang } from '../constants/i18n';
import { triLang } from '../constants/i18n';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';

type Props = {
  visible: boolean;
  lang: Lang;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  body?: string;
  points?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function NotificationPermissionModal({
  visible,
  lang,
  onConfirm,
  onCancel,
  title,
  body,
  points,
  confirmLabel,
  cancelLabel,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = themeMode === 'compass';

  const resolvedTitle =
    title ??
    triLang(lang, {
      ru: 'Включить напоминания?',
      uk: 'Увімкнути нагадування?',
      es: '¿Activar recordatorios?',
      'pt-BR': 'Ativar lembretes?',
      vi: 'Bật nhắc nhở?',
      id: 'Aktifkan pengingat?',
      tr: 'Hatırlatıcılar açılsın mı?',
      pl: 'Włączyć przypomnienia?',
    });
  const resolvedBody =
    body ??
    triLang(lang, {
      ru: 'Мы напомним в нужное время, чтобы ты не терял цепочку и быстрее рос в уровне.',
      uk: 'Ми нагадаємо в потрібний час, щоб ти не втрачав стрік і швидше ріс у рівні.',
      es: 'Te avisaremos en el momento adecuado para que no pierdas la racha y sigas subiendo de nivel.',
      'pt-BR': 'Vamos lembrar você no momento certo para não perder a sequência e subir de nível mais rápido.',
      vi: 'Chúng tôi sẽ nhắc đúng lúc để bạn không mất chuỗi và lên cấp nhanh hơn.',
      id: 'Kami akan mengingatkan di waktu yang tepat agar streak tidak putus dan levelmu naik lebih cepat.',
      tr: 'Serini kaybetmemen ve daha hızlı seviye atlaman için doğru zamanda hatırlatacağız.',
      pl: 'Przypomnimy we właściwym momencie, żeby nie stracić serii i szybciej awansować.',
    });
  const resolvedPoints =
    points ??
    (lang === 'uk'
      ? ['Без пропусків і зривів серії', 'Короткі корисні нагадування', 'Можна вимкнути в будь-який момент']
      : lang === 'es'
        ? ['Te ayuda a no saltarte días y a mantener la racha', 'Recordatorios breves y prácticos', 'Puedes desactivarlos cuando quieras']
        : ['Без пропусков и срывов серии', 'Короткие полезные напоминания', 'Можно отключить в любой момент']);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <View style={{ width: '100%', maxWidth: 390, backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderRadius: isCompassTheme ? 14 : 18, borderWidth: 1, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border, padding: 20, overflow: 'hidden', ...(isCompassTheme ? compassShadow(3) : null) }}>
          {isCompassTheme && <CompassDepthSurface radius={14} selected />}
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 54, height: 54, borderRadius: isCompassTheme ? 10 : 27, backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalWarm : t.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : `${t.accent}55`, overflow: 'hidden', ...(isCompassTheme ? compassShadow(1) : null) }}>
              {isCompassTheme && <CompassDepthSurface radius={10} selected />}
              <Ionicons name="notifications-outline" size={26} color={isCompassTheme ? COMPASS_RICH.champagne : t.accent} />
            </View>
          </View>

          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
            {resolvedTitle}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, marginTop: 10, textAlign: 'center' }}>
            {resolvedBody}
          </Text>

          <View style={{ marginTop: 14, gap: 8 }}>
            {resolvedPoints.map((p) => (
              <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={16} color={isCompassTheme ? COMPASS_RICH.champagne : t.correct} />
                <Text style={{ color: t.textMuted, fontSize: f.sub, flex: 1 }}>{p}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.8} style={{ flex: 1, borderWidth: 1, borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border, borderRadius: isCompassTheme ? 9 : 12, paddingVertical: 12, alignItems: 'center', backgroundColor: isCompassTheme ? COMPASS_RICH.charcoal : 'transparent', overflow: 'hidden', ...(isCompassTheme ? compassShadow(1) : null) }}>
              {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
              <Text style={{ color: t.textMuted, fontWeight: '700', fontSize: f.body }}>
                {cancelLabel ??
                  triLang(lang, {
                    ru: 'Не сейчас',
                    uk: 'Не зараз',
                    es: 'Ahora no',
                    'pt-BR': 'Agora não',
                    vi: 'Không phải bây giờ',
                    id: 'Nanti saja',
                    tr: 'Şimdi değil',
                    pl: 'Nie teraz',
                  })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} activeOpacity={0.85} style={{ flex: 1, backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : t.accent, borderRadius: isCompassTheme ? 9 : 12, paddingVertical: 12, alignItems: 'center', borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent', overflow: 'hidden', ...(isCompassTheme ? compassShadow(1) : null) }}>
              {isCompassTheme && <CompassDepthSurface radius={9} cream />}
              <Text style={{ color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontWeight: '800', fontSize: f.body }}>
                {confirmLabel ??
                  triLang(lang, {
                    ru: 'Включить',
                    uk: 'Увімкнути',
                    es: 'Activar',
                    'pt-BR': 'Ativar',
                    vi: 'Bật',
                    id: 'Aktifkan',
                    tr: 'Aç',
                    pl: 'Włącz',
                  })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
