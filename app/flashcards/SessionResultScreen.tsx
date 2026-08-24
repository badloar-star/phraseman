/**
 * cards-2.0 (E5): единый экран результата сессии (§3.10 мастер-плана).
 * Встраиваемый компонент (НЕ роут): сессии рендерят его вместо своего done-блока.
 *
 * Показывает «верно / ошибок / точность» и XP (общая механика приложения).
 * CTA: «Добить: Ещё учу (N)» (второй раунд по ошибочным) + «Готово».
 */
import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import ContentWrap from '../../components/ContentWrap';
import XpGainBadge from '../../components/XpGainBadge';
import EnergyCostBadge from '../../components/EnergyCostBadge';
import { triLang } from '../../constants/i18n';
import { fcHaptic, playSfx } from './SoundService';

// ── Экран результата ──────────────────────────────────────────────────────────

export type SessionResultScreenProps = {
  /** Верных ответов (по попыткам). */
  correct: number;
  /** Ошибок. */
  wrong: number;
  /** Начисленный XP (итог сессии). */
  xpGained: number;
  /** Сколько карточек «Ещё учу» — для CTA второго раунда. */
  learnLeft: number;
  /** Рестарт с ошибочными карточками; без него CTA «Добить» скрыт. */
  onRetryWrong?: () => void;
  onDone: () => void;
  /** Акцент экрана сессии (words #4A9EFF / phrases #40C080 / arena #E05050). */
  accentColor?: string;
  /** E10 (слушание): один показатель «прослушано» вместо верно/ошибок/точность. */
  listeningStats?: boolean;
  /** E12 (блиц): текст CTA повтора («Ещё разок!») — показывает кнопку даже при learnLeft=0. */
  retryLabel?: string;
  /** Повтор запускает новый оплачиваемый раунд. */
  retryShowsEnergyCost?: boolean;
  /** E12 (блиц): пилюля счёта очков под заголовком («Счёт: 1250»). */
  scoreText?: string;
  testID?: string;
};

function SessionResultScreenImpl({
  correct,
  wrong,
  xpGained,
  learnLeft,
  onRetryWrong,
  onDone,
  accentColor,
  listeningStats = false,
  retryLabel,
  retryShowsEnergyCost = false,
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

  // SFX/хаптика финала сессии (§5, E9).
  useEffect(() => {
    playSfx('session_complete');
    fcHaptic('finish');
  }, []);

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
                <View style={styles.retryWrap}>
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
                  {retryShowsEnergyCost ? <EnergyCostBadge testID={`${testID}-retry-energy-cost`} /> : null}
                </View>
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
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingBottom: 24 },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', textAlign: 'center', marginBottom: 18 },
  scorePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
  },
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
  retryWrap: { position: 'relative', overflow: 'visible' },
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
