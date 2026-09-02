import React, { useEffect, useState } from 'react';
import { View, Text, Platform, Pressable, Linking, AccessibilityInfo } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { onAppEvent } from '../app/events';
import { getStableId } from '../app/stable_id';
import {
  getManualUpdateBody,
  getManualUpdateCampaignId,
  getManualUpdateCta,
  getManualUpdateMode,
  getManualUpdatePlatform,
  getManualUpdateTargetBuild,
  getManualUpdateTitle,
  getMinAppVersion,
  getStoreUrlAndroid,
  getStoreUrlIos,
  isFlagEnabledForUser,
  shouldForceUpdate,
  shouldShowManualUpdate,
} from '../app/remote_flags';
import {
  campaignDismissalKey,
  isCampaignDismissed,
  markCampaignDismissed,
} from '../app/campaign_dismissals';
import { STORE_URL_IOS, STORE_URL_ANDROID } from '../app/config';
import { DebugLogger } from '../app/debug-logger';

type GateMode = 'force' | 'optional';

interface GateState {
  source: 'legacy-force' | 'manual';
  mode: GateMode;
  campaignId: string;
  title: string;
  body: string;
  cta: string;
  storeUrl: string;
}

function currentAppVersion(): string {
  return String(Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '');
}

function currentNativeBuildMarker(): string {
  const cfg = Constants.expoConfig as {
    ios?: { buildNumber?: string | number | null };
    android?: { versionCode?: string | number | null };
  } | null;
  const nativeBuild = (Constants as { nativeBuildVersion?: string | null }).nativeBuildVersion;
  if (Platform.OS === 'ios') {
    return String(cfg?.ios?.buildNumber ?? nativeBuild ?? currentAppVersion() ?? '');
  }
  if (Platform.OS === 'android') {
    return String(cfg?.android?.versionCode ?? nativeBuild ?? currentAppVersion() ?? '');
  }
  return String(nativeBuild ?? currentAppVersion() ?? '');
}

function currentComparableForTarget(targetBuild: string): string {
  return /^\d+$/.test(String(targetBuild || '').trim())
    ? currentNativeBuildMarker()
    : currentAppVersion();
}

// зачем: владелец включает окно обновления в «Пульте» и ждёт, что оно покажется.
// Раньше при пустых store_url_* в remote_config гейт молча возвращал null и окно
// не появлялось НИ У КОГО — без единого лога (класс бага «механизм есть, данных
// не дали»). Ссылки на сторы у нас постоянные и уже лежат в app/config.ts,
// поэтому remote-значение теперь лишь ПЕРЕОПРЕДЕЛЯЕТ дефолт, а не является
// обязательным условием показа.
function storeUrlForPlatform(): string {
  const override = String((Platform.OS === 'ios' ? getStoreUrlIos() : getStoreUrlAndroid()) || '').trim();
  if (override) return override;
  const fallback = Platform.OS === 'ios' ? STORE_URL_IOS : STORE_URL_ANDROID;
  return String(fallback || '').trim();
}

// Голос Компаса (канон): даже блокирующее окно говорит от первого лица, тепло.
// Не казённое «Доступно обновление / Мы улучшили приложение», а «это Компас, без
// свежей версии дальше не пройдём — давай обновимся».
function defaultTitle(lang: string): string {
  return triLang(lang as Lang, {
    ru: 'Это Компас. Без обновления дальше никак',
    uk: 'Це Компас. Без оновлення далі ніяк',
    en: "It's Compass. No going further without an update",
    es: 'Soy la Brújula. Sin actualizar no seguimos',
    'pt-BR': 'É a Bússola. Sem atualizar não dá',
    vi: 'Mình là La bàn. Chưa cập nhật thì chưa đi tiếp được',
    id: 'Ini Kompas. Tanpa pembaruan tak bisa lanjut',
    tr: 'Ben Pusula. Güncellemeden devam edemeyiz',
    pl: 'Tu Kompas. Bez aktualizacji nie ruszymy dalej',
  });
}

function defaultBody(lang: string): string {
  return triLang(lang as Lang, {
    ru: 'Я заметно подрос, и старая версия меня уже не тянет. Обнови — и продолжим путь там же, где остановились.',
    uk: 'Я помітно підріс, і стара версія мене вже не тягне. Онови — і продовжимо шлях там само, де спинилися.',
    en: "I've grown a lot, and the old version can't keep up anymore. Update, and we'll pick up right where we left off.",
    es: 'Crecí bastante y la versión vieja ya no me sostiene. Actualiza y seguimos justo donde lo dejamos.',
    'pt-BR': 'Cresci bastante e a versão antiga já não me aguenta. Atualiza e seguimos de onde paramos.',
    vi: 'Mình lớn lên nhiều, bản cũ không kham nổi nữa. Cập nhật đi, rồi mình đi tiếp ngay chỗ đã dừng.',
    id: 'Aku tumbuh cukup besar, versi lama tak sanggup lagi. Perbarui, lalu kita lanjut dari tempat tadi.',
    tr: 'Epey büyüdüm, eski sürüm beni artık taşımıyor. Güncelle, kaldığımız yerden devam edelim.',
    pl: 'Sporo urosłem i stara wersja już mnie nie udźwignie. Zaktualizuj — ruszymy stamtąd, gdzie staniliśmy.',
  });
}

function defaultCta(lang: string): string {
  return triLang(lang as Lang, {
    ru: 'Обновить',
    uk: 'Оновити',
    en: 'Update',
    es: 'Actualizar',
    'pt-BR': 'Atualizar',
    vi: 'Cập nhật',
    id: 'Perbarui',
    tr: 'Güncelle',
    pl: 'Zaktualizuj',
  });
}

function readLegacyForceState(lang: string, userId: string | null): GateState | null {
  const storeUrl = storeUrlForPlatform();
  if (!storeUrl) return null;
  const blocked = shouldForceUpdate({
    enabled: isFlagEnabledForUser('force_update_enabled', userId),
    currentVersion: currentAppVersion(),
    minVersion: getMinAppVersion(),
  });
  if (!blocked) return null;
  return {
    source: 'legacy-force',
    mode: 'force',
    campaignId: 'legacy-force-update',
    title: triLang(lang as Lang, {
      ru: 'Это Компас. Пора меня обновить',
      uk: 'Це Компас. Час мене оновити',
      en: "It's Compass. Time to update me",
      es: 'Soy la Brújula. Toca actualizarme',
      'pt-BR': 'É a Bússola. Hora de me atualizar',
      vi: 'Mình là La bàn. Đến lúc cập nhật mình rồi',
      id: 'Ini Kompas. Saatnya memperbarui aku',
      tr: 'Ben Pusula. Beni güncelleme zamanı',
      pl: 'Tu Kompas. Czas mnie zaktualizować',
    }),
    body: defaultBody(lang),
    cta: defaultCta(lang),
    storeUrl,
  };
}

async function readManualState(lang: string, userId: string | null): Promise<GateState | null> {
  // зачем: единый префикс [MANUAL-UPDATE] — владелец одним grep видит, почему
  // включённое в «Пульте» окно не показалось. Каждый ранний выход печатает
  // ЗНАЧЕНИЕ, которое его решило, а не голое true/false.
  const storeUrl = storeUrlForPlatform();
  if (!storeUrl) {
    console.warn('[MANUAL-UPDATE] skip: no store url', {
      platform: Platform.OS,
      remoteIos: getStoreUrlIos(),
      remoteAndroid: getStoreUrlAndroid(),
    });
    return null;
  }

  const enabled = isFlagEnabledForUser('manual_update_enabled', userId);
  const campaignId = getManualUpdateCampaignId().trim();
  const mode = getManualUpdateMode();
  const platformFilter = getManualUpdatePlatform();
  const targetBuild = getManualUpdateTargetBuild().trim();
  const currentBuild = currentComparableForTarget(targetBuild);
  const dismissedKey = campaignDismissalKey('manual_update', campaignId);
  const alreadySeen = mode === 'optional' ? await isCampaignDismissed(dismissedKey) : false;
  const shouldShow = shouldShowManualUpdate({
    enabled,
    campaignId,
    mode,
    currentBuild,
    targetBuild,
    platformFilter,
    platform: Platform.OS,
    seenCampaignIds: alreadySeen ? [campaignId] : [],
  });
  if (!shouldShow) {
    console.warn('[MANUAL-UPDATE] skip: gate says no', {
      enabled,
      campaignId,
      mode,
      platformFilter,
      platform: Platform.OS,
      targetBuild,
      currentBuild,
      alreadySeen,
      userId,
    });
    return null;
  }
  console.log('[MANUAL-UPDATE] showing modal', {
    campaignId, mode, platformFilter, platform: Platform.OS, targetBuild, currentBuild, storeUrl,
  });

  const title = getManualUpdateTitle(lang).trim() || defaultTitle(lang);
  const body = getManualUpdateBody(lang).trim() || defaultBody(lang);
  const cta = getManualUpdateCta(lang).trim() || defaultCta(lang);
  return { source: 'manual', mode, campaignId, title, body, cta, storeUrl };
}

async function readGateState(lang: string, userId: string | null): Promise<GateState | null> {
  const legacy = readLegacyForceState(lang, userId);
  if (legacy) return legacy;
  return readManualState(lang, userId);
}

export default function ForceUpdateGate() {
  const { lang } = useLang();
  const { themeMode } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [gate, setGate] = useState<GateState | null>(null);
  // Пока открыт предпросмотр, обычный поток не перерисовывает окно.
  const previewRef = React.useRef(false);

  useEffect(() => {
    let dead = false;
    void getStableId().then((id) => { if (!dead) setUserId(id || null); }).catch(() => {});
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    let dead = false;
    const refresh = () => {
      // Предпросмотр из дев-хаба главнее конфига: пока он открыт, обновление
      // remote_config не должно смахивать окно с экрана.
      if (previewRef.current) return;
      void readGateState(lang, userId).then((next) => { if (!dead) setGate(next); });
    };
    refresh();
    const sub = onAppEvent('remote_config_changed', refresh);
    return () => { dead = true; sub.remove(); };
  }, [lang, userId]);

  /**
   * зачем (владелец 2026-09-02): дев-хаб показывает НАСТОЯЩЕЕ окно на этом
   * телефоне. Раньше единственным способом его увидеть было включить показ в
   * Пульте — то есть сразу всем живым пользователям. Здесь состояние собирается
   * локально, remote_config не читается и не пишется.
   */
  useEffect(() => {
    const sub = onAppEvent('update_modal_preview', (payload) => {
      const mode: GateMode = payload?.mode === 'force' ? 'force' : 'optional';
      const storeUrl = storeUrlForPlatform();
      if (!storeUrl) {
        console.warn('[MANUAL-UPDATE] предпросмотр отменён: нет ссылки на стор', {
          platform: Platform.OS,
        });
        return;
      }
      previewRef.current = true;
      setGate({
        source: 'manual',
        mode,
        campaignId: 'dev_preview',
        title: getManualUpdateTitle(lang).trim() || defaultTitle(lang),
        body: getManualUpdateBody(lang).trim() || defaultBody(lang),
        cta: getManualUpdateCta(lang).trim() || defaultCta(lang),
        storeUrl,
      });
      console.log('[MANUAL-UPDATE] предпросмотр из дев-хаба', { mode, storeUrl });
    });
    return () => sub.remove();
  }, [lang]);

  // ВАЖНО: НЕ помечаем optional-кампанию «просмотренной» в момент показа.
  // Раньше тут стоял useEffect, который писал dismissal сразу при рендере модалки.
  // Это давало гонку: userId резолвится асинхронно (см. эффект выше) и повторный
  // refresh()/remote_config_changed читал уже записанный dismissal → модалка
  // пропадала сама, до того как пользователь нажал «Обновить» или «Закрыть».
  // Теперь dismissal пишется ТОЛЬКО по реальному действию пользователя
  // (closeOptional / openStore) — окно держится на экране, пока его не закроют.

  /**
   * зачем (владелец 2026-09-02, «премиальные модалы»): движение — часть смысла,
   * а не украшение. Свободное окно ПОДНИМАЕТСЯ снизу (приложение видно за ним,
   * уйти можно), принудительное ОСЕДАЕТ сверху на сплошной фон — жест
   * закрывшегося шлагбаума. Разницу видно до того, как прочитан текст.
   *
   * Хуки стоят ДО раннего возврата: правило хуков React запрещает вызывать их
   * условно, иначе при появлении окна порядок хуков разъедется и экран упадёт.
   */
  const forced = gate?.mode === 'force';
  // зачем: бесконечная пульсация обязана замирать в фоне и на невидимом
  // экране, иначе она греет батарею впустую (контракт perf_freeze).
  const runtimeActive = useRuntimeActive();
  const enter = useSharedValue(0);
  const halo = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let dead = false;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => { if (!dead) setReduceMotion(on); })
      .catch((e) => {
        // зачем: запрет немого catch. Не смогли узнать настройку — считаем, что
        // движение разрешено, но причина обязана попасть в лог.
        console.warn('[MANUAL-UPDATE] reduce-motion check failed', {
          reason: e instanceof Error ? e.message : String(e),
        });
      });
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    if (!gate) { enter.value = 0; return; }
    if (reduceMotion) { enter.value = 1; return; }
    enter.value = 0;
    enter.value = withTiming(1, {
      duration: forced ? 560 : 520,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [enter, forced, gate, reduceMotion]);

  useEffect(() => {
    // Пульсация вокруг знака — ТОЛЬКО там, где выхода нет: уйти нельзя, и
    // внимание должно оставаться на действии. В свободном окне это было бы
    // давлением без причины.
    if (!gate || !forced || reduceMotion || !runtimeActive) { halo.value = 0; return; }
    halo.value = withDelay(400, withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    ));
  }, [forced, gate, halo, reduceMotion, runtimeActive]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      // Свободное всплывает снизу (+28), принудительное оседает сверху (-15).
      { translateY: (1 - enter.value) * (forced ? -15 : 28) },
      { scale: forced ? 1 + (1 - enter.value) * 0.025 : 1 - (1 - enter.value) * 0.03 },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - halo.value) * 0.6,
    transform: [{ scale: 1 + halo.value * 0.55 }],
  }));

  if (!gate) return null;

  const optional = gate.mode === 'optional';

  /**
   * зачем: в ПРЕДПРОСМОТРЕ крестик обязан работать и в принудительном режиме —
   * иначе разработчик, нажав «Принудительное окно» в дев-хабе, запер бы себе
   * приложение до перезапуска. В боевом показе поведение прежнее: force закрыть
   * нельзя.
   */
  const preview = gate.campaignId === 'dev_preview';
  const closable = optional || preview;

  const closeOptional = () => {
    if (!closable) return;
    if (preview) {
      previewRef.current = false;
      setGate(null);
      console.log('[MANUAL-UPDATE] предпросмотр закрыт');
      return;
    }
    void markCampaignDismissed(campaignDismissalKey('manual_update', gate.campaignId));
    setGate(null);
  };

  const openStore = () => {
    if (preview) {
      // Предпросмотр не должен записываться как настоящая показанная кампания:
      // иначе боевое окно с тем же id больше никогда не показалось бы.
      previewRef.current = false;
      setGate(null);
    } else if (optional) {
      void markCampaignDismissed(campaignDismissalKey('manual_update', gate.campaignId));
      setGate(null);
    }
    // зачем: запрет немого catch — если стор не открылся, причина обязана попасть
    // в лог, иначе «нажал Обновить и ничего» останется навсегда без диагноза.
    void Linking.openURL(gate.storeUrl).catch((e) => {
      console.warn('[MANUAL-UPDATE] store open failed', {
        storeUrl: gate.storeUrl,
        campaignId: gate.campaignId,
        reason: e instanceof Error ? e.message : String(e),
      });
      DebugLogger.error(
        'ForceUpdateGate:openStore',
        e instanceof Error ? e : new Error(String(e)),
        'warning',
      );
    });
  };

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(forced ? 360 : 420)}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        // Свободное окно оставляет приложение видимым за полупрозрачной
        // подложкой; принудительное гасит его целиком — за ним ничего нет.
        backgroundColor: optional ? 'rgba(8, 8, 13, 0.76)' : '#08080d',
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 24,
        zIndex: 10000, elevation: 10000,
      }}
    >
      <Animated.View
        style={[{
          width: '100%',
          maxWidth: 420,
          borderRadius: 22,
          backgroundColor: '#121826',
          // зачем: обводки контейнеров запрещены правилами владельца — глубину
          // держим тоном и тенью, а не рамкой.
          padding: 22,
          shadowColor: '#000',
          shadowOpacity: 0.42,
          shadowRadius: 34,
          shadowOffset: { width: 0, height: 18 },
          elevation: 14,
        }, sheetStyle]}
      >
        {closable && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={triLang(lang as Lang, {
              ru: 'Закрыть',
              uk: 'Закрити',
              en: 'Close',
              es: 'Cerrar',
              'pt-BR': 'Fechar',
              vi: 'Đóng',
              id: 'Tutup',
              tr: 'Kapat',
              pl: 'Zamknij',
            })}
            onPress={closeOptional}
            hitSlop={12}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1f2937',
            }}
          >
            <Ionicons name="close" size={20} color="#e5e7eb" />
          </Pressable>
        )}

        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            // зачем: янтарь у принудительного окна — это СЕМАНТИКА запрета, а не
            // второй акцент. Синий остаётся цветом обычного, необязательного
            // предложения обновиться.
            backgroundColor: forced ? '#3a2408' : '#eef2ff',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          {forced && (
            <Animated.View
              pointerEvents="none"
              style={[{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: 18,
                backgroundColor: 'rgba(251, 191, 36, 0.28)',
              }, haloStyle]}
            />
          )}
          <Ionicons
            name={forced ? 'lock-closed' : 'arrow-up-circle-outline'}
            size={28}
            color={forced ? '#fbbf24' : '#4338ca'}
          />
        </View>

        <Text style={{ color: '#fff', fontSize: 22, lineHeight: 28, fontWeight: '800', marginBottom: 10 }}>
          {gate.title}
        </Text>
        <Text style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 22, marginBottom: 18 }}>
          {gate.body}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={openStore}
          style={({ pressed }) => ({
            minHeight: 50,
            borderRadius: 14,
            backgroundColor: forced
              ? (pressed ? '#b45309' : '#d97706')
              : (pressed ? '#4f46e5' : '#6366f1'),
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          })}
        >
          <Ionicons name="open-outline" size={19} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
            {gate.cta}
          </Text>
        </Pressable>

        {closable && (
          <Pressable
            accessibilityRole="button"
            onPress={closeOptional}
            style={({ pressed }) => ({
              minHeight: 44,
              marginTop: 10,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? '#26324a' : 'transparent',
            })}
          >
            <Text style={{ color: '#9ca3af', fontSize: 14, fontWeight: '700' }}>
              {triLang(lang as Lang, {
                ru: 'Позже',
                uk: 'Пізніше',
                en: 'Later',
                es: 'Más tarde',
                'pt-BR': 'Mais tarde',
                vi: 'Để sau',
                id: 'Nanti',
                tr: 'Sonra',
                pl: 'Później',
              })}
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}
