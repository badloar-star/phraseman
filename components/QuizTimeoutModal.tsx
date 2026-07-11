import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { triLang } from '../constants/i18n';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import CompassDepthSurface from './CompassDepthSurface';

// Тайм-аут — не наказание, а «время вышло»: тёплый коралловый акцент, без loss-framing.
const TIMEOUT_ACCENT = '#F0A35E';

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
                borderWidth: 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.borderHighlight,
                maxWidth: 320,
                width: '100%',
                overflow: 'hidden',
              },
              isCompassTheme && compassShadow(3),
            ]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={modalRadius} selected /> : null}
            {/* Верхняя линия-свечение акцента */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 28, right: 28, height: 1.5, backgroundColor: TIMEOUT_ACCENT, opacity: 0.5 }} />
            {/* Медальон-иконка вместо эмодзи ⏰ */}
            <View style={{ width: 70, height: 70, borderRadius: 20, borderWidth: 0, borderColor: `${TIMEOUT_ACCENT}55`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 }}>
              <LinearGradient
                pointerEvents="none"
                colors={[`${TIMEOUT_ACCENT}30`, 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="time-outline" size={34} color={TIMEOUT_ACCENT} />
            </View>
            <Text style={{ color: TIMEOUT_ACCENT, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              {triLang(lang, { ru: 'Время', uk: 'Час', es: 'Tiempo', 'pt-BR': 'Tempo', vi: 'Thời gian', id: 'Waktu', tr: 'Süre', pl: 'Czas' })}
            </Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
              {triLang(lang, {
                ru: 'Время вышло',
                uk: 'Час вийшов',
                es: 'Se acabó el tiempo',
                'pt-BR': 'O tempo acabou',
                vi: 'Hết giờ',
                id: 'Waktu habis',
                tr: 'Süre doldu',
                pl: 'Czas minął',
              })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: 22, marginBottom: hardMode ? 8 : 24 }}>
              {triLang(lang, {
                ru: 'Почти получилось — попробуй ещё раз.',
                uk: 'Майже вийшло — спробуй ще раз.',
                es: 'Casi lo logras: inténtalo de nuevo.',
                'pt-BR': 'Quase lá — tente de novo.',
                vi: 'Suýt rồi — hãy thử lại.',
                id: 'Hampir berhasil — coba lagi.',
                tr: 'Az kaldı — tekrar dene.',
                pl: 'Prawie się udało — spróbuj jeszcze raz.',
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
                  borderRadius: buttonRadius,
                  paddingVertical: 15,
                  paddingHorizontal: 32,
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderWidth: 0,
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent',
                },
                isCompassTheme && compassShadow(1),
              ]}
              onPress={onClose}
            >
              {isCompassTheme ? (
                <CompassDepthSurface radius={buttonRadius} cream />
              ) : (
                <>
                  <LinearGradient
                    pointerEvents="none"
                    colors={['#F6C79E', '#E0883E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.22)' }} />
                </>
              )}
              <Text style={{ color: isCompassTheme ? COMPASS_RICH.textDark : '#3A2206', fontSize: f.body, fontWeight: '800' }}>
                {triLang(lang, {
                  ru: 'Вернуться',
                  uk: 'Повернутися',
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
