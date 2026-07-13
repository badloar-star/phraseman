import type { SoftUpsellOpportunity, SoftUpsellTrigger } from './soft_upsell_core';

export type SoftUpsellLocale = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl' | 'en';
export type SoftUpsellCategory = 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'reading';

export type SoftUpsellCopy = Readonly<{
  proof: string;
  title: string;
  body: string;
  ctaLabel: string;
}>;

type CategoryRate = Readonly<{ category: SoftUpsellCategory; attempts: number; rate: number }>;
type CategoryErrorRate = Readonly<{ category: SoftUpsellCategory; attempts: number; errorRate: number }>;
export type SoftUpsellMeasuredSignal =
  | Readonly<{ kind: 'weekly'; strong: CategoryRate; weak: CategoryRate }>
  | Readonly<{ kind: 'trainer'; weak: CategoryErrorRate; next: CategoryErrorRate }>;

const RU_COPY: Record<SoftUpsellTrigger, SoftUpsellCopy> = {
  first_lesson: {
    proof: 'УРОК 1 ЗАВЕРШЁН',
    title: 'Ты уже начал. Теперь не теряй темп.',
    body: 'Plus превратит первый результат в понятный маршрут: что учить сегодня, что повторять и как быстрее перейти к живой речи.',
    ctaLabel: 'Продолжить с моим планом',
  },
  free_lessons_complete: {
    proof: 'БЕСПЛАТНЫЙ СТАРТ ПРОЙДЕН',
    title: 'База готова. Дальше начинается твой английский.',
    body: 'Ты прошёл бесплатный старт. Plus откроет полный маршрут, разговорную практику и повторение слабых мест — без случайных упражнений.',
    ctaLabel: 'Открыть полный маршрут',
  },
  weekly_review: {
    proof: 'ТВОЯ НЕДЕЛЯ В ЦИФРАХ',
    title: 'Неделя уже показала, что работает для тебя.',
    body: 'Plus соберёт следующие уроки и повторы вокруг твоего реального прогресса — без случайного выбора упражнений.',
    ctaLabel: 'Усилить слабое место',
  },
  second_ai_dialogue: {
    proof: '2 РАЗГОВОРА ЗАВЕРШЕНЫ',
    title: 'Ты завершил два разговора. Не останавливай практику.',
    body: 'Plus продолжит разговорную практику в реальных ситуациях и поможет довести знакомые фразы до автоматизма.',
    ctaLabel: 'Продолжить говорить',
  },
  streak_milestone: {
    proof: '7 ДНЕЙ ПОДРЯД',
    title: 'Это уже не случайность. У тебя появилась привычка.',
    body: 'Plus превратит регулярность в результат: даст следующий шаг на каждый день и вовремя вернёт то, что начинает забываться.',
    ctaLabel: 'Закрепить результат',
  },
  repeated_training: {
    proof: 'ТРЕНИРОВКА ЗАВЕРШЕНА',
    title: 'Повторение уже работает. Следующий шаг — сделать его точнее.',
    body: 'Plus откроет персональные тренировки и повторение сохранённых ошибок, чтобы практика опиралась на твои результаты.',
    ctaLabel: 'Продолжить с персональными тренировками',
  },
};

const LOCALIZED_RESULT: Record<Exclude<SoftUpsellLocale, 'ru'>, SoftUpsellCopy> = {
  en: {
    proof: 'YOUR PROGRESS IS REAL',
    title: 'Turn today’s progress into confident speech.',
    body: 'Plus builds one clear personal path from what you already know to what you should practise next.',
    ctaLabel: 'Open my personal path',
  },
  uk: {
    proof: 'ТВІЙ ПРОГРЕС УЖЕ ВИДНО',
    title: 'Перетвори сьогоднішній прогрес на впевнене мовлення.',
    body: 'Plus складає один зрозумілий особистий маршрут: від того, що ти вже знаєш, до наступної потрібної практики.',
    ctaLabel: 'Відкрити мій маршрут',
  },
  es: {
    proof: 'TU PROGRESO YA ES REAL',
    title: 'Convierte el progreso de hoy en habla segura.',
    body: 'Plus crea una ruta personal clara desde lo que ya sabes hasta lo siguiente que necesitas practicar.',
    ctaLabel: 'Abrir mi ruta personal',
  },
  'pt-BR': {
    proof: 'SEU PROGRESSO JÁ É REAL',
    title: 'Transforme o progresso de hoje em fala confiante.',
    body: 'O Plus cria um caminho pessoal claro do que você já sabe até o próximo ponto que precisa praticar.',
    ctaLabel: 'Abrir meu caminho',
  },
  vi: {
    proof: 'TIẾN BỘ CỦA BẠN LÀ THẬT',
    title: 'Biến tiến bộ hôm nay thành khả năng nói tự tin.',
    body: 'Plus tạo một lộ trình cá nhân rõ ràng từ điều bạn đã biết đến phần cần luyện tiếp theo.',
    ctaLabel: 'Mở lộ trình của tôi',
  },
  id: {
    proof: 'KEMAJUANMU SUDAH NYATA',
    title: 'Ubah kemajuan hari ini menjadi bicara percaya diri.',
    body: 'Plus menyusun satu jalur pribadi yang jelas dari yang sudah kamu kuasai ke latihan berikutnya.',
    ctaLabel: 'Buka jalur pribadiku',
  },
  tr: {
    proof: 'İLERLEMEN ARTIK GERÇEK',
    title: 'Bugünkü ilerlemeyi kendinden emin konuşmaya dönüştür.',
    body: 'Plus, bildiklerinden sıradaki doğru alıştırmaya uzanan tek ve net bir kişisel yol oluşturur.',
    ctaLabel: 'Kişisel yolumu aç',
  },
  pl: {
    proof: 'TWÓJ POSTĘP JEST JUŻ REALNY',
    title: 'Zamień dzisiejszy postęp w pewne mówienie.',
    body: 'Plus układa jedną jasną osobistą ścieżkę: od tego, co już umiesz, do następnego potrzebnego ćwiczenia.',
    ctaLabel: 'Otwórz moją ścieżkę',
  },
};

const CATEGORY_RU: Record<SoftUpsellCategory, string> = {
  vocabulary: 'лексику', grammar: 'грамматику', listening: 'аудирование', speaking: 'разговорную речь', reading: 'чтение',
};
const CATEGORY_KEYS = new Set(Object.keys(CATEGORY_RU));

function validCategory(value: unknown): value is SoftUpsellCategory {
  return typeof value === 'string' && CATEGORY_KEYS.has(value) && CATEGORY_RU[value as SoftUpsellCategory].length <= 32;
}

function validMetric(attempts: unknown, rate: unknown): boolean {
  return Number.isInteger(attempts) && Number(attempts) >= 5 && typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 && rate <= 1;
}

function measuredRuCopy(trigger: SoftUpsellTrigger, signal: SoftUpsellMeasuredSignal | null | undefined): SoftUpsellCopy | null {
  if (trigger === 'weekly_review' && signal?.kind === 'weekly'
    && validCategory(signal.strong.category) && validCategory(signal.weak.category)
    && signal.strong.category !== signal.weak.category
    && validMetric(signal.strong.attempts, signal.strong.rate) && validMetric(signal.weak.attempts, signal.weak.rate)
    && signal.strong.rate - signal.weak.rate >= 0.15) {
    return {
      proof: 'ТВОЯ НЕДЕЛЯ В ЦИФРАХ',
      title: `Ты лучше запоминаешь ${CATEGORY_RU[signal.strong.category]}, чем ${CATEGORY_RU[signal.weak.category]}.`,
      body: 'Plus откроет персональные повторы и полный учебный маршрут, чтобы чаще возвращаться к слабому месту, а не повторять всё подряд.',
      ctaLabel: 'Усилить слабое место',
    };
  }
  if (trigger === 'repeated_training' && signal?.kind === 'trainer'
    && validCategory(signal.weak.category) && validCategory(signal.next.category)
    && signal.weak.category !== signal.next.category
    && validMetric(signal.weak.attempts, signal.weak.errorRate) && validMetric(signal.next.attempts, signal.next.errorRate)
    && signal.weak.errorRate - signal.next.errorRate >= 0.15) {
    const label = CATEGORY_RU[signal.weak.category];
    const titleLabel = label.charAt(0).toUpperCase() + label.slice(1);
    return {
      proof: 'СЛАБОЕ МЕСТО НАЙДЕНО',
      title: `${titleLabel} пока забирает больше всего ошибок.`,
      body: 'Plus откроет персональные тренировки и повторы ошибок, чтобы чаще возвращаться к этой теме, а не повторять всё подряд.',
      ctaLabel: 'Убрать слабое место',
    };
  }
  return null;
}

export function selectSoftUpsellCopy(input: {
  opportunity: SoftUpsellOpportunity;
  locale: SoftUpsellLocale;
  measured?: SoftUpsellMeasuredSignal | null;
}): SoftUpsellCopy {
  if (input.locale !== 'ru') return LOCALIZED_RESULT[input.locale];
  return measuredRuCopy(input.opportunity.trigger, input.measured) ?? RU_COPY[input.opportunity.trigger];
}

export default function __RouteShim() { return null; }
