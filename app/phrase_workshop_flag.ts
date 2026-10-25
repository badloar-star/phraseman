// зачем (владелец 25.10, «Мастерская фраз»; координатор: «код режима — за флагом»): один рубильник входа в режим.
// В релизе выключен, пока владелец не скажет включать (меняется одной строкой + OTA); в dev включён для проверки.
// Голый __DEV__ в тестах — ReferenceError, поэтому через typeof.
export const PHRASE_WORKSHOP_ENABLED_IN_RELEASE = false;

export function isPhraseWorkshopEnabled(): boolean {
  const dev = typeof __DEV__ !== 'undefined' && __DEV__ === true;
  return PHRASE_WORKSHOP_ENABLED_IN_RELEASE || dev;
}
