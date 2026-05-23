import React from 'react';
import QuizzesScreen from './(tabs)/quizzes';
import { TabProvider } from './TabContext';

export default function QuizzesStandaloneScreen() {
  return (
    <TabProvider activeIdx={0} onTabChange={() => {}} onSwipeStart={() => {}} onSwipeComplete={() => {}} focusTick={0}>
      <QuizzesScreen />
    </TabProvider>
  );
}
