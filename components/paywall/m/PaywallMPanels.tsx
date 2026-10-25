// ═══════════════════════════════════════════════════════════════════════════
// PaywallMPanels.tsx — короткие панели по месту входа пейвола «Вариант М»: энергия, серия, замок урока.
//
// зачем (макет 6dkmYjjEX3kCv2s1nuFT9B, владелец «Да, так», координатор 25.10): сначала панель про человека, по тапу — общий экран М. Панель открывается первым кадром, без сети и
// ожидания; всё считается на телефоне. Цвета — только токены темы по карте Тем (docs/work/paywall-m-context-theme-token-map-2026-10-25.md): молния плитки Plus — цвета надписи плитки
// (ink выбранного плана), кружки закрытых дней — ctaFill/ctaFillInk, значок щита — accentGraphic на accentSoft. «Не сейчас» / «Позже» всегда видно (у энергии это плитка «Подождать»).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../../constants/i18n';
import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';
import { useEnergyCountdown } from '../../EnergyContext';
import V2Pressable from '../../v2/V2Pressable';
import { LinearGradient } from '../../SafeLinearGradient';
import { planRowSelectedPaint } from '../paywallPlanRowPaint';
import { paywallPlateBg } from '../paywall_surfaces';
import { paywallServerRefusedText } from '../paywall_server_refused_copy';
import { useRestoreOutcome } from '../PaywallServerRefusedDock';
import { peekLearningV2LessonBankV1 } from '../../../app/learning_v2_lesson_phrase_bank_cache_v1';
import { useStudyTarget } from '../../StudyTargetContext';
import { paywallMText } from './paywall_m_copy';
import { PaywallMWorkshopPreviewBlock } from './PaywallMWorkshopPreview';
import { paywallMWorkshopPreview } from './paywall_m_workshop_preview';
import { semanticInk } from '../../../constants/liquidGlassSemanticInk';
import { PAYWALL_M_LIMITS, PAYWALL_M_TOTAL_LESSONS } from './paywall_m_model';
import { paywallMCorrectionParts, paywallMIsMissedDay, paywallMLessonProgress, type PaywallMWeekDay } from './paywall_m_panels';

type ShellProps = Readonly<{
  g: GlassTokens; kicker: string | null; title: string; children?: React.ReactNode; body?: string | null;
  ctaLabel?: string | null; onCta?: () => void; fine?: string | null; laterLabel?: string | null; onLater?: () => void; laterDisabled?: boolean; bottomInset: number;
}>;

/** Общая раскладка панели: строка над заголовком → заголовок → блок места → абзац → кнопка → цена → «Не сейчас». */
const Shell = memo(function Shell(p: ShellProps) {
  const { g } = p;
  return (
    <View testID="paywall-m-panel" style={[S.shell, { paddingBottom: Math.max(p.bottomInset, 14) }]}>
      {p.kicker ? <Text style={[S.kicker, { color: g.accentTextSafe }]}>{p.kicker}</Text> : null}
      <Text accessibilityRole="header" style={[S.title, { color: g.text }]}>{p.title}</Text>
      {p.children}
      {p.body ? <Text style={[S.body, { color: g.secondary }]}>{p.body}</Text> : null}
      {p.ctaLabel && p.onCta ? (
        <V2Pressable testID="paywall-m-panel-cta" accessibilityRole="button" accessibilityLabel={p.ctaLabel} onPress={p.onCta} withHaptic={false} scaleTo={0.97}
          style={[S.cta, { backgroundColor: g.ctaFill }]}>
          <Text style={[S.ctaText, { color: g.ctaFillInk }]}>{p.ctaLabel}</Text>
        </V2Pressable>
      ) : null}
      {p.fine ? <Text testID="paywall-fine" style={[S.fine, { color: g.secondary }]}>{p.fine}</Text> : null}
      {p.laterLabel && p.onLater ? (
        <V2Pressable testID="paywall-close" accessibilityRole="button" accessibilityLabel={p.laterLabel} disabled={p.laterDisabled} onPress={p.onLater} withHaptic={false} scaleTo={0.95}
          style={[S.later, { opacity: p.laterDisabled ? 0.5 : 1 }]}>
          <Text style={[S.laterText, { color: g.secondary }]}>{p.laterLabel}</Text>
        </V2Pressable>
      ) : null}
    </View>
  );
});

type CommonProps = Readonly<{ g: GlassTokens; lang: Lang; bottomInset: number; fine: string | null; onOpenFull: () => void; onLater: () => void; laterDisabled: boolean }>;

// ── энергия: две равные плитки ─────────────────────────────────────────────
export const PaywallMEnergyPanel = memo(function PaywallMEnergyPanel(p: CommonProps & Readonly<{ plusSub: string | null }>) {
  const { g, lang } = p;
  const { formattedTime } = useEnergyCountdown({ visible: true });
  const plate = paywallPlateBg(g);
  const paint = useMemo(() => planRowSelectedPaint(g), [g]);
  const plusTileStyle = useMemo(() => ({ backgroundColor: plate, borderColor: paint.edge }), [plate, paint.edge]); // guard-ok: рамка плитки Plus 1 px по карте Тем E7, исключение PhraseMan 2.0
  return (
    <Shell g={g} bottomInset={p.bottomInset} kicker={null /* зачем (Макеты 25.10): «N занятий подряд сегодня» — факт человека, а честного числа на устройстве нет; константа 5 врала бы — строку не показываем */} title={paywallMText(lang, 'mc.energy.title')}>
      <View style={S.tiles}>
        <V2Pressable testID="paywall-m-energy-wait" accessibilityRole="button" accessibilityLabel={paywallMText(lang, 'mc.energy.wait')} disabled={p.laterDisabled} onPress={p.onLater}
          withHaptic={false} scaleTo={0.97} outerStyle={S.tileCell} style={[S.tile, { backgroundColor: plate }]}>
          <Ionicons name="time-outline" size={20} color={g.secondary} />
          <Text style={[S.tileLabel, { color: g.text }]}>{paywallMText(lang, 'mc.energy.wait')}</Text>
          {formattedTime ? <Text style={[S.tileBig, { color: g.text }]}>{formattedTime}</Text> : null}
          <Text style={[S.tileSub, { color: g.secondary }]}>{paywallMText(lang, 'mc.energy.waitSub')}</Text>
        </V2Pressable>
        <V2Pressable testID="paywall-m-energy-plus" accessibilityRole="button" accessibilityLabel={`Plus ${paywallMText(lang, 'mc.energy.plusBig')}`} onPress={p.onOpenFull}
          withHaptic={false} scaleTo={0.97} outerStyle={S.tileCell} style={[S.tile, plusTileStyle]}>
          <LinearGradient pointerEvents="none" colors={paint.gradient} style={[StyleSheet.absoluteFill, S.tileFill]} />
          {/* зачем (карта Тем E6*): молния того же цвета, что надпись плитки — accentGraphic на градиенте не дотягивает до 3 в тёмных titanium/midnight/orchid */}
          <Ionicons name="flash" size={20} color={paint.ink} />
          <Text style={[S.tileLabel, { color: paint.ink }]}>Plus</Text>
          <Text style={[S.tileBig, { color: paint.ink }]}>{paywallMText(lang, 'mc.energy.plusBig')}</Text>
          {p.plusSub ? <Text style={[S.tileSub, { color: paint.mutedInk }]}>{p.plusSub}</Text> : null}
        </V2Pressable>
      </View>
      <Text style={[S.saved, { color: g.secondary }]}>{paywallMText(lang, 'mc.energy.saved')}</Text>
    </Shell>
  );
});

// ── серия: неделя с закрытым пропуском ─────────────────────────────────────
export const PaywallMStreakPanel = memo(function PaywallMStreakPanel(p: CommonProps & Readonly<{ streakDays: number; week: readonly PaywallMWeekDay[]; ctaLabel: string }>) {
  const { g, lang } = p;
  const weekdayLabel = (d: Date): string => {
    try { return d.toLocaleDateString(lang, { weekday: 'short' }); } catch (error) {
      console.warn('[PAYWALL-M] weekday label failed', error instanceof Error ? error.message : String(error)); // guard-ok: сбой пишет причину, подпись дня остаётся пустой
      return '';
    }
  };
  return (
    <Shell g={g} bottomInset={p.bottomInset} kicker={paywallMText(lang, 'mc.streak.kicker', { n: p.streakDays })} title={paywallMText(lang, 'mc.streak.title', { n: p.streakDays })}
      body={paywallMText(lang, 'mc.streak.body')} ctaLabel={p.ctaLabel} onCta={p.onOpenFull} fine={p.fine} laterLabel={paywallMText(lang, 'mc.later')} onLater={p.onLater} laterDisabled={p.laterDisabled}>
      <View testID="paywall-m-week" style={[S.week, { backgroundColor: g.opaqueCard }]}>
        {p.week.map((d) => {
          const missed = paywallMIsMissedDay(d);
          return (
            <View key={d.key} style={S.weekDay}>
              {d.done ? (
                <View style={[S.dot, { backgroundColor: g.ctaFill }]}><Ionicons name="checkmark" size={16} color={g.ctaFillInk} /></View>
              ) : missed ? (
                <View style={[S.dot, { backgroundColor: g.accentSoft }]}><Ionicons name="shield-checkmark" size={16} color={g.accentGraphic} /></View>
              ) : (
                <View style={[S.dot, { backgroundColor: g.opaqueControl }]} />
              )}
              <Text style={[S.weekLabel, d.today ? S.weekLabelToday : null, { color: d.today ? g.text : g.secondary }]} numberOfLines={1}>{missed ? paywallMText(lang, 'mc.streak.missed') : weekdayLabel(d.date)}</Text>
            </View>
          );
        })}
      </View>
    </Shell>
  );
});

// ── замок урока: следующий шаг и полоса «N из 32» ──────────────────────────
export type PaywallMLockPhrase = Readonly<{ meta: string; english: string; translation: string | null }>;

export const PaywallMLockPanel = memo(function PaywallMLockPanel(p: CommonProps & Readonly<{ lessonsDone: number; nextLesson: number; phrase: PaywallMLockPhrase | null; ctaLabel: string }>) {
  const { g, lang } = p;
  const done = Math.max(0, p.lessonsDone);
  const progress = paywallMLessonProgress(done);
  return (
    <Shell g={g} bottomInset={p.bottomInset} kicker={paywallMText(lang, 'mc.lock.kicker', { done, total: PAYWALL_M_TOTAL_LESSONS })} title={paywallMText(lang, 'mc.lock.title', { lesson: p.nextLesson })}
      ctaLabel={p.ctaLabel} onCta={p.onOpenFull} fine={p.fine} laterLabel={paywallMText(lang, 'm.notNow')} onLater={p.onLater} laterDisabled={p.laterDisabled}>
      {p.phrase ? (
        <View style={[S.lockCard, { backgroundColor: g.opaqueCard }]}>
          <View style={[S.lockTile, { backgroundColor: g.accentSoft }]}><Ionicons name="lock-closed-outline" size={20} color={g.accentGraphic} /></View>
          <View style={S.lockText}>
            <Text style={[S.lockMeta, { color: g.accentTextSafe }]}>{p.phrase.meta}</Text>
            <Text style={[S.lockEnglish, { color: g.text }]}>{p.phrase.english}</Text>
            {p.phrase.translation ? <Text style={[S.lockTr, { color: g.secondary }]}>{p.phrase.translation}</Text> : null}
          </View>
        </View>
      ) : null}
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: PAYWALL_M_TOTAL_LESSONS, now: done }} style={S.progressBlock}>
        <View style={[S.track, { backgroundColor: g.opaqueControl }]}>
          <View style={[S.fill, { backgroundColor: g.accentGraphic, width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={S.progressRow}>
          <Text style={[S.progressText, { color: g.secondary }]}>{paywallMText(lang, 'mc.lock.progress', { done, total: PAYWALL_M_TOTAL_LESSONS })}</Text>
          <Text style={[S.progressText, { color: g.secondary }]}>{paywallMText(lang, 'mc.lock.ahead', { n: Math.max(0, PAYWALL_M_TOTAL_LESSONS - done) })}</Text>
        </View>
      </View>
    </Shell>
  );
});

// ── «Не видим твой Plus»: вернуть своё, продажа — второй кнопкой ───────────
export const PaywallMRefusedPanel = memo(function PaywallMRefusedPanel(p: Readonly<{
  g: GlassTokens; lang: Lang; bottomInset: number; restoring: boolean; purchasing: boolean; busy: boolean; onRestore: () => void; onPurchase: () => void; onLater: () => void; laterDisabled: boolean;
}>) {
  const { g, lang } = p;
  const outcome = useRestoreOutcome(p.restoring);
  const restored = outcome === 'restored';
  const notFound = outcome === 'not_found';
  const plate = paywallPlateBg(g);
  const restoreLabel = outcome === 'busy' ? paywallServerRefusedText(lang, 'restoring') : restored ? paywallServerRefusedText(lang, 'restored')
    : notFound ? paywallMText(lang, 'mc.refused.nf.retry') : paywallMText(lang, 'mc.refused.restore');
  const body = notFound ? paywallMText(lang, Platform.OS === 'ios' ? 'mc.refused.nf.body.ios' : 'mc.refused.nf.body.android') : paywallMText(lang, 'mc.refused.body');
  return (
    <View testID="paywall-m-panel" style={[S.shell, { paddingBottom: Math.max(p.bottomInset, 14) }]}>
      <View style={S.refusedHead}>
        <View style={[S.refusedTile, { backgroundColor: g.accentSoft }]}><Ionicons name="refresh-circle-outline" size={24} color={g.accentGraphic} /></View>
        <Text accessibilityRole="header" style={[S.refusedTitle, { color: g.text }]}>{notFound ? paywallMText(lang, 'mc.refused.nf.title') : paywallMText(lang, 'mc.refused.title')}</Text>
      </View>
      <Text accessibilityLiveRegion="polite" style={[S.body, { color: g.secondary }]}>{body}</Text>
      <V2Pressable testID="paywall-server-refused-restore" accessibilityRole="button" accessibilityLabel={restoreLabel} accessibilityState={{ disabled: p.busy || restored, busy: outcome === 'busy' }}
        disabled={p.busy || restored} onPress={p.onRestore} withHaptic={false} scaleTo={0.97} style={[S.cta, { backgroundColor: g.ctaFill }]}>
        {outcome === 'busy' ? <ActivityIndicator color={g.ctaFillInk} /> : <Text style={[S.ctaText, { color: g.ctaFillInk }]}>{restoreLabel}</Text>}
      </V2Pressable>
      <V2Pressable testID="paywall-server-refused-purchase" accessibilityRole="button" accessibilityLabel={paywallMText(lang, 'mc.refused.subscribe')} accessibilityState={{ disabled: p.busy, busy: p.purchasing }}
        disabled={p.busy} onPress={p.onPurchase} withHaptic={false} scaleTo={0.97} style={[S.cta, { backgroundColor: plate }]}>
        {p.purchasing ? <ActivityIndicator color={g.text} /> : <Text style={[S.ctaText, { color: g.text }]}>{paywallMText(lang, 'mc.refused.subscribe')}</Text>}
      </V2Pressable>
      <V2Pressable testID="paywall-close" accessibilityRole="button" accessibilityLabel={paywallMText(lang, 'm.notNow')} disabled={p.laterDisabled} onPress={p.onLater} withHaptic={false} scaleTo={0.95}
        style={[S.later, { opacity: p.laterDisabled ? 0.5 : 1 }]}>
        <Text style={[S.laterText, { color: g.secondary }]}>{paywallMText(lang, 'm.notNow')}</Text>
      </V2Pressable>
    </View>
  );
});

// ── Мастерская фраз: пройденный урок и что внутри ──────────────────────────
export const PaywallMWorkshopPanel = memo(function PaywallMWorkshopPanel(p: CommonProps & Readonly<{ lesson: number; phrases: number; ctaLabel: string }>) {
  const { g, lang } = p;
  const { studyTarget } = useStudyTarget();
  // зачем (Макеты 25.10): банк фраз урока уже в памяти (его читал список «Все уроки»); нет банка — блока нет, без выдуманных фраз
  const preview = useMemo(() => paywallMWorkshopPreview(peekLearningV2LessonBankV1(String(studyTarget), p.lesson), lang, p.phrases), [studyTarget, p.lesson, p.phrases, lang]);
  return (
    <Shell g={g} bottomInset={p.bottomInset} kicker={paywallMText(lang, 'mc.workshop.kicker', { lesson: p.lesson, n: p.phrases })} title={paywallMText(lang, 'mc.workshop.title')}
      body={paywallMText(lang, 'mc.workshop.body')} ctaLabel={p.ctaLabel} onCta={p.onOpenFull} fine={p.fine} laterLabel={paywallMText(lang, 'm.notNow')} onLater={p.onLater} laterDisabled={p.laterDisabled}>
      {preview ? <PaywallMWorkshopPreviewBlock g={g} preview={preview} /> : null}
    </Shell>
  );
});

// ── разговор с ИИ: цифры первого бесплатного разговора и одна исправленная фраза ──────────────
// зачем (макет 6dkmYjjEX3kCv2s1nuFT9B, раздел 2; 5 · ВХОД faf515267): минуты, реплики и фраза «было → стало» лежат на телефоне (app/dialog_first_free_summary.ts),
// пейвол получает их параметрами входа dialog_limit; новых запросов нет. Нет фразы — блок «Твоя фраза» не рисуем, цифры в заголовке остаются.
export const PaywallMDialogPanel = memo(function PaywallMDialogPanel(p: CommonProps & Readonly<{
  minutes: number; phrases: number; correctionWas: string | null; correctionNow: string | null; ctaLabel: string;
}>) {
  const { g, lang } = p;
  const goodInk = semanticInk(g).goodText;
  const parts = useMemo(() => (p.correctionNow ? paywallMCorrectionParts(p.correctionWas, p.correctionNow) : []), [p.correctionWas, p.correctionNow]);
  return (
    <Shell g={g} bottomInset={p.bottomInset} kicker={paywallMText(lang, 'mc.dialog.kicker')} title={paywallMText(lang, 'mc.dialog.title', { min: p.minutes, n: p.phrases })}
      body={paywallMText(lang, 'mc.dialog.body', { limit: PAYWALL_M_LIMITS.dialogPerMonth })} ctaLabel={p.ctaLabel} onCta={p.onOpenFull} fine={p.fine}
      laterLabel={paywallMText(lang, 'm.notNow')} onLater={p.onLater} laterDisabled={p.laterDisabled}>
      {parts.length > 0 && p.correctionNow ? (
        <View testID="paywall-m-dialog-phrase" style={[S.phraseCard, { backgroundColor: g.opaqueCard }]}>
          <Text style={[S.phraseLabel, { color: g.secondary }]}>{paywallMText(lang, 'mc.dialog.yourPhrase')}</Text>
          {p.correctionWas ? <Text style={[S.phraseWas, { color: g.secondary }]}>{p.correctionWas}</Text> : null}
          <Text style={[S.phraseNow, { color: g.text }]}>
            {parts.map((part, i) => (part.changed ? <Text key={`${i}:${part.text}`} style={{ color: goodInk }}>{part.text}</Text> : part.text))}
          </Text>
        </View>
      ) : null}
    </Shell>
  );
});

const S = StyleSheet.create({
  phraseCard: { borderRadius: 20, padding: 14, gap: 6 },
  phraseLabel: { fontSize: 13, lineHeight: 17 },
  phraseWas: { fontSize: 16, lineHeight: 22, textDecorationLine: 'line-through' },
  phraseNow: { fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.2 },
  refusedHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refusedTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  refusedTitle: { flex: 1, fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.3 },
  shell: { paddingHorizontal: 16, paddingTop: 6, gap: 14 },
  kicker: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.3, marginTop: -6 },
  body: { fontSize: 16, lineHeight: 22 },
  cta: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '800', letterSpacing: -0.2 },
  fine: { fontSize: 13, lineHeight: 17, textAlign: 'center', marginTop: -4 },
  later: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: -8 },
  laterText: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  tiles: { flexDirection: 'row', gap: 10 },
  tileCell: { flex: 1 },
  // у плитки «Подождать» рамка прозрачная — размеры плиток равны (карта Тем E7: рамка плитки Plus accentGraphic к листу ≥ 3)
  tile: { minHeight: 132, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: 'transparent', gap: 4, overflow: 'hidden' }, // guard-ok: рамка 1 px плитки Plus, исключение PhraseMan 2.0
  tileFill: { borderRadius: 19 },
  tileLabel: { fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 4 },
  tileBig: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  tileSub: { fontSize: 13, lineHeight: 17 },
  saved: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
  week: { flexDirection: 'row', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 8 },
  weekDay: { flex: 1, alignItems: 'center', gap: 6 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontSize: 13, lineHeight: 17 },
  weekLabelToday: { fontWeight: '700' }, // зачем (Макеты 25.10): сегодняшний день в макете выделен жирной подписью
  lockCard: { borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  lockText: { flex: 1, minWidth: 0 },
  lockMeta: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  lockEnglish: { fontSize: 19, lineHeight: 24, fontWeight: '800', letterSpacing: -0.2 },
  lockTr: { fontSize: 13, lineHeight: 17 },
  progressBlock: { gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 13, lineHeight: 17 },
});
