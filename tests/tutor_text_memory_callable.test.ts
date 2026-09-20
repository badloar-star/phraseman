/* eslint-disable import/first */
const mockGetApp = jest.fn(() => ({ name: 'app' }));
const mockGetFunctions = jest.fn(() => ({ region: 'us-central1' }));
const mockCallableRun = jest.fn(async (data: unknown) => ({ data: { echoed: data } }));
const mockHttpsCallable = jest.fn(() => mockCallableRun);
const mockInitAppCheck = jest.fn(async () => undefined);

jest.mock('@react-native-firebase/app', () => ({ getApp: mockGetApp }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: mockGetFunctions,
  httpsCallable: mockHttpsCallable,
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: mockInitAppCheck,
}));

import { tutorTextMemoryCallable } from '../app/tutor_text_memory_callable';

describe('text tutor memory Firebase adapter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initializes App Check and invokes the default-region callable directly', async () => {
    await expect(tutorTextMemoryCallable<{ echoed: unknown }>('tutorTextGetMemory')({ studyTarget: 'de' }))
      .resolves.toEqual({ echoed: { studyTarget: 'de' } });

    expect(mockInitAppCheck).toHaveBeenCalledTimes(1);
    expect(mockGetFunctions).toHaveBeenCalledWith({ name: 'app' }, 'us-central1');
    expect(mockHttpsCallable).toHaveBeenCalledWith({ region: 'us-central1' }, 'tutorTextGetMemory');
    expect(mockCallableRun).toHaveBeenCalledWith({ studyTarget: 'de' });
    expect(mockInitAppCheck.mock.invocationCallOrder[0]).toBeLessThan(mockHttpsCallable.mock.invocationCallOrder[0]);
  });
});
