/**
 * Экран набора из видео — макет docs/design/v2-app/cards-v2.html, кадр «Набор из видео» (videoSet()).
 *
 * зачем (владелец 12.10: cards-v2 утверждён целиком, «приложение = макет»): «назад» и «⋮», широкое превью ролика 16:9 r18 с кнопкой ▶,
 * длительностью и полосой просмотра, название 28/34, строка «уровень · N фраз · ♥», ряд «Тренировать» и «Добавить +», подпись «Фразы N»
 * и карточки фраз (таймкод-чип, озвучка, английская фраза 21/27 и перевод). Данные и обработчики приходят от экрана набора; здесь только вид.
 *
 * Данных пока нет (ждём от Ядра): уровень набора (`level`) — чип скрыт; доля просмотра ролика (`watchProgress` 0…1) — полосы нет.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';

import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { packDeckLevel } from '../../components/packs/packDeckModel';
import { PackBackBare, PackCta, PackSquareButton, PackTopBarRow } from '../../components/packs/PackScreenKit';
import { KitTouchable } from '../../components/KitTouchable';
import { useTheme } from '../../components/ThemeContext';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';
import { hapticTap } from '../../hooks/use-haptics';
import { actionToastTri, emitAppEvent } from '../events';
import { DebugLogger } from '../debug-logger';
import { animateNextLayoutTransition } from '../smooth_layout';
import CommunityPackSocialBar from '../community_packs/CommunityPackSocialBar';
import type { FlashcardMarketPack } from './marketplace';
import { formatDuration, openVideo, packVideoProgress } from './VideoPackRow';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './types';
import { VideoCardSaveSlot } from '../../components/cards-grid/VideoCardSaveSlot';
import { useVideoCardSave } from './use_video_card_save';

type Props = Readonly<{
  pack: FlashcardMarketPack;
  title: string;
  cards: readonly CardItem[];
  lang: Lang;
  cardContentLang: FlashcardContentLang;
  onBack: () => void;
  /** «⋮» — меню набора (жалоба и т. п.); null — кнопки нет. */
  onMore: (() => void) | null;
  onSpeak: (text: string) => void;
  /** Кнопка «▶ В видео» раскрытой фразы: открыть ролик на её секунде; null — у фраз нет кнопки, тап по строке только озвучивает. */
  onOpenMoment: ((card: CardItem) => void) | null;
  /** Набор уже у человека (экран открыт не в режиме просмотра): вместо «Добавить +» — «✓ В моих наборах». */
  owned?: boolean;
  /** После «Добавить +» (экран перечитывает набор). Вместе с `onRequestPurchase` включает кнопку «Добавить +» из макета. */
  onAdded?: () => void;
  /** Платный набор: экран показывает шит покупки. */
  onRequestPurchase?: (pack: FlashcardMarketPack, priceRunes: number) => void;
  /**
   * @deprecated Старый способ: готовая нижняя кнопка («Учить набор») от экрана набора. Пока экран не передаёт onAdded/onRequestPurchase,
   * узел показывается в ряду кнопок на месте «Добавить +», чтобы добавление не пропало.
   */
  cta?: React.ReactNode | null;
  /** «Тренировать»; null — кнопки нет (набор ещё не добавлен или в нём нет карточек). */
  onTrain: (() => void) | null;
}>;

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', menu: 'Меню', speak: 'Озвучить', play: 'Смотреть видео', train: 'Практика', phrases: 'Фразы', phrase: { one: 'фраза', few: 'фразы', many: 'фраз' } },
  uk: { back: 'Назад', menu: 'Меню', speak: 'Озвучити', play: 'Дивитися відео', train: 'Тренувати', phrases: 'Фрази', phrase: { one: 'фраза', few: 'фрази', many: 'фраз' } },
  en: { back: 'Back', menu: 'Menu', speak: 'Listen', play: 'Watch the video', train: 'Train', phrases: 'Phrases', phrase: { one: 'phrases', few: 'phrases', many: 'phrases' } },
  es: { back: 'Atrás', menu: 'Menú', speak: 'Escuchar', play: 'Ver el vídeo', train: 'Entrenar', phrases: 'Frases', phrase: { one: 'frases', few: 'frases', many: 'frases' } },
  'pt-BR': { back: 'Voltar', menu: 'Menu', speak: 'Ouvir', play: 'Assistir ao vídeo', train: 'Treinar', phrases: 'Frases', phrase: { one: 'frases', few: 'frases', many: 'frases' } },
  vi: { back: 'Quay lại', menu: 'Menu', speak: 'Nghe', play: 'Xem video', train: 'Luyện tập', phrases: 'Cụm từ', phrase: { one: 'cụm từ', few: 'cụm từ', many: 'cụm từ' } },
  id: { back: 'Kembali', menu: 'Menu', speak: 'Dengarkan', play: 'Tonton video', train: 'Latihan', phrases: 'Frasa', phrase: { one: 'frasa', few: 'frasa', many: 'frasa' } },
  tr: { back: 'Geri', menu: 'Menü', speak: 'Dinle', play: 'Videoyu izle', train: 'Çalış', phrases: 'İfadeler', phrase: { one: 'ifade', few: 'ifade', many: 'ifade' } },
  pl: { back: 'Wstecz', menu: 'Menu', speak: 'Posłuchaj', play: 'Obejrzyj film', train: 'Trenuj', phrases: 'Frazy', phrase: { one: 'fraza', few: 'frazy', many: 'fraz' } },
});

const stamp = (sec?: number): string => {
  if (typeof sec !== 'number' || !Number.isFinite(sec) || sec < 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

function VideoSetViewInner({ pack, title, cards, lang, cardContentLang, onBack, onMore, onSpeak, onOpenMoment, owned = false, onAdded, onRequestPurchase, cta = null, onTrain }: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const g = useLv2Glass();
  const { theme } = useTheme();
  // зачем (замечание владельца 10.10): цвета — токены выбранной темы, стили пересобираются при смене темы.
  const styles = useScaledTextStyles(useMemo(() => makeStyles(g), [g]));
  const copy = useMemo(() => copyFor(lang), [lang]);
  // зачем (владелец 13.10, образец cards-v2.html videoSet(), «▶ В видео»): тап по фразе с отметкой времени раскрывает кнопку, а не открывает ролик сразу;
  // раскрыта одна фраза за раз. Название — коротко, как утвердил владелец.
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const jumpLabel = useMemo(() => triLang(lang, {
    ru: 'В видео', uk: 'У відео', en: 'In the video', es: 'En el vídeo', 'pt-BR': 'No vídeo', vi: 'Trong video', id: 'Di video', tr: 'Videoda', pl: 'W filmie',
  }), [lang]);
  const toggleJump = useCallback((card: CardItem) => {
    animateNextLayoutTransition(); // зачем: кнопка вставляется в поток — карточки ниже сдвигаются плавно, а не скачком
    setOpenCardId((prev) => {
      const next = prev === card.id ? null : card.id;
      DebugLogger.info('[VIDEO-PHRASE-JUMP]', `${next ? 'раскрыта' : 'свёрнута'} фраза: набор=${pack.id} карточка=${card.id} время=${String(card.videoStartSec)}с (поле карточки videoStartSec, без запросов)`);
      return next;
    });
  }, [pack.id]);
  const jumpToVideo = useCallback((card: CardItem) => {
    if (!onOpenMoment) {
      DebugLogger.warn('[VIDEO-PHRASE-JUMP]', `нажато «В видео», обработчика нет: набор=${pack.id} карточка=${card.id}`);
      return;
    }
    DebugLogger.info('[VIDEO-PHRASE-JUMP]', `открываю видео: набор=${pack.id} ролик=${String(pack.videoId ?? '')} карточка=${card.id} старт=${String(card.videoStartSec)}с`);
    onOpenMoment(card);
  }, [onOpenMoment, pack.id, pack.videoId]);
  // зачем (владелец 18.10): сохранение отдельной карточки набора из видео (мгновенно, откат при отказе, без двойных тапов).
  const cardSave = useVideoCardSave({ lang, packLanguage: pack.packLanguage, sourceTitle: title });
  const videoId = String(pack.videoId ?? '').trim();
  const thumbUrl = videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : null;
  const count = cards.length > 0 ? cards.length : pack.cardCount;
  const duration = formatDuration(pack.videoDurationSec);
  const progress = packVideoProgress(pack);
  const level = packDeckLevel(pack);
  // зачем (Макеты cards-082, разбор 13.10): ролик не открылся — это сообщение, а не ошибка: заголовок «Сообщение» (тон info), а не «Что-то пошло не так»
  const failToast = useMemo(() => actionToastTri('info', {
    ru: 'Видео сейчас не открывается. Карточки набора доступны как обычно.',
    uk: 'Відео зараз не відкривається. Картки набору доступні як завжди.',
    es: 'El vídeo no se abre ahora. Las tarjetas del pack siguen disponibles.', en: 'This video isn\'t opening right now. The pack\'s cards are available as usual.',
    'pt-BR': 'O vídeo não abre agora. Os cartões do pacote continuam disponíveis.', vi: 'Video hiện không mở được. Các thẻ trong bộ thẻ vẫn dùng bình thường.', id: 'Video tidak bisa dibuka sekarang. Kartu dalam paket tetap tersedia seperti biasa.', tr: 'Video şu anda açılmıyor. Paketteki kartlar her zamanki gibi kullanılabilir.', pl: 'Film nie otwiera się teraz. Karty z zestawu są dostępne jak zwykle.',
  }), []);

  return (
    <View testID="video-set-view" style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} decelerationRate="fast">
        <PackTopBarRow
          left={<PackBackBare g={g} testID="mp-back" label={copy.back} onPress={onBack} />}
          right={onMore ? <PackSquareButton g={g} testID="video-set-more" label={copy.menu} onPress={onMore} /> : undefined}
        />

        {/* `vthumb(…, { play, prog })`: 16:9 r18, ▶ по центру, длительность справа внизу, полоса просмотра 3 внизу. */}
        <View style={[styles.heroShadow, { boxShadow: plateBoxShadow(g) }]}>
          <Pressable
            testID="video-set-hero"
            accessibilityRole="button"
            accessibilityLabel={copy.play}
            onPress={() => { void hapticTap(); void openVideo(pack.videoId, () => emitAppEvent('action_toast', failToast)); }}
            style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
          >
            {thumbUrl ? <Image accessible={false} source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} recyclingKey={videoId} cachePolicy="memory-disk" /> : null}
            <View style={styles.play}><Ionicons name="play" size={24} color={g.mediaInk} /></View>
            {duration ? <View style={styles.duration} pointerEvents="none"><Text style={[styles.durationText, { color: g.mediaInk }]}>{duration}</Text></View> : null}
            {progress > 0 ? <View style={styles.progressTrack} pointerEvents="none"><View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: g.mediaInk }]} /></View> : null}
          </Pressable>
        </View>

        <Text testID="video-set-title" accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>
        <View style={styles.metaRow}>
          {level ? <View style={[styles.lvl, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}><Text style={[styles.lvlText, { color: g.text }]}>{level}</Text></View> : null}
          <Text style={[styles.metaText, { color: g.secondary }]}>{`${count} ${pluralWord(lang, count, copy.phrase)}`}</Text>
          {pack.isCommunityUgc && (pack.likesCount ?? 0) > 0 ? (
            <View style={styles.likes} accessible accessibilityLabel={String(pack.likesCount)}>
              <Ionicons name="heart-outline" size={18} color={g.secondary} />
              <Text style={[styles.metaText, { color: g.secondary }]}>{pack.likesCount}</Text>{/* guard-ok: счётчик, не подпись */}
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          {onTrain ? <PackCta g={g} grow icon="play" label={copy.train} onPress={onTrain} testID="video-set-train" /> : null}
          {pack.isCommunityUgc && onAdded && onRequestPurchase ? (
            <CommunityPackSocialBar
              pack={pack}
              lang={lang}
              t={theme}
              owned={owned}
              variant="setAdd"
              addStyle={onTrain ? 'ghost' : 'primary'}
              onAdded={onAdded}
              onRequestPurchase={onRequestPurchase}
            />
          ) : cta ? <View style={styles.ctaSlot}>{cta}</View> : null}
        </View>

        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: g.text }]}>
          {copy.phrases}
          <Text style={{ color: g.mutedText }}>{`  ${count}`}</Text>
        </Text>

        <View style={styles.rows}>
          {cards.map((card) => {
            const back = resolveFlashcardBackText(card, cardContentLang);
            const time = stamp(card.videoStartSec);
            return (
              <KitTouchable
                key={card.id}
                testID={`video-set-row-${card.id}`}
                accessibilityRole="button"
                accessibilityLabel={back ? `${card.en}, ${back}` : card.en}
                onPress={() => { void hapticTap(); if (onOpenMoment && time) toggleJump(card); else onSpeak(card.en); }}
                style={[styles.phraseCard, { boxShadow: plateBoxShadow(g) }]}
              >
                <PlateFill g={g} radius={16} />
                <View style={styles.phraseTop}>
                  {time ? (
                    <View style={[styles.stamp, { backgroundColor: g.dividerTone }]}>
                      <Ionicons name="play" size={16} color={g.text} />
                      <Text style={[styles.stampText, { color: g.text }]}>{time}</Text>
                    </View>
                  ) : <View />}
                  {/* зачем (владелец 18.10): «Сохранить» на КАЖДОЙ карточке из видео — только те, что человек сам хочет, а не весь набор. */}
                  <View style={styles.rowActions}>
                    <VideoCardSaveSlot
                      testID={`video-set-save-${card.id}`}
                      save={cardSave}
                      card={card}
                      ink={g.text}
                      // зачем ([BLEND-1018B] 18.10): сохранённый значок на buttonFill — accentGraphic (accentText давал до 2,89:1)
                      savedInk={g.accentGraphic}
                      // зачем ([BLEND-1018B] 18.10): вуаль dividerTone на плашке — 1,12:1, кнопка сливалась; buttonFill держит тон ≥ 1,5
                      backgroundColor={g.buttonFill}
                      boxShadow={nestedBoxShadow(g)}
                    />
                    <Pressable accessibilityRole="button" accessibilityLabel={copy.speak} hitSlop={6} onPress={() => onSpeak(card.en)} style={({ pressed }) => [styles.vol, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }, pressed && styles.pressed]}>
                      <Ionicons name="volume-high" size={16} color={g.text} />
                    </Pressable>
                  </View>
                </View>
                <Text style={[styles.phrase, { color: g.text }]}>{card.en}</Text>
                {back ? <Text style={[styles.tr, { color: g.secondary }]}>{back}</Text> : null}
                {onOpenMoment && time && openCardId === card.id ? (
                  <View style={styles.jumpRow}>
                    <Pressable
                      testID={`video-set-jump-${card.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${jumpLabel} ${time}`}
                      onPress={() => { void hapticTap(); jumpToVideo(card); }}
                      style={({ pressed }) => [styles.jump, { backgroundColor: g.ctaFill }, pressed && styles.pressed]}
                    >
                      <Ionicons name="play" size={16} color={g.ctaFillInk} />
                      <Text style={[styles.jumpText, { color: g.ctaFillInk }]}>{jumpLabel}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </KitTouchable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export const VideoSetView = memo(VideoSetViewInner);

const makeStyles = (g: ReturnType<typeof useLv2Glass>) => StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.82 },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  // зачем: тень на внешнем слое, клип кадра по скруглению — на внутреннем (overflow:hidden на контейнере с boxShadow режет тень).
  heroShadow: { marginTop: 14, borderRadius: 18, backgroundColor: g.opaqueControl },
  hero: { aspectRatio: 16 / 9, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  play: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: g.mediaScrim },
  duration: { position: 'absolute', right: 8, bottom: 10, paddingHorizontal: 7, minHeight: 22, borderRadius: 6, justifyContent: 'center', backgroundColor: g.mediaScrim },
  durationText: { fontSize: 13, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: g.mediaScrim },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  title: { marginTop: 16, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  metaRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  metaText: { fontSize: 16, lineHeight: 22 },
  likes: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lvl: { minWidth: 38, height: 26, paddingHorizontal: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  lvlText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  actions: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaSlot: { flex: 1, minWidth: 0 },
  sectionTitle: { marginTop: 26, marginBottom: 14, marginHorizontal: 2, fontSize: 19, lineHeight: 24, fontWeight: '600' },
  rows: { gap: 13 },
  // `.pill` раскрытой фразы (cards-v2 videoSet): высота 38, поля 14/18, шрифт 15, зазор 8, сверху 14
  jumpRow: { marginTop: 14, flexDirection: 'row' },
  jump: { minHeight: 38, borderRadius: 19, paddingLeft: 14, paddingRight: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  jumpText: { fontSize: 16, lineHeight: 20, fontWeight: '700' }, // зачем (D145, ratchet 13.10): шкала 16/13 — было 15
  // `phrase()` макета: карточка r16 от 118 высотой, поля 14/18/16; таймкод-чип и озвучка в верхней строке.
  phraseCard: { minHeight: 118, borderRadius: 16, paddingTop: 14, paddingHorizontal: 18, paddingBottom: 16 },
  phraseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stamp: { minHeight: 26, borderRadius: 13, paddingLeft: 8, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  stampText: { fontSize: 13, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  vol: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phrase: { marginTop: 10, fontSize: 21, lineHeight: 27, fontWeight: '600' },
  tr: { marginTop: 3, fontSize: 16, lineHeight: 21 },
});
