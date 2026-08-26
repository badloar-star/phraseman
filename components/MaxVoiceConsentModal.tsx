import React, { memo } from 'react';
import AiConsentSheetModal from './AiConsentSheetModal';
import { triLang, type Lang } from '../constants/i18n';

interface Props {
  visible: boolean;
  lang: Lang;
  onAccept: () => void;
  onDecline: () => void;
}

function MaxVoiceConsentModal({ visible, lang, onAccept, onDecline }: Props) {
  return (
    <AiConsentSheetModal
      visible={visible}
      testIdPrefix="max-voice-consent"
      onAccept={onAccept}
      onDecline={onDecline}
      motionVariant="hybrid"
      title={triLang(lang, {
        ru: 'Разрешить разговоры с MAX?',
        uk: 'Дозволити розмови з MAX?',
        en: 'Allow conversations with MAX?',
        es: '¿Permitir conversaciones con MAX?',
        'pt-BR': 'Permitir conversas com o MAX?',
        vi: 'Cho phép trò chuyện với MAX?',
        id: 'Izinkan percakapan dengan MAX?',
        tr: 'MAX ile konuşmaya izin verilsin mi?',
        pl: 'Zezwolić na rozmowy z MAX-em?',
      })}
      body={triLang(lang, {
        ru: 'Это диалог с искусственным интеллектом, который обрабатывает ваш голос.',
        uk: 'Це діалог зі штучним інтелектом, який обробляє ваш голос.',
        en: 'This is a dialogue with an AI that processes your voice.',
        es: 'Este es un diálogo con una inteligencia artificial que procesa tu voz.',
        'pt-BR': 'Esta é uma conversa com uma inteligência artificial que processa sua voz.',
        vi: 'Đây là cuộc trò chuyện với trí tuệ nhân tạo xử lý giọng nói của bạn.',
        id: 'Ini adalah dialog dengan kecerdasan buatan yang memproses suara Anda.',
        tr: 'Bu, sesinizi işleyen yapay zekâyla yapılan bir konuşmadır.',
        pl: 'To rozmowa ze sztuczną inteligencją, która przetwarza Twój głos.',
      })}
      acceptLabel={triLang(lang, {
        ru: 'Разрешить и продолжить', uk: 'Дозволити й продовжити', en: 'Allow and continue', es: 'Permitir y continuar',
        'pt-BR': 'Permitir e continuar', vi: 'Cho phép và tiếp tục', id: 'Izinkan dan lanjutkan',
        tr: 'İzin ver ve devam et', pl: 'Zezwól i kontynuuj',
      })}
      declineLabel={triLang(lang, {
        ru: 'Не сейчас', uk: 'Не зараз', en: 'Not now', es: 'Ahora no', 'pt-BR': 'Agora não',
        vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz',
      })}
    />
  );
}

export default memo(MaxVoiceConsentModal);
