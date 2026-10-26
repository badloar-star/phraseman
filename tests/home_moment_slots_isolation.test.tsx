// зачем (Моменты №4, координатор 26.10): окна «итог недели» и «С возвращением» держат состояние в своих хостах —
// решение / открытие / закрытие окна перерисовывает только хост, а не всю Главную. Сторож считает рендеры родителя.
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// зачем: в тестах react-native подменён заглушкой без компонентов (tests/__mocks__/react-native.js) — как у соседних тестов, строковые компоненты
jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  Pressable: 'Pressable',
  Modal: ({ children }: { children: unknown }) => children,
  Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
  StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s },
}));

type Setter = (value: unknown) => void;
const handles: { week: Setter | null; welcome: Setter | null } = { week: null, welcome: null };

jest.mock('../app/spire/use_spire_week_moment', () => {
  const ReactInner = jest.requireActual('react') as typeof React;
  return {
    useSpireWeekMoment: () => {
      const [decision, setDecision] = ReactInner.useState<unknown>(null);
      handles.week = setDecision;
      return { visible: decision !== null, decision, close: () => setDecision(null), remind: { available: false, schedule: () => undefined } };
    },
  };
});
jest.mock('../hooks/use_welcome_back_moment', () => {
  const ReactInner = jest.requireActual('react') as typeof React;
  return {
    useWelcomeBackMoment: () => {
      const [decision, setDecision] = ReactInner.useState<unknown>(null);
      handles.welcome = setDecision;
      return { visible: decision !== null, decision, close: () => setDecision(null) };
    },
  };
});
jest.mock('../components/spire/moments/SpireWeekMomentHost', () => {
  return { __esModule: true, default: () => <Text>week-moment</Text> };
});
jest.mock('../components/moments/WelcomeBackMoment', () => {
  return { __esModule: true, default: ({ onCards }: { onCards: () => void }) => <Pressable onPress={onCards}><Text>welcome-back</Text></Pressable> };
});
jest.mock('../components/modal_fx/SheetSwipeClose', () => ({ SheetSwipeRoot: ({ children }: { children: React.ReactNode }) => children }));

/* eslint-disable import/first */
import { Pressable, Text } from 'react-native';
import { HomeWeekMomentSlot, HomeWelcomeBackSlot } from '../components/home/home_moment_slots';

let parentRenders = 0;
const onPlay = () => undefined;
const onOpenSavedCards = jest.fn();
function FakeHome() {
  parentRenders += 1;
  return (
    <>
      <Text>home</Text>
      <HomeWeekMomentSlot lang="ru" studyTarget="en" spireTabEnabled active coinRank={5} onPlay={onPlay} />
      <HomeWelcomeBackSlot lang="ru" studyTarget="en" active coinRank={5} energyCurrent={3} energyMax={5} onOpenSavedCards={onOpenSavedCards} />
    </>
  );
}

beforeEach(() => {
  parentRenders = 0;
  onOpenSavedCards.mockClear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

it('открытие и закрытие окна недели не перерисовывают Главную', async () => {
  await render(<FakeHome />);
  expect(parentRenders).toBe(1);
  await act(async () => { handles.week?.({ kind: 'stayed' }); });
  expect(await screen.findByText('week-moment')).toBeTruthy();
  await act(async () => { handles.week?.(null); });
  expect(screen.queryByText('week-moment')).toBeNull();
  expect(parentRenders).toBe(1);
});

it('«С возвращением»: окно в хосте, «К карточкам» закрывает окно и ведёт по пути Главной, Главная не перерисована', async () => {
  await render(<FakeHome />);
  await act(async () => { handles.welcome?.({ stats: { awayDays: 9 }, primary: { kind: 'cards' } }); });
  const card = await screen.findByText('welcome-back');
  // закрытие окна — setState в хосте: даём React его применить до проверки
  await act(async () => { fireEvent.press(card); });
  expect(onOpenSavedCards).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('welcome-back')).toBeNull();
  expect(parentRenders).toBe(1);
});
