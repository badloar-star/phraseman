import type { Lang } from '../constants/i18n';
import type { CompassRecommendation } from './compass_recommendation';

export type CompassRecommendationPresentation = Readonly<{
  id: string;
  title: string;
  explanation: string;
  actionLabel: string;
  expectedMinutes: number;
}>;

type Copy = Readonly<{
  reviewPhrases: (count: number) => string;
  reviewExpressions: (count: number) => string;
  continueSession: (id: number) => string;
  strengthenTopic: string;
  actions: Readonly<{
    phrases: string;
    expressions: string;
    session: string;
    topic: string;
  }>;
}>;

const COPY_BY_LANG: Record<Lang, Copy> = {
  ru: {
    reviewPhrases: count => `Повтори ${count} фраз`,
    reviewExpressions: count => `Закрепи ${count} выражений`,
    continueSession: id => `Продолжи сессию ${id}`,
    strengthenTopic: 'Закрепи сложный паттерн',
    actions: { phrases: 'Повторить фразы', expressions: 'Закрепить выражения', session: 'Продолжить сессию', topic: 'Разобрать паттерн' },
  },
  uk: {
    reviewPhrases: count => `Повтори ${count} фраз`,
    reviewExpressions: count => `Закріпи ${count} виразів`,
    continueSession: id => `Продовж сесію ${id}`,
    strengthenTopic: 'Закріпи складний патерн',
    actions: { phrases: 'Повторити фрази', expressions: 'Закріпити вирази', session: 'Продовжити сесію', topic: 'Розібрати патерн' },
  },
  es: {
    reviewPhrases: count => `Repasa ${count} frases`,
    reviewExpressions: count => `Refuerza ${count} expresiones`,
    continueSession: id => `Continúa la sesión ${id}`,
    strengthenTopic: 'Refuerza un patrón difícil',
    actions: { phrases: 'Repasar frases', expressions: 'Reforzar expresiones', session: 'Continuar sesión', topic: 'Practicar patrón' },
  },
  'pt-BR': {
    reviewPhrases: count => `Revise ${count} frases`,
    reviewExpressions: count => `Reforce ${count} expressões`,
    continueSession: id => `Continue a sessão ${id}`,
    strengthenTopic: 'Reforce um padrão difícil',
    actions: { phrases: 'Revisar frases', expressions: 'Reforçar expressões', session: 'Continuar sessão', topic: 'Praticar padrão' },
  },
  vi: {
    reviewPhrases: count => `Ôn lại ${count} cụm từ`,
    reviewExpressions: count => `Củng cố ${count} cách diễn đạt`,
    continueSession: id => `Tiếp tục phiên ${id}`,
    strengthenTopic: 'Củng cố một mẫu khó',
    actions: { phrases: 'Ôn lại cụm từ', expressions: 'Củng cố cách diễn đạt', session: 'Tiếp tục phiên', topic: 'Luyện mẫu câu' },
  },
  id: {
    reviewPhrases: count => `Ulangi ${count} frasa`,
    reviewExpressions: count => `Kuatkan ${count} ungkapan`,
    continueSession: id => `Lanjutkan sesi ${id}`,
    strengthenTopic: 'Kuatkan pola yang sulit',
    actions: { phrases: 'Ulangi frasa', expressions: 'Kuatkan ungkapan', session: 'Lanjutkan sesi', topic: 'Latih pola' },
  },
  tr: {
    reviewPhrases: count => `${count} ifadeyi tekrarla`,
    reviewExpressions: count => `${count} kalıbı pekiştir`,
    continueSession: id => `${id}. oturuma devam et`,
    strengthenTopic: 'Zor bir kalıbı pekiştir',
    actions: { phrases: 'İfadeleri tekrarla', expressions: 'Kalıpları pekiştir', session: 'Oturuma devam et', topic: 'Kalıbı çalış' },
  },
  pl: {
    reviewPhrases: count => `Powtórz ${count} zwrotów`,
    reviewExpressions: count => `Utrwal ${count} wyrażeń`,
    continueSession: id => `Kontynuuj sesję ${id}`,
    strengthenTopic: 'Utrwal trudny schemat',
    actions: { phrases: 'Powtórz zwroty', expressions: 'Utrwal wyrażenia', session: 'Kontynuuj sesję', topic: 'Przećwicz schemat' },
  },
};

function numberParam(recommendation: CompassRecommendation, key: string): number {
  const value = Number(recommendation.reason.params[key]);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * Projects the verified action into UI copy. `whyNow` is deliberately supplied
 * by the bounded explanation pipeline; this presenter never invents a reason.
 */
export function presentCompassRecommendation(
  recommendation: CompassRecommendation,
  lang: Lang,
  whyNow: string,
): CompassRecommendationPresentation {
  const copy = COPY_BY_LANG[lang] ?? COPY_BY_LANG.ru;
  const selected = numberParam(recommendation, 'selectedDue');
  const lessonId = numberParam(recommendation, 'lessonId');
  let title = copy.strengthenTopic;
  let actionLabel = copy.actions.topic;

  if (recommendation.reason.code === 'trainer_due') {
    const phrases = recommendation.reason.params.queue !== 'words';
    title = phrases ? copy.reviewPhrases(selected) : copy.reviewExpressions(selected);
    actionLabel = phrases ? copy.actions.phrases : copy.actions.expressions;
  } else if (recommendation.reason.code === 'continue_started_lesson') {
    title = copy.continueSession(lessonId);
    actionLabel = copy.actions.session;
  }

  return {
    id: recommendation.recommendationId,
    title,
    explanation: whyNow.trim(),
    actionLabel,
    expectedMinutes: recommendation.expectedMinutes,
  };
}

export default function __RouteShim() { return null; }
