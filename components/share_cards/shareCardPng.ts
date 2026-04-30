import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { Share } from 'react-native';
import type { RefObject } from 'react';
import Svg from 'react-native-svg';

function stripDataUrl(b64: string) {
  const i = b64.indexOf(',');
  if (b64.startsWith('data:') && i !== -1) return b64.slice(i + 1);
  return b64;
}

/** Динамический import: иначе нативный ExpoSharing грузится при открытии любого экрана с shareCardPng и падает, если модуля нет в бинарнике. */
async function sharePngWithExpoSharing(path: string): Promise<boolean> {
  try {
    const Sharing = await import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'image/png' });
      return true;
    }
  } catch {
    // «Cannot find native module 'ExpoSharing'» — старый dev client / веб / неполная сборка
  }
  return false;
}

export type ShareCardPngOptions = {
  fileNamePrefix: string;
  textFallback: string;
  /** Export PNG dimensions. Default 1080×1080 (square share-cards). */
  width?: number;
  height?: number;
};

/**
 * Exports a `Svg` to a PNG and opens the system share sheet. Default размер
 * экспорта 1080×1080; для landscape-сертификата передаём 1500×1080.
 */
export async function shareCardFromSvgRef(
  svgRef: RefObject<InstanceType<typeof Svg> | null>,
  options: ShareCardPngOptions
): Promise<void> {
  const { fileNamePrefix, textFallback, width = 1080, height = 1080 } = options;
  const el = svgRef.current;
  if (!el || typeof el.toDataURL !== 'function') {
    await Share.share({ message: textFallback }).catch(() => {});
    return;
  }
  let raw: string;
  try {
    const data = await new Promise<string>((resolve, reject) => {
      try {
        el.toDataURL(
          (b64) => resolve(b64),
          { width, height, backgroundColor: 'transparent' }
        );
      } catch (e) {
        reject(e);
      }
    });
    raw = stripDataUrl(data);
  } catch {
    await Share.share({ message: textFallback }).catch(() => {});
    return;
  }
  if (!cacheDirectory) {
    await Share.share({ message: textFallback }).catch(() => {});
    return;
  }
  const path = `${cacheDirectory}${fileNamePrefix}-${Date.now()}.png`;
  try {
    await writeAsStringAsync(path, raw, { encoding: EncodingType.Base64 });
  } catch {
    await Share.share({ message: textFallback }).catch(() => {});
    return;
  }
  const shared = await sharePngWithExpoSharing(path);
  if (!shared) {
    await Share.share({ message: textFallback }).catch(() => {});
  }
}
