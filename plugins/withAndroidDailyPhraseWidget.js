/**
 * Android: register the phrase-of-the-day Glance widget receiver.
 *
 * The widget code, Glance gradle deps, layouts and the widget-info XML all ship
 * inside the autolinked Expo module `modules/phrase-widget` (android/). This
 * plugin only has to add the <receiver> to the *app* AndroidManifest, because a
 * Glance AppWidgetReceiver must be declared in the application manifest with the
 * APPWIDGET_UPDATE intent filter + provider metadata.
 *
 * Idempotent: android/ is committed, so we no-op if the receiver already exists.
 */

const { withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');

const RECEIVER_NAME = 'app.phraseman.phrasewidget.PhraseWidgetReceiver';
const WIDGET_INFO_RESOURCE = '@xml/phrase_widget_info';

function ensureReceiver(androidManifest) {
  const application = androidManifest.manifest.application?.[0];
  if (!application) return androidManifest;

  application.receiver = application.receiver || [];

  const exists = application.receiver.some(
    (r) => r?.$?.['android:name'] === RECEIVER_NAME,
  );
  if (exists) return androidManifest;

  application.receiver.push({
    $: {
      'android:name': RECEIVER_NAME,
      'android:exported': 'false',
    },
    'intent-filter': [
      {
        action: [
          { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
        ],
      },
    ],
    'meta-data': [
      {
        $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': WIDGET_INFO_RESOURCE,
        },
      },
    ],
  });

  return androidManifest;
}

const withAndroidDailyPhraseWidget = (config) =>
  withAndroidManifest(config, (cfg) => {
    cfg.modResults = ensureReceiver(cfg.modResults);
    return cfg;
  });

module.exports = createRunOncePlugin(
  withAndroidDailyPhraseWidget,
  'withAndroidDailyPhraseWidget',
  '0.1.0',
);
