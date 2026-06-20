import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from './SafeLinearGradient';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import {
  RewardModalBackdrop,
  RewardModalPanelBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

// 'gift'     — существующий free-юзер: текст обновления + блок подарка + кнопка «Получить 3 дня».
// 'announce' — премиум/VIP-юзер: ТОЛЬКО текст обновления, без подарка и без кнопки получения.
export type LoyaltyGiftModalVariant = 'gift' | 'announce';

type Props = {
  visible: boolean;
  variant?: LoyaltyGiftModalVariant;
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
};

type HighlightCopy = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string };

type ModalCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  highlightsTitle: string;
  highlights: HighlightCopy[];
  giftEyebrow: string;
  giftTitle: string;
  giftBody: string;
  giftChips: string[];
  primaryCta: string;
  secondaryCta: string;
  footer: string;
  // Тексты для премиум/VIP (без подарка) — благодарим и закрываем.
  announcePrimaryCta: string;
  announceFooter: string;
};

// Текст обновления + подарок за лояльность. Намеренно «мощный»: сначала вау-фичи,
// затем эмоциональный подарок «спасибо за то, что ты с нами с самого начала».
const COPY: Record<'ru' | 'uk' | 'es', ModalCopy> = {
  ru: {
    eyebrow: 'Большое обновление',
    title: 'Ты застал момент, когда Phraseman стал другим',
    intro: 'Мы переписали половину приложения. Не косметика — новые системы, сотни новых уроков, живые голоса и умный помощник, который ведёт тебя сам.',
    highlightsTitle: 'Что нового',
    highlights: [
      { icon: 'compass', title: 'Компас — личный наставник', body: 'Каждый день сам решает, что тебе полезнее: закрепить ошибки, копнуть глубже или вернуться после паузы. Утром встречает брифингом, рисует карту твоих сильных и слабых тем.' },
      { icon: 'sparkles', title: 'Сотни новых дней практики', body: 'Пять планов заполнены до конца — работа, дом, здоровье, путешествия, эмоции. Месяцы живого контента.' },
      { icon: 'chatbubbles', title: 'Живые ИИ-диалоги', body: 'У каждого собеседника свой характер. Экран как современный мессенджер: аватары, статус «онлайн», пузыри с хвостиками. 11 новых ситуаций.' },
      { icon: 'volume-high', title: 'Человеческая озвучка', body: 'Все фразы теперь звучат живым голосом, а не роботом. Слайдер скорости — разбирай произношение в комфортном темпе.' },
      { icon: 'trophy', title: 'Арена: сезоны и рейтинг', body: 'Сезоны с рейтингом мастерства, таблица лидеров, светящиеся ауры ранга. Соперник находится всегда быстро.' },
      { icon: 'bulb', title: 'Разбор ошибок от ИИ', body: 'После ошибки приложение по-человечески объясняет, в чём дело. Не понял — кнопка «Объяснить проще».' },
      { icon: 'diamond', title: 'Сокровищница идиом', body: '330 коллекционных карточек с уникальными иллюстрациями выпадают как награда за уроки. Собирай и открывай.' },
    ],
    giftEyebrow: 'Подарок за лояльность',
    giftTitle: 'Ты с нами не первый день — держи 3 дня всего премиума',
    giftBody: 'Ты был с Phraseman до этого обновления, и это правда ценно. В знак благодарности дарим тебе 3 дня полного доступа: все уроки, все планы, темы, аналитика и безлимит. Без оплаты, без автопродления — просто подарок. Загляни в обновлённое приложение во всю силу.',
    giftChips: ['Все уроки', 'Все планы', 'Без энергии', 'Темы', 'Аналитика', 'Компас'],
    primaryCta: 'Получить 3 дня премиум',
    secondaryCta: 'Может позже',
    footer: 'Это подарок. Подписка не включается автоматически.',
    announcePrimaryCta: 'Отлично, посмотреть',
    announceFooter: 'Спасибо, что ты с нами. Всё новое уже доступно в твоём Premium.',
  },
  uk: {
    eyebrow: 'Велике оновлення',
    title: 'Ти застав момент, коли Phraseman став іншим',
    intro: 'Ми переписали половину застосунку. Не косметика — нові системи, сотні нових уроків, живі голоси й розумний помічник, що веде тебе сам.',
    highlightsTitle: 'Що нового',
    highlights: [
      { icon: 'compass', title: 'Компас — особистий наставник', body: 'Щодня сам вирішує, що тобі корисніше: закріпити помилки, копнути глибше чи повернутися після паузи. Зранку зустрічає брифінгом, малює карту твоїх сильних і слабких тем.' },
      { icon: 'sparkles', title: 'Сотні нових днів практики', body: "П'ять планів заповнені до кінця — робота, дім, здоров'я, подорожі, емоції. Місяці живого контенту." },
      { icon: 'chatbubbles', title: 'Живі ШІ-діалоги', body: 'У кожного співрозмовника свій характер. Екран як сучасний месенджер: аватари, статус «онлайн», бульбашки з хвостиками. 11 нових ситуацій.' },
      { icon: 'volume-high', title: 'Людська озвучка', body: 'Усі фрази тепер звучать живим голосом, а не роботом. Слайдер швидкості — розбирай вимову у комфортному темпі.' },
      { icon: 'trophy', title: 'Арена: сезони та рейтинг', body: 'Сезони з рейтингом майстерності, таблиця лідерів, сяючі аури рангу. Суперник знаходиться завжди швидко.' },
      { icon: 'bulb', title: 'Розбір помилок від ШІ', body: 'Після помилки застосунок по-людськи пояснює, у чому річ. Не зрозумів — кнопка «Пояснити простіше».' },
      { icon: 'diamond', title: 'Скарбниця ідіом', body: '330 колекційних карток з унікальними ілюстраціями випадають як нагорода за уроки. Збирай і відкривай.' },
    ],
    giftEyebrow: 'Подарунок за лояльність',
    giftTitle: 'Ти з нами не перший день — тримай 3 дні всього преміуму',
    giftBody: 'Ти був з Phraseman до цього оновлення, і це справді цінно. На знак подяки даруємо тобі 3 дні повного доступу: усі уроки, усі плани, теми, аналітика й безліміт. Без оплати, без автопродовження — просто подарунок. Зазирни в оновлений застосунок на повну силу.',
    giftChips: ['Усі уроки', 'Усі плани', 'Без енергії', 'Теми', 'Аналітика', 'Компас'],
    primaryCta: 'Отримати 3 дні преміум',
    secondaryCta: 'Можливо пізніше',
    footer: 'Це подарунок. Підписка не вмикається автоматично.',
    announcePrimaryCta: 'Чудово, подивитися',
    announceFooter: 'Дякуємо, що ти з нами. Усе нове вже доступне у твоєму Premium.',
  },
  es: {
    eyebrow: 'Gran actualización',
    title: 'Llegaste justo cuando Phraseman cambió por completo',
    intro: 'Reescribimos media app. No es estética — nuevos sistemas, cientos de lecciones nuevas, voces reales y un asistente inteligente que te guía solo.',
    highlightsTitle: 'Lo nuevo',
    highlights: [
      { icon: 'compass', title: 'Brújula — tu mentor personal', body: 'Cada día decide qué te conviene más: reforzar errores, profundizar o volver tras una pausa. Te recibe con un resumen y dibuja el mapa de tus temas fuertes y débiles.' },
      { icon: 'sparkles', title: 'Cientos de días nuevos', body: 'Cinco planes completos — trabajo, casa, salud, viajes, emociones. Meses de contenido real.' },
      { icon: 'chatbubbles', title: 'Diálogos con IA vivos', body: 'Cada interlocutor tiene su carácter. Pantalla tipo mensajería moderna: avatares, estado «en línea», burbujas. 11 situaciones nuevas.' },
      { icon: 'volume-high', title: 'Voz humana', body: 'Todas las frases suenan con voz real, no robótica. Control de velocidad para estudiar la pronunciación a tu ritmo.' },
      { icon: 'trophy', title: 'Arena: temporadas y ranking', body: 'Temporadas con rating de maestría, tabla de líderes, auras de rango brillantes. Siempre encuentras rival rápido.' },
      { icon: 'bulb', title: 'Análisis de errores con IA', body: 'Tras un error, la app te explica con naturalidad qué pasó. ¿No lo pillas? Botón «Explícalo más fácil».' },
      { icon: 'diamond', title: 'Tesoro de modismos', body: '330 cartas coleccionables con ilustraciones únicas caen como recompensa. Colecciónalas y ábrelas.' },
    ],
    giftEyebrow: 'Regalo por tu lealtad',
    giftTitle: 'No eres de ayer con nosotros — toma 3 días de todo premium',
    giftBody: 'Estuviste con Phraseman antes de esta actualización, y eso vale mucho. Como agradecimiento te regalamos 3 días de acceso completo: todas las lecciones, planes, temas, análisis y sin límites. Sin pago, sin renovación automática — solo un regalo. Disfruta la app renovada al máximo.',
    giftChips: ['Lecciones', 'Planes', 'Sin energía', 'Temas', 'Análisis', 'Brújula'],
    primaryCta: 'Recibir 3 días premium',
    secondaryCta: 'Quizá luego',
    footer: 'Es un regalo. La suscripción no se activa automáticamente.',
    announcePrimaryCta: 'Genial, ver novedades',
    announceFooter: 'Gracias por estar con nosotros. Todo lo nuevo ya está en tu Premium.',
  },
};

function LoyaltyGiftModal({ visible, variant = 'gift', onPrimaryPress, onSecondaryPress }: Props) {
  const { lang } = useLang();
  const { theme, themeMode } = useTheme();
  const copy = lang === 'uk' ? COPY.uk : lang === 'es' ? COPY.es : COPY.ru;
  // Премиум/VIP видят ТОЛЬКО текст обновления: без блока подарка и без кнопки получения.
  const isGift = variant === 'gift';

  // Воронка: показ модала — разные события для подарка и для анонса (премиум/VIP).
  useEffect(() => {
    if (!visible) return;
    void import('../app/analytics').then(({ trackEvent }) =>
      trackEvent(isGift ? 'loyalty_gift_offer_shown' : 'loyalty_update_announce_shown', {}),
    );
  }, [visible, isGift]);

  const accent = rewardModalAccentColor(themeMode, theme);
  const border = rewardModalPanelBorder(themeMode, theme);
  const softSurface = rewardModalSoftSurface(themeMode, theme);
  const textPrimary = '#FFFFFF';
  const textSecondary = 'rgba(255,255,255,0.78)';
  const textTertiary = 'rgba(255,255,255,0.62)';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSecondaryPress ?? onPrimaryPress}
    >
      <View style={styles.overlay}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
        <SafeAreaView style={styles.safe}>
          <View style={[styles.panel, { borderColor: border }]}>
            <RewardModalPanelBackdrop themeMode={themeMode} intensity="strong" opacity={0.72} />
            <LinearGradient
              pointerEvents="none"
              colors={rewardModalPanelColors(themeMode, theme)}
              style={StyleSheet.absoluteFill}
            />
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={[styles.iconWrap, { backgroundColor: softSurface, borderColor: border }]}>
                <Ionicons name="rocket" size={28} color={accent} />
              </View>
              <Text style={[styles.eyebrow, { color: accent }]}>{copy.eyebrow}</Text>
              <Text style={[styles.title, { color: textPrimary }]}>{copy.title}</Text>
              <Text style={[styles.body, { color: textSecondary }]}>{copy.intro}</Text>

              <Text style={[styles.sectionLabel, { color: accent }]}>{copy.highlightsTitle}</Text>
              <View style={styles.highlights}>
                {copy.highlights.map((h) => (
                  <View key={h.title} style={[styles.highlightRow, { borderColor: border }]}>
                    <View style={[styles.highlightIcon, { backgroundColor: softSurface, borderColor: border }]}>
                      <Ionicons name={h.icon} size={18} color={accent} />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={[styles.highlightTitle, { color: textPrimary }]}>{h.title}</Text>
                      <Text style={[styles.highlightBody, { color: textTertiary }]}>{h.body}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {isGift ? (
                <View style={[styles.giftCard, { borderColor: accent, backgroundColor: softSurface }]}>
                  <Text style={[styles.giftEyebrow, { color: accent }]}>{copy.giftEyebrow}</Text>
                  <Text style={[styles.giftTitle, { color: textPrimary }]}>{copy.giftTitle}</Text>
                  <Text style={[styles.giftBody, { color: textSecondary }]}>{copy.giftBody}</Text>
                  <View style={styles.chips}>
                    {copy.giftChips.map((label) => (
                      <View key={label} style={[styles.chip, { backgroundColor: softSurface, borderColor: border }]}>
                        <Ionicons name="lock-open-outline" size={15} color={accent} />
                        <Text style={[styles.chipText, { color: textPrimary }]}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.footerBar, { borderTopColor: border }]}>
              <Pressable
                testID={isGift ? 'loyalty-gift-primary' : 'loyalty-announce-primary'}
                accessibilityRole="button"
                onPress={() => {
                  void import('../app/analytics').then(({ trackEvent }) =>
                    trackEvent(isGift ? 'loyalty_gift_offer_cta' : 'loyalty_update_announce_cta', {}),
                  );
                  onPrimaryPress();
                }}
                style={styles.primaryButton}
              >
                <LinearGradient
                  colors={rewardModalPrimaryButtonColors(themeMode)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}
                >
                  <Ionicons
                    name={isGift ? 'gift' : 'sparkles'}
                    size={19}
                    color={rewardModalPrimaryButtonText(themeMode)}
                  />
                  <Text style={[styles.primaryText, { color: rewardModalPrimaryButtonText(themeMode) }]}>
                    {isGift ? copy.primaryCta : copy.announcePrimaryCta}
                  </Text>
                </LinearGradient>
              </Pressable>
              {isGift ? (
                <Pressable
                  testID="loyalty-gift-secondary"
                  accessibilityRole="button"
                  onPress={() => {
                    void import('../app/analytics').then(({ trackEvent }) => trackEvent('loyalty_gift_offer_dismiss', {}));
                    onSecondaryPress?.();
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={[styles.secondaryText, { color: textSecondary }]}>{copy.secondaryCta}</Text>
                </Pressable>
              ) : null}
              <Text style={[styles.footer, { color: textTertiary }]}>
                {isGift ? copy.footer : copy.announceFooter}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default memo(LoyaltyGiftModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  safe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%',
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    padding: 22,
    gap: 12,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: 0,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  highlights: {
    gap: 10,
  },
  highlightRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  highlightIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTextWrap: {
    flex: 1,
    gap: 3,
  },
  highlightTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  highlightBody: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: 0,
  },
  giftCard: {
    marginTop: 10,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 10,
  },
  giftEyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  giftTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  giftBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  footerBar: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden',
  },
  primaryGradient: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
  },
  primaryText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: 0,
  },
  footer: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
});
