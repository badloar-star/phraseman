/**
 * Экран ролика: плеер во всю ширину, название, «канал · дата · просмотры», «Набор к ролику», «Фразы из видео».
 *
 * зачем (Сверка video-011 🔴, макет docs/design/v2-app/video.html — watch, телефон 11; координатор 05.10): ролик из
 * плейлиста и из раздела «Из видео» открывается отдельным экраном, а не встроенным плеером внутри списка.
 * Экран открывается мгновенно из того, что уже есть: ролик — из снимка каталога (или параметров маршрута), фразы —
 * из кэша (память → диск → сеть, только если кэш старше TTL), набор — из кэша каталога видео-наборов; сеть — фоном.
 * Вкладка «Видео» открывает этот экран по тапу на ролик в сетке (владелец 11.10, макет video-redesign #c1, экран 3): сверху «назад» и закладка,
 * плеер, полоса прогресса, название, фразы по таймкодам, внизу закреплена «Добавить набор себе · N карточек».
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useEffectiveStudyTarget } from './section_language';
import YoutubeInlinePlayer from '../components/youtube/YoutubeInlinePlayer';
import YoutubeVideoPhrases from '../components/youtube/YoutubeVideoPhrases';
import { formatViewCount } from '../components/video/formatViewCount';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { pluralWord } from '../constants/plural';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { captureAccountGeneration } from './account_generation';
import CommunityPackSocialBar from './community_packs/CommunityPackSocialBar';
import { useOwnedPack } from './community_packs/useOwnedPack';
import { PanelDock } from '../components/mistakes-panel/PanelKit';
import { setPendingTrainIntent } from './flashcards/train_intent';
import { trainNavMark, trainNavTraceStart } from './train_nav_trace';
import { loadVideoPhraseSetPacks, peekVideoPhraseSetPacks } from './video_phrase_set_packs';
import { loadVideoMarketPacks, peekVideoMarketPacks } from './community_packs/communityFirestore';
import { normalizePackLanguage } from './flashcards/pack_languages';
import type { FlashcardMarketPack } from './flashcards/marketplace';
import { formatRelativeVideoDate } from '../components/video/formatRelativeVideoDate';
import { LINGMAN_BACK_FALLBACK, safeRouterBack } from './navigation_back';
import { peekYoutubeCatalogScreenSnapshot } from './youtube_catalog_client';
import type { VideoPhrasesSource } from './video_phrases_client';
import { subscribeYoutubePosition } from './youtube_player_seek_bus';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useVideoFavorites } from '../hooks/use_video_favorites';
import { actionToastTri, emitAppEvent } from './events';
import { hapticTap } from '../hooks/use-haptics';

const LOG = '[VIDEO-SCREEN]';

type Params = { videoId?: string; channelId?: string; title?: string; source?: string; startSec?: string };

function findPackForVideo(packs: readonly FlashcardMarketPack[] | null, videoId: string): FlashcardMarketPack | null {
  return packs?.find((pack) => pack.videoId === videoId) ?? null;
}

export default function LingmanVideoWatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const videoId = typeof params.videoId === 'string' ? params.videoId : '';
  const source = typeof params.source === 'string' ? params.source : 'unknown';
  const { lang } = useLang();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { studyTarget: globalStudyTarget } = useStudyTarget();
  // зачем (владелец 15.10, Ревизор a9486a249): внутри раздела «Видео»/«Карточки» язык — локальный выбор раздела, иначе набор из ролика на es лёг бы в чужой язык
  const studyTarget = useEffectiveStudyTarget(globalStudyTarget);
  const runtimeActive = useRuntimeActive(true);
  const token = useMemo(() => captureAccountGeneration(), []);
  const insets = useStableSafeAreaInsets();
  const favorites = useVideoFavorites();

  // Первый кадр: ролик и канал из снимка каталога, иначе — из параметров маршрута.
  const catalog = useMemo(() => peekYoutubeCatalogScreenSnapshot(token), [token]);
  const video = useMemo(() => catalog?.videos.find((item) => item.id === videoId) ?? null, [catalog, videoId]);
  const channelName = catalog && (!video || catalog.channel.id === video.channelId) ? catalog.channel.displayName : '';
  const title = video?.title || (typeof params.title === 'string' ? params.title : '');
  const startSec = typeof params.startSec === 'string' && Number.isFinite(Number(params.startSec)) ? Number(params.startSec) : undefined;

  const [pack, setPack] = useState<FlashcardMarketPack | null>(() => findPackForVideo(peekVideoMarketPacks(studyTarget), videoId));
  // зачем (Макеты 15.10): английский ролик подписывался «Испанский» — при пустом каталоге язык брался из языка раздела. Порядок: канал → язык самого набора ролика → язык раздела.
  const packLanguage = normalizePackLanguage(catalog?.channel.languageTags?.[0]?.split('-')[0] ?? pack?.packLanguage ?? studyTarget);
  // зачем (аудит кнопок Карточек #14/#15, 15.10): набор ролика уже добавлен — кнопка «Тренировать», а не «Добавить» (из локальных id, без Firestore)
  const packOwned = useOwnedPack(pack?.id ?? `video:${videoId}`);
  const packFromRef = useRef<string>(peekVideoMarketPacks(studyTarget) ? 'memory' : 'pending');
  const [playerOpen, setPlayerOpen] = useState(true);
  // зачем (координатор 15.10): «Тренировать» ставит ролик на паузу сразу (плеер снимается — звук глохнет мгновенно), позиция запоминается; «Назад» возвращает ролик на ту же секунду без перезапуска с нуля.
  const lastPositionRef = useRef(0);
  const [resumeSec, setResumeSec] = useState<number | null>(null);
  useEffect(() => {
    if (!videoId) return undefined;
    return subscribeYoutubePosition(videoId, (value) => { lastPositionRef.current = value; });
  }, [videoId]);
  const openLoggedRef = useRef(false);

  const logOpen = useCallback((phrasesFrom: VideoPhrasesSource | 'none', phrases: number) => {
    if (openLoggedRef.current) return;
    openLoggedRef.current = true;
    console.warn(LOG, 'open', JSON.stringify({
      source, videoId, videoFrom: video ? 'catalog_snapshot' : title ? 'route_params' : 'none',
      phrasesFrom, phrases, packFrom: packFromRef.current, hasPack: !!pack,
    })); // guard-ok: лог экрана ролика (координатор 05.10), одна строка на вход
  }, [pack, source, title, video, videoId]);

  // Набор к ролику: кэш каталога видео-наборов (тот же TTL, что у раздела «Из видео»), сеть — только если кэша нет.
  useEffect(() => {
    if (!videoId) return undefined;
    if (findPackForVideo(peekVideoMarketPacks(studyTarget), videoId)) return undefined;
    let alive = true;
    const startedAt = Date.now();
    // зачем (🔴 Ц1 на эмуляторе, 15.10): кэш каталога был, но ролика в нём нет (`packs=3 found=false`) — раньше на этом поиск заканчивался и кнопки внизу не было.
    // Теперь: каталог сообщества → готовый набор фраз ролика (тот же источник, что «Мои наборы» и тренировка). Набор фраз есть → кнопка «Добавить/Тренировать» видна.
    void (async () => {
      let found: FlashcardMarketPack | null = null;
      try {
        const packs = peekVideoMarketPacks(studyTarget) ?? await loadVideoMarketPacks(studyTarget);
        packFromRef.current = 'loader';
        found = findPackForVideo(packs, videoId);
        console.warn(LOG, 'pack', JSON.stringify({ videoId, found: !!found, packs: packs.length, ms: Date.now() - startedAt, alive })); // guard-ok: ветка логируется
      } catch (error: unknown) {
        packFromRef.current = 'error';
        console.warn(LOG, 'pack:catch → пробуем наборы фраз', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
      }
      if (!found) {
        try {
          const sets = peekVideoPhraseSetPacks() ?? await loadVideoPhraseSetPacks();
          found = findPackForVideo(sets, videoId);
          if (found) packFromRef.current = 'phrase_set';
          console.warn(LOG, 'pack:phrase_set', JSON.stringify({ videoId, found: !!found, sets: sets.length, alive })); // guard-ok: запасной источник
        } catch (error: unknown) {
          console.warn(LOG, 'pack:phrase_set catch → без блока', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
        }
      }
      console.log(`[VIDEO-PACK-TRAIN] find videoId=${videoId} source=${packFromRef.current} found=${found?.id ?? 'none'} alive=${alive}`); // guard-ok: итог поиска набора ролика
      if (alive && found) setPack(found);
    })();
    return () => { alive = false; };
  }, [studyTarget, videoId]);

  useEffect(() => {
    if (videoId) return;
    console.warn(LOG, 'open:no_video_id → назад', JSON.stringify({ source })); // guard-ok: ранний выход логируется
    safeRouterBack(router, LINGMAN_BACK_FALLBACK as never);
  }, [router, source, videoId]);

  const close = useCallback(() => {
    setPlayerOpen(false);
    safeRouterBack(router, LINGMAN_BACK_FALLBACK as never);
  }, [router]);

  const copy = {
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    save: triLang(lang, { ru: 'В избранное', uk: 'В обране', en: 'Save video', es: 'Guardar vídeo', 'pt-BR': 'Salvar vídeo', vi: 'Lưu video', id: 'Simpan video', tr: 'Videoyu kaydet', pl: 'Zapisz film' }),
    unsave: triLang(lang, { ru: 'Убрать из избранного', uk: 'Прибрати з обраного', en: 'Remove from saved', es: 'Quitar de guardados', 'pt-BR': 'Remover dos salvos', vi: 'Bỏ lưu', id: 'Hapus dari simpanan', tr: 'Kaydedilenlerden çıkar', pl: 'Usuń z zapisanych' }),
  };
  const meta = [channelName, formatRelativeVideoDate(video?.publishedAt, lang), formatViewCount(video?.viewCount, lang)].filter(Boolean).join(' · ');
  // зачем (макет video-redesign #c1, экран 3): закладка ролика сверху справа — то же избранное, что на карточке в сетке;
  // вид меняется сразу (стор публикует локально), отказ сети откатывает стор, здесь — тост.
  const savedVideo = favorites.isSaved(videoId);
  const toggleSave = useCallback(() => {
    void favorites.toggle(videoId).then((outcome) => {
      if (outcome === 'ok') return;
      console.warn(LOG, 'save:rollback', JSON.stringify({ videoId, outcome })); // guard-ok: откат закладки логируется
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось сохранить, попробуй ещё раз', uk: 'Не вдалося зберегти, спробуй ще раз', en: 'Couldn’t save, please try again',
        es: 'No se pudo guardar, inténtalo de nuevo', 'pt-BR': 'Não foi possível salvar, tente de novo', vi: 'Không lưu được, hãy thử lại',
        id: 'Gagal menyimpan, coba lagi', tr: 'Kaydedilemedi, tekrar dene', pl: 'Nie udało się zapisać, spróbuj ponownie',
      }));
    });
  }, [favorites, videoId]);
  // «Добавить набор себе · N карточек» (макет `cta('Добавить набор себе', '30 карточек')`).
  const ctaLabel = pack ? triLang(lang, {
    ru: `Добавить набор себе · ${pack.cardCount} ${pluralWord(lang, pack.cardCount, { one: 'карточка', few: 'карточки', many: 'карточек' })}`,
    uk: `Додати набір собі · ${pack.cardCount} ${pluralWord(lang, pack.cardCount, { one: 'картка', few: 'картки', many: 'карток' })}`,
    en: `Add the pack to mine · ${pack.cardCount} cards`, es: `Añadir el pack · ${pack.cardCount} tarjetas`, 'pt-BR': `Adicionar o pacote · ${pack.cardCount} cartões`,
    vi: `Thêm bộ thẻ · ${pack.cardCount} thẻ`, id: `Tambahkan paket · ${pack.cardCount} kartu`, tr: `Paketi ekle · ${pack.cardCount} kart`,
    pl: `Dodaj zestaw · ${pack.cardCount} ${pluralWord(lang, pack.cardCount, { one: 'fiszka', few: 'fiszki', many: 'fiszek' })}`,
  }) : undefined;
  // зачем (координатор 11.10): после «Добавить набор себе» кнопка внизу становится «Тренировать» и ведёт к карточкам ролика —
  // тот же путь, что раньше шёл из встроенного плеера ленты.
  const trainLabel = triLang(lang, { ru: 'Тренировать фразы ролика', uk: 'Тренувати вислови ролика', en: 'Practice this video’s phrases', es: 'Practicar las frases del vídeo', 'pt-BR': 'Treinar as frases do vídeo', vi: 'Luyện cụm từ của video', id: 'Latih frasa video ini', tr: 'Videonun ifadelerini çalış', pl: 'Ćwicz zwroty z filmu' });
  const trainVideo = useCallback(() => {
    console.log(LOG, 'train', JSON.stringify({ videoId })); // guard-ok: вход в тренировку логируется
    console.log(`[VIDEO-PACK-TRAIN] tap videoId=${videoId} packId=${pack?.id ?? 'none'} cards=${pack?.cardCount ?? 0} owned=${String(packOwned)}`); // guard-ok: цепочка ролик → набор → Тренировать
    // зачем (🔴 Ц1, 15.10): документа набора ролика может не быть — страница набора пустая. «Тренировать» ведёт в окно режимов хаба на колоду этого набора
    // (карточки — из документа или из фраз ролика); намерение идёт через train_intent, потому что navigate в открытый хаб теряет параметры.
    trainNavTraceStart('video_watch_train_tap');
    const deckId = `pack:video_${videoId}`;
    setPendingTrainIntent({ deckId, count: pack?.cardCount ?? 0 });
    // зачем (Макеты c1_r60b, ⚡ ~760 мс от navigate до первого рендера хаба — плеер/WebView на экране ролика): сперва освобождаем плеер, переход — в следующем кадре.
    // Вернулись назад — плеер снова открывается (useFocusEffect ниже).
    const savedPosition = Math.floor(lastPositionRef.current);
    setResumeSec(savedPosition > 0 ? savedPosition : null);
    console.log(`[VIDEO-PACK-TRAIN] player paused+released videoId=${videoId} resumeSec=${savedPosition}`); // guard-ok: позиция запомнена
    setPlayerOpen(false);
    trainNavMark('player closed before navigate');
    requestAnimationFrame(() => {
      router.navigate({ pathname: '/flashcards', params: { train: '1', deck: deckId, cnt: String(pack?.cardCount ?? 0) } } as never);
      trainNavMark('router.navigate called');
    });
  }, [pack?.cardCount, router, videoId]);

  // зачем ([NAV-PAINT-TRACE], 15.10): когда экран ролика теряет фокус и когда размонтируется — отдельные отметки цепочки «Тренировать → первый кадр хаба»
  useFocusEffect(useCallback(() => {
    setPlayerOpen(true); // вернулись на экран ролика (в том числе после «Тренировать») — плеер снова на месте
    return () => trainNavMark('video screen blur');
  }, []));
  useEffect(() => () => trainNavMark('video screen unmount'), []);

  return (
    <ScreenGradient artBackdrop="home">
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView testID="lingman-video-watch" style={styles.container} edges={['top', 'left', 'right']}>
        {/* зачем (макет video-redesign #c1, экран 3): сверху «назад» слева и закладка ролика справа, затем плеер с полосой прогресса. */}
        <View style={styles.topbar}>
          <Pressable testID="lingman-video-watch-close" accessibilityRole="button" accessibilityLabel={copy.back} onPress={close} hitSlop={8} style={styles.topButton}>
            <Ionicons name="chevron-back" size={24} color={g.text} />
          </Pressable>
          <Pressable
            testID={`video-save-${videoId}`}
            accessibilityRole="button"
            accessibilityLabel={savedVideo ? copy.unsave : copy.save}
            accessibilityState={{ selected: savedVideo }}
            onPressIn={() => hapticTap()}
            onPress={toggleSave}
            style={[styles.topButton, { backgroundColor: savedVideo ? g.ctaFill : g.buttonFill }]}
          >
            <Ionicons name={savedVideo ? 'bookmark' : 'bookmark-outline'} size={20} color={savedVideo ? g.ctaFillInk : g.text} /* зачем (Ревизор 15.10, «кнопки не сливаются»): значок на заливке ctaFill — ctaInk, не accentInk (пара ctaFill/ctaInk держит контраст во всех темах) */ />
          </Pressable>
        </View>
        <View style={styles.player}>
          {videoId && playerOpen ? (
            <YoutubeInlinePlayer videoId={videoId} title={title} active={runtimeActive} presentation="preview" autoPlay={resumeSec === null} startSec={resumeSec ?? startSec} />
          ) : null}
        </View>
        <WatchProgress videoId={videoId} durationSec={video?.durationSec} trackColor={g.opaqueControl} fillColor={g.accentGraphic} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: pack ? 132 + insets.bottom : 32 }]} decelerationRate="fast">
          {title ? <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text> : null}
          {meta ? <Text style={[styles.meta, { color: g.secondary }]}>{meta}</Text> : null}
          {videoId ? (
            <View style={styles.phrases}>
              <YoutubeVideoPhrases
                videoId={videoId}
                packLanguage={packLanguage}
                sourceTitle={channelName || undefined}
                testID={`video-phrases-${videoId}`}
                defaultExpanded
                onSourceResolved={(from, count) => logOpen(from, count)}
              />
            </View>
          ) : null}
        </ScrollView>
        {pack ? (
          // зачем (макет `.bot2`): главная кнопка «Добавить набор себе · N карточек» закреплена внизу под большим пальцем.
          <PanelDock>
            <View testID="lingman-video-watch-pack">
              <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={packOwned} variant="previewCta" ctaLabel={ctaLabel} ownedCtaLabel={trainLabel} onOwnedCtaPress={trainVideo} />
            </View>
          </PanelDock>
        ) : null}
      </SafeAreaView>
    </ScreenGradient>
  );
}

/**
 * Полоса прогресса под плеером (`.bar` макета: 5, радиус 3). Позиция приходит раз в секунду из канала плеера, пока ролик играет;
 * длительность — из каталога (нет её — полосы нет, ничего не выдумываем).
 */
function WatchProgress({ videoId, durationSec, trackColor, fillColor }: { videoId: string; durationSec?: number; trackColor: string; fillColor: string }) {
  const [positionSec, setPositionSec] = useState(0);
  useEffect(() => {
    if (!videoId) return undefined;
    return subscribeYoutubePosition(videoId, (value) => setPositionSec(value));
  }, [videoId]);
  if (typeof durationSec !== 'number' || !Number.isFinite(durationSec) || durationSec <= 0) return null;
  const ratio = Math.max(0, Math.min(1, positionSec / durationSec));
  return (
    <View testID="lingman-video-watch-progress" style={[styles.bar, { backgroundColor: trackColor }]} pointerEvents="none">
      <View style={[styles.barFill, { width: `${Math.round(ratio * 1000) / 10}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // зачем: поля экрана 20 (`--pad` макета); плеер — кадр 16:9 с радиусом 14 внутри полей (`.th`).
  container: { flex: 1 },
  topbar: { height: 44, marginTop: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  player: { marginTop: 6, marginHorizontal: 20, aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000000' }, // theme-exempt: фон под видео/превью — чёрный в любой теме
  bar: { height: 5, borderRadius: 3, marginTop: 12, marginHorizontal: 20, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  title: { marginTop: 16, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  // зачем: `.vm` макета 14 → 13 по шкале D145.
  meta: { marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  phrases: { marginTop: 20 },
});
