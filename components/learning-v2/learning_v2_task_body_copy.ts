// ═════════════════════════════════════════════════════════════════════════
// learning_v2_task_body_copy.ts — подписи тела задания V2 на 9 языках («Ситуация», «Скажи по-английски», «Ответь», «Скажи так»).
//
// зачем (владелец 22.10, колонка «Предлагаем» learning-v2-tasks-review.html): ситуация — отдельная карточка с подписью «Ситуация»; цель — крупной строкой с короткой подписью
// сверху. Русский — из макета; остальные языки — предложение для «Переводчика». Порядок кортежа: ru, uk, en, es, pt-BR, vi, id, tr, pl.
// ═════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

// зачем: подпись «Скажите по-английски» на экране одна — GOAL_SAY в task_prompt_parts_v1.ts; дубль sayInEnglish с другими vi/id убран (координатор 22.10).
export type LearningV2TaskBodyCopyKey = 'situation' | 'answer' | 'sayThis';

const COPY: Readonly<Record<LearningV2TaskBodyCopyKey, Nine>> = {
  situation: ['Ситуация', 'Ситуація', 'Situation', 'Situación', 'Situação', 'Tình huống', 'Situasi', 'Durum', 'Sytuacja'],
  answer: ['Ответьте', 'Дайте відповідь', 'Answer', 'Responde', 'Responda', 'Hãy trả lời', 'Jawab', 'Cevap ver', 'Odpowiedz'],
  sayThis: ['Скажи так', 'Скажи так', 'Say it like this', 'Dilo así', 'Diga assim', 'Hãy nói thế này', 'Katakan begini', 'Şöyle söyle', 'Powiedz tak'],
};

export const LEARNING_V2_TASK_BODY_COPY: Readonly<Record<LearningV2TaskBodyCopyKey, Nine>> = COPY;

export function learningV2TaskBodyCopy(lang: Lang, key: LearningV2TaskBodyCopyKey): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = COPY[key];
  return triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
}
