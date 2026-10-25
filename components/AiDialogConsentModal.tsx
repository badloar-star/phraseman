/**
 * AiDialogConsentModal — «Включить AI-диалоги?». Показывается ОДИН раз, перед
 * первым входом в ai_dialog_session.tsx / ai_companion_session.tsx (полноэкранный
 * gate, до того как чат вообще отрисован — см. app/ai_dialog_consent_gate.tsx).
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import AiConsentSheetModal from './AiConsentSheetModal';
import DialogueConsentChatReplay from './feature_intro/DialogueConsentChatReplay';
import DialogsConsentTop from './dialogs/scene/DialogsConsentTop';
import { DIALOGS_SCENE_V2_ENABLED } from './dialogs/scene/dialogs_scene_flags';
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
  /** Какой вход ИИ просит согласие: сценарий (ситуация) или «Свободный разговор» — у них разные вступления. */
  mode?: 'scenario' | 'free';
}

function AiDialogConsentModal({ visible, lang, onAccept, onDecline, motionVariant, mode = 'scenario' }: Props) {
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
        uk: 'Спробуй відповісти співрозмовнику в обраній ситуації. Тут можна шукати слова й починати вислів заново — це практика, а не співбесіда.',
        en: 'Try replying to your conversation partner in the chosen situation. You can search for words and start a sentence again — this is practice, not a job interview.',
        es: 'Prueba a responder en la situación elegida. Puedes buscar palabras y volver a empezar la frase: es práctica, no una entrevista de trabajo.',
        'pt-BR': 'Tente responder na situação escolhida. Pode procurar palavras e recomeçar a frase — é prática, não uma entrevista de emprego.',
        vi: 'Thử trả lời trong tình huống đã chọn. Bạn có thể tìm từ và nói lại từ đầu — đây là luyện tập, không phải phỏng vấn xin việc.',
        id: 'Coba jawab lawan bicara dalam situasi yang dipilih. Boleh mencari kata dan mengulang kalimat — ini latihan, bukan wawancara kerja.',
        tr: 'Seçtiğin durumda karşındakine yanıt vermeyi dene. Kelime arayabilir, cümleye yeniden başlayabilirsin — bu pratik, iş görüşmesi değil.',
        pl: 'Spróbuj odpowiedzieć rozmówcy w wybranej sytuacji. Możesz szukać słów i zaczynać zdanie od nowa — to ćwiczenie, nie rozmowa o pracę.',
      });
  // зачем (Переводчик 22.10, пакет ai-dialog-consent-copy-free-mode): у «Свободного разговора» нет «выбранной ситуации» — своё вступление
  const introductionFree = triLang(lang, {
        ru: 'Говори о чём угодно — собеседник поддержит разговор на изучаемом языке. Ошибаться можно: это практика.',
        uk: 'Говори про що завгодно — співрозмовник підтримає розмову мовою, яку вивчаєш. Помилятися можна: це практика.',
        en: 'Talk about anything — your partner keeps the conversation going in the language you’re learning. Mistakes are fine: it’s practice.',
        es: 'Habla de lo que quieras: tu interlocutor sigue la conversación en el idioma que aprendes. Equivocarse está bien: es práctica.',
        'pt-BR': 'Fale sobre o que quiser — o parceiro mantém a conversa no idioma que você aprende. Errar faz parte: é prática.',
        vi: 'Nói về bất cứ điều gì — người đối thoại sẽ tiếp lời bằng ngôn ngữ bạn đang học. Sai cũng không sao: đây là luyện tập.',
        id: 'Bicarakan apa saja — lawan bicara melanjutkan obrolan dalam bahasa yang kamu pelajari. Salah itu wajar: ini latihan.',
        tr: 'İstediğin her şeyden konuş — karşındaki öğrendiğin dilde sohbeti sürdürür. Hata yapmak sorun değil: bu bir pratik.',
        pl: 'Mów o czym chcesz — rozmówca podtrzyma rozmowę w języku, którego się uczysz. Błędy są w porządku: to ćwiczenie.',
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
  // зачем (координатор 11.10, первый выпуск): сторы требуют прямо назвать сторонний ИИ, который получает сообщения;
  // текст совпадает с политикой (раздел 11 «AI features and OpenAI processing») и с окном AiExplainConsentModal.
  // зачем (Ядро e384e0228, Переводчик f4cb658a2, 26.10): в OpenAI — только текст; голос распознаёт сервис телефона (Apple/Google) и может обработать его на своих серверах; сама запись — на телефоне. Совпадает с политикой, раздел 13. Не возвращать «запись голоса остаётся на телефоне» без оговорки.
  const body = triLang(lang, {
        ru: 'Практикуй разговоры с персонажами и свободный разговор, получай обратную связь. Для этого то, что ты пишешь или говоришь, отправляется в OpenAI текстом. Голос распознаёт сервис телефона — Apple или Google, он может обработать его на своих серверах. Сама запись остаётся у тебя.\n\nМожно выключить в настройках в любой момент.',
        uk: 'Практикуй розмови з персонажами й вільну розмову, отримуй зворотний зв’язок. Для цього те, що ти пишеш або кажеш, надсилається в OpenAI текстом. Голос розпізнає сервіс телефона — Apple або Google, він може обробити його на своїх серверах. Сам запис залишається в тебе.\n\nМожна вимкнути в налаштуваннях будь-коли.',
        en: 'Practice conversations with characters and open conversation, and get feedback. To do this, what you type or say is sent to OpenAI as text. Your voice is recognised by your phone’s service — Apple or Google — which may process it on their servers. The recording itself stays with you.\n\nYou can turn this off in settings at any time.',
        es: 'Practica conversaciones con personajes y la conversación libre, y recibe comentarios. Para eso, lo que escribes o dices se envía a OpenAI como texto. Tu voz la reconoce el servicio del teléfono —Apple o Google—, que puede procesarla en sus servidores. La grabación en sí se queda contigo.\n\nPuedes desactivarlo en ajustes cuando quieras.',
        'pt-BR': 'Pratique conversas com personagens e a conversa livre, e receba feedback. Para isso, o que você escreve ou fala é enviado à OpenAI como texto. Sua voz é reconhecida pelo serviço do celular — Apple ou Google —, que pode processá-la nos servidores deles. A gravação em si fica com você.\n\nVocê pode desativar isso nas configurações quando quiser.',
        vi: 'Luyện trò chuyện với các nhân vật và trò chuyện tự do, nhận phản hồi. Để làm vậy, những gì bạn viết hoặc nói được gửi tới OpenAI dưới dạng chữ. Giọng nói được dịch vụ của điện thoại — Apple hoặc Google — nhận dạng và có thể được xử lý trên máy chủ của họ. Bản ghi âm thì vẫn ở chỗ bạn.\n\nCó thể tắt trong cài đặt bất cứ lúc nào.',
        id: 'Berlatih percakapan dengan karakter dan percakapan bebas, dapatkan masukan. Untuk itu, yang kamu tulis atau ucapkan dikirim ke OpenAI sebagai teks. Suaramu dikenali oleh layanan ponsel — Apple atau Google — yang bisa memprosesnya di server mereka. Rekamannya sendiri tetap ada padamu.\n\nBisa dimatikan di pengaturan kapan saja.',
        tr: 'Karakterlerle ve serbest konuşmada pratik yap, geri bildirim al. Bunun için yazdıkların ya da söylediklerin OpenAI\'ye metin olarak gönderilir. Sesini telefonun hizmeti — Apple ya da Google — tanır ve kendi sunucularında işleyebilir. Kaydın kendisi sende kalır.\n\nİstediğin zaman ayarlardan kapatabilirsin.',
        pl: 'Ćwicz rozmowy z postaciami i swobodną rozmowę, otrzymuj informację zwrotną. W tym celu to, co piszesz lub mówisz, trafia do OpenAI jako tekst. Głos rozpoznaje usługa telefonu — Apple lub Google — która może przetwarzać go na swoich serwerach. Samo nagranie zostaje u ciebie.\n\nMożesz to wyłączyć w ustawieniach w dowolnym momencie.',
      });
  return (
    <AiConsentSheetModal
      visible={modalVisible}
      testIdPrefix="ai-dialog-consent"
      onAccept={previewOnly ? closePreview : onAccept}
      onDecline={previewOnly ? closePreview : onDecline}
      motionVariant={motionVariant}
      // зачем (владелец 22.10, вариант «в» листа согласия; координатор): при DIALOGS_SCENE_V2_ENABLED те же пузыри лежат на свету темы с маленьким героем в углу; без флага — как было. Логика согласия не меняется.
      illustration={DIALOGS_SCENE_V2_ENABLED
        ? <DialogsConsentTop><DialogueConsentChatReplay key={replayKey} lang={lang} variant={replayKey} /></DialogsConsentTop>
        : <DialogueConsentChatReplay key={replayKey} lang={lang} variant={replayKey} />}
      introduction={mode === 'free' ? introductionFree : introduction}
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
