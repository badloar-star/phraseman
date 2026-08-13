import type { Lang } from '../../constants/i18n';
import {
  selectCompassRecommendation,
  type CompassRecommendationInput,
} from '../../app/compass_recommendation';
import {
  presentCompassRecommendation,
  type CompassRecommendationPresentation,
} from '../../app/compass_presenter';

export type CompassDevSeedId =
  | 'review'
  | 'lesson'
  | 'weak-area';

export type CompassDevSeedState = Readonly<{
  recommendation: CompassRecommendationPresentation;
}>;

const UNAVAILABLE_INPUT: CompassRecommendationInput = {
  trainer: { status: 'unavailable' },
  lessonProgress: { status: 'unavailable' },
  weeklyReview: { status: 'unavailable' },
};

function inputFor(seed: CompassDevSeedId): CompassRecommendationInput {
  switch (seed) {
    case 'review':
      return {
        ...UNAVAILABLE_INPUT,
        trainer: {
          status: 'ready',
          value: { dueWords: 4, duePhrases: 12 },
        },
      };
    case 'lesson':
      return {
        ...UNAVAILABLE_INPUT,
        lessonProgress: {
          status: 'ready',
          value: { lessonId: 7, correctCells: 18 },
        },
      };
    case 'weak-area':
      return {
        ...UNAVAILABLE_INPUT,
        weeklyReview: {
          status: 'ready',
          value: {
            actions: [{
              recommendationId: 'diagnosis:dev-compass-weak-area',
              actionKind: 'open_personal_training',
              evidenceRefs: ['evidenceCount', 'duePhrases'],
            }],
            evidenceRegistry: {
              evidenceCount: 3,
              duePhrases: 9,
            },
          },
        },
      };
  }
}

function syntheticWhy(seed: CompassDevSeedId, lang: Lang): string {
  const byLang: Record<Lang, Record<CompassDevSeedId, string>> = {
    ru: {
      review: '12 фраз готовы к повтору. Короткий раунд поможет удержать их.',
      lesson: 'Ты уже прошёл 18 шагов. Сейчас легко продолжить с этого места.',
      'weak-area': 'Этот паттерн повторился в попытках. Короткий разбор поможет различать формы.',
    },
    uk: {
      review: '12 фраз готові до повторення. Короткий раунд допоможе їх утримати.',
      lesson: 'Ти вже пройшов 18 кроків. Зараз легко продовжити звідси.',
      'weak-area': 'Цей патерн повторився у спробах. Короткий розбір допоможе розрізняти форми.',
    },
    es: {
      review: 'Hay 12 frases listas para repasar. Una ronda breve ayudará a retenerlas.',
      lesson: 'Ya completaste 18 pasos. Ahora es fácil continuar desde aquí.',
      'weak-area': 'Este patrón se repitió en tus intentos. Una práctica breve ayudará a distinguirlo.',
    },
    'pt-BR': {
      review: 'Há 12 frases prontas para revisão. Uma rodada curta ajudará a mantê-las.',
      lesson: 'Você já concluiu 18 etapas. Agora é fácil continuar daqui.',
      'weak-area': 'Este padrão apareceu nas tentativas. Uma prática curta ajudará a diferenciá-lo.',
    },
    vi: {
      review: 'Có 12 cụm từ sẵn sàng ôn lại. Một lượt ngắn sẽ giúp ghi nhớ.',
      lesson: 'Bạn đã hoàn thành 18 bước. Bây giờ dễ dàng tiếp tục từ đây.',
      'weak-area': 'Mẫu này lặp lại trong các lần thử. Luyện tập ngắn sẽ giúp phân biệt.',
    },
    id: {
      review: 'Ada 12 frasa siap diulang. Putaran singkat akan membantu mengingatnya.',
      lesson: 'Kamu sudah menyelesaikan 18 langkah. Sekarang mudah melanjutkan dari sini.',
      'weak-area': 'Pola ini muncul lagi dalam percobaanmu. Latihan singkat membantu membedakannya.',
    },
    tr: {
      review: '12 ifade tekrara hazır. Kısa bir tur onları korumaya yardımcı olur.',
      lesson: '18 adımı tamamladın. Buradan devam etmek şimdi kolay.',
      'weak-area': 'Bu kalıp denemelerinde tekrarlandı. Kısa çalışma biçimleri ayırmaya yardımcı olur.',
    },
    pl: {
      review: '12 zwrotów jest gotowych do powtórki. Krótka runda pomoże je utrwalić.',
      lesson: 'Masz już 18 ukończonych kroków. Teraz łatwo kontynuować stąd.',
      'weak-area': 'Ten schemat powtórzył się w próbach. Krótka praktyka pomoże go rozróżnić.',
    },
  };
  return (byLang[lang] ?? byLang.ru)[seed];
}

/**
 * Produces read-only, synthetic Compass states for visual QA. The production
 * ranker and presenter are deliberately reused; no account source is read and
 * no progress, plan, XP, storage, or cloud state is written.
 */
export function buildCompassDevSeed(seed: CompassDevSeedId, lang: Lang): CompassDevSeedState {
  const result = selectCompassRecommendation(inputFor(seed));
  if (result.status !== 'ready') throw new Error(`Compass Dev seed ${seed} must always be ready`);
  return {
    recommendation: presentCompassRecommendation(result.recommendation, lang, syntheticWhy(seed, lang)),
  };
}
