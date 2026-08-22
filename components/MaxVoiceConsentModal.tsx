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
        es: '¿Permitir conversaciones con MAX?',
        'pt-BR': 'Permitir conversas com o MAX?',
        vi: 'Cho phép trò chuyện với MAX?',
        id: 'Izinkan percakapan dengan MAX?',
        tr: 'MAX ile konuşmaya izin verilsin mi?',
        pl: 'Zezwolić na rozmowy z MAX-em?',
      })}
      body={triLang(lang, {
        ru: 'Голос обрабатывается во время разговора. После него сохраняются только разбор и небольшая учебная память. Аудио и полный текст разговора не сохраняются.',
        uk: 'Голос обробляється під час розмови. Після неї зберігаються лише розбір і невелика навчальна пам’ять. Аудіо й повний текст розмови не зберігаються.',
        es: 'La voz se procesa durante la conversación. Después solo se guardan la revisión y una pequeña memoria de aprendizaje. No guardamos el audio ni la transcripción completa.',
        'pt-BR': 'A voz é processada durante a conversa. Depois, salvamos apenas a revisão e uma pequena memória de aprendizagem. Não salvamos o áudio nem a transcrição completa.',
        vi: 'Giọng nói được xử lý trong lúc trò chuyện. Sau đó chỉ lưu phần nhận xét và một bộ nhớ học tập nhỏ. Không lưu âm thanh hay toàn bộ bản chép lời.',
        id: 'Suara diproses selama percakapan. Setelahnya, hanya ulasan dan sedikit memori belajar yang disimpan. Audio dan transkrip lengkap tidak disimpan.',
        tr: 'Ses, konuşma sırasında işlenir. Sonrasında yalnızca değerlendirme ve küçük bir öğrenme hafızası saklanır. Ses ve tam konuşma dökümü saklanmaz.',
        pl: 'Głos jest przetwarzany podczas rozmowy. Później zapisujemy tylko podsumowanie i małą pamięć nauki. Nie zapisujemy audio ani pełnej transkrypcji.',
      })}
      acceptLabel={triLang(lang, {
        ru: 'Разрешить и продолжить', uk: 'Дозволити й продовжити', es: 'Permitir y continuar',
        'pt-BR': 'Permitir e continuar', vi: 'Cho phép và tiếp tục', id: 'Izinkan dan lanjutkan',
        tr: 'İzin ver ve devam et', pl: 'Zezwól i kontynuuj',
      })}
      declineLabel={triLang(lang, {
        ru: 'Не сейчас', uk: 'Не зараз', es: 'Ahora no', 'pt-BR': 'Agora não',
        vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz',
      })}
    />
  );
}

export default memo(MaxVoiceConsentModal);
