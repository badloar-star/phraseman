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
  const { f, liquidGlassThemeId } = useTheme();
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
    <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h2 }]}>
      {text?.title || triLang(lang, { ru: 'Сообщение', uk: 'Повідомлення', en: 'Message', es: 'Mensaje', 'pt-BR': 'Mensagem', vi: 'Tin nhắn', id: 'Pesan', tr: 'Mesaj', pl: 'Wiadomość' })}
    </Text>
  );

  const eyebrowSlot = (
    <Text style={[styles.eyebrow, { color: glass.secondary, fontSize: f.caption }]}>
      {triLang(lang, { ru: 'Сообщение', uk: 'Повідомлення', en: 'Message', es: 'Mensaje', 'pt-BR': 'Mensagem', vi: 'Tin nhắn', id: 'Pesan', tr: 'Mesaj', pl: 'Wiadomość' })}
    </Text>
  );

  const bodySlot = (
    <Text style={[styles.body, { color: glass.secondary, fontSize: f.body }]}>
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
      <Text style={[styles.buttonText, { color: glass.accentInk, fontSize: f.bodyLg }]}>{triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}</Text>
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
      <View style={[styles.root, { paddingBottom: normalizeSafeAreaBottomInset(insets.bottom) }]}>
        <View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: glass.opaqueSheet, borderColor: glass.glassEdge }]}
        >
          <ScrollView style={{ flexShrink: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" bounces={false}>
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
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  card: {
    maxHeight: '100%',
    width: '100%',
    maxWidth: 440,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 20,
  },
  eyebrow: { fontWeight: '800', textAlign: 'center', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 },
  title: { fontWeight: '800', textAlign: 'center' },
  body: { marginTop: 12, lineHeight: 23, textAlign: 'center' },
  buttonWrap: { marginTop: 22 },
  button: { borderRadius: 16, minHeight: 52, paddingHorizontal: 18 },
  buttonText: { fontWeight: '800' },
});

export default memo(PersonalAdminMessageModal);
