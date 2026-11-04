// Удобство №6 (владелец одобрил 04.11): долгое нажатие на реплику диалога — меню «Скопировать · Поделиться · Медленнее · В карточки».
// Шторка — общий ThemedChoiceModal (новых тяжёлых View нет). «Медленнее» — системный голос на 0,7×; «В карточки» — обычное сохранение карточки
// (виден только когда у реплики есть перевод на языке интерфейса: без него карточка получилась бы без смысла). Строки — docs/work/ux_conveniences_strings_9lang.md.
// Журнал: [REPLY-MENU].
import React, { useCallback, useMemo } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import ThemedChoiceModal, { type ThemedChoice } from '../ThemedChoiceModal';
import { useLang } from '../LangContext';
import { useStudyTarget } from '../StudyTargetContext';
import { useAudio } from '../../hooks/use-audio';
import { hapticTap } from '../../hooks/use-haptics';
import { triLang } from '../../constants/i18n';
import { actionToastTri, emitAppEvent } from '../../app/events';
import { addFlashcard } from '../../hooks/use-flashcards';
import { normalizePackLanguage } from '../../app/flashcards/pack_languages';
import { ttsLocaleForStudyTarget } from '../../app/phrase_target_utils';
import { videoCardSaveToast } from '../../app/flashcards/use_video_card_save';

const LOG = '[REPLY-MENU]';

export type DialogueReplyMenuTarget = Readonly<{ id: string; text: string; translation?: string | null }>;

type Props = Readonly<{ target: DialogueReplyMenuTarget | null; onClose: () => void }>;

function DialogueReplyMenuBase({ target, onClose }: Props) {
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { speak, stop } = useAudio();

  const labels = useMemo(() => ({
    copy: triLang(lang, { ru: 'Скопировать', uk: 'Скопіювати', en: 'Copy', es: 'Copiar', 'pt-BR': 'Copiar', vi: 'Sao chép', id: 'Salin', tr: 'Kopyala', pl: 'Kopiuj' }),
    share: triLang(lang, { ru: 'Поделиться', uk: 'Поділитися', en: 'Share', es: 'Compartir', 'pt-BR': 'Compartilhar', vi: 'Chia sẻ', id: 'Bagikan', tr: 'Paylaş', pl: 'Udostępnij' }),
    slower: triLang(lang, { ru: 'Медленнее', uk: 'Повільніше', en: 'Slower', es: 'Más lento', 'pt-BR': 'Mais devagar', vi: 'Chậm hơn', id: 'Lebih lambat', tr: 'Daha yavaş', pl: 'Wolniej' }),
    toCards: triLang(lang, { ru: 'В карточки', uk: 'У картки', en: 'To cards', es: 'A tarjetas', 'pt-BR': 'Para cartões', vi: 'Vào thẻ', id: 'Ke kartu', tr: 'Kartlara ekle', pl: 'Do kart' }),
  }), [lang]);

  const text = target?.text ?? '';
  const translation = target?.translation?.trim() ? target.translation.trim() : null;
  const messageId = target?.id ?? null;

  const copy = useCallback(() => {
    console.log(`${LOG} copy`, JSON.stringify({ id: messageId, length: text.length })); // guard-ok: действие меню
    Clipboard.setStringAsync(text).catch((error: unknown) => console.warn(`${LOG} copy_failed`, error instanceof Error ? error.message : String(error)));
    onClose();
  }, [messageId, onClose, text]);

  const share = useCallback(() => {
    console.log(`${LOG} share`, JSON.stringify({ id: messageId, length: text.length })); // guard-ok: действие меню
    Share.share({ message: text }).catch((error: unknown) => console.warn(`${LOG} share_failed`, error instanceof Error ? error.message : String(error)));
    onClose();
  }, [messageId, onClose, text]);

  const slower = useCallback(() => {
    console.log(`${LOG} slower`, JSON.stringify({ id: messageId, studyTarget })); // guard-ok: действие меню
    stop();
    speak(text, undefined, { language: ttsLocaleForStudyTarget(studyTarget), systemTtsOnly: true, slowNow: true });
    onClose();
  }, [messageId, onClose, speak, stop, studyTarget, text]);

  const toCards = useCallback(() => {
    onClose();
    if (!translation || !messageId) return;
    const lng = normalizePackLanguage(studyTarget);
    // зачем: мгновенный отклик — окно уже закрыто, сохранение догоняет фоном; отказ называется тостом (лимит Free — как у сохранения из видео)
    void (async () => {
      try {
        const result = await addFlashcard({
          en: text,
          ru: translation,
          uk: translation,
          es: lang === 'es' ? translation : undefined,
          sourceLocales: { [lang]: translation },
          source: 'dialog',
          sourceId: messageId,
          packLanguage: lng,
        }, lng);
        console.log(`${LOG} to_cards`, JSON.stringify({ id: messageId, result })); // guard-ok: итог сохранения
        if (result === 'added' || result === 'duplicate') emitAppEvent('action_toast', actionToastTri('success', ADDED_ONE_TOAST));
        else videoCardSaveToast(result, lang);
      } catch (error) {
        console.warn(`${LOG} to_cards_failed`, error instanceof Error ? error.message : String(error));
        videoCardSaveToast('failed', lang);
      }
    })();
  }, [lang, messageId, onClose, studyTarget, text, translation]);

  const choices = useMemo<ThemedChoice[]>(() => {
    const list: ThemedChoice[] = [
      { label: labels.copy, onPress: () => { hapticTap(); copy(); }, variant: 'primary' },
      { label: labels.share, onPress: () => { hapticTap(); share(); }, variant: 'secondary' },
      { label: labels.slower, onPress: () => { hapticTap(); slower(); }, variant: 'secondary' },
    ];
    if (translation) list.push({ label: labels.toCards, onPress: () => { hapticTap(); toCards(); }, variant: 'secondary' });
    return list;
  }, [copy, labels, share, slower, toCards, translation]);

  return (
    <ThemedChoiceModal
      visible={target !== null}
      title={text.length > 120 ? `${text.slice(0, 117)}…` : text}
      message={translation ?? ''}
      choices={choices}
      onRequestClose={onClose}
    />
  );
}

/** Тост «Добавлено: 1» (строка Переводчика added {n}, n = 1). */
const ADDED_ONE_TOAST = { ru: 'Добавлено: 1', uk: 'Додано: 1', en: 'Added: 1', es: 'Añadido: 1', 'pt-BR': 'Adicionado: 1', vi: 'Đã thêm: 1', id: 'Ditambahkan: 1', tr: 'Eklendi: 1', pl: 'Dodano: 1' };

export const DialogueReplyMenu = React.memo(DialogueReplyMenuBase);
export default DialogueReplyMenu;
