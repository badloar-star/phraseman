/**
 * ReferralLadder — «Лесенка приглашений» вместо рулетки Plus (владелец 29.10; макет v3 QTcHjbVMPK64SWmobt1Vig).
 *
 * зачем: понятные ступени вместо скрытых шансов — «друг прошёл первый урок = 500 монет обоим» и «каждые трое = Plus на 14 дней», прогресс «x из 3».
 * Компонент ТОЛЬКО показывает: данные приходят готовыми из модели (app/referral_ladder_model.ts) — своих запросов, подписок и таймеров нет, поэтому
 * экран открывается из кэша приглашений мгновенно и без спиннеров. Кнопок «забрать» нет — награды выдаёт сервер. Копирование кода и «Поделиться»
 * живут в экране (там уже есть мгновенная галочка с откатом и защита от двойного тапа) и приходят сюда колбэками.
 * Разметка по макету: шапка (значок 52, заголовок 20/25), две строки-ступени тоном opaqueCard r18 (кружок 32, текст 15/20, справа «n из 3»),
 * полоса 8 px, код, «Поделиться кодом», «Как это работает». Без обводок: контейнеры разделены тоном.
 */
import React, { memo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import KitTouchable from './KitTouchable';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import type { Lang } from '../constants/i18n';
import type { ReferralLadderView } from '../app/referral_ladder_model';
import { referralLadderText } from './referral_ladder_strings';

export type ReferralLadderProps = Readonly<{
  view: ReferralLadderView;
  /** Вкладка «Друзья»: оставляет только заголовок, код и действия; правила раскрываются в «Как это работает». */
  compactFriends?: boolean;
  /** Код приглашения; null — ещё готовится (поле не рисуется, кнопка «Поделиться» остаётся: экран сам скажет «код готовится»). */
  code: string | null;
  codeCopied: boolean;
  shareBusy: boolean;
  onCopy: () => void;
  onShare: () => void;
  onHow: () => void;
}>;

function Step({ done, num, text, right, testID }: Readonly<{ done: boolean; num: number; text: string; right?: string; testID: string }>) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: glass.opaqueCard, marginTop: 8 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? glass.accent : glass.opaqueControl }}>
        {done
          ? <Ionicons name="checkmark" size={16} color={glass.accentInk} />
          : <Text style={{ color: glass.text, fontSize: 14, fontWeight: '700' }}>{num}</Text>}
      </View>
      <Text style={{ flex: 1, minWidth: 0, color: glass.text, fontSize: 15, lineHeight: 20, fontWeight: '700' }}>{text}</Text>
      {right ? <Text style={{ color: done ? glass.accentTextSafe : glass.secondary, fontSize: 13, fontWeight: '700' }}>{right}</Text> : null}{/* guard-ok: метка прогресса «n из 3» справа в строке — по утверждённому макету v3 (.rt 13/700), не подпись под названием */}
    </View>
  );
}

function ReferralLadder({ view, compactFriends = false, code, codeCopied, shareBusy, onCopy, onShare, onHow }: ReferralLadderProps) {
  const { liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const L = lang as Lang;
  const coins = view.coinsPerFriend;
  const days = view.plusDays;
  const step1 = view.step1Done
    ? (view.counted === 1 && view.firstName
      ? referralLadderText(L, 'step1One', { name: view.firstName, coins })
      : referralLadderText(L, 'step1Counted', { n: view.counted, coins }))
    : referralLadderText(L, 'step1Empty', { coins });
  const step2 = view.step2Done ? referralLadderText(L, 'step2Done', { days }) : referralLadderText(L, 'step2', { days });
  const progressLabel = view.step2Done ? undefined : referralLadderText(L, 'progress', { n: view.cycle, need: view.friendsPerGrant });
  return (
    <View testID="referral-ladder" style={{ paddingTop: 6 }}>
      <View style={{ alignItems: 'center', marginBottom: compactFriends ? 0 : 14 }}>
        {compactFriends ? null : (
          <View testID="referral-ladder-header-icon" style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, marginBottom: 12 }}>
            <Ionicons name="people-outline" size={24} color={glass.text} />
          </View>
        )}
        <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 20, lineHeight: 25, fontWeight: '700', textAlign: 'center' }}>
          {referralLadderText(L, 'title')}
        </Text>
      </View>
      {compactFriends ? null : (
        <>
          <Step testID="referral-ladder-step-1" done={view.step1Done} num={1} text={step1} />
          <Step testID="referral-ladder-step-2" done={view.step2Done} num={2} text={step2} right={progressLabel} />
          {view.step2Done ? null : (
            <View testID="referral-ladder-bar" style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2 }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: glass.opaqueControl, overflow: 'hidden' }}>
                <View style={{ width: `${view.progressPct}%`, height: 8, borderRadius: 4, backgroundColor: glass.accentGraphic }} />
              </View>
            </View>
          )}
          {view.capReached ? (
            <Text testID="referral-ladder-cap" style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, marginTop: 10, textAlign: 'center' /* guard-ok: состояние «месячный потолок исчерпан» (Ядро 29.10), не расшифровка названия */ }}>
              {referralLadderText(L, 'capNote', { m: view.monthCounted, cap: view.monthlyCap })}
            </Text>
          ) : null}
        </>
      )}
      {code ? (
        <KitTouchable
          testID="referral-ladder-code"
          accessibilityRole="button"
          accessibilityLabel={referralLadderText(L, 'copyCode')}
          activeOpacity={0.84}
          onPress={onCopy}
          style={{ marginTop: 16, marginBottom: 4, minHeight: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: glass.opaqueCard }}
        >
          <Text style={{ color: glass.accentTextSafe, fontSize: 20, fontWeight: '700', letterSpacing: 3 }} maxFontSizeMultiplier={1.2}>{code}</Text>
          <Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={20} color={glass.accentTextSafe} />
        </KitTouchable>
      ) : <View style={{ height: 12 }} />}
      <KitTouchable
        testID="referral-ladder-share"
        accessibilityRole="button"
        accessibilityState={{ disabled: shareBusy }}
        activeOpacity={0.84}
        disabled={shareBusy}
        onPress={onShare}
        style={{ minHeight: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: glass.cta, opacity: shareBusy ? 0.7 : 1 }}
      >
        <Ionicons name="share-outline" size={19} color={glass.ctaInk} />
        <Text style={{ color: glass.ctaInk, fontSize: 16, fontWeight: '700' }}>{referralLadderText(L, 'shareCode')}</Text>
      </KitTouchable>
      <KitTouchable
        testID="referral-ladder-how"
        accessibilityRole="button"
        activeOpacity={0.84}
        onPress={onHow}
        style={{ marginTop: 8, minHeight: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: glass.opaqueControl }}
      >
        <Ionicons name="information-circle-outline" size={19} color={glass.text} />
        <Text style={{ color: glass.text, fontSize: 16, fontWeight: '700' }}>{referralLadderText(L, 'how')}</Text>
      </KitTouchable>
    </View>
  );
}

export default memo(ReferralLadder);
