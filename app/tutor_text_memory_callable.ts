import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';

/** Lightweight callable adapter for text-tutor privacy controls only. */
export function tutorTextMemoryCallable<TResponse>(
  name: string,
): (request: Record<string, unknown>) => Promise<TResponse> {
  return async (request) => {
    await initFirebaseAppCheckIfAvailable();
    const callable = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name);
    const response = await callable(request);
    return response.data as TResponse;
  };
}
