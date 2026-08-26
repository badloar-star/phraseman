/**
 * AiDialogConsentModal — «Включить AI-диалоги?». Показывается ОДИН раз, перед
 * первым входом в ai_dialog_session.tsx / ai_companion_session.tsx (полноэкранный
 * gate, до того как чат вообще отрисован — см. app/ai_dialog_consent_gate.tsx).
 */
import React, { memo } from 'react';
import AiConsentSheetModal from './AiConsentSheetModal';
import { triLang, type Lang } from '../constants/i18n';

interface Props {
  visible: boolean;
  lang: Lang;
  onAccept: () => void;
  onDecline: () => void;
  /** зачем: пробрасывает гибрид «Световод + Чекан» в общий движок согласий (см. AiConsentSheetModal). */
  motionVariant?: 'classic' | 'hybrid';
}

function AiDialogConsentModal({ visible, lang, onAccept, onDecline, motionVariant }: Props) {
  return (
    <AiConsentSheetModal
      visible={visible}
      testIdPrefix="ai-dialog-consent"
      onAccept={onAccept}
      onDecline={onDecline}
      motionVariant={motionVariant}
      title={triLang(lang, {
        ru: 'Включить AI-диалоги?',
        uk: 'Увімкнути AI-діалоги?',
        en: 'Turn on AI dialogues?',
        es: '¿Activar los diálogos con IA?',
        'pt-BR': 'Ativar os diálogos com IA?',
        vi: 'Bật hội thoại AI?',
        id: 'Aktifkan dialog AI?',
        tr: 'Yapay zeka diyaloglarını aç?',
        pl: 'Włączyć dialogi AI?',
      })}
      body={triLang(lang, {
        ru: 'Твои сообщения отправляются в OpenAI, чтобы собеседник отвечал.\n\nМожно выключить в настройках в любой момент.',
        uk: 'Твої повідомлення надсилаються в OpenAI, щоб співрозмовник відповідав.\n\nМожна вимкнути в налаштуваннях будь-коли.',
        en: 'Your messages are sent to OpenAI so the character can reply.\n\nYou can turn this off in settings at any time.',
        es: 'Tus mensajes se envían a OpenAI para que el interlocutor responda.\n\nPuedes desactivarlo en ajustes cuando quieras.',
        'pt-BR': 'Suas mensagens são enviadas à OpenAI para que o interlocutor responda.\n\nVocê pode desativar isso nas configurações quando quiser.',
        vi: 'Tin nhắn của bạn được gửi tới OpenAI để bạn trò chuyện có thể trả lời.\n\nCó thể tắt trong cài đặt bất cứ lúc nào.',
        id: 'Pesanmu dikirim ke OpenAI agar lawan bicara bisa membalas.\n\nBisa dimatikan di pengaturan kapan saja.',
        tr: 'Mesajların, konuşma partnerinin yanıt verebilmesi için OpenAI\'ye gönderilir.\n\nİstediğin zaman ayarlardan kapatabilirsin.',
        pl: 'Twoje wiadomości trafiają do OpenAI, aby rozmówca mógł odpowiedzieć.\n\nMożesz to wyłączyć w ustawieniach w dowolnym momencie.',
      })}
      acceptLabel={triLang(lang, {
        ru: 'Включить', uk: 'Увімкнути', en: 'Turn on', es: 'Activar', 'pt-BR': 'Ativar', vi: 'Bật', id: 'Aktifkan', tr: 'Aç', pl: 'Włącz',
      })}
      declineLabel={triLang(lang, {
        ru: 'Не сейчас', uk: 'Не зараз', en: 'Not now', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Không phải bây giờ', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz',
      })}
    />
  );
}

export default memo(AiDialogConsentModal);
