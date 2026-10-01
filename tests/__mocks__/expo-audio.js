// зачем (координатор §48, 2026-10-01): expo-audio тянет нативный EventEmitter;
// звуковой директор импортируется почти везде, и наборы падали на импорте. Звук в
// RNTL-тестах не проверяется — немой плеер с тем же срезом API.
const player = () => ({
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(async () => undefined),
  replace: jest.fn(),
  remove: jest.fn(),
  release: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  volume: 1,
  playing: false,
  currentTime: 0,
  duration: 0,
});

module.exports = {
  createAudioPlayer: jest.fn(player),
  useAudioPlayer: jest.fn(player),
  useAudioPlayerStatus: jest.fn(() => ({ playing: false, currentTime: 0, duration: 0, isLoaded: true })),
  setAudioModeAsync: jest.fn(async () => undefined),
  setIsAudioActiveAsync: jest.fn(async () => undefined),
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: false, status: 'denied' })),
  useAudioRecorder: jest.fn(() => ({ record: jest.fn(), stop: jest.fn(async () => undefined), prepareToRecordAsync: jest.fn(async () => undefined), uri: null })),
  RecordingPresets: { HIGH_QUALITY: {} },
  AudioModule: {},
};
