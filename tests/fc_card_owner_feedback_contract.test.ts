/**
 * cards-2.0: замечания владельца после теста на реальном iPhone (2026-08-13).
 * Контракт исходников — правки не должны «уехать» обратно при мержах:
 *  1. подсказки «тап — перевернуть» нет ни в одной локали;
 *  2. флип не играет звук;
 *  3. декоративной полосы под карточкой нет;
 *  4. свайп-жест собран стабильно (не пересоздаётся на каждый рендер) и отдаёт
 *     вертикаль скроллу;
 *  5. подпись «знаю/учу» локализована во все 8 локалей, держится весь жест;
 *  6. полупрозрачный режим не перезапускает анимацию из useAnimatedStyle;
 *  7. слова «колода» в этих файлах нет.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const OWNED = [
  'app/flashcards/PhraseCard.tsx',
  'app/flashcards/FlashcardListItem.tsx',
  'app/flashcards/CollectionDeckView.tsx',
  'app/flashcards/SoundService.ts',
  'app/flashcards/collection_view_prefs.ts',
  'constants/flashcards_motion.ts',
];

const phraseCard = read('app/flashcards/PhraseCard.tsx');
const deckView = read('app/flashcards/CollectionDeckView.tsx');
const listItem = read('app/flashcards/FlashcardListItem.tsx');
const motion = read('constants/flashcards_motion.ts');

describe('1. подсказка «нажми чтобы перевернуть» убрана во всех локалях', () => {
  /** ru, uk, es, pt-BR, vi, id, tr, pl — по ключевому глаголу каждой локали. */
  const TAP_FLIP_COPY = [
    'перевернуть',
    'перевернути',
    'voltear',
    'girar',
    'virar',
    'lật',
    'membalik',
    'Çevirmek',
    'odwrócić',
  ];

  it.each(OWNED)('%s не выводит подсказку тапа', (rel) => {
    const source = read(rel);
    for (const word of TAP_FLIP_COPY) {
      expect(source.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  it('в режиме стопки на месте подсказки — только спейсер между ‹ и ›', () => {
    expect(deckView).not.toContain('Тап — перевернуть');
    expect(deckView).toContain("<View style={{ width: 60 }} />");
  });
});

describe('2. звук переворачивания карточки убран', () => {
  it('PhraseCard не играет SFX флипа (хаптика остаётся)', () => {
    expect(phraseCard).not.toContain("playSfx('flip')");
    expect(phraseCard).toContain("fcHaptic('flip')");
  });

  it('свайп-звуки не тронуты', () => {
    expect(phraseCard).toContain("playSfx(result === 'know' ? 'swipe_know' : 'swipe_learn')");
  });

  it('SoundService не подмешивает флип по умолчанию перед TTS', () => {
    const sound = read('app/flashcards/SoundService.ts');
    expect(sound).not.toContain("opts?.sfx === undefined ? 'flip' : opts.sfx");
    expect(sound.match(/opts\?\.sfx === undefined \? null : opts\.sfx/g)?.length).toBe(2);
    // сам каталог звуков не тронут — 'flip' остаётся доступен другим доменам
    expect(sound).toContain("flip: { source: () => require('../../assets/sounds/fc/fc_flip.mp3')");
  });

  it('нигде в app/ больше не вызывается SFX флипа', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(entry.name) && read(rel).includes("playSfx('flip')")) hits.push(rel);
      }
    };
    walk('app/flashcards');
    expect(hits).toEqual([]);
  });
});

describe('3. декоративная полоса под карточкой убрана', () => {
  it('PhraseCard не рисует нижнюю грань', () => {
    expect(phraseCard).not.toContain('EDGE_H');
    expect(phraseCard).not.toContain('edgeStyle');
  });

  it('press-эффект остался чистым transform (без анимации высоты)', () => {
    expect(phraseCard).toContain('interpolate(pressed.value, [0, 1], [1, 0.97])');
  });
});

describe('4. свайп срабатывает надёжно', () => {
  it('пороги перепломбированы под реальный флик', () => {
    expect(motion).toContain('thresholdRatio: 0.22');
    expect(motion).toContain('velocityThreshold: 450');
    expect(motion).toContain('failOffsetY: 18');
  });

  it.each([
    ['app/flashcards/PhraseCard.tsx', phraseCard],
    ['app/flashcards/CollectionDeckView.tsx', deckView],
  ])('%s: вертикаль отдаётся скроллу и отмена жеста возвращает карточку', (_rel, source) => {
    expect(source).toContain('.failOffsetY([-FC_SWIPE.failOffsetY, FC_SWIPE.failOffsetY])');
    expect(source).toContain('.onBegin(');
    expect(source).toContain('.onFinalize(');
    expect(source).toContain('cancelAnimation(tx)');
  });

  it('PhraseCard: объект жеста не пересобирается из-за инлайн-onGrade', () => {
    expect(phraseCard).toContain('const onGradeRef = useRef(onGrade);');
    expect(phraseCard).toContain('onGradeRef.current?.(result);');
    // в deps useMemo жеста нет самих пропов-колбэков
    expect(phraseCard).not.toContain('[mode, isWeb, disabled, tx, cardW, thresholdCrossed, emitThresholdHaptic, handleGrade]');
  });

  it('стопка коллекции решает «улетать или вернуться» на UI-потоке', () => {
    expect(deckView).toContain('const navBusySV = useSharedValue(0);');
    expect(deckView).toContain('const canNextSV = useSharedValue(0);');
    expect(deckView).toContain('const canPrevSV = useSharedValue(0);');
    expect(deckView).not.toContain('navBusyRef');
    expect(deckView).not.toContain('if (e.translationX < 0) runOnJS(goNext)();');
  });
});

describe('5. подпись свайпа: 8 локалей, плавно и ровно', () => {
  const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

  it('PHRASE_CARD_GRADE_LABELS покрывает все 8 локалей интерфейса', () => {
    const declStart = phraseCard.indexOf('export const PHRASE_CARD_GRADE_LABELS');
    const block = phraseCard.slice(
      phraseCard.indexOf('> = {', declStart),
      phraseCard.indexOf('export type PhraseCardPackTheme'),
    );
    expect(block.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const key = locale.includes('-') ? `'${locale}':` : `${locale}:`;
      expect(block).toContain(key);
    }
    // обе стороны оценки для каждой локали
    expect(block.match(/know:/g)?.length).toBe(LOCALES.length);
    expect(block.match(/learn:/g)?.length).toBe(LOCALES.length);
  });

  it('подпись рендерится рядом с иконкой и выровнена по центру карточки', () => {
    expect(phraseCard).toContain('{swipeLabels.know}');
    expect(phraseCard).toContain('{swipeLabels.learn}');
    expect(phraseCard).toContain('const swipeLabelTextStyle = (color: string) => ({');
    expect(phraseCard).toContain("textAlign: 'center' as const");
  });

  it('непрозрачность подписи с CLAMP и защёлкой на улёте (не гаснет раньше времени)', () => {
    expect(phraseCard).toContain('const flyingOut = useSharedValue(0);');
    expect(phraseCard).toContain('Extrapolation.CLAMP');
    expect(phraseCard).toContain('FC_SWIPE.labelFullRatio');
    // старая версия интерполировала до самого порога улёта и без клампа
    expect(phraseCard).not.toContain('interpolate(tx.value, [0, cardW.value * FC_SWIPE.thresholdRatio], [0, 1])');
  });
});

describe('6. полупрозрачный режим не лагает', () => {
  it('анимация фокуса живёт в useDerivedValue, а не внутри useAnimatedStyle', () => {
    expect(listItem).toContain('const focusProgress = useDerivedValue(');
    expect(listItem).not.toContain("opacity: withTiming(focused ? 1 : 0.68, { duration: 160 })");
  });

  it('на слабых устройствах / reduce-motion прозрачность ставится без анимации', () => {
    const block = listItem.slice(
      listItem.indexOf('const focusProgress = useDerivedValue('),
      listItem.indexOf('const focusDimStyle = useAnimatedStyle('),
    );
    expect(block).toContain('if (crossfadeFlip) return focused;');
  });

  it('стиль фокуса — только opacity + transform', () => {
    const block = listItem.slice(
      listItem.indexOf('const focusDimStyle = useAnimatedStyle('),
      listItem.indexOf('/** E7: ряд действий'),
    );
    expect(block).toContain('opacity: interpolate(p, [0, 1], [0.68, 1], Extrapolation.CLAMP)');
    expect(block).toContain('scale: interpolate(p, [0, 1], [0.985, 1], Extrapolation.CLAMP)');
    expect(block).not.toContain('withTiming');
  });
});

describe('7. слово «колода» вне закона', () => {
  const BANNED = [
    'колод', // ru/uk: колода/колоды/колоду
    'talia', // pl
    'baraja', // es
    'baralho', // pt-BR
    'mazzo',
  ];

  it.each(OWNED)('%s не содержит слова «колода» и калек', (rel) => {
    const lower = read(rel).toLowerCase();
    for (const word of BANNED) expect(lower).not.toContain(word);
  });
});
