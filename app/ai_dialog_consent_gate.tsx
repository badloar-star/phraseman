/**
 * ai_dialog_consent_gate.tsx — общий полноэкранный gate для AI-диалогов
 * (ai_dialog_session.tsx, ai_companion_session.tsx). Оба экрана — отдельные
 * маршруты, не всплывающая карточка внутри уже открытого экрана, поэтому
 * gate здесь не bottom-sheet поверх готового чата, а полноценная замена
 * контента ДО того как чат вообще смонтирован: сессия (с её сложной логикой
 * речевого ввода, разговорного режима, множественных точек отправки) даже не
 * рендерится, пока решение не принято — так не нужно протаскивать consent-
 * проверку в каждую точку callPremiumDialogSend внутри тех файлов.
 *
 * Согласие уже принято → рендерим переданный экран как есть, без задержки.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import AiDialogConsentModal from '../components/AiDialogConsentModal';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import {
  hasAiDialogConsentDecision,
  isAiDialogConsentGranted,
  isAiDialogConsentHydrated,
  recordAiDialogConsentToCloud,
  setAiDialogConsent,
  subscribeAiDialogConsent,
} from './ai_dialog_consent';

export default function AiDialogConsentGate({ children }: { children: React.ReactNode }) {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const [ready, setReady] = useState(isAiDialogConsentHydrated() && isAiDialogConsentGranted());
  const [declined, setDeclined] = useState(false);
  const [gateVisible, setGateVisible] = useState(false);

  const evaluate = useCallback(() => {
    if (!isAiDialogConsentHydrated()) return; // подождём — subscribeAiDialogConsent разбудит повторно.
    if (isAiDialogConsentGranted()) {
      setReady(true);
      setGateVisible(false);
      return;
    }
    if (!hasAiDialogConsentDecision()) {
      setGateVisible(true);
      return;
    }
    // denied — экран не открываем; показываем экран отказа с путём назад.
    setGateVisible(false);
    setDeclined(true);
  }, []);

  useEffect(() => {
    evaluate();
    return subscribeAiDialogConsent(evaluate);
  }, [evaluate]);

  const onAccept = useCallback(() => {
    setGateVisible(false);
    void setAiDialogConsent('granted').then(() => {
      void recordAiDialogConsentToCloud();
    });
    setReady(true);
  }, []);

  const onDecline = useCallback(() => {
    setGateVisible(false);
    setDeclined(true);
    void setAiDialogConsent('denied').then(() => {
      void recordAiDialogConsentToCloud();
    });
  }, []);

  const declinedScreen = (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Text style={{ color: t.textPrimary, fontSize: 17, fontWeight: '800', textAlign: 'center' }}>
        {triLang(lang, {
          ru: 'AI-диалоги выключены', uk: 'AI-діалоги вимкнено', en: 'AI dialogues are off', es: 'Diálogos con IA desactivados', 'pt-BR': 'Diálogos com IA desativados', vi: 'Đã tắt hội thoại AI', id: 'Dialog AI dimatikan', tr: 'Yapay zeka diyalogları kapalı', pl: 'Dialogi AI wyłączone',
        })}
      </Text>
      <Text style={{ color: t.textSecond, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 }}>
        {triLang(lang, {
          ru: 'Вы выключили AI-диалоги в настройках приватности. Их можно включить в любой момент.',
          uk: 'Ви вимкнули AI-діалоги в налаштуваннях конфіденційності. Їх можна ввімкнути будь-коли.',
          en: 'You turned off AI dialogues in Privacy settings. You can turn them back on at any time.',
          es: 'Desactivaste los diálogos con IA en los ajustes de privacidad. Puedes activarlos de nuevo cuando quieras.',
          'pt-BR': 'Você desativou os diálogos com IA nos ajustes de privacidade. Pode ativá-los novamente a qualquer momento.',
          vi: 'Bạn đã tắt hội thoại AI trong phần quyền riêng tư. Bạn có thể bật lại bất cứ lúc nào.',
          id: 'Anda mematikan dialog AI di pengaturan privasi. Anda dapat menyalakannya lagi kapan saja.',
          tr: 'Yapay zeka diyaloglarını Gizlilik ayarlarından kapattınız. İstediğiniz zaman yeniden açabilirsiniz.',
          pl: 'Wyłączono dialogi AI w ustawieniach prywatności. Możesz je włączyć ponownie w każdej chwili.',
        })}
      </Text>
      <TouchableOpacity
        onPress={() => { void hapticTap(); router.push('/privacy_settings' as never); }}
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, {
          ru: 'Открыть настройки приватности для включения AI-диалогов', uk: 'Відкрити налаштування конфіденційності, щоб увімкнути AI-діалоги', en: 'Open Privacy settings to turn on AI dialogues', es: 'Abrir ajustes de privacidad para activar los diálogos con IA', 'pt-BR': 'Abrir ajustes de privacidade para ativar diálogos com IA', vi: 'Mở cài đặt quyền riêng tư để bật hội thoại AI', id: 'Buka pengaturan privasi untuk menyalakan dialog AI', tr: 'Yapay zeka diyaloglarını açmak için Gizlilik ayarlarını aç', pl: 'Otwórz ustawienia prywatności, aby włączyć dialogi AI',
        })}
        style={{ width: '100%', minHeight: 52, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="settings-outline" size={18} color={t.correctText} />
          <Text style={{ color: t.correctText, fontWeight: '800' }}>
            {triLang(lang, { ru: 'Открыть настройки приватности', uk: 'Відкрити налаштування конфіденційності', en: 'Open Privacy settings', es: 'Abrir ajustes de privacidad', 'pt-BR': 'Abrir ajustes de privacidade', vi: 'Mở cài đặt quyền riêng tư', id: 'Buka pengaturan privasi', tr: 'Gizlilik ayarlarını aç', pl: 'Otwórz ustawienia prywatności' })}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => { hapticTap(); safeRouterBack(router, '/(tabs)/lessons' as never); }}
        accessibilityRole="button"
        style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, backgroundColor: t.bgCard }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="chevron-back" size={18} color={t.textPrimary} />
          <Text style={{ color: t.textPrimary, fontWeight: '700' }}>
            {triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {ready ? children : declined ? declinedScreen : <View style={{ flex: 1, backgroundColor: t.bgPrimary }} />}
      <AiDialogConsentModal
        visible={gateVisible}
        lang={lang}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    </>
  );
}
