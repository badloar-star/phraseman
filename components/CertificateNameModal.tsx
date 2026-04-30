import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { LINGMAN_CERT_NAME_MAX_LEN, sanitizeCertName } from '../app/exam_certificate';

type Props = {
  visible: boolean;
  initialName?: string;
  onSave: (name: string) => void;
  onSkip: () => void;
};

export default function CertificateNameModal({ visible, initialName = '', onSave, onSkip }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const [value, setValue] = useState(initialName);

  useEffect(() => {
    if (visible) setValue(initialName);
  }, [visible, initialName]);

  const cleaned = sanitizeCertName(value);
  const canSave = cleaned.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    hapticTap();
    Keyboard.dismiss();
    onSave(cleaned);
  };

  const handleSkip = () => {
    hapticTap();
    Keyboard.dismiss();
    onSkip();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.center}
          >
            <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <View style={[styles.ribbon, { borderColor: '#d4a017' }]}>
                <Text style={{ color: '#d4a017', fontSize: f.label, fontWeight: '700', letterSpacing: 1.4 }}>
                  PHRASEMAN B2
                </Text>
              </View>

              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
                {triLang(lang as Lang, {
                  ru: 'Чьё имя указать на награде?',
                  uk: 'Чиє імʼя вказати на нагороді?',
                  es: '¿Qué nombre quieres en el certificado?',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                {triLang(lang as Lang, {
                  ru: 'Имя появится на награде Phraseman. Можно указать настоящее или ник.',
                  uk: 'Імʼя зʼявиться на нагороді Phraseman. Можна вказати справжнє або нік.',
                  es: 'El nombre figurará en tu certificado Phraseman. Puedes usar tu nombre real o un apodo.',
                })}
              </Text>

              <TextInput
                value={value}
                onChangeText={(txt) => setValue(txt.slice(0, LINGMAN_CERT_NAME_MAX_LEN))}
                placeholder={triLang(lang as Lang, {
                  ru: 'Ваше имя или ник',
                  uk: 'Ваше імʼя або нік',
                  es: 'Tu nombre o apodo',
                })}
                placeholderTextColor={t.textMuted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
                maxLength={LINGMAN_CERT_NAME_MAX_LEN}
                style={[
                  styles.input,
                  {
                    color: t.textPrimary,
                    backgroundColor: t.bgPrimary,
                    borderColor: canSave ? '#d4a017' : t.border,
                    fontSize: f.bodyLg,
                  },
                ]}
              />
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 6, textAlign: 'right' }}>
                {cleaned.length} / {LINGMAN_CERT_NAME_MAX_LEN}
              </Text>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: canSave ? '#B8860B' : t.bgSurface,
                    borderColor: canSave ? '#FFD700' : t.border,
                    opacity: canSave ? 1 : 0.55,
                  },
                ]}
                disabled={!canSave}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#FFD700', fontSize: f.bodyLg, fontWeight: '700', letterSpacing: 0.4 }}>
                  {triLang(lang as Lang, {
                    ru: 'Сохранить и выдать сертификат',
                    uk: 'Зберегти і видати сертифікат',
                    es: 'Guardar y emitir el certificado',
                  })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
                <Text style={{ color: t.textSecond, fontSize: f.body, textDecorationLine: 'underline' }}>
                  {triLang(lang as Lang, {
                    ru: 'Пропустить (выдать без имени)',
                    uk: 'Пропустити (видати без імені)',
                    es: 'Omitir (sin nombre en el certificado)',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  center: { width: '100%' },
  card: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    alignItems: 'stretch',
  },
  ribbon: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  input: {
    marginTop: 16,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryBtn: {
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  skipBtn: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
