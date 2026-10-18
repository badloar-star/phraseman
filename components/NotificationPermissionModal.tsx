import React, { memo } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import type { Lang } from '../constants/i18n';
import { triLang } from '../constants/i18n';
import NotificationPermissionModalHybrid from './NotificationPermissionModalHybrid';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { BlurView } from 'expo-blur';
import { LinearGradient } from './SafeLinearGradient';

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
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);

  const resolvedTitle =
    title ??
    triLang(lang, {
      ru: 'Включить напоминания?',
      uk: 'Увімкнути нагадування?',
      en: 'Turn on reminders?',
      es: '¿Activar recordatorios?',
      'pt-BR': 'Ativar lembretes?',
      vi: 'Bật nhắc nhở?',
      id: 'Aktifkan pengingat?',
      tr: 'Hatırlatıcılar açılsın mı?',
      pl: 'Włączyć przypomnienia?',
    });
  const resolvedBody = body ?? '';
  const resolvedPoints =
    points ??
    triLang(lang, {
      ru: ['Без пропусков и срывов серии', 'Короткие полезные напоминания', 'Можно отключить в любой момент'],
      uk: ['Без пропусків і зривів серії', 'Короткі корисні нагадування', 'Можна вимкнути в будь-який момент'],
      en: ['No missed days or broken streaks', 'Short, useful reminders', 'You can turn it off anytime'],
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
      ru: 'Включить', uk: 'Увімкнути', en: 'Turn on', es: 'Activar', 'pt-BR': 'Ativar', vi: 'Bật', id: 'Aktifkan', tr: 'Aç', pl: 'Włącz',
    });
  const resolvedCancelLabel =
    cancelLabel ??
    triLang(lang, {
      ru: 'Не сейчас', uk: 'Не зараз', en: 'Not now', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Không phải bây giờ', id: 'Jangan sekarang', tr: 'Şimdi değil', pl: 'Nie teraz',
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
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onCancel}>
      <TouchableOpacity activeOpacity={1} onPress={onCancel} style={[styles.backdrop, { paddingTop: Math.max(20, insets.top + 12), paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <TouchableOpacity activeOpacity={1} onPress={(event) => event.stopPropagation()} style={[styles.card, { backgroundColor: glass.sheet, paddingBottom: Math.max(18, insets.bottom + 12) }]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {/* зачем (координатор 18.10, список Сайта; прецедент — интро урока, «свечение текста убери»): на Android dimezis-BlurView без blurTarget снимает экран вместе с текстом панели
                и кладёт размытую копию под него — ореол у текста. На Android живой блюр выключен; тон, вуаль и кромка ниже остаются, iOS как было. */}
            {Platform.OS !== 'android' ? (
              <BlurView intensity={16} blurReductionFactor={3} experimentalBlurMethod={'none'} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
            ) : null}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.sheet }]} />
            <LinearGradient colors={[glass.selected, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
          </View>
          <ScrollView testID="notification-permission-scroll-content" style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner} showsVerticalScrollIndicator={false} bounces={false} decelerationRate="fast">
            <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: t.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 0, borderColor: `${t.accent}55`, overflow: 'hidden' }}>
              <Ionicons name="notifications-outline" size={26} color={t.accentText} />
            </View>
          </View>

          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
            {resolvedTitle}
          </Text>
          {resolvedBody ? <Text style={{ color: t.accentText, fontSize: f.body, lineHeight: 22, marginTop: 10, textAlign: 'center' }}>{resolvedBody}</Text> : null}

          <View style={{ marginTop: 14, gap: 8 }}>
            {resolvedPoints.map((p) => (
              <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={16} color={t.correct} />
                <Text style={{ color: t.textMuted, fontSize: f.sub, flex: 1 }}>{p}</Text>
              </View>
            ))}
          </View>

          </ScrollView>
          {/* Fixed actions remain reachable while supplied runtime copy scrolls. */}
          <View style={styles.footer}>
            <TouchableOpacity testID="notification-permission-confirm" onPress={onConfirm} activeOpacity={0.85} style={{ width: '100%', backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 0, borderColor: 'transparent', overflow: 'hidden' }}>
              <Text style={{ color: t.textOnGold, fontWeight: '800', fontSize: f.body }}>
                {resolvedConfirmLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7} style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, marginTop: 4, minHeight: 40, justifyContent: 'center' }}>
              <Text style={{ color: t.textMuted, fontWeight: '600', fontSize: f.body, textAlign: 'center' }}>
                {resolvedCancelLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default memo(NotificationPermissionModal);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  card: { width: '100%', maxWidth: 390, maxHeight: '100%', borderRadius: 18, paddingHorizontal: 20, paddingTop: 20, overflow: 'hidden' },
  scrollContent: { width: '100%', flexShrink: 1, minHeight: 0 },
  scrollContentInner: { paddingBottom: 14 },
  footer: { width: '100%', marginTop: 6 },
});
