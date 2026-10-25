// ═══════════════════════════════════════════════════════════════════════════
// PaywallServerRefusedDock.tsx — низ окна Plus для входа «Не видим твой Plus» (вход «сервер отказал») + переключатель дока.
//
// зачем (координатор 25.10, срочно для OTA; Ядро c161d894a): сервер отказал «нужен Plus», а телефон считает Plus включённым.
// Человек почти наверняка уже платил — поэтому первой стоит «Восстановить покупки» (идёт / вернулся / не нашли), второй —
// «Оформить Plus», третьей — «Не сейчас». Цвета — только токены темы по карте docs/work/paywall-theme-token-map-2026-10-25.md:
// первая кнопка ctaFill/ctaFillInk (P12), вторая на плашке paywallPlateBg с text (P3), «Не сейчас» и строки secondary (P15/P2).
// Исход восстановления выводится из `restoring` и события premium_activated (handleRestore ничего не возвращает; тосты результата
// остаются). Обычное окно Plus не меняется: PaywallPlusDockSwitch отдаёт прежний PaywallPlusDock, если serverRefused = false.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ctaFillGradient } from '../../constants/accentFill';
import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { onAppEvent } from '../../app/events';
import { KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../../app/config';
import { openLegalLink } from '../../app/open_legal_link';
import { LinearGradient } from '../SafeLinearGradient';
import V2Pressable from '../v2/V2Pressable';
import { PaywallPlusDock } from './PaywallPlus';
import { paywallPlateBg } from './paywall_surfaces';
import { COPY, pick } from './PaywallPlusCopy';
import { paywallServerRefusedText } from './paywall_server_refused_copy';

type Glass = ReturnType<typeof liquidGlassTokens>;
export type RestoreOutcome = 'idle' | 'busy' | 'restored' | 'not_found';

const LOG = '[PAYWALL-SERVER-REFUSED]';

/** Исход восстановления: идёт → (вернулся | не нашли). Событие активации приходит до конца восстановления. */
export function useRestoreOutcome(restoring: boolean): RestoreOutcome {
  const [outcome, setOutcome] = useState<RestoreOutcome>('idle');
  const wasRestoringRef = useRef(false);
  const activatedRef = useRef(false);
  useEffect(() => {
    const subscription = onAppEvent('premium_activated', () => {
      activatedRef.current = true;
      setOutcome('restored');
      console.log(`${LOG} restore:activated`); // guard-ok: одна строка на возврат Plus
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (restoring) {
      wasRestoringRef.current = true;
      activatedRef.current = false;
      setOutcome('busy');
      return;
    }
    if (!wasRestoringRef.current) return;
    wasRestoringRef.current = false;
    const next: RestoreOutcome = activatedRef.current ? 'restored' : 'not_found';
    console.log(`${LOG} restore:finished`, JSON.stringify({ outcome: next })); // guard-ok: одна строка на конец восстановления
    setOutcome(next);
  }, [restoring]);
  return outcome;
}

type RefusedProps = Readonly<{
  lang: Lang;
  g: Glass;
  /** Подпись второй кнопки (с ценой, когда она есть). */
  label: string;
  purchasing: boolean;
  /** Идёт покупка или восстановление — кнопки заняты. */
  disabled: boolean;
  bottomInset: number;
  onPress: () => void;
  restoring: boolean;
  onRestore: () => void;
  onLater: () => void;
}>;

export const PaywallServerRefusedDock = memo(function PaywallServerRefusedDock({ lang, g, label, purchasing, disabled, bottomInset, onPress, restoring, onRestore, onLater }: RefusedProps) {
  const outcome = useRestoreOutcome(restoring);
  const restored = outcome === 'restored';
  const restoreLabel = outcome === 'busy' ? paywallServerRefusedText(lang, 'restoring')
    : restored ? paywallServerRefusedText(lang, 'restored')
    : paywallServerRefusedText(lang, 'restore');
  return (
    <View style={[S.dock, { paddingBottom: Math.max(bottomInset, 16) }]}>
      <V2Pressable
        testID="paywall-server-refused-restore"
        accessibilityRole="button"
        accessibilityLabel={restoreLabel}
        accessibilityState={{ disabled: disabled || restored, busy: outcome === 'busy' }}
        disabled={disabled || restored}
        onPress={onRestore}
        withHaptic={false}
        scaleTo={0.97}
        style={[S.cta, { backgroundColor: g.ctaFill, boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 26, color: `${g.ctaFill}4D` }] }]}
      >
        <LinearGradient pointerEvents="none" colors={[...ctaFillGradient(g)]} style={StyleSheet.absoluteFill} />
        <View style={S.ctaInner}>
          {outcome === 'busy' ? <ActivityIndicator color={g.ctaFillInk} /> : null}
          {restored ? <Ionicons name="checkmark-circle" size={22} color={g.ctaFillInk} /> : null}
          <Text style={[S.ctaText, { color: g.ctaFillInk }]}>{restoreLabel}</Text>
        </View>
      </V2Pressable>
      {outcome === 'not_found' ? (
        <Text testID="paywall-server-refused-status" accessibilityLiveRegion="polite" style={[S.status, { color: g.secondary }]}>{paywallServerRefusedText(lang, 'notFound')}</Text>
      ) : null}
      <V2Pressable
        testID="paywall-server-refused-purchase"
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, busy: purchasing }}
        disabled={disabled}
        onPress={onPress}
        withHaptic={false}
        scaleTo={0.97}
        style={[S.second, { backgroundColor: paywallPlateBg(g) }]}
      >
        {purchasing ? <ActivityIndicator color={g.text} /> : <Text style={[S.secondText, { color: g.text }]}>{label}</Text>}
      </V2Pressable>
      <V2Pressable testID="paywall-server-refused-later" accessibilityRole="button" accessibilityLabel={paywallServerRefusedText(lang, 'notNow')} withHaptic={false} scaleTo={0.95} onPress={onLater} style={S.later}>
        <Text style={[S.laterText, { color: g.secondary }]}>{paywallServerRefusedText(lang, 'notNow')}</Text>
      </V2Pressable>
      <View style={S.links}>
        <V2Pressable accessibilityRole="link" scaleTo={0.95} onPress={() => openLegalLink(KNOWLY_LEGAL_TERMS_URL, 'paywall_plus')} style={S.linkHit}>
          <Text style={[S.link, { color: g.mutedText }]}>{pick(lang, COPY.terms)}</Text>
        </V2Pressable>
        <V2Pressable accessibilityRole="link" scaleTo={0.95} onPress={() => openLegalLink(KNOWLY_LEGAL_PRIVACY_URL, 'paywall_plus')} style={S.linkHit}>
          <Text style={[S.link, { color: g.mutedText }]}>{pick(lang, COPY.privacy)}</Text>
        </V2Pressable>
      </View>
    </View>
  );
});

type DockProps = React.ComponentProps<typeof PaywallPlusDock>;

/** Переключатель дока: вариант «Не видим твой Plus» — свой низ окна; иначе прежний PaywallPlusDock без изменений. */
export const PaywallPlusDockSwitch = memo(function PaywallPlusDockSwitch(props: DockProps & Readonly<{ serverRefused: boolean; onLater: () => void }>) {
  const { serverRefused, onLater, ...dock } = props;
  if (!serverRefused) return <PaywallPlusDock {...dock} />;
  return (
    <PaywallServerRefusedDock
      lang={dock.lang}
      g={dock.g}
      label={dock.label}
      purchasing={dock.purchasing}
      disabled={dock.disabled}
      bottomInset={dock.bottomInset}
      onPress={dock.onPress}
      restoring={dock.restoring}
      onRestore={dock.onRestore}
      onLater={onLater}
    />
  );
});

const S = StyleSheet.create({
  dock: { paddingTop: 14, paddingHorizontal: 16 },
  cta: { minHeight: 58, borderRadius: 29, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ctaInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  status: { marginTop: 9, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  second: { marginTop: 10, minHeight: 52, borderRadius: 26, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  secondText: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  later: { marginTop: 4, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  linkHit: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  link: { fontSize: 13, lineHeight: 18 },
});
