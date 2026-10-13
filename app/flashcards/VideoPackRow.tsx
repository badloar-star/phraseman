/**
 * Строка списка «Из видео»: кадр ролика слева, набор справа.
 *
 * Геометрия — из макета, одобренного владельцем 2026-09-23:
 *   • превью 112×63 (16:9) — «ПРЕВЬЮ НЕ КВАДРАТНОЕ»;
 *   • строка 87 (63 + 12·2) — «СПИСКИ НЕ ТАКИЕ ВЫСОКИЕ» (было 120);
 *   • имени канала НЕТ — «ЛИНГМАН ПИСАТЬ НЕ НАДО», вместо него число карточек;
 *   • кнопка со словом «Добавить» — «КНОПКА ДОБАВИТЬ» (а не круглый «+»).
 *
 * Три разные цели тапа: кадр → ролик, строка → набор, кнопка → добавить себе.
 * Поэтому кадр и кнопка — отдельные Pressable поверх строки, а не её части.
 */
import React, { useMemo } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import { KitCard } from '../../components/cards-grid/CardsKit';
// зачем (координатор 11.10, ночная задача Карточек п.5; журнал владельца п.9 «название до 2 строк, многоточие только если не влезает»): название ролика в крупной карточке — максимум 2 строки. Новый потребитель ClampedText разрешён координатором; трещотка — tests/pack_row_shared_contract.test.ts.
import { ClampedText } from '../../components/text-integrity/ClampedText';
import { KitTouchable } from '../../components/KitTouchable';
import { plateBoxShadow } from '../../components/v2/ShadowSurface';
import { pluralWord } from '../../constants/plural';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { Theme } from '../../constants/theme';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { actionToastTri, emitAppEvent } from '../events';
import CommunityPackSocialBar from '../community_packs/CommunityPackSocialBar';
import { packTitleForInterface, type FlashcardMarketPack } from './marketplace';
import { getLingmanYoutubeWatchUrl, getTrustedLingmanYoutubeUrl } from '../lingman_youtube';
import { DebugLogger } from '../debug-logger';
import { isDevCardsFail } from '../dev_cards_state';
import VideoThumb from './VideoThumb';

const MEDIA_INK = '#FFFFFF'; // theme-exempt: белый значок/текст поверх видео — в любой теме

/** Превью 16:9 — те же числа, что в макете. */
const THUMB_W = 112;
const THUMB_H = 63;

type Props = {
  pack: FlashcardMarketPack;
  lang: Lang;
  t: Theme;
  /** Набор уже открывается — крутилка поверх кадра. */
  opening?: boolean;
  /** Открывается другой набор — этот не должен перехватывать тап. */
  disabled?: boolean;
  onOpen: (pack: FlashcardMarketPack) => void;
  /**
   * 'card' — строка-карточка раздела «Карточки → Из видео»; 'plain' — строка вкладки «Наборы» в «Видео»
   * (макет video-redesign #c1, экран 4): без карточки, обложка 132, «N карточек», справа круглая «+».
   */
  variant?: 'card' | 'plain';
};

/**
 * Превью кадра ролика. Тот же адрес, что уже использует экран видео.
 *
 * зачем через хелпер, а не строкой в разметке: `videoId` приходит из документа
 * Firestore, и подставлять его в URL без единой точки нормализации — способ
 * однажды получить битую картинку у каждой строки списка.
 */
function youtubeThumbnailUrl(videoId?: string): string | null {
  const id = String(videoId ?? '').trim();
  return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : null;
}

/**
 * Открыть ролик во внешнем приложении/браузере.
 *
 * зачем ЧЕРЕЗ getTrustedLingmanYoutubeUrl: это существующая проверка домена.
 * Без неё значение из документа Firestore могло бы увести человека на
 * посторонний адрес — тот же класс риска, что и битое превью, только опаснее.
 */
export async function openVideo(videoId: string | undefined, onFail: () => void): Promise<void> {
  const id = String(videoId ?? '').trim();
  if (!id) {
    DebugLogger.warn('[VIDEO-PACK]', 'тап по кадру без videoId — ролик не открыт');
    onFail();
    return;
  }
  // зачем (координатор 12.10, cards-082): dev `fail=video_open` — тост «Видео сейчас не открывается» без браузера.
  if (isDevCardsFail('video_open')) {
    console.warn(`[DEV-STATE] video: открытие ролика подменено отказом videoId=${id}`); // guard-ok: dev-ветка
    onFail();
    return;
  }
  const trusted = getTrustedLingmanYoutubeUrl(getLingmanYoutubeWatchUrl(id), id);
  if (!trusted) {
    DebugLogger.warn('[VIDEO-PACK]', `ссылка отклонена проверкой домена, videoId="${id}"`);
    onFail();
    return;
  }
  try {
    await Linking.openURL(trusted);
  } catch (error) {
    // зачем не немой catch: «нажал — ничего не произошло» без следа в логах
    // уже стоило кругов работы (правило владельца «сперва логи»).
    DebugLogger.error(`[VIDEO-PACK]:openVideo:${id}`, error, 'warning');
    onFail();
  }
}

/**
 * Доля просмотра ролика 0…1 для полосы внизу кадра (cards-v2 `.vprog`). Поля в документе пока нет (ждём от Ядра: `watchProgress`) —
 * нет поля, мусор или 0 — полосы нет; ничего не выдумываем.
 */
export function packVideoProgress(pack: unknown): number {
  if (!pack || typeof pack !== 'object') return 0;
  const raw = (pack as { watchProgress?: unknown }).watchProgress;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(1, raw);
}

export function formatDuration(totalSec?: number): string {
  if (!totalSec || !Number.isFinite(totalSec) || totalSec <= 0) return '';
  const sec = Math.floor(totalSec % 60);
  const min = Math.floor(totalSec / 60) % 60;
  const hour = Math.floor(totalSec / 3600);
  const mm = hour > 0 ? String(min).padStart(2, '0') : String(min);
  return hour > 0
    ? `${hour}:${mm}:${String(sec).padStart(2, '0')}`
    : `${mm}:${String(sec).padStart(2, '0')}`;
}

function VideoPackRowBase({ pack, lang, t, opening = false, disabled = false, onOpen, variant = 'card' }: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const title = packTitleForInterface(pack, lang) || pack.codeName || pack.id;
  const duration = formatDuration(pack.videoDurationSec);
  const thumbUrl = useMemo(() => youtubeThumbnailUrl(pack.videoId), [pack.videoId]);

  const playLabel = triLang(lang, {
    ru: 'Смотреть видео', uk: 'Дивитися відео', en: 'Watch the video', es: 'Ver el vídeo',
    'pt-BR': 'Assistir ao vídeo', vi: 'Xem video', id: 'Tonton video', tr: 'Videoyu izle', pl: 'Obejrzyj film',
  });
  const cardsLabel = triLang(lang, {
    ru: 'карточек', uk: 'карток', en: 'cards', es: 'tarjetas', 'pt-BR': 'cartões',
    vi: 'thẻ', id: 'kartu', tr: 'kart', pl: 'kart',
  });
  /** Ролик не открылся — говорим об этом, а не молчим: набор при этом жив. */
  const videoFailed = useMemo(() => actionToastTri('error', {
    ru: 'Видео сейчас не открывается. Карточки набора доступны как обычно.',
    uk: 'Відео зараз не відкривається. Картки набору доступні як завжди.',
    es: 'El vídeo no se abre ahora. Las tarjetas del pack siguen disponibles.', en: 'This video isn\'t opening right now. The pack\'s cards are available as usual.',
    'pt-BR': 'O vídeo não abre agora. Os cartões do pacote continuam disponíveis.', vi: 'Video hiện không mở được. Các thẻ trong bộ thẻ vẫn dùng bình thường.', id: 'Video tidak bisa dibuka sekarang. Kartu dalam paket tetap tersedia seperti biasa.', tr: 'Video şu anda açılmıyor. Paketteki kartlar her zamanki gibi kullanılabilir.', pl: 'Film nie otwiera się teraz. Fiszki z zestawu są dostępne jak zwykle.',
  }), []);

  // зачем (владелец: «в приложении запрещены любые различия с макетом», cards-section «Из видео»): строка — карточка 87 высотой:
  // кадр 112×63 слева, название (до двух строк) и «N фраз», справа мятная «Добавить» (после добавления — пилюля с галочкой).
  const plain = variant === 'plain';
  const phrasesText = plain
    // зачем (макет video-redesign #c1, экран 4): во вкладке «Наборы» подпись — «N карточек».
    ? `${pack.cardCount} ${triLang(lang, {
      ru: pluralWord(lang, pack.cardCount, { one: 'карточка', few: 'карточки', many: 'карточек' }),
      uk: pluralWord(lang, pack.cardCount, { one: 'картка', few: 'картки', many: 'карток' }),
      en: 'cards', es: 'tarjetas', 'pt-BR': 'cartões', vi: 'thẻ', id: 'kartu', tr: 'kart',
      pl: pluralWord(lang, pack.cardCount, { one: 'fiszka', few: 'fiszki', many: 'fiszek' }),
    })}`
    : `${pack.cardCount} ${triLang(lang, {
      ru: pluralWord(lang, pack.cardCount, { one: 'фраза', few: 'фразы', many: 'фраз' }),
      uk: pluralWord(lang, pack.cardCount, { one: 'фраза', few: 'фрази', many: 'фраз' }),
      en: 'phrases', es: 'frases', 'pt-BR': 'frases', vi: 'cụm từ', id: 'frasa', tr: 'ifade',
      pl: pluralWord(lang, pack.cardCount, { one: 'fraza', few: 'frazy', many: 'fraz' }),
    })}`;
  if (!plain) {
    // зачем (владелец 12.10, cards-v2 videoAll()): раздел «Из видео» — крупные карточки роликов: кадр 16:9 r18 на всю ширину, длительность,
    // полоса просмотра, под ним название 19/700 и «N фраз» слева и «Добавить +» справа. Вся карточка открывает набор (экран набора из видео);
    // сам ролик открывается ▶ на экране набора. Полоса просмотра скрыта, пока поля нет (packVideoProgress).
    const progress = packVideoProgress(pack);
    const open = () => { void hapticTap(); onOpen(pack); };
    return (
      <View testID={`video-pack-row-${pack.id}`} style={{ opacity: disabled ? 0.55 : 1 }}>
        <KitTouchable testID={`video-pack-open-row-${pack.id}`} accessibilityRole="button" accessibilityLabel={`${title}. ${phrasesText}`} accessibilityState={{ disabled }} disabled={disabled} onPress={open}>
          <View style={[styles.largeShadow, { backgroundColor: g.opaqueControl, boxShadow: plateBoxShadow(g) }]}>
            <View style={styles.largeThumb}>
              {/* зачем (координатор 12.10, cards-028): превью и запасной вид при ошибке — в VideoThumb */}
              <VideoThumb surface="video_pack_card" id={pack.id} videoId={pack.videoId} thumbUrl={thumbUrl} title={title} g={g} showTitle />
              {duration ? (
                <View style={styles.largeDuration} pointerEvents="none">
                  <Text style={[styles.durationText, { color: g.mediaInk }]}>{duration}</Text>
                </View>
              ) : null}
              {progress > 0 ? (
                <View style={[styles.largeProgress, { backgroundColor: g.mediaScrim }]} pointerEvents="none">
                  <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.round(progress * 100)}%`, backgroundColor: g.mediaInk }} />
                </View>
              ) : null}
              {opening ? (
                <View style={[StyleSheet.absoluteFillObject, styles.openingVeil, { backgroundColor: g.opaqueCard }]} pointerEvents="none">
                  <ActivityIndicator color={g.accentText} />
                </View>
              ) : null}
            </View>
          </View>
        </KitTouchable>
        <View style={styles.largeMeta}>
          <KitTouchable testID={`video-pack-open-${pack.id}`} accessibilityRole="button" accessibilityLabel={`${title}. ${phrasesText}`} accessibilityState={{ disabled }} disabled={disabled} onPress={open} style={styles.largeText}>
            <ClampedText testID={`video-pack-title-${pack.id}`} maxLines={2} pointerEvents="none" style={[styles.largeTitle, { color: g.text }]}>{title}</ClampedText>
            <Text pointerEvents="none" maxFontSizeMultiplier={1.3} style={[styles.largeCount, { color: g.secondary }]}>{phrasesText}</Text>
          </KitTouchable>
          {/* «Добавить себе» — общий компонент каталога: его оптимистичность и защита от гонок уже написаны, второй копии быть не должно. */}
          <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={false} variant="videoAdd" />
        </View>
      </View>
    );
  }
  return (
    <View testID={`video-pack-row-${pack.id}`} style={{ opacity: disabled ? 0.55 : 1 }}>
      <Wrapper g={g} plain={plain} style={styles.card}>
        <RowShell plain={plain} disabled={disabled} onPress={() => { void hapticTap(); onOpen(pack); }} label={`${title}. ${phrasesText}`} testID={`video-pack-open-row-${pack.id}`}>
          {/* Кадр ролика — СВОЯ цель тапа: открывает видео, а не набор. */}
          <Pressable
            testID={`video-pack-play-${pack.id}`}
            accessibilityRole="button"
            accessibilityLabel={plain ? `${title}. ${phrasesText}` : playLabel}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => {
              void hapticTap();
              // зачем (владелец 11.10, «при нажатии на сам блок должен открываться набор фраз»): во вкладке «Наборы» обложка — часть блока и
              // открывает страницу набора; во внешний YouTube кадр ведёт только в разделе «Карточки» (прежнее поведение).
              if (plain) { onOpen(pack); return; }
              void openVideo(pack.videoId, () => emitAppEvent('action_toast', videoFailed));
            }}
            style={({ pressed }) => [plain ? styles.thumbPlain : styles.thumb, { backgroundColor: g.opaqueControl, opacity: pressed ? 0.8 : 1 }]}
          >
            <VideoThumb surface={plain ? 'video_pack_plain' : 'video_pack_card'} id={pack.id} videoId={pack.videoId} thumbUrl={thumbUrl} title={title} g={g} showTitle={false} />
            {/* зачем (Сверка 11.10, макет video-redesign #c1, экран 4): на обложке строки вкладки «Наборы» нет ни ▶, ни длительности. */}
            {plain ? null : (
              <View style={styles.playCircle} pointerEvents="none">
                <Ionicons name="play" size={16} color={MEDIA_INK} />
              </View>
            )}
            {duration && !plain ? (
              <View style={styles.duration} pointerEvents="none">
                <Text style={styles.durationText}>{duration}</Text>
              </View>
            ) : null}
            {opening ? (
              <View style={[StyleSheet.absoluteFillObject, styles.openingVeil, { backgroundColor: g.opaqueCard }]} pointerEvents="none">
                <ActivityIndicator color={g.accentText} />
              </View>
            ) : null}
          </Pressable>

          <View style={styles.main}>
            <Pressable
              testID={`video-pack-open-${pack.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${phrasesText}`}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => { void hapticTap(); onOpen(pack); }}
              style={StyleSheet.absoluteFill}
            />
            {/* зачем (Сверка cards-section-024, координатор 12.10): в узкой колонке строки вкладки «Наборы» длинное название («…500 фраз.docx») переносилось на 8–10 строк;
                по образцу и журналу владельца п.9 — до 2 строк с многоточием, шрифт не ужимается (ClampedText разрешён для этого файла). */}
            <ClampedText testID={`video-pack-title-${pack.id}`} maxLines={2} pointerEvents="none" style={[styles.title, plain && styles.titlePlain, { color: g.text }]}>
              {title}
            </ClampedText>
            <Text pointerEvents="none" maxFontSizeMultiplier={1.3} style={[styles.count, plain && styles.countPlain, { color: plain ? g.accentText : g.secondary }]}>{phrasesText}</Text>
          </View>

          {/* «Добавить себе» — общий компонент каталога: его оптимистичность и защита от гонок уже написаны, второй копии быть не должно. */}
          <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={false} variant={plain ? 'videoAddRound' : 'videoAdd'} />
        </RowShell>
      </Wrapper>
    </View>
  );
}

/**
 * Строка набора. Во вкладке «Наборы» (plain) вся строка — кнопка, открывающая страницу набора (владелец 11.10); кнопка «+» внутри остаётся
 * быстрым добавлением (вложенное нажатие забирает она). В разделе «Карточки» — прежний View: там свои цели тапа у кадра, названия и кнопки.
 */
function RowShell({ plain, disabled, onPress, label, testID, children }: { plain: boolean; disabled: boolean; onPress: () => void; label: string; testID: string; children: React.ReactNode }) {
  if (!plain) return <View style={baseStyles.row}>{children}</View>;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={({ pressed }) => [baseStyles.rowPlain, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

/** Карточка раздела «Карточки» или голая строка вкладки «Наборы» (без фона и кромки). */
function Wrapper({ g, plain, style, children }: { g: ReturnType<typeof liquidGlassTokens>; plain: boolean; style: object; children: React.ReactNode }) {
  return plain ? <View style={style}>{children}</View> : <KitCard g={g} style={style}>{children}</KitCard>;
}

/**
 * зачем memo по существу: список перерисовывается на каждый ввод буквы в поиск
 * и на каждое изменение счётчиков. Поверхностное сравнение не спасло бы —
 * `onOpen` приходит стрелкой родителя.
 */
export default React.memo(VideoPackRowBase, (prev, next) => (
  prev.pack === next.pack
  && prev.lang === next.lang
  && prev.t === next.t
  && prev.opening === next.opening
  && prev.disabled === next.disabled
  && prev.variant === next.variant
));

const baseStyles = StyleSheet.create({
  card: { minHeight: 87 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 12, paddingRight: 14 },
  // `.row` макета video-redesign #c1: обложка 132 (16:9 → 74), промежуток 14, вертикальные поля 12.
  rowPlain: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  thumbPlain: { width: 132, aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' }, // theme-exempt: скрим/плашка поверх видео — тёмная в любой теме
  duration: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: 'rgba(0,0,0,0.72)', // theme-exempt: скрим/плашка поверх видео — тёмная в любой теме
  },
  durationText: { fontSize: 13, lineHeight: 17, fontWeight: '700', color: '#FFFFFF' }, // theme-exempt: белый значок/текст поверх видео — в любой теме
  openingVeil: { alignItems: 'center', justifyContent: 'center' },
  // cards-v2 videoAll(): кадр 16:9 r18; тень на внешнем слое, клип по скруглению — на внутреннем.
  largeShadow: { borderRadius: 18 },
  largeThumb: { aspectRatio: 16 / 9, borderRadius: 18, overflow: 'hidden' },
  largeDuration: { position: 'absolute', right: 8, bottom: 10, paddingHorizontal: 7, minHeight: 22, borderRadius: 6, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.72)' }, // theme-exempt: скрим/плашка поверх видео — тёмная в любой теме
  largeProgress: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 },
  largeMeta: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  largeText: { flex: 1, minWidth: 0 },
  largeTitle: { fontSize: 19, lineHeight: 24, fontWeight: '700' },
  largeCount: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  main: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  count: { marginTop: 4, fontSize: 13, lineHeight: 17 },
  // владелец 11.10: единый компактный стиль названий в списках роликов и наборов.
  titlePlain: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  countPlain: { marginTop: 2, fontSize: 11, lineHeight: 14, opacity: 0.85 }, // typo-exempt: владелец 11.10 — мета 11 sp по прямому слову; d145-micro: мета видео 11 sp — прямое слово владельца 11.10
});
