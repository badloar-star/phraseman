export const MODEL_ID = 'eleven_text_to_sound_v2';
export const PROMPT_INFLUENCE = 0.65;

export const TIMELINE_MS = Object.freeze({
  duration: 6200,
  pulses: Object.freeze([2800, 3230, 3660]),
  reveal: 4100,
});

export const AUDIO_CUES = Object.freeze([
  Object.freeze({ kind: 'intro', durationSeconds: 2.6 }),
  Object.freeze({ kind: 'pulse', durationSeconds: 0.5 }),
  Object.freeze({ kind: 'reveal', durationSeconds: 2.1 }),
  Object.freeze({ kind: 'tap', durationSeconds: 0.5 }),
]);

const NO_SPEECH = 'No speech, no voice, no words, no vocals, no melody.';

const packDefinitions = [
  {
    id: 'crystal',
    label: 'Кристалл',
    prompts: {
      intro: 'Elegant crystalline UI atmosphere blooming from silence, tiny glass particles, airy and luminous, premium mobile game reward, restrained dynamics.',
      pulse: 'Single short crystalline energy pulse, rounded glass ping with a soft low body, precise premium game UI accent, no harsh high frequencies.',
      reveal: 'Airy crystalline riser for one second, then one bright controlled reward impact followed by shimmering glass dust and a soft luminous tail.',
      tap: 'Short premium crystalline UI confirmation tap, soft glass click with a warm rounded tail, clean and restrained.',
    },
  },
  {
    id: 'runes',
    label: 'Руны',
    prompts: {
      intro: 'Ancient rune chamber atmosphere emerging from silence, subtle stone resonance, dry magical ink crackle, low warm hum, calm not ominous.',
      pulse: 'Single compact rune pulse, carved stone resonance with a small magical ink snap, weighty but friendly premium game UI accent.',
      reveal: 'Ancient magical rise with stone and ink texture for one second, then one controlled rune impact and a warm resonant halo, not ominous.',
      tap: 'Short tactile rune UI confirmation, small carved stone click with a quiet magical resonance, clean and friendly.',
    },
  },
  {
    id: 'arcade',
    label: 'Игра',
    prompts: {
      intro: 'Modern premium game reward atmosphere, soft synth energy waking up, playful elastic texture, polished and confident, never casino-like.',
      pulse: 'Single short elastic synth pulse, juicy reward UI pop with a rounded transient and compact bass body, playful but premium.',
      reveal: 'Fast polished synth riser for one second, then one satisfying elastic reward pop with bright digital shimmer and a clean short tail, not casino-like.',
      tap: 'Short modern game UI confirmation tap, elastic digital click with a tiny positive shimmer, premium and restrained.',
    },
  },
  {
    id: 'cinematic',
    label: 'Кино',
    prompts: {
      intro: 'Wide cinematic reward atmosphere from silence, restrained sub-bass heartbeat, distant luminous air, premium and calm, suitable for a mobile interface.',
      pulse: 'Single cinematic energy pulse, soft sub-bass body with a luminous high accent, compact controlled transient, premium mobile UI.',
      reveal: 'Wide cinematic riser for one second, then one controlled deep impact with luminous rays and an elegant decaying halo, powerful but not loud or frightening.',
      tap: 'Short cinematic UI confirmation tap, muted low click with a tiny luminous tail, expensive and controlled.',
    },
  },
  {
    id: 'tactile',
    label: 'Тактильность',
    prompts: {
      intro: 'Minimal tactile interface atmosphere, nearly silent airy room tone, subtle magnetic movement and soft material detail, calm premium product sound.',
      pulse: 'Single minimal magnetic pulse, soft physical click with a breath of air, precise tactile premium interface sound.',
      reveal: 'Minimal soft air whoosh rising for one second, then one clean magnetic impact and a very short natural decay, tactile and refined.',
      tap: 'Short soft magnetic confirmation click, physical tactile UI sound with immediate clean decay.',
    },
  },
];

export const SOUND_PACKS = Object.freeze(
  packDefinitions.map((pack) => Object.freeze({
    ...pack,
    prompts: Object.freeze(
      Object.fromEntries(
        Object.entries(pack.prompts).map(([kind, prompt]) => [
          kind,
          `${prompt} ${NO_SPEECH}`,
        ]),
      ),
    ),
  })),
);
