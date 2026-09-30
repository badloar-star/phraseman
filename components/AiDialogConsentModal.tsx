/**
 * AiDialogConsentModal — «Включить AI-диалоги?». Показывается ОДИН раз, перед
 * первым входом в ai_dialog_session.tsx / ai_companion_session.tsx (полноэкранный
 * gate, до того как чат вообще отрисован — см. app/ai_dialog_consent_gate.tsx).
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import AiConsentSheetModal from './AiConsentSheetModal';
import DialogueConsentChatReplay from './feature_intro/DialogueConsentChatReplay';
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
}

function AiDialogConsentModal({ visible, lang, onAccept, onDecline, motionVariant }: Props) {
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
  const modalVisible = visible || (devReplay && active && replay.visible);
  const wasModalVisible = useRef(false);
  const [replayKey, setReplayKey] = useState(0);
  useEffect(() => {
    if (modalVisible && !wasModalVisible.current) setReplayKey(current => current + 1);
    wasModalVisible.current = modalVisible;
  }, [modalVisible]);
  const introduction = triLang(lang, {
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
  const title = triLang(lang, {
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
  const body = triLang(lang, {
        ru: 'Практикуй переписки с персонажами, выполняй задачи и получай обратную связь.',
        uk: 'Практикуй листування з персонажами, виконуй завдання й отримуй зворотний зв’язок.',
        en: 'Practise chats with characters, complete goals and get feedback.',
        es: 'Practica chats con personajes, completa objetivos y recibe comentarios.',
        'pt-BR': 'Pratique conversas com personagens, cumpra objetivos e receba feedback.',
        vi: 'Luyện chat với các nhân vật, hoàn thành mục tiêu và nhận phản hồi.',
        id: 'Berlatih chat dengan karakter, selesaikan tujuan, dan dapatkan masukan.',
        tr: 'Karakterlerle yazış, hedefleri tamamla ve geri bildirim al.',
        pl: 'Ćwicz czaty z postaciami, realizuj cele i otrzymuj informację zwrotną.',
      });
  return (
    <AiConsentSheetModal
      visible={modalVisible}
      testIdPrefix="ai-dialog-consent"
      onAccept={previewOnly ? closePreview : onAccept}
      onDecline={previewOnly ? closePreview : onDecline}
      motionVariant={motionVariant}
      illustration={<DialogueConsentChatReplay key={replayKey} lang={lang} variant={replayKey} />}
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
