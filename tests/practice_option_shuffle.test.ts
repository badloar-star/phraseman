import {
  buildPracticeOptionsByStepId,
  shufflePracticeOptionsAvoidingSameCorrectSlot,
} from '../app/practice_option_shuffle';

describe('practice option shuffle', () => {
  it('keeps all options but moves the correct answer away from the previous correct slot', () => {
    const options = [
      { id: 'correct', text: 'correct' },
      { id: 'wrong_1', text: 'wrong 1' },
      { id: 'wrong_2', text: 'wrong 2' },
      { id: 'wrong_3', text: 'wrong 3' },
    ];

    const firstPass = shufflePracticeOptionsAvoidingSameCorrectSlot(options, 'correct', null, () => 0);
    const firstCorrectIndex = firstPass.findIndex((option) => option.id === 'correct');
    const secondPass = shufflePracticeOptionsAvoidingSameCorrectSlot(options, 'correct', firstCorrectIndex, () => 0);

    expect(secondPass.findIndex((option) => option.id === 'correct')).not.toBe(firstCorrectIndex);
    expect(secondPass.map((option) => option.id).sort()).toEqual(options.map((option) => option.id).sort());
    expect(options.map((option) => option.id)).toEqual(['correct', 'wrong_1', 'wrong_2', 'wrong_3']);
  });

  it('does not let content with every correct answer first render as one repeated correct slot', () => {
    const steps = Array.from({ length: 6 }, (_, index) => ({
      id: `step_${index}`,
      correctAnswerId: `correct_${index}`,
      answerOptions: [
        { id: `correct_${index}`, text: 'correct' },
        { id: `wrong_${index}_1`, text: 'wrong 1' },
        { id: `wrong_${index}_2`, text: 'wrong 2' },
        { id: `wrong_${index}_3`, text: 'wrong 3' },
      ],
    }));

    const map = buildPracticeOptionsByStepId(steps, () => 0);
    const correctPositions = steps.map((step) => {
      const options = map.get(step.id) ?? [];
      return options.findIndex((option) => option.id === step.correctAnswerId);
    });

    expect(new Set(correctPositions).size).toBeGreaterThan(1);
    for (let i = 1; i < correctPositions.length; i++) {
      expect(correctPositions[i]).not.toBe(correctPositions[i - 1]);
    }
  });
});
