import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { STORE_URL_ANDROID, STORE_URL_IOS } from './config';
import { DebugLogger } from './debug-logger';

export function appStoreWriteReviewUrl(): string {
  const appId = STORE_URL_IOS.match(/id(\d+)/)?.[1] || '6764800879';
  return `itms-apps://itunes.apple.com/app/id${appId}?action=write-review`;
}

export function androidMarketUrl(): string {
  const packageName = STORE_URL_ANDROID.match(/[?&]id=([^&]+)/)?.[1] || 'app.phraseman';
  return `market://details?id=${packageName}`;
}

export function storeReviewUrls(): string[] {
  if (Platform.OS === 'ios') {
    const sep = STORE_URL_IOS.includes('?') ? '&' : '?';
    return [appStoreWriteReviewUrl(), `${STORE_URL_IOS}${sep}action=write-review`, STORE_URL_IOS];
  }
  return [androidMarketUrl(), STORE_URL_ANDROID];
}

export async function openStoreReviewPage(): Promise<boolean> {
  const urls = storeReviewUrls();
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return true;
    } catch (e) {
      // Try the next platform-specific store URL.
      DebugLogger.error('store_review:urls', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  try {
    const browserStoreUrl = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;
    await WebBrowser.openBrowserAsync(browserStoreUrl);
    return true;
  } catch {
    return false;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
