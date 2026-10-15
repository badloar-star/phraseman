import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { useLang } from '../components/LangContext';
import LegalDocumentSheet from '../components/legal/LegalDocumentSheet';
import { triLang } from '../constants/i18n';
import { KNOWLY_LEGAL_TERMS_URL } from './config';
import { openLegalLink } from './open_legal_link';
import { hapticTap } from '../hooks/use-haptics';
import TERMS_OF_USE_EN from './legal/terms_of_use_en.json';
import TERMS_OF_USE_EN_IOS from './legal/terms_of_use_en_ios.json';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { safeRouterBack } from './navigation_back';

type PolicySection = { heading: string; body: string };

export default function TermsScreen() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const TERMS_EN = useMemo(
    () => (effectiveOs === 'ios' ? TERMS_OF_USE_EN_IOS : TERMS_OF_USE_EN) as PolicySection[],
    [effectiveOs],
  );
  const { lang } = useLang();
  const close = useCallback(
    () => safeRouterBack(router, '/(tabs)/settings' as never),
    [router],
  );
  const openExternal = useCallback(() => {
    hapticTap();
    openLegalLink(KNOWLY_LEGAL_TERMS_URL, 'terms_screen'); // зачем (R58 #53): при сбое — тост, а не тишина
  }, []);

  return (
    <LegalDocumentSheet
      title={triLang(lang, {
        ru: 'Условия использования', uk: 'Умови використання', en: 'Terms of Use',
        es: 'Términos de uso', 'pt-BR': 'Termos de uso', vi: 'Điều khoản sử dụng',
        id: 'Ketentuan penggunaan', tr: 'Kullanım Koşulları', pl: 'Warunki korzystania',
      })}
      closeAccessibilityLabel={triLang(lang, {
        ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
        vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
      })}
      externalAccessibilityLabel={triLang(lang, {
        ru: 'Открыть условия на сайте Knowly',
        uk: 'Відкрити умови на сайті Knowly',
        en: 'Open the terms on knowlyapps.com',
        es: 'Abrir los términos en knowlyapps.com',
        'pt-BR': 'Abrir os termos em knowlyapps.com',
        vi: 'Mở điều khoản trên knowlyapps.com',
        id: 'Buka ketentuan di knowlyapps.com',
        tr: 'Şartları knowlyapps.com üzerinde aç',
        pl: 'Otwórz warunki na knowlyapps.com',
      })}
      sections={TERMS_EN}
      onClose={close}
      onOpenExternal={openExternal}
    />
  );
}
