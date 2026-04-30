import React, { useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { submitUserReport } from '../app/user_report';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';

interface Props {
  visible: boolean;
  reportedUid: string;
  reportedName: string;
  screen: 'leaderboard' | 'arena';
  lang: 'ru' | 'uk' | 'es';
  onClose: () => void;
  previewOnly?: boolean;
}

export default function ReportUserModal({ visible, reportedUid, reportedName, screen, lang, onClose, previewOnly = false }: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const isUK = lang === 'uk';
  const isES = lang === 'es';

  const handleSend = async () => {
    try {
      hapticTap();
      setLoading(true);
      if (!previewOnly) {
        await submitUserReport({ reportedUid, reportedName, reason: 'offensive_nickname', screen });
      }
      setLoading(false);
      setDone(true);
      hapticSuccess();
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 1400);
    } catch {
      setLoading(false);
      hapticError();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.53)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={1}
        onPress={() => {
          hapticTap();
          onClose();
        }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{
            backgroundColor: t.bgCard,
            borderRadius: 16,
            padding: 24,
            width: 280,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>🚩</Text>

            {done ? (
              <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '700' }}>
                {previewOnly
                  ? (isES ? '✅ Vista previa: sin enviar a Firestore' : isUK ? '✅ Превʼю: без відправки у Firestore' : '✅ Превью: без отправки в Firestore')
                  : (isES ? '✅ Reporte enviado' : isUK ? '✅ Скаргу надіслано' : '✅ Жалоба отправлена')}
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
                  {isES ? '¿Denunciar el apodo?' : isUK ? 'Поскаржитися на нік?' : 'Пожаловаться на ник?'}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.body, marginBottom: 20, textAlign: 'center' }} numberOfLines={1}>
                  {reportedName}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticTap();
                      onClose();
                    }}
                    style={{
                      flex: 1, paddingVertical: 11, borderRadius: 10,
                      backgroundColor: t.bgPrimary, borderWidth: 1, borderColor: t.border,
                    }}
                  >
                    <Text style={{ color: t.textSecond, textAlign: 'center', fontSize: f.body }}>
                      {isES ? 'Cancelar' : isUK ? 'Скасувати' : 'Отмена'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={loading}
                    style={{ flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: t.accent }}
                  >
                    {loading
                      ? <ActivityIndicator color={t.correctText} size="small" />
                      : <Text style={{ color: t.correctText, textAlign: 'center', fontWeight: '700', fontSize: f.body }}>
                          {isES ? 'Enviar' : isUK ? 'Надіслати' : 'Отправить'}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
