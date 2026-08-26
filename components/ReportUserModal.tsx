import React, { memo, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlowText } from './text-integrity/FlowText';
import { useTheme } from './ThemeContext';
import { submitUserReport } from '../app/user_report';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { emitAppEvent } from '../app/events';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';

interface Props {
  visible: boolean;
  reportedUid: string;
  reportedName: string;
  screen: 'leaderboard' | 'profile';
  lang: Lang;
  onClose: () => void;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
}

function ReportUserModal({ visible, reportedUid, reportedName, screen, lang, onClose, motionVariant = 'hybrid' }: Props) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) Keyboard.dismiss();
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };
  const tx = {
    sent: triLang(lang, {
      ru: 'Жалоба отправлена',
      uk: 'Скаргу надіслано',
      en: 'Report sent',
      es: 'Reporte enviado',
      'pt-BR': 'Denúncia enviada',
      vi: 'Đã gửi báo cáo',
      id: 'Laporan terkirim',
      tr: 'Şikayet gönderildi',
      pl: 'Zgłoszenie wysłane',
    }),
    title: triLang(lang, {
      ru: 'Пожаловаться на ник?',
      uk: 'Поскаржитися на нік?',
      en: 'Report the nickname?',
      es: '¿Denunciar el apodo?',
      'pt-BR': 'Denunciar o apelido?',
      vi: 'Báo cáo biệt danh?',
      id: 'Laporkan nama panggilan?',
      tr: 'Takma adı şikayet et?',
      pl: 'Zgłosić nick?',
    }),
    cancel: triLang(lang, {
      ru: 'Отмена',
      uk: 'Скасувати',
      en: 'Cancel',
      es: 'Cancelar',
      'pt-BR': 'Cancelar',
      vi: 'Hủy',
      id: 'Batal',
      tr: 'İptal',
      pl: 'Anuluj',
    }),
    send: triLang(lang, {
      ru: 'Отправить',
      uk: 'Надіслати',
      en: 'Send',
      es: 'Enviar',
      'pt-BR': 'Enviar',
      vi: 'Gửi',
      id: 'Kirim',
      tr: 'Gönder',
      pl: 'Wyślij',
    }),
  };

  const handleSend = async () => {
    try {
      hapticTap();
      setLoading(false);
      setDone(true);
      hapticSuccess();
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setDone(false);
        handleClose();
      }, 1400);
      const result = await submitUserReport({ reportedUid, reportedName, reason: 'offensive_nickname', screen });
      if (result === 'failed') throw new Error('report_failed');
    } catch {
      setLoading(false);
      setDone(false);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      hapticError();
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Жалоба не отправилась',
        messageUk: 'Скаргу не надіслано',
        messageEs: 'No se pudo enviar el reporte',
      });
    }
  };

  const panelContent = (
    <View style={{
      backgroundColor: t.bgCard,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 320,
      borderWidth: 0,
      borderColor: t.border,
      alignItems: 'center',
      overflow: 'hidden',
    }}>
      <Ionicons name="flag-outline" size={28} color={t.wrong} style={{ marginBottom: 12 }} />

      {done ? (
        <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '700' }}>
          {tx.sent}
        </Text>
      ) : (
        <>
          <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
            {/* зачем: text-integrity — заголовок и ник переносятся, карточка
                растёт; ник — пользовательский контент (provenance user). */}
            <FlowText
              testID="report-user-title"
              provenance="authored"
              style={{
                color: t.textPrimary,
                fontSize: f.h3,
                fontWeight: '700',
                marginBottom: 6,
                textAlign: 'center',
                alignSelf: 'stretch',
              }}
            >
              {tx.title}
            </FlowText>
            <FlowText testID="report-user-name" provenance="user" style={{ color: t.textSecond, fontSize: f.body, marginBottom: 20, textAlign: 'center' }}>
              {reportedName}
            </FlowText>
          </CascadeItem>
          <CascadeItem delay={isHybrid ? LUM.ladder[2] + 96 : 0} reduceMotion={!isHybrid || reduceMotion}>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                onPress={() => {
                  hapticTap();
                  handleClose();
                }}
                style={{
                  flex: 1, paddingVertical: 11, borderRadius: 10,
                  backgroundColor: t.bgPrimary,
                  borderWidth: 0,
                  borderColor: t.border,
                  overflow: 'hidden',
                }}
              >
                <Text style={{ color: t.textSecond, textAlign: 'center', fontSize: f.body }}>
                  {tx.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSend}
                disabled={loading}
                style={{ flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: t.accent, borderWidth: 0, borderColor: 'transparent', overflow: 'hidden' }}
              >
                {false && loading ? <View />
                  : <Text style={{ color: t.correctText, textAlign: 'center', fontWeight: '700', fontSize: f.body }}>
                      {tx.send}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </CascadeItem>
        </>
      )}
    </View>
  );

  if (isHybrid) {
    return (
      <HybridAlertShell
        visible={visible}
        onRequestClose={handleClose}
        shadowColor="#000000"
        backdropColor="rgba(0,0,0,0.53)"
        testID="report-user-modal-hybrid"
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxHeight: '100%' }}>
          <ScrollView decelerationRate="fast"
            style={{ width: '100%' }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {panelContent}
          </ScrollView>
        </KeyboardAvoidingView>
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
            форма жалобы центрировалась во весь рост без прокрутки. С поднятой
            клавиатурой на низком экране кнопка «Отправить» уходила за границу и
            жалобу нельзя было отправить. keyboardShouldPersistTaps сохраняет
            закрытие по тапу мимо формы. */}
        <ScrollView decelerationRate="fast"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.53)' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 18 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <TouchableOpacity
          style={{
            flexGrow: 1,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => {
            hapticTap();
            handleClose();
        }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ width: '100%', maxWidth: 320, alignItems: 'stretch' }}>
          {panelContent}
        </TouchableOpacity>
      </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(ReportUserModal);
