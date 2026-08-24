import React, { memo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import type { Lang } from '../constants/i18n';
import { triLang } from '../constants/i18n';
import NotificationPermissionModalHybrid from './NotificationPermissionModalHybrid';

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
  /**
   * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
   * сцена M2 «Шторка (bottom sheet)») живёт РЯДОМ со старой версией под флагом.
   * Production default — hybrid; explicit `classic` сохранён для rollback/QA.
   */
  motionVariant?: 'classic' | 'hybrid';
};

function NotificationPermissionModal({
  visible,
  lang,
  onConfirm,
  onCancel,
  title,
  body,
  points,
  confirmLabel,
  cancelLabel,
  motionVariant = 'hybrid',
}: Props) {
  const { theme: t, f, themeMode } = useTheme();

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
    triLang(lang, {
      ru: ['Без пропусков и срывов серии', 'Короткие полезные напоминания', 'Можно отключить в любой момент'],
      uk: ['Без пропусків і зривів серії', 'Короткі корисні нагадування', 'Можна вимкнути в будь-який момент'],
      es: ['Te ayuda a no saltarte días y a mantener la racha', 'Recordatorios breves y prácticos', 'Puedes desactivarlos cuando quieras'],
      'pt-BR': ['Sem faltas e sem quebrar a sequência', 'Lembretes curtos e práticos', 'Você pode desativar a qualquer momento'],
      vi: ['Không bỏ lỡ ngày, không mất chuỗi', 'Nhắc nhở ngắn gọn và hữu ích', 'Có thể tắt bất cứ lúc nào'],
      id: ['Tanpa absen dan putusnya streak', 'Pengingat singkat yang berguna', 'Bisa dimatikan kapan saja'],
      tr: ['Günleri kaçırmadan seriyi koru', 'Kısa ve faydalı hatırlatmalar', 'İstediğin zaman kapatabilirsin'],
      pl: ['Bez przerw i utraty serii', 'Krótkie przydatne przypomnienia', 'Możesz wyłączyć w dowolnym momencie'],
    });

  const resolvedConfirmLabel =
    confirmLabel ??
    triLang(lang, {
      ru: 'Включить', uk: 'Увімкнути', es: 'Activar', 'pt-BR': 'Ativar', vi: 'Bật', id: 'Aktifkan', tr: 'Aç', pl: 'Włącz',
    });
  const resolvedCancelLabel =
    cancelLabel ??
    triLang(lang, {
      ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti saja', tr: 'Daha sonra', pl: 'Później',
    });

  if (motionVariant === 'hybrid') {
    return (
      <NotificationPermissionModalHybrid
        visible={visible}
        onConfirm={onConfirm}
        onCancel={onCancel}
        title={resolvedTitle}
        body={resolvedBody}
        points={[...resolvedPoints]}
        confirmLabel={resolvedConfirmLabel}
        cancelLabel={resolvedCancelLabel}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
          карточка центрировалась во весь рост без прокрутки — на низком экране
          обрезалась вместе с кнопками «Разрешить»/«Не сейчас». */}
      <ScrollView
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 390, backgroundColor: t.bgCard, borderRadius: 18, borderWidth: 0, borderColor: t.border, padding: 20, overflow: 'hidden' }}>
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: t.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 0, borderColor: `${t.accent}55`, overflow: 'hidden' }}>
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

          {/* Единый стандарт: primary на всю ширину, под ней — центрированная текстовая «Позже». */}
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity onPress={onConfirm} activeOpacity={0.85} style={{ width: '100%', backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 0, borderColor: 'transparent', overflow: 'hidden' }}>
              <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.body }}>
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
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7} style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, marginTop: 4, minHeight: 40, justifyContent: 'center' }}>
              <Text style={{ color: t.textMuted, fontWeight: '600', fontSize: f.body, textAlign: 'center' }}>
                {cancelLabel ??
                  triLang(lang, {
                    ru: 'Позже',
                    uk: 'Пізніше',
                    es: 'Más tarde',
                    'pt-BR': 'Mais tarde',
                    vi: 'Để sau',
                    id: 'Nanti saja',
                    tr: 'Daha sonra',
                    pl: 'Później',
                  })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}

export default memo(NotificationPermissionModal);
