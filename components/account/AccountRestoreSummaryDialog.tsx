// AccountRestoreSummaryDialog.tsx — «Восстановить аккаунт?» со сводкой, макет docs/design/v2-app/account-delete-variant-b.html §3.
// зачем (владелец «Да, так»; координатор 25.10): человек, передумавший удалять аккаунт, видит, что всё на месте — заголовок и
// текст слева, плашка «серия · фразы · уроки», «Восстановить» главной кнопкой сверху, «Не восстанавливать» под ней.
// Цифр нет (старый сервер, сбой) — плашка скрыта. Та же оболочка, токены и защита от двойного тапа, что у GlassAlertDialog.
import React, { memo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { hapticTap } from '../../hooks/use-haptics';
import { useLineScale } from '../../hooks/useLineScale';
import HybridAlertShell from '../modal_fx/HybridAlertShell';
import { useTheme } from '../ThemeContext';
import { KitGlassLayer } from '../v2/KitLiquidGlass';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../v2/ShadowSurface';
import { ThemeAccentFill } from '../v2/ThemeAccentFill';

const EXEMPT_COLOR_2 = '#000000'; // theme-exempt: затемнение и тень окна — тёмный скрим/чёрная тень в любой теме

export type AccountRestoreSummaryAction = Readonly<{ label: string; ghost?: boolean; onPress: () => void }>;

type CardProps = Readonly<{
  title: string;
  message: string;
  cells: readonly Readonly<{ value: string; label: string }>[] | null;
  actions: readonly AccountRestoreSummaryAction[];
}>;

const AccountRestoreSummaryCard = memo(function AccountRestoreSummaryCard({ title, message, cells, actions }: CardProps) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const lh = useLineScale();
  // зачем: защита от двойного тапа — кнопка срабатывает один раз на показ карточки.
  const settledRef = useRef(false);
  // Главная кнопка сверху, как в макете: сначала не-ghost, потом ghost.
  const ordered = [...actions.filter((a) => !a.ghost), ...actions.filter((a) => a.ghost)];
  return (
    <View testID="account-restore-summary" style={[styles.card, { backgroundColor: glass.opaqueSheet, boxShadow: plateBoxShadow(glass) }]}>
      <KitGlassLayer radius={25} />
      <Text accessibilityRole="header" style={[styles.title, { color: glass.text, lineHeight: lh(29) }]}>{title}</Text>
      <Text style={[styles.body, { color: glass.secondary, lineHeight: lh(22) }]}>{message}</Text>
      {cells && cells.length > 0 ? (
        // зачем (стиль «Тень», Ревизор 26.10): плашка — заливка PlateFill и тень plateBoxShadow, без обводки; разделители ячеек —
        // узкие View (как велит сторож «Тени»: линия — размером View, не рамкой).
        <View testID="account-restore-summary-cells" style={[styles.plaque, { boxShadow: plateBoxShadow(glass) }]}>
          <PlateFill g={glass} radius={16} />
          {cells.map((cell, index) => (
            <React.Fragment key={cell.label}>
              {index > 0 ? <View style={[styles.cellDivider, { backgroundColor: glass.mutedText }]} /> : null}
              <View accessible accessibilityLabel={`${cell.value} ${cell.label}`} style={styles.cell}>
                <Text style={[styles.cellValue, { color: glass.text }]}>{cell.value}</Text>
                <Text style={[styles.cellLabel, { color: glass.secondary, textAlign: 'center' }]}>{cell.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      ) : null}
      <View style={styles.actions}>
        {ordered.map((a, i) => (
          <Pressable
            key={`${i}:${a.label}`}
            testID={a.ghost ? 'account-restore-decline' : 'account-restore-confirm'}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            onPress={() => {
              if (settledRef.current) return;
              settledRef.current = true;
              hapticTap();
              a.onPress();
            }}
            style={({ pressed }) => [
              styles.cta,
              a.ghost
                ? { backgroundColor: glass.buttonFill, boxShadow: nestedBoxShadow(glass) }
                : { backgroundColor: glass.ctaFill, boxShadow: actionBoxShadow(glass) },
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
            ]}
          >
            {a.ghost ? null : <ThemeAccentFill glass={glass} radius={25} ink={glass.ctaFillInk} />}
            <Text style={[styles.ctaText, { color: a.ghost ? glass.text : glass.ctaFillInk }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

type DialogProps = CardProps & Readonly<{ visible: boolean; onRequestClose: () => void }>;

function AccountRestoreSummaryDialogBase({ visible, onRequestClose, ...card }: DialogProps) {
  // зачем (закон владельца 22.10, замер Тем 26.10): затемнение под окном — сильный скрим текущей темы, не постоянный чёрный 62 %.
  const { liquidGlassThemeId } = useTheme();
  const scrim = liquidGlassTokens(liquidGlassThemeId).scrimStrong;
  // зачем: новая карточка на каждое открытие (сброс защиты от двойного тапа); при закрытии остаётся — оболочка доигрывает выход.
  const openSeqRef = useRef(0);
  const wasVisibleRef = useRef(false);
  if (visible && !wasVisibleRef.current) openSeqRef.current += 1;
  wasVisibleRef.current = visible;
  return (
    <HybridAlertShell
      visible={visible}
      onRequestClose={onRequestClose}
      placement="center"
      backdropColor={scrim}
      shadowColor={EXEMPT_COLOR_2}
      testID="account-restore-summary-shell"
    >
      <AccountRestoreSummaryCard key={`${openSeqRef.current}:${card.title}`} {...card} />
    </HybridAlertShell>
  );
}

export const AccountRestoreSummaryDialog = memo(AccountRestoreSummaryDialogBase);

const styles = StyleSheet.create({
  card: { width: '100%', alignSelf: 'center', borderRadius: 25, padding: 20, overflow: 'hidden' },
  title: { fontSize: 23, fontWeight: '800' },
  body: { fontSize: 16, marginTop: 9 },
  // Плашка сводки: тон контрола, без кромки; ячейки поровну.
  plaque: { flexDirection: 'row', borderRadius: 16, paddingVertical: 12, marginTop: 16 },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 6 },
  cellDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', opacity: 0.6 },
  cellValue: { fontSize: 16, fontWeight: '800' },
  cellLabel: { fontSize: 13, marginTop: 2 },
  actions: { marginTop: 18, gap: 12 },
  cta: { minHeight: 50, borderRadius: 25, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ctaText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
