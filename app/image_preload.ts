import { Image } from 'react-native';

// Pre-load all critical images at app startup so they're cached locally.
// NOTE: Image.getSize() only works with network URIs — NOT with require() assets.
// Bundled require() assets are already included in the app bundle by Metro and
// do not need prefetching. We use Image.resolveAssetSource() to warm up the
// asset registry without triggering the "No suitable URL request handler for (null)" error.

const CLUB_IMAGES = [
  require('../assets/images/levels/club icon base forest.png'),
  require('../assets/images/levels/club base ocean.png'),
  require('../assets/images/levels/club base corak.png'),
  require('../assets/images/levels/club base sacura.png'),
  require('../assets/images/levels/club base neon.png'),
  require('../assets/images/levels/club icon base forest.png'),
  require('../assets/images/levels/club base ocean.png'),
  require('../assets/images/levels/club base corak.png'),
  require('../assets/images/levels/club base sacura.png'),
  require('../assets/images/levels/club base neon.png'),
  require('../assets/images/levels/club icon base forest.png'),
  require('../assets/images/levels/club base neon.png'),
];

const MEDAL_IMAGES = [
  require('../assets/images/levels/bronza.png'),
  require('../assets/images/levels/serebro.png'),
  require('../assets/images/levels/zoloto.png'),
  require('../assets/images/levels/rubin.png'),
  require('../assets/images/levels/izumrud.png'),
  require('../assets/images/levels/almaz.png'),
];

export const preloadImages = async () => {
  try {
    // Warm up the asset registry for bundled require() resources.
    // Image.resolveAssetSource() is the correct API for local assets —
    // it does NOT make any network requests and does NOT crash with (null).
    const allImages = [...CLUB_IMAGES, ...MEDAL_IMAGES];
    allImages.forEach(source => {
      try {
        const resolved = Image.resolveAssetSource(source);
        if (resolved?.uri && resolved.uri.startsWith('http')) {
          // In Expo dev mode assets may be served over Metro's dev server —
          // in that case we can prefetch the resolved network URI safely.
          Image.prefetch(resolved.uri).catch(() => {});
        }
        // For file:// or bundled assets nothing more is needed —
        // they are already available on disk.
      } catch {
        // Individual asset resolution failure must never crash the app.
      }
    });
  } catch {
    // Silently fail - preloading is entirely optional
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
