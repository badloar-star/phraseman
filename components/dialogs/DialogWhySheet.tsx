/**
 * DialogWhySheet — шторка «Почему так» под репликой собеседника.
 *
 * зачем (владелец 2026-09-14, редизайн раздела «Диалоги»): «почему так
 * пожалуйста пусть открывается модал лист анимированный снизу вверх и
 * пожалуйста пусть не будет долгой генерации, а будет всё сразу мгновенно».
 * Поэтому содержимое (объяснение, перевод, готовые ответы) приезжает ВМЕСТЕ с
 * репликой в поле `coach` того же вызова (app/ai_dialog_coach.ts) — здесь
 * только показ, ни одного сетевого запроса и ни одного спиннера.
 *
 * Liquid Glass 2.0 (владелец 2026-09-29, макет dialogs.html C7/C8): каркас —
 * общая HybridSheetShell с непрозрачной стеклянной основой (жест, вуаль,
 * клавиатура и safe area живут там, а не копией здесь), цвета — только токены
 * активной из 13 тем (liquidGlassTokens). Обводок у контейнеров нет.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import PressableHybrid from '../PressableHybrid';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import type { DialogCoachTurn } from '../../app/ai_dialog_coach';
import { localizeQuotes } from '../../app/mistake_explanation_text';

interface DialogWhySheetProps {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  /** Реплика собеседника без [[маркеров]] — цитата в шапке шторки. */
  quote: string;
  coach: DialogCoachTurn;
  /**
   * ⛔ Проп `onUseSuggestion` УДАЛЁН насовсем (владелец 2026-09-17): готовые
   * ответы со вставкой в поле ввода отменены во всём разделе — человек
   * формулирует сам. Не возвращать даже опциональным: мёртвый опциональный
   * проп это приглашение вернуть отменённую механику «по образцу».
   *
   * Замок оплаты, наоборот, ЖИВЁТ ЗДЕСЬ (владелец 2026-09-18: «я говорил про
   * вот эту кнопку „почему так“ — она 3 бесплатно в день»). Платим именно за
   * разбор чужой реплики: он стоит вызова модели. Лампочка-подсказка при этом
   * бесплатна — она показывает шаг сценария из бандла.
   *
   * Не передан — шторка открыта (режим тьютора, где оплаты нет).
   */
  gate?: {
    /** Уже открыта: бесплатной за сегодня или оплаченной рунами. */
    revealed: boolean;
    /** Остаток бесплатных на сегодня. */
    freeLeft: number;
    /** Сколько бесплатных даётся в день — знаменатель строки «2 из 3». */
    freePerDay: number;
    priceRunes: number;
    /** Причина последнего отказа — видимая, не только звук. */
    denied: 'no_runes' | 'error' | null;
    onUnlock: () => void;
  } | null;
  /**
   * зачем (владелец 2026-09-30, макет dialogs.html C7/C8, V2-сессия): в 2.0 руны убраны —
   * вместо кнопки с ценой «Открыть Plus». Разбор уже пришёл с репликой (D112), поэтому
   * замок только решает, показывать ли его сегодня. Передаётся ТОЛЬКО из V2-сессии;
   * старая сессия продолжает жить на `gate`. Нет обоих — шторка открыта (Plus/тьютор).
   */
  plusGate?: {
    /** Эта реплика раскрыта (бесплатной за сегодня). */
    revealed: boolean;
    freeLeft: number;
    freePerDay: number;
    exhaustedText: string;
    openPlusLabel: string;
    onOpenPlus: () => void;
  } | null;
  testID?: string;
}

export default function DialogWhySheet({
  visible,
  onClose,
  lang,
  quote,
  coach,
  gate = null,
  plusGate = null,
  testID,
}: DialogWhySheetProps) {
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);

  const closeLabel = triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
    vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });
  const showLabel = triLang(lang, {
    ru: 'Показать разбор', uk: 'Показати розбір', en: 'Show the explanation',
    es: 'Ver la explicación', 'pt-BR': 'Ver a explicação', vi: 'Xem giải thích',
    id: 'Lihat penjelasan', tr: 'Açıklamayı göster', pl: 'Pokaż wyjaśnienie',
  });

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={closeLabel}
      testID={testID}
      material="liquid-glass-opaque"
    >
      {({ requestDismiss }) => (
        <View style={styles.body}>
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              style={{ color: glass.text, fontSize: f.h2, fontWeight: '700', flex: 1 }}
              maxFontSizeMultiplier={1.2}
            >
              {triLang(lang, {
                ru: 'Почему так', uk: 'Чому так', en: 'Why it sounds like this', es: 'Por qué se dice así',
                'pt-BR': 'Por que se diz assim', vi: 'Vì sao nói vậy', id: 'Kenapa begitu',
                tr: 'Neden böyle', pl: 'Dlaczego tak',
              })}
            </Text>
            <PressableHybrid
              variant="icon"
              onPress={requestDismiss}
              accessibilityLabel={closeLabel}
              style={styles.closeHit}
              contentStyle={[styles.closeBtn, { backgroundColor: glass.opaqueControl }]}
            >
              <Ionicons name="close" size={20} color={glass.secondary} />
            </PressableHybrid>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false} decelerationRate="fast"
          >
            {/* Цитата реплики: человек видит, о чём речь, не листая чат. */}
            <View style={[styles.quote, { backgroundColor: glass.opaqueControl }]}>
              <Text
                style={{ color: glass.text, fontSize: f.bodyLg, fontWeight: '700', lineHeight: Math.round(f.bodyLg * 1.35) }}
                maxFontSizeMultiplier={1.2}
              >
                {quote}
              </Text>
            </View>

            {/* ЗАМОК: разбор скрыт, пока за него не заплачено. Владелец
                2026-09-18: «почему так — она 3 бесплатно в день».
                Первые три за сутки открываются сами (buyHint списывает из
                дневного остатка, руны не трогает), дальше — кнопка с ценой.
                `gate` не передан (тьютор) → показываем сразу. */}
            {gate && !gate.revealed ? (
              <>
                <Text
                  style={{ color: glass.secondary, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 22 }}
                  maxFontSizeMultiplier={1.2}
                >
                  {triLang(lang, {
                    ru: 'Бесплатные разборы на сегодня закончились.',
                    uk: 'Безкоштовні розбори на сьогодні скінчилися.',
                    en: 'You have used all your free explanations for today.',
                    es: 'Se acabaron las explicaciones gratuitas de hoy.',
                    'pt-BR': 'As explicações grátis de hoje acabaram.',
                    vi: 'Bạn đã dùng hết lượt giải thích miễn phí hôm nay.',
                    id: 'Penjelasan gratis hari ini sudah habis.',
                    tr: 'Bugünkü ücretsiz açıklamaların bitti.',
                    pl: 'Darmowe wyjaśnienia na dziś się skończyły.',
                  })}
                </Text>
                <PressableHybrid
                  variant="primary"
                  onPress={gate.onUnlock}
                  accessibilityLabel={`${showLabel}, ${gate.priceRunes}`}
                  style={styles.unlockHit}
                  contentStyle={[styles.unlockBtn, { backgroundColor: glass.accent }]}
                  testID="ai-dialog-why-unlock"
                >
                  <Text style={{ color: glass.accentInk, fontSize: f.bodyLg, fontWeight: '900' }} maxFontSizeMultiplier={1.2}>
                    {`ᚱ ${gate.priceRunes}`}
                  </Text>
                  <Text style={{ color: glass.accentInk, fontSize: f.bodyLg, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                    {`· ${showLabel}`}
                  </Text>
                </PressableHybrid>
                {/* Причина отказа видна, а не только слышна: молчаливый
                    отказ человек читает как поломку. Цвет отказа прежний. */}
                {gate.denied ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={{ color: t.accentText, fontSize: f.sub, fontWeight: '700', textAlign: 'center', marginTop: 10 }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {gate.denied === 'no_runes'
                      ? triLang(lang, {
                          ru: 'Не хватает монет', uk: 'Не вистачає монет', en: 'Not enough coins',
                          es: 'Faltan monedas', 'pt-BR': 'Faltam moedas', vi: 'Không đủ xu',
                          id: 'Koin tidak cukup', tr: 'Jeton yetersiz', pl: 'Za mało monet',
                        })
                      : triLang(lang, {
                          ru: 'Не получилось. Попробуй ещё раз.',
                          uk: 'Не вийшло. Спробуй ще раз.',
                          en: 'That didn’t work. Try again.',
                          es: 'No funcionó. Inténtalo de nuevo.',
                          'pt-BR': 'Não deu certo. Tente de novo.',
                          vi: 'Không thành công. Thử lại nhé.',
                          id: 'Gagal. Coba lagi.',
                          tr: 'Olmadı. Tekrar dene.',
                          pl: 'Nie udało się. Spróbuj ponownie.',
                        })}
                  </Text>
                ) : null}
              </>
            ) : null}

            {plusGate && !plusGate.revealed ? (
              <>
                <Text
                  testID="dialogue-v2-why-exhausted"
                  style={{ color: glass.secondary, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 22 }}
                  maxFontSizeMultiplier={1.2}
                >
                  {plusGate.exhaustedText}
                </Text>
                <PressableHybrid
                  variant="primary"
                  onPress={plusGate.onOpenPlus}
                  accessibilityLabel={plusGate.openPlusLabel}
                  style={styles.unlockHit}
                  contentStyle={[styles.unlockBtn, { backgroundColor: glass.accent }]}
                  testID="dialogue-v2-why-open-plus"
                >
                  <Text style={{ color: glass.accentInk, fontSize: f.bodyLg, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                    {plusGate.openPlusLabel}
                  </Text>
                </PressableHybrid>
              </>
            ) : null}

            {(!gate || gate.revealed) && coach.note && (!plusGate || plusGate.revealed) ? (
              <>
                {/* зачем (владелец 14.10, «минимум ненужных элементов»; Макеты dialogs #20): меток «Разбор» и «Перевод» нет — разбор основным цветом, перевод вторичным, их различает тон, а не подпись */}
                <Text
                  style={{ color: glass.text, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 22 }}
                  maxFontSizeMultiplier={1.2}
                >
                  {/* зачем (dialogs-020): модель присылает прямые кавычки "…" — показываем «ёлочки» языка интерфейса. */}
                  {localizeQuotes(coach.note, lang)}
                </Text>
              </>
            ) : null}

            {(!gate || gate.revealed) && coach.translation && (!plusGate || plusGate.revealed) ? (
              <>
                <Text
                  style={{ color: glass.secondary, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 16 }}
                  maxFontSizeMultiplier={1.2}
                >
                  {coach.translation}
                </Text>
              </>
            ) : null}

            {/* зачем (владелец 14.10, Макеты dialogs #20/#21): V2-счётчик «Осталось бесплатных разборов» убран — остаток показывает только пустой лимит (exhaustedText: «3 разбора в день, завтра снова») */}
            {gate && gate.freeLeft > 0 ? (
              <Text
                style={{ color: glass.mutedText, fontSize: f.sub, textAlign: 'center', marginTop: 22 }}
                maxFontSizeMultiplier={1.2}
              >
                {triLang(lang, {
                  ru: `Бесплатно сегодня: ${gate.freeLeft} из ${gate.freePerDay}`,
                  uk: `Безкоштовно сьогодні: ${gate.freeLeft} з ${gate.freePerDay}`,
                  en: `Free today: ${gate.freeLeft} of ${gate.freePerDay}`,
                  es: `Gratis hoy: ${gate.freeLeft} de ${gate.freePerDay}`,
                  'pt-BR': `Grátis hoje: ${gate.freeLeft} de ${gate.freePerDay}`,
                  vi: `Miễn phí hôm nay: ${gate.freeLeft}/${gate.freePerDay}`,
                  id: `Gratis hari ini: ${gate.freeLeft} dari ${gate.freePerDay}`,
                  tr: `Bugün ücretsiz: ${gate.freePerDay} hakkından ${gate.freeLeft}`,
                  pl: `Dziś za darmo: ${gate.freeLeft} z ${gate.freePerDay}`,
                })}
              </Text>
            ) : null}

            {/* ⛔ ГОТОВЫХ ОТВЕТОВ ЗДЕСЬ БОЛЬШЕ НЕТ (владелец 2026-09-17,
                повторено 2026-09-18): «сама вот эта лампочка это и есть
                подсказка». Платит только лампочка, а шторка бесплатна целиком:
                «почему так» и перевод — это понимание ЧУЖОЙ речи. */}
          </ScrollView>
        </View>
      )}
    </HybridSheetShell>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, minHeight: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, marginBottom: 6 },
  closeHit: { alignSelf: 'auto', width: 44, height: 44 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
  quote: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, marginTop: 8 },
  unlockHit: { marginTop: 18 },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 26,
  },
});
