// зачем (координатор 15.10, m09 «Идеальный урок» → итог урока): решение показывать штамп, «один раз на прохождение», закрытие кнопкой/«назад» без двойного срабатывания, ожидание оценки приложения,
// ленивое подключение и число монет из итога (practiceRunes.runes), а не второй подсчёт. Экран lesson_complete проверяется по исходнику: рендерить его целиком слишком тяжело.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Modal: 'Modal',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));
jest.mock('../hooks/use_my_coin_rank', () => ({ useMyCoinRank: () => 5 }));
const mockMoment = jest.fn();
jest.mock('../components/lesson_moments/LessonPerfectMoment', () => ({
  __esModule: true,
  default: (props: { total: number; coinsEarned: number; onNext: () => void }) => {
    mockMoment(props);
    return require('react').createElement('Pressable', { testID: 'perfect-next', onPress: props.onNext }, require('react').createElement('Text', null, `${props.total}/${props.coinsEarned}`));
  },
}));

import LessonPerfectHost from '../components/lesson_moments/LessonPerfectHost';
import { claimPerfectMoment, decidePerfectMoment, perfectMomentKey, resetPerfectMomentForTests } from '../components/lesson_moments/perfect_moment_gate';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const base = { momentsV3: true, isCombo: false, counts: { correct: 20, wrong: 0 }, coinsHydrating: false } as const;

describe('m09 · решение «показывать ли штамп»', () => {
  it('показ только при включённом флаге, обычном уроке, 100 % без ошибок и посчитанных монетах — причина называется', () => {
    expect(decidePerfectMoment(base)).toEqual({ show: true, reason: 'идеал: верно=20 ошибок=0' });
    expect(decidePerfectMoment({ ...base, momentsV3: false }).show).toBe(false);
    expect(decidePerfectMoment({ ...base, isCombo: true }).reason).toContain('комбо');
    expect(decidePerfectMoment({ ...base, counts: null }).reason).toContain('не посчитан');
    expect(decidePerfectMoment({ ...base, counts: { correct: 0, wrong: 0 } }).show).toBe(false);
    expect(decidePerfectMoment({ ...base, counts: { correct: 19, wrong: 1 } }).reason).toContain('wrong=1');
    expect(decidePerfectMoment({ ...base, coinsHydrating: true }).reason).toContain('монеты');
  });

  it('один раз на прохождение: повторная заявка того же ключа отклоняется, другая попытка — своя', () => {
    resetPerfectMomentForTests();
    const key = perfectMomentKey(3, 'en', 'attempt-a');
    expect(claimPerfectMoment(key)).toBe(true);
    expect(claimPerfectMoment(key)).toBe(false);
    expect(claimPerfectMoment(perfectMomentKey(3, 'en', 'attempt-b'))).toBe(true);
  });
});

describe('m09 · окно LessonPerfectHost', () => {
  beforeEach(() => { resetPerfectMomentForTests(); mockMoment.mockClear(); });

  it('показывает момент с числами итога; «Дальше» закрывает окно один раз (двойной тап гасится) и сообщает экрану', async () => {
    const onOpenChange = jest.fn();
    await render(<LessonPerfectHost lang="ru" onceKey="k1" total={20} coinsEarned={150} onOpenChange={onOpenChange} />);
    expect(screen.getByText('20/150')).toBeTruthy();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    await fireEvent.press(screen.getByTestId('perfect-next'));
    expect(screen.queryByTestId('perfect-next')).toBeNull();
    expect(onOpenChange.mock.calls.filter((c) => c[0] === false)).toHaveLength(1);
  });

  it('тот же проход второй раз (повторный заход на итог) — окно не открывается', async () => {
    const first = await render(<LessonPerfectHost lang="ru" onceKey="k2" total={20} coinsEarned={150} />);
    expect(first.getByTestId('perfect-next')).toBeTruthy();
    const second = await render(<LessonPerfectHost lang="ru" onceKey="k2" total={20} coinsEarned={150} />);
    expect(second.queryByTestId('perfect-next')).toBeNull();
  });

  it('P22a: проход уже праздновали — хост сразу сообщает «закрыто», оценка приложения не ждёт вечно', async () => {
    await render(<LessonPerfectHost lang="ru" onceKey="k3" total={20} coinsEarned={150} />);
    const onOpenChange = jest.fn();
    await render(<LessonPerfectHost lang="ru" onceKey="k3" total={20} coinsEarned={150} onOpenChange={onOpenChange} />);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onOpenChange).not.toHaveBeenCalledWith(true);
  });
});

describe('m09 · подключение к lesson_complete', () => {
  const src = read('app/lesson_complete.tsx');
  it('окно подключено лениво, решает decidePerfectMoment, монеты = practiceRunes.runes, оценка ждёт закрытия окна', () => {
    expect(src).toMatch(/const LessonPerfectHost = lazy\(\(\) => import\('\.\.\/components\/lesson_moments\/LessonPerfectHost'\)\);/);
    expect(src).not.toMatch(/^import LessonPerfectHost/m);
    expect(src).toContain('decidePerfectMoment({ momentsV3, isCombo: isComboCompletion, counts: lessonCounts, coinsHydrating: practiceRunes.hydrating })');
    expect(src).toContain('coinsEarned={practiceRunes.runes}');
    // зачем (Ревизор P22a): оценка ждёт и открытое окно, и «ещё не решено» (ленивая загрузка); рядом может стоять очередь рубежа серии Тем
    const reviewLine = src.split('\n').find((l) => l.includes('visible={showReview && !perfectMomentOpen')) ?? '';
    expect(reviewLine).toContain('!(sequenceShowing && perfectDecision.show && !perfectMomentSettled)');
    expect(src).toContain('onOpenChange={onPerfectOpenChange}');
  });
});
