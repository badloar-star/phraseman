import type { Lang } from '../constants/i18n';

export interface DialogueCompletionEvidence {
  learnerTurn: string;
  note: string;
}

/**
 * Honest local contingency for an unavailable server review. It deliberately
 * reports only facts that are already present in the finished transcript;
 * it never fabricates a language score, correction, or claim about progress.
 */
export interface DialogueCompletionFallback {
  ok: true;
  fallback: true;
  praise: string;
  assessment: string;
  evidence: DialogueCompletionEvidence[];
  corrections: [];
  tip: string;
}

type CompletionCopy = Record<Lang, string>;

function completionCopy(lang: Lang, copy: CompletionCopy): string {
  return copy[lang];
}

/** Do not replace the honest local fallback with an incomplete model review. */
export function isCompletionReviewUsable(value: {
  assessment?: unknown;
  evidence?: unknown;
}): boolean {
  return typeof value.assessment === 'string'
    && value.assessment.trim().length > 0
    && Array.isArray(value.evidence)
    && value.evidence.length > 0;
}

/**
 * A completed screen may exist before the learner sent any message. That is a
 * valid ending state, but it is not evidence that their language was flawless.
 */
export function dialogueCompletionFeedbackMode(value: {
  fallback?: unknown;
  evidence?: unknown;
  corrections?: unknown;
  phrases?: unknown;
}): 'needs_learner_turn' | 'review_unavailable' | 'no_mistakes' | 'review' {
  const evidence = Array.isArray(value.evidence) ? value.evidence : [];
  if (value.fallback === true) {
    return evidence.length === 0 ? 'needs_learner_turn' : 'review_unavailable';
  }
  const corrections = Array.isArray(value.corrections) ? value.corrections : [];
  const phrases = Array.isArray(value.phrases) ? value.phrases : [];
  return corrections.length > 0 || phrases.length > 0 ? 'review' : 'no_mistakes';
}

export function buildDialogueCompletionFallback({
  lang,
  learnerTurns,
}: {
  lang: Lang;
  learnerTurns: readonly string[];
}): DialogueCompletionFallback {
  const count = learnerTurns.length;
  return {
    ok: true,
    fallback: true,
    praise: completionCopy(lang, {
      ru: 'Подробный разбор сейчас не удалось сгенерировать — не будем придумывать оценку.',
      uk: 'Детальний розбір зараз не вдалося згенерувати — не будемо вигадувати оцінку.',
      en: 'A detailed review could not be generated, so we will not invent an assessment.',
      es: 'No se pudo generar un análisis detallado, así que no inventaremos una evaluación.',
      'pt-BR': 'Não foi possível gerar uma análise detalhada, então não vamos inventar uma avaliação.',
      vi: 'Không thể tạo bản phân tích chi tiết, nên chúng tôi sẽ không bịa ra đánh giá.',
      id: 'Ulasan terperinci tidak dapat dibuat, jadi kami tidak akan mengarang penilaian.',
      tr: 'Ayrıntılı değerlendirme oluşturulamadı; bu yüzden bir değerlendirme uydurmayacağız.',
      pl: 'Nie udało się przygotować szczegółowej analizy, więc nie będziemy wymyślać oceny.',
    }),
    assessment: completionCopy(lang, {
      // зачем (VOICE.md): род не угадываем, а «сообщений от тебя — N» верно при любом N.
      ru: `Факт из этой переписки: сообщений от тебя — ${count}.`,
      uk: `Факт із цього листування: повідомлень від тебе — ${count}.`,
      en: `A fact from this conversation: you sent ${count} messages.`,
      es: `Un dato de esta conversación: enviaste ${count} mensajes.`,
      'pt-BR': `Um fato desta conversa: você enviou ${count} mensagens.`,
      vi: `Một dữ kiện từ cuộc trò chuyện này: bạn đã gửi ${count} tin nhắn.`,
      id: `Fakta dari percakapan ini: kamu mengirim ${count} pesan.`,
      tr: `Bu konuşmadan bir gerçek: ${count} mesaj gönderdin.`,
      pl: `Fakt z tej rozmowy: wiadomości od ciebie — ${count}.`,
    }),
    evidence: learnerTurns.slice(0, 3).map((learnerTurn) => ({
      learnerTurn,
      note: completionCopy(lang, {
        ru: 'Твоя реплика из этой переписки.',
        uk: 'Твоя репліка з цього листування.',
        en: 'Your message from this conversation.',
        es: 'Tu mensaje de esta conversación.',
        'pt-BR': 'Sua mensagem desta conversa.',
        vi: 'Tin nhắn của bạn trong cuộc trò chuyện này.',
        id: 'Pesanmu dari percakapan ini.',
        tr: 'Bu konuşmadaki mesajın.',
        pl: 'Twoja wiadomość z tej rozmowy.',
      }),
    })),
    corrections: [],
    tip: completionCopy(lang, {
      ru: 'Открой переписку, чтобы увидеть свои реплики, и попробуй ещё раз позже.',
      uk: 'Відкрий листування, щоб побачити свої репліки, і спробуй ще раз пізніше.',
      en: 'Open the transcript to review your messages, then try again later.',
      es: 'Abre la conversación para revisar tus mensajes e inténtalo de nuevo más tarde.',
      'pt-BR': 'Abra a conversa para revisar suas mensagens e tente novamente mais tarde.',
      vi: 'Mở bản chép lại để xem tin nhắn của bạn rồi thử lại sau.',
      id: 'Buka transkrip untuk meninjau pesanmu, lalu coba lagi nanti.',
      tr: 'Mesajlarını gözden geçirmek için yazışmayı aç, ardından daha sonra tekrar dene.',
      pl: 'Otwórz zapis rozmowy, aby przejrzeć swoje wiadomości, a potem spróbuj ponownie.',
    }),
  };
}
