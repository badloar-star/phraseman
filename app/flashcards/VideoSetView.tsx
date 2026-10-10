/**
 * Экран набора из видео — макет docs/design/v2-app/cards-section.html (кадры «Набор из видео», «Набор из видео — уже у вас»).
 *
 * зачем (владелец: «в приложении запрещены любые различия с макетом»): заголовок 30/36, широкое превью ролика 218 высотой с кнопкой «играть»,
 * три пилюли (число фраз · язык · длительность), строки фраз с таймкодом и кнопкой озвучки, внизу мятная кнопка («Учить набор» до добавления,
 * «Тренировать» после). Данные и обработчики приходят от экрана набора; здесь только вид.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';

import { KitCard } from '../../components/cards-grid/CardsKit';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { BackButton, PanelDock } from '../../components/mistakes-panel/PanelKit';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { mixDark, themePair } from '../../components/mistakes-panel/panelPaint';
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';
import { hapticTap } from '../../hooks/use-haptics';
import { actionToastTri, emitAppEvent } from '../events';
import type { FlashcardMarketPack } from './marketplace';
import { packLanguageMeta } from './pack_languages';
import { openVideo } from './VideoPackRow';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './types';

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
  /** Тап по строке фразы: открыть ролик на её секунде; null — строка только озвучивает. */
  onOpenMoment: ((card: CardItem) => void) | null;
  /** Нижняя кнопка: готовый узел («Учить набор» с логикой добавления) или null — тогда рисуется «Тренировать» с onTrain. */
  cta: React.ReactNode | null;
  onTrain: (() => void) | null;
}>;

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', menu: 'Меню', speak: 'Озвучить', play: 'Смотреть видео', train: 'Тренировать', min: 'мин', phrase: { one: 'фраза', few: 'фразы', many: 'фраз' } },
  uk: { back: 'Назад', menu: 'Меню', speak: 'Озвучити', play: 'Дивитися відео', train: 'Тренувати', min: 'хв', phrase: { one: 'фраза', few: 'фрази', many: 'фраз' } },
  en: { back: 'Back', menu: 'Menu', speak: 'Listen', play: 'Watch the video', train: 'Train', min: 'min', phrase: { one: 'phrases', few: 'phrases', many: 'phrases' } },
  es: { back: 'Atrás', menu: 'Menú', speak: 'Escuchar', play: 'Ver el vídeo', train: 'Entrenar', min: 'min', phrase: { one: 'frases', few: 'frases', many: 'frases' } },
  'pt-BR': { back: 'Voltar', menu: 'Menu', speak: 'Ouvir', play: 'Assistir ao vídeo', train: 'Treinar', min: 'min', phrase: { one: 'frases', few: 'frases', many: 'frases' } },
  vi: { back: 'Quay lại', menu: 'Menu', speak: 'Nghe', play: 'Xem video', train: 'Luyện tập', min: 'phút', phrase: { one: 'cụm từ', few: 'cụm từ', many: 'cụm từ' } },
  id: { back: 'Kembali', menu: 'Menu', speak: 'Dengarkan', play: 'Tonton video', train: 'Latihan', min: 'mnt', phrase: { one: 'frasa', few: 'frasa', many: 'frasa' } },
  tr: { back: 'Geri', menu: 'Menü', speak: 'Dinle', play: 'Videoyu izle', train: 'Çalış', min: 'dk', phrase: { one: 'ifade', few: 'ifade', many: 'ifade' } },
  pl: { back: 'Wstecz', menu: 'Menu', speak: 'Posłuchaj', play: 'Obejrzyj film', train: 'Trenuj', min: 'min', phrase: { one: 'fraza', few: 'frazy', many: 'fraz' } },
});

const stamp = (sec?: number): string => {
  if (typeof sec !== 'number' || !Number.isFinite(sec) || sec < 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

function VideoSetViewInner({ pack, title, cards, lang, cardContentLang, onBack, onMore, onSpeak, onOpenMoment, cta, onTrain }: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const g = useLv2Glass();
  // зачем (замечание владельца 10.10): цвета — токены выбранной темы, стили пересобираются при смене темы.
  const styles = useScaledTextStyles(useMemo(() => makeStyles(g), [g]));
  const copy = useMemo(() => copyFor(lang), [lang]);
  const [a, b] = themePair(g);
  const videoId = String(pack.videoId ?? '').trim();
  const thumbUrl = videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : null;
  const count = cards.length > 0 ? cards.length : pack.cardCount;
  const minutes = pack.videoDurationSec && pack.videoDurationSec > 0 ? Math.max(1, Math.round(pack.videoDurationSec / 60)) : 0;
  const failToast = useMemo(() => actionToastTri('error', {
    ru: 'Видео сейчас не открывается. Карточки набора доступны как обычно.',
    uk: 'Відео зараз не відкривається. Картки набору доступні як завжди.',
    es: 'El vídeo no se abre ahora. Las tarjetas del pack siguen disponibles.',
  }), []);
  const pills = [
    `${count} ${pluralWord(lang, count, copy.phrase)}`,
    packLanguageMeta(pack.packLanguage ?? pack.studyTarget).nativeName,
    minutes > 0 ? `${minutes} ${copy.min}` : '',
  ].filter(Boolean);

  return (
    <View testID="video-set-view" style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <BackButton g={g} onPress={onBack} label={copy.back} />
          {onMore ? (
            <Pressable testID="video-set-more" accessibilityRole="button" accessibilityLabel={copy.menu} hitSlop={8} onPress={onMore} style={({ pressed }) => [styles.square, pressed && styles.pressed]}>
              <Ionicons name="ellipsis-vertical" size={18} color={g.text} />
            </Pressable>
          ) : null}
        </View>
        <Text testID="video-set-title" accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>

        <Pressable
          testID="video-set-hero"
          accessibilityRole="button"
          accessibilityLabel={copy.play}
          onPress={() => { void hapticTap(); void openVideo(pack.videoId, () => emitAppEvent('action_toast', failToast)); }}
          style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
        >
          <LinearGradient pointerEvents="none" colors={[mixDark(a, g.deepBase, 0.6), mixDark(b, g.deepBase, 0.5)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {thumbUrl ? <Image accessible={false} source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} recyclingKey={videoId} cachePolicy="memory-disk" /> : null}
          <View style={styles.play}><Ionicons name="play" size={26} color={g.mediaInk} /></View>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 24, boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: g.hairlineSoft }] }]} />
        </Pressable>

        <View style={styles.pills}>
          {pills.map((text) => (
            <View key={text} style={styles.pill}><Text style={styles.pillText}>{text}</Text></View>
          ))}
        </View>

        <View style={styles.rows}>
          {cards.map((card) => {
            const back = resolveFlashcardBackText(card, cardContentLang);
            const time = stamp(card.videoStartSec);
            return (
              <KitCard
                key={card.id}
                g={g}
                radius={20}
                testID={`video-set-row-${card.id}`}
                accessibilityLabel={back ? `${card.en}, ${back}` : card.en}
                onPress={() => { void hapticTap(); if (onOpenMoment && time) onOpenMoment(card); else onSpeak(card.en); }}
              >
                <View style={styles.row}>
                  {time ? <Text style={styles.time}>{time}</Text> : null}
                  <View style={styles.rowText}>
                    <Text style={[styles.phrase, { color: g.text }]}>{card.en}</Text>
                    {back ? <Text style={[styles.tr, { color: g.secondary }]}>{back}</Text> : null}
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={copy.speak} hitSlop={6} onPress={() => onSpeak(card.en)} style={({ pressed }) => [styles.vol, pressed && styles.pressed]}>
                    <Ionicons name="volume-high" size={18} color={g.text} />
                  </Pressable>
                </View>
              </KitCard>
            );
          })}
        </View>
      </ScrollView>

      <PanelDock>
        <View style={styles.dock}>
          {cta ?? (onTrain ? (
            <Pressable
              testID="video-set-train"
              accessibilityRole="button"
              accessibilityLabel={copy.train}
              onPress={onTrain}
              style={({ pressed }) => [styles.train, { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -12, color: `${g.accent}B3` }] }, pressed && styles.pressed]}
            >
              <Text style={[styles.trainText, { color: g.accentInk }]}>{copy.train}</Text>
              <Ionicons name="arrow-forward" size={20} color={g.accentInk} />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 24, boxShadow: [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: `${g.mediaInk}B3` }] }]} />
            </Pressable>
          ) : null)}
        </View>
      </PanelDock>
    </View>
  );
}

export const VideoSetView = memo(VideoSetViewInner);

const makeStyles = (g: ReturnType<typeof useLv2Glass>) => StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.82 },
  scroll: { paddingHorizontal: 20, paddingBottom: 140 },
  top: { minHeight: 44, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  square: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: g.glassEdge }] },
  title: { marginTop: 14, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4 },
  hero: { marginTop: 18, height: 218, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: [{ offsetX: 0, offsetY: 20, blurRadius: 40, spreadDistance: -20, color: g.dropShadow }] },
  play: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: g.mediaScrim },
  pills: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 30, borderRadius: 18, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: g.hairlineSoft },
  pillText: { fontSize: 16, lineHeight: 20, fontWeight: '700', color: g.text },
  rows: { marginTop: 9, gap: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingLeft: 12, paddingRight: 14 },
  time: { width: 40, fontSize: 13, lineHeight: 17, fontWeight: '700', color: g.accent },
  rowText: { flex: 1, minWidth: 0 },
  phrase: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  tr: { marginTop: 2, fontSize: 16, lineHeight: 19 },
  vol: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: g.glassEdge },
  dock: { paddingHorizontal: 20 },
  train: { minHeight: 48, borderRadius: 24, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  trainText: { fontSize: 16, fontWeight: '700' },
});
