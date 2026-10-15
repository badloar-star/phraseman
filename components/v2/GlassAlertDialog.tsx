// ─── Стеклянное окно-сообщение 2.0 — overlays-runtime.html `.or-alert` ──────────
// зачем (Сверка overlays-runtime, 05.10): в макете ВСЕ runtime-сообщения («Скоро», «Напоминание
// установлено», ворота французского, «Покупка ждёт подтверждения», ошибки имени) — окно ПО ЦЕНТРУ:
// поля 24, r25, кромка --line-2, поля 20; необязательная плитка 68 (r23) со значком; заголовок 23/29
// по центру; текст --sec (D145: 16/22) через 9; кнопки через 18 — в ряд, а если хоть одна подпись
// длиннее 18 знаков — столбиком (`.or-actions.stack`); высота 44. Раньше окна с одной кнопкой
// выезжали шторкой выбора снизу со стрелкой «›» у «Закрыть».
//
// GlassAlertCard — сама карточка (обычный View): её же рисует GlassInlineAlert внутри уже открытой
// модалки, где второй <Modal> на iOS ломает стек презентаций. GlassAlertDialog — карточка в
// оболочке HybridAlertShell (по центру, затемнение .62 как `.or-dim`).
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { hapticTap, hapticWarning } from '../../hooks/use-haptics';
import { useLineScale } from '../../hooks/useLineScale';
import HybridAlertShell from '../modal_fx/HybridAlertShell';
import { useTheme } from '../ThemeContext';
import { KitGlassLayer } from './KitLiquidGlass';
import { actionBoxShadow, nestedBoxShadow, plateBoxShadow } from './ShadowSurface';
import { ThemeAccentFill } from './ThemeAccentFill';

const EXEMPT_COLOR_1 = 'rgba(0,0,0,0.62)'; // theme-exempt: затемнение и тень окна — тёмный скрим/чёрная тень в любой теме
const EXEMPT_COLOR_2 = '#000000'; // theme-exempt: затемнение и тень окна — тёмный скрим/чёрная тень в любой теме

export type GlassAlertAction = Readonly<{
  label: string;
  onPress: () => void;
  /** `.cta.gh` — прозрачная с кромкой; иначе белая главная. */
  ghost?: boolean;
  /** Необратимое действие: та же белая кнопка, предупреждающая вибрация. */
  destructive?: boolean;
}>;

export type GlassAlertCardProps = Readonly<{
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actions: readonly GlassAlertAction[];
  testID?: string;
}>;

// `.or-actions.stack`: столбик, когда хоть одна подпись длиннее 18 знаков.
const STACK_LABEL_CHARS = 18;
// зачем (Макеты №30, координатор 13.10): «Не восстанавливать» (17 знаков) на 360 dp не влезает в половину ряда уже при обычном
// шрифте, при ×1,3 рвётся посреди слова — столбиком ещё и при крупном системном шрифте или длинном СЛОВЕ в любой подписи.
const STACK_FONT_SCALE = 1.15;
const STACK_WORD_CHARS = 10;

function longestWordLength(labels: readonly string[]): number {
  return labels.reduce((max, label) => Math.max(max, ...label.split(/\s+/u).map((word) => word.length)), 0);
}

export const GlassAlertCard = memo(function GlassAlertCard({ title, message, icon, actions, testID }: GlassAlertCardProps) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const lh = useLineScale();
  // зачем: защита от двойного тапа — обработчик кнопки срабатывает один раз на показ карточки.
  const settledRef = useRef(false);
  const { fontScale } = useWindowDimensions();
  const labelTooLong = actions.some((a) => a.label.length > STACK_LABEL_CHARS);
  const longestWord = longestWordLength(actions.map((a) => a.label));
  const stackReason = labelTooLong ? 'label' : fontScale > STACK_FONT_SCALE ? 'font_scale' : longestWord > STACK_WORD_CHARS ? 'long_word' : 'none';
  const stack = stackReason !== 'none';
  useEffect(() => {
    if (__DEV__ && actions.length > 1) console.log(`[GLASS-ALERT-LAYOUT] fontScale=${fontScale.toFixed(2)} longestWord=${longestWord} layout=${stack ? 'stack' : 'row'} reason=${stackReason} title=${title.slice(0, 40)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stackReason, fontScale, longestWord]);
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: glass.opaqueSheet, boxShadow: plateBoxShadow(glass) }]}>{/* стиль «Тень»: окно без кромки, с тенью */}
      <KitGlassLayer radius={25} />
      {icon ? (
        <View style={[styles.stage, { backgroundColor: glass.opaqueControl }]}>
          <Ionicons name={icon} size={26} color={glass.text} />
        </View>
      ) : null}
      <Text accessibilityRole="header" style={[styles.title, { color: glass.text, lineHeight: lh(29) }]}>{title}</Text>
      {message ? <Text style={[styles.body, { color: glass.secondary, lineHeight: lh(22) }]}>{message}</Text> : null}
      {actions.length > 0 ? (
        <View style={[styles.actions, stack ? styles.actionsStack : null]}>
          {actions.map((a, i) => (
            <Pressable
              key={`${i}:${a.label}`}
              // зачем (координатор 12.10, английский проход): нажатие по номеру кнопки, а не по тексту — работает на любом языке
              testID={`glass-alert-action-${i}`}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => {
                if (settledRef.current) return;
                settledRef.current = true;
                if (a.destructive) hapticWarning(); else hapticTap();
                a.onPress();
              }}
              style={({ pressed }) => [
                styles.cta,
                stack ? null : styles.ctaRow,
                // зачем (владелец 13.10, №35 «никакие кнопки чтобы не сливались»): заливки кнопок — токены кнопок темы: вторичная buttonFill (≥ 1,6 : 1 к шторке), опасная dangerFill
                // со своей подписью dangerInk (≥ 4,5 : 1), главная ctaFill; прежняя вторичная на opaqueControl давала 1,18–1,3 : 1 к шторке.
                a.destructive && !a.ghost
                  ? { backgroundColor: glass.dangerFill, boxShadow: nestedBoxShadow(glass) }
                  : a.ghost
                  // зачем (стиль «Тень»): второстепенная кнопка `.cta.gh` — плашка с малой тенью вместо контура.
                  ? { backgroundColor: glass.buttonFill, boxShadow: nestedBoxShadow(glass) }
                  : { backgroundColor: glass.ctaFill, boxShadow: actionBoxShadow(glass) },
                { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
              ]}
            >
              {a.ghost || a.destructive ? null : <ThemeAccentFill glass={glass} radius={22} />}
              <Text numberOfLines={2} style={[styles.ctaText, { color: a.destructive && !a.ghost ? glass.dangerInk : a.ghost ? glass.text : glass.ctaFillInk }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
});

type DialogProps = GlassAlertCardProps & Readonly<{
  visible: boolean;
  /** Назад / тап по фону. Не передан — окно нельзя закрыть мимо кнопок (`.or-alert` без отмены). */
  onRequestClose?: () => void;
}>;

function GlassAlertDialogBase({ visible, onRequestClose, ...card }: DialogProps) {
  // зачем: новая карточка на каждое открытие (сброс защиты от двойного тапа), но при закрытии
  // карточка остаётся смонтированной — оболочка доигрывает анимацию выхода с содержимым.
  const openSeqRef = useRef(0);
  const wasVisibleRef = useRef(false);
  if (visible && !wasVisibleRef.current) openSeqRef.current += 1;
  wasVisibleRef.current = visible;
  return (
    <HybridAlertShell
      visible={visible}
      onRequestClose={onRequestClose ?? noop}
      placement="center"
      backdropColor={EXEMPT_COLOR_1}
      shadowColor={EXEMPT_COLOR_2}
      testID={card.testID ? `${card.testID}-shell` : 'glass-alert-dialog'}
    >
      {/* ключ и по тексту: очередь окон может сменить сообщение, не закрывая окно */}
      <GlassAlertCard key={`${openSeqRef.current}:${card.title}:${card.message ?? ''}`} {...card} />
    </HybridAlertShell>
  );
}

function noop(): void {
  // Окно без отмены: закрывается только кнопкой (стадии аккаунта и т.п.).
}

export const GlassAlertDialog = memo(GlassAlertDialogBase);

const styles = StyleSheet.create({
  // `.or-alert`: поля 20, r25, тень вместо кромки (стиль «Тень»), фон --sheet; ширину (поля 24) даёт оболочка.
  card: { width: '100%', alignSelf: 'center', borderRadius: 25, padding: 20, overflow: 'hidden' },
  // `.or-stage`: 68, r23, --tile, 15 до заголовка.
  stage: { width: 68, height: 68, borderRadius: 23, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  // `.or-title` 23/29 780.
  title: { fontSize: 23, fontWeight: '800', textAlign: 'center' },
  // `.or-body` 14/21 через 9 → шкала D145 16/22.
  body: { fontSize: 16, textAlign: 'center', marginTop: 9 },
  // `.or-actions`: сетка в ряд, зазор 9, 18 от текста.
  // зачем (Макеты 854d5866c, №35): зазор между кнопками ≥ 12 (было 9)
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  actionsStack: { flexDirection: 'column' },
  // `.or-actions .cta`: 44, поля 12 (подпись 14 → D145 16).
  cta: { minHeight: 44, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ctaRow: { flex: 1, minWidth: 0 },
  ctaText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
