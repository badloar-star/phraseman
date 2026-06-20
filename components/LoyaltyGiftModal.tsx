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
  // Тап по блоку «год доступа за идею» — ведёт в Настройки → Идеи (закрывает модал).
  onIdeasPress?: () => void;
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
  // Личная заметка от автора (одиночный разработчик за «мы»).
  personalNoteTitle: string;
  personalNoteBody: string;
  // Блок «год полного доступа за идею» (раздел Идеи в настройках).
  ideasTitle: string;
  ideasBody: string;
};

// Текст обновления + подарок за лояльность. Намеренно «мощный»: сначала вау-фичи,
// затем эмоциональный подарок «спасибо за то, что ты с нами с самого начала».
const COPY: Record<'ru' | 'uk' | 'es', ModalCopy> = {
  ru: {
    eyebrow: 'Новая версия',
    title: 'Phraseman, которого ты ещё не видел',
    intro: 'Половина приложения переписана заново. Новые системы, сотни свежих раундов, живые голоса и наставник, который сам ведёт тебя за руку. Вот главное:',
    highlightsTitle: 'Что нового',
    highlights: [
      { icon: 'compass', title: 'Компас — твой наставник', body: 'Каждое утро сам выбирает, что тебе сегодня полезнее: подтянуть слабое, шагнуть дальше или мягко вернуть в ритм. И рисует карту тем — где ты силён, а где стоит копнуть.' },
      { icon: 'sparkles', title: 'Сотни новых дней', body: 'Пять путей доведены до конца: работа, дом, здоровье, путешествия, эмоции. Месяцы живой практики уже ждут тебя.' },
      { icon: 'chatbubbles', title: 'Диалоги как переписка', body: 'У каждого собеседника свой характер. Аватары, «онлайн», пузыри с хвостиками — как в любимом мессенджере. И 11 новых живых ситуаций.' },
      { icon: 'volume-high', title: 'Живой голос', body: 'Фразы звучат как человек, а не робот. Замедли или ускори — и слушай произношение в своём темпе.' },
      { icon: 'trophy', title: 'Арена с сезонами', body: 'Рейтинг мастерства, таблица лидеров, сияющие ауры ранга. Соперник находится за секунды.' },
      { icon: 'bulb', title: 'Разбор стал умнее', body: 'Не сошлось — и приложение спокойно покажет, в чём дело. Хочешь ещё проще? Одна кнопка — и объяснит как другу.' },
      { icon: 'diamond', title: 'Сокровищница', body: '330 коллекционных карточек с авторскими иллюстрациями. Каждый раунд может подарить новую — собирай свою коллекцию.' },
    ],
    personalNoteTitle: 'Честно, по-настоящему',
    personalNoteBody: 'Я говорю «мы» — хотя за всем этим стоит один человек. Просто в одиночку такой объём звучит неправдоподобно. Но это так: ночи без сна и личное время — чтобы это обновление дошло до тебя. Спасибо, что ты здесь.',
    ideasTitle: 'Год полного доступа — за идею',
    ideasBody: 'У тебя есть мысль, как сделать Phraseman лучше? Поделись — и за яркую, живую идею открою тебе целый год полного доступа. Настройки → «Идеи». Серьёзно, это того стоит.',
    giftEyebrow: 'Спасибо, что ты с самого начала',
    giftTitle: 'Держи 3 дня — всё открыто',
    giftBody: 'Ты был с Phraseman ещё до этого обновления, и это дорогого стоит. В благодарность дарю тебе 3 дня полного доступа: все раунды, все пути, темы, твои результаты — без единого замка. Просто подарок: ни оплаты, ни автопродления. Зайди и почувствуй обновление во всю силу.',
    giftChips: ['Все раунды', 'Все пути', 'Без энергии', 'Темы', 'Результаты', 'Компас'],
    primaryCta: 'Забрать 3 дня',
    secondaryCta: 'Может позже',
    footer: 'Это подарок. Ничего не спишется, подписка не включится.',
    announcePrimaryCta: 'Посмотреть, что нового',
    announceFooter: 'Спасибо, что остаёшься рядом. Всё новое уже открыто в твоём Premium.',
  },
  uk: {
    eyebrow: 'Нова версія',
    title: 'Phraseman, якого ти ще не бачив',
    intro: 'Половину застосунку переписано наново. Нові системи, сотні свіжих раундів, живі голоси й наставник, що сам веде тебе за руку. Ось головне:',
    highlightsTitle: 'Що нового',
    highlights: [
      { icon: 'compass', title: 'Компас — твій наставник', body: 'Щоранку сам обирає, що тобі сьогодні корисніше: підтягнути слабке, ступити далі чи м’яко повернути в ритм. І малює карту тем — де ти сильний, а де варто копнути.' },
      { icon: 'sparkles', title: 'Сотні нових днів', body: "П'ять шляхів доведені до кінця: робота, дім, здоров'я, подорожі, емоції. Місяці живої практики вже чекають на тебе." },
      { icon: 'chatbubbles', title: 'Діалоги як листування', body: 'У кожного співрозмовника свій характер. Аватари, «онлайн», бульбашки з хвостиками — як у улюбленому месенджері. І 11 нових живих ситуацій.' },
      { icon: 'volume-high', title: 'Живий голос', body: 'Фрази звучать як людина, а не робот. Сповільни чи пришвидш — і слухай вимову у своєму темпі.' },
      { icon: 'trophy', title: 'Арена із сезонами', body: 'Рейтинг майстерності, таблиця лідерів, сяючі аури рангу. Суперник знаходиться за секунди.' },
      { icon: 'bulb', title: 'Розбір став розумнішим', body: 'Не зійшлося — і застосунок спокійно покаже, у чому річ. Хочеш ще простіше? Одна кнопка — і пояснить як другові.' },
      { icon: 'diamond', title: 'Скарбниця', body: '330 колекційних карток з авторськими ілюстраціями. Кожен раунд може подарувати нову — збирай свою колекцію.' },
    ],
    personalNoteTitle: 'Чесно, по-справжньому',
    personalNoteBody: 'Я кажу «ми» — хоча за всім цим стоїть одна людина. Просто наодинці такий обсяг звучить неправдоподібно. Та це так: ночі без сну й особистий час — щоб це оновлення дійшло до тебе. Дякую, що ти тут.',
    ideasTitle: 'Рік повного доступу — за ідею',
    ideasBody: 'Маєш думку, як зробити Phraseman кращим? Поділись — і за яскраву, живу ідею відкрию тобі цілий рік повного доступу. Налаштування → «Ідеї». Серйозно, воно того варте.',
    giftEyebrow: 'Дякую, що ти від самого початку',
    giftTitle: 'Тримай 3 дні — все відкрито',
    giftBody: 'Ти був з Phraseman ще до цього оновлення, і це дорогого варте. На знак подяки дарую тобі 3 дні повного доступу: усі раунди, усі шляхи, теми, твої результати — без жодного замка. Просто подарунок: ні оплати, ні автопродовження. Зайди й відчуй оновлення на повну силу.',
    giftChips: ['Усі раунди', 'Усі шляхи', 'Без енергії', 'Теми', 'Результати', 'Компас'],
    primaryCta: 'Забрати 3 дні',
    secondaryCta: 'Можливо пізніше',
    footer: 'Це подарунок. Нічого не спишеться, підписка не ввімкнеться.',
    announcePrimaryCta: 'Подивитися, що нового',
    announceFooter: 'Дякую, що залишаєшся поруч. Усе нове вже відкрите у твоєму Premium.',
  },
  es: {
    eyebrow: 'Nueva versión',
    title: 'El Phraseman que aún no conocías',
    intro: 'Media app reescrita desde cero. Nuevos sistemas, cientos de rondas frescas, voces reales y un mentor que te lleva de la mano. Esto es lo importante:',
    highlightsTitle: 'Lo nuevo',
    highlights: [
      { icon: 'compass', title: 'Brújula — tu mentor', body: 'Cada mañana elige qué te conviene hoy: reforzar lo débil, ir más lejos o volver al ritmo con calma. Y dibuja el mapa de tus temas: dónde brillas y dónde profundizar.' },
      { icon: 'sparkles', title: 'Cientos de días nuevos', body: 'Cinco caminos completos: trabajo, casa, salud, viajes, emociones. Meses de práctica real ya te esperan.' },
      { icon: 'chatbubbles', title: 'Diálogos como un chat', body: 'Cada interlocutor con su carácter. Avatares, «en línea», burbujas con colita — como tu mensajería favorita. Y 11 situaciones nuevas.' },
      { icon: 'volume-high', title: 'Voz viva', body: 'Las frases suenan a persona, no a robot. Bájalo o acelera y escucha la pronunciación a tu ritmo.' },
      { icon: 'trophy', title: 'Arena con temporadas', body: 'Rating de maestría, tabla de líderes, auras de rango que brillan. El rival aparece en segundos.' },
      { icon: 'bulb', title: 'El análisis es más fino', body: 'Si algo no cuadra, la app te muestra con calma qué pasó. ¿Aún más simple? Un botón y te lo explica como a un amigo.' },
      { icon: 'diamond', title: 'Tesoro', body: '330 cartas coleccionables con ilustraciones de autor. Cada ronda puede regalarte una — arma tu colección.' },
    ],
    personalNoteTitle: 'Con honestidad',
    personalNoteBody: 'Digo «nosotros», aunque detrás de todo esto hay una sola persona. En solitario este volumen suena increíble. Pero es así: noches sin dormir y tiempo propio para que esta actualización llegue a ti. Gracias por estar aquí.',
    ideasTitle: 'Un año de acceso completo — por una idea',
    ideasBody: '¿Tienes una idea para mejorar Phraseman? Cuéntamela — y por una idea original y viva te abro un año entero de acceso completo. Ajustes → «Ideas». En serio, vale la pena.',
    giftEyebrow: 'Gracias por estar desde el inicio',
    giftTitle: 'Toma 3 días — todo abierto',
    giftBody: 'Estuviste con Phraseman antes de esta actualización, y eso vale mucho. En agradecimiento te regalo 3 días de acceso completo: todas las rondas, todos los caminos, temas, tus resultados — sin ni un candado. Solo un regalo: sin pago, sin renovación. Entra y siente la app renovada al máximo.',
    giftChips: ['Rondas', 'Caminos', 'Sin energía', 'Temas', 'Resultados', 'Brújula'],
    primaryCta: 'Quiero mis 3 días',
    secondaryCta: 'Quizá luego',
    footer: 'Es un regalo. No se cobra nada, la suscripción no se activa.',
    announcePrimaryCta: 'Ver las novedades',
    announceFooter: 'Gracias por seguir aquí. Todo lo nuevo ya está abierto en tu Premium.',
  },
};

function LoyaltyGiftModal({ visible, variant = 'gift', onPrimaryPress, onSecondaryPress, onIdeasPress }: Props) {
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

              <View style={[styles.noteCard, { borderColor: border, backgroundColor: softSurface }]}>
                <View style={styles.noteHeader}>
                  <Ionicons name="heart" size={16} color={accent} />
                  <Text style={[styles.noteTitle, { color: textPrimary }]}>{copy.personalNoteTitle}</Text>
                </View>
                <Text style={[styles.noteBody, { color: textSecondary }]}>{copy.personalNoteBody}</Text>
              </View>

              <Pressable
                testID="loyalty-ideas-block"
                accessibilityRole="button"
                onPress={() => {
                  void import('../app/analytics').then(({ trackEvent }) => trackEvent('loyalty_ideas_block_tapped', {}));
                  onIdeasPress?.();
                }}
                style={[styles.ideasCard, { borderColor: accent, backgroundColor: softSurface }]}
              >
                <View style={styles.ideasHeader}>
                  <Ionicons name="bulb" size={17} color={accent} />
                  <Text style={[styles.ideasTitle, { color: textPrimary }]}>{copy.ideasTitle}</Text>
                </View>
                <Text style={[styles.ideasBody, { color: textSecondary }]}>{copy.ideasBody}</Text>
                <View style={styles.ideasArrowRow}>
                  <Ionicons name="arrow-forward" size={15} color={accent} />
                </View>
              </Pressable>

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
  noteCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: 0,
  },
  ideasCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 8,
  },
  ideasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ideasTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  ideasBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: 0,
  },
  ideasArrowRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  giftCard: {
    marginTop: 12,
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
