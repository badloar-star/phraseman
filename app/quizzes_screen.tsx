import React from 'react';
import QuizzesScreen from './(tabs)/quizzes';
import { TabProvider } from './TabContext';

export default function QuizzesStandaloneScreen() {
  return (
    <TabProvider activeIdx={2} onTabChange={() => {}} focusTick={0}>
      <QuizzesScreen />
    </TabProvider>
  );
}
