import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';
import { getReviewVariant, type ReviewContext } from '../app/review_utils';
import type { Lang } from '../constants/i18n';

const LANGUAGES: readonly Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const CONTEXTUAL_REVIEW_CONTEXTS = [
  'perfect_lesson',
  'level_exam_pass',
  'streak_milestone',
];

const MAX_RATING_OR_PRESSURE = /(?:\b5\s*(?:зв[её]зд|зірок|stars|estrellas|estrelas|sao|bintang|yıldız|gwiazdek)|пять\s+зв[её]зд|п['’]ять\s+зір|cinco\s+estrel|năm\s+sao|lima\s+bintang|beş\s+yıldız|pięć\s+gwiaz|лучшие\s+отзывы|найкращі\s+відгуки|mejores\s+reseñas|melhores\s+avaliações|đánh giá hay nhất|ulasan terbaik|en iyi yorum|najlepsze recenzje|обожаю|обожнюю|me encanta|\badoro\b|mình thích lắm|suka banget|bayılıyorum|uwielbiam|ломать правила|ламати правила|romper las reglas|quebrar regras|phá luật|melanggar aturan|kuralları bozmayı|łamać zasady)/iu;
const REVIEW_WORD = /(?:отзыв|відгук|reseña|avaliação|đánh giá|ulasan|yorum|recenzj)/iu;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('in-app review prompts', () => {
  it('ask for an honest review without a maximum-rating demand or emotional pressure', async () => {
    for (const lang of LANGUAGES) {
      for (const context of CONTEXTUAL_REVIEW_CONTEXTS) {
        const variant = await getReviewVariant(context as ReviewContext, lang);
        const copy = [variant.title, variant.subtitle, variant.btnYes, variant.btnNo].join('\n');

        expect(copy).toMatch(REVIEW_WORD);
        expect(copy).not.toMatch(MAX_RATING_OR_PRESSURE);
      }
    }
  });

  it('uses the approved Russian copy and bottom sheet for the streak milestone', async () => {
    await expect(getReviewVariant('perfect_lesson', 'ru')).resolves.toMatchObject({
      title: '100%. Ты вообще оставил уроку шанс?',
      btnYes: 'Открыть магазин и оценить',
    });
    await expect(getReviewVariant('level_exam_pass' as ReviewContext, 'ru')).resolves.toMatchObject({
      title: 'Зачёт сдан. Можно перестать выглядеть скромно.',
    });
    await expect(getReviewVariant('streak_milestone' as ReviewContext, 'ru')).resolves.toMatchObject({
      title: 'Это уже не серия. Это отношения с календарём.',
      presentation: 'dialog',
    });
  });

  // зачем: тест проверял диалог отзыва в app/arena_results.tsx — экран удалён
  // вместе с Ареной. Живая проверка формулировки просьбы выше остаётся.
});
