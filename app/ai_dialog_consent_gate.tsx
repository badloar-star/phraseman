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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import AiDialogConsentModal from '../components/AiDialogConsentModal';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import {
  hasAiDialogConsentDecision,
  isAiDialogConsentGranted,
  isAiDialogConsentHydrated,
  recordAiDialogConsentToCloud,
  setAiDialogConsent,
  subscribeAiDialogConsent,
} from './ai_dialog_consent';

export default function AiDialogConsentGate({ children, onDeclined }: {
  children: React.ReactNode;
  /** зачем (находка d8b078e8e): сессия, куда пришли со списанной энергией, при отказе от ИИ возвращает её. */
  onDeclined?: () => void;
}) {
  const onDeclinedRef = useRef(onDeclined);
  onDeclinedRef.current = onDeclined;
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const router = useRouter();
  const [ready, setReady] = useState(isAiDialogConsentHydrated() && isAiDialogConsentGranted());
  // зачем (ревью 12.10): onDeclined — только пока чат НЕ показан; отзыв согласия посреди идущей сессии не возвращает её энергию.
  const readyRef = useRef(ready);
  readyRef.current = ready;
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
    if (!readyRef.current) onDeclinedRef.current?.();
  }, []);

  useEffect(() => {
    evaluate();
    return subscribeAiDialogConsent(evaluate);
  }, [evaluate]);

  const onAccept = useCallback(() => {
    setGateVisible(false);
    // зачем (2026-09-20): согласие теперь можно дать и с экрана отказа, поэтому
    // снимаем взведённый флаг — иначе следующий пересчёт из подписки вернул бы
    // экран «AI-диалоги выключены» поверх уже открытого чата.
    setDeclined(false);
    // Optimistic: чат открывается сразу, запись согласия и отправка в облако
    // догоняют фоном; при сбое сети локальное решение уже сохранено.
    setReady(true);
    void setAiDialogConsent('granted').then(() => {
      void recordAiDialogConsentToCloud();
    });
  }, []);

  const onDecline = useCallback(() => {
    setGateVisible(false);
    setDeclined(true);
    onDeclinedRef.current?.();
    void setAiDialogConsent('denied').then(() => {
      void recordAiDialogConsentToCloud();
    });
  }, []);

  const declinedScreen = (
    <View style={[
      styles.declinedScreen,
      { backgroundColor: glass.bg, paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 24) },
    ]}>
      <LinearGradient
        pointerEvents="none"
        colors={[glass.bg, glass.opaqueCard, glass.bg]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.declinedIcon, { backgroundColor: glass.opaqueControl }]} accessible={false}>
        <Ionicons name="sparkles-outline" size={30} color={glass.lightTint} />
      </View>
      <Text accessibilityRole="header" style={[styles.declinedTitle, { color: glass.text }]}>
        {triLang(lang, {
          ru: 'AI-диалоги выключены', uk: 'AI-діалоги вимкнено', en: 'AI dialogues are off', es: 'Diálogos con IA desactivados', 'pt-BR': 'Diálogos com IA desativados', vi: 'Đã tắt hội thoại AI', id: 'Dialog AI dimatikan', tr: 'Yapay zeka diyalogları kapalı', pl: 'Dialogi AI wyłączone',
        })}
      </Text>
      <Text style={[styles.declinedBody, { color: glass.secondary }]}>
        {triLang(lang, {
          ru: 'AI-диалоги выключены в настройках приватности. Их можно включить в любой момент.',
          uk: 'AI-діалоги вимкнено в налаштуваннях конфіденційності. Їх можна ввімкнути будь-коли.',
          en: 'You turned off AI dialogues in Privacy settings. You can turn them back on at any time.',
          es: 'Desactivaste los diálogos con IA en los ajustes de privacidad. Puedes activarlos de nuevo cuando quieras.',
          'pt-BR': 'Você desativou os diálogos com IA nos ajustes de privacidade. Pode ativá-los novamente a qualquer momento.',
          vi: 'Bạn đã tắt hội thoại AI trong phần quyền riêng tư. Bạn có thể bật lại bất cứ lúc nào.',
          id: 'Kamu mematikan dialog AI di pengaturan privasi. Kamu dapat menyalakannya lagi kapan saja.',
          tr: 'Yapay zeka diyaloglarını Gizlilik ayarlarından kapattın. İstediğin zaman yeniden açabilirsin.',
          pl: 'Wyłączono dialogi AI w ustawieniach prywatności. Możesz je włączyć ponownie w każdej chwili.',
        })}
      </Text>
      {/* зачем (репорты #12, #13, #14, #18, 2026-09-20): трое разных людей
          упёрлись в этот экран и написали в поддержку «как включить?». Путь
          был один — уйти в настройки приватности и найти там тумблер.
          Теперь включение живёт здесь: один тап, и чат открывается сразу.
          Настройки остались вторым, более тихим путём. */}
      <TouchableOpacity
        onPress={onAccept}
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, {
          ru: 'Включить AI-диалоги', uk: 'Увімкнути AI-діалоги', en: 'Turn on AI dialogues', es: 'Activar los diálogos con IA', 'pt-BR': 'Ativar os diálogos com IA', vi: 'Bật hội thoại AI', id: 'Nyalakan dialog AI', tr: 'Yapay zeka diyaloglarını aç', pl: 'Włącz dialogi AI',
        })}
        style={[styles.primaryAction, { backgroundColor: glass.accent }]}
      >
        <View style={styles.actionContent}>
          <Ionicons name="sparkles-outline" size={18} color={glass.ctaInk} />
          <Text style={[styles.primaryActionText, { color: glass.accentInk }]}>
            {triLang(lang, { ru: 'Включить', uk: 'Увімкнути', en: 'Turn on', es: 'Activar', 'pt-BR': 'Ativar', vi: 'Bật', id: 'Aktifkan', tr: 'Aç', pl: 'Włącz' })}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => { void hapticTap(); router.push('/privacy_settings' as never); }}
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, {
          ru: 'Открыть настройки приватности', uk: 'Відкрити налаштування конфіденційності', en: 'Open Privacy settings', es: 'Abrir ajustes de privacidad', 'pt-BR': 'Abrir ajustes de privacidade', vi: 'Mở cài đặt quyền riêng tư', id: 'Buka pengaturan privasi', tr: 'Gizlilik ayarlarını aç', pl: 'Otwórz ustawienia prywatności',
        })}
        style={[styles.secondaryAction, { backgroundColor: glass.opaqueControl }]}
      >
        <View style={styles.actionContent}>
          <Ionicons name="settings-outline" size={18} color={glass.text} />
          <Text style={[styles.secondaryActionText, { color: glass.text }]}>
            {triLang(lang, { ru: 'Настройки приватности', uk: 'Параметри конфіденційності', en: 'Privacy settings', es: 'Ajustes de privacidad', 'pt-BR': 'Ajustes de privacidade', vi: 'Cài đặt quyền riêng tư', id: 'Pengaturan privasi', tr: 'Gizlilik ayarları', pl: 'Ustawienia prywatności' })}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => { hapticTap(); safeRouterBack(router, '/(tabs)/lessons' as never); }}
        accessibilityRole="button"
        style={[styles.backAction, { backgroundColor: glass.opaqueCard }]}
      >
        <View style={styles.actionContent}>
          <Ionicons name="chevron-back" size={18} color={glass.secondary} />
          <Text style={[styles.secondaryActionText, { color: glass.secondary }]}>
            {triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {ready ? children : declined ? declinedScreen : <View style={{ flex: 1, backgroundColor: glass.bg }} />}
      <AiDialogConsentModal
        visible={gateVisible}
        lang={lang}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    </>
  );
}

const styles = StyleSheet.create({
  declinedScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  declinedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declinedTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  declinedBody: { fontSize: 16, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  primaryAction: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryAction: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backAction: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16 },
  actionContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryActionText: { fontWeight: '700' },
  secondaryActionText: { fontWeight: '700' },
});
