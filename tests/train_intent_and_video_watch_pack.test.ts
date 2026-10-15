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
    // 15.10: «Тренировать» на ролике больше не ходит через хаб — намерение не нужно (шторка прямо на экране ролика)
    expect(read('app/lingman_video_watch.tsx')).not.toContain('setPendingTrainIntent(');
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

describe('R60 (Макеты c1_r70r60): оба пути открывают тренировку через один помощник', () => {
  it('параметры и намерение → openTrainAfterTransition, без cleanup в эффекте параметров; запасной прямой старт', () => {
    const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
    expect(hub).toContain("openTrainAfterTransitionRef.current(`params deck=${deckParam || 'none'}`);");
    expect(hub).toContain("return openTrainAfterTransitionRef.current(`intent deck=${String(intent.deckId)}`);");
    expect(hub).toContain('[TRAIN-INTENT] hub:fallback direct');
    expect(hub).toContain('trainGateRef.current.trainingLocked || !trainGateRef.current.trainingEntryReady');
  });
  it('swipe: пропавшие id не читаются повторно (отметка, наборы фраз), счётчик чтений в журнале', () => {
    const swipe = read('app/flashcards_swipe.tsx');
    expect(swipe).toContain('missingPackCache.isMissing(missingKey, nowMs)');
    expect(swipe).toContain('[SWIPE-DECKS] meta reads=');
    expect(swipe).toContain('phraseVideoIdsForCards.has(videoId)');
  });
});

describe('защёлка «окно режимов ИЛИ прямой старт» (Ревизор 935f6a931)', () => {
  it('открылось окно → fallback не стартует; fallback стартовал → окно не открывается поверх сессии', () => {
    const hub = read('app/flashcards/FlashcardsHubScreen.tsx');
    expect(hub).toContain('[TRAIN-INTENT] sheet_suppressed_after_fallback');
    expect(hub).toContain('if (visible || attempt.sheetOpened || !deck) {');
    expect(hub).toContain('attempt.fallbackAtMs = Date.now();');
  });
});

describe('подпись языка набора на экране ролика (Макеты 15.10)', () => {
  it('язык: канал → язык набора ролика → язык раздела', () => {
    expect(read('app/lingman_video_watch.tsx')).toContain("languageTags?.[0]?.split('-')[0] ?? pack?.packLanguage ?? studyTarget");
  });
});

describe('«Видео → Наборы»: тап по набору ролика (Макеты 15.10)', () => {
  it('набор с id video_<id> или полем videoId открывается экраном ролика, а не загрузкой карточек документа', () => {
    const src = read('app/flashcards_video_packs.tsx');
    expect(src).toContain('const openAsVideoId = isVideoPhraseSetPackId(pack.id)');
    expect(src).toContain('videoIdFromOwnedCommunityId(pack.id)');
  });
});

describe('плеер ролика: пауза мгновенно, переход сразу, выгрузка после (⚡ Макеты c1_video2)', () => {
  it('«Тренировать»: пауза и запомненная позиция, шторка режимов на самом экране ролика (без перехода на хаб); WebView выгружается после перехода; на возврате плеер снова открывается', () => {
    const src = read('app/lingman_video_watch.tsx');
    const body = src.slice(src.indexOf('const trainVideo = useCallback'), src.indexOf('useFocusEffect(useCallback(() => {'));
    expect(body.indexOf('requestYoutubePause(videoId)')).toBeLessThan(body.indexOf('trainSheet.open()'));
    expect(body).not.toContain('router.push(');
    expect(body).not.toContain('router.navigate(');
    expect(body).not.toContain('setPlayerOpen(false);');
    expect(src).toContain('useDeckTrainSheet({ deckId: trainDeckId');
    expect(src).toContain('{trainSheet.sheet}');
    expect(src).toContain('InteractionManager.runAfterInteractions(() => {');
    expect(src).toContain('trainNavMark(\'player released after transition\');');
    expect(src).toContain('setPlayerOpen(true); // вернулись на экран ролика');
    expect(read('components/youtube/YoutubeInlinePlayer.tsx')).toContain('registerYoutubePauseHandler(videoId');
    expect(read('app/youtube_player_seek_bus.ts')).toContain('export function requestYoutubePause');
  });
  it('шторка режимов: те же ворота, что на хабе (квота → пейвол, блиц только при достаточном числе карточек), старт — push на экран тренировки', () => {
    const hook = read('app/flashcards/use_deck_train_sheet.tsx');
    expect(hook).toContain("quotaPreview.status === 'exhausted'");
    expect(hook).toContain("openPremiumPaywall(router, { context: 'flashcard_training'");
    expect(hook).toContain("mode === 'blitz' && !canStartBlitz(options.count)");
    expect(hook).toContain('router.push({ pathname: route.pathname, params: route.params } as never);');
    expect(hook).toContain('FlashcardsTrainingModeSheet');
  });
  it('чип канала: пока ждём каталог, имя ожидаемого канала не показывается (без промежуточного «Английский»)', () => {
    expect(read('app/lingman_videos.tsx')).toContain("? { ...pendingChannel, displayName: '' }");
  });
});

describe('плеер: пауза и возврат на ту же секунду (координатор 15.10)', () => {
  it('позиция запоминается до снятия плеера; на возврате плеер стартует с неё без автозапуска', () => {
    const src = read('app/lingman_video_watch.tsx');
    expect(src.indexOf('lastPositionRef.current')).toBeGreaterThan(-1);
    expect(src).toContain('setResumeSec(savedPosition > 0 ? savedPosition : null);');
    expect(src).toContain('autoPlay={resumeSec === null} startSec={resumeSec ?? startSec}');
  });
});

describe('R59 «Видео» (координатор 15.10)', () => {
  it('закладка: сетка остаётся на месте и у верхнего края; чип канала без запасного названия; журнал [VIDEO-OPEN-TRACE]', () => {
    const videos = read('app/lingman_videos.tsx');
    expect(videos).toContain('if (prev === 0 && h > 0) homeListRef.current?.scrollToOffset({ offset: Math.max(0, scrollYRef.current) + h + SAVED_ROW_MARGIN, animated: false });');
    expect(videos).toContain("channel={!catalog && !pendingChannel ? { ...activeChannel, displayName: '', avatarUrl: undefined } : activeChannel}");
    expect(videos).toContain("videoOpenTraceStart('home_grid_tap');");
    const watch = read('app/lingman_video_watch.tsx');
    for (const mark of ['watch first render', 'watch mount', 'phrases resolved', 'pack search done', 'watch onLayout']) expect(watch).toContain(mark);
    expect(read('components/youtube/YoutubeInlinePlayer.tsx')).toContain("videoOpenMark('player mount')");
  });
});

describe('Макеты c1_video3: фразы порциями, пауза успевает дойти до плеера', () => {
  it('YoutubeVideoPhrases рисует первые строки в первом кадре, остальное порциями после перехода', () => {
    const src = read('components/youtube/YoutubeVideoPhrases.tsx');
    expect(src).toContain('PHRASE_ROWS_FIRST_FRAME = 20');
    expect(src).toContain('phrases.slice(0, renderLimit).map(');
    expect(src).toContain('InteractionManager.runAfterInteractions(() => {');
    expect(src).toContain('activeIndex >= renderLimit');
  });
});

describe('плеер: отмена отложенной выгрузки и журнал паузы (Ревизор 2.77)', () => {
  it('на возврате запоздавшая задача выгрузки отменяется; пауза пишет отправку, ошибку и подтверждение', () => {
    const watch = read('app/lingman_video_watch.tsx');
    expect(watch).toContain('releaseHandleRef.current.cancel();');
    expect(watch).toContain('releaseHandleRef.current = InteractionManager.runAfterInteractions(() => {');
    const player = read('components/youtube/YoutubeInlinePlayer.tsx');
    expect(player).toContain('[VIDEO-PAUSE] inject');
    expect(player).toContain("type:'pause_error'");
    expect(player).toContain('[VIDEO-PAUSE] ERROR');
    expect(player).toContain('[VIDEO-PAUSE] ack playing=false');
  });
});
