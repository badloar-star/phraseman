/**
 * cards-2.0 (E5): единый экран результата сессии (§3.10 мастер-плана).
 * Встраиваемый компонент (НЕ роут): сессии рендерят его вместо своего done-блока.
 *
 * - Звёзды — реюз StarSlot из components/StarDisplayShared (вынос из arena_results):
 *   слоты появляются сразу, заработанные заполняются со стаггером 250мс,
 *   на каждую — SFX star (placeholder success) + хаптика Medium/Light (§5).
 * - «+N★» + подпись кэпа, если дневной лимит источника срезал выдачу (breakdown
 *   из awardSessionStars).
 * - Конфетти при 3★ — ≤16 View-частиц, только transform+opacity, контейнер
 *   размонтируется; lowPower/reduceMotion/web — ветка деградации (пульс звёзд
 *   уже есть в StarSlot + Success-хаптика).
 * - CTA: «Добить: Ещё учу (N)» (второй раунд по ошибочным) + «Готово».
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import ContentWrap from '../../components/ContentWrap';
import XpGainBadge from '../../components/XpGainBadge';
import { StarSlot } from '../../components/StarDisplayShared';
import { triLang } from '../../constants/i18n';
import type { AwardStarsOutcome } from './stars_system';
import { fcHaptic, playSfx } from './SoundService';
import { isLowPowerEffective } from './low_power';
import { useFcReduceMotion } from './PhraseCard';

/** Стаггер появления звёзд (§3.10: 250мс). База 400мс — внутри StarSlot. */
const STAR_STAGGER_MS = 250;
/** Задержка внутри StarSlot до старта анимации. */
const STAR_BASE_DELAY_MS = 400;
/** Момент «приземления» звезды после старта её анимации (для SFX/хаптики). */
const STAR_LAND_MS = 250;
const CONFETTI_COUNT = 16;

// ── Конфетти: ≤16 View-частиц, transform+opacity, размонтирование контейнера ──
function ConfettiBurst({ colors }: { colors: string[] }) {
  const parts = useRef(
    Array.from({ length: CONFETTI_COUNT }, (_, i) => {
      const angle = (i / CONFETTI_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      return {
        anim: new Animated.Value(0),
        dx: Math.cos(angle) * (80 + Math.random() * 70),
        dy: Math.sin(angle) * (60 + Math.random() * 50) + 40, // лёгкая «гравитация» вниз
        rot: (Math.random() - 0.5) * 540,
        size: 6 + Math.random() * 6,
        color: colors[i % colors.length],
        dur: 900 + Math.random() * 500, // §3.10: 900–1400мс
      };
    }),
  ).current;
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    Animated.parallel(
      parts.map((p) =>
        Animated.timing(p.anim, {
          toValue: 1,
          duration: p.dur,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start(() => setFinished(true));
  }, [parts]);

  if (finished) return null; // размонтируем контейнер — ноль живых анимаций после залпа
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', left: '50%', top: 120 }}>
        {parts.map((p, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: p.size < 9 ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity: p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
                { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
                { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
                { scale: p.anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0.7] }) },
              ],
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ── Экран результата ──────────────────────────────────────────────────────────

export type SessionResultScreenProps = {
  /** Верных ответов (по попыткам). */
  correct: number;
  /** Ошибок. */
  wrong: number;
  /** Начисленный XP (итог сессии). */
  xpGained: number;
  /** Итог awardSessionStars; null — звёзды не начислялись (пустая сессия). */
  outcome: AwardStarsOutcome | null;
  /** Сколько карточек «Ещё учу» — для CTA второго раунда. */
  learnLeft: number;
  /** Рестарт с ошибочными карточками; без него CTA «Добить» скрыт. */
  onRetryWrong?: () => void;
  onDone: () => void;
  /** Акцент экрана сессии (words #4A9EFF / phrases #40C080 / arena #E05050). */
  accentColor?: string;
  /** E10 (слушание): один показатель «прослушано» вместо верно/ошибок/точность. */
  listeningStats?: boolean;
  /** E10: сколько ★ достижимо в режиме (слушание — 1, остальные — 3). */
  maxStars?: 1 | 2 | 3;
  /** E10: подпись причины нулевых звёзд (у слушания — порог карточек, не точность). */
  zeroStarsNote?: string;
  /** E12 (блиц): текст CTA повтора («Ещё разок!») — показывает кнопку даже при learnLeft=0. */
  retryLabel?: string;
  /** E12 (блиц): пилюля счёта очков под заголовком («Счёт: 1250»). */
  scoreText?: string;
  testID?: string;
};

function SessionResultScreenImpl({
  correct,
  wrong,
  xpGained,
  outcome,
  learnLeft,
  onRetryWrong,
  onDone,
  accentColor,
  listeningStats = false,
  maxStars = 3,
  zeroStarsNote,
  retryLabel,
  scoreText,
  testID = 'fc-session-result',
}: SessionResultScreenProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const accent = accentColor ?? t.accent;
  // Правило темы: на залитом t.accent — только t.correctText (не хардкодить белый);
  // сессии передают свои насыщенные цвета (#4A9EFF и т.п.) — там белый корректен.
  const ctaTextColor = accentColor ? '#fff' : t.correctText;

  const total = correct + wrong;
  const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const sessionStars = outcome?.breakdown.sessionStars ?? 0;
  const awarded = outcome?.awarded ?? 0;
  const capped = outcome?.capped ?? false;

  const reduceMotion = useFcReduceMotion();
  const simpleEffects = Platform.OS === 'web' || reduceMotion || isLowPowerEffective();
  const [showConfetti, setShowConfetti] = useState(false);

  // SFX/хаптика: финал-арпеджио + sparkle на каждую «приземлившуюся» звезду (§5, E9).
  useEffect(() => {
    playSfx('session_complete');
    fcHaptic('finish');
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < sessionStars; i++) {
      timers.push(
        setTimeout(() => {
          playSfx('star');
          fcHaptic('star');
        }, STAR_BASE_DELAY_MS + i * STAR_STAGGER_MS + STAR_LAND_MS),
      );
    }
    if (sessionStars === 3) {
      // Конфетти стартует, когда третья звезда встала на место.
      timers.push(
        setTimeout(() => {
          if (simpleEffects) fcHaptic('correct'); // ветка деградации: пульс уже в StarSlot
          else setShowConfetti(true);
        }, STAR_BASE_DELAY_MS + 2 * STAR_STAGGER_MS + STAR_LAND_MS + 100),
      );
    }
    return () => timers.forEach(clearTimeout);
    // Запускаем один раз на маунт результата — параметры к этому моменту финальны.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capNote = useMemo(() => {
    if (!outcome) return null;
    if (capped && awarded > 0) {
      return triLang(lang, {
        ru: `Дневной лимит: начислено ${awarded}★ из ${sessionStars}★`,
        uk: `Денний ліміт: нараховано ${awarded}★ із ${sessionStars}★`,
        es: `Límite diario: ${awarded}★ de ${sessionStars}★`,
      });
    }
    if (outcome.breakdown.reason === 'daily_cap') {
      return triLang(lang, {
        ru: 'Дневной лимит звёзд этого режима исчерпан — новые завтра',
        uk: 'Денний ліміт зірок цього режиму вичерпано — нові завтра',
        es: 'Límite diario de estrellas alcanzado: nuevas mañana',
      });
    }
    if (sessionStars === 0 && total > 0) {
      // E10: у слушания причина нулевых звёзд другая (порог карточек, не точность)
      if (zeroStarsNote) return zeroStarsNote;
      return triLang(lang, {
        ru: '★ — от 70% точности. Ещё разок?',
        uk: '★ — від 70% точності. Ще разок?',
        es: '★ desde 70% de precisión. ¿Otra vez?',
      });
    }
    return null;
  }, [outcome, capped, awarded, sessionStars, total, lang, zeroStarsNote]);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={styles.container} testID={testID}>
            <View style={styles.centerBlock}>
              <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
                {triLang(lang, { ru: 'Сессия завершена', uk: 'Сесію завершено', es: 'Sesión terminada' })}
              </Text>

              {/* E12 (блиц): итоговый счёт очков */}
              {scoreText ? (
                <View
                  testID={`${testID}-score`}
                  style={[styles.scorePill, { backgroundColor: `${accent}1A`, borderColor: `${accent}66` }]}
                >
                  <Text style={{ color: accent, fontSize: f.body, fontWeight: '900', letterSpacing: 0.4 }}>
                    {scoreText}
                  </Text>
                </View>
              ) : null}

              {/* Звёзды качества сессии 0–3 (реюз StarSlot из arena_results) */}
              <View style={styles.starsRow} testID={`${testID}-stars`}>
                {Array.from({ length: maxStars }, (_, i) => i).map((i) => (
                  <StarSlot
                    key={i}
                    filled={i < sessionStars}
                    animateIn={i < sessionStars}
                    animateOut={false}
                    delay={i * STAR_STAGGER_MS}
                    accentColor="#FFC83D"
                    size={46}
                    showEmpty
                  />
                ))}
              </View>

              {/* «+N★» + подпись кэпа */}
              {outcome && awarded > 0 ? (
                <View style={[styles.starGainPill, { backgroundColor: '#FFC83D22', borderColor: '#FFC83D66' }]}>
                  <Text style={{ color: '#FFC83D', fontSize: f.body, fontWeight: '800' }}>
                    +{awarded}★
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                    {triLang(lang, { ru: 'в недельный трек', uk: 'у тижневий трек', es: 'a la meta semanal' })}
                  </Text>
                </View>
              ) : null}
              {capNote ? (
                <Text style={[styles.capNote, { color: t.textMuted, fontSize: f.caption }]}>{capNote}</Text>
              ) : null}

              {/* Счёт (E10: у слушания — один показатель «прослушано») */}
              <View style={[styles.statsCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                {listeningStats ? (
                  <View style={styles.stat}>
                    <Text style={{ color: accent, fontSize: f.numLg, fontWeight: '900' }}>{correct}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                      {triLang(lang, { ru: 'карточек прослушано', uk: 'карток прослухано', es: 'tarjetas escuchadas' })}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.stat}>
                      <Text style={{ color: t.correct, fontSize: f.numLg, fontWeight: '900' }}>{correct}</Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                        {triLang(lang, { ru: 'верно', uk: 'вірно', es: 'correcto' })}
                      </Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: t.border }]} />
                    <View style={styles.stat}>
                      <Text style={{ color: t.wrong, fontSize: f.numLg, fontWeight: '900' }}>{wrong}</Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                        {triLang(lang, { ru: 'ошибок', uk: 'помилок', es: 'errores' })}
                      </Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: t.border }]} />
                    <View style={styles.stat}>
                      <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '900' }}>{accuracyPct}%</Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                        {triLang(lang, { ru: 'точность', uk: 'точність', es: 'precisión' })}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* XP */}
              {xpGained > 0 ? (
                <View style={{ marginTop: 18, alignItems: 'center' }}>
                  <XpGainBadge amount={xpGained} visible />
                </View>
              ) : null}
            </View>

            {/* CTA */}
            <View style={styles.ctaBlock}>
              {onRetryWrong && (learnLeft > 0 || retryLabel) ? (
                <TouchableOpacity
                  onPress={() => {
                    fcHaptic('tap');
                    onRetryWrong();
                  }}
                  testID={`${testID}-retry`}
                  style={[styles.retryBtn, { borderColor: accent, backgroundColor: `${accent}14` }]}
                >
                  <Ionicons name="refresh" size={18} color={accent} />
                  <Text style={{ color: accent, fontSize: f.body, fontWeight: '800' }}>
                    {retryLabel ??
                      triLang(lang, {
                        ru: `Добить: Ещё учу (${learnLeft})`,
                        uk: `Добити: Ще вчу (${learnLeft})`,
                        es: `Rematar: Aprendiendo (${learnLeft})`,
                      })}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => {
                  fcHaptic('tap');
                  onDone();
                }}
                testID={`${testID}-done`}
                style={[styles.doneBtn, { backgroundColor: accent }]}
              >
                <Text style={{ color: ctaTextColor, fontSize: f.body, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ContentWrap>
        {showConfetti ? <ConfettiBurst colors={['#FFC83D', accent, t.correct, '#FF8A65']} /> : null}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingBottom: 24 },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', textAlign: 'center', marginBottom: 18 },
  starsRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 14 },
  scorePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
  },
  starGainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 6,
  },
  capNote: { textAlign: 'center', marginBottom: 6 },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    width: '100%',
    marginTop: 14,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statDivider: { width: StyleSheet.hairlineWidth },
  ctaBlock: { gap: 10 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  doneBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
});

const SessionResultScreen = React.memo(SessionResultScreenImpl);
export { SessionResultScreen };
export default SessionResultScreen;
