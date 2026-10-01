// зачем (координатор §49, 2026-10-02): expo-speech тянет нативный EventEmitter из
// expo-modules-core — набор карточки нового слова падал на импорте (через
// hooks/use-audio). Речь в RNTL не проверяется: немой синтезатор с тем же срезом API.
module.exports = {
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  pause: jest.fn(async () => undefined),
  resume: jest.fn(async () => undefined),
  isSpeakingAsync: jest.fn(async () => false),
  getAvailableVoicesAsync: jest.fn(async () => []),
  maxSpeechInputLength: 4000,
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
};
