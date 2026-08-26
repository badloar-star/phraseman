import Ionicons from '@expo/vector-icons/Ionicons';
import RuneGlyph from '../RuneGlyph';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTournamentPalette } from '../ui/v2_theme';
import { useArenaFontScale } from '../../hooks/use_arena_font_scale';
import { V2Card, V2Cta } from '../ui/v2_ui';
import type { ArenaFeatureState, ArenaHubSection } from '../../modules/arena/expansion_contract';
import { ARENA_HUB_SECTIONS } from '../../modules/arena/expansion_contract';
import { useLang } from '../LangContext';
import { arenaText } from '../../modules/arena/copy';
import { arenaProgressView } from '../../modules/arena/progress_view';
import { arenaExpansionText, type ArenaExpansionCopyKey } from '../../modules/arena/expansion_copy';
import {
  arenaExpansionStateCopy,
  type ArenaExpansionScreenState,
} from '../../modules/arena/expansion_state';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function ArenaSectionTabs({
  selected,
  labels,
  onSelect,
}: Readonly<{
  selected: ArenaHubSection;
  labels: Readonly<Record<ArenaHubSection, string>>;
  onSelect: (section: ArenaHubSection) => void;
}>) {
  const P = useTournamentPalette();
  return (
    <ScrollView decelerationRate="fast"
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={styles.tabs}
    >
      {ARENA_HUB_SECTIONS.map((section) => {
        const active = section === selected;
        return (
          <Pressable
            key={section}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(section)}
            style={[styles.tab, { backgroundColor: active ? P.accent : P.elev }]}
          >
            <Text style={[styles.tabText, { color: active ? P.okInk : P.text }]}>{labels[section]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * Кнопка кошелька.
 *
 * `balance` может быть неизвестен: ответа ещё нет. Ноль в этом случае —
 * утверждение «у тебя пусто», а не отсутствие ответа. Игрок, накопивший
 * тысячу рун, видел ноль и шёл проверять, не списали ли всё.
 */
export function ArenaWalletButton({ label, balance, onPress, disabled = false, disabledHint }: { label: string; balance: number | null; onPress: () => void; disabled?: boolean; disabledHint?: string }) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const unknown = arenaText(lang, 'valueUnknown');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${balance === null ? unknown : balance}`}
      accessibilityHint={disabled ? disabledHint : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.walletButton, { backgroundColor: P.gold, opacity: disabled ? 0.55 : 1 }]}
    >
      <RuneGlyph size={17} color={P.onGold} />
      <Text accessible={balance !== null} style={[styles.walletValue, { color: P.onGold }]}>{balance === null ? '—' : balance}</Text>
    </Pressable>
  );
}

export function ArenaFeatureRow({
  title,
  body,
  icon,
  onPress,
  disabled = false,
  accent = false,
  badge,
  disabledHint,
}: Readonly<{
  title: string;
  body?: string;
  icon: IconName;
  onPress?: () => void;
  disabled?: boolean;
  accent?: boolean;
  badge?: string;
  disabledHint?: string;
}>) {
  const P = useTournamentPalette();
  const fontScale = useArenaFontScale();
  const reduceMotion = useReduceMotion();
  const foreground = accent ? P.okInk : disabled ? P.ghost : P.text;
  return (
    <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(220)}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={[title, body, badge].filter(Boolean).join('. ')}
        accessibilityHint={disabled ? disabledHint : undefined}
        disabled={disabled}
        onPress={onPress}
        style={[styles.feature, { backgroundColor: accent ? P.accent : P.elev, opacity: disabled ? 0.62 : 1 }]}
      >
        <View style={[styles.featureIcon, { backgroundColor: accent ? 'rgba(7,17,10,0.13)' : P.elev2 }]}>
          <Ionicons name={icon} size={25} color={foreground} />
        </View>
        <View style={styles.featureCopy}>
          <Text style={[styles.featureTitle, { color: foreground }]}>{title}</Text>
          {body ? <Text style={[styles.featureBody, { lineHeight: 18 * fontScale, color: accent ? P.okInk : P.muted }]}>{body}</Text> : null}
          {badge ? <Text style={[styles.featureBadge, { lineHeight: 17 * fontScale, color: accent ? P.okInk : P.gold }]}>{badge}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={22} color={foreground} />
      </Pressable>
    </Animated.View>
  );
}

export function ArenaProgress({ value, max, label }: { value: number | null; max: number; label: string }) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const progress = arenaProgressView(value, max);
  const unknown = arenaText(lang, 'valueUnknown');
  const accessibilityValue = progress.value === null
    ? { text: unknown }
    : { min: 0, max: progress.max, now: progress.value };
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={accessibilityValue}
      style={styles.progressWrap}
    >
      <View style={[styles.progressTrack, { backgroundColor: P.elev2 }]}>
        <View style={[styles.progressFill, { backgroundColor: P.accent, width: `${progress.ratio * 100}%` }]} />
      </View>
      <Text accessible={false} style={[styles.progressText, { color: P.muted }]}>{progress.value === null ? '—' : progress.value} / {progress.max}</Text>
    </View>
  );
}

export function ArenaDisclosureBadge({ text }: { text: string }) {
  const P = useTournamentPalette();
  const fontScale = useArenaFontScale();
  return (
    <View style={[styles.disclosure, { backgroundColor: P.goldSoft }]}>
      <Ionicons name="information-circle" size={18} color={P.gold} />
      <Text style={[styles.disclosureText, { lineHeight: 18 * fontScale, color: P.text }]}>{text}</Text>
    </View>
  );
}

export function ArenaStateCard({
  state,
  title,
  body,
  actionLabel,
  onAction,
}: Readonly<{
  state: ArenaFeatureState;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}>) {
  const P = useTournamentPalette();
  const fontScale = useArenaFontScale();
  const icon: IconName = state === 'error' ? 'alert-circle'
    : state === 'expired' ? 'time'
      : state === 'unavailable' ? 'lock-closed'
        : state === 'empty' ? 'albums-outline'
          : state === 'loading' ? 'hourglass-outline'
            : 'checkmark-circle';
  return (
    <V2Card style={styles.stateCard}>
      <Ionicons name={icon} size={32} color={state === 'error' ? P.danger : P.accent} />
      <Text accessibilityLiveRegion="polite" style={[styles.stateTitle, { color: P.text }]}>{title}</Text>
      {body ? <Text style={[styles.stateBody, { lineHeight: 20 * fontScale, color: P.muted }]}>{body}</Text> : null}
      {actionLabel && onAction ? <View style={styles.stateAction}><V2Cta onPress={onAction}>{actionLabel}</V2Cta></View> : null}
    </V2Card>
  );
}

/**
 * Единственный способ показать «содержимого нет» на экранах расширения.
 *
 * Заголовок, объяснение и кнопку выбирает чистая функция, а не JSX: раньше это
 * решал каждый экран сам, и все семь одинаково выдавали неудачную загрузку за
 * выключенный раздел. Здесь развилка одна, и она проверяется тестом.
 */
export function ArenaStateNotice({
  state,
  ghost = false,
  emptyHint,
  onRetry,
  onBack,
}: Readonly<{
  state: ArenaExpansionScreenState;
  ghost?: boolean;
  emptyHint?: ArenaExpansionCopyKey;
  onRetry?: () => void;
  onBack?: () => void;
}>) {
  const { lang } = useLang();
  const copy = arenaExpansionStateCopy({ state, ghost, ...(emptyHint ? { emptyHint } : {}) });
  // Загрузка молчит: слово «Загрузка…» ничего не сообщает, а ожидание рисует.
  if (copy.silent) return null;
  const action = copy.action === 'retry' ? onRetry : copy.action === 'back' ? onBack : undefined;
  return (
    <ArenaStateCard
      state={copy.card}
      title={arenaExpansionText(lang, copy.title)}
      {...(copy.body ? { body: arenaExpansionText(lang, copy.body) } : {})}
      {...(action && copy.actionLabel
        ? { actionLabel: arenaExpansionText(lang, copy.actionLabel), onAction: action }
        : {})}
    />
  );
}

export function ArenaSectionTitle({ children }: { children: React.ReactNode }) {
  const P = useTournamentPalette();
  const fontScale = useArenaFontScale();
  // eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- bounded authored heading; two wrapped lines keep the following action reachable at large font
  return <Text numberOfLines={2} style={[styles.sectionTitle, { lineHeight: 25 * fontScale, color: P.text }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  tabs: { gap: 8, paddingVertical: 2 },
  tab: { minHeight: 46, minWidth: 82, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14, fontWeight: '800' },
  walletButton: { minHeight: 44, minWidth: 64, borderRadius: 16, paddingHorizontal: 10, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  walletValue: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  feature: { minHeight: 82, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  featureCopy: { flex: 1, minWidth: 0 },
  featureTitle: { fontSize: 17, fontWeight: '900' },
  featureBody: { marginTop: 2, fontSize: 13, fontWeight: '600' },
  featureBadge: { marginTop: 4, fontSize: 12, fontWeight: '900' },
  progressWrap: { gap: 6 },
  progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressText: { alignSelf: 'flex-end', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  disclosure: { minHeight: 44, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclosureText: { flex: 1, fontSize: 13, fontWeight: '700' },
  stateCard: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  stateBody: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  stateAction: { width: '100%', marginTop: 4 },
  sectionTitle: { marginTop: 2, fontSize: 19, fontWeight: '900' },
});
