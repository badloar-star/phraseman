import React, { memo, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import KitTouchable from './KitTouchable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlowText } from './text-integrity/FlowText';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette'; // зачем: окно жалобы на токенах стекла (overlays «Жалоба на ник»)
import { submitUserReport, type UserReportReason } from '../app/user_report';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { emitAppEvent } from '../app/events';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';

const EXEMPT_COLOR_1 = '#000000'; // theme-exempt: тень и затемнение окна — постоянные
const EXEMPT_COLOR_2 = 'rgba(0,0,0,0.53)'; // theme-exempt: тень и затемнение окна — постоянные
const EXEMPT_COLOR_3 = 'rgba(0,0,0,0.53)'; // theme-exempt: тень и затемнение окна — постоянные

interface Props {
  visible: boolean;
  reportedUid: string;
  reportedName: string;
  screen: 'leaderboard' | 'profile';
  lang: Lang;
  onClose: () => void;
  /**
   * Свой текст визитки «Про» (2026-09-30). Непустой — в окне появляется выбор причины:
   * ник или «неприемлемый текст визитки»; снимок текста уходит вместе с жалобой.
   */
  reportedProfileText?: string;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
}

function ReportUserModal({ visible, reportedUid, reportedName, screen, lang, onClose, motionVariant = 'hybrid', reportedProfileText = '' }: Props) {
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const hasProfileText = reportedProfileText.trim().length > 0;
  const [reason, setReason] = useState<UserReportReason>('offensive_nickname');
  useEffect(() => {
    if (visible) setReason('offensive_nickname');
  }, [visible]);
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
      es: 'Denuncia enviada',
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
      tr: 'Takma ad şikayet edilsin mi?',
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
    titlePlayer: triLang(lang, {
      ru: 'Пожаловаться на игрока?',
      uk: 'Поскаржитися на гравця?',
      en: 'Report the player?',
      es: '¿Denunciar al jugador?',
      'pt-BR': 'Denunciar o jogador?',
      vi: 'Báo cáo người chơi?',
      id: 'Laporkan pemain?',
      tr: 'Oyuncu şikayet edilsin mi?',
      pl: 'Zgłosić gracza?',
    }),
    reasonNick: triLang(lang, {
      ru: 'Ник',
      uk: 'Нік',
      en: 'Nickname',
      es: 'Apodo',
      'pt-BR': 'Apelido',
      vi: 'Biệt danh',
      id: 'Nama panggilan',
      tr: 'Takma ad',
      pl: 'Nick',
    }),
    reasonText: triLang(lang, {
      ru: 'Неприемлемый текст визитки',
      uk: 'Неприйнятний текст візитки',
      en: 'Inappropriate card text',
      es: 'Texto de tarjeta inapropiado',
      'pt-BR': 'Texto do cartão impróprio',
      vi: 'Nội dung thẻ không phù hợp',
      id: 'Teks kartu tidak pantas',
      tr: 'Uygunsuz kart metni',
      pl: 'Nieodpowiedni tekst wizytówki',
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

  // зачем: «Отправить» меняет состояние на «готово» сразу (Optimistic UI), но state обновляется после
  // рендера — второй тап в том же кадре отправил бы жалобу дважды; ref-замок синхронный.
  const sendInFlightRef = useRef(false);
  const handleSend = async () => {
    if (sendInFlightRef.current) {
      console.warn('[REPORT-USER] send: уже в пути — повторный тап пропущен');
      return;
    }
    sendInFlightRef.current = true;
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
      const chosen: UserReportReason = hasProfileText ? reason : 'offensive_nickname';
      const result = await submitUserReport({
        reportedUid,
        reportedName,
        reason: chosen,
        screen,
        ...(chosen === 'offensive_profile_text' ? { reportedText: reportedProfileText.trim() } : {}),
      });
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
        messageEs: 'No se pudo enviar la denuncia',
        messageEn: "Couldn't send the report",
        messagePtBr: 'Não foi possível enviar a denúncia',
        messageVi: 'Không gửi được báo cáo',
        messageId: 'Laporan gagal dikirim',
        messageTr: 'Şikayet gönderilemedi',
        messagePl: 'Nie udało się wysłać zgłoszenia',
      });
    } finally {
      sendInFlightRef.current = false;
    }
  };

  const panelContent = (
    <View style={{
      // зачем (overlay.css `.ov-modal`): радиус 26, поля 22, окно во всю ширину с отступами 22 от краёв.
      backgroundColor: glass.opaqueSheet,
      borderRadius: 26,
      padding: 22,
      width: '100%',
      maxWidth: 440,
      alignItems: 'center',
      overflow: 'hidden',
    }}>
      {/* зачем (`.ov-stage.ov-stage-small`): значок в плитке 76/24 светлым тоном; после отправки — галочка. */}
      <View style={{ width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, marginTop: 4, marginBottom: 18 }}>
        <Ionicons name={done ? 'checkmark' : 'flag-outline'} size={28} color={glass.text} />
      </View>

      {done ? (
        <Text style={{ color: glass.text, fontSize: 25, lineHeight: 31, fontWeight: '800', textAlign: 'center' }}>
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
                color: glass.text,
                // зачем (`.ov-title`): 25/31.
                fontSize: 25,
                lineHeight: 31,
                fontWeight: '800',
                marginBottom: 6,
                textAlign: 'center',
                alignSelf: 'stretch',
              }}
            >
              {hasProfileText ? tx.titlePlayer : tx.title}
            </FlowText>
            <FlowText testID="report-user-name" provenance="user" style={{ color: glass.secondary, fontSize: f.body, marginBottom: hasProfileText ? 12 : 20, textAlign: 'center' }}>
              {reportedName}
            </FlowText>
            {hasProfileText ? (
              <View style={{ alignSelf: 'stretch', gap: 8, marginBottom: 16 }}>
                {([['offensive_nickname', tx.reasonNick], ['offensive_profile_text', tx.reasonText]] as const).map(([value, label]) => {
                  const on = reason === value;
                  return (
                    <KitTouchable
                      key={value}
                      testID={`report-user-reason-${value}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => { hapticTap(); setReason(value); }}
                      style={{
                        minHeight: 44, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center',
                        backgroundColor: on ? glass.selected : 'transparent',
                      }}
                    >
                      <Text style={{ color: on ? glass.text : glass.secondary, fontSize: f.body, fontWeight: on ? '700' : '500' }}>{label}</Text>
                      {value === 'offensive_profile_text' && on ? (
                        <FlowText testID="report-user-profile-text" provenance="user" style={{ color: glass.secondary, fontSize: f.body, marginTop: 4 }}>
                          {`«${reportedProfileText.trim()}»`}
                        </FlowText>
                      ) : null}
                    </KitTouchable>
                  );
                })}
              </View>
            ) : null}
          </CascadeItem>
          <CascadeItem delay={isHybrid ? LUM.ladder[2] + 96 : 0} reduceMotion={!isHybrid || reduceMotion}>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <KitTouchable
                onPress={() => {
                  hapticTap();
                  handleClose();
                }}
                style={{
                  flex: 1, minHeight: 48, paddingVertical: 11, borderRadius: 24, justifyContent: 'center',
                  backgroundColor: glass.selected,
                  overflow: 'hidden',
                }}
              >
                <Text style={{ color: glass.text, textAlign: 'center', fontSize: f.body, fontWeight: '700' }}>
                  {tx.cancel}
                </Text>
              </KitTouchable>
              <KitTouchable
                onPress={handleSend}
                disabled={loading}
                style={{ flex: 1, minHeight: 48, paddingVertical: 11, borderRadius: 24, justifyContent: 'center', backgroundColor: glass.accent, overflow: 'hidden' }}
              >
                {false && loading ? <View />
                  : <Text style={{ color: glass.accentInk, textAlign: 'center', fontWeight: '700', fontSize: f.body }}>
                      {tx.send}
                    </Text>
                }
              </KitTouchable>
            </View>
          </CascadeItem>
        </>
      )}
    </View>
  );

  if (isHybrid) {
    return (
      <HybridAlertShell scrollContent={false}
        visible={visible}
        onRequestClose={handleClose}
        shadowColor={EXEMPT_COLOR_1}
        backdropColor={EXEMPT_COLOR_2}
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
          style={{ flex: 1, backgroundColor: EXEMPT_COLOR_3 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 18 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <KitTouchable
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
        <KitTouchable activeOpacity={1} onPress={() => {}} style={{ width: '100%', maxWidth: 320, alignItems: 'stretch' }}>
          {panelContent}
        </KitTouchable>
      </KitTouchable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(ReportUserModal);
