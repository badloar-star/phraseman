import type { Lang } from '../constants/i18n';

export type DialogueVoiceDraft = Readonly<{
  uri: string;
  transcript: string;
}>;

export type DialogueVoiceAttachment = Readonly<{
  uri: string;
  /** Used only for the turn sent to the dialogue engine; never rendered in the audio bubble. */
  transcript: string;
}>;

/** Mirrors Dialogue V2 text-turn canonicalization without changing internal whitespace. */
function canonicalVoiceText(value: string): string {
  return value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
}

/**
 * A recording belongs to exactly the ASR draft that created it. If the learner
 * edits the draft, send text instead: attaching a different voice recording
 * would be misleading and makes replay unsafe.
 */
export function buildDialogueVoiceAttachment(
  draft: DialogueVoiceDraft | null,
  submittedText: string,
): DialogueVoiceAttachment | null {
  if (!draft || !draft.uri.startsWith('file://')) return null;
  const transcript = canonicalVoiceText(draft.transcript);
  if (!transcript || transcript !== canonicalVoiceText(submittedText)) return null;
  return { uri: draft.uri, transcript };
}

export function describeDialogueVoiceMessage(lang: Lang): Readonly<{ label: string; action: string }> {
  const copy: Record<Lang, Readonly<{ label: string; action: string }>> = {
    ru: { label: 'Голосовое сообщение', action: 'Воспроизвести голосовое сообщение' },
    uk: { label: 'Голосове повідомлення', action: 'Відтворити голосове повідомлення' },
    en: { label: 'Voice message', action: 'Play voice message' },
    es: { label: 'Mensaje de voz', action: 'Reproducir mensaje de voz' },
    'pt-BR': { label: 'Mensagem de voz', action: 'Reproduzir mensagem de voz' },
    vi: { label: 'Tin nhắn thoại', action: 'Phát tin nhắn thoại' },
    id: { label: 'Pesan suara', action: 'Putar pesan suara' },
    tr: { label: 'Sesli mesaj', action: 'Sesli mesajı oynat' },
    pl: { label: 'Wiadomość głosowa', action: 'Odtwórz wiadomość głosową' },
  };
  return copy[lang];
}
