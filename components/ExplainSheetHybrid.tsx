/**
 * ExplainSheetHybrid — гибрид «Световод + Чекан» для «Объясни как для
 * 5-летнего» (объяснение фразы). Каркас HybridSheetShell (подъём из света,
 * без отскока), фраза/тело каскадом LUM.ladder. Сетевой запрос и трекинг —
 * БЕЗ изменений (useExplainRequest, тот же CF explainPhrase); тут только
 * анимация и вёрстка.
 *
 * зачем: владелец (2026-08-15) — переезд семьи на гибрид, подключается ТОЛЬКО
 * через ExplainSheet.motionVariant='hybrid'.
 */
import { tryPlayV2Event } from '../modules/sound_v2/legacy_bridge';
import React, { memo, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LUM } from '../constants/motionHybrid';
import { hapticTap } from '../hooks/use-haptics';
import SkeletonBlock from './SkeletonShimmer';
import { triLang } from '../constants/i18n';
import { trackEvent } from '../app/analytics';
import {
  useExplainRequest,
  resolveExplainDisplay,
  loadingLineForLang,
  explainLaterLineForLang,
  asLang,
  splitExplainParagraphs,
  splitExplainSegments,
  type ExplainRequestStatus,
} from '../app/explain_phrase_request';
import { aiExplainRefreshLabel } from '../app/mistake_explain_fallback';
import ExplainReportButton from './ExplainReportButton';
import { useStudyTarget } from './StudyTargetContext';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { RowDivider } from './v2/RowDivider';

interface Props {
  visible: boolean;
  onClose: () => void;
  phraseEn: string;
  phraseMeaning: string;
  lang: string;
  onResolved?: (info: { fromCache: boolean; status: ExplainRequestStatus; error: boolean }) => void;
}

function CascadeItem({ index, style, children }: { index: number; style?: object; children: React.ReactNode }) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const y = useSharedValue(reduceMotion ? 0 : 14);
  const delay = LUM.ladder[Math.min(index, LUM.ladder.length - 1)];

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(delay, withSpring(0, LUM.settle));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
  }, [delay, opacity, reduceMotion, y]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

function ExplainSheetHybrid({ visible, onClose, phraseEn, phraseMeaning, lang, onResolved }: Props) {
  // зачем: hybrid-ветка согласована с боевой classic — тот же Liquid Glass вид (learn.html D10).
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { studyTarget } = useStudyTarget();

  const state = useExplainRequest({ phraseEn, phraseMeaning, lang, studyTarget }, visible);
  const display = resolveExplainDisplay(state, lang, phraseMeaning);

  const loggedResultKeyRef = useRef('');
  useEffect(() => {
    if (!visible || state.loading || state.status !== 'ok' || !state.text.trim()) return;
    const resultKey = `${phraseEn}\u0000${lang}\u0000${state.text}`;
    if (loggedResultKeyRef.current === resultKey) return;
    loggedResultKeyRef.current = resultKey;
    void trackEvent('explain_sheet_opened', {
      lang,
      fromCache: state.fromCache,
      status: state.status,
      phase: 'resolved',
    });
    // зачем (координатор 14.10): звук V2 «hint»; флаг sound_v2 выключен — тишина как раньше (старого звука у события не было)
    tryPlayV2Event('hint', 'explain_sheet_hybrid');
    onResolved?.({ fromCache: state.fromCache, status: state.status, error: state.error });
  }, [visible, phraseEn, state.loading, state.text, state.fromCache, state.status, state.error, lang, onResolved]);

  const handleClose = () => {
    hapticTap();
    void trackEvent('explain_sheet_closed', { lang, fromCache: state.fromCache });
    onClose();
  };

  const closeLabel = triLang(asLang(lang), {
    ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });
  const title = triLang(asLang(lang), {
    ru: 'Простыми словами', uk: 'Простими словами', en: 'In simple words', es: 'En palabras simples', 'pt-BR': 'Em palavras simples', vi: 'Nói đơn giản', id: 'Dengan kata sederhana', tr: 'Basit kelimelerle', pl: 'Prościej mówiąc',
  });

  return (
    <HybridSheetShell visible={visible} onClose={handleClose} closeLabel={closeLabel} testID="explain-sheet-hybrid" material="liquid-glass-opaque">
      {({ requestDismiss }) => (
        <>
      <CascadeItem index={0}>
        <Text style={[styles.title, { color: glass.text, fontSize: f.h3 }]}>{title}</Text>
      </CascadeItem>

      <CascadeItem index={1} style={styles.phraseBlock}>
        <Text style={[styles.phraseText, { color: glass.text, fontSize: f.h3 }]}>{phraseEn}</Text>
      </CascadeItem>

      <CascadeItem index={2}>
        <ScrollView decelerationRate="fast" style={styles.bodyScroll} contentContainerStyle={styles.bodyScrollContent} showsVerticalScrollIndicator={false}>
          {display.degraded ? (
            <View style={styles.skeleton} testID="explain-later">
              <Text style={[styles.bodyText, { color: glass.secondary, fontSize: f.body }]}>{explainLaterLineForLang(lang)}</Text>
              <Pressable
                testID="explain-refresh"
                onPress={state.retry}
                accessibilityRole="button"
                style={({ pressed }) => [styles.retryBtn, { backgroundColor: glass.buttonFill }, pressed && { opacity: 0.78 }]}
              >
                <Text style={[styles.retryLabel, { color: glass.text, fontSize: f.body }]}>{aiExplainRefreshLabel(asLang(lang))}</Text>
              </Pressable>
            </View>
          ) : display.showSkeleton ? (
            <View style={styles.skeleton}>
              <Text style={[styles.skeletonText, { color: glass.secondary, fontSize: f.body }]}>{loadingLineForLang(lang)}</Text>
              <SkeletonBlock width="92%" height={14} borderRadius={7} baseColor={glass.selected} />
              <SkeletonBlock width="78%" height={14} borderRadius={7} baseColor={glass.selected} />
              <SkeletonBlock width="85%" height={14} borderRadius={7} baseColor={glass.selected} />
              <SkeletonBlock width="64%" height={14} borderRadius={7} baseColor={glass.selected} />
            </View>
          ) : (
            <>
              {splitExplainParagraphs(display.text).map((paragraph, pIdx) => (
                <Text key={`p-${pIdx}`} style={[styles.bodyText, { color: glass.text, fontSize: f.body }]}>
                  {splitExplainSegments(paragraph).map((seg, sIdx) => (
                    seg.en ? (
                      <Text key={`s-${sIdx}`} style={[styles.bodyEn, { color: glass.text }]}>{seg.text}</Text>
                    ) : (
                      <Text key={`s-${sIdx}`}>{seg.text}</Text>
                    )
                  ))}
                </Text>
              ))}
            </>
          )}
        </ScrollView>
      </CascadeItem>

      {!display.showSkeleton ? (
        <CascadeItem index={3} style={styles.footer}>
          <RowDivider color={glass.line} />
          {!display.degraded ? <ExplainReportButton phraseEn={phraseEn} lang={lang} /> : null}
          <Pressable
            onPress={requestDismiss}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            style={({ pressed }) => [styles.closeCta, { backgroundColor: glass.buttonFill }, pressed && { opacity: 0.78 }]}
          >
            <Text style={[styles.closeCtaLabel, { color: glass.text, fontSize: f.body }]}>{closeLabel}</Text>
          </Pressable>
        </CascadeItem>
      ) : null}
        </>
      )}
    </HybridSheetShell>
  );
}

export default memo(ExplainSheetHybrid);

const styles = StyleSheet.create({
  title: {
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 12,
  },
  phraseBlock: {
    paddingVertical: 4,
    marginBottom: 12,
  },
  phraseText: {
    fontWeight: '700',
    lineHeight: 28,
  },
  bodyScroll: {
    maxHeight: 400,
    flexShrink: 1,
  },
  bodyScrollContent: {
    paddingBottom: 8,
  },
  bodyText: {
    fontWeight: '400',
    lineHeight: 26,
    marginBottom: 12,
  },
  bodyEn: {
    fontWeight: '700',
  },
  skeleton: {
    gap: 12,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  skeletonText: {
    fontWeight: '700',
  },
  footer: {
    marginTop: 4,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeCta: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  closeCtaLabel: {
    fontWeight: '700',
    textAlign: 'center',
  },
  // D158: тихая «Обновить» после исчерпанных автоповторов — без обводки, тон фона.
  retryBtn: {
    alignSelf: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  retryLabel: {
    fontWeight: '700',
  },
});
