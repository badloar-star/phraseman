import { Image } from 'react-native';

// Pre-load all critical images at app startup so they're cached locally
// Prevents images from disappearing when PC goes offline in Expo dev mode
// Uses Image.prefetch() for network URIs and Image.getSize() for bundled require() paths

const CLUB_IMAGES = [
  require('../assets/images/levels/club_initiators.png'),
  require('../assets/images/levels/club_adepts.png'),
  require('../assets/images/levels/club_seekers.png'),
  require('../assets/images/levels/club_practitioners.png'),
  require('../assets/images/levels/club_analysts.png'),
  require('../assets/images/levels/club_erudites.png'),
  require('../assets/images/levels/club_connoisseurs.png'),
  require('../assets/images/levels/club_experts.png'),
  require('../assets/images/levels/club_magistri.png'),
  require('../assets/images/levels/club_thinkers.png'),
  require('../assets/images/levels/club_masters.png'),
  require('../assets/images/levels/club_professors.png'),
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
    // Pre-load club logos (12 images)
    const clubPromises = CLUB_IMAGES.map(source =>
      new Promise<void>(resolve => {
        Image.getSize(source, () => resolve(), () => resolve());
      })
    );

    // Pre-load medal images (6 images)
    const medalPromises = MEDAL_IMAGES.map(source =>
      new Promise<void>(resolve => {
        Image.getSize(source, () => resolve(), () => resolve());
      })
    );

    // Batch preload in groups to avoid overwhelming the system
    await Promise.all([...clubPromises, ...medalPromises]);
  } catch {
    // Silently fail - preloading is optional
  }
};
