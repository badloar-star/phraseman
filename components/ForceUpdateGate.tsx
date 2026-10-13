import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';

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
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { noAndroidOutline } from '../constants/androidGlow';
import ResponsiveModalScrollView from './ResponsiveModalScrollView';
import { LinearGradient } from './SafeLinearGradient';
import { noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type GateMode = 'force' | 'optional';
const blockAndroidBack = () => undefined;

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
// зачем: паритет с макетом system.html (кадры system_08/09) — у обязательного и мягкого окна
// разные русские заголовок и текст; остальные языки остаются как были.
function defaultTitle(lang: string, mode: GateMode = 'force'): string {
  if (mode === 'optional') {
    return triLang(lang as Lang, {
      ru: 'Это Компас. У меня кое-что новое',
      uk: 'Це Компас. У мене дещо нове',
      en: "It's Compass. I've got something new",
      es: 'Soy la Brújula. Tengo algo nuevo',
      'pt-BR': 'É a Bússola. Tenho uma novidade',
      vi: 'Mình là La bàn. Mình có điều mới đây',
      id: 'Ini Kompas. Ada yang baru dariku',
      tr: 'Ben Pusula. Sana yeni bir şeyim var',
      pl: 'Tu Kompas. Mam coś nowego',
    });
  }
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

function defaultBody(lang: string, mode: GateMode = 'force'): string {
  if (mode === 'optional') {
    return triLang(lang as Lang, {
      ru: 'Доступна новая версия — быстрее и удобнее.',
      uk: 'Доступна нова версія — швидше й зручніше.',
      en: 'A new version is available — faster and easier.',
      es: 'Hay una versión nueva: más rápida y cómoda.',
      'pt-BR': 'Há uma nova versão — mais rápida e prática.',
      vi: 'Đã có phiên bản mới — nhanh và tiện hơn.',
      id: 'Versi baru tersedia — lebih cepat dan nyaman.',
      tr: 'Yeni sürüm var — daha hızlı ve rahat.',
      pl: 'Jest nowa wersja — szybsza i wygodniejsza.',
    });
  }
  // зачем (D168, владелец 13.10): окно обязательного обновления — простой понятный текст на всех 9 языках, без голоса маскота;
  // раньше у ru был отдельный простой текст, а у остальных языков — «Я заметно подрос…».
  return triLang(lang as Lang, {
    ru: 'Вышла новая версия PhraseMan. Обнови приложение, чтобы продолжить.',
    uk: 'Вийшла нова версія PhraseMan. Онови застосунок, щоб продовжити.',
    en: 'A new version of PhraseMan is out. Update the app to continue.',
    es: 'Hay una nueva versión de PhraseMan. Actualiza la app para continuar.',
    'pt-BR': 'Saiu uma nova versão do PhraseMan. Atualize o app para continuar.',
    vi: 'Đã có phiên bản PhraseMan mới. Hãy cập nhật ứng dụng để tiếp tục.',
    id: 'Versi baru PhraseMan sudah tersedia. Perbarui aplikasi untuk melanjutkan.',
    tr: 'PhraseMan’in yeni sürümü çıktı. Devam etmek için uygulamayı güncelle.',
    pl: 'Jest nowa wersja PhraseMan. Zaktualizuj aplikację, aby kontynuować.',
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

// зачем (координатор §66, замер Q53 2026-10-02): окно проверяется дважды за старт —
// на кэше конфига при монтировании и после свежего remote_config
// (remote_config_changed). Второй проход нужен (иначе новое значение из «Пульта» не
// сработает до следующего запуска), а вот одинаковая строка лога с теми же
// значениями — лишний мост в нативный лог в окне старта. Лог раннего выхода
// печатаем, только когда решение или его входы изменились.
let lastManualSkipLog = '';
function warnManualSkipOnce(reason: string, details: Record<string, unknown>): void {
  const signature = `${reason}|${JSON.stringify(details)}`;
  if (signature === lastManualSkipLog) return;
  lastManualSkipLog = signature;
  console.warn(`[MANUAL-UPDATE] skip: ${reason}`, details);
}

async function readManualState(lang: string, userId: string | null): Promise<GateState | null> {
  // зачем: единый префикс [MANUAL-UPDATE] — владелец одним grep видит, почему
  // включённое в «Пульте» окно не показалось. Каждый ранний выход печатает
  // ЗНАЧЕНИЕ, которое его решило, а не голое true/false.
  const storeUrl = storeUrlForPlatform();
  if (!storeUrl) {
    warnManualSkipOnce('no store url', {
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
    warnManualSkipOnce('gate says no', {
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
  lastManualSkipLog = '';
  console.log('[MANUAL-UPDATE] showing modal', {
    campaignId, mode, platformFilter, platform: Platform.OS, targetBuild, currentBuild, storeUrl,
  });

  const title = getManualUpdateTitle(lang).trim() || defaultTitle(lang, mode);
  const body = getManualUpdateBody(lang).trim() || defaultBody(lang, mode);
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
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const [userId, setUserId] = useState<string | null>(null);
  const [gate, setGate] = useState<GateState | null>(null);
  // Пока открыт предпросмотр, обычный поток не перерисовывает окно.
  const previewRef = React.useRef(false);

  useEffect(() => {
    let dead = false;
    void getStableId().then((id) => { if (!dead) setUserId(id || null); }).catch(noteSwallowedHandler('ForceUpdateGate:useEffect.getStableId'));
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
        title: getManualUpdateTitle(lang).trim() || defaultTitle(lang, mode),
        body: getManualUpdateBody(lang).trim() || defaultBody(lang, mode),
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
    <Modal
      visible
      transparent={!forced}
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={closable ? closeOptional : blockAndroidBack}
    >
      <View accessibilityViewIsModal importantForAccessibility="yes" style={styles.modalRoot}>
        <ResponsiveModalScrollView
          style={[
            styles.backdrop,
            { backgroundColor: forced ? glass.bg : 'rgba(0,0,0,0.68)' },
          ]}
        >
          {forced ? (
            <LinearGradient
              pointerEvents="none"
              colors={[glass.bgTop, glass.bgBottom]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          <Animated.View
            testID="force-update-glass"
            style={[
              styles.card,
              { backgroundColor: Platform.OS === 'android' ? glass.opaqueSheet : glass.sheet },
              sheetStyle,
            ]}
          >
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <BlurView
                intensity={Platform.OS === 'android' ? 12 : 20}
                blurReductionFactor={3}
                experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
                tint="systemUltraThinMaterialDark"
                style={StyleSheet.absoluteFill}
              />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.sheet }]} />
              <LinearGradient
                colors={[glass.selected, 'transparent']}
                start={{ x: 0.05, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>

            <View style={[styles.iconStage, { backgroundColor: glass.opaqueControl }]}>
              {forced ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.halo,
                    { backgroundColor: glass.selected },
                    haloStyle,
                  ]}
                />
              ) : null}
              <LinearGradient
                pointerEvents="none"
                colors={[glass.selected, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="compass-outline" size={32} color={glass.lightTint} />
            </View>

            <Text
              accessibilityRole="header"
              style={[styles.title, { color: glass.text }]}
            >
              {gate.title}
            </Text>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion={forced ? 'assertive' : 'polite'}
              accessibilityLabel={`${gate.title}. ${gate.body}`}
              style={[styles.body, { color: glass.secondary }]}
            >
              {gate.body}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={gate.cta}
              onPress={openStore}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: glass.accent, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Text style={[styles.primaryLabel, { color: glass.accentInk }]}>{gate.cta}</Text>
            </Pressable>

            {closable ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={triLang(lang as Lang, {
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
                onPress={closeOptional}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { backgroundColor: pressed ? glass.selected : 'transparent' },
                ]}
              >
                <Text style={[styles.secondaryLabel, { color: glass.text }]}>
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
            ) : null}
          </Animated.View>
        </ResponsiveModalScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: { flex: 1 },
  card: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.34,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    ...noAndroidOutline, // системная тень снята (см. androidGlow)
  },
  iconStage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
  },
  title: {
    width: '100%',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    maxWidth: 330,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
  },
  primaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    ...noAndroidOutline, // системная тень снята (см. androidGlow)
  },
  primaryLabel: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  secondaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryLabel: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
});
