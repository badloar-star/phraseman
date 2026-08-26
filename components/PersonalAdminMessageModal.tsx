import React, { memo, useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { pickAppMessageText, type AppMessageWithState } from '../app/app_messages';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { hapticTap } from '../hooks/use-haptics';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import FullscreenHybridEntrance from './feedback/FullscreenHybridEntrance';
import DuoPressable from './DuoPressable';

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
  const { theme: t, f } = useTheme();
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
    <Text accessibilityRole="header" style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
      {text?.title || triLang(lang, { ru: 'Сообщение', uk: 'Повідомлення', en: 'Message', es: 'Mensaje', 'pt-BR': 'Mensagem', vi: 'Tin nhắn', id: 'Pesan', tr: 'Mesaj', pl: 'Wiadomość' })}
    </Text>
  );

  const bodySlot = (
    <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>
      {text?.body || ''}
    </Text>
  );

  const ctaSlot = (
    <DuoPressable
      accessibilityRole="button"
      accessibilityLabel={triLang(lang, { ru: 'Закрыть сообщение', uk: 'Закрити повідомлення', en: 'Close message', es: 'Cerrar mensaje', 'pt-BR': 'Fechar mensagem', vi: 'Đóng tin nhắn', id: 'Tutup pesan', tr: 'Mesajı kapat', pl: 'Zamknij wiadomość' })}
      disabled={closing}
      onPress={() => { void close(); }}
      edgeColor={t.bgSurface2}
      edgeHeight={4}
      wrapStyle={styles.buttonWrap}
      style={[styles.button, { backgroundColor: t.accent }]}
    >
      <Text style={[styles.buttonText, { color: t.correctText, fontSize: f.bodyLg }]}>{triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}</Text>
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
          style={[styles.card, { backgroundColor: t.bgCard, borderColor: `${t.accent}66` }]}
        >
          {isHybrid ? (
            <FullscreenHybridEntrance visible={visible} bloomColor={t.accent} slots={[titleSlot, bodySlot, ctaSlot]} />
          ) : (
            <>
              {titleSlot}
              {bodySlot}
              {ctaSlot}
            </>
          )}
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
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  title: { fontWeight: '800', textAlign: 'center' },
  body: { marginTop: 12, lineHeight: 23, textAlign: 'center' },
  buttonWrap: { marginTop: 22 },
  button: { borderRadius: 14, minHeight: 50, paddingHorizontal: 18 },
  buttonText: { fontWeight: '800' },
});

export default memo(PersonalAdminMessageModal);
