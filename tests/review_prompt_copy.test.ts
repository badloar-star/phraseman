import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';
import { getReviewVariant, type ReviewContext } from '../app/review_utils';
import type { Lang } from '../constants/i18n';

const LANGUAGES: readonly Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const CONTEXTUAL_REVIEW_CONTEXTS: readonly Exclude<ReviewContext, 'general'>[] = [
  'perfect_lesson',
  'arena_win',
];
const GENERAL_VARIANT_COUNT = 3;

const MAX_RATING_OR_PRESSURE = /(?:\b5\s*(?:зв[её]зд|зірок|stars|estrellas|estrelas|sao|bintang|yıldız|gwiazdek)|пять\s+зв[её]зд|п['’]ять\s+зір|cinco\s+estrel|năm\s+sao|lima\s+bintang|beş\s+yıldız|pięć\s+gwiaz|лучшие\s+отзывы|найкращі\s+відгуки|mejores\s+reseñas|melhores\s+avaliações|đánh giá hay nhất|ulasan terbaik|en iyi yorum|najlepsze recenzje|обожаю|обожнюю|me encanta|\badoro\b|mình thích lắm|suka banget|bayılıyorum|uwielbiam|ломать правила|ламати правила|romper las reglas|quebrar regras|phá luật|melanggar aturan|kuralları bozmayı|łamać zasady)/iu;
const REVIEW_WORD = /(?:отзыв|відгук|reseña|avaliação|đánh giá|ulasan|yorum|recenzj)/iu;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('in-app review prompts', () => {
  it('ask for an honest review without a maximum-rating demand or emotional pressure', async () => {
    for (const lang of LANGUAGES) {
      for (const context of CONTEXTUAL_REVIEW_CONTEXTS) {
        const variant = await getReviewVariant(context, lang);
        const copy = [variant.title, variant.subtitle, variant.btnYes, variant.btnNo].join('\n');

        expect(copy).toMatch(REVIEW_WORD);
        expect(copy).not.toMatch(MAX_RATING_OR_PRESSURE);
      }

      for (let index = 0; index < GENERAL_VARIANT_COUNT; index += 1) {
        await AsyncStorage.setItem('review_show_count', String(index));
        const variant = await getReviewVariant('general', lang);
        const copy = [variant.title, variant.subtitle, variant.btnYes, variant.btnNo].join('\n');

        expect(copy).toMatch(REVIEW_WORD);
        expect(copy).not.toMatch(MAX_RATING_OR_PRESSURE);
      }
    }
  });

  it('does not add punctuation or a broken placeholder to the Arena review dialog', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'arena_results.tsx'), 'utf8');

    expect(source).not.toContain('{variant.btnYes} ?');
    expect(source).not.toMatch(/>\s*\?\?\s*<\/Text>/);
  });
});
