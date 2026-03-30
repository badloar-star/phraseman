import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { LearningGoal } from '../../app/types/user_profile';
import { styles } from './onboarding.styles';

interface OnboardingGoalProps {
  isUK: boolean;
  goal: LearningGoal | null;
  onGoalSelect: (goal: LearningGoal) => void;
  onNext: () => void;
}

const GOALS: Array<{ key: LearningGoal; label: string; emoji: string }> = [
  { key: 'tourism', label: '🌍', emoji: '🌍' },
  { key: 'work', label: '💼', emoji: '💼' },
  { key: 'emigration', label: '🏠', emoji: '🏠' },
  { key: 'hobby', label: '🎬', emoji: '🎬' },
];

const GOAL_LABELS_RU: Record<LearningGoal, string> = {
  tourism: 'Туризм',
  work: 'Работа',
  emigration: 'Эмиграция',
  hobby: 'Хобби',
};

const GOAL_LABELS_UK: Record<LearningGoal, string> = {
  tourism: 'Туризм',
  work: 'Робота',
  emigration: 'Еміграція',
  hobby: 'Хобі',
};

export function OnboardingGoal({
  isUK,
  goal,
  onGoalSelect,
  onNext,
}: OnboardingGoalProps) {
  const labels = isUK ? GOAL_LABELS_UK : GOAL_LABELS_RU;
  const goalLabels = GOALS.map(g => ({
    ...g,
    label: labels[g.key],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
        <Text style={styles.appName}>Phraseman</Text>
        <Text style={styles.title}>
          {isUK ? 'Навіщо ти вчиш англійську?' : 'Зачем ты учишь английский?'}
        </Text>
        <View style={{ width: '100%', gap: 12, marginBottom: 20 }}>
          {goalLabels.map(g => (
            <TouchableOpacity
              key={g.key}
              style={[styles.optionButton, goal === g.key && styles.optionButtonSelected]}
              onPress={() => onGoalSelect(g.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionEmoji}>{g.emoji}</Text>
              <Text style={[styles.optionLabel, goal === g.key && styles.optionLabelSelected]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, !goal && { opacity: 0.5 }]}
          onPress={onNext}
          activeOpacity={0.85}
          disabled={!goal}
        >
          <Text style={styles.continueBtnText}>
            {isUK ? 'Далі' : 'Далее'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
