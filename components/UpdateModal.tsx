// ════════════════════════════════════════════════════════════════════════════
// UpdateModal.tsx — Модальник с уведомлением об обновлении.
// Большая кнопка "Обновить" → App Store / Google Play.
// Кнопка "Закрыть" → скрывает модальник.
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { hapticTap } from '../hooks/use-haptics';

const TEXTS = {
  ru: {
    title: 'Доступно обновление',
    body: 'Вышла новая версия Phraseman с улучшениями и новыми функциями.',
    update: 'Обновить приложение',
    close: 'Закрыть',
  },
  uk: {
    title: 'Доступне оновлення',
    body: 'Вийшла нова версія Phraseman з покращеннями та новими функціями.',
    update: 'Оновити застосунок',
    close: 'Закрити',
  },
  es: {
    title: 'Hay una actualización',
    body: 'Salió una versión nueva de Phraseman con mejoras y funciones nuevas.',
    update: 'Actualizar app',
    close: 'Cerrar',
  },
} as const;

interface UpdateModalProps {
  visible: boolean;
  storeUrl: string;
  message?: string;
  onClose?: () => void;
  /** Вызывается до открытия магазина — на Android скрывает Modal до паузы Activity (меньше зависаний при возврате). */
  onWillOpenExternalUrl?: () => void;
  /** Если Linking.openURL не удался — вернуть UI (см. onWillOpenExternalUrl). */
  onExternalOpenFailed?: () => void;
}

export default function UpdateModal({ visible, storeUrl, message, onClose, onWillOpenExternalUrl, onExternalOpenFailed }: UpdateModalProps) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const tx = lang === 'es' ? TEXTS.es : TEXTS[lang === 'uk' ? 'uk' : 'ru'];

  const handleUpdate = () => {
    hapticTap();
    onWillOpenExternalUrl?.();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void Linking.openURL(storeUrl).catch(() => {
          onExternalOpenFailed?.();
        });
      });
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { onClose?.(); }}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.55)' },
        ]}
      >
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderHighlight }]}>

          {/* Иконка */}
          <Text style={styles.emoji}>🚀</Text>

          {/* Заголовок */}
          <Text style={[styles.title, { color: t.textPrimary }]}>
            {tx.title}
          </Text>

          <Text style={[styles.body, { color: t.textMuted }]}>
            {message ? message : tx.body}
          </Text>

          {/* Большая кнопка Обновить */}
          <Pressable
            style={({ pressed }) => [
              styles.updateBtn,
              { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleUpdate}
          >
            <Text style={[styles.updateBtnText, { color: t.correctText }]}>{tx.update}</Text>
          </Pressable>

          {!!onClose && (
            <Pressable
              style={({ pressed }) => [
                styles.closeBtn,
                { borderColor: t.border, backgroundColor: t.bgSurface, opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.closeBtnText, { color: t.textSecond }]}>{tx.close}</Text>
            </Pressable>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  updateBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  updateBtnText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

});
