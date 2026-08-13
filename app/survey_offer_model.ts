import type { Lang } from '../constants/i18n';
import type { ActiveSurvey } from './survey_client';

export type SurveyOfferPhase = 'loading' | 'active' | 'completed' | 'submitting' | 'retryable-error';

export type SurveyOfferSnapshot = {
  surveyId: string;
  title: string;
  description: string;
  questionCount: number;
  rewardShards: number;
  phase: SurveyOfferPhase;
  survey: ActiveSurvey | null;
};

const COMPLETED_COPY: Record<Lang, { title: string; description: string }> = {
  ru: { title: 'Опрос завершён', description: 'Ответы сохранены. Спасибо, что помог улучшить приложение.' },
  uk: { title: 'Опитування завершено', description: 'Відповіді збережено. Дякуємо, що допомагаєш покращити застосунок.' },
  es: { title: 'Encuesta completada', description: 'Respuestas guardadas. Gracias por ayudar a mejorar la aplicación.' },
  'pt-BR': { title: 'Pesquisa concluída', description: 'Respostas salvas. Obrigado por ajudar a melhorar o aplicativo.' },
  vi: { title: 'Đã hoàn thành khảo sát', description: 'Câu trả lời đã được lưu. Cảm ơn bạn đã giúp cải thiện ứng dụng.' },
  id: { title: 'Survei selesai', description: 'Jawaban disimpan. Terima kasih telah membantu meningkatkan aplikasi.' },
  tr: { title: 'Anket tamamlandı', description: 'Yanıtlar kaydedildi. Uygulamayı geliştirmemize yardım ettiğin için teşekkürler.' },
  pl: { title: 'Ankieta ukończona', description: 'Odpowiedzi zapisano. Dziękujemy za pomoc w ulepszaniu aplikacji.' },
};

export function buildServerConfirmedLegacyCompletion(lang: Lang): SurveyOfferSnapshot {
  const copy = COMPLETED_COPY[lang] ?? COMPLETED_COPY.ru;
  return {
    surveyId: 'server-confirmed-completed-survey',
    title: copy.title,
    description: copy.description,
    questionCount: 0,
    rewardShards: 0,
    phase: 'completed',
    survey: null,
  };
}

const ACTIVE_DESCRIPTION: Record<Lang, string> = {
  ru: 'Ответь на вопросы и помоги улучшить приложение.',
  uk: 'Відповідай на запитання та допоможи покращити застосунок.',
  es: 'Responde las preguntas y ayuda a mejorar la aplicación.',
  'pt-BR': 'Responda às perguntas e ajude a melhorar o aplicativo.',
  vi: 'Trả lời câu hỏi và giúp cải thiện ứng dụng.',
  id: 'Jawab pertanyaan dan bantu tingkatkan aplikasi.',
  tr: 'Soruları yanıtla ve uygulamayı geliştirmemize yardım et.',
  pl: 'Odpowiedz na pytania i pomóż ulepszyć aplikację.',
};

export function buildSurveyOfferDescription(lang: Lang): string {
  return ACTIVE_DESCRIPTION[lang] || ACTIVE_DESCRIPTION.ru;
}

export function buildActiveSurveyOffer(input: { survey: ActiveSurvey; lang: Lang }): SurveyOfferSnapshot {
  return {
    surveyId: input.survey.surveyId,
    title: input.survey.title,
    description: buildSurveyOfferDescription(input.lang),
    questionCount: input.survey.questions.length,
    rewardShards: input.survey.rewardShards,
    phase: 'active',
    survey: input.survey,
  };
}

export default function __RouteShim() { return null; }
