/**
 * Extends the static app.json config.
 * For local dev builds, set EXPO_PUBLIC_DISABLE_EXPO_UPDATES=1 so the dev
 * client uses the bundled JS instead of checking Expo Updates on startup.
 */
module.exports = ({ config }) => {
  const disableExpoUpdates = process.env.EXPO_PUBLIC_DISABLE_EXPO_UPDATES === '1';

  const updates = config.updates
    ? {
        ...config.updates,
        enabled: disableExpoUpdates ? false : config.updates.enabled !== false,
      }
    : disableExpoUpdates
      ? { enabled: false }
      : undefined;

  return {
    ...config,
    ...(updates ? { updates } : {}),
  };
};
