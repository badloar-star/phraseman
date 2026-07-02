// Реестр бандл-ассетов АХ-сцены. Metro резолвит require только с литеральным
// путём — поэтому явные мапы, без динамических путей.

import type { ImageSourcePropType } from 'react-native';

import type { AhaScenarioId } from './aha_types';

/** Фоновые иллюстрации сцен (webp 1080x1620, «Полночь»-палитра). */
export const AHA_BACKGROUNDS: Record<AhaScenarioId, ImageSourcePropType> = {
  travel: require('../../assets/images/onboarding_aha/bg_travel.webp'),
  work: require('../../assets/images/onboarding_aha/bg_work.webp'),
  media: require('../../assets/images/onboarding_aha/bg_media.webp'),
  people: require('../../assets/images/onboarding_aha/bg_people.webp'),
  everyday: require('../../assets/images/onboarding_aha/bg_everyday.webp'),
  self: require('../../assets/images/onboarding_aha/bg_self.webp'),
};

/** Реплика собеседника (бит 1). */
export const AHA_VOICE_HEAR: Record<AhaScenarioId, number> = {
  travel: require('../../assets/audio/onboarding_aha/travel_a.mp3'),
  work: require('../../assets/audio/onboarding_aha/work_a.mp3'),
  media: require('../../assets/audio/onboarding_aha/media_a.mp3'),
  people: require('../../assets/audio/onboarding_aha/people_a.mp3'),
  everyday: require('../../assets/audio/onboarding_aha/everyday_a.mp3'),
  self: require('../../assets/audio/onboarding_aha/self_a.mp3'),
};

/** Целевая фраза юзера — эталон носителя (биты 2 и 3). */
export const AHA_VOICE_SAY: Record<AhaScenarioId, number> = {
  travel: require('../../assets/audio/onboarding_aha/travel_b.mp3'),
  work: require('../../assets/audio/onboarding_aha/work_b.mp3'),
  media: require('../../assets/audio/onboarding_aha/media_b.mp3'),
  people: require('../../assets/audio/onboarding_aha/people_b.mp3'),
  everyday: require('../../assets/audio/onboarding_aha/everyday_b.mp3'),
  self: require('../../assets/audio/onboarding_aha/self_b.mp3'),
};

/** Тихий ambient-луп места (8с, −28 LUFS, mono). */
export const AHA_AMBIENT: Record<AhaScenarioId, number> = {
  travel: require('../../assets/audio/onboarding_aha/ambient_travel.mp3'),
  work: require('../../assets/audio/onboarding_aha/ambient_work.mp3'),
  media: require('../../assets/audio/onboarding_aha/ambient_media.mp3'),
  people: require('../../assets/audio/onboarding_aha/ambient_people.mp3'),
  everyday: require('../../assets/audio/onboarding_aha/ambient_everyday.mp3'),
  self: require('../../assets/audio/onboarding_aha/ambient_self.mp3'),
};
