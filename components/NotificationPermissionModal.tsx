import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import type { Lang } from '../constants/i18n';
import { triLang } from '../constants/i18n';

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
  const { theme: t, f } = useTheme();

  const resolvedTitle =
    title ??
    triLang(lang, {
      ru: 'Включить напоминания?',
      uk: 'Увімкнути нагадування?',
      es: '¿Activar recordatorios?',
    });
  const resolvedBody =
    body ??
    triLang(lang, {
      ru: 'Мы напомним в нужное время, чтобы ты не терял стрик и быстрее рос в уровне.',
      uk: 'Ми нагадаємо в потрібний час, щоб ти не втрачав стрік і швидше ріс у рівні.',
      es: 'Te avisaremos en el momento adecuado para que no pierdas la racha y sigas subiendo de nivel.',
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
        <View style={{ width: '100%', maxWidth: 390, backgroundColor: t.bgCard, borderRadius: 18, borderWidth: 1, borderColor: t.border, padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: t.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${t.accent}55` }}>
              <Ionicons name="notifications-outline" size={26} color={t.accent} />
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
                <Ionicons name="checkmark-circle" size={16} color={t.correct} />
                <Text style={{ color: t.textMuted, fontSize: f.sub, flex: 1 }}>{p}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.8} style={{ flex: 1, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: t.textMuted, fontWeight: '700', fontSize: f.body }}>
                {cancelLabel ??
                  triLang(lang, {
                    ru: 'Не сейчас',
                    uk: 'Не зараз',
                    es: 'Ahora no',
                  })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} activeOpacity={0.85} style={{ flex: 1, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.body }}>
                {confirmLabel ??
                  triLang(lang, {
                    ru: 'Включить',
                    uk: 'Увімкнути',
                    es: 'Activar',
                  })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
