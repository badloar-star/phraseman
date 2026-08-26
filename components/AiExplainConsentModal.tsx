/**
 * AiExplainConsentModal — «Включить ИИ-разбор ошибок?» (текст под эту фичу,
 * механика — в общем AiConsentSheetModal). Показывается ОДИН раз, перед самым
 * первым автопоказом AiMistakeCard (см. app/use_mistake_explain.ts: consentGate).
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

function AiExplainConsentModal({ visible, lang, onAccept, onDecline, motionVariant }: Props) {
  return (
    <AiConsentSheetModal
      visible={visible}
      testIdPrefix="ai-explain-consent"
      onAccept={onAccept}
      onDecline={onDecline}
      motionVariant={motionVariant}
      title={triLang(lang, {
        ru: 'Включить ИИ-разбор ошибок?',
        uk: 'Увімкнути ІІ-розбір помилок?',
        en: 'Turn on AI mistake analysis?',
        es: '¿Activar el análisis de errores con IA?',
        'pt-BR': 'Ativar a análise de erros com IA?',
        vi: 'Bật phân tích lỗi bằng AI?',
        id: 'Aktifkan analisis kesalahan AI?',
        tr: 'Yapay zeka hata analizini aç?',
        pl: 'Włączyć analizę błędów AI?',
      })}
      body={triLang(lang, {
        ru: 'ИИ объяснит ошибку своими словами. Для этого ответ отправляется в OpenAI.\n\nМожно выключить в настройках в любой момент.',
        uk: 'ІІ пояснить помилку своїми словами. Для цього відповідь надсилається в OpenAI.\n\nМожна вимкнути в налаштуваннях будь-коли.',
        en: 'AI will explain the mistake in its own words. To do this, your answer is sent to OpenAI.\n\nYou can turn this off in settings at any time.',
        es: 'La IA explicará el error con sus palabras. Para eso, tu respuesta se envía a OpenAI.\n\nPuedes desactivarlo en ajustes cuando quieras.',
        'pt-BR': 'A IA vai explicar o erro com suas próprias palavras. Para isso, sua resposta é enviada à OpenAI.\n\nVocê pode desativar isso nas configurações quando quiser.',
        vi: 'AI sẽ giải thích lỗi bằng lời riêng. Để làm vậy, câu trả lời của bạn được gửi tới OpenAI.\n\nCó thể tắt trong cài đặt bất cứ lúc nào.',
        id: 'AI akan menjelaskan kesalahan dengan bahasanya sendiri. Untuk itu, jawabanmu dikirim ke OpenAI.\n\nBisa dimatikan di pengaturan kapan saja.',
        tr: 'Yapay zeka hatayı kendi cümleleriyle açıklayacak. Bunun için cevabın OpenAI\'ye gönderilir.\n\nİstediğin zaman ayarlardan kapatabilirsin.',
        pl: 'AI wyjaśni błąd własnymi słowami. W tym celu Twoja odpowiedź trafia do OpenAI.\n\nMożesz to wyłączyć w ustawieniach w dowolnym momencie.',
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

export default memo(AiExplainConsentModal);
