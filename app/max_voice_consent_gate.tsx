import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import MaxVoiceConsentModal from '../components/MaxVoiceConsentModal';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { soundDirector } from '../modules/audio/sound_director';
import { safeRouterBack } from './navigation_back';
import {
  hasAiVoiceConsentDecision,
  isAiVoiceConsentGranted,
  isAiVoiceConsentHydrated,
  recordAiVoiceConsentToCloud,
  setAiVoiceConsent,
  subscribeAiVoiceConsent,
} from './max_voice_consent';

export default function MaxVoiceConsentGate({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  const { theme: t } = useTheme();
  const router = useRouter();
  const [ready, setReady] = useState(isAiVoiceConsentHydrated() && isAiVoiceConsentGranted());
  const [visible, setVisible] = useState(false);

  const leave = useCallback(() => {
    safeRouterBack(router, '/(tabs)/home' as never);
  }, [router]);

  const evaluate = useCallback(() => {
    if (!isAiVoiceConsentHydrated()) return;
    if (isAiVoiceConsentGranted()) {
      setReady(true);
      setVisible(false);
      return;
    }
    if (hasAiVoiceConsentDecision()) {
      setVisible(false);
      leave();
      return;
    }
    setVisible(true);
  }, [leave]);

  useEffect(() => {
    evaluate();
    return subscribeAiVoiceConsent(evaluate);
  }, [evaluate]);

  const accept = useCallback(() => {
    setVisible(false);
    // зачем: согласие дано — звук СРАЗУ, до await записи решения (Optimistic
    // UI); deferAfterVoice в реестре сам отложит его, если рядом уже звучит речь.
    soundDirector.request('pm.max.consent_granted', { scope: 'max-consent' });
    void setAiVoiceConsent('granted').then(() => {
      setReady(true);
      void recordAiVoiceConsentToCloud();
    });
  }, []);

  const decline = useCallback(() => {
    setVisible(false);
    void setAiVoiceConsent('denied').then(() => {
      void recordAiVoiceConsentToCloud();
      leave();
    });
  }, [leave]);

  return (
    <>
      {ready ? children : <View style={{ flex: 1, backgroundColor: t.bgPrimary }} />}
      <MaxVoiceConsentModal visible={visible} lang={lang} onAccept={accept} onDecline={decline} />
    </>
  );
}
