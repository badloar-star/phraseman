import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

jest.unmock('react-native');
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: { name: string }) => {
    const { Text: MockText } = require('react-native');
    return <MockText {...props} testID={`ionicon-${name}`}>{name}</MockText>;
  },
}));
jest.mock('expo-router', () => ({ usePathname: () => '/daily-tasks' }));
jest.mock('../components/TapScale', () => {
  const { Pressable: MockPressable } = require('react-native');
  return ({ children, ...props }: any) => <MockPressable {...props}>{children}</MockPressable>;
});
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({ theme: { bgCard: '#111' }, f: { body: 16, label: 14 }, themeMode: 'dark' }),
}));
jest.mock('../constants/theme', () => ({
  screenTextOnGradient: () => ({ primary: '#fff', muted: '#ddd', second: '#fff', ghost: '#222' }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'pl' }) }));
jest.mock('../components/text-integrity/use_text_integrity_probe', () => ({
  useTextIntegrityProbe: () => ({ ref: { current: null }, onTextLayout: jest.fn() }),
}));

import SurveyTaskCard from '../components/SurveyTaskCard';
import { DailyBonusCard, DailyTaskCard } from '../components/daily-tasks/DailyTaskCard';
import { computeSurveyDailyCounts } from '../app/survey_daily_challenge_model';

const ROOT = path.resolve(__dirname, '..');
const base = {
  testID: 'daily-standard',
  title: 'Standard task',
  description: 'Standard description',
  icon: <Text>ICON</Text>,
  titleColor: '#fff',
  descriptionColor: '#ddd',
  surfaceColor: '#111',
  borderColor: '#333',
  accentColor: '#9cff00',
};
const activeChallenge = {
  surveyId: 'survey-pl',
  title: 'Bardzo długa ankieta o codziennych sposobach uczenia się języków obcych',
  description: 'Odpowiedz na pytania i pomóż ulepszyć aplikację bez skracania tego opisu.',
  questionCount: 12,
  rewardShards: 3,
  phase: 'active' as const,
  survey: { surveyId: 'survey-pl', title: 'Ankieta', subtitle: '', rewardShards: 3, questions: [] },
};

test('standard card omits the progress wrapper when progress is undefined', async () => {
  const view = await render(<DailyTaskCard {...base} />);
  expect(view.queryByTestId('daily-standard-progress')).toBeNull();
  expect(view.queryByRole('progressbar')).toBeNull();
});

test('bonus progress remains required and renders as the aggregate bar', async () => {
  const view = await render(<DailyBonusCard {...base} testID="daily-bonus" progress={<View testID="aggregate-progress" />} />);
  expect(view.getByTestId('daily-bonus-progress')).toBeTruthy();
  expect(view.getByTestId('aggregate-progress')).toBeTruthy();
  expect(view.getByTestId('daily-bonus-progress').props.accessibilityRole).toBe('progressbar');
});

test('active survey reuses task geometry, violet palette, complete Polish copy, and active press', async () => {
  const onOpen = jest.fn();
  const view = await render(<SurveyTaskCard challenge={activeChallenge} onOpen={onOpen} />);

  expect(StyleSheet.flatten(view.getByTestId('daily-survey-task').props.style)).toMatchObject({
    borderRadius: 22,
    backgroundColor: '#211B31',
  });
  expect(StyleSheet.flatten(view.getByTestId('daily-survey-task-icon').props.style)).toMatchObject({
    backgroundColor: '#493466',
    borderColor: '#B98CFF',
  });
  expect(view.getByTestId('daily-survey-task-title').props.children).toBe(activeChallenge.title);
  expect(view.getByTestId('daily-survey-task-description').props.children).toBe(activeChallenge.description);
  expect(view.getByTestId('daily-survey-task-title').props.numberOfLines).toBeUndefined();
  expect(view.getByTestId('daily-survey-task-description').props.ellipsizeMode).toBeUndefined();
  expect(view.getByTestId('ionicon-chatbubble-ellipses-outline').props.children).toBe('chatbubble-ellipses-outline');
  expect(`${view.getByTestId('daily-survey-task-title').props.children}${view.getByTestId('daily-survey-task-description').props.children}`)
    .not.toMatch(/[\p{Extended_Pictographic}\uFE0F]/u);
  expect(view.queryByRole('progressbar')).toBeNull();
  expect(view.getByRole('button', { name: `${activeChallenge.title}. ${activeChallenge.description}` }))
    .toBe(view.getByTestId('daily-survey-task-pressable'));

  fireEvent.press(view.getByTestId('daily-survey-task-pressable'));
  expect(onOpen).toHaveBeenCalledWith(activeChallenge);
});

test('completed survey shows a claimed check and cannot be pressed', async () => {
  const onOpen = jest.fn();
  const view = await render(<SurveyTaskCard challenge={{ ...activeChallenge, phase: 'completed', survey: null }} onOpen={onOpen} />);
  expect(view.getByTestId('daily-survey-task-claimed')).toBeTruthy();
  expect(view.getByTestId('ionicon-checkmark-circle')).toBeTruthy();
  expect(view.queryByRole('button')).toBeNull();
  expect(view.getByTestId('daily-survey-task-pressable').props.accessibilityState).toEqual({ disabled: true });
  fireEvent.press(view.getByTestId('daily-survey-task-pressable'));
  expect(onOpen).not.toHaveBeenCalled();
});

test('daily screen appends survey after normal sorted tasks and derives all counts from one helper', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks_screen.tsx'), 'utf8');
  const normalTasks = source.indexOf('{sortedTasks.map((task) => {');
  const survey = source.indexOf('<SurveyTaskCard challenge={surveySnapshot} onOpen={openSurveyChallenge} />');
  expect(normalTasks).toBeGreaterThan(-1);
  expect(survey).toBeGreaterThan(normalTasks);
  expect(source.match(/<SurveyTaskCard challenge=\{surveySnapshot\} onOpen=\{openSurveyChallenge\} \/>/g)).toHaveLength(1);
  expect(source.match(/computeSurveyDailyCounts\(\{/g)).toHaveLength(2);
  expect(source).not.toContain('doneWithSurvey');
  expect(source).not.toMatch(/const threshold = surveyPresent/);
  expect(source).toContain('dailyCounts.done >= dailyCounts.rewardThreshold');
  expect(source).not.toContain('taskCapsuleBottomTrack');
  expect(source).not.toContain('taskCapsuleBottomFill');
});

test('all-complete banner stays hidden at 3/4 until the survey is completed', () => {
  const activeCounts = computeSurveyDailyCounts({
    baseTotal: 3,
    baseDone: 3,
    survey: { phase: 'active', survey: activeChallenge.survey },
  });
  const completedCounts = computeSurveyDailyCounts({
    baseTotal: 3,
    baseDone: 3,
    survey: { phase: 'completed', survey: null },
  });
  expect(activeCounts.done >= activeCounts.total).toBe(false);
  expect(completedCounts.done >= completedCounts.total).toBe(true);

  const source = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks_screen.tsx'), 'utf8');
  expect(source).toContain('dailyCounts.done >= dailyCounts.total && dailyCounts.total > 0');
  expect(source).not.toContain('claimedCount === tasks.length');
});

test('RNTL config discovers exactly this new survey card suite', () => {
  const config = fs.readFileSync(path.join(ROOT, 'jest.rntl.config.cjs'), 'utf8');
  expect(config.match(/survey_daily_challenge_render\.test\.tsx/g)).toHaveLength(1);
  expect(config).not.toContain('survey_daily_task_card_render.test.tsx');
});
