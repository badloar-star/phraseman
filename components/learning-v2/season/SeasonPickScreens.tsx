// ═════════════════════════════════════════════════════════════════════════
// SeasonPickScreens.tsx — полноэкранные списки Сезона: «Все главы» и «Эпизоды главы» (вместо веера «Вся глава»).
//
// зачем (владелец 22.10 через координатора, макет lesson-hub-final.html, кадры 2–3: «выбор главы мне нравится, выбор эпизода тоже»): списки открываются поверх шапки вкладки,
// общая кнопка «назад» — ScreenBackButton (круг 48, слева 20, у безопасного края), строки — широкие карточки с ✓ / ▶ / замком, «Продолжить эпизод N» внизу над таббаром.
// Цвета — токены текущей темы (закон владельца 22.10), без обводок; нажатие — V2Pressable. Данные — колода урока из подготовленного прогресса, новых чтений нет.
// ═════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../../constants/i18n';
import { useIsTabPage, useTabTopBleedInset } from '../../tab_top_bleed';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import ScreenBackButton, { SCREEN_BACK_RESERVED, SCREEN_BACK_SIZE } from '../../v2/ScreenBackButton';
import V2Pressable from '../../v2/V2Pressable';
import { plateBoxShadow } from '../../v2/ShadowSurface';
import { useLv2Glass } from '../LearningV2Glass';
import { lv2Mix } from '../learning_v2_task_theme_tokens';
import { seasonText } from './season_copy';
import { seasonCardText, seasonEpisodesCountLabel } from './season_copy_card';
import type { SeasonCard, SeasonChapterSpan, SeasonDeck, SeasonEpisodeCard } from './season_course_model';
import type { SeasonEpisodeInfo } from './SeasonCourseView';

type IonName = React.ComponentProps<typeof Ionicons>['name'];
export type SeasonRowState = 'done' | 'cur' | 'open' | 'lock';

export type SeasonPrimaryAction = Readonly<{ label: string; onPress: () => void }>;

/** Состояние главы для списка: пройдена целиком / в ней текущий эпизод / открыта / всё закрыто. */
export function seasonChapterRowState(deck: SeasonDeck, span: SeasonChapterSpan): SeasonRowState {
  if (span.total > 0 && span.doneCount >= span.total) return 'done';
  if (deck.currentIndex >= span.firstIndex && deck.currentIndex <= span.lastIndex) return 'cur';
  const episodes = deck.cards.slice(span.firstIndex, span.lastIndex + 1).filter((c) => c.kind === 'episode');
  return episodes.length > 0 && episodes.every((c) => c.state === 'locked') ? 'lock' : 'open';
}

/** Общая шапка полноэкранных списков Сезона: ScreenBackButton + подпись и заголовок рядом с её кругом. Нужна и «Все уроки» (SeasonCourseConnected). */
export const SeasonListHeader = memo(function SeasonListHeader(props: Readonly<{ screen: string; kicker: string | null; title: string; onBack: () => void; testID: string }>) {
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const isTab = useIsTabPage();
  const bleed = useTabTopBleedInset();
  // зачем: верх кнопки «назад» — безопасный отступ (как в ScreenBackButton: на странице вкладки — высота зоны часов); заголовок выравнивается по её кругу
  const safeTop = isTab ? bleed : insets.top;
  return (
    <>
      <ScreenBackButton screen={props.screen} onPress={props.onBack} testID={`${props.testID}-back`} />
      <View style={[styles.header, { paddingTop: safeTop, paddingLeft: SCREEN_BACK_RESERVED }]}>
        <View style={styles.headerText}>
          {props.kicker ? <Text style={[styles.kicker, { color: g.secondary }]} numberOfLines={1}>{props.kicker}</Text> : null}
          <Text accessibilityRole="header" style={[styles.title, { color: g.text }]} numberOfLines={2}>{props.title}</Text>
        </View>
      </View>
    </>
  );
});

function Shell(props: Readonly<{ screen: string; kicker: string; title: string; onBack: () => void; bottomPadding: number; primary: SeasonPrimaryAction | null; testID: string; children: React.ReactNode }>) {
  const g = useLv2Glass();
  return (
    <View style={styles.root} testID={props.testID}>
      <SeasonListHeader screen={props.screen} kicker={props.kicker} title={props.title} onBack={props.onBack} testID={props.testID} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>{props.children}</ScrollView>
      {props.primary ? (
        <View style={[styles.footer, { paddingBottom: props.bottomPadding }]}>
          <V2Pressable accessibilityLabel={props.primary.label} onPress={props.primary.onPress} testID={`${props.testID}-primary`} style={[styles.primary, { backgroundColor: g.text }]}>
            <Ionicons name="play" size={18} color={g.opaqueCard} />
            <Text style={[styles.primaryText, { color: g.opaqueCard }]}>{props.primary.label}</Text>
          </V2Pressable>
        </View>
      ) : <View style={{ height: props.bottomPadding }} />}
    </View>
  );
}

function Row(props: Readonly<{ state: SeasonRowState; badge: IonName | number; title: string; sub?: string | null; tag?: string | null; stars?: number | null; hideTrailing?: boolean; onPress: () => void; testID: string; tall?: boolean }>) {
  const g = useLv2Glass();
  const { state } = props;
  const cur = state === 'cur';
  const lock = state === 'lock';
  const fill = cur ? lv2Mix(g.opaqueCard, g.accent, 0.14) : g.opaqueCard;
  const badgeBg = cur ? g.accent : g.opaqueControl;
  const badgeInk = cur ? g.accentInk : state === 'done' ? g.accentGraphic : g.secondary;
  return (
    <V2Pressable accessibilityLabel={props.title} onPress={props.onPress} testID={props.testID} scaleTo={0.98}
      style={[styles.row, props.tall ? styles.rowTall : styles.rowShort, { backgroundColor: fill }, lock ? null : { boxShadow: plateBoxShadow(g) }]}>
      <View style={[styles.badge, { backgroundColor: badgeBg, opacity: lock ? 0.55 : 1 }]}>
        {typeof props.badge === 'number'
          ? <Text style={[styles.badgeNum, { color: badgeInk }]}>{props.badge}</Text>
          : <Ionicons name={props.badge} size={18} color={badgeInk} />}
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: g.text, opacity: lock ? 0.55 : 1 }]} numberOfLines={2}>{props.title}</Text>
        {props.sub ? <Text style={[styles.rowSub, { color: g.secondary }]} numberOfLines={1}>{props.sub}</Text> : null}
      </View>
      {props.stars != null ? (
        // зачем (владелец 22.10): у пройденных справа звёзды результата вместо галочки — цвет акцента темы, пустые мягче
        <View style={styles.stars} testID={`${props.testID}-stars`} accessibilityElementsHidden importantForAccessibility="no">
          {[1, 2, 3].map((i) => <Ionicons key={i} name={i <= (props.stars ?? 0) ? 'star' : 'star-outline'} size={18} color={i <= (props.stars ?? 0) ? g.accentGraphic : lv2Mix(g.opaqueCard, g.accentGraphic, 0.4)} />)}
        </View>
      )
        : props.tag ? <Text style={[styles.tag, { color: g.accentTextSafe }]}>{props.tag}</Text>
        : props.hideTrailing ? null
        : lock ? <Ionicons name="lock-closed" size={18} color={g.secondary} />
        : props.badge === 'checkmark' && !props.sub ? null
        : <Ionicons name="chevron-forward" size={18} color={cur ? g.accentTextSafe : g.secondary} />}
    </V2Pressable>
  );
}

export type SeasonChaptersScreenProps = Readonly<{
  lang: Lang;
  deck: SeasonDeck;
  lessonOrdinal: number;
  lessonTitle: string;
  chapterScene: (chapterOrdinal: number) => string;
  bottomPadding: number;
  primary: SeasonPrimaryAction | null;
  onBack: () => void;
  onPickChapter: (chapterOrdinal: number) => void;
}>;

/** «Все главы»: строка главы — номер / ✓ / ▶ / замок, сцена главы, «k из n». */
export const SeasonChaptersScreen = memo(function SeasonChaptersScreen(props: SeasonChaptersScreenProps) {
  const { lang, deck } = props;
  const rows = useMemo(() => deck.chapters.map((span) => ({ span, state: seasonChapterRowState(deck, span) })), [deck]);
  return (
    <Shell screen="season_chapters" testID="season-chapters-screen" kicker={`${seasonText(lang, 'lesson', { n: props.lessonOrdinal })}${props.lessonTitle ? ` · ${props.lessonTitle}` : ''}`}
      title={seasonCardText(lang, 'allChapters')} onBack={props.onBack} bottomPadding={props.bottomPadding} primary={props.primary}>
      {rows.map(({ span, state }) => (
        <Row key={span.chapterOrdinal} tall testID={`season-chapter-row-${span.chapterOrdinal}`} state={state}
          badge={state === 'done' ? 'checkmark' : state === 'cur' ? 'play' : span.chapterOrdinal}
          title={props.chapterScene(span.chapterOrdinal)}
          sub={state === 'done' || state === 'lock' ? seasonEpisodesCountLabel(lang, span.total) : seasonText(lang, 'doneOf', { k: span.doneCount, n: span.total })}
          onPress={() => props.onPickChapter(span.chapterOrdinal)} />
      ))}
    </Shell>
  );
});

export type SeasonChapterEpisodesScreenProps = Readonly<{
  lang: Lang;
  deck: SeasonDeck;
  chapterOrdinal: number;
  chapterCount: number;
  chapterScene: string;
  episodeInfo: (card: SeasonEpisodeCard) => SeasonEpisodeInfo;
  bottomPadding: number;
  primary: SeasonPrimaryAction | null;
  onBack: () => void;
  /** Нажатие на строку эпизода или экзамена: хаб становится на эту карту и раскрывает её (как нажатие по карте в карусели). */
  onPickCard: (index: number) => void;
}>;

/** «Эпизоды главы»: пройден ✓ / «Дальше» ▶ / замок; экзамен главы — последней строкой (если включён). */
export const SeasonChapterEpisodesScreen = memo(function SeasonChapterEpisodesScreen(props: SeasonChapterEpisodesScreenProps) {
  const { lang, deck } = props;
  const span = deck.chapters.find((c) => c.chapterOrdinal === props.chapterOrdinal);
  const items = useMemo(() => (span ? deck.cards.slice(span.firstIndex, span.lastIndex + 1).map((card: SeasonCard, i) => ({ card, index: span.firstIndex + i })) : []), [deck, span]);
  return (
    <Shell screen="season_chapter_episodes" testID="season-episodes-screen" kicker={seasonText(lang, 'chapterOf', { n: props.chapterOrdinal, m: props.chapterCount })}
      title={props.chapterScene} onBack={props.onBack} bottomPadding={props.bottomPadding} primary={props.primary}>
      {items.map(({ card, index }) => {
        const state: SeasonRowState = card.state === 'done' ? 'done' : card.state === 'current' ? 'cur' : 'lock';
        const exam = card.kind === 'exam';
        const info = exam ? null : props.episodeInfo(card);
        // 'pending' — звёзды ещё не подняты: слева номер, справа пусто (без галочки и без «1»); число — звёзды
        const pending = info !== null && info.stars === 'pending';
        const stars = info && typeof info.stars === 'number' ? info.stars : null;
        return (
          <Row key={card.id} testID={`season-episode-row-${card.sessionOrdinal}${exam ? '-exam' : ''}`} state={state}
            // у пройденного со звёздами слева номер эпизода, справа звёзды; без звёзд (экзамен, нет данных) — прежняя галочка
            badge={exam ? 'trophy' : state === 'done' ? (stars !== null || pending ? card.sessionOrdinal : 'checkmark') : state === 'cur' ? 'play' : card.sessionOrdinal}
            hideTrailing={pending}
            stars={stars}
            title={exam ? seasonText(lang, 'exam') : (info ? info.title : '')}
            tag={state === 'cur' ? seasonCardText(lang, 'nextTag') : null}
            onPress={() => props.onPickCard(index)} />
        );
      })}
    </Shell>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  header: { minHeight: SCREEN_BACK_SIZE, justifyContent: 'center' },
  headerText: { minHeight: SCREEN_BACK_SIZE, justifyContent: 'center', paddingRight: 20 },
  kicker: { fontSize: 13, lineHeight: 17 },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.3 },
  list: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, gap: 8 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  primary: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, paddingLeft: 14, paddingRight: 18 },
  rowTall: { minHeight: 68 },
  rowShort: { minHeight: 58 },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badgeNum: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  rowText: { flex: 1, paddingVertical: 8 },
  rowTitle: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  rowSub: { marginTop: 1, fontSize: 13, lineHeight: 17 },
  stars: { flexDirection: 'row', gap: 2 },
  tag: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
});
