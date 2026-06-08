import React, { memo, useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { submitUserReport } from '../app/user_report';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';

interface Props {
  visible: boolean;
  reportedUid: string;
  reportedName: string;
  screen: 'leaderboard' | 'arena';
  lang: Lang;
  onClose: () => void;
  previewOnly?: boolean;
}

function ReportUserModal({ visible, reportedUid, reportedName, screen, lang, onClose, previewOnly = false }: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const isCompassTheme = themeMode === 'compass';
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };
  const tx = {
    preview: triLang(lang, {
      ru: '✅ Превью: без отправки в Firestore',
      uk: '✅ Прев\'ю: без відправки у Firestore',
      es: '✅ Vista previa: sin enviar a Firestore',
      'pt-BR': '✅ Prévia: sem enviar ao Firestore',
      vi: '✅ Bản xem trước: không gửi lên Firestore',
      id: '✅ Pratinjau: tidak dikirim ke Firestore',
      tr: '✅ Önizleme: Firestore’a gönderilmedi',
      pl: '✅ Podgląd: bez wysyłania do Firestore',
    }),
    sent: triLang(lang, {
      ru: '✅ Жалоба отправлена',
      uk: '✅ Скаргу надіслано',
      es: '✅ Reporte enviado',
      'pt-BR': '✅ Denúncia enviada',
      vi: '✅ Đã gửi báo cáo',
      id: '✅ Laporan terkirim',
      tr: '✅ Şikayet gönderildi',
      pl: '✅ Zgłoszenie wysłane',
    }),
    title: triLang(lang, {
      ru: 'Пожаловаться на ник?',
      uk: 'Поскаржитися на нік?',
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
      setLoading(true);
      if (!previewOnly) {
        const result = await submitUserReport({ reportedUid, reportedName, reason: 'offensive_nickname', screen });
        if (result === 'failed') throw new Error('report_failed');
      }
      setLoading(false);
      setDone(true);
      hapticSuccess();
      setTimeout(() => {
        setDone(false);
        handleClose();
      }, 1400);
    } catch {
      setLoading(false);
      hapticError();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.53)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 18,
          }}
          activeOpacity={1}
          onPress={() => {
            hapticTap();
            handleClose();
        }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{
            backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
            borderRadius: isCompassTheme ? 14 : 16,
            padding: 24,
            width: 280,
            borderWidth: 1,
            borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
            alignItems: 'center',
            overflow: 'hidden',
            ...(isCompassTheme ? compassShadow(3) : null),
          }}>
            {isCompassTheme && <CompassDepthSurface radius={14} selected />}
            <Text style={{ fontSize: 32, marginBottom: 12 }}>🚩</Text>

            {done ? (
              <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '700' }}>
                {previewOnly
                  ? tx.preview
                  : tx.sent}
              </Text>
            ) : (
              <>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.86}
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
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.body, marginBottom: 20, textAlign: 'center' }} numberOfLines={1}>
                  {reportedName}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticTap();
                      handleClose();
                    }}
                    style={{
                      flex: 1, paddingVertical: 11, borderRadius: 10,
                      backgroundColor: isCompassTheme ? COMPASS_RICH.charcoal : t.bgPrimary,
                      borderWidth: 1,
                      borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                      overflow: 'hidden',
                      ...(isCompassTheme ? compassShadow(1) : null),
                    }}
                  >
                    {isCompassTheme && <CompassDepthSurface radius={10} quiet />}
                    <Text style={{ color: t.textSecond, textAlign: 'center', fontSize: f.body }}>
                      {tx.cancel}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={loading}
                    style={{ flex: 1, paddingVertical: 11, borderRadius: isCompassTheme ? 9 : 10, backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : t.accent, borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent', overflow: 'hidden', ...(isCompassTheme ? compassShadow(1) : null) }}
                  >
                    {isCompassTheme && <CompassDepthSurface radius={9} cream />}
                    {false && loading ? <View />
                      : <Text style={{ color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, textAlign: 'center', fontWeight: '700', fontSize: f.body }}>
                          {tx.send}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(ReportUserModal);
