import { triLang, type Lang } from '../constants/i18n';

export type SemanticExplanationTone = 'wrong' | 'insight' | 'memory' | 'correct';

export type SemanticExplanationBlock = {
  tone: SemanticExplanationTone;
  title: string;
  text: string;
  icon: 'flag' | 'bulb' | 'bookmark' | 'checkmark-circle';
  emphasizeText?: boolean;
};

type BlockInput = {
  lang: Lang;
};

type MistakeBlocksInput = BlockInput & {
  explanation?: string | null;
  userAnswer?: string | null;
  targetAnswer?: string | null;
};

type QuizBlocksInput = BlockInput & {
  correct: boolean;
  pickedAnswer?: string | null;
  correctAnswer?: string | null;
  explanation?: string | null;
};

const clean = (value?: string | null): string => String(value ?? '').trim();

export function semanticToneAccent(tone: SemanticExplanationTone): 'wrong' | 'accent' | 'gold' | 'correct' {
  if (tone === 'wrong') return 'wrong';
  if (tone === 'memory') return 'gold';
  if (tone === 'correct') return 'correct';
  return 'accent';
}

export function semanticExplanationTitle(lang: Lang, tone: SemanticExplanationTone, slot?: 'picked'): string {
  if (slot === 'picked') {
    return triLang(lang, {
      ru: 'Ответ',
      uk: 'Відповідь',
      es: 'Respuesta',
      'pt-BR': 'Resposta',
      vi: 'Câu trả lời',
      id: 'Jawaban',
      tr: 'Cevap',
      pl: 'Odpowiedź',
    });
  }
  if (tone === 'wrong') {
    return triLang(lang, {
      ru: 'Твой выбор',
      uk: 'Твій вибір',
      es: 'Tu elección',
      'pt-BR': 'Sua escolha',
      vi: 'Bạn đã chọn',
      id: 'Pilihanmu',
      tr: 'Seçimin',
      pl: 'Twój wybór',
    });
  }
  if (tone === 'memory') {
    return triLang(lang, {
      ru: 'Запомни',
      uk: "Запам'ятай",
      es: 'Recuerda',
      'pt-BR': 'Lembre',
      vi: 'Ghi nhớ',
      id: 'Ingat',
      tr: 'Aklında tut',
      pl: 'Zapamiętaj',
    });
  }
  if (tone === 'correct') {
    return triLang(lang, {
      ru: 'Правильно',
      uk: 'Правильно',
      es: 'Correcto',
      'pt-BR': 'Correto',
      vi: 'Đúng',
      id: 'Benar',
      tr: 'Doğru',
      pl: 'Poprawnie',
    });
  }
  return triLang(lang, {
    ru: 'Почему',
    uk: 'Чому',
    es: 'Por qué',
    'pt-BR': 'Por quê',
    vi: 'Vì sao',
    id: 'Kenapa',
    tr: 'Neden',
    pl: 'Dlaczego',
  });
}

export function semanticMemoryLine(lang: Lang, degraded?: boolean): string {
  if (degraded) {
    return triLang(lang, {
      ru: 'Это временный ответ. Если нужно, попробуй запросить разбор ещё раз.',
      uk: 'Це тимчасова відповідь. Якщо треба, спробуй запросити пояснення ще раз.',
      es: 'Es una respuesta temporal. Si hace falta, intenta pedir la explicación otra vez.',
      'pt-BR': 'É uma resposta temporária. Se precisar, tente pedir a explicação de novo.',
      vi: 'Đây là câu trả lời tạm thời. Nếu cần, hãy thử yêu cầu giải thích lại.',
      id: 'Ini jawaban sementara. Jika perlu, coba minta penjelasan lagi.',
      tr: 'Bu geçici bir cevap. Gerekirse açıklamayı tekrar iste.',
      pl: 'To tymczasowa odpowiedź. W razie potrzeby poproś o wyjaśnienie jeszcze raz.',
    });
  }
  return triLang(lang, {
    ru: 'Смотри на роль слова в предложении, а не только на похожий перевод.',
    uk: 'Дивись на роль слова в реченні, а не лише на схожий переклад.',
    es: 'Mira la función de la palabra en la frase, no solo una traducción parecida.',
    'pt-BR': 'Observe a função da palavra na frase, não só uma tradução parecida.',
    vi: 'Hãy nhìn vai trò của từ trong câu, không chỉ bản dịch giống nhau.',
    id: 'Lihat fungsi kata dalam kalimat, bukan hanya terjemahan yang mirip.',
    tr: 'Sadece benzer çeviriye değil, kelimenin cümledeki görevine bak.',
    pl: 'Patrz na rolę słowa w zdaniu, nie tylko na podobne tłumaczenie.',
  });
}

function block(
  tone: SemanticExplanationTone,
  title: string,
  text: string,
  emphasizeText = false,
): SemanticExplanationBlock {
  return {
    tone,
    title,
    text,
    emphasizeText,
    icon:
      tone === 'wrong'
        ? 'flag'
        : tone === 'memory'
          ? 'bookmark'
          : tone === 'correct'
            ? 'checkmark-circle'
            : 'bulb',
  };
}

export function buildMistakeExplanationBlocks(input: MistakeBlocksInput): SemanticExplanationBlock[] {
  const userAnswer = clean(input.userAnswer);
  const explanation = clean(input.explanation);
  const targetAnswer = clean(input.targetAnswer);
  const blocks: SemanticExplanationBlock[] = [];

  if (userAnswer) {
    blocks.push(block('wrong', semanticExplanationTitle(input.lang, 'wrong'), userAnswer, true));
  }
  if (explanation) {
    blocks.push(block('insight', semanticExplanationTitle(input.lang, 'insight'), explanation));
  }
  if (explanation && userAnswer && targetAnswer) {
    blocks.push(block('memory', semanticExplanationTitle(input.lang, 'memory'), semanticMemoryLine(input.lang)));
  }
  if (targetAnswer) {
    blocks.push(block('correct', semanticExplanationTitle(input.lang, 'correct'), targetAnswer, true));
  }

  return blocks;
}

export function buildQuizExplanationBlocks(input: QuizBlocksInput): SemanticExplanationBlock[] {
  const pickedAnswer = clean(input.pickedAnswer);
  const correctAnswer = clean(input.correctAnswer);
  const explanation = clean(input.explanation);
  const blocks: SemanticExplanationBlock[] = [];

  if (pickedAnswer) {
    blocks.push(block(input.correct ? 'correct' : 'wrong', semanticExplanationTitle(input.lang, input.correct ? 'correct' : 'wrong', input.correct ? undefined : 'picked'), pickedAnswer, true));
  }
  if (explanation) {
    blocks.push(block('insight', semanticExplanationTitle(input.lang, 'insight'), explanation));
  }
  if (!input.correct && correctAnswer) {
    blocks.push(block('correct', semanticExplanationTitle(input.lang, 'correct'), correctAnswer, true));
  }

  return blocks;
}
