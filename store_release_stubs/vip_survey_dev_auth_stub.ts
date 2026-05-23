export async function readSavedDevCredential(): Promise<null> {
  return null;
}

export async function signInWithDevEmailCredential(): Promise<string> {
  throw new Error('dev_auth_disabled');
}
