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
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { LINGMAN_CERT_NAME_MAX_LEN, sanitizeCertName } from '../app/exam_certificate';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

type Props = {
  visible: boolean;
  initialName?: string;
  onSave: (name: string) => void;
  onSkip: () => void;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
};

function CertificateNameModal({ visible, initialName = '', onSave, onSkip, motionVariant = 'hybrid' }: Props) {
  // зачем: окно ввода имени на награде — Liquid Glass (learn.html, exName): непрозрачная основа, нейтральный CTA, без золота и обводок.
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
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

  const cardContent = (
    <View style={[styles.card, { backgroundColor: glass.opaqueSheet }]}>
      <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
        <Text style={{ color: glass.text, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
          {triLang(lang as Lang, {
            ru: 'Чьё имя указать на награде?',
            uk: 'Чиє ім\'я вказати на нагороді?',
            en: 'Whose name should go on the reward?',
            es: '¿Qué nombre quieres en el certificado?',
            'pt-BR': 'Qual nome colocar no certificado?',
            vi: 'Tên nào sẽ hiển thị trên chứng nhận?',
            id: 'Nama apa yang ingin ditampilkan di sertifikat?',
            tr: 'Sertifikada hangi isim yazsın?',
            pl: 'Jakie imię wpisać na certyfikacie?',
          })}
        </Text>
        <Text style={{ color: glass.secondary, fontSize: f.body, marginTop: 10, textAlign: 'center', lineHeight: 21 }}>
          {triLang(lang as Lang, {
            ru: 'Имя появится на награде Phraseman. Можно указать настоящее или ник.',
            uk: 'Ім\'я з\'явиться на нагороді Phraseman. Можна вказати справжнє або нік.',
            en: 'The name will appear on your Phraseman reward. You can use your real name or a nickname.',
            es: 'El nombre figurará en tu certificado Phraseman. Puedes usar tu nombre real o un apodo.',
            'pt-BR': 'O nome aparecerá no certificado da Phraseman. Pode ser seu nome real ou um apelido.',
            vi: 'Tên sẽ xuất hiện trên chứng nhận Phraseman. Bạn có thể dùng tên thật hoặc biệt danh.',
            id: 'Nama akan muncul di sertifikat Phraseman. Kamu bisa memakai nama asli atau nama panggilan.',
            tr: 'İsim Phraseman sertifikasında görünecek. Gerçek adını veya takma adını yazabilirsin.',
            pl: 'Imię pojawi się na certyfikacie Phraseman. Możesz podać prawdziwe imię albo nick.',
          })}
        </Text>
      </CascadeItem>

      <CascadeItem delay={isHybrid ? LUM.ladder[2] + 96 : 0} reduceMotion={!isHybrid || reduceMotion}>
        <TextInput
          value={value}
          onChangeText={(txt) => setValue(txt.slice(0, LINGMAN_CERT_NAME_MAX_LEN))}
          placeholder={triLang(lang as Lang, {
            ru: 'Твоё имя или ник',
            uk: 'Твоє ім\'я або нік',
            en: 'Your name or nickname',
            es: 'Tu nombre o apodo',
            'pt-BR': 'Seu nome ou apelido',
            vi: 'Tên hoặc biệt danh của bạn',
            id: 'Nama atau panggilanmu',
            tr: 'Adın veya takma adın',
            pl: 'Twoje imię albo nick',
          })}
          placeholderTextColor={glass.secondary}
          autoFocus={!isHybrid}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          maxLength={LINGMAN_CERT_NAME_MAX_LEN}
          style={[
            styles.input,
            {
              color: glass.text,
              backgroundColor: glass.opaqueControl,
              fontSize: f.bodyLg,
            },
          ]}
        />
        <Text style={{ color: glass.secondary, fontSize: f.caption, marginTop: 6, textAlign: 'right' }}>
          {cleaned.length} / {LINGMAN_CERT_NAME_MAX_LEN}
        </Text>
      </CascadeItem>

      <CascadeItem delay={isHybrid ? LUM.ladder[2] + 192 : 0} reduceMotion={!isHybrid || reduceMotion}>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: canSave ? glass.cta : glass.buttonFill,
              opacity: canSave ? 1 : 0.55,
            },
          ]}
          disabled={!canSave}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={{ color: canSave ? glass.ctaInk : glass.secondary, fontSize: f.bodyLg, fontWeight: '700' }}>
            {triLang(lang as Lang, {
              ru: 'Сохранить и выдать сертификат',
              uk: 'Зберегти і видати сертифікат',
              en: 'Save and issue the certificate',
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
          <Text style={{ color: glass.secondary, fontSize: f.body, fontWeight: '600', textAlign: 'center' }}>
            {triLang(lang as Lang, {
              ru: 'Пропустить (выдать без имени)',
              uk: 'Пропустити (видати без імені)',
              en: 'Skip (issue without a name)',
              es: 'Omitir (sin nombre en el certificado)',
              'pt-BR': 'Pular (emitir sem nome)',
              vi: 'Bỏ qua (cấp không có tên)',
              id: 'Lewati (terbitkan tanpa nama)',
              tr: 'Atla (isimsiz ver)',
              pl: 'Pomiń (wydaj bez imienia)',
            })}
          </Text>
        </TouchableOpacity>
      </CascadeItem>
    </View>
  );

  if (isHybrid) {
    return (
      <HybridAlertShell scrollContent={false}
        visible={visible}
        onRequestClose={handleSkip}
        shadowColor="#000000" // theme-exempt: затемнение под окном и тень — чёрные в любой теме
        testID="certificate-name-modal-hybrid"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView decelerationRate="fast"
            style={{ width: '100%', maxHeight: '100%' }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              {cardContent}
            </KeyboardAvoidingView>
          </ScrollView>
        </TouchableWithoutFeedback>
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        {/* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
            карточка с полем имени центрировалась без прокрутки. С поднятой
            клавиатурой на низком экране кнопка сохранения уходила за границу —
            сертификат нельзя было создать. */}
        <ScrollView decelerationRate="fast"
          style={styles.backdropScroll}
          contentContainerStyle={styles.backdrop}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.center}
          >
            {cardContent}
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
    backgroundColor: 'rgba(0,0,0,0.6)', // theme-exempt: затемнение под окном и тень — чёрные в любой теме
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
    borderRadius: 28,
    padding: 22,
    alignItems: 'stretch',
  },
  input: {
    marginTop: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryBtn: {
    marginTop: 16,
    borderRadius: 24,
    minHeight: 48,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    marginTop: 4,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
});
