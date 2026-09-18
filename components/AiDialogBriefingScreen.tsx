/**
 * AiDialogBriefingScreen — вводная сценария как «кино-афиша» (редизайн 2026-08-23).
 *
 * зачем: фулл-редизайн Диалогов — брифинг встречает светом места: блум сцены
 * сверху, медальон-глиф со свечением, чип уровня, цель и первый шаг тональными
 * карточками без обводок. Вся логика и контракты прежние: локализованный текст
 * брифинга, reduce-motion, безопасные фолбэки.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, { FadeInDown } from 'react-native-reanimated';

import {
  dialogScenarioGoal,
  dialogScenarioNextStepHint,
  dialogScenarioTitle,
  type DialogScenario,
} from '../app/ai_dialog_scenarios';
import { aiDialogBriefingBody } from '../app/ai_dialog_briefing_copy';
import { sceneThemeFor } from '../constants/dialogSceneThemes';
import { noAndroidOutline } from '../constants/androidGlow';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import ScreenGradient from './ScreenGradient';
import PressableScale from './feedback/PressableScale';
import EnergyCostBadge from './EnergyCostBadge';
import { triLang } from '../constants/i18n';
import { useReduceMotion } from '../hooks/use_reduce_motion';

type AiDialogBriefingScreenProps = {
  scenario: DialogScenario;
  onBack: () => void;
  onStart: () => void;
  /**
   * Режим покупки (владелец 2026-09-17, экран 3 макета экономики рун). Новый
   * экран не рисуем — меняется ТОЛЬКО нижняя кнопка: вместо «Начать диалог»
   * цена. Не передан — сценарий уже доступен, кнопка обычная.
   */
  purchase?: {
    priceRunes: number;
    balanceRunes: number;
    onBuy: () => void;
  } | null;
};

/**
 * Разряды в цене: «5 000» читается с одного взгляда, «5000» — нет.
 * Неразрывный пробел заменяем обычным: в кнопке перенос по нему не нужен,
 * а шрифт рисует его одинаково.
 */
function formatRunes(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString('ru-RU').replace(/ /g, ' ');
}

const briefingCopy = (lang: ReturnType<typeof useLang>['lang']) => ({
  goalLabel: triLang(lang, {
    ru: 'Цель диалога', uk: 'Мета діалогу', en: 'Dialogue goal', es: 'Objetivo del diálogo', 'pt-BR': 'Objetivo do diálogo',
    vi: 'Mục tiêu hội thoại', id: 'Tujuan dialog', tr: 'Diyalog hedefi', pl: 'Cel dialogu',
  }),
  firstPromptLabel: triLang(lang, {
    ru: 'Начните с этого', uk: 'Почніть із цього', en: 'Start with this', es: 'Empieza con esto', 'pt-BR': 'Comece por aqui',
    vi: 'Bắt đầu từ đây', id: 'Mulai dari sini', tr: 'Buradan başlayın', pl: 'Zacznij od tego',
  }),
  start: triLang(lang, {
    ru: 'Начать диалог', uk: 'Почати діалог', en: 'Start the dialogue', es: 'Iniciar diálogo', 'pt-BR': 'Iniciar diálogo',
    vi: 'Bắt đầu hội thoại', id: 'Mulai dialog', tr: 'Diyaloğu başlat', pl: 'Rozpocznij dialog',
  }),
  back: triLang(lang, {
    ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć',
  }),
  // зачем «Открыть диалог», а не «Купить»: человек покупает доступ к языку,
  // а не товар. Слова «навсегда» нет — доступ бывает двух видов (куплен за
  // руны либо открыт подпиской), см. app/ai_dialog_level_lock.ts.
  unlock: triLang(lang, {
    ru: 'Открыть диалог', uk: 'Відкрити діалог', en: 'Unlock the dialogue', es: 'Abrir el diálogo',
    'pt-BR': 'Abrir o diálogo', vi: 'Mở hội thoại', id: 'Buka dialog', tr: 'Diyaloğu aç', pl: 'Otwórz dialog',
  }),
  // Остаток после покупки виден ДО нажатия: человек не должен считать в уме,
  // хватит ли ему и что останется.
  remaining: (value: string) => triLang(lang, {
    ru: `Останется ${value}`, uk: `Залишиться ${value}`, en: `${value} left after this`, es: `Quedarán ${value}`,
    'pt-BR': `Restarão ${value}`, vi: `Còn lại ${value}`, id: `Sisa ${value}`, tr: `${value} kalacak`, pl: `Zostanie ${value}`,
  }),
  notEnough: triLang(lang, {
    ru: 'Не хватает рун', uk: 'Не вистачає рун', en: 'Not enough runes', es: 'Faltan runas',
    'pt-BR': 'Faltam runas', vi: 'Không đủ rune', id: 'Rune tidak cukup', tr: 'Rün yetersiz', pl: 'Za mało run',
  }),
});

export default function AiDialogBriefingScreen({
  scenario,
  onBack,
  onStart,
  purchase = null,
}: AiDialogBriefingScreenProps) {
  const { theme: t, f, ds } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const copy = briefingCopy(lang);
  const briefingBody = aiDialogBriefingBody(scenario.id, lang);
  const scene = sceneThemeFor(scenario);
  const entering = reduceMotion ? undefined : FadeInDown.duration(280);
  const enterAt = (delayMs: number) =>
    reduceMotion ? undefined : FadeInDown.delay(delayMs).duration(280);

  return (
    <ScreenGradient>
      {/* Свет места: блум сцены из верхней трети экрана. */}
      <LinearGradient
        pointerEvents="none"
        colors={[scene.hueDeep + '4D', scene.hue + '14', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
      />
      <SafeAreaView testID="screen-ai-dialog-briefing" style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: ds.spacing.lg, paddingVertical: ds.spacing.md }}>
          <PressableScale
            onPress={onBack}
            variant="flat"
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            hitSlop={12}
            style={{ padding: ds.spacing.sm }}
          >
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </PressableScale>
        </View>

        <ScrollView decelerationRate="fast" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: ds.spacing.xl, paddingBottom: ds.spacing.xxl }}>
          <Reanimated.View entering={entering} style={{ flex: 1, justifyContent: 'center', gap: ds.spacing.xl }}>
            <View style={{ alignItems: 'center', gap: ds.spacing.md }}>
              {/* Медальон-глиф сцены со свечением её света. */}
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 30,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: scene.hue + '26',
                  shadowColor: scene.hue,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.45,
                  shadowRadius: 18,
                  ...noAndroidOutline,
                }}
              >
                <Ionicons name={scenario.icon as keyof typeof Ionicons.glyphMap} size={40} color={scene.hue} />
              </View>
              <View
                style={{
                  backgroundColor: scene.hue + '22',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ color: scene.hue, fontSize: f.sub, fontWeight: '800', letterSpacing: 1.2 }}>
                  {scenario.cefr}
                </Text>
              </View>
              <Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: f.h1 + 6, fontWeight: '700', textAlign: 'center' }}>
                {dialogScenarioTitle(scenario, lang)}
              </Text>
            </View>

            {briefingBody ? (
              <Reanimated.View
                entering={enterAt(90)}
                style={{ padding: ds.spacing.lg, borderRadius: ds.radius.xl, backgroundColor: t.bgCard, overflow: 'hidden' }}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={[scene.hue + '14', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '400', lineHeight: f.bodyLg + 8 }}>
                  {briefingBody}
                </Text>
              </Reanimated.View>
            ) : (
              <>
                <Reanimated.View
                  entering={enterAt(90)}
                  style={{ gap: ds.spacing.sm, padding: ds.spacing.lg, borderRadius: ds.radius.xl, backgroundColor: t.bgCard, overflow: 'hidden' }}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={[scene.hue + '14', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Ionicons name="flag" size={14} color={scene.hue} />
                    <Text style={{ color: scene.hue, fontSize: f.label, fontWeight: '700', letterSpacing: 0.8 }}>
                      {copy.goalLabel}
                    </Text>
                  </View>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '400', lineHeight: f.bodyLg + 8 }}>
                    {dialogScenarioGoal(scenario, lang)}
                  </Text>
                </Reanimated.View>

                <Reanimated.View
                  entering={enterAt(160)}
                  style={{ gap: ds.spacing.sm, padding: ds.spacing.lg, borderRadius: ds.radius.xl, backgroundColor: t.bgSurface }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={t.textMuted} />
                    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700', letterSpacing: 0.8 }}>
                      {copy.firstPromptLabel}
                    </Text>
                  </View>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '400', lineHeight: f.bodyLg + 8 }}>
                    {dialogScenarioNextStepHint(scenario, lang)}
                  </Text>
                </Reanimated.View>
              </>
            )}

            <Reanimated.View entering={enterAt(220)} style={{ position: 'relative' }}>
              {/* Цена входа видна до нажатия (владелец 2026-08-23) и теперь это
                  ЕДИНСТВЕННОЕ место, где она показывается (владелец 2026-09-17):
                  из плиток списка диалогов значок убран, чтобы каталог не читался
                  как прайс-лист. Значок лежит в одном relative-контейнере с
                  кнопкой и садится в её угол — цена ровно в точке решения.

                  В режиме покупки значок энергии скрыт: две цены разом (руны за
                  доступ и энергия за вход) на одной кнопке читаются как двойная
                  оплата. Энергия вернётся на кнопку сразу после покупки. */}
              {!purchase && <EnergyCostBadge activity="ai_dialog" testID="ai-dialog-briefing-energy-cost" />}
              {purchase ? (
                <>
                  <PressableScale
                    /**
                     * ⛔ ДЫРА В ДЕНЬГАХ, ЗАКРЫТА (владелец 2026-09-17: «написано
                     * не хватает рун, нажимаю, но ничего не списывается, только
                     * звук списания есть, и диалог открывается»).
                     *
                     * Здесь стояло `balanceRunes >= priceRunes ? onBuy : onStart`.
                     * То есть при НЕХВАТКЕ рун тап звал `onStart` — прямой вход
                     * в платный диалог бесплатно. Комментарий оправдывал это
                     * тем, что «тап ведёт обычным путём, где человек увидит
                     * причину», но обычный путь этого экрана — открыть диалог.
                     *
                     * Теперь при нехватке тап НИЧЕГО не открывает: причина уже
                     * написана под кнопкой («Не хватает рун»), а вход остаётся
                     * закрытым. Кнопка намеренно не `disabled`: погашенная, но
                     * живая кнопка объясняет отказ, мёртвая — молчит.
                     */
                    onPress={purchase.balanceRunes >= purchase.priceRunes ? purchase.onBuy : undefined}
                    disabled={purchase.balanceRunes < purchase.priceRunes}
                    accessibilityRole="button"
                    accessibilityLabel={`${copy.unlock}, ${formatRunes(purchase.priceRunes)}`}
                    accessibilityState={{ disabled: purchase.balanceRunes < purchase.priceRunes }}
                    testID="ai-dialog-briefing-unlock"
                    style={{
                      minHeight: ds.buttonHeight,
                      borderRadius: ds.radius.lg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      // Золото = платное, как везде в приложении. Глубина даётся
                      // тенью и тоном, не обводкой (запрет владельца).
                      backgroundColor: t.goldBg,
                      shadowColor: t.gold,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 10,
                      // Не хватает рун — гасим тоном, но кнопку НЕ отключаем:
                      // мёртвая кнопка не объясняет, что делать. Тап ведёт
                      // обычным путём, где человек увидит причину.
                      opacity: purchase.balanceRunes >= purchase.priceRunes ? 1 : 0.55,
                      ...noAndroidOutline,
                    }}
                  >
                    <Text style={{ color: t.gold, fontSize: f.bodyLg, fontWeight: '900' }}>
                      ᚱ {formatRunes(purchase.priceRunes)}
                    </Text>
                    <Text style={{ color: t.gold, fontSize: f.bodyLg, fontWeight: '700' }}>
                      · {copy.unlock}
                    </Text>
                  </PressableScale>
                  {/* Остаток или причина отказа — крупным кеглем под кнопкой.
                      Это не подпись-расшифровка названия (запрет владельца), а
                      следствие действия: сколько останется, если нажать. */}
                  <Text
                    style={{
                      marginTop: 10,
                      textAlign: 'center',
                      color: purchase.balanceRunes >= purchase.priceRunes ? t.textMuted : t.gold,
                      fontSize: f.sub,
                      fontWeight: '700',
                    }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {purchase.balanceRunes >= purchase.priceRunes
                      ? copy.remaining(formatRunes(purchase.balanceRunes - purchase.priceRunes))
                      : copy.notEnough}
                  </Text>
                </>
              ) : (
                <PressableScale
                  onPress={onStart}
                  accessibilityRole="button"
                  accessibilityLabel={copy.start}
                  style={{
                    minHeight: ds.buttonHeight,
                    borderRadius: ds.radius.lg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: t.accent,
                    shadowColor: t.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    ...noAndroidOutline,
                  }}
                >
                  <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>{copy.start}</Text>
                </PressableScale>
              )}
            </Reanimated.View>
          </Reanimated.View>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
