import AsyncStorage from '@react-native-async-storage/async-storage';

export const DebugLogger = {
  error: (context: string, error: unknown, severity: 'critical' | 'warning' = 'warning') => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const msg = `[${severity.toUpperCase()}] ${context}: ${errorMessage}`;
    console.error(msg);

    const logKey = 'debug_log_' + Date.now();
    AsyncStorage.setItem(logKey, JSON.stringify({
      timestamp: new Date().toISOString(),
      context,
      error: errorMessage,
      stack: errorStack,
      severity,
    })).catch(err => console.error('Failed to log:', err));
  },

  warn: (context: string, message: string) => {
    console.warn(`[WARN] ${context}: ${message}`);
  },

  info: (context: string, message: string) => {
    console.log(`[INFO] ${context}: ${message}`);
  },

  clearOldLogs: async (daysOld: number = 7) => {
    const allKeys = await AsyncStorage.getAllKeys();
    const oldCutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    for (const key of allKeys) {
      if (key.startsWith('debug_log_')) {
        const timestamp = parseInt(key.replace('debug_log_', ''));
        if (timestamp < oldCutoff) {
          await AsyncStorage.removeItem(key);
        }
      }
    }
  },
};
