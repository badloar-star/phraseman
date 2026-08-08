import React, { memo, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { monoIcon } from '../constants/monoIcon';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { LINGMAN_CERT_NAME_MAX_LEN, sanitizeCertName } from '../app/exam_certificate';

type Props = {
  visible: boolean;
  initialName?: string;
  onSave: (name: string) => void;
  onSkip: () => void;
};

function CertificateNameModal({ visible, initialName = '', onSave, onSkip }: Props) {
  const { theme: t, f, themeMode } = useTheme();
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
        {/* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
            карточка с полем имени центрировалась без прокрутки. С поднятой
            клавиатурой на низком экране кнопка сохранения уходила за границу —
            сертификат нельзя было создать. */}
        <ScrollView
          style={styles.backdropScroll}
          contentContainerStyle={styles.backdrop}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.center}
          >
            <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <View style={[styles.ribbon, { borderColor: '#d4a017' }]}>
                <Text style={{ color: monoIcon(themeMode, '#d4a017'), fontSize: f.label, fontWeight: '700', letterSpacing: 1.4 }}>
                  PHRASEMAN B2
                </Text>
              </View>

              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
                {triLang(lang as Lang, {
                  ru: 'Чьё имя указать на награде?',
                  uk: 'Чиє ім\'я вказати на нагороді?',
                  es: '¿Qué nombre quieres en el certificado?',
                  'pt-BR': 'Qual nome colocar no certificado?',
                  vi: 'Tên nào sẽ hiển thị trên chứng nhận?',
                  id: 'Nama apa yang ingin ditampilkan di sertifikat?',
                  tr: 'Sertifikada hangi isim yazsın?',
                  pl: 'Jakie imię wpisać na certyfikacie?',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                {triLang(lang as Lang, {
                  ru: 'Имя появится на награде Phraseman. Можно указать настоящее или ник.',
                  uk: 'Ім\'я з\'явиться на нагороді Phraseman. Можна вказати справжнє або нік.',
                  es: 'El nombre figurará en tu certificado Phraseman. Puedes usar tu nombre real o un apodo.',
                  'pt-BR': 'O nome aparecerá no certificado da Phraseman. Pode ser seu nome real ou um apelido.',
                  vi: 'Tên sẽ xuất hiện trên chứng nhận Phraseman. Bạn có thể dùng tên thật hoặc biệt danh.',
                  id: 'Nama akan muncul di sertifikat Phraseman. Kamu bisa memakai nama asli atau nama panggilan.',
                  tr: 'İsim Phraseman sertifikasında görünecek. Gerçek adını veya takma adını yazabilirsin.',
                  pl: 'Imię pojawi się na certyfikacie Phraseman. Możesz podać prawdziwe imię albo nick.',
                })}
              </Text>

              <TextInput
                value={value}
                onChangeText={(txt) => setValue(txt.slice(0, LINGMAN_CERT_NAME_MAX_LEN))}
                placeholder={triLang(lang as Lang, {
                  ru: 'Твоё имя или ник',
                  uk: 'Твоє ім\'я або нік',
                  es: 'Tu nombre o apodo',
                  'pt-BR': 'Seu nome ou apelido',
                  vi: 'Tên hoặc biệt danh của bạn',
                  id: 'Nama atau panggilanmu',
                  tr: 'Adın veya takma adın',
                  pl: 'Twoje imię albo nick',
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
                <Text style={{ color: monoIcon(themeMode, '#FFD700'), fontSize: f.bodyLg, fontWeight: '700', letterSpacing: 0.4 }}>
                  {triLang(lang as Lang, {
                    ru: 'Сохранить и выдать сертификат',
                    uk: 'Зберегти і видати сертифікат',
                    es: 'Guardar y emitir el certificado',
                    'pt-BR': 'Salvar e emitir o certificado',
                    vi: 'Lưu và cấp chứng nhận',
                    id: 'Simpan dan terbitkan sertifikat',
                    tr: 'Kaydet ve sertifikayı ver',
                    pl: 'Zapisz i wystaw certyfikat',
                  })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
                <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '600', textAlign: 'center' }}>
                  {triLang(lang as Lang, {
                    ru: 'Пропустить (выдать без имени)',
                    uk: 'Пропустити (видати без імені)',
                    es: 'Omitir (sin nombre en el certificado)',
                    'pt-BR': 'Pular (emitir sem nome)',
                    vi: 'Bỏ qua (cấp không có tên)',
                    id: 'Lewati (terbitkan tanpa nama)',
                    tr: 'Atla (isimsiz ver)',
                    pl: 'Pomiń (wydaj bez imienia)',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default memo(CertificateNameModal);

const styles = StyleSheet.create({
  backdropScroll: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backdrop: {
    // flexGrow (а не flex) — в contentContainerStyle это единственный способ
    // сказать «растянись на всю высоту, если контента мало, но дай прокрутку,
    // если много». Центрирование сохранено для больших экранов.
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  center: { width: '100%' },
  card: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 0,
    alignItems: 'stretch',
  },
  ribbon: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 0,
    backgroundColor: 'rgba(212,160,23,0.12)',
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
    borderWidth: 0,
  },
  skipBtn: {
    marginTop: 4,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 40,
    justifyContent: 'center',
  },
});
