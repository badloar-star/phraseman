import React, { memo, useCallback, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { pickAppMessageText, type AppMessageWithState } from '../app/app_messages';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { hapticTap } from '../hooks/use-haptics';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import FullscreenHybridEntrance from './feedback/FullscreenHybridEntrance';
import DuoPressable from './DuoPressable';
import { plateBoxShadow } from './v2/ShadowSurface';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

type Props = {
  message: AppMessageWithState | null;
  visible: boolean;
  onAcknowledge: (messageId: string) => Promise<void>;
  /**
   * зачем: гибрид «Световод + Чекан» (.motion-mockups/phraseman-hybrid.html,
   * семья «Полноэкранные») — сцена входит из света, контент каскадом. Боевой
   * дефолт — 'classic', ничего не меняется без явного включения.
   */
  motionVariant?: 'classic' | 'hybrid';
};

function PersonalAdminMessageModal({ message, visible, onAcknowledge, motionVariant = 'classic' }: Props) {
  // зачем: личное сообщение команды (макет system.html SYS-07) — Liquid Glass 13 тем,
  // цвета только из токенов активной темы (без зелёного акцента и цветной рамки).
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const [closing, setClosing] = useState(false);
  const text = message ? pickAppMessageText(message, lang) : null;
  const isHybrid = motionVariant === 'hybrid';

  const close = useCallback(async () => {
    if (!message || closing) return;
    hapticTap();
    setClosing(true);
    try { await onAcknowledge(message.id); }
    finally { setClosing(false); }
  }, [closing, message, onAcknowledge]);

  const titleSlot = (
    <Text accessibilityRole="header" style={[styles.title, { color: glass.text }]}>
      {text?.title || triLang(lang, { ru: 'Сообщение', uk: 'Повідомлення', en: 'Message', es: 'Mensaje', 'pt-BR': 'Mensagem', vi: 'Tin nhắn', id: 'Pesan', tr: 'Mesaj', pl: 'Wiadomość' })}
    </Text>
  );

  const eyebrowSlot = (
    <Text style={[styles.eyebrow, { color: glass.secondary }]}>
      {triLang(lang, { ru: 'Сообщение', uk: 'Повідомлення', en: 'Message', es: 'Mensaje', 'pt-BR': 'Mensagem', vi: 'Tin nhắn', id: 'Pesan', tr: 'Mesaj', pl: 'Wiadomość' })}
    </Text>
  );

  const bodySlot = (
    <Text style={[styles.body, { color: glass.secondary }]}>
      {text?.body || ''}
    </Text>
  );

  const ctaSlot = (
    <DuoPressable
      accessibilityRole="button"
      accessibilityLabel={triLang(lang, { ru: 'Закрыть сообщение', uk: 'Закрити повідомлення', en: 'Close message', es: 'Cerrar mensaje', 'pt-BR': 'Fechar mensagem', vi: 'Đóng tin nhắn', id: 'Tutup pesan', tr: 'Mesajı kapat', pl: 'Zamknij wiadomość' })}
      disabled={closing}
      onPress={() => { void close(); }}
      edgeColor={glass.opaqueControl}
      edgeHeight={0}
      wrapStyle={styles.buttonWrap}
      style={[styles.button, { backgroundColor: glass.accent }]}
    >
      <Text style={[styles.buttonText, { color: glass.accentInk }]}>{triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}</Text>
    </DuoPressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isHybrid ? 'none' : 'fade'}
      statusBarTranslucent
      onRequestClose={() => { void close(); }}
    >
      {/* затемнение — скрим текущей темы (закон владельца 22.10 «цвета — строго цвета и оттенки текущей темы») */}
      <View style={[styles.root, { backgroundColor: glass.scrim, paddingBottom: normalizeSafeAreaBottomInset(insets.bottom) }]}>
        <View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: glass.opaqueSheet, boxShadow: plateBoxShadow(glass) }]}
        >
          <ScrollView style={{ flexShrink: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" bounces={false} decelerationRate="fast">
          {isHybrid ? (
            <FullscreenHybridEntrance visible={visible} bloomColor={glass.lightTint} slots={[eyebrowSlot, titleSlot, bodySlot, ctaSlot]} />
          ) : (
            <>
              {eyebrowSlot}
              {titleSlot}
              {bodySlot}
              {ctaSlot}
            </>
          )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    maxHeight: '100%',
    width: '100%',
    maxWidth: 440,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 20,
  },
  // зачем: паритет с макетом system.html system_16 — оверлайн 12/700 (разрядка 3), заголовок 21/700, текст 15, кнопка 48 пилюля.
  eyebrow: { fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 },
  title: { fontSize: 21, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  body: { marginTop: 8, fontSize: 16, lineHeight: 21, textAlign: 'center' },
  buttonWrap: { marginTop: 20 },
  button: { borderRadius: 24, minHeight: 48, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});

export default memo(PersonalAdminMessageModal);
