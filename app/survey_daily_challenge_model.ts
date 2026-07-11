import type { Lang } from '../constants/i18n';
import type { ActiveSurvey } from './survey_client';

export type SurveyDailyChallengePhase = 'loading' | 'active' | 'completed' | 'submitting' | 'retryable-error';

export type SurveyDailyChallengeSnapshot = {
  surveyId: string;
  title: string;
  description: string;
  questionCount: number;
  rewardShards: number;
  phase: SurveyDailyChallengePhase;
  survey: ActiveSurvey | null;
};

function count(value: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function computeSurveyDailyChallengeCounts(input: {
  baseTotal: number;
  baseDone: number;
  survey: Pick<SurveyDailyChallengeSnapshot, 'phase' | 'survey'> | null;
}): { total: number; done: number; rewardThreshold: number } {
  const baseTotal = count(input.baseTotal);
  const baseDone = Math.min(baseTotal, count(input.baseDone));
  const total = baseTotal + (input.survey ? 1 : 0);
  const done = Math.min(total, baseDone + (input.survey?.phase === 'completed' ? 1 : 0));
  return { total, done, rewardThreshold: input.survey ? Math.min(3, total) : baseTotal };
}

const COMPLETED_COPY: Record<Lang, { title: string; description: string }> = {
  ru: { title: 'Опрос завершён', description: 'Завершённый опрос учтён в заданиях дня.' },
  uk: { title: 'Опитування завершено', description: 'Завершене опитування враховано в завданнях дня.' },
  es: { title: 'Encuesta completada', description: 'La encuesta completada cuenta para las tareas diarias.' },
  'pt-BR': { title: 'Pesquisa concluída', description: 'A pesquisa concluída conta nas tarefas diárias.' },
  vi: { title: 'Đã hoàn thành khảo sát', description: 'Khảo sát đã hoàn thành được tính vào nhiệm vụ hằng ngày.' },
  id: { title: 'Survei selesai', description: 'Survei yang selesai dihitung dalam tugas harian.' },
  tr: { title: 'Anket tamamlandı', description: 'Tamamlanan anket günlük görevlere sayıldı.' },
  pl: { title: 'Ankieta ukończona', description: 'Ukończona ankieta została zaliczona do zadań dnia.' },
};

export function buildServerConfirmedLegacyCompletion(lang: Lang): SurveyDailyChallengeSnapshot {
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

export default function __RouteShim() { return null; }
