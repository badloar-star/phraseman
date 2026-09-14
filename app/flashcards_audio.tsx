import { Redirect } from 'expo-router';

/**
 * Compatibility target for historical deep links.
 *
 * Passive listening is no longer a Cards training mode. Keeping a redirect
 * avoids a broken route for old notifications/bookmarks without exposing the
 * removed workout again.
 */
export default function RemovedFlashcardsAudioRoute() {
  return <Redirect href="/flashcards" />;
}
