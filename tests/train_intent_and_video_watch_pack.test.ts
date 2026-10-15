// зачем (🔴 Ц1 на эмуляторе, координатор 15.10): «Тренировать набор из видео» доходит до окна режимов двумя путями — кнопкой на экране ролика и ▶ в «Моих наборах».
import { readFileSync } from 'fs';
import path from 'path';
import { __resetTrainIntentForTests, consumePendingTrainIntent, setPendingTrainIntent, TRAIN_INTENT_TTL_MS } from '../app/flashcards/train_intent';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');

describe('намерение «тренировать набор»', () => {
  beforeEach(() => __resetTrainIntentForTests());
  it('отдаётся один раз и гаснет', () => {
    setPendingTrainIntent({ deckId: 'pack:video_AAAAAAAAAAA', count: 50 }, 1_000);
    expect(consumePendingTrainIntent(1_500)).toEqual({ deckId: 'pack:video_AAAAAAAAAAA', count: 50 });
    expect(consumePendingTrainIntent(1_600)).toBeNull();
  });
  it('просроченное не открывает окно режимов «из ниоткуда»', () => {
    setPendingTrainIntent({ deckId: 'pack:x', count: 1 }, 1_000);
    expect(consumePendingTrainIntent(1_000 + TRAIN_INTENT_TTL_MS + 1)).toBeNull();
  });
  it('последнее намерение заменяет прежнее', () => {
    setPendingTrainIntent({ deckId: 'pack:a', count: 1 }, 1_000);
    setPendingTrainIntent({ deckId: null, count: 0 }, 1_100);
    expect(consumePendingTrainIntent(1_200)).toEqual({ deckId: null, count: 0 });
  });
});

describe('подключение', () => {
  it('хаб забирает намерение на фокусе и открывает окно режимов; параметры тоже гасят его', () => {
    const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
    expect(hub).toContain('const intent = consumePendingTrainIntent();');
    expect(hub).toContain('onTrainIntentRef.current();');
    expect(hub).toContain('consumePendingTrainIntent(); // параметры дошли');
  });
  it('все вызовы «тренировать набор» ставят намерение, а не надеются на параметры', () => {
    expect(read('app/flashcards_my_packs.tsx')).toContain('setPendingTrainIntent({ deckId: `pack:${pack.id}`');
    const collection = read('app/flashcards_collection.tsx');
    expect((collection.match(/setPendingTrainIntent\(/g) ?? []).length).toBe(3);
    expect(read('app/lingman_video_watch.tsx')).toContain('setPendingTrainIntent({ deckId, count: pack?.cardCount ?? 0 });');
  });
  it('экран ролика ищет набор и в наборах фраз, поиск не обрывается на непустом кэше каталога', () => {
    const watch = read('app/lingman_video_watch.tsx');
    expect(watch).toContain('loadVideoPhraseSetPacks');
    expect(watch).toContain('if (findPackForVideo(peekVideoMarketPacks(studyTarget), videoId)) return undefined;');
    expect(watch).not.toContain('if (peekVideoMarketPacks(studyTarget)) return undefined;\n    let alive');
  });
});

describe('сторож цепочки «ролик → набор → Тренировать → окно режимов»', () => {
  it('поиск набора, тап и намерение пишут [VIDEO-PACK-TRAIN]/[TRAIN-INTENT]; старый ключ языка никто не пишет', () => {
    const watch = read('app/lingman_video_watch.tsx');
    expect(watch).toContain('[VIDEO-PACK-TRAIN] find');
    expect(watch).toContain('[VIDEO-PACK-TRAIN] tap');
    expect(read('app/flashcards/train_intent.ts')).toContain('[TRAIN-INTENT] set');
    expect(read('app/flashcards/pack_language_preferences.ts')).not.toContain('AsyncStorage.setItem');
  });
});
