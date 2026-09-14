import fs from 'node:fs';
import path from 'node:path';

import {
  buildVoiceInstructions,
  TUTOR_GREETING_INSTRUCTIONS,
  tutorGreetingInstructionsFor,
} from '../functions/src/max_voice_prompt';
import {
  CAN_DO_GOALS,
  canDoProgress,
  renderCanDoGoalBlock,
  type CanDoMastery,
} from '../functions/src/max_voice_can_do_goals';

const PROMPT_CASES_PER_LESSON = 100;
const LEARNER_LANGUAGES = ['Russian', 'Ukrainian', 'Spanish', 'Brazilian Portuguese', 'Vietnamese', 'Indonesian', 'Turkish', 'Polish'] as const;

describe('MAX: proactive opening prompt contract for every lesson', () => {
  it('covers 100 varied prompt-contract cases for each of the 78 English lessons', () => {
    let cases = 0;
    const greeting = tutorGreetingInstructionsFor(600);

    for (const goal of CAN_DO_GOALS) {
      for (let index = 0; index < PROMPT_CASES_PER_LESSON; index += 1) {
        const mastery: CanDoMastery = {};
        const isFirstMeeting = index % 2 === 0;
        const goalBlock = renderCanDoGoalBlock(goal, mastery, canDoProgress(mastery));
        const instructions = buildVoiceInstructions({
          cefr: goal.level,
          format: 'tutor',
          personaName: 'Max',
          personaRole: 'teacher',
          learnerLangName: LEARNER_LANGUAGES[index % LEARNER_LANGUAGES.length],
          learnerSnapshot: `NAME: learner-${index + 1}`,
          tutorMemoryBlock: `${isFirstMeeting ? 'This is your FIRST lesson together.\n' : 'YOU HAVE ALREADY MET THIS LEARNER.\n'}${goalBlock}`,
        });
        cases += 1;
        expect(instructions).toContain(`Goal ${goal.id} (${goal.level}): the learner can ${goal.canDo}.`);
        expect(instructions).toContain(`Target phrases: ${goal.phrases.join(' | ')}.`);
        expect(instructions).toContain('state today\'s one current speaking goal');
        expect(instructions).toContain('model one useful target phrase');
        expect(instructions).toContain('FIRST-MEETING QUESTIONS COME AFTER the proactive opening');
        expect(instructions).toContain('ACTIVE SPEAKING COACHING');
        expect(instructions).toContain("You own the learner's next spoken step.");
        expect(instructions).toContain('Never say or imply "I will wait"');
        expect(instructions).toContain('Every teacher turn ends with one concrete spoken micro-task');
        expect(instructions).toContain('If the learner is silent or gives one word');
        expect(instructions).toContain('Do not fill the gap with a monologue.');
        expect(instructions).toContain('prompt production immediately');
        expect(greeting).toContain('State today\'s one current speaking goal');
        expect(greeting).toContain('model ONE useful target phrase');
        expect(greeting).toContain('ask ONE short practice question');
        expect(greeting).toContain('Do NOT say you will wait');
        expect(greeting).toContain('Do NOT state the lesson length, list options, or give a long agenda');
      }
    }

    expect(cases).toBe(CAN_DO_GOALS.length * PROMPT_CASES_PER_LESSON);
    expect(TUTOR_GREETING_INSTRUCTIONS).toContain('State today\'s one current speaking goal');
    expect(TUTOR_GREETING_INSTRUCTIONS).toContain('model ONE useful target phrase');
    expect(TUTOR_GREETING_INSTRUCTIONS).toContain('in the course language');
    expect(TUTOR_GREETING_INSTRUCTIONS).not.toContain('English phrase');
  });

  it('keeps the first response target-language neutral for French and Spanish courses', () => {
    for (const targetLangName of ['French', 'Spanish']) {
      const instructions = buildVoiceInstructions({
        cefr: 'A2',
        format: 'tutor',
        personaName: 'Max',
        personaRole: 'teacher',
        learnerLangName: 'Russian',
        targetLangName,
      });
      expect(instructions).toContain(`personal ${targetLangName} TEACHER`);
      expect(instructions).toContain(`course language is ${targetLangName}`);
      expect(TUTOR_GREETING_INSTRUCTIONS).toContain('in the course language');
      expect(TUTOR_GREETING_INSTRUCTIONS).not.toContain('English phrase');
    }
  });

  it('delivers the minted greeting instruction to the first Realtime response', () => {
    const root = process.cwd();
    const mintSource = fs.readFileSync(path.join(root, 'functions/src/max_voice_mint.ts'), 'utf8');
    const clientSource = fs.readFileSync(path.join(root, 'app/max_call_client.ts'), 'utf8');

    expect(mintSource).toContain('greetingInstructions: tutorGreetingInstructionsFor(maxSeconds)');
    expect(clientSource).toContain('instructions: mint?.tutor?.greetingInstructions || INITIAL_GREETING_INSTRUCTIONS');
    expect(clientSource).toContain("type: 'response.create'");
    expect(clientSource).toContain("output_modalities: ['audio']");
  });
});
