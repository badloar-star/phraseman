import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { useLang } from '../components/LangContext';
import LegalDocumentSheet from '../components/legal/LegalDocumentSheet';
import { triLang } from '../constants/i18n';
import { KNOWLY_LEGAL_PRIVACY_URL } from './config';
import { openLegalLink } from './open_legal_link';
import { hapticTap } from '../hooks/use-haptics';
import PRIVACY_POLICY_EN from './legal/privacy_policy_en.json';
import PRIVACY_POLICY_EN_IOS from './legal/privacy_policy_en_ios.json';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { safeRouterBack } from './navigation_back';

type PolicySection = { heading: string; body: string };

export default function PrivacyScreen() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const PRIVACY_EN = useMemo(
    () => (effectiveOs === 'ios' ? PRIVACY_POLICY_EN_IOS : PRIVACY_POLICY_EN) as PolicySection[],
    [effectiveOs],
  );
  const { lang } = useLang();
  const close = useCallback(
    () => safeRouterBack(router, '/(tabs)/settings' as never),
    [router],
  );
  const openExternal = useCallback(() => {
    hapticTap();
    openLegalLink(KNOWLY_LEGAL_PRIVACY_URL, 'privacy_screen'); // зачем (R58 #53): при сбое — тост, а не тишина
  }, []);

  return (
    <LegalDocumentSheet
      title={triLang(lang, { ru: 'Политика конфиденциальности', uk: 'Політика конфіденційності', en: 'Privacy Policy', es: 'Política de privacidad', 'pt-BR': 'Política de Privacidade', vi: 'Chính sách quyền riêng tư', id: 'Kebijakan Privasi', tr: 'Gizlilik Politikası', pl: 'Polityka prywatności' })}
      closeAccessibilityLabel={triLang(lang, {
        ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
        vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
      })}
      externalAccessibilityLabel={triLang(lang, {
        ru: 'Открыть политику на сайте Knowly',
        uk: 'Відкрити політику на сайті Knowly',
        en: 'Open the policy on knowlyapps.com',
        es: 'Abrir la política en knowlyapps.com',
        'pt-BR': 'Abrir a política em knowlyapps.com',
        vi: 'Mở chính sách trên knowlyapps.com',
        id: 'Buka kebijakan di knowlyapps.com',
        tr: 'Politikayı knowlyapps.com üzerinde aç',
        pl: 'Otwórz politykę na knowlyapps.com',
      })}
      sections={PRIVACY_EN}
      onClose={close}
      onOpenExternal={openExternal}
    />
  );
}
