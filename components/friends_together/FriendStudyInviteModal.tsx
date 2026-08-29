import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import HybridAlertShell from '../modal_fx/HybridAlertShell';
import DuoPressable from '../DuoPressable';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';

type Props = { visible: boolean; onStart: () => void; onDecline: () => void };

function FriendStudyInviteModal({ visible, onStart, onDecline }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
  return (
    <HybridAlertShell visible={visible} onRequestClose={onDecline} testID="friend-study-invite-modal" shadowColor={t.accent}>
      <View style={[styles.card, { backgroundColor: t.bgCard }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{L('Пять минут на английский?', 'П’ять хвилин на англійську?', 'Five minutes of English?', '¿Cinco minutos de inglés?', 'Cinco minutos de inglês?', 'Năm phút học tiếng Anh?', 'Lima menit bahasa Inggris?', 'Beş dakika İngilizce?', 'Pięć minut angielskiego?')}</Text>
        <DuoPressable testID="friend-study-start" onPress={onStart} edgeColor={t.accent} style={[styles.primary, { backgroundColor: t.accent }]}><Text style={[styles.buttonText, { color: t.correctText }]}>{L('Начать занятие', 'Почати заняття', 'Start the lesson', 'Empezar lección', 'Começar lição', 'Bắt đầu bài học', 'Mulai pelajaran', 'Derse başla', 'Zacznij lekcję')}</Text></DuoPressable>
        <DuoPressable testID="friend-study-decline" onPress={onDecline} edgeColor={t.bgSurface2} style={[styles.secondary, { backgroundColor: t.bgSurface2 }]}><Text style={[styles.buttonText, { color: t.textPrimary }]}>{L('Не сейчас', 'Не зараз', 'Not now', 'Ahora no', 'Agora não', 'Không phải bây giờ', 'Jangan sekarang', 'Şimdi değil', 'Nie teraz')}</Text></DuoPressable>
      </View>
    </HybridAlertShell>
  );
}

export default memo(FriendStudyInviteModal);

const styles = StyleSheet.create({
  card: { padding: 24 },
  title: { fontWeight: '700', textAlign: 'center' },
  primary: { minHeight: 52, marginTop: 22, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: 52, marginTop: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
