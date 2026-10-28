// зачем (координатор 12.10, аудит скорости R1 «L1»): ячейка списка «Обучение» не должна перерисовываться при коммите корня, если её данные не изменились.
// В проекте нет react-test-renderer, поэтому проверяем сам comparator, который отдан в React.memo (равно ⇒ перерисовки нет), и то, что реальные ячейки
// и экран на него подключены. Корень на каждом коммите собирает ЗАНОВО объект состояния плашки и стрелки нажатия — ровно это и имитируем.
import fs from 'node:fs';
import path from 'node:path';

import {
  lessonsListCardPropsEqual,
  lessonsListCardStateEqual,
} from '../components/lessons/lessonsListCardEquality';
import type { LessonsListCardState } from '../components/lessons/LessonsListGlassCard';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

const glass = { stable: 'tokens' };
const press = () => undefined;

const cellProps = (state: LessonsListCardState, over: Partial<{ name: string; current: boolean; num: number; lang: string; glass: unknown; onPressLesson: unknown }> = {}) => ({
  glass, lang: 'ru', num: 7, name: 'Урок семь', state, current: false, onPressLesson: press, ...over,
});

describe('L1: плашка урока не перерисовывается без изменения своих данных', () => {
  it('коммит корня без изменений: новый объект состояния с теми же данными ⇒ comparator «равно» (перерисовки нет)', () => {
    const states: Array<[LessonsListCardState, LessonsListCardState]> = [
      [{ kind: 'progress', pct: 40 }, { kind: 'progress', pct: 40 }],
      [{ kind: 'done', stars: 3 }, { kind: 'done', stars: 3 }],
      [{ kind: 'locked', prevNum: 6 }, { kind: 'locked', prevNum: 6 }],
      [{ kind: 'open' }, { kind: 'open' }],
      [{ kind: 'plus' }, { kind: 'plus' }],
    ];
    for (const [a, b] of states) {
      expect(a).not.toBe(b); // как в корне: каждый коммит — новая ссылка
      expect(lessonsListCardPropsEqual(cellProps(a), cellProps(b))).toBe(true);
    }
  });

  it('данные урока изменились ⇒ перерисовка есть (процент, звёзды, замок, вид состояния, название, текущий, язык, обработчик, тема)', () => {
    const base = cellProps({ kind: 'progress', pct: 40 });
    expect(lessonsListCardPropsEqual(base, cellProps({ kind: 'progress', pct: 41 }))).toBe(false);
    expect(lessonsListCardPropsEqual(cellProps({ kind: 'done', stars: 2 }), cellProps({ kind: 'done', stars: 3 }))).toBe(false);
    expect(lessonsListCardPropsEqual(cellProps({ kind: 'locked', prevNum: 6 }), cellProps({ kind: 'locked', prevNum: 5 }))).toBe(false);
    expect(lessonsListCardPropsEqual(base, cellProps({ kind: 'open' }))).toBe(false);
    expect(lessonsListCardPropsEqual(cellProps({ kind: 'open' }), cellProps({ kind: 'plus' }))).toBe(false);
    expect(lessonsListCardPropsEqual(base, cellProps({ kind: 'progress', pct: 40 }, { name: 'Другое' }))).toBe(false);
    expect(lessonsListCardPropsEqual(base, cellProps({ kind: 'progress', pct: 40 }, { current: true }))).toBe(false);
    expect(lessonsListCardPropsEqual(base, cellProps({ kind: 'progress', pct: 40 }, { lang: 'en' }))).toBe(false);
    expect(lessonsListCardPropsEqual(base, cellProps({ kind: 'progress', pct: 40 }, { onPressLesson: () => undefined }))).toBe(false);
    expect(lessonsListCardPropsEqual(base, cellProps({ kind: 'progress', pct: 40 }, { glass: { other: 'tokens' } }))).toBe(false);
  });

  it('сравнение состояний: одинаковая ссылка и разные виды', () => {
    const same: LessonsListCardState = { kind: 'open' };
    expect(lessonsListCardStateEqual(same, same)).toBe(true);
    expect(lessonsListCardStateEqual({ kind: 'plus' }, { kind: 'locked', prevNum: 1 })).toBe(false);
  });
});

describe('L1: ячейки и экран подключены к стабильным пропсам', () => {
  it('плашка урока обёрнута в memo с comparator по данным', () => {
    const card = read('components/lessons/LessonsListGlassCard.tsx');
    expect(card).toContain("import { lessonsListCardPropsEqual } from './lessonsListCardEquality';");
    expect(card).toContain('}, lessonsListCardPropsEqual);');
  });

  it('нажатие аттестации и экзаменов — стабильные ссылки, а не новые стрелки на каждый рендер', () => {
    const src = read('app/(tabs)/lessons.tsx');
    expect(src).toContain('const openDiagnosticTest = useCallback(() => {');
    expect(src).toContain('onPress={openDiagnosticTest}');
    expect(src).not.toMatch(/key="attestation-after-32"[\s\S]{0,260}onPress=\{\(\) =>/);
    expect(src).toContain('const examPressStable = useMemo(() => {');
    expect(src).toContain('examPressImplRef.current[lvl] = () => {');
    expect(src).toContain('onPress={examPressStable[lvl]}');
  });

  it('плашка V2: стиль слоя и обёртка нажатия кэшируются, а не создаются заново на каждый коммит', () => {
    const src = read('app/(tabs)/lessons.tsx');
    expect(src).toContain('const cardLayerStyle = lessonCardLayerStyle(cardRadius);');
    expect(src).toContain('lessonCardPressWrapper(onLearningV2PressOverride)');
    expect(src).not.toContain('() => onLearningV2PressOverride()');
  });
});

describe('R1: каталог курса не собирается синхронно в рендере вкладки «Уроки» на странице списка', () => {
  // зачем (перепин 28.10): с 72f72a94e (22.10) каталог стартует с null на ЛЮБОЙ странице — синхронного peek в рендере нет совсем
  it('начальное состояние каталога — null без синхронного peek в рендере (каталог подтянет прогрев)', () => {
    const src = read('app/(tabs)/lessons.tsx');
    const start = src.indexOf('const [learningV2Catalog, setLearningV2Catalog] =');
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, start + 200);
    expect(block).toContain('useState<LearningV2ActiveCourseCatalogV1 | null>(null);');
    expect(block).not.toContain('peekLearningV2ActiveCourseCatalogV1(');
  });

  it('названия уроков из каталога берутся только на странице v2 (список на странице lessons от каталога не зависит)', () => {
    const src = read('app/(tabs)/lessons.tsx');
    expect(src).toContain('if (page !== "v2" || !learningV2Catalog) return legacyTitles;');
  });

  it('прогрев каталога остаётся: peek + load в useFocusEffect, взводится после первого кадра и взаимодействий', () => {
    const src = read('app/(tabs)/lessons.tsx');
    // зачем (R1, Ядро 12.10): и в dev прогрев ждёт взвода после первого кадра и взаимодействий — dev не стартует его сразу
    // перепин 28.10 (72f72a94e): и страница v2 ждёт взвода — переход на неё не разрешает занимать JS-поток; взвод только после простоя касаний
    expect(src).toContain('const learningV2WarmupEnabled = learningV2WarmupArmed;');
    expect(src).toContain('void loadLearningV2ActiveCourseCatalogV1(learningV2CatalogLocator)');
    expect(src).toContain('InteractionManager.runAfterInteractions(() => {');
    expect(src).toContain('if (idleMs < 2500) {');
    expect(src).toContain('setLearningV2WarmupArmed(true);');
  });
});
