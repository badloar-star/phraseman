/**
 * AiDialogConsentModal — «Включить AI-диалоги?». Показывается ОДИН раз, перед
 * первым входом в ai_dialog_session.tsx / ai_companion_session.tsx (полноэкранный
 * gate, до того как чат вообще отрисован — см. app/ai_dialog_consent_gate.tsx).
 */
import React, { memo, useEffect, useState } from 'react';
import AiConsentSheetModal from './AiConsentSheetModal';
import DialogueComicStage from './feature_intro/DialogueComicStage';
import { triLang, type Lang } from '../constants/i18n';
import { useDevFeatureIntroReplay } from '../app/feature_intro_dev_replay';
import { featureIntroClose } from '../app/feature_intro_copy';
import { useFeatureIntro } from '../hooks/use_feature_intro';
import { useRuntimeActive } from '../hooks/use_runtime_active';

interface Props {
  visible: boolean;
  lang: Lang;
  onAccept: () => void;
  onDecline: () => void;
  /** зачем: пробрасывает гибрид «Световод + Чекан» в общий движок согласий (см. AiConsentSheetModal). */
  motionVariant?: 'classic' | 'hybrid';
  /** Optional copy used only by the UX review mock; production keeps the registry copy. */
  copyOverride?: {
    introduction: string;
    title: string;
    body: string;
  };
}

function AiDialogConsentModal({ visible, lang, onAccept, onDecline, motionVariant, copyOverride }: Props) {
  const devReplay = useDevFeatureIntroReplay();
  const active = useRuntimeActive();
  const [realConsentShown, setRealConsentShown] = useState(visible);
  useEffect(() => {
    if (!active) setRealConsentShown(false);
    else if (visible) setRealConsentShown(true);
  }, [active, visible]);
  const replay = useFeatureIntro('ai_dialog_consent_dev_preview', devReplay && active && !visible && !realConsentShown);
  // Only the real consent request owns accept/decline. Even during preview exit,
  // disabling the DEV switch must never turn a leftover tap into acceptance.
  const previewOnly = !visible;
  const closePreview = () => replay.dismiss(false);
  const introduction = copyOverride?.introduction ?? triLang(lang, {
        ru: 'Попробуй ответить собеседнику в выбранной ситуации. Здесь можно искать слова и начинать фразу заново — это практика, а не собеседование.',
        uk: 'Спробуй відповісти співрозмовнику в обраній ситуації. Тут можна шукати слова й починати фразу заново — це практика, а не співбесіда.',
        en: 'Try replying to your conversation partner in the chosen situation. You can search for words and start a sentence again — this is practice, not a job interview.',
        es: 'Prueba a responder en la situación elegida. Puedes buscar palabras y volver a empezar la frase: es práctica, no una entrevista de trabajo.',
        'pt-BR': 'Tente responder na situação escolhida. Pode procurar palavras e recomeçar a frase — é prática, não uma entrevista de emprego.',
        vi: 'Thử trả lời trong tình huống đã chọn. Bạn có thể tìm từ và nói lại từ đầu — đây là luyện tập, không phải phỏng vấn xin việc.',
        id: 'Coba jawab lawan bicara dalam situasi yang dipilih. Boleh mencari kata dan mengulang kalimat — ini latihan, bukan wawancara kerja.',
        tr: 'Seçtiğin durumda karşındakine yanıt vermeyi dene. Kelime arayabilir, cümleye yeniden başlayabilirsin — bu pratik, iş görüşmesi değil.',
        pl: 'Spróbuj odpowiedzieć rozmówcy w wybranej sytuacji. Możesz szukać słów i zaczynać zdanie od nowa — to ćwiczenie, nie rozmowa o pracę.',
      });
  const title = copyOverride?.title ?? triLang(lang, {
        ru: 'Включить AI-диалоги?',
        uk: 'Увімкнути AI-діалоги?',
        en: 'Turn on AI dialogues?',
        es: '¿Activar los diálogos con IA?',
        'pt-BR': 'Ativar os diálogos com IA?',
        vi: 'Bật hội thoại AI?',
        id: 'Aktifkan dialog AI?',
        tr: 'Yapay zeka diyaloglarını aç?',
        pl: 'Włączyć dialogi AI?',
      });
  const body = copyOverride?.body ?? triLang(lang, {
        ru: 'Твои сообщения будут отправляться в OpenAI, чтобы собеседник отвечал.\n\nМожно выключить в настройках в любой момент.',
        uk: 'Твої повідомлення надсилатимуться в OpenAI, щоб співрозмовник відповідав.\n\nМожна вимкнути в налаштуваннях будь-коли.',
        en: 'Your messages will be sent to OpenAI so the character can reply.\n\nYou can turn this off in settings at any time.',
        es: 'Tus mensajes se enviarán a OpenAI para que el interlocutor responda.\n\nPuedes desactivarlo en ajustes cuando quieras.',
        'pt-BR': 'Suas mensagens serão enviadas à OpenAI para que o interlocutor responda.\n\nVocê pode desativar isso nas configurações quando quiser.',
        vi: 'Tin nhắn của bạn sẽ được gửi tới OpenAI để bạn trò chuyện có thể trả lời.\n\nCó thể tắt trong cài đặt bất cứ lúc nào.',
        id: 'Pesanmu akan dikirim ke OpenAI agar lawan bicara bisa membalas.\n\nBisa dimatikan di pengaturan kapan saja.',
        tr: 'Mesajların, konuşma partnerinin yanıt verebilmesi için OpenAI\'ye gönderilecek.\n\nİstediğin zaman ayarlardan kapatabilirsin.',
        pl: 'Twoje wiadomości będą wysyłane do OpenAI, aby rozmówca mógł odpowiedzieć.\n\nMożesz to wyłączyć w ustawieniach w dowolnym momencie.',
      });
  return (
    <AiConsentSheetModal
      visible={visible || (devReplay && active && replay.visible)}
      testIdPrefix="ai-dialog-consent"
      onAccept={previewOnly ? closePreview : onAccept}
      onDecline={previewOnly ? closePreview : onDecline}
      motionVariant={motionVariant}
      illustration={<DialogueComicStage />}
      introduction={introduction}
      title={title}
      body={body}
      acceptLabel={previewOnly ? featureIntroClose(lang) : triLang(lang, {
        ru: 'Включить', uk: 'Увімкнути', en: 'Turn on', es: 'Activar', 'pt-BR': 'Ativar', vi: 'Bật', id: 'Aktifkan', tr: 'Aç', pl: 'Włącz',
      })}
      declineLabel={triLang(lang, {
        ru: 'Не сейчас', uk: 'Не зараз', en: 'Not now', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Không phải bây giờ', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz',
      })}
    />
  );
}

export default memo(AiDialogConsentModal);
