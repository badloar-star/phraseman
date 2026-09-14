import React, { memo, useCallback, useMemo, useState } from 'react';
import { pickAppMessageText, type AppMessageWithState } from '../app/app_messages';
import { triLang } from '../constants/i18n';
import { useLang } from './LangContext';
import ReleaseNotesModal, { type ReleaseNotesAnnouncement } from './ReleaseNotesModal';

type Props = {
  message: AppMessageWithState | null;
  visible: boolean;
  onAcknowledge: (messageId: string) => Promise<void>;
  motionVariant?: 'classic' | 'hybrid';
};

function AppMessageAnnouncementModal({
  message,
  visible,
  onAcknowledge,
  motionVariant = 'classic',
}: Props) {
  const { lang } = useLang();
  const [closing, setClosing] = useState(false);
  const text = message ? pickAppMessageText(message, lang) : null;
  const title = text?.title || triLang(lang, {
    ru: 'Мы готовим кое-что особенное',
    uk: 'Ми готуємо дещо особливе',
    en: 'We are preparing something special',
    es: 'Estamos preparando algo especial',
    'pt-BR': 'Estamos preparando algo especial',
    vi: 'Chúng mình đang chuẩn bị điều đặc biệt',
    id: 'Kami sedang menyiapkan sesuatu yang istimewa',
    tr: 'Özel bir şey hazırlıyoruz',
    pl: 'Przygotowujemy coś wyjątkowego',
  });
  const body = text?.body || '';
  const announcement = useMemo<ReleaseNotesAnnouncement>(() => ({
    title,
    body: body || triLang(lang, {
      ru: 'Мы готовим для тебя кое-что новое — спокойное, полезное и немного неожиданное. Скоро расскажем больше.',
      uk: 'Ми готуємо для тебе дещо нове — спокійне, корисне й трохи несподіване. Незабаром розповімо більше.',
      en: 'We are preparing something new for you — calm, useful, and a little unexpected. More soon.',
      es: 'Estamos preparando algo nuevo para ti: tranquilo, útil y un poco inesperado. Pronto te contaremos más.',
      'pt-BR': 'Estamos preparando algo novo para você — tranquilo, útil e um pouco inesperado. Em breve contaremos mais.',
      vi: 'Chúng mình đang chuẩn bị điều gì đó mới mẻ — nhẹ nhàng, hữu ích và hơi bất ngờ. Sẽ sớm kể bạn nghe thêm.',
      id: 'Kami sedang menyiapkan sesuatu yang baru untukmu — tenang, berguna, dan sedikit tak terduga. Segera kami ceritakan lebih banyak.',
      tr: 'Senin için yeni bir şey hazırlıyoruz — sakin, faydalı ve biraz beklenmedik. Yakında daha fazlasını anlatacağız.',
      pl: 'Przygotowujemy dla Ciebie coś nowego — spokojnego, przydatnego i trochę nieoczekiwanego. Wkrótce opowiemy więcej.',
    }),
    cta: triLang(lang, {
      ru: 'Понятно',
      uk: 'Зрозуміло',
      en: 'Got it',
      es: 'Entendido',
      'pt-BR': 'Entendi',
      vi: 'Đã hiểu',
      id: 'Mengerti',
      tr: 'Anladım',
      pl: 'Rozumiem',
    }),
    close: triLang(lang, {
      ru: 'Закрыть',
      uk: 'Закрити',
      en: 'Close',
      es: 'Cerrar',
      'pt-BR': 'Fechar',
      vi: 'Đóng',
      id: 'Tutup',
      tr: 'Kapat',
      pl: 'Zamknij',
    }),
  }), [body, lang, title]);

  const acknowledge = useCallback(async () => {
    if (!message || closing) return;
    setClosing(true);
    try {
      await onAcknowledge(message.id);
    } finally {
      setClosing(false);
    }
  }, [closing, message, onAcknowledge]);

  return (
    <ReleaseNotesModal
      visible={visible && !!message}
      announcement={announcement}
      showCloseButton
      onClose={() => { if (!closing) void acknowledge(); }}
      motionVariant={motionVariant}
    />
  );
}

export default memo(AppMessageAnnouncementModal);
