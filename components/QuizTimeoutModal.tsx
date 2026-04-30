import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { triLang } from '../constants/i18n';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';

interface Props {
  visible: boolean;
  hardMode: boolean;
  onClose: () => void;
}

export default function QuizTimeoutModal({ visible, hardMode, onClose }: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: t.borderHighlight, maxWidth: 320, width: '100%' }}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>⏰</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
              {triLang(lang, { ru: 'Время вышло!', uk: 'Час вийшов!', es: '¡Se acabó el tiempo!' })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: 22, marginBottom: hardMode ? 8 : 24 }}>
              {triLang(lang, {
                ru: 'Очень жаль 😔 Попробуй ещё раз!',
                uk: 'Дуже шкода 😔 Спробуй ще раз!',
                es: '¡Qué pena! 😔 ¡Inténtalo de nuevo!',
              })}
            </Text>
            {hardMode && (
              <Text style={{ color: t.textSecond, fontSize: f.sub, textAlign: 'center', lineHeight: 20, marginBottom: 24, opacity: 0.85 }}>
                {triLang(lang, {
                  ru: 'Подсказка: попробуй выбрать уровень полегче или выключи ручной ввод в настройках.',
                  uk: 'Підказка: спробуй вибрати рівень легше або вимкни ручне введення в налаштуваннях.',
                  es: 'Sugerencia: prueba un nivel más fácil o desactiva el teclado en Ajustes.',
                })}
              </Text>
            )}
            <TouchableOpacity
              style={{ backgroundColor: t.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' }}
              onPress={onClose}
            >
              <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido' })}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
