/**
 * Набор деталей стиля 2.0 — ровно по референсам владельца 24.09 (обе серии).
 * зачем: владелец — «задавай сразу кнопки, стили и всё остальное»: каждый экран
 * собирается из этих деталей, а не рисуется заново. Любая правка вида делается
 * здесь один раз и доезжает до всех экранов.
 *
 * Состав (где видно на референсах):
 *  V2Card          — стеклянная карточка с дымкой (строки Lay/Claim, «Твой прогресс»)
 *  V2ScreenHeader  — круглая «назад» + заголовок/подзаголовок + круглая «…» справа
 *  V2LargeTitle    — крупный заголовок экрана с подписью («Карточки», «Диалоги»)
 *  V2SectionHeader — заголовок секции + «Смотреть все ›»
 *  V2Row           — строка: плашка-значок, название, подпись, счётчик/бейдж, «›»
 *  V2Button        — primary (светлая), accent (шампань), secondary (контур), ghost
 *  V2IconButton    — круглая кнопка (назад, …, play, ✕)
 *  V2Badge         — пилюля-счётчик «20», уровень «A1», «Урок 4»
 *  V2ProgressBar   — дорожка + заливка («24%»)
 *  V2SearchField   — поле поиска со значком лупы
 *  V2InfoCard      — «Небольшой совет» / «Главное правило»: плашка-значок + оверлайн + текст
 *  V2StatStrip     — ряд показателей с разделителями («Урок 8 из 12 | Карточек 50 | …»)
 *  V2AnswerOption  — вариант ответа в тренировках (контур, центр, 2 строки)
 *  V2SheetFrame    — каркас нижней шторки: ручка, заголовок, ✕
 */
import React, { memo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import V2Pressable from './V2Pressable';
import { V2GlassSheen, V2IconTile, useV2GlassStyle } from './V2Glass';
import { useV2Palette } from './useV2Palette';
import { actionBoxShadow, nestedBoxShadow, useShadowGlass } from './ShadowSurface';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { useScaledTextStyles } from '../../hooks/useLineScale';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Карточка ────────────────────────────────────────────────────────────────

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Где лежит пятно дымки (у соседних карточек — разные). */
  seed?: number;
  raised?: boolean;
  radius?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
};

export const V2Card = memo(function V2Card({ children, style, seed = 0, raised, radius = V2.radius.card, onPress, onLongPress, testID, accessibilityLabel, disabled }: CardProps) {
  const glass = useV2GlassStyle(raised);
  const body = [{ borderRadius: radius }, glass, style];
  if (!onPress) {
    return (
      <View testID={testID} style={body}>
        <V2GlassSheen seed={seed} />
        {children}
      </View>
    );
  }
  return (
    <V2Pressable testID={testID} accessibilityLabel={accessibilityLabel} onPress={onPress} onLongPress={onLongPress} disabled={disabled} scaleTo={0.98} style={body}>
      <V2GlassSheen seed={seed} />
      {children}
    </V2Pressable>
  );
});

// ─── Круглая кнопка ──────────────────────────────────────────────────────────

type IconButtonProps = {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  /** 'glass' — стекло (назад, …), 'outline' — прозрачный круг с кромкой (play в строках). */
  variant?: 'glass' | 'outline';
  tint?: 'text' | 'icon';
  testID?: string;
  disabled?: boolean;
};

export const V2IconButton = memo(function V2IconButton({ icon, onPress, accessibilityLabel, size = V2.iconButton, variant = 'glass', tint = 'text', testID, disabled }: IconButtonProps) {
  const p = useV2Palette();
  const g = useShadowGlass();
  const color = tint === 'icon' ? p.iconTint : p.text;
  return (
    <V2Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.92}
      hitSlop={8}
      style={[
        styles.round,
        { width: size, height: size, borderRadius: size / 2 },
        // зачем (владелец 12.10, стиль «Тень»): круглая кнопка без кольца — заливка и малая тень; «призрачная» — без заливки и без обводки.
        variant === 'glass' ? { backgroundColor: p.glassRaised, boxShadow: nestedBoxShadow(g) } : { backgroundColor: 'transparent' },
      ]}
    >
      {variant === 'glass' ? <V2GlassSheen seed={1} /> : null}
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={color} style={icon === 'play' ? { marginLeft: 2 } : undefined} />
    </V2Pressable>
  );
});

// ─── Шапки ───────────────────────────────────────────────────────────────────

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
  testID?: string;
};

/** «‹ Отрицание с To Be / Теория к уроку … ⋯» — заголовок рядом со стрелкой. */
export function V2ScreenHeader({ title, subtitle, onBack, backLabel = 'Back', right, testID }: ScreenHeaderProps) {
  const p = useV2Palette();
  const s = useScaledTextStyles(styles);
  return (
    <View testID={testID} style={s.header}>
      {onBack ? <V2IconButton icon="chevron-back" onPress={onBack} accessibilityLabel={backLabel} testID={testID ? `${testID}-back` : undefined} /> : null}
      <View style={s.headerCopy}>
        {title ? <Text accessibilityRole="header" style={[s.headerTitle, { color: p.text }]}>{title}</Text> : null}
        {subtitle ? <Text style={[s.headerSubtitle, { color: p.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {right ?? <View style={{ width: onBack ? V2.iconButton : 0 }} />}
    </View>
  );
}

/** Крупный заголовок экрана («Карточки», «Диалоги») с подписью. */
// зачем (dialogs-003, координатор 13.10): `subtitleHidden` — хаб «Диалоги» прячет подзаголовок, пока открыта категория (образец №4); подзаголовок снимается из потока, лента сдвигается layout-анимацией хоста.
export function V2LargeTitle({ title, subtitle, right, subtitleHidden = false }: { title: string; subtitle?: string; right?: React.ReactNode; subtitleHidden?: boolean }) {
  const p = useV2Palette();
  const s = useScaledTextStyles(styles);
  return (
    <View style={s.largeTitleRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text accessibilityRole="header" style={[s.largeTitle, { color: p.text }]}>{title}</Text>
        {subtitle && !subtitleHidden ? <Text style={[s.largeSubtitle, { color: p.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** «Лучшее у сообщества ……… Смотреть все ›» */
export function V2SectionHeader({ title, actionLabel, onAction, count }: { title: string; actionLabel?: string; onAction?: () => void; count?: number }) {
  const p = useV2Palette();
  const s = useScaledTextStyles(styles);
  return (
    <View style={s.sectionRow}>
      <Text accessibilityRole="header" style={[s.sectionTitle, { color: p.text }]}>
        {title}
        {typeof count === 'number' ? <Text style={{ color: p.textMuted, fontWeight: '600' }}>{`  ${count}`}</Text> : null}
      </Text>
      {actionLabel && onAction ? (
        <V2Pressable onPress={onAction} accessibilityLabel={actionLabel} scaleTo={0.95} hitSlop={8} style={s.sectionAction}>
          {/* зачем (темы 2.0): ссылка в цвете темы в «Акценте/Максимуме»; в «Спокойно» link = textSecondary. */}
          <Text style={[s.sectionActionText, { color: p.link }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={15} color={p.link} />
        </V2Pressable>
      ) : null}
    </View>
  );
}

// ─── Строка ──────────────────────────────────────────────────────────────────

type RowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** Круг вместо квадрата у значка (строки урока на референсе). */
  iconShape?: 'square' | 'circle';
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  badge?: string;
  chevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Раздел временно недоступен: строка приглушена, но нажимается (покажет причину). */
  dimmed?: boolean;
  seed?: number;
  testID?: string;
  disabled?: boolean;
  /** Строка без стекла — внутри уже стеклянной карточки. */
  flat?: boolean;
};

export const V2Row = memo(function V2Row({ title, subtitle, icon, iconShape = 'square', leading, trailing, badge, chevron = true, onPress, onLongPress, dimmed, seed = 0, testID, disabled, flat }: RowProps) {
  const p = useV2Palette();
  const s = useScaledTextStyles(styles);
  const content = (
    <>
      {leading ?? (icon ? <V2IconTile name={icon} shape={iconShape} size={V2.rowIcon} iconSize={21} /> : null)}
      <View style={s.rowCopy}>
        <Text style={[s.rowTitle, { color: disabled ? p.textSecondary : p.text }]}>{title}</Text>
        {subtitle ? <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {badge ? <V2Badge label={badge} /> : null}
      {trailing}
      {chevron && onPress ? <Ionicons name="chevron-forward" size={20} color={p.textSecondary} /> : null}
    </>
  );
  if (flat) {
    return onPress ? (
      <V2Pressable testID={testID} onPress={onPress} disabled={disabled} scaleTo={0.98} accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} style={s.rowFlat}>
        {content}
      </V2Pressable>
    ) : <View testID={testID} style={s.rowFlat}>{content}</View>;
  }
  return (
    <V2Card seed={seed} onPress={onPress} onLongPress={onLongPress} disabled={disabled} testID={testID} accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} radius={V2.radius.row} style={[s.row, dimmed || disabled ? { opacity: 0.5 } : null]}>
      {content}
    </V2Card>
  );
});

// ─── Кнопки ──────────────────────────────────────────────────────────────────

type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** primary — светлая «Тренироваться с карточками», accent — шампань «Добавить себе»,
   *  secondary — контурная пилюля «Продолжить ›», ghost — текстовая. */
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost';
  icon?: IconName;
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  disabled?: boolean;
  size?: 'large' | 'small';
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export const V2Button = memo(function V2Button({ label, onPress, variant = 'primary', icon, iconPosition = 'trailing', loading, disabled, size = 'large', testID, style }: ButtonProps) {
  const p = useV2Palette();
  const s = useScaledTextStyles(styles);
  const g = useShadowGlass();
  const height = size === 'large' ? V2.cta.height : 40;
  const fg = variant === 'primary' || variant === 'accent' ? p.ctaText : p.text;
  const bg = variant === 'primary' ? p.cta : variant === 'accent' ? p.accentFill : 'transparent';
  const iconNode = icon ? <Ionicons name={icon} size={size === 'large' ? 20 : 17} color={fg} /> : null;
  return (
    <V2Pressable
      testID={testID}
      accessibilityLabel={label}
      accessibilityState={{ busy: !!loading }}
      onPress={loading ? undefined : onPress}
      disabled={disabled}
      scaleTo={0.97}
      style={[
        s.button,
        { minHeight: height, paddingVertical: 6, borderRadius: height / 2, backgroundColor: bg, opacity: disabled ? 0.45 : 1 },
        // зачем (стиль «Тень»): кнопка действия — цветная тень; второстепенная вместо контура — плашка с малой тенью.
        variant === 'primary' || variant === 'accent' ? { boxShadow: actionBoxShadow(g) } : null,
        variant === 'secondary' ? { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) } : null,
        size === 'small' ? { paddingHorizontal: 16 } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {iconPosition === 'leading' ? iconNode : null}
          {/* зачем (text-integrity, 01.10): подписи не обрезаем многоточием — длинные de/fr/es переносятся. */}
          <Text style={[size === 'large' ? s.buttonLabel : s.buttonLabelSmall, { color: fg, flexShrink: 1, textAlign: 'center' }]}>{label}</Text>
          {iconPosition === 'trailing' ? iconNode : null}
        </>
      )}
    </V2Pressable>
  );
});

// ─── Мелочи ──────────────────────────────────────────────────────────────────

export const V2Badge = memo(function V2Badge({ label, tone = 'glass' }: { label: string; tone?: 'glass' | 'outline' }) {
  const p = useV2Palette();
  const g = useShadowGlass();
  const s = useScaledTextStyles(styles);
  return (
    <View
      style={[s.badge, tone === 'glass' ? { backgroundColor: p.control } : { backgroundColor: g.dividerTone }]} // стиль «Тень»: контурный бейдж — тоном, без обводки
    >
      <Text style={[s.badgeText, { color: p.text, flexShrink: 1 }]}>{label}</Text>
    </View>
  );
});

export const V2ProgressBar = memo(function V2ProgressBar({ value, style }: { value: number; style?: StyleProp<ViewStyle> }) {
  const p = useV2Palette();
  const ratio = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }} style={[styles.track, { backgroundColor: p.track }, style]}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: p.progressFill }]} />
    </View>
  );
});

export function V2SearchField(props: TextInputProps & { onFilterPress?: () => void; filterLabel?: string }) {
  const p = useV2Palette();
  const s = useScaledTextStyles(styles);
  const glass = useV2GlassStyle();
  const { onFilterPress, filterLabel = 'Filter', style, ...input } = props;
  return (
    <View style={s.searchRow}>
      <View style={[s.search, glass]}>
        <Ionicons name="search-outline" size={19} color={p.textSecondary} />
        <TextInput
          accessibilityLabel={input.accessibilityLabel ?? input.placeholder}
          placeholderTextColor={p.textMuted}
          style={[s.searchInput, { color: p.text }, style]}
          maxFontSizeMultiplier={1.2}
          {...input}
        />
      </View>
      {onFilterPress ? (
        <V2Pressable onPress={onFilterPress} accessibilityLabel={filterLabel} scaleTo={0.94} style={[s.searchFilter, glass]}>
          <Ionicons name="options-outline" size={20} color={p.text} />
        </V2Pressable>
      ) : null}
    </View>
  );
}

/** «Небольшой совет» / «ГЛАВНОЕ ПРАВИЛО»: плашка-значок + оверлайн + текст. */
export function V2InfoCard({ icon, overline, title, body, onPress, seed = 2 }: { icon: IconName; overline?: string; title?: string; body?: React.ReactNode; onPress?: () => void; seed?: number }) {
  const p = useV2Palette();
  const s = useScaledTextStyles(styles);
  return (
    <V2Card seed={seed} onPress={onPress} style={s.info}>
      <V2IconTile name={icon} size={52} iconSize={24} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {overline ? <Text style={[s.overline, { color: p.textMuted }]}>{overline.toUpperCase()}</Text> : null}
        {title ? <Text style={[s.infoTitle, { color: p.text }]}>{title}</Text> : null}
        {body ? (typeof body === 'string' ? <Text style={[s.infoBody, { color: p.textSecondary }]}>{body}</Text> : body) : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={20} color={p.textSecondary} /> : null}
    </V2Card>
  );
}

export type V2Stat = Readonly<{ icon: IconName; label: string; value: string }>;

/** «Урок 8 из 12 | Карточек 50 | Время ~12 мин | Сложность Легко» */
export function V2StatStrip({ stats }: { stats: readonly V2Stat[] }) {
  const p = useV2Palette();
  const s = useScaledTextStyles(styles);
  return (
    <View style={s.statStrip}>
      {stats.map((stat, i) => (
        <React.Fragment key={stat.label}>
          {i > 0 ? <View style={[s.statDivider, { backgroundColor: p.divider }]} /> : null}
          <View style={s.stat} accessible accessibilityLabel={`${stat.label}: ${stat.value}`}>
            <Ionicons name={stat.icon} size={22} color={p.iconTint} />
            <View style={{ minWidth: 0, flexShrink: 1 }}>
              <Text style={[s.statLabel, { color: p.textSecondary }]}>{stat.label}</Text>
              <Text style={[s.statValue, { color: p.text }]}>{stat.value}</Text>
            </View>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

type AnswerState = 'idle' | 'correct' | 'wrong' | 'dimmed';

/** Вариант ответа в тренировках — контур, текст по центру (референс «Блиц»). */
export const V2AnswerOption = memo(function V2AnswerOption({ label, onPress, state = 'idle', disabled, testID }: { label: string; onPress?: () => void; state?: AnswerState; disabled?: boolean; testID?: string }) {
  const p = useV2Palette();
  const g = useShadowGlass();
  const s = useScaledTextStyles(styles);
  // зачем (стиль «Тень»): ожидающий вариант — плашка с тенью, без контура; кольцо остаётся только у ИСХОДА ответа (верно/неверно) — это индикатор состояния.
  const resolved = state === 'correct' || state === 'wrong';
  const border = state === 'correct' ? p.correct : p.wrong;
  const bg = state === 'correct' ? `${p.correct}22` : state === 'wrong' ? `${p.wrong}22` : g.plateFillFrom;
  return (
    <V2Pressable
      testID={testID}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.98}
      style={[s.answer, resolved ? { borderWidth: 1, borderColor: border } : { boxShadow: nestedBoxShadow(g) }, { backgroundColor: bg, opacity: state === 'dimmed' ? 0.45 : 1 }]} // guard-ok: D43 кольцо исхода ответа (семантика верно/неверно) shadow-ok: кольцо исхода ответа — семантика, не контейнер
    >
      <Text style={[s.answerText, { color: p.text }]}>{label}</Text>
    </V2Pressable>
  );
});

/** Каркас нижней шторки: ручка, заголовок + подпись, ✕. Сам лист — стекло. */
export function V2SheetFrame({ title, subtitle, onClose, closeLabel = 'Close', children, bottomInset = 0 }: { title?: string; subtitle?: string; onClose?: () => void; closeLabel?: string; children: React.ReactNode; bottomInset?: number }) {
  const p = useV2Palette();
  const s = useScaledTextStyles(styles);
  return (
    <View
      style={[s.sheet, { backgroundColor: p.sheet, paddingBottom: 16 + bottomInset }]}
    >
      <V2GlassSheen seed={2} />
      <View style={[s.grabber, { backgroundColor: p.textMuted }]} />
      {title || onClose ? (
        <View style={s.sheetHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {title ? <Text accessibilityRole="header" style={[s.sheetTitle, { color: p.text }]}>{title}</Text> : null}
            {subtitle ? <Text style={[s.sheetSubtitle, { color: p.textSecondary }]}>{subtitle}</Text> : null}
          </View>
          {onClose ? <V2IconButton icon="close" onPress={onClose} accessibilityLabel={closeLabel} /> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// зачем (FONTSCALE2, координатор 05.10): при крупном системном шрифте межстрочный растёт вместе с ним, иначе низ букв
// срезается; шрифт не сжимаем. При 1.0 useScaledTextStyles отдаёт ЭТОТ ЖЕ объект — вид по макету без изменений.
const styles = StyleSheet.create({
  round: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: V2.iconButton + 8 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4 },
  headerSubtitle: { ...V2_TYPE.body, marginTop: 1 },
  largeTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  largeTitle: { ...V2_TYPE.largeTitle },
  largeSubtitle: { ...V2_TYPE.body, marginTop: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  sectionTitle: { ...V2_TYPE.section, flexShrink: 1 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  row: { minHeight: V2.rowMinHeight + 6, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowFlat: { minHeight: V2.rowMinHeight, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  rowSubtitle: { ...V2_TYPE.subtitle, marginTop: 3 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  buttonLabel: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  buttonLabelSmall: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  badge: { minWidth: 34, minHeight: 28, maxWidth: '100%', paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 13, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: V2.progress.height, borderRadius: V2.progress.height / 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: V2.progress.height / 2, minWidth: V2.progress.height * 2 },
  searchRow: { flexDirection: 'row', gap: 10 },
  search: { flex: 1, minHeight: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  searchFilter: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  overline: { ...V2_TYPE.overline, marginBottom: 4 },
  infoTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', marginBottom: 4 },
  infoBody: { ...V2_TYPE.subtitle, lineHeight: 20 },
  statStrip: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  statDivider: { width: 1, height: 30, marginHorizontal: 8 },
  statLabel: { ...V2_TYPE.caption, fontSize: 13 },
  statValue: { fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 1 },
  answer: { minHeight: 58, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  answerText: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  sheet: { borderTopLeftRadius: V2.radius.sheet, borderTopRightRadius: V2.radius.sheet, overflow: 'hidden', paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, opacity: 0.6, marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16, paddingHorizontal: 4 },
  sheetTitle: { fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.4 },
  sheetSubtitle: { ...V2_TYPE.body, marginTop: 6 },
});
