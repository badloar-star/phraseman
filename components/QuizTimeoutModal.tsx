import React, { memo } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { triLang } from '../constants/i18n';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import CompassDepthSurface from './CompassDepthSurface';

interface Props {
  visible: boolean;
  hardMode: boolean;
  onClose: () => void;
}

function QuizTimeoutModal({ visible, hardMode, onClose }: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();
  const isCompassTheme = false;
  const modalRadius = isCompassTheme ? 10 : 24;
  const buttonRadius = isCompassTheme ? 9 : 14;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              {
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderRadius: modalRadius,
                padding: 28,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.borderHighlight,
                maxWidth: 320,
                width: '100%',
                overflow: 'hidden',
              },
              isCompassTheme && compassShadow(3),
            ]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={modalRadius} selected /> : null}
            <Text style={{ fontSize: 52, marginBottom: 12 }}>⏰</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
              {triLang(lang, {
                ru: 'Время вышло!',
                uk: 'Час вийшов!',
                es: '¡Se acabó el tiempo!',
                'pt-BR': 'O tempo acabou!',
                vi: 'Hết giờ!',
                id: 'Waktu habis!',
                tr: 'Süre doldu!',
                pl: 'Czas minął!',
              })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: 22, marginBottom: hardMode ? 8 : 24 }}>
              {triLang(lang, {
                ru: 'Почти! Попробуй ещё раз.',
                uk: 'Дуже шкода 😔 Спробуй ще раз!',
                es: '¡Qué pena! 😔 ¡Inténtalo de nuevo!',
                'pt-BR': 'Que pena 😔 Tente de novo!',
                vi: 'Tiếc quá 😔 Hãy thử lại!',
                id: 'Sayang sekali 😔 Coba lagi!',
                tr: 'Üzgünüm 😔 Tekrar dene!',
                pl: 'Szkoda 😔 Spróbuj jeszcze raz!',
              })}
            </Text>
            {hardMode && (
              <Text style={{ color: t.textSecond, fontSize: f.sub, textAlign: 'center', lineHeight: 20, marginBottom: 24, opacity: 0.85 }}>
                {triLang(lang, {
                  ru: 'Попробуй уровень полегче или выключи ручной ввод в настройках.',
                  uk: 'Підказка: спробуй вибрати рівень легше або вимкни ручне введення в налаштуваннях.',
                  es: 'Sugerencia: prueba un nivel más fácil o desactiva el teclado en Ajustes.',
                  'pt-BR': 'Dica: tente escolher um nível mais fácil ou desative a digitação manual nas configurações.',
                  vi: 'Gợi ý: thử chọn cấp độ dễ hơn hoặc tắt nhập thủ công trong cài đặt.',
                  id: 'Tips: coba pilih level yang lebih mudah atau matikan input manual di pengaturan.',
                  tr: 'İpucu: daha kolay bir seviye seçmeyi veya ayarlardan manuel yazmayı kapatmayı dene.',
                  pl: 'Wskazówka: wybierz łatwiejszy poziom albo wyłącz ręczne wpisywanie w ustawieniach.',
                })}
              </Text>
            )}
            <TouchableOpacity
              style={[
                {
                  backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : t.accent,
                  borderRadius: buttonRadius,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  width: '100%',
                  alignItems: 'center',
                  overflow: 'hidden',
                  borderWidth: isCompassTheme ? 1 : 0,
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent',
                },
                isCompassTheme && compassShadow(1),
              ]}
              onPress={onClose}
            >
              {isCompassTheme ? <CompassDepthSurface radius={buttonRadius} cream /> : null}
              <Text style={{ color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Понятно',
                  uk: 'Зрозуміло',
                  es: 'Entendido',
                  'pt-BR': 'Entendi',
                  vi: 'Đã hiểu',
                  id: 'Mengerti',
                  tr: 'Anladım',
                  pl: 'Rozumiem',
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default memo(QuizTimeoutModal);
